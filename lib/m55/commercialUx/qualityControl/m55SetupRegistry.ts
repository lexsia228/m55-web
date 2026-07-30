/**
 * Executable M55 setup registry.
 *
 * Every manifest setupId resolves here to a real function with route/state/
 * stress contracts. The generic engine never imports this module; the M55
 * adapter and browser runner do.
 */
import type { Page } from '@playwright/test';

import type {
  ContentStressProfile,
  ExecutionProfile,
  SurfaceManifestEntry,
} from '../../../commercialQuality/types';
import type {
  ExecutableSetup,
  SetupContext,
  SetupRegistry,
  SetupSmokeKind,
  StressApplicationResult,
} from '../../../commercialQuality/setupRegistry';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from '../experience/experienceRouteRegistry';
import { PREMIUM_EXPERIENCE_STATE_REGISTRY } from '../premiumExperience/premiumExperienceStateRegistry';
import { PREMIUM_EXPERIENCE_CAPTURE_CASES } from '../premiumExperience/premiumExperienceCaptureModel';
import { COMMERCIAL_VISUAL_CASES } from '../visualQuality/commercialVisualQualityContract';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import {
  M55_COMMERCIAL_QUALITY_MANIFEST,
  M55_GOVERNED_ROOT_SELECTOR,
  M55_QUALITY_PROJECT_ID,
} from './m55SurfaceManifest';

const DEFAULT_CONTENT: readonly ContentStressProfile[] = [
  'short_text',
  'long_japanese_text',
  'unauthenticated',
];
const STRESS_CONTENT: readonly ContentStressProfile[] = [
  'short_text',
  'long_japanese_text',
  'punctuation_heavy_japanese',
  'manual_line_breaks',
  'max_dynamic_text',
  'empty',
  'loading',
  'error',
  'unauthenticated',
];
const DEFAULT_EXECUTION: readonly ExecutionProfile[] = ['default', 'reduced_motion'];
const FULL_EXECUTION: readonly ExecutionProfile[] = [
  'default',
  'text_zoom',
  'font_load_transition',
  'reduced_motion',
  'safe_area',
];

function asPage(context: SetupContext): Page {
  return context.page as Page;
}

async function applyExecutionProfileOnPage(
  page: Page,
  profile: ExecutionProfile,
): Promise<StressApplicationResult> {
  const evidence: Record<string, unknown> = { profile };
  if (profile === 'default') {
    await page.emulateMedia({ reducedMotion: null });
    evidence.emulate = 'default';
    return { profile, applied: true, evidence };
  }
  if (profile === 'reduced_motion') {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    evidence.emulate = 'reduced_motion';
    return { profile, applied: true, evidence, cleanupToken: 'reduced_motion' };
  }
  if (profile === 'text_zoom') {
    await page.evaluate(() => {
      document.documentElement.style.setProperty('font-size', '150%', 'important');
      document.documentElement.setAttribute('data-m55-cq-text-zoom', '1');
    });
    const measured = await page.evaluate(
      () => getComputedStyle(document.documentElement).fontSize,
    );
    evidence.fontSize = measured;
    evidence.marker = 'data-m55-cq-text-zoom';
    if (!measured || Number.parseFloat(measured) < 20) {
      throw new Error('text_zoom did not enlarge root font size');
    }
    return { profile, applied: true, evidence, cleanupToken: 'text_zoom' };
  }
  if (profile === 'safe_area') {
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.setAttribute('data-m55-cq-safe-area', '1');
      style.textContent = `
        :root {
          --m55-cq-safe-top: 48px;
          --m55-cq-safe-bottom: 34px;
        }
        body {
          padding-top: var(--m55-cq-safe-top) !important;
          padding-bottom: var(--m55-cq-safe-bottom) !important;
        }
      `;
      document.head.appendChild(style);
      document.documentElement.setAttribute('data-m55-cq-safe-area', '1');
    });
    const paddingTop = await page.evaluate(() => getComputedStyle(document.body).paddingTop);
    evidence.paddingTop = paddingTop;
    if (Number.parseFloat(paddingTop) < 40) {
      throw new Error('safe_area did not apply body padding');
    }
    return { profile, applied: true, evidence, cleanupToken: 'safe_area' };
  }
  if (profile === 'font_load_transition') {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-m55-cq-font-transition', 'pending');
    });
    evidence.armed = true;
    return { profile, applied: true, evidence, cleanupToken: 'font_load_transition' };
  }
  throw new Error(`unsupported execution profile: ${profile}`);
}

