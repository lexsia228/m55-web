import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readObservations } from '../observations.mjs';
import { validateObservationsStructure } from '../validate.mjs';
import { cleanupTempRoot, copyAuthorityPackSources, makeTempRoot } from '../history.mjs';
import { generateProductAuthority } from '../generate.mjs';
import { LOCK_PATH } from '../validate.mjs';

const OBSERVED_ORIGIN_MAIN_SHA = '696559009367a6ac445dc7a07876590b16cd8488';
const OBSERVATION_TIMESTAMP = '2026-07-27T09:56:00+00:00';
const BOOTSTRAP_START_HEAD = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';

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

test('growth share lane is ACTIVE', () => {
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (observations.lanes.growthShare.status).value, 'ACTIVE');
});

test('growth share merge status is open unmerged branch local', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (observations.lanes.growthShare.mergeStatus).value,
    'OPEN_UNMERGED_BRANCH_LOCAL',
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
