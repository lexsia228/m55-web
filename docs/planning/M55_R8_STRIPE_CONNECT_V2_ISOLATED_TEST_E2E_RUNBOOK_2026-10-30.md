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

```bash
node scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

When env is complete, output JSON includes `classification: STRIPE_CONNECT_V2_API_SMOKE`.

## Follow-on (separate Human / isolated DB gates)

1. Complete hosted onboarding in Stripe test UI; verify return URL handling in app.
2. Apply provider schema to **isolated** DB; replay normalized webhook events.
3. Verify receive-capability sync against provider tables — out of scope for the smoke script.

## When env is incomplete

Script exits `2` and prints **Human action checklist** (missing vars only — never key material). No fake adapter success.

## Forbidden

- `sk_live_*`, Production Connect accounts, real payouts, `PRODUCTION_CASH_ACTIVATION=true`
