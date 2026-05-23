/**
 * Locked shelf preview logic — server graph only (import via deriveLockedShelfStemPreview barrel).
 * Tests import this module directly; client components must not.
 */
import type { BirthProfile } from '../../soul/profile';
import { DEFAULT_COUNTRY, normalizeBirthProfile } from '../../soul/birthProfileV2';
import type { DtrShelfStemDisplay } from '../dtrShelfStemDisplay';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import {
  isV2FulfillmentProfileComplete,
  resolveFulfillmentProfileFields,
  toCompositeCanonicalInput,
  type FulfillmentDraftRow,
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

/** Returns null when fields incomplete or pipeline fail-closed — use generic shelf card. */
export function deriveLockedShelfStemPreviewFromFields(
  fields: FulfillmentProfileFields | null | undefined,
): DtrShelfStemDisplay | null {
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

/** Server draft SSOT path — same field resolution as checkout fulfillment. */
export function deriveLockedShelfStemPreviewFromDraft(
  draft: FulfillmentDraftRow | null | undefined,
): DtrShelfStemDisplay | null {
  const fields = resolveFulfillmentProfileFields(null, draft ?? null);
  return deriveLockedShelfStemPreviewFromFields(fields);
}

/** Returns null when profile incomplete or pipeline fail-closed — use generic shelf card. */
export function deriveLockedShelfStemPreviewFromProfile(
  profile: BirthProfile | null | undefined,
): DtrShelfStemDisplay | null {
  return deriveLockedShelfStemPreviewFromFields(birthProfileToFulfillmentFields(profile));
}
