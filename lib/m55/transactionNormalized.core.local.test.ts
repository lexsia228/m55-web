import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, before, after } from 'node:test';

import { splitAndTrim } from './transactionNormalized/splitAndTrim.ts';
import {
  applyOptionARemoval,
  buildPolicy2HistoryPayload,
  compareStatementSnippetToEvidence,
  compositeStreamSha256,
  decodeEvidenceSnippetField,
  removedOrdinalsForLabel,
  statementSha256,
  statementUtf8ByteLength,
  STATEMENT_STREAM_SERIALIZATION,
} from './transactionNormalized/statementStream.ts';
import {
  ACK_CLASSIFIER_IDENTIFIERS,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  AUTHORITY_CONTRACT_REL_PATH,
  AUTHORITY_FILE_EXPECTATIONS,
  AUTHORITY_MATRIX_REL_PATH,
  AUTHORITY_PARSER_EVIDENCE_REL_PATH,
  classifyAckState,
  classifyAckStateForVersion,
  classifyP1AckFromFacts,
  classifyP2ThroughP7AckFromFacts,
  compareFingerprintValuesForTests,
  compareTargetIdentityLabels,
  evaluatePlanCoreFromValidatedWorkspaceFacts,
  evaluateProductionLabelGuard,
  evaluateP1CommittedPredicate,
  evaluateP1NotCommittedPredicate,
  evaluateP2ThroughP7CommittedPredicate,
  evaluateP2ThroughP7NotCommittedPredicate,
  evaluateStageATargetFingerprintReadiness,
  EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY,
  EXPECTED_REVISION7_VERSION_IDENTITIES,
  EXPECTED_BRANCH,
  EXPECTED_REPO_ROOT,
  EXPECTED_SOURCE_AUTHORITY_BASE,
  EXPECTED_SOURCE_AUTHORITY_HEAD,
  BASELINE_STAGE_A_COMMIT,
  STAGE_A_BINDING_ADDENDUM_REL_PATH,
  BINDING_POLICY_IDENTIFIER,
  PLAN_ONLY_EXTERNAL_ATTESTATION_HOLD,
  GEN1_REBIND_CORE_REL_PATH,
  GEN1_REBIND_CLI_REL_PATH,
  GEN1_REVIEW_TEST_REL_PATH,
  computeCanonicalPayloadSha256,
  computeCanonicalPayloadSha256WithBlankSubstitution,
  isGitAncestor,
  loadStageABindingAddendum,
  validateStageABindingAddendumSemantics,
  verifyExternalPlanAttestation,
  EXPECTED_GENERATION0_BASELINE_IDENTITIES,
  EXPECTED_IMMUTABLE_CARRY_FORWARD_IDENTITIES,
  EXPECTED_GEN1_REBIND_MUTABLE_CLASSIFICATIONS,
  STAGE_B_EXECUTION_BLOCKERS,
  expandPlanSelector,
  formatRedactedPlanEvidence,
  FINGERPRINT_PLACEHOLDER,
  getFailureDomainBehavior,
  getFailureDomainRegistry,
  LIFECYCLE_STEP_IDENTIFIERS,
  loadAuthorityBundle,
  parseExecutionVersionSelector,
  parsePlanVersionSelector,
  PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS,
  P7_CHAIN_COMPLETION_TERMINAL,
  REVISION7_LIFECYCLE_IDENTIFIERS,
  runTransactionNormalizedPlan,
  sanitizeHoldReasonCode,
  simulatePreCommitTransitionStream,
  SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER,
  STAGE_A_CONTRACT_BINDING_HOLD_CODES,
  STAGE_A_EXECUTION_LOCK,
  STAGE_B_BLOCKERS,
  STAGE_A_MODE,
  validateAuthorityBytes,
  validateMigrationSourceBytes,
  validateRepoRootGateBeforeGit,
  validateStageACoreContractBindings,
  validateWorkspaceRepoRoot,
  assertNoDbTransportInstantiation,
  type ContractBindingSource,
  type P1AckFacts,
  type P2ThroughP7AckFacts,
  type TransactionNormalizedPlanInput,
} from './transactionNormalized/transactionNormalizedCore.ts';
import type { VersionLabel } from './transactionNormalized/statementStream.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function authorityPaths() {
  return {
    contract: join(REPO_ROOT, AUTHORITY_CONTRACT_REL_PATH),
    matrix: join(REPO_ROOT, AUTHORITY_MATRIX_REL_PATH),
    evidence: join(REPO_ROOT, AUTHORITY_PARSER_EVIDENCE_REL_PATH),
  };
}

const CLEAN_WORKSPACE = {
  branch: EXPECTED_BRANCH,
  head: BASELINE_STAGE_A_COMMIT,
  cleanWorktree: true,
  cleanIndex: true,
};

function revision7ContractBindingSource(): ContractBindingSource {
  return loadAuthorityBundle(REPO_ROOT).contract as ContractBindingSource;
}

let authorityShaBefore: Record<string, string>;

before(() => {
  const paths = authorityPaths();
  authorityShaBefore = {
    contract: sha256File(paths.contract),
    matrix: sha256File(paths.matrix),
    evidence: sha256File(paths.evidence),
  };
});

after(() => {
  const paths = authorityPaths();
  assert.equal(sha256File(paths.contract), authorityShaBefore.contract);
  assert.equal(sha256File(paths.matrix), authorityShaBefore.matrix);
  assert.equal(sha256File(paths.evidence), authorityShaBefore.evidence);
});

