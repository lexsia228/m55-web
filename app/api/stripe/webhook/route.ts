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
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
} from '../../../../lib/m55/reply/replyTicketCheckoutConstants';
import {
  consumePendingReplyTicketDiagnosticSummary,
  handleReplyTicketCheckoutCompleted,
} from '../../../../lib/m55/reply/replyTicketWebhookLane';
import {
  notifyM55OpsFireAndForget,
  m55OpsEventInternalProcessingFailed,
  m55OpsEventMissingClientReferenceId,
} from '../../../../lib/m55/ops/m55OpsNotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** TODO(M55 reply ticket diagnostic): remove `[reply-ticket-diagnostic:*]` logs after observation SSOT. */

const PRODUCT_ID_FROM_META = 'DTR_CORE_STATIC_V1';
const STRIPE_PRICE_PREMIUM_MONTHLY = 'STRIPE_PRICE_PREMIUM_MONTHLY';
const ALLOWED_ONE_TIME_PRODUCTS: ReadonlySet<string> = new Set([PRODUCT_ID_FROM_META]);
/** 本丸イベント: 内部処理失敗時は 500 + failed_fulfillments 記録 */
const ONE_TIME_KEY_EVENTS: ReadonlySet<string> = new Set(['checkout.session.completed', 'charge.refunded']);

