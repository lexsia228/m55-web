import { CALENDAR_RANGE_END, CALENDAR_RANGE_START } from '../compositeStem/constants';
import {
  type LunarCivilDayRow,
  type SolarTermYearRow,
  type M55CalendarBundle,
} from './calendarBundleTypes';
import { M55CompositeStemError } from '../compositeStem/types';

export function lookupLunarCivilDayFromBundle(
  bundle: M55CalendarBundle,
  civilDate: string,
): LunarCivilDayRow {
  if (civilDate < CALENDAR_RANGE_START || civilDate > CALENDAR_RANGE_END) {
    throw new M55CompositeStemError('M55_COMPOSITE_DATE_OUT_OF_RANGE', civilDate);
  }
  const row = bundle.lunar.days[civilDate];
  if (!row) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_MISSING', civilDate);
  }
  return row;
}

export function lookupSolarTermsForYearFromBundle(
  bundle: M55CalendarBundle,
  year: number,
): SolarTermYearRow {
  const row = bundle.solar.years[String(year)];
  if (!row) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_MISSING', `solar:${year}`);
  }
  return row;
}

