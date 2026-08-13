import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  computeLightToFullUpgradePurchasedDelta,
  DTR_CORE_FULL_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_V1_PRODUCT_KEY,
  isFullEquivalentReplyWallet,
  isAllowedReplyTicketCheckoutProductKey,
  isLegacyAdditionalReplyTicketProductKey,
  isLightToFullUpgradeProductKey,
  isReplyTicketFulfillmentProductKey,
  LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN,
  REPLY_TICKET_FULL_MAX_PURCHASED_COUNT,
  REPLY_TICKET_FULL_INITIAL_PURCHASED_GRANT,
  REPLY_TICKET_INCLUDED_COUNT,
  REPLY_TICKET_TOTAL_CAP_PER_REPORT,
} from './replyTicketCheckoutConstants';

describe('replyTicketCheckoutConstants — pricing architecture SSOT', () => {
  it('keeps total cap 5 and light included 1', () => {
    assert.equal(REPLY_TICKET_TOTAL_CAP_PER_REPORT, 5);
    assert.equal(REPLY_TICKET_INCLUDED_COUNT, 1);
    assert.equal(REPLY_TICKET_FULL_MAX_PURCHASED_COUNT, 4);
  });

  it('defines new SKU keys and legacy additional_reply_ticket', () => {
    assert.equal(DTR_CORE_LIGHT_V1_PRODUCT_KEY, 'dtr_core_light_v1');
    assert.equal(DTR_CORE_FULL_V1_PRODUCT_KEY, 'dtr_core_full_v1');
    assert.equal(
      DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
      'dtr_core_light_to_full_upgrade_v1'
    );
    assert.equal(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY, 'additional_reply_ticket');
    assert.equal(LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN, 500);
  });

  it('computeLightToFullUpgradePurchasedDelta fills purchased_count to 4', () => {
    assert.equal(computeLightToFullUpgradePurchasedDelta(0), 4);
    assert.equal(computeLightToFullUpgradePurchasedDelta(2), 2);
    assert.equal(computeLightToFullUpgradePurchasedDelta(4), 0);
  });

  it('isFullEquivalentReplyWallet matches cap rules for upgrade CTA hide', () => {
    assert.equal(isFullEquivalentReplyWallet(1, 4), true);
    assert.equal(isFullEquivalentReplyWallet(1, 3), false);
    assert.equal(isFullEquivalentReplyWallet(5, 0), true);
    assert.equal(isFullEquivalentReplyWallet(1, 2), false);
  });

  it('FULL initial purchased grant alias is 4 (1+4 model)', () => {
    assert.equal(REPLY_TICKET_FULL_INITIAL_PURCHASED_GRANT, 4);
  });

  it('reply-tickets checkout product keys allow upgrade only (legacy new sales stopped)', () => {
    assert.equal(isAllowedReplyTicketCheckoutProductKey('additional_reply_ticket'), false);
    assert.equal(isAllowedReplyTicketCheckoutProductKey('dtr_core_light_to_full_upgrade_v1'), true);
    assert.equal(isAllowedReplyTicketCheckoutProductKey('dtr_core_light_v1'), false);
    assert.equal(isLightToFullUpgradeProductKey('dtr_core_light_to_full_upgrade_v1'), true);
  });

  it('reply ticket fulfillment product keys include legacy + upgrade only', () => {
    assert.equal(isLegacyAdditionalReplyTicketProductKey('additional_reply_ticket'), true);
    assert.equal(
      isReplyTicketFulfillmentProductKey('dtr_core_light_to_full_upgrade_v1'),
      true
    );
    assert.equal(isReplyTicketFulfillmentProductKey('dtr_core_full_v1'), false);
    assert.equal(isReplyTicketFulfillmentProductKey('additional_reply_ticket'), true);
  });
});
