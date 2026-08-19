/**
 * Public-safe share artwork from an existing public token.
 * Uses only stem-lane catalog paths already encoded in s1-* / n1 personal|generic keys.
 * No DOB, nickname, raw answers, or private report body.
 */
import { decodeShareToken } from '../freeResult/privacySafeShareCardV1';
import {
  STEM_LANE_TEN_VIEWS_IMAGE,
  clampStemLaneIndex,
} from '../publicStemDisplay';
import { decodePublicShareToken } from './publicShareTokenV1';

export function publicShareArtworkPathFromStemLane(stemLaneIndex: number): string {
  const idx = clampStemLaneIndex(stemLaneIndex);
  return STEM_LANE_TEN_VIEWS_IMAGE[idx] ?? '/ten-views/analyst.webp';
}

export function resolvePublicShareArtworkFromToken(
  token: string | null | undefined,
): string | null {
  if (!token) return null;
  const narrative = decodePublicShareToken(token);
  if (narrative) {
    if (narrative.kind === 'personal') {
      return publicShareArtworkPathFromStemLane(narrative.stemLaneIndex);
    }
    if (
      narrative.kind === 'generic' &&
      typeof narrative.stemLaneIndex === 'number' &&
      Number.isFinite(narrative.stemLaneIndex)
    ) {
      return publicShareArtworkPathFromStemLane(narrative.stemLaneIndex);
    }
    return null;
  }
  const lane = decodeShareToken(token);
  if (lane == null) return null;
  return publicShareArtworkPathFromStemLane(lane);
}
