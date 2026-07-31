/**
 * State-specific DOM contracts for commercial-quality executable registrations.
 *
 * Every runtimeStateId has a unique observable signature. Evidence is derived
 * by reading independently rendered application or fixed-fixture DOM — never
 * by returning a manifest value merely because a selector is visible.
 */
import type { Page } from '@playwright/test';

import type { SurfaceManifestEntry } from '../../../commercialQuality/types';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import {
  IMAGE_RESPONSE_FIXTURE,
  authGateFixtureByRuntimeStateId,
  AUTH_GATE_STATE_ATTR,
} from './m55AuthGateFixtureRegistry';
import { M55_COMMERCIAL_QUALITY_MANIFEST, M55_QUALITY_PROJECT_ID } from './m55SurfaceManifest';
import {
  countObservableSignatureCollisions,
  countUniqueObservableSignatures,
  reconcileExecutableStateContracts,
} from './m55StateIdentityReconciliation';

export const STATE_CONTRACT_ATTR = AUTH_GATE_STATE_ATTR;

export type StateMarkerOwnership = 'application' | 'fixture';

export type StateDomContract = {
  surfaceId: string;
  runtimeStateId: string;
  setupId: string;
  route: string;
  selector: string;
  ownership: StateMarkerOwnership;
  stateAttribute: string | null;
  expectedAttributeValue: string | null;
  expectedText: string | null;
  fixtureId: string | null;
  teardown: 'none';
};

function stateIdSelector(runtimeStateId: string): string {
  return `[${STATE_CONTRACT_ATTR}="${runtimeStateId.replace(/"/g, '')}"]`;
}

function buildContract(
  surfaceId: string,
  runtimeStateId: string,
  setupId: string,
  route: string,
): StateDomContract {
  const auth = authGateFixtureByRuntimeStateId(runtimeStateId);
  if (auth) {
    return {
      surfaceId,
      runtimeStateId,
      setupId,
      route,
      selector: stateIdSelector(runtimeStateId),
      ownership: 'fixture',
      stateAttribute: STATE_CONTRACT_ATTR,
      expectedAttributeValue: auth.expectedAttributeValue,
      expectedText: null,
      fixtureId: auth.fixtureId,
      teardown: 'none',
    };
  }

  if (runtimeStateId === IMAGE_RESPONSE_FIXTURE.runtimeStateId) {
    return {
      surfaceId,
      runtimeStateId,
      setupId,
      route,
      selector: stateIdSelector(runtimeStateId),
      ownership: 'fixture',
      stateAttribute: STATE_CONTRACT_ATTR,
      expectedAttributeValue: IMAGE_RESPONSE_FIXTURE.expectedAttributeValue,
      expectedText: null,
      fixtureId: IMAGE_RESPONSE_FIXTURE.fixtureId,
      teardown: 'none',
    };
  }

  return {
    surfaceId,
    runtimeStateId,
    setupId,
    route,
    selector: stateIdSelector(runtimeStateId),
    ownership: 'application',
    stateAttribute: STATE_CONTRACT_ATTR,
    expectedAttributeValue: runtimeStateId,
    expectedText: null,
    fixtureId: null,
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
  if (!contract.stateAttribute || !contract.expectedAttributeValue) {
    throw new Error(
      `STOP_FIXTURE_SCOPE: non-unique/generic state contract for ${contract.surfaceId}`,
    );
  }
}

export function countGenericStateMarkers(): number {
  return M55_STATE_DOM_CONTRACTS.filter(
    (c) => !c.stateAttribute || !c.expectedAttributeValue,
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

export function executableStateContracts(
  surfaceIds: readonly string[],
): StateDomContract[] {
  return surfaceIds
    .map((id) => CONTRACT_BY_SURFACE.get(id))
    .filter((c): c is StateDomContract => Boolean(c));
}

/**
 * Derive runtimeStateId by reading the rendered state attribute.
 * Never returns a manifest value merely because a selector is visible.
 */
export async function observeRuntimeStateId(
  page: Page,
  contract: StateDomContract,
): Promise<string | null> {
  assertContractNotGeneric(contract);

  if (!contract.stateAttribute || !contract.expectedAttributeValue) {
    return null;
  }

  // Read from the live DOM (including nonvisual application markers). Do not
  // rely on Playwright visibility filtering for hidden identity nodes.
  const value = await page.evaluate(
    ({ attr, expected }) => {
      const node = document.querySelector(`[${attr}="${expected.replace(/"/g, '\\"')}"]`);
      return node?.getAttribute(attr) ?? null;
    },
    { attr: contract.stateAttribute, expected: contract.expectedAttributeValue },
  );
  return value;
}

/**
 * Observe only. Never writes markers. Rejects missing/wrong/ambiguous state.
 */
export async function observeAndAssertStateContract(
  page: Page,
  contract: StateDomContract,
): Promise<string> {
  assertContractNotGeneric(contract);

  // Ambiguous: two distinct state-id values on one page for fixture auth-gates,
  // or any page rendering incompatible duplicate primary markers when the
  // contract expects a single fixture identity.
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
          `STATE_CONTRACT_AMBIGUOUS: ambiguous state contracts rendered (${[...values].join(',')})`,
        );
      }
    }
  }

  const observed = await observeRuntimeStateId(page, contract);
  if (!observed) {
    throw new Error(
      `STATE_CONTRACT_MISSING: missing state-specific marker ${contract.selector} for ${contract.surfaceId}`,
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
  await page.evaluate(() => {
    document.querySelectorAll('[data-m55-cq-state-contract]').forEach((node) => node.remove());
  });
}

export function reconcileAllStateContracts(): ReturnType<
  typeof reconcileExecutableStateContracts
> {
  return reconcileExecutableStateContracts(M55_STATE_DOM_CONTRACTS);
}

export {
  countObservableSignatureCollisions,
  countUniqueObservableSignatures,
  reconcileExecutableStateContracts,
};
