/**
 * M55 Preview Baseline — disposable Docker execution runtime (Revision-4).
 * Strategy: DOCKER_EXEC_ISOLATED_NO_HOST_PORT
 */
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import {
  BASELINE_VERSION,
  CANONICAL_MIGRATIONS,
  EXECUTION_ORACLE_REVISION,
  EXPECTED_BASELINE_ARTIFACT_SHA256,
  EXPECTED_GAP_DIAGNOSTIC_SHA256,
  EXPECTED_MANIFEST_ARTIFACT_SHA256,
  EXPECTED_MATRIX_ARTIFACT_SHA256,
  EXPECTED_P3_COLUMNS_SHA256,
  FIXTURE_META_RELATION,
  FIXTURE_META_SCHEMA,
  PATHS,
  REQUIRED_RELATIONS,
  buildFixturePhases,
  deriveExecutionOracle,
  internalTriggerGroupMetadataFingerprint,
  relationSecurityFingerprintsFromMatrix,
  resolveRepoPath,
  sha256Hex,
  stableStringify,
  verifyWorkspace,
  // @ts-ignore TS5097 Node strip-types requires explicit .ts import suffix.
} from './previewBaselineTool.ts';

export { stableStringify };

export const DISPOSABLE_RUNTIME_REVISION =
  'PREVIEW-BASELINE-DISPOSABLE-RUNTIME-v1-REVISION-4' as const;
export const PINNED_POSTGRES_IMAGE =
  'postgres@sha256:5d11ffb37e58a7c9a2285359e50f7674e216c99b9114e47b0e7f21187c11252c' as const;
export const PINNED_POSTGRES_INDEX_DIGEST =
  'sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3' as const;
export const PINNED_POSTGRES_ARM64_DIGEST =
  'sha256:5d11ffb37e58a7c9a2285359e50f7674e216c99b9114e47b0e7f21187c11252c' as const;
export const EXPECTED_POSTGRES_VERSION = '17.6' as const;
export const EXPECTED_POSTGRES_VERSION_NUM = 170006 as const;
export const EXPECTED_ENCODING = 'UTF8' as const;
export const EXPECTED_COLLATION = 'en_US.UTF-8' as const;
export const EXPECTED_CTYPE = 'en_US.UTF-8' as const;
export const EXPECTED_TIMEZONE = 'UTC' as const;
export const EXECUTION_STRATEGY = 'DOCKER_EXEC_ISOLATED_NO_HOST_PORT' as const;
export const EXECUTION_ENABLEMENT_STATUS =
  'IMPLEMENTED_REVIEW_REQUIRED_NOT_AUTHORIZED' as const;
export const EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR =
  'local_execution_implemented_but_not_authorized_revision_4' as const;

const DISPOSABLE_TEST_EXECUTION_AUTHORITY = Symbol('M55DisposableTestExecutionAuthority');
export const EXPECTED_EXECUTION_ORACLE_SHA256 =
  '52832c14d55bba8b6194065aa17901c7373d39d208e8175781d729be17855062' as const;
export const CONTAINER_NAME_PREFIX = 'm55-preview-baseline-fixture-' as const;
export const DATABASE_NAME_PREFIX = 'm55_preview_baseline_fixture_' as const;
export const TMPFS_DATA_ARG = '/var/lib/postgresql/data:rw,nosuid,nodev,size=2147483648' as const;
export const REQUIRED_ROLES = ['postgres', 'anon', 'authenticated', 'service_role'] as const;
export const READINESS_MAX_ATTEMPTS = 30 as const;
export const READINESS_INTERVAL_MS = 1000 as const;
export const FORBIDDEN_PRUNE_COMMANDS = [
  'docker system prune',
  'docker container prune',
  'docker volume prune',
  'docker network prune',
] as const;

export const SNAPSHOT_COMPARE_CATEGORIES = [
  'application_row_count',
  'relations_present',
  'relations_absent',
  'columns_present',
  'columns_absent',
  'constraints_present',
  'constraints_absent',
  'indexes_present',
  'indexes_absent',
  'policies',
  'privileges',
  'relation_security',
  'functions_present',
  'functions_absent',
  'function_acl',
  'function_config',
  'user_defined_triggers',
  'internal_trigger_semantic_contract',
  'state_specific_presence',
  'state_specific_absence',
  'history_prefix',
  'forbidden_violations',
] as const;

export const RUNTIME_CATALOG_EXTRACTORS = [
  'application_row_count',
  'relations',
  'columns',
  'constraints',
  'indexes',
  'policies',
  'privileges',
  'relation_security',
  'functions',
  'function_acl',
  'function_config',
  'user_defined_triggers',
  'internal_trigger_groups',
  'history_prefix',
] as const;

export const FUNCTION_PARITY_TARGETS = [
  {
    identity: 'public.m55_consult_reply_commit',
    schema_name: 'public',
    function_name: 'm55_consult_reply_commit',
    identity_arguments:
      'p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone',
    expected_hash: '6a157d3b1d54ff91c85fceac209e4b26',
    expected_character_length: 9635,
  },
  {
    identity: 'public.m55_reply_generate_commit',
    schema_name: 'public',
    function_name: 'm55_reply_generate_commit',
    identity_arguments:
      'p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text',
    expected_hash: '4a9ce16d8fad737c10a7cf8b15ea94fe',
    expected_character_length: 6141,
  },
] as const;

const DOCKER_CHILD_ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'TMPDIR',
  'USER',
  'LANG',
  'LC_ALL',
  'DOCKER_CONTEXT',
  'DOCKER_CONFIG',
  'DOCKER_CERT_PATH',
  'XDG_RUNTIME_DIR',
] as const;

const APPLICATION_TRACKED_RELATIONS = [...REQUIRED_RELATIONS, 'clerk_webhook_events'] as const;

const APPROVED_DOCKER_DESKTOP_ENDPOINT =
  /^unix:\/\/\/Users\/[^/]+\/\.docker\/run\/docker\.sock$/;

const DOCKER_CHILD_ENV_STRIP_EXACT = [
  'DATABASE_URL',
  'PGPASSWORD',
  'POSTGRES_PASSWORD',
  'PGHOST',
  'PGPORT',
  'PGDATABASE',
  'PGUSER',
  'PGSERVICE',
  'PGPASSFILE',
] as const;

const DOCKER_CHILD_ENV_STRIP_PREFIXES = ['SUPABASE', 'CLERK', 'STRIPE', 'PG'] as const;

export type ExecutionPhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
export type FailureBoundary =
  | 'image_pull'
  | 'container_run'
  | 'readiness'
  | 'p0_bootstrap'
  | 'p0_preflight'
  | 'p0_snapshot'
  | 'p1_apply'
  | 'p2_apply'
  | 'p3_apply'
  | 'p4_apply'
  | 'p5_apply'
  | 'p6_apply'
  | 'p7_apply'
  | 'history_check'
  | 'snapshot_capture'
  | 'oracle_comparison'
  | 'function_parity'
  | 'cleanup';

export type ContainerLifecycle = 'NOT_CREATED' | 'CREATED' | 'REMOVED';

export type ParsedDisposableExecutionFlags = {
  help: boolean;
  planExecution: boolean;
  verifyFrozenInputs: boolean;
  executeLocal: boolean;
  repoRoot?: string;
  workspaceRoot?: string;
};

export type DisposableIdentity = {
  nonce: string;
  container_name: string;
  database_name: string;
};

export type ContainerLabels = {
  fixture: 'true';
  runtime_revision: typeof DISPOSABLE_RUNTIME_REVISION;
  oracle_sha256: string;
  manifest_sha256: string;
  creation_nonce: string;
};

export type InjectedRunner = {
  run(
    command: string[],
    options?: { stdin?: string; env?: Record<string, string> }
  ): { exitCode: number; stdout: string; stderr: string };
};

export type SleepFn = (ms: number) => void;

export type MigrationApplyStep = {
  phase: ExecutionPhaseId;
  migration_version: string;
  migration_path: string;
  migration_sha256: string;
  migration_byte_length: number;
  migration_line_count: number;
  expected_history_prefix: string[];
  per_phase_apply: true;
  batch_apply_forbidden: true;
};

export type DisposableExecutionPlan = {
  runtime_revision: typeof DISPOSABLE_RUNTIME_REVISION;
  execution_strategy: typeof EXECUTION_STRATEGY;
  enablement_status: typeof EXECUTION_ENABLEMENT_STATUS;
  oracle_revision: typeof EXECUTION_ORACLE_REVISION;
  oracle_sha256: string;
  pinned_postgres_image: typeof PINNED_POSTGRES_IMAGE;
  pinned_postgres_index_digest: typeof PINNED_POSTGRES_INDEX_DIGEST;
  pinned_postgres_arm64_digest: typeof PINNED_POSTGRES_ARM64_DIGEST;
  workspace_root: string;
  workspace_materialized: boolean;
  bound_creation_nonce: string | null;
  identity_template: {
    container_name_prefix: typeof CONTAINER_NAME_PREFIX;
    database_name_prefix: typeof DATABASE_NAME_PREFIX;
  };
  docker_pull_command: string[];
  docker_run_template: string[];
  readiness_template: string[];
  psql_exec_template: string[];
  migration_steps: MigrationApplyStep[];
  cleanup_inspect_template: string[];
  cleanup_rm_template: string[];
  cleanup_absence_template: string[];
  host_port_forbidden: true;
  bind_mount_forbidden: true;
  network_mode: 'none';
  platform: 'linux/arm64';
  password_in_argv_forbidden: true;
  database_url_required: false;
  host_psql_required: false;
};

export type FrozenInputValidation = {
  ok: true;
  baseline_sha256: string;
  matrix_sha256: string;
  manifest_sha256: string;
  oracle_sha256: string;
  oracle_revision: string;
  gap_diagnostic_sha256: string;
  p3_columns_sha256: string;
  canonical_migration_shas: Record<string, string>;
};

export type DockerReadOnlyEvidenceClassification =
  | 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_NOT_PRESENT'
  | 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_PRESENT';

export type HostDockerEvidence = {
  classification: DockerReadOnlyEvidenceClassification;
  docker_desktop_version: string | null;
  engine_version: string | null;
  server_architecture: string;
  buildx_version: string;
  pinned_image: typeof PINNED_POSTGRES_IMAGE;
  pinned_index_digest: typeof PINNED_POSTGRES_INDEX_DIGEST;
  pinned_arm64_digest: typeof PINNED_POSTGRES_ARM64_DIGEST;
  floating_tag_forbidden: true;
  engine_running: true;
  image_present_locally: boolean;
  pinned_image_digest_matches: boolean | null;
};

export type RawDockerReadOnlyEvidence = {
  docker_desktop_version: string | null;
  engine_version: string | null;
  server_architecture: string | null;
  buildx_version: string | null;
  docker_context: string | null;
  docker_endpoint: string | null;
  local_endpoint_verified: boolean;
  engine_running: boolean;
  image_present_locally: boolean;
  pinned_image_digest: string | null;
};

export type RuntimeCatalogRaw = {
  application_relation_counts: Record<string, number>;
  app_relations?: string[];
  relations: string[];
  columns: RawColumnRow[];
  constraints: RawConstraintRow[];
  indexes: RawIndexRow[];
  policies: RawPolicyRow[];
  privileges: RawPrivilegeRow[];
  relation_security: RawRelationSecurityRow[];
  functions: RawFunctionRow[];
  user_defined_triggers: RawUserTriggerRow[];
  internal_trigger_groups: RawInternalTriggerGroupRow[];
  internal_trigger_catalog_rows?: RawInternalFkTriggerCatalogRow[];
  history_prefix: string[];
};

type RawColumnRow = {
  schema_name: string;
  relation_name: string;
  ordinal_position: number;
  column_name: string;
  formatted_type: string;
  is_nullable: boolean;
  default_present: boolean;
  default_expression: string | null;
};

type RawConstraintRow = {
  schema_name: string;
  relation_name: string;
  constraint_name: string;
  constraint_type: string;
  definition: string;
  validated: boolean;
  deferrable: boolean;
  initially_deferred: boolean;
  match_type: string;
  delete_action: string;
  update_action: string;
  target_schema: string;
  target_relation: string;
  source_columns: string[];
  target_columns: string[];
  fingerprint_tail_width?: 9 | 10;
};

type RawIndexRow = {
  schema_name: string;
  relation_name: string;
  index_name: string;
  definition: string;
  constraint_backed: boolean;
};

type RawPolicyRow = {
  schema_name: string;
  relation_name: string;
  policy_name: string;
  command: string;
  roles: string[];
  permissive: string;
  using_expression: string;
  with_check_expression: string;
};

type RawPrivilegeRow = {
  cell_id: string;
  effective_privilege: boolean;
};

type RawRelationSecurityRow = {
  schema_name: string;
  relation_name: string;
  owner_role: string;
  rls_enabled: boolean;
  force_rls_enabled: boolean;
};

type RawFunctionRow = {
  schema_name: string;
  function_name: string;
  security_definer: boolean;
  volatility: string;
  parallel_safety: string;
  proconfig: unknown[];
  search_path: string;
  public_execute: boolean;
  anon_execute: boolean;
  authenticated_execute: boolean;
  service_role_execute: boolean;
};

type RawUserTriggerRow = {
  schema_name: string;
  relation_name: string;
  trigger_name: string;
  is_internal: boolean;
  evidence_only: boolean;
  portable_identity: boolean;
  semantic_group_id: string;
  function_schema: string;
  function_name: string;
  enabled_state: string;
  trigger_classification: string;
};

type RawInternalFkTriggerCatalogRow = {
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: string;
  timing: string;
  enabled_state: string;
  trigger_classification: string;
  side: string;
  constraint_contract_id: string;
};

type RawInternalTriggerGroupRow = {
  semantic_group_id: string;
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: string;
  timing: string;
  enabled_state: string;
  trigger_classification: string;
  side: string;
  expected_count: number;
  actual_count: number;
  binding_status: string;
  candidate_constraint_contract_ids: string[];
  exact_constraint_contract_id: string | null;
  portable_identity: boolean;
};

export type PhaseRuntimeResult = {
  phase: ExecutionPhaseId;
  runtime_snapshot_hash: string;
  runtime_validation_status: 'PASS' | 'FAIL';
  oracle_contract_hash: string;
  compared_categories: string[];
  mismatch_details: string[];
  history_prefix: string[];
};

export type FunctionParityResult = {
  identity: string;
  definition_hash: string;
  definition_character_length: number;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
};

