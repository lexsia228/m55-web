import type { BirthProfile } from '../../soul/profile';
import { essenceStemLaneIndex } from '../essenceEngine';
import { buildAxisDetails, compositionFromScores } from './axisMeta';
import type { CoreResult } from './types';
import { affinityForTypeIndex, TYPE_CATALOG, typeIndexFromStemLane } from './typeCatalog';

export const CORE_ENGINE_VERSION = 'm55-core-2026-04' as const;

/** Fresh build from profile (deterministic). Use only when no sealed snapshot matches. */
export function buildCoreResult(profile: BirthProfile): CoreResult {
  const nick = profile.nickname.trim();
  const birthDate = profile.birthDate;
  const lane = essenceStemLaneIndex(birthDate);
  const idx = typeIndexFromStemLane(lane);
  const seed = TYPE_CATALOG[idx]!;

  const axisDetails = buildAxisDetails(seed.coreLabel, seed.coreAxisScores);
  const composition = compositionFromScores(seed.coreAxisScores);
  const affinities = affinityForTypeIndex(idx);

  return {
    coreType: seed.coreType,
    coreLabel: seed.coreLabel,
    coreSummary: seed.coreSummary,
    coreAxisScores: { ...seed.coreAxisScores },
    axisDetails,
    composition,
    affinities,
    strengths: [...seed.strengths],
    cautions: [...seed.cautions],
    workStyle: {
      summary: seed.workStyle.summary,
      strengths: [...seed.workStyle.strengths],
      cautions: [...seed.workStyle.cautions],
    },
    relationships: {
      summary: seed.relationships.summary,
      strengths: [...seed.relationships.strengths],
      cautions: [...seed.relationships.cautions],
    },
    love: {
      summary: seed.love.summary,
      strengths: [...seed.love.strengths],
      cautions: [...seed.love.cautions],
    },
    engineVersion: CORE_ENGINE_VERSION,
    lockedAt: new Date().toISOString(),
  };
}
