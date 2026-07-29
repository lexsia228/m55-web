/**
 * Clean capture environment for governed commercial / Premium evidence.
 *
 * Overlay root cause (PR #81 review):
 * - Clerk development keyless panel ("Configure your application") — third-party
 *   auth SDK UI, not an M55 application component.
 * - Next.js development indicator ("N") — next-dev tooling, not product UI.
 *
 * Capture contract (fail-before-mutation):
 * 1. Prevent overlays at process/environment level (`M55_E2E_CLEAN_CAPTURE=1`
 *    → `NEXT_PUBLIC_CLERK_KEYLESS_DISABLED=1` + `NEXT_DISABLE_DEV_INDICATOR=1`)
 * 2. `detectUnexpectedOverlay` observes only — never mutates the DOM
 * 3. `assertOverlayAbsence` fails immediately when any governed overlay exists
 * 4. Screenshots run only after absence is proven without sanitization
 *
 * No broad CSS hide, no DOM detach, no opacity/scale sanitize before capture.
 * Browser helpers passed to page.evaluate must be self-contained (no outer refs).
 */
import { expect, type Page } from '@playwright/test';

/** Explicit local E2E process flag. Absent → fail-closed for governed suites. */
export const M55_E2E_CLEAN_CAPTURE_ENV = 'M55_E2E_CLEAN_CAPTURE' as const;

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

const LOCAL_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;

export type OverlayFinding = {
  kind: 'locator' | 'text' | 'fixed_dialog';
  selector: string;
  textFingerprint: string;
  boundingRectangle: { top: number; left: number; width: number; height: number };
  zIndex: string;
  position: string;
  url: string;
};

export type OverlayDetectionResult = {
  url: string;
  findings: OverlayFinding[];
};

/**
 * Fail-closed gate for governed capture suites. Preview/Production never set
 * this process flag; local E2E must opt in explicitly.
 */
export function requireCleanCaptureEnvironment(label: string): void {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    throw new Error(
      `${label}: M55 clean capture must not run under Vercel Preview/Production (STOP_AUTH_SCOPE)`,
    );
  }
  if (process.env[M55_E2E_CLEAN_CAPTURE_ENV] !== '1') {
    throw new Error(
      `${label}: ${M55_E2E_CLEAN_CAPTURE_ENV}=1 is required for governed commercial capture (fail-closed)`,
    );
  }
}

/**
 * Legacy no-op retained for call-site stability. Concealment CSS is prohibited;
 * the server env must prevent Next/Clerk development chrome from mounting
 * (`scripts/m55-e2e-clean-capture-env.mjs` + `M55_E2E_CLEAN_CAPTURE=1`).
 */
export async function prepareCleanCapturePage(_page: Page): Promise<void> {
  // Intentionally empty — fail-before-mutation capture forbids addStyleTag hides.
}

/**
 * Navigate to a local commercial URL, retrying when Clerk keyless UI interrupts
 * with an accounts.dev redirect or aborts the navigation mid-flight.
 */
export async function safeGotoLocal(page: Page, url: string, attempts = 6): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (page.isClosed()) {
        throw new Error(`safeGotoLocal(${url}): page is closed`);
      }
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
      if (/ERR_ABORTED|interrupted|Execution context was destroyed|navigation|Target closed/i.test(message)) {
        await page.waitForTimeout(250);
        continue;
      }
      throw error;
    }
  }
  if (page.isClosed()) {
    throw new Error(`safeGotoLocal(${url}): page closed after retries`);
  }
  if (/accounts\.dev/i.test(page.url()) || !LOCAL_ORIGIN.test(new URL(page.url()).origin)) {
    throw new Error(`safeGotoLocal(${url}): still off local origin at ${page.url()}`);
  }
  if (lastError) throw lastError;
}

/**
 * Read-only overlay detection. Never hides, removes, styles, or detaches nodes.
 */
