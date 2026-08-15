/**
 * Reconstruct public-safe card copy from catalog keys only.
 * Landing must never call DOB/answer inference.
 */

import type {
  ExpressionAxes,
  ExpressionAxisId,
  StartTendency,
  DecisionTendency,
  DistanceTendency,
  RecoveryTendency,
  ChangeTendency,
} from '../individualization/types';
import type { PairFreeInteractionId } from '../compatibility/pairFreeInsightSpecV2';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';
import { PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';

const START_SLOT: Readonly<Record<StartTendency, string>> = {
  try: '小さく一つ動かしてから、様子を見る。',
  map: '全体の手順が見えてから動き出す。',
  ask: '周囲の視点を足してから着手する。',
};
const DECISION_SLOT: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を並べてから閉じる。',
  deadline: '区切りが見えたところで決める。',
  wait: '一度置いてから返す。',
};
const DISTANCE_SLOT: Readonly<Record<DistanceTendency, string>> = {
  close: '近い関係ほど、今の間合いを言葉にして整える。',
  middle: '連絡や同席の間隔を一定に保ちながら続ける。',
  solo: '人と会ったあと、一人の時間で整えてから戻る。',
};
const RECOVERY_SLOT: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い区切りを入れて立て直す。',
  shrink: 'やることの範囲を狭くして戻る。',
  scene: '場所や刺激を変えてから戻る。',
};
const CHANGE_SLOT: Readonly<Record<ChangeTendency, string>> = {
  observe: '変化の直後は、一日様子を見てから動く。',
  adjust: '変わった点だけ小さく合わせて進める。',
  rebuild: '前提が変わったら、一度組み直す。',
};
const TALK_HINT: Readonly<Record<DistanceTendency, string>> = {
  close: '結論の前に、今の間合いを一句置く。',
  middle: '頻度は変えず、決める話と様子を見る話を分ける。',
  solo: '返事を急がず、一人の時間のあとに続きを置く。',
};

const SEEN: Readonly<Record<StartTendency, string>> = {
  try: 'すでに動き始めている人',
  map: '準備してから進む人',
  ask: '相談しながら進めている人',
};
const ACTUAL: Readonly<Record<DecisionTendency, string>> = {
  sort: '会話のあと、一人で候補を並べ直す人',
  deadline: '区切りが見えてから、内側で閉じる人',
  wait: '一度置いてから、最終の返しを作る人',
};

const HIDDEN: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '先に手を動かしているのは、決めてもらいたいからではない。動かしたあとに、自分で候補を閉じる。',
    deadline: '試し始めているように見えても、内側では「いつまでに閉じるか」が先に立つ。',
    wait: '動いているように見えても、決めたこととしてはまだ置いている。',
  },
  map: {
    sort: '揃えてから動く人に見えても、揃ったあとも比較が内側で残る。',
    deadline: '見通しを立ててから動き、期限が来ると一気に締める。',
    wait: '全体を見てから動くのに、最後の決断はさらに間を置く。',
  },
  ask: {
    sort: '人に聞くのは、決めてもらいたいからではない。最後に自分で決めるための材料を集めている。',
    deadline: '材料を増やしつつ、区切りが来ると自分で閉じる。',
    wait: '周囲の視点を集めながらも、結論は置いてから出す。',
  },
};

const PAIR_SIDE: Readonly<Record<StartTendency, string>> = {
  try: '先に動かして、話を閉じたくなる',
  map: '見通しが立つまで、置いて考えたい',
  ask: '確認してから、次に進みたい',
};

const PAIR_RETURN: Readonly<Record<PairFreeInteractionId, string>> = {
  tempo_mismatch: '「今は決めない。でも今の気持ちはこれ」と分ける。',
  space_misread: '次に話す一点だけ先に置く。返事は急がない。',
  one_carries_quiet: '残った一点だけを、短い一文で戻す。',
  talk_now_go_quiet: '結論ではなく、次に話す時点だけを置く。',
  later_decide_words_soon: '今は決めない、と今の気持ちを分けて置く。',
  hard_return_hard_space: '戻る入口を一つだけ、小さく置く。',
  default_relationship_loop: '今日の進め方を一文でそろえてから中身に入る。',
};

