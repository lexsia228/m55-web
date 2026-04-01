# P1 TC-02〜TC-07 実行手順書 (2026-03-08)

- **正本:** stripe_go_live_test_checklist_2026_03_08
- **証跡保存:** `docs/audit/evidence/`
- **前提:** Test mode、Stripe CLI（webhook forward）、Supabase DB アクセス可能

---

## TC-02 One-time purchase happy path

### 実行条件
- ログイン済み（Clerk）
- STRIPE_PRICE_DTR_CORE_STATIC_V1 設定済み
- Stripe webhook が localhost または公開 URL に forward 済み

### 実行手順
1. `POST /api/purchase/checkout` に `{ productId: "DTR_CORE_STATIC_V1" }` を送信
2. リダイレクト先の Stripe Checkout で Test card `4242 4242 4242 4242` で決済完了
3. success page 表示 or `/dtr/core?post_purchase=1` redirect を確認
4. Supabase で以下を確認:
   - `one_time_fulfillments`: 1 件（checkout_session_id, payment_intent_id, event_id, user_id, product_id）
   - `entitlements`: user_id + DTR_CORE_STATIC_V1 + status=active
   - `entitlement_rights`: m55_p:core_origin

### 期待結果
- checkout.session.completed 受信後、one_time_fulfillments に 1 件
- entitlements status=active、entitlement_rights に m55_p:core_origin
- success page → /dtr/core redirect または delayed copy（webhook 遅延時）

### 実結果
| 項目 | 値 |
|------|-----|
| event_id | （記入） |
| checkout_session_id | （記入） |
| payment_intent_id | （記入） |
| 判定 | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-02_ONE_TIME_HAPPY_PATH.md`

### 未解決点
- （該当時のみ）

---

## TC-03 Replay / duplicate resistance

### 実行条件
- TC-02 実施済みまたは stripe trigger で checkout.session.completed を取得可能

### 実行手順
1. 同一 event_id を Stripe から 2 回送信（Resend または CLI で再送）
2. 両回とも 200 応答であること確認
3. `stripe_events`: 1 件のみ
4. `one_time_fulfillments`: 重複なし

### 期待結果
- 2 回目は 200、DB 重複なし（stripe_events の UNIQUE、one_time_fulfillments の冪等）

### 実結果
| 項目 | 値 |
|------|-----|
| 使用 event_id | （記入） |
| 1 回目 応答 | （記入） |
| 2 回目 応答 | （記入） |
| DB 重複 | なし / あり |
| 判定 | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-03_REPLAY_DUPLICATE_RESISTANCE.md`

### 未解決点
- （該当時のみ）

---

## TC-04 Payment truth guard

### 実行条件
- 実装確認（コードレビュー）＋ 必要に応じて payment_status !== paid の session で webhook をシミュレート

### 実行手順
1. `app/api/stripe/webhook/route.ts` で `stripe.checkout.sessions.retrieve` 呼出を確認
2. `payment_status !== 'paid'` の場合は権限付与しない実装を確認
3. failed_fulfillments に payment_status_not_paid を記録する実装を確認
4. （任意）payment_status=unpaid の session で checkout.session.completed を送信し、failed_fulfillments に挿入されることを確認

### 期待結果
- Session 再取得で payment_status を確認
- payment_status !== paid の場合は権限付与しない
- failed_fulfillments に payment_status_not_paid を記録

### 実結果
| 項目 | 値 |
|------|-----|
| 実装確認 | 済 / 未 |
| failed_fulfillments 挿入確認 | 済 / 未 |
| 判定 | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-04_PAYMENT_TRUTH_GUARD.md`

### 未解決点
- （該当時のみ）

---

## TC-05 Full refund handling

### 実行条件
- TC-02 実施済み（one_time_fulfillments に該当 payment_intent_id が存在）

### 実行手順
1. Stripe Dashboard で該当 PaymentIntent / Charge を検索
2. 全額返金を実行
3. charge.refunded イベント受信
4. Supabase で確認:
   - entitlements: status=revoked
   - entitlement_rights: m55_p:core_origin 削除

### 期待結果
- charge.refunded（amount_refunded >= amount）受信
- entitlements status=revoked、entitlement_rights から m55_p:core_origin 削除

### 実結果
| 項目 | 値 |
|------|-----|
| charge_id | （記入） |
| payment_intent_id | （記入） |
| amount / amount_refunded | （記入） |
| entitlements status | （記入） |
| entitlement_rights | 削除確認 |
| 判定 | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-05_FULL_REFUND.md`

### 未解決点
- （該当時のみ）

---

## TC-06 Partial refund handling

### 実行条件
- TC-02 実施済み（entitlement が active の状態）

### 実行手順
1. Stripe Dashboard で一部金額のみ返金（amount_refunded < amount）
2. charge.refunded イベント受信
3. entitlements: status=active 維持
4. entitlement_rights: m55_p:core_origin 維持

### 期待結果
- charge.refunded（amount_refunded < amount）受信
- 権限維持、revoke しない

### 実結果
| 項目 | 値 |
|------|-----|
| amount_refunded | （記入） |
| amount | （記入） |
| 権限維持 | 確認 |
| 判定 | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-06_PARTIAL_REFUND.md`

### 未解決点
- （該当時のみ）

---

## TC-07 Failed fulfillment / manual recovery drill

### 実行条件
- Stripe webhook forward 済み
- client_reference_id なしの Checkout を作成可能、または productId を未対応に変更可能

### 実行手順
1. **missing_client_reference_id**: client_reference_id を空にして Checkout をトリガー（API 改修一時的か、別ルートで作成）
2. **product_mismatch**: metadata.productId を ALLOWED 外（例: UNKNOWN_PRODUCT）に変更して Checkout
3. **payment_status_not_paid**: TC-04 で検証済みの場合、failed_fulfillments に payment_status_not_paid が記録されることを確認
4. 各ケースで failed_fulfillments に 1 件挿入
5. Stripe Dashboard で checkout_session_id 検索可能であることを確認
6. 手動復旧手順（PAYMENT_FULFILLMENT_SSOT 参照）の確認

### 期待結果
| failure_reason | failed_fulfillments 挿入 | 確認方法 |
|----------------|---------------------------|----------|
| missing_client_reference_id | 要 | Webhook で client_reference_id 空 → 挿入 |
| product_mismatch | 要 | metadata.productId が ALLOWED 外 → 挿入 |
| payment_status_not_paid | 要 | Session 再取得で payment_status !== paid → 挿入 |

### 実結果
| failure_reason | 挿入確認 | 判定 |
|----------------|----------|------|
| missing_client_reference_id | （記入） | 未実行 / PASS / FAIL |
| product_mismatch | （記入） | 未実行 / PASS / FAIL |
| payment_status_not_paid | （記入） | 未実行 / PASS / FAIL |

### 保存証跡
`docs/audit/evidence/TC-07_FAILED_FULFILLMENT_MANUAL_RECOVERY.md`

### 未解決点
- （該当時のみ）
