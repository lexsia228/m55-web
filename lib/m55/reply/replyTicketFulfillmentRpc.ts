/**
 * Webhook Reply lane → DB RPC `m55_reply_ticket_fulfill_checkout_event` (M55).
 * Fulfillment side effects live in Postgres only; no wallet/ledger writes here.
 */
import { getSupabaseAdmin } from '../../supabaseAdmin';

export type M55ReplyTicketFulfillRpcStatus =
  | 'processed'
  | 'duplicate_noop'
  | 'skipped_cap'
  | 'rejected_invalid_product'
  | 'rejected_not_owner'
  | 'rejected_wallet_inactive';

export type M55ReplyTicketFulfillRpcRow = {
  status: M55ReplyTicketFulfillRpcStatus;
  wallet_id: string | null;
  ledger_id: string | null;
  available_count: number | null;
  purchased_count: number | null;
  reason: string | null;
};

function strOrNull(v: unknown): string | null {
  if (typeof v === 'string') return v;
  return null;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

export function parseM55ReplyTicketFulfillRpcRow(raw: unknown): M55ReplyTicketFulfillRpcRow {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('RPC payload not an object');
  }
  const row = raw as Record<string, unknown>;
  const status = row.status;
  const allowed: ReadonlySet<string> = new Set([
    'processed',
    'duplicate_noop',
    'skipped_cap',
    'rejected_invalid_product',
    'rejected_not_owner',
    'rejected_wallet_inactive',
  ]);
  if (typeof status !== 'string' || !allowed.has(status)) {
    throw new Error(`RPC unexpected status: ${String(status)}`);
  }
  return {
    status: status as M55ReplyTicketFulfillRpcStatus,
    wallet_id: strOrNull(row.wallet_id),
    ledger_id: strOrNull(row.ledger_id),
    available_count: numOrNull(row.available_count),
    purchased_count: numOrNull(row.purchased_count),
    reason: strOrNull(row.reason),
  };
}

export type M55ReplyTicketFulfillRpcArgs = {
  stripeEventId: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  productKey: string;
  reportInstanceId: string;
  walletScopeUserId: string;
  userRefHash: string | null;
  quantity: number;
};

/**
 * Invokes SECURITY DEFINER RPC; throws on transport/PostgREST errors (Stripe retry).
 */
export async function callM55ReplyTicketFulfillCheckoutEvent(
  args: M55ReplyTicketFulfillRpcArgs
): Promise<M55ReplyTicketFulfillRpcRow> {
  /** RPC が生成型に載っていないため、応答パースで堅牢化（generate route と同様） */
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_reply_ticket_fulfill_checkout_event', {
    p_stripe_event_id: args.stripeEventId,
    p_checkout_session_id: args.checkoutSessionId,
    p_payment_intent_id: args.paymentIntentId,
    p_product_key: args.productKey,
    p_report_instance_id: args.reportInstanceId,
    p_wallet_scope_user_id: args.walletScopeUserId,
    p_user_ref_hash: args.userRefHash,
    p_quantity: args.quantity,
  });

  if (error) {
    throw new Error(`m55_reply_ticket_fulfill_checkout_event failed: ${error.message}`);
  }
  return parseM55ReplyTicketFulfillRpcRow(data);
}
