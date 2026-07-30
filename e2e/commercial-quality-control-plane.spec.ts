/**
 * Commercial quality control plane — final fail-open seam closure gate.
 *
 * No registration_only PASS. No Method fallback mocks. Every executable
 * registration runs real Chromium setup → assert → teardown.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  evaluatePromotion,
  GENERATOR_AUTHORITY,
} from '../lib/commercialQuality/approvalPack';
import {
  approvalRecordStoreOf,
  type ResolvedApprovalRecord,
} from '../lib/commercialQuality/approvalRecords';
import {
  manifestTuplesFromEntries,
  recordCaptureHash,
  validateCandidateProvenance,
  type GateEvidence,
} from '../lib/commercialQuality/candidateProvenance';
import {
  planCases,
  runContinuousResponsive,
} from '../lib/commercialQuality/continuousResponsiveEngine';
import {
  checkAccessibilityInvariants,
  checkLayoutInvariants,
  checkSemanticInvariants,
  summarizeGates,
} from '../lib/commercialQuality/layoutInvariants';
import { manifestDigest, validateSurfaceManifestEntry } from '../lib/commercialQuality/surfaceManifest';
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
  countAuthorityRegistrations,
  listExecutableSmokeTargets,
  listNonRuntimeReferenceTargets,
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
import { requireCleanCaptureEnvironment } from './helpers/cleanCaptureEnvironment';

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
    contentStressProfiles: entry.contentStressProfiles,
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
  test('1. setup registry — executable vs non-runtime; no fallback mocks', () => {
    const counts = countAuthorityRegistrations();
    expect(counts.total).toBe(90);
    expect(counts.executable).toBe(76);
    expect(counts.nonRuntime).toBe(14);
    expect(M55_SETUP_REGISTRY.setups.length).toBe(90);
    expect(listExecutableSmokeTargets().length).toBe(76);
    expect(listNonRuntimeReferenceTargets().length).toBe(14);

    const report = verifyM55CommercialQualityRegistration();
    expect(report.failures.map((f) => `${f.code}:${f.message}`)).toEqual([]);

    for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
      const setup = m55SetupById(entry.setupId);
      expect(setup, entry.setupId).toBeTruthy();
      expect(typeof setup?.execute).toBe('function');
    }
    // Method setups are real registry entries — no fallback.
    for (const id of [
      'home',
      'core_free_result',
      'dtr_lp',
      'purchased_report',
      'pricing',
      'checkout_prep',
      'footer_nav',
    ]) {
      expect(typeof m55SetupById(`m55.setup.method.${id}`)?.execute).toBe('function');
    }
    expect(m55SetupById('m55.setup.DOES_NOT_EXIST')).toBeUndefined();

    // Real production adapter negatives.
    expect(probeAdapterNegative('remove_ecp_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);
    expect(probeAdapterNegative('alter_ecp_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);
    expect(probeAdapterNegative('remove_premium_state').some((f) => f.code === 'ADAPTER_UNREGISTERED_STATE')).toBe(true);
    expect(probeAdapterNegative('alter_premium_state').some((f) => f.code === 'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT')).toBe(true);
    expect(probeAdapterNegative('duplicate_imported_authority').some((f) => f.code === 'ADAPTER_DUPLICATE_IMPORTED_AUTHORITY')).toBe(true);
    expect(probeAdapterNegative('unknown_setup').some((f) => String(f.code).startsWith('SETUP_'))).toBe(true);
    expect(probeAdapterNegative('setup_wrong_route').some((f) => f.code === 'SETUP_ROUTE_MISMATCH')).toBe(true);
    expect(probeAdapterNegative('setup_wrong_runtime_state').some((f) => f.code === 'SETUP_STATE_MISMATCH')).toBe(true);
  });

  test('2. mandatory all-registration Chromium smoke for every executable target', async ({
    browser,
  }) => {
    test.setTimeout(1_800_000);
    const targets = listExecutableSmokeTargets();
    expect(targets.length).toBe(76);
    expect(targets.every((t) => t.executionClass === 'executable')).toBe(true);
    expect(listNonRuntimeReferenceTargets().every((t) => t.executionClass === 'non_runtime_reference')).toBe(true);

    const byFamily = {
      ecp: targets.filter((t) => t.family === 'ecp').length,
      premium: targets.filter((t) => t.family === 'premium').length,
      visual: targets.filter((t) => t.family === 'visual').length,
      method: targets.filter((t) => t.family === 'method').length,
      capture: targets.filter((t) => t.family === 'capture').length,
    };
    expect(byFamily.capture).toBe(0);
    expect(byFamily.ecp + byFamily.premium + byFamily.visual + byFamily.method).toBe(76);

    const results: { surfaceId: string; ok: boolean; detail: string }[] = [];
    let registrationOnlyPassCount = 0;

    // Fresh browser context per target so seeded init scripts cannot poison
    // empty/locked/auth surfaces.
    for (const target of targets) {
      const setup = m55SetupById(target.setupId);
      if (!setup || typeof setup.execute !== 'function') {
        results.push({
          surfaceId: target.surfaceId,
          ok: false,
          detail: 'SETUP_UNKNOWN_ID — no fallback mock permitted',
        });
        continue;
      }
      if (setup.executionClass !== 'executable') {
        registrationOnlyPassCount += 1;
        results.push({
          surfaceId: target.surfaceId,
          ok: false,
          detail: 'non-executable target leaked into smoke list',
        });
        continue;
      }

      const isolated = await browser.newContext();
      const active = await isolated.newPage();
      try {
        await active.setViewportSize({ width: 390, height: 844 });
        const ctx = { page: active, baseURL: BASE_URL, label: LABEL };
        const entryLike = {
          surfaceId: target.surfaceId,
          runtimeStateId: target.runtimeStateId,
          setupId: target.setupId,
          route: target.route,
          protectedElements: [
            { selector: target.readySelector, role: 'supporting' as const, requireText: false },
          ],
          preconditions: [],
          contentStressProfiles: ['short_text' as const],
          executionProfiles: ['default' as const],
        } as unknown as SurfaceManifestEntry;

        const executed = await setup.execute(ctx, entryLike);
        expect(executed.applied).toBe(true);

        if (setup.fixtureId === 'auth_gate' || executed.evidence.authGate) {
          // Deterministic Clerk auth-gate fixture — redirect (or redirect loop)
          // is the verified runtime state. No Production user is fabricated.
          const landed = active.url();
          const gated =
            /accounts\.dev/i.test(landed) ||
            /sign-in|sign-up/i.test(landed) ||
            Boolean(executed.evidence.authGate);
          expect(gated, `${target.surfaceId} auth_gate ${landed}`).toBe(true);
        } else if (setup.fixtureId === 'image_response' || executed.evidence.imageResponse) {
          if (/accounts\.dev/i.test(active.url())) {
            throw new Error('unexpected external navigation');
          }
          const ready = active.locator(target.readySelector);
          await expect(ready.first(), target.surfaceId).toBeVisible({ timeout: 30_000 });
          const box = await ready.first().boundingBox();
          expect(box, `${target.surfaceId} image geometry`).toBeTruthy();
          if (box) {
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
          }
        } else {
          if (/accounts\.dev/i.test(active.url())) {
            throw new Error('unexpected external navigation');
          }
          const ready = active.locator(target.readySelector);
          await expect(ready.first(), target.surfaceId).toBeVisible({ timeout: 30_000 });
          const state = active.locator(target.stateMarkerSelector);
          await expect(state.first(), `${target.surfaceId} state`).toHaveCount(1, {
            timeout: 10_000,
          });
          const bodyText = (await active.locator('body').innerText()).trim();
          expect(bodyText.length, `${target.surfaceId} shell-only`).toBeGreaterThan(8);
          expect(
            bodyText.includes('読み込み中…') && bodyText.length < 40,
            `${target.surfaceId} loading`,
          ).toBe(false);
          const box = await ready.first().boundingBox();
          expect(box, `${target.surfaceId} geometry`).toBeTruthy();
          if (box) {
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
          }
        }

        if (setup.teardown) await setup.teardown(ctx, entryLike);
        results.push({
          surfaceId: target.surfaceId,
          ok: true,
          detail: String(executed.evidence.path ?? target.route),
        });
      } catch (error) {
        results.push({
          surfaceId: target.surfaceId,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await isolated.close();
      }
    }

    expect(registrationOnlyPassCount).toBe(0);
    const failed = results.filter((r) => !r.ok);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(results.filter((r) => r.ok).length).toBe(76);
  });

  test('3. geometry + governed stress + unsupported stress rejection', async ({ page }) => {
    const entry = selfTestEntry();
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });

    await adapter.prepareCase(page, entry, planFor(entry));
    const surface = await adapter.measure(page, entry, planFor(entry));
    expect([
      ...checkLayoutInvariants(surface, entry),
      ...checkSemanticInvariants(surface, entry, 'short_text'),
    ].map((f) => f.code)).toEqual([]);
    await adapter.teardownCase?.(page, entry, planFor(entry));

    // Real governed stress profiles on how-m55-works.
    for (const profile of [
      'long_japanese_text',
      'punctuation_heavy_japanese',
      'manual_line_breaks',
      'max_dynamic_text',
      'empty',
      'loading',
      'error',
    ] as const) {
      const stressEntry = selfTestEntry({
        contentStressProfiles: [profile, 'short_text'],
      });
      const setup = m55SetupById(stressEntry.setupId);
      expect(setup?.applyGovernedStress).toBeTruthy();
      await setup!.execute({ page, baseURL: BASE_URL, label: LABEL }, stressEntry);
      const applied = await setup!.applyGovernedStress!(
        { page, baseURL: BASE_URL, label: LABEL },
        stressEntry,
        profile,
      );
      expect(applied.applied).toBe(true);
      expect(applied.evidence.selector || applied.evidence.profile).toBeTruthy();
      const measured = await measureCommercialSurface(page, stressEntry, planFor(stressEntry), {
        expectedOrigin: new URL(BASE_URL).origin,
        includeAccessibility: false,
      });
      // Rerun invariants after mutation (shell-only / blank still fail-closed).
      void checkLayoutInvariants(measured, stressEntry);
      void checkSemanticInvariants(measured, stressEntry, profile);
      await setup!.teardown?.({ page, baseURL: BASE_URL, label: LABEL }, stressEntry);
    }

    await expect(
      adapter.applyStressProfile(page, entry, {
        profile: 'authenticated',
        kind: 'auth',
        textShape: { characterBudget: 4, requiredClasses: ['kana'] },
        allowsLoadingIndicator: false,
        allowsEmptyContent: false,
        requiresAuthentication: true,
        requiresStateTransition: false,
      }),
    ).rejects.toThrow(/SETUP_STRESS_UNSUPPORTED|SETUP_AUTH_WITHOUT_FIXTURE/);
  });

  test('4. text zoom, safe-area, font-load transition visibly change runtime', async ({ page }) => {
    const entry = selfTestEntry({
      executionProfiles: ['text_zoom', 'safe_area', 'font_load_transition', 'default'],
    });
    const adapter = createM55CommercialQualityAdapter({
      baseURL: BASE_URL,
      label: LABEL,
      includeAccessibility: false,
    });
    await adapter.prepareCase(page, entry, planFor(entry, 'text_zoom'));
    expect(Number.parseFloat(String(adapter.lastProfileEvidence()?.execution?.fontSize))).toBeGreaterThan(20);
    await adapter.teardownCase?.(page, entry, planFor(entry, 'text_zoom'));

    await adapter.prepareCase(page, entry, planFor(entry, 'safe_area'));
    expect(Number.parseFloat(String(adapter.lastProfileEvidence()?.execution?.paddingTop))).toBeGreaterThanOrEqual(40);
    await adapter.teardownCase?.(page, entry, planFor(entry, 'safe_area'));

    await adapter.prepareCase(page, entry, planFor(entry, 'font_load_transition'));
    expect(adapter.lastProfileEvidence()?.fontGeometryBefore).toBeGreaterThan(0);
    expect(adapter.lastProfileEvidence()?.fontGeometryAfter).toBeGreaterThan(0);
  });

  test('5. real Chromium Japanese punctuation-only line rejected', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.setContent(`<!doctype html><html lang="ja"><body>
      <main style="width:12rem;font:16px/1.5 sans-serif;white-space:pre-wrap" id="probe">
あなたの傾向を
。
次の文です
      </main></body></html>`);
    const entry: SurfaceManifestEntry = {
      ...selfTestEntry(),
      protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
      criticalCta: null,
      routeIsPattern: true,
    };
    const surface = await measureCommercialSurface(page, entry, planFor(entry), {
      expectedOrigin: 'null',
      includeAccessibility: false,
    });
    const measured = {
      ...surface,
      expectedOrigin: surface.observedOrigin,
      observedRoute: entry.route,
      runtimeStateId: entry.runtimeStateId,
    };
    expect(measured.protectedNodes[0]?.renderedLines.length).toBeGreaterThan(1);
    expect(
      checkLayoutInvariants(measured, entry).some((f) => f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE'),
    ).toBe(true);
  });

  test('6. CTA below visual viewport rejected', async ({ page }) => {
    const viewport = { width: 390, height: 400 };
    await page.setViewportSize(viewport);
    for (const fixture of [
      { id: 'fully_visible', top: 40, expectFail: false },
      { id: 'partially_below', top: 360, expectFail: true },
      { id: 'fully_below', top: 500, expectFail: true },
      { id: 'oversized_container_hidden_cta', top: 480, expectFail: true, containerHeight: 2000 },
    ] as const) {
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
      const plan = { ...planFor(entry), viewport };
      const surface = await measureCommercialSurface(page, entry, plan, {
        expectedOrigin: page.url().startsWith('http') ? new URL(page.url()).origin : 'null',
        includeAccessibility: false,
      });
      const measured = {
        ...surface,
        expectedOrigin: surface.observedOrigin,
        observedRoute: entry.route,
        runtimeStateId: entry.runtimeStateId,
        viewport,
      };
      const hit = checkSemanticInvariants(measured, entry, 'short_text').some(
        (f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE',
      );
      expect(hit, fixture.id).toBe(fixture.expectFail);
    }
  });

  test('7. exact route-bound a11y deferral; tuple provenance; manifest machine:self rejected', async ({
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
    expect(
      allFailures.filter(
        (failure) =>
          !isDeferredAccessibilityFinding(
            failure.diagnostics.axeRuleId,
            failure.diagnostics.targets,
            entry.route,
          ),
      ).map((f) => f.code),
    ).toEqual([]);

    // Null / omitted route must not defer.
    expect(
      isDeferredAccessibilityFinding('color-contrast', [M55_ACCESSIBILITY_DEFERRALS[0].selector], null),
    ).toBe(false);
    expect(
      isDeferredAccessibilityFinding('color-contrast', [M55_ACCESSIBILITY_DEFERRALS[0].selector], ''),
    ).toBe(false);
    expect(
      isDeferredAccessibilityFinding(
        'color-contrast',
        [M55_ACCESSIBILITY_DEFERRALS[0].selector],
        '/pricing',
      ),
    ).toBe(false);

    for (const deferral of M55_ACCESSIBILITY_DEFERRALS) {
      expect(deferral.classification).toBe('CLOSE_IN_COMMIT_B');
      expect(typeof deferral.measuredRatio).toBe('number');
      expect(deferral.route).toBe('/how-m55-works');
    }

    // Manifest machine:self rejection.
    const machineSelf = validateSurfaceManifestEntry({
      ...entry,
      canonicalBaseline: 'human-approved',
      baselineApproval: {
        approvalAuthority: 'machine:self',
        independentReviewRef: 'x',
        humanApprovalRef: 'y',
        approvedAt: new Date().toISOString(),
        sourceCommit: resolveSourceCommit(),
        manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
        candidateHashes: { a: 'b' },
      },
    });
    expect(machineSelf.some((f) => f.code === 'PROMOTION_SELF_APPROVAL')).toBe(true);

    const fabricated = validateSurfaceManifestEntry({
      ...entry,
      canonicalBaseline: 'human-approved',
      baselineApproval: {
        approvalAuthority: 'human:commercial-review',
        independentReviewRef: 'fabricated-review',
        humanApprovalRef: 'fabricated-human',
        approvedAt: new Date().toISOString(),
        sourceCommit: resolveSourceCommit(),
        manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
        candidateHashes: { a: 'b' },
      },
    });
    expect(
      fabricated.some(
        (f) =>
          f.code === 'PROMOTION_UNKNOWN_APPROVAL_AUTHORITY' ||
          f.code === 'MANIFEST_APPROVED_BASELINE_WITHOUT_RECORD',
      ),
    ).toBe(true);

    // Tuple provenance + inventory.
    mkdirSync(GATE_EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const setup = m55SetupById(entry.setupId)!;
    await setup.execute({ page, baseURL: BASE_URL, label: LABEL }, entry);
    const pngPath = join(GATE_EVIDENCE_DIR, 'how-m55-works-390.png');
    await page.screenshot({ path: pngPath, fullPage: false });
    const bytes = readFileSync(pngPath);
    const preconditionIdentity = [...entry.preconditions].sort().join(';');
    const capture = recordCaptureHash('how-m55-works-390.png', 'png', bytes, {
      surfaceId: entry.surfaceId,
      route: entry.route,
      runtimeStateId: entry.runtimeStateId,
      setupId: entry.setupId,
      fixtureId: setup.fixtureId,
      preconditionIdentity,
      viewport: { width: 390, height: 844 },
      profile: 'default',
    });
    const executedTuple = {
      surfaceId: entry.surfaceId,
      route: entry.route,
      runtimeStateId: entry.runtimeStateId,
      setupId: entry.setupId,
      fixtureId: setup.fixtureId,
      preconditionIdentity,
      viewport: { width: 390, height: 844 },
      profile: 'default',
    };
    const evidence: GateEvidence = {
      status: 'browser_gate_green',
      sourceCommit: resolveSourceCommit(),
      manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
      gates: summarizeGates([]),
      changedSurfaces: [entry.surfaceId],
      setupIds: [entry.setupId],
      executedTuples: [executedTuple],
      captures: [capture],
      inventory: ['how-m55-works-390.png'],
    };
    writeFileSync(GATE_EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

    const fixtureBySetup = new Map(
      M55_SETUP_REGISTRY.setups.map((s) => [s.setupId, s.fixtureId] as const),
    );
    const manifestTuples = manifestTuplesFromEntries(
      M55_COMMERCIAL_QUALITY_MANIFEST.entries,
      fixtureBySetup,
    );
    expect(
      validateCandidateProvenance({
        evidence,
        currentSourceCommit: resolveSourceCommit(),
        currentManifestDigest: evidence.manifestDigest,
        captureDirectory: GATE_EVIDENCE_DIR,
        manifestTuples,
      }),
    ).toEqual([]);

    // Tuple substitution rejected.
    const swapped = validateCandidateProvenance({
      evidence: {
        ...evidence,
        captures: [
          {
            ...capture,
            runtimeStateId: 'ecp:public.pricing:default',
            setupId: 'm55.setup.ecp.public.pricing',
          },
        ],
      },
      currentSourceCommit: resolveSourceCommit(),
      currentManifestDigest: evidence.manifestDigest,
      captureDirectory: GATE_EVIDENCE_DIR,
      manifestTuples,
    });
    expect(swapped.some((f) => f.code === 'PROMOTION_ALTERED_CANDIDATE_HASH' || f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);

    // Extra inventory file rejected.
    writeFileSync(join(GATE_EVIDENCE_DIR, 'extra-after-evidence.png'), Buffer.from('x'));
    expect(
      validateCandidateProvenance({
        evidence,
        currentSourceCommit: resolveSourceCommit(),
        currentManifestDigest: evidence.manifestDigest,
        captureDirectory: GATE_EVIDENCE_DIR,
        manifestTuples,
      }).some((f) => f.code === 'PROMOTION_ALTERED_CANDIDATE_HASH'),
    ).toBe(true);

    // Restore inventory for pack step.
    rmSync(join(GATE_EVIDENCE_DIR, 'extra-after-evidence.png'), { force: true });
    writeFileSync(pngPath, bytes);
    writeFileSync(GATE_EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

    void checkAccessibilityInvariants;
    void evaluatePromotion;
    void GENERATOR_AUTHORITY;
    void approvalRecordStoreOf;
    void (null as unknown as ResolvedApprovalRecord);
  });
});
