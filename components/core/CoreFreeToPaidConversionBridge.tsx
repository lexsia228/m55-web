'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import { PAID_DTR_SAVED_REPORT_PRICING } from '../../lib/m55/paidDtrProductCopy';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { STATIC_FREE_TO_PAID_BRIDGE } from './corePublicCopy';
import styles from './CoreExperience.module.css';

type Props = {
  focusThemeLabelJa?: string;
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}

/**
 * Single free→paid conversion bridge.
 * Replaces duplicate boundary + commercial CTA blocks.
 */
export default function CoreFreeToPaidConversionBridge({ focusThemeLabelJa }: Props) {
  const titleId = useId();
  const copy = STATIC_FREE_TO_PAID_BRIDGE;
  const pricing = PAID_DTR_SAVED_REPORT_PRICING;
  const href = TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref;

  const contextLine = focusThemeLabelJa?.trim()
    ? fillTemplate(copy.contextTemplateJa, { focusTheme: focusThemeLabelJa.trim() })
    : null;

  const priceNote = fillTemplate(copy.priceNoteTemplate, {
    lightPlanName: pricing.light.planNameJa,
    lightPriceLabel: pricing.light.priceLabelJa,
    fullPlanName: pricing.full.planNameJa,
    fullPriceLabel: pricing.full.priceLabelJa,
  });

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidBridgeView,
      'core_paid_bridge',
      'core-paid-bridge-view',
    );
  }, []);

  function handlePrimaryClick() {
    trackFunnelAction(M55_FUNNEL_EVENTS.paidBridgePrimaryClick, 'core_paid_bridge');
  }

  function handleSecondaryClick() {
    trackFunnelAction(M55_FUNNEL_EVENTS.paidBridgeContinueFreeClick, 'core_paid_bridge');
    const target = document.getElementById('core-daily');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section
      id="core-paid"
      className={`${styles.conversionBridge} ${styles.coreSectionSurface} ${styles.coreReveal}`}
      aria-labelledby={titleId}
      data-testid="m55-free-to-paid-bridge"
      data-core-reveal
    >
      <span className={styles.conversionBridgeOverline}>{copy.overline}</span>
      <h2 id={titleId} className={styles.conversionBridgeTitle}>
        {copy.title}
      </h2>

      {contextLine ? <p className={styles.conversionBridgeContext}>{contextLine}</p> : null}

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

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.chaptersHeadingJa}</h3>
      <ol className={styles.conversionBridgeChapters}>
        {copy.chapters.map((chapter) => (
          <li key={chapter.roman} className={styles.conversionBridgeChapterItem}>
            <span className={styles.conversionBridgeChapterRoman}>{chapter.roman}</span>
            <span className={styles.conversionBridgeChapterTitle}>{chapter.titleJa}</span>
          </li>
        ))}
      </ol>

      <p className={styles.conversionBridgePriceNote}>{priceNote}</p>

      <div className={styles.conversionBridgeActions}>
        <Link
          href={href}
          className={styles.conversionBridgePrimary}
          data-testid="m55-paid-bridge-primary"
          onClick={handlePrimaryClick}
        >
          {copy.primaryCtaJa}
        </Link>
        <button
          type="button"
          className={styles.conversionBridgeSecondary}
          data-testid="m55-paid-bridge-secondary"
          onClick={handleSecondaryClick}
        >
          {copy.secondaryCtaJa}
        </button>
      </div>

      <p className={styles.conversionBridgeSafety}>{copy.safetyNote}</p>
    </section>
  );
}
