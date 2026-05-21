import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { runM55CompositeStemPipeline } from './pipeline';
import { M55CompositeStemError } from './types';
import { ENGINE_VERSION_V2, CORRECTION_VERSION } from './constants';
import type { M55CompositeCanonicalInput } from './types';

/** GX-01 / ENGINE-SPEC-C-R — must run first. */
export const GOLDEN_1983_02_28_V2: M55CompositeCanonicalInput = {
  birthDate: '1983-02-28',
  birthTime: '12:00:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
  locale: 'ja-JP',
  nickname: 'golden',
  contextScope: 'essence',
};

test('GOLDEN_1983_02_28_V2 — GX-01 stem 9 / 癸 / アナリスト', () => {
  resetCalendarBundleCacheForTests();
  const result = runM55CompositeStemPipeline(GOLDEN_1983_02_28_V2);

  assert.equal(result.engineVersion, ENGINE_VERSION_V2);
  assert.equal(result.correctionVersion, CORRECTION_VERSION);
  assert.equal(result.calculationMode, 'full');
  assert.equal(result.stemLaneIndex, 9);
  assert.equal(result.stemChar, '癸');
  assert.equal(result.paid.publicTitle, 'アナリスト');
  assert.equal(result.paid.symbol, '雨');

  assert.equal(result.boundaryMetadata.lunarDayKey, '1983-1-15');
  assert.ok(result.boundaryMetadata.solarTermKey);
  assert.ok(result.boundaryMetadata.solarTermBoundaryInstant);
  assert.equal(result.boundaryMetadata.lunarYearKey, 1983);
  assert.ok(result.boundaryMetadata.lunarMonthKey);
  assert.equal(result.boundaryMetadata.dayBoundaryRule, 'm55_day_boundary_v1');
  assert.equal(result.normalizedBirthContext.effectiveLocalDate, '1983-02-28');
});

test('fail-closed — missing calendar row out of range', () => {
  resetCalendarBundleCacheForTests();
  assert.throws(
    () =>
      runM55CompositeStemPipeline({
        ...GOLDEN_1983_02_28_V2,
        birthDate: '2101-01-01',
      }),
    (err: unknown) =>
      err instanceof M55CompositeStemError && err.code === 'M55_COMPOSITE_DATE_OUT_OF_RANGE',
  );
});

test('fail-closed — birthTimeUnknown uses solar_noon_local', () => {
  resetCalendarBundleCacheForTests();
  const result = runM55CompositeStemPipeline({
    ...GOLDEN_1983_02_28_V2,
    birthTime: null,
    birthTimeUnknown: true,
  });
  assert.equal(result.calculationMode, 'unknown_time_noon');
  assert.equal(result.normalizedBirthContext.birthTime, '12:00:00.000');
});

test('M55_DAY_BOUNDARY_V1 — 23:30 shifts effective lunar lookup +1 day', () => {
  resetCalendarBundleCacheForTests();
  const noon = runM55CompositeStemPipeline(GOLDEN_1983_02_28_V2);
  const late = runM55CompositeStemPipeline({
    ...GOLDEN_1983_02_28_V2,
    birthTime: '23:30:00',
  });
  assert.equal(late.normalizedBirthContext.effectiveLocalDate, '1983-03-01');
  assert.notEqual(late.stemLaneIndex, noon.stemLaneIndex);
});
