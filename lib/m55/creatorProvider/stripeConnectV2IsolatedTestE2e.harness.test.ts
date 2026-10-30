import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyStripeConnectRuntime } from './stripeConnectV2Semantics.ts';

describe('R8 Stripe Connect v2 API smoke harness', () => {
  it('documents fail-closed checklist when sandbox env is incomplete (not E2E GREEN)', () => {
    const c = classifyStripeConnectRuntime({
      ...process.env,
      M55_STRIPE_CONNECT_TESTMODE_ENABLED: undefined,
      M55_STRIPE_CONNECT_SECRET_KEY: undefined,
      STRIPE_SECRET_KEY: undefined,
      M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER: undefined,
    });
    assert.equal(c.secretKeyPresent, false);
    assert.equal(c.testModeExplicitlyEnabled, false);
  });
});
