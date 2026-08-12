import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { maskCheckoutRecoveryRef } from './checkoutRecoveryRef';
import { decideUnverifiedCheckoutReturn } from './postPaymentReturnDecision';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Shape of a real TEST session id, so masking is proven against the real length. */
const REAL_SHAPED_SESSION_ID =
  'cs_test_a1UpaKsAxnul0MMz38Y2zEgds0ALCYLJF4ruw5LtbGbdOApApultbAYmts';

describe('unverified checkout return — ownership decides, session id never does', () => {
  it('routes an owned buyer with a ready snapshot to the report', () => {
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'owned', hasVisibleSnapshot: true }),
      'open_report',
    );
  });

  it('routes an owned buyer whose snapshot is still building to owned recovery', () => {
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'owned', hasVisibleSnapshot: false }),
      'owned_recovery',
    );
  });

  it('fails closed for locked, expired and unresolved ownership', () => {
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'locked', hasVisibleSnapshot: false }),
      'fail_closed',
    );
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'expired', hasVisibleSnapshot: false }),
      'fail_closed',
    );
    assert.equal(decideUnverifiedCheckoutReturn(null), 'fail_closed');
  });

  it('never treats a snapshot alone as ownership', () => {
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'locked', hasVisibleSnapshot: true }),
      'fail_closed',
    );
    assert.equal(
      decideUnverifiedCheckoutReturn({ unlockState: 'expired', hasVisibleSnapshot: true }),
      'fail_closed',
    );
  });
});

describe('support reference masking', () => {
  it('never exposes the raw Checkout Session id', () => {
    const masked = maskCheckoutRecoveryRef(REAL_SHAPED_SESSION_ID);
    assert.ok(masked);
    assert.doesNotMatch(masked, /^cs_/);
    assert.ok(!REAL_SHAPED_SESSION_ID.includes(masked));
    assert.match(masked, /^M55-[0-9A-Z]{8}$/);
  });

  it('stays short enough that it cannot widen a 390px layout', () => {
    assert.equal(maskCheckoutRecoveryRef(REAL_SHAPED_SESSION_ID)?.length, 12);
  });

  it('is deterministic and distinguishes different sessions', () => {
    assert.equal(
      maskCheckoutRecoveryRef(REAL_SHAPED_SESSION_ID),
      maskCheckoutRecoveryRef(` ${REAL_SHAPED_SESSION_ID} `),
    );
    assert.notEqual(
      maskCheckoutRecoveryRef(REAL_SHAPED_SESSION_ID),
      maskCheckoutRecoveryRef('cs_test_otherSessionIdentifier0123456789'),
    );
  });

  it('returns nothing for values that are not Checkout Session ids', () => {
    assert.equal(maskCheckoutRecoveryRef(undefined), null);
    assert.equal(maskCheckoutRecoveryRef(''), null);
    assert.equal(maskCheckoutRecoveryRef('user_2abc'), null);
    assert.equal(maskCheckoutRecoveryRef('cs_a'), null);
  });
});

describe('processing route source contract', () => {
  const src = read('app/dtr/processing/page.tsx');

  it('consults ownership before rendering any failure state', () => {
    const unverifiedBranch = src.split('if (!sessionVerified.valid) {')[1] ?? '';
    const fallbackAt = unverifiedBranch.indexOf('<ProcessingFallback');
    const ownershipAt = unverifiedBranch.indexOf('resolveOwnedPostPaymentReturn');
    assert.ok(ownershipAt >= 0, 'unverified branch must consult ownership');
    assert.ok(fallbackAt >= 0, 'unverified branch must still keep a fail-closed fallback');
    assert.ok(ownershipAt < fallbackAt, 'ownership must be resolved before the failure UI');
  });

  it('sends an owned buyer to the report or to owned recovery, never to the sales LP', () => {
    const unverifiedBranch = (src.split('if (!sessionVerified.valid) {')[1] ?? '').split(
      '<ProcessingFallback',
    )[0]!;
    assert.match(unverifiedBranch, /'open_report'[\s\S]*redirect\('\/dtr\/core\?post_purchase=1'\)/);
    assert.match(unverifiedBranch, /'owned_recovery'[\s\S]*DTR_OWNED_RECOVERY_PROCESSING_PATH/);
    assert.doesNotMatch(unverifiedBranch, /redirect\('\/dtr\/lp'\)/);
  });

  it('passes only masked references into rendered UI', () => {
    assert.match(src, /recoveryRef=\{maskCheckoutRecoveryRef\(sessionIdFromUrl\)\}/);
    assert.match(src, /const recoveryRef = maskCheckoutRecoveryRef\(sessionVerified\.sessionId\)/);
    assert.doesNotMatch(src, /recoveryRef=\{sessionIdFromUrl/);
    assert.doesNotMatch(src, /recoveryRef=\{sessionVerified\.sessionId\}/);
  });

  it('keeps every checkout return on the canonical post-purchase destination', () => {
    const checkoutReturn = src.split('const sessionVerified =')[1] ?? '';
    assert.ok(checkoutReturn, 'checkout return branch must exist');
    assert.match(checkoutReturn, /redirect\('\/dtr\/core\?post_purchase=1'\)/);
    assert.doesNotMatch(checkoutReturn, /redirect\('\/dtr\/core'\)/);
  });
});

describe('processing route presentation', () => {
  it('breaks long unbroken references instead of widening the page', () => {
    const css = read('app/dtr/processing/processing.module.css');
    assert.match(css, /\.desc\s*\{[^}]*overflow-wrap:\s*anywhere/);
    assert.match(css, /\.recoveryRef\s*\{/);
  });

  it('renders no purchase call to action while a payment is being reconciled', () => {
    const client = read('components/dtr/DtrProcessingClient.tsx');
    const paidBranch = client.split('paymentConfirmed')[1] ?? '';
    assert.doesNotMatch(paidBranch, /再購入する(?!前に)/);
    assert.match(client, /再購入は不要です/);
  });

  it('accepts only masked references in the post-payment client surfaces', () => {
    for (const rel of ['components/dtr/DtrProcessingClient.tsx', 'components/dtr/PaidDtrAnalysisLoading.tsx']) {
      const componentSrc = read(rel);
      assert.match(componentSrc, /never a raw Checkout Session id/);
      assert.doesNotMatch(componentSrc, /cs_test_|cs_live_/);
    }
  });
});
