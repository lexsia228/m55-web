import assert from 'node:assert/strict';
import test from 'node:test';
import { readObservations } from '../observations.mjs';
import { validateObservationsStructure } from '../validate.mjs';
import { cleanupTempRoot, copyAuthorityPackSources, makeTempRoot } from '../history.mjs';

test('production lastObservedSha is null', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: unknown }} */ (observations.production.lastObservedSha).value, null);
});

test('production status is pending reobservation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.production.status).value,
    'PENDING_REOBSERVATION_ON_M-55.JP',
  );
});

test('origin main sha matches bootstrap preflight', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
    'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
  );
});

test('authority pack lane is ACTIVE', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.authorityPack.status).value, 'ACTIVE');
});

test('self funnel lane is PARKED', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.selfFunnel.status).value, 'PARKED');
});

test('build week lane is FROZEN', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.buildWeek.status).value, 'FROZEN');
});

test('bootstrapStartHead equals origin main at creation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
  );
});

test('self funnel dirty is true', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: boolean }} */ (observations.lanes.selfFunnel.dirty).value, true);
});

test('provider identities remain pending evidence', () => {
  const observations = readObservations(process.cwd());
  for (const provider of ['supabase', 'clerk', 'stripe']) {
    for (const env of ['production', 'preview']) {
      const envObj = /** @type {Record<string, { classification: string }>} */ (
        /** @type {Record<string, unknown>} */ (observations.providers)[provider]
      )[env];
      const field = Object.values(envObj)[0];
      assert.equal(field.classification, 'PENDING_EVIDENCE');
    }
  }
});

test('observationMeta lastObservedAt is RFC3339', () => {
  const observations = readObservations(process.cwd());
  const value = /** @type {{ value: string }} */ (observations.observationMeta.lastObservedAt).value;
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/);
});

test('self funnel mutation policy blocks authority pack lane edits', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.selfFunnel.mutationPolicy).value,
    'NO_MUTATION_DURING_AUTHORITY_PACK_LANE',
  );
});

test('mixed raw observation values fail validation', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    const observations = readObservations(tempRoot);
    observations.production.status = 'PENDING_REOBSERVATION_ON_M-55.JP';
    assert.throws(() => validateObservationsStructure(observations));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('HUMAN_DECISION observation source kind is rejected', () => {
  const observations = readObservations(process.cwd());
  const clone = structuredClone(observations);
  /** @type {{ source: { kind: string } }} */ (clone.lanes.selfFunnel.mutationPolicy).source.kind =
    'HUMAN_DECISION';
  assert.throws(() => validateObservationsStructure(clone), /source\.kind invalid/);
});

test('WORKTREE_OBSERVATION source kind is accepted for mutation policy', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ source: { kind: string } }} */ (observations.lanes.selfFunnel.mutationPolicy).source.kind,
    'WORKTREE_OBSERVATION',
  );
  validateObservationsStructure(observations);
});