export type RoleBootstrapRoleProof = {
  exists: boolean;
  rolcanlogin: boolean;
  rolbypassrls: boolean;
};

export type RoleBootstrapProof = {
  anon: RoleBootstrapRoleProof;
  authenticated: RoleBootstrapRoleProof;
  service_role: RoleBootstrapRoleProof;
};

export type ExecutionReport = {
  ok: boolean;
  runtime_revision: typeof DISPOSABLE_RUNTIME_REVISION;
  execution_strategy: typeof EXECUTION_STRATEGY;
  enablement_status: typeof EXECUTION_ENABLEMENT_STATUS;
  container_name: string;
  database_name: string;
  container_lifecycle: ContainerLifecycle;
  role_bootstrap_proof: RoleBootstrapProof | null;
  phases: PhaseRuntimeResult[];
  function_parity: FunctionParityResult[];
  cleanup_proof: {
    attempted: boolean;
    container_removed: boolean;
    container_name: string;
    post_removal_absent: boolean;
  } | null;
  failure_boundary: FailureBoundary | null;
  error: string | null;
  cleanup_error: string | null;
};

type OraclePhase = Record<string, unknown>;
type PhaseSnapshot = Record<string, unknown>;

type ManifestMigration = {
  version: string;
  byte_length: number;
  line_count: number;
  sha256: string;
  filename: string;
};

function readFlagValue(argv: string[], flag: string): string | undefined {
  const eqPrefix = `${flag}=`;
  for (const arg of argv) {
    if (arg.startsWith(eqPrefix)) return arg.slice(eqPrefix.length);
  }
  const index = argv.indexOf(flag);
  if (index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return undefined;
}

export function parseDisposableExecutionFlags(argv: string[]): ParsedDisposableExecutionFlags {
  return {
    help: argv.includes('--help'),
    planExecution: argv.includes('--plan-execution'),
    verifyFrozenInputs: argv.includes('--verify-frozen-inputs'),
    executeLocal: argv.includes('--execute-local'),
    repoRoot: readFlagValue(argv, '--repo-root'),
    workspaceRoot: readFlagValue(argv, '--workspace-root'),
  };
}

function readArtifactSha(repoRoot: string, relPath: string): string {
  const path = resolveRepoPath(repoRoot, relPath);
  if (!existsSync(path)) throw new Error(`frozen_input_missing:${relPath}`);
  return sha256Hex(readFileSync(path));
}

function loadManifestMigrations(repoRoot: string): ManifestMigration[] {
  const manifest = JSON.parse(
    readFileSync(resolveRepoPath(repoRoot, PATHS.manifest), 'utf8')
  ) as { migrations: ManifestMigration[] };
  return manifest.migrations;
}

export function validateFrozenInputs(repoRoot: string): FrozenInputValidation {
  const baselineSha = readArtifactSha(repoRoot, PATHS.baselineSql);
  const matrixSha = readArtifactSha(repoRoot, PATHS.contractMatrix);
  const manifestSha = readArtifactSha(repoRoot, PATHS.manifest);
  const oracleSha = readArtifactSha(repoRoot, PATHS.executionOracle);
  const gapSha = readArtifactSha(repoRoot, PATHS.gapDiagnosticRaw);
  const p3Sha = readArtifactSha(repoRoot, PATHS.p3ColumnsRaw);

  if (baselineSha !== EXPECTED_BASELINE_ARTIFACT_SHA256) {
    throw new Error(`frozen_baseline_sha_mismatch:${baselineSha}`);
  }
  if (matrixSha !== EXPECTED_MATRIX_ARTIFACT_SHA256) {
    throw new Error(`frozen_matrix_sha_mismatch:${matrixSha}`);
  }
  if (manifestSha !== EXPECTED_MANIFEST_ARTIFACT_SHA256) {
    throw new Error(`frozen_manifest_sha_mismatch:${manifestSha}`);
  }
  if (oracleSha !== EXPECTED_EXECUTION_ORACLE_SHA256) {
    throw new Error(`frozen_oracle_sha_mismatch:${oracleSha}`);
  }
  if (gapSha !== EXPECTED_GAP_DIAGNOSTIC_SHA256) {
    throw new Error(`frozen_gap_diagnostic_sha_mismatch:${gapSha}`);
  }
  if (p3Sha !== EXPECTED_P3_COLUMNS_SHA256) {
    throw new Error(`frozen_p3_columns_sha_mismatch:${p3Sha}`);
  }

  const canonicalMigrationShas: Record<string, string> = {};
  for (const entry of CANONICAL_MIGRATIONS) {
    const actual = readArtifactSha(repoRoot, entry.sourcePath);
    if (actual !== entry.sha256) {
      throw new Error(`frozen_canonical_migration_sha_mismatch:${entry.version}:${actual}`);
    }
    canonicalMigrationShas[entry.version] = actual;
  }

  const oracle = deriveExecutionOracle(repoRoot).oracleObject;
  if (oracle.oracle_revision !== EXECUTION_ORACLE_REVISION) {
    throw new Error(`frozen_oracle_revision_mismatch:${String(oracle.oracle_revision)}`);
  }

  return {
    ok: true,
    baseline_sha256: baselineSha,
    matrix_sha256: matrixSha,
    manifest_sha256: manifestSha,
    oracle_sha256: oracleSha,
    oracle_revision: EXECUTION_ORACLE_REVISION,
    gap_diagnostic_sha256: gapSha,
    p3_columns_sha256: p3Sha,
    canonical_migration_shas: canonicalMigrationShas,
  };
}

export function mergeDockerMetadataEnv(): Record<string, string> {
  if (typeof process.env.DOCKER_HOST === 'string' && process.env.DOCKER_HOST.trim().length > 0) {
    throw new Error('docker_host_inherited_forbidden');
  }
  const merged: Record<string, string> = {};
  for (const key of DOCKER_CHILD_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) merged[key] = value;
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('DOCKER_') || typeof value !== 'string') continue;
    if (key === 'DOCKER_HOST') continue;
    if (!(key in merged)) merged[key] = value;
  }
  for (const key of Object.keys(merged)) {
    if (DOCKER_CHILD_ENV_STRIP_EXACT.includes(key as (typeof DOCKER_CHILD_ENV_STRIP_EXACT)[number])) {
      delete merged[key];
    }
    if (DOCKER_CHILD_ENV_STRIP_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
      delete merged[key];
    }
  }
  return merged;
}

export function isApprovedDockerDesktopEndpoint(endpoint: string): boolean {
  return APPROVED_DOCKER_DESKTOP_ENDPOINT.test(endpoint.trim());
}

function buildDockerContextCommand(contextName: string, ...args: string[]): string[] {
  return ['docker', '--context', contextName, ...args];
}

function assertNoInheritedDockerHost(): void {
  if (typeof process.env.DOCKER_HOST === 'string' && process.env.DOCKER_HOST.trim().length > 0) {
    throw new Error('docker_host_inherited_forbidden');
  }
}

export function createHostSpawnRunner(): InjectedRunner {
  return {
    run(command) {
      const result = spawnSync(command[0]!, command.slice(1), {
        encoding: 'utf8',
        env: mergeDockerMetadataEnv() as NodeJS.ProcessEnv,
      });
      return {
        exitCode: result.status ?? 1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    },
  };
}

export function collectDockerReadOnlyEvidence(
  runner: InjectedRunner = createHostSpawnRunner()
): RawDockerReadOnlyEvidence {
  assertNoInheritedDockerHost();

  const contextShow = runner.run(['docker', 'context', 'show']);
  if (contextShow.exitCode !== 0) {
    throw new Error(`docker_context_show_failed:${contextShow.stderr || 'unknown'}`);
  }
  const activeContext = contextShow.stdout.trim();
  if (!activeContext) {
    throw new Error('docker_context_show_empty');
  }

  const contextInspect = runner.run(
    buildDockerContextCommand(activeContext, 'context', 'inspect', activeContext, '--format', '{{json .}}')
  );
  if (contextInspect.exitCode !== 0) {
    throw new Error(`docker_context_inspect_failed:${contextInspect.stderr || 'unknown'}`);
  }
  let contextParsed: {
    Name?: string;
    Endpoints?: { docker?: { Host?: string } };
  };
  try {
    contextParsed = JSON.parse(contextInspect.stdout.trim()) as {
      Name?: string;
      Endpoints?: { docker?: { Host?: string } };
    };
  } catch {
    throw new Error('docker_context_inspect_malformed');
  }
  const dockerEndpoint = contextParsed.Endpoints?.docker?.Host ?? null;
  if (!dockerEndpoint) {
    throw new Error('docker_endpoint_missing');
  }
  if (!isApprovedDockerDesktopEndpoint(dockerEndpoint)) {
    throw new Error(`docker_endpoint_remote_forbidden:${dockerEndpoint}`);
  }
  if (contextParsed.Name && contextParsed.Name !== activeContext) {
    throw new Error(`docker_context_name_mismatch:${activeContext}`);
  }

  const version = runner.run(buildDockerContextCommand(activeContext, 'version', '--format', '{{json .}}'));
  if (version.exitCode !== 0) {
    throw new Error(`docker_version_failed:${version.stderr || 'unknown'}`);
  }
  let parsed: {
    Client?: { Version?: string };
    Server?: { Version?: string; Arch?: string };
  };
  try {
    parsed = JSON.parse(version.stdout.trim()) as {
      Client?: { Version?: string };
      Server?: { Version?: string; Arch?: string };
    };
  } catch {
    throw new Error('docker_version_malformed');
  }
  if (!parsed.Server?.Version) {
    throw new Error('docker_engine_not_running');
  }

  const serverArchitecture = normalizeDockerServerArchitecture(parsed.Server.Arch);

  const buildx = runner.run(buildDockerContextCommand(activeContext, 'buildx', 'version'));
  if (buildx.exitCode !== 0) {
    throw new Error(`docker_buildx_version_failed:${buildx.stderr || 'unknown'}`);
  }

  const inspect = runner.run(
    buildDockerContextCommand(
      activeContext,
      'image',
      'inspect',
      PINNED_POSTGRES_IMAGE,
      '--format',
      '{{json .RepoDigests}}'
    )
  );
  let image_present_locally = false;
  let pinned_image_digest: string | null = null;
  if (inspect.exitCode === 0) {
    image_present_locally = true;
    try {
      const digests = JSON.parse(inspect.stdout.trim()) as string[];
      pinned_image_digest = digests.find((digest) => digest.includes(PINNED_POSTGRES_ARM64_DIGEST)) ?? null;
    } catch {
      throw new Error('docker_image_inspect_malformed');
    }
  } else if (!isDockerImageAbsentInspectError(inspect.stderr)) {
    throw new Error(`docker_image_inspect_failed:${inspect.stderr || 'unknown'}`);
  }

  return {
    docker_desktop_version: parsed.Client?.Version ?? null,
    engine_version: parsed.Server.Version ?? null,
    server_architecture: serverArchitecture,
    buildx_version: buildx.stdout.trim().split('\n')[0] ?? '',
    docker_context: activeContext,
    docker_endpoint: dockerEndpoint,
    local_endpoint_verified: true,
    engine_running: true,
    image_present_locally,
    pinned_image_digest,
  };
}

function normalizeDockerServerArchitecture(arch: string | undefined): string | null {
  if (!arch) return null;
  if (arch === 'linux/arm64' || arch === 'linux/aarch64') return 'linux/arm64';
  if (arch === 'arm64' || arch === 'aarch64') return 'linux/arm64';
  if (arch === 'linux/amd64' || arch === 'amd64' || arch === 'x86_64') return 'linux/amd64';
  return arch.startsWith('linux/') ? arch : `linux/${arch}`;
}

export function validateDockerReadOnlyEvidence(raw: RawDockerReadOnlyEvidence): HostDockerEvidence {
  if (!raw.server_architecture) {
    throw new Error('docker_architecture_missing');
  }
  if (raw.server_architecture !== 'linux/arm64') {
    throw new Error(`docker_architecture_invalid:${raw.server_architecture}`);
  }
  if (!raw.engine_running) {
    throw new Error('docker_engine_not_running');
  }
  if (!raw.buildx_version) {
    throw new Error('docker_buildx_version_missing');
  }
  if (!raw.local_endpoint_verified || !raw.docker_endpoint || !isApprovedDockerDesktopEndpoint(raw.docker_endpoint)) {
    throw new Error(`docker_endpoint_remote_forbidden:${raw.docker_endpoint ?? 'missing'}`);
  }
  if (raw.image_present_locally) {
    if (!raw.pinned_image_digest) {
      throw new Error('docker_pinned_digest_mismatch');
    }
    return {
      classification: 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_PRESENT',
      docker_desktop_version: raw.docker_desktop_version,
      engine_version: raw.engine_version,
      server_architecture: raw.server_architecture,
      buildx_version: raw.buildx_version,
      pinned_image: PINNED_POSTGRES_IMAGE,
      pinned_index_digest: PINNED_POSTGRES_INDEX_DIGEST,
      pinned_arm64_digest: PINNED_POSTGRES_ARM64_DIGEST,
      floating_tag_forbidden: true,
      engine_running: true,
      image_present_locally: true,
      pinned_image_digest_matches: true,
    };
  }
  return {
    classification: 'FROZEN_FILES_VALID_DOCKER_VALID_IMAGE_NOT_PRESENT',
    docker_desktop_version: raw.docker_desktop_version,
    engine_version: raw.engine_version,
    server_architecture: raw.server_architecture,
    buildx_version: raw.buildx_version,
    pinned_image: PINNED_POSTGRES_IMAGE,
    pinned_index_digest: PINNED_POSTGRES_INDEX_DIGEST,
    pinned_arm64_digest: PINNED_POSTGRES_ARM64_DIGEST,
    floating_tag_forbidden: true,
    engine_running: true,
    image_present_locally: false,
    pinned_image_digest_matches: null,
  };
}

export function validateHostDockerEvidence(raw: RawDockerReadOnlyEvidence): HostDockerEvidence {
  return validateDockerReadOnlyEvidence(raw);
}

export function buildDisposableIdentity(nonce?: string): DisposableIdentity {
  const value = nonce ?? randomBytes(16).toString('hex');
  if (!/^[a-f0-9]{32}$/.test(value)) {
    throw new Error(`invalid_disposable_nonce:${value}`);
  }
  return {
    nonce: value,
    container_name: `${CONTAINER_NAME_PREFIX}${value}`,
    database_name: `${DATABASE_NAME_PREFIX}${value}`,
  };
}

export function assertContainerNameAllowed(containerName: string): void {
  if (!containerName.startsWith(CONTAINER_NAME_PREFIX)) {
    throw new Error(`cleanup_refused_container_prefix:${containerName}`);
  }
  const suffix = containerName.slice(CONTAINER_NAME_PREFIX.length);
  if (!/^[a-f0-9]{32}$/.test(suffix)) {
    throw new Error(`cleanup_refused_container_suffix:${containerName}`);
  }
}

export function mergeChildProcessEnv(password: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const key of DOCKER_CHILD_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) merged[key] = value;
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('DOCKER_') || typeof value !== 'string') continue;
    if (!(key in merged)) merged[key] = value;
  }
  for (const key of Object.keys(merged)) {
    if (DOCKER_CHILD_ENV_STRIP_EXACT.includes(key as (typeof DOCKER_CHILD_ENV_STRIP_EXACT)[number])) {
      delete merged[key];
    }
    if (DOCKER_CHILD_ENV_STRIP_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
      delete merged[key];
    }
  }
  merged.POSTGRES_PASSWORD = password;
  merged.PGPASSWORD = password;
  return merged;
}

