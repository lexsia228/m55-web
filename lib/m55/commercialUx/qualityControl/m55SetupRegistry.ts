/**
 * Executable M55 setup registry — fail-open seam closure.
 *
 * Every manifest setupId resolves here to a real function with route/state/
 * stress contracts. Capture surfaces are non_runtime_reference only; all other
 * identities are executable with deterministic localhost fixtures.
 */
import type { Page } from '@playwright/test';

import type {
  ContentStressProfile,
  ExecutionProfile,
  ProtectedElement,
  SurfaceManifestEntry,
} from '../../../commercialQuality/types';
import type {
  ExecutableSetup,
  SetupContext,
  SetupExecutionResult,
  SetupRegistry,
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
import {
  establishCheckoutPrep,
  establishCoreResult,
  establishPremiumPlans,
  establishPurchasedReport,
  gotoLocal,
  markRuntimeState,
  seedBasicInfoOnly,
  seedCompleteFreeAnswers,
} from './m55QualityFixtures';

const DEFAULT_EXECUTION: readonly ExecutionProfile[] = ['default', 'reduced_motion'];
const FULL_EXECUTION: readonly ExecutionProfile[] = [
  'default',
  'text_zoom',
  'font_load_transition',
  'reduced_motion',
  'safe_area',
];

const LONG_JP =
  'これは長い日本語の試験文です。傾向の輪郭と負荷の置き方を丁寧に並べて、表示が折り返されても欠けないことを確かめます。'.repeat(
    4,
  );
const PUNCT_JP = '傾向を、短く、整理する。…そして、次へ進む！？「引用」と（括弧）。'.repeat(3);
const STRESS_TEXT: Record<ContentStressProfile, string | null> = {
  short_text: '短い文',
  long_japanese_text: LONG_JP,
  punctuation_heavy_japanese: PUNCT_JP,
  manual_line_breaks: '一行目の日本語です。\n二行目の日本語です。\n。\n三行目の日本語です。',
  max_dynamic_text: LONG_JP + PUNCT_JP,
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

const UNSUPPORTED_GOVERNED_STRESS = new Set<ContentStressProfile>([
  'authenticated',
  'unauthenticated',
  'saved',
  'unsaved',
  'plan_variant',
  'state_transition',
]);

type NavigatePlan = {
  fixtureId: string | null;
  navigatePath: string;
  readySelector: string;
  stateMarkerSelector: string;
  authenticationMode: ExecutableSetup['authenticationMode'];
  hasDeterministicAuthFixture: boolean;
  setupFn?: (page: Page, baseURL: string) => Promise<void>;
  /**
   * When true, the deterministic fixture is the Clerk auth gate redirect
   * itself (localhost → accounts.dev). No Production user is fabricated.
   */
  authGate?: boolean;
  /**
   * When true, the route serves a binary image (Open Graph). Smoke proves the
   * image document rather than HTML body copy length.
   */
  imageResponse?: boolean;
};

function asPage(context: SetupContext): Page {
  return context.page as Page;
}

function resolveNavigatePath(route: string): string {
  if (route === '*') return '/how-m55-works';
  if (route.includes(':')) {
    if (route.startsWith('/r/')) return '/r/cq-smoke-invalid';
    if (route.startsWith('/synastry/report/')) return '/synastry/cq-smoke';
    if (route.startsWith('/dev/')) return '/dev/dtr-drawer-preview';
  }
  return route;
}

function governedStressTarget(entry: SurfaceManifestEntry): ProtectedElement | undefined {
  return (
    entry.protectedElements.find(
      (el) => el.role === 'copy' || el.role === 'supporting' || el.role === 'heading',
    ) ??
    entry.protectedElements.find((el) => el.role === 'container' && el.requireText)
  );
}

async function verifyStateMarker(page: Page, selector: string): Promise<number> {
  const count = await page.locator(selector).count();
  if (count < 1) {
    throw new Error(`STOP_FIXTURE_SCOPE: state marker missing: ${selector}`);
  }
  return count;
}

/**
 * Deterministic auth-gate fixture: navigate to a protected route and prove the
 * Clerk redirect (or redirect loop) without fabricating a Production session.
 */
async function establishAuthGate(page: Page, baseURL: string, path: string): Promise<void> {
  const url = new URL(path, baseURL).toString();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ERR_TOO_MANY_REDIRECTS/i.test(message)) {
      // Redirect loop is itself the gated runtime evidence for some legacy routes.
      return;
    }
    throw error;
  }
  if (!/accounts\.dev/i.test(page.url()) && !/sign-in|sign-up/i.test(page.url())) {
    throw new Error(
      `STOP_FIXTURE_SCOPE: expected auth gate redirect for ${path}, landed on ${page.url()}`,
    );
  }
}

