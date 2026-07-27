import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { sha256Canonical } from '../hash.mjs';
import { historySha256FromEvents, readHistory, computeEventHash } from '../history.mjs';
import { generateProductAuthority } from '../generate.mjs';
import {
  readAuthority,
  verifyProductAuthority,
  validateAuthorityStructure,
  validateObservationsStructure,
  LOCK_PATH,
  SOURCE_PATHS,
  stripMetadataBlock,
  parseMetadataBlock,
  METADATA_START,
  METADATA_END,
} from '../validate.mjs';
import { readObservations } from '../observations.mjs';
import { bootstrapFixture } from '../generate.mjs';
import { cleanupTempRoot, makeTempRoot } from '../history.mjs';

test('bootstrap fixture generates lockfile', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.ok(fs.existsSync(path.join(tempRoot, LOCK_PATH)));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generated bundle hash is stable', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const first = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    generateProductAuthority(tempRoot);
    const second = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(first.generatedBundleSha256, second.generatedBundleSha256);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('authority hash matches lock', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(lock.authoritySha256, sha256Canonical(readAuthority(tempRoot)));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('observations hash matches lock', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(lock.observationsSha256, sha256Canonical(readObservations(tempRoot)));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('history hash matches lock', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    const historyText = fs.readFileSync(path.join(tempRoot, '.product-authority/authority-history.jsonl'), 'utf8');
    const events = historyText
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.equal(lock.historySha256, historySha256FromEvents(events));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('lock lists all generated artifacts', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(lock.artifacts.length, 6);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generatedAt comes from observations lastObservedAt', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(
      lock.generatedAt,
      /** @type {{ value: string }} */ (readObservations(tempRoot).observationMeta.lastObservedAt).value,
    );
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('bootstrap verifier passes on fixture', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, true, result.errors.join('; '));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('steady-state verifier fails on bootstrap-only history', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = verifyProductAuthority(tempRoot, { mode: 'steady-state' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('authority structure validation passes', () => {
  validateAuthorityStructure(readAuthority(process.cwd()));
});

test('observations structure validation passes', () => {
  validateObservationsStructure(readObservations(process.cwd()));
});

test('history event hash excludes eventHash field only', () => {
  const events = readHistory(process.cwd());
  const event = events[0];
  const recomputed = computeEventHash(event);
  assert.equal(event.eventHash, recomputed);
});

test('artifact files exist after generation', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/generated/authority-header.md')));
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/generated/handoff.json')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('lock generatorVersion is 1.0.0', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.equal(lock.generatorVersion, '1.0.0');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('sourcePaths are ordered in lock', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    assert.deepEqual(lock.sourcePaths, SOURCE_PATHS);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('metadata block is excluded from artifact hash only', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.md');
    const payload = fs.readFileSync(handoffPath, 'utf8');
    assert.match(payload, new RegExp(`${METADATA_START}[\\s\\S]*${METADATA_END}`));
    const bodyOnly = stripMetadataBlock(payload);
    assert.match(bodyOnly, /generatedBundleSha256 appears only in the generator-owned metadata block/);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    const metadata = parseMetadataBlock(payload);
    assert.equal(metadata.generatedBundleSha256, lock.generatedBundleSha256);
    assert.equal(metadata.artifactSha256, lock.artifacts.find((a) => a.path.endsWith('handoff.md')).artifactSha256);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('ordinary payload text containing generatedBundleSha256 remains hashed', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.md');
    const original = fs.readFileSync(handoffPath, 'utf8');
    const mutated = original.replace(
      'generatedBundleSha256 appears only in the generator-owned metadata block',
      'generatedBundleSha256 appears only in the generator-owned metadata block (annotated)',
    );
    fs.writeFileSync(handoffPath, mutated, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('artifact hash mismatch')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('rendered bundle hash mismatch fails verification', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.md');
    const payload = fs.readFileSync(handoffPath, 'utf8');
    const tampered = payload.replace(
      /(generatedBundleSha256: )[a-f0-9]{64}/,
      `$1${'f'.repeat(64)}`,
    );
    fs.writeFileSync(handoffPath, tampered, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('rendered generatedBundleSha256 mismatch')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('generated handoff json fields trace to authority or observations sources', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const authority = readAuthority(tempRoot);
    const observations = readObservations(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.equal(handoff.productId, /** @type {{ value: string }} */ (authority.product.id).value);
    assert.equal(
      handoff.lanes.authorityPack,
      /** @type {{ value: string }} */ (observations.lanes.authorityPack.status).value,
    );
    assert.equal('nextGate' in handoff, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('rendered artifact hash mismatch fails verification', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoffPath = path.join(tempRoot, '.product-authority/generated/handoff.md');
    const payload = fs.readFileSync(handoffPath, 'utf8');
    const tampered = payload.replace(/(artifactSha256: )[a-f0-9]{64}/, `$1${'a'.repeat(64)}`);
    fs.writeFileSync(handoffPath, tampered, 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('rendered artifactSha256 mismatch')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});
