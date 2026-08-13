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
const ENTITLEMENTS_ROUTE = join(process.cwd(), 'app/api/me/entitlements/route.ts');
const PURCHASE_CHECKOUT = join(process.cwd(), 'app/api/purchase/checkout/route.ts');
const REPLY_CHECKOUT = join(process.cwd(), 'app/api/reply-tickets/checkout/route.ts');

function stripLegacyRemovalTestComments(src: string): string {
  return src.replace(/\/\/ legacy-removal-test:.*$/gm, '');
}

describe('checkoutWebhookPriceLanes — legacy subscription runtime removal', () => {
  it('webhook has no legacy subscription DB access or premium invoice grant helpers', () => {
    const src = stripLegacyRemovalTestComments(readFileSync(WEBHOOK_ROUTE, 'utf8'));
    assert.equal(src.includes("from('subscriptions')"), false);
    assert.equal(src.includes("from('invoice_dtr_grants')"), false);
    assert.equal(src.includes('STRIPE_PRICE_PREMIUM_MONTHLY'), false);
    assert.equal(src.includes('upsertSubscriptionMapping'), false);
    assert.equal(src.includes('handleInvoicePaid'), false);
    assert.equal(src.includes('m55_p:month:'), false);
    assert.ok(src.includes('legacy_subscription_checkout_ignored'));
    assert.ok(src.includes('legacy_invoice_paid_ignored'));
  });

  it('webhook keeps one-time fulfillment, refund, and reply ticket wiring', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf8');
    assert.ok(src.includes('fulfillDtrCoreFromCheckoutSessionId'));
    assert.ok(src.includes('handleChargeRefunded'));
    assert.ok(src.includes('handleReplyTicketCheckoutCompleted'));
    assert.ok(src.includes('ALLOWED_ONE_TIME_PRODUCTS'));
    assert.ok(src.includes("from('entitlement_rights')"));
    assert.ok(src.includes("from('one_time_fulfillments')"));
  });

  it('legacy subscription logs omit PII and payload fields', () => {
    const src = readFileSync(WEBHOOK_ROUTE, 'utf8');
    const subBlock = src.slice(
      src.indexOf('legacy_subscription_checkout_ignored'),
      src.indexOf('legacy_subscription_checkout_ignored') + 400
    );
    const invoiceBlock = src.slice(
      src.indexOf('legacy_invoice_paid_ignored'),
      src.indexOf('legacy_invoice_paid_ignored') + 400
    );
    for (const block of [subBlock, invoiceBlock]) {
      assert.equal(block.includes('client_reference_id'), false);
      assert.equal(block.includes('userId'), false);
      assert.equal(block.includes('customer_email'), false);
      assert.equal(block.includes('subscription_id'), false);
    }
  });

  it('entitlements API has no subscriptions table access and keeps response shape', () => {
    const src = readFileSync(ENTITLEMENTS_ROUTE, 'utf8');
    assert.equal(src.includes("from('subscriptions')"), false);
    assert.ok(src.includes("const tier = 'free'"));
    assert.ok(src.includes('retention_days'));
    assert.ok(src.includes('chat_daily_limit'));
    assert.ok(src.includes('tarot_daily_limit'));
    assert.ok(src.includes('dtr_rights'));
    assert.ok(src.includes("from('entitlement_rights')"));
    assert.ok(src.includes("from('entitlements')"));
  });
});

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
  it('reply checkout allows upgrade only (legacy ¥500 new sales stopped)', () => {
    assert.equal(isAllowedReplyTicketCheckoutProductKey(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY), false);
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
    assert.ok(src.includes('resolveOneTimeStripePriceId'));
    assert.ok(src.includes('isDtrCoreSavedReportOneTimeProduct'));
    assert.ok(src.includes('isDtrCoreLightToFullUpgradeProduct'));
    assert.ok(src.includes('/api/reply-tickets/checkout'));
  });

  it('reply-tickets checkout wires upgrade Stripe env only', () => {
    const src = readFileSync(REPLY_CHECKOUT, 'utf8');
    assert.ok(src.includes('STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'));
    assert.doesNotMatch(src, /STRIPE_PRICE_ADDITIONAL_REPLY_TICKET/);
    assert.ok(src.includes('parsed.productKey'));
  });
});
