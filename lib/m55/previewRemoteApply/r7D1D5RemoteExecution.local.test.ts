import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildCanonicalExpectedManifest,
  FROZEN_DELTA_SOURCE_SPECS,
  FROZEN_PREVIEW_HISTORY_SNAPSHOT,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
  type ExternalReviewedCandidateBinding,
  type R7DeltaStepId,
} from './r7D1D5OfflinePlan.ts';
import type { R7HumanExecutionAuthorizationDocument } from './r7D1D5ExecutionAuthorization.ts';
import {
  R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID,
  buildExecutionCandidateBundleDigestsFromRepo,
  validateR7ExecutionAuthorizationGate,
  validateReviewedCandidateBundleDigests,
} from './r7D1D5ExecutionAuthorization.ts';
import {
  loadR7RuntimeProbeRegistry,
  R7_PROBE_NEGATIVE_FIXTURES,
  R7_RUNTIME_PROBE_IDS,
  resetR7RuntimeProbeRegistryCacheForTests,
  validateR7RuntimeProbeResult,
} from './r7D1D5RuntimeProbes.ts';
import {
  createR7FakeTransport,
  executeR7DeltaStepOffline,
  R7_DELTA_STEP_ORDER,
  R7_LIVE_EXECUTION_MIGRATION_LOCK_REQUIREMENT,
  resolveR7StepPlan,
} from './r7D1D5RemoteExecution.ts';
import {
  parseR7RemoteExecutionArgv,
  runR7PreviewD1D5RemoteExecutionCli,
} from '../../../scripts/m55/runR7PreviewD1D5RemoteExecution.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const HEAD_SHA = '00119f79fb95ca44d4ff0861270482acb7302386';

const EXPECTED_COMPOSITES: Record<R7DeltaStepId, string> = {
  D1: 'a75610d21f75f791c6424817afed00dca5f21e3c9b16eed4955b8dd6d16023df',
  D2: '97a07e8deb1395812013ff15133116e99ebc5dabef212411d5e78dd24a9b15ea',
  D3: 'ddcf10b15831182577301364f694dafb7202fdfbf67ed8f772ea42b2b41d401c',
  D4: '5f8bc286e9912d8d84c51eef6d6868ec1bea2ab23646b6a9ea5057715e3f67a4',
  D5: '10bd7d078c535a389d7e5f1d10410591c8191657cfc3f1f161e31c54adaf49a4',
};

function tailVersion(stepId: R7DeltaStepId): string {
  const manifest = buildCanonicalExpectedManifest(REPO_ROOT);
  const step = manifest.steps.find((s) => s.stepId === stepId);
  assert.ok(step);
  const prior = step.historyPrefixPrior;
  return prior[prior.length - 1].version;
}

function makeBinding(): ExternalReviewedCandidateBinding {
  return {
    candidateCommitSha: HEAD_SHA,
    branch: R7_PR249_FROZEN_BRANCH,
    fileSha256ByRelativePath: buildExecutionCandidateBundleDigestsFromRepo(REPO_ROOT),
  };
}

function makeHumanAuth(stepId: R7DeltaStepId): R7HumanExecutionAuthorizationDocument {
  const spec = FROZEN_DELTA_SOURCE_SPECS.find((s) => s.stepId === stepId);
  assert.ok(spec);
  const manifest = buildCanonicalExpectedManifest(REPO_ROOT);
  const step = manifest.steps.find((s) => s.stepId === stepId);
  assert.ok(step);
  return {
    documentId: R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID,
    authorizedStepId: stepId,
    candidateCommitSha: HEAD_SHA,
    repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    previewProject: 'm55-soul-preview',
    previewProjectRef: 'sbogwyzldjxxouhqtpnq',
    sourceSha256: spec.sourceSha256,
    normalizedStreamCompositeSha256: EXPECTED_COMPOSITES[stepId],
    preProbeId: step.catalogProbes.preProbeId as R7HumanExecutionAuthorizationDocument['preProbeId'],
    postProbeId: step.catalogProbes.postProbeId as R7HumanExecutionAuthorizationDocument['postProbeId'],
    expectedPriorHistoryVersionTail: tailVersion(stepId),
    executionAuthorized: true,
  };
}

function transportForStep(stepId: R7DeltaStepId) {
  const manifest = buildCanonicalExpectedManifest(REPO_ROOT);
  const step = manifest.steps.find((s) => s.stepId === stepId);
  assert.ok(step);
  return createR7FakeTransport(step.historyPrefixPrior);
}

