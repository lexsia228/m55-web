import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import {
  fulfillDtrCoreFromCheckoutSessionId,
  DTR_CORE_RIGHT_KEY,
} from '../../../../lib/m55/dtrCoreCheckoutFulfillment';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  isLegacyAdditionalReplyTicketProductKey,
  isReplyTicketFulfillmentProductKey,
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
} from '../../../../lib/m55/reply/replyTicketCheckoutConstants';
import { ALLOWED_ONE_TIME_PRODUCTS } from '../../../../lib/oneTimeCheckout';
import {
  consumePendingReplyTicketDiagnosticSummary,
  handleReplyTicketCheckoutCompleted,
} from '../../../../lib/m55/reply/replyTicketWebhookLane';
import {
  notifyM55OpsFireAndForget,
  m55OpsEventInternalProcessingFailed,
  m55OpsEventMissingClientReferenceId,
} from '../../../../lib/m55/ops/m55OpsNotify';
import { hashUserIdForLedgerLog } from '../../../../lib/m55/reply/readReplyWalletProbe';
import { fulfillCompatibilityCheckoutSession } from '../../../../lib/m55/compatibility/compatibilityCheckoutFulfillment';
import { COMPATIBILITY_REPORT_FULL_PRODUCT_KEY } from '../../../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { resolveCheckoutOwnerUserId } from '../../../../lib/m55/paidResult/resolveCheckoutOwnerUserId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** TODO(M55 reply ticket diagnostic): remove `[reply-ticket-diagnostic:*]` logs after observation SSOT. */