export function buildDockerPullCommand(): string[] {
  return ['docker', 'pull', '--platform', 'linux/arm64', PINNED_POSTGRES_IMAGE];
}

export function buildDockerRunCommand(
  identity: DisposableIdentity,
  labels: ContainerLabels
): string[] {
  return [
    'docker',
    'run',
    '--detach',
    '--name',
    identity.container_name,
    '--platform',
    'linux/arm64',
    '--network',
    'none',
    '--tmpfs',
    TMPFS_DATA_ARG,
    '--label',
    `m55.fixture=${labels.fixture}`,
    '--label',
    `m55.runtime_revision=${labels.runtime_revision}`,
    '--label',
    `m55.oracle_sha256=${labels.oracle_sha256}`,
    '--label',
    `m55.manifest_sha256=${labels.manifest_sha256}`,
    '--label',
    `m55.creation_nonce=${labels.creation_nonce}`,
    '-e',
    'POSTGRES_USER=postgres',
    '-e',
    `POSTGRES_DB=${identity.database_name}`,
    '-e',
    'POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.UTF-8',
    '-e',
    'TZ=UTC',
    '-e',
    'LANG=en_US.UTF-8',
    '-e',
    'LC_ALL=en_US.UTF-8',
    '-e',
    'POSTGRES_PASSWORD',
    PINNED_POSTGRES_IMAGE,
  ];
}

export function buildReadinessCommand(identity: DisposableIdentity): string[] {
  return [
    'docker',
    'exec',
    identity.container_name,
    'pg_isready',
    '-U',
    'postgres',
    '-d',
    identity.database_name,
  ];
}

export function buildDockerExecPsqlCommand(identity: DisposableIdentity): string[] {
  return [
    'docker',
    'exec',
    '-i',
    '-u',
    'postgres',
    identity.container_name,
    'psql',
    '-X',
    '--set',
    'ON_ERROR_STOP=1',
    '--no-align',
    '--tuples-only',
    '--quiet',
    '--dbname',
    identity.database_name,
  ];
}

export function buildContainerInspectCommand(containerName: string): string[] {
  return ['docker', 'inspect', '--format', '{{json .Config.Labels}}', containerName];
}

export function buildContainerExistsCommand(containerName: string): string[] {
  return ['docker', 'inspect', '--format', '{{.Id}}', containerName];
}

export function buildContainerAbsenceCommand(containerName: string): string[] {
  return ['docker', 'ps', '-a', '--filter', `name=^/${containerName}$`, '--format', '{{.ID}}'];
}

function isDockerImageAbsentInspectError(stderr: string): boolean {
  return stderr.includes('No such image');
}

export function isContainerAbsentProof(exitCode: number, stdout: string, stderr: string): boolean {
  if (exitCode === 0 && stdout.trim().length > 0) return false;
  const normalized = stderr.toLowerCase();
  return (
    normalized.includes('no such object') ||
    normalized.includes('no such container') ||
    (exitCode === 0 && stdout.trim().length === 0)
  );
}

export function isCleanupTransportFailure(stderr: string): boolean {
  const normalized = stderr.toLowerCase();
  return (
    normalized.includes('cannot connect to the docker daemon') ||
    normalized.includes('permission denied') ||
    normalized.includes('timeout') ||
    normalized.includes('error during connect')
  );
}

export function buildRoleBootstrapSql(): string {
  return [
    'DO $$',
    'BEGIN',
    "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN",
    '    CREATE ROLE anon NOLOGIN NOBYPASSRLS;',
    '  ELSE',
    '    ALTER ROLE anon NOLOGIN NOBYPASSRLS;',
    '  END IF;',
    "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN",
    '    CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;',
    '  ELSE',
    '    ALTER ROLE authenticated NOLOGIN NOBYPASSRLS;',
    '  END IF;',
    "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN",
    '    CREATE ROLE service_role NOLOGIN BYPASSRLS;',
    '  ELSE',
    '    ALTER ROLE service_role NOLOGIN BYPASSRLS;',
    '  END IF;',
    'END $$;',
    'DO $$',
    'DECLARE',
    '  r record;',
    'BEGIN',
    "  SELECT rolcanlogin, rolbypassrls, rolsuper, rolcreatedb, rolcreaterole, rolreplication",
    '  INTO r',
    "  FROM pg_roles WHERE rolname = 'anon';",
    '  IF NOT FOUND THEN',
    "    RAISE EXCEPTION 'precondition failed: anon missing';",
    '  END IF;',
    '  IF r.rolcanlogin OR r.rolbypassrls OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication THEN',
    "    RAISE EXCEPTION 'precondition failed: anon bootstrap contract violated';",
    '  END IF;',
    "  SELECT rolcanlogin, rolbypassrls, rolsuper, rolcreatedb, rolcreaterole, rolreplication",
    '  INTO r',
    "  FROM pg_roles WHERE rolname = 'authenticated';",
    '  IF NOT FOUND THEN',
    "    RAISE EXCEPTION 'precondition failed: authenticated missing';",
    '  END IF;',
    '  IF r.rolcanlogin OR r.rolbypassrls OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication THEN',
    "    RAISE EXCEPTION 'precondition failed: authenticated bootstrap contract violated';",
    '  END IF;',
    "  SELECT rolcanlogin, rolbypassrls, rolsuper, rolcreatedb, rolcreaterole, rolreplication",
    '  INTO r',
    "  FROM pg_roles WHERE rolname = 'service_role';",
    '  IF NOT FOUND THEN',
    "    RAISE EXCEPTION 'precondition failed: service_role missing';",
    '  END IF;',
    '  IF r.rolcanlogin THEN',
    "    RAISE EXCEPTION 'precondition failed: service_role.rolcanlogin is not false';",
    '  END IF;',
    '  IF NOT r.rolbypassrls THEN',
    "    RAISE EXCEPTION 'precondition failed: service_role.rolbypassrls is not true';",
    '  END IF;',
    '  IF r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication THEN',
    "    RAISE EXCEPTION 'precondition failed: service_role elevated attributes forbidden';",
    '  END IF;',
    'END $$;',
  ].join('\n');
}

export function buildRoleBootstrapProofSql(): string {
  return `SELECT json_build_object(
  'anon', (SELECT json_build_object('exists', true, 'rolcanlogin', rolcanlogin, 'rolbypassrls', rolbypassrls) FROM pg_roles WHERE rolname = 'anon'),
  'authenticated', (SELECT json_build_object('exists', true, 'rolcanlogin', rolcanlogin, 'rolbypassrls', rolbypassrls) FROM pg_roles WHERE rolname = 'authenticated'),
  'service_role', (SELECT json_build_object('exists', true, 'rolcanlogin', rolcanlogin, 'rolbypassrls', rolbypassrls) FROM pg_roles WHERE rolname = 'service_role')
)::text;`;
}

export function parseRoleBootstrapProof(stdout: string): RoleBootstrapProof {
  const parsed = parsePsqlJsonOutput(stdout) as RoleBootstrapProof;
  if (!parsed || typeof parsed !== 'object') throw new Error('role_bootstrap_proof_invalid');
  for (const role of ['anon', 'authenticated', 'service_role'] as const) {
    const entry = parsed[role];
    if (!entry || typeof entry !== 'object') throw new Error(`role_bootstrap_proof_missing:${role}`);
    if (entry.exists !== true) throw new Error(`role_bootstrap_proof_not_exists:${role}`);
    if (typeof entry.rolcanlogin !== 'boolean' || typeof entry.rolbypassrls !== 'boolean') {
      throw new Error(`role_bootstrap_proof_attribute_invalid:${role}`);
    }
  }
  return parsed;
}

export function validateRoleBootstrapProof(proof: RoleBootstrapProof): void {
  if (proof.anon.rolcanlogin || proof.anon.rolbypassrls) {
    throw new Error('role_bootstrap_proof_anon_contract_violated');
  }
  if (proof.authenticated.rolcanlogin || proof.authenticated.rolbypassrls) {
    throw new Error('role_bootstrap_proof_authenticated_contract_violated');
  }
  if (proof.service_role.rolcanlogin || !proof.service_role.rolbypassrls) {
    throw new Error('role_bootstrap_proof_service_role_contract_violated');
  }
}

export function buildFixtureMetadataSql(input: {
  fixtureRevision: string;
  oracleRevision: string;
  oracleSha256: string;
  manifestSha256: string;
  migrationTupleHash: string;
  databaseName: string;
  containerName: string;
  creationNonce: string;
}): string {
  return [
    `CREATE SCHEMA IF NOT EXISTS ${FIXTURE_META_SCHEMA};`,
    `CREATE TABLE IF NOT EXISTS ${FIXTURE_META_SCHEMA}.${FIXTURE_META_RELATION} (`,
    '  fixture_revision text NOT NULL,',
    '  oracle_revision text NOT NULL,',
    '  oracle_sha256 text NOT NULL,',
    '  manifest_sha256 text NOT NULL,',
    '  migration_tuple_hash text NOT NULL,',
    '  database_name text NOT NULL,',
    '  container_name text NOT NULL,',
    '  creation_nonce text NOT NULL,',
    '  local_only_assertion boolean NOT NULL DEFAULT true,',
    '  created_at timestamptz NOT NULL DEFAULT now()',
    ');',
    `CREATE TABLE IF NOT EXISTS ${FIXTURE_META_SCHEMA}.applied_migrations (`,
    '  version text PRIMARY KEY,',
    '  applied_at timestamptz NOT NULL DEFAULT now()',
    ');',
    `INSERT INTO ${FIXTURE_META_SCHEMA}.${FIXTURE_META_RELATION} (`,
    '  fixture_revision, oracle_revision, oracle_sha256, manifest_sha256,',
    '  migration_tuple_hash, database_name, container_name, creation_nonce, local_only_assertion',
    ') VALUES (',
    `  '${input.fixtureRevision}',`,
    `  '${input.oracleRevision}',`,
    `  '${input.oracleSha256}',`,
    `  '${input.manifestSha256}',`,
    `  '${input.migrationTupleHash}',`,
    `  '${input.databaseName}',`,
    `  '${input.containerName}',`,
    `  '${input.creationNonce}',`,
    '  true',
    ');',
  ].join('\n');
}

export function buildP0PreflightSql(
  identity: DisposableIdentity,
  expectedMigrationTupleHash: string
): string {
  return `SELECT json_build_object(
  'server_version', current_setting('server_version'),
  'server_version_num', current_setting('server_version_num')::int,
  'server_encoding', current_setting('server_encoding'),
  'datcollate', (SELECT datcollate FROM pg_database WHERE datname = current_database()),
  'datctype', (SELECT datctype FROM pg_database WHERE datname = current_database()),
  'timezone', current_setting('TimeZone'),
  'architecture_compatible', version() LIKE '%aarch64%',
  'roles', (SELECT COALESCE(json_agg(rolname ORDER BY rolname), '[]'::json) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role')),
  'gen_random_uuid_callable', gen_random_uuid() IS NOT NULL,
  'public_relation_count', (SELECT COUNT(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'),
  'marker_count', (SELECT COUNT(*)::int FROM ${FIXTURE_META_SCHEMA}.${FIXTURE_META_RELATION} WHERE database_name = current_database() AND container_name = '${identity.container_name}'),
  'history_count', (SELECT COUNT(*)::int FROM ${FIXTURE_META_SCHEMA}.applied_migrations),
  'marker', (SELECT row_to_json(m) FROM ${FIXTURE_META_SCHEMA}.${FIXTURE_META_RELATION} m WHERE database_name = current_database() AND container_name = '${identity.container_name}'),
  'database_name', current_database(),
  'container_name', '${identity.container_name}',
  'creation_nonce', '${identity.nonce}',
  'expected_migration_tuple_hash', '${expectedMigrationTupleHash}'
)::text;`;
}

function applicationRelationCountSql(): string {
  const relationList = APPLICATION_TRACKED_RELATIONS.map((relation) => `'${relation}'`).join(', ');
  return `pg_temp.m55_application_relation_counts()`;
}

function applicationRelationCountBootstrapSql(): string {
  const relationList = APPLICATION_TRACKED_RELATIONS.map((relation) => `'${relation}'`).join(', ');
  return `DROP FUNCTION IF EXISTS pg_temp.m55_application_relation_counts();
CREATE OR REPLACE FUNCTION pg_temp.m55_application_relation_counts() RETURNS jsonb
LANGUAGE plpgsql AS $m55$
DECLARE
  rel text;
  cnt bigint;
  tracked text[] := ARRAY[${relationList}]::text[];
  result jsonb := '{}'::jsonb;
BEGIN
  FOREACH rel IN ARRAY tracked LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      INNER JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = rel
    ) THEN
      EXECUTE format('SELECT count(*) FROM %I.%I', 'public', rel) INTO cnt;
      result := result || jsonb_build_object(rel, cnt::int);
    END IF;
  END LOOP;
  RETURN result;
END $m55$;`;
}

