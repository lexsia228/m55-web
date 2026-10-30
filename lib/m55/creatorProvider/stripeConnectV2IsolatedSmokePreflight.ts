import { classifyStripeConnectRuntime } from './stripeConnectV2Semantics';

/** Fixed smoke economic identity — override only via env for multi-machine isolation. */
export const M55_R8_ISOLATED_SMOKE_ECONOMIC_IDENTITY_DEFAULT =
  '00000000-0000-4000-8000-000000000001';

export function resolveIsolatedSmokeEconomicIdentityIdV1(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_ECONOMIC_IDENTITY_ID?.trim();
  if (raw && /^[0-9a-f-]{36}$/i.test(raw)) return raw;
  return M55_R8_ISOLATED_SMOKE_ECONOMIC_IDENTITY_DEFAULT;
}

export function stableIsolatedSmokeCreateIdempotencyKeyV1(economicIdentityId: string): string {
  return `m55_r8_isolated_smoke_create_v1:${economicIdentityId}`;
}

export function resolveIsolatedAppOriginV1(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.M55_PUBLIC_ORIGIN?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim() || '';
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function resolveIsolatedDatabaseUrlV1(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw =
    env.M55_R8_ISOLATED_DATABASE_URL?.trim() || env.M55_R8_INTEGRATION_DATABASE_URL?.trim() || '';
  return raw || null;
}

/** Fail-closed checklist before any Stripe HTTP for isolated smoke / hosted onboarding. */
export function listIsolatedStripeConnectPreflightMissingV1(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const classification = classifyStripeConnectRuntime(env);
  const missing: string[] = [];
  if (!classification.secretKeyPresent) {
    missing.push('Set sk_test_* via M55_STRIPE_CONNECT_SECRET_KEY or STRIPE_SECRET_KEY');
  }
  if (!classification.testModeExplicitlyEnabled) {
    missing.push('Set M55_STRIPE_CONNECT_TESTMODE_ENABLED=true');
  }
  if (classification.secretKeyMode === 'live') {
    missing.push('Live keys are blocked for R8 isolated verification');
  }
  if (classification.fakeAdapterForced) {
    missing.push('Unset M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER for sandbox smoke');
  }
  if (!resolveIsolatedAppOriginV1(env)) {
    missing.push('Set M55_PUBLIC_ORIGIN to the isolated app origin (e.g. http://localhost:3000)');
  }
  if (!resolveIsolatedDatabaseUrlV1(env)) {
    missing.push('Set M55_R8_ISOLATED_DATABASE_URL (non-Production Postgres) before hosted onboarding');
  }
  return missing;
}
