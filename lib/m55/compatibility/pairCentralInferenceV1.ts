/**
 * Pair central inference v1 — prose-free typed semantic model and pure deterministic resolver.
 * P1: types / shapes / illegal-state contract.
 * P2: canonical behavioral evidence → central inference resolver.
 * Still excluded: projection, DOB behavior, axis/focus input, UI integration.
 */

export const PAIR_CENTRAL_INFERENCE_VERSION = 'pair_central_inference_v1' as const;

// ---------------------------------------------------------------------------
// Section A — canonical ID literal unions
// ---------------------------------------------------------------------------

export type ExpressionPaceStateId = 'words_soon' | 'words_later' | 'words_vary';

export type PaceAlignmentStateId =
  | 'decide_now__words_soon'
  | 'decide_now__words_later'
  | 'decide_now__words_vary'
  | 'decide_later__words_soon'
  | 'decide_later__words_later'
  | 'decide_later__words_vary'
  | 'decide_varies__words_soon'
  | 'decide_varies__words_later'
  | 'decide_varies__words_vary';

export type ObservationGapSignatureId =
  | 'GAP_NONE'
  | 'GAP_DECISION'
  | 'GAP_DISAGREEMENT'
  | 'GAP_RETURN'
  | 'GAP_DECISION_DISAGREEMENT'
  | 'GAP_DECISION_RETURN'
  | 'GAP_DISAGREEMENT_RETURN'
  | 'GAP_DECISION_DISAGREEMENT_RETURN';

export type ObservationCoverageId = 'FULL' | 'PARTIAL' | 'EXPRESSION_ONLY';

export type ConflictOnsetMotionId =
  | 'CO_TALK_IN_SESSION'
  | 'CO_PAUSE_SPACE'
  | 'CO_TOPIC_CARRY';

export type ReentryMotionId =
  | 'RE_EXPLICIT_REACH'
  | 'RE_TIME_NATURAL_RESTORE'
  | 'RE_HEAVY_THRESHOLD';

export type LoopContextId =
  | 'LC_TALK_REACH'
  | 'LC_TALK_TIME'
  | 'LC_TALK_HEAVY'
  | 'LC_PAUSE_REACH'
  | 'LC_PAUSE_TIME'
  | 'LC_PAUSE_HEAVY'
  | 'LC_CARRY_REACH'
  | 'LC_CARRY_TIME'
  | 'LC_CARRY_HEAVY';

export type ConfirmationAnchorId =
  | 'CONF_TALK_REACH'
  | 'CONF_TALK_TIME'
  | 'CONF_TALK_HEAVY'
  | 'CONF_PAUSE_REACH'
  | 'CONF_PAUSE_TIME'
  | 'CONF_PAUSE_HEAVY'
  | 'CONF_CARRY_REACH'
  | 'CONF_CARRY_TIME'
  | 'CONF_CARRY_HEAVY';

// ---------------------------------------------------------------------------
// Section B — primary split semantic IDs
// ---------------------------------------------------------------------------

export type PrimarySplitLocusId =
  | 'PSL_BOUNDARY_AND_WORDS_COEMERGE'
  | 'PSL_BOUNDARY_BEFORE_WORDS'
  | 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING'
  | 'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY'
  | 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS'
  | 'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING'
  | 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS'
  | 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS'
  | 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION';

export type PrimarySplitMechanicId =
  | 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS'
  | 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION'
  | 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING'
  | 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY'
  | 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION'
  | 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING'
  | 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION'
  | 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION'
  | 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING';

// ---------------------------------------------------------------------------
// Section C — typed semantic components (pace-correlated)
// ---------------------------------------------------------------------------

type PaceSemanticMapV1 = {
  decide_now__words_soon: {
    locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE';
    mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS';
  };
  decide_now__words_later: {
    locus_id: 'PSL_BOUNDARY_BEFORE_WORDS';
    mechanic_id: 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION';
  };
  decide_now__words_vary: {
    locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING';
    mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING';
  };
  decide_later__words_soon: {
    locus_id: 'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY';
    mechanic_id: 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY';
  };
  decide_later__words_later: {
    locus_id: 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS';
    mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION';
  };
  decide_later__words_vary: {
    locus_id: 'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING';
    mechanic_id: 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING';
  };
  decide_varies__words_soon: {
    locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS';
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION';
  };
  decide_varies__words_later: {
    locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS';
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION';
  };
  decide_varies__words_vary: {
    locus_id: 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION';
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING';
  };
};

