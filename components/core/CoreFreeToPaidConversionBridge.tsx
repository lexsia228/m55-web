'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import {
  getCommercialProduct,
  M55_REPORT_CHAPTERS,
} from '../../lib/m55/contracts/m55CommercialFunnelContract';
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

function formatPriceLabelJa(priceJpy: number): string {
  return `¥${priceJpy.toLocaleString('ja-JP')}（税込）`;
}

/**
 * Single free→paid conversion bridge.
 * Outcome → free/Premium → preview → plan cards (price inside) → CTA → chapters.
 */
export default function CoreFreeToPaidConversionBridge() {
  const titleId = useId();
  const copy = STATIC_FREE_TO_PAID_BRIDGE;
  const light = getCommercialProduct('selfPremiumLight');
  const full = getCommercialProduct('selfPremiumFull');
  const href = TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref;

  const lightPriceJpy = light.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.light.priceYen;
  const fullPriceJpy = full.priceJpy ?? PAID_DTR_SAVED_REPORT_PRICING.full.priceYen;

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

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.freeVsPremiumHeadingJa}</h3>
      <div className={styles.conversionBridgeLayers}>
        <div className={styles.conversionBridgeLayer}>
          <h3 className={styles.conversionBridgeLayerLabel}>{copy.freeLayerLabelJa}</h3>
          <p className={styles.conversionBridgeLayerBody}>{copy.freeLayerBodyJa}</p>
        </div>
        <div className={styles.conversionBridgeLayer}>
          <h3 className={styles.conversionBridgeLayerLabel}>{copy.savedLayerLabelJa}</h3>
          <p className={styles.conversionBridgeLayerBody}>{copy.savedLayerBodyJa}</p>
        </div>
      </div>

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.outcomeHeadingJa}</h3>
      <ul className={styles.conversionBridgeChapters}>
        {copy.outcomesJa.map((line) => (
          <li key={line} className={styles.conversionBridgeChapterItem}>
            <span className={styles.conversionBridgeChapterTitle}>{line}</span>
          </li>
        ))}
      </ul>

      <CorePremiumReportPreviewSlice
        headingJa={copy.previewHeadingJa}
        bodyJa={copy.previewBodyJa}
      />

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.planDiffHeadingJa}</h3>
      <div className={styles.conversionBridgePlanGrid}>
        <article className={styles.conversionBridgePlanCard} data-testid="m55-plan-card-light">
          <h3 className={styles.conversionBridgePlanName}>{light.publicName}</h3>
          <p className={styles.conversionBridgePlanAudience}>{copy.lightAudienceJa}</p>
          <p className={styles.conversionBridgePlanPrice}>{formatPriceLabelJa(lightPriceJpy)}</p>
          <p className={styles.conversionBridgeLayerBody}>{copy.lightPlanBodyJa}</p>
        </article>
        <article className={styles.conversionBridgePlanCard} data-testid="m55-plan-card-full">
          <h3 className={styles.conversionBridgePlanName}>{full.publicName}</h3>
          <p className={styles.conversionBridgePlanAudience}>{copy.fullAudienceJa}</p>
          <p className={styles.conversionBridgePlanPrice}>{formatPriceLabelJa(fullPriceJpy)}</p>
          <p className={styles.conversionBridgeLayerBody}>{copy.fullPlanBodyJa}</p>
        </article>
      </div>

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
