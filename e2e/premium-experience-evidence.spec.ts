/**
 * Premium Experience SSOT — visual + print evidence (fixture/dev paths only).
 *
 * Every capture is driven by the typed capture model: the visible contract is
 * asserted, the fixture origin and route are observed from the live page, and a
 * machine-readable capture event is emitted on stdout so the runner can bind the
 * durable execution record to real reporter output instead of constants.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureCaseById,
  captureContractDigest,
  type PremiumCaptureCase,
  type PremiumEvidenceViewport,
} from '../lib/m55/commercialUx/premiumExperience/premiumExperienceCaptureModel';
import {
  assertClearOfFixedNavigation,
  assertLocalNavigationStable,
  assertOverlayAbsence,
  prepareCleanCapturePage,
  requireCleanCaptureEnvironment,
  safeGotoLocal,
} from './helpers/cleanCaptureEnvironment';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots', 'premium-experience-ssot');
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
] as const;

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

async function cleanContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  const boot = await context.newPage();
  await boot.goto('/home');
  await boot.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await boot.close();
  return context;
}

async function seedResult(context: BrowserContext) {
  await context.addInitScript(
    ({ free }) => {
      const id = 'playwright-premium-evidence';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1983-02-28' }),
      );
      const keys = Object.keys(free).sort();
      const payload = keys.map((k) => `${k}=${(free as Record<string, string>)[k]}`).join('&');
      const fingerprint = `ffp1|試験|1983-02-28|${payload}`;
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          draftFreeAnswers: free,
          committedFreeAnswers: free,
          freeResultFingerprint: fingerprint,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(free));
    },
    { free: COMPLETE_FREE },
  );
}

/** Machine-readable capture record consumed by the deterministic runner. */
const CAPTURE_EVENT_PREFIX = 'M55_CAPTURE_EVENT ';

function emitCaptureEvent(event: Record<string, unknown>) {
  console.log(`${CAPTURE_EVENT_PREFIX}${JSON.stringify(event)}`);
}

function requireCapture(captureId: string): PremiumCaptureCase {
  const capture = captureCaseById(captureId);
  if (!capture) {
    throw new Error(`PREMIUM_CAPTURE_UNDECLARED: ${captureId} is not in the typed capture model`);
  }
  return capture;
}

/** Runtime assertion contract for captures whose product phase marker moved before model refresh. */
function captureForAssertion(capture: PremiumCaptureCase): PremiumCaptureCase {
  if (capture.captureId !== 'answer-review') return capture;
  return {
    ...capture,
    visibleContract: {
      ...capture.visibleContract,
      locator: '[data-testid="m55-paid-answer-review"]',
    },
  };
}

function requireLocalDevFixture(testName: string) {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error(
      `PREMIUM_EVIDENCE_REQUIRES_LOCAL_DEV: ${testName} requires local dev fixtures; VERCEL_ENV=production blocks /dev routes.`,
    );
  }
}

async function assertPremiumAuthority(page: Page) {
  const tier = page.locator('[data-m55-experience-tier="PREMIUM"]');
  await expect(tier.first()).toBeVisible();
  await expect(tier.first()).toHaveAttribute(
    'data-m55-visual-authority',
    'premium.experience.home_editorial_sample_v1',
  );
}

async function assertDecisionSheet(page: Page) {
  await expect(page.locator('[data-m55-premium-decision-sheet="true"]').first()).toBeVisible();
}

/**
 * Assert the capture's visible contract and observed origin/route, returning the
 * live page identity so it can be recorded alongside the file.
 */
