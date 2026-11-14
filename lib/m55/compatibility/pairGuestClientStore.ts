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
import {
  PAIR_OWNED_STATE_SESSION_COMPANION_KEY,
  parsePairOwnedStateIdentityV1,
  resolveNextPairOwnedStateIdentity,
  type PairOwnedStateIdentityV1,
} from './pairOwnedStateIdentity';

export type PairGuestPersistedV2 = {
  version: 'pair_guest_persisted_v2';
  ownerUserId: string;
  journey: CompatibilityGuestJourneyV3;
  ownedStateIdentity: PairOwnedStateIdentityV1;
};

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
      storage.removeItem(PAIR_OWNED_STATE_SESSION_COMPANION_KEY);
    }
  } catch {
    /* Fail closed at resolution boundaries even when tab storage is unavailable. */
  }
}

function readSessionOwnedStateIdentity(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): PairOwnedStateIdentityV1 | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PAIR_OWNED_STATE_SESSION_COMPANION_KEY);
    if (!raw) return null;
    return parsePairOwnedStateIdentityV1(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeSessionOwnedStateIdentity(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined,
  identity: PairOwnedStateIdentityV1 | null,
): void {
  if (!storage) return;
  try {
    if (!identity) {
      storage.removeItem(PAIR_OWNED_STATE_SESSION_COMPANION_KEY);
      return;
    }
    storage.setItem(PAIR_OWNED_STATE_SESSION_COMPANION_KEY, JSON.stringify(identity));
  } catch {
    /* no-op */
  }
}

function purchaseJourneyBindingKey(journey: CompatibilityPurchaseJourney): string {
  return JSON.stringify({
    personA: journey.input.personA,
    personB: journey.input.personB,
    relationStatusId: journey.relationStatusId,
    currentContext: journey.currentContext,
    partnerLabel: journey.displayIdentity?.partnerLabel ?? '',
  });
}

export type PairCheckoutTabBinding = {
  identity: PairOwnedStateIdentityV1;
  journeyKey: string;
};

export function readPairGuestPersistedCheckoutBinding(
  clerkUserId: string,
): PairCheckoutTabBinding | null {
  if (!isClient() || !clerkUserId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PairGuestPersistedV2>;
    if (parsed.version !== 'pair_guest_persisted_v2' || parsed.ownerUserId !== clerkUserId) {
      return null;
    }
    const identity = parsePairOwnedStateIdentityV1(parsed.ownedStateIdentity);
    if (!identity || !parsed.journey || parsed.journey.version !== 'journey_v3') {
      return null;
    }
    const journey = parseSanitizedGuestJourneyV3(JSON.stringify(parsed.journey));
    if (!journey) return null;
    return {
      identity,
      journeyKey: purchaseJourneyBindingKey(guestJourneyV3ToPurchaseJourney(journey)),
    };
  } catch {
    return null;
  }
}

export function readSessionGuestCheckoutBinding(
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined,
): PairCheckoutTabBinding | null {
  const journeyV3 = readCompatibilityGuestJourneyV3FromSession(storage);
  const identity = readSessionOwnedStateIdentity(storage);
  if (!journeyV3 || !identity) return null;
  return {
    identity,
    journeyKey: purchaseJourneyBindingKey(guestJourneyV3ToPurchaseJourney(journeyV3)),
  };
}

export function captureCheckoutTabIdentity(
  args: {
    clerkUserId: string | null;
    sessionStorageRef: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined;
    tabJourney: CompatibilityPurchaseJourney;
  },
): PairOwnedStateIdentityV1 | null {
  const tabKey = purchaseJourneyBindingKey(args.tabJourney);
  const bundled = args.clerkUserId
    ? readPairGuestPersistedCheckoutBinding(args.clerkUserId)
    : readSessionGuestCheckoutBinding(args.sessionStorageRef);
  if (!bundled || bundled.journeyKey !== tabKey) return null;
  return bundled.identity;
}

export function verifyCheckoutTabBindingStillCoherent(
  args: {
    clerkUserId: string | null;
    sessionStorageRef: Pick<Storage, 'getItem' | 'removeItem'> | null | undefined;
    tabJourney: CompatibilityPurchaseJourney;
    tabIdentity: PairOwnedStateIdentityV1;
  },
): boolean {
  const tabKey = purchaseJourneyBindingKey(args.tabJourney);
  const bundled = args.clerkUserId
    ? readPairGuestPersistedCheckoutBinding(args.clerkUserId)
    : readSessionGuestCheckoutBinding(args.sessionStorageRef);
  if (!bundled || bundled.journeyKey !== tabKey) return false;
  return (
    bundled.identity.pairIdentityId === args.tabIdentity.pairIdentityId &&
    bundled.identity.paidContextId === args.tabIdentity.paidContextId
  );
}

export function readPairOwnedStateIdentityForUser(
  clerkUserId: string | null | undefined,
): PairOwnedStateIdentityV1 | null {
  if (!isClient() || !clerkUserId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PairGuestPersistedV2> | Partial<PairGuestPersistedV1>;
    if (parsed.version === 'pair_guest_persisted_v2') {
      const v2 = parsed as Partial<PairGuestPersistedV2>;
      if (v2.ownerUserId !== clerkUserId) return null;
      return parsePairOwnedStateIdentityV1(v2.ownedStateIdentity);
    }
    return null;
  } catch {
    return null;
  }
}

export function readPairOwnedStateIdentityForSession(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): PairOwnedStateIdentityV1 | null {
  return readSessionOwnedStateIdentity(storage);
}

/** Authenticated completions are user-owned only; sessionStorage remains guest-only. */
export function persistCompletedPairJourney(
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'> | null | undefined,
  clerkUserId: string | null | undefined,
  journey: CompatibilityGuestJourneyV3,
  options?: { explicitContinuityReset?: boolean },
): void {
  if (clerkUserId) {
    purgeUnownedPairGuestSession(storage);
    const previousJourney = readLastCompletedPairJourney(clerkUserId);
    const previousIdentity = readPairOwnedStateIdentityForUser(clerkUserId);
    writeLastCompletedPairJourney(clerkUserId, journey, previousIdentity, {
      previousJourney,
      explicitContinuityReset: options?.explicitContinuityReset,
    });
    return;
  }

  try {
    const sessionJourney = readCompatibilityGuestJourneyV3FromSession(storage);
    const previousIdentity = readSessionOwnedStateIdentity(storage);
    const nextIdentity = resolveNextPairOwnedStateIdentity({
      previousIdentity,
      previousJourney: sessionJourney,
      nextJourney: journey,
      explicitContinuityReset: options?.explicitContinuityReset,
    });
    storage?.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journey));
    storage?.setItem(
      COMPATIBILITY_GUEST_SESSION_PROVENANCE_KEY_V1,
      COMPATIBILITY_GUEST_SESSION_PROVENANCE_VALUE_V1,
    );
    storage?.removeItem(COMPATIBILITY_GUEST_SESSION_KEY);
    if (nextIdentity) writeSessionOwnedStateIdentity(storage, nextIdentity);
  } catch {
    purgeUnownedPairGuestSession(storage);
  }
}

