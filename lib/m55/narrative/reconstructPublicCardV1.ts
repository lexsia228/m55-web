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
import type { RelationStatusId } from '../compatibility/pairReadingTypes';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';
import { PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';
import {
  buildPublicIdentityFingerprintV1,
  hasPublicSafeSocialContrast,
  publicCardSpecificity,
  selectPublicManualSlotPlan,
  type PublicManualSlotPlanV1,
} from './publicIdentityFingerprintV1';
import {
  buildPairSharePostText,
  buildPremiumSharePostText,
  buildSelfSharePostText,
  normalizeJapaneseTerminalPunctuation,
  PAIR_SHARE_CTA_JA,
} from './sharePostSerializationV1';

const START_SLOT: Readonly<Record<StartTendency, string>> = {
  try: '小さく一つ動かしてから、様子を見る。',
  map: '全体の段取りが見えてから動き出す。',
  ask: '周りの意見を聞いてから取りかかる。',
};
const DECISION_SLOT: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を並べてから、答えを一つに絞る。',
  deadline: '「ここまで」が見えたところで決める。',
  wait: '一度置いてから返す。',
};
const DISTANCE_SLOT: Readonly<Record<DistanceTendency, string>> = {
  close: '近い関係ほど、今の距離感を言葉にして整える。',
  middle: '連絡や会う頻度を、あまり変えずに続ける。',
  solo: '人と会ったあと、一人の時間で整えてから戻る。',
};
const RECOVERY_SLOT: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い休みを入れて立て直す。',
  shrink: 'やることの範囲を狭くして戻る。',
  scene: '場所や空気を変えてから戻る。',
};
const CHANGE_SLOT: Readonly<Record<ChangeTendency, string>> = {
  observe: '変化の直後は、一日様子を見てから動く。',
  adjust: '変わったところだけ、少し直して進める。',
  rebuild: '前提が変わったら、段取りを一から見直す。',
};
const TALK_HINT: Readonly<Record<DistanceTendency, string>> = {
  close: '決める前に、今の距離感を一言確認してもらえると続きやすい。',
  middle: '頻度は変えず、決める話と様子を見る話を分けてもらえると話しやすい。',
  solo: 'すぐ返事を求めず、一人の時間のあとに返してもらえると話しやすい。',
};

const FUSED_MISREAD: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: 'もう動き出しているのに、その場で決めたように見られやすい。',
    deadline: '試し始めているように見えて、「いつまでに決めるか」が先にあるとは気づかれにくい。',
    wait: '動いているのに、決めていない側だとは見えにくい。',
  },
  map: {
    sort: '揃えてから動く人に見えて、その場で決めたように見られやすい。',
    deadline: '準備している人に見えて、「ここまで」が見えたところで一気に決めるとは気づかれにくい。',
    wait: '全体を見ている人に見えて、最後はさらに間を置くとは気づかれにくい。',
  },
  ask: {
    sort: '相談している時点で、もう決めているように見られやすい。',
    deadline: '人に聞いている人に見えて、「ここまで」が見えたところで自分で決めるとは気づかれにくい。',
    wait: '意見を集めている人に見えて、結論は一度置いてから出すとは気づかれにくい。',
  },
};

const FUSED_ACTUAL: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '動かしたあとに、一人で答えを一つに絞る。',
    deadline: '試しながらも、自分の中では「いつまでに決めるか」が先にある。',
    wait: '動いたあとも、まだ決め切れていないまま動いている。',
  },
  map: {
    sort: '揃ったあとも、比較は一人の時間に残る。',
    deadline: '見通しが立ったあと、期限が来ると自分で決める。',
    wait: '全体を見たあとも、最後の判断は一度置く。',
  },
  ask: {
    sort: '最後の判断は、会話が終わって一人になったあと。',
    deadline: '材料を足したあと、「ここまで」が見えたところで自分で決める。',
    wait: '周囲の視点を集めたあと、答えを出す前に一度置く。',
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
    close: '近い関係でも、段取りを揃えてから進む人',
    middle: '間を保ちながら、準備してから進む人',
    solo: '一人で整えてから、全体を見て進む人',
  },
  ask: {
    close: '近い人に聞きながら進めている人',
    middle: '頻度は変えずに、相談してから進む人',
    solo: '人に聞いたあと、一人の時間で整える人',
  },
};

