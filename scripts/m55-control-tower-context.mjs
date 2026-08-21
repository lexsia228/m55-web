#!/usr/bin/env node
/**
 * M55 Control Tower context — READ-ONLY fresh runtime + durable SSOT merge.
 * No network APIs, secrets, Stripe, Clerk, or Supabase calls.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseSemanticAuthority,
  validateSemanticAuthority,
} from './m55-control-tower-semantic.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const OPERATIONS_MAP = 'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md';
const EVIDENCE_LEDGER = 'docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md';
const CURRENT_STATE = 'docs/ssot/M55_CURRENT_STATE.md';
const ROADMAP = 'docs/ssot/M55_ROADMAP.md';

const RERUN_POLICY =
  'RERUN_PROHIBITED unless an invalidating dependency changed (new chat/session is never an invalidating dependency)';

const DEV_GATE_RERUN_POLICY =
  'COMPLETED_GATE_REPLAY_PROHIBITED — new chat/session is never an invalidating dependency';

function git(...args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function listDirtyPaths() {
  const out = git('status', '--porcelain');
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{2})\s+(.+)$/);
      if (!match) return null;
      const code = match[1].trim();
      const file = match[2].trim();
      if (file === 'node_modules' || file.startsWith('node_modules/')) return null;
      return { code, path: file };
    })
    .filter(Boolean);
}

function upstreamRef(branch) {
  const tracked = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  if (tracked) return tracked;
  const remoteBranch = git('rev-parse', '--verify', '--quiet', `origin/${branch}`);
  return remoteBranch ? `origin/${branch}` : null;
}

function aheadBehind(upstream) {
  if (!upstream) return { behind: null, ahead: null };
  const out = git('rev-list', '--left-right', '--count', `${upstream}...HEAD`);
  if (!out) return { behind: null, ahead: null };
  const [behind, ahead] = out.split(/\s+/).map((n) => Number(n));
  return { behind, ahead };
}

function main() {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown';
  const head = git('rev-parse', 'HEAD') ?? 'unknown';
  const originFeature = git('rev-parse', 'origin/feat/m55-pair-funnel-v1');
  const originMain = git('rev-parse', 'origin/main');
  const upstream = upstreamRef(branch);
  const divergence = aheadBehind(upstream);
  const staged = git('diff', '--cached', '--name-only');
  const stagedPaths = staged ? staged.split('\n').filter(Boolean) : [];
  const dirty = listDirtyPaths();
  const currentSrc = read(CURRENT_STATE);
  const roadmapSrc = read(ROADMAP);
  const { authority, errors } = validateSemanticAuthority(currentSrc, { checkRoadmap: roadmapSrc });

  const context = {
    repository: git('remote', 'get-url', 'origin') ?? 'unknown',
    worktree: ROOT,
    branch,
    head,
    upstream: upstream ?? 'none',
    originFeature: originFeature ?? 'unknown',
    originMain: originMain ?? 'unknown',
    ahead: divergence.ahead,
    behind: divergence.behind,
    index: {
      stagedCount: stagedPaths.length,
      stagedPaths,
    },
    dirty: {
      count: dirty.length,
      paths: dirty,
    },
    semantic: {
      authorityOwner: CURRENT_STATE,
      activeLane: authority.macroLane,
      currentGate: authority.currentExecutionGate,
      nextSingleAction: authority.nextSingleAction,
      productWorkAfterControlTower: authority.productWorkAfterControlTower,
      completedSubGates: authority.completedSubGates,
      worktree: authority.worktree,
      branch: authority.branch,
    },
    ssot: {
      operationsMap: OPERATIONS_MAP,
      highCostEvidenceLedger: EVIDENCE_LEDGER,
    },
    highCostRerunPolicy: RERUN_POLICY,
    developmentGateRerunPolicy: DEV_GATE_RERUN_POLICY,
    duplicateGatePrecheck: [
      'Identify capability/gate',
      'Search HIGH_COST_EVIDENCE_LEDGER',
      'Identify last accepted evidence',
      'Identify exact invalidating dependencies',
      'Compare current diff/dependencies',
      'If none changed → RERUN_PROHIBITED',
    ],
    semanticValidationErrors: errors,
  };

  console.log('M55_CONTROL_TOWER_CONTEXT_JSON_START');
  console.log(JSON.stringify(context, null, 2));
  console.log('M55_CONTROL_TOWER_CONTEXT_JSON_END');
  console.log('');
  console.log('M55 Control Tower Context (read-only)');
  console.log('=====================================');
  console.log(`repository: ${context.repository}`);
  console.log(`worktree: ${context.worktree}`);
  console.log(`branch: ${context.branch}`);
  console.log(`HEAD: ${context.head}`);
  console.log(`upstream: ${context.upstream}`);
  console.log(`origin/feat/m55-pair-funnel-v1: ${context.originFeature}`);
  console.log(`origin/main: ${context.originMain}`);
  console.log(`ahead/behind vs upstream: ${context.ahead ?? '?'} / ${context.behind ?? '?'}`);
  console.log(`index staged: ${context.index.stagedCount}`);
  if (stagedPaths.length > 0) {
    for (const p of stagedPaths) console.log(`  staged: ${p}`);
  }
  console.log(`dirty paths: ${context.dirty.count}`);
  for (const entry of dirty) console.log(`  ${entry.code} ${entry.path}`);
  console.log('');
  console.log('Semantic SSOT (durable — sole next-action owner)');
  console.log(`authority owner: ${CURRENT_STATE}`);
  console.log(`macro lane: ${context.semantic.activeLane ?? 'unknown'}`);
  console.log(`current gate: ${context.semantic.currentGate ?? 'unknown'}`);
  console.log(`NEXT SINGLE ACTION: ${context.semantic.nextSingleAction ?? 'unknown'}`);
  console.log(`product after control tower: ${context.semantic.productWorkAfterControlTower ?? 'unknown'}`);
  console.log(`completed sub-gates: ${context.semantic.completedSubGates.length}`);
  console.log('');
  console.log(`operations map: ${OPERATIONS_MAP}`);
  console.log(`high-cost ledger: ${EVIDENCE_LEDGER}`);
  console.log(`high-cost rerun policy: ${RERUN_POLICY}`);
  console.log(`development-gate replay policy: ${DEV_GATE_RERUN_POLICY}`);
  console.log('');
  console.log('duplicate-gate precheck: ledger search → invalidating dependency compare → else RERUN_PROHIBITED');

  if (errors.length > 0) {
    console.error('');
    console.error('m55:context:FAIL');
    for (const message of errors) console.error(`- ${message}`);
    process.exit(1);
  }

  console.log('');
  console.log('m55:context:PASS');
}

main();
