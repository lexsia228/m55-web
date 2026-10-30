# M55 R8 — Stripe Connect Accounts v2 isolated test E2E runbook

**Scope:** local / isolated verification only. No Production or Preview mutation. No live keys. No secret values in logs.

## Preconditions (Human-owned)

1. Stripe **test** secret key (`sk_test_…`) in env — length only in CI logs.
2. `M55_STRIPE_CONNECT_TESTMODE_ENABLED=true`
3. Optional override: `M55_STRIPE_CONNECT_SECRET_KEY` (otherwise `STRIPE_SECRET_KEY`)
4. Public origin for return URLs: `M55_PUBLIC_ORIGIN` or `NEXT_PUBLIC_SITE_URL` (https or localhost)
5. **Not** `M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER=true` for this runbook (real sandbox path)

## Minimal E2E sequence

```bash
node scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

Steps performed when env is complete:

1. Classify runtime (`classifyStripeConnectRuntime`) — fail-closed if not test + explicit enablement
2. Resolve adapter — expect `TEST_SANDBOX`
3. Create connected account (Accounts v2 core) with idempotency key
4. Create hosted onboarding link (`accountLinks.create`)
5. Retrieve account snapshot (recipient configuration + requirements)

## Webhook / sync (follow-on)

- Provider webhook ingestion remains behind existing R8 provider tables; this runbook only proves **Connect v2 API** reachability.
- After Human applies provider schema in isolated DB, replay normalized events using existing `providerWebhookEventContract` tests — out of scope for this script.

## When env is incomplete

Script exits `2` and prints **Human action checklist** (missing vars only — never key material).

## Forbidden

- `sk_live_*`, Production Connect accounts, real payouts, `PRODUCTION_CASH_ACTIVATION=true`
