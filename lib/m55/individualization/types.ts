/**
 * fp-v1 / gmfn-v1 individualization types (camelCase JSON contract).
 * Pure types only — no I/O, no UI, no DB.
 */

import type { IndividualizationSelectorBundleV1 } from './individualizationSelectorTypesV1';
import type {
  GENERATION_META_FIELD_NAMING_VERSION,
  GENERATION_META_FIELD_NAMING_VERSION_V2,
  INDIVIDUALIZATION_SELECTOR_VERSION_V1,
} from './versions';

export type DayBand = 'early' | 'mid' | 'late';

export type StartTendency = 'map' | 'try' | 'ask';
export type DecisionTendency = 'sort' | 'deadline' | 'wait';
export type RecoveryTendency = 'pause' | 'shrink' | 'scene';
export type DistanceTendency = 'close' | 'middle' | 'solo';
export type ChangeTendency = 'observe' | 'adjust' | 'rebuild';

export type ExpressionAxisId =
  | 'start'
  | 'decision'
  | 'recovery'
  | 'distance'
  | 'change';

export type ExpressionAxes = {
  start: StartTendency;
  decision: DecisionTendency;
  recovery: RecoveryTendency;
  distance: DistanceTendency;
  change: ChangeTendency;
};

export type ReplyThemeId =
  | 'work'
  | 'relation'
  | 'fatigue'
  | 'tendency'
  | 'report';

export type ChapterHintId = 'I' | 'II' | 'III' | 'IV';

export type IntensityLevel = 'low' | 'mid' | 'high';

export type AlignDivergeRelation = 'align' | 'diverge';

export type UiSlot = 'freeOne' | 'paidBlock' | 'internal';

export type FailCode =
  | 'invalid_dob'
  | 'missing_stem'
  | 'missing_free_answers'
  | 'unknown_answer_id'
  | 'missing_paid_answers'
  | 'unknown_selector_version'
  | 'unknown_selector_id'
  | 'duplicate_selector_id'
  | 'selector_count_overflow'
  | 'contradictory_selector_state'
  | 'invalid_selector_bundle'
  | 'selector_version_mismatch'
  | 'selector_resolution_failed';

export type OkResult<T> = { ok: true; value: T };
export type ErrResult = { ok: false; code: FailCode };
export type Result<T> = OkResult<T> | ErrResult;

export type DobBase = {
  dobFp: string;
  axes: ExpressionAxes;
};

export type InternalSelectors = {
  dayBand: DayBand;
  monthBand: number;
  stemLaneIndex: number;
};

export type FreeExpression = {
  axes: ExpressionAxes;
  primaryThemeAnswerId: string | null;
  primaryReplyTheme: ReplyThemeId | null;
  secondaryReplyTheme: ReplyThemeId | null;
  freeExpressionHash: string;
};

export type ChapterBias = Record<ChapterHintId, number>;

export type PaidDepth = {
  chapterBias: ChapterBias;
  recoverySequence: string | null;
  restartCondition: string | null;
  /** @deprecated legacy snapshot field — preserved for immutable purchased output */
  readingStyle?: string | null;
  /** @deprecated legacy snapshot field — preserved for immutable purchased output */
  reportUsage?: string | null;
  paidDepthHash: string;
};

export type AlignDivergeItem = {
  axisId: ExpressionAxisId;
  dobTendency: string;
  freeTendency: string;
  relation: AlignDivergeRelation;
  evidenceAnswerIds: string[];
  uiSlot: UiSlot;
};

export type Intensity = {
  level: IntensityLevel;
  drivers: string[];
};

export type Hesitation = {
  present: boolean;
  drivers: string[];
  chapterHint: ChapterHintId | null;
};

export type ReactiveContext = {
  scenes: string[];
  drivers: string[];
};

export type ReplyAffinityRankedItem = {
  replyThemeId: ReplyThemeId;
  reasonCodes: string[];
  evidenceAnswerIds: string[];
};

export type ReplyAffinity = {
  ranked: ReplyAffinityRankedItem[];
};

export type IndividualizationFingerprint = {
  fingerprintSpecVersion: 'fp-v1';
  dobAxisLookupVersion: 'dal-v1';
  primaryThemeReplyMapVersion: 'ptrm-v1';
  dobBase: DobBase;
  freeExpression: FreeExpression;
  paidDepth: PaidDepth | null;
  alignItems: AlignDivergeItem[];
  divergeItems: AlignDivergeItem[];
  intensity: Intensity;
  hesitation: Hesitation;
  reactiveContext: ReactiveContext;
  replyAffinity: ReplyAffinity;
  selectors?: IndividualizationSelectorBundleV1;
};

export type IndividualizationQuestionnaire = {
  freeVersion: 'free-v1';
  paidVersion: 'paid-v1' | null;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string> | null;
  freeAnswerHash: string;
  paidAnswerHash: string | null;
  primaryThemeAnswerId: string | null;
  confirmationAcceptedAt: string | null;
};

export type SourceVersions = {
  fingerprintSpecVersion: 'fp-v1';
  dobAxisLookupVersion: 'dal-v1';
  primaryThemeReplyMapVersion: 'ptrm-v1';
  freeQuestionnaireVersion: 'free-v1';
  paidQuestionnaireVersion: 'paid-v1' | null;
  replyQuestionCatalogVersion: 'reply-v1';
  fieldNamingVersion:
    | typeof GENERATION_META_FIELD_NAMING_VERSION
    | typeof GENERATION_META_FIELD_NAMING_VERSION_V2;
  selectorVersion?: typeof INDIVIDUALIZATION_SELECTOR_VERSION_V1;
};

export type IndividualizationAudit = {
  outputHash: string;
  templateBlockIds: string[];
  engineVersion: string;
  catalogVersion: string;
  reportLogicVersion: string;
  generatedAt: string;
  sourceVersions: SourceVersions;
};

export type IndividualizationDraft = {
  questionnaire: IndividualizationQuestionnaire;
  fingerprint: IndividualizationFingerprint;
  audit: IndividualizationAudit;
  internalSelectors?: InternalSelectors;
};

export type PrimaryThemeMapResult = {
  primaryReplyTheme: ReplyThemeId;
  secondaryReplyTheme: ReplyThemeId;
};