export type PaceStateV1 = {
  [K in keyof PaceSemanticMapV1]: {
    pace_alignment_state_id: K;
    primary_split: PaceSemanticMapV1[K];
  };
}[keyof PaceSemanticMapV1];

export type PrimarySplitV1 = PaceStateV1['primary_split'];

export type RepeatRiskStateV1 = {
  [K in keyof PaceSemanticMapV1]: {
    pace_alignment_state_id: K;
    primary_split_mechanic_id: PaceSemanticMapV1[K]['mechanic_id'];
    loop_context_id: LoopContextId;
  };
}[keyof PaceSemanticMapV1];

export type ConfirmationAnchorV1 = {
  anchor_id: ConfirmationAnchorId;
};

// ---------------------------------------------------------------------------
// Section D — canonical behavioral evidence IDs
// ---------------------------------------------------------------------------

export type DecisionAnswerEvidenceId =
  | 'answer:decisionPace:decide_now'
  | 'answer:decisionPace:decide_later'
  | 'answer:decisionPace:decide_varies';

export type DecisionGapEvidenceId = 'gap:decisionPace';

export type ExpressionPaceEvidenceId =
  | 'answer:expressionPace:words_soon'
  | 'answer:expressionPace:words_later'
  | 'answer:expressionPace:words_vary';

export type DisagreementAnswerEvidenceId =
  | 'answer:disagreement:talk_now'
  | 'answer:disagreement:take_space'
  | 'answer:disagreement:one_carries';

export type DisagreementGapEvidenceId = 'gap:disagreement';

export type ReturnPatternAnswerEvidenceId =
  | 'answer:returnPattern:someone_reaches'
  | 'answer:returnPattern:time_restores'
  | 'answer:returnPattern:return_is_hard';

export type ReturnGapEvidenceId = 'gap:returnPattern';

export type BehavioralEvidenceId =
  | DecisionAnswerEvidenceId
  | DecisionGapEvidenceId
  | ExpressionPaceEvidenceId
  | DisagreementAnswerEvidenceId
  | DisagreementGapEvidenceId
  | ReturnPatternAnswerEvidenceId
  | ReturnGapEvidenceId;

/** Future-facing alias; does not weaken BehavioralEvidenceId. */
export type CanonicalEvidenceId = BehavioralEvidenceId;

// ---------------------------------------------------------------------------
// Exact four-slot evidence tuples (decision, expression, disagreement, return)
// ---------------------------------------------------------------------------

export type FullObservationEvidenceIds = readonly [
  DecisionAnswerEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementAnswerEvidenceId,
  ReturnPatternAnswerEvidenceId,
];

export type PartialGapDecisionEvidenceIds = readonly [
  DecisionGapEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementAnswerEvidenceId,
  ReturnPatternAnswerEvidenceId,
];

export type PartialGapDisagreementEvidenceIds = readonly [
  DecisionAnswerEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementGapEvidenceId,
  ReturnPatternAnswerEvidenceId,
];

export type PartialGapReturnEvidenceIds = readonly [
  DecisionAnswerEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementAnswerEvidenceId,
  ReturnGapEvidenceId,
];

export type PartialGapDecisionDisagreementEvidenceIds = readonly [
  DecisionGapEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementGapEvidenceId,
  ReturnPatternAnswerEvidenceId,
];

export type PartialGapDecisionReturnEvidenceIds = readonly [
  DecisionGapEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementAnswerEvidenceId,
  ReturnGapEvidenceId,
];

export type PartialGapDisagreementReturnEvidenceIds = readonly [
  DecisionAnswerEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementGapEvidenceId,
  ReturnGapEvidenceId,
];

export type ExpressionOnlyEvidenceIds = readonly [
  DecisionGapEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementGapEvidenceId,
  ReturnGapEvidenceId,
];

// ---------------------------------------------------------------------------
// Readonly ID registries (domain cardinality checks; no resolver logic)
// ---------------------------------------------------------------------------

export const EXPRESSION_PACE_STATE_IDS = [
  'words_soon',
  'words_later',
  'words_vary',
] as const satisfies readonly ExpressionPaceStateId[];

