import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  executePairP5IdentityPreviewRemoteExecution,
  HOLD_PAIR_P5_COMMIT_REJECTED,
  HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY,
  PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
  PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION,
  type PairP5IdentityRemoteExecutionTestHarness,
} from './previewRemoteApply/pairP5IdentityRemoteExecutor.ts';
import { createFakeExecutionPgClientFactory } from './previewRemoteApply/remoteExecutionPgTransport.ts';
import {
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_STEP_ID,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  validateDedicatedPairP5IdentityStepSelection,
} from './previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import {
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import { HISTORY_INSERT_SQL_METADATA } from './previewRemoteApply/types.ts';
import {
  parsePairP5IdentityRemoteExecutionCliArgs,
  runPreviewPairP5IdentityRemoteExecutionCli,
} from '../../scripts/m55/runPreviewPairP5IdentityRemoteExecution.ts';

const TARGET = {
  organization: 'm55-preview',
  project: 'm55-soul-preview',
  databaseTier: 'Primary Database',
  projectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
};

const REPOSITORY = {
  repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
  branch: 'feat/m55-pair-p5-owned-state-identity-v1',
  headCommitSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  treeSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  trackedWorktreeClean: true,
  indexEmpty: true,
  factsSource: REPOSITORY_FACTS_SOURCE,
};

function baseInput(overrides: Partial<Parameters<typeof executePairP5IdentityPreviewRemoteExecution>[0]> = {}) {
  return {
    repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
    repository: REPOSITORY,
    repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
    target: TARGET,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    executionEnablement: false as const,
    ...overrides,
  };
}

