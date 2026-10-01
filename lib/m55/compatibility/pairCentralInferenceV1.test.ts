import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONFIRMATION_ANCHOR_IDS,
  CONFLICT_ONSET_MOTION_IDS,
  EXPRESSION_PACE_STATE_IDS,
  LOOP_CONTEXT_IDS,
  OBSERVATION_COVERAGE_IDS,
  OBSERVATION_GAP_SIGNATURE_IDS,
  PAIR_CENTRAL_INFERENCE_VERSION,
  PACE_ALIGNMENT_STATE_IDS,
  PRIMARY_SPLIT_LOCUS_IDS,
  PRIMARY_SPLIT_MECHANIC_IDS,
  REENTRY_MOTION_IDS,
  resolvePairCentralInferenceV1,
  type ConfirmationAnchorId,
  type ConflictOnsetMotionId,
  type DecisionAnswerEvidenceId,
  type DisagreementAnswerEvidenceId,
  type ExpressionOnlyCentralInference,
  type ExpressionPaceEvidenceId,
  type FullObservationCentralInference,
  type LoopContextId,
  type ObservationGapSignatureId,
  type PairCentralInferenceEvidenceInputV1,
  type PairCentralInferenceV1,
  type PartialGapDecisionDisagreementInference,
  type PartialGapDecisionInference,
  type PartialGapDecisionReturnInference,
  type PartialGapDisagreementInference,
  type PartialGapDisagreementReturnInference,
  type PartialGapReturnInference,
  type PaceAlignmentStateId,
  type PaceStateV1,
  type PrimarySplitLocusId,
  type PrimarySplitMechanicId,
  type PrimarySplitV1,
  type ReentryMotionId,
  type RepeatRiskStateV1,
  type ReturnPatternAnswerEvidenceId,
} from './pairCentralInferenceV1';
import type { PairPresentationContextV1 } from './pairPresentationContextV1';

const SAMPLE_PACE_STATE: PaceStateV1 = {
  pace_alignment_state_id: 'decide_now__words_soon',
  primary_split: {
    locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE',
    mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
  },
};

const SAMPLE_REPEAT_STATE: RepeatRiskStateV1 = {
  pace_alignment_state_id: 'decide_now__words_soon',
  primary_split_mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
  loop_context_id: 'LC_TALK_REACH',
};

const FULL_EVIDENCE = [
  'answer:decisionPace:decide_now',
  'answer:expressionPace:words_soon',
  'answer:disagreement:talk_now',
  'answer:returnPattern:someone_reaches',
] as const;

const EXPRESSION_ONLY_EVIDENCE = [
  'gap:decisionPace',
  'answer:expressionPace:words_later',
  'gap:disagreement',
  'gap:returnPattern',
] as const;

export const FULL_OBSERVATION_FIXTURE: FullObservationCentralInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_NONE',
  observation_coverage_id: 'FULL',
  evidence_ids: FULL_EVIDENCE,
  expression_pace_state: 'words_soon',
  pace_state: SAMPLE_PACE_STATE,
  conflict_onset_id: 'CO_TALK_IN_SESSION',
  reentry_motion_id: 'RE_EXPLICIT_REACH',
  loop_context_id: 'LC_TALK_REACH',
  repeat_state: SAMPLE_REPEAT_STATE,
  confirmation: { anchor_id: 'CONF_TALK_REACH' },
};

export const PARTIAL_GAP_DECISION_FIXTURE: PartialGapDecisionInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DECISION',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'gap:decisionPace',
    'answer:expressionPace:words_soon',
    'answer:disagreement:take_space',
    'answer:returnPattern:time_restores',
  ],
  expression_pace_state: 'words_soon',
  conflict_onset_id: 'CO_PAUSE_SPACE',
  reentry_motion_id: 'RE_TIME_NATURAL_RESTORE',
  loop_context_id: 'LC_PAUSE_TIME',
  confirmation: { anchor_id: 'CONF_PAUSE_TIME' },
};

export const PARTIAL_GAP_DISAGREEMENT_FIXTURE: PartialGapDisagreementInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DISAGREEMENT',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'answer:decisionPace:decide_later',
    'answer:expressionPace:words_later',
    'gap:disagreement',
    'answer:returnPattern:return_is_hard',
  ],
  expression_pace_state: 'words_later',
  pace_state: {
    pace_alignment_state_id: 'decide_later__words_later',
    primary_split: {
      locus_id: 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS',
      mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
    },
  },
  reentry_motion_id: 'RE_HEAVY_THRESHOLD',
};

export const PARTIAL_GAP_RETURN_FIXTURE: PartialGapReturnInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_RETURN',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'answer:decisionPace:decide_varies',
    'answer:expressionPace:words_vary',
    'answer:disagreement:one_carries',
    'gap:returnPattern',
  ],
  expression_pace_state: 'words_vary',
  pace_state: {
    pace_alignment_state_id: 'decide_varies__words_vary',
    primary_split: {
      locus_id: 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION',
      mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
    },
  },
  conflict_onset_id: 'CO_TOPIC_CARRY',
};

export const PARTIAL_GAP_DECISION_DISAGREEMENT_FIXTURE: PartialGapDecisionDisagreementInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DECISION_DISAGREEMENT',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'gap:decisionPace',
    'answer:expressionPace:words_soon',
    'gap:disagreement',
    'answer:returnPattern:someone_reaches',
  ],
  expression_pace_state: 'words_soon',
  reentry_motion_id: 'RE_EXPLICIT_REACH',
};

export const PARTIAL_GAP_DECISION_RETURN_FIXTURE: PartialGapDecisionReturnInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DECISION_RETURN',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'gap:decisionPace',
    'answer:expressionPace:words_later',
    'answer:disagreement:take_space',
    'gap:returnPattern',
  ],
  expression_pace_state: 'words_later',
  conflict_onset_id: 'CO_PAUSE_SPACE',
};

export const PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE: PartialGapDisagreementReturnInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DISAGREEMENT_RETURN',
  observation_coverage_id: 'PARTIAL',
  evidence_ids: [
    'answer:decisionPace:decide_now',
    'answer:expressionPace:words_vary',
    'gap:disagreement',
    'gap:returnPattern',
  ],
  expression_pace_state: 'words_vary',
  pace_state: {
    pace_alignment_state_id: 'decide_now__words_vary',
    primary_split: {
      locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
      mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
    },
  },
};

