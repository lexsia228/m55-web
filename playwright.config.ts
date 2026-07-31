import { defineConfig, devices } from '@playwright/test';
import { buildCleanCaptureServerEnv } from './scripts/m55-e2e-clean-capture-env.mjs';

/**
 * Governed commercial / Premium capture suites require:
 *   M55_E2E_CLEAN_CAPTURE=1
 * which loads gitignored local Clerk test keys, disables Clerk keyless UI, and
 * starts Next with `devIndicators: false` (via next.config.mjs + clean env).
 *
 * Clean server command (also recorded by the Premium evidence runner):
 *   M55_E2E_CLEAN_CAPTURE=1 node scripts/run-m55-e2e-clean-dev.mjs -p 3000
 */
export const M55_E2E_CLEAN_SERVER_COMMAND =
  'M55_E2E_CLEAN_CAPTURE=1 node scripts/run-m55-e2e-clean-dev.mjs -p 3000';

const cleanCaptureRequested = process.env.M55_E2E_CLEAN_CAPTURE === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const healthURL = `${baseURL}/api/diagnostics/env`;

const webServerEnvRaw = cleanCaptureRequested
  ? buildCleanCaptureServerEnv(process.env)
  : {
      ...process.env,
      NEXT_DISABLE_DEV_INDICATOR: '1',
    };
const webServerEnv = Object.fromEntries(
  Object.entries(webServerEnvRaw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
);

const skipWebServer = Boolean(process.env.PLAYWRIGHT_SKIP_WEBSERVER || process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Keep Playwright's auto-cleared artifact root off the governed candidate pack.
  outputDir: 'test-results/playwright-run',
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
  webServer: skipWebServer
    ? undefined
    : cleanCaptureRequested
      ? {
          command: 'node scripts/run-m55-e2e-clean-dev.mjs -p 3000',
          url: 'http://127.0.0.1:3000/api/diagnostics/env',
          reuseExistingServer: false,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: webServerEnv,
        }
      : {
          command: 'npx next dev -p 3000 -H 127.0.0.1',
          url: healthURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: webServerEnv,
        },
});
