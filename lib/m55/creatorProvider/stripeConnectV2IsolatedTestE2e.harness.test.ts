import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { classifyStripeConnectRuntime } from './stripeConnectV2Semantics.ts';

describe('R8 Stripe Connect v2 API smoke harness', () => {
  it('smoke script fails closed without secrets (exit 2, no API)', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          STRIPE_SECRET_KEY: '',
          M55_STRIPE_CONNECT_SECRET_KEY: '',
          M55_STRIPE_CONNECT_TESTMODE_ENABLED: '',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr ?? '', /M55_R8_STRIPE_CONNECT_E2E_INCOMPLETE/);
  });

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
