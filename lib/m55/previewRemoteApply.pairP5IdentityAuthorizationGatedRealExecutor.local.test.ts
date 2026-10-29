import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertPairP5PrerequisiteLocalCodeIntegrity,
  classifyPairP5PostCommitAckFromFreshObservations,
  executePairP5IdentityAuthorizationGatedRealExecution,
  HOLD_PAIR_P5_COMMIT_REJECTED,
  HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED,
  PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
  PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED,
  PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5,
  PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
  PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS,
  PAIR_P5_LIVE_PG_ORCHESTRATION_IMPLEMENTATION_STATUS,
  isPairP5HumanPreviewApplyAuthorizationGranted,
  simulatePairP5AuthorizationGatedTransactionOffline,
  preparePairP5LiveSessionPoolerOrchestrationSurface,
  PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_AUTHORIZED,
  isPairP5LiveCredentialAcquisitionAuthorized,
  attemptPairP5LegacyTargetBindingReceiptIssuance,
  buildPairP5DedicatedPreviewConnectionIntent,
  HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP,
  probePairP5LiveFreshReadonlyPostCommitClassifierWhenHumanGateClosed,
  probePairP5DedicatedReceiptBeforeCredentialsForTestsOnly,
  validatePairP5PreviewStructuralAuthorityContract,
  getPairP5LiveCredentialAcquisitionProbeCountForTestsOnly,
  resetPairP5LiveCredentialAcquisitionProbeForTestsOnly,
  mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult,
  pairP5AuthGatedRealExecutionCliExitCode,
  PAIR_P5_LIVE_SECURE_STDIN_CREDENTIAL_DEPS,
} from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_REPLAY,
  HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID,
  PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_REGISTRY_SCOPE,
  PAIR_P5_OPERATIONAL_RECEIPT_READINESS,
  PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS,
  HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED,
  HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED,
  HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED,
  evaluatePairP5LiveDedicatedPathPreCredentialBoundary,
  attemptPairP5OperationalDedicatedTargetBindingReceiptIssuance,
  pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold,
  buildPairP5DedicatedReceiptValidationContextFromFreshGitRead,
  buildPairP5DedicatedReceiptValidationContextFromInjectedTestFixture,
  buildPairP5TestOnlyWitnessedPreviewObservationFixture,
  computePairP5DedicatedReceiptHashesForBody,
  guardPairP5CredentialPathWithDedicatedReceipt,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID,
  issuePairP5TestOnlyDedicatedTargetBindingReceipt,
  issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture,
  loadPairP5DedicatedTargetBindingReceiptFromOwnerControlledJsonFile,
  readPairP5DedicatedReceiptGitProvenance,
  resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly,
  validatePairP5DedicatedTargetBindingReceipt,
  validatePairP5WitnessedPreviewObservation,
  type PairP5DedicatedTargetBindingReceipt,
  type PairP5DedicatedTargetBindingReceiptBody,
  HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED,
  HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED,
  HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID,
  HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE,
  HOLD_PAIR_P5_OPERATIONAL_WITNESS_UNOBSERVED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID,
  HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED,
  resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt,
  HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED,
  PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
  PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE,
  PAIR_P5_INDEPENDENT_PREVIEW_UI_ATTESTATION_ID_PREFIX,
  validatePairP5IndependentPreviewUiWitnessObservation,
  validatePairP5IndependentPreviewUiWitnessFieldContractForTestsOnly,
  validatePairP5HumanPreviewApplyAuthorizationRecord,
  validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly,
  claimPairP5DurableDedicatedReceiptOneTimeUse,
  resetPairP5DurableReceiptClaimAttemptCountForTestsOnly,
  getPairP5DurableReceiptClaimAttemptCountForTestsOnly,
  PAIR_P5_LIVE_PRE_CREDENTIAL_BOUNDARY_STEP_ORDER,
  PAIR_P5_POST_CONNECT_MUTATION_TRANSACTION_STEP_ORDER,
  HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED,
  resetPairP5IndependentPreviewUiAttestationRegistryForTestsOnly,
  registerPairP5IndependentPreviewUiAttestationForTestsOnly,
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly,
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly,
} from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import {
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_STEP_ID,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_HISTORICAL_FROZEN_SOURCE_BASELINE_HEAD_COMMIT_SHA,
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  assertPairP5R7D5MigrationExactBytesPresent,
  validatePairP5OperationalLiveGitHeadAuthorityBinding,
  validatePairP5RuntimeGitHeadAuthorityBinding,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  buildPairP5SyntheticFixtureRepositoryIdentity,
  validateDedicatedPairP5IdentityStepSelection,
} from './previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import { SESSION_POOLER_HOST_FINGERPRINT_SHA256 } from './previewRemoteApply/remoteConnectionAuthority.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import {
  parsePairP5AuthGatedRealExecutionCliArgs,
  runPreviewPairP5IdentityAuthorizationGatedRealExecutionCli,
} from '../../scripts/m55/runPreviewPairP5IdentityAuthorizationGatedRealExecution.ts';

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

function baseInput(
  overrides: Partial<Parameters<typeof executePairP5IdentityAuthorizationGatedRealExecution>[0]> = {},
) {
  return {
    repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
    repository: REPOSITORY,
    repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
    target: TARGET,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    ...overrides,
  };
}

