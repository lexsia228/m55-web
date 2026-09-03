/**
 * Clerk-user-keyed local persistence for the last completed Pair free journey.
 * Birth profile authority remains in ProfileRepository; this store owns journey replay only.
 */

import { ProfileRepository } from '../../soul/profile';
import {
  clearGuestSessionStorage,
  parseSanitizedGuestJourneyV3,
} from './pairReadingGuestClientSafe';
import {
  isCompleteCompatibilityCurrentContextV2,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import {
  COMPATIBILITY_GUEST_SESSION_KEY_V3,
  COMPATIBILITY_GUEST_SESSION_KEY,
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityBirthDate,
  isValidCompatibilityRelationStatusId,
  PAIR_GUEST_LAST_JOURNEY_KEY_PREFIX,
  type CompatibilityGuestInput,
  type CompatibilityGuestJourneyV3,
  type PairGuestPersistedV1,
} from './pairReadingGuestContract';
import type { RelationStatusId } from './pairReadingTypes';
import type { PairDisplayIdentityV1 } from './pairDisplayIdentity';

const COMPATIBILITY_GUEST_SESSION_PROVENANCE_KEY_V1 =
  'm55_compatibility_guest_journey_v3_provenance_v1';
const COMPATIBILITY_GUEST_SESSION_PROVENANCE_VALUE_V1 =
  'post_hotfix_signed_out_guest_v1';

export type CompatibilityPurchaseJourney = {
  input: CompatibilityGuestInput;
  relationStatusId: RelationStatusId;
  currentContext: CompatibilityCurrentContextAnswersV2;
  displayIdentity?: PairDisplayIdentityV1;
};

export type CompatibilityPurchaseHandoffResolution =
  | { kind: 'session'; journey: CompatibilityPurchaseJourney }
  | { kind: 'persisted'; journey: CompatibilityPurchaseJourney }
  | { kind: 'recovery' };

export function guestJourneyV3ToPurchaseJourney(
  journey: CompatibilityGuestJourneyV3,
): CompatibilityPurchaseJourney {
  return {
    input: journey.input,
    relationStatusId: journey.relationStatusId,
    currentContext: journey.answers,
    displayIdentity: journey.displayIdentity,
  };
}

function parseCompatibilityGuestJourneyV3FromRaw(
  raw: string | null,
): CompatibilityGuestJourneyV3 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CompatibilityGuestJourneyV3>;
    if (
      parsed.version !== 'journey_v3' ||
      !parsed.input ||
      !isCompleteCompatibilityGuestInput(parsed.input) ||
      !isValidCompatibilityRelationStatusId(parsed.relationStatusId) ||
      !isCompleteCompatibilityCurrentContextV2(parsed.answers, parsed.relationStatusId)
    ) {
      return null;
    }
    return parsed as CompatibilityGuestJourneyV3;
  } catch {
    return null;
  }
}

export function readCompatibilityGuestJourneyV3FromSession(
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined,
): CompatibilityGuestJourneyV3 | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(COMPATIBILITY_GUEST_SESSION_KEY_V3);
    const provenance = storage.getItem(COMPATIBILITY_GUEST_SESSION_PROVENANCE_KEY_V1);
    if (
      !raw ||
      provenance !== COMPATIBILITY_GUEST_SESSION_PROVENANCE_VALUE_V1
    ) {
      if (raw || provenance) purgeUnownedPairGuestSession(storage);
      return null;
    }

    const journey = parseCompatibilityGuestJourneyV3FromRaw(raw);
    if (!journey) purgeUnownedPairGuestSession(storage);
    return journey;
  } catch {
    return null;
  }
}

export function readCompatibilityPurchaseJourneyFromSession(
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined,
): CompatibilityPurchaseJourney | null {
  const journey = readCompatibilityGuestJourneyV3FromSession(storage);
  return journey ? guestJourneyV3ToPurchaseJourney(journey) : null;
}

/** Signed-in purchase confirm: Clerk-owned saved journey only — never unowned session. */
export function resolveSignedInPurchaseHandoff(args: {
  clerkUserId: string;
  persistedJourney: CompatibilityGuestJourneyV3 | null;
}): CompatibilityPurchaseHandoffResolution {
  if (args.persistedJourney) {
    return {
      kind: 'persisted',
      journey: guestJourneyV3ToPurchaseJourney(args.persistedJourney),
    };
  }
  return { kind: 'recovery' };
}

/** Signed-out purchase confirm: same-tab session may be held until modal login claims it. */
export function resolveSignedOutPurchaseHandoff(args: {
  sessionJourney: CompatibilityPurchaseJourney | null;
  hasObservedSignedInIdentity: boolean;
}): CompatibilityPurchaseHandoffResolution {
  if (args.hasObservedSignedInIdentity) {
    return { kind: 'recovery' };
  }
  if (args.sessionJourney) {
    return { kind: 'session', journey: args.sessionJourney };
  }
  return { kind: 'recovery' };
}

/** Keep the first validated pre-auth candidate; ignore later session mutations. */
export function capturePreAuthSessionJourneyCandidate(
  current: CompatibilityGuestJourneyV3 | null,
  sessionJourney: CompatibilityGuestJourneyV3 | null,
  hasObservedSignedInIdentity: boolean,
): CompatibilityGuestJourneyV3 | null {
  if (hasObservedSignedInIdentity) return null;
  if (current) return current;
  return sessionJourney;
}

/** Remove unowned guest state once an authenticated lifecycle owns the tab. */
export function purgeUnownedPairGuestSession(
  storage: Pick<Storage, 'removeItem'> | null | undefined,
): void {
  try {
    if (storage) {
      clearGuestSessionStorage(storage);
      storage.removeItem(COMPATIBILITY_GUEST_SESSION_PROVENANCE_KEY_V1);
    }
  } catch {
    /* Fail closed at resolution boundaries even when tab storage is unavailable. */
  }
}

