#!/usr/bin/env node
/**
 * M55 Control Tower handoff cold-start tests.
 * Proves a fresh AI session can recover execution state without prior chat memory.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  HANDOFF_SCHEMA_VERSION,
  buildHandoff,
  deriveContentIntegritySummary,
  rejectsNewChatAsInvalidation,
  resolveTsxLoaderImport,
  validateHandoffAgainstRuntime,
} from './m55-control-tower-handoff.mjs';
import { EXECUTION_STATE_PATH } from './m55-control-tower-semantic.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function readExecutionState() {
  return JSON.parse(readFileSync(join(ROOT, EXECUTION_STATE_PATH), 'utf8'));
}

function liveHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function liveBranch() {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

/* ── Cold-start reconstruction ───────────────────────────────────────── */

test('fresh session recovers repository/worktree from live Git runtime', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.worktree, ROOT);
  assert.match(handoff.repository, /m55/);
  assert.equal(handoff.branch, liveBranch());
  assert.equal(handoff.HEAD, liveHead());
});

test('fresh session recovers active gate and NEXT from execution state owner', () => {
  const state = readExecutionState();
  const handoff = buildHandoff();
  assert.equal(handoff.authorityPath, EXECUTION_STATE_PATH);
  assert.equal(handoff.currentGate, state.currentExecutionGate);
  assert.equal(handoff.nextSingleAction, state.nextSingleAction);
  assert.equal(handoff.productWorkAfterControlTower, state.productWorkAfterControlTower);
  assert.equal(handoff.currentGate, handoff.nextSingleAction);
});

test('fresh session recovers current Wave from sitewide transition', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.currentWave, 2);
  assert.equal(handoff.currentWaveStatus, 'CLOSED_GREEN');
  assert.ok(handoff.wave1ProductCommit);
});

test('fresh session recovers Creator Revenue / E2C2E contract from execution state', () => {
  const state = readExecutionState();
  const handoff = buildHandoff();
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.isAuthority, false);
  assert.equal(
    handoff.CREATOR_REVENUE_E2C2E.contractReference,
    'docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md',
  );
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.fourSurfaceCreatorReadiness, 'CLOSED_GREEN');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.productWorkAfterControlTower, 'REVENUE_SAFETY_E2E');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.currentStage, 'REVENUE_SAFETY_E2E');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.creatorReferralStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.attributionStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.commissionLedgerStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.creatorDashboardStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.payoutSettlementStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.stripePayoutProviderStatus, 'UNSELECTED');
  assert.equal(handoff.CREATOR_REVENUE_E2C2E.nextDelta, 'REVENUE_SAFETY_E2E');
  assert.ok(state.completedSubGates.includes('FOUR_SURFACE_CREATOR_READINESS'));
  assert.ok(handoff.CREATOR_REVENUE_E2C2E.stages.includes('FOUR_SURFACE_CREATOR_READINESS'));
  assert.ok(handoff.CREATOR_REVENUE_E2C2E.stages.includes('REVENUE_SAFETY_E2E'));
  assert.ok(
    handoff.CREATOR_REVENUE_E2C2E.stages.includes('M55-INFLUENCER-PRODUCT-LAUNCH-READINESS-CODEX-AUDIT'),
  );
  assert.ok(handoff.CREATOR_REVENUE_E2C2E.stages.includes('PAYOUT_AND_SETTLEMENT'));
});

test('fresh session does not expose stale Social Share nextDelta in influencer readiness', () => {
  const handoff = buildHandoff();
  assert.notEqual(handoff.INFLUENCER_PLATFORM_READINESS.nextDelta, 'CODEX_AFFECTED_DELTA_REAUDIT_THEN_SOCIAL_SHARE_EXPERIENCE');
  assert.notEqual(handoff.INFLUENCER_PLATFORM_READINESS.nextDelta, 'CLOSE_WAVE2_CREATOR_QUALITY_FOUNDATION');
  assert.equal(handoff.INFLUENCER_PLATFORM_READINESS.nextDelta, 'REVENUE_SAFETY_E2E');
});

test('fresh session recovers dirty/index state', () => {
  const handoff = buildHandoff();
  assert.ok(Array.isArray(handoff.dirtyPaths));
  assert.ok(handoff.index);
  assert.equal(typeof handoff.index.stagedCount, 'number');
});

test('fresh session recovers closed/high-cost rerun prohibition', () => {
  const handoff = buildHandoff();
  assert.match(handoff.highCostRerunPolicy, /RERUN_PROHIBITED/);
  assert.match(handoff.highCostRerunPolicy, /new chat\/session is never an invalidating dependency/);
  assert.match(handoff.developmentGateRerunPolicy, /COMPLETED_GATE_REPLAY_PROHIBITED/);
});