async function clearExecutionProfileOnPage(page: Page, profile: ExecutionProfile): Promise<void> {
  if (profile === 'reduced_motion' || profile === 'default') {
    await page.emulateMedia({ reducedMotion: null });
  }
  if (profile === 'text_zoom') {
    await page.evaluate(() => {
      document.documentElement.style.removeProperty('font-size');
      document.documentElement.removeAttribute('data-m55-cq-text-zoom');
    });
  }
  if (profile === 'safe_area') {
    await page.evaluate(() => {
      document.querySelectorAll('style[data-m55-cq-safe-area]').forEach((node) => node.remove());
      document.documentElement.removeAttribute('data-m55-cq-safe-area');
    });
  }
  if (profile === 'font_load_transition') {
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-m55-cq-font-transition');
    });
  }
}

async function applyContentStressOnPage(
  page: Page,
  profile: ContentStressProfile,
): Promise<StressApplicationResult> {
  const LONG =
    'これは長い日本語の試験文です。傾向の輪郭と負荷の置き方を丁寧に並べて、表示が折り返されても欠けないことを確かめます。'.repeat(
      4,
    );
  const PUNCT = '傾向を、短く、整理する。…そして、次へ進む！？「引用」と（括弧）。'.repeat(3);
  const MANUAL = '一行目の日本語です。\n二行目の日本語です。\n。\n三行目の日本語です。';
  const MAX = LONG + PUNCT;

  const payload: Record<ContentStressProfile, string | null> = {
    short_text: '短い文',
    long_japanese_text: LONG,
    punctuation_heavy_japanese: PUNCT,
    manual_line_breaks: MANUAL,
    max_dynamic_text: MAX,
    empty: '',
    loading: null,
    error: 'エラー状態の試験表示',
    authenticated: null,
    unauthenticated: null,
    saved: null,
    unsaved: null,
    plan_variant: null,
    state_transition: null,
  };

  if (profile === 'authenticated' || profile === 'state_transition' || profile === 'saved') {
    throw new Error(
      `SETUP_STRESS_UNSUPPORTED: ${profile} requires a deterministic auth/state fixture`,
    );
  }

  const evidence = await page.evaluate(
    ({ profileName, text }) => {
      const main = document.querySelector('main');
      if (!main) throw new Error('main missing for content stress');
      let probe = document.querySelector('[data-m55-cq-stress-probe]') as HTMLElement | null;
      if (!probe) {
        probe = document.createElement('div');
        probe.setAttribute('data-m55-cq-stress-probe', '1');
        probe.style.cssText = 'max-width:20rem;white-space:pre-wrap;line-height:1.5;';
        main.appendChild(probe);
      }
      probe.setAttribute('data-m55-cq-stress-profile', profileName);
      if (profileName === 'loading') {
        probe.setAttribute('aria-busy', 'true');
        probe.setAttribute('data-m55-loading', 'true');
        probe.textContent = '読み込み中…';
      } else if (profileName === 'empty') {
        probe.removeAttribute('aria-busy');
        probe.removeAttribute('data-m55-loading');
        probe.textContent = '';
      } else if (text !== null) {
        probe.removeAttribute('aria-busy');
        probe.removeAttribute('data-m55-loading');
        probe.textContent = text;
      }
      return {
        profile: profileName,
        textLength: (probe.textContent ?? '').length,
        marker: probe.getAttribute('data-m55-cq-stress-profile'),
      };
    },
    { profileName: profile, text: payload[profile] },
  );

  return { profile, applied: true, evidence, cleanupToken: 'content_stress' };
}

async function clearContentStressOnPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('[data-m55-cq-stress-probe]').forEach((node) => node.remove());
  });
}

