/**
 * HOME continuous responsive closure — shared commercial-quality runner.
 *
 * Migrated from the prior HOME-only geometry evaluate path onto:
 * - planCases / governedWidths (shared continuous engine planning)
 * - createM55CommercialQualityAdapter / measureCommercialSurface
 * - checkLayoutInvariants (production layout path)
 * - authoritative canonical-state resolver
 *
 * Semantic stress mutations are not applied for the continuum (matches the
 * prior HOME suite, which measured natural settled copy only). Layout
 * invariants + CTA target size + canonical identity cover the frozen defect.
 *
 * Coverage preserved: 320–1440 step 16 + breakpoint neighborhoods × HOME
 * height matrix × fresh_load / resize_down / resize_up = 474 × 3.
 *
 * Run:
 *   M55_E2E_CLEAN_CAPTURE=1 npm run test:e2e:home-continuous-responsive
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  formatCaseFailure,
  governedWidths,
  planCases,
} from '../lib/commercialQuality/continuousResponsiveEngine';
import { checkLayoutInvariants } from '../lib/commercialQuality/layoutInvariants';
import type {
  CasePlan,
  NormalizedCaseResult,
  SurfaceManifestEntry,
} from '../lib/commercialQuality/types';
import {
  M55_BREAKPOINT_NEIGHBORHOODS,
  M55_COMMERCIAL_QUALITY_MANIFEST,
  M55_WIDTH_MAX,
  M55_WIDTH_MIN,
  M55_WIDTH_STEP,
} from '../lib/m55/commercialUx/qualityControl/m55SurfaceManifest';
import { canonicalObservableStateIdFor } from '../lib/m55/commercialUx/qualityControl/m55ObservableStateAliasMap';
import { PUBLIC_FIXED_HEADER_SELECTOR } from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityContract';
import { requireCleanCaptureEnvironment } from './helpers/cleanCaptureEnvironment';
import {
  createM55CommercialQualityAdapter,
  measureCommercialSurface,
  resolveSourceCommit,
} from './helpers/commercialQualityRunner';

/** Retained HOME height matrix (short heights expose CTA clipping). */
const HOME_CONTINUOUS_HEIGHTS = [568, 667, 736, 812, 844, 900] as const;
const CONTACT_SHEET_HEIGHT = 812;
const CONTACT_SHEET_DIR = join('e2e', 'screenshots', '_tmp-home-continuous-responsive');
const REPRESENTATIVE_WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440] as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const LABEL = 'home-continuous-responsive';

function homeVisualEntry(): SurfaceManifestEntry {
  const entry = M55_COMMERCIAL_QUALITY_MANIFEST.entries.find(
    (item) => item.surfaceId === 'm55:visual.home',
  );
  if (!entry) throw new Error('m55:visual.home missing from commercial quality manifest');
  return {
    ...entry,
    viewport: {
      ...entry.viewport,
      minWidth: M55_WIDTH_MIN,
      maxWidth: M55_WIDTH_MAX,
      widthStep: M55_WIDTH_STEP,
      breakpointNeighborhoods: [...M55_BREAKPOINT_NEIGHBORHOODS],
      heightMatrix: [...HOME_CONTINUOUS_HEIGHTS],
    },
    // Natural settled copy only — continuum geometry (prior HOME suite scope).
    contentStressProfiles: ['short_text'],
    executionProfiles: ['default'],
    // Governed container is main so protected nodes below the hero (premium
    // headline) are not reported as overflowing the hero box.
    protectedElements: [
      { selector: 'main', role: 'container', requireText: true },
      ...entry.protectedElements,
    ],
    // Continuum checks header chrome; scroll-to-top is covered by browser smoke.
    fixedElements: [PUBLIC_FIXED_HEADER_SELECTOR],
  };
}

const HOME_PLAN_OPTIONS = {
  modes: ['fresh_load', 'resize_down', 'resize_up'] as const,
  profiles: ['default'] as const,
  contentStressProfiles: ['short_text'] as const,
  heights: HOME_CONTINUOUS_HEIGHTS,
};

function planFor(entry: SurfaceManifestEntry, width: number, height: number): CasePlan {
  return {
    surfaceId: entry.surfaceId,
    runtimeStateId: entry.runtimeStateId,
    route: entry.route,
    setupId: entry.setupId,
    viewport: { width, height },
    mode: 'fresh_load',
    profile: 'default',
    contentStressProfile: 'short_text',
  };
}

/**
 * Reproduce the former absolute-overlay defect without mutating production
 * HOME source: inject temporary styles that pull the overlay out of flow and
 * constrain the poster so CTA/support/trust clip.
 */
