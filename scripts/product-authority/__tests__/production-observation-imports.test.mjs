import assert from 'node:assert/strict';
import fs, { readFileSync } from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import test from 'node:test';
import { isDirectExecutionEntrypoint } from '../production-observation-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const PA1_MODULES = [
  '../product-authority-versions.mjs',
  '../production-observation-contract.mjs',
  '../production-observation.mjs',
  '../observe-production-diagnostics.mjs',
  '../apply-production-observation.mjs',
  '../run-production-observation.mjs',
];

const CLI_MODULES = [
  'observe-production-diagnostics.mjs',
  'apply-production-observation.mjs',
  'run-production-observation.mjs',
];

const HTTPS_SENTINEL = new Error('HTTPS_STUB');
const FS_WRITE_SENTINEL = new Error('FS_WRITE_STUB');
const PA1_RUNTIME = /product-authority\/(observe-production-diagnostics|apply-production-observation|run-production-observation|production-observation)\.mjs/;

/** @param {string} apiName @param {Record<string, number>} counterBag @param {(...args: never[]) => unknown} original */
function guardPa1Write(apiName, counterBag, original) {
  return (...args) => {
    const stack = new Error().stack ?? '';
    if (PA1_RUNTIME.test(stack)) {
      counterBag[apiName] += 1;
      throw FS_WRITE_SENTINEL;
    }
    return original(...args);
  };
}

/** @param {string} suffix */
function importSpec(modulePath, suffix) {
  return new URL(`${modulePath}?rev4=${suffix}`, import.meta.url).href;
}

test('PA-1 imports are fail-closed with zero network writes output or exit mutation', async () => {
  const initialExitCode = process.exitCode;
  const originals = {
    request: https.request,
    openSync: fs.openSync,
    writeSync: fs.writeSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    renameSync: fs.renameSync,
    unlinkSync: fs.unlinkSync,
    chmodSync: fs.chmodSync,
    fchmodSync: fs.fchmodSync,
    writeFileSync: fs.writeFileSync,
    appendFileSync: fs.appendFileSync,
    createWriteStream: fs.createWriteStream,
    stdoutWrite: process.stdout.write,
    stderrWrite: process.stderr.write,
    exit: process.exit,
  };

  const counters = {
    httpsRequest: 0,
    openSync: 0,
    writeSync: 0,
    fsyncSync: 0,
    closeSync: 0,
    renameSync: 0,
    unlinkSync: 0,
    chmodSync: 0,
    fchmodSync: 0,
    writeFileSync: 0,
    appendFileSync: 0,
    createWriteStream: 0,
    stdout: 0,
    stderr: 0,
    exit: 0,
  };

  https.request = (...args) => {
    const stack = new Error().stack ?? '';
    if (PA1_RUNTIME.test(stack)) {
      counters.httpsRequest += 1;
      throw HTTPS_SENTINEL;
    }
    return originals.request(...args);
  };
  fs.openSync = guardPa1Write('openSync', counters, originals.openSync);
  fs.writeSync = guardPa1Write('writeSync', counters, originals.writeSync);
  fs.fsyncSync = guardPa1Write('fsyncSync', counters, originals.fsyncSync);
  fs.closeSync = guardPa1Write('closeSync', counters, originals.closeSync);
  fs.renameSync = guardPa1Write('renameSync', counters, originals.renameSync);
  fs.unlinkSync = guardPa1Write('unlinkSync', counters, originals.unlinkSync);
  fs.chmodSync = guardPa1Write('chmodSync', counters, originals.chmodSync);
  fs.fchmodSync = guardPa1Write('fchmodSync', counters, originals.fchmodSync);
  fs.writeFileSync = guardPa1Write('writeFileSync', counters, originals.writeFileSync);
  fs.appendFileSync = guardPa1Write('appendFileSync', counters, originals.appendFileSync);
  fs.createWriteStream = (...args) => {
    const stack = new Error().stack ?? '';
    if (PA1_RUNTIME.test(stack)) {
      counters.createWriteStream += 1;
      throw FS_WRITE_SENTINEL;
    }
    return originals.createWriteStream(...args);
  };
  process.stdout.write = () => {
    counters.stdout += 1;
    return true;
  };
  process.stderr.write = () => {
    counters.stderr += 1;
    return true;
  };
  process.exit = (() => {
    counters.exit += 1;
  });
  syncBuiltinESMExports();

  try {
    for (const [index, modulePath] of PA1_MODULES.entries()) {
      await import(importSpec(modulePath, String(index)));
    }

    assert.equal(counters.httpsRequest, 0);
    assert.equal(counters.openSync, 0);
    assert.equal(counters.writeSync, 0);
    assert.equal(counters.fsyncSync, 0);
    assert.equal(counters.closeSync, 0);
    assert.equal(counters.renameSync, 0);
    assert.equal(counters.unlinkSync, 0);
    assert.equal(counters.chmodSync, 0);
    assert.equal(counters.fchmodSync, 0);
    assert.equal(counters.writeFileSync, 0);
    assert.equal(counters.appendFileSync, 0);
    assert.equal(counters.createWriteStream, 0);
    assert.equal(counters.stdout, 0);
    assert.equal(counters.stderr, 0);
    assert.equal(counters.exit, 0);
    assert.equal(process.exitCode, initialExitCode);
  } finally {
    https.request = originals.request;
    fs.openSync = originals.openSync;
    fs.writeSync = originals.writeSync;
    fs.fsyncSync = originals.fsyncSync;
    fs.closeSync = originals.closeSync;
    fs.renameSync = originals.renameSync;
    fs.unlinkSync = originals.unlinkSync;
    fs.chmodSync = originals.chmodSync;
    fs.fchmodSync = originals.fchmodSync;
    fs.writeFileSync = originals.writeFileSync;
    fs.appendFileSync = originals.appendFileSync;
    fs.createWriteStream = originals.createWriteStream;
    process.stdout.write = originals.stdoutWrite;
    process.stderr.write = originals.stderrWrite;
    process.exit = originals.exit;
    process.exitCode = initialExitCode;
    syncBuiltinESMExports();
  }
});

