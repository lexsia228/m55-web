import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  FOUNDATION_MISSING_AUTHORITIES,
  FOUNDATION_REL_PATHS,
  loadExecutionSqlAuthorityFoundationDocument,
  loadExecutionSqlAuthorityFoundationManifest,
  validateExecutionSqlAuthorityFoundation,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import {
  ACK_STATE_IDENTIFIERS,
  branchAfterCommitResponseClass,
  buildPreCommitFailureDisposition,
  classifyAckState,
  COMMIT_RESPONSE_CLASSES,
  EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY,
  getFreshAckClassifierLifecycle,
  getFreshPostCommitVerificationLifecycle,
  PRE_COMMIT_FAILURE_CLASSES,
  REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
  validateRemoteExecutionLifecycleAuthorityDocument,
} from './previewRemoteApply/remoteExecutionLifecycleAuthority.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');
const LIFECYCLE_JSON_PATH = FOUNDATION_REL_PATHS.lifecycleAuthorityJson;

function readRepo(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

function createTempLifecycleMutationRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'm55-lifecycle-mutation-'));
  const paths = [
    ...Object.values(FOUNDATION_REL_PATHS),
    'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json',
    'scripts/m55/previewBaselineDisposableRuntime.ts',
  ];
  for (const relPath of paths) {
    const dest = join(root, relPath);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(join(REPO_ROOT, relPath), dest);
  }
  return root;
}

function manifestSelfSha(content: string, manifestRelPath: string): string {
  const clone = JSON.parse(content) as {
    files: Array<{ path: string; bytes: number; sha256: string; classification: string }>;
  };
  const idx = clone.files.findIndex((entry) => entry.path === manifestRelPath);
  clone.files[idx].sha256 = '0'.repeat(64);
  return createHash('sha256').update(`${JSON.stringify(clone, null, 2)}\n`, 'utf8').digest('hex');
}

function syncManifestSelfEntry(manifestDoc: Record<string, unknown>): void {
  const files = manifestDoc.files as Array<{ path: string; bytes: number; sha256: string; classification: string }>;
  const self = files.find((entry) => entry.path === FOUNDATION_REL_PATHS.manifestJson);
  assert.ok(self);
  let text = `${JSON.stringify(manifestDoc, null, 2)}\n`;
  for (let i = 0; i < 5; i++) {
    self.bytes = Buffer.byteLength(text, 'utf8');
    self.sha256 = manifestSelfSha(text, FOUNDATION_REL_PATHS.manifestJson);
    text = `${JSON.stringify(manifestDoc, null, 2)}\n`;
    const nextBytes = Buffer.byteLength(text, 'utf8');
    if (nextBytes === self.bytes) break;
    self.bytes = nextBytes;
  }
}

