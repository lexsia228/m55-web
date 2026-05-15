# M55 追加相談返書 — dedupe / fulfill status 診断ゲート（v1）

**文書種別:** **Webhook が 200 だが DB fulfillment が未確認**である状況を **`stripe_events` dedupe**、**Reply lane の `fulfill_status`**、**RPC / DB テーブルの観測**で切り分けるためのゲート SSOT（**設計のみ** — **SQL 未実行**）  
**バージョン:** v1  

**静的監査:** [`M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_RESULT_v1.md`](./M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_RESULT_v1.md)

**記録ポリシー:** **event id・session id・payment intent id の全文**および **秘密情報**は記録しない（セクション 4–5）。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **global dedupe** | **`stripe_events` に対象 `event.id` が先行存在し、Reply lane より前で 200 return した可能性**を **読み取り**で検証する。 |
| **Reply lane status** | **HTTP 応答 JSON または redacted ログ**から **`lane` / `fulfill_status`** を **値なし全文禁止の範囲で**確認する。 |
| **DB 断面** | **`stripe_processed_events` / `reply_wallet_ledgers` / `reply_ticket_wallets`** を **SELECT のみ**で確認する（**実行は別パケット・別承認**）。 |
| **コード** | **コード修正前に**原因候補を **絞る**。 |

---

## 2. 確認候補

| # | 確認内容 |
|---|----------|
| 1 | **汎用 `stripe_events`** に **対象イベント**が **既に存在するか**（dedupe 発火の芽）。 |
| 2 | **`stripe_processed_events`** に **対象イベント行**または **対象 report** に紐づく行が **あるか**。 |
| 3 | **`reply_wallet_ledgers`** に **`additional_reply_ticket` / `PURCHASE` / `purchase_grant`** に整合する **増分**があるか。 |
| 4 | **`reply_ticket_wallets`** の **`purchased_count` / `available_count`** が **期待どおり増えているか**。 |
| 5 | **route 応答 JSON** または **redacted log** で **`lane` / `fulfill_status`** を **観測できるか**。 |
| 6 | **（推論）** **`event.id` dedupe が Reply lane より前に効いたか** — 上記 1 と 5 を組み合わせて **boolean で記録**。 |

---

## 3. SELECT-only 候補（次パケットで具体化）

以下は **すべて SELECT のみ**。**識別子は tail4 / hash / boolean に限定**し、**全文は返さない**。

| 観測 | 概要 |
|------|------|
| **generic `stripe_events`** | **件数**および **対象 event に該当する行の存在 boolean**（**event id は全文マッチではなく安全なスコープ設計** — execution packet でパラメータ方針を固定）。 |
| **`stripe_processed_events`** | **件数**、**対象 event に紐づく存在 boolean**、**対象 report の件数**。 |
| **対象 wallet** | **`purchased_count` / `available_count` / `consumed_count`** |
| **対象 ledger 最新行** | **`event_type` / `source_of_grant` / `product_key` / `balance_after`**（**Stripe 列は boolean / tail4 のみ** — 既存 baseline SQL と整合） |

※ **`event.id` / `session.id` / `payment_intent.id` の全文**を **SELECT 結果に投影しない**。

---

## 4. 記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`generic_stripe_events_has_target_event`** | **true / false / unknown** |
| **`processed_events_has_target_event`** | **true / false / unknown** |
| **`processed_events_has_target_report`** | **true / false / unknown** |
| **`wallet_counts_changed`** | **true / false / unknown** |
| **`ledger_purchase_grant_exists`** | **true / false / unknown** |
| **`suspected_global_dedupe_before_reply_lane`** | **true / false / unknown** |
| **`fulfill_status_observed`** | **`processed` / `duplicate_noop` / `skipped_cap` / `rejected_invalid_product` / `rejected_not_owner` / `rejected_wallet_inactive` / `error` / `unknown`** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 5. 記録禁止

- **Stripe event id 全文**
- **checkout session id 全文**
- **payment intent id 全文**
- **Checkout URL 全文**
- **webhook secret**
- **Stripe secret key**
- **Supabase keys**
- **DB URL**
- **raw `user_id`**
- **`report_instance_id` 全文を不用意に貼ること**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 6. STOP 条件

- **追加 replay**しようとする
- **duplicate replay**へ進もうとする
- **追加決済**しようとする
- **DB 手動 UPDATE**しようとする
- **コード修正**しようとする
- **secret / event id / session id** を貼りそうになる
- **商品棚 UI**へ進もうとする
- **Vercel env** を変更しようとする

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **diagnostic gate（本文書の作成）** | **GO** |
| **SELECT-only diagnostic packet** | **次**に作成 |
| **SQL 実行** | **NO-GO** |
| **replay** | **NO-GO** |
| **コード修正** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 8. 後続予定

1. **dedupe / fulfill status SELECT-only packet**  
2. **結果 SSOT**  
3. **必要なら redacted diagnostic log 最小追加 gate**  
4. **その後に再 replay**（別承認）  
5. **post baseline**  
6. **fulfillment result SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_GATE_v1*