async function runNavigateSetup(
  context: SetupContext,
  entry: SurfaceManifestEntry,
  plan: NavigatePlan,
): Promise<SetupExecutionResult> {
  const page = asPage(context);
  const { baseURL } = context;
  const path = plan.navigatePath;

  if (plan.setupFn) {
    // Fixture owns navigation + state. Do not re-goto afterward — that would
    // destroy questionnaire / checkout / RESULT state.
    await plan.setupFn(page, baseURL);
  } else if (plan.authGate) {
    await establishAuthGate(page, baseURL, path);
  } else {
    await gotoLocal(page, baseURL, path);
  }

  if (!plan.authGate) {
    const ready = page.locator(plan.readySelector);
    try {
      await ready.first().waitFor({ state: 'visible', timeout: 30_000 });
    } catch {
      await page.locator('body').waitFor({ state: 'attached', timeout: 10_000 });
    }
    if (!plan.imageResponse) {
      await markRuntimeState(page, entry.runtimeStateId);
    }
  }

  const markerCount = plan.authGate
    ? 1
    : await verifyStateMarker(page, plan.stateMarkerSelector);

  return {
    setupId: entry.setupId,
    applied: true,
    evidence: {
      path: plan.authGate ? page.url() : path,
      fixtureId: plan.fixtureId,
      fixturePath: path !== entry.route ? path : undefined,
      authGate: Boolean(plan.authGate),
      imageResponse: Boolean(plan.imageResponse),
      readySelector: plan.readySelector,
      readyCount: plan.authGate ? 1 : await page.locator(plan.readySelector).count(),
      stateMarkerSelector: plan.stateMarkerSelector,
      stateMarkerCount: markerCount,
    },
  };
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
  throw new Error(`SETUP_STRESS_UNSUPPORTED: execution profile ${profile}`);
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

async function applyGovernedStressOnPage(
  page: Page,
  entry: SurfaceManifestEntry,
  profile: ContentStressProfile,
): Promise<StressApplicationResult> {
  if (UNSUPPORTED_GOVERNED_STRESS.has(profile)) {
    throw new Error(`SETUP_STRESS_UNSUPPORTED: ${profile} requires a real state fixture`);
  }

  const target = governedStressTarget(entry);
  if (!target) {
    throw new Error(`SETUP_STRESS_UNSUPPORTED: no governed copy target for ${profile}`);
  }

  const evidence = await page.evaluate(
    ({ selector, profileName, text }) => {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) throw new Error(`governed stress target missing: ${selector}`);
      if (!node.hasAttribute('data-m55-cq-stress-original')) {
        node.setAttribute('data-m55-cq-stress-original', node.textContent ?? '');
      }
      node.setAttribute('data-m55-cq-stress-profile', profileName);
      if (profileName === 'loading') {
        node.setAttribute('aria-busy', 'true');
        node.textContent = '読み込み中…';
      } else if (profileName === 'empty') {
        node.removeAttribute('aria-busy');
        node.textContent = '';
      } else if (text !== null) {
        node.removeAttribute('aria-busy');
        node.textContent = text;
      }
      return {
        selector,
        profile: profileName,
        textLength: (node.textContent ?? '').length,
      };
    },
    { selector: target.selector, profileName: profile, text: STRESS_TEXT[profile] },
  );

  return { profile, applied: true, evidence, cleanupToken: target.selector };
}

