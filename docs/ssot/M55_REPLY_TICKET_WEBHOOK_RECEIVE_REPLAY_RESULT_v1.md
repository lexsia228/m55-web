# M55 追加相談返書 — webhook receive / replay 結果 SSOT（v1）

**文書種別:** **既存 test `checkout.session.completed` の再送**により **ローカル Webhook 経路と Reply lane / RPC** が観測できた結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**実行パケット:** [`M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_EXECUTION_PACKET_v1.md)  
**親ゲート:** [`M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_GATE_v1.md)  
**listen 結果:** [`M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_CLI_LISTEN_SETUP_RESULT_v1.md)

**記録ポリシー:** **event id・session id・payment intent id・secret・dev log 全文**は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **イベント** | **既存の test `checkout.session.completed`** を **再送**した。 |
| **`replay_method`** | **`cli_resend`** |
| **決済** | **追加決済なし**。 |
| **`route_path`** | **`/api/stripe/webhook`** |
| **誤 endpoint** | **`/api/webhooks/stripe` は未使用**。 |
| **forward** | **`http://localhost:3000/api/stripe/webhook`**（listen setup 結果に準拠）。 |
| **出力** | **secret / event id / session id / payment intent id / dev log 全文**は **出力していない**。 |
| **未実施** | **SQL 実行**、**DB 更新の確認**、**duplicate replay 検証**。 |

---

## 2. 観測結果

| フィールド | 値 |
|------------|-----|
| **`webhook_replay_executed`** | **true** |
| **`replay_method`** | **`cli_resend`** |
| **`event_type`** | **`checkout.session.completed`** |
| **`mode`** | **`test`** |
| **`webhook_received_by_stripe_cli`** | **true** |
| **`webhook_received_by_next_route`** | **true** |
| **`route_path`** | **`/api/stripe/webhook`** |
| **`route_response_2xx`** | **true** |
| **`reply_lane_observed`** | **true** |
| **`rpc_called`** | **true** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **webhook receive / replay** | **PASS** |
| **Stripe CLI 受信** | **PASS** |
| **Next route 受信** | **PASS** |
| **route 2xx** | **PASS** |
| **Reply lane** | **PASS**（**observed**） |
| **RPC** | **PASS**（**called observed**） |

---

## 4. 限界

| 項目 | 状態 |
|------|------|
| **DB post baseline** | **未実施** |
| **`stripe_processed_events` +1** | **未確認** |
| **wallet `purchased_count` / `available_count` +1** | **未確認** |
| **ledger +1** | **未確認** |
| **duplicate replay** | **未検証** |
| **final fulfillment success** | **post baseline 実施後**に **判定する**（本 SSOT では **断定しない**） |

---

## 5. 次の候補

1. **post fulfillment baseline** の **`SELECT` のみ**実行（[`scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql)）— **別承認**。  
2. 結果は **summary 中心**。**ID 全文は貼らない**。  
3. 続けて **fulfillment result SSOT** を作成する。  

---

## 6. 引き続き NO-GO

- **追加決済**
- **duplicate replay**
- **DB 手動 UPDATE**
- **商品棚 UI** の公開・変更
- **Vercel env 変更**
- **event / session / payment intent id 全文の出力**
- **secret 出力**
- **dev log 全文貼付**

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**SQL 実行なし**。**DB 更新なし**。**追加決済なし**。**duplicate replay なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_RECEIVE_REPLAY_RESULT_v1*
