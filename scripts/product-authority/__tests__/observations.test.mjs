import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readObservations } from '../observations.mjs';
import { validateGovernedProductionObservedSha, validateObservationsStructure } from '../validate.mjs';
import { cleanupTempRoot, copyAuthorityPackSources, makeTempRoot } from '../history.mjs';
import { generateProductAuthority } from '../generate.mjs';
import { LOCK_PATH } from '../validate.mjs';
import { DIAGNOSTICS_SOURCE_KIND } from '../production-observation-contract.mjs';

const OBSERVED_ORIGIN_MAIN_SHA = '7e30b6456c6b2c45383ea8fb042efb9d17229893';
const OBSERVED_PRODUCTION_SHA = '7e30b6456c6b2c45383ea8fb042efb9d17229893';
const OBSERVATION_TIMESTAMP = '2026-08-06T06:42:52.660Z';
const BOOTSTRAP_START_HEAD = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';

test('production lastObservedSha reflects governed diagnostics observation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: unknown }} */ (observations.production.lastObservedSha).value,
    OBSERVED_PRODUCTION_SHA,
  );
  assert.equal(
    /** @type {{ source: { kind: string } }} */ (observations.production.lastObservedSha).source.kind,
    DIAGNOSTICS_SOURCE_KIND,
  );
});

test('production status is observed route build identity', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.production.status).value,
    'ROUTE_BUILD_IDENTITY_OBSERVED',
  );
});

test('origin main sha matches latest read-only observation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
    OBSERVED_ORIGIN_MAIN_SHA,
  );
});

test('lastObservedAt matches recorded UTC observation timestamp', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.observationMeta.lastObservedAt).value,
    OBSERVATION_TIMESTAMP,
  );
});

test('origin main observation classification remains OBSERVED_CURRENT', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ classification: string }} */ (observations.repository.lastObservedOriginMainSha)
      .classification,
    'OBSERVED_CURRENT',
  );
});

test('origin main observation source remains read-only Git observation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ source: { kind: string, reference: string } }} */ (
      observations.repository.lastObservedOriginMainSha
    ).source.kind,
    'GIT_OBSERVATION',
  );
  assert.match(
    /** @type {{ source: { reference: string } }} */ (observations.repository.lastObservedOriginMainSha)
      .source.reference,
    /git fetch origin/i,
  );
});

test('authority pack lane is COMPLETED', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.authorityPack.status).value, 'COMPLETED');
});

test('self funnel lane is COMPLETED', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.selfFunnel.status).value, 'COMPLETED');
});

test('build week lane is FROZEN', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.buildWeek.status).value, 'FROZEN');
});

test('growth share lane is COMPLETED', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.growthShare.status).value, 'COMPLETED');
});

test('growth share merge status is MERGED', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.growthShare.mergeStatus).value,
    'MERGED',
  );
});

test('bootstrapStartHead remains historical lane creation anchor', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
    BOOTSTRAP_START_HEAD,
  );
});

test('bootstrapStartHead is not replaced by current origin main observation', () => {
  const observations = readObservations(process.cwd());
  assert.notEqual(
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
  );
});

test('bootstrapStartHead equals baseLastObservedOriginMainSha at lane creation', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.baseLastObservedOriginMainSha).value,
  );
});

test('self funnel dirty is false', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: boolean }} */ (observations.lanes.selfFunnel.dirty).value, false);
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
      assert.equal(/** @type {{ value: unknown }} */ (field).value, null);
    }
  }
});

test('observationMeta lastObservedAt is RFC3339', () => {
  const observations = readObservations(process.cwd());
  const value = /** @type {{ value: string }} */ (observations.observationMeta.lastObservedAt).value;
  assert.match(value, /^\d{4}-\d{2}-\d{2}T/);
});

test('generated lock generatedAt follows refreshed observation timestamp', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    generateProductAuthority(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    const observations = readObservations(tempRoot);
    assert.equal(
      lock.generatedAt,
      /** @type {{ value: string }} */ (observations.observationMeta.lastObservedAt).value,
    );
    assert.equal(lock.generatedAt, OBSERVATION_TIMESTAMP);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generated authority header displays refreshed origin main as mutable observation', () => {
  const header = fs.readFileSync(
    path.join(process.cwd(), '.product-authority/generated/authority-header.md'),
    'utf8',
  );
  assert.match(header, new RegExp(OBSERVED_ORIGIN_MAIN_SHA));
  assert.doesNotMatch(
    header,
    new RegExp(`last observed origin/main SHA:\\s*${BOOTSTRAP_START_HEAD}`, 'i'),
  );
});

test('self funnel mutation policy blocks growth append on merged branch', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.selfFunnel.mutationPolicy).value,
    'NO_GROWTH_APPEND_ON_MERGED_BRANCH',
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

test('governed diagnostics observation with non-null production SHA passes validation', () => {
  const observations = readObservations(process.cwd());
  validateGovernedProductionObservedSha(observations);
  validateObservationsStructure(observations);
});

test('unsupported GIT_OBSERVATION production SHA is rejected fail-closed', () => {
  const observations = readObservations(process.cwd());
  const clone = structuredClone(observations);
  /** @type {{ value: string, source: { kind: string, reference: string } }} */ (
    clone.production.lastObservedSha
  ).value = OBSERVED_PRODUCTION_SHA;
  clone.production.lastObservedSha.source = {
    kind: 'GIT_OBSERVATION',
    reference: 'git fetch origin --prune',
  };
  assert.throws(
    () => validateGovernedProductionObservedSha(clone),
    /governed diagnostics observation source/,
  );
});
