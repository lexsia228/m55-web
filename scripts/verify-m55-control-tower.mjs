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

const BENCHMARK_STACK_PATH = 'docs/ssot/M55_UX_BENCHMARK_STACK.md';
const COMMERCIAL_QUALITY_PATH = 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md';

const REQUIRED_CONTROL_TOWER_FILES = [
  'AGENTS.md',
  '.cursor/rules/m55-control-tower.mdc',
  EXECUTION_STATE_PATH,
  'docs/ssot/M55_GPT_COLD_START_ACCEPTANCE.md',
  COMMERCIAL_QUALITY_PATH,
  BENCHMARK_STACK_PATH,
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

function verifyExecutionStatePolicy(state) {
  const failures = [];
  const { errors } = validateExecutionState(JSON.stringify(state));
  failures.push(...errors);
  if (!state) return failures;

  if (!state.completedSubGates?.includes(PAIR_MAPPING_GATE)) {
    failures.push('Pair free→paid mapping must remain durably complete in completedSubGates');
  }

  return failures;
}

function verifyExecutionStateSource(src) {
  const failures = [];
  const { state, errors } = validateExecutionState(src);
  failures.push(...errors);
  if (!state) return failures;
  failures.push(...verifyExecutionStatePolicy(state));
  return failures;
}

function expectSourceVerificationFail(label, src, expectedSubstring) {
  const failures = verifyExecutionStateSource(src);
  if (failures.length === 0) {
    fail(`source self-test ${label} expected FAIL but passed`);
    return;
  }
  if (expectedSubstring && !failures.some((message) => message.includes(expectedSubstring))) {
    fail(`source self-test ${label} failed without expected message "${expectedSubstring}": ${failures.join('; ')}`);
  }
}

function expectValidationPass(label, state) {
  const { errors } = validateExecutionState(JSON.stringify(state));
  if (errors.length > 0) {
    fail(`semantic self-test ${label} expected PASS but failed: ${errors.join('; ')}`);
  }
}

function expectPolicyPass(label, state) {
  const failures = verifyExecutionStatePolicy(state);
  if (failures.length > 0) {
    fail(`policy self-test ${label} expected PASS but failed: ${failures.join('; ')}`);
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

  expectPolicyPass(
    'later normal product gate without mechanism edits',
    buildFixtureState({
      currentExecutionGate: 'PAIR-UX-REVIEW-FIRST',
      nextSingleAction: 'PAIR-UX-REVIEW-FIRST',
      productWorkAfterControlTower: 'PAIR-UX-REVIEW-FIRST',
      pairImplementation: 'COMPLETE',
      pairPremium: 'DEFERRED',
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

  expectSourceVerificationFail(
    'malformed JSON source',
    '{not json',
    'invalid M55_EXECUTION_STATE.json',
  );

  expectSourceVerificationFail(
    'null JSON source',
    'null',
    'must contain a JSON object execution state',
  );

  expectSourceVerificationFail(
    'array JSON source',
    '[]',
    'must contain a JSON object execution state',
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
  for (const message of verifyExecutionStatePolicy(state)) fail(message);

  const legacy = detectLegacyExecutionDrift(state, current);
  if (legacy.drift && state.legacyExecutionFieldsSuperseded !== true) {
    fail(`legacy execution drift is ungoverned: ${legacy.reason}`);
  }
}
const FOOTER_ROUTE_PATHS = [
  '/support',
  '/legal/refund',
  '/legal/terms',
  '/legal/privacy',
  '/legal/tokushoho',
];

const SHARED_CHROME_SOURCE = {
  publicShell: 'app/_components/PublicShell.tsx',
  publicHeaderContainer: 'components/shell/PublicHeaderContainer.tsx',
  publicHeader: 'components/shell/PublicHeader.tsx',
  publicFooter: 'app/_components/PublicFooter.tsx',
};

function collectSharedChromeSourceFailures(shellSrc, headerContainerSrc, footerSrc) {
  const failures = [];
  const requireIn = (label, src, token) => {
    if (!src.includes(token)) failures.push(`shared chrome source ${label} missing: ${token}`);
  };

  requireIn('PublicShell', shellSrc, 'PublicHeaderContainer');
  requireIn('PublicShell', shellSrc, 'PublicFooter');
  requireIn('PublicShell', shellSrc, '<PublicHeaderContainer');
  requireIn('PublicShell', shellSrc, '<PublicFooter');

  requireIn('PublicHeaderContainer', headerContainerSrc, 'PublicHeader');
  requireIn('PublicHeaderContainer', headerContainerSrc, '<PublicHeader');

  for (const route of FOOTER_ROUTE_PATHS) {
    if (!footerSrc.includes(route)) {
      failures.push(`PublicFooter source missing route: ${route}`);
    }
  }

  return failures;
}

function checkSharedChromeSourceTruth() {
  for (const rel of SHARED_CHROME_OWNER_PATHS) {
    if (!exists(rel)) fail(`missing shared chrome source file: ${rel}`);
  }

  const shellSrc = read(SHARED_CHROME_SOURCE.publicShell);
  const headerContainerSrc = read(SHARED_CHROME_SOURCE.publicHeaderContainer);
  const footerSrc = read(SHARED_CHROME_SOURCE.publicFooter);
  const benchmarkSrc = read(BENCHMARK_STACK_PATH);

  for (const message of collectSharedChromeSourceFailures(shellSrc, headerContainerSrc, footerSrc)) {
    fail(message);
  }

  for (const route of FOOTER_ROUTE_PATHS) {
    if (!benchmarkSrc.includes(route)) {
      fail(`benchmark SSOT missing footer route for source cross-check: ${route}`);
    }
  }
}

function runSharedChromeSourceNegativeSelfTests() {
  const shellSrc = read(SHARED_CHROME_SOURCE.publicShell);
  const headerContainerSrc = read(SHARED_CHROME_SOURCE.publicHeaderContainer);
  const footerSrc = read(SHARED_CHROME_SOURCE.publicFooter);

  const cases = [
    {
      label: 'removed PublicHeaderContainer from PublicShell',
      shell: shellSrc.replace(/PublicHeaderContainer/g, 'RemovedHeaderContainer'),
      headerContainer: headerContainerSrc,
      footer: footerSrc,
    },
    {
      label: 'removed PublicFooter from PublicShell',
      shell: shellSrc.replace(/PublicFooter/g, 'RemovedFooter'),
      headerContainer: headerContainerSrc,
      footer: footerSrc,
    },
    {
      label: 'removed PublicHeader from PublicHeaderContainer',
      shell: shellSrc,
      headerContainer: headerContainerSrc.replace(/PublicHeader/g, 'RemovedHeader'),
      footer: footerSrc,
    },
    {
      label: 'removed /legal/privacy from PublicFooter',
      shell: shellSrc,
      headerContainer: headerContainerSrc,
      footer: footerSrc.replace('/legal/privacy', ''),
    },
    {
      label: 'removed /legal/tokushoho from PublicFooter',
      shell: shellSrc,
      headerContainer: headerContainerSrc,
      footer: footerSrc.replace('/legal/tokushoho', ''),
    },
  ];

  for (const testCase of cases) {
    if (
      collectSharedChromeSourceFailures(
        testCase.shell,
        testCase.headerContainer,
        testCase.footer,
      ).length === 0
    ) {
      fail(`shared chrome source self-test ${testCase.label} expected FAIL but passed`);
    }
  }
}

const BENCHMARK_HEADINGS = [
  '### with',
  '### The Pattern',
  '### Paired',
  '### Co–Star',
  '### Stripe',
  '### Baymard',
];

const SURFACE_MAPPING_ROWS = [
  '| HOME | with + Co–Star | — |',
  '| Free input / questionnaire | with | — |',
  '| Free result | The Pattern + with | — |',
  '| Pair free result | The Pattern + Paired | — |',
  '| Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |',
  '| Paid report / premium reading body | The Pattern + Paired | — |',
  '| My Page / owned report / revisit | Paired + with | — |',
];

const SHARED_CHROME_OWNER_PATHS = [
  'app/_components/PublicShell.tsx',
  'components/shell/PublicHeaderContainer.tsx',
  'components/shell/PublicHeader.tsx',
  'app/_components/PublicFooter.tsx',
];

const FOOTER_DESTINATION_LINES = [
  'Support (`/support`)',
  'Refund (`/legal/refund`)',
  'Terms (`/legal/terms`)',
  'Privacy Policy (`/legal/privacy`)',
  'Specified Commercial Transactions Act disclosure (`/legal/tokushoho`)',
];

const RESELECTION_INVALIDATORS = [
  'Human changes primary UX target',
  'reference service ends or materially changes',
  'M55 product architecture materially changes',
  'observed Production data materially rejects the current pattern',
  'legal / accessibility / privacy conflict',
  'Human explicitly authorizes benchmark reselection',
];

const RESELECTION_NON_INVALIDATORS = [
  'A new AI found another attractive site',
  'A new chat started',
];

const DUPLICATION_RULE_TOKENS = [
  'the agent **must** inspect the shared owners above',
  'If a site-wide destination already exists: **do not duplicate it locally**',
  'If the requested improvement is site-wide: modify the shared owner instead of making another page-local copy',
  'A page-local legal / support element is allowed only when',
  'a product / legal contract explicitly requires proximity at that step',
  'the shared footer is insufficient',
  'the reason must be stated before mutation',
  'Otherwise: **STOP / ROUTE CHANGE TO SHARED OWNER**',
];

function collectBenchmarkStackFailures(src) {
  const failures = [];
  const requireToken = (token) => {
    if (!src.includes(token)) failures.push(`benchmark stack SSOT missing: ${token}`);
  };

  requireToken('M55 UX Benchmark Stack');
  requireToken('Ad-hoc competitor research is **prohibited**');

  for (const heading of BENCHMARK_HEADINGS) requireToken(heading);
  for (const row of SURFACE_MAPPING_ROWS) requireToken(row);
  for (const ownerPath of SHARED_CHROME_OWNER_PATHS) requireToken(ownerPath);
  for (const destination of FOOTER_DESTINATION_LINES) requireToken(destination);
  for (const token of DUPLICATION_RULE_TOKENS) requireToken(token);
  for (const invalidator of RESELECTION_INVALIDATORS) requireToken(invalidator);
  for (const nonInvalidator of RESELECTION_NON_INVALIDATORS) requireToken(nonInvalidator);

  return failures;
}

function runBenchmarkStackNegativeSelfTests() {
  const src = read(BENCHMARK_STACK_PATH);

  const cases = [
    {
      label: 'HOME mapping permutation',
      mutated: src.replace('| HOME | with + Co–Star | — |', '| HOME | Paired | — |'),
    },
    {
      label: 'removed PublicFooter privacy route',
      mutated: src.replace('- Privacy Policy (`/legal/privacy`)\n', ''),
    },
    {
      label: 'removed PublicHeaderContainer owner',
      mutated: src.replace('components/shell/PublicHeaderContainer.tsx', ''),
    },
    {
      label: 'removed reselection invalidator',
      mutated: src.replace('- Human changes primary UX target\n', ''),
    },
    {
      label: 'removed Paired benchmark heading',
      mutated: src.replace('### Paired\n', ''),
    },
  ];

  for (const testCase of cases) {
    if (collectBenchmarkStackFailures(testCase.mutated).length === 0) {
      fail(`benchmark stack self-test ${testCase.label} expected FAIL but passed`);
    }
  }
}
function checkAgents() {
  const src = read('AGENTS.md');
  if (!src.includes(EXECUTION_STATE_PATH)) fail('AGENTS.md missing M55_EXECUTION_STATE.json');
  if (!src.includes('sole executable authority')) fail('AGENTS.md must declare sole executable authority');
  if (!src.includes('M55_GPT_COLD_START_ACCEPTANCE.md')) fail('AGENTS.md missing GPT cold-start acceptance contract');
  if (!src.includes(BENCHMARK_STACK_PATH)) fail('AGENTS.md missing M55_UX_BENCHMARK_STACK.md');
  for (const owner of ['PublicShell', 'PublicHeaderContainer', 'PublicHeader', 'PublicFooter']) {
    if (!src.includes(owner)) fail(`AGENTS.md missing ${owner} shared chrome rule`);
  }
  if (!src.includes('LOCAL_RUNTIME_UNAVAILABLE')) fail('AGENTS.md missing remote-only GPT fallback');
  if (!src.includes('RERUN_PROHIBITED')) fail('AGENTS.md missing RERUN_PROHIBITED');
  if (!src.includes('npm run m55:context')) fail('AGENTS.md missing m55:context');
}
function checkCursorRule() {
  const src = read('.cursor/rules/m55-control-tower.mdc');
  if (!/alwaysApply:\s*true/.test(src)) fail('Cursor rule must be alwaysApply');
  if (!src.includes(EXECUTION_STATE_PATH)) fail('Cursor rule missing execution state owner');
  if (!src.includes(BENCHMARK_STACK_PATH)) fail('Cursor rule missing M55_UX_BENCHMARK_STACK.md');
  for (const owner of ['PublicShell', 'PublicHeaderContainer', 'PublicHeader', 'PublicFooter']) {
    if (!src.includes(owner)) fail(`Cursor rule missing ${owner} reference`);
  }
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
    BENCHMARK_STACK_PATH,
    'M55_COMMERCIAL_QUALITY_CONTRACT.md',
    'fixed commercial UX benchmark stack',
    'frozen surface mapping',
    'valid reselection invalidators',
    'PublicShell',
    'PublicHeaderContainer',
    'PublicHeader',
    'PublicFooter',
    'site-wide footer legal/support ownership',
    'duplicate page-local legal/support/header/footer',
    'cross-site chrome changes belong in the shared owner',
    'cross-checks `M55_UX_BENCHMARK_STACK.md` shared chrome inventory against actual',
    'STOPs on disagreement between SSOT inventory and live source truth',
    'must **not** return `HANDOFF_COLD_START_PASS`',
    'Cross-check shared chrome inventory against actual shell/header/footer source owners',
    'no expected gate token or benchmark name list in the prompt',
  ]) {
    if (!src.includes(required)) fail(`cold-start contract missing: ${required}`);
  }
}
function checkCommercialQualityContract() {
  const src = read(COMMERCIAL_QUALITY_PATH);
  if (!src.includes(BENCHMARK_STACK_PATH)) {
    fail('commercial quality contract missing M55_UX_BENCHMARK_STACK.md reference');
  }
  for (const owner of ['PublicShell', 'PublicHeaderContainer', 'PublicHeader', 'PublicFooter']) {
    if (!src.includes(owner)) {
      fail(`commercial quality contract missing ${owner} shared chrome rule`);
    }
  }
  if (!src.includes('ad-hoc benchmark reselection')) {
    fail('commercial quality contract missing ad-hoc benchmark reselection prohibition');
  }
}
function checkBenchmarkStack() {
  const src = read(BENCHMARK_STACK_PATH);
  for (const message of collectBenchmarkStackFailures(src)) fail(message);
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
  checkCommercialQualityContract();
  checkBenchmarkStack();
  runBenchmarkStackNegativeSelfTests();
  checkSharedChromeSourceTruth();
  runSharedChromeSourceNegativeSelfTests();
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
