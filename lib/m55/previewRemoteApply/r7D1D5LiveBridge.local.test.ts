import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
} from './types.ts';
import {
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  TLS_TRUST_PROFILE,
  expectedConnectionUserForProjectRef,
} from './remoteConnectionAuthority.ts';
import type { CommitResponseClass } from './remoteExecutionLifecycleAuthority.ts';
import {
  buildCanonicalExpectedManifest,
  FROZEN_DELTA_SOURCE_SPECS,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
  type ExternalReviewedCandidateBinding,
  type R7DeltaStepId,
} from './r7D1D5OfflinePlan.ts';
import {
  buildExecutionCandidateBundleDigestsFromRepo,
  R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID,
  type R7HumanExecutionAuthorizationDocument,
} from './r7D1D5ExecutionAuthorization.ts';
import {
  R7_D1_D5_MIGRATION_COORDINATION_LOCK_DISCLAIMER,
  R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL,
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
  R7_LIVE_BRIDGE_HISTORY_READONLY_SELECT_SQL,
  R7_LIVE_BRIDGE_READONLY_TX_SQL,
  R7_LIVE_BRIDGE_IMPLEMENTATION_MODE,
  R7_LIVE_BRIDGE_LOCAL_MOCK_BOUNDARY_NOTE,
  R7_LIVE_BRIDGE_READONLY_MOCK_HONESTY_NOTE,
  assertR7LiveBridgeRuntimeAuthorization,
  executeR7DeltaStepLiveBridge,
  isR7LiveBridgeHarnessSessionInstance,
  readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun,
  runR7LiveBridgeLocalNodeTestDeterministicLifecycle,
  type R7DeterministicHarnessSessionScenario,
  type R7LiveBridgeLocalNodeTestHarnessConfig,
  validateR7LiveBridgePostConnectGuardResult,
  validateR7LiveBridgePreviewTargetBinding,
  type ExecuteR7LiveBridgePublicInput,
  type R7LiveBridgePgSession,
  type R7LiveBridgeTargetObservedFacts,
} from './r7D1D5LiveBridge.ts';
import { R7_DELTA_STEP_ORDER } from './r7D1D5RemoteExecution.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';
import {
  parseR7LiveBridgeArgv,
  runR7PreviewD1D5LiveBridgeCli,
} from '../../../scripts/m55/runR7PreviewD1D5LiveBridge.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const HEAD_SHA = 'b9ca07d8ca0559bb95ea949771c07e4a36fcea59';

type LocalNodeTestBridgeInput = ExecuteR7LiveBridgePublicInput & {
  readonly localNodeTestHarness: R7LiveBridgeLocalNodeTestHarnessConfig;
};

async function simulateLiveBridge(input: LocalNodeTestBridgeInput) {
  return runR7LiveBridgeLocalNodeTestDeterministicLifecycle(input);
}

function transactionQuerySqlTrace(): readonly string[] {
  return readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun();
}

const EXPECTED_COMPOSITES: Record<R7DeltaStepId, string> = {
  D1: 'a75610d21f75f791c6424817afed00dca5f21e3c9b16eed4955b8dd6d16023df',
  D2: '97a07e8deb1395812013ff15133116e99ebc5dabef212411d5e78dd24a9b15ea',
  D3: 'ddcf10b15831182577301364f694dafb7202fdfbf67ed8f772ea42b2b41d401c',
  D4: '5f8bc286e9912d8d84c51eef6d6868ec1bea2ab23646b6a9ea5057715e3f67a4',
  D5: '10bd7d078c535a389d7e5f1d10410591c8191657cfc3f1f161e31c54adaf49a4',
};

function approvedTargetFacts(): R7LiveBridgeTargetObservedFacts {
  return {
    organizationSlug: APPROVED_PREVIEW_ORGANIZATION,
    projectName: APPROVED_PREVIEW_PROJECT,
    projectRef: R7_PREVIEW_TARGET_PROJECT_REF,
    databaseName: 'postgres',
    host: SESSION_POOLER_HOST,
    hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
    port: 5432,
    sslmode: 'require',
    connectionUser: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
    credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
    tlsTrustProfile: TLS_TRUST_PROFILE,
  };
}

