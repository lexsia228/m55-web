// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  buildWorkspace,
  WORKSPACE_DIR_BASENAME,
  EXECUTION_ORACLE_REVISION,
  EXPECTED_BASELINE_ARTIFACT_SHA256,
  EXPECTED_MATRIX_ARTIFACT_SHA256,
  EXPECTED_MANIFEST_ARTIFACT_SHA256,
  deriveExecutionOracle,
  sha256Hex,
  sha256File,
  CANONICAL_MIGRATIONS,
  REQUIRED_RELATIONS,
  FIXTURE_META_SCHEMA,
} from '../../scripts/m55/previewBaselineTool.ts';
import {
  DISPOSABLE_RUNTIME_REVISION,
  PINNED_POSTGRES_IMAGE,
  PINNED_POSTGRES_ARM64_DIGEST,
  EXECUTION_STRATEGY,
  EXECUTION_ENABLEMENT_STATUS,
  EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR,
  EXPECTED_EXECUTION_ORACLE_SHA256,
  CONTAINER_NAME_PREFIX,
  SNAPSHOT_COMPARE_CATEGORIES,
  RUNTIME_CATALOG_EXTRACTORS,
  FUNCTION_PARITY_TARGETS,
  READINESS_MAX_ATTEMPTS,
  parseDisposableExecutionFlags,
  validateFrozenInputs,
  validateDockerReadOnlyEvidence,
  collectDockerReadOnlyEvidence,
  buildDisposableIdentity,
  buildDockerPullCommand,
  buildDockerRunCommand,
  buildReadinessCommand,
  buildDockerExecPsqlCommand,
  buildRoleBootstrapSql,
  buildRoleBootstrapProofSql,
  parseRoleBootstrapProof,
  validateRoleBootstrapProof,
  buildFixtureMetadataSql,
  buildP0PreflightSql,
  collectRuntimeCatalogSql,
  buildFunctionParitySql,
  buildMigrationApplyPlan,
  buildFailureCleanupPlan,
  buildDisposableExecutionPlan,
  validateExecutionPlan,
  validateExecutionPlanIdentity,
  instantiateExecutionPlanForIdentity,
  aggregateInternalTriggerSemanticGroups,
  mergeDockerMetadataEnv,
  decodeCatalogFingerprintsToRawCatalog,
  executeDisposablePlanWithInjectedRunner,
  redactExecutionReport,
  runDisposableExecutionCli,
  formatPsqlJsonOutput,
  parsePsqlJsonOutput,
  validateP0PreflightResult,
  compareRuntimePhaseSnapshot,
  deriveRuntimePhaseSnapshot,
  parseFunctionParityOutput,
  verifyMigrationBytesBeforeApply,
  mergeChildProcessEnv,
  waitForReadiness,
  assertContainerNameAllowed,
  isContainerAbsentProof,
  isCleanupTransportFailure,
  stableStringify,
  validateExecutionReportSuccess,
  expectedPhaseHistoryPrefix,
  isApprovedDockerDesktopEndpoint,
  parseRuntimeCatalogOutput,
  type InjectedRunner,
  type FailureBoundary,
} from '../../scripts/m55/previewBaselineDisposableRuntime.ts';

const REPO_ROOT = process.cwd();
const FIXED_NONCE = 'a'.repeat(32);
const LOCAL_DOCKER_EVIDENCE_BASE = {
  docker_desktop_version: '1',
  engine_version: '1',
  server_architecture: 'linux/arm64',
  buildx_version: '1',
  docker_context: 'default',
  docker_endpoint: 'unix:///Users/test/.docker/run/docker.sock',
  local_endpoint_verified: true,
  engine_running: true,
};
const CONTRACT_MATRIX = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_contract_matrix_v1.json'), 'utf8')
);
const executor = () => ({ execute: executeDisposablePlanWithInjectedRunner });

function dockerReadOnlyMockResponse(command: string[]) {
  const joined = command.join(' ');
  if (joined.includes('docker context show')) {
    return { exitCode: 0, stdout: 'desktop-linux\n', stderr: '' };
  }
  if (joined.includes('context inspect')) {
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        Name: 'desktop-linux',
        Endpoints: { docker: { Host: 'unix:///Users/test/.docker/run/docker.sock' } },
      }),
      stderr: '',
    };
  }
  if (joined.includes(' version') && joined.includes('docker')) {
    return {
      exitCode: 0,
      stdout: JSON.stringify({ Client: { Version: '1' }, Server: { Version: '1', Arch: 'arm64' } }),
      stderr: '',
    };
  }
  if (joined.includes('buildx')) return { exitCode: 0, stdout: 'buildx 1', stderr: '' };
  if (joined.includes('image inspect')) return { exitCode: 1, stdout: '', stderr: 'Error: No such image: missing' };
  if (!joined.includes('docker --context') && !joined.includes('docker context show')) {
    throw new Error(`docker_command_missing_explicit_context:${joined}`);
  }
  return { exitCode: 0, stdout: '', stderr: '' };
}



const APPLICATION_RELATIONS_FROM_P3 = [...REQUIRED_RELATIONS, 'clerk_webhook_events'];

const PHASE_RELATION_UNIVERSE = {
  P0: [],
  P1: [...REQUIRED_RELATIONS],
  P2: [...REQUIRED_RELATIONS],
  P3: APPLICATION_RELATIONS_FROM_P3,
  P4: APPLICATION_RELATIONS_FROM_P3,
  P5: APPLICATION_RELATIONS_FROM_P3,
  P6: APPLICATION_RELATIONS_FROM_P3,
  P7: APPLICATION_RELATIONS_FROM_P3,
};

function literalCatalogFromMatrix(matrix, phaseId, extras = {}) {
  const relations = PHASE_RELATION_UNIVERSE[phaseId] ?? [];
  const relSet = new Set(relations);
  const historyPrefix = expectedPhaseHistoryPrefix(phaseId);
  return {
    application_relation_counts: Object.fromEntries(relations.map((relation) => [relation, 0])),
    app_relations: extras.app_relations ?? [],
    relations: [...relSet].sort(),
    columns: matrix.columns.filter((row) => relSet.has(row.relation_name)),
    constraints: matrix.constraints.filter((row) => relSet.has(row.relation_name)),
    indexes: matrix.indexes.filter((row) => relSet.has(row.relation_name)),
    policies: matrix.policies.filter((row) => relSet.has(row.relation_name)),
    privileges: matrix.privileges.filter((row) => {
      const parts = String(row.cell_id ?? '').split('.');
      return relSet.has(parts[1] ?? '');
    }),
    relation_security: matrix.relations
      .filter((row) => relSet.has(row.relation_name))
      .map((row) => ({
        schema_name: row.schema_name,
        relation_name: row.relation_name,
        owner_role: row.owner_role,
        rls_enabled: row.rls_enabled,
        force_rls_enabled: row.force_rls_enabled,
      })),
    functions: phaseId === 'P0' ? [] : matrix.functions,
    user_defined_triggers: extras.user_defined_triggers ?? [],
    ...(extras.internal_trigger_catalog_rows
      ? { internal_trigger_catalog_rows: extras.internal_trigger_catalog_rows }
      : {}),
    internal_trigger_groups: phaseId === 'P0' ? [] : matrix.internal_trigger_semantic_groups,
    history_prefix: historyPrefix,
  };
}

function literalCatalogForPhase(phase) {
  return literalCatalogFromMatrix(CONTRACT_MATRIX, String(phase.phase), {});
}

const TWO_SIDED_FK_INTERNAL_TRIGGER_ROWS = [
  {
    relation_schema: 'public',
    relation_name: 'child_orders',
    referenced_relation: 'parent_accounts',
    function_schema: 'pg_catalog',
    function_name: 'RI_FKey_check_ins',
    event: 'INSERT',
    timing: 'AFTER',
    enabled_state: 'O',
    trigger_classification: 'SYSTEM_INTERNAL',
    side: 'referencing',
    constraint_contract_id: 'internal_fk:public.child_orders:child_orders_parent_id_fkey',
  },
  {
    relation_schema: 'public',
    relation_name: 'parent_accounts',
    referenced_relation: 'child_orders',
    function_schema: 'pg_catalog',
    function_name: 'RI_FKey_check_upd',
    event: 'UPDATE',
    timing: 'AFTER',
    enabled_state: 'O',
    trigger_classification: 'SYSTEM_INTERNAL',
    side: 'referenced',
    constraint_contract_id: 'internal_fk:public.child_orders:child_orders_parent_id_fkey',
  },
];


function makeWorkspace(): { parent: string; workspaceRoot: string } {
  const parent = mkdtempSync(join(tmpdir(), `${WORKSPACE_DIR_BASENAME}-runtime-test-`));
  const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
  buildWorkspace(REPO_ROOT, workspaceRoot);
  return { parent, workspaceRoot };
}

function oraclePhases() {
  return deriveExecutionOracle(REPO_ROOT).oracleObject.phases as Record<string, unknown>[];
}

