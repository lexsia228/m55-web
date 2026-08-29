/**
 * Premium product shelf — display model for /dtr/lp other-premium-product discovery.
 * Product facts derive from compatibility commerce authority only.
 */
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from '../compatibility/compatibilityCommerceAuthority';
import { HOME_PAIR_READING_PUBLIC_HREF } from '../homePairReadingPublicContract';

export const PREMIUM_PRODUCT_SHELF_SECTION_ID = 'm55-premium-product-shelf' as const;

export type PremiumProductShelfModel = {
  sectionId: typeof PREMIUM_PRODUCT_SHELF_SECTION_ID;
  sectionTitleJa: string;
  pairProduct: {
    productNameJa: string;
    priceLabelJa: string;
    oneTimeNoteJa: string;
    valueSentenceJa: string;
    ctaLabelJa: string;
    ctaHref: string;
    purchaseNoteJa: string;
  };
};

export function buildPremiumProductShelfModel(): PremiumProductShelfModel {
  const pairAuthority = COMPATIBILITY_REPORT_PRODUCT_AUTHORITY;

  return {
    sectionId: PREMIUM_PRODUCT_SHELF_SECTION_ID,
    sectionTitleJa: 'ほかのプレミアム商品',
    pairProduct: {
      productNameJa: pairAuthority.publicName,
      priceLabelJa: pairAuthority.priceLabel,
      oneTimeNoteJa: '買い切り・自動更新なし',
      valueSentenceJa: '二人の違いやすれ違いの流れを、理由と扱い方まで深く読み解きます。',
      ctaLabelJa: '二人の無料結果から始める',
      ctaHref: HOME_PAIR_READING_PUBLIC_HREF,
      purchaseNoteJa: '無料結果のあとに二人の相性レポートを選べます',
    },
  };
}
