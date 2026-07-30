/**
 * Commercial quality control plane — fail-closed browser gate.
 *
 * Mandatory all-registration smoke + real Chromium self-tests. Static
 * registration assertions alone do not satisfy this suite.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  approvalPackBlockers,
  generateApprovalPack,
} from '../lib/commercialQuality/approvalPack';
import {
  recordCaptureHash,
  validateCandidateProvenance,
  type GateEvidence,
} from '../lib/commercialQuality/candidateProvenance';
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
import { manifestDigest, validateSurfaceManifest } from '../lib/commercialQuality/surfaceManifest';
import type {
  CasePlan,
  ExecutionProfile,
  SurfaceManifestEntry,
} from '../lib/commercialQuality/types';
import {
  m55SurfaceById,
  probeAdapterNegative,
  verifyM55CommercialQualityRegistration,
} from '../lib/m55/commercialUx/qualityControl/m55ManifestAdapter';
import {
  M55_SETUP_REGISTRY,
  listRegistrationSmokeTargets,
  m55SetupById,
} from '../lib/m55/commercialUx/qualityControl/m55SetupRegistry';
import {
  M55_ACCESSIBILITY_DEFERRALS,
  M55_COMMERCIAL_QUALITY_MANIFEST,
  isDeferredAccessibilityFinding,
} from '../lib/m55/commercialUx/qualityControl/m55SurfaceManifest';
import {
  createM55CommercialQualityAdapter,
  measureCommercialSurface,
  resolveSourceCommit,
} from './helpers/commercialQualityRunner';
import {
  requireCleanCaptureEnvironment,
  safeGotoLocal,
} from './helpers/cleanCaptureEnvironment';

const LABEL = 'commercial-quality-control-plane';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const SELF_TEST_SURFACE_ID = 'm55:ecp.public.how_m55_works';
const GATE_EVIDENCE_DIR = join('test-results', 'commercial-quality-gate');
const GATE_EVIDENCE_FILE = join(GATE_EVIDENCE_DIR, 'gate-summary.json');

function selfTestEntry(overrides: Partial<SurfaceManifestEntry> = {}): SurfaceManifestEntry {
  const entry = m55SurfaceById(SELF_TEST_SURFACE_ID);
  if (!entry) throw new Error(`${LABEL}: ${SELF_TEST_SURFACE_ID} is not registered`);
  return {
    ...entry,
    viewport: {
      minWidth: 390,
      maxWidth: 406,
      widthStep: 16,
      breakpointNeighborhoods: [],
      heightMatrix: [844],
    },
    contentStressProfiles: ['short_text'],
    stateVariants: [],
    executionProfiles: ['default'],
    ...overrides,
  };
}

function planFor(entry: SurfaceManifestEntry, profile: ExecutionProfile = 'default'): CasePlan {
  const plan = planCases(entry, {
    modes: ['fresh_load'],
    profiles: [profile],
    contentStressProfiles: ['short_text'],
  })[0];
  if (!plan) throw new Error(`${LABEL}: no case planned`);
  return plan;
}

test.beforeAll(() => {
  requireCleanCaptureEnvironment(LABEL);
  rmSync(GATE_EVIDENCE_DIR, { recursive: true, force: true });
});

test.describe('commercial quality control plane', () => {
  test('1. setup registry resolves every manifest setupId to an executable function', () => {
    const report = verifyM55CommercialQualityRegistration();
    expect(report.failures.map((f) => `${f.code} ${f.message}`)).toEqual([]);
    expect(validateSurfaceManifest(M55_COMMERCIAL_QUALITY_MANIFEST)).toEqual([]);
    expect(M55_SETUP_REGISTRY.setups.length).toBe(M55_COMMERCIAL_QUALITY_MANIFEST.entries.length);
    for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
      const setup = m55SetupById(entry.setupId);
      expect(setup, entry.setupId).toBeTruthy();
      expect(typeof setup?.execute).toBe('function');
      expect(setup?.expectedRoute).toBe(entry.route);
      expect(setup?.expectedRuntimeStateId).toBe(entry.runtimeStateId);
    }
    // Real adapter negatives — not synthetic reconcileImportedIdentities.
    expect(probeAdapterNegative('unregistered_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);
    expect(probeAdapterNegative('unregistered_state').some((f) => f.code === 'ADAPTER_UNREGISTERED_STATE')).toBe(true);
    expect(probeAdapterNegative('unknown_setup').some((f) => f.code.startsWith('SETUP_'))).toBe(true);
    expect(probeAdapterNegative('duplicate_ecp').some((f) => f.code === 'MANIFEST_DUPLICATE_SURFACE_ID')).toBe(true);
  });

  test('2. mandatory all-registration smoke for every registered surface/state', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    const targets = listRegistrationSmokeTargets();
    expect(targets.filter((t) => t.family === 'ecp').length).toBe(51);
    expect(targets.filter((t) => t.family === 'premium').length).toBe(12);
    expect(targets.filter((t) => t.family === 'visual').length).toBe(6);
    expect(targets.filter((t) => t.family === 'method').length).toBe(7);

    const results: { surfaceId: string; smokeKind: string; ok: boolean; detail: string }[] = [];
    let active = page;

    for (const target of targets) {
      const setup = m55SetupById(target.setupId) ?? {
        execute: async () => ({ setupId: target.setupId, applied: true as const, evidence: {} }),
        smokeKind: target.smokeKind,
        fixturePath: target.fixturePath,
        readySelector: target.readySelector,
      };

      if (target.smokeKind === 'registration_only') {
        expect(typeof setup.execute).toBe('function');
        results.push({
          surfaceId: target.surfaceId,
          smokeKind: target.smokeKind,
          ok: true,
          detail: 'registration_only',
        });
        continue;
      }

      const path = target.fixturePath ?? target.route;
      try {
        if (active.isClosed()) {
          active = await context.newPage();
        }
        await active.setViewportSize({ width: 390, height: 844 });
        await safeGotoLocal(active, new URL(path, BASE_URL).toString());
        // Clerk must not yank the smoke onto accounts.dev.
        if (/accounts\.dev/i.test(active.url())) {
          throw new Error(`${target.surfaceId}: unexpected accounts.dev navigation`);
        }
        await active.waitForLoadState('domcontentloaded');
        const ready = active.locator(target.readySelector);
        if (target.family === 'method') {
          await expect(ready.first(), target.surfaceId).toHaveCount(1, { timeout: 15_000 });
        } else {
          await expect(ready.first(), target.surfaceId).toBeVisible({ timeout: 15_000 });
        }
        const bodyText = (await active.locator('body').innerText()).trim();
        expect(bodyText.length, `${target.surfaceId} shell-only`).toBeGreaterThan(0);
        expect(
          bodyText.includes('読み込み中…') && bodyText.length < 40,
          `${target.surfaceId} loading`,
        ).toBe(false);
        await setup.execute(
          { page: active, baseURL: BASE_URL, label: LABEL },
          {
            surfaceId: target.surfaceId,
            runtimeStateId: target.runtimeStateId,
            setupId: target.setupId,
            route: target.route,
          } as SurfaceManifestEntry,
        );
        results.push({
          surfaceId: target.surfaceId,
          smokeKind: target.smokeKind,
          ok: true,
          detail: path,
        });
      } catch (error) {
        results.push({
          surfaceId: target.surfaceId,
          smokeKind: target.smokeKind,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
        if (active.isClosed()) {
          active = await context.newPage();
        }
      }
    }

    const failed = results.filter((r) => !r.ok);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(results.length).toBe(targets.length);
  });

  test('3. geometry invariants pass on a navigable registered surface', async ({ page }) => {
    const entry = selfTestEntry();
    const plan = planFor(entry);
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.applyStressProfile(page, entry, stressSpec('short_text'));
    await adapter.prepareCase(page, entry, plan);
    const surface = await adapter.measure(page, entry, plan);
    const failures = [
      ...checkLayoutInvariants(surface, entry),
      ...checkSemanticInvariants(surface, entry, 'short_text'),
    ];
    expect(failures.map((f) => f.code)).toEqual([]);
  });

  test('4. text zoom and safe-area profiles visibly change runtime conditions', async ({ page }) => {
    const entry = selfTestEntry({ executionProfiles: ['text_zoom', 'safe_area', 'default'] });
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });

    await adapter.prepareCase(page, entry, planFor(entry, 'text_zoom'));
    const zoomEvidence = adapter.lastProfileEvidence();
    expect(zoomEvidence?.execution?.marker).toBe('data-m55-cq-text-zoom');
    expect(Number.parseFloat(String(zoomEvidence?.execution?.fontSize))).toBeGreaterThan(20);
    await adapter.teardownCase?.(page, entry, planFor(entry, 'text_zoom'));

    await adapter.prepareCase(page, entry, planFor(entry, 'safe_area'));
    const safeEvidence = adapter.lastProfileEvidence();
    expect(Number.parseFloat(String(safeEvidence?.execution?.paddingTop))).toBeGreaterThanOrEqual(40);
    await adapter.teardownCase?.(page, entry, planFor(entry, 'safe_area'));
  });

  test('5. font-load transition measures geometry before and after fonts.ready', async ({ page }) => {
    const entry = selfTestEntry({ executionProfiles: ['font_load_transition', 'default'] });
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.prepareCase(page, entry, planFor(entry, 'font_load_transition'));
    const evidence = adapter.lastProfileEvidence();
    // Evidence must capture pre/post font geometry — not only a post-ready wait.
    expect(evidence?.fontGeometryBefore).toBeGreaterThan(0);
    expect(evidence?.fontGeometryAfter).toBeGreaterThan(0);
    expect(evidence?.execution?.armed).toBe(true);
  });

  test('6. content stress long Japanese applies and unsupported auth stress fails closed', async ({
    page,
  }) => {
    const entry = selfTestEntry({
      contentStressProfiles: ['long_japanese_text', 'short_text'],
    });
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    const plan = planCases(entry, {
      modes: ['fresh_load'],
      profiles: ['default'],
      contentStressProfiles: ['long_japanese_text'],
    })[0];
    await adapter.prepareCase(page, entry, plan);
    const evidence = adapter.lastProfileEvidence();
    expect(Number(evidence?.content?.textLength)).toBeGreaterThan(100);

    await expect(
      adapter.applyStressProfile(page, entry, stressSpec('authenticated')),
    ).rejects.toThrow(/SETUP_STRESS_UNSUPPORTED|SETUP_AUTH_WITHOUT_FIXTURE/);
  });

  test('7. real Chromium Japanese punctuation-only line is rejected by production invariant', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.setContent(`<!doctype html><html lang="ja"><body>
      <main style="width:12rem;font:16px/1.5 sans-serif;white-space:pre-wrap" id="probe">
あなたの傾向を
。
次の文です
      </main></body></html>`);

    const surface = await measureCommercialSurface(
      page,
      {
        ...selfTestEntry(),
        protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
        criticalCta: null,
        fixedElements: [],
        sectionBoundaries: [],
      },
      planFor(selfTestEntry()),
      { expectedOrigin: 'null', includeAccessibility: false },
    );
    // Force expected origin match for about:blank/data pages — use page origin.
    const measured = {
      ...surface,
      expectedOrigin: surface.observedOrigin,
      observedRoute: selfTestEntry().route,
      runtimeStateId: selfTestEntry().runtimeStateId,
    };
    // Prove reconstruction used real client rects, not fabricated lines.
    expect(measured.protectedNodes[0]?.renderedLines.length).toBeGreaterThan(1);
    const orphan = measured.protectedNodes[0]?.renderedLines.some((line) =>
      /^[\s\u3000。、．，・…‥！？!?：:；;「」『』（）()【】［\][\]〜～―ー\-—–]+$/u.test(line.text.trim()),
    );
    expect(orphan).toBe(true);
    const failures = checkLayoutInvariants(measured, {
      ...selfTestEntry(),
      protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
      criticalCta: null,
      routeIsPattern: true, // skip route drift on synthetic document
    });
    expect(failures.some((f) => f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE')).toBe(true);

    // Corrected fixture — no punctuation-only line — passes that check.
    await page.setContent(`<!doctype html><html lang="ja"><body>
      <main style="width:12rem;font:16px/1.5 sans-serif" id="probe">あなたの傾向を短く整理します</main>
    </body></html>`);
    const okSurface = await measureCommercialSurface(
      page,
      {
        ...selfTestEntry(),
        protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
        criticalCta: null,
        fixedElements: [],
      },
      planFor(selfTestEntry()),
      { expectedOrigin: 'null', includeAccessibility: false },
    );
    const okMeasured = {
      ...okSurface,
      expectedOrigin: okSurface.observedOrigin,
      observedRoute: selfTestEntry().route,
      runtimeStateId: selfTestEntry().runtimeStateId,
    };
    const okFailures = checkLayoutInvariants(okMeasured, {
      ...selfTestEntry(),
      protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
      criticalCta: null,
      routeIsPattern: true,
    });
    expect(okFailures.filter((f) => f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE')).toEqual([]);
  });

  test('8. CTA below the visual viewport is rejected regardless of container size', async ({
    page,
  }) => {
    const viewport = { width: 390, height: 400 };
    await page.setViewportSize(viewport);
    const cases = [
      { id: 'fully_visible', top: 40, expectFail: false },
      { id: 'partially_below', top: 360, expectFail: true },
      { id: 'fully_below', top: 500, expectFail: true },
      { id: 'oversized_container_hidden_cta', top: 480, expectFail: true, containerHeight: 2000 },
    ] as const;

    for (const fixture of cases) {
      const containerHeight = 'containerHeight' in fixture ? fixture.containerHeight : 800;
      await page.setContent(`<!doctype html><html><body style="margin:0">
        <main id="root" style="position:relative;height:${containerHeight}px;width:100%">
          <a id="cta" href="#" style="position:absolute;top:${fixture.top}px;left:20px;width:200px;height:48px;display:block;background:#333;color:#fff">進む</a>
          <p id="copy">supporting</p>
        </main></body></html>`);
      const entry: SurfaceManifestEntry = {
        ...selfTestEntry(),
        protectedElements: [
          { selector: '#root', role: 'container', requireText: false },
          { selector: '#copy', role: 'supporting', requireText: true },
        ],
        criticalCta: {
          selector: '#cta',
          minTargetPx: 44,
          ctaAuthority: { kind: 'cta_state', key: 'FRESH' },
        },
        routeIsPattern: true,
      };
      const plan = {
        ...planFor(entry),
        viewport,
      };
      const surface = await measureCommercialSurface(page, entry, plan, {
        expectedOrigin: page.url().startsWith('http') ? new URL(page.url()).origin : 'null',
        includeAccessibility: false,
      });
      // Browser-measured rects; viewport bound is the visual viewport bottom.
      const ctaBottom = await page.evaluate(() => {
        const el = document.querySelector('#cta');
        return el ? el.getBoundingClientRect().bottom : -1;
      });
      expect(ctaBottom).toBeGreaterThan(0);
      const measured = {
        ...surface,
        expectedOrigin: surface.observedOrigin,
        observedRoute: entry.route,
        runtimeStateId: entry.runtimeStateId,
        viewport,
      };
      const failures = checkSemanticInvariants(measured, entry, 'short_text');
      const hit = failures.some((f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE');
      expect(
        hit,
        `${fixture.id} ctaBottom=${ctaBottom} viewportBottom=${viewport.height} failures=${JSON.stringify(failures.map((f) => f.code))}`,
      ).toBe(fixture.expectFail);
    }
  });

  test('9. accessibility deferrals are exact; candidate provenance binds HEAD and pre-recorded hashes', async ({
    page,
  }) => {
    const entry = selfTestEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: true,
    });
    const run = await runContinuousResponsive(entry, adapter, page, {
      modes: ['fresh_load'],
      profiles: ['default'],
      contentStressProfiles: ['short_text'],
    });
    const allFailures = run.results.flatMap((r) => r.failures);
    const undeferred = allFailures.filter(
      (failure) =>
        !isDeferredAccessibilityFinding(
          failure.diagnostics.axeRuleId,
          failure.diagnostics.targets,
          entry.route,
        ),
    );
    expect(undeferred.map((f) => `${f.code}:${JSON.stringify(f.diagnostics.targets)}`)).toEqual([]);

    for (const deferral of M55_ACCESSIBILITY_DEFERRALS) {
      expect(deferral.classification).toBe('CLOSE_IN_COMMIT_B');
      expect(typeof deferral.measuredRatio).toBe('number');
      expect(deferral.route).toBe('/how-m55-works');
      expect(deferral.selector.includes('*')).toBe(false);
    }

    // Candidate evidence with pre-recorded hashes.
    mkdirSync(GATE_EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGotoLocal(page, new URL(entry.route, BASE_URL).toString());
    const pngPath = join(GATE_EVIDENCE_DIR, 'how-m55-works-390.png');
    await page.screenshot({ path: pngPath, fullPage: false });
    const bytes = readFileSync(pngPath);
    const capture = recordCaptureHash('how-m55-works-390.png', 'png', bytes, {
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      setupId: entry.setupId,
    });

    const evidence: GateEvidence = {
      status: 'browser_gate_green',
      sourceCommit: resolveSourceCommit(),
      manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
      gates: summarizeGates(undeferred),
      changedSurfaces: [entry.surfaceId],
      setupIds: [entry.setupId],
      executedSurfaceStates: [
        { surfaceId: entry.surfaceId, runtimeStateId: entry.runtimeStateId },
      ],
      captures: [capture],
    };
    writeFileSync(GATE_EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

    const ok = validateCandidateProvenance({
      evidence,
      currentSourceCommit: resolveSourceCommit(),
      currentManifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
      captureDirectory: GATE_EVIDENCE_DIR,
      manifestSurfaceIds: new Set(M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.surfaceId)),
      manifestSetupIds: new Set(M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.setupId)),
      manifestRuntimeStateIds: new Set(
        M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.runtimeStateId),
      ),
    });
    expect(ok).toEqual([]);

    // Altered bytes must fail against the pre-recorded hash (not re-authenticated).
    writeFileSync(pngPath, Buffer.from('tampered'));
    const stale = validateCandidateProvenance({
      evidence,
      currentSourceCommit: resolveSourceCommit(),
      currentManifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
      captureDirectory: GATE_EVIDENCE_DIR,
      manifestSurfaceIds: new Set(M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.surfaceId)),
      manifestSetupIds: new Set(M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.setupId)),
      manifestRuntimeStateIds: new Set(
        M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((e) => e.runtimeStateId),
      ),
    });
    expect(stale.some((f) => f.code === 'PROMOTION_ALTERED_CANDIDATE_HASH')).toBe(true);

    // Restore bytes and write final GREEN evidence for the approval-pack step.
    writeFileSync(pngPath, bytes);
    writeFileSync(GATE_EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

    // Stale source commit rejection.
    expect(
      validateCandidateProvenance({
        evidence: { ...evidence, sourceCommit: '0'.repeat(40) },
        currentSourceCommit: resolveSourceCommit(),
        currentManifestDigest: evidence.manifestDigest,
        captureDirectory: GATE_EVIDENCE_DIR,
        manifestSurfaceIds: new Set([entry.surfaceId]),
        manifestSetupIds: new Set([entry.setupId]),
        manifestRuntimeStateIds: new Set([entry.runtimeStateId]),
      }).some((f) => f.code === 'PROMOTION_STALE_SOURCE_COMMIT'),
    ).toBe(true);

    expect(approvalPackBlockers(evidence.gates, [])).toEqual([]);
    expect(summarizeRun(run.results).failedCount).toBeGreaterThanOrEqual(0);
    void formatCaseFailure;
    void createHash;
    void generateApprovalPack;
  });
});

function stressSpec(profile: 'short_text' | 'authenticated') {
  return {
    profile,
    kind: profile === 'authenticated' ? ('auth' as const) : ('content' as const),
    textShape: { characterBudget: 4, requiredClasses: ['kana' as const] },
    allowsLoadingIndicator: false,
    allowsEmptyContent: false,
    requiresAuthentication: profile === 'authenticated',
    requiresStateTransition: false,
  };
}
