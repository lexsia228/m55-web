import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { pglastParseSql } from '../../scripts/m55/previewBaselineTool.ts';
import {
  AUTHORITY_FILE_EXPECTATIONS,
  EXPECTED_P8_VERSION_IDENTITY,
  EXPECTED_REVISION7_TRANSPORT_VERSION_IDENTITIES,
  EXPECTED_REVISION7_VERSION_IDENTITIES,
  expandPlanSelector,
} from './transactionNormalized/transactionNormalizedCore.ts';
import {
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import {
  loadVerifiedProbeSqlBundle,
  resolveProbeSqlFromBundle,
  STATIC_EXECUTION_GATE,
  validateInTransactionPostProbe,
  type PreviewRemoteExecutionInput,
} from './previewRemoteApply/remoteExecutionExecutor.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  type ExpectedAuthorizationBinding,
  type ObservedPreConnectFacts,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import {
  buildMockP8PostProbeRow,
  buildMockP8PriorProbeRow,
  buildP8DedicatedTransactionPlanOutline,
  buildP8NormalizedStatements,
  HOLD_P8_POSTCONDITION_MISMATCH,
  P8_MALFORMED_PROBE_SQL_FIXTURE,
  P8_MIGRATION_REL_PATH,
  P8_MIGRATION_SHA256,
  P8_NORMALIZED_STREAM_COMPOSITE_SHA256,
  P8_NORMALIZED_STATEMENT_COUNT,
  P8_POST_PROBE_SQL,
  P8_POST_PROBE_SQL_BYTES,
  P8_POST_PROBE_SQL_SHA256,
  P8_POST_REQUIRED_FIELDS,
  P8_PRE_ERROR_CODE_CHECK_DEFINITIONS,
  P8_POST_ERROR_CODE_CHECK_DEFINITIONS,
  P8_PRIOR_PROBE_SQL,
  P8_PRIOR_PROBE_SQL_BYTES,
  P8_PRIOR_PROBE_SQL_SHA256,
  P8_PRIOR_REQUIRED_FIELDS,
  P8_STEP_ID,
  P8_USER_REF_HASH_CHECK_DEFINITIONS,
  validateDedicatedP8StepSelection,
  validateDedicatedP8StepSelectionList,
  validateP8PostProbeResult,
  validateP8PriorProbeResult,
  CREDENTIAL_METHOD_IDS,
  EXPECTED_BRANCH,
  EXPECTED_REPO_ROOT,
} from './previewRemoteApply/types.ts';
import {
  buildPreviewRemoteApplyPlan,
  parseDedicatedP8PlanCliArgs,
  runPreviewRemoteApplyDedicatedPlanCli,
} from './previewRemoteApply/transactionNormalizedRemoteExecutor.ts';
import { getRuntimeProbeById, validateRuntimeProbeRegistry } from './previewRemoteApply/runtimeProbeRegistry.ts';
import {
  parsePreviewRemoteExecutionCliArgs,
  runPreviewRemoteExecutionCli,
} from '../../scripts/m55/runPreviewRemoteExecution.ts';

const ROOT = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1';
const POSTCHECK = join(
  ROOT,
  'scripts/sql/preview/m55_preview_post_remediation_deletion_smoke_postcheck.sql',
);
const POSTCHECK_SHA = 'c96cbea9e0e1d07a0ab103bd8de321d1fb4944e3531def167b115e65420adc00';

const REPOSITORY = {
  repoRoot: ROOT,
  branch: 'feat/m55-paid-lp-canonical-wave1',
  headCommitSha: '90135dd2a03a6c1b9a7113ed6ede110bccec8e53',
  treeSha: '90135dd2a03a6c1b9a7113ed6ede110bccec8e53',
  trackedWorktreeClean: true,
  indexEmpty: true,
  factsSource: 'GIT_READ_ONLY_PREFLIGHT' as const,
};

const TARGET = {
  organization: 'm55-preview',
  project: 'm55-soul-preview',
  databaseTier: 'Primary Database',
  projectRef: 'sbogwyzldjxxouhqtpoq',
  hostFingerprintSha256: '4982c8162697c153b25d2a028af3b46fba2ad2d4c3f65351feca495aa81df75e',
};

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function validHostFingerprint(): string {
  const result = calculateCanonicalHostFingerprint(SESSION_POOLER_HOST);
  assert.equal(result.ok, true);
  return result.fingerprintSha256;
}

function observedFromExpected(expected: ExpectedAuthorizationBinding): ObservedPreConnectFacts {
  return {
    environment: expected.environment,
    organizationSlug: expected.organizationSlug,
    projectName: expected.projectName,
    databaseSource: expected.databaseSource,
    databaseName: expected.databaseName,
    expectedCurrentUser: expected.expectedCurrentUser,
    connectionEndpointProfile: expected.connectionEndpointProfile,
    connectionUser: expected.connectionUser,
    projectRef: expected.projectRef,
    host: expected.host,
    hostFingerprintSha256: expected.hostFingerprintSha256,
    port: expected.port,
    sslmode: expected.sslmode,
    credentialMethod: expected.credentialMethod,
    repositoryBranch: expected.repositoryBranch,
    repositoryHead: expected.repositoryHead,
    repositoryTree: expected.repositoryTree,
    executionAuthorizationId: expected.executionAuthorizationId,
    selectedStep: expected.selectedStep,
    executionSqlAuthorityFoundationId: expected.executionSqlAuthorityFoundationId,
    executionSqlAuthorityFoundationManifestId: expected.executionSqlAuthorityFoundationManifestId,
    remoteExecutionLifecycleAuthorityId: expected.remoteExecutionLifecycleAuthorityId,
    remoteConnectionAuthorityId: expected.remoteConnectionAuthorityId,
  };
}

function validP8AuthorizationEnvelope(
  overrides: Partial<ExpectedAuthorizationBinding> = {},
) {
  const expected: ExpectedAuthorizationBinding = {
    environment: 'Preview',
    organizationSlug: 'm55-preview',
    projectName: 'm55-soul-preview',
    databaseSource: 'Primary Database',
    databaseName: 'postgres',
    expectedCurrentUser: 'postgres',
    connectionEndpointProfile: SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
    connectionUser: expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF),
    projectRef: APPROVED_PREVIEW_PROJECT_REF,
    host: SESSION_POOLER_HOST,
    hostFingerprintSha256: validHostFingerprint(),
    port: 5432,
    sslmode: 'require',
    credentialMethod: CREDENTIAL_METHOD_IDS[0],
    repositoryBranch: EXPECTED_BRANCH,
    repositoryHead: REPOSITORY.headCommitSha,
    repositoryTree: REPOSITORY.treeSha,
    executionAuthorizationId: 'M55-HUMAN-EXEC-AUTH-P8-TEST-001',
    selectedStep: 'P8',
    executionSqlAuthorityFoundationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
    executionSqlAuthorityFoundationManifestId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
    remoteExecutionLifecycleAuthorityId: 'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
    remoteConnectionAuthorityId: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
    ...overrides,
  };
  return { expected, observed: observedFromExpected(expected) };
}

