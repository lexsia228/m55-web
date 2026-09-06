#!/usr/bin/env node
/**
 * M55 Control Tower derived handoff — NOT authority.
 * Combines read-only Git runtime facts with durable execution-state semantics.
 * No secrets, customer identity, tokens, or provider credentials.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  EXECUTION_STATE_PATH,
  COLD_START_GATE,
  validateExecutionState,
  detectLegacyExecutionDrift,
} from './m55-control-tower-semantic.mjs';
import {
  git,
  parsePorcelainDirtyPaths,
} from './m55-control-tower-context.mjs';

export const HANDOFF_SCHEMA_VERSION = '1.0.0';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BENCHMARK_AUTHORITY = 'docs/ssot/M55_UX_BENCHMARK_STACK.md';
const COMMERCIAL_QUALITY_AUTHORITY = 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md';
const SAFARI_AUTHORITY = 'docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md';
const CURRENT_STATE = 'docs/ssot/M55_CURRENT_STATE.md';

const RERUN_POLICY =
  'RERUN_PROHIBITED unless an invalidating dependency changed (new chat/session is never an invalidating dependency)';
const DEV_GATE_RERUN_POLICY =
  'COMPLETED_GATE_REPLAY_PROHIBITED — new chat/session is never an invalidating dependency';

const IMPLEMENTER_ROLE = 'cursor';
const INDEPENDENT_AUDITOR_ROLE = 'codex';
const HUMAN_AUTHORITY_ROLE = 'human';

const ALLOWED_MUTATION_CLASS = 'local_control_tower_hardening_and_wave2_visual';
const PROHIBITED_MUTATION_CLASSES = [
  'push',
  'pr',
  'merge',
  'vercel_deploy',
  'stripe_mutation',
  'clerk_mutation',
  'db_write',
  'production_data_mutation',
  'provider_env_mutation',
  'real_payment',
  'account_deletion',
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
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

function listDirtyPaths() {
  const result = spawnSync('git', ['status', '--porcelain=v1'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return parsePorcelainDirtyPaths(result.stdout);
}

function resolveCurrentWave(state) {
  const wave1 = state?.sitewideCommercialUiuxWave1Transition;
  if (wave1?.status === 'CLOSED_GREEN' && wave1?.wave2Status === 'AUTHORIZED_NOT_COMPLETE') {
    return {
      wave: 2,
      status: 'AUTHORIZED_NOT_COMPLETE',
      wave1ProductCommit: wave1.productCommit ?? null,
    };
  }
  if (wave1?.status === 'CLOSED_GREEN') {
    return { wave: 2, status: wave1.wave2Status ?? 'UNKNOWN', wave1ProductCommit: wave1.productCommit ?? null };
  }
  return { wave: 1, status: 'UNKNOWN', wave1ProductCommit: null };
}

function resolveMasterBacklogStatus(state) {
  const wave1 = state?.sitewideCommercialUiuxWave1Transition;
  if (wave1?.masterBacklog === 'FROZEN') return 'FROZEN';
  return wave1?.masterBacklog ?? 'UNKNOWN';
}

const REVENUE_SAFETY_E2E_GATE = 'REVENUE_SAFETY_E2E';

const COLD_START_REQUIRED_EVIDENCE = [
  'zero_memory_execution_state_reconstruction',
  'creator_revenue_e2c2e_contract_invariants',
  'handoff_cold_start_pass_without_mutation',
  'control_tower_authority_boundary',
];

const R2_REVENUE_SAFETY_REQUIRED_EVIDENCE = [
  'current_product_description_price_billing_type',
  'deliverable_mapping',
  'refund_conditions',
  'support_contact_route',
  'post_purchase_recovery',
  'stripe_revenue_path_continuity',
  'entitlement_continuity',
  'reuse_closed_green_payment_checkout_webhook_fulfillment_evidence',
  'invalidating_dependency_check_before_replay',
  'separate_human_go_before_real_payment',
];

const GENERIC_CREATOR_GATE_REQUIRED_EVIDENCE = [
  'read_current_creator_gate_contract',
  'preserve_closed_gate_no_replay',
  'require_explicit_authority_before_mutation',
];

const LEGACY_NON_CREATOR_REQUIRED_EVIDENCE = [
  'control_tower_hardening_green',
  'cold_start_handoff_pass',
];

export function resolveRequiredNextEvidence(state) {
  const gate = state?.currentExecutionGate ?? '';
  if (gate.includes('WAVE2')) {
    return [
      'affected_delta_browser_evidence',
      '12_axis_commercial_scorecard_candidate',
      'codex_independent_safari_audit',
      'human_commercial_visual_approval',
    ];
  }
  if (gate === COLD_START_GATE) {
    return [...COLD_START_REQUIRED_EVIDENCE];
  }
  if (gate === REVENUE_SAFETY_E2E_GATE) {
    return [...R2_REVENUE_SAFETY_REQUIRED_EVIDENCE];
  }
  const stages = state?.creatorRevenueRoadmapAuthority?.stages ?? [];
  if (stages.includes(gate)) {
    return [...GENERIC_CREATOR_GATE_REQUIRED_EVIDENCE];
  }
  return [...LEGACY_NON_CREATOR_REQUIRED_EVIDENCE];
}

function resolveKnownEvidenceLimitations() {
  return [
    'cursor_may_self_check_safari_stp_but_cannot_issue_independent_safari_green',
    'vision_judge_attachment_is_candidate_only_never_auto_approval',
    'numeric_scorecard_alone_cannot_auto_green_candidate',
    'new_chat_session_is_never_an_invalidating_dependency',
    'local_runtime_git_facts_must_be_reobserved_not_chat_memory',
  ];
}

/**
 * Resolve the installed tsx loader through Node package exports from repo context.
 * @param {string} [repoRoot]
 * @returns {{ ok: true, resolvedPath: string, importSpecifier: string } | { ok: false, error: string }}
 */