async function assertCaptureContract(page: Page, capture: PremiumCaptureCase) {
  const target = page.locator(capture.visibleContract.locator).first();
  await expect(target).toBeVisible({ timeout: 30_000 });

  const box = await target.boundingBox();
  expect(box, `${capture.captureId}: contract locator has no box`).not.toBeNull();
  expect(box!.width, `${capture.captureId}: zero width`).toBeGreaterThan(0);
  expect(box!.height, `${capture.captureId}: zero height`).toBeGreaterThan(0);

  for (const text of capture.visibleContract.requiredTexts) {
    await expect(target.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  }
  for (const text of capture.visibleContract.forbiddenTexts) {
    const effectivelyVisible = await page.evaluate((marker) => {
      return Array.from(document.querySelectorAll('body *')).some((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (Number.parseFloat(style.opacity || '1') < 0.05) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) return false;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return text.includes(marker);
      });
    }, text);
    expect(effectivelyVisible, `${capture.captureId}: forbidden text still effective: ${text}`).toBe(
      false,
    );
  }
  for (const locator of capture.visibleContract.forbiddenLocators) {
    const effectivelyVisible = await page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).some((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (Number.parseFloat(style.opacity || '1') < 0.05) return false;
        const rect = el.getBoundingClientRect();
        return rect.width >= 8 && rect.height >= 8;
      });
    }, locator);
    expect(
      effectivelyVisible,
      `${capture.captureId}: forbidden locator still effective: ${locator}`,
    ).toBe(false);
  }

  const actualUrl = page.url();
  const actualOrigin = new URL(actualUrl).origin;
  expect(actualOrigin, `${capture.captureId}: unexpected origin`).toMatch(LOCAL_ORIGIN_PATTERN);
  const routePath = capture.expectedRoute.split('?')[0];
  expect(actualUrl, `${capture.captureId}: unexpected route`).toContain(routePath);

  return { actualUrl, actualOrigin, target };
}

async function prepareGovernedPremiumCapture(
  page: Page,
  captureId: string,
  viewport: PremiumEvidenceViewport,
) {
  const capture = captureForAssertion(requireCapture(captureId));
  const previousUrl = page.url();
  const routePath = capture.expectedRoute.split('?')[0];

  if (!LOCAL_ORIGIN_PATTERN.test(new URL(page.url()).origin)) {
    throw new Error(
      `${captureId}@${viewport}: unexpected external origin before capture previousUrl=${previousUrl} nextUrl=${page.url()}`,
    );
  }

  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(150);

  await assertLocalNavigationStable(page, {
    label: `${captureId}@${viewport}:pre`,
    expectedPathname: routePath,
    previousUrl,
  });

  // Plan selection / payment prep must independently prove fixed-nav clearance.
  if (captureId === 'plan-selection' || captureId === 'payment-prep') {
    await assertClearOfFixedNavigation(page, capture.visibleContract.locator);
  }

  // Fail-before-mutation: never sanitize overlays before proving absence.
  await assertOverlayAbsence(page, `${captureId}@${viewport}`);
  const contract = await assertCaptureContract(page, capture);

  await assertLocalNavigationStable(page, {
    label: `${captureId}@${viewport}:post`,
    expectedPathname: routePath,
    previousUrl,
  });

  return contract;
}

