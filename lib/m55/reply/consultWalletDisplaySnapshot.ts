/**
 * Read-only consult wallet snapshot for saved-report info display (server-only).
 * Mirrors GET /api/room/core wallet SELECT — no mutation, no wallet logic changes.
 */
import { getSupabaseAdmin } from '../../supabaseAdmin';

export type ConsultWalletDisplaySnapshot = {
  availableCount: number;
  consumedCount: number;
  totalGrantedCount: number;
  status: string;
};

export function isConsultWalletDisplaySnapshotUsable(
  snapshot: ConsultWalletDisplaySnapshot | null | undefined,
): snapshot is ConsultWalletDisplaySnapshot {
  if (!snapshot) return false;
  if (snapshot.status !== 'active') return false;
  if (!Number.isFinite(snapshot.availableCount) || snapshot.availableCount < 0) return false;
  if (!Number.isFinite(snapshot.consumedCount) || snapshot.consumedCount < 0) return false;
  if (!Number.isFinite(snapshot.totalGrantedCount) || snapshot.totalGrantedCount <= 0) return false;
  return true;
}

export function hasValidConsultWalletDenominator(snapshot: ConsultWalletDisplaySnapshot): boolean {
  return (
    Number.isFinite(snapshot.totalGrantedCount) &&
    snapshot.totalGrantedCount > 0 &&
    snapshot.totalGrantedCount >= snapshot.availableCount
  );
}

export async function readConsultWalletDisplaySnapshot(
  userId: string,
  reportInstanceId: string,
): Promise<ConsultWalletDisplaySnapshot | null> {
  if (!reportInstanceId.trim()) return null;
  try {
    const db = getSupabaseAdmin() as any;

    const { data: walletRow, error } = await db
      .from('reply_ticket_wallets')
      .select('initial_included_count, purchased_count, consumed_count, available_count, status')
      .eq('user_id', userId)
      .eq('report_instance_id', reportInstanceId.trim())
      .maybeSingle();

    if (error || !walletRow) return null;

    const pic = Number(walletRow.initial_included_count);
    const pc = Number(walletRow.purchased_count);
    const cc = Number(walletRow.consumed_count);
    const ac = Number(walletRow.available_count);
    const st = walletRow.status;

    if (
      typeof st !== 'string' ||
      !Number.isFinite(pic) ||
      !Number.isFinite(pc) ||
      !Number.isFinite(cc) ||
      !Number.isFinite(ac)
    ) {
      return null;
    }

    return {
      availableCount: Math.trunc(ac),
      consumedCount: Math.trunc(cc),
      totalGrantedCount: Math.trunc(pic) + Math.trunc(pc),
      status: st,
    };
  } catch {
    return null;
  }
}
