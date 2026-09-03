/**
 * Fail-closed static reconciliation for commercial-quality state contracts.
 * Collisions compare route + selector + observed identity — ownership is
 * provenance only and must not make otherwise identical signatures unique.
 */
import type { StateDomContract } from './m55StateDomContracts';
import {
  M55_AUTH_GATE_FIXTURE_REGISTRY,
  authGateFixtureById,
  imageResponseFixtureById,
  isRegisteredImageResponseFixtureId,
} from './m55AuthGateFixtureRegistry';
import {
  assertAliasMapClosed,
  canonicalObservableStateIdFor,
  M55_OBSERVABLE_STATE_ALIASES,
  M55_OBSERVABLE_STATE_PROJECTIONS,
  reconcileResolverParity,
} from './m55ObservableStateAliasMap';

export type ObservableStateSignature = {
  route: string;
  selector: string;
  stateAttribute: string | null;
  observedValue: string | null;
};

export function observableSignatureOf(contract: StateDomContract): ObservableStateSignature {
  const canonical = canonicalObservableStateIdFor(contract.runtimeStateId);
  return {
    route: contract.route,
    // Signature identity is the observed canonical value — not ownership.
    selector: `[data-m55-cq-state-id="${canonical.replace(/"/g, '')}"]`,
    stateAttribute: contract.stateAttribute,
    observedValue: contract.expectedAttributeValue ?? contract.expectedText ?? canonical,
  };
}

export function serializeObservableSignature(sig: ObservableStateSignature): string {
  return JSON.stringify(sig);
}

export type StateIdentityReconciliationFailure = {
  code:
    | 'STATE_CONTRACT_COLLISION'
    | 'STATE_CONTRACT_MISSING'
    | 'STATE_CONTRACT_AMBIGUOUS'
    | 'SETUP_STATE_MISMATCH'
    | 'STOP_FIXTURE_SCOPE';
  detail: string;
};

function isSelectorOnly(contract: StateDomContract): boolean {
  return (
    !contract.stateAttribute &&
    !contract.expectedText &&
    !isRegisteredImageResponseFixtureId(contract.fixtureId)
  );
}

/**
 * Reconcile executable contracts. Returns failure list (empty = PASS).
 */
