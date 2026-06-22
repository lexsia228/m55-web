import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import {
  auditRowContainsForbiddenKeys,
  runDivinationGoldenMatrixAll,
  runDivinationGoldenMatrixCase,
} from './divinationGoldenMatrixAudit';
import { DIVINATION_GOLDEN_MATRIX_CASES } from './divinationGoldenMatrixCases';

describe('divinationGoldenMatrixAudit', () => {
  it('DM-GX-01 — certified v2 anchor', () => {
    resetCalendarBundleCacheForTests();
    const row = runDivinationGoldenMatrixCase(
      DIVINATION_GOLDEN_MATRIX_CASES.find((c) => c.case_id === 'DM-GX-01')!,
    );
    assert.equal(row.certified_match, true);
    assert.equal(row.stemLaneIndex, 9);
    assert.equal(row.publicTitle, 'アナリスト');
    assert.equal(row.imagePath, '/ten-views/analyst.webp');
    assert.equal(row.displayOneLine, '小さな変化に気づき、深く読み解く人');
    assert.ok(row.solarTermKey);
    assert.ok(row.solarTermBoundaryInstant);
    assert.ok(row.lunarDayKey);
    assert.equal(row.errorCode, null);
  });

  it('DM-GX-01-noon — certified full mode', () => {
    resetCalendarBundleCacheForTests();
    const row = runDivinationGoldenMatrixCase(
      DIVINATION_GOLDEN_MATRIX_CASES.find((c) => c.case_id === 'DM-GX-01-noon')!,
    );
    assert.equal(row.certified_match, true);
    assert.equal(row.stemLaneIndex, 9);
    assert.equal(row.publicTitle, 'アナリスト');
  });

  it('all CERTIFIED cases with expected values match', () => {
    resetCalendarBundleCacheForTests();
    const certified = DIVINATION_GOLDEN_MATRIX_CASES.filter(
      (c) => c.certification_status === 'CERTIFIED' && c.expected,
    );
    for (const c of certified) {
      const row = runDivinationGoldenMatrixCase(c);
      assert.equal(
        row.certified_match,
        true,
        `${c.case_id} certified_match expected true got ${row.certified_match} error=${row.errorCode}`,
      );
      assert.equal(row.errorCode, null, `${c.case_id} errorCode`);
    }
  });

  it('REVIEW_REQUIRED cases produce rows without certified_match requirement', () => {
    resetCalendarBundleCacheForTests();
    const review = DIVINATION_GOLDEN_MATRIX_CASES.filter(
      (c) => c.certification_status === 'REVIEW_REQUIRED',
    );
    assert.ok(review.length >= 5);
    for (const c of review) {
      const row = runDivinationGoldenMatrixCase(c);
      assert.equal(row.certified_match, null);
      assert.equal(row.case_id, c.case_id);
      assert.equal(row.input_birthDate, c.birthDate);
      assert.equal(row.stemLaneIndex != null || row.errorCode != null, true);
    }
  });

  it('INVARIANT_ONLY cases assert invariant_results only', () => {
    resetCalendarBundleCacheForTests();
    const invariantCases = DIVINATION_GOLDEN_MATRIX_CASES.filter(
      (c) => c.certification_status === 'INVARIANT_ONLY',
    );
    for (const c of invariantCases) {
      const row = runDivinationGoldenMatrixCase(c);
      assert.equal(row.certified_match, null);
      assert.ok(Object.keys(row.invariant_results).length > 0);
      assert.equal(
        Object.values(row.invariant_results).every((v) => v === true),
        true,
        `${c.case_id} invariants ${JSON.stringify(row.invariant_results)}`,
      );
    }
  });

  it('CERTIFIED cases include boundary metadata', () => {
    resetCalendarBundleCacheForTests();
    const row = runDivinationGoldenMatrixCase(
      DIVINATION_GOLDEN_MATRIX_CASES.find((c) => c.case_id === 'DM-SOL-2024-02-04')!,
    );
    assert.equal(row.certified_match, true);
    assert.ok(row.solarTermKey);
    assert.ok(row.solarTermBoundaryInstant);
    assert.ok(row.lunarDayKey);
    assert.ok(row.lunarMonthKey);
    assert.equal(row.dayBoundaryRule, 'm55_day_boundary_v1');
  });

  it('no audit row includes forbidden raw fields', () => {
    resetCalendarBundleCacheForTests();
    const rows = runDivinationGoldenMatrixAll(DIVINATION_GOLDEN_MATRIX_CASES);
    for (const row of rows) {
      const hits = auditRowContainsForbiddenKeys(row);
      assert.deepEqual(hits, [], `forbidden keys in ${row.case_id}: ${hits.join(',')}`);
    }
  });

  it('full matrix case count', () => {
    assert.equal(DIVINATION_GOLDEN_MATRIX_CASES.length, 34);
  });
});
