# TC-05 Full refund handling 証跡

## 実行条件
- TC-02 実施済み（one_time_fulfillments に該当 payment_intent_id が存在）
- Stripe Dashboard で全額返金実行可能

## 期待結果
- charge.refunded（amount_refunded >= amount）受信
- entitlements status=revoked、entitlement_rights から m55_p:core_origin 削除

## 実結果
| 項目 | 値 |
|------|-----|
| 実行日 | 2026-03-09 |
| 実装確認 | 済 |
| isFullRefund 判定 | L244-245: `amountRefunded >= amount` |
| one_time_fulfillments 紐づけ | L253-255: payment_intent_id で fulfillment 取得 |
| entitlements revoke | L261: `update({ status: 'revoked' })` |
| entitlement_rights 削除 | L265-267: `delete().eq('right_key', DTR_CORE_RIGHT_KEY)` |
| 判定 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| E2E | TC-02 依存のため未実施 |

## 保存証跡
- `app/api/stripe/webhook/route.ts` L240-276（handleChargeRefunded）

## 未解決点
- E2E は TC-02 完了後に実施可能
