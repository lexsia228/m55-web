'use client';

/**
 * Application-owned nonvisual canonical presentation-state identity bridge.
 * Emits exactly one canonical observable state identity derived from the
 * rendered page (pathname + authoritative DOM). No visible copy/CSS/layout.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const HOST_ATTR = 'data-m55-cq-state-host';
const STATE_ATTR = 'data-m55-cq-state-id';

function has(sel: string): boolean {
  return Boolean(document.querySelector(sel));
}

/**
 * Derive the single canonical presentation state for the current render.
 * Most-specific product state wins; aliases are never emitted.
 */
function deriveCanonicalObservableStateId(pathname: string): string | null {
  if (has('[data-testid="m55-shared-entry-fallback"]')) {
    return 'ecp:shared.entry.invalid:invalid';
  }
  if (has('[data-testid="m55-shared-entry"]')) {
    return 'ecp:shared.entry:default';
  }

  if (pathname === '/core' || pathname.startsWith('/core/')) {
    // RESULT presentation (answer_review + summary/share/save/bridge sections).
    if (
      has('[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]') ||
      has('[data-testid="m55-free-result-summary"]') ||
      has('[data-testid="m55-free-result-share"]') ||
      has('[data-testid="m55-guest-save-signin"]') ||
      has('[data-testid="m55-free-rerun-request"]') ||
      has('[data-testid="m55-free-to-paid-bridge"]')
    ) {
      return 'ecp:free.core.answer_review:answer_review';
    }
    if (has('[data-testid="m55-free-questionnaire"]')) {
      return 'ecp:free.core.questions:free_questions';
    }
    // Overlay-only edit/intake layers. Do not treat generic segmented DOB as
    // intake — it also lives on the first-visit empty profile card.
    if (
      has('[data-testid="m55-core-birth-intake-layer"]') ||
      has('[data-testid="m55-core-profile-edit-layer"]') ||
      has('[data-testid="m55-birth-intake-start"]')
    ) {
      return 'ecp:free.core.intake:intake';
    }
    if (
      has('[data-testid="m55-core-profile-intake"]') ||
      has('[data-testid="m55-core-prerequisite-headline"]') ||
      has('[data-testid="m55-core-locked"]')
    ) {
      return 'ecp:free.core.empty:empty';
    }
  }

  if (pathname.startsWith('/dtr/lp')) {
    const bodyText = document.body?.innerText ?? '';
    if (bodyText.includes('このレポートへのアクセス有効期限が切れています。')) {
      return 'ecp:legacy.reply_result:default';
    }
    if (has('[data-m55-paid-phase="checkout"]')) {
      return 'ecp:premium.lp.checkout:payment_preparation';
    }
    if (has('[data-testid="m55-dtr-plan-selection"]')) {
      return 'ecp:premium.lp.plans:plan_selection';
    }
    if (has('[data-m55-paid-phase="complete"]')) {
      return 'ecp:premium.lp.answer_review:answer_review';
    }
    if (has('[data-m55-paid-answer-edit="true"]')) {
      return 'premium:premium.lp.answer_edit';
    }
    if (has('[data-testid="m55-paid-questionnaire-active"]')) {
      return 'ecp:premium.lp.questions:six_questions';
    }
    if (has('[data-testid="m55-dtr-need-free"]')) {
      return 'ecp:premium.lp.need_free:need_free';
    }
    if (
      has('[data-testid="m55-dtr-lp-continuity"]') ||
      has('[data-m55-premium-state="premium.lp.prerequisite"]')
    ) {
      return 'ecp:premium.lp.intro:introduction';
    }
  }

  if (
    pathname.startsWith('/dtr/core') ||
    pathname.startsWith('/dev/dtr-drawer-preview')
  ) {
    if (has('[data-m55-premium-state="purchased.consult.result"]')) {
      return 'premium:purchased.consult.result';
    }
    if (has('[data-m55-premium-state="purchased.consult.input"]')) {
      return 'premium:purchased.consult.input';
    }
    // Purchased report body presentation (reader / report.body / saved_reopen share it).
    if (has('[data-testid="m55-purchased-report-body"]')) {
      return 'ecp:purchased.reader:default';
    }
    if (pathname.startsWith('/dev/dtr-drawer-preview')) {
      return 'ecp:dev.previews:default';
    }
    if (has('[data-m55-premium-state="purchased.saved_reopen"]')) {
      return 'premium:purchased.saved_reopen';
    }
  }

  if (pathname.startsWith('/dev/premium-share-preview')) {
    return 'ecp:dev.premium_share_preview:default';
  }
  if (pathname.startsWith('/dev/')) {
    return 'ecp:dev.previews:default';
  }

  if ((pathname === '/home' || pathname === '/') && has('[data-testid="m55-home-hero"]')) {
    return 'ecp:public.home:default';
  }
  if (pathname === '/how-m55-works' && has('[data-testid="m55-method-canonical"]')) {
    return 'ecp:public.how_m55_works:default';
  }
  if (pathname === '/ten-views' && has('[data-m55-experience-surface="PUBLIC_EDITORIAL"]')) {
    return 'ecp:public.ten_views:default';
  }
  if (
    pathname === '/pricing' &&
    has('[data-testid="m55-pricing-headline"], [data-testid="m55-pricing-plan-light"]')
  ) {
    return 'ecp:public.pricing:default';
  }
  if (pathname === '/support' && has('main h1')) return 'ecp:public.support:default';
  if (pathname === '/legal/terms' && has('main h1')) return 'ecp:public.legal.terms:default';
  if (pathname === '/legal/privacy' && has('main h1')) {
    return 'ecp:public.legal.privacy:default';
  }
  if (pathname === '/legal/tokushoho' && has('main h1')) {
    return 'ecp:public.legal.tokushoho:default';
  }
  if (pathname === '/legal/refund' && has('main h1')) return 'ecp:public.legal.refund:default';
  if (pathname === '/my' && has('[data-m55-pathname="/my"] main h1, main h1')) {
    return 'ecp:public.my:account_menu';
  }
  if (pathname === '/today' && has('[data-m55-pathname="/today"]')) {
    return 'ecp:legacy.today:default';
  }
  if (pathname === '/weekly' && has('[data-m55-pathname="/weekly"]')) {
    return 'ecp:legacy.weekly:default';
  }
  if (
    pathname === '/synastry' &&
    has(
      '[data-testid="compatibility-dob-step"], [data-testid="compatibility-personalized-result"]',
    )
  ) {
    return 'ecp:legacy.synastry:default';
  }
  if (pathname === '/dtr' && has('#dtr-main-shelf-label')) {
    return 'ecp:premium.dtr_index:default';
  }

  return null;
}

