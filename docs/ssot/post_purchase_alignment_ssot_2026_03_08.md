# Post-Purchase Alignment SSOT (2026-03-08)

**Canonical ID:** post_purchase_alignment_ssot_2026_03_08  
**State:** ACTIVE  
**Territory:** P1 one-time fulfillment lane only. Subscription lane unchanged.

---

## 1. Success Page 表示分岐

| 条件 | 表示 |
|------|------|
| entitlement 反映済み（status=active） | Happy path: redirect `/dtr/core?post_purchase=1` |
| entitlement 未反映 **かつ** session 検証成功（one-time lane 整合） | Delayed access: Reflect Report copy + QuietPolling + recoveryRef（session_id）+ support URL（実URL）|
| entitlement 未反映 **かつ** session 検証失敗 | 「セッションを確認できませんでした。サポートまでお問い合わせください。」+ support URL |

**分岐手順:** (1) session_id で Checkout Session を再取得し one-time lane（mode=payment, client_reference_id, productId）と矛盾しないか確認。(2) entitlement state で happy/delayed 判定。

**真理源:** Webhook が fulfillment の truth-source。Success page は権限付与を行わず、entitlements を READ のみ。

---

## 2. Copy ルール

| 種別 | ルール |
|------|--------|
| Happy path | entitlement 反映済み時のみ。Reflect Report 軸で統一。 |
| Delayed / manual recovery | entitlement 未反映時。support URL は実URLを必ず表示。recoveryRef（session_id）を表示可能にする。 |
| Receipt-facing wording | Reflect Report 軸で統一。**Stripe receipt-facing:** checkout route の payment_intent_data.description に反映。statement descriptor とは別管理。 |
| Statement descriptor | 審査中 M55-aligned を維持（Stripe 側設定、receipt-facing とは混同しない）|

---

## 3. Support URL

- 実URLを必ず表示（プレースホルダ禁止）
- `APP_ORIGIN` または `NEXT_PUBLIC_APP_URL` を用いて `/support` の完全URLを構築

---

## 4. 制約

- Public/storefront freeze を壊さない（/, /dtr/lp, /support, /legal/* は変更禁止）
- Subscription lane は触らない
- Success page は fulfillment 判断に用いない（Webhook が truth-source）

## 5. QA 正本（実装差分の明示）

- `docs/qa/M55_PURCHASE_SUCCESS_FINAL_CHECKLIST_v1.md` — 同文書「Success Page 表示分岐」表の「redirect」記載と現行実装（プライマリ CTA）の差分を Review 前提で整理
