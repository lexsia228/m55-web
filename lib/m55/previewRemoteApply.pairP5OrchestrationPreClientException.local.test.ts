import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPairP5CheckoutOfflinePlan } from './previewRemoteApply/pairP5CheckoutOfflinePlan.ts';
import {
  PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE,
  PAIR_P5_CHECKOUT_STEP_ID,
  buildMockPairP5CheckoutPostProbeRow,
} from './previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import { buildMockPairP5PostProbeRow } from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import { runPairP5AuthorizationGatedPgTransactionOrchestration } from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import { SESSION_POOLER_HOST_FINGERPRINT_SHA256 } from './previewRemoteApply/remoteConnectionAuthority.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';

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

describe('pairP5 orchestration pre-mutation-client exception paths', () => {
  it('does not attempt rollback when mutation client was never constructed', async () => {
    const input = baseInput();
    const planResult = buildPairP5CheckoutOfflinePlan({
      ...input,
      executionEnablement: false,
    });
    assert.equal(planResult.mode, 'PAIR_P5_CHECKOUT_OFFLINE_PLAN');
    if (planResult.mode !== 'PAIR_P5_CHECKOUT_OFFLINE_PLAN') {
      throw new Error('expected checkout offline plan');
    }
    const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(
      input,
      planResult,
      {
        kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY',
        mutationFakeOptions: {},
        freshReadonlyFakeOptions: {},
        freshPostProbeRow: buildMockPairP5CheckoutPostProbeRow(),
        freshPriorProbeRow: buildMockPairP5PostProbeRow(),
        mutationClientConstructThrowsForTestsOnly: true,
      },
      PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE,
      null,
    );
    assert.equal(outcome.holdReasonCode, 'HOLD_UNEXPECTED_INTERNAL');
    assert.equal(outcome.evidence.rollbackSent, false);
    assert.equal(outcome.evidence.rollbackAcknowledged, false);
    assert.equal(outcome.evidence.pgClientConstructed, false);
    assert.equal(outcome.evidence.mutationStatementsExecuted, 0);
  });

  it('rolls back when connect fails after mutation client construction', async () => {
    const input = baseInput();
    const planResult = buildPairP5CheckoutOfflinePlan({
      ...input,
      executionEnablement: false,
    });
    assert.equal(planResult.mode, 'PAIR_P5_CHECKOUT_OFFLINE_PLAN');
    if (planResult.mode !== 'PAIR_P5_CHECKOUT_OFFLINE_PLAN') {
      throw new Error('expected checkout offline plan');
    }
    const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(
      input,
      planResult,
      {
        kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY',
        mutationFakeOptions: { failConnect: true },
        freshReadonlyFakeOptions: {},
        freshPostProbeRow: buildMockPairP5CheckoutPostProbeRow(),
        freshPriorProbeRow: buildMockPairP5PostProbeRow(),
      },
      PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE,
      null,
    );
    assert.equal(outcome.holdReasonCode, 'HOLD_UNEXPECTED_INTERNAL');
    assert.equal(outcome.evidence.rollbackSent, true);
    assert.equal(outcome.evidence.pgClientConstructed, true);
  });
});