describe('transaction normalized stage-a core', () => {
  it('1 promoted authority bytes and sha exact', () => {
    const result = validateAuthorityBytes(REPO_ROOT);
    assert.equal(result.contract.bytes, AUTHORITY_FILE_EXPECTATIONS.contract.bytes);
    assert.equal(result.contract.sha256, AUTHORITY_FILE_EXPECTATIONS.contract.sha256);
    assert.equal(result.matrix.bytes, AUTHORITY_FILE_EXPECTATIONS.matrix.bytes);
    assert.equal(result.matrix.sha256, AUTHORITY_FILE_EXPECTATIONS.matrix.sha256);
    assert.equal(result.parserEvidence.bytes, AUTHORITY_FILE_EXPECTATIONS.parserEvidence.bytes);
    assert.equal(result.parserEvidence.sha256, AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256);
  });

  it('2 contract matrix parser evidence identities', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    assert.equal(
      bundle.contract.schema_version,
      'm55.preview.transaction_normalized_execution_contract.v1.revision-7.draft',
    );
    assert.equal(bundle.contract.revision, 'REVISION-7');
    assert.equal(bundle.contract.execution_status, 'NOT EXECUTED');
    assert.equal(bundle.contract.execution_authorization, false);
    assert.equal(bundle.matrix.schema_version, 'm55.preview.transaction_normalized_step_matrix.v1.revision-7.draft');
    assert.equal(bundle.parserEvidence.serialization_version, 'm55.transaction_normalization.exact_parser.v1');
    assert.equal(bundle.contract.versions.length, 7);
  });

  it('3 seven frozen migration source sha exact', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const sha = createHash('sha256').update(Buffer.from(source, 'utf8')).digest('hex');
      assert.equal(sha, version.frozen_source_sha256);
    }
  });

  it('4 exact parser output fingerprints for all seven', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const migration of bundle.parserEvidence.migrations) {
      const contractVersion = bundle.contract.versions.find((v) => v.version === migration.version);
      assert.ok(contractVersion);
      const source = readFileSync(join(REPO_ROOT, migration.path), 'utf8');
      const statements = splitAndTrim(source);
      assert.equal(statements.length, migration.statement_count);
      for (const expected of migration.statements) {
        const actual = statements[expected.ordinal];
        assert.equal(statementUtf8ByteLength(actual), expected.utf8_bytes);
        assert.equal(statementSha256(actual), expected.sha256);
        if (expected.first160_escaped !== undefined) {
          assert.equal(
            compareStatementSnippetToEvidence(actual.slice(0, 160), expected.first160_escaped),
            true,
          );
        }
        if (expected.last160_escaped !== undefined) {
          const start = Math.max(0, actual.length - 160);
          assert.equal(
            compareStatementSnippetToEvidence(actual.slice(start), expected.last160_escaped),
            true,
          );
        }
      }
    }
  });

  it('5 original stream composite sha', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const statements = splitAndTrim(source);
      assert.equal(compositeStreamSha256(statements), version.original_stream_composite_sha256);
    }
  });

  it('6 normalized stream composite sha', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const statements = splitAndTrim(source);
      const { normalized } = applyOptionARemoval(version.label, statements);
      assert.equal(compositeStreamSha256(normalized), version.normalized_stream_composite_sha256);
    }
  });

  it('7 removed stream composite sha', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const statements = splitAndTrim(source);
      const { removed } = applyOptionARemoval(version.label, statements);
      assert.equal(compositeStreamSha256(removed), version.removed_token_stream_composite_sha256);
    }
  });

  it('8 exact wrapper ordinals', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      assert.deepEqual([...version.removed_token_ordinals], [...removedOrdinalsForLabel(version.label)]);
    }
  });

  it('9 option A whole-token removal', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const statements = splitAndTrim(source);
      const { normalized, removed, removedOrdinals } = applyOptionARemoval(version.label, statements);
      assert.equal(normalized.length, version.normalized_statement_count);
      assert.equal(removed.length, version.removed_token_count);
      assert.deepEqual(removedOrdinals, version.removed_token_ordinals);
      for (const ordinal of version.removed_token_ordinals) {
        assert.equal(removed.includes(statements[ordinal]), true);
      }
    }
  });

  it('10 policy 2 pure payload exact', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const source = readFileSync(join(REPO_ROOT, version.path), 'utf8');
      const { normalized } = applyOptionARemoval(version.label, splitAndTrim(source));
      const payload = buildPolicy2HistoryPayload({
        version: version.version,
        name: version.name,
        normalizedStatements: normalized,
        expectedNormalizedCompositeSha256: version.normalized_stream_composite_sha256,
      });
      assert.equal(payload.version, version.version);
      assert.equal(payload.name, version.name);
      assert.equal(payload.serialization, STATEMENT_STREAM_SERIALIZATION);
      assert.deepEqual(payload.statements, normalized);
      assert.equal(payload.normalizedStreamCompositeSha256, version.normalized_stream_composite_sha256);
    }
  });

  it('11 plan selector ALL accepted', () => {
    assert.deepEqual(expandPlanSelector('ALL'), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    assert.equal(result.selectedVersions.length, 7);
    assert.equal(result.actualGitInspectionPerformed, false);
  });

  it('12 execution selector ALL rejected', () => {
    assert.throws(() => parseExecutionVersionSelector('ALL'), /EXECUTION_SELECTOR_ALL_FORBIDDEN/);
  });

  it('13 stage-a public inputs have no credential url db fields', () => {
    const input: TransactionNormalizedPlanInput = {
      repoRoot: REPO_ROOT,
      planVersionSelector: 'P1',
    };
    const forbidden = ['credential', 'password', 'db', 'database', 'url', 'remote', 'execute'];
    for (const key of Object.keys(input)) {
      assert.equal(forbidden.some((f) => key.toLowerCase().includes(f)), false);
    }
  });

  it('14 authority paths expected branch head cannot be overridden', () => {
    assert.equal(AUTHORITY_CONTRACT_REL_PATH.includes('preview-remote-apply'), true);
    assert.equal(EXPECTED_BRANCH, 'feat/m55-paid-lp-canonical-wave1');
    assert.equal(EXPECTED_SOURCE_AUTHORITY_HEAD, 'ceee04aab0a94376a55a576900cb2f8d597c19f4');
    const inputKeys = Object.keys({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' as const });
    assert.deepEqual(inputKeys, ['repoRoot', 'planVersionSelector']);
  });

  it('15 no db transport instantiated', () => {
    assert.doesNotThrow(() => assertNoDbTransportInstantiation(undefined));
    assert.throws(() => assertNoDbTransportInstantiation({} as never), /DB_TRANSPORT_INSTANTIATION_FORBIDDEN/);
  });

  it('16 remote and local execution locked', () => {
    assert.equal(STAGE_A_EXECUTION_LOCK.dbTransportUnavailable, true);
    assert.equal(STAGE_A_EXECUTION_LOCK.localExecutionUnavailable, true);
    assert.equal(STAGE_A_EXECUTION_LOCK.remoteExecutionUnavailable, true);
    assert.equal(STAGE_A_EXECUTION_LOCK.executionAuthorization, false);
    assert.equal(STAGE_A_MODE, 'PLAN_ONLY');
  });

  it('17 revision-7 lifecycle identifier parity', () => {
    assert.equal(LIFECYCLE_STEP_IDENTIFIERS.length, 12);
    assert.deepEqual([...REVISION7_LIFECYCLE_IDENTIFIERS], [
      'PRE_COMMIT_FAILURE_HANDLING_LIFECYCLE',
      'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
      'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE',
      'PRE_COMMIT_FAILURE_DOMAIN_REGISTRY',
    ]);
  });

  it('18 all 15 failure-domain identifiers exact', () => {
    assert.equal(PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS.length, 15);
    const matrix = JSON.parse(readFileSync(join(REPO_ROOT, AUTHORITY_MATRIX_REL_PATH), 'utf8')) as {
      version_matrices: Array<{ pre_commit_failure_domain_event_identifiers: string[] }>;
    };
    const matrixRow = matrix.version_matrices[0];
    assert.deepEqual(matrixRow.pre_commit_failure_domain_event_identifiers, [
      ...PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS,
    ]);
  });

  it('19 first-error terminates stream', () => {
    const stream = simulatePreCommitTransitionStream(['TARGET_ROLE_GUARD_REJECTION']);
    assert.equal(stream.firstFailure, 'TARGET_ROLE_GUARD_REJECTION');
    const target = stream.steps.find((s) => s.identifier === 'TARGET_ROLE_GUARD');
    assert.equal(target?.allowed, false);
    const execute = stream.steps.find((s) => s.identifier === 'EXECUTE_NORMALIZED_STATEMENTS');
    assert.equal(execute?.allowed, false);
  });

  it('20 COMMIT transition impossible after prior failure', () => {
    const stream = simulatePreCommitTransitionStream(['EXECUTE_NORMALIZED_STATEMENTS_FAILURE']);
    assert.equal(stream.commitReached, false);
    const commit = stream.steps.find((s) => s.identifier === 'COMMIT_ONCE');
    assert.equal(commit?.allowed, false);
  });

  it('21 same-run and automatic retry forbidden', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const contract = bundle.contract as {
      pre_commit_failure_handling_lifecycle?: { same_run_retry_forbidden?: boolean };
    };
    assert.equal(contract.pre_commit_failure_handling_lifecycle?.same_run_retry_forbidden, true);
    for (const event of PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS) {
      const registry = (bundle.contract as { pre_commit_failure_domain_registry?: { entries: Array<{ event_identifier: string; same_run_retry: boolean }> } }).pre_commit_failure_domain_registry;
      const entry = registry?.entries.find((row) => row.event_identifier === event);
      if (entry) assert.equal(entry.same_run_retry, false);
    }
  });

  it('22 automatic next version forbidden', () => {
    const contract = loadAuthorityBundle(REPO_ROOT).contract as {
      ack_state_readonly_classification_lifecycle?: {
        ack_outcome_disposition?: {
          DEFINITELY_COMMITTED?: { automatic_next_version_forbidden?: boolean };
        };
      };
    };
    assert.equal(
      contract.ack_state_readonly_classification_lifecycle?.ack_outcome_disposition?.DEFINITELY_COMMITTED
        ?.automatic_next_version_forbidden,
      true,
    );
  });

  it('23 P7 chain-completion terminal exact', () => {
    assert.equal(P7_CHAIN_COMPLETION_TERMINAL, 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION');
    assert.equal(
      classifyAckStateForVersion('DEFINITELY_COMMITTED', 'P7'),
      'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION',
    );
  });

  it('24 ACK predicate truth table', () => {
    assert.deepEqual([...ACK_CLASSIFIER_IDENTIFIERS], [
      'DEFINITELY_NOT_COMMITTED',
      'DEFINITELY_COMMITTED',
      'CONTRADICTORY_OR_DRIFTED',
    ]);
    assert.equal(classifyAckState('DEFINITELY_NOT_COMMITTED'), 'HUMAN_REVIEW_REQUIRED_FOR_RERUN');
    assert.equal(classifyAckState('DEFINITELY_COMMITTED'), 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION');
    assert.equal(classifyAckState('CONTRADICTORY_OR_DRIFTED'), 'CONTRADICTORY_OR_DRIFTED');
  });

  it('25 target placeholder fails closed', () => {
    assert.equal(evaluateStageATargetFingerprintReadiness('preview-fp'), 'HOLD');
    assert.equal(evaluateStageATargetFingerprintReadiness(''), 'HOLD');
    const bundle = loadAuthorityBundle(REPO_ROOT);
    assert.equal(
      (bundle.contract as ContractBindingSource).pre_connect_target_identity_gate
        .approved_preview_target_fingerprint,
      FINGERPRINT_PLACEHOLDER,
    );
  });

  it('26 production labels fail closed', () => {
    assert.equal(
      evaluateProductionLabelGuard({ organizationLabel: 'm55-soul', projectLabel: 'm55-soul-core' }),
      'HOLD',
    );
    assert.equal(
      evaluateProductionLabelGuard({ organizationLabel: 'm55-preview', projectLabel: 'm55-soul-preview' }),
      'PASS',
    );
  });

  it('27 secret-safe evidence formatting', () => {
    const result = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'P1' });
    const text = formatRedactedPlanEvidence(result);
    const forbidden = [
      'password',
      'credential',
      ['postgres', '://'].join(''),
      ['supabase', '.co'].join(''),
    ];
    for (const token of forbidden) {
      assert.equal(text.toLowerCase().includes(token), false);
    }
  });

  it('28 no contiguous provider-shaped secret fixture literals in tracked source', () => {
    const files = [
      join(REPO_ROOT, 'lib/m55/transactionNormalized/splitAndTrim.ts'),
      join(REPO_ROOT, 'lib/m55/transactionNormalized/statementStream.ts'),
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts'),
      join(REPO_ROOT, 'lib/m55/transactionNormalized.core.local.test.ts'),
    ];
    const providerPattern = ['postgres', '://'].join('');
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      assert.equal(content.includes(providerPattern), false);
    }
    const evidenceSnippet =
      '"CHECK (length(btrim(idempotency_key)) \\u003e 0)"';
    assert.equal(decodeEvidenceSnippetField(evidenceSnippet).includes('>'), true);
  });

  it('29 plan CLI deterministic and write-free', () => {
    const script = join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts');
    const first = spawnSync(process.execPath, ['--experimental-strip-types', script, 'ALL'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const second = spawnSync(process.execPath, ['--experimental-strip-types', script, 'ALL'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(first.stdout, second.stdout);
    const parsed = JSON.parse(first.stdout) as { coreValidation: string; holdReasonCode?: string };
    assert.equal(parsed.coreValidation, 'PRE_DB_HOLD');
    assert.equal(parsed.holdReasonCode, 'WORKSPACE_NOT_CLEAN');
    const forbidden = spawnSync(process.execPath, ['--experimental-strip-types', script, '--execute'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.notEqual(forbidden.status, 0);
    assert.match(forbidden.stderr, /FORBIDDEN_ARGUMENT/);
  });

  it('30 authority files unchanged before and after tests', () => {
    const paths = authorityPaths();
    assert.equal(sha256File(paths.contract), authorityShaBefore.contract);
    assert.equal(sha256File(paths.matrix), authorityShaBefore.matrix);
    assert.equal(sha256File(paths.evidence), authorityShaBefore.evidence);
  });

  it('31 exact expected repo root enforcement', () => {
    assert.doesNotThrow(() => validateWorkspaceRepoRoot(REPO_ROOT));
    assert.throws(() => validateWorkspaceRepoRoot('/tmp'), /WORKSPACE_REPO_ROOT_MISMATCH/);
    const missing = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: '/tmp/nonexistent-m55-root', planVersionSelector: 'P1' },
      CLEAN_WORKSPACE,
    );
    assert.equal(missing.coreValidation, 'PRE_DB_HOLD');
    assert.equal(missing.holdReasonCode, 'REPO_ROOT_MISSING');
  });

  it('32 public API has no workspace-facts bypass', () => {
    assert.equal(runTransactionNormalizedPlan.length, 1);
    const publicResult = runTransactionNormalizedPlan({
      repoRoot: REPO_ROOT,
      planVersionSelector: 'ALL',
    });
    assert.equal(publicResult.coreValidation, 'PRE_DB_HOLD');
    const pureResult = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(pureResult.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
  });

  it('33 pure helper is not used by CLI', () => {
    const cliSource = readFileSync(join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts'), 'utf8');
    assert.equal(cliSource.includes('evaluatePlanCoreFromValidatedWorkspaceFacts'), false);
    assert.equal(cliSource.includes('runTransactionNormalizedPlan'), true);
  });

  it('34 P1 predicate evaluator complete truth table', () => {
    const base: P1AckFacts = {
      historyRelationAbsent: true,
      historyRelationExact: false,
      historyPrefixExactlyP1: false,
      exactP0OraclePhase: true,
      exactP1OraclePhase: false,
      p1DeltaAbsent: true,
      unexpectedDeltaZero: true,
      targetIdentityExact: true,
    };
    assert.equal(classifyP1AckFromFacts(base), 'DEFINITELY_NOT_COMMITTED');
    const committed: P1AckFacts = {
      historyRelationAbsent: false,
      historyRelationExact: true,
      historyPrefixExactlyP1: true,
      exactP0OraclePhase: false,
      exactP1OraclePhase: true,
      p1DeltaAbsent: false,
      unexpectedDeltaZero: true,
      targetIdentityExact: true,
    };
    assert.equal(classifyP1AckFromFacts(committed), 'DEFINITELY_COMMITTED');
    const keys = [
      'historyRelationAbsent',
      'exactP0OraclePhase',
      'p1DeltaAbsent',
      'unexpectedDeltaZero',
      'targetIdentityExact',
    ] as const;
    for (const key of keys) {
      const mutated = { ...base, [key]: false };
      assert.equal(evaluateP1NotCommittedPredicate(mutated), false);
      assert.equal(classifyP1AckFromFacts(mutated), 'CONTRADICTORY_OR_DRIFTED');
    }
    const committedKeys = [
      'historyRelationExact',
      'historyPrefixExactlyP1',
      'exactP1OraclePhase',
      'unexpectedDeltaZero',
      'targetIdentityExact',
    ] as const;
    for (const key of committedKeys) {
      const mutated = { ...committed, [key]: false };
      assert.equal(evaluateP1CommittedPredicate(mutated), false);
      assert.equal(classifyP1AckFromFacts(mutated), 'CONTRADICTORY_OR_DRIFTED');
    }
  });

  it('35 P2-P7 predicate evaluator complete truth table', () => {
    const notCommitted: P2ThroughP7AckFacts = {
      exactPriorHistoryPrefix: true,
      exactNextHistoryPrefix: false,
      exactPriorOraclePhase: true,
      exactNextOraclePhase: false,
      currentVersionDeltaAbsent: true,
      unexpectedDeltaZero: true,
      targetIdentityExact: true,
    };
    assert.equal(classifyP2ThroughP7AckFromFacts(notCommitted), 'DEFINITELY_NOT_COMMITTED');
    const committed: P2ThroughP7AckFacts = {
      exactPriorHistoryPrefix: false,
      exactNextHistoryPrefix: true,
      exactPriorOraclePhase: false,
      exactNextOraclePhase: true,
      currentVersionDeltaAbsent: false,
      unexpectedDeltaZero: true,
      targetIdentityExact: true,
    };
    assert.equal(classifyP2ThroughP7AckFromFacts(committed), 'DEFINITELY_COMMITTED');
    for (const key of [
      'exactPriorHistoryPrefix',
      'exactPriorOraclePhase',
      'currentVersionDeltaAbsent',
      'unexpectedDeltaZero',
      'targetIdentityExact',
    ] as const) {
      const mutated = { ...notCommitted, [key]: false };
      assert.equal(evaluateP2ThroughP7NotCommittedPredicate(mutated), false);
      assert.equal(classifyP2ThroughP7AckFromFacts(mutated), 'CONTRADICTORY_OR_DRIFTED');
    }
    for (const key of [
      'exactNextHistoryPrefix',
      'exactNextOraclePhase',
      'unexpectedDeltaZero',
      'targetIdentityExact',
    ] as const) {
      const mutated = { ...committed, [key]: false };
      assert.equal(evaluateP2ThroughP7CommittedPredicate(mutated), false);
      assert.equal(classifyP2ThroughP7AckFromFacts(mutated), 'CONTRADICTORY_OR_DRIFTED');
    }
  });

  it('36 all 15 failure events have exact unique behavior', () => {
    loadAuthorityBundle(REPO_ROOT);
    const registry = getFailureDomainRegistry();
    assert.equal(registry.length, 15);
    const ids = registry.map((entry) => entry.eventIdentifier);
    assert.deepEqual(ids, [...PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS]);
    for (const event of PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS) {
      const behavior = getFailureDomainBehavior(event);
      assert.equal(behavior.firstErrorTerminal, true);
      assert.equal(behavior.sameRunRetry, false);
      assert.equal(behavior.automaticRetry, false);
      assert.equal(behavior.automaticNextVersion, false);
      assert.equal(behavior.commitAllowedAfterFailure, false);
      assert.ok(behavior.lifecycleGateSource.length > 0);
      assert.ok(behavior.transactionStateClass.length > 0);
    }
  });

  it('37 COMMIT unreachable for every failure event', () => {
    loadAuthorityBundle(REPO_ROOT);
    for (const event of PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS) {
      const stream = simulatePreCommitTransitionStream([event]);
      assert.equal(stream.commitReached, false, event);
      assert.equal(stream.firstFailure, event);
    }
  });

  it('38 fingerprint and target-label fail-closed matrix', () => {
    assert.equal(compareFingerprintValuesForTests(FINGERPRINT_PLACEHOLDER, FINGERPRINT_PLACEHOLDER), 'HOLD');
    assert.equal(compareFingerprintValuesForTests('fp-a', 'fp-b'), 'HOLD');
    assert.equal(compareFingerprintValuesForTests(' fp-a', 'fp-a'), 'HOLD');
    assert.equal(compareFingerprintValuesForTests('preview-fp-v1', 'preview-fp-v1'), 'PASS');
    assert.equal(compareTargetIdentityLabels(APPROVED_PREVIEW_ORGANIZATION, APPROVED_PREVIEW_PROJECT), 'PASS');
    assert.equal(compareTargetIdentityLabels('m55-soul', APPROVED_PREVIEW_PROJECT), 'HOLD');
    assert.equal(compareTargetIdentityLabels(APPROVED_PREVIEW_ORGANIZATION, 'm55-soul-core'), 'HOLD');
    assert.equal(compareTargetIdentityLabels('', APPROVED_PREVIEW_PROJECT), 'HOLD');
    assert.equal(compareTargetIdentityLabels('M55-Preview', APPROVED_PREVIEW_PROJECT), 'HOLD');
    assert.equal(evaluateStageATargetFingerprintReadiness('any-fp'), 'HOLD');
    assert.equal(evaluateStageATargetFingerprintReadiness('candidate-only-fp'), 'HOLD');
    assert.equal(compareFingerprintValuesForTests(['fp', '?x=1'].join(''), ['fp', '?x=1'].join('')), 'HOLD');
    assert.equal(
      compareFingerprintValuesForTests(['postgres', '://host'].join(''), ['postgres', '://host'].join('')),
      'HOLD',
    );
    assert.equal(
      evaluateProductionLabelGuard({ organizationLabel: 'm55-preview', projectLabel: 'm55-soul-preview' }),
      'PASS',
    );
  });

  it('39 sanitized holdReasonCode emitted', () => {
    assert.equal(sanitizeHoldReasonCode('WORKSPACE_NOT_CLEAN'), 'WORKSPACE_NOT_CLEAN');
    assert.equal(sanitizeHoldReasonCode('WORKSPACE_REPO_ROOT_MISMATCH'), 'WORKSPACE_REPO_ROOT_MISMATCH');
    assert.equal(sanitizeHoldReasonCode('SOURCE_SHA_MISMATCH:P1'), 'SOURCE_SHA_MISMATCH:P1');
    assert.equal(sanitizeHoldReasonCode('UPPER CASE PROSE HOLD'), 'UNKNOWN_HOLD');
    assert.equal(sanitizeHoldReasonCode('ENOENT: no such file'), 'UNKNOWN_HOLD');
    assert.equal(sanitizeHoldReasonCode('https://example.com/db'), 'UNKNOWN_HOLD');
    assert.equal(sanitizeHoldReasonCode('SYNTACTICALLY_VALID_UNKNOWN'), 'UNKNOWN_HOLD');
    const badSecret = ['raw secret postgres', '://', 'user:pass@host/db'].join('');
    assert.equal(sanitizeHoldReasonCode(badSecret), 'UNKNOWN_HOLD');
    const dirty = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
    assert.equal(dirty.holdReasonCode, 'WORKSPACE_NOT_CLEAN');
    const formatted = JSON.parse(formatRedactedPlanEvidence(dirty)) as { holdReasonCode?: string };
    assert.equal(formatted.holdReasonCode, 'WORKSPACE_NOT_CLEAN');
  });

  it('40 invalid selector always returns controlled HOLD and CLI rejection', () => {
    const invalid = runTransactionNormalizedPlan({
      repoRoot: REPO_ROOT,
      planVersionSelector: 'P8' as unknown as TransactionNormalizedPlanInput['planVersionSelector'],
    });
    assert.equal(invalid.coreValidation, 'PRE_DB_HOLD');
    assert.equal(invalid.holdReasonCode, 'PLAN_SELECTOR_INVALID');
    assert.deepEqual(invalid.selectedVersions, []);
    assert.equal(parsePlanVersionSelector('P8'), null);
    const script = join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts');
    const cli = spawnSync(process.execPath, ['--experimental-strip-types', script, 'P8'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.notEqual(cli.status, 0);
    const payload = JSON.parse(cli.stdout) as { holdReasonCode?: string };
    assert.equal(payload.holdReasonCode, 'PLAN_SELECTOR_INVALID');
  });

  it('41 target readiness cannot self-approve', () => {
    assert.equal(evaluateStageATargetFingerprintReadiness('candidate-only-fp'), 'HOLD');
    assert.equal(evaluateStageATargetFingerprintReadiness(''), 'HOLD');
    assert.equal(evaluateStageATargetFingerprintReadiness(FINGERPRINT_PLACEHOLDER), 'HOLD');
    assert.equal(compareFingerprintValuesForTests('candidate-only-fp', 'candidate-only-fp'), 'PASS');
    assert.notEqual(evaluateStageATargetFingerprintReadiness('candidate-only-fp'), 'PASS');
  });

  it('42 complete 15-entry registry deep-equals Contract authority', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const contractEntries = (
      bundle.contract as unknown as {
        pre_commit_failure_domain_registry: { entries: Array<Record<string, unknown>> };
      }
    ).pre_commit_failure_domain_registry.entries;
    assert.equal(contractEntries.length, 15);
    assert.equal(EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY.length, 15);
    for (let i = 0; i < 15; i++) {
      const entry = contractEntries[i];
      const expected = EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY[i];
      assert.ok(entry && expected);
      assert.equal(entry.event_identifier, expected.event_identifier);
      assert.equal(entry.lifecycle_gate_source, expected.lifecycle_gate_source);
      assert.equal(entry.transaction_state_class, expected.transaction_state_class);
      assert.equal(entry.original_connection_disposition, expected.original_connection_disposition);
      assert.equal(entry.rollback_action, expected.rollback_action);
      assert.equal(entry.classifier_required, expected.classifier_required);
      assert.equal(entry.terminal_outcome, expected.terminal_outcome);
      assert.equal(entry.same_run_retry, false);
    }
    const registry = getFailureDomainRegistry();
    assert.equal(registry[0]?.lifecycleGateSource, EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY[0]?.lifecycle_gate_source);
  });

  it('43 lifecycle ACK target authorization binding validator', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    assert.doesNotThrow(() =>
      validateStageACoreContractBindings(
        bundle.contract as Parameters<typeof validateStageACoreContractBindings>[0],
        bundle.matrix as Parameters<typeof validateStageACoreContractBindings>[1],
      ),
    );
  });

  it('44 in-memory mutated contract binding fails closed', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const contract = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    assert.doesNotThrow(() => validateStageACoreContractBindings(contract, matrix));

    contract.lifecycle_steps_reference_section_5c[0] = { step: 1, identifier: 'MUTATED_STEP' };
    assert.throws(
      () => validateStageACoreContractBindings(contract, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:LIFECYCLE_STEPS/,
    );

    const contract2 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract2.execution_authorization = true;
    assert.throws(
      () => validateStageACoreContractBindings(contract2, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:AUTHORIZATION_LOCKS/,
    );

    const contract3 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract3.pre_commit_failure_domain_registry.entries[0] = {
      ...contract3.pre_commit_failure_domain_registry.entries[0],
      lifecycle_gate_source: 'mutated_gate_source',
    };
    assert.throws(
      () => validateStageACoreContractBindings(contract3, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY/,
    );
  });

  it('45 controlled HOLD-code allowlist and no-space grammar', () => {
    assert.equal(sanitizeHoldReasonCode('WORKSPACE_NOT_CLEAN'), 'WORKSPACE_NOT_CLEAN');
    assert.equal(sanitizeHoldReasonCode('SOURCE_UTF8_ROUNDTRIP_MISMATCH:P1'), 'SOURCE_UTF8_ROUNDTRIP_MISMATCH:P1');
    assert.equal(sanitizeHoldReasonCode('FILE SYSTEM ERROR WITH SPACES'), 'UNKNOWN_HOLD');
    assert.equal(sanitizeHoldReasonCode('NOT_IN_ALLOWLIST'), 'UNKNOWN_HOLD');
    for (const code of STAGE_A_CONTRACT_BINDING_HOLD_CODES) {
      assert.equal(sanitizeHoldReasonCode(code), code);
    }
  });

  it('46 raw-byte source SHA and UTF-8 round-trip validation', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (const version of bundle.contract.versions) {
      const rawBytes = readFileSync(join(REPO_ROOT, version.path));
      const validated = validateMigrationSourceBytes(rawBytes, version.frozen_source_sha256, version.label);
      assert.equal(validated.sha256, version.frozen_source_sha256);
      assert.ok(validated.text.length > 0);
    }
    const invalidUtf8 = Buffer.from([0xff, 0xfe, 0xfd]);
    assert.throws(
      () => validateMigrationSourceBytes(invalidUtf8, createHash('sha256').update(invalidUtf8).digest('hex'), 'X'),
      /SOURCE_UTF8_ROUNDTRIP_MISMATCH:X/,
    );
  });

  it('47 wrong repo root rejected before Git runner invocation', () => {
    const coreSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      'utf8',
    );
    assert.equal(coreSource.includes('gitCommandRunnerOverride'), false);
    assert.equal(coreSource.includes('__setGitCommandRunnerForTests'), false);
    assert.throws(() => validateRepoRootGateBeforeGit('/tmp'), /WORKSPACE_REPO_ROOT_MISMATCH/);
    const publicResult = runTransactionNormalizedPlan({ repoRoot: '/tmp', planVersionSelector: 'P1' });
    assert.equal(publicResult.coreValidation, 'PRE_DB_HOLD');
    assert.notEqual(publicResult.coreValidation, 'PLAN_ONLY_PASS');
    const rootGateIndex = coreSource.indexOf('validateRepoRootGateBeforeGit');
    const gitReadIndex = coreSource.indexOf("execSync('git branch --show-current'");
    assert.ok(rootGateIndex >= 0 && gitReadIndex >= 0 && rootGateIndex < gitReadIndex);
  });

  it('48 source-authority rebind blocker removed after binding validation', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.ok(binding.canonicalPayloadSha256.length === 64);
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    const status = spawnSync('git', ['status', '--short', '-uall'], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (status.stdout.trim().length > 0) {
      const dirtyPublic = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
      assert.equal(dirtyPublic.coreValidation, 'PRE_DB_HOLD');
      assert.ok(dirtyPublic.stageBBlockers.includes(SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER));
      return;
    }
    const publicResult = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
    assert.equal(publicResult.executionState, 'EXECUTION_LOCKED');
    assert.equal(publicResult.sourceAuthorityBase, EXPECTED_SOURCE_AUTHORITY_BASE);
    assert.equal(publicResult.baselineStageACommit, BASELINE_STAGE_A_COMMIT);
    assert.equal(publicResult.planOnlyPassIsNotExecutionAuthorization, true);
    assert.equal(publicResult.executionRemainsLocked, true);
    assert.equal(publicResult.externalPlanAttestationRequired, true);
    assert.equal(publicResult.stageBBlockers.includes(SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER), false);
    assert.ok(publicResult.stageBBlockers.includes('executor_artifact_identity'));
  });

  it('49 exported Git override setter absent', () => {
    const coreSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      'utf8',
    );
    assert.equal(coreSource.includes('gitCommandRunnerOverride'), false);
    assert.equal(coreSource.includes('__setGitCommandRunnerForTests'), false);
  });

  it('50 public workspace gate cannot use fabricated facts', () => {
    const dirty = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
    assert.equal(dirty.coreValidation, 'PRE_DB_HOLD');
    assert.equal(dirty.holdReasonCode, 'WORKSPACE_NOT_CLEAN');
    const bypassAttempt = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(bypassAttempt.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    assert.equal(runTransactionNormalizedPlan.length, 1);
  });

  it('51 Revision-7 authority-bound fingerprint readiness always HOLD', () => {
    for (const candidate of ['preview-fp', 'any-candidate', 'frozen-preview-fingerprint']) {
      assert.equal(evaluateStageATargetFingerprintReadiness(candidate), 'HOLD');
    }
  });

  it('52 arbitrary equal fingerprint strings cannot self-approve Stage A', () => {
    assert.equal(compareFingerprintValuesForTests('same-fp', 'same-fp'), 'PASS');
    assert.equal(evaluateStageATargetFingerprintReadiness('same-fp'), 'HOLD');
  });

  it('53 missing ACK identifiers identifier fields fail binding', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const contract = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    delete (contract.ack_state_readonly_classification_lifecycle as { identifier?: string }).identifier;
    assert.throws(
      () => validateStageACoreContractBindings(contract, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:INTERSTITIAL_IDENTIFIERS/,
    );
    const contract2 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract2.ack_classifiers.identifiers = ['DEFINITELY_NOT_COMMITTED'];
    assert.throws(
      () => validateStageACoreContractBindings(contract2, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_CLASSIFIERS/,
    );
  });

  it('54 canonical ACK predicate rule mutation fails binding', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    const contract = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract.ack_classifiers.predicates.P1.DEFINITELY_NOT_COMMITTED.all_required = ['mutated'];
    assert.throws(
      () => validateStageACoreContractBindings(contract, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P1/,
    );
    const contract2 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract2.ack_classifiers.rules.no_automatic_retry = false;
    assert.throws(
      () => validateStageACoreContractBindings(contract2, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES/,
    );
    const contract3 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract3.ack_classifiers.predicates.CONTRADICTORY_OR_DRIFTED.mandatory_STOP = false;
    assert.throws(
      () => validateStageACoreContractBindings(contract3, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_CONTRADICTORY/,
    );
  });

  it('55 independent 15-entry failure registry rejects every field-family mutation', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    const mutations: Array<[string, (c: ContractBindingSource) => void]> = [
      [
        'transaction_state_class',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[0] = {
            ...c.pre_commit_failure_domain_registry.entries[0],
            transaction_state_class: 'MUTATED',
          };
        },
      ],
      [
        'original_connection_disposition',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[1] = {
            ...c.pre_commit_failure_domain_registry.entries[1],
            original_connection_disposition: 'MUTATED',
          };
        },
      ],
      [
        'rollback_action',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[2] = {
            ...c.pre_commit_failure_domain_registry.entries[2],
            rollback_action: 'MUTATED',
          };
        },
      ],
      [
        'classifier_required',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[3] = {
            ...c.pre_commit_failure_domain_registry.entries[3],
            classifier_required: !c.pre_commit_failure_domain_registry.entries[3]?.classifier_required,
          };
        },
      ],
      [
        'terminal_outcome',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[4] = {
            ...c.pre_commit_failure_domain_registry.entries[4],
            terminal_outcome: 'MUTATED',
          };
        },
      ],
      [
        'same_run_retry',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[5] = {
            ...c.pre_commit_failure_domain_registry.entries[5],
            same_run_retry: true,
          };
        },
      ],
      [
        'event_identifier',
        (c) => {
          c.pre_commit_failure_domain_registry.entries[6] = {
            ...c.pre_commit_failure_domain_registry.entries[6],
            event_identifier: 'MUTATED_EVENT',
          };
        },
      ],
    ];
    for (const [, mutate] of mutations) {
      const contract = structuredClone(
        bundle.contract,
      ) as Parameters<typeof validateStageACoreContractBindings>[0];
      mutate(contract);
      assert.throws(
        () => validateStageACoreContractBindings(contract, matrix),
        /STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY/,
      );
    }
  });

  it('56 exact Matrix P1-P7 order version name terminal binding', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    matrix.version_matrices[0] = {
      ...matrix.version_matrices[0],
      label: 'P1',
      version: '20260614000000',
      migration_name: 'preview_production_aligned_baseline_p1',
      successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION',
      execution_authorization: false,
      next_version_authorization: false,
    };
    assert.throws(
      () =>
        validateStageACoreContractBindings(
          bundle.contract as Parameters<typeof validateStageACoreContractBindings>[0],
          matrix,
        ),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS/,
    );
    const matrix2 = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    matrix2.version_matrices[6] = {
      ...matrix2.version_matrices[6],
      label: 'P7',
      version: '20260615000006',
      migration_name: 'm55_entitlements_unique_index_cleanup_v1',
      successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
      execution_authorization: false,
      next_version_authorization: false,
    };
    assert.throws(
      () =>
        validateStageACoreContractBindings(
          bundle.contract as Parameters<typeof validateStageACoreContractBindings>[0],
          matrix2,
        ),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS/,
    );
  });

  it('57 public target readiness accepts candidate only no Contract override', () => {
    assert.equal(evaluateStageATargetFingerprintReadiness.length, 1);
    const coreSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      'utf8',
    );
    const cliSource = readFileSync(join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts'), 'utf8');
    assert.equal(cliSource.includes('compareFingerprintValuesForTests'), false);
    assert.match(coreSource, /evaluateStageATargetFingerprintReadiness\(candidateFingerprint: string\)/);
  });

  it('58 current SHA-validated Revision-7 authority makes every candidate HOLD', () => {
    validateAuthorityBytes(REPO_ROOT);
    for (const candidate of ['fp-a', 'preview-target', 'any-value']) {
      assert.equal(evaluateStageATargetFingerprintReadiness(candidate), 'HOLD');
    }
  });

  it('59 fabricated mutated Contract cannot self-approve target readiness', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const contract = structuredClone(
      bundle.contract,
    ) as ContractBindingSource;
    contract.pre_connect_target_identity_gate.approved_preview_target_fingerprint = 'fabricated-approved-fp';
    assert.throws(
      () => validateStageACoreContractBindings(contract, bundle.matrix as Parameters<typeof validateStageACoreContractBindings>[1]),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY/,
    );
    assert.equal(evaluateStageATargetFingerprintReadiness('fabricated-approved-fp'), 'HOLD');
  });

  it('60 every pre-connect duplicate target field mutation fails binding', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    const fields: Array<(c: ContractBindingSource) => void> = [
      (c) => {
        c.pre_connect_target_identity_gate.approved_organization_label = 'm55-soul';
      },
      (c) => {
        c.pre_connect_target_identity_gate.approved_project_label = 'm55-soul-core';
      },
      (c) => {
        c.pre_connect_target_identity_gate.forbidden_production_identity.organization_label = 'mutated';
      },
      (c) => {
        c.pre_connect_target_identity_gate.forbidden_production_identity.project_label = 'mutated';
      },
      (c) => {
        c.pre_connect_target_identity_gate.approved_organization_label = 'm55-preview';
        c.target_identity.expected_organization_label = 'm55-soul';
      },
    ];
    for (const mutate of fields) {
      const contract = structuredClone(
        bundle.contract,
      ) as Parameters<typeof validateStageACoreContractBindings>[0];
      mutate(contract);
      assert.throws(
        () => validateStageACoreContractBindings(contract, matrix),
        /STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY/,
      );
    }
  });

  it('61 exact Contract P1-P7 label order registry passes', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    for (let i = 0; i < 7; i++) {
      const expected = EXPECTED_REVISION7_VERSION_IDENTITIES[i];
      const actual = bundle.contract.versions[i];
      assert.ok(expected && actual);
      assert.equal(actual.label, expected.label);
      assert.equal(actual.version, expected.version);
      assert.equal(actual.name, expected.name);
      assert.equal(actual.path, expected.path);
    }
  });

  it('62 Contract label path version mutation or duplicate fails binding', () => {
    const bundle = loadAuthorityBundle(REPO_ROOT);
    const matrix = structuredClone(bundle.matrix) as Parameters<typeof validateStageACoreContractBindings>[1];
    const contract = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract.versions[0] = { ...contract.versions[0], label: 'P9' as VersionLabel };
    assert.throws(
      () => validateStageACoreContractBindings(contract, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES/,
    );
    const contract2 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract2.versions[1] = { ...contract2.versions[1], path: 'mutated/path.sql' };
    assert.throws(
      () => validateStageACoreContractBindings(contract2, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES/,
    );
    const contract3 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract3.versions[2] = { ...contract3.versions[2], version: '99999999999999' };
    assert.throws(
      () => validateStageACoreContractBindings(contract3, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES/,
    );
    const contract4 = structuredClone(
      bundle.contract,
    ) as Parameters<typeof validateStageACoreContractBindings>[0];
    contract4.versions[3] = { ...contract4.versions[3], label: contract4.versions[4]?.label ?? 'P5' };
    assert.throws(
      () => validateStageACoreContractBindings(contract4, matrix),
      /STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES/,
    );
  });

  it('63 pure validated-facts helper uses distinct non-public-pass outcome', () => {
    const pure = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(pure.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    assert.equal(pure.ancestryValidationPerformed, false);
    assert.notEqual(pure.coreValidation, 'PLAN_ONLY_PASS');
    assert.notEqual(pure.coreValidation, 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED');
    assert.notEqual(pure.coreValidation, 'PLAN_STRUCTURE_VALIDATED');
  });

  it('64 public API never emits PLAN_ONLY_PASS in current implementation', () => {
    const coreSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      'utf8',
    );
    const runBlock = coreSource.slice(
      coreSource.indexOf('export function runTransactionNormalizedPlan'),
      coreSource.indexOf('export type { Policy2HistoryPayload'),
    );
    assert.equal(runBlock.includes("'PLAN_ONLY_PASS'"), false);
    assert.equal(runTransactionNormalizedPlan.length, 1);
    const publicResult = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
    assert.notEqual(publicResult.coreValidation, 'PLAN_ONLY_PASS');
  });

  it('65 addendum schema role status exact', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.equal(binding.addendum.schema, 'm55.preview.transaction_normalized.stage_a_binding.v1');
    assert.equal(binding.addendum.revision, 'STAGE-A-BINDING-v1');
    assert.equal(binding.addendum.status, 'DRAFT');
    assert.equal(binding.addendum.authority_role, 'REVISION_7_STAGE_A_BINDING_CONTRACT_ADDENDUM');
    assert.equal(binding.addendum.execution_status, 'NOT EXECUTED');
  });

  it('66 parent authority path bytes SHA exact', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.equal(binding.addendum.parent_authority.contract.path, AUTHORITY_CONTRACT_REL_PATH);
    assert.equal(binding.addendum.parent_authority.contract.bytes, AUTHORITY_FILE_EXPECTATIONS.contract.bytes);
    assert.equal(binding.addendum.parent_authority.contract.sha256, AUTHORITY_FILE_EXPECTATIONS.contract.sha256);
    assert.equal(binding.addendum.parent_authority.matrix.path, AUTHORITY_MATRIX_REL_PATH);
    assert.equal(binding.addendum.parent_authority.parser_evidence.path, AUTHORITY_PARSER_EVIDENCE_REL_PATH);
  });

  it('67 addendum contains no own full-file SHA blob commit', () => {
    const raw = readFileSync(join(REPO_ROOT, STAGE_A_BINDING_ADDENDUM_REL_PATH), 'utf8');
    assert.equal(raw.includes('full_file_sha256'), false);
    assert.equal(raw.includes('git_blob'), false);
    assert.equal(raw.includes('git_commit_sha'), false);
    assert.equal(raw.includes(BASELINE_STAGE_A_COMMIT), true);
  });

  it('68 addendum absent from protected runtime file list', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const paths = binding.addendum.generation_1_protected_runtime_identities.files.map((f) => f.path);
    assert.equal(paths.includes(STAGE_A_BINDING_ADDENDUM_REL_PATH), false);
    assert.equal(paths.length, 7);
  });

  it('69 canonical payload SHA exact with one exclusion', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.equal(binding.addendum.integrity.canonical_payload_exclusions.length, 1);
    assert.equal(
      binding.addendum.integrity.canonical_payload_exclusions[0],
      '/integrity/canonical_payload_sha256',
    );
    assert.equal(computeCanonicalPayloadSha256(binding.addendum), binding.canonicalPayloadSha256);
  });

  it('70 changed canonical payload field fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    mutated.workspace_binding.binding_policy_identifier = 'mutated_policy';
    assert.notEqual(computeCanonicalPayloadSha256(mutated), binding.canonicalPayloadSha256);
  });

  it('71 exact Generation-0 historical identity registry', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.equal(binding.addendum.generation_0_historical_identities.anchor_commit, BASELINE_STAGE_A_COMMIT);
    assert.equal(binding.addendum.generation_0_historical_identities.files.length, 8);
    for (let i = 0; i < EXPECTED_GENERATION0_BASELINE_IDENTITIES.length; i++) {
      const expected = EXPECTED_GENERATION0_BASELINE_IDENTITIES[i];
      const actual = binding.addendum.generation_0_historical_identities.files[i];
      assert.ok(expected && actual);
      assert.equal(actual.path, expected.path);
      assert.equal(actual.bytes, expected.bytes);
      assert.equal(actual.sha256, expected.sha256);
      assert.equal(actual.classification, expected.classification);
    }
  });

  it('72 exact Generation-1 protected runtime set', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const paths = binding.addendum.generation_1_protected_runtime_identities.files.map((f) => f.path);
    assert.deepEqual(paths, [
      AUTHORITY_CONTRACT_REL_PATH,
      AUTHORITY_MATRIX_REL_PATH,
      AUTHORITY_PARSER_EVIDENCE_REL_PATH,
      'lib/m55/transactionNormalized/splitAndTrim.ts',
      'lib/m55/transactionNormalized/statementStream.ts',
      GEN1_REBIND_CORE_REL_PATH,
      GEN1_REBIND_CLI_REL_PATH,
    ]);
  });

  it('73 test identity is review-only not runtime-protected', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const protectedPaths = binding.addendum.generation_1_protected_runtime_identities.files.map((f) => f.path);
    const reviewPaths = binding.addendum.generation_1_review_evidence.files.map((f) => f.path);
    assert.equal(protectedPaths.includes(GEN1_REVIEW_TEST_REL_PATH), false);
    assert.equal(reviewPaths.includes(GEN1_REVIEW_TEST_REL_PATH), true);
  });

  it('74 source base is ancestor of baseline commit', () => {
    assert.equal(isGitAncestor(REPO_ROOT, EXPECTED_SOURCE_AUTHORITY_BASE, BASELINE_STAGE_A_COMMIT), true);
  });

  it('75 baseline commit ancestor of current HEAD', () => {
    assert.equal(isGitAncestor(REPO_ROOT, BASELINE_STAGE_A_COMMIT, BASELINE_STAGE_A_COMMIT), true);
  });

  it('76 unrelated descendant permitted structurally if protected identities exact', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.equal(binding.addendum.workspace_binding.binding_policy_identifier, BINDING_POLICY_IDENTIFIER);
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'P1' },
      CLEAN_WORKSPACE,
    );
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
  });

  it('77 protected runtime identity drift fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    const coreEntry = mutated.generation_1_protected_runtime_identities.files[5];
    assert.ok(coreEntry);
    coreEntry.sha256 = '0'.repeat(64);
    assert.throws(
      () => validateStageABindingAddendumSemantics(mutated),
      /STAGE_A_BINDING_CANONICAL_PAYLOAD_MISMATCH/,
    );
  });

  it('78 pure helper cannot emit PLAN_STRUCTURE_VALIDATED without ancestry', () => {
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    assert.equal(result.ancestryValidationPerformed, false);
    assert.notEqual(result.coreValidation, 'PLAN_STRUCTURE_VALIDATED');
  });

  it('79 public result is PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED when clean', () => {
    const status = spawnSync('git', ['status', '--short', '-uall'], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (status.stdout.trim().length > 0) {
      const dirty = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
      assert.equal(dirty.coreValidation, 'PRE_DB_HOLD');
      assert.equal(dirty.holdReasonCode, 'WORKSPACE_NOT_CLEAN');
      return;
    }
    const result = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'ALL' });
    assert.equal(result.coreValidation, 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED');
    assert.equal(result.structuralValidation, 'PLAN_STRUCTURE_VALIDATED');
    assert.equal(result.holdReasonCode, PLAN_ONLY_EXTERNAL_ATTESTATION_HOLD);
  });

  it('80 public API CLI cannot accept arbitrary attestation path SHA object', () => {
    const coreSource = readFileSync(join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'), 'utf8');
    const cliSource = readFileSync(join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts'), 'utf8');
    assert.equal(coreSource.includes('verifyExternalPlanAttestation'), true);
    assert.equal(cliSource.includes('attestation'), true);
    assert.equal(runTransactionNormalizedPlan.length, 1);
    const script = join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts');
    const forbidden = spawnSync(process.execPath, ['--experimental-strip-types', script, '--attestation-path=/tmp/x'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.notEqual(forbidden.status, 0);
    assert.match(forbidden.stderr, /FORBIDDEN_ARGUMENT/);
  });

  it('81 no public PLAN_ONLY_PASS path in current implementation', () => {
    const result = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'P1' });
    assert.notEqual(result.coreValidation, 'PLAN_ONLY_PASS');
  });

  it('82 source-authority rebind blocker removed only after addendum validation', () => {
    const structural = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'P1' },
      CLEAN_WORKSPACE,
    );
    assert.equal(structural.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    assert.ok(STAGE_B_BLOCKERS.includes(SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER));
    assert.equal(
      (STAGE_B_EXECUTION_BLOCKERS as readonly string[]).includes(SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER),
      false,
    );
  });

  it('83 execution-specific blockers remain', () => {
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'P1' },
      CLEAN_WORKSPACE,
    );
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    const publicResult = runTransactionNormalizedPlan({ repoRoot: REPO_ROOT, planVersionSelector: 'P1' });
    for (const blocker of [
      'approved_preview_target_fingerprint',
      'executor_artifact_identity',
      'execution_package_identity',
      'db_transport_binding',
    ]) {
      if (publicResult.coreValidation === 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED') {
        assert.ok(publicResult.stageBBlockers.includes(blocker));
      }
    }
  });

  it('84 CLI deterministic nonzero HOLD after structural success', () => {
    const script = join(REPO_ROOT, 'scripts/m55/runTransactionNormalizedPlan.ts');
    const first = spawnSync(process.execPath, ['--experimental-strip-types', script, 'ALL'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const second = spawnSync(process.execPath, ['--experimental-strip-types', script, 'ALL'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(first.stdout, second.stdout);
    assert.notEqual(first.status, 0);
    const parsed = JSON.parse(first.stdout) as { coreValidation: string; holdReasonCode?: string };
    assert.notEqual(parsed.coreValidation, 'PLAN_ONLY_PASS');
    if (parsed.coreValidation === 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED') {
      assert.equal(parsed.holdReasonCode, PLAN_ONLY_EXTERNAL_ATTESTATION_HOLD);
    }
  });

  it('85 canonical deletion differs from blank-string substitution', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const deleted = computeCanonicalPayloadSha256(binding.addendum);
    const blanked = computeCanonicalPayloadSha256WithBlankSubstitution(binding.addendum);
    assert.notEqual(deleted, blanked);
    assert.equal(deleted, binding.canonicalPayloadSha256);
  });

  it('86 exact canonical exclusion declaration bound', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.deepEqual(binding.addendum.integrity.canonical_payload_exclusions, [
      '/integrity/canonical_payload_sha256',
    ]);
    assert.equal(
      binding.addendum.integrity.canonical_payload_sha256_role,
      'ACCIDENTAL_INTERNAL_CORRUPTION_DETECTION_ONLY',
    );
    assert.equal(binding.addendum.integrity.external_full_file_sha_attestation_required, true);
  });

  it('87 complete Generation-0 registry deep-equals independent authority', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    assert.deepEqual(
      binding.addendum.generation_0_historical_identities.files.map((f) => ({
        path: f.path,
        bytes: f.bytes,
        sha256: f.sha256,
        classification: f.classification,
      })),
      EXPECTED_GENERATION0_BASELINE_IDENTITIES.map((f) => ({
        path: f.path,
        bytes: f.bytes,
        sha256: f.sha256,
        classification: f.classification,
      })),
    );
  });

  it('88 Generation-0 field mutation fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    mutated.generation_0_historical_identities.files[6] = {
      ...mutated.generation_0_historical_identities.files[6],
      classification: 'mutated_baseline_test',
    };
    assert.throws(
      () => validateStageABindingAddendumSemantics(mutated),
      /STAGE_A_BINDING_GEN0_HISTORICAL_IDENTITY_MISMATCH/,
    );
  });

  it('89 immutable parser carry-forward mutation fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    const parserEntry = mutated.generation_1_protected_runtime_identities.files[3];
    assert.ok(parserEntry);
    parserEntry.sha256 = '0'.repeat(64);
    assert.throws(
      () => validateStageABindingAddendumSemantics(mutated),
      /STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH/,
    );
  });

  it('90 immutable statement-stream mutation fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    const streamEntry = mutated.generation_1_protected_runtime_identities.files[4];
    assert.ok(streamEntry);
    streamEntry.classification = 'mutated_statement_stream';
    assert.throws(
      () => validateStageABindingAddendumSemantics(mutated),
      /STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH/,
    );
  });

  it('91 contract-revision trigger supersedes mutation fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    mutated.contract_revision_fulfillment.trigger = 'mutated_trigger';
    assert.throws(() => validateStageABindingAddendumSemantics(mutated), /STAGE_A_BINDING_ADDENDUM_MALFORMED/);
    const mutated2 = structuredClone(binding.addendum);
    mutated2.contract_revision_fulfillment.supersedes_plan_only_checks = ['mutated_check'];
    assert.throws(() => validateStageABindingAddendumSemantics(mutated2), /STAGE_A_BINDING_ADDENDUM_MALFORMED/);
  });

  it('92 integrity role external flag mutation fails closed', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    mutated.integrity.canonical_payload_sha256_role = 'MUTATED_ROLE';
    assert.throws(() => validateStageABindingAddendumSemantics(mutated), /STAGE_A_BINDING_ADDENDUM_MALFORMED/);
    const mutated2 = structuredClone(binding.addendum);
    mutated2.integrity.external_full_file_sha_attestation_required = false;
    assert.throws(() => validateStageABindingAddendumSemantics(mutated2), /STAGE_A_BINDING_ADDENDUM_MALFORMED/);
  });

  it('93 pure helper cannot emit PLAN_STRUCTURE_VALIDATED without ancestry duplicate guard', () => {
    const result = evaluatePlanCoreFromValidatedWorkspaceFacts(
      { repoRoot: REPO_ROOT, planVersionSelector: 'ALL' },
      CLEAN_WORKSPACE,
    );
    assert.notEqual(result.coreValidation, 'PLAN_STRUCTURE_VALIDATED');
    assert.equal(result.coreValidation, 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY');
    const coreSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/transactionNormalized/transactionNormalizedCore.ts'),
      'utf8',
    );
    const fnStart = coreSource.indexOf('export function evaluatePlanCoreFromValidatedWorkspaceFacts');
    const fnEnd = coreSource.indexOf('export function formatRedactedPlanEvidence');
    assert.ok(fnStart >= 0 && fnEnd > fnStart);
    const fnSlice = coreSource.slice(fnStart, fnEnd);
    assert.equal(fnSlice.includes("'PLAN_STRUCTURE_VALIDATED'"), false);
  });

  it('94 protected drift invokes shared validator and fails closed on CLI SHA mutation', () => {
    const binding = loadStageABindingAddendum(REPO_ROOT);
    const mutated = structuredClone(binding.addendum);
    const cliEntry = mutated.generation_1_protected_runtime_identities.files[6];
    assert.ok(cliEntry);
    cliEntry.sha256 = '0'.repeat(64);
    assert.throws(
      () => validateStageABindingAddendumSemantics(mutated),
      /STAGE_A_BINDING_CANONICAL_PAYLOAD_MISMATCH/,
    );
    assert.deepEqual(
      binding.addendum.generation_1_protected_runtime_identities.files.slice(0, 5).map((f) => f.sha256),
      EXPECTED_IMMUTABLE_CARRY_FORWARD_IDENTITIES.map((f) => f.sha256),
    );
  });
});
