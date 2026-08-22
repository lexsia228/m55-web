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
  COLD_START_GATE,
  PAIR_MAPPING_GATE,
  PAIR_MINIMAL_IMPLEMENTATION_GATE,
  PAIR_PREMIUM_ACTIVATION_GATE,
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

const BASE_COMPLETED_SUBGATES = [
  'CATEGORY-1-M55-PAIR-WAVE0-LIVE-PAID-DTR-READABILITY-READ-ONLY-MAPPING',
  'PHASE-B-PAID-DTR-READABILITY-IMPLEMENTATION',
  'PHASE-B-HUMAN-VISUAL-CLOSURE',
  'SKU-CAPABILITY-REGRESSION-PREVENTION',
  'PHASE-B-PR-150-MERGE',
  'PHASE-B-PRODUCTION-READY',
  'CONTROL-TOWER-COLD-START-ACCEPTANCE-INITIAL',
];

const BASE_TRANSITIONS = {
  postMergeTransition: {
    prNumber: 150,
    featureBranch: 'feat/m55-pair-funnel-v1',
    featureHeadAtClosure: '0f897035ea2c42c81b65f19082cd1be472c3a27f',
    mergeCommit: 'ca7ea2a15f0538cf20ec9afd6fc9ab52395850b7',
    productionDeploymentId: 'dpl_Dhhj8a3jbsiQjzDufcg4wVnSy6A3',
    productionStateObserved: 'READY',
    productionTargetObserved: 'production',
    productionBranchObserved: 'main',
    productionShaObserved: 'ca7ea2a15f0538cf20ec9afd6fc9ab52395850b7',
    observedAt: '2026-08-22T08:10:00Z',
  },
  controlTowerHardeningTransition: {
    prNumber: 151,
    featureBranch: 'fix/m55-control-tower-cold-start-v1',
    featureHeadAtClosure: 'eff87c0e8ada3a9c26ee6b28acc75584762ab7fc',
    mergeCommit: '201c883112e9c0a85ee7689f1d23fa1ee16f570b',
    productionDeploymentId: 'dpl_DsEdULbawGZdUkx1yvAuV2VozmZ6',
    productionStateObserved: 'READY',
    productionTargetObserved: 'production',
    productionBranchObserved: 'main',
    productionShaObserved: '201c883112e9c0a85ee7689f1d23fa1ee16f570b',
    observedAt: '2026-08-22T09:21:00Z',
  },
};

function buildFixtureState(overrides = {}) {
  return {
    schemaVersion: '1.4.0',
    status: 'ACTIVE',
    semanticAuthorityOwner: EXECUTION_STATE_PATH,
    updatedAt: '2026-08-22T14:50:00Z',
    macroLane: 'PAIR LANE',
    currentExecutionGate: COLD_START_GATE,
    nextSingleAction: COLD_START_GATE,
    productWorkAfterControlTower: PAIR_MINIMAL_IMPLEMENTATION_GATE,
    pairImplementation: 'NOT_STARTED',
    pairPremium: 'NOT_ACTIVATED',
    pairFreeToPaidMappingAuthorizedNow: true,
    legacyExecutionFieldsSuperseded: true,
    legacyNarrativeStateFile: 'docs/ssot/M55_CURRENT_STATE.md',
    completedSubGates: [...BASE_COMPLETED_SUBGATES, PAIR_MAPPING_GATE],
    freshnessPolicy: {
      chatMemoryIsAuthority: false,
      newChatIsInvalidation: false,
      dynamicGitFactsMustBeReobserved: true,
      remoteOnlyGptMustDeclareLocalRuntimeUnavailable: true,
      authorityConflictMustStop: true,
      highCostRerunWithoutInvalidatingDependency: 'PROHIBITED',
    },
    acceptance: {
      requiredBeforePairMapping: 'HANDOFF_COLD_START_PASS',
      acceptanceContract: 'docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md',
      mutationDuringAcceptance: 'PROHIBITED',
      previousAcceptedResult: 'HANDOFF_COLD_START_PASS',
      previousAcceptedResultAcceptedByHuman: true,
      previousAcceptedAt: '2026-08-22T10:53:00Z',
      previousZeroMemoryOnePrompt: true,
      previousLocalRuntimeHandlingCorrect: true,
      previousMutationsObserved: 0,
      revalidationRequired: true,
      revalidationReason: 'fixture pending revalidation',
      latestResult: 'PENDING_REVALIDATION',
      latestResultAcceptedByHuman: false,
      acceptedAt: null,
      zeroMemoryOnePrompt: null,
      localRuntimeHandlingCorrect: null,
      mutationsObserved: null,
      finalAdvanceAllowedFiles: [EXECUTION_STATE_PATH],
    },
    ...BASE_TRANSITIONS,
    ...overrides,
  };
}

function expectValidationPass(label, state) {
  const { errors } = validateExecutionState(JSON.stringify(state));
  if (errors.length > 0) {
    fail(`semantic self-test ${label} expected PASS but failed: ${errors.join('; ')}`);
  }
}

