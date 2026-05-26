import type { BirthProfile } from '../../soul/profile';
import { runCanonicalCorePipeline } from './canonicalBoundary';
import type { CoreResult } from './types';

export const CORE_ENGINE_VERSION = 'm55-core-stem-v2-parity-1' as const;

/** Fresh build from profile (deterministic). Use only when no sealed snapshot matches. */
export function buildCoreResult(profile: BirthProfile): CoreResult {
  const canonical = runCanonicalCorePipeline({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    country: profile.country,
    birthplace: profile.birthplace,
  });
  const seed = canonical.staticCore;
  const typeSeed = canonical.typeSeed;

  // Mandatory deterministic regression logging for host3000 diagnosis.
  console.info('[m55-core-canonical]', {
    normalizedGregorianDate: canonical.normalized.normalizedGregorianDate,
    canonicalTimezone: canonical.normalized.canonicalTimezone,
    solarTermBoundaryDecision: canonical.boundary.solarTermBoundary,
    lunarBoundaryDecision: canonical.boundary.lunarBoundary,
    fallbackMode: canonical.boundary.fallbackMode,
    staticFingerprint: canonical.staticCore.staticFingerprint,
    displayFingerprint: canonical.staticCore.displayFingerprint,
    engineVersion: canonical.engineVersion,
    regressionAnchorMatched: canonical.regressionAnchorMatched,
  });

  return {
    stemLaneIndex: seed.stemLaneIndex,
    coreType: `TYPE_${String(seed.typeIndex + 1).padStart(2, '0')}`,
    coreLabel: seed.longTermTheme,
    coreSummary: seed.staticEssence,
    coreAxisScores: {
      socialEnergy: canonical.axisDetails.find((d) => d.key === 'socialEnergy')!.score,
      stability: canonical.axisDetails.find((d) => d.key === 'stability')!.score,
      openness: canonical.axisDetails.find((d) => d.key === 'openness')!.score,
      cooperation: canonical.axisDetails.find((d) => d.key === 'cooperation')!.score,
      structure: canonical.axisDetails.find((d) => d.key === 'structure')!.score,
    },
    axisDetails: canonical.axisDetails,
    composition: canonical.composition,
    affinities: canonical.affinities,
    strengths: [...seed.strengths],
    cautions: [...seed.distortionTendencies],
    workStyle: {
      summary: typeSeed.workStyle.summary,
      strengths: [...typeSeed.workStyle.strengths],
      cautions: [...typeSeed.workStyle.cautions],
    },
    relationships: {
      summary: typeSeed.relationships.summary,
      strengths: [...typeSeed.relationships.strengths],
      cautions: [...typeSeed.relationships.cautions],
    },
    love: {
      summary: typeSeed.love.summary,
      strengths: [...typeSeed.love.strengths],
      cautions: [...typeSeed.love.cautions],
    },
    engineVersion: CORE_ENGINE_VERSION,
    lockedAt: `${canonical.normalized.normalizedGregorianDate}T00:00:00.000Z`,
  };
}
