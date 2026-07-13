import type Stripe from 'stripe';
import {
  commitCompatibilityFulfillment,
  getCompatibilityPurchaseContext,
  isPaidCompatibilityReportSnapshot,
  type CompatibilityPurchaseContextRow,
} from './compatibilityCommerceDb';
import {
  COMPATIBILITY_REPORT_CURRENCY,
  COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
  COMPATIBILITY_REPORT_PRICE_YEN,
  COMPATIBILITY_REPORT_QUANTITY,
  getCompatibilityStripePriceId,
} from './compatibilityCommerceAuthority';

export type CompatibilityFulfillmentFailureReason =
  | 'session_incomplete'
  | 'mode_not_payment'
  | 'payment_not_paid'
  | 'subscription_not_allowed'
  | 'metadata_invalid'
  | 'purchase_context_missing'
  | 'purchase_context_invalid'
  | 'checkout_session_mismatch'
  | 'price_configuration_missing'
  | 'line_item_retrieve_failed'
  | 'line_item_count_invalid'
  | 'price_mismatch'
  | 'quantity_mismatch'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'db_error';

export type CompatibilityFulfillmentResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: CompatibilityFulfillmentFailureReason };

export type CompatibilityFulfillmentDependencies = {
  getContext: (
    contextId: string,
  ) => Promise<CompatibilityPurchaseContextRow | null>;
  commit: (params: {
    contextId: string;
    checkoutSessionId: string;
    paymentIntentId: string | null;
  }) => Promise<boolean>;
  stripePriceId: string | null;
};

function lineItemPriceId(item: Stripe.LineItem): string | null {
  if (!item.price) return null;
  return typeof item.price === 'string' ? item.price : item.price.id;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

export async function fulfillCompatibilityCheckoutSession(
  stripe: Pick<Stripe, 'checkout'>,
  session: Stripe.Checkout.Session,
  dependencies?: CompatibilityFulfillmentDependencies,
): Promise<CompatibilityFulfillmentResult> {
  const resolvedDependencies: CompatibilityFulfillmentDependencies = dependencies ?? {
    getContext: getCompatibilityPurchaseContext,
    commit: commitCompatibilityFulfillment,
    stripePriceId: getCompatibilityStripePriceId(),
  };
  if (session.status !== 'complete') {
    return { ok: false, reason: 'session_incomplete' };
  }
  if (session.mode !== 'payment') {
    return { ok: false, reason: 'mode_not_payment' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, reason: 'payment_not_paid' };
  }
  if (session.subscription) {
    return { ok: false, reason: 'subscription_not_allowed' };
  }

  const metadata = session.metadata ?? {};
  const metadataKeys = Object.keys(metadata).sort();
  if (
    metadataKeys.length !== 2 ||
    metadataKeys[0] !== 'product_key' ||
    metadataKeys[1] !== 'purchase_context_id' ||
    metadata.product_key !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY ||
    !metadata.purchase_context_id ||
    session.client_reference_id !== metadata.purchase_context_id
  ) {
    return { ok: false, reason: 'metadata_invalid' };
  }
  if (!resolvedDependencies.stripePriceId) {
    return { ok: false, reason: 'price_configuration_missing' };
  }

  const context = await resolvedDependencies.getContext(metadata.purchase_context_id);
  if (!context) {
    return { ok: false, reason: 'purchase_context_missing' };
  }
  if (
    context.productKey !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY ||
    context.id !== metadata.purchase_context_id ||
    !isPaidCompatibilityReportSnapshot(context.pendingSnapshot)
  ) {
    return { ok: false, reason: 'purchase_context_invalid' };
  }
  if (context.stripeCheckoutSessionId !== session.id) {
    return { ok: false, reason: 'checkout_session_mismatch' };
  }
  if (context.status === 'fulfilled') {
    return { ok: true, duplicate: true };
  }

  let lineItems: Stripe.ApiList<Stripe.LineItem>;
  try {
    lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 2,
      expand: ['data.price'],
    });
  } catch {
    return { ok: false, reason: 'line_item_retrieve_failed' };
  }
  if (lineItems.data.length !== 1) {
    return { ok: false, reason: 'line_item_count_invalid' };
  }
  const item = lineItems.data[0]!;
  if (lineItemPriceId(item) !== resolvedDependencies.stripePriceId) {
    return { ok: false, reason: 'price_mismatch' };
  }
  if (item.quantity !== COMPATIBILITY_REPORT_QUANTITY) {
    return { ok: false, reason: 'quantity_mismatch' };
  }
  if (
    item.amount_total !== COMPATIBILITY_REPORT_PRICE_YEN ||
    session.amount_total !== COMPATIBILITY_REPORT_PRICE_YEN
  ) {
    return { ok: false, reason: 'amount_mismatch' };
  }
  if (
    item.currency?.toLowerCase() !== COMPATIBILITY_REPORT_CURRENCY ||
    session.currency?.toLowerCase() !== COMPATIBILITY_REPORT_CURRENCY
  ) {
    return { ok: false, reason: 'currency_mismatch' };
  }

  const committed = await resolvedDependencies.commit({
    contextId: context.id,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentId(session),
  });
  return committed
    ? { ok: true, duplicate: false }
    : { ok: false, reason: 'db_error' };
}
