# M55 Environment Matrix (SSOT)

**Status:** Development operations SSOT — mandatory anchor for all M55 work.  
**Branch anchor:** `work/home-cluster`  
**Primary battlefield:** Vercel **Preview** (this branch)  
**DB (Preview):** Supabase **Shadow / Test** (non-production data plane)  
**Stripe:** **Sandbox** (test mode) for Preview-linked checkout and webhooks  
**Current product lane:** **DTR base report ¥1,000** (core paid report purchase path)

## 1. Environment roles

| Environment | Role | When to use |
|-------------|------|-------------|
| **Local** | Developer machine; fast iteration; must not be confused with Preview or Production. | Local `next dev` / scripts; Stripe CLI forward to a **dedicated** local or tunnel URL if used. |
| **Preview** | **Primary integration surface** for `work/home-cluster`. Mirrors Vercel Preview deployment for this branch. | End-to-end verification of checkout → webhook → DB for the **current** product lane on Shadow/Test. |
| **Production** | Live users; `main` / production deployment. | **Out of scope** until Preview path is proven stable. Do not mix Preview secrets or webhooks with Production. |

## 2. Current main battlefield

- **Branch:** `work/home-cluster`
- **Vercel:** **Preview** deployment for that branch (not Production)
- **Database:** Supabase **Shadow / Test** linked to that Preview project configuration
- **Stripe:** **Sandbox**; webhooks must target the **Preview** deployment URL only

## 3. Production / main

- **Production (`main`) is not the current target** until Preview success criteria are met.
- Do not deploy “fix” webhooks or env changes intended for Preview onto Production URLs without an explicit, separate gate.

## 4. Env changes and redeploy

- **After any environment variable change** in Vercel (or host), you **must redeploy** the **affected deployment** (Preview vs Production) so runtime picks up new values.
- “Saved in dashboard” without redeploy does **not** guarantee the running instance sees new env.

## 5. Mandatory declaration at work start

Before starting any task, state explicitly (in PR / ticket / chat):

1. **Branch** (e.g. `work/home-cluster`)
2. **Environment** (Local / **Preview** / Production)
3. **DB** (Shadow/Test vs Production project — by name only, no URLs or keys)
4. **Stripe mode** (Sandbox vs Live)
5. **Webhook endpoint** (exact deployment URL path: `/api/stripe/webhook` on **which** host)
6. **Product lane** (e.g. DTR base report ¥1,000 vs additional reply ticket ¥500)

If any of these are ambiguous, **stop** and clarify before changing Stripe, Supabase, or Vercel settings.

## 6. Non-targets (this matrix phase)

- **Production/main** as primary work target
- **Additional reply ticket ¥500** UI expansion as the main lane (see `M55_PURCHASE_FLOW_SPLIT.md`)
- Unrelated UI/design churn

## 7. References

- `docs/ssot/M55_STRIPE_WEBHOOK_ENDPOINT_REGISTRY.md`
- `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md`
- `docs/ssot/M55_INCIDENT_2026-05-08_WEBHOOK_ENV_MIXUP.md`
