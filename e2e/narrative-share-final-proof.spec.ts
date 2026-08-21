/**
 * Current-head final proof: OG A/B/C/Pair HTTP images + affected visuals.
 * No purchase. No Production. Run against an already-started local Next server.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'test-results', 'narrative-share-final');

const P1_ANSWERS = {
  'free.start_style': 'free.start_style.try_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.adjust_fast',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

const OG_TOKENS = {
  A: 'n1pa9tspijasknbt',
  B: 'n1pb9tspijasknbt',
  C: 'n1pc9tspijasknbt',
  Pair: 'n1cmtmam',
} as const;

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

async function seedPersonalP1(context: BrowserContext) {
  await context.addInitScript(
    ({ answers }) => {
      const id = 'playwright-growth-share';
      const birthDate = '1983-02-28';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(`m55_profile_v1_${id}`, JSON.stringify({ nickname: '試験', birthDate }));
      const keys = Object.keys(answers).sort();
      const payload = keys.map((k) => `${k}=${(answers as Record<string, string>)[k]}`).join('&');
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          draftFreeAnswers: {},
          committedFreeAnswers: answers,
          freeResultFingerprint: `ffp1|試験|${birthDate}|${payload}`,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(answers));
    },
    { answers: P1_ANSWERS },
  );
}

async function seedPair(
  context: BrowserContext,
  answers: Record<string, string>,
  personA: string,
  personB: string,
) {
  await context.addInitScript(
    ({ answers: next, personA: a, personB: b }) => {
      sessionStorage.setItem(
        'm55_compatibility_guest_journey_v2',
        JSON.stringify({ input: { personA: a, personB: b }, answers: next }),
      );
    },
    { answers, personA, personB },
  );
}

test.describe('Narrative share current-head final proof', () => {
  test.describe.configure({ timeout: 120_000 });

  test('OG A/B/C/Pair return image/png with public-safe content', async ({ browser }) => {
    mkdirSync(OUT, { recursive: true });
    const context = await cleanContext(browser);
    const page = await context.newPage();
    await page.goto('/home');
    for (const [label, token] of Object.entries(OG_TOKENS)) {
      const res = await page.request.get(`/r/${token}/opengraph-image`, { timeout: 60_000 });
      const type = res.headers()['content-type'] ?? '';
      const body = Buffer.from(await res.body());
      expect(res.status(), `${label} HTTP`).toBe(200);
      expect(type, `${label} type`).toMatch(/^image\//);
      expect(body.byteLength, `${label} bytes`).toBeGreaterThan(4000);
      expect(body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      writeFileSync(join(OUT, `og-${label.toLowerCase()}.png`), body);
      const ascii = body.toString('latin1');
      expect(ascii).not.toMatch(/1983-02-28|1997-06-15|free\.start_style|dal-v1|sk_test_|pk_test_/);
    }
    await context.close();
  });

  test('Personal Free 390/430 hierarchy, A/B/C, actions, sticky, image save, viewer C', async ({
    browser,
  }) => {
    mkdirSync(OUT, { recursive: true });
    const context = await cleanContext(browser);
    await seedPersonalP1(context);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 20_000,
    });

    await page.getByTestId('m55-free-result-lead').screenshot({
      path: join(OUT, 'personal-lead-390.png'),
      animations: 'disabled',
    });
    const manual = page.getByTestId('m55-personal-manual');
    await manual.scrollIntoViewIfNeeded();
    const manualText = await manual.innerText();
    expect(manualText).not.toMatch(/候補を並べてから閉じる|土台では|今回の答えでは|側に寄っています|一句置く/);
    await manual.screenshot({ path: join(OUT, 'personal-manual-390.png'), animations: 'disabled' });

    await page.getByTestId('m55-free-to-paid-bridge').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('m55-premium-delta-list')).toContainText('なぜこの動きになるのか');
    await expect(page.getByTestId('m55-premium-delta-list')).toContainText('場面が変わるとどう出るか');
    await expect(page.getByTestId('m55-premium-delta-list')).toContainText('強みと摩擦');
    await expect(page.getByTestId('m55-premium-delta-list')).toContainText('自分の扱い方');
    await expect(page.getByTestId('m55-premium-delta-list')).toContainText('今の自分へ残す一文');
    await page.getByTestId('m55-free-to-paid-bridge').screenshot({
      path: join(OUT, 'personal-bridge-390.png'),
      animations: 'disabled',
    });

    await page.getByTestId('m55-free-result-share').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('m55-premium-sticky-link')).toHaveCount(0);
    await page.getByTestId('m55-free-result-share').screenshot({
      path: join(OUT, 'personal-chooser-390.png'),
      animations: 'disabled',
    });

    const cards = [
      { id: 'm55-share-card-manual', file: 'personal-card-a-390.png', hit: /私の取扱説明書/ },
      { id: 'm55-share-card-seen_vs_actual', file: 'personal-card-b-390.png', hit: /人から見える私/ },
      { id: 'm55-share-card-hidden_spec', file: 'personal-card-c-390.png', hit: /人に聞くのは、/ },
    ] as const;
    let cPath = '';
    for (const card of cards) {
      await page.getByTestId(card.id).click();
      const preview = page.getByTestId('m55-narrative-share-card');
      await expect(preview).toContainText(card.hit);
      if (card.id === 'm55-share-card-hidden_spec') {
        await expect(preview).not.toContainText('連絡の頻度を、あまり変えずに保つ');
        await expect(preview).toContainText('決めてもらいたいからではない');
        await expect(preview).toContainText('最後に自分で決めるための材料を集めている');
        cPath = (await page.getByTestId('m55-share-preview-url').getAttribute('data-share-path')) ?? '';
      }
      await preview.screenshot({ path: join(OUT, card.file), animations: 'disabled' });
    }

    await expect(page.getByTestId('m55-share-x')).toBeVisible();
    await expect(page.getByTestId('m55-share-copy')).toBeVisible();
    await expect(page.getByTestId('m55-share-image')).toBeVisible();
    await page.getByTestId('m55-narrative-share-actions').screenshot({
      path: join(OUT, 'personal-actions-390.png'),
      animations: 'disabled',
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByTestId('m55-share-image').click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested).toMatch(/m55-share\.png/i);
    const savePath = join(OUT, 'saved-card-c.png');
    await download.saveAs(savePath);
    const saved = readFileSync(savePath);
    expect(saved.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(saved.byteLength).toBeGreaterThan(4000);

    await page.getByTestId('m55-free-result-lead').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('m55-premium-sticky-cta')).toHaveCount(0);
    await page.getByTestId('m55-paid-bridge-primary').screenshot({
      path: join(OUT, 'personal-bridge-after-share-390.png'),
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 430, height: 932 });
    await page.getByTestId('m55-free-result-share').scrollIntoViewIfNeeded();
    await page.getByTestId('m55-share-card-hidden_spec').click();
    await page.getByTestId('m55-free-result-share').screenshot({
      path: join(OUT, 'personal-share-430.png'),
      animations: 'disabled',
    });
    await context.close();

    const recipient = await cleanContext(browser);
    const viewer = await recipient.newPage();
    await viewer.setViewportSize({ width: 390, height: 844 });
    await viewer.goto(cPath);
    const landing = viewer.getByTestId('m55-shared-entry');
    await expect(landing).toContainText('この人には、こんな読みが出ました。');
    await expect(landing).toContainText('人に聞くのは、');
    await expect(landing).not.toContainText('あなたの場合は？');
    await expect(landing).toContainText('無料で自分の取扱説明書を見る');
    await expect(landing).not.toContainText('連絡の頻度を、あまり変えずに保つ');
    await landing.screenshot({ path: join(OUT, 'viewer-c-390.png'), animations: 'disabled' });
    await recipient.close();
  });

  test('Pair R1 and R3 relation grammar 390/430', async ({ browser }) => {
    mkdirSync(OUT, { recursive: true });
    async function capturePair(
      answers: Record<string, string>,
      personA: string,
      personB: string,
      prefix: string,
    ) {
      const context = await cleanContext(browser);
      await seedPair(context, answers, personA, personB);
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/synastry');
      const manual = page.getByTestId('m55-pair-manual');
      await expect(manual).toBeVisible({ timeout: 25_000 });
      const text = await manual.innerText();
      expect(text).toMatch(/一方/);
      expect(text).toMatch(/もう一方|すれ違い/);
      expect(text).toMatch(/戻り/);
      expect(text).not.toMatch(/1983-02-28|1997-06-15|1955-03-01/);
      await manual.screenshot({ path: join(OUT, `${prefix}-manual-390.png`), animations: 'disabled' });
      await page.getByTestId('m55-pair-share').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('m55-share-preview-ack')).toBeVisible();
      await page.getByTestId('m55-pair-share').screenshot({
        path: join(OUT, `${prefix}-share-390.png`),
        animations: 'disabled',
      });
      if (prefix === 'pair-r1') {
        await page.setViewportSize({ width: 430, height: 932 });
        await page.getByTestId('m55-pair-manual').screenshot({
          path: join(OUT, `${prefix}-manual-430.png`),
          animations: 'disabled',
        });
        await page.getByTestId('m55-pair-share').screenshot({
          path: join(OUT, `${prefix}-share-430.png`),
          animations: 'disabled',
        });
      }
      await context.close();
    }
    await capturePair(
      {
        decisionPace: 'decide_now',
        disagreement: 'talk_now',
        distance: 'go_quiet',
        expressionPace: 'words_later',
        returnPattern: 'someone_reaches',
        focus: 'conversation_focus',
      },
      '1983-02-28',
      '1997-06-15',
      'pair-r1',
    );
    await capturePair(
      {
        decisionPace: 'decide_later',
        disagreement: 'take_space',
        distance: 'go_quiet',
        expressionPace: 'words_later',
        returnPattern: 'return_is_hard',
        focus: 'return_focus',
      },
      '1955-03-01',
      '1997-06-15',
      'pair-r3',
    );
  });

  test('Premium owned-report fixture opening and close', async ({ browser }) => {
    mkdirSync(OUT, { recursive: true });
    const context = await cleanContext(browser);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const res = await page.goto('/dev/dtr-drawer-preview?projection=1');
    expect(res?.ok(), 'preview HTTP').toBeTruthy();
    await expect(page.getByText('プレミアムレポート').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('[aria-label="保存済みレポート"]').screenshot({
      path: join(OUT, 'premium-opening-390.png'),
      animations: 'disabled',
    });
    const close = page.getByTestId('m55-premium-narrative-close');
    await page.locator('[aria-controls="drawer-hub-body-summary"]').click();
    await expect(page.locator('#drawer-hub-body-summary')).toBeVisible();
    await close.scrollIntoViewIfNeeded();
    const shareCard = close.getByTestId('m55-narrative-share-card');
    await expect(shareCard.getByRole('heading', { level: 3, name: '今のあなたへ残しておく一文' })).toBeVisible();
    await expect(
      shareCard.locator(':scope > p').filter({ hasText: /^M55 プレミアムレポートから$/ }),
    ).toHaveCount(1);
    await close.screenshot({ path: join(OUT, 'premium-close-390.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await close.scrollIntoViewIfNeeded();
    await close.screenshot({ path: join(OUT, 'premium-close-1280.png'), animations: 'disabled' });
    await context.close();
  });
});