function p0PreflightPayload(
  identity: ReturnType<typeof buildDisposableIdentity>,
  migrationTupleHash: string
) {
  const frozen = validateFrozenInputs(REPO_ROOT);
  return {
    server_version: '17.6',
    server_version_num: 170006,
    server_encoding: 'UTF8',
    datcollate: 'en_US.UTF-8',
    datctype: 'en_US.UTF-8',
    timezone: 'UTC',
    architecture_compatible: true,
    roles: ['anon', 'authenticated', 'postgres', 'service_role'],
    gen_random_uuid_callable: true,
    public_relation_count: 0,
    marker_count: 1,
    history_count: 0,
    marker: {
      fixture_revision: DISPOSABLE_RUNTIME_REVISION,
      oracle_revision: EXECUTION_ORACLE_REVISION,
      oracle_sha256: frozen.oracle_sha256,
      manifest_sha256: frozen.manifest_sha256,
      migration_tuple_hash: migrationTupleHash,
      database_name: identity.database_name,
      container_name: identity.container_name,
      creation_nonce: identity.nonce,
      local_only_assertion: true,
    },
    database_name: identity.database_name,
    container_name: identity.container_name,
    creation_nonce: identity.nonce,
    expected_migration_tuple_hash: migrationTupleHash,
  };
}

function createCatalogAlignedRunner(workspaceRoot: string) {
  const identity = buildDisposableIdentity(FIXED_NONCE);
  const frozen = validateFrozenInputs(REPO_ROOT);
  const phases = oraclePhases();
  const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
  const migrationTupleHash = sha256Hex(
    plan.migration_steps.map((step) => `${step.migration_version}:${step.migration_sha256}`).join('\n')
  );
  const snapshotPhaseOrder = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  let snapshotPhase = 0;
  const labels = {
    'm55.fixture': 'true',
    'm55.runtime_revision': DISPOSABLE_RUNTIME_REVISION,
    'm55.oracle_sha256': frozen.oracle_sha256,
    'm55.manifest_sha256': frozen.manifest_sha256,
    'm55.creation_nonce': identity.nonce,
  };

  const runner: InjectedRunner & { commands: string[][]; envs: Record<string, string>[] } = {
    commands: [],
    envs: [],
    run(command, options) {
      runner.commands.push([...command]);
      if (options?.env) runner.envs.push({ ...options.env });
      const joined = command.join(' ');
      if (joined.includes('docker pull')) return { exitCode: 0, stdout: PINNED_POSTGRES_IMAGE, stderr: '' };
      if (joined.includes('docker run')) {
        assert.ok(options?.env?.POSTGRES_PASSWORD);
        assert.ok(command.includes('POSTGRES_PASSWORD'));
        assert.ok(!joined.includes(options!.env!.POSTGRES_PASSWORD!));
        return { exitCode: 0, stdout: identity.container_name, stderr: '' };
      }
      if (joined.includes('pg_isready')) return { exitCode: 0, stdout: 'accepting', stderr: '' };
      if (joined.includes('docker ps') && joined.includes('--filter')) {
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      if (joined.includes('docker inspect') && joined.includes('Labels')) {
        return { exitCode: 0, stdout: JSON.stringify(labels), stderr: '' };
      }
      if (joined.includes('docker inspect') && joined.includes('.Id')) {
        return { exitCode: 1, stdout: '', stderr: 'Error: No such object' };
      }
      if (joined.includes('docker rm')) return { exitCode: 0, stdout: '', stderr: '' };
      if (joined.includes('psql')) {
        const stdin = options?.stdin ?? '';
        if (stdin.includes('server_version')) {
          return {
            exitCode: 0,
            stdout: formatPsqlJsonOutput(p0PreflightPayload(identity, migrationTupleHash)),
            stderr: '',
          };
        }
        if (
          stdin.includes("'anon'") &&
          stdin.includes("'service_role'") &&
          stdin.includes('rolbypassrls') &&
          !stdin.includes('runtime_catalog:')
        ) {
          return {
            exitCode: 0,
            stdout: formatPsqlJsonOutput({
              anon: { exists: true, rolcanlogin: false, rolbypassrls: false },
              authenticated: { exists: true, rolcanlogin: false, rolbypassrls: false },
              service_role: { exists: true, rolcanlogin: false, rolbypassrls: true },
            }),
            stderr: '',
          };
        }
        if (stdin.includes('pg_get_functiondef') || stdin.includes('pg_get_function_identity_arguments')) {
          const rows = FUNCTION_PARITY_TARGETS.map((fn) => ({
            function_identity: fn.identity,
            definition_hash: fn.expected_hash,
            definition_character_length: fn.expected_character_length,
            identity_arguments: fn.identity_arguments,
          }));
          return { exitCode: 0, stdout: formatPsqlJsonOutput(rows), stderr: '' };
        }
        if (stdin.includes('runtime_catalog:')) {
          const phaseId = snapshotPhaseOrder[snapshotPhase];
          if (!phaseId) {
            throw new Error(`snapshot_phase_overflow:${snapshotPhase}`);
          }
          snapshotPhase += 1;
          const phase = phases.find((entry) => entry.phase === phaseId);
          return {
            exitCode: 0,
            stdout: formatPsqlJsonOutput(literalCatalogForPhase(phase)),
            stderr: '',
          };
        }
        return { exitCode: 0, stdout: 'OK', stderr: '' };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    },
  };
  return runner;
}

describe('previewBaselineDisposableRuntime R2 — constants', () => {
  it('1. revision is Revision-4', () => {
    assert.equal(DISPOSABLE_RUNTIME_REVISION, 'PREVIEW-BASELINE-DISPOSABLE-RUNTIME-v1-REVISION-4');
    assert.equal(EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR, 'local_execution_implemented_but_not_authorized_revision_4');
  });
  it('2. pinned digest not floating tag', () => {
    assert.equal(PINNED_POSTGRES_IMAGE, `postgres@${PINNED_POSTGRES_ARM64_DIGEST}`);
  });
  it('3. enablement remains unauthorized', () => {
    assert.equal(EXECUTION_ENABLEMENT_STATUS, 'IMPLEMENTED_REVIEW_REQUIRED_NOT_AUTHORIZED');
  });
  it('4. strategy unchanged', () => {
    assert.equal(EXECUTION_STRATEGY, 'DOCKER_EXEC_ISOLATED_NO_HOST_PORT');
  });
  it('5. snapshot category registry complete', () => {
    assert.ok(SNAPSHOT_COMPARE_CATEGORIES.length >= 20);
    assert.ok(SNAPSHOT_COMPARE_CATEGORIES.includes('forbidden_violations'));
  });
});

describe('previewBaselineDisposableRuntime R2 — env and psql', () => {
  it('6. mergeChildProcessEnv supplies POSTGRES_PASSWORD', () => {
    const env = mergeChildProcessEnv('secret-value-32chars-minimum-here!!');
    assert.equal(env.POSTGRES_PASSWORD, 'secret-value-32chars-minimum-here!!');
    assert.equal(env.PGPASSWORD, 'secret-value-32chars-minimum-here!!');
    assert.ok(typeof env.PATH === 'string');
  });
  it('7. docker run argv excludes password value', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const frozen = validateFrozenInputs(REPO_ROOT);
    const cmd = buildDockerRunCommand(identity, {
      fixture: 'true',
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      oracle_sha256: frozen.oracle_sha256,
      manifest_sha256: frozen.manifest_sha256,
      creation_nonce: identity.nonce,
    });
    assert.ok(!cmd.some((part) => part.length > 20 && part.includes('secret')));
    const pwIdx = cmd.indexOf('POSTGRES_PASSWORD');
    assert.ok(pwIdx >= 0);
    assert.equal(cmd[pwIdx - 1], '-e');
    assert.ok(cmd.includes('--label'));
  });
  it('8. psql command includes tuples-only flags', () => {
    const cmd = buildDockerExecPsqlCommand(buildDisposableIdentity(FIXED_NONCE));
    assert.ok(cmd.includes('--no-align'));
    assert.ok(cmd.includes('--tuples-only'));
    assert.ok(cmd.includes('--quiet'));
  });
  it('9. parsePsqlJsonOutput accepts single JSON line', () => {
    const value = parsePsqlJsonOutput(formatPsqlJsonOutput({ ok: true }));
    assert.deepEqual(value, { ok: true });
  });
  it('10. parsePsqlJsonOutput rejects aligned output', () => {
    assert.throws(
      () => parsePsqlJsonOutput('col | val\n----+-----\n 1 | 2\n'),
      /aligned_format_forbidden/
    );
  });
  it('11. parsePsqlJsonOutput rejects multi-line non-json', () => {
    assert.throws(() => parsePsqlJsonOutput('line1\nline2'), /line_count_invalid/);
  });
  it('12. redact removes password from report', () => {
    const redacted = redactExecutionReport({
      ok: false,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: 'x',
      database_name: 'y',
      container_lifecycle: 'NOT_CREATED',
      role_bootstrap_proof: null,
      phases: [],
      function_parity: [],
      cleanup_proof: null,
      failure_boundary: null,
      error: 'POSTGRES_PASSWORD=abc',
      cleanup_error: null,
    });
    assert.ok(!JSON.stringify(redacted).includes('POSTGRES_PASSWORD=abc'));
  });
});

describe('previewBaselineDisposableRuntime R2 — P0 validation', () => {
  it('13. validateP0PreflightResult passes valid payload', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const frozen = validateFrozenInputs(REPO_ROOT);
    validateP0PreflightResult(p0PreflightPayload(identity, 'tuple-hash'), identity, frozen, 'tuple-hash');
  });
  it('14. P0 version mismatch fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.server_version = '16.0';
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_server_version_mismatch/);
  });
  it('14b. P0 accepts exact 17.6 packaged server label when server_version_num is exact', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.server_version = '17.6 (Debian 17.6-2.pgdg12+1)';
    validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash');
  });
  it('14c. P0 rejects a different patch/minor label that merely starts similarly', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.server_version = '17.60';
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_server_version_mismatch/);
  });
  it('15. P0 roles mismatch fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.roles = ['postgres'];
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_roles_mismatch/);
  });
  it('16. P0 public relation count nonzero fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.public_relation_count = 1;
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_public_relation_count_nonzero/);
  });
  it('17. P0 marker count invalid fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.marker_count = 0;
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_marker_count_invalid/);
  });
  it('18. P0 history nonzero fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.history_count = 1;
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_history_count_nonzero/);
  });
  it('19. P0 marker oracle sha mismatch fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.marker.oracle_sha256 = 'bad';
    assert.throws(() => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'), /p0_marker_oracle_sha_mismatch/);
  });
});

