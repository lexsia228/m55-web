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
  validateR7LiveBridgePostConnectGuardResult,
  validateR7LiveBridgePreviewTargetBinding,
  type ExecuteR7LiveBridgeInput,
  type R7LiveBridgeFreshAckClassifier,
  type R7LiveBridgeFreshReadonlyVerification,
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

type MockFailure =
  | 'connect'
  | 'connect_and_close_throw'
  | 'begin'
  | 'lock'
  | 'lock_throw'
  | 'history'
  | 'pre_probe'
  | 'mutation'
  | 'history_insert'
  | 'post_probe'
  | 'commit_throw'
  | 'commit_and_close_throw'
  | 'fresh_connect'
  | 'fresh_connect_and_close_throw'
  | 'begin_readonly'
  | 'begin_readonly_and_close_throw'
  | 'rollback_unack'
  | 'close_throw';

type MockSessionOptions = {
  historyPrior: readonly string[];
  historyPost?: readonly string[];
  lockAvailable?: boolean;
  failAt?: MockFailure;
  commitResponse?: CommitResponseClass;
  guardRow?: Record<string, unknown> | null;
  rollbackAcknowledged?: boolean;
};

function historyRows(versions: readonly string[]) {
  return versions.map((version) => ({ version }));
}

class MockLiveBridgeSession implements R7LiveBridgePgSession {
  readonly queries: Array<{ sql: string; params?: readonly unknown[] }> = [];
  private inTransaction = false;
  private readOnlyEstablished = false;
  private history: string[];
  private readonly historyPost: string[];
  private readonly lockAvailable: boolean;
  private readonly failAt: MockFailure | null;
  private readonly commitResponse: CommitResponseClass;
  private readonly guardRow: Record<string, unknown> | null;
  private readonly rollbackAcknowledged: boolean;
  private mutationCount = 0;

  constructor(opts: MockSessionOptions) {
    this.history = [...opts.historyPrior];
    this.historyPost = opts.historyPost ? [...opts.historyPost] : [...opts.historyPrior];
    this.lockAvailable = opts.lockAvailable ?? true;
    this.failAt = opts.failAt ?? null;
    this.commitResponse = opts.commitResponse ?? 'DEFINITIVE_COMMIT_ACK';
    this.guardRow =
      opts.guardRow === undefined
        ? { current_database_name: 'postgres', current_user_name: 'postgres' }
        : opts.guardRow;
    this.rollbackAcknowledged = opts.rollbackAcknowledged ?? true;
  }

  async connect(): Promise<void> {
    this.queries.push({ sql: '__connect__' });
    if (
      this.failAt === 'connect' ||
      this.failAt === 'connect_and_close_throw' ||
      this.failAt === 'fresh_connect' ||
      this.failAt === 'fresh_connect_and_close_throw'
    ) {
      throw new Error('MOCK_CONNECT_FORBIDDEN');
    }
  }

  async begin(): Promise<void> {
    if (this.failAt === 'begin') throw new Error('MOCK_BEGIN_FAILED');
    this.inTransaction = true;
  }

  async beginReadOnly(): Promise<void> {
    if (this.failAt === 'begin_readonly' || this.failAt === 'begin_readonly_and_close_throw') {
      throw new Error('MOCK_BEGIN_READONLY_FAILED');
    }
    this.readOnlyEstablished = true;
    this.queries.push({ sql: R7_LIVE_BRIDGE_READONLY_TX_SQL });
  }