const PRODUCT_ID_FROM_META = 'DTR_CORE_STATIC_V1';
/** 本丸イベント: 内部処理失敗時は 500 + failed_fulfillments 記録 */
const ONE_TIME_KEY_EVENTS: ReadonlySet<string> = new Set(['checkout.session.completed', 'charge.refunded']);
const USER_REF_HASH_RE = /^[0-9a-f]{16}$/;

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const sig = (await headers()).get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error('[webhook] signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const db = supabase as any;
  const { data: existing } = await db
    .from('stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (event.type === 'checkout.session.completed') {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        const md = session.metadata ?? {};
        const pk =
          md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
        const product_key_value =
          typeof pk === 'string' && isLegacyAdditionalReplyTicketProductKey(pk)
            ? 'additional_reply_ticket'
            : typeof pk === 'string' &&
                pk.trim() === DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY
              ? 'light_to_full_upgrade'
              : typeof pk === 'string' && pk.trim().length > 0
                ? 'other'
                : 'unknown';
        console.info(
          '[reply-ticket-diagnostic:dedupe_early]',
          JSON.stringify({
            event_type_checkout_completed: true,
            product_key: product_key_value,
            reply_lane_selected: false,
            dedupe_checked: true,
            dedupe_inserted_or_already_processed: 'already_processed',
            route_response_2xx: true,
            rpc_called: false,
            global_dedupe_returned_before_reply_lane: true,
          })
        );
      } catch {
        console.info(
          '[reply-ticket-diagnostic:dedupe_early]',
          JSON.stringify({
            event_type_checkout_completed: true,
            product_key: 'unknown',
            reply_lane_selected: false,
            dedupe_checked: true,
            dedupe_inserted_or_already_processed: 'already_processed',
            route_response_2xx: true,
            rpc_called: false,
            global_dedupe_returned_before_reply_lane: true,
          })
        );
      }
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const eventType = event.type ?? 'unknown';

  // 非対象イベント（one-time completed/refunded 以外）: stripe_events 記録後 200 early return
  if (!ONE_TIME_KEY_EVENTS.has(event.type ?? '')) {
    if (event.type === 'invoice.paid') {
      console.warn(
        '[webhook] legacy_invoice_paid_ignored',
        JSON.stringify({
          event_id: event.id,
          event_type: event.type,
          lane: 'legacy_invoice_paid_ignored',
        })
      );
    }
    const { error: insErr } = await db.from('stripe_events').insert({ event_id: event.id, event_type: eventType });
    if (insErr?.code === '23505') {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const stripe = getStripe();
  let res: NextResponse;

  if (event.type === 'checkout.session.completed') {
    res = await handleCheckoutCompleted(stripe, event, db);
  } else if (event.type === 'charge.refunded') {
    res = await handleChargeRefunded(stripe, event, db);
  } else {
    res = NextResponse.json({ received: true }, { status: 200 });
  }

  if (res.status !== 200) {
    const diagFail = consumePendingReplyTicketDiagnosticSummary();
    if (diagFail) {
      console.info(
        '[reply-ticket-diagnostic:final]',
        JSON.stringify({
          ...diagFail,
          dedupe_inserted_or_already_processed: 'skipped',
          route_response_2xx: false,
        })
      );
    }
    return res;
  }

  const { error: insertErr } = await db
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: eventType });
  if (insertErr) {
    if (insertErr.code === '23505') {
      const diagDup = consumePendingReplyTicketDiagnosticSummary();
      if (diagDup) {
        console.info(
          '[reply-ticket-diagnostic:final]',
          JSON.stringify({
            ...diagDup,
            dedupe_inserted_or_already_processed: 'already_processed',
            route_response_2xx: true,
          })
        );
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }
    console.error('[webhook] event_id=', event.id, 'event_type=', eventType, 'failure=stripe_events_insert', insertErr);
    if (ONE_TIME_KEY_EVENTS.has(event.type ?? '')) {
      const diagIdemFail = consumePendingReplyTicketDiagnosticSummary();
      if (diagIdemFail) {
        console.info(
          '[reply-ticket-diagnostic:final]',
          JSON.stringify({
            ...diagIdemFail,
            dedupe_inserted_or_already_processed: 'unknown',
            route_response_2xx: false,
          })
        );
      }
      const checkoutSessionId =
        event.type === 'charge.refunded'
          ? await lookupCheckoutSessionForRefund(db, event)
          : (event.data?.object as Stripe.Checkout.Session | undefined)?.id ?? null;
      if (checkoutSessionId) {
        let stripeEventsInsertFailedUserRefHash: string | null = null;
        if (event.type === 'checkout.session.completed') {
          const session = event.data?.object as Stripe.Checkout.Session | undefined;
          const clientReferenceId =
            typeof session?.client_reference_id === 'string' ? session.client_reference_id.trim() : '';
          if (clientReferenceId.length > 0) {
            stripeEventsInsertFailedUserRefHash = hashUserIdForLedgerLog(clientReferenceId);
          }
        }
        await insertFailedFulfillment(
          db,
          event.id,
          checkoutSessionId,
          'stripe_events_insert_failed',
          null,
          stripeEventsInsertFailedUserRefHash
        );
      }
      return NextResponse.json({ error: 'Idempotency failed' }, { status: 500 });
    }
    const diagInsSoft = consumePendingReplyTicketDiagnosticSummary();
    if (diagInsSoft) {
      console.info(
        '[reply-ticket-diagnostic:final]',
        JSON.stringify({
          ...diagInsSoft,
          dedupe_inserted_or_already_processed: 'unknown',
          route_response_2xx: true,
        })
      );
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const diagOk = consumePendingReplyTicketDiagnosticSummary();
  if (diagOk) {
    console.info(
      '[reply-ticket-diagnostic:final]',
      JSON.stringify({
        ...diagOk,
        dedupe_inserted_or_already_processed: 'inserted',
        route_response_2xx: true,
      })
    );
  }

  return res;
}

/**
 * checkout.session.completed: one-time lane only (payment mode).
 * Legacy subscription checkout sessions are ignored with 200 (no DB fulfillment).
 */
async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event, db: any): Promise<NextResponse> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.product_key === COMPATIBILITY_REPORT_FULL_PRODUCT_KEY) {
    const result = await fulfillCompatibilityCheckoutSession(stripe, session);
    if (result.ok) {
      try {
        revalidatePath('/my');
      } catch {
        /* Delivery is authoritative even if cache invalidation is unavailable. */
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }
    await insertFailedFulfillment(
      db,
      event.id,
      session.id,
      `compatibility_${result.reason}`,
      null,
      null,
    );
    const retryable =
      result.reason === 'db_error' ||
      result.reason === 'line_item_retrieve_failed';
    return NextResponse.json(
      retryable ? { error: 'fulfillment_failed' } : { received: true },
      { status: retryable ? 500 : 200 },
    );
  }
  const userId = await resolveCheckoutOwnerUserId(session);
  const productId = (session.metadata?.productId as string) ?? PRODUCT_ID_FROM_META;

  if (!userId) {
    await insertFailedFulfillment(db, event.id, session.id, 'missing_client_reference_id', null, null);
    console.error(
      '[webhook] lane=checkout',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        status: 'failed',
        failure_reason: 'missing_client_reference_id',
        checkout_session_id_present: true,
        event_id_present: true,
      }),
    );
    notifyM55OpsFireAndForget(m55OpsEventMissingClientReferenceId());
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (session.subscription && typeof session.subscription === 'string') {
    console.warn(
      '[webhook] legacy_subscription_checkout_ignored',
      JSON.stringify({
        event_id: event.id,
        event_type: event.type,
        lane: 'legacy_subscription_checkout_ignored',
      })
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // One-time lane: mode=payment only
  if (session.mode !== 'payment') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const md = session.metadata ?? {};
  const metadataProductKey =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
  if (
    typeof metadataProductKey === 'string' &&
    isReplyTicketFulfillmentProductKey(metadataProductKey)
  ) {
    const mode =
      session.livemode === false ? 'test' : session.livemode === true ? 'live' : 'unknown';
    const isLegacy = isLegacyAdditionalReplyTicketProductKey(metadataProductKey);
    const isUpgrade =
      metadataProductKey.trim() === DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY;
    console.info(
      '[reply-ticket-diagnostic:route_received]',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        checkout_session_mode: mode,
        metadata_product_key_present: metadataProductKey.length > 0,
        metadata_product_key_is_additional_reply_ticket: isLegacy,
        metadata_product_key_is_light_to_full_upgrade: isUpgrade,
        client_reference_id_present:
          typeof session.client_reference_id === 'string' &&
          session.client_reference_id.trim().length > 0,
      })
    );
    console.info(
      '[reply-ticket-diagnostic:route_branch]',
      JSON.stringify({
        reply_lane_branch_selected: true,
        dtr_branch_selected: false,
        global_dedupe_returned_before_reply_lane: false,
        route_response_kind: 'reply_ticket_delegate',
      })
    );
    return handleReplyTicketCheckoutCompleted(event, session);
  }

  if (!ALLOWED_ONE_TIME_PRODUCTS.has(productId)) {
    await insertFailedFulfillment(
      db,
      event.id,
      session.id,
      'product_mismatch',
      { productId },
      hashUserIdForLedgerLog(userId)
    );
    console.error(
      '[webhook] lane=one_time',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        status: 'failed',
        failure_reason: 'product_mismatch',
        product_id_present: Boolean(productId),
        checkout_session_id_present: true,
        event_id_present: true,
      }),
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  return handleCheckoutCompletedOneTime(stripe, event, db, session, userId, productId);
}

