/**
 * Compatibility Free inference v2 — relationship-loop InsightSpec.
 * Questionnaire answer IDs are reused. The subject is 二人の間, not A+B labels.
 */

import type {
  CompatibilityCurrentContextAnswers,
  DecisionPaceAnswer,
  DisagreementAnswer,
  DistanceAnswer,
  ExpressionPaceAnswer,
  ReturnPatternAnswer,
} from './currentContextContract.v1';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import {
  isNoObservationDecisionPace,
  isNoObservationDisagreement,
  isNoObservationReturnPattern,
  resolveFocusAnswer,
} from './currentContextContract.v2';
import type { PairAxisId, PairDifferenceType, RelationStatusId } from './pairReadingTypes';
import {
  resolveCivilBirthDimensions,
  type CivilBirthDimensionsV1,
} from '../individualization/birthSignatureV1';
import { resolvePairCanonicalProfileV2 } from './pairCanonicalProfileV2';
import { derivePairDifferenceType } from './pairReadingCivilDelta';
import {
  resolvePairCentralInferenceV1,
  type PairCentralInferenceEvidenceInputV1,
} from './pairCentralInferenceV1';
import { projectPairFreeFieldsV1 } from './pairFreeProjectionV1';

export const PAIR_FREE_INSIGHT_SPEC_VERSION = 'pair_free_insight_v2' as const;

export type PairFreeInteractionId =
  | 'tempo_mismatch'
  | 'space_misread'
  | 'one_carries_quiet'
  | 'talk_now_go_quiet'
  | 'later_decide_words_soon'
  | 'hard_return_hard_space'
  | 'default_relationship_loop';

export type PairFreeEvidenceQuestionId =
  | 'decisionPace'
  | 'disagreement'
  | 'distance'
  | 'expressionPace'
  | 'returnPattern'
  | 'approachIntent'
  | 'contactPace'
  | 'reapproachReadiness';

export type PairFreeObservationGapId = 'decisionPace' | 'disagreement' | 'returnPattern';

export type PairFreeInsightSpecV2 = {
  readonly id: string;
  readonly kind: 'pair_free_v2';
  readonly evidenceQuestionIds: readonly PairFreeEvidenceQuestionId[];
  readonly observationGapQuestionIds?: readonly PairFreeObservationGapId[];
  readonly pairAxisId: PairAxisId;
  readonly pairDifferenceType: PairDifferenceType;
  readonly aBirthEvidence: true;
  readonly bBirthEvidence: true;
  readonly pairAnswerEvidence: true;
  readonly independentAAnswerEvidence: false;
  readonly independentBAnswerEvidence: false;
  readonly interactionId: PairFreeInteractionId;
  readonly confidence: 'high' | 'medium';
  readonly personAUsesFirstPerspective: boolean;
  /** Recurring relationship pattern — how the pair difference moves between them. */
  readonly betweenThem: string;
  /** Scene-specific expression for the current reading moment (distinct from betweenThem). */
  readonly currentExpressionJa: string;
  readonly meshMoment: string;
  readonly mismatchEntry: string;
  readonly misreadLoop: string;
  readonly reset: string;
  readonly premiumContinuation: string;
  readonly manifestationPatternId: string;
  readonly relationshipTriggerJa: string;
  /** Why the hero observation is plausible. Distinct from the hero and the conclusion. */
  readonly evidenceSupportJa: string;
  /** Observable three-step sequence. Not a copy of overlap, difference, or mismatchEntry. */
  readonly relationshipSequenceJa: readonly [string, string, string];
  /** Free-depth manual angle that does not repeat the mismatch block. */
  readonly freeDepthAngleJa: string;
  readonly relationStatusId: RelationStatusId;
  readonly manualSideTendenciesJa?: { readonly oneJa: string; readonly otherJa: string };
};

const EVIDENCE_ESTABLISHED = [
  'decisionPace',
  'disagreement',
  'expressionPace',
  'returnPattern',
] as const satisfies readonly PairFreeEvidenceQuestionId[];

const EVIDENCE_R1 = ['expressionPace', 'approachIntent'] as const satisfies readonly PairFreeEvidenceQuestionId[];
const EVIDENCE_R2 = ['expressionPace', 'contactPace'] as const satisfies readonly PairFreeEvidenceQuestionId[];
const EVIDENCE_R4 = ['distance', 'expressionPace'] as const satisfies readonly PairFreeEvidenceQuestionId[];
const EVIDENCE_R5 = ['reapproachReadiness', 'expressionPace', 'distance'] as const satisfies readonly PairFreeEvidenceQuestionId[];

const EVIDENCE = EVIDENCE_ESTABLISHED;

type InsightContextAnswers = Omit<CompatibilityCurrentContextAnswers, 'distance'> & {
  distance?: DistanceAnswer;
};

const NO_OBS_MISMATCH_ENTRY =
  'まだ二人で何かを決める場面がないため、決める速さの違いは今回の読み取りから除外します。';
const NO_OBS_MISREAD_LOOP =
  'まだ意見が違う場面がないため、対立時の動きは今回の読み取りから除外します。';
const NO_OBS_RESET =
  'まだすれ違ったあとに戻る場面がないため、戻り方の癖は今回の読み取りから除外します。';
const NO_OBS_BETWEEN_ALL =
  '二人の間では、まだ十分な相互作用の履歴がないため、決める速さ・対立時の動き・戻り方は読み取りません。言葉の出方など、いま観察できる範囲だけを入口にします。';
const NO_OBS_BETWEEN_PARTIAL =
  '二人の間では、まだ起きていない出来事からは読み取らず、いま観察できる範囲だけを入口にします。';


function isBehavioralDecisionPaceValue(
  value: CompatibilityCurrentContextAnswersV2['decisionPace'],
): value is DecisionPaceAnswer {
  return value === 'decide_now' || value === 'decide_later' || value === 'decide_varies';
}

function isBehavioralDisagreementValue(
  value: CompatibilityCurrentContextAnswersV2['disagreement'],
): value is DisagreementAnswer {
  return value === 'talk_now' || value === 'take_space' || value === 'one_carries';
}

function isBehavioralReturnPatternValue(
  value: CompatibilityCurrentContextAnswersV2['returnPattern'],
): value is ReturnPatternAnswer {
  return (
    value === 'someone_reaches' || value === 'time_restores' || value === 'return_is_hard'
  );
}

function resolveLegacyDecisionPace(
  value: CompatibilityCurrentContextAnswersV2['decisionPace'],
): DecisionPaceAnswer {
  if (value === undefined) return 'decide_varies';
  if (isBehavioralDecisionPaceValue(value)) return value;
  throw new Error('explicit_no_observation_not_legacy_coercible');
}

function resolveLegacyDisagreement(
  value: CompatibilityCurrentContextAnswersV2['disagreement'],
): DisagreementAnswer {
  if (value === undefined) return 'take_space';
  if (isBehavioralDisagreementValue(value)) return value;
  throw new Error('explicit_no_observation_not_legacy_coercible');
}

function resolveLegacyReturnPattern(
  value: CompatibilityCurrentContextAnswersV2['returnPattern'],
): ReturnPatternAnswer {
  if (value === undefined) return 'time_restores';
  if (isBehavioralReturnPatternValue(value)) return value;
  throw new Error('explicit_no_observation_not_legacy_coercible');
}

function insightAnswersFromV2(
  answersV2: CompatibilityCurrentContextAnswersV2,
  relationStatusId: RelationStatusId,
): InsightContextAnswers {
  const focus = resolveFocusAnswer(relationStatusId, answersV2.focus);
  const base: InsightContextAnswers = {
    decisionPace: resolveLegacyDecisionPace(answersV2.decisionPace),
    disagreement: resolveLegacyDisagreement(answersV2.disagreement),
    expressionPace: answersV2.expressionPace,
    returnPattern: resolveLegacyReturnPattern(answersV2.returnPattern),
    focus,
  };
  if (answersV2.distance) {
    base.distance = answersV2.distance;
  }
  return base;
}

function establishedObservationGapIds(
  answersV2: CompatibilityCurrentContextAnswersV2,
): readonly PairFreeObservationGapId[] {
  const gaps: PairFreeObservationGapId[] = [];
  if (isNoObservationDecisionPace(answersV2.decisionPace)) gaps.push('decisionPace');
  if (isNoObservationDisagreement(answersV2.disagreement)) gaps.push('disagreement');
  if (isNoObservationReturnPattern(answersV2.returnPattern)) gaps.push('returnPattern');
  return Object.freeze(gaps);
}

const ESTABLISHED_DECISION_EVIDENCE = {
  decide_now: 'answer:decisionPace:decide_now',
  decide_later: 'answer:decisionPace:decide_later',
  decide_varies: 'answer:decisionPace:decide_varies',
  no_shared_decision_yet: 'gap:decisionPace',
} as const satisfies Record<
  NonNullable<CompatibilityCurrentContextAnswersV2['decisionPace']>,
  PairCentralInferenceEvidenceInputV1[0]