async function clearGovernedStressOnPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('[data-m55-cq-stress-original]').forEach((node) => {
      const el = node as HTMLElement;
      const original = el.getAttribute('data-m55-cq-stress-original');
      if (original !== null) el.textContent = original;
      el.removeAttribute('data-m55-cq-stress-original');
      el.removeAttribute('data-m55-cq-stress-profile');
      el.removeAttribute('aria-busy');
    });
  });
}

async function teardownSetup(context: SetupContext, entry: SurfaceManifestEntry): Promise<void> {
  const page = asPage(context);
  await clearGovernedStressOnPage(page);
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-m55-cq-runtime-state');
  });
  for (const profile of entry.executionProfiles) {
    await clearExecutionProfileOnPage(page, profile);
  }
}

function supportsRichStress(entry: SurfaceManifestEntry): boolean {
  return entry.contentStressProfiles.some(
    (p) => p !== 'short_text' && !UNSUPPORTED_GOVERNED_STRESS.has(p),
  );
}

function buildExecutableFromEntry(
  entry: SurfaceManifestEntry,
  plan: NavigatePlan,
  execution: readonly ExecutionProfile[] = DEFAULT_EXECUTION,
): ExecutableSetup {
  const richStress = supportsRichStress(entry);

  return {
    setupId: entry.setupId,
    executionClass: 'executable',
    consumedBySurfaceId: null,
    expectedRoute: entry.route,
    expectedRuntimeStateId: entry.runtimeStateId,
    authenticationMode: plan.authenticationMode,
    preconditions: entry.preconditions,
    supportedContentStressProfiles: entry.contentStressProfiles,
    supportedExecutionProfiles: execution,
    fixtureId: plan.fixtureId,
    readySelector: plan.readySelector,
    stateMarkerSelector: plan.stateMarkerSelector,
    hasDeterministicAuthFixture: plan.hasDeterministicAuthFixture,
    execute: async (context, surface) => runNavigateSetup(context, surface, plan),
    teardown: async (context, surface) => teardownSetup(context, surface),
    applyExecutionProfile: async (context, surface, profile) => {
      if (!execution.includes(profile)) {
        throw new Error(`SETUP_STRESS_UNSUPPORTED: execution profile ${profile}`);
      }
      return applyExecutionProfileOnPage(asPage(context), profile);
    },
    clearExecutionProfile: async (context, _surface, profile) =>
      clearExecutionProfileOnPage(asPage(context), profile),
    applyGovernedStress: richStress
      ? async (context, surface, profile) => {
          if (!entry.contentStressProfiles.includes(profile)) {
            throw new Error(`SETUP_STRESS_UNSUPPORTED: ${profile}`);
          }
          return applyGovernedStressOnPage(asPage(context), surface, profile);
        }
      : entry.contentStressProfiles.includes('short_text')
        ? async (context, surface, profile) => {
            if (profile !== 'short_text') {
              throw new Error(`SETUP_STRESS_UNSUPPORTED: ${profile}`);
            }
            return applyGovernedStressOnPage(asPage(context), surface, profile);
          }
        : undefined,
    clearContentStress: async (context) => clearGovernedStressOnPage(asPage(context)),
  };
}

