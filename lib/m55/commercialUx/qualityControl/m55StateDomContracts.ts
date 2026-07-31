/**
 * State-specific DOM contracts for commercial-quality executable registrations.
 *
 * Runtime state evidence is derived from independently rendered application or
 * fixture DOM — never written by the runner/setup after navigation.
 */
import type { Page } from '@playwright/test';

import type { SurfaceManifestEntry } from '../../../commercialQuality/types';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import { M55_COMMERCIAL_QUALITY_MANIFEST, M55_QUALITY_PROJECT_ID } from './m55SurfaceManifest';

export const STATE_CONTRACT_ATTR = 'data-m55-cq-state-id' as const;

export type StateMarkerOwnership = 'application' | 'fixture';

export type StateDomContract = {
  surfaceId: string;
  runtimeStateId: string;
  setupId: string;
  route: string;
  /** Unique selector proving this exact runtime state. */
  selector: string;
  ownership: StateMarkerOwnership;
  /**
   * When set, the attribute value on the matched element must equal
   * expectedAttributeValue (fixture-rendered identity).
   */
  stateAttribute: string | null;
  expectedAttributeValue: string | null;
  /** When set, element text must include this exact phrase. */
  expectedText: string | null;
  fixtureId: string | null;
  teardown: 'none';
};

type ContractSeed = {
  selector: string;
  ownership: StateMarkerOwnership;
  stateAttribute?: string | null;
  expectedAttributeValue?: string | null;
  expectedText?: string | null;
  fixtureId?: string | null;
};

/**
 * Application-owned unique selectors / text, plus fixture-rendered auth-gate
 * and image-response identities. No post-navigation stamp paths.
 */
