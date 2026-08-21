'use client';

import { useEffect, useRef } from 'react';
import {
  consumeFreeResultPremiumLpEntry,
} from '../../lib/m55/analytics/freeResultPremiumLpEntry';
import { planPremiumLpViewedEmit } from '../../lib/m55/analytics/planPremiumLpViewedEmit';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
} from '../../lib/m55/privacySafeFunnelAnalytics';

/**
 * /dtr/lp successful client render metric — once per component mount.
 * Uses local Strict Mode guard only (no module-global impression key).
 * Consumes Free→LP sessionStorage marker when present.
 */
export default function DtrPremiumLpViewAnalytics() {
  const emittedRef = useRef(false);

  useEffect(() => {
    const plan = planPremiumLpViewedEmit({
      alreadyEmittedThisMount: emittedRef.current,
      consumeFreeMarker: consumeFreeResultPremiumLpEntry,
    });
    if (!plan.shouldEmit) return;
    emittedRef.current = true;
    trackFunnelAction(M55_FUNNEL_EVENTS.premiumLpViewed, 'dtr_premium_lp', plan.extras);
  }, []);

  return null;
}
