import { STEM_LANE_TEN_VIEWS_IMAGE } from './publicStemDisplay';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';

/** Public 資質 labels — canonical order follows TEN_STEM_DISPLAY (甲→癸). */
const TEN_ASSET_QUALITY_LABELS = [
  '突破の資質',
  '適応の資質',
  '発信の資質',
  '凝縮の資質',
  '不動の資質',
  '育成の資質',
  '変革の資質',
  '研磨の資質',
  '大局の資質',
  '洞察の資質',
] as const;

export type TenAssetPublicEntry = {
  stemChar: (typeof TEN_STEM_DISPLAY)[number]['stemChar'];
  persona: (typeof TEN_STEM_DISPLAY)[number]['publicTitle'];
  qualityLabel: (typeof TEN_ASSET_QUALITY_LABELS)[number];
  imageSrc: string;
};

export const TEN_ASSET_PUBLIC_CATALOG: readonly TenAssetPublicEntry[] = TEN_STEM_DISPLAY.map(
  (stem, index) => ({
    stemChar: stem.stemChar,
    persona: stem.publicTitle,
    qualityLabel: TEN_ASSET_QUALITY_LABELS[index]!,
    imageSrc: STEM_LANE_TEN_VIEWS_IMAGE[index]!,
  }),
);