test('dependency graph is acyclic and apply does not import validate.mjs', async () => {
  const applySource = readFileSync(
    path.join(repoRoot, 'scripts/product-authority/apply-production-observation.mjs'),
    'utf8',
  );
  assert.equal(applySource.includes('validate.mjs'), false);
  const versionsSource = readFileSync(
    path.join(repoRoot, 'scripts/product-authority/validate.mjs'),
    'utf8',
  );
  assert.equal(versionsSource.includes('product-authority-versions.mjs'), false);
  assert.equal(versionsSource.includes('production-observation.mjs'), false);
});

test('package scripts include observer and coordinator only', () => {
  assert.equal(
    packageJson.scripts['observe:production-diagnostics'],
    'node scripts/product-authority/observe-production-diagnostics.mjs',
  );
  assert.equal(
    packageJson.scripts['run:production-observation'],
    'node scripts/product-authority/run-production-observation.mjs',
  );
  assert.equal(packageJson.scripts['apply:production-observation'], undefined);
});

test('version constants module has no imports', async () => {
  const source = readFileSync(
    path.join(repoRoot, 'scripts/product-authority/product-authority-versions.mjs'),
    'utf8',
  );
  assert.equal(/^import/m.test(source), false);
  const mod = await import(pathToFileURL(path.join(repoRoot, 'scripts/product-authority/product-authority-versions.mjs')).href);
  assert.equal(mod.HANDOFF_SCHEMA_VERSION, '2.0.0');
  assert.equal(mod.LOCK_SCHEMA_VERSION, '1.0.0');
  assert.equal(mod.GENERATOR_VERSION, '1.1.0');
});

test('CLI modules use shared direct execution helper', () => {
  for (const file of CLI_MODULES) {
    const source = readFileSync(path.join(repoRoot, 'scripts/product-authority', file), 'utf8');
    assert.match(source, /isDirectExecutionEntrypoint\(/);
    assert.equal(source.includes('fileURLToPath(import.meta.url) === process.argv[1]'), false);
  }
});

test('direct execution helper supports normalized space and symlink paths', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-main-detect-'));
  try {
    const spaced = path.join(dir, 'cli entry.mjs');
    fs.writeFileSync(spaced, 'export {}\n');
    const realSpaced = fs.realpathSync(spaced);
    const dotPath = path.join(dir, '.', 'cli entry.mjs');
    const parentDot = path.join(dir, '..', path.basename(dir), 'cli entry.mjs');

    const ops = {
      fileURLToPath: (url) => fileURLToPath(url),
      resolve: (...parts) => path.resolve(...parts),
      realpath: (targetPath) => fs.realpathSync(targetPath),
    };

    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', realSpaced], ops),
      true,
    );
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', dotPath], ops),
      true,
    );
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', parentDot], ops),
      true,
    );
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', dotPath.replace(/ /g, '\\ ')], ops),
      false,
    );

    const other = path.join(dir, 'other.mjs');
    fs.writeFileSync(other, 'export {}\n');
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', other], ops),
      false,
    );
    assert.equal(isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node'], ops), false);
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', path.join(dir, 'missing.mjs')], ops),
      false,
    );

    const link = path.join(dir, 'linked entry.mjs');
    fs.symlinkSync(spaced, link);
    assert.equal(
      isDirectExecutionEntrypoint(pathToFileURL(realSpaced), ['node', link], ops),
      true,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
