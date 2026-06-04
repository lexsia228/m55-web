import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLOWED_ONE_TIME_PRODUCTS,
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
  DTR_CORE_SAVED_REPORT_ONE_TIME_PRODUCTS,
  getOneTimeStripePriceEnvName,
  isDtrCoreLightToFullUpgradeProduct,
  isDtrCoreSavedReportOneTimeProduct,
} from '../oneTimeCheckout';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  isAllowedReplyTicketCheckoutProductKey,
  isReplyTicketFulfillmentProductKey,
} from './reply/replyTicketCheckoutConstants';

const WEBHOOK_ROUTE = join(process.cwd(), 'app/api/stripe/webhook/route.ts');
const PURCHASE_CHECKOUT = join(process.cwd(), 'app/api/purchase/checkout/route.ts');
const REPLY_CHECKOUT = join(process.cwd(), 'app/api/reply-tickets/checkout/route.ts');

describe('checkoutWebhookPriceLanes — oneTimeCheckout SSOT', () => {
  it('DTR_CORE_STATIC_V1 is light-equivalent saved report SKU', () => {
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_STATIC_V1), true);
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_LIGHT_V1), true);
    assert.equal(DTR_CORE_LIGHT_V1, 'dtr_core_light_v1');
  });

  it('dtr_core_full_v1 is saved report FULL SKU with env candidate', () => {
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_FULL_V1), true);
    assert.equal(getOneTimeStripePriceEnvName(DTR_CORE_FULL_V1), 'STRIPE_PRICE_DTR_CORE_FULL_V1');
  });

  it('upgrade SKU is allowed one-time but not on /api/purchase/checkout', () => {
    assert.equal(ALLOWED_ONE_TIME_PRODUCTS.has(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), true);
    assert.equal(isDtrCoreSavedReportOneTimeProduct(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), false);
    assert.equal(isDtrCoreLightToFullUpgradeProduct(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1), true);
    assert.equal(DTR_CORE_SAVED_REPORT_ONE_TIME_PRODUCTS.size, 3);
  });

  it('lists legacy static env candidate', () => {
    assert.equal(
      getOneTimeStripePriceEnvName(DTR_CORE_STATIC_V1),
      'STRIPE_PRICE_DTR_CORE_STATIC_V1'
    );
  });
});

describe('checkoutWebhookPriceLanes — reply + webhook routing', () => {
  it('reply checkout allows legacy and upgrade product keys', () => {
    assert.equal(isAllowedReplyTicketCheckoutProductKey(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY), true);
    assert.equal(
      isAllowedReplyTicketCheckoutProductKey('dtr_core_light_to_full_upgrade_v1'),
      true
    );
    assert.equal(isAllowedReplyTicketCheckoutProductKey('dtr_core_full_v1'), false);
  });

  it('webhook reply lane uses isReplyTicketFulfillmentProductKey (legacy + upgrade)', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf8');
    assert.ok(src.includes('isReplyTicketFulfillmentProductKey'));
    assert.ok(src.includes("from '../../../../lib/oneTimeCheckout'"));
    assert.ok(src.includes('ALLOWED_ONE_TIME_PRODUCTS'));
    assert.equal(
      src.includes('metadataProductKey === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY'),
      false
    );
    assert.equal(isReplyTicketFulfillmentProductKey('additional_reply_ticket'), true);
    assert.equal(isReplyTicketFulfillmentProductKey('dtr_core_light_to_full_upgrade_v1'), true);
  });

  it('purchase checkout maps light/full/static env and rejects upgrade on this route', () => {
    const src = readFileSync(PURCHASE_CHECKOUT, 'utf8');
    assert.ok(src.includes('getOneTimeStripePriceEnvName'));
    assert.ok(src.includes('isDtrCoreSavedReportOneTimeProduct'));
    assert.ok(src.includes('isDtrCoreLightToFullUpgradeProduct'));
    assert.ok(src.includes('/api/reply-tickets/checkout'));
  });

  it('reply-tickets checkout wires upgrade Stripe env', () => {
    const src = readFileSync(REPLY_CHECKOUT, 'utf8');
    assert.ok(src.includes('STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'));
    assert.ok(src.includes('STRIPE_PRICE_ADDITIONAL_REPLY_TICKET'));
    assert.ok(src.includes('parsed.productKey'));
  });
});
