# M55 追加相談返書 — minimal redacted diagnostic log gate（v1）

**文書種別:** **Webhook / Reply lane / RPC** の分岐を、**secret や識別子の値を出さず**に **最小限**観測するための **一時診断ログ**の **設計ゲート**（**実装手順は別パケット**）  
**バージョン:** v1  

**観測結果（前提）:** [`M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_RESULT_v1.md`](./M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_RESULT_v1.md)  
**実行パケット（観測手順）:** [`M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_REDACTED_ROUTE_RESPONSE_FULFILL_STATUS_OBSERVATION_EXECUTION_PACKET_v1.md)

**本ファイルの性質:** **設計・許容範囲のSSOT**。**コード・SQL・webhook・DB 操作は行わない。**

---

## 1. このゲートの目的

| 目的 | 内容 |
|------|------|
| **2xx の内訳** | **Webhook route が 2xx** であることの **分岐上の意味**（dedupe 早期 return / lane 未到達 / 正常処理 等）を **値なし**で切り分ける材料にする |
| **Reply lane** | **Reply lane に到達したか**を **boolean / enum** のみで把握する |
| **RPC** | **RPC が呼ばれたか**、**戻り値の status** を **enum（値は出さない）**で把握する |
| **禁止** | **secret / event id / session id / payment intent id / `report_instance_id` 全文**は **絶対に出さない** |
| **一時性** | **一時診断ログ**であり、**本番向けの恒久・詳細ログではない**（**診断完了後に撤去または無効化**を **implementation パケット**で定義） |

---

## 2. 対象ファイル候補

| パス | 役割（想定） |
|------|----------------|
| **`app/api/stripe/webhook/route.ts`** | ルート入口・分岐・2xx までの道筋 |
| **`lib/m55/reply/replyTicketWebhookLane.ts`** | Reply lane 本処理・RPC 前後 |
| **`lib/m55/reply/replyTicketFulfillmentRpc.ts`** | RPC 呼び出しラッパー |

**実装時**は **最小 diff**・**上記に限定**（**unrelated refactor 禁止** — セクション 8）。

---

## 3. `route.ts` に入れてよいログ候補

**ID の値は出さない。**

| 候補キー | 型 / 例 | 備考 |
|----------|---------|------|
| **`event_type`** | 文字列（例: `checkout.session.completed`） | **Stripe 型名**のみ |
| **`checkout_session_mode`** | `test` / `live` / `unknown` | **mode** |
| **`metadata_product_key_present`** | **boolean** | 有無のみ |
| **`metadata_product_key_is_additional_reply_ticket`** | **boolean** | 比較結果の真偽のみ（**キー文字列の全文ロギングは避ける**） |
| **`client_reference_id_present`** | **boolean** | **値は出さない** |
| **`reply_lane_branch_selected`** | **boolean** | 分岐「選ばれた」事実のみ |
| **`dtr_branch_selected`** | **boolean** | 同上 |
| **`global_dedupe_returned_before_reply_lane`** | **boolean** | 早期 return の有無（**意味は実装で合わせる**） |
| **`route_response_kind`** | 短い **enum / label** | 例: `json_body` / `empty` / `error_shape` 等（**具体名は implementation で固定**） |

---

## 4. `replyTicketWebhookLane.ts` に入れてよいログ候補

**識別子の値は出さない。**

| 候補キー | 型 / 例 |
|----------|---------|
| **`reply_lane_entered`** | **boolean** |
| **`event_id_present`** | **boolean**（**全文は出さない**） |
| **`product_key_valid`** | **boolean** |
| **`report_instance_id_present`** | **boolean**（**全文は出さない**） |
| **`client_reference_id_present`** | **boolean**（**値は出さない**） |
| **`wallet_scope_user_id_present`** | **boolean**（**raw id は出さない**） |
| **`user_ref_hash_present`** | **boolean**（**ハッシュ値は出さない**） |
| **`payment_intent_present`** | **boolean**（**id は出さない**） |
| **`rpc_call_attempted`** | **boolean** |
| **`rpc_result_status`** | **enum**（**例: `ok` / `error` / `unknown`** 等、**行の中身は出さない**） |
| **`lane_response_kind`** | 短い **enum / label**（**JSON 本文は出さない**） |

---

## 5. `replyTicketFulfillmentRpc.ts` に入れてよいログ候補

**引数の値は出さない。**

| 候補キー | 型 / 例 |
|----------|---------|
| **`rpc_function_name`** | **短い定数ラベル**（**DB 関数名の呼称**として **非秘密**の範囲に留める。具体は implementation で **allowlist**） |
| **`rpc_call_started`** | **boolean** |
| **`rpc_call_succeeded`** | **boolean** |
| **`rpc_error_present`** | **boolean**（**エラーメッセージ全文は出さない**） |
| **`rpc_row_present`** | **boolean** |
| **`rpc_status`** | **enum**（**行の中身は出さない**） |

---

## 6. 記録してよいもの

- **boolean**
- **enum / status**（**短い**・**非秘密**）
- **route / lane 名**（**allowlist された**短いラベル）
- **short non-secret labels**（**固定プレフィックス**推奨: 例 `m55_reply_diag`）
- **`value_printed` = false**（人間の観測メモ用）
- **`secret_exposed` = no**（人間の観測メモ用）

---

## 7. 記録禁止

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
- **dev log 全文**（**貼付**）
- **カード情報**
- **RPC 行の生データ / 生 JSON**

---

## 8. STOP 条件

- **secret や ID 値**をログに**出そうとする**とき
- **恒久的な詳細ログ**を**本番常時**向けに**入れようとする**とき
- **関係のないリファクタ**を**始めようとする**とき
- **DB 手動 UPDATE**しようとする
- **webhook 再送**と**同時**に進もうとする
- **SQL 実行**と**同時**に進もうとする
- **商品棚 UI**へ進もうとする
- **Vercel env** を変更しようとする

---

## 9. 現時点の判定

| 項目 | 判定 |
|------|------|
| **diagnostic log gate（本文書）の作成** | **GO** |
| **実装** | **別承認** |
| **webhook replay** | **NO-GO**（**診断ログ実装・承認後**） |
| **SQL 実行** | **NO-GO** |
| **DB 更新** | **NO-GO** |
| **追加決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 10. 後続予定

| 順序 | 内容 |
|------|------|
| 1 | **minimal redacted diagnostic log implementation packet**（**diff 範囲・プレフィックス・撤去条件**） |
| 2 | **最小 diff**で診断ログ追加（**別承認**） |
| 3 | **再 replay 1 回**（**別承認**） |
| 4 | **diagnostic observation result SSOT** |
| 5 | **原因確定後**に **修正 gate** |
| 6 | **修正後**に **post baseline**（**SQL は別承認**） |

---

## 厳守事項（本ファイル作成に関して）

**文書作成のみ。** **コード変更・SQL・DB 更新・webhook 再送・追加決済・secret 出力・商品棚 UI 操作はしていない。**

---

*END OF DOCUMENT — M55_REPLY_TICKET_MINIMAL_REDACTED_DIAGNOSTIC_LOG_GATE_v1*
