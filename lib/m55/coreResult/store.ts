import type { BirthProfile } from '../../soul/profile';
import { ProfileRepository } from '../../soul/profile';
import { buildCoreResultClient } from './buildCoreResult.client';
import { CORE_ENGINE_VERSION } from './coreEngineVersion';
import { isLegacyV1, migrateLegacyV1ToCoreResult, wrapV3 } from './migrateV1';
import type { CoreResult, SealedCoreEnvelopeV3 } from './types';

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

function writeV3(ownerId: string, env: SealedCoreEnvelopeV3): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(KEY_V3 + ownerId, JSON.stringify(env));
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

/** True when sealed v3 envelope must be rebuilt (engine parity bump). */
export function coreEnvelopeRequiresReseal(envelope: SealedCoreEnvelopeV3 | null): boolean {
  if (!envelope) return true;
  return envelope.coreResult.engineVersion !== CORE_ENGINE_VERSION;
}

/**
 * Returns sealed coreResult. Never rebuilds when sealedInputs match stored v3.
 * Migrates v1 → v3 once per owner (add-only path), preserving v1 lockedAt.
 */
export function ensureSealedCoreResult(
  userId: string | null | undefined,
  profile: BirthProfile,
): CoreResult {
  const ownerId = ProfileRepository.getOwnerId(userId);
  const cur: BirthProfile = { nickname: profile.nickname.trim(), birthDate: profile.birthDate };

  const v3 = readEnvelope(ownerId);
  if (
    v3 &&
    profilesMatch(v3.sealedInputs, cur) &&
    v3.coreResult.engineVersion === CORE_ENGINE_VERSION
  ) {
    return v3.coreResult;
  }

  const legacyRaw = readLegacyV1(ownerId);
  if (isLegacyV1(legacyRaw) && profilesMatch(legacyRaw.sealedInputs, cur)) {
    const migrated = migrateLegacyV1ToCoreResult(legacyRaw, cur);
    const env = wrapV3(cur, migrated);
    writeV3(ownerId, env);
    return migrated;
  }

  const built = buildFreshCoreResult(cur);
  writeV3(ownerId, wrapV3(cur, built));
  return built;
}

/**
 * Post-purchase: copy sealed core snapshot (v3 or legacy v1) from device owner → Clerk user.
 * Keeps the same result seed / type the user saw on free /core before login+checkout.
 */
export function promoteGuestCoreSnapshotToClerkUser(userId: string): boolean {
  if (!isClient() || !userId?.trim()) return false;
  const guestOwner = ProfileRepository.getOwnerId(null);
  const clerkOwner = ProfileRepository.getOwnerId(userId);
  if (guestOwner === clerkOwner) return false;

  const v3 = readEnvelope(guestOwner);
  if (v3) {
    writeV3(clerkOwner, v3);
    return true;
  }

  const legacyRaw = readLegacyV1(guestOwner);
  if (isLegacyV1(legacyRaw)) {
    const si = legacyRaw.sealedInputs;
    const profile: BirthProfile = {
      birthDate: si.birthDate,
      nickname: (si.nickname ?? '').trim(),
    };
    if (!profile.birthDate || !profile.nickname) return false;
    const migrated = migrateLegacyV1ToCoreResult(legacyRaw, profile);
    writeV3(clerkOwner, wrapV3(profile, migrated));
    return true;
  }

  return false;
}
