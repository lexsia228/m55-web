import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { mapPublicReasonLabelV1 } from './publicReasonMap';
import {
  M55_R7_EXPORT_KEYSET_PAGE_SIZE,
  pickLatestEntitlementsByOriginV1,
  type EntitlementLedgerRowV1,
} from './reconciliationExport';

export const UNAVAILABLE_METRIC_EXPLANATION_JA =
  'この指標は現時点では取得できません。別のデータソースが整備されるまで表示しません。' as const;

export const M55_R7_LEDGER_SCAN_MAX_PAGES = 400 as const;
export const M55_R7_COMPLIANCE_CASE_PAGE_SIZE = 50 as const;

export type MetricValueV1 =
  | { kind: 'COUNT'; value: number }
  | { kind: 'UNAVAILABLE'; explanation: string };

export const R7_UNAVAILABLE_METRICS: Readonly<Record<string, MetricValueV1>> = {
  unique_tracked_visits: { kind: 'UNAVAILABLE', explanation: UNAVAILABLE_METRIC_EXPLANATION_JA },
  valid_Free_completions: { kind: 'UNAVAILABLE', explanation: UNAVAILABLE_METRIC_EXPLANATION_JA },
  visit_based_conversion_rate: { kind: 'UNAVAILABLE', explanation: UNAVAILABLE_METRIC_EXPLANATION_JA },
};

export type DashboardSummaryV1 = {
  qualifiedTouches: MetricValueV1;
  attributedConversions: MetricValueV1;
  eligiblePaidConversions: MetricValueV1;
  attributedSales: MetricValueV1;
  commissionActivityJpy: MetricValueV1;
  currentEntitlementsByLifecycle: Record<string, number>;
  policyVersions: {
    attributionPolicyVersion: string | null;
    financialPolicyVersion: string | null;
    rateScheduleVersion: string | null;
  };
  unavailableMetrics: typeof R7_UNAVAILABLE_METRICS;
};

export type CommissionActivityKeysetCursorV1 =
  | { kind: 'ledger_seq_v2'; ledgerEventSeq: number }
  | { kind: 'legacy_recorded_at'; recordedAt: string; commissionEventId: string };

const KEYSET_V2_PREFIX = 'v2';

export type CommissionActivityRowV1 = {
  displayReference: string;
  recordedAt: string;
  lifecycleStateAfterEvent: string;
  commissionDeltaJpy: number;
  entitlementAfterEventJpy: number;
  releaseAtMs: number;
  publicReasonLabel: string;
  eventFamily: string;
};

export type ComplianceCaseKeysetCursorV1 = {
  openedAt: string;
  caseId: string;
};

const KEYSET_SEP = '\u001f';

export function encodeCommissionActivityKeysetCursorV1(
  cursor: CommissionActivityKeysetCursorV1,
): string {
  if (cursor.kind === 'ledger_seq_v2') {
    return `${KEYSET_V2_PREFIX}${KEYSET_SEP}${cursor.ledgerEventSeq}`;
  }
  return `${cursor.recordedAt}${KEYSET_SEP}${cursor.commissionEventId}`;
}

export function parseCommissionActivityKeysetCursorV1(
  raw: string | null,
): CommissionActivityKeysetCursorV1 | null {
  if (!raw) return null;
  const idx = raw.indexOf(KEYSET_SEP);
  if (idx <= 0 || idx >= raw.length - 1) return null;
  const head = raw.slice(0, idx);
  const tail = raw.slice(idx + 1);
  if (head === KEYSET_V2_PREFIX) {
    const ledgerEventSeq = Number(tail);
    if (!Number.isFinite(ledgerEventSeq)) return null;
    return { kind: 'ledger_seq_v2', ledgerEventSeq };
  }
  return { kind: 'legacy_recorded_at', recordedAt: head, commissionEventId: tail };
}

export function encodeComplianceCaseKeysetCursorV1(cursor: ComplianceCaseKeysetCursorV1): string {
  return `${cursor.openedAt}${KEYSET_SEP}${cursor.caseId}`;
}

export function parseComplianceCaseKeysetCursorV1(
  raw: string | null,
): ComplianceCaseKeysetCursorV1 | null {
  if (!raw) return null;
  const idx = raw.indexOf(KEYSET_SEP);
  if (idx <= 0 || idx >= raw.length - 1) return null;
  return { openedAt: raw.slice(0, idx), caseId: raw.slice(idx + 1) };
}

async function countInRange(
  table: string,
  filters: Record<string, unknown>,
  timeColumn: string,
  fromMs: number,
  toMs: number,
): Promise<number> {
  const db = getSupabaseAdmin() as any;
  let query = db.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  query = query.gte(timeColumn, fromMs).lte(timeColumn, toMs);
  const { count, error } = await query;
  if (error) throw new Error('DASHBOARD_READ_FAILED');
  return count ?? 0;
}

