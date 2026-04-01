# Stripe Review Submission SSOT (Web) — v1
Date: 2026-02-26 JST
Status: FREEZE (submission checklist)

Goal: submit Stripe (Live) review today with minimum risk.

This checklist is intentionally boring and factual. It prevents payout holds and "missing merchant info" failures.

---

## 1) Public pages that must exist (no login required)
A. Legal disclosure (Tokushoho)
- Path: `/legal/tokushoho`
- Must include: operator name, contact email, pricing statement, delivery timing, refund/cancel policy.
- If phone/address should not be public: allowed policy line
  - 「請求があった場合、遅滞なく開示します」
- Contact email must be functional and monitored.

B. Product description (DTR LP)
- Path: `/dtr/lp`
- Must clearly state:
  - What the product is (digital content)
  - Price shown at checkout (税込)
  - How it is delivered (immediate after payment)
  - Link to legal page

C. Footer link (site-wide)
- Every page must have reachable link to `/legal/tokushoho` (footer is sufficient).

Recommended (low-cost, reduces review friction):
- `/legal/terms` (terms)
- `/legal/privacy` (privacy)

---

## 2) Stripe technical requirements (review-safe)
- Checkout session includes metadata:
  - `user_id` (Clerk userId)
  - `product_id` (canonical id)
  - `intent_id` (purchase context)
- Webhook signature verification enabled (`STRIPE_WEBHOOK_SECRET`).
- Idempotency:
  - Record `event_id` in `stripe_events` with UNIQUE.
- Grant path:
  - Webhook writes `entitlements`.
  - Client never grants access.

---

## 3) Environment variables (must be set in Vercel)
- `APP_ORIGIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_DTR_CORE_STATIC_V1`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)

---

## 4) Evidence you must be able to show yourself (pre-submit)
- Open `/legal/tokushoho` on a private/incognito window and on mobile.
- Run one Stripe **test** payment end-to-end:
  - pay → success page → entitlement created → protected DTR page accessible.
- Confirm DB rows exist:
  - `stripe_events`: event_id inserted
  - `entitlements`: (user_id, product_id) inserted

---

## 5) Submission steps (manual)
- Stripe Dashboard: switch to Live onboarding
- Provide identity verification
- Provide bank account
- Provide public website URL
- Provide support contact (email)

Do NOT remove legal pages after approval.
