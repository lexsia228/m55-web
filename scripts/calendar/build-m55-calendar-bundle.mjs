#!/usr/bin/env node
/**
 * Deterministic build: m55-calendar-2026-01 bundle (1900-01-01 … 2100-12-31).
 * Outputs JSON + manifest with sha256 checksums.
 */
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  iterateCivilRange,
  parseIsoDate,
  solarToLunar,
  lunarDayStemIndex,
  STEM_CHARS,
  M55_GOLDEN_ANCHOR,
} from '../../lib/m55/calendar/generation/m55LunarCore.mjs';
import { buildSolarTerms1900_2100 } from '../../lib/m55/calendar/generation/m55SolarTerms.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../lib/m55/calendar/data');
const BUNDLE_ID = 'm55-calendar-2026-01';
const RANGE_START = '1900-01-01';
const RANGE_END = '2100-12-31';
const PRIMARY_BUCKET = 'Asia/Tokyo';

function sha256FilePayload(obj) {
  const json = JSON.stringify(obj);
  return `sha256:${createHash('sha256').update(json, 'utf8').digest('hex')}`;
}

function solarYearKeyForDate(civilIso, solarYears) {
  const { year, month, day } = parseIsoDate(civilIso);
  const terms = solarYears[String(year)];
  if (!terms?.lichun) return year;
  const lichunDate = terms.lichun.slice(0, 10);
  const civil = civilIso;
  return civil < lichunDate ? year - 1 : year;
}

function buildLunarCivilDays(solarDoc) {
  const days = {};
  for (const iso of iterateCivilRange(RANGE_START, RANGE_END)) {
    const { year, month, day } = parseIsoDate(iso);
    const lunar = solarToLunar(year, month, day);
    const dayStemIndex = lunarDayStemIndex(
      lunar.lunarYear,
      lunar.lunarMonth,
      lunar.lunarDay,
      lunar.isLeapMonth,
    );
    const lunarMonthKey = lunar.isLeapMonth
      ? `${lunar.lunarYear}-leap${lunar.lunarMonth}`
      : `${lunar.lunarYear}-${lunar.lunarMonth}`;
    const lunarDayKey = `${lunar.lunarYear}-${lunar.lunarMonth}-${lunar.lunarDay}${lunar.isLeapMonth ? '-leap' : ''}`;
    days[iso] = {
      lunarYear: lunar.lunarYear,
      lunarMonth: lunar.lunarMonth,
      lunarDay: lunar.lunarDay,
      isLeapMonth: lunar.isLeapMonth,
      lunarMonthKey,
      lunarDayKey,
      dayStemIndex,
      dayStemChar: STEM_CHARS[dayStemIndex],
      solarYearKey: solarYearKeyForDate(iso, solarDoc.years),
    };
  }
  return {
    schemaVersion: 'm55-lunar-civil-days-v1',
    correctionVersion: BUNDLE_ID,
    lunarTableSource: 'm55_almanac_v1_derived',
    timezoneBucket: PRIMARY_BUCKET,
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    dayStemMethod: 'lunar_absolute_day_delta_anchor',
    dayStemAnchor: {
      civilDate: M55_GOLDEN_ANCHOR.civilDate,
      dayStemIndex: M55_GOLDEN_ANCHOR.dayStemIndex,
      dayStemChar: M55_GOLDEN_ANCHOR.dayStemChar,
    },
    days,
  };
}

function main() {
  const startedAt = new Date().toISOString();
  const solarDoc = buildSolarTerms1900_2100();
  const lunarDoc = buildLunarCivilDays(solarDoc);

  const solarPath = join(DATA_DIR, 'solar_terms_1900_2100.json');
  const lunarPath = join(DATA_DIR, 'lunar_civil_days_1900_2100.json');
  const tzPath = join(DATA_DIR, 'tz_country_primary.json');
  const manifestPath = join(DATA_DIR, 'manifest.json');

  const tzDoc = JSON.parse(readFileSync(tzPath, 'utf8'));

  writeFileSync(solarPath, `${JSON.stringify(solarDoc, null, 0)}\n`, 'utf8');
  writeFileSync(lunarPath, `${JSON.stringify(lunarDoc, null, 0)}\n`, 'utf8');

  const goldenRow = lunarDoc.days[M55_GOLDEN_ANCHOR.civilDate];
  if (!goldenRow || goldenRow.dayStemIndex !== M55_GOLDEN_ANCHOR.dayStemIndex) {
    console.error(
      'BUILD_FAIL: golden anchor',
      M55_GOLDEN_ANCHOR.civilDate,
      'expected stem',
      M55_GOLDEN_ANCHOR.dayStemIndex,
      'got',
      goldenRow?.dayStemIndex,
    );
    process.exit(1);
  }

  const files = {
    'solar_terms_1900_2100.json': {
      path: 'lib/m55/calendar/data/solar_terms_1900_2100.json',
      sha256: sha256FilePayload(solarDoc),
      bytes: Buffer.byteLength(JSON.stringify(solarDoc), 'utf8'),
    },
    'lunar_civil_days_1900_2100.json': {
      path: 'lib/m55/calendar/data/lunar_civil_days_1900_2100.json',
      sha256: sha256FilePayload(lunarDoc),
      bytes: Buffer.byteLength(JSON.stringify(lunarDoc), 'utf8'),
      dayCount: Object.keys(lunarDoc.days).length,
    },
    'tz_country_primary.json': {
      path: 'lib/m55/calendar/data/tz_country_primary.json',
      sha256: sha256FilePayload(tzDoc),
      bytes: Buffer.byteLength(JSON.stringify(tzDoc), 'utf8'),
    },
  };

  const manifest = {
    bundleId: BUNDLE_ID,
    schemaVersion: 'm55-calendar-manifest-v1',
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    primaryTimezoneBucket: PRIMARY_BUCKET,
    files,
    goldenSpotCheck: {
      caseId: 'GOLDEN_1983_02_28_V2',
      bucket: PRIMARY_BUCKET,
      civilDate: M55_GOLDEN_ANCHOR.civilDate,
      expectedDayStemIndex: M55_GOLDEN_ANCHOR.dayStemIndex,
      expectedDayStemChar: M55_GOLDEN_ANCHOR.dayStemChar,
      actualDayStemIndex: goldenRow.dayStemIndex,
      actualDayStemChar: goldenRow.dayStemChar,
      lunarDayKey: goldenRow.lunarDayKey,
      lookupBasis: 'lunar_civil_days_1900_2100.json days[civilDate] Asia/Tokyo bucket',
    },
    build: {
      script: 'scripts/calendar/build-m55-calendar-bundle.mjs',
      nodeVersion: process.version,
      generatedAt: startedAt,
      completedAt: new Date().toISOString(),
      deterministic: true,
    },
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('M55_CALENDAR_BUNDLE_BUILD_OK');
  console.log('bundleId:', BUNDLE_ID);
  console.log('range:', RANGE_START, '…', RANGE_END);
  console.log('lunarDayCount:', files['lunar_civil_days_1900_2100.json'].dayCount);
  console.log('golden:', M55_GOLDEN_ANCHOR.civilDate, goldenRow.dayStemChar, goldenRow.dayStemIndex);
}

if (!existsSync(join(DATA_DIR, 'tz_country_primary.json'))) {
  console.error('BUILD_FAIL: tz_country_primary.json missing');
  process.exit(1);
}

main();
