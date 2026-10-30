import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listIsolatedStripeConnectPreflightMissingV1,
  resolveIsolatedAppOriginV1,
  stableIsolatedSmokeCreateIdempotencyKeyV1,
} from './stripeConnectV2IsolatedSmokePreflight.ts';
import {
  loadIsolatedSmokeStateV1,
  saveIsolatedSmokeStateV1,
  isolatedSmokeOnboardingUrlPathV1,
  writeIsolatedSmokeOnboardingUrlForHumanV1,
} from './stripeConnectV2IsolatedSmokeState.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('R8 isolated Stripe smoke preflight', () => {
  it('requires origin and isolated DB before Stripe calls', () => {
    const missing = listIsolatedStripeConnectPreflightMissingV1({
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      M55_STRIPE_CONNECT_TESTMODE_ENABLED: 'true',
    });
    assert.ok(missing.some((line) => line.includes('M55_PUBLIC_ORIGIN')));
    assert.ok(missing.some((line) => line.includes('M55_R8_ISOLATED_DATABASE_URL')));
  });

  it('uses stable create idempotency key per economic identity', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    assert.equal(
      stableIsolatedSmokeCreateIdempotencyKeyV1(id),
      stableIsolatedSmokeCreateIdempotencyKeyV1(id),
    );
  });

  it('persists and reloads smoke account state', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'm55-r8-smoke-'));
    try {
      saveIsolatedSmokeStateV1(
        {
          economicIdentityId: '00000000-0000-4000-8000-000000000001',
          stripeAccountId: 'acct_test_smoke',
          createIdempotencyKey: 'm55_r8_isolated_smoke_create_v1:x',
          updatedAtUtc: new Date().toISOString(),
        },
        cwd,
      );
      const loaded = loadIsolatedSmokeStateV1(cwd);
      assert.equal(loaded?.stripeAccountId, 'acct_test_smoke');
      writeIsolatedSmokeOnboardingUrlForHumanV1('https://connect.stripe.com/setup/example', cwd);
      assert.ok(isolatedSmokeOnboardingUrlPathV1(cwd).endsWith('onboarding.url'));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('R8 isolated app origin', () => {
  it('accepts explicit localhost origin string', () => {
    assert.equal(resolveIsolatedAppOriginV1({ M55_PUBLIC_ORIGIN: 'http://localhost:3000' }), 'http://localhost:3000');
  });
});
