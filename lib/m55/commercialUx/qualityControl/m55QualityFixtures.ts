/**
 * Deterministic localhost fixtures for commercial-quality setups.
 * Invoked only from executable setups under clean-capture E2E.
 * Never available on Preview/Production. Never fabricates Prod users.
 */
import type { Page } from '@playwright/test';

const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

/** Fixture-owned auth-gate marker — never written by the generic runner. */
export const AUTH_GATE_FIXTURE_SELECTOR = '[data-testid="m55-cq-auth-gate-fixture"]' as const;
export const AUTH_GATE_FIXTURE_ATTR = '[data-m55-cq-fixture="auth_gate"]' as const;

export function requireLocalhostQualityFixture(label: string): void {
  if (process.env.M55_E2E_CLEAN_CAPTURE !== '1') {
    throw new Error(`STOP_FIXTURE_SCOPE: ${label} requires M55_E2E_CLEAN_CAPTURE=1`);
  }
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    throw new Error(`STOP_FIXTURE_SCOPE: ${label} is unavailable on Preview/Production`);
  }
}

export type AuthGateFixtureMode = 'exact' | 'missing_state' | 'wrong_state' | 'ambiguous';

function authGateFixtureHtml(
  path: string,
  runtimeStateId: string,
  mode: AuthGateFixtureMode = 'exact',
): string {
  const safeState = runtimeStateId.replace(/"/g, '');
  const wrongState = 'ecp:public.pricing:default';
  let mainInner = '';
  if (mode === 'missing_state') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture">localhost auth-gate fixture missing state for ${path}</main>`;
  } else if (mode === 'wrong_state') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${wrongState}">localhost auth-gate fixture wrong state for ${path}</main>`;
  } else if (mode === 'ambiguous') {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${safeState}">primary</main><aside data-m55-cq-state-id="${wrongState}">secondary</aside>`;
  } else {
    mainInner = `<main data-testid="m55-cq-auth-gate-fixture" data-m55-cq-state-id="${safeState}">localhost auth-gate fixture for ${path} (${safeState})</main>`;
  }
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>M55 localhost auth-gate fixture</title></head>
<body data-m55-cq-fixture="auth_gate" data-m55-cq-auth-gate="1" data-m55-cq-fixture-path="${path}">
${mainInner}
</body>
</html>`;
}

/**
 * Production-blocked localhost auth-gate fixture.
 * External accounts.dev / Clerk navigation is intercepted and never accepted
 * as the registered runtime state proof. Each registration embeds a unique
 * state-specific marker (data-m55-cq-state-id).
 */
export async function establishLocalAuthGateFixture(
  page: Page,
  baseURL: string,
  path: string,
  runtimeStateId: string,
  mode: AuthGateFixtureMode = 'exact',
): Promise<void> {
  requireLocalhostQualityFixture('auth_gate');
  if (!runtimeStateId.trim()) {
    throw new Error('STOP_FIXTURE_SCOPE: auth_gate requires a state-specific runtimeStateId');
  }
  const origin = new URL(baseURL).origin;
  const targetPathname = new URL(path, baseURL).pathname;
  const targetUrl = new URL(path, baseURL).toString();
  const stateSelector = `[data-m55-cq-state-id="${runtimeStateId.replace(/"/g, '')}"]`;

  await page.route('**/*', async (route) => {
    const reqUrl = route.request().url();
    let pathname = '';
    try {
      pathname = new URL(reqUrl).pathname;
    } catch {
      await route.abort();
      return;
    }
    const isExternalIdp = /accounts\.dev|clerk\./i.test(reqUrl);
    const isLocalProtected =
      reqUrl.startsWith(origin) &&
      (pathname === targetPathname || /\/sign-in|\/sign-up/i.test(pathname));
    if (isExternalIdp || isLocalProtected) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: authGateFixtureHtml(path, runtimeStateId, mode),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (/accounts\.dev/i.test(page.url())) {
    throw new Error(
      `STOP_FIXTURE_SCOPE: external auth navigation is not accepted as state proof (${page.url()})`,
    );
  }
  if (!page.url().startsWith(origin)) {
    throw new Error(`STOP_FIXTURE_SCOPE: auth-gate fixture left localhost (${page.url()})`);
  }
  await page.locator(AUTH_GATE_FIXTURE_SELECTOR).waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator(AUTH_GATE_FIXTURE_ATTR).waitFor({ state: 'attached', timeout: 5_000 });
  if (mode === 'exact') {
    await page.locator(stateSelector).waitFor({ state: 'visible', timeout: 5_000 });
  }
}

export async function seedBasicInfoOnly(page: Page, deviceId = 'playwright-cq-setup'): Promise<void> {
  await page.context().addInitScript(
    ({ id }) => {
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1983-02-28' }),
      );
      sessionStorage.removeItem('m55_self_funnel_v1');
      sessionStorage.removeItem('m55_free_answers_v1');
    },
    { id: deviceId },
  );
}

