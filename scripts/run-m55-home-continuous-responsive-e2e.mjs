#!/usr/bin/env node
/**
 * Official HOME continuous-responsive launcher.
 *
 * Runs Playwright, preserves its exit status, then removes test-owned residue
 * written after the suite process. The governed candidate approval pack is
 * never deleted.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const APPROVAL_PACK = 'commercial-quality-approval-pack';

const RESIDUE_ROOTS = [
  join(ROOT, 'playwright-report'),
  join(ROOT, 'test-results', '.last-run.json'),
  join(ROOT, 'test-results', 'playwright-run'),
  join(ROOT, 'test-results', 'commercial-quality-gate'),
];

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  const st = statSync(dir);
  if (st.isFile()) {
    out.push(dir);
    return out;
  }
  for (const name of readdirSync(dir)) {
    walkFiles(join(dir, name), out);
  }
  return out;
}

function cleanOwnedResidue() {
  for (const path of RESIDUE_ROOTS) {
    rmSync(path, { recursive: true, force: true });
  }
  const testResults = join(ROOT, 'test-results');
  if (existsSync(testResults)) {
    for (const name of readdirSync(testResults)) {
      if (name === APPROVAL_PACK) continue;
      rmSync(join(testResults, name), { recursive: true, force: true });
    }
  }
}

function countOwnedResidue() {
  let count = 0;
  for (const path of RESIDUE_ROOTS) {
    count += walkFiles(path).length;
  }
  const testResults = join(ROOT, 'test-results');
  if (existsSync(testResults)) {
    for (const name of readdirSync(testResults)) {
      if (name === APPROVAL_PACK) continue;
      count += walkFiles(join(testResults, name)).length;
    }
  }
  return count;
}

const playwrightArgs = [
  'playwright',
  'test',
  'e2e/home-continuous-responsive.spec.ts',
  ...process.argv.slice(2),
];

const result = spawnSync('npx', playwrightArgs, {
  cwd: ROOT,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const status = typeof result.status === 'number' ? result.status : 1;

// Always clean after Playwright fully exits (PASS or FAIL).
cleanOwnedResidue();
const residue = countOwnedResidue();
if (residue !== 0) {
  console.error(`home-continuous e2e: generated residue count ${residue} after cleanup`);
  process.exit(status === 0 ? 1 : status);
}

process.exit(status);
