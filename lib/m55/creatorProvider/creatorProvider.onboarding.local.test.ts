import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  assertSafeRedirectUrl,
  createFakeStripeConnectAdapter,
  fakeStripeCompleteOnboardingForTests,
  resetFakeStripeConnectAdapterForTests,
} from './stripeConnectAdapter.ts';

describe('R8-A Stripe connect adapter — fake test double', () => {
  it('creates deterministic fake account ids', async () => {
    resetFakeStripeConnectAdapterForTests();
    const adapter = createFakeStripeConnectAdapter();
    assert.equal(adapter.mode, 'FAKE');
    const first = await adapter.createConnectedAccountStub({
      economicIdentityId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'create:test',
      contactEmail: 'creator@example.com',
      payeeType: 'INDIVIDUAL',
    });
    const second = await adapter.createConnectedAccountStub({
      economicIdentityId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'create:test',
      contactEmail: 'creator@example.com',
      payeeType: 'INDIVIDUAL',
    });
    assert.equal(first.accountId, second.accountId);
    assert.match(first.accountId, /^acct_fake_r8a_/);
  });

  it('rejects open redirect URLs', () => {
    assert.equal(assertSafeRedirectUrl('https://evil.example/creator/portal', 'https://m-55.jp'), null);
    assert.ok(assertSafeRedirectUrl('https://m-55.jp/creator/portal', 'https://m-55.jp'));
    assert.ok(
      assertSafeRedirectUrl('http://localhost:3000/creator/portal', 'http://localhost:3000'),
    );
    assert.equal(
      assertSafeRedirectUrl('http://localhost:4000/creator/portal', 'http://localhost:3000'),
      null,
    );
    assert.equal(
      assertSafeRedirectUrl('http://evil.localhost:3000/creator/portal', 'http://localhost:3000'),
      null,
    );
  });

  it('never marks fake onboarding as production/live', async () => {
    resetFakeStripeConnectAdapterForTests();
    const adapter = createFakeStripeConnectAdapter();
    const { accountId } = await adapter.createConnectedAccountStub({
      economicIdentityId: '22222222-2222-4222-8222-222222222222',
      idempotencyKey: 'k1',
      contactEmail: 'creator@example.com',
      payeeType: 'INDIVIDUAL',
    });
    fakeStripeCompleteOnboardingForTests(accountId);
    const snap = await adapter.retrieveAccountSnapshot(accountId);
    assert.equal(snap.payoutsEnabled, true);
    assert.match(accountId, /^acct_fake_/);
  });
});

describe('R8-A migration static safety', () => {
  it('grants tables to service_role only', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261029000000_m55_r8_a_creator_provider_onboarding_v1.sql'),
      'utf8',
    );
    assert.match(sql, /revoke all on public\.m55_r8_creator_tax_profiles_v1 from public, anon, authenticated/);
    assert.match(sql, /grant all on public\.m55_r8_creator_tax_profiles_v1 to service_role/);
    assert.doesNotMatch(sql, /my_number|bank_account/i);
  });
});

describe('R8-A API routes — fail-closed markers', () => {
  it('provider status route uses server bundle not client trust', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/creator/provider/status/route.ts'), 'utf8');
    assert.match(src, /buildProviderStatusBundleV1/);
    assert.doesNotMatch(src, /searchParams\.get\('success'\)/);
  });

  it('onboarding route requires idempotency key', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/creator/provider/onboarding/route.ts'), 'utf8');
    assert.match(src, /idempotencyKey/);
    assert.match(src, /startCreatorProviderOnboardingV1/);
    assert.match(src, /PROVIDER_ADAPTER_DISABLED/);
  });

  it('onboarding service rejects client-trusted return without owned session poll', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorProvider/onboardingService.ts'), 'utf8');
    assert.match(src, /verifyOnboardingSessionOwnedAndPendingV1/);
    assert.match(src, /markOnboardingSessionCompletedV1/);
    assert.match(src, /retrieveAccountSnapshot/);
  });

  it('connect webhook route is isolated-gated and signature verified', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/stripe/connect/webhook/route.ts'), 'utf8');
    assert.match(src, /canAcceptIsolatedConnectWebhookRequestV1/);
    assert.match(src, /verifyStripeConnectWebhookSignatureV1/);
    assert.match(src, /snapshotSyncApplied: false/);
  });
});

describe('R8-A adapter resolution — not silently FAKE in production code path', () => {
  it('resolveStripeConnectAdapter defaults DISABLED in stripeConnectAdapter.ts', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorProvider/stripeConnectAdapter.ts'), 'utf8');
    assert.match(src, /createDisabledStripeConnectAdapter\('DISABLED'\)/);
    assert.match(src, /createTestSandboxStripeConnectAdapter/);
    assert.match(src, /v2\.core\.accounts\.create/);
  });
});
