import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  M55_METHOD_CANONICAL_COPY,
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_SECTIONS,
} from '../lib/m55/method/m55MethodAuthority';

/**
 * Route-consumption evidence for the method placements: each required surface
 * renders its placement, in the required order, and links to the one canonical
 * method route. Copy correctness is unit-tested; this proves the runtime wiring.
 */

/** Real free answer identifiers, so /core reaches the RESULT phase. */
const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

async function seedFreeResult(context: BrowserContext) {
  await context.addInitScript(
    ({ free }) => {
      const id = 'playwright-method-placement';
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
    { free: COMPLETE_FREE },
  );
}

async function openFreeResult(page: Page) {
  await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
}

test.describe('M55 method placements', () => {
  test('canonical method route renders all ten sections', async ({ page }) => {
    await page.goto(M55_METHOD_CANONICAL_ROUTE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-method-canonical')).toBeVisible({ timeout: 30_000 });
    for (const section of M55_METHOD_SECTIONS) {
      await expect(page.getByTestId(`m55-method-section-${section.id}`)).toBeVisible();
    }
  });

  test('HOME shows the four-step model between value explanation and Premium comparison', async ({
    page,
  }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const methodBlock = page.getByTestId('m55-method-home');
    await expect(methodBlock).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('m55-method-steps').locator('li')).toHaveCount(4);

    const order = await page.evaluate(() => {
      const top = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        return el.getBoundingClientRect().top + window.scrollY;
      };
      return {
        mechanism: top('[data-testid="m55-home-mechanism"]'),
        method: top('[data-testid="m55-method-home"]'),
        premium: top('[data-testid="m55-home-premium-preview"]'),
      };
    });
    expect(order.mechanism).not.toBeNull();
    expect(order.method).not.toBeNull();
    expect(order.premium).not.toBeNull();
    expect(order.method!).toBeGreaterThan(order.mechanism!);
    expect(order.premium!).toBeGreaterThan(order.method!);
  });

  test('free result shows the compact composition before the Premium bridge', async ({ browser }) => {
    const context = await browser.newContext();
    await seedFreeResult(context);
    const page = await context.newPage();
    await openFreeResult(page);

    await expect(page.getByTestId('m55-method-core-free-result')).toBeVisible({ timeout: 30_000 });
    const order = await page.evaluate(() => {
      const top = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const scroller = document.scrollingElement ?? document.documentElement;
        return rect.top + scroller.scrollTop;
      };
      return {
        method: top('[data-testid="m55-method-core-free-result"]'),
        bridge: top('#core-paid'),
      };
    });
    expect(order.method).not.toBeNull();
    expect(order.bridge).not.toBeNull();
    expect(order.bridge!).toBeGreaterThan(order.method!);
    await context.close();
  });

  test('plan selection shows the free/Premium difference before the plan cards', async ({ browser }) => {
    const context = await browser.newContext();
    await seedFreeResult(context);
    const page = await context.newPage();
    await openFreeResult(page);

    const bridgeCta = page.getByTestId('m55-paid-bridge-primary');
    await bridgeCta.scrollIntoViewIfNeeded();
    const href = await bridgeCta.getAttribute('href');
    await bridgeCta.click();
    try {
      await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 20_000 });
    } catch {
      if (!href) throw new Error('premium bridge CTA has no href');
      await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
    await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });

    for (let i = 0; i < 6; i += 1) {
      await page.locator('[role="radio"]').first().click();
      await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
    }
    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
    await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 30_000 });

    await expect(page.getByTestId('m55-method-dtr-difference')).toBeVisible();
    await expect(page.getByTestId('m55-method-difference-free')).toContainText(
      M55_METHOD_CANONICAL_COPY.premiumDifferenceFreeJa,
    );
    const order = await page.evaluate(() => {
      const top = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const scroller = document.scrollingElement ?? document.documentElement;
        return rect.top + scroller.scrollTop;
      };
      return {
        method: top('[data-testid="m55-method-dtr-difference"]'),
        cards: top('[data-testid="m55-dtr-plan-light"]'),
      };
    });
    expect(order.method).not.toBeNull();
    expect(order.cards).not.toBeNull();
    expect(order.cards!).toBeGreaterThan(order.method!);
    await context.close();
  });

  test('pricing carries a trust link only, and the footer link is canonical', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-method-trust-link')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('m55-method-steps')).toHaveCount(0);
    await expect(page.getByTestId('m55-method-pricing-link')).toHaveAttribute(
      'href',
      M55_METHOD_CANONICAL_ROUTE,
    );
    await expect(page.getByTestId('m55-method-footer-link')).toHaveAttribute(
      'href',
      M55_METHOD_CANONICAL_ROUTE,
    );
  });
});
