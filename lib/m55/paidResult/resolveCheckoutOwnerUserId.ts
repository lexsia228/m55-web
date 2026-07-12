/**
 * Resolve Clerk user_id from Stripe Checkout Session without raw ID in metadata.
 */
import type Stripe from 'stripe';
import { getDraftById } from '../dtrDraftDb';

export async function resolveCheckoutOwnerUserId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const purchaseContextId = session.metadata?.purchaseContextId?.trim();
  if (purchaseContextId) {
    const draft = await getDraftById(purchaseContextId);
    if (draft?.user_id) return draft.user_id;
  }

  const ref = session.client_reference_id?.trim() ?? '';
  if (!ref) return null;

  if (ref.startsWith('user_')) {
    return ref;
  }

  const byRef = await getDraftById(ref);
  if (byRef?.user_id) return byRef.user_id;

  return null;
}
