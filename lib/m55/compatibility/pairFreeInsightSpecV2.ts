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
import type { PairAxisId, PairDifferenceType } from './pairReadingTypes';
import {
  resolveCivilBirthDimensions,
  type CivilBirthDimensionsV1,
} from '../individualization/birthSignatureV1';
import { derivePairDifferenceType } from './pairReadingFingerprint';

export const PAIR_FREE_INSIGHT_SPEC_VERSION = 'pair_free_insight_v2' as const;

export type PairFreeInteractionId =
  | 'tempo_mismatch'
  | 'space_misread'
  | 'one_carries_quiet'
  | 'talk_now_go_quiet'
  | 'later_decide_words_soon'
  | 'hard_return_hard_space'
  | 'default_relationship_loop';

export type PairFreeInsightSpecV2 = {
  readonly id: string;
  readonly kind: 'pair_free_v2';
  readonly evidenceQuestionIds: readonly [
    'decisionPace',
    'disagreement',
    'distance',
    'expressionPace',
    'returnPattern',
  ];
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
};

const EVIDENCE = [
  'decisionPace',
  'disagreement',
  'distance',
  'expressionPace',
  'returnPattern',
] as const;

function roleLabels(
  personAUsesFirstPerspective: boolean,
): { visible: string; inward: string } {
  const visibleIsYou = personAUsesFirstPerspective;
  return visibleIsYou
    ? { visible: 'あなた', inward: '相手' }
    : { visible: '相手', inward: 'あなた' };
}

function selectInteraction(
  answers: CompatibilityCurrentContextAnswers,
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
  if (answers.disagreement === 'one_carries' && answers.distance !== 'explain_space') {
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
      mesh: '急がない話題では、先に方向だけ置いて、言葉はあとにしてよいと分かっているときに噛み合いやすい。',
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
      between: '決めるのも言葉にするのも時間がかかるため、二人の間では静かな時間が長くなりやすい。静けさの意味が揃わないと、離れ始めたように見えやすい。',
      mesh: '次に話す時点だけ先に置けると、待っている時間が空白に見えにくい。',
      entry: 'どちらも考えているのに、合図がないと「関心が薄い」と読みやすい。',
    },
    words_vary: {
      between: '決めるのは置きたいのに、言葉の速さは日によって変わる。今日の余力が見えないと、待つことと黙ることが混線しやすい。',
      mesh: '急ぐ話か待てる話かを、内容へ入る前にそろえられると噛み合いやすい。',
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
  distance: DistanceAnswer,
  returning: ReturnPatternAnswer,
  roles: { visible: string; inward: string },
): { loop: string; reset: string } {
  const { visible, inward } = roles;
  if (disagreement === 'talk_now' && distance === 'go_quiet') {
    return {
      loop: `確認を重ねるほど、${inward}は考える余白を取りたくなり、その静けさを${visible}が距離を置かれたと受け取りやすい。どちらも関係を切るつもりがなくても、確かめ方が逆方向になりやすい。`,
      reset:
        returning === 'someone_reaches'
          ? '結論ではなく、次の短い接点だけを一文で置く。返事は急がない。'
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
          : '離れる前に、答えではなく次の短い接点だけを伝える。',
    };
  }
  if (disagreement === 'one_carries') {
    return {
      loop: `違いが出るとどちらかが話題を引き取り、表に出なかった違いが次の場面へ残る。${visible}は進めたつもりになり、${inward}は言えていない一点を抱えたまま戻る。${visible}は会話が終わったと受け取りやすく、${inward}は大事な点がまだ残っていると受け取りやすい。`,
      reset: 'まだ言えていない違いを一つだけ聞く。答えの正しさより、出なかった一点を先に置く。',
    };
  }
  return {
    loop: `違いが出たあとの距離の取り方と、戻るきっかけが噛み合わないと、同じずれが次の会話に残る。${visible}が先に取る動きを、${inward}は別の意味として受け取りやすい。`,
    reset:
      returning === 'someone_reaches'
        ? '次のすれ違いでは、結論ではなく短い声かけを一度だけ置く。'
        : returning === 'time_restores'
          ? '自然に会話が戻ったあと、残った一点を十分以内で確かめる。'
          : '答えを決めず、応じるかを選べる短い接点を一度だけ提案する。',
  };
}

function sideLead(
  answers: CompatibilityCurrentContextAnswers,
  roles: { visible: string; inward: string },
): string {
  const { visible, inward } = roles;
  if (answers.decisionPace === 'decide_now' && answers.expressionPace === 'words_later') {
    return `${visible}側はその場で結論を置こうとしやすく、${inward}側はまだ言葉を整えている途中になりやすい`;
  }
  if (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_soon') {
    return `${visible}側は先に言葉で確かめたくなりやすく、${inward}側は結論だけは置いてから出したい`;
  }
  if (answers.disagreement === 'talk_now' && answers.distance === 'go_quiet') {
    return `${visible}側は違いをその場の言葉で揃えようとしやすく、${inward}側は説明より先に静かになりやすい`;
  }
  if (answers.disagreement === 'take_space' || answers.distance === 'go_quiet') {
    return `${visible}側はその間を考える時間として使いやすく、${inward}側は同じ間を気持ちが離れた時間と読みやすい`;
  }
  if (answers.disagreement === 'one_carries') {
    return `${visible}側は話題を引き取って進めやすく、${inward}側は出なかった一点を抱えたまま戻りやすい`;
  }
  if (
    (answers.decisionPace === 'decide_now' && answers.expressionPace === 'words_soon') ||
    (answers.decisionPace === 'decide_later' && answers.expressionPace === 'words_later')
  ) {
    return `${visible}側は短い確認で安心しやすく、${inward}側は同じ速さの間に止まりやすい`;
  }
  return `${visible}側は先に安心の形を取りたくなりやすく、${inward}側は同じ動きを別の意味として受け取りやすい`;
}

function pairOpeningHit(
  _answers: CompatibilityCurrentContextAnswers,
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
      : '片方は考える時間として間を取り、もう片方は同じ間を気持ちが離れた時間と受け取りやすい。';
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
      return '結論は置いてから出したい側と、先に言葉で確かめたい側が、同じ速さに見えて同時に出やすい。';
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
): string {
  const shared = visible.start === inward.start;
  const closeDates =
    differenceType === 'same_dob_pair' || differenceType === 'near_dob_shift';
  if (shared && closeDates) {
    return '生まれの基調が近いぶん、いまの進め方の差が目立ちやすい';
  }
  if (shared) {
    return '生まれの基調は近くても、返す速さの差が二人の間で分かれやすい';
  }
  return '生まれの基調が違うぶん、同じ会話でも終わりの感じ方が分かれやすい';
}

function meshFromBirth(
  visible: CivilBirthDimensionsV1,
  inward: CivilBirthDimensionsV1,
  tempoMesh: string,
): string {
  if (visible.start !== inward.start) {
    return '今夜は方向だけ置いて、本題は翌朝にする、と先に言えると噛み合いやすい。';
  }
  return `進み方が近いときは、今の二人の速さだけを先にそろえられると噛み合いやすい。${tempoMesh}`;
}

function betweenThemLine(
  answers: CompatibilityCurrentContextAnswers,
  roles: { visible: string; inward: string },
  birth: string,
  hit: string,
): string {
  const answer = sideLead(answers, roles);
  return `二人の間では、${hit}${answer}。そのため二人の間では、${birth}。`;
}

function premiumContinuation(focusLabel: string, interactionId: PairFreeInteractionId): string {
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
    `無料では、二人の間で起きやすいこのループまでを読みました。${hook}。`,
    `「二人の相性レポート」では、同じループを六つの場面に分け、あなた側と相手側の視点、すれ違いの入口、戻し方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。`,
    `今いちばん整理したいこと（${focusLabel}）から先に読めます。`,
  ].join('');
}

