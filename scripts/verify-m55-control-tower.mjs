#!/usr/bin/env node
/**
 * M55 Control Tower verifier — static fail-closed authority checks.
 * Network-free: it validates durable handoff semantics; fresh GitHub/Vercel
 * identity must still be reobserved by the caller when required.
 */

import { spawnSync } from 'node:child_process';
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
import { git, parsePorcelainDirtyPaths } from './m55-control-tower-context.mjs';

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
  'scripts/m55-control-tower-handoff.mjs',
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

function checkMandatoryAuditGateWiring() {
  const controlTowerSource = read('scripts/verify-m55-control-tower.mjs');
  const auditGateSource = read('scripts/audit_gate.mjs');
  if (!/function runMandatoryAuditGate\(/.test(controlTowerSource)) {
    fail('verify-m55-control-tower must define runMandatoryAuditGate');
  }
  if (!/scripts\/audit_gate\.mjs/.test(controlTowerSource)) {
    fail('verify-m55-control-tower must invoke scripts/audit_gate.mjs');
  }
  if (/verify-m55-control-tower|verify:m55-control-tower/.test(auditGateSource)) {
    fail('CONTROL_TOWER_AUDIT_RECURSION_DETECTED: audit_gate must not invoke verify-m55-control-tower');
  }
}

function runMandatoryAuditGate() {
  console.log('verify:m55-control-tower:audit_gate:START');
  const result = spawnSync(process.execPath, ['scripts/audit_gate.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    fail(`mandatory audit_gate failed with exit code ${result.status ?? 'unknown'}`);
    return;
  }
  console.log('verify:m55-control-tower:audit_gate:PASS');
}

function runSemanticSelfTests() {
  checkMandatoryAuditGateWiring();
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
  if (!/"m55:handoff"\s*:\s*"node scripts\/m55-control-tower-handoff\.mjs"/.test(pkg)) {
    fail('package.json missing m55:handoff script');
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
const HEADER_STATE_PATH = 'lib/m55/commercialUx/publicHeaderState.ts';
const METHOD_AUTHORITY_PATH = 'lib/m55/method/m55MethodAuthority.ts';
const EXPERIENCE_ARCHETYPES_PATH = 'lib/m55/commercialUx/experience/experienceArchetypes.ts';

const COMPATIBILITY_GUEST_PATH = 'components/compatibility/CompatibilityGuestExperience.tsx';
const EXPERIENCE_ROUTE_REGISTRY_PATH =
  'lib/m55/commercialUx/experience/experienceRouteRegistry.ts';

const SYNASTRY_ROUTE_REGISTRY_IDS = [
  'legacy.synastry',
  'legacy.synastry.confirm',
  'legacy.synastry.success',
  'legacy.synastry.report',
];

const SYNASTRY_ROUTE_REGISTRY_PATTERNS = [
  '/synastry',
  '/synastry/purchase/confirm',
  '/synastry/purchase/success',
  '/synastry/report/:reportId',
];

const SYNASTRY_COMPOSITE_BINDING_TOKENS = [
  '### Known composite route/state bindings',
  'state or section inside a single route',
  '/synastry',
  'phase=dob',
  'phase=questions',
  'phase=result',
  'free reading body',
  'embedded paid bridge',
  '/synastry/purchase/confirm',
  '/synastry/purchase/success',
  '/synastry/report/:reportId',
  'State/section explicit mapping',
  'route-level `PRODUCT_DECISION` archetype fallback',
  'PRODUCT_DECISION = Paired + Co–Star',
  COMPATIBILITY_GUEST_PATH,
  EXPERIENCE_ROUTE_REGISTRY_PATH,
  "'dob' | 'questions' | 'result'",
  'legacy.synastry',
  'legacy.synastry.confirm',
  'legacy.synastry.success',
  'legacy.synastry.report',
];

const HEADER_NAV_GROUP_NAMES = [
  'DESKTOP_PRIMARY_NAV',
  'ABOUT_DROPDOWN_NAV',
  'MOBILE_MENU_PUBLIC',
  'ACCOUNT_DROPDOWN_NAV',
];

const CANONICAL_BENCHMARK_URLS = [
  'https://with.is/',
  'https://www.thepattern.com/',
  'https://www.paired.com/',
  'https://www.costarastrology.com/',
  'https://stripe.com/',
  'https://baymard.com/',
];

const SHARED_CHROME_SOURCE = {
  publicShell: 'app/_components/PublicShell.tsx',
  publicHeaderContainer: 'components/shell/PublicHeaderContainer.tsx',
  publicHeader: 'components/shell/PublicHeader.tsx',
  publicFooter: 'app/_components/PublicFooter.tsx',
  publicHeaderState: HEADER_STATE_PATH,
  methodAuthority: METHOD_AUTHORITY_PATH,
  experienceArchetypes: EXPERIENCE_ARCHETYPES_PATH,
};

function hasDuplicateValues(values) {
  return new Set(values).size !== values.length;
}

function routesExactlyEqual(left, right) {
  return left.length === right.length && left.every((route, index) => route === right[index]);
}

function extractSourceNavGroupBlock(src, groupName) {
  const marker = `export const ${groupName}`;
  const start = src.indexOf(marker);
  if (start === -1) return '';
  const end = src.indexOf('];', start);
  if (end === -1) return '';
  return src.slice(start, end + 2);
}

function extractSourceNavRoutes(headerStateSrc, groupName) {
  const block = extractSourceNavGroupBlock(headerStateSrc, groupName);
  if (!block) return null;
  return [...block.matchAll(/href:\s*'([^']+)'/g)].map((match) => match[1]);
}

function extractBenchmarkNavGroupBlock(src, groupName) {
  const label =
    groupName === 'DESKTOP_PRIMARY_NAV'
      ? 'Desktop primary'
      : groupName === 'ABOUT_DROPDOWN_NAV'
        ? 'About dropdown'
        : groupName === 'MOBILE_MENU_PUBLIC'
          ? 'Mobile public'
          : 'Signed-in account';
  const marker = `**${label} (\`${groupName}\`):**`;
  const start = src.indexOf(marker);
  if (start === -1) return '';
  const nextHeading = src.indexOf('**', start + marker.length);
  const end = nextHeading === -1 ? src.length : nextHeading;
  return src.slice(start, end);
}

function extractBenchmarkNavRoutes(benchmarkSrc, groupName) {
  const block = extractBenchmarkNavGroupBlock(benchmarkSrc, groupName);
  if (!block) return null;
  return [...block.matchAll(/^- `(\/[^`]+)`/gm)].map((match) => match[1]);
}

function extractFooterGroupRoutes(footerSrc, groupName) {
  const marker = `const ${groupName}`;
  const start = footerSrc.indexOf(marker);
  if (start === -1) return null;
  const end = footerSrc.indexOf('] as const;', start);
  if (end === -1) return null;
  const block = footerSrc.slice(start, end);
  return [...block.matchAll(/href:\s*'([^']+)'/g)].map((match) => match[1]);
}

function extractBenchmarkSupportLegalRoutes(benchmarkSrc) {
  const marker = '**SUPPORT / LEGAL (`SUPPORT_LEGAL_GROUP`) — site-wide navigation routes:**';
  const start = benchmarkSrc.indexOf(marker);
  if (start === -1) return null;
  const end = benchmarkSrc.indexOf('**Canonical content owners', start);
  const block = end === -1 ? benchmarkSrc.slice(start) : benchmarkSrc.slice(start, end);
  return [...block.matchAll(/^- `(\/[^`]+)`/gm)].map((match) => match[1]);
}

function extractSourceContextualActionPairs(headerStateSrc) {
  const marker = 'export type ContextualPrimaryAction =';
  const start = headerStateSrc.indexOf(marker);
  if (start === -1) return null;
  const end = headerStateSrc.indexOf('export type PublicHeaderNavItem', start);
  const block = end === -1 ? headerStateSrc.slice(start) : headerStateSrc.slice(start, end);
  return [...block.matchAll(/kind:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'/g)].map((match) => ({
    kind: match[1],
    href: match[2],
  }));
}

function extractBenchmarkContextualActionPairs(benchmarkSrc) {
  const marker = '**Contextual primary-action contract**';
  const start = benchmarkSrc.indexOf(marker);
  if (start === -1) return null;
  const end = benchmarkSrc.indexOf('**Header auth capability:**', start);
  const block = end === -1 ? benchmarkSrc.slice(start) : benchmarkSrc.slice(start, end);
  return [...block.matchAll(/\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/g)]
    .map((match) => ({ kind: match[1], href: match[2] }))
    .filter((pair) => pair.kind !== 'Destination class');
}

function contextualActionPairsEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((pair, index) => pair.kind === right[index].kind && pair.href === right[index].href)
  );
}

function collectContextualActionExactEqualityFailures(headerStateSrc, benchmarkSrc) {
  const failures = [];
  const sourcePairs = extractSourceContextualActionPairs(headerStateSrc);
  const benchmarkPairs = extractBenchmarkContextualActionPairs(benchmarkSrc);

  if (!sourcePairs || sourcePairs.length === 0) {
    failures.push('publicHeaderState source missing ContextualPrimaryAction contract pairs');
    return failures;
  }
  if (!benchmarkPairs || benchmarkPairs.length === 0) {
    failures.push('benchmark SSOT missing contextual primary-action table');
    return failures;
  }

  const sourceKinds = sourcePairs.map((pair) => pair.kind);
  const benchmarkKinds = benchmarkPairs.map((pair) => pair.kind);
  if (hasDuplicateValues(sourceKinds)) {
    failures.push('publicHeaderState source duplicate contextual action kind');
  }
  if (hasDuplicateValues(benchmarkKinds)) {
    failures.push('benchmark SSOT duplicate contextual action kind');
  }
  if (!contextualActionPairsEqual(sourcePairs, benchmarkPairs)) {
    failures.push(
      `contextual primary-action mismatch: source=${JSON.stringify(sourcePairs)} ssot=${JSON.stringify(benchmarkPairs)}`,
    );
  }

  return failures;
}

const CANONICAL_LEGAL_SUPPORT_CONTENT_OWNERS = {
  '/support': 'app/support/page.tsx',
  '/legal/refund': 'app/legal/refund/page.tsx',
  '/legal/terms': 'app/legal/terms/page.tsx',
  '/legal/privacy': 'app/legal/privacy/page.tsx',
  '/legal/tokushoho': 'app/legal/tokushoho/page.tsx',
};

const FOOTER_COPYRIGHT_PATTERN = /©\s*\d{4}\s+M55/;

function extractBenchmarkLegalSupportContentOwners(benchmarkSrc) {
  const marker = '**Canonical content owners (route → page owner):**';
  const start = benchmarkSrc.indexOf(marker);
  if (start === -1) return null;
  const end = benchmarkSrc.indexOf('**Navigation vs content rule:**', start);
  const block = end === -1 ? benchmarkSrc.slice(start) : benchmarkSrc.slice(start, end);
  const owners = {};
  for (const match of block.matchAll(/\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/g)) {
    const route = match[1];
    const owner = match[2];
    if (route === 'Route') continue;
    owners[route] = owner;
  }
  return owners;
}

function collectLegalSupportContentOwnerFailures(benchmarkSrc) {
  const failures = [];
  const benchmarkOwners = extractBenchmarkLegalSupportContentOwners(benchmarkSrc);

  if (!benchmarkOwners) {
    failures.push('benchmark SSOT missing canonical support/legal content-owner table');
    return failures;
  }

  for (const [route, owner] of Object.entries(CANONICAL_LEGAL_SUPPORT_CONTENT_OWNERS)) {
    if (!exists(owner)) {
      failures.push(`missing canonical support/legal content owner file: ${owner}`);
    }
    if (!(route in benchmarkOwners)) {
      failures.push(`benchmark SSOT missing canonical content owner mapping for ${route}`);
      continue;
    }
    if (benchmarkOwners[route] !== owner) {
      failures.push(
        `benchmark SSOT canonical content owner mismatch for ${route}: ssot=${benchmarkOwners[route]} expected=${owner}`,
      );
    }
  }

  for (const route of Object.keys(benchmarkOwners)) {
    if (!(route in CANONICAL_LEGAL_SUPPORT_CONTENT_OWNERS)) {
      failures.push(`benchmark SSOT unexpected canonical content owner route: ${route}`);
    }
  }

  return failures;
}

function extractSourceArchetypes(experienceSrc) {
  const match = experienceSrc.match(
    /export const M55_EXPERIENCE_ARCHETYPES = \[([\s\S]*?)\] as const;/,
  );
  if (!match) return null;
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function extractBenchmarkArchetypes(benchmarkSrc) {
  const marker = '## Experience Archetype benchmark fallback mapping';
  const start = benchmarkSrc.indexOf(marker);
  if (start === -1) return null;
  const end = benchmarkSrc.indexOf('## Research / reselection freeze', start);
  const section = end === -1 ? benchmarkSrc.slice(start) : benchmarkSrc.slice(start, end);
  const tableStart = section.indexOf('| Archetype |');
  if (tableStart === -1) return null;
  const table = section.slice(tableStart);
  const rows = [...table.matchAll(/^\| ([A-Z_]+) \|/gm)].map((match) => match[1]);
  return rows.filter((id) => id !== 'Archetype');
}

function collectHeaderNavExactEqualityFailures(headerStateSrc, benchmarkSrc) {
  const failures = [];

  if (!benchmarkSrc.includes(HEADER_STATE_PATH)) {
    failures.push(`benchmark SSOT missing header state owner: ${HEADER_STATE_PATH}`);
  }

  for (const groupName of HEADER_NAV_GROUP_NAMES) {
    const sourceRoutes = extractSourceNavRoutes(headerStateSrc, groupName);
    const benchmarkRoutes = extractBenchmarkNavRoutes(benchmarkSrc, groupName);

    if (!sourceRoutes) {
      failures.push(`publicHeaderState source missing nav group: ${groupName}`);
      continue;
    }
    if (!benchmarkRoutes) {
      failures.push(`benchmark SSOT missing header nav group: ${groupName}`);
      continue;
    }
    if (hasDuplicateValues(sourceRoutes)) {
      failures.push(`publicHeaderState source duplicate route in ${groupName}`);
    }
    if (hasDuplicateValues(benchmarkRoutes)) {
      failures.push(`benchmark SSOT duplicate route in ${groupName}`);
    }
    if (!routesExactlyEqual(sourceRoutes, benchmarkRoutes)) {
      failures.push(
        `header nav inventory mismatch for ${groupName}: source=[${sourceRoutes.join(', ')}] ssot=[${benchmarkRoutes.join(', ')}]`,
      );
    }
  }

  return failures;
}

function collectPublicHeaderRendererFailures(headerSrc) {
  const failures = [];
  const requireIn = (token) => {
    if (!headerSrc.includes(token)) failures.push(`PublicHeader source missing render evidence: ${token}`);
  };

  requireIn('desktopPrimaryNav.map((item)');
  requireIn('items={aboutDropdownNav}');
  requireIn('mobileMenuPublic.map((item');
  requireIn('href="/home"');
  requireIn('href={contextualPrimaryAction.href}');
  requireIn('{contextualPrimaryAction.label}');
  requireIn('data-testid="m55-mobile-nav-contextual"');

  const desktopStart = headerSrc.indexOf('data-testid="m55-desktop-auth"');
  const desktopEnd = headerSrc.indexOf('className={styles.menuTrigger}', desktopStart);
  const desktopBlock =
    desktopStart === -1 || desktopEnd === -1 ? '' : headerSrc.slice(desktopStart, desktopEnd);

  if (!desktopBlock.includes('<SignedOut>')) {
    failures.push('PublicHeader desktop auth missing SignedOut block');
  }
  if (!desktopBlock.includes('<SignInButton')) {
    failures.push('PublicHeader desktop auth missing SignInButton');
  }
  if (!desktopBlock.includes('<SignedIn>')) {
    failures.push('PublicHeader desktop auth missing SignedIn block');
  }
  if (!desktopBlock.includes('items={ACCOUNT_DROPDOWN_NAV}')) {
    failures.push('PublicHeader desktop auth missing ACCOUNT_DROPDOWN_NAV dropdown');
  }
  if (!desktopBlock.includes('<UserButton')) {
    failures.push('PublicHeader desktop auth missing UserButton');
  }

  const mobileMenuNavStart = headerSrc.indexOf('className={styles.mobileMenuNav}');
  const mobileMenuNavEnd = headerSrc.indexOf('</nav>', mobileMenuNavStart);
  const mobileMenuNavBlock =
    mobileMenuNavStart === -1 || mobileMenuNavEnd === -1
      ? ''
      : headerSrc.slice(mobileMenuNavStart, mobileMenuNavEnd);

  if (!mobileMenuNavBlock.includes('ACCOUNT_DROPDOWN_NAV.map((item)')) {
    failures.push('PublicHeader mobile signed-in missing ACCOUNT_DROPDOWN_NAV.map render');
  }

  const mobileAuthStart = headerSrc.indexOf('styles.mobileMenuAuth');
  const mobileAuthEnd = headerSrc.indexOf('</nav>', mobileAuthStart);
  const mobileAuthBlock =
    mobileAuthStart === -1 || mobileAuthEnd === -1
      ? ''
      : headerSrc.slice(mobileAuthStart, mobileAuthEnd);

  if (!mobileAuthBlock.includes('<SignedOut>')) {
    failures.push('PublicHeader mobile auth missing SignedOut block');
  }
  if (!mobileAuthBlock.includes('<SignInButton')) {
    failures.push('PublicHeader mobile auth missing SignInButton');
  }
  if (!mobileAuthBlock.includes('<SignedIn>')) {
    failures.push('PublicHeader mobile auth missing SignedIn block');
  }
  if (!mobileAuthBlock.includes('<UserButton')) {
    failures.push('PublicHeader mobile auth missing UserButton');
  }

  return failures;
}

function collectFooterExactEqualityFailures(footerSrc, methodAuthoritySrc, benchmarkSrc) {
  const failures = [];

  if (!footerSrc.includes('M55_METHOD_CANONICAL_ROUTE')) {
    failures.push('PublicFooter source missing M55_METHOD_CANONICAL_ROUTE import/use');
  }
  if (!footerSrc.includes('m55MethodAuthority')) {
    failures.push(`PublicFooter source missing method authority import: ${METHOD_AUTHORITY_PATH}`);
  }
  if (!footerSrc.includes('UTILITY_GROUP')) {
    failures.push('PublicFooter source missing UTILITY_GROUP');
  }
  if (!footerSrc.includes('SUPPORT_LEGAL_GROUP')) {
    failures.push('PublicFooter source missing SUPPORT_LEGAL_GROUP');
  }
  if (!footerSrc.includes('{UTILITY_GROUP.map((item)')) {
    failures.push('PublicFooter source missing UTILITY_GROUP.map render');
  }
  if (!footerSrc.includes('{SUPPORT_LEGAL_GROUP.map((item)')) {
    failures.push('PublicFooter source missing SUPPORT_LEGAL_GROUP.map render');
  }

  const methodRouteMatch = methodAuthoritySrc.match(
    /export const M55_METHOD_CANONICAL_ROUTE = '([^']+)'/,
  );
  const methodRoute = methodRouteMatch?.[1];
  if (!methodRoute) {
    failures.push('m55MethodAuthority source missing M55_METHOD_CANONICAL_ROUTE');
  } else if (methodRoute !== '/how-m55-works') {
    failures.push(`m55MethodAuthority canonical route mismatch: ${methodRoute}`);
  }

  const utilityRoutes = extractFooterGroupRoutes(footerSrc, 'UTILITY_GROUP');
  const supportLegalRoutes = extractFooterGroupRoutes(footerSrc, 'SUPPORT_LEGAL_GROUP');
  const benchmarkSupportLegalRoutes = extractBenchmarkSupportLegalRoutes(benchmarkSrc);

  const utilityBlockStart = footerSrc.indexOf('const UTILITY_GROUP');
  const utilityBlockEnd = footerSrc.indexOf('] as const;', utilityBlockStart);
  const utilityBlock =
    utilityBlockStart === -1 || utilityBlockEnd === -1
      ? ''
      : footerSrc.slice(utilityBlockStart, utilityBlockEnd);

  if (!utilityBlock.includes('UTILITY_GROUP')) {
    failures.push('PublicFooter source missing UTILITY_GROUP');
  } else if (!utilityBlock.includes('M55_METHOD_CANONICAL_ROUTE')) {
    failures.push('PublicFooter UTILITY_GROUP missing M55_METHOD_CANONICAL_ROUTE authority');
  } else if (
    utilityRoutes &&
    utilityRoutes.length > 0 &&
    methodRoute &&
    !routesExactlyEqual(utilityRoutes, [methodRoute])
  ) {
    failures.push(
      `footer utility route mismatch: source=[${utilityRoutes.join(', ')}] authority=[${methodRoute}]`,
    );
  }

  if (!supportLegalRoutes) {
    failures.push('PublicFooter source missing SUPPORT_LEGAL_GROUP route inventory');
  } else if (!benchmarkSupportLegalRoutes) {
    failures.push('benchmark SSOT missing SUPPORT / LEGAL route inventory');
  } else {
    if (hasDuplicateValues(supportLegalRoutes)) {
      failures.push('PublicFooter SUPPORT_LEGAL_GROUP contains duplicate routes');
    }
    if (hasDuplicateValues(benchmarkSupportLegalRoutes)) {
      failures.push('benchmark SSOT SUPPORT / LEGAL contains duplicate routes');
    }
    if (!routesExactlyEqual(supportLegalRoutes, benchmarkSupportLegalRoutes)) {
      failures.push(
        `footer support/legal inventory mismatch: source=[${supportLegalRoutes.join(', ')}] ssot=[${benchmarkSupportLegalRoutes.join(', ')}]`,
      );
    }
  }

  if (!FOOTER_COPYRIGHT_PATTERN.test(footerSrc)) {
    failures.push('PublicFooter source missing copyright line (© + year + M55)');
  }

  failures.push(...collectLegalSupportContentOwnerFailures(benchmarkSrc));

  return failures;
}

