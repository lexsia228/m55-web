import type { JapaneseBankHolidayCalendarV1 } from './r8SettlementCalculation';

export type R8CBankBusinessDayResolutionV1 =
  | { status: 'KNOWN_BUSINESS_DAY'; calendarVersion: string }
  | { status: 'KNOWN_NON_BUSINESS_DAY'; calendarVersion: string }
  | { status: 'UNKNOWN_HOLD'; blocker: 'JAPAN_BANK_BUSINESS_DAY_CALENDAR_UNAVAILABLE' };

/**
 * No authoritative national/bank holiday feed is verified in-repo for Production scheduling.
 * UNKNOWN -> HOLD (fail-closed payout due-date publication).
 */
export const R8_C_BANK_CALENDAR_BLOCKER = 'JAPAN_BANK_BUSINESS_DAY_CALENDAR_UNAVAILABLE' as const;

export function createFailClosedBankHolidayCalendarV1(): JapaneseBankHolidayCalendarV1 {
  return {
    classifyLocalJstDate: () => 'UNKNOWN',
  };
}

export function resolveBankBusinessDayStatusV1(
  y: number,
  m1: number,
  d: number,
  calendar: JapaneseBankHolidayCalendarV1,
  calendarVersion: string,
): R8CBankBusinessDayResolutionV1 {
  const classification = calendar.classifyLocalJstDate(y, m1, d);
  if (classification === 'UNKNOWN') {
    return { status: 'UNKNOWN_HOLD', blocker: R8_C_BANK_CALENDAR_BLOCKER };
  }
  if (classification === 'BUSINESS') {
    return { status: 'KNOWN_BUSINESS_DAY', calendarVersion };
  }
  return { status: 'KNOWN_NON_BUSINESS_DAY', calendarVersion };
}
