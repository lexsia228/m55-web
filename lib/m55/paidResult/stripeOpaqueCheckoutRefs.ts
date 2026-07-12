/**
 * Opaque Stripe checkout references — no raw Clerk ID / DOB / answers in metadata.
 */
import { createHash } from 'node:crypto';

export const STRIPE_CHECKOUT_METADATA_VERSION = 'sco-v1' as const;

export function hashOpaqueUserRef(userId: string): string {
  return createHash('sha256').update(`m55:user:${userId}`).digest('hex').slice(0, 32);
}

export function hashPurchaseContextRef(draftId: string, userId: string): string {
  return createHash('sha256')
    .update(`m55:purchase:${draftId}:${userId}`)
    .digest('hex')
    .slice(0, 32);
}

export type OpaqueStripeCheckoutMetadata = {
  productId: string;
  purchaseContextId: string;
  opaqueUserRef: string;
  metadataVersion: typeof STRIPE_CHECKOUT_METADATA_VERSION;
  inputVersion: string;
  engineVersionCandidate: string;
  fulfillmentVersion: string;
};

export function buildOpaqueStripeCheckoutMetadata(params: {
  productId: string;
  purchaseContextId: string;
  opaqueUserRef: string;
  inputVersion: string;
  engineVersionCandidate: string;
}): Record<string, string> {
  return {
    productId: params.productId,
    purchaseContextId: params.purchaseContextId,
    opaqueUserRef: params.opaqueUserRef,
    metadataVersion: STRIPE_CHECKOUT_METADATA_VERSION,
    inputVersion: params.inputVersion,
    engineVersionCandidate: params.engineVersionCandidate,
    fulfillmentVersion: 'paid-saved-report-v1',
  };
}

/** customer_email: retained on Stripe Session only for receipt delivery (not duplicated in metadata). */
