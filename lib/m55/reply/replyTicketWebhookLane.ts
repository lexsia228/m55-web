/**
 * Stripe Webhook — additional reply-ticket lane (checkout.session.completed).
 * Delegates fulfillment to Postgres RPC; no wallet/ledger updates in app code.
 * SSOT: docs/ssot/M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_GATE_v1.md
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
} from './replyTicketCheckoutConstants';
import { callM55ReplyTicketFulfillCheckoutEvent } from './replyTicketFulfillmentRpc';

/** Loose hex-UUID shape check before RPC (DB enforces final validity). */
const UUID_HEX_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidReportInstanceUuid(value: string): boolean {
  return UUID_HEX_RE.test(value.trim());
}

/**
 * Fulfillment for checkout.session.completed when metadata.product_key is the
 * additional reply ticket SKU. Does not call DTR fulfillment.
 */
export async function handleReplyTicketCheckoutCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  const eventId = event.id;
  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    console.error('[webhook] reply_lane: missing event.id (STOP, no RPC)');
    return NextResponse.json({ error: 'missing_event_id' }, { status: 400 });
  }

  const md = session.metadata ?? {};
  const mdProductKey = md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
  if (mdProductKey !== ADDITIONAL_REPLY_TICKET_PRODUCT_KEY) {
    console.error('[webhook] reply_lane: product_key mismatch (internal, no RPC)', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'product_key_mismatch' }, { status: 400 });
  }

  const reportRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.reportInstanceId] ?? md.report_instance_id;
  const reportInstanceId =
    typeof reportRaw === 'string' && reportRaw.trim().length > 0 ? reportRaw.trim() : null;
  if (!reportInstanceId) {
    console.error('[webhook] reply_lane: missing report_instance_id (STOP, no RPC)', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'missing_report_instance_id' }, { status: 400 });
  }

  if (!isValidReportInstanceUuid(reportInstanceId)) {
    console.error('[webhook] reply_lane: invalid report_instance_id (STOP, no RPC)', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'invalid_report_instance_id' }, { status: 400 });
  }

  const walletScopeUserId =
    typeof session.client_reference_id === 'string' ? session.client_reference_id.trim() : '';
  if (!walletScopeUserId) {
    console.error('[webhook] reply_lane: missing client_reference_id (STOP, no RPC)', {
      eventId,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'missing_wallet_scope' }, { status: 400 });
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const userRefRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.userRefHash] ?? md.user_ref_hash;
  const userRefHash =
    typeof userRefRaw === 'string' && userRefRaw.trim().length > 0
      ? userRefRaw.trim()
      : null;

  const result = await callM55ReplyTicketFulfillCheckoutEvent({
    stripeEventId: eventId.trim(),
    checkoutSessionId: session.id,
    paymentIntentId,
    productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
    reportInstanceId,
    walletScopeUserId,
    userRefHash,
    quantity: 1,
  });

  switch (result.status) {
    case 'processed':
    case 'duplicate_noop':
      return NextResponse.json(
        { received: true, lane: 'reply_ticket', fulfill_status: result.status },
        { status: 200 }
      );
    case 'skipped_cap':
      console.warn('[webhook] reply_lane: skipped_cap (monitoring candidate)', {
        eventId,
        sessionId: session.id,
        fulfill_status: result.status,
        reason: result.reason,
      });
      return NextResponse.json(
        { received: true, lane: 'reply_ticket', fulfill_status: result.status },
        { status: 200 }
      );
    case 'rejected_invalid_product':
    case 'rejected_not_owner':
    case 'rejected_wallet_inactive':
      console.warn('[webhook] reply_lane: fulfillment no-op (monitoring candidate)', {
        eventId,
        sessionId: session.id,
        fulfill_status: result.status,
        reason: result.reason,
      });
      return NextResponse.json(
        {
          received: true,
          lane: 'reply_ticket',
          fulfill_status: result.status,
          no_op: true,
        },
        { status: 200 }
      );
    default: {
      const _exhaustive: never = result.status;
      throw new Error(`unexpected fulfill_status: ${_exhaustive}`);
    }
  }
}
