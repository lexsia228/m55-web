import type { BirthProfile } from '../../soul/profile';
import { v2ProfileBlockReason } from '../../soul/birthProfileV2';

/** B5: DTR checkout requires nickname + birthDate (implicit unknown-time when birthTime absent). */
export const DTR_CHECKOUT_REQUIRES_V2_PROFILE = true;

export type CheckoutProfileGateResult =
  | { ok: true }
  | { ok: false; code: 'composite_profile_incomplete'; reason: string };

export function validateDtrCheckoutProfile(profile: BirthProfile | null | undefined): CheckoutProfileGateResult {
  if (!DTR_CHECKOUT_REQUIRES_V2_PROFILE) {
    return { ok: true };
  }
  const reason = v2ProfileBlockReason(profile);
  if (reason) {
    return { ok: false, code: 'composite_profile_incomplete', reason };
  }
  return { ok: true };
}
