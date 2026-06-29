/**
 * /core hero self-language — compositional hero leads (not per-trait essays).
 * First-view clarity: everyday label + trait + two user-subject lines (no 読み方 / 形です).
 */
import {
  buildCopySelectContext,
  selectIndex,
  type CopySelectContext,
} from './coreFreeCompositionalGrammar';
import type { AxisKey, CoreResult } from './coreResult/types';
import { birthDateFromCoreResult, coreTraitDisplayFromCoreType } from './coreFreePublicDisplay';

export const CORE_HERO_EVERYDAY_LABEL = '日常で出やすい形';

const TRAIT_HERO_LEAD: Readonly<Record<string, string>> = {
  TYPE_01: '意味の層まで確かめると',
  TYPE_02: '相手の温度が伝わると',
  TYPE_03: '理由や順番が見えると',
  TYPE_04: '落ち着いて状況を分解すると',
  TYPE_05: '相手の温度を見ながら',
  TYPE_06: '全体像が先に見えると',
  TYPE_07: '根っこまで確かめると',
  TYPE_08: '小さく動いて流れを作ると',
  TYPE_09: '距離と言葉のニュアンスが読めると',
  TYPE_10: '全体をつなげて整えると',
};

const DOMINANT_HERO_OUTCOME: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '必要な場面では前に出やすいです',
    '近い人との距離が自然に保てやすいです',
  ],
  stability: [
    '日常のリズムが安定しやすいです',
    '小さな違和感に早めに気づきやすいです',
  ],
  openness: [
    'いまの論点に集中しやすいです',
    '視点を広げながら手元も整理しやすいです',
  ],
  cooperation: [
    '場が落ち着く方向へ整えやすいです',
    '近い人とのやり取りがすり合いやすいです',
  ],
  structure: [
    '次の一手を選びやすいです',
    '自分のペースで進みやすいです',
  ],
};

const HERO_SECONDARY_BY_LANE: Readonly<Record<number, readonly string[]>> = {
  0: [
    '急がず範囲を絞るほど、次の一歩を選びやすくなります',
    '一度立ち止まって確認すると、迷いが減りやすくなります',
  ],
  1: [
    '受け渡しのタイミングを先に決めると、動き出しやすくなります',
    '人との距離や流れを見ながら、次の一歩を選びやすくなります',
  ],
  2: [
    '近い人の気持ちや場の流れを見ながら、動き出しやすくなります',
    '相手の反応を先に確かめると、迷いが減りやすくなります',
  ],
  3: [
    '少しずつ確かめながら進むと、手ごたえを得やすくなります',
    '一度区切りを置くと、ペースを保ちやすくなります',
  ],
  4: [
    '無理に合わせすぎない距離を置くと、自分らしさも保ちやすくなります',
    'ペースを崩さないよう区切りを置くと、負荷がたまりにくくなります',
  ],
  5: [
    '段取りを先に決めると、動き出しやすくなります',
    'まだ形の前のものを見つけながら、次の一歩を選びやすくなります',
  ],
  6: [
    '線引きをはっきりさせてから進むと、迷いが減りやすくなります',
    '判断が固まってから動くと、負荷がたまりにくくなります',
  ],
  7: [
    '細かな違和感に気づいたら、短くメモすると戻しやすくなります',
    '納得できるまで確かめてから進むと、ペースを保ちやすくなります',
  ],
  8: [
    'いつもの枠を少し越えてつながりを探すと、流れが生まれやすくなります',
    '新しい流れを受け取ってから動くと、動き出しやすくなります',
  ],
  9: [
    '小さな変化に気づいたら、一度立ち止まると選びやすくなります',
    '深く確かめてから進むと、次の一歩が軽くなりやすくなります',
  ],
};

const HERO_SECONDARY_FALLBACK: readonly string[] = [
  '無理に合わせすぎない距離を置くと、自分らしさも保ちやすくなります',
  '一度立ち止まって確認すると、次の動きを選びやすくなります',
  '小さく始めてから広げると、負荷がたまりにくくなります',
];

export type CoreHeroSelfLanguage = {
  everydayLabel: string;
  displayTrait: string;
  primary: string;
  secondary: string;
};

function heroContext(result: CoreResult): CopySelectContext {
  return buildCopySelectContext(
    result,
    birthDateFromCoreResult(result),
    coreTraitDisplayFromCoreType(result.coreType),
  );
}

function heroSelectIndex(ctx: CopySelectContext, salt: number, poolSize: number): number {
  if (poolSize <= 1) return 0;
  const typeNum = Number(ctx.coreType.replace(/\D/g, '')) || 0;
  const seed = (ctx.birthDateHash % 10007) + salt * 53 + ctx.stemLaneIndex * 11 + typeNum * 7 + ctx.day;
  return ((seed % poolSize) + poolSize) % poolSize;
}

export function coreHeroSelfLanguageForResult(result: CoreResult): CoreHeroSelfLanguage {
  const ctx = heroContext(result);
  const displayTrait = coreTraitDisplayFromCoreType(result.coreType);
  const lead = TRAIT_HERO_LEAD[result.coreType] ?? TRAIT_HERO_LEAD.TYPE_01!;
  const outcomes = DOMINANT_HERO_OUTCOME[ctx.dominantAxis] ?? DOMINANT_HERO_OUTCOME.structure;
  const oi = heroSelectIndex(ctx, 30, outcomes.length);
  const primary = `${lead}、${outcomes[oi]!}。`;

  const stemLane = ((result.stemLaneIndex % 10) + 10) % 10;
  const secondaryPool = HERO_SECONDARY_BY_LANE[stemLane] ?? HERO_SECONDARY_FALLBACK;
  const si = selectIndex(ctx, 31 + ctx.day, secondaryPool.length);
  const secondary = `${secondaryPool[si] ?? secondaryPool[0]!}。`;

  return {
    everydayLabel: CORE_HERO_EVERYDAY_LABEL,
    displayTrait,
    primary,
    secondary,
  };
}

export function coreHeroSelfLanguageFingerprint(result: CoreResult): string {
  const { everydayLabel, displayTrait, primary, secondary } = coreHeroSelfLanguageForResult(result);
  return `${everydayLabel}\n${displayTrait}\n${primary}\n${secondary}`;
}
