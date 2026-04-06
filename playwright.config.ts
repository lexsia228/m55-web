import { defineConfig, devices } from '@playwright/test';

/**
 * ローカル: `npm run dev` を別ターミナルで起動してから
 *   `npx playwright test e2e/home-core-visual.spec.ts`
 * または本設定の webServer に任せる:
 *   `npm run test:e2e:visual`
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    locale: 'ja-JP',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npx next dev -p 3000 -H 127.0.0.1',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
