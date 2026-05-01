# M55 追加相談返書 — DB pre-fulfillment baseline 結果 SSOT（v1）

**文書種別:** **test checkout payment completion** / **webhook fulfillment** の前に取得した **production pre baseline** の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**実行クエリ:** [`scripts/sql/production/m55_reply_ticket_pre_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_pre_fulfillment_baseline.sql)  
**パケット:** [`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_PACKET_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_PACKET_v1.md)  
**親ゲート:** [`M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md`](./M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md)

**環境:** **本番** — **m55-soul-core / main / PRODUCTION**（読み取り専用実行）

**記録ポリシー:** **raw `user_id`・PII・report 本文・相談本文・Checkout URL 全文・session id・secret・cookie・token・Authorization・price id 実値・DB URL** は本文に **含めない**。**対象 `report_instance_id` の UUID も SSOT に載せず**、今後は **summary 中心**にし、**ID 類をチャットへ貼らない運用を強化する**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **SQL** | **`m55_reply_ticket_pre_fulfillment_baseline.sql`** を **SELECT のみ**で実行。 |
| **禁止操作** | **`UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET`** は **実行していない**。 |
| **Checkout URL** | **未開封**。 |
| **支払い** | **なし**。 |
| **実 Webhook fulfillment** | **未実施**。 |
| **DB 更新 smoke** | **未実施**。 |
| **商品棚 UI** | **触っていない**。 |
| **Vercel env** | **未変更**。 |
| **機密・トークン類** | **secret / cookie / token / Authorization / Checkout URL / session id** は **出力・転記していない**。 |

---

## 2. baseline 結果（観測）

### 2.1 Global counts

| フィールド | 値 |
|------------|-----|
| **`stripe_processed_events_total_count`** | **0** |
| **`reply_ticket_wallets_total_count`** | **8** |
| **`reply_wallet_ledgers_total_count`** | **10** |
| **`reply_sessions_total_count`** | **11** |

### 2.2 Target binding・wallet・ledger（summary 寄り）

| フィールド | 値 |
|------------|-----|
| **`target_parameter_bound_bool`** | **true** |
| **`target_report_exists_bool`** | **true** |
| **`wallet_status`** | **active** |
| **`initial_included_count`** | **1** |
| **`purchased_count`** | **0** |
| **`available_count`** | **1** |
| **`consumed_count`** | **0** |
| **`target_wallet_cap_reached_bool`** | **false** |
| **`target_wallet_ledger_row_count`** | **1** |
| **`ledger_latest_delta`** | **1** |
| **`ledger_latest_event_type`** | **`included_grant`** |
| **`ledger_latest_source_of_grant`** | **`INCLUDED`** |
| **`ledger_latest_product_key`** | **null** |
| **`ledger_latest_balance_after`** | **1** |
| **`ledger_latest_has_stripe_reference_bool`** | **false** |

### 2.3 `stripe_processed_events`（対象・SKU・status・重複ヒント）

| フィールド | 値 |
|------------|-----|
| **`processed_events_for_target_report_instance_count`** | **0** |
| **`processed_events_additional_reply_ticket_product_count`** | **0** |
| **`processed_events_status_processed_count`** | **0** |
| **`processed_events_status_received_count`** | **0** |
| **`processed_events_status_rejected_not_owner_count`** | **0** |
| **`processed_events_status_rejected_wallet_inactive_count`** | **0** |
| **`processed_events_status_skipped_cap_count`** | **0** |
| **`processed_events_stripe_event_id_surplus_duplicate_rows`** | **0** |

### 2.4 Summary フラグ

| フィールド | 値 |
|------------|-----|
| **`baseline_ready_bool`** | **true** |
| **`summary_target_report_exists`** | **true** |
| **`summary_target_wallet_exists`** | **true** |
| **`summary_target_wallet_active`** | **true** |
| **`summary_target_cap_available`** | **true** |
| **`summary_global_counts_ready_bool`** | **true** |
| **`summary_secret_exposed_bool`** | **false** |
| **`summary_raw_user_id_returned_bool`** | **false** |
| **`summary_blocking_gap_count`** | **0** |

※ **`owner_user_hash_hex16` / `wallet_id` 等の識別子**は運用上の理由で **本 SSOT には記載しない**（チャット・チケットにも **貼らない**）。

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **`baseline_ready_bool`** | **true** → **PASS** |
| **対象 report** | **存在**（`summary_target_report_exists`） |
| **対象 wallet** | **存在**（`summary_target_wallet_exists`） |
| **wallet** | **active** |
| **cap** | **利用可能**（`summary_target_cap_available`） |
| **`stripe_processed_events`（全体）** | **0 件** |
| **対象 report に紐づく processed_events** | **0 件** |
| **`blocking_gap_count`** | **0** |
| **総合** | **pre fulfillment baseline として PASS** — **支払い・Webhook 前の断面が SSOT として固定できた**。 |

---

## 4. 次に post で期待する差分（successful payment / webhook 後の正常系）

同一 baseline SQL を **post fulfillment** で再実行したときの **期待される変化**（環境が同一・1 回限りの grant を前提）。

| 観測 | 期待 |
|------|------|
| **`stripe_processed_events_total_count`** | **+1** |
| **`processed_events_for_target_report_instance_count`** | **+1** |
| **`reply_wallet_ledgers_total_count`**（グローバル） | **+1** |
| **`target_wallet_ledger_row_count`** | **+1** |
| **`purchased_count`** | **0 → 1** |
| **`available_count`** | **1 → 2** |
| **`consumed_count`** | **0 のまま** |
| **`ledger_latest_delta`** | **1** |
| **`ledger_latest_event_type`** | **`purchase_grant`** |
| **`ledger_latest_source_of_grant`** | **`PURCHASE`** |
| **`ledger_latest_product_key`** | **`additional_reply_ticket`** |
| **`ledger_latest_balance_after`** | **2** |
| **`ledger_latest_has_stripe_reference_bool`** | **true** |

※ **duplicate replay** 時は **変化なし** を別ゲートで確認する。

---

## 5. 限界

- **payment completion** は **未実施**。
- **webhook fulfillment** は **未実施**。
- **duplicate replay** は **未検証**。
- **cancel / expired / refund / dispute** は **別 SSOT**。
- **observability / alert / incident response** は **別 SSOT**。

---

## 6. 引き続き NO-GO

- **支払い完了**
- **実 Webhook fulfillment**
- **DB 更新 smoke**
- **duplicate replay**（別承認まで）
- **商品棚 UI** の公開・変更
- **Vercel env 変更**
- **secret / Checkout URL / session id** の **出力・転記**

---

## 7. 次の候補

1. **test checkout payment completion gate**  
2. **test webhook fulfillment gate**  
3. **post fulfillment baseline packet**（同一 SELECT の post 実行・結果 SSOT）  
4. **duplicate replay gate**  
5. **cancel / expired / refund SSOT**  
6. **observability / incident response SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Checkout 開封・決済・Webhook 発火・Stripe Dashboard/env 変更・秘密出力・商品棚 UI 操作は **実施していない**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1*
