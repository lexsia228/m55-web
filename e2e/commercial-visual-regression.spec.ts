/**
 * Visual regression after geometry.
 *
 * Execution order (required on every path, including retries):
 * 1. route/state setup
 * 2. wait for readiness
 * 3. geometry / DOM assertions (incl. fixed-nav intersection = 0)
 * 4. overlay-absence assertion
 * 5. visual snapshot comparison
 *
 * A screenshot is never taken when geometry or overlay checks fail. Baselines
 * under e2e/commercial-visual-regression.spec.ts-snapshots/ are candidate
 * baselines; Human Preview approval remains required before they become
 * commercially authoritative.
 *
 * Tolerances stay tight enough to reject missing text, another state, blank
 * content, fixed overlays, clipped headings and a hidden Full plan.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { COMMERCIAL_VIEWPORT_HEIGHTS, type CommercialViewport } from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityContract';
import {
  assertOverlayAbsence,
  prepareCleanCapturePage,
  removeDevelopmentOverlays,
  safeGotoLocal,
  softDisableDevelopmentOverlays,
} from './helpers/cleanCaptureEnvironment';

const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

type SnapshotCase = {
  id: string;
  viewport: CommercialViewport;
  elementSelector: string;
  setup: 'home' | 'core_prerequisite' | 'core_free_result' | 'premium_questionnaire' | 'premium_plans' | 'checkout' | 'purchased_report';
  /** Extra text that must be present before the snapshot. */
  requiredText?: string;
  /** When true, assert fixed public header does not cover the protected target. */
  assertBelowFixedHeader?: boolean;
};

const SNAPSHOT_CASES: readonly SnapshotCase[] = [
  {
    id: 'home-mobile-hero',
    viewport: 390,
    elementSelector: '[data-testid="m55-home-hero"]',
    setup: 'home',
  },
  {
    id: 'home-premium-headline',
    viewport: 390,
    elementSelector: '[data-testid="m55-home-premium-headline"]',
    setup: 'home',
  },
  {
    id: 'core-prerequisite',
    viewport: 390,
    elementSelector: '[data-testid="m55-core-start-intake"]',
    setup: 'core_prerequisite',
  },
  {
    id: 'premium-bridge',
    viewport: 390,
    elementSelector: '#core-paid',
    setup: 'core_free_result',
  },
  {
    id: 'premium-q1',
    viewport: 1280,
    elementSelector: '[data-m55-premium-decision-sheet="true"]',
    setup: 'premium_questionnaire',
  },
  {
    id: 'plan-comparison',
    viewport: 390,
    elementSelector: '[data-testid="m55-plan-compare"]',
    setup: 'premium_plans',
    requiredText: 'フル',
    assertBelowFixedHeader: true,
  },
  {
    id: 'checkout-prep',
    viewport: 390,
    elementSelector: '[data-m55-paid-phase="checkout"]',
    setup: 'checkout',
    assertBelowFixedHeader: true,
  },
  {
    id: 'purchased-report-method-note',
    viewport: 390,
    // Capture the purchased chapter body (method note is the leading block).
    // The note alone was position-unstable under nested drawer scrollports.
    elementSelector: '[data-testid="m55-purchased-report-body"]',
    setup: 'purchased_report',
    requiredText: 'M55 複合読み解きモデル',
  },
];

/** Documented tolerance: small antialiasing only. */
const SNAPSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.012,
  animations: 'disabled' as const,
};

async function seedFreeResult(context: BrowserContext) {
  await context.addInitScript(
    ({ free }) => {
      const id = 'playwright-visual-regression';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1983-02-28' }),
      );
      const keys = Object.keys(free).sort();
      const payload = keys.map((k) => `${k}=${(free as Record<string, string>)[k]}`).join('&');
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          draftFreeAnswers: free,
          committedFreeAnswers: free,
          freeResultFingerprint: `ffp1|試験|1983-02-28|${payload}`,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(free));
    },
    { free: COMPLETE_FREE },
  );
}

async function enterPremiumFromCore(page: Page) {
  await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
  const bridgeCta = page.getByTestId('m55-paid-bridge-primary');
  await bridgeCta.scrollIntoViewIfNeeded();
  const href = await bridgeCta.getAttribute('href');
  await bridgeCta.click();
  try {
    await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 20_000 });
  } catch {
    if (!href) throw new Error('premium bridge CTA has no href');
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });
}

async function setupSnapshot(page: Page, setup: SnapshotCase['setup']) {
  if (setup === 'home') {
    await page.goto('/home', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    return;
  }
  if (setup === 'core_prerequisite') {
    await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-core-start-intake')).toBeVisible({ timeout: 30_000 });
    return;
  }
  if (setup === 'core_free_result') {
    await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 30_000,
    });
    return;
  }
  if (setup === 'premium_questionnaire') {
    await enterPremiumFromCore(page);
    return;
  }
  if (setup === 'premium_plans' || setup === 'checkout') {
    await enterPremiumFromCore(page);
    for (let i = 0; i < 6; i += 1) {
      await page.locator('[role="radio"]').first().click();
      await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
    }
    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
    await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 30_000 });
    if (setup === 'checkout') {
      await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
      await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible({ timeout: 30_000 });
    }
    return;
  }
  if (setup === 'purchased_report') {
    await safeGotoLocal(page, '/dev/dtr-drawer-preview?openPanel=chapter-1');
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await softDisableDevelopmentOverlays(page);
    await expect(page.getByTestId('m55-method-purchased-report')).toBeVisible({ timeout: 30_000 });
  }
}

/**
 * Lightweight geometry gate used before snapshots. The full commercial visual
 * quality suite remains the authoritative 8-viewport matrix; this gate only
 * refuses to photograph an already-broken layout.
 */
