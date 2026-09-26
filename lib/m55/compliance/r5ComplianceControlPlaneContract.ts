export const M55_R5_COMPLIANCE_MIGRATION_FILENAME =
  '20260924000000_m55_r5_compliance_control_plane_v1.sql' as const;

export const M55_R5_COMPLIANCE_CONTENT_RULE_VERSION =
  'm55.r5.compliance.content_scan.v1' as const;

export const M55_R5_COMPLIANCE_FRAUD_RULE_VERSION =
  'm55.r5.compliance.fraud_graph.v1' as const;

export const M55_R5_COMPLIANCE_DISPOSITIONS = [
  'AUTO_PASS',
  'AUTO_CANCEL_OBJECTIVE',
  'AUTO_HOLD',
  'HUMAN_EXCEPTION',
] as const;

export type R5ComplianceDisposition = (typeof M55_R5_COMPLIANCE_DISPOSITIONS)[number];

export const M55_R5_COMPLIANCE_ADVERSE_DECISION_FIELDS = [
  'reason_code',
  'rule_version',
  'evidence_reference',
  'decision_timestamp',
  'reviewer_type',
  'appeal_status',
] as const;

export const M55_R5_COMPLIANCE_CASE_KINDS = ['APPEAL', 'DISCREPANCY', 'MACHINE_EXCEPTION'] as const;
export type R5ComplianceCaseKind = (typeof M55_R5_COMPLIANCE_CASE_KINDS)[number];

export const M55_R5_COMPLIANCE_HEURISTIC_RISK_SIGNALS = [
  'SAME_IP',
  'SAME_DEVICE',
  'SAME_ADDRESS',
  'SAME_SURNAME',
  'HIGH_VELOCITY',
  'ACCOUNT_CREATION_BURST',
  'DEVICE_CLUSTER',
  'PAYMENT_CLUSTER',
  'UNUSUAL_GEOGRAPHIC_PATTERN',
] as const;

export type R5HeuristicRiskSignal = (typeof M55_R5_COMPLIANCE_HEURISTIC_RISK_SIGNALS)[number];

export const M55_R5_COMPLIANCE_OBJECTIVE_REASON_CODES = [
  'CONFIRMED_SELF_REFERRAL',
  'CONFIRMED_CIRCULAR_ABUSE',
  'DUPLICATE_ATTRIBUTION',
  'NONEXISTENT_OR_FAILED_PAYMENT',
] as const;

export type R5ObjectiveReasonCode = (typeof M55_R5_COMPLIANCE_OBJECTIVE_REASON_CODES)[number];

export const M55_R5_COMPLIANCE_APPEALABLE_DISPOSITIONS = ['AUTO_CANCEL_OBJECTIVE', 'AUTO_HOLD'] as const;

export const M55_R5_COMPLIANCE_APPEALABLE_HUMAN_REASON_CODES = [
  'KEEP_HOLD',
  'REQUEST_CORRECTION',
  'PAUSE_CREATOR',
  'TERMINATE_PARTNERSHIP',
] as const;

export const M55_R5_COMPLIANCE_NON_APPEALABLE_HUMAN_REASON_CODE = 'RELEASE' as const;

export const M55_R5_COMPLIANCE_CASE_DECISIONS = [
  'KEEP_HOLD',
  'REQUEST_CORRECTION',
  'RELEASE',
  'PAUSE_CREATOR',
  'TERMINATE_PARTNERSHIP',
  'AUTO_RELEASE',
  'SUPERSEDED_BY_NEW_MACHINE_DECISION',
  'SUPERSEDED_BY_OBJECTIVE_DECISION',
] as const;

export const M55_R5_COMPLIANCE_MAX_TEXT_CHARS = 8000;

export const M55_R5_COMPLIANCE_CREATOR_SUPPLEMENTAL_PROHIBITED_CLAIM_MARKERS = [
  '必ず稼げ',
  '保証された収入',
  '楽して稼',
  '副収入を保証',
] as const;

const DISCLOSURE_BOUND = String.raw`[\s\u3000#＃【】\[\]（）()|｜:：・,，.。!！?？/／\\「」『』]`;
const JP_DISCLOSURE_TOKEN = new RegExp(
  `(?:^|${DISCLOSURE_BOUND})(?:広告|アフィリエイト)(?:$|${DISCLOSURE_BOUND})`,
);
const PR_TOKEN = /(?<![A-Za-z0-9])PR(?![A-Za-z0-9])/;
const AD_HASHTAG = /(?<![A-Za-z0-9])#ad(?![A-Za-z0-9])/i;
const PR_HASHTAG = /(?<![A-Za-z0-9])#PR(?![A-Za-z0-9])/i;

const OPAQUE_REF_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]{64}$/i;

export type ContentObservationKind = 'PRESENT' | 'REMOVED';
export type DisclosureState = 'PRESENT' | 'MISSING' | 'UNKNOWN';
export type ClaimScanState = 'CLEAN' | 'PROHIBITED_MATCH' | 'UNKNOWN';

export const M55_R5_COMPLIANCE_CONTENT_PROVENANCE = 'CREATOR_SUPPLEMENTAL_UNTRUSTED' as const;

