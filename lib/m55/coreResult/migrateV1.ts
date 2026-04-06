import type { BirthProfile } from '../../soul/profile';
import { buildAxisDetails } from './axisMeta';
import type { CoreResult, SealedCoreEnvelopeV3 } from './types';
import { buildCoreResult } from './buildCoreResult';

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
  return (
    o.version === 1 &&
    typeof o.stemLaneIndex === 'number' &&
    o.sealedInputs !== null &&
    typeof o.sealedInputs === 'object'
  );
}

/**
 * v1 → v3 移行:
 * - 内部は TYPE_01–10（`coreType`）と新スコア・カタログ本文に正規化する。
 * - **ユーザーに見せていた表示名は固定**: `coreLabel` / `coreSummary` は v1 のまま。
 * - 軸説明の要約文は `coreLabel` を指すため、`axisDetails` だけ表示名で再生成する。
 * 新規ユーザーは `buildCoreResult` のみ（TYPE 正式ラベル）。
 */
export function migrateLegacyV1ToCoreResult(v1: LegacyCoreResultV1, profile: BirthProfile): CoreResult {
  const built = buildCoreResult(profile);
  const displayLabel = v1.publicTitle?.trim() || built.coreLabel;
  const displaySummary = v1.summaryShort?.trim() || built.coreSummary;

  return {
    ...built,
    coreLabel: displayLabel,
    coreSummary: displaySummary,
    axisDetails: buildAxisDetails(displayLabel, built.coreAxisScores),
    lockedAt: v1.sealedAt,
  };
}

export function wrapV3(profile: BirthProfile, coreResult: CoreResult): SealedCoreEnvelopeV3 {
  return {
    schemaVersion: 3,
    sealedInputs: { birthDate: profile.birthDate, nickname: profile.nickname.trim() },
    coreResult,
  };
}
