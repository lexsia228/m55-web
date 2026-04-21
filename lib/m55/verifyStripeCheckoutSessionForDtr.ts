/**
 * Stripe Checkout Session が DTR 一回払いとして userId に紐づく paid か検証する。
 * /dtr/processing と /api/purchase/checkout で共通利用。
 */
import { getStripe } from '../stripe';
import { ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';

export async function verifyStripeCheckoutSessionForDtrUser(
  sessionId: string,
  userId: string
): Promise<{ valid: true; sessionId: string } | { valid: false }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const productId = (session.metadata?.productId as string) ?? DTR_CORE_STATIC_V1;

    let rejectReason: string | undefined;
    if (session.status !== 'complete') {
      rejectReason = 'session_status_not_complete';
    } else if (session.mode !== 'payment') {
      rejectReason = 'mode_not_payment';
    } else if (session.client_reference_id !== userId) {
      rejectReason = 'client_reference_id_mismatch';
    } else if (!ALLOWED_ONE_TIME_PRODUCTS.has(productId)) {
      rejectReason = 'product_not_allowed';
    } else if (session.payment_status !== 'paid') {
      rejectReason = 'payment_status_not_paid';
    }

    const payload = {
      sessionId,
      valid: rejectReason === undefined,
      rejectReason: rejectReason ?? null,
      stripe: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
        client_reference_id: session.client_reference_id,
        expectedUserId: userId,
        metadata_productId: productId,
        customer_details: session.customer_details
          ? {
              email: session.customer_details.email ?? null,
              name: session.customer_details.name ?? null,
            }
          : null,
        amount_total: session.amount_total,
        currency: session.currency,
      },
    };

    console.info('[verifyStripeCheckoutSessionForDtr]', JSON.stringify(payload));

    if (rejectReason) {
      return { valid: false };
    }
    return { valid: true, sessionId };
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
    return { valid: false };
  }
}
