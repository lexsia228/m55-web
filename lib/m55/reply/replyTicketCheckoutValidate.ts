/**
 * Server-only: prerequisites for additional reply-ticket Checkout (M55).
 * Does not import DTR fulfillment or oneTimeCheckout.
 */

import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { ReplyTicketCheckoutErrorCode } from './replyTicketCheckoutConstants';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  REPLY_TICKET_ADDITIONAL_MAX_PURCHASED,
  REPLY_TICKET_TOTAL_CAP_PER_REPORT,
} from './replyTicketCheckoutConstants';

export type ReplyTicketWalletGateRow = {
  id: string;
  status: string;
  initial_included_count: number;
  purchased_count: number;
  available_count: number;
};

export type ReplyTicketCheckoutValidateResult =
  | { ok: true; wallet: ReplyTicketWalletGateRow }
  | { ok: false; code: ReplyTicketCheckoutErrorCode };

/**
 * report_instance_id must match a snapshot row owned by the Clerk user (fail-closed).
 */
export async function verifyUserOwnsReportInstance(
  userId: string,
  reportInstanceId: string
): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('dtr_report_snapshots')
    .select('id')
    .eq('id', reportInstanceId)
    .eq('user_id', userId)
    .is('user_hidden_at', null)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

function rowFromWallet(data: Record<string, unknown>): ReplyTicketWalletGateRow | null {
  const id = data.id;
  const status = data.status;
  if (typeof id !== 'string' || typeof status !== 'string') return null;
  const pic = Number(data.initial_included_count);
  const pc = Number(data.purchased_count);
  const ac = Number(data.available_count);
  if (!Number.isFinite(pic) || !Number.isFinite(pc) || !Number.isFinite(ac)) return null;
  return {
    id,
    status,
    initial_included_count: Math.trunc(pic),
    purchased_count: Math.trunc(pc),
    available_count: Math.trunc(ac),
  };
}

/**
 * Validates ownership + wallet row presence + active + capacity (per SSOT numeric rules).
 */
export async function validateReplyTicketCheckoutGate(params: {
  userId: string;
  reportInstanceId: string;
}): Promise<ReplyTicketCheckoutValidateResult> {
  const owned = await verifyUserOwnsReportInstance(params.userId, params.reportInstanceId);
  if (!owned) {
    return { ok: false, code: 'forbidden_not_owner' };
  }

  const db = getSupabaseAdmin() as any;
  /** One wallet row per (user_id, report_instance_id); additional_reply_ticket caps are per-report. */
  const { data, error } = await db
    .from('reply_ticket_wallets')
    .select('id, status, initial_included_count, purchased_count, available_count')
    .eq('user_id', params.userId)
    .eq('report_instance_id', params.reportInstanceId)
    .maybeSingle();

  if (error) {
    console.error('[replyTicketCheckoutValidate] wallet select failed', error);
    return { ok: false, code: 'stripe_error' };
  }

  if (!data) {
    return { ok: false, code: 'wallet_not_found' };
  }

  const wallet = rowFromWallet(data as Record<string, unknown>);
  if (!wallet) {
    console.error('[replyTicketCheckoutValidate] wallet row shape unexpected');
    return { ok: false, code: 'stripe_error' };
  }

  if (wallet.status !== 'active') {
    return { ok: false, code: 'wallet_not_active' };
  }

  const total = wallet.initial_included_count + wallet.purchased_count;
  if (total >= REPLY_TICKET_TOTAL_CAP_PER_REPORT || wallet.purchased_count >= REPLY_TICKET_ADDITIONAL_MAX_PURCHASED) {
    return { ok: false, code: 'cap_reached' };
  }

  return { ok: true, wallet };
}

export function isAdditionalReplyTicketProductKey(value: unknown): value is typeof ADDITIONAL_REPLY_TICKET_PRODUCT_KEY {
  return typeof value === 'string' && value.trim() === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY;
}

export function validateReplyTicketCheckoutBody(input: unknown): { reportInstanceId: string; productKey: string } | { error: ReplyTicketCheckoutErrorCode } {
  if (typeof input !== 'object' || input === null) {
    return { error: 'invalid_request' };
  }
  const o = input as Record<string, unknown>;
  const reportInstanceId = o.report_instance_id ?? o.reportInstanceId;
  if (typeof reportInstanceId !== 'string' || reportInstanceId.trim().length === 0) {
    return { error: 'invalid_request' };
  }

  const productKey = o.product_key ?? o.productKey;
  if (typeof productKey !== 'string' || productKey.trim().length === 0) {
    return { error: 'invalid_request' };
  }

  if (!isAdditionalReplyTicketProductKey(productKey)) {
    return { error: 'invalid_product' };
  }

  return { reportInstanceId: reportInstanceId.trim(), productKey: productKey.trim() };
}
