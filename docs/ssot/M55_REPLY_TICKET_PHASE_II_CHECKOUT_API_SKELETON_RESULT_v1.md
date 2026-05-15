# M55_REPLY_TICKET_PHASE_II_CHECKOUT_API_SKELETON_RESULT_v1

Status: **Phase II — Checkout API skeleton（`/api/reply-tickets/checkout`）実装結果。** Webhook／Dashboard／商品棚／env ファイルの変更なし。**  

Recorded: **2026-04-28**

Upstream:

- `docs/ssot/M55_REPLY_TICKET_PHASE_I_CONSTANTS_TYPES_RESULT_v1.md`
- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`
- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_IMPLEMENTATION_READINESS_v1.md`

---

## 1. 変更ファイル一覧

| 種別 | パス |
|------|------|
| 変更 | `lib/m55/reply/replyTicketCheckoutConstants.ts`（エラー列挙に **`invalid_request`** を追加） |
| 新規 | `lib/m55/reply/replyTicketCheckoutValidate.ts` |
| 新規 | `app/api/reply-tickets/checkout/route.ts` |
| 新規 | `docs/ssot/M55_REPLY_TICKET_PHASE_II_CHECKOUT_API_SKELETON_RESULT_v1.md`（本条） |

---

## 2. 作成した route

| Method / Path | ファイル |
|---------------|----------|
| `POST /api/reply-tickets/checkout` | `app/api/reply-tickets/checkout/route.ts` |

---

## 3. Validation 内容

| ステップ | 内容 |
|----------|------|
| 認証 | **Clerk `auth()`** — 無ければ **`unauthenticated`（401）** |
| JSON body | 不正パース時 **`invalid_request`** |
| 入力 | **`validateReplyTicketCheckoutBody`** — `report_instance_id`（必須・非空）、`product_key`（必須） |
| product | **`additional_reply_ticket` のみ**許可 — それ以外 **`invalid_product`** |
| 所有権 | **`dtr_report_snapshots`** を **`id` + `user_id`** で照合 — 不一致 **`forbidden_not_owner`** |
| wallet | **`reply_ticket_wallets`** を **`user_id` で maybeSingle** — 無し **`wallet_not_found`**、`status !== active` は **`wallet_not_active`** |
| cap | **`initial_included_count + purchased_count >= 5`** または **`purchased_count >= 4`** で **`cap_reached`** |

---

## 4. Stripe Checkout Session 作成をどこまで実装したか

| 項目 | 内容 |
|------|------|
| 実装 | **`stripe.checkout.sessions.create`** を **サーバー単体**で実行。**`mode: payment`**、**quantity 1**、`client_reference_id` は Clerk **`userId`**。**metadata** は Phase I のキー名定数と **`hashUserIdForLedgerLog(userId)`**（**生 user id は metadata に載せない**）。 |
| Price | 環境変数 **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** の**名前のみ**コード参照。**値は出力・ログに含めない**。未設定時は **503**、`code: **stripe_error**`。 |
| success/cancel URL | **`/reply?checkout=complete|cancelled`** に `session_id` プレースホルダ（**DTR `/dtr/processing` には接続しない**）。 |
| メール | Clerk `currentUser()` から **prefill**（任意）。 |

**注:** 本番で決済を有効にするには **Dashboard に Price を作成し env を設定**する必要があるが、**本条のスコープ外**（Dashboard／`.env` は未コミット）。

---

## 5. DTR 経路に触っていないこと

次のファイルは **変更していない**（`git status` 上も未変更）:

- `app/api/purchase/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/oneTimeCheckout.ts`
- `lib/m55/dtrCoreCheckoutFulfillment.ts`

**`ALLOWED_ONE_TIME_PRODUCTS` に Reply を追加していない。** **`fulfillDtrCoreFromCheckoutSessionId` は未使用。**

---

## 6. Typecheck 結果

- コマンド: **`npx tsc --noEmit`**
- 結果: **exit code 0**（対象実装時点）

---

## 7. Webhook／UI／Dashboard／env は未変更であること

| 区分 | 状態 |
|------|------|
| Webhook route | **無変更** |
| 商品棚 UI | **無変更** |
| Stripe Dashboard | **無変更（リポ外）** |
| env ファイル／秘密のコミット | **無し**（**変数名のみ**コードに登場） |

---

## 8. 次の候補ゲート

1. **Webhook で `checkout.session.completed` の Reply レーン分岐**（DTR fulfill へ流入させない）と **`stripe_processed_events`／wallet／ledger** の transaction 実装。
2. **Checkout 仕上げ:** `client_reference_id`／redirect 先の製品確定、Webhook との **metadata 契約**固定。

---

## 9. CHANGELOG — v1

- 初版: Phase II route + `replyTicketCheckoutValidate` + `invalid_request` 拡張、Stripe create 条件付き実装、DTR 未接触の記録。
