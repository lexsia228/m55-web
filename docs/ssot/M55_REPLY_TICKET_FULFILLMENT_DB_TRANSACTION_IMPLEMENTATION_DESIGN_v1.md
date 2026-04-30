# M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1

Status: **Webhook fulfillment の **DB トランザクション実装方針** SSOT。** **本条はコード・SQL 関数・migration・DB 変更・Dashboard／env／UI の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **API 契約:** `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`
- **トランザクション設計:** `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_TRANSACTION_DESIGN_REVIEW_v1.md`
- **Fulfillment DB／API:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1.md`
- **partial UNIQUE 証跡:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md`

**秘密・Webhook secret・実キー値は記載しない。** `payload` 全文・生 PII は **永続化禁止**。

---

## 1. 実装方針の選択肢と推奨

| 選択肢 | 内容 | 長所 | 短所 |
|--------|------|------|------|
| **A** | **API 側**で Supabase クライアント等を用い、複数 SQL を **アプリ側で transaction 相当**に扱う | 既存ルートに載せやすい | **複数往復・境界のズレ**、**明示トランザクションの有無が SDK 依存** |
| **B** | **Postgres RPC／DB 関数**で **1 つの `BEGIN…COMMIT`** に集約 | **原子的**、**競合・順序を DB 内で固定しやすい** | 関数定義・migration・権限の運用が必要 |
| **C** | **Edge Function／Server route** 内で **サーバーランタイムが提供する明示 transaction**（例: PG 直 `BEGIN`） | 柔軟 | 接続プール・タイムアウト・重複実装の管理が必要 |

### 1.1 推奨（本条のデフォルト）

