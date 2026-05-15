# M55 Incident — 2026-05-08 — Webhook / Environment Mix-up

**Classification:** Operational / configuration incident (not application logic bug as primary cause).  
**Goal:** Document symptoms, root cause, recovery order, and recurrence controls.

## 1. Symptoms

- After a **4242** (test) successful payment flow, the **paid report did not open** (access / unlock not observed as expected).

## 2. Confirmed root cause

- Stripe events were delivered to **Vercel Preview** `/api/stripe/webhook`, but the handler failed with configuration missing for Supabase admin access:
  - **`ENV_MISSING: SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`** (exact wording per logs at time of incident).
- Fulfillment therefore did not complete on the **Preview** deployment despite Stripe accepting the payment in test mode.

## 3. Contributing / chain causes

- **No fixed mapping** in-repo between:
  - Vercel **Preview** vs **Production**
  - Supabase **Shadow/Test** vs **Production** project
  - Stripe webhook **endpoint URL** vs **`whsec`**
- Risk of **reusing** or **mis-assigning** signing secrets across environments.
- **Env dashboard changes** without **redeploy** of the target deployment (runtime still on old config).

## 4. Recovery order (Preview-first)

Execute in order; do not skip “anchor” steps.

1. **Anchor branch:** fix context to **`work/home-cluster`** and its **Preview** deployment only.
2. **Preview env:** confirm Preview project has required Supabase variables set (names only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — **do not** paste values into tickets or docs).
3. **Preview webhook endpoint uniqueness:** one Stripe endpoint → one Preview URL → one `whsec` (see registry doc).
4. **Preview Redeploy** after env confirmation.
5. **Stripe retry:** send **`checkout.session.completed`** to the **Preview** endpoint **once** for the affected session (after fix), not repeated blind retries.
6. **Verify** `POST /api/stripe/webhook` returns **200** on Preview for that replay.
7. **Product check:** confirm paid report opens / entitlement path for **Lane A** (DTR base ¥1,000) on Preview.

## 5. Recurrence prevention

- **Environment anchor mandatory** at task start (branch, deployment, DB plane, Stripe mode, webhook URL, product lane) — see `M55_ENVIRONMENT_MATRIX.md`.
- **Endpoint uniqueness** — see `M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`.
- **Never mix** Preview `whsec` with Production URL or vice versa.
- **Redeploy** after any Vercel env change affecting that deployment.
- **Do not** treat **Production/main** as the debugging surface until Preview is green for the current lane.
- **Lane split:** core ¥1,000 vs reply ¥500 — see `M55_PURCHASE_FLOW_SPLIT.md`; do not attribute core unlock failures to reply-ticket state.

## 6. References

- `docs/ssot/M55_ENVIRONMENT_MATRIX.md`
- `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`
- `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md`
