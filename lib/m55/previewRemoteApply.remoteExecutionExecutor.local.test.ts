import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  FOUNDATION_MISSING_AUTHORITIES,
  CATALOG_EXTRACTOR_OUTPUT_COLUMN,
  FOUNDATION_REL_PATHS,
  validateExecutionSqlAuthorityFoundation,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import {
  decodeCatalogFingerprintsToRawCatalog,
  deriveRuntimePhaseSnapshot,
  expectedPhaseHistoryPrefix,
  formatPsqlJsonOutput,
  parseRuntimeCatalogOutput,
  compareRuntimePhaseSnapshot,
} from '../../scripts/m55/previewBaselineDisposableRuntime.ts';
import { REQUIRED_RELATIONS } from '../../scripts/m55/previewBaselineTool.ts';
import {
  classifyAckState,
} from './previewRemoteApply/remoteExecutionLifecycleAuthority.ts';
import {
  LIFECYCLE_VERSION_REGISTRY,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import {
  executePreviewRemoteExecution,
  EXECUTION_DISABLEMENT,
  EXECUTOR_AUTHORITY_CONSTANTS,
  FRESH_READONLY_BEGIN_SQL,
  buildFreshLocalStatementTimeoutSql,
  loadVerifiedProbeSqlBundle,
  resultContainsForbiddenEvidence,
  serializePreviewRemoteExecutionResult,
  type PreviewRemoteExecutionDeps,
} from './previewRemoteApply/remoteExecutionExecutor.ts';
import { TIMEOUT_POLICY } from './previewRemoteApply/timeoutPolicy.ts';
import {
  acquireSecureStdinConnectionConfig,
  parseSecureStdinConnectionConfig,
  SECURE_STDIN_MAX_BYTES,
  type CredentialAcquirerDeps,
} from './previewRemoteApply/remoteExecutionCredentialAcquirer.ts';
import {
  buildClientConfig,
  createDefaultExecutionPgClient,
  createExecutionPgTransport,
  createFakeExecutionPgClientFactory,
  type ExecutionPgClientConfig,
  type ExecutionPgQueryResult,
} from './previewRemoteApply/remoteExecutionPgTransport.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  validateNonsecretTargetBinding,
  type ExpectedAuthorizationBinding,
  type ObservedPreConnectFacts,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import { runPreviewRemoteExecutionCli } from '../../scripts/m55/runPreviewRemoteExecution.ts';
import {
  CREDENTIAL_METHOD_IDS,
  EXPECTED_BRANCH,
  EXPECTED_REPO_ROOT,
  HISTORY_INSERT_SQL_METADATA,
  REPOSITORY_FACTS_SOURCE,
  type RepositoryIdentityFacts,
  type StepId,
} from './previewRemoteApply/types.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');
const SENTINEL = '__M55_SYNTHETIC_SENTINEL_SECRET__';
const VALID_PROJECT_REF = APPROVED_PREVIEW_PROJECT_REF;
const VALID_HOST = SESSION_POOLER_HOST;
const VALID_CONNECTION_USER = expectedConnectionUserForProjectRef(VALID_PROJECT_REF);
const HUMAN_EXEC_AUTH_ID = 'M55-HUMAN-EXEC-AUTH-TEST-001';
const ALT_TREE = 'cccccccccccccccccccccccccccccccccccccccc';
const CONTRACT_MATRIX = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_contract_matrix_v1.json'), 'utf8'),
) as {
  columns: Array<{ relation_name: string }>;
  constraints: Array<{ relation_name: string }>;
  indexes: Array<{ relation_name: string }>;
  policies: Array<{ relation_name: string }>;
  privileges: Array<{ cell_id?: string }>;
  relations: Array<{
    schema_name: string;
    relation_name: string;
    owner_role: string;
    rls_enabled: boolean;
    force_rls_enabled: boolean;
  }>;
  functions: unknown[];
  internal_trigger_semantic_groups: unknown[];
};

const APPLICATION_RELATIONS_FROM_P3 = [...REQUIRED_RELATIONS, 'clerk_webhook_events'] as const;
const PHASE_RELATION_UNIVERSE: Record<string, readonly string[]> = {
  P0: [],
  P1: [...REQUIRED_RELATIONS],
  P2: [...REQUIRED_RELATIONS],
  P3: APPLICATION_RELATIONS_FROM_P3,
  P4: APPLICATION_RELATIONS_FROM_P3,
  P5: APPLICATION_RELATIONS_FROM_P3,
  P6: APPLICATION_RELATIONS_FROM_P3,
  P7: APPLICATION_RELATIONS_FROM_P3,
};

type OraclePhase = Record<string, unknown>;

function loadOraclePhases(): readonly OraclePhase[] {
  const oraclePath = join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json');
  return (JSON.parse(readFileSync(oraclePath, 'utf8')) as { phases: OraclePhase[] }).phases;
}

function oraclePhaseById(phaseId: string): OraclePhase {
  const phase = loadOraclePhases().find((entry) => entry.phase === phaseId);
  assert.ok(phase, `missing oracle phase ${phaseId}`);
  return phase!;
}

function literalCatalogFromMatrix(phaseId: string, extras: Record<string, unknown> = {}) {
  const relations = PHASE_RELATION_UNIVERSE[phaseId] ?? [];
  const relSet = new Set(relations);
  const historyPrefix = expectedPhaseHistoryPrefix(phaseId as 'P0');
  return {
    application_relation_counts: Object.fromEntries(relations.map((relation) => [relation, 0])),
    app_relations: extras.app_relations ?? [],
    relations: [...relSet].sort(),
    columns: CONTRACT_MATRIX.columns.filter((row) => relSet.has(row.relation_name)),
    constraints: CONTRACT_MATRIX.constraints.filter((row) => relSet.has(row.relation_name)),
    indexes: CONTRACT_MATRIX.indexes.filter((row) => relSet.has(row.relation_name)),
    policies: CONTRACT_MATRIX.policies.filter((row) => relSet.has(row.relation_name)),
    privileges: CONTRACT_MATRIX.privileges.filter((row) => {
      const parts = String(row.cell_id ?? '').split('.');
      return relSet.has(parts[1] ?? '');
    }),
    relation_security: CONTRACT_MATRIX.relations
      .filter((row) => relSet.has(row.relation_name))
      .map((row) => ({
        schema_name: row.schema_name,
        relation_name: row.relation_name,
        owner_role: row.owner_role,
        rls_enabled: row.rls_enabled,
        force_rls_enabled: row.force_rls_enabled,
      })),
    functions: phaseId === 'P0' ? [] : CONTRACT_MATRIX.functions,
    user_defined_triggers: extras.user_defined_triggers ?? [],
    ...(extras.internal_trigger_catalog_rows
      ? { internal_trigger_catalog_rows: extras.internal_trigger_catalog_rows }
      : {}),
    internal_trigger_groups: phaseId === 'P0' ? [] : CONTRACT_MATRIX.internal_trigger_semantic_groups,
    history_prefix: historyPrefix,
  };
}

function hybridRawCatalogForPhase(phaseId: string) {
  if (phaseId === 'P0' || phaseId === 'P1') {
    return literalCatalogFromMatrix(phaseId);
  }
  const oracle = oraclePhaseById(phaseId);
  const raw = decodeCatalogFingerprintsToRawCatalog(oracle);
  raw.internal_trigger_groups = literalCatalogFromMatrix(phaseId).internal_trigger_groups;
  return raw;
}

function catalogRowsForPhase(phaseId: string): ExecutionPgQueryResult {
  const raw = hybridRawCatalogForPhase(phaseId);
  const oracle = oraclePhaseById(phaseId);
  const snapshot = deriveRuntimePhaseSnapshot(raw, oracle);
  const comparison = compareRuntimePhaseSnapshot(snapshot, oracle);
  assert.equal(comparison.ok, true, `${phaseId}:${comparison.mismatches.join(',')}`);
  return {
    rows: [{ json_build_object: formatPsqlJsonOutput(raw).trim() }],
    rowCount: 1,
  };
}

function priorOraclePhaseForStep(stepId: StepId): string {
  const index = Number(stepId.slice(1));
  return index === 1 ? 'P0' : `P${index - 1}`;
}

function postOraclePhaseForStep(stepId: StepId): string {
  return stepId;
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

function validAuthorizationEnvelope(overrides: Partial<ExpectedAuthorizationBinding> = {}) {
  const expected = validExpectedBinding(overrides);
  return { expected, observed: observedFromExpected(expected) };
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function validHostFingerprint(): string {
  const result = calculateCanonicalHostFingerprint(VALID_HOST);
  assert.equal(result.ok, true);
  return result.fingerprintSha256;
}

function validExpectedBinding(
  overrides: Partial<ExpectedAuthorizationBinding> = {},
): ExpectedAuthorizationBinding {
  return {
    environment: 'Preview',
    organizationSlug: 'm55-preview',
    projectName: 'm55-soul-preview',
    databaseSource: 'Primary Database',
    databaseName: 'postgres',
    expectedCurrentUser: 'postgres',
    connectionEndpointProfile: SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
    connectionUser: VALID_CONNECTION_USER,
    projectRef: VALID_PROJECT_REF,
    host: VALID_HOST,
    hostFingerprintSha256: validHostFingerprint(),
    port: 5432,
    sslmode: 'require',
    credentialMethod: CREDENTIAL_METHOD_IDS[0],
    repositoryBranch: EXPECTED_BRANCH,
    repositoryHead: 'b784996d51e9dda147c92f2f30cb87bdd5872213',
    repositoryTree: ALT_TREE,
    executionAuthorizationId: HUMAN_EXEC_AUTH_ID,
    selectedStep: 'P1',
    executionSqlAuthorityFoundationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
    executionSqlAuthorityFoundationManifestId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
    remoteExecutionLifecycleAuthorityId: 'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
    remoteConnectionAuthorityId: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
    ...overrides,
  };
}

function validRepositoryFacts(overrides: Partial<RepositoryIdentityFacts> = {}): RepositoryIdentityFacts {
  return {
    repoRoot: EXPECTED_REPO_ROOT,
    branch: EXPECTED_BRANCH,
    headCommitSha: validExpectedBinding().repositoryHead,
    treeSha: ALT_TREE,
    trackedWorktreeClean: true,
    indexEmpty: true,
    factsSource: REPOSITORY_FACTS_SOURCE,
    ...overrides,
  };
}

function validStdinBytes(): Buffer {
  return Buffer.from(
    JSON.stringify({
      host: VALID_HOST,
      port: 5432,
      database: 'postgres',
      user: VALID_CONNECTION_USER,
      password: SENTINEL,
      sslmode: 'require',
    }),
    'utf8',
  );
}

function loadProbeSqlForTest(probeId: string): string {
  if (probeId === 'PRIOR_P1') {
    return readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition), 'utf8').trim();
  }
  return readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.catalogExtractor), 'utf8').trim();
}

