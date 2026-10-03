import type { BirthProfile } from '../../soul/profile';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { buildCoreResultClient } from './buildCoreResult.client';
import type { CoreIdentityContinuityV1, CoreResult, SealedCoreEnvelopeV3 } from './types';

/** Legacy persisted shape (pre m55-core-2026-04). */
export type LegacyCoreResultV1 = {
  version: 1;
  sealedInputs: { birthDate: string; nickname: string };
  sealedAt: string;
  stemLaneIndex: number;
  publicTitle: string;
  symbol: string;
  displayOneLine: string;
  summaryShort: string;
  keywords: string[];
  focusAreas: string[];
};

export function isLegacyV1(obj: unknown): obj is LegacyCoreResultV1 {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  const inputs = o.sealedInputs;
  if (!inputs || typeof inputs !== 'object') return false;
  const sealed = inputs as Record<string, unknown>;
  return (
    o.version === 1 &&
    typeof sealed.birthDate === 'string' &&
    sealed.birthDate.length > 0 &&
    typeof sealed.nickname === 'string' &&
    Number.isInteger(o.stemLaneIndex) &&
    (o.stemLaneIndex as number) >= 0 &&
    (o.stemLaneIndex as number) <= 9 &&
    typeof o.sealedAt === 'string'
  );
}

/**
 * v1 → current canonical CoreResult.
 * Legacy lane, title, and summary stay continuity evidence only.
 * `lockedAt` may keep the legacy `sealedAt`. Every other field stays canonical.
 */
export function migrateLegacyV1ToCoreResult(v1: LegacyCoreResultV1, profile: BirthProfile): CoreResult {
  const built = buildCoreResultClient(profile);
  return {
    ...built,
    lockedAt: v1.sealedAt,
  };
}

/** Public title for a stored lane. Absent or out-of-range lanes stay null — no wrapped guess. */
export function publicTitleForStoredLane(stemLaneIndex: unknown): string | null {
  if (!Number.isInteger(stemLaneIndex)) return null;
  const lane = stemLaneIndex as number;
  if (lane < 0 || lane > 9) return null;
  const title = TEN_STEM_DISPLAY[lane]?.publicTitle;
  return typeof title === 'string' && title.length > 0 ? title : null;
}

function currentPublicTitle(result: CoreResult): string {
  const title = publicTitleForStoredLane(result.stemLaneIndex);
  if (!title) {
    throw new Error('M55_CORE_CURRENT_PUBLIC_TITLE_UNAVAILABLE');
  }
  return title;
}

function factualText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Valid stored lane only. Absent, fractional, and out-of-range values stay null. */
function storedLane(value: unknown): number | null {
  if (!Number.isInteger(value)) return null;
  const lane = value as number;
  if (lane < 0 || lane > 9) return null;
  return lane;
}

function identityChanged(input: {
  previousStemLaneIndex: number | null;
  previousPublicTitle: string | null;
  previousCoreLabel: string | null;
  current: CoreResult;
  currentTitle: string;
}): boolean {
  if (input.previousStemLaneIndex !== null) {
    if (input.previousStemLaneIndex !== input.current.stemLaneIndex) return true;
    return input.previousPublicTitle !== null && input.previousPublicTitle !== input.currentTitle;
  }
  if (input.previousCoreLabel !== null && input.previousCoreLabel !== input.current.coreLabel) {
    return true;
  }
  return false;
}

function storedLegacyPublicTitle(v1: LegacyCoreResultV1): string | null {
  return factualText(v1.publicTitle);
}

/**
 * Legacy v1 has no separate coreLabel field. Capture one only when the stored
 * object actually contains that factual string.
 */
function storedLegacyCoreLabel(v1: LegacyCoreResultV1): string | null {
  return factualText((v1 as unknown as Record<string, unknown>).coreLabel);
}

type HistoricalStaleCore = {
  previousStemLaneIndex: number | null;
  previousPublicTitle: string | null;
  previousCoreLabel: string | null;
  previousEngineVersion: string | null;
};

/** Runtime view of a stale v3 coreResult, including pre-stemLaneIndex envelopes. */
function historicalStaleCore(coreResult: unknown): HistoricalStaleCore {
  if (!coreResult || typeof coreResult !== 'object') {
    return {
      previousStemLaneIndex: null,
      previousPublicTitle: null,
      previousCoreLabel: null,
      previousEngineVersion: null,
    };
  }
  const record = coreResult as Record<string, unknown>;
  const previousStemLaneIndex = storedLane(record.stemLaneIndex);
  const engine = record.engineVersion;
  return {
    previousStemLaneIndex,
    previousPublicTitle:
      previousStemLaneIndex === null ? null : publicTitleForStoredLane(previousStemLaneIndex),
    previousCoreLabel: factualText(record.coreLabel),
    previousEngineVersion: factualText(engine),
  };
}

export function buildContinuityFromLegacyV1(
  v1: LegacyCoreResultV1,
  current: CoreResult,
): CoreIdentityContinuityV1 {
  const currentTitle = currentPublicTitle(current);
  const previousPublicTitle = storedLegacyPublicTitle(v1);
  const previousCoreLabel = storedLegacyCoreLabel(v1);
  const previousStemLaneIndex = v1.stemLaneIndex;
  return {
    version: 'core_identity_continuity_v1',
    source: 'legacy_v1',
    previousStemLaneIndex,
    previousPublicTitle,
    previousCoreLabel,
    previousEngineVersion: null,
    currentStemLaneIndex: current.stemLaneIndex,
    currentPublicTitle: currentTitle,
    currentEngineVersion: current.engineVersion,
    publicIdentityChanged: identityChanged({
      previousStemLaneIndex,
      previousPublicTitle,
      previousCoreLabel,
      current,
      currentTitle,
    }),
  };
}

export function buildContinuityFromStaleV3(
  stale: { coreResult?: unknown } | unknown,
  current: CoreResult,
): CoreIdentityContinuityV1 {
  const currentTitle = currentPublicTitle(current);
  const coreResult =
    stale && typeof stale === 'object'
      ? (stale as Record<string, unknown>).coreResult
      : undefined;
  const historical = historicalStaleCore(coreResult);
  return {
    version: 'core_identity_continuity_v1',
    source: 'stale_v3',
    previousStemLaneIndex: historical.previousStemLaneIndex,
    previousPublicTitle: historical.previousPublicTitle,
    previousCoreLabel: historical.previousCoreLabel,
    previousEngineVersion: historical.previousEngineVersion,
    currentStemLaneIndex: current.stemLaneIndex,
    currentPublicTitle: currentTitle,
    currentEngineVersion: current.engineVersion,
    publicIdentityChanged: identityChanged({
      previousStemLaneIndex: historical.previousStemLaneIndex,
      previousPublicTitle: historical.previousPublicTitle,
      previousCoreLabel: historical.previousCoreLabel,
      current,
      currentTitle,
    }),
  };
}

export function wrapV3(
  profile: BirthProfile,
  coreResult: CoreResult,
  identityContinuity?: CoreIdentityContinuityV1,
): SealedCoreEnvelopeV3 {
  const envelope: SealedCoreEnvelopeV3 = {
    schemaVersion: 3,
    sealedInputs: { birthDate: profile.birthDate, nickname: profile.nickname.trim() },
    coreResult,
  };
  if (identityContinuity) envelope.identityContinuity = identityContinuity;
  return envelope;
}