function applyLedgerKeysetFilter(
  query: any,
  cursor: CommissionActivityKeysetCursorV1 | null,
): any {
  if (!cursor) return query;
  if (cursor.kind === 'ledger_seq_v2') {
    return query.lt('ledger_event_seq', cursor.ledgerEventSeq);
  }
  const orFilter = `recorded_at.lt.${cursor.recordedAt},and(recorded_at.eq.${cursor.recordedAt},commission_event_id.lt.${cursor.commissionEventId})`;
  return query.or(orFilter);
}

async function sumLedgerNumericColumnV1(input: {
  creatorEconomicIdentityId: string;
  column: 'commissionable_revenue_jpy' | 'commission_delta_jpy';
  timeColumn: 'canonical_payment_succeeded_at_ms' | 'recorded_at';
  fromMs: number;
  toMs: number;
  eventFamily?: string;
}): Promise<number> {
  const pageSize = M55_R7_EXPORT_KEYSET_PAGE_SIZE;
  let sum = 0;
  let cursor: CommissionActivityKeysetCursorV1 | null = null;
  for (let page = 0; page < M55_R7_LEDGER_SCAN_MAX_PAGES; page += 1) {
    const db = getSupabaseAdmin() as any;
    let query = db
      .from('m55_r6_commission_ledger_events')
      .select(`commission_event_id, recorded_at, ledger_event_seq, ${input.column}`)
      .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
      .order('ledger_event_seq', { ascending: false })
      .limit(pageSize + 1);

    if (input.eventFamily) {
      query = query.eq('event_family', input.eventFamily);
    }
    if (input.timeColumn === 'canonical_payment_succeeded_at_ms') {
      query = query
        .gte('canonical_payment_succeeded_at_ms', input.fromMs)
        .lte('canonical_payment_succeeded_at_ms', input.toMs);
    } else {
      query = query
        .gte('recorded_at', new Date(input.fromMs).toISOString())
        .lte('recorded_at', new Date(input.toMs).toISOString());
    }

    query = applyLedgerKeysetFilter(query, cursor);
    const { data, error } = await query;
    if (error) throw new Error('DASHBOARD_READ_FAILED');
    const raw = data ?? [];
    const hasMore = raw.length > pageSize;
    const slice = hasMore ? raw.slice(0, pageSize) : raw;
    for (const row of slice) {
      sum += (row[input.column] as number) ?? 0;
    }
    if (!hasMore) return sum;
    const last = slice[slice.length - 1] as { ledger_event_seq: number };
    cursor = { kind: 'ledger_seq_v2', ledgerEventSeq: last.ledger_event_seq };
  }
  throw new Error('DASHBOARD_READ_INCOMPLETE');
}

async function countDistinctCommissionAccrualPurchasesV1(input: {
  creatorEconomicIdentityId: string;
  fromMs: number;
  toMs: number;
  conversionKind?: 'FIRST_ELIGIBLE_PAID';
}): Promise<number> {
  const pageSize = M55_R7_EXPORT_KEYSET_PAGE_SIZE;
  const purchaseAttemptIds = new Set<string>();
  let cursor: CommissionActivityKeysetCursorV1 | null = null;

  for (let page = 0; page < M55_R7_LEDGER_SCAN_MAX_PAGES; page += 1) {
    const db = getSupabaseAdmin() as any;
    let query = db
      .from('m55_r6_commission_ledger_events')
      .select('ledger_event_seq, purchase_attempt_id, conversion_kind')
      .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
      .eq('event_family', 'COMMISSION_ACCRUED')
      .gte('canonical_payment_succeeded_at_ms', input.fromMs)
      .lte('canonical_payment_succeeded_at_ms', input.toMs)
      .order('ledger_event_seq', { ascending: false })
      .limit(pageSize + 1);

    if (input.conversionKind) {
      query = query.eq('conversion_kind', input.conversionKind);
    }

    query = applyLedgerKeysetFilter(query, cursor);
    const { data, error } = await query;
    if (error) throw new Error('DASHBOARD_READ_FAILED');
    const raw = data ?? [];
    const hasMore = raw.length > pageSize;
    const slice = hasMore ? raw.slice(0, pageSize) : raw;

    for (const row of slice) {
      purchaseAttemptIds.add(row.purchase_attempt_id as string);
    }

    if (!hasMore) return purchaseAttemptIds.size;
    const last = slice[slice.length - 1] as { ledger_event_seq: number };
    cursor = { kind: 'ledger_seq_v2', ledgerEventSeq: last.ledger_event_seq };
  }

  throw new Error('DASHBOARD_READ_INCOMPLETE');
}

