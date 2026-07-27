'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { STATIC_FREE_TO_PAID_BRIDGE } from './corePublicCopy';
import styles from './CoreExperience.module.css';

type Props = {
  visible: boolean;
};

/**
 * Persistent Premium CTA after free result — routes to paid-question flow, not checkout.
 */
export default function CorePremiumStickyCta({ visible }: Props) {
  const href = TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref;

  useEffect(() => {
    if (!visible) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumCtaViewed,
      'core_paid_bridge',
      'core-premium-sticky-view',
    );
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={styles.premiumStickyBar} data-testid="m55-premium-sticky-cta" role="region" aria-label="プレミアム">
      <p className={styles.premiumStickyLead}>{STATIC_FREE_TO_PAID_BRIDGE.overline}</p>
      <Link
        href={href}
        className={styles.premiumStickyBtn}
        data-testid="m55-premium-sticky-link"
        onClick={() => {
          trackFunnelActionOnce(
            M55_FUNNEL_EVENTS.premiumCtaClicked,
            'core_paid_bridge',
            'core-premium-sticky-click',
          );
        }}
      >
        {STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa}
      </Link>
    </div>
  );
}