let syncing = false;
let lastCanonical: string | null = null;
let frozenPathname = '';
let frozenCanonical: string | null = null;

function ensureHost(): Element {
  let host = document.querySelector(`[${HOST_ATTR}="1"]`);
  if (!host) {
    host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '1');
    host.setAttribute('hidden', '');
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
  }
  return host;
}

function syncMarkers(pathname: string): void {
  if (syncing) return;

  if (pathname !== frozenPathname) {
    frozenPathname = pathname;
    frozenCanonical = null;
    lastCanonical = null;
  }

  const stressActive = has('[data-m55-cq-stress-profile]');
  let canonical: string | null;
  if (stressActive && frozenCanonical) {
    canonical = frozenCanonical;
  } else {
    canonical = deriveCanonicalObservableStateId(pathname);
    if (canonical) frozenCanonical = canonical;
  }

  if (!canonical) {
    // Content not ready — leave any prior host for this pathname unset.
    if (lastCanonical !== null) {
      document.querySelector(`[${HOST_ATTR}="1"]`)?.remove();
      lastCanonical = null;
    }
    return;
  }

  const host = ensureHost();
  const current = host.querySelector(`[${STATE_ATTR}]`)?.getAttribute(STATE_ATTR) ?? null;
  if (current === canonical && lastCanonical === canonical) {
    // Enforce single identity: remove any stray application markers outside host.
    document.querySelectorAll(`[${STATE_ATTR}][data-m55-cq-state-owner="application"]`).forEach((node) => {
      if (!host.contains(node)) node.remove();
    });
    return;
  }

  syncing = true;
  try {
    host.replaceChildren();
    const el = document.createElement('span');
    el.setAttribute(STATE_ATTR, canonical);
    el.setAttribute('data-m55-cq-state-owner', 'application');
    el.setAttribute('hidden', '');
    host.appendChild(el);
    // Remove stray application identities outside the host (stale route leftovers).
    document.querySelectorAll(`[${STATE_ATTR}][data-m55-cq-state-owner="application"]`).forEach((node) => {
      if (!host.contains(node)) node.remove();
    });
    lastCanonical = canonical;
  } finally {
    syncing = false;
  }
}

/**
 * Keeps exactly one application-owned canonical state identity aligned with DOM.
 */
export default function RuntimeStateIdentitySync() {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    lastCanonical = null;
    frozenPathname = pathname;
    frozenCanonical = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        syncMarkers(pathname);
      }, 50);
    };

    schedule();
    const observer = new MutationObserver((mutations) => {
      if (
        mutations.every(
          (m) =>
            (m.target instanceof Element && m.target.closest(`[${HOST_ATTR}="1"]`)) ||
            (m.target instanceof Element && m.target.getAttribute?.(HOST_ATTR) === '1'),
        )
      ) {
        return;
      }
      schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'data-testid',
        'data-m55-ux-phase',
        'data-m55-paid-phase',
        'data-m55-premium-state',
        'data-m55-paid-answer-edit',
        'data-m55-cq-stress-profile',
      ],
    });
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
      document.querySelector(`[${HOST_ATTR}="1"]`)?.remove();
      lastCanonical = null;
      frozenCanonical = null;
      frozenPathname = '';
    };
  }, [pathname]);

  return null;
}