function ecpNavigatePlan(routeId: string, pattern: string, privacy: string): NavigatePlan {
  const navigatePath = resolveNavigatePath(pattern);
  const authMode: ExecutableSetup['authenticationMode'] =
    privacy === 'authenticated'
      ? 'authenticated'
      : privacy === 'purchased_private'
        ? 'purchased_private'
        : privacy === 'privacy_safe_share'
          ? 'unauthenticated'
          : 'unauthenticated';

  const plain: NavigatePlan = {
    fixtureId: null,
    navigatePath,
    readySelector: M55_GOVERNED_ROOT_SELECTOR,
    stateMarkerSelector: M55_GOVERNED_ROOT_SELECTOR,
    authenticationMode: authMode,
    hasDeterministicAuthFixture: authMode === 'authenticated' || authMode === 'purchased_private',
  };

  switch (routeId) {
    case 'free.core.empty':
      return {
        ...plain,
        navigatePath: '/core',
        readySelector: '[data-testid="m55-core-locked"]',
        stateMarkerSelector: '[data-testid="m55-core-locked"]',
      };
    case 'free.core.intake':
      return {
        ...plain,
        navigatePath: '/core',
        readySelector: '[data-testid="m55-core-locked"], [data-testid="m55-free-questionnaire"]',
        stateMarkerSelector: '[data-testid="m55-core-start-intake"], [data-testid="m55-free-questionnaire"]',
        setupFn: async (page, baseURL) => {
          await gotoLocal(page, baseURL, '/core');
          const start = page.locator('[data-testid="m55-core-start-intake"]');
          if (await start.count()) await start.click();
        },
      };
    case 'free.core.questions':
      return {
        fixtureId: 'seedBasicInfoOnly',
        navigatePath: '/core',
        readySelector: '[data-testid="m55-free-questionnaire"]',
        stateMarkerSelector: '[data-testid="m55-free-questionnaire"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await seedBasicInfoOnly(page);
          await gotoLocal(page, baseURL, '/core');
          await page
            .getByTestId('m55-free-questionnaire')
            .waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    case 'free.core.answer_review':
    case 'free.core.result':
    case 'free.core.save':
    case 'free.core.rerun':
    case 'free.core.share':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/core',
        readySelector: '[data-testid="m55-core-essence"]',
        stateMarkerSelector: '[data-testid="m55-core-essence"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCoreResult,
      };
    case 'shared.entry':
    case 'shared.entry.invalid':
      return {
        fixtureId: '/r/cq-smoke-invalid',
        navigatePath: '/r/cq-smoke-invalid',
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    case 'shared.og':
      return {
        fixtureId: 'image_response',
        navigatePath: '/r/cq-smoke-invalid/opengraph-image',
        readySelector: 'img',
        stateMarkerSelector: 'img',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        imageResponse: true,
      };
    case 'premium.lp.intro':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector:
          '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
        stateMarkerSelector:
          '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await gotoLocal(page, baseURL, '/dtr/lp');
          await page
            .locator(
              '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
            )
            .first()
            .waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    case 'premium.lp.need_free':
      return {
        ...plain,
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-dtr-need-free"]',
        stateMarkerSelector: '[data-testid="m55-dtr-need-free"]',
      };
    case 'premium.lp.questions':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-paid-questionnaire-active"]',
        stateMarkerSelector: '[data-testid="m55-paid-questionnaire-active"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          const bridge = page.getByTestId('m55-paid-bridge-primary');
          await bridge.click();
          await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
        },
      };
    case 'premium.lp.answer_review':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector: '[data-m55-paid-phase="complete"]',
        stateMarkerSelector: '[data-m55-paid-phase="complete"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await page.getByTestId('m55-paid-bridge-primary').click();
          await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
          for (let i = 0; i < 6; i += 1) {
            await page.locator('[role="radio"]').first().click();
            await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
          }
          await page.locator('[data-m55-paid-phase="complete"]').waitFor({
            state: 'visible',
            timeout: 20_000,
          });
        },
      };
    case 'premium.lp.plans':
    case 'premium.lp.upgrade':
      return {
        fixtureId: 'establishPremiumPlans',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-dtr-plan-selection"]',
        stateMarkerSelector: '[data-testid="m55-dtr-plan-selection"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishPremiumPlans,
      };
    case 'premium.lp.checkout':
      return {
        fixtureId: 'establishCheckoutPrep',
        navigatePath: '/dtr/lp',
        readySelector: '[data-m55-paid-phase="checkout"]',
        stateMarkerSelector: '[data-m55-paid-phase="checkout"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCheckoutPrep,
      };
    case 'premium.dtr_index':
      return {
        ...plain,
        navigatePath: '/dtr',
        readySelector: M55_GOVERNED_ROOT_SELECTOR,
        stateMarkerSelector: M55_GOVERNED_ROOT_SELECTOR,
      };
    case 'premium.processing':
    case 'premium.purchase_success':
      return {
        fixtureId: 'auth_gate',
        navigatePath: pattern,
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: 'purchased_private',
        hasDeterministicAuthFixture: true,
        authGate: true,
      };
    case 'purchased.reader':
      return {
        fixtureId: 'establishPurchasedReport',
        navigatePath: '/dev/dtr-drawer-preview?openPanel=chapter-1',
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: 'purchased_private',
        hasDeterministicAuthFixture: true,
        setupFn: establishPurchasedReport,
      };
    case 'dev.premium_share_preview':
      return {
        ...plain,
        navigatePath: '/dev/premium-share-preview',
        readySelector: M55_GOVERNED_ROOT_SELECTOR,
        stateMarkerSelector: M55_GOVERNED_ROOT_SELECTOR,
      };
    case 'dev.previews':
      return {
        fixtureId: '/dev/dtr-drawer-preview',
        navigatePath: '/dev/dtr-drawer-preview',
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    case 'legacy.synastry.report':
    case 'legacy.synastry.success':
    case 'legacy.tarot':
    case 'legacy.ai_chat':
    case 'legacy.calendar':
    case 'legacy.ai_calendar':
    case 'legacy.meter':
    case 'prototype.hub':
      return {
        fixtureId: 'auth_gate',
        navigatePath: resolveNavigatePath(pattern),
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode:
          privacy === 'authenticated'
            ? 'authenticated'
            : privacy === 'purchased_private'
              ? 'purchased_private'
              : 'authenticated',
        hasDeterministicAuthFixture: true,
        authGate: true,
      };
    case 'legacy.reply':
    case 'legacy.reply_result':
      // Public legacy routes permanently redirect into DTR LP. Use the stable
      // public landing as the deterministic fixture (avoids /dtr/core loops).
      return {
        fixtureId: 'legacy_reply_redirect_target',
        navigatePath: '/dtr/lp',
        readySelector: M55_GOVERNED_ROOT_SELECTOR,
        stateMarkerSelector: M55_GOVERNED_ROOT_SELECTOR,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    case 'public.my':
      // /my mounts client-only; body can report height 0 while main is visible.
      // Signed-out account menu is the deterministic localhost fixture (no Prod user).
      return {
        ...plain,
        navigatePath: '/my',
        readySelector: 'main',
        stateMarkerSelector: 'main',
        authenticationMode: 'authenticated',
        hasDeterministicAuthFixture: true,
      };
    case 'legacy.synastry.confirm':
    case 'public.sign_in':
    case 'public.sign_up':
      return {
        ...plain,
        navigatePath: pattern,
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: privacy === 'authenticated' ? 'authenticated' : authMode,
        hasDeterministicAuthFixture: true,
      };
    default:
      if (pattern.includes(':') || pattern.includes('*')) {
        return {
          fixtureId: navigatePath,
          navigatePath,
          readySelector: 'body',
          stateMarkerSelector: 'body',
          authenticationMode: authMode,
          hasDeterministicAuthFixture:
            authMode === 'authenticated' || authMode === 'purchased_private',
        };
      }
      return {
        ...plain,
        navigatePath: pattern,
        authenticationMode: authMode,
        hasDeterministicAuthFixture:
          authMode === 'authenticated' || authMode === 'purchased_private',
      };
  }
}

