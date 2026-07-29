/**
 * Clean capture environment for governed commercial / Premium evidence.
 *
 * Overlay root cause (PR #81 review):
 * - Clerk development keyless panel ("Configure your application") — third-party
 *   auth SDK UI, not an M55 application component.
 * - Next.js development indicator ("N") — next-dev tooling, not product UI.
 *
 * Capture profile:
 * 1. Suppress the Next.js indicator via capture-only CSS (init script)
 * 2. Soft-disable pointer-events on the Clerk keyless panel during interaction
 * 3. One-shot hide of the smallest matching keyless panel before governed capture
 * 4. Restore hidden nodes after capture so funnel navigation keeps working
 * 5. Assert overlay absence before every governed capture
 *
 * A continuous MutationObserver is intentionally NOT used — mutating Clerk's
 * React tree while it mounts can navigate the page to accounts.dev and destroy
 * the Playwright execution context.
 *
 * Browser helpers passed to page.evaluate must be self-contained (no outer refs).
 */
import { expect, type Page } from '@playwright/test';

/** Text that must never appear in a governed commercial capture. */
export const FORBIDDEN_DEV_OVERLAY_TEXTS = [
  'Configure your application',
  'Temporary API keys are enabled',
  'Access the dashboard to customize auth settings',
] as const;

/** Locators for Next.js / Clerk development chrome. */
export const FORBIDDEN_DEV_OVERLAY_LOCATORS = [
  'nextjs-portal',
  '[data-nextjs-toast]',
  '[data-next-badge-root]',
  '[data-next-mark]',
  '#__next-build-watcher',
  '[data-clerk-modal]',
  '.cl-modalBackdrop',
] as const;

function softDisableDevelopmentOverlaysBrowser(): number {
  const markers = ['Configure your application', 'Temporary API keys are enabled'] as const;
  const isKeyless = (el: Element) => {
    const style = window.getComputedStyle(el);
    const className = typeof el.className === 'string' ? el.className : '';
    const isFloating =
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      className.includes('cl-internal') ||
      className.includes('cl-');
    if (!isFloating) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return false;
    // Reject near-viewport shells; allow tall keyless cards (often >360px).
    if (rect.width > Math.min(520, window.innerWidth * 0.95)) return false;
    if (rect.height > window.innerHeight * 0.92) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 20 || text.length > 2_400) return false;
    return markers.every((m) => text.includes(m));
  };

  let touched = 0;
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (!isKeyless(el)) continue;
    el.setAttribute('data-m55-clean-capture-soft', 'clerk-keyless');
    (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
    touched += 1;
  }
  for (const selector of [
    'nextjs-portal',
    '[data-nextjs-toast]',
    '[data-next-badge-root]',
    '[data-next-mark]',
    '#__next-build-watcher',
    '[data-clerk-modal]',
    '.cl-modalBackdrop',
  ]) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      const html = node as HTMLElement;
      html.setAttribute('data-m55-clean-capture-soft', 'dev-chrome');
      html.style.setProperty('pointer-events', 'none', 'important');
      touched += 1;
    }
  }
  return touched;
}

/**
 * Hide only the smallest floating Clerk keyless card(s). Broad ancestor matches
 * previously blanked commercial surfaces and broke post-capture navigation.
 */
