/**
 * Literal governed option semantic registrations — no runtime parent-axis derivation.
 */

import type { OptionAxisRegistration } from "../../../commercialQuality/japaneseComprehensionTypes";

export type GovernedQuestionOptionSemantic = {
  stageId: string;
  questionId: string;
  answerId: string;
  optionCopyId: string;
  selectorSemanticAxis: string;
  semanticAxis: string;
  semanticValue: string;
};

export const M55_RELATION_STAGE_OPTION_SEMANTICS = [
  { optionCopyId: 'pair.relation_stage.R1', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R1' },
  { optionCopyId: 'pair.relation_stage.R2', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R2' },
  { optionCopyId: 'pair.relation_stage.R3', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R3' },
  { optionCopyId: 'pair.relation_stage.R4', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R4' },
  { optionCopyId: 'pair.relation_stage.R5', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R5' },
  { optionCopyId: 'pair.relation_stage.R6', semanticAxis: 'relation_stage_selector', semanticValue: 'relation_stage.R6' },
] as const;

export const M55_QUESTION_OPTION_SEMANTICS = [
  { stageId: 'R1', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R1.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R1', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R1.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R1', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R1.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R1', questionId: 'approachIntent', answerId: 'wait_for_signal', optionCopyId: 'pair.answer.R1.approachIntent.wait_for_signal', selectorSemanticAxis: 'approach_intent', semanticAxis: 'approach_intent', semanticValue: 'wait_for_signal' },
  { stageId: 'R1', questionId: 'approachIntent', answerId: 'consider_reaching', optionCopyId: 'pair.answer.R1.approachIntent.consider_reaching', selectorSemanticAxis: 'approach_intent', semanticAxis: 'approach_intent', semanticValue: 'consider_reaching' },
  { stageId: 'R1', questionId: 'approachIntent', answerId: 'unsure_yet', optionCopyId: 'pair.answer.R1.approachIntent.unsure_yet', selectorSemanticAxis: 'approach_intent', semanticAxis: 'approach_intent', semanticValue: 'unsure_yet' },
  { stageId: 'R2', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R2.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R2', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R2.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R2', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R2.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R2', questionId: 'contactPace', answerId: 'light_contact', optionCopyId: 'pair.answer.R2.contactPace.light_contact', selectorSemanticAxis: 'contact_frequency', semanticAxis: 'contact_frequency', semanticValue: 'light_contact' },
  { stageId: 'R2', questionId: 'contactPace', answerId: 'steady_contact', optionCopyId: 'pair.answer.R2.contactPace.steady_contact', selectorSemanticAxis: 'contact_frequency', semanticAxis: 'contact_frequency', semanticValue: 'steady_contact' },
  { stageId: 'R2', questionId: 'contactPace', answerId: 'contact_varies', optionCopyId: 'pair.answer.R2.contactPace.contact_varies', selectorSemanticAxis: 'contact_frequency', semanticAxis: 'contact_frequency', semanticValue: 'contact_varies' },
  { stageId: 'R3', questionId: 'decisionPace', answerId: 'decide_now', optionCopyId: 'pair.answer.R3.decisionPace.decide_now', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_now' },
  { stageId: 'R3', questionId: 'decisionPace', answerId: 'decide_later', optionCopyId: 'pair.answer.R3.decisionPace.decide_later', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_later' },
  { stageId: 'R3', questionId: 'decisionPace', answerId: 'decide_varies', optionCopyId: 'pair.answer.R3.decisionPace.decide_varies', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_varies' },
  { stageId: 'R3', questionId: 'disagreement', answerId: 'talk_now', optionCopyId: 'pair.answer.R3.disagreement.talk_now', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'talk_now' },
  { stageId: 'R3', questionId: 'disagreement', answerId: 'take_space', optionCopyId: 'pair.answer.R3.disagreement.take_space', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'take_space' },
  { stageId: 'R3', questionId: 'disagreement', answerId: 'one_carries', optionCopyId: 'pair.answer.R3.disagreement.one_carries', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'one_carries' },
  { stageId: 'R3', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R3.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R3', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R3.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R3', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R3.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R3', questionId: 'returnPattern', answerId: 'someone_reaches', optionCopyId: 'pair.answer.R3.returnPattern.someone_reaches', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'someone_reaches' },
  { stageId: 'R3', questionId: 'returnPattern', answerId: 'time_restores', optionCopyId: 'pair.answer.R3.returnPattern.time_restores', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'time_restores' },
  { stageId: 'R3', questionId: 'returnPattern', answerId: 'return_is_hard', optionCopyId: 'pair.answer.R3.returnPattern.return_is_hard', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'return_is_hard' },
  { stageId: 'R4', questionId: 'distance', answerId: 'explain_space', optionCopyId: 'pair.answer.R4.distance.explain_space', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'explain_space' },
  { stageId: 'R4', questionId: 'distance', answerId: 'go_quiet', optionCopyId: 'pair.answer.R4.distance.go_quiet', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'go_quiet' },
  { stageId: 'R4', questionId: 'distance', answerId: 'space_is_hard', optionCopyId: 'pair.answer.R4.distance.space_is_hard', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'space_is_hard' },
  { stageId: 'R4', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R4.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R4', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R4.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R4', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R4.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R5', questionId: 'reapproachReadiness', answerId: 'small_step_first', optionCopyId: 'pair.answer.R5.reapproachReadiness.small_step_first', selectorSemanticAxis: 'reapproach_readiness', semanticAxis: 'reapproach_readiness', semanticValue: 'small_step_first' },
  { stageId: 'R5', questionId: 'reapproachReadiness', answerId: 'need_clarity_first', optionCopyId: 'pair.answer.R5.reapproachReadiness.need_clarity_first', selectorSemanticAxis: 'reapproach_readiness', semanticAxis: 'reapproach_readiness', semanticValue: 'need_clarity_first' },
  { stageId: 'R5', questionId: 'reapproachReadiness', answerId: 'timing_uncertain', optionCopyId: 'pair.answer.R5.reapproachReadiness.timing_uncertain', selectorSemanticAxis: 'reapproach_readiness', semanticAxis: 'reapproach_readiness', semanticValue: 'timing_uncertain' },
  { stageId: 'R5', questionId: 'reapproachReadiness', answerId: 'not_considering_reapproach', optionCopyId: 'pair.answer.R5.reapproachReadiness.not_considering_reapproach', selectorSemanticAxis: 'reapproach_readiness', semanticAxis: 'reapproach_readiness', semanticValue: 'not_considering_reapproach' },
  { stageId: 'R5', questionId: 'distance', answerId: 'explain_space', optionCopyId: 'pair.answer.R5.distance.explain_space', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'explain_space' },
  { stageId: 'R5', questionId: 'distance', answerId: 'go_quiet', optionCopyId: 'pair.answer.R5.distance.go_quiet', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'go_quiet' },
  { stageId: 'R5', questionId: 'distance', answerId: 'space_is_hard', optionCopyId: 'pair.answer.R5.distance.space_is_hard', selectorSemanticAxis: 'distance_state', semanticAxis: 'distance_state', semanticValue: 'space_is_hard' },
  { stageId: 'R5', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R5.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R5', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R5.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R5', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R5.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R6', questionId: 'decisionPace', answerId: 'decide_now', optionCopyId: 'pair.answer.R6.decisionPace.decide_now', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_now' },
  { stageId: 'R6', questionId: 'decisionPace', answerId: 'decide_later', optionCopyId: 'pair.answer.R6.decisionPace.decide_later', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_later' },
  { stageId: 'R6', questionId: 'decisionPace', answerId: 'decide_varies', optionCopyId: 'pair.answer.R6.decisionPace.decide_varies', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'decide_varies' },
  { stageId: 'R6', questionId: 'disagreement', answerId: 'talk_now', optionCopyId: 'pair.answer.R6.disagreement.talk_now', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'talk_now' },
  { stageId: 'R6', questionId: 'disagreement', answerId: 'take_space', optionCopyId: 'pair.answer.R6.disagreement.take_space', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'take_space' },
  { stageId: 'R6', questionId: 'disagreement', answerId: 'one_carries', optionCopyId: 'pair.answer.R6.disagreement.one_carries', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'one_carries' },
  { stageId: 'R6', questionId: 'expressionPace', answerId: 'words_soon', optionCopyId: 'pair.answer.R6.expressionPace.words_soon', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_soon' },
  { stageId: 'R6', questionId: 'expressionPace', answerId: 'words_later', optionCopyId: 'pair.answer.R6.expressionPace.words_later', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_later' },
  { stageId: 'R6', questionId: 'expressionPace', answerId: 'words_vary', optionCopyId: 'pair.answer.R6.expressionPace.words_vary', selectorSemanticAxis: 'expression_timing', semanticAxis: 'expression_timing', semanticValue: 'words_vary' },
  { stageId: 'R6', questionId: 'returnPattern', answerId: 'someone_reaches', optionCopyId: 'pair.answer.R6.returnPattern.someone_reaches', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'someone_reaches' },
  { stageId: 'R6', questionId: 'returnPattern', answerId: 'time_restores', optionCopyId: 'pair.answer.R6.returnPattern.time_restores', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'time_restores' },
  { stageId: 'R6', questionId: 'returnPattern', answerId: 'return_is_hard', optionCopyId: 'pair.answer.R6.returnPattern.return_is_hard', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'return_is_hard' },
  { stageId: 'R3', questionId: 'decisionPace', answerId: 'no_shared_decision_yet', optionCopyId: 'pair.answer.R3.decisionPace.no_shared_decision_yet', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'no_shared_decision_yet' },
  { stageId: 'R6', questionId: 'decisionPace', answerId: 'no_shared_decision_yet', optionCopyId: 'pair.answer.R6.decisionPace.no_shared_decision_yet', selectorSemanticAxis: 'decision_timing', semanticAxis: 'decision_timing', semanticValue: 'no_shared_decision_yet' },
  { stageId: 'R3', questionId: 'disagreement', answerId: 'no_disagreement_yet', optionCopyId: 'pair.answer.R3.disagreement.no_disagreement_yet', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'no_disagreement_yet' },
  { stageId: 'R6', questionId: 'disagreement', answerId: 'no_disagreement_yet', optionCopyId: 'pair.answer.R6.disagreement.no_disagreement_yet', selectorSemanticAxis: 'conflict_handling', semanticAxis: 'conflict_handling', semanticValue: 'no_disagreement_yet' },
  { stageId: 'R3', questionId: 'returnPattern', answerId: 'no_misalignment_return_yet', optionCopyId: 'pair.answer.R3.returnPattern.no_misalignment_return_yet', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'no_misalignment_return_yet' },
  { stageId: 'R6', questionId: 'returnPattern', answerId: 'no_misalignment_return_yet', optionCopyId: 'pair.answer.R6.returnPattern.no_misalignment_return_yet', selectorSemanticAxis: 'reconciliation_pattern', semanticAxis: 'reconciliation_pattern', semanticValue: 'no_misalignment_return_yet' },
] as const;

const QUESTION_OPTION_BY_COPY_ID = new Map<string, GovernedQuestionOptionSemantic>(
  M55_QUESTION_OPTION_SEMANTICS.map((entry) => [entry.optionCopyId, entry]),
);

export function buildM55OptionAxisRegistrationsFromGovernedSemantics(): readonly OptionAxisRegistration[] {
  const registrations: OptionAxisRegistration[] = [
    {
      selectorCopyId: "pair.relation_stage.selector",
      semanticAxis: "relation_stage_selector",
      options: M55_RELATION_STAGE_OPTION_SEMANTICS.map((entry) => ({
        optionCopyId: entry.optionCopyId,
        semanticAxis: entry.semanticAxis,
        semanticValue: entry.semanticValue,
      })),
    },
  ];
  const selectors = new Map<string, GovernedQuestionOptionSemantic[]>();
  for (const entry of M55_QUESTION_OPTION_SEMANTICS) {
    const selectorCopyId = `pair.question.${entry.stageId}.${entry.questionId}`;
    const bucket = selectors.get(selectorCopyId) ?? [];
    bucket.push(entry);
    selectors.set(selectorCopyId, bucket);
  }
  for (const [selectorCopyId, entries] of selectors) {
    registrations.push({
      selectorCopyId,
      semanticAxis: entries[0]!.selectorSemanticAxis,
      options: entries.map((entry) => ({
        optionCopyId: entry.optionCopyId,
        semanticAxis: entry.semanticAxis,
        semanticValue: entry.semanticValue,
      })),
    });
  }
  return registrations;
}

export function lookupGovernedQuestionOptionSemantic(optionCopyId: string) {
  return QUESTION_OPTION_BY_COPY_ID.get(optionCopyId) ?? null;
}

export function countParentDerivedOptionAxes(registrations: readonly OptionAxisRegistration[]): number {
  let violations = 0;
  for (const reg of registrations) {
    if (reg.selectorCopyId === 'pair.relation_stage.selector') {
      for (const option of reg.options) {
        const governed = M55_RELATION_STAGE_OPTION_SEMANTICS.find(
          (entry) => entry.optionCopyId === option.optionCopyId,
        );
        if (
          !governed ||
          governed.semanticAxis !== option.semanticAxis ||
          governed.semanticValue !== option.semanticValue
        ) {
          violations += 1;
        }
      }
      continue;
    }
    for (const option of reg.options) {
      const governed = lookupGovernedQuestionOptionSemantic(option.optionCopyId);
      if (
        !governed ||
        governed.semanticAxis !== option.semanticAxis ||
        governed.semanticValue !== option.semanticValue
      ) {
        violations += 1;
      }
    }
  }
  return violations;
}
