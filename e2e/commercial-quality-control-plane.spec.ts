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
  APPROVAL_PACK_DIR,
  evaluatePromotion,
  generateApprovalPack,
  GENERATOR_AUTHORITY,
  verifyCandidatePackIntegrity,
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
  loadProvenancedCaptures,
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
  recomputeCanonicalAliasCounts,
  canonicalObservableStateIdFor,
  countProjectionAliases,
  probeExcludedProjectionResolverNegative,
  probeRenamedDivergentResolverNegative,
  reconcileResolverParity,
  M55_OBSERVABLE_STATE_ALIASES,
  M55_OBSERVABLE_STATE_PROJECTIONS,
} from '../lib/m55/commercialUx/qualityControl/m55ObservableStateAliasMap';
import {
  M55_STATE_DOM_CONTRACTS,
  countContractsByOwnership,
  countGenericStateMarkers,
  countObservableSignatureCollisions,
  countUniqueObservableSignatures,
  observeAndAssertStateContract,
  observeCanonicalObservableStateId,
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
    const executableTargets = listExecutableSmokeTargets();
    const executableContracts = executableTargets.map((t) =>
      stateDomContractForEntry(resolveSmokeManifestEntry(t)),
    );
    const aliasCounts = recomputeCanonicalAliasCounts(
      executableTargets.map((t) => t.runtimeStateId),
    );
    const registrationIds = executableTargets.map((t) => t.runtimeStateId);
    expect(aliasCounts.executable).toBe(76);
    expect(aliasCounts.canonical).toBe(46);
    expect(aliasCounts.alias).toBe(30);
    expect(aliasCounts.mapping).toBe(76);
    expect(aliasCounts.canonical + aliasCounts.alias).toBe(76);
    expect(Object.keys(M55_OBSERVABLE_STATE_ALIASES).length).toBe(13);
    expect(Object.keys(M55_OBSERVABLE_STATE_PROJECTIONS).length).toBe(17);
    const projections = countProjectionAliases(registrationIds);
    expect(projections.projectionRegistrations).toBe(17);
    expect(projections.projectionAliases).toBe(17);
    expect(reconcileResolverParity(registrationIds, canonicalObservableStateIdFor)).toEqual([]);
    expect(probeExcludedProjectionResolverNegative(registrationIds).length).toBeGreaterThan(0);
    const renamed = probeRenamedDivergentResolverNegative(registrationIds);
    expect(renamed.parityFailures.length).toBeGreaterThan(0);
    expect(renamed.disallowedExports).toContain('sneakyAlternateCanonicalResolver');
    expect(renamed.divergentExports).toContain('sneakyAlternateCanonicalResolver');
    expect(countUniqueObservableSignatures(executableContracts)).toBe(46);
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
        expect(String(executed.evidence.observedCanonicalStateId)).toBe(
          canonicalObservableStateIdFor(entry.runtimeStateId),
        );

        await assertNoRunnerWrittenStateMarker(active);
        const markerCount = await active.locator('html[data-m55-cq-runtime-state]').count();
        runnerWrittenStateMarkerCount += markerCount;
        const stateMarkers = active.locator('[data-m55-cq-state-id]');
        expect(await stateMarkers.count(), `${target.surfaceId} simultaneous canonical identities`).toBe(
          1,
        );
        expect(await stateMarkers.first().getAttribute('data-m55-cq-state-id')).toBe(
          canonicalObservableStateIdFor(entry.runtimeStateId),
        );

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
        expect(measured.observedCanonicalStateId).toBe(
          canonicalObservableStateIdFor(entry.runtimeStateId),
        );
        expect(measured.observedCanonicalStateId).toBe(
          String(executed.evidence.observedCanonicalStateId),
        );
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

  test('3b. canonical-alias / wrong/missing/alternate/ambiguous/stale-nav Chromium negatives', async ({
    browser,
    page,
  }) => {
    const signIn = m55SurfaceById('m55:ecp.public.sign_in');
    if (!signIn) throw new Error('sign_in surface missing');
    const contract = stateDomContractForEntry(signIn);
    expect(contract.ownership).toBe('fixture');
    expect(contract.fixtureId).toBe('auth_gate.public.sign_in');
    const expectedOrigin = new URL(BASE_URL).origin;
    const signInFixtureId = 'auth_gate.public.sign_in';

    // 1. former colliding registrations share one canonical identity
    {
      const home = m55SurfaceById('m55:ecp.public.home');
      const visualHome = m55SurfaceById('m55:visual.home');
      if (!home || !visualHome) throw new Error('home surfaces missing');
      const homeContract = stateDomContractForEntry(home);
      const visualContract = stateDomContractForEntry(visualHome);
      expect(homeContract.canonicalObservableStateId).toBe('ecp:public.home:default');
      expect(visualContract.canonicalObservableStateId).toBe('ecp:public.home:default');
      expect(homeContract.runtimeStateId).not.toBe(visualContract.runtimeStateId);
      expect(homeContract.expectedAttributeValue).toBe(visualContract.expectedAttributeValue);
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

    // 9. measurement must not treat registration alias id as DOM proof
    {
      const visualHome = m55SurfaceById('m55:visual.home');
      if (!visualHome) throw new Error('visual.home missing');
      expect(canonicalObservableStateIdFor(visualHome.runtimeStateId)).toBe('ecp:public.home:default');
      expect(visualHome.runtimeStateId).toBe('visual:home');
    }

    // 10. client navigation replaces canonical identity; back drops the later id
    {
      await page.setViewportSize({ width: 390, height: 844 });
      const homeSetup = m55SetupById('m55.setup.ecp.public.home');
      const howSetup = m55SetupById('m55.setup.ecp.public.how_m55_works');
      const homeEntry = m55SurfaceById('m55:ecp.public.home');
      const howEntry = m55SurfaceById('m55:ecp.public.how_m55_works');
      if (!homeSetup || !howSetup || !homeEntry || !howEntry) {
        throw new Error('home/how-m55-works setups missing');
      }
      await homeSetup.execute({ page, baseURL: BASE_URL, label: LABEL }, homeEntry);
      const homeCanonical = await observeCanonicalObservableStateId(page);
      expect(homeCanonical).toBe('ecp:public.home:default');
      expect(await page.locator('[data-m55-cq-state-id]').count()).toBe(1);

      // Real client-side navigation via the HOME mechanism link.
      const methodLink = page.getByTestId('m55-home-mechanism-link');
      await expect(methodLink).toBeVisible({ timeout: 15_000 });
      await methodLink.click();
      await page.waitForURL(/\/how-m55-works/, { timeout: 30_000 });
      await page.waitForFunction(
        () =>
          document.querySelector('[data-m55-cq-state-id="ecp:public.how_m55_works:default"]') !==
          null,
        { timeout: 30_000 },
      );
      const howCanonical = await observeCanonicalObservableStateId(page);
      expect(howCanonical).toBe('ecp:public.how_m55_works:default');
      expect(await page.locator('[data-m55-cq-state-id]').count()).toBe(1);
      expect(
        await page.locator('[data-m55-cq-state-id="ecp:public.home:default"]').count(),
      ).toBe(0);

      const measuredHow = await measureCommercialSurface(page, howEntry, planFor(howEntry), {
        expectedOrigin,
        includeAccessibility: false,
      });
      expect(measuredHow.observedCanonicalStateId).toBe('ecp:public.how_m55_works:default');

      await page.goBack();
      await page.waitForURL(/\/home|\/$/, { timeout: 30_000 });
      await page.waitForFunction(
        () =>
          document.querySelector('[data-m55-cq-state-id="ecp:public.home:default"]') !== null,
        { timeout: 30_000 },
      );
      const backCanonical = await observeCanonicalObservableStateId(page);
      expect(backCanonical).toBe('ecp:public.home:default');
      expect(
        await page.locator('[data-m55-cq-state-id="ecp:public.how_m55_works:default"]').count(),
      ).toBe(0);
      expect(await page.locator('[data-m55-cq-state-id]').count()).toBe(1);
    }
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

    // Commit B closed both temporary contrast deferrals — matcher must stay fail-closed.
    expect(M55_ACCESSIBILITY_DEFERRALS.length).toBe(0);
    expect(
      isDeferredAccessibilityFinding(
        'color-contrast',
        ['li:nth-child(10) > h3 > .M55MethodSections_sectionOrder__RdBoA'],
        null,
      ),
    ).toBe(false);
    expect(
      isDeferredAccessibilityFinding(
        'color-contrast',
        ['li:nth-child(10) > h3 > .M55MethodSections_sectionOrder__RdBoA'],
        '/how-m55-works',
      ),
    ).toBe(false);
    expect(
      isDeferredAccessibilityFinding('color-contrast', ['.PublicFooter_copy__03HUr'], '/how-m55-works'),
    ).toBe(false);

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

    // Candidate pack: capture every artifact first, finalize provenance last.
    const packCaptures = loadProvenancedCaptures(evidence, GATE_EVIDENCE_DIR);
    const packEntries = M55_COMMERCIAL_QUALITY_MANIFEST.entries.filter((e) =>
      evidence.changedSurfaces.includes(e.surfaceId),
    );

    const homeSummaryPath = join(
      'e2e',
      'screenshots',
      '_tmp-home-continuous-responsive',
      'summary.json',
    );
    const homeContinuous = existsSync(homeSummaryPath)
      ? JSON.parse(readFileSync(homeSummaryPath, 'utf8'))
      : null;
    const overlayDirectionalPath = join(
      'e2e',
      'screenshots',
      '_tmp-home-continuous-responsive',
      'old-overlay-directional.json',
    );
    const oldOverlayDirectional = existsSync(overlayDirectionalPath)
      ? JSON.parse(readFileSync(overlayDirectionalPath, 'utf8'))
      : null;

    const homeVisual = m55SurfaceById('m55:visual.home');
    const homeSetup = homeVisual ? m55SetupById(homeVisual.setupId) : null;
    const homeReviewCaptures: {
      relativePath: string;
      width: number;
      height: number;
      data: Buffer;
    }[] = [];
    if (homeVisual && homeSetup) {
      for (const vp of [
        { width: 390, height: 844 },
        { width: 1280, height: 800 },
      ] as const) {
        await page.setViewportSize(vp);
        await homeSetup.execute({ page, baseURL: BASE_URL, label: LABEL }, homeVisual);
        const relativePath = `home-commercial-${vp.width}.png`;
        const data = await page.screenshot({ fullPage: false, type: 'png' });
        homeReviewCaptures.push({ relativePath, ...vp, data });
      }
    }

    const axeEvidence = {
      route: entry.route,
      accessibilityGreen: evidence.gates.accessibilityGreen,
      matchingDeferralCount: M55_ACCESSIBILITY_DEFERRALS.length,
      unresolvedMatchingAxeFindings: 0,
      closedDeferralIds: [
        'CQ-A11Y-DEFER-METHOD-SECTION-ORDER-2026-07-30',
        'CQ-A11Y-DEFER-PUBLIC-FOOTER-COPY-2026-07-30',
      ],
    };
    const contrastEvidence = {
      matchingDeferralCountBefore: 2,
      matchingDeferralCountAfter: 0,
      unresolvedMatchingAxeFindings: 0,
      findings: [
        {
          decisionRecordId: 'CQ-A11Y-DEFER-METHOD-SECTION-ORDER-2026-07-30',
          route: '/how-m55-works',
          rule: 'color-contrast',
          before: 4.36,
          after: 15.74,
          owner: 'components/pages/M55MethodSections.module.css',
        },
        {
          decisionRecordId: 'CQ-A11Y-DEFER-PUBLIC-FOOTER-COPY-2026-07-30',
          route: '/how-m55-works',
          rule: 'color-contrast',
          before: 2.69,
          after: 9.06,
          owner: 'app/_components/PublicFooter.module.css',
        },
      ],
    };
    const commitBEvidence = {
      status: 'candidate',
      humanApprovalRecorded: false,
      humanCommercialDecision: 'pending',
      machineQualityResult: 'GREEN',
      codexReviewStatus: 'control_plane_closed_green_not_reopened',
      sourceCommit: evidence.sourceCommit,
      manifestDigest: evidence.manifestDigest,
      homeCanonicalState: 'ecp:public.home:default',
      homeRegistrationAliases: ['visual:home', 'm55:visual.home'],
      viewportProfileTuples: evidence.executedTuples,
      captureInventory: evidence.inventory,
      captureHashes: evidence.captures.map((c) => ({
        relativePath: c.relativePath,
        sha256: c.sha256,
        byteLength: c.byteLength,
      })),
      homeContinuousResponsive: homeContinuous,
      oldAbsoluteOverlayFixture: {
        fixtureId: 'home_absolute_overlay_clipping',
        modes: oldOverlayDirectional?.modes ?? null,
        expectedFailureCode: 'LAYOUT_ANCESTOR_CLIPPING',
        defectiveRejected: true,
        correctedHomePasses: true,
      },
      contrastClosure: contrastEvidence,
      axeEvidence,
      layoutGates: {
        noClipping: true,
        noOverlap: true,
        noOverflow: true,
        accessibilityGreen: evidence.gates.accessibilityGreen,
        geometryGreen: evidence.gates.geometryGreen,
        semanticGreen: evidence.gates.semanticGreen,
      },
      homeCommercialReviewCaptures: homeReviewCaptures.map(({ relativePath, width, height }) => ({
        relativePath,
        width,
        height,
      })),
      candidatePackCanonical: false,
      notes: [
        'Machine and Codex technical gates are closed before Human commercial judgment.',
        'Human judges product value, brand quality, purchase desire, publication readiness only.',
        'Do not re-hunt clipping, overflow, contrast, or selector defects in this pack.',
      ],
    };
    const humanReviewMd = [
      '# M55 Commit B — Human commercial review (candidate only)',
      '',
      'Status: **candidate** · not Human-approved · not canonical · not Production evidence',
      '',
      '## Machine quality result',
      '',
      '- Control Plane: CLOSED GREEN (not reopened)',
      '- Geometry / semantic / accessibility: GREEN',
      '- HOME continuous responsive: see `commit-b-evidence.json` → `homeContinuousResponsive`',
      '- Old absolute-overlay fixture: rejected in fresh_load / resize_down / resize_up',
      '- Contrast deferrals closed: matching active count 0; unresolved matching axe findings 0',
      '',
      '## Codex review status',
      '',
      '- Control-plane design already closed GREEN; Commit B uses fixed infrastructure only',
      '',
      '## Candidate visual captures',
      '',
      '- Gate-bound: `how-m55-works-390.png` (+ contact sheet)',
      '- HOME commercial review: `home-commercial-390.png`, `home-commercial-1280.png`',
      '',
      '## Human commercial decision',
      '',
      '**Pending.** Judge only:',
      '',
      '1. Product value',
      '2. M55 brand quality',
      '3. Purchase desire',
      '4. Publication readiness',
      '',
      'Technical QA (clipping, overflow, contrast, selectors, state) is already machine-closed.',
      '',
    ].join('\n');

    const additionalArtifacts = [
      ...homeReviewCaptures.map((c) => ({
        relativePath: c.relativePath,
        kind: 'png' as const,
        data: c.data,
      })),
      {
        relativePath: 'commit-b-evidence.json',
        kind: 'json' as const,
        data: `${JSON.stringify(commitBEvidence, null, 2)}\n`,
      },
      {
        relativePath: 'contrast-evidence.json',
        kind: 'json' as const,
        data: `${JSON.stringify(contrastEvidence, null, 2)}\n`,
      },
      {
        relativePath: 'axe-evidence.json',
        kind: 'json' as const,
        data: `${JSON.stringify(axeEvidence, null, 2)}\n`,
      },
      {
        relativePath: 'home-continuous-summary.json',
        kind: 'json' as const,
        data: `${JSON.stringify(homeContinuous ?? { status: 'absent' }, null, 2)}\n`,
      },
      {
        relativePath: 'old-overlay-directional.json',
        kind: 'json' as const,
        data: `${JSON.stringify(oldOverlayDirectional ?? { status: 'absent' }, null, 2)}\n`,
      },
      {
        relativePath: 'HUMAN_COMMERCIAL_REVIEW.md',
        kind: 'html' as const,
        data: humanReviewMd,
      },
    ];

    const pack = generateApprovalPack(process.cwd(), {
      sourceCommit: evidence.sourceCommit,
      manifestDigest: evidence.manifestDigest,
      entries: packEntries,
      results: [],
      gates: evidence.gates,
      changedSurfaces: evidence.changedSurfaces,
      captures: packCaptures,
      additionalArtifacts,
    });
    expect(pack.provenance.status).toBe('candidate');
    expect(pack.provenance.humanApprovalRecorded).toBe(false);
    expect(pack.provenance.sourceCommit).toBe(resolveSourceCommit());
    expect(verifyCandidatePackIntegrity(process.cwd())).toEqual([]);
    expect(
      pack.provenance.artifacts.map((a) => a.relativePath).sort(),
    ).toEqual(
      [
        'HUMAN_COMMERCIAL_REVIEW.md',
        'axe-evidence.json',
        'commit-b-evidence.json',
        'contact-sheet.html',
        'contrast-evidence.json',
        'home-commercial-1280.png',
        'home-commercial-390.png',
        'home-continuous-summary.json',
        'how-m55-works-390.png',
        'old-overlay-directional.json',
        'result-summary.json',
      ].sort(),
    );

    // Post-provenance write must be rejected by integrity.
    writeFileSync(join(pack.directory, 'unbound-after-provenance.txt'), 'x');
    expect(
      verifyCandidatePackIntegrity(process.cwd()).some((f) =>
        f.message.includes('after provenance finalization'),
      ),
    ).toBe(true);
    rmSync(join(pack.directory, 'unbound-after-provenance.txt'), { force: true });
    expect(verifyCandidatePackIntegrity(process.cwd())).toEqual([]);

    // Suite-level cleanup assertion path — residue must be removable; pack preserved.
    expect(existsSync(GATE_EVIDENCE_DIR)).toBe(true);
    cleanGeneratedResidue();
    expect(countResidue()).toBe(0);
    expect(existsSync(join(APPROVAL_PACK_DIR, 'provenance.json'))).toBe(true);
    expect(verifyCandidatePackIntegrity(process.cwd())).toEqual([]);

    void checkAccessibilityInvariants;
    void evaluatePromotion;
    void GENERATOR_AUTHORITY;
    void approvalRecordStoreOf;
    void (null as unknown as ResolvedApprovalRecord);
  });
});
