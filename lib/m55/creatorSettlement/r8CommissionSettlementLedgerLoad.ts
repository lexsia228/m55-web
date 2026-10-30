import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { R8BCommissionLedgerLineV1 } from './r8SettlementContract';

type LedgerRow = {
  commission_event_id: string;
  origin_commission_event_id: string | null;
  lifecycle_state_after_event: string;
  entitlement_after_event_jpy: number;
  recorded_at: string;
  event_family: string;
  ledger_event_seq: number;
};

/**
 * R6 append-only ledger is the monetary authority for unsettled PAYABLE balances.
 */
export async function loadUnsettledPayableCommissionLinesFromR6V1(
  creatorEconomicIdentityId: string,
): Promise<R8BCommissionLedgerLineV1[]> {
  const db = getSupabaseAdmin() as any;
  const { data: events, error } = await db
    .from('m55_r6_commission_ledger_events')
    .select(
      'commission_event_id,origin_commission_event_id,lifecycle_state_after_event,entitlement_after_event_jpy,recorded_at,event_family,ledger_event_seq',
    )
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .order('ledger_event_seq', { ascending: true });
  if (error) throw new Error('COMMISSION_LEDGER_UNAVAILABLE');

  const latestByOrigin = new Map<string, LedgerRow>();
  for (const row of (events ?? []) as LedgerRow[]) {
    if (row.event_family === 'COMMISSION_ACCRUED') {
      latestByOrigin.set(row.commission_event_id, row);
      continue;
    }
    const origin = row.origin_commission_event_id;
    if (!origin) continue;
    latestByOrigin.set(origin, row);
  }

  const allocated = new Set<string>();
  try {
    const { data: lines, error: lineErr } = await db
      .from('m55_r8_payout_batch_lines_v1')
      .select('commission_event_id');
    if (!lineErr) {
      for (const row of lines ?? []) {
        if (row?.commission_event_id) allocated.add(row.commission_event_id as string);
      }
    }
  } catch {
    // R8 settlement tables not applied.
  }

  const out: R8BCommissionLedgerLineV1[] = [];
  for (const [originId, latest] of latestByOrigin) {
    if (allocated.has(originId)) continue;
    if (latest.lifecycle_state_after_event !== 'COMMISSION_PAYABLE') continue;
    const entitlement = Number(latest.entitlement_after_event_jpy);
    if (!Number.isInteger(entitlement) || entitlement <= 0) continue;
    out.push({
      commissionEventId: originId,
      commissionState: 'COMMISSION_PAYABLE',
      payableAtUtc: new Date(latest.recorded_at),
      grossCommissionJpy: entitlement,
      settledPayoutInstructionId: null,
    });
  }
  return out;
}

export async function loadAllocatedCommissionEventIdsV1(): Promise<Set<string>> {
  const db = getSupabaseAdmin() as any;
  const allocated = new Set<string>();
  try {
    const { data: lines, error } = await db.from('m55_r8_payout_batch_lines_v1').select('commission_event_id');
    if (error) return allocated;
    for (const row of lines ?? []) {
      if (row?.commission_event_id) allocated.add(row.commission_event_id as string);
    }
  } catch {
    // not applied
  }
  return allocated;
}