async function assertGeometryReady(page: Page, selector: string, viewportWidth: number) {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible({ timeout: 30_000 });

  const metrics = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const scroller = document.scrollingElement ?? document.documentElement;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      scrollWidth: scroller.scrollWidth,
      clientWidth: scroller.clientWidth,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    };
  }, selector);

  expect(metrics, `${selector}: missing for geometry gate`).not.toBeNull();
  expect(
    metrics!.scrollWidth,
    `${selector}: horizontal overflow before snapshot`,
  ).toBeLessThanOrEqual(metrics!.clientWidth + 1);
  expect(metrics!.width, `${selector}: zero-width before snapshot`).toBeGreaterThan(8);
  expect(metrics!.height, `${selector}: zero-height before snapshot`).toBeGreaterThan(8);
  expect(metrics!.left, `${selector}: clipped left`).toBeGreaterThanOrEqual(-1);
  expect(metrics!.right, `${selector}: clipped right`).toBeLessThanOrEqual(viewportWidth + 1);
  expect(metrics!.text.length, `${selector}: blank content before snapshot`).toBeGreaterThan(0);
}

/**
 * Position the protected target below the fixed public header, then assert the
 * intersection area between navigation and the target is exactly 0.
 */
async function assertClearOfFixedNavigation(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof Element)) return;
    const header =
      document.querySelector('[data-m55-public-shell] > header') ||
      document.querySelector('header');
    const main = document.querySelector('main');
    const headerBottom =
      header instanceof Element ? header.getBoundingClientRect().bottom : 64;
    const gap = 8;
    el.scrollIntoView({ block: 'start' });
    const rect = el.getBoundingClientRect();
    const delta = rect.top - (headerBottom + gap);
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
      return { ok: false as const, reason: `selector unresolved: ${sel}` };
    }
    if (!(header instanceof Element)) {
      return { ok: false as const, reason: 'fixed public header not found' };
    }
    const a = el.getBoundingClientRect();
    const b = header.getBoundingClientRect();
    const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const area = overlapX * overlapY;
    return {
      ok: true as const,
      area,
      targetTop: a.top,
      headerBottom: b.bottom,
    };
  }, selector);

  expect(geometry.ok, `${selector}: ${'reason' in geometry ? geometry.reason : 'nav geometry failed'}`).toBe(
    true,
  );
  if (geometry.ok) {
    expect(
      geometry.area,
      `${selector}: fixed navigation intersection area must be 0 (targetTop=${geometry.targetTop.toFixed(1)}, headerBottom=${geometry.headerBottom.toFixed(1)})`,
    ).toBe(0);
  }
}

/**
 * Shared pre-snapshot gate. Every retry path must call this so readiness →
 * geometry → overlay absence cannot diverge from the happy path.
 */
async function prepareGovernedSnapshot(page: Page, snap: SnapshotCase, label: string) {
  // 2. readiness
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);
  await expect(page.locator(snap.elementSelector).first()).toBeVisible({ timeout: 30_000 });
  if (snap.requiredText) {
    await expect(page.locator(snap.elementSelector).first()).toContainText(snap.requiredText);
  }

  // 3. geometry (+ fixed-nav clearance when required)
  if (snap.assertBelowFixedHeader) {
    await assertClearOfFixedNavigation(page, snap.elementSelector);
  }
  await assertGeometryReady(page, snap.elementSelector, snap.viewport);

  // 4. overlay absence — must pass before any screenshot comparison
  await assertOverlayAbsence(page, label);
  // Re-apply hide immediately before the caller screenshots (Clerk can remount).
  await removeDevelopmentOverlays(page);
}

test.describe.configure({ mode: 'serial', timeout: 240_000 });

for (const snap of SNAPSHOT_CASES) {
  test(`visual regression after geometry — ${snap.id}@${snap.viewport}`, async ({ browser }) => {
    const height = COMMERCIAL_VIEWPORT_HEIGHTS[snap.viewport];
    const context = await browser.newContext({ viewport: { width: snap.viewport, height } });
    if (snap.setup !== 'home' && snap.setup !== 'core_prerequisite' && snap.setup !== 'purchased_report') {
      await seedFreeResult(context);
    }
    const page = await context.newPage();
    await prepareCleanCapturePage(page);

    // 1. setup
    await setupSnapshot(page, snap.setup);

    await prepareGovernedSnapshot(page, snap, snap.id);
    if (/accounts\.dev/i.test(page.url())) {
      await setupSnapshot(page, snap.setup);
      await prepareGovernedSnapshot(page, snap, `${snap.id}:recovered`);
    }

    // 5. visual snapshot — never without steps 2–4 above
    const target = page.locator(snap.elementSelector).first();
    if (snap.setup === 'purchased_report') {
      let png: Buffer | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (/accounts\.dev/i.test(page.url()) || attempt > 0) {
          await setupSnapshot(page, snap.setup);
          await prepareGovernedSnapshot(page, snap, `${snap.id}:retry-${attempt}`);
        }
        try {
          png = await page.locator(snap.elementSelector).first().screenshot({ animations: 'disabled' });
          break;
        } catch {
          png = null;
        }
      }
      expect(png, `${snap.id}: screenshot failed after retry`).not.toBeNull();
      expect(png!.byteLength, `${snap.id}: empty purchased body snapshot`).toBeGreaterThan(20_000);
      expect(png!).toMatchSnapshot(`${snap.id}-${snap.viewport}.png`, {
        maxDiffPixelRatio: 0.04,
      });
    } else {
      await expect(target).toHaveScreenshot(`${snap.id}-${snap.viewport}.png`, {
        ...SNAPSHOT_OPTIONS,
        timeout: 15_000,
      });
    }

    await context.close();
  });
}
