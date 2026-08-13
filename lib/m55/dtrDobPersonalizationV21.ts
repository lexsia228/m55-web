/**
 * Paid DTR DOB personalization v2.1.
 * Civil dayBand / lunar month / solar term remain internal selectors.
 * Customer copy is tendency / condition / action — no calendar jargon leads.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';
import {
  civilDayBandFromEffectiveDate,
  ESSENCE_STABILITY_BY_BAND,
  S1_IDENTITY_BY_BAND,
  S2_COMPOSITION_BY_BAND,
  S2_STEM_WORK_SCENE,
  S4_LIFE_BY_LUNAR_MONTH,
  S4_RECOVERY_BY_BAND,
  S5_FRICTION_BY_BAND,
  S6_LIFE_RELATION_BY_LUNAR_MONTH,
  S6_RELATION_BY_BAND,
  S7_AUXILIARY_BY_BAND,
  SEASON_ESSENCE_CONTEXT,
  seasonGroupForSolarTerm,
} from './paidDobCivilRhythm';

function djb2Hex(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function lunarMonthIdx(lunarMonthKey: string): number {
  const t = lunarMonthKey.split('-').pop() ?? '1';
  const m = Number.parseInt(t, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return 0;
  return m - 1;
}

const S1_STEM_LEADS: readonly string[] = [
  '向きを先に決めると力が入りやすい形です。',
  '場の流れを読む力が自然に出やすい形です。',
  '表現が前に出ると反応が戻りやすい形です。',
  'ひとつに深く向き合うほど力が出やすい形です。',
  '続けることで力の伝わり方が安定する形です。',
  '育てる・まとめる力が前に出やすい形です。',
  '区切りをつけて進める力が前に出やすい形です。',
  '丁寧に整える力が輪郭として出やすい形です。',
  '外へのつながりで輪郭が立ち上がりやすい形です。',
  '静かに深く読む力が前に出やすい形です。',
] as const;

export function buildPaidDtrIndividualizationV21FromEngineContext(
  ctx: EngineContextJson,
): PaidDtrIndividualization {
  const stemIdx = Math.max(0, Math.min(9, ctx.stemLaneIndex));
  const effectiveLocalDate = ctx.normalizedBirthContext.effectiveLocalDate;
  const band = civilDayBandFromEffectiveDate(effectiveLocalDate);
  const season = seasonGroupForSolarTerm(ctx.boundaryMetadata.solarTermKey);
  const mIdx = lunarMonthIdx(ctx.boundaryMetadata.lunarMonthKey);

  const s1IdentityRhythmNote = [
    S1_STEM_LEADS[stemIdx]!,
    S1_IDENTITY_BY_BAND[band],
  ].join('\n');

  const s2CompositionRhythmNote = [
    S2_STEM_WORK_SCENE[stemIdx]!,
    S2_COMPOSITION_BY_BAND[band],
  ].join('\n');

  const essenceRhythmNote = [
    ESSENCE_STABILITY_BY_BAND[band],
    SEASON_ESSENCE_CONTEXT[season],
  ].join('\n');

  const s4StrengthsRhythmNote = [
    S4_LIFE_BY_LUNAR_MONTH[mIdx]!,
    S4_RECOVERY_BY_BAND[band],
  ].join('\n');

  const s5FrictionRhythmNote = S5_FRICTION_BY_BAND[band];

  const s6RelationRhythmNote = [
    S6_LIFE_RELATION_BY_LUNAR_MONTH[mIdx]!,
    S6_RELATION_BY_BAND[band],
  ].join('\n');

  const handlingHint = S7_AUXILIARY_BY_BAND[band];

  const auxiliaryReading = [
    '迷ったときに戻るための一手です。',
    handlingHint,
  ].join('\n');

  const fingerprint = `dobv21-${djb2Hex([
    DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    ctx.stemLaneIndex,
    ctx.boundaryMetadata.solarTermKey,
    effectiveLocalDate,
    ctx.boundaryMetadata.lunarMonthKey,
    ctx.normalizedBirthContext.birthTimeUnknown ? 'unknown-time' : 'known-time',
  ].join('|'))}`;

  return {
    version: 'v2',
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    fingerprint,
    essenceRhythmNote,
    auxiliaryReading,
    handlingHint,
    s1IdentityRhythmNote,
    s2CompositionRhythmNote,
    s4StrengthsRhythmNote,
    s5FrictionRhythmNote,
    s6RelationRhythmNote,
  };
}