const SOCIAL_ACTUAL: Readonly<
  Record<DecisionTendency, Readonly<Record<DistanceTendency, string>>>
> = {
  sort: {
    close: '近い会話のあと、一人で候補を並べ直している',
    middle: '間を置いたあと、答えを一つに絞ってから返す',
    solo: '会ったあとの一人時間で、答えを一つに絞っている',
  },
  deadline: {
    close: '近い関係で「ここまで」が見えたところで、自分の中で決めている',
    middle: '「ここまで」が見えたところで、そこで決めている',
    solo: '一人になったところで、自分の中で決めている',
  },
  wait: {
    close: '近い会話のあと、一度置いてから返している',
    middle: '間を置いたまま、まだ決め切れていないまま返している',
    solo: '一人の時間に入ってから、最後の返事を決めている',
  },
};

const HIDDEN: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '先に手を動かしているのは、決めてもらいたいからではない。動かしたあとに、自分で答えを一つに絞る。',
    deadline: '試し始めているように見えても、自分の中では「いつまでに決めるか」が先にある。',
    wait: '動いているように見えても、まだ決め切れていないまま動いている。',
  },
  map: {
    sort: '揃えてから動く人に見えても、揃ったあとも比較が自分の中に残る。',
    deadline: '見通しを立ててから動き、期限が来ると一気に決める。',
    wait: '全体を見てから動くのに、最後の決断はさらに間を置く。',
  },
  ask: {
    sort: '人に聞くのは、決めてもらいたいからではない。最後に自分で決めるための材料を集めている。',
    deadline: '材料を増やしつつ、「ここまで」が見えたところで自分で決める。',
    wait: '周囲の視点を集めたあと、答えを出す前に一度置く。',
  },
};

const PAIR_SIDE: Readonly<Record<StartTendency, string>> = {
  try: '先に動かして、話を終わらせたくなる',
  map: '見通しが立つまで、置いて考えたい',
  ask: '確認してから、次に進みたい',
};

/** Existing public-safe start lines. Presentation only — no new Pair cardinality. */
export function pairRelationSidesJa(
  visibleStart?: StartTendency,
  inwardStart?: StartTendency,
): { oneJa: string; otherJa: string } | null {
  if (!visibleStart || !inwardStart || visibleStart === inwardStart) return null;
  return {
    oneJa: PAIR_SIDE[visibleStart],
    otherJa: PAIR_SIDE[inwardStart],
  };
}

const PAIR_SAME_ENTRY: Readonly<Record<PairFreeInteractionId, string>> = {
  tempo_mismatch: '速さは近く見えても、終わらせたい気持ちと、置いて考えたい気持ちが同時に出やすい。',
  space_misread: '静かな時間の意味が揃わず、距離を置かれたように感じられやすい。',
  one_carries_quiet: '表では話が進んでも、言えていない一点が残りやすい。',
  talk_now_go_quiet: '確かめようとするほど、静かな時間が長くなりやすい。',
  later_decide_words_soon: '先に出た言葉を結論と読むと、置いて考えたい側が急かされやすい。',
  hard_return_hard_space: '間を取ることと戻ることが、どちらも重くなりやすい。',
  default_relationship_loop: 'いまの二人の進み方が見えにくく、速さの差が熱量の差に見えやすい。',
};

const PAIR_RELATION_ENTRY: Readonly<
  Partial<Record<RelationStatusId, Partial<Record<PairFreeInteractionId, string>>>>
