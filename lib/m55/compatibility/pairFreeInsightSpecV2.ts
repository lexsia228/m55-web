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
import type { PairAxisId } from './pairReadingTypes';

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
  readonly interactionId: PairFreeInteractionId;
  readonly confidence: 'high' | 'medium';
  readonly personAUsesFirstPerspective: boolean;
  readonly betweenThem: string;
  readonly meshMoment: string;
  readonly mismatchEntry: string;
  readonly misreadLoop: string;
  readonly reset: string;
  readonly premiumContinuation: string;
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
      between: '決める速さも言葉の速さも場面で変わるため、二人の間では「今どちらの日か」が見えにくい。見えなさ自体が不安になりやすい。',
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
      loop: `${visible}が違いをその場の言葉で確かめようとすると、${inward}は説明より先に静かになりやすい。静かさを拒否と読むと、確かめる言葉が増え、静かな時間がさらに長くなる。どちらも関係を切るつもりがなくても、確かめ方が逆方向になりやすい。`,
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
      loop: `違いが出るといったん間を取ると、${visible}はその間を「考える時間」、${inward}は「気持ちが離れた時間」と読みやすい。先に声をかける側が急かしているようにも、かけない側が捨てたようにも見え、どちらも関係を大事にしているのに確かめ方が逆になりやすい。`,
      reset:
        distance === 'explain_space'
          ? '離れる前に、返事ではなく次に話す時点だけを伝える。'
          : '離れる前に、答えではなく次の短い接点だけを伝える。',
    };
  }
  if (disagreement === 'one_carries') {
    return {
      loop: `違いが出るとどちらかが話題を引き取り、表に出なかった違いが次の場面へ残る。${visible}は進めたつもりになり、${inward}は言えていない一点を抱えたまま戻る。戻ったあとに同じ違いが、別の話題で再燃しやすい。`,
      reset: 'まだ言えていない違いを一つだけ聞く。答えの正しさより、出なかった一点を先に置く。',
    };
  }
  return {
    loop: `違いが出たあとの距離の取り方と、戻るきっかけの作り方が噛み合わないと、同じずれが次の会話の入口になる。${visible}に見える反応と、${inward}が内側で持っている意味が、入れ替わって読まれやすい。`,
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
    return `${visible}側は結論を先に置きたくなりやすく、${inward}側は言葉になるまで間が残りやすい`;
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
  return `${visible}側に見えやすい反応と、${inward}側が内側で持っている意味が、入れ替わって読まれやすい`;
}

function betweenThemLine(
  answers: CompatibilityCurrentContextAnswers,
  roles: { visible: string; inward: string },
  tempoBetween: string,
): string {
  const core = tempoBetween
    .replace(/^二人がこじれるとしたら、/u, '')
    .replace(/二人の間では、?/gu, '')
    .replace(/。$/u, '')
    .replace(/^、/u, '');
  return `${sideLead(answers, roles)}。そのため二人の間では、${core}。`;
}

function premiumContinuation(focusLabel: string): string {
  return [
    `無料では、二人の間で回りやすい基本のループまでを読みました。`,
    `「二人の相性レポート」では、同じループを六つの場面に分け、あなた側と相手側の視点、すれ違いの入口、戻し方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。`,
    `今いちばん整理したいこと（${focusLabel}）から先に読めます。`,
  ].join('');
}

export function buildPairFreeInsightSpecV2(args: {
  answers: CompatibilityCurrentContextAnswers;
  pairAxisId: PairAxisId;
  personAUsesFirstPerspective: boolean;
  focusLabel: string;
}): PairFreeInsightSpecV2 {
  const selected = selectInteraction(args.answers);
  const roles = roleLabels(args.personAUsesFirstPerspective);
  const tempo = TEMPO[args.answers.decisionPace][args.answers.expressionPace];
  const conflict = loopFromConflict(
    args.answers.disagreement,
    args.answers.distance,
    args.answers.returnPattern,
    roles,
  );
  const misreadLoop = `${tempo.entry}${conflict.loop}`.replace(/。{2,}/g, '。');
  return {
    id: `${PAIR_FREE_INSIGHT_SPEC_VERSION}:${selected.interactionId}:${args.pairAxisId}:${args.answers.decisionPace}-${args.answers.disagreement}-${args.answers.distance}-${args.answers.expressionPace}-${args.answers.returnPattern}:${args.personAUsesFirstPerspective ? 'a' : 'b'}`,
    kind: 'pair_free_v2',
    evidenceQuestionIds: EVIDENCE,
    pairAxisId: args.pairAxisId,
    interactionId: selected.interactionId,
    confidence: selected.confidence,
    personAUsesFirstPerspective: args.personAUsesFirstPerspective,
    betweenThem: betweenThemLine(args.answers, roles, tempo.between),
    meshMoment: tempo.mesh,
    mismatchEntry: tempo.entry,
    misreadLoop,
    reset: conflict.reset,
    premiumContinuation: premiumContinuation(args.focusLabel),
  };
}
