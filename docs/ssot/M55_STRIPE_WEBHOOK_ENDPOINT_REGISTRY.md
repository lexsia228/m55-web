# M55 Stripe Webhook Endpoint Registry (SSOT)

**Purpose:** Prevent webhook “maze” incidents: one deployment URL must map to exactly one Stripe webhook endpoint and one signing secret. **Never reuse** `whsec_*` across environments.

## 1. Invariant: 1 URL = 1 endpoint = 1 whsec

- Each **Stripe webhook endpoint** in the Dashboard is tied to **one** public URL.
- Each endpoint has **one** signing secret (`whsec_...`).
- **Do not** copy the same `whsec` into Local, Preview, and Production env vars.
- **Do not** register two Stripe endpoints (e.g. “Preview” and “Production” names) that both point at the **same** URL — Stripe will not save you from wrong-env delivery; you will mis-sign or double-handle events.

## 2. Registered URLs (conceptual)

| Environment | Webhook URL pattern | Signing secret |
|-------------|---------------------|----------------|
| **Preview** (`work/home-cluster`) | `https://<fixed-work-home-cluster-preview-url>/api/stripe/webhook` | **Preview-only** `whsec` (Vercel Preview env for that deployment) |
| **Production** | `https://m55-web.vercel.app/api/stripe/webhook` | **Production-only** `whsec` (Production env) |
| **Local** | Tunnel or `stripe listen` forward URL + `/api/stripe/webhook` | **Local-only** `whsec` from `stripe listen` or Dashboard endpoint for that URL |

Replace `<fixed-work-home-cluster-preview-url>` with the **stable** Vercel Preview hostname for the `work/home-cluster` branch (document that hostname in your runbook / deployment notes — **do not** paste secrets here).

## 3. Rules

1. **Preview endpoint:** exactly **one** Stripe webhook endpoint whose URL is the Preview deployment’s `/api/stripe/webhook`.
2. **Production endpoint:** exactly **one** Stripe webhook endpoint whose URL is `https://m55-web.vercel.app/api/stripe/webhook`.
3. **Never** create “Preview” and “Production” named endpoints in Stripe that both target the same underlying URL.
4. After fixing misconfiguration, use Stripe’s retry **only after** the endpoint and env are correct: prefer **`checkout.session.completed` once** per failed session, not blind bulk retries.

## 4. Operational checklist (Preview)

- [ ] Stripe Dashboard: webhook URL = Preview host + `/api/stripe/webhook`
- [ ] Vercel Preview: `whsec` for **that** endpoint only (variable name per your project convention)
- [ ] No Production `whsec` in Preview env
- [ ] Redeploy Preview after env changes
- [ ] Send test event or replay one `checkout.session.completed` and confirm **HTTP 200** on Preview

## 5. References

- `docs/ssot/M55_ENVIRONMENT_MATRIX.md`
- `docs/ssot/M55_INCIDENT_2026-05-08_WEBHOOK_ENV_MIXUP.md`
- `docs/ssot/M55_PURCHASE_FLOW_SPLIT.md`
