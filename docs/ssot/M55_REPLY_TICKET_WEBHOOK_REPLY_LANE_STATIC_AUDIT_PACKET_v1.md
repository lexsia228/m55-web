# M55 追加相談返書 — Webhook route / Reply lane 静的監査パケット（v1）

**文書種別:** **`POST /api/stripe/webhook` → Reply lane → RPC** の **コードパスを読み取りのみで検証**する手順・観点・記録規約の SSOT  
**バージョン:** v1  

**前提（metadata）:** [`M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_RESULT_v1.md`](./M55_REPLY_TICKET_STRIPE_EVENT_METADATA_CHECK_RESULT_v1.md)  
**親トリアージ:** [`M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_200_DB_FULFILLMENT_NOT_OBSERVED_TRIAGE_GATE_v1.md)

**厳守:** **監査のみ**。**コード変更・webhook 再送・SQL・DB 更新はしない**。

---

## 監査対象ファイル（主）

| パス | 役割 |
|------|------|
| [`app/api/stripe/webhook/route.ts`](../../app/api/stripe/webhook/route.ts) | 署名検証、`stripe_events` dedupe、`checkout.session.completed` 振り分け |
| [`lib/m55/reply/replyTicketWebhookLane.ts`](../../lib/m55/reply/replyTicketWebhookLane.ts) | Reply lane STOP / RPC 呼び出し / 応答 |
| [`lib/m55/reply/replyTicketFulfillmentRpc.ts`](../../lib/m55/reply/replyTicketFulfillmentRpc.ts) | `getSupabaseAdmin().rpc(...)` 引数名・パース |
| 必要に応じて | [`lib/m55/reply/replyTicketCheckoutConstants.ts`](../../lib/m55/reply/replyTicketCheckoutConstants.ts)（metadata キー・`ADDITIONAL_REPLY_TICKET_PRODUCT_KEY`） |

---

## 1. このパケットの目的

| 観点 | 内容 |
|------|------|
| **位置づけ** | **Stripe 側 metadata 欠落の可能性が下がったあと**、**アプリ側分岐**を静的に分解する。 |
| **ゴール** | **Webhook 200 だが DB 反映が見えない**状況の **原因候補**（dedupe・別レーン・Reply lane STOP・RPC エラー等）を **コード根拠つきで列挙**する。 |
| **境界** | **監査のみ**。**実装変更は別ゲート**。 |

---

## 2. `route.ts` で見ること

| # | 観点 | 読み取りのヒント |
|---|------|------------------|
| 1 | **正規ルート** | エントリは **`POST` `/api/stripe/webhook`**（`middleware` の許可パスと整合）。 |
| 2 | **global dedupe（Reply lane より前）** | **`stripe_events` に同一 `event.id` が既にあると `200 { received: true }` で即 return** — **同一 event の replay は Reply lane に到達しない**。 |
| 3 | **`checkout.session.completed` の分岐** | `handleCheckoutCompleted` に入った後の **`mode` / `subscription` / metadata `product_key`** の順序。 |
| 4 | **Reply lane と DTR fulfillment の順序** | **`session.mode === 'payment'`** かつ **`metadata.product_key`（または `REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey`）が `ADDITIONAL_REPLY_TICKET_PRODUCT_KEY`** のとき **`handleReplyTicketCheckoutCompleted` が先に呼ばれ**、**DTR one-time lane（`handleCheckoutCompletedOneTime`）には入らない**。 |
| 5 | **`payment_intent.succeeded`** | **追加相談返書の直接付与は `checkout.session.completed` 経由**；**`payment_intent.succeeded` を付与トリガにしていないか**を確認。 |
| 6 | **`client_reference_id` 欠損** | **`handleCheckoutCompleted` 冒頭で `userId` が無いと `200` + internal failure 記録パス** — **Reply lane には進まない**（Reply lane 側でも再度要求）。 |
| 7 | **`mode !== 'payment'`** | **200 で早期 return** — Reply lane 対象外。 |
| 8 | **2xx と内部 skip** | **ハンドラが `200` を返していても DB 更新なし**がありうる（別レーン・dedupe・Reply lane の `no_op` 系 200 等）。 |

---

## 3. `replyTicketWebhookLane.ts` で見ること

| # | 観点 |
|---|------|
| 1 | **`event.id`** 欠損 → **400**（RPC なし） |
| 2 | **`product_key` mismatch** → **400**（ログに event/session id が出る運用 — **監査メモは値を転記しない**） |
| 3 | **`report_instance_id`** 欠損 / 不正 UUID → **400** |
| 4 | **`client_reference_id`（wallet_scope_user_id）** 空 → **400** |
| 5 | **`user_ref_hash`** — metadata から読み取り、**RPC に `p_user_ref_hash` として渡す（null 可）** |
| 6 | **`payment_intent`** — **`session.payment_intent` が string のときのみ RPC に渡す**（オブジェクト展開は別検証） |
| 7 | **RPC 到達条件** — 上記 STOP をすべて通過後 **`callM55ReplyTicketFulfillCheckoutEvent`** |
| 8 | **RPC 戻り値ごとの HTTP** — `processed` / `duplicate_noop` → **200**；`skipped_cap` → **200**；`rejected_*` → **200** + `no_op: true`（いずれも **DB 変化なしがありうる**） |
| 9 | **RPC throw** — `replyTicketFulfillmentRpc` が **throw** した場合は **`switch` に届かず** route 側で **500 になりうる**（`route.ts` の後続 `stripe_events` insert との関係も確認） |

---

## 4. `replyTicketFulfillmentRpc.ts` で見ること

| # | 観点 |
|---|------|
| 1 | **関数名** | **`db.rpc('m55_reply_ticket_fulfill_checkout_event', { ... })`** |
| 2 | **引数名（Postgres RPC 引数と対応）** | `p_stripe_event_id`、`p_checkout_session_id`、`p_payment_intent_id`、`p_product_key`、`p_report_instance_id`、`p_wallet_scope_user_id`、`p_user_ref_hash`、`p_quantity` |
| 3 | **エラー** | **`error` があれば `throw`** — **Stripe 側リトライ対象になりうる** |
| 4 | **`data` パース** | **`parseM55ReplyTicketFulfillRpcRow`** — 許容 **`status` 集合**と **`wallet_id` / `ledger_id` / counts / `reason`** |
| 5 | **未想定 status** | **`throw unexpected fulfill_status`**（Reply lane の `default` と整合） |

**DB 関数定義の完全一致**は **SQL / migration SSOT** と突き合わせる（本パケットは **アプリ側呼び出しの静的確認**）。

---

## 5. 監査で記録してよいもの

| フィールド | 型 |
|------------|-----|
| **`reply_lane_branch_exists`** | **true / false / unknown** |
| **`reply_lane_called_before_dtr_fulfillment`** | **true / false / unknown** |
| **`global_dedupe_can_short_circuit_before_reply_lane`** | **true / false / unknown** |
| **`reply_lane_stop_condition_found`** | **true / false / unknown**（コード上 **該当しうる STOP** を特定できたか） |
| **`rpc_function_name_matches`** | **true / false / unknown**（`m55_reply_ticket_fulfill_checkout_event`） |
| **`rpc_argument_names_match`** | **true / false / unknown** |
| **`rpc_result_status_observable`** | **true / false / unknown**（ログ／応答 JSON で **`fulfill_status` が観測しうるか**） |
| **`suspected_blocker`** | **短い非機密テキスト**（例: `stripe_events dedupe before handler`） |
| **`secret_exposed`** | **no** |

---

## 6. 記録禁止

- **secret / env 値**
- **raw `user_id`**
- **event / session / payment intent id 全文**
- **Checkout URL 全文**
- **report 本文 / 相談本文**
- **dev log 全文**

---

## 7. STOP 条件

監査実施中に以下へ逸脱したら **中断**する。

- **コード変更**しようとする
- **secret** を表示・転記しようとする
- **webhook 再送**しようとする
- **SQL 実行**しようとする
- **DB 手動 UPDATE** しようとする
- **duplicate replay** へ進もうとする
- **商品棚 UI** へ進もうとする

---

## 8. 現時点の判定（パケット単体）

| 項目 | 判定 |
|------|------|
| **static audit packet（本文書の作成）** | **GO** |
| **実監査（読解・記録）** | **別セッション・別承認** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**コード変更なし**。**SQL 実行なし**。**DB 更新なし**。**webhook 再送なし**。**追加決済なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_REPLY_LANE_STATIC_AUDIT_PACKET_v1*
