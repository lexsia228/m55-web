/**
 * Deterministic Pair scenario matrix for question applicability / answerability.
 */

import { questionsForRelationStage } from '../../compatibility/currentContextContract.v2';
import { RELATION_STATUS_IDS } from '../../compatibility/pairReadingCatalog.v1';
import type { RelationStatusId } from '../../compatibility/pairReadingTypes';
import type { NoObservationChoiceRegistry, QuestionStageBinding } from '../../../commercialQuality/japaneseComprehensionChecks';
import type {
  PairScenarioId,
  QuestionScenarioEvaluation,
  QuestionSemanticMetadata,
} from '../../../commercialQuality/japaneseComprehensionTypes';

/** Explicit NO_OBSERVATION semantics must be registered per stage + answerId. */
export const M55_NO_OBSERVATION_CHOICE_REGISTRY: NoObservationChoiceRegistry = {};

export function buildQuestionStageBindings(): readonly QuestionStageBinding[] {
  const bindings: QuestionStageBinding[] = [];
  for (const stageId of RELATION_STATUS_IDS) {
    for (const q of questionsForRelationStage(stageId)) {
      bindings.push({ questionId: q.questionId, relationStageId: stageId });
    }
  }
  return bindings;
}

export const PAIR_SCENARIO_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'NEVER_SPOKEN',
  'NO_SHARED_DECISION_YET',
  'NO_DISAGREEMENT_YET',
  'INSUFFICIENT_OBSERVATION',
] as const satisfies readonly PairScenarioId[];

const STAGE_FOR_SCENARIO: Readonly<Record<PairScenarioId, RelationStatusId>> = {
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
  R4: 'R4',
  R5: 'R5',
  R6: 'R6',
  NEVER_SPOKEN: 'R1',
  NO_SHARED_DECISION_YET: 'R3',
  NO_DISAGREEMENT_YET: 'R3',
  INSUFFICIENT_OBSERVATION: 'R2',
};

export const QUESTION_SEMANTIC_METADATA: readonly QuestionSemanticMetadata[] = [
  {
    questionId: 'decisionPace',
    copyId: 'pair.question.decisionPace',
    subjectReferent: '二人の共同決定',
    timeFrame: '現在',
    observationRequirement: 'shared_decision_history',
    relationStageApplicability: ['R3', 'R6'],
    answerSemanticAxis: 'decision_timing',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: true,
  },
  {
    questionId: 'disagreement',
    copyId: 'pair.question.disagreement',
    subjectReferent: '二人の意見の相違',
    timeFrame: '過去の相互作用',
    observationRequirement: 'prior_disagreement_event',
    relationStageApplicability: ['R3', 'R6'],
    answerSemanticAxis: 'conflict_handling',
    noObservationAvailable: false,
    partnerPrivateStateDependency: true,
    fabricationRisk: true,
  },
  {
    questionId: 'expressionPace',
    copyId: 'pair.question.expressionPace',
    subjectReferent: '言葉にする速さ',
    timeFrame: '現在',
    observationRequirement: 'self_or_observed_expression',
    relationStageApplicability: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
    answerSemanticAxis: 'expression_timing',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: false,
  },
  {
    questionId: 'approachIntent',
    copyId: 'pair.question.approachIntent',
    subjectReferent: '接近意図',
    timeFrame: '現在',
    observationRequirement: 'self_intent_only',
    relationStageApplicability: ['R1'],
    answerSemanticAxis: 'approach_intent',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: false,
  },
  {
    questionId: 'contactPace',
    copyId: 'pair.question.contactPace',
    subjectReferent: '連絡頻度',
    timeFrame: '現在',
    observationRequirement: 'observed_contact',
    relationStageApplicability: ['R2'],
    answerSemanticAxis: 'contact_frequency',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: false,
  },
  {
    questionId: 'distance',
    copyId: 'pair.question.distance',
    subjectReferent: '二人の距離',
    timeFrame: '現在',
    observationRequirement: 'observed_distance_state',
    relationStageApplicability: ['R4', 'R5'],
    answerSemanticAxis: 'distance_state',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: false,
  },
  {
    questionId: 'returnPattern',
    copyId: 'pair.question.returnPattern',
    subjectReferent: 'すれ違い後の戻り方',
    timeFrame: '過去の相互作用',
    observationRequirement: 'prior_misalignment_event',
    relationStageApplicability: ['R3', 'R6'],
    answerSemanticAxis: 'reconciliation_pattern',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: true,
  },
  {
    questionId: 'reapproachReadiness',
    copyId: 'pair.question.reapproachReadiness',
    subjectReferent: '再接近の準備',
    timeFrame: '現在',
    observationRequirement: 'self_readiness',
    relationStageApplicability: ['R5'],
    answerSemanticAxis: 'reapproach_readiness',
    noObservationAvailable: false,
    partnerPrivateStateDependency: false,
    fabricationRisk: false,
  },
];

function evaluateScenarioQuestion(
  scenarioId: PairScenarioId,
  relationStageId: RelationStatusId,
  questionId: string,
): QuestionScenarioEvaluation {
  const meta = QUESTION_SEMANTIC_METADATA.find((m) => m.questionId === questionId);
  const stageQuestions = questionsForRelationStage(relationStageId).map((q) => q.questionId);
  if (!stageQuestions.includes(questionId as never)) {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'NOT_APPLICABLE',
      answerableWithoutFabrication: true,
      explicitNoObservationPath: false,
    };
  }

  if (!meta) {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'APPLICABLE',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    };
  }

  if (scenarioId === 'NEVER_SPOKEN' && (questionId === 'disagreement' || questionId === 'returnPattern')) {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'REQUIRES_NO_OBSERVATION',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    };
  }

  if (scenarioId === 'NO_DISAGREEMENT_YET' && questionId === 'disagreement') {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'REQUIRES_NO_OBSERVATION',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    };
  }

  if (scenarioId === 'NO_SHARED_DECISION_YET' && questionId === 'decisionPace') {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'REQUIRES_NO_OBSERVATION',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    };
  }

  if (scenarioId === 'INSUFFICIENT_OBSERVATION' && meta.fabricationRisk) {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'REQUIRES_NO_OBSERVATION',
      answerableWithoutFabrication: false,
      explicitNoObservationPath: false,
    };
  }

  if (meta.noObservationAvailable) {
    return {
      scenarioId,
      questionId,
      relationStageId,
      applicability: 'APPLICABLE',
      answerableWithoutFabrication: true,
      explicitNoObservationPath: true,
    };
  }

  return {
    scenarioId,
    questionId,
    relationStageId,
    applicability: 'APPLICABLE',
    answerableWithoutFabrication: !meta.fabricationRisk,
    explicitNoObservationPath: false,
  };
}

export function buildPairScenarioMatrix(): readonly QuestionScenarioEvaluation[] {
  const evaluations: QuestionScenarioEvaluation[] = [];
  for (const scenarioId of PAIR_SCENARIO_IDS) {
    const relationStageId = STAGE_FOR_SCENARIO[scenarioId];
    const questions = questionsForRelationStage(relationStageId);
    for (const q of questions) {
      evaluations.push(evaluateScenarioQuestion(scenarioId, relationStageId, q.questionId));
    }
  }
  return evaluations;
}

export function pairScenarioMatrixCoverageCount(): number {
  return buildPairScenarioMatrix().length;
}