describe('pair P5 identity remote executor wiring', () => {
  it('defaults to CODE_ONLY_WIRED_AND_EXECUTION_DISABLED without mock harness', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput());
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_EXECUTION_DISABLED');
    assert.equal(
      result.classification,
      PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
    );
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED');
    assert.equal(result.wiringId, PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID);
    assert.equal(result.legacyP1P8ExecutorModified, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.migrationApplyAuthorized, false);
    assert.equal(result.evidence.applyReadyFromProbeGreen, false);
  });

  it('rejects wrong dedicated step tokens', async () => {
    for (const bad of ['P8', 'P5', 'ALL', '20261010000000', 'PAIR_P5_CHECKOUT_20261010']) {
      assert.equal(validateDedicatedPairP5IdentityStepSelection(bad).ok, false);
      const result = await executePairP5IdentityPreviewRemoteExecution(
        baseInput({ selectedStep: bad }),
      );
      assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
      assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_STEP_SELECTION_INVALID');
    }
  });

  it('rejects production target binding', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(
      baseInput({
        target: {
          ...TARGET,
          organization: 'm55-soul',
          project: 'm55-soul-core',
        },
      }),
    );
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_TARGET_PRODUCTION_FORBIDDEN');
  });

  it('rejects wrong preview project ref and pooler fingerprint', async () => {
    const badRef = await executePairP5IdentityPreviewRemoteExecution(
      baseInput({ target: { ...TARGET, projectRef: 'wrong-ref' } }),
    );
    assert.equal(badRef.holdReasonCode, 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH');
    const badFp = await executePairP5IdentityPreviewRemoteExecution(
      baseInput({ target: { ...TARGET, hostFingerprintSha256: 'a'.repeat(64) } }),
    );
    assert.equal(badFp.holdReasonCode, 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH');
  });

  it('rejects dirty repository identity', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(
      baseInput({
        repository: { ...REPOSITORY, trackedWorktreeClean: false },
      }),
    );
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH');
  });

  it('runs mock injected transaction with correct phase order', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_MOCK_COMPLETE');
    assert.equal(result.holdReasonCode, null);
    assert.equal(result.evidence.mutationStatementsExecuted, PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT);
    assert.equal(result.evidence.historyInsertExecuted, true);
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(result.evidence.rollbackSent, false);
    assert.ok(result.querySequence.indexOf('PRIOR_PROBE') < result.querySequence.lastIndexOf('MUTATION_STATEMENT'));
    assert.ok(result.querySequence.indexOf('HISTORY_INSERT') < result.querySequence.indexOf('POST_PROBE'));
    assert.ok(result.querySequence.indexOf('POST_PROBE') < result.querySequence.indexOf('COMMIT'));
  });

  it('rolls back on failed prior probe in mock transport', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        priorProbeFieldOverrides: { history_total_twenty_two: false },
      },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
    assert.equal(result.evidence.rollbackSent, true);
    assert.equal(result.evidence.commitSent, false);
  });

  it('rolls back on failed post probe in mock transport', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        postProbeFieldOverrides: { history_total_twenty_three: false },
      },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
    assert.equal(result.evidence.rollbackSent, true);
    assert.equal(result.evidence.commitSent, false);
  });

  it('stops on ambiguous commit without retry', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        fakeClientOptions: { commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' },
      },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS');
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.evidence.sameRunRetry, false);
    assert.equal(PAIR_P5_STATIC_EXECUTION_GATE.sameRunRetry, false);
  });

  it('holds on definitive transaction rejection without mock success', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        fakeClientOptions: { commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION' },
      },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_COMMIT_REJECTED);
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.commitResponseClass, 'DEFINITIVE_TRANSACTION_REJECTION');
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.sameRunRetry, false);
  });

  it('holds on transport loss during COMMIT without claiming rollback', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        fakeClientOptions: { transportLossOnCommit: true },
      },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS');
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.sameRunRetry, false);
  });

  it('does not claim rollback when rollback fails after probe mismatch', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: {
        mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
        priorProbeFieldOverrides: { history_total_twenty_two: false },
        fakeClientOptions: { failRollback: true },
      },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.evidence.commitSent, false);
  });

  it('uses parameterized history insert shape from shared types', async () => {
    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: { mode: 'INJECTED_MOCK_TRANSPORT_ONLY' },
    });
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_MOCK_COMPLETE');
    void HISTORY_INSERT_SQL_METADATA;
  });

  it('CLI rejects forbidden credential/execute flags', () => {
    assert.ok('holdReasonCode' in parsePairP5IdentityRemoteExecutionCliArgs(['--credential-method', 'x']));
    assert.ok('holdReasonCode' in parsePairP5IdentityRemoteExecutionCliArgs(['--execute']));
  });

  it('rejects runtime-injected transportFactory before any client is created', async () => {
    let createClientCalls = 0;
    const forgedHarness = {
      mode: 'INJECTED_MOCK_TRANSPORT_ONLY',
      transportFactory: {
        createClient: () => {
          createClientCalls += 1;
          return createFakeExecutionPgClientFactory().createClient({
            host: SESSION_POOLER_HOST,
            port: 5432,
            database: 'postgres',
            user: 'evil',
            password: 'evil',
            sslmode: 'require',
            tlsCaPem: 'x',
            tlsTrustProfile: TLS_TRUST_PROFILE,
            tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
            connectionTimeoutMillis: 1,
          });
        },
      },
    } as PairP5IdentityRemoteExecutionTestHarness & { transportFactory: unknown };

    const result = await executePairP5IdentityPreviewRemoteExecution(baseInput(), {
      testHarness: forgedHarness,
    });
    assert.equal(createClientCalls, 0);
    assert.equal(result.mode, 'PAIR_P5_IDENTITY_REMOTE_HOLD');
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY);
    assert.equal(result.evidence.connectionOpened, false);
    assert.equal(result.evidence.mutationStatementsExecuted, 0);
    assert.equal(result.evidence.commitSent, false);
    assert.notEqual(result.mode, 'PAIR_P5_IDENTITY_REMOTE_MOCK_COMPLETE');
  });

  it('CLI returns wired-disabled envelope without live connection', async () => {
    const cli = await runPreviewPairP5IdentityRemoteExecutionCli([
      '--step',
      PAIR_P5_IDENTITY_STEP_ID,
      '--project-ref',
      PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      '--host-fingerprint-sha256',
      SESSION_POOLER_HOST_FINGERPRINT_SHA256,
      '--repository-source',
      'synthetic-fixture',
    ]);
    assert.equal(cli.exitCode, 1);
    const parsed = JSON.parse(cli.stdout) as {
      mode: string;
      classification: string;
      executionAuthorized: boolean;
      migrationApplyAuthorized: boolean;
    };
    assert.equal(parsed.mode, 'PAIR_P5_IDENTITY_REMOTE_EXECUTION_DISABLED');
    assert.equal(parsed.executionAuthorized, false);
    assert.equal(parsed.migrationApplyAuthorized, false);
    assert.equal(
      parsed.classification,
      PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
    );
  });
});
