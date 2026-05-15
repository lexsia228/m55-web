import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'e2e', 'screenshots');

async function openCoreViaHomeFlow(page: Page, nickname: string) {
  await page.goto('/home');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/home');
  await page.getByTestId('m55-home-open-birth-intake').click();
  await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
  await page.getByPlaceholder('表示名').fill(nickname);
  await page.locator('input[type="date"]').fill('1983-02-28');
  await page.getByRole('button', { name: '保存して開く' }).click();
  await page.waitForURL('**/core', { timeout: 15_000 });
  await expect(page.getByTestId('m55-core-locked')).toHaveCount(0);
}

test('core final check screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await openCoreViaHomeFlow(page, 'push前最終確認');
  await expect(page.getByRole('heading', { name: '傾向の輪郭' })).toBeVisible();

  await page.waitForTimeout(240);
  await page.screenshot({
    path: path.join(OUT_DIR, 'core-final-check-1-initial.png'),
    fullPage: false,
  });

  const readsHeading = page.getByRole('heading', { name: /M55は、.+の傾向をこう読みます/ });
  await readsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(260);
  await page.screenshot({
    path: path.join(OUT_DIR, 'core-final-check-2-middle.png'),
    fullPage: false,
  });

  const ctaHeading = page.getByRole('heading', { name: 'Entry Report' });
  await ctaHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(260);
  await page.screenshot({
    path: path.join(OUT_DIR, 'core-final-check-3-lower-cta.png'),
    fullPage: false,
  });
});