export type ContentScanResult = {
  ruleVersion: typeof M55_R5_COMPLIANCE_CONTENT_RULE_VERSION;
  disclosureState: DisclosureState;
  claimScanState: ClaimScanState;
  disposition: 'AUTO_HOLD';
  reasonCode: string;
};

export function matchesProhibitedClaimV1(text: string, canonicalClaims: readonly string[]): boolean {
  if (canonicalClaims.some((marker) => text.includes(marker))) return true;
  return M55_R5_COMPLIANCE_CREATOR_SUPPLEMENTAL_PROHIBITED_CLAIM_MARKERS.some((marker) =>
    text.includes(marker),
  );
}

export function hasAffiliateDisclosureV1(text: string): boolean {
  if (text.includes('アフィリエイトリンクを含みます')) return true;
  if (JP_DISCLOSURE_TOKEN.test(text)) return true;
  if (PR_HASHTAG.test(text) || AD_HASHTAG.test(text)) return true;
  return PR_TOKEN.test(text);
}

export function assertOpaqueGraphRef(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('user_') || !OPAQUE_REF_RE.test(trimmed)) {
    throw new Error('OPAQUE_GRAPH_REF_REQUIRED');
  }
  return trimmed.toLowerCase();
}

export function scanContentComplianceV1(
  input: {
    observationKind: ContentObservationKind;
    bodyText: string | null;
  },
  canonicalClaims: readonly string[],
): ContentScanResult {
  if (input.bodyText != null && input.bodyText.length > M55_R5_COMPLIANCE_MAX_TEXT_CHARS) {
    throw new Error('CONTENT_TEXT_TOO_LARGE');
  }
  if (input.observationKind === 'REMOVED') {
    return {
      ruleVersion: M55_R5_COMPLIANCE_CONTENT_RULE_VERSION,
      disclosureState: 'UNKNOWN',
      claimScanState: 'UNKNOWN',
      disposition: 'AUTO_HOLD',
      reasonCode: 'CONTENT_REMOVAL_OBSERVED',
    };
  }
  const text = input.bodyText ?? '';
  if (!text.trim()) {
    return {
      ruleVersion: M55_R5_COMPLIANCE_CONTENT_RULE_VERSION,
      disclosureState: 'UNKNOWN',
      claimScanState: 'UNKNOWN',
      disposition: 'AUTO_HOLD',
      reasonCode: 'CONTENT_SCAN_UNKNOWN',
    };
  }
  const disclosureState: DisclosureState = hasAffiliateDisclosureV1(text) ? 'PRESENT' : 'MISSING';
  const claimScanState: ClaimScanState = matchesProhibitedClaimV1(text, canonicalClaims)
    ? 'PROHIBITED_MATCH'
    : 'CLEAN';
  if (disclosureState === 'MISSING') {
    return {
      ruleVersion: M55_R5_COMPLIANCE_CONTENT_RULE_VERSION,
      disclosureState,
      claimScanState,
      disposition: 'AUTO_HOLD',
      reasonCode: 'DISCLOSURE_MISSING',
    };
  }
  if (claimScanState === 'PROHIBITED_MATCH') {
    return {
      ruleVersion: M55_R5_COMPLIANCE_CONTENT_RULE_VERSION,
      disclosureState,
      claimScanState,
      disposition: 'AUTO_HOLD',
      reasonCode: 'PROHIBITED_CLAIM_MATCH',
    };
  }
  return {
    ruleVersion: M55_R5_COMPLIANCE_CONTENT_RULE_VERSION,
    disclosureState,
    claimScanState,
    disposition: 'AUTO_HOLD',
    reasonCode: 'TRUSTED_OBSERVATION_REQUIRED',
  };
}

export function evaluateFraudDispositionV1(input: {
  derivedObjectiveReason: R5ObjectiveReasonCode | null;
  persistedHeuristicSignalClasses: readonly R5HeuristicRiskSignal[];
  decisionRequired: boolean;
}): {
  disposition: 'AUTO_CANCEL_OBJECTIVE' | 'AUTO_HOLD' | null;
  reasonCode: string;
  forfeiture: boolean;
} {
  if (input.derivedObjectiveReason === 'NONEXISTENT_OR_FAILED_PAYMENT') {
    return {
      disposition: 'AUTO_CANCEL_OBJECTIVE',
      reasonCode: 'NONEXISTENT_OR_FAILED_PAYMENT',
      forfeiture: true,
    };
  }
  const distinct = [...new Set(input.persistedHeuristicSignalClasses)];
  if (distinct.length >= 2) {
    return {
      disposition: 'AUTO_HOLD',
      reasonCode: 'MULTIPLE_HEURISTIC_RISK_SIGNALS',
      forfeiture: false,
    };
  }
  if (input.decisionRequired) {
    return {
      disposition: 'AUTO_HOLD',
      reasonCode: distinct.length === 1 ? 'SINGLE_HEURISTIC_SIGNAL_UNRESOLVED' : 'EVIDENCE_INCOMPLETE',
      forfeiture: false,
    };
  }
  return { disposition: null, reasonCode: 'NO_DISPOSITION', forfeiture: false };
}