describe('previewBaselineDisposableRuntime R2 — oracle snapshot compare', () => {
  it('20. compare all categories for P1 oracle phase', () => {
    const phase = oraclePhases()[1];
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    const result = compareRuntimePhaseSnapshot(snapshot, phase);
    assert.equal(result.ok, true);
    assert.deepEqual(result.compared_categories, [...SNAPSHOT_COMPARE_CATEGORIES]);
  });
  it('21. incomplete snapshot fails closed', () => {
    assert.throws(() => compareRuntimePhaseSnapshot({}, oraclePhases()[0]), /runtime_snapshot_contract_incomplete/);
  });
  it('22. relations_present mismatch fails', () => {
    const phase = oraclePhases()[1];
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    snapshot.relations_present = ['wrong'];
    const result = compareRuntimePhaseSnapshot(snapshot, phase);
    assert.equal(result.ok, false);
    assert.ok(result.mismatches.includes('relations_present_mismatch'));
  });
  it('23. application_row_count mismatch fails', () => {
    const phase = oraclePhases()[1];
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    snapshot.application_row_count = 1;
    const result = compareRuntimePhaseSnapshot(snapshot, phase);
    assert.equal(result.ok, false);
  });
  it('24. policies mismatch fails', () => {
    const phase = oraclePhases()[5];
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    snapshot.policies = ['wrong'];
    assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
  });
  it('25. forbidden violation fails', () => {
    const phase = oraclePhases()[0];
    const raw = literalCatalogForPhase(phase);
    raw.relations = [(phase.forbidden_delta as string[])[0]!];
    const snapshot = deriveRuntimePhaseSnapshot(raw, phase);
    const result = compareRuntimePhaseSnapshot(snapshot, phase);
    assert.ok(result.mismatches.some((m) => m.startsWith('forbidden_violation:')));
  });
});

describe('previewBaselineDisposableRuntime R2 — function parity', () => {
  it('26. parseFunctionParityOutput reads actual values', () => {
    const rows = FUNCTION_PARITY_TARGETS.map((fn) => ({
      function_identity: fn.identity,
      definition_hash: fn.expected_hash,
      definition_character_length: fn.expected_character_length,
      identity_arguments: fn.identity_arguments,
    }));
    const parsed = parseFunctionParityOutput(formatPsqlJsonOutput(rows));
    assert.equal(parsed.length, 2);
    assert.equal(parsed.every((row) => row.status === 'PASS'), true);
  });
  it('27. wrong hash fails parity', () => {
    const rows = FUNCTION_PARITY_TARGETS.map((fn) => ({
      function_identity: fn.identity,
      definition_hash: 'deadbeef',
      definition_character_length: fn.expected_character_length,
      identity_arguments: fn.identity_arguments,
    }));
    const parsed = parseFunctionParityOutput(formatPsqlJsonOutput(rows));
    assert.equal(parsed.some((row) => row.status === 'FAIL'), true);
  });
  it('28. wrong length fails parity', () => {
    const rows = [{
      function_identity: FUNCTION_PARITY_TARGETS[0].identity,
      definition_hash: FUNCTION_PARITY_TARGETS[0].expected_hash,
      definition_character_length: 1,
      identity_arguments: FUNCTION_PARITY_TARGETS[0].identity_arguments,
    }, {
      function_identity: FUNCTION_PARITY_TARGETS[1].identity,
      definition_hash: FUNCTION_PARITY_TARGETS[1].expected_hash,
      definition_character_length: FUNCTION_PARITY_TARGETS[1].expected_character_length,
      identity_arguments: FUNCTION_PARITY_TARGETS[1].identity_arguments,
    }];
    const parsed = parseFunctionParityOutput(formatPsqlJsonOutput(rows));
    assert.equal(parsed[0].status, 'FAIL');
  });
  it('29. duplicate/missing row count fails', () => {
    assert.throws(
      () => parseFunctionParityOutput(formatPsqlJsonOutput([{ function_identity: 'x', definition_hash: 'a', definition_character_length: 1 }])),
      /function_parity_row_count_invalid/
    );
  });
});

describe('previewBaselineDisposableRuntime R2 — migration TOCTOU', () => {
  it('30. verifyMigrationBytesBeforeApply matches manifest', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const steps = buildMigrationApplyPlan(REPO_ROOT, workspaceRoot);
    const step = steps[0];
    const sql = verifyMigrationBytesBeforeApply(step.migration_path, {
      sha256: step.migration_sha256,
      byte_length: step.migration_byte_length,
      line_count: step.migration_line_count,
    });
    assert.ok(sql.includes('CREATE'));
    rmSync(parent, { recursive: true, force: true });
  });
  it('31. migration mutation after plan fails before psql', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
    const step = plan.migration_steps[0];
    writeFileSync(step.migration_path, '-- mutated\n', 'utf8');
    let migrationApplyAttempted = false;
    const originalRun = runner.run.bind(runner);
    runner.run = (command, options) => {
      if ((options?.stdin ?? '').includes('-- mutated')) migrationApplyAttempted = true;
      return originalRun(command, options);
    };
    assert.throws(
      () =>
        executor().execute(REPO_ROOT, {
          workspaceRoot,
          runner,
          nonce: FIXED_NONCE,
        }),
      /Workspace migration SHA mismatch/
    );
    assert.equal(migrationApplyAttempted, false);
    rmSync(parent, { recursive: true, force: true });
  });
  it('32. migration mutation on disk fails before apply', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const steps = buildMigrationApplyPlan(REPO_ROOT, workspaceRoot);
    writeFileSync(steps[0].migration_path, '-- bad\n', 'utf8');
    assert.throws(
      () =>
        executor().execute(REPO_ROOT, {
          workspaceRoot,
          runner: createCatalogAlignedRunner(workspaceRoot),
          nonce: FIXED_NONCE,
        }),
      /Workspace migration SHA mismatch/
    );
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R2 — docker evidence', () => {
  it('33. validateDockerReadOnlyEvidence rejects amd64', () => {
    assert.throws(
      () =>
        validateDockerReadOnlyEvidence({
          ...LOCAL_DOCKER_EVIDENCE_BASE,
          server_architecture: 'linux/amd64',
          image_present_locally: false,
          pinned_image_digest: null,
        }),
      /docker_architecture_invalid/
    );
  });
  it('34. validateDockerReadOnlyEvidence accepts image not present', () => {
    const evidence = validateDockerReadOnlyEvidence({
      ...LOCAL_DOCKER_EVIDENCE_BASE,
      image_present_locally: false,
      pinned_image_digest: null,
    });
    assert.equal(evidence.classification, 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_NOT_PRESENT');
  });
  it('35. engine not running fails', () => {
    assert.throws(
      () =>
        validateDockerReadOnlyEvidence({
          ...LOCAL_DOCKER_EVIDENCE_BASE,
          engine_version: null,
          engine_running: false,
          image_present_locally: false,
          pinned_image_digest: null,
        }),
      /docker_engine_not_running/
    );
  });
});

describe('previewBaselineDisposableRuntime R2 — readiness', () => {
  it('36. waitForReadiness retries until success', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    let calls = 0;
    const runner: InjectedRunner = {
      run() {
        calls += 1;
        return { exitCode: calls < 3 ? 1 : 0, stdout: '', stderr: '' };
      },
    };
    const sleeps: number[] = [];
    assert.equal(waitForReadiness(identity, runner, (ms) => sleeps.push(ms)), true);
    assert.equal(calls, 3);
    assert.equal(sleeps.length, 2);
  });
  it('37. waitForReadiness bounded failure', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const runner: InjectedRunner = {
      run() {
        return { exitCode: 1, stdout: '', stderr: '' };
      },
    };
    assert.equal(waitForReadiness(identity, runner, () => {}), false);
  });
  it('38. readiness max attempts constant is bounded', () => {
    assert.equal(READINESS_MAX_ATTEMPTS, 30);
  });
});