const PAIR_SAME_ENTRY: Readonly<Record<PairFreeInteractionId, string>> = {
  tempo_mismatch: '速さは近く見えても、閉じたい気持ちと、置いて考えたい気持ちが同時に出やすい。',
  space_misread: '静かな時間の意味が揃わず、距離を置かれたように読まれやすい。',
  one_carries_quiet: '表では話が進んでも、言えていない一点が残りやすい。',
  talk_now_go_quiet: '確かめようとするほど、静かな時間が長くなりやすい。',
  later_decide_words_soon: '先に出た言葉を結論と読むと、置いて考えたい側が急かされやすい。',
  hard_return_hard_space: '間を取ることと戻ることが、どちらも重くなりやすい。',
  default_relationship_loop: 'いまの二人の進み方が見えにくく、速さの差が熱量の差に読まれやすい。',
};

export type ReconstructedPublicCardV1 = {
  readonly variant: ShareCandidateVariant;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  readonly shareTextJa: string;
  readonly insightJa: string;
};

function selectedShareText(titleJa: string, insightJa: string): string {
  return `M55で「${titleJa}」が出た。\n\n「${insightJa}」\n\nこれ、私っぽい？\nあなたはどう出る？\n#M55`;
}

function personalManualSlots(answer: ExpressionAxes): readonly { label: string; body: string }[] {
  const slots = [
    { label: '始め方', body: START_SLOT[answer.start] },
    { label: '決め方', body: DECISION_SLOT[answer.decision] },
    { label: '距離の取り方', body: DISTANCE_SLOT[answer.distance] },
    { label: '変化したとき', body: CHANGE_SLOT[answer.change] },
    { label: '回復方法', body: RECOVERY_SLOT[answer.recovery] },
  ];
  if (answer.distance === 'solo' || answer.distance === 'close') {
    slots.push({ label: '私と話すときのヒント', body: TALK_HINT[answer.distance] });
  }
  return slots.slice(0, 6);
}

export function hasGenuineSeenActualContrast(
  birthAxes: ExpressionAxes,
  answerAxes: ExpressionAxes,
): boolean {
  return SEEN[birthAxes.start] !== ACTUAL[answerAxes.decision];
}

export function hiddenSpecLine(birth: ExpressionAxes, answer: ExpressionAxes): string {
  return HIDDEN[birth.start][answer.decision];
}

export function recommendPublicShareVariant(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): ShareCandidateVariant {
  const { answerAxes, birthAxes } = input;
  let scoreC = 0;
  if (birthAxes.start !== answerAxes.start) scoreC += 2;
  if (birthAxes.decision !== answerAxes.decision) scoreC += 1;
  if (birthAxes.distance !== answerAxes.distance) scoreC += 1;
  if (scoreC >= 2) return 'hidden_spec';
  if (hasGenuineSeenActualContrast(birthAxes, answerAxes)) return 'seen_vs_actual';
  return 'manual';
}

function cardCBody(birth: ExpressionAxes, answer: ExpressionAxes): { body: string; insight: string } {
  const insight = hiddenSpecLine(birth, answer);
  const extra =
    birth.distance !== answer.distance ? `\n${DISTANCE_SLOT[answer.distance]}` : '';
  return {
    insight,
    body: `${insight}${extra}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
  };
}

export function reconstructPersonalPublicCard(input: {
  variant: ShareCandidateVariant;
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
  hingeAxisId?: ExpressionAxisId;
}): ReconstructedPublicCardV1 | null {
  const answer = input.answerAxes;
  const birth = input.birthAxes;
  if (input.variant === 'manual') {
    const slots = personalManualSlots(answer);
    const body = `${slots.map((slot) => `${slot.label}：${slot.body}`).join('\n')}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`;
    const insight = hiddenSpecLine(birth, answer).split('。')[0] ?? START_SLOT[answer.start];
    return {
      variant: 'manual',
      headline: '私の取扱説明書',
      body,
      cta: 'あなたの取扱説明書は？',
      insightJa: insight,
      shareTextJa: selectedShareText('私の取扱説明書', insight),
    };
  }
  if (input.variant === 'seen_vs_actual') {
    if (!hasGenuineSeenActualContrast(birth, answer)) return null;
    const seen = SEEN[birth.start];
    const actual = ACTUAL[answer.decision];
    const insight = `見える私は「${seen}」。実際の私は「${actual}」。`;
    return {
      variant: 'seen_vs_actual',
      headline: '人から見える私 / 実際の私',
      body: `人から見える私\n「${seen}」\n\n実際の私\n「${actual}」\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
      cta: 'これ、私っぽい？\nあなたはどう出る？',
      insightJa: insight,
      shareTextJa: selectedShareText('人から見える私 / 実際の私', insight),
    };
  }
  if (input.variant === 'hidden_spec') {
    const card = cardCBody(birth, answer);
    return {
      variant: 'hidden_spec',
      headline: '自分でも知らなかった仕様',
      body: card.body,
      cta: 'あなたはどう出る？',
      insightJa: card.insight,
      shareTextJa: selectedShareText('自分でも知らなかった仕様', card.insight),
    };
  }
  if (input.variant === 'premium_takeaway') {
    const card = cardCBody(birth, answer);
    return {
      variant: 'premium_takeaway',
      headline: '今のあなたへ残しておく一文',
      body: `${card.insight}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
      cta: 'M55 プレミアムレポートから',
      insightJa: card.insight,
      shareTextJa: `M55 プレミアムレポートから。\n\n「${card.insight}」\n\nあなたはどう出る？\n#M55`,
    };
  }
  return null;
}

