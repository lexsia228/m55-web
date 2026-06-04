import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePurchasedTopUpToFullEquivalent } from './replyWalletFulfillmentMath';

describe('replyWalletFulfillmentMath — FULL 1+4 and upgrade top-up', () => {
  it('FULL初回相当: light unused → purchased 4, available 5', () => {
    const plan = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 0,
      consumedCount: 0,
      availableCount: 1,
    });
    assert.equal(plan.skipped, false);
    assert.equal(plan.purchasedDelta, 4);
    assert.equal(plan.nextPurchasedCount, 4);
    assert.equal(plan.nextAvailableCount, 5);
    assert.equal(plan.availableGrantDelta, 4);
  });

  it('ライト1件使用済み upgrade → purchased 4, available 4', () => {
    const plan = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 0,
      consumedCount: 1,
      availableCount: 0,
    });
    assert.equal(plan.purchasedDelta, 4);
    assert.equal(plan.nextAvailableCount, 4);
    assert.equal(plan.availableGrantDelta, 4);
  });

  it('旧500円2回購入済み → upgrade delta 2 only', () => {
    const plan = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 2,
      consumedCount: 0,
      availableCount: 3,
    });
    assert.equal(plan.purchasedDelta, 2);
    assert.equal(plan.nextPurchasedCount, 4);
    assert.equal(plan.nextAvailableCount, 5);
  });

  it('purchased_count>=4 → skipped, no duplicate grant', () => {
    const plan = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 4,
      consumedCount: 1,
      availableCount: 4,
    });
    assert.equal(plan.skipped, true);
    assert.equal(plan.purchasedDelta, 0);
  });

  it('available never exceeds cap 5', () => {
    const plan = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 2,
      consumedCount: 2,
      availableCount: 1,
    });
    assert.equal(plan.nextAvailableCount, 3);
    assert.ok(plan.nextAvailableCount <= 5);
  });

  it('legacy path math: +1 purchased would be separate; top-up does not apply at cap', () => {
    const atCap = computePurchasedTopUpToFullEquivalent({
      initialIncludedCount: 1,
      purchasedCount: 4,
      consumedCount: 0,
      availableCount: 5,
    });
    assert.equal(atCap.skipped, true);
  });
});