describe('previewBaselineDisposableRuntime R2 — cleanup safety', () => {
  it('39. no cleanup before container creation on pull failure', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner: InjectedRunner = {
      run(command) {
        if (command.join(' ').includes('docker pull')) {
          return { exitCode: 1, stdout: '', stderr: 'pull failed' };
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    };
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.container_lifecycle, 'NOT_CREATED');
    assert.equal(report.cleanup_proof?.attempted, false);
    rmSync(parent, { recursive: true, force: true });
  });
  it('40. wrong container prefix refused', () => {
    assert.throws(() => assertContainerNameAllowed('postgres-main'), /cleanup_refused_container_prefix/);
  });
  it('41. cleanup inspect label mismatch refuses rm effect', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const originalRun = runner.run.bind(runner);
    runner.run = (command, options) => {
      if (command.join(' ').includes('Labels')) {
        return { exitCode: 0, stdout: JSON.stringify({ 'm55.fixture': 'false' }), stderr: '' };
      }
      return originalRun(command, options);
    };
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.ok, false);
    rmSync(parent, { recursive: true, force: true });
  });
  it('42. post-rm absence required', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const originalRun = runner.run.bind(runner);
    runner.run = (command, options) => {
      const joined = command.join(' ');
      if (joined.includes('docker rm')) return { exitCode: 0, stdout: '', stderr: '' };
      if (joined.includes('docker ps') && joined.includes('--filter')) {
        return { exitCode: 0, stdout: 'still-there\n', stderr: '' };
      }
      if (joined.includes('docker inspect') && joined.includes('.Id')) {
        return { exitCode: 0, stdout: 'still-there', stderr: '' };
      }
      return originalRun(command, options);
    };
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.ok, false);
    assert.match(report.cleanup_error ?? report.error ?? '', /absence/);
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R2 — executor guard', () => {
  it('43. production export has no mutation-capable executor API', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(src.includes('export function createTestDisposableExecutor'), false);
    assert.equal(src.includes('export const createTestDisposableExecutor'), false);
    assert.equal(src.includes('export function buildMatrixIndependentCatalogFixture'), false);
  });
  it('44. injected production executor reaches P0-P1 PASS before matrix-catalog oracle stop', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.ok, false);
    assert.equal(report.failure_boundary, 'oracle_comparison');
    assert.ok(report.phases.length >= 2);
    assert.deepEqual(report.phases.slice(0, 2).map((p) => p.phase), ['P0', 'P1']);
    assert.ok(report.phases.slice(0, 2).every((p) => p.runtime_validation_status === 'PASS'));
    rmSync(parent, { recursive: true, force: true });
  });
  it('45. happy path POSTGRES_PASSWORD only in env', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    const runEnv = runner.envs.find((env) => env.POSTGRES_PASSWORD);
    assert.ok(runEnv?.POSTGRES_PASSWORD);
    assert.ok(!JSON.stringify(runner.commands).includes(runEnv.POSTGRES_PASSWORD));
    rmSync(parent, { recursive: true, force: true });
  });
  it('46. function parity uses actual parsed values', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.function_parity.length, 2);
    assert.equal(report.function_parity[0].definition_hash, FUNCTION_PARITY_TARGETS[0].expected_hash);
    rmSync(parent, { recursive: true, force: true });
  });
  it('47. oracle file not mutated', () => {
    const oraclePath = join(REPO_ROOT, 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json');
    const before = readFileSync(oraclePath, 'utf8');
    const { parent, workspaceRoot } = makeWorkspace();
    executor().execute(REPO_ROOT, {
      workspaceRoot,
      runner: createCatalogAlignedRunner(workspaceRoot),
      nonce: FIXED_NONCE,
    });
    assert.equal(readFileSync(oraclePath, 'utf8'), before);
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R2 — failure injection', () => {
  const early: FailureBoundary[] = ['image_pull', 'container_run', 'readiness', 'p0_bootstrap', 'p0_preflight'];
  for (const [i, boundary] of early.entries()) {
    it(`${48 + i}. injected failure at ${boundary}`, () => {
      const { parent, workspaceRoot } = makeWorkspace();
      const report = executor().execute(REPO_ROOT, {
        workspaceRoot,
        runner: createCatalogAlignedRunner(workspaceRoot),
        nonce: FIXED_NONCE,
        injectFailureAt: boundary,
      });
      assert.equal(report.ok, false);
      assert.equal(report.failure_boundary, boundary);
      rmSync(parent, { recursive: true, force: true });
    });
  }
  it('53. oracle comparison mismatch fails', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const originalRun = runner.run.bind(runner);
    let snap = 0;
    runner.run = (command, options) => {
      const stdin = options?.stdin ?? '';
      if (stdin.includes('runtime_catalog:') && snap++ === 1) {
        const raw = literalCatalogForPhase(oraclePhases()[0]);
        raw.relations = ['x'];
        return {
          exitCode: 0,
          stdout: formatPsqlJsonOutput(raw),
          stderr: '',
        };
      }
      return originalRun(command, options);
    };
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.failure_boundary, 'oracle_comparison');
    rmSync(parent, { recursive: true, force: true });
  });
  it('54. function parity mismatch fails', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    const originalRun = runner.run.bind(runner);
    runner.run = (command, options) => {
      if ((options?.stdin ?? '').includes('pg_get_functiondef')) {
        return {
          exitCode: 0,
          stdout: formatPsqlJsonOutput([{
            function_identity: FUNCTION_PARITY_TARGETS[0].identity,
            definition_hash: 'bad',
            definition_character_length: 1,
            identity_arguments: FUNCTION_PARITY_TARGETS[0].identity_arguments,
          }, {
            function_identity: FUNCTION_PARITY_TARGETS[1].identity,
            definition_hash: FUNCTION_PARITY_TARGETS[1].expected_hash,
            definition_character_length: FUNCTION_PARITY_TARGETS[1].expected_character_length,
            identity_arguments: FUNCTION_PARITY_TARGETS[1].identity_arguments,
          }]),
          stderr: '',
        };
      }
      return originalRun(command, options);
    };
    const report = executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(report.failure_boundary, 'function_parity');
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R2 — CLI', () => {
  it('55. verify-frozen-inputs side-effect free', () => {
    const calls: string[][] = [];
    const runner: InjectedRunner = {
      run(command) {
        calls.push([...command]);
        return dockerReadOnlyMockResponse(command);
      },
    };
    const result = runDisposableExecutionCli(
      REPO_ROOT,
      {
        help: false,
        planExecution: false,
        verifyFrozenInputs: true,
        executeLocal: false,
      },
      { runner }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.payload.docker_evidence.classification, 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_NOT_PRESENT');
    assert.equal(calls.some((cmd) => cmd.join(' ').includes('docker pull')), false);
    assert.equal(calls.some((cmd) => cmd.join(' ').includes('docker run')), false);
  });
  it('56. execute-local revision_4 error', () => {
    const result = runDisposableExecutionCli(REPO_ROOT, {
      help: false,
      planExecution: false,
      verifyFrozenInputs: false,
      executeLocal: true,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.payload.error, EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR);
  });
  it('57. CLI help references revision_4', () => {
    const script = join(REPO_ROOT, 'scripts/m55/runPreviewBaselineDisposableFixture.ts');
    const result = spawnSync(process.execPath, ['--experimental-strip-types', script, '--help'], {
      encoding: 'utf8',
    });
    assert.match(result.stdout, /REVISION-4/);
    assert.match(result.stdout, /revision_4/);
  });
  it('58. CLI execute-local exits 1', () => {
    const script = join(REPO_ROOT, 'scripts/m55/runPreviewBaselineDisposableFixture.ts');
    const result = spawnSync(process.execPath, ['--experimental-strip-types', script, '--execute-local'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
  });
  it('59. plan-execution requires workspace', () => {
    assert.equal(
      runDisposableExecutionCli(REPO_ROOT, {
        help: false,
        planExecution: true,
        verifyFrozenInputs: false,
        executeLocal: false,
      }).exitCode,
      1
    );
  });
});

describe('previewBaselineDisposableRuntime R2 — plan and frozen', () => {
  it('60. validateFrozenInputs passes', () => {
    const frozen = validateFrozenInputs(REPO_ROOT);
    assert.equal(frozen.oracle_sha256, EXPECTED_EXECUTION_ORACLE_SHA256);
    assert.equal(frozen.baseline_sha256, EXPECTED_BASELINE_ARTIFACT_SHA256);
  });
  it('61. plan has cleanup inspect and rm templates', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
    assert.ok(plan.cleanup_inspect_template.join(' ').includes('inspect'));
    assert.ok(plan.cleanup_rm_template.join(' ').includes('docker rm'));
    rmSync(parent, { recursive: true, force: true });
  });
  it('62. seven migration steps', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    assert.equal(buildMigrationApplyPlan(REPO_ROOT, workspaceRoot).length, 7);
    rmSync(parent, { recursive: true, force: true });
  });
  it('63. no host port in plan', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const joined = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot }).docker_run_template.join(' ');
    assert.ok(!joined.includes(' -p '));
    rmSync(parent, { recursive: true, force: true });
  });
  it('64. network none in plan', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const joined = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot }).docker_run_template.join(' ');
    assert.ok(joined.includes('--network none'));
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R2 — category mutation matrix', () => {
  const categories = [
    'columns_present',
    'constraints_present',
    'indexes_present',
    'privileges',
    'functions_present',
    'state_specific_presence',
  ];
  for (const [index, category] of categories.entries()) {
    it(`${65 + index}. mutation of ${category} fails oracle compare`, () => {
      const phase = oraclePhases()[3];
      const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
      snapshot[category] = ['mutated'];
      assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
    });
  }
});

