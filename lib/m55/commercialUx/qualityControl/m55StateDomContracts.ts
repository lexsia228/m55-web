/**
 * State-specific DOM contracts for commercial-quality executable registrations.
 *
 * Runtime state evidence is derived from an observed application- or
 * fixture-owned marker — never copied from the manifest by the runner.
 */
import type { Page } from '@playwright/test';

import type { SurfaceManifestEntry } from '../../../commercialQuality/types';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import { M55_COMMERCIAL_QUALITY_MANIFEST, M55_QUALITY_PROJECT_ID } from './m55SurfaceManifest';

export const STATE_CONTRACT_ATTR = 'data-m55-cq-state-id' as const;
export const STATE_CONTRACT_MARKER = '[data-m55-cq-state-contract="1"]' as const;

export type StateMarkerOwnership = 'application' | 'fixture';

export type StateDomContract = {
  surfaceId: string;
  runtimeStateId: string;
  setupId: string;
  route: string;
  /** Unique selector proving this exact runtime state. */
  selector: string;
  ownership: StateMarkerOwnership;
  /** When set, attribute value on the marker must equal runtimeStateId. */
  stateAttribute: typeof STATE_CONTRACT_ATTR | null;
  expectedValue: string;
  teardown: 'none' | 'remove_fixture_marker';
};

/** Application-owned unique selectors (no public UI mutation). */
const APPLICATION_SELECTOR_BY_SURFACE: Readonly<Record<string, string>> = {
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.home`]: '[data-testid="m55-home-hero"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.how_m55_works`]: '[data-testid="m55-method-canonical"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.pricing`]: '[data-testid="m55-pricing-headline"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.public.ten_views`]: '[data-m55-experience-surface="PUBLIC_EDITORIAL"]',
  // Distinct empty/locked vs questionnaire phases (not co-present).
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.empty`]: '[data-testid="m55-core-locked"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.free.core.questions`]: '[data-testid="m55-free-questionnaire"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.need_free`]: '[data-testid="m55-dtr-need-free"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.answer_review`]: '[data-m55-paid-phase="complete"]',
  [`${M55_QUALITY_PROJECT_ID}:ecp.premium.lp.checkout`]: '[data-m55-paid-phase="checkout"]',
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.core.bridge`]: '[data-testid="m55-free-to-paid-bridge"]',
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.answer_review`]: '[data-m55-paid-phase="complete"]',
  [`${M55_QUALITY_PROJECT_ID}:premium.premium.lp.checkout`]: '[data-m55-paid-phase="checkout"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.home`]: '[data-testid="m55-home-hero"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.core-prerequisite`]: '[data-testid="m55-core-locked"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.core-free-result`]:
    '[data-testid="m55-core-essence"][data-m55-ux-phase="RESULT"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.premium-questionnaire`]:
    '[data-testid="m55-paid-questionnaire-active"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.premium-plans`]: '[data-testid="m55-dtr-plan-selection"]',
  [`${M55_QUALITY_PROJECT_ID}:visual.pricing`]: '[data-testid="m55-pricing-plan-light"]',
};

function fixtureStateSelector(runtimeStateId: string): string {
  return `[${STATE_CONTRACT_ATTR}="${runtimeStateId}"]`;
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
  const applicationSelector = APPLICATION_SELECTOR_BY_SURFACE[surfaceId];
  if (applicationSelector) {
    return {
      surfaceId,
      runtimeStateId,
      setupId,
      route,
      selector: applicationSelector,
      ownership: 'application',
      stateAttribute: null,
      expectedValue: runtimeStateId,
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
        expectedValue: runtimeStateId,
        teardown: 'none',
      };
    }
  }

  // Fixture-owned unique marker (auth-gate HTML or post-nav stamp).
  return {
    surfaceId,
    runtimeStateId,
    setupId,
    route,
    selector: fixtureStateSelector(runtimeStateId),
    ownership: 'fixture',
    stateAttribute: STATE_CONTRACT_ATTR,
    expectedValue: runtimeStateId,
    teardown: 'remove_fixture_marker',
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
  if (isGenericMarker(contract.selector)) {
    throw new Error(
      `STOP_FIXTURE_SCOPE: generic state marker forbidden for ${contract.surfaceId}: ${contract.selector}`,
    );
  }
}

export function countGenericStateMarkers(): number {
  return M55_STATE_DOM_CONTRACTS.filter((c) => isGenericMarker(c.selector)).length;
}

/**
 * Fixture-owned stamp used when the page lacks a unique application marker.
 * Never writes html[data-m55-cq-runtime-state] (banned runner self-cert marker).
 */
export async function stampFixtureStateContract(
  page: Page,
  runtimeStateId: string,
): Promise<void> {
  await page.evaluate(
    ({ attr, marker, id }) => {
      let el = document.querySelector(marker) as HTMLElement | null;
      if (!el) {
        el = document.createElement('div');
        el.setAttribute('data-m55-cq-state-contract', '1');
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText =
          'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);';
        document.body.appendChild(el);
      }
      el.setAttribute(attr, id);
      el.textContent = id;
    },
    { attr: STATE_CONTRACT_ATTR, marker: STATE_CONTRACT_MARKER, id: runtimeStateId },
  );
}

export async function clearFixtureStateContract(page: Page): Promise<void> {
  await page.evaluate((marker) => {
    document.querySelectorAll(marker).forEach((node) => node.remove());
  }, STATE_CONTRACT_MARKER);
}

/**
 * Derive runtimeStateId from the observed DOM contract (not from the manifest).
 */
export async function observeRuntimeStateId(
  page: Page,
  contract: StateDomContract,
): Promise<string | null> {
  const loc = page.locator(contract.selector).first();
  const count = await loc.count();
  if (count < 1) return null;

  if (contract.stateAttribute) {
    const value = await loc.getAttribute(contract.stateAttribute);
    return value && value.length > 0 ? value : null;
  }

  // Application-owned unique selector presence maps to the registered state.
  const visible = await loc.isVisible().catch(() => false);
  return visible ? contract.expectedValue : null;
}

export async function bindAndObserveStateContract(
  page: Page,
  contract: StateDomContract,
  options: { authGateAlreadyBound?: boolean; imageResponse?: boolean } = {},
): Promise<string> {
  assertContractNotGeneric(contract);

  if (contract.ownership === 'fixture' && !options.authGateAlreadyBound && !options.imageResponse) {
    await stampFixtureStateContract(page, contract.runtimeStateId);
  }

  if (options.imageResponse && contract.ownership === 'fixture') {
    // Image documents cannot host a DOM stamp; bind via response URL path token.
    const url = page.url();
    if (!url.includes('opengraph-image') && !url.includes('/r/')) {
      throw new Error(`STOP_FIXTURE_SCOPE: image response missing shared-route contract (${url})`);
    }
    await page.evaluate(
      ({ attr, id }) => {
        const img = document.querySelector('img');
        if (img) img.setAttribute(attr, id);
      },
      { attr: STATE_CONTRACT_ATTR, id: contract.runtimeStateId },
    );
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