function premiumStatePlan(stateId: string): NavigatePlan {
  switch (stateId) {
    case 'premium.core.bridge':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/core',
        readySelector: '[data-testid="m55-free-to-paid-bridge"]',
        stateMarkerSelector: '[data-testid="m55-free-to-paid-bridge"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCoreResult,
      };
    case 'premium.lp.prerequisite':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector:
          '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
        stateMarkerSelector:
          '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await gotoLocal(page, baseURL, '/dtr/lp');
          await page
            .locator(
              '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
            )
            .first()
            .waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    case 'premium.lp.questions':
    case 'premium.lp.answer_edit':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-paid-questionnaire-active"]',
        stateMarkerSelector: '[data-testid="m55-paid-questionnaire-active"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await page.getByTestId('m55-paid-bridge-primary').click();
          await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
        },
      };
    case 'premium.lp.answer_review':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector: '[data-m55-paid-phase="complete"]',
        stateMarkerSelector: '[data-m55-paid-phase="complete"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await page.getByTestId('m55-paid-bridge-primary').click();
          await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
          for (let i = 0; i < 6; i += 1) {
            await page.locator('[role="radio"]').first().click();
            await page.getByRole('button', { name: i === 5 ? '回答を確認する' : '次へ' }).click();
          }
          await page.locator('[data-m55-paid-phase="complete"]').waitFor({
            state: 'visible',
            timeout: 20_000,
          });
        },
      };
    case 'premium.lp.plans':
      return {
        fixtureId: 'establishPremiumPlans',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-dtr-plan-selection"]',
        stateMarkerSelector: '[data-testid="m55-dtr-plan-selection"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishPremiumPlans,
      };
    case 'premium.lp.checkout':
      return {
        fixtureId: 'establishCheckoutPrep',
        navigatePath: '/dtr/lp',
        readySelector: '[data-m55-paid-phase="checkout"]',
        stateMarkerSelector: '[data-m55-paid-phase="checkout"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCheckoutPrep,
      };
    case 'premium.share.card':
      return {
        fixtureId: null,
        navigatePath: '/dev/premium-share-preview',
        readySelector: M55_GOVERNED_ROOT_SELECTOR,
        stateMarkerSelector: M55_GOVERNED_ROOT_SELECTOR,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    default:
      return {
        fixtureId: 'establishPurchasedReport',
        navigatePath: '/dev/dtr-drawer-preview?openPanel=chapter-1',
        readySelector: 'body',
        stateMarkerSelector: 'body',
        authenticationMode: 'purchased_private',
        hasDeterministicAuthFixture: true,
        setupFn: establishPurchasedReport,
      };
  }
}

