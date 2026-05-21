#!/usr/bin/env node
/**
 * Fail-closed integrity verify for m55-calendar-2026-01.
 * - manifest checksums
 * - full civil range coverage
 * - golden 1983-02-28 lookup
 * - no missing keys in range
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iterateCivilRange, M55_GOLDEN_ANCHOR } from '../../lib/m55/calendar/generation/m55LunarCore.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../lib/m55/calendar/data');

const BUNDLE_ID = 'm55-calendar-2026-01';
const RANGE_START = '1900-01-01';
const RANGE_END = '2100-12-31';

function sha256Payload(obj) {
  const json = JSON.stringify(obj);
  return `sha256:${createHash('sha256').update(json, 'utf8').digest('hex')}`;
}

function fail(code, detail) {
  console.error('VERIFY_FAIL:', code, detail ?? '');
  process.exit(1);
}

function loadJson(name) {
  const path = join(DATA_DIR, name);
  if (!existsSync(path)) fail('M55_COMPOSITE_CALENDAR_TABLE_MISSING', path);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const manifest = loadJson('manifest.json');
  const solar = loadJson('solar_terms_1900_2100.json');
  const lunar = loadJson('lunar_civil_days_1900_2100.json');
  const tz = loadJson('tz_country_primary.json');

  if (manifest.bundleId !== BUNDLE_ID) {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', `bundleId ${manifest.bundleId}`);
  }
  if (manifest.rangeStart !== RANGE_START || manifest.rangeEnd !== RANGE_END) {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'range mismatch');
  }

  const checks = [
    ['solar_terms_1900_2100.json', solar],
    ['lunar_civil_days_1900_2100.json', lunar],
    ['tz_country_primary.json', tz],
  ];

  for (const [fileName, doc] of checks) {
    const expected = manifest.files?.[fileName]?.sha256;
    const actual = sha256Payload(doc);
    if (!expected || expected !== actual) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', `${fileName} checksum`);
    }
    if (doc.correctionVersion !== BUNDLE_ID) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', `${fileName} correctionVersion`);
    }
  }

  if (solar.schemaVersion !== 'm55-solar-terms-v1') {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'solar schema');
  }
  if (lunar.schemaVersion !== 'm55-lunar-civil-days-v1') {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'lunar schema');
  }

  for (let y = 1900; y <= 2100; y += 1) {
    if (!solar.years?.[String(y)]) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_MISSING', `solar year ${y}`);
    }
    if (!solar.years[String(y)].lichun) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_MISSING', `solar lichun ${y}`);
    }
  }

  let expectedDayCount = 0;
  for (const iso of iterateCivilRange(RANGE_START, RANGE_END)) {
    expectedDayCount += 1;
    const row = lunar.days?.[iso];
    if (!row) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_MISSING', iso);
    }
    if (
      typeof row.dayStemIndex !== 'number' ||
      row.dayStemIndex < 0 ||
      row.dayStemIndex > 9 ||
      !row.lunarDayKey ||
      row.lunarDay < 1 ||
      row.lunarMonth < 1 ||
      row.lunarMonth > 12
    ) {
      fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', `row ${iso}`);
    }
  }

  const actualDayCount = Object.keys(lunar.days).length;
  if (actualDayCount !== expectedDayCount) {
    fail(
      'M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL',
      `dayCount expected ${expectedDayCount} got ${actualDayCount}`,
    );
  }

  const golden = lunar.days[M55_GOLDEN_ANCHOR.civilDate];
  if (!golden) {
    fail('M55_COMPOSITE_CALENDAR_TABLE_MISSING', M55_GOLDEN_ANCHOR.civilDate);
  }
  if (golden.dayStemIndex !== M55_GOLDEN_ANCHOR.dayStemIndex) {
    fail(
      'GOLDEN_1983_02_28_V2_FAIL',
      `stem expected ${M55_GOLDEN_ANCHOR.dayStemIndex} got ${golden.dayStemIndex}`,
    );
  }
  if (golden.dayStemChar !== M55_GOLDEN_ANCHOR.dayStemChar) {
    fail(
      'GOLDEN_1983_02_28_V2_FAIL',
      `char expected ${M55_GOLDEN_ANCHOR.dayStemChar} got ${golden.dayStemChar}`,
    );
  }

  const spot = manifest.goldenSpotCheck;
  if (!spot || spot.caseId !== 'GOLDEN_1983_02_28_V2') {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'manifest goldenSpotCheck');
  }
  if (spot.actualDayStemIndex !== M55_GOLDEN_ANCHOR.dayStemIndex) {
    fail('GOLDEN_1983_02_28_V2_FAIL', 'manifest spot mismatch');
  }

  if (!tz.countries?.JP || tz.countries.JP !== 'Asia/Tokyo') {
    fail('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'JP tz');
  }

  console.log('M55_CALENDAR_BUNDLE_VERIFY_OK');
  console.log('bundleId:', BUNDLE_ID);
  console.log('range:', RANGE_START, '…', RANGE_END);
  console.log('dayCount:', actualDayCount);
  console.log(
    'golden:',
    M55_GOLDEN_ANCHOR.civilDate,
    '→',
    golden.dayStemChar,
    `(${golden.dayStemIndex})`,
    'lunarDayKey:',
    golden.lunarDayKey,
  );
  console.log('lookupBasis:', spot.lookupBasis);
}

main();
