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

test.describe('core push screenshots (3 bands)', () => {
  test('full page + 3 vertical bands for push review', async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    await openCoreViaHomeFlow(page, 'push前スクショ');

    await expect(page.getByRole('heading', { name: '傾向の輪郭' })).toBeVisible();
    await page.waitForTimeout(500);

    const totalH = await page.evaluate(() => document.documentElement.scrollHeight);
    const vw = page.viewportSize()?.width ?? 1280;
    const vh = page.viewportSize()?.height ?? 900;

    await page.screenshot({
      path: path.join(OUT_DIR, 'core-fullpage-push.png'),
      fullPage: true,
    });

    const bandH = Math.ceil(totalH / 3);
    const clipH = Math.min(bandH, vh);

    for (let i = 0; i < 3; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * bandH);
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(
          OUT_DIR,
          i === 0
            ? 'core-push-band-1-upper-poster-radar.png'
            : i === 1
              ? 'core-push-band-2-middle-reads-5axis.png'
              : 'core-push-band-3-lower-ai-entry-cta.png',
        ),
        clip: { x: 0, y: 0, width: vw, height: clipH },
      });
    }
  });
});