async function applyAbsoluteOverlayDefect(page: Page): Promise<() => Promise<void>> {
  await page.addStyleTag({
    content: `
      [data-testid="m55-home-hero"] [class*="posterMainVisual"] {
        display: block !important;
        height: 520px !important;
        max-height: 520px !important;
        min-height: 520px !important;
        overflow: hidden !important;
      }
      [data-testid="m55-home-hero"] [class*="posterHeroOverlay"] {
        position: absolute !important;
        inset: 0 !important;
        min-height: 0 !important;
        flex: none !important;
      }
    `,
  });
  return async () => {
    await page.evaluate(() => {
      document.querySelectorAll('style').forEach((node) => {
        if ((node.textContent || '').includes('posterHeroOverlay')) node.remove();
      });
    });
  };
}

async function runHomeModeLayout(
  page: Page,
  mode: 'fresh_load' | 'resize_down' | 'resize_up',
): Promise<{
  plannedCaseCount: number;
  caseCount: number;
  failedCount: number;
  results: NormalizedCaseResult[];
  minimumCtaTargetSize: number;
}> {
  const entry = homeVisualEntry();
  const adapter = createM55CommercialQualityAdapter({
    baseURL: BASE_URL,
    label: LABEL,
    includeAccessibility: false,
  });
  // Continuum uses short_text only — setup treats that as natural settled copy.

  const plans = planCases(entry, {
    modes: [mode],
    profiles: ['default'],
    contentStressProfiles: ['short_text'],
    heights: HOME_CONTINUOUS_HEIGHTS,
  });
  const expectedOrigin = new URL(BASE_URL).origin;
  const sourceCommit = resolveSourceCommit();
  const results: NormalizedCaseResult[] = [];
  let minimumCtaTargetSize = Number.POSITIVE_INFINITY;

  for (const plan of plans) {
    await adapter.prepareCase(page, entry, plan);
    const measured = await measureCommercialSurface(page, entry, plan, {
      expectedOrigin,
      includeAccessibility: false,
    });
    const failures = [...checkLayoutInvariants(measured, entry)];
    if (measured.criticalCta?.found) {
      minimumCtaTargetSize = Math.min(
        minimumCtaTargetSize,
        measured.criticalCta.rect.height,
        measured.criticalCta.rect.width,
      );
    }
    if (measured.observedCanonicalStateId !== 'ecp:public.home:default') {
      failures.push({
        code: 'LAYOUT_STATE_DRIFT',
        message: `canonical ${measured.observedCanonicalStateId}`,
        diagnostics: {},
        selector: null,
      });
    }
    results.push({
      surfaceId: plan.surfaceId,
      runtimeStateId: plan.runtimeStateId,
      route: measured.observedRoute,
      viewport: plan.viewport,
      mode: plan.mode,
      profile: plan.profile,
      contentStressProfile: plan.contentStressProfile,
      passed: failures.length === 0,
      failures,
      durationMs: 0,
      setupId: plan.setupId,
      sourceCommit,
    });
  }

  const failed = results.filter((r) => !r.passed);
  expect(plans.length).toBe(474);
  expect(failed.map(formatCaseFailure).join('\n\n'), failed.map(formatCaseFailure).join('\n\n')).toBe(
    '',
  );
  expect(failed.length).toBe(0);

  return {
    plannedCaseCount: plans.length,
    caseCount: results.length,
    failedCount: failed.length,
    results,
    minimumCtaTargetSize: Number.isFinite(minimumCtaTargetSize) ? minimumCtaTargetSize : 0,
  };
}