export function collectRuntimeCatalogSql(): string {
  const extractorMarkers = RUNTIME_CATALOG_EXTRACTORS.map((name) => `/*runtime_catalog:${name}*/`).join('\n');
  return `${applicationRelationCountBootstrapSql()}
${extractorMarkers}
SELECT json_build_object(
  'application_relation_counts', ${applicationRelationCountSql()},
  'relations', COALESCE((SELECT json_agg(c.relname ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'), '[]'::json),
  'columns', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.ordinal_position) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, a.attnum AS ordinal_position, a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
      NOT a.attnotnull AS is_nullable,
      a.atthasdef AS default_present,
      pg_get_expr(ad.adbin, ad.adrelid) AS default_expression
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ) t), '[]'::json),
  'app_relations', COALESCE((SELECT json_agg(c.relname ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relkind = 'r'), '[]'::json),
  'constraints', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.constraint_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, con.conname AS constraint_name,
      CASE con.contype WHEN 'p' THEN 'p' WHEN 'u' THEN 'u' WHEN 'f' THEN 'f' WHEN 'c' THEN 'c' ELSE con.contype::text END AS constraint_type,
      pg_get_constraintdef(con.oid, true) AS definition,
      con.convalidated AS validated, con.condeferrable AS deferrable, con.condeferred AS initially_deferred,
      CASE WHEN con.contype = 'f' THEN CASE con.confmatchtype WHEN 's' THEN 'SIMPLE' WHEN 'f' THEN 'FULL' ELSE ' ' END ELSE ' ' END AS match_type,
      CASE WHEN con.contype = 'f' THEN CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE ' ' END ELSE ' ' END AS delete_action,
      CASE WHEN con.contype = 'f' THEN CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE ' ' END ELSE ' ' END AS update_action,
      CASE WHEN con.contype = 'f' THEN tgt_ns.nspname ELSE '' END AS target_schema,
      CASE WHEN con.contype = 'f' THEN tgt.relname ELSE '' END AS target_relation,
      COALESCE((SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum), ARRAY[]::text[]) AS source_columns,
      COALESCE((SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = u.attnum), ARRAY[]::text[]) AS target_columns
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class tgt ON tgt.oid = con.confrelid
    LEFT JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
    WHERE n.nspname = 'public'
  ) t), '[]'::json),
  'indexes', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.index_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, i.relname AS index_name,
      pg_get_indexdef(ix.indexrelid) AS definition,
      EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.contype IN ('p', 'u', 'x') AND pc.conindid = ix.indexrelid) AS constraint_backed
    FROM pg_index ix
    JOIN pg_class c ON c.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  ) t), '[]'::json),
  'policies', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.policy_name) FROM (
    SELECT schemaname AS schema_name, tablename AS relation_name, policyname AS policy_name, cmd AS command,
      ARRAY(
        SELECT CASE WHEN r.role_name::text = 'public' THEN 'PUBLIC' ELSE r.role_name::text END
        FROM unnest(COALESCE(roles, ARRAY[]::name[])) AS r(role_name)
        ORDER BY 1
      )::text[] AS roles, permissive::text AS permissive,
      COALESCE(qual, '') AS using_expression, COALESCE(with_check, '') AS with_check_expression
    FROM pg_policies WHERE schemaname = 'public'
  ) t), '[]'::json),
  'privileges', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.cell_id) FROM (
    SELECT format('priv.%s.%s.%s', c.relname, grantee.rolname, priv_type) AS cell_id,
      CASE
        WHEN grantee.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
          WHERE acl.grantee = 0 AND upper(acl.privilege_type) = priv_type
        )
        ELSE has_table_privilege(grantee.rolname, c.oid, priv_type)
      END AS effective_privilege
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN (VALUES ('PUBLIC'), ('anon'), ('authenticated'), ('service_role')) AS grantee(rolname)
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS priv(priv_type)
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t), '[]'::json),
  'relation_security', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, pg_get_userbyid(c.relowner) AS owner_role,
      c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t), '[]'::json),
  'functions', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.function_name) FROM (
    SELECT n.nspname AS schema_name, p.proname AS function_name, p.prosecdef AS security_definer,
      p.provolatile::text AS volatility,
      p.proparallel::text AS parallel_safety,
      COALESCE(p.proconfig, ARRAY[]::text[]) AS proconfig,
      COALESCE((SELECT cfg FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg WHERE cfg LIKE 'search_path=%' LIMIT 1), '') AS search_path,
      EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
        WHERE acl.grantee = 0 AND upper(acl.privilege_type) = 'EXECUTE'
      ) AS public_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  ) t), '[]'::json),
  'user_defined_triggers', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.trigger_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, t.tgname AS trigger_name,
      t.tgisinternal AS is_internal, false AS evidence_only, false AS portable_identity,
      '' AS semantic_group_id, fn_ns.nspname AS function_schema, fn.proname AS function_name,
      t.tgenabled::text AS enabled_state,
      CASE WHEN t.tgisinternal THEN 'SYSTEM_INTERNAL' ELSE 'USER_DEFINED' END AS trigger_classification
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc fn ON fn.oid = t.tgfoid
    JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  ) t), '[]'::json),
  'internal_trigger_catalog_rows', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.relation_schema, t.relation_name, t.function_name, t.event, t.timing, t.side, t.constraint_contract_id) FROM (
    SELECT
      tg_ns.nspname AS relation_schema,
      tg_cls.relname AS relation_name,
      tgt.relname AS referenced_relation,
      fn_ns.nspname AS function_schema,
      fn.proname AS function_name,
      CASE t.tgtype & 28 WHEN 16 THEN 'UPDATE' WHEN 8 THEN 'DELETE' WHEN 4 THEN 'INSERT' ELSE 'UNKNOWN' END AS event,
      CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
      t.tgenabled::text AS enabled_state,
      'SYSTEM_INTERNAL' AS trigger_classification,
      CASE WHEN t.tgrelid = con.conrelid THEN 'referencing' ELSE 'referenced' END AS side,
      format('internal_fk:%s.%s:%s', conrel_ns.nspname, conrel.relname, con.conname) AS constraint_contract_id
    FROM pg_trigger t
    INNER JOIN pg_constraint con ON con.oid = t.tgconstraint AND con.contype = 'f'
    INNER JOIN pg_class tg_cls ON tg_cls.oid = t.tgrelid
    INNER JOIN pg_namespace tg_ns ON tg_ns.oid = tg_cls.relnamespace
    INNER JOIN pg_class conrel ON conrel.oid = con.conrelid
    INNER JOIN pg_namespace conrel_ns ON conrel_ns.oid = conrel.relnamespace
    INNER JOIN pg_class tgt ON tgt.oid = CASE WHEN t.tgrelid = con.conrelid THEN con.confrelid ELSE con.conrelid END
    INNER JOIN pg_proc fn ON fn.oid = t.tgfoid
    INNER JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
    WHERE t.tgisinternal AND tg_ns.nspname = 'public'
  ) t), '[]'::json),
  'history_prefix', COALESCE((SELECT json_agg(version ORDER BY version) FROM ${FIXTURE_META_SCHEMA}.applied_migrations), '[]'::json)
)::text;`;
}

export function buildPhaseSnapshotSql(): string {
  return collectRuntimeCatalogSql();
}

export function buildFunctionParitySql(): string {
  const unions = FUNCTION_PARITY_TARGETS.map(
    (fn) =>
      `SELECT '${fn.identity}'::text AS function_identity, md5(pg_get_functiondef(p.oid)) AS definition_hash, length(pg_get_functiondef(p.oid))::int AS definition_character_length, pg_get_function_identity_arguments(p.oid) AS identity_arguments FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = '${fn.schema_name}' AND p.proname = '${fn.function_name}' AND pg_get_function_identity_arguments(p.oid) = '${fn.identity_arguments}'`
  ).join(' UNION ALL ');
  return `SELECT COALESCE(json_agg(row_to_json(t) ORDER BY function_identity), '[]'::json)::text FROM (${unions}) t;`;
}

export function formatPsqlJsonOutput(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function parsePsqlJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('psql_output_empty');
  if (/^\s*\w+\s*\|/m.test(trimmed) || trimmed.includes('---+')) {
    throw new Error('psql_output_aligned_format_forbidden');
  }
  const lines = trimmed.split('\n').filter((line) => line.trim());
  if (lines.length !== 1) throw new Error(`psql_output_line_count_invalid:${lines.length}`);
  const line = lines[0]!;
  try {
    return JSON.parse(line);
  } catch {
    throw new Error('psql_output_non_json');
  }
}

function columnFingerprint(row: RawColumnRow): string {
  return [
    row.schema_name,
    row.relation_name,
    row.column_name,
    String(row.ordinal_position),
    row.formatted_type,
    row.is_nullable ? 'Y' : 'N',
    row.default_present ? 'D1' : 'D0',
    row.default_expression ?? '',
  ].join('|');
}

function constraintFingerprint(row: RawConstraintRow): string {
  const parts = [
    row.schema_name,
    row.relation_name,
    row.constraint_name,
    row.constraint_type,
    row.definition,
    String(row.validated),
    String(row.deferrable),
    String(row.initially_deferred),
    row.match_type ?? '',
    row.delete_action ?? '',
    row.update_action ?? '',
    row.target_schema ?? '',
    row.target_relation ?? '',
    row.source_columns.join(','),
  ];
  if (
    row.target_columns.length > 0 ||
    row.source_columns.length > 0 ||
    row.constraint_type === 'f' ||
    row.fingerprint_tail_width === 10
  ) {
    parts.push(row.target_columns.join(','));
  }
  return parts.join('|');
}

function indexFingerprint(row: RawIndexRow): string {
  return [row.schema_name, row.relation_name, row.index_name, row.definition, String(row.constraint_backed)].join('|');
}

function policyFingerprint(row: RawPolicyRow): string {
  return [
    row.schema_name,
    row.relation_name,
    row.policy_name,
    row.command,
    row.roles.join(','),
    row.permissive,
    row.using_expression ?? '',
    row.with_check_expression ?? '',
  ].join('|');
}

function privilegeFingerprint(row: RawPrivilegeRow): string {
  return `${row.cell_id}|${row.effective_privilege ? '1' : '0'}`;
}

function functionNameFingerprint(row: RawFunctionRow): string {
  return `${row.schema_name}.${row.function_name}`;
}

function functionAclFingerprint(row: RawFunctionRow): string {
  return [
    row.schema_name,
    row.function_name,
    String(row.public_execute),
    String(row.anon_execute),
    String(row.authenticated_execute),
    String(row.service_role_execute),
  ].join('|');
}

function functionConfigFingerprint(row: RawFunctionRow): string {
  const proconfigSerialized =
    (row.proconfig ?? []).length === 0 ? '[]' : stableStringify(row.proconfig ?? []);
  return [
    row.schema_name,
    row.function_name,
    String(row.security_definer),
    row.volatility,
    row.parallel_safety,
    proconfigSerialized,
    row.search_path ?? '',
  ].join('|');
}