export const EXPRESSION_ONLY_FIXTURE: ExpressionOnlyCentralInference = {
  version: PAIR_CENTRAL_INFERENCE_VERSION,
  gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN',
  observation_coverage_id: 'EXPRESSION_ONLY',
  evidence_ids: EXPRESSION_ONLY_EVIDENCE,
  expression_pace_state: 'words_later',
};

const ALL_VARIANT_FIXTURES: readonly PairCentralInferenceV1[] = [
  FULL_OBSERVATION_FIXTURE,
  PARTIAL_GAP_DECISION_FIXTURE,
  PARTIAL_GAP_DISAGREEMENT_FIXTURE,
  PARTIAL_GAP_RETURN_FIXTURE,
  PARTIAL_GAP_DECISION_DISAGREEMENT_FIXTURE,
  PARTIAL_GAP_DECISION_RETURN_FIXTURE,
  PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE,
  EXPRESSION_ONLY_FIXTURE,
];

describe('pair central inference v1 typed model', () => {
  it('exports exact canonical ID domain cardinalities', () => {
    assert.equal(EXPRESSION_PACE_STATE_IDS.length, 3);
    assert.equal(PACE_ALIGNMENT_STATE_IDS.length, 9);
    assert.equal(OBSERVATION_GAP_SIGNATURE_IDS.length, 8);
    assert.equal(OBSERVATION_COVERAGE_IDS.length, 3);
    assert.equal(CONFLICT_ONSET_MOTION_IDS.length, 3);
    assert.equal(REENTRY_MOTION_IDS.length, 3);
    assert.equal(LOOP_CONTEXT_IDS.length, 9);
    assert.equal(CONFIRMATION_ANCHOR_IDS.length, 9);
    assert.equal(PRIMARY_SPLIT_LOCUS_IDS.length, 9);
    assert.equal(PRIMARY_SPLIT_MECHANIC_IDS.length, 9);
  });

  it('constructs all eight valid discriminated variants', () => {
    assert.equal(ALL_VARIANT_FIXTURES.length, 8);
    for (const fixture of ALL_VARIANT_FIXTURES) {
      assert.equal(fixture.version, PAIR_CENTRAL_INFERENCE_VERSION);
      assert.ok(fixture.gap_signature_id);
      assert.ok(fixture.observation_coverage_id);
      assert.ok(fixture.expression_pace_state);
      assert.equal(fixture.evidence_ids.length, 4);
    }
  });

  it('reflects exact field availability per variant', () => {
    assert.equal(FULL_OBSERVATION_FIXTURE.gap_signature_id, 'GAP_NONE');
    assert.equal(FULL_OBSERVATION_FIXTURE.observation_coverage_id, 'FULL');
    assert.ok(FULL_OBSERVATION_FIXTURE.pace_state);
    assert.ok(FULL_OBSERVATION_FIXTURE.repeat_state);
    assert.ok(FULL_OBSERVATION_FIXTURE.confirmation);

    assert.equal(PARTIAL_GAP_DECISION_FIXTURE.gap_signature_id, 'GAP_DECISION');
    assert.equal(PARTIAL_GAP_DECISION_FIXTURE.observation_coverage_id, 'PARTIAL');
    assert.ok(PARTIAL_GAP_DECISION_FIXTURE.confirmation);
    assert.ok(PARTIAL_GAP_DECISION_FIXTURE.loop_context_id);
    assert.equal('pace_state' in PARTIAL_GAP_DECISION_FIXTURE, false);
    assert.equal('repeat_state' in PARTIAL_GAP_DECISION_FIXTURE, false);

    assert.equal(PARTIAL_GAP_DISAGREEMENT_FIXTURE.gap_signature_id, 'GAP_DISAGREEMENT');
    assert.ok(PARTIAL_GAP_DISAGREEMENT_FIXTURE.pace_state);
    assert.equal('confirmation' in PARTIAL_GAP_DISAGREEMENT_FIXTURE, false);
    assert.equal('conflict_onset_id' in PARTIAL_GAP_DISAGREEMENT_FIXTURE, false);

    assert.equal(PARTIAL_GAP_RETURN_FIXTURE.gap_signature_id, 'GAP_RETURN');
    assert.ok(PARTIAL_GAP_RETURN_FIXTURE.conflict_onset_id);
    assert.equal('reentry_motion_id' in PARTIAL_GAP_RETURN_FIXTURE, false);
    assert.equal('confirmation' in PARTIAL_GAP_RETURN_FIXTURE, false);

    assert.equal(
      PARTIAL_GAP_DECISION_DISAGREEMENT_FIXTURE.gap_signature_id,
      'GAP_DECISION_DISAGREEMENT',
    );
    assert.ok(PARTIAL_GAP_DECISION_DISAGREEMENT_FIXTURE.reentry_motion_id);
    assert.equal('pace_state' in PARTIAL_GAP_DECISION_DISAGREEMENT_FIXTURE, false);

    assert.equal(PARTIAL_GAP_DECISION_RETURN_FIXTURE.gap_signature_id, 'GAP_DECISION_RETURN');
    assert.ok(PARTIAL_GAP_DECISION_RETURN_FIXTURE.conflict_onset_id);
    assert.equal('reentry_motion_id' in PARTIAL_GAP_DECISION_RETURN_FIXTURE, false);

    assert.equal(
      PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE.gap_signature_id,
      'GAP_DISAGREEMENT_RETURN',
    );
    assert.ok(PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE.pace_state);
    assert.equal(
      PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE.pace_state.primary_split.locus_id,
      'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
    );
    assert.equal(
      PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE.pace_state.primary_split.mechanic_id,
      'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
    );
    assert.equal('conflict_onset_id' in PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE, false);

    assert.equal(EXPRESSION_ONLY_FIXTURE.gap_signature_id, 'GAP_DECISION_DISAGREEMENT_RETURN');
    assert.equal(EXPRESSION_ONLY_FIXTURE.observation_coverage_id, 'EXPRESSION_ONLY');
    assert.equal('loop_context_id' in EXPRESSION_ONLY_FIXTURE, false);
    assert.equal('confirmation' in EXPRESSION_ONLY_FIXTURE, false);
  });

  it('keeps presentation context external to central inference', () => {
    const presentation: PairPresentationContextV1 = {
      version: 'pair_presentation_context_v1',
      pair_axis_id: 'A2',
      focus_id: 'conversation_focus',
    };
    assert.equal(presentation.pair_axis_id, 'A2');
    assert.equal(presentation.focus_id, 'conversation_focus');
  });
});

// ---------------------------------------------------------------------------
// Compile-time illegal-state rejection (@ts-expect-error must remain valid)
// ---------------------------------------------------------------------------

