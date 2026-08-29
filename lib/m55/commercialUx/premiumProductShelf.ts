/**
 * Premium product shelf — display model for /dtr/lp paid-product discovery.
 * Product facts derive from machine contract + compatibility commerce authority only.
 */
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from '../compatibility/compatibilityCommerceAuthority';
import { getCommercialProduct } from '../contracts/m55CommercialFunnelContract';
import { HOME_PAIR_READING_PUBLIC_HREF } from '../homePairReadingPublicContract';
import { buildPlanComparisonModel } from './planComparison';

export const PREMIUM_PRODUCT_SHELF_SECTION_ID = 'm55-premium-product-shelf' as const;

export type PremiumProductShelfItem = {
  publicNameJa: string;
  priceLabelJa: string;
  summaryJa: string;
};

export type PremiumProductShelfModel = {
  sectionId: typeof PREMIUM_PRODUCT_SHELF_SECTION_ID;
  sectionTitleJa: string;
  oneTimeNoteJa: string;
  selfLight: PremiumProductShelfItem;
  selfFull: PremiumProductShelfItem;
  pairProduct: {
    productNameJa: string;
    priceLabelJa: string;
    oneTimeNoteJa: string;
    freeSummaryJa: string;
    premiumSummaryJa: string;
    premiumBulletsJa: readonly string[];
    ctaLabelJa: string;
    ctaHref: string;
    purchaseNoteJa: string;
  };
};

export function buildPremiumProductShelfModel(): PremiumProductShelfModel {
  const plan = buildPlanComparisonModel();
  const pairProduct = getCommercialProduct('pairPremium');
  const pairAuthority = COMPATIBILITY_REPORT_PRODUCT_AUTHORITY;

  return {
    sectionId: PREMIUM_PRODUCT_SHELF_SECTION_ID,
    sectionTitleJa: 'プレミアム商品',
    oneTimeNoteJa: plan.oneTimeNoteJa,
    selfLight: {
      publicNameJa: plan.light.publicName,
      priceLabelJa: plan.light.priceLabelJa,
      summaryJa: plan.light.audienceJa,
    },
    selfFull: {
      publicNameJa: plan.full.publicName,
      priceLabelJa: plan.full.priceLabelJa,
      summaryJa: plan.full.audienceJa,
    },
    pairProduct: {
      productNameJa: pairAuthority.publicName,
      priceLabelJa: pairAuthority.priceLabel,
      oneTimeNoteJa: '買い切り・自動更新なし',
      freeSummaryJa: '今の二人に何が起きているかをつかむ',
      premiumSummaryJa:
        'なぜそうなるのか、どう扱えばいいのか、関係を戻す・進める視点、使える言葉や小さな行動、あとから読み返せる深い読み解きまで。',
      premiumBulletsJa: pairProduct.benefits,
      ctaLabelJa: '二人の無料結果から始める',
      ctaHref: HOME_PAIR_READING_PUBLIC_HREF,
      purchaseNoteJa: '無料結果のあとに二人の相性レポートを選べます',
    },
  };
}