describe('previewBaselineDisposableRuntime R2 — SQL builders', () => {
  it('71. role bootstrap sql present', () => assert.match(buildRoleBootstrapSql(), /service_role/));
  it('72. fixture metadata outside public', () => {
    const sql = buildFixtureMetadataSql({
      fixtureRevision: DISPOSABLE_RUNTIME_REVISION,
      oracleRevision: EXECUTION_ORACLE_REVISION,
      oracleSha256: EXPECTED_EXECUTION_ORACLE_SHA256,
      manifestSha256: EXPECTED_MANIFEST_ARTIFACT_SHA256,
      migrationTupleHash: 'x',
      databaseName: 'db',
      containerName: 'ctr',
      creationNonce: FIXED_NONCE,
    });
    assert.match(sql, /m55_fixture_meta/);
  });
  it('73. P0 sql emits json_build_object', () => {
    assert.match(buildP0PreflightSql(buildDisposableIdentity(FIXED_NONCE), 'hash'), /current_database/);
  });
  it('74. snapshot sql emits json_build_object', () => {
    assert.match(collectRuntimeCatalogSql(), /runtime_catalog:relations/);
  });
  it('75. function parity sql uses md5 and length', () => {
    const sql = buildFunctionParitySql();
    assert.match(sql, /md5\(pg_get_functiondef/);
    assert.match(sql, /length\(pg_get_functiondef/);
  });
});

describe('previewBaselineDisposableRuntime P5 — role bootstrap contract', () => {
  const sql = () => buildRoleBootstrapSql();

  it('88. service_role absent path creates NOLOGIN BYPASSRLS', () => {
    assert.match(sql(), /CREATE ROLE service_role NOLOGIN BYPASSRLS;/);
  });

  it('89. service_role existing path enforces NOLOGIN BYPASSRLS', () => {
    assert.match(sql(), /ALTER ROLE service_role NOLOGIN BYPASSRLS;/);
  });

  it('90. bootstrap SQL asserts service_role rolbypassrls=true', () => {
    assert.match(sql(), /service_role\.rolbypassrls is not true/);
  });

  it('91. bootstrap SQL asserts service_role rolcanlogin=false', () => {
    assert.match(sql(), /service_role\.rolcanlogin is not false/);
  });

  it('92. anon and authenticated remain NOBYPASSRLS NOLOGIN', () => {
    assert.match(sql(), /CREATE ROLE anon NOLOGIN NOBYPASSRLS;/);
    assert.match(sql(), /CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;/);
    assert.match(sql(), /ALTER ROLE anon NOLOGIN NOBYPASSRLS;/);
    assert.match(sql(), /ALTER ROLE authenticated NOLOGIN NOBYPASSRLS;/);
    assert.match(sql(), /anon bootstrap contract violated/);
    assert.match(sql(), /authenticated bootstrap contract violated/);
  });

  it('93. bootstrap SQL forbids SUPERUSER', () => {
    assert.match(sql(), /rolsuper/);
    assert.equal(sql().includes('SUPERUSER'), false);
  });

  it('94. bootstrap SQL forbids CREATEDB', () => {
    assert.match(sql(), /rolcreatedb/);
    assert.equal(sql().includes('CREATEDB'), false);
  });

  it('95. bootstrap SQL forbids CREATEROLE', () => {
    assert.match(sql(), /rolcreaterole/);
    assert.equal(sql().includes('CREATEROLE'), false);
  });

  it('96. bootstrap SQL forbids REPLICATION', () => {
    assert.match(sql(), /rolreplication/);
    assert.equal(sql().includes('REPLICATION'), false);
  });

  it('97. bootstrap SQL does not set role passwords', () => {
    assert.equal(sql().toUpperCase().includes('PASSWORD'), false);
  });

  it('98. mutation removing BYPASSRLS is rejected by bootstrap assertions', () => {
    const mutated = sql().replace(/BYPASSRLS/g, 'NOBYPASSRLS');
    assert.notEqual(mutated, sql());
    assert.equal(mutated.includes('service_role.rolbypassrls is not true'), true);
    assert.throws(
      () => validateRoleBootstrapProof({
        anon: { exists: true, rolcanlogin: false, rolbypassrls: false },
        authenticated: { exists: true, rolcanlogin: false, rolbypassrls: false },
        service_role: { exists: true, rolcanlogin: false, rolbypassrls: false },
      }),
      /role_bootstrap_proof_service_role_contract_violated/
    );
  });

  it('99. mutation enabling LOGIN is rejected by bootstrap assertions', () => {
    assert.throws(
      () => validateRoleBootstrapProof({
        anon: { exists: true, rolcanlogin: false, rolbypassrls: false },
        authenticated: { exists: true, rolcanlogin: false, rolbypassrls: false },
        service_role: { exists: true, rolcanlogin: true, rolbypassrls: true },
      }),
      /role_bootstrap_proof_service_role_contract_violated/
    );
    assert.equal(sql().includes(' LOGIN'), false);
  });

  it('100. execution oracle SHA pin remains unchanged', () => {
    assert.equal(EXPECTED_EXECUTION_ORACLE_SHA256, '52832c14d55bba8b6194065aa17901c7373d39d208e8175781d729be17855062');
    assert.equal(validateFrozenInputs(REPO_ROOT).oracle_sha256, EXPECTED_EXECUTION_ORACLE_SHA256);
  });

  it('101. canonical P5 migration SHA remains unchanged', () => {
    const migration = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000004');
    assert.ok(migration);
    assert.equal(
      sha256File(join(REPO_ROOT, migration.sourcePath)),
      '40d865c874152c49706ea1fbf2eb9bb873d2d629aa758ff77877dcc25967492d'
    );
  });

  it('102. buildRoleBootstrapSql output is deterministic', () => {
    assert.equal(buildRoleBootstrapSql(), buildRoleBootstrapSql());
  });

  it('103. role bootstrap proof SQL emits anon/authenticated/service_role attributes', () => {
    const proofSql = buildRoleBootstrapProofSql();
    assert.match(proofSql, /'anon'/);
    assert.match(proofSql, /'authenticated'/);
    assert.match(proofSql, /'service_role'/);
    assert.match(proofSql, /rolcanlogin/);
    assert.match(proofSql, /rolbypassrls/);
  });
});

describe('previewBaselineDisposableRuntime R2 — flags and misc', () => {
  it('76. parse plan-execution flag', () => assert.equal(parseDisposableExecutionFlags(['--plan-execution']).planExecution, true));
  it('77. parse verify-frozen-inputs flag', () => assert.equal(parseDisposableExecutionFlags(['--verify-frozen-inputs']).verifyFrozenInputs, true));
  it('78. identity prefix exact', () => {
    const id = buildDisposableIdentity(FIXED_NONCE);
    assert.ok(id.container_name.startsWith(CONTAINER_NAME_PREFIX));
  });
  it('79. docker pull arm64', () => assert.deepEqual(buildDockerPullCommand().slice(0, 4), ['docker', 'pull', '--platform', 'linux/arm64']));
  it('80. readiness uses docker exec', () => assert.equal(buildReadinessCommand(buildDisposableIdentity(FIXED_NONCE))[0], 'docker'));
  it('81. cleanup templates exist', () => {
    const cleanup = buildFailureCleanupPlan(buildDisposableIdentity(FIXED_NONCE));
    assert.ok(cleanup.inspect.length > 0);
    assert.ok(cleanup.rm.length > 0);
  });
  it('82. validate execution plan passes', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    validateExecutionPlan(buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot }));
    rmSync(parent, { recursive: true, force: true });
  });
  it('83. floating tag rejected', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
    plan.docker_run_template = [...plan.docker_run_template];
    plan.docker_run_template[plan.docker_run_template.length - 1] = 'postgres:17.6-bookworm';
    assert.throws(() => validateExecutionPlan(plan), /floating_tag_forbidden/);
    rmSync(parent, { recursive: true, force: true });
  });
  it('84. matrix sha frozen', () => assert.equal(validateFrozenInputs(REPO_ROOT).matrix_sha256, EXPECTED_MATRIX_ARTIFACT_SHA256));
  it('85. manifest sha frozen', () => assert.equal(validateFrozenInputs(REPO_ROOT).manifest_sha256, EXPECTED_MANIFEST_ARTIFACT_SHA256));
  it('86. plan execution CLI with workspace', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const result = runDisposableExecutionCli(REPO_ROOT, {
      help: false,
      planExecution: true,
      verifyFrozenInputs: false,
      executeLocal: false,
      workspaceRoot,
    });
    assert.equal(result.exitCode, 0);
    rmSync(parent, { recursive: true, force: true });
  });
  it('87. injected function parity failure after P1 snapshot', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const report = executor().execute(REPO_ROOT, {
      workspaceRoot,
      runner: createCatalogAlignedRunner(workspaceRoot),
      nonce: FIXED_NONCE,
      injectFailureAt: 'function_parity',
    });
    assert.equal(report.failure_boundary, 'function_parity');
    assert.deepEqual(report.phases.map((p) => p.phase), ['P0', 'P1']);
    rmSync(parent, { recursive: true, force: true });
  });
  it('88. each happy phase lists compared categories', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const report = executor().execute(REPO_ROOT, {
      workspaceRoot,
      runner: createCatalogAlignedRunner(workspaceRoot),
      nonce: FIXED_NONCE,
    });
    assert.ok(report.phases.every((phase) => phase.compared_categories.length === SNAPSHOT_COMPARE_CATEGORIES.length));
    rmSync(parent, { recursive: true, force: true });
  });
  it('89. no host psql in commands', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const runner = createCatalogAlignedRunner(workspaceRoot);
    executor().execute(REPO_ROOT, { workspaceRoot, runner, nonce: FIXED_NONCE });
    assert.equal(runner.commands.some((cmd) => cmd[0] === 'psql'), false);
    rmSync(parent, { recursive: true, force: true });
  });
  it('90. production runtime file has no ts-nocheck directive', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(src.includes('@ts-nocheck'), false);
  });
  it('91. production CLI file has no ts-nocheck directive', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/m55/runPreviewBaselineDisposableFixture.ts'), 'utf8');
    assert.equal(src.includes('@ts-nocheck'), false);
  });
  it('92. collectDockerReadOnlyEvidence uses read-only commands', () => {
    const calls: string[][] = [];
    const runner: InjectedRunner = {
      run(command) {
        calls.push([...command]);
        return dockerReadOnlyMockResponse(command);
      },
    };
    const evidence = validateDockerReadOnlyEvidence(collectDockerReadOnlyEvidence(runner));
    assert.equal(evidence.classification, 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_NOT_PRESENT');
    assert.ok(calls.some((cmd) => {
      const joined = cmd.join(' ');
      return joined.includes('docker --context') && joined.includes(' version');
    }));
    const contextShowCall = calls.find((cmd) => cmd.join(' ').includes('docker context show'));
    assert.deepEqual(contextShowCall, ['docker', 'context', 'show']);
    assert.equal(contextShowCall?.includes('--format'), false);
    assert.equal(calls.some((cmd) => cmd.join(' ').includes('docker pull')), false);
    assert.equal(calls.some((cmd) => cmd.join(' ').includes('POSTGRES_PASSWORD')), false);
  });
});