**「DB 側 RPC（または **`BEGIN` 単位の server-only 明示 transaction`）で、fulfillment を **原子的に処理**する。」** 具体的に **B と C のどちらを採るか**は **既存リポジトリの標準**に合わせる。

- **Supabase を主に使う場合:** **`SECURITY DEFINER` RPC + 単一トランザクション**が **一貫しやすい**（選択肢 **B 寄り**）。  
- **既に Node から PG を直接 transaction ラップしている場合:** **同一路線で C** を維持し、**中身は 1 関数に寄せる**のも可。

**回避:** 複数の **`await supabase.from(...)` を await 連鎖するだけ**で **本当の ACID を保証できない**構成を **主経路にしない**（A 単独の安易な複数呼び出しは非推奨）。

---

## 2. transaction で行う処理（成功パス）

前提は **署名検証済み**・**`checkout.session.completed`**・**`event.id` あり**（API 契約と同一）。

| 順序 | 処理 |
|------|------|
| 1 | **`stripe_event_id`**（= `event.id`）**必須**確認 |
| 2 | **`product_key` = `additional_reply_ticket`** 検証 |
| 3 | **`report_instance_id` 必須**検証 |
| 4 | **wallet active**・**quarantine でない**確認 |
| 5 | **cap**:`initial_included_count + purchased_count < 5` かつ **`purchased_count < 4`**（契約と整合） |
| 6 | **`stripe_processed_events` INSERT**（`stripe_event_id` 非NULL、補助列に `checkout_session_id`／`payment_intent_id`／`product_key`／`report_instance_id` を載せる設計） |
| 7 | **partial UNIQUE 衝突** → **§5 の no-op**（この Tx では wallet／ledger を進めない） |
| 8 | **wallet:** `purchased_count` **+1**、`available_count` **+1** |
| 9 | **ledger:** **`delta` +1** の 1 行 INSERT（§7 の列・CHECK 整合） |
| 10 | **`stripe_processed_events.status` = `processed`** |
| 11 | **COMMIT** |

§3 の **中間 `status`** が必要な場合、**同一 Tx 内で** `received` → … → `processed` に遷移させ、**コミット後に中途半端な状態を残さない**。

---

## 3. `stripe_processed_events.status` 設計

| status | 永続化するか | 用途 |
|--------|----------------|------|
| `received` | **任意** | 「DB に取り込んだ直後」。**同一 Tx で即 `processed` に上げるなら不要**も可。長い外部 I/O を Tx 外に分ける **反パターンは避ける**。 |
| `processed` | **必須（成功）** | wallet＋ledger と **同時コミット** |
| `duplicate_noop` | **通常は不要**（推奨しない） | UNIQUE 衝突＝**INSERT しない**か **衝突のみ catch** なら **新行を増やさない**。**監査のため「重複受信」を行として残す設計**を取る場合のみ **この status** を検討（多くは **`processed` が既に付いている行**の再読で足りる）。 |
| `skipped_cap` | **推奨** | cap 超過で **wallet 更新なし**。**`stripe_event_id` は 1 行**残し **再送 no-op** に使う |
| `rejected_invalid_product` | **推奨** | `product_key`／metadata 不正 |
| `rejected_not_owner` | **推奨** | 所有権 NG |
| `rejected_wallet_inactive` | **推奨** | quarantine／inactive |
| `failed_technical` | **原則 rollback なら永続化されない**。**部分コミット戦略を取る場合のみ**議論（§6） |

**検討論点:** 「拒否・cap スキップ」を **DB に残す**と **監査に有利**。**技術失敗は rollback** で **行なし**が **整合しやすい**（`failed_technical` は **ログ＋アラート中心**でも可）。

---

## 4. cap 処理

| ルール | 内容 |
|--------|------|
| 式 | **`initial_included_count + purchased_count < 5`** かつ **`purchased_count < 4`**（追加枠） |
| Webhook | Checkout 時点から **TOCTOU で変わる**ため **必ず再評価** |
| cap 到達 | **wallet を更新しない**。`reply_wallet_ledgers` に **INSERT しない** |
| `processed_events` | **`skipped_cap`** で **1 行残す案**を推奨（**同一 `event.id` で再送時に冪等**）。**別テーブル／別扱い**は運用コストが増える |

---

## 5. no-op 処理

| 状況 | 挙動 |
|------|------|
| **partial UNIQUE 衝突** | **付与なし**。既存行が **`processed`** なら **そのまま終了** |
| **既処理 event**（事前 SELECT で検出する場合） | **INSERT しない**・wallet 不変 |
| **`payment_intent.succeeded` 等** | **DB transaction に入れない**。**API 層で早期 return** |

**HTTP 応答:** **署名OK・冪等な成功**は **`200`** とし **Stripe 再送を止める**ことが多い。**署名失敗**は **`4xx`**（具体はセキュリティ契約）。本条は **「冪等は 200 で再送抑制」** を推奨デフォルトとする。

---

## 6. エラー処理

| 場面 | 方針 |
|------|------|
| **technical error**（DB 例外・想定外） | **transaction 全体 rollback**。**wallet／ledger／新規 processed 行はコミットしない** |
| **`processed_events` だけ残すか** | **rollback 方針では残さない**。**DLQ／別ジョブ**が必要な場合は **別設計** |
| **`failed_technical`** | rollback 主前提なら **DB には出さない**。**監査は構造化ログ** |
| **Stripe 再送** | **`event.id` 一意**により **重複は no-op**。一時障害で **rollback した場合**は **次回再送で再度処理**（**冪等**） |

---

## 7. DB 整合性（ledger／wallet）

| 原則 | 内容 |
|------|------|
| **wallet のみ更新** | **禁止** |
| **ledger なし付与** | **禁止** |
| **`processed` だけ先** | **禁止**（`processed` は wallet＋ledger 完了と **同一 commit**） |
| **`balance_after`** | Fulfillment **直後の `available_count`** と **一致**（既存 SSOT） |
| **`source_of_grant`** | **本番 `reply_wallet_ledgers` の CHECK が許す列挙に合わせる。** 本条の **目標値として `PURCHASE` を想定**するが、**適用前に `pg_constraint` の原文で突合**すること（設計ドラフトでは **`stripe_checkout` 等が例示**されていたため **実スキーマが正本**）。 |
| **`event_type`** | **同上。目標値として `purchase_grant` を想定** — **CHECK 原文と必ず一致させる**（例: `purchase_additional_reply_ticket` 等が定義されている場合は **そちらへ合わせる**）。 |
| **`reply_session_id`** | **購入フルフィルメントでは NULL**（§8 整合） |
| **`report_instance_id`** | **ledger 行に必須**（NULL 付与禁止） |

---

## 8. セキュリティ

| 項目 | 内容 |
|------|------|
| **server-only** | fulfillment **は認証ユーザの RLS で直接触らない**。**service role はサーバー側のみ** |
| **client** | **wallet／processed_events／ledger を直接更新不可** |
| **raw PII／payload 全文** | **保存禁止** |
| **secret** | **ログ・レスポンス・SSOT に出さない** |

---

## 9. STOP 条件

| STOP |
|------|
| **transaction なし**の **部分更新** |
| **wallet と ledger を別 transaction** で分離更新（付与経路） |
| **partial UNIQUE／冪等を使わず** wallet を動かす |
| **cap 未確認** |
| **`report_instance_id` なし** |
| **`user_id` だけ**で付与確定 |
| **CHECK 許容外の `event_type`／`source_of_grant`** |
| **secret 露出** |

---

## 10. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **transaction implementation design（本条）** | **GO** |
| **SQL／RPC／migration 作成** | **NO-GO** |
| **アプリコード実装** | **NO-GO** |
| **Stripe Dashboard／env／商品棚 UI** | **NO-GO** |

---

## 11. CHANGELOG — v1

- 初版: RPC／server transaction 推奨、Tx 内処理順、status／cap／no-op／エラー、ledger 整合、`PURCHASE`／`purchase_grant` と **本番 CHECK 突合**の注意、STOP・ゲートを固定。