export const PACE_ALIGNMENT_STATE_IDS = [
  'decide_now__words_soon',
  'decide_now__words_later',
  'decide_now__words_vary',
  'decide_later__words_soon',
  'decide_later__words_later',
  'decide_later__words_vary',
  'decide_varies__words_soon',
  'decide_varies__words_later',
  'decide_varies__words_vary',
] as const satisfies readonly PaceAlignmentStateId[];

export const OBSERVATION_GAP_SIGNATURE_IDS = [
  'GAP_NONE',
  'GAP_DECISION',
  'GAP_DISAGREEMENT',
  'GAP_RETURN',
  'GAP_DECISION_DISAGREEMENT',
  'GAP_DECISION_RETURN',
  'GAP_DISAGREEMENT_RETURN',
  'GAP_DECISION_DISAGREEMENT_RETURN',
] as const satisfies readonly ObservationGapSignatureId[];

export const OBSERVATION_COVERAGE_IDS = [
  'FULL',
  'PARTIAL',
  'EXPRESSION_ONLY',
] as const satisfies readonly ObservationCoverageId[];

export const CONFLICT_ONSET_MOTION_IDS = [
  'CO_TALK_IN_SESSION',
  'CO_PAUSE_SPACE',
  'CO_TOPIC_CARRY',
] as const satisfies readonly ConflictOnsetMotionId[];

export const REENTRY_MOTION_IDS = [
  'RE_EXPLICIT_REACH',
  'RE_TIME_NATURAL_RESTORE',
  'RE_HEAVY_THRESHOLD',
] as const satisfies readonly ReentryMotionId[];

export const LOOP_CONTEXT_IDS = [
  'LC_TALK_REACH',
  'LC_TALK_TIME',
  'LC_TALK_HEAVY',
  'LC_PAUSE_REACH',
  'LC_PAUSE_TIME',
  'LC_PAUSE_HEAVY',
  'LC_CARRY_REACH',
  'LC_CARRY_TIME',
  'LC_CARRY_HEAVY',
] as const satisfies readonly LoopContextId[];

export const CONFIRMATION_ANCHOR_IDS = [
  'CONF_TALK_REACH',
  'CONF_TALK_TIME',
  'CONF_TALK_HEAVY',
  'CONF_PAUSE_REACH',
  'CONF_PAUSE_TIME',
  'CONF_PAUSE_HEAVY',
  'CONF_CARRY_REACH',
  'CONF_CARRY_TIME',
  'CONF_CARRY_HEAVY',
] as const satisfies readonly ConfirmationAnchorId[];

export const PRIMARY_SPLIT_LOCUS_IDS = [
  'PSL_BOUNDARY_AND_WORDS_COEMERGE',
  'PSL_BOUNDARY_BEFORE_WORDS',
  'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
  'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY',
  'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS',
  'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
  'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS',
  'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS',
  'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION',
] as const satisfies readonly PrimarySplitLocusId[];

export const PRIMARY_SPLIT_MECHANIC_IDS = [
  'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
  'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION',
  'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
  'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY',
  'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
  'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING',
  'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
  'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION',
  'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
] as const satisfies readonly PrimarySplitMechanicId[];

// ---------------------------------------------------------------------------
// Section E/F — eight discriminated inference variants
// ---------------------------------------------------------------------------

type PairCentralInferenceCommonV1 = {
  version: typeof PAIR_CENTRAL_INFERENCE_VERSION;
  expression_pace_state: ExpressionPaceStateId;
  pair_axis_id?: never;
  focus_id?: never;
};

export type FullObservationCentralInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_NONE';
  observation_coverage_id: 'FULL';
  evidence_ids: FullObservationEvidenceIds;
  pace_state: PaceStateV1;
  conflict_onset_id: ConflictOnsetMotionId;
  reentry_motion_id: ReentryMotionId;
  loop_context_id: LoopContextId;
  repeat_state: RepeatRiskStateV1;
  confirmation: ConfirmationAnchorV1;
};

export type PartialGapDecisionInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DECISION';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapDecisionEvidenceIds;
  conflict_onset_id: ConflictOnsetMotionId;
  reentry_motion_id: ReentryMotionId;
  loop_context_id: LoopContextId;
  confirmation: ConfirmationAnchorV1;
  pace_state?: never;
  repeat_state?: never;
};

