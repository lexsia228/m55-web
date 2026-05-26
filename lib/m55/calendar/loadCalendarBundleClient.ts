import manifestJson from './data/manifest.json';
import lunarJson from './data/lunar_civil_days_1900_2100.json';
import solarJson from './data/solar_terms_1900_2100.json';
import tzJson from './data/tz_country_primary.json';
import {
  type CalendarManifest,
  type LunarCivilDaysDoc,
  type SolarTermsDoc,
  type TzCountryDoc,
  type M55CalendarBundle,
} from './calendarBundleTypes';
import { CALENDAR_RANGE_END, CALENDAR_RANGE_START, CORRECTION_VERSION } from '../compositeStem/constants';
import { M55CompositeStemError } from '../compositeStem/types';
import {
  lookupLunarCivilDayFromBundle,
  lookupSolarTermsForYearFromBundle,
} from './calendarLookupPure';

const manifest = manifestJson as CalendarManifest;
const lunar = lunarJson as LunarCivilDaysDoc;
const solar = solarJson as SolarTermsDoc;
const tz = tzJson as TzCountryDoc;

let cachedBundle: M55CalendarBundle | null = null;

export function loadCalendarBundleClient(): M55CalendarBundle {
  if (cachedBundle) return cachedBundle;

  if (manifest.bundleId !== CORRECTION_VERSION) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'bundleId');
  }
  if (manifest.rangeStart !== CALENDAR_RANGE_START || manifest.rangeEnd !== CALENDAR_RANGE_END) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'range');
  }
  if (lunar.correctionVersion !== CORRECTION_VERSION || solar.correctionVersion !== CORRECTION_VERSION) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'correctionVersion');
  }

  cachedBundle = { manifest, lunar, solar, tz };
  return cachedBundle;
}

export function lookupLunarCivilDayClient(civilDate: string) {
  return lookupLunarCivilDayFromBundle(loadCalendarBundleClient(), civilDate);
}

export function lookupSolarTermsForYearClient(year: number) {
  return lookupSolarTermsForYearFromBundle(loadCalendarBundleClient(), year);
}