export async function seedCompleteFreeAnswers(page: Page, deviceId = 'playwright-cq-setup'): Promise<void> {
  await page.context().addInitScript(
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

export async function gotoLocal(page: Page, baseURL: string, path: string): Promise<void> {
  const url = new URL(path, baseURL).toString();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const transient =
        /Timeout \d+ms exceeded/i.test(message) ||
        /ERR_CONNECTION_REFUSED/i.test(message) ||
        /ERR_CONNECTION_RESET/i.test(message) ||
        /Navigation .* interrupted/i.test(message);
      if (!transient || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  if (lastError) throw lastError;
  if (/accounts\.dev/i.test(page.url())) {
    throw new Error(`STOP_FIXTURE_SCOPE: external navigation to ${page.url()}`);
  }
}

export async function establishCoreResult(page: Page, baseURL: string): Promise<void> {
  const existing = page.locator('[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]');
  if ((await existing.count()) > 0 && /\/core/.test(page.url())) {
    return;
  }
  await seedCompleteFreeAnswers(page);
  await gotoLocal(page, baseURL, '/core');
  const phase = page.locator('[data-testid="m55-core-essence"]');
  await phase.waitFor({ state: 'visible', timeout: 30_000 });
  const attr = await phase.getAttribute('data-m55-ux-phase');
  if (attr !== 'RESULT') {
    throw new Error(`STOP_FIXTURE_SCOPE: expected RESULT phase, got ${attr}`);
  }
}

export async function establishPremiumPlans(page: Page, baseURL: string): Promise<void> {
  if ((await page.getByTestId('m55-dtr-plan-selection').count()) > 0 && /\/dtr\/lp/.test(page.url())) {
    return;
  }
  if ((await page.getByTestId('m55-paid-questionnaire-active').count()) > 0) {
    for (let i = 0; i < 6; i += 1) {
      await page.locator('[role="radio"]').first().click();
      await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
    }
    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
    await page.getByTestId('m55-dtr-plan-selection').waitFor({ state: 'visible', timeout: 30_000 });
    return;
  }
  await establishCoreResult(page, baseURL);
  const bridge = page.getByTestId('m55-paid-bridge-primary');
  await bridge.scrollIntoViewIfNeeded();
  const href = await bridge.getAttribute('href');
  await bridge.click();
  try {
    await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
  } catch {
    if (!href) throw new Error('STOP_FIXTURE_SCOPE: bridge has no href');
    await gotoLocal(page, baseURL, href);
  }
  await page.getByTestId('m55-paid-questionnaire-active').waitFor({ state: 'visible', timeout: 30_000 });
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[role="radio"]').first().click();
    await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
  }
  await page.getByRole('button', { name: 'プランを選ぶ' }).click();
  await page.getByTestId('m55-dtr-plan-selection').waitFor({ state: 'visible', timeout: 30_000 });
}

export async function establishCheckoutPrep(page: Page, baseURL: string): Promise<void> {
  if ((await page.locator('[data-m55-paid-phase="checkout"]').count()) > 0) {
    return;
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await establishPremiumPlans(page, baseURL);
      const planLightCta = page.getByTestId('m55-dtr-plan-light').getByRole('button');
      await planLightCta.waitFor({ state: 'visible', timeout: 30_000 });
      await planLightCta.scrollIntoViewIfNeeded();
      await planLightCta.click();
      await page
        .locator('[data-m55-paid-phase="checkout"]')
        .waitFor({ state: 'visible', timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      await gotoLocal(page, baseURL, '/core').catch(() => undefined);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`STOP_FIXTURE_SCOPE: checkout prep failed (${String(lastError)})`);
}

export async function establishPurchasedReport(page: Page, baseURL: string): Promise<void> {
  requireLocalhostQualityFixture('purchased_report');
  await gotoLocal(page, baseURL, '/dev/dtr-drawer-preview?openPanel=chapter-1');
}

export async function establishSignedOutAccountMenu(page: Page, baseURL: string): Promise<void> {
  requireLocalhostQualityFixture('signed_out_account_menu');
  await gotoLocal(page, baseURL, '/my');
  await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 });
}
