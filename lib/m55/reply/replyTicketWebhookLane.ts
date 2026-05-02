/**
 * Stripe Webhook — additional reply-ticket lane (checkout.session.completed).
 * Delegates fulfillment to Postgres RPC; no wallet/ledger updates in app code.
 * SSOT: docs/ssot/M55_REPLY_TICKET_WEBHOOK_RPC_CALL_IMPLEMENTATION_GATE_v1.md
 *
 * TODO(M55 reply ticket diagnostic): remove pending diagnostic + `[reply-ticket-diagnostic:*]` logs after observation SSOT.
 */

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
} from './replyTicketCheckoutConstants';
import { callM55ReplyTicketFulfillCheckoutEvent } from './replyTicketFulfillmentRpc';
import type { M55ReplyTicketFulfillRpcRow } from './replyTicketFulfillmentRpc';

/** Loose hex-UUID shape check before RPC (DB enforces final validity). */
const UUID_HEX_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidReportInstanceUuid(value: string): boolean {
  return UUID_HEX_RE.test(value.trim());
}

/** In-memory handoff to `route.ts` for final dedupe + 2xx (dev / single replay; not for concurrent load). */
let pendingReplyTicketDiagnosticSummary: ReplyTicketDiagnosticSummary | null = null;

export type ReplyTicketDiagnosticSummary = {
  event_type_checkout_completed: true;
  product_key: 'additional_reply_ticket' | 'other';
  reply_lane_selected: boolean;
  metadata_required_present: boolean;
  report_instance_present: boolean;
  client_reference_id_present: boolean;
  user_ref_hash_present: boolean;
  payment_intent_present: boolean;
  amount_currency_expected: boolean;
  dedupe_checked: true;
  dedupe_inserted_or_already_processed: 'inserted' | 'already_processed' | 'skipped' | 'unknown';
  rpc_called: boolean;
  rpc_ok: boolean | 'unknown';
  wallet_grant_attempted: boolean;
  wallet_grant_observed: boolean | 'unknown';
  ledger_grant_attempted: boolean;
  ledger_grant_observed: boolean | 'unknown';
  fulfill_status: 'fulfilled' | 'skipped' | 'failed' | 'unknown';
  route_response_2xx: boolean;
};

export function consumePendingReplyTicketDiagnosticSummary(): ReplyTicketDiagnosticSummary | null {
  const x = pendingReplyTicketDiagnosticSummary;
  pendingReplyTicketDiagnosticSummary = null;
  return x;
}

function amountCurrencyExpected(session: Stripe.Checkout.Session): boolean {
  return (
    session.mode === 'payment' &&
    session.payment_status === 'paid' &&
    typeof session.amount_total === 'number' &&
    session.amount_total > 0 &&
    typeof session.currency === 'string' &&
    session.currency.length > 0
  );
}

function mapRpcToFulfillSummary(
  status: M55ReplyTicketFulfillRpcRow['status']
): 'fulfilled' | 'skipped' | 'failed' {
  switch (status) {
    case 'processed':
      return 'fulfilled';
    case 'duplicate_noop':
    case 'skipped_cap':
      return 'skipped';
    case 'rejected_invalid_product':
    case 'rejected_not_owner':
    case 'rejected_wallet_inactive':
      return 'failed';
  }
}

function buildBaseSummary(
  session: Stripe.Checkout.Session,
  md: Stripe.Metadata,
  mdProductKey: string | undefined
): Pick<
  ReplyTicketDiagnosticSummary,
  | 'product_key'
  | 'metadata_required_present'
  | 'report_instance_present'
  | 'client_reference_id_present'
  | 'user_ref_hash_present'
  | 'payment_intent_present'
  | 'amount_currency_expected'