function _rejectGapDecisionPaceState() {
  const bad: PartialGapDecisionInference = {
    ...PARTIAL_GAP_DECISION_FIXTURE,
    // @ts-expect-error pace_state is forbidden on GAP_DECISION
    pace_state: SAMPLE_PACE_STATE,
  };
  return bad;
}

function _rejectGapDecisionRepeatState() {
  const bad: PartialGapDecisionInference = {
    ...PARTIAL_GAP_DECISION_FIXTURE,
    // @ts-expect-error repeat_state is forbidden on GAP_DECISION
    repeat_state: SAMPLE_REPEAT_STATE,
  };
  return bad;
}

function _rejectGapDisagreementConfirmation() {
  const bad: PartialGapDisagreementInference = {
    ...PARTIAL_GAP_DISAGREEMENT_FIXTURE,
    // @ts-expect-error confirmation is forbidden on GAP_DISAGREEMENT
    confirmation: { anchor_id: 'CONF_TALK_REACH' },
  };
  return bad;
}

function _rejectGapReturnConfirmation() {
  const bad: PartialGapReturnInference = {
    ...PARTIAL_GAP_RETURN_FIXTURE,
    // @ts-expect-error confirmation is forbidden on GAP_RETURN
    confirmation: { anchor_id: 'CONF_TALK_REACH' },
  };
  return bad;
}

function _rejectExpressionOnlyLoopContext() {
  const bad: ExpressionOnlyCentralInference = {
    ...EXPRESSION_ONLY_FIXTURE,
    // @ts-expect-error loop_context_id is forbidden on expression-only inference
    loop_context_id: 'LC_TALK_REACH',
  };
  return bad;
}

function _rejectExpressionOnlyConfirmation() {
  const bad: ExpressionOnlyCentralInference = {
    ...EXPRESSION_ONLY_FIXTURE,
    // @ts-expect-error confirmation is forbidden on expression-only inference
    confirmation: { anchor_id: 'CONF_TALK_REACH' },
  };
  return bad;
}

function _rejectGapDisagreementReturnConflictOnset() {
  const bad: PartialGapDisagreementReturnInference = {
    ...PARTIAL_GAP_DISAGREEMENT_RETURN_FIXTURE,
    // @ts-expect-error conflict_onset_id is forbidden on GAP_DISAGREEMENT_RETURN
    conflict_onset_id: 'CO_TALK_IN_SESSION',
  };
  return bad;
}

function _rejectPartialFullCoverage() {
  const bad: PartialGapDecisionInference = {
    ...PARTIAL_GAP_DECISION_FIXTURE,
    // @ts-expect-error partial variants cannot use FULL coverage
    observation_coverage_id: 'FULL',
  };
  return bad;
}

function _rejectFullPartialCoverage() {
  const bad: FullObservationCentralInference = {
    ...FULL_OBSERVATION_FIXTURE,
    // @ts-expect-error full observation cannot use PARTIAL coverage
    observation_coverage_id: 'PARTIAL',
  };
  return bad;
}

function _rejectCentralInferenceAxisFieldLiteral() {
  const _bad: PairCentralInferenceV1 = {
    version: PAIR_CENTRAL_INFERENCE_VERSION,
    // @ts-expect-error pair_axis_id belongs in PairPresentationContextV1 only
    pair_axis_id: 'A1',
    gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN',
    observation_coverage_id: 'EXPRESSION_ONLY',
    evidence_ids: EXPRESSION_ONLY_EVIDENCE,
    expression_pace_state: 'words_soon',
  };
  return _bad;
}

function _rejectCentralInferenceFocusFieldLiteral() {
  const _bad: PairCentralInferenceV1 = {
    version: PAIR_CENTRAL_INFERENCE_VERSION,
    // @ts-expect-error focus_id belongs in PairPresentationContextV1 only
    focus_id: 'loop_focus',
    gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN',
    observation_coverage_id: 'EXPRESSION_ONLY',
    evidence_ids: EXPRESSION_ONLY_EVIDENCE,
    expression_pace_state: 'words_soon',
  };
  return _bad;
}

function _rejectPaceStateWrongSplitForDecideNowWordsVary() {
  // @ts-expect-error cross-row locus/mechanic pairing is forbidden for decide_now__words_vary
  const bad: PaceStateV1 = {
    pace_alignment_state_id: 'decide_now__words_vary',
    primary_split: {
      locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS',
      mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
    },
  };
  return bad;
}

function _rejectPrimarySplitCrossRowPairing() {
  // @ts-expect-error locus/mechanic pairs must come from the same frozen pace semantic row
  const bad: PrimarySplitV1 = {
    locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE',
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
  };
  return bad;
}

function _rejectRepeatRiskWrongMechanicForDecideNowWordsVary() {
  // @ts-expect-error mechanic must match the frozen pace semantic row for decide_now__words_vary
  const bad: RepeatRiskStateV1 = {
    pace_alignment_state_id: 'decide_now__words_vary',
    primary_split_mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
    loop_context_id: 'LC_TALK_REACH',
  };
  return bad;
}

function _rejectFullEvidenceMissingSlots() {
  const bad: FullObservationCentralInference = {
    ...FULL_OBSERVATION_FIXTURE,
    // @ts-expect-error full observation requires exactly four evidence slots
    evidence_ids: [
      'answer:decisionPace:decide_now',
      'answer:expressionPace:words_soon',
      'answer:disagreement:talk_now',
    ],
  };
  return bad;
}

function _rejectGapDecisionTwoSlotEvidence() {
  const bad: PartialGapDecisionInference = {
    ...PARTIAL_GAP_DECISION_FIXTURE,
    // @ts-expect-error GAP_DECISION requires exactly four evidence slots
    evidence_ids: ['gap:decisionPace', 'answer:expressionPace:words_soon'],
  };
  return bad;
}

function _rejectGapDecisionDisagreementGapInAnswerSlot() {
  const bad: PartialGapDecisionInference = {
    ...PARTIAL_GAP_DECISION_FIXTURE,
    evidence_ids: [
      'gap:decisionPace',
      'answer:expressionPace:words_soon',
      // @ts-expect-error disagreement slot requires an answer evidence ID
      'gap:disagreement',
      'answer:returnPattern:time_restores',
    ],
  };
  return bad;
}

function _rejectExpressionOnlyDecisionAnswerInSlotOne() {
  const bad: ExpressionOnlyCentralInference = {
    ...EXPRESSION_ONLY_FIXTURE,
    evidence_ids: [
      // @ts-expect-error expression-only slot 1 requires gap:decisionPace
      'answer:decisionPace:decide_now',
      'answer:expressionPace:words_later',
      'gap:disagreement',
      'gap:returnPattern',
    ],
  };
  return bad;
}

