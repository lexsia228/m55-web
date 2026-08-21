#!/usr/bin/env node
/**
 * M55 Control Tower verifier — bootstrap + evidence + semantic dedup invariants.
 * Does not execute COMMIT-B product-capability tests or require future B-only files.
 * Does not access network, secrets, Stripe, Clerk, or Supabase.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEMANTIC_AUTHORITY_SECTION,
  validateSemanticAuthority,
} from './m55-control-tower-semantic.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAILURES = [];

function fail(message) {
  FAILURES.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const REQUIRED_CONTROL_TOWER_FILES = [
  'AGENTS.md',
  'docs/ssot/README.md',
  'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_ROADMAP.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
  'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md',
  'docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md',
  'lib/m55/contracts/m55CommercialFunnelContract.ts',
  'scripts/m55-control-tower-context.mjs',
  'scripts/m55-control-tower-semantic.mjs',
];

const OPERATIONS_MAP_SECTIONS = ['## GitHub', '## Vercel', '## Clerk', '## Supabase', '## Stripe'];

const BOOT_REFERENCE_PATHS = [
  'M55_CURRENT_STATE.md',
  'M55_ROADMAP.md',
  'M55_WORKTREE_REGISTRY.md',
  'M55_CONTROL_TOWER_OPERATIONS_MAP.md',
  'M55_HIGH_COST_EVIDENCE_LEDGER.md',
];

const LEDGER_RERUN_RULE =
  'HIGH-COST CLOSED GREEN TESTS MUST NOT BE RERUN UNLESS AN INVALIDATING DEPENDENCY CHANGED.';

const GATE_LOCAL_RULE = 'GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN';

function checkRequiredFiles() {
  for (const rel of REQUIRED_CONTROL_TOWER_FILES) {
    if (!exists(rel)) fail(`missing required control-tower file: ${rel}`);
  }
}

function checkPackageContextScript() {
  const pkg = read('package.json');
  if (!/"m55:context"\s*:\s*"node scripts\/m55-control-tower-context\.mjs"/.test(pkg)) {
    fail('package.json missing m55:context script');
  }
}

function checkOperationsMapSections() {
  const rel = 'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md';
  if (!exists(rel)) return;
  const src = read(rel);
  for (const heading of OPERATIONS_MAP_SECTIONS) {
    if (!src.includes(heading)) fail(`operations map missing section: ${heading}`);
  }
  if (!src.includes('npm run m55:context')) {
    fail('operations map boot cross-reference missing m55:context');
  }
  if (/sk_live_|whsec_|pk_live_[A-Za-z0-9+/=]{10,}/.test(src)) {
    fail('operations map must not contain secret-like values');
  }
}

function checkHighCostLedger() {
  const rel = 'docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md';
  if (!exists(rel)) return;
  const src = read(rel);
  if (!src.includes(LEDGER_RERUN_RULE)) {
    fail('high-cost ledger missing rerun-prohibition rule');
  }
  if (!src.includes(GATE_LOCAL_RULE)) {
    fail('high-cost ledger missing GATE_LOCAL_UNPROVEN rule');
  }
  if (!src.includes('REAL_PAYMENT_RERUN_PROHIBITED')) {
    fail('high-cost ledger missing REAL_PAYMENT_RERUN_PROHIBITED policy');
  }
}

function checkAgentsBootReferences() {
  const rel = 'AGENTS.md';
  if (!exists(rel)) return;
  const src = read(rel);
  if (!src.includes('Control Tower boot sequence')) {
    fail('AGENTS.md missing Control Tower boot sequence section');
  }
  for (const ref of BOOT_REFERENCE_PATHS) {
    if (!src.includes(ref)) fail(`AGENTS.md boot sequence missing reference: ${ref}`);
  }
  if (!src.includes('npm run m55:context')) {
    fail('AGENTS.md boot sequence missing npm run m55:context');
  }
  if (!src.includes('Duplicate-gate precheck')) {
    fail('AGENTS.md missing duplicate-gate precheck section');
  }
  if (!src.includes('RERUN_PROHIBITED')) {
    fail('AGENTS.md duplicate-gate precheck missing RERUN_PROHIBITED rule');
  }
  if (!src.includes('COMPLETED_GATE_REPLAY_PROHIBITED') && !src.includes('do not replay')) {
    fail('AGENTS.md missing completed development-gate replay prohibition');
  }
  if (!src.includes('verify:m55-control-tower')) {
    fail('AGENTS.md verification section missing verify:m55-control-tower');
  }
  if (/^\s*\d+\.\s*`?\.cursorrules`?/m.test(src)) {
    fail('AGENTS.md must not list .cursorrules in read order');
  }
}

function checkSemanticAuthority() {
  const currentSrc = read('docs/ssot/M55_CURRENT_STATE.md');
  const roadmapSrc = read('docs/ssot/M55_ROADMAP.md');
  const registrySrc = read('docs/ssot/M55_WORKTREE_REGISTRY.md');

  if (!currentSrc.includes(SEMANTIC_AUTHORITY_SECTION)) {
    fail('M55_CURRENT_STATE.md missing semantic execution authority section');
  }
  if (!currentSrc.includes('Completed sub-gates (CLOSED — do not replay)')) {
    fail('M55_CURRENT_STATE.md missing completed sub-gates section');
  }

  const { errors } = validateSemanticAuthority(currentSrc, { checkRoadmap: roadmapSrc });
  for (const message of errors) fail(message);

  const wt048Start = registrySrc.indexOf('### WT-048 — Pair lane entrance Wave 0 Live paid DTR readability (ACTIVE)');
  if (wt048Start === -1) {
    fail('M55_WORKTREE_REGISTRY.md missing WT-048 section');
  } else {
    const wt048End = registrySrc.indexOf('\n---', wt048Start);
    const wt048 = wt048End === -1 ? registrySrc.slice(wt048Start) : registrySrc.slice(wt048Start, wt048End);
    if (/\|\s*NEXT SINGLE ACTION\s*\|/.test(wt048)) {
      fail('WT-048 must not maintain its own NEXT SINGLE ACTION table row');
    }
    if (!wt048.includes('semantic execution authority')) {
      fail('WT-048 must reference semantic execution authority owner');
    }
  }
}

function checkCommercialSkuOwnersInContract() {
  const contract = read('lib/m55/contracts/m55CommercialFunnelContract.ts');
  if (!/selfPremiumLight:[\s\S]*additionalThemes:\s*1/m.test(contract)) {
    fail('machine contract missing Light additionalThemes=1');
  }
  if (!/selfPremiumFull:[\s\S]*additionalThemes:\s*5/m.test(contract)) {
    fail('machine contract missing Full additionalThemes=5');
  }
  if (!/dtr_core_light_v1/.test(contract)) {
    fail('machine contract missing dtr_core_light_v1 product key');
  }
  if (!/dtr_core_full_v1/.test(contract)) {
    fail('machine contract missing dtr_core_full_v1 product key');
  }
}

function checkCursorBootstrapRule() {
  const rel = '.cursor/rules/m55-control-tower.mdc';
  if (!exists(rel)) fail('missing Cursor bootstrap rule: .cursor/rules/m55-control-tower.mdc');
  const src = read(rel);
  if (!/alwaysApply:\s*true/.test(src)) fail('m55-control-tower.mdc must set alwaysApply: true');
  if (!src.includes('AGENTS.md')) fail('m55-control-tower.mdc must point to AGENTS.md');
  if (!src.includes(GATE_LOCAL_RULE)) fail('m55-control-tower.mdc missing GATE_LOCAL_UNPROVEN rule');
  if (!src.includes('npm run m55:context')) {
    fail('m55-control-tower.mdc must require npm run m55:context at boot');
  }
  if (!src.includes('RERUN_PROHIBITED')) {
    fail('m55-control-tower.mdc missing duplicate-gate RERUN_PROHIBITED rule');
  }
}

function main() {
  checkRequiredFiles();
  checkPackageContextScript();
  checkOperationsMapSections();
  checkHighCostLedger();
  checkAgentsBootReferences();
  checkSemanticAuthority();
  checkCommercialSkuOwnersInContract();
  checkCursorBootstrapRule();

  if (FAILURES.length > 0) {
    console.error('verify:m55-control-tower:FAIL');
    for (const message of FAILURES) console.error(`- ${message}`);
    process.exit(1);
  }

  console.log('verify:m55-control-tower:PASS');
}

main();
