/**
 * Pair reading static fragments (copy-freeze directions).
 * Safe, non-advisory, everyday Japanese. No raw DOB / scores.
 */

import type {
  PaidTopicId,
  PairAxisId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';
import { CH_ABOUT_DISCLAIMER, getAxisLabel, getTopicLabel } from './pairReadingCatalog.v1';

export const PAIR_READING_FRAGMENT_SET_VERSION = 'pair_fragments_v1' as const;

export const PAIR_AXIS_TEASER_OPENERS: Readonly<Record<PairAxisId, string>> = {
  A1: 'この2人は、気持ちの強さよりも、近づくペースの違いが見えやすい組み合わせです。',
  A2: 'この2人は、気持ちの強さよりも、反応の出方の違いが見えやすい組み合わせです。',
  A3: 'この2人は、好き嫌いよりも、安心するまでの時間差としてすれ違いが見えやすい組み合わせです。',
  A4: 'この2人は、特別な言葉よりも、接点や入口の作り方の違いが見えやすい組み合わせです。',
};

export const TOPIC_TEASER_BRIDGES: Readonly<Record<PaidTopicId, string>> = {
  T1: '今の視点「2人の距離が縮まりやすい入口」では、近づき方の間合いが手がかりになります。',
  T2: '今の視点「すれ違いやすい場面」では、正しさより安心までの間合いが手がかりになります。',
  T3: '今の視点「連絡や会話のペース差」では、速さより会話の温度の続き方が手がかりになります。',
  T4: '今の視点「相手が反応しやすい場面」では、反応の有無より場面の作り方が手がかりになります。',
  T5: '今の視点「気持ちを伝える前に見る距離の温度差」では、伝える前の距離の温度が手がかりになります。',
};

export const PAIR_AXIS_GAP_BODIES: Readonly<Record<PairAxisId, string>> = {
  A1: [
    '2人の距離に出やすいズレは、まず近づくペースの差として見えやすいです。',
    '一方が先に間合いを詰め、もう一方が整うまで待つ、という差が重なると、熱量の話より先に距離の話になります。',
    'ここでの手がかりは、正しさの判定ではなく、急ぎ方と待ち方の型を並べて見ることです。',
  ].join('\n\n'),
  A2: [
    '2人の距離に出やすいズレは、反応の出方の差として見えやすいです。',
    '同じ出来事でも、言葉に出る側と、間に出る側では、受け取った温度が違って見えやすいです。',
    'ここでの手がかりは、反応の有無を断定することではなく、出方の型の違いを整理することです。',
  ].join('\n\n'),
  A3: [
    '2人の距離に出やすいズレは、すれ違いやすい面として見えやすいです。',
    '受け止め方が揃うまでの時間差が長いと、小さなズレが長く残って見えやすいです。',
    'ここでの手がかりは、合わない断定ではなく、安心までの間合いの差を見ることです。',
  ].join('\n\n'),
  A4: [
    '2人の距離に出やすいズレは、接点や入口の作り方の差として見えやすいです。',
    '会話や連絡の入り口が噛み合いにくいと、中身の話より先に近づき始めの段差が出やすいです。',
    'ここでの手がかりは、大きな決断ではなく、入口の小ささと続き方を見ることです。',
  ].join('\n\n'),
};

export const TOPIC_DEEP_BODIES: Readonly<Record<PaidTopicId, string>> = {
  T1: [
    '距離が縮まりやすい入口は、特別な宣言より、近づき方の速さや間合いに出やすいです。',
    '入口が合うときは、小さな接点が続きやすく、急ぎすぎると温度の出し方にズレが出やすいです。',
    '深掘りの一点は、「近づけるかどうか」の断定ではなく、縮まりやすい入口の型を見ることです。',
  ].join('\n\n'),
  T2: [
    'すれ違いやすい場面は、正しさの争点より、安心するまでの時間差として出やすいです。',
    '受け止めのペースが違うと、同じ話題でも温度の残り方が違って見えやすいです。',
    '深掘りの一点は、終わりの断定ではなく、長引きやすいズレの型を整理することです。',
  ].join('\n\n'),
  T3: [
    '連絡や会話のペース差は、返信の速さそのものより、会話の温度の続き方に出やすいです。',
    '頻度の感じ方が違うと、同じ連絡量でも距離の見え方が変わりやすいです。',
    '深掘りの一点は、追う・待つ指示ではなく、ペース差が距離に見える瞬間を見ることです。',
  ].join('\n\n'),
  T4: [
    '反応しやすい場面は、好意の断定より、場面の作り方で出やすいです。',
    '出やすい場面と出にくい場面の差が見えると、反応の温度の読み違いが減りやすいです。',
    '深掘りの一点は、気持ちの断定ではなく、反応の出方と場面の噛み合いを整理することです。',
  ].join('\n\n'),
  T5: [
    '気持ちを伝える前に見えやすいのは、勇気の有無より、今の距離の温度差です。',
    '急ぎやすい側と、整うまで待ちやすい側では、同じタイミングでも見え方が違います。',
    '深掘りの一点は、伝えるべき断定ではなく、伝える前に見える距離の温度を見ることです。',
  ].join('\n\n'),
};

export const STATUS_EMPHASIS: Readonly<
  Record<RelationStatusId, { deepAdd: string; clueAdd: string }>
> = {
  R1: {
    deepAdd:
      '片思いの現在地では、反応の見え方と温度差が厚く出やすいです。好きかどうかの断定はしません。',
    clueAdd: '反応の有無より、反応の温度を見る向きです。',
  },
  R2: {
    deepAdd:
      '連絡を取っている現在地では、ペース差と反応場面が厚く出やすいです。返信時期の予測はしません。',
    clueAdd: '速さより、返ってきた時の間合いを見る向きです。',
  },
  R3: {
    deepAdd:
      '付き合っている現在地では、近さの中のすれ違いや生活リズムの芽が厚く出やすいです。別れる断定はしません。',
    clueAdd: '近さの中の小さなズレを見る向きです。',
  },
  R4: {
    deepAdd:
      '距離ができている現在地では、距離の入口とズレの型が厚く出やすいです。終わりの断定はしません。',
    clueAdd: '遠さの理由探しより、距離の型を見る向きです。',
  },
  R5: {
    deepAdd:
      'もう一度近づきたい現在地では、近づく前のズレが厚く出やすいです。結果の保証はしません。',
    clueAdd: '再接近の前に見えるペース差を見る向きです。',
  },
  R6: {
    deepAdd:
      '長く一緒にいることを考えている現在地では、生活ペースの差が厚く出やすいです。将来の保証はしません。',
    clueAdd: '特別な日より、日常のリズム差を見る向きです。',
  },
};

export const TEMPERATURE_CLUE_MOD: Readonly<Record<TemperatureId, string>> = {
  E0: '',
  E1: '少し気になっている温度感なら、観察は軽く、一点だけに絞ると整いやすいです。',
  E2: '連絡や反応が気になる温度感なら、速さより温度と間合いを先に見ると整いやすいです。',
  E3: '距離の取り方に迷う温度感なら、詰め方の指示ではなく、距離の見え方を先に見ると整いやすいです。',
  E4: '一度距離ができている温度感なら、終わりの断定ではなく、いまの距離の型を先に見ると整いやすいです。',
  E5: 'これからを真剣に考えている温度感でも、急がず、今の温度差を一点だけ見ると整いやすいです。',
};

export const TOPIC_CLUE_CORE: Readonly<Record<PaidTopicId, string>> = {
  T1: '今日見るなら、特別な言葉ではなく、近づき方の間合いです。',
  T2: '今日見るなら、正しさの勝ち負けではなく、安心するまでの間合いです。',
  T3: '今日見るなら、返事の速さではなく、返ってきた時の温度です。',
  T4: '今日見るなら、反応の有無ではなく、反応の温度です。',
  T5: '今日見るなら、勇気の有無ではなく、今の距離の温度です。',
};

export const PERSON_A_BODY =
  [
    'あなた側は、反応やペースが「間合いの取り方」として出やすい傾向があります。',
    '強さの話というより、安心するまでの時間や、先に動く／整えてから動く、の差として見えやすいです。',
    'ここでの自己理解は、良し悪しの断定ではなく、自分側に出やすい型を一つ置くことです。',
  ].join('\n\n');

export const PERSON_B_BODY =
  [
    'お相手側は、反応の出方が「言葉に出る／間に出る」の差として見えやすい傾向があります。',
    '好き嫌いの判定ではなく、同じ場面でも温度の出し方が違って見えやすい、という整理です。',
    'ここでの手がかりは、お相手の気持ちを断定することではなく、反応の出方の型を一つ置くことです。',
  ].join('\n\n');

export function buildTeaserText(args: {
  pairAxisId: PairAxisId;
  paidTopicId: PaidTopicId;
  safetyShortText: string;
  ctaText: string;
}): string {
  const s1 = PAIR_AXIS_TEASER_OPENERS[args.pairAxisId];
  const s2 = TOPIC_TEASER_BRIDGES[args.paidTopicId];
  // Single sentence: safety short + CTA (must keep total teaser at exactly 3 sentences).
  const safetyCore = args.safetyShortText.replace(/。\s*$/u, '');
  const s3 = `${safetyCore}が、${args.ctaText}で開けます。`;
  return `${s1}${s2}${s3}`;
}

export function buildTodayClueBody(args: {
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
  temperatureId: TemperatureId;
}): string {
  const core = TOPIC_CLUE_CORE[args.paidTopicId];
  const status = STATUS_EMPHASIS[args.relationStatusId].clueAdd;
  const temp = TEMPERATURE_CLUE_MOD[args.temperatureId];
  return [core, status, temp].filter(Boolean).join('\n\n');
}

export function buildTopicDeepBody(args: {
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
}): string {
  return [
    TOPIC_DEEP_BODIES[args.paidTopicId],
    STATUS_EMPHASIS[args.relationStatusId].deepAdd,
  ].join('\n\n');
}

export function buildPairGapBody(pairAxisId: PairAxisId): string {
  return PAIR_AXIS_GAP_BODIES[pairAxisId];
}

export function getAboutBody(): string {
  return CH_ABOUT_DISCLAIMER;
}

/** Required everyday terms for quality heuristics (at least one family). */
export const DAILY_LANGUAGE_TERMS = [
  '距離',
  '反応',
  'ペース',
  'ズレ',
  '間合い',
  '入口',
  '温度',
  '手がかり',
] as const;

export function axisTopicHint(pairAxisId: PairAxisId, paidTopicId: PaidTopicId): string {
  return `${getAxisLabel(pairAxisId)} / ${getTopicLabel(paidTopicId)}`;
}
