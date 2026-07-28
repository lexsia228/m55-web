/**
 * Premium Experience SSOT — visual evidence (fixture/dev paths only).
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

async function assertPremiumTier(page: Page) {
  const tier = page.locator('[data-m55-experience-tier="PREMIUM"]');
  await expect(tier.first()).toBeVisible();
  await expect(tier.first()).toHaveAttribute(
    'data-m55-visual-authority',
    'premium.experience.home_editorial_sample_v1',
  );
}

async function shot(page: Page, name: string, vp: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}-${vp}.png`), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

for (const vp of VIEWPORTS) {
  test(`premium funnel visual authority @${vp.name}`, async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResult(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 20_000,
    });
    await page.locator('#core-paid').scrollIntoViewIfNeeded();
    await assertPremiumTier(page);
    await shot(page, 'premium-bridge', vp.name);

    await page.getByTestId('m55-paid-bridge-primary').click();
    await page.waitForURL('**/dtr/lp**');
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 20_000 });
    await assertPremiumTier(page);
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

    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
    await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible();
    await shot(page, 'plan-selection', vp.name);

    await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
    await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
    await shot(page, 'payment-prep', vp.name);

    await context.close();
  });
}

test('purchased fixture surfaces @1280', async ({ page }) => {
  test.skip(process.env.VERCEL_ENV === 'production', 'dev fixtures blocked on production');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dev/dtr-drawer-preview?withConsult=1');
  await expect(page.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 30_000 });
  await assertPremiumTier(page);
  await shot(page, 'purchased-report', '1280');
});

test('print PDF premium states @1280', async ({ browser }) => {
  const context = await cleanContext(browser);
  await context.addInitScript(
    ({ free, paid }) => {
      const id = 'playwright-premium-pdf';
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
          committedFreeAnswers: free,
          freeResultFingerprint: `ffp1|試験|1983-02-28|${payload}`,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_paid_answers_v1', JSON.stringify(paid));
    },
    {
      free: COMPLETE_FREE,
      paid: {
        'paid.work_focus': 'paid.work_focus.priority',
        'paid.decision_friction': 'paid.decision_friction.too_many',
        'paid.relation_focus': 'paid.relation_focus.words',
        'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
        'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
        'paid.restart_condition': 'paid.restart_condition.overview_first',
      },
    },
  );
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const pdfDir = path.join(OUT, 'pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  await page.goto('/dtr/lp');
  await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 20_000 });
  const planPdf = await page.pdf({ format: 'A4', printBackground: true });
  fs.writeFileSync(path.join(pdfDir, 'plan-selection.pdf'), planPdf);

  await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible();
  const checkoutPdf = await page.pdf({ format: 'A4', printBackground: true });
  fs.writeFileSync(path.join(pdfDir, 'payment-prep.pdf'), checkoutPdf);

  if (process.env.VERCEL_ENV !== 'production') {
    const devContext = await browser.newContext();
    const devPage = await devContext.newPage();
    await devPage.goto('/dev/dtr-drawer-preview', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(devPage.locator('[data-m55-dev-preview="dtr-drawer"]')).toBeVisible({ timeout: 60_000 });
    const reportPdf = await devPage.pdf({ format: 'A4', printBackground: true });
    fs.writeFileSync(path.join(pdfDir, 'purchased-report.pdf'), reportPdf);
    await devContext.close();
  }

  await context.close();
});