function _rejectStructuralAxisAssignment() {
  const withAxis = {
    ...EXPRESSION_ONLY_FIXTURE,
    pair_axis_id: 'A1' as const,
  };
  // @ts-expect-error structural extra presentation field must be rejected
  const bad: PairCentralInferenceV1 = withAxis;
  return bad;
}

function _rejectStructuralFocusAssignment() {
  const withFocus = {
    ...EXPRESSION_ONLY_FIXTURE,
    focus_id: 'loop_focus' as const,
  };
  // @ts-expect-error structural extra presentation field must be rejected
  const bad: PairCentralInferenceV1 = withFocus;
  return bad;
}

const VALID_DECIDE_NOW_WORDS_VARY_PACE_STATE: PaceStateV1 = {
  pace_alignment_state_id: 'decide_now__words_vary',
  primary_split: {
    locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
    mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
  },
};

const VALID_DECIDE_NOW_WORDS_VARY_REPEAT_STATE: RepeatRiskStateV1 = {
  pace_alignment_state_id: 'decide_now__words_vary',
  primary_split_mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
  loop_context_id: 'LC_TALK_TIME',
};

void _rejectGapDecisionPaceState;
void _rejectGapDecisionRepeatState;
void _rejectGapDisagreementConfirmation;
void _rejectGapReturnConfirmation;
void _rejectExpressionOnlyLoopContext;
void _rejectExpressionOnlyConfirmation;
void _rejectGapDisagreementReturnConflictOnset;
void _rejectPartialFullCoverage;
void _rejectFullPartialCoverage;
void _rejectCentralInferenceAxisFieldLiteral;
void _rejectCentralInferenceFocusFieldLiteral;
void _rejectPaceStateWrongSplitForDecideNowWordsVary;
void _rejectPrimarySplitCrossRowPairing;
void _rejectRepeatRiskWrongMechanicForDecideNowWordsVary;
void _rejectFullEvidenceMissingSlots;
void _rejectGapDecisionTwoSlotEvidence;
void _rejectGapDecisionDisagreementGapInAnswerSlot;
void _rejectExpressionOnlyDecisionAnswerInSlotOne;
void _rejectStructuralAxisAssignment;
void _rejectStructuralFocusAssignment;
void VALID_DECIDE_NOW_WORDS_VARY_PACE_STATE;
void VALID_DECIDE_NOW_WORDS_VARY_REPEAT_STATE;

// ---------------------------------------------------------------------------
// P2 — resolver test constants (independent expected tables)
// ---------------------------------------------------------------------------

const DECISION_ANSWERS: readonly DecisionAnswerEvidenceId[] = [
  'answer:decisionPace:decide_now',
  'answer:decisionPace:decide_later',
  'answer:decisionPace:decide_varies',
];

const EXPRESSION_ANSWERS: readonly ExpressionPaceEvidenceId[] = [
  'answer:expressionPace:words_soon',
  'answer:expressionPace:words_later',
  'answer:expressionPace:words_vary',
];

const DISAGREEMENT_ANSWERS: readonly DisagreementAnswerEvidenceId[] = [
  'answer:disagreement:talk_now',
  'answer:disagreement:take_space',
  'answer:disagreement:one_carries',
];

const RETURN_ANSWERS: readonly ReturnPatternAnswerEvidenceId[] = [
  'answer:returnPattern:someone_reaches',
  'answer:returnPattern:time_restores',
  'answer:returnPattern:return_is_hard',
];

const FIXED_DISAGREEMENT: DisagreementAnswerEvidenceId = 'answer:disagreement:talk_now';
const FIXED_RETURN: ReturnPatternAnswerEvidenceId = 'answer:returnPattern:someone_reaches';

/** Independent 9-row pace table — not derived from production mapping constants. */
const EXPECTED_PACE_ROWS: readonly {
  decision: DecisionAnswerEvidenceId;
  expression: ExpressionPaceEvidenceId;
  pace_alignment_state_id: PaceAlignmentStateId;
  locus_id: PrimarySplitLocusId;
  mechanic_id: PrimarySplitMechanicId;
}[] = [
  {
    decision: 'answer:decisionPace:decide_now',
    expression: 'answer:expressionPace:words_soon',
    pace_alignment_state_id: 'decide_now__words_soon',
    locus_id: 'PSL_BOUNDARY_AND_WORDS_COEMERGE',
    mechanic_id: 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS',
  },
  {
    decision: 'answer:decisionPace:decide_now',
    expression: 'answer:expressionPace:words_later',
    pace_alignment_state_id: 'decide_now__words_later',
    locus_id: 'PSL_BOUNDARY_BEFORE_WORDS',
    mechanic_id: 'PSM_IN_SESSION_BOUNDARY_AHEAD_OF_EXPRESSION',
  },
  {
    decision: 'answer:decisionPace:decide_now',
    expression: 'answer:expressionPace:words_vary',
    pace_alignment_state_id: 'decide_now__words_vary',
    locus_id: 'PSL_IN_SESSION_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
    mechanic_id: 'PSM_FIXED_IN_SESSION_BOUNDARY_VARIABLE_EXPRESSION_TIMING',
  },
  {
    decision: 'answer:decisionPace:decide_later',
    expression: 'answer:expressionPace:words_soon',
    pace_alignment_state_id: 'decide_later__words_soon',
    locus_id: 'PSL_WORDS_AHEAD_OF_DEFERRED_BOUNDARY',
    mechanic_id: 'PSM_QUICK_WORDS_BEFORE_LATER_BOUNDARY',
  },
  {
    decision: 'answer:decisionPace:decide_later',
    expression: 'answer:expressionPace:words_later',
    pace_alignment_state_id: 'decide_later__words_later',
    locus_id: 'PSL_DEFERRED_BOUNDARY_AND_DELAYED_WORDS',
    mechanic_id: 'PSM_DUAL_DELAY_DEFERRED_BOUNDARY_SLOW_EXPRESSION',
  },
  {
    decision: 'answer:decisionPace:decide_later',
    expression: 'answer:expressionPace:words_vary',
    pace_alignment_state_id: 'decide_later__words_vary',
    locus_id: 'PSL_DEFERRED_BOUNDARY_WITH_SCENE_EXPRESSION_TIMING',
    mechanic_id: 'PSM_LATER_BOUNDARY_SCENE_EXPRESSION_TIMING',
  },
  {
    decision: 'answer:decisionPace:decide_varies',
    expression: 'answer:expressionPace:words_soon',
    pace_alignment_state_id: 'decide_varies__words_soon',
    locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_QUICK_WORDS',
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_FAST_EXPRESSION',
  },
  {
    decision: 'answer:decisionPace:decide_varies',
    expression: 'answer:expressionPace:words_later',
    pace_alignment_state_id: 'decide_varies__words_later',
    locus_id: 'PSL_SCENE_BOUNDARY_TOGGLE_WITH_DELAYED_WORDS',
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_PLACEMENT_SLOW_EXPRESSION',
  },
  {
    decision: 'answer:decisionPace:decide_varies',
    expression: 'answer:expressionPace:words_vary',
    pace_alignment_state_id: 'decide_varies__words_vary',
    locus_id: 'PSL_DUAL_SCENE_DEPENDENCY_BOUNDARY_AND_EXPRESSION',
    mechanic_id: 'PSM_VARIABLE_BOUNDARY_AND_EXPRESSION_TIMING',
  },
];