export function reconstructPairPublicCard(
  interactionId: PairFreeInteractionId,
  visibleStart?: StartTendency,
  inwardStart?: StartTendency,
): ReconstructedPublicCardV1 {
  const returnJa = PAIR_RETURN[interactionId];
  const differentiated =
    visibleStart &&
    inwardStart &&
    visibleStart !== inwardStart;
  const entryJa = differentiated
    ? `一方は、${PAIR_SIDE[visibleStart]}。\nもう一方は、${PAIR_SIDE[inwardStart]}。`
    : PAIR_SAME_ENTRY[interactionId];
  const body = `すれ違いの入口\n${entryJa}\n\n戻りやすい方法\n${returnJa}`;
  const insight = differentiated
    ? `一方は${PAIR_SIDE[visibleStart!]}。もう一方は${PAIR_SIDE[inwardStart!]}。`
    : entryJa;
  return {
    variant: 'pair_manual',
    headline: '二人の取扱説明書',
    body,
    cta: 'あなたの二人では、どう出る？',
    insightJa: insight,
    shareTextJa: selectedShareText('二人の取扱説明書', `${insight}\n戻りやすい方法：${returnJa}`),
  };
}

export function reconstructGenericPublicCard(input: {
  variant: 'pair_generic' | 'premium_takeaway';
  stemLaneIndex?: number;
}): ReconstructedPublicCardV1 {
  if (input.variant === 'pair_generic') {
    const insight = '二人の間で回りやすい流れを、場面に分けて読みました。';
    return {
      variant: 'pair_generic',
      headline: '二人の相性レポートを読みました',
      body: insight,
      cta: 'あなたの二人では、どう出る？',
      insightJa: insight,
      shareTextJa: selectedShareText('二人の相性レポート', insight),
    };
  }
  const insight = '始める前に、今日はここまでと自分の言葉で決める。';
  return {
    variant: 'premium_takeaway',
    headline: '今のあなたへ残しておく一文',
    body: `${insight}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
    cta: 'M55 プレミアムレポートから',
    insightJa: insight,
    shareTextJa: `M55 プレミアムレポートから。\n\n「${insight}」\n\nあなたはどう出る？\n#M55`,
  };
}

export function publicSemanticKey(input: {
  variant: ShareCandidateVariant;
  answerAxes?: ExpressionAxes;
  birthAxes?: ExpressionAxes;
  interactionId?: PairFreeInteractionId;
  visibleStart?: StartTendency;
  inwardStart?: StartTendency;
}): string {
  if (input.variant === 'pair_manual' || input.variant === 'pair_generic') {
    return [
      input.variant,
      input.interactionId ?? 'none',
      input.visibleStart ?? '',
      input.inwardStart ?? '',
    ].join(':');
  }
  const answer = input.answerAxes;
  const birth = input.birthAxes;
  if (!answer || !birth) return input.variant;
  if (input.variant === 'manual') {
    return `manual:${answer.start}:${answer.decision}:${answer.recovery}:${answer.distance}:${answer.change}`;
  }
  if (input.variant === 'seen_vs_actual') {
    return `seen:${birth.start}:${answer.decision}`;
  }
  return `hidden:${birth.start}:${answer.decision}:${birth.distance === answer.distance ? 'd0' : answer.distance}`;
}