> {
  const reportRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.reportInstanceId] ?? md.report_instance_id;
  const reportInstanceId =
    typeof reportRaw === 'string' && reportRaw.trim().length > 0 ? reportRaw.trim() : null;
  const walletScopeUserId =
    typeof session.client_reference_id === 'string' ? session.client_reference_id.trim() : '';
  const userRefRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.userRefHash] ?? md.user_ref_hash;
  const userRefHash =
    typeof userRefRaw === 'string' && userRefRaw.trim().length > 0
      ? userRefRaw.trim()
      : null;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const product_key =
    mdProductKey === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY ? 'additional_reply_ticket' : 'other';
  const metadata_required_present =
    typeof mdProductKey === 'string' &&
    mdProductKey.trim() === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY;

  return {
    product_key,
    metadata_required_present,
    report_instance_present: !!reportInstanceId && isValidReportInstanceUuid(reportInstanceId),
    client_reference_id_present: walletScopeUserId.length > 0,
    user_ref_hash_present: userRefHash != null,
    payment_intent_present: paymentIntentId != null,
    amount_currency_expected: amountCurrencyExpected(session),
  };
}

/**
 * Fulfillment for checkout.session.completed when metadata.product_key is the
 * additional reply ticket SKU. Does not call DTR fulfillment.
 */
export async function handleReplyTicketCheckoutCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  pendingReplyTicketDiagnosticSummary = null;

  const eventId = event.id;
  const md: Stripe.Metadata = session.metadata ?? {};
  const mdProductKey = md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.productKey] ?? md.product_key;
  const mdProductKeyStr = typeof mdProductKey === 'string' ? mdProductKey : undefined;

  const baseLog = (extra: Record<string, unknown>) =>
    console.info('[reply-ticket-diagnostic:lane]', JSON.stringify(extra));

  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    baseLog({
      phase: 'lane_entered',
      reply_lane_entered: true,
      event_id_present: false,
      fulfill_status: 'failed',
      rpc_called: false,
    });
    return NextResponse.json({ error: 'missing_event_id' }, { status: 400 });
  }

  const base = buildBaseSummary(session, md, mdProductKeyStr);

  console.info(
    '[reply-ticket-diagnostic:lane_entered]',
    JSON.stringify({
      reply_lane_entered: true,
      event_id_present: true,
      product_key_valid: mdProductKeyStr === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
      report_instance_id_present: !!(
        md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.reportInstanceId] ?? md.report_instance_id
      ),
      client_reference_id_present: base.client_reference_id_present,
      wallet_scope_user_id_present: base.client_reference_id_present,
      user_ref_hash_present: base.user_ref_hash_present,
      payment_intent_present: base.payment_intent_present,
    })
  );

  if (mdProductKey !== ADDITIONAL_REPLY_TICKET_PRODUCT_KEY) {
    baseLog({
      phase: 'product_key',
      ...base,
      reply_lane_selected: true,
      fulfill_status: 'failed',
      rpc_called: false,
    });
    return NextResponse.json({ error: 'product_key_mismatch' }, { status: 400 });
  }

  const reportRaw =
    md[REPLY_TICKET_CHECKOUT_METADATA_KEYS.reportInstanceId] ?? md.report_instance_id;
  const reportInstanceId =
    typeof reportRaw === 'string' && reportRaw.trim().length > 0 ? reportRaw.trim() : null;
  if (!reportInstanceId) {
    baseLog({
      phase: 'report_instance',
      ...base,
      reply_lane_selected: true,
      fulfill_status: 'failed',
      rpc_called: false,
    });
    return NextResponse.json({ error: 'missing_report_instance_id' }, { status: 400 });
  }

  if (!isValidReportInstanceUuid(reportInstanceId)) {
    baseLog({
      phase: 'report_instance_uuid',
      ...base,
      reply_lane_selected: true,
      fulfill_status: 'failed',
      rpc_called: false,
    });
    return NextResponse.json({ error: 'invalid_report_instance_id' }, { status: 400 });
  }

  const walletScopeUserId =
    typeof session.client_reference_id === 'string' ? session.client_reference_id.trim() : '';
  if (!walletScopeUserId) {
    baseLog({
      phase: 'wallet_scope',
      ...base,
      reply_lane_selected: true,
      fulfill_status: 'failed',
      rpc_called: false,
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

  let result: M55ReplyTicketFulfillRpcRow;
  try {
    result = await callM55ReplyTicketFulfillCheckoutEvent({
      stripeEventId: eventId.trim(),
      checkoutSessionId: session.id,
      paymentIntentId,
      productKey: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
      reportInstanceId,
      walletScopeUserId,
      userRefHash,
      quantity: 1,
    });
  } catch {
    const summary: ReplyTicketDiagnosticSummary = {
      event_type_checkout_completed: true,
      product_key: 'additional_reply_ticket',
      reply_lane_selected: true,
      metadata_required_present: true,
      report_instance_present: true,
      client_reference_id_present: true,
      user_ref_hash_present: userRefHash != null,
      payment_intent_present: paymentIntentId != null,
      amount_currency_expected: amountCurrencyExpected(session),
      dedupe_checked: true,
      dedupe_inserted_or_already_processed: 'unknown',
      rpc_called: true,
      rpc_ok: false,
      wallet_grant_attempted: true,
      wallet_grant_observed: 'unknown',
      ledger_grant_attempted: true,
      ledger_grant_observed: 'unknown',
      fulfill_status: 'failed',
      route_response_2xx: false,
    };
    pendingReplyTicketDiagnosticSummary = summary;
    console.info(
      '[reply-ticket-diagnostic:lane_rpc]',
      JSON.stringify({
        rpc_call_attempted: true,
        rpc_result_status: 'error',
        lane_response_kind: 'rpc_throw',
      })
    );
    return NextResponse.json({ error: 'rpc_failed' }, { status: 500 });
  }

  const walletObserved = result.wallet_id != null;
  const ledgerObserved = result.ledger_id != null;
  const fulfillMapped = mapRpcToFulfillSummary(result.status);

  console.info(
    '[reply-ticket-diagnostic:lane_rpc]',
    JSON.stringify({
      rpc_call_attempted: true,
      rpc_result_status: result.status,
      lane_response_kind: 'rpc_ok',
    })
  );

  switch (result.status) {
    case 'processed':
    case 'duplicate_noop':
    case 'skipped_cap':
    case 'rejected_invalid_product':
    case 'rejected_not_owner':
    case 'rejected_wallet_inactive': {
      const summary: ReplyTicketDiagnosticSummary = {
        event_type_checkout_completed: true,
        product_key: 'additional_reply_ticket',
        reply_lane_selected: true,
        metadata_required_present: true,
        report_instance_present: true,
        client_reference_id_present: true,
        user_ref_hash_present: userRefHash != null,
        payment_intent_present: paymentIntentId != null,
        amount_currency_expected: amountCurrencyExpected(session),
        dedupe_checked: true,
        dedupe_inserted_or_already_processed: 'unknown',
        rpc_called: true,
        rpc_ok: true,
        wallet_grant_attempted: true,
        wallet_grant_observed: walletObserved,
        ledger_grant_attempted: true,
        ledger_grant_observed: ledgerObserved,
        fulfill_status: fulfillMapped,
        route_response_2xx: true,
      };
      pendingReplyTicketDiagnosticSummary = summary;
      break;
    }
    default: {
      const _exhaustive: never = result.status;
      throw new Error(`unexpected fulfill_status: ${_exhaustive}`);
    }
  }

  switch (result.status) {
    case 'processed':
    case 'duplicate_noop':
      return NextResponse.json(
        { received: true, lane: 'reply_ticket', fulfill_status: result.status },
        { status: 200 }
      );
    case 'skipped_cap':
      console.warn('[webhook] reply_lane: skipped_cap (monitoring candidate)', {
        fulfill_status: result.status,
        reason_present: result.reason != null,
      });
      return NextResponse.json(
        { received: true, lane: 'reply_ticket', fulfill_status: result.status },
        { status: 200 }
      );
    case 'rejected_invalid_product':
    case 'rejected_not_owner':
    case 'rejected_wallet_inactive':
      console.warn('[webhook] reply_lane: fulfillment no-op (monitoring candidate)', {
        fulfill_status: result.status,
        reason_present: result.reason != null,
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