describe('previewBaselineDisposableRuntime R3 — catalog extraction', () => {
  for (const extractor of RUNTIME_CATALOG_EXTRACTORS) {
    it(`93-${extractor}. catalog SQL includes ${extractor}`, () => {
      assert.match(collectRuntimeCatalogSql(), new RegExp(`runtime_catalog:${extractor}`));
    });
  }
  for (const phaseId of ['P0', 'P1']) {
    it(`catalog normalize ${phaseId} matrix literal matches oracle`, () => {
      const phase = oraclePhases().find((p) => p.phase === phaseId);
      const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
      assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, true);
    });
  }
  it('catalog normalize P5 uses deliberate small raw fixture', () => {
    const phase = oraclePhases().find((p) => p.phase === 'P5');
    const raw = {
      application_relation_counts: { entitlements: 0 },
      app_relations: [],
      relations: ['entitlements'],
      columns: [{
        schema_name: 'public',
        relation_name: 'entitlements',
        column_name: 'id',
        ordinal_position: 1,
        formatted_type: 'uuid',
        is_nullable: false,
        default_present: true,
        default_expression: 'gen_random_uuid()',
      }],
      constraints: [],
      indexes: [],
      policies: [],
      privileges: [],
      relation_security: [{
        schema_name: 'public',
        relation_name: 'entitlements',
        owner_role: 'postgres',
        rls_enabled: true,
        force_rls_enabled: false,
      }],
      functions: [],
      user_defined_triggers: [],
      internal_trigger_groups: [],
      history_prefix: expectedPhaseHistoryPrefix('P5'),
    };
    raw.relations = [];
    const snapshot = deriveRuntimePhaseSnapshot(raw, phase);
    assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
  });
  it('catalog SQL has no hardcoded application_row_count zero', () => {
    assert.equal(collectRuntimeCatalogSql().includes("'application_row_count', 0"), false);
  });
});

describe('previewBaselineDisposableRuntime R3 — env and plan binding', () => {
  it('strips inherited DATABASE_URL from child env', () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://secret@host/db';
    const env = mergeChildProcessEnv('password-32-chars-minimum-value!!');
    assert.equal(env.DATABASE_URL, undefined);
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });
  it('docker run template includes POSTGRES_PASSWORD key forwarding', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const cmd = buildDockerRunCommand(identity, {
      fixture: 'true',
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      oracle_sha256: 'a',
      manifest_sha256: 'b',
      creation_nonce: identity.nonce,
    });
    const idx = cmd.indexOf('POSTGRES_PASSWORD');
    assert.ok(idx >= 0);
    assert.equal(cmd[idx - 1], '-e');
  });
  it('execution plan nonce mismatch fails validation', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
    plan.bound_creation_nonce = 'b'.repeat(32);
    const identity = buildDisposableIdentity(FIXED_NONCE);
    assert.throws(
      () =>
        validateExecutionPlanIdentity(
          plan,
          identity,
          {
            fixture: 'true',
            runtime_revision: DISPOSABLE_RUNTIME_REVISION,
            oracle_sha256: 'a',
            manifest_sha256: 'b',
            creation_nonce: identity.nonce,
          }
        ),
      /execution_plan_nonce_mismatch/
    );
    rmSync(parent, { recursive: true, force: true });
  });
  it('instantiateExecutionPlanForIdentity rebinds templates', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const plan = buildDisposableExecutionPlan(REPO_ROOT, { workspaceRoot });
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const labels = {
      fixture: 'true' as const,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      oracle_sha256: plan.oracle_sha256,
      manifest_sha256: validateFrozenInputs(REPO_ROOT).manifest_sha256,
      creation_nonce: identity.nonce,
    };
    const bound = instantiateExecutionPlanForIdentity(plan, identity, labels);
    assert.equal(bound.bound_creation_nonce, identity.nonce);
    assert.ok(bound.docker_run_template.join(' ').includes(identity.container_name));
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R3 — cleanup classification', () => {
  it('No such object proves absence', () => {
    assert.equal(isContainerAbsentProof(1, '', 'Error: No such object'), true);
  });
  it('daemon failure is not absence proof', () => {
    assert.equal(isCleanupTransportFailure('Cannot connect to the Docker daemon'), true);
    assert.equal(isContainerAbsentProof(1, '', 'Cannot connect to the Docker daemon'), false);
  });
});

