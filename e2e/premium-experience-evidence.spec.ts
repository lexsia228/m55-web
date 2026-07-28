/**
 * Premium Experience SSOT — visual + print evidence (fixture/dev paths only).
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots', 'premium-experience-ssot');
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
] as const;

const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

const COMPLETE_PAID = {
  'paid.work_focus': 'paid.work_focus.priority',
  'paid.decision_friction': 'paid.decision_friction.too_many',
  'paid.relation_focus': 'paid.relation_focus.words',
  'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
  'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
  'paid.restart_condition': 'paid.restart_condition.overview_first',
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

async function shot(page: Page, name: string, vp: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}-${vp}.png`), fullPage: true });
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

test.describe.configure({ mode: 'serial', timeout: 120_000 });

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
    await shot(page, 'premium-bridge', vp.name);

    await page.getByTestId('m55-paid-bridge-primary').click();
    await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 60_000 });
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await assertDecisionSheet(page);
    await shot(page, 'premium-q1', vp.name);

    for (let i = 0; i < 4; i += 1) {
      await page.locator('[role="radio"]').first().click();
      await page.getByRole('button', { name: '次へ' }).click();
    }
    await shot(page, 'premium-q5', vp.name);
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: '次へ' }).click();
    await shot(page, 'premium-q6', vp.name);
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: '回答を確認する' }).click();
    await expect(page.locator('[data-m55-paid-phase="complete"]')).toBeVisible();
    await shot(page, 'answer-review', vp.name);

    await page.getByRole('button', { name: '回答を見直す' }).click();
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible();
    await expect(page.locator('[data-m55-paid-answer-edit="true"]')).toBeVisible();
    await assertDecisionSheet(page);
    await shot(page, 'answer-edit', vp.name);

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
    await shot(page, 'plan-selection', vp.name);

    await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
    await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
    await assertDecisionSheet(page);
    await shot(page, 'payment-prep', vp.name);

    await context.close();
  });
}

for (const vp of VIEWPORTS) {
  test(`premium share card @${vp.name}`, async ({ page }) => {
    test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/premium-share-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-m55-dev-preview="premium-share"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('m55-premium-experience-share')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('m55-premium-result-share')).toBeVisible();
    await assertPremiumAuthority(page);
    await assertDecisionSheet(page);
    await shot(page, 'premium-share-card', vp.name);
  });
}

async function blockClerkTakeover(page: Page) {
  await page.route(/clerk\.accounts\.dev|accounts\.dev|clerk-sync-keyless/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
}

async function assertFixtureOrigin(page: Page, fixturePath: string) {
  await expect(page).toHaveURL(new RegExp(fixturePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const origin = new URL(page.url()).origin;
  expect(origin).toMatch(/localhost|127\.0\.0\.1/);
}

async function captureElementEvidence(page: Page, locatorSelector: string, name: string, vp: string) {
  const locator = page.locator(locatorSelector);
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return box ? box.width * box.height : 0;
    })
    .toBeGreaterThan(5_000);
  fs.mkdirSync(OUT, { recursive: true });
  const filePath = path.join(OUT, `${name}-${vp}.png`);
  await locator.screenshot({ path: filePath });
  const size = fs.statSync(filePath).size;
  expect(size).toBeGreaterThan(8_000);
  return filePath;
}

for (const vp of VIEWPORTS) {
  test(`purchased report fixture @${vp.name}`, async ({ page }) => {
    test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await assertFixtureOrigin(page, '/dev/dtr-drawer-preview');
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('m55-saved-snapshot-notice')).toBeVisible();
    await assertPremiumAuthority(page);
    await shot(page, 'purchased-report-landing', vp.name);
    await openDrawerPanel(page, 'chapter-1');
    await assertFixtureOrigin(page, '/dev/dtr-drawer-preview');
    const bodyLocator = page.getByTestId('m55-purchased-report-body');
    await expect(bodyLocator).toBeVisible({ timeout: 30_000 });
    await expect(bodyLocator.getByRole('heading', { level: 2 })).toContainText('の自分の形');
    await expect(page.locator('.reportRoot, [data-m55-dtr-scroll-root="true"]')).toBeVisible();
    await captureElementEvidence(page, '[data-testid="m55-purchased-report-body"]', 'purchased-report-body', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading input @${vp.name}`, async ({ page }) => {
    test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=available#consultation-room', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#consult-step-1')).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await shot(page, 'additional-reading-input', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`additional reading result @${vp.name}`, async ({ page }) => {
    test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=history#consultation-room', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[class*="replyCard"]').first()).toBeVisible({ timeout: 30_000 });
    await assertPremiumAuthority(page);
    await shot(page, 'additional-reading-result', vp.name);
  });
}

for (const vp of VIEWPORTS) {
  test(`saved premium reopen @${vp.name}`, async ({ page }) => {
    test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
    await blockClerkTakeover(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dev/dtr-drawer-preview', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-saved-snapshot-notice')).toBeVisible({ timeout: 60_000 });
    await assertPremiumAuthority(page);
    await shot(page, 'saved-premium-reopen', vp.name);
  });
}

test('print PDF premium states @1280', async ({ browser }) => {
  const context = await cleanContext(browser);
  await seedResult(context);
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const pdfDir = path.join(OUT, 'pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  await page.goto('/core');
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
  await page.getByTestId('m55-paid-bridge-primary').click();
  await page.waitForURL('**/dtr/lp**');
  await completeQuestionnaire(page);
  fs.writeFileSync(
    path.join(pdfDir, 'answer-review.pdf'),
    await page.pdf({ format: 'A4', printBackground: true }),
  );

  await page.getByRole('button', { name: 'プランを選ぶ' }).click();
  await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible();
  fs.writeFileSync(
    path.join(pdfDir, 'plan-selection.pdf'),
    await page.pdf({ format: 'A4', printBackground: true }),
  );

  await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
  fs.writeFileSync(
    path.join(pdfDir, 'payment-prep.pdf'),
    await page.pdf({ format: 'A4', printBackground: true }),
  );

  if (process.env.VERCEL_ENV !== 'production') {
    const devContext = await browser.newContext();
    const devPage = await devContext.newPage();
    await blockClerkTakeover(devPage);
    await devPage.goto('/dev/dtr-drawer-preview', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(devPage.locator('[class*="premiumHero"]').first()).toBeVisible({ timeout: 60_000 });
    fs.writeFileSync(
      path.join(pdfDir, 'purchased-report.pdf'),
      await devPage.pdf({ format: 'A4', printBackground: true }),
    );

    await devPage.goto('/dev/dtr-drawer-preview?withConsult=1&consultWallet=history#consultation-room', {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    await expect(devPage.locator('#drawer-hub-body-consult')).toBeVisible({ timeout: 30_000 });
    await devPage.waitForTimeout(1000);
    fs.writeFileSync(
      path.join(pdfDir, 'additional-reading-result.pdf'),
      await devPage.pdf({ format: 'A4', printBackground: true }),
    );
    await devContext.close();
  }

  await context.close();
});