function collectArchetypeExactEqualityFailures(experienceSrc, benchmarkSrc) {
  const failures = [];
  const sourceArchetypes = extractSourceArchetypes(experienceSrc);
  const benchmarkArchetypes = extractBenchmarkArchetypes(benchmarkSrc);

  if (!sourceArchetypes) {
    failures.push('experienceArchetypes source missing M55_EXPERIENCE_ARCHETYPES');
    return failures;
  }
  if (!benchmarkArchetypes) {
    failures.push('benchmark SSOT missing Experience Archetype fallback mapping table');
    return failures;
  }

  if (hasDuplicateValues(sourceArchetypes)) {
    failures.push('experienceArchetypes source contains duplicate archetype IDs');
  }
  if (hasDuplicateValues(benchmarkArchetypes)) {
    failures.push('benchmark SSOT contains duplicate archetype IDs');
  }

  const sourceSet = new Set(sourceArchetypes);
  const benchmarkSet = new Set(benchmarkArchetypes);

  for (const archetype of sourceArchetypes) {
    if (!benchmarkSet.has(archetype)) {
      failures.push(`benchmark SSOT missing archetype mapping: ${archetype}`);
    }
  }
  for (const archetype of benchmarkArchetypes) {
    if (!sourceSet.has(archetype)) {
      failures.push(`benchmark SSOT unexpected archetype mapping: ${archetype}`);
    }
  }

  return failures;
}

