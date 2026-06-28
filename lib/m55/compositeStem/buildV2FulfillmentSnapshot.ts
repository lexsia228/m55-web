import { runDtrEngine, type DtrCanonicalInput, type DtrEnvelope } from '../dtrEngine';
import { isDobPersonalizationV2FulfillmentEnabled } from '../dobPersonalizationFeatureFlag';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';
import { DOB_PERSONALIZATION_V2_CATALOG_VERSION } from '../dtrDobPersonalizationV2';
import {
  CORRECTION_VERSION,
  ENGINE_VERSION_V2,
  INPUT_VERSION_V1,
} from './constants';
import { runM55CompositeStemPipeline } from './pipeline';
import {
  assertV2ProfileOrThrow,
  resolveFulfillmentProfileFields,
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './parseFulfillmentMetadata';
import type { FulfillmentDraftRow } from './parseFulfillmentMetadata';
import { M55CompositeStemError, type CompositeStemResult } from './types';

export type EngineContextJson = {
  engineVersion: string;
  inputVersion: string;
  correctionVersion: string;
  calculationMode: string;
  stemLaneIndex: number;
  stemChar: string;
  normalizedBirthContext: CompositeStemResult['normalizedBirthContext'];
  boundaryMetadata: CompositeStemResult['boundaryMetadata'];
  staticFingerprint: string;
  displayFingerprint: string;
  paidIndividualizationVersion?: 'v1' | 'v2';
  dobPersonalizationCatalogVersion?: string;
};

export type DtrProfileSnapshotStored = {
  nickname: string;
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  country?: string;
  birthplace?: string | null;
  timezone?: string | null;
  engineVersion?: string;
  inputVersion?: string;
  correctionVersion?: string;
  calculationMode?: string;
};

export type V2FulfillmentSnapshotBuild = {
  profile_snapshot: DtrProfileSnapshotStored;
  envelope_json: DtrEnvelope;
  engine_context_json: EngineContextJson;
  engine_version: typeof ENGINE_VERSION_V2;
};

export type BuildV2FulfillmentSnapshotOptions = {
  dobPersonalizationV2Enabled?: boolean;
};

export function buildEngineContextJson(composite: CompositeStemResult): EngineContextJson {
  return {
    engineVersion: composite.engineVersion,
    inputVersion: composite.inputVersion,
    correctionVersion: composite.correctionVersion,
    calculationMode: composite.calculationMode,
    stemLaneIndex: composite.stemLaneIndex,
    stemChar: composite.stemChar,
    normalizedBirthContext: composite.normalizedBirthContext,
    boundaryMetadata: composite.boundaryMetadata,
    staticFingerprint: composite.staticFingerprint,
    displayFingerprint: composite.displayFingerprint,
  };
}

function assertEnvelopeConsistent(envelope: DtrEnvelope, composite: CompositeStemResult): void {
  if (envelope.engineVersion !== ENGINE_VERSION_V2) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'envelope_engine_version');
  }
  if (envelope.contractVersion !== 'v2') {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'envelope_contract_version');
  }
  if (envelope.auditMeta.stemLaneIndex !== composite.stemLaneIndex) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'envelope_stem_mismatch');
  }
  if (envelope.auditMeta.stemChar !== composite.stemChar) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL', 'envelope_stem_char_mismatch');
  }
}

export function buildV2FulfillmentSnapshot(
  sessionMetadata: Record<string, string> | null | undefined,
  draft: FulfillmentDraftRow | null,
  options: BuildV2FulfillmentSnapshotOptions = {},
): V2FulfillmentSnapshotBuild {
  const fields = resolveFulfillmentProfileFields(sessionMetadata, draft);
  if (!fields) {
    throw new M55CompositeStemError('M55_COMPOSITE_INCOMPLETE_PROFILE', 'missing_profile');
  }
  assertV2ProfileOrThrow(fields);

  const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));

  const dtrInput: DtrCanonicalInput = {
    birthDate: fields.birthDate,
    nickname: fields.nickname,
    locale: 'ja-JP',
    contextScope: 'dtr',
  };

  const engineContext: EngineContextJson = {
    ...buildEngineContextJson(composite),
    ...((options.dobPersonalizationV2Enabled ?? isDobPersonalizationV2FulfillmentEnabled())
      ? {
          paidIndividualizationVersion: 'v2' as const,
          dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
        }
      : {}),
  };
  const paidIndividualization = composePaidIndividualizationFromEngineContext(engineContext);

  const envelope = runDtrEngine(dtrInput, {
    stemLaneIndex: composite.stemLaneIndex,
    engineVersion: ENGINE_VERSION_V2,
    derivation: 'm55_composite_stem_v2_p_lunar',
    contractVersion: 'v2',
    paidIndividualization,
  });

  assertEnvelopeConsistent(envelope, composite);

  const profile_snapshot: DtrProfileSnapshotStored = {
    nickname: fields.nickname,
    birthDate: fields.birthDate,
    birthTime: composite.normalizedBirthContext.birthTime,
    birthTimeUnknown: fields.birthTimeUnknown,
    country: fields.country,
    birthplace: fields.birthplace,
    timezone: composite.normalizedBirthContext.timezone,
    engineVersion: ENGINE_VERSION_V2,
    inputVersion: INPUT_VERSION_V1,
    correctionVersion: CORRECTION_VERSION,
    calculationMode: composite.calculationMode,
  };

  return {
    profile_snapshot,
    envelope_json: envelope,
    engine_context_json: engineContext,
    engine_version: ENGINE_VERSION_V2,
  };
}

/** Test helper — golden fulfillment fixture without DB. */
export function buildV2FulfillmentSnapshotFromFields(
  fields: FulfillmentProfileFields,
  options: BuildV2FulfillmentSnapshotOptions = {},
): V2FulfillmentSnapshotBuild {
  assertV2ProfileOrThrow(fields);
  return buildV2FulfillmentSnapshot(
    {
      profileNickname: fields.nickname,
      profileBirthDate: fields.birthDate,
      profileBirthTime: fields.birthTime ?? '',
      profileBirthTimeUnknown: fields.birthTimeUnknown ? 'true' : 'false',
      profileCountry: fields.country,
      profileBirthplace: fields.birthplace ?? '',
      profileTimezone: fields.timezone ?? '',
    },
    null,
    options,
  );
}