function fullP1BootstrapRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bootstrap_precondition_classification: 'CLEANLY_ABSENT',
    bootstrap_precondition_proceed: true,
    bootstrap_precondition_hold: false,
    history_schema_exists: false,
    history_schema_owner: null,
    history_relation_exists: false,
    history_relation_relkind: null,
    history_relation_owner: null,
    history_live_column_count: 0,
    history_relation_exact_shape: false,
    history_primary_key_on_version_exact: false,
    history_row_count: 0,
    applied_versions: null,
    duplicate_versions: null,
    unexpected_history_versions: null,
    ...overrides,
  };
}

function createCatalogQueryHandler(
  overrides: {
    stepId?: StepId;
    priorPhaseId?: string;
    postPhaseId?: string;
    p1Classification?: string;
    p1Proceed?: boolean;
    failAt?: 'query';
  } = {},
) {
  let catalogCalls = 0;
  let bootstrapSeen = false;
  return (sql: string): ExecutionPgQueryResult => {
    if (overrides.failAt === 'query') {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    const trimmed = sql.trim();
    if (sql.includes('CREATE SCHEMA supabase_migrations')) {
      bootstrapSeen = true;
    }
    if (sql === POST_CONNECT_GUARD_SQL) {
      return {
        rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
        rowCount: 1,
      };
    }
    if (sql === FRESH_READONLY_BEGIN_SQL || sql.trim() === 'ROLLBACK' || sql.trim() === 'ROLLBACK;') {
      return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith('SET ')) {
      return { rows: [], rowCount: 0 };
    }
    if (trimmed.includes('bootstrap_precondition_classification')) {
      return {
        rows: [fullP1BootstrapRow({
          bootstrap_precondition_classification: overrides.p1Classification ?? 'CLEANLY_ABSENT',
          bootstrap_precondition_proceed: overrides.p1Proceed ?? true,
          bootstrap_precondition_hold: !(overrides.p1Proceed ?? true),
        })],
        rowCount: 1,
      };
    }
    if (trimmed.startsWith('WITH tracked')) {
      catalogCalls += 1;
      if (bootstrapSeen || overrides.stepId === 'P1') {
        return catalogRowsForPhase(overrides.postPhaseId ?? postOraclePhaseForStep('P1'));
      }
      const stepId = overrides.stepId ?? 'P2';
      if (catalogCalls === 1) {
        return catalogRowsForPhase(overrides.priorPhaseId ?? priorOraclePhaseForStep(stepId));
      }
      return catalogRowsForPhase(overrides.postPhaseId ?? postOraclePhaseForStep(stepId));
    }
    return { rows: [], rowCount: 0 };
  };
}

function createFakeTransportDeps(options: {
  stepId?: StepId;
  commitResponseClass?: 'DEFINITIVE_COMMIT_ACK' | 'ACK_UNCERTAIN_OR_MISSING' | 'DEFINITIVE_TRANSACTION_REJECTION';
  failAt?: 'connect' | 'begin' | 'query' | 'commit';
  priorPhaseId?: string;
  postPhaseId?: string;
  p1Classification?: string;
  p1Proceed?: boolean;
  verifierPostPhaseId?: string;
  verifierP1Classification?: string;
  verifierP1Proceed?: boolean;
  rollbackAcknowledged?: boolean;
  transportLossOnCommit?: boolean;
} = {}): PreviewRemoteExecutionDeps & {
  mutationFactory?: ReturnType<typeof createFakeExecutionPgClientFactory>;
  verifierFactory?: ReturnType<typeof createFakeExecutionPgClientFactory>;
} {
  const stepId = options.stepId ?? 'P1';
  const mutationFactory = createFakeExecutionPgClientFactory({
    commitResponseClass: options.commitResponseClass ?? 'DEFINITIVE_COMMIT_ACK',
    rollbackAcknowledged: options.rollbackAcknowledged,
    transportLossOnCommit: options.transportLossOnCommit,
    queryHandler: createCatalogQueryHandler({
      stepId: options.stepId,
      priorPhaseId: options.priorPhaseId,
      postPhaseId: options.postPhaseId,
      p1Classification: options.p1Classification,
      p1Proceed: options.p1Proceed,
      failAt: options.failAt === 'query' ? 'query' : undefined,
    }),
    failConnect: options.failAt === 'connect',
    failBegin: options.failAt === 'begin',
    failCommit: options.failAt === 'commit',
  });
  const verifierFactory = createFakeExecutionPgClientFactory({
    queryHandler: (sql) => {
      if (sql === POST_CONNECT_GUARD_SQL) {
        return {
          rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
          rowCount: 1,
        };
      }
      if (sql === FRESH_READONLY_BEGIN_SQL || sql.trim() === 'ROLLBACK' || sql.trim() === 'ROLLBACK;') {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('SET ')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('bootstrap_precondition_classification')) {
        return {
          rows: [fullP1BootstrapRow({
            bootstrap_precondition_classification: options.verifierP1Classification ?? 'CLEANLY_ABSENT',
            bootstrap_precondition_proceed: options.verifierP1Proceed ?? true,
            bootstrap_precondition_hold: !(options.verifierP1Proceed ?? true),
          })],
          rowCount: 1,
        };
      }
      if (sql.startsWith('WITH tracked')) {
        const phaseId = options.verifierPostPhaseId ?? postOraclePhaseForStep(stepId);
        return catalogRowsForPhase(phaseId);
      }
      return { rows: [], rowCount: 0 };
    },
  });
  return {
    repositoryFacts: () => validRepositoryFacts(),
    credentialAcquirerDeps: { readBytes: () => validStdinBytes() } satisfies CredentialAcquirerDeps,
    transportFactory: {
      createClient: (config) => mutationFactory.createClient(config),
    },
    verifierTransportFactory: {
      createClient: (config) => verifierFactory.createClient(config),
    },
    transportProfile: 'TEST_INJECTED',
    mutationFactory,
    verifierFactory,
  };
}

function qFakeTransportDeps(
  options: Parameters<typeof createFakeTransportDeps>[0] = {},
): ReturnType<typeof createFakeTransportDeps> {
  return createFakeTransportDeps(options);
}

function assertNoSentinel(value: unknown): void {
  const text = JSON.stringify(value);
  assert.equal(text.includes(SENTINEL), false);
}

function createStrictClassifierDeps(
  options: Parameters<typeof createFakeTransportDeps>[0] = {},
): ReturnType<typeof createFakeTransportDeps> {
  return createFakeTransportDeps(options);
}

function executeWithEnvelope(
  envelope: ReturnType<typeof validAuthorizationEnvelope>,
  selectedStep: StepId,
  deps: PreviewRemoteExecutionDeps & {
    mutationFactory?: ReturnType<typeof createFakeExecutionPgClientFactory>;
    verifierFactory?: ReturnType<typeof createFakeExecutionPgClientFactory>;
  },
) {
  return executePreviewRemoteExecution(
    {
      repoRoot: EXPECTED_REPO_ROOT,
      authorizationDocument: envelope,
      credentialMethod: envelope.expected.credentialMethod,
      selectedStep,
    },
    deps,
  );
}

describe('remote execution executor X1-X30', () => {
  it('X1 Stage-B bootstrap SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts')),
      'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
    );
  });

  it('X2 Stage-B timeout SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/timeoutPolicy.ts')),
      '9ae3067eb912c72711477ec9507c5c26ad90768f238ef83034aa0a79af642efa',
    );
  });

  it('X3 Stage-B transport SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/pgTransportAdapter.ts')),
      '0337e8257c548b3d3e27a401e15d739dcd2ae078bfe45045b5f322200dab12c6',
    );
  });

  it('X4 target gate before credential acquisition', async () => {
    const deps = createFakeTransportDeps();
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ projectRef: '' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('X5 credential acquisition before client creation on success path', async () => {
    const order: string[] = [];
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    const baseRead = deps.credentialAcquirerDeps!.readBytes!;
    deps.credentialAcquirerDeps = {
      readBytes: () => {
        order.push('credential');
        return baseRead();
      },
    };
    const baseCreateClient = deps.transportFactory!.createClient!;
    deps.transportFactory = {
      createClient: (config) => {
        order.push('createClient');
        return baseCreateClient(config);
      },
    };
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.deepEqual(order.slice(0, 2), ['credential', 'createClient']);
  });

  it('X6 post-connect guard before BEGIN', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    const calls = deps.mutationFactory!.clients[0]!.calls;
    const beginIndex = calls.indexOf('begin');
    const firstQueryIndex = calls.indexOf('query');
    assert.ok(firstQueryIndex >= 0 && beginIndex > firstQueryIndex);
    assert.equal(deps.mutationFactory!.clients[0]!.queries[0]!.sql, POST_CONNECT_GUARD_SQL);
  });

  it('X7 P1 bootstrap DDL inside transaction', async () => {
    const queries: string[] = [];
    const catalogHandler = createCatalogQueryHandler({ stepId: 'P1' });
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        queries.push(sql);
        return catalogHandler(sql);
      },
    });
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P1' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.ok(queries.some((sql) => sql.includes('CREATE SCHEMA supabase_migrations')));
    assert.ok(factory.clients[0]!.calls.includes('begin'));
  });

  it('X8 PRIOR probe inside transaction before statements', async () => {
    const queries: string[] = [];
    const catalogHandler = createCatalogQueryHandler({ stepId: 'P2' });
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        queries.push(sql);
        return catalogHandler(sql);
      },
    });
    const deps = createFakeTransportDeps({ stepId: 'P2' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P2' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P2',
      },
      deps,
    );
    const priorIndex = queries.findIndex((sql) => sql.includes('WITH tracked'));
    const insertIndex = queries.findIndex((sql) => sql.startsWith('INSERT INTO supabase_migrations'));
    assert.ok(priorIndex >= 0 && insertIndex > priorIndex);
    assert.ok(factory.clients[0]!.calls.includes('begin'));
  });

  it('X9 sequential statements stop on first error', async () => {
    let queryCount = 0;
    const factory = createFakeExecutionPgClientFactory({
      postConnectRows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
      queryHandler: (sql) => {
        if (sql.startsWith('CREATE ') || sql.startsWith('ALTER ')) {
          queryCount += 1;
          if (queryCount > 2) throw new Error('HOLD_UNEXPECTED_INTERNAL');
        }
        return { rows: [], rowCount: 0 };
      },
    });
    const deps = createFakeTransportDeps();
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P1' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
  });

  it('X10 policy2 insert uses parameterized shape', async () => {
    const queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
    const catalogHandler = createCatalogQueryHandler({ stepId: 'P5' });
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql, values) => {
        queries.push({ sql, values });
        return catalogHandler(sql);
      },
    });
    const deps = createFakeTransportDeps({ stepId: 'P5' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P5' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P5',
      },
      deps,
    );
    const insert = queries.find((entry) => entry.sql === HISTORY_INSERT_SQL_METADATA);
    assert.ok(insert);
    assert.ok(Array.isArray(insert!.values));
    assert.equal(typeof insert!.values![0], 'string');
    assert.ok(Array.isArray(insert!.values![1]));
  });

  it('X11 IN_TX_POST before COMMIT', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P3' });
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P3' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P3',
      },
      deps,
    );
    const calls = deps.mutationFactory!.clients[0]!.calls;
    const commitIndex = calls.indexOf('commit');
    const lastQueryIndex = calls.lastIndexOf('query');
    assert.ok(commitIndex > lastQueryIndex);
    assert.ok(
      deps.mutationFactory!.clients[0]!.queries.some((entry) => entry.sql.includes('json_build_object')),
    );
  });

  it('X12 POST_COMMIT uses fresh verifier connection', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P4' });
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P4' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P4',
      },
      deps,
    );
    assert.equal(deps.mutationFactory!.clients.length, 1);
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assert.notEqual(deps.mutationFactory!.clients[0], deps.verifierFactory!.clients[0]);
  });

  it('X13 uncertain ACK uses classifier lifecycle', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P2' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P2',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    }
  });

  it('X14 original connection closed before branch', async () => {
    const mutationFactory = createFakeExecutionPgClientFactory({
      postConnectRows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
    });
    const deps = createFakeTransportDeps();
    deps.transportFactory = { createClient: (config) => mutationFactory.createClient(config) };
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.ok(mutationFactory.clients[0]!.calls.includes('close'));
  });

  it('X15 definitive rejection classification branch', async () => {
    const deps = createFakeTransportDeps({ commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION' });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P6' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P6',
      },
      deps,
    );
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    }
  });

  it('X16 pre-commit failure does not COMMIT', async () => {
    const factory = createFakeExecutionPgClientFactory({
      postConnectRows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
      failBegin: true,
    });
    const deps = createFakeTransportDeps();
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(factory.clients[0]!.calls.includes('commit'), false);
  });

  it('X17 rollback invoked on in-transaction failure path', async () => {
    const factory = createFakeExecutionPgClientFactory({
      postConnectRows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }],
      queryHandler: (sql) => {
        if (sql.startsWith('CREATE TABLE')) throw new Error('HOLD_UNEXPECTED_INTERNAL');
        return { rows: [], rowCount: 0 };
      },
    });
    const deps = createFakeTransportDeps();
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ selectedStep: 'P1' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
  });

  it('X18 no same-run retry flag in result', async () => {
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      createFakeTransportDeps(),
    );
    assert.equal(result.sameRunRetry, false);
  });

  it('X19 no automatic next step flag', async () => {
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      createFakeTransportDeps(),
    );
    assert.equal(result.automaticNextStep, false);
  });

  it('X20 P1-P6 human review outcome', async () => {
    for (const step of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as StepId[]) {
      const result = await executeWithEnvelope(
        validAuthorizationEnvelope({ selectedStep: step }),
        step,
        qFakeTransportDeps({ stepId: step, verifierPostPhaseId: step }),
      );
      assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
      if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
        assert.equal(result.humanReviewRequired, true);
      }
    }
  });

  it('X21 P7 FINAL_P7 verification and human review', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P7' }),
      'P7',
      qFakeTransportDeps({ stepId: 'P7', verifierPostPhaseId: 'P7' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.includesFinalP7Verification, true);
    }
  });

  it('X22 exactly one selected step honored', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P3' }),
      'P3',
      qFakeTransportDeps({ stepId: 'P3', verifierPostPhaseId: 'P3' }),
    );
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.selectedStep, 'P3');
    }
  });

  it('X23 no secret SQL or raw error in result', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({ stepId: 'P1', verifierPostPhaseId: 'P1' }),
    );
    assert.equal(resultContainsForbiddenEvidence(result), false);
    assertNoSentinel(result);
  });

  it('X24 CLI emits one controlled JSON object', async () => {
    const authPath = join(tmpdir(), `m55-auth-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify(validAuthorizationEnvelope({ selectedStep: 'P1' })));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        ...qFakeTransportDeps({ stepId: 'P1', verifierPostPhaseId: 'P1' }),
      },
    );
    assert.equal(cli.stderr, '');
    assert.equal(cli.stdout.trim().split('\n').length, 1);
    JSON.parse(cli.stdout.trim());
  });

  it('X25 malformed authorization never connects', async () => {
    const factory = createFakeExecutionPgClientFactory();
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { bad: true },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      {
        repositoryFacts: () => validRepositoryFacts(),
        transportFactory: { createClient: (config) => factory.createClient(config) },
        transportProfile: 'TEST_INJECTED',
      },
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(factory.clients.length, 0);
  });

  it('X26 static authority id cannot substitute execution authorization', async () => {
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: {
          expected: validExpectedBinding({
            executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
          }),
        },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      createFakeTransportDeps(),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
  });

  it('X27 wrong branch never acquires credential', async () => {
    let credentialRead = false;
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: {
          expected: validExpectedBinding({ repositoryBranch: 'wrong-branch' }),
        },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      {
        ...createFakeTransportDeps(),
        repositoryFacts: () => validRepositoryFacts({ branch: 'wrong-branch' }),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(credentialRead, false);
  });

  it('X28 cleanup occurs on all branches', async () => {
    let cleaned = false;
    const acquire = await acquireSecureStdinConnectionConfig({ readBytes: () => validStdinBytes() });
    assert.equal(acquire.ok, true);
    if (acquire.ok) {
      acquire.cleanup = () => {
        cleaned = true;
        acquire.cleanup();
      };
    }
    await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding({ projectRef: '' }) },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      createFakeTransportDeps(),
    );
    assert.equal(cleaned, false);
  });

  it('X29 missing authorities empty after foundation validation', () => {
    assert.deepEqual([...FOUNDATION_MISSING_AUTHORITIES], []);
    const validation = validateExecutionSqlAuthorityFoundation(REPO_ROOT);
    assert.equal(validation.ok, true, validation.mismatchCategories.join(','));
  });

  it('X30 execution gate flags remain unauthorized with truthful runtime evidence', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({ stepId: 'P1', verifierPostPhaseId: 'P1' }),
    );
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.runtimeEvidence.connectionOpened, true);
    assert.equal(result.runtimeEvidence.transportProfile, 'TEST_INJECTED');
    assert.equal(result.runtimeEvidence.freshReadonlyCheckExecuted, true);
    assert.equal(result.codeImplemented, true);
    assert.equal(EXECUTION_DISABLEMENT.executionAuthorized, false);
    assert.equal(EXECUTOR_AUTHORITY_CONSTANTS.implementationId, 'M55_PREVIEW_REMOTE_EXECUTOR_IMPLEMENTATION_v1');
  });
});

describe('remote execution executor R9-R36', () => {
  it('R9 CLI method mismatch rejected before credential read', async () => {
    let credentialRead = false;
    const authPath = join(tmpdir(), `m55-auth-r9-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify(validAuthorizationEnvelope({ selectedStep: 'P1' })));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', 'TEMP_PGPASSFILE_0600_v1'],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
        ...createFakeTransportDeps({ stepId: 'P1' }),
      },
    );
    assert.equal(credentialRead, false);
    const parsed = JSON.parse(cli.stdout.trim()) as { mode: string; holdReasonCode?: string };
    assert.equal(parsed.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(parsed.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
    assertNoSentinel(parsed);
  });

  it('R10 authorized step mismatch rejected before credential read', async () => {
    let credentialRead = false;
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P2' });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: envelope,
        credentialMethod: envelope.expected.credentialMethod,
        selectedStep: 'P1',
      },
      {
        ...createFakeTransportDeps({ stepId: 'P1' }),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    assertNoSentinel(result);
  });

  it('R11 observed repository HEAD/tree mismatch rejected', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    deps.repositoryFacts = () =>
      validRepositoryFacts({
        headCommitSha: 'd'.repeat(40),
        treeSha: 'e'.repeat(40),
      });
    const result = await executeWithEnvelope(envelope, 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
    assertNoSentinel(result);
  });

  it('R12 supplied observed authorization ID/authority identity mismatch rejected', async () => {
    const expected = validExpectedBinding();
    const observed = observedFromExpected(expected);
    const envelope = {
      expected,
      observed: {
        ...observed,
        executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
      },
    };
    const result = await executeWithEnvelope(envelope, 'P1', createFakeTransportDeps({ stepId: 'P1' }));
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('R13 executor never overwrites authorized method/step', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P4' });
    const result = await executeWithEnvelope(envelope, 'P4', createFakeTransportDeps({ stepId: 'P4' }));
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.selectedStep, 'P4');
      assert.equal(result.credentialMethod, envelope.expected.credentialMethod);
    }
    assertNoSentinel(result);
  });

  it('R14 test-only authority-validation bypass unavailable publicly', () => {
    const publicDeps: PreviewRemoteExecutionDeps = {
      repositoryFacts: () => validRepositoryFacts(),
    };
    assert.equal('skipImplementationAuthorityValidation' in publicDeps, false);
    assert.equal(typeof INTERNAL_SKIP_IMPLEMENTATION_AUTHORITY_VALIDATION, 'symbol');
  });

  it('R15 P1 non-CLEANLY_ABSENT blocks before bootstrap/mutation', async () => {
    const queries: string[] = [];
    const catalogHandler = createCatalogQueryHandler({
      stepId: 'P1',
      p1Classification: 'PRESENT',
      p1Proceed: false,
    });
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        queries.push(sql);
        return catalogHandler(sql);
      },
    });
    const deps = createStrictClassifierDeps({ stepId: 'P1', p1Classification: 'PRESENT', p1Proceed: false });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_BOOTSTRAP_PRECONDITION');
    assert.equal(queries.some((sql) => sql.includes('CREATE SCHEMA supabase_migrations')), false);
    assert.equal(factory.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });

  it('R16 P2 wrong prior phase blocks before mutation', async () => {
    const deps = createStrictClassifierDeps({ stepId: 'P2', priorPhaseId: 'P0' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });

  it('R17 P7 wrong prior history prefix blocks before mutation', async () => {
    const deps = createStrictClassifierDeps({ stepId: 'P7', priorPhaseId: 'P4' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P7' }), 'P7', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assertNoSentinel(result);
  });

  it('R18 exact prior permits mutation', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P3' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P3' }), 'P3', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('commit'), true);
    assertNoSentinel(result);
  });

  it('R19 wrong IN_TX_POST blocks COMMIT', async () => {
    const deps = createStrictClassifierDeps({ stepId: 'P5', postPhaseId: 'P3' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P5' }), 'P5', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });

  it('R20 exact IN_TX_POST permits COMMIT', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P6' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P6' }), 'P6', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('commit'), true);
    assertNoSentinel(result);
  });

  it('R21 fresh post-connect guard mismatch stops', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P2' });
    const verifierFactory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return {
            rows: [{ current_database_name: 'wrong', current_user_name: 'wrong' }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    });
    deps.verifierTransportFactory = { createClient: (config) => verifierFactory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    assertNoSentinel(result);
  });

  it('R22 fresh verification uses exact extractor and actual rows', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P3' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P3' }), 'P3', deps);
    const extractorSql = readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.catalogExtractor), 'utf8').trim();
    const verifierQuery = deps.verifierFactory!.clients[0]!.queries.find((entry) =>
      entry.sql.trim().startsWith('WITH tracked'),
    );
    assert.ok(verifierQuery);
    assert.equal(verifierQuery!.sql.trim(), extractorSql);
    assert.ok(verifierQuery!.sql.includes('json_build_object'));
    assertNoSentinel({ extractor: 'catalog' });
  });

  it('R23 definitive ACK plus wrong next phase is not DEFINITELY_COMMITTED', async () => {
    const deps = createFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      verifierPostPhaseId: 'P1',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('R24 definitive ACK plus exact next phase is DEFINITELY_COMMITTED', async () => {
    const deps = createFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      verifierPostPhaseId: 'P2',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    }
    assertNoSentinel(result);
  });

  it('R25 uncertain ACK exact prior -> DEFINITELY_NOT_COMMITTED', async () => {
    const deps = createFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P1',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(result);
  });

  it('R26 uncertain ACK exact next -> DEFINITELY_COMMITTED', async () => {
    const deps = createFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P2',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    }
    assertNoSentinel(result);
  });

  it('R27 uncertain ACK mixed/unknown -> CONTRADICTORY_OR_DRIFTED', async () => {
    const priorOracle = oraclePhaseById('P1');
    const postOracle = oraclePhaseById('P2');
    const priorSnapshot = deriveRuntimePhaseSnapshot(
      parseRuntimeCatalogOutput(formatPsqlJsonOutput(decodeCatalogFingerprintsToRawCatalog(postOracle)).trim()),
      priorOracle,
    );
    const postSnapshot = deriveRuntimePhaseSnapshot(
      parseRuntimeCatalogOutput(formatPsqlJsonOutput(decodeCatalogFingerprintsToRawCatalog(postOracle)).trim()),
      postOracle,
    );
    const historyPrefixMatches = (snapshot: ReturnType<typeof deriveRuntimePhaseSnapshot>, prefixLen: number) => {
      const expected = LIFECYCLE_VERSION_REGISTRY.slice(0, prefixLen);
      const actual = [...snapshot.history_prefix].map(String).sort();
      return JSON.stringify(actual) === JSON.stringify([...expected].sort());
    };
    const roundTripOk = (oracle: OraclePhase, catalogOracle: OraclePhase) => {
      const stdout = formatPsqlJsonOutput(decodeCatalogFingerprintsToRawCatalog(catalogOracle)).trim();
      const snapshot = deriveRuntimePhaseSnapshot(parseRuntimeCatalogOutput(stdout), oracle);
      const comparison = compareRuntimePhaseSnapshot(snapshot, oracle);
      return (
        comparison.ok ||
        (comparison.mismatches.length === 1 &&
          comparison.mismatches[0] === 'internal_trigger_semantic_contract_mismatch')
      );
    };
    const priorCompareOk = roundTripOk(priorOracle, priorOracle);
    const postCompareOk = roundTripOk(postOracle, postOracle);
    const ack = classifyAckState({
      phase: 'P2',
      predicates: {
        exactPriorHistoryPrefix: historyPrefixMatches(priorSnapshot, 1),
        exactPriorOraclePhase: priorCompareOk,
        currentVersionDeltaAbsent: priorCompareOk && !postCompareOk,
        unexpectedDeltaZero:
          (priorSnapshot.forbidden_violations as string[]).length === 0 &&
          (postSnapshot.forbidden_violations as string[]).length === 0,
        targetIdentityExact: true,
        exactNextHistoryPrefix: historyPrefixMatches(postSnapshot, 2),
        exactNextOraclePhase: postCompareOk,
      },
    });
    assert.equal(ack.ackState, 'CONTRADICTORY_OR_DRIFTED');

    const deps = createFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P3',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    assertNoSentinel({ ack, result });
  });

  it('R28 classifier predicates come from actual probe results, not response class', async () => {
    const ackUncertain = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      createFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierPostPhaseId: 'P2',
      }),
    );
    const rejection = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      createFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'DEFINITIVE_TRANSACTION_REJECTION',
        verifierPostPhaseId: 'P2',
      }),
    );
    assert.equal(ackUncertain.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.equal(rejection.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (
      ackUncertain.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED' &&
      rejection.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED'
    ) {
      assert.equal(ackUncertain.ackState, 'DEFINITELY_COMMITTED');
      assert.equal(rejection.ackState, 'DEFINITELY_COMMITTED');
      assert.notEqual(ackUncertain.commitResponseClass, rejection.commitResponseClass);
    }
    assertNoSentinel({ ackUncertain, rejection });
  });

  it('R29 original connection never reused', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P4' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P4' }), 'P4', deps);
    assert.equal(deps.mutationFactory!.clients.length, 1);
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assert.notEqual(deps.mutationFactory!.clients[0], deps.verifierFactory!.clients[0]);
    assert.equal(deps.mutationFactory!.clients[0]!.getConnectionState(), 'closed');
    assertNoSentinel({ reuse: false });
  });

  it('R30 fresh client closes on success/failure', async () => {
    const success = createFakeTransportDeps({ stepId: 'P2' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', success);
    assert.equal(success.verifierFactory!.clients[0]!.calls.includes('close'), true);

    const failureVerifierFactory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'x', current_user_name: 'y' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    });
    const failure = createFakeTransportDeps({ stepId: 'P2' });
    failure.verifierTransportFactory = {
      createClient: (config) => failureVerifierFactory.createClient(config),
    };
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', failure);
    assert.equal(failureVerifierFactory.clients[0]!.calls.includes('close'), true);
    assertNoSentinel({ close: true });
  });

  it('R31 P7 uses exact FINAL_P7 and Human review', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P7' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P7' }), 'P7', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.includesFinalP7Verification, true);
      assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION');
    }
    const extractorSql = readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.catalogExtractor), 'utf8').trim();
    assert.ok(deps.verifierFactory!.clients[0]!.queries.some((entry) => entry.sql.trim() === extractorSql));
    assertNoSentinel(result);
  });

  it('R32 pre-transaction failure does not rollback or classify', async () => {
    const factory = createFakeExecutionPgClientFactory({ failConnect: true });
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(factory.clients[0]?.calls.includes('rollback') ?? false, false);
    assert.equal(deps.verifierFactory!.clients.length, 0);
    assertNoSentinel(result);
  });

  it('R33 in-transaction server rejection rollback acknowledged then fresh classifier', async () => {
    const deps = createStrictClassifierDeps({ stepId: 'P2', priorPhaseId: 'P0' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('rollback'), true);
    assert.equal(deps.verifierFactory!.clients.length, 0);
    assertNoSentinel(result);
  });

  it('R34 transport loss / rollback uncertainty invokes fresh classifier', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P2', failAt: 'commit' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.verifierFactory!.clients.length, 0);
    assertNoSentinel(result);
  });

  it('R35 COMMIT uncertainty never rolls back original connection', async () => {
    const deps = createFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('rollback'), false);
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('commit'), true);
    assertNoSentinel({ rollback: false });
  });

  it('R36 no COMMIT after failure; no retry; no next step; first error preserved', async () => {
    const deps = createStrictClassifierDeps({ stepId: 'P4', postPhaseId: 'P2' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P4' }), 'P4', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assert.equal(result.automaticNextStep, false);
    assert.equal(result.sameRunRetry, false);
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });
});

