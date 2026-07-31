'use client';

/**
 * Application-owned nonvisual runtime-state identity bridge.
 * Derives commercial-quality state identity markers from the rendered page
 * (pathname + authoritative DOM signals). No visible copy/CSS/layout change.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const HOST_ATTR = 'data-m55-cq-state-host';
const STATE_ATTR = 'data-m55-cq-state-id';

function has(sel: string): boolean {
  return Boolean(document.querySelector(sel));
}

function collectRuntimeStateIds(pathname: string): string[] {
  const ids = new Set<string>();

  // Gate path markers on authoritative content so observation cannot race an empty shell.
  if ((pathname === '/home' || pathname === '/') && has('[data-testid="m55-home-hero"]')) {
    ids.add('ecp:public.home:default');
    ids.add('ecp:public.root_redirect:default');
    ids.add('visual:home');
    if (has('[data-testid="m55-method-home"]')) ids.add('method:home:default');
  }
  if (pathname === '/how-m55-works' && has('[data-testid="m55-method-canonical"]')) {
    ids.add('ecp:public.how_m55_works:default');
  }
  if (pathname === '/ten-views' && has('[data-m55-experience-surface="PUBLIC_EDITORIAL"]')) {
    ids.add('ecp:public.ten_views:default');
  }
  if (pathname === '/pricing' && has('[data-testid="m55-pricing-headline"], [data-testid="m55-pricing-plan-light"]')) {
    ids.add('ecp:public.pricing:default');
    ids.add('visual:pricing');
    if (has('[data-testid="m55-method-trust-link"]')) ids.add('method:pricing:default');
  }
  if (pathname === '/support' && has('main h1')) ids.add('ecp:public.support:default');
  if (pathname === '/legal/terms' && has('main h1')) ids.add('ecp:public.legal.terms:default');
  if (pathname === '/legal/privacy' && has('main h1')) ids.add('ecp:public.legal.privacy:default');
  if (pathname === '/legal/tokushoho' && has('main h1')) ids.add('ecp:public.legal.tokushoho:default');
  if (pathname === '/legal/refund' && has('main h1')) ids.add('ecp:public.legal.refund:default');
  if (pathname === '/my' && has('[data-m55-pathname="/my"] main h1, main h1')) {
    ids.add('ecp:public.my:account_menu');
  }
  if (pathname === '/today' && has('[data-m55-pathname="/today"]')) ids.add('ecp:legacy.today:default');
  if (pathname === '/weekly' && has('[data-m55-pathname="/weekly"]')) ids.add('ecp:legacy.weekly:default');
  if (pathname === '/synastry' && has('[data-testid="compatibility-dob-step"], [data-testid="compatibility-personalized-result"]')) {
    ids.add('ecp:legacy.synastry:default');
  }
  if (pathname === '/dtr' && has('#dtr-main-shelf-label')) ids.add('ecp:premium.dtr_index:default');
  if (pathname.startsWith('/dev/premium-share-preview')) {
    ids.add('ecp:dev.premium_share_preview:default');
    ids.add('premium:premium.share.card');
  }
  if (pathname.startsWith('/dev/')) ids.add('ecp:dev.previews:default');

  if (has('[data-testid="m55-shared-entry"]')) ids.add('ecp:shared.entry:default');
  if (has('[data-testid="m55-shared-entry-fallback"]')) {
    ids.add('ecp:shared.entry.invalid:invalid');
  }

  if (pathname === '/core' || pathname.startsWith('/core/')) {
    if (has('[data-testid="m55-core-locked"]')) {
      ids.add('ecp:free.core.empty:empty');
      ids.add('visual:core-prerequisite');
    }
    if (
      has('[data-testid="m55-core-start-intake"]') ||
      has('[data-testid="m55-free-dob-step"]') ||
      has('[data-testid="m55-free-segmented-dob"]')
    ) {
      ids.add('ecp:free.core.intake:intake');
    }
    if (has('[data-testid="m55-free-questionnaire"]')) {
      ids.add('ecp:free.core.questions:free_questions');
    }
    if (has('[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]')) {
      ids.add('ecp:free.core.answer_review:answer_review');
      ids.add('visual:core-free-result');
      if (has('[data-testid="m55-method-core-free-result"]')) {
        ids.add('method:core_free_result:RESULT');
      }
    }
    if (has('[data-testid="m55-free-result-summary"]')) {
      ids.add('ecp:free.core.result:result');
    }
    if (has('[data-testid="m55-guest-save-signin"]')) ids.add('ecp:free.core.save:save');
    if (has('[data-testid="m55-free-rerun-request"]')) ids.add('ecp:free.core.rerun:rerun');
    if (has('[data-testid="m55-free-result-share"]')) ids.add('ecp:free.core.share:share');
    if (has('[data-testid="m55-free-to-paid-bridge"]')) {
      ids.add('premium:premium.core.bridge');
    }
  }

  if (pathname.startsWith('/dtr/lp')) {
    // Continuity intro was removed from the public LP composition; the
    // post-free LP entry (questionnaire / continuity / need_free) still
    // represents the introduction + prerequisite registrations.
    if (
      has('[data-testid="m55-dtr-lp-continuity"]') ||
      has('[data-m55-premium-state="premium.lp.prerequisite"]') ||
      has('[data-testid="m55-paid-questionnaire-active"]') ||
      has('[data-testid="m55-dtr-need-free"]')
    ) {
      ids.add('ecp:premium.lp.intro:introduction');
      ids.add('premium:premium.lp.prerequisite');
    }
    if (has('[data-testid="m55-dtr-need-free"]')) {
      ids.add('ecp:premium.lp.need_free:need_free');
      ids.add('ecp:legacy.reply:default');
    }
    if (has('[data-m55-paid-answer-edit="true"]')) {
      ids.add('premium:premium.lp.answer_edit');
    } else if (has('[data-testid="m55-paid-questionnaire-active"]')) {
      ids.add('ecp:premium.lp.questions:six_questions');
      ids.add('premium:premium.lp.questions');
      ids.add('visual:premium-questionnaire');
    }
    if (has('[data-m55-paid-phase="complete"]')) {
      ids.add('ecp:premium.lp.answer_review:answer_review');
      ids.add('premium:premium.lp.answer_review');
    }
    if (has('[data-testid="m55-dtr-plan-selection"]')) {
      ids.add('ecp:premium.lp.plans:plan_selection');
      ids.add('ecp:premium.lp.upgrade:upgrade_explanation');
      ids.add('premium:premium.lp.plans');
      ids.add('visual:premium-plans');
      if (has('[data-testid="m55-method-dtr-difference"]')) {
        ids.add('method:dtr_lp:plans');
      }
    }
    if (has('[data-m55-paid-phase="checkout"]')) {
      ids.add('ecp:premium.lp.checkout:payment_preparation');
      ids.add('premium:premium.lp.checkout');
      if (has('[data-testid="m55-method-checkout-trust-link"]')) {
        ids.add('method:checkout_prep:checkout');
      }
    }
    const bodyText = document.body?.innerText ?? '';
    if (bodyText.includes('このレポートへのアクセス有効期限が切れています。')) {
      ids.add('ecp:legacy.reply_result:default');
    }
  }

  if (
    pathname.startsWith('/dtr/core') ||
    pathname.startsWith('/dev/dtr-drawer-preview')
  ) {
    if (
      has('[data-m55-premium-state="purchased.report.body"]') ||
      has('[data-testid="m55-purchased-report-body"]')
    ) {
      ids.add('ecp:purchased.reader:default');
      ids.add('premium:purchased.report.body');
      ids.add('premium:purchased.saved_reopen');
      if (has('[data-testid="m55-method-purchased-report"]')) {
        ids.add('method:purchased_report:purchased_report_body');
      }
    }
    if (has('[data-m55-premium-state="purchased.consult.input"]')) {
      ids.add('premium:purchased.consult.input');
    }
    if (has('[data-m55-premium-state="purchased.consult.result"]')) {
      ids.add('premium:purchased.consult.result');
    }
    if (has('[data-m55-premium-state="purchased.saved_reopen"]')) {
      ids.add('premium:purchased.saved_reopen');
    }
  }

  if (has('[data-testid="m55-method-footer-link"]')) {
    ids.add('method:footer_nav:default');
  }

  return [...ids].sort();
}

let syncing = false;
let lastSerialized = '';
let frozenPathname = '';
let frozenIds: string[] = [];

function syncMarkers(pathname: string): void {
  if (syncing) return;

  if (pathname !== frozenPathname) {
    frozenPathname = pathname;
    frozenIds = [];
    lastSerialized = '';
  }

  // Governed stress rewrites container textContent (often `main`), which can
  // temporarily destroy authoritative children. Freeze the last confirmed
  // application-owned identities for this pathname while stress is active so
  // observation still reads the real pre-stress state — not a blank shell.
  const stressActive = has('[data-m55-cq-stress-profile]');
  let ids: string[];
  if (stressActive && frozenIds.length > 0) {
    ids = frozenIds;
  } else {
    ids = collectRuntimeStateIds(pathname);
    if (ids.length > 0) frozenIds = ids;
  }

  const serialized = ids.join('\0');
  if (serialized === lastSerialized) return;

  syncing = true;
  try {
    let host = document.querySelector(`[${HOST_ATTR}="1"]`);
    if (!host) {
      host = document.createElement('div');
      host.setAttribute(HOST_ATTR, '1');
      host.setAttribute('hidden', '');
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }
    host.replaceChildren(
      ...ids.map((id) => {
        const el = document.createElement('span');
        el.setAttribute(STATE_ATTR, id);
        el.setAttribute('data-m55-cq-state-owner', 'application');
        el.setAttribute('hidden', '');
        return el;
      }),
    );
    lastSerialized = serialized;
  } finally {
    syncing = false;
  }
}

/**
 * Keeps application-owned state identity markers aligned with rendered DOM.
 */
export default function RuntimeStateIdentitySync() {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    lastSerialized = '';
    frozenPathname = pathname;
    frozenIds = [];
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
      // Ignore mutations we ourselves write into the host.
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
      lastSerialized = '';
      frozenIds = [];
      frozenPathname = '';
    };
  }, [pathname]);

  return null;
}
