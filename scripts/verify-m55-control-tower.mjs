#!/usr/bin/env node
/**
 * M55 Control Tower verifier — COMMIT-A self-contained bootstrap + evidence invariants.
 * Does not execute COMMIT-B product-capability tests or require future B-only files.
 * Does not access network, secrets, Stripe, Clerk, or Supabase.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function checkOperationsMapSections() {
  const rel = 'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md';
  if (!exists(rel)) return;
  const src = read(rel);
  for (const heading of OPERATIONS_MAP_SECTIONS) {
    if (!src.includes(heading)) fail(`operations map missing section: ${heading}`);
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
  if (!src.includes('verify:m55-control-tower')) {
    fail('AGENTS.md verification section missing verify:m55-control-tower');
  }
  if (/^\s*\d+\.\s*`?\.cursorrules`?/m.test(src)) {
    fail('AGENTS.md must not list .cursorrules in read order');
  }
}

function checkCurrentStateActiveLane() {
  const rel = 'docs/ssot/M55_CURRENT_STATE.md';
  if (!exists(rel)) return;
  const src = read(rel);
  if (!/## PAIR LANE ENTRANCE/m.test(src) && !/\(CURRENT\)/m.test(src)) {
    fail('M55_CURRENT_STATE.md missing identifiable current lane section');
  }
  if (!/NEXT SINGLE ACTION/m.test(src)) {
    fail('M55_CURRENT_STATE.md missing NEXT SINGLE ACTION');
  }
}

/** Already-committed machine contract only — not COMMIT-B fixture or cross-layer tests. */
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
}

function main() {
  checkRequiredFiles();
  checkOperationsMapSections();
  checkHighCostLedger();
  checkAgentsBootReferences();
  checkCurrentStateActiveLane();
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
