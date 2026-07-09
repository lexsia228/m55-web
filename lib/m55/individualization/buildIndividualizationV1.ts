/**
 * Compose fp-v1 fingerprint + draft_snapshot.individualization object.
 * Pure — no DB/UI/route side effects. Does not mutate inputs.
 */

import {
  buildAlignDivergeItemsV1,
  pickFreeAlignDivergeItemV1,
} from './alignDivergeV1';
import { buildDobAxisLookupV1 } from './dobAxisLookupV1';
import { buildFreeExpressionV1, hashFreeAnswerSet } from './freeExpressionV1';
import { buildIndividualizationOutputHashV1 } from './outputHashV1';
import { buildPaidDepthV1, hashPaidAnswerSet } from './paidDepthV1';
import { buildReplyAffinityV1 } from './replyAffinityV1';
import {
  buildHesitationV1,
  buildIntensityV1,
  buildReactiveContextV1,
} from './signalsV1';
import type {
  IndividualizationDraft,
  IndividualizationFingerprint,
  Result,
} from './types';
import {
  DOB_AXIS_LOOKUP_VERSION,
  FINGERPRINT_SPEC_VERSION,
  FREE_QUESTIONNAIRE_VERSION,
  GENERATION_META_FIELD_NAMING_VERSION,
  PAID_QUESTIONNAIRE_VERSION,
  PRIMARY_THEME_REPLY_MAP_VERSION,
  REPLY_QUESTION_CATALOG_VERSION,
} from './versions';

export type BuildFingerprintInput = {
  birthDate: string;
  stemLaneIndex: number;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet?: Record<string, string> | null;
};

export type BuildFingerprintOk = {
  fingerprint: IndividualizationFingerprint;
  freeAnswerHash: string;
  paidAnswerHash: string;
  internalSelectors: {
    dayBand: 'early' | 'mid' | 'late';
    monthBand: number;
    stemLaneIndex: number;
  };
  freePick: ReturnType<typeof pickFreeAlignDivergeItemV1>;
};

function cloneAnswerSet(set: Record<string, string>): Record<string, string> {
  return { ...set };
}

export function buildIndividualizationFingerprintV1(
  input: BuildFingerprintInput,
): Result<BuildFingerprintOk> {
  const freeAnswerSet = cloneAnswerSet(input.freeAnswerSet);
  const paidAnswerSet =
    input.paidAnswerSet == null ? null : cloneAnswerSet(input.paidAnswerSet);

  const dob = buildDobAxisLookupV1({
    birthDate: input.birthDate,
    stemLaneIndex: input.stemLaneIndex,
  });
  if (!dob.ok) return dob;

  const free = buildFreeExpressionV1({ freeAnswerSet });
  if (!free.ok) return free;

  const alignDiv = buildAlignDivergeItemsV1({
    dobAxes: dob.value.dobBase.axes,
    freeAxes: free.value.axes,
    freeAnswerSet,
  });
  if (!alignDiv.ok) return alignDiv;

  const paid = buildPaidDepthV1({ paidAnswerSet });
  if (!paid.ok) return paid;

  const intensity = buildIntensityV1({ paidDepth: paid.value });
  const hesitation = buildHesitationV1({ freeAnswerSet, paidAnswerSet });
  const reactiveContext = buildReactiveContextV1({ freeAnswerSet, paidAnswerSet });
  const replyAffinity = buildReplyAffinityV1({
    freeExpression: free.value,
    paidDepth: paid.value,
    paidAnswerSet,
    divergeItems: alignDiv.value.divergeItems,
    hesitation,
  });

  const freePick = pickFreeAlignDivergeItemV1(alignDiv.value);

  const fingerprint: IndividualizationFingerprint = {
    fingerprintSpecVersion: FINGERPRINT_SPEC_VERSION,
    dobAxisLookupVersion: DOB_AXIS_LOOKUP_VERSION,
    primaryThemeReplyMapVersion: PRIMARY_THEME_REPLY_MAP_VERSION,
    dobBase: dob.value.dobBase,
    freeExpression: free.value,
    paidDepth: paid.value,
    alignItems: alignDiv.value.alignItems,
    divergeItems: alignDiv.value.divergeItems,
    intensity,
    hesitation,
    reactiveContext,
    replyAffinity,
  };

  return {
    ok: true,
    value: {
      fingerprint,
      freeAnswerHash: hashFreeAnswerSet(freeAnswerSet),
      paidAnswerHash: paidAnswerSet ? hashPaidAnswerSet(paidAnswerSet) : '',
      internalSelectors: dob.value.internalSelectors,
      freePick,
    },
  };
}

export type BuildDraftInput = BuildFingerprintInput & {
  confirmationAcceptedAt?: string | null;
  templateBlockIds?: readonly string[];
  engineVersion: string;
  catalogVersion: string;
  reportLogicVersion: string;
  generatedAt: string;
  includeInternalSelectors?: boolean;
};

export function buildIndividualizationDraftSnapshotV1(
  input: BuildDraftInput,
): Result<IndividualizationDraft> {
  const built = buildIndividualizationFingerprintV1(input);
  if (!built.ok) return built;

  const {
    fingerprint,
    freeAnswerHash,
    paidAnswerHash,
    internalSelectors,
  } = built.value;

  const templateBlockIds = [...(input.templateBlockIds ?? [])].map(String);
  const outputHash = buildIndividualizationOutputHashV1({
    dobFp: fingerprint.dobBase.dobFp,
    freeAnswerHash,
    paidAnswerHash,
    templateBlockIds,
    engineVersion: input.engineVersion,
    catalogVersion: input.catalogVersion,
    reportLogicVersion: input.reportLogicVersion,
  });

  const paidPresent = input.paidAnswerSet != null;

  const draft: IndividualizationDraft = {
    questionnaire: {
      freeVersion: FREE_QUESTIONNAIRE_VERSION,
      paidVersion: paidPresent ? PAID_QUESTIONNAIRE_VERSION : null,
      freeAnswerSet: cloneAnswerSet(input.freeAnswerSet),
      paidAnswerSet: paidPresent ? cloneAnswerSet(input.paidAnswerSet!) : null,
      freeAnswerHash,
      paidAnswerHash: paidPresent ? paidAnswerHash : null,
      primaryThemeAnswerId: fingerprint.freeExpression.primaryThemeAnswerId,
      confirmationAcceptedAt: input.confirmationAcceptedAt ?? null,
    },
    fingerprint,
    audit: {
      outputHash,
      templateBlockIds: [...templateBlockIds].sort(),
      engineVersion: input.engineVersion,
      catalogVersion: input.catalogVersion,
      reportLogicVersion: input.reportLogicVersion,
      generatedAt: input.generatedAt,
      sourceVersions: {
        fingerprintSpecVersion: FINGERPRINT_SPEC_VERSION,
        dobAxisLookupVersion: DOB_AXIS_LOOKUP_VERSION,
        primaryThemeReplyMapVersion: PRIMARY_THEME_REPLY_MAP_VERSION,
        freeQuestionnaireVersion: FREE_QUESTIONNAIRE_VERSION,
        paidQuestionnaireVersion: paidPresent ? PAID_QUESTIONNAIRE_VERSION : null,
        replyQuestionCatalogVersion: REPLY_QUESTION_CATALOG_VERSION,
        fieldNamingVersion: GENERATION_META_FIELD_NAMING_VERSION,
      },
    },
  };

  if (input.includeInternalSelectors) {
    draft.internalSelectors = { ...internalSelectors };
  }

  return { ok: true, value: draft };
}
