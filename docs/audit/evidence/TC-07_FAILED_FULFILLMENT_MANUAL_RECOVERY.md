# TC-07 Failed fulfillment / manual recovery drill 証跡

## 実行条件
- Stripe webhook forward 済み
- client_reference_id なし／product_mismatch／payment_status_not_paid の各ケースをトリガー可能

## 期待結果
| failure_reason | failed_fulfillments 挿入 | 確認方法 |
|----------------|---------------------------|----------|
| missing_client_reference_id | 要 | L101-104 |
| product_mismatch | 要 | L129-132 |
| payment_status_not_paid | 要 | L177-179 |

## 実結果
| 項目 | 値 |
|------|-----|
| 実行日 | 2026-03-09 |
| missing_client_reference_id | L101-104: insertFailedFulfillment(db, event.id, session.id, 'missing_client_reference_id', ...) |
| product_mismatch | L129-132: insertFailedFulfillment(db, event.id, session.id, 'product_mismatch', ...) |
| payment_status_not_paid | L177-179: insertFailedFulfillment(db, event.id, session.id, 'payment_status_not_paid', ...) |
| insertFailedFulfillment 実装 | L137-148: failed_fulfillments に event_id, checkout_session_id, failure_reason, raw_metadata 挿入 |
| 判定 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| E2E | Stripe CLI trigger または Checkout 改修で検証可能（未実施）|

## 保存証跡
- `app/api/stripe/webhook/route.ts` L101-104, L129-132, L177-179, L137-148
- PAYMENT_FULFILLMENT_SSOT_CANDIDATE（手動復旧手順）

## 未解決点
- missing_client_reference_id: Checkout API は client_reference_id 必須のため、Stripe Dashboard 直接作成等で検証が必要
