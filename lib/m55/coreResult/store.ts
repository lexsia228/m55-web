import type { BirthProfile } from '../../soul/profile';
import { ProfileRepository } from '../../soul/profile';
import { buildCoreResult } from './buildCoreResult';
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
  if (v3 && profilesMatch(v3.sealedInputs, cur)) {
    return v3.coreResult;
  }

  const legacyRaw = readLegacyV1(ownerId);
  if (isLegacyV1(legacyRaw) && profilesMatch(legacyRaw.sealedInputs, cur)) {
    const migrated = migrateLegacyV1ToCoreResult(legacyRaw, cur);
    const env = wrapV3(cur, migrated);
    writeV3(ownerId, env);
    return migrated;
  }

  const built = buildCoreResult(cur);
  writeV3(ownerId, wrapV3(cur, built));
  return built;
}
