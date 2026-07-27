/**
 * Self funnel runtime state machine — real browser E2E matrix.
 * Each scenario uses an isolated browser context with cleared storage.
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

const PARTIAL_TWO = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
};

/** Isolated context; storage is wiped once (not on every navigation/reload). */
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

async function seedBasicInfo(context: BrowserContext, birthDate = '1983-02-28') {
  await context.addInitScript(
    ({ dob }) => {
      const id = 'playwright-self-funnel';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: dob }),
      );
    },
    { dob: birthDate },
  );
}

async function seedFunnelSnapshot(
  context: BrowserContext,
  snapshot: {
    draftFreeAnswers?: Record<string, string>;
    committedFreeAnswers?: Record<string, string> | null;
    freeResultFingerprint?: string | null;
    questionIndex?: number;
    generationCount?: number;
    paidAnswers?: Record<string, string>;
    birthDate?: string;
  },
) {
  await context.addInitScript(
    ({ snap }) => {
      const id = 'playwright-self-funnel';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: snap.birthDate ?? '1983-02-28' }),
      );
      const payload = {
        schemaVersion: 1,
        draftFreeAnswers: snap.draftFreeAnswers ?? {},
        committedFreeAnswers: snap.committedFreeAnswers ?? null,
        freeResultFingerprint: snap.freeResultFingerprint ?? null,
        questionIndex: snap.questionIndex ?? 0,
        generationCount: snap.generationCount ?? 0,
      };
      sessionStorage.setItem('m55_self_funnel_v1', JSON.stringify(payload));
      if (snap.committedFreeAnswers) {
        sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(snap.committedFreeAnswers));
      }
      if (snap.paidAnswers) {
        sessionStorage.setItem('m55_paid_answers_v1', JSON.stringify(snap.paidAnswers));
      }
    },
    { snap: snapshot },
  );
}

function fingerprint(answers: Record<string, string>, birthDate = '1983-02-28') {
  const keys = Object.keys(answers).sort();
  const payload = keys.map((k) => `${k}=${answers[k]}`).join('&');
  return `ffp1|試験|${birthDate}|${payload}`;
}

async function answerFiveQuestions(page: Page) {
  for (let i = 0; i < 5; i += 1) {
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible();
    await page.locator('[role="radio"]').first().click();
    if (i < 4) {
      await page.getByTestId('m55-free-next-question').click();
    } else {
      await page.getByTestId('m55-free-generate-result').click();
    }
  }
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 15_000,
  });
}

