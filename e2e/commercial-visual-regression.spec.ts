/**
 * Visual regression after geometry.
 *
 * Execution order (required on every path, including retries):
 * 1. route/state setup
 * 2. wait for readiness + navigation stability
 * 3. geometry / DOM assertions (incl. fixed-nav intersection = 0)
 * 4. overlay-absence assertion (fail-before-mutation — never sanitizes)
 * 5. visual snapshot comparison
 *
 * Requires M55_E2E_CLEAN_CAPTURE=1 so Clerk keyless / Next-dev chrome are never
 * created at process level.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { COMMERCIAL_VIEWPORT_HEIGHTS, type CommercialViewport } from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityContract';
import {
  assertClearOfFixedNavigation,
  assertLocalNavigationStable,
  assertOverlayAbsence,
  prepareCleanCapturePage,
  requireCleanCaptureEnvironment,
  safeGotoLocal,
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
  setup:
    | 'home'
    | 'core_prerequisite'
    | 'core_free_result'
    | 'premium_questionnaire'
    | 'premium_plans'
    | 'checkout'
    | 'purchased_report'
    | 'pair_paid_report'
    | 'premium_share_preview';
  expectedPathname: string | RegExp;
  requiredText?: string;
  assertBelowFixedHeader?: boolean;
  /** Small typographic targets may need a slightly looser ratio under clean-capture. */
  snapshotMaxDiffRatio?: number;
};

const SNAPSHOT_CASES: readonly SnapshotCase[] = [
  {
    id: 'home-mobile-hero',
    viewport: 390,
    elementSelector: '[data-testid="m55-home-hero"]',
    setup: 'home',
    expectedPathname: '/home',
  },
  {
    id: 'home-premium-headline',
    viewport: 390,
    elementSelector: '[data-testid="m55-home-premium-preview"]',
    setup: 'home',
    expectedPathname: '/home',
    snapshotMaxDiffRatio: 0.03,
  },
  {
    id: 'core-prerequisite',
    viewport: 390,
    elementSelector: '[data-testid="m55-core-start-intake"]',
    setup: 'core_prerequisite',
    expectedPathname: '/core',
  },
  {
    id: 'premium-bridge',
    viewport: 390,
    elementSelector: '#core-paid',
    setup: 'core_free_result',
    expectedPathname: '/core',
  },
  {
    id: 'premium-q1',
    viewport: 1280,
    elementSelector: '[data-m55-premium-decision-sheet="true"]',
    setup: 'premium_questionnaire',
    expectedPathname: '/dtr/lp',
  },
  {
    id: 'plan-comparison',
    viewport: 390,
    elementSelector: '[data-testid="m55-plan-compare"]',
    setup: 'premium_plans',
    expectedPathname: '/dtr/lp',
    requiredText: 'フル',
    assertBelowFixedHeader: true,
  },
  {
    id: 'checkout-prep',
    viewport: 390,
    elementSelector: '[data-m55-paid-phase="checkout"]',
    setup: 'checkout',
    expectedPathname: '/dtr/lp',
    assertBelowFixedHeader: true,
  },
  {
    id: 'purchased-report-method-note',
    viewport: 390,
    elementSelector: '[data-testid="m55-purchased-report-body"]',
    setup: 'purchased_report',
    expectedPathname: /\/dev\/dtr-drawer-preview/,
    requiredText: 'M55 複合読み解きモデル',
  },
  {
    id: 'self-paid-reading-depth-map',
    viewport: 390,
    elementSelector: '[data-testid="m55-personal-reading-depth-map"]',
    setup: 'purchased_report',
    expectedPathname: /\/dev\/dtr-drawer-preview/,
    requiredText: 'あなただけの4章',
  },
  {
    id: 'self-paid-reading-depth-map-desktop',
    viewport: 1280,
    elementSelector: '[data-testid="m55-personal-reading-depth-map"]',
    setup: 'purchased_report',
    expectedPathname: /\/dev\/dtr-drawer-preview/,
    requiredText: '生活の4つの場面',
  },
  {
    id: 'pair-paid-relational-grammar',
    viewport: 390,
    elementSelector: '[data-testid="m55-pair-relational-grammar"]',
    setup: 'pair_paid_report',
    expectedPathname: /\/dev\/synastry-paid-report-preview/,
    requiredText: 'あなた',
  },
  {
    id: 'pair-paid-relational-grammar-desktop',
    viewport: 1280,
    elementSelector: '[data-testid="m55-pair-relational-grammar"]',
    setup: 'pair_paid_report',
    expectedPathname: /\/dev\/synastry-paid-report-preview/,
    requiredText: '相手',
  },
  {
    id: 'premium-plans-desktop',
    viewport: 1280,
    elementSelector: '[data-testid="m55-plan-compare"]',
    setup: 'premium_plans',
    expectedPathname: '/dtr/lp',
    requiredText: 'フル',
  },
  {
    id: 'premium-share-preview',
    viewport: 390,
    elementSelector: '[data-testid="m55-premium-result-share"]',
    setup: 'premium_share_preview',
    expectedPathname: /\/dev\/premium-share-preview/,
  },
  {
    id: 'core-free-share',
    viewport: 390,
    elementSelector: '[data-testid="m55-free-result-share"]',
    setup: 'core_free_result',
    expectedPathname: '/core',
  },
];

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
  const previousUrl = page.url();
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
  await assertLocalNavigationStable(page, {
    label: 'enterPremiumFromCore',
    expectedPathname: '/dtr/lp',
    previousUrl,
  });
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
    await expect(page.getByTestId('m55-paid-answer-review')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('m55-paid-review-continue').click();
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
    await expect(page.getByTestId('m55-method-purchased-report')).toBeVisible({ timeout: 30_000 });
    return;
  }
  if (setup === 'pair_paid_report') {
    await safeGotoLocal(page, '/dev/synastry-paid-report-preview');
    await expect(page.getByTestId('m55-dev-paid-compatibility-report-preview')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId('m55-pair-relational-grammar')).toBeVisible({ timeout: 30_000 });
    return;
  }
  if (setup === 'premium_share_preview') {
    await safeGotoLocal(page, '/dev/premium-share-preview');
    await expect(page.locator('[data-m55-dev-preview="premium-share"]')).toBeVisible({
      timeout: 60_000,
    });
  }
}

