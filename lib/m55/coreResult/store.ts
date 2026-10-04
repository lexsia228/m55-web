import type { BirthProfile } from '../../soul/profile';
import { ProfileRepository } from '../../soul/profile';
import { isValidCivilBirthDate } from '../selfFunnel/selfFunnelRuntimeState';
import { buildCoreResultClient } from './buildCoreResult.client';
import { CORE_ENGINE_VERSION } from './coreEngineVersion';
import {
  buildContinuityFromLegacyV1,
  buildContinuityFromStaleV3,
  isLegacyV1,
  migrateLegacyV1ToCoreResult,
  publicTitleForStoredLane,
  wrapV3,
  type LegacyCoreResultV1,
} from './migrateV1';
import type { CoreIdentityContinuityV1, CoreResult, SealedCoreEnvelopeV3 } from './types';

const KEY_V3 = 'm55_core_result_v3_';
const KEY_V1 = 'm55_core_result_v1_';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function readEnvelope(ownerId: string): SealedCoreEnvelopeV3 | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(KEY_V3 + ownerId);
    if (!raw) return null;
    const o = JSON.parse(raw) as SealedCoreEnvelopeV3;
    if (o?.schemaVersion !== 3 || !o.coreResult || !o.sealedInputs?.birthDate) return null;
    return o;
  } catch {
    return null;
  }
}

