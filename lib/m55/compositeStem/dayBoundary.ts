import { DAY_BOUNDARY_RULE_ID } from './constants';

function parseHour(timeHms: string): number {
  return Number(timeHms.slice(0, 2));
}

function addDaysIso(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * M55_DAY_BOUNDARY_V1: local 23:00–23:59 → effective civil date +1 for lunar lookup.
 */
export function applyDayBoundaryV1(birthDate: string, birthTime: string): {
  effectiveLocalDate: string;
  dayBoundaryRule: typeof DAY_BOUNDARY_RULE_ID;
  dayBoundaryApplied: boolean;
} {
  const hour = parseHour(birthTime);
  if (hour === 23) {
    return {
      effectiveLocalDate: addDaysIso(birthDate, 1),
      dayBoundaryRule: DAY_BOUNDARY_RULE_ID,
      dayBoundaryApplied: true,
    };
  }
  return {
    effectiveLocalDate: birthDate,
    dayBoundaryRule: DAY_BOUNDARY_RULE_ID,
    dayBoundaryApplied: false,
  };
}
