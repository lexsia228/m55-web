# M55 R8 — Stripe Connect Accounts v2 isolated verification runbook

**Scope:** local / isolated verification only. No Production or Preview mutation. No live keys. No secret values in logs, chat, git, or review patches.

## Two lanes (do not mix)

| Lane | Purpose | Stripe Connect account owner |
|------|---------|------------------------------|
| **API smoke** | `m55-r8-stripe-connect-v2-isolated-test-e2e.mjs` — reachability + link issuance | Fixed smoke economic identity in `.m55_r8_stripe_connect_isolated/state.json` |
| **Creator formal E2E** | Signed-in Creator → `POST /api/creator/provider/onboarding` | Creator’s `economic_identity_id` row in `m55_r8_stripe_connected_accounts_v1` (reused; stable create idempotency) |

Do **not** use the smoke account for Creator return/session proof. Do **not** create extra Connect accounts on retries.

## DB / app connection alignment (required before Stripe HTTP or webhooks)

The app writes via **`getSupabaseAdmin()`** → `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.  
Preflight **`M55_R8_ISOLATED_DATABASE_URL`** must describe the **same Supabase project instance** as the app URL (hosted direct/pooler, or **local full stack** API + Postgres pair).

Verify alignment (no secrets in output). Scripts read **only** `.env.m55-r8-isolated.local` (or `M55_R8_ISOLATED_ENV_FILE`) — not `.env.local` / Production / Preview shell vars for Supabase alignment keys:

1. Create **`.env.m55-r8-isolated.local`** at repo root (gitignored) with:
   - `NEXT_PUBLIC_SUPABASE_URL` — hosted `https://<ref>.supabase.co` **or** local API `http://127.0.0.1:54321` (`supabase start`)
   - `SUPABASE_SERVICE_ROLE_KEY` (legacy JWT with matching `ref` claim, or `sb_secret_*`)
   - `M55_R8_ISOLATED_DATABASE_URL` — hosted direct/pooler **or** local Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - `M55_R8_ISOLATED_SUPABASE_PROJECT_REF` — Dashboard ref (hosted) or `supabase status` project ref (local stack; must match service-role JWT `ref` when using JWT keys)

Optional in the **same file** for API smoke (never commit): `M55_STRIPE_CONNECT_SECRET_KEY` or `STRIPE_SECRET_KEY`, `M55_STRIPE_CONNECT_TESTMODE_ENABLED=true`, `M55_PUBLIC_ORIGIN`.

```bash
npx tsx scripts/m55-r8-verify-isolated-supabase-alignment.mjs
```

Stderr prints `M55_R8_ISOLATED_ENV: .env.m55-r8-isolated.local` on start. Expect stdout JSON: `{ ok: true, alignment: "LIVE_READ_PROBE", envFile: "…", supabaseProjectRefSuffix: "…6chars", … }`.

Structural-only env checks are **not** E2E GREEN. The verify script performs a read-only REST probe plus a Postgres READ probe for `public.m55_r8_stripe_connected_accounts_v1` on **all** aligned targets (hosted, local stack, and generic loopback tunnels). No secret output.

**Local Supabase full stack:** API must be `http://127.0.0.1:54321` and Postgres must use port **54322** on loopback. Human project ref must match the local project (and JWT `ref` when applicable). Plain loopback Postgres without the local stack port pair does **not** satisfy local full stack alignment.

Settlement-only disposable Docker Postgres (`M55_R8_INTEGRATION_*`) is a **separate lane** — do not point `M55_R8_ISOLATED_DATABASE_URL` at integration disposable DBs.

## Preconditions (Human-owned)

1. Put isolated Supabase vars in **`.env.m55-r8-isolated.local`** (see alignment section) — do not point the verify script at Production `.env.local`.
2. `M55_R8_ISOLATED_DATABASE_URL` — direct (`db.<ref>.supabase.co`) or Shared Pooler (`*.pooler.supabase.com`, user `postgres.<ref>`, port 5432 session / 6543 transaction) for **same** hosted project, **or** local stack Postgres on **54322** with API on **54321**.
3. R8 provider migration applied on that project (`20261029000000_m55_r8_a_creator_provider_onboarding_v1.sql`).
4. For API smoke, put Stripe test vars in **`.env.m55-r8-isolated.local`** (or shell after alignment file load) — `sk_test_*`, `M55_STRIPE_CONNECT_TESTMODE_ENABLED=true`, `M55_PUBLIC_ORIGIN` (port-exact).
5. **Not** `M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER=true`.

Optional smoke: `M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_RESET=true` (once).

## API smoke

```bash
npx tsx scripts/m55-r8-verify-isolated-supabase-alignment.mjs
npx tsx scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs
npx tsx scripts/m55-r8-open-isolated-stripe-onboarding-url.mjs
```

Classification: **`STRIPE_CONNECT_V2_API_SMOKE`** only.

## Creator formal E2E (owned session)

1. Ensure ACTIVE Creator + tax profile for your Clerk test user (`docs/planning/M55_R8_ISOLATED_CREATOR_E2E_SEED.sql` if none).
2. Sign in on `M55_PUBLIC_ORIGIN` → `/creator/portal`.
3. `POST /api/creator/provider/onboarding` with `{ "action":"START"|"RESUME", "idempotencyKey":"…" }`.
4. Open returned `onboardingUrl` in browser (not logged by scripts).
5. Return to `/creator/portal?provider=return&session=<sessionId from API>`.
6. Refresh provider status → DB snapshot sync via existing `buildProviderStatusBundleV1`.

## Isolated Connect webhook (not Production ingress)

Production **`R8_C_PROVIDER_WEBHOOK_INGRESS_MODE`** remains in-memory **`DISABLED`**.  
Isolated HTTP ingress: **`POST /api/stripe/connect/webhook`** when:

- `M55_R8_ISOLATED_STRIPE_CONNECT_WEBHOOK_ENABLED=true`
- alignment script passes
- `M55_R8_STRIPE_CONNECT_WEBHOOK_SECRET` (Stripe test `whsec_…`)

Stripe CLI example (Human local):

```bash
stripe listen --forward-to localhost:3000/api/stripe/connect/webhook
```

**Implemented:** signature verification, allowed Connect event types, DB append to `m55_r8_provider_onboarding_events_v1`, idempotency by `stripe_evt:<event id>`.  
**Not yet applied from webhooks:** automatic payout-capability snapshot sync (`snapshotSyncApplied: false` until v2 event shape is evidenced in isolation).

## E2E GREEN (all required — not claimed by smoke alone)

Hosted onboarding + owned return + DB provider rows + receive sync + signed webhook receipt.

## Forbidden

- `sk_live_*`, Production/Preview DB, Production Connect, real payouts, `PRODUCTION_CASH_ACTIVATION=true`