> = {
  R1: {
    tempo_mismatch: 'まだ会話がない段階では、返事の速さより、最初の一言の置き方が先にずれやすい。',
    default_relationship_loop: 'まだ会話がない段階では、近づく速さの感覚が先にずれやすい。',
  },
  R2: {
    tempo_mismatch: 'やり取りが始まったばかりでは、返事の速さより「ここまで」の感覚が先にずれやすい。',
    default_relationship_loop:
      'やり取りの最初のほうでは、一方はその場のやり取りを一区切りにしようとしやすく、もう一方は返す前に言葉を整えたい時間を取りやすいことがあります。',
  },
  R3: {
    tempo_mismatch: '付き合っている日常では、終わらせたい気持ちと置いて考えたい気持ちが同時に出やすい。',
  },
  R4: {
    tempo_mismatch: '距離ができているときは、連絡の間より、再開のタイミングの感覚がずれやすい。',
    space_misread: '距離があるほど、静かな時間の意味が違う方向に読まれやすい。',
  },
  R5: {
    tempo_mismatch: 'いま離れている間は、連絡の間隔より、再開の速さの感覚がずれやすい。',
    default_relationship_loop: '離れている間は、速さの差が関心の有無の差に見えやすい。',
  },
  R6: {
    tempo_mismatch: '長く一緒にいるほど、いつもの速さが当たり前になり、変化の合図が見えにくくなりやすい。',
    space_misread: '長い関係ほど、静かな時間の意味が違う方向に読まれやすい。',
  },
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
  return buildSelfSharePostText(titleJa, insightJa);
}

function pairShareText(titleJa: string, insightJa: string): string {
  return buildPairSharePostText(titleJa, insightJa);
}

