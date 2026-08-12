/**
 * Unified plan comparison display model — derived from machine Product Truth.
 * Does not replace m55CommercialFunnelContract.
 */
import { getCommercialProduct, M55_REPORT_CHAPTERS } from '../contracts/m55CommercialFunnelContract';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../paidDtrProductCopy';

export type PlanComparisonTier = {
  key: 'light' | 'full';
  publicName: string;
  priceJpy: number;
  priceLabelJa: string;
  audienceJa: string;
  includedItemsJa: readonly string[];
  additionalReadings: number;
  isOneTime: true;
};

export type PlanComparisonModel = {
  light: PlanComparisonTier;
  full: PlanComparisonTier;
  upgradePriceJpy: number;
  upgradePriceLabelJa: string;
  priceDeltaJpy: number;
  additionalReadingsDelta: number;
  lightThenUpgradeTotalJpy: number;
  fullInitialAdvantageJpy: number;
  oneTimeNoteJa: string;
  sameFourChaptersNoteJa: string;
  fullRecommendBadgeJa: string;
  fullRecommendReasonJa: string;
  upgradeNoteJa: string;
  fullDeltaNoteJa: string;
  chapterTitlesJa: readonly string[];
  /**
   * Compact difference shown before the full plan cards so both tiers can be
   * compared inside one mobile screen. Derived from the tiers above; it states no
   * product fact of its own.
   */
  compactDifference: {
    headingJa: string;
    light: { nameJa: string; priceLabelJa: string; differenceJa: string };
    full: { nameJa: string; priceLabelJa: string; differenceJa: string };
    sharedJa: string;
  };
  /** Shared labels for plan selection / payment confirmation surfaces */
  oneTimeLabelJa: string;
  includedHeadingJa: string;
  consultReplyLabelJa: string;
  selectLightCtaJa: string;
  selectFullCtaJa: string;
  checkoutProceedCtaJa: string;
};

function formatYenLabelJa(priceJpy: number): string {
  return `¥${priceJpy.toLocaleString('ja-JP')}（税込）`;
}

export function buildPlanComparisonModel(): PlanComparisonModel {
  const lightProduct = getCommercialProduct('selfPremiumLight');
  const fullProduct = getCommercialProduct('selfPremiumFull');
  const lightPriceJpy = lightProduct.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.light.priceYen;
  const fullPriceJpy = fullProduct.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.full.priceYen;
  const upgradePriceJpy = PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen;
  const priceDeltaJpy = fullPriceJpy - lightPriceJpy;
  const lightThenUpgradeTotalJpy = lightPriceJpy + upgradePriceJpy;
  const fullInitialAdvantageJpy = lightThenUpgradeTotalJpy - fullPriceJpy;

  return {
    light: {
      key: 'light',
      publicName: lightProduct.publicName,
      priceJpy: lightPriceJpy,
      priceLabelJa: formatYenLabelJa(lightPriceJpy),
      audienceJa: 'まず一つのテーマを深く見たい方へ',
      includedItemsJa: ['プレミアムレポート', '追加読み解き 1件'],
      additionalReadings: 1,
      isOneTime: true,
    },
    full: {
      key: 'full',
      publicName: fullProduct.publicName,
      priceJpy: fullPriceJpy,
      priceLabelJa: formatYenLabelJa(fullPriceJpy),
      audienceJa: '仕事・関係・日常など、複数のテーマを見たい方へ',
      includedItemsJa: ['プレミアムレポート', '追加読み解き 合計5件'],
      additionalReadings: 5,
      isOneTime: true,
    },
    upgradePriceJpy,
    upgradePriceLabelJa: formatYenLabelJa(upgradePriceJpy),
    priceDeltaJpy,
    additionalReadingsDelta: 4,
    lightThenUpgradeTotalJpy,
    fullInitialAdvantageJpy,
    oneTimeNoteJa: '買い切り・自動更新なし',
    sameFourChaptersNoteJa:
      'どちらも、同じプレミアムレポートを読めます。違いは、購入後に追加で読み解けるテーマ数です。',
    fullRecommendBadgeJa: '複数テーマ向け',
    fullRecommendReasonJa: '複数のテーマを見たい方へ',
    fullDeltaNoteJa: 'ライトとの差は480円。追加読み解きが4件増えます。',
    upgradeNoteJa:
      'ライトを購入したあとからフルに切り替える場合は600円です。この順で購入した合計は1,600円。最初からフルを選ぶ場合は1,480円です。',
    chapterTitlesJa: M55_REPORT_CHAPTERS.map((c) => c.titleJa),
    compactDifference: {
      headingJa: '2つの違いは、追加で読み解けるテーマ数だけ',
      light: {
        nameJa: lightProduct.publicName,
        priceLabelJa: formatYenLabelJa(lightPriceJpy),
        differenceJa: '追加で読み解けるテーマ 1件',
      },
      full: {
        nameJa: fullProduct.publicName,
        priceLabelJa: formatYenLabelJa(fullPriceJpy),
        differenceJa: '追加で読み解けるテーマ 合計5件',
      },
      sharedJa: 'プレミアムレポートの内容は共通です。どちらも買い切りで、自動更新はありません。',
    },
    oneTimeLabelJa: '買い切り・自動更新なし',
    includedHeadingJa: '含まれる内容',
    consultReplyLabelJa: '追加読み解き',
    selectLightCtaJa: 'ライトを選ぶ',
    selectFullCtaJa: 'フルを選ぶ',
    checkoutProceedCtaJa: '支払い画面へ進む',
  };
}

export function formatAdditionalReadingsJa(count: number): string {
  return count === 1 ? '1件' : `合計${count}件`;
}

export function buildIncludedProductSummaryJa(tier: PlanComparisonTier): string {
  return tier.includedItemsJa.join(' / ');
}

/** Singleton for stable reference in UI layers. */
export const PLAN_COMPARISON = buildPlanComparisonModel();
