import { buildAxisDetails, compositionFromScores } from './axisMeta';
import type { BirthProfile } from '../../soul/profile';
import {
  birthProfileFromNormalizeInput,
  resolveCoreStemAuthority,
  resolveCoreStemAuthorityFromNormalizeInput,
} from './resolveCoreStemAuthority';
import { TYPE_SCORE_SEEDS, typeIndexFromStemLane } from './typeCatalogScores';
import {
  computeDynamicObservation,
  hashFingerprint,
  normalizeBirthContext,
  resolveBoundaryContext,
  type BoundaryContext,
  type NormalizeBirthInput,
  type NormalizedBirthContext,
  type StaticCoreDeterministic,
} from './canonicalBirthBoundary';

function computeStaticCoreClient(
  normalizedInput: NormalizedBirthContext,
  boundaryContext: BoundaryContext,
  profile: BirthProfile,
): StaticCoreDeterministic {
  const authority = resolveCoreStemAuthority(profile);
  if (!authority) {
    throw new Error('M55_CORE_STEM_AUTHORITY_UNAVAILABLE');
  }
  const lane = authority.stemLaneIndex;
  const idx = typeIndexFromStemLane(lane);
  const seed = TYPE_SCORE_SEEDS[idx]!;
  const publicTheme = seed.coreType;
  const staticFingerprint = hashFingerprint({
    date: normalizedInput.normalizedGregorianDate,
    lane,
    idx,
    seed: seed.coreType,
    boundary: boundaryContext.dayBoundary,
    namingCorrection: 0,
  });
  const displayFingerprint = hashFingerprint({
    personaCode49: `PC49-${String(idx + 1).padStart(2, '0')}`,
    staticEssence: seed.coreSummary,
    longTermTheme: publicTheme,
    relationBaseline: seed.relationships.summary,
    workResourceBaseline: seed.workStyle.summary,
    boundary: {
      solarTermBoundary: boundaryContext.solarTermBoundary,
      lunarBoundary: boundaryContext.lunarBoundary,
      fallbackMode: boundaryContext.fallbackMode,
    },
  });
  return {
    personaCode49: `PC49-${String(idx + 1).padStart(2, '0')}`,
    staticEssence: seed.coreSummary,
    strengths: [...seed.strengths],
    distortionTendencies: [...seed.cautions],
    longTermTheme: publicTheme,
    relationBaseline: seed.relationships.summary,
    workResourceBaseline: seed.workStyle.summary,
    staticFingerprint,
    displayFingerprint,
    stemLaneIndex: lane,
    typeIndex: idx,
  };
}

function affinityForTypeIndexClient(self: number) {
  const items: { type: string; label: string; score: number }[] = [];
  for (let j = 0; j < 10; j++) {
    if (j === self) continue;
    const d = Math.abs(self - j);
    const ring = Math.min(d, 10 - d);
    const score = Math.max(12, 100 - ring * 11);
    const t = TYPE_SCORE_SEEDS[j]!;
    items.push({ type: t.coreType, label: t.coreType, score });
  }
  return items
    .sort((a, b) => (b.score - a.score) || a.type.localeCompare(b.type))
    .slice(0, 5);
}

export function runCanonicalCorePipelineClient(
  input: NormalizeBirthInput,
  fixedNow = '2026-01-01T00:00:00.000Z',
) {
  const profile = birthProfileFromNormalizeInput(input);
  const normalized = normalizeBirthContext(input);
  const boundary = resolveBoundaryContext(normalized);
  const staticCore = computeStaticCoreClient(normalized, boundary, profile);
  const dynamic = computeDynamicObservation(boundary, fixedNow);
  const seed = TYPE_SCORE_SEEDS[staticCore.typeIndex]!;
  const axisDetails = buildAxisDetails(seed.coreType, seed.coreAxisScores);
  const composition = compositionFromScores(seed.coreAxisScores);
  const affinities = affinityForTypeIndexClient(staticCore.typeIndex);
  const stemAuthority = resolveCoreStemAuthorityFromNormalizeInput(input);
  const engineVersion = stemAuthority?.engineVersion ?? 'm55-composite-stem-v2';
  const regressionAnchorMatched =
    normalized.normalizedGregorianDate === '1983-02-28' && stemAuthority?.stemLaneIndex === 9;
  return {
    normalized,
    boundary,
    staticCore,
    dynamic,
    axisDetails,
    composition,
    affinities,
    typeSeed: seed,
    engineVersion,
    regressionAnchorMatched,
  };
}
