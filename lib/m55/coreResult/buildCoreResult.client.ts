import type { BirthProfile } from '../../soul/profile';
import { CORE_ENGINE_VERSION } from './coreEngineVersion';
import { runCanonicalCorePipelineClient } from './canonicalBoundary.client';
import type { CoreResult } from './types';

/** Client-only seal build — no internal Japanese trait labels in bundled catalog. */
export function buildCoreResultClient(profile: BirthProfile): CoreResult {
  const canonical = runCanonicalCorePipelineClient({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    country: profile.country,
    birthplace: profile.birthplace,
  });
  const seed = canonical.staticCore;
  const typeSeed = canonical.typeSeed;

  return {
    stemLaneIndex: seed.stemLaneIndex,
    coreType: `TYPE_${String(seed.typeIndex + 1).padStart(2, '0')}`,
    coreLabel: typeSeed.coreType,
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
