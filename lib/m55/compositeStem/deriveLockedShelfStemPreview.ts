/**
 * Locked DTR shelf preview — v2 composite stem only (paid-fulfillment compatible).
 * Fail-closed to generic card when profile is not v2-complete.
 * Do not use essenceStemLaneIndex / jdn_offset_provisional_v1 here.
 */
import type { BirthProfile } from '../../soul/profile';
import { DEFAULT_COUNTRY, normalizeBirthProfile } from '../../soul/birthProfileV2';
import type { DtrShelfStemDisplay } from '../dtrShelfStemDisplay';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from './pipeline';

export function birthProfileToFulfillmentFields(
  profile: BirthProfile | null | undefined,
): FulfillmentProfileFields | null {
  const normalized = normalizeBirthProfile(profile);
  if (!normalized) return null;

  const birthTime = normalized.birthTime?.trim() || null;
  const birthTimeUnknown = normalized.birthTimeUnknown === true;

  return {
    nickname: normalized.nickname,
    birthDate: normalized.birthDate,
    birthTime,
    birthTimeUnknown,
    country: normalized.country ?? DEFAULT_COUNTRY,
    birthplace: normalized.birthplace ?? null,
    timezone: normalized.timezone ?? null,
  };
}

/** Returns null when profile incomplete or pipeline fail-closed — use generic shelf card. */
export function deriveLockedShelfStemPreviewFromProfile(
  profile: BirthProfile | null | undefined,
): DtrShelfStemDisplay | null {
  const fields = birthProfileToFulfillmentFields(profile);
  if (!fields || !isV2FulfillmentProfileComplete(fields)) {
    return null;
  }

  try {
    const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const stem = TEN_STEM_DISPLAY[composite.stemLaneIndex];
    if (!stem) return null;
    return {
      stemLaneIndex: composite.stemLaneIndex,
      publicTitle: composite.paid.publicTitle,
      displayOneLine: stem.displayOneLine,
      nickname: fields.nickname,
    };
  } catch {
    return null;
  }
}
