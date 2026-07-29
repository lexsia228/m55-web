'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { buildPremiumBridgeTitle, STATIC_FREE_TO_PAID_BRIDGE } from './corePublicCopy';
import PremiumExperienceSurface from '../experience/PremiumExperienceSurface';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  traitName: string;
};

/**
 * Free→Premium bridge — one personalized intro, primary CTA, then /dtr/lp questions.
 */
export default function CoreFreeToPaidConversionBridge({ depth, traitName }: Props) {
  const titleId = useId();
  const copy = STATIC_FREE_TO_PAID_BRIDGE;
  const href = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;
  const lockedHeadings = depth.premiumLockedHeadingsJa.slice(0, 2);

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
    trackFunnelAction(M55_FUNNEL_EVENTS.premiumCtaClicked, 'core_paid_bridge');
  }

  function handleSecondaryClick() {
    trackFunnelAction(M55_FUNNEL_EVENTS.paidBridgeContinueFreeClick, 'core_paid_bridge');
    const target = document.getElementById('core-scenes');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <PremiumExperienceSurface
      stateId="premium.core.bridge"
      variant="editorial_stage"
      surface="bridge"
      testId="m55-premium-experience-bridge"
    >
      <section
        id="core-paid"
        className={`${styles.conversionBridge} ${styles.coreSectionSurface} m55-premium-editorial-sheet`}
        aria-labelledby={titleId}
        data-testid="m55-free-to-paid-bridge"
      >
        <span className={`${styles.conversionBridgeOverline} m55-premium-overline`}>{copy.overline}</span>
        <h2
          id={titleId}
          className={`${styles.conversionBridgeTitle} m55-premium-display`}
          data-testid="m55-premium-bridge-headline"
        >
          {buildPremiumBridgeTitle(traitName)}
        </h2>
        <p
          className={`${styles.conversionBridgeSupporting} m55-premium-body`}
          data-testid="m55-premium-bridge-copy"
        >
          {copy.supportingJa}
        </p>

      <h3 className={styles.conversionBridgeChaptersHeading}>{copy.lockedHeadingsHeadingJa}</h3>
      <ul className={styles.bridgeLockedHeadingsList} data-testid="m55-premium-locked-headings">
        {lockedHeadings.map((heading) => (
          <li key={heading} className={styles.bridgeLockedHeadingItem}>
            <span className={styles.bridgeLockedHeadingIcon} aria-hidden>
              ◆
            </span>
            <span>{heading}</span>
          </li>
        ))}
      </ul>

      <p className={styles.conversionBridgeEffort}>{copy.effortJa}</p>

      <div className={styles.conversionBridgeActions} data-m55-print-hide>
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

      <p className={styles.conversionBridgeSafety}>{copy.safetyNote}</p>
      </section>
    </PremiumExperienceSurface>
  );
}
