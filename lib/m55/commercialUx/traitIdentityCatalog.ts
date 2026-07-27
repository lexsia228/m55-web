/**
 * Canonical trait identity — single source for free result, share, OG, Premium intro.
 * No DOB, nickname, answers, or private result content.
 */
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { STEM_LANE_TEN_VIEWS_IMAGE } from '../publicStemDisplay';

export type TraitIdentity = {
  stemLaneIndex: number;
  traitName: string;
  canonicalTagline: string;
  shortStatement: string;
  longDescription: string;
  imagePath: string;
  accent: string;
  shareStatement: string;
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

/** Conversation-ready trait taglines — aligned to stem catalog, not generic motivation. */
const CANONICAL_TAGLINES: readonly string[] = [
  '自分の進め方が見えたときに、力が出やすい人',
  '人との距離や流れを読み、受け渡しを整えやすい人',
  '近い人との場の空気を読み、動き出しやすくする人',
  '少しずつ良くしていく中で、自分らしさがはっきりしていく人',
  '日々のリズムを整え、崩れにくい土台を守りやすい人',
  '人や、まだ形の前のものを見つけ、育てて形にする人',
  '判断が固まったときに、迷いなく動き出しやすい人',
  '細かな違和感に気づき、納得できる形まで整えやすい人',
  'いつもの枠を越え、新しいつながりをひらきやすい人',
  '全体を見渡し、つながりを整えてから動く人',
];

/** Privacy-safe share statements — grammatically distinct from canonicalTagline but semantically aligned. */
const SHARE_STATEMENTS: readonly string[] = [
  '進め方が見えたときに、力が出やすい傾向があります。',
  '人との距離や流れを読み、受け渡しを整えやすい傾向があります。',
  '場の空気を読み、動き出しやすくする傾向があります。',
  '少しずつ良くしていく中で、自分らしさがはっきりしやすい傾向があります。',
  '日々のリズムを整え、崩れにくい土台を守りやすい傾向があります。',
  'まだ形になる前のものを見つけ、育てて形にしやすい傾向があります。',
  '判断が固まったときに、迷いなく動き出しやすい傾向があります。',
  '細かな違和感に気づき、納得できる形まで整えやすい傾向があります。',
  'いつもの枠を越え、新しいつながりをひらきやすい傾向があります。',
  '急いで動くより、全体と選択肢が見えたときに判断しやすくなります。',
];

function buildPremiumContinuityTemplate(traitName: string): string {
  return `「${traitName}」の結果を、4章で深く読む`;
}

export const TRAIT_IDENTITY_CATALOG: readonly TraitIdentity[] = TEN_STEM_DISPLAY.map(
  (stem, stemLaneIndex) => ({
    stemLaneIndex,
    traitName: stem.publicTitle,
    canonicalTagline: CANONICAL_TAGLINES[stemLaneIndex] ?? stem.displayOneLine,
    shortStatement: SHARE_STATEMENTS[stemLaneIndex] ?? stem.displayOneLine,
    longDescription: CANONICAL_TAGLINES[stemLaneIndex] ?? stem.displayOneLine,
    imagePath: STEM_LANE_TEN_VIEWS_IMAGE[stemLaneIndex] ?? '/ten-views/analyst.webp',
    accent: TRAIT_ACCENTS[stemLaneIndex] ?? '#5a5a72',
    shareStatement: SHARE_STATEMENTS[stemLaneIndex] ?? stem.displayOneLine,
    premiumContinuityTemplate: buildPremiumContinuityTemplate(stem.publicTitle),
  }),
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
  }
}
