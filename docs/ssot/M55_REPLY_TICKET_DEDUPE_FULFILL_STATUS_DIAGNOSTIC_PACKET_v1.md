# M55 追加相談返書 — dedupe / fulfill status SELECT-only 診断パケット（v1）

**文書種別:** **`stripe_events` dedupe**・**`stripe_processed_events`**・**wallet / ledger** を **SELECT のみ**で観測し、**Webhook 200 だが DB 未反映**の原因候補を絞る手順 SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1.md)  
**静的監査:** [`M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_RESULT_v1.md`](./M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_RESULT_v1.md)

**SQL:** [`scripts/sql/production/m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql`](../../scripts/sql/production/m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql)

---

## 1. このパケットの境界

| 項目 | 内容 |
|------|------|
| **用途** | **SELECT-only 診断**。 |
| **コード修正 GO** | **このパケットだけでは判断しない**。 |
| **実行** | **別承認**。 |
| **出力** | **summary 中心**。**event / report / session / payment intent の全文は禁止**。 |
| **後続** | **結果 SSOT** → 必要なら **redacted diagnostic log gate** または **最小コード修正 gate**。 |
| **NO-GO** | **追加 replay / 追加決済 / duplicate replay**（本パケットの範囲では実施しない）。 |

---

## 2. 実行順序（SQL）

| 順序 | 内容 |
|------|------|
| **SECTION 1** | **`to_regclass` による table preflight** — テーブル不存在でも **失敗しにくい**単独 `SELECT`。 |
| **SECTION 2** | **診断本体** — **SECTION 1 がすべて `true` のときのみ**実行。欠けがある場合は **マイグレーション / 環境を修正**してから再実行。 |

---

## 3. パラメータ（ローカルのみ差し替え）

[`m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql`](../../scripts/sql/production/m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql) の **`params` CTE** で **`NULL` を置換**（**コミット禁止**）。

| パラメータ | 用途 |
|------------|------|
| **`target_stripe_event_id`** | **generic / processed** の **対象 Event id**（**結果には全文を出さない**）。 |
| **`target_report_instance_id`** | **report / wallet / ledger / processed_events(report)** のスコープ（**結果列には UUID を投影しない**）。 |
| **`pre_purchased_count` / `pre_available_count`** | **pre baseline** からの **増分判定**。**両方 NULL のとき `wallet_counts_changed` は `unknown`（NULL）**。 |

---

## 4. 確認項目（SQL が返す観点）

### 4.1 Table preflight（SECTION 1）

- `public.stripe_events` / `stripe_processed_events` / `reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `dtr_report_snapshots` の **存在 boolean**

### 4.2 Generic `stripe_events` / dedupe

- **`generic_stripe_events_total_count`**
- **`generic_stripe_events_has_target_event`**
- **`generic_stripe_events_target_event_type_checkout_completed_bool`**
- **`suspected_global_dedupe_before_reply_lane`**（**候補** — **断定ではない**）

### 4.3 `stripe_processed_events`

- **総件数**、**対象 event 行の存在**、**対象 report の存在**
- **SKU / status 別 count**（`duplicate_noop` は **DB に無い運用でも列は 0 になり得る**）

### 4.4 Target wallet / ledger

- **report / wallet 束縛・存在**、**counts**、**cap**
- **ledger 件数**、**purchase_grant 行の存在**、**最新行の type/source/product/balance**、**Stripe 参照の有無 boolean**

### 4.5 推論フラグ（SQL 内 `suspected_*`）

- **`suspected_reply_lane_status_noop_or_rejected`** — `processed_events` に対象 event があり **`wallet_counts_changed` が明示 false** のとき **true**（baseline 未設定時は **NULL のまま推論しない**）
- **`suspected_fulfillment_processed`** — **`wallet_counts_changed IS TRUE`** かつ **purchase_grant 行あり**

### 4.6 Summary

- **`diagnostic_ready_bool`** — **report 束縛・存在**および **`target_stripe_event_id` 束縛**
- **`summary_secret_exposed_bool` / `summary_raw_user_id_returned_bool`** — **設計上 false**
- **`summary_blocking_gap_count`** — **report / wallet 未到達のギャップ件数**

---

## 5. HTTP の `fulfill_status`（SQL 外）

**`fulfill_status_observed`**（`processed` / `duplicate_noop` / …）は **DB SELECT では判別できない**。**Webhook 応答 JSON または redacted ログ**で別途記録する（**値・全文禁止ポリシー**に従う）。

---

## 6. 記録してよいもの / 禁止するもの

**親ゲート** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1.md) の **記録してよいもの / 記録禁止**に従う。

---

## 7. STOP 条件

親ゲートの STOP に加え、**SECTION 1 でテーブル欠落**があれば **SECTION 2 に進まない**。

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **packet + SQL（本文・ファイル作成）** | **GO** |
| **SQL 実行** | **別承認** |

---

## 厳守事項（本ファイル作成に関して）

- **文書および SELECT-only SQL の作成のみ**。**SQL 未実行**。**コード変更なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済・duplicate replay なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_PACKET_v1*