function userTriggerFingerprint(row: RawUserTriggerRow): string {
  return [
    row.schema_name,
    row.relation_name,
    row.trigger_name,
    String(row.is_internal),
    String(row.evidence_only),
    String(row.portable_identity),
    row.semantic_group_id,
    row.function_schema,
    row.function_name,
    row.enabled_state,
    row.trigger_classification,
  ].join('|');
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function complement(universe: string[], present: string[]): string[] {
  const presentSet = new Set(present);
  return uniqueSorted(universe.filter((item) => !presentSet.has(item)));
}

export function decodeInternalTriggerGroupFromMetadataFingerprint(
  fingerprint: string
): RawInternalTriggerGroupRow {
  const portableMatch = fingerprint.match(/\|true$/);
  if (!portableMatch) {
    throw new Error('invalid_internal_group_fingerprint');
  }
  const body = fingerprint.slice(0, portableMatch.index);
  const parts = body.split('|').filter((part, index, all) => !(index === all.length - 1 && part === ''));
  if (parts.length < 24) throw new Error('invalid_internal_group_fingerprint');
  const expected_count = Number(parts[parts.length - 4]);
  const actual_count = Number(parts[parts.length - 3]);
  const binding_status = parts[parts.length - 2]!;
  const candidates = parts[parts.length - 1]!;
  const exact = null;
  const semantic_group_id = parts.slice(0, 10).join('|');
  const keyFields = parts.slice(10, 20);
  return {
    semantic_group_id,
    relation_schema: keyFields[0]!.startsWith('group:') ? keyFields[0]!.slice(6) : keyFields[0]!,
    relation_name: keyFields[1]!,
    referenced_relation: keyFields[2]!,
    function_schema: keyFields[3]!,
    function_name: keyFields[4]!,
    event: keyFields[5]!,
    timing: keyFields[6]!,
    enabled_state: keyFields[7]!,
    trigger_classification: keyFields[8]!,
    side: keyFields[9]!,
    expected_count,
    actual_count,
    binding_status,
    candidate_constraint_contract_ids: candidates ? candidates.split(',').filter(Boolean) : [],
    exact_constraint_contract_id: exact,
    portable_identity: true,
  };
}

export function decodeColumnFingerprint(fingerprint: string): RawColumnRow {
  const parts = fingerprint.split('|');
  return {
    schema_name: parts[0]!,
    relation_name: parts[1]!,
    column_name: parts[2]!,
    ordinal_position: Number(parts[3]),
    formatted_type: parts[4]!,
    is_nullable: parts[5] === 'Y',
    default_present: parts[6] === 'D1',
    default_expression: parts[7] || null,
  };
}

export function decodeConstraintFingerprint(fingerprint: string): RawConstraintRow {
  const parts = fingerprint.split('|');
  if (parts.length < 13) throw new Error('invalid_constraint_fingerprint');
  const schema_name = parts[0]!;
  const relation_name = parts[1]!;
  const constraint_name = parts[2]!;
  const constraint_type = parts[3]!;
  const tailFieldCount = parts.length >= 15 ? 10 : 9;
  if (parts.length < 4 + tailFieldCount) throw new Error('invalid_constraint_fingerprint');
  const definition = parts.slice(4, parts.length - tailFieldCount).join('|');
  const tailFields = parts.slice(parts.length - tailFieldCount);
  const validated = tailFields[0] === 'true';
  const deferrable = tailFields[1] === 'true';
  const initially_deferred = tailFields[2] === 'true';
  const match_type = tailFields[3] ?? '';
  const delete_action = tailFields[4] ?? '';
  const update_action = tailFields[5] ?? '';
  const target_schema = tailFields[6] ?? '';
  const target_relation = tailFields[7] ?? '';
  const source_columns = (tailFields[8] ?? '').split(',').filter(Boolean);
  const target_columns =
    tailFieldCount === 10 ? (tailFields[9] ?? '').split(',').filter(Boolean) : [];
  return {
    schema_name,
    relation_name,
    constraint_name,
    constraint_type,
    definition,
    validated,
    deferrable,
    initially_deferred,
    match_type,
    delete_action,
    update_action,
    target_schema,
    target_relation,
    source_columns,
    target_columns,
    fingerprint_tail_width: tailFieldCount as 9 | 10,
  };
}

export function decodeIndexFingerprint(fingerprint: string): RawIndexRow {
  const parts = fingerprint.split('|');
  if (parts[parts.length - 1] === '') parts.pop();
  const constraint_backed = parts.pop() === 'true';
  const schema_name = parts.shift() ?? '';
  const relation_name = parts.shift() ?? '';
  const index_name = parts.shift() ?? '';
  const definition = parts.join('|');
  return {
    schema_name,
    relation_name,
    index_name,
    definition,
    constraint_backed,
  };
}

export function decodePolicyFingerprint(fingerprint: string): RawPolicyRow {
  const parts = fingerprint.split('|');
  return {
    schema_name: parts[0]!,
    relation_name: parts[1]!,
    policy_name: parts[2]!,
    command: parts[3]!,
    roles: (parts[4] ?? '').split(',').filter(Boolean),
    permissive: parts[5]!,
    using_expression: parts[6] ?? '',
    with_check_expression: parts[7] ?? '',
  };
}

export function decodePrivilegeFingerprint(fingerprint: string): RawPrivilegeRow {
  const [cell_id, flag] = fingerprint.split('|');
  return { cell_id: cell_id!, effective_privilege: flag === '1' };
}

export function decodeFunctionNameFingerprint(fingerprint: string): RawFunctionRow {
  const [schema_name, function_name] = fingerprint.split('.');
  const acl = fingerprint.split('|');
  return {
    schema_name: schema_name!,
    function_name: function_name!,
    security_definer: false,
    volatility: 'VOLATILE',
    parallel_safety: 'UNSAFE',
    proconfig: [],
    search_path: '',
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: false,
  };
}

export function decodeCatalogFingerprintsToRawCatalog(oraclePhase: OraclePhase): RuntimeCatalogRaw {
  const relations = ((oraclePhase.relations_present as string[]) ?? []).slice().sort();
  const columns = ((oraclePhase.columns_present as string[]) ?? []).map(decodeColumnFingerprint);
  const constraints = ((oraclePhase.constraints_present as string[]) ?? []).map(decodeConstraintFingerprint);
  const indexes = ((oraclePhase.indexes_present as string[]) ?? []).map(decodeIndexFingerprint);
  const policies = ((oraclePhase.policies as string[]) ?? []).map(decodePolicyFingerprint);
  const privileges = ((oraclePhase.privileges as string[]) ?? []).map(decodePrivilegeFingerprint);
  const functions = ((oraclePhase.functions_present as string[]) ?? []).map((fp) => {
    const [schema_name, function_name] = String(fp).split('.');
    const acl = ((oraclePhase.function_acl as string[]) ?? []).find((row) => row.startsWith(`${schema_name}|${function_name}|`));
    const config = ((oraclePhase.function_config as string[]) ?? []).find((row) => row.startsWith(`${schema_name}|${function_name}|`));
    const aclParts = acl?.split('|') ?? [];
    const configParts = config?.split('|') ?? [];
    return {
      schema_name: schema_name!,
      function_name: function_name!,
      security_definer: configParts[2] === 'true',
      volatility: configParts[3] ?? 'v',
      parallel_safety: configParts[4] ?? 'u',
      proconfig: configParts[5] ? JSON.parse(configParts[5]) : [],
      search_path: configParts[6] ?? '',
      public_execute: aclParts[2] === 'true',
      anon_execute: aclParts[3] === 'true',
      authenticated_execute: aclParts[4] === 'true',
      service_role_execute: aclParts[5] === 'true',
    };
  });
  const relation_security = relations.map((relation_name) => {
    const owner = ((oraclePhase.relation_security as string[]) ?? []).find((row) => row.includes(`|${relation_name}|owner|`));
    const rls = ((oraclePhase.relation_security as string[]) ?? []).find((row) => row.includes(`|${relation_name}|rls|`));
    const force = ((oraclePhase.relation_security as string[]) ?? []).find((row) => row.includes(`|${relation_name}|force_rls|`));
    return {
      schema_name: 'public',
      relation_name,
      owner_role: owner?.split('|')[3] ?? 'postgres',
      rls_enabled: rls?.endsWith('|true') ?? false,
      force_rls_enabled: force?.endsWith('|true') ?? false,
    };
  });
  return {
    application_relation_counts: Object.fromEntries(relations.map((relation) => [relation, 0])),
    app_relations: [],
    relations,
    columns,
    constraints,
    indexes,
    policies,
    privileges,
    relation_security,
    functions,
    user_defined_triggers: [],
    internal_trigger_groups: ((oraclePhase.internal_trigger_semantic_contract as string[]) ?? []).map(
      decodeInternalTriggerGroupFromMetadataFingerprint
    ),
    history_prefix: ((oraclePhase.history_prefix as string[]) ?? []).slice(),
  };
}

function relationSecurityRowsFromFingerprints(fingerprints: string[]): RawRelationSecurityRow[] {
  const map = new Map<string, RawRelationSecurityRow>();
  for (const fp of fingerprints) {
    const [schema_name, relation_name, aspect, value] = fp.split('|');
    const row = map.get(relation_name!) ?? {
      schema_name: schema_name!,
      relation_name: relation_name!,
      owner_role: 'postgres',
      rls_enabled: false,
      force_rls_enabled: false,
    };
    if (aspect === 'owner') row.owner_role = value!;
    if (aspect === 'rls') row.rls_enabled = value === 'true';
    if (aspect === 'force_rls') row.force_rls_enabled = value === 'true';
    map.set(relation_name!, row);
  }
  return [...map.values()].sort((a, b) => a.relation_name.localeCompare(b.relation_name));
}

function catalogExtractorPresent(parsed: Record<string, unknown>, extractor: (typeof RUNTIME_CATALOG_EXTRACTORS)[number]): boolean {
  switch (extractor) {
    case 'application_row_count':
      return (
        typeof parsed.application_relation_counts === 'object' ||
        typeof parsed.application_row_count === 'number'
      );
    case 'function_acl':
    case 'function_config':
      return Array.isArray(parsed.functions) || extractor in parsed;
    case 'internal_trigger_groups':
      return Array.isArray(parsed.internal_trigger_groups) || Array.isArray(parsed.internal_trigger_catalog_rows);
    default:
      return extractor in parsed;
  }
}

function portableInternalTriggerGroupKey(fields: {
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: string;
  timing: string;
  enabled_state: string;
  trigger_classification: string;
  side: string;
}): string {
  return [
    fields.relation_schema,
    fields.relation_name,
    fields.referenced_relation,
    fields.function_schema,
    fields.function_name,
    fields.event,
    fields.timing,
    fields.enabled_state,
    fields.trigger_classification,
    fields.side,
  ].join('|');
}

export function aggregateInternalTriggerSemanticGroups(
  rows: RawInternalFkTriggerCatalogRow[]
): RawInternalTriggerGroupRow[] {
  const groupMap = new Map<
    string,
    {
      fields: Omit<
        RawInternalTriggerGroupRow,
        | 'semantic_group_id'
        | 'expected_count'
        | 'actual_count'
        | 'binding_status'
        | 'candidate_constraint_contract_ids'
        | 'exact_constraint_contract_id'
        | 'portable_identity'
      >;
      contractIds: Set<string>;
      triggerCount: number;
    }
  >();
  for (const row of rows) {
    const key = portableInternalTriggerGroupKey(row);
    const entry = groupMap.get(key) ?? {
      fields: {
        relation_schema: row.relation_schema,
        relation_name: row.relation_name,
        referenced_relation: row.referenced_relation,
        function_schema: row.function_schema,
        function_name: row.function_name,
        event: row.event,
        timing: row.timing,
        enabled_state: row.enabled_state,
        trigger_classification: row.trigger_classification,
        side: row.side,
      },
      contractIds: new Set<string>(),
      triggerCount: 0,
    };
    entry.contractIds.add(row.constraint_contract_id);
    entry.triggerCount += 1;
    groupMap.set(key, entry);
  }
  return [...groupMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entry]) => {
      const candidateIds = [...entry.contractIds].sort();
      const binding_status = candidateIds.length > 1 ? 'AMBIGUOUS_EQUIVALENCE_CLASS' : 'UNAMBIGUOUS';
      return {
        semantic_group_id: `group:${key}`,
        ...entry.fields,
        expected_count: candidateIds.length,
        actual_count: entry.triggerCount,
        binding_status,
        candidate_constraint_contract_ids: candidateIds,
        exact_constraint_contract_id: binding_status === 'UNAMBIGUOUS' ? candidateIds[0]! : null,
        portable_identity: true,
      };
    });
}

export function parseRuntimeCatalogOutput(stdout: string): RuntimeCatalogRaw {
  const parsed = parsePsqlJsonOutput(stdout) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') throw new Error('runtime_catalog_output_invalid');
  for (const key of RUNTIME_CATALOG_EXTRACTORS) {
    if (!catalogExtractorPresent(parsed, key)) {
      throw new Error(`runtime_snapshot_contract_incomplete:${key}`);
    }
  }
  const raw = parsed as RuntimeCatalogRaw;
  if (
    Array.isArray(raw.internal_trigger_catalog_rows) &&
    raw.internal_trigger_catalog_rows.length > 0
  ) {
    raw.internal_trigger_groups = aggregateInternalTriggerSemanticGroups(raw.internal_trigger_catalog_rows);
  }
  if (!Array.isArray(raw.internal_trigger_groups)) {
    raw.internal_trigger_groups = [];
  }
  return raw;
}

export function normalizeRuntimeCatalog(raw: RuntimeCatalogRaw): {
  application_row_count: number;
  app_relations_present: string[];
  relations_present: string[];
  columns_present: string[];
  constraints_present: string[];
  indexes_present: string[];
  policies: string[];
  privileges: string[];
  relation_security: string[];
  functions_present: string[];
  function_acl: string[];
  function_config: string[];
  user_defined_triggers: string[];
  internal_trigger_semantic_contract: string[];
  history_prefix: string[];
  normalized_columns: Set<string>;
  normalized_indexes: Set<string>;
  normalized_constraints: Set<string>;
  normalized_functions: Set<string>;
} {
  const application_row_count = Object.values(raw.application_relation_counts ?? {}).reduce(
    (sum, count) => sum + Number(count),
    0
  );
  const app_relations_present = uniqueSorted((raw.app_relations ?? []).map(String));
  const relations_present = uniqueSorted((raw.relations ?? []).map(String));
  const columns_present = uniqueSorted((raw.columns ?? []).map((row) => columnFingerprint(row)));
  const constraints_present = uniqueSorted((raw.constraints ?? []).map((row) => constraintFingerprint(row)));
  const indexes_present = uniqueSorted((raw.indexes ?? []).map((row) => indexFingerprint(row)));
  const policies = uniqueSorted((raw.policies ?? []).map((row) => policyFingerprint(row)));
  const privileges = uniqueSorted((raw.privileges ?? []).map((row) => privilegeFingerprint(row)));
  const relation_security = uniqueSorted(
    (raw.relation_security ?? []).flatMap((row) => relationSecurityFingerprintsFromMatrix(row))
  );
  const functions_present = uniqueSorted((raw.functions ?? []).map((row) => functionNameFingerprint(row)));
  const function_acl = uniqueSorted((raw.functions ?? []).map((row) => functionAclFingerprint(row)));
  const function_config = uniqueSorted((raw.functions ?? []).map((row) => functionConfigFingerprint(row)));
  const user_defined_triggers = uniqueSorted((raw.user_defined_triggers ?? []).map((row) => userTriggerFingerprint(row)));
  const internal_trigger_semantic_contract = uniqueSorted(
    (raw.internal_trigger_groups ?? []).map((row) =>
      internalTriggerGroupMetadataFingerprint(row as never)
    )
  );
  return {
    application_row_count,
    app_relations_present,
    relations_present,
    columns_present,
    constraints_present,
    indexes_present,
    policies,
    privileges,
    relation_security,
    functions_present,
    function_acl,
    function_config,
    user_defined_triggers,
    internal_trigger_semantic_contract,
    history_prefix: uniqueSorted((raw.history_prefix ?? []).map(String)),
    normalized_columns: new Set(columns_present),
    normalized_indexes: new Set(indexes_present),
    normalized_constraints: new Set(constraints_present),
    normalized_functions: new Set(functions_present),
  };
}

function evaluateForbiddenViolations(
  forbidden: unknown[],
  normalized: ReturnType<typeof normalizeRuntimeCatalog>
): string[] {
  const violations: string[] = [];
  const relations = new Set(normalized.relations_present);
  for (const entry of forbidden) {
    const token = String(entry);
    if (token.includes('.')) {
      const [head] = token.split('.', 2);
      if (head === 'app') {
        continue;
      }
      if (catalogObjectPresent(token, normalized)) {
        violations.push(token);
      }
      continue;
    }
    if (relations.has(token)) {
      violations.push(token);
      continue;
    }
    if ([...normalized.normalized_indexes].some((fp) => fp.includes(`|${token}|`))) {
      violations.push(token);
      continue;
    }
    if ([...normalized.normalized_constraints].some((fp) => fp.includes(`|${token}|`))) {
      violations.push(token);
      continue;
    }
    if ([...normalized.normalized_functions].some((fn) => fn.endsWith(`.${token}`))) {
      violations.push(token);
    }
  }
  return uniqueSorted(violations);
}

function catalogObjectPresent(
  object: string,
  normalized: ReturnType<typeof normalizeRuntimeCatalog>
): boolean {
  const token = object.trim();
  if (!token) throw new Error('state_object_syntax_invalid');
  if (token === 'app.user_profiles') {
    return normalized.app_relations_present.includes('user_profiles');
  }
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length !== 2) throw new Error(`state_object_syntax_invalid:${token}`);
    const [head, tail] = parts;
    if (head === 'app') {
      return normalized.app_relations_present.includes(tail!);
    }
    const columnPrefix = `public|${head}|${tail}|`;
    return [...normalized.normalized_columns].some((fp) => fp.startsWith(columnPrefix));
  }
  if (normalized.relations_present.includes(token)) return true;
  if (normalized.functions_present.some((fn) => fn.endsWith(`.${token}`))) return true;
  if ([...normalized.normalized_constraints].some((fp) => fp.includes(`|${token}|`))) return true;
  if ([...normalized.normalized_indexes].some((fp) => fp.includes(`|${token}|`))) return true;
  return false;
}