export type PartialGapDisagreementInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DISAGREEMENT';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapDisagreementEvidenceIds;
  pace_state: PaceStateV1;
  reentry_motion_id: ReentryMotionId;
  conflict_onset_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type PartialGapReturnInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_RETURN';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapReturnEvidenceIds;
  pace_state: PaceStateV1;
  conflict_onset_id: ConflictOnsetMotionId;
  reentry_motion_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type PartialGapDecisionDisagreementInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DECISION_DISAGREEMENT';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapDecisionDisagreementEvidenceIds;
  reentry_motion_id: ReentryMotionId;
  pace_state?: never;
  conflict_onset_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type PartialGapDecisionReturnInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DECISION_RETURN';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapDecisionReturnEvidenceIds;
  conflict_onset_id: ConflictOnsetMotionId;
  pace_state?: never;
  reentry_motion_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type PartialGapDisagreementReturnInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DISAGREEMENT_RETURN';
  observation_coverage_id: 'PARTIAL';
  evidence_ids: PartialGapDisagreementReturnEvidenceIds;
  pace_state: PaceStateV1;
  conflict_onset_id?: never;
  reentry_motion_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type ExpressionOnlyCentralInference = PairCentralInferenceCommonV1 & {
  gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN';
  observation_coverage_id: 'EXPRESSION_ONLY';
  evidence_ids: ExpressionOnlyEvidenceIds;
  pace_state?: never;
  conflict_onset_id?: never;
  reentry_motion_id?: never;
  loop_context_id?: never;
  repeat_state?: never;
  confirmation?: never;
};

export type PairCentralInferenceV1 =
  | FullObservationCentralInference
  | PartialGapDecisionInference
  | PartialGapDisagreementInference
  | PartialGapReturnInference
  | PartialGapDecisionDisagreementInference
  | PartialGapDecisionReturnInference
  | PartialGapDisagreementReturnInference
  | ExpressionOnlyCentralInference;

// ---------------------------------------------------------------------------
// P2 — resolver input contract (canonical four-slot evidence tuple)
// ---------------------------------------------------------------------------

export type PairCentralInferenceEvidenceInputV1 = readonly [
  DecisionAnswerEvidenceId | DecisionGapEvidenceId,
  ExpressionPaceEvidenceId,
  DisagreementAnswerEvidenceId | DisagreementGapEvidenceId,
  ReturnPatternAnswerEvidenceId | ReturnGapEvidenceId,
];

// ---------------------------------------------------------------------------
// P2 — exhaustive semantic mapping tables
// ---------------------------------------------------------------------------

const EXPRESSION_PACE_EVIDENCE_TO_STATE = {
  'answer:expressionPace:words_soon': 'words_soon',
  'answer:expressionPace:words_later': 'words_later',
  'answer:expressionPace:words_vary': 'words_vary',
} as const satisfies Record<ExpressionPaceEvidenceId, ExpressionPaceStateId>;

const PACE_STATE_BY_DECISION_EXPRESSION = {
  'answer:decisionPace:decide_now': {
    'answer:expressionPace:words_soon': {
      pace_alignment_state_id: 'decide_now__words_soon',
      primary_split: {
        locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE',
        mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
      },
    },
    'answer:expressionPace:words_later': {
      pace_alignment_state_id: 'decide_now__words_later',
      primary_split: {
        locus_id: 'PSL_BOUNDARY_BEFORE_WORDS',
        mechanic_id: 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION',
      },
    },
    'answer:expressionPace:words_vary': {
      pace_alignment_state_id: 'decide_now__words_vary',
      primary_split: {
        locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
        mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
      },
    },
  },
  'answer:decisionPace:decide_later': {
    'answer:expressionPace:words_soon': {
      pace_alignment_state_id: 'decide_later__words_soon',
      primary_split: {
        locus_id: 'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY',
        mechanic_id: 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY',
      },
    },
    'answer:expressionPace:words_later': {
      pace_alignment_state_id: 'decide_later__words_later',
      primary_split: {
        locus_id: 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS',
        mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
      },
    },
    'answer:expressionPace:words_vary': {
      pace_alignment_state_id: 'decide_later__words_vary',
      primary_split: {
        locus_id: 'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
        mechanic_id: 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING',
      },
    },
  },
  'answer:decisionPace:decide_varies': {
    'answer:expressionPace:words_soon': {
      pace_alignment_state_id: 'decide_varies__words_soon',
      primary_split: {
        locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS',
        mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
      },
    },
    'answer:expressionPace:words_later': {
      pace_alignment_state_id: 'decide_varies__words_later',
      primary_split: {
        locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS',
        mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION',
      },
    },
    'answer:expressionPace:words_vary': {
      pace_alignment_state_id: 'decide_varies__words_vary',
      primary_split: {
        locus_id: 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION',
        mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
      },
    },
  },
} as const satisfies Record<
  DecisionAnswerEvidenceId,
  Record<ExpressionPaceEvidenceId, PaceStateV1>
