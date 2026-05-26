import type { BirthProfile } from '../../soul/profile';
import { enrichBirthProfileForSave } from '../../soul/birthProfileV2';
import {
  birthProfileToFulfillmentFields,
} from '../compositeStem/deriveLockedShelfStemPreviewCore';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
} from '../compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from '../compositeStem/pipeline';
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import type { M55CompositeCalculationMode } from '../compositeStem/types';
import type { NormalizeBirthInput } from './canonicalBoundary';

export type CoreStemAuthority = {
  stemLaneIndex: number;
  stemChar: string;
  engineVersion: typeof ENGINE_VERSION_V2;
  calculationMode: M55CompositeCalculationMode;
  publicTitle: string;
  boundarySummary: {
    effectiveLocalDate: string;
    solarTermKey: string;
    lunarDayKey: string;
    dayBoundaryRule: string;
  };
};

/** Map minimal /core intake to the same v2 profile shape as locked-shelf preview. */
export function birthProfileFromNormalizeInput(input: NormalizeBirthInput): BirthProfile {
  const hasTime = !!(input.birthTime && String(input.birthTime).trim());
  return enrichBirthProfileForSave({
    nickname: 'core',
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? null,
    birthTimeUnknown: hasTime ? false : true,
    country: input.country ?? 'JP',
    birthplace: input.birthplace ?? null,
  });
}

/**
 * v2 composite stem authority for /core public title, image, and stemLaneIndex.
 * Fail-closed when profile cannot run `runM55CompositeStemPipeline` (no legacy JDN).
 */
export function resolveCoreStemAuthority(
  profile: BirthProfile | null | undefined,
): CoreStemAuthority | null {
  if (!profile?.birthDate || !profile.nickname?.trim()) return null;

  const enriched = enrichBirthProfileForSave(profile);
  const fields = birthProfileToFulfillmentFields(enriched);
  if (!fields || !isV2FulfillmentProfileComplete(fields)) return null;

  try {
    const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const meta = composite.boundaryMetadata;
    return {
      stemLaneIndex: composite.stemLaneIndex,
      stemChar: composite.stemChar,
      engineVersion: composite.engineVersion,
      calculationMode: composite.calculationMode,
      publicTitle: composite.paid.publicTitle,
      boundarySummary: {
        effectiveLocalDate: composite.normalizedBirthContext.effectiveLocalDate,
        solarTermKey: meta.solarTermKey,
        lunarDayKey: meta.lunarDayKey,
        dayBoundaryRule: meta.dayBoundaryRule,
      },
    };
  } catch {
    return null;
  }
}

export function resolveCoreStemAuthorityFromNormalizeInput(
  input: NormalizeBirthInput,
): CoreStemAuthority | null {
  return resolveCoreStemAuthority(birthProfileFromNormalizeInput(input));
}