function evaluateStateSpecific(
  oraclePhase: OraclePhase,
  normalized: ReturnType<typeof normalizeRuntimeCatalog>
): {
  presence: { state: string; object: string }[];
  absence: { state: string; object: string }[];
} {
  const presenceExpected = (oraclePhase.state_specific_presence as { state: string; object: string }[]) ?? [];
  const absenceExpected = (oraclePhase.state_specific_absence as { state: string; object: string }[]) ?? [];
  const presence = presenceExpected.filter((item) => catalogObjectPresent(item.object, normalized));
  const absence = absenceExpected.filter((item) => !catalogObjectPresent(item.object, normalized));
  return { presence, absence };
}

export function deriveRuntimePhaseSnapshot(
  rawCatalog: RuntimeCatalogRaw,
  oraclePhase: OraclePhase
): PhaseSnapshot {
  const normalized = normalizeRuntimeCatalog(rawCatalog);
  const relationsUniverse = uniqueSorted([
    ...((oraclePhase.relations_present as string[]) ?? []),
    ...((oraclePhase.relations_absent as string[]) ?? []),
  ]);
  const columnsUniverse = uniqueSorted([
    ...((oraclePhase.columns_present as string[]) ?? []),
    ...((oraclePhase.columns_absent as string[]) ?? []),
  ]);
  const constraintsUniverse = uniqueSorted([
    ...((oraclePhase.constraints_present as string[]) ?? []),
    ...((oraclePhase.constraints_absent as string[]) ?? []),
  ]);
  const indexesUniverse = uniqueSorted([
    ...((oraclePhase.indexes_present as string[]) ?? []),
    ...((oraclePhase.indexes_absent as string[]) ?? []),
  ]);
  const functionsUniverse = uniqueSorted([
    ...((oraclePhase.functions_present as string[]) ?? []),
    ...((oraclePhase.functions_absent as string[]) ?? []),
  ]);
  const state = evaluateStateSpecific(oraclePhase, normalized);
  const snapshot: PhaseSnapshot = {
    application_row_count: normalized.application_row_count,
    relations_present: normalized.relations_present,
    relations_absent: complement(relationsUniverse, normalized.relations_present),
    columns_present: normalized.columns_present,
    columns_absent: complement(columnsUniverse, normalized.columns_present),
    constraints_present: normalized.constraints_present,
    constraints_absent: complement(constraintsUniverse, normalized.constraints_present),
    indexes_present: normalized.indexes_present,
    indexes_absent: complement(indexesUniverse, normalized.indexes_present),
    policies: normalized.policies,
    privileges: normalized.privileges,
    relation_security: normalized.relation_security,
    functions_present: normalized.functions_present,
    functions_absent: complement(functionsUniverse, normalized.functions_present),
    function_acl: normalized.function_acl,
    function_config: normalized.function_config,
    user_defined_triggers: normalized.user_defined_triggers,
    internal_trigger_semantic_contract: normalized.internal_trigger_semantic_contract,
    state_specific_presence: state.presence,
    state_specific_absence: state.absence,
    history_prefix: normalized.history_prefix,
    forbidden_violations: evaluateForbiddenViolations((oraclePhase.forbidden_delta as unknown[]) ?? [], normalized),
  };
  assertSnapshotContractComplete(snapshot);
  return snapshot;
}

export function validateP0PreflightResult(
  value: Record<string, unknown>,
  identity: DisposableIdentity,
  frozen: FrozenInputValidation,
  expectedMigrationTupleHash: string
): void {
  const serverVersionLabel = typeof value.server_version === 'string'
    ? value.server_version.trim()
    : '';
  const escapedExpectedVersion = EXPECTED_POSTGRES_VERSION.replace('.', '\\.');
  const serverVersionMatches = new RegExp(`^${escapedExpectedVersion}(?:$|\\s|\\()`).test(
    serverVersionLabel
  );
  if (!serverVersionMatches) {
    throw new Error(`p0_server_version_mismatch:${String(value.server_version)}`);
  }
  if (value.server_version_num !== EXPECTED_POSTGRES_VERSION_NUM) {
    throw new Error(`p0_server_version_num_mismatch:${String(value.server_version_num)}`);
  }
  if (value.server_encoding !== EXPECTED_ENCODING) {
    throw new Error(`p0_encoding_mismatch:${String(value.server_encoding)}`);
  }
  if (value.datcollate !== EXPECTED_COLLATION || value.datctype !== EXPECTED_CTYPE) {
    throw new Error('p0_locale_mismatch');
  }
  if (value.timezone !== EXPECTED_TIMEZONE) {
    throw new Error(`p0_timezone_mismatch:${String(value.timezone)}`);
  }
  if (value.architecture_compatible !== true) {
    throw new Error('p0_architecture_incompatible');
  }
  const roles = [...((value.roles as string[]) ?? [])].sort();
  const expectedRoles = [...REQUIRED_ROLES].sort();
  if (stableStringify(roles) !== stableStringify(expectedRoles)) {
    throw new Error(`p0_roles_mismatch:${stableStringify(roles)}`);
  }
  if (value.gen_random_uuid_callable !== true) {
    throw new Error('p0_gen_random_uuid_not_callable');
  }
  if (value.public_relation_count !== 0) {
    throw new Error(`p0_public_relation_count_nonzero:${String(value.public_relation_count)}`);
  }
  if (value.marker_count !== 1) {
    throw new Error(`p0_marker_count_invalid:${String(value.marker_count)}`);
  }
  if (value.history_count !== 0) {
    throw new Error(`p0_history_count_nonzero:${String(value.history_count)}`);
  }
  const marker = value.marker as Record<string, unknown> | null;
  if (!marker) throw new Error('p0_marker_missing');
  if (marker.database_name !== identity.database_name) throw new Error('p0_marker_database_mismatch');
  if (marker.container_name !== identity.container_name) throw new Error('p0_marker_container_mismatch');
  if (marker.creation_nonce !== identity.nonce) throw new Error('p0_marker_nonce_mismatch');
  if (marker.oracle_sha256 !== frozen.oracle_sha256) throw new Error('p0_marker_oracle_sha_mismatch');
  if (marker.manifest_sha256 !== frozen.manifest_sha256) throw new Error('p0_marker_manifest_sha_mismatch');
  if (marker.fixture_revision !== DISPOSABLE_RUNTIME_REVISION) throw new Error('p0_marker_fixture_revision_mismatch');
  if (marker.oracle_revision !== EXECUTION_ORACLE_REVISION) throw new Error('p0_marker_oracle_revision_mismatch');
  if (marker.migration_tuple_hash !== expectedMigrationTupleHash) {
    throw new Error('p0_marker_migration_tuple_hash_mismatch');
  }
  if (marker.local_only_assertion !== true) throw new Error('p0_marker_local_only_assertion_invalid');
  if (value.database_name !== identity.database_name) throw new Error('p0_database_name_mismatch');
  if (value.container_name !== identity.container_name) throw new Error('p0_container_name_mismatch');
  if (value.creation_nonce !== identity.nonce) throw new Error('p0_creation_nonce_mismatch');
}

function sortCopy(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value].map((item) => sortCopy(item)).sort((a, b) =>
      stableStringify(a).localeCompare(stableStringify(b))
    );
  }
  return value;
}

export function assertSnapshotContractComplete(snapshot: PhaseSnapshot): void {
  for (const key of SNAPSHOT_COMPARE_CATEGORIES) {
    if (!(key in snapshot)) {
      throw new Error(`runtime_snapshot_contract_incomplete:${key}`);
    }
  }
}

export function compareRuntimePhaseSnapshot(
  snapshot: PhaseSnapshot,
  oracle: OraclePhase
): { ok: boolean; mismatches: string[]; compared_categories: string[] } {
  assertSnapshotContractComplete(snapshot);
  const mismatches: string[] = [];
  const compared_categories: string[] = [];

  for (const category of SNAPSHOT_COMPARE_CATEGORIES) {
    compared_categories.push(category);
    if (category === 'forbidden_violations') {
      const violations = (snapshot.forbidden_violations as string[]) ?? [];
      if (violations.length > 0) {
        mismatches.push(...violations.map((item) => `forbidden_violation:${item}`));
      }
      continue;
    }
    const actual = sortCopy(snapshot[category]);
    const expected = sortCopy(oracle[category] ?? (category === 'application_row_count' ? 0 : []));
    if (stableStringify(actual) !== stableStringify(expected)) {
      mismatches.push(`${category}_mismatch`);
    }
  }

  return { ok: mismatches.length === 0, mismatches, compared_categories };
}

export function compareSnapshotToOraclePhase(
  snapshot: PhaseSnapshot,
  oracle: OraclePhase
): { ok: boolean; mismatches: string[]; compared_categories: string[] } {
  return compareRuntimePhaseSnapshot(snapshot, oracle);
}

export function parseFunctionParityOutput(stdout: string): FunctionParityResult[] {
  const parsed = parsePsqlJsonOutput(stdout) as {
    function_identity: string;
    definition_hash: string;
    definition_character_length: number;
    identity_arguments: string;
  }[];
  if (!Array.isArray(parsed)) throw new Error('function_parity_output_not_array');
  if (parsed.length !== FUNCTION_PARITY_TARGETS.length) {
    throw new Error(`function_parity_row_count_invalid:${parsed.length}`);
  }
  const identities = parsed.map((row) => row.function_identity).sort();
  const expected = FUNCTION_PARITY_TARGETS.map((fn) => fn.identity).sort();
  if (stableStringify(identities) !== stableStringify(expected)) {
    throw new Error('function_parity_identity_mismatch');
  }
  return parsed.map((row) => {
    const target = FUNCTION_PARITY_TARGETS.find((fn) => fn.identity === row.function_identity);
    if (!target) throw new Error(`function_parity_unexpected_identity:${row.function_identity}`);
    if (row.identity_arguments !== target.identity_arguments) {
      throw new Error(`function_parity_identity_arguments_mismatch:${row.function_identity}`);
    }
    const pass =
      row.definition_hash === target.expected_hash &&
      row.definition_character_length === target.expected_character_length;
    return {
      identity: row.function_identity,
      definition_hash: row.definition_hash,
      definition_character_length: row.definition_character_length,
      status: pass ? 'PASS' : 'FAIL',
    };
  });
}

function countNewlines(text: string): number {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}

export function verifyMigrationBytesBeforeApply(
  migrationPath: string,
  expected: { sha256: string; byte_length: number; line_count: number }
): string {
  if (!existsSync(migrationPath)) throw new Error(`migration_missing:${migrationPath}`);
  if (lstatSync(migrationPath).isSymbolicLink()) {
    throw new Error(`migration_symlink_forbidden:${migrationPath}`);
  }
  const bytes = readFileSync(migrationPath);
  const sha = sha256Hex(bytes);
  const byteLength = bytes.byteLength;
  const lineCount = countNewlines(bytes.toString('utf8'));
  if (sha !== expected.sha256) throw new Error(`migration_sha_mismatch:${sha}`);
  if (byteLength !== expected.byte_length) {
    throw new Error(`migration_byte_length_mismatch:${byteLength}`);
  }
  if (lineCount !== expected.line_count) {
    throw new Error(`migration_line_count_mismatch:${lineCount}`);
  }
  return bytes.toString('utf8');
}

export function expectedPhaseHistoryPrefix(phase: ExecutionPhaseId): string[] {
  const order = [BASELINE_VERSION, ...CANONICAL_MIGRATIONS.map((m) => m.version)];
  const phaseIndex = Number(phase.slice(1));
  return order.slice(0, phaseIndex);
}

function expectedHistoryPrefixThrough(phase: ExecutionPhaseId): string[] {
  return expectedPhaseHistoryPrefix(phase);
}

export function buildMigrationApplyPlan(
  repoRoot: string,
  workspaceRoot: string
): MigrationApplyStep[] {
  verifyWorkspace(repoRoot, workspaceRoot);
  const manifestMigrations = loadManifestMigrations(repoRoot);
  const phases = buildFixturePhases(workspaceRoot);
  return phases.map((phase) => {
    const manifestEntry = manifestMigrations.find((m) => m.version === phase.migration_version);
    if (!manifestEntry) throw new Error(`manifest_migration_missing:${phase.migration_version}`);
    const sql = verifyMigrationBytesBeforeApply(phase.migration_absolute_path, {
      sha256: manifestEntry.sha256,
      byte_length: manifestEntry.byte_length,
      line_count: manifestEntry.line_count,
    });
    const actualSha = sha256Hex(sql);
    return {
      phase: phase.phase as ExecutionPhaseId,
      migration_version: phase.migration_version,
      migration_path: phase.migration_absolute_path,
      migration_sha256: actualSha,
      migration_byte_length: manifestEntry.byte_length,
      migration_line_count: manifestEntry.line_count,
      expected_history_prefix: expectedHistoryPrefixThrough(phase.phase as ExecutionPhaseId),
      per_phase_apply: true,
      batch_apply_forbidden: true,
    };
  });
}

export function buildFailureCleanupPlan(identity: DisposableIdentity): {
  inspect: string[];
  rm: string[];
  exists: string[];
  absence: string[];
} {
  assertContainerNameAllowed(identity.container_name);
  return {
    inspect: buildContainerInspectCommand(identity.container_name),
    rm: ['docker', 'rm', '--force', identity.container_name],
    exists: buildContainerExistsCommand(identity.container_name),
    absence: buildContainerAbsenceCommand(identity.container_name),
  };
}

export function instantiateExecutionPlanForIdentity(
  plan: DisposableExecutionPlan,
  identity: DisposableIdentity,
  labels: ContainerLabels
): DisposableExecutionPlan {
  const cleanup = buildFailureCleanupPlan(identity);
  return {
    ...plan,
    bound_creation_nonce: identity.nonce,
    docker_run_template: buildDockerRunCommand(identity, labels),
    readiness_template: buildReadinessCommand(identity),
    psql_exec_template: buildDockerExecPsqlCommand(identity),
    cleanup_inspect_template: cleanup.inspect,
    cleanup_rm_template: cleanup.rm,
    cleanup_absence_template: cleanup.absence,
  };
}

export function validateExecutionPlanIdentity(
  plan: DisposableExecutionPlan,
  identity: DisposableIdentity,
  labels: ContainerLabels
): void {
  if (plan.bound_creation_nonce && plan.bound_creation_nonce !== identity.nonce) {
    throw new Error('execution_plan_nonce_mismatch');
  }
  const runJoined = plan.docker_run_template.join(' ');
  if (!runJoined.includes(identity.container_name)) {
    throw new Error('execution_plan_container_name_mismatch');
  }
  if (!runJoined.includes(identity.database_name)) {
    throw new Error('execution_plan_database_name_mismatch');
  }
  if (!runJoined.includes(labels.creation_nonce)) {
    throw new Error('execution_plan_label_nonce_mismatch');
  }
}