>;

const DISAGREEMENT_ANSWER_TO_CONFLICT = {
  'answer:disagreement:talk_now': 'CO_TALK_IN_SESSION',
  'answer:disagreement:take_space': 'CO_PAUSE_SPACE',
  'answer:disagreement:one_carries': 'CO_TOPIC_CARRY',
} as const satisfies Record<DisagreementAnswerEvidenceId, ConflictOnsetMotionId>;

const RETURN_ANSWER_TO_REENTRY = {
  'answer:returnPattern:someone_reaches': 'RE_EXPLICIT_REACH',
  'answer:returnPattern:time_restores': 'RE_TIME_NATURAL_RESTORE',
  'answer:returnPattern:return_is_hard': 'RE_HEAVY_THRESHOLD',
} as const satisfies Record<ReturnPatternAnswerEvidenceId, ReentryMotionId>;

const LOOP_CONTEXT_BY_CONFLICT_REENTRY = {
  CO_TALK_IN_SESSION: {
    RE_EXPLICIT_REACH: 'LC_TALK_REACH',
    RE_TIME_NATURAL_RESTORE: 'LC_TALK_TIME',
    RE_HEAVY_THRESHOLD: 'LC_TALK_HEAVY',
  },
  CO_PAUSE_SPACE: {
    RE_EXPLICIT_REACH: 'LC_PAUSE_REACH',
    RE_TIME_NATURAL_RESTORE: 'LC_PAUSE_TIME',
    RE_HEAVY_THRESHOLD: 'LC_PAUSE_HEAVY',
  },
  CO_TOPIC_CARRY: {
    RE_EXPLICIT_REACH: 'LC_CARRY_REACH',
    RE_TIME_NATURAL_RESTORE: 'LC_CARRY_TIME',
    RE_HEAVY_THRESHOLD: 'LC_CARRY_HEAVY',
  },
} as const satisfies Record<
  ConflictOnsetMotionId,
  Record<ReentryMotionId, LoopContextId>
>;

const CONFIRMATION_BY_CONFLICT_REENTRY = {
  CO_TALK_IN_SESSION: {
    RE_EXPLICIT_REACH: 'CONF_TALK_REACH',
    RE_TIME_NATURAL_RESTORE: 'CONF_TALK_TIME',
    RE_HEAVY_THRESHOLD: 'CONF_TALK_HEAVY',
  },
  CO_PAUSE_SPACE: {
    RE_EXPLICIT_REACH: 'CONF_PAUSE_REACH',
    RE_TIME_NATURAL_RESTORE: 'CONF_PAUSE_TIME',
    RE_HEAVY_THRESHOLD: 'CONF_PAUSE_HEAVY',
  },
  CO_TOPIC_CARRY: {
    RE_EXPLICIT_REACH: 'CONF_CARRY_REACH',
    RE_TIME_NATURAL_RESTORE: 'CONF_CARRY_TIME',
    RE_HEAVY_THRESHOLD: 'CONF_CARRY_HEAVY',
  },
} as const satisfies Record<
  ConflictOnsetMotionId,
  Record<ReentryMotionId, ConfirmationAnchorId>
>;

type GapDimensionFlags = {
  decisionGap: boolean;
  disagreementGap: boolean;
  returnGap: boolean;
};

function deriveGapFlags(evidence: PairCentralInferenceEvidenceInputV1): GapDimensionFlags {
  return {
    decisionGap: evidence[0] === 'gap:decisionPace',
    disagreementGap: evidence[2] === 'gap:disagreement',
    returnGap: evidence[3] === 'gap:returnPattern',
  };
}

