import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyPairP5PostCommitAckFromFreshObservations,
  HOLD_PAIR_P5_COMMIT_REJECTED,
  HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED,
  mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult,
  pairP5AuthGatedRealExecutionCliExitCode,
} from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  executePairP5FulfillAuthorizationGatedRealExecution,
  preparePairP5FulfillLiveSessionPoolerOrchestrationSurface,
  simulatePairP5FulfillAuthorizationGatedTransactionOffline,
} from './previewRemoteApply/pairP5FulfillAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_FULFILL_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED,
  PAIR_P5_FULFILL_LIVE_EXECUTION_PREP_READINESS,
  PAIR_P5_FULFILL_STATIC_EXECUTION_GATE,
  isPairP5FulfillHumanPreviewApplyAuthorizationGranted,
  pairP5FulfillLiveFreshReadonlyProbeAuthorizationGranted,
} from './previewRemoteApply/pairP5FulfillLiveExecutionAuthority.ts';
import {
  PAIR_P5_FULFILL_MIGRATION_SHA256,
  PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_FULFILL_STEP_ID,
} from './previewRemoteApply/pairP5FulfillStepAuthority.ts';
import {
  HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING,
  issuePairP5TestOnlyOperationalFulfillDedicatedReceiptForTestsOnly,
  pairP5LiveFreshReadonlyProbeAuthorizationGrantedForCallableStep,
  readPairP5DedicatedReceiptGitProvenance,
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly,
  registerPairP5TestAttestationTrustAnchorForTestsOnly,
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly,
} from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import { HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED } from './previewRemoteApply/pairP5DedicatedReceiptConsumptionLedger.ts';
import { generatePairP5HumanAttestationTestKeyMaterialForTestsOnly } from './previewRemoteApply/pairP5HumanPreviewUiAttestation.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_IDENTITY_STEP_ID,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import { SESSION_POOLER_HOST_FINGERPRINT_SHA256 } from './previewRemoteApply/remoteConnectionAuthority.ts';
import { parsePairP5FulfillAuthGatedRealExecutionCliArgs } from '../../scripts/m55/runPreviewPairP5FulfillAuthorizationGatedRealExecution.ts';

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

function baseInput() {
  return {
    repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
    repository: REPOSITORY,
    repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
    target: TARGET,
    selectedStep: PAIR_P5_FULFILL_STEP_ID,
  };
}

