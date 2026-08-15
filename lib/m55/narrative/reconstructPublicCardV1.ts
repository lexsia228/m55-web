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
import {
  buildPublicIdentityFingerprintV1,
  hasPublicSafeSocialContrast,
  publicCardSpecificity,
  selectPublicManualSlotPlan,
  type PublicManualSlotPlanV1,
} from './publicIdentityFingerprintV1';

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

const FUSED_MISREAD: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: 'もう動き出しているのに、その場で決めたように見られやすい。',
    deadline: '試し始めているように見えて、期限だけ先に立っているとは読まれにくい。',
    wait: '動いているのに、決めていない側だとは見えにくい。',
  },
  map: {
    sort: '揃えてから動く人に見えて、その場で閉じたと読まれやすい。',
    deadline: '準備している人に見えて、区切りが来ると一気に締めるとは読まれにくい。',
    wait: '全体を見ている人に見えて、最後はさらに間を置くとは読まれにくい。',
  },
  ask: {
    sort: '相談している時点で、もう決めているように見られやすい。',
    deadline: '人に聞いている人に見えて、区切りが来ると自分で閉じるとは読まれにくい。',
    wait: '意見を集めている人に見えて、結論は置いてから出すとは読まれにくい。',
  },
};

const FUSED_ACTUAL: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '動かしたあとに、一人で候補を閉じる。',
    deadline: '試しながらも、内側では閉じる時点が先に立つ。',
    wait: '動いたあとも、決めたこととしてはまだ置いている。',
  },
  map: {
    sort: '揃ったあとも、比較は一人の時間に残る。',
    deadline: '見通しが立ったあと、期限が来ると自分で締める。',
    wait: '全体を見たあとも、最後の判断は一度置く。',
  },
  ask: {
    sort: '最後の判断は、会話が終わって一人になったあと。',
    deadline: '材料を足したあと、区切りが来ると自分で閉じる。',
    wait: '周囲の視点を集めたあと、結論は置いてから出す。',
  },
};

const SOCIAL_MIRROR: Readonly<
  Record<StartTendency, Readonly<Record<DistanceTendency, string>>>
> = {
  try: {
    close: '近い場では、もう動き始めている人',
    middle: '間を保ちながら、先に手を出している人',
    solo: '一人の時間の前に、まず動かしている人',
  },
  map: {
    close: '近い関係でも、手順を揃えてから進む人',
    middle: '間を保ちながら、準備してから進む人',
    solo: '一人で整えてから、全体を見て進む人',
  },
  ask: {
    close: '近い人に聞きながら進めている人',
    middle: '間隔を保ちつつ、相談してから進む人',
    solo: '人に聞いたあと、一人の時間で整える人',
  },
};

const SOCIAL_ACTUAL: Readonly<
  Record<DecisionTendency, Readonly<Record<DistanceTendency, string>>>
> = {
  sort: {
    close: '近い会話のあと、一人で候補を並べ直している',
    middle: '間隔を置いたあと、候補を閉じてから返す',
    solo: '会ったあとの一人時間で、候補を閉じている',
  },
  deadline: {
    close: '近い関係の区切りで、内側で閉じている',
    middle: '間隔の区切りが来ると、そこで決めている',
    solo: '一人になった区切りで、内側で閉じている',
  },
  wait: {
    close: '近い会話のあと、一度置いてから返している',
    middle: '間隔を置いたまま、決めたこととしてはまだ置いている',
    solo: '一人の時間に入ってから、最終の返しを作っている',
  },
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

function copyForManualSlot(
  slot: PublicManualSlotPlanV1,
  answer: ExpressionAxes,
  birth: ExpressionAxes,
): string {
  switch (slot.kind) {
    case 'primary_start':
      return START_SLOT[answer.start];
    case 'primary_decision':
      return DECISION_SLOT[answer.decision];
    case 'fused_misread':
      return FUSED_MISREAD[birth.start][answer.decision];
    case 'fused_actual':
      return FUSED_ACTUAL[birth.start][answer.decision];
    case 'social_distance':
      return DISTANCE_SLOT[answer.distance];
    case 'recover':
      return RECOVERY_SLOT[answer.recovery];
    case 'change':
      return CHANGE_SLOT[answer.change];
    case 'talk_hint':
      return TALK_HINT[answer.distance];
  }
}

export function hasGenuineSeenActualContrast(
  birthAxes: ExpressionAxes,
  answerAxes: ExpressionAxes,
): boolean {
  if (!hasPublicSafeSocialContrast(birthAxes, answerAxes)) return false;
  const seen = SOCIAL_MIRROR[birthAxes.start][birthAxes.distance];
  const actual = SOCIAL_ACTUAL[answerAxes.decision][answerAxes.distance];
  return seen !== actual;
}

export function hiddenSpecLine(birth: ExpressionAxes, answer: ExpressionAxes): string {
  return HIDDEN[birth.start][answer.decision];
}

export function recommendPublicShareVariant(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): ShareCandidateVariant {
  const scores = publicCardSpecificity(input);
  if (scores.hidden >= 2 && scores.hidden >= scores.seen) return 'hidden_spec';
  if (scores.seen >= 3 && scores.seen > scores.hidden) return 'seen_vs_actual';
  if (scores.seen >= 2 && scores.hidden < 2) return 'seen_vs_actual';
  return 'manual';
}

function cardCBody(birth: ExpressionAxes, answer: ExpressionAxes): { body: string; insight: string } {
  const insight = hiddenSpecLine(birth, answer);
  let extra = '';
  if (birth.distance !== answer.distance) {
    extra =
      answer.distance === 'close'
        ? '\n近い関係ほど、今の間合いを一句置く。'
        : answer.distance === 'solo'
          ? '\n人と会ったあと、一人の時間を置いてから戻る。'
          : '\n連絡の間隔を一定に保つことが、先に立つ。';
  } else if (birth.change !== answer.change) {
    extra = `\n${CHANGE_SLOT[answer.change]}`;
  } else if (birth.recovery !== answer.recovery) {
    extra = `\n${RECOVERY_SLOT[answer.recovery]}`;
  }
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
    const plan = selectPublicManualSlotPlan({ answerAxes: answer, birthAxes: birth });
    const rendered = plan.map((slot) => ({
      label: slot.labelJa,
      body: copyForManualSlot(slot, answer, birth),
    }));
    const body = `${rendered.map((slot) => `${slot.label}：${slot.body}`).join('\n')}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`;
    const fusedActual = rendered.find((_, index) => plan[index]?.kind === 'fused_actual');
    const fusedMisread = rendered.find((_, index) => plan[index]?.kind === 'fused_misread');
    const insight = (fusedActual ?? fusedMisread ?? rendered[0])?.body.split('。')[0] ?? START_SLOT[answer.start];
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
    const seen = SOCIAL_MIRROR[birth.start][birth.distance];
    const actual = SOCIAL_ACTUAL[answer.decision][answer.distance];
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
  const fp = buildPublicIdentityFingerprintV1({
    answerAxes: answer,
    birthAxes: birth,
  });
  if (input.variant === 'manual') return fp.manualIdentity;
  if (input.variant === 'seen_vs_actual') return fp.socialMirrorIdentity;
  return fp.hiddenSpecIdentity;
}
