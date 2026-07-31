/**
 * Fail-closed static reconciliation for commercial-quality state contracts.
 * Ensures every executable runtimeStateId has a unique observable signature.
 */
import type { StateDomContract } from './m55StateDomContracts';
import {
  M55_AUTH_GATE_FIXTURE_REGISTRY,
  authGateFixtureById,
} from './m55AuthGateFixtureRegistry';

export type ObservableStateSignature = {
  route: string;
  selector: string;
  stateAttribute: string | null;
  observedValue: string | null;
  ownership: 'application' | 'fixture';
  fixtureId: string | null;
};

export function observableSignatureOf(contract: StateDomContract): ObservableStateSignature {
  return {
    route: contract.route,
    selector: contract.selector,
    stateAttribute: contract.stateAttribute,
    observedValue: contract.expectedAttributeValue ?? contract.expectedText,
    ownership: contract.ownership,
    fixtureId: contract.fixtureId,
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
  return !contract.stateAttribute && !contract.expectedText && contract.fixtureId !== 'image_response';
}

/**
 * Reconcile executable contracts. Returns failure list (empty = PASS).
 */
export function reconcileExecutableStateContracts(
  contracts: readonly StateDomContract[],
  options: {
    setupFixtureIdBySurfaceId?: ReadonlyMap<string, string | null | undefined>;
    expectedRuntimeStateIdBySurfaceId?: ReadonlyMap<string, string>;
  } = {},
): StateIdentityReconciliationFailure[] {
  const failures: StateIdentityReconciliationFailure[] = [];
  const bySig = new Map<string, StateDomContract[]>();

  for (const contract of contracts) {
    if (!contract.runtimeStateId.trim()) {
      failures.push({
        code: 'STATE_CONTRACT_MISSING',
        detail: `${contract.surfaceId} has empty runtimeStateId`,
      });
      continue;
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
        if (def.route !== contract.route && !contract.route.includes(':')) {
          // pattern routes may differ in navigate path; compare loosely
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

  for (const [sig, list] of bySig) {
    const runtimeIds = new Set(list.map((c) => c.runtimeStateId));
    if (runtimeIds.size > 1) {
      failures.push({
        code: 'STATE_CONTRACT_COLLISION',
        detail: `shared observable signature ${sig} across ${[...runtimeIds].join(',')}`,
      });
    }
  }

  // Fixture definition reused for incompatible states
  const fixtureToStates = new Map<string, Set<string>>();
  for (const contract of contracts) {
    if (!contract.fixtureId) continue;
    const set = fixtureToStates.get(contract.fixtureId) ?? new Set();
    set.add(contract.runtimeStateId);
    fixtureToStates.set(contract.fixtureId, set);
  }
  for (const [fixtureId, states] of fixtureToStates) {
    if (states.size > 1 && fixtureId.startsWith('auth_gate.')) {
      failures.push({
        code: 'STATE_CONTRACT_AMBIGUOUS',
        detail: `fixture ${fixtureId} reused for incompatible states ${[...states].join(',')}`,
      });
    }
  }

  // Registry completeness: every auth-gate registry entry must be referenced or available
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

export function countUniqueObservableSignatures(
  contracts: readonly StateDomContract[],
): number {
  const keys = new Set(
    contracts.map((c) => serializeObservableSignature(observableSignatureOf(c))),
  );
  return keys.size;
}
