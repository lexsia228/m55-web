/**
 * v2 composite Golden Matrix audit — measuring instrument only (no Core/UI mutation).
 */
import { essenceStemLaneIndex } from './essenceEngine';
import {
  deriveLockedShelfStemPreviewFromFields,
} from './compositeStem/deriveLockedShelfStemPreviewCore';
import {
  isV2FulfillmentProfileComplete,
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from './compositeStem/pipeline';
import { M55CompositeStemError } from './compositeStem/types';
import type { M55CompositeCalculationMode } from './compositeStem/types';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';
import { STEM_LANE_TEN_VIEWS_IMAGE } from './publicStemDisplay';
export type DivinationGoldenMatrixCertificationStatus =
  | 'CERTIFIED'
  | 'REVIEW_REQUIRED'
  | 'INVARIANT_ONLY';

export type DivinationGoldenMatrixCaseInvariants = {
  effectiveLocalDate?: string;
  stemDiffersFromNoonReference?: boolean;
  noLegacyLane?: boolean;
  boundaryPresent?: boolean;
  incompleteProfile?: boolean;
};

export type DivinationGoldenMatrixExpected = {
  stemLaneIndex?: number;
  stemChar?: string;
  publicTitle?: string;
  displayOneLine?: string;
  imagePath?: string;
  calculationMode?: M55CompositeCalculationMode;
};

export type DivinationGoldenMatrixCaseParity = {
  core_expected_title?: string | null;
  locked_shelf_expected_title?: string | null;
  dtr_snapshot_expected_title?: string | null;
  visual_parity_expected?: boolean | null;
};

export type DivinationGoldenMatrixCaseInput = {
  case_id: string;
  certification_status: DivinationGoldenMatrixCertificationStatus;
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown: boolean;
  country?: string;
  timezone?: string | null;
  birthplace?: string | null;
  nickname?: string;
  locale?: string;
  expected?: DivinationGoldenMatrixExpected;
  invariants?: DivinationGoldenMatrixCaseInvariants;
  parity?: DivinationGoldenMatrixCaseParity;
};

export type DivinationGoldenMatrixAuditRow = {
  case_id: string;
  certification_status: DivinationGoldenMatrixCertificationStatus;
  input_birthDate: string;
  birthTimeUnknown: boolean;
  birthTime: string | null;
  country: string;
  timezone: string;
  engineVersion: string | null;
  correctionVersion: string | null;
  inputVersion: string | null;
  calculationMode: string | null;
  stemLaneIndex: number | null;
  stemChar: string | null;
  publicTitle: string | null;
  displayOneLine: string | null;
  imagePath: string | null;
  effectiveLocalDate: string | null;
  solarTermKey: string | null;
  solarTermBoundaryInstant: string | null;
  lunarDayKey: string | null;
  lunarMonthKey: string | null;
  lunarYearKey: number | null;
  dayBoundaryRule: string | null;
  tzSource: string | null;
  fallback_used: boolean;
  core_expected_title: string | null;
  locked_shelf_expected_title: string | null;
  dtr_snapshot_expected_title: string | null;
  visual_parity_expected: boolean | null;
  staticFingerprint: string | null;
  displayFingerprint: string | null;
  invariant_results: Record<string, boolean>;
  certified_match: boolean | null;
  errorCode: string | null;
};

const DEFAULT_NICKNAME = 'audit-matrix';
const DEFAULT_COUNTRY = 'JP';
const DEFAULT_LOCALE = 'ja-JP';

function emptyRow(
  input: DivinationGoldenMatrixCaseInput,
  fields: FulfillmentProfileFields,
): DivinationGoldenMatrixAuditRow {
  return {
    case_id: input.case_id,
    certification_status: input.certification_status,
    input_birthDate: input.birthDate,
    birthTimeUnknown: input.birthTimeUnknown,
    birthTime: fields.birthTime,
    country: fields.country,
    timezone: fields.timezone ?? '',
    engineVersion: null,
    correctionVersion: null,
    inputVersion: null,
    calculationMode: null,
    stemLaneIndex: null,
    stemChar: null,
    publicTitle: null,
    displayOneLine: null,
    imagePath: null,
    effectiveLocalDate: null,
    solarTermKey: null,
    solarTermBoundaryInstant: null,
    lunarDayKey: null,
    lunarMonthKey: null,
    lunarYearKey: null,
    dayBoundaryRule: null,
    tzSource: null,
    fallback_used: false,
    core_expected_title: input.parity?.core_expected_title ?? null,
    locked_shelf_expected_title: input.parity?.locked_shelf_expected_title ?? null,
    dtr_snapshot_expected_title: input.parity?.dtr_snapshot_expected_title ?? null,
    visual_parity_expected: input.parity?.visual_parity_expected ?? null,
    staticFingerprint: null,
    displayFingerprint: null,
    invariant_results: {},
    certified_match: null,
    errorCode: null,
  };
}

function caseToFulfillmentFields(input: DivinationGoldenMatrixCaseInput): FulfillmentProfileFields {
  return {
    nickname: input.nickname?.trim() || DEFAULT_NICKNAME,
    birthDate: input.birthDate,
    birthTime: input.birthTime?.trim() || null,
    birthTimeUnknown: input.birthTimeUnknown,
    country: input.country?.trim() || DEFAULT_COUNTRY,
    birthplace: input.birthplace ?? null,
    timezone: input.timezone ?? null,
  };
}

function resolvePublicFromLane(stemLaneIndex: number): {
  publicTitle: string;
  displayOneLine: string;
  imagePath: string;
} {
  const stem = TEN_STEM_DISPLAY[stemLaneIndex];
  const imagePath =
    STEM_LANE_TEN_VIEWS_IMAGE[stemLaneIndex] ?? '/ten-views/analyst.webp';
  return {
    publicTitle: stem?.publicTitle ?? '',
    displayOneLine: stem?.displayOneLine ?? '',
    imagePath,
  };
}

function fallbackUsed(
  calculationMode: M55CompositeCalculationMode | null,
  tzSource: string | null,
): boolean {
  if (!calculationMode) return false;
  return calculationMode !== 'full' || tzSource === 'fallback_utc';
}

function evaluateCertifiedMatch(
  row: Pick<
    DivinationGoldenMatrixAuditRow,
  | 'stemLaneIndex'
  | 'stemChar'
  | 'publicTitle'
  | 'displayOneLine'
  | 'imagePath'
  | 'calculationMode'
  >,
  expected: DivinationGoldenMatrixExpected,
): boolean {
  if (expected.stemLaneIndex !== undefined && row.stemLaneIndex !== expected.stemLaneIndex) {
    return false;
  }
  if (expected.stemChar !== undefined && row.stemChar !== expected.stemChar) return false;
  if (expected.publicTitle !== undefined && row.publicTitle !== expected.publicTitle) return false;
  if (expected.displayOneLine !== undefined && row.displayOneLine !== expected.displayOneLine) {
    return false;
  }
  if (expected.imagePath !== undefined && row.imagePath !== expected.imagePath) return false;
  if (
    expected.calculationMode !== undefined &&
    row.calculationMode !== expected.calculationMode
  ) {
    return false;
  }
  return true;
}

function evaluateInvariants(
  input: DivinationGoldenMatrixCaseInput,
  row: DivinationGoldenMatrixAuditRow,
  fields: FulfillmentProfileFields,
): Record<string, boolean> {
  const inv = input.invariants ?? {};
  const results: Record<string, boolean> = {};

  if (inv.incompleteProfile) {
    const preview = deriveLockedShelfStemPreviewFromFields(fields);
    const complete = isV2FulfillmentProfileComplete(fields);
    results.incomplete_profile_blocks_pipeline = !complete;
    results.locked_shelf_preview_null = preview === null;
    return results;
  }

  if (inv.boundaryPresent) {
    results.solarTermKey_present = !!row.solarTermKey;
    results.solarTermBoundaryInstant_present = !!row.solarTermBoundaryInstant;
    results.lunarDayKey_present = !!row.lunarDayKey;
    results.lunarMonthKey_present = !!row.lunarMonthKey;
    results.lunarYearKey_present = row.lunarYearKey != null;
    results.dayBoundaryRule_present = !!row.dayBoundaryRule;
    return results;
  }

  if (inv.noLegacyLane) {
    const legacyLane = essenceStemLaneIndex(input.birthDate);
    results.v2_lane_differs_from_legacy_jdn =
      row.stemLaneIndex != null && row.stemLaneIndex !== legacyLane;
    return results;
  }

  if (inv.effectiveLocalDate !== undefined) {
    results.effectiveLocalDate_matches =
      row.effectiveLocalDate === inv.effectiveLocalDate;
  }

  if (inv.stemDiffersFromNoonReference) {
    const noonFields: FulfillmentProfileFields = {
      ...fields,
      birthTime: '12:00',
      birthTimeUnknown: false,
    };
    let noonLane: number | null = null;
    try {
      const noonResult = runM55CompositeStemPipeline(toCompositeCanonicalInput(noonFields));
      noonLane = noonResult.stemLaneIndex;
    } catch {
      noonLane = null;
    }
    results.stem_differs_from_noon_reference =
      row.stemLaneIndex != null && noonLane != null && row.stemLaneIndex !== noonLane;
  }

  return results;
}

/** Run one matrix case — pure, no DB/network/env. */
export function runDivinationGoldenMatrixCase(
  input: DivinationGoldenMatrixCaseInput,
): DivinationGoldenMatrixAuditRow {
  const fields = caseToFulfillmentFields(input);
  const row = emptyRow(input, fields);

  if (input.invariants?.incompleteProfile) {
    row.invariant_results = evaluateInvariants(input, row, fields);
    row.certified_match = null;
    return row;
  }

  if (!isV2FulfillmentProfileComplete(fields)) {
    row.errorCode = 'M55_COMPOSITE_INCOMPLETE_PROFILE';
    row.certified_match =
      input.certification_status === 'CERTIFIED' ? false : null;
    return row;
  }

  try {
    const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const display = resolvePublicFromLane(composite.stemLaneIndex);
    const bm = composite.boundaryMetadata;
    const ctx = composite.normalizedBirthContext;

    row.engineVersion = composite.engineVersion;
    row.correctionVersion = composite.correctionVersion;
    row.inputVersion = composite.inputVersion;
    row.calculationMode = composite.calculationMode;
    row.stemLaneIndex = composite.stemLaneIndex;
    row.stemChar = composite.stemChar;
    row.publicTitle = display.publicTitle;
    row.displayOneLine = display.displayOneLine;
    row.imagePath = display.imagePath;
    row.effectiveLocalDate = ctx.effectiveLocalDate;
    row.birthTime = ctx.birthTime;
    row.timezone = ctx.timezone;
    row.solarTermKey = bm.solarTermKey;
    row.solarTermBoundaryInstant = bm.solarTermBoundaryInstant;
    row.lunarDayKey = bm.lunarDayKey;
    row.lunarMonthKey = bm.lunarMonthKey;
    row.lunarYearKey = bm.lunarYearKey;
    row.dayBoundaryRule = bm.dayBoundaryRule;
    row.tzSource = bm.tzSource;
    row.fallback_used = fallbackUsed(composite.calculationMode, bm.tzSource);
    row.staticFingerprint = composite.staticFingerprint;
    row.displayFingerprint = composite.displayFingerprint;
  } catch (err) {
    row.errorCode =
      err instanceof M55CompositeStemError
        ? err.code
        : err instanceof Error
          ? err.message
          : 'UNKNOWN_ERROR';
    row.certified_match =
      input.certification_status === 'CERTIFIED' ? false : null;
    return row;
  }

  if (input.certification_status === 'CERTIFIED' && input.expected) {
    row.certified_match = evaluateCertifiedMatch(row, input.expected);
  } else if (input.certification_status === 'REVIEW_REQUIRED') {
    row.certified_match = null;
  } else {
    row.certified_match = null;
  }

  if (input.invariants && Object.keys(input.invariants).length > 0) {
    row.invariant_results = evaluateInvariants(input, row, fields);
  }

  return row;
}

export function runDivinationGoldenMatrixAll(
  cases: DivinationGoldenMatrixCaseInput[],
): DivinationGoldenMatrixAuditRow[] {
  return cases.map(runDivinationGoldenMatrixCase);
}

/** Forbidden secret-bearing keys — audit rows must not include these. */
export const FORBIDDEN_AUDIT_ROW_KEYS = [
  'user_id',
  'userId',
  'email',
  'session',
  'stripe',
  'stripeId',
  'stripe_customer',
  'secret',
  'password',
  'token',
] as const;

export function auditRowContainsForbiddenKeys(row: DivinationGoldenMatrixAuditRow): string[] {
  const raw = JSON.stringify(row).toLowerCase();
  return FORBIDDEN_AUDIT_ROW_KEYS.filter((k) => raw.includes(k.toLowerCase()));
}