  async query(sql: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.queries.push({ sql, params });
    if (sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL) {
      if (this.failAt === 'lock_throw') {
        throw new Error('MOCK_LOCK_QUERY_FAILED');
      }
      if (this.failAt === 'lock') {
        return { rows: [{ lock_acquired: false }], rowCount: 1 };
      }
      return { rows: [{ lock_acquired: this.lockAvailable }], rowCount: 1 };
    }
    if (sql === POST_CONNECT_GUARD_SQL) {
      if (this.guardRow === null) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [this.guardRow], rowCount: 1 };
    }
    if (sql === R7_LIVE_BRIDGE_HISTORY_READONLY_SELECT_SQL) {
      if (this.failAt === 'history') throw new Error('MOCK_HISTORY_FAILED');
      const versions =
        this.readOnlyEstablished || !this.inTransaction ? this.historyPost : this.history;
      return { rows: historyRows(versions), rowCount: versions.length };
    }
    if (sql.includes('R7_PROBE_ID:R7_D1_PRE')) {
      if (this.failAt === 'pre_probe') throw new Error('MOCK_PRE_PROBE_FAILED');
      if (sql.includes('R7_PROBE_PHASE:pre')) {
        return { rows: [d1PrePayload()], rowCount: 1 };
      }
    }
    if (sql.includes('R7_PROBE_ID:R7_D1_POST')) {
      if (this.failAt === 'post_probe') throw new Error('MOCK_POST_PROBE_FAILED');
      return { rows: [d1PostPayload()], rowCount: 1 };
    }
    if (sql === HISTORY_INSERT_SQL_METADATA) {
      if (this.failAt === 'history_insert') throw new Error('MOCK_HISTORY_INSERT_FAILED');
      const version = String(params?.[0] ?? '');
      if (version) this.history = [...this.history, version];
      return { rows: [], rowCount: 1 };
    }
    if (this.inTransaction && !sql.startsWith('SELECT')) {
      if (this.failAt === 'mutation' && this.mutationCount === 0) {
        this.mutationCount += 1;
        throw new Error('MOCK_MUTATION_FAILED');
      }
      this.mutationCount += 1;
    }
    return { rows: [], rowCount: 0 };
  }

  async commit(): Promise<{ responseClass: CommitResponseClass }> {
    if (this.failAt === 'commit_throw' || this.failAt === 'commit_and_close_throw') {
      throw new Error('MOCK_COMMIT_TRANSPORT_LOSS');
    }
    this.inTransaction = false;
    return { responseClass: this.commitResponse };
  }

  async rollback(): Promise<{ acknowledged: boolean }> {
    this.inTransaction = false;
    return { acknowledged: this.rollbackAcknowledged };
  }

  async close(): Promise<void> {
    this.queries.push({ sql: '__close__' });
    if (
      this.failAt === 'close_throw' ||
      this.failAt === 'connect_and_close_throw' ||
      this.failAt === 'commit_and_close_throw' ||
      this.failAt === 'fresh_connect_and_close_throw' ||
      this.failAt === 'begin_readonly_and_close_throw'
    ) {
      throw new Error('MOCK_CLOSE_FAILED');
    }
  }
}

function historyVersionsMatchPrefixStrings(
  observed: readonly string[],
  expected: readonly { version: string }[],
): boolean {
  if (observed.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (observed[i] !== expected[i].version) return false;
  }
  return true;
}

