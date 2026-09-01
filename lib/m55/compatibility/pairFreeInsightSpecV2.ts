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
  readonly betweenThem: string;
  readonly meshMoment: string;
  readonly mismatchEntry: string;
  readonly misreadLoop: string;
  readonly reset: string;
  readonly premiumContinuation: string;
  readonly manifestationPatternId: string;
  readonly relationshipTriggerJa: string;
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

function mismatchEntryFromDecisionPace(decisionPace: DecisionPaceAnswer): string {
  if (decisionPace === 'decide_now') {
    return 'その場で進めたい動きと、言葉が整うまでの時間差が、読み取りのずれとして見えやすいことがあります。';
  }
  if (decisionPace === 'decide_later') {
    return '答えを出す前に言葉が先に出ると、読み取りのずれとして見えやすいことがあります。';
  }
  return '決める速さが場面で変わるため、今日の進み方が読み取りにくくなることがあります。';
}

function misreadLoopFromDisagreement(disagreement: DisagreementAnswer): string {
  if (disagreement === 'talk_now') {
    return '違いをその場の言葉で揃えたい動きと、静かに整えたい動きが逆方向に見えやすいことがあります。受け取り方の差だけを先に見ると、ずれが小さく見えることがあります。';
  }
  if (disagreement === 'take_space') {
    return 'いったん間を取る動きと、先に声をかける動きの意味が、同じ場面でも違って見えやすいことがあります。間の意味を一つに決めずに読むと、ずれが小さく見えることがあります。';
  }
  return '話題を引き取る動きと、まだ残っている一点の見え方がずれやすいことがあります。出なかった一点だけを先に見ると、ずれが小さく見えることがあります。';
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

const TEMPO: Readonly<
  Record<
    DecisionPaceAnswer,
    Readonly<Record<ExpressionPaceAnswer, { between: string; mesh: string; entry: string }>>
  >
> = {
  decide_now: {
    words_soon: {
      between: '二人がこじれるとしたら、意見そのものより「結論を出す速度」と「言葉になる速度」が重なって速くなりすぎるところから始まりやすい。',
      mesh: '同じ方向に早く進みたいときは、短い確認がそのまま安心になりやすい。',
      entry: '片方だけがまだ整っていないのに、結論と言葉が先に出ると、置いていかれた感じが残りやすい。',
    },
    words_later: {
      between: '二人がこじれるとしたら、意見そのものより「結論を出す速度」の違いから始まりやすい。その場で進めたい動きと、言葉になるまでの間が逆方向になりやすい。',
      mesh: '急がない話題では、先に方向だけ置いて、言葉はあとにしてよいと分かっているときに会話が続きやすい。',
      entry: 'その場で決めようとする動きを、言葉が遅い側は「気持ちが離れた／急かされている」と読みやすい。',
    },
    words_vary: {
      between: '決める速さとその日の言葉の出方が場面で変わるため、同じ二人でも「今日は早い／遅い」の読み違いが起きやすい。',
      mesh: '今日は話せる日か、決める日かを先にそろえられると、速さの差が責めに変わりにくい。',
      entry: '片方は決める日、もう片方は言葉を探す日だと、沈黙が拒否に見えやすい。',
    },
  },
  decide_later: {
    words_soon: {
      between: '二人がこじれるとしたら、結論は置きたい側と、先に言葉を出して確かめたい側の時間差から始まりやすい。',
      mesh: '「今は決めない。でも今の気持ちはこれ」と分けられると、待つことと伝えることが同時に成立しやすい。',
      entry: '先に出た言葉を結論と読むと、置いて考えたい側は急かされたように感じやすい。',
    },
    words_later: {
      between: '決めるのも言葉にするのも時間がかかるため、静かな時間が長くなりやすい。静けさの意味が揃わないと、離れ始めたように見えやすい。',
      mesh: '次に話す時点だけ先に置けると、待っている時間が空白に見えにくい。',
      entry: 'どちらも考えているのに、合図がないと「関心が薄い」と読みやすい。',
    },
    words_vary: {
      between: '決めるのは置きたいのに、言葉の速さは日によって変わる。今日の余力が見えないと、待つことと黙ることが混線しやすい。',
      mesh: '急ぐ話か待てる話かを、内容へ入る前にそろえられると返事の温度が揃いやすい。',
      entry: '言葉が出た日を「決めた日」と読むと、まだ置いている側とのずれが始まりやすい。',
    },
  },
  decide_varies: {
    words_soon: {
      between: '決める速さは場面で変わるのに、気持ちは比較的すぐ言葉になる。言葉の速さが、今回は急ぐ話だという合図に見えやすい。',
      mesh: '「これは急がなくてよい」と先に言えると、早い言葉が結論扱いになりにくい。',
      entry: 'すぐ出た言葉を方針と読むと、今日は待てる話だった側が置いていかれやすい。',
    },
    words_later: {
      between: '決める速さが場面で変わり、言葉は遅れて出る。速さの切り替えが見えないと、黙っている時間が拒否にも、放置にも見えやすい。',
      mesh: '今回は急ぐ話か待てる話かを先に置けると、言葉の遅れが冷たさに見えにくい。',
      entry: '急ぐ側が先に動くと、言葉を探している側は置いていかれたように感じやすい。',
    },
    words_vary: {
      between: '決める速さも言葉の速さも場面で変わるため、いまの二人の進み方が見えにくい。見えなさ自体が不安になりやすい。',
      mesh: '今日の進め方を一文でそろえられると、速さの差が人格の差に見えにくい。',
      entry: '揃えないまま中身に入ると、速さの差が熱量の差に読み替わりやすい。',
    },
  },
};

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

function pairOpeningHit(
  _answers: InsightContextAnswers,
  visibleStart: CivilBirthDimensionsV1['start'],
  inwardStart: CivilBirthDimensionsV1['start'],
  interactionId: PairFreeInteractionId,
): string {
  const startSplit = visibleStart !== inwardStart;
  if (interactionId === 'talk_now_go_quiet') {
    return startSplit
      ? '片方は今の話で揃えようとし、もう片方は先に静かになる。確かめようとするほど、静かな時間が長くなりやすい。'
      : '片方は今の話で揃えようとし、もう片方は先に静かになる。同じ速さに見えても、確かめたい側と間を取りたい側が同時に出やすい。';
  }
  if (interactionId === 'space_misread') {
    return startSplit
      ? '片方は今夜のうちに距離の理由を置きたくなり、もう片方は説明せず静かになりやすい。その静けさを拒否と受け取りやすいところからずれやすい。'
      : '同じ間でも、意味の取り方が分かれやすい。';
  }
  if (interactionId === 'one_carries_quiet') {
    return startSplit
      ? '表では話が進んだように見え、片方はまだ言えていない一点を持ち帰っている。終わった会話と、残った一点が次の入口になりやすい。'
      : '表では話が進んだように見え、片方はまだ言えていない一点を持ち帰っている。閉じた側と残した側が、次の会話で入れ替わりやすい。';
  }
  if (interactionId === 'tempo_mismatch' || interactionId === 'later_decide_words_soon') {
    if (startSplit) {
      return '二人がすれ違うとしたら、意見の違いより「話し終えたと感じるタイミング」の差から始まりやすい。話は終わったと思っている側と、まだ大事な一点が残っている側が、同じ会話の中に同時にいる。';
    }
    if (_answers.decisionPace === 'decide_later' && _answers.expressionPace === 'words_soon') {
      return '答えを出す前に一度置きたい側と、先に言葉で確かめたい側が、同じ速さに見えて同時に出やすい。';
    }
    return '進み方の速さは近く見えても、話を閉じたい側と、言葉が出るまで置きたい側が同時に出やすい。';
  }
  if (interactionId === 'hard_return_hard_space') {
    return '間を取ることと戻ることがどちらも重く、片方は今夜のうちに次の接点を欲しくなり、もう片方は入口自体を作りにくい。終わらない空白が、拒否にも疲れにも見えやすい。';
  }
  return startSplit
    ? '同じ話題でも、先に小さく動く側と揃えてから返したい側が同時に走りやすい。速さの差が、熱量の差として受け取りやすい。'
    : '決める速さも言葉の速さも日によって変わるため、いまの二人の進み方が見えにくい。見えなさ自体が不安になりやすい。';
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

function meshFromBirth(
  visible: CivilBirthDimensionsV1,
  inward: CivilBirthDimensionsV1,
  tempoMesh: string,
): string {
  if (visible.start !== inward.start) {
    return '今夜は方向だけ置いて、本題は翌朝にする、と先に言えると会話が続きやすい。';
  }
  return tempoMesh;
}

function pickPairAnswerSupport(
  answers: InsightContextAnswers,
  interactionId: PairFreeInteractionId,
): string {
  const returnBeat =
    answers.returnPattern === 'someone_reaches'
      ? '戻るきっかけは短い声かけから始まりやすい。'
      : answers.returnPattern === 'time_restores'
        ? '戻るきっかけは自然に会話が戻ったあとに残る。'
        : '戻るきっかけそのものが重く、空白が続きやすい。';
  const distanceBeat =
    answers.distance === 'explain_space'
      ? '離れる前に次に話す時点を置けると、戻りやすい。'
      : answers.distance === 'go_quiet'
        ? '静かになる時間を拒否と読みやすい。'
        : answers.distance === 'space_is_hard'
          ? '間を取ること自体が負荷になりやすい。'
          : '';
  const disagreeBeat =
    answers.disagreement === 'talk_now'
      ? '違いが出ると、その場で言葉を重ねたくなる。'
      : answers.disagreement === 'take_space'
        ? '違いが出ると、いったん間を取りたくなる。'
        : '違いが出ると、表では話題を引き取りやすい。';
  if (
    interactionId === 'talk_now_go_quiet' ||
    interactionId === 'space_misread' ||
    interactionId === 'one_carries_quiet'
  ) {
    return returnBeat;
  }
  if (interactionId === 'hard_return_hard_space') {
    return distanceBeat || disagreeBeat;
  }
  if (!answers.distance) {
    return disagreeBeat;
  }
  if (answers.disagreement !== 'talk_now') return disagreeBeat;
  if (answers.distance !== 'explain_space') return distanceBeat;
  return returnBeat;
}

function pickPairBirthSupport(
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

function betweenThemLine(
  answers: InsightContextAnswers,
  roles: { visible: string; inward: string },
  birth: string,
  hit: string,
  interactionId: PairFreeInteractionId,
  tempoBetween: string,
  pairProfile: ReturnType<typeof resolvePairCanonicalProfileV2>,
  differenceType: PairDifferenceType,
  visibleCivil: CivilBirthDimensionsV1,
  inwardCivil: CivilBirthDimensionsV1,
): string {
  const answer = sideLead(answers, roles);
  const answerSupport = pickPairAnswerSupport(answers, interactionId);
  const birthSupport =
    interactionId === 'tempo_mismatch' || interactionId === 'later_decide_words_soon'
      ? ''
      : pickPairBirthSupport(pairProfile, differenceType, visibleCivil, inwardCivil);
  const mechanism =
    interactionId === 'tempo_mismatch' ||
    interactionId === 'later_decide_words_soon' ||
    /結論を出す速度/.test(tempoBetween) ||
    hit.includes(tempoBetween.slice(0, 12))
      ? ''
      : tempoBetween;
  return `二人の間では、${hit}${answer}。${mechanism}${answerSupport}${birthSupport}そのため二人の間では、${birth}。`;
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
      ? '小さな接点を考え始めると、相手の反応が見えないまま先に動きが大きくなりやすいことがあります。'
      : args.answersV2.approachIntent === 'wait_for_signal'
        ? '相手の様子を見ながら動く前に確かめたいとき、自分の中だけで意味を置く時間が長くなりやすいことがあります。'
        : 'まだ近づくかどうか決めていないとき、動かない間に相手の気持ちを想像しやすいことがあります。';
  const misreadLoop =
    '相手の反応が見えないまま、自分の中だけで意味を置いてしまうと、静けさを拒否のように受け取りやすくなることがあります。相手の気持ちを決めつけずに読むと、ずれが小さく見えることがあります。';
  const reset =
    args.answersV2.approachIntent === 'consider_reaching'
      ? '小さな接点を考え始める前後で、相手の反応が見えない時間と自分の中で意味を置く時間が重なりやすい読み取りのずれが起きやすいことがあります。'
      : 'まだ近づくかどうか決めていないとき、静けさを拒否の合図のように受け取りやすい読み取りのずれが起きやすいことがあります。';
  const betweenThem =
    '二人の間では、まだ会話が始まっていない状態でも、気持ちの言葉の出方と、近づくかどうかの迷いが、読み取りのずれを生みやすいことがあります。';
  const hit =
    'まだ会話がない状態では、相手の反応が見えないまま自分の中で意味を置きやすく、読み取りのずれが先に立ちやすいことがあります。';
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
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R1'),
    manifestationPatternId: `no_contact:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${args.answersV2.approachIntent}`,
    relationshipTriggerJa: hit,
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
        ? '言葉が遅れて出る日は、返す前に整える時間を、相手には関心の薄さのように見えやすいことがあります。'
        : 'その日によって言葉の出方が変わるため、同じやり取りでも受け取り方がずれやすいことがあります。';
  const misreadLoop =
    '反応の量や速さだけを手がかりにすると、相手の気持ちを決めつけやすくなることがあります。届いた合図の見え方が分かれると、読み取りのずれが生じやすいことがあります。';
  const reset =
    'やり取りの速さと受け取った合図の見え方が分かれやすく、読み取りのずれが生じやすいことがあります。';
  const betweenThem =
    '二人の間では、やり取りの速さや反応の見え方の違いが、まだ関係の形を決めずに読み取りのずれを生みやすいことがあります。';
  const hit =
    'やり取りのリズムは近く見えても、受け取った合図の見え方が分かれやすいことがあります。';
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
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R2'),
    manifestationPatternId: `early_contact:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${args.answersV2.contactPace}`,
    relationshipTriggerJa: hit,
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
    '間合いの見え方だけを手がかりにすると、相手の気持ちを決めつけやすくなることがあります。距離の理由を一つに決めずに読むと、ずれが小さく見えることがあります。';
  const reset =
    '距離が感じられる場面では、間合いの見え方と言葉の出方の差が、読み取りのずれとして見えやすいことがあります。';
  const betweenThem =
    '二人の間では、距離が感じられる状態でも、間合いの見え方と言葉の出方の違いが、読み取りのずれを生みやすいことがあります。';
  const hit =
    '距離がある場面では、間合いの見え方の差が先に立ちやすいことがあります。';
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
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R4'),
    manifestationPatternId: `distanced:${visibleCivil.start}x${inwardCivil.start}:${args.answersV2.expressionPace}:${distance}`,
    relationshipTriggerJa: hit,
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
      '相手の気持ちを決めつけずに読むと、いまの距離の見え方だけが先に立ちやすいことがあります。自分が整えたい一点と、間合いの見え方がずれると、読み取りのずれが生じやすいことがあります。';
    const reset =
      '今は近づくことを考えていないため、距離の見え方と言葉の出方だけを手がかりにします。';
    const betweenThem =
      '二人の間では、以前は近かったがいま離れている状態でも、間合いの見え方と言葉の出方の違いが、読み取りのずれを生みやすいことがあります。';
    const hit = 'いまの距離の見え方の差が先に立ちやすいことがあります。';
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
    '相手の気持ちを決めつけずに読むと、再接近の入口が小さく見えることがあります。自分が整えたい一点と、間合いの見え方がずれると、読み取りのずれが生じやすいことがあります。';
  const reset =
    'もう一度近づく前は、再接近のタイミングと今の間合いの見え方が、読み取りのずれとして見えやすいことがあります。';
  const betweenThem =
    '二人の間では、もう一度近づくことを考える場面でも、再接近のタイミングと間合いの見え方が、読み取りのずれを生みやすいことがあります。';
  const hit =
    '再接近を考える場面では、間合いの見え方の差が先に立ちやすいことがあります。';
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
    meshMoment,
    mismatchEntry,
    misreadLoop,
    reset,
    premiumContinuation: premiumContinuation(args.focusLabel, 'default_relationship_loop', 'R5'),
    manifestationPatternId: `reapproach:${visibleCivil.start}x${inwardCivil.start}:${readiness}:${distance}:${args.answersV2.expressionPace}`,
    relationshipTriggerJa: hit,
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
  const decisionPace = decisionPaceNoObs
    ? null
    : isBehavioralDecisionPaceValue(args.answersV2.decisionPace)
      ? args.answersV2.decisionPace
      : 'decide_later';
  const disagreement = disagreementNoObs
    ? null
    : isBehavioralDisagreementValue(args.answersV2.disagreement)
      ? args.answersV2.disagreement
      : 'talk_now';
  const expressionPace = args.answersV2.expressionPace ?? 'words_soon';
  const returnPattern = returnPatternNoObs
    ? null
    : isBehavioralReturnPatternValue(args.answersV2.returnPattern)
      ? args.answersV2.returnPattern
      : 'someone_reaches';
  const meshMoment = meshMomentFromExpression(expressionPace, { decisionPaceNoObs });
  const mismatchEntry = decisionPaceNoObs
    ? NO_OBS_MISMATCH_ENTRY
    : mismatchEntryFromDecisionPace(decisionPace!);
  const misreadLoop = disagreementNoObs
    ? NO_OBS_MISREAD_LOOP
    : misreadLoopFromDisagreement(disagreement!);
  const reset = returnPatternNoObs
    ? NO_OBS_RESET
    : resetFromReturnPattern(returnPattern!, { decisionPaceNoObs });
  const betweenThem =
    observationGapQuestionIds.length === 3
      ? NO_OBS_BETWEEN_ALL
      : observationGapQuestionIds.length > 0
        ? NO_OBS_BETWEEN_PARTIAL
        : args.relationStatusId === 'R6'
          ? '二人の間では、長い付き合いや結婚などで一緒にいる場面でも、決める速さと言葉の出方の違いが、読み取りのずれを生みやすいことがあります。'
          : '二人の間では、関係が続いている場面でも、決める速さと受け止め方の違いが、読み取りのずれを生みやすいことがあります。';
  const hit =
    observationGapQuestionIds.length === 3
      ? 'まだ十分な相互作用の履歴がないため、決める速さや対立の型からは読み取りません。'
      : decisionPaceNoObs
        ? 'まだ決める場面がないため、決める速さの差からは読み取りません。'
        : disagreementNoObs
          ? 'まだ意見が違う場面がないため、対立時の動きからは読み取りません。'
          : returnPatternNoObs
            ? 'まだ戻る場面がないため、戻り方の癖からは読み取りません。'
            : args.relationStatusId === 'R6'
              ? '長い付き合いや結婚などで一緒にいる場面では、決める速さの差が先に立ちやすいことがあります。'
              : '意見の違いより、話し終えたと感じるタイミングの差が先に立ちやすいことがあります。';
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
    relationshipTriggerJa: hit,
    relationStatusId: args.relationStatusId,
    ...(args.relationStatusId === 'R6'
      ? (() => {
          const manualSideTendenciesJa = manualSideTendenciesFromSideLeadAnswers(
            args.answersV2,
            args.personAUsesFirstPerspective,
            'R6',
          );
          return manualSideTendenciesJa ? { manualSideTendenciesJa } : {};
        })()
      : {}),
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
  const tempo = TEMPO[answers.decisionPace][answers.expressionPace];
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
  const hit = pairOpeningHit(
    answers,
    visibleCivil.start,
    inwardCivil.start,
    selected.interactionId,
  );
  const mesh = meshFromBirth(visibleCivil, inwardCivil, tempo.mesh);
  const misreadLoop = conflict.loop.replace(/。{2,}/g, '。');
  const betweenThem = betweenThemLine(
    answers,
    roles,
    birth,
    hit,
    selected.interactionId,
    tempo.between,
    pairProfile,
    differenceType,
    visibleCivil,
    inwardCivil,
  );
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
    betweenThem,
    meshMoment: mesh,
    mismatchEntry: tempo.entry,
    misreadLoop,
    reset: conflict.reset,
    premiumContinuation: premiumContinuation(
      args.focusLabel,
      selected.interactionId,
      args.relationStatusId,
    ),
    manifestationPatternId: `${selected.interactionId}:${visibleCivil.start}x${inwardCivil.start}:${stemDelta}:${pairProfile?.lunarAligned ? 'lsame' : 'ldiff'}:${pairProfile?.a.stemLane ?? 'x'}x${pairProfile?.b.stemLane ?? 'x'}:${answers.decisionPace}:${answers.disagreement}:${answers.distance ?? 'no_distance'}:${answers.expressionPace}:${answers.returnPattern}`,
    relationshipTriggerJa: hit,
    relationStatusId: args.relationStatusId,
  };
}
