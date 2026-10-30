import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { R8BCommissionLedgerLineV1 } from './r8SettlementContract';
import { SettlementAllocationReadError } from './settlementReadErrors';
import { resolveFirstCommissionPayableRecordedAtUtcV1 } from './r6CommissionPayableAnchor';

type LedgerRow = {
  commission_event_id: string;
  origin_commission_event_id: string | null;
  lifecycle_state_after_event: string;
  entitlement_after_event_jpy: number;
  recorded_at: string;
  event_family: string;
  ledger_event_seq: number;
};

const LEDGER_PAGE_SIZE = 1000;

async function loadAllocatedCommissionEventIdsFailClosedV1(db: ReturnType<typeof getSupabaseAdmin>): Promise<Set<string>> {
  const allocated = new Set<string>();
  const { error } = await (db as any).from('m55_r8_payout_batch_lines_v1').select('commission_event_id').limit(1);
  if (error) {
    throw new SettlementAllocationReadError();
  }

  let from = 0;
  while (true) {
    const { data: lines, error: pageErr } = await (db as any)
      .from('m55_r8_payout_batch_lines_v1')
      .select('commission_event_id')
      .range(from, from + LEDGER_PAGE_SIZE - 1);
    if (pageErr) {
      throw new SettlementAllocationReadError();
    }
    const page = lines ?? [];
    for (const row of page) {
      if (row?.commission_event_id) allocated.add(row.commission_event_id as string);
    }
    if (page.length < LEDGER_PAGE_SIZE) break;
    from += LEDGER_PAGE_SIZE;
  }
  return allocated;
}

/**
 * R6 append-only ledger is the monetary authority for unsettled PAYABLE balances.
 */
export async function loadUnsettledPayableCommissionLinesFromR6V1(
  creatorEconomicIdentityId: string,
): Promise<R8BCommissionLedgerLineV1[]> {
  const db = getSupabaseAdmin() as any;
  const events: LedgerRow[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await db
      .from('m55_r6_commission_ledger_events')
      .select(
        'commission_event_id,origin_commission_event_id,lifecycle_state_after_event,entitlement_after_event_jpy,recorded_at,event_family,ledger_event_seq',
      )
      .eq('creator_economic_identity_id', creatorEconomicIdentityId)
      .order('ledger_event_seq', { ascending: true })
      .range(from, from + LEDGER_PAGE_SIZE - 1);
    if (error) throw new Error('COMMISSION_LEDGER_UNAVAILABLE');
    events.push(...((page ?? []) as LedgerRow[]));
    if ((page ?? []).length < LEDGER_PAGE_SIZE) break;
    from += LEDGER_PAGE_SIZE;
  }

  const latestByOrigin = new Map<string, LedgerRow>();
  const eventContext = events.map((row) => ({
    commissionEventId: row.commission_event_id,
    originCommissionEventId: row.origin_commission_event_id,
    eventFamily: row.event_family,
    lifecycleStateAfterEvent: row.lifecycle_state_after_event,
    recordedAtUtc: new Date(row.recorded_at),
  }));
  for (const row of events) {
    if (row.event_family === 'COMMISSION_ACCRUED') {
      latestByOrigin.set(row.commission_event_id, row);
      continue;
    }
    const origin = row.origin_commission_event_id;
    if (!origin) continue;
    latestByOrigin.set(origin, row);
  }

  const allocated = await loadAllocatedCommissionEventIdsFailClosedV1(db);

  const out: R8BCommissionLedgerLineV1[] = [];
  for (const [originId, latest] of latestByOrigin) {
    if (allocated.has(originId)) continue;
    if (latest.lifecycle_state_after_event !== 'COMMISSION_PAYABLE') continue;
    const entitlement = Number(latest.entitlement_after_event_jpy);
    if (!Number.isInteger(entitlement) || entitlement <= 0) continue;
    const firstPayable = resolveFirstCommissionPayableRecordedAtUtcV1(eventContext, originId);
    if (!firstPayable) continue;
    out.push({
      commissionEventId: originId,
      commissionState: 'COMMISSION_PAYABLE',
      payableAtUtc: firstPayable,
      grossCommissionJpy: entitlement,
      settledPayoutInstructionId: null,
    });
  }
  return out;
}

export async function loadAllocatedCommissionEventIdsV1(): Promise<Set<string>> {
  const db = getSupabaseAdmin();
  return loadAllocatedCommissionEventIdsFailClosedV1(db);
}