const CONTRACT_SEED_BY_SURFACE: Readonly<Record<string, ContractSeed>> = {
  // Public
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.home`]: {
    selector: '[data-testid="m55-home-hero"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.root_redirect`]: {
    selector: '[data-testid="m55-home-hero"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.how_m55_works`]: {
    selector: '[data-testid="m55-method-canonical"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.ten_views`]: {
    selector: '[data-m55-experience-surface="PUBLIC_EDITORIAL"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.pricing`]: {
    selector: '[data-testid="m55-pricing-headline"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.support`]: {
    selector: 'main h1',
    ownership: 'application',
    expectedText: 'サポート',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.legal.terms`]: {
    selector: 'main h1',
    ownership: 'application',
    expectedText: '利用規約',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.legal.privacy`]: {
    selector: 'main h1',
    ownership: 'application',
    expectedText: 'プライバシーポリシー',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.legal.tokushoho`]: {
    selector: 'main h1',
    ownership: 'application',
    expectedText: '特定商取引法に基づく表記',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.legal.refund`]: {
    selector: 'main h1',
    ownership: 'application',
    expectedText: '返金・キャンセル',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.my`]: {
    selector: '[data-m55-pathname="/my"] main h1',
    ownership: 'application',
    expectedText: 'マイページ',
  },

  // Free core
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.empty`]: {
    selector: '[data-testid="m55-core-locked"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.intake`]: {
    selector: '[data-testid="m55-core-start-intake"], [data-testid="m55-free-dob-step"], [data-testid="m55-free-segmented-dob"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.questions`]: {
    selector: '[data-testid="m55-free-questionnaire"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.answer_review`]: {
    selector: '[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.result`]: {
    selector: '[data-testid="m55-free-result-summary"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.save`]: {
    selector: '[data-testid="m55-guest-save-signin"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.rerun`]: {
    selector: '[data-testid="m55-free-rerun-request"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.share`]: {
    selector: '[data-testid="m55-free-result-share"]',
    ownership: 'application',
  },

  // Shared / premium LP
  [`${M55_QUALITY_PROJECT_ID}:ecp.shared.entry`]: {
    selector: '[data-testid="m55-shared-entry"], [data-testid="m55-shared-entry-fallback"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.shared.entry.invalid`]: {
    selector: '[data-testid="m55-shared-entry"], [data-testid="m55-shared-entry-fallback"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.shared.og`]: {
    selector: 'img',
    ownership: 'fixture',
    fixtureId: 'image_response',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.dtr_index`]: {
    selector: '#dtr-main-shelf-label',
    ownership: 'application',
    expectedText: 'メインの保存版',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.intro`]: {
    selector:
      '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.need_free`]: {
    selector: '[data-testid="m55-dtr-need-free"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.questions`]: {
    selector: '[data-testid="m55-paid-questionnaire-active"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.answer_review`]: {
    selector: '[data-m55-paid-phase="complete"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.plans`]: {
    selector: '[data-testid="m55-dtr-plan-selection"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.upgrade`]: {
    selector: '[data-testid="m55-dtr-plan-selection"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.checkout`]: {
    selector: '[data-m55-paid-phase="checkout"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.purchased.reader`]: {
    selector: '[data-testid="m55-purchased-report-body"], [data-m55-premium-state="purchased.report.body"]',
    ownership: 'application',
  },

  // Legacy / public adjacent
  [`${M55_QUALITY_PROJECT_ID}:ecp.legacy.today`]: {
    // Shell pathname is application-rendered; panel text varies by profile readiness.
    selector: '[data-m55-pathname="/today"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.legacy.weekly`]: {
    selector: '[data-m55-pathname="/weekly"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.legacy.reply`]: {
    // Legacy /reply permanently lands on DTR LP; anonymous default is need_free.
    selector: '[data-testid="m55-dtr-need-free"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.legacy.reply_result`]: {
    // Distinct LP landing via expired-state query (still localhost public HTML).
    selector: 'p',
    ownership: 'application',
    expectedText: 'このレポートへのアクセス有効期限が切れています。',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.legacy.synastry`]: {
    selector: '[data-testid="compatibility-dob-step"], [data-testid="compatibility-personalized-result"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.dev.premium_share_preview`]: {
    selector: '[data-m55-dev-preview="premium-share"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:ecp.dev.previews`]: {
    selector: '[data-m55-dev-preview="dtr-drawer"]',
    ownership: 'application',
  },

  // Premium states
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.core.bridge`]: {
    selector: '[data-testid="m55-free-to-paid-bridge"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.prerequisite`]: {
    selector:
      '[data-testid="m55-dtr-lp-continuity"], [data-testid="m55-paid-questionnaire-active"], [data-testid="m55-dtr-need-free"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.questions`]: {
    selector: '[data-testid="m55-paid-questionnaire-active"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.answer_edit`]: {
    selector: '[data-testid="m55-paid-questionnaire-active"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.answer_review`]: {
    selector: '[data-m55-paid-phase="complete"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.plans`]: {
    selector: '[data-testid="m55-dtr-plan-selection"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.checkout`]: {
    selector: '[data-m55-paid-phase="checkout"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.purchased.report.body`]: {
    selector: '[data-m55-premium-state="purchased.report.body"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.purchased.consult.input`]: {
    selector: '[data-m55-premium-state="purchased.consult.input"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.purchased.consult.result`]: {
    selector: '[data-m55-premium-state="purchased.consult.result"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.purchased.saved_reopen`]: {
    selector: '[data-m55-premium-state="purchased.saved_reopen"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.share.card`]: {
    selector: '[data-m55-premium-state="premium.share.card"]',
    ownership: 'application',
  },

  // Visual
  [`${M55_QUALITY_PROJECT_ID}:visual.home`]: {
    selector: '[data-testid="m55-home-hero"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:visual.core-prerequisite`]: {
    selector: '[data-testid="m55-core-locked"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:visual.core-free-result`]: {
    selector: '[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:visual.premium-questionnaire`]: {
    selector: '[data-testid="m55-paid-questionnaire-active"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:visual.premium-plans`]: {
    selector: '[data-testid="m55-dtr-plan-selection"]',
    ownership: 'application',
  },
  [`${M55_QUALITY_PROJECT_ID}:visual.pricing`]: {
    selector: '[data-testid="m55-pricing-plan-light"]',
    ownership: 'application',
  },
};

function authGateSeed(runtimeStateId: string): ContractSeed {
  // Fixture HTML renders state id onto the auth-gate main. Observation reads
  // that attribute — the runner never injects it after navigation.
  return {
    selector: '[data-testid="m55-cq-auth-gate-fixture"]',
    ownership: 'fixture',
    stateAttribute: STATE_CONTRACT_ATTR,
    expectedAttributeValue: runtimeStateId,
    fixtureId: 'auth_gate',
  };
}

