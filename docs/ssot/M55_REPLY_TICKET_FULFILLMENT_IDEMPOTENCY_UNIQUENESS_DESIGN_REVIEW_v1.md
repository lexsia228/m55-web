# M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1

Status: **Webhook 本番前・二重付与防止の idempotency／uniqueness 設計レビュー SSOT** — **本条は SQL／migration／実装／Dashboard 変更の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **本番 schema 適用済み証跡:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_RESULT_v1.md`
- **Fulfillment DB／API（論理）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1.md`
- **Gap／ADR と整合:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1.md`、関連 ADR／データモデル SSOT。

**本条に環境固有のシークレット・DB URL・Webhook signing secret を記載しない。**

---

## 1. 目的

| # | 目的 |
|---|------|
| 1 | **Stripe Webhook の再送**があっても **二重付与**しない。 |
| 2 | **`checkout.session.completed`** と **PaymentIntent／支払い完了系**イベントの **重複処理ルート**から **複数付与を避ける**。 |
| 3 | **追加相談返書チケットを「1 決済／1 論理チェックアウト成功」につき最大 1 回**のみ付与する（**ビジネスルール側の粒度**）。 |
| 4 | **`reply_ticket_wallets`** の更新と **`reply_wallet_ledgers`** の **監査行**が **論理的に対応可能**になる（Fulfillment と整合）。 |

---

## 2. 主キー／冪等キー候補と「どれを正とするか」

| 候補 | 役割／論点 |
|------|-----------|
| **`stripe_event_id`**（Stripe の **`event.id`**） | **Webhook 処理単位での自然な一意キー**。再送でも **同一 `event.id`**。 **推奨：処理済みの「正」を `stripe_processed_events.stripe_event_id` に載せる案の第一選択。** |
| **`checkout_session_id`** | **チェックアウトセッション軸**。商品・SKU・顧客導線の突合には有用。**推奨：補助照合・アンチフェンス**。**単独での主キー**はイベント種類横断では弱いことがあるため **正本は `event.id` と併用**。 |
| **`payment_intent_id`** | PI だけでは **イベント再送との対応関係が取りにくい**場合がある。**単独唯一主キーは避ける**（SSOT と設計運用での第一推奨）。**補助列・ログ・突合**。 |
| **`idempotency_key`**（Stripe とは別レイヤーのアプリ鍵など） | **Checkout API 側**で生成する場合は **API 冪等**に有効だが、**Webhook 経路の正本**は通常 **`event.id`** と揃える。**二系統を持つ場合は役割分担を明文化**する。 |

**推奨（本条のデフォルト案）**

- **正本（Webhook 冪等）:** **`stripe_event_id`（= `event.id`）** を **`stripe_processed_events` の一意性の核**にする。  
- **`checkout_session_id`:** **補助**（照合・デバッグ・手動調査）。  
- **`payment_intent_id`:** **補助**。**主キー唯一化は避ける。**

---

## 3. 既存 schema（本番現状）

| オブジェクト | 状態 |
|--------------|------|
| **`public.stripe_processed_events`** | **存在**。列例：`stripe_event_id`、`checkout_session_id`、`payment_intent_id`、`product_key`、`report_instance_id`、`user_ref_hash`、`status`、`processed_at`、`created_at`、`updated_at` 等。 |
| **`reply_wallet_ledgers`** | **Stripe 参照列**（`stripe_event_id` 等）が **nullable text** で **存在**。 |
| **制約** | **CHECK 変更なし／NOT NULL なし／FK なし／UNIQUE なし**（適用済み migration の範囲）。 |
| **payload** | **`payload_json` なし**（方針どおり）。 |

**示唆:** 冪等の **物理的担保**は **現状 DB 単体では弱い**。**次の migration／index ゲートとアプリ側ガードが必須**。

---

## 4. 実効担保候補（DB／アプリ）

### 4.1 DB 側

| 候補 | 論点 |
|------|------|
| **`stripe_processed_events.stripe_event_id` に UNIQUE** | **最も素直**。**部分一意**（`WHERE stripe_event_id IS NOT NULL`）で **NULL 重複**を許容しつつ **実値は一意**にする案が一般的。 |
| **nullable** | 現状列は **nullable**。**本番 Webhook 前**に **`stripe_event_id` を必須とする運用**（アプリで欠損なら **STOP**）と **段階的 NOT NULL** の **別ゲート**を検討。 |
| **NOT NULL をまだ避ける** | **初回は partial UNIQUE のみ**に留め、**バックフィル後に NOT NULL** もあり得る（**リスクとレビューで決定**）。 |

### 4.2 アプリ側

| 候補 | 論点 |
|------|------|
| **署名検証後に `event.id` を必須読取** | **欠損・パース失敗は 4xx／処理中断**（監査ログは別途）。 |
| **「INSERT 処理済み行 → 重複は no-op」**の **アプリフロー** | DB UNIQUE が **第二の防壁**（競合時 **unique_violation** を **冪等成功**にマップするパターン）。 |

**二重防御:** **アプリの先読み**＋**DB UNIQUE（または同等の単一行ロック戦略）**を **設計としてセット**にする。

---

## 5. Fulfillment 処理順序案（論理フロー）

以下は **設計案**。**実装・SQL は本条では作らない**。

1. **Webhook 受信** → **署名・タイムスタンプ・生体の最小検証**（詳細はセキュリティ SSOT）。  
2. **`event.id` 抽出** — **無ければ STOP**（§8）。  
3. **該当イベント種別が付与対象か**（例：`checkout.session.completed` 等。**二系統イベントを同一決済で二重に扱わない**ルールを別表で固定）。  
4. **`stripe_processed_events` に「未処理／処理中」相当の行を確保**（**事前 INSERT** または **楽観的ロック** — 具体は migration と合わせて確定）。  
5. **既に「処理済み」なら no-op で 200**。  
6. **`report_instance_id`・product・ユーザー紐付け**を **`user_ref_hash`／セッション契約に合わせて解決**（**`user_id` だけでの付与は不可** §8）。  
7. **上限 5 件チェック**（§6）。**超過なら付与せず終了（冪等与別）**。  
8. **Wallet:** `purchased_count`／`available_count` 等を **規則どおり **+1**（cap チェック済み）。**  
9. **Ledger:** **`purchase_grant`**／**`PURCHASE`** 等 **既存 CHECK 内**で **delta／balance_after** を **1 行 INSERT**。Stripe 参照列に **イベント／session／PI** をコピー。  
10. **`stripe_processed_events.status` を processed 等へ更新**。  
11. **エラー:** **_wallet のみ更新**／**ledger なし**を **許さない**（§8）。**トランザクション境界は「最小で DB 一意＋両表更新」を同一Txnに載せられるかレビュー**。

---

## 6. 上限（5 件）との関係

| 論点 | 内容 |
|------|------|
| **idempotency と cap** | **独立**。まず **同一 `event.id` は常に一度**。**cap は別条件**。 |
| **二重チェック** | **Checkout 作成直前／Webhook 処理時**の **両方**で **論理チェックできる設計が望ましい**（過剰に厳しくしすぎない程度で）。 |
| **上限到達** | **新規付与はしない**。**Webhook 再送**は **`processed_events` で既済なら no-op**。 |
| **混同禁止** | **「キャンセル扱いの再試行」 vs 「本当の二重イベント」**を **イベント種別と ID** で分離して設計ドキュメント化する。 |

---

## 7. 返金／キャンセルとの関係（本条スコープの境界）

| 状況 | 本条の位置づけ |
|------|----------------|
| **Checkout 未完了** | **付与しない**。 |
| **支払失敗** | **付与しない**。 |
| **返金／`charge.refunded`** | **本条では Fulfillment を定義しない**。**別 SSOT／返金ポリシー**。 |
| **使用済みチケット後の返金** | **商品・法務ポリシー別**。**DB の逆仕訳（ledger ネガティブ）は将来ガバナンス**。 |

---

## 8. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **`stripe_event_id`（または運用確定鍵）の一意性無しで Webhook 本番接続する** |
| 2 | **DB 側 idempotency なし／アプリのみ** で **wallet を更新する**設計で本番化する |
| 3 | **Ledger 行なしに wallet のみ更新**する |
| 4 | **`user_id` だけ** で **チケット付与**する（**`report_instance_id` を正としない**） |
| 5 | **`report_instance_id` 不在**での付与 |
| 6 | **Stripe test／live の混線**・**エンドポイント誤接続** |
| 7 | **secret／署名鍵／DB URL の露出** |

---

## 9. 次の候補（順序目安）

1. **Idempotency preflight packet**（本番 DDL 状態を前提に **`stripe_event_id` 一意化前後**の SELECT 設計）。  
2. **UNIQUE／partial UNIQUE の candidate DDL draft**（**shadow → production gate**／**別 migration パッケージ**）。  
3. **shadow／staging での検証** → **production apply gate**。  
4. **その後** **Checkout API／Webhook／商品棚** の **設計・実装**（本条と **単線でつなげない**。ゲート単位）。

---

## 10. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本条（design review SSOT）** | **GO** |
| **SQL ファイル新規作成** | **NO-GO**（別チケット） |
| **DB 更新／migration APPLY** | **NO-GO** |
| **Webhook 実装** | **NO-GO** |
| **Checkout API 実装** | **NO-GO** |
| **Stripe Dashboard／商品棚 UI** | **NO-GO** |

---

## CHANGELOG

- **2026-04-28:** v1 初版。schema 適用済み後の idempotency／uniqueness 論点を整理。
