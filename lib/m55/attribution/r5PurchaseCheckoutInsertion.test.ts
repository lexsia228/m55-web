import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const PURCHASE = readFileSync(
  join(process.cwd(), 'app/api/purchase/checkout/route.ts'),
  'utf8',
);
const REPLY = readFileSync(
  join(process.cwd(), 'app/api/reply-tickets/checkout/route.ts'),
  'utf8',
);

describe('r5PurchaseCheckoutInsertion', () => {
  it('locks before payable URL and uses frozen attempt Stripe idempotency', () => {
    assert.match(PURCHASE, /callLockPurchaseAttemptRpcV1/);
    assert.match(PURCHASE, /buildPurchaseAttemptStripeIdempotencyKeyV1/);
    assert.match(PURCHASE, /callBindCheckoutSessionRpcV1/);
    assert.match(PURCHASE, /M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY/);
    const createIdx = PURCHASE.indexOf('checkout.sessions.create');
    const lockIdx = PURCHASE.indexOf('callLockPurchaseAttemptRpcV1');
    const bindIdx = PURCHASE.lastIndexOf('callBindCheckoutSessionRpcV1');
    assert.equal(lockIdx > 0 && lockIdx < createIdx, true);
    assert.equal(bindIdx > createIdx, true);
  });

  it('terminalizes confirmed unusable sessions before minting a new OPEN attempt', () => {
    assert.match(PURCHASE, /callTerminalizePurchaseAttemptRpcV1/);
    assert.match(PURCHASE, /EXPIRED/);
    assert.match(PURCHASE, /CANCELLED/);
  });

  it('does not accept purchase_attempt_id from HTTP body', () => {
    assert.doesNotMatch(PURCHASE, /body\.purchase_attempt_id/);
    assert.doesNotMatch(PURCHASE, /searchParams\.get\(['"]purchase_attempt_id/);
  });

  it('upgrade checkout locks; additional_reply_ticket has no lock path', () => {
    assert.match(REPLY, /callLockPurchaseAttemptRpcV1/);
    assert.match(REPLY, /isUpgrade/);
    assert.doesNotMatch(REPLY, /additional_reply_ticket[\s\S]{0,80}callLockPurchaseAttemptRpcV1/);
  });
});
