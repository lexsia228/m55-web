import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { M55CompositeStemError } from '../compositeStem/types';
import { CALENDAR_RANGE_END, CALENDAR_RANGE_START, CORRECTION_VERSION } from '../compositeStem/constants';
import { lookupCountryTimezone as lookupCountryTimezoneFromJson } from './countryTimezone';
import {
  lookupLunarCivilDayFromBundle,
  lookupSolarTermsForYearFromBundle,
} from './calendarLookupPure';
import type {
  CalendarManifest,
  LunarCivilDaysDoc,
  LunarCivilDayRow,
  M55CalendarBundle,
  SolarTermYearRow,
  SolarTermsDoc,
  TzCountryDoc,
} from './calendarBundleTypes';

export type {
  LunarCivilDayRow,
  M55CalendarBundle,
  SolarTermYearRow,
} from './calendarBundleTypes';

const DATA_DIR = join(process.cwd(), 'lib/m55/calendar/data');

let cachedBundle: M55CalendarBundle | null = null;

function sha256Payload(obj: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(obj), 'utf8').digest('hex')}`;
}

function loadJsonFile<T>(filename: string): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_MISSING', filename);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function assertChecksum(filename: string, doc: unknown, manifest: CalendarManifest): void {
  const expected = manifest.files[filename]?.sha256;
  if (!expected) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', filename);
  }
  const actual = sha256Payload(doc);
  if (actual !== expected) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', filename);
  }
}

export function loadCalendarBundle(): M55CalendarBundle {
  if (cachedBundle) return cachedBundle;

  const manifest = loadJsonFile<CalendarManifest>('manifest.json');
  if (manifest.bundleId !== CORRECTION_VERSION) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'bundleId');
  }
  if (manifest.rangeStart !== CALENDAR_RANGE_START || manifest.rangeEnd !== CALENDAR_RANGE_END) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'range');
  }

  const lunar = loadJsonFile<LunarCivilDaysDoc>('lunar_civil_days_1900_2100.json');
  const solar = loadJsonFile<SolarTermsDoc>('solar_terms_1900_2100.json');
  const tz = loadJsonFile<TzCountryDoc>('tz_country_primary.json');

  assertChecksum('lunar_civil_days_1900_2100.json', lunar, manifest);
  assertChecksum('solar_terms_1900_2100.json', solar, manifest);
  assertChecksum('tz_country_primary.json', tz, manifest);

  if (lunar.correctionVersion !== CORRECTION_VERSION || solar.correctionVersion !== CORRECTION_VERSION) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'correctionVersion');
  }

  cachedBundle = { manifest, lunar, solar, tz };
  return cachedBundle;
}

export function lookupLunarCivilDay(civilDate: string): LunarCivilDayRow {
  return lookupLunarCivilDayFromBundle(loadCalendarBundle(), civilDate);
}

export function lookupSolarTermsForYear(year: number): SolarTermYearRow {
  return lookupSolarTermsForYearFromBundle(loadCalendarBundle(), year);
}

export function lookupCountryTimezone(country: string): string | null {
  return lookupCountryTimezoneFromJson(country);
}

/** Test-only: drop in-memory cache so integrity re-checks run. */
export function resetCalendarBundleCacheForTests(): void {
  cachedBundle = null;
}
