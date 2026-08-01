import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots', 'experience-control-plane');
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow, 'horizontal overflow').toBe(false);
}

async function assertEcpShell(page: Page, archetype: string) {
  const shell = page.locator('[data-m55-public-shell][data-m55-ecp="v2"]');
  await expect(shell).toHaveAttribute('data-m55-archetype', archetype);
  await expect(shell).toHaveAttribute('data-m55-print-mode', /.+/);
}

test.describe('Experience Control Plane visual matrix', () => {
  for (const vp of VIEWPORTS) {
    test(`home poster @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/home');
      await expect(page.getByTestId('m55-home-hero')).toBeVisible();
      await assertEcpShell(page, 'PUBLIC_POSTER');
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(OUT, `home-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`pricing decision @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/pricing');
      await expect(page.getByRole('heading', { name: '料金とプラン' })).toBeVisible();
      await assertEcpShell(page, 'PRODUCT_DECISION');
      await assertNoHorizontalOverflow(page);
      const primaryLinks = page.locator('main a.m55-exp-btn-commercial, main a[class*="primary"], main a[href="/dtr/lp"]');
      await expect(primaryLinks.first()).toBeVisible();
      await page.screenshot({
        path: path.join(OUT, `pricing-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`how-m55-works editorial @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/how-m55-works');
      await assertEcpShell(page, 'PUBLIC_EDITORIAL');
      await assertNoHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(OUT, `how-m55-works-${vp.name}.png`),
        fullPage: true,
      });
    });
  }

  test('header variant below 960 keeps auth in menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/home');
    await expect(page.locator('.desktopAuth')).toBeHidden();
    await expect(page.getByRole('button', { name: 'メニュー' })).toBeVisible();
  });

  test('core guided archetype after profile seed', async ({ page, context }) => {
    await context.addInitScript(() => {
      const id = 'playwright-ecp-core';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1990-05-15' }),
      );
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/core');
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-m55-public-shell][data-m55-ecp="v2"]')).toHaveAttribute(
      'data-m55-archetype',
      'GUIDED_FREE_FLOW',
      { timeout: 10_000 },
    );
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(OUT, 'core-question-390.png'), fullPage: true });
  });

  test('shared entry fallback archetype', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/r/invalid-token-for-ecp');
    await expect(page.getByTestId('m55-shared-entry-fallback')).toBeVisible();
    await assertEcpShell(page, 'SHARED_SOCIAL_ENTRY');
    await expect(page.getByTestId('m55-shared-entry-cta')).toHaveText('自分も無料で見る');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(OUT, 'shared-entry-768.png'), fullPage: true });
  });

  test('dtr/lp product decision default', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dtr/lp');
    await assertEcpShell(page, 'PRODUCT_DECISION');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(OUT, 'dtr-lp-1280.png'), fullPage: true });
  });

  test('print PDF samples for key archetypes', async ({ page }) => {
    const pdfDir = path.join(OUT, 'pdf');
    const routes: Array<{ path: string; name: string; archetype: string }> = [
      { path: '/home', name: 'home', archetype: 'PUBLIC_POSTER' },
      { path: '/pricing', name: 'pricing', archetype: 'PRODUCT_DECISION' },
      { path: '/how-m55-works', name: 'how-m55-works', archetype: 'PUBLIC_EDITORIAL' },
      { path: '/r/invalid-token-for-ecp', name: 'shared-entry', archetype: 'SHARED_SOCIAL_ENTRY' },
      { path: '/ten-views', name: 'ten-views', archetype: 'PUBLIC_EDITORIAL' },
      { path: '/core', name: 'core-empty', archetype: 'GUIDED_FREE_FLOW' },
    ];
    for (const route of routes) {
      await page.goto(route.path);
      await assertEcpShell(page, route.archetype);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' },
      });
      expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
      expect(pdf.byteLength).toBeGreaterThan(3_000);
      fs.mkdirSync(pdfDir, { recursive: true });
      fs.writeFileSync(path.join(pdfDir, `${route.name}.pdf`), pdf);
    }
  });

  test('responsive structural matrix — no overflow / header mode', async ({ page }) => {
    const widths = [320, 390, 768, 959, 960, 1024, 1280, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pricing');
      await assertEcpShell(page, 'PRODUCT_DECISION');
      await assertNoHorizontalOverflow(page);
      if (width < 960) {
        await expect(page.locator('[data-testid="m55-desktop-auth"]')).toBeHidden();
        await expect(page.getByRole('button', { name: /メニュー/ })).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="m55-desktop-auth"]')).toBeVisible();
      }
      await expect(page.getByRole('heading', { name: '料金とプラン' })).toBeVisible();
    }
  });

  test('editorial free result archetype after seed', async ({ page, context }) => {
    await context.addInitScript(() => {
      const id = 'playwright-ecp-result';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1990-05-15' }),
      );
      const answers = {
        'free.start_style': 'A',
        'free.decision_tempo': 'A',
        'free.relation_distance': 'A',
        'free.recovery_mode': 'A',
        'free.expression_mode': 'A',
      };
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          basicInfo: { nickname: '試験', birthDate: '1990-05-15' },
          freeAnswers: answers,
          paidAnswers: null,
          freeResultFingerprint: 'ecp-seed',
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(answers));
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/core');
    // Result or questionnaire both under ECP; prefer result when seed admits it.
    const shell = page.locator('[data-m55-public-shell][data-m55-ecp="v2"]');
    await expect(shell).toBeVisible({ timeout: 20_000 });
    const archetype = await shell.getAttribute('data-m55-archetype');
    expect(['EDITORIAL_FREE_RESULT', 'GUIDED_FREE_FLOW']).toContain(archetype);
    await assertNoHorizontalOverflow(page);
    await page.locator('[data-testid="m55-core-essence"], [data-testid="m55-free-questionnaire"]').first().screenshot({
      path: path.join(OUT, 'core-result-or-guided-390.png'),
    });
  });
});
