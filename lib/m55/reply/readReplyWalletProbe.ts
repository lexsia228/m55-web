import { createHash } from 'crypto';

/** Short stable hash — log correlation only; not reversible to Clerk id. */
export function hashUserIdForLedgerLog(userId: string): string {
  return createHash('sha256').update(userId, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Read-only probe for reply_ticket_wallets (PR1 ledger observability).
 * Does not mutate wallet or ledger.
 */
export type ReplyWalletProbeResult = {
  availableCount: number | null;
  status: string | null;
  readError: boolean;
};

export async function readReplyWalletProbe(db: any, userId: string): Promise<ReplyWalletProbeResult> {
  const { data, error } = await db
    .from('reply_ticket_wallets')
    .select('available_count, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[readReplyWalletProbe] select failed', error);
    return { availableCount: null, status: null, readError: true };
  }

  if (!data) {
    return { availableCount: null, status: null, readError: false };
  }

  const ac = data.available_count;
  const st = data.status;
  return {
    availableCount: typeof ac === 'number' ? ac : null,
    status: typeof st === 'string' ? st : null,
    readError: false,
  };
}
