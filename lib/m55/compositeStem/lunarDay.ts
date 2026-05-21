import { lookupLunarCivilDay, type LunarCivilDayRow } from '../calendar/loadCalendarBundle';
import type { BoundaryMetadata } from './types';
import { CORRECTION_VERSION, PRIMARY_TIMEZONE_BUCKET } from './constants';

export function resolveLunarCivilRow(effectiveLocalDate: string): LunarCivilDayRow {
  return lookupLunarCivilDay(effectiveLocalDate);
}

export function lunarBoundaryMetadata(
  row: LunarCivilDayRow,
  tzSource: BoundaryMetadata['tzSource'],
  timezone: string,
): Pick<
  BoundaryMetadata,
  | 'lunarYearKey'
  | 'lunarMonthKey'
  | 'lunarDayKey'
  | 'solarYearKey'
  | 'lunarTableSource'
  | 'solarTableSource'
  | 'correctionVersion'
  | 'tzSource'
  | 'timezone'
> {
  return {
    lunarYearKey: row.lunarYear,
    lunarMonthKey: row.lunarMonthKey,
    lunarDayKey: row.lunarDayKey,
    solarYearKey: row.solarYearKey,
    lunarTableSource: 'm55_almanac_v1_derived',
    solarTableSource: 'm55_solar_terms_v1',
    correctionVersion: CORRECTION_VERSION,
    tzSource,
    timezone,
  };
}

export const LUNAR_LOOKUP_BUCKET = PRIMARY_TIMEZONE_BUCKET;
