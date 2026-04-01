# M55 One-time Checkout Fulfillment Spec (2026-03-08)

**参照:** PAYMENT_FULFILLMENT_SSOT_CANDIDATE_v1_2026-03-08.md

## 追加/変更ファイル一覧

| ファイル | 種別 |
|----------|------|
| `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` | 新規 |
| `app/api/stripe/webhook/route.ts` | 変更 |
| `docs/ssot/PAYMENT_FULFILLMENT_SSOT_CANDIDATE_v1_2026-03-08.md` | 新規 |
| `docs/audit/M55_ONE_TIME_CHECKOUT_FULFILLMENT_SPEC_2026-03-08.md` | 本ファイル |

---

## 1. Refund Rule (Full / Partial) — 明文化

| 種別 | 条件 | 扱い |
|------|------|------|
| Full | amount_refunded >= amount | 権限 revoke |
| Partial | amount_refunded < amount | 権限維持、revoke しない |

---

## 2. checkout.session.completed: Truth-Source 確認強化

- イベント payload の payment_status は使わない
- `stripe.checkout.sessions.retrieve(session.id)` で再取得
- `freshSession.payment_status === 'paid'` を確認してから権限付与

---

## 3. Manual Recovery Path

| failure_reason | 200 応答時 |
|----------------|------------|
| missing_client_reference_id | failed_fulfillments に挿入必須 |
| product_mismatch | failed_fulfillments に挿入必須 |
| payment_status_not_paid | failed_fulfillments に挿入必須 |

運用: failed_fulfillments を定期確認し、Stripe Dashboard と突き合わせて手動対応。

---

## イベントフロー要約

### checkout.session.completed (one-time lane)

```
→ 署名検証
→ stripe_events に event_id 存在? → 200 (replay)
→ session.subscription あり? → subscription lane
→ session.mode !== 'payment'? → 200
→ client_reference_id なし? → failed_fulfillments 挿入 → 200
→ product_id が ALLOWED 外? → failed_fulfillments 挿入 → 200
→ stripe.checkout.sessions.retrieve(session.id)
→ payment_status !== 'paid'? → failed_fulfillments 挿入 → 200
→ one_time_fulfillments に存在? → 200 (duplicate)
→ one_time_fulfillments 挿入 / entitlements upsert / entitlement_rights upsert
→ 200
```

### charge.refunded (one-time lane)

```
→ amount_refunded >= amount? (full refund) でなければ → 200
→ payment_intent_id で one_time_fulfillments 検索
→ 該当なし? → 200
→ entitlements status=revoked / entitlement_rights 削除
→ 200
```

---

## エラーパス一覧

| 条件 | 挙動 | HTTP |
|------|------|------|
| STRIPE_WEBHOOK_SECRET 未設定 | 503 |
| 署名検証失敗 | Invalid signature | 400 |
| event_id 重複 | 200 |
| client_reference_id なし | failed_fulfillments 挿入 → 200 |
| product_mismatch | failed_fulfillments 挿入 → 200 |
| payment_status !== paid | failed_fulfillments 挿入 → 200 |
| session 再取得失敗 | 500 |
| DB 失敗 | 500 |
| partial refund | 200（revoke しない） |

---

## 通し確認手順

1. `supabase db push`
2. Stripe Webhook: checkout.session.completed, charge.refunded
3. Test mode 購入 → one_time_fulfillments / entitlements / entitlement_rights 確認
4. 全額返金 → status=revoked 確認
5. 一部返金 → 権限維持確認
6. 冪等: 同一 event 再送 → 200、DB 変更なし