function buildSetup(params: {
  entry: Pick<
    SurfaceManifestEntry,
    | 'setupId'
    | 'route'
    | 'runtimeStateId'
    | 'preconditions'
    | 'contentStressProfiles'
    | 'executionProfiles'
    | 'requiresAuthentication'
    | 'surfaceId'
  >;
  smokeKind: SetupSmokeKind;
  fixturePath: string | null;
  readySelector: string;
  authenticationMode: ExecutableSetup['authenticationMode'];
  hasDeterministicAuthFixture: boolean;
  content: readonly ContentStressProfile[];
  execution: readonly ExecutionProfile[];
}): ExecutableSetup {
  const {
    entry,
    smokeKind,
    fixturePath,
    readySelector,
    authenticationMode,
    hasDeterministicAuthFixture,
    content,
    execution,
  } = params;

  return {
    setupId: entry.setupId,
    expectedRoute: entry.route,
    expectedRuntimeStateId: entry.runtimeStateId,
    authenticationMode,
    preconditions: entry.preconditions,
    supportedContentStressProfiles: content,
    supportedExecutionProfiles: execution,
    smokeKind,
    fixturePath,
    readySelector,
    hasDeterministicAuthFixture,
    execute: async (context, surface) => {
      const page = asPage(context);
      if (smokeKind === 'registration_only') {
        return {
          setupId: entry.setupId,
          applied: true,
          evidence: {
            smokeKind,
            surfaceId: surface.surfaceId,
            reason: 'registration_only — no deterministic navigable fixture',
          },
        };
      }
      const path = smokeKind === 'navigate_fixture' && fixturePath ? fixturePath : entry.route;
      const ready = await page.locator(readySelector).count();
      return {
        setupId: entry.setupId,
        applied: true,
        evidence: {
          smokeKind,
          path,
          readySelector,
          readyCount: ready,
          surfaceId: surface.surfaceId,
        },
      };
    },
    teardown: async (context) => {
      const page = asPage(context);
      await clearContentStressOnPage(page);
      for (const profile of execution) {
        await clearExecutionProfileOnPage(page, profile);
      }
    },
    applyContentStress: async (context, _entry, profile) => {
      if (!content.includes(profile)) {
        throw new Error(`SETUP_STRESS_UNSUPPORTED: ${profile}`);
      }
      return applyContentStressOnPage(asPage(context), profile);
    },
    clearContentStress: async (context) => clearContentStressOnPage(asPage(context)),
    applyExecutionProfile: async (context, _entry, profile) => {
      if (!execution.includes(profile)) {
        throw new Error(`SETUP_STRESS_UNSUPPORTED: ${profile}`);
      }
      return applyExecutionProfileOnPage(asPage(context), profile);
    },
    clearExecutionProfile: async (context, _entry, profile) =>
      clearExecutionProfileOnPage(asPage(context), profile),
  };
}

function smokeKindForEcp(
  routeId: string,
  pattern: string,
  privacy: string,
  migration: string,
): {
  kind: SetupSmokeKind;
  fixturePath: string | null;
  auth: ExecutableSetup['authenticationMode'];
  hasAuthFixture: boolean;
} {
  if (
    migration === 'prototype_gated' ||
    migration === 'dev_only' ||
    migration === 'quiet_disabled' ||
    migration === 'legacy_adjacent'
  ) {
    // Quiet-disabled / legacy / gated routes are registered but not claimed as
    // navigable commercial smoke loads without a dedicated fixture lane.
    return { kind: 'registration_only', fixturePath: null, auth: 'none', hasAuthFixture: false };
  }
  if (pattern.includes(':') || pattern.includes('*')) {
    if (routeId.startsWith('shared.')) {
      return {
        kind: 'navigate_fixture',
        fixturePath: '/r/cq-smoke-invalid',
        auth: 'none',
        hasAuthFixture: true,
      };
    }
    return { kind: 'registration_only', fixturePath: null, auth: 'none', hasAuthFixture: false };
  }
  if (privacy === 'authenticated') {
    // No deterministic Clerk session fixture in this lane — registration only.
    return {
      kind: 'registration_only',
      fixturePath: null,
      auth: 'authenticated',
      hasAuthFixture: false,
    };
  }
  if (privacy === 'purchased_private') {
    return {
      kind: 'registration_only',
      fixturePath: null,
      auth: 'purchased_private',
      hasAuthFixture: false,
    };
  }
  return { kind: 'navigate', fixturePath: null, auth: 'unauthenticated', hasAuthFixture: false };
}

