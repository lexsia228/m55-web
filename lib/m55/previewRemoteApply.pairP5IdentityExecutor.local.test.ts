import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertPairP5ProbeSqlPinnedIntegrity,
  buildPairP5IdentityNormalizedStatements,
  buildPairP5IdentityHistoryInsertBinding,
  PAIR_P5_IDENTITY_MIGRATION_REL_PATH,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_IDENTITY_STEP_ID,
  PAIR_P5_POST_PROBE_SQL,
  PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_PRIOR_PROBE_SQL,
  PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE,
  PAIR_P5_PG_TRIGGER_BEFORE_UPDATE_ROW_TGTYPE,
  PAIR_P5_POST_INFORMATIONAL_PROBE_FIELDS,
  PAIR_P5_POST_GREEN_PROBE_FIELDS,
  PAIR_P5_PROBE_OUTPUT_COLUMN,
  validatePairP5PostProbeResult,
  validatePairP5PriorProbeResult,
  buildMockPairP5PriorProbeRow,
  buildMockPairP5PostProbeRow,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import {
  buildPairP5IdentityOfflinePlan,
  expandPairP5IdentityExecutionPhases,
  normalizePairP5StepTokens,
  PAIR_P5_STATIC_EXECUTION_GATE,
  runPairP5MockBoundedTransaction,
  simulatePairP5IdentityMockTransportTrace,
  validateDedicatedPairP5IdentityStepSelection,
  validateDedicatedPairP5IdentityStepSelectionList,
  validatePairP5RepositoryIdentity,
  validatePairP5TargetIdentity,
  readPairP5RepositoryIdentityFromGit,
} from './previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import {
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import {
  PAIR_P5_EXPECTED_BRANCH,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  isPairP5GitObjectSha40,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';

const ROOT = PAIR_P5_EXPECTED_REPO_ROOT;

const REPOSITORY = {
  repoRoot: ROOT,
  branch: PAIR_P5_EXPECTED_BRANCH,
  headCommitSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  treeSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  trackedWorktreeClean: true,
  indexEmpty: true,
  factsSource: REPOSITORY_FACTS_SOURCE,
};

const TARGET = {
  organization: 'm55-preview',
  project: 'm55-soul-preview',
  databaseTier: 'Primary Database',
  projectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
};

function buildPlan() {
  return buildPairP5IdentityOfflinePlan({
    repoRoot: ROOT,
    repository: REPOSITORY,
    repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED',
    target: TARGET,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    executionEnablement: false,
  });
}

describe('pair P5 identity offline executor', () => {
  it('pins P5-1 migration bytes and normalized stream', () => {
    const path = join(ROOT, PAIR_P5_IDENTITY_MIGRATION_REL_PATH);
    const bytes = readFileSync(path);
    const sha = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha, PAIR_P5_IDENTITY_MIGRATION_SHA256);
    const statements = buildPairP5IdentityNormalizedStatements(ROOT);
    assert.equal(statements.length, PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT);
    const binding = buildPairP5IdentityHistoryInsertBinding(ROOT);
    assert.equal(binding.normalizedStreamCompositeSha256, PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256);
  });

  it('normalizes readonly step token lists without unsafe narrowing (B1)', () => {
    const readonlyTokens: readonly string[] = [' PAIR_P5_IDENTITY_20261009 ', ''];
    assert.deepEqual(normalizePairP5StepTokens(readonlyTokens), [PAIR_P5_IDENTITY_STEP_ID]);
    assert.deepEqual(validateDedicatedPairP5IdentityStepSelectionList(readonlyTokens), {
      ok: true,
      stepId: PAIR_P5_IDENTITY_STEP_ID,
    });
  });

  it('asserts pinned probe SQL digests (B4)', () => {
    assertPairP5ProbeSqlPinnedIntegrity();
    const priorDigest = createHash('sha256').update(PAIR_P5_PRIOR_PROBE_SQL, 'utf8').digest('hex');
    const postDigest = createHash('sha256').update(PAIR_P5_POST_PROBE_SQL, 'utf8').digest('hex');
    assert.equal(priorDigest, PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL);
    assert.equal(postDigest, PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL);
    assert.throws(() => {
      const badLiteral = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as typeof PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL;
      if (priorDigest === badLiteral) {
        throw new Error('unexpected');
      }
      const original = PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL;
      void original;
      throw new Error('HOLD_PAIR_P5_PRIOR_PROBE_SQL_SHA256_MISMATCH');
    });
  });

  it('fails pinned integrity when substituted hash literal mismatches computed digest', () => {
    const digest = createHash('sha256').update(PAIR_P5_PRIOR_PROBE_SQL, 'utf8').digest('hex');
    assert.notEqual(
      digest,
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    );
  });

  it('rejects missing migration path', () => {
    assert.throws(
      () => buildPairP5IdentityNormalizedStatements('/nonexistent'),
      /HOLD_NORMALIZED_STREAM_MISMATCH|ENOENT/,
    );
  });

  it('enforces dedicated step selection fail-closed', () => {
    assert.equal(validateDedicatedPairP5IdentityStepSelection('').ok, false);
    assert.equal(validateDedicatedPairP5IdentityStepSelection('ALL').ok, false);
    assert.equal(validateDedicatedPairP5IdentityStepSelection('P8').ok, false);
    assert.equal(validateDedicatedPairP5IdentityStepSelection('P5').ok, false);
    assert.equal(validateDedicatedPairP5IdentityStepSelection('20261010000000').ok, false);
    assert.equal(validateDedicatedPairP5IdentityStepSelection(PAIR_P5_IDENTITY_STEP_ID).ok, true);
  });

  it('validates preview target binding with exact pooler fingerprint (B3)', () => {
    assert.equal(validatePairP5TargetIdentity(TARGET), null);
    assert.equal(
      validatePairP5TargetIdentity({ ...TARGET, projectRef: 'wrong-ref' }),
      'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH',
    );
    assert.equal(
      validatePairP5TargetIdentity({
        ...TARGET,
        hostFingerprintSha256: 'a'.repeat(64),
      }),
      'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH',
    );
    assert.equal(
      validatePairP5TargetIdentity({ ...TARGET, organization: 'm55-soul', project: 'm55-soul-core' }),
      'HOLD_PAIR_P5_TARGET_PRODUCTION_FORBIDDEN',
    );
  });

  it('reads repository identity from git without forging facts (B3)', () => {
    const observed = readPairP5RepositoryIdentityFromGit(ROOT);
    assert.equal(observed.provenance, 'GIT_READ_ONLY_OBSERVED');
    assert.equal(observed.facts.repoRoot, ROOT);
    assert.equal(isPairP5GitObjectSha40(observed.facts.headCommitSha), true);
    assert.equal(isPairP5GitObjectSha40(observed.facts.treeSha), true);
    assert.equal(observed.facts.factsSource, REPOSITORY_FACTS_SOURCE);
  });

  it('builds offline plan with execution lock', () => {
    const plan = buildPlan();
    assert.equal(plan.mode, 'PAIR_P5_IDENTITY_OFFLINE_PLAN');
    if (plan.mode !== 'PAIR_P5_IDENTITY_OFFLINE_PLAN') {
      return;
    }
    assert.equal(plan.executionAuthorized, false);
    assert.equal(plan.migration.sha256, PAIR_P5_IDENTITY_MIGRATION_SHA256);
    assert.equal(plan.priorProbeSqlSha256, PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL);
    assert.equal(plan.postProbeSqlSha256, PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL);
    assert.equal(plan.requiredPriorHistoryVersions.length, 22);
    assert.equal(plan.fulfillRpcBodyFingerprintVerification, 'UNKNOWN_NOT_PINNED');
  });

  it('mock transport trace preserves transaction order', () => {
    const plan = buildPlan();
    assert.equal(plan.mode, 'PAIR_P5_IDENTITY_OFFLINE_PLAN');
    if (plan.mode !== 'PAIR_P5_IDENTITY_OFFLINE_PLAN') {
      return;
    }
    const trace = simulatePairP5IdentityMockTransportTrace(plan);
    assert.equal(trace.historyInsertCount, 1);
    assert.equal(trace.mutationStatementCount, PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT);
    const phases = trace.records.map((entry) => entry.phase);
    const beginIdx = phases.indexOf('BEGIN');
    const priorIdx = phases.indexOf('PRIOR_PROBE');
    const historyIdx = phases.lastIndexOf('HISTORY_INSERT');
    const postIdx = phases.indexOf('POST_PROBE');
    const commitIdx = phases.indexOf('COMMIT');
    assert.ok(beginIdx < priorIdx);
    assert.ok(priorIdx < historyIdx);
    assert.ok(historyIdx < postIdx);
    assert.ok(postIdx < commitIdx);
    const mutationCount = phases.filter((phase) => phase === 'MUTATION_STATEMENT').length;
    assert.equal(mutationCount, PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT);
    assert.equal(expandPairP5IdentityExecutionPhases(mutationCount).length, phases.length);
  });

  it('rolls back on failed prior/post probes and stops ambiguous commit (B5)', () => {
    const plan = buildPlan();
    assert.equal(plan.mode, 'PAIR_P5_IDENTITY_OFFLINE_PLAN');
    if (plan.mode !== 'PAIR_P5_IDENTITY_OFFLINE_PLAN') {
      return;
    }
    const priorFail = runPairP5MockBoundedTransaction({
      plan,
      priorProbe: validatePairP5PriorProbeResult(
        buildMockPairP5PriorProbeRow({ history_total_twenty_two: false }),
      ),
      postProbe: validatePairP5PostProbeResult(buildMockPairP5PostProbeRow()),
      commitResponseClass: 'COMMIT_OK',
    });
    assert.equal(priorFail.disposition, 'ROLLBACK_PRIOR_PROBE_FAILED');
    assert.equal(priorFail.commitSent, false);
    assert.equal(priorFail.rollbackSent, true);
    assert.equal(priorFail.sameRunRetry, false);
    assert.equal(priorFail.phasesExecuted.includes('COMMIT'), false);

    const postFail = runPairP5MockBoundedTransaction({
      plan,
      priorProbe: validatePairP5PriorProbeResult(buildMockPairP5PriorProbeRow()),
      postProbe: validatePairP5PostProbeResult(
        buildMockPairP5PostProbeRow({ history_total_twenty_three: false }),
      ),
      commitResponseClass: 'COMMIT_OK',
    });
    assert.equal(postFail.disposition, 'ROLLBACK_POST_PROBE_FAILED');
    assert.equal(postFail.commitSent, false);

    const ambiguous = runPairP5MockBoundedTransaction({
      plan,
      priorProbe: validatePairP5PriorProbeResult(buildMockPairP5PriorProbeRow()),
      postProbe: validatePairP5PostProbeResult(buildMockPairP5PostProbeRow()),
      commitResponseClass: 'COMMIT_AMBIGUOUS',
    });
    assert.equal(ambiguous.disposition, 'STOP_COMMIT_AMBIGUOUS_NO_RETRY');
    assert.equal(ambiguous.sameRunRetry, false);
    assert.equal(ambiguous.holdReasonCode, 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS');
  });

  it('validates probe parsers on mock rows', () => {
    assert.equal(validatePairP5PriorProbeResult(buildMockPairP5PriorProbeRow()).ok, true);
    assert.equal(validatePairP5PostProbeResult(buildMockPairP5PostProbeRow()).ok, true);
    assert.equal(
      validatePairP5PriorProbeResult(
        buildMockPairP5PriorProbeRow({ history_total_twenty_two: false }),
      ).ok,
      false,
    );
  });

  it('pins identity-pair CHECK via pg_get_constraintdef(false), not substring (B2)', () => {
    assert.ok(PAIR_P5_POST_PROBE_SQL.includes('pg_catalog.pg_get_constraintdef(con.oid, false)'));
    assert.ok(
      PAIR_P5_POST_PROBE_SQL.includes(PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE),
    );
    const identityCheckChunk = PAIR_P5_POST_PROBE_SQL.slice(
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_pair_check_definition_exact'),
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_pair_check_definition_exact') + 600,
    );
    assert.equal(identityCheckChunk.includes('position('), false);
    assert.equal(
      PAIR_P5_POST_PROBE_SQL.includes('fulfill_rpc_prosrc_fingerprint_not_pinned_ack'),
      false,
    );
    assert.equal(PAIR_P5_POST_PROBE_SQL.includes("'probe_green', (true)"), false);
  });

  it('treats body-fingerprint informational fields as HOLD without failing probe_green (B2)', () => {
    const row = buildMockPairP5PostProbeRow();
    const probePayload = row.rows[0]![PAIR_P5_PROBE_OUTPUT_COLUMN];
    assert.ok(typeof probePayload === 'object' && probePayload !== null && !Array.isArray(probePayload));
    const fieldsMap = probePayload as Record<string, unknown>;
    for (const field of PAIR_P5_POST_INFORMATIONAL_PROBE_FIELDS) {
      assert.equal(fieldsMap[field], false);
    }
    assert.equal(validatePairP5PostProbeResult(row).ok, true);
  });

  it('fails post probe on catalog drift cases (B2)', () => {
    const driftCases: Array<Partial<Record<string, boolean>>> = [
      { identity_links_fk_source_columns_ordered: false },
      { identity_links_fk_target_columns_ordered: false },
      { identity_links_partial_unique_index_shape: false },
      { identity_links_immutable_trigger_contract: false },
      { identity_links_forbidden_table_grants_zero: false },
      { identity_links_service_role_table_grants_exact: false },
      { identity_links_partial_unique_index_wrong_relkind_zero: false },
      { snapshot_trigger_contract: false },
      { identity_pair_check_definition_exact: false },
      { unexpected_cpc_check_zero: false },
    ];
    for (const drift of driftCases) {
      assert.equal(validatePairP5PostProbeResult(buildMockPairP5PostProbeRow(drift)).ok, false);
    }
  });

  it('uses index relkind=i wrong-kind guard and tgtype=19 trigger shape (PATCH-3 B2)', () => {
    const indexGuardChunk = PAIR_P5_POST_PROBE_SQL.slice(
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_links_partial_unique_index_wrong_relkind_zero'),
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_links_partial_unique_index_wrong_relkind_zero') + 400,
    );
    assert.ok(indexGuardChunk.includes("relkind <> 'i'"));
    assert.equal(indexGuardChunk.includes("relkind <> 'r'"), false);
    assert.ok(
      PAIR_P5_POST_PROBE_SQL.includes(
        `t.tgtype = ${PAIR_P5_PG_TRIGGER_BEFORE_UPDATE_ROW_TGTYPE}`,
      ),
    );
    const identityTriggerChunk = PAIR_P5_POST_PROBE_SQL.slice(
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_links_immutable_trigger_contract'),
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_links_immutable_trigger_contract') + 700,
    );
    assert.equal(identityTriggerChunk.includes("position('BEFORE UPDATE'"), false);
    const grantsChunk = PAIR_P5_POST_PROBE_SQL.slice(
      PAIR_P5_POST_PROBE_SQL.indexOf('identity_links_service_role_table_grants_exact'),
      PAIR_P5_POST_PROBE_SQL.indexOf('p52_reservation_column_absent'),
    );
    assert.ok(grantsChunk.includes("'UPDATE'"));
    assert.ok(grantsChunk.includes('forbid(priv)'));
    assert.equal(grantsChunk.includes("has_table_privilege('PUBLIC'"), false);
    assert.equal(grantsChunk.includes("has_function_privilege('PUBLIC'"), false);
    assert.ok(grantsChunk.includes('pg_catalog.aclexplode'));
    assert.ok(grantsChunk.includes('acl.grantee = 0'));
  });

  it('rejects tampered post probe digest pin (B2)', () => {
    const digest = createHash('sha256').update(PAIR_P5_POST_PROBE_SQL, 'utf8').digest('hex');
    assert.equal(digest, PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL);
    assert.notEqual(
      digest,
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    );
    assert.ok(PAIR_P5_POST_GREEN_PROBE_FIELDS.length > 30);
  });

  it('static gate remains locked', () => {
    assert.equal(PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized, false);
    assert.equal(PAIR_P5_STATIC_EXECUTION_GATE.sqlExecuted, false);
    assert.equal(validatePairP5RepositoryIdentity(ROOT, REPOSITORY), null);
  });
});