async function insertFailedFulfillment(
  db: any,
  eventId: string,
  checkoutSessionId: string,
  failureReason: string,
  rawMetadata: Record<string, unknown> | null,
  userRefHash: string | null
): Promise<void> {
  if (userRefHash !== null && !USER_REF_HASH_RE.test(userRefHash)) {
    console.error(
      '[webhook] failed_fulfillments_validation_failed',
      JSON.stringify({ error_code: 'INVALID_USER_REF_HASH' })
    );
    return;
  }
  try {
    await db.from('failed_fulfillments').insert({
      event_id: eventId,
      checkout_session_id: checkoutSessionId,
      failure_reason: failureReason,
      raw_metadata: rawMetadata ? (rawMetadata as object) : null,
      user_ref_hash: userRefHash,
    });
  } catch (e) {
    console.error('[webhook] failed_fulfillments insert failed', e);
  }
}

/** charge.refunded 時に stripe_events insert 失敗で failed_fulfillments に記録するため checkout_session_id を取得 */
async function lookupCheckoutSessionForRefund(db: any, event: Stripe.Event): Promise<string | null> {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent as Stripe.PaymentIntent)?.id ?? null;
  if (!paymentIntentId) return null;
  const { data } = await db.from('one_time_fulfillments').select('checkout_session_id').eq('payment_intent_id', paymentIntentId).maybeSingle();
  return (data as { checkout_session_id?: string } | null)?.checkout_session_id ?? null;
}

/**
 * One-time Checkout fulfillment lane — delegates to lib (shared with /purchase/success).
 */
