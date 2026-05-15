# M55 追加相談返書 — redacted route response / fulfill_status 観測 実行パケット（v1）

**文書種別:** **次回 webhook replay 時**に **`lane` / `fulfill_status` / dedupe らしさ**を **値なし**で観測する人手手順・記録規約の SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_GATE_v1.md`](./M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_GATE_v1.md)  
**前提:** [`M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_RESULT_v1.md`](./M55_REPLY_TICKET_TARGET_EVENT_ALIGNMENT_RESULT_v1.md)

**記録ポリシー:** **event id・session id・payment intent id・secret・全文ログ**は **記録しない**（セクション 4–5）。

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **イベント** | **既存の test `checkout.session.completed`** の **replay（1 回のみ）** |
| **`route_path`** | **`/api/stripe/webhook`** |
| **経路** | **Stripe CLI `listen` → forward** |
| **mode** | **test** |
| **決済** | **追加決済なし** |
| **duplicate replay** | **本パケットは duplicate 検証 Gate ではない** |
| **商品棚 UI** | **未公開** |

---

## 2. 実施前確認

| # | 確認 |
|---|------|
| 1 | **`npm run dev`** が **起動中** |
| 2 | **`stripe listen` が起動中** |
| 3 | **forward 先**が **`http://localhost:3000/api/stripe/webhook`** |
| 4 | **webhook secret と local env が一致**（結果 SSOT 参照） |
| 5 | **target event alignment** が **PASS** |
| 6 | **event / session / payment intent id 全文**は **記録しない** |
| 7 | **dev log 全文**は **貼らない** |

---

## 3. 観測方法

| 手順 | 内容 |
|------|------|
| 1 | **webhook replay を 1 回だけ**実施する（**別承認**）。 |
| 2 | **Stripe CLI 側**で **受信の有無**を **summary のみ**確認する。 |
| 3 | **Next 側**で **`POST /api/stripe/webhook` の 2xx** を **summary のみ**確認する。 |
| 4 | **route response JSON** または **redacted log** で **以下のみ**確認する：`lane`、`fulfill_status`、`rpc_called`（間接）、`global_dedupe_observed`、`reply_lane_observed`。 |
| 5 | **観測不能**な項目は **`unknown`** と記録し、**最小 redacted diagnostic log gate** を検討する。 |
| 6 | **event / session / payment intent id 全文**は **出さない**。 |

---

## 4. 記録してよいもの

| フィールド | 型 / 値 |
|------------|---------|
| **`webhook_replay_executed`** | **true / false** |
| **`replay_method`** | **`cli_resend` / `dashboard` / `unknown`** |
| **`event_type`** | **`checkout.session.completed`** |
| **`mode`** | **`test`** |
| **`route_response_2xx`** | **true / false / unknown** |
| **`route_response_json_observed`** | **true / false / unknown** |
| **`route_response_lane`** | **`reply_ticket` / `dtr` / `generic_dedupe` / `unknown`** |
| **`fulfill_status_observed`** | **`processed` / `duplicate_noop` / `skipped_cap` / `rejected_invalid_product` / `rejected_not_owner` / `rejected_wallet_inactive` / `rejected_wallet_not_found` / `error` / `unknown`** |
| **`rpc_called`** | **true / false / unknown** |
| **`global_dedupe_observed`** | **true / false / unknown** |
| **`reply_lane_observed`** | **true / false / unknown** |
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
- **`report_instance_id` 全文**
- **`user_ref_hash` の値**
- **`client_reference_id` の値**
- **cookie / token / Authorization**
- **dev log 全文**
- **カード情報**

---

## 6. STOP 条件

- **secret** を貼りそうになる
- **event / session / payment intent id 全文**を貼りそうになる
- **dev log 全文**を貼りそうになる
- **追加決済**しようとする
- **duplicate replay 検証**へ **同一セッションで逸脱**しようとする
- **DB 手動 UPDATE**しようとする
- **コード修正**しようとする
- **商品棚 UI**へ進もうとする
- **Vercel env** を変更しようとする

---

## 7. 実行後の流れ

| 観測 | 次のアクション |
|------|----------------|
| **結果** | **観測結果 SSOT** を作成する。 |
| **`fulfill_status` = `processed`** | **post fulfillment baseline `SELECT`** へ（**別承認**） |
| **`duplicate_noop` / `rejected_*` / `skipped_cap` / `unknown`** | **原因別**に次ゲートへ分岐（**SSOT 化**） |
| **観測不能** | **最小 redacted diagnostic log gate** へ |
| **SQL** | **結果 SSOT 後**の **別承認** |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **execution packet（本文書の作成）** | **GO** |
| **webhook replay 実行** | **別承認** |
| **SQL 実行** | **NO-GO** |
| **コード変更** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **duplicate replay** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**webhook 再送なし**。**SQL 実行なし**。**DB 更新なし**。**コード変更なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_EXECUTION_PACKET_v1*