describe('previewBaselineDisposableRuntime R3 — success report', () => {
  it('injected production executor cleans up container on oracle stop', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const report = executor().execute(REPO_ROOT, {
      workspaceRoot,
      runner: createCatalogAlignedRunner(workspaceRoot),
      nonce: FIXED_NONCE,
    });
    assert.equal(report.ok, false);
    assert.equal(report.container_lifecycle, 'REMOVED');
    assert.equal(report.cleanup_proof?.attempted, true);
    assert.equal(report.cleanup_proof?.container_removed, true);
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableRuntime R4 — delta regressions', () => {
  it('D1 P0 application counts SQL avoids direct missing-table references', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /pg_class/);
    assert.match(sql, /EXECUTE format\('SELECT count\(\*\) FROM %I\.%I'/);
    assert.equal(sql.includes('n_live_tup'), false);
    assert.equal(sql.includes('FROM public.app_users'), false);
  });
  it('D2 FK catalog SQL includes action and target normalization fields', () => {
    const sql = collectRuntimeCatalogSql();
    for (const field of ['match_type', 'delete_action', 'update_action', 'target_schema', 'target_relation', 'source_columns', 'target_columns']) {
      assert.match(sql, new RegExp(field));
    }
  });
  it('D3 index constraint_backed uses pg_constraint.conindid only', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /pc\.conindid = ix\.indexrelid/);
  });
  it('D3 standalone unique index reports constraint_backed false', () => {
    const phase = oraclePhases().find((p) => p.phase === 'P1');
    const raw = literalCatalogForPhase(phase);
    const standalone = (raw.indexes ?? []).find((ix) => ix.constraint_backed === false);
    assert.ok(standalone, 'expected standalone unique index in independent fixture');
  });
  it('D4 internal trigger groups include 34 matrix-authored groups for P1', () => {
    const phase = oraclePhases().find((p) => p.phase === 'P1');
    const raw = literalCatalogForPhase(phase);
    assert.equal((raw.internal_trigger_groups ?? []).length, 34);
    assert.equal(compareRuntimePhaseSnapshot(deriveRuntimePhaseSnapshot(raw, phase), phase).ok, true);
  });
  it('D5 function catalog SQL preserves provolatile proparallel proconfig search_path', () => {
    const sql = collectRuntimeCatalogSql();
    for (const field of ['volatility', 'parallel_safety', 'proconfig', 'search_path']) {
      assert.match(sql, new RegExp(field));
    }
  });
  it('D6 trigger enabled state preserves tgenabled code', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /t\.tgenabled::text AS enabled_state/);
    assert.equal(sql.includes("'ENABLED'"), false);
  });
  it('D7 state object presence includes app.user_profiles and constraint/index names', () => {
    const phase = oraclePhases().find((p) => p.phase === 'P5');
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    assert.ok(snapshot.state_specific_presence.length > 0 || snapshot.state_specific_absence.length > 0);
    const badPhase = { ...phase, state_specific_presence: [{ state: 'P5', object: 'bad..syntax' }] };
    assert.throws(() => deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), badPhase), /state_object_syntax_invalid/);
  });
  it('D8 production executor source forbids oracle clone and catalog_row_seed', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    const executeBlock = src.slice(src.indexOf('function executeDisposablePlanInternal'));
    assert.equal(executeBlock.includes('catalog_row_seed'), false);
    assert.equal(executeBlock.includes('buildRawCatalogFromOraclePhase'), false);
    assert.equal(executeBlock.includes('buildMatrixIndependentCatalogFixture'), false);
    assert.equal(src.includes('export const buildRawCatalogFromOraclePhase'), false);
  });
  it('D9 public export has no executor or oracle override seam', () => {
    const runtimeSrc = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(runtimeSrc.includes('export function createTestDisposableExecutor'), false);
    assert.equal(runtimeSrc.includes('export function obtainDisposableTestAuthority'), false);
    assert.equal(runtimeSrc.includes('migrationBytesOverride'), false);
    assert.equal(runtimeSrc.includes('oraclePhases?:'), false);
  });
  it('D10 remote Docker endpoint rejected and metadata env excludes DB password', () => {
    const runner: InjectedRunner = {
      run(command) {
        const joined = command.join(' ');
        if (joined.includes('docker context show')) {
          return { exitCode: 0, stdout: 'remote\n', stderr: '' };
        }
        if (joined.includes('context inspect')) {
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              Name: 'remote',
              Endpoints: { docker: { Host: 'tcp://192.168.1.10:2375' } },
            }),
            stderr: '',
          };
        }
        if (joined.includes('docker --context')) {
          return { exitCode: 0, stdout: '', stderr: '' };
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      },
    };
    assert.throws(() => collectDockerReadOnlyEvidence(runner), /docker_endpoint_remote_forbidden/);
    const metadataEnv = mergeDockerMetadataEnv();
    assert.equal(metadataEnv.POSTGRES_PASSWORD, undefined);
    assert.equal(metadataEnv.PGPASSWORD, undefined);
  });
  it('D11 only exact No such image classifies absence; generic not found fails', () => {
    const okRunner: InjectedRunner = {
      run(command) {
        return dockerReadOnlyMockResponse(command);
      },
    };
    assert.doesNotThrow(() => validateDockerReadOnlyEvidence(collectDockerReadOnlyEvidence(okRunner)));
    const badRunner: InjectedRunner = {
      run(command) {
        const joined = command.join(' ');
        if (joined.includes('image inspect')) {
          return { exitCode: 1, stdout: '', stderr: 'image not found' };
        }
        return dockerReadOnlyMockResponse(command);
      },
    };
    assert.throws(() => collectDockerReadOnlyEvidence(badRunner), /docker_image_inspect_failed/);
  });
  it('D12 full P0-P7 runtime GREEN is PENDING_HUMAN_DISPOSABLE_EXECUTION', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const report = executor().execute(REPO_ROOT, {
      workspaceRoot,
      runner: createCatalogAlignedRunner(workspaceRoot),
      nonce: FIXED_NONCE,
    });
    assert.equal(report.ok, false);
    assert.equal(report.failure_boundary, 'oracle_comparison');
    assert.ok(report.phases.length < 8);
    rmSync(parent, { recursive: true, force: true });
  });
  it('D13 migration authority rejects attacker file mutation before apply', () => {
    const { parent, workspaceRoot } = makeWorkspace();
    const steps = buildMigrationApplyPlan(REPO_ROOT, workspaceRoot);
    writeFileSync(steps[0].migration_path, '-- attacker\n', 'utf8');
    assert.throws(
      () =>
        executor().execute(REPO_ROOT, {
          workspaceRoot,
          runner: createCatalogAlignedRunner(workspaceRoot),
          nonce: FIXED_NONCE,
        }),
      /Workspace migration SHA mismatch/
    );
    rmSync(parent, { recursive: true, force: true });
  });
  it('D14 revision constants are Revision-4', () => {
    assert.equal(DISPOSABLE_RUNTIME_REVISION, 'PREVIEW-BASELINE-DISPOSABLE-RUNTIME-v1-REVISION-4');
    assert.equal(EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR, 'local_execution_implemented_but_not_authorized_revision_4');
  });
  it('nonzero application row count fails comparison', () => {
    const phase = oraclePhases()[1];
    const raw = literalCatalogForPhase(phase);
    raw.application_relation_counts = { app_users: 1 };
    const snapshot = deriveRuntimePhaseSnapshot(raw, phase);
    assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
  });
  it('present absent complement mismatch fails', () => {
    const phase = oraclePhases()[1];
    const snapshot = deriveRuntimePhaseSnapshot(literalCatalogForPhase(phase), phase);
    snapshot.relations_absent = [];
    assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
  });
  it('wrong docker architecture fails validation', () => {
    assert.throws(
      () =>
        validateDockerReadOnlyEvidence({
          ...LOCAL_DOCKER_EVIDENCE_BASE,
          server_architecture: 'linux/amd64',
          image_present_locally: false,
          pinned_image_digest: null,
        }),
      /docker_architecture_invalid/
    );
  });
  it('image digest mismatch fails validation', () => {
    assert.throws(
      () =>
        validateDockerReadOnlyEvidence({
          ...LOCAL_DOCKER_EVIDENCE_BASE,
          image_present_locally: true,
          pinned_image_digest: null,
        }),
      /docker_pinned_digest_mismatch/
    );
  });
  it('P0 marker migration tuple hash mismatch fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.marker.migration_tuple_hash = 'bad';
    assert.throws(
      () => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'),
      /p0_marker_migration_tuple_hash_mismatch/
    );
  });
  it('P0 local_only_assertion false fails', () => {
    const identity = buildDisposableIdentity(FIXED_NONCE);
    const payload = p0PreflightPayload(identity, 'tuple-hash');
    payload.marker.local_only_assertion = false;
    assert.throws(
      () => validateP0PreflightResult(payload, identity, validateFrozenInputs(REPO_ROOT), 'tuple-hash'),
      /p0_marker_local_only_assertion_invalid/
    );
  });
  it('function identity arguments mismatch fails parity', () => {
    const rows = FUNCTION_PARITY_TARGETS.map((fn) => ({
      function_identity: fn.identity,
      definition_hash: fn.expected_hash,
      definition_character_length: fn.expected_character_length,
      identity_arguments: 'wrong args',
    }));
    assert.throws(
      () => parseFunctionParityOutput(formatPsqlJsonOutput(rows)),
      /function_parity_identity_arguments_mismatch/
    );
  });
  it('strips inherited STRIPE and SUPABASE secrets', () => {
    const previousStripe = process.env.STRIPE_SECRET_KEY;
    const previousSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_x';
    const env = mergeChildProcessEnv('password-32-chars-minimum-value!!');
    assert.equal(env.STRIPE_SECRET_KEY, undefined);
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined);
    if (previousStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripe;
    if (previousSupabase === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabase;
  });
});

describe('previewBaselineDisposableRuntime REV4-PATCH-1 — residual regressions', () => {
  it('P1 exact COUNT bootstrap avoids n_live_tup and includes clerk_webhook_events', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /EXECUTE format\('SELECT count\(\*\) FROM %I\.%I'/);
    assert.equal(sql.includes('n_live_tup'), false);
    assert.match(sql, /clerk_webhook_events/);
    assert.match(sql, /pg_temp\.m55_application_relation_counts/);
  });
  it('P1 exact row count detects rows despite stale stats', () => {
    const raw = {
      application_relation_counts: { consult_messages: 3 },
      relations: ['consult_messages'],
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
      privileges: [],
      relation_security: [],
      functions: [],
      user_defined_triggers: [],
      internal_trigger_groups: [],
      history_prefix: [],
    };
    const normalized = deriveRuntimePhaseSnapshot(raw, { phase: 'P0', relations_present: [], relations_absent: [] });
    assert.equal(normalized.application_row_count, 3);
  });
  it('P2 PUBLIC privilege uses aclexplode grantee 0 not role lookup', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /aclexplode/);
    assert.match(sql, /acl\.grantee = 0/);
    assert.equal(sql.includes("has_table_privilege('PUBLIC'"), false);
    const granted = {
      application_relation_counts: {},
      relations: ['demo'],
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
      privileges: [{ cell_id: 'priv.demo.PUBLIC.SELECT', effective_privilege: true }],
      relation_security: [],
      functions: [],
      user_defined_triggers: [],
      internal_trigger_groups: [],
      history_prefix: [],
    };
    const revoked = {
      ...granted,
      privileges: [{ cell_id: 'priv.demo.PUBLIC.SELECT', effective_privilege: false }],
    };
    const phase = { phase: 'P1', privileges: ['priv.demo.PUBLIC.SELECT'], relations_present: ['demo'], relations_absent: [] };
    assert.notEqual(
      deriveRuntimePhaseSnapshot(granted, phase).privileges[0],
      deriveRuntimePhaseSnapshot(revoked, phase).privileges[0]
    );
  });
  it('P3 referenced-side candidate ID uses conrelid source relation', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /conrel_ns\.nspname, conrel\.relname, con\.conname/);
    const groups = aggregateInternalTriggerSemanticGroups(TWO_SIDED_FK_INTERNAL_TRIGGER_ROWS);
    assert.equal(groups.length, 2);
    assert.ok(
      groups.every((g) => g.candidate_constraint_contract_ids[0] === 'internal_fk:public.child_orders:child_orders_parent_id_fkey')
    );
    assert.equal(groups.find((g) => g.side === 'referenced')?.relation_name, 'parent_accounts');
  });
  it('P4 literal catalog fixtures are matrix-authored without production oracle clone', () => {
    const runtimeSrc = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(runtimeSrc.includes('buildMatrixIndependentCatalogFixture'), false);
    const phase = oraclePhases().find((p) => p.phase === 'P1');
    const raw = literalCatalogFromMatrix(CONTRACT_MATRIX, 'P1', {});
    raw.relations = ['mutated_relation_only'];
    const snapshot = deriveRuntimePhaseSnapshot(raw, phase);
    assert.equal(compareRuntimePhaseSnapshot(snapshot, phase).ok, false);
    assert.equal(compareRuntimePhaseSnapshot(deriveRuntimePhaseSnapshot(raw, phase), phase).ok, false);
    assert.equal(compareRuntimePhaseSnapshot(deriveRuntimePhaseSnapshot(literalCatalogFromMatrix(CONTRACT_MATRIX, 'P1', {}), phase), phase).ok, true);
  });
  it('P5 forged filename cannot reach production executor export', () => {
    const runtimeSrc = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(/export function\s+createTestDisposableExecutor/.test(runtimeSrc), false);
    assert.equal(runtimeSrc.includes('executeDisposablePlanInternal'), true);
    assert.equal(runtimeSrc.includes('export function executeDisposablePlanInternal'), false);
    assert.equal(runtimeSrc.includes('export function executeDisposablePlanWithInjectedRunner'), true);
    assert.throws(
      () => executeDisposablePlanWithInjectedRunner(REPO_ROOT, { workspaceRoot: '/tmp', runner: undefined as never }),
      /injected_runner_required/
    );
  });
  it('P6 DOCKER_HOST rejected and explicit context commands required', () => {
    const previous = process.env.DOCKER_HOST;
    process.env.DOCKER_HOST = 'tcp://127.0.0.1:2375';
    assert.throws(() => mergeDockerMetadataEnv(), /docker_host_inherited_forbidden/);
    if (previous === undefined) delete process.env.DOCKER_HOST;
    else process.env.DOCKER_HOST = previous;
    const calls = [];
    const runner = {
      run(command) {
        calls.push(command.join(' '));
        return dockerReadOnlyMockResponse(command);
      },
    };
    collectDockerReadOnlyEvidence(runner);
    assert.ok(calls.some((cmd) => cmd.includes('docker context show')));
    assert.ok(calls.every((cmd) => !cmd.startsWith('docker version') || cmd.includes('--context')));
    assert.throws(
      () =>
        validateDockerReadOnlyEvidence({
          ...LOCAL_DOCKER_EVIDENCE_BASE,
          docker_endpoint: 'unix:///tmp/docker.sock',
        }),
      /docker_endpoint_remote_forbidden/
    );
    assert.equal(isApprovedDockerDesktopEndpoint('unix:///Users/test/.docker/run/docker.sock'), true);
    assert.equal(isApprovedDockerDesktopEndpoint('unix:///tmp/docker.sock'), false);
  });
  it('P7 success report requires oracle hash history cleanup and function actuals', () => {
    const bad = {
      ok: true,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: 'x',
      database_name: 'y',
      container_lifecycle: 'REMOVED',
      phases: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map((phase) => ({
        phase,
        runtime_snapshot_hash: 'hash',
        runtime_validation_status: 'PASS',
        oracle_contract_hash: phase === 'P0' ? '' : 'oracle',
        compared_categories: [...SNAPSHOT_COMPARE_CATEGORIES],
        mismatch_details: [],
        history_prefix: phase === 'P1' ? [] : expectedPhaseHistoryPrefix(phase),
      })),
      function_parity: FUNCTION_PARITY_TARGETS.map((fn) => ({
        identity: fn.identity,
        status: 'PASS',
        definition_hash: 'bad',
        definition_character_length: fn.expected_character_length,
        identity_arguments: fn.identity_arguments,
      })),
      role_bootstrap_proof: {
        anon: { exists: true, rolcanlogin: false, rolbypassrls: false },
        authenticated: { exists: true, rolcanlogin: false, rolbypassrls: false },
        service_role: { exists: true, rolcanlogin: false, rolbypassrls: true },
      },
      cleanup_proof: { attempted: true, container_removed: false, container_name: 'x', post_removal_absent: true },
      failure_boundary: null,
      error: null,
      cleanup_error: null,
    };
    assert.throws(() => validateExecutionReportSuccess(bad), /execution_report_oracle_contract_hash_empty:P0/);
  });
});