function premiumShareText(insightJa: string): string {
  return buildPremiumSharePostText(insightJa);
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

function hiddenShareInsight(birth: ExpressionAxes, answer: ExpressionAxes): string {
  const parts: string[] = [hiddenSpecLine(birth, answer)];
  const pushUnique = (text: string) => {
    const clip = text.replace(/。+$/g, '').trim();
    if (clip.length < 6) return;
    const prefix = clip.slice(0, 10);
    if (parts.some((part) => part.includes(prefix))) return;
    parts.push(`${clip}。`);
  };
  if (birth.start !== answer.start) {
    pushUnique(START_SLOT[answer.start]);
  } else if (birth.distance !== answer.distance) {
    pushUnique(
      answer.distance === 'close'
        ? '近い関係では、返事の前に距離感を一言確認したくなる'
        : answer.distance === 'solo'
          ? '会ったあと、一人の時間を先に取ってから返事を整えたくなる'
          : '連絡は続けつつ、返事の間だけ自分のペースに戻したくなる',
    );
  } else if (birth.change !== answer.change) {
    pushUnique(CHANGE_SLOT[answer.change]);
  } else if (birth.recovery !== answer.recovery) {
    pushUnique(RECOVERY_SLOT[answer.recovery]);
  } else if (birth.decision !== answer.decision) {
    pushUnique(DECISION_SLOT[answer.decision]);
  }
  return normalizeJapaneseTerminalPunctuation(parts.join(''));
}

function manualShareInsightJa(
  plan: readonly PublicManualSlotPlanV1[],
  rendered: readonly { label: string; body: string }[],
  answer: ExpressionAxes,
  birth: ExpressionAxes,
): string {
  const bodyFor = (kind: PublicManualSlotPlanV1['kind']) => {
    const index = plan.findIndex((slot) => slot.kind === kind);
    return index >= 0 ? rendered[index]!.body : null;
  };
  const firstClause = (text: string) => text.split('。')[0]?.trim() ?? text.trim();

  if (birth.start !== answer.start) {
    const startBody = bodyFor('primary_start');
    if (startBody) return firstClause(startBody);
  }
  if (birth.decision !== answer.decision) {
    const decisionBody = bodyFor('primary_decision');
    if (decisionBody) return firstClause(decisionBody);
  }
  const distanceBody = bodyFor('social_distance');
  if (distanceBody) return firstClause(distanceBody);
  if (birth.change !== answer.change) {
    const changeBody = bodyFor('change');
    if (changeBody) return firstClause(changeBody);
  }
  if (birth.recovery !== answer.recovery) {
    const recoveryBody = bodyFor('recover');
    if (recoveryBody) return firstClause(recoveryBody);
  }
  const fusedMisread = bodyFor('fused_misread');
  if (fusedMisread) return firstClause(fusedMisread);
  const fusedActual = bodyFor('fused_actual');
  if (fusedActual) return firstClause(fusedActual);
  return firstClause(START_SLOT[answer.start]);
}

function cardCBody(birth: ExpressionAxes, answer: ExpressionAxes): { body: string; insight: string } {
  const insight = hiddenSpecLine(birth, answer);
  let extra = '';
  if (birth.distance !== answer.distance) {
    extra =
      answer.distance === 'close'
        ? '\n近い関係ほど、今の距離感を言葉にする。'
        : answer.distance === 'solo'
          ? '\n人と会ったあと、一人の時間を置いてから戻る。'
          : '\n連絡の頻度を、あまり変えずに保つ。';
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
  premiumTakeawayJa?: string;
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
    const insight = manualShareInsightJa(plan, rendered, answer, birth);
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
    const insight = `見える私は、${seen}。実際の私は、${actual}。`;
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
      shareTextJa: selectedShareText('自分でも知らなかった仕様', hiddenShareInsight(birth, answer)),
    };
  }
  if (input.variant === 'premium_takeaway') {
    const insight = input.premiumTakeawayJa?.trim() || cardCBody(birth, answer).insight;
    return {
      variant: 'premium_takeaway',
      headline: '今のあなたへ残しておく一文',
      body: `${insight}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
      cta: 'M55 プレミアムレポートから',
      insightJa: insight,
      shareTextJa: premiumShareText(insight),
    };
  }
  return null;
}

export type ReconstructPairPublicCardInputV1 = {
  readonly interactionId: PairFreeInteractionId;
  readonly relationStatusId?: RelationStatusId;
  readonly visibleStart?: StartTendency;
  readonly inwardStart?: StartTendency;
  readonly shareInsightJa?: string;
};

function pairEntryJa(
  interactionId: PairFreeInteractionId,
  relationStatusId: RelationStatusId | undefined,
  visibleStart?: StartTendency,
  inwardStart?: StartTendency,
): string {
  const differentiated =
    visibleStart &&
    inwardStart &&
    visibleStart !== inwardStart;
  if (differentiated) {
    return `一方は、${PAIR_SIDE[visibleStart]}。\nもう一方は、${PAIR_SIDE[inwardStart]}。`;
  }
  if (relationStatusId) {
    const relationEntry = PAIR_RELATION_ENTRY[relationStatusId]?.[interactionId];
    if (relationEntry) return relationEntry;
  }
  return PAIR_SAME_ENTRY[interactionId];
}

export function reconstructPairPublicCard(
  interactionOrInput: PairFreeInteractionId | ReconstructPairPublicCardInputV1,
  visibleStart?: StartTendency,
  inwardStart?: StartTendency,
  shareInsightJa?: string,
): ReconstructedPublicCardV1 {
  const input: ReconstructPairPublicCardInputV1 =
    typeof interactionOrInput === 'string'
      ? {
          interactionId: interactionOrInput,
          visibleStart,
          inwardStart,
          shareInsightJa,
        }
      : interactionOrInput;
  const entryJa = pairEntryJa(
    input.interactionId,
    input.relationStatusId,
    input.visibleStart,
    input.inwardStart,
  );
  const differentiated =
    input.visibleStart &&
    input.inwardStart &&
    input.visibleStart !== input.inwardStart;
  const body = `すれ違いの入口\n${entryJa}`;
  const defaultInsight = differentiated
    ? `一方は${PAIR_SIDE[input.visibleStart!]}。もう一方は${PAIR_SIDE[input.inwardStart!]}。`
    : entryJa;
  const insight = input.shareInsightJa?.trim() || defaultInsight;
  return {
    variant: 'pair_manual',
    headline: '二人の取扱説明書',
    body,
    cta: PAIR_SHARE_CTA_JA,
    insightJa: insight,
    shareTextJa: pairShareText('二人の取扱説明書', insight),
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
      cta: PAIR_SHARE_CTA_JA,
      insightJa: insight,
      shareTextJa: pairShareText('二人の相性レポート', insight),
    };
  }
  const insight = '始める前に、今日はここまでと自分の言葉で決める。';
  return {
    variant: 'premium_takeaway',
    headline: '今のあなたへ残しておく一文',
    body: `${insight}\n\n${PUBLIC_DOB_PROVENANCE_CUE_JA}`,
    cta: 'M55 プレミアムレポートから',
    insightJa: insight,
    shareTextJa: premiumShareText(insight),
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