function collectSynastryCompositeBindingFailures(benchmarkSrc, compatibilitySrc, registrySrc) {
  const failures = [];
  const requireToken = (token) => {
    if (!benchmarkSrc.includes(token)) {
      failures.push(`benchmark SSOT missing synastry composite binding: ${token}`);
    }
  };

  for (const token of SYNASTRY_COMPOSITE_BINDING_TOKENS) {
    requireToken(token);
  }

  if (!compatibilitySrc.includes("type JourneyPhase = 'dob' | 'questions' | 'result'")) {
    failures.push('CompatibilityGuestExperience missing JourneyPhase dob|questions|result contract');
  }
  for (const phase of ['dob', 'questions', 'result']) {
    if (!compatibilitySrc.includes(`phase === '${phase}'`)) {
      failures.push(`CompatibilityGuestExperience missing phase render gate: ${phase}`);
    }
  }

  for (const routeId of SYNASTRY_ROUTE_REGISTRY_IDS) {
    if (!registrySrc.includes(`id: '${routeId}'`)) {
      failures.push(`experienceRouteRegistry missing route id: ${routeId}`);
    }
  }
  for (const pattern of SYNASTRY_ROUTE_REGISTRY_PATTERNS) {
    if (!registrySrc.includes(`pattern: '${pattern}'`)) {
      failures.push(`experienceRouteRegistry missing route pattern: ${pattern}`);
    }
  }

  return failures;
}

