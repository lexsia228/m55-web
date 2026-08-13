/**
 * Pure-function material pack builder for paid DTR chapter body generation.
 * No AI / no network / no DB. Deterministic from engine context + individualization.
 *
 * Provides structured inputs for the AI generation layer and Quality Judge.
 * The AI generator uses seedBodies as style baseline, constraint, and お題 —
 * NOT as verbatim output to distribute.
 */

import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import {
  identityDesignVizForStem,
  compositionStructureVizForStem,
  essenceStabilityVizForStem,
  STEM_SEED_BODIES,
  type StemSectionBodies,
  type IdentityDesignViz,
  type CompositionStructureViz,
  type EssenceStabilityViz,
} from './dtrEngine';
import { AXIS_DATA, INTERACTION_NOTE, type AxisEntry } from './dtrPaidModules';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';
import {
  civilDayBandFromEffectiveDate,
  seasonGroupForSolarTerm,
  type CivilDayBand,
} from './paidDobCivilRhythm';

// ── Season / phase helpers (private; mirror of dtrDobPersonalizationV2.ts private logic) ──

export type SeasonGroup = 'winter' | 'spring' | 'summer' | 'autumn';
/** Civil dayBand — field name kept for Hybrid/material compatibility. */
export type LunarPhaseBucket = CivilDayBand;

function lunarMonthIndexLocal(lunarMonthKey: string): number {
  const monthToken = lunarMonthKey.split('-').pop() ?? '1';
  const month = Number.parseInt(monthToken, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return 0;
  return month - 1;
}

// ── Judge keyword hints for DOB-v2 material reflection check ──
// The Quality Judge uses these to verify that generated bodies include DOB context.

export const SEASON_JUDGE_KEYWORDS: Readonly<Record<SeasonGroup, readonly string[]>> = {
  winter: ['冷え', '静けさ', '土台', '温め', '冬', '寒さ'],
  spring: ['立ち上がり', '芽吹き', '春', 'ペース', '整え', '息吹'],
  summer: ['熱量', '夏', '休息', '水分', '消耗', '暑さ'],
  autumn: ['見直し', '整理', '秋', '残す', '区切り'],
};

export const PHASE_JUDGE_KEYWORDS: Readonly<Record<LunarPhaseBucket, readonly string[]>> = {
  early: ['始める', '試す', '小さく', '最初', '小さな'],
  mid: ['続ける', '確かめ', '流れ', '途中', '一度置いた'],
  late: ['区切る', '論点', '残す', '次の一歩', '確かめる'],
};

// ── Types ──

/** Seed bodies for the four AI-generated chapters. */
export type ChapterSeedBodies = {
  s1_identity: string;
  s2_composition: string;
  s3_essence: string;
  s4_strengths: string;
};

/**
 * All material needed to generate and judge paid DTR chapter bodies (s1–s4).
 * Fully determined from EngineContextJson + PaidDtrIndividualization.
 */
export type ChapterMaterialPack = {
  // Primary trait (fixed — AI must not re-judge these)
  stemLaneIndex: number;
  publicTitle: string;
  axisEntry: AxisEntry;
  interactionNote: string;

  // DOB-v2 derived (all fixed — AI uses as context, not re-interprets)
  seasonGroup: SeasonGroup;
  lunarPhase: LunarPhaseBucket;
  lunarMonthIdx: number;
  birthTimeUnknown: boolean;

  // Pre-computed DOB-v2 text fragments from paidIndividualization
  essenceRhythmNote: string;
  auxiliaryReading: string;
  handlingHint: string;

  // Quality Judge keyword hints (derived from season/phase)
  seasonJudgeKeywords: readonly string[];
  phaseJudgeKeywords: readonly string[];

  // Per-chapter viz context (supplementary generation context)
  identityDesignViz: IdentityDesignViz;
  compositionStructureViz: CompositionStructureViz;
  essenceStabilityViz: EssenceStabilityViz;

  // Seed bodies — 文体基準 / お題 / fallback (NOT final output)
  seedBodies: ChapterSeedBodies;
};

// ── Builder ──

/** IndividualizationLike covers both PaidDtrIndividualization and PaidDtrIndividualizationAuditMeta. */
type IndividualizationLike = Pick<
  PaidDtrIndividualization,
  'essenceRhythmNote' | 'auxiliaryReading' | 'handlingHint'
>;

/**
 * Build a ChapterMaterialPack from engine context + individualization.
 * Pure function — no AI, no network, no DB.
 */
export function buildPaidDtrChapterMaterialPack(
  ctx: EngineContextJson,
  ind: IndividualizationLike,
): ChapterMaterialPack {
  const idx = Math.max(0, Math.min(9, ctx.stemLaneIndex));
  const stem = TEN_STEM_DISPLAY[idx]!;
  const axis = AXIS_DATA[idx]!;
  const seedAll = STEM_SEED_BODIES[idx]!;
  const seasonGroup = seasonGroupForSolarTerm(ctx.boundaryMetadata.solarTermKey);
  const phase = civilDayBandFromEffectiveDate(ctx.normalizedBirthContext.effectiveLocalDate);
  const monthIdx = lunarMonthIndexLocal(ctx.boundaryMetadata.lunarMonthKey);

  return {
    stemLaneIndex: idx,
    publicTitle: stem.publicTitle,
    axisEntry: axis,
    interactionNote: INTERACTION_NOTE[idx]!,
    seasonGroup,
    lunarPhase: phase,
    lunarMonthIdx: monthIdx,
    birthTimeUnknown: ctx.normalizedBirthContext.birthTimeUnknown,
    essenceRhythmNote: ind.essenceRhythmNote,
    auxiliaryReading: ind.auxiliaryReading,
    handlingHint: ind.handlingHint,
    seasonJudgeKeywords: SEASON_JUDGE_KEYWORDS[seasonGroup],
    phaseJudgeKeywords: PHASE_JUDGE_KEYWORDS[phase],
    identityDesignViz: identityDesignVizForStem(idx),
    compositionStructureViz: compositionStructureVizForStem(idx),
    essenceStabilityViz: essenceStabilityVizForStem(idx),
    seedBodies: {
      s1_identity: seedAll.identity,
      s2_composition: seedAll.composition,
      s3_essence: seedAll.essence,
      s4_strengths: seedAll.strengths,
    },
  };
}

/** Seed body accessor for tests — index-safe. */
export function getStemSeedBody(stemLaneIndex: number): StemSectionBodies {
  const idx = Math.max(0, Math.min(9, stemLaneIndex));
  return STEM_SEED_BODIES[idx]!;
}
