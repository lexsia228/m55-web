/**
 * Canonical trait identity — single source for free result, share, OG, Premium intro.
 * No DOB, nickname, answers, or private result content.
 *
 * Each trait is one semantic chain: name → tagline → recognition → premium continuity.
 * Sentence forms may differ across surfaces; person/behavior meaning must not.
 */
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { STEM_LANE_TEN_VIEWS_IMAGE } from '../publicStemDisplay';

export type TraitIdentity = {
  stemLaneIndex: number;
  traitName: string;
  /** Short memorable identity — result/share hero line. */
  canonicalTagline: string;
  /** Alias kept for callers; equals canonicalTagline. */
  shortStatement: string;
  /** Alias kept for callers; equals canonicalTagline. */
  longDescription: string;
  /** Distinct concrete recognition — must not paraphrase the tagline. */
  shareStatement: string;
  imagePath: string;
  accent: string;
  premiumContinuityTemplate: string;
};

const TRAIT_ACCENTS: readonly string[] = [
  '#4a6741',
  '#5c6b8a',
  '#c47a2c',
  '#6b4f7a',
  '#5a6b72',
  '#7a6b4f',
  '#4f5a7a',
  '#8a6b7a',
  '#3d6b8a',
  '#5a5a72',
];

/**
 * Conversation-ready identity lines — one credible person per trait.
 * Index aligns with TEN_STEM_DISPLAY / stem lane 0–9.
 */
const CANONICAL_TAGLINES: readonly string[] = [
  '自分の進め方が見えたときに、力が出やすい人',
  '人との距離や流れを読み、受け渡しを整えやすい人',
  '近い人との場の空気を読み、動き出しやすくする人',
  '材料を集め、比べながら形を整えていく人',
  '日々のリズムを整え、崩れにくい土台を守りやすい人',
  'まだ形になる前のものを見つけ、育てて形にする人',
  '判断が固まったときに、迷いなく動き出しやすい人',
  '細かな違和感に気づき、納得できる形まで整えやすい人',
  'いつもの枠を越え、新しいつながりをひらきやすい人',
  '全体を見渡し、つながりを整えてから動く人',
];

/**
 * Distinct recognition statements — same person as tagline, different grammar.
 * Must not be a near-copy of CANONICAL_TAGLINES.
 */
const SHARE_STATEMENTS: readonly string[] = [
  '進め方の輪郭が見えた場面で、静かに前へ出やすくなります。',
  '人との間のタイミングを見ながら、受け渡しを整えやすくなります。',
  '近い人の空気が読めると、場の一歩目を出しやすくなります。',
  '答えを急ぐより、材料と候補がそろったときに形が見えやすくなります。',
  '日々の区切りを保つほど、崩れにくい土台を守りやすくなります。',
  'まだはっきりしないものを拾い、育てて形にしやすくなります。',
  '判断が固まったあとは、迷いを残さず動き出しやすくなります。',
  '小さな違和感を見逃さず、納得できる形まで整えやすくなります。',
  'いつもの枠の外に目を向けると、新しいつながりをひらきやすくなります。',
  '急いで動くより、全体と選択肢が見えたときに判断しやすくなります。',
];

function buildPremiumContinuityTemplate(traitName: string): string {
  return `「${traitName}」の結果を、4章で深く読む`;
}

export const TRAIT_IDENTITY_CATALOG: readonly TraitIdentity[] = TEN_STEM_DISPLAY.map(
  (stem, stemLaneIndex) => {
    const tagline = CANONICAL_TAGLINES[stemLaneIndex] ?? stem.displayOneLine;
    const recognition = SHARE_STATEMENTS[stemLaneIndex] ?? `${tagline}。`;
    return {
      stemLaneIndex,
      traitName: stem.publicTitle,
      canonicalTagline: tagline,
      shortStatement: tagline,
      longDescription: tagline,
      shareStatement: recognition,
      imagePath: STEM_LANE_TEN_VIEWS_IMAGE[stemLaneIndex] ?? '/ten-views/analyst.webp',
      accent: TRAIT_ACCENTS[stemLaneIndex] ?? '#5a5a72',
      premiumContinuityTemplate: buildPremiumContinuityTemplate(stem.publicTitle),
    };
  },
);

export function resolveTraitIdentity(stemLaneIndex: number): TraitIdentity | null {
  const idx = ((stemLaneIndex % 10) + 10) % 10;
  return TRAIT_IDENTITY_CATALOG[idx] ?? null;
}

export function assertTraitIdentityCatalogComplete(): void {
  if (TRAIT_IDENTITY_CATALOG.length !== 10) {
    throw new Error(`trait catalog incomplete: expected 10, got ${TRAIT_IDENTITY_CATALOG.length}`);
  }
  for (const trait of TRAIT_IDENTITY_CATALOG) {
    for (const key of [
      'traitName',
      'canonicalTagline',
      'shortStatement',
      'longDescription',
      'imagePath',
      'accent',
      'shareStatement',
      'premiumContinuityTemplate',
    ] as const) {
      const value = trait[key];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`trait ${trait.stemLaneIndex} missing ${key}`);
      }
    }
    // Tagline and recognition must not be the same sentence form.
    const normalize = (s: string) =>
      s.replace(/[。、\s]|人$|傾向があります|やすくなります/g, '');
    if (normalize(trait.canonicalTagline) === normalize(trait.shareStatement)) {
      throw new Error(
        `trait ${trait.stemLaneIndex} (${trait.traitName}) tagline/shareStatement identical`,
      );
    }
  }
}