function buildAllSetups(): ExecutableSetup[] {
  const bySetupId = new Map<string, ExecutableSetup>();
  const entriesBySetup = new Map(
    M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((entry) => [entry.setupId, entry]),
  );

  for (const ecp of M55_EXPERIENCE_ROUTE_REGISTRY) {
    const setupId = `m55.setup.ecp.${ecp.id}`;
    const entry = entriesBySetup.get(setupId);
    if (!entry) continue;
    const smoke = smokeKindForEcp(ecp.id, ecp.pattern, ecp.privacy, ecp.migration);
    const navigable = smoke.kind === 'navigate' || smoke.kind === 'navigate_fixture';
    bySetupId.set(
      setupId,
      buildSetup({
        entry,
        smokeKind: smoke.kind,
        fixturePath: smoke.fixturePath,
        readySelector:
          smoke.auth === 'authenticated' ? 'body' : M55_GOVERNED_ROOT_SELECTOR,
        authenticationMode: smoke.auth,
        hasDeterministicAuthFixture: smoke.hasAuthFixture,
        // Setup support must be a superset of the manifest declaration.
        content: [
          ...new Set([
            ...entry.contentStressProfiles,
            ...(navigable ? STRESS_CONTENT : DEFAULT_CONTENT),
          ]),
        ],
        execution: [
          ...new Set([
            ...entry.executionProfiles,
            ...(navigable ? FULL_EXECUTION : DEFAULT_EXECUTION),
          ]),
        ],
      }),
    );
  }

  for (const state of PREMIUM_EXPERIENCE_STATE_REGISTRY) {
    const setupId = `m55.setup.premium.${state.id}`;
    const entry = entriesBySetup.get(setupId);
    if (!entry) continue;
    const purchased = state.shareAuthority === 'purchased_private';
    const navigable = !purchased && !state.routePattern.includes(':');
    bySetupId.set(
      setupId,
      buildSetup({
        entry,
        smokeKind: navigable ? 'navigate' : 'registration_only',
        fixturePath: null,
        readySelector: 'main',
        authenticationMode: purchased ? 'purchased_private' : 'unauthenticated',
        hasDeterministicAuthFixture: false,
        content: [...new Set([...entry.contentStressProfiles, ...(navigable ? STRESS_CONTENT : [])])],
        execution: [
          ...new Set([...entry.executionProfiles, ...(navigable ? FULL_EXECUTION : ['default' as const])]),
        ],
      }),
    );
  }

  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    const setupId = `m55.setup.capture.${capture.captureId}`;
    const entry = entriesBySetup.get(setupId);
    if (!entry) continue;
    bySetupId.set(
      setupId,
      buildSetup({
        entry,
        smokeKind: 'registration_only',
        fixturePath: null,
        readySelector: capture.visibleContract.locator,
        authenticationMode: 'none',
        hasDeterministicAuthFixture: false,
        content: [...entry.contentStressProfiles],
        execution: [...entry.executionProfiles],
      }),
    );
  }

  for (const visual of COMMERCIAL_VISUAL_CASES) {
    const surfaceId = `${M55_QUALITY_PROJECT_ID}:visual.${visual.caseId}`;
    const entry = M55_COMMERCIAL_QUALITY_MANIFEST.entries.find((e) => e.surfaceId === surfaceId);
    if (!entry) continue;
    const needsFixture = visual.setup !== 'none';
    bySetupId.set(
      entry.setupId,
      buildSetup({
        entry,
        smokeKind: needsFixture ? 'registration_only' : 'navigate',
        fixturePath: null,
        readySelector: visual.readySelector,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        content: [...entry.contentStressProfiles],
        execution: [...entry.executionProfiles],
      }),
    );
  }

  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    if (bySetupId.has(entry.setupId)) continue;
    bySetupId.set(
      entry.setupId,
      buildSetup({
        entry,
        smokeKind: 'registration_only',
        fixturePath: null,
        readySelector: M55_GOVERNED_ROOT_SELECTOR,
        authenticationMode: entry.requiresAuthentication ? 'authenticated' : 'none',
        hasDeterministicAuthFixture: false,
        content: entry.contentStressProfiles,
        execution: entry.executionProfiles,
      }),
    );
  }

  return [...bySetupId.values()];
}