function issueOperationalFulfillFixture() {
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly();
  const authId = 'HUMAN_P5_3_FULFILL_APPLY_FIXTURE_001';
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly({
    authorizationId: authId,
    purpose: 'LIVE_MUTATION',
    selectedStep: PAIR_P5_FULFILL_STEP_ID,
    migrationSourceSha256: PAIR_P5_FULFILL_MIGRATION_SHA256,
    previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  });
  const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_FULFILL_OPS_KEY');
  registerPairP5TestAttestationTrustAnchorForTestsOnly({
    trustKeyId: key.trustKeyId,
    publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
    status: 'ACTIVE',
  });
  const git = readPairP5DedicatedReceiptGitProvenance(PAIR_P5_EXPECTED_REPO_ROOT);
  const issued = issuePairP5TestOnlyOperationalFulfillDedicatedReceiptForTestsOnly({
    injectedGit: git,
    humanAuthorizationId: authId,
    trustAnchors: [
      {
        trustKeyId: key.trustKeyId,
        publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
        status: 'ACTIVE',
      },
    ],
    privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    trustKeyId: key.trustKeyId,
    attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_FULFILL_OPS_001',
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) {
    throw new Error('fixture receipt issuance failed');
  }
  return issued.receipt;
}

describe('pairP5 fulfill LIVE execution prep', () => {
  it('exposes prep readiness without authorizing Preview APPLY', () => {
    assert.equal(PAIR_P5_FULFILL_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED, false);
    assert.equal(PAIR_P5_FULFILL_LIVE_EXECUTION_PREP_READINESS.fulfillHumanPreviewApplyAuthorizationGranted, false);
    assert.equal(PAIR_P5_FULFILL_LIVE_EXECUTION_PREP_READINESS.previewApplyReady, false);
    assert.equal(isPairP5FulfillHumanPreviewApplyAuthorizationGranted(), false);
    assert.equal(pairP5FulfillLiveFreshReadonlyProbeAuthorizationGranted(), true);
    assert.equal(pairP5LiveFreshReadonlyProbeAuthorizationGrantedForCallableStep(PAIR_P5_FULFILL_STEP_ID), true);
    assert.equal(pairP5LiveFreshReadonlyProbeAuthorizationGrantedForCallableStep(PAIR_P5_IDENTITY_STEP_ID), false);
  });

  it('parses fulfill CLI args and rejects credential flags', () => {
    const ok = parsePairP5FulfillAuthGatedRealExecutionCliArgs([
      '--step',
      PAIR_P5_FULFILL_STEP_ID,
      '--project-ref',
      PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      '--host-fingerprint-sha256',
      SESSION_POOLER_HOST_FINGERPRINT_SHA256,
    ]);
    assert.equal('holdReasonCode' in ok, false);
    const bad = parsePairP5FulfillAuthGatedRealExecutionCliArgs(['--database-url', 'x']);
    assert.equal('holdReasonCode' in bad, true);
  });

  it('live surface requires dedicated receipt', () => {
    const missing = preparePairP5FulfillLiveSessionPoolerOrchestrationSurface(baseInput());
    assert.equal(missing, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    const receipt = issueOperationalFulfillFixture();
    const surface = preparePairP5FulfillLiveSessionPoolerOrchestrationSurface({
      ...baseInput(),
      dedicatedTargetBindingReceipt: receipt,
    });
    assert.equal(typeof surface, 'string');
  });

  it('fulfill operational fixture carries dual attestations for fresh-readonly path', () => {
    const receipt = issueOperationalFulfillFixture();
    assert.equal(receipt.body.receiptClass, 'OPERATIONAL');
    assert.notEqual(receipt.body.signedHumanPreviewUiAttestationPostCommitReadonly, null);
    assert.equal(
      receipt.body.signedHumanPreviewUiAttestationPostCommitReadonly?.payload.purpose,
      'LIVE_FRESH_READONLY',
    );
    assert.equal(pairP5LiveFreshReadonlyProbeAuthorizationGrantedForCallableStep(receipt.body.selectedStep), true);
  });

  it('offline simulation completes with DEFINITELY_COMMITTED ack classifier', async () => {
    const result = await simulatePairP5FulfillAuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE');
    assert.equal(result.holdReasonCode, null);
    assert.equal(result.evidence.ackClassifierAckState, 'DEFINITELY_COMMITTED');
    assert.equal(result.evidence.mutationStatementsExecuted, PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT);
    assert.equal(result.evidence.freshReadonlyDistinctClientSession, true);
    assert.equal(result.executionAuthorized, PAIR_P5_FULFILL_STATIC_EXECUTION_GATE.executionAuthorized);
  });

  it('ACK with fresh post drift holds without falsely implying rollback', async () => {
    const result = await simulatePairP5FulfillAuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      freshPostProbeFieldOverrides: { probe_green: false },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_FRESH_READONLY_CONTRADICTORY');
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.evidence.ackClassifierAckState, 'CONTRADICTORY_OR_DRIFTED');
  });

  it('rejected COMMIT does not rollback', async () => {
    const result = await simulatePairP5FulfillAuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION' },
    });
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_COMMIT_REJECTED);
    assert.equal(result.evidence.rollbackSent, false);
  });

  it('maps successful orchestration to LIVE_MUTATION_COMPLETE exit 0', async () => {
    const sim = await simulatePairP5FulfillAuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(sim.mode, 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE');
    const live = mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult(
      {
        holdReasonCode: null,
        evidence: sim.evidence,
        querySequence: sim.querySequence,
        simulationOnly: false,
      },
      false,
    );
    assert.equal(live.mode, 'PAIR_P5_AUTH_GATED_LIVE_MUTATION_COMPLETE');
    assert.equal(pairP5AuthGatedRealExecutionCliExitCode(live), 0);
  });

  it('live execute with operational test receipt passes Human gate then holds before stdin', async () => {
    const receipt = issueOperationalFulfillFixture();
    const input = { ...baseInput(), dedicatedTargetBindingReceipt: receipt };
    assert.equal(isPairP5FulfillHumanPreviewApplyAuthorizationGranted(input), true);
    const result = await executePairP5FulfillAuthorizationGatedRealExecution(input);
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
    assert.notEqual(result.holdReasonCode, null);
    assert.equal(result.evidence.credentialAcquisitionAttempted, false);
  });

  it('post-commit ack truth table: post-only is COMMITTED', () => {
    assert.equal(
      classifyPairP5PostCommitAckFromFreshObservations('DEFINITIVE_COMMIT_ACK', false, true),
      'DEFINITELY_COMMITTED',
    );
  });
});
