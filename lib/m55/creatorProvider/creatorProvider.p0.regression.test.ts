import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildPublicReadinessSnapshotV1 } from './readinessModel.ts';
import { buildJpRecipientAccountCreateParamsV1, mapV2CoreAccountToProviderSnapshotV1 } from './stripeConnectV2Semantics.ts';
import { resolveStripeConnectAdapter } from './stripeConnectAdapter.ts';
import { isM55ProductionRuntime } from './runtimeEnvironment.ts';

describe('P0-1 §8 pre-activation onboarding path', () => {
  it('allows tax/onboarding messaging for APPROVED_PENDING_ACTIVATION', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'APPROVED_PENDING_ACTIVATION',
      r7ReferralIssueEligible: false,
      complianceBlocksReferral: false,
      taxProfileReady: false,
      taxProfile: null,
      linkState: 'NOT_STARTED',
      providerSnapshot: null,
      stripeAccountId: null,
      v1JapanBlocked: false,
    });
    assert.ok(snapshot.blockReasons.includes('PROFILE_PENDING_FINAL_APPROVAL'));
    assert.ok(snapshot.blockReasons.includes('TAX_PROFILE_MISSING'));
    assert.ok(!snapshot.blockReasons.includes('PROFILE_NOT_ACTIVE'));
  });
});

describe('P0-3 corporation fail-closed', () => {
  it('throws when building Stripe params for CORPORATION payee', () => {
    assert.throws(
      () =>
        buildJpRecipientAccountCreateParamsV1({
          economicIdentityId: '11111111-1111-4111-8111-111111111111',
          contactEmail: 'c@example.com',
          payeeType: 'CORPORATION',
        }),
      /CORPORATION_STRIPE_NOT_SUPPORTED_V1/,
    );
  });
});

describe('P0-4 production and ambiguous snapshot fail-closed', () => {
  it('never selects FAKE or TEST_SANDBOX in production runtime', () => {
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';
    process.env.M55_STRIPE_CONNECT_ADAPTER = 'FAKE';
    process.env.M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER = 'true';
    process.env.M55_STRIPE_CONNECT_TESTMODE_ENABLED = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    try {
      assert.equal(isM55ProductionRuntime(), true);
      assert.equal(resolveStripeConnectAdapter().mode, 'DISABLED');
    } finally {
      process.env.VERCEL_ENV = prev;
    }
  });

  it('does not mark readiness green when requirements are ambiguous', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_test',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            stripe_balance: {
              stripe_transfers: { status: 'active', status_details: [] },
              payouts: { status: 'active', status_details: [] },
            },
          },
        },
      },
      requirements: undefined,
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
    assert.equal(snapshot.payoutsEnabled, false);
  });

  it('fail-closed when livemode is not explicitly false', () => {
    const snapshot = mapV2CoreAccountToProviderSnapshotV1({
      id: 'acct_live',
      object: 'v2.core.account',
      applied_configurations: ['recipient'],
      livemode: true,
      created: '2026-01-01T00:00:00.000Z',
    } as any);
    assert.equal(snapshot.detailsSubmitted, false);
  });
});

describe('P0 onboarding route null body contract', () => {
  it('route source rejects null JSON before dereferencing action', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/creator/provider/onboarding/route.ts'), 'utf8');
    assert.match(src, /json == null/);
    assert.match(src, /parseOnboardingPostBody/);
  });
});
