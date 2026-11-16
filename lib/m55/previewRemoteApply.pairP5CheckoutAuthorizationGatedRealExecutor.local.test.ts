import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTOR_ID,
  simulatePairP5CheckoutAuthorizationGatedTransactionOffline,
} from './previewRemoteApply/pairP5CheckoutAuthorizationGatedRealExecutor.ts';
import { PAIR_P5_CHECKOUT_STEP_ID } from './previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import { validateDedicatedPairP5CheckoutStepSelection } from './previewRemoteApply/pairP5CheckoutOfflinePlan.ts';
import {
  issuePairP5TestOnlyCheckoutDedicatedTargetBindingReceiptFromInjectedTestFixture,
  issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture,
} from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_IDENTITY_STEP_ID,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import { PAIR_P5_STATIC_EXECUTION_GATE } from './previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import { SESSION_POOLER_HOST_FINGERPRINT_SHA256 } from './previewRemoteApply/remoteConnectionAuthority.ts';

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
    selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
  };
}

describe('pairP5 checkout authorization-gated executor — offline simulation', () => {
  it('rejects identity step selection on checkout validator', () => {
    const selection = validateDedicatedPairP5CheckoutStepSelection(PAIR_P5_IDENTITY_STEP_ID);
    assert.equal(selection.ok, false);
  });

  it('offline simulation completes with checkout executor id', async () => {
    const result = await simulatePairP5CheckoutAuthorizationGatedTransactionOffline(baseInput());
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE');
    assert.equal(result.executorId, PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTOR_ID);
    assert.equal(result.holdReasonCode, null);
    assert.equal(result.simulationOnly, true);
    assert.equal(result.executionAuthorized, PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized);
  });

  it('checkout test receipt is distinct from identity receipt', () => {
    const gitFixture = {
      worktreeRealpath: PAIR_P5_EXPECTED_REPO_ROOT,
      branch: REPOSITORY.branch,
      headCommitSha: REPOSITORY.headCommitSha,
      treeSha: REPOSITORY.treeSha,
      indexHasEmptyIntentToAddPlaceholders: false,
      worktreeContentPresent: true,
    };
    const identityReceipt = issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture({
      injectedGit: gitFixture,
    });
    const checkoutReceipt = issuePairP5TestOnlyCheckoutDedicatedTargetBindingReceiptFromInjectedTestFixture({
      injectedGit: gitFixture,
    });
    assert.equal(identityReceipt.ok, true);
    assert.equal(checkoutReceipt.ok, true);
    if (!identityReceipt.ok || !checkoutReceipt.ok) {
      return;
    }
    assert.equal(identityReceipt.receipt.body.selectedStep, PAIR_P5_IDENTITY_STEP_ID);
    assert.equal(checkoutReceipt.receipt.body.selectedStep, PAIR_P5_CHECKOUT_STEP_ID);
    assert.notEqual(
      identityReceipt.receipt.receiptIdentifierSha256,
      checkoutReceipt.receipt.receiptIdentifierSha256,
    );
  });
});