/**
 * Payment-failure state machine (conservative):
 * - Do NOT immediately revoke access on a single failed renewal.
 * - Use grace period / dunning / Stripe retry before any entitlement revoke.
 * - invoice.payment_failed handling (if added) must not revoke on first failure.
 */

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
    .select('id')
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
          pk === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY
            ? 'additional_reply_ticket'
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

  // 非対象イベント（completed/refunded 以外）: stripe_events 記録後 200 early return
  if (!ONE_TIME_KEY_EVENTS.has(event.type ?? '') && event.type !== 'invoice.paid') {
    const { error: insErr } = await db.from('stripe_events').insert({ event_id: event.id, event_type: eventType });
    if (insErr?.code === '23505') {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const stripe = getStripe();
  let res: NextResponse;

  if (event.type === 'invoice.paid') {
    res = await handleInvoicePaid(stripe, event, db);
  } else if (event.type === 'checkout.session.completed') {
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
        await insertFailedFulfillment(db, event.id, checkoutSessionId, 'stripe_events_insert_failed', { error: String(insertErr?.message ?? insertErr) });
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
 * checkout.session.completed: route to subscription or one-time lane.
 * - Subscription: mode=subscription, session.subscription set → subscription lane (unchanged).
 * - One-time: mode=payment, no subscription → one-time lane.
 */
async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event, db: any): Promise<NextResponse> {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id ?? null;
  const productId = (session.metadata?.productId as string) ?? PRODUCT_ID_FROM_META;

  if (!userId) {
    await insertFailedFulfillment(db, event.id, session.id, 'missing_client_reference_id', session.metadata ?? null);
    console.error('[webhook] lane=checkout event_id=', event.id, 'checkout_session_id=', session.id, 'failure=missing_client_reference_id');
    notifyM55OpsFireAndForget(m55OpsEventMissingClientReferenceId());
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Subscription lane: unchanged
  if (session.subscription && typeof session.subscription === 'string') {
    const subErr = await upsertSubscriptionMapping(stripe, db, userId, session.subscription, session.customer as string);
    if (subErr) return subErr;
    const { error: upsertErr } = await db
      .from('entitlements')
      .upsert(
        {
          user_id: userId,
          product_id: productId,
          grant_type: 'subscription',
          source: 'stripe_subscription',
          status: 'active',
          stripe_session_id: session.id,
        },
        { onConflict: 'user_id,product_id' }
      );
    if (upsertErr) {
      console.error('[webhook] lane=subscription event_id=', event.id, 'failure=entitlements_upsert', upsertErr);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // One-time lane: mode=payment only
  if (session.mode !== 'payment') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const md = session.metadata ?? {};
  const metadataProductKey =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
  if (metadataProductKey === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY) {
    const mode =
      session.livemode === false ? 'test' : session.livemode === true ? 'live' : 'unknown';
    console.info(
      '[reply-ticket-diagnostic:route_received]',
      JSON.stringify({
        event_type: 'checkout.session.completed',
        checkout_session_mode: mode,
        metadata_product_key_present: typeof metadataProductKey === 'string' && metadataProductKey.length > 0,
        metadata_product_key_is_additional_reply_ticket: true,
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
    await insertFailedFulfillment(db, event.id, session.id, 'product_mismatch', { productId, ...(session.metadata ?? {}) });
    console.error('[webhook] lane=one_time event_id=', event.id, 'checkout_session_id=', session.id, 'failure=product_mismatch product_id=', productId);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  return handleCheckoutCompletedOneTime(stripe, event, db, session, userId, productId);
}

async function insertFailedFulfillment(db: any, eventId: string, checkoutSessionId: string, reason: string, metadata: Record<string, unknown> | null): Promise<void> {
  try {
    await db.from('failed_fulfillments').insert({
      event_id: eventId,
      checkout_session_id: checkoutSessionId,
      failure_reason: reason,
      raw_metadata: metadata ? (metadata as object) : null,
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
    console.error('[webhook] lane=one_time event_id=', event.id, 'checkout_session_id=', session.id, 'user_id=', userId, 'status=fulfilled');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (result.reason === 'payment_not_paid') {
    await insertFailedFulfillment(db, event.id, session.id, 'payment_status_not_paid', {
      payment_status: result.detail,
      ...(session.metadata ?? {}),
    });
    console.error(
      '[webhook] lane=one_time event_id=',
      event.id,
      'checkout_session_id=',
      session.id,
      'user_id=',
      userId,
      'skipped=payment_status_not_paid',
      result.detail
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (
    result.reason === 'user_mismatch' ||
    result.reason === 'not_payment' ||
    result.reason === 'product_not_allowed'
  ) {
    await insertFailedFulfillment(db, event.id, session.id, `fulfill_${result.reason}`, session.metadata ?? null);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.error('[webhook] lane=one_time event_id=', event.id, 'checkout_session_id=', session.id, 'failure=', result);
  await insertFailedFulfillment(db, event.id, session.id, 'internal_processing_failed', {
    reason: result.reason,
    detail: result.detail,
  });
  notifyM55OpsFireAndForget(m55OpsEventInternalProcessingFailed(result.reason));
  return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
}

/**
 * charge.refunded: one-time lane only. Full refund = revoke; partial refund = keep access.
 * - Full: amount_refunded >= amount → revoke entitlement.
 * - Partial: amount_refunded < amount → no revoke (policy: partial refund keeps access).
 * Subscription refunds are out of scope (invoice lane unchanged).
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

    console.error('[webhook] lane=one_time event_type=charge.refunded event_id=', event.id, 'payment_intent_id=', paymentIntentId, 'user_id=', userId, 'refund_type=full', 'status=revoked');
  } catch (e) {
    if (checkoutSessionId) {
      await insertFailedFulfillment(db, event.id, checkoutSessionId, 'revoke_failed', { payment_intent_id: paymentIntentId, error: String((e as Error)?.message ?? e) });
    }
    console.error('[webhook] lane=one_time event_type=charge.refunded event_id=', event.id, 'payment_intent_id=', paymentIntentId, 'failure=', e);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function upsertSubscriptionMapping(
  stripe: Stripe,
  db: any,
  userId: string,
  subscriptionId: string,
  customerId: string
): Promise<NextResponse | null> {
  try {
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price?.id;
    const premiumPriceId = process.env[STRIPE_PRICE_PREMIUM_MONTHLY];
    const tier = premiumPriceId && priceId === premiumPriceId ? 'premium' : 'standard';

    const { error } = await db
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          tier,
          status: sub.status === 'active' ? 'active' : sub.status,
          current_period_end: (() => {
            const cpe = (sub as unknown as { current_period_end?: number }).current_period_end;
            return cpe ? new Date(cpe * 1000).toISOString() : null;
          })(),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[webhook] subscriptions upsert failed:', error);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  } catch (e) {
    console.error('[webhook] subscription fetch failed:', e);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  return null;
}

function hasSufficientPaymentData(invoice: Record<string, unknown>): boolean {
  if (invoice.paid_out_of_band !== undefined) return true;
  const payments = (invoice as { payments?: { data?: unknown[] } }).payments;
  if (payments && typeof payments === 'object' && Array.isArray(payments.data)) return true;
  const inv = invoice as { payment_intent?: string; charge?: string };
  return !!(inv.payment_intent || inv.charge);
}

function isOutOfBandInvoice(invoice: Record<string, unknown>): boolean {
  if (invoice.paid_out_of_band === true) return true;

  const payments = (invoice as { payments?: { data?: Array<{ payment?: { charge?: string; payment_intent?: string } }> } })
    .payments;
  if (payments && typeof payments === 'object' && Array.isArray(payments.data)) {
    const hasStripePayment = payments.data.some((p) => {
      const pmt = p?.payment;
      return !!(pmt?.charge || pmt?.payment_intent);
    });
    if (!hasStripePayment) return true;
    return false;
  }

  return false;
}

const OK_200 = () => NextResponse.json({ received: true }, { status: 200 });

async function handleInvoicePaid(stripe: Stripe, event: Stripe.Event, db: any): Promise<NextResponse> {
  let invoice = event.data.object as Stripe.Invoice;
  let inv = invoice as unknown as Record<string, unknown>;

  if (!hasSufficientPaymentData(inv)) {
    try {
      const fetched = await stripe.invoices.retrieve(invoice.id, { expand: ['payments'] });
      invoice = fetched as Stripe.Invoice;
      inv = fetched as unknown as Record<string, unknown>;
    } catch (e) {
      console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'failure=invoice_fetch', e);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  if (isOutOfBandInvoice(inv)) return OK_200();

  const premiumPriceId = process.env[STRIPE_PRICE_PREMIUM_MONTHLY];
  if (!premiumPriceId) return OK_200();

  const isPremium =
    invoice.lines?.data?.some((l) => {
      const li = l as { price?: { id?: string }; price_id?: string };
      return li.price?.id === premiumPriceId || li.price_id === premiumPriceId;
    }) ?? false;
  if (!isPremium) return OK_200();

  const invSub = (invoice as unknown as { subscription?: string | { id?: string } }).subscription;
  const subscriptionId = typeof invSub === 'string' ? invSub : invSub?.id;
  if (!subscriptionId) return OK_200();

  const { data: existing } = await db.from('invoice_dtr_grants').select('invoice_id').eq('invoice_id', invoice.id).maybeSingle();
  if (existing) return OK_200();

  let sub: Stripe.Subscription;
  try {
    sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;
  } catch (e) {
    console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'failure=subscription_fetch', e);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  let userId: string | null =
    (sub.metadata?.user_id as string) ?? null;
  if (!userId) {
    const { data: subRow } = await db
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    userId = (subRow as { user_id?: string } | null)?.user_id ?? null;
  }
  if (!userId) {
    console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'failure=user_resolution subscription_id=', subscriptionId);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  const invPeriod = invoice as unknown as { period_end?: number; period_start?: number };
  const subPeriod = sub as unknown as { current_period_end?: number; current_period_start?: number };
  const periodTs = invPeriod.period_end ?? invPeriod.period_start ?? subPeriod.current_period_end ?? subPeriod.current_period_start;
  if (!periodTs) {
    console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'user_id=', userId, 'failure=period_derivation');
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  const monthKey = new Date(periodTs * 1000).toISOString().slice(0, 7);
  const rightKey = `m55_p:month:${monthKey}`;

  const { error: upsertErr } = await db
    .from('entitlement_rights')
    .upsert(
      {
        user_id: userId,
        right_key: rightKey,
        right_value: '1',
        source: `invoice:${invoice.id}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,right_key' }
    );

  if (upsertErr) {
    console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'user_id=', userId, 'failure=entitlement_rights_upsert', upsertErr);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  const { error: insertGrantErr } = await db.from('invoice_dtr_grants').insert({
    invoice_id: invoice.id,
    user_id: userId,
  });

  if (insertGrantErr) {
    if (insertGrantErr.code === '23505') return OK_200();
    console.error('[webhook] event_type=invoice.paid invoice_id=', invoice.id, 'user_id=', userId, 'failure=invoice_dtr_grants_insert', insertGrantErr);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return OK_200();
}