export function buildDisposableExecutionPlan(
  repoRoot: string,
  options?: { workspaceRoot?: string }
): DisposableExecutionPlan {
  const frozen = validateFrozenInputs(repoRoot);
  if (!options?.workspaceRoot) {
    throw new Error('disposable_execution_requires_materialized_workspace');
  }
  verifyWorkspace(repoRoot, options.workspaceRoot);
  const migration_steps = buildMigrationApplyPlan(repoRoot, options.workspaceRoot);
  const identity = buildDisposableIdentity('0'.repeat(32));
  const labels: ContainerLabels = {
    fixture: 'true',
    runtime_revision: DISPOSABLE_RUNTIME_REVISION,
    oracle_sha256: frozen.oracle_sha256,
    manifest_sha256: frozen.manifest_sha256,
    creation_nonce: identity.nonce,
  };
  const cleanup = buildFailureCleanupPlan(identity);

  return {
    runtime_revision: DISPOSABLE_RUNTIME_REVISION,
    execution_strategy: EXECUTION_STRATEGY,
    enablement_status: EXECUTION_ENABLEMENT_STATUS,
    oracle_revision: EXECUTION_ORACLE_REVISION,
    oracle_sha256: frozen.oracle_sha256,
    pinned_postgres_image: PINNED_POSTGRES_IMAGE,
    pinned_postgres_index_digest: PINNED_POSTGRES_INDEX_DIGEST,
    pinned_postgres_arm64_digest: PINNED_POSTGRES_ARM64_DIGEST,
    workspace_root: options.workspaceRoot,
    workspace_materialized: true,
    bound_creation_nonce: identity.nonce,
    identity_template: {
      container_name_prefix: CONTAINER_NAME_PREFIX,
      database_name_prefix: DATABASE_NAME_PREFIX,
    },
    docker_pull_command: buildDockerPullCommand(),
    docker_run_template: buildDockerRunCommand(identity, labels),
    readiness_template: buildReadinessCommand(identity),
    psql_exec_template: buildDockerExecPsqlCommand(identity),
    migration_steps,
    cleanup_inspect_template: cleanup.inspect,
    cleanup_rm_template: cleanup.rm,
    cleanup_absence_template: cleanup.absence,
    host_port_forbidden: true,
    bind_mount_forbidden: true,
    network_mode: 'none',
    platform: 'linux/arm64',
    password_in_argv_forbidden: true,
    database_url_required: false,
    host_psql_required: false,
  };
}

function commandUsesForbiddenPattern(command: string[]): void {
  const joined = command.join(' ');
  for (const forbidden of FORBIDDEN_PRUNE_COMMANDS) {
    if (joined.includes(forbidden)) throw new Error(`forbidden_docker_command:${forbidden}`);
  }
  if (joined.includes('docker network create')) {
    throw new Error('forbidden_docker_command:docker network create');
  }
}

export function validateExecutionPlan(plan: DisposableExecutionPlan): void {
  for (const command of [
    plan.docker_pull_command,
    plan.docker_run_template,
    plan.readiness_template,
    plan.psql_exec_template,
    plan.cleanup_rm_template,
    plan.cleanup_inspect_template,
  ]) {
    commandUsesForbiddenPattern(command);
  }
  const runJoined = plan.docker_run_template.join(' ');
  if (runJoined.includes('postgres:17.6-bookworm') || /postgres:\d+\.\d+-bookworm/.test(runJoined)) {
    throw new Error('execution_plan_floating_tag_forbidden');
  }
  if (runJoined.includes(' -p ') || runJoined.includes(' --publish')) {
    throw new Error('execution_plan_host_port_forbidden');
  }
  if (runJoined.includes(' -v ') || runJoined.includes(' --volume')) {
    throw new Error('execution_plan_bind_mount_forbidden');
  }
  if (!runJoined.includes('--network none')) throw new Error('execution_plan_network_none_required');
  if (!runJoined.includes('--platform linux/arm64')) {
    throw new Error('execution_plan_platform_arm64_required');
  }
  if (!runJoined.includes(PINNED_POSTGRES_ARM64_DIGEST)) {
    throw new Error('execution_plan_pinned_digest_required');
  }
  if (!runJoined.includes('m55.fixture=true')) throw new Error('execution_plan_fixture_label_required');
  if (!runJoined.includes('-e') || !runJoined.includes('POSTGRES_PASSWORD')) {
    throw new Error('execution_plan_postgres_password_forward_required');
  }
  if (plan.migration_steps.length !== 7) {
    throw new Error(`execution_plan_migration_count_invalid:${plan.migration_steps.length}`);
  }
}

export function validateExecutionReportSuccess(report: ExecutionReport): void {
  const expectedPhaseOrder: ExecutionPhaseId[] = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  if (report.phases.length !== expectedPhaseOrder.length) throw new Error('execution_report_phase_count_invalid');
  for (let index = 0; index < expectedPhaseOrder.length; index += 1) {
    const phase = report.phases[index]!;
    if (phase.phase !== expectedPhaseOrder[index]) {
      throw new Error(`execution_report_phase_order_invalid:${phase.phase}`);
    }
    if (phase.runtime_validation_status !== 'PASS') {
      throw new Error(`execution_report_phase_not_pass:${phase.phase}`);
    }
    if (!phase.runtime_snapshot_hash) {
      throw new Error(`execution_report_snapshot_hash_empty:${phase.phase}`);
    }
    if (!phase.oracle_contract_hash) {
      throw new Error(`execution_report_oracle_contract_hash_empty:${phase.phase}`);
    }
    const expectedHistory = expectedPhaseHistoryPrefix(phase.phase);
    if (stableStringify(phase.history_prefix) !== stableStringify(expectedHistory)) {
      throw new Error(`execution_report_history_prefix_invalid:${phase.phase}`);
    }
    if (phase.compared_categories.length !== SNAPSHOT_COMPARE_CATEGORIES.length) {
      throw new Error(`execution_report_category_registry_incomplete:${phase.phase}`);
    }
    if (stableStringify([...phase.compared_categories].sort()) !== stableStringify([...SNAPSHOT_COMPARE_CATEGORIES].sort())) {
      throw new Error(`execution_report_category_set_invalid:${phase.phase}`);
    }
    if (phase.mismatch_details.length > 0) {
      throw new Error(`execution_report_mismatch_details_present:${phase.phase}`);
    }
  }
  if (report.function_parity.length !== FUNCTION_PARITY_TARGETS.length) {
    throw new Error('execution_report_function_parity_incomplete');
  }
  const parityIdentities = report.function_parity.map((row) => row.identity);
  const expectedIdentities = FUNCTION_PARITY_TARGETS.map((fn) => fn.identity);
  if (stableStringify(parityIdentities) !== stableStringify(expectedIdentities)) {
    throw new Error('execution_report_function_identities_invalid');
  }
  for (let index = 0; index < report.function_parity.length; index += 1) {
    const row = report.function_parity[index]!;
    const target = FUNCTION_PARITY_TARGETS[index]!;
    if (row.status !== 'PASS') throw new Error('execution_report_function_parity_not_pass');
    if (row.definition_hash !== target.expected_hash) {
      throw new Error(`execution_report_function_hash_invalid:${row.identity}`);
    }
    if (row.definition_character_length !== target.expected_character_length) {
      throw new Error(`execution_report_function_length_invalid:${row.identity}`);
    }
  }
  if (report.container_lifecycle !== 'REMOVED') {
    throw new Error('execution_report_container_not_removed');
  }
  if (!report.cleanup_proof?.attempted || !report.cleanup_proof.container_removed) {
    throw new Error('execution_report_cleanup_container_not_removed');
  }
  if (!report.cleanup_proof.post_removal_absent) {
    throw new Error('execution_report_cleanup_absence_unproven');
  }
  if (!report.role_bootstrap_proof) {
    throw new Error('execution_report_role_bootstrap_proof_missing');
  }
  validateRoleBootstrapProof(report.role_bootstrap_proof);
}

function snapshotHash(snapshot: PhaseSnapshot): string {
  return sha256Hex(stableStringify(snapshot));
}

function generatePassword(): string {
  return randomBytes(32).toString('hex');
}

