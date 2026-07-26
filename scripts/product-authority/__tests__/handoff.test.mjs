import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { generateProductAuthority } from '../generate.mjs';
import { verifyProductAuthority, LOCK_PATH } from '../validate.mjs';
import { bootstrapFixture } from '../generate.mjs';
import { cleanupTempRoot, makeTempRoot } from '../history.mjs';

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

test('handoff json includes next gate', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const handoff = JSON.parse(fs.readFileSync(path.join(tempRoot, '.product-authority/generated/handoff.json'), 'utf8'));
    assert.match(handoff.nextGate, /BOOTSTRAP-DIFF-REVIEW/);
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
    assert.equal(handoff.lanes.authorityPack, 'ACTIVE');
    assert.equal(handoff.lanes.selfFunnel, 'PARKED');
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
