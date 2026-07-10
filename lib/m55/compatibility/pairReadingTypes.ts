/**
 * Pair reading (2人の距離の読み解き) — types only.
 * Test/support. No runtime, DB, AI, ticket, or network.
 */

export type RelationStatusId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';
export type PaidTopicId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type TemperatureId = 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
export type PairAxisId = 'A1' | 'A2' | 'A3' | 'A4';

export type ChapterId =
  | 'ch_you_pace'
  | 'ch_other_pace'
  | 'ch_pair_gap'
  | 'ch_topic_deep'
  | 'ch_today_clue'
  | 'ch_about';

export type PairDifferenceType =
  | 'pace_gap'
  | 'response_gap'
  | 'friction_gap'
  | 'entry_gap'
  | 'near_dob_shift'
  | 'same_dob_pair';

export type PairReadingPersonInput = {
  role: 'personA' | 'personB';
  birthDate: string;
  nickname?: string;
};

export type PairReadingInput = {
  schemaVersion: 'pair_reading_input_v1';
  personA: PairReadingPersonInput;
  personB: PairReadingPersonInput;
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId?: TemperatureId;
  /** When set, overrides derived pairAxis (fixture/sample lanes). */
  pairAxisOverride?: PairAxisId;
  productInternalName: 'pair_reading';
  productPublicName: '2人の距離の読み解き';
  safetyProfile: 'm55_pair_non_advisory_v1';
};

export type PairFingerprint = {
  pairFingerprintVersion: 'pair_fp_v1';
  pairAxisId: PairAxisId;
  pairDifferenceType: PairDifferenceType;
  personADobHash: string;
  personBDobHash: string;
  inputHash: string;
  pairHash: string;
  roleOrderPreserved: true;
};

export type SafetyFlags = {
  noScore: true;
  noGuarantee: true;
  noAdvice: true;
  noAdult: true;
  noRawDob: true;
  disclaimerPresent: boolean;
  containsPaidDeepening: boolean;
};

export type GenerationMeta = {
  pair_spec_version: 'pair_reading_arch_v1';
  question_flow_version: 'pair_qflow_v1';
  paid_topic_taxonomy_version: 'pair_topic_tax_v1';
  safety_profile_version: 'm55_pair_non_advisory_v1';
  renderer_version: 'pair_renderer_v1';
  pair_fingerprint_version: 'pair_fp_v1';
  input_hash: string;
  output_hash: string;
  personA_dob_hash: string;
  personB_dob_hash: string;
  pair_hash: string;
  no_raw_dob_in_output: true;
  forbidden_wording_audit: 'pass' | 'fail';
  disclaimer_presence: 'pass' | 'fail';
  free_paid_boundary_audit: 'pass' | 'fail';
  product_name_lock_ok: true;
};

export type FreeTeaserSnapshot = {
  teaserId: string;
  schemaVersion: 'pair_teaser_v1';
  pairAxisId: PairAxisId;
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId: TemperatureId;
  teaserText: string;
  ctaText: string;
  safetyShortText: string;
  noScoreFlag: true;
  noGuaranteeFlag: true;
  noRawDobFlag: true;
  containsPaidDeepening: false;
  productPublicName: '2人の距離の読み解き';
  generationMeta: GenerationMeta;
};

export type PaidChapter = {
  chapterId: ChapterId;
  chapterTitle: string;
  chapterBody: string;
  sourceKeys: {
    pairAxisId: PairAxisId;
    relationStatusId: RelationStatusId;
    paidTopicId: PaidTopicId;
    temperatureId: TemperatureId;
    pairDifferenceType: PairDifferenceType;
    fragmentIds: string[];
  };
  safetyFlags: SafetyFlags;
};

export type PaidReportSnapshot = {
  reportId: string;
  schemaVersion: 'pair_report_v1';
  productPublicName: '2人の距離の読み解き';
  productInternalName: 'pair_reading';
  safetyProfile: 'm55_pair_non_advisory_v1';
  displayNameA: string;
  displayNameB: string;
  chapters: PaidChapter[];
  sourceKeys: {
    pairAxisId: PairAxisId;
    relationStatusId: RelationStatusId;
    paidTopicId: PaidTopicId;
    temperatureId: TemperatureId;
    pairDifferenceType: PairDifferenceType;
    fragmentIds: string[];
    laneId: string;
  };
  safetyFlags: SafetyFlags;
  generationMeta: GenerationMeta;
  pairFingerprint: PairFingerprint;
};

export type PairReadingRenderResult = {
  ok: true;
  laneId: string;
  pairFingerprint: PairFingerprint;
  freeTeaser: FreeTeaserSnapshot;
  paidReport: PaidReportSnapshot;
};

export type PairReadingRenderFailure = {
  ok: false;
  code: string;
  message: string;
};

export type PairReadingRenderOutcome = PairReadingRenderResult | PairReadingRenderFailure;

export type SafetyAuditResult = {
  ok: boolean;
  hits: string[];
};
