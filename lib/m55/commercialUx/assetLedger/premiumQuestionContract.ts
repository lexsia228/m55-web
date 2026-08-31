/**
 * Premium six-question commercial contract — asset-backed traceability.
 * Q1–Q4 preserved; Q5/Q6 replace presentation-preference questions.
 */
import {
  PAID_DECISION_FRICTION_IDS,
  PAID_FATIGUE_SIGNAL_IDS,
  PAID_QUESTION_IDS,
  PAID_RECOVERY_SEQUENCE_IDS,
  PAID_RELATION_FOCUS_IDS,
  PAID_RESTART_CONDITION_IDS,
  PAID_WORK_FOCUS_IDS,
} from '../../individualization/answerIdMapsV1';
import { PAID_QUESTIONNAIRE_COPY_V1 } from '../../paidResult/questionnaireCopyV1';
import type { PremiumQuestionContract } from './types';

function copyFor(questionId: string) {
  return PAID_QUESTIONNAIRE_COPY_V1.find((q) => q.questionId === questionId);
}

export const M55_PREMIUM_QUESTION_CONTRACT_V1: readonly PremiumQuestionContract[] = [
  {
    questionId: 'paid.work_focus',
    axis: 'work_strength_conditions',
    questionJa: copyFor('paid.work_focus')?.questionJa ?? '',
    optionIds: PAID_WORK_FOCUS_IDS,
    reviewLabelJa: '取り組みの焦点',
    userInsightPurpose: '仕事や学びで最初に整えたい条件を特定する',
    reportEffect: 'chapter II bias + work theme affinity',
    canonicalAssetKeys: ['individualization.paid_depth', 'individualization.reply_affinity'],
    compatibilityPolicy: 'preserve_answer_id',
  },
  {
    questionId: 'paid.decision_friction',
    axis: 'decision_burden',
    questionJa: copyFor('paid.decision_friction')?.questionJa ?? '',
    optionIds: PAID_DECISION_FRICTION_IDS,
    reviewLabelJa: '決めにくさ',
    userInsightPurpose: '決めにくさが出やすい型を特定する',
    reportEffect: 'chapter I/II/III hesitation + strain signals',
    canonicalAssetKeys: ['individualization.signals', 'individualization.paid_depth'],
    compatibilityPolicy: 'preserve_answer_id',
  },
  {
    questionId: 'paid.relation_focus',
    axis: 'interpersonal_distance',
    questionJa: copyFor('paid.relation_focus')?.questionJa ?? '',
    optionIds: PAID_RELATION_FOCUS_IDS,
    reviewLabelJa: '関係の焦点',
    userInsightPurpose: '人との関係で整えたい点を特定する',
    reportEffect: 'chapter III bias + relation theme affinity',
    canonicalAssetKeys: ['individualization.paid_depth', 'individualization.reply_affinity'],
    compatibilityPolicy: 'preserve_answer_id',
  },
  {
    questionId: 'paid.fatigue_signal',
    axis: 'fatigue_accumulation',
    questionJa: copyFor('paid.fatigue_signal')?.questionJa ?? '',
    optionIds: PAID_FATIGUE_SIGNAL_IDS,
    reviewLabelJa: '疲れのサイン',
    userInsightPurpose: '疲れが出やすい場面を特定する',
    reportEffect: 'chapter IV bias + reactive context scenes',
    canonicalAssetKeys: ['individualization.signals', 'individualization.paid_depth'],
    compatibilityPolicy: 'preserve_answer_id',
  },
  {
    questionId: 'paid.recovery_sequence',
    axis: 'recovery_sequence',
    questionJa: copyFor('paid.recovery_sequence')?.questionJa ?? '',
    optionIds: PAID_RECOVERY_SEQUENCE_IDS,
    reviewLabelJa: '戻り方',
    userInsightPurpose: '負担後に最初に整えやすい戻り方を特定する',
    reportEffect: 'recovery selector direct mapping + chapter IV emphasis',
    canonicalAssetKeys: [
      'individualization.recovery_selector_catalog',
      'individualization.paid_chapter_emphasis_ch4',
    ],
    compatibilityPolicy: 'legacy_report_usage_clear_and_reanswer',
  },
  {
    questionId: 'paid.restart_condition',
    axis: 'restart_conditions',
    questionJa: copyFor('paid.restart_condition')?.questionJa ?? '',
    optionIds: PAID_RESTART_CONDITION_IDS,
    reviewLabelJa: '再開の条件',
    userInsightPurpose: '次の一手が出やすくなる条件を特定する',
    reportEffect: 'chapter IV paid emphasis boost (recovery_pace / change_life_load / distance_boundary)',
    canonicalAssetKeys: [
      'individualization.paid_chapter_emphasis_ch4',
      'individualization.recovery_selector_catalog',
    ],
    compatibilityPolicy: 'legacy_reading_style_clear_and_reanswer',
  },
] as const;

export function assertPremiumQuestionContractComplete(): void {
  if (M55_PREMIUM_QUESTION_CONTRACT_V1.length !== PAID_QUESTION_IDS.length) {
    throw new Error('premium question contract length mismatch');
  }
  for (const qid of PAID_QUESTION_IDS) {
    const entry = M55_PREMIUM_QUESTION_CONTRACT_V1.find((e) => e.questionId === qid);
    if (!entry) throw new Error(`missing premium question contract: ${qid}`);
  }
}
