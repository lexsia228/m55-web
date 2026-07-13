/**
 * Resolve Clerk user_id from Stripe Checkout Session without raw ID in metadata.
 */
import type Stripe from 'stripe';
import { getDraftById, type GuestDraftRow } from '../dtrDraftDb';

export type PurchaseContextOwnerFailureReason =
  | 'missing_purchase_context_id'
  | 'purchase_context_not_found'
  | 'purchase_context_invalid'
  | 'purchase_context_owner_missing';

export type ResolvedPurchaseContextOwner =
  | {
      ok: true;
      purchaseContextId: string;
      ownerUserId: string;
      context: GuestDraftRow;
    }
  | {
      ok: false;
      reason: PurchaseContextOwnerFailureReason;
    };

export type PurchaseContextLookup = (purchaseContextId: string) => Promise<GuestDraftRow | null>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasFrozenPurchaseInput(context: GuestDraftRow): boolean {
  const raw = context.extra_json?.purchaseInputV1;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return (raw as { frozen?: unknown }).frozen === true;
}

/**
 * Canonical owner authority for an opaque Stripe purchase-context reference.
 * `dtr_guest_drafts.id → user_id` is server-side SSOT; Stripe never supplies a raw user ID.
 *
 * The current table has no expiry column. Deleted/stale contexts therefore fail closed as
 * `purchase_context_not_found`; no synthetic lifetime is inferred from `updated_at`.
 */
export async function resolvePurchaseContextOwner(
  purchaseContextId: string | null | undefined,
  lookup: PurchaseContextLookup = getDraftById,
): Promise<ResolvedPurchaseContextOwner> {
  const normalized = purchaseContextId?.trim() ?? '';
  if (!normalized) {
    return { ok: false, reason: 'missing_purchase_context_id' };
  }
  if (!UUID_RE.test(normalized)) {
    return { ok: false, reason: 'purchase_context_invalid' };
  }

  const context = await lookup(normalized);
  if (!context) {
    return { ok: false, reason: 'purchase_context_not_found' };
  }
  if (
    context.id !== normalized ||
    !context.linked_at ||
    !Number.isFinite(Date.parse(context.updated_at)) ||
    !hasFrozenPurchaseInput(context)
  ) {
    return { ok: false, reason: 'purchase_context_invalid' };
  }

  const ownerUserId = context.user_id?.trim() ?? '';
  if (!ownerUserId) {
    return { ok: false, reason: 'purchase_context_owner_missing' };
  }

  return {
    ok: true,
    purchaseContextId: normalized,
    ownerUserId,
    context,
  };
}

export async function resolveCheckoutPurchaseContextOwner(
  session: Stripe.Checkout.Session,
  lookup: PurchaseContextLookup = getDraftById,
): Promise<ResolvedPurchaseContextOwner> {
  return resolvePurchaseContextOwner(session.client_reference_id, lookup);
}

export async function resolveCheckoutOwnerUserId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const resolved = await resolveCheckoutPurchaseContextOwner(session);
  return resolved.ok ? resolved.ownerUserId : null;
}
