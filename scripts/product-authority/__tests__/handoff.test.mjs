import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { generateProductAuthority } from '../generate.mjs';
import { verifyProductAuthority, LOCK_PATH } from '../validate.mjs';
import { bootstrapFixture } from '../generate.mjs';
import { cleanupTempRoot, makeTempRoot } from '../history.mjs';
import {
  GENERATOR_VERSION,
  HANDOFF_SCHEMA_VERSION,
} from '../product-authority-versions.mjs';
import { readAuthority } from '../validate.mjs';
import { readObservations } from '../observations.mjs';
import { canonicalStringify } from '../canonical-json.mjs';

const HANDOFF_TOP_LEVEL_KEYS = [
  'artifactSha256',
  'authoritySha256',
  'generatedAt',
  'generatedBundleSha256',
  'generatorVersion',
  'growthShareDelivery',
  'historySha256',
  'lanes',
  'observationsSha256',
  'productId',
  'schemaVersion',
  'sourcePaths',
];

const ARTIFACT_HASH_MISMATCH_PREFIX = 'artifact hash mismatch: ';
const HANDOFF_JSON_ARTIFACT_PATH = '.product-authority/generated/handoff.json';
const HANDOFF_JSON_ARTIFACT_HASH_ERROR = `${ARTIFACT_HASH_MISMATCH_PREFIX}${HANDOFF_JSON_ARTIFACT_PATH}`;

/** @param {string[]} errors */
function firstArtifactHashMismatchIndex(errors) {
  return errors.findIndex((error) => error.startsWith(ARTIFACT_HASH_MISMATCH_PREFIX));
}