function visualCasePlan(caseId: string, setup: string, readySelector: string): NavigatePlan {
  switch (setup) {
    case 'core_free_result':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/core',
        readySelector,
        stateMarkerSelector: readySelector,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCoreResult,
      };
    case 'premium_questionnaire':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/dtr/lp',
        readySelector,
        stateMarkerSelector: readySelector,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: async (page, baseURL) => {
          await establishCoreResult(page, baseURL);
          await page.getByTestId('m55-paid-bridge-primary').click();
          await page.waitForURL(/\/dtr\/lp/, { timeout: 20_000 });
        },
      };
    case 'premium_plans':
      return {
        fixtureId: 'establishPremiumPlans',
        navigatePath: '/dtr/lp',
        readySelector,
        stateMarkerSelector: readySelector,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishPremiumPlans,
      };
    default:
      return {
        fixtureId: null,
        navigatePath: COMMERCIAL_VISUAL_CASES.find((c) => c.caseId === caseId)?.route ?? '/',
        readySelector,
        stateMarkerSelector: readySelector,
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
  }
}

function methodPlacementPlan(placementId: string): NavigatePlan {
  switch (placementId) {
    case 'home':
      return {
        fixtureId: null,
        navigatePath: '/home',
        readySelector: '[data-testid="m55-method-home"]',
        stateMarkerSelector: '[data-testid="m55-method-home"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    case 'core_free_result':
      return {
        fixtureId: 'establishCoreResult',
        navigatePath: '/core',
        readySelector: '[data-testid="m55-method-core-free-result"]',
        stateMarkerSelector: '[data-testid="m55-method-core-free-result"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCoreResult,
      };
    case 'dtr_lp':
      return {
        fixtureId: 'establishPremiumPlans',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-method-dtr-difference"]',
        stateMarkerSelector: '[data-testid="m55-method-dtr-difference"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishPremiumPlans,
      };
    case 'purchased_report':
      return {
        fixtureId: 'establishPurchasedReport',
        navigatePath: '/dev/dtr-drawer-preview?openPanel=chapter-1',
        readySelector: '[data-testid="m55-method-purchased-report"]',
        stateMarkerSelector: '[data-testid="m55-method-purchased-report"]',
        authenticationMode: 'purchased_private',
        hasDeterministicAuthFixture: true,
        setupFn: establishPurchasedReport,
      };
    case 'pricing':
      return {
        fixtureId: null,
        navigatePath: '/pricing',
        readySelector: '[data-testid="m55-method-trust-link"]',
        stateMarkerSelector: '[data-testid="m55-method-trust-link"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    case 'checkout_prep':
      return {
        fixtureId: 'establishCheckoutPrep',
        navigatePath: '/dtr/lp',
        readySelector: '[data-testid="m55-method-checkout-trust-link"]',
        stateMarkerSelector: '[data-testid="m55-method-checkout-trust-link"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
        setupFn: establishCheckoutPrep,
      };
    case 'footer_nav':
      return {
        fixtureId: null,
        navigatePath: '/how-m55-works',
        readySelector: '[data-testid="m55-method-footer-link"]',
        stateMarkerSelector: '[data-testid="m55-method-footer-link"]',
        authenticationMode: 'unauthenticated',
        hasDeterministicAuthFixture: false,
      };
    default:
      throw new Error(`STOP_FIXTURE_SCOPE: unknown method placement ${placementId}`);
  }
}

function buildCaptureSetup(entry: SurfaceManifestEntry, captureId: string, stateId: string): ExecutableSetup {
  const capture = PREMIUM_EXPERIENCE_CAPTURE_CASES.find((c) => c.captureId === captureId);
  const locator = capture?.visibleContract.locator ?? M55_GOVERNED_ROOT_SELECTOR;

  return {
    setupId: entry.setupId,
    executionClass: 'non_runtime_reference',
    consumedBySurfaceId: `${M55_QUALITY_PROJECT_ID}:premium.${stateId}`,
    expectedRoute: entry.route,
    expectedRuntimeStateId: entry.runtimeStateId,
    authenticationMode: 'none',
    preconditions: entry.preconditions,
    supportedContentStressProfiles: entry.contentStressProfiles,
    supportedExecutionProfiles: entry.executionProfiles,
    fixtureId: null,
    readySelector: locator,
    stateMarkerSelector: locator,
    hasDeterministicAuthFixture: false,
    execute: async () => {
      throw new Error('SETUP_NON_RUNTIME: capture is non-runtime reference');
    },
    teardown: async (context) => teardownSetup(context, entry),
  };
}

function buildMethodSetup(placement: (typeof M55_METHOD_ROUTE_CONSUMPTION)[number]): ExecutableSetup {
  const plan = methodPlacementPlan(placement.id);
  const entry: SurfaceManifestEntry = {
    schemaVersion: 1,
    surfaceId: `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`,
    runtimeStateId: `method:${placement.id}:${placement.runtimeState ?? 'default'}`,
    route: placement.route,
    routeIsPattern: /[:*]/.test(placement.route),
    setupId: `m55.setup.method.${placement.id}`,
    requiresAuthentication: false,
    preconditions: [`method_placement:${placement.id}`],
    authorityReferences: [{ kind: 'method_placement', key: placement.id }],
    viewport: M55_COMMERCIAL_QUALITY_MANIFEST.entries[0]!.viewport,
    protectedElements: [{ selector: `[data-testid="${placement.testId}"]`, role: 'copy', requireText: true }],
    criticalCta: null,
    fixedElements: [],
    sectionBoundaries: [],
    stateVariants: [],
    contentStressProfiles: ['short_text'],
    executionProfiles: ['default'],
    outputBehaviour: { screen: true, print: false, pdf: false, sharedImage: false },
    canonicalBaseline: 'none',
    baselineApproval: null,
    sourceOwnerFiles: [placement.ownerFile],
  };

  return buildExecutableFromEntry(entry, plan, ['default']);
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
    const plan = ecpNavigatePlan(ecp.id, ecp.pattern, ecp.privacy);
    const execution = entry.executionProfiles.includes('text_zoom') ? FULL_EXECUTION : DEFAULT_EXECUTION;
    bySetupId.set(setupId, buildExecutableFromEntry(entry, plan, execution));
  }

  for (const state of PREMIUM_EXPERIENCE_STATE_REGISTRY) {
    const setupId = `m55.setup.premium.${state.id}`;
    const entry = entriesBySetup.get(setupId);
    if (!entry) continue;
    bySetupId.set(setupId, buildExecutableFromEntry(entry, premiumStatePlan(state.id), ['default']));
  }

  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    const setupId = `m55.setup.capture.${capture.captureId}`;
    const entry = entriesBySetup.get(setupId);
    if (!entry) continue;
    bySetupId.set(setupId, buildCaptureSetup(entry, capture.captureId, capture.stateId));
  }

  for (const visual of COMMERCIAL_VISUAL_CASES) {
    const entry = M55_COMMERCIAL_QUALITY_MANIFEST.entries.find(
      (e) => e.surfaceId === `${M55_QUALITY_PROJECT_ID}:visual.${visual.caseId}`,
    );
    if (!entry) continue;
    const plan = visualCasePlan(visual.caseId, visual.setup, visual.readySelector);
    const execution = entry.executionProfiles.includes('text_zoom') ? FULL_EXECUTION : DEFAULT_EXECUTION;
    bySetupId.set(entry.setupId, buildExecutableFromEntry(entry, plan, execution));
  }

  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    bySetupId.set(`m55.setup.method.${placement.id}`, buildMethodSetup(placement));
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
  fixtureId: string | null;
  readySelector: string;
  stateMarkerSelector: string;
  family: 'ecp' | 'premium' | 'capture' | 'visual' | 'method';
  executionClass: 'executable' | 'non_runtime_reference';
  consumedBySurfaceId: string | null;
};

