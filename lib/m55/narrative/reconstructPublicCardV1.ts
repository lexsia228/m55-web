/**
 * Reconstruct public-safe card copy from catalog keys only.
 * Landing must never call DOB/answer inference.
 */

import type { ExpressionAxes, StartTendency, DecisionTendency } from '../individualization/types';
import type { PairFreeInteractionId } from '../compatibility/pairFreeInsightSpecV2';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';
import { resolveTraitIdentity } from '../commercialUx/traitIdentityCatalog';

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
const DISTANCE_SLOT = {
  close: '近い関係ほど、今の間合いを言葉にして整える。',
  middle: '連絡や同席の間隔を一定に保ちながら続ける。',
  solo: '人と会ったあと、一人の時間で整えてから戻る。',
} as const;
const TALK_HINT = {
  close: '結論の前に、今の間合いを一句置く。',
  middle: '頻度は変えず、決める話と様子を見る話を分ける。',
  solo: '返事を急がず、一人の時間のあとに続きを置く。',
} as const;

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

const PAIR_PUBLIC: Readonly<
  Record<PairFreeInteractionId, { entryJa: string; returnJa: string }>
> = {
  tempo_mismatch: {
    entryJa: '結論を急ぐ動きと、言葉になるまでの間が逆方向になりやすい。',
    returnJa: '今は決めないことと、今の気持ちを一文で分ける。',
  },
  space_misread: {
    entryJa: '静かな時間の意味が揃わず、距離を置かれたように読まれやすい。',
    returnJa: '次の短い接点だけを先に置く。返事は急がない。',
  },
  one_carries_quiet: {
    entryJa: '表では話が進んでも、片方はまだ言えていない一点を持ち帰りやすい。',
    returnJa: '残った一点だけを、短い一文で戻す。',
  },
  talk_now_go_quiet: {
    entryJa: '確かめようとするほど、静かな時間が長くなりやすい。',
    returnJa: '結論ではなく、次に話す時点だけを置く。',
  },
  later_decide_words_soon: {
    entryJa: '先に出た言葉を結論と読むと、置いて考えたい側が急かされやすい。',
    returnJa: '今は決めない。でも今の気持ちはこれ、と分ける。',
  },
  hard_return_hard_space: {
    entryJa: '間を取ることと戻ることが、どちらも重くなりやすい。',
    returnJa: '戻る入口を一つだけ小さく置く。',
  },
  default_relationship_loop: {
    entryJa: 'いまの二人の進み方が見えにくく、速さの差が熱量の差に読まれやすい。',
    returnJa: '今日の進め方を一文でそろえてから中身に入る。',
  },
};

export type ReconstructedPublicCardV1 = {
  readonly variant: ShareCandidateVariant;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  readonly shareTextJa: string;
};

function personalManualBody(answer: ExpressionAxes): string {
  const slots = [
    `始め方：${START_SLOT[answer.start]}`,
    `決め方：${DECISION_SLOT[answer.decision]}`,
    `距離の取り方：${DISTANCE_SLOT[answer.distance]}`,
    `実際は：${HIDDEN[answer.start][answer.decision].split('。')[0]}。`,
  ];
  if (answer.distance === 'solo' || answer.distance === 'close') {
    slots.push(`私と話すときのヒント：${TALK_HINT[answer.distance]}`);
  }
  return slots.join('\n');
}

export function reconstructPersonalPublicCard(input: {
  variant: ShareCandidateVariant;
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
}): ReconstructedPublicCardV1 | null {
  const answer = input.answerAxes;
  if (input.variant === 'manual') {
    const body = personalManualBody(answer);
    return {
      variant: 'manual',
      headline: '私の取扱説明書',
      body,
      cta: 'あなたの取扱説明書は？',
      shareTextJa: `M55で「私の取扱説明書」が出た。\n\n「${START_SLOT[answer.start]}${DECISION_SLOT[answer.decision]}」\n\nこれ、私っぽい？\n\nあなたの取扱説明書は？\n#M55`,
    };
  }
  if (input.variant === 'seen_vs_actual') {
    const seen = SEEN[input.birthAxes.start];
    const actual = ACTUAL[answer.decision];
    return {
      variant: 'seen_vs_actual',
      headline: '人から見える私 / 実際の私',
      body: `人から見える私\n「${seen}」\n\n実際の私\n「${actual}」`,
      cta: 'これ、私っぽい？\nあなたはどう出る？',
      shareTextJa: `M55で「人から見える私 / 実際の私」が出た。\n\n人から見える私「${seen}」\n実際の私「${actual}」\n\nこれ、私っぽい？\nあなたはどう出る？\n#M55`,
    };
  }
  if (input.variant === 'hidden_spec') {
    const line = HIDDEN[input.birthAxes.start][answer.decision];
    return {
      variant: 'hidden_spec',
      headline: '自分でも知らなかった仕様',
      body: `${line}\n\n土台と今回の答えの重なりから`,
      cta: 'あなたの場合は？',
      shareTextJa: `M55で「自分でも知らなかった仕様」が出た。\n\n「${line}」\n\nこれ、私っぽい？\nあなたの取扱説明書は？\n#M55`,
    };
  }
  return null;
}

export function reconstructPairPublicCard(
  interactionId: PairFreeInteractionId,
): ReconstructedPublicCardV1 {
  const lines = PAIR_PUBLIC[interactionId];
  const body = `すれ違いの入口：${lines.entryJa}\n戻りやすい方法：${lines.returnJa}`;
  return {
    variant: 'pair_manual',
    headline: '二人の取扱説明書',
    body,
    cta: 'あなたの二人では、どう出る？',
    shareTextJa: `M55で「二人の取扱説明書」が出た。\n\nすれ違いの入口：${lines.entryJa}\n戻りやすい方法：${lines.returnJa}\n\nあなたの二人では、どう出る？\n#M55`,
  };
}

export function reconstructGenericPublicCard(input: {
  variant: 'pair_generic' | 'premium_takeaway';
  stemLaneIndex?: number;
}): ReconstructedPublicCardV1 {
  if (input.variant === 'pair_generic') {
    return {
      variant: 'pair_generic',
      headline: '二人の相性レポートを読みました',
      body: '二人の間で回りやすい流れを、場面に分けて読みました。',
      cta: 'あなたの二人では、どう出る？',
      shareTextJa:
        'M55で二人の相性レポートを読みました。\n\nあなたの二人では、どう出る？\n#M55',
    };
  }
  const identity = typeof input.stemLaneIndex === 'number'
    ? resolveTraitIdentity(input.stemLaneIndex)
    : null;
  const takeaway =
    identity?.shareStatement ?? '始める前に、今日はここまでと自分の言葉で決める。';
  return {
    variant: 'premium_takeaway',
    headline: '今のあなたへ残しておく一文',
    body: takeaway,
    cta: 'M55 プレミアムレポートから',
    shareTextJa: `M55 プレミアムレポートから。\n\n「${takeaway}」\n\nあなたの場合は？\n#M55`,
  };
}