export function resolveTsxLoaderImport(repoRoot = ROOT) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { ok: false, error: `missing package.json at ${packageJsonPath}` };
  }
  try {
    const requireFromRoot = createRequire(packageJsonPath);
    const resolvedPath = requireFromRoot.resolve('tsx');
    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, error: `resolved tsx loader missing at ${resolvedPath}` };
    }
    if (resolvedPath.endsWith(`${path.sep}index.js`)) {
      return {
        ok: false,
        error: `resolved tsx entry is deprecated index.js at ${resolvedPath}`,
      };
    }
    return {
      ok: true,
      resolvedPath,
      importSpecifier: pathToFileURL(resolvedPath).href,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {{ resolveTsxLoaderImport?: typeof resolveTsxLoaderImport, repoRoot?: string }} [options]
 */
export function deriveContentIntegritySummary(options = {}) {
  const resolveLoader = options.resolveTsxLoaderImport ?? resolveTsxLoaderImport;
  const repoRoot = options.repoRoot ?? ROOT;
  const loader = resolveLoader(repoRoot);
  if (!loader.ok) {
    return { ok: false, error: `tsx loader resolution failed: ${loader.error}` };
  }

  const script = `import { buildM55ContentIntegrityCorpus } from './lib/m55/commercialUx/qualityControl/m55ContentIntegrityCorpus.ts';
import { runContentIntegrityAudit } from './lib/commercialQuality/contentIntegrityChecks.ts';
import { checkSemanticIntegrityCorpus } from './lib/commercialQuality/contentIntegritySemanticChecks.ts';
const corpus = buildM55ContentIntegrityCorpus();
const structural = runContentIntegrityAudit(corpus);
const semantic = checkSemanticIntegrityCorpus(corpus);
const findings = [...structural.findings, ...semantic];
const summary = {
  corpusItems: corpus.length,
  findingCount: findings.length,
  unresolvedP0: findings.filter((f) => f.severity === 'P0').length,
  unresolvedP1: findings.filter((f) => f.severity === 'P1').length,
  unresolvedP2: findings.filter((f) => f.severity === 'P2').length,
};
console.log(JSON.stringify(summary));`;
  const result = spawnSync('node', ['--import', loader.importSpecifier, '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || 'content integrity derivation failed').trim(),
    };
  }
  const line = result.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) return { ok: false, error: 'empty content integrity summary' };
  try {
    return { ok: true, value: JSON.parse(line) };
  } catch {
    return { ok: false, error: 'invalid content integrity summary JSON' };
  }
}

