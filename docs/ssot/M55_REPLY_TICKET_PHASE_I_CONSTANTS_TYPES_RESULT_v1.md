# M55_REPLY_TICKET_PHASE_I_CONSTANTS_TYPES_RESULT_v1

Status: **Phase I（定数・型のみ）の実装結果証跡。** **Checkout／Webhook／DB／UI は未着手。**  

Recorded: **2026-04-28**

Upstream:

- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_IMPLEMENTATION_READINESS_v1.md`
- `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`

---

## 1. 変更ファイル一覧

| 種別 | パス |
|------|------|
| 新規 | `lib/m55/reply/replyTicketCheckoutConstants.ts` |
| 新規 | `docs/ssot/M55_REPLY_TICKET_PHASE_I_CONSTANTS_TYPES_RESULT_v1.md`（本条） |

**変更なし:** `lib/m55/reply/constants.ts`（既存 `purchase_grant`／`PURCHASE` は元から定義済みのため、その型を新ファイルから参照）。

---

## 2. 追加した product_key

| 定数名 | 値 |
|--------|-----|
| `ADDITIONAL_REPLY_TICKET_PRODUCT_KEY` | `additional_reply_ticket` |

型: `AdditionalReplyTicketProductKey`

---

## 3. 追加した cap／quantity 定数

| 定数名 | 値 |
|--------|-----|
| `REPLY_TICKET_TOTAL_CAP_PER_REPORT` | `5` |
| `REPLY_TICKET_INCLUDED_COUNT` | `1` |
| `REPLY_TICKET_ADDITIONAL_MAX_PURCHASED` | `4` |
| `REPLY_TICKET_PURCHASE_QUANTITY` | `1` |

---

## 4. metadata key

`REPLY_TICKET_CHECKOUT_METADATA_KEYS` オブジェクト:

- `productKey` → `'product_key'`
- `reportInstanceId` → `'report_instance_id'`
- `userRefHash` → `'user_ref_hash'`
- `userIdHash` → `'user_id_hash'`
- `quantity` → `'quantity'`

---

## 5. error code

`REPLY_TICKET_CHECKOUT_ERROR_CODES`（順不同の列挙）:

- `unauthenticated`
- `forbidden_not_owner`
- `wallet_not_found`
- `wallet_not_active`
- `cap_reached`
- `invalid_product`
- `stripe_error`

型: `ReplyTicketCheckoutErrorCode`

---

## 6. Ledger: event_type / source_of_grant（CHECK 整合）

| 定数名 | 値 | 備考 |
|--------|-----|------|
| `REPLY_TICKET_PURCHASE_LEDGER_EVENT_TYPE` | `purchase_grant` | `WalletLedgerEventType` の部分型 |
| `REPLY_TICKET_PURCHASE_SOURCE_OF_GRANT` | `PURCHASE` | `WalletSourceOfGrant` の部分型 |

---

## 7. DTR 経路に触っていないこと

| 対象 | 変更 |
|------|------|
| `app/api/purchase/checkout/route.ts` | **無** |
| `app/api/stripe/webhook/route.ts` | **無** |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | **無** |
| `lib/oneTimeCheckout.ts`（`ALLOWED_ONE_TIME_PRODUCTS`） | **無** |

**`additional_reply_ticket` を DTR one-time 許可集合に混ぜていない。** `fulfillDtrCoreFromCheckoutSessionId` に Reply を流す変更は **無**。

---

## 8. Checkout／Webhook／API／UI／DB は未実装

- **Checkout API route:** 未作成  
- **Webhook 分岐:** 未変更  
- **SQL／RPC／migration／DB 更新:** **無**  
- **Stripe Dashboard／env 値:** **無**  
- **商品棚 UI:** **無**

---

## 9. 次のゲート

**Phase II:** Checkout API skeleton の **設計確定 → 実装**（別 PR／別承認）。`POST /api/reply-tickets/checkout` の骨格と、DTR route への **誤流入防止**（import／分岐ともに分離維持）。

---

## 10. CHANGELOG — v1

- 初版: Phase I `replyTicketCheckoutConstants.ts` と本証跡。
