/**
 * DTR Core one-time checkout: Stripe Session → entitlements + entitlement_rights (DB SSOT).
 * Shared by Stripe webhook and /dtr/processing (mobile-friendly when webhook is delayed).
 * Idempotent: safe to call with the same checkout session many times.
 */
import type Stripe from 'stripe';
import { getStripe } from '../stripe';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { grantInitialIncludedReplyIfNeeded } from './reply/walletGrants';
import { upsertDtrReportSnapshotAtFulfillment } from './dtrDraftDb';

export const DTR_CORE_RIGHT_KEY = 'm55_p:core_origin';

const PRODUCT_ID_DEFAULT = DTR_CORE_STATIC_V1;

export type FulfillFromCheckoutSessionResult =
  | { ok: true }
  | { ok: false; reason: 'retrieve_failed' | 'not_payment' | 'user_mismatch' | 'payment_not_paid' | 'product_not_allowed' | 'db_error'; detail?: string };

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

  const userId = session.client_reference_id ?? null;
  const productId = (session.metadata?.productId as string) ?? PRODUCT_ID_DEFAULT;

  if (userId !== params.expectedUserId) {
    return { ok: false, reason: 'user_mismatch' };
  }

  if (session.mode !== 'payment') {
    return { ok: false, reason: 'not_payment' };
  }

  if (!ALLOWED_ONE_TIME_PRODUCTS.has(productId)) {
    return { ok: false, reason: 'product_not_allowed', detail: productId };
  }

  let fresh: Stripe.Checkout.Session;
  try {
    fresh = await stripe.checkout.sessions.retrieve(session.id);
  } catch (e) {
    return { ok: false, reason: 'retrieve_failed', detail: String(e) };
  }

  const paymentStatus = fresh.payment_status ?? 'unknown';
  if (paymentStatus !== 'paid') {
    return { ok: false, reason: 'payment_not_paid', detail: paymentStatus };
  }

  const checkoutSessionId = fresh.id;
  const paymentIntentId =
    typeof fresh.payment_intent === 'string'
      ? fresh.payment_intent
      : (fresh.payment_intent as Stripe.PaymentIntent)?.id ?? null;

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
        user_id: params.expectedUserId,
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
        user_id: params.expectedUserId,
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

    if (productId === PRODUCT_ID_DEFAULT) {
      const { error: upsertRightErr } = await db.from('entitlement_rights').upsert(
        { user_id: params.expectedUserId, right_key: DTR_CORE_RIGHT_KEY, right_value: '1' },
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
          userId: params.expectedUserId,
          rightKey: DTR_CORE_RIGHT_KEY,
          checkoutSessionId,
        })
      );

      await grantInitialIncludedReplyIfNeeded(db, params.expectedUserId);

      const snap = await upsertDtrReportSnapshotAtFulfillment({
        userId: params.expectedUserId,
        productId,
        checkoutSessionId,
        sessionMetadata: fresh.metadata,
      });
      if (!snap.ok) {
        console.error(
          '[fulfillDtrCore] dtr_report_snapshots skipped',
          JSON.stringify({
            reason: snap.reason,
            checkoutSessionId,
            userId: params.expectedUserId,
            hint:
              snap.reason.includes('PGRST205') || /schema cache|not find/i.test(snap.reason)
                ? 'PostgREST: run migration 20260421000000 or NOTIFY pgrst reload; ensure 20260420000000 applied'
                : snap.reason.includes('missing_profile_for_snapshot')
                  ? 'Set profile in Checkout metadata or ensure dtr_guest_drafts row exists (fix /api/dtr/draft 503 first)'
                  : undefined,
          })
        );
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'db_error', detail: String(e) };
  }
}