async function capturePng(page: Page, captureId: string, viewport: PremiumEvidenceViewport) {
  const modelCapture = requireCapture(captureId);
  const capture = captureForAssertion(modelCapture);
  const { actualUrl, actualOrigin } = await prepareGovernedPremiumCapture(page, captureId, viewport);
  const target = page.locator(capture.visibleContract.locator).first();
  await expect(target).toBeAttached();

  fs.mkdirSync(OUT, { recursive: true });
  const fileName = `${captureId}-${viewport}.png`;
  const filePath = path.join(OUT, fileName);

  expect(new URL(page.url()).origin, `${captureId}: left local origin`).toMatch(LOCAL_ORIGIN_PATTERN);

  if (capture.captureScope === 'element') {
    await expect(target).toBeVisible({ timeout: 30_000 });
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(100);
    await expect
      .poll(
        async () => {
          const box = await target.boundingBox();
          return box ? box.width * box.height : 0;
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(5_000);
    try {
      await target.screenshot({ path: filePath, animations: 'disabled' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Target closed|Execution context was destroyed|page closed/i.test(message)) {
        throw new Error(`${captureId}: context destroyed during screenshot — not a flaky pass (${message})`);
      }
      const box = await target.boundingBox();
      expect(box, `${captureId}: missing box before clip screenshot`).not.toBeNull();
      await page.screenshot({
        path: filePath,
        animations: 'disabled',
        clip: {
          x: Math.max(0, box!.x),
          y: Math.max(0, box!.y),
          width: Math.max(1, Math.min(box!.width, page.viewportSize()?.width ?? box!.width)),
          height: Math.max(1, Math.min(box!.height, page.viewportSize()?.height ?? box!.height)),
        },
      });
    }
  } else {
    await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  }

  const byteLength = fs.statSync(filePath).size;
  const minBytes = captureId.startsWith('premium-bridge') ? 20_000 : 4_000;
  expect(byteLength, `${captureId}: implausibly small capture`).toBeGreaterThan(minBytes);

  emitCaptureEvent({
    kind: 'png',
    captureId,
    stateId: capture.stateId,
    viewport,
    expectedRoute: capture.expectedRoute,
    actualUrl,
    actualOrigin,
    ownerModule: modelCapture.ownerModule,
    visibleContractDigest: captureContractDigest(modelCapture),
    fileName,
    byteLength,
  });
}

async function capturePdf(page: Page, captureId: string) {
  const modelCapture = requireCapture(captureId);
  const capture = captureForAssertion(modelCapture);
  if (!capture.printFileName) {
    throw new Error(`PREMIUM_CAPTURE_NOT_PRINTABLE: ${captureId}`);
  }
  const { actualUrl, actualOrigin } = await prepareGovernedPremiumCapture(page, captureId, '1280');

  const filePath = path.join(OUT, capture.printFileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, await page.pdf({ format: 'A4', printBackground: true }));
  const byteLength = fs.statSync(filePath).size;
  expect(byteLength, `${captureId}: loading-only print output`).toBeGreaterThan(3_000);

  emitCaptureEvent({
    kind: 'pdf',
    captureId,
    stateId: capture.stateId,
    viewport: null,
    expectedRoute: capture.expectedRoute,
    actualUrl,
    actualOrigin,
    ownerModule: modelCapture.ownerModule,
    visibleContractDigest: captureContractDigest(modelCapture),
    fileName: capture.printFileName,
    byteLength,
  });
}

async function ensureLocalDrawerPreview(page: Page, fallbackUrl = '/dev/dtr-drawer-preview') {
  if (!/dtr-drawer-preview/.test(page.url()) || /accounts\.dev/i.test(page.url())) {
    await safeGotoLocal(page, fallbackUrl);
  }
  await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
}

async function openDrawerPanel(page: Page, panel: 'chapter-1' | 'consult') {
  const localUrl = /dtr-drawer-preview/.test(page.url()) && !/accounts\.dev/i.test(page.url())
    ? page.url()
    : '/dev/dtr-drawer-preview';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await ensureLocalDrawerPreview(page, localUrl);
    await assertLocalNavigationStable(page, {
      label: `openDrawerPanel(${panel})`,
      expectedPathname: /\/dev\/dtr-drawer-preview/,
    });
    const trigger = page.locator(`[aria-controls="drawer-hub-body-${panel}"]`);
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.evaluate((el) => (el as HTMLButtonElement).click());
    if (/accounts\.dev/i.test(page.url())) {
      throw new Error(
        `openDrawerPanel(${panel}): unexpected external navigation to accounts.dev from ${localUrl}`,
      );
    }
    try {
      await expect(page).toHaveURL(/dtr-drawer-preview/);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 6_000 });
      await expect(page.locator(`#drawer-hub-body-${panel}`)).toBeVisible({ timeout: 6_000 });
      return;
    } catch {
      await safeGotoLocal(page, localUrl);
    }
  }
  throw new Error(`openDrawerPanel(${panel}): could not open without leaving the local origin`);
}

