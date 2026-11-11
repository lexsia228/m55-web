import {
  R8_B_STANDARD_PAYOUT_FEE_BASE_JPY,
  R8_B_STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY,
  R8_B_STANDARD_PAYOUT_THRESHOLD_JPY,
  R8_B_TAIL_SETTLEMENT_TRIGGER_AGE_DAYS,
  type R8BCommissionLedgerLineV1,
  type R8BPayoutInstructionModeV1,
} from './r8SettlementContract';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function isSafeSettlementMoneyIntegerJpy(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
}

/** Prior calendar month end 23:59:59.999 JST for a batch executed in `batchYear`/`batchMonth1` (1–12). */
export function computePriorMonthEndCutoffInstantUtc(batchYear: number, batchMonth1: number): Date | null {
  if (!Number.isInteger(batchYear) || !Number.isInteger(batchMonth1) || batchMonth1 < 1 || batchMonth1 > 12) {
    return null;
  }
  let cutoffYear = batchYear;
  let cutoffMonth1 = batchMonth1 - 1;
  if (cutoffMonth1 === 0) {
    cutoffMonth1 = 12;
    cutoffYear -= 1;
  }
  const daysInMonth = new Date(Date.UTC(cutoffYear, cutoffMonth1, 0)).getUTCDate();
  return new Date(Date.UTC(cutoffYear, cutoffMonth1 - 1, daysInMonth, 14, 59, 59, 999));
}

export function isPayableAtOrBeforeCutoffJst(payableAtUtc: Date, cutoffInstantUtc: Date): boolean {
  return payableAtUtc.getTime() <= cutoffInstantUtc.getTime();
}

export function filterStandardBatchEligibleCommissionLinesV1(
  lines: ReadonlyArray<R8BCommissionLedgerLineV1>,
  cutoffInstantUtc: Date,
): R8BCommissionLedgerLineV1[] {
  return lines.filter(
    (line) =>
      line.commissionState === 'COMMISSION_PAYABLE' &&
      line.settledPayoutInstructionId == null &&
      isPayableAtOrBeforeCutoffJst(line.payableAtUtc, cutoffInstantUtc) &&
      isSafeSettlementMoneyIntegerJpy(line.grossCommissionJpy),
  );
}

export function sumSettlementPayableJpy(lines: ReadonlyArray<R8BCommissionLedgerLineV1>): number | null {
  let total = 0;
  for (const line of lines) {
    if (!isSafeSettlementMoneyIntegerJpy(line.grossCommissionJpy)) return null;
    total += line.grossCommissionJpy;
  }
  return total;
}

export function computeStandardPayoutProcessingFeeJpy(settlementPayableJpy: number): number | null {
  if (!isSafeSettlementMoneyIntegerJpy(settlementPayableJpy)) return null;
  const excess = Math.max(settlementPayableJpy - R8_B_STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY, 0);
  const incrementTens = Math.floor((excess * 55 + 99_999) / 100_000);
  return R8_B_STANDARD_PAYOUT_FEE_BASE_JPY + 10 * incrementTens;
}

export function computeTailEffectivePayoutFeeJpy(settlementPayableJpy: number): number | null {
  const standard = computeStandardPayoutProcessingFeeJpy(settlementPayableJpy);
  if (standard === null) return null;
  const cap = Math.floor(settlementPayableJpy * 0.25);
  return Math.min(standard, cap);
}

export function computeNetPayoutJpy(args: {
  settlementPayableJpy: number;
  payoutProcessingFeeJpy: number;
  withholdingJpy: number;
}): number | null {
  const { settlementPayableJpy, payoutProcessingFeeJpy, withholdingJpy } = args;
  if (
    !isSafeSettlementMoneyIntegerJpy(settlementPayableJpy) ||
    !isSafeSettlementMoneyIntegerJpy(payoutProcessingFeeJpy) ||
    !isSafeSettlementMoneyIntegerJpy(withholdingJpy)
  ) {
    return null;
  }
  const net = settlementPayableJpy - payoutProcessingFeeJpy - withholdingJpy;
  if (net < 0) return null;
  return net;
}

/** 15th calendar day 00:00:00 JST in the month following the cutoff month. */
export function computeStandardPayoutDueInstantUtc(cutoffInstantUtc: Date): Date | null {
  const jstMs = cutoffInstantUtc.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstMs);
  let year = jstDate.getUTCFullYear();
  let month0 = jstDate.getUTCMonth();
  month0 += 1;
  if (month0 > 11) {
    month0 = 0;
    year += 1;
  }
  const dueMonth1 = month0 + 1;
  return new Date(Date.UTC(year, dueMonth1 - 1, 14, 15, 0, 0, 0));
}

export function computeTailDueInstantUtc(oldestUnsettledPayableAtUtc: Date): Date | null {
  if (!(oldestUnsettledPayableAtUtc instanceof Date) || Number.isNaN(oldestUnsettledPayableAtUtc.getTime())) {
    return null;
  }
  return new Date(
    oldestUnsettledPayableAtUtc.getTime() + R8_B_TAIL_SETTLEMENT_TRIGGER_AGE_DAYS * MS_PER_DAY,
  );
}

