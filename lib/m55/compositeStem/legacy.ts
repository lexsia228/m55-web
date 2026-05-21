import { essenceStemLaneIndex } from '../essenceEngine';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';

/** Legacy-only path — must not be called from v2 pipeline. */
export function runLegacyProvisionalStemLane(birthDate: string): {
  engineVersion: 'dtr-v1-jdn-day-stem-provisional';
  stemLaneIndex: number;
  stemChar: string;
} {
  const stemLaneIndex = essenceStemLaneIndex(birthDate);
  const stemChar = TEN_STEM_DISPLAY[stemLaneIndex]!.stemChar;
  return {
    engineVersion: 'dtr-v1-jdn-day-stem-provisional',
    stemLaneIndex,
    stemChar,
  };
}
