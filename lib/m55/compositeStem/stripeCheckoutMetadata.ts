import type { BirthProfile } from '../../soul/profile';
import { normalizeBirthProfile } from '../../soul/birthProfileV2';
import { INPUT_VERSION_V1, ENGINE_VERSION_V2 } from './constants';

export type StripeCheckoutProfileMetadata = Record<string, string>;

/**
 * Build Stripe Checkout Session metadata for v2 composite profile (string values only).
 */
export function buildStripeCheckoutMetadataFromProfile(
  profile: BirthProfile,
  productId: string,
): StripeCheckoutProfileMetadata {
  const n = normalizeBirthProfile(profile)!;
  const meta: StripeCheckoutProfileMetadata = {
    productId,
    profileNickname: n.nickname.slice(0, 120),
    profileBirthDate: n.birthDate,
    profileCountry: n.country ?? 'JP',
    profileBirthTimeUnknown: n.birthTimeUnknown ? 'true' : 'false',
    inputVersion: INPUT_VERSION_V1,
    engineVersionCandidate: ENGINE_VERSION_V2,
  };
  if (n.birthTime) {
    meta.profileBirthTime = n.birthTime.slice(0, 8);
  }
  if (n.birthplace) {
    meta.profileBirthplace = n.birthplace.slice(0, 120);
  }
  if (n.timezone) {
    meta.profileTimezone = n.timezone.slice(0, 64);
  }
  meta.calculationMode = n.birthTimeUnknown ? 'unknown_time_noon' : 'full';
  return meta;
}