function deriveGapSignatureId(flags: GapDimensionFlags): ObservationGapSignatureId {
  const { decisionGap, disagreementGap, returnGap } = flags;
  if (!decisionGap && !disagreementGap && !returnGap) return 'GAP_NONE';
  if (decisionGap && !disagreementGap && !returnGap) return 'GAP_DECISION';
  if (!decisionGap && disagreementGap && !returnGap) return 'GAP_DISAGREEMENT';
  if (!decisionGap && !disagreementGap && returnGap) return 'GAP_RETURN';
  if (decisionGap && disagreementGap && !returnGap) return 'GAP_DECISION_DISAGREEMENT';
  if (decisionGap && !disagreementGap && returnGap) return 'GAP_DECISION_RETURN';
  if (!decisionGap && disagreementGap && returnGap) return 'GAP_DISAGREEMENT_RETURN';
  return 'GAP_DECISION_DISAGREEMENT_RETURN';
}

function resolveExpressionPaceState(
  expressionEvidence: ExpressionPaceEvidenceId,
): ExpressionPaceStateId {
  return EXPRESSION_PACE_EVIDENCE_TO_STATE[expressionEvidence];
}

function resolvePaceState(
  decisionEvidence: DecisionAnswerEvidenceId,
  expressionEvidence: ExpressionPaceEvidenceId,
): PaceStateV1 {
  const mapped = PACE_STATE_BY_DECISION_EXPRESSION[decisionEvidence][expressionEvidence];
  switch (mapped.pace_alignment_state_id) {
    case 'decide_now__words_soon':
      return {
        pace_alignment_state_id: 'decide_now__words_soon',
        primary_split: {
          locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE',
          mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
        },
      };
    case 'decide_now__words_later':
      return {
        pace_alignment_state_id: 'decide_now__words_later',
        primary_split: {
          locus_id: 'PSL_BOUNDARY_BEFORE_WORDS',
          mechanic_id: 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION',
        },
      };
    case 'decide_now__words_vary':
      return {
        pace_alignment_state_id: 'decide_now__words_vary',
        primary_split: {
          locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
          mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
        },
      };
    case 'decide_later__words_soon':
      return {
        pace_alignment_state_id: 'decide_later__words_soon',
        primary_split: {
          locus_id: 'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY',
          mechanic_id: 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY',
        },
      };
    case 'decide_later__words_later':
      return {
        pace_alignment_state_id: 'decide_later__words_later',
        primary_split: {
          locus_id: 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS',
          mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
        },
      };
    case 'decide_later__words_vary':
      return {
        pace_alignment_state_id: 'decide_later__words_vary',
        primary_split: {
          locus_id: 'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
          mechanic_id: 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING',
        },
      };
    case 'decide_varies__words_soon':
      return {
        pace_alignment_state_id: 'decide_varies__words_soon',
        primary_split: {
          locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS',
          mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
        },
      };
    case 'decide_varies__words_later':
      return {
        pace_alignment_state_id: 'decide_varies__words_later',
        primary_split: {
          locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS',
          mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION',
        },
      };
    case 'decide_varies__words_vary':
      return {
        pace_alignment_state_id: 'decide_varies__words_vary',
        primary_split: {
          locus_id: 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION',
          mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
        },
      };
  }
}

function resolveConflictOnset(
  disagreementEvidence: DisagreementAnswerEvidenceId,
): ConflictOnsetMotionId {
  return DISAGREEMENT_ANSWER_TO_CONFLICT[disagreementEvidence];
}

function resolveReentryMotion(
  returnEvidence: ReturnPatternAnswerEvidenceId,
): ReentryMotionId {
  return RETURN_ANSWER_TO_REENTRY[returnEvidence];
}

function resolveLoopContext(
  conflictId: ConflictOnsetMotionId,
  reentryId: ReentryMotionId,
): LoopContextId {
  return LOOP_CONTEXT_BY_CONFLICT_REENTRY[conflictId][reentryId];
}

function resolveConfirmationAnchor(
  conflictId: ConflictOnsetMotionId,
  reentryId: ReentryMotionId,
): ConfirmationAnchorV1 {
  return { anchor_id: CONFIRMATION_BY_CONFLICT_REENTRY[conflictId][reentryId] };
}