async function handleCheckoutCompletedOneTime(
  stripe: Stripe,
  event: Stripe.Event,
  db: any,
  session: Stripe.Checkout.Session,
  userId: string,
  productId: string
): Promise<NextResponse> {
  void stripe;
  void productId;

  const result = await fulfillDtrCoreFromCheckoutSessionId({
    checkoutSessionId: session.id,
    expectedUserId: userId,
    eventIdForFulfillmentRow: event.id,
  });

  if (result.ok) {
    try {
      revalidatePath('/dtr/core');
      revalidatePath('/dtr/processing');
      revalidatePath('/dtr');
      revalidatePath('/dtr/lp');
      revalidatePath('/purchase/success');
    } catch (e) {
      console.error('[webhook] revalidatePath failed (non-fatal)', e);
    }
    console.info(
      '[webhook] lane=one_time',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        status: 'fulfilled',
        fulfillment_newly_created: result.fulfillmentNewlyCreated,
        checkout_session_id_present: true,
        event_id_present: true,
        user_id_present: true,
      }),
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (result.reason === 'payment_not_paid') {
    await insertFailedFulfillment(
      db,
      event.id,
      session.id,
      'payment_status_not_paid',
      { payment_status: result.detail ?? null },
      hashUserIdForLedgerLog(userId)
    );
    console.info(
      '[webhook] lane=one_time',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        status: 'skipped',
        failure_reason: 'payment_status_not_paid',
        payment_status_detail_present: Boolean(result.detail),
        checkout_session_id_present: true,
        event_id_present: true,
        user_id_present: true,
      }),
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (
    result.reason === 'session_incomplete' ||
    result.reason === 'purchase_context_invalid' ||
    result.reason === 'purchase_validation_failed' ||
    result.reason === 'user_mismatch' ||
    result.reason === 'not_payment' ||
    result.reason === 'product_not_allowed'
  ) {
    await insertFailedFulfillment(
      db,
      event.id,
      session.id,
      `fulfill_${result.reason}`,
      null,
      hashUserIdForLedgerLog(userId)
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.error(
    '[webhook] lane=one_time',
    JSON.stringify({
      event_type: 'checkout.session.completed',
      status: 'failed',
      failure_reason: result.reason,
      checkout_session_id_present: true,
      event_id_present: true,
    }),
  );
  await insertFailedFulfillment(
    db,
    event.id,
    session.id,
    'internal_processing_failed',
    null,
    hashUserIdForLedgerLog(userId)
  );
  notifyM55OpsFireAndForget(m55OpsEventInternalProcessingFailed(result.reason));
  return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
}

/**
 * charge.refunded: one-time lane only. Full refund = revoke; partial refund = keep access.
 * - Full: amount_refunded >= amount → revoke entitlement.
 * - Partial: amount_refunded < amount → no revoke (policy: partial refund keeps access).
 * Subscription refunds are out of scope.
 */
async function handleChargeRefunded(stripe: Stripe, event: Stripe.Event, db: any): Promise<NextResponse> {
  const charge = event.data.object as Stripe.Charge;
  const amount = charge.amount ?? 0;
  const amountRefunded = charge.amount_refunded ?? 0;
  const isFullRefund = amount > 0 && amountRefunded >= amount;

  if (!isFullRefund) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent as Stripe.PaymentIntent)?.id ?? null;
  if (!paymentIntentId) return NextResponse.json({ received: true }, { status: 200 });

  const { data: fulfillment } = await db.from('one_time_fulfillments').select('user_id, product_id, checkout_session_id').eq('payment_intent_id', paymentIntentId).maybeSingle();
  if (!fulfillment) return NextResponse.json({ received: true }, { status: 200 });

  const userId = (fulfillment as { user_id?: string }).user_id;
  const productId = (fulfillment as { product_id?: string }).product_id;
  const checkoutSessionId = (fulfillment as { checkout_session_id?: string }).checkout_session_id;
  if (!userId || !productId) return NextResponse.json({ received: true }, { status: 200 });

  try {
    const { error: revokeEntErr } = await db.from('entitlements').update({ status: 'revoked' }).eq('user_id', userId).eq('product_id', productId);
    if (revokeEntErr) throw revokeEntErr;

    if (productId === PRODUCT_ID_FROM_META) {
      const { error: delErr } = await db.from('entitlement_rights').delete().eq('user_id', userId).eq('right_key', DTR_CORE_RIGHT_KEY);
      if (delErr) throw delErr;
    }

    console.info(
      '[webhook] lane=one_time',
      JSON.stringify({
        event_type: 'charge.refunded',
        status: 'revoked',
        refund_type: 'full',
        payment_intent_id_present: true,
        event_id_present: true,
        user_id_present: true,
      }),
    );
  } catch (e) {
    if (checkoutSessionId) {
      await insertFailedFulfillment(
        db,
        event.id,
        checkoutSessionId,
        'revoke_failed',
        null,
        hashUserIdForLedgerLog(userId)
      );
    }
    console.error(
      '[webhook] lane=one_time',
      JSON.stringify({
        event_type: 'charge.refunded',
        status: 'failed',
        failure_reason: 'revoke_failed',
        payment_intent_id_present: Boolean(paymentIntentId),
        event_id_present: true,
      }),
    );
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
