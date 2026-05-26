import type { BirthProfile } from '../../soul/profile';
import { DEFAULT_COUNTRY, normalizeBirthProfile } from '../../soul/birthProfileV2';
import type { FulfillmentProfileFields } from './parseFulfillmentMetadata';

/** Client-safe profile → fulfillment fields (no pipeline / calendar imports). */
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
