import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { classifyStripeConnectRuntime } from './stripeConnectV2Semantics.ts';

const ALIGNMENT_ONLY_ENV_BODY = (ref = 'aaaaaaaaaaaaaaaa') =>
  [
    `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
    'SUPABASE_SERVICE_ROLE_KEY=sb_secret_harness_only',
    `M55_R8_ISOLATED_DATABASE_URL=postgresql://postgres:x@db.${ref}.supabase.co:5432/postgres`,
    `M55_R8_ISOLATED_SUPABASE_PROJECT_REF=${ref}`,
  ].join('\n');

describe('R8 Stripe Connect v2 API smoke harness', () => {
  it('smoke script fails closed without isolated env file (exit 2, no API)', () => {
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
          M55_R8_ISOLATED_ENV_FILE: '.env.m55-r8-isolated.local.missing-for-harness',
          STRIPE_SECRET_KEY: '',
          M55_STRIPE_CONNECT_SECRET_KEY: '',
          M55_STRIPE_CONNECT_TESTMODE_ENABLED: '',
          M55_PUBLIC_ORIGIN: '',
          NEXT_PUBLIC_SUPABASE_URL: '',
          SUPABASE_SERVICE_ROLE_KEY: '',
          M55_R8_ISOLATED_DATABASE_URL: '',
          M55_R8_INTEGRATION_DATABASE_URL: '',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 2);
    assert.match(
      result.stderr ?? '',
      /M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED|M55_R8_STRIPE_CONNECT_E2E_INCOMPLETE/,
    );
  });

  it('blocks Production shell before isolated env can mask runtime as development', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-r8-smoke-prod-'));
    const envPath = join(dir, '.env.m55-r8-isolated.local');
    writeFileSync(envPath, ALIGNMENT_ONLY_ENV_BODY(), 'utf8');

    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          VERCEL_ENV: 'production',
          M55_R8_ISOLATED_ENV_FILE: envPath,
          STRIPE_SECRET_KEY: 'sk_test_harness_shell_must_not_win',
          M55_STRIPE_CONNECT_TESTMODE_ENABLED: 'true',
          M55_PUBLIC_ORIGIN: 'http://localhost:3000',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr ?? '', /Production runtime/);
    assert.doesNotMatch(result.stdout ?? '', /"ok":true/);
  });

  it('does not use shell Stripe credentials when isolated file omits them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm55-r8-smoke-shell-'));
    const envPath = join(dir, '.env.m55-r8-isolated.local');
    writeFileSync(envPath, ALIGNMENT_ONLY_ENV_BODY(), 'utf8');

    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/m55-r8-stripe-connect-v2-isolated-test-e2e.mjs'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'development',
          VERCEL_ENV: 'development',
          M55_R8_ISOLATED_ENV_FILE: envPath,
          STRIPE_SECRET_KEY: 'sk_test_harness_shell_must_not_win',
          M55_STRIPE_CONNECT_TESTMODE_ENABLED: 'true',
          M55_PUBLIC_ORIGIN: 'http://localhost:3000',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr ?? '', /M55_R8_STRIPE_CONNECT_E2E_INCOMPLETE/);
    assert.match(result.stderr ?? '', /shell fallback prohibited/);
    assert.doesNotMatch(result.stdout ?? '', /"ok":true/);
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