async function assertGeometryReady(page: Page, selector: string, viewportWidth: number) {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible({ timeout: 30_000 });
  await expect(target).toBeAttached();

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
 * Shared pre-snapshot gate. Every retry path must call this so readiness →
 * geometry → overlay absence cannot diverge from the happy path.
 * Overlay assertion never mutates the DOM.
 */
async function prepareGovernedSnapshot(page: Page, snap: SnapshotCase, label: string) {
  const previousUrl = page.url();
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);

  await assertLocalNavigationStable(page, {
    label: `${label}:pre`,
    expectedPathname: snap.expectedPathname,
    previousUrl,
  });

  await expect(page.locator(snap.elementSelector).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(snap.elementSelector).first()).toBeAttached();
  if (snap.requiredText) {
    await expect(page.locator(snap.elementSelector).first()).toContainText(snap.requiredText);
  }

  if (snap.assertBelowFixedHeader) {
    await assertClearOfFixedNavigation(page, snap.elementSelector);
  }
  await assertGeometryReady(page, snap.elementSelector, snap.viewport);

  await assertOverlayAbsence(page, label);

  await assertLocalNavigationStable(page, {
    label: `${label}:post`,
    expectedPathname: snap.expectedPathname,
    previousUrl,
  });
}

test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.beforeAll(() => {
  requireCleanCaptureEnvironment('commercial-visual-regression');
});

for (const snap of SNAPSHOT_CASES) {
  test(`visual regression after geometry — ${snap.id}@${snap.viewport}`, async ({ browser }) => {
    const height = COMMERCIAL_VIEWPORT_HEIGHTS[snap.viewport];
    // Isolated context per case so one Clerk/navigation event cannot poison later cases.
    const context = await browser.newContext({ viewport: { width: snap.viewport, height } });
    if (snap.setup !== 'home' && snap.setup !== 'core_prerequisite' && snap.setup !== 'purchased_report') {
      await seedFreeResult(context);
    }
    const page = await context.newPage();
    await prepareCleanCapturePage(page);

    await setupSnapshot(page, snap.setup);
    await prepareGovernedSnapshot(page, snap, snap.id);

    const target = page.locator(snap.elementSelector).first();
    if (snap.setup === 'purchased_report') {
      let png: Buffer | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) {
          await setupSnapshot(page, snap.setup);
        }
        await prepareGovernedSnapshot(page, snap, `${snap.id}:retry-${attempt}`);
        try {
          png = await page.locator(snap.elementSelector).first().screenshot({ animations: 'disabled' });
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/Target closed|Execution context was destroyed|page closed/i.test(message)) {
            throw new Error(`${snap.id}: context destroyed during screenshot — not a flaky pass (${message})`);
          }
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
        maxDiffPixelRatio: snap.snapshotMaxDiffRatio ?? SNAPSHOT_OPTIONS.maxDiffPixelRatio,
        timeout: 15_000,
      });
    }

    await context.close();
  });
}