/**
 * Retained sitewide quality observations that automated corpus P2 counts do not capture.
 * unresolvedP2=0 means no automated corpus P2 findings — not "all historical observations vanished".
 */
function deriveRetainedQualityObservations() {
  return Object.freeze([
    Object.freeze({
      classification: 'DEFERRED_DEAD_NO_RUNTIME_IMPACT',
      path: 'lib/m55/narrative/projectCompatibilityFreeNarrativeV1.ts',
      observation: 'Stale Pair share CTA literal (あなたの二人では、どう出る？) remains in non-live narrative projector.',
      liveAuthority: 'lib/m55/narrative/sharePostSerializationV1.ts → reconstructPublicCardV1.ts',
      mutationStatus: 'OUT_OF_WAVE2_ALLOWLIST',
    }),
    Object.freeze({
      classification: 'DEFERRED_DEAD_NO_RUNTIME_IMPACT',
      path: 'lib/m55/narrative/projectCompatibilityPaidNarrativeV1.ts',
      observation: 'Stale Pair share CTA literal remains in non-live paid narrative projector.',
      liveAuthority: 'lib/m55/narrative/sharePostSerializationV1.ts → reconstructPublicCardV1.ts',
      mutationStatus: 'OUT_OF_WAVE2_ALLOWLIST',
    }),
    Object.freeze({
      classification: 'HUMAN_PRESERVED_PRODUCT_TERM',
      path: 'lib/m55/narrative/reconstructPublicCardV1.ts',
      observation: 'SELF share headline retains intentional product term 仕様 (自分でも知らなかった仕様).',
      humanDecision: 'PRESERVE — not specification-tone cleanup in Wave 2.',
      mutationStatus: 'EXPLICITLY_NOT_AUTHORIZED',
    }),
  ]);
}

function deriveSitewideJapaneseEditorialQuality(integrity) {
  const p0 = integrity?.unresolvedP0 ?? null;
  const p1 = integrity?.unresolvedP1 ?? null;
  const p2Automated = integrity?.unresolvedP2 ?? null;
  const retainedObservations = deriveRetainedQualityObservations();
  const digest = integrity
    ? crypto.createHash('sha256').update(JSON.stringify(integrity)).digest('hex')
    : null;
  return {
    isAuthority: false,
    qualityPolicyVersion: 'SITEWIDE_JAPANESE_EDITORIAL_QUALITY_v1',
    ledgerDigest: digest,
    ledgerEntryCount: integrity?.corpusItems ?? null,
    unresolvedP0: p0,
    unresolvedP1: p1,
    unresolvedP2: p2Automated,
    unresolvedP2Interpretation:
      'Automated corpus P2 count only. See retainedQualityObservations for deferred dead-copy and human-preserved product terms.',
    retainedQualityObservations: retainedObservations,
    deferredDeadNoRuntimeImpactCount: retainedObservations.filter(
      (o) => o.classification === 'DEFERRED_DEAD_NO_RUNTIME_IMPACT',
    ).length,
    humanPreservedProductTermCount: retainedObservations.filter(
      (o) => o.classification === 'HUMAN_PRESERVED_PRODUCT_TERM',
    ).length,
    selfFreeStatus: p1 === 0 ? 'LOCAL_CANDIDATE_GREEN' : 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    selfPaidStatus: 'UNCHANGED_BASELINE',
    pairFreeStatus: p1 === 0 ? 'LOCAL_CANDIDATE_GREEN' : 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    pairPaidStatus: p1 === 0 ? 'LOCAL_CANDIDATE_GREEN' : 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    shareStatus: p1 === 0 ? 'LOCAL_CANDIDATE_GREEN' : 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    stateCopyStatus: 'UNCHANGED_BASELINE',
    visualEditorialStatus: p1 === 0 ? 'LOCAL_CANDIDATE_GREEN' : 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    independentAuditStatus: 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    humanApprovalStatus: 'PENDING_INDEPENDENT_REAUDIT',
    nextDelta: 'CODEX_AFFECTED_DELTA_REAUDIT',
  };
}

