/**
 * Clerk-user-keyed local persistence for the last completed Pair free journey.
 * Birth profile authority remains in ProfileRepository; this store owns journey replay only.
 */

import { ProfileRepository } from '../../soul/profile';
import { parseSanitizedGuestJourneyV3 } from './pairReadingGuestClientSafe';
import {
  isValidCompatibilityBirthDate,
  PAIR_GUEST_LAST_JOURNEY_KEY_PREFIX,
  type CompatibilityGuestInput,
  type CompatibilityGuestJourneyV3,
  type PairGuestPersistedV1,
} from './pairReadingGuestContract';

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