function collectSharedChromeSourceFailures(shellSrc, headerContainerSrc) {
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

  return failures;
}

function checkSharedChromeSourceTruth() {
  for (const rel of SHARED_CHROME_OWNER_PATHS) {
    if (!exists(rel)) fail(`missing shared chrome source file: ${rel}`);
  }
  if (!exists(HEADER_STATE_PATH)) fail(`missing shared chrome source file: ${HEADER_STATE_PATH}`);
  if (!exists(METHOD_AUTHORITY_PATH)) fail(`missing shared chrome source file: ${METHOD_AUTHORITY_PATH}`);
  if (!exists(EXPERIENCE_ARCHETYPES_PATH)) {
    fail(`missing shared chrome source file: ${EXPERIENCE_ARCHETYPES_PATH}`);
  }
  if (!exists(COMPATIBILITY_GUEST_PATH)) {
    fail(`missing synastry composite source file: ${COMPATIBILITY_GUEST_PATH}`);
  }
  if (!exists(EXPERIENCE_ROUTE_REGISTRY_PATH)) {
    fail(`missing synastry composite source file: ${EXPERIENCE_ROUTE_REGISTRY_PATH}`);
  }

  const shellSrc = read(SHARED_CHROME_SOURCE.publicShell);
  const headerContainerSrc = read(SHARED_CHROME_SOURCE.publicHeaderContainer);
  const headerSrc = read(SHARED_CHROME_SOURCE.publicHeader);
  const footerSrc = read(SHARED_CHROME_SOURCE.publicFooter);
  const headerStateSrc = read(SHARED_CHROME_SOURCE.publicHeaderState);
  const methodAuthoritySrc = read(SHARED_CHROME_SOURCE.methodAuthority);
  const experienceSrc = read(SHARED_CHROME_SOURCE.experienceArchetypes);
  const benchmarkSrc = read(BENCHMARK_STACK_PATH);
  const compatibilitySrc = read(COMPATIBILITY_GUEST_PATH);
  const registrySrc = read(EXPERIENCE_ROUTE_REGISTRY_PATH);

  for (const message of collectSharedChromeSourceFailures(shellSrc, headerContainerSrc)) {
    fail(message);
  }

  for (const message of collectHeaderNavExactEqualityFailures(headerStateSrc, benchmarkSrc)) {
    fail(message);
  }

  for (const message of collectContextualActionExactEqualityFailures(headerStateSrc, benchmarkSrc)) {
    fail(message);
  }

  for (const message of collectPublicHeaderRendererFailures(headerSrc)) {
    fail(message);
  }

  for (const message of collectFooterExactEqualityFailures(footerSrc, methodAuthoritySrc, benchmarkSrc)) {
    fail(message);
  }

  for (const message of collectArchetypeExactEqualityFailures(experienceSrc, benchmarkSrc)) {
    fail(message);
  }

  for (const message of collectSynastryCompositeBindingFailures(
    benchmarkSrc,
    compatibilitySrc,
    registrySrc,
  )) {
    fail(message);
  }
}

