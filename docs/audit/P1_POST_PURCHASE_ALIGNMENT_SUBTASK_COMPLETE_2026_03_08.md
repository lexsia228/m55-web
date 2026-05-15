# P1 Post-Purchase Alignment サブタスク完了記録 (2026-03-08)

- **サブタスク:** post-purchase alignment（出口整合）
- **状態:** 完了
- **正本:** post_purchase_alignment_ssot_2026_03_08
- **実装レポート:** `docs/reports/P1_ONE_TIME_FULFILLMENT_EXIT_ALIGNMENT_2026_03_08.md`

---

## 完了内容

| 項目 | 状態 |
|------|------|
| Success page の Checkout Session + entitlement 分岐 | 完了（Session 再取得・one-time lane 検証）|
| Happy path / delayed access copy 分岐 | 完了 |
| Receipt-facing wording（Stripe payment_intent_data.description） | 完了 |
| Support URL 実URL表示 | 完了 |
| recoveryRef（session_id）表示 | 完了 |
| statement descriptor 別管理維持 | 維持（変更なし）|
| Webhook を fulfillment truth-source に維持 | 維持 |
| public/storefront freeze | 維持 |
| subscription lane | 未着手（変更なし）|

---

## Backlog（未実装・記録のみ）

| # | 項目 | 備考 |
|---|------|------|
| 1 | ALLOWED_ONE_TIME_PRODUCTS の shared import 化 | webhook と lib/oneTimeCheckout.ts の重複解消。将来対応。 |

---

## 未解決メモ

| # | 内容 |
|---|------|
| 1 | **client_reference_id=userId** の未ログイン・セッション切れ・アカウント切替時挙動: Checkout 開始時に userId を client_reference_id に渡すが、決済完了時点でログアウト／セッション切れ／他アカウントに切替えていた場合の挙動は未検証。Webhook は client_reference_id をそのまま user_id として使用するため、誤紐づけの可能性あり。要検証。 |
