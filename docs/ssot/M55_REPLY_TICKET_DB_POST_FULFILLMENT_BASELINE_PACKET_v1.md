# M55 追加相談返書 — DB post-fulfillment baseline 実行パケット（v1）

**文書種別:** **test checkout payment completion**（およびそれに続く Webhook fulfillment）の **後**に実行する **post baseline** の **手順・記録規約・SQL 参照**の SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md`](./M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md)  
**PRE 結果（固定断面）:** [`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md)  
**PRE SQL（同一パラメータ方針）:** [`m55_reply_ticket_pre_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_pre_fulfillment_baseline.sql)  
**POST SQL（本パケット）:** [`m55_reply_ticket_post_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql)

---

## 1. post baseline の目的

| 観点 | 内容 |
|------|------|
| **検証** | 支払い完了・Webhook 経路後に、**PRE baseline と同一のスコープ・同一 `report_instance_id`** で **SELECT のみ**を再実行し、**期待差分**が満たされるか確認する。 |
| **読み取りのみ** | **SELECT のみ**。**DB 更新なし**（クエリ実行それ自体が）。 |
| **Stripe ID** | Checkout / Session / PI の **全文は投影しない**。ledger 行について **存在 boolean** と **末尾 4 文字（tail4）** のみ（SQL 内コメント参照）。 |
| **スコープ外** | **cancel / expired / refund / observability** は **後続 SSOT**。 |

---

## 2. SELECT-only と決済 GO について

- **許可:** `SELECT`（ `WITH` 可）。
- **禁止:** `UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET` / `TRUNCATE`。
- **本パケット単体では決済 GO にしない** — 実行結果の SSOT は **fulfillment の証跡**であり、**duplicate replay** や **本番運用 GO** の代替ではない。

---

## 3. PRE 定数（SQL 内 `expected_pre_from_ssot`）

POST SQL は **PRE 結果 SSOT v1** に合わせて **固定された PRE 定数**と差分比較する（ローカルコピーでのみ差し替え可・**コミット禁止**）。

| PRE 項目 | 値 |
|----------|-----|
| **`stripe_processed_events_total_count`** | **0** |
| **`reply_wallet_ledgers_total_count`** | **10** |
| **`target_wallet_ledger_row_count`** | **1** |
| **`purchased_count`** | **0** |
| **`available_count`** | **1** |
| **`consumed_count`** | **0** |

---

## 4. POST で確認すること（観測）

### 4.1 Global baseline

- `stripe_processed_events_total_count`
- `reply_ticket_wallets_total_count`
- `reply_wallet_ledgers_total_count`
- `reply_sessions_total_count`

### 4.2 Target wallet（post state）

- `wallet_status`
- `initial_included_count`
- `purchased_count` / `available_count` / `consumed_count`
- `target_wallet_cap_reached_bool`

### 4.3 PRE からの期待差分（成功系・1 回 grant）

| 観測 | PRE → POST 期待 |
|------|-----------------|
| **`stripe_processed_events_total_count`** | **0 → 1** |
| **対象 report の processed_events 件数** | **0 → 1** |
| **`reply_wallet_ledgers_total_count`（グローバル）** | **10 → 11** |
| **`target_wallet_ledger_row_count`** | **1 → 2** |
| **`purchased_count`** | **0 → 1** |
| **`available_count`** | **1 → 2** |
| **`consumed_count`** | **0 のまま** |

### 4.4 Latest ledger（最新行）

- **`delta`** = **1**
- **`event_type`** = **`purchase_grant`**
- **`source_of_grant`** = **`PURCHASE`**
- **`product_key`** = **`additional_reply_ticket`**
- **`balance_after`** = **2**
- **`ledger_latest_stripe_event_id_present_bool`**
- **`ledger_latest_stripe_checkout_session_id_present_bool`**
- **`ledger_latest_stripe_payment_intent_id_present_bool`**（値は出さず **boolean のみ**）
- **tail4** 列（任意の照合用ヒント — **全文ではない**）

