/**
 * Minimum recorded_at among COMMISSION_PAYABLE lifecycle rows for an origin commission.
 * Matches SSOT OLDEST_UNSETTLED_PAYABLE_AT anchor (not reset by later ADJUSTED events).
 */
export function resolveFirstCommissionPayableRecordedAtUtcV1(
  events: ReadonlyArray<{
    commissionEventId: string;
    originCommissionEventId: string | null;
    eventFamily: string;
    lifecycleStateAfterEvent: string;
    recordedAtUtc: Date;
  }>,
  originCommissionEventId: string,
): Date | null {
  let first: Date | null = null;
  for (const row of events) {
    const originKey =
      row.eventFamily === 'COMMISSION_ACCRUED' ? row.commissionEventId : row.originCommissionEventId;
    if (originKey !== originCommissionEventId) continue;
    if (row.lifecycleStateAfterEvent !== 'COMMISSION_PAYABLE') continue;
    if (!first || row.recordedAtUtc.getTime() < first.getTime()) first = row.recordedAtUtc;
  }
  return first;
}