describe('previewBaselineDisposableRuntime REV4-PATCH-2 — final static delta', () => {
  it('count bootstrap uses jsonb accumulator and jsonb_build_object', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /RETURNS jsonb/);
    assert.match(sql, /result jsonb := '\{\}'::jsonb/);
    assert.match(sql, /jsonb_build_object/);
  });
  it('count function has no json accumulator or json_build_object(rel, cnt)', () => {
    const sql = collectRuntimeCatalogSql();
    const start = sql.indexOf('CREATE OR REPLACE FUNCTION pg_temp.m55_application_relation_counts');
    const end = sql.indexOf('END $m55$;', start);
    const fn = sql.slice(start, end + 'END $m55$;'.length);
    assert.equal(fn.includes('result jsonb'), true);
    assert.equal(/\bresult json\b/.test(fn), false);
    assert.equal(fn.includes('json_build_object(rel'), false);
  });
  it('PUBLIC ACL comparison accepts uppercase aclexplode values', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /upper\(acl\.privilege_type\) = priv_type/);
  });
  it('PUBLIC ACL false and true raw cases normalize differently', () => {
    const phase = { phase: 'P1', privileges: ['priv.demo.PUBLIC.SELECT|1'], relations_present: ['demo'], relations_absent: [] };
    const granted = {
      application_relation_counts: {},
      relations: ['demo'],
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
      privileges: [{ cell_id: 'priv.demo.PUBLIC.SELECT', effective_privilege: true }],
      relation_security: [],
      functions: [],
      user_defined_triggers: [],
      internal_trigger_groups: [],
      history_prefix: [],
    };
    const revoked = { ...granted, privileges: [{ cell_id: 'priv.demo.PUBLIC.SELECT', effective_privilege: false }] };
    assert.notEqual(
      deriveRuntimePhaseSnapshot(granted, phase).privileges[0],
      deriveRuntimePhaseSnapshot(revoked, phase).privileges[0]
    );
  });
  it('pg_policies public canonicalizes to PUBLIC in catalog SQL', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /role_name::text = 'public' THEN 'PUBLIC'/);
  });
  it('policy fingerprint matches frozen entitlements PUBLIC SELECT policy', () => {
    const phase = oraclePhases().find((p) => p.phase === 'P1');
    const raw = {
      application_relation_counts: {},
      relations: ['entitlements'],
      columns: [],
      constraints: [],
      indexes: [],
      policies: [{
        schema_name: 'public',
        relation_name: 'entitlements',
        policy_name: 'Enable read access for all users',
        command: 'SELECT',
        roles: ['PUBLIC'],
        permissive: 'PERMISSIVE',
        using_expression: 'true',
        with_check_expression: '',
      }],
      privileges: [],
      relation_security: [],
      functions: [],
      user_defined_triggers: [],
      internal_trigger_groups: [],
      history_prefix: [],
    };
    const snapshot = deriveRuntimePhaseSnapshot(raw, phase);
    assert.equal(
      snapshot.policies[0],
      'public|entitlements|Enable read access for all users|SELECT|PUBLIC|PERMISSIVE|true|'
    );
  });
  it('no oracle-decoded frozen happy path catalog in test file', () => {
    const src = readFileSync(join(REPO_ROOT, 'lib/m55/previewBaselineDisposableRuntime.local.test.ts'), 'utf8');
    assert.equal(src.includes(['FROZEN_LITERAL', '_CATALOG_BY_PHASE ='].join('')), false);
    assert.equal(src.includes(['= runLocal', 'DisposableHarness'].join('')), false);
  });
  it('no buildRawCatalogFromOraclePhase export', () => {
    const runtimeSrc = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(runtimeSrc.includes('buildRawCatalogFromOraclePhase'), false);
  });
  it('decodeCatalogFingerprintsToRawCatalog is isolated decoder-only utility', () => {
    const phase = oraclePhases()[1];
    const decoded = decodeCatalogFingerprintsToRawCatalog(phase);
    assert.ok(Array.isArray(decoded.relations));
    const executeBlock = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8')
      .slice(readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8').indexOf('function executeDisposablePlanInternal'));
    assert.equal(executeBlock.includes('decodeCatalogFingerprintsToRawCatalog'), false);
  });
  it('production executor coverage uses injected entry point not duplicate harness', () => {
    const testSrc = readFileSync(join(REPO_ROOT, 'lib/m55/previewBaselineDisposableRuntime.local.test.ts'), 'utf8');
    assert.equal(testSrc.includes(['= runLocal', 'DisposableHarness'].join('')), false);
    assert.equal(testSrc.includes('executeDisposablePlanWithInjectedRunner'), true);
    const runtimeSrc = readFileSync(join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts'), 'utf8');
    assert.equal(runtimeSrc.includes('export function executeDisposablePlanWithInjectedRunner'), true);
    assert.match(runtimeSrc, /Test-only, non-authoritative injected-runner entry point/);
  });
});

describe('previewBaselineDisposableRuntime REV4-PATCH-3 — PUBLIC function ACL', () => {
  it('uses ACL pseudo-role extraction instead of role-name lookup for PUBLIC EXECUTE', () => {
    const sql = collectRuntimeCatalogSql();
    assert.equal(sql.includes("has_function_privilege('public'"), false);
    assert.match(sql, /aclexplode\(COALESCE\(p\.proacl, acldefault\('f', p\.proowner\)\)\)/);
    assert.match(sql, /acl\.grantee = 0 AND upper\(acl\.privilege_type\) = 'EXECUTE'/);
  });
});

describe('previewBaselineDisposableRuntime LOCAL RETRY-2 — trigger function namespace', () => {
  it('user-defined trigger extractor joins the function namespace catalog', () => {
    const sql = collectRuntimeCatalogSql();
    const start = sql.indexOf("'user_defined_triggers'");
    const end = sql.indexOf("'internal_trigger_catalog_rows'", start);
    const block = sql.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.match(block, /JOIN pg_namespace fn_ns ON fn_ns\.oid = fn\.pronamespace/);
    assert.match(block, /fn_ns\.nspname AS function_schema/);
    assert.equal(block.includes('fn.nspname AS function_schema'), false);
  });
});


describe('previewBaselineDisposableRuntime LOCAL P1 catalog diff correction', () => {
  it('uses pretty constraint deparse to match the frozen Production fingerprint form', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(sql, /pg_get_constraintdef\(con\.oid, true\) AS definition/);
    assert.equal(sql.includes('pg_get_constraintdef(con.oid) AS definition'), false);
  });

  it('does not classify an FK referenced unique index as constraint-backed', () => {
    const sql = collectRuntimeCatalogSql();
    assert.match(
      sql,
      /pc\.contype IN \('p', 'u', 'x'\) AND pc\.conindid = ix\.indexrelid/
    );
    assert.equal(
      sql.includes('EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conindid = ix.indexrelid)'),
      false
    );
  });
});