test('fresh session recovers implementer/auditor separation', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.implementerRole, 'cursor');
  assert.equal(handoff.independentAuditorRole, 'codex');
  assert.equal(handoff.humanAuthorityRole, 'human');
  assert.notEqual(handoff.implementerRole, handoff.independentAuditorRole);
});

test('fresh session recovers provider mutation prohibition', () => {
  const handoff = buildHandoff();
  assert.ok(handoff.prohibitedMutationClasses.includes('stripe_mutation'));
  assert.ok(handoff.prohibitedMutationClasses.includes('clerk_mutation'));
  assert.ok(handoff.prohibitedMutationClasses.includes('db_write'));
  assert.ok(handoff.prohibitedMutationClasses.includes('production_data_mutation'));
});

test('fresh session recovers benchmark authority paths', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.benchmarkAuthority, 'docs/ssot/M55_UX_BENCHMARK_STACK.md');
  assert.equal(handoff.commercialQualityAuthority, 'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md');
  assert.equal(handoff.safariAuthority, 'docs/ssot/M55_SAFARI_MCP_AI_BROWSER_QUALITY_SSOT.md');
});

test('fresh session recovers required next evidence', () => {
  const handoff = buildHandoff();
  assert.ok(handoff.requiredNextEvidence.length > 0);
  assert.ok(handoff.knownEvidenceLimitations.length > 0);
});

test('handoff is explicitly not authority', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.isAuthority, false);
  assert.equal(handoff.schemaVersion, HANDOFF_SCHEMA_VERSION);
});

test('handoff has no semantic validation errors on clean baseline', () => {
  const handoff = buildHandoff();
  assert.deepEqual(handoff.semanticValidationErrors, []);
});

test('handoff derives sitewide Japanese and influencer readiness blocks', () => {
  const handoff = buildHandoff();
  assert.equal(handoff.SITEWIDE_JAPANESE_EDITORIAL_QUALITY.isAuthority, false);
  assert.equal(handoff.INFLUENCER_PLATFORM_READINESS.isAuthority, false);
  assert.equal(handoff.INFLUENCER_PLATFORM_READINESS.creatorReferralStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.INFLUENCER_PLATFORM_READINESS.creatorDashboardStatus, 'NOT_IMPLEMENTED');
  assert.equal(handoff.INFLUENCER_PLATFORM_READINESS.humanEconomicApprovalStatus, 'NOT_GRANTED');
  assert.ok(handoff.contentIntegritySummary);
  assert.equal(typeof handoff.contentIntegritySummary.unresolvedP0, 'number');
});

test('handoff retains deferred dead-copy and preserved product-term observations when unresolvedP2=0', () => {
  const handoff = buildHandoff();
  const sitewide = handoff.SITEWIDE_JAPANESE_EDITORIAL_QUALITY;
  assert.equal(typeof sitewide.unresolvedP2, 'number');
  assert.ok(sitewide.unresolvedP2Interpretation);
  assert.ok(Array.isArray(sitewide.retainedQualityObservations));
  assert.ok(
    sitewide.retainedQualityObservations.some(
      (o) =>
        o.classification === 'DEFERRED_DEAD_NO_RUNTIME_IMPACT' &&
        o.path.includes('projectCompatibilityFreeNarrativeV1'),
    ),
  );
  assert.ok(
    sitewide.retainedQualityObservations.some(
      (o) =>
        o.classification === 'DEFERRED_DEAD_NO_RUNTIME_IMPACT' &&
        o.path.includes('projectCompatibilityPaidNarrativeV1'),
    ),
  );
  assert.ok(
    sitewide.retainedQualityObservations.some(
      (o) => o.classification === 'HUMAN_PRESERVED_PRODUCT_TERM' && o.observation.includes('仕様'),
    ),
  );
});