function expectValidationFail(label, state, expectedSubstring) {
  const { errors } = validateExecutionState(JSON.stringify(state));
  if (errors.length === 0) {
    fail(`semantic self-test ${label} expected FAIL but passed`);
    return;
  }
  if (expectedSubstring && !errors.some((message) => message.includes(expectedSubstring))) {
    fail(`semantic self-test ${label} failed without expected message "${expectedSubstring}": ${errors.join('; ')}`);
  }
}

function runSemanticSelfTests() {
  expectValidationPass('pending mechanism revalidation', buildFixtureState());

  expectValidationPass(
    'post-revalidation normal product state',
    buildFixtureState({
      currentExecutionGate: PAIR_MINIMAL_IMPLEMENTATION_GATE,
      nextSingleAction: PAIR_MINIMAL_IMPLEMENTATION_GATE,
      acceptance: {
        ...buildFixtureState().acceptance,
        revalidationRequired: false,
        revalidationReason: 'fixture post-revalidation',
        latestResult: 'HANDOFF_COLD_START_PASS',
        latestResultAcceptedByHuman: true,
        acceptedAt: '2026-08-22T15:00:00Z',
        zeroMemoryOnePrompt: true,
        localRuntimeHandlingCorrect: true,
        mutationsObserved: 0,
      },
    }),
  );

  expectValidationPass(
    'later normal product gate without mechanism edits',
    buildFixtureState({
      currentExecutionGate: 'PAIR-UX-REVIEW-FIRST',
      nextSingleAction: 'PAIR-UX-REVIEW-FIRST',
      productWorkAfterControlTower: 'PAIR-UX-REVIEW-FIRST',
      completedSubGates: [...BASE_COMPLETED_SUBGATES, PAIR_MAPPING_GATE, PAIR_MINIMAL_IMPLEMENTATION_GATE],
      acceptance: {
        ...buildFixtureState().acceptance,
        revalidationRequired: false,
        revalidationReason: 'fixture later gate',
        latestResult: 'HANDOFF_COLD_START_PASS',
        latestResultAcceptedByHuman: true,
        acceptedAt: '2026-08-22T16:00:00Z',
        zeroMemoryOnePrompt: true,
        localRuntimeHandlingCorrect: true,
        mutationsObserved: 0,
      },
    }),
  );

  expectValidationFail(
    'CURRENT/NEXT mismatch',
    buildFixtureState({
      currentExecutionGate: COLD_START_GATE,
      nextSingleAction: PAIR_MINIMAL_IMPLEMENTATION_GATE,
    }),
    'CURRENT EXECUTION GATE and NEXT SINGLE ACTION must match',
  );

  expectValidationFail(
    'current gate already completed',
    buildFixtureState({
      currentExecutionGate: PAIR_MAPPING_GATE,
      nextSingleAction: PAIR_MAPPING_GATE,
      productWorkAfterControlTower: PAIR_MINIMAL_IMPLEMENTATION_GATE,
    }),
    'NEXT SINGLE ACTION is already completed',
  );

  expectValidationFail(
    'pending revalidation with non-cold-start CURRENT',
    buildFixtureState({
      currentExecutionGate: PAIR_MINIMAL_IMPLEMENTATION_GATE,
      nextSingleAction: PAIR_MINIMAL_IMPLEMENTATION_GATE,
    }),
    'pending handoff revalidation requires CURRENT/NEXT to be CONTROL-TOWER-COLD-START-ACCEPTANCE-RERUN',
  );

  expectValidationFail(
    'latest PASS without Human acceptance',
    buildFixtureState({
      acceptance: {
        ...buildFixtureState().acceptance,
        revalidationRequired: false,
        latestResult: 'HANDOFF_COLD_START_PASS',
        latestResultAcceptedByHuman: false,
      },
    }),
    'post-revalidation execution state requires Human acceptance',
  );

  expectValidationFail(
    'Pair Premium activation before decision gate',
    buildFixtureState({
      pairPremium: 'ACTIVATED',
    }),
    'pairPremium=ACTIVATED requires PAIR-PREMIUM-ACTIVATION-DECISION',
  );

  expectValidationFail(
    'Pair implementation COMPLETE before minimal implementation',
    buildFixtureState({
      pairImplementation: 'COMPLETE',
    }),
    'pairImplementation=COMPLETE requires PAIR-MINIMAL-IMPLEMENTATION',
  );
}

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

  if (state.pairImplementation !== 'NOT_STARTED') fail('Pair implementation must remain NOT_STARTED');
  if (state.pairPremium !== 'NOT_ACTIVATED') fail('Pair Premium must remain NOT_ACTIVATED');
  if (!state.completedSubGates?.includes(PAIR_MAPPING_GATE)) {
    fail('Pair free→paid mapping must remain durably complete in completedSubGates');
  }
  if (state.productWorkAfterControlTower !== PAIR_MINIMAL_IMPLEMENTATION_GATE) {
    fail('next product gate after revalidation must be PAIR-MINIMAL-IMPLEMENTATION');
  }

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
    COLD_START_GATE,
    'PENDING_REVALIDATION',
    'productWorkAfterControlTower',
    'mutation count is zero',
    'Regression rule',
    'Ordinary product gate progression',
    'never** an invalidating dependency',
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
  runSemanticSelfTests();
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