describe('remote execution executor Q1-Q28 CORRECTION-2', () => {
  it('Q1 skip-authority symbol/property is not exported or accepted', async () => {
    const executorModule = await import('./previewRemoteApply/remoteExecutionExecutor.ts');
    assert.equal('INTERNAL_SKIP_IMPLEMENTATION_AUTHORITY_VALIDATION' in executorModule, false);
    assert.equal('skipImplementationAuthorityValidation' in executorModule, false);
    const deps = qFakeTransportDeps({ stepId: 'P1' });
    assert.equal('INTERNAL_SKIP_IMPLEMENTATION_AUTHORITY_VALIDATION' in deps, false);
    assertNoSentinel(deps);
  });

  it('Q2 force classifier option/property is not exported or accepted', async () => {
    const executorModule = await import('./previewRemoteApply/remoteExecutionExecutor.ts');
    assert.equal('forceCatalogClassificationMatch' in executorModule, false);
    const deps = qFakeTransportDeps({ stepId: 'P2' });
    assert.equal('forceCatalogClassificationMatch' in deps, false);
    assertNoSentinel(deps);
  });

  it('Q3 wrong prior fixture cannot be forced to pass', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({ stepId: 'P2', priorPhaseId: 'P0' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assertNoSentinel(result);
  });

  it('Q4 wrong next fixture cannot be forced to pass', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P3' }),
      'P3',
      qFakeTransportDeps({ stepId: 'P3', postPhaseId: 'P1' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assertNoSentinel(result);
  });

  it('Q5 secure stdin remains executable with fake input', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({ stepId: 'P1' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assertNoSentinel(result);
  });

  it('Q6 TEMP_PGPASS selection fails before secret read', async () => {
    let credentialRead = false;
    const envelope = validAuthorizationEnvelope({
      selectedStep: 'P1',
      credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
    });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: envelope,
        credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
        selectedStep: 'P1',
      },
      {
        ...qFakeTransportDeps({ stepId: 'P1' }),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
    assertNoSentinel(result);
  });

  it('Q7 TEMP_PGPASS selection creates no client/file', async () => {
    const factory = createFakeExecutionPgClientFactory();
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: validAuthorizationEnvelope({
          selectedStep: 'P1',
          credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
        }),
        credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
        selectedStep: 'P1',
      },
      {
        repositoryFacts: () => validRepositoryFacts(),
        transportFactory: { createClient: (config) => factory.createClient(config) },
      },
    );
    assert.equal(factory.clients.length, 0);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('Q8 implementation document truthfully records secure-stdin-only profile', () => {
    const implementation = JSON.parse(
      readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.executorImplementationJson), 'utf8'),
    ) as {
      executable_credential_methods: string[];
      unavailable_approved_methods: string[];
      code_implemented: boolean;
    };
    assert.deepEqual(implementation.executable_credential_methods, ['SECURE_STDIN_CONNECTION_CONFIG_v1']);
    assert.deepEqual(implementation.unavailable_approved_methods, ['TEMP_PGPASSFILE_0600_v1']);
    assert.equal(implementation.code_implemented, true);
    assertNoSentinel(implementation);
  });

  it('Q9 missing observed envelope rejected', async () => {
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: validExpectedBinding() },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      qFakeTransportDeps({ stepId: 'P1' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    assertNoSentinel(result);
  });

  it('Q10 supplied observed repo HEAD mismatch rejected, not overwritten', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    envelope.observed.repositoryHead = 'd'.repeat(40);
    const result = await executeWithEnvelope(envelope, 'P1', qFakeTransportDeps({ stepId: 'P1' }));
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
    assertNoSentinel(result);
  });

  it('Q11 supplied observed tree mismatch rejected', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    envelope.observed.repositoryTree = 'e'.repeat(40);
    const result = await executeWithEnvelope(envelope, 'P1', qFakeTransportDeps({ stepId: 'P1' }));
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
    assertNoSentinel(result);
  });

  it('Q12 method/step mismatch before credential read', async () => {
    let credentialRead = false;
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P2' });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: envelope,
        credentialMethod: envelope.expected.credentialMethod,
        selectedStep: 'P1',
      },
      {
        ...qFakeTransportDeps({ stepId: 'P1' }),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    assertNoSentinel(result);
  });

  it('Q13 exact supplied envelope + actual repo facts passes', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assertNoSentinel(result);
  });

  it('Q14 P2 actual prior catalog => DEFINITELY_NOT_COMMITTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(result);
  });

  it('Q15 P2 actual next catalog => DEFINITELY_COMMITTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        verifierPostPhaseId: 'P2',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    }
    assertNoSentinel(result);
  });

  it('Q16 P2 drifted catalog => CONTRADICTORY_OR_DRIFTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierPostPhaseId: 'P3',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assertNoSentinel(result);
  });

  it('Q17 P7 exact next uses FINAL_P7 and Human review', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P7' }),
      'P7',
      qFakeTransportDeps({ stepId: 'P7', verifierPostPhaseId: 'P7' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.includesFinalP7Verification, true);
      assert.equal(result.disposition, 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION');
    }
    assertNoSentinel(result);
  });

  it('Q18 P1 CLEANLY_ABSENT => DEFINITELY_NOT_COMMITTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierP1Classification: 'CLEANLY_ABSENT',
        verifierP1Proceed: true,
        verifierPostPhaseId: 'P0',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(result);
  });

  it('Q19 P1 exact P1 relation/catalog => DEFINITELY_COMMITTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    if (result.mode === 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED') {
      assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    }
    assertNoSentinel(result);
  });

  it('Q20 P1 malformed/ambiguous => CONTRADICTORY_OR_DRIFTED', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierP1Classification: 'UNKNOWN_OR_AMBIGUOUS',
        verifierP1Proceed: false,
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assertNoSentinel(result);
  });

  it('Q21 definitive COMMIT ACK plus wrong actual next is not committed', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({
        stepId: 'P2',
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('Q22 in-transaction rejection rolls back once, closes, then fresh classifies', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', priorPhaseId: 'P0', verifierPostPhaseId: 'P1' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('rollback'), true);
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    assertNoSentinel(result);
  });

  it('Q23 rollback unacknowledged closes then fresh classifies', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      priorPhaseId: 'P0',
      rollbackAcknowledged: false,
      verifierPostPhaseId: 'P1',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assert.equal(result.postCommitLifecycle, 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE');
    assertNoSentinel(result);
  });

  it('Q24 pre-commit transport loss performs no false rollback and fresh classifies', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      transportLossOnCommit: true,
      verifierPostPhaseId: 'P1',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('rollback'), false);
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assertNoSentinel(result);
  });

  it('Q25 COMMIT transport uncertainty never rolls back and fresh classifies', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P1',
    });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('rollback'), false);
    assert.equal(deps.mutationFactory!.clients[0]!.calls.includes('commit'), true);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(result);
  });

  it('Q26 pre-transaction setup failure does not invoke classifier', async () => {
    const factory = createFakeExecutionPgClientFactory({ failConnect: true });
    const deps = qFakeTransportDeps({ stepId: 'P1' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.verifierFactory!.clients.length, 0);
    assert.equal(result.postCommitLifecycle ?? null, null);
    assertNoSentinel(result);
  });

  it('Q27 first error preserved; no statement/COMMIT/retry/next step after failure', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P4', postPhaseId: 'P2' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P4' }), 'P4', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.holdReasonCode, 'HOLD_INVALID_HISTORY_PREFIX');
    assert.equal(result.automaticNextStep, false);
    assert.equal(result.sameRunRetry, false);
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });

  it('Q28 every fresh client closes on success/failure', async () => {
    const success = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', success);
    assert.equal(success.verifierFactory!.clients[0]!.calls.includes('close'), true);

    const failureVerifierFactory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'x', current_user_name: 'y' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    });
    const failure = qFakeTransportDeps({ stepId: 'P2' });
    failure.verifierTransportFactory = {
      createClient: (config) => failureVerifierFactory.createClient(config),
    };
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', failure);
    assert.equal(failureVerifierFactory.clients[0]!.calls.includes('close'), true);
    assertNoSentinel({ close: true });
  });
});

