import type Stripe from 'stripe';
import {
  M55_R5_PROVIDER_PROOF_LIST_LIMIT,
  M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY,
  parseMetadataPurchaseAttemptIdV1,
} from './r5PurchaseAttemptContract';

export type PaymentIntentCheckoutSessionProofV1 =
  | { status: 'PROVIDER_TRANSPORT_FAILURE'; errorName: string }
  | { status: 'PI_LOOKUP_ZERO' }
  | { status: 'PI_LOOKUP_MULTIPLE' }
  | { status: 'SESSION_NOT_PAYMENT' }
  | {
      status: 'PROVIDER_VERIFIED';
      checkoutSessionId: string;
      metadataPurchaseAttemptId: string | null;
    };

function paymentIntentIdFromListArg(paymentIntentId: string): string {
  return paymentIntentId;
}

export async function verifyPaymentIntentCheckoutSessionProofV1(args: {
  stripe: Pick<Stripe, 'checkout'>;
  paymentIntentId: string;
  paymentIntentMetadata?: Stripe.Metadata | null;
}): Promise<PaymentIntentCheckoutSessionProofV1> {
  let listed: Stripe.ApiList<Stripe.Checkout.Session>;
  try {
    listed = await args.stripe.checkout.sessions.list({
      payment_intent: paymentIntentIdFromListArg(args.paymentIntentId),
      limit: M55_R5_PROVIDER_PROOF_LIST_LIMIT,
    });
  } catch (error) {
    return {
      status: 'PROVIDER_TRANSPORT_FAILURE',
      errorName: error instanceof Error ? error.name : 'unknown',
    };
  }

  const sessions = listed.data ?? [];
  if (sessions.length === 0) {
    return { status: 'PI_LOOKUP_ZERO' };
  }
  if (sessions.length >= M55_R5_PROVIDER_PROOF_LIST_LIMIT) {
    return { status: 'PI_LOOKUP_MULTIPLE' };
  }

  const session = sessions[0];
  if (!session || session.mode !== 'payment') {
    return { status: 'SESSION_NOT_PAYMENT' };
  }

  const sessionMeta = session.metadata ?? {};
  const fromSession = parseMetadataPurchaseAttemptIdV1(
    sessionMeta[M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY],
  );
  const fromPi = parseMetadataPurchaseAttemptIdV1(
    args.paymentIntentMetadata?.[M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY],
  );

  return {
    status: 'PROVIDER_VERIFIED',
    checkoutSessionId: session.id,
    metadataPurchaseAttemptId: fromPi ?? fromSession,
  };
}
