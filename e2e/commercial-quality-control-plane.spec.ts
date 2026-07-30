/**
 * Commercial quality control plane — browser runner self-tests.
 *
 * These six tests prove the shared engine actually measures a real browser and
 * that its invariants fire on real geometry. Commit A does not migrate HOME
 * continuous execution here; e2e/home-continuous-responsive.spec.ts still owns
 * the HOME width continuum.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { manifestDigest, validateSurfaceManifest } from '../lib/commercialQuality/surfaceManifest';
import {
  planCases,
  runContinuousResponsive,
  summarizeRun,
  formatCaseFailure,
} from '../lib/commercialQuality/continuousResponsiveEngine';
import {
  checkAccessibilityInvariants,
  checkLayoutInvariants,
  checkSemanticInvariants,
  summarizeGates,
} from '../lib/commercialQuality/layoutInvariants';
import type { CasePlan, SurfaceManifestEntry } from '../lib/commercialQuality/types';
import {
  M55_ACCESSIBILITY_DEFERRALS,
  M55_BROWSER_SMOKE_SURFACE_IDS,
  M55_COMMERCIAL_QUALITY_MANIFEST,
  isDeferredAccessibilityFinding,
} from '../lib/m55/commercialUx/qualityControl/m55SurfaceManifest';
import {
  m55SurfaceById,
  verifyM55CommercialQualityRegistration,
} from '../lib/m55/commercialUx/qualityControl/m55ManifestAdapter';
import {
  createM55CommercialQualityAdapter,
  measureCommercialSurface,
  resolveSourceCommit,
} from './helpers/commercialQualityRunner';
import { requireCleanCaptureEnvironment } from './helpers/cleanCaptureEnvironment';

const LABEL = 'commercial-quality-control-plane';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

/**
 * Machine gate evidence consumed by the candidate approval-pack step. Written
 * only when the browser gate is GREEN; the pack step fails closed without it.
 */
const GATE_EVIDENCE_DIR = join('test-results', 'commercial-quality-gate');
const GATE_EVIDENCE_FILE = join(GATE_EVIDENCE_DIR, 'gate-summary.json');

/** Public, unauthenticated surface used for the runner self-tests. */
const SELF_TEST_SURFACE_ID = 'm55:ecp.public.how_m55_works';

function selfTestEntry(): SurfaceManifestEntry {
  const entry = m55SurfaceById(SELF_TEST_SURFACE_ID);
  if (!entry) throw new Error(`${LABEL}: ${SELF_TEST_SURFACE_ID} is not registered`);
  return {
    ...entry,
    // Narrow the sweep: this suite proves the runner, not a width continuum.
    viewport: {
      minWidth: 390,
      maxWidth: 422,
      widthStep: 16,
      breakpointNeighborhoods: [],
      heightMatrix: [844],
    },
    contentStressProfiles: ['short_text'],
    stateVariants: [],
    executionProfiles: ['default'],
  };
}

function planFor(entry: SurfaceManifestEntry): CasePlan {
  const plan = planCases(entry, { modes: ['fresh_load'], profiles: ['default'] })[0];
  if (!plan) throw new Error(`${LABEL}: no case planned`);
  return plan;
}

test.beforeAll(() => {
  requireCleanCaptureEnvironment(LABEL);
  rmSync(GATE_EVIDENCE_DIR, { recursive: true, force: true });
});

