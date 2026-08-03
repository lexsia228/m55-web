'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import { STATIC_FREE_TO_PAID_BRIDGE } from './corePublicCopy';
import styles from './CoreExperience.module.css';

type Props = {
  visible: boolean;
};

function setStickyHeightCss(px: number) {
  const page = document.querySelector('[data-testid="m55-core-essence"]');
  const value = `${Math.ceil(px)}px`;
  if (page instanceof HTMLElement) {
    page.style.setProperty('--m55-sticky-cta-height', value);
  }
  document.documentElement.style.setProperty('--m55-sticky-cta-height', value);
  document.documentElement.style.setProperty(
    '--m55-float-rail-offset',
    `calc(${value} + 0.75rem + env(safe-area-inset-bottom, 0px))`,
  );
}

function clearStickyHeightCss() {
  const page = document.querySelector('[data-testid="m55-core-essence"]');
  if (page instanceof HTMLElement) {
    page.style.removeProperty('--m55-sticky-cta-height');
    page.removeAttribute('data-m55-sticky-cta');
  }
  document.documentElement.style.removeProperty('--m55-sticky-cta-height');
  document.documentElement.style.removeProperty('--m55-float-rail-offset');
  document.documentElement.removeAttribute('data-m55-sticky-cta');
}

/**
 * Persistent Premium CTA after free result — hides when in-page bridge or footer is in view.
 * Height is measured (ResizeObserver); no single magic pixel reserve.
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
      { root: null, threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !docked) {
      clearStickyHeightCss();
      return;
    }
    const page = document.querySelector('[data-testid="m55-core-essence"]');
    if (page instanceof HTMLElement) {
      page.setAttribute('data-m55-sticky-cta', '1');
    }
    document.documentElement.setAttribute('data-m55-sticky-cta', '1');

    const bar = barRef.current;
    if (!bar) return;

    const measure = () => setStickyHeightCss(bar.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      clearStickyHeightCss();
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
      aria-label={T.premiumProduct}
    >
      <p className={styles.premiumStickyLead}>
        {STATIC_FREE_TO_PAID_BRIDGE.overline}
        <span className={styles.premiumStickyLeadHint}>プラン選択は次の画面</span>
      </p>
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
