import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
} from '../../oneTimeCheckout';
import { COMPATIBILITY_REPORT_FULL_PRODUCT_KEY } from '../compatibility/compatibilityCommerceAuthority';
import { ADDITIONAL_REPLY_TICKET_PRODUCT_KEY } from '../reply/replyTicketCheckoutConstants';
import {
  isCheckoutProductAttributionEligibleV1,
  mapCheckoutProductIdToCreatorCashProductKeyV1,
} from './r5PurchaseAttemptProductMap';

describe('r5PurchaseAttemptProductMap', () => {
  it('maps light and legacy static to M55_PREMIUM_REPORT_LIGHT', () => {
    assert.equal(DTR_CORE_LIGHT_V1, 'dtr_core_light_v1');
    assert.equal(
      mapCheckoutProductIdToCreatorCashProductKeyV1(DTR_CORE_LIGHT_V1),
      'M55_PREMIUM_REPORT_LIGHT',
    );
    assert.equal(
      mapCheckoutProductIdToCreatorCashProductKeyV1(DTR_CORE_STATIC_V1),
      'M55_PREMIUM_REPORT_LIGHT',
    );
    assert.equal(isCheckoutProductAttributionEligibleV1(DTR_CORE_LIGHT_V1), true);
    assert.equal(isCheckoutProductAttributionEligibleV1(DTR_CORE_STATIC_V1), true);
  });

  it('maps full to M55_PREMIUM_REPORT_FULL', () => {
    assert.equal(DTR_CORE_FULL_V1, 'dtr_core_full_v1');
    assert.equal(
      mapCheckoutProductIdToCreatorCashProductKeyV1(DTR_CORE_FULL_V1),
      'M55_PREMIUM_REPORT_FULL',
    );
    assert.equal(isCheckoutProductAttributionEligibleV1(DTR_CORE_FULL_V1), true);
  });

  it('excludes upgrade, reply, compatibility, pair, and unknown products', () => {
    const excluded = [
      DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
      ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
      'PAIR_PREMIUM',
      COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
      'ADDITIONAL_INTERPRETATION',
      '',
    ];
    for (const productId of excluded) {
      assert.equal(mapCheckoutProductIdToCreatorCashProductKeyV1(productId), null);
      assert.equal(isCheckoutProductAttributionEligibleV1(productId), false);
    }
  });
});