function deriveCreatorRevenueHandoff(state) {
  const authority = state?.creatorRevenueRoadmapAuthority ?? {};
  const stages = authority.stages ?? [];
  const currentStage = authority.currentStage ?? null;
  const currentIndex = currentStage ? stages.indexOf(currentStage) : -1;
  const nextStage = currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  return {
    isAuthority: false,
    contractReference: authority.contractReference ?? null,
    currentStage,
    nextStage,
    productWorkAfterControlTower: state?.productWorkAfterControlTower ?? null,
    fourSurfaceCreatorReadiness: authority.fourSurfaceCreatorReadiness ?? null,
    socialShareClosure: authority.socialShareClosure ?? null,
    creatorReferralStatus: authority.creatorReferralStatus ?? 'NOT_IMPLEMENTED',
    attributionStatus: authority.attributionStatus ?? 'NOT_IMPLEMENTED',
    commissionLedgerStatus: authority.commissionLedgerStatus ?? 'NOT_IMPLEMENTED',
    creatorDashboardStatus: authority.creatorDashboardStatus ?? 'NOT_IMPLEMENTED',
    payoutSettlementStatus: authority.payoutSettlementStatus ?? 'NOT_IMPLEMENTED',
    stripePayoutProviderStatus: authority.stripePayoutProviderStatus ?? 'UNSELECTED',
    stages,
    criticalPath: authority.criticalPath ?? [],
    targetCommissionRateHumanTargetOnly: true,
    antiMlmDirectSingleTierOnly: true,
    e2c2eAcronymExpansionInvented: false,
    nextDelta: state?.productWorkAfterControlTower ?? currentStage ?? 'UNKNOWN',
  };
}

function deriveInfluencerPlatformReadiness(state) {
  const creator = deriveCreatorRevenueHandoff(state);
  return {
    isAuthority: false,
    platformPolicyVersion: 'CREATOR_REVENUE_E2C2E_v1',
    creatorQualityFoundationStatus: creator.fourSurfaceCreatorReadiness,
    sharePostabilityStatus: creator.socialShareClosure,
    screenRecordStatus: creator.fourSurfaceCreatorReadiness,
    creatorReferralStatus: creator.creatorReferralStatus,
    attributionStatus: creator.attributionStatus,
    creatorContentInfrastructureStatus: 'PARTIAL_SHARE_ARCHITECTURE',
    creatorDashboardStatus: creator.creatorDashboardStatus,
    rewardInfrastructureStatus: creator.payoutSettlementStatus,
    commissionLedgerStatus: creator.commissionLedgerStatus,
    stripePayoutProviderStatus: creator.stripePayoutProviderStatus,
    privacyStatus: 'GREEN_EXISTING_CONTRACTS',
    fraudGuardrailStatus: 'POLICY_ONLY',
    independentAuditStatus: 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT',
    humanEconomicApprovalStatus: 'NOT_GRANTED',
    contractReference: creator.contractReference,
    currentStage: creator.currentStage,
    nextStage: creator.nextStage,
    nextDelta: creator.nextDelta,
  };
}

/**
 * Build the derived handoff object from live Git runtime + execution state.
 * @param {{ expectedHead?: string, expectedGate?: string, deriveContentIntegritySummary?: typeof deriveContentIntegritySummary }} [options]
 */
