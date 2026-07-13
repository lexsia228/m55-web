import type Stripe from 'stripe';
import {
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
  getOneTimeStripePriceEnvName,
} from '../../oneTimeCheckout';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../paidDtrProductCopy';

export type DtrCheckoutPurchaseFailureReason =
  | 'session_incomplete'
  | 'mode_not_payment'
  | 'payment_not_paid'
  | 'product_mismatch'
  | 'price_configuration_missing'
  | 'line_item_retrieve_failed'
  | 'line_item_missing'
  | 'line_item_count_invalid'
  | 'price_mismatch'
  | 'quantity_mismatch'
  | 'amount_mismatch'
  | 'currency_mismatch';

export type VerifiedDtrCheckoutPurchase =
  | {
      ok: true;
      mode: 'payment';
      productId: string;
      stripePriceId: string;
      quantity: 1;
      amountTotal: number;
      currency: 'jpy';
    }
  | {
      ok: false;
      reason: DtrCheckoutPurchaseFailureReason;
    };

export type ExpectedDtrCheckoutPurchase = {
  productId: string;
  stripePriceId: string;
  amountTotal: number;
  currency: 'jpy';
};

function expectedAmountForProduct(productId: string): number | null {
  if (productId === DTR_CORE_STATIC_V1 || productId === DTR_CORE_LIGHT_V1) {
    return PAID_DTR_SAVED_REPORT_PRICING.light.priceYen;
  }
  if (productId === DTR_CORE_FULL_V1) {
    return PAID_DTR_SAVED_REPORT_PRICING.full.priceYen;
  }
  if (productId === DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1) {
    return PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen;
  }
  return null;
}

export function resolveExpectedDtrCheckoutPurchase(
  productId: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ExpectedDtrCheckoutPurchase | null {
  const envName = getOneTimeStripePriceEnvName(productId);
  const stripePriceId = envName ? env[envName]?.trim() : '';
  const amountTotal = expectedAmountForProduct(productId);
  if (!envName || !stripePriceId || amountTotal == null) return null;
  return {
    productId,
    stripePriceId,
    amountTotal,
    currency: 'jpy',
  };
}

function lineItemPriceId(item: Stripe.LineItem): string | null {
  if (!item.price) return null;
  return typeof item.price === 'string' ? item.price : item.price.id;
}

export function validateDtrCheckoutPurchase(
  session: Stripe.Checkout.Session,
  lineItems: readonly Stripe.LineItem[],
  expected: ExpectedDtrCheckoutPurchase,
): VerifiedDtrCheckoutPurchase {
  if (session.status !== 'complete') {
    return { ok: false, reason: 'session_incomplete' };
  }
  if (session.mode !== 'payment') {
    return { ok: false, reason: 'mode_not_payment' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, reason: 'payment_not_paid' };
  }
  if ((session.metadata?.productId ?? '') !== expected.productId) {
    return { ok: false, reason: 'product_mismatch' };
  }
  if (lineItems.length === 0) {
    return { ok: false, reason: 'line_item_missing' };
  }
  if (lineItems.length !== 1) {
    return { ok: false, reason: 'line_item_count_invalid' };
  }

  const item = lineItems[0]!;
  if (lineItemPriceId(item) !== expected.stripePriceId) {
    return { ok: false, reason: 'price_mismatch' };
  }
  if (item.quantity !== 1) {
    return { ok: false, reason: 'quantity_mismatch' };
  }
  if (item.amount_total !== expected.amountTotal || session.amount_total !== expected.amountTotal) {
    return { ok: false, reason: 'amount_mismatch' };
  }
  if (
    item.currency?.toLowerCase() !== expected.currency ||
    session.currency?.toLowerCase() !== expected.currency
  ) {
    return { ok: false, reason: 'currency_mismatch' };
  }

  return {
    ok: true,
    mode: 'payment',
    productId: expected.productId,
    stripePriceId: expected.stripePriceId,
    quantity: 1,
    amountTotal: expected.amountTotal,
    currency: expected.currency,
  };
}

export async function verifyDtrCheckoutPurchaseFromStripe(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  canonicalProductId: string,
): Promise<VerifiedDtrCheckoutPurchase> {
  const expected = resolveExpectedDtrCheckoutPurchase(canonicalProductId);
  if (!expected) {
    return { ok: false, reason: 'price_configuration_missing' };
  }

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 2,
      expand: ['data.price'],
    });
    return validateDtrCheckoutPurchase(session, lineItems.data, expected);
  } catch {
    return { ok: false, reason: 'line_item_retrieve_failed' };
  }
}
