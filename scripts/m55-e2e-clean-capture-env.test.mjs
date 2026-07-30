/**
 * Unit tests for clean-capture Clerk test-key classification and resolution.
 * Uses synthetic prefix-only fixtures — never real Clerk credentials.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCleanCaptureServerEnv,
  M55_E2E_CLEAN_CAPTURE_ENV,
  resolveClerkTestKeys,
  validateClerkTestKeyMaterial,
} from './m55-e2e-clean-capture-env.mjs';

const SYNTH_PK = 'pk_test_synthetic_unit_only';
const SYNTH_SK = 'sk_test_synthetic_unit_only';

describe('validateClerkTestKeyMaterial', () => {
  it('accepts pk_test_ + sk_test_ prefixes', () => {
    assert.doesNotThrow(() => validateClerkTestKeyMaterial(SYNTH_PK, SYNTH_SK));
  });

  it('rejects missing publishable key', () => {
    assert.throws(
      () => validateClerkTestKeyMaterial('', SYNTH_SK),
      /Clerk test keys missing/,
    );
  });

  it('rejects missing secret key', () => {
    assert.throws(
      () => validateClerkTestKeyMaterial(SYNTH_PK, ''),
      /Clerk test keys missing/,
    );
  });

  it('rejects pk_live_', () => {
    assert.throws(
      () => validateClerkTestKeyMaterial('pk_live_synthetic_unit_only', SYNTH_SK),
      /must not be pk_live_/,
    );
  });

  it('rejects sk_live_', () => {
    assert.throws(
      () => validateClerkTestKeyMaterial(SYNTH_PK, 'sk_live_synthetic_unit_only'),
      /must not be sk_live_/,
    );
  });

  it('rejects unresolved GitHub expressions without echoing values', () => {
    const expr = '${{ secrets.M55_E2E_CLERK_PUBLISHABLE_KEY }}';
    assert.throws(() => validateClerkTestKeyMaterial(expr, SYNTH_SK), /unresolved Clerk secret expression/);
    try {
      validateClerkTestKeyMaterial(expr, SYNTH_SK);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      assert.equal(message.includes('pk_test_'), false);
      assert.equal(message.includes('sk_test_'), false);
    }
  });
});

describe('resolveClerkTestKeys', () => {
  it('prefers process env over keyless file', () => {
    const resolved = resolveClerkTestKeys({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: SYNTH_PK,
      CLERK_SECRET_KEY: SYNTH_SK,
    });
    assert.equal(resolved.source, 'env');
    assert.equal(resolved.publishableKey, SYNTH_PK);
    assert.equal(resolved.secretKey, SYNTH_SK);
  });

  it('accepts dedicated M55_E2E_CLERK_* env aliases', () => {
    const resolved = resolveClerkTestKeys({
      M55_E2E_CLERK_PUBLISHABLE_KEY: SYNTH_PK,
      M55_E2E_CLERK_SECRET_KEY: SYNTH_SK,
    });
    assert.equal(resolved.source, 'env');
  });

  it('does not require keyless file when env keys are present', () => {
    assert.doesNotThrow(() =>
      buildCleanCaptureServerEnv({
        [M55_E2E_CLEAN_CAPTURE_ENV]: '1',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: SYNTH_PK,
        CLERK_SECRET_KEY: SYNTH_SK,
      }),
    );
  });
});

describe('buildCleanCaptureServerEnv', () => {
  it('maps classified keys without logging them', () => {
    const env = buildCleanCaptureServerEnv({
      [M55_E2E_CLEAN_CAPTURE_ENV]: '1',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: SYNTH_PK,
      CLERK_SECRET_KEY: SYNTH_SK,
    });
    assert.equal(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, SYNTH_PK);
    assert.equal(env.CLERK_SECRET_KEY, SYNTH_SK);
    assert.equal(env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED, '1');
  });

  it('refuses without M55_E2E_CLEAN_CAPTURE=1', () => {
    assert.throws(
      () =>
        buildCleanCaptureServerEnv({
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: SYNTH_PK,
          CLERK_SECRET_KEY: SYNTH_SK,
        }),
      /M55_E2E_CLEAN_CAPTURE=1 is required/,
    );
  });
});