>;

const ESTABLISHED_EXPRESSION_EVIDENCE = {
  words_soon: 'answer:expressionPace:words_soon',
  words_later: 'answer:expressionPace:words_later',
  words_vary: 'answer:expressionPace:words_vary',
} as const satisfies Record<ExpressionPaceAnswer, PairCentralInferenceEvidenceInputV1[1]>;

const ESTABLISHED_DISAGREEMENT_EVIDENCE = {
  talk_now: 'answer:disagreement:talk_now',
  take_space: 'answer:disagreement:take_space',
  one_carries: 'answer:disagreement:one_carries',
  no_disagreement_yet: 'gap:disagreement',
} as const satisfies Record<
  NonNullable<CompatibilityCurrentContextAnswersV2['disagreement']>,
  PairCentralInferenceEvidenceInputV1[2]
>;

const ESTABLISHED_RETURN_EVIDENCE = {
  someone_reaches: 'answer:returnPattern:someone_reaches',
  time_restores: 'answer:returnPattern:time_restores',
  return_is_hard: 'answer:returnPattern:return_is_hard',
  no_misalignment_return_yet: 'gap:returnPattern',
} as const satisfies Record<
  NonNullable<CompatibilityCurrentContextAnswersV2['returnPattern']>,
  PairCentralInferenceEvidenceInputV1[3]
>;

function buildEstablishedCentralEvidenceV1(
  answersV2: CompatibilityCurrentContextAnswersV2,
): PairCentralInferenceEvidenceInputV1 {
  const decisionPace = answersV2.decisionPace ?? 'no_shared_decision_yet';
  const expressionPace = answersV2.expressionPace ?? 'words_soon';
  const disagreement = answersV2.disagreement ?? 'no_disagreement_yet';
  const returnPattern = answersV2.returnPattern ?? 'no_misalignment_return_yet';
  return [
    ESTABLISHED_DECISION_EVIDENCE[decisionPace],
    ESTABLISHED_EXPRESSION_EVIDENCE[expressionPace],
    ESTABLISHED_DISAGREEMENT_EVIDENCE[disagreement],
    ESTABLISHED_RETURN_EVIDENCE[returnPattern],
  ];
}

function meshMomentFromExpression(
  expressionPace: ExpressionPaceAnswer,
  options?: { decisionPaceNoObs?: boolean },
): string {
  if (options?.decisionPaceNoObs) {
    if (expressionPace === 'words_soon') {
      return '気持ちがすぐ言葉になりやすい日は、言葉の出方の違いが先に見えやすいことがあります。';
    }
    if (expressionPace === 'words_later') {
      return '言葉が遅れて出る日は、言葉が整うまでの時間の見え方が、読み取りのずれとして見えやすいことがあります。';
    }
    return 'その日によって言葉の出方が変わるため、いまの温度が読み取りにくくなることがあります。';
  }
  if (expressionPace === 'words_soon') {
    return '気持ちがすぐ言葉になりやすい日は、決める速さとの差が先に見えやすいことがあります。';
  }
  if (expressionPace === 'words_later') {
    return '言葉が遅れて出る日は、結論の置き方との差が先に見えやすいことがあります。';
  }
  return 'その日によって言葉の出方が変わるため、同じ場面でも進み方の見え方がずれやすいことがあります。';
}

function mismatchEntryFromPace(
  decision: DecisionPaceAnswer,
  expression: ExpressionPaceAnswer,
): string {
  if (decision === 'decide_now' && expression === 'words_soon') {
    return '区切りと説明が同時に見えるとき、どちらが会話の一区切りを決めたのかが先にずれる。';
  }
  if (decision === 'decide_now' && expression === 'words_later') {
    return '区切りだけが先に見えるとき、まだ出ていない説明をどこまで話の中身に含めるかがずれる。';
  }
  if (decision === 'decide_now' && expression === 'words_vary') {
    return '結論はその場で置かれる一方、言葉になるタイミングが場面で変わるとき、その出方を内容の違いと読むか場面の違いと読むかがずれる。';
  }
  if (decision === 'decide_later' && expression === 'words_soon') {
    return '言葉だけが先に並んでいるとき、それを説明の途中と読むか結論の予告と読むかがずれる。';
  }
  if (decision === 'decide_later' && expression === 'words_later') {
    return '沈黙のあとに言葉が出るとき、その沈黙を考える時間と読むか会話の終わりと読むかがずれる。';
  }
  if (decision === 'decide_later' && expression === 'words_vary') {
    return '決めるまで時間を置く一方、言葉になるタイミングが場面で変わるとき、その出方を迷いと読むか場面の違いと読むかがずれる。';
  }
  if (decision === 'decide_varies' && expression === 'words_soon') {
    return '結論を置く日と置かない日が入れ替わるとき、その違いを場面の変化と読むか態度の違いと読むかがずれる。';
  }
  if (decision === 'decide_varies' && expression === 'words_later') {
    return '決めるタイミングが場面で変わる一方、言葉になるまでに時間がかかるとき、その順番を態度の違いと読むか進み方の違いと読むかがずれる。';
  }
  return '区切る日と置く日が入れ替わるとき、今日の進み方そのものを二人の違いと読むか日の違いと読むかがずれる。';
}

function mismatchEntryFromDecisionPace(
  decisionPace: DecisionPaceAnswer,
  expressionPace: ExpressionPaceAnswer = 'words_soon',
): string {
  return mismatchEntryFromPace(decisionPace, expressionPace);
}


function resetFromReturnPattern(
  returnPattern: ReturnPatternAnswer,
  options?: { decisionPaceNoObs?: boolean },
): string {
  if (returnPattern === 'someone_reaches') {
    return options?.decisionPaceNoObs
      ? '戻るきっかけの見え方だけが、読み取りのずれとして見えやすいことがあります。'
      : '戻るきっかけの見え方と、決める速さの差が、読み取りのずれとして見えやすいことがあります。';
  }
  if (returnPattern === 'time_restores') {
    return '自然に戻ったあとの温度差と、言葉の出方の差が、読み取りのずれとして見えやすいことがあります。';
  }
  return '戻る入口の重さと、今の間合いの見え方が、読み取りのずれとして見えやすいことがあります。';
}

function roleLabels(
  personAUsesFirstPerspective: boolean,
): { visible: string; inward: string } {
  const visibleIsYou = personAUsesFirstPerspective;
  return visibleIsYou
    ? { visible: 'あなた', inward: '相手' }
    : { visible: '相手', inward: 'あなた' };
}

function parseManualSideTendenciesFromSideLead(
  sideLeadText: string,
): { oneJa: string; otherJa: string } | null {
  const match = /^(.+?)は([^、]+)、(.+?)は(.+)$/.exec(sideLeadText);
  if (!match) return null;
  return { oneJa: match[2]!.trim(), otherJa: match[4]!.trim() };
}

function manualSideTendenciesFromSideLeadAnswers(
  answersV2: CompatibilityCurrentContextAnswersV2,
  personAUsesFirstPerspective: boolean,
  relationStatusId: RelationStatusId,
): { oneJa: string; otherJa: string } | null {
  const answers = insightAnswersFromV2(answersV2, relationStatusId);
  const roles = roleLabels(personAUsesFirstPerspective);
  return parseManualSideTendenciesFromSideLead(sideLead(answers, roles));
}

function manualSideTendenciesFromMisreadLoop(
  misreadLoop: string,
): { oneJa: string; otherJa: string } | null {
  const match = /^(.+?)と、(.+?)が/u.exec(misreadLoop);
  if (!match) return null;
  const oneJa = match[1]!.trim();
  const otherJa = match[2]!.trim();
  if (oneJa.length < 4 || otherJa.length < 4) return null;
  return { oneJa, otherJa };
}

function establishedManualSideTendenciesJa(
  answersV2: CompatibilityCurrentContextAnswersV2,
  personAUsesFirstPerspective: boolean,
  relationStatusId: 'R3' | 'R6',
  misreadLoop: string,
): { oneJa: string; otherJa: string } | null {
  if (!isNoObservationDisagreement(answersV2.disagreement)) {
    const fromMisread = manualSideTendenciesFromMisreadLoop(misreadLoop);
    if (fromMisread) return fromMisread;
  }
  const canUseSideLead =
    !isNoObservationDisagreement(answersV2.disagreement) &&
    !isNoObservationDecisionPace(answersV2.decisionPace) &&
    !isNoObservationReturnPattern(answersV2.returnPattern);
  if (!canUseSideLead) return null;
  return manualSideTendenciesFromSideLeadAnswers(
    answersV2,
    personAUsesFirstPerspective,
    relationStatusId,
  );
}

