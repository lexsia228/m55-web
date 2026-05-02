# M55 追加相談返書 — Webhook route / Reply lane 静的監査結果 SSOT（v1）

**文書種別:** **コード変更なし**で実施した **`route.ts` / `replyTicketWebhookLane.ts` / `replyTicketFulfillmentRpc.ts`** の読み取り監査結果  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**監査パケット:** [`M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_PACKET_v1.md`](./M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_PACKET_v1.md)  
**metadata:** [`M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_RESULT_v1.md)

**記録ポリシー:** **secret・env 値・event/session/payment intent の全文・dev log 全文**は本文に **含めない**。

---

## 監査サマリー（フィールド）

| フィールド | 値 |
|------------|-----|
| **`reply_lane_branch_exists`** | **true** |
| **`reply_lane_called_before_dtr_fulfillment`** | **true** |
| **`global_dedupe_can_short_circuit_before_reply_lane`** | **true** |
| **`client_reference_id_required_for_reply_lane`** | **true** |
| **`reply_lane_stop_condition_found`** | **true** |
| **`rpc_function_name_matches`** | **true** |
| **`rpc_argument_names_match`** | **true** |
| **`rpc_result_status_observable`** | **true** |
| **`suspected_blocker`** | **`stripe_events` による **`event.id` 事前 dedupe**、または Reply lane が **`duplicate_noop` / `rejected_*` / `skipped_cap`** で **200 を返し DB 更新なし** |
| **`recommended_next_step`** | **運用で観測した HTTP 応答 JSON に `lane` / `fulfill_status` があるかを redacted summary で確認する。必要なら **`stripe_events` に同一 `event.id` が事前挿入されていないか**を読み取り専用で確認する（別承認）** |

※ **`reply_lane_stop_condition_found`:** コード上 **複数の STOP（400）および RPC 未到達経路**が **存在すること**を監査で特定したため **true**（実行時にどれが発火したかは **未確定**）。

---

## 1. `app/api/stripe/webhook/route.ts` 監査結果

| 確認項目 | 結論（静的） |
|----------|----------------|
| **`stripe_events` / global dedupe** | **`POST` 本処理の早い段階で** `stripe_events` に **`event.id` が既に存在する**と **`200` + `received: true` で return** する。**`handleCheckoutCompleted` および Reply lane より前**。 |
| **`checkout.session.completed` の分岐順** | 署名検証 → **dedupe** → `handleCheckoutCompleted`（invoice.paid / charge.refunded と並列はイベント型で分岐）。`handleCheckoutCompleted` 内は **`client_reference_id` 有無** → **subscription** → **`mode !== 'payment'` で 200** → **`metadata.product_key === additional_reply_ticket` で Reply lane** → **許可 one-time 製品チェック** → **DTR one-time**。 |
| **`additional_reply_ticket` が Reply lane に入る条件** | **`session.mode === 'payment'`**、**subscription レーンに入らない**こと、かつ **`session.metadata` の `product_key`（または定数キー）が `ADDITIONAL_REPLY_TICKET_PRODUCT_KEY` と一致**。 |
| **DTR fulfillment に吸われる可能性** | **上記 Reply lane 条件を満たす場合**、`handleCheckoutCompletedOneTime`（DTR）には **入らず** Reply lane が優先。**満たさない one-time のみ** DTR 側。 |
| **`payment_intent.succeeded`** | **本ファイルの Reply 付与経路は `checkout.session.completed` 経由**。**`payment_intent.succeeded` を直接の追加返書付与イベントとしては扱っていない**（別イベント型はこの監査スコープ外で早期 return 等あり得る）。 |
| **`client_reference_id` 欠損** | **`handleCheckoutCompleted` 冒頭で `userId` 欠落時は `200`（`received: true`）かつ失敗記録用パス** — **Reply lane 未到達**。 |
| **2xx でも内部 skip** | **dedupe 200**、**`client_reference_id` 欠損 200**、**`mode !== 'payment'` 200**、**製品 mismatch 200**、および **Reply lane 内の `duplicate_noop` / `rejected_*` / `skipped_cap` はいずれも 200 になり得て DB は変わらない** |

---

## 2. `lib/m55/reply/replyTicketWebhookLane.ts` 監査結果

| 確認項目 | 結論（静的） |
|----------|----------------|
| **`event.id` STOP** | **欠損・空なら 400**、`missing_event_id`。 |
| **`product_key` STOP** | **`ADDITIONAL_REPLY_TICKET_PRODUCT_KEY` と不一致なら 400**（この関数に入る前に route 側で一致させているが、関数内でも再検証）。 |
| **`report_instance_id` STOP** | **欠損 400**、**UUID 形式不一致 400**。 |
| **`client_reference_id` / wallet scope** | **`session.client_reference_id` を trim し空なら 400**、`missing_wallet_scope`。 |
| **`user_ref_hash`** | **metadata から取得**、無ければ **`null` で RPC に渡す**。 |
| **`payment_intent`** | **`session.payment_intent` が string のときのみ** RPC に渡す、否则 **`null`**。 |
| **RPC 呼び出し条件** | 上記すべて通過後 **`callM55ReplyTicketFulfillCheckoutEvent`**。 |
| **RPC 戻り値と HTTP** | **`processed` / `duplicate_noop` → 200**；**`skipped_cap` → 200 + warn ログ**；**`rejected_invalid_product` / `rejected_not_owner` / `rejected_wallet_inactive` → 200 + `no_op: true` + warn ログ**。 |
| **`rejected` / `skipped` / `duplicate_noop` が 200 か** | **いずれも 200**。 |

---

## 3. `lib/m55/reply/replyTicketFulfillmentRpc.ts` 監査結果

| 確認項目 | 結論（静的） |
|----------|----------------|
| **RPC 関数名** | **`m55_reply_ticket_fulfill_checkout_event`**。 |
| **引数名と DB 関数** | **候補 SQL**（[`scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`](../../scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql)）の引数名 **`p_stripe_event_id`, `p_checkout_session_id`, `p_payment_intent_id`, `p_product_key`, `p_report_instance_id`, `p_wallet_scope_user_id`, `p_user_ref_hash`, `p_quantity`** と **アプリ側 `db.rpc` のキーが一致**。 |
| **RPC error** | **`error` があると `throw`**（メッセージに依存 — **値は SSOT に書かない**）。 |
| **`data.status`** | **`parseM55ReplyTicketFulfillRpcRow`** で **`status` を検証**し型安全に返す。**想定外 status は throw**。 |

---

## 4. 限界（静的監査の境界）

- **実行時の分岐**（実際に dedupe が効いたか、RPC がどの status を返したか）は **ログ／DB／応答の観測なしでは断定しない**。  
- **本番 DB に RPC が同一シグネチャでデプロイ済みか**は **別 preflight / migration SSOT** で確認する。  

---

## 厳守事項（本監査・本ファイル作成）

- **コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret / 識別子全文 / dev log 全文の出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_RESULT_v1*
