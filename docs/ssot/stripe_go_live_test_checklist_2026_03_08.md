# Stripe Go-Live Test Checklist (2026-03-08)

- **Canonical ID:** stripe_go_live_test_checklist_2026_03_08
- **State:** ACTIVE
- **Note:** This file is the repo-backed mirror of the canonical checklist. Do not redefine TC numbering or scope locally.

**Territory:** One-time card-based lane evidence phase  
**Purpose:** Canonical test cases for one-time fulfillment verification. Subscription lane out of scope.  
**Evidence レポート:** `docs/audit/M55_ONE_TIME_FULFILLMENT_EVIDENCE_REPORT_2026-03-08.md`

---

## TC-02 One-time purchase happy path

- ログイン済みで Checkout 開始 → 決済完了（Test card 4242 4242 4242 4242）
- checkout.session.completed 受信後、one_time_fulfillments に 1 件
- entitlements status=active、entitlement_rights に m55_p:core_origin
- checkout_session_id / payment_intent_id / event_id を記録

---

## TC-03 Replay / duplicate resistance

- 同一 event_id を 2 回送信 → 2 回目は 200、DB 重複なし
- 同一 checkout_session_id で 2 回処理試行 → 冪等、1 件のみ

---

## TC-04 Payment truth guard

- Session 再取得（stripe.checkout.sessions.retrieve）で payment_status を確認
- payment_status !== 'paid' の場合は権限付与しない
- failed_fulfillments に payment_status_not_paid を記録

---

## TC-05 Full refund handling

- charge.refunded（amount_refunded >= amount）受信
- entitlements status=revoked、entitlement_rights から m55_p:core_origin 削除

---

## TC-06 Partial refund handling

- charge.refunded（amount_refunded < amount）受信
- 権限維持、revoke しない

---

## TC-07 Failed fulfillment / manual recovery drill

- missing_client_reference_id → failed_fulfillments 挿入
- product_mismatch → failed_fulfillments 挿入
- Stripe Dashboard で checkout_session_id 検索可能
- 手動復旧手順の確認
