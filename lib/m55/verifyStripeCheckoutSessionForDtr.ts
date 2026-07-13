/**
 * Stripe Checkout Session が DTR 一回払いとして userId に紐づく paid か検証する。
 * /dtr/processing と /api/purchase/checkout で共通利用。
 */
import type Stripe from 'stripe';
import { getStripe } from '../stripe';
import { ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import {
  resolveCheckoutPurchaseContextOwner,
  type PurchaseContextLookup,
} from './paidResult/resolveCheckoutOwnerUserId';
import {
  verifyDtrCheckoutPurchaseFromStripe,
  type DtrCheckoutPurchaseFailureReason,
} from './paidResult/verifyDtrCheckoutPurchase';

export type DtrCheckoutVerificationFailureReason =
  | 'session_status_not_complete'
  | 'mode_not_payment'
  | 'missing_purchase_context_id'
  | 'purchase_context_not_found'
  | 'purchase_context_invalid'
  | 'purchase_context_owner_missing'
  | 'purchase_context_owner_mismatch'
  | 'product_mismatch'
  | 'product_not_allowed'
  | 'payment_status_not_paid'
  | 'retrieve_failed'
  | DtrCheckoutPurchaseFailureReason;

export type DtrCheckoutVerificationResult =
  | { valid: true; sessionId: string; canonicalProductId: string }
  | { valid: false; reason: DtrCheckoutVerificationFailureReason };

export async function verifyRetrievedStripeCheckoutSessionForDtrUser(
  session: Stripe.Checkout.Session,
  authenticatedUserId: string,
  lookup?: PurchaseContextLookup,
): Promise<DtrCheckoutVerificationResult> {
  if (session.status !== 'complete') {
    return { valid: false, reason: 'session_status_not_complete' };
  }
  if (session.mode !== 'payment') {
    return { valid: false, reason: 'mode_not_payment' };
  }

  const resolvedOwner = await resolveCheckoutPurchaseContextOwner(session, lookup);
  if (!resolvedOwner.ok) {
    return { valid: false, reason: resolvedOwner.reason };
  }
  if (resolvedOwner.ownerUserId !== authenticatedUserId) {
    return { valid: false, reason: 'purchase_context_owner_mismatch' };
  }

  const metadataProductId = (session.metadata?.productId as string) ?? DTR_CORE_STATIC_V1;
  if (metadataProductId !== resolvedOwner.canonicalProductId) {
    return { valid: false, reason: 'product_mismatch' };
  }
  if (!ALLOWED_ONE_TIME_PRODUCTS.has(resolvedOwner.canonicalProductId)) {
    return { valid: false, reason: 'product_not_allowed' };
  }
  if (session.payment_status !== 'paid') {
    return { valid: false, reason: 'payment_status_not_paid' };
  }

  return {
    valid: true,
    sessionId: session.id,
    canonicalProductId: resolvedOwner.canonicalProductId,
  };
}

export async function verifyStripeCheckoutSessionForDtrUser(
  sessionId: string,
  userId: string
): Promise<DtrCheckoutVerificationResult> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const basicResult = await verifyRetrievedStripeCheckoutSessionForDtrUser(session, userId);
    const result: DtrCheckoutVerificationResult = basicResult.valid
      ? await (async () => {
          const purchase = await verifyDtrCheckoutPurchaseFromStripe(
            stripe,
            session,
            basicResult.canonicalProductId,
          );
          return purchase.ok
            ? basicResult
            : { valid: false as const, reason: purchase.reason };
        })()
      : basicResult;

    const payload = {
      sessionId,
      valid: result.valid,
      rejectReason: result.valid ? null : result.reason,
      stripe: {
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        amount_total: session.amount_total,
        currency: session.currency,
      },
    };

    console.info('[verifyStripeCheckoutSessionForDtr]', JSON.stringify(payload));

    return result;
  } catch (e) {
    console.warn(
      '[verifyStripeCheckoutSessionForDtr]',
      JSON.stringify({
        sessionId,
        valid: false,
        rejectReason: 'retrieve_failed',
        error: e instanceof Error ? e.message : String(e),
      })
    );
    return { valid: false, reason: 'retrieve_failed' };
  }
}
