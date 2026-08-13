import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  isAllowedReplyTicketCheckoutProductKey,
  isLegacyAdditionalReplyTicketProductKey,
  isReplyTicketFulfillmentProductKey,
  REPLY_TICKET_CHECKOUT_ERROR_CODES,
} from './replyTicketCheckoutConstants';
import {
  evaluateReplyTicketCheckoutWalletCap,
  validateReplyTicketCheckoutBody,
  type ReplyTicketWalletGateRow,
} from './replyTicketCheckoutValidate';

const REPLY_CHECKOUT_ROUTE = join(
  process.cwd(),
  'app/api/reply-tickets/checkout/route.ts'
);

function wallet(
  initial: number,
  purchased: number,
  available = initial + purchased
): ReplyTicketWalletGateRow {
  return {
    id: 'w-1',
    status: 'active',
    initial_included_count: initial,
    purchased_count: purchased,
    available_count: available,
  };
}

describe('reply-tickets checkout — legacy ¥500 new sales stopped', () => {
  it('exposes sales_stopped in the checkout error contract', () => {
    assert.ok(REPLY_TICKET_CHECKOUT_ERROR_CODES.includes('sales_stopped'));
  });

  it('rejects omitted product_key instead of defaulting to legacy ¥500', () => {
    const parsed = validateReplyTicketCheckoutBody({
      report_instance_id: 'snap-1',
    });
    assert.deepEqual(parsed, { error: 'invalid_request' });
  });

  it('rejects explicit additional_reply_ticket for new checkout', () => {
    const parsed = validateReplyTicketCheckoutBody({
      report_instance_id: 'snap-1',
      product_key: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
    });
    assert.deepEqual(parsed, { error: 'sales_stopped' });
  });

  it('still accepts upgrade product key in body validation', () => {
    const parsed = validateReplyTicketCheckoutBody({
      report_instance_id: 'snap-1',
      productKey: DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
    });
    assert.equal('error' in parsed, false);
    if ('error' in parsed) return;
    assert.equal(parsed.productKey, DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY);
  });

  it('blocks legacy wallet-cap path with sales_stopped even below total cap 5', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(wallet(1, 0), ADDITIONAL_REPLY_TICKET_PRODUCT_KEY),
      'sales_stopped'
    );
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(wallet(1, 2), ADDITIONAL_REPLY_TICKET_PRODUCT_KEY),
      'sales_stopped'
    );
  });

  it('allows upgrade checkout when eligible and keeps cap at total 5', () => {
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(1, 2),
        DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY
      ),
      null
    );
    assert.equal(
      evaluateReplyTicketCheckoutWalletCap(
        wallet(1, 4),
        DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY
      ),
      'cap_reached'
    );
  });

  it('keeps legacy product key parseable for webhook fulfillment only', () => {
    assert.equal(isLegacyAdditionalReplyTicketProductKey(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY), true);
    assert.equal(isReplyTicketFulfillmentProductKey(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY), true);
    assert.equal(isAllowedReplyTicketCheckoutProductKey(ADDITIONAL_REPLY_TICKET_PRODUCT_KEY), false);
    assert.equal(
      isAllowedReplyTicketCheckoutProductKey(DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY),
      true
    );
  });

  it('does not wire legacy Stripe price env on the checkout route', () => {
    const src = readFileSync(REPLY_CHECKOUT_ROUTE, 'utf8');
    assert.doesNotMatch(src, /STRIPE_PRICE_ADDITIONAL_REPLY_TICKET/);
    assert.match(src, /STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1/);
  });
});