function probeBundle() {
  const loaded = loadVerifiedProbeSqlBundle(ROOT);
  assert.equal(loaded.ok, true);
  return loaded.bundle;
}

describe('P8 correlation transport FINAL-SURGICAL-CORRECTION', () => {
  it('preservation: target migration and postcheck SHA exact', () => {
    assert.equal(sha256(join(ROOT, P8_MIGRATION_REL_PATH)), P8_MIGRATION_SHA256);
    assert.equal(sha256(POSTCHECK), POSTCHECK_SHA);
  });

  it('preservation: P1-P7 source and normalized SHA arrays unchanged', () => {
    assert.equal(EXPECTED_REVISION7_VERSION_IDENTITIES.length, 7);
    const contractPath = join(
      ROOT,
      'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json',
    );
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as {
      versions: Array<{ label: string; frozen_source_sha256: string; normalized_stream_composite_sha256: string; path: string }>;
    };
    for (const entry of EXPECTED_REVISION7_VERSION_IDENTITIES) {
      const row = contract.versions.find((version) => version.label === entry.label);
      assert.ok(row);
      const identity = EXPECTED_REVISION7_VERSION_IDENTITIES.find((item) => item.label === entry.label)!;
      const path = 'path' in identity ? identity.path : row!.path;
      assert.equal(sha256(join(ROOT, path)), row!.frozen_source_sha256);
    }
  });

  it('preservation: executionAuthorized remains false', () => {
    assert.equal(STATIC_EXECUTION_GATE.executionAuthorized, false);
  });

  it('probe SQL: pglast parses PRIOR_P8 and POST_P8 as one SelectStmt each', () => {
    for (const sql of [P8_PRIOR_PROBE_SQL, P8_POST_PROBE_SQL]) {
      const parsed = pglastParseSql(sql);
      assert.equal(parsed.statement_count, 1);
      assert.equal(parsed.statements[0]?.type, 'SelectStmt');
    }
  });

  it('probe SQL: malformed nested-quote fixture fails pglast parser', () => {
    assert.throws(() => pglastParseSql(P8_MALFORMED_PROBE_SQL_FIXTURE));
  });

  it('probe SQL: actual bytes and SHA identities exact', () => {
    assert.equal(Buffer.byteLength(P8_PRIOR_PROBE_SQL, 'utf8'), P8_PRIOR_PROBE_SQL_BYTES);
    assert.equal(Buffer.byteLength(P8_POST_PROBE_SQL, 'utf8'), P8_POST_PROBE_SQL_BYTES);
    assert.equal(createHash('sha256').update(P8_PRIOR_PROBE_SQL).digest('hex'), P8_PRIOR_PROBE_SQL_SHA256);
    assert.equal(createHash('sha256').update(P8_POST_PROBE_SQL).digest('hex'), P8_POST_PROBE_SQL_SHA256);
  });

  it('definition authority: PRE/POST error-code and user-ref-hash constants centralized', () => {
    assert.equal(P8_PRE_ERROR_CODE_CHECK_DEFINITIONS.length, 1);
    assert.equal(P8_POST_ERROR_CODE_CHECK_DEFINITIONS.length, 1);
    assert.equal(P8_USER_REF_HASH_CHECK_DEFINITIONS.length, 2);
    assert.match(P8_PRE_ERROR_CODE_CHECK_DEFINITIONS[0]!, /error_code IS NULL OR/);
    assert.doesNotMatch(P8_PRE_ERROR_CODE_CHECK_DEFINITIONS[0]!, /CORRELATION_MISMATCH/);
    assert.match(P8_POST_ERROR_CODE_CHECK_DEFINITIONS[0]!, /CORRELATION_MISMATCH/);
    assert.doesNotMatch(P8_USER_REF_HASH_CHECK_DEFINITIONS[0]!, /LIKE/);
    assert.doesNotMatch(P8_USER_REF_HASH_CHECK_DEFINITIONS[1]!, /LIKE/);
  });

  it('post probe index authority: accepts PostgreSQL pretty partial-index deparse without outer parens', () => {
    assert.match(P8_POST_PROBE_SQL, /pg_get_expr\(i\.indpred, i\.indrelid, true\) = 'user_ref_hash IS NOT NULL'/);
    assert.doesNotMatch(P8_POST_PROBE_SQL, /pg_get_expr\(i\.indpred, i\.indrelid, true\) = '\(user_ref_hash IS NOT NULL\)'/);
  });

  it('post verifier: competing user_ref_hash index count must be zero', () => {
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ competing_user_ref_hash_index_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
  });

  it('probe bundle: foundation mismatch fails before returning bundle', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'm55-p8-foundation-'));
    try {
      const loaded = loadVerifiedProbeSqlBundle(tempRoot);
      assert.equal(loaded.ok, false);
      if (loaded.ok) throw new Error('expected hold');
      assert.equal(loaded.holdReasonCode, 'HOLD_AUTHORITY_IDENTITY_MISMATCH');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('probe bundle: real resolver returns PRIOR_P8 and POST_P8 SQL', () => {
    const bundle = probeBundle();
    const prior = resolveProbeSqlFromBundle(bundle, 'PRIOR_P8');
    const post = resolveProbeSqlFromBundle(bundle, 'POST_P8');
    assert.equal(prior, P8_PRIOR_PROBE_SQL.trim());
    assert.equal(post, P8_POST_PROBE_SQL.trim());
  });

  it('probe bundle: SELECT-only catalog probes without application-row reads', () => {
    for (const sql of [P8_PRIOR_PROBE_SQL, P8_POST_PROBE_SQL]) {
      const upper = sql.toUpperCase();
      assert.match(sql, /^SELECT json_build_object\(/);
      assert.equal(upper.includes('INSERT '), false);
      assert.equal(upper.includes('UPDATE '), false);
      assert.equal(upper.includes('DELETE '), false);
      assert.equal(sql.includes('FROM public.clerk_webhook_events'), false);
    }
  });

  it('probe bundle: embedded SHA identities exact', () => {
    assert.equal(createHash('sha256').update(P8_PRIOR_PROBE_SQL).digest('hex'), P8_PRIOR_PROBE_SQL_SHA256);
    assert.equal(createHash('sha256').update(P8_POST_PROBE_SQL).digest('hex'), P8_POST_PROBE_SQL_SHA256);
  });

  it('probe bundle: missing P8 probe fails closed', () => {
    const bundle = probeBundle();
    assert.notEqual(resolveProbeSqlFromBundle(bundle, 'PRIOR_P8'), bundle.catalogExtractorSql);
    assert.notEqual(resolveProbeSqlFromBundle(bundle, 'POST_P8'), bundle.catalogExtractorSql);
  });

  it('prior verifier: exact PRE state passes', () => {
    const result = validateP8PriorProbeResult(buildMockP8PriorProbeRow());
    assert.equal(result.ok, true);
    assert.equal(result.probeGreen, true);
  });

  it('prior verifier: target history present fails', () => {
    const result = validateP8PriorProbeResult(
      buildMockP8PriorProbeRow({ target_version_absent: false, probe_green: false }),
    );
    assert.equal(result.ok, false);
  });

  it('prior verifier: existing target column/check/index fails', () => {
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ user_ref_hash_column_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ named_user_ref_hash_check_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ target_index_namespace_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ exact_pre_definition_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ structural_user_ref_hash_check_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
  });

  it('prior verifier: wrong PRE RPC hash/signature/config fails', () => {
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ rpc_pre_md5_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ rpc_exact_signature_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ rpc_identity_arguments_exact_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PriorProbeResult(
        buildMockP8PriorProbeRow({ rpc_search_path_exact: false, probe_green: false }),
      ).ok,
      false,
    );
  });

  it('post verifier: exact P8 state passes', () => {
    const result = validateP8PostProbeResult(buildMockP8PostProbeRow());
    assert.equal(result.ok, true);
  });

  it('post verifier: history-only delta fails', () => {
    const result = validateP8PostProbeResult(
      buildMockP8PostProbeRow({
        history_prefix_exact: true,
        target_version_count_one: false,
        user_ref_hash_column_exact_shape: false,
        probe_green: false,
      }),
    );
    assert.equal(result.ok, false);
  });

  it('post verifier: missing column/check/index/error-code/RPC predicates fail', () => {
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ user_ref_hash_column_exact_shape: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ exact_user_ref_hash_definition_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ target_index_exact_shape: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ exact_post_definition_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ rpc_post_md5_count_one: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ user_ref_hash_wrong_shape_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ additional_structural_error_code_check_count_zero: false, probe_green: false }),
      ).ok,
      false,
    );
  });

  it('post verifier: overload/config/security mismatch and null field fail closed', () => {
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ rpc_unexpected_overload_zero: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.equal(
      validateP8PostProbeResult(
        buildMockP8PostProbeRow({ rpc_prosecdef: false, probe_green: false }),
      ).ok,
      false,
    );
    assert.throws(() =>
      validateP8PostProbeResult({ rowCount: 1, rows: [{ json_build_object: { probe_green: null } }] }),
    );
  });

  it('validator: extra key fails closed', () => {
    const row = buildMockP8PriorProbeRow();
    const payload = { ...(row.rows[0]!.json_build_object as Record<string, boolean>), extra_key: true };
    assert.throws(() => validateP8PriorProbeResult({ rowCount: 1, rows: [{ json_build_object: payload }] }));
  });

  it('validator: missing key fails closed', () => {
    const payload = Object.fromEntries(
      P8_PRIOR_REQUIRED_FIELDS.filter((field) => field !== 'probe_green').map((field) => [field, true]),
    );
    assert.throws(() => validateP8PriorProbeResult({ rowCount: 1, rows: [{ json_build_object: payload }] }));
  });

  it('validator: row/output-column mismatch fails closed', () => {
    assert.throws(() => validateP8PostProbeResult({ rowCount: 0, rows: [] }));
    assert.throws(() =>
      validateP8PostProbeResult({ rowCount: 1, rows: [{ wrong_column: buildMockP8PostProbeRow().rows[0] }] }),
    );
  });

  it('validator: exact predicate registry field counts', () => {
    assert.equal(P8_PRIOR_REQUIRED_FIELDS.length, 31);
    assert.equal(P8_POST_REQUIRED_FIELDS.length, 35);
  });

  it('in-transaction post probe uses POST_P8 predicate validation without P8 oracle', () => {
    const validation = validateInTransactionPostProbe('P8', buildMockP8PostProbeRow() as never, []);
    assert.equal(validation.ok, true);
    assert.equal(validation.postProbeId, 'POST_P8');
  });

  it('in-transaction post probe mismatch maps to HOLD_P8_POSTCONDITION_MISMATCH semantics', () => {
    const validation = validateInTransactionPostProbe(
      'P8',
      buildMockP8PostProbeRow({ probe_green: false, history_prefix_exact: false }) as never,
      [],
    );
    assert.equal(validation.ok, false);
    assert.equal(HOLD_P8_POSTCONDITION_MISMATCH, 'HOLD_P8_POSTCONDITION_MISMATCH');
  });

  it('runner/plan: dedicated parser exact P8 produces one-step plan', () => {
    const parsed = parseDedicatedP8PlanCliArgs([
      '--dedicated-step',
      'P8',
      '--credential-method',
      'SECURE_STDIN_CONNECTION_CONFIG_v1',
      '--project-ref',
      TARGET.projectRef!,
      '--host-fingerprint-sha256',
      TARGET.hostFingerprintSha256!,
    ]);
    assert.equal('holdReasonCode' in parsed, false);
    const plan = runPreviewRemoteApplyDedicatedPlanCli({
      repoRoot: ROOT,
      repository: REPOSITORY,
      cli: parsed as Exclude<typeof parsed, { holdReasonCode: string }>,
    });
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    if (plan.mode !== 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN') throw new Error('hold');
    assert.equal(plan.steps.length, 1);
    assert.equal(plan.steps[0]?.stepId, 'P8');
    assert.equal(plan.executionAuthorized, false);
  });

  it('runner/plan: invalid dedicated selections rejected', () => {
    for (const argv of [
      ['--dedicated-step', ''],
      ['--dedicated-step', 'ALL'],
      ['--dedicated-step', 'P1,P8'],
      ['--dedicated-step', 'P8', '--dedicated-step', 'P8'],
      ['--dedicated-step', 'P9'],
    ]) {
      const parsed = parseDedicatedP8PlanCliArgs(argv);
      assert.equal('holdReasonCode' in parsed, true);
    }
    assert.equal(validateDedicatedP8StepSelection('').ok, false);
    assert.equal(validateDedicatedP8StepSelection('ALL').ok, false);
    assert.equal(validateDedicatedP8StepSelection('P1,P8').ok, false);
    assert.equal(validateDedicatedP8StepSelectionList(['P8', 'P8']).ok, false);
    assert.equal(validateDedicatedP8StepSelection('P9').ok, false);
  });

  it('runner/plan: expandPlanSelector P8 fails closed', () => {
    assert.throws(() => expandPlanSelector('P8'));
  });

  it('runner execution CLI: P8 binding reaches executor exactly once without network', async () => {
    const envelope = validP8AuthorizationEnvelope();
    const executorCalls: PreviewRemoteExecutionInput[] = [];
    let credentialRead = false;
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', '/ignored.json', '--credential-method', CREDENTIAL_METHOD_IDS[0]!],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => REPOSITORY,
        readAuthorizationDocument: () => envelope,
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            throw new Error('credential read forbidden');
          },
        },
        transportFactory: {
          createClient: () => {
            throw new Error('transport forbidden');
          },
        },
        executePreviewRemoteExecution: async (input) => {
          executorCalls.push(input);
          return {
            ...STATIC_EXECUTION_GATE,
            mode: 'PREVIEW_REMOTE_EXECUTION_HOLD',
            holdReasonCode: 'HOLD_EXECUTION_NOT_AUTHORIZED',
            runtimeEvidence: {
              transportCallCount: 0,
              remoteConnectionAttempted: false,
              sqlExecuted: false,
            },
          } as never;
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(executorCalls.length, 1);
    assert.equal(executorCalls[0]?.selectedStep, 'P8');
    assert.equal(cli.exitCode, 1);
  });

  it('runner execution CLI: credential mismatch never reaches executor', async () => {
    const executorCalls: PreviewRemoteExecutionInput[] = [];
    await runPreviewRemoteExecutionCli(
      [
        '--authorization-document',
        '/ignored.json',
        '--credential-method',
        'TEMP_PGPASSFILE_0600_v1',
      ],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => REPOSITORY,
        readAuthorizationDocument: () => validP8AuthorizationEnvelope(),
        executePreviewRemoteExecution: async (input: PreviewRemoteExecutionInput) => {
          executorCalls.push(input);
          return { mode: 'PREVIEW_REMOTE_EXECUTION_HOLD' } as never;
        },
      },
    );
    assert.equal(executorCalls.length, 0);
  });

  it('runner execution CLI: parsePreviewRemoteExecutionCliArgs accepts credential flag', () => {
    const parsed = parsePreviewRemoteExecutionCliArgs([
      '--authorization-document',
      '/tmp/ignored.json',
      '--credential-method',
      'SECURE_STDIN_CONNECTION_CONFIG_v1',
    ]);
    assert.equal('holdReasonCode' in parsed, false);
  });

  it('transaction outline: exact phase counts for dedicated P8', () => {
    const outline = buildP8DedicatedTransactionPlanOutline();
    assert.equal(outline.beginCount, 1);
    assert.equal(outline.commitCount, 1);
    assert.equal(outline.historyInsertCount, 1);
    assert.equal(outline.p1ThroughP7StatementCount, 0);
    assert.equal(outline.targetStatementCount, 14);
    assert.equal(outline.transactionCount, 1);
    assert.deepEqual(outline.orderedPhases, [
      'BEGIN',
      'PRIOR_PROBE',
      'MUTATION',
      'HISTORY_INSERT',
      'POST_PROBE',
      'COMMIT',
    ]);
  });

  it('normalized statements remain 14 with exact composite SHA', () => {
    const statements = buildP8NormalizedStatements(ROOT);
    assert.equal(statements.length, P8_NORMALIZED_STATEMENT_COUNT);
    assert.equal(P8_NORMALIZED_STREAM_COMPOSITE_SHA256.length, 64);
  });

  it('runtime probe registry binds PRIOR_P8 to P7 and POST_P8 to probe SQL authority', () => {
    validateRuntimeProbeRegistry();
    const prior = getRuntimeProbeById('PRIOR_P8');
    const post = getRuntimeProbeById('POST_P8');
    assert.equal(prior?.kind, 'ORDINARY');
    assert.equal(post?.kind, 'ORDINARY');
    if (!prior || prior.kind !== 'ORDINARY' || !post || post.kind !== 'ORDINARY') throw new Error('missing');
    assert.equal(prior.phase, 'P7');
    assert.equal(
      prior.oracleContractHashSha256,
      '04860bcbfccb948acf5682c0bd4f787b9356b479ef18805834416f2f8e15a8e3',
    );
    assert.equal(post.oracleContractHashSha256, P8_POST_PROBE_SQL_SHA256);
    assert.equal(post.externalSqlAuthority?.sha256, P8_POST_PROBE_SQL_SHA256);
  });

  it('authority matrix bytes/sha bound through transactionNormalizedCore', () => {
    const matrixPath = join(
      ROOT,
      'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json',
    );
    assert.equal(readFileSync(matrixPath).length, AUTHORITY_FILE_EXPECTATIONS.matrix.bytes);
    assert.equal(sha256(matrixPath), AUTHORITY_FILE_EXPECTATIONS.matrix.sha256);
    const matrix = JSON.parse(readFileSync(matrixPath, 'utf8')) as {
      version_matrices: Array<Record<string, unknown>>;
      ack_classifiers: { predicates: Record<string, unknown> };
    };
    const p8 = matrix.version_matrices.find((entry) => entry.label === 'P8');
    assert.ok(p8);
    assert.equal(p8!.prior_oracle_phase, 'P7');
    assert.equal(p8!.next_oracle_phase, 'P8');
    assert.equal(p8!.next_oracle_contract_hash_sha256, P8_POST_PROBE_SQL_SHA256);
    assert.equal(p8!.runtime_probe_status, 'IMPLEMENTED');
    assert.ok(matrix.ack_classifiers.predicates.P8);
  });

  it('dedicated dry-run plan via buildPreviewRemoteApplyPlan remains single P8 step', () => {
    const plan = buildPreviewRemoteApplyPlan({
      repoRoot: ROOT,
      dedicatedStepId: P8_STEP_ID,
      executionEnablement: false,
      credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
      repository: REPOSITORY,
      target: TARGET,
    });
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    if (plan.mode !== 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN') throw new Error('hold');
    assert.equal(plan.steps.length, 1);
    assert.equal(plan.steps[0]?.migration.version, '20260617000001');
    assert.equal(plan.steps[0]?.normalizedStream.statementCount, 14);
    assert.equal(
      plan.steps[0]?.normalizedStream.normalizedStreamCompositeSha256,
      P8_NORMALIZED_STREAM_COMPOSITE_SHA256,
    );
    assert.equal(plan.transportCallCount, 0);
    assert.equal(plan.remoteConnectionAttempted, false);
  });

  it('StepId transport registry includes P8 exactly once', () => {
    const labels = EXPECTED_REVISION7_TRANSPORT_VERSION_IDENTITIES.map((entry) => entry.label);
    assert.equal(labels.filter((label) => label === 'P8').length, 1);
    assert.equal(EXPECTED_P8_VERSION_IDENTITY.version, '20260617000001');
  });
});
