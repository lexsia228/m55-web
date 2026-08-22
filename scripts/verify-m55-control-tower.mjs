#!/usr/bin/env node
/**
 * M55 Control Tower verifier — static fail-closed authority checks.
 * Network-free: it validates durable handoff semantics; fresh GitHub/Vercel
 * identity must still be reobserved by the caller when required.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXECUTION_STATE_PATH,
  validateExecutionState,
  detectLegacyExecutionDrift,
} from './m55-control-tower-semantic.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAILURES = [];
function fail(message) { FAILURES.push(message); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const REQUIRED_CONTROL_TOWER_FILES = [
  'AGENTS.md',
  '.cursor/rules/m55-control-tower.mdc',
  EXECUTION_STATE_PATH,
  'docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md',
  'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_ROADMAP.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
  'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md',
  'docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md',
  'lib/m55/contracts/m55CommercialFunnelContract.ts',
  'scripts/m55-control-tower-context.mjs',
  'scripts/m55-control-tower-semantic.mjs',
];

const GATE_LOCAL_RULE = 'GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN';
const LEDGER_RERUN_RULE =
  'HIGH-COST CLOSED GREEN TESTS MUST NOT BE RERUN UNLESS AN INVALIDATING DEPENDENCY CHANGED.';

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
function checkExecutionState() {
  const src = read(EXECUTION_STATE_PATH);
  const current = read('docs/ssot/M55_CURRENT_STATE.md');
  const { state, errors } = validateExecutionState(src);
  for (const message of errors) fail(message);
  if (!state) return;

  if (state.nextSingleAction !== 'CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN') {
    fail('cold-start hardening revision must keep NEXT at CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN');
  }
  if (state.productWorkAfterControlTower !== 'PAIR-FREE-TO-PAID-MAPPING-FIRST') {
    fail('execution state must preserve Pair free→paid mapping-first as post-acceptance product work');
  }
  if (state.pairImplementation !== 'NOT_STARTED') fail('Pair implementation must remain NOT_STARTED');
  if (state.pairPremium !== 'NOT_ACTIVATED') fail('Pair Premium must remain NOT_ACTIVATED');

  const legacy = detectLegacyExecutionDrift(state, current);
  if (legacy.drift && state.legacyExecutionFieldsSuperseded !== true) {
    fail(`legacy execution drift is ungoverned: ${legacy.reason}`);
  }
}
function checkAgents() {
  const src = read('AGENTS.md');
  if (!src.includes(EXECUTION_STATE_PATH)) fail('AGENTS.md missing M55_EXECUTION_STATE.json');
  if (!src.includes('sole executable authority')) fail('AGENTS.md must declare sole executable authority');
  if (!src.includes('M55_GPT_COLD_START_ACCEPTANCE.md')) fail('AGENTS.md missing GPT cold-start acceptance contract');
  if (!src.includes('LOCAL_RUNTIME_UNAVAILABLE')) fail('AGENTS.md missing remote-only GPT fallback');
  if (!src.includes('RERUN_PROHIBITED')) fail('AGENTS.md missing RERUN_PROHIBITED');
  if (!src.includes('npm run m55:context')) fail('AGENTS.md missing m55:context');
}
function checkCursorRule() {
  const src = read('.cursor/rules/m55-control-tower.mdc');
  if (!/alwaysApply:\s*true/.test(src)) fail('Cursor rule must be alwaysApply');
  if (!src.includes(EXECUTION_STATE_PATH)) fail('Cursor rule missing execution state owner');
  if (!src.includes('RERUN_PROHIBITED')) fail('Cursor rule missing rerun prohibition');
}
function checkColdStartContract() {
  const src = read('docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md');
  for (const required of [
    'LOCAL_RUNTIME_UNAVAILABLE',
    'HANDOFF_COLD_START_PASS',
    'CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN',
    'PAIR-FREE-TO-PAID-MAPPING-FIRST',
    'mutation count is zero',
  ]) {
    if (!src.includes(required)) fail(`cold-start contract missing: ${required}`);
  }
}
function checkLedger() {
  const src = read('docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md');
  if (!src.includes(LEDGER_RERUN_RULE)) fail('high-cost ledger missing permanent rerun rule');
  if (!src.includes(GATE_LOCAL_RULE)) fail('high-cost ledger missing gate-local rule');
  if (!src.includes('REAL_PAYMENT_RERUN_PROHIBITED')) fail('high-cost ledger missing payment rerun prohibition');
}
function checkCommercialSkuOwnersInContract() {
  const contract = read('lib/m55/contracts/m55CommercialFunnelContract.ts');
  if (!/selfPremiumLight:[\s\S]*additionalThemes:\s*1/m.test(contract)) fail('machine contract missing Light additionalThemes=1');
  if (!/selfPremiumFull:[\s\S]*additionalThemes:\s*5/m.test(contract)) fail('machine contract missing Full additionalThemes=5');
  if (!/dtr_core_light_v1/.test(contract)) fail('machine contract missing dtr_core_light_v1');
  if (!/dtr_core_full_v1/.test(contract)) fail('machine contract missing dtr_core_full_v1');
}

function main() {
  checkRequiredFiles();
  checkPackageContextScript();
  checkExecutionState();
  checkAgents();
  checkCursorRule();
  checkColdStartContract();
  checkLedger();
  checkCommercialSkuOwnersInContract();

  if (FAILURES.length > 0) {
    console.error('verify:m55-control-tower:FAIL');
    for (const message of FAILURES) console.error(`- ${message}`);
    process.exit(1);
  }
  console.log('verify:m55-control-tower:PASS');
}
main();
