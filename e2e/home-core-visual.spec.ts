import { test, expect, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots', 'required');

async function addInitScriptSeedGuestProfile(context: BrowserContext) {
  await context.addInitScript(() => {
    const id = 'playwright-home-core-visual';
    localStorage.setItem('m55_device_id_v1', id);
    localStorage.setItem(
      `m55_profile_v1_${id}`,
      JSON.stringify({ nickname: '試験', birthDate: '1990-05-15' }),
    );
  });
}

test.describe.serial('Home / Core 必須スクリーンショット（5状態）', () => {
  test('01 /home 鑑定前', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/home');
    await expect(page.getByTestId('m55-home-hero')).toBeVisible();
    await expect(page.getByTestId('m55-home-lower')).toBeVisible();
    await expect(page.getByTestId('m55-home-product-map')).toBeVisible();
    await expect(page.getByTestId('m55-home-open-birth-intake')).toBeVisible();
    await expect(page.getByTestId('m55-home-premium-preview')).toBeVisible();
    await expect(page.locator('[data-m55-public-shell]')).toHaveAttribute(
      'data-m55-archetype',
      'PUBLIC_POSTER',
    );
    await page.screenshot({ path: path.join(OUT, '01-home-before-profile.png'), fullPage: true });
  });

  test('02 /home 鑑定後（個人結果ブロックなし）', async ({ page, context }) => {
    await addInitScriptSeedGuestProfile(context);
    await page.goto('/home');
    await expect(page.getByTestId('m55-home-lower')).toBeVisible();
    await expect(page.getByTestId('m55-home-has-profile-hero')).toBeVisible();
    await expect(page.getByTestId('m55-home-premium-preview')).toBeVisible();
    await expect(page.getByText('今の焦点')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '今日の観測' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '今週の観測' })).toHaveCount(0);
    await page.screenshot({ path: path.join(OUT, '02-home-after-profile.png'), fullPage: true });
  });

  test('03 /core 未保存（ホームへ戻る案内）', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-locked')).toBeVisible({ timeout: 20_000 });
    const homeLink = page.getByTestId('m55-core-locked-home-link');
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/home');
    await expect(homeLink).toContainText('ホームへ戻る');
    await expect(page.locator('[data-m55-public-shell]')).toHaveAttribute(
      'data-m55-archetype',
      'GUIDED_FREE_FLOW',
    );
    await page.screenshot({ path: path.join(OUT, '03-core-locked.png'), fullPage: true });
  });

  test('04 解析中オーバーレイ → 05 /core 保存後先頭', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/home');
    await page.getByTestId('m55-home-open-birth-intake').click();
    await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
    await page.getByPlaceholder('表示名').fill('試験');
    await page.locator('input[type="date"]').fill('1990-05-15');
    await page.getByTestId('m55-birth-intake-start').click();
    await expect(page.getByTestId('m55-core-analysis-loading')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, '04-analyzing-overlay.png'), fullPage: true });

    // Stable follow-up: seed guest profile and open guided free flow (ECP GUIDED_FREE_FLOW).
    await context.addInitScript(() => {
      const id = 'playwright-home-core-visual-q';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1990-05-15' }),
      );
    });
    await page.goto('/core');
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('m55-free-continuous-progress')).toContainText('1 / 5');
    await expect(page.locator('[data-m55-public-shell]')).toHaveAttribute(
      'data-m55-archetype',
      'GUIDED_FREE_FLOW',
    );
    await page.screenshot({ path: path.join(OUT, '05-core-after-save.png'), fullPage: true });
  });
});
