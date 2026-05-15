# M55 追加相談返書 — Webhook Reply lane RPC call 最小実装 結果 SSOT（v1）

**文書種別:** 実装完了証跡（コード・本番運用ガードの記録）  
**バージョン:** v1  
**前提ゲート:** [`M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_GATE_v1.md`](./M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_GATE_v1.md)

---

## 1. 変更ファイル一覧

| パス | 内容 |
|------|------|
| `lib/m55/reply/replyTicketFulfillmentRpc.ts` | **新規** — `getSupabaseAdmin().rpc('m55_reply_ticket_fulfill_checkout_event', …)` ラッパー、戻り値パース・型 |
| `lib/m55/reply/replyTicketWebhookLane.ts` | skeleton から **`handleReplyTicketCheckoutCompleted`**（非同期）、STOP 判定・ステータス別 HTTP |
| `app/api/stripe/webhook/route.ts` | Reply 分岐のみ **`handleReplyTicketCheckoutCompleted` 呼び出し**に差し替え（import 名変更・呼び出し先変更） |
| `docs/ssot/M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_RESULT_v1.md` | **本証跡** |

**変更していないファイル（確認）**

- `app/api/purchase/checkout/route.ts`
- `lib/oneTimeCheckout.ts`
- `lib/m55/dtrCoreCheckoutFulfillment.ts`
- `app/api/reply-tickets/checkout/route.ts`
- SQL / migration / RPC 定義ファイル
- ALLOWED_ONE_TIME_PRODUCTS（`webhook/route.ts` 内セットに `additional_reply_ticket` を追加していない）

---

## 2. RPC 呼び出し実装内容

- **呼び出し:** `getSupabaseAdmin() as any` 経由で `db.rpc('m55_reply_ticket_fulfill_checkout_event', { … })`（生成型未定義 RPC のため `reply/generate` と同様に `any`）。
- **引数マッピング:**
  - `p_stripe_event_id` ← `event.id`
  - `p_checkout_session_id` ← `session.id`
  - `p_payment_intent_id` ← `session.payment_intent` が **string のときのみ**、それ以外は `null`
  - `p_product_key` ← `additional_reply_ticket`（メタデータ厳密一致後のみ呼び出し）
  - `p_report_instance_id` ← メタデータ `report_instance_id`（検証済み UUID 形状）
  - `p_wallet_scope_user_id` ← `session.client_reference_id`（Checkout で設定している Clerk `userId` と整合。**生のユーザー ID はログやレスポンスに含めない**）
  - `p_user_ref_hash` ← `metadata.user_ref_hash`（空は `null`）
  - `p_quantity` ← **固定 `1`**
- **Fulfillment の副作用:** アプリ側では **wallet / ledger / stripe_processed_events を直接更新しない**（すべて RPC 内）。

---

## 3. event.id / report_instance_id STOP 方針

- **`event.id` 欠損・空:** **RPC を呼ばず** HTTP **400**（skeleton の「received だけ返す」挙動は廃止）。
- **`metadata.report_instance_id` 欠損・空:** 同様に **STOP / 400**。
- **UUID として不適な `report_instance_id`（緩い hex 8-4-4-4-12 チェック）:** **STOP / 400**（無効値で RPC に投げない）。
- **`product_key !== additional_reply_ticket`:** Reply ハンドラ内の defence in depth で **STOP / 400**（通常は親分岐でのみ入室）。
- **`client_reference_id` 欠損:** **STOP / 400**（Checkout 実装との整合。親ハンドラで先に拒否されるケースがあり得るが、lane 内でも必須化）。

---

## 4. RPC status 別応答方針

| RPC `status` | HTTP |
|--------------|------|
| `processed` | 200、`lane: reply_ticket`、`fulfill_status` |
| `duplicate_noop` | 同上 |
| `skipped_cap` | 200 + **console.warn**（監視候補）、`fulfill_status` |
| `rejected_invalid_product` / `rejected_not_owner` / `rejected_wallet_inactive` | 200、`no_op: true`、`fulfill_status` + **console.warn** |
| PostgREST / RPC 伝搬エラー、予期しない `status`、`data` 形状異常 | **throw** → ルート側で **5xx** となり **Stripe retry 候補** |

---

## 5. DTR 汚染防止確認

- Reply lane は **`fulfillDtrCoreFromCheckoutSessionId` を呼ばない**。
- **`ALLOWED_ONE_TIME_PRODUCTS` に `additional_reply_ticket` は含めていない**（変更なし）。
- **DTR checkout / `oneTimeCheckout` / `dtrCoreCheckoutFulfillment` に diff なし**（`git diff` で確認）。
- **`payment_intent.succeeded`** を付与レーンに追加していない（既存コードのまま）。
- One-time メタ確認分岐により **`metadata.product_key === additional_reply_ticket` のときだけ** RPC lane に入る構成を維持。

---

## 6. Checkout API 原則未変更確認

- `app/api/reply-tickets/checkout/route.ts` に **変更なし**。  
  `client_reference_id`・メタデータキーは既存実装どおりであり、Webhook 側 `p_wallet_scope_user_id` はそれと整合。

---

## 7. Webhook で DB 直接更新なし確認

- Reply lane 内で **`reply_ticket_wallets` / `reply_wallet_ledgers` / `stripe_processed_events` に対する `.from().insert/update` は行っていない**。
- 既存どおり、`stripe_events` への INSERT は **共通 POST 処理**が **Reply 処理が成功（200）のあと**に実行されるフローを維持（Reply が 400/5xx の場合は従来ロジックどおり挿入されない／早期 return）。

---

## 8. typecheck / lint 結果

- **`npx tsc --noEmit`:** 終了コード **0**（エラーなし）。
- **`read_lints`（変更 TS ファイル）:** 指摘 **なし**。

---

## 9. まだ NO-GO であること

- **本番決済テスト**
- **商品棚 UI**
- **Stripe Dashboard / 本番 env の変更**
- **secret / Webhook secret / DB URL の出力**
- **実 Webhook による DB 更新を伴うスモーク**（別承認まで実施しない）

---

## 10. 次の候補

- **dry-run / モック**に基づく Reply lane の単体検証設計
- **test mode** での E2E / スモーク手順の SSOT 化
- 監視（`skipped_cap` / `rejected_*`）のダッシュボードまたはアラート条件の整理
- 本番決済テストは上記の後段・別ゲート

---

## 厳守事項（本タスクの範囲）

- 本 SSOT は **実装後の記録**であり、**秘密情報を含めない**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_RESULT_v1*