function detectUnexpectedOverlayBrowser(): OverlayDetectionResult {
  const url = location.href;
  const findings: OverlayFinding[] = [];
  const markers = [
    'Configure your application',
    'Temporary API keys are enabled',
    'Access the dashboard to customize auth settings',
  ] as const;

  const isEffectivelyVisible = (el: Element) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number.parseFloat(style.opacity || '1') < 0.05) return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= 8 && rect.height >= 8;
  };

  const describe = (
    kind: OverlayFinding['kind'],
    selector: string,
    el: Element,
  ): OverlayFinding => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      kind,
      selector,
      textFingerprint: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      boundingRectangle: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      zIndex: style.zIndex,
      position: style.position,
      url,
    };
  };

  for (const selector of [
    'nextjs-portal',
    '[data-nextjs-toast]',
    '[data-next-badge-root]',
    '[data-next-mark]',
    '#__next-build-watcher',
    '[data-clerk-modal]',
    '.cl-modalBackdrop',
  ]) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (!isEffectivelyVisible(el)) continue;
      findings.push(describe('locator', selector, el));
    }
  }

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (!isEffectivelyVisible(el)) continue;
    const style = window.getComputedStyle(el);
    const className = typeof el.className === 'string' ? el.className : '';
    const isFloating =
      style.position === 'fixed' ||
      style.position === 'sticky' ||
      className.includes('cl-internal') ||
      className.includes('cl-');
    if (!isFloating) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) continue;
    if (rect.width > Math.min(520, window.innerWidth * 0.95)) continue;
    if (rect.height > window.innerHeight * 0.92) continue;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 20 || text.length > 2_400) continue;
    if (!markers.slice(0, 2).every((m) => text.includes(m))) continue;
    findings.push(describe('fixed_dialog', 'clerk-keyless-fixed', el));
  }

  for (const marker of markers) {
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (!isEffectivelyVisible(el)) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text.includes(marker)) continue;
      if (text.length > 2_400) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > Math.min(520, window.innerWidth * 0.95)) continue;
      if (rect.height > window.innerHeight * 0.92) continue;
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') continue;
      findings.push(describe('text', `text:${marker}`, el));
    }
  }

  return { url, findings };
}

export async function detectUnexpectedOverlay(page: Page): Promise<OverlayDetectionResult> {
  if (page.isClosed()) {
    throw new Error('detectUnexpectedOverlay: page is closed');
  }
  return page.evaluate(detectUnexpectedOverlayBrowser);
}

/**
 * Explicit overlay-absence assertion. Must never mutate the DOM.
 * Fails immediately with selector / text / geometry / URL diagnostics.
 */
export async function assertOverlayAbsence(page: Page, label: string): Promise<void> {
  if (page.isClosed()) {
    throw new Error(`${label}: page is closed before overlay assertion`);
  }
  const detected = await detectUnexpectedOverlay(page);
  if (detected.findings.length === 0) return;

  const detail = detected.findings
    .map((f) => {
      const box = f.boundingRectangle;
      return [
        `kind=${f.kind}`,
        `selector=${f.selector}`,
        `position=${f.position}`,
        `z-index=${f.zIndex}`,
        `rect=${box.width.toFixed(1)}x${box.height.toFixed(1)}@(${box.left.toFixed(1)},${box.top.toFixed(1)})`,
        `text=${JSON.stringify(f.textFingerprint)}`,
        `url=${f.url}`,
      ].join(' ');
    })
    .join('\n');
  throw new Error(`${label}: unexpected development overlay present (fail-before-mutation)\n${detail}`);
}

export type NavigationStabilityOptions = {
  expectedPathname?: string | RegExp;
  label: string;
  previousUrl?: string;
};

/**
 * Prove the page is still on an authorized localhost origin with a live context.
 * Context destruction / accounts.dev redirects are hard failures, not flakes.
 */
