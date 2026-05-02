# M55 追加相談返書 — dedupe / fulfill status diagnostic 結果 SSOT（v1）

**文書種別:** **dedupe / fulfill status diagnostic SQL** の **SELECT-only** 実行結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**パケット:** [`M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_PACKET_v1.md`](./M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_PACKET_v1.md)  
**SQL:** [`scripts/sql/production/m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql`](../../scripts/sql/production/m55_reply_ticket_dedupe_fulfill_status_diagnostic.sql)

**記録ポリシー:** **event id / session id / payment intent id / secret** は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **SQL** | **dedupe / fulfill status diagnostic** を **SELECT のみ**実行した。 |
| **DB** | **更新なし**。 |
| **replay / 決済** | **追加 replay なし**、**追加決済なし**。 |
| **コード / UI** | **コード変更なし**、**商品棚 UI 未操作**。 |
| **出力** | **secret・ID 全文**は **出力していない**。 |

---

## 2. diagnostic 結果

| フィールド | 値 |
|------------|-----|
| **`generic_stripe_events_total_count`** | **82** |
| **`generic_stripe_events_has_target_event`** | **false** |
| **`generic_stripe_events_target_event_type_checkout_completed_bool`** | **false** |
| **`stripe_processed_events_total_count`** | **0** |
| **`processed_events_has_target_event`** | **false** |
| **`processed_events_has_target_report`** | **false** |
| **`processed_events_additional_reply_ticket_count`** | **0** |
| **`target_report_bound_bool`** | **true** |
| **`target_report_exists_bool`** | **true** |
| **`target_wallet_exists_bool`** | **true** |
| **`target_wallet_status`** | **active** |
| **`purchased_count`** | **0** |
| **`available_count`** | **1** |
| **`consumed_count`** | **0** |
| **`target_wallet_ledger_row_count`** | **1** |
| **`ledger_purchase_grant_exists`** | **false** |
| **`latest_ledger_event_type`** | **`included_grant`** |
| **`latest_ledger_source_of_grant`** | **`INCLUDED`** |
| **`latest_ledger_product_key`** | **null** |
| **`wallet_counts_changed_bool`** | **null** |
| **`suspected_global_dedupe_before_reply_lane`** | **false** |
| **`suspected_reply_lane_status_noop_or_rejected`** | **false** |
| **`suspected_fulfillment_processed`** | **false** |
| **`diagnostic_ready_bool`** | **true** |
| **`summary_blocking_gap_count`** | **0** |
| **`summary_secret_exposed_bool`** | **false** |
| **`summary_raw_user_id_returned_bool`** | **false** |

---

## 3. 判定

| 観点 | 結論 |
|------|------|
| **`diagnostic_ready_bool`** | **true** — report / wallet の束縛は妥当。 |
| **`generic stripe_events`** | **テーブルには 82 件存在**する。 |
| **対象 event（SQL に束縛した target）** | **`stripe_events` にも `stripe_processed_events` にも存在しない**と観測された。 |
| **wallet / ledger** | **未変化**（purchase_grant なし、最新は **included_grant / INCLUDED**）。 |
| **fulfillment processed** | **いまだ判定しない**。 |
| **global dedupe** | **「dedupe で食われた」とはまだ断定しない**（**target が DB に無いなら dedupe 以前の問題もあり得る**）。 |
| **最有力候補** | **SQL に束縛した target event ID が、実際に再送した `checkout.session.completed` と同一でない**、または **イベント選定がずれている**可能性。 |

---

## 4. Gemini 案への補正

| 論点 | 補正 |
|------|------|
| **forward 先** | **`http://localhost:3000/api/stripe/webhook`** は **今回の local 検証では正しい forward 先**として既に固定されている。 |
| **DB 接続** | **ローカル Next route は Supabase（クラウド）DB に接続しうる** — **localhost forward が「DB に届いていない」とは限らない**。 |
| **Vercel endpoint** | **本番 / preview の endpoint 切替**は **別フェーズの論点**であり、**現 local 検証の主因とは断定しない**。 |

---

## 5. 次の候補

1. **target event alignment check packet** — **Stripe CLI / Dashboard** で **「実際に再送した `checkout.session.completed`」**と **「SQL の `params.target_stripe_event_id` に入れた値」**が **同一か**を **値を出さず**に確認する。  
2. **必要なら** **redacted 応答 JSON**（**`lane` / `fulfill_status`** のみ）の **最小観測 gate**。  

---

## 6. 引き続き NO-GO

- **追加決済**
- **追加 replay**
- **duplicate replay**
- **DB 手動 UPDATE**
- **コード修正**
- **Vercel env 変更**
- **商品棚 UI**
- **event / session / payment intent id 全文の出力**
- **secret 出力**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DEDUPE_FULFILL_STATUS_DIAGNOSTIC_RESULT_v1*
