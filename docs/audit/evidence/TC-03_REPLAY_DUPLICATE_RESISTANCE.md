# TC-03 Replay / duplicate resistance 証跡

## 実行条件
- TC-02 実施済みまたは stripe trigger で checkout.session.completed を取得可能
- 同一 event を 2 回送信可能な環境

## 期待結果
- 同一 event_id 2 回送信 → 2 回目は 200、stripe_events に 1 件のみ
- 同一 checkout_session_id で 2 回処理試行 → 冪等、1 件のみ

## 実結果
| 項目 | 値 |
|------|-----|
| 実行日 | 2026-03-09 |
| 実装確認 | 済 |
| stripe_events UNIQUE 制約 | L49-56: existing 時 200 返却、重複 insert 時 23505 で 200 |
| one_time_fulfillments 冪等 | L188-191: existingFulfillment 時 200 返却 |
| 判定 | **IMPLEMENTATION PASS / EVIDENCE PENDING**（実装確認済み、runtime evidence 未取得）|

## 保存証跡
- `app/api/stripe/webhook/route.ts` L49-56（stripe_events 冪等）
- `app/api/stripe/webhook/route.ts` L188-191（one_time_fulfillments 冪等）

## 未解決点
- なし
