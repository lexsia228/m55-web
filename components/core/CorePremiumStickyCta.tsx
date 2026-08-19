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

function useDesktopViewport(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

/**
 * Mobile-only sticky Premium CTA after free result.
 * Desktop uses inline bridge only — no fixed bar over content.
 */
export default function CorePremiumStickyCta({ visible }: Props) {
  const isDesktop = useDesktopViewport();
  const href = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;
  const barRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(true);
  const stickyEnabled = visible && !isDesktop;

  useEffect(() => {
    if (!stickyEnabled) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumCtaViewed,
      'core_paid_bridge',
      'core-premium-sticky-view',
    );
  }, [stickyEnabled]);

  useEffect(() => {
    if (!stickyEnabled) return;

    const bridge = document.getElementById('core-paid');
    const footer =
      document.querySelector('[data-m55-public-shell] footer') ??
      document.querySelector('footer');

    const share = document.getElementById('core-share');
    const pairCrossSell = document.querySelector('[data-testid="m55-core-pair-cross-sell"]');
    const targets = [bridge, footer, share, pairCrossSell].filter(Boolean) as Element[];
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
  }, [stickyEnabled]);

  useLayoutEffect(() => {
    if (!stickyEnabled || !docked) {
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
  }, [stickyEnabled, docked]);

  if (!stickyEnabled || !docked) return null;

  return (
    <div
      ref={barRef}
      className={styles.premiumStickyBar}
      data-testid="m55-premium-sticky-cta"
      data-m55-desktop-disabled={isDesktop ? 'true' : 'false'}
      data-m55-print-hide
      role="region"
      aria-label={T.premiumProduct}
    >
      <p className={styles.premiumStickyLead}>
        {STATIC_FREE_TO_PAID_BRIDGE.overline}
        <span className={styles.premiumStickyLeadHint}>{STATIC_FREE_TO_PAID_BRIDGE.stickyLeadHintJa}</span>
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
