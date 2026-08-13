/**
 * Paid DOB civil rhythm — selector correctness, free/paid parity, dedupe guards.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { GOLDEN_1983_02_28_V2 } from './compositeStem/pipeline.golden.test';
import { runM55CompositeStemPipeline } from './compositeStem/pipeline';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { buildPaidDtrIndividualizationV21FromEngineContext } from './dtrDobPersonalizationV21';
import { buildPaidDtrSectionIndividualizationPrefix } from './dtrPaidIndividualizationCompose';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import { freeCoreAxisRowsForResult } from './coreFreePublicDisplay';
import {
  civilDayBandFromDay,
  civilDayBandFromEffectiveDate,
  collectCivilDayBandCopyViolations,
  countNormalizedSentenceOccurrences,
  PAID_CHAPTER_SEMANTIC_FAMILY,
} from './paidDobCivilRhythm';
import { dayBandFromDay } from './individualization/dobAxisLookupV1';
import { validateHybridAiOutput } from './dtrHybridAiQualityValidator';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { buildHybridAiPromptPayload } from './dtrHybridAiPrompt';

const MATRIX = [
  '1983-02-01',
  '1983-02-10',
  '1983-02-11',
  '1983-02-20',
  '1983-02-21',
  '1983-02-28',
  '2000-02-29',
  '1992-12-19',
] as const;

function engineContextFor(birthDate: string) {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields(
    {
      nickname: 'matrix',
      birthDate,
      birthTime: '12:00:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    },
    { dobPersonalizationV2Enabled: true },
  ).engine_context_json;
}

function allV21SectionText(ind: ReturnType<typeof buildPaidDtrIndividualizationV21FromEngineContext>): string {
  return [
    ind.s1IdentityRhythmNote ?? '',
    ind.s2CompositionRhythmNote ?? '',
    ind.essenceRhythmNote,
    ind.s4StrengthsRhythmNote ?? '',
    ind.s5FrictionRhythmNote ?? '',
    ind.s6RelationRhythmNote ?? '',
    ind.auxiliaryReading,
  ].join('\n');
}

describe('paidDobCivilRhythm — compact DOB matrix', () => {
  for (const birthDate of MATRIX) {
    it(`${birthDate} — civil dayBand matches canonical thresholds`, () => {
      const ctx = engineContextFor(birthDate);
      const civilDay = Number(birthDate.slice(-2));
      const expected = dayBandFromDay(civilDay);
      assert.equal(civilDayBandFromEffectiveDate(ctx.normalizedBirthContext.effectiveLocalDate), expected);
    });
  }

  it('civilDayBandFromDay matches canonical dayBandFromDay for every civil day', () => {
    for (let day = 1; day <= 31; day++) {
      assert.equal(civilDayBandFromDay(day), dayBandFromDay(day), `day ${day}`);
    }
  });

  it('source stays client-bundle safe (no node builtin import chain)', () => {
    const src = readFileSync(new URL('./paidDobCivilRhythm.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from ['"]node:/);
    assert.doesNotMatch(src, /from ['"].*dobAxisLookupV1['"]/);
  });

  it('1983-02-28 — civil late, no month-position causality, no 月の中頃', () => {
    const ctx = engineContextFor('1983-02-28');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.equal(civilDayBandFromEffectiveDate(ctx.normalizedBirthContext.effectiveLocalDate), 'late');
    assert.doesNotMatch(allV21SectionText(ind), /月の中頃/);
    assert.doesNotMatch(allV21SectionText(ind), /月の後半に近い生まれとして/);
    assert.doesNotMatch(allV21SectionText(ind), /生年月日の細かなリズム/);
    assert.doesNotMatch(allV21SectionText(ind), /雨水|解けはじめる|解ける季節|旧暦|時期の生まれ/);
  });

  it('1992-12-19 — civil mid preserved internally, no mid-birth causality copy', () => {
    const ctx = engineContextFor('1992-12-19');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.equal(civilDayBandFromEffectiveDate(ctx.normalizedBirthContext.effectiveLocalDate), 'mid');
    assert.doesNotMatch(allV21SectionText(ind), /月の後半/);
    assert.doesNotMatch(allV21SectionText(ind), /月の中頃の生まれとして/);
  });

  it('matrix — no unsupported solar-term causality in paid V21 output', () => {
    for (const birthDate of MATRIX) {
      const ind = buildPaidDtrIndividualizationV21FromEngineContext(engineContextFor(birthDate));
      const text = allV21SectionText(ind);
      assert.doesNotMatch(text, /月初めに近い生まれとして/);
      assert.doesNotMatch(text, /月の中頃の生まれとして/);
      assert.doesNotMatch(text, /月の後半に近い生まれとして/);
    }
  });

  it('matrix — civil late DOBs never say 月の中頃', () => {
    for (const birthDate of MATRIX) {
      const ctx = engineContextFor(birthDate);
      const band = civilDayBandFromEffectiveDate(ctx.normalizedBirthContext.effectiveLocalDate);
      const text = allV21SectionText(buildPaidDtrIndividualizationV21FromEngineContext(ctx));
      if (band === 'late') {
        assert.doesNotMatch(text, /月の中頃/);
      }
    }
  });
});

describe('paidDobCivilRhythm — free/paid objective parity', () => {
  it('1983-02-28 — free and paid agree on civil dayBand semantics', () => {
    resetCalendarBundleCacheForTests();
    const composite = runM55CompositeStemPipeline({
      ...GOLDEN_1983_02_28_V2,
      nickname: 'take',
    });
    const freeLife = freeCoreAxisRowsForResult(
      buildCoreResultClient({ nickname: 'take', birthDate: '1983-02-28' }),
    )[0]!.life;
    assert.match(freeLife, /月の後半に近い生まれでは、/);

    const ctx = engineContextFor('1983-02-28');
    const paid = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    assert.doesNotMatch(allV21SectionText(paid), /月の中頃/);
    assert.doesNotMatch(allV21SectionText(paid), /月の後半に近い生まれとして/);
    assert.equal(composite.stemLaneIndex, 9);
    assert.equal(composite.paid.publicTitle, 'アナリスト');
  });

  it('matrix — free/paid civil band never contradict', () => {
    for (const birthDate of MATRIX) {
      const freeLife = freeCoreAxisRowsForResult(
        buildCoreResultClient({ nickname: 'matrix', birthDate }),
      )[0]!.life;
      const paidText = allV21SectionText(
        buildPaidDtrIndividualizationV21FromEngineContext(engineContextFor(birthDate)),
      );
      const civilDay = Number(birthDate.slice(-2));
      const band = dayBandFromDay(civilDay);

      if (band === 'early') {
        assert.match(freeLife, /月初めに近い生まれでは、/);
        assert.doesNotMatch(paidText, /月の中頃|月の後半/);
      } else if (band === 'mid') {
        assert.match(freeLife, /月の中頃の生まれでは、/);
        assert.doesNotMatch(paidText, /月の後半/);
        assert.doesNotMatch(paidText, /月の中頃の生まれとして/);
      } else {
        assert.match(freeLife, /月の後半に近い生まれでは、/);
        assert.doesNotMatch(paidText, /月の中頃/);
        assert.doesNotMatch(paidText, /月の後半に近い生まれとして/);
      }
    }
  });
});

describe('paidDobCivilRhythm — narrative dedupe', () => {
  it('1983-02-28 — civil grounding causality is absent; chapters keep distinct actions', () => {
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(engineContextFor('1983-02-28'));
    assert.doesNotMatch(ind.essenceRhythmNote, /月の後半に近い生まれとして/);
    assert.doesNotMatch(ind.essenceRhythmNote, /生年月日の細かなリズム/);
    assert.match(ind.s2CompositionRhythmNote ?? '', /見落としやすい変化/);
    assert.match(ind.s2CompositionRhythmNote ?? '', /今日答えを出せる論点/);
    assert.match(ind.s4StrengthsRhythmNote ?? '', /体のリズムを先に戻す/);
    assert.match(ind.s5FrictionRhythmNote ?? '', /止める合図は/);
    assert.match(ind.auxiliaryReading, /3行だけ書き/);
    assert.doesNotMatch(ind.s2CompositionRhythmNote ?? '', /止める合図|3行だけ/);
    assert.doesNotMatch(ind.s4StrengthsRhythmNote ?? '', /今日答えを出せる論点|3行だけ/);
    assert.doesNotMatch(ind.s5FrictionRhythmNote ?? '', /今日答えを出せる論点|3行だけ/);
    assert.doesNotMatch(ind.auxiliaryReading, /今日答えを出せる論点|止める合図/);
  });

  it('1983-02-28 — S7 auxiliary does not clone S2 work copy', () => {
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(engineContextFor('1983-02-28'));
    assert.notEqual(ind.auxiliaryReading, ind.s2CompositionRhythmNote);
    assert.ok(!ind.auxiliaryReading.includes(ind.s2CompositionRhythmNote ?? ''));
    assert.match(ind.auxiliaryReading, /迷ったときは/);
  });

  it('1983-02-28 — S1–S7 prefixes have no cross-chapter exact duplicates', () => {
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(engineContextFor('1983-02-28'));
    const sections = [
      ind.s1IdentityRhythmNote ?? '',
      ind.s2CompositionRhythmNote ?? '',
      ind.essenceRhythmNote,
      ind.s4StrengthsRhythmNote ?? '',
      ind.s5FrictionRhythmNote ?? '',
      ind.s6RelationRhythmNote ?? '',
      ind.auxiliaryReading,
    ];
    const counts = countNormalizedSentenceOccurrences(sections);
    for (const [sentence, count] of counts) {
      assert.ok(count <= 1, `duplicate across chapters: ${sentence} x${count}`);
    }
  });

  it('chapter semantic families are distinct by construction', () => {
    const families = Object.values(PAID_CHAPTER_SEMANTIC_FAMILY);
    assert.equal(new Set(families).size, families.length);
    assert.equal(PAID_CHAPTER_SEMANTIC_FAMILY.s2, 'work_decision');
    assert.equal(PAID_CHAPTER_SEMANTIC_FAMILY.s4, 'fatigue_recovery');
    assert.equal(PAID_CHAPTER_SEMANTIC_FAMILY.s5, 'overload_signal');
    assert.equal(PAID_CHAPTER_SEMANTIC_FAMILY.s7, 'reset_tool');
  });
});

describe('paidDobCivilRhythm — stored_v2 display recompose', () => {
  it('1983-02-28 stored engine_context recomposes corrected paid copy', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'take',
        birthDate: '1983-02-28',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    );

    const ind = composePaidIndividualizationFromEngineContext(built.engine_context_json);
    const s3Prefix = buildPaidDtrSectionIndividualizationPrefix('s3_essence', ind);
    assert.doesNotMatch(s3Prefix, /月の中頃/);
    assert.doesNotMatch(s3Prefix, /月の後半に近い生まれとして/);
    assert.doesNotMatch(s3Prefix, /雨水|旧暦|時期の生まれ|生年月日の細かなリズム/);
    assert.equal(
      built.engine_context_json.dobPersonalizationCatalogVersion,
      DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    );
  });
});

describe('paidDobCivilRhythm — Hybrid validator guards', () => {
  it('rejects civil late output that says 月の中頃', () => {
    const body = '月の中頃の生まれとして、一度立てた流れを確かめるほど力が続きやすくなります。'.repeat(8);
    const result = validateHybridAiOutput(
      {
        s1_identity: body,
        s2_composition: body,
        s3_essence: body,
        s4_strengths: body,
      },
      { effectiveLocalDate: '1983-02-28' },
    );
    assert.equal(result.pass, false);
    assert.ok(result.overallFailCodes.includes('date_consistency_violation'));
  });

  it('rejects unsupported solar-term causality phrases', () => {
    const violations = collectCivilDayBandCopyViolations(
      '1983-02-28',
      '雨水の頃の生まれとして、ゆっくりほどけながら動く形が安定しやすくなります。',
    );
    assert.ok(violations.includes('unsupported_calendar_causality'));
  });

  it('rejects unexplained lunar-calendar jargon', () => {
    const violations = collectCivilDayBandCopyViolations(
      '1983-02-28',
      '旧暦の年始に近い時期の生まれです。整えることを先に置くほど力が無理なく出やすくなります。',
    );
    assert.ok(violations.includes('unsupported_calendar_causality'));
  });

  it('rejects month-position birth causality even when civil band matches', () => {
    const violations = collectCivilDayBandCopyViolations(
      '1983-02-28',
      '月の後半に近い生まれとして、整えてから次へ向かうほど力の出方が落ち着きやすくなります。',
    );
    assert.ok(violations.includes('unsupported_calendar_causality'));
  });
});

describe('paidDobCivilRhythm — material pack / Hybrid prompt source boundary', () => {
  it('1983-02-28 material pack lunarPhase is civil late, not lunar mid', () => {
    const ctx = engineContextFor('1983-02-28');
    const ind = buildPaidDtrIndividualizationV21FromEngineContext(ctx);
    const pack = buildPaidDtrChapterMaterialPack(ctx, ind);
    assert.equal(pack.lunarPhase, 'late');
    const payload = buildHybridAiPromptPayload(pack, ind);
    assert.doesNotMatch(payload.dobContext.phaseDescription, /月の中頃/);
    assert.doesNotMatch(payload.dobContext.seasonDescription, /雨水|時期の生まれ/);
  });
});
