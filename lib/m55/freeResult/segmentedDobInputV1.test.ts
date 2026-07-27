import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FREE_CONTINUOUS_FLOW_STEPS_JA,
  FREE_CONTINUOUS_FLOW_TOTAL,
  parseAndValidateDobInput,
  parseFlexibleDobInput,
  partsFromIsoDate,
  validateSegmentedDob,
} from './segmentedDobInputV1';

describe('segmentedDobInputV1', () => {
  it('parses pasted YYYYMMDD', () => {
    assert.deepEqual(parseFlexibleDobInput('19901219'), {
      year: '1990',
      month: '12',
      day: '19',
    });
    const validated = parseAndValidateDobInput('19901219');
    assert.equal(validated.ok, true);
    if (validated.ok) assert.equal(validated.birthDate, '1990-12-19');
  });

  it('parses pasted YYYY/MM/DD and YYYY-MM-DD', () => {
    assert.deepEqual(parseFlexibleDobInput('1990/12/19'), {
      year: '1990',
      month: '12',
      day: '19',
    });
    assert.deepEqual(parseFlexibleDobInput('1990-12-19'), {
      year: '1990',
      month: '12',
      day: '19',
    });
  });

  it('rejects invalid calendar dates', () => {
    const bad = validateSegmentedDob({ year: '2023', month: '02', day: '30' });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.errorJa, /存在しない|確認/);
  });

  it('accepts leap day only on leap years', () => {
    const leap = validateSegmentedDob({ year: '2024', month: '02', day: '29' });
    assert.equal(leap.ok, true);
    if (leap.ok) assert.equal(leap.birthDate, '2024-02-29');

    const nonLeap = validateSegmentedDob({ year: '2023', month: '02', day: '29' });
    assert.equal(nonLeap.ok, false);
    if (!nonLeap.ok) assert.match(nonLeap.errorJa, /うるう年/);
  });

  it('keeps date-only YYYY-MM-DD semantics without timezone conversion', () => {
    const result = validateSegmentedDob({ year: '1983', month: '2', day: '28' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.birthDate, '1983-02-28');
    assert.match(result.birthDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(partsFromIsoDate(result.birthDate), {
      year: '1983',
      month: '02',
      day: '28',
    });
  });

  it('defines six continuous flow steps', () => {
    assert.equal(FREE_CONTINUOUS_FLOW_TOTAL, 6);
    assert.equal(FREE_CONTINUOUS_FLOW_STEPS_JA.length, 6);
    assert.equal(FREE_CONTINUOUS_FLOW_STEPS_JA[0], '生年月日');
    assert.equal(FREE_CONTINUOUS_FLOW_STEPS_JA[1], '始め方');
    assert.equal(FREE_CONTINUOUS_FLOW_STEPS_JA[5], '変化への向き合い方');
  });
});