const defaultAckClassifier: R7LiveBridgeFreshAckClassifier = {
  async classify(input) {
    if (
      !historyVersionsMatchPrefixStrings(input.freshHistoryVersions, input.expectedPostPrefix)
    ) {
      return { holdReasonCode: 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE' };
    }
    return { ackState: 'CONTRADICTORY_OR_DRIFTED' };
  },
};

const defaultFreshVerification: R7LiveBridgeFreshReadonlyVerification = {
  async verifyPostCommitCatalog() {
    return { ok: true, catalogState: 'PENDING_FRESH_READONLY_CATALOG' };
  },
  async verifyFreshPriorCatalogState() {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  },
};

function baseInput(
  stepId: R7DeltaStepId,
  session: MockLiveBridgeSession,
  freshFactory: () => MockLiveBridgeSession,
  overrides: Partial<ExecuteR7LiveBridgeInput> = {},
): ExecuteR7LiveBridgeInput {
  const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === stepId);
  assert.ok(step);
  const prior = step.historyPrefixPrior.map((e) => e.version);
  const post = step.historyPrefixPost.map((e) => e.version);
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
    deps: {
      implementationMode: R7_LIVE_BRIDGE_IMPLEMENTATION_MODE,
      simulationOnly: true,
      transactionSession: session,
      freshReadonlySessionFactory: () => freshFactory(),
      freshAckClassifier: defaultAckClassifier,
      freshReadonlyVerification: defaultFreshVerification,
    },
    ...overrides,
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
    const session = new MockLiveBridgeSession({ historyPrior: step.historyPrefixPrior.map((e) => e.version) });
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', session, () => session, { humanAuthorization: null }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_AUTHORIZATION_GATE');
  });

  it('holds when migration coordination lock is unavailable', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      lockAvailable: false,
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_MIGRATION_COORDINATION_LOCK_UNAVAILABLE');
  });

  it('holds on history prefix mismatch (D2 before D1)', async () => {
    const d2 = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D2');
    assert.ok(d2);
    const d1PriorOnly = d2.historyPrefixPrior.slice(0, 16).map((e) => e.version);
    const session = new MockLiveBridgeSession({ historyPrior: d1PriorOnly });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D2', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_HISTORY_PREFIX_MISMATCH');
  });

  it('runs simulated D1 lifecycle through fresh readonly verification', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({ historyPrior: post, historyPost: post });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.equal(evidence.postCommitVerificationState, 'HISTORY_READONLY_VERIFIED');
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
    assert.ok(tx.queries.some((q) => q.sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
    const guardIdx = tx.queries.findIndex((q) => q.sql === POST_CONNECT_GUARD_SQL);
    const lockIdx = tx.queries.findIndex((q) => q.sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL);
    assert.ok(guardIdx >= 0 && lockIdx > guardIdx);
    assert.ok(fresh.queries.some((q) => q.sql === R7_LIVE_BRIDGE_READONLY_TX_SQL));
    assert.ok(!JSON.stringify(tx.queries).match(/password|secret|Bearer|postgres:\/\//i));
  });

  it('rolls back on mutation failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'mutation',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.outcome, 'PRE_COMMIT_FAILURE');
    assert.equal(evidence.holdReasonCode, 'HOLD_PRE_COMMIT_FAILURE_ROLLBACK');
  });

  it('handles commit transport loss with mandatory stop', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'commit_throw',
    });
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('holds on fresh post-commit history mismatch', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_VERIFICATION_FAILED');
  });

  it('holds when fresh readonly classifier is unavailable', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({ historyPrior: post, failAt: 'fresh_connect' });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
  });

  it('holds on pre-probe mismatch', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'pre_probe',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_PROBE_QUERY_FAILED');
  });

  it('holds on history insert and post-probe failures before commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const insertFail = new MockLiveBridgeSession({ historyPrior: prior, failAt: 'history_insert' });
    const insertEvidence = await executeR7DeltaStepLiveBridge(baseInput('D1', insertFail, () => insertFail));
    assert.equal(insertEvidence.holdReasonCode, 'HOLD_HISTORY_INSERT_QUERY_FAILED');
    const postFail = new MockLiveBridgeSession({ historyPrior: prior, failAt: 'post_probe' });
    const postEvidence = await executeR7DeltaStepLiveBridge(baseInput('D1', postFail, () => postFail));
    assert.equal(postEvidence.holdReasonCode, 'HOLD_PROBE_QUERY_FAILED');
  });

  it('holds on definitive commit rejection without treating as non-commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const session = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'DEFINITIVE_TRANSACTION_REJECTION',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.notEqual(evidence.ackState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('holds on POST_CONNECT_GUARD failure after commit', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({
      historyPrior: post,
      guardRow: { current_database_name: 'wrong', current_user_name: 'postgres' },
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_CONNECT_GUARD_FAILED');
  });

  it('holds on lock query exception and rollback cleanup uncertainty', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'lock_throw',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_MIGRATION_COORDINATION_LOCK_QUERY_FAILED');
    const session2 = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'pre_probe',
      rollbackAcknowledged: false,
    });
    const evidence2 = await executeR7DeltaStepLiveBridge(baseInput('D1', session2, () => session2));
    assert.equal(evidence2.holdReasonCode, 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN');
  });

  it('rejects false-positive catalog verifier success as final completion', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({ historyPrior: post });
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => fresh, {
        deps: {
          ...baseInput('D1', tx, () => fresh).deps,
          freshReadonlyVerification: {
            ...defaultFreshVerification,
            async verifyPostCommitCatalog() {
              return { ok: true, catalogState: 'VERIFIED' };
            },
          },
        },
      }),
    );
    assert.equal(evidence.outcome, 'HOLD');
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING');
  });

  it('holds on D5 history prefix mismatch without D1 fake success', async () => {
    const d5 = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D5');
    assert.ok(d5);
    const incomplete = d5.historyPrefixPrior.slice(0, 19).map((e) => e.version);
    const session = new MockLiveBridgeSession({ historyPrior: incomplete });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D5', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_HISTORY_PREFIX_MISMATCH');
  });

  it('runs POST_CONNECT_GUARD on transaction session before coordination lock', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, guardRow: null });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_POST_CONNECT_GUARD_FAILED');
    assert.ok(!tx.queries.some((q) => q.sql === HISTORY_INSERT_SQL_METADATA));
    assert.ok(!tx.queries.some((q) => q.sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
  });

  it('holds when fresh readonly session factory throws', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => {
        throw new Error('MOCK_FACTORY_THROW');
      }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('preserves definitive commit ACK when transactional close fails after COMMIT', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      historyPost: post,
      failAt: 'close_throw',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: post });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
  });

  it('rejects injected definitive committed ACK without fresh post-prefix evidence', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const maliciousClassifier: R7LiveBridgeFreshAckClassifier = {
      async classify() {
        return { ackState: 'DEFINITELY_COMMITTED' };
      },
    };
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => fresh, {
        deps: {
          ...baseInput('D1', tx, () => fresh).deps,
          freshAckClassifier: maliciousClassifier,
        },
      }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED');
    assert.notEqual(evidence.ackState, 'DEFINITELY_COMMITTED');
  });

  it('rejects fresh session that is not distinct from the transaction session', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => tx));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_SESSION_NOT_DISTINCT');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('holds when explicit read-only transaction cannot be established on fresh session', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({ historyPrior: post, failAt: 'begin_readonly' });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('never promotes injected prior-catalog success to definitive not-committed', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const notCommittedClassifier: R7LiveBridgeFreshAckClassifier = {
      async classify() {
        return { ackState: 'DEFINITELY_NOT_COMMITTED' };
      },
    };
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => fresh, {
        deps: {
          ...baseInput('D1', tx, () => fresh).deps,
          freshAckClassifier: notCommittedClassifier,
          freshReadonlyVerification: {
            ...defaultFreshVerification,
            async verifyFreshPriorCatalogState() {
              return { ok: true, priorCatalogConsistent: true };
            },
          },
        },
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
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const notCommittedClassifier: R7LiveBridgeFreshAckClassifier = {
      async classify() {
        return { ackState: 'DEFINITELY_NOT_COMMITTED' };
      },
    };
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => fresh, {
        deps: {
          ...baseInput('D1', tx, () => fresh).deps,
          freshAckClassifier: notCommittedClassifier,
          freshReadonlyVerification: {
            ...defaultFreshVerification,
            async verifyFreshPriorCatalogState() {
              return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
            },
          },
        },
      }),
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
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({ historyPrior: post });
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', tx, () => fresh, {
        deps: {
          ...baseInput('D1', tx, () => fresh).deps,
          freshReadonlyVerification: {
            async verifyPostCommitCatalog() {
              return { ok: true, catalogState: 'VERIFIED' };
            },
            async verifyFreshPriorCatalogState() {
              return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
            },
          },
        },
      }),
    );
    assert.equal(evidence.postCommitCatalogVerificationState, 'PENDING_FRESH_READONLY_CATALOG');
    assert.equal(evidence.outcome, 'HOLD');
  });

  it('holds on transaction connect failure without BEGIN or lock', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'connect',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
    assert.ok(!session.queries.some((q) => q.sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL));
  });

  it('surfaces close failure after transaction connect failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({
      historyPrior: step.historyPrefixPrior.map((e) => e.version),
      failAt: 'connect_and_close_throw',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => session));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.ok(session.queries.some((q) => q.sql === '__close__'));
  });

  it('preserves commit response class on uncertain fresh-open failure', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior, failAt: 'fresh_connect' });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE');
    assert.ok(evidence.statementCount > 0);
  });

  it('surfaces close failure when fresh connect fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({
      historyPrior: post,
      failAt: 'fresh_connect_and_close_throw',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('surfaces close failure when fresh POST_CONNECT_GUARD fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({
      historyPrior: post,
      guardRow: null,
      failAt: 'close_throw',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('surfaces close failure when fresh READ ONLY begin fails during readonly open', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const post = step.historyPrefixPost.map((e) => e.version);
    const tx = new MockLiveBridgeSession({ historyPrior: prior, historyPost: post });
    const fresh = new MockLiveBridgeSession({
      historyPrior: post,
      failAt: 'begin_readonly_and_close_throw',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
    assert.equal(evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
  });

  it('does not close the transaction session again when fresh factory returns the same object', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => tx));
    assert.equal(evidence.holdReasonCode, 'HOLD_FRESH_SESSION_NOT_DISTINCT');
    assert.equal(tx.queries.filter((q) => q.sql === '__close__').length, 1);
  });

  it('holds on COMMIT transport exception when original session close fails', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const prior = step.historyPrefixPrior.map((e) => e.version);
    const session = new MockLiveBridgeSession({
      historyPrior: prior,
      failAt: 'commit_and_close_throw',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', session, () => fresh));
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
    const tx = new MockLiveBridgeSession({
      historyPrior: prior,
      commitResponse: 'ACK_UNCERTAIN_OR_MISSING',
    });
    const fresh = new MockLiveBridgeSession({ historyPrior: prior, failAt: 'close_throw' });
    const evidence = await executeR7DeltaStepLiveBridge(baseInput('D1', tx, () => fresh));
    assert.equal(evidence.commitResponseClass, 'ACK_UNCERTAIN_OR_MISSING');
    assert.equal(evidence.holdReasonCode, 'HOLD_SESSION_CLOSE_FAILED');
  });

  it('holds on wrong repository branch identity', async () => {
    const step = buildCanonicalExpectedManifest(REPO_ROOT).steps.find((s) => s.stepId === 'D1');
    assert.ok(step);
    const session = new MockLiveBridgeSession({ historyPrior: step.historyPrefixPrior.map((e) => e.version) });
    const evidence = await executeR7DeltaStepLiveBridge(
      baseInput('D1', session, () => session, { branch: 'wrong-branch' }),
    );
    assert.equal(evidence.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });
});