/** Authenticated completions are user-owned only; sessionStorage remains guest-only. */
export function persistCompletedPairJourney(
  storage: Pick<Storage, 'removeItem' | 'setItem'> | null | undefined,
  clerkUserId: string | null | undefined,
  journey: CompatibilityGuestJourneyV3,
): void {
  if (clerkUserId) {
    purgeUnownedPairGuestSession(storage);
    writeLastCompletedPairJourney(clerkUserId, journey);
    return;
  }

  try {
    storage?.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journey));
    storage?.setItem(
      COMPATIBILITY_GUEST_SESSION_PROVENANCE_KEY_V1,
      COMPATIBILITY_GUEST_SESSION_PROVENANCE_VALUE_V1,
    );
    storage?.removeItem(COMPATIBILITY_GUEST_SESSION_KEY);
  } catch {
    purgeUnownedPairGuestSession(storage);
  }
}

/** Guest→login claim: persist the exact held pre-auth journey under the signed-in Clerk user. */
export function claimPreAuthSessionJourneyForUser(
  clerkUserId: string,
  preAuthJourney: CompatibilityGuestJourneyV3,
  storage: Pick<Storage, 'removeItem'> | null | undefined,
): Extract<CompatibilityPurchaseHandoffResolution, { kind: 'persisted' }> {
  writeLastCompletedPairJourney(clerkUserId, preAuthJourney);
  purgeUnownedPairGuestSession(storage);
  return {
    kind: 'persisted',
    journey: guestJourneyV3ToPurchaseJourney(preAuthJourney),
  };
}

function isClient(): boolean {
  return typeof window !== 'undefined' || typeof localStorage !== 'undefined';
}

function storageKeyForUser(clerkUserId: string): string {
  return `${PAIR_GUEST_LAST_JOURNEY_KEY_PREFIX}${clerkUserId}`;
}

export function readProfileBirthDate(clerkUserId: string | null | undefined): string | null {
  if (!isClient() || !clerkUserId) return null;
  const profile = ProfileRepository.get(clerkUserId);
  const birthDate = profile?.birthDate?.trim().slice(0, 10) ?? '';
  return birthDate && isValidCompatibilityBirthDate(birthDate) ? birthDate : null;
}

export function applyProfilePersonAToJourney(
  journey: CompatibilityGuestJourneyV3,
  profileBirthDate: string | null,
): CompatibilityGuestJourneyV3 {
  if (!profileBirthDate || journey.input.personA === profileBirthDate) {
    return journey;
  }
  return {
    ...journey,
    input: {
      ...journey.input,
      personA: profileBirthDate,
    },
  };
}

export type PairGuestMountBootstrap =
  | { kind: 'restore_result'; journey: CompatibilityGuestJourneyV3 }
  | { kind: 'legacy_dob'; input: CompatibilityGuestInput }
  | { kind: 'profile_only'; personA: string }
  | { kind: 'empty' };

/** Deterministic mount precedence for /synastry guest resume. */
export function resolvePairGuestMountBootstrap(args: {
  clerkUserId: string | null;
  profileBirthDate: string | null;
  persistedJourney: CompatibilityGuestJourneyV3 | null;
  sessionJourney: CompatibilityGuestJourneyV3 | null;
  legacyDobInput: CompatibilityGuestInput | null;
}): PairGuestMountBootstrap {
  const profileBirth = args.profileBirthDate?.trim().slice(0, 10) || null;

  const withProfilePersonA = (journey: CompatibilityGuestJourneyV3): CompatibilityGuestJourneyV3 =>
    args.clerkUserId && profileBirth
      ? applyProfilePersonAToJourney(journey, profileBirth)
      : journey;

  if (args.clerkUserId) {
    if (args.persistedJourney) {
      return { kind: 'restore_result', journey: withProfilePersonA(args.persistedJourney) };
    }
    if (profileBirth) {
      return { kind: 'profile_only', personA: profileBirth };
    }
    return { kind: 'empty' };
  }

  if (args.sessionJourney) {
    return { kind: 'restore_result', journey: args.sessionJourney };
  }

  if (args.legacyDobInput) {
    return {
      kind: 'legacy_dob',
      input: { personA: args.legacyDobInput.personA, personB: args.legacyDobInput.personB },
    };
  }

  return { kind: 'empty' };
}

export function readLastCompletedPairJourney(
  clerkUserId: string | null | undefined,
): CompatibilityGuestJourneyV3 | null {
  if (!isClient() || !clerkUserId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PairGuestPersistedV1>;
    if (parsed.version !== 'pair_guest_persisted_v1') return null;
    if (parsed.ownerUserId !== clerkUserId) return null;
    if (!parsed.journey || parsed.journey.version !== 'journey_v3') return null;
    return parseSanitizedGuestJourneyV3(JSON.stringify(parsed.journey));
  } catch {
    return null;
  }
}

export function writeLastCompletedPairJourney(
  clerkUserId: string,
  journey: CompatibilityGuestJourneyV3,
): void {
  if (!isClient() || !clerkUserId) return;
  const payload: PairGuestPersistedV1 = {
    version: 'pair_guest_persisted_v1',
    ownerUserId: clerkUserId,
    journey,
  };
  try {
    localStorage.setItem(storageKeyForUser(clerkUserId), JSON.stringify(payload));
  } catch {
    /* Result remains available even when device storage is unavailable. */
  }
}

export function clearLastCompletedPairJourney(clerkUserId: string | null | undefined): void {
  if (!isClient() || !clerkUserId) return;
  try {
    localStorage.removeItem(storageKeyForUser(clerkUserId));
  } catch {
    /* no-op */
  }
}