function isGenericMarker(selector: string): boolean {
  const trimmed = selector.trim();
  return (
    trimmed === 'main' ||
    trimmed === 'body' ||
    trimmed === 'html' ||
    trimmed === '[data-testid="m55-cq-auth-gate-fixture"]' ||
    trimmed === '[data-m55-cq-fixture="auth_gate"]'
  );
}

function buildContract(
  surfaceId: string,
  runtimeStateId: string,
  setupId: string,
  route: string,
): StateDomContract {
  const seed = CONTRACT_SEED_BY_SURFACE[surfaceId];
  if (seed) {
    // main+expectedText is state-specific via text, not a bare main marker.
    if (isGenericMarker(seed.selector) && !seed.expectedText && seed.ownership === 'application') {
      throw new Error(`STOP_FIXTURE_SCOPE: generic application marker for ${surfaceId}`);
    }
    return {
      surfaceId,
      runtimeStateId,
      setupId,
      route,
      selector: seed.selector,
      ownership: seed.ownership,
      stateAttribute: seed.stateAttribute ?? null,
      expectedAttributeValue: seed.expectedAttributeValue ?? null,
      expectedText: seed.expectedText ?? null,
      fixtureId: seed.fixtureId ?? null,
      teardown: 'none',
    };
  }

  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    if (surfaceId === `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`) {
      return {
        surfaceId,
        runtimeStateId,
        setupId,
        route,
        selector: `[data-testid="${placement.testId}"]`,
        ownership: 'application',
        stateAttribute: null,
        expectedAttributeValue: null,
        expectedText: null,
        fixtureId: null,
        teardown: 'none',
      };
    }
  }

  // Auth-gated / pattern routes: fixture HTML embeds state id at fulfill time.
  const authSeed = authGateSeed(runtimeStateId);
  return {
    surfaceId,
    runtimeStateId,
    setupId,
    route,
    selector: authSeed.selector,
    ownership: 'fixture',
    stateAttribute: authSeed.stateAttribute ?? STATE_CONTRACT_ATTR,
    expectedAttributeValue: runtimeStateId,
    expectedText: null,
    fixtureId: 'auth_gate',
    teardown: 'none',
  };
}

function buildAllContracts(): readonly StateDomContract[] {
  const contracts: StateDomContract[] = [];
  const seen = new Set<string>();

  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    if (seen.has(entry.surfaceId)) continue;
    seen.add(entry.surfaceId);
    contracts.push(
      buildContract(entry.surfaceId, entry.runtimeStateId, entry.setupId, entry.route),
    );
  }

  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    const surfaceId = `${M55_QUALITY_PROJECT_ID}:method.${placement.id}`;
    if (seen.has(surfaceId)) continue;
    seen.add(surfaceId);
    const runtimeStateId = `method:${placement.id}:${placement.runtimeState ?? 'default'}`;
    contracts.push(
      buildContract(
        surfaceId,
        runtimeStateId,
        `m55.setup.method.${placement.id}`,
        placement.route,
      ),
    );
  }

  return contracts;
}

export const M55_STATE_DOM_CONTRACTS: readonly StateDomContract[] = buildAllContracts();

const CONTRACT_BY_SURFACE = new Map(
  M55_STATE_DOM_CONTRACTS.map((contract) => [contract.surfaceId, contract] as const),
);

export function stateDomContractForSurface(surfaceId: string): StateDomContract | undefined {
  return CONTRACT_BY_SURFACE.get(surfaceId);
}

export function stateDomContractForEntry(entry: SurfaceManifestEntry): StateDomContract {
  const existing = CONTRACT_BY_SURFACE.get(entry.surfaceId);
  if (existing) return existing;
  return buildContract(entry.surfaceId, entry.runtimeStateId, entry.setupId, entry.route);
}

export function assertContractNotGeneric(contract: StateDomContract): void {
  if (isGenericMarker(contract.selector) && !contract.expectedText && !contract.stateAttribute) {
    throw new Error(
      `STOP_FIXTURE_SCOPE: generic state marker forbidden for ${contract.surfaceId}: ${contract.selector}`,
    );
  }
}