/** Guest→login claim: persist the exact held pre-auth journey under the signed-in Clerk user. */
export function claimPreAuthSessionJourneyForUser(
  clerkUserId: string,
  preAuthJourney: CompatibilityGuestJourneyV3,
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'> | null | undefined,
): Extract<CompatibilityPurchaseHandoffResolution, { kind: 'persisted' }> {
  const sessionIdentity = readSessionOwnedStateIdentity(storage);
  writeLastCompletedPairJourney(clerkUserId, preAuthJourney, sessionIdentity, {
    preserveTrustedIdentity: true,
  });
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
  if (!isClient()) return null;
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

  if (profileBirth && isValidCompatibilityBirthDate(profileBirth)) {
    return { kind: 'profile_only', personA: profileBirth };
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
    const parsed = JSON.parse(raw) as Partial<PairGuestPersistedV2> | Partial<PairGuestPersistedV1>;
    if (
      parsed.version !== 'pair_guest_persisted_v1' &&
      parsed.version !== 'pair_guest_persisted_v2'
    ) {
      return null;
    }
    const ownerUserId = parsed.ownerUserId;
    const journeyPayload = parsed.journey;
    if (ownerUserId !== clerkUserId) return null;
    if (!journeyPayload || journeyPayload.version !== 'journey_v3') return null;
    return parseSanitizedGuestJourneyV3(JSON.stringify(journeyPayload));
  } catch {
    return null;
  }
}

export function writeLastCompletedPairJourney(
  clerkUserId: string,
  journey: CompatibilityGuestJourneyV3,
  trustedIdentity: PairOwnedStateIdentityV1 | null = null,
  options?: {
    previousJourney?: CompatibilityGuestJourneyV3 | null;
    explicitContinuityReset?: boolean;
    preserveTrustedIdentity?: boolean;
  },
): void {
  if (!isClient() || !clerkUserId) return;

  let ownedStateIdentity: PairOwnedStateIdentityV1 | null = null;
  if (options?.preserveTrustedIdentity && trustedIdentity) {
    ownedStateIdentity = parsePairOwnedStateIdentityV1(trustedIdentity);
  } else {
    ownedStateIdentity = resolveNextPairOwnedStateIdentity({
      previousIdentity: trustedIdentity,
      previousJourney: options?.previousJourney ?? null,
      nextJourney: journey,
      explicitContinuityReset: options?.explicitContinuityReset,
    });
  }

  const payload: PairGuestPersistedV2 | PairGuestPersistedV1 = ownedStateIdentity
    ? {
        version: 'pair_guest_persisted_v2',
        ownerUserId: clerkUserId,
        journey,
        ownedStateIdentity,
      }
    : {
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

export function clearPairContinuityForUser(
  clerkUserId: string | null | undefined,
  sessionStorageRef: Pick<Storage, 'removeItem'> | null | undefined,
): void {
  clearLastCompletedPairJourney(clerkUserId);
  purgeUnownedPairGuestSession(sessionStorageRef);
}
