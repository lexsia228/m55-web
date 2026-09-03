/**
 * State DOM contracts for commercial-quality executable registrations.
 *
 * Observation reads the single rendered canonical presentation identity.
 * Registration aliases resolve through m55ObservableStateAliasMap — the
 * runner never queries the DOM for the registration runtimeStateId.
 */
import type { Page } from '@playwright/test';

import type { SurfaceManifestEntry } from '../../../commercialQuality/types';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import {
  authGateFixtureByRuntimeStateId,
  imageResponseFixtureByRuntimeStateId,
  AUTH_GATE_STATE_ATTR,
} from './m55AuthGateFixtureRegistry';
import { canonicalObservableStateIdFor } from './m55ObservableStateAliasMap';
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
  canonicalObservableStateId: string;
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

function stateIdSelector(canonicalObservableStateId: string): string {
  return `[${STATE_CONTRACT_ATTR}="${canonicalObservableStateId.replace(/"/g, '')}"]`;
}

function buildContract(
  surfaceId: string,
  runtimeStateId: string,
  setupId: string,
  route: string,
): StateDomContract {
  const canonicalObservableStateId = canonicalObservableStateIdFor(runtimeStateId);
  const auth = authGateFixtureByRuntimeStateId(runtimeStateId);
  if (auth) {
    return {
      surfaceId,
      runtimeStateId,
      canonicalObservableStateId: auth.expectedAttributeValue,
      setupId,
      route,
      selector: stateIdSelector(auth.expectedAttributeValue),
      ownership: 'fixture',
      stateAttribute: STATE_CONTRACT_ATTR,
      expectedAttributeValue: auth.expectedAttributeValue,
      expectedText: null,
      fixtureId: auth.fixtureId,
      teardown: 'none',
    };
  }

  const image = imageResponseFixtureByRuntimeStateId(runtimeStateId);
  if (image) {
    return {
      surfaceId,
      runtimeStateId,
      canonicalObservableStateId: image.expectedAttributeValue,
      setupId,
      route,
      selector: stateIdSelector(image.expectedAttributeValue),
      ownership: 'fixture',
      stateAttribute: STATE_CONTRACT_ATTR,
      expectedAttributeValue: image.expectedAttributeValue,
      expectedText: null,
      fixtureId: image.fixtureId,
      teardown: 'none',
    };
  }

  return {
    surfaceId,
    runtimeStateId,
    canonicalObservableStateId,
    setupId,
    route,
    selector: stateIdSelector(canonicalObservableStateId),
    ownership: 'application',
    stateAttribute: STATE_CONTRACT_ATTR,
    expectedAttributeValue: canonicalObservableStateId,
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
 * Observe the single rendered canonical identity without using the registration
 * runtimeStateId as a DOM query. Rejects zero or multiple distinct identities.
 */
export async function observeCanonicalObservableStateId(page: Page): Promise<string> {
  const result = await page.evaluate((attr) => {
    const nodes = Array.from(document.querySelectorAll(`[${attr}]`));
    const values = nodes
      .map((node) => node.getAttribute(attr))
      .filter((value): value is string => Boolean(value && value.trim()));
    const unique = [...new Set(values)];
    return { count: unique.length, values: unique };
  }, STATE_CONTRACT_ATTR);

  if (result.count === 0) {
    throw new Error('STATE_CONTRACT_MISSING: no canonical observable state identity in DOM');
  }
  if (result.count > 1) {
    throw new Error(
      `STATE_CONTRACT_AMBIGUOUS: multiple canonical identities rendered (${result.values.join(',')})`,
    );
  }
  return result.values[0]!;
}

/**
 * @deprecated Prefer observeCanonicalObservableStateId — kept for call sites
 * that still pass a contract; does not query the registration id.
 */
export async function observeRuntimeStateId(
  page: Page,
  contract: StateDomContract,
): Promise<string | null> {
  assertContractNotGeneric(contract);
  try {
    const observed = await observeCanonicalObservableStateId(page);
    return observed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('STATE_CONTRACT_MISSING')) {
      return null;
    }
    throw error;
  }
}

/**
 * Observe the canonical identity and compare to the registration's expected
 * canonical mapping. Never treats registration id visibility as proof.
 */
export async function observeAndAssertStateContract(
  page: Page,
  contract: StateDomContract,
): Promise<string> {
  assertContractNotGeneric(contract);
  const expectedCanonical = canonicalObservableStateIdFor(contract.runtimeStateId);
  const observed = await observeCanonicalObservableStateId(page);
  if (observed !== expectedCanonical) {
    throw new Error(
      `LAYOUT_STATE_DRIFT: observed canonical ${observed} expected ${expectedCanonical} (registration ${contract.runtimeStateId})`,
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

export function countCanonicalContractsByOwnership(
  contracts: readonly StateDomContract[],
): { application: number; fixture: number } {
  const byCanonical = new Map<string, StateDomContract>();
  for (const contract of contracts) {
    const canonical = canonicalObservableStateIdFor(contract.runtimeStateId);
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, contract);
  }
  let application = 0;
  let fixture = 0;
  for (const contract of byCanonical.values()) {
    if (contract.ownership === 'application') application += 1;
    else fixture += 1;
  }
  return { application, fixture };
}

export {
  countObservableSignatureCollisions,
  countUniqueObservableSignatures,
  reconcileExecutableStateContracts,
};
