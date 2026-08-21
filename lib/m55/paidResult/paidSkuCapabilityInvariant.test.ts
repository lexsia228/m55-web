/**
 * Fail-closed SKU capability regression — commercial promise → fulfillment → wallet → compose.
 * Human visual review must not be the only gate for missing paid capabilities.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCommercialProduct } from '../contracts/m55CommercialFunnelContract';
import {
  getConsultRoomPreviewRoomData,
  resolveConsultRoomPreviewScenario,
  type ConsultRoomPreviewRoomData,
} from '../fixtures/consultRoomPreviewFixture';
import {
  DTR_CORE_FULL_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_V1_PRODUCT_KEY,
  REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  REPLY_TICKET_INCLUDED_COUNT,
} from '../reply/replyTicketCheckoutConstants';
import { computePurchasedTopUpToFullEquivalent } from '../reply/replyWalletFulfillmentMath';

/** Mirrors ConsultRoom: compose when available_count > 0 and effective_state is writable. */
function isConsultComposeEligible(room: ConsultRoomPreviewRoomData): boolean {
  const available = room.wallet?.available_count ?? 0;
  const state = room.effective_state ?? room.thread.state;
  return available > 0 && state === 'writable';
}

function lightNewPurchaseWalletExpectation() {
  return {
    initial_included_count: REPLY_TICKET_INCLUDED_COUNT,
    purchased_count: 0,
    consumed_count: 0,
    available_count: REPLY_TICKET_INCLUDED_COUNT,
  };
}

function fullNewPurchaseWalletExpectation() {
  const afterIncludedGrant = {
    initialIncludedCount: REPLY_TICKET_INCLUDED_COUNT,
    purchasedCount: 0,
    consumedCount: 0,
    availableCount: REPLY_TICKET_INCLUDED_COUNT,
  };
  const topUp = computePurchasedTopUpToFullEquivalent(afterIncludedGrant);
  assert.equal(topUp.skipped, false);
  return {
    initial_included_count: REPLY_TICKET_INCLUDED_COUNT,
    purchased_count: topUp.nextPurchasedCount,
    consumed_count: 0,
    available_count: topUp.nextAvailableCount,
  };
}

describe('paid SKU capability invariant — commercial → fulfillment → wallet → compose', () => {
  const lightCommercial = getCommercialProduct('selfPremiumLight');
  const fullCommercial = getCommercialProduct('selfPremiumFull');

  it('LIGHT: commercial contract advertises exactly 1 additional reading', () => {
    assert.equal(lightCommercial.productKey, DTR_CORE_LIGHT_V1_PRODUCT_KEY);
    assert.equal(lightCommercial.additionalThemes, 1);
    assert.equal(lightCommercial.priceJpy, 1000);
  });

  it('FULL: commercial contract advertises exactly 5 additional readings total', () => {
    assert.equal(fullCommercial.productKey, DTR_CORE_FULL_V1_PRODUCT_KEY);
    assert.equal(fullCommercial.additionalThemes, 5);
    assert.equal(fullCommercial.priceJpy, 1480);
  });

  it('LIGHT: fulfillment grant expectation matches 1 = 1 + 0 at new purchase', () => {
    const wallet = lightNewPurchaseWalletExpectation();
    assert.equal(
      lightCommercial.additionalThemes,
      wallet.initial_included_count + wallet.purchased_count,
    );
    assert.equal(wallet.available_count, lightCommercial.additionalThemes);
    assert.equal(wallet.consumed_count, 0);
  });

  it('FULL: fulfillment grant expectation matches 5 = 1 + 4 at new purchase', () => {
    const wallet = fullNewPurchaseWalletExpectation();
    assert.equal(
      fullCommercial.additionalThemes,
      wallet.initial_included_count + wallet.purchased_count,
    );
    assert.equal(wallet.available_count, fullCommercial.additionalThemes);
    assert.equal(wallet.purchased_count, REPLY_TICKET_FULL_MAX_PURCHASED_COUNT);
    assert.equal(wallet.consumed_count, 0);
  });

  it('advertised capability > 0 implies new-purchase compose eligibility (LIGHT wallet model)', () => {
    const wallet = lightNewPurchaseWalletExpectation();
    assert.ok(lightCommercial.additionalThemes > 0);
    assert.ok(wallet.available_count > 0);
    const room: ConsultRoomPreviewRoomData = {
      thread: {
        credits_total: wallet.available_count,
        credits_remaining: wallet.available_count,
        state: 'writable',
      },
      messages: [],
      wallet: { ...wallet, status: 'active' },
      effective_credits_remaining: wallet.available_count,
      effective_state: 'writable',
    };
    assert.equal(isConsultComposeEligible(room), true);
  });

  it('advertised capability > 0 implies new-purchase compose eligibility (FULL wallet model)', () => {
    const wallet = fullNewPurchaseWalletExpectation();
    assert.ok(fullCommercial.additionalThemes > 0);
    assert.ok(wallet.available_count > 0);
    const room: ConsultRoomPreviewRoomData = {
      thread: {
        credits_total: wallet.available_count,
        credits_remaining: wallet.available_count,
        state: 'writable',
      },
      messages: [],
      wallet: { ...wallet, status: 'active' },
      effective_credits_remaining: wallet.available_count,
      effective_state: 'writable',
    };
    assert.equal(isConsultComposeEligible(room), true);
  });
});

describe('paid SKU capability invariant — dev preview fixture default', () => {
  it('omitted consultWallet defaults to usable purchased state, not exhausted', () => {
    assert.equal(resolveConsultRoomPreviewScenario(undefined), 'available');
    const room = getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario(undefined));
    assert.ok((room.wallet?.available_count ?? 0) > 0);
    assert.equal(room.effective_state, 'writable');
    assert.equal(isConsultComposeEligible(room), true);
  });

  it('explicit purchase scenario remains intentional 0 / read_only QA fixture', () => {
    assert.equal(resolveConsultRoomPreviewScenario('purchase'), 'purchase');
    const room = getConsultRoomPreviewRoomData('purchase');
    assert.equal(room.wallet?.available_count, 0);
    assert.equal(room.effective_state, 'read_only');
    assert.equal(isConsultComposeEligible(room), false);
  });

  it('preserves explicit negative-state QA scenarios', () => {
    for (const scenario of ['exhausted', 'full0', 'light0'] as const) {
      const room = getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario(scenario));
      assert.equal(room.wallet?.available_count, 0);
      assert.equal(room.effective_state, 'read_only');
      assert.equal(isConsultComposeEligible(room), false);
    }
  });
});
