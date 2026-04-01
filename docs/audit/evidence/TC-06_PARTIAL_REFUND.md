# TC-06 Partial refund handling 証跡

## 実行条件
- TC-02 実施済み（entitlement が active の状態）
- Stripe Dashboard で一部返金実行可能

## 期待結果
- charge.refunded（amount_refunded < amount）受信
- 権限維持、revoke しない

## 実結果
| 項目 | 値 |
|------|-----|
| 実行日 | 2026-03-09 |
| 実装確認 | 済 |
| isFullRefund 判定 | L244-245: `amountRefunded >= amount` でなければ full refund 扱いしない |
| early return | L246-248: `!isFullRefund` で即 200、revoke 処理に入らない |
| 判定 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|
| E2E | TC-02 依存のため未実施 |

## 保存証跡
- `app/api/stripe/webhook/route.ts` L240-248（handleChargeRefunded 先頭）

## 未解決点
- E2E は TC-02 完了後に実施可能
