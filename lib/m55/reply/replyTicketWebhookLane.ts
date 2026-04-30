/**
 * Stripe Webhook — additional reply-ticket lane (Phase III skeleton only).
 * No wallet / ledger / stripe_processed_events writes.
 * SSOT: docs/ssot/M55_REPLY_TICKET_PHASE_III_WEBHOOK_REPLY_LANE_SKELETON_RESULT_v1.md
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
} from './replyTicketCheckoutConstants';

/**
 * Acknowledged no-op skeleton for checkout.session.completed when metadata.product_key
 * is the additional reply ticket SKU. Does not call DTR fulfillment.
 */
export function handleReplyTicketCheckoutCompletedSkeleton(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): NextResponse {
  const eventId = event.id;
  if (!eventId || typeof eventId !== 'string') {
    console.error('[webhook] reply_lane skeleton: missing event.id');
    return NextResponse.json(
      { received: true, lane: 'reply_ticket_skeleton', note: 'missing_event_id' },
      { status: 200 }
    );
  }

  const md = session.metadata ?? {};
  const mdProductKey = md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
  if (mdProductKey !== ADDITIONAL_REPLY_TICKET_PRODUCT_KEY) {
    console.error('[webhook] reply_lane skeleton: product_key mismatch (internal)', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json({ received: true, lane: 'reply_ticket_skeleton' }, { status: 200 });
  }

  const reportRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.reportInstanceId] ?? md.report_instance_id;
  const reportInstanceId =
    typeof reportRaw === 'string' && reportRaw.trim().length > 0 ? reportRaw.trim() : null;
  if (!reportInstanceId) {
    console.error('[webhook] reply_lane skeleton: missing report_instance_id', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json(
      { received: true, lane: 'reply_ticket_skeleton', note: 'missing_report_instance_id' },
      { status: 200 }
    );
  }

  const checkoutSessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  console.info(
    '[webhook] reply_lane skeleton (no DB fulfillment yet)',
    JSON.stringify({
      eventId,
      checkoutSessionId,
      paymentIntentId,
      productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
      reportInstanceId,
    })
  );

  return NextResponse.json({ received: true, lane: 'reply_ticket_skeleton' }, { status: 200 });
}
