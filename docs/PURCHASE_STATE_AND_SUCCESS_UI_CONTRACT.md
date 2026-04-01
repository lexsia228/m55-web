# PURCHASE_STATE_AND_SUCCESS_UI_CONTRACT.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
Success 画面を fulfillment truth にせず、display / polling only の状態面として定義する。

## Non-negotiable rule
Webhook + DB write = business truth
Success page = display / polling only

## Required states
| state | definition | allowed UI copy style | forbidden implication |
|---|---|---|---|
| checkout_initiated | checkout へ遷移した | processing / starting checkout | access already granted |
| payment_processing | payment submitted | payment received, confirming | entitlement already written |
| webhook_pending | waiting for settlement confirmation | system is confirming your purchase | immediate guaranteed access |
| entitlement_confirmed | DB-side entitlement written | access/credits ready | none |
| delayed_confirmation | longer than normal wait | still confirming, please wait or contact support | silent failure |
| support_needed | manual review needed | support can help resolve this | automatic completion promised |

## Copy guardrails
Allowed:
- 購入完了を確認中です
- システムが権限を同期しています
- 確認に少し時間がかかる場合があります
- 問題が続く場合はサポートへ

Forbidden:
- 付与完了を success 画面だけで断定する
- ページ表示 = settlement success とみなす
- webhook 未確認なのに「利用可能です」と書く

## Polling behavior
- bounded polling only
- clear state transition to support-needed if threshold exceeded
- no frontend-only truth invention

## Related (QA)
- `docs/qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md` — `/purchase/success` 最終確認手順（実装準拠）
