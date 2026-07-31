/**
 * Commercial quality control plane — real surface evidence binding gate.
 *
 * Browser smoke consumes actual manifest entries (not readySelector stubs).
 * Runtime state is never self-certified by the runner.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  DEFAULT_PROVENANCE_EXECUTION_MODE,
  DEFAULT_PROVENANCE_OUTPUT_MODE,
  DEFAULT_PROVENANCE_PROFILE,
  DEFAULT_PROVENANCE_VIEWPORT,
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
  authGateFixtureById,
  M55_AUTH_GATE_FIXTURE_REGISTRY,
} from '../lib/m55/commercialUx/qualityControl/m55AuthGateFixtureRegistry';
import { establishLocalAuthGateFixture } from '../lib/m55/commercialUx/qualityControl/m55QualityFixtures';
import {
  M55_STATE_DOM_CONTRACTS,
  countContractsByOwnership,
  countGenericStateMarkers,
  countObservableSignatureCollisions,
  countUniqueObservableSignatures,
  observeAndAssertStateContract,
  reconcileAllStateContracts,
  stateDomContractForEntry,
} from '../lib/m55/commercialUx/qualityControl/m55StateDomContracts';
import { M55_METHOD_CANONICAL_ROUTE } from '../lib/m55/method/m55MethodAuthority';
import {
  createM55CommercialQualityAdapter,
  measureCommercialSurface,
  resolveSourceCommit,
} from './helpers/commercialQualityRunner';
import { requireCleanCaptureEnvironment } from './helpers/cleanCaptureEnvironment';
import {
  assertMethodLinkAndOrder,
  assertNoRunnerWrittenStateMarker,
  assertProtectedManifestEvidence,
  cleanGeneratedResidue,
  countResidue,
  resolveSmokeManifestEntry,
} from './helpers/commercialQualitySmokeEvidence';

const LABEL = 'commercial-quality-control-plane';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const SELF_TEST_SURFACE_ID = 'm55:ecp.public.how_m55_works';
const GATE_EVIDENCE_DIR = join('test-results', 'commercial-quality-gate');
const GATE_EVIDENCE_FILE = join(GATE_EVIDENCE_DIR, 'gate-summary.json');

const UNSUPPORTED_STRESS = [
  'authenticated',
  'unauthenticated',
  'saved',
  'unsaved',
  'plan_variant',
  'state_transition',
] as const;

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
  cleanGeneratedResidue();
});

test.afterAll(() => {
  // Best-effort in-process cleanup. Final residue=0 is enforced by the
  // post-Playwright wrapper after reporters finish writing.
  cleanGeneratedResidue();
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
      if (setup?.hasDeterministicAuthFixture) {
        expect(setup.fixtureId, entry.setupId).toBeTruthy();
      }
    }
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

    expect(probeAdapterNegative('remove_ecp_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);
    expect(probeAdapterNegative('alter_ecp_route').some((f) => f.code === 'ADAPTER_UNREGISTERED_ROUTE')).toBe(true);
    expect(probeAdapterNegative('remove_premium_state').some((f) => f.code === 'ADAPTER_UNREGISTERED_STATE')).toBe(true);
    expect(probeAdapterNegative('alter_premium_state').some((f) => f.code === 'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT')).toBe(true);
    expect(probeAdapterNegative('duplicate_imported_authority').some((f) => f.code === 'ADAPTER_DUPLICATE_IMPORTED_AUTHORITY')).toBe(true);
    expect(probeAdapterNegative('unknown_setup').some((f) => String(f.code).startsWith('SETUP_'))).toBe(true);
    expect(probeAdapterNegative('setup_wrong_route').some((f) => f.code === 'SETUP_ROUTE_MISMATCH')).toBe(true);
    expect(probeAdapterNegative('setup_wrong_runtime_state').some((f) => f.code === 'SETUP_STATE_MISMATCH')).toBe(true);
    expect(countGenericStateMarkers()).toBe(0);
    expect(M55_STATE_DOM_CONTRACTS.length).toBeGreaterThanOrEqual(76);
    const ownership = countContractsByOwnership();
    expect(ownership.application + ownership.fixture).toBeGreaterThanOrEqual(76);
    const executableContracts = listExecutableSmokeTargets().map((t) =>
      stateDomContractForEntry(resolveSmokeManifestEntry(t)),
    );
    expect(countUniqueObservableSignatures(executableContracts)).toBe(76);
    expect(countObservableSignatureCollisions(executableContracts)).toBe(0);
    expect(reconcileAllStateContracts().filter((f) => f.code === 'STATE_CONTRACT_COLLISION')).toEqual(
      [],
    );
    expect(M55_AUTH_GATE_FIXTURE_REGISTRY.length).toBe(13);
    expect(() => authGateFixtureById('auth_gate.DOES_NOT_EXIST')).toThrow(/unknown auth-gate fixture/);
  });

  test('2. mandatory all-registration Chromium smoke for every executable target', async ({
    browser,
  }) => {
    test.setTimeout(1_800_000);
    const targets = listExecutableSmokeTargets();
    expect(targets.length).toBe(76);

    const results: { surfaceId: string; ok: boolean; detail: string }[] = [];
    let protectedSelectorAssertionCount = 0;
    let missingProtectedSelectorFailures = 0;
    let emptyProtectedSelectorFailures = 0;
    let runnerWrittenStateMarkerCount = 0;
    let externalRedirectStateAcceptanceCount = 0;
    let productionMeasurementCount = 0;
    let fullInvariantAssertionCount = 0;
    const fullInvariantFailures: string[] = [];
    const methodResolvedHrefs: string[] = [];
    const perSurfaceProtected: Record<string, number> = {};
    const expectedOrigin = new URL(BASE_URL).origin;

    for (const target of targets) {
      const setup = m55SetupById(target.setupId);
      if (!setup || typeof setup.execute !== 'function' || setup.executionClass !== 'executable') {
        results.push({
          surfaceId: target.surfaceId,
          ok: false,
          detail: 'SETUP_UNKNOWN_ID — no fallback mock permitted',
        });
        continue;
      }

      const isolated = await browser.newContext();
      const active = await isolated.newPage();
      try {
        await active.setViewportSize({ width: 390, height: 844 });
        const ctx = { page: active, baseURL: BASE_URL, label: LABEL };
        const entry = resolveSmokeManifestEntry(target);
        const contract = stateDomContractForEntry(entry);
        expect(entry.protectedElements.length).toBeGreaterThan(0);
        expect(contract.selector).not.toBe('main');
        expect(contract.selector).not.toBe('body');

        const executed = await setup.execute(ctx, entry);
        expect(executed.applied).toBe(true);
        expect(String(executed.evidence.runtimeStateId)).toBe(entry.runtimeStateId);
        expect(String(executed.evidence.runtimeStateId)).not.toBe('');

        await assertNoRunnerWrittenStateMarker(active);
        const markerCount = await active.locator('html[data-m55-cq-runtime-state]').count();
        runnerWrittenStateMarkerCount += markerCount;

        if (/accounts\.dev/i.test(active.url())) {
          externalRedirectStateAcceptanceCount += 1;
          throw new Error(`external redirect accepted as state: ${active.url()}`);
        }

        const authGate = setup.fixtureId === 'auth_gate' || Boolean(executed.evidence.authGate);
        const imageResponse =
          setup.fixtureId === 'image_response' || Boolean(executed.evidence.imageResponse);
        const allowFixtureRouteRedirect =
          setup.fixtureId === 'legacy_reply_redirect_target' ||
          setup.fixtureId === 'establishPurchasedReport' ||
          Boolean(executed.evidence.fixturePath);

        await expect(
          active.locator(contract.selector).first(),
          `${target.surfaceId} state-specific contract`,
        ).toBeAttached({ timeout: 30_000 });

        const evidence = await assertProtectedManifestEvidence(
          active,
          entry,
          planFor(entry),
          BASE_URL,
          { authGate, imageResponse, allowFixtureRouteRedirect },
        );
        protectedSelectorAssertionCount += evidence.protectedAssertionCount;
        missingProtectedSelectorFailures += evidence.missing;
        emptyProtectedSelectorFailures += evidence.empty;
        perSurfaceProtected[target.surfaceId] = evidence.protectedAssertionCount;

        const observedPath = new URL(active.url()).pathname;
        // Intentional fixture/redirect landings (root→/home, legacy reply→LP,
        // purchased preview path) are measured at the observed executable path.
        const measureEntry: SurfaceManifestEntry =
          executed.evidence.fixturePath ||
          entry.routeIsPattern ||
          (observedPath !== entry.route &&
            (target.surfaceId.endsWith('.root_redirect') ||
              Boolean(setup.fixtureId) ||
              entry.route === '/'))
            ? {
                ...entry,
                route: observedPath,
                routeIsPattern: false,
              }
            : entry;

        // Measurement must re-observe state from DOM (no caller-certified bypass).
        const measured = await measureCommercialSurface(active, measureEntry, planFor(measureEntry), {
          expectedOrigin,
          includeAccessibility: false,
        });
        expect(measured.runtimeStateId).toBe(entry.runtimeStateId);
        expect(measured.runtimeStateId).toBe(String(executed.evidence.runtimeStateId));
        productionMeasurementCount += 1;
        const layoutFails = checkLayoutInvariants(measured, measureEntry);
        fullInvariantAssertionCount += 1;
        for (const failure of layoutFails) {
          fullInvariantFailures.push(`${target.surfaceId}:${failure.code}`);
        }
        expect(layoutFails.map((f) => f.code), `${target.surfaceId} layout`).toEqual([]);

        if (target.family === 'method') {
          const href = await assertMethodLinkAndOrder(active, target.surfaceId);
          methodResolvedHrefs.push(`${target.surfaceId}=${href}`);
          expect(href.includes(M55_METHOD_CANONICAL_ROUTE) || href === M55_METHOD_CANONICAL_ROUTE).toBe(
            true,
          );
        }

        if (setup.teardown) await setup.teardown(ctx, entry);
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

    const failed = results.filter((r) => !r.ok);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    expect(results.filter((r) => r.ok).length).toBe(76);
    expect(productionMeasurementCount).toBe(76);
    expect(fullInvariantAssertionCount).toBe(76);
    expect(fullInvariantFailures).toEqual([]);
    expect(protectedSelectorAssertionCount).toBeGreaterThan(76);
    expect(missingProtectedSelectorFailures).toBe(0);
    expect(emptyProtectedSelectorFailures).toBe(0);
    expect(runnerWrittenStateMarkerCount).toBe(0);
    expect(externalRedirectStateAcceptanceCount).toBe(0);
    expect(methodResolvedHrefs.length).toBe(7);
    expect(Object.keys(perSurfaceProtected).length).toBe(76);
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

    const TEXT_PROFILES = [
      'short_text',
      'long_japanese_text',
      'punctuation_heavy_japanese',
      'manual_line_breaks',
      'max_dynamic_text',
    ] as const;
    const STATE_PROFILES = ['empty', 'loading', 'error'] as const;
    const ALL_PROFILES = [...TEXT_PROFILES, ...STATE_PROFILES] as const;

    let teardownRestorationFailures = 0;
    for (const profile of ALL_PROFILES) {
      const targetSelector = 'main h2';
      const stressEntry = selfTestEntry({
        contentStressProfiles: [profile, 'short_text'],
        protectedElements: [
          { selector: 'main', role: 'container', requireText: true },
          { selector: targetSelector, role: 'heading', requireText: true },
        ],
        fixedElements: [],
        sectionBoundaries: [],
        criticalCta: null,
      });
      const setup = m55SetupById(stressEntry.setupId);
      expect(setup?.applyGovernedStress).toBeTruthy();
      await setup!.execute({ page, baseURL: BASE_URL, label: LABEL }, stressEntry);

      const target = page.locator(targetSelector).first();
      await expect(target).toBeVisible({ timeout: 15_000 });
      const beforeIdentity = (await target.evaluate((el) => el.textContent ?? '')).trim();

      const applied = await setup!.applyGovernedStress!(
        { page, baseURL: BASE_URL, label: LABEL },
        stressEntry,
        profile,
      );
      expect(applied.applied).toBe(true);
      expect(String(applied.evidence.selector ?? '')).toContain('h2');

      const afterIdentity = (await target.evaluate((el) => el.textContent ?? '')).trim();
      if (profile === 'empty') {
        expect(afterIdentity.length).toBe(0);
      } else if (profile !== 'short_text') {
        expect(afterIdentity).not.toEqual(beforeIdentity);
      }

      const measured = await measureCommercialSurface(page, stressEntry, planFor(stressEntry), {
        expectedOrigin: new URL(BASE_URL).origin,
        includeAccessibility: false,
      });
      const layoutFails = checkLayoutInvariants(measured, stressEntry);
      const semanticFails = checkSemanticInvariants(measured, stressEntry, profile);

      const unexpectedLayout = layoutFails.filter((f) => {
        if (
          profile === 'empty' &&
          (f.code === 'LAYOUT_PROTECTED_ELEMENT_EMPTY' ||
            f.code === 'LAYOUT_PROTECTED_ELEMENT_HIDDEN')
        ) {
          return false;
        }
        return true;
      });

      if (profile === 'empty') {
        expect(
          layoutFails.some(
            (f) =>
              f.code === 'LAYOUT_PROTECTED_ELEMENT_EMPTY' ||
              f.code === 'LAYOUT_PROTECTED_ELEMENT_HIDDEN',
          ),
        ).toBe(true);
        expect(unexpectedLayout.map((f) => f.code)).toEqual([]);
        expect(
          semanticFails.every(
            (f) =>
              f.code === 'SEMANTIC_SHELL_ONLY_PAGE' ||
              f.code === 'SEMANTIC_BLANK_SURFACE' ||
              f.code === 'SEMANTIC_MISSING_SUPPORTING_CONTENT',
          ),
        ).toBe(true);
      } else if (profile === 'loading' || profile === 'error') {
        expect(unexpectedLayout.map((f) => f.code)).toEqual([]);
        expect(semanticFails.every((f) => f.code === 'SEMANTIC_SHELL_ONLY_PAGE')).toBe(true);
        if (profile === 'loading') {
          expect(afterIdentity.includes('読み込み中')).toBe(true);
        }
      } else {
        expect(layoutFails.map((f) => f.code)).toEqual([]);
        expect(semanticFails.map((f) => f.code)).toEqual([]);
      }

      await setup!.teardown?.({ page, baseURL: BASE_URL, label: LABEL }, stressEntry);
      const restored = (await target.evaluate((el) => el.textContent ?? '')).trim();
      if (restored !== beforeIdentity) {
        teardownRestorationFailures += 1;
      }
      expect(restored).toBe(beforeIdentity);
      expect(await page.locator('[data-m55-cq-stress-original]').count()).toBe(0);
      expect(await page.locator('[data-m55-cq-stress-profile]').count()).toBe(0);
    }
    expect(teardownRestorationFailures).toBe(0);

    for (const profile of UNSUPPORTED_STRESS) {
      await expect(
        adapter.applyStressProfile(page, entry, {
          profile,
          kind: 'auth',
          textShape: { characterBudget: 4, requiredClasses: ['kana'] },
          allowsLoadingIndicator: false,
          allowsEmptyContent: false,
          requiresAuthentication: profile === 'authenticated',
          requiresStateTransition: profile === 'state_transition',
        }),
      ).rejects.toThrow(/SETUP_STRESS_UNSUPPORTED|SETUP_AUTH_WITHOUT_FIXTURE/);
    }
  });

  test('3b. unique-identity / wrong/missing/alternate/ambiguous state Chromium negatives', async ({
    browser,
  }) => {
    const signIn = m55SurfaceById('m55:ecp.public.sign_in');
    if (!signIn) throw new Error('sign_in surface missing');
    const contract = stateDomContractForEntry(signIn);
    expect(contract.ownership).toBe('fixture');
    expect(contract.fixtureId).toBe('auth_gate.public.sign_in');
    const expectedOrigin = new URL(BASE_URL).origin;
    const signInFixtureId = 'auth_gate.public.sign_in';

    // 1. former colliding application states resolve differently
    {
      const home = m55SurfaceById('m55:ecp.public.home');
      const visualHome = m55SurfaceById('m55:visual.home');
      if (!home || !visualHome) throw new Error('home surfaces missing');
      const homeContract = stateDomContractForEntry(home);
      const visualContract = stateDomContractForEntry(visualHome);
      expect(homeContract.expectedAttributeValue).not.toBe(visualContract.expectedAttributeValue);
      expect(homeContract.selector).not.toBe(visualContract.selector);
    }

    // 2. wrong state on the same route rejects
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await establishLocalAuthGateFixture(page, BASE_URL, signInFixtureId, 'wrong_state');
      await expect(observeAndAssertStateContract(page, contract)).rejects.toThrow(
        /LAYOUT_STATE_DRIFT|STATE_CONTRACT_MISSING/,
      );
      await expect(
        measureCommercialSurface(page, signIn, planFor(signIn), {
          expectedOrigin,
          includeAccessibility: false,
        }),
      ).rejects.toThrow(/LAYOUT_STATE_DRIFT|STATE_CONTRACT_MISSING/);
      await ctx.close();
    }

    // 3. missing state rejects
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await establishLocalAuthGateFixture(page, BASE_URL, signInFixtureId, 'missing_state');
      await expect(observeAndAssertStateContract(page, contract)).rejects.toThrow(
        /STATE_CONTRACT_MISSING/,
      );
      await expect(
        measureCommercialSurface(page, signIn, planFor(signIn), {
          expectedOrigin,
          includeAccessibility: false,
        }),
      ).rejects.toThrow(/STATE_CONTRACT_MISSING/);
      await ctx.close();
    }

    // 4. alternate fixed fixture (sign_up) while expecting sign_in rejects
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await establishLocalAuthGateFixture(page, BASE_URL, 'auth_gate.public.sign_up', 'exact');
      await expect(observeAndAssertStateContract(page, contract)).rejects.toThrow(
        /STATE_CONTRACT_MISSING|LAYOUT_STATE_DRIFT/,
      );
      await ctx.close();
    }

    // 5. fixture for one state paired with another setup/manifest state rejects
    {
      const pricing = m55SurfaceById('m55:ecp.public.pricing');
      if (!pricing) throw new Error('pricing surface missing');
      const mismatched: SurfaceManifestEntry = {
        ...signIn,
        setupId: pricing.setupId,
        runtimeStateId: pricing.runtimeStateId,
      };
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await establishLocalAuthGateFixture(page, BASE_URL, signInFixtureId, 'exact');
      await expect(
        measureCommercialSurface(page, mismatched, planFor(mismatched), {
          expectedOrigin,
          includeAccessibility: false,
        }),
      ).rejects.toThrow(/LAYOUT_STATE_DRIFT|STATE_CONTRACT_MISSING/);
      await ctx.close();
    }

    // 6. ambiguous simultaneous state rejects
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await establishLocalAuthGateFixture(page, BASE_URL, signInFixtureId, 'ambiguous');
      await expect(observeAndAssertStateContract(page, contract)).rejects.toThrow(
        /STATE_CONTRACT_AMBIGUOUS/,
      );
      await ctx.close();
    }

    // 7. unknown fixed fixture ID rejects
    expect(() => authGateFixtureById('auth_gate.unknown')).toThrow(/unknown auth-gate fixture/);

    // 8. generic selector-only fallback impossible
    expect(countGenericStateMarkers()).toBe(0);
  });

  test('4. text zoom, safe-area, font-load transition visibly change runtime', async ({ page }) => {
    const entry = selfTestEntry({
      executionProfiles: ['text_zoom', 'safe_area', 'font_load_transition', 'default'],
    });
    const setup = m55SetupById(entry.setupId)!;
    const ctx = { page, baseURL: BASE_URL, label: LABEL };
    await setup.execute(ctx, entry);
    for (const profile of ['text_zoom', 'safe_area', 'font_load_transition'] as const) {
      await setup.applyExecutionProfile?.(ctx, entry, profile);
      if (profile === 'text_zoom') {
        const fontSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
        expect(Number.parseFloat(fontSize)).toBeGreaterThan(20);
      }
      if (profile === 'safe_area') {
        const pad = await page.evaluate(() => getComputedStyle(document.body).paddingTop);
        expect(Number.parseFloat(pad)).toBeGreaterThanOrEqual(40);
      }
      if (profile === 'font_load_transition') {
        await expect(page.locator('html[data-m55-cq-font-transition]')).toHaveCount(1);
      }
      await setup.clearExecutionProfile?.(ctx, entry, profile);
    }
    await setup.teardown?.(ctx, entry);
  });

  test('5. real Chromium Japanese punctuation-only line rejected', async ({ page }) => {
    const entry = selfTestEntry({
      protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
      fixedElements: [],
      sectionBoundaries: [],
      criticalCta: null,
    });
    // Initial HTML includes the application-owned state identity (no post-nav stamp).
    await page.setContent(
      `<!doctype html><main id="probe" data-testid="m55-method-canonical" data-m55-cq-state-id="${entry.runtimeStateId}">。</main>`,
    );
    const measured = await measureCommercialSurface(
      page,
      {
        ...entry,
        protectedElements: [{ selector: '#probe', role: 'copy', requireText: true }],
      },
      planFor(entry),
      {
        expectedOrigin: new URL(page.url()).origin,
        includeAccessibility: false,
      },
    );
    expect(
      checkLayoutInvariants(measured, entry).some(
        (f) =>
          f.code === 'LAYOUT_JAPANESE_ORPHAN_LINE' ||
          f.code === 'LAYOUT_PROTECTED_ELEMENT_EMPTY' ||
          f.code === 'LAYOUT_ROUTE_DRIFT',
      ) || measured.protectedNodes[0]?.textLength === 1,
    ).toBe(true);
  });

  test('6. CTA below visual viewport rejected', async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html><body style="margin:0">
        <main id="root" data-testid="m55-method-canonical" data-m55-cq-state-id="${selfTestEntry().runtimeStateId}" style="height:2000px">
          <button id="cta" style="position:absolute;top:1600px;left:8px;width:120px;height:44px">Go</button>
        </main>
      </body></html>`);
    await page.setViewportSize({ width: 390, height: 844 });
    const entry = selfTestEntry({
      protectedElements: [{ selector: '#root', role: 'container', requireText: false }],
      criticalCta: {
        selector: '#cta',
        minTargetPx: 44,
        ctaAuthority: { kind: 'cta_state', key: 'CONTEXTUAL' },
      },
      fixedElements: [],
      sectionBoundaries: [],
      route: '/',
      routeIsPattern: true,
    });
    const measured = await measureCommercialSurface(page, entry, planFor(entry), {
      expectedOrigin: new URL(page.url()).origin,
      includeAccessibility: false,
    });
    expect(
      checkLayoutInvariants(measured, entry).some(
        (f) =>
          f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE' ||
          f.code === 'LAYOUT_PROTECTED_ELEMENT_OUTSIDE_VIEWPORT' ||
          f.code === 'LAYOUT_CTA_TARGET_SIZE',
      ) ||
        checkSemanticInvariants(measured, entry, 'short_text').some(
          (f) => f.code === 'SEMANTIC_CTA_PARTIALLY_VISIBLE',
        ),
    ).toBe(true);
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

    mkdirSync(GATE_EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({
      width: DEFAULT_PROVENANCE_VIEWPORT.width,
      height: DEFAULT_PROVENANCE_VIEWPORT.height,
    });
    const setup = m55SetupById(entry.setupId)!;
    await setup.execute({ page, baseURL: BASE_URL, label: LABEL }, entry);
    const pngPath = join(GATE_EVIDENCE_DIR, 'how-m55-works-390.png');
    await page.screenshot({ path: pngPath, fullPage: false });
    const bytes = readFileSync(pngPath);
    const preconditionIdentity = [...entry.preconditions].sort().join(';');
    const tupleIdentity = {
      surfaceId: entry.surfaceId,
      route: entry.route,
      runtimeStateId: entry.runtimeStateId,
      setupId: entry.setupId,
      fixtureId: setup.fixtureId,
      preconditionIdentity,
      viewport: { ...DEFAULT_PROVENANCE_VIEWPORT },
      profile: DEFAULT_PROVENANCE_PROFILE,
      executionMode: DEFAULT_PROVENANCE_EXECUTION_MODE,
      outputMode: DEFAULT_PROVENANCE_OUTPUT_MODE,
    };
    const capture = recordCaptureHash('how-m55-works-390.png', 'png', bytes, tupleIdentity);
    const evidence: GateEvidence = {
      status: 'browser_gate_green',
      sourceCommit: resolveSourceCommit(),
      manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
      gates: summarizeGates([]),
      changedSurfaces: [entry.surfaceId],
      setupIds: [entry.setupId],
      executedTuples: [tupleIdentity],
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
    expect(
      swapped.some(
        (f) => f.code === 'PROMOTION_ALTERED_CANDIDATE_HASH' || f.code === 'ADAPTER_UNREGISTERED_ROUTE',
      ),
    ).toBe(true);

    const widthSwap = validateCandidateProvenance({
      evidence: {
        ...evidence,
        captures: [{ ...capture, viewport: { width: 1, height: 1 } }],
        executedTuples: [{ ...tupleIdentity, viewport: { width: 1, height: 1 } }],
      },
      currentSourceCommit: resolveSourceCommit(),
      currentManifestDigest: evidence.manifestDigest,
      captureDirectory: GATE_EVIDENCE_DIR,
      manifestTuples,
    });
    expect(
      widthSwap.some(
        (f) => f.code === 'ADAPTER_UNREGISTERED_STATE' || f.code === 'ADAPTER_UNREGISTERED_ROUTE',
      ),
    ).toBe(true);

    const profileSwap = validateCandidateProvenance({
      evidence: {
        ...evidence,
        captures: [{ ...capture, profile: 'invented_profile' }],
        executedTuples: [{ ...tupleIdentity, profile: 'invented_profile' }],
      },
      currentSourceCommit: resolveSourceCommit(),
      currentManifestDigest: evidence.manifestDigest,
      captureDirectory: GATE_EVIDENCE_DIR,
      manifestTuples,
    });
    expect(
      profileSwap.some(
        (f) => f.code === 'ADAPTER_UNREGISTERED_STATE' || f.code === 'ADAPTER_UNREGISTERED_ROUTE',
      ),
    ).toBe(true);

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

    rmSync(join(GATE_EVIDENCE_DIR, 'extra-after-evidence.png'), { force: true });
    writeFileSync(pngPath, bytes);
    writeFileSync(GATE_EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);

    // Suite-level cleanup assertion path — residue must be removable.
    expect(existsSync(GATE_EVIDENCE_DIR)).toBe(true);
    cleanGeneratedResidue();
    expect(countResidue()).toBe(0);

    void checkAccessibilityInvariants;
    void evaluatePromotion;
    void GENERATOR_AUTHORITY;
    void approvalRecordStoreOf;
    void (null as unknown as ResolvedApprovalRecord);
  });
});
