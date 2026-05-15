import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

type StoredCoreSnapshot = {
  coreType: string;
  coreLabel: string;
  coreAxisScores: unknown;
  engineVersion: string;
  lockedAt: string;
};

type DiagnosticsResponse = {
  ok: boolean;
  vectors: {
    seed19830228: number;
    seed19921219: number;
    pair1983x1992: number;
  };
  canonical: {
    staticFingerprint: string;
    displayFingerprint: string;
  };
};

async function waitAndReadSealedCore(page: Page): Promise<StoredCoreSnapshot> {
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('m55_core_result_v3_')));
  const snapshot = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('m55_core_result_v3_'));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      coreResult?: {
        coreType?: string;
        coreLabel?: string;
        coreAxisScores?: unknown;
        engineVersion?: string;
        lockedAt?: string;
      };
    };
    if (!parsed.coreResult) return null;
    return {
      coreType: parsed.coreResult.coreType ?? '',
      coreLabel: parsed.coreResult.coreLabel ?? '',
      coreAxisScores: parsed.coreResult.coreAxisScores ?? {},
      engineVersion: parsed.coreResult.engineVersion ?? '',
      lockedAt: parsed.coreResult.lockedAt ?? '',
    };
  });
  if (!snapshot) throw new Error('M55_E2E_SNAPSHOT_NOT_FOUND');
  return snapshot;
}

async function fetchDiag(request: APIRequestContext): Promise<DiagnosticsResponse> {
  const res = await request.get('/api/diagnostics/core-regression?country=JP');
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as DiagnosticsResponse;
}

test.describe('core storage roundtrip deterministic', () => {
  test('初回保存→再訪読込で不変、シークレット相当未保存でも canonical 同値', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/home');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.getByTestId('m55-home-open-birth-intake').click();
    await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
    await page.getByPlaceholder('表示名').fill('監査1983');
    await page.locator('input[type="date"]').fill('1983-02-28');
    await page.getByRole('button', { name: '保存して開く' }).click();
    await page.waitForURL('**/core', { timeout: 15_000 });
    await expect(page.getByTestId('m55-core-locked')).toHaveCount(0);

    const first = await waitAndReadSealedCore(page);

    const savedDiag = await fetchDiag(context.request);
    expect(savedDiag.ok).toBeTruthy();
    expect(savedDiag.vectors.seed19830228).toBe(0);
    expect(savedDiag.vectors.seed19921219).toBe(0);
    expect(savedDiag.vectors.pair1983x1992).toBe(0);

    await page.goto('/home');
    await page.goto('/core');
    await expect(page.getByTestId('m55-core-locked')).toHaveCount(0);
    const second = await waitAndReadSealedCore(page);

    expect(second.coreType).toBe(first.coreType);
    expect(second.coreLabel).toBe(first.coreLabel);
    expect(second.coreAxisScores).toEqual(first.coreAxisScores);
    expect(second.engineVersion).toBe(first.engineVersion);
    expect(second.lockedAt).toBe(first.lockedAt);

    const secretLike = await browser.newContext();
    const secretPage = await secretLike.newPage();
    await secretPage.goto('/core');
    await expect(secretPage.getByTestId('m55-core-locked')).toBeVisible();

    const secretDiag = await fetchDiag(secretLike.request);
    expect(secretDiag.ok).toBeTruthy();
    expect(secretDiag.vectors.seed19830228).toBe(0);
    expect(secretDiag.vectors.seed19921219).toBe(0);
    expect(secretDiag.vectors.pair1983x1992).toBe(0);
    expect(secretDiag.canonical.staticFingerprint).toBe(savedDiag.canonical.staticFingerprint);
    expect(secretDiag.canonical.displayFingerprint).toBe(savedDiag.canonical.displayFingerprint);

    await Promise.all([secretLike.close(), context.close()]);
  });
});