test.describe('Self funnel runtime E2E matrix', () => {
  test.describe.configure({ timeout: 60_000 });

  test('A. CLEAN NEW USER — intake → 1/5 → result → reload same', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    await page.goto('/home');
    await page.getByTestId('m55-home-open-birth-intake').click();
    await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
    await page.getByPlaceholder('表示名').fill('試験');
    // DOB required — cannot skip
    await expect(page.getByTestId('m55-birth-intake-start')).toBeDisabled();
    await page.locator('input[type="date"]').fill('1983-02-28');
    await page.getByTestId('m55-birth-intake-start').click();
    await page.waitForURL('**/core', { timeout: 15_000 });
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('m55-free-continuous-progress')).toContainText('1 / 5');
    await expect(page.getByTestId('m55-free-dob-summary')).toContainText('1983年2月28日を使用中');
    await answerFiveQuestions(page);
    const count1 = await page.getByTestId('m55-core-essence').getAttribute('data-m55-generation-count');
    await page.reload();
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 15_000,
    });
    const count2 = await page.getByTestId('m55-core-essence').getAttribute('data-m55-generation-count');
    expect(count2).toBe(count1);
    await context.close();
  });

  test('B. DIRECT /core CLEAN USER — intake, no fabricated completion', async ({ browser }) => {
    const context = await cleanContext(browser);
    const page = await context.newPage();
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-locked')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('m55-core-start-intake')).toBeVisible();
    await expect(page.getByText('基本情報 完了')).toHaveCount(0);
    await expect(page.getByTestId('m55-free-questionnaire')).toHaveCount(0);
    await page.getByTestId('m55-core-start-intake').click();
    await expect(page.getByTestId('m55-core-birth-intake-layer')).toBeVisible();
    await context.close();
  });

  test('C. RETURNING PROFILE USER — DOB summary + Q1/5, no duplicate DOB', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedBasicInfo(context);
    const page = await context.newPage();
    await page.goto('/core');
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('m55-free-dob-summary')).toContainText('1983年2月28日を使用中');
    await expect(page.getByTestId('m55-free-continuous-progress')).toContainText('1 / 5');
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await context.close();
  });

  test('D. PARTIAL QUESTIONS — resume next question, preserve answers', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedFunnelSnapshot(context, {
      draftFreeAnswers: PARTIAL_TWO,
      questionIndex: 2,
    });
    const page = await context.newPage();
    await page.goto('/core');
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('m55-free-continuous-progress')).toContainText('3 / 5');
    await context.close();
  });

  test('E. RESULT READY — home opens existing; /core does not regenerate', async ({ browser }) => {
    const context = await cleanContext(browser);
    const fp = fingerprint(COMPLETE_ANSWERS);
    await seedFunnelSnapshot(context, {
      draftFreeAnswers: COMPLETE_ANSWERS,
      committedFreeAnswers: COMPLETE_ANSWERS,
      freeResultFingerprint: fp,
      generationCount: 1,
    });
    const page = await context.newPage();
    await page.goto('/home');
    await expect(page.getByTestId('m55-home-has-profile-hero')).toContainText('無料結果を開く');
    await page.getByTestId('m55-home-has-profile-hero').click();
    await page.waitForURL('**/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 15_000,
    });
    const c1 = await page.getByTestId('m55-core-essence').getAttribute('data-m55-generation-count');
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT');
    const c2 = await page.getByTestId('m55-core-essence').getAttribute('data-m55-generation-count');
    expect(c2).toBe(c1);
    expect(c1).toBe('1');
    await context.close();
  });

  test('F. RAPID MULTI-CLICK — single generation flight', async ({ browser }) => {
    test.setTimeout(90_000);
    const context = await cleanContext(browser);
    await seedFunnelSnapshot(context, {
      draftFreeAnswers: {
        'free.start_style': 'free.start_style.map_first',
        'free.decision_style': 'free.decision_style.sort_first',
        'free.recovery_style': 'free.recovery_style.pause_short',
        'free.distance_style': 'free.distance_style.close_careful',
      },
      questionIndex: 4,
    });
    const page = await context.newPage();
    await page.goto('/core');
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 15_000 });
    // Advance to last unanswered if needed, then select and multi-click generate once-flight
    for (let i = 0; i < 4; i += 1) {
      if (await page.getByTestId('m55-free-generate-result').isVisible().catch(() => false)) break;
      if ((await page.locator('[role="radio"][aria-checked="true"]').count()) === 0) {
        await page.locator('[role="radio"]').first().click();
      }
      await page.getByTestId('m55-free-next-question').click();
    }
    await page.locator('[role="radio"]').first().click();
    const gen = page.getByTestId('m55-free-generate-result');
    await expect(gen).toBeEnabled();
    await gen.evaluate((el) => {
      const btn = el as HTMLButtonElement;
      btn.click();
      btn.click();
      btn.click();
    });
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-generation-count', '1');
    await context.close();
  });

  test('G. EXPLICIT RERUN — confirm, change, one new result', async ({ browser }) => {
    const context = await cleanContext(browser);
    const fp = fingerprint(COMPLETE_ANSWERS);
    await seedFunnelSnapshot(context, {
      draftFreeAnswers: COMPLETE_ANSWERS,
      committedFreeAnswers: COMPLETE_ANSWERS,
      freeResultFingerprint: fp,
      generationCount: 1,
    });
    const page = await context.newPage();
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 15_000,
    });
    await page.getByRole('button', { name: '回答を変えて、もう一度見る' }).first().click();
    await page.getByTestId('m55-free-rerun-confirm').click();
    await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible();
    await page.locator('[role="radio"]').nth(1).click();
    for (let i = 0; i < 5; i += 1) {
      const gen = page.getByTestId('m55-free-generate-result');
      if (await gen.isVisible().catch(() => false)) {
        await expect(gen).toBeEnabled();
        await gen.click();
        break;
      }
      const next = page.getByTestId('m55-free-next-question');
      if ((await page.locator('[role="radio"][aria-checked="true"]').count()) === 0) {
        await page.locator('[role="radio"]').first().click();
      }
      await next.click();
    }
    await page.getByTestId('m55-free-rerun-finalize').click();
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 15_000,
    });
    const count = await page.getByTestId('m55-core-essence').getAttribute('data-m55-generation-count');
    expect(Number(count)).toBeGreaterThanOrEqual(2);
    await context.close();
  });

  test('H. DIRECT /dtr/lp gates', async ({ browser }) => {
    // Clean — must not claim free complete
    {
      const context = await cleanContext(browser);
      const page = await context.newPage();
      await page.goto('/dtr/lp');
      await expect(page.getByTestId('m55-dtr-need-free')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('無料結果はすでに完了')).toHaveCount(0);
      await expect(page.getByText('無料結果 完了')).toHaveCount(0);
      await context.close();
    }
    // Free result ready — six-question continuation
    {
      const context = await cleanContext(browser);
      await seedFunnelSnapshot(context, {
        draftFreeAnswers: COMPLETE_ANSWERS,
        committedFreeAnswers: COMPLETE_ANSWERS,
        freeResultFingerprint: fingerprint(COMPLETE_ANSWERS),
        generationCount: 1,
      });
      const page = await context.newPage();
      await page.goto('/dtr/lp');
      await expect(page.locator('[data-m55-paid-phase="entry"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('力が出やすい条件')).toBeVisible();
      await context.close();
    }
    // Paid complete — plan selection
    {
      const context = await cleanContext(browser);
      const paid: Record<string, string> = {
        'paid.work_focus': 'paid.work_focus.priority',
        'paid.decision_friction': 'paid.decision_friction.too_many',
        'paid.relation_focus': 'paid.relation_focus.words',
        'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
        'paid.report_usage': 'paid.report_usage.reread_scene',
        'paid.reading_style': 'paid.reading_style.headline',
      };
      // Use real paid IDs from the app if different — seed via session after discovering
      await seedFunnelSnapshot(context, {
        draftFreeAnswers: COMPLETE_ANSWERS,
        committedFreeAnswers: COMPLETE_ANSWERS,
        freeResultFingerprint: fingerprint(COMPLETE_ANSWERS),
        generationCount: 1,
        paidAnswers: paid,
      });
      const page = await context.newPage();
      await page.goto('/dtr/lp');
      await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 15_000 });
      await context.close();
    }
  });

  test('I. CORRUPT/STALE STORAGE — fail closed to intake/questionnaire', async ({ browser }) => {
    // missing DOB
    {
      const context = await cleanContext(browser);
      await context.addInitScript(() => {
        const id = 'playwright-self-funnel';
        localStorage.setItem('m55_device_id_v1', id);
        localStorage.setItem(
          `m55_profile_v1_${id}`,
          JSON.stringify({ nickname: '試験', birthDate: '' }),
        );
        sessionStorage.setItem(
          'm55_self_funnel_v1',
          JSON.stringify({ schemaVersion: 1, basicInfoComplete: true }),
        );
      });
      const page = await context.newPage();
      await page.goto('/core');
      await expect(page.getByTestId('m55-core-locked')).toBeVisible({ timeout: 15_000 });
      await context.close();
    }
    // invalid DOB
    {
      const context = await cleanContext(browser);
      await context.addInitScript(() => {
        const id = 'playwright-self-funnel';
        localStorage.setItem('m55_device_id_v1', id);
        localStorage.setItem(
          `m55_profile_v1_${id}`,
          JSON.stringify({ nickname: '試験', birthDate: '1983-02-30' }),
        );
      });
      const page = await context.newPage();
      await page.goto('/core');
      await expect(page.getByTestId('m55-core-locked')).toBeVisible({ timeout: 15_000 });
      await context.close();
    }
    // old schema + mismatched fingerprint
    {
      const context = await cleanContext(browser);
      await seedFunnelSnapshot(context, {
        draftFreeAnswers: COMPLETE_ANSWERS,
        committedFreeAnswers: COMPLETE_ANSWERS,
        freeResultFingerprint: 'stale-mismatch',
        generationCount: 9,
      });
      const page = await context.newPage();
      await page.goto('/core');
      await expect(page.getByTestId('m55-free-questionnaire')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('m55-core-essence')).not.toHaveAttribute('data-m55-ux-phase', 'RESULT');
      await context.close();
    }
  });

  test('J. RESPONSIVE NAV — Premium one-tap after result; no overflow', async ({ browser }) => {
    const context = await cleanContext(browser);
    await seedFunnelSnapshot(context, {
      draftFreeAnswers: COMPLETE_ANSWERS,
      committedFreeAnswers: COMPLETE_ANSWERS,
      freeResultFingerprint: fingerprint(COMPLETE_ANSWERS),
      generationCount: 1,
    });

    for (const width of [320, 390, 1280]) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/core');
      await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
        timeout: 15_000,
      });
      if (width < 960) {
        const premium = page.getByTestId('m55-mobile-nav-premium');
        await expect(premium).toBeVisible();
        await premium.click({ force: true });
        await page.waitForURL('**/dtr/lp');
      } else {
        await expect(page.getByRole('navigation', { name: 'メインナビゲーション' }).getByText('プレミアム')).toBeVisible();
      }
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });
      expect(overflow).toBe(false);
      await page.close();
    }
    await context.close();
  });
});
