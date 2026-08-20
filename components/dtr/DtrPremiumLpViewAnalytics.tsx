'use client';

import { useEffect } from 'react';
import {
  consumeFreeResultPremiumLpEntry,
} from '../../lib/m55/analytics/freeResultPremiumLpEntry';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';

/**
 * One-shot /dtr/lp successful client render metric.
 * Consumes Free→LP sessionStorage marker when present.
 */
export default function DtrPremiumLpViewAnalytics() {
  useEffect(() => {
    const fromFree = consumeFreeResultPremiumLpEntry();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumLpViewed,
      'dtr_premium_lp',
      'dtr-premium-lp-viewed',
      fromFree ? { entrySource: 'free_result' } : undefined,
    );
  }, []);

  return null;
}