const EXPECTED_CONFLICT_ROWS: readonly {
  disagreement: DisagreementAnswerEvidenceId;
  conflict_onset_id: ConflictOnsetMotionId;
}[] = [
  { disagreement: 'answer:disagreement:talk_now', conflict_onset_id: 'CO_TALK_IN_SESSION' },
  { disagreement: 'answer:disagreement:take_space', conflict_onset_id: 'CO_PAUSE_SPACE' },
  { disagreement: 'answer:disagreement:one_carries', conflict_onset_id: 'CO_TOPIC_CARRY' },
];

const EXPECTED_REENTRY_ROWS: readonly {
  returnPattern: ReturnPatternAnswerEvidenceId;
  reentry_motion_id: ReentryMotionId;
}[] = [
  {
    returnPattern: 'answer:returnPattern:someone_reaches',
    reentry_motion_id: 'RE_EXPLICIT_REACH',
  },
  {
    returnPattern: 'answer:returnPattern:time_restores',
    reentry_motion_id: 'RE_TIME_NATURAL_RESTORE',
  },
  {
    returnPattern: 'answer:returnPattern:return_is_hard',
    reentry_motion_id: 'RE_HEAVY_THRESHOLD',
  },
];

/** Independent 3×3 loop + confirmation table. */
const EXPECTED_LOOP_CONFIRMATION_ROWS: readonly {
  conflict_onset_id: ConflictOnsetMotionId;
  reentry_motion_id: ReentryMotionId;
  loop_context_id: LoopContextId;
  confirmation_anchor_id: ConfirmationAnchorId;
}[] = [
  {
    conflict_onset_id: 'CO_TALK_IN_SESSION',
    reentry_motion_id: 'RE_EXPLICIT_REACH',
    loop_context_id: 'LC_TALK_REACH',
    confirmation_anchor_id: 'CONF_TALK_REACH',
  },
  {
    conflict_onset_id: 'CO_TALK_IN_SESSION',
    reentry_motion_id: 'RE_TIME_NATURAL_RESTORE',
    loop_context_id: 'LC_TALK_TIME',
    confirmation_anchor_id: 'CONF_TALK_TIME',
  },
  {
    conflict_onset_id: 'CO_TALK_IN_SESSION',
    reentry_motion_id: 'RE_HEAVY_THRESHOLD',
    loop_context_id: 'LC_TALK_HEAVY',
    confirmation_anchor_id: 'CONF_TALK_HEAVY',
  },
  {
    conflict_onset_id: 'CO_PAUSE_SPACE',
    reentry_motion_id: 'RE_EXPLICIT_REACH',
    loop_context_id: 'LC_PAUSE_REACH',
    confirmation_anchor_id: 'CONF_PAUSE_REACH',
  },
  {
    conflict_onset_id: 'CO_PAUSE_SPACE',
    reentry_motion_id: 'RE_TIME_NATURAL_RESTORE',
    loop_context_id: 'LC_PAUSE_TIME',
    confirmation_anchor_id: 'CONF_PAUSE_TIME',
  },
  {
    conflict_onset_id: 'CO_PAUSE_SPACE',
    reentry_motion_id: 'RE_HEAVY_THRESHOLD',
    loop_context_id: 'LC_PAUSE_HEAVY',
    confirmation_anchor_id: 'CONF_PAUSE_HEAVY',
  },
  {
    conflict_onset_id: 'CO_TOPIC_CARRY',
    reentry_motion_id: 'RE_EXPLICIT_REACH',
    loop_context_id: 'LC_CARRY_REACH',
    confirmation_anchor_id: 'CONF_CARRY_REACH',
  },
  {
    conflict_onset_id: 'CO_TOPIC_CARRY',
    reentry_motion_id: 'RE_TIME_NATURAL_RESTORE',
    loop_context_id: 'LC_CARRY_TIME',
    confirmation_anchor_id: 'CONF_CARRY_TIME',
  },
  {
    conflict_onset_id: 'CO_TOPIC_CARRY',
    reentry_motion_id: 'RE_HEAVY_THRESHOLD',
    loop_context_id: 'LC_CARRY_HEAVY',
    confirmation_anchor_id: 'CONF_CARRY_HEAVY',
  },
];

type GapCase = {
  gap_signature_id: ObservationGapSignatureId;
  observation_coverage_id: 'FULL' | 'PARTIAL' | 'EXPRESSION_ONLY';
  decision: DecisionAnswerEvidenceId | 'gap:decisionPace';
  disagreement: DisagreementAnswerEvidenceId | 'gap:disagreement';
  returnPattern: ReturnPatternAnswerEvidenceId | 'gap:returnPattern';
  hasPace: boolean;
  hasConflict: boolean;
  hasReentry: boolean;
  hasLoop: boolean;
  hasConfirmation: boolean;
  hasRepeat: boolean;
};