function r2ManualSideTendenciesJa(
  answersV2: CompatibilityCurrentContextAnswersV2,
): { oneJa: string; otherJa: string } {
  const expressionPace = answersV2.expressionPace ?? 'words_soon';
  if (expressionPace === 'words_later') {
    return {
      oneJa: '返す前に言葉を整えたい時間を取りやすい',
      otherJa: '返事が遅い間を、関心の薄さのように受け取りやすい',
    };
  }
  if (expressionPace === 'words_soon') {
    return {
      oneJa: '言葉が先に出やすく、相手の反応を待ちたくなることがある',
      otherJa: '反応が見えない時間を、関心の薄さのように受け取りやすい',
    };
  }
  return {
    oneJa: 'その日によって言葉の出方が変わりやすい',
    otherJa: '同じやり取りでも、受け取り方が分かれやすい',
  };
}

function selectInteraction(
  answers: InsightContextAnswers,
): { interactionId: PairFreeInteractionId; confidence: 'high' | 'medium' } {
  if (
    (answers.decisionPace === 'decide_now' && answers.expressionPace === 'words_later') ||
    (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_soon')
  ) {
    return { interactionId: 'tempo_mismatch', confidence: 'high' };
  }
  if (answers.distance === 'go_quiet' && answers.disagreement === 'talk_now') {
    return { interactionId: 'talk_now_go_quiet', confidence: 'high' };
  }
  if (answers.disagreement === 'take_space' || answers.distance === 'go_quiet') {
    return { interactionId: 'space_misread', confidence: 'high' };
  }
  if (answers.disagreement === 'one_carries' && answers.distance && answers.distance !== 'explain_space') {
    return { interactionId: 'one_carries_quiet', confidence: 'high' };
  }
  if (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_soon') {
    return { interactionId: 'later_decide_words_soon', confidence: 'high' };
  }
  if (answers.returnPattern === 'return_is_hard' && answers.distance === 'space_is_hard') {
    return { interactionId: 'hard_return_hard_space', confidence: 'high' };
  }
  return { interactionId: 'default_relationship_loop', confidence: 'medium' };
}

function loopFromConflict(
  disagreement: DisagreementAnswer,
  distance: DistanceAnswer | undefined,
  returning: ReturnPatternAnswer,
  roles: { visible: string; inward: string },
): { loop: string; reset: string } {
  const { visible, inward } = roles;
  if (disagreement === 'talk_now' && distance === 'go_quiet') {
    return {
      loop: `確認を重ねるほど、${inward}は考える余白を取りたくなり、その静けさを${visible}が距離を置かれたと受け取りやすい。どちらも関係を切るつもりがなくても、確かめ方が逆方向になりやすい。`,
      reset:
        returning === 'someone_reaches'
          ? '結論ではなく、次に話す一点だけ先に置く。返事は急がない。'
          : returning === 'time_restores'
            ? '自然に戻ったあと、扱わずに残った一点だけを短く確認する。'
            : '関係の答えを求めず、応じるかを選べる短い接点を一度だけ置く。',
    };
  }
  if (disagreement === 'take_space') {
    return {
      loop: `違いが出るといったん間を取ると、${visible}はその間を「考える時間」、${inward}は「気持ちが離れた時間」と受け取りやすい。先に声をかける側が急かしているようにも、かけない側が捨てたようにも見え、どちらも関係を大事にしているのに確かめ方が逆になりやすい。`,
      reset:
        distance === 'explain_space'
          ? '離れる前に、返事ではなく次に話す時点だけを伝える。'
          : '離れる前に、答えではなく次に話す一点だけを伝える。',
    };
  }
  if (disagreement === 'one_carries') {
    return {
      loop: `違いが出るとどちらかが話題を引き取り、表に出なかった違いが次の場面へ残る。${visible}は進めたつもりになり、${inward}は言えていない一点を抱えたまま戻る。${visible}は会話が終わったと受け取りやすく、${inward}は大事な点がまだ残っていると受け取りやすい。`,
      reset: 'まだ言えていない違いを一つだけ聞く。答えの正しさより、出なかった一点を先に置く。',
    };
  }
  return {
    loop: `違いが出たあとの距離の取り方と、戻るきっかけが噛み合わないと、同じずれが次の会話に残る。${visible}が先に短い確認を返しても、${inward}は返事の前にもう一度間を取りたくなることがあり、その差が見えやすい。`,
    reset:
      returning === 'someone_reaches'
        ? '次のすれ違いでは、結論ではなく短い声かけを一度だけ置く。'
        : returning === 'time_restores'
          ? '自然に会話が戻ったあと、残った一点を十分以内で確かめる。'
          : '答えを決めず、応じるかを選べる短い接点を一度だけ提案する。',
  };
}

function sideLead(
  answers: InsightContextAnswers,
  roles: { visible: string; inward: string },
): string {
  const { visible, inward } = roles;
  if (answers.decisionPace === 'decide_now' && answers.expressionPace === 'words_later') {
    return `${visible}はその場で先に答えを出そうとしやすく、${inward}はまだ言葉を整えている途中になりやすい`;
  }
  if (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_soon') {
    return `${visible}は先に言葉で確かめたくなりやすく、${inward}は答えを出す前に一度置きたい`;
  }
  if (answers.disagreement === 'talk_now' && answers.distance === 'go_quiet') {
    return `${visible}は違いをその場の言葉で揃えようとしやすく、${inward}は説明より先に静かになりやすい`;
  }
  if (answers.disagreement === 'one_carries') {
    return `${visible}は話題を引き取って進めやすく、${inward}は出なかった一点を抱えたまま戻りやすい`;
  }
  if (answers.disagreement === 'take_space' || answers.distance === 'go_quiet') {
    return `${visible}は返事を急がず考えたいのに、${inward}は先に話を続けようとしやすい`;
  }
  if (
    (answers.decisionPace === 'decide_now' && answers.expressionPace === 'words_soon') ||
    (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_later')
  ) {
    return `${visible}は短い確認の返事で安心しやすく、${inward}は返事の前に間を取りたくなる`;
  }
  return `${visible}は先に次の予定を決めようとしやすく、${inward}は同じ言葉を距離のサインと受け取りやすい`;
}


function birthLead(
  visible: CivilBirthDimensionsV1,
  inward: CivilBirthDimensionsV1,
  _roles: { visible: string; inward: string },
  _pairAxisId: PairAxisId,
  differenceType: PairDifferenceType,
  stemDelta: 'same' | 'near' | 'far',
): string {
  const shared = visible.start === inward.start;
  const closeDates =
    differenceType === 'same_dob_pair' || differenceType === 'near_dob_shift';
  const replyPace =
    stemDelta === 'same'
      ? '返事の始め方は似ていても'
      : stemDelta === 'near'
        ? '返事を出す前の間の取り方が少し違って'
        : '会話を始める速さが違って';
  if (stemDelta === 'far') {
    return `${replyPace}、生まれの基調の差が会話の始め方に先に出やすい`;
  }
  if (differenceType === 'near_dob_shift') {
    return `${replyPace}、生まれの基調は近くても返す速さの差が先に目立ちやすい`;
  }
  if (shared && closeDates) {
    return `${replyPace}、生まれの基調が揃っていても進め方の差が目立ちやすい`;
  }
  if (shared) {
    return `${replyPace}、生まれの基調が揃っていても返す速さの差が分かれやすい`;
  }
  return `${replyPace}、生まれの基調の差が会話の始め方に先に目立ちやすい`;
}



function premiumContinuation(
  focusLabel: string,
  interactionId: PairFreeInteractionId,
  relationStatusId: RelationStatusId,
): string {
  if (relationStatusId === 'R1') {
    return [
      'まだ会話がない状態では、読み取りのずれが先に目立ちやすいです。',
      '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の動き、ずれの入口、小さな接点、使える一言、試せる実験、振り返りまでを一続きで読めます。',
      `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
    ].join('');
  }
  if (relationStatusId === 'R2') {
    return [
      'やり取りが始まったあとでは、返事の速さと受け取り方のずれが先に目立ちやすいです。',
      '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、ずれの入口、言葉の置き直し方、使える一言、試せる実験、振り返りまでを一続きで読めます。',
      `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
    ].join('');
  }
  if (relationStatusId === 'R4') {
    return [
      '距離ができている状態では、間合いの見え方と受け取り方のずれが先に目立ちやすいです。',
      '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、距離の入口、小さな接点、使える一言、試せる実験、振り返りまでを一続きで読めます。',
      `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
    ].join('');
  }
  if (relationStatusId === 'R5') {
    return [
      'いま離れている状態では、再接近の速さと受け取り方のずれが先に目立ちやすいです。',
      '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、距離の入口、小さな接点、使える一言、試せる実験、振り返りまでを一続きで読めます。',
      `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
    ].join('');
  }
  if (relationStatusId === 'R6') {
    return [
      '長く一緒にいる関係では、日常のペース差と受け取り方のずれが先に目立ちやすいです。',
      '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、進み方のずれの入口、言葉の置き方、使える一言、試せる実験、振り返りまでを一続きで読めます。',
      `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
    ].join('');
  }
  const hook =
    interactionId === 'space_misread'
      ? '間の意味が分かれるこのループが、他の場面ではどう出るか'
      : interactionId === 'one_carries_quiet'
        ? '残った一点が次の入口になるこのループが、他の場面ではどう出るか'
        : interactionId === 'talk_now_go_quiet'
          ? '確かめるほど静かになるこのループが、他の場面ではどう出るか'
          : interactionId === 'hard_return_hard_space'
            ? '戻る入口が重いこのループが、他の場面ではどう出るか'
            : interactionId === 'default_relationship_loop'
              ? 'いまの進み方が見えにくいこのループが、他の場面ではどう出るか'
              : '話し終えたと感じるタイミングの差が、他の場面ではどう出るか';
  return [
    `このループは、${hook}。`,
    '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、ずれの入口、戻し方、使える一言、試せる実験、振り返りまでを一続きで読めます。',
    `いま整理したいこと（${focusLabel}）の章から先に読めます。`,
  ].join('');
}

type RecognitionSurface = {
  relationshipTriggerJa: string;
  evidenceSupportJa: string;
  currentExpressionJa: string;
  betweenThem: string;
  mismatchEntry: string;
  misreadLoop: string;
  meshMoment: string;
  relationshipSequenceJa: readonly [string, string, string];
  freeDepthAngleJa: string;
};

type PaceSemantics = {
  heroObservation: string;
  currentNow: string;
  sequenceMid: string;
  timingMechanic: string;
};

function paceSemantics(
  decision: DecisionPaceAnswer,
  expression: ExpressionPaceAnswer,
): PaceSemantics {
  if (decision === 'decide_now' && expression === 'words_soon') {
    return {
      heroObservation: '話は結論も言葉もその場で前に出る',
      currentNow: '区切りと説明が同時に置かれている',
      sequenceMid: '違いのあと、先に出た区切りが次の話題への移り方を決めやすい',
      timingMechanic: '区切りと言葉が同時に出るため、次の場面への移り方が早く見える',
    };
  }
  if (decision === 'decide_now' && expression === 'words_later') {
    return {
      heroObservation: '話は先に区切りまで進むのに、言葉はまだ途中に残る',
      currentNow: '決まった区切りと、まだ出ていない説明が同時に見えている',
      sequenceMid: '違いのあと、途中に残った言葉の部分が会話を続けられる地点を決める',
      timingMechanic: '区切りが先に置かれ、言葉が追いつく前に会話が進んだように見える',
    };
  }
  if (decision === 'decide_now' && expression === 'words_vary') {
    return {
      heroObservation: '結論はその場で置かれるのに、言葉の出方はその日で変わる',
      currentNow: '結論はその場で置かれ、言葉になるタイミングだけがその日で変わっている',
      sequenceMid: '違いのあと、その日で変わる言葉のタイミングが区切りの見え方を入れ替える',
      timingMechanic: '結論はその場で置かれ、言葉の出方だけがその日で入れ替わる',
    };
  }
  if (decision === 'decide_later' && expression === 'words_soon') {
    return {
      heroObservation: '言葉が先に並ぶのに、結論はまだ置かれない',
      currentNow: '言葉は先に並び、結論はまだ置かれていない',
      sequenceMid: '違いのあと、先に並んだ言葉が結論の位置を曖昧にする',
      timingMechanic: '言葉が先に並び、結論が置かれる前に区切りが揃ったように見える',
    };
  }
  if (decision === 'decide_later' && expression === 'words_later') {
    return {
      heroObservation: '結論も言葉もその場では揃わず、沈黙が先に長くなる',
      currentNow: '沈黙が先に長くなり、言葉はあとから出ている',
      sequenceMid: '違いのあと、沈黙の長さが会話の終わりか続きかを先に見せる',
      timingMechanic: '沈黙が先に長くなり、言葉が出る前に会話が終わったように見える',
    };
  }
  if (decision === 'decide_later' && expression === 'words_vary') {
    return {
      heroObservation: '決めるまで時間を置きやすく、言葉になるタイミングは場面で変わる',
      currentNow: '決めるまで時間を置く一方、言葉になるタイミングがその場面で変わっている',
      sequenceMid: '違いのあと、場面で変わる言葉のタイミングが決めるタイミングの見え方を揺らす',
      timingMechanic: '決めるまで時間を置く一方で、言葉の出方だけがその場面で入れ替わる',
    };
  }
  if (decision === 'decide_varies' && expression === 'words_soon') {
    return {
      heroObservation: '言葉はすぐ出るが、結論を置くかどうかはその場面で変わる',
      currentNow: '言葉はすぐ出ているが、結論を置くかどうかはその場面で変わっている',
      sequenceMid: '違いのあと、その場面で結論を置くかどうかが区切りの見え方を入れ替える',
      timingMechanic: '言葉はすぐ出る一方で、結論を置く日と置かない日が入れ替わる',
    };
  }
  if (decision === 'decide_varies' && expression === 'words_later') {
    return {
      heroObservation: '言葉は遅れて出る一方、決めるタイミングはその場面で変わる',
      currentNow: '言葉は遅れて出ており、決めるタイミングがその場面で変わっている',
      sequenceMid: '違いのあと、決めるタイミングの入れ替わりと言葉の遅れが会話の地点をずらす',
      timingMechanic: '言葉が遅れて出る一方で、決めるタイミングがその場面で入れ替わる',
    };
  }
  return {
    heroObservation: '今日の進み方は話し始めてから見え、区切る日と置く日が入れ替わる',
    currentNow: '区切る日と置く日が入れ替わっており、今日の進み方が揃って見えにくい',
    sequenceMid: '違いのあと、区切る日と置く日の入れ替わりが次の会話の入口をずらす',
    timingMechanic: '区切る日と置く日が入れ替わり、今日の進み方が揃って見えにくい',
  };
}

function disagreementObservation(disagreement: DisagreementAnswer): string {
  if (disagreement === 'talk_now') return '違いが出ると、その場で言葉を重ねて話を揃えようとする';
  if (disagreement === 'take_space') return '違いが出ると、会話がいったん止まって間が空く';
  return '違いが出ると、話題を引き取って先へ進む';
}

function disagreementSequenceOnset(disagreement: DisagreementAnswer): string {
  if (disagreement === 'talk_now') {
    return '違いが出た直後、言葉が重なるほど区切りの位置が見えにくくなる。';
  }
  if (disagreement === 'take_space') {
    return '違いが出た直後、会話が止まるほど沈黙の長さが先に目立つ。';
  }
  return '違いが出た直後、会話の表面だけが先に進みやすい。';
}

function returnMismatch(returning: ReturnPatternAnswer): string {
  if (returning === 'someone_reaches') {
    return '短い声のあと、前の話題の続きが自然に戻るかどうかが揃いにくい。';
  }
  if (returning === 'time_restores') {
    return '時間をおいて戻ったあと、前の話題の温度が揃うかどうかが見えにくい。';
  }
  return '戻る入口が重いと、空白のあとに前の話題が続くかどうかが見えにくい。';
}

function conclusionMechanic(
  decision: DecisionPaceAnswer,
  expression: ExpressionPaceAnswer,
  disagreement: DisagreementAnswer,
  returning: ReturnPatternAnswer,
): string {
  if (decision === 'decide_now' && expression === 'words_later') {
    return '区切りが先に置かれ、言葉が追いつく前に会話が進んだように見える';
  }
  if (decision === 'decide_later' && expression === 'words_soon') {
    return '言葉が先に並び、結論が置かれる前に区切りが揃ったように見える';
  }
  if (decision === 'decide_later' && expression === 'words_later') {
    return '沈黙が先に長くなり、言葉が出る前に会話が終わったように見える';
  }
  if (disagreement === 'take_space') {
    return '沈黙の長さを、考える時間と終わりの合図と読み分けるのが難しい';
  }
  if (disagreement === 'one_carries') {
    return '話題は進んだように見えても、残った一点が次の入口で見えにくい';
  }
  if (returning === 'someone_reaches') {
    return '短い声のあと、前の話題の続きが自然に戻るかどうかが揃いにくい';
  }
  if (returning === 'time_restores') {
    return '時間をおいて戻ったあと、前の話題の温度が揃うかどうかが見えにくい';
  }
  if (returning === 'return_is_hard') {
    return '戻る入口が重いと、空白のあとに前の話題が続くかどうかが見えにくい';
  }
  return paceSemantics(decision, expression).timingMechanic;
}

function primaryBirthCue(
  pairProfile: ReturnType<typeof resolvePairCanonicalProfileV2>,
  differenceType: PairDifferenceType,
  visible: CivilBirthDimensionsV1,
  inward: CivilBirthDimensionsV1,
): string {
  if (!pairProfile) {
    return visible.start !== inward.start
      ? '始め方がずれていて、同じ速さに見えても戻り方が分かれやすい。'
      : '';
  }
  if (pairProfile.stemDeltaClass === 'far') {
    return '生まれの基調が離れていると、戻る合図の取り方が先に分かれやすい。';
  }
  if (!pairProfile.lunarAligned) {
    return '週のリズムが揃っていないと、同じ会話でも余力の出方がずれやすい。';
  }
  if (pairProfile.a.season3 !== pairProfile.b.season3) {
    return '予定の追い方が違うと、急ぐ日と置ける日が同時に来やすい。';
  }
  if (pairProfile.a.dayBand !== pairProfile.b.dayBand) {
    return '区切りの置き方が違うと、返す速さだけが先に分かれやすい。';
  }
  if (differenceType === 'near_dob_shift') {
    return '生まれの基調は近くても、違いは返す速さに出やすい。';
  }
  if (visible.start !== inward.start) {
    return '始め方がずれていて、同じ速さに見えても戻り方が分かれやすい。';
  }
  return '';
}

function returnPicture(returning: ReturnPatternAnswer): string {
  if (returning === 'someone_reaches') return '戻るときは短い声が先に入る';
  if (returning === 'time_restores') return '時間をおいてから、同じ話題の会話が自然に再開する';
  return '戻る入口が重く、空白が続きやすい';
}

function returnSupportJa(returning: ReturnPatternAnswer): string {
  if (returning === 'someone_reaches') {
    return '戻るときは短い声が先に入る。その短い声こそが、会話を再びつなぐ入口の合図になっている。';
  }
  if (returning === 'time_restores') {
    return '時間がたつと、二人の距離は自然に戻りやすい。その経過そのものが、会話をつなぎ直す手がかりになっている。';
  }
  return '戻る入口が重く、空白が続きやすい。その空白そのものが、戻りにくさの手がかりになっている。';
}

function returnSequenceBeat(returning: ReturnPatternAnswer): string {
  if (returning === 'someone_reaches') {
    return '声をかけ直したあと、途中だった話が再び続き始める。';
  }
  if (returning === 'time_restores') {
    return '時間を置いたあと、二人の距離が自然に戻りやすい。';
  }
  return '空白のあとも、前の話のどこが終わっていないかが残って見える。';
}

function establishedConclusionJa(
  disagreement: DisagreementAnswer,
  relationStatusId: 'R3' | 'R6',
  birthSentence: string,
): string {
  const prefix =
    relationStatusId === 'R6'
      ? '二人の間では、'
      : '二人の間では、関係が続いている場面でも、';
  const body =
    disagreement === 'talk_now'
      ? 'すれ違いの中心は話題そのものではなく、どこで会話を一区切りとみなすかの違いにある。'
      : disagreement === 'take_space'
        ? 'すれ違いの中心は沈黙そのものではなく、その沈黙をまだ会話の途中と読むかここで終わったと読むかの違いにある。'
        : 'すれ違いの中心は話題が進んだかどうかではなく、進んだあとに何が置き去りになったままかの違いにある。';
  return `${prefix}${body}${birthSentence}`;
}

function afterReturnPhrase(returning: ReturnPatternAnswer): string {
  if (returning === 'someone_reaches') return '短い声のあと';
  if (returning === 'time_restores') return '時間をおいた再開のあと';
  return '空白が続いたあと';
}

function smoothShareMoment(
  disagreement: DisagreementAnswer,
  returning: ReturnPatternAnswer,
): string {
  if (disagreement === 'talk_now' && returning === 'someone_reaches') {
    return '短い確認が一言返ると、話そのものは続きやすい。';
  }
  if (disagreement === 'take_space') {
    return '間が空く前に、また話す時点が見えていると、沈黙が空白になりにくい。';
  }
  if (disagreement === 'one_carries') {
    return '引き取った話題のあと、残った一点が一言だけ見えると、会話は閉じたことになりにくい。';
  }
  if (returning === 'time_restores') {
    return '時間をおいて同じ話題に戻れたとき、説明を足さなくても会話は再開しやすい。';
  }
  return '今の話の範囲に留まれると、会話は続きやすい。';
}

function establishedMisreadLoop(disagreement: DisagreementAnswer): string {
  if (disagreement === 'talk_now') {
    return '同じ型が続くと、区切りが揃った記憶だけが残り、話題の続きは薄れやすい。';
  }
  if (disagreement === 'take_space') {
    return '沈黙が続くたびに、終わりの合図と考える時間の区別が薄れやすい。';
  }
  return '同じ型が続くと、表面の流れだけが次の話題に持ち越されやすい。';
}

function composeLegacyRecognition(input: {
  answers: InsightContextAnswers;
  roles: { visible: string; inward: string };
  birth: string;
  interactionId: PairFreeInteractionId;
  pairProfile: ReturnType<typeof resolvePairCanonicalProfileV2>;
  differenceType: PairDifferenceType;
  visibleCivil: CivilBirthDimensionsV1;
  inwardCivil: CivilBirthDimensionsV1;
}): RecognitionSurface {
  const pace = paceSemantics(input.answers.decisionPace, input.answers.expressionPace);
  const disagree = disagreementObservation(input.answers.disagreement);
  const quiet =
    input.answers.distance === 'go_quiet' || input.interactionId === 'talk_now_go_quiet';
  const birthCue = primaryBirthCue(
    input.pairProfile,
    input.differenceType,
    input.visibleCivil,
    input.inwardCivil,
  );
  const heroBirthSuffix = birthCue ? ` ${birthCue}` : '';
  const hero = quiet
    ? `${pace.heroObservation}。確かめようとするほど、二人のあいだの静かな時間が長くなる。${heroBirthSuffix}`
    : input.interactionId === 'one_carries_quiet'
      ? `${disagree}。表では話が進んだように見えて、二人のあいだにはまだ一言が残る。${heroBirthSuffix}`
      : `${pace.heroObservation}。二人のあいだでは、${disagree}。${heroBirthSuffix}`;
  const support = quiet
    ? `${returnPicture(input.answers.returnPattern)}。そのあと、静けさが続いても前の話題に戻れるかどうかが見えにくい。`
    : returnSupportJa(input.answers.returnPattern);
  const current =
    input.answers.distance === 'explain_space'
      ? `いまの会話では、離れる前の説明が見えていても、${pace.currentNow}。`
      : `いまの会話では、${pace.currentNow}。`;
  const mismatch = mismatchEntryFromPace(
    input.answers.decisionPace,
    input.answers.expressionPace,
  );
  const mesh =
    input.answers.decisionPace === 'decide_later' && input.answers.expressionPace === 'words_later'
      ? '次に話す時点だけが見えていると、待っている時間が空白になりにくい。'
      : smoothShareMoment(input.answers.disagreement, input.answers.returnPattern);
  const mechanic = conclusionMechanic(
    input.answers.decisionPace,
    input.answers.expressionPace,
    input.answers.disagreement,
    input.answers.returnPattern,
  );
  return {
    relationshipTriggerJa: hero,
    evidenceSupportJa: support,
    currentExpressionJa: current,
    betweenThem: `二人の間では、${afterReturnPhrase(input.answers.returnPattern)}に残るのは意見の中身より、${mechanic}ことです。${input.birth}。`,
    mismatchEntry: mismatch,
    misreadLoop: establishedMisreadLoop(input.answers.disagreement),
    meshMoment: mesh,
    relationshipSequenceJa: [
      disagreementSequenceOnset(input.answers.disagreement),
      pace.sequenceMid + '。',
      returnSequenceBeat(input.answers.returnPattern),
    ],
    freeDepthAngleJa: quiet
      ? '静かな時間が長くなったあと、前の一言の意味が次の場面に引きずられやすい。'
      : '同じ話のあと、前の一言の意味が次の場面に引きずられやすい。',
  };
}

function buildR1FreeInsight(args: {
  answersV2: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: 'R1';
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) throw new Error('invalid_pair_dob');
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const meshMoment =
    args.answersV2.expressionPace === 'words_soon'
      ? '気持ちがすぐ言葉になりやすい日は、言葉の出方と相手の反応の見えなさが重なりやすいことがあります。'
      : args.answersV2.expressionPace === 'words_later'
        ? '言葉が遅れて出る日は、整っていない感覚と相手の反応の見えなさが重なりやすいことがあります。'
        : 'その日によって言葉の出方が変わるため、今日の温度が読み取りにくくなることがあります。';
  const mismatchEntry =
    args.answersV2.approachIntent === 'consider_reaching'
      ? '小さな接点を考え始めると、相手の反応が見えないまま、こちら側の想像だけが先に進みやすい。'
      : args.answersV2.approachIntent === 'wait_for_signal'
        ? '相手の様子を見てから動く前に、自分の中だけで意味を置く時間が長くなりやすい。'
        : 'まだ近づくかどうか決めていないあいだに、静けさへ意味を足してしまうことが起きやすい。';
  const misreadLoop =
    '相手の反応が見えないまま、自分の中だけで意味を置いてしまうと、静けさを拒否のように受け取りやすくなる。相手の気持ちは、まだ材料がないので決めない。';
  const reset =
    args.answersV2.approachIntent === 'consider_reaching'
      ? '小さな接点を考え始める前後で、相手の反応が見えない時間と自分の中で意味を置く時間が重なりやすい読み取りのずれが起きやすいことがあります。'
      : 'まだ近づくかどうか決めていないとき、静けさを拒否の合図のように受け取りやすい読み取りのずれが起きやすいことがあります。';
  const betweenThem =
    '二人の間では、まだ会話が始まっていないあいだに起きやすいのは、相手の気持ちの断定ではなく、こちら側の想像が先に進むことです。';
  const hit =
    args.answersV2.expressionPace === 'words_later'
      ? 'まだ会話がないまま、言葉を整える時間が先に長くなり、近づくかどうかはこちら側の中で揺れている。'
      : args.answersV2.expressionPace === 'words_soon'
        ? 'まだ会話がないまま、言葉だけが先に形になり、近づくかどうかはこちら側の中で揺れている。'
        : 'まだ会話がないまま、言葉にする日としない日が入れ替わり、近づくかどうかはこちら側の中で揺れている。';
  const evidenceSupportJa =
    args.answersV2.approachIntent === 'consider_reaching'
      ? '近づくことを考え始めていることと、言葉が出る速さが、相手の反応がないまま重なっている。'
      : args.answersV2.approachIntent === 'wait_for_signal'
        ? '相手の様子を見てから動こうとすることと、言葉が出る速さが、まだ会話のないまま重なっている。'
        : '近づくかどうかが決まっていないことと、言葉が出る速さが、まだ会話のないまま重なっている。';
  const currentExpressionJa =
    'いま起きているのは会話ではなく、言葉にする前の想像が先に進む時間です。相手の反応はまだ材料になっていない。';
  const relationshipSequenceJa = [
    'まだ会話がないまま、こちら側の中で意味が先に置かれる。',
    args.answersV2.expressionPace === 'words_soon'
      ? '言葉は先に形になるが、相手からの反応はまだ返ってこない。'
      : '言葉を整える時間が先に長くなり、相手からの反応はまだ返ってこない。',
    'その静けさを、拒否や同意としてはまだ読めない。',
  ] as const;
  const freeDepthAngleJa =
    '反応が返ってくる前に、静けさへ意味を足すかどうかは、こちら側だけで先に決まりやすい。';
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:no_contact:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${args.answersV2.expressionPace}:${args.answersV2.approachIntent}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE_R1,
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: 'default_relationship_loop',
    confidence: 'medium',
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem,
    currentExpressionJa,
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R1'),
    manifestationPatternId: `no_contact:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${args.answersV2.approachIntent}`,
    relationshipTriggerJa: hit,
    evidenceSupportJa,
    relationshipSequenceJa,
    freeDepthAngleJa,
    relationStatusId: 'R1',
  };
}

function buildR2FreeInsight(args: {
  answersV2: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: 'R2';
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) throw new Error('invalid_pair_dob');
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const meshMoment =
    args.answersV2.contactPace === 'steady_contact'
      ? '一定のリズムで続いているときは、速さの差が目立ちにくいことがあります。'
      : args.answersV2.contactPace === 'light_contact'
        ? '短いやり取りが中心のときは、反応の見え方が小さく感じられやすいことがあります。'
        : '時期によってやり取りの量が変わるときは、今日の温度が読み取りにくいことがあります。';
  const mismatchEntry =
    args.answersV2.expressionPace === 'words_soon'
      ? '言葉が先に出る日は、相手の反応がまだ見えない時間を長く感じやすいことがあります。'
      : args.answersV2.expressionPace === 'words_later'
        ? '言葉が遅れて出る日は、返す前に整える時間が長くなると、短いやり取りでも間の意味が先に大きく見えやすいことがあります。'
        : 'その日によって言葉の出方が変わるため、同じやり取りでも受け取り方がずれやすいことがあります。';
  const misreadLoop =
    '反応の量や速さだけを手がかりにすると、相手の気持ちを決めつけやすくなる。届いた合図の意味は、まだ一つには揃わない。';
  const reset =
    'やり取りの速さと受け取った合図の見え方が分かれやすく、読み取りのずれが生じやすいことがあります。';
  const betweenThem =
    '二人の間では、やり取りの量ではなく、届いた反応をどう受け取るかが先に分かれる。';
  const hit =
    args.answersV2.expressionPace === 'words_later'
      ? 'やり取りは続いているのに、返す前の間が先に長くなり、二人のあいだで合図の意味が揃わない。'
      : args.answersV2.expressionPace === 'words_soon'
        ? 'やり取りは続いているのに、言葉が先に出て、反応が見えるまでの間が二人のあいだで長く感じられる。'
        : 'やり取りは続いているのに、言葉の量がその日で変わり、二人のあいだで合図の意味が揃わない。';
  const evidenceSupportJa =
    args.answersV2.contactPace === 'light_contact'
      ? '短いやり取りが中心だと、届いた一言の意味が、関係の全体のように見えやすい。'
      : args.answersV2.contactPace === 'steady_contact'
        ? '一定のリズムで続いていても、言葉が出る速さと、返事までの間の意味は別々に残る。'
        : '時期によってやり取りの量が変わると、今日の一言の重さが揃わない。';
  const currentExpressionJa =
    'いまのやり取りでは、先に出た言葉のあとに、反応が見えない時間が残っている。';
  const relationshipSequenceJa = [
    '短い言葉が先に届く。',
    '返事までの間に、その言葉の意味がこちら側で先に大きくなる。',
    '次の一言が来ても、前の間の意味はまだ残って見えやすい。',
  ] as const;
  const freeDepthAngleJa =
    '返事までの間を、関心の量としてはまだ読めない。見えているのは、言葉が出てから次の一言までの時間だけです。';
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:early_contact:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${args.answersV2.expressionPace}:${args.answersV2.contactPace}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE_R2,
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: 'default_relationship_loop',
    confidence: 'medium',
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem,
    currentExpressionJa,
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R2'),
    manifestationPatternId: `early_contact:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${args.answersV2.contactPace}`,
    relationshipTriggerJa: hit,
    evidenceSupportJa,
    relationshipSequenceJa,
    freeDepthAngleJa,
    relationStatusId: 'R2',
    manualSideTendenciesJa: r2ManualSideTendenciesJa(args.answersV2),
  };
}

function buildR4FreeInsight(args: {
  answersV2: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: 'R4';
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) throw new Error('invalid_pair_dob');
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const distance = args.answersV2.distance ?? 'go_quiet';
  const meshMoment =
    distance === 'explain_space'
      ? '距離を取る理由や時間が伝わっているときは、間合いの見え方と言葉の出方がずれやすいことがあります。'
      : distance === 'go_quiet'
        ? '説明より先に静かになっているときは、静けさの意味が読み取りにくくなることがあります。'
        : '距離そのものを扱いにくいときは、間合いの見え方が大きく見えやすいことがあります。';
  const mismatchEntry =
    args.answersV2.expressionPace === 'words_soon'
      ? '言葉が先に出る日は、間合いの見え方が急に近づいたように感じられやすいことがあります。'
      : args.answersV2.expressionPace === 'words_later'
        ? '言葉が遅れて出る日は、静かな時間が長く感じられやすいことがあります。'
        : 'その日によって言葉の出方が変わるため、同じ間合いでも受け取り方がずれやすいことがあります。';
  const misreadLoop =
    '間合いの見え方だけを手がかりにすると、相手の気持ちを決めつけやすくなる。静けさの理由は、まだ一つには読めない。';
  const reset =
    '距離が感じられる場面では、間合いの見え方と言葉の出方の差が、読み取りのずれとして見えやすいことがあります。';
  const betweenThem =
    distance === 'go_quiet'
      ? '二人の間では、説明より先に静かになるとき、残るのは距離の結論ではなく、その静けさをどう見たかです。'
      : distance === 'explain_space'
        ? '二人の間では、理由が伝わっていても、残るのは距離の結論ではなく、言葉のあとにある間の長さです。'
        : '二人の間では、距離そのものを扱いづらいとき、残るのは近づいたかどうかではなく、間の見え方です。';
  const hit =
    distance === 'go_quiet'
      ? '説明より先に静かになる。二人のあいだでは、その静けさが整理なのか拒否なのか、まだ揃わない。'
      : distance === 'explain_space'
        ? '距離の理由は言葉になっているのに、二人のあいだでは、そのあとの間の長さが揃わない。'
        : '距離を言葉にしにくいとき、二人のあいだでは、近づいたように見える瞬間と、まだ間がある瞬間が同時に残る。';
  const evidenceSupportJa =
    args.answersV2.expressionPace === 'words_soon'
      ? '言葉が先に出る日は、静かな間が一気に縮んだように見えやすい。'
      : args.answersV2.expressionPace === 'words_later'
        ? '言葉が遅れて出る日は、静かな間がそのまま長く残りやすい。'
        : '言葉の量がその日で変わると、同じ間でも近づいた日と離れた日が入れ替わる。';
  const currentExpressionJa =
    'いま見えているのは、距離の理由そのものより、言葉が出てから次の沈黙までの長さです。';
  const relationshipSequenceJa = [
    distance === 'explain_space'
      ? '距離の理由が先に言葉になる。'
      : '説明より先に、静かな時間が置かれる。',
    'そのあとに言葉が出るかどうかで、間の長さが変わる。',
    '同じ沈黙が、整理している時間にも、離れた時間にも見えやすい。',
  ] as const;
  const freeDepthAngleJa =
    '静けさの理由を一つに決めないまま読むと、見えているのは間の長さだけになる。';
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:distanced:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${args.answersV2.expressionPace}:${distance}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE_R4,
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: 'default_relationship_loop',
    confidence: 'medium',
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem,
    currentExpressionJa,
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R4'),
    manifestationPatternId: `distanced:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${distance}`,
    relationshipTriggerJa: hit,
    evidenceSupportJa,
    relationshipSequenceJa,
    freeDepthAngleJa,
    relationStatusId: 'R4',
  };
}

function buildR5FreeInsight(args: {
  answersV2: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: 'R5';
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) throw new Error('invalid_pair_dob');
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const readiness = args.answersV2.reapproachReadiness ?? 'timing_uncertain';
  const distance = args.answersV2.distance ?? 'go_quiet';
  const manualSideTendenciesJa = manualSideTendenciesFromSideLeadAnswers(
    args.answersV2,
    args.personAUsesFirstPerspective,
    'R5',
  );
  if (readiness === 'not_considering_reapproach') {
    const meshMoment =
      args.answersV2.expressionPace === 'words_soon'
        ? '気持ちがすぐ言葉になりやすい日は、言葉の出方の違いが先に見えやすいことがあります。'
        : args.answersV2.expressionPace === 'words_later'
          ? '言葉が遅れて出る日は、言葉が整うまでの時間の見え方が、読み取りのずれとして見えやすいことがあります。'
          : 'その日によって言葉の出方が変わるため、いまの温度が読み取りにくくなることがあります。';
    const mismatchEntry =
      distance === 'explain_space'
        ? '距離の理由は伝わっていても、間合いの見え方がずれやすいことがあります。'
        : distance === 'go_quiet'
          ? '静かな間合いのあとでは、言葉の出方の違いが読み取りにくくなることがあります。'
          : '距離そのものを扱いにくいときは、間合いの見え方が大きく見えやすいことがあります。';
    const misreadLoop =
      '相手の気持ちを決めつけずに読むと、いまの距離の見え方だけが先に立つ。自分が整えたい一点と、間の長さはまだ別のものです。';
    const reset =
      '今は近づくことを考えていないため、距離の見え方と言葉の出方だけを手がかりにします。';
    const betweenThem =
      '二人の間では、今は近づくことを考えていない状態で残るのは、距離の結論ではなく、言葉のあとにある間の長さです。';
    const hit =
      distance === 'go_quiet'
        ? 'いまの距離では、説明より先に静かな時間が置かれ、二人のあいだでその意味はまだ揃わない。'
        : 'いまの距離では、言葉が出たあとの間の長さが、二人のあいだでまだ揃わない。';
    const evidenceSupportJa =
      '近づくことは考えていない。見えているのは、言葉が出る速さと、静かな間の長さだけです。';
    const currentExpressionJa =
      'いま見えているのは、距離を縮める話ではなく、言葉のあとにある沈黙の長さです。';
    const relationshipSequenceJa = [
      '言葉が出るか、静かな時間が先に置かれる。',
      'そのあとの間が、こちら側では長く感じられやすい。',
      'その長さを、相手の結論としてはまだ読めない。',
    ] as const;
    const freeDepthAngleJa =
      '今は近づくことを考えていないので、沈黙を、戻る合図としても拒否としてもまだ読めない。';
    return {
      id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:reapproach:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${readiness}:${distance}:${args.answersV2.expressionPace}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
      kind: 'pair_free_v2',
      evidenceQuestionIds: EVIDENCE_R5,
      pairAxisId: args.pairAxisId,
      pairDifferenceType: differenceType,
      aBirthEvidence: true,
      bBirthEvidence: true,
      pairAnswerEvidence: true,
      independentAAnswerEvidence: false,
      independentBAnswerEvidence: false,
      interactionId: 'default_relationship_loop',
      confidence: 'medium',
      personAUsesFirstPerspective: args.personAUsesFirstPerspective,
      betweenThem,
      currentExpressionJa,
      meshMoment,
      mismatchEntry,
      misreadLoop,
      reset,
      premiumContinuation: [
        'いま離れている状態では、再接近の速さと受け取り方のずれが先に目立ちやすいです。',
        '「二人の相性レポート」では、六つの場面ごとに、あなたと相手の見え方、距離の入口、小さな接点、使える一言、試せる実験、振り返りまでを一続きで読めます。',
        `いま整理したいこと（${args.focusLabel}）の章から先に読めます。`,
      ].join(''),
      manifestationPatternId: `reapproach:${visibleCivil.start}x${inwardCivil.start}:${readiness}:${distance}:${args.answersV2.expressionPace}`,
      relationshipTriggerJa: hit,
      evidenceSupportJa,
      relationshipSequenceJa,
      freeDepthAngleJa,
      relationStatusId: 'R5',
      ...(manualSideTendenciesJa ? { manualSideTendenciesJa } : {}),
    };
  }
  const meshMoment =
    readiness === 'small_step_first'
      ? '小さな接点から始めたいときは、大きな話を先に置きにくいことがあります。'
      : readiness === 'need_clarity_first'
        ? '先に自分の気持ちを整理したいときは、近づく前に整える時間が必要に感じられやすいことがあります。'
        : 'タイミングがまだ見えないときは、近づくかどうかの判断が保留になりやすいことがあります。';
  const mismatchEntry =
    distance === 'explain_space'
      ? '距離の理由は伝わっていても、再接近のタイミングの見え方がずれやすいことがあります。'
      : distance === 'go_quiet'
        ? '静かな間合いのあとでは、小さな接点の重さが読み取りにくくなることがあります。'
        : '距離そのものを扱いにくいときは、再接近の入口が大きく見えやすいことがあります。';
  const misreadLoop =
    '相手の気持ちを決めつけずに読むと、もう一度近づく入口は小さく見える。自分が整えたい一点と、いまの間の長さはまだ別のものです。';
  const reset =
    'もう一度近づく前は、再接近のタイミングと今の間合いの見え方が、読み取りのずれとして見えやすいことがあります。';
  const betweenThem =
    '二人の間では、もう一度近づく前に残るのは、気持ちの断定ではなく、言葉のあとにある間の長さです。';
  const hit =
    readiness === 'small_step_first'
      ? 'もう一度近づく前でも、大きな話より先に短い言葉が出て、二人のあいだではその重さが揃わない。'
      : readiness === 'need_clarity_first'
        ? 'もう一度近づく前でも、自分の中で言葉を整える時間が先に長くなり、二人のあいだでは間の意味が揃わない。'
        : 'もう一度近づく前でも、タイミングが見えないまま言葉だけが出て、二人のあいだでは間の意味が揃わない。';
  const evidenceSupportJa =
    distance === 'go_quiet'
      ? '静かな時間が先に置かれていることと、言葉が出る速さが、同じあいだに重なっている。'
      : '距離の理由が言葉になっていることと、そのあとの間の長さが、同じあいだに重なっている。';
  const currentExpressionJa =
    'いま見えているのは、近づいたあとではなく、言葉が出てから次の沈黙までの長さです。';
  const relationshipSequenceJa = [
    '短い言葉か、静かな時間が先に置かれる。',
    'そのあとの間が、こちら側では長く感じられやすい。',
    'その長さを、相手が戻るかどうかとしてはまだ読めない。',
  ] as const;
  const freeDepthAngleJa =
    'もう一度近づく前の沈黙を、同意としても拒否としてもまだ読めない。見えているのは間の長さだけです。';
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:reapproach:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${readiness}:${distance}:${args.answersV2.expressionPace}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE_R5,
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: 'default_relationship_loop',
    confidence: 'medium',
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem,
    currentExpressionJa,
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R5'),
    manifestationPatternId: `reapproach:${visibleCivil.start}x${inwardCivil.start}:${readiness}:${distance}:${args.answersV2.expressionPace}`,
    relationshipTriggerJa: hit,
    evidenceSupportJa,
    relationshipSequenceJa,
    freeDepthAngleJa,
    relationStatusId: 'R5',
    ...(manualSideTendenciesJa ? { manualSideTendenciesJa } : {}),
  };
}

function buildEstablishedNativeFreeInsight(args: {
  answersV2: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: 'R3' | 'R6';
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) throw new Error('invalid_pair_dob');
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const observationGapQuestionIds = establishedObservationGapIds(args.answersV2);
  const decisionPaceNoObs = isNoObservationDecisionPace(args.answersV2.decisionPace);
  const disagreementNoObs = isNoObservationDisagreement(args.answersV2.disagreement);
  const returnPatternNoObs = isNoObservationReturnPattern(args.answersV2.returnPattern);
  const expressionPace = args.answersV2.expressionPace ?? 'words_soon';
  const returnPattern = returnPatternNoObs
    ? null
    : isBehavioralReturnPatternValue(args.answersV2.returnPattern)
      ? args.answersV2.returnPattern
      : 'someone_reaches';
  const roles = roleLabels(args.personAUsesFirstPerspective);
  const birth = birthLead(
    visibleCivil,
    inwardCivil,
    roles,
    args.pairAxisId,
    differenceType,
    stemDelta,
  );
  const centralEvidence = buildEstablishedCentralEvidenceV1(args.answersV2);
  const central = resolvePairCentralInferenceV1(centralEvidence);
  const birthCue = primaryBirthCue(
    pairProfile,
    differenceType,
    visibleCivil,
    inwardCivil,
  );
  const surface = projectPairFreeFieldsV1({
    central,
    relationStatusId: args.relationStatusId,
    ...(birthCue ? { birthOpeningSuffix: birthCue } : {}),
    birthConclusionSuffix: birth,
  });
  const { meshMoment, mismatchEntry, misreadLoop, betweenThem } = surface;
  const reset = returnPatternNoObs
    ? NO_OBS_RESET
    : resetFromReturnPattern(returnPattern!, { decisionPaceNoObs });
  const evidenceQuestionIds = EVIDENCE_ESTABLISHED.filter((questionId) => {
    if (questionId === 'decisionPace' && decisionPaceNoObs) return false;
    if (questionId === 'disagreement' && disagreementNoObs) return false;
    if (questionId === 'returnPattern' && returnPatternNoObs) return false;
    return true;
  });
  const answerFingerprint = [
    args.answersV2.decisionPace ?? 'missing_decisionPace',
    args.answersV2.disagreement ?? 'missing_disagreement',
    expressionPace,
    args.answersV2.returnPattern ?? 'missing_returnPattern',
  ].join(':');
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:established_native:${args.relationStatusId}:${args.pairAxisId}:${differenceType}:${visibleCivil.start}-${inwardCivil.start}:${stemDelta}:${answerFingerprint}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds,
    ...(observationGapQuestionIds.length > 0 ? { observationGapQuestionIds } : {}),
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: 'default_relationship_loop',
    confidence: 'medium',
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem,
    currentExpressionJa: surface.currentExpressionJa,
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(
      args.focusLabel,
      'default_relationship_loop',
      args.relationStatusId,
    ),
    manifestationPatternId: `established_native:${args.relationStatusId}:${visibleCivil.start}x${inwardCivil.start}:${answerFingerprint}`,
    relationshipTriggerJa: surface.relationshipTriggerJa,
    evidenceSupportJa: surface.evidenceSupportJa,
    relationshipSequenceJa: surface.relationshipSequenceJa,
    freeDepthAngleJa: surface.freeDepthAngleJa,
    relationStatusId: args.relationStatusId,
    ...(() => {
      const manualSideTendenciesJa = establishedManualSideTendenciesJa(
        args.answersV2,
        args.personAUsesFirstPerspective,
        args.relationStatusId,
        misreadLoop,
      );
      return manualSideTendenciesJa ? { manualSideTendenciesJa } : {};
    })(),
  };
}

export function buildPairFreeInsightSpecV2(args: {
  answers?: CompatibilityCurrentContextAnswers;
  answersV2?: CompatibilityCurrentContextAnswersV2;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
  relationStatusId: RelationStatusId;
}): PairFreeInsightSpecV2 {
  if (args.relationStatusId === 'R1') {
    if (!args.answersV2) throw new Error('answersV2_required');
    return buildR1FreeInsight({ ...args, answersV2: args.answersV2, relationStatusId: 'R1' });
  }
  if (args.relationStatusId === 'R2') {
    if (!args.answersV2) throw new Error('answersV2_required');
    return buildR2FreeInsight({ ...args, answersV2: args.answersV2, relationStatusId: 'R2' });
  }
  if (args.relationStatusId === 'R4') {
    if (!args.answersV2) throw new Error('answersV2_required');
    return buildR4FreeInsight({ ...args, answersV2: args.answersV2, relationStatusId: 'R4' });
  }
  if (args.relationStatusId === 'R5') {
    if (!args.answersV2) throw new Error('answersV2_required');
    return buildR5FreeInsight({ ...args, answersV2: args.answersV2, relationStatusId: 'R5' });
  }
  if (
    (args.relationStatusId === 'R3' || args.relationStatusId === 'R6') &&
    args.answersV2
  ) {
    return buildEstablishedNativeFreeInsight({
      ...args,
      answersV2: args.answersV2,
      relationStatusId: args.relationStatusId,
    });
  }
  const answers =
    args.answers ??
    (args.answersV2
      ? insightAnswersFromV2(args.answersV2, args.relationStatusId)
      : undefined);
  if (!answers) throw new Error('answers_required');
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) {
    throw new Error('invalid_pair_dob');
  }
  const pairProfile = resolvePairCanonicalProfileV2({
    personABirthDate: args.personABirthDate,
    personBBirthDate: args.personBBirthDate,
  });
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const selected = selectInteraction(answers);
  const roles = roleLabels(args.personAUsesFirstPerspective);
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const stemDelta = pairProfile?.stemDeltaClass ?? 'near';
  const conflict = loopFromConflict(
    answers.disagreement,
    answers.distance,
    answers.returnPattern,
    roles,
  );
  const birth = birthLead(
    visibleCivil,
    inwardCivil,
    roles,
    args.pairAxisId,
    differenceType,
    stemDelta,
  );
  const surface = composeLegacyRecognition({
    answers,
    roles,
    birth,
    interactionId: selected.interactionId,
    pairProfile,
    differenceType,
    visibleCivil,
    inwardCivil,
  });
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:${selected.interactionId}:${args.pairAxisId}:${differenceType}:${aCivil.value.start}-${bCivil.value.start}:${stemDelta}:${pairProfile?.lunarAligned ? 'l1' : 'l0'}:${answers.decisionPace}-${answers.disagreement}-${answers.distance ?? 'no_distance'}-${answers.expressionPace}-${answers.returnPattern}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE,
    pairAxisId: args.pairAxisId,
    pairDifferenceType: differenceType,
    aBirthEvidence: true,
    bBirthEvidence: true,
    pairAnswerEvidence: true,
    independentAAnswerEvidence: false,
    independentBAnswerEvidence: false,
    interactionId: selected.interactionId,
    confidence: selected.confidence,
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem: surface.betweenThem,
    currentExpressionJa: surface.currentExpressionJa,
    meshMoment: surface.meshMoment,
    mismatchEntry: surface.mismatchEntry,
    misreadLoop: surface.misreadLoop,
    reset: conflict.reset,
    premiumContinuation: premiumContinuation(
      args.focusLabel,
      selected.interactionId,
      args.relationStatusId,
    ),
    manifestationPatternId: `${selected.interactionId}:${visibleCivil.start}x${inwardCivil.start}:${stemDelta}:${pairProfile?.lunarAligned ? 'lsame' : 'ldiff'}:${pairProfile?.a.stemLane ?? 'x'}x${pairProfile?.b.stemLane ?? 'x'}:${answers.decisionPace}:${answers.disagreement}:${answers.distance ?? 'no_distance'}:${answers.expressionPace}:${answers.returnPattern}`,
    relationshipTriggerJa: surface.relationshipTriggerJa,
    evidenceSupportJa: surface.evidenceSupportJa,
    relationshipSequenceJa: surface.relationshipSequenceJa,
    freeDepthAngleJa: surface.freeDepthAngleJa,
    relationStatusId: args.relationStatusId,
  };
}