export function findOldestUnsettledPayableAtUtc(
  lines: ReadonlyArray<R8BCommissionLedgerLineV1>,
): Date | null {
  let oldest: Date | null = null;
  for (const line of lines) {
    if (line.commissionState !== 'COMMISSION_PAYABLE' || line.settledPayoutInstructionId != null) continue;
    if (!oldest || line.payableAtUtc.getTime() < oldest.getTime()) oldest = line.payableAtUtc;
  }
  return oldest;
}

export type JapaneseBankHolidayCalendarV1 = {
  classifyLocalJstDate(y: number, m1: number, d: number): 'BUSINESS' | 'NON_BUSINESS' | 'UNKNOWN';
};

export function adjustToNextJapaneseBankBusinessDayUtc(
  scheduledDueUtc: Date,
  calendar: JapaneseBankHolidayCalendarV1,
): { ok: true; payoutDueAtUtc: Date } | { ok: false; reason: 'BANK_HOLIDAY_CALENDAR_UNKNOWN' } {
  let cursor = scheduledDueUtc;
  for (let i = 0; i < 370; i += 1) {
    const jstMs = cursor.getTime() + JST_OFFSET_MS;
    const jst = new Date(jstMs);
    const y = jst.getUTCFullYear();
    const m1 = jst.getUTCMonth() + 1;
    const d = jst.getUTCDate();
    const classification = calendar.classifyLocalJstDate(y, m1, d);
    if (classification === 'UNKNOWN') return { ok: false, reason: 'BANK_HOLIDAY_CALENDAR_UNKNOWN' };
    if (classification === 'BUSINESS') return { ok: true, payoutDueAtUtc: cursor };
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }
  return { ok: false, reason: 'BANK_HOLIDAY_CALENDAR_UNKNOWN' };
}

export function resolvePayoutInstructionModeV1(args: {
  settlementPayableJpy: number;
  oldestUnsettledPayableAtUtc: Date | null;
  asOfUtc: Date;
  applicableLegalDueAtUtc: Date | null;
}): R8BPayoutInstructionModeV1 | null {
  const { settlementPayableJpy, oldestUnsettledPayableAtUtc, asOfUtc, applicableLegalDueAtUtc } = args;
  if (!isSafeSettlementMoneyIntegerJpy(settlementPayableJpy) || settlementPayableJpy <= 0) return null;

  const tailDue =
    oldestUnsettledPayableAtUtc != null ? computeTailDueInstantUtc(oldestUnsettledPayableAtUtc) : null;
  const tailForced =
    tailDue != null && asOfUtc.getTime() >= tailDue.getTime() && settlementPayableJpy > 0;

  if (applicableLegalDueAtUtc && asOfUtc.getTime() >= applicableLegalDueAtUtc.getTime()) {
    return 'LEGAL_DEADLINE';
  }
  if (settlementPayableJpy >= R8_B_STANDARD_PAYOUT_THRESHOLD_JPY) {
    return 'STANDARD_THRESHOLD';
  }
  if (tailForced) return 'TAIL_FORCED';
  return null;
}

export function computePayoutDueAtUtc(args: {
  cutoffInstantUtc: Date;
  mode: R8BPayoutInstructionModeV1;
  oldestUnsettledPayableAtUtc: Date | null;
  applicableLegalDueAtUtc: Date | null;
  calendar: JapaneseBankHolidayCalendarV1;
}): { ok: true; payoutDueAtUtc: Date } | { ok: false; reason: string } {
  const candidates: Date[] = [];
  if (args.mode === 'STANDARD_THRESHOLD') {
    const standard = computeStandardPayoutDueInstantUtc(args.cutoffInstantUtc);
    if (!standard) return { ok: false, reason: 'STANDARD_DUE_INVALID' };
    candidates.push(standard);
  }
  if (args.mode === 'TAIL_FORCED' || args.mode === 'LEGAL_DEADLINE') {
    if (!args.oldestUnsettledPayableAtUtc) return { ok: false, reason: 'TAIL_ANCHOR_MISSING' };
    const tail = computeTailDueInstantUtc(args.oldestUnsettledPayableAtUtc);
    if (!tail) return { ok: false, reason: 'TAIL_DUE_INVALID' };
    candidates.push(tail);
  }
  if (args.applicableLegalDueAtUtc) candidates.push(args.applicableLegalDueAtUtc);
  if (candidates.length === 0) return { ok: false, reason: 'NO_DUE_CANDIDATE' };
  const earliest = candidates.reduce((min, cur) => (cur.getTime() < min.getTime() ? cur : min));
  return adjustToNextJapaneseBankBusinessDayUtc(earliest, args.calendar);
}

export function selectPayoutProcessingFeeJpy(
  settlementPayableJpy: number,
  mode: R8BPayoutInstructionModeV1,
): number | null {
  if (mode === 'TAIL_FORCED' || mode === 'LEGAL_DEADLINE') {
    return computeTailEffectivePayoutFeeJpy(settlementPayableJpy);
  }
  return computeStandardPayoutProcessingFeeJpy(settlementPayableJpy);
}
