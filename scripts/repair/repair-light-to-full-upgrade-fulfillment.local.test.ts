import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { validateUpgradeStripeSession } from './repair-light-to-full-upgrade-fulfillment';

describe('validateUpgradeStripeSession', () => {
  const base = {
    livemode: true,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 600,
    currency: 'jpy',
    client_reference_id: 'user_test',
    metadata: {
      product_key: 'dtr_core_light_to_full_upgrade_v1',
      report_instance_id: 'ffa97f03-47cf-4fdd-b6ea-2dc0f40203f7',
    },
  } as unknown as Stripe.Checkout.Session;

  it('accepts canonical LIVE upgrade session shape', () => {
    process.env.STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1 = 'price_test';
    const v = validateUpgradeStripeSession(
      base,
      'user_test',
      'ffa97f03-47cf-4fdd-b6ea-2dc0f40203f7',
    );
    assert.equal(Object.values(v).every(Boolean), true);
  });

  it('rejects wrong product key', () => {
    process.env.STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1 = 'price_test';
    const bad = {
      ...base,
      metadata: { ...base.metadata, product_key: 'additional_reply_ticket' },
    } as unknown as Stripe.Checkout.Session;
    const v = validateUpgradeStripeSession(
      bad,
      'user_test',
      'ffa97f03-47cf-4fdd-b6ea-2dc0f40203f7',
    );
    assert.equal(v.metadata_product_key_upgrade, false);
  });
});
