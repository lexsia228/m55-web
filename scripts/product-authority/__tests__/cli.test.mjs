import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { bootstrapFixture } from '../generate.mjs';
import { cleanupTempRoot, makeTempRoot } from '../history.mjs';

const CLI = path.resolve('scripts/product-authority/cli.mjs');

test('cli init writes history', () => {
  const tempRoot = makeTempRoot();
  try {
    copyMinimal(tempRoot);
    const result = spawnSync(process.execPath, [CLI, 'init'], { cwd: tempRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/authority-history.jsonl')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('cli generate-handoff writes lockfile', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    assert.ok(fs.existsSync(path.join(tempRoot, '.product-authority/authority.lock.json')));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('cli verify bootstrap passes on fixture', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = spawnSync(process.execPath, [CLI, 'verify'], { cwd: tempRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('cli verify steady-state fails on bootstrap-only fixture', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = spawnSync(process.execPath, [path.resolve('scripts/product-authority/validate.mjs'), '--steady-state'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('cli header prints authority header', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = spawnSync(process.execPath, [CLI, 'header'], { cwd: tempRoot, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Product Authority Header/);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('cli secret-scan passes on fixture', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = spawnSync(process.execPath, [CLI, 'secret-scan'], { cwd: tempRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

/**
 * @param {string} tempRoot
 */
function copyMinimal(tempRoot) {
  for (const rel of [
    '.product-authority/authority.json',
    '.product-authority/observations.json',
    '.product-authority/schema/authority-pack.schema.json',
  ]) {
    const src = path.resolve(rel);
    const dest = path.join(tempRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}
