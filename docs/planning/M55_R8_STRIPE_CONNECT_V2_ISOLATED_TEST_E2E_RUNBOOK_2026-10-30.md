# M55 R8 — Stripe Connect Accounts v2 isolated verification runbook

**Scope:** local / isolated verification only. No Production or Preview mutation. No live keys. No secret values in logs, chat, git, or review patches.

## Classification (do not over-claim)

| Step | What smoke + open scripts prove | Not proven |
|------|----------------------------------|------------|
| API smoke | Test-mode gates, **one reused** Connect test account (stable idempotency), onboarding link issuance, account retrieve | Hosted onboarding **completion**, **owned-session** return, DB sync, webhooks |

Success JSON classification: **`STRIPE_CONNECT_V2_API_SMOKE`** only.

## Preconditions (Human-owned — all required before Stripe HTTP)

1. `sk_test_*` in `STRIPE_SECRET_KEY` or `M55_STRIPE_CONNECT_SECRET_KEY` (Human sets locally only).
2. `M55_STRIPE_CONNECT_TESTMODE_ENABLED=true`
3. `M55_PUBLIC_ORIGIN=http://localhost:3000` (or your **isolated** dev origin — must match redirect validation exactly, including port).
4. `M55_R8_ISOLATED_DATABASE_URL=postgresql://…` (**non-Production** Postgres with R8 provider schema applied).
5. **Not** `M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER=true`

Optional:

- `M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_ECONOMIC_IDENTITY_ID` — override default smoke economic identity UUID.
- `M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_RESET=true` — **once**, if persisted account is invalid and must be replaced.

Persisted state (gitignored): `.m55_r8_stripe_connect_isolated/state.json`  
Onboarding URL (gitignored, mode 0600): `.m55_r8_stripe_connect_isolated/onboarding.url` — **never** paste into chat.

## API smoke (single account reuse)

```bash
npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

Keyless preflight (exit `2`, no Stripe HTTP):

```bash
env -u STRIPE_SECRET_KEY -u M55_STRIPE_CONNECT_SECRET_KEY -u M55_STRIPE_CONNECT_TESTMODE_ENABLED \
  -u M55_PUBLIC_ORIGIN -u M55_R8_ISOLATED_DATABASE_URL -u M55_R8_INTEGRATION_DATABASE_URL \
  npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
```

Open onboarding URL locally **without printing it**:

```bash
npx tsx scripts/m55-r8-open-isolated-stripe-onboarding-url.mjs
```

Re-runs reuse the same Connect account from `state.json` (no new account unless reset flag).

## Browser return (owned session — not smoke fake session)

Smoke script uses a **session-less** Stripe return URL for link creation only. **Completion** must use existing app paths:

1. Start isolated app on `M55_PUBLIC_ORIGIN` with Clerk test user signed in.
2. Complete tax profile if required (`/creator/portal`).
3. `POST /api/creator/provider/onboarding` with `{ action, idempotencyKey }` → response includes `sessionId` + `onboardingUrl` (Human browser only).
4. Finish Stripe hosted onboarding; land on `/creator/portal?provider=return&session=<sessionId>`.
5. `GET /api/creator/provider/status?refreshProvider=1` (or portal load) → `verifyOnboardingSessionOwnedAndPendingV1` + `syncProviderSnapshotV1`.

Do **not** treat `session=e2e-smoke` or API-smoke return URLs as completion proof.

## E2E GREEN gates (all required — still not claimed by smoke)

1. Hosted onboarding completed in browser.  
2. Return with **DB-issued** `session` query param.  
3. Isolated DB rows updated (provider account + snapshot).  
4. Receive-capability sync matches Stripe snapshot.  
5. Test webhook ingested idempotently.

## Forbidden

- `sk_live_*`, Production/Preview DB mutation, Production Connect, real payouts, `PRODUCTION_CASH_ACTIVATION=true`