function stripDevelopmentOverlaysBrowser(): number {
  const markers = ['Configure your application', 'Temporary API keys are enabled'] as const;
  let hidden = 0;
  const hide = (el: Element, reason: string) => {
    const html = el as HTMLElement;
    if (html.getAttribute('data-m55-clean-capture-hidden')) return;
    html.setAttribute('data-m55-clean-capture-hidden', reason);
    // Prefer opacity/visibility over display:none — display:none on Clerk's
    // keyless card can navigate the tab to accounts.dev during /dev captures.
    html.style.setProperty('visibility', 'hidden', 'important');
    html.style.setProperty('pointer-events', 'none', 'important');
    html.style.setProperty('opacity', '0', 'important');
    html.style.setProperty('transform', 'scale(0)', 'important');
    hidden += 1;
  };

  const isKeyless = (el: Element) => {
    const style = window.getComputedStyle(el);
    const className = typeof el.className === 'string' ? el.className : '';
    const isFloating =
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      className.includes('cl-internal') ||
      className.includes('cl-');
    if (!isFloating) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return false;
    if (rect.width > Math.min(520, window.innerWidth * 0.95)) return false;
    if (rect.height > window.innerHeight * 0.92) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 20 || text.length > 2_400) return false;
    return markers.every((m) => text.includes(m));
  };

  const candidates: { el: Element; area: number }[] = [];
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (!isKeyless(el)) continue;
    const rect = el.getBoundingClientRect();
    candidates.push({ el, area: rect.width * rect.height });
  }
  // Hide every matching floating keyless card. Previously only the smallest
  // cluster was hidden, which left taller invite remounts in screenshots.
  for (const candidate of candidates) {
    hide(candidate.el, 'clerk-keyless');
  }

  for (const selector of [
    'nextjs-portal',
    '[data-nextjs-toast]',
    '[data-next-badge-root]',
    '[data-next-mark]',
    '#__next-build-watcher',
    '[data-clerk-modal]',
    '.cl-modalBackdrop',
  ]) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      hide(node, 'dev-chrome');
    }
  }
  return hidden;
}

function restoreDevelopmentOverlaysBrowser(): number {
  let restored = 0;
  for (const el of Array.from(document.querySelectorAll('[data-m55-clean-capture-hidden]'))) {
    const html = el as HTMLElement;
    html.style.removeProperty('visibility');
    html.style.removeProperty('pointer-events');
    html.style.removeProperty('opacity');
    html.style.removeProperty('transform');
    html.removeAttribute('data-m55-clean-capture-hidden');
    restored += 1;
  }
  for (const el of Array.from(document.querySelectorAll('[data-m55-clean-capture-soft]'))) {
    const html = el as HTMLElement;
    html.style.removeProperty('pointer-events');
    html.removeAttribute('data-m55-clean-capture-soft');
    restored += 1;
  }
  return restored;
}

/**
 * Suppress Next.js indicator for the evidence profile. Call before navigation.
 */