function buildRepeatState(
  paceState: PaceStateV1,
  loopContextId: LoopContextId,
): RepeatRiskStateV1 {
  switch (paceState.pace_alignment_state_id) {
    case 'decide_now__words_soon':
      return {
        pace_alignment_state_id: 'decide_now__words_soon',
        primary_split_mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
        loop_context_id: loopContextId,
      };
    case 'decide_now__words_later':
      return {
        pace_alignment_state_id: 'decide_now__words_later',
        primary_split_mechanic_id: 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION',
        loop_context_id: loopContextId,
      };
    case 'decide_now__words_vary':
      return {
        pace_alignment_state_id: 'decide_now__words_vary',
        primary_split_mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
        loop_context_id: loopContextId,
      };
    case 'decide_later__words_soon':
      return {
        pace_alignment_state_id: 'decide_later__words_soon',
        primary_split_mechanic_id: 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY',
        loop_context_id: loopContextId,
      };
    case 'decide_later__words_later':
      return {
        pace_alignment_state_id: 'decide_later__words_later',
        primary_split_mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
        loop_context_id: loopContextId,
      };
    case 'decide_later__words_vary':
      return {
        pace_alignment_state_id: 'decide_later__words_vary',
        primary_split_mechanic_id: 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING',
        loop_context_id: loopContextId,
      };
    case 'decide_varies__words_soon':
      return {
        pace_alignment_state_id: 'decide_varies__words_soon',
        primary_split_mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
        loop_context_id: loopContextId,
      };
    case 'decide_varies__words_later':
      return {
        pace_alignment_state_id: 'decide_varies__words_later',
        primary_split_mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION',
        loop_context_id: loopContextId,
      };
    case 'decide_varies__words_vary':
      return {
        pace_alignment_state_id: 'decide_varies__words_vary',
        primary_split_mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
        loop_context_id: loopContextId,
      };
  }
}

/**
 * Pure deterministic resolver: canonical behavioral evidence → PairCentralInferenceV1.
 * No I/O, no randomness, no presentation/DOB/axis/focus inputs.
 */