function tailVersion(stepId: R7DeltaStepId): string {
  const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === stepId);
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
  const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === stepId);
  assert.ok(step);
  return {
    documentId: R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID,
    authorizedStepId: stepId,
    candidateCommitSha: HEAD_SHA,
    repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    previewProject: 'm55-soul-preview',
    previewProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
    sourceSha256: spec.sourceSha256,
    normalizedStreamCompositeSha256: EXPECTED_COMPOSITES[stepId],
    preProbeId: step.catalogProbes.preProbeId as R7HumanExecutionAuthorizationDocument['preProbeId'],
    postProbeId: step.catalogProbes.postProbeId as R7HumanExecutionAuthorizationDocument['postProbeId'],
    expectedPriorHistoryVersionTail: tailVersion(stepId),
    executionAuthorized: true,
  };
}

function d1PrePayload() {
  return { probe_payload: { anchor_table_count: 0 } };
}

function d1PostPayload() {
  return {
    probe_payload: {
      anchor_table_count: 7,
      reject_mutation_function_present: true,
      reject_mutation_empty_args: true,
      snapshots_content_fingerprint_text_column_ok: true,
    },
  };
}


function scenario(
  opts: Omit<R7DeterministicHarnessSessionScenario, 'scenarioId'> & { readonly scenarioId?: string },
): R7DeterministicHarnessSessionScenario {
  return {
    scenarioId: opts.scenarioId ?? 'scenario-default',
    historyPrior: opts.historyPrior,
    historyPost: opts.historyPost,
    lockAvailable: opts.lockAvailable,
    failAt: opts.failAt,
    commitResponse: opts.commitResponse,
    guardRow: opts.guardRow,
    rollbackAcknowledged: opts.rollbackAcknowledged,
  };
}

function baseInput(
  stepId: R7DeltaStepId,
  transactionScenario: R7DeterministicHarnessSessionScenario,
  freshScenario: R7DeterministicHarnessSessionScenario,
  publicOverrides: Partial<ExecuteR7LiveBridgePublicInput> = {},
  harnessOverrides: Partial<R7LiveBridgeLocalNodeTestHarnessConfig> = {},
): LocalNodeTestBridgeInput {
  return {
    repoRoot: REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    headCommitSha: HEAD_SHA,
    stepId,
    reviewedCandidateBinding: makeBinding(),
    humanAuthorization: makeHumanAuth(stepId),
    offlineManifestExecutionAuthorized: false,
    remoteExecutionAuthorized: true,
    targetObserved: approvedTargetFacts(),
    ...publicOverrides,
    localNodeTestHarness: {
      transactionScenario,
      freshScenario,
      freshMaterializeThrows: harnessOverrides.freshMaterializeThrows,
      freshFactoryReturnsTransactionSession: harnessOverrides.freshFactoryReturnsTransactionSession,
      freshAckClassifierMode: harnessOverrides.freshAckClassifierMode,
      freshCatalogVerifyMode: harnessOverrides.freshCatalogVerifyMode,
    },
  };
}

