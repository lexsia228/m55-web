/**
 * Immutable question-source evidence for answerability baseline binding.
 */

import { questionsForRelationStage } from '../../compatibility/currentContextContract.v2';
import type { RelationStatusId } from '../../compatibility/pairReadingTypes';
import type { QuestionScenarioEvaluation } from '../../../commercialQuality/japaneseComprehensionTypes';

export type QuestionSourceEvidence = {
  relationStageId: RelationStatusId;
  questionId: string;
  questionText: string;
  answerIds: readonly string[];
  choiceLabels: readonly string[];
};

export function getQuestionSourceEvidence(
  relationStageId: RelationStatusId,
  questionId: string,
): QuestionSourceEvidence | null {
  const question = questionsForRelationStage(relationStageId).find((q) => q.questionId === questionId);
  if (!question) return null;
  return {
    relationStageId,
    questionId,
    questionText: question.question,
    answerIds: question.choices.map((choice) => choice.answerId),
    choiceLabels: question.choices.map((choice) => choice.label),
  };
}

export function encodeAnswerChoicePairs(
  answerIds: readonly string[],
  choiceLabels: readonly string[],
): string {
  return answerIds.map((answerId, index) => `${answerId}:${choiceLabels[index] ?? ''}`).join(';');
}

export function computeQuestionAnswerabilitySourceFingerprint(
  evaluation: Pick<QuestionScenarioEvaluation, 'scenarioId' | 'relationStageId' | 'questionId' | 'applicability'>,
): string {
  const source = getQuestionSourceEvidence(
    evaluation.relationStageId as RelationStatusId,
    evaluation.questionId,
  );
  if (!source) {
    return `missing_source|stage=${evaluation.relationStageId}|question=${evaluation.questionId}`;
  }
  return [
    evaluation.scenarioId,
    evaluation.relationStageId,
    evaluation.questionId,
    evaluation.applicability,
    source.questionText,
    encodeAnswerChoicePairs(source.answerIds, source.choiceLabels),
  ].join('|');
}

export function computeQuestionAnswerabilityBaselineFingerprint(input: {
  category: string;
  copyId: string | null;
  surfaceId: string | null;
  runtimeStateId: string | null;
  deterministicEvidence: string;
  currentTextOrItem: string;
}): string {
  return [
    input.category,
    input.copyId ?? '',
    input.surfaceId ?? '',
    input.runtimeStateId ?? '',
    input.deterministicEvidence,
    input.currentTextOrItem,
  ].join('|');
}