**`expected_stripe_reference_present_bool`（SQL 内）:** **`stripe_event_id`** と **`stripe_checkout_session_id`** の両方が存在することを要求する。**`payment_intent`** は RPC により **NULL の場合あり** — 本ゲートの合成フラグには **含めない**（boolean は別列で記録）。

### 4.5 `stripe_processed_events` status（集計のみ・ID は出さない）

- 対象 report の件数
- `additional_reply_ticket` の件数
- **`processed`** / **`received`** 件数
- **`rejected_*` / `skipped_cap`** 件数（あれば）
- **`processed_events_status_rejected_or_skipped_total_count`**（合成）
- **`stripe_event_id` 重複冗長行** = **0** を期待

---

## 5. Summary 列（SQL 末尾）

| 列名 | 意味 |
|------|------|
| **`post_fulfillment_ready_bool`** | 対象束縛・存在確認・**blocking_gap_count = 0**・hash 不一致なし |
| **`expected_global_processed_events_delta_met_bool`** | グローバル processed_events **+1** |
| **`expected_global_ledger_delta_met_bool`** | グローバル ledgers **+1** |
| **`expected_target_wallet_ledger_delta_met_bool`** | 対象 wallet の ledger 行 **+1** |
| **`expected_target_wallet_counts_met_bool`** | purchased / available / consumed の期待 |
| **`expected_latest_ledger_met_bool`** | 最新 ledger の型・SKU・残高 |
| **`expected_stripe_reference_present_bool`** | event + checkout **参照あり** |
| **`expected_target_processed_events_count_met_bool`** | 対象 report **1 件** |
| **`expected_additional_reply_ticket_processed_events_met_bool`** | SKU 行 **1 件** |
| **`expected_no_stripe_event_id_duplicate_surplus_bool`** | 重複冗長 **0** |
| **`expected_processed_events_terminal_clean_bool`** | processed **≥1** かつ rejected/skipped **合計 0** |
| **`summary_secret_exposed_bool`** | **false**（設計宣言） |
| **`summary_raw_user_id_returned_bool`** | **false**（設計宣言） |
| **`summary_blocking_gap_count`** | 上記期待の **不履行の個数** |

---

## 6. 記録してよいもの / 禁止するもの

**よいもの:** 件数、boolean、status、enum 文字列、`tail4`、hash、timestamp、case 名、`value_printed=false`、`secret_exposed=no`。

**禁止:** Checkout URL 全文、session id 全文、Stripe event id / checkout session id / payment intent id の **全文**、price id 実値、secret、DB URL、cookie/token/Authorization、raw user_id、生年月日、report/相談本文、カード情報スクショ。

---

## 7. 実行ポリシー

| 項目 | 方針 |
|------|------|
| **タイミング** | [`M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md`](./M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md) に従い、**支払い完了後すぐ**（同一検証セッション内）。 |
| **パラメータ** | **PRE と同一の `target_report_instance_id`**（および任意で同一 operator hash）。 |
| **承認** | **別承認**（読み取り口・環境）。 |
| **結果** | **post baseline 結果 SSOT** を作成したうえで **fulfillment result SSOT** / **duplicate replay gate** へ進む。 |

---

## 8. STOP 条件

- SELECT 以外を実行する。
- **POST 結果なし**で duplicate / GO を宣言する。
- secret・全文 ID・カード情報をチャットや SSOT に載せる。
- 商品棚 UI・Vercel env・DTR checkout route を検証のために変更する。

---

## 厳守事項（本ファイル作成に関して）

- **文書および SELECT-only SQL の作成のみ**。**SQL 未実行**。**DB 更新なし**。**Checkout 未開封**。**決済なし**。**Webhook 未発火**。**Stripe Dashboard/env 変更なし**。**秘密出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1*
