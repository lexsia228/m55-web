/**
 * GET /api/room/core
 * Returns thread state (credits_remaining, credits_total, state) + messages.
 * Ownership gate: dtr_unlock_state must be 'owned' (fail-closed).
 * Auto-creates thread on first access for owned users.
 *
 * Hardening (2026-03-25):
 * - 23505 UNIQUE violation on thread create → retry select (race-safe)
 * - Credits reconciliation: if assistant message count doesn't match credits_remaining,
 *   correct the thread state. Handles the case where send succeeded but credits
 *   update failed in a previous request.
 *
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_ENTITLEMENT_KEY_NORMALIZATION_SSOT_v1
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import { REPLY_TICKET_TOTAL_CAP_PER_REPORT } from '../../../../lib/m55/reply/replyTicketCheckoutConstants';
import { hashUserIdForLedgerLog, readReplyWalletProbe } from '../../../../lib/m55/reply/readReplyWalletProbe';

export const dynamic = 'force-dynamic';

const REPORT_KEY = 'm55_p:core_origin';
const CREDITS_ON_PURCHASE = 1;
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

type ThreadRow = { id: string; credits_total: number; credits_remaining: number; state: string };
type WalletUiState = {
  initial_included_count: number;
  purchased_count: number;
  consumed_count: number;
  available_count: number;
  status: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // Layer1 ownership gate (fail-closed)
  const ownership = await resolveEntryReportOwnership(userId);
  if (ownership.unlockState !== 'owned') {
    return NextResponse.json({ error: 'Not owned' }, { status: 403, headers: NO_STORE });
  }

  const db = getSupabaseAdmin() as any;

  // Get or auto-create thread (race-safe: handles 23505 UNIQUE violation)
  let thread: ThreadRow | null = null;

  const { data: existing } = await db
    .from('consult_threads')
    .select('id, credits_total, credits_remaining, state')
    .eq('user_id', userId)
    .eq('report_key', REPORT_KEY)
    .maybeSingle();

  thread = existing as ThreadRow | null;

  if (!thread) {
    const { data: created, error: createErr } = await db
      .from('consult_threads')
      .insert({ user_id: userId, report_key: REPORT_KEY, credits_total: CREDITS_ON_PURCHASE, credits_remaining: CREDITS_ON_PURCHASE, state: 'writable' })
      .select('id, credits_total, credits_remaining, state')
      .single();

    if (createErr) {
      // 23505: concurrent request already created the thread — re-fetch
      if ((createErr as { code?: string }).code === '23505') {
        const { data: refetched, error: refetchErr } = await db
          .from('consult_threads')
          .select('id, credits_total, credits_remaining, state')
          .eq('user_id', userId)
          .eq('report_key', REPORT_KEY)
          .maybeSingle();
        if (refetchErr || !refetched) {
          console.error(
            '[room/core GET] refetch after 23505 failed',
            JSON.stringify({ userHash: hashUserIdForLedgerLog(userId) }),
            refetchErr
          );
          return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: NO_STORE });
        }
        thread = refetched as ThreadRow;
      } else {
        console.error(
          '[room/core GET] thread create failed',
          JSON.stringify({ userHash: hashUserIdForLedgerLog(userId) }),
          createErr
        );
        return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: NO_STORE });
      }
    } else {
      thread = created as ThreadRow;
    }
  }

  // Get messages ordered by created_at
  const { data: messages, error: msgErr } = await db
    .from('consult_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', thread!.id)
    .order('created_at', { ascending: true });

  if (msgErr) {
    console.error(
      '[room/core GET] messages fetch failed',
      JSON.stringify({ userHash: hashUserIdForLedgerLog(userId) }),
      msgErr
    );
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: NO_STORE });
  }

  const msgs = (messages ?? []) as Array<{ id: string; role: string; content: string; created_at: string }>;

  // Credits reconciliation: if assistant message count doesn't match credits_remaining,
  // a previous send succeeded but the credits update failed. Correct the thread state.
  const assistantCount = msgs.filter((m) => m.role === 'assistant').length;
  const expectedRemaining = Math.max(0, thread!.credits_total - assistantCount);
  const expectedState = expectedRemaining <= 0 ? 'read_only' : 'writable';

  if (expectedRemaining !== thread!.credits_remaining || expectedState !== thread!.state) {
    console.error(
      '[room/core GET] RECONCILING credits',
      JSON.stringify({
        userHash: hashUserIdForLedgerLog(userId),
        stored_remaining: thread!.credits_remaining,
        expected_remaining: expectedRemaining,
        stored_state: thread!.state,
        expected_state: expectedState,
      })
    );
    await db
      .from('consult_threads')
      .update({ credits_remaining: expectedRemaining, state: expectedState, updated_at: new Date().toISOString() })
      .eq('id', thread!.id);
    thread = { ...thread!, credits_remaining: expectedRemaining, state: expectedState };
  }

  let wallet: WalletUiState | null = null;
  let hasWalletRow = false;
  const reportInstanceId =
    typeof ownership.reportInstanceId === 'string' && ownership.reportInstanceId.trim().length > 0
      ? ownership.reportInstanceId.trim()
      : null;

  if (reportInstanceId) {
    try {
      const { data: walletRow } = await db
        .from('reply_ticket_wallets')
        .select('initial_included_count, purchased_count, consumed_count, available_count, status')
        .eq('user_id', userId)
        .eq('report_instance_id', reportInstanceId)
        .maybeSingle();
      if (walletRow && typeof walletRow.status === 'string') {
        const pic = Number(walletRow.initial_included_count);
        const pc = Number(walletRow.purchased_count);
        const cc = Number(walletRow.consumed_count);
        const ac = Number(walletRow.available_count);
        if (Number.isFinite(pic) && Number.isFinite(pc) && Number.isFinite(cc) && Number.isFinite(ac)) {
          wallet = {
            initial_included_count: Math.trunc(pic),
            purchased_count: Math.trunc(pc),
            consumed_count: Math.trunc(cc),
            available_count: Math.trunc(ac),
            status: walletRow.status,
          };
          hasWalletRow = true;
        }
      }
    } catch {
      // Fail closed for checkout CTA surface; keep thread/messages response intact.
      wallet = null;
      hasWalletRow = false;
    }
  }

  // Wallet SSOT for spend authority; thread credits are display-only secondary.
  const consultRem = thread!.credits_remaining;
  const walletProbe = await readReplyWalletProbe(db, userId, reportInstanceId ?? undefined);
  const walletReadError = walletProbe.readError;
  const walletMissing = !walletReadError && walletProbe.availableCount === null;
  const effectiveRemaining =
    hasWalletRow && wallet && wallet.status === 'active' ? wallet.available_count : 0;
  const numberMismatch =
    !walletReadError &&
    typeof walletProbe.availableCount === 'number' &&
    walletProbe.availableCount !== effectiveRemaining;

  if (walletReadError || walletMissing || numberMismatch) {
    console.warn(
      '[room/core GET] LEDGER_MISMATCH_PROBE',
      JSON.stringify({
        route: 'GET /api/room/core',
        timestamp: new Date().toISOString(),
        userIdHash: hashUserIdForLedgerLog(userId),
        report_key: REPORT_KEY,
        reportInstanceIdPresent: Boolean(walletProbe.requestedReportInstanceId),
        scoped_wallet_lookup_active: walletProbe.scopedWalletLookupActive,
        consult_credits_remaining: consultRem,
        effective_credits_remaining: effectiveRemaining,
        wallet_available_count: walletProbe.availableCount,
        wallet_status: walletProbe.status,
        wallet_read_error: walletReadError,
        wallet_row_missing: walletMissing,
        mismatch: numberMismatch || walletMissing,
      })
    );
  }

  const payload: Record<string, unknown> = {
    thread: {
      credits_total: thread!.credits_total,
      credits_remaining: thread!.credits_remaining,
      state: thread!.state,
    },
    messages: msgs,
    wallet,
    has_wallet_row: hasWalletRow,
    report_instance_id: reportInstanceId,
    display_cap_per_report: REPLY_TICKET_TOTAL_CAP_PER_REPORT,
    effective_credits_remaining: effectiveRemaining,
    effective_state: effectiveRemaining > 0 ? 'writable' : 'read_only',
  };

  if (process.env.NODE_ENV !== 'production') {
    payload._m55LedgerProbe = {
      route: 'GET /api/room/core',
      timestamp: new Date().toISOString(),
      userIdHash: hashUserIdForLedgerLog(userId),
      report_key: REPORT_KEY,
      reportInstanceIdPresent: Boolean(walletProbe.requestedReportInstanceId),
      scoped_wallet_lookup_active: walletProbe.scopedWalletLookupActive,
      consult_credits_remaining: consultRem,
      effective_credits_remaining: effectiveRemaining,
      wallet_available_count: walletProbe.availableCount,
      wallet_status: walletProbe.status,
      wallet_read_error: walletReadError,
      wallet_row_missing: walletMissing,
      mismatch: numberMismatch || walletMissing,
    };
  }

  return NextResponse.json(payload, { status: 200, headers: NO_STORE });
}