export function buildHandoff(options = {}) {
  const executionSrc = read(EXECUTION_STATE_PATH);
  const currentSrc = read(CURRENT_STATE);
  const { state, errors: semanticErrors } = validateExecutionState(executionSrc);
  const legacyDrift = state ? detectLegacyExecutionDrift(state, currentSrc) : null;

  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown';
  const head = git('rev-parse', 'HEAD') ?? 'unknown';
  const originMain = git('rev-parse', 'origin/main') ?? 'unknown';
  const upstream = upstreamRef(branch);
  const divergence = aheadBehind(upstream);
  const staged = git('diff', '--cached', '--name-only');
  const stagedPaths = staged ? staged.split('\n').filter(Boolean) : [];
  const dirtyPaths = listDirtyPaths();

  const wave = resolveCurrentWave(state);
  const validationErrors = [...semanticErrors];
  const deriveIntegrity = options.deriveContentIntegritySummary ?? deriveContentIntegritySummary;
  const integrityDerived = deriveIntegrity();
  if (!integrityDerived.ok) {
    validationErrors.push(`content integrity derivation failed: ${integrityDerived.error}`);
  }
  const integrity = integrityDerived.ok ? integrityDerived.value : null;

  if (options.expectedHead && options.expectedHead !== head) {
    validationErrors.push(`HEAD mismatch: expected ${options.expectedHead}, observed ${head}`);
  }
  if (options.expectedGate && state?.currentExecutionGate !== options.expectedGate) {
    validationErrors.push(
      `current gate mismatch: expected ${options.expectedGate}, observed ${state?.currentExecutionGate ?? 'missing'}`,
    );
  }

  const handoff = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    repository: git('remote', 'get-url', 'origin') ?? 'unknown',
    worktree: ROOT,
    branch,
    HEAD: head,
    originMain,
    upstream: upstream ?? 'none',
    aheadBehind: { ahead: divergence.ahead, behind: divergence.behind },
    index: { stagedCount: stagedPaths.length, stagedPaths },
    dirtyPaths,
    authorityPath: EXECUTION_STATE_PATH,
    macroLane: state?.macroLane ?? null,
    currentGate: state?.currentExecutionGate ?? null,
    nextSingleAction: state?.nextSingleAction ?? null,
    productWorkAfterControlTower: state?.productWorkAfterControlTower ?? null,
    completedSubGates: state?.completedSubGates ?? [],
    highCostRerunPolicy: RERUN_POLICY,
    developmentGateRerunPolicy: DEV_GATE_RERUN_POLICY,
    allowedMutationClass: ALLOWED_MUTATION_CLASS,
    prohibitedMutationClasses: PROHIBITED_MUTATION_CLASSES,
    currentWave: wave.wave,
    currentWaveStatus: wave.status,
    wave1ProductCommit: wave.wave1ProductCommit,
    masterBacklogStatus: resolveMasterBacklogStatus(state),
    benchmarkAuthority: BENCHMARK_AUTHORITY,
    commercialQualityAuthority: COMMERCIAL_QUALITY_AUTHORITY,
    safariAuthority: SAFARI_AUTHORITY,
    implementerRole: IMPLEMENTER_ROLE,
    independentAuditorRole: INDEPENDENT_AUDITOR_ROLE,
    humanAuthorityRole: HUMAN_AUTHORITY_ROLE,
    requiredNextEvidence: resolveRequiredNextEvidence(state),
    knownEvidenceLimitations: resolveKnownEvidenceLimitations(),
    legacyNarrativeDrift: legacyDrift?.drift === true,
    legacyNarrativeDriftReason: legacyDrift?.reason ?? null,
    semanticValidationErrors: validationErrors,
    contentIntegritySummary: integrity,
    SITEWIDE_JAPANESE_EDITORIAL_QUALITY: deriveSitewideJapaneseEditorialQuality(integrity),
    CREATOR_REVENUE_E2C2E: deriveCreatorRevenueHandoff(state),
    INFLUENCER_PLATFORM_READINESS: deriveInfluencerPlatformReadiness(state),
    isAuthority: false,
    note: 'Derived observation only. Sole executable authority remains docs/ssot/M55_EXECUTION_STATE.json.',
  };

  return handoff;
}