export function buildPairFreeInsightSpecV2(args: {
  answers: CompatibilityCurrentContextAnswers;
  pairAxisId: PairAxisId;
  personABirthDate: string;
  personBBirthDate: string;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
}): PairFreeInsightSpecV2 {
  const aCivil = resolveCivilBirthDimensions(args.personABirthDate);
  const bCivil = resolveCivilBirthDimensions(args.personBBirthDate);
  if (!aCivil.ok || !bCivil.ok) {
    throw new Error('invalid_pair_dob');
  }
  const differenceType = derivePairDifferenceType(
    args.personABirthDate,
    args.personBBirthDate,
    args.pairAxisId,
  );
  const selected = selectInteraction(args.answers);
  const roles = roleLabels(args.personAUsesFirstPerspective);
  const visibleCivil = args.personAUsesFirstPerspective ? aCivil.value : bCivil.value;
  const inwardCivil = args.personAUsesFirstPerspective ? bCivil.value : aCivil.value;
  const tempo = TEMPO[args.answers.decisionPace][args.answers.expressionPace];
  const conflict = loopFromConflict(
    args.answers.disagreement,
    args.answers.distance,
    args.answers.returnPattern,
    roles,
  );
  const birth = birthLead(
    visibleCivil,
    inwardCivil,
    roles,
    args.pairAxisId,
    differenceType,
  );
  const hit = pairOpeningHit(
    args.answers,
    visibleCivil.start,
    inwardCivil.start,
    selected.interactionId,
  );
  const misreadLoop = conflict.loop.replace(/。{2,}/g, '。');
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:${selected.interactionId}:${args.pairAxisId}:${differenceType}:${aCivil.value.start}-${bCivil.value.start}:${args.answers.decisionPace}-${args.answers.disagreement}-${args.answers.distance}-${args.answers.expressionPace}-${args.answers.returnPattern}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
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
    betweenThem: betweenThemLine(
      args.answers,
      roles,
      birth,
      hit,
    ),
    meshMoment: meshFromBirth(visibleCivil, inwardCivil, tempo.mesh),
    mismatchEntry: tempo.entry,
    misreadLoop,
    reset: conflict.reset,
    premiumContinuation: premiumContinuation(args.focusLabel, selected.interactionId),
    manifestationPatternId: `${selected.interactionId}:${visibleCivil.start}x${inwardCivil.start}`,
    relationshipTriggerJa: hit,
  };
}
