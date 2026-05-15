# M55 追加相談返書 — minimal redacted diagnostic log implementation packet（v1）

**文書種別:** **一時診断ログ**を **最小 diff** で追加するための **実装手順・チェックリスト**の SSOT（**本パケットでは実装しない**）  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_MINIMAL_REDACTED_DIAGNOSTIC_LOG_GATE_v1.md`](./M55_REPLY_TICKET_MINIMAL_REDACTED_DIAGNOSTIC_LOG_GATE_v1.md)  
**観測結果:** [`M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_RESULT_v1.md`](./M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_RESULT_v1.md)

**前提:** Webhook route **2xx** は確認済み。**lane / fulfill_status / RPC / Reply lane** の確証は **未取得**。  
**本ファイルの性質:** **実装手順の固定**。**コード・SQL・webhook・DB・決済・商品棚は行わない。**

---

## 1. 実装対象

| ファイル | 役割 |
|----------|------|
| **`app/api/stripe/webhook/route.ts`** | ルート入口・分岐・dedupe 前後 |
| **`lib/m55/reply/replyTicketWebhookLane.ts`** | Reply lane・RPC 前後 |
| **`lib/m55/reply/replyTicketFulfillmentRpc.ts`** | RPC ヘルパー |

---

## 2. 実装方針

| 方針 | 内容 |
|------|------|
| **diff** | **最小**。対象 3 ファイルに限定 |
| **出力API** | **`console.info`** または **既存 logger と同等の単一行出力**のみ |
| **密度** | **1 分岐あたり 1 ログ以内** |
| **許容データ** | **boolean / enum / short label のみ** |
| **禁止** | **secret / ID の値 / payload 本文**は **絶対に出さない** |
| **寿命** | **恒久ログではない**。**一時診断** |
| **削除予定** | **`TODO`** または **コメント**で **後削除対象**と明記（例: `M55 reply ticket diagnostic — remove after observation SSOT`） |
| **スコープ** | **unrelated refactor 禁止** |

---

## 3. `route.ts` に追加する候補ログ

### `[reply-ticket-diagnostic:route_received]`

| フィールド | 型 |
|------------|-----|
| `event_type` | 短い文字列（Stripe 型名） |
| `checkout_session_mode` | `test` / `live` / `unknown` |
| `metadata_product_key_present` | boolean |
| `metadata_product_key_is_additional_reply_ticket` | boolean |
| `client_reference_id_present` | boolean |

### `[reply-ticket-diagnostic:route_branch]`

| フィールド | 型 |
|------------|-----|
| `reply_lane_branch_selected` | boolean |
| `dtr_branch_selected` | boolean |
| `global_dedupe_returned_before_reply_lane` | boolean |
| `route_response_kind` | short enum / label |

**いずれも ID 値は出さない。**

---

## 4. `replyTicketWebhookLane.ts` に追加する候補ログ

### `[reply-ticket-diagnostic:lane_entered]`

| フィールド | 型 |
|------------|-----|
| `reply_lane_entered` | boolean |
| `event_id_present` | boolean |
| `product_key_valid` | boolean |
| `report_instance_id_present` | boolean |
| `client_reference_id_present` | boolean |
| `wallet_scope_user_id_present` | boolean |
| `user_ref_hash_present` | boolean |
| `payment_intent_present` | boolean |

### `[reply-ticket-diagnostic:lane_rpc]`

| フィールド | 型 |
|------------|-----|
| `rpc_call_attempted` | boolean |
| `rpc_result_status` | short enum |
| `lane_response_kind` | short enum / label |

**値（ID・ハッシュ・client_reference_id 等）は出さない。**

---

## 5. `replyTicketFulfillmentRpc.ts` に追加する候補ログ

### `[reply-ticket-diagnostic:rpc]`

| フィールド | 型 / 定数 |
|------------|------------|
| `rpc_function_name` | 定数ラベル **`m55_reply_ticket_fulfill_checkout_event`**（**実際の RPC 名と一致させる。値はこの allowlist のみ**） |
| `rpc_call_started` | boolean |
| `rpc_call_succeeded` | boolean |
| `rpc_error_present` | boolean |
| `rpc_row_present` | boolean |
| `rpc_status` | short enum（**行の中身は出さない**） |

**引数・行・エラーテキスト全文は出さない。**

---

## 6. 禁止

- **event id 全文**
- **checkout session id 全文**
- **payment intent id 全文**
- **Checkout URL**
- **webhook secret**
- **Stripe secret**
- **Supabase keys**
- **DB URL**
- **raw `user_id`**
- **`report_instance_id` の値**
- **`user_ref_hash` の値**
- **`client_reference_id` の値**
- **request body 全文**
- **Stripe payload 全文**
- **RPC row 全文**
- **cookie / token / Authorization**
- **dev log 全文**を **SSOT やチャットへ貼ること**

---

## 7. 実装後の確認（別承認・実装完了後に実施）

| # | 確認 |
|---|------|
| 1 | **`npm run dev`** が問題なく起動する |
| 2 | **audit gate**（プロジェクト既定の **lint / typecheck** 等）が **通る** |
| 3 | **型エラー**が出ない |
| 4 | **ログ出力に secret / ID 値が含まれない**（**人手で redacted 確認**） |
| 5 | **実装をコミット** |
| 6 | **その後**、**webhook を 1 回だけ再 replay**（**別承認**）し、**summary のみ**結果 SSOT に記録 |

---

## 8. STOP 条件

- **secret や ID 値**が出る**可能性**がある実装にしようとするとき
- **Stripe payload 全文**を出そうとするとき
- **RPC row 全文**を出そうとするとき
- **unrelated refactor**を始めるとき
- **DB ロジック**を変更しようとするとき
- **fulfillment ロジック**を修正しようとするとき
- **webhook 再送**と**同時**に実装しようとするとき
- **SQL 実行**と**同時**に実装しようとするとき
- **商品棚 UI**を触ろうとするとき

---

## 9. 現時点の判定

| 項目 | 判定 |
|------|------|
| **implementation packet（本文書）の作成** | **GO** |
| **実装** | **別承認** |
| **webhook 再送** | **NO-GO**（**実装・コミット後の別承認**） |
| **SQL 実行** | **NO-GO** |
| **DB 更新** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

**文書作成のみ。** **コード変更・SQL・DB 更新・webhook 再送・追加決済・secret 出力・商品棚 UI 操作はしていない。**

---

*END OF DOCUMENT — M55_REPLY_TICKET_MINIMAL_REDACTED_DIAGNOSTIC_LOG_IMPLEMENTATION_PACKET_v1*
