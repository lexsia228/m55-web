/**
 * DTR Core one-time checkout: Stripe Session → entitlements + entitlement_rights (DB SSOT).
 * Shared by Stripe webhook and /dtr/processing (mobile-friendly when webhook is delayed).
 * Idempotent: safe to call with the same checkout session many times.
 */
import type Stripe from 'stripe';
import { getStripe } from '../stripe';
import { getSupabaseAdmin } from '../supabaseAdmin';
import {
  ALLOWED_ONE_TIME_PRODUCTS,
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
} from '../oneTimeCheckout';
import {
  grantInitialIncludedReplyIfNeeded,
  grantPurchasedTopUpToFullEquivalentIfNeeded,
} from './reply/walletGrants';
import { upsertDtrReportSnapshotAtFulfillment } from './dtrDraftDb';
import { resolveCheckoutPurchaseContextOwner } from './paidResult/resolveCheckoutOwnerUserId';
import { verifyDtrCheckoutPurchaseFromStripe } from './paidResult/verifyDtrCheckoutPurchase';
import { notifyM55OpsFireAndForget, m55OpsEventSnapshotSkip } from './ops/m55OpsNotify';

export const DTR_CORE_RIGHT_KEY = 'm55_p:core_origin';

const PRODUCT_ID_DEFAULT = DTR_CORE_STATIC_V1;

/** DTR saved-report SKUs that grant core_origin + included reply (checkout wiring in later gate). */
const DTR_CORE_PRODUCTS_WITH_ENTITLEMENT_GRANT: ReadonlySet<string> = new Set([
  DTR_CORE_STATIC_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_FULL_V1,
]);

export type FulfillFromCheckoutSessionResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'retrieve_failed'
        | 'session_incomplete'
        | 'purchase_context_invalid'
        | 'purchase_validation_failed'
        | 'not_payment'
        | 'user_mismatch'
        | 'payment_not_paid'
        | 'product_not_allowed'
        | 'db_error';
      detail?: string;
    };

/**
 * Re-fetch session from Stripe, verify one-time paid lane, upsert DB rows.
 * @param eventIdForFulfillmentRow — webhook uses Stripe event id; success page uses synthetic id (one_time_fulfillments.event_id NOT NULL).
 */
