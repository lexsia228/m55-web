'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
 * Persistent Premium CTA after free result — hides when in-page bridge or footer is in view.
 * Routes to paid-question flow, not checkout.
 */
export default function CorePremiumStickyCta({ visible }: Props) {
  const href = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;
  const barRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(true);

  useEffect(() => {
    if (!visible) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumCtaViewed,
      'core_paid_bridge',
      'core-premium-sticky-view',
    );
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const bridge = document.getElementById('core-paid');
    const footer =
      document.querySelector('[data-m55-public-shell] footer') ??
      document.querySelector('footer');

    const targets = [bridge, footer].filter(Boolean) as Element[];
    if (targets.length === 0) {
      setDocked(true);
      return;
    }

    const visibleSet = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleSet.add(entry.target);
          else visibleSet.delete(entry.target);
        }
        setDocked(visibleSet.size === 0);
      },
      { root: null, threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    const page = document.querySelector('[data-testid="m55-core-essence"]');
    if (!(page instanceof HTMLElement)) return;
    if (visible && docked) {
      page.setAttribute('data-m55-sticky-cta', '1');
      document.documentElement.setAttribute('data-m55-sticky-cta', '1');
    } else {
      page.removeAttribute('data-m55-sticky-cta');
      document.documentElement.removeAttribute('data-m55-sticky-cta');
    }
    return () => {
      page.removeAttribute('data-m55-sticky-cta');
      document.documentElement.removeAttribute('data-m55-sticky-cta');
    };
  }, [visible, docked]);

  if (!visible || !docked) return null;

  return (
    <div
      ref={barRef}
      className={styles.premiumStickyBar}
      data-testid="m55-premium-sticky-cta"
      data-m55-print-hide
      role="region"
      aria-label="プレミアム"
    >
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