const GAP_CASES: readonly GapCase[] = [
  {
    gap_signature_id: 'GAP_NONE',
    observation_coverage_id: 'FULL',
    decision: 'answer:decisionPace:decide_now',
    disagreement: 'answer:disagreement:talk_now',
    returnPattern: 'answer:returnPattern:someone_reaches',
    hasPace: true,
    hasConflict: true,
    hasReentry: true,
    hasLoop: true,
    hasConfirmation: true,
    hasRepeat: true,
  },
  {
    gap_signature_id: 'GAP_DECISION',
    observation_coverage_id: 'PARTIAL',
    decision: 'gap:decisionPace',
    disagreement: 'answer:disagreement:talk_now',
    returnPattern: 'answer:returnPattern:someone_reaches',
    hasPace: false,
    hasConflict: true,
    hasReentry: true,
    hasLoop: true,
    hasConfirmation: true,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_DISAGREEMENT',
    observation_coverage_id: 'PARTIAL',
    decision: 'answer:decisionPace:decide_now',
    disagreement: 'gap:disagreement',
    returnPattern: 'answer:returnPattern:someone_reaches',
    hasPace: true,
    hasConflict: false,
    hasReentry: true,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_RETURN',
    observation_coverage_id: 'PARTIAL',
    decision: 'answer:decisionPace:decide_now',
    disagreement: 'answer:disagreement:talk_now',
    returnPattern: 'gap:returnPattern',
    hasPace: true,
    hasConflict: true,
    hasReentry: false,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_DECISION_DISAGREEMENT',
    observation_coverage_id: 'PARTIAL',
    decision: 'gap:decisionPace',
    disagreement: 'gap:disagreement',
    returnPattern: 'answer:returnPattern:someone_reaches',
    hasPace: false,
    hasConflict: false,
    hasReentry: true,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_DECISION_RETURN',
    observation_coverage_id: 'PARTIAL',
    decision: 'gap:decisionPace',
    disagreement: 'answer:disagreement:talk_now',
    returnPattern: 'gap:returnPattern',
    hasPace: false,
    hasConflict: true,
    hasReentry: false,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_DISAGREEMENT_RETURN',
    observation_coverage_id: 'PARTIAL',
    decision: 'answer:decisionPace:decide_now',
    disagreement: 'gap:disagreement',
    returnPattern: 'gap:returnPattern',
    hasPace: true,
    hasConflict: false,
    hasReentry: false,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
  {
    gap_signature_id: 'GAP_DECISION_DISAGREEMENT_RETURN',
    observation_coverage_id: 'EXPRESSION_ONLY',
    decision: 'gap:decisionPace',
    disagreement: 'gap:disagreement',
    returnPattern: 'gap:returnPattern',
    hasPace: false,
    hasConflict: false,
    hasReentry: false,
    hasLoop: false,
    hasConfirmation: false,
    hasRepeat: false,
  },
];

function buildEvidence(
  decision: DecisionAnswerEvidenceId | 'gap:decisionPace',
  expression: ExpressionPaceEvidenceId,
  disagreement: DisagreementAnswerEvidenceId | 'gap:disagreement',
  returnPattern: ReturnPatternAnswerEvidenceId | 'gap:returnPattern',
): PairCentralInferenceEvidenceInputV1 {
  return [decision, expression, disagreement, returnPattern];
}

function hasField(output: PairCentralInferenceV1, field: string): boolean {
  return field in output && (output as Record<string, unknown>)[field] !== undefined;
}

describe('pair central inference v1 resolver (P2)', () => {
  it('maps 9/9 decision × expression pace rows', () => {
    let count = 0;
    for (const row of EXPECTED_PACE_ROWS) {
      const evidence = buildEvidence(row.decision, row.expression, FIXED_DISAGREEMENT, FIXED_RETURN);
      const output = resolvePairCentralInferenceV1(evidence);
      assert.equal(output.gap_signature_id, 'GAP_NONE');
      assert.ok(output.pace_state);
      assert.equal(output.pace_state.pace_alignment_state_id, row.pace_alignment_state_id);
      assert.equal(output.pace_state.primary_split.locus_id, row.locus_id);
      assert.equal(output.pace_state.primary_split.mechanic_id, row.mechanic_id);
      count += 1;
    }
    assert.equal(count, 9);
  });

  it('maps 3/3 disagreement answers to conflict onset', () => {
    let count = 0;
    for (const row of EXPECTED_CONFLICT_ROWS) {
      const evidence = buildEvidence(
        'answer:decisionPace:decide_now',
        'answer:expressionPace:words_soon',
        row.disagreement,
        FIXED_RETURN,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      assert.equal(output.conflict_onset_id, row.conflict_onset_id);
      count += 1;
    }
    assert.equal(count, 3);
  });

  it('maps 3/3 return answers to reentry motion', () => {
    let count = 0;
    for (const row of EXPECTED_REENTRY_ROWS) {
      const evidence = buildEvidence(
        'answer:decisionPace:decide_now',
        'answer:expressionPace:words_soon',
        FIXED_DISAGREEMENT,
        row.returnPattern,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      assert.equal(output.reentry_motion_id, row.reentry_motion_id);
      count += 1;
    }
    assert.equal(count, 3);
  });

  it('maps 9/9 conflict × reentry loop contexts and confirmations', () => {
    let loopCount = 0;
    let confirmCount = 0;
    for (const row of EXPECTED_LOOP_CONFIRMATION_ROWS) {
      const disagreement =
        row.conflict_onset_id === 'CO_TALK_IN_SESSION'
          ? 'answer:disagreement:talk_now'
          : row.conflict_onset_id === 'CO_PAUSE_SPACE'
            ? 'answer:disagreement:take_space'
            : 'answer:disagreement:one_carries';
      const returnPattern =
        row.reentry_motion_id === 'RE_EXPLICIT_REACH'
          ? 'answer:returnPattern:someone_reaches'
          : row.reentry_motion_id === 'RE_TIME_NATURAL_RESTORE'
            ? 'answer:returnPattern:time_restores'
            : 'answer:returnPattern:return_is_hard';
      const evidence = buildEvidence(
        'answer:decisionPace:decide_now',
        'answer:expressionPace:words_soon',
        disagreement,
        returnPattern,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      assert.equal(output.loop_context_id, row.loop_context_id);
      assert.equal(output.confirmation?.anchor_id, row.confirmation_anchor_id);
      loopCount += 1;
      confirmCount += 1;
    }
    assert.equal(loopCount, 9);
    assert.equal(confirmCount, 9);
  });

  it('resolves 81/81 full compositions (3×3×3×3)', () => {
    let count = 0;
    for (const decision of DECISION_ANSWERS) {
      for (const expression of EXPRESSION_ANSWERS) {
        for (const disagreement of DISAGREEMENT_ANSWERS) {
          for (const returnPattern of RETURN_ANSWERS) {
            const evidence = buildEvidence(decision, expression, disagreement, returnPattern);
            const output = resolvePairCentralInferenceV1(evidence);
            assert.deepEqual(output.evidence_ids, evidence);
            assert.equal(output.gap_signature_id, 'GAP_NONE');
            assert.equal(output.observation_coverage_id, 'FULL');

            const paceRow = EXPECTED_PACE_ROWS.find(
              (r) => r.decision === decision && r.expression === expression,
            );
            assert.ok(paceRow);
            assert.ok(output.pace_state);
            assert.equal(output.pace_state.pace_alignment_state_id, paceRow.pace_alignment_state_id);
            assert.equal(output.pace_state.primary_split.locus_id, paceRow.locus_id);
            assert.equal(output.pace_state.primary_split.mechanic_id, paceRow.mechanic_id);

            const conflictRow = EXPECTED_CONFLICT_ROWS.find((r) => r.disagreement === disagreement);
            assert.ok(conflictRow);
            assert.equal(output.conflict_onset_id, conflictRow.conflict_onset_id);

            const reentryRow = EXPECTED_REENTRY_ROWS.find((r) => r.returnPattern === returnPattern);
            assert.ok(reentryRow);
            assert.equal(output.reentry_motion_id, reentryRow.reentry_motion_id);

            const loopRow = EXPECTED_LOOP_CONFIRMATION_ROWS.find(
              (r) =>
                r.conflict_onset_id === output.conflict_onset_id &&
                r.reentry_motion_id === output.reentry_motion_id,
            );
            assert.ok(loopRow);
            assert.equal(output.loop_context_id, loopRow.loop_context_id);
            assert.equal(output.confirmation?.anchor_id, loopRow.confirmation_anchor_id);

            const expressionState =
              expression === 'answer:expressionPace:words_soon'
                ? 'words_soon'
                : expression === 'answer:expressionPace:words_later'
                  ? 'words_later'
                  : 'words_vary';
            assert.equal(output.expression_pace_state, expressionState);

            assert.ok(output.repeat_state);
            assert.equal(
              output.repeat_state.pace_alignment_state_id,
              output.pace_state.pace_alignment_state_id,
            );
            assert.equal(
              output.repeat_state.primary_split_mechanic_id,
              output.pace_state.primary_split.mechanic_id,
            );
            assert.equal(output.repeat_state.loop_context_id, output.loop_context_id);
            count += 1;
          }
        }
      }
    }
    assert.equal(count, 81);
  });

  it('resolves 8/8 gap signatures with exact field presence', () => {
    const expression: ExpressionPaceEvidenceId = 'answer:expressionPace:words_soon';
    let count = 0;
    for (const gapCase of GAP_CASES) {
      const evidence = buildEvidence(
        gapCase.decision,
        expression,
        gapCase.disagreement,
        gapCase.returnPattern,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      assert.deepEqual(output.evidence_ids, evidence);
      assert.equal(output.gap_signature_id, gapCase.gap_signature_id);
      assert.equal(output.observation_coverage_id, gapCase.observation_coverage_id);
      assert.equal(hasField(output, 'pace_state'), gapCase.hasPace);
      assert.equal(hasField(output, 'conflict_onset_id'), gapCase.hasConflict);
      assert.equal(hasField(output, 'reentry_motion_id'), gapCase.hasReentry);
      assert.equal(hasField(output, 'loop_context_id'), gapCase.hasLoop);
      assert.equal(hasField(output, 'confirmation'), gapCase.hasConfirmation);
      assert.equal(hasField(output, 'repeat_state'), gapCase.hasRepeat);
      count += 1;
    }
    assert.equal(count, 8);
  });

  it('GAP_DECISION retains conflict, reentry, loop, confirmation without pace or repeat', () => {
    const evidence = buildEvidence(
      'gap:decisionPace',
      'answer:expressionPace:words_later',
      'answer:disagreement:take_space',
      'answer:returnPattern:time_restores',
    );
    const output = resolvePairCentralInferenceV1(evidence);
    assert.equal(output.gap_signature_id, 'GAP_DECISION');
    assert.equal(hasField(output, 'pace_state'), false);
    assert.equal(output.conflict_onset_id, 'CO_PAUSE_SPACE');
    assert.equal(output.reentry_motion_id, 'RE_TIME_NATURAL_RESTORE');
    assert.equal(output.loop_context_id, 'LC_PAUSE_TIME');
    assert.equal(output.confirmation?.anchor_id, 'CONF_PAUSE_TIME');
    assert.equal(hasField(output, 'repeat_state'), false);
  });

  it('confirmation is stable across 9×9 decision×expression variations per conflict×return', () => {
    let stabilityCount = 0;
    for (const loopRow of EXPECTED_LOOP_CONFIRMATION_ROWS) {
      const disagreement =
        loopRow.conflict_onset_id === 'CO_TALK_IN_SESSION'
          ? 'answer:disagreement:talk_now'
          : loopRow.conflict_onset_id === 'CO_PAUSE_SPACE'
            ? 'answer:disagreement:take_space'
            : 'answer:disagreement:one_carries';
      const returnPattern =
        loopRow.reentry_motion_id === 'RE_EXPLICIT_REACH'
          ? 'answer:returnPattern:someone_reaches'
          : loopRow.reentry_motion_id === 'RE_TIME_NATURAL_RESTORE'
            ? 'answer:returnPattern:time_restores'
            : 'answer:returnPattern:return_is_hard';

      for (const decision of DECISION_ANSWERS) {
        for (const expression of EXPRESSION_ANSWERS) {
          const evidence = buildEvidence(decision, expression, disagreement, returnPattern);
          const output = resolvePairCentralInferenceV1(evidence);
          assert.equal(output.confirmation?.anchor_id, loopRow.confirmation_anchor_id);
          stabilityCount += 1;
        }
      }
    }
    assert.equal(stabilityCount, 81);
  });

  it('GAP_DECISION confirmation depends only on disagreement + return', () => {
    const disagreement: DisagreementAnswerEvidenceId = 'answer:disagreement:one_carries';
    const returnPattern: ReturnPatternAnswerEvidenceId = 'answer:returnPattern:return_is_hard';
    const expectedConfirmation: ConfirmationAnchorId = 'CONF_CARRY_HEAVY';

    for (const decision of DECISION_ANSWERS) {
      for (const expression of EXPRESSION_ANSWERS) {
        const fullEvidence = buildEvidence(decision, expression, disagreement, returnPattern);
        const gapEvidence = buildEvidence('gap:decisionPace', expression, disagreement, returnPattern);
        const fullOutput = resolvePairCentralInferenceV1(fullEvidence);
        const gapOutput = resolvePairCentralInferenceV1(gapEvidence);
        assert.equal(fullOutput.confirmation?.anchor_id, expectedConfirmation);
        assert.equal(gapOutput.confirmation?.anchor_id, expectedConfirmation);
      }
    }
  });

  it('gap fail-closed: repeat_state only on GAP_NONE', () => {
    const expression: ExpressionPaceEvidenceId = 'answer:expressionPace:words_vary';
    for (const gapCase of GAP_CASES) {
      const evidence = buildEvidence(
        gapCase.decision,
        expression,
        gapCase.disagreement,
        gapCase.returnPattern,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      if (gapCase.gap_signature_id === 'GAP_NONE') {
        assert.ok(output.repeat_state);
      } else {
        assert.equal(hasField(output, 'repeat_state'), false);
      }
    }
  });

  it('gap fail-closed: loop and confirmation only when disagreement and return observed', () => {
    const expression: ExpressionPaceEvidenceId = 'answer:expressionPace:words_soon';
    for (const gapCase of GAP_CASES) {
      const evidence = buildEvidence(
        gapCase.decision,
        expression,
        gapCase.disagreement,
        gapCase.returnPattern,
      );
      const output = resolvePairCentralInferenceV1(evidence);
      const bothObserved =
        gapCase.gap_signature_id === 'GAP_NONE' || gapCase.gap_signature_id === 'GAP_DECISION';
      assert.equal(hasField(output, 'loop_context_id'), bothObserved);
      assert.equal(hasField(output, 'confirmation'), bothObserved);
    }
  });

  it('gap fail-closed: no forbidden gap placeholder semantic IDs', () => {
    const forbidden = [
      'RR_GAP_',
      'CO_UNOBSERVED',
      'RE_UNOBSERVED',
      'CONF_GAP_',
    ];
    const expression: ExpressionPaceEvidenceId = 'answer:expressionPace:words_later';
    for (const gapCase of GAP_CASES) {
      const evidence = buildEvidence(
        gapCase.decision,
        expression,
        gapCase.disagreement,
        gapCase.returnPattern,
      );
      const serialized = JSON.stringify(resolvePairCentralInferenceV1(evidence));
      for (const prefix of forbidden) {
        assert.equal(serialized.includes(prefix), false);
      }
    }
  });

  it('preserves evidence_ids exactly without mutation', () => {
    const evidence = buildEvidence(
      'answer:decisionPace:decide_later',
      'answer:expressionPace:words_vary',
      'answer:disagreement:take_space',
      'answer:returnPattern:time_restores',
    );
    const frozen = [...evidence] as PairCentralInferenceEvidenceInputV1;
    const output = resolvePairCentralInferenceV1(frozen);
    assert.deepEqual(output.evidence_ids, frozen);
    assert.deepEqual(frozen, evidence);
  });

  it('is deterministic: same input yields deeply equal output', () => {
    const evidence = buildEvidence(
      'answer:decisionPace:decide_varies',
      'answer:expressionPace:words_later',
      'answer:disagreement:one_carries',
      'answer:returnPattern:someone_reaches',
    );
    const first = resolvePairCentralInferenceV1(evidence);
    const second = resolvePairCentralInferenceV1(evidence);
    assert.deepEqual(first, second);
  });

  it('isolates output references: full observation mutation regression', () => {
    const input = buildEvidence(
      'answer:decisionPace:decide_now',
      'answer:expressionPace:words_soon',
      'answer:disagreement:talk_now',
      'answer:returnPattern:someone_reaches',
    );
    const canonicalMechanic = 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS';

    const first = resolvePairCentralInferenceV1(input);
    const second = resolvePairCentralInferenceV1(input);

    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.ok(first.pace_state);
    assert.ok(second.pace_state);
    assert.notEqual(first.pace_state, second.pace_state);
    assert.notEqual(first.pace_state.primary_split, second.pace_state.primary_split);
    assert.ok(first.repeat_state);
    assert.ok(second.repeat_state);
    assert.notEqual(first.repeat_state, second.repeat_state);
    assert.ok(first.confirmation);
    assert.ok(second.confirmation);
    assert.notEqual(first.confirmation, second.confirmation);
    assert.notEqual(first.evidence_ids, second.evidence_ids);
    assert.notEqual(first.evidence_ids, input);

    Reflect.set(first.pace_state.primary_split, 'mechanic_id', 'PSM_MUTATED_SENTINEL');

    const third = resolvePairCentralInferenceV1(input);
    assert.ok(third.pace_state);
    assert.equal(third.pace_state.primary_split.mechanic_id, canonicalMechanic);
    assert.equal(second.pace_state.primary_split.mechanic_id, canonicalMechanic);
  });

  it('isolates evidence_ids from caller input mutation', () => {
    const backing = [
      'answer:decisionPace:decide_now',
      'answer:expressionPace:words_soon',
      'answer:disagreement:talk_now',
      'answer:returnPattern:someone_reaches',
    ] as PairCentralInferenceEvidenceInputV1;

    const result = resolvePairCentralInferenceV1(backing);
    assert.deepEqual(result.evidence_ids, backing);
    assert.notEqual(result.evidence_ids, backing);

    Reflect.set(backing, 0, 'gap:decisionPace');
    assert.equal(result.evidence_ids[0], 'answer:decisionPace:decide_now');

    const input = buildEvidence(
      'answer:decisionPace:decide_later',
      'answer:expressionPace:words_later',
      'answer:disagreement:take_space',
      'answer:returnPattern:time_restores',
    );
    const freshResult = resolvePairCentralInferenceV1(input);
    Reflect.set(freshResult.evidence_ids, 0, 'gap:decisionPace');
    assert.equal(input[0], 'answer:decisionPace:decide_later');
  });

  it('isolates pace_state references on GAP_DISAGREEMENT_RETURN', () => {
    const evidence = buildEvidence(
      'answer:decisionPace:decide_now',
      'answer:expressionPace:words_soon',
      'gap:disagreement',
      'gap:returnPattern',
    );
    const canonicalMechanic = 'PSM_IN_SESSION_BOUNDARY_WITH_QUICK_WORDS';

    const first = resolvePairCentralInferenceV1(evidence);
    const second = resolvePairCentralInferenceV1(evidence);

    assert.ok(first.pace_state);
    assert.ok(second.pace_state);
    assert.notEqual(first.pace_state, second.pace_state);
    assert.notEqual(first.pace_state.primary_split, second.pace_state.primary_split);

    Reflect.set(first.pace_state.primary_split, 'mechanic_id', 'PSM_MUTATED_SENTINEL');
    assert.equal(second.pace_state.primary_split.mechanic_id, canonicalMechanic);
  });
});