describe('r7D1D5LiveBridge local gate', () => {
  it('documents global remote execution authorization state', () => {
    assert.equal(R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED, false);
    assert.equal(R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN, true);
    assert.match(R7_D1_D5_MIGRATION_COORDINATION_LOCK_DISCLAIMER, /UNRELATED_MIGRATION_WRITERS/);
    assert.match(R7_LIVE_BRIDGE_LOCAL_MOCK_BOUNDARY_NOTE, /NETWORK_ISOLATION/);
    assert.match(R7_LIVE_BRIDGE_READONLY_MOCK_HONESTY_NOTE, /MOCK_BEGIN_READONLY/);
    assert.match(R7_LIVE_BRIDGE_READONLY_MOCK_HONESTY_NOTE, /NOT_PROVE_POSTGRES_READ_ONLY/);
  });

  it('public executor holds before any caller-controlled session I/O (R01)', async () => {
    const evidence = await executeR7DeltaStepLiveBridge({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      remoteExecutionAuthorized: true,
      targetObserved: approvedTargetFacts(),
    });
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  });

  it('materialized harness sessions are registered; wrapped pg clients are not (PATCH-4)', async () => {
    await simulateLiveBridge(
      baseInput('D1', scenario({ historyPrior: [] }), scenario({ historyPrior: [] })),
    );
    assert.ok(transactionQuerySqlTrace().length > 0);
    const hostile: R7LiveBridgePgSession = {
      async connect() {},
      async query() {
        return { rows: [], rowCount: 0 };
      },
      async begin() {},
      async beginReadOnly() {},
      async commit() {
        return { responseClass: 'DEFINITIVE_COMMIT_ACK' };
      },
      async rollback() {
        return { acknowledged: true };
      },
      async close() {},
    };
    assert.equal(isR7LiveBridgeHarnessSessionInstance(hostile as object), false);
  });

  it('pure harness config exposes SQL trace only, not session handles (PATCH-5)', async () => {
    await simulateLiveBridge(
      baseInput('D1', scenario({ historyPrior: [] }), scenario({ historyPrior: [] })),
    );
    const trace = transactionQuerySqlTrace();
    assert.ok(trace.includes('__connect__'));
    assert.equal(typeof trace[0], 'string');
  });

  it('SQL trace snapshot is frozen, detached in-flight, and immutable after completion (PATCH-6)', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post, historyPost: post });
    const HOSTILE_MARKER = 'HOSTILE_INJECTED_SQL_PATCH6';

    let hostilePushCount = 0;
    const hostilePush = () => {
      hostilePushCount += 1;
      return 0;
    };

    const pending = simulateLiveBridge(baseInput('D1', tx, fresh));
    const inFlightSnapshot = readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun();
    assert.equal(Object.isFrozen(inFlightSnapshot), true);
    const inFlightCopy = [...inFlightSnapshot];

    assert.equal(Reflect.set(inFlightSnapshot, 'push', hostilePush), false);
    assert.equal(
      Reflect.defineProperty(inFlightSnapshot, 'push', {
        value: hostilePush,
        writable: true,
        configurable: true,
        enumerable: false,
      }),
      false,
    );

    const evidence = await pending;
    assert.equal(hostilePushCount, 0);
    assert.deepEqual([...inFlightSnapshot], inFlightCopy);
    assert.ok(!inFlightSnapshot.includes(HOSTILE_MARKER));
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');

    const finalSnapshot = readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun();
    assert.equal(Object.isFrozen(finalSnapshot), true);
    assert.notEqual(finalSnapshot, inFlightSnapshot);
    assert.ok(finalSnapshot.includes('__connect__'));
    assert.ok(finalSnapshot.includes(R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
    assert.ok(finalSnapshot.some((sql) => sql === HISTORY_INSERT_SQL_METADATA));
    assert.ok(!finalSnapshot.includes(HOSTILE_MARKER));

    const finalCanonical = [...finalSnapshot];
    assert.throws(() => {
      (finalSnapshot as string[]).push(HOSTILE_MARKER);
    });
    const finalSnapshotAgain = readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun();
    assert.deepEqual([...finalSnapshotAgain], finalCanonical);
  });

  it('hostile pg session cannot reach connect via public executor (PATCH-5)', async () => {
    const hostile: R7LiveBridgePgSession = {
      async connect() {
        throw new Error('HOSTILE_CONNECT_SHOULD_NOT_RUN');
      },
      async query() {
        throw new Error('HOSTILE_QUERY_SHOULD_NOT_RUN');
      },
      async begin() {},
      async beginReadOnly() {},
      async commit() {
        return { responseClass: 'DEFINITIVE_COMMIT_ACK' };
      },
      async rollback() {
        return { acknowledged: true };
      },
      async close() {},
    };
    assert.equal(isR7LiveBridgeHarnessSessionInstance(hostile as object), false);
    const evidence = await executeR7DeltaStepLiveBridge({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      reviewedCandidateBinding: makeBinding(),
      humanAuthorization: makeHumanAuth('D1'),
      offlineManifestExecutionAuthorized: false,
      remoteExecutionAuthorized: true,
      targetObserved: approvedTargetFacts(),
    });
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  });

  it('validates POST_CONNECT_GUARD query results fail closed', () => {
    assert.equal(
      validateR7LiveBridgePostConnectGuardResult({
        rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
        rowCount: 1,
      }),
      true,
    );
    assert.equal(validateR7LiveBridgePostConnectGuardResult({ rows: [], rowCount: 0 }), false);
    assert.equal(
      validateR7LiveBridgePostConnectGuardResult({
        rows: [{ current_database_name: 'wrong', current_user_name: 'postgres' }],
        rowCount: 1,
      }),
      false,
    );
    assert.equal(
      validateR7LiveBridgePostConnectGuardResult({
        rows: [{ current_database_name: 'postgres', current_user_name: 'wrong' }],
        rowCount: 1,
      }),
      false,
    );
    assert.equal(
      validateR7LiveBridgePostConnectGuardResult({
        rows: [{ malformed: true }],
        rowCount: 1,
      }),
      false,
    );
  });

  it('rejects production and wrong preview target bindings', () => {
    const bad = validateR7LiveBridgePreviewTargetBinding({
      ...approvedTargetFacts(),
      projectName: 'production-project',
    });
    assert.equal(bad.ok, false);
    const auth = assertR7LiveBridgeRuntimeAuthorization(false, false);
    assert.equal(auth.ok, false);
    assert.equal(auth.holdReasonCode, 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED');
  });

  it('enforces D1–D5 ordering metadata and frozen file identities', () => {
    assert.deepEqual(R7_DELTA_STEP_ORDER, ['D1', 'D2', 'D3', 'D4', 'D5']);
    for (const spec of FROZEN_DELTA_SOURCE_SPECS) {
      const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === spec.stepId);
      assert.equal(step?.source.sourceSha256, spec.sourceSha256);
    }
  });

  it('CLI holds without credentials or live authorization', async () => {
    const hold = await runR7PreviewD1D5LiveBridgeCli(['--step', 'D1']);
    assert.equal(hold.mode, 'R7_D1_D5_LIVE_BRIDGE_HOLD');
    assert.equal(hold.holdReasonCode, 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED');
    const forbidden = await runR7PreviewD1D5LiveBridgeCli(['--database-url', 'x']);
    assert.equal(forbidden.mode, 'R7_D1_D5_LIVE_BRIDGE_HOLD');
    if (forbidden.mode === 'R7_D1_D5_LIVE_BRIDGE_HOLD') {
      assert.equal(forbidden.holdReasonCode, 'HOLD_FORBIDDEN_CLI_FLAG');
    }
    assert.deepEqual(parseR7LiveBridgeArgv(['--step', 'D9']), { stepId: null, unknownFlags: ['--step'] });
  });

  it('holds on missing human authorization and forged binding', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({ historyPrior: step.historyPrefixPrior.map((e) => e.version) });
    const evidence = await simulateLiveBridge(
      baseInput('D1', session, session, { humanAuthorization: null }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_AUTHORIZATION_GATE');
  });

  it('holds when migration coordination lock is unavailable', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      lockAvailable: false,
    });
    const evidence = await simulateLiveBridge(baseInput('D1', session, session));
    assert.equal(evidence.holdReasonCode, 'HOLD_MIGRATION_COORDINATION_LOCK_UNAVAILABLE');
  });

  it('holds on history prefix mismatch (D2 before D1)', async () => {
    const d2 = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D2');
    assert.ok(d2);
    const d1PriorOnly = d2.historyPrefixPrior.slice(0, 17).map((e) => e.version);
    const session = scenario({ historyPrior: d1PriorOnly });
    const evidence = await simulateLiveBridge(baseInput('D2', session, session));
    assert.equal(evidence.holdReasonCode, 'HOLD_HISTORY_PREFIX_MISMATCH');
  });

  it('runs simulated D1 lifecycle through fresh readonly verification', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post, historyPost: post });
    const input = baseInput('D1', tx, fresh);
    const evidence = await simulateLiveBridge(input);
    assert.equal(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.equal(evidence.postCommitVerificationState, 'HISTORY_READONLY_VERIFIED');
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
    const txQueries = transactionQuerySqlTrace();
    assert.ok(txQueries.some((sql) => sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
    const guardIdx = txQueries.findIndex((sql) => sql === POST_CONNECT_GUARD_SQL);
    const lockIdx = txQueries.findIndex((sql) => sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL);
    assert.ok(guardIdx >= 0 && lockIdx > guardIdx);
    assert.ok(!JSON.stringify(txQueries).match(/password|secret|Bearer|postgres:\/\//i));
  });

  it('rolls back on mutation failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'mutation',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', session, session));
    assert.equal(evidence.outcome, 'PRE_COMMIT_FAILURE');
    assert.equal(evidence.holdReasonCode, 'HOLD_PRE_COMMIT_FAILURE_ROLLBACK');
  });

  it('handles commit transport loss with mandatory stop', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'commit_throw',
    });
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(baseInput('D1', session, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('holds on fresh post-commit history mismatch', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({ historyPrior: prior });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_VERIFICATION_FAILED');
  });

  it('holds when fresh readonly classifier is unavailable', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post, failAt: 'fresh_connect' });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
  });

  it('holds on pre-probe mismatch', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'pre_probe',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', session, session));
    assert.equal(evidence.holdReasonCode, 'HOLD_PROBE_QUERY_FAILED');
  });

  it('holds on history insert and post-probe failures before commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const insertFail = scenario({ historyPrior: prior, failAt: 'history_insert' });
    const insertEvidence = await simulateLiveBridge(baseInput('D1', insertFail, insertFail));
    assert.equal(insertEvidence.holdReasonCode, 'HOLD_HISTORY_INSERT_QUERY_FAILED');
    const postFail = scenario({ historyPrior: prior, failAt: 'post_probe' });
    const postEvidence = await simulateLiveBridge(baseInput('D1', postFail, postFail));
    assert.equal(postEvidence.holdReasonCode, 'HOLD_PROBE_QUERY_FAILED');
  });

  it('holds on definitive commit rejection without treating as non-commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const session = scenario({
      historyPrior: prior,
      commitResponse: 'DEFINITIVE_TRANSACTION_REJECTION',
    });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(baseInput('D1', session, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('holds on POST_CONNECT_GUARD failure after commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({
      historyPrior: post,
      guardRow: { current_database_name: 'wrong', current_user_name: 'postgres' },
    });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_CONNECT_GUARD_FAILED');
  });

  it('holds on lock query exception and rollback cleanup uncertainty', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'lock_throw',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', session, session));
    assert.equal(evidence.holdReasonCode, 'HOLD_MIGRATION_COORDINATION_LOCK_QUERY_FAILED');
    const session2 = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'pre_probe',
      rollbackAcknowledged: false,
    });
    const evidence2 = await simulateLiveBridge(baseInput('D1', session2, session2));
    assert.equal(evidence2.holdReasonCode, 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN');
  });

  it('rejects false-positive catalog verifier success as final completion', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, { freshCatalogVerifyMode: 'SIMULATE_POST_COMMIT_VERIFIED' }),
    );
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
  });

  it('holds on D5 history prefix mismatch without D1 fake success', async () => {
    const d5 = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D5');
    assert.ok(d5);
    const incomplete = d5.historyPrefixPrior.slice(0, 20).map((e) => e.version);
    const session = scenario({ historyPrior: incomplete });
    const evidence = await simulateLiveBridge(baseInput('D5', session, session));
    assert.equal(evidence.holdReasonCode, 'HOLD_HISTORY_PREFIX_MISMATCH');
  });

  it('runs POST_CONNECT_GUARD on transaction session before coordination lock', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, guardRow: null });
    const fresh = scenario({ historyPrior: prior });
    const input = baseInput('D1', tx, fresh);
    const evidence = await simulateLiveBridge(input);
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_CONNECT_GUARD_FAILED');
    const txQueries = transactionQuerySqlTrace();
    assert.ok(!txQueries.some((sql) => sql === HISTORY_INSERT_SQL_METADATA));
    assert.ok(!txQueries.some((sql) => sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
  });

  it('holds when fresh readonly session factory throws', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, { freshMaterializeThrows: true }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('preserves definitive commit ACK when transactional close fails after COMMIT', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      historyPost: post,
      failAt: 'close_throw',
    });
    const fresh = scenario({ historyPrior: post });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
  });

  it('rejects injected definitive committed ACK without fresh post-prefix evidence', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, { freshAckClassifierMode: 'FORCE_DEFINITELY_COMMITTED' }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
  });

  it('rejects fresh session that is not distinct from the transaction session', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, tx, {}, { freshFactoryReturnsTransactionSession: true }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_SESSION_NOT_DISTINCT');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('holds when explicit read-only transaction cannot be established on fresh session', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post, failAt: 'begin_readonly' });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('never promotes injected prior-catalog success to definitive not-committed', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, {
        freshAckClassifierMode: 'FORCE_DEFINITELY_NOT_COMMITTED',
        freshCatalogVerifyMode: 'SIMULATE_PRIOR_CATALOG_OK',
      }),
    );
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
  });

  it('rejects definitive not-committed when fresh prior catalog is inconsistent despite matching history', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, { freshAckClassifierMode: 'FORCE_DEFINITELY_NOT_COMMITTED' }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
  });

  it('never promotes injected catalog VERIFIED to public evidence without production verifier', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({ historyPrior: post });
    const evidence = await simulateLiveBridge(
      baseInput('D1', tx, fresh, {}, { freshCatalogVerifyMode: 'SIMULATE_POST_COMMIT_VERIFIED' }),
    );
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.outcome, 'HOLD');
  });

  it('holds on transaction connect failure without BEGIN or lock', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'connect',
    });
    const input = baseInput('D1', session, session);
    const evidence = await simulateLiveBridge(input);
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
    assert.ok(
      !transactionQuerySqlTrace().some((sql) => sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL),
    );
  });

  it('surfaces close failure after transaction connect failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'connect_and_close_throw',
    });
    const input = baseInput('D1', session, session);
    const evidence = await simulateLiveBridge(input);
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.ok(transactionQuerySqlTrace().some((sql) => sql === '__close__'));
  });

  it('preserves commit response class on uncertain fresh-open failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = scenario({ historyPrior: prior, failAt: 'fresh_connect' });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.ok(evidence.statementCount > 0);
  });

  it('surfaces close failure when fresh connect fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({
      historyPrior: post,
      failAt: 'fresh_connect_and_close_throw',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('surfaces close failure when fresh POST_CONNECT_GUARD fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({
      historyPrior: post,
      guardRow: null,
      failAt: 'close_throw',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('surfaces close failure when fresh READ ONLY begin fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = scenario({ historyPrior: prior, historyPost: post });
    const fresh = scenario({
      historyPrior: post,
      failAt: 'begin_readonly_and_close_throw',
    });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('does not close the transaction session again when fresh factory returns the same object', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const input = baseInput('D1', tx, tx, {}, { freshFactoryReturnsTransactionSession: true });
    const evidence = await simulateLiveBridge(input);
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_SESSION_NOT_DISTINCT');
    assert.equal(transactionQuerySqlTrace().filter((sql) => sql === '__close__').length, 1);
  });

  it('holds on COMMIT transport exception when original session close fails', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const session = scenario({
      historyPrior: prior,
      failAt: 'commit_and_close_throw',
    });
    const fresh = scenario({ historyPrior: prior });
    const evidence = await simulateLiveBridge(baseInput('D1', session, fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
    assert.ok(evidence.statementCount > 0);
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('preserves commit evidence when fresh session close fails during uncertainty resolution', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = scenario({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = scenario({ historyPrior: prior, failAt: 'close_throw' });
    const evidence = await simulateLiveBridge(baseInput('D1', tx, fresh));
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
  });

  it('holds on wrong repository branch identity', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = scenario({ historyPrior: step.historyPrefixPrior.map((e) => e.version) });
    const evidence = await simulateLiveBridge(
      baseInput('D1', session, session, { branch: 'wrong-branch' }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });
});
