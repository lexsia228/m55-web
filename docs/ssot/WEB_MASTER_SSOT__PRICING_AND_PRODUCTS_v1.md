# WEB MASTER SSOT — Pricing, Products, Wallets (v1)
Date: 2026-02-26 JST
Status: FREEZE for Web release track

This document defines the **Web product catalog**, **pricing**, and **wallet separation** rules. It is written to be compatible with later iOS convergence.

Authoritative dependencies:
1) `M55_MONETIZATION_SSOT_FULL_FREEZE_v1_0.md` (top-level monetization principles)
2) `WEB_MONETIZATION_SSOT_ADDENDUM_v0_3.md` (Web-only technical rails)
3) `PRICING_WALLET_SEPARATION__EXTRACT_v1_DESKTOP_PACK_2026-02-01.md` (wallet separation & SKU blueprint; Desktop Pack is otherwise forbidden to cite)

If any other artifact conflicts, this file wins for the Web track.

---

## 0. Non-negotiables
- Free experience stands alone. Paid adds **depth / save / revisitability** (never "better results").
- Never insert payment during ritual / reading / observation.
- No ranking, no scores, no "optimal/recommended/success" language.
- Purchased value is never lost. Permanent grants must not re-lock.

---

## 1. Wallet model (3 wallets, no cross-spend)
Web uses three separate "wallets" so pricing does not cannibalize and to prevent user confusion.

A) Subscription quota (daily included uses)
- Applies to: general AI chat and Tarot daily usage.
- Must NOT be spendable inside DTR rooms.

B) Boost Credits (consumable packs)
- Applies to: general AI chat + Tarot quick add/care.
- Must NOT be spendable inside DTR rooms.

C) DTR Talk Pass (DTR-room-only)
- Applies to: DTR room chat only.
- Must NOT be spendable for general AI chat.

This separation is required by the Desktop Pack extract.

---

## 2. Product catalog (canonical IDs)
All purchases are represented by `product_id` in Stripe metadata and by `entitlements.product_id` in DB.

### 2.1 DTR products
DTR is the core monetization surface. Web launch can start with a minimal subset, but IDs must be future-proof.

Launch-minimum (to pass review and start charging):
- `DTR_CORE_STATIC_V1`
  - Type: Static DTR (permanent)
  - Pricing: **¥1,000 (税込)**
  - Rationale: matches SSOT v1.0 placeholder range for Static DTR (¥500–¥1,200).
  - Entitlement: permanent (no expiry), non-consumable.

Planned lineup (post-review iteration; still SSOT-compliant):
- `DTR_CORE_STATIC` (price adjustable in the allowed Static range)
- `DTR_SYNASTRY_STATIC_{partnerHash}` (per partner; permanent)
- `DTR_WEEKLY_DYNAMIC_{weekKey}` (time-limited; plan-dependent save)
- `DTR_MONTHLY_DYNAMIC_{monthKey}` (time-limited; plan-dependent save)

### 2.2 Boost credits (general chat/tarot)
Optional for launch. If enabled, must follow the extracted SKU shapes.

- `BOOST_CREDITS_10` — ¥480
- `BOOST_CREDITS_24` — ¥1,120
- `BOOST_CREDITS_40` — ¥1,880

Rules:
- Consumable, validity 30 days.
- This is separate from subscription quotas.

### 2.3 DTR Talk Pass (DTR-room-only)
Not required for the initial "charge-ready" launch, because DTR chat can be deferred. If introduced, must be separate wallet.

- `DTR_TALK_PASS_6` — ¥980
- `DTR_TALK_PASS_10` — ¥1,480
- `DTR_TALK_PASS_20` — ¥2,480

Rules:
- Validity 30 days.
- Spend only inside the corresponding DTR room context.

---

## 3. What is allowed to go live today (review-safe minimal set)
To maximize approval probability and minimize scope:

Must-have for "charge-ready" Web:
- DTR LP + purchase button
- Legal disclosure page(s) reachable publicly
- Stripe Checkout + webhook + entitlement protection
- One DTR product (`DTR_CORE_STATIC_V1`) with protected content page

May-have (safe if implemented correctly):
- Boost credits packs (as separate SKUs)

Must NOT ship in the first review push (scope risk):
- Any mid-reading paywall
- Any "DTR chat upsell" inside reading
- Any copy implying prediction accuracy improvement or guaranteed outcomes

---

## 4. Stripe implementation mapping (single source)
- Checkout metadata MUST include `user_id`, `product_id`, and an `intent_id`.
- Webhook is the only grant path.
- Entitlements table is SSOT for access.

---

## 5. Migration compatibility (iOS convergence)
- Canonical `product_id` values are platform-agnostic.
- Wallet separation rules remain identical on iOS (subscription quota vs boost credits vs DTR talk pass).
- If iOS pricing differs later, Web must still preserve semantic separation.
