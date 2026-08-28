/**
 * Localhost-only deterministic fixtures for commercial quality smoke.
 *
 * Enabled only under M55_E2E_CLEAN_CAPTURE=1. Never used on Preview/Production.
 * No query/cookie/storage bypass of Production entitlements — purchased states
 * use the /dev drawer preview, which is blocked outside local clean-capture.
 */
import { expect, type BrowserContext, type Page } from '@playwright/test';

import { requireCleanCaptureEnvironment, safeGotoLocal } from './cleanCaptureEnvironment';

const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

export function requireLocalhostQualityFixture(label: string): void {
  requireCleanCaptureEnvironment(label);
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    throw new Error(`STOP_FIXTURE_SCOPE: ${label} fixtures are localhost-only`);
  }
}

export async function seedCompleteFreeAnswers(
  context: BrowserContext,
  deviceId = 'playwright-cq-fixture',
): Promise<void> {
  await context.addInitScript(
    ({ free, id }) => {
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
          draftFreeAnswers: free,
          committedFreeAnswers: free,
          freeResultFingerprint: `ffp1|試験|1983-02-28|${payload}`,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(free));
    },
    { free: COMPLETE_FREE, id: deviceId },
  );
}

export async function openCoreFreeResult(page: Page, baseURL: string): Promise<void> {
  await safeGotoLocal(page, new URL('/core', baseURL).toString());
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
}

export async function reachPremiumQuestionnaire(page: Page, baseURL: string): Promise<void> {
  await openCoreFreeResult(page, baseURL);
  const bridgeCta = page.getByTestId('m55-paid-bridge-primary');
  await bridgeCta.scrollIntoViewIfNeeded();
  const href = await bridgeCta.getAttribute('href');
  await bridgeCta.click();
  try {
    await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 20_000 });
  } catch {
    if (!href) throw new Error('premium bridge CTA has no href');
    await safeGotoLocal(page, new URL(href, baseURL).toString());
  }
  await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });
}

export async function completePremiumQuestionnaire(page: Page): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
  }
}

export async function reachPlanSelection(page: Page, baseURL: string): Promise<void> {
  await reachPremiumQuestionnaire(page, baseURL);
  await completePremiumQuestionnaire(page);
  await page.getByRole('button', { name: 'プランを選ぶ' }).click();
  await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 30_000 });
}

export async function reachCheckoutPrep(page: Page, baseURL: string): Promise<void> {
  await reachPlanSelection(page, baseURL);
  await page.getByTestId('m55-dtr-plan-light').getByRole('button').click();
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible({ timeout: 30_000 });
}

export async function openPurchasedDevDrawer(
  page: Page,
  baseURL: string,
  query = 'openPanel=chapter-1',
): Promise<void> {
  requireLocalhostQualityFixture('purchased-dev-drawer');
  const path = `/dev/dtr-drawer-preview${query ? `?${query}` : ''}`;
  await safeGotoLocal(page, new URL(path, baseURL).toString());
}

export const JAPANESE_COMPREHENSION_HOME_VIEWPORTS = [
  { label: '320' as const, width: 320, height: 640 },
  { label: '390' as const, width: 390, height: 844 },
  { label: 'desktop' as const, width: 1280, height: 800 },
];