function readLegacyV1(ownerId: string): unknown | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(KEY_V1 + ownerId);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeV3(ownerId: string, env: SealedCoreEnvelopeV3): boolean {
  if (!isClient()) return false;
  try {
    localStorage.setItem(KEY_V3 + ownerId, JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

function removeLegacyV1(ownerId: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(KEY_V1 + ownerId);
  } catch {
    /* no-op */
  }
}

function profilesMatch(
  a: { birthDate: string; nickname: string },
  b: BirthProfile,
): boolean {
  return (
    a.birthDate === b.birthDate && a.nickname.trim() === b.nickname.trim()
  );
}

function buildFreshCoreResult(profile: BirthProfile): CoreResult {
  return buildCoreResultClient(profile);
}

function isUsableCurrentEnvelope(
  envelope: SealedCoreEnvelopeV3 | null,
  profile: BirthProfile,
): envelope is SealedCoreEnvelopeV3 {
  if (!envelope || !profilesMatch(envelope.sealedInputs, profile)) return false;
  const result = envelope.coreResult;
  if (!result || result.engineVersion !== CORE_ENGINE_VERSION) return false;
  if (!isIntegerLane(result.stemLaneIndex)) return false;
  if (typeof result.coreType !== 'string' || result.coreType.length === 0) return false;
  if (typeof result.coreLabel !== 'string' || result.coreLabel.trim().length === 0) return false;
  let canonical: CoreResult;
  try {
    canonical = buildFreshCoreResult({
      nickname: profile.nickname.trim(),
      birthDate: profile.birthDate,
    });
  } catch {
    return false;
  }
  return (
    result.stemLaneIndex === canonical.stemLaneIndex &&
    result.coreType === canonical.coreType &&
    result.coreLabel === canonical.coreLabel
  );
}

function matchingLegacyV1(ownerId: string, profile: BirthProfile): LegacyCoreResultV1 | null {
  const raw = readLegacyV1(ownerId);
  if (!isLegacyV1(raw) || !profilesMatch(raw.sealedInputs, profile)) return null;
  return raw;
}

function isIntegerLane(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 9;
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIdentityContinuity(value: unknown): value is CoreIdentityContinuityV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.version === 'core_identity_continuity_v1' &&
    (o.source === 'legacy_v1' || o.source === 'stale_v3') &&
    (o.previousStemLaneIndex === null || isIntegerLane(o.previousStemLaneIndex)) &&
    (o.previousPublicTitle === null || isNonEmptyString(o.previousPublicTitle)) &&
    (o.previousCoreLabel === null || isNonEmptyString(o.previousCoreLabel)) &&
    isIntegerLane(o.currentStemLaneIndex) &&
    isNonEmptyString(o.currentPublicTitle) &&
    isNonEmptyString(o.currentEngineVersion) &&
    (o.previousEngineVersion === null || isNonEmptyString(o.previousEngineVersion)) &&
    typeof o.publicIdentityChanged === 'boolean'
  );
}

/**
 * Continuity is descriptive evidence bound to the containing current result.
 * A mismatched lane, title, or engine is not an alternate live identity.
 */
function continuityBoundToEnvelope(
  continuity: CoreIdentityContinuityV1,
  envelope: SealedCoreEnvelopeV3,
): boolean {
  const lane = envelope.coreResult.stemLaneIndex;
  const title = publicTitleForStoredLane(lane);
  if (title === null) return false;
  if (continuity.currentEngineVersion !== CORE_ENGINE_VERSION) return false;
  if (continuity.currentEngineVersion !== envelope.coreResult.engineVersion) return false;
  if (continuity.currentStemLaneIndex !== lane) return false;
  return continuity.currentPublicTitle === title;
}

function validBoundContinuity(
  envelope: SealedCoreEnvelopeV3,
): CoreIdentityContinuityV1 | null {
  if (!isIdentityContinuity(envelope.identityContinuity)) return null;
  if (!continuityBoundToEnvelope(envelope.identityContinuity, envelope)) return null;
  return envelope.identityContinuity;
}

/** True when sealed v3 envelope must be rebuilt (engine parity bump). */
export function coreEnvelopeRequiresReseal(envelope: SealedCoreEnvelopeV3 | null): boolean {
  if (!envelope) return true;
  return envelope.coreResult.engineVersion !== CORE_ENGINE_VERSION;
}

/**
 * Returns the current canonical coreResult for this profile.
 * A matching v3 is live only when its identity tuple is the current canonical result.
 * A current engine string with mixed vintage fields is previous evidence, not live authority.
 * Separate legacy v1 is removed only after that exact record is persisted as continuity.
 */
export function ensureSealedCoreResult(
  userId: string | null | undefined,
  profile: BirthProfile,
): CoreResult {
  const ownerId = ProfileRepository.getOwnerId(userId);
  const cur: BirthProfile = { nickname: profile.nickname.trim(), birthDate: profile.birthDate };
  const legacy = matchingLegacyV1(ownerId, cur);
  const v3 = readEnvelope(ownerId);

  if (v3 && profilesMatch(v3.sealedInputs, cur)) {
    if (isUsableCurrentEnvelope(v3, cur)) {
      if (validBoundContinuity(v3)) {
        return v3.coreResult;
      }
      if (legacy) {
        try {
          const continuity = buildContinuityFromLegacyV1(legacy, v3.coreResult);
          const wrote = writeV3(ownerId, wrapV3(cur, v3.coreResult, continuity));
          if (wrote) removeLegacyV1(ownerId);
        } catch {
          /* keep legacy evidence; live result stays the stored current result */
        }
        return v3.coreResult;
      }
      return v3.coreResult;
    }

    const built = buildFreshCoreResult(cur);
    const continuity = buildContinuityFromStaleV3(v3, built);
    writeV3(ownerId, wrapV3(cur, built, continuity));
    return built;
  }

  if (legacy) {
    const migrated = migrateLegacyV1ToCoreResult(legacy, cur);
    const continuity = buildContinuityFromLegacyV1(legacy, migrated);
    const wrote = writeV3(ownerId, wrapV3(cur, migrated, continuity));
    if (wrote) removeLegacyV1(ownerId);
    return migrated;
  }

  const built = buildFreshCoreResult(cur);
  writeV3(ownerId, wrapV3(cur, built));
  return built;
}

/** Read-only continuity for the owner's current minimal profile. No UI consumer in this gate. */
export function readCoreIdentityContinuity(
  userId: string | null | undefined,
): CoreIdentityContinuityV1 | null {
  if (!isClient()) return null;
  const ownerId = ProfileRepository.getOwnerId(userId);
  const current = minimalPersonalFreeProfile(
    ProfileRepository.get(userId) ?? { nickname: '', birthDate: '' },
  );
  if (!current) return null;
  const envelope = readEnvelope(ownerId);
  if (!envelope || !profilesMatch(envelope.sealedInputs, current)) return null;
  if (envelope.coreResult.engineVersion !== CORE_ENGINE_VERSION) return null;
  return validBoundContinuity(envelope);
}

function minimalPersonalFreeProfile(profile: BirthProfile | null | undefined): BirthProfile | null {
  if (!profile || typeof profile.nickname !== 'string' || typeof profile.birthDate !== 'string') {
    return null;
  }
  const nickname = profile.nickname.trim();
  const birthDate = profile.birthDate.trim();
  if (!nickname || !isValidCivilBirthDate(birthDate)) return null;
  return { nickname, birthDate };
}

/**
 * Copy or reseal a guest core snapshot onto the Clerk user.
 * Success means the Clerk target is already complete, or required recovery was persisted.
 * A current engine string alone is not completion.
 */
type ClerkContinuityRecovery = {
  continuity: CoreIdentityContinuityV1;
  persistedGuestLegacyEvidence: boolean;
};

function continuityForExistingClerkResult(
  guestEnvelope: SealedCoreEnvelopeV3 | null,
  guestUsable: boolean,
  clerkEnvelope: SealedCoreEnvelopeV3,
  guestLegacy: LegacyCoreResultV1 | null,
  target: BirthProfile,
): ClerkContinuityRecovery | null {
  const guestContinuity = guestEnvelope?.identityContinuity;
  if (
    isIdentityContinuity(guestContinuity) &&
    continuityBoundToEnvelope(guestContinuity, clerkEnvelope)
  ) {
    return { continuity: guestContinuity, persistedGuestLegacyEvidence: false };
  }

  const guestMatches = !!(guestEnvelope && profilesMatch(guestEnvelope.sealedInputs, target));
  if (guestEnvelope && guestMatches && !guestUsable) {
    try {
      return {
        continuity: buildContinuityFromStaleV3(guestEnvelope, clerkEnvelope.coreResult),
        persistedGuestLegacyEvidence: false,
      };
    } catch {
      /* fall through to legacy evidence */
    }
  }

  if (!guestLegacy) return null;
  try {
    return {
      continuity: buildContinuityFromLegacyV1(guestLegacy, clerkEnvelope.coreResult),
      persistedGuestLegacyEvidence: true,
    };
  } catch {
    return null;
  }
}

export function promoteGuestCoreSnapshotToClerkUser(userId: string): boolean {
  if (!isClient() || !userId?.trim()) return false;
  const guestOwner = ProfileRepository.getOwnerId(null);
  const clerkOwner = ProfileRepository.getOwnerId(userId);
  if (guestOwner === clerkOwner) return false;

  const target = minimalPersonalFreeProfile(ProfileRepository.get(userId) ?? { nickname: '', birthDate: '' });
  if (!target) return false;

  const clerkEnvelope = readEnvelope(clerkOwner);
  const guestEnvelope = readEnvelope(guestOwner);
  const guestLegacy = matchingLegacyV1(guestOwner, target);
  const guestMatches = !!(guestEnvelope && profilesMatch(guestEnvelope.sealedInputs, target));
  const clerkUsable = isUsableCurrentEnvelope(clerkEnvelope, target);
  const guestUsable = guestMatches && isUsableCurrentEnvelope(guestEnvelope, target);

  if (clerkUsable) {
    if (validBoundContinuity(clerkEnvelope)) {
      return true;
    }

    const recovery = continuityForExistingClerkResult(
      guestMatches ? guestEnvelope : null,
      guestUsable,
      clerkEnvelope,
      guestLegacy,
      target,
    );
    if (!recovery) return true;

    const wrote = writeV3(clerkOwner, wrapV3(target, clerkEnvelope.coreResult, recovery.continuity));
    if (!wrote) return false;
    if (recovery.persistedGuestLegacyEvidence) removeLegacyV1(guestOwner);
    return true;
  }

  if (guestUsable && guestEnvelope) {
    let envelopeToWrite = guestEnvelope;
    let persistedGuestLegacyEvidence = false;
    if (!validBoundContinuity(guestEnvelope) && guestLegacy) {
      try {
        envelopeToWrite = wrapV3(
          target,
          guestEnvelope.coreResult,
          buildContinuityFromLegacyV1(guestLegacy, guestEnvelope.coreResult),
        );
        persistedGuestLegacyEvidence = true;
      } catch {
        return false;
      }
    }
    const wrote = writeV3(clerkOwner, envelopeToWrite);
    if (!wrote) return false;
    if (persistedGuestLegacyEvidence) removeLegacyV1(guestOwner);
    return true;
  }

  if (guestMatches && guestEnvelope) {
    try {
      const built = buildFreshCoreResult(target);
      const continuity = buildContinuityFromStaleV3(guestEnvelope, built);
      const wrote = writeV3(clerkOwner, wrapV3(target, built, continuity));
      if (!wrote) return false;
      return true;
    } catch {
      return false;
    }
  }

  if (!guestLegacy) return false;

  try {
    const migrated = migrateLegacyV1ToCoreResult(guestLegacy, target);
    const continuity = buildContinuityFromLegacyV1(guestLegacy, migrated);
    const wrote = writeV3(clerkOwner, wrapV3(target, migrated, continuity));
    if (!wrote) return false;
    removeLegacyV1(guestOwner);
    return true;
  } catch {
    return false;
  }
}