function runSharedChromeSourceNegativeSelfTests() {
  const shellSrc = read(SHARED_CHROME_SOURCE.publicShell);
  const headerContainerSrc = read(SHARED_CHROME_SOURCE.publicHeaderContainer);
  const headerSrc = read(SHARED_CHROME_SOURCE.publicHeader);
  const footerSrc = read(SHARED_CHROME_SOURCE.publicFooter);
  const headerStateSrc = read(SHARED_CHROME_SOURCE.publicHeaderState);
  const methodAuthoritySrc = read(SHARED_CHROME_SOURCE.methodAuthority);
  const experienceSrc = read(SHARED_CHROME_SOURCE.experienceArchetypes);
  const benchmarkSrc = read(BENCHMARK_STACK_PATH);

  const shellCases = [
    {
      label: 'removed PublicHeaderContainer from PublicShell',
      shell: shellSrc.replace(/PublicHeaderContainer/g, 'RemovedHeaderContainer'),
      headerContainer: headerContainerSrc,
    },
    {
      label: 'removed PublicFooter from PublicShell',
      shell: shellSrc.replace(/PublicFooter/g, 'RemovedFooter'),
      headerContainer: headerContainerSrc,
    },
    {
      label: 'removed PublicHeader from PublicHeaderContainer',
      shell: shellSrc,
      headerContainer: headerContainerSrc.replace(/PublicHeader/g, 'RemovedHeader'),
    },
  ];

  for (const testCase of shellCases) {
    if (collectSharedChromeSourceFailures(testCase.shell, testCase.headerContainer).length === 0) {
      fail(`shared chrome source self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const headerNavCases = [
    {
      label: 'source removed /core from desktop inventory',
      headerState: headerStateSrc.replace(
        "  { href: '/core', label: T.freeEntry },\n  { href: '/dtr/lp', label: T.premiumProduct },",
        "  { href: '/dtr/lp', label: T.premiumProduct },",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'source added unexpected desktop route',
      headerState: headerStateSrc.replace(
        "  { href: '/dtr/lp', label: T.premiumProduct },\n];",
        "  { href: '/dtr/lp', label: T.premiumProduct },\n  { href: '/pricing', label: 'Pricing' },\n];",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'SSOT added unexpected desktop route',
      headerState: headerStateSrc,
      benchmark: benchmarkSrc.replace(
        '**Desktop primary (`DESKTOP_PRIMARY_NAV`):**\n\n- `/core`\n- `/dtr/lp`\n',
        '**Desktop primary (`DESKTOP_PRIMARY_NAV`):**\n\n- `/core`\n- `/dtr/lp`\n- `/pricing`\n',
      ),
    },
    {
      label: 'source duplicate desktop route',
      headerState: headerStateSrc.replace(
        "  { href: '/core', label: T.freeEntry },",
        "  { href: '/core', label: T.freeEntry },\n  { href: '/core', label: T.freeEntry },",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'SSOT removed /my from account inventory',
      headerState: headerStateSrc,
      benchmark: benchmarkSrc.replace(
        '**Signed-in account (`ACCOUNT_DROPDOWN_NAV`):**\n\n- `/dtr`\n- `/my`\n',
        '**Signed-in account (`ACCOUNT_DROPDOWN_NAV`):**\n\n- `/dtr`\n',
      ),
    },
  ];

  for (const testCase of headerNavCases) {
    if (collectHeaderNavExactEqualityFailures(testCase.headerState, testCase.benchmark).length === 0) {
      fail(`header nav exact-equality self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const headerRendererCases = [
    {
      label: 'removed desktopPrimaryNav render',
      mutated: headerSrc.replace('desktopPrimaryNav.map', 'removedDesktopPrimaryNav.map'),
    },
    {
      label: 'removed desktop ACCOUNT_DROPDOWN_NAV render',
      mutated: headerSrc.replace('items={ACCOUNT_DROPDOWN_NAV}', 'items={[]}'),
    },
    {
      label: 'removed mobile ACCOUNT_DROPDOWN_NAV render',
      mutated: headerSrc.replace('ACCOUNT_DROPDOWN_NAV.map((item)', 'REMOVED_NAV.map((item)'),
    },
    {
      label: 'removed desktop SignInButton capability',
      mutated: (() => {
        const start = headerSrc.indexOf('data-testid="m55-desktop-auth"');
        const end = headerSrc.indexOf('className={styles.menuTrigger}', start);
        const desktop = headerSrc.slice(start, end).replace('<SignInButton', '<RemovedSignInButton');
        return headerSrc.slice(0, start) + desktop + headerSrc.slice(end);
      })(),
    },
    {
      label: 'removed mobile SignInButton capability',
      mutated: (() => {
        const start = headerSrc.indexOf('styles.mobileMenuAuth');
        const end = headerSrc.indexOf('</nav>', start);
        const mobile = headerSrc.slice(start, end).replace('<SignInButton', '<RemovedSignInButton');
        return headerSrc.slice(0, start) + mobile + headerSrc.slice(end);
      })(),
    },
    {
      label: 'removed desktop UserButton capability',
      mutated: (() => {
        const start = headerSrc.indexOf('data-testid="m55-desktop-auth"');
        const end = headerSrc.indexOf('className={styles.menuTrigger}', start);
        const desktop = headerSrc.slice(start, end).replace('<UserButton', '<RemovedUserButton');
        return headerSrc.slice(0, start) + desktop + headerSrc.slice(end);
      })(),
    },
    {
      label: 'removed mobile UserButton capability',
      mutated: (() => {
        const start = headerSrc.indexOf('styles.mobileMenuAuth');
        const end = headerSrc.indexOf('</nav>', start);
        const mobile = headerSrc.slice(start, end).replace('<UserButton', '<RemovedUserButton');
        return headerSrc.slice(0, start) + mobile + headerSrc.slice(end);
      })(),
    },
    {
      label: 'removed About dropdown render while destructuring remains',
      mutated: headerSrc.replace('items={aboutDropdownNav}', 'items={[]}'),
    },
    {
      label: 'removed contextual primary-action href render',
      mutated: headerSrc.replace('href={contextualPrimaryAction.href}', 'href="/removed-contextual"'),
    },
    {
      label: 'removed contextual primary-action label render',
      mutated: headerSrc.replace('{contextualPrimaryAction.label}', '{"removed"}'),
    },
  ];

  for (const testCase of headerRendererCases) {
    if (collectPublicHeaderRendererFailures(testCase.mutated).length === 0) {
      fail(`PublicHeader renderer self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const contextualActionCases = [
    {
      label: 'source route changed',
      headerState: headerStateSrc.replace(
        "kind: 'view_premium'; label: typeof T.viewPremiumReport; href: '/dtr/lp'",
        "kind: 'view_premium'; label: typeof T.viewPremiumReport; href: '/pricing'",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'source new action kind added',
      headerState: headerStateSrc.replace(
        "  | { kind: 'recipient_free'; label: typeof T.recipientAction; href: '/core' };",
        "  | { kind: 'recipient_free'; label: typeof T.recipientAction; href: '/core' }\n  | { kind: 'new_action'; label: typeof T.freeEntry; href: '/core' };",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'SSOT action removed',
      headerState: headerStateSrc,
      benchmark: benchmarkSrc.replace('| `recipient_free` | `/core` |\n', ''),
    },
    {
      label: 'SSOT extra action added',
      headerState: headerStateSrc,
      benchmark: benchmarkSrc.replace(
        '| `recipient_free` | `/core` |\n',
        '| `recipient_free` | `/core` |\n| `extra_action` | `/core` |\n',
      ),
    },
    {
      label: 'duplicate action kind in source',
      headerState: headerStateSrc.replace(
        "  | { kind: 'free_entry'; label: typeof T.freeEntry; href: '/core' }",
        "  | { kind: 'free_entry'; label: typeof T.freeEntry; href: '/core' }\n  | { kind: 'free_entry'; label: typeof T.freeEntry; href: '/core' }",
      ),
      benchmark: benchmarkSrc,
    },
  ];

  for (const testCase of contextualActionCases) {
    if (
      collectContextualActionExactEqualityFailures(testCase.headerState, testCase.benchmark).length ===
      0
    ) {
      fail(`contextual action exact-equality self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const footerCases = [
    {
      label: 'unexpected support/legal route added',
      footer: footerSrc.replace(
        "  { label: '特定商取引法に基づく表記', href: '/legal/tokushoho', testId: undefined },",
        "  { label: '特定商取引法に基づく表記', href: '/legal/tokushoho', testId: undefined },\n  { label: 'Extra', href: '/legal/extra', testId: undefined },",
      ),
      methodAuthority: methodAuthoritySrc,
      benchmark: benchmarkSrc,
    },
    {
      label: 'privacy removed from support/legal',
      footer: footerSrc.replace("  { label: 'プライバシーポリシー', href: '/legal/privacy', testId: undefined },\n", ''),
      methodAuthority: methodAuthoritySrc,
      benchmark: benchmarkSrc,
    },
    {
      label: 'method utility removed',
      footer: footerSrc.replace('href: M55_METHOD_CANONICAL_ROUTE', 'href: "/removed-method"'),
      methodAuthority: methodAuthoritySrc,
      benchmark: benchmarkSrc,
    },
    {
      label: 'method route authority changed',
      footer: footerSrc,
      methodAuthority: methodAuthoritySrc.replace(
        "export const M55_METHOD_CANONICAL_ROUTE = '/how-m55-works'",
        "export const M55_METHOD_CANONICAL_ROUTE = '/method'",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'UTILITY_GROUP defined but map render removed',
      footer: footerSrc.replace('{UTILITY_GROUP.map((item)', '{/* removed */ null && ('),
      methodAuthority: methodAuthoritySrc,
      benchmark: benchmarkSrc,
    },
    {
      label: 'SUPPORT_LEGAL_GROUP defined but map render removed',
      footer: footerSrc.replace(
        '{SUPPORT_LEGAL_GROUP.map((item)',
        '{/* removed */ null && (',
      ),
      methodAuthority: methodAuthoritySrc,
      benchmark: benchmarkSrc,
    },
  ];

  for (const testCase of footerCases) {
    if (
      collectFooterExactEqualityFailures(
        testCase.footer,
        testCase.methodAuthority,
        testCase.benchmark,
      ).length === 0
    ) {
      fail(`footer exact-equality self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const archetypeCases = [
    {
      label: 'source adds archetype',
      experience: experienceSrc.replace(
        "'DIGITAL_PUBLICATION',",
        "'DIGITAL_PUBLICATION',\n  'NEW_SURFACE',",
      ),
      benchmark: benchmarkSrc,
    },
    {
      label: 'SSOT omits archetype',
      experience: experienceSrc,
      benchmark: benchmarkSrc.replace('| DIGITAL_PUBLICATION | The Pattern + Paired | — |\n', ''),
    },
    {
      label: 'duplicate SSOT archetype mapping',
      experience: experienceSrc,
      benchmark: benchmarkSrc.replace(
        '| DIGITAL_PUBLICATION | The Pattern + Paired | — |',
        '| DIGITAL_PUBLICATION | The Pattern + Paired | — |\n| DIGITAL_PUBLICATION | with | — |',
      ),
    },
  ];

  for (const testCase of archetypeCases) {
    if (
      collectArchetypeExactEqualityFailures(testCase.experience, testCase.benchmark).length === 0
    ) {
      fail(`archetype exact-equality self-test ${testCase.label} expected FAIL but passed`);
    }
  }

  const boundedArchetypeBenchmark = `${benchmarkSrc}\n\n## Fake later section\n\n| FAKE_ARCHETYPE | with | — |\n`;
  const boundedArchetypes = extractBenchmarkArchetypes(boundedArchetypeBenchmark);
  if (!boundedArchetypes || boundedArchetypes.includes('FAKE_ARCHETYPE')) {
    fail('archetype parser must bound section at next H2 and ignore unrelated tables');
  }

  const compatibilitySrc = read(COMPATIBILITY_GUEST_PATH);
  const registrySrc = read(EXPERIENCE_ROUTE_REGISTRY_PATH);
  const synastryCases = [
    {
      label: 'removed /synastry phase=dob binding',
      benchmark: benchmarkSrc.replace('| `/synastry` — `phase=dob` | Free input / questionnaire | with | — |\n', ''),
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed embedded paid bridge binding',
      benchmark: benchmarkSrc.replace(
        '| `/synastry` — `phase=result`, embedded paid bridge | Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |\n',
        '',
      ),
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed /synastry/report/:reportId binding',
      benchmark: benchmarkSrc.replace(
        '| `/synastry/report/:reportId` | Paid report / premium reading body | The Pattern + Paired | — |\n',
        '',
      ),
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
  ];

  for (const testCase of synastryCases) {
    if (
      collectSynastryCompositeBindingFailures(
        testCase.benchmark,
        testCase.compatibility,
        testCase.registry,
      ).length === 0
    ) {
      fail(`synastry composite binding self-test ${testCase.label} expected FAIL but passed`);
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

const ARCHETYPE_MAPPING_ROWS = [
  '| PUBLIC_POSTER | with + Co–Star | — |',
  '| PUBLIC_EDITORIAL | The Pattern + with | M55 legal/support authority remains superior; Stripe/Baymard may guide clarity/friction only |',
  '| GUIDED_FREE_FLOW | with | — |',
  '| EDITORIAL_FREE_RESULT | The Pattern + with | — |',
  '| SHARED_SOCIAL_ENTRY | The Pattern + with | — |',
  '| PREMIUM_GUIDED_FLOW | with + Paired | — |',
  '| PRODUCT_DECISION | Paired + Co–Star | Stripe + Baymard |',
  '| PURCHASE_CONFIRMATION | Paired + Co–Star | Stripe + Baymard |',
  '| DIGITAL_PUBLICATION | The Pattern + Paired | — |',
];

const CHROME_OWNER_TABLE_PATHS = [
  'app/_components/PublicShell.tsx',
  'components/shell/PublicHeaderContainer.tsx',
  'components/shell/PublicHeader.tsx',
  HEADER_STATE_PATH,
  'app/_components/PublicFooter.tsx',
];

function extractBenchmarkOwnerTablePaths(benchmarkSrc) {
  const sectionStart = benchmarkSrc.indexOf('## Shared public chrome inventory');
  const sectionEnd = benchmarkSrc.indexOf('### Header capability inventory', sectionStart);
  if (sectionStart === -1 || sectionEnd === -1) return null;
  const section = benchmarkSrc.slice(sectionStart, sectionEnd);
  return [...section.matchAll(/\| [^|]+ \| `([^`]+)` \|/g)].map((match) => match[1]);
}

const SHARED_CHROME_OWNER_PATHS = [
  'app/_components/PublicShell.tsx',
  'components/shell/PublicHeaderContainer.tsx',
  'components/shell/PublicHeader.tsx',
  'app/_components/PublicFooter.tsx',
  HEADER_STATE_PATH,
  METHOD_AUTHORITY_PATH,
  EXPERIENCE_ARCHETYPES_PATH,
];

const CANONICAL_IDENTITY_RULE_TOKENS = [
  'These URLs identify the frozen external references.',
  'They are **NOT** instructions to perform fresh competitor research every session.',
  'The durable pattern/role definitions in this SSOT are the ordinary implementation reference.',
  'Visiting/searching alternative competitor sites remains **prohibited** absent a valid reselection invalidator.',
];

const BENCHMARK_PRECEDENCE_TOKENS = [
  'explicit route/surface mapping in this SSOT',
  'archetype fallback mapping',
  'STOP / BENCHMARK CLASSIFICATION REQUIRED',
  'must not** trigger ad-hoc competitor research',
];

const HEADER_CAPABILITY_TOKENS = [
  'M55 brand lockup routes to `/home`',
  'Contextual primary-action contract',
  'data-testid="m55-desktop-auth"',
  'styles.mobileMenuAuth',
  'signed-out: Clerk `SignInButton` inside `<SignedOut>`',
  'signed-in: `ACCOUNT_DROPDOWN_NAV` dropdown + Clerk `UserButton` inside `<SignedIn>`',
  'signed-in: `ACCOUNT_DROPDOWN_NAV` routes + Clerk `UserButton` inside mobile `<SignedIn>`',
  'PublicHeaderContainer.tsx',
  'PublicHeader.tsx',
  'If a header capability already exists',
];

const FOOTER_CAPABILITY_TOKENS = [
  'site-wide discovery / navigation only',
  'Canonical content owners (route → page owner):',
  'Navigation vs content rule',
  'UTILITY (`UTILITY_GROUP`)',
  METHOD_AUTHORITY_PATH,
  'M55_METHOD_CANONICAL_ROUTE` = `/how-m55-works`',
  'SUPPORT / LEGAL (`SUPPORT_LEGAL_GROUP`) — site-wide navigation routes:',
  'Footer owns/renders a site-wide copyright line',
  'inspect `PublicFooter`, `m55MethodAuthority.ts`, and the canonical content owners above first',
];

const FOOTER_SUPPORT_LEGAL_ROUTES = [
  '/support',
  '/legal/refund',
  '/legal/terms',
  '/legal/privacy',
  '/legal/tokushoho',
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

function collectBenchmarkStackFailures(
  src,
  headerStateSrc,
  experienceSrc,
  compatibilitySrc,
  registrySrc,
) {
  const failures = [];
  const requireToken = (token) => {
    if (!src.includes(token)) failures.push(`benchmark stack SSOT missing: ${token}`);
  };

  requireToken('M55 UX Benchmark Stack');
  requireToken('Ad-hoc competitor research is **prohibited**');
  requireToken('## Experience Archetype benchmark fallback mapping');
  requireToken('### Known composite route/state bindings');
  requireToken(EXPERIENCE_ARCHETYPES_PATH);

  for (const heading of BENCHMARK_HEADINGS) requireToken(heading);
  for (const url of CANONICAL_BENCHMARK_URLS) requireToken(url);
  for (const token of CANONICAL_IDENTITY_RULE_TOKENS) requireToken(token);
  for (const token of BENCHMARK_PRECEDENCE_TOKENS) requireToken(token);
  for (const row of SURFACE_MAPPING_ROWS) requireToken(row);
  for (const row of ARCHETYPE_MAPPING_ROWS) requireToken(row);
  requireToken(METHOD_AUTHORITY_PATH);
  requireToken(EXPERIENCE_ARCHETYPES_PATH);

  const ownerTablePaths = extractBenchmarkOwnerTablePaths(src);
  if (!ownerTablePaths) {
    failures.push('benchmark stack SSOT missing shared chrome owner table');
  } else if (!routesExactlyEqual(ownerTablePaths, CHROME_OWNER_TABLE_PATHS)) {
    failures.push(
      `benchmark stack owner table mismatch: ssot=[${ownerTablePaths.join(', ')}] expected=[${CHROME_OWNER_TABLE_PATHS.join(', ')}]`,
    );
  }

  for (const token of HEADER_CAPABILITY_TOKENS) requireToken(token);
  for (const token of FOOTER_CAPABILITY_TOKENS) requireToken(token);
  for (const route of FOOTER_SUPPORT_LEGAL_ROUTES) requireToken(`- \`${route}\``);
  for (const token of DUPLICATION_RULE_TOKENS) requireToken(token);
  for (const invalidator of RESELECTION_INVALIDATORS) requireToken(invalidator);
  for (const nonInvalidator of RESELECTION_NON_INVALIDATORS) requireToken(nonInvalidator);

  if (headerStateSrc) {
    for (const message of collectHeaderNavExactEqualityFailures(headerStateSrc, src)) {
      failures.push(message);
    }
    for (const message of collectContextualActionExactEqualityFailures(headerStateSrc, src)) {
      failures.push(message);
    }
  }
  for (const message of collectLegalSupportContentOwnerFailures(src)) {
    failures.push(message);
  }
  if (experienceSrc) {
    for (const message of collectArchetypeExactEqualityFailures(experienceSrc, src)) {
      failures.push(message);
    }
  }
  if (compatibilitySrc && registrySrc) {
    for (const message of collectSynastryCompositeBindingFailures(src, compatibilitySrc, registrySrc)) {
      failures.push(message);
    }
  }

  return failures;
}

function runBenchmarkStackNegativeSelfTests() {
  const src = read(BENCHMARK_STACK_PATH);
  const headerStateSrc = read(HEADER_STATE_PATH);
  const experienceSrc = read(EXPERIENCE_ARCHETYPES_PATH);
  const compatibilitySrc = read(COMPATIBILITY_GUEST_PATH);
  const registrySrc = read(EXPERIENCE_ROUTE_REGISTRY_PATH);

  const cases = [
    {
      label: 'HOME mapping permutation',
      mutated: src.replace('| HOME | with + Co–Star | — |', '| HOME | Paired | — |'),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed PublicFooter privacy route',
      mutated: src.replace('- `/legal/privacy`\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed canonical content owner mapping',
      mutated: src.replace('| `/legal/privacy` | `app/legal/privacy/page.tsx` |\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed PublicHeaderContainer from owner table',
      mutated: src.replace(
        '| Shared header state owner | `components/shell/PublicHeaderContainer.tsx` |',
        '| Shared header state owner | `components/shell/RemovedHeaderContainer.tsx` |',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed reselection invalidator',
      mutated: src.replace('- Human changes primary UX target\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed Paired benchmark heading',
      mutated: src.replace('### Paired\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed one canonical domain',
      mutated: src.replace('https://stripe.com/', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'changed with domain',
      mutated: src.replace('https://with.is/', 'https://with.example/'),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed /core from desktop inventory',
      mutated: src.replace(
        '**Desktop primary (`DESKTOP_PRIMARY_NAV`):**\n\n- `/core`\n- `/dtr/lp`\n',
        '**Desktop primary (`DESKTOP_PRIMARY_NAV`):**\n\n- `/dtr/lp`\n',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed /my from account inventory',
      mutated: src.replace(
        '**Signed-in account (`ACCOUNT_DROPDOWN_NAV`):**\n\n- `/dtr`\n- `/my`\n',
        '**Signed-in account (`ACCOUNT_DROPDOWN_NAV`):**\n\n- `/dtr`\n',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed publicHeaderState from owner table',
      mutated: src.replace(
        '| Header navigation/state contract | `lib/m55/commercialUx/publicHeaderState.ts` |',
        '| Header navigation/state contract | `lib/m55/commercialUx/removedHeaderState.ts` |',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed archetype mapping row',
      mutated: src.replace('| DIGITAL_PUBLICATION | The Pattern + Paired | — |\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed benchmark precedence rule',
      mutated: src.replace('STOP / BENCHMARK CLASSIFICATION REQUIRED', 'STOP / GUESS BENCHMARK'),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed /synastry phase=dob composite binding',
      mutated: src.replace('| `/synastry` — `phase=dob` | Free input / questionnaire | with | — |\n', ''),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed embedded paid bridge composite binding',
      mutated: src.replace(
        '| `/synastry` — `phase=result`, embedded paid bridge | Premium bridge / purchase confirmation | Paired + Co–Star | Stripe + Baymard |\n',
        '',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
    {
      label: 'removed /synastry/report/:reportId composite binding',
      mutated: src.replace(
        '| `/synastry/report/:reportId` | Paid report / premium reading body | The Pattern + Paired | — |\n',
        '',
      ),
      headerState: headerStateSrc,
      experience: experienceSrc,
      compatibility: compatibilitySrc,
      registry: registrySrc,
    },
  ];

  for (const testCase of cases) {
    if (
      collectBenchmarkStackFailures(
        testCase.mutated,
        testCase.headerState,
        testCase.experience,
        testCase.compatibility,
        testCase.registry,
      ).length === 0
    ) {
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
    'exact official identity/domain for all six fixed external references',
    HEADER_STATE_PATH,
    'desktop primary',
    'About dropdown',
    'mobile public',
    'signed-in account',
    'cross-checks `M55_UX_BENCHMARK_STACK.md` header navigation inventory against actual',
    'STOP / HANDOFF_COLD_START_FAIL',
    'full Header capability inventory',
    'full Footer capability inventory',
    'M55 method utility',
    'm55MethodAuthority.ts',
    'Experience Archetype benchmark fallback mapping',
    'exact ordered equality',
    'exact set equality',
    'STOP / BENCHMARK CLASSIFICATION REQUIRED',
    'complete shared Header/Footer capability inventory',
    'unmapped-surface fail-closed',
    EXPERIENCE_ARCHETYPES_PATH,
    'exact contextual primary-action kind/route pairs',
    'desktop vs mobile auth capabilities',
    'site-wide navigation while canonical support/legal',
    'canonical support/legal route → content-owner mapping',
    'content edits vs navigation edits',
    'year not frozen',
    'state/section scoped',
    'the `/synastry` composite state/section benchmark bindings',
    'known composite route/state benchmark bindings',
    'PRODUCT_DECISION',
    'must FAIL',
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
  const headerStateSrc = read(HEADER_STATE_PATH);
  const experienceSrc = read(EXPERIENCE_ARCHETYPES_PATH);
  const compatibilitySrc = read(COMPATIBILITY_GUEST_PATH);
  const registrySrc = read(EXPERIENCE_ROUTE_REGISTRY_PATH);
  for (const message of collectBenchmarkStackFailures(
    src,
    headerStateSrc,
    experienceSrc,
    compatibilitySrc,
    registrySrc,
  )) {
    fail(message);
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

function expectDirtyPaths(label, rawStdout, expectedPaths) {
  const parsed = parsePorcelainDirtyPaths(rawStdout);
  const paths = parsed.map((entry) => entry.path);
  const sameLength = paths.length === expectedPaths.length;
  const sameOrder = sameLength && expectedPaths.every((expected, index) => paths[index] === expected);
  if (!sameOrder) {
    fail(`${label}: expected [${expectedPaths.join(', ')}] got [${paths.join(', ')}]`);
  }
}

function expectDirtyCodes(label, rawStdout, expectedCodes) {
  const parsed = parsePorcelainDirtyPaths(rawStdout);
  const codes = parsed.map((entry) => entry.code);
  const sameLength = codes.length === expectedCodes.length;
  const sameOrder = sameLength && expectedCodes.every((expected, index) => codes[index] === expected);
  if (!sameOrder) {
    fail(`${label}: expected codes [${expectedCodes.join(', ')}] got [${codes.join(', ')}]`);
  }
}

function runPorcelainDirtyPathParserSelfTests() {
  expectDirtyPaths('first line unstaged modified', ' M first-file.ts', ['first-file.ts']);
  expectDirtyCodes('first line unstaged modified code', ' M first-file.ts', ['M']);

  expectDirtyPaths(
    'multiple dirty lines',
    ' M first-file.ts\n M second-file.ts',
    ['first-file.ts', 'second-file.ts'],
  );

  expectDirtyPaths('staged modified', 'M  staged-file.ts', ['staged-file.ts']);
  expectDirtyCodes('staged modified code', 'M  staged-file.ts', ['M']);

  expectDirtyPaths('untracked', '?? new-file.ts', ['new-file.ts']);
  expectDirtyCodes('untracked code', '?? new-file.ts', ['??']);

  expectDirtyPaths('node_modules filtered', ' M node_modules/pkg/index.js', []);
  expectDirtyPaths(
    'node_modules first then real path',
    ' M node_modules/pkg/index.js\n M real-file.ts',
    ['real-file.ts'],
  );

  expectDirtyPaths('first line MM', 'MM both-staged-and-worktree.ts', ['both-staged-and-worktree.ts']);
  expectDirtyCodes('first line MM code', 'MM both-staged-and-worktree.ts', ['MM']);

  expectDirtyPaths('first line untracked', '?? lone-untracked.ts', ['lone-untracked.ts']);

  expectDirtyPaths(
    'trailing newline',
    ' M first-file.ts\n M second-file.ts\n',
    ['first-file.ts', 'second-file.ts'],
  );

  expectDirtyPaths(
    'no trailing newline',
    ' M first-file.ts\n M second-file.ts',
    ['first-file.ts', 'second-file.ts'],
  );

  expectDirtyPaths('empty clean status', '', []);
  expectDirtyPaths('whitespace-only clean status', '   \n  \n', []);

  const head = git('rev-parse', 'HEAD');
  if (!head || /\s/.test(head)) {
    fail('git() must return trimmed SHA output without surrounding whitespace');
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (!branch || /^\s|\s$/.test(branch)) {
    fail('git() must return trimmed branch output without surrounding whitespace');
  }
}

function main() {
  runSemanticSelfTests();
  runPorcelainDirtyPathParserSelfTests();
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
  runMandatoryAuditGate();

  if (FAILURES.length > 0) {
    console.error('verify:m55-control-tower:FAIL');
    for (const message of FAILURES) console.error(`- ${message}`);
    process.exit(1);
  }
  console.log('verify:m55-control-tower:PASS');
}
main();
