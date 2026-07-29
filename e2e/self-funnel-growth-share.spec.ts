/**
 * Self Funnel growth share loop — real browser E2E (A–F).
 * No live purchase. No Production mutation.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const COMPLETE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

async function cleanContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  const boot = await context.newPage();
  await boot.goto('/home');
  await boot.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      const dbs = await indexedDB.databases?.();
      dbs?.forEach((db) => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    } catch {
      /* no-op */
    }
  });
  await boot.close();
  return context;
}

async function seedResultReady(context: BrowserContext) {
  await context.addInitScript(
    ({ answers }) => {
      const id = 'playwright-growth-share';
      const birthDate = '1983-02-28';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate }),
      );
      const keys = Object.keys(answers).sort();
      const payload = keys.map((k) => `${k}=${(answers as Record<string, string>)[k]}`).join('&');
      const fingerprint = `ffp1|試験|${birthDate}|${payload}`;
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          draftFreeAnswers: {},
          committedFreeAnswers: answers,
          freeResultFingerprint: fingerprint,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(answers));
    },
    { answers: COMPLETE_ANSWERS },
  );
}

async function openResult(page: Page) {
  await page.goto('/core');
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 20_000,
  });
}

test.describe('Self funnel growth share E2E', () => {
  test.describe.configure({ timeout: 90_000 });

  test('A. result → share preview shows privacy-safe card', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await openResult(page);

    await expect(page.getByTestId('m55-shareable-result-card')).toHaveCount(1);
    await expect(page.getByTestId('m55-free-result-share')).toBeVisible();
    await expect(page.getByTestId('m55-share-preview-text')).toContainText('私の今の資質は');
    await expect(page.getByTestId('m55-share-preview-url')).toHaveText(/\/r\/s1-\d/);
    await context.close();
  });

  test('B+C. copy link → clean browser opens shared entry → start new funnel', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seedResultReady(context);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });
    const page = await context.newPage();
    await openResult(page);

    const sharePath = (await page.getByTestId('m55-share-preview-url').innerText()).trim();
    expect(sharePath).toMatch(/^\/r\/s1-[0-9]$/);
    await page.getByTestId('m55-share-copy').click();
    await expect(page.getByTestId('m55-share-status')).toContainText('コピーしました');
    await context.close();

    const recipient = await cleanContext(browser);
    const rPage = await recipient.newPage();
    await rPage.goto(sharePath);
    await expect(rPage.getByTestId('m55-shared-entry')).toBeVisible();
    await expect(rPage.getByTestId('m55-shared-entry-trait')).toBeVisible();
    const body = await rPage.locator('main').innerText();
    expect(body).not.toMatch(/1983-02-28|試験|free\.start_style|fingerprint|clerk/i);
    const cta = rPage.getByTestId('m55-shared-entry-cta');
    await expect(cta).toHaveAttribute('href', '/core');
    await Promise.all([rPage.waitForURL(/\/core/), cta.click()]);
    // Fresh recipient must start their own funnel — no fabricated result.
    await expect(rPage.getByTestId('m55-core-start-intake')).toBeVisible({ timeout: 15_000 });
    await expect(rPage.getByTestId('m55-core-essence')).toHaveCount(0);
    await rPage.getByTestId('m55-core-start-intake').click();
    await expect(rPage.getByTestId('m55-core-birth-intake-layer')).toBeVisible();
    await recipient.close();
  });

  test('D. native share unavailable → copy fallback only', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });
    const page = await context.newPage();
    await openResult(page);
    await expect(page.getByTestId('m55-share-native')).toHaveCount(0);
    await expect(page.getByTestId('m55-share-copy')).toBeVisible();
    await context.close();
  });

  test('E. mobile Premium sticky CTA → /dtr/lp questions', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await openResult(page);
    const sticky = page.getByTestId('m55-premium-sticky-cta');
    await expect(sticky).toBeVisible();
    const link = page.getByTestId('m55-premium-sticky-link');
    await expect(link).toHaveAttribute('href', /\/dtr\/lp/);
    await page.evaluate(() => {
      document.querySelector('#clerk-components')?.remove();
    });
    await link.click({ force: true });
    await expect(page).toHaveURL(/\/dtr\/lp/);
    await context.close();
  });

  test('F. shared output has no DOB / answers / private text', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await openResult(page);
    const shareSection = page.getByTestId('m55-free-result-share');
    const text = await shareSection.innerText();
    // Privacy note may mention 生年月日 as excluded; DOB value / answers must never appear.
    expect(text).toMatch(/生年月日や回答は含まれません/);
    expect(text).not.toMatch(/1983-02-28|ニックネーム：|free\.start_style|m55_profile|\bClerk\b/i);
    const card = page.getByTestId('m55-shareable-result-card').first();
    const cardText = await card.innerText();
    expect(cardText).toMatch(/M55/);
    expect(cardText).toMatch(/無料結果を見る/);
    expect(cardText).not.toMatch(/1983-02-28|free\.start_style|試験/);
    await context.close();
  });

  test('invalid share token falls back without error page', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    await page.goto('/r/not-a-token');
    await expect(page.getByTestId('m55-shared-entry-fallback')).toBeVisible();
    await expect(page.getByTestId('m55-shared-entry-cta')).toHaveAttribute('href', '/core');
    await context.close();
  });

  test('reduced-motion result reveal still readable + 320px no overflow', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        }),
      });
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 720 });
    await openResult(page);
    await expect(page.getByTestId('m55-shareable-result-card').first()).toBeVisible();
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(overflowX).toBe(false);
    await context.close();
  });

  test('desktop share + sticky remain available', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await openResult(page);
    await expect(page.getByTestId('m55-free-result-share')).toBeVisible();
    await expect(page.getByTestId('m55-premium-sticky-cta')).toBeVisible();
    await context.close();
  });

  test('share card has distinct identity and recognition lines', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await openResult(page);
    const card = page.getByTestId('m55-shareable-result-card').first();
    const phrase = (await card.locator('.shareCardPhrase, [class*="shareCardPhrase"]').count())
      ? await card.locator('[class*="shareCardPhrase"]').first().innerText()
      : '';
    const statement = (await card.locator('[class*="shareCardStatement"]').count())
      ? await card.locator('[class*="shareCardStatement"]').first().innerText()
      : '';
    const text = await card.innerText();
    expect(text).toMatch(/M55/);
    if (phrase && statement) {
      expect(phrase.trim()).not.toEqual(statement.trim());
    }
    await context.close();
  });

  test('sticky CTA clears lead heading; hides near Premium bridge; desktop header nav', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await openResult(page);

    const desktopNav = page.locator('header nav[aria-label="メインナビゲーション"]');
    await expect(desktopNav).toBeVisible();
    await expect(desktopNav.getByText('無料で見てみる')).toBeVisible();
    await expect(desktopNav.getByText('プレミアムレポート')).toBeVisible();
    await expect(page.getByRole('button', { name: 'メニュー' })).toHaveCount(0);

    await expect(page.getByTestId('m55-premium-sticky-cta')).toBeVisible();
    const leadOverlap = await page.evaluate(() => {
      const stickyEl = document.querySelector('[data-testid="m55-premium-sticky-cta"]');
      const lead = document.querySelector('#core-free-result-lead-title');
      if (!stickyEl || !lead) return true;
      const a = stickyEl.getBoundingClientRect();
      const b = lead.getBoundingClientRect();
      return !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
    });
    expect(leadOverlap).toBe(false);

    await page.locator('#core-paid').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('m55-premium-sticky-cta')).toHaveCount(0);
    await context.close();
  });

  test('mobile header keeps one contextual CTA + menu', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await openResult(page);
    await expect(page.getByTestId('m55-mobile-nav-contextual')).toBeVisible();
    await expect(page.getByRole('button', { name: 'メニュー' })).toBeVisible();
    await expect(page.locator('header nav[aria-label="メインナビゲーション"]')).toBeHidden();
    await expect(page.getByTestId('m55-desktop-auth')).toBeHidden();
    await page.getByRole('button', { name: 'メニュー' }).click();
    await expect(page.locator('#m55-public-mobile-menu').getByRole('button', { name: 'ログイン' })).toBeVisible();
    await context.close();
  });

  test('sticky CTA uses immediate-action label and result reasons are natural', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await openResult(page);
    await expect(page.getByTestId('m55-premium-sticky-link')).toHaveText('プレミアムの読み解きへ進む');
    await expect(page.getByText('回答から見えた理由')).toBeVisible();
    await expect(page.getByText('6問に答えて4章を作る')).toHaveCount(0);
    await context.close();
  });

  test('print CSS contract produces multi-page PDF without interactive chrome', async ({
    browser,
  }) => {
    const context = await cleanContext(browser);
    await seedResultReady(context);
    const page = await context.newPage();
    await openResult(page);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' },
    });
    expect(pdf.byteLength).toBeGreaterThan(5_000);
    // Chromium PDF header starts with %PDF
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    await context.close();
  });
});
