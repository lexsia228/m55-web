import { test, expect } from '@playwright/test';

test.describe('core regression anchor deterministic', () => {
  test('JP/US + fixedNow有無 + 通常/シークレット相当コンテキストで安定', async ({ browser }) => {
    const normal = await browser.newContext();
    const privateLike = await browser.newContext();

    const [p1, p2] = await Promise.all([normal.newPage(), privateLike.newPage()]);
    const scenarios = [
      '/api/diagnostics/core-regression?country=JP',
      '/api/diagnostics/core-regression?country=US',
      '/api/diagnostics/core-regression?country=JP&fixedNow=2026-01-01T00:00:00.000Z',
      '/api/diagnostics/core-regression?country=US&fixedNow=2026-01-01T00:00:00.000Z',
    ];

    for (const url of scenarios) {
      const [r1, r2] = await Promise.all([p1.request.get(url), p2.request.get(url)]);
      expect(r1.ok()).toBeTruthy();
      expect(r2.ok()).toBeTruthy();

      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);

      expect(j1.ok).toBeTruthy();
      expect(j2.ok).toBeTruthy();
      expect(j1.vectors.seed19830228).toBe(0);
      expect(j1.vectors.seed19921219).toBe(0);
      expect(j1.vectors.pair1983x1992).toBe(0);
      expect(j2.vectors.seed19830228).toBe(0);
      expect(j2.vectors.seed19921219).toBe(0);
      expect(j2.vectors.pair1983x1992).toBe(0);

      expect(j1.canonical.staticFingerprint).toBe(j2.canonical.staticFingerprint);
      expect(j1.canonical.displayFingerprint).toBe(j2.canonical.displayFingerprint);
      expect(j1.pairFingerprint).toBe(j2.pairFingerprint);

      expect(j1.countryMatrix.JP.seed19830228).toBe(0);
      expect(j1.countryMatrix.JP.seed19921219).toBe(0);
      expect(j1.countryMatrix.JP.pair1983x1992).toBe(0);
      expect(j1.countryMatrix.US.seed19830228).toBe(0);
      expect(j1.countryMatrix.US.seed19921219).toBe(0);
      expect(j1.countryMatrix.US.pair1983x1992).toBe(0);

      expect(j1.replayChecks.seed19830228.coreType).toBeTruthy();
      expect(j1.replayChecks.seed19830228.coreLabel).toBeTruthy();
      expect(j1.replayChecks.seed19830228.coreAxisScores).toBeTruthy();
      expect(j1.replayChecks.seed19830228.engineVersion).toBeTruthy();
      expect(j1.replayChecks.seed19830228.lockedAt).toBeTruthy();
      expect(j1.replayChecks.seed19830228.staticFingerprint).toBeTruthy();
      expect(j1.replayChecks.seed19830228.displayFingerprint).toBeTruthy();
      expect(j1.replayChecks.seed19921219.coreType).toBeTruthy();
      expect(j1.replayChecks.seed19921219.coreLabel).toBeTruthy();
      expect(j1.replayChecks.seed19921219.coreAxisScores).toBeTruthy();
      expect(j1.replayChecks.seed19921219.engineVersion).toBeTruthy();
      expect(j1.replayChecks.seed19921219.lockedAt).toBeTruthy();
      expect(j1.replayChecks.seed19921219.staticFingerprint).toBeTruthy();
      expect(j1.replayChecks.seed19921219.displayFingerprint).toBeTruthy();
    }

    await Promise.all([normal.close(), privateLike.close()]);
  });
});
