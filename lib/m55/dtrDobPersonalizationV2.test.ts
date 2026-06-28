import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  buildPaidDtrIndividualizationV2FromEngineContext,
  DOB_PERSONALIZATION_V2_CATALOG_VERSION,
} from './dtrDobPersonalizationV2';
import { findForbiddenPaidIndividualizationLeak } from './dtrPaidIndividualization';

const BASE_FIELDS = {
  nickname: 'synthetic',
  birthTime: '12:00:00' as string | null,
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: null as string | null,
  timezone: 'Asia/Tokyo',
};

function contextFor(birthDate: string, birthTimeUnknown = false) {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields({
    ...BASE_FIELDS,
    birthDate,
    birthTime: birthTimeUnknown ? null : BASE_FIELDS.birthTime,
    birthTimeUnknown,
  }).engine_context_json;
}

describe('paid DTR DOB personalization v2', () => {
  it('same synthetic DOB produces stable v2 fingerprint and leads', () => {
    const a = buildPaidDtrIndividualizationV2FromEngineContext(contextFor('1980-01-07'));
    const b = buildPaidDtrIndividualizationV2FromEngineContext(contextFor('1980-01-07'));

    assert.equal(a.version, 'v2');
    assert.equal(a.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    assert.deepEqual(a, b);
    assert.ok(a.fingerprint.startsWith('dobv2-'));
    assert.match(a.essenceRhythmNote, /生年月日の細かなリズムから見ると/);
    assert.match(a.auxiliaryReading, /日々の扱い方/);
  });

  it('same stem with different DOB produces different v2 lead and fingerprint', () => {
    const leftCtx = contextFor('1980-01-07');
    const rightCtx = contextFor('1980-03-07');
    assert.equal(leftCtx.stemLaneIndex, rightCtx.stemLaneIndex);

    const left = buildPaidDtrIndividualizationV2FromEngineContext(leftCtx);
    const right = buildPaidDtrIndividualizationV2FromEngineContext(rightCtx);
    assert.notEqual(left.fingerprint, right.fingerprint);
    assert.notEqual(left.essenceRhythmNote, right.essenceRhythmNote);
  });

  it('birthTimeUnknown branch changes output', () => {
    const known = buildPaidDtrIndividualizationV2FromEngineContext(contextFor('1992-12-19'));
    const unknown = buildPaidDtrIndividualizationV2FromEngineContext(contextFor('1992-12-19', true));
    assert.notEqual(known.fingerprint, unknown.fingerprint);
    assert.notEqual(known.essenceRhythmNote, unknown.essenceRhythmNote);
    assert.match(unknown.essenceRhythmNote, /正午基準/);
  });

  it('20 synthetic DOBs achieve at least 60 percent unique v2 fingerprints', () => {
    const dates = [
      '1980-01-07', '1980-03-07', '1980-05-07', '1980-07-07', '1980-09-07',
      '1983-02-28', '1984-04-15', '1985-06-21', '1986-08-09', '1987-10-13',
      '1988-12-05', '1990-01-19', '1991-03-22', '1992-12-19', '1993-05-03',
      '1994-07-27', '1995-09-11', '1996-11-30', '1997-02-14', '1998-06-06',
    ];
    const fingerprints = new Set(
      dates.map((birthDate) => buildPaidDtrIndividualizationV2FromEngineContext(contextFor(birthDate)).fingerprint),
    );
    assert.ok(fingerprints.size >= 12, `unique=${fingerprints.size}`);
  });

  it('v2 output passes forbidden leak and overclaim scan', () => {
    const ind = buildPaidDtrIndividualizationV2FromEngineContext(contextFor('1983-02-28'));
    const userFacing = [ind.essenceRhythmNote, ind.auxiliaryReading, ind.handlingHint].join('\n');
    assert.equal(findForbiddenPaidIndividualizationLeak(userFacing), null);
    assert.doesNotMatch(userFacing, /甲乙丙丁|solarTerm|lunarDay|stemLane|djb2|このタイプ/);
    assert.doesNotMatch(userFacing, /必ず|絶対|運命|治療|診断|投資|法律|保証/);
  });

  it('source uses no runtime AI or network generation', () => {
    const src = readFileSync(new URL('./dtrDobPersonalizationV2.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /openai|gemini|fetch\s*\(|generateText|chat\.completions/i);
  });
});