async function loadCurrentEntitlementsByLifecycleV1(
  creatorEconomicIdentityId: string,
): Promise<Record<string, number>> {
  const pageSize = M55_R7_EXPORT_KEYSET_PAGE_SIZE;
  const collected: EntitlementLedgerRowV1[] = [];
  let cursor: CommissionActivityKeysetCursorV1 | null = null;
  let completedScan = false;

  for (let page = 0; page < M55_R7_LEDGER_SCAN_MAX_PAGES; page += 1) {
    const db = getSupabaseAdmin() as any;
    let query = db
      .from('m55_r6_commission_ledger_events')
      .select(
        'ledger_event_seq, commission_event_id, recorded_at, lifecycle_state_after_event, entitlement_after_event_jpy, origin_commission_event_id',
      )
      .eq('creator_economic_identity_id', creatorEconomicIdentityId)
      .order('ledger_event_seq', { ascending: false })
      .limit(pageSize + 1);
    query = applyLedgerKeysetFilter(query, cursor);
    const { data, error } = await query;
    if (error) throw new Error('DASHBOARD_READ_FAILED');
    const raw = data ?? [];
    const hasMore = raw.length > pageSize;
    const slice = hasMore ? raw.slice(0, pageSize) : raw;

    if (slice.length === 0) {
      return {};
    }

    for (const row of slice) {
      collected.push({
        ledger_event_seq: row.ledger_event_seq as number,
        recorded_at: row.recorded_at as string,
        commission_event_id: row.commission_event_id as string,
        origin_commission_event_id: row.origin_commission_event_id as string | null,
        lifecycle_state_after_event: row.lifecycle_state_after_event as string,
        entitlement_after_event_jpy: row.entitlement_after_event_jpy as number,
      });
    }

    if (!hasMore) {
      completedScan = true;
      break;
    }
    const last = slice[slice.length - 1] as { ledger_event_seq: number };
    cursor = { kind: 'ledger_seq_v2', ledgerEventSeq: last.ledger_event_seq };
  }

  if (!completedScan) {
    throw new Error('DASHBOARD_READ_INCOMPLETE');
  }

  const latestByOrigin = pickLatestEntitlementsByOriginV1(collected);
  const currentEntitlementsByLifecycle: Record<string, number> = {};
  for (const entry of latestByOrigin.values()) {
    currentEntitlementsByLifecycle[entry.lifecycle] =
      (currentEntitlementsByLifecycle[entry.lifecycle] ?? 0) + entry.entitlement;
  }
  return currentEntitlementsByLifecycle;
}

export async function loadDashboardSummaryV1(input: {
  creatorEconomicIdentityId: string;
  fromMs: number;
  toMs: number;
}): Promise<DashboardSummaryV1> {
  const identityFilter = { creator_economic_identity_id: input.creatorEconomicIdentityId };

  const qualifiedTouches = await countInRange(
    'm55_creator_qualified_touches',
    identityFilter,
    'qualified_touch_at_ms',
    input.fromMs,
    input.toMs,
  );

  const attributedConversions = await countDistinctCommissionAccrualPurchasesV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    fromMs: input.fromMs,
    toMs: input.toMs,
  });

  const eligiblePaidConversions = await countDistinctCommissionAccrualPurchasesV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    fromMs: input.fromMs,
    toMs: input.toMs,
    conversionKind: 'FIRST_ELIGIBLE_PAID',
  });

  const attributedSales = await sumLedgerNumericColumnV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    column: 'commissionable_revenue_jpy',
    timeColumn: 'canonical_payment_succeeded_at_ms',
    fromMs: input.fromMs,
    toMs: input.toMs,
    eventFamily: 'COMMISSION_ACCRUED',
  });

  const commissionActivityJpy = await sumLedgerNumericColumnV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    column: 'commission_delta_jpy',
    timeColumn: 'recorded_at',
    fromMs: input.fromMs,
    toMs: input.toMs,
  });

  const currentEntitlementsByLifecycle = await loadCurrentEntitlementsByLifecycleV1(
    input.creatorEconomicIdentityId,
  );

  const db = getSupabaseAdmin() as any;
  const { data: policyRow } = await db
    .from('m55_r6_commission_ledger_events')
    .select('attribution_policy_version, financial_policy_version, rate_schedule_version')
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .order('ledger_event_seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    qualifiedTouches: { kind: 'COUNT', value: qualifiedTouches },
    attributedConversions: { kind: 'COUNT', value: attributedConversions },
    eligiblePaidConversions: { kind: 'COUNT', value: eligiblePaidConversions },
    attributedSales: { kind: 'COUNT', value: attributedSales },
    commissionActivityJpy: { kind: 'COUNT', value: commissionActivityJpy },
    currentEntitlementsByLifecycle,
    policyVersions: {
      attributionPolicyVersion: (policyRow?.attribution_policy_version as string) ?? null,
      financialPolicyVersion: (policyRow?.financial_policy_version as string) ?? null,
      rateScheduleVersion: (policyRow?.rate_schedule_version as string) ?? null,
    },
    unavailableMetrics: R7_UNAVAILABLE_METRICS,
  };
}