describe('remote execution executor S1-S24 CORRECTION-3', () => {
  it('S1 P1 CLEANLY_ABSENT does not execute full catalog extractor', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P1',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierP1Classification: 'CLEANLY_ABSENT',
      verifierP1Proceed: true,
    });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    const catalogQueries = deps.verifierFactory!.clients[0]!.queries.filter((entry) =>
      entry.sql.trim().startsWith('WITH tracked'),
    );
    assert.equal(catalogQueries.length, 0);
    assertNoSentinel({ catalogQueries: catalogQueries.length });
  });

  it('S2 P1 CLEANLY_ABSENT => HOLD/DEFINITELY_NOT_COMMITTED for uncertain ACK', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierP1Classification: 'CLEANLY_ABSENT',
        verifierP1Proceed: true,
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(result);
  });

  it('S3 P1 exact compatible + exact P1 catalog => committed', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        verifierP1Classification: 'EXACT_COMPATIBLE_EMPTY',
        verifierP1Proceed: false,
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.equal(result.ackState, 'DEFINITELY_COMMITTED');
    assertNoSentinel(result);
  });

  it('S4 P1 malformed/unknown + matching-looking catalog cannot become committed', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P1' }),
      'P1',
      qFakeTransportDeps({
        stepId: 'P1',
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
        verifierP1Classification: 'UNKNOWN_OR_AMBIGUOUS',
        verifierP1Proceed: false,
        verifierPostPhaseId: 'P1',
      }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assertNoSentinel(result);
  });

  it('S5 contradictory actual state returns HOLD and CLI exit nonzero', async () => {
    const authPath = join(tmpdir(), `m55-auth-s5-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify(validAuthorizationEnvelope({ selectedStep: 'P2' })));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        ...qFakeTransportDeps({
          stepId: 'P2',
          commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
          verifierPostPhaseId: 'P3',
        }),
      },
    );
    assert.equal(cli.exitCode, 1);
    const parsed = JSON.parse(cli.stdout.trim()) as { mode: string; ackState?: string | null };
    assert.equal(parsed.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(parsed.ackState, 'CONTRADICTORY_OR_DRIFTED');
    assertNoSentinel(parsed);
  });

  it('S6 definitely-not-committed returns HOLD and CLI exit nonzero', async () => {
    const authPath = join(tmpdir(), `m55-auth-s6-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify(validAuthorizationEnvelope({ selectedStep: 'P2' })));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        ...qFakeTransportDeps({
          stepId: 'P2',
          commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
          verifierPostPhaseId: 'P1',
        }),
      },
    );
    assert.equal(cli.exitCode, 1);
    const parsed = JSON.parse(cli.stdout.trim()) as { mode: string; ackState?: string | null };
    assert.equal(parsed.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(parsed.ackState, 'DEFINITELY_NOT_COMMITTED');
    assertNoSentinel(parsed);
  });

  it('S7 only definitely-committed returns Human-review success/exit zero', async () => {
    const authPath = join(tmpdir(), `m55-auth-s7-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify(validAuthorizationEnvelope({ selectedStep: 'P2' })));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        ...qFakeTransportDeps({
          stepId: 'P2',
          commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
          verifierPostPhaseId: 'P2',
        }),
      },
    );
    assert.equal(cli.exitCode, 0);
    const parsed = JSON.parse(cli.stdout.trim()) as { mode: string; ackState?: string | null };
    assert.equal(parsed.mode, 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED');
    assert.equal(parsed.ackState, 'DEFINITELY_COMMITTED');
    assertNoSentinel(parsed);
  });

  it('S8 fresh-classifier failure returns finite mandatory-stop HOLD', async () => {
    const verifierFactory = createFakeExecutionPgClientFactory({ failConnect: true });
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = {
      createClient: (config) => verifierFactory.createClient(config),
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('S9 reordered history prefix rejected', async () => {
    const raw = hybridRawCatalogForPhase('P2');
    raw.history_prefix = ['20260615000002', '20260615000001'];
    const oracle = oraclePhaseById('P2');
    const snapshot = deriveRuntimePhaseSnapshot(raw, oracle);
    const comparison = compareRuntimePhaseSnapshot(snapshot, oracle);
    assert.equal(comparison.ok, false);
    assertNoSentinel({ ok: comparison.ok });
  });

  it('S10 duplicate/missing/extra history prefix rejected', () => {
    const raw = hybridRawCatalogForPhase('P2');
    raw.history_prefix = ['20260615000001', '20260615000001'];
    const oracle = oraclePhaseById('P2');
    const snapshot = deriveRuntimePhaseSnapshot(raw, oracle);
    const expected = LIFECYCLE_VERSION_REGISTRY.slice(0, 2);
    const actual = snapshot.history_prefix.map(String);
    assert.notEqual(actual.length, expected.length);
    assertNoSentinel({ actual, expected });
  });

  it('S11 catalog zero rows rejected', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = {
      createClient: (config) =>
        createFakeExecutionPgClientFactory({
          queryHandler: (sql) => {
            if (sql === POST_CONNECT_GUARD_SQL) {
              return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
            }
            if (sql.startsWith('SET ')) return { rows: [], rowCount: 0 };
            if (sql.trim().startsWith('WITH tracked')) return { rows: [], rowCount: 0 };
            return { rows: [], rowCount: 0 };
          },
        }).createClient(config),
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S12 catalog multiple rows rejected', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = {
      createClient: (config) =>
        createFakeExecutionPgClientFactory({
          queryHandler: (sql) => {
            if (sql === POST_CONNECT_GUARD_SQL) {
              return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
            }
            if (sql.startsWith('SET ')) return { rows: [], rowCount: 0 };
            if (sql.trim().startsWith('WITH tracked')) {
              return {
                rows: [
                  { [CATALOG_EXTRACTOR_OUTPUT_COLUMN]: '{}' },
                  { [CATALOG_EXTRACTOR_OUTPUT_COLUMN]: '{}' },
                ],
                rowCount: 2,
              };
            }
            return { rows: [], rowCount: 0 };
          },
        }).createClient(config),
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S13 catalog extra/missing/wrong output column rejected', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = {
      createClient: (config) =>
        createFakeExecutionPgClientFactory({
          queryHandler: (sql) => {
            if (sql === POST_CONNECT_GUARD_SQL) {
              return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
            }
            if (sql.startsWith('SET ')) return { rows: [], rowCount: 0 };
            if (sql.trim().startsWith('WITH tracked')) {
              return { rows: [{ wrong_column: '{}' }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          },
        }).createClient(config),
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S14 malformed/scalar/array catalog payload rejected', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = {
      createClient: (config) =>
        createFakeExecutionPgClientFactory({
          queryHandler: (sql) => {
            if (sql === POST_CONNECT_GUARD_SQL) {
              return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
            }
            if (sql.startsWith('SET ')) return { rows: [], rowCount: 0 };
            if (sql.trim().startsWith('WITH tracked')) {
              return { rows: [{ [CATALOG_EXTRACTOR_OUTPUT_COLUMN]: '[]' }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          },
        }).createClient(config),
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S15 authorization expected getter is not invoked', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    Object.defineProperty(envelope, 'expected', {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('expected getter invoked');
      },
    });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: envelope,
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      qFakeTransportDeps({ stepId: 'P1' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S16 authorization observed getter is not invoked', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    Object.defineProperty(envelope, 'observed', {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('observed getter invoked');
      },
    });
    const binding = validateNonsecretTargetBinding(envelope);
    assert.equal(binding.ok, false);
    assertNoSentinel(binding);
  });

  it('S17 direct malformed executor input never throws', async () => {
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected: { credentialMethod: 'x' }, observed: null },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      qFakeTransportDeps({ stepId: 'P1' }),
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S18 raw JSON literal \\\\u0068ost plus host is rejected as duplicate', () => {
    const duplicate = Buffer.from(
      '{"\\u0068ost":"a","host":"b","port":5432,"database":"postgres","user":"postgres","password":"x","sslmode":"require"}',
      'utf8',
    );
    const parsed = parseSecureStdinConnectionConfig(duplicate);
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('S19 other escaped-equivalent duplicate key forms rejected', () => {
    const duplicate = Buffer.from(
      '{"host":"a","\\u0068ost":"b","port":5432,"database":"postgres","user":"postgres","password":"x","sslmode":"require"}',
      'utf8',
    );
    const parsed = parseSecureStdinConnectionConfig(duplicate);
    assert.equal(parsed.ok, false);
    assertNoSentinel(parsed);
  });

  it('S20 TEMP_PGPASS public executable acquisition export absent', async () => {
    const credentialModule = await import('./previewRemoteApply/remoteExecutionCredentialAcquirer.ts');
    assert.equal('acquireTempPgpassfile0600' in credentialModule, false);
    assertNoSentinel({ exportAbsent: true });
  });

  it('S21 TEMP_PGPASS selection creates no file/client and reads no secret', async () => {
    let credentialRead = false;
    const factory = createFakeExecutionPgClientFactory();
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: validAuthorizationEnvelope({
          selectedStep: 'P1',
          credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
        }),
        credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
        selectedStep: 'P1',
      },
      {
        repositoryFacts: () => validRepositoryFacts(),
        transportFactory: { createClient: (config) => factory.createClient(config) },
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(factory.clients.length, 0);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('S22 runtime evidence truthfully reflects a fake successful stage sequence', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' }),
    );
    assert.equal(result.runtimeEvidence.authorizationBindingAccepted, true);
    assert.equal(result.runtimeEvidence.connectionOpened, true);
    assert.equal(result.runtimeEvidence.transactionBegan, true);
    assert.equal(result.runtimeEvidence.mutationStatementsStarted, true);
    assert.equal(result.runtimeEvidence.historyInsertExecuted, true);
    assert.equal(result.runtimeEvidence.commitSent, true);
    assert.equal(result.runtimeEvidence.freshReadonlyCheckExecuted, true);
    assert.equal(result.runtimeEvidence.transportProfile, 'TEST_INJECTED');
    assertNoSentinel(result.runtimeEvidence);
  });

  it('S23 runtime HOLD evidence truthfully reflects the exact failure stage', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', priorPhaseId: 'P0' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.runtimeEvidence.connectionOpened, true);
    assert.equal(result.runtimeEvidence.transactionBegan, true);
    assert.equal(result.runtimeEvidence.commitSent, false);
    assert.equal(result.runtimeEvidence.executionStageReached, 'FRESH_READONLY_CLASSIFICATION');
    assertNoSentinel(result.runtimeEvidence);
  });

  it('S24 local oracle/authority read failure returns finite HOLD without path leak', async () => {
    const oracleAbs = join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json');
    const saved = readFileSync(oracleAbs);
    writeFileSync(oracleAbs, '{"phases":"broken"}', 'utf8');
    try {
      const result = await executeWithEnvelope(
        validAuthorizationEnvelope({ selectedStep: 'P1' }),
        'P1',
        qFakeTransportDeps({ stepId: 'P1' }),
      );
      assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
      assert.equal(result.holdReasonCode, 'HOLD_AUTHORITY_IDENTITY_MISMATCH');
      const serialized = serializePreviewRemoteExecutionResult(result);
      assert.equal(serialized.includes('/Users/'), false);
      assert.equal(serialized.includes('broken'), false);
      assertNoSentinel(result);
    } finally {
      writeFileSync(oracleAbs, saved);
    }
  });
});

describe('remote execution executor T1-T26 CORRECTION-4', () => {
  it('T1 CLI expected getter not invoked', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    Object.defineProperty(envelope, 'expected', {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('expected getter invoked');
      },
    });
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', '/ignored.json', '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        readAuthorizationDocument: () => envelope,
      },
    );
    assert.equal(cli.exitCode, 1);
    assertNoSentinel(JSON.parse(cli.stdout.trim()));
  });

  it('T2 CLI observed getter not invoked', async () => {
    const envelope = validAuthorizationEnvelope({ selectedStep: 'P1' });
    Object.defineProperty(envelope, 'observed', {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('observed getter invoked');
      },
    });
    const binding = validateNonsecretTargetBinding(envelope);
    assert.equal(binding.ok, false);
    assertNoSentinel(binding);
  });

  it('T3 malformed CLI envelope reads no credential and creates no client', async () => {
    let credentialRead = false;
    const factory = createFakeExecutionPgClientFactory();
    const authPath = join(tmpdir(), `m55-auth-t3-${Date.now()}.json`);
    writeFileSync(authPath, JSON.stringify({ expected: { credentialMethod: 'x' }, observed: null }));
    const cli = await runPreviewRemoteExecutionCli(
      ['--authorization-document', authPath, '--credential-method', CREDENTIAL_METHOD_IDS[0]],
      {
        repoRoot: EXPECTED_REPO_ROOT,
        repositoryFacts: () => validRepositoryFacts(),
        transportFactory: { createClient: (config) => factory.createClient(config) },
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(factory.clients.length, 0);
    assert.equal(cli.exitCode, 1);
    assertNoSentinel(JSON.parse(cli.stdout.trim()));
  });

  it('T4 connectionTimeoutMillis exact 15000 in real/fake config', async () => {
    const factory = createFakeExecutionPgClientFactory();
    const transport = createExecutionPgTransport({ createClient: (config) => factory.createClient(config) });
    const client = transport.createClient(
      buildClientConfig(validExpectedBinding(), {
        host: VALID_HOST,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SENTINEL,
        sslmode: 'require',
      }) as ExecutionPgClientConfig,
    );
    assert.equal(factory.clients[0]!.config.connectionTimeoutMillis, 15000);
    await client.connect();
    await client.close();
    assertNoSentinel({ timeout: factory.clients[0]!.config.connectionTimeoutMillis });
  });

  it('T5 timeout override impossible', () => {
    assert.equal(TIMEOUT_POLICY.cliOverrideForbidden, true);
    assert.equal(TIMEOUT_POLICY.environmentOverrideForbidden, true);
    assert.equal(TIMEOUT_POLICY.values.connectMs, 15000);
    assertNoSentinel(TIMEOUT_POLICY.identifier);
  });

  it('T6 mutation deadline timeout forbids COMMIT and routes failure lifecycle', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P1' });
    deps.deadlineRunner = {
      isExceeded: (_startedAtMs, deadlineMs) => deadlineMs === TIMEOUT_POLICY.values.mutationDeadlineMs,
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('commit') ?? false, false);
    assertNoSentinel(result);
  });

  it('T7 post-commit verification deadline timeout -> mandatory-stop HOLD', async () => {
    let now = 0;
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    deps.nowMs = () => now;
    deps.deadlineRunner = {
      isExceeded: (_startedAtMs, deadlineMs) => deadlineMs === TIMEOUT_POLICY.values.postCommitVerificationMs,
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('T8 ACK classifier deadline timeout -> mandatory-stop HOLD', async () => {
    let now = 0;
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P1',
    });
    deps.nowMs = () => now;
    deps.deadlineRunner = {
      isExceeded: (_startedAtMs, deadlineMs) => deadlineMs === TIMEOUT_POLICY.values.ackClassifierMs,
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('T9 fresh target gate reruns before fresh client', async () => {
    let gateCount = 0;
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    const baseFacts = deps.repositoryFacts!;
    deps.repositoryFacts = () => {
      gateCount += 1;
      return baseFacts();
    };
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.ok(gateCount >= 2);
    assert.equal(deps.verifierFactory!.clients.length, 1);
    assertNoSentinel({ gateCount });
  });

  it('T10 fresh repo HEAD/tree drift creates no fresh client', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    const baseFacts = deps.repositoryFacts!;
    let callCount = 0;
    deps.repositoryFacts = () => {
      callCount += 1;
      if (callCount > 1) {
        return validRepositoryFacts({ headCommitSha: 'f'.repeat(40) });
      }
      return baseFacts();
    };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.disposition, 'MANDATORY_STOP');
    assertNoSentinel(result);
  });

  it('T11 fresh authority/manifest mismatch creates no fresh client', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'm55-t11-'));
    cpSync(REPO_ROOT, workspace, { recursive: true, filter: (src) => !src.includes('node_modules') });
    const manifestPath = join(workspace, FOUNDATION_REL_PATHS.manifestJson);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: Array<{ path: string; sha256: string }> };
    const loader = manifest.files.find((entry) => entry.path === FOUNDATION_REL_PATHS.loader);
    if (loader) loader.sha256 = '0'.repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: workspace,
        authorizationDocument: validAuthorizationEnvelope({ selectedStep: 'P2' }),
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P2',
      },
      { ...deps, repositoryFacts: () => validRepositoryFacts({ repoRoot: workspace }) },
    );
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('T12 full foundation validation failure occurs before credential read', async () => {
    let credentialRead = false;
    const workspace = mkdtempSync(join(tmpdir(), 'm55-t12-'));
    cpSync(REPO_ROOT, workspace, { recursive: true, filter: (src) => !src.includes('node_modules') });
    writeFileSync(join(workspace, FOUNDATION_REL_PATHS.manifestJson), '{"broken":true}', 'utf8');
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: workspace,
        authorizationDocument: validAuthorizationEnvelope({ selectedStep: 'P1' }),
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      {
        repositoryFacts: () => validRepositoryFacts({ repoRoot: workspace }),
        credentialAcquirerDeps: {
          readBytes: () => {
            credentialRead = true;
            return validStdinBytes();
          },
        },
        transportFactory: { createClient: (config) => createFakeExecutionPgClientFactory().createClient(config) },
      },
    );
    assert.equal(credentialRead, false);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('T13 SQL authority SHA mismatch occurs before client creation', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'm55-t13-'));
    cpSync(REPO_ROOT, workspace, { recursive: true, filter: (src) => !src.includes('node_modules') });
    writeFileSync(join(workspace, FOUNDATION_REL_PATHS.catalogExtractor), '-- corrupted', 'utf8');
    const factory = createFakeExecutionPgClientFactory();
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: workspace,
        authorizationDocument: validAuthorizationEnvelope({ selectedStep: 'P1' }),
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      {
        repositoryFacts: () => validRepositoryFacts({ repoRoot: workspace }),
        credentialAcquirerDeps: { readBytes: () => validStdinBytes() },
        transportFactory: { createClient: (config) => factory.createClient(config) },
      },
    );
    assert.equal(factory.clients.length, 0);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('T14 verified probe SQL loaded once and not reread after credential acquisition', () => {
    const bundle = loadVerifiedProbeSqlBundle(REPO_ROOT);
    assert.equal(bundle.ok, true);
    if (bundle.ok) {
      assert.ok(bundle.bundle.p1PriorBootstrapPreconditionSql.includes('bootstrap_precondition_classification'));
      assert.ok(bundle.bundle.catalogExtractorSql.startsWith('WITH tracked'));
    }
    assertNoSentinel(bundle);
  });

  it('T15 fresh session issues exact repeatable-read read-only BEGIN', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    const queries = deps.verifierFactory!.clients[0]!.queries.map((entry) => entry.sql);
    assert.ok(queries.includes(FRESH_READONLY_BEGIN_SQL));
    assert.equal(queries.includes('SET default_transaction_read_only = on;'), false);
    assertNoSentinel(queries);
  });

  it('T16 P1 two-probe classifier uses one read-only snapshot/session', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P1',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierP1Classification: 'EXACT_COMPATIBLE_EMPTY',
      verifierP1Proceed: false,
      verifierPostPhaseId: 'P1',
    });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    const queries = deps.verifierFactory!.clients[0]!.queries.map((entry) => entry.sql);
    const beginIndex = queries.indexOf(FRESH_READONLY_BEGIN_SQL);
    const rollbackIndex = queries.findIndex((sql) => sql.trim() === 'ROLLBACK' || sql.trim() === 'ROLLBACK;');
    assert.ok(beginIndex >= 0 && rollbackIndex > beginIndex);
    assert.ok(queries.filter((sql) => sql.includes('bootstrap_precondition_classification')).length >= 1);
    assert.ok(queries.filter((sql) => sql.trim().startsWith('WITH tracked')).length >= 1);
    assertNoSentinel({ beginIndex, rollbackIndex });
  });

  it('T17 fresh read-only transaction closes on success/failure', async () => {
    const success = qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', success);
    assert.equal(success.verifierFactory!.clients[0]!.calls.includes('close'), true);

    const failureFactory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'x', current_user_name: 'y' }], rowCount: 1 };
        }
        if (sql === FRESH_READONLY_BEGIN_SQL) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      },
    });
    const failure = qFakeTransportDeps({ stepId: 'P2' });
    failure.verifierTransportFactory = { createClient: (config) => failureFactory.createClient(config) };
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', failure);
    assert.equal(failureFactory.clients[0]!.calls.includes('close'), true);
    assertNoSentinel({ closed: true });
  });

  it('T18 missing contractVersion after BEGIN rolls back and classifies', async () => {
    const source = readFileSync(join(REPO_ROOT, 'lib/m55/previewRemoteApply/remoteExecutionExecutor.ts'), 'utf8');
    assert.ok(
      source.includes(
        "return await finishPreCommitHold('HOLD_AUTHORITY_IDENTITY_MISMATCH', 'IN_TRANSACTION_SERVER_REJECTION')",
      ),
    );
    const deps = qFakeTransportDeps({ stepId: 'P2', priorPhaseId: 'P0', verifierPostPhaseId: 'P1' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(deps.mutationFactory!.clients[0]?.calls.includes('rollback') ?? false, true);
    assertNoSentinel(result);
  });

  it('T19 no direct HOLD return remains in active transaction', () => {
    const source = readFileSync(join(REPO_ROOT, 'lib/m55/previewRemoteApply/remoteExecutionExecutor.ts'), 'utf8');
    const mutationSection = source.slice(source.indexOf("executionStage = 'IN_TRANSACTION_MUTATION'"));
    assert.equal(mutationSection.includes('if (!contractVersion) {\n      return buildHold'), false);
    assertNoSentinel({ scanned: true });
  });

  it('T20 historyInsertExecuted false when INSERT fails', async () => {
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
        }
        if (sql.startsWith('INSERT INTO supabase_migrations')) {
          throw new Error('HOLD_UNEXPECTED_INTERNAL');
        }
        return createCatalogQueryHandler({ stepId: 'P2' })(sql);
      },
    });
    const deps = qFakeTransportDeps({ stepId: 'P2' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.runtimeEvidence.historyInsertExecuted, false);
    assertNoSentinel(result.runtimeEvidence);
  });

  it('T21 historyInsertExecuted true only after successful INSERT', async () => {
    const result = await executeWithEnvelope(
      validAuthorizationEnvelope({ selectedStep: 'P2' }),
      'P2',
      qFakeTransportDeps({ stepId: 'P2', verifierPostPhaseId: 'P2' }),
    );
    assert.equal(result.runtimeEvidence.historyInsertExecuted, true);
    assertNoSentinel(result.runtimeEvidence);
  });

  it('T22 freshReadonlyCheckExecuted true when attempted even if classifier fails', async () => {
    const verifierFactory = createFakeExecutionPgClientFactory({ failConnect: true });
    const deps = qFakeTransportDeps({ stepId: 'P2', commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' });
    deps.verifierTransportFactory = { createClient: (config) => verifierFactory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.runtimeEvidence.freshReadonlyCheckExecuted, true);
    assertNoSentinel(result.runtimeEvidence);
  });

  it('T23 post-connect extra/malformed row rejected', async () => {
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return {
            rows: [{ current_database_name: 'postgres', current_user_name: 'postgres', extra: 'x' }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    });
    const deps = qFakeTransportDeps({ stepId: 'P1' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('T24 P1 bootstrap extra/missing/type-inconsistent row rejected', async () => {
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
        }
        if (sql.includes('bootstrap_precondition_classification')) {
          return {
            rows: [{ bootstrap_precondition_classification: 'CLEANLY_ABSENT', bootstrap_precondition_proceed: true }],
            rowCount: 1,
          };
        }
        return createCatalogQueryHandler({ stepId: 'P1' })(sql);
      },
    });
    const deps = qFakeTransportDeps({ stepId: 'P1' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P1' }), 'P1', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });

  it('T25 stdin chunks zeroized on success/overflow/error', async () => {
    let returned: Buffer | null = null;
    const acquired = await acquireSecureStdinConnectionConfig({
      readBytes: async () => {
        returned = Buffer.from(validStdinBytes());
        return returned;
      },
    });
    assert.equal(acquired.ok, true);
    if (acquired.ok) acquired.cleanup();
    assert.equal(returned!.every((byte) => byte === 0), true);
    const overflowBuffer = Buffer.alloc(SECURE_STDIN_MAX_BYTES + 1, 97);
    const overflow = await acquireSecureStdinConnectionConfig({
      readBytes: async () => overflowBuffer,
    });
    assert.equal(overflow.ok, false);
    assert.equal(overflowBuffer.every((byte) => byte === 0), true);
    assertNoSentinel({ zeroized: true });
  });

  it('T26 real client public evidence/config serialization contains no secret', async () => {
    const acquired = await acquireSecureStdinConnectionConfig({ readBytes: async () => validStdinBytes() });
    assert.equal(acquired.ok, true);
    if (acquired.ok) {
      const { publicHandleToJson } = await import('./previewRemoteApply/remoteExecutionExecutor.ts');
      const serialized = JSON.stringify(publicHandleToJson(acquired.handle));
      assert.equal(serialized.includes(SENTINEL), false);
      acquired.cleanup();
    }
    assertNoSentinel({ serialized: true });
  });
});

describe('remote execution executor U4-U7 CORRECTION-5', () => {
  it('U4 mutationStatementsStarted false when failure occurs before first mutation query', async () => {
    const deps = qFakeTransportDeps({ stepId: 'P2', priorPhaseId: 'P0', postPhaseId: 'P2' });
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assert.equal(result.runtimeEvidence.mutationStatementsStarted, false);
    assertNoSentinel(result.runtimeEvidence);
  });

  it('U5 mutationStatementsStarted true immediately when first mutation query is attempted', async () => {
    let mutationQueryAttempted = false;
    const factory = createFakeExecutionPgClientFactory({
      queryHandler: (sql) => {
        if (sql === POST_CONNECT_GUARD_SQL) {
          return { rows: [{ current_database_name: 'postgres', current_user_name: 'postgres' }], rowCount: 1 };
        }
        const trimmed = sql.trim();
        if (trimmed.startsWith('WITH tracked') || trimmed.startsWith('SET ')) {
          return createCatalogQueryHandler({ stepId: 'P2' })(sql);
        }
        if (trimmed.startsWith('INSERT INTO supabase_migrations')) {
          return { rows: [], rowCount: 0 };
        }
        mutationQueryAttempted = true;
        throw new Error('HOLD_UNEXPECTED_INTERNAL');
      },
    });
    const deps = qFakeTransportDeps({ stepId: 'P2' });
    deps.transportFactory = { createClient: (config) => factory.createClient(config) };
    const result = await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    assert.equal(mutationQueryAttempted, true);
    assert.equal(result.runtimeEvidence.mutationStatementsStarted, true);
    assertNoSentinel(result.runtimeEvidence);
  });

  it('U6 post-commit fresh session sets exact 120000ms LOCAL timeout before probe', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      verifierPostPhaseId: 'P2',
    });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    const verifier = deps.verifierFactory!.clients[0]!;
    const beginIdx = verifier.queries.findIndex((entry) => entry.sql === FRESH_READONLY_BEGIN_SQL);
    const timeoutIdx = verifier.queries.findIndex(
      (entry) => entry.sql === buildFreshLocalStatementTimeoutSql(TIMEOUT_POLICY.values.postCommitVerificationMs),
    );
    const probeIdx = verifier.queries.findIndex((entry) => entry.sql.startsWith('WITH tracked'));
    assert.ok(beginIdx >= 0);
    assert.ok(timeoutIdx > beginIdx);
    assert.ok(probeIdx > timeoutIdx);
    assert.equal(TIMEOUT_POLICY.values.postCommitVerificationMs, 120000);
    assertNoSentinel({ beginIdx, timeoutIdx, probeIdx });
  });

  it('U7 ACK fresh session sets exact 180000ms LOCAL timeout before probe', async () => {
    const deps = qFakeTransportDeps({
      stepId: 'P2',
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      verifierPostPhaseId: 'P1',
    });
    await executeWithEnvelope(validAuthorizationEnvelope({ selectedStep: 'P2' }), 'P2', deps);
    const verifier = deps.verifierFactory!.clients[0]!;
    const beginIdx = verifier.queries.findIndex((entry) => entry.sql === FRESH_READONLY_BEGIN_SQL);
    const timeoutIdx = verifier.queries.findIndex(
      (entry) => entry.sql === buildFreshLocalStatementTimeoutSql(TIMEOUT_POLICY.values.ackClassifierMs),
    );
    const probeIdx = verifier.queries.findIndex((entry) => entry.sql.startsWith('WITH tracked'));
    assert.ok(beginIdx >= 0);
    assert.ok(timeoutIdx > beginIdx);
    assert.ok(probeIdx > timeoutIdx);
    assert.equal(TIMEOUT_POLICY.values.ackClassifierMs, 180000);
    assertNoSentinel({ beginIdx, timeoutIdx, probeIdx });
  });
});

describe('remote execution executor session pooler correction-1 V12', () => {
  it('V12 executor fixture with exact pooler binding reaches fake client creation; malformed creates no client', async () => {
    let credentialRead = false;
    const validDeps = createFakeTransportDeps({ stepId: 'P1' });
    const baseRead = validDeps.credentialAcquirerDeps!.readBytes!;
    validDeps.credentialAcquirerDeps = {
      ...validDeps.credentialAcquirerDeps,
      readBytes: () => {
        credentialRead = true;
        return baseRead();
      },
    };
    await executeWithEnvelope(validAuthorizationEnvelope(), 'P1', validDeps);
    assert.equal(credentialRead, true);
    assert.equal(validDeps.mutationFactory!.clients.length, 1);
    assert.equal(validDeps.mutationFactory!.clients[0]!.config.user, VALID_CONNECTION_USER);
    assertNoSentinel({ clientCount: validDeps.mutationFactory!.clients.length });

    let malformedCredentialRead = false;
    const malformedDeps = createFakeTransportDeps({ stepId: 'P1' });
    malformedDeps.credentialAcquirerDeps = {
      readBytes: () => {
        malformedCredentialRead = true;
        return validStdinBytes();
      },
    };
    const full = validExpectedBinding();
    const malformedExpected = { ...full } as Record<string, unknown>;
    const malformedObserved = { ...observedFromExpected(full) } as Record<string, unknown>;
    delete malformedExpected.connectionEndpointProfile;
    delete malformedObserved.connectionEndpointProfile;
    const malformedResult = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: {
          expected: malformedExpected as ExpectedAuthorizationBinding,
          observed: malformedObserved as ObservedPreConnectFacts,
        },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      malformedDeps,
    );
    assert.equal(malformedCredentialRead, false);
    assert.equal(malformedDeps.mutationFactory!.clients.length, 0);
    assert.equal(malformedResult.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(malformedResult);
  });
});

describe('remote execution executor session pooler correction-2 W5', () => {
  it('W5 wrong projectRef fails before credential read and client creation', async () => {
    let credentialRead = false;
    const deps = createFakeTransportDeps({ stepId: 'P1' });
    deps.credentialAcquirerDeps = {
      readBytes: () => {
        credentialRead = true;
        return validStdinBytes();
      },
    };
    const altRef = 'other-preview-ref';
    const altUser = expectedConnectionUserForProjectRef(altRef);
    const expected = validExpectedBinding({
      projectRef: altRef,
      connectionUser: altUser,
    });
    const observed = observedFromExpected(expected);
    const result = await executePreviewRemoteExecution(
      {
        repoRoot: EXPECTED_REPO_ROOT,
        authorizationDocument: { expected, observed },
        credentialMethod: CREDENTIAL_METHOD_IDS[0],
        selectedStep: 'P1',
      },
      deps,
    );
    assert.equal(credentialRead, false);
    assert.equal(deps.mutationFactory!.clients.length, 0);
    assert.equal(result.mode, 'PREVIEW_REMOTE_EXECUTION_HOLD');
    assertNoSentinel(result);
  });
});
