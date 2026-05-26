import { lookupLunarCivilDayClient } from '../calendar/loadCalendarBundleClient';
import type { LunarCivilDayRow } from '../calendar/calendarBundleTypes';
import type { BoundaryMetadata } from './types';
import { CORRECTION_VERSION, PRIMARY_TIMEZONE_BUCKET } from './constants';

export function resolveLunarCivilRowClient(effectiveLocalDate: string): LunarCivilDayRow {
  return lookupLunarCivilDayClient(effectiveLocalDate);
}

export function lunarBoundaryMetadataClient(
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

export const LUNAR_LOOKUP_BUCKET_CLIENT = PRIMARY_TIMEZONE_BUCKET;
