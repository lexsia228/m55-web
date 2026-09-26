import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  M55_R5_PURCHASE_ATTEMPT_CHECKOUT_IDEMPOTENCY_PREFIX_V1,
  buildPurchaseAttemptCheckoutIdempotencyKeyV1,
} from './r5PurchaseAttemptCheckoutIdempotency';

describe('r5PurchaseAttemptCheckoutIdempotency', () => {
  it('uses the frozen prefix and 72-character lowercase UUID key', () => {
    assert.equal(
      M55_R5_PURCHASE_ATTEMPT_CHECKOUT_IDEMPOTENCY_PREFIX_V1,
      'm55_r5_purchase_attempt_checkout_v1_',
    );
    assert.equal(M55_R5_PURCHASE_ATTEMPT_CHECKOUT_IDEMPOTENCY_PREFIX_V1.length, 36);
    const id = '01234567-89ab-cdef-0123-456789abcdef';
    const key = buildPurchaseAttemptCheckoutIdempotencyKeyV1(id);
    assert.equal(key, `m55_r5_purchase_attempt_checkout_v1_${id}`);
    assert.equal(key.length, 72);
    assert.ok(key.length <= 255);
  });

  it('is deterministic per purchase_attempt_id and differs across attempts', () => {
    const a = randomUUID();
    const b = randomUUID();
    assert.notEqual(a, b);
    const keyA = buildPurchaseAttemptCheckoutIdempotencyKeyV1(a);
    assert.equal(buildPurchaseAttemptCheckoutIdempotencyKeyV1(a), keyA);
    assert.notEqual(buildPurchaseAttemptCheckoutIdempotencyKeyV1(b), keyA);
  });

  it('does not accept purchaseContext, user, product, or generation as inputs', () => {
    const src = [
      buildPurchaseAttemptCheckoutIdempotencyKeyV1.toString(),
      M55_R5_PURCHASE_ATTEMPT_CHECKOUT_IDEMPOTENCY_PREFIX_V1,
    ].join('\n');
    assert.equal(buildPurchaseAttemptCheckoutIdempotencyKeyV1.length, 1);
    assert.doesNotMatch(src, /purchaseContextId/);
    assert.doesNotMatch(src, /userId/);
    assert.doesNotMatch(src, /productId/);
    assert.doesNotMatch(src, /scope_generation|checkoutSessionGeneration/);
  });

  it('rejects invalid, uppercase, and non-UUID identities', () => {
    const invalid = [
      '',
      '01234567-89AB-CDEF-0123-456789ABCDEF',
      '0123456789abcdef0123456789abcdef',
      'not-a-uuid',
      '01234567-89ab-cdef-0123-456789abcde',
    ];
    for (const value of invalid) {
      assert.throws(
        () => buildPurchaseAttemptCheckoutIdempotencyKeyV1(value),
        (error: unknown) => error instanceof Error && error.message === 'INVALID_PURCHASE_ATTEMPT_ID',
      );
    }
  });
});