export const M55_SETUP_REGISTRY: SetupRegistry = {
  projectId: M55_QUALITY_PROJECT_ID,
  setups: buildAllSetups(),
};

export function m55SetupById(setupId: string): ExecutableSetup | undefined {
  return M55_SETUP_REGISTRY.setups.find((setup) => setup.setupId === setupId);
}

export type RegistrationSmokeTarget = {
  surfaceId: string;
  runtimeStateId: string;
  setupId: string;
  route: string;
  smokeKind: SetupSmokeKind;
  fixturePath: string | null;
  readySelector: string;
  family: 'ecp' | 'premium' | 'capture' | 'visual' | 'method';
};

export function listRegistrationSmokeTargets(): readonly RegistrationSmokeTarget[] {
  const targets: RegistrationSmokeTarget[] = [];

  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    const setup = m55SetupById(entry.setupId);
    if (!setup) continue;
    let family: RegistrationSmokeTarget['family'] = 'ecp';
    if (entry.surfaceId.includes(':premium.')) family = 'premium';
    else if (entry.surfaceId.includes(':capture.')) family = 'capture';
    else if (entry.surfaceId.includes(':visual.')) family = 'visual';
    targets.push({
      surfaceId: entry.surfaceId,
      runtimeStateId: entry.runtimeStateId,
      setupId: entry.setupId,
      route: entry.route,
      smokeKind: setup.smokeKind,
      fixturePath: setup.fixturePath,
      readySelector: setup.readySelector,
      family,
    });
  }

  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    const hostRoute =
      placement.route === '*' || placement.route.includes(':') ? '/how-m55-works' : placement.route;
    // Seeded runtime states cannot claim a GREEN load without a fixture.
    const smokeKind =
      placement.runtimeState || placement.id === 'purchased_report'
        ? 'registration_only'
        : 'navigate';
    targets.push({
      surfaceId: `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`,
      runtimeStateId: `method:${placement.id}:${placement.runtimeState ?? 'default'}`,
      setupId: `m55.setup.method.${placement.id}`,
      route: hostRoute,
      smokeKind,
      fixturePath: null,
      readySelector: `[data-testid="${placement.testId}"]`,
      family: 'method',
    });
  }

  return targets;
}

export function methodPlacementSetups(): readonly ExecutableSetup[] {
  return M55_METHOD_ROUTE_CONSUMPTION.map((placement) =>
    buildSetup({
      entry: {
        surfaceId: `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`,
        runtimeStateId: `method:${placement.id}:${placement.runtimeState ?? 'default'}`,
        route: placement.route,
        setupId: `m55.setup.method.${placement.id}`,
        preconditions: [`method_placement:${placement.id}`],
        contentStressProfiles: ['short_text'],
        executionProfiles: ['default'],
        requiresAuthentication: false,
      },
      smokeKind: placement.runtimeState ? 'registration_only' : 'navigate',
      fixturePath: null,
      readySelector: `[data-testid="${placement.testId}"]`,
      authenticationMode: 'unauthenticated',
      hasDeterministicAuthFixture: false,
      content: ['short_text'],
      execution: ['default'],
    }),
  );
}

/** Full registry including method placement smoke setups. */
export function m55ExecutableSetupRegistry(): SetupRegistry {
  return {
    projectId: M55_QUALITY_PROJECT_ID,
    setups: [...M55_SETUP_REGISTRY.setups, ...methodPlacementSetups()],
  };
}