export function redactExecutionReport(report: ExecutionReport): ExecutionReport {
  const json = stableStringify(report);
  const redacted = json
    .replace(/POSTGRES_PASSWORD=[^"\s,}]+/g, 'POSTGRES_PASSWORD=[REDACTED]')
    .replace(/PGPASSWORD=[^"\s,}]+/g, 'PGPASSWORD=[REDACTED]')
    .replace(/"password"\s*:\s*"[^"]+"/g, '"password":"[REDACTED]"')
    .replace(/postgres(ql)?:\/\/[^@\s"]+@[^\s"]+/gi, 'postgresql://[REDACTED]');
  return JSON.parse(redacted) as ExecutionReport;
}

function verifyContainerLabels(
  labelsJson: string,
  expected: ContainerLabels,
  identity: DisposableIdentity
): void {
  const labels = JSON.parse(labelsJson) as Record<string, string>;
  if (labels['m55.fixture'] !== expected.fixture) throw new Error('cleanup_label_fixture_mismatch');
  if (labels['m55.runtime_revision'] !== expected.runtime_revision) {
    throw new Error('cleanup_label_runtime_revision_mismatch');
  }
  if (labels['m55.oracle_sha256'] !== expected.oracle_sha256) {
    throw new Error('cleanup_label_oracle_sha_mismatch');
  }
  if (labels['m55.manifest_sha256'] !== expected.manifest_sha256) {
    throw new Error('cleanup_label_manifest_sha_mismatch');
  }
  if (labels['m55.creation_nonce'] !== expected.creation_nonce) {
    throw new Error('cleanup_label_nonce_mismatch');
  }
  if (labels['m55.creation_nonce'] !== identity.nonce) throw new Error('cleanup_label_identity_nonce_mismatch');
}

export function waitForReadiness(
  identity: DisposableIdentity,
  runner: InjectedRunner,
  sleep: SleepFn = () => {}
): boolean {
  for (let attempt = 0; attempt < READINESS_MAX_ATTEMPTS; attempt += 1) {
    const result = runner.run(buildReadinessCommand(identity));
    if (result.exitCode === 0) return true;
    if (attempt + 1 < READINESS_MAX_ATTEMPTS) sleep(READINESS_INTERVAL_MS);
  }
  return false;
}

type ExecuteOptions = {
  workspaceRoot: string;
  runner: InjectedRunner;
  nonce?: string;
  injectFailureAt?: FailureBoundary;
  sleep?: SleepFn;
};

function executeDisposablePlanInternal(
  repoRoot: string,
  options: ExecuteOptions
): ExecutionReport {
  const frozen = validateFrozenInputs(repoRoot);
  const identity = buildDisposableIdentity(options.nonce);
  const labels: ContainerLabels = {
    fixture: 'true',
    runtime_revision: DISPOSABLE_RUNTIME_REVISION,
    oracle_sha256: frozen.oracle_sha256,
    manifest_sha256: frozen.manifest_sha256,
    creation_nonce: identity.nonce,
  };
  const plan = instantiateExecutionPlanForIdentity(
    buildDisposableExecutionPlan(repoRoot, { workspaceRoot: options.workspaceRoot }),
    identity,
    labels
  );
  validateExecutionPlan(plan);
  try {
    validateExecutionPlanIdentity(plan, identity, labels);
  } catch (identityError) {
    return redactExecutionReport({
      ok: false,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: identity.container_name,
      database_name: identity.database_name,
      container_lifecycle: 'NOT_CREATED',
      role_bootstrap_proof: null,
      phases: [],
      function_parity: [],
      cleanup_proof: null,
      failure_boundary: 'container_run',
      error: identityError instanceof Error ? identityError.message : String(identityError),
      cleanup_error: null,
    });
  }
  const oraclePhases = deriveExecutionOracle(repoRoot).oracleObject.phases as OraclePhase[];
  const password = generatePassword();
  const migrationTupleHash = sha256Hex(
    plan.migration_steps.map((s) => `${s.migration_version}:${s.migration_sha256}`).join('\n')
  );
  const phaseResults: PhaseRuntimeResult[] = [];
  let containerLifecycle: ContainerLifecycle = 'NOT_CREATED';
  let cleanupProof: ExecutionReport['cleanup_proof'] = null;
  let failureBoundary: FailureBoundary | null = null;
  let error: string | null = null;
  let cleanup_error: string | null = null;
  let cleanupAttempted = false;
  let functionParityResults: FunctionParityResult[] = [];
  let roleBootstrapProof: RoleBootstrapProof | null = null;
  const sleep = options.sleep ?? (() => {});

  const performCleanup = (reason: string): { removed: boolean; absent: boolean; cleanupError: string | null } => {
    if (containerLifecycle !== 'CREATED') {
      cleanupProof = {
        attempted: false,
        container_removed: false,
        container_name: identity.container_name,
        post_removal_absent: true,
      };
      return { removed: false, absent: true, cleanupError: null };
    }
    if (cleanupAttempted) {
      return { removed: false, absent: false, cleanupError: 'cleanup_already_attempted' };
    }
    cleanupAttempted = true;
    try {
      const cleanup = buildFailureCleanupPlan(identity);
      commandUsesForbiddenPattern(cleanup.rm);
      const inspect = options.runner.run(cleanup.inspect);
      if (inspect.exitCode !== 0) {
        return { removed: false, absent: false, cleanupError: 'cleanup_inspect_failed' };
      }
      verifyContainerLabels(inspect.stdout.trim(), labels, identity);
      const rm = options.runner.run(cleanup.rm);
      if (rm.exitCode !== 0) {
        return { removed: false, absent: false, cleanupError: rm.stderr || 'cleanup_rm_failed' };
      }
      const absenceLookup = options.runner.run(cleanup.absence);
      if (isCleanupTransportFailure(absenceLookup.stderr)) {
        return { removed: true, absent: false, cleanupError: 'cleanup_absence_transport_failed' };
      }
      if (!isContainerAbsentProof(absenceLookup.exitCode, absenceLookup.stdout, absenceLookup.stderr)) {
        const exists = options.runner.run(cleanup.exists);
        if (isCleanupTransportFailure(exists.stderr)) {
          return { removed: true, absent: false, cleanupError: 'cleanup_absence_transport_failed' };
        }
        if (!isContainerAbsentProof(exists.exitCode, exists.stdout, exists.stderr)) {
          return { removed: true, absent: false, cleanupError: 'cleanup_post_absence_unproven' };
        }
      }
      containerLifecycle = 'REMOVED';
      return { removed: true, absent: true, cleanupError: null };
    } catch (cleanupErr) {
      return {
        removed: false,
        absent: false,
        cleanupError: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      };
    } finally {
      cleanupProof = {
        attempted: cleanupAttempted,
        container_removed: containerLifecycle === 'REMOVED',
        container_name: identity.container_name,
        post_removal_absent: containerLifecycle === 'REMOVED',
      };
    }
  };

  const fail = (boundary: FailureBoundary, message: string): ExecutionReport => {
    failureBoundary = boundary;
    error = message;
    const cleanup = performCleanup(message);
    if (cleanup.cleanupError) cleanup_error = cleanup.cleanupError;
    return redactExecutionReport({
      ok: false,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: identity.container_name,
      database_name: identity.database_name,
      container_lifecycle: containerLifecycle,
      role_bootstrap_proof: roleBootstrapProof,
      phases: phaseResults,
      function_parity: functionParityResults,
      cleanup_proof: cleanupProof,
      failure_boundary: failureBoundary,
      error,
      cleanup_error,
    });
  };

  const maybeFail = (boundary: FailureBoundary): ExecutionReport | null => {
    if (options.injectFailureAt === boundary) return fail(boundary, `injected_failure:${boundary}`);
    return null;
  };

  let injected = maybeFail('image_pull');
  if (injected) return injected;
  const pullResult = options.runner.run(buildDockerPullCommand());
  if (pullResult.exitCode !== 0) return fail('image_pull', pullResult.stderr || 'image_pull_failed');

  injected = maybeFail('container_run');
  if (injected) return injected;
  const runCommand = buildDockerRunCommand(identity, labels);
  if (runCommand.some((part) => part === password)) {
    return fail('container_run', 'password_in_argv_forbidden');
  }
  const runEnv = mergeChildProcessEnv(password);
  if (!runEnv.POSTGRES_PASSWORD || runEnv.POSTGRES_PASSWORD !== password) {
    return fail('container_run', 'postgres_password_env_missing');
  }
  const runResult = options.runner.run(runCommand, { env: runEnv });
  if (runResult.exitCode !== 0) return fail('container_run', runResult.stderr || 'container_run_failed');
  containerLifecycle = 'CREATED';

  injected = maybeFail('readiness');
  if (injected) return injected;
  if (!waitForReadiness(identity, options.runner, sleep)) {
    return fail('readiness', 'readiness_timeout');
  }

  injected = maybeFail('p0_bootstrap');
  if (injected) return injected;
  const bootstrapSql = [
    buildRoleBootstrapSql(),
    buildFixtureMetadataSql({
      fixtureRevision: DISPOSABLE_RUNTIME_REVISION,
      oracleRevision: EXECUTION_ORACLE_REVISION,
      oracleSha256: frozen.oracle_sha256,
      manifestSha256: frozen.manifest_sha256,
      migrationTupleHash,
      databaseName: identity.database_name,
      containerName: identity.container_name,
      creationNonce: identity.nonce,
    }),
  ].join('\n');
  const bootstrap = options.runner.run(buildDockerExecPsqlCommand(identity), { stdin: bootstrapSql });
  if (bootstrap.exitCode !== 0) return fail('p0_bootstrap', bootstrap.stderr || 'p0_bootstrap_failed');

  const proofOut = options.runner.run(buildDockerExecPsqlCommand(identity), {
    stdin: buildRoleBootstrapProofSql(),
  });
  if (proofOut.exitCode !== 0) {
    return fail('p0_bootstrap', proofOut.stderr || 'role_bootstrap_proof_failed');
  }
  try {
    roleBootstrapProof = parseRoleBootstrapProof(proofOut.stdout);
    validateRoleBootstrapProof(roleBootstrapProof);
  } catch (proofError) {
    return fail(
      'p0_bootstrap',
      proofError instanceof Error ? proofError.message : String(proofError)
    );
  }

  injected = maybeFail('p0_preflight');
  if (injected) return injected;
  const preflight = options.runner.run(buildDockerExecPsqlCommand(identity), {
    stdin: buildP0PreflightSql(identity, migrationTupleHash),
  });
  if (preflight.exitCode !== 0) return fail('p0_preflight', preflight.stderr || 'p0_preflight_failed');
  try {
    const preflightJson = parsePsqlJsonOutput(preflight.stdout) as Record<string, unknown>;
    validateP0PreflightResult(preflightJson, identity, frozen, migrationTupleHash);
  } catch (preflightError) {
    return fail(
      'p0_preflight',
      preflightError instanceof Error ? preflightError.message : String(preflightError)
    );
  }

  injected = maybeFail('p0_snapshot');
  if (injected) return injected;
  const p0Oracle = oraclePhases.find((phase) => phase.phase === 'P0');
  if (!p0Oracle) return fail('p0_snapshot', 'oracle_phase_missing:P0');
  const p0SnapshotOut = options.runner.run(buildDockerExecPsqlCommand(identity), {
    stdin: collectRuntimeCatalogSql(),
  });
  if (p0SnapshotOut.exitCode !== 0) return fail('p0_snapshot', p0SnapshotOut.stderr || 'p0_snapshot_failed');
  let p0Snapshot: PhaseSnapshot;
  try {
    const rawCatalog = parseRuntimeCatalogOutput(p0SnapshotOut.stdout);
    p0Snapshot = deriveRuntimePhaseSnapshot(rawCatalog, p0Oracle);
  } catch (parseError) {
    return fail('p0_snapshot', parseError instanceof Error ? parseError.message : String(parseError));
  }
  const p0Compare = compareRuntimePhaseSnapshot(p0Snapshot, p0Oracle);
  phaseResults.push({
    phase: 'P0',
    runtime_snapshot_hash: snapshotHash(p0Snapshot),
    runtime_validation_status: p0Compare.ok ? 'PASS' : 'FAIL',
    oracle_contract_hash: String(p0Oracle.oracle_contract_hash ?? ''),
    compared_categories: p0Compare.compared_categories,
    mismatch_details: p0Compare.mismatches,
    history_prefix: (p0Snapshot.history_prefix as string[]) ?? [],
  });
  if (!p0Compare.ok) return fail('oracle_comparison', p0Compare.mismatches.join(','));

  const migrationBoundaries: Record<Exclude<ExecutionPhaseId, 'P0'>, FailureBoundary> = {
    P1: 'p1_apply',
    P2: 'p2_apply',
    P3: 'p3_apply',
    P4: 'p4_apply',
    P5: 'p5_apply',
    P6: 'p6_apply',
    P7: 'p7_apply',
  };

  for (const step of plan.migration_steps) {
    if (step.phase === 'P0') {
      return fail('p1_apply', 'migration_step_p0_forbidden');
    }
    const boundary = migrationBoundaries[step.phase];
    injected = maybeFail(boundary);
    if (injected) return injected;

    let sql: string;
    try {
      sql = verifyMigrationBytesBeforeApply(step.migration_path, {
        sha256: step.migration_sha256,
        byte_length: step.migration_byte_length,
        line_count: step.migration_line_count,
      });
    } catch (toctouError) {
      return fail(boundary, toctouError instanceof Error ? toctouError.message : String(toctouError));
    }

    const apply = options.runner.run(buildDockerExecPsqlCommand(identity), { stdin: sql });
    if (apply.exitCode !== 0) return fail(boundary, apply.stderr || `migration_apply_failed:${step.phase}`);

    injected = maybeFail('history_check');
    if (injected) return injected;
    const historyInsert = `INSERT INTO ${FIXTURE_META_SCHEMA}.applied_migrations (version) VALUES ('${step.migration_version}');`;
    const history = options.runner.run(buildDockerExecPsqlCommand(identity), { stdin: historyInsert });
    if (history.exitCode !== 0) {
      return fail('history_check', history.stderr || `history_insert_failed:${step.phase}`);
    }

    injected = maybeFail('snapshot_capture');
    if (injected) return injected;
    const snapshotOut = options.runner.run(buildDockerExecPsqlCommand(identity), {
      stdin: collectRuntimeCatalogSql(),
    });
    if (snapshotOut.exitCode !== 0) {
      return fail('snapshot_capture', snapshotOut.stderr || `snapshot_capture_failed:${step.phase}`);
    }

    const oraclePhase = oraclePhases.find((phase) => phase.phase === step.phase);
    if (!oraclePhase) return fail('oracle_comparison', `oracle_phase_missing:${step.phase}`);

    let snapshot: PhaseSnapshot;
    try {
      const rawCatalog = parseRuntimeCatalogOutput(snapshotOut.stdout);
      snapshot = deriveRuntimePhaseSnapshot(rawCatalog, oraclePhase);
    } catch (parseError) {
      return fail('snapshot_capture', parseError instanceof Error ? parseError.message : String(parseError));
    }

    injected = maybeFail('oracle_comparison');
    if (injected) return injected;
    const comparison = compareRuntimePhaseSnapshot(snapshot, oraclePhase);
    phaseResults.push({
      phase: step.phase,
      runtime_snapshot_hash: snapshotHash(snapshot),
      runtime_validation_status: comparison.ok ? 'PASS' : 'FAIL',
      oracle_contract_hash: String(oraclePhase.oracle_contract_hash ?? ''),
      compared_categories: comparison.compared_categories,
      mismatch_details: comparison.mismatches,
      history_prefix: (snapshot.history_prefix as string[]) ?? [],
    });
    if (!comparison.ok) return fail('oracle_comparison', comparison.mismatches.join(','));

    if (step.phase === 'P1') {
      injected = maybeFail('function_parity');
      if (injected) return injected;
      const parityOut = options.runner.run(buildDockerExecPsqlCommand(identity), {
        stdin: buildFunctionParitySql(),
      });
      if (parityOut.exitCode !== 0) {
        return fail('function_parity', parityOut.stderr || 'function_parity_query_failed');
      }
      try {
        functionParityResults = parseFunctionParityOutput(parityOut.stdout);
      } catch (parityError) {
        return fail(
          'function_parity',
          parityError instanceof Error ? parityError.message : String(parityError)
        );
      }
      if (functionParityResults.some((row) => row.status !== 'PASS')) {
        return fail('function_parity', 'function_parity_mismatch');
      }
    }
  }

  injected = maybeFail('cleanup');
  if (injected) return injected;
  const cleanup = performCleanup('success_cleanup');
  if (cleanup.cleanupError) {
    cleanup_error = cleanup.cleanupError;
    return redactExecutionReport({
      ok: false,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: identity.container_name,
      database_name: identity.database_name,
      container_lifecycle: containerLifecycle,
      role_bootstrap_proof: roleBootstrapProof,
      phases: phaseResults,
      function_parity: functionParityResults,
      cleanup_proof: cleanupProof,
      failure_boundary: 'cleanup',
      error: 'cleanup_failed_after_success',
      cleanup_error,
    });
  }

  const successReport = redactExecutionReport({
    ok: true,
    runtime_revision: DISPOSABLE_RUNTIME_REVISION,
    execution_strategy: EXECUTION_STRATEGY,
    enablement_status: EXECUTION_ENABLEMENT_STATUS,
    container_name: identity.container_name,
    database_name: identity.database_name,
    container_lifecycle: containerLifecycle,
    role_bootstrap_proof: roleBootstrapProof,
    phases: phaseResults,
    function_parity: functionParityResults,
    cleanup_proof: cleanupProof,
    failure_boundary: null,
    error: null,
    cleanup_error: null,
  });
  try {
    validateExecutionReportSuccess(successReport);
  } catch (successError) {
    return redactExecutionReport({
      ok: false,
      runtime_revision: DISPOSABLE_RUNTIME_REVISION,
      execution_strategy: EXECUTION_STRATEGY,
      enablement_status: EXECUTION_ENABLEMENT_STATUS,
      container_name: identity.container_name,
      database_name: identity.database_name,
      container_lifecycle: containerLifecycle,
      role_bootstrap_proof: roleBootstrapProof,
      phases: phaseResults,
      function_parity: functionParityResults,
      cleanup_proof: cleanupProof,
      failure_boundary: 'oracle_comparison',
      error: successError instanceof Error ? successError.message : String(successError),
      cleanup_error: null,
    });
  }
  return successReport;
}

/**
 * Test-only, non-authoritative injected-runner entry point.
 * Requires an explicit runner; no default host runner. Not referenced by CLI.
 */
export function executeDisposablePlanWithInjectedRunner(
  repoRoot: string,
  options: {
    workspaceRoot: string;
    runner: InjectedRunner;
    nonce?: string;
    injectFailureAt?: FailureBoundary;
    sleep?: SleepFn;
  }
): ExecutionReport {
  if (!options?.runner) {
    throw new Error('injected_runner_required');
  }
  return executeDisposablePlanInternal(repoRoot, options);
}

export function runDisposableExecutionCli(
  repoRoot: string,
  flags: ParsedDisposableExecutionFlags,
  options?: { runner?: InjectedRunner }
): { exitCode: number; payload: Record<string, unknown> } {
  if (flags.executeLocal) {
    return { exitCode: 1, payload: { ok: false, error: EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR } };
  }
  if (flags.verifyFrozenInputs) {
    const frozen = validateFrozenInputs(repoRoot);
    const docker = validateDockerReadOnlyEvidence(
      collectDockerReadOnlyEvidence(options?.runner ?? createHostSpawnRunner())
    );
    return {
      exitCode: 0,
      payload: {
        ok: true,
        mode: 'verify-frozen-inputs',
        frozen,
        docker_evidence: docker,
        execution_enablement_status: EXECUTION_ENABLEMENT_STATUS,
      },
    };
  }
  if (flags.planExecution) {
    if (!flags.workspaceRoot) {
      return { exitCode: 1, payload: { ok: false, error: 'plan_execution_requires_workspace_root' } };
    }
    const plan = buildDisposableExecutionPlan(repoRoot, { workspaceRoot: flags.workspaceRoot });
    validateExecutionPlan(plan);
    return {
      exitCode: 0,
      payload: {
        ok: true,
        mode: 'plan-execution',
        plan,
        execution_enablement_status: EXECUTION_ENABLEMENT_STATUS,
      },
    };
  }
  return { exitCode: 1, payload: { ok: false, error: 'unsupported_cli_mode' } };
}
