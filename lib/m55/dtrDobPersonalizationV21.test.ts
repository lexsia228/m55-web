/**
 * DOB personalization v2.1 unit tests.
 *
 * Covers: builder output, version safety, forbidden phrase scan,
 * and basic uniqueness assertions.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  DOB_PERSONALIZATION_V21_CATALOG_VERSION,
  DOB_PERSONALIZATION_V2_CATALOG_VERSION,
} from './dtrDobPersonalizationV2';
import { buildPaidDtrIndividualizationV2FromEngineContext } from './dtrDobPersonalizationV2';
import { buildPaidDtrIndividualizationV21FromEngineContext } from './dtrDobPersonalizationV21';
import { checkNaturalness } from './dtrVisibleCopyNaturalness';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';

function ctx21(birthDate: string) {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields({
    nickname: 'test',
    birthDate,
    birthTime: '12:00:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: null,
    timezone: 'Asia/Tokyo',
  }).engine_context_json;
}

describe('DOB personalization v2.1 builder', () => {
  it('returns version v2 and catalog v2.1', () => {
    const ctx = ctx21('1980-05-15');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V21_CATALOG_VERSION);
  });

  it('fingerprint starts with dobv21-', () => {
    const ctx = ctx21('1980-05-15');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.match(ind.fingerprint, /^dobv21-/);
  });

  it('essenceRhythmNote is stability copy without calendar causality chrome', () => {
    const ctx = ctx21('1985-03-07');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.doesNotMatch(ind.essenceRhythmNote, /生年月日の細かなリズム/);
    assert.doesNotMatch(ind.essenceRhythmNote, /生まれとして/);
    assert.ok(ind.essenceRhythmNote.length >= 20);
  });

  it('s1/s2/s4/s5/s6 rhythm notes are non-empty', () => {
    const ctx = ctx21('1990-08-22');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.ok(ind.s1IdentityRhythmNote && ind.s1IdentityRhythmNote.length >= 20);
    assert.ok(ind.s2CompositionRhythmNote && ind.s2CompositionRhythmNote.length >= 20);
    assert.ok(ind.s4StrengthsRhythmNote && ind.s4StrengthsRhythmNote.length >= 20);
    assert.ok(ind.s5FrictionRhythmNote && ind.s5FrictionRhythmNote.length >= 20);
    assert.ok(ind.s6RelationRhythmNote && ind.s6RelationRhythmNote.length >= 20);
  });

  it('different civil dayBand yields different s5 friction notes', () => {
    const early = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1980-01-05'));
    const late = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1980-01-25'));
    assert.notEqual(early.s5FrictionRhythmNote, late.s5FrictionRhythmNote);
  });

  it('same stem lane different DOB yields different s6 rhythm notes', () => {
    const leftCtx = ctx21('1980-01-07');
    const rightCtx = ctx21('1980-03-07');
    assert.equal(leftCtx.stemLaneIndex, rightCtx.stemLaneIndex);
    const left = buildPaidDtrIndividualizationV21FromEngineContext(leftCtx);
    const right = buildPaidDtrIndividualizationV21FromEngineContext(rightCtx);
    assert.notEqual(left.s6RelationRhythmNote, right.s6RelationRhythmNote);
  });

  it('same DOB is deterministic', () => {
    const a = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1975-11-03'));
    const b = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1975-11-03'));
    assert.equal(a.fingerprint, b.fingerprint);
    assert.equal(a.essenceRhythmNote, b.essenceRhythmNote);
  });

  it('different DOBs produce different fingerprints', () => {
    const a = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1980-01-07'));
    const b = buildPaidDtrIndividualizationV21FromEngineContext(ctx21('1980-07-22'));
    assert.notEqual(a.fingerprint, b.fingerprint);
  });

  it('v2.1 fingerprint differs from v2 fingerprint for same DOB', () => {
    const c = ctx21('1982-04-12');
    const v2 = buildPaidDtrIndividualizationV2FromEngineContext(c);
    const v21 = buildPaidDtrIndividualizationV21FromEngineContext(c);
    assert.notEqual(v21.fingerprint, v2.fingerprint);
  });

  it('20 varied DOBs: all section texts pass naturalness guard', () => {
    const testDobs = [
      '1960-01-07', '1965-03-22', '1970-06-07', '1975-09-12', '1980-12-27',
      '1982-02-07', '1984-04-18', '1986-07-03', '1988-10-22', '1990-01-15',
      '1992-05-07', '1994-08-22', '1996-11-03', '1998-03-18', '2000-06-27',
      '1961-02-22', '1971-05-07', '1981-08-12', '1991-11-27', '1999-04-07',
    ];
    for (const dob of testDobs) {
      const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx21(dob));
      for (const [label, text] of [
        ['s1', ind.s1IdentityRhythmNote ?? ''],
        ['s2', ind.s2CompositionRhythmNote ?? ''],
        ['s3', ind.essenceRhythmNote],
        ['s4', ind.s4StrengthsRhythmNote ?? ''],
        ['s5', ind.s5FrictionRhythmNote ?? ''],
        ['s6', ind.s6RelationRhythmNote ?? ''],
      ] as const) {
        const result = checkNaturalness(text);
        assert.ok(
          result.pass,
          `Naturalness failed for ${label} (${dob}): ${JSON.stringify(result.violations)}`,
        );
      }
    }
  });
});

describe('DOB v2.1 forbidden phrase scan', () => {
  const FORBIDDEN = [
    'miさん', '読み取りです', '正午基準', '補正した読み取り',
    '観測', '外部化', '感受の解像度', '微細な信号', '観測所型', 'このタイプ',
    '分析結果', '判定',
  ];

  it('v2.1 corpus source does not contain forbidden phrases or raw solar-term causality', () => {
    const src = readFileSync(new URL('./dtrDobPersonalizationV21.ts', import.meta.url), 'utf8');
    for (const term of FORBIDDEN) {
      assert.ok(!src.includes(term), `Forbidden term "${term}" found in v2.1 corpus source`);
    }
    assert.doesNotMatch(src, /雨水の頃の生まれとして/);
    assert.doesNotMatch(src, /解けはじめる/);
    assert.doesNotMatch(src, /旧暦/);
  });

  it('20 sample DOBs: section output does not contain forbidden phrases', () => {
    const sampleDobs = [
      '1970-01-07', '1975-04-22', '1980-07-12', '1985-10-03', '1990-12-27',
      '1962-02-07', '1972-05-18', '1982-08-03', '1992-11-22', '1996-03-15',
      '1960-06-07', '1964-09-22', '1968-01-12', '1974-11-27', '1978-03-07',
      '1984-05-22', '1988-08-12', '1994-10-03', '1998-01-27', '2000-06-07',
    ];
    for (const dob of sampleDobs) {
      const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx21(dob));
      const texts = [
        ind.s1IdentityRhythmNote ?? '',
        ind.s2CompositionRhythmNote ?? '',
        ind.essenceRhythmNote,
        ind.s4StrengthsRhythmNote ?? '',
        ind.s5FrictionRhythmNote ?? '',
        ind.s6RelationRhythmNote ?? '',
      ];
      for (const text of texts) {
        for (const term of FORBIDDEN) {
          assert.ok(
            !text.includes(term),
            `Forbidden term "${term}" in v2.1 output for ${dob}: "${text.slice(0, 60)}"`,
          );
        }
      }
    }
  });
});

describe('v2.1 fulfillment integration', () => {
  it('flag ON → new fulfillment saves v2.1 catalog default', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate: '1985-06-15',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    );
    assert.equal(built.engine_context_json.paidIndividualizationVersion, 'v2');
    assert.equal(built.engine_context_json.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V21_CATALOG_VERSION);
    assert.ok(built.envelope_json.auditMeta.paidIndividualization?.fingerprint.startsWith('dobv21-'));
  });

  it('flag OFF → engine_context_json has no version (v1 path)', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate: '1985-06-15',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: false },
    );
    assert.equal(built.engine_context_json.paidIndividualizationVersion, undefined);
    assert.equal(built.engine_context_json.dobPersonalizationCatalogVersion, undefined);
  });

  it('old v2 catalog snapshot still routes to old v2 builder (not v2.1)', () => {
    // Simulate a stored old-v2 snapshot by manually setting catalog version
    resetCalendarBundleCacheForTests();
    const base = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate: '1985-06-15',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    ).engine_context_json;

    // Override catalog to simulate old stored snapshot
    const oldCtx = {
      ...base,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    };

    const ind = composePaidIndividualizationFromEngineContext(oldCtx);
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    assert.match(ind.fingerprint, /^dobv2-/);
  });
});
