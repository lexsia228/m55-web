import { defineConfig, devices } from '@playwright/test';
import { buildCleanCaptureServerEnv } from './scripts/m55-e2e-clean-capture-env.mjs';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const healthURL = `${baseURL}/api/diagnostics/env`;

/**
 * Governed commercial / Premium capture suites require:
 *   M55_E2E_CLEAN_CAPTURE=1
 * which loads gitignored local Clerk test keys and disables keyless + Next
 * development chrome at process level (fail-before-mutation).
 *
 * ローカル: `M55_E2E_CLEAN_CAPTURE=1 npx playwright test e2e/...`
 * または webServer に任せる（同フラグ必須）。
 */
const cleanCaptureRequested = process.env.M55_E2E_CLEAN_CAPTURE === '1';
const webServerEnvRaw = cleanCaptureRequested
  ? buildCleanCaptureServerEnv(process.env)
  : {
      ...process.env,
      NEXT_DISABLE_DEV_INDICATOR: '1',
    };
const webServerEnv = Object.fromEntries(
  Object.entries(webServerEnvRaw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 900 },
    locale: 'ja-JP',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER || process.env.PLAYWRIGHT_BASE_URL
      ? undefined
      : {
          command: 'npx next dev -p 3000 -H 0.0.0.0',
          url: healthURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: webServerEnv,
        },
});
