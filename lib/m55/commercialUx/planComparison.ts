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
  bodyJa: string;
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
  fullRecommendReasonJa: string;
  upgradeNoteJa: string;
  chapterTitlesJa: readonly string[];
  /** Shared labels for plan selection / payment confirmation surfaces */
  oneTimeLabelJa: string;
  savedReportLabelJa: string;
  savedReportValueJa: string;
  consultReplyLabelJa: string;
  fullDeltaNoteJa: string;
  selectLightCtaJa: string;
  selectFullCtaJa: string;
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
      audienceJa: 'いちばん気になる1テーマを深めたい方へ',
      bodyJa: '4章のプレミアムレポート＋追加読み解き1件。ひとつの関心を丁寧に読み返せます。',
      additionalReadings: 1,
      isOneTime: true,
    },
    full: {
      key: 'full',
      publicName: fullProduct.publicName,
      priceJpy: fullPriceJpy,
      priceLabelJa: formatYenLabelJa(fullPriceJpy),
      audienceJa: '仕事・関係・日常をまとめて整理したい方へ',
      bodyJa: '4章のプレミアムレポート＋追加読み解き合計5件。複数の関心をまとめて読み返せます。',
      additionalReadings: 5,
      isOneTime: true,
    },
    upgradePriceJpy,
    upgradePriceLabelJa: formatYenLabelJa(upgradePriceJpy),
    priceDeltaJpy,
    additionalReadingsDelta: 4,
    lightThenUpgradeTotalJpy,
    fullInitialAdvantageJpy,
    oneTimeNoteJa: '買い切り・自動更新なし。同じ4章レポートが両プランに含まれます。',
    sameFourChaptersNoteJa: 'どちらも同じ4章のプレミアムレポートが含まれます。',
    fullRecommendReasonJa: '複数の関心をまとめて整理したい方へ',
    upgradeNoteJa: `ライト購入後も、${formatYenLabelJa(upgradePriceJpy)}でFULL化できます。後からアップグレードすると合計${formatYenLabelJa(lightThenUpgradeTotalJpy)}、最初からFULLなら${formatYenLabelJa(fullPriceJpy)}（${formatYenLabelJa(fullInitialAdvantageJpy)}お得）。`,
    chapterTitlesJa: M55_REPORT_CHAPTERS.map((c) => c.titleJa),
    oneTimeLabelJa: '一回払い',
    savedReportLabelJa: 'プレミアムレポート',
    savedReportValueJa: '4章のプレミアムレポート',
    consultReplyLabelJa: '追加読み解き',
    fullDeltaNoteJa: `+¥${priceDeltaJpy.toLocaleString('ja-JP')}で追加読み解きが${4}件増える`,
    selectLightCtaJa: 'ライトを選ぶ',
    selectFullCtaJa: 'FULLを選ぶ',
  };
}

export function formatAdditionalReadingsJa(count: number): string {
  return count === 1 ? '1件' : `合計${count}件`;
}

export function buildIncludedProductSummaryJa(tier: PlanComparisonTier): string {
  return `4章のプレミアムレポート + 追加読み解き${formatAdditionalReadingsJa(tier.additionalReadings)}`;
}

/** Singleton for stable reference in UI layers. */
export const PLAN_COMPARISON = buildPlanComparisonModel();