async function expectAnswerReviewPhase(page: Page, timeout = 20_000) {
  await expect(page.locator('[data-m55-paid-phase="review"]')).toBeVisible({ timeout });
  await expect(page.getByTestId('m55-paid-answer-review')).toBeVisible({ timeout });
}

async function completeQuestionnaire(page: Page) {
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[role="radio"]').first().click();
    const btn =
      i === 5
        ? page.getByRole('button', { name: '回答を確認する' })
        : page.getByRole('button', { name: '次へ' });
    await btn.click();
  }
  await expectAnswerReviewPhase(page);
}

// Default (not serial): a flaky /dev fixture must not skip the remaining matrix.
test.describe.configure({ mode: 'default', timeout: 180_000 });

test.beforeAll(() => {
  requireCleanCaptureEnvironment('premium-experience-evidence');
});

for (const vp of VIEWPORTS) {
  test(`premium funnel states @${vp.name}`, async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResult(context);
    const page = await context.newPage();
    await prepareCleanCapturePage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 30_000,
    });
    await page.locator('#core-paid').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('m55-free-to-paid-bridge')).toContainText('プレミアムレポート', {
      timeout: 20_000,
    });
    await assertPremiumAuthority(page);
    await capturePng(page, 'premium-bridge', vp.name);

    // Prefer navigation via href — host flips between 127.0.0.1 and localhost
    // can swallow a plain click without changing the path.
    const bridgeHref = await page.getByTestId('m55-paid-bridge-primary').getAttribute('href');
    expect(bridgeHref, 'premium bridge href').toMatch(/\/dtr\/lp/);
    await page.goto(bridgeHref!, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 60_000 });
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await assertDecisionSheet(page);
    await capturePng(page, 'premium-q1', vp.name);

    for (let i = 0; i < 4; i += 1) {
      await page.locator('[role="radio"]').first().click();
      await page.getByRole('button', { name: '次へ' }).click();
    }
    await capturePng(page, 'premium-q5', vp.name);
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: '次へ' }).click();
    await capturePng(page, 'premium-q6', vp.name);
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: '回答を確認する' }).click();
    await expectAnswerReviewPhase(page);
    await capturePng(page, 'answer-review', vp.name);

    await page.locator('[data-testid^="m55-paid-answer-edit-"]').first().click();
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible();
    await expect(page.locator('[data-m55-paid-answer-edit="true"]')).toBeVisible();
    await assertDecisionSheet(page);
    await capturePng(page, 'answer-edit', vp.name);

    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: '保存して確認に戻る' }).click();
    await expectAnswerReviewPhase(page);

    await page.getByRole('button', { name: 'この回答でプランを見る' }).click();
    await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible();
    await assertDecisionSheet(page);
    await capturePng(page, 'plan-selection', vp.name);

    await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
    await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
    await assertDecisionSheet(page);
    await capturePng(page, 'payment-prep', vp.name);

    await context.close();
  });
}

