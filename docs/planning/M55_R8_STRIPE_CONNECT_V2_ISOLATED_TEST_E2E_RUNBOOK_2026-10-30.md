# M55 R8 — Stripe Connect Accounts v2 isolated verification runbook

**Scope:** local / isolated verification only. No Production or Preview mutation. No live keys. No secret values in logs.

## Classification (do not over-claim)

| Step | What `m55-r8-stripe-connect-v2-isolated-test-e2e.mjs` proves | Not proven by this script |
|------|----------------------------------------------------------------|---------------------------|
| API smoke | Test-mode runtime classification, sandbox adapter, connected account create, onboarding **link URL** creation, account **retrieve** snapshot | Hosted onboarding **completion**, browser **return** handling, payout/receive **state sync**, **webhook** ingestion |

Treat script success as **`STRIPE_CONNECT_V2_API_SMOKE`** only — not Revenue Ready, not provider GREEN, not onboarding E2E GREEN.

## Preconditions (Human-owned)

1. Stripe **test** secret key (`sk_test_…`) in env — length only in CI logs.
2. `M55_STRIPE_CONNECT_TESTMODE_ENABLED=true`
3. Optional override: `M55_STRIPE_CONNECT_SECRET_KEY` (otherwise `STRIPE_SECRET_KEY`)
4. Public origin for return URLs: `M55_PUBLIC_ORIGIN` or `NEXT_PUBLIC_SITE_URL` (https or localhost)
5. **Not** `M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER=true` for sandbox smoke (real test API path)

## API smoke command

TypeScript imports require the repo dev runner (plain `node` without `tsx` will not resolve `.ts` imports):

```bash
npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

Keyless preflight (expect exit code `2`, no Stripe HTTP):

```bash
env -u STRIPE_SECRET_KEY -u M55_STRIPE_CONNECT_SECRET_KEY -u M55_STRIPE_CONNECT_TESTMODE_ENABLED \
  npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

When env is complete, output JSON includes `classification: STRIPE_CONNECT_V2_API_SMOKE`.

## Follow-on (separate Human / isolated DB gates — not E2E GREEN until all pass)

1. **Hosted onboarding:** open onboarding URL from smoke JSON once; complete Stripe test onboarding UI.
2. **Return URL:** confirm app handles `…/creator/portal?provider=return&session=…` on `M55_PUBLIC_ORIGIN` (local dev server or tunnel).
3. **Isolated DB:** apply R8 provider/settlement SQL to a **non-Production** Postgres only; store account + snapshot rows via existing provider onboarding service paths.
4. **Receive-state sync:** run provider refresh/sync after onboarding; verify payout-capability fields in DB match snapshot (no Production Cash).
5. **Webhook:** forward Stripe test webhooks to local/isolated endpoint (Stripe CLI or tunnel); verify normalized event persistence + idempotency via existing `providerWebhookEventContract` tests against isolated DB.

Do **not** claim **`STRIPE_CONNECT_V2_E2E_GREEN`** until steps 1–5 are evidenced. API smoke alone remains **`STRIPE_CONNECT_V2_API_SMOKE`**.

## When env is incomplete

Script exits `2` and prints **Human action checklist** (missing vars only — never key material). No fake adapter success.

## Forbidden

- `sk_live_*`, Production Connect accounts, real payouts, `PRODUCTION_CASH_ACTIVATION=true`