export function reconcileExecutableStateContracts(
  contracts: readonly StateDomContract[],
  options: {
    setupFixtureIdBySurfaceId?: ReadonlyMap<string, string | null | undefined>;
    expectedRuntimeStateIdBySurfaceId?: ReadonlyMap<string, string>;
    /** When true, skip closed-map coverage (used by synthetic negative probes). */
    skipAliasMapClosed?: boolean;
  } = {},
): StateIdentityReconciliationFailure[] {
  const failures: StateIdentityReconciliationFailure[] = [];
  const bySig = new Map<string, StateDomContract[]>();
  const registrationIds = contracts.map((c) => c.runtimeStateId);

  if (!options.skipAliasMapClosed) {
    try {
      assertAliasMapClosed(registrationIds);
    } catch (error) {
      failures.push({
        code: 'STOP_FIXTURE_SCOPE',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Detect an alias/projection mapped to two canonicals.
  for (const [aliasId, def] of Object.entries(M55_OBSERVABLE_STATE_ALIASES)) {
    const resolved = canonicalObservableStateIdFor(aliasId);
    if (resolved !== def.canonicalObservableStateId) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `alias ${aliasId} maps to multiple canonical states`,
      });
    }
  }
  for (const [projectionId, canonical] of Object.entries(M55_OBSERVABLE_STATE_PROJECTIONS)) {
    const resolved = canonicalObservableStateIdFor(projectionId);
    if (resolved !== canonical) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `projection ${projectionId} maps to multiple canonical states`,
      });
    }
  }

  // Verifier/reporting and production must share one authoritative resolver.
  for (const failure of reconcileResolverParity(
    registrationIds,
    canonicalObservableStateIdFor,
  )) {
    failures.push({
      code: failure.code,
      detail: failure.detail,
    });
  }

  for (const contract of contracts) {
    if (!contract.runtimeStateId.trim()) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `${contract.surfaceId} has empty runtimeStateId`,
      });
      continue;
    }

    const canonical = canonicalObservableStateIdFor(contract.runtimeStateId);
    if (!canonical.trim()) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `${contract.surfaceId} has no canonical observable state`,
      });
    }

    if (isSelectorOnly(contract)) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `${contract.surfaceId} selector-only contract cannot uniquely identify state (${contract.selector})`,
      });
    }

    if (
      contract.ownership === 'application' &&
      !contract.stateAttribute &&
      !contract.expectedText
    ) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `${contract.surfaceId} application contract lacks observable attribute/text`,
      });
    }

    // Contract expected value must match the independently observed canonical.
    if (
      contract.expectedAttributeValue &&
      contract.expectedAttributeValue !== canonical
    ) {
      failures.push({
        code: 'STATE_CONTRACT_COLLISION',
        detail: `${contract.surfaceId} expectedAttributeValue ${contract.expectedAttributeValue} != canonical ${canonical}`,
      });
    }

    const key = serializeObservableSignature(observableSignatureOf(contract));
    const list = bySig.get(key) ?? [];
    list.push(contract);
    bySig.set(key, list);

    if (contract.fixtureId?.startsWith('auth_gate.')) {
      try {
        const def = authGateFixtureById(contract.fixtureId);
        if (def.runtimeStateId !== contract.runtimeStateId) {
          failures.push({
            code: 'SETUP_STATE_MISMATCH',
            detail: `${contract.surfaceId} fixture ${contract.fixtureId} owns ${def.runtimeStateId} not ${contract.runtimeStateId}`,
          });
        }
      } catch (error) {
        failures.push({
          code: 'STOP_FIXTURE_SCOPE',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (contract.fixtureId?.startsWith('image_response.')) {
      try {
        const def = imageResponseFixtureById(contract.fixtureId);
        if (def.runtimeStateId !== contract.runtimeStateId) {
          failures.push({
            code: 'SETUP_STATE_MISMATCH',
            detail: `${contract.surfaceId} fixture ${contract.fixtureId} owns ${def.runtimeStateId} not ${contract.runtimeStateId}`,
          });
        }
      } catch (error) {
        failures.push({
          code: 'STOP_FIXTURE_SCOPE',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const setupFixture = options.setupFixtureIdBySurfaceId?.get(contract.surfaceId);
    if (
      typeof setupFixture === 'string' &&
      setupFixture.startsWith('auth_gate.') &&
      contract.fixtureId &&
      setupFixture !== contract.fixtureId
    ) {
      failures.push({
        code: 'SETUP_STATE_MISMATCH',
        detail: `${contract.surfaceId} setup fixture ${setupFixture} != contract fixture ${contract.fixtureId}`,
      });
    }

    const expected = options.expectedRuntimeStateIdBySurfaceId?.get(contract.surfaceId);
    if (expected && expected !== contract.runtimeStateId) {
      failures.push({
        code: 'SETUP_STATE_MISMATCH',
        detail: `${contract.surfaceId} setup state ${expected} != contract ${contract.runtimeStateId}`,
      });
    }
  }

  // Same observable signature with different observed canonical IDs → collision
  // (ownership must not uniquify the signature).
  for (const [sig, list] of bySig) {
    const canonicalIds = new Set(
      list.map((c) => canonicalObservableStateIdFor(c.runtimeStateId)),
    );
    if (canonicalIds.size > 1) {
      failures.push({
        code: 'STATE_CONTRACT_COLLISION',
        detail: `shared observable signature ${sig} across canonical states ${[...canonicalIds].join(',')}`,
      });
    }
  }

  // Fixture definition reused for incompatible canonical states
  const fixtureToStates = new Map<string, Set<string>>();
  for (const contract of contracts) {
    if (!contract.fixtureId) continue;
    const set = fixtureToStates.get(contract.fixtureId) ?? new Set();
    set.add(canonicalObservableStateIdFor(contract.runtimeStateId));
    fixtureToStates.set(contract.fixtureId, set);
  }
  for (const [fixtureId, states] of fixtureToStates) {
    if (
      states.size > 1 &&
      (fixtureId.startsWith('auth_gate.') || fixtureId.startsWith('image_response.'))
    ) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `fixture ${fixtureId} reused for incompatible canonical states ${[...states].join(',')}`,
      });
    }
  }

  void M55_AUTH_GATE_FIXTURE_REGISTRY;

  return failures;
}

export function countObservableSignatureCollisions(
  contracts: readonly StateDomContract[],
): number {
  return reconcileExecutableStateContracts(contracts).filter(
    (f) => f.code === 'STATE_CONTRACT_COLLISION',
  ).length;
}

/** Unique canonical observable states after authoritative alias collapse. */
export function countUniqueObservableSignatures(
  contracts: readonly StateDomContract[],
): number {
  return new Set(
    contracts.map((contract) => canonicalObservableStateIdFor(contract.runtimeStateId)),
  ).size;
}