test('handoff json schemaVersion and generatorVersion use centralized constants', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.equal(handoff.schemaVersion, HANDOFF_SCHEMA_VERSION);
    assert.equal(handoff.schemaVersion, '2.0.0');
    assert.equal(handoff.generatorVersion, GENERATOR_VERSION);
    assert.equal(handoff.generatorVersion, '1.1.0');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff json canonical top-level key order is exact', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const raw = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8').trim();
    const handoff = JSON.parse(raw);
    assert.deepEqual(Object.keys(handoff), HANDOFF_TOP_LEVEL_KEYS);
    assert.equal(raw, canonicalStringify(handoff));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff growthShareDelivery contains only pr81 and excludes productionDeployed', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.deepEqual(Object.keys(handoff.growthShareDelivery), ['pr81']);
    assert.equal('productionDeployed' in handoff.growthShareDelivery, false);
    assert.equal('production' in handoff, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff source inputs remain schemaVersion 1.0.0', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.equal(readAuthority(tempRoot).schemaVersion, '1.0.0');
    assert.equal(readObservations(tempRoot).schemaVersion, '1.0.0');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff schemaVersion mismatch fails before artifact hash mismatch', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.json');
    const originalHandoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    const handoff = structuredClone(originalHandoff);
    handoff.schemaVersion = '9.9.9';
    assert.deepEqual(
      { ...handoff, schemaVersion: originalHandoff.schemaVersion },
      originalHandoff,
    );
    assert.equal(handoff.artifactSha256, originalHandoff.artifactSha256);
    assert.equal(handoff.generatorVersion, originalHandoff.generatorVersion);
    assert.deepEqual(handoff.growthShareDelivery, originalHandoff.growthShareDelivery);
    fs.writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
    const versionError = 'handoff schemaVersion mismatch';
    const versionIndex = result.errors.indexOf(versionError);
    const firstArtifactHashIndex = firstArtifactHashMismatchIndex(result.errors);
    assert.ok(versionIndex >= 0, result.errors.join('; '));
    assert.ok(firstArtifactHashIndex >= 0, result.errors.join('; '));
    assert.equal(result.errors[firstArtifactHashIndex], HANDOFF_JSON_ARTIFACT_HASH_ERROR);
    assert.ok(versionIndex < firstArtifactHashIndex, result.errors.join('; '));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff generatorVersion mismatch fails before artifact hash mismatch', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.json');
    const originalHandoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    const handoff = structuredClone(originalHandoff);
    handoff.generatorVersion = '9.9.9';
    assert.deepEqual(
      { ...handoff, generatorVersion: originalHandoff.generatorVersion },
      originalHandoff,
    );
    assert.equal(handoff.artifactSha256, originalHandoff.artifactSha256);
    assert.equal(handoff.schemaVersion, originalHandoff.schemaVersion);
    assert.deepEqual(handoff.growthShareDelivery, originalHandoff.growthShareDelivery);
    fs.writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
    const versionError = 'handoff generatorVersion mismatch';
    const versionIndex = result.errors.indexOf(versionError);
    const firstArtifactHashIndex = firstArtifactHashMismatchIndex(result.errors);
    assert.ok(versionIndex >= 0, result.errors.join('; '));
    assert.ok(firstArtifactHashIndex >= 0, result.errors.join('; '));
    assert.equal(result.errors[firstArtifactHashIndex], HANDOFF_JSON_ARTIFACT_HASH_ERROR);
    assert.ok(versionIndex < firstArtifactHashIndex, result.errors.join('; '));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff md exists after generation', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/generated/handoff.md')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff json exists after generation', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/generated/handoff.json')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('authority header includes PRODUCT_ID', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const header = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/authority-header.md'), 'utf8');
    assert.match(header, /PRODUCT_ID: m55/);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff json excludes unsourced nextGate', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.equal('nextGate' in handoff, false);
    assert.equal(JSON.stringify(handoff).includes('BOOTSTRAP-DIFF-REVIEW'), false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generated outputs exclude stale Bootstrap Diff Review gate text', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const paths = [
      '.product-authority/generated/handoff.json',
      '.product-authority/generated/handoff.md',
      '.product-authority/generated/authority-header.md',
      '.product-authority/generated/adapters/codex.md',
      '.product-authority/generated/adapters/cursor.md',
      '.product-authority/generated/adapters/generic-agent.md',
    ];
    for (const rel of paths) {
      const text = fs.readFileSync(path.join(tempRoot, rel), 'utf8');
      assert.equal(/BOOTSTRAP-DIFF-REVIEW/.test(text), false, rel);
      assert.equal(/Next exact gate/i.test(text), false, rel);
    }
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('adapters preserve Human precedence without operational gate synthesis', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    for (const adapter of ['codex.md', 'cursor.md', 'generic-agent.md']) {
      const text = fs.readFileSync(
        path.join(tempRoot, '.product-authority/generated/adapters', adapter),
        'utf8',
      );
      assert.match(text, /Human-approved durable authority supersedes generated adapter guidance/);
      assert.match(text, /must not prescribe push, commit, merge, or deploy sequencing/);
      assert.doesNotMatch(text, /nextGate|BOOTSTRAP-DIFF-REVIEW/);
    }
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generated handoff includes pack hashes', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.md'), 'utf8');
    assert.match(handoff, /authoritySha256:/);
    assert.match(handoff, /generatedBundleSha256:/);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('adapters instruct verify before mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    for (const adapter of ['codex.md', 'cursor.md', 'generic-agent.md']) {
      const text = fs.readFileSync(
        path.join(tempRoot, '.product-authority/generated/adapters', adapter),
        'utf8',
      );
      assert.match(text, /Before analysis or mutation/);
    }
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('stale handoff hash mismatch fails bootstrap verify', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lockPath = path.join(tempRoot, LOCK_PATH);
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.generatedBundleSha256 = '0'.repeat(64);
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('header includes canonical and non-authoritative hosts', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const header = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/authority-header.md'), 'utf8');
    assert.match(header, /m-55\.jp/);
    assert.match(header, /non-authoritative host: m55\.jp/);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff json sourcePaths are present', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.ok(Array.isArray(handoff.sourcePaths));
    assert.ok(handoff.sourcePaths.length > 0);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('regeneration preserves handoff json bytes', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const first = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'));
    generateProductAuthority(tempRoot);
    const second = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'));
    assert.deepEqual(first, second);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff json includes lane statuses', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.equal(handoff.lanes.authorityPack, 'COMPLETED');
    assert.equal(handoff.lanes.selfFunnel, 'COMPLETED');
    assert.equal(handoff.lanes.growthShare, 'ACTIVE');
    assert.equal(handoff.lanes.buildWeek, 'FROZEN');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('authority header includes STOP conditions', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const header = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/authority-header.md'), 'utf8');
    assert.match(header, /STOP conditions/);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('handoff markdown and json lifecycle meanings match', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffMd = fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.md'), 'utf8');
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.match(handoffMd, new RegExp(`Authority Pack lane: ${handoff.lanes.authorityPack}`));
    assert.match(handoffMd, new RegExp(`Self funnel lane: ${handoff.lanes.selfFunnel}`));
    assert.match(handoffMd, new RegExp(`Growth Share lane: ${handoff.lanes.growthShare}`));
    assert.match(handoffMd, new RegExp(`Build Week lane: ${handoff.lanes.buildWeek}`));
    assert.equal(handoff.lanes.authorityPack, 'COMPLETED');
    assert.equal(handoff.lanes.selfFunnel, 'COMPLETED');
    assert.equal(handoff.lanes.growthShare, 'ACTIVE');
    assert.equal(handoff.lanes.buildWeek, 'FROZEN');
    assert.equal('productionDeployed' in handoff.growthShareDelivery, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});
