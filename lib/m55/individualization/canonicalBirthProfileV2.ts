/**
 * CanonicalBirthProfileV2 — one civil DOB → one product stem + existing paid/civil dimensions.
 * Stem authority is m55-composite-stem-v2 (same path as Core / DTR fulfillment).
 * essenceStemLaneIndex (JDN offset) is not product stem.
 */
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import { birthProfileToFulfillmentFields } from '../compositeStem/fulfillmentProfileFields';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
} from '../compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipelineClient } from '../compositeStem/pipeline.client';
import {
  birthProfileFromNormalizeInput,
  resolveCoreStemAuthority,
} from '../coreResult/resolveCoreStemAuthority';
import {
  civilDayBandFromEffectiveDate,
  seasonGroupForSolarTerm,
  type CivilDayBand,
  type SeasonGroup,
} from '../paidDobCivilRhythm';
import {
  buildBirthSignatureV1,
  resolveCivilBirthDimensions,
  type BirthSignatureV1,
  type CivilBirthDimensionsV1,
} from './birthSignatureV1';
import type { ExpressionAxisId, Result } from './types';

export const CANONICAL_BIRTH_PROFILE_VERSION = 'canonical_birth_profile_v2' as const;
export const CANONICAL_STEM_SOURCE = ENGINE_VERSION_V2;

export type CanonicalBirthProfileV2 = {
  readonly version: typeof CANONICAL_BIRTH_PROFILE_VERSION;
  readonly sourceVersion: typeof ENGINE_VERSION_V2;
  readonly birthDate: string;
  readonly effectiveLocalDate: string;
  readonly stemLane: number;
  readonly stemChar: string;
  readonly dayBand: CivilDayBand;
  readonly season3: 0 | 1 | 2;
  readonly seasonGroup: SeasonGroup;
  readonly lunarMonth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  readonly lunarMonthKey: string;
  readonly solarTermKey: string;
  readonly civil: CivilBirthDimensionsV1;
  readonly birthSignature: BirthSignatureV1;
  readonly tensionIds: readonly ExpressionAxisId[];
  readonly stableFingerprint: string;
};

function djb2(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

export function lunarMonthFromKey(
  lunarMonthKey: string,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  const token = lunarMonthKey.split('-').pop() ?? '1';
  const parsed = Number.parseInt(token, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return 1;
  return parsed as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

export function resolveCanonicalBirthProfileV2(input: {
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  country?: string;
}): Result<CanonicalBirthProfileV2> {
  const hasTime =
    !!(input.birthTime && String(input.birthTime).trim()) && input.birthTimeUnknown !== true;
  const profile = birthProfileFromNormalizeInput({
    birthDate: input.birthDate,
    birthTime: hasTime ? input.birthTime : undefined,
    country: input.country ?? 'JP',
  });
  const fields = birthProfileToFulfillmentFields(profile);
  if (!fields || !isV2FulfillmentProfileComplete(fields)) {
    return { ok: false, code: 'missing_stem' };
  }

  let composite;
  try {
    composite = runM55CompositeStemPipelineClient(toCompositeCanonicalInput(fields));
  } catch {
    return { ok: false, code: 'missing_stem' };
  }

  const coreAuthority = resolveCoreStemAuthority(profile);
  if (!coreAuthority || coreAuthority.stemLaneIndex !== composite.stemLaneIndex) {
    return { ok: false, code: 'missing_stem' };
  }

  const effectiveLocalDate = composite.normalizedBirthContext.effectiveLocalDate;
  const civil = resolveCivilBirthDimensions(effectiveLocalDate);
  if (!civil.ok) return civil;

  const signature = buildBirthSignatureV1({
    birthDate: effectiveLocalDate,
    stemLaneIndex: composite.stemLaneIndex,
  });
  if (!signature.ok) return signature;

  const lunarMonthKey = composite.boundaryMetadata.lunarMonthKey;
  const lunarMonth = lunarMonthFromKey(lunarMonthKey);
  const dayBand = civilDayBandFromEffectiveDate(effectiveLocalDate);
  const seasonGroup = seasonGroupForSolarTerm(composite.boundaryMetadata.solarTermKey);
  const fingerprint = djb2(
    [
      CANONICAL_BIRTH_PROFILE_VERSION,
      CANONICAL_STEM_SOURCE,
      composite.stemLaneIndex,
      dayBand,
      civil.value.season3,
      seasonGroup,
      lunarMonth,
      signature.value.birthSignatureId,
      signature.value.tensions.join(','),
      effectiveLocalDate,
      composite.boundaryMetadata.solarTermKey,
      lunarMonthKey,
    ].join('|'),
  );

  return {
    ok: true,
    value: {
      version: CANONICAL_BIRTH_PROFILE_VERSION,
      sourceVersion: ENGINE_VERSION_V2,
      birthDate: input.birthDate,
      effectiveLocalDate,
      stemLane: composite.stemLaneIndex,
      stemChar: composite.stemChar,
      dayBand,
      season3: civil.value.season3,
      seasonGroup,
      lunarMonth,
      lunarMonthKey,
      solarTermKey: composite.boundaryMetadata.solarTermKey,
      civil: civil.value,
      birthSignature: signature.value,
      tensionIds: signature.value.tensions,
      stableFingerprint: fingerprint,
    },
  };
}

export function canonicalStemLaneForDate(birthDate: string): Result<number> {
  const profile = resolveCanonicalBirthProfileV2({ birthDate });
  if (!profile.ok) return profile;
  return { ok: true, value: profile.value.stemLane };
}