for (const vp of VIEWPORTS) {
  test(`premium share card @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`premium share card @${vp.name}`);
    await prepareCleanCapturePage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/premium-share-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-m55-dev-preview="premium-share"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('m55-premium-experience-share')).toBeVisible({ timeout: 20_000 });
    await assertPremiumAuthority(page);
    await assertDecisionSheet(page);
    await capturePng(page, 'premium-share-card', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`purchased report fixture @${vp.name}`, async ({ browser }) => {
    requireLocalDevFixture(`purchased report fixture @${vp.name}`);

    // Landing and body use separate browser contexts. Hard-hiding the Clerk
    // keyless panel during the landing capture can poison the same context into
    // an accounts.dev bounce on the next navigation.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await prepareCleanCapturePage(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await safeGotoLocal(page, '/dev/dtr-drawer-preview');
      await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('[aria-controls="drawer-hub-body-summary"]')).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByTestId('m55-saved-snapshot-notice')).toHaveCount(0);
      await assertPremiumAuthority(page);
      await expect(page.locator(`[aria-controls="drawer-hub-body-chapter-1"]`)).toBeVisible({
        timeout: 60_000,
      });
      await capturePng(page, 'purchased-report-landing', vp.name);
      await context.close();
    }

    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await prepareCleanCapturePage(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Fixture query opens the chapter without clicking the hub trigger — Clerk
      // keyless UI intercepts that click and navigates to accounts.dev.
      await safeGotoLocal(page, '/dev/dtr-drawer-preview?openPanel=chapter-1');
      await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
      const bodyLocator = page.getByTestId('m55-purchased-report-body');
      await expect(bodyLocator).toBeVisible({ timeout: 30_000 });
      await expect(bodyLocator.getByTestId('m55-report-chapter-heading')).toContainText('の自分の形');
      await expect(page.locator('#drawer-hub-body-chapter-1')).toBeVisible();
      await expect(bodyLocator.getByTestId('m55-method-purchased-report')).toBeVisible();
      await capturePng(page, 'purchased-report-body', vp.name);
      await context.close();
    }
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading input @${vp.name}`, async ({ browser }) => {
    requireLocalDevFixture(`additional reading input @${vp.name}`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await prepareCleanCapturePage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const url =
      '/dev/dtr-drawer-preview?withConsult=1&consultWallet=available&openPanel=consult';
    await safeGotoLocal(page, url);
    await ensureLocalDrawerPreview(page, url);
    await expect(page.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'additional-reading-input', vp.name);
    await context.close();
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading result @${vp.name}`, async ({ browser }) => {
    requireLocalDevFixture(`additional reading result @${vp.name}`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await prepareCleanCapturePage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const url = '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history&openPanel=consult';
    await safeGotoLocal(page, url);
    await ensureLocalDrawerPreview(page, url);
    await expect(page.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[class*="replyCard"]').first()).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'additional-reading-result', vp.name);
    await context.close();
  });
}

for (const vp of VIEWPORTS) {
  test(`saved premium reopen @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`saved premium reopen @${vp.name}`);
    await prepareCleanCapturePage(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await safeGotoLocal(page, '/dev/dtr-drawer-preview?openPanel=summary');
    await expect(page.getByTestId('m55-saved-snapshot-notice')).toBeVisible({ timeout: 60_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'saved-premium-reopen', vp.name);
  });
}

test('print PDF premium states @1280', async ({ browser }) => {
  requireLocalDevFixture('print PDF premium states @1280');
  test.setTimeout(300_000);
  const context = await cleanContext(browser);
  await seedResult(context);
  const page = await context.newPage();
  await prepareCleanCapturePage(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/core');
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
  await page.locator('#core-paid').scrollIntoViewIfNeeded();
  const bridgeHref = await page.getByTestId('m55-paid-bridge-primary').getAttribute('href');
  expect(bridgeHref, 'premium bridge href').toMatch(/\/dtr\/lp/);
  await page.goto(bridgeHref!, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 60_000 });
  await completeQuestionnaire(page);
  await capturePdf(page, 'answer-review');

  await page.getByRole('button', { name: 'この回答でプランを見る' }).click();
  await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 30_000 });
  await capturePdf(page, 'plan-selection');

  await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible({ timeout: 30_000 });
  await capturePdf(page, 'payment-prep');

  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await prepareCleanCapturePage(devPage);
  await safeGotoLocal(devPage, '/dev/dtr-drawer-preview');
  await expect(devPage.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
  await capturePdf(devPage, 'purchased-report-landing');

  const consultUrl =
    '/dev/dtr-drawer-preview?withConsult=1&consultWallet=history&openPanel=consult';
  await safeGotoLocal(devPage, consultUrl);
  await ensureLocalDrawerPreview(devPage, consultUrl);
  await expect(devPage.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
  await expect(devPage.locator('[class*="replyCard"]').first()).toBeVisible({ timeout: 30_000 });
  await capturePdf(devPage, 'additional-reading-result');
  await devContext.close();

  await context.close();
});
