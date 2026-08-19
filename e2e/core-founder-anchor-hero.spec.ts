import { fillM55SegmentedDob } from './_helpers/fillM55SegmentedDob';

type DiagnosticsResponse = {
  ok: boolean;
  vectors: {
    seed19830228: number;
  };
  canonical: {
    displayFingerprint: string;
  };
};

async function openCoreViaHomeFlow(page: Page, nickname: string) {
  await page.goto('/home');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/home');
  await page.getByTestId('m55-home-open-birth-intake').click();
  await expect(page.getByTestId('m55-home-birth-intake-layer')).toBeVisible();
  await page.getByPlaceholder('表示名').fill(nickname);
  await fillM55SegmentedDob(page, '1983-02-28');
  await page.getByRole('button', { name: '保存して開く' }).click();
  await page.waitForURL('**/core', { timeout: 15_000 });
  await expect(page.getByTestId('m55-core-locked')).toHaveCount(0);
}

async function fetchDiagnostics(context: BrowserContext): Promise<DiagnosticsResponse> {
  const res = await context.request.get('/api/diagnostics/core-regression?country=JP');
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as DiagnosticsResponse;
}

async function assertFounderAnchorHero(page: Page) {
  const heroCard = page.locator('header[data-hero-type]').first();
  await expect(heroCard).toBeVisible();
  await expect(
    heroCard,
    'expected hero アナリスト / v2 stem parity for founder anchor 1983-02-28',
  ).toContainText('アナリスト');
  await expect(heroCard).toContainText('観測特性');
  await expect(heroCard).toContainText('統合設計');
  await expect(
    heroCard,
    'CREATOR exposure detected in hero card',
  ).not.toContainText(/CREATOR|クリエイター/);
}

test.describe('core founder anchor hero fixed audit', () => {
  test('1983-02-28 founder anchor は通常/シークレット相当とも アナリスト hero 固定', async ({ browser }) => {
    test.setTimeout(90_000);
    const normal = await browser.newContext();
    const secretLike = await browser.newContext();
    const [normalPage, secretPage] = await Promise.all([normal.newPage(), secretLike.newPage()]);

    await openCoreViaHomeFlow(normalPage, '監査1983通常');
    await assertFounderAnchorHero(normalPage);
    const normalDiag = await fetchDiagnostics(normal);
    expect(
      normalDiag.vectors.seed19830228,
      'expected raw/display diff 0 for founder anchor 1983-02-28',
    ).toBe(0);

    await openCoreViaHomeFlow(secretPage, '監査1983秘匿');
    await assertFounderAnchorHero(secretPage);
    const secretDiag = await fetchDiagnostics(secretLike);
    expect(
      secretDiag.vectors.seed19830228,
      'expected raw/display diff 0 for founder anchor 1983-02-28',
    ).toBe(0);
    expect(
      normalDiag.canonical.displayFingerprint,
      'expected diagnostics canonical displayFingerprint to be stable across normal and secret-like contexts',
    ).toBe(secretDiag.canonical.displayFingerprint);

    await Promise.all([normal.close(), secretLike.close()]);
  });
});
