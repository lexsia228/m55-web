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

function requireLocalDevFixture(testName: string) {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error(
      `PREMIUM_EVIDENCE_REQUIRES_LOCAL_DEV: ${testName} requires local dev fixtures; VERCEL_ENV=production blocks /dev routes.`,
    );
  }
}

async function blockClerkTakeover(page: Page) {
  await page.route(/clerk\.accounts\.dev|accounts\.dev|clerk-sync-keyless/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
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
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  }
  for (const locator of capture.visibleContract.forbiddenLocators) {
    await expect(page.locator(locator)).toHaveCount(0);
  }

  const actualUrl = page.url();
  const actualOrigin = new URL(actualUrl).origin;
  expect(actualOrigin, `${capture.captureId}: unexpected origin`).toMatch(LOCAL_ORIGIN_PATTERN);
  const routePath = capture.expectedRoute.split('?')[0];
  expect(actualUrl, `${capture.captureId}: unexpected route`).toContain(routePath);

  return { actualUrl, actualOrigin, target };
}

async function capturePng(page: Page, captureId: string, viewport: PremiumEvidenceViewport) {
  const capture = requireCapture(captureId);
  const { actualUrl, actualOrigin, target } = await assertCaptureContract(page, capture);

  fs.mkdirSync(OUT, { recursive: true });
  const fileName = `${captureId}-${viewport}.png`;
  const filePath = path.join(OUT, fileName);

  if (capture.captureScope === 'element') {
    await expect
      .poll(async () => {
        const box = await target.boundingBox();
        return box ? box.width * box.height : 0;
      })
      .toBeGreaterThan(5_000);
    await target.screenshot({ path: filePath });
  } else {
    await page.screenshot({ path: filePath, fullPage: true });
  }

  const byteLength = fs.statSync(filePath).size;
  expect(byteLength, `${captureId}: implausibly small capture`).toBeGreaterThan(4_000);

  emitCaptureEvent({
    kind: 'png',
    captureId,
    stateId: capture.stateId,
    viewport,
    expectedRoute: capture.expectedRoute,
    actualUrl,
    actualOrigin,
    ownerModule: capture.ownerModule,
    visibleContractDigest: captureContractDigest(capture),
    fileName,
    byteLength,
  });
}

async function capturePdf(page: Page, captureId: string) {
  const capture = requireCapture(captureId);
  if (!capture.printFileName) {
    throw new Error(`PREMIUM_CAPTURE_NOT_PRINTABLE: ${captureId}`);
  }
  const { actualUrl, actualOrigin } = await assertCaptureContract(page, capture);

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
    ownerModule: capture.ownerModule,
    visibleContractDigest: captureContractDigest(capture),
    fileName: capture.printFileName,
    byteLength,
  });
}

async function openDrawerPanel(page: Page, panel: 'chapter-1' | 'consult') {
  await expect(page).toHaveURL(/dtr-drawer-preview/);
  const trigger = page.locator(`[aria-controls="drawer-hub-body-${panel}"]`);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click({ timeout: 20_000 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 20_000 });
  await expect(page.locator(`#drawer-hub-body-${panel}`)).toBeVisible({ timeout: 20_000 });
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
  await expect(page.locator('[data-m55-paid-phase="complete"]')).toBeVisible({ timeout: 20_000 });
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

for (const vp of VIEWPORTS) {
  test(`premium funnel states @${vp.name}`, async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResult(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 30_000,
    });
    await page.locator('#core-paid').scrollIntoViewIfNeeded();
    await assertPremiumAuthority(page);
    await capturePng(page, 'premium-bridge', vp.name);

    await page.getByTestId('m55-paid-bridge-primary').click();
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
    await expect(page.locator('[data-m55-paid-phase="complete"]')).toBeVisible();
    await capturePng(page, 'answer-review', vp.name);

    await page.getByRole('button', { name: '回答を見直す' }).click();
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible();
    await assertDecisionSheet(page);
    await capturePng(page, 'answer-edit', vp.name);

    for (let i = 0; i < 6; i += 1) {
      await page.locator('[role="radio"]').first().click();
      const btn =
        i === 5
          ? page.getByRole('button', { name: '回答を確認する' })
          : page.getByRole('button', { name: '次へ' });
      await btn.click();
    }
    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
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
    await blockClerkTakeover(page);
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
  test(`purchased report fixture @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`purchased report fixture @${vp.name}`);
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('m55-saved-snapshot-notice')).toBeVisible();
    await assertPremiumAuthority(page);
    await capturePng(page, 'purchased-report-landing', vp.name);

    await openDrawerPanel(page, 'chapter-1');
    const bodyLocator = page.getByTestId('m55-purchased-report-body');
    await expect(bodyLocator).toBeVisible({ timeout: 30_000 });
    await expect(bodyLocator.getByTestId('m55-report-chapter-heading')).toContainText('の自分の形');
    await expect(page.locator('#drawer-hub-body-chapter-1')).toBeVisible();
    await capturePng(page, 'purchased-report-body', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading input @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`additional reading input @${vp.name}`);
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=available#consultation-room', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'additional-reading-input', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading result @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`additional reading result @${vp.name}`);
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=history#consultation-room', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[class*="replyCard"]').first()).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'additional-reading-result', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`saved premium reopen @${vp.name}`, async ({ page }) => {
    requireLocalDevFixture(`saved premium reopen @${vp.name}`);
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-saved-snapshot-notice')).toBeVisible({ timeout: 60_000 });
    await assertPremiumAuthority(page);
    await capturePng(page, 'saved-premium-reopen', vp.name);
  });
}

test('print PDF premium states @1280', async ({ browser }) => {
  requireLocalDevFixture('print PDF premium states @1280');
  const context = await cleanContext(browser);
  await seedResult(context);
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/core');
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
  await page.getByTestId('m55-paid-bridge-primary').click();
  await page.waitForURL('**/dtr/lp**');
  await completeQuestionnaire(page);
  await capturePdf(page, 'answer-review');

  await page.getByRole('button', { name: 'プランを選ぶ' }).click();
  await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible();
  await capturePdf(page, 'plan-selection');

  await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
  await capturePdf(page, 'payment-prep');

  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await blockClerkTakeover(devPage);
  await devPage.goto('/dev/dtr-drawer-preview', { timeout: 60_000, waitUntil: 'domcontentloaded' });
  await expect(devPage.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
  await capturePdf(devPage, 'purchased-report-landing');

  await devPage.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=history#consultation-room', {
    timeout: 60_000,
    waitUntil: 'domcontentloaded',
  });
  await expect(devPage.locator('[class*="replyCard"]').first()).toBeVisible({ timeout: 30_000 });
  await capturePdf(devPage, 'additional-reading-result');
  await devContext.close();

  await context.close();
});
