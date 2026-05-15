# M55_REPLY_TICKET_CHECKOUT_WEBHOOK_TRANSACTION_DESIGN_REVIEW_v1

Status: **追加相談返書チケット（M55）の **Checkout API** と **Webhook fulfillment** における **トランザクション／冪等性／上限**の設計レビュー SSOT。** **本条はコード実装・Stripe Dashboard 変更・環境変数／秘密の設定を承認しない。**  

Recorded: **2026-04-28**

Upstream:

- **本番 partial unique 適用済み証跡:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md`
- **Index／冪等設計:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md`
- **Idempotency／主キー論点:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md`
- **Fulfillment DB／API（論理）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1.md`

**商品仕様メモ（本条の境界）**

- 価格 **500 円**。  
- **1 `report_instance_id` あたり合計 5 件まで**（**初回同梱 1 件 ＋ 追加購入最大 4 件**）。  
- **`report_instance_id` 単位**で販売・付与。当該本質レポート **4 章の深掘り専用**。  
- **他レポート／他商品と併用不可**（SKU／`product_key`／導線で分離）。  
- **既存 session backfill には依存しない**。

**環境固有のシークレット・DB URL・Webhook signing secret を記載しない。** `metadata` に **生の個人識別子・本文を載せない**。

---

## 1. Checkout API の責務

| # | 責務 |
|---|------|
| 1 | **ログイン済みユーザーのみ**が呼び出せる（匿名／未認証セッションでの購入開始を禁止）。 |
| 2 | リクエストで **`report_instance_id`** を受け取る（**当該チケット SKU のみ**にマッピング）。 |
| 3 | **ユーザーが当該 `report_instance_id` を所有**していることを確認する（**単独 `user_id` だけでの付与／販売判定は禁止** — §8）。 |
| 4 | 対象 **wallet が active** であること。**quarantine**（または同等の非販売状態）の wallet には **Stripe Checkout を発行しない**。 |
| 5 | **在庫論理:** **`initial_included_count + purchased_count < 5`**（未満）であること（**上限 5 に達していない**）。 |
| 6 | **追加購入は最大 4 回**（既に同梱 1 を消費済みのモデルに整合）— **今回の決済 1 回で付与は 1**。 |
| 7 | **Stripe Checkout Session** を **サーバー側**で作成する（金額・通貨・`product_key` は **Dashboard／Price と整合**するが、**Dashboard 変更自体は本条のスコープ外・別承認**）。 |
| 8 | **`metadata` には必要最小限のみ**（§2）。**生の個人情報・本文を入れない。** |
| 9 | **ログ／レスポンスに secret を出さない**。 |

**補足:** Checkout 作成 **前**と Webhook **内**の **両方で上限 5 を検証**する（§6）。

---

## 2. Stripe metadata 案（最小限・非秘密）

| キー案 | 値・方針 |
|--------|-----------|
| **`product_key`** | `additional_reply_ticket`（**SSOT 上の定数**— 実装時にコードと一致させる） |
| **`report_instance_id`** | 対象レポート実体の ID（文字列化の可否は API 契約で固定） |
| **`user_ref_hash`** **または** **`user_id_hash`** | **ユーザー紐付け用のハッシュ**（**どちらを正とするかは既存 wallet 契約に合わせる**）。**生 `user_id` は載せない**。 |
| **`quantity`** | **`1`**（1 決済 1 チケット）。 |
| **`wallet_id`** | **慎重に検討**。外部に漏れても **単独では付与できない**設計にすること。可能なら **`report_instance_id` ＋ハッシュでWebhook側で再解決**し、**wallet_id を載せない**案も比較検討する。 |

**載せないもの（禁止）**

- **生 `user_id`、生年月日・氏名、レポート本文、相談本文**、その他 **PII／特大 payload**。  
- **`checkout_session_id`** — **Stripe 生成後**は **Webhook／API 応答**で取得し、**ledger／processed_events に永続化**。metadata に **無理に入れない**。  
- **Webhook secret、API 鍵、内部 DB URL**。