export function countGenericStateMarkers(): number {
  return M55_STATE_DOM_CONTRACTS.filter(
    (c) => isGenericMarker(c.selector) && !c.expectedText && !c.stateAttribute,
  ).length;
}

export function countContractsByOwnership(): {
  application: number;
  fixture: number;
} {
  let application = 0;
  let fixture = 0;
  for (const contract of M55_STATE_DOM_CONTRACTS) {
    if (contract.ownership === 'application') application += 1;
    else fixture += 1;
  }
  return { application, fixture };
}

/**
 * Derive runtimeStateId from independently rendered DOM (never from a
 * runner-written marker or a caller-supplied certified value).
 */
export async function observeRuntimeStateId(
  page: Page,
  contract: StateDomContract,
): Promise<string | null> {
  assertContractNotGeneric(contract);

  // Image fixture: URL + img presence (fixture response, not a post-nav stamp).
  if (contract.fixtureId === 'image_response') {
    const url = page.url();
    if (!/opengraph-image/i.test(url)) return null;
    const imgCount = await page.locator('img').count();
    return imgCount > 0 ? contract.runtimeStateId : null;
  }

  if (contract.expectedText) {
    // Match the selector node that actually carries the expected text
    // (not merely the first DOM match of a broad selector).
    const match = page
      .locator(contract.selector)
      .filter({ hasText: contract.expectedText })
      .first();
    const visible = await match.isVisible().catch(() => false);
    return visible ? contract.runtimeStateId : null;
  }

  const loc = page.locator(contract.selector).first();
  const count = await loc.count();
  if (count < 1) return null;

  if (contract.stateAttribute) {
    const value = await loc.getAttribute(contract.stateAttribute);
    if (!value) return null;
    if (
      contract.expectedAttributeValue &&
      value !== contract.expectedAttributeValue
    ) {
      return value;
    }
    return value;
  }

  const visible = await loc.isVisible().catch(() => false);
  return visible ? contract.runtimeStateId : null;
}

/**
 * Observe only. Never writes markers. Rejects missing/wrong/ambiguous state.
 */
export async function observeAndAssertStateContract(
  page: Page,
  contract: StateDomContract,
): Promise<string> {
  assertContractNotGeneric(contract);

  // Ambiguous: two distinct fixture state-id markers on one page.
  if (contract.ownership === 'fixture' && contract.stateAttribute === STATE_CONTRACT_ATTR) {
    const markers = page.locator(`[${STATE_CONTRACT_ATTR}]`);
    const markerCount = await markers.count();
    if (markerCount > 1) {
      const values = new Set<string>();
      for (let i = 0; i < markerCount; i += 1) {
        const value = await markers.nth(i).getAttribute(STATE_CONTRACT_ATTR);
        if (value) values.add(value);
      }
      if (values.size > 1) {
        throw new Error(
          `LAYOUT_STATE_DRIFT: ambiguous state contracts rendered (${[...values].join(',')})`,
        );
      }
    }
  }

  const observed = await observeRuntimeStateId(page, contract);
  if (!observed) {
    throw new Error(
      `LAYOUT_STATE_DRIFT: missing state-specific marker ${contract.selector} for ${contract.surfaceId}`,
    );
  }
  if (observed !== contract.runtimeStateId) {
    throw new Error(
      `LAYOUT_STATE_DRIFT: observed ${observed} expected ${contract.runtimeStateId}`,
    );
  }
  return observed;
}

/** @deprecated Removed — runner must never stamp state markers. */
export async function stampFixtureStateContract(): Promise<never> {
  throw new Error('STOP_FIXTURE_SCOPE: runner/setup must not write state markers');
}

export async function clearFixtureStateContract(page: Page): Promise<void> {
  // No runner-owned markers remain; keep as a no-op cleanup hook for tests.
  await page.evaluate((attr) => {
    document.querySelectorAll(`[data-m55-cq-state-contract]`).forEach((node) => node.remove());
    void attr;
  }, STATE_CONTRACT_ATTR);
}
