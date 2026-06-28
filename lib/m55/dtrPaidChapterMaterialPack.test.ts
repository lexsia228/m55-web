/**
 * Tests for dtrPaidChapterMaterialPack (pure function — no AI / no network / no DB).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import {
  buildPaidDtrChapterMaterialPack,
  getStemSeedBody,
  SEASON_JUDGE_KEYWORDS,
  PHASE_JUDGE_KEYWORDS,
} from './dtrPaidChapterMaterialPack';

const FIELDS_BASE = {
  birthTime: '12:00:00' as string | null,
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: null as string | null,
  timezone: 'Asia/Tokyo',
};

function makeBuilt(birthDate: string, nickname = 't') {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields({ nickname, birthDate, ...FIELDS_BASE });
}

describe('dtrPaidChapterMaterialPack', () => {
  it('returns deterministic pack for a given birth date', () => {
    const built = makeBuilt('1992-12-19');
    const ctx = built.engine_context_json;
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    const pack = buildPaidDtrChapterMaterialPack(ctx, ind);

    assert.ok(pack.stemLaneIndex >= 0 && pack.stemLaneIndex <= 9, 'stemLaneIndex in range');
    assert.ok(pack.publicTitle.length > 0, 'publicTitle is non-empty');
    assert.ok(['winter', 'spring', 'summer', 'autumn'].includes(pack.seasonGroup), 'seasonGroup is valid');
    assert.ok(['early', 'mid', 'late'].includes(pack.lunarPhase), 'lunarPhase is valid');
    assert.ok(Array.isArray(pack.seasonJudgeKeywords) && pack.seasonJudgeKeywords.length > 0);
    assert.ok(Array.isArray(pack.phaseJudgeKeywords) && pack.phaseJudgeKeywords.length > 0);
    assert.ok(pack.essenceRhythmNote.length > 0, 'essenceRhythmNote populated');
    assert.ok(pack.auxiliaryReading.length > 0, 'auxiliaryReading populated');
    assert.ok(pack.handlingHint.length > 0, 'handlingHint populated');
    assert.ok(pack.seedBodies.s1_identity.length > 0, 's1 seed non-empty');
    assert.ok(pack.seedBodies.s2_composition.length > 0, 's2 seed non-empty');
    assert.ok(pack.seedBodies.s3_essence.length > 0, 's3 seed non-empty');
    assert.ok(pack.seedBodies.s4_strengths.length > 0, 's4 seed non-empty');
  });

  it('two different birth dates with same stem produce different materialPacks', () => {
    // 1992-12-19 and 1994-05-03 — may or may not share a stem.
    // Main check: the DOB-derived fields (seasonGroup, lunarPhase, essenceRhythmNote) differ.
    const pack1 = (() => {
      const b = makeBuilt('1992-12-19');
      return buildPaidDtrChapterMaterialPack(b.engine_context_json, composePaidIndividualizationFromEngineContext(b.engine_context_json));
    })();
    const pack2 = (() => {
      const b = makeBuilt('1994-05-03');
      return buildPaidDtrChapterMaterialPack(b.engine_context_json, composePaidIndividualizationFromEngineContext(b.engine_context_json));
    })();

    // At least one of the DOB-derived fields must differ (different birth dates → different DOB context)
    const dobFieldsDiffer =
      pack1.seasonGroup !== pack2.seasonGroup ||
      pack1.lunarPhase !== pack2.lunarPhase ||
      pack1.essenceRhythmNote !== pack2.essenceRhythmNote ||
      pack1.auxiliaryReading !== pack2.auxiliaryReading;

    assert.ok(dobFieldsDiffer, 'different birth dates produce different DOB-derived fields');
  });

  it('same birth date always produces the same pack (deterministic)', () => {
    const pack1 = (() => {
      const b = makeBuilt('1980-01-07');
      return buildPaidDtrChapterMaterialPack(b.engine_context_json, composePaidIndividualizationFromEngineContext(b.engine_context_json));
    })();
    const pack2 = (() => {
      const b = makeBuilt('1980-01-07');
      return buildPaidDtrChapterMaterialPack(b.engine_context_json, composePaidIndividualizationFromEngineContext(b.engine_context_json));
    })();

    assert.equal(pack1.stemLaneIndex, pack2.stemLaneIndex);
    assert.equal(pack1.seasonGroup, pack2.seasonGroup);
    assert.equal(pack1.lunarPhase, pack2.lunarPhase);
    assert.equal(pack1.essenceRhythmNote, pack2.essenceRhythmNote);
  });

  it('seedBodies match STEM_SEED_BODIES for the corresponding stemLaneIndex', () => {
    const built = makeBuilt('1983-02-28');
    const ctx = built.engine_context_json;
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    const pack = buildPaidDtrChapterMaterialPack(ctx, ind);
    const seedRef = getStemSeedBody(pack.stemLaneIndex);

    assert.equal(pack.seedBodies.s1_identity, seedRef.identity, 's1 seed matches STEM_SEED_BODIES');
    assert.equal(pack.seedBodies.s2_composition, seedRef.composition, 's2 seed matches STEM_SEED_BODIES');
    assert.equal(pack.seedBodies.s3_essence, seedRef.essence, 's3 seed matches STEM_SEED_BODIES');
    assert.equal(pack.seedBodies.s4_strengths, seedRef.strengths, 's4 seed matches STEM_SEED_BODIES');
  });

  it('SEASON_JUDGE_KEYWORDS covers all SeasonGroup values', () => {
    for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
      assert.ok(SEASON_JUDGE_KEYWORDS[season].length > 0, `${season} has keywords`);
    }
  });

  it('PHASE_JUDGE_KEYWORDS covers all LunarPhaseBucket values', () => {
    for (const phase of ['early', 'mid', 'late'] as const) {
      assert.ok(PHASE_JUDGE_KEYWORDS[phase].length > 0, `${phase} has keywords`);
    }
  });
});