export async function loadCommissionActivityPageV1(input: {
  creatorEconomicIdentityId: string;
  fromMs: number;
  toMs: number;
  cursor: CommissionActivityKeysetCursorV1 | null;
  displayReferenceFor: (id: string) => string;
  limit: number;
}): Promise<{ rows: CommissionActivityRowV1[]; nextCursor: string | null }> {
  const pageSize = Math.min(input.limit, M55_R7_EXPORT_KEYSET_PAGE_SIZE);
  const db = getSupabaseAdmin() as any;
  let query = db
    .from('m55_r6_commission_ledger_events')
    .select(
      'commission_event_id, recorded_at, ledger_event_seq, lifecycle_state_after_event, commission_delta_jpy, entitlement_after_event_jpy, release_at_ms, reason_code, event_family',
    )
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .gte('recorded_at', new Date(input.fromMs).toISOString())
    .lte('recorded_at', new Date(input.toMs).toISOString())
    .order('ledger_event_seq', { ascending: false })
    .limit(pageSize + 1);

  query = applyLedgerKeysetFilter(query, input.cursor);

  const { data, error } = await query;
  if (error) throw new Error('DASHBOARD_READ_FAILED');

  const raw = data ?? [];
  const hasMore = raw.length > pageSize;
  const slice = hasMore ? raw.slice(0, pageSize) : raw;
  const rows: CommissionActivityRowV1[] = slice.map((row: Record<string, unknown>) => ({
    displayReference: input.displayReferenceFor(row.commission_event_id as string),
    recordedAt: row.recorded_at as string,
    lifecycleStateAfterEvent: row.lifecycle_state_after_event as string,
    commissionDeltaJpy: row.commission_delta_jpy as number,
    entitlementAfterEventJpy: row.entitlement_after_event_jpy as number,
    releaseAtMs: row.release_at_ms as number,
    publicReasonLabel: mapPublicReasonLabelV1(row.reason_code as string),
    eventFamily: row.event_family as string,
  }));

  const last = slice[slice.length - 1] as { ledger_event_seq: number } | undefined;
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeCommissionActivityKeysetCursorV1({
            kind: 'ledger_seq_v2',
            ledgerEventSeq: last.ledger_event_seq,
          })
        : null,
  };
}

export async function loadOwnedComplianceCasesPageV1(input: {
  creatorEconomicIdentityId: string;
  fromMs: number;
  toMs: number;
  cursor: ComplianceCaseKeysetCursorV1 | null;
  limit: number;
  displayReferenceFor: (id: string) => string;
}): Promise<{
  rows: Array<{
    displayReference: string;
    caseKind: string;
    status: string;
    openedAt: string;
    resolvedAt: string | null;
    publicDecisionLabel: string;
  }>;
  nextCursor: string | null;
}> {
  const pageSize = Math.min(input.limit, M55_R7_COMPLIANCE_CASE_PAGE_SIZE);
  const fromIso = new Date(input.fromMs).toISOString();
  const toIso = new Date(input.toMs).toISOString();
  const db = getSupabaseAdmin() as any;
  let query = db
    .from('m55_r5_compliance_cases')
    .select('case_id, case_kind, status, opened_at, resolved_at, decision, decision_reason')
    .eq('creator_economic_identity_id', input.creatorEconomicIdentityId)
    .gte('opened_at', fromIso)
    .lte('opened_at', toIso)
    .order('opened_at', { ascending: false })
    .order('case_id', { ascending: false })
    .limit(pageSize + 1);

  if (input.cursor) {
    const orFilter = `opened_at.lt.${input.cursor.openedAt},and(opened_at.eq.${input.cursor.openedAt},case_id.lt.${input.cursor.caseId})`;
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error('COMPLIANCE_READ_FAILED');

  const raw = data ?? [];
  const hasMore = raw.length > pageSize;
  const slice = hasMore ? raw.slice(0, pageSize) : raw;
  const rows = slice.map((row: Record<string, unknown>) => ({
    displayReference: input.displayReferenceFor(row.case_id as string),
    caseKind: row.case_kind as string,
    status: row.status as string,
    openedAt: row.opened_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    publicDecisionLabel: mapPublicReasonLabelV1(
      (row.decision_reason as string | null) ?? (row.decision as string | null),
    ),
  }));

  const last = slice[slice.length - 1] as { opened_at: string; case_id: string } | undefined;
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeComplianceCaseKeysetCursorV1({ openedAt: last.opened_at, caseId: last.case_id })
        : null,
  };
}