describe('remote execution lifecycle authority rev1 L1-L20', () => {
  it('L1 P1 exact not-committed', () => {
    const result = classifyAckState({
      phase: 'P1',
      predicates: {
        historyRelationAbsent: true,
        exactP0OraclePhase: true,
        p1DeltaAbsent: true,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        historyRelationExact: false,
        historyPrefixExactlyP1: false,
        exactP1OraclePhase: false,
      },
    });
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_RERUN');
    assert.equal(result.sameRunRetryForbidden, true);
    assert.equal(result.automaticNextVersionForbidden, true);
  });

  it('L2 P1 exact committed', () => {
    const result = classifyAckState({
      phase: 'P1',
      predicates: {
        historyRelationAbsent: false,
        exactP0OraclePhase: false,
        p1DeltaAbsent: false,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        historyRelationExact: true,
        historyPrefixExactlyP1: true,
        exactP1OraclePhase: true,
      },
    });
    assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION');
  });

  it('L3 P1 partial -> contradictory', () => {
    const result = classifyAckState({
      phase: 'P1',
      predicates: {
        historyRelationAbsent: true,
        exactP0OraclePhase: true,
        p1DeltaAbsent: false,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        historyRelationExact: false,
        historyPrefixExactlyP1: false,
        exactP1OraclePhase: false,
      },
    });
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.disposition, 'MANDATORY_STOP');
  });

  it('L4 P1 both predicate bundles true -> contradictory', () => {
    const result = classifyAckState({
      phase: 'P1',
      predicates: {
        historyRelationAbsent: true,
        exactP0OraclePhase: true,
        p1DeltaAbsent: true,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        historyRelationExact: true,
        historyPrefixExactlyP1: true,
        exactP1OraclePhase: true,
      },
    });
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.disposition, 'MANDATORY_STOP');
  });

  it('L5 P2 exact prior -> not-committed', () => {
    const result = classifyAckState({
      phase: 'P2',
      predicates: {
        exactPriorHistoryPrefix: true,
        exactPriorOraclePhase: true,
        currentVersionDeltaAbsent: true,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        exactNextHistoryPrefix: false,
        exactNextOraclePhase: false,
      },
    });
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_RERUN');
  });

  it('L6 P7 exact next -> committed', () => {
    const result = classifyAckState({
      phase: 'P7',
      predicates: {
        exactPriorHistoryPrefix: false,
        exactPriorOraclePhase: false,
        currentVersionDeltaAbsent: false,
        unexpectedDeltaZero: true,
        targetIdentityExact: true,
        exactNextHistoryPrefix: true,
        exactNextOraclePhase: true,
      },
    });
    assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION');
  });

  it('L7 target identity false -> contradictory', () => {
    const result = classifyAckState({
      phase: 'P2',
      predicates: {
        exactPriorHistoryPrefix: true,
        exactPriorOraclePhase: true,
        currentVersionDeltaAbsent: true,
        unexpectedDeltaZero: true,
        targetIdentityExact: false,
        exactNextHistoryPrefix: false,
        exactNextOraclePhase: false,
      },
    });
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.disposition, 'MANDATORY_STOP');
  });

  it('L8 commit response definitive ACK branch', () => {
    const result = branchAfterCommitResponseClass({
      responseClass: 'DEFINITIVE_COMMIT_ACK',
      originalConnectionClosed: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.lifecycle, 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE');
  });

  it('L9 commit response uncertain branch', () => {
    const result = branchAfterCommitResponseClass({
      responseClass: 'ACK_UNCERTAIN_OR_MISSING',
      originalConnectionClosed: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.lifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
  });

  it('L10 transaction rejection branch', () => {
    const result = branchAfterCommitResponseClass({
      responseClass: 'DEFINITIVE_TRANSACTION_REJECTION',
      originalConnectionClosed: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.lifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
  });

  it('L11 branch before original close rejected', () => {
    const result = branchAfterCommitResponseClass({
      responseClass: 'DEFINITIVE_COMMIT_ACK',
      originalConnectionClosed: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'BRANCH_BEFORE_ORIGINAL_CLOSE_FORBIDDEN');
  });

  it('L12 fresh ACK lifecycle exact order', () => {
    const steps = getFreshAckClassifierLifecycle();
    assert.deepEqual(steps, [
      'RUN_PRE_CONNECT_TARGET_IDENTITY_GATE',
      'RUN_PRE_CONNECTION_CLIENT_POLICY',
      'OPEN_FRESH_READ_ONLY_CLASSIFIER_CONNECTION',
      'RUN_POST_CONNECT_DATABASE_ROLE_GUARD',
      'ESTABLISH_EXPLICIT_READ_ONLY_CLASSIFIER_SESSION',
      'INSPECT_HISTORY_RELATION_AND_PREFIX',
      'EXECUTE_PRIOR_AND_NEXT_ORACLE_PHASE_PROBES',
      'INSPECT_CURRENT_AND_UNEXPECTED_DELTAS',
      'CLASSIFY_ACK_STATE',
      'APPLY_ACK_OUTCOME_DISPOSITION',
      'EMIT_CLASSIFICATION_EVIDENCE_NO_SECRETS',
      'CLOSE_CLASSIFIER_CONNECTION',
    ]);
    const doc = JSON.parse(readRepo(LIFECYCLE_JSON_PATH));
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(doc);
    assert.equal(validation.ok, true, validation.mismatchCategories.join(','));
  });

  it('L13 fresh verification lifecycle exact order', () => {
    const steps = getFreshPostCommitVerificationLifecycle();
    assert.deepEqual(steps, [
      'RUN_PRE_CONNECT_TARGET_IDENTITY_GATE',
      'RUN_PRE_CONNECTION_CLIENT_POLICY',
      'OPEN_FRESH_READ_ONLY_VERIFICATION_CONNECTION',
      'RUN_POST_CONNECT_DATABASE_ROLE_GUARD',
      'ESTABLISH_EXPLICIT_READ_ONLY_VERIFICATION_SESSION',
      'INSPECT_EXACT_HISTORY_RELATION_AND_NEXT_PREFIX',
      'EXECUTE_EXACT_NEXT_ORACLE_PHASE_PROBE',
      'INSPECT_UNEXPECTED_AND_CURRENT_VERSION_DELTAS',
      'REQUIRE_DEFINITELY_COMMITTED',
      'EMIT_NONSECRET_VERIFICATION_EVIDENCE',
      'CLOSE_VERIFICATION_CONNECTION',
      'EMIT_HUMAN_REVIEW_REQUIRED_OUTCOME',
    ]);
  });

  it('L14 read-write session rejected', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
      explicitReadOnlyClassifierSession: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'READ_WRITE_CLASSIFIER_SESSION_FORBIDDEN');
    assert.equal(result.invokeAckClassifierLifecycle, true);
  });

  it('L15 pre-transaction rejection plan exact', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'PRE_TRANSACTION_SETUP_REJECTION',
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.orderedSteps, [
      'CLOSE_OR_RETIRE_CONNECTION',
      'EMIT_FIRST_ERROR_EVIDENCE_NO_SECRETS',
      'MANDATORY_STOP',
      'FORBID_SAME_RUN_RETRY',
      'HUMAN_REVIEW_REQUIRED_BEFORE_NEW_ATTEMPT',
    ]);
    assert.equal(result.invokeAckClassifierLifecycle, false);
    assert.equal(result.mandatoryStop, true);
  });

  it('L16 in-transaction server rejection plan exact', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
      explicitReadOnlyClassifierSession: true,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.orderedSteps, [
      'STOP_STATEMENT_STREAM_IMMEDIATELY',
      'PRESERVE_FIRST_ERROR_ONLY',
      'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
      'CLASSIFY_ROLLBACK_RESPONSE',
      'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
      'FORBID_SAME_RUN_RETRY',
      'INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
      'APPLY_ACK_OUTCOME_DISPOSITION_FOR_PRE_COMMIT_REJECTION',
    ]);
    assert.equal(result.invokeAckClassifierLifecycle, true);
  });

  it('L17 transport loss requires fresh ACK', () => {
    const transport = buildPreCommitFailureDisposition({ failureClass: 'PRE_COMMIT_TRANSPORT_LOSS' });
    const rollback = buildPreCommitFailureDisposition({ failureClass: 'ROLLBACK_ACK_UNCERTAIN' });
    for (const result of [transport, rollback]) {
      assert.equal(result.ok, true);
      assert.equal(result.invokeAckClassifierLifecycle, true);
      assert.ok(result.orderedSteps.includes('INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE'));
      assert.ok(result.orderedSteps.includes('MARK_ORIGINAL_CONNECTION_UNUSABLE'));
    }
  });

  it('L18 commit-after-failure rejected', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
      attemptCommitAfterFailure: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'COMMIT_AFTER_PRE_COMMIT_FAILURE_FORBIDDEN');
    assert.equal(result.commitForbidden, true);
  });

  it('L19 continued execution/same-run retry rejected', () => {
    const continued = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
      attemptContinuedExecution: true,
    });
    assert.equal(continued.ok, false);
    assert.equal(continued.rejectionReason, 'CONTINUED_EXECUTION_AFTER_FIRST_ERROR_FORBIDDEN');

    const retry = buildPreCommitFailureDisposition({
      failureClass: 'PRE_TRANSACTION_SETUP_REJECTION',
      attemptSameRunRetry: true,
    });
    assert.equal(retry.ok, false);
    assert.equal(retry.rejectionReason, 'SAME_RUN_RETRY_FORBIDDEN');
  });

  it('L20 only three missing authorities removed', () => {
    const foundation = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    const manifest = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.deepEqual(foundation.missing_authorities, [
      'credential acquisition',
      'target connection binding',
      'remote executor implementation',
    ]);
    assert.deepEqual(manifest.missing_authorities, foundation.missing_authorities);
    assert.deepEqual([...FOUNDATION_MISSING_AUTHORITIES], foundation.missing_authorities);

    const tempRoot = createTempLifecycleMutationRoot();
    const foundationDoc = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundationDoc.missing_authorities = [
      'ACK classifier authority',
      'credential acquisition',
      'target connection binding',
      'remote executor implementation',
    ];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundationDoc, null, 2)}\n`);
    const validation = validateExecutionSqlAuthorityFoundation(tempRoot);
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.some((entry) => entry.includes('missing_authorities')));

    const lifecycleDoc = JSON.parse(readRepo(LIFECYCLE_JSON_PATH));
    assert.equal(lifecycleDoc.identifier, REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID);
    assert.equal(lifecycleDoc.execution_authorization, false);
    assert.equal(lifecycleDoc.orchestration_implemented, false);
    assert.deepEqual(lifecycleDoc.commit_response_classes, [...COMMIT_RESPONSE_CLASSES]);
    assert.deepEqual(lifecycleDoc.ack_classifiers.identifiers, [...ACK_STATE_IDENTIFIERS]);
    assert.deepEqual(lifecycleDoc.pre_commit_failure_handling_lifecycle.failure_classes, [...PRE_COMMIT_FAILURE_CLASSES]);
    assert.equal(validateRemoteExecutionLifecycleAuthorityDocument(lifecycleDoc).ok, true);
    assert.equal(EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY.identifier, REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID);
    assert.equal(foundation.lifecycle?.ack_classifier_authority?.frozen, true);
    assert.equal(foundation.lifecycle?.pre_commit_failure_classifier_authority?.frozen, true);
    assert.equal(foundation.lifecycle?.fresh_post_commit_connection_lifecycle?.frozen, true);
    assert.equal(foundation.remote_execution_lifecycle_authority?.path, LIFECYCLE_JSON_PATH);
  });
});

function loadLifecycleDocumentFromRepo(): Record<string, unknown> {
  return JSON.parse(readRepo(LIFECYCLE_JSON_PATH)) as Record<string, unknown>;
}

describe('remote execution lifecycle authority correction1 L21-L30', () => {
  it('L21 omitted read-only proof rejects IN_TRANSACTION_SERVER_REJECTION', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'EXPLICIT_READ_ONLY_CLASSIFIER_SESSION_REQUIRED');
    assert.equal(result.mandatoryStop, true);
    assert.equal(result.sameRunRetryForbidden, true);
    assert.equal(result.commitForbidden, true);
    assert.deepEqual(result.orderedSteps, []);
    assert.equal(result.invokeAckClassifierLifecycle, true);
  });

  it('L22 omitted read-only proof rejects PRE_COMMIT_TRANSPORT_LOSS', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'PRE_COMMIT_TRANSPORT_LOSS',
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'EXPLICIT_READ_ONLY_CLASSIFIER_SESSION_REQUIRED');
    assert.equal(result.invokeAckClassifierLifecycle, true);
    assert.deepEqual(result.orderedSteps, []);
  });

  it('L23 omitted read-only proof rejects ROLLBACK_ACK_UNCERTAIN', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'ROLLBACK_ACK_UNCERTAIN',
    });
    assert.equal(result.ok, false);
    assert.equal(result.rejectionReason, 'EXPLICIT_READ_ONLY_CLASSIFIER_SESSION_REQUIRED');
    assert.equal(result.invokeAckClassifierLifecycle, true);
    assert.deepEqual(result.orderedSteps, []);
  });

  it('L24 explicit true accepts classifier-required plans', () => {
    const inTransaction = buildPreCommitFailureDisposition({
      failureClass: 'IN_TRANSACTION_SERVER_REJECTION',
      explicitReadOnlyClassifierSession: true,
    });
    const transport = buildPreCommitFailureDisposition({
      failureClass: 'PRE_COMMIT_TRANSPORT_LOSS',
      explicitReadOnlyClassifierSession: true,
    });
    const rollback = buildPreCommitFailureDisposition({
      failureClass: 'ROLLBACK_ACK_UNCERTAIN',
      explicitReadOnlyClassifierSession: true,
    });
    for (const result of [inTransaction, transport, rollback]) {
      assert.equal(result.ok, true);
      assert.equal(result.invokeAckClassifierLifecycle, true);
      assert.ok(result.orderedSteps.includes('INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE'));
    }
  });

  it('L25 PRE_TRANSACTION_SETUP_REJECTION does not require classifier proof', () => {
    const result = buildPreCommitFailureDisposition({
      failureClass: 'PRE_TRANSACTION_SETUP_REJECTION',
    });
    assert.equal(result.ok, true);
    assert.equal(result.invokeAckClassifierLifecycle, false);
    assert.deepEqual(result.orderedSteps, [
      'CLOSE_OR_RETIRE_CONNECTION',
      'EMIT_FIRST_ERROR_EVIDENCE_NO_SECRETS',
      'MANDATORY_STOP',
      'FORBID_SAME_RUN_RETRY',
      'HUMAN_REVIEW_REQUIRED_BEFORE_NEW_ATTEMPT',
    ]);
  });

  it('L26 lifecycle JSON ACK predicate mutation is rejected', () => {
    const doc = loadLifecycleDocumentFromRepo();
    const ackClassifiers = doc.ack_classifiers as Record<string, unknown>;
    const predicates = ackClassifiers.predicates as Record<string, Record<string, { all_required: string[] }>>;
    predicates.P1.DEFINITELY_NOT_COMMITTED.all_required = [
      ...predicates.P1.DEFINITELY_NOT_COMMITTED.all_required,
      'forbidden_predicate',
    ];
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(
      doc as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.includes('document:exact_semantic_mismatch'));
    assert.ok(
      validation.mismatchCategories.some((entry) => entry.includes('ack_classifiers.predicates')),
    );
  });

  it('L27 lifecycle JSON ACK disposition mutation is rejected', () => {
    const doc = loadLifecycleDocumentFromRepo();
    const ackLifecycle = doc.ack_state_readonly_classification_lifecycle as Record<string, unknown>;
    const disposition = ackLifecycle.ack_outcome_disposition as Record<string, Record<string, unknown>>;
    disposition.DEFINITELY_NOT_COMMITTED.disposition = 'AUTOMATIC_NEXT_VERSION';
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(
      doc as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.includes('document:exact_semantic_mismatch'));
    assert.ok(
      validation.mismatchCategories.some((entry) =>
        entry.includes('ack_state_readonly_classification_lifecycle.ack_outcome_disposition'),
      ),
    );
  });

  it('L28 lifecycle ordered-step description or step-number mutation is rejected', () => {
    const doc = loadLifecycleDocumentFromRepo();
    const ackLifecycle = doc.ack_state_readonly_classification_lifecycle as {
      ordered_steps: Array<{ step: number; identifier: string; description: string }>;
    };
    ackLifecycle.ordered_steps[0].description = 'Mutated description';
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(
      doc as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.includes('document:exact_semantic_mismatch'));
    assert.ok(
      validation.mismatchCategories.some((entry) =>
        entry.includes('ack_state_readonly_classification_lifecycle.ordered_steps'),
      ),
    );

    const docStep = loadLifecycleDocumentFromRepo();
    const ackLifecycleStep = docStep.ack_state_readonly_classification_lifecycle as {
      ordered_steps: Array<{ step: number; identifier: string; description: string }>;
    };
    ackLifecycleStep.ordered_steps[1].step = 99;
    const stepValidation = validateRemoteExecutionLifecycleAuthorityDocument(
      docStep as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(stepValidation.ok, false);
    assert.ok(stepValidation.mismatchCategories.includes('document:exact_semantic_mismatch'));
  });

  it('L29 pre-commit ordered-plan mutation is rejected', () => {
    const doc = loadLifecycleDocumentFromRepo();
    const preCommit = doc.pre_commit_failure_handling_lifecycle as {
      healthy_connection_server_rejection: { ordered_steps: Array<{ step: number; identifier: string }> };
    };
    preCommit.healthy_connection_server_rejection.ordered_steps[0].identifier =
      'FORBIDDEN_STEP_MUTATION';
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(
      doc as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.includes('document:exact_semantic_mismatch'));
    assert.ok(
      validation.mismatchCategories.some((entry) =>
        entry.includes('pre_commit_failure_handling_lifecycle.healthy_connection_server_rejection'),
      ),
    );
  });

  it('L30 extra lifecycle document key is rejected', () => {
    const doc = loadLifecycleDocumentFromRepo();
    (doc as Record<string, unknown>).forbidden_extra_key = true;
    const validation = validateRemoteExecutionLifecycleAuthorityDocument(
      doc as Parameters<typeof validateRemoteExecutionLifecycleAuthorityDocument>[0],
    );
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.includes('document:exact_semantic_mismatch'));
    assert.ok(validation.mismatchCategories.some((entry) => entry.includes('forbidden_extra_key:extra_key')));
  });
});
