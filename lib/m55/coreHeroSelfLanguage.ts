/**
 * /core hero self-language — compositional hero leads (not per-trait essays).
 * Avoids 「〜読み方」 / 「〜する人」; uses coreType + dominantAxis + stem lane selectors.
 */
import {
  buildCopySelectContext,
  selectIndex,
  type CopySelectContext,
} from './coreFreeCompositionalGrammar';
import type { AxisKey, CoreResult } from './coreResult/types';
import { birthDateFromCoreResult, coreTraitDisplayFromCoreType } from './coreFreePublicDisplay';

const TRAIT_HERO_LEAD: Readonly<Record<string, string>> = {
  TYPE_01: '意味の層まで確かめると',
  TYPE_02: '相手の温度が伝わると',
  TYPE_03: '理由や順番が見えると',
  TYPE_04: '落ち着いて状況を分解すると',
  TYPE_05: '場の空気を整えながら',
  TYPE_06: '全体像が先に見えると',
  TYPE_07: '根っこまで確かめると',
  TYPE_08: '小さく動いて流れを作ると',
  TYPE_09: '距離と言葉のニュアンスが読めると',
  TYPE_10: '全体をつなげて整えると',
};

const DOMINANT_HERO_OUTCOME: Readonly<Record<AxisKey, readonly string[]>> = {
  socialEnergy: [
    '近い人との距離が自然に保てやすくなります',
    '必要な場面では前に出やすくなります',
  ],
  stability: [
    '日常のリズムが安定しやすくなります',
    '小さな違和感を早めに整えやすくなります',
  ],
  openness: [
    '視点を広げながら手元を整理しやすくなります',
    'いまの論点に集中しやすくなります',
  ],
  cooperation: [
    '無理のない距離を保ちやすくなります',
    '近い人とのやり取りが整いやすくなります',
  ],
  structure: [
    '自分のペースで動きやすくなります',
    '次の一手を探しやすくなります',
  ],
};

const STEM_HERO_CONTEXT: Readonly<Record<number, readonly string[]>> = {
  0: ['進め方が見えてから', '本質まで確かめてから'],
  1: ['人との距離や流れを読みながら', '受け渡しを整えながら'],
  2: ['近い人の気持ちや場の流れを読みながら', '場の空気に合わせながら'],
  3: ['少しずつ良くしていく過程で', '丁寧に仕上げながら'],
  4: ['日々のリズムを整えながら', '崩れにくい土台を保ちながら'],
  5: ['まだ形の前のものを見つけながら', '段取りを整えながら'],
  6: ['判断が固まってから', '線引きをはっきりさせてから'],
  7: ['細かな違和感に気づきながら', '納得できる形まで整えながら'],
  8: ['いつもの枠を越えてつながりを探しながら', '新しい流れを受け取りながら'],
  9: ['小さな変化に気づきながら', '深く確かめながら'],
};

const STEM_HERO_TAIL: readonly string[] = [
  '自分らしさがはっきりしやすい形です',
  '動き出しやすい形です',
  '次の一歩を選びやすい形です',
  '日常が整いやすい形です',
];

export type CoreHeroSelfLanguage = {
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

export function coreHeroSelfLanguageForResult(result: CoreResult): CoreHeroSelfLanguage {
  const ctx = heroContext(result);
  const lead = TRAIT_HERO_LEAD[result.coreType] ?? TRAIT_HERO_LEAD.TYPE_01!;
  const outcomes = DOMINANT_HERO_OUTCOME[ctx.dominantAxis] ?? DOMINANT_HERO_OUTCOME.structure;
  const oi = selectIndex(ctx, 30, outcomes.length);
  const primary = `${lead}、${outcomes[oi]!}。`;

  const stemLane = ((result.stemLaneIndex % 10) + 10) % 10;
  const contexts = STEM_HERO_CONTEXT[stemLane] ?? STEM_HERO_CONTEXT[0]!;
  const ci = selectIndex(ctx, 31, contexts.length);
  const ti = selectIndex(ctx, 32, STEM_HERO_TAIL.length);
  const secondary = `${contexts[ci]}、${STEM_HERO_TAIL[ti]!}。`;

  return { primary, secondary };
}

export function coreHeroSelfLanguageFingerprint(result: CoreResult): string {
  const { primary, secondary } = coreHeroSelfLanguageForResult(result);
  return `${primary}\n${secondary}`;
}
