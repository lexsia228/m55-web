/**
 * Human-operated plan entry for one Preview consult migration.
 * Default output is PLAN_ONLY. --live checks the controlling terminal
 * independently of stdin, then the deny-by-default execution gate.
 * Secrets stay on stdin. A CLI flag is not the Preview mutation GO.
 */
import { resolve } from 'node:path';
import {
  PAIR_CONSULT_EXACT_VERSION,
  PAIR_CONSULT_LIVE_EXECUTION_READY,
  evaluatePairConsultExactVersionIdentity,
  executePairConsultHumanOperatedPreview,
  loadFrozenConsultMigrationBytes,
  observeConsultGitIdentity,
  simulatePairConsultExactVersion,
} from '../../lib/m55/previewRemoteApply/pairConsultExactVersionPreviewExecutor.ts';

const repoRoot = resolve(process.cwd());
const liveRequested = process.argv.includes('--live');
const simulateRequested = process.argv.includes('--simulate');
const forgedFlag = process.argv.includes('--yes') || process.argv.includes('--force');

if (liveRequested) {
  if (forgedFlag) {
    process.stderr.write('AUTHORIZATION_BLOCKED FORGED_AUTHORIZATION\n');
    process.exit(2);
  }
  const result = await executePairConsultHumanOperatedPreview({
    repoRoot,
    yes: false,
    force: false,
  });
  if (result.transactionCommitted) {
    process.stdout.write(`${JSON.stringify({
      mode: 'REAL_PREVIEW_EXECUTION',
      disposition: result.disposition,
      transactionCommitted: true,
      runtimeApplied: true,
      catalogRuntimeVerified: result.catalogRuntimeVerified,
      liveExecutionReady: result.liveExecutionReady,
    })}\n`);
    process.exit(result.catalogRuntimeVerified ? 0 : 2);
  }
  if (result.disposition !== 'LOCAL_TRANSPORT_CONTRACT_PASS') {
    process.stderr.write(`AUTHORIZATION_BLOCKED ${result.reason}\n`);
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify({
    mode: 'HUMAN_OPERATED_LOCAL_TRANSPORT',
    runtimeApplied: result.runtimeApplied,
    transactionCommitted: result.transactionCommitted,
    catalogGreen: result.catalogGreen,
    catalogRuntimeVerified: result.catalogRuntimeVerified,
    liveExecutionReady: result.liveExecutionReady,
  })}\n`);
  process.exit(0);
}

const git = observeConsultGitIdentity(repoRoot);
if (!git.ok) {
  process.stderr.write(`HOLD_${git.reason}\n`);
  process.exit(2);
}

const identity = evaluatePairConsultExactVersionIdentity({
  projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
  sqlBytes: loadFrozenConsultMigrationBytes(repoRoot),
  localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
});

if (!identity.ok) {
  process.stderr.write(`HOLD_${identity.reason}\n`);
  process.exit(2);
}

if (simulateRequested) {
  const simulation = await simulatePairConsultExactVersion({
    sqlBytes: loadFrozenConsultMigrationBytes(repoRoot),
    localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
  });
  process.stdout.write(`${JSON.stringify({
    mode: 'LOCAL_SIMULATION',
    disposition: simulation.disposition,
    reason: simulation.reason,
    localContractPass: simulation.localContractPass,
    runtimeApplied: simulation.runtimeApplied,
    catalogGreen: simulation.catalogGreen,
    liveExecutionReady: simulation.liveExecutionReady,
    commitAttempts: simulation.commitAttempts,
  })}\n`);
  process.exit(simulation.localContractPass ? 0 : 2);
}

process.stdout.write(`${JSON.stringify({
  mode: 'PLAN_ONLY',
  version: PAIR_CONSULT_EXACT_VERSION.version,
  name: PAIR_CONSULT_EXACT_VERSION.name,
  projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
  projectName: PAIR_CONSULT_EXACT_VERSION.projectName,
  gitBlobSha1: identity.gitBlobSha1,
  statementCount: identity.statements.length,
  branch: git.branch,
  head: git.head,
  live: false,
  liveExecutionReady: PAIR_CONSULT_LIVE_EXECUTION_READY,
})}\n`);