---

## 3. Webhook 対象イベント

| 項目 | 方針 |
|------|------|
| **主対象** | **`checkout.session.completed`** を **付与の唯一の正規トリガ**とする案（**実装契約のデフォルト**）。 |
| **`payment_intent.succeeded` 等** | **二重付与防止のため、直接の付与処理対象にしない案**（ログ・観測のみ、または no-op）。Checkout 完了と **二系統で二重に足さない**こと。 |
| **`event.id`** | **必須**。取得・パースに失敗したら **STOP**（**200 返却で黙殺しない**方針も **セキュリティ／再送**と整理 — 少なくとも **付与ロジックには入れない**）。 |
| **test／live** | **エンドポイント／シークレットの環境**で **厳密に分離**。**test と live のイベント混同**は §8 STOP。 |

---

## 4. Fulfillment transaction 順序（設計案）

**基本:** **可能な限り 1 つの DB トランザクション**に、**処理済み確定**と **wallet／ledger 更新**をまとめる。**失敗時はロールバック**して **部分更新を残さない**（§5）。

| 順序 | ステップ |
|------|----------|
| 1 | **Stripe 署名検証**（本番／テストで鍵の取り違えない）。 |
| 2 | **`event.id` を抽出** — **欠損なら STOP**（付与なし）。 |
| 3 | **`event.type` 確認**。**`checkout.session.completed` 以外**は原則 **no-op** または **監査用の軽い記録のみ**（付与なし）。 |
| 4 | **Session／metadata から** **`report_instance_id`**・**`product_key`** を検証（**期待値と一致**しないなら付与せず **STOP**／エラー扱い）。 |
| 5 | **ユーザー所有権**と **wallet active**（**quarantine 禁止**）を再確認。 |
| 6 | **上限 5 件**チェック（Checkout 時点と矛盾するなら **付与しない** — §6）。 |
| 7 | **`stripe_processed_events` に当該 `stripe_event_id` の行を INSERT**（**未処理／処理中**の初期 `status`。**`stripe_event_id` は非NULLで挿入** — partial unique が衝突したら **別接続で既処理** → **no-op で終了**／同一 Tx 内なら **duplicate key → 冪等パス** にマップ）。 |
| 8 | **Wallet:** `purchased_count` と `available_count` を **規則どおり +1**（**cap 済み**であること）。 |
| 9 | **Ledger:** **`delta` +1** 相当の **1 行 INSERT**。**`stripe_event_id`／`stripe_checkout_session_id`／`stripe_payment_intent_id`／`product_key`** を **Stripe から取得可能な範囲で**記録。 |
| 10 | **`stripe_processed_events.status`** を **`processed`**（または同等の完了状態）に更新。 |
| 11 | **COMMIT**。 |

**Idempotency と INSERT 順序の論点**

- **Same `event.id` 再送:** **partial UNIQUE** により **二重 INSERT は失敗** → **アプリは冪等成功（no-op）として 200**を返す設計が妥当。  
- **`processed_events` を先に載せる／wallet 後**の順序は **同一 Tx 内**なら **rollback で整合**（§5）。  

---

## 5. 重要な DB 整合条件

| 原則 | 内容 |
|------|------|
| **wallet のみ更新禁止** | **ledger 行なしの付与は禁止**。 |
| **`processed` だけ完了にして wallet 未更新禁止** | **`status = processed` は wallet＋ledger が揃った後**（同一 commit）。 |
| **Retry** | **`event.id` 単位で冪等**。DB 一意衝突／既存 processed 行は **付与を繰り返さない**。 |
| **`failed` 状態** | **支払い成功だが業務ルールで付与しない**場合（例: 上限超過）は **`stripe_processed_events` に outcome を残す**設計を検討（**同一 `event.id` は 1 行** — 再送時 no-op）。具体的な `status` 列挙は **DB 契約 SSOT** で確定。 |
| **Rollback** | Tx 失敗時は **wallet／ledger／processed_events の変更をすべて巻き戻す**。**外部 Stripe への副作用は返金・CS オペで別 SSOT**（§7）。 |