describe('pair P5 authorization-gated real executor', () => {
  it('documents scoped apply authorization with secure stdin credential wiring behind operational receipt', () => {
    assert.equal(PAIR_P5_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED, true);
    assert.equal(isPairP5HumanPreviewApplyAuthorizationGranted(), true);
    assert.equal(PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_AUTHORIZED, true);
    assert.equal(isPairP5LiveCredentialAcquisitionAuthorized(), true);
    assert.equal(
      PAIR_P5_LIVE_PG_ORCHESTRATION_IMPLEMENTATION_STATUS,
      'READY_BEHIND_OPERATIONAL_RECEIPT_AND_SECURE_STDIN',
    );
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.livePgTransactionOrchestrationImplemented, true);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.livePgConnectionImplementedAsInertStub, false);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.applyReadyClaimForbidden, true);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.dedicatedTargetBindingReceiptSchemaImplemented, true);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.operationalDedicatedReceiptIssuancePermitted, false);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.liveDedicatedPathUsesLegacyTargetBindingReceiptTerminal, false);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.liveCredentialAcquisitionAuthorized, true);
    assert.deepEqual(PAIR_P5_LIVE_SECURE_STDIN_CREDENTIAL_DEPS, {});
    assert.equal(PAIR_P5_OPERATIONAL_RECEIPT_READINESS.operationalIssuancePermitted, false);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.liveFreshReadonlyProbeAuthorizationGranted, false);
    assert.equal(PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE.witnessedDatabaseNameUiObserved, false);
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.durableCrossProcessReplayImplemented, false);
    assert.ok(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.liveCredentialPathOrdering.length >= 8);
  });

  it('default entry holds on missing dedicated receipt before credentials', async () => {
    const result = await executePairP5IdentityAuthorizationGatedRealExecution(baseInput());
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    assert.equal(result.executorId, PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.evidence.authorizationCheckedFirst, true);
    assert.equal(result.evidence.remoteConnectionAttempted, false);
    assert.equal(result.evidence.pgClientConstructed, false);
    assert.equal(result.evidence.credentialAcquisitionAttempted, false);
    assert.equal(result.evidence.beginExecuted, false);
    assert.equal(result.evidence.applyReadyFromProbeGreen, false);
  });

  it('rejects wrong dedicated step tokens before simulation', async () => {
    for (const bad of ['P8', 'P5', 'ALL', '20261010000000', 'PAIR_P5_CHECKOUT_20261010']) {
      assert.equal(validateDedicatedPairP5IdentityStepSelection(bad).ok, false);
      const entry = await executePairP5IdentityAuthorizationGatedRealExecution(
        baseInput({ selectedStep: bad }),
      );
      assert.equal(entry.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
      assert.equal(entry.holdReasonCode, 'HOLD_PAIR_P5_STEP_SELECTION_INVALID');
      const sim = await simulatePairP5AuthorizationGatedTransactionOffline(
        baseInput({ selectedStep: bad }),
      );
      assert.equal(sim.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
    }
  });

  it('rejects production target and wrong preview binding', async () => {
    const prod = await executePairP5IdentityAuthorizationGatedRealExecution(
      baseInput({
        target: { ...TARGET, organization: 'm55-soul', project: 'm55-soul-core' },
      }),
    );
    assert.equal(prod.holdReasonCode, 'HOLD_PAIR_P5_TARGET_PRODUCTION_FORBIDDEN');
    const badRef = await executePairP5IdentityAuthorizationGatedRealExecution(
      baseInput({ target: { ...TARGET, projectRef: 'wrong-ref' } }),
    );
    assert.equal(badRef.holdReasonCode, 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH');
    const badFp = await executePairP5IdentityAuthorizationGatedRealExecution(
      baseInput({ target: { ...TARGET, hostFingerprintSha256: 'a'.repeat(64) } }),
    );
    assert.equal(badFp.holdReasonCode, 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH');
  });

  it('rejects dirty repository identity', async () => {
    const result = await executePairP5IdentityAuthorizationGatedRealExecution(
      baseInput({ repository: { ...REPOSITORY, trackedWorktreeClean: false } }),
    );
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH');
  });

  it('CLI rejects forbidden execute/apply/credential flags', () => {
    for (const argv of [
      ['--execute', 'true'],
      ['--apply', '1'],
      ['--force'],
      ['--database-url', 'postgres://x'],
      ['--credential', 'x'],
    ]) {
      const parsed = parsePairP5AuthGatedRealExecutionCliArgs(argv);
      assert.ok('holdReasonCode' in parsed);
      assert.equal(parsed.holdReasonCode, 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED');
    }
  });

  it('imports authoritative R7 D5 migration bytes in worktree', () => {
    assertPairP5R7D5MigrationExactBytesPresent(PAIR_P5_EXPECTED_REPO_ROOT);
  });

  it('binds runtime git head to receipt-authorized commit, not historical baseline pin', () => {
    const authorized = '23f86d8b2250624f1c40dd04212552238d22b99b';
    const tree = '488bd28566fece29220cfaf11a1a9cc2efc5c92f';
    assert.equal(
      validatePairP5RuntimeGitHeadAuthorityBinding({
        observedHeadCommitSha: authorized,
        observedTreeSha: tree,
        receiptAuthorizedHeadCommitSha: authorized,
        receiptAuthorizedTreeSha: tree,
        signedAttestationGitHeadCommitSha: authorized,
      }),
      null,
    );
    assert.equal(
      validatePairP5RuntimeGitHeadAuthorityBinding({
        observedHeadCommitSha: authorized,
        observedTreeSha: tree,
        receiptAuthorizedHeadCommitSha: PAIR_P5_HISTORICAL_FROZEN_SOURCE_BASELINE_HEAD_COMMIT_SHA,
        receiptAuthorizedTreeSha: null,
        signedAttestationGitHeadCommitSha: null,
      }),
      'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH',
    );
    assert.equal(PAIR_P5_EXPECTED_HEAD_COMMIT_SHA, PAIR_P5_HISTORICAL_FROZEN_SOURCE_BASELINE_HEAD_COMMIT_SHA);
    assert.equal(
      validatePairP5OperationalLiveGitHeadAuthorityBinding({
        observedHeadCommitSha: authorized,
        observedTreeSha: tree,
        receiptAuthorizedHeadCommitSha: authorized,
        receiptAuthorizedTreeSha: tree,
        signedAttestationGitHeadCommitSha: null,
      }),
      'HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH',
    );
  });

  it('CLI rejects missing dedicated receipt json path and malformed json files', async () => {
    const missing = await runPreviewPairP5IdentityAuthorizationGatedRealExecutionCli([
      '--step',
      PAIR_P5_IDENTITY_STEP_ID,
      '--project-ref',
      PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      '--host-fingerprint-sha256',
      SESSION_POOLER_HOST_FINGERPRINT_SHA256,
      '--repository-source',
      'synthetic-fixture',
      '--dedicated-receipt-json-path',
      join(tmpdir(), 'm55-pair-p5-nonexistent-receipt.json'),
    ]);
    assert.equal(missing.exitCode, 1);
    const missingBody = JSON.parse(missing.stdout) as { holdReasonCode: string };
    assert.equal(missingBody.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID);

    const dir = mkdtempSync(join(tmpdir(), 'm55-pair-p5-receipt-'));
    const badJsonPath = join(dir, 'bad-receipt.json');
    writeFileSync(badJsonPath, '{not-json', 'utf8');
    chmodSync(badJsonPath, 0o600);
    const bad = await runPreviewPairP5IdentityAuthorizationGatedRealExecutionCli([
      '--step',
      PAIR_P5_IDENTITY_STEP_ID,
      '--project-ref',
      PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      '--host-fingerprint-sha256',
      SESSION_POOLER_HOST_FINGERPRINT_SHA256,
      '--repository-source',
      'synthetic-fixture',
      '--dedicated-receipt-json-path',
      badJsonPath,
    ]);
    assert.equal(bad.exitCode, 1);
    const badBody = JSON.parse(bad.stdout) as { holdReasonCode: string };
    assert.equal(badBody.holdReasonCode, 'HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID');

    const loaded = loadPairP5DedicatedTargetBindingReceiptFromOwnerControlledJsonFile(badJsonPath);
    assert.equal(loaded.ok, false);
  });

  it('CLI default invocation exits nonzero with execution disabled', async () => {
    const synthetic = buildPairP5SyntheticFixtureRepositoryIdentity();
    const cli = await runPreviewPairP5IdentityAuthorizationGatedRealExecutionCli([
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
    const body = JSON.parse(cli.stdout) as { mode: string; holdReasonCode: string };
    assert.equal(body.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
    assert.equal(body.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    void synthetic;
  });

  it('pins migration-derived function body md5 expectations and catalog probe sql', () => {
    assertPairP5PrerequisiteLocalCodeIntegrity();
    assert.equal(
      PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5.m55_compatibility_snapshot_columns_immutable_v1,
      '1be04ec855cf80bab54d25f87824cb9d',
    );
    assert.equal(PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL_SHA256_LITERAL.length, 64);
    assert.equal(
      PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.fulfillRpcBodyFingerprintVerification,
      'SOURCE_DERIVED_EXPECTATION_ONLY_NOT_PG_OBSERVED',
    );
    assert.equal(PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS.pgObservedFunctionBodyParityVerified, false);
  });

  it('uses Pair-specific connection intent without legacy P5 step or paid-lp branch surrogate', () => {
    const intent = buildPairP5DedicatedPreviewConnectionIntent(baseInput());
    assert.equal(intent.dedicatedPairStepId, PAIR_P5_IDENTITY_STEP_ID);
    assert.equal(intent.repositoryBranch, 'feat/m55-pair-p5-owned-state-identity-v1');
    assert.notEqual(intent.repositoryBranch, 'feat/m55-paid-lp-canonical-wave1');
    assert.equal(intent.credentialMethod, PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD);
  });

  it('structural authority passes offline checks but refuses legacy TargetBindingReceipt forgery', () => {
    const structural = validatePairP5PreviewStructuralAuthorityContract(baseInput());
    assert.equal(structural.ok, true);
    if (structural.ok) {
      assert.equal(structural.legacyTargetBindingReceiptIssuable, false);
      assert.equal(structural.independentRemoteObservationsRequired, true);
    }
    const legacy = attemptPairP5LegacyTargetBindingReceiptIssuance(baseInput());
    assert.equal(legacy.issuable, false);
    assert.equal(legacy.holdReasonCode, HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP);
  });

  it('live fresh readonly classifier stays fail-closed without operational receipt', async () => {
    const fresh = await probePairP5LiveFreshReadonlyPostCommitClassifierWhenHumanGateClosed(baseInput());
    assert.equal(fresh.classifierRan, false);
    assert.equal(fresh.evidencePatch.liveFreshReadonlyHumanAuthorizationGateClosed, false);
    assert.equal(fresh.ok, false);
  });

  it('internal live-fresh structure exercise runs distinct fake readonly lifecycle', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      internalLiveFreshReadonlyStructureExercise: true,
    });
    assert.equal(result.holdReasonCode, null);
    assert.ok(result.querySequence.includes('FRESH_READONLY_CONNECT'));
    assert.ok(result.querySequence.includes('FRESH_READONLY_FUNCTION_BODY_CATALOG_PROBE'));
    assert.equal(result.evidence.freshReadonlyDistinctClientSession, true);
  });

  it('maps successful live orchestration to LIVE_MUTATION_COMPLETE with CLI exit 0', async () => {
    const sim = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
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
    assert.equal(live.holdReasonCode, null);
    assert.equal(live.liveMutationOnly, true);
    assert.equal(pairP5AuthGatedRealExecutionCliExitCode(live), 0);
    assert.equal(pairP5AuthGatedRealExecutionCliExitCode(sim), 0);
  });

  it('live surface preparation requires dedicated receipt and rejects test-only as operational', async () => {
    const missing = preparePairP5LiveSessionPoolerOrchestrationSurface(baseInput());
    assert.equal(missing, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    const issued = issuePairP5TestOnlyDedicatedTargetBindingReceipt({
      repoRoot: baseInput().repoRoot,
    });
    assert.equal(issued.ok, true);
    if (!issued.ok) {
      return;
    }
    const receipt = issued.receipt;
    const testOnlyBinding = resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt({
      repoRoot: baseInput().repoRoot,
      dedicatedReceipt: receipt,
    });
    assert.equal(testOnlyBinding.ok, false);
    if (!testOnlyBinding.ok) {
      assert.equal(testOnlyBinding.holdReasonCode, HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED);
    }
    resetPairP5LiveCredentialAcquisitionProbeForTestsOnly();
    const disabled = await executePairP5IdentityAuthorizationGatedRealExecution(baseInput());
    assert.equal(disabled.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    assert.equal(getPairP5LiveCredentialAcquisitionProbeCountForTestsOnly(), 0);
  });

  it('offline simulation without ledger binding skips claim (negative control vs live mandatory claim)', async () => {
    const without = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(without.holdReasonCode, null);
    assert.equal(without.querySequence.includes('DEDICATED_RECEIPT_LEDGER_ATOMIC_CLAIM'), false);
  });

  it('offline simulation runs ledger atomic claim before DDL when binding provided', async () => {
    const binding = {
      receiptIdentifierSha256: 'f'.repeat(64),
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      operationPurpose: 'LIVE_MUTATION' as const,
      attestationIdentityDigestSha256: 'a'.repeat(64),
      humanAuthorizationIdentityDigestSha256: 'b'.repeat(64),
    };
    const ok = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      postConnectDedicatedReceiptLedgerBinding: binding,
    });
    assert.equal(ok.holdReasonCode, null);
    const ledgerIdx = ok.querySequence.indexOf('DEDICATED_RECEIPT_LEDGER_ATOMIC_CLAIM');
    const firstMutationIdx = ok.querySequence.indexOf('MUTATION_STATEMENT');
    assert.ok(ledgerIdx >= 0);
    assert.ok(firstMutationIdx > ledgerIdx);
    const replay = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      postConnectDedicatedReceiptLedgerBinding: binding,
      postConnectDedicatedReceiptLedgerSimulateAlreadyConsumed: true,
    });
    assert.equal(replay.holdReasonCode, HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED);
    assert.equal(replay.evidence.rollbackAcknowledged, true);
  });

  it('offline simulation runs exact phase order and full fresh post probe', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE');
    assert.equal(result.simulationOnly, true);
    assert.equal(result.simulationCannotAuthorizeApply, true);
    assert.equal(result.holdReasonCode, null);
    assert.equal(result.evidence.mutationStatementsExecuted, PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT);
    assert.equal(result.evidence.historyInsertExecuted, true);
    assert.equal(result.evidence.historyInsertParameterized, true);
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.evidence.freshReadonlySessionOpened, true);
    assert.equal(result.evidence.freshReadonlyPostProbeExecuted, true);
    assert.equal(result.evidence.freshReadonlyPostProbeValidated, true);
    assert.equal(result.evidence.freshReadonlyUsesFullPostProbeNotCountOnly, true);
    assert.equal(result.evidence.freshReadonlyDistinctClientSession, true);
    assert.equal(result.evidence.ackClassifierAckState, 'DEFINITELY_COMMITTED');
    assert.equal(result.evidence.freshReadonlyPriorProbeValidated, false);
    assert.equal(result.evidence.freshReadonlyCloseCompleted, true);
    assert.equal(result.evidence.functionBodyCatalogProbeExecutedBeforeCommit, true);
    assert.equal(result.evidence.functionBodyCatalogProbeValidatedBeforeCommit, true);
    assert.equal(result.evidence.functionBodyCatalogProbeExecutedFreshReadonly, true);
    assert.equal(result.evidence.functionBodyCatalogProbeValidatedFreshReadonly, true);
    assert.equal(result.evidence.previewStructuralAuthorityValidated, true);
    assert.equal(result.evidence.legacyTargetBindingReceiptIssuable, false);
    assert.ok(result.querySequence.includes('FUNCTION_BODY_CATALOG_PROBE'));
    assert.ok(result.querySequence.includes('FRESH_READONLY_FUNCTION_BODY_CATALOG_PROBE'));
    assert.ok(result.querySequence.indexOf('PRIOR_PROBE') < result.querySequence.lastIndexOf('MUTATION_STATEMENT'));
    assert.ok(result.querySequence.indexOf('HISTORY_INSERT') < result.querySequence.indexOf('POST_PROBE'));
    assert.ok(result.querySequence.indexOf('POST_PROBE') < result.querySequence.indexOf('COMMIT'));
    assert.ok(result.querySequence.includes('FRESH_READONLY_PRIOR_PROBE'));
    assert.ok(result.querySequence.includes('FRESH_READONLY_POST_PROBE'));
    assert.ok(result.querySequence.includes('FRESH_READONLY_POST_CONNECT_GUARD'));
    assert.equal(result.evidence.freshReadonlyPriorProbeExecuted, true);
    assert.equal(result.evidence.originalConnectionCloseCompleted, true);
    assert.equal(result.querySequence.includes('FRESH_READONLY_VERSION_COUNT'), false);
  });

  it('ignores injectable fake queryHandler from simulation options', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: {
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        queryHandler: () => ({ rows: [{ probe_green: true }], rowCount: 1 }),
      },
      priorProbeFieldOverrides: { history_total_twenty_two: false },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
  });

  it('simulation success cannot authorize apply or flip execution gate', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.migrationApplyAuthorized, false);
    assert.equal(result.evidence.applyReadyFromProbeGreen, false);
    assert.equal(isPairP5HumanPreviewApplyAuthorizationGranted(), true);
    assert.equal(PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_AUTHORIZED, true);
  });

  it('rolls back on failed prior probe in simulation', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      priorProbeFieldOverrides: { history_total_twenty_two: false },
    });
    assert.equal(result.mode, 'PAIR_P5_AUTH_GATED_REAL_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
    assert.equal(result.evidence.commitSent, false);
    assert.equal(result.evidence.rollbackSent, true);
    assert.equal(result.evidence.rollbackAcknowledged, true);
  });

  it('rolls back on failed post probe before commit', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      postProbeFieldOverrides: { probe_green: false },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_PROBE_MISMATCH');
    assert.equal(result.evidence.commitSent, false);
    assert.equal(result.evidence.postProbeExecuted, true);
    assert.equal(result.evidence.rollbackAcknowledged, true);
  });

  it('post-commit rejection does not rollback', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION' },
    });
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_COMMIT_REJECTED);
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.rollbackSent, false);
    assert.ok(result.evidence.ackClassifierAckState);
  });

  it('ACK with fresh next-probe drift is CONTRADICTORY not DEFINITELY_NOT_COMMITTED', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      freshPostProbeFieldOverrides: { probe_green: false },
    });
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_FRESH_READONLY_CONTRADICTORY');
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(result.evidence.freshReadonlyPostProbeValidated, false);
    assert.equal(result.evidence.ackClassifierAckState, 'CONTRADICTORY_OR_DRIFTED');
    assert.notEqual(result.evidence.ackClassifierAckState, 'DEFINITELY_NOT_COMMITTED');
  });

  it('rejected COMMIT with fresh exact prior and failed next classifies NOT_COMMITTED', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION' },
      freshPriorProbeFieldOverrides: {},
      freshPostProbeFieldOverrides: { probe_green: false },
    });
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_COMMIT_REJECTED);
    assert.equal(result.evidence.ackClassifierAckState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(result.evidence.freshReadonlyPriorProbeValidated, true);
    assert.equal(result.evidence.rollbackSent, false);
  });

  it('COMMIT transport loss does not rollback and runs fresh classifier', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { transportLossOnCommit: true },
    });
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS');
    assert.equal(result.querySequence?.includes('COMMIT_THROWN'), true);
    assert.ok(result.evidence.freshReadonlyPriorProbeExecuted);
  });

  it('failed fresh guard leaves session incomplete', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      freshReadonlyFakeOptions: {
        failConnect: true,
      },
    });
    assert.equal(result.evidence.freshReadonlySessionCompleted, false);
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_FRESH_READONLY_CONTRADICTORY');
  });

  describe('PC-1 fresh post-commit ack truth table', () => {
    it('both true is CONTRADICTORY for definitive ACK', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('DEFINITIVE_COMMIT_ACK', true, true),
        'CONTRADICTORY_OR_DRIFTED',
      );
    });
    it('both false is CONTRADICTORY for uncertain receipt', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('ACK_UNCERTAIN_OR_MISSING', false, false),
        'CONTRADICTORY_OR_DRIFTED',
      );
    });
    it('both true is CONTRADICTORY for rejected receipt', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('DEFINITIVE_TRANSACTION_REJECTION', true, true),
        'CONTRADICTORY_OR_DRIFTED',
      );
    });
    it('prior-only under definitive ACK is CONTRADICTORY', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('DEFINITIVE_COMMIT_ACK', true, false),
        'CONTRADICTORY_OR_DRIFTED',
      );
    });
    it('prior-only under rejection is NOT_COMMITTED', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('DEFINITIVE_TRANSACTION_REJECTION', true, false),
        'DEFINITELY_NOT_COMMITTED',
      );
    });
    it('post-only is COMMITTED regardless of receipt class', () => {
      assert.equal(
        classifyPairP5PostCommitAckFromFreshObservations('ACK_UNCERTAIN_OR_MISSING', false, true),
        'DEFINITELY_COMMITTED',
      );
    });
  });

  it('mutation close failure after ACK holds without rollback retry', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      mutationCloseFailsAfterSuccessfulCommit: true,
    });
    assert.equal(result.holdReasonCode, HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED);
    assert.equal(result.evidence.commitSent, true);
    assert.equal(result.evidence.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(result.evidence.originalConnectionCloseCompleted, false);
    assert.equal(result.evidence.rollbackSent, false);
    assert.equal(result.executionAuthorized, false);
  });

  it('ACK with simultaneous fresh prior and post green is CONTRADICTORY', async () => {
    const result = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
      freshPriorProbeFieldOverrides: {},
    });
    assert.equal(result.evidence.ackClassifierAckState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.holdReasonCode, 'HOLD_PAIR_P5_FRESH_READONLY_CONTRADICTORY');
  });

  describe('dedicated P5-1 target binding receipt (offline)', () => {
    function freshValidationContext(permitTestOnlyReceipt: boolean) {
      const built = buildPairP5DedicatedReceiptValidationContextFromFreshGitRead({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
        permitTestOnlyReceipt,
      });
      assert.equal(built.ok, true);
      if (!built.ok) {
        throw new Error('fresh validation context unavailable');
      }
      return built.context;
    }

    function issueTestReceipt() {
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const issued = issuePairP5TestOnlyDedicatedTargetBindingReceipt({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      });
      assert.equal(issued.ok, true);
      if (!issued.ok) {
        throw new Error('fixture receipt issuance failed');
      }
      return issued.receipt;
    }

    it('issues deterministic TEST_ONLY receipt identifier and validates policy', () => {
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const first = issueTestReceipt();
      const second = issuePairP5TestOnlyDedicatedTargetBindingReceipt({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      });
      assert.equal(second.ok, true);
      if (second.ok) {
        assert.equal(first.receiptIdentifierSha256, second.receipt.receiptIdentifierSha256);
        assert.equal(first.body.schemaId, PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID);
        assert.equal(first.body.receiptClass, 'TEST_ONLY');
        assert.equal(first.body.humanAuthorizationId, null);
      }
      const validated = validatePairP5DedicatedTargetBindingReceipt(first, freshValidationContext(true));
      assert.equal(validated.ok, true);
      assert.equal(PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_REGISTRY_SCOPE, 'PROCESS_LOCAL_TEST_ONLY_NOT_DURABLE');
    });

    it('blocks operational issuance and rejects UI witness without Human apply GO', () => {
      const operational = attemptPairP5OperationalDedicatedTargetBindingReceiptIssuance();
      assert.equal(operational.issuable, false);
      assert.equal(operational.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN);
      assert.ok(
        operational.externalHolds.includes(PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.independentPreviewUiWitness),
      );
      assert.ok(
        operational.externalHolds.includes(PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.liveCredentialAdapter),
      );
      const uiWitness = validatePairP5WitnessedPreviewObservation({
        ...buildPairP5TestOnlyWitnessedPreviewObservationFixture(),
        sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1' as 'INDEPENDENT_PREVIEW_UI_WITNESS_v1',
      });
      assert.equal(uiWitness.ok, false);
      assert.equal(uiWitness.holdReasonCode, HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED);
    });

    it('independent UI witness field contract vs operational acceptance (no test-registry laundering)', () => {
      resetPairP5IndependentPreviewUiAttestationRegistryForTestsOnly();
      const base = {
        sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1' as const,
        witnessedOrganization: TARGET.organization,
        witnessedProject: TARGET.project,
        witnessedProjectRef: TARGET.projectRef,
        witnessedDatabaseTier: TARGET.databaseTier,
        witnessedDatabaseName: PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
        observationTimeIso: '2026-10-23T07:45:00.000Z',
        attestationId: `${PAIR_P5_INDEPENDENT_PREVIEW_UI_ATTESTATION_ID_PREFIX}UNREGISTERED`,
      };
      const unregistered = validatePairP5IndependentPreviewUiWitnessFieldContractForTestsOnly(base);
      assert.equal(unregistered.ok, false);
      if (!unregistered.ok) {
        assert.equal(unregistered.holdReasonCode, HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED);
      }
      registerPairP5IndependentPreviewUiAttestationForTestsOnly(base.attestationId);
      const fieldOk = validatePairP5IndependentPreviewUiWitnessFieldContractForTestsOnly(base);
      assert.equal(fieldOk.ok, true);
      const operational = validatePairP5IndependentPreviewUiWitnessObservation(base);
      assert.equal(operational.ok, false);
      if (!operational.ok) {
        assert.equal(operational.holdReasonCode, HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED);
      }
      const postgresClaim = validatePairP5IndependentPreviewUiWitnessObservation({
        ...base,
        witnessedDatabaseName: 'postgres',
      });
      assert.equal(postgresClaim.ok, false);
      if (!postgresClaim.ok) {
        assert.equal(postgresClaim.holdReasonCode, HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED);
      }
    });

    it('human authorization id without attestation context and durable replay stay fail-closed', async () => {
      resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly();
      const human = validatePairP5HumanPreviewApplyAuthorizationRecord('HUMAN_APPLY_NOT_ISSUED', 'LIVE_MUTATION');
      assert.equal(human.ok, false);
      assert.equal(human.holdReasonCode, HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE);
      const durable = claimPairP5DurableDedicatedReceiptOneTimeUse('b'.repeat(64));
      assert.equal(durable.ok, false);
      assert.equal(durable.holdReasonCode, HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID);
      resetPairP5LiveCredentialAcquisitionProbeForTestsOnly();
      await executePairP5IdentityAuthorizationGatedRealExecution(baseInput());
      assert.equal(getPairP5LiveCredentialAcquisitionProbeCountForTestsOnly(), 0);
    });

    it('fails closed on missing receipt, replay, and provenance drift before credentials', () => {
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const missing = probePairP5DedicatedReceiptBeforeCredentialsForTestsOnly(baseInput(), null, false);
      assert.equal(missing, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
      const receipt = issueTestReceipt();
      const okPath = probePairP5DedicatedReceiptBeforeCredentialsForTestsOnly(baseInput(), receipt, true);
      assert.equal(okPath, HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED);
      assert.notEqual(okPath, HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP);
      validatePairP5DedicatedTargetBindingReceipt(receipt, freshValidationContext(true));
      const replay = guardPairP5CredentialPathWithDedicatedReceipt(receipt, freshValidationContext(true));
      assert.equal(replay.ok, false);
      assert.equal(replay.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_REPLAY);
      const observedGit = readPairP5DedicatedReceiptGitProvenance(PAIR_P5_EXPECTED_REPO_ROOT);
      const driftIssued = issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture({
        injectedGit: { ...observedGit, branch: 'wrong-branch' },
      });
      assert.equal(driftIssued.ok, true);
      if (driftIssued.ok) {
        const drift = validatePairP5DedicatedTargetBindingReceipt(
          driftIssued.receipt,
          buildPairP5DedicatedReceiptValidationContextFromInjectedTestFixture({
            injectedGit: observedGit,
            permitTestOnlyReceipt: true,
          }),
        );
        assert.equal(drift.ok, false);
        assert.equal(drift.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH);
      }
    });

    it('valid TEST_ONLY receipt cannot pass live credential guard (permitTestOnly false)', async () => {
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const receipt = issueTestReceipt();
      validatePairP5DedicatedTargetBindingReceipt(receipt, freshValidationContext(true));
      const liveGuard = guardPairP5CredentialPathWithDedicatedReceipt(receipt, freshValidationContext(false));
      assert.equal(liveGuard.ok, false);
      assert.equal(liveGuard.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID);
      const disabled = await executePairP5IdentityAuthorizationGatedRealExecution(baseInput());
      assert.equal(disabled.evidence.credentialAcquisitionAttempted, false);
      assert.equal(disabled.evidence.pgClientConstructed, false);
    });

    it('rejects forged observation, production target, and secret key injection', () => {
      const prodWitness = validatePairP5WitnessedPreviewObservation({
        ...buildPairP5TestOnlyWitnessedPreviewObservationFixture(),
        witnessedOrganization: 'm55-soul',
        witnessedProject: 'm55-soul-core',
      });
      assert.equal(prodWitness.ok, false);
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const receipt = issueTestReceipt();
      const tampered = {
        ...receipt,
        body: {
          ...receipt.body,
          witnessedObservation: {
            ...receipt.body.witnessedObservation,
            witnessedProjectRef: 'production-ref',
          },
        },
      };
      const invalid = validatePairP5DedicatedTargetBindingReceipt(tampered, freshValidationContext(true));
      assert.equal(invalid.ok, false);
      assert.ok(
        invalid.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID ||
          invalid.holdReasonCode === HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID ||
          invalid.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH,
      );
      const secretObservation = validatePairP5WitnessedPreviewObservation({
        ...buildPairP5TestOnlyWitnessedPreviewObservationFixture(),
        attestationId: 'password-leak',
      });
      assert.equal(secretObservation.ok, false);
    });

    it('rejects hash-consistent but semantically wrong migration source via field policy', () => {
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const receipt = issueTestReceipt();
      const wrongSha = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const wrongBody = structuredClone(receipt.body);
      assert.equal(Reflect.set(wrongBody, 'migrationSourceSha256', wrongSha), true);
      assert.equal(wrongBody.migrationSourceSha256, wrongSha);
      const hashes = computePairP5DedicatedReceiptHashesForBody(
        wrongBody as PairP5DedicatedTargetBindingReceiptBody,
      );
      const forged: PairP5DedicatedTargetBindingReceipt = {
        body: wrongBody as PairP5DedicatedTargetBindingReceiptBody,
        canonicalSerializationSha256: hashes.canonicalSerializationSha256,
        receiptIdentifierSha256: hashes.receiptIdentifierSha256,
      };
      const result = validatePairP5DedicatedTargetBindingReceipt(forged, freshValidationContext(true));
      assert.equal(result.ok, false);
      assert.ok(
        result.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID ||
          result.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH,
      );
    });

    it('rejects malformed envelope and nested null without throwing', () => {
      const ctx = freshValidationContext(true);
      for (const bad of [null, undefined, {}, { body: null }, { body: { git: null } }]) {
        const result = validatePairP5DedicatedTargetBindingReceipt(
          bad as Parameters<typeof validatePairP5DedicatedTargetBindingReceipt>[0],
          ctx,
        );
        assert.equal(result.ok, false);
        assert.ok(
          result.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING ||
            result.holdReasonCode === HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID,
        );
      }
    });

    it('injected fixture receipt cannot validate against fresh-git operational context', () => {
      const observedGit = readPairP5DedicatedReceiptGitProvenance(PAIR_P5_EXPECTED_REPO_ROOT);
      const injected = issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture({
        injectedGit: observedGit,
      });
      assert.equal(injected.ok, true);
      if (injected.ok) {
        resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
        const fresh = validatePairP5DedicatedTargetBindingReceipt(injected.receipt, freshValidationContext(true));
        assert.equal(fresh.ok, false);
        assert.equal(fresh.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH);
      }
    });

    it('malformed witness attestationId and observationTimeIso return HOLD without throwing', () => {
      const base = buildPairP5TestOnlyWitnessedPreviewObservationFixture();
      for (const attestationId of [123, true, {}, [], null] as unknown[]) {
        const result = validatePairP5WitnessedPreviewObservation({
          ...base,
          attestationId,
        } as unknown as Parameters<typeof validatePairP5WitnessedPreviewObservation>[0]);
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.holdReasonCode, HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID);
        }
      }
      for (const observationTimeIso of [123, true, {}, [], null, '2026-02-30T00:00:00.000Z'] as unknown[]) {
        const result = validatePairP5WitnessedPreviewObservation({
          ...base,
          observationTimeIso,
        } as unknown as Parameters<typeof validatePairP5WitnessedPreviewObservation>[0]);
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.holdReasonCode, HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID);
        }
      }
    });

    it('accepts valid leap-day ISO timestamp in TEST_ONLY witness fixture', () => {
      const result = validatePairP5WitnessedPreviewObservation({
        ...buildPairP5TestOnlyWitnessedPreviewObservationFixture(),
        observationTimeIso: '2024-02-29T12:00:00.000Z',
      });
      assert.equal(result.ok, true);
    });

    it('live dedicated path pre-credential boundary rejects missing operational receipt without legacy hold', () => {
      resetPairP5DurableReceiptClaimAttemptCountForTestsOnly();
      const hold = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
        dedicatedReceipt: null,
        purpose: 'LIVE_MUTATION',
        humanPreviewApplyAuthorizationGranted: false,
      });
      assert.equal(hold, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
      assert.equal(getPairP5DurableReceiptClaimAttemptCountForTestsOnly(), 0);
      assert.notEqual(hold, HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP);
      const freshReadonly = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
        dedicatedReceipt: null,
        purpose: 'LIVE_FRESH_READONLY',
        humanPreviewApplyAuthorizationGranted: false,
      });
      assert.equal(freshReadonly, HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING);
    });

    it('live pre-credential boundary does not include durable ledger claim', () => {
      assert.equal(
        (PAIR_P5_LIVE_PRE_CREDENTIAL_BOUNDARY_STEP_ORDER as readonly string[]).includes(
          'DURABLE_CROSS_PROCESS_ONE_USE_CLAIM',
        ),
        false,
      );
      const postConnectClaimIdx = PAIR_P5_POST_CONNECT_MUTATION_TRANSACTION_STEP_ORDER.indexOf(
        'DURABLE_LEDGER_ATOMIC_CLAIM_WITHIN_SAME_PG_TRANSACTION',
      );
      assert.ok(postConnectClaimIdx > 0);
      const witnessIdx = PAIR_P5_LIVE_PRE_CREDENTIAL_BOUNDARY_STEP_ORDER.indexOf(
        'OPERATIONAL_INDEPENDENT_PREVIEW_UI_WITNESS',
      );
      const purposeIdx = PAIR_P5_LIVE_PRE_CREDENTIAL_BOUNDARY_STEP_ORDER.indexOf(
        'PURPOSE_SCOPED_HUMAN_AUTHORIZATION',
      );
      assert.ok(witnessIdx >= 0 && purposeIdx > witnessIdx);
      resetPairP5DurableReceiptClaimAttemptCountForTestsOnly();
      const receipt = issueTestReceipt();
      const boundaryHold = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
        dedicatedReceipt: receipt,
        purpose: 'LIVE_MUTATION',
        humanPreviewApplyAuthorizationGranted: false,
      });
      assert.equal(getPairP5DurableReceiptClaimAttemptCountForTestsOnly(), 0);
      assert.notEqual(boundaryHold, HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED);
    });

    it('live Human authorization record ignores test-only registry', () => {
      resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly();
      const authId = 'HUMAN_APPLY_TEST_REGISTRY_ONLY';
      registerPairP5HumanPreviewApplyAuthorizationForTestsOnly({
        authorizationId: authId,
        purpose: 'LIVE_MUTATION',
        selectedStep: PAIR_P5_IDENTITY_STEP_ID,
        migrationSourceSha256: PAIR_P5_IDENTITY_MIGRATION_SHA256,
        previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      });
      const testRegistry = validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly(
        authId,
        'LIVE_MUTATION',
      );
      assert.equal(testRegistry.ok, true);
      const live = validatePairP5HumanPreviewApplyAuthorizationRecord(authId, 'LIVE_MUTATION');
      assert.equal(live.ok, false);
      assert.equal(live.holdReasonCode, HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE);
    });

    it('live pre-credential boundary does not block on operational issuance probe', () => {
      const receipt = issueTestReceipt();
      const hold = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
        repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
        dedicatedReceipt: receipt,
        purpose: 'LIVE_MUTATION',
        humanPreviewApplyAuthorizationGranted: true,
      });
      assert.notEqual(hold, HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN);
      assert.notEqual(hold, HOLD_PAIR_P5_OPERATIONAL_WITNESS_UNOBSERVED);
    });

    it('distinguishes mutation Human apply vs fresh-readonly probe authorization holds', () => {
      assert.equal(
        pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold({
          purpose: 'LIVE_MUTATION',
          humanPreviewApplyAuthorizationGranted: false,
          liveFreshReadonlyProbeAuthorizationGranted: false,
        }),
        HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED,
      );
      assert.equal(
        pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold({
          purpose: 'LIVE_FRESH_READONLY',
          humanPreviewApplyAuthorizationGranted: false,
          liveFreshReadonlyProbeAuthorizationGranted: false,
        }),
        HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED,
      );
      assert.equal(
        pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold({
          purpose: 'LIVE_FRESH_READONLY',
          humanPreviewApplyAuthorizationGranted: true,
          liveFreshReadonlyProbeAuthorizationGranted: false,
        }),
        HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED,
      );
      assert.equal(
        pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold({
          purpose: 'LIVE_MUTATION',
          humanPreviewApplyAuthorizationGranted: true,
          liveFreshReadonlyProbeAuthorizationGranted: false,
        }),
        null,
      );
    });

    it('rejects cloned or rehashed injected receipts in fresh-git validation context', () => {
      const observedGit = readPairP5DedicatedReceiptGitProvenance(PAIR_P5_EXPECTED_REPO_ROOT);
      const injected = issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture({
        injectedGit: observedGit,
      });
      assert.equal(injected.ok, true);
      if (!injected.ok) {
        return;
      }
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const ctx = freshValidationContext(true);
      const spreadClone = { ...injected.receipt, body: { ...injected.receipt.body } };
      const spreadHold = validatePairP5DedicatedTargetBindingReceipt(spreadClone, ctx);
      assert.equal(spreadHold.ok, false);
      assert.equal(spreadHold.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH);
      const jsonClone = JSON.parse(JSON.stringify(injected.receipt)) as typeof injected.receipt;
      const jsonHold = validatePairP5DedicatedTargetBindingReceipt(jsonClone, ctx);
      assert.equal(jsonHold.ok, false);
      assert.equal(jsonHold.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH);
      const hashes = computePairP5DedicatedReceiptHashesForBody(injected.receipt.body);
      const rehashed = {
        body: injected.receipt.body,
        canonicalSerializationSha256: hashes.canonicalSerializationSha256,
        receiptIdentifierSha256: hashes.receiptIdentifierSha256,
      };
      const rehashHold = validatePairP5DedicatedTargetBindingReceipt(rehashed, ctx);
      assert.equal(rehashHold.ok, false);
      assert.equal(rehashHold.holdReasonCode, HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH);
      resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly();
      const genuine = issueTestReceipt();
      const genuineOk = validatePairP5DedicatedTargetBindingReceipt(genuine, ctx);
      assert.equal(genuineOk.ok, true);
    });
  });

  it('static gate remains false in all outcomes', async () => {
    const disabled = await executePairP5IdentityAuthorizationGatedRealExecution(baseInput());
    assert.equal(disabled.executionAuthorized, PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized);
    const sim = await simulatePairP5AuthorizationGatedTransactionOffline(baseInput(), {
      fakeClientOptions: { commitResponseClass: 'DEFINITIVE_COMMIT_ACK' },
    });
    assert.equal(sim.executionAuthorized, false);
    assert.equal(sim.migrationApplyAuthorized, false);
  });
});