test('resolveTsxLoaderImport resolves installed package export without index.js fallback', () => {
  const loader = resolveTsxLoaderImport(ROOT);
  assert.equal(loader.ok, true);
  assert.ok(loader.resolvedPath.includes('tsx'));
  assert.ok(loader.resolvedPath.endsWith('.mjs'));
  assert.equal(loader.resolvedPath.endsWith('index.js'), false);
  assert.equal(existsSync(loader.resolvedPath), true);
  assert.match(loader.importSpecifier, /^file:\/\//);
});

test('deriveContentIntegritySummary succeeds with deterministic tsx loader resolution', () => {
  const summary = deriveContentIntegritySummary();
  assert.equal(summary.ok, true);
  assert.equal(typeof summary.value.corpusItems, 'number');
  assert.ok(summary.value.corpusItems > 0);
  assert.equal(typeof summary.value.unresolvedP0, 'number');
});

test('deriveContentIntegritySummary fails closed when tsx loader resolution is unavailable', () => {
  const summary = deriveContentIntegritySummary({
    resolveTsxLoaderImport: () => ({ ok: false, error: 'injected loader resolution failure' }),
  });
  assert.equal(summary.ok, false);
  assert.match(summary.error, /tsx loader resolution failed/);
});

test('buildHandoff fails closed when content integrity derivation fails', () => {
  const handoff = buildHandoff({
    deriveContentIntegritySummary: () => ({
      ok: false,
      error: 'injected derivation failure',
    }),
  });
  assert.equal(handoff.contentIntegritySummary, null);
  assert.ok(
    handoff.semanticValidationErrors.some((message) =>
      message.includes('content integrity derivation failed: injected derivation failure'),
    ),
  );
  assert.equal(handoff.SITEWIDE_JAPANESE_EDITORIAL_QUALITY.pairFreeStatus, 'PENDING_CODEX_AFFECTED_DELTA_REAUDIT');
});

test('derivation failure cannot yield operational handoff PASS contract', () => {
  const handoff = buildHandoff({
    deriveContentIntegritySummary: () => ({
      ok: false,
      error: 'injected derivation failure',
    }),
  });
  const valid = handoff.semanticValidationErrors.length === 0;
  assert.equal(valid, false);
  const cli = spawnSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { buildHandoff } from './scripts/m55-control-tower-handoff.mjs';
const handoff = buildHandoff({
  deriveContentIntegritySummary: () => ({ ok: false, error: 'injected derivation failure' }),
});
process.exit(handoff.semanticValidationErrors.length === 0 ? 0 : 1);`,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.notEqual(cli.status, 0);
});

/* ── Rejection cases ───────────────────────────────────────────────── */

test('STALE HANDOFF → REJECT', () => {
  const live = buildHandoff();
  const stale = { ...live, HEAD: '0000000000000000000000000000000000000000' };
  const rejections = validateHandoffAgainstRuntime(stale, live);
  assert.ok(rejections.some((r) => r.includes('stale') || r.includes('wrong HEAD')));
});

test('WRONG HEAD → REJECT', () => {
  const live = buildHandoff();
  const wrong = { ...live, HEAD: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' };
  const rejections = validateHandoffAgainstRuntime(wrong, live);
  assert.ok(rejections.length > 0);
});

test('WRONG CURRENT GATE → REJECT', () => {
  const live = buildHandoff();
  const wrong = { ...live, currentGate: 'FAKE-GATE-TOKEN' };
  const rejections = validateHandoffAgainstRuntime(wrong, live);
  assert.ok(rejections.some((r) => r.includes('gate')));
});

test('CONTRADICTORY HANDOFF → REJECT', () => {
  const live = buildHandoff();
  const contradictory = {
    ...live,
    currentGate: live.currentGate,
    nextSingleAction: 'DIFFERENT-GATE-TOKEN',
  };
  const rejections = validateHandoffAgainstRuntime(contradictory, live);
  assert.ok(rejections.some((r) => r.includes('contradictory')));
});

test('IMPLEMENTER == INDEPENDENT AUDITOR → REJECT', () => {
  const live = buildHandoff();
  const sameRole = { ...live, implementerRole: 'cursor', independentAuditorRole: 'cursor' };
  const rejections = validateHandoffAgainstRuntime(sameRole, live);
  assert.ok(rejections.some((r) => r.includes('implementer == independent auditor')));
});

test('handoff claiming isAuthority=true → REJECT', () => {
  const live = buildHandoff();
  const fake = { ...live, isAuthority: true };
  const rejections = validateHandoffAgainstRuntime(fake, live);
  assert.ok(rejections.some((r) => r.includes('isAuthority')));
});

test('NEW CHAT ALONE → DOES NOT INVALIDATE CLOSED GREEN EVIDENCE', () => {
  assert.equal(rejectsNewChatAsInvalidation({ reason: 'new chat opened' }), false);
  assert.equal(
    rejectsNewChatAsInvalidation({ reason: 'new chat session invalidates closed green evidence' }),
    true,
  );
  assert.equal(
    rejectsNewChatAsInvalidation({ note: 'rerun required because new chat' }),
    true,
  );
});

test('expectedHead mismatch surfaces in semanticValidationErrors', () => {
  const handoff = buildHandoff({ expectedHead: '0000000000000000000000000000000000000000' });
  assert.ok(handoff.semanticValidationErrors.some((e) => e.includes('HEAD mismatch')));
});

test('expectedGate mismatch surfaces in semanticValidationErrors', () => {
  const handoff = buildHandoff({ expectedGate: 'FAKE-GATE' });
  assert.ok(handoff.semanticValidationErrors.some((e) => e.includes('current gate mismatch')));
});

test('m55:handoff CLI exits zero on clean baseline', () => {
  const out = execFileSync('node', ['scripts/m55-control-tower-handoff.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.match(out, /m55:handoff:PASS/);
  assert.match(out, /M55_CONTROL_TOWER_HANDOFF_JSON_START/);
  assert.doesNotMatch(out, /m55:handoff:FAIL/);
});