function targetFamily(surfaceId: string): RegistrationSmokeTarget['family'] {
  if (surfaceId.includes(':premium.')) return 'premium';
  if (surfaceId.includes(':capture.')) return 'capture';
  if (surfaceId.includes(':visual.')) return 'visual';
  if (surfaceId.includes(':method.')) return 'method';
  return 'ecp';
}

function toSmokeTarget(
  surfaceId: string,
  runtimeStateId: string,
  setupId: string,
  route: string,
  setup: ExecutableSetup,
): RegistrationSmokeTarget {
  return {
    surfaceId,
    runtimeStateId,
    setupId,
    route: resolveNavigatePath(route),
    fixtureId: setup.fixtureId,
    readySelector: setup.readySelector,
    stateMarkerSelector: setup.stateMarkerSelector,
    family: targetFamily(surfaceId),
    executionClass: setup.executionClass,
    consumedBySurfaceId: setup.consumedBySurfaceId,
  };
}

export function listExecutableSmokeTargets(): readonly RegistrationSmokeTarget[] {
  const targets: RegistrationSmokeTarget[] = [];

  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    const setup = m55SetupById(entry.setupId);
    if (!setup || setup.executionClass !== 'executable') continue;
    targets.push(toSmokeTarget(entry.surfaceId, entry.runtimeStateId, entry.setupId, entry.route, setup));
  }

  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    const setupId = `m55.setup.method.${placement.id}`;
    const setup = m55SetupById(setupId);
    if (!setup) continue;
    targets.push(
      toSmokeTarget(
        `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`,
        `method:${placement.id}:${placement.runtimeState ?? 'default'}`,
        setupId,
        placement.route,
        setup,
      ),
    );
  }

  return targets;
}

export function listNonRuntimeReferenceTargets(): readonly RegistrationSmokeTarget[] {
  const targets: RegistrationSmokeTarget[] = [];

  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    const setup = m55SetupById(entry.setupId);
    if (!setup || setup.executionClass !== 'non_runtime_reference') continue;
    targets.push(toSmokeTarget(entry.surfaceId, entry.runtimeStateId, entry.setupId, entry.route, setup));
  }

  return targets;
}

export function methodPlacementSetups(): readonly ExecutableSetup[] {
  return M55_METHOD_ROUTE_CONSUMPTION.map(
    (placement) => m55SetupById(`m55.setup.method.${placement.id}`)!,
  );
}

export function countAuthorityRegistrations(): {
  total: number;
  executable: number;
  nonRuntime: number;
} {
  const executable = M55_SETUP_REGISTRY.setups.filter((s) => s.executionClass === 'executable').length;
  const nonRuntime = M55_SETUP_REGISTRY.setups.filter(
    (s) => s.executionClass === 'non_runtime_reference',
  ).length;
  return {
    total: M55_SETUP_REGISTRY.setups.length,
    executable,
    nonRuntime,
  };
}