test.describe('commercial quality control plane', () => {
  test('1. registration reconciles every imported governed identity', () => {
    const report = verifyM55CommercialQualityRegistration();
    expect(report.failures.map((f) => `${f.code} ${f.message}`)).toEqual([]);
    expect(report.counts.ecpEntries).toBe(report.expectedCounts.ecpEntries);
    expect(report.counts.premiumStates).toBe(report.expectedCounts.premiumStates);
    expect(report.counts.premiumCaptures).toBe(report.expectedCounts.premiumCaptures);
    expect(report.counts.commercialVisualCases).toBe(report.expectedCounts.commercialVisualCases);
    expect(validateSurfaceManifest(M55_COMMERCIAL_QUALITY_MANIFEST)).toEqual([]);
    expect(M55_BROWSER_SMOKE_SURFACE_IDS.length).toBeGreaterThan(0);
  });

  test('2. the runner measures a real registered surface', async ({ page }) => {
    const entry = selfTestEntry();
    const plan = planFor(entry);
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.applyStressProfile(page, entry, {
      profile: 'short_text',
      kind: 'content',
      textShape: { characterBudget: 4, requiredClasses: ['kana'] },
      allowsLoadingIndicator: false,
      allowsEmptyContent: false,
      requiresAuthentication: false,
      requiresStateTransition: false,
    });
    await adapter.prepareCase(page, entry, plan);
    const surface = await adapter.measure(page, entry, plan);

    expect(surface.pageAlive).toBe(true);
    expect(surface.observedRoute).toBe(entry.route);
    expect(surface.observedOrigin).toBe(new URL(BASE_URL).origin);
    expect(surface.governedTextLength).toBeGreaterThan(0);
    expect(surface.landmarks).toContain('main');
    expect(surface.protectedNodes.every((node) => node.found)).toBe(true);
  });

  test('3. geometry invariants pass on the registered surface', async ({ page }) => {
    const entry = selfTestEntry();
    const plan = planFor(entry);
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.prepareCase(page, entry, plan);
    const surface = await adapter.measure(page, entry, plan);

    const failures = [
      ...checkLayoutInvariants(surface, entry),
      ...checkSemanticInvariants(surface, entry, 'short_text'),
    ];
    expect(failures.map((f) => `${f.code}${f.selector ? ` @ ${f.selector}` : ''}`)).toEqual([]);
    expect(surface.documentScrollWidth).toBeLessThanOrEqual(surface.innerWidth + 1);
  });

  test('4. rendered-line reconstruction returns real line geometry', async ({ page }) => {
    const entry = selfTestEntry();
    const plan = planFor(entry);
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.prepareCase(page, entry, plan);
    const surface = await adapter.measure(page, entry, plan);

    const lines = surface.protectedNodes.flatMap((node) => node.renderedLines);
    expect(lines.length).toBeGreaterThan(0);
    // Distinct rendered rows, not a single element-text blob.
    expect(new Set(lines.map((line) => Math.round(line.rect.top))).size).toBe(lines.length);
    expect(lines.every((line) => line.rect.height > 0)).toBe(true);
  });

  test('5. an injected geometry defect is detected, not sanitized', async ({ page }) => {
    const entry = selfTestEntry();
    const plan = planFor(entry);
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.prepareCase(page, entry, plan);

    // Deliberate defect in a throwaway page state: prove the checker fires.
    await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.setAttribute('data-cq-probe', 'clipped');
      probe.style.cssText = 'overflow:hidden;height:20px;width:120px';
      const inner = document.createElement('p');
      inner.setAttribute('data-cq-probe-inner', 'true');
      inner.textContent = 'あなたの傾向を短く整理します';
      inner.style.cssText = 'height:200px;margin:0';
      probe.appendChild(inner);
      document.querySelector('main')?.appendChild(probe);
    });

    const probeEntry: SurfaceManifestEntry = {
      ...entry,
      protectedElements: [
        { selector: '[data-cq-probe-inner="true"]', role: 'copy', requireText: true },
      ],
      criticalCta: null,
      fixedElements: [],
    };
    const surface = await measureCommercialSurface(page, probeEntry, plan, {
      expectedOrigin: new URL(BASE_URL).origin,
      includeAccessibility: false,
    });
    const failures = checkLayoutInvariants(surface, probeEntry);
    const clipping = failures.find((f) => f.code === 'LAYOUT_ANCESTOR_CLIPPING');
    expect(clipping, formatCaseFailure({
      surfaceId: probeEntry.surfaceId,
      runtimeStateId: probeEntry.runtimeStateId,
      route: probeEntry.route,
      viewport: plan.viewport,
      mode: plan.mode,
      profile: plan.profile,
      contentStressProfile: plan.contentStressProfile,
      passed: false,
      failures,
      durationMs: 0,
      setupId: probeEntry.setupId,
      sourceCommit: 'probe',
    })).toBeTruthy();
    expect(clipping?.diagnostics.ancestorOverflow).toBe('hidden');
    expect(clipping?.diagnostics.clippingAncestor).toBeTruthy();
  });

  test('6. the engine drives a multi-width run and classifies accessibility', async ({ page }) => {
    const entry = selfTestEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: true,
    });
    const run = await runContinuousResponsive(entry, adapter, page, {
      modes: ['fresh_load', 'resize_down'],
      profiles: ['default'],
      contentStressProfiles: ['short_text'],
    });

    expect(run.results.length).toBe(run.plannedCaseCount);
    const summary = summarizeRun(run.results);
    expect(summary.freshLoadFailures).toBeGreaterThanOrEqual(0);

    const allFailures = run.results.flatMap((r) => r.failures);
    // Recorded P2 deferrals stay visible but do not mask a new regression.
    const undeferred = allFailures.filter(
      (failure) =>
        !isDeferredAccessibilityFinding(failure.diagnostics.axeRuleId, failure.diagnostics.targets),
    );
    const detail = run.results
      .filter((result) => result.failures.some((f) => undeferred.includes(f)))
      .map(formatCaseFailure)
      .join('\n');
    expect(detail).toBe('');

    const gates = summarizeGates(undeferred);
    expect(gates).toEqual({ geometryGreen: true, semanticGreen: true, accessibilityGreen: true });

    // Accessibility measurement actually ran rather than being skipped, and the
    // only serious findings are the pinned deferrals.
    const probe = await adapter.measure(page, entry, planFor(entry));
    expect(probe.axeViolations.length).toBeGreaterThan(0);
    const serious = probe.axeViolations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    for (const violation of serious) {
      expect(
        isDeferredAccessibilityFinding(violation.id, violation.targets),
        `undeferred ${violation.impact} axe violation ${violation.id}: ${violation.targets.join(', ')}`,
      ).toBe(true);
    }
    expect(M55_ACCESSIBILITY_DEFERRALS.length).toBe(2);
    const probeFailures = checkAccessibilityInvariants(probe, entry).filter(
      (failure) =>
        !isDeferredAccessibilityFinding(failure.diagnostics.axeRuleId, failure.diagnostics.targets),
    );
    expect(probeFailures).toEqual([]);

    // Representative candidate captures for Human review. Never a baseline.
    mkdirSync(GATE_EVIDENCE_DIR, { recursive: true });
    const captures: { relativePath: string; kind: 'png' }[] = [];
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(120);
      const relativePath = `${entry.surfaceId.replace(/[:.]/g, '-')}-${width}.png`;
      await page.screenshot({ path: join(GATE_EVIDENCE_DIR, relativePath), fullPage: false });
      captures.push({ relativePath, kind: 'png' });
    }

    writeFileSync(
      GATE_EVIDENCE_FILE,
      `${JSON.stringify(
        {
          status: 'browser_gate_green',
          sourceCommit: resolveSourceCommit(),
          manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
          gates,
          summary,
          accessibilityDeferrals: M55_ACCESSIBILITY_DEFERRALS,
          changedSurfaces: [entry.surfaceId],
          captures,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });
});
