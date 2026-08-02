import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIAGNOSTICS_SOURCE_KIND,
  DIAGNOSTICS_SOURCE_REFERENCE,
  PRODUCTION_STATUS_OBSERVED,
  PRODUCTION_STATUS_PENDING,
} from '../production-observation-contract.mjs';
import {
  assertExactProductionLeaves,
  assertNoNodeEnvPersistence,
  buildRollingProductionObservation,
} from '../production-observation.mjs';

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const T0 = '2026-08-02T06:00:00.000Z';
const T1 = '2026-08-02T06:01:00.000Z';

/** @returns {Record<string, unknown>} */
function buildPendingObservations() {
  return {
    schemaVersion: '1.0.0',
    observationMeta: {
      lastObservedAt: {
        value: T0,
        classification: 'OBSERVED_CURRENT',
        source: { kind: 'GIT_OBSERVATION', reference: 'git fetch origin --prune' },
        updatedAt: T0,
        evidenceRefs: [],
      },
    },
    production: {
      status: {
        value: PRODUCTION_STATUS_PENDING,
        classification: 'PENDING_EVIDENCE',
        source: { kind: 'PENDING_EVIDENCE', reference: PRODUCTION_STATUS_PENDING },
        updatedAt: T0,
        evidenceRefs: [],
      },
      lastObservedSha: {
        value: null,
        classification: 'PENDING_EVIDENCE',
        source: { kind: 'PENDING_EVIDENCE', reference: PRODUCTION_STATUS_PENDING },
        updatedAt: T0,
        evidenceRefs: [],
      },
    },
  };
}

/** @param {string} sha @param {string} observedAt */
function buildObservedObservations(sha, observedAt) {
  const pending = buildPendingObservations();
  const transition = buildRollingProductionObservation(pending, {
    observedAt,
    diagnosticsIdentity: sha,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'applied');
  return transition.observations;
}

test('PENDING to OBSERVED transition updates five production leaves', () => {
  const pending = buildPendingObservations();
  const transition = buildRollingProductionObservation(pending, {
    observedAt: T1,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'applied');
  const production = /** @type {Record<string, { value: unknown; updatedAt: string; evidenceRefs: unknown[]; source: { kind: string; reference: string } }> } */ (
    transition.observations.production
  );
  assert.equal(production.status.value, PRODUCTION_STATUS_OBSERVED);
  assert.equal(production.lastObservedSha.value, SHA_A);
  assert.equal(production.environment.value, 'production');
  assert.equal(production.branch.value, 'main');
  assert.equal(production.observedAt.value, T1);
  for (const leaf of [
    production.status,
    production.lastObservedSha,
    production.environment,
    production.branch,
    production.observedAt,
  ]) {
    assert.equal(leaf.updatedAt, T1);
    assert.deepEqual(leaf.evidenceRefs, []);
    assert.equal(leaf.source.kind, DIAGNOSTICS_SOURCE_KIND);
    assert.equal(leaf.source.reference, DIAGNOSTICS_SOURCE_REFERENCE);
  }
  const meta = /** @type {{ lastObservedAt: { value: string; updatedAt: string; classification: string } }} */ (
    transition.observations.observationMeta
  );
  assert.equal(meta.lastObservedAt.value, T1);
  assert.equal(meta.lastObservedAt.updatedAt, T1);
  assert.equal(meta.lastObservedAt.classification, 'OBSERVED_CURRENT');
  assert.equal(transition.generatedAt, T1);
});

test('OBSERVED A to OBSERVED B advances identity and timestamps', () => {
  const observedA = buildObservedObservations(SHA_A, T0);
  const transition = buildRollingProductionObservation(observedA, {
    observedAt: T1,
    diagnosticsIdentity: SHA_B,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'applied');
  const production = /** @type {{ lastObservedSha: { value: string }; observedAt: { value: string } }} */ (
    transition.observations.production
  );
  assert.equal(production.lastObservedSha.value, SHA_B);
  assert.equal(production.observedAt.value, T1);
});

test('same SHA with newer valid timestamp applies new observation', () => {
  const observedA = buildObservedObservations(SHA_A, T0);
  const transition = buildRollingProductionObservation(observedA, {
    observedAt: T1,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'applied');
});

test('identical complete event returns no_change without mutation', () => {
  const observedA = buildObservedObservations(SHA_A, T0);
  const snapshot = structuredClone(observedA);
  const transition = buildRollingProductionObservation(observedA, {
    observedAt: T0,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'no_change');
  assert.deepEqual(observedA, snapshot);
  assert.deepEqual(transition.changedPaths, []);
});

test('input observations remain unmodified', () => {
  const pending = buildPendingObservations();
  const snapshot = structuredClone(pending);
  buildRollingProductionObservation(pending, {
    observedAt: T1,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assert.deepEqual(pending, snapshot);
});

test('arbitrary production keys are removed from applied result', () => {
  const pending = buildPendingObservations();
  pending.production = {
    .../** @type {Record<string, unknown>} */ (pending.production),
    node_env: { value: 'production' },
    extraLeaf: { value: 'remove-me' },
  };
  const transition = buildRollingProductionObservation(pending, {
    observedAt: T1,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assert.equal(transition.result, 'applied');
  assertExactProductionLeaves(/** @type {Record<string, unknown>} */ (transition.observations.production));
  assert.equal(Object.keys(/** @type {Record<string, unknown>} */ (transition.observations.production)).length, 5);
  assert.equal('node_env' in /** @type {Record<string, unknown>} */ (transition.observations.production), false);
  assert.equal('extraLeaf' in /** @type {Record<string, unknown>} */ (transition.observations.production), false);
});

test('node_env is not persisted on production observations', () => {
  const transition = buildRollingProductionObservation(buildPendingObservations(), {
    observedAt: T1,
    diagnosticsIdentity: SHA_A,
    environment: 'production',
    branch: 'main',
  });
  assertNoNodeEnvPersistence(transition.observations);
  assert.equal('node_env' in /** @type {Record<string, unknown>} */ (transition.observations.production), false);
});