describe('r7D1D5RemoteExecution local gate', () => {
  it('documents live migration lock requirement constant', () => {
    assert.match(R7_LIVE_EXECUTION_MIGRATION_LOCK_REQUIREMENT, /FAIL_CLOSED/);
  });

  it('expects D1 history insert with pre-applied ledger retained at sorted tail (PRE17→POST18)', () => {
    const d1 = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(d1);
    const prior = d1.historyPrefixPrior.map((e) => e.version);
    const post = d1.historyPrefixPost.map((e) => e.version);
    assert.equal(prior.length, 17);
    assert.equal(post.length, 18);
    assert.ok(prior.includes('20261008200000'));
    assert.ok(post.includes('20260924000000'));
    assert.equal(post.at(-1), '20261008200000');
  });

  it('enforces exact five-step order and statement counts', () => {
    assert.deepEqual(R7_DELTA_STEP_ORDER, ['D1', 'D2', 'D3', 'D4', 'D5']);
    for (const spec of FROZEN_DELTA_SOURCE_SPECS) {
      const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === spec.stepId);
      assert.equal(step?.source.sourceStatementCount, spec.sourceStatementCount);
      assert.equal(step?.historyPrefixPrior.length, 17 + R7_DELTA_STEP_ORDER.indexOf(spec.stepId));
      assert.equal(step?.historyPrefixPost.length, step?.historyPrefixPrior.length + 1);
    }
  });

  it('registers ten probes with stable SQL digests', () => {
    resetR7RuntimeProbeRegistryCacheForTests();
    const registry = loadR7RuntimeProbeRegistry(REPO_ROOT);
    assert.equal(registry.size, 10);
    for (const id of R7_RUNTIME_PROBE_IDS) {
      const def = registry.get(id);
      assert.ok(def);
      assert.equal(def.sqlSha256.length, 64);
      assert.match(def.sqlText.trim().toUpperCase(), /^SELECT/);
      assert.doesNotMatch(def.sqlText.trim(), /^(INSERT|UPDATE|DELETE|DROP|ALTER)\b/im);
    }
  });

  it('probe validators fail closed on negative fixtures', () => {
    for (const fixture of Object.values(R7_PROBE_NEGATIVE_FIXTURES)) {
      const result = validateR7RuntimeProbeResult(fixture.probeId, { probe_payload: fixture.payload });
      assert.equal(result.ok, false);
    }
  });

  it('holds on candidate bundle digest mismatch and missing paths', () => {
    const binding = makeBinding();
    const badBinding = {
      ...binding,
      fileSha256ByRelativePath: { 'lib/m55/previewRemoteApply/r7D1D5RemoteExecution.ts': 'deadbeef' },
    };
    const mismatch = validateReviewedCandidateBundleDigests(REPO_ROOT, badBinding);
    assert.equal(mismatch.ok, false);

    const gate = validateR7ExecutionAuthorizationGate({
      repoRoot: REPO_ROOT,
      selectedStepId: 'D1',
      repositoryRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      reviewedCandidateBinding: { ...binding, fileSha256ByRelativePath: {} },
      humanAuthorization: makeHumanAuth('D1'),
      sourceSha256: FROZEN_DELTA_SOURCE_SPECS[0].sourceSha256,
      normalizedStreamCompositeSha256: EXPECTED_COMPOSITES.D1,
      preProbeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
      postProbeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
      expectedPriorHistoryVersionTail: tailVersion('D1'),
      offlineManifestExecutionAuthorized: false,
    });
    assert.equal(gate.ok, false);
  });

  it('D5 duplicate ACTIVE and broken partial index fail post probe before commit', async () => {
    const transport = transportForStep('D5');
    transport.catalog.d5DuplicateActiveViolation = true;
    const dup = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D5',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D5'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(dup.outcome, 'PRE_COMMIT_FAILURE');
    assert.equal(dup.holdReasonCode, 'HOLD_PROBE_CATALOG_STATE_MISMATCH');
    assert.equal(transport.rolledBack, true);
    assert.equal(transport.committed, false);

    const transport2 = transportForStep('D5');
    transport2.catalog.d5IndexPredicateOk = false;
    const broken = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D5',
      transport: transport2,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D5'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(broken.outcome, 'PRE_COMMIT_FAILURE');
    assert.equal(transport2.rolledBack, true);
  });

  it('holds on source digest mismatch', () => {
    const spec = FROZEN_DELTA_SOURCE_SPECS[0];
    assert.throws(() =>
      resolveR7StepPlan({
        repoRoot: REPO_ROOT,
        stepId: 'D1',
        expectedSourceSha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        expectedNormalizedCompositeSha256: EXPECTED_COMPOSITES.D1,
      }),
    );
    assert.throws(() =>
      resolveR7StepPlan({
        repoRoot: REPO_ROOT,
        stepId: 'D1',
        expectedSourceSha256: spec.sourceSha256,
        expectedNormalizedCompositeSha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      }),
    );
  });

  it('holds on history prefix mismatch for each step after BEGIN', async () => {
    for (const stepId of R7_DELTA_STEP_ORDER) {
      const transport = createR7FakeTransport(FROZEN_PREVIEW_HISTORY_SNAPSHOT.slice(0, 15));
      const evidence = await executeR7DeltaStepOffline({
        repoRoot: REPO_ROOT,
        branch: R7_PR249_FROZEN_BRANCH,
        headCommitSha: HEAD_SHA,
        stepId,
        transport,
        reviewedCandidateBinding: makeBinding(),
        humanAuthorization: makeHumanAuth(stepId),
        offlineManifestExecutionAuthorized: false,
        allowLiveTransport: false,
      });
      assert.equal(evidence.holdReasonCode, 'HOLD_HISTORY_PREFIX_MISMATCH');
      const beginIdx = evidence.lifecycleStages.indexOf('BEGIN');
      const prefixIdx = evidence.lifecycleStages.indexOf('HISTORY_PREFIX_CHECK');
      assert.ok(beginIdx >= 0 && prefixIdx > beginIdx);
    }
  });

  it('holds on missing candidate binding and human authorization', async () => {
    const transport = transportForStep('D1');
    const noBinding = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport,
      reviewedCandidateBinding: null,
      humanAuthorization: null,
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(noBinding.holdReasonCode, 'HOLD_MISSING_REVIEWED_CANDIDATE_BINDING');

    const gate = validateR7ExecutionAuthorizationGate({
      repoRoot: REPO_ROOT,
      selectedStepId: 'D1',
      repositoryRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: null,
      sourceSha256: FROZEN_DELTA_SOURCE_SPECS[0].sourceSha256,
      normalizedStreamCompositeSha256: EXPECTED_COMPOSITES.D1,
      preProbeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
      postProbeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
      expectedPriorHistoryVersionTail: tailVersion('D1'),
      offlineManifestExecutionAuthorized: false,
    });
    assert.equal(gate.ok, false);
  });

  it('holds on wrong repository and branch', async () => {
    const wrongRepo = await executeR7DeltaStepOffline({
      repoRoot: '/tmp/not-r7',
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport: transportForStep('D1'),
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(wrongRepo.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');

    const wrongBranch = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: 'feat/other',
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport: transportForStep('D1'),
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(wrongBranch.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('runs successful fake lifecycle for D1 with BEGIN before prefix and catalog checks', async () => {
    const transport = transportForStep('D1');
    const evidence = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
    assert.equal(evidence.statementCount, 63);
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(evidence.postCommitVerificationState, 'HISTORY_READONLY_VERIFIED');
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.deepEqual(evidence.lifecycleStages, [
      'TARGET_IDENTITY_CHECK',
      'AUTHORIZATION_GATE',
      'BEGIN',
      'HISTORY_PREFIX_CHECK',
      'PRE_PROBE',
      'MUTATION_STATEMENTS',
      'HISTORY_INSERT',
      'POST_PROBE',
      'COMMIT',
      'POST_COMMIT_READONLY_VERIFICATION',
      'STOP',
    ]);
    const serialized = JSON.stringify(evidence);
    assert.doesNotMatch(serialized, /password|secret|Bearer|postgres:\/\//i);
  });

  it('uncertain COMMIT is contradictory drift, never classified as not committed', async () => {
    const transport = transportForStep('D2');
    transport.commitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
    const evidence = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D2',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D2'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(evidence.holdReasonCode, 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP');
    assert.equal(evidence.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(evidence.postCommitVerificationState, 'PENDING_FRESH_READONLY_CLASSIFICATION');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(transport.ambiguousCommit, true);
    assert.equal(transport.committed, false);
  });

  it('failed post-commit verification is not successful completion', async () => {
    const transport = transportForStep('D3');
    transport.postCommitHistoryMismatch = true;
    const evidence = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D3',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D3'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_VERIFICATION_FAILED');
    assert.equal(evidence.outcome, 'HOLD');
    assert.notEqual(evidence.outcome, 'SUCCESS');
    assert.equal(evidence.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(evidence.postCommitVerificationState, 'CONTRADICTORY_OR_DRIFTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
  });

  it('rollback restores fake transactional mutations', async () => {
    const transport = transportForStep('D1');
    const before = [...transport.historyVersions];
    transport.begin();
    await transport.query('SELECT 1');
    transport.rollback();
    assert.deepEqual(transport.historyVersions, before);
    assert.equal(transport.executedStatements.length, 0);
  });

  it('CLI rejects unknown flags and unauthorized invocation', async () => {
    assert.deepEqual(parseR7RemoteExecutionArgv(['--step', 'D9']), { stepId: null, unknownFlags: ['--step'] });
    const hold = await runR7PreviewD1D5RemoteExecutionCli(['--step', 'D1']);
    assert.equal(hold.mode, 'R7_D1_D5_REMOTE_EXECUTION_HOLD');
    assert.equal(hold.holdReasonCode, 'HOLD_MISSING_REVIEWED_CANDIDATE_BINDING');
    const forbidden = await runR7PreviewD1D5RemoteExecutionCli(['--database-url', 'x']);
    assert.equal(forbidden.mode, 'R7_D1_D5_REMOTE_EXECUTION_HOLD');
    assert.equal(forbidden.holdReasonCode, 'HOLD_FORBIDDEN_CLI_FLAG');
  });

  it('enforces one selected step per execution call (no in-call chaining)', async () => {
    const transport = transportForStep('D1');
    const first = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(first.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
    assert.equal(first.ackState, 'DEFINITELY_COMMITTED');
    const second = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D2',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D2'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(second.stepId, 'D2');
    assert.equal(second.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
  });

  it('fails closed when migration lock contract is missing on transport', async () => {
    const transport = {
      ...transportForStep('D1'),
      migrationLockContractSatisfied: false,
    };
    const evidence = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_MIGRATION_LOCK_CONTRACT_MISSING');
  });

  it('rejects malformed Human authorization documentId', () => {
    const auth = { ...makeHumanAuth('D1'), documentId: 'WRONG_DOCUMENT_ID' as typeof R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID };
    const gate = validateR7ExecutionAuthorizationGate({
      repoRoot: REPO_ROOT,
      selectedStepId: 'D1',
      repositoryRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: auth,
      sourceSha256: FROZEN_DELTA_SOURCE_SPECS[0].sourceSha256,
      normalizedStreamCompositeSha256: EXPECTED_COMPOSITES.D1,
      preProbeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
      postProbeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
      expectedPriorHistoryVersionTail: tailVersion('D1'),
      offlineManifestExecutionAuthorized: false,
    });
    assert.equal(gate.ok, false);
    if (!gate.ok) {
      assert.equal(gate.holdReasonCode, 'HOLD_HUMAN_AUTHORIZATION_DOCUMENT_ID_MISMATCH');
    }
  });

  it('handles injected history read and commit transport failures', async () => {
    const transport = transportForStep('D1');
    transport.injectFailures.throwOnHistoryRead = true;
    const historyFail = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(historyFail.holdReasonCode, 'HOLD_HISTORY_READONLY_QUERY_FAILED');
    assert.equal(transport.rolledBack, true);

    const transport2 = transportForStep('D2');
    transport2.injectFailures.throwOnCommit = true;
    const commitFail = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D2',
      transport: transport2,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D2'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(commitFail.holdReasonCode, 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP');
    assert.equal(commitFail.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.notEqual(commitFail.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('D4 invalid index flags fail post probe validation fixtures', () => {
    const result = validateR7RuntimeProbeResult('R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT', {
      probe_payload: R7_PROBE_NEGATIVE_FIXTURES.D4_POST_INDEX_NOT_READY.payload,
    });
    assert.equal(result.ok, false);
  });

  it('D4 rejects prefix-only signature match when later argument is wrong', () => {
    const payload = {
      ledger_table_present: true,
      one_accrual_unique_index_present: true,
      one_accrual_index_on_ledger_table: true,
      one_accrual_index_unique: true,
      one_accrual_index_valid: true,
      one_accrual_index_ready: true,
      one_accrual_index_key_order_ok: true,
      one_accrual_index_predicate_exact_ok: true,
      insert_ledger_function_present: true,
      insert_ledger_function_signature_ok: false,
    };
    const result = validateR7RuntimeProbeResult('R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT', {
      probe_payload: payload,
    });
    assert.equal(result.ok, false);
  });

  it('D5 canonical RPC without service_role EXECUTE fails post probe', async () => {
    const transport = transportForStep('D5');
    transport.catalog.d5CanonicalServiceRoleExecute = false;
    const evidence = await executeR7DeltaStepOffline({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D5',
      transport,
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D5'),
      offlineManifestExecutionAuthorized: false,
      allowLiveTransport: false,
    });
    assert.equal(evidence.outcome, 'PRE_COMMIT_FAILURE');
    assert.equal(transport.rolledBack, true);
  });

  it('D5 overload execute privilege cannot satisfy canonical RPC contract fixture', () => {
    const result = validateR7RuntimeProbeResult('R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT', {
      probe_payload: R7_PROBE_NEGATIVE_FIXTURES.D5_POST_UNAUTHORIZED_RPC_EXECUTE.payload,
    });
    assert.equal(result.ok, false);
  });
});