/**
 * Validate a handoff payload against live runtime. Returns rejection reasons.
 */
export function validateHandoffAgainstRuntime(handoff, liveHandoff) {
  const rejections = [];

  if (!handoff || typeof handoff !== 'object') {
    return ['handoff payload is not an object'];
  }
  if (handoff.isAuthority === true) {
    rejections.push('handoff must never claim isAuthority=true');
  }

  const staleFields = ['HEAD', 'branch', 'currentGate', 'nextSingleAction', 'worktree'];
  for (const field of staleFields) {
    if (handoff[field] != null && liveHandoff[field] != null && handoff[field] !== liveHandoff[field]) {
      rejections.push(`stale handoff field ${field}: ${handoff[field]} !== ${liveHandoff[field]}`);
    }
  }

  if (
    handoff.currentGate &&
    liveHandoff.currentGate &&
    handoff.currentGate !== liveHandoff.currentGate
  ) {
    rejections.push('wrong current gate');
  }
  if (handoff.HEAD && liveHandoff.HEAD && handoff.HEAD !== liveHandoff.HEAD) {
    rejections.push('wrong HEAD');
  }

  if (
    handoff.nextSingleAction &&
    liveHandoff.nextSingleAction &&
    handoff.nextSingleAction !== liveHandoff.nextSingleAction
  ) {
    rejections.push('contradictory nextSingleAction');
  }
  if (
    handoff.currentGate &&
    handoff.nextSingleAction &&
    handoff.currentGate !== handoff.nextSingleAction
  ) {
    rejections.push('contradictory handoff: currentGate !== nextSingleAction');
  }

  if (
    handoff.implementerRole &&
    handoff.independentAuditorRole &&
    handoff.implementerRole === handoff.independentAuditorRole
  ) {
    rejections.push('implementer == independent auditor: independent Safari GREEN impossible');
  }

  return rejections;
}

/**
 * Returns true when a new chat/session alone is claimed as invalidation (forbidden).
 */
export function rejectsNewChatAsInvalidation(claim) {
  if (!claim || typeof claim !== 'object') return false;
  const text = JSON.stringify(claim).toLowerCase();
  return (
    text.includes('new chat') &&
    (text.includes('invalidat') || text.includes('rerun required') || text.includes('must re-audit'))
  );
}

function main() {
  const handoff = buildHandoff();
  const valid = handoff.semanticValidationErrors.length === 0;

  console.log('M55_CONTROL_TOWER_HANDOFF_JSON_START');
  console.log(JSON.stringify(handoff, null, 2));
  console.log('M55_CONTROL_TOWER_HANDOFF_JSON_END');
  console.log('');
  console.log('M55 Control Tower Handoff (derived, not authority)');
  console.log('====================================================');
  console.log(`schema: ${handoff.schemaVersion}`);
  console.log(`worktree: ${handoff.worktree}`);
  console.log(`branch: ${handoff.branch}`);
  console.log(`HEAD: ${handoff.HEAD}`);
  console.log(`current gate: ${handoff.currentGate ?? 'unknown'}`);
  console.log(`NEXT: ${handoff.nextSingleAction ?? 'unknown'}`);
  console.log(`wave: ${handoff.currentWave} (${handoff.currentWaveStatus})`);
  console.log(`dirty paths: ${handoff.dirtyPaths.length}`);
  console.log(`implementer: ${handoff.implementerRole} | auditor: ${handoff.independentAuditorRole}`);

  if (!valid) {
    console.error('');
    console.error('m55:handoff:FAIL');
    for (const message of handoff.semanticValidationErrors) console.error(`- ${message}`);
    process.exit(1);
  }

  console.log('');
  console.log('m55:handoff:PASS');
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  main();
}
