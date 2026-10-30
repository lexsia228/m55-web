#!/usr/bin/env node
/**
 * Stripe Connect Accounts v2 **API smoke** (test mode only). Not onboarding/webhook E2E GREEN.
 */
import { classifyStripeConnectRuntime } from '../lib/m55/creatorProvider/stripeConnectV2Semantics.ts';
import { randomUUID } from 'node:crypto';

function humanChecklist(missing) {
  console.error('M55_R8_STRIPE_CONNECT_E2E_INCOMPLETE');
  for (const line of missing) console.error(`- ${line}`);
  process.exit(2);
}

const classification = classifyStripeConnectRuntime();
const missing = [];
if (!classification.secretKeyPresent) missing.push('Set sk_test_* via M55_STRIPE_CONNECT_SECRET_KEY or STRIPE_SECRET_KEY');
if (!classification.testModeExplicitlyEnabled) missing.push('Set M55_STRIPE_CONNECT_TESTMODE_ENABLED=true');
if (classification.secretKeyMode === 'live') missing.push('Live keys are blocked for R8 isolated E2E');
if (classification.fakeAdapterForced) missing.push('Unset M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER for sandbox E2E');

if (missing.length > 0) humanChecklist(missing);

const { resolveStripeConnectAdapter } = await import('../lib/m55/creatorProvider/stripeConnectAdapter.ts');

const adapter = resolveStripeConnectAdapter();
if (adapter.mode !== 'TEST_SANDBOX') {
  console.error('M55_R8_STRIPE_CONNECT_E2E_ADAPTER_NOT_SANDBOX', adapter.mode);
  process.exit(2);
}

const economicIdentityId = randomUUID();
const idempotencyKey = `m55-r8-e2e:${economicIdentityId.slice(0, 8)}`;

const { accountId } = await adapter.createConnectedAccountStub({
  economicIdentityId,
  idempotencyKey,
  contactEmail: 'creator-e2e@test.m55.local',
  payeeType: 'INDIVIDUAL',
});

const refreshUrl = `${process.env.M55_PUBLIC_ORIGIN ?? 'http://localhost:3000'}/creator/portal`;
const returnUrl = `${refreshUrl}?provider=return&session=e2e-smoke`;

const link = await adapter.createAccountOnboardingLink({
  accountId,
  refreshUrl,
  returnUrl,
});

const snapshot = await adapter.retrieveAccountSnapshot(accountId);

console.log(
  JSON.stringify({
    ok: true,
    classification: 'STRIPE_CONNECT_V2_API_SMOKE',
    adapterMode: adapter.mode,
    accountIdSuffix: accountId.slice(-8),
    onboardingUrlPresent: Boolean(link.url),
    snapshotPresent: Boolean(snapshot),
    requirementsCurrentlyDueCount: snapshot.requirementsCurrentlyDueCount,
    notProven: [
      'hosted_onboarding_completion',
      'return_url_handling',
      'receive_state_sync',
      'webhook_ingestion',
    ],
  }),
);
