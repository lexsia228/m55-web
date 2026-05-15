import { createHash } from 'crypto';

/** Short stable hash — log correlation only; not reversible to Clerk id. */
export function hashUserIdForLedgerLog(userId: string): string {
  return createHash('sha256').update(userId, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Read-only probe for reply_ticket_wallets (PR1 ledger observability).
 * Does not mutate wallet or ledger.
 *
 * Until `reply_ticket_wallets.report_instance_id` exists (migration gate), lookups remain
 * **legacy `user_id` single-row** — `reportInstanceId`, when passed, is echoed only for logs / future scoped SELECT.
 */
export type ReplyWalletProbeResult = {
  availableCount: number | null;
  status: string | null;
  readError: boolean;
  /** Echo of optional probe context (`dtr_report_snapshots.id` when known). */
  requestedReportInstanceId?: string;
  /** True once DB supports scoped wallet rows AND query uses scoped SELECT. Until then always false. */
  scopedWalletLookupActive: boolean;
};

export async function readReplyWalletProbe(
  db: any,
  userId: string,
  reportInstanceId?: string
): Promise<ReplyWalletProbeResult> {
  const { data, error } = await db
    .from('reply_ticket_wallets')
    .select('available_count, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[readReplyWalletProbe] select failed', error);
    return {
      availableCount: null,
      status: null,
      readError: true,
      ...(reportInstanceId !== undefined ? { requestedReportInstanceId: reportInstanceId } : {}),
      scopedWalletLookupActive: false,
    };
  }

  if (!data) {
    return {
      availableCount: null,
      status: null,
      readError: false,
      ...(reportInstanceId !== undefined ? { requestedReportInstanceId: reportInstanceId } : {}),
      scopedWalletLookupActive: false,
    };
  }

  const ac = data.available_count;
  const st = data.status;
  return {
    availableCount: typeof ac === 'number' ? ac : null,
    status: typeof st === 'string' ? st : null,
    readError: false,
    ...(reportInstanceId !== undefined ? { requestedReportInstanceId: reportInstanceId } : {}),
    scopedWalletLookupActive: false,
  };
}
