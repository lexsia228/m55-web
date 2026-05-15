# PAYMENT_FULFILLMENT_SSOT Candidate v1 (2026-03-08)

**Status:** CANDIDATE (draft, not yet ACTIVE SSOT)  
**Territory:** One-time Checkout fulfillment lane only. Subscription/invoice lane unchanged.  
**Purpose:** Canonical rules for mode=payment webhook handling, refund policy, truth-source check, and manual recovery.

---

## 1. Refund Rule (Full / Partial)

| 種別 | 条件 | 扱い |
|------|------|------|
| **Full refund** | `amount_refunded >= amount` | 権限を revoke。entitlements.status='revoked'、entitlement_rights から該当 right 削除 |
| **Partial refund** | `amount_refunded < amount` | 権限は維持。revoke しない |
| **Subscription refund** | one_time_fulfillments に該当なし | 200 で無視（invoice lane は本 SSOT 対象外） |

実装: `charge.refunded` 受信時に `amount` と `amount_refunded` を比較。full の場合のみ revoke を実行。

---

## 2. checkout.session.completed: Truth-Source 確認強化

イベント payload の `payment_status` は信頼しない。必ず Stripe API で Session を再取得し、その値を truth source とする。

```
1. event.data.object から session を取得
2. stripe.checkout.sessions.retrieve(session.id) で再取得
3. freshSession.payment_status === 'paid' を確認
4. 成立時のみ権限付与
```

- 再取得失敗 → 500（Stripe API 障害）
- payment_status !== 'paid' → 200（unpaid/abandoned/expired）、failed_fulfillments に記録

---

## 3. Manual Recovery Path（client_reference_id 欠落・product mismatch）

| failure_reason | 意味 | manual recovery queue |
|----------------|------|------------------------|
| `missing_client_reference_id` | client_reference_id が空 | failed_fulfillments に挿入 |
| `product_mismatch` | product_id が ALLOWED_ONE_TIME_PRODUCTS に含まれない | failed_fulfillments に挿入 |
| `payment_status_not_paid` | 再取得後も payment_status !== 'paid' | failed_fulfillments に挿入 |

**Manual recovery 手順（運用者向け）:**

1. `failed_fulfillments` を定期確認（例: 日次）
2. Stripe Dashboard で `checkout_session_id` を検索し、支払い・顧客を確認
3. `missing_client_reference_id`: Checkout 作成時に client_reference_id が渡されなかった可能性。顧客メール等で user_id を特定し、手動で entitlements / entitlement_rights を挿入
4. `product_mismatch`: 商品が未対応の場合、運用ポリシーに従い対応（追加実装 or 返金案内）
5. `payment_status_not_paid`: 決済未完・放棄等。通常は手動対応不要。必要なら顧客に連絡

---

## 4. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `supabase/migrations/20260308000000_one_time_checkout_fulfillment.sql` | one_time_fulfillments, failed_fulfillments |
| `app/api/stripe/webhook/route.ts` | 実装 |
| `docs/audit/M55_ONE_TIME_CHECKOUT_FULFILLMENT_SPEC_2026-03-08.md` | 詳細仕様 |

---

## 5. 昇格条件（ACTIVE SSOT への移行時）

- [ ] 通し確認（Test mode 購入 → fulfillment → 返金）が完了
- [ ] failed_fulfillments の運用フローが確定
- [ ] チーム承認