export async function assertLocalNavigationStable(
  page: Page,
  options: NavigationStabilityOptions,
): Promise<void> {
  const { label, expectedPathname, previousUrl } = options;
  if (page.isClosed()) {
    throw new Error(
      `${label}: page closed` +
        (previousUrl ? ` (previousUrl=${previousUrl})` : ''),
    );
  }

  let currentUrl: string;
  try {
    currentUrl = page.url();
    // Touch the execution context — throws if destroyed.
    await page.evaluate(() => document.readyState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label}: execution context destroyed` +
        (previousUrl ? ` previousUrl=${previousUrl}` : '') +
        ` detail=${message}`,
    );
  }

  if (/accounts\.dev/i.test(currentUrl)) {
    throw new Error(
      `${label}: unexpected external navigation to accounts.dev` +
        (previousUrl ? ` previousUrl=${previousUrl}` : '') +
        ` nextUrl=${currentUrl}`,
    );
  }

  let origin: string;
  let pathname: string;
  try {
    const parsed = new URL(currentUrl);
    origin = parsed.origin;
    pathname = parsed.pathname;
  } catch {
    throw new Error(`${label}: unparseable URL ${currentUrl}`);
  }

  if (!LOCAL_ORIGIN.test(origin)) {
    throw new Error(
      `${label}: unexpected external origin` +
        (previousUrl ? ` previousUrl=${previousUrl}` : '') +
        ` nextUrl=${currentUrl}`,
    );
  }

  if (expectedPathname) {
    const ok =
      typeof expectedPathname === 'string'
        ? pathname === expectedPathname || pathname.startsWith(`${expectedPathname}/`)
        : expectedPathname.test(pathname);
    if (!ok) {
      throw new Error(
        `${label}: unexpected pathname` +
          (previousUrl ? ` previousUrl=${previousUrl}` : '') +
          ` nextUrl=${currentUrl} expected=${expectedPathname}`,
      );
    }
  }
}

/**
 * Fixed public header must not cover a protected selector (intersection area = 0).
 */
export async function assertClearOfFixedNavigation(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof Element)) return;
    const header =
      document.querySelector('[data-m55-public-shell] > header') ||
      document.querySelector('header');
    const main = document.querySelector('main');
    const headerBottom =
      header instanceof Element ? header.getBoundingClientRect().bottom : 64;
    el.scrollIntoView({ block: 'start' });
    const delta = el.getBoundingClientRect().top - (headerBottom + 8);
    if (!delta) return;
    if (main instanceof HTMLElement && main.scrollHeight > main.clientHeight + 8) {
      main.scrollTop += delta;
    } else {
      window.scrollBy(0, delta);
    }
  }, selector);
  await page.waitForTimeout(80);

  const geometry = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const header =
      document.querySelector('[data-m55-public-shell] > header') ||
      document.querySelector('header');
    if (!(el instanceof Element)) {
      return { ok: false as const, reason: `selector unresolved: ${sel}`, area: -1 };
    }
    if (!(header instanceof Element)) {
      return { ok: false as const, reason: 'fixed public header not found', area: -1 };
    }
    const a = el.getBoundingClientRect();
    const b = header.getBoundingClientRect();
    const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return {
      ok: true as const,
      area: overlapX * overlapY,
      targetTop: a.top,
      headerBottom: b.bottom,
    };
  }, selector);

  expect(geometry.ok, `${selector}: ${geometry.ok ? '' : geometry.reason}`).toBe(true);
  expect(
    geometry.area,
    `${selector}: fixed navigation intersection area must be 0`,
  ).toBe(0);
}

/**
 * @deprecated Capture sanitization is prohibited. Retained as a no-op so older
 * call sites compile while governed suites migrate to fail-before-mutation.
 */
export async function softDisableDevelopmentOverlays(_page: Page): Promise<void> {
  // no-op
}

/**
 * @deprecated Capture sanitization is prohibited. Retained as a no-op.
 */
export async function removeDevelopmentOverlays(_page: Page): Promise<void> {
  // no-op
}

/**
 * @deprecated Capture sanitization is prohibited. Retained as a no-op.
 */
export async function restoreDevelopmentOverlays(_page: Page): Promise<void> {
  // no-op
}