test.describe('HOME continuous responsive — shared commercial quality runner', () => {
  test.beforeAll(() => {
    requireCleanCaptureEnvironment(LABEL);
  });

  test('shared-runner case arithmetic matches frozen HOME continuum', () => {
    const entry = homeVisualEntry();
    const widths = governedWidths(entry);
    const plans = planCases(entry, HOME_PLAN_OPTIONS);
    const fresh = plans.filter((p) => p.mode === 'fresh_load').length;
    const down = plans.filter((p) => p.mode === 'resize_down').length;
    const up = plans.filter((p) => p.mode === 'resize_up').length;
    expect(widths.length).toBe(79);
    expect(HOME_CONTINUOUS_HEIGHTS.length).toBe(6);
    expect(fresh).toBe(474);
    expect(down).toBe(474);
    expect(up).toBe(474);
    expect(plans.length).toBe(1422);
    expect(canonicalObservableStateIdFor(entry.runtimeStateId)).toBe('ecp:public.home:default');
  });

  test('old absolute-overlay defect rejected in fresh_load, resize_down, resize_up', async ({
    page,
  }) => {
    test.setTimeout(20 * 60 * 1000);
    const entry = homeVisualEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    const expectedOrigin = new URL(BASE_URL).origin;
    const height = 667;
    const widths = governedWidths(entry);
    const modes = ['fresh_load', 'resize_down', 'resize_up'] as const;
    const directional: Record<
      (typeof modes)[number],
      { rejected: boolean; failureCodes: string[]; correctedPass: boolean }
    > = {
      fresh_load: { rejected: false, failureCodes: [], correctedPass: false },
      resize_down: { rejected: false, failureCodes: [], correctedPass: false },
      resize_up: { rejected: false, failureCodes: [], correctedPass: false },
    };

    for (const mode of modes) {
      const sequence =
        mode === 'fresh_load' ? [390] : mode === 'resize_down' ? [...widths].reverse() : [...widths];
      const probeWidth = 390;

      // Establish valid starting viewport/state on the shared runner.
      const startPlan: CasePlan = {
        ...planFor(entry, sequence[0]!, height),
        mode: 'fresh_load',
      };
      await adapter.prepareCase(page, entry, startPlan);
      const healthy = await measureCommercialSurface(page, entry, startPlan, {
        expectedOrigin,
        includeAccessibility: false,
      });
      expect(checkLayoutInvariants(healthy, entry).map((f) => f.code)).toEqual([]);
      expect(healthy.observedCanonicalStateId).toBe('ecp:public.home:default');

      const clear = await applyAbsoluteOverlayDefect(page);
      await page.waitForTimeout(80);

      // Resize modes: walk the governed width sequence, then probe the known
      // defect-exposing width. Wide desktop can look superficially healthy.
      if (mode !== 'fresh_load') {
        for (let i = 1; i < sequence.length; i += 1) {
          const plan: CasePlan = { ...planFor(entry, sequence[i]!, height), mode };
          await adapter.prepareCase(page, entry, plan);
        }
      }
      const probePlan: CasePlan = {
        ...planFor(entry, probeWidth, height),
        mode: mode === 'fresh_load' ? 'fresh_load' : mode,
      };
      if (mode !== 'fresh_load') {
        await adapter.prepareCase(page, entry, probePlan);
      }
      const defective = await measureCommercialSurface(page, entry, probePlan, {
        expectedOrigin,
        includeAccessibility: false,
      });
      const codes = checkLayoutInvariants(defective, entry).map((f) => f.code);
      expect(codes, `${mode}@${probeWidth}x${height}`).toContain('LAYOUT_ANCESTOR_CLIPPING');
      directional[mode].rejected = true;
      directional[mode].failureCodes = [...new Set(codes)].sort();
      await clear();

      // Corrected HOME must pass after the mode's transition settles.
      const restoreStart: CasePlan = {
        ...planFor(entry, sequence[0]!, height),
        mode: 'fresh_load',
      };
      await adapter.prepareCase(page, entry, restoreStart);
      expect(
        checkLayoutInvariants(
          await measureCommercialSurface(page, entry, restoreStart, {
            expectedOrigin,
            includeAccessibility: false,
          }),
          entry,
        ).map((f) => f.code),
      ).toEqual([]);
      if (mode !== 'fresh_load') {
        for (let i = 1; i < sequence.length; i += 1) {
          await adapter.prepareCase(page, entry, {
            ...planFor(entry, sequence[i]!, height),
            mode,
          });
        }
        const restoreProbe: CasePlan = { ...planFor(entry, probeWidth, height), mode };
        await adapter.prepareCase(page, entry, restoreProbe);
        expect(
          checkLayoutInvariants(
            await measureCommercialSurface(page, entry, restoreProbe, {
              expectedOrigin,
              includeAccessibility: false,
            }),
            entry,
          ).map((f) => f.code),
        ).toEqual([]);
      }
      directional[mode].correctedPass = true;
    }

    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    writeFileSync(
      join(CONTACT_SHEET_DIR, 'old-overlay-directional.json'),
      JSON.stringify(
        {
          fixtureId: 'home_absolute_overlay_clipping',
          modes: directional,
          correctedHomeDirectionalFailures: 0,
        },
        null,
        2,
      ),
    );
    expect(directional.fresh_load.rejected).toBe(true);
    expect(directional.resize_down.rejected).toBe(true);
    expect(directional.resize_up.rejected).toBe(true);
    expect(directional.fresh_load.correctedPass).toBe(true);
    expect(directional.resize_down.correctedPass).toBe(true);
    expect(directional.resize_up.correctedPass).toBe(true);
  });

  test('shared continuous engine: fresh-load (474)', async ({ page }) => {
    test.setTimeout(45 * 60 * 1000);
    const summary = await runHomeModeLayout(page, 'fresh_load');
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    writeFileSync(
      join(CONTACT_SHEET_DIR, 'summary-fresh_load.json'),
      JSON.stringify({ mode: 'fresh_load', ...summary }, null, 2),
    );
    expect(summary.minimumCtaTargetSize).toBeGreaterThanOrEqual(44);
  });

  test('shared continuous engine: resize-down (474)', async ({ page }) => {
    test.setTimeout(45 * 60 * 1000);
    const summary = await runHomeModeLayout(page, 'resize_down');
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    writeFileSync(
      join(CONTACT_SHEET_DIR, 'summary-resize_down.json'),
      JSON.stringify({ mode: 'resize_down', ...summary }, null, 2),
    );
    expect(summary.minimumCtaTargetSize).toBeGreaterThanOrEqual(44);
  });

  test('shared continuous engine: resize-up (474)', async ({ page }) => {
    test.setTimeout(45 * 60 * 1000);
    const summary = await runHomeModeLayout(page, 'resize_up');
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    writeFileSync(
      join(CONTACT_SHEET_DIR, 'summary-resize_up.json'),
      JSON.stringify({ mode: 'resize_up', ...summary }, null, 2),
    );
    expect(summary.minimumCtaTargetSize).toBeGreaterThanOrEqual(44);
  });

  test('shared continuous engine: aggregate continuum summary', async () => {
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    const parts = ['fresh_load', 'resize_down', 'resize_up'].map((mode) =>
      JSON.parse(readFileSync(join(CONTACT_SHEET_DIR, `summary-${mode}.json`), 'utf8')),
    );
    const aggregate = {
      plannedCaseCount: parts.reduce((n: number, p) => n + p.plannedCaseCount, 0),
      caseCount: parts.reduce((n: number, p) => n + p.caseCount, 0),
      failedCount: parts.reduce((n: number, p) => n + p.failedCount, 0),
      widthCount: 79,
      heightCount: HOME_CONTINUOUS_HEIGHTS.length,
      freshLoadCount: parts[0].caseCount,
      resizeDownCount: parts[1].caseCount,
      resizeUpCount: parts[2].caseCount,
      canonicalState: 'ecp:public.home:default',
      registrationRuntimeStateId: 'visual:home',
      minimumCtaTargetSize: Math.min(...parts.map((p) => p.minimumCtaTargetSize)),
    };
    writeFileSync(join(CONTACT_SHEET_DIR, 'summary.json'), JSON.stringify(aggregate, null, 2));
    expect(aggregate.plannedCaseCount).toBe(1422);
    expect(aggregate.failedCount).toBe(0);
    expect(aggregate.minimumCtaTargetSize).toBeGreaterThanOrEqual(44);
  });

  test('representative widths still pass via shared measurement', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);
    const entry = homeVisualEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    const expectedOrigin = new URL(BASE_URL).origin;
    const failures: string[] = [];
    for (const height of [812, 900] as const) {
      for (const width of REPRESENTATIVE_WIDTHS) {
        const plan = planFor(entry, width, height);
        await adapter.prepareCase(page, entry, plan);
        const measured = await measureCommercialSurface(page, entry, plan, {
          expectedOrigin,
          includeAccessibility: false,
        });
        const layoutFails = checkLayoutInvariants(measured, entry);
        if (layoutFails.length) {
          failures.push(`${width}x${height}: ${layoutFails.map((f) => f.code).join(',')}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('contact sheet at height 812 (temporary review output)', async ({ page }) => {
    test.setTimeout(20 * 60 * 1000);
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });
    // Preserve continuum summary JSON written by earlier tests; only replace PNGs/flags.
    for (const name of readdirSync(CONTACT_SHEET_DIR)) {
      if (name.startsWith('home-hero-') || name === 'flags.json') {
        rmSync(join(CONTACT_SHEET_DIR, name), { force: true });
      }
    }
    const entry = homeVisualEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    const expectedOrigin = new URL(BASE_URL).origin;
    const widths = governedWidths(entry);
    const flags: string[] = [];

    for (const width of widths) {
      const plan = planFor(entry, width, CONTACT_SHEET_HEIGHT);
      await adapter.prepareCase(page, entry, plan);
      const measured = await measureCommercialSurface(page, entry, plan, {
        expectedOrigin,
        includeAccessibility: false,
      });
      const layoutFails = checkLayoutInvariants(measured, entry);
      const shot = join(CONTACT_SHEET_DIR, `home-hero-${width}.png`);
      await page.getByTestId('m55-home-hero').screenshot({ path: shot });
      if (layoutFails.length) {
        flags.push(`${width}: ${layoutFails.map((f) => f.code).join(',')}`);
      }
      if (measured.criticalCta && measured.criticalCta.rect.height < 44) {
        flags.push(`${width}: CTA target height ${measured.criticalCta.rect.height}`);
      }
    }

    writeFileSync(join(CONTACT_SHEET_DIR, 'flags.json'), JSON.stringify({ flags }, null, 2));
    expect(flags, flags.join('\n')).toEqual([]);
  });
});
