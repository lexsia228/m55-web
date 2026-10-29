import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { resolveStripeConnectAdapter } from './stripeConnectAdapter.ts';
import { createFakeStripeConnectAdapter } from './stripeConnectAdapterFake.ts';

const ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'M55_STRIPE_CONNECT_SECRET_KEY',
  'M55_STRIPE_CONNECT_TESTMODE_ENABLED',
  'M55_STRIPE_CONNECT_ADAPTER',
] as const;

function snapshotEnv(): Record<(typeof ENV_KEYS)[number], string | undefined> {
  const out = {} as Record<(typeof ENV_KEYS)[number], string | undefined>;
  for (const key of ENV_KEYS) out[key] = process.env[key];
  return out;
}

describe('resolveStripeConnectAdapter — operational modes', () => {
  const before = snapshotEnv();
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  });

  it('defaults to DISABLED without keys (not FAKE)', () => {
    for (const key of ENV_KEYS) delete process.env[key];
    assert.equal(resolveStripeConnectAdapter().mode, 'DISABLED');
  });

  it('uses FAKE only when explicitly forced for unit tests', () => {
    process.env.M55_STRIPE_CONNECT_ADAPTER = 'FAKE';
    assert.equal(resolveStripeConnectAdapter().mode, 'FAKE');
    assert.equal(createFakeStripeConnectAdapter().mode, 'FAKE');
  });

  it('blocks live secret keys even if test flag set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_example';
    process.env.M55_STRIPE_CONNECT_TESTMODE_ENABLED = 'true';
    assert.equal(resolveStripeConnectAdapter().mode, 'LIVE_BLOCKED');
  });

  it('requires explicit test flag for TEST_SANDBOX', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    delete process.env.M55_STRIPE_CONNECT_TESTMODE_ENABLED;
    assert.equal(resolveStripeConnectAdapter().mode, 'DISABLED');
  });
});