---

## 6. 上限 5 件の扱い

| タイミング | 内容 |
|------------|------|
| **Checkout 作成前** | **`initial_included_count + purchased_count < 5`** を満たすこと（API 責務 §1）。 |
| **Webhook fulfillment 内** | **再検証**（**TOCTOU** 対策）。満たさなければ **付与しない**。 |
| **Stripe 再送** | **既に `event.id` で processed（または skipped）**なら **no-op**。 |
| **上限到達時の「未処理イベント」** | **推奨論点:** **`stripe_processed_events` に 1 行残し**、`stripe_event_id` で一意・**`status` を「skipped_cap」等**にする案（**再送で二重調査しなくてよい**）。**Wallet は触らない**。 |
| **二重請求／遅延イベント** | **1 `event.id` につき 1 回のみ DB 側で効く**。**別 `event.id` で二重決済**が来た場合は **ビジネス／CS** と **refund SSOT**（§7）。 |

---

## 7. 返金／キャンセル／失敗

| 状況 | 方針 |
|------|------|
| Checkout **未完了** | **付与しない**。 |
| **Payment failed** | **付与しない**。 |
| **Expired checkout** | **付与しない**。 |
| **Refund／cancel／dispute** | **別 SSOT**。本条では **自動逆仕訳の有無を定めない**。 |
| **管理者調整** | **ledger に記録**（**監査可能性**）。 |

---

## 8. STOP 条件

| STOP |
|------|
| **`stripe_event_id`（= `event.id`）なし**で付与処理へ進む |
| **UNIQUE／冪等経路を無視**して **wallet だけ更新** |
| **`user_id` だけ**で付与を確定する |
| **`report_instance_id` なし**で付与する |
| **wallet が quarantine** なのに販売／付与する |
| **上限 5 件超過**での付与 |
| **ledger INSERT なし**での残高増 |
| **Stripe test／live 混同** |
| **secret／Webhook secret／DB URL の露出** |
| **Stripe Dashboard 変更とコード実装を同一 PR／同一リリースで無設計に同時進行** |

---

## 9. API 実装順序（推奨）

| 順序 | 段階 |
|------|------|
| 1 | **本条 design review** の承認／差分反映 |
| 2 | **Checkout API 契約**（OpenAPI／内部仕様） |
| 3 | **Webhook 契約**（イベント種別・署名・エラーレスポンス） |
| 4 | **DB 関数／transaction 境界**の詳細設計（**必要なら RPC**） |
| 5 | **単体テスト／スモーク設計** |
| 6 | **env／Stripe 設定**（秘密は **秘密管理**） |
| 7 | **実装** |
| 8 | **test mode E2E** |
| 9 | **live 低額テスト** |

---

## 10. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **transaction design review（本条）** | **GO** |
| **コード実装** | **NO-GO**（別承認／別 PR） |
| **Stripe Dashboard 変更** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |
| **secret／Webhook secret の文書・ログ出力** | **NO-GO** |

---

## 11. 本番 DB スナップショット（参考・設計境界）

**証跡:** `M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md` および運用観測。

- **`stripe_processed_events`:** 表あり、**`stripe_event_id` partial UNIQUE** 適用済み。  
- **`reply_wallet_ledgers`:** Stripe 参照 4 列あり。  
- **件数メモ（適用時点付近）:** `wallet_count = 8`、`ledger_count = 10`、`session_count = 11`；**wallet／ledger の RI non-null = 5**、**session RI non-null = 0**。**新規 fulfillment 実装時に再観測**する。

---

## 12. CHANGELOG — v1

- 初版: Checkout API 責務、metadata 方針、Webhook イベント、**単一トランザクション**での fulfillment 順序、上限 5／冪等、`event.id` STOP、実装順とゲートを SSOT 化。
