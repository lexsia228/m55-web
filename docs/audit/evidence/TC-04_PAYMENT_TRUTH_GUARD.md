# TC-04 Payment truth guard 証跡

## 実行条件
- 実装確認（コードレビュー）
- 任意: payment_status !== paid の session で webhook シミュレート

## 期待結果
- Session 再取得（stripe.checkout.sessions.retrieve）で payment_status を確認
- payment_status !== 'paid' の場合は権限付与しない
- failed_fulfillments に payment_status_not_paid を記録

## 実結果
| 項目 | 値 |
|------|-----|
| 実行日 | 2026-03-09 |
| Session 再取得 | L169: `freshSession = await stripe.checkout.sessions.retrieve(session.id)` |
| payment_status 判定 | L176-180: `paymentStatus !== 'paid'` で early return、insertFailedFulfillment 呼出 |
| failed_fulfillments 挿入 | L178: `insertFailedFulfillment(db, event.id, session.id, 'payment_status_not_paid', ...)` |
| 判定 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|

## 保存証跡
- `app/api/stripe/webhook/route.ts` L167-181（handleCheckoutCompletedOneTime 先頭）
- `app/api/stripe/webhook/route.ts` L137-148（insertFailedFulfillment）

## 未解決点
- なし
