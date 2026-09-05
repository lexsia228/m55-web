#!/usr/bin/env node
/**
 * M55 Control Tower context — READ-ONLY local Git runtime + durable execution state.
 * Does not fetch network refs itself and does not access secrets, Stripe, Clerk,
 * Supabase, GitHub API, or Vercel API.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  EXECUTION_STATE_PATH,
  validateExecutionState,
  detectLegacyExecutionDrift,
} from './m55-control-tower-semantic.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPERATIONS_MAP = 'docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md';
const EVIDENCE_LEDGER = 'docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md';
const CURRENT_STATE = 'docs/ssot/M55_CURRENT_STATE.md';

const RERUN_POLICY =
  'RERUN_PROHIBITED unless an invalidating dependency changed (new chat/session is never an invalidating dependency)';
const DEV_GATE_RERUN_POLICY =
  'COMPLETED_GATE_REPLAY_PROHIBITED — new chat/session is never an invalidating dependency';

function gitResult(...args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}
export function git(...args) {
  const result = gitResult(...args);
  if (result.status !== 0) return null;
  return result.stdout.trim();
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
export function parsePorcelainDirtyPaths(rawStdout) {
  if (rawStdout == null || rawStdout === '') return [];
  return rawStdout
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
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
function listDirtyPaths() {
  const result = gitResult('status', '--porcelain=v1');
  if (result.status !== 0) return [];
  return parsePorcelainDirtyPaths(result.stdout);
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
function isAncestor(ancestor, descendant) {
  if (!ancestor || !descendant) return null;
  const result = gitResult('merge-base', '--is-ancestor', ancestor, descendant);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return null;
}
function evaluateTransitionContainment(label, transition, originMain, errors) {
  const featureContained = isAncestor(transition?.featureHeadAtClosure, originMain);
  const mergeContained = isAncestor(transition?.mergeCommit, originMain);
  if (featureContained === false) {
    errors.push(`${label} feature head is not contained in local origin/main — run git fetch origin and STOP if still false`);
  }
  if (mergeContained === false) {
    errors.push(`${label} merge commit is not contained in local origin/main — run git fetch origin and STOP if still false`);
  }
  return { featureContained, mergeContained };
}

function main() {
  const executionSrc = read(EXECUTION_STATE_PATH);
  const currentSrc = read(CURRENT_STATE);
  const { state, errors } = validateExecutionState(executionSrc);
  const legacyDrift = state ? detectLegacyExecutionDrift(state, currentSrc) : null;

  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown';
  const head = git('rev-parse', 'HEAD') ?? 'unknown';
  const originMain = git('rev-parse', 'origin/main');
  const upstream = upstreamRef(branch);
  const divergence = aheadBehind(upstream);
  const staged = git('diff', '--cached', '--name-only');
  const stagedPaths = staged ? staged.split('\n').filter(Boolean) : [];
  const dirty = listDirtyPaths();

  const phaseBTransition = state?.postMergeTransition ?? {};
  const hardeningTransition = state?.controlTowerHardeningTransition ?? {};
  const phaseBContainment = evaluateTransitionContainment('Phase-B transition', phaseBTransition, originMain, errors);
  const hardeningContainment = evaluateTransitionContainment(
    'Control Tower hardening transition',
    hardeningTransition,
    originMain,
    errors,
  );

  const context = {
    repository: git('remote', 'get-url', 'origin') ?? 'unknown',
    worktree: ROOT,
    branch,
    head,
    upstream: upstream ?? 'none',
    originMain: originMain ?? 'unknown',
    ahead: divergence.ahead,
    behind: divergence.behind,
    index: { stagedCount: stagedPaths.length, stagedPaths },
    dirty: { count: dirty.length, paths: dirty },
    semantic: {
      authorityOwner: EXECUTION_STATE_PATH,
      activeLane: state?.macroLane ?? null,
      currentGate: state?.currentExecutionGate ?? null,
      nextSingleAction: state?.nextSingleAction ?? null,
      productWorkAfterControlTower: state?.productWorkAfterControlTower ?? null,
      pairImplementation: state?.pairImplementation ?? null,
      pairPremium: state?.pairPremium ?? null,
      pairFreeToPaidMappingAuthorizedNow: state?.pairFreeToPaidMappingAuthorizedNow ?? null,
      completedSubGates: state?.completedSubGates ?? [],
    },
    phaseBTransition: {
      prNumber: phaseBTransition.prNumber ?? null,
      featureHeadAtClosure: phaseBTransition.featureHeadAtClosure ?? null,
      mergeCommit: phaseBTransition.mergeCommit ?? null,
      featureContainedInLocalOriginMain: phaseBContainment.featureContained,
      mergeContainedInLocalOriginMain: phaseBContainment.mergeContained,
      productionDeploymentIdObserved: phaseBTransition.productionDeploymentId ?? null,
      productionStateObserved: phaseBTransition.productionStateObserved ?? null,
    },
    controlTowerHardeningTransition: {
      prNumber: hardeningTransition.prNumber ?? null,
      featureHeadAtClosure: hardeningTransition.featureHeadAtClosure ?? null,
      mergeCommit: hardeningTransition.mergeCommit ?? null,
      featureContainedInLocalOriginMain: hardeningContainment.featureContained,
      mergeContainedInLocalOriginMain: hardeningContainment.mergeContained,
      productionDeploymentIdObserved: hardeningTransition.productionDeploymentId ?? null,
      productionStateObserved: hardeningTransition.productionStateObserved ?? null,
    },
    legacyNarrativeState: {
      path: CURRENT_STATE,
      executionFieldsSuperseded: state?.legacyExecutionFieldsSuperseded === true,
      driftDetected: legacyDrift?.drift ?? null,
      driftReason: legacyDrift?.reason ?? null,
    },
    ssot: {
      operationsMap: OPERATIONS_MAP,
      highCostEvidenceLedger: EVIDENCE_LEDGER,
      coldStartAcceptance: state?.acceptance?.acceptanceContract ?? null,
    },
    highCostRerunPolicy: RERUN_POLICY,
    developmentGateRerunPolicy: DEV_GATE_RERUN_POLICY,
    remoteProductionReobservationRequired: true,
    creatorRevenue: {
      contractReference: state?.creatorRevenueRoadmapAuthority?.contractReference ?? null,
      currentStage: state?.creatorRevenueRoadmapAuthority?.currentStage ?? null,
      fourSurfaceCreatorReadiness:
        state?.creatorRevenueRoadmapAuthority?.fourSurfaceCreatorReadiness ?? null,
      nextProductGate: state?.productWorkAfterControlTower ?? null,
      creatorReferralStatus: state?.creatorRevenueRoadmapAuthority?.creatorReferralStatus ?? null,
      attributionStatus: state?.creatorRevenueRoadmapAuthority?.attributionStatus ?? null,
      commissionLedgerStatus: state?.creatorRevenueRoadmapAuthority?.commissionLedgerStatus ?? null,
      creatorDashboardStatus: state?.creatorRevenueRoadmapAuthority?.creatorDashboardStatus ?? null,
      payoutSettlementStatus: state?.creatorRevenueRoadmapAuthority?.payoutSettlementStatus ?? null,
      stripePayoutProviderStatus:
        state?.creatorRevenueRoadmapAuthority?.stripePayoutProviderStatus ?? null,
      stages: state?.creatorRevenueRoadmapAuthority?.stages ?? [],
    },
    semanticValidationErrors: errors,
    note: 'This command does not git fetch. Run git fetch origin first when local network is authorized. Remote-only GPT must declare LOCAL_RUNTIME_UNAVAILABLE instead of fabricating local facts.',
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
  console.log(`origin/main: ${context.originMain}`);
  console.log(`ahead/behind vs upstream: ${context.ahead ?? '?'} / ${context.behind ?? '?'}`);
  console.log(`index staged: ${context.index.stagedCount}`);
  console.log(`dirty paths: ${context.dirty.count}`);
  console.log('');
  console.log(`semantic authority owner: ${context.semantic.authorityOwner}`);
  console.log(`macro lane: ${context.semantic.activeLane ?? 'unknown'}`);
  console.log(`current gate: ${context.semantic.currentGate ?? 'unknown'}`);
  console.log(`NEXT SINGLE ACTION: ${context.semantic.nextSingleAction ?? 'unknown'}`);
  console.log(`product after control tower: ${context.semantic.productWorkAfterControlTower ?? 'unknown'}`);
  console.log(`creator revenue contract: ${context.creatorRevenue.contractReference ?? 'unknown'}`);
  console.log(`creator revenue stage: ${context.creatorRevenue.currentStage ?? 'unknown'}`);
  console.log(`R1 four-surface readiness: ${context.creatorRevenue.fourSurfaceCreatorReadiness ?? 'unknown'}`);
  console.log(`Pair mapping authorized now: ${context.semantic.pairFreeToPaidMappingAuthorizedNow}`);
  console.log(`legacy CURRENT_STATE drift detected: ${context.legacyNarrativeState.driftDetected}`);
  console.log(`Phase-B feature contained in origin/main: ${context.phaseBTransition.featureContainedInLocalOriginMain}`);
  console.log(`Phase-B merge contained in origin/main: ${context.phaseBTransition.mergeContainedInLocalOriginMain}`);
  console.log(`Control Tower feature contained in origin/main: ${context.controlTowerHardeningTransition.featureContainedInLocalOriginMain}`);
  console.log(`Control Tower merge contained in origin/main: ${context.controlTowerHardeningTransition.mergeContainedInLocalOriginMain}`);
  console.log('');
  console.log(`high-cost rerun policy: ${RERUN_POLICY}`);
  console.log(`development-gate replay policy: ${DEV_GATE_RERUN_POLICY}`);

  if (errors.length > 0) {
    console.error('');
    console.error('m55:context:FAIL');
    for (const message of errors) console.error(`- ${message}`);
    process.exit(1);
  }

  console.log('');
  console.log('m55:context:PASS');
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  main();
}