export function resolvePairCentralInferenceV1(
  evidence: PairCentralInferenceEvidenceInputV1,
): PairCentralInferenceV1 {
  const expressionPaceState = resolveExpressionPaceState(evidence[1]);
  const flags = deriveGapFlags(evidence);
  const gapSignatureId = deriveGapSignatureId(flags);

  const common = {
    version: PAIR_CENTRAL_INFERENCE_VERSION,
    expression_pace_state: expressionPaceState,
  };

  switch (gapSignatureId) {
    case 'GAP_NONE': {
      const decisionEvidence = evidence[0] as DecisionAnswerEvidenceId;
      const disagreementEvidence = evidence[2] as DisagreementAnswerEvidenceId;
      const returnEvidence = evidence[3] as ReturnPatternAnswerEvidenceId;
      const evidenceIds: FullObservationEvidenceIds = [
        decisionEvidence,
        evidence[1],
        disagreementEvidence,
        returnEvidence,
      ];
      const paceState = resolvePaceState(decisionEvidence, evidence[1]);
      const conflictOnsetId = resolveConflictOnset(disagreementEvidence);
      const reentryMotionId = resolveReentryMotion(returnEvidence);
      const loopContextId = resolveLoopContext(conflictOnsetId, reentryMotionId);
      const confirmation = resolveConfirmationAnchor(conflictOnsetId, reentryMotionId);
      const repeatState = buildRepeatState(paceState, loopContextId);
      return {
        ...common,
        gap_signature_id: 'GAP_NONE',
        observation_coverage_id: 'FULL',
        evidence_ids: evidenceIds,
        pace_state: paceState,
        conflict_onset_id: conflictOnsetId,
        reentry_motion_id: reentryMotionId,
        loop_context_id: loopContextId,
        repeat_state: repeatState,
        confirmation,
      };
    }
    case 'GAP_DECISION': {
      const disagreementEvidence = evidence[2] as DisagreementAnswerEvidenceId;
      const returnEvidence = evidence[3] as ReturnPatternAnswerEvidenceId;
      const evidenceIds: PartialGapDecisionEvidenceIds = [
        'gap:decisionPace',
        evidence[1],
        disagreementEvidence,
        returnEvidence,
      ];
      const conflictOnsetId = resolveConflictOnset(disagreementEvidence);
      const reentryMotionId = resolveReentryMotion(returnEvidence);
      const loopContextId = resolveLoopContext(conflictOnsetId, reentryMotionId);
      const confirmation = resolveConfirmationAnchor(conflictOnsetId, reentryMotionId);
      return {
        ...common,
        gap_signature_id: 'GAP_DECISION',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        conflict_onset_id: conflictOnsetId,
        reentry_motion_id: reentryMotionId,
        loop_context_id: loopContextId,
        confirmation,
      };
    }
    case 'GAP_DISAGREEMENT': {
      const decisionEvidence = evidence[0] as DecisionAnswerEvidenceId;
      const returnEvidence = evidence[3] as ReturnPatternAnswerEvidenceId;
      const evidenceIds: PartialGapDisagreementEvidenceIds = [
        decisionEvidence,
        evidence[1],
        'gap:disagreement',
        returnEvidence,
      ];
      const paceState = resolvePaceState(decisionEvidence, evidence[1]);
      const reentryMotionId = resolveReentryMotion(returnEvidence);
      return {
        ...common,
        gap_signature_id: 'GAP_DISAGREEMENT',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        pace_state: paceState,
        reentry_motion_id: reentryMotionId,
      };
    }
    case 'GAP_RETURN': {
      const decisionEvidence = evidence[0] as DecisionAnswerEvidenceId;
      const disagreementEvidence = evidence[2] as DisagreementAnswerEvidenceId;
      const evidenceIds: PartialGapReturnEvidenceIds = [
        decisionEvidence,
        evidence[1],
        disagreementEvidence,
        'gap:returnPattern',
      ];
      const paceState = resolvePaceState(decisionEvidence, evidence[1]);
      const conflictOnsetId = resolveConflictOnset(disagreementEvidence);
      return {
        ...common,
        gap_signature_id: 'GAP_RETURN',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        pace_state: paceState,
        conflict_onset_id: conflictOnsetId,
      };
    }
    case 'GAP_DECISION_DISAGREEMENT': {
      const returnEvidence = evidence[3] as ReturnPatternAnswerEvidenceId;
      const evidenceIds: PartialGapDecisionDisagreementEvidenceIds = [
        'gap:decisionPace',
        evidence[1],
        'gap:disagreement',
        returnEvidence,
      ];
      const reentryMotionId = resolveReentryMotion(returnEvidence);
      return {
        ...common,
        gap_signature_id: 'GAP_DECISION_DISAGREEMENT',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        reentry_motion_id: reentryMotionId,
      };
    }
    case 'GAP_DECISION_RETURN': {
      const disagreementEvidence = evidence[2] as DisagreementAnswerEvidenceId;
      const evidenceIds: PartialGapDecisionReturnEvidenceIds = [
        'gap:decisionPace',
        evidence[1],
        disagreementEvidence,
        'gap:returnPattern',
      ];
      const conflictOnsetId = resolveConflictOnset(disagreementEvidence);
      return {
        ...common,
        gap_signature_id: 'GAP_DECISION_RETURN',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        conflict_onset_id: conflictOnsetId,
      };
    }
    case 'GAP_DISAGREEMENT_RETURN': {
      const decisionEvidence = evidence[0] as DecisionAnswerEvidenceId;
      const evidenceIds: PartialGapDisagreementReturnEvidenceIds = [
        decisionEvidence,
        evidence[1],
        'gap:disagreement',
        'gap:returnPattern',
      ];
      const paceState = resolvePaceState(decisionEvidence, evidence[1]);
      return {
        ...common,
        gap_signature_id: 'GAP_DISAGREEMENT_RETURN',
        observation_coverage_id: 'PARTIAL',
        evidence_ids: evidenceIds,
        pace_state: paceState,
      };
    }
    case 'GAP_DECISION_DISAGREEMENT_RETURN': {
      const evidenceIds: ExpressionOnlyEvidenceIds = [
        'gap:decisionPace',
        evidence[1],
        'gap:disagreement',
        'gap:returnPattern',
      ];
      return {
        ...common,
        gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN',
        observation_coverage_id: 'EXPRESSION_ONLY',
        evidence_ids: evidenceIds,
      };
    }
  }
}
