'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import {
  getCommercialProduct,
  M55_REPORT_CHAPTERS,
} from '../../lib/m55/contracts/m55CommercialFunnelContract';
import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../../lib/m55/paidDtrProductCopy';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { STATIC_FREE_TO_PAID_BRIDGE } from './corePublicCopy';
import CorePremiumReportPreviewSlice from './CorePremiumReportPreviewSlice';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
};

function formatPriceLabelJa(priceJpy: number): string {
  return `¥${priceJpy.toLocaleString('ja-JP')}（税込）`;
}

/**
 * Free→Premium bridge — open loop, personalized preview, early CTA, then plans.
 */
export default function CoreFreeToPaidConversionBridge({ depth }: Props) {
  const titleId = useId();
  const copy = STATIC_FREE_TO_PAID_BRIDGE;
  const light = getCommercialProduct('selfPremiumLight');
  const full = getCommercialProduct('selfPremiumFull');
  const href = TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref;

  const lightPriceJpy = light.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.light.priceYen;
  const fullPriceJpy = full.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.full.priceYen;
  const upgradeDelta = fullPriceJpy - lightPriceJpy;

  const chapterRows = M55_REPORT_CHAPTERS.map((chapter, index) => {
    const fallback = copy.chapters[index];
    const titleJa =
      chapter.titleJa.replace(/^[ⅠⅡⅢⅣ]\s*/, '') || fallback?.titleJa || chapter.titleJa;
    const roman = fallback?.roman ?? ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][index]!;
    return { roman, titleJa };
  });

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidBridgeView,
      'core_paid_bridge',
      'core-paid-bridge-view',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumBridgeViewed,
      'core_paid_bridge',
      'core-premium-bridge-viewed',
    );
  }, []);

  function handlePrimaryClick() {
    trackFunnelAction(M55_FUNNEL_EVENTS.paidBridgePrimaryClick, 'core_paid_bridge');
  }

  function handleSecondaryClick() {
    trackFunnelAction(M55_FUNNEL_EVENTS.paidBridgeContinueFreeClick, 'core_paid_bridge');
    const target = document.getElementById('core-scenes');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section
      id="core-paid"
      className={`${styles.conversionBridge} ${styles.coreSectionSurface}`}
      aria-labelledby={titleId}
      data-testid="m55-free-to-paid-bridge"
    >
      <span className={styles.conversionBridgeOverline}>{copy.overline}</span>
      <h2 id={titleId} className={styles.conversionBridgeTitle}>
        {copy.title}
      </h2>
      <p className={styles.conversionBridgeSupporting}>{copy.supportingJa}</p>

      <CorePremiumReportPreviewSlice
        headingJa={copy.previewHeadingJa}
        bodyJa={copy.previewBodyJa}
        lockedHeadingsJa={depth.premiumLockedHeadingsJa}
        openLoopJa={depth.premiumOpenLoopJa}
      />

      <div className={styles.conversionBridgeActions}>
        <div className={styles.conversionBridgeCtaBlock}>
          <Link
            href={href}
            className={styles.conversionBridgePrimary}
            data-testid="m55-paid-bridge-primary"
            onClick={handlePrimaryClick}
          >
            {copy.primaryCtaJa}
          </Link>
          <p className={styles.conversionBridgeCtaSupport}>{copy.ctaSupportJa}</p>
        </div>
        <button
          type="button"
          className={styles.conversionBridgeSecondary}
          data-testid="m55-paid-bridge-secondary"
          onClick={handleSecondaryClick}
        >
          {copy.secondaryCtaJa}
        </button>
      </div>

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.outcomeHeadingJa}</h3>
      <ul className={styles.conversionBridgeChapters}>
        {copy.outcomesJa.map((line) => (
          <li key={line} className={styles.conversionBridgeChapterItem}>
            <span className={styles.conversionBridgeChapterTitle}>{line}</span>
          </li>
        ))}
      </ul>

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.planDiffHeadingJa}</h3>
      <p className={styles.conversionBridgeOneTimeNote}>{copy.oneTimePurchaseNoteJa}</p>
      <div className={styles.conversionBridgePlanGrid}>
        <article className={styles.conversionBridgePlanCard} data-testid="m55-plan-card-light">
          <h3 className={styles.conversionBridgePlanName}>{light.publicName}</h3>
          <p className={styles.conversionBridgePlanAudience}>{copy.lightAudienceJa}</p>
          <p className={styles.conversionBridgePlanPrice}>{formatPriceLabelJa(lightPriceJpy)}</p>
          <p className={styles.conversionBridgeLayerBody}>{copy.lightPlanBodyJa}</p>
        </article>
        <article
          className={`${styles.conversionBridgePlanCard} ${styles.conversionBridgePlanCardFeatured}`}
          data-testid="m55-plan-card-full"
        >
          <span className={styles.conversionBridgePlanBadge}>{copy.fullRecommendBadgeJa}</span>
          <h3 className={styles.conversionBridgePlanName}>{full.publicName}</h3>
          <p className={styles.conversionBridgePlanAudience}>{copy.fullAudienceJa}</p>
          <p className={styles.conversionBridgePlanPrice}>{formatPriceLabelJa(fullPriceJpy)}</p>
          <p className={styles.conversionBridgePlanUpgrade}>
            +¥{upgradeDelta.toLocaleString('ja-JP')}で追加読み解きが4件増える
          </p>
          <p className={styles.conversionBridgeLayerBody}>{copy.fullPlanBodyJa}</p>
        </article>
      </div>

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.chaptersHeadingJa}</h3>
      <ol className={styles.conversionBridgeChapters}>
        {chapterRows.map((chapter) => (
          <li key={chapter.roman} className={styles.conversionBridgeChapterItem}>
            <span className={styles.conversionBridgeChapterRoman}>{chapter.roman}</span>
            <span className={styles.conversionBridgeChapterTitle}>{chapter.titleJa}</span>
          </li>
        ))}
      </ol>

      <p className={styles.conversionBridgeSafety}>{copy.safetyNote}</p>
    </section>
  );
}