export async function prepareCleanCapturePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.setAttribute('data-m55-clean-capture', 'next-dev-indicator');
    style.textContent = `
      nextjs-portal,
      [data-nextjs-toast],
      [data-next-badge-root],
      [data-next-mark],
      #__next-build-watcher {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    const mount = () => {
      if (
        document.documentElement &&
        !document.querySelector('[data-m55-clean-capture="next-dev-indicator"]')
      ) {
        document.documentElement.appendChild(style);
      }
    };
    if (document.documentElement) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  });
}

const LOCAL_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;

/**
 * Navigate to a local commercial URL, retrying when Clerk keyless UI interrupts
 * with an accounts.dev redirect or aborts the navigation mid-flight.
 */
export async function safeGotoLocal(page: Page, url: string, attempts = 6): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (/accounts\.dev/i.test(page.url())) {
        await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => undefined);
        await page.context().clearCookies().catch(() => undefined);
      }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(120);
      if (/accounts\.dev/i.test(page.url())) {
        continue;
      }
      if (!LOCAL_ORIGIN.test(new URL(page.url()).origin)) {
        continue;
      }
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (/ERR_ABORTED|interrupted|Execution context was destroyed|navigation/i.test(message)) {
        await page.waitForTimeout(250);
        continue;
      }
      throw error;
    }
  }
  if (/accounts\.dev/i.test(page.url()) || !LOCAL_ORIGIN.test(new URL(page.url()).origin)) {
    throw new Error(`safeGotoLocal(${url}): still off local origin at ${page.url()}`);
  }
  if (lastError) throw lastError;
}

/** Soft-disable overlays so product controls remain clickable. */
export async function softDisableDevelopmentOverlays(page: Page): Promise<void> {
  try {
    await page.evaluate(softDisableDevelopmentOverlaysBrowser);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Execution context was destroyed|navigation|Target closed/i.test(message)) {
      return;
    }
    throw error;
  }
}

/** One-shot hide used immediately before assertions / screenshots. */
export async function removeDevelopmentOverlays(page: Page): Promise<void> {
  try {
    await page.evaluate(stripDevelopmentOverlaysBrowser);
    await page.waitForTimeout(30);
    await page.evaluate(stripDevelopmentOverlaysBrowser);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Execution context was destroyed|navigation|Target closed/i.test(message)) {
      return;
    }
    throw error;
  }
}

/** Undo capture-time hides so the live funnel can continue after a screenshot. */
export async function restoreDevelopmentOverlays(page: Page): Promise<void> {
  try {
    await page.evaluate(restoreDevelopmentOverlaysBrowser);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Execution context was destroyed|navigation|Target closed/i.test(message)) {
      return;
    }
    throw error;
  }
}

/**
 * Explicit overlay-absence assertion. Must run before every governed screenshot
 * or PDF capture.
 */
function countEffectivelyVisibleDevOverlaysBrowser(): {
  locators: string[];
  texts: string[];
  fixed: { tag: string; className: string; text: string }[];
} {
  const markers = [
    'Configure your application',
    'Temporary API keys are enabled',
    'Access the dashboard to customize auth settings',
  ] as const;
  const keylessMarkers = markers.slice(0, 2);

  const isEffectivelyVisible = (el: Element) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number.parseFloat(style.opacity || '1') < 0.05) return false;
    if (style.transform.includes('matrix(0') || style.transform === 'scale(0)') return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= 8 && rect.height >= 8;
  };

  const isKeyless = (el: Element) => {
    const style = window.getComputedStyle(el);
    const className = typeof el.className === 'string' ? el.className : '';
    const isFloating =
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      className.includes('cl-internal') ||
      className.includes('cl-');
    if (!isFloating) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return false;
    if (rect.width > Math.min(520, window.innerWidth * 0.95)) return false;
    if (rect.height > window.innerHeight * 0.92) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 20 || text.length > 2_400) return false;
    return keylessMarkers.every((m) => text.includes(m));
  };

  const locators = [
    'nextjs-portal',
    '[data-nextjs-toast]',
    '[data-next-badge-root]',
    '[data-next-mark]',
    '#__next-build-watcher',
    '[data-clerk-modal]',
    '.cl-modalBackdrop',
  ].filter((selector) =>
    Array.from(document.querySelectorAll(selector)).some((el) => isEffectivelyVisible(el)),
  );

  const texts = markers.filter((marker) =>
    Array.from(document.querySelectorAll('body *')).some((el) => {
      if (!isEffectivelyVisible(el)) return false;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text.includes(marker)) return false;
      if (text.length > 2_400) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width > Math.min(520, window.innerWidth * 0.95)) return false;
      if (rect.height > window.innerHeight * 0.92) return false;
      return true;
    }),
  );

  const fixed = Array.from(document.querySelectorAll('body *'))
    .filter((el) => isKeyless(el) && isEffectivelyVisible(el))
    .map((el) => ({
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
      text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 120),
    }));

  return { locators, texts, fixed };
}

export async function assertOverlayAbsence(page: Page, label: string): Promise<void> {
  // Playwright's visible filter treats opacity:0 nodes as visible — use computed
  // effective visibility after the capture-profile hide instead.
  await expect
    .poll(
      async () => {
        await removeDevelopmentOverlays(page);
        return page.evaluate(countEffectivelyVisibleDevOverlaysBrowser);
      },
      { timeout: 8_000, message: `${label}: development overlay still effectively visible` },
    )
    .toEqual({ locators: [], texts: [], fixed: [] });
}
