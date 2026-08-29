/**
 * Immutable OPEN_BASELINE snapshot — literal entries only.
 * MUST NOT call live product/source builders.
 */

import type { FrozenOpenBaselineEntry } from '../../../commercialQuality/japaneseComprehensionBaselinePolicy';

export const M55_FROZEN_OPEN_BASELINE_ENTRIES: readonly FrozenOpenBaselineEntry[] = [
  {
    findingId: 'JC-R6-AMBIGUITY',
    knownHumanFindingId: 'GCJQ-01',
    invariantCategory: 'relation_stage_ambiguity',
    copyId: 'pair.relation_stage.R6',
    surfaceId: 'm55:pair.entry',
    runtimeStateId: 'pair.relation_stage.R6',
    baselineEvidenceFingerprint:
      'relation_stage_ambiguity|pair.relation_stage.R6|m55:pair.entry|pair.relation_stage.R6|R6 label contains 長く一緒 + 考え without explicit timeframe|長く一緒にいることを考えている',
  },
  {
    findingId: 'JC-CTA-SHARE-MOT-pair.share.native',
    knownHumanFindingId: 'GCJQ-03',
    invariantCategory: 'share_motivation_insufficient',
    copyId: 'pair.share.native',
    surfaceId: 'm55:pair.free.result',
    runtimeStateId: 'pair.free.share',
    baselineEvidenceFingerprint:
      'share_motivation_insufficient|pair.share.native|m55:pair.free.result|pair.free.share|share CTA lacks registered motivation outcome|共有する',
  },
  {
    findingId: 'JC-CTA-SHARE-MOT-self.share.native',
    invariantCategory: 'share_motivation_insufficient',
    copyId: 'self.share.native',
    surfaceId: 'm55:self.free.result',
    runtimeStateId: 'self.free.share',
    baselineEvidenceFingerprint:
      'share_motivation_insufficient|self.share.native|m55:self.free.result|self.free.share|share CTA lacks registered motivation outcome|共有する',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.FRESH',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.FRESH',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.FRESH|m55:shared.navigation|shared.cta|userOutcome missing|無料で見てみる',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.FREE_IN_PROGRESS',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.FREE_IN_PROGRESS',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.FREE_IN_PROGRESS|m55:shared.navigation|shared.cta|userOutcome missing|無料結果の続きを見る',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.FREE_COMPLETE',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.FREE_COMPLETE',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.FREE_COMPLETE|m55:shared.navigation|shared.cta|userOutcome missing|無料結果を開く',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.FREE_TO_PREMIUM',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.FREE_TO_PREMIUM',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.FREE_TO_PREMIUM|m55:shared.navigation|shared.cta|userOutcome missing|プレミアムの読み解きへ進む',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.PREMIUM_IN_PROGRESS',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.PREMIUM_IN_PROGRESS',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.PREMIUM_IN_PROGRESS|m55:shared.navigation|shared.cta|userOutcome missing|プレミアムの続きを見る',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.PREMIUM_COMPLETE',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.PREMIUM_COMPLETE',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.PREMIUM_COMPLETE|m55:shared.navigation|shared.cta|userOutcome missing|プランを選ぶ',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.PLAN_SELECTED',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.PLAN_SELECTED',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.PLAN_SELECTED|m55:shared.navigation|shared.cta|userOutcome missing|支払い内容を確認する',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.PAYMENT_READY',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.PAYMENT_READY',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.PAYMENT_READY|m55:shared.navigation|shared.cta|userOutcome missing|支払い画面へ進む',
  },
  {
    findingId: 'JC-CTA-OUTCOME-shared.cta.RETURN_TO_FREE_RESULT',
    invariantCategory: 'cta_missing_user_outcome',
    copyId: 'shared.cta.RETURN_TO_FREE_RESULT',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'cta_missing_user_outcome|shared.cta.RETURN_TO_FREE_RESULT|m55:shared.navigation|shared.cta|userOutcome missing|無料結果に戻る',
  },
  {
    findingId: 'JC-CTA-SHARE-MOT-shared.cta.SHARED_RECIPIENT',
    invariantCategory: 'share_motivation_insufficient',
    copyId: 'shared.cta.SHARED_RECIPIENT',
    surfaceId: 'm55:shared.navigation',
    runtimeStateId: 'shared.cta',
    baselineEvidenceFingerprint:
      'share_motivation_insufficient|shared.cta.SHARED_RECIPIENT|m55:shared.navigation|shared.cta|share CTA lacks registered motivation outcome|自分も無料で見る',
  },
  {
    findingId: 'JC-PROD-DISC-compatibility_report_full_v1',
    knownHumanFindingId: 'GCJQ-04',
    invariantCategory: 'product_not_first_class',
    copyId: null,
    surfaceId: 'm55:pair.bridge_only',
    runtimeStateId: null,
    baselineEvidenceFingerprint:
      'product_not_first_class||m55:pair.bridge_only||firstClassMerchandise=false discoverySurfaces=m55:pair.bridge_only|compatibility_report_full_v1',
  },
  {
    findingId: 'JC-Q-ANS-R3-decisionPace',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:decisionPace',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:decisionPace|m55:pair.R3|pair.questionnaire.R3|scenario=R3 applicability=APPLICABLE|R3|R3|decisionPace|APPLICABLE|二人で何かを決めるとき、今はどの形に近いですか？|decide_now:その場で決めることが多い;decide_later:少し時間を置いて決めることが多い;decide_varies:状況によって大きく変わる',
  },
  {
    findingId: 'JC-Q-ANS-R3-disagreement',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:disagreement',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:disagreement|m55:pair.R3|pair.questionnaire.R3|scenario=R3 applicability=APPLICABLE|R3|R3|disagreement|APPLICABLE|意見が違ったとき、二人の間では何が起きやすいですか？|talk_now:その場で言葉を交わす;take_space:いったん距離や時間を置く;one_carries:どちらかが話題を引き取る',
  },
  {
    findingId: 'JC-Q-ANS-R3-returnPattern',
    invariantCategory: 'question_answerability',
    copyId: 'question:returnPattern',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:returnPattern|m55:pair.R3|pair.questionnaire.R3|scenario=R3 applicability=APPLICABLE|R3|R3|returnPattern|APPLICABLE|すれ違ったあと、元の距離へ戻るときはどの形に近いですか？|someone_reaches:どちらかが先に声をかける;time_restores:時間がたつと自然に戻る;return_is_hard:戻るきっかけを作りにくい',
  },
  {
    findingId: 'JC-Q-ANS-R6-decisionPace',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:decisionPace',
    surfaceId: 'm55:pair.R6',
    runtimeStateId: 'pair.questionnaire.R6',
    baselineEvidenceFingerprint:
      'question_answerability|question:decisionPace|m55:pair.R6|pair.questionnaire.R6|scenario=R6 applicability=APPLICABLE|R6|R6|decisionPace|APPLICABLE|二人で何かを決めるとき、今はどの形に近いですか？|decide_now:その場で決めることが多い;decide_later:少し時間を置いて決めることが多い;decide_varies:状況によって大きく変わる',
  },
  {
    findingId: 'JC-Q-ANS-R6-disagreement',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:disagreement',
    surfaceId: 'm55:pair.R6',
    runtimeStateId: 'pair.questionnaire.R6',
    baselineEvidenceFingerprint:
      'question_answerability|question:disagreement|m55:pair.R6|pair.questionnaire.R6|scenario=R6 applicability=APPLICABLE|R6|R6|disagreement|APPLICABLE|意見が違ったとき、二人の間では何が起きやすいですか？|talk_now:その場で言葉を交わす;take_space:いったん距離や時間を置く;one_carries:どちらかが話題を引き取る',
  },
  {
    findingId: 'JC-Q-ANS-R6-returnPattern',
    invariantCategory: 'question_answerability',
    copyId: 'question:returnPattern',
    surfaceId: 'm55:pair.R6',
    runtimeStateId: 'pair.questionnaire.R6',
    baselineEvidenceFingerprint:
      'question_answerability|question:returnPattern|m55:pair.R6|pair.questionnaire.R6|scenario=R6 applicability=APPLICABLE|R6|R6|returnPattern|APPLICABLE|すれ違ったあと、元の距離へ戻るときはどの形に近いですか？|someone_reaches:どちらかが先に声をかける;time_restores:時間がたつと自然に戻る;return_is_hard:戻るきっかけを作りにくい',
  },
  {
    findingId: 'JC-Q-ANS-NO_SHARED_DECISION_YET-decisionPace',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:decisionPace',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:decisionPace|m55:pair.R3|pair.questionnaire.R3|scenario=NO_SHARED_DECISION_YET applicability=REQUIRES_NO_OBSERVATION|NO_SHARED_DECISION_YET|R3|decisionPace|REQUIRES_NO_OBSERVATION|二人で何かを決めるとき、今はどの形に近いですか？|decide_now:その場で決めることが多い;decide_later:少し時間を置いて決めることが多い;decide_varies:状況によって大きく変わる',
  },
  {
    findingId: 'JC-Q-ANS-NO_SHARED_DECISION_YET-disagreement',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:disagreement',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:disagreement|m55:pair.R3|pair.questionnaire.R3|scenario=NO_SHARED_DECISION_YET applicability=APPLICABLE|NO_SHARED_DECISION_YET|R3|disagreement|APPLICABLE|意見が違ったとき、二人の間では何が起きやすいですか？|talk_now:その場で言葉を交わす;take_space:いったん距離や時間を置く;one_carries:どちらかが話題を引き取る',
  },
  {
    findingId: 'JC-Q-ANS-NO_SHARED_DECISION_YET-returnPattern',
    invariantCategory: 'question_answerability',
    copyId: 'question:returnPattern',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:returnPattern|m55:pair.R3|pair.questionnaire.R3|scenario=NO_SHARED_DECISION_YET applicability=APPLICABLE|NO_SHARED_DECISION_YET|R3|returnPattern|APPLICABLE|すれ違ったあと、元の距離へ戻るときはどの形に近いですか？|someone_reaches:どちらかが先に声をかける;time_restores:時間がたつと自然に戻る;return_is_hard:戻るきっかけを作りにくい',
  },
  {
    findingId: 'JC-Q-ANS-NO_DISAGREEMENT_YET-decisionPace',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:decisionPace',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:decisionPace|m55:pair.R3|pair.questionnaire.R3|scenario=NO_DISAGREEMENT_YET applicability=APPLICABLE|NO_DISAGREEMENT_YET|R3|decisionPace|APPLICABLE|二人で何かを決めるとき、今はどの形に近いですか？|decide_now:その場で決めることが多い;decide_later:少し時間を置いて決めることが多い;decide_varies:状況によって大きく変わる',
  },
  {
    findingId: 'JC-Q-ANS-NO_DISAGREEMENT_YET-disagreement',
    knownHumanFindingId: 'GCJQ-02',
    invariantCategory: 'question_answerability',
    copyId: 'question:disagreement',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:disagreement|m55:pair.R3|pair.questionnaire.R3|scenario=NO_DISAGREEMENT_YET applicability=REQUIRES_NO_OBSERVATION|NO_DISAGREEMENT_YET|R3|disagreement|REQUIRES_NO_OBSERVATION|意見が違ったとき、二人の間では何が起きやすいですか？|talk_now:その場で言葉を交わす;take_space:いったん距離や時間を置く;one_carries:どちらかが話題を引き取る',
  },
  {
    findingId: 'JC-Q-ANS-NO_DISAGREEMENT_YET-returnPattern',
    invariantCategory: 'question_answerability',
    copyId: 'question:returnPattern',
    surfaceId: 'm55:pair.R3',
    runtimeStateId: 'pair.questionnaire.R3',
    baselineEvidenceFingerprint:
      'question_answerability|question:returnPattern|m55:pair.R3|pair.questionnaire.R3|scenario=NO_DISAGREEMENT_YET applicability=APPLICABLE|NO_DISAGREEMENT_YET|R3|returnPattern|APPLICABLE|すれ違ったあと、元の距離へ戻るときはどの形に近いですか？|someone_reaches:どちらかが先に声をかける;time_restores:時間がたつと自然に戻る;return_is_hard:戻るきっかけを作りにくい',
  },
] as const;

export function buildFrozenOpenBaselineRegistry(): ReadonlyMap<string, FrozenOpenBaselineEntry> {
  return new Map(M55_FROZEN_OPEN_BASELINE_ENTRIES.map((entry) => [entry.findingId, entry]));
}

export function isFrozenOpenBaselineFindingId(findingId: string): boolean {
  return buildFrozenOpenBaselineRegistry().has(findingId);
}