export async function fulfillDtrCoreFromCheckoutSessionId(params: {
  checkoutSessionId: string;
  expectedUserId: string;
  eventIdForFulfillmentRow: string;
}): Promise<FulfillFromCheckoutSessionResult> {
  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e) {
    return { ok: false, reason: 'retrieve_failed', detail: String(e) };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(params.checkoutSessionId);
  } catch (e) {
    return { ok: false, reason: 'retrieve_failed', detail: String(e) };
  }

  if (session.status !== 'complete') {
    return { ok: false, reason: 'session_incomplete', detail: session.status ?? 'unknown' };
  }
  if (session.mode !== 'payment') {
    return { ok: false, reason: 'not_payment' };
  }
  if (session.payment_status !== 'paid') {
    return {
      ok: false,
      reason: 'payment_not_paid',
      detail: session.payment_status ?? 'unknown',
    };
  }

  const resolvedOwner = await resolveCheckoutPurchaseContextOwner(session);

  if (!resolvedOwner.ok) {
    return {
      ok: false,
      reason: 'purchase_context_invalid',
      detail: resolvedOwner.reason,
    };
  }

  if (resolvedOwner.ownerUserId !== params.expectedUserId) {
    return { ok: false, reason: 'user_mismatch' };
  }
  const ownerUserId = resolvedOwner.ownerUserId;
  const productId = resolvedOwner.canonicalProductId || PRODUCT_ID_DEFAULT;

  if (!ALLOWED_ONE_TIME_PRODUCTS.has(productId)) {
    return { ok: false, reason: 'product_not_allowed', detail: productId };
  }

  const verifiedPurchase = await verifyDtrCheckoutPurchaseFromStripe(stripe, session, productId);
  if (!verifiedPurchase.ok) {
    return {
      ok: false,
      reason: 'purchase_validation_failed',
      detail: verifiedPurchase.reason,
    };
  }

  const checkoutSessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent)?.id ?? null;

  try {
    const db = getSupabaseAdmin() as any;

    const { data: existingFulfillment } = await db
      .from('one_time_fulfillments')
      .select('checkout_session_id')
      .eq('checkout_session_id', checkoutSessionId)
      .maybeSingle();

    if (!existingFulfillment) {
      const { error: insertFulfillmentErr } = await db.from('one_time_fulfillments').insert({
        checkout_session_id: checkoutSessionId,
        payment_intent_id: paymentIntentId,
        event_id: params.eventIdForFulfillmentRow,
        user_id: ownerUserId,
        product_id: productId,
        fulfilled_at: new Date().toISOString(),
      });
      if (insertFulfillmentErr) {
        if (insertFulfillmentErr.code === '23505') {
          // concurrent insert — continue to upserts
        } else {
          return { ok: false, reason: 'db_error', detail: String(insertFulfillmentErr.message ?? insertFulfillmentErr) };
        }
      }
    }

    const { error: upsertEntErr } = await db.from('entitlements').upsert(
      {
        user_id: ownerUserId,
        product_id: productId,
        grant_type: 'one_time',
        source: 'stripe_checkout',
        status: 'active',
        stripe_session_id: checkoutSessionId,
      },
      { onConflict: 'user_id,product_id' }
    );
    if (upsertEntErr) {
      return { ok: false, reason: 'db_error', detail: String(upsertEntErr.message ?? upsertEntErr) };
    }

    if (DTR_CORE_PRODUCTS_WITH_ENTITLEMENT_GRANT.has(productId)) {
      const { error: upsertRightErr } = await db.from('entitlement_rights').upsert(
        { user_id: ownerUserId, right_key: DTR_CORE_RIGHT_KEY, right_value: '1' },
        { onConflict: 'user_id,right_key' }
      );
      if (upsertRightErr) {
        return { ok: false, reason: 'db_error', detail: String(upsertRightErr.message ?? upsertRightErr) };
      }

      console.info(
        '[dtrGrant]',
        JSON.stringify({
          where: 'fulfillDtrCoreFromCheckoutSessionId',
          trigger: 'stripe_checkout_session_paid',
          userId: ownerUserId,
          rightKey: DTR_CORE_RIGHT_KEY,
          productId,
          checkoutSessionId,
        })
      );

      await grantInitialIncludedReplyIfNeeded(db, ownerUserId);

      if (productId === DTR_CORE_FULL_V1) {
        const fullTopUp = await grantPurchasedTopUpToFullEquivalentIfNeeded(
          db,
          ownerUserId
        );
        if (process.env.NODE_ENV !== 'production') {
          console.info(
            '[dtrGrantFullPurchasedTopUp]',
            JSON.stringify({
              applied: fullTopUp.applied,
              reason: fullTopUp.applied ? undefined : fullTopUp.reason,
              purchasedDelta: fullTopUp.applied ? fullTopUp.purchasedDelta : undefined,
            })
          );
        }
      }

      const snap = await upsertDtrReportSnapshotAtFulfillment({
        userId: ownerUserId,
        productId,
        checkoutSessionId,
        sessionMetadata: session.metadata,
      });
      if (!snap.ok) {
        console.error(
          '[fulfillDtrCore] dtr_report_snapshots skipped',
          JSON.stringify({
            reason: snap.reason,
            checkoutSessionId,
            userId: ownerUserId,
            hint:
              snap.reason.includes('PGRST205') || /schema cache|not find/i.test(snap.reason)
                ? 'PostgREST: run migration 20260421000000 or NOTIFY pgrst reload; ensure 20260420000000 applied'
                : snap.reason.includes('missing_profile_for_snapshot')
                  ? 'Set profile in Checkout metadata or ensure dtr_guest_drafts row exists (fix /api/dtr/draft 503 first)'
                  : undefined,
          })
        );
        notifyM55OpsFireAndForget(m55OpsEventSnapshotSkip(snap.reason));
      } else {
        // SSOT G4: link active wallet to new visible snapshot (first purchase or repurchase after hide).
        // Repurchase: wallet may still reference hidden report_instance_id — relink without second included grant.
        const { data: linkRows, error: linkErr } = await db
          .from('reply_ticket_wallets')
          .update({
            report_instance_id: snap.snapshotId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ownerUserId)
          .eq('status', 'active')
          .select('id');

        if (linkErr) {
          console.error(
            '[dtrWalletReportInstanceLink]',
            JSON.stringify({
              outcome: 'error',
              code: (linkErr as { code?: string }).code,
            }),
          );
        } else if (process.env.NODE_ENV !== 'production') {
          const n = Array.isArray(linkRows) ? linkRows.length : 0;
          console.info(
            '[dtrWalletReportInstanceLink]',
            JSON.stringify({ outcome: n > 0 ? 'linked' : 'skipped', rowsUpdated: n }),
          );
        }
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'db_error', detail: String(e) };
  }
}
