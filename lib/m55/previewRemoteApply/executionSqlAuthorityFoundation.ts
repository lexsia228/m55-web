import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { canonicalSerializePreviewRemoteApply } from './types.ts';

export const EXECUTION_SQL_AUTHORITY_FOUNDATION_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1' as const;

export const EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1' as const;

export const EXPECTED_FOUNDATION_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;
export const EXPECTED_FOUNDATION_BASE_HEAD = '9af0df4fad8e545871648da39690dec9f1d639da' as const;
export const REPOSITORY_IDENTITY_CONTRACT =
  'lib/m55/previewRemoteApply/types.ts:EXPECTED_BRANCH' as const;

export const P1_PRIOR_BOOTSTRAP_PRECONDITION_ID = 'P1_PRIOR_BOOTSTRAP_PRECONDITION_v1' as const;

export const FOUNDATION_REL_PATHS = {
  p0: 'docs/planning/preview-remote-apply/M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  p1PriorBootstrapPrecondition:
    'docs/planning/preview-remote-apply/M55_PREVIEW_P1_PRIOR_BOOTSTRAP_PRECONDITION_v1.sql',
  pureCountsV2:
    'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_APPLICATION_RELATION_COUNTS_PURE_SELECT_v2.sql',
  catalogExtractor: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_CATALOG_EXTRACTOR_v1.sql',
  functionParityExtractor:
    'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_FUNCTION_PARITY_EXTRACTOR_v1.sql',
  foundationJson:
    'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1.json',
  manifestJson:
    'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1.json',
  loader: 'lib/m55/previewRemoteApply/executionSqlAuthorityFoundation.ts',
  tests: 'lib/m55/previewRemoteApply.executionSqlAuthorityFoundation.local.test.ts',
  validator: 'scripts/m55/validatePreviewRemoteExecutionSqlAuthorityFoundation.ts',
} as const;

export const LIFECYCLE_VERSION_REGISTRY = [
  '20260614000000',
  '20260615000001',
  '20260615000002',
  '20260615000003',
  '20260615000004',
  '20260615000005',
  '20260615000006',
] as const;

export const CLASSIFIER_EXPORTS = [
  'parseRuntimeCatalogOutput',
  'normalizeRuntimeCatalog',
  'deriveRuntimePhaseSnapshot',
  'compareRuntimePhaseSnapshot',
] as const;

export const CATALOG_EXTRACTOR_ID = 'M55_PREVIEW_REMOTE_CATALOG_EXTRACTOR_v1' as const;

export const FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS = {
  p0: { bytes: 21188, sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff' },
  p1PriorBootstrapPrecondition: {
    bytes: 11617,
    sha256: '6f7874f6e4b16accf3eedb5c57b9f5e5847df6a9917f82a85aef5c705338e855',
  },
  pureCountsV2: {
    bytes: 1647,
    sha256: 'fbea819218345a5cf2f0d10e0704100beb0ae876ecc4dd26bbc422244ef97905',
  },
  catalogExtractor: {
    bytes: 11114,
    sha256: 'dff8152e5af9735e43952c71000f52a3c84cb5f27f700e98f7faa09a2fb3be1d',
  },
  functionParityExtractor: {
    bytes: 1268,
    sha256: '0322d98ef02c095ff0942bb7498ff625bee67766597ee78aefa30aca56e806ed',
  },
  originalCollector: {
    bytes: 11075,
    sha256: 'f1e62c72d10c0a40753c3f8df8ac41171a46a04783e91b7eed9a225cc74da9e9',
  },
  oracle: {
    path: 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json',
    sha256: '52832c14d55bba8b6194065aa17901c7373d39d208e8175781d729be17855062',
  },
  disposableRuntime: {
    path: 'scripts/m55/previewBaselineDisposableRuntime.ts',
    sha256: '6b82c8e11e21c2e04121da0fb171265858f65a45243c1c174ac3ce12053b5c73',
  },
  classifierFunctionSourceSha256: {
    parseRuntimeCatalogOutput: '3967f899e8cdf13797c287120b82198e56ad4e94afcdd7ff2f95bce95389233c',
    normalizeRuntimeCatalog: 'cfec399963a31d086ccc895a6e13c9d6c5818030691af84e01734041819bed39',
    deriveRuntimePhaseSnapshot: '5e23aaf0b525ef09305faec9303b1f74be3fa37bbdacd2970346c05bb16e2fc1',
    compareRuntimePhaseSnapshot: '65f3e40b15b1d7880eb45f2790de2e3ffc6e0af524ae7778953174198ee63f78',
  },
  postConnectIdentitySql:
    'SELECT current_database()::text AS current_database_name, current_user::text AS current_user_name;',
  postConnectIdentitySqlSha256: '99f233b1b1daae53391d51c986ffcf335639d19aa60044ecca1ef443f3895536',
  sessionSettingsBeforeBegin: [
    "SET lock_timeout TO '30000ms';",
    "SET statement_timeout TO '120000ms';",
    "SET idle_in_transaction_session_timeout TO '180000ms';",
  ] as const,
  policy2HistoryInsertSql:
    'INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ($1, $2::text[], $3)',
  policy2HistoryInsertSource: 'lib/m55/previewRemoteApply/types.ts:HISTORY_INSERT_SQL_METADATA',
  policy2HistoryInsertSourceSha256: 'a1f325a308f99c149a065e531d938756db6f3ae200b9a14042184ff55f5d22b7',
  timeoutPolicySource: 'lib/m55/previewRemoteApply/timeoutPolicy.ts',
  timeoutPolicySha256: '9ae3067eb912c72711477ec9507c5c26ad90768f238ef83034aa0a79af642efa',
  historyBootstrapSource: 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts',
  historyBootstrapSha256: 'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
  p1BootstrapPreconditionStatus: 'FROZEN_EXECUTABLE_AUTHORITY' as const,
  localEquivalenceVerdict: 'TEMP_FIRST_GREEN' as const,
  localEquivalenceCases: [
    { case: 'empty_no_tables', equal: true, orig_hash: '7965628e1cab02c30a8010399fbb9c7f9c8f12ea040c3805a3e5d53d780702fc', remote_hash: '7965628e1cab02c30a8010399fbb9c7f9c8f12ea040c3805a3e5d53d780702fc', counts_type: 'object' },
    { case: 'subset_partial_history', equal: true, orig_hash: '143f8cfb2619daacd2459d2316d60b8f5fbb13c1d1c4b2b9232a44bd2ba5242b', remote_hash: '143f8cfb2619daacd2459d2316d60b8f5fbb13c1d1c4b2b9232a44bd2ba5242b', counts_type: 'object' },
    { case: 'all_varying_full_history', equal: true, orig_hash: '33347db2b7fceefcc34b89257d316513f5fae25597751efd2f1b9a9655dd73df', remote_hash: '33347db2b7fceefcc34b89257d316513f5fae25597751efd2f1b9a9655dd73df', counts_type: 'object' },
    { case: 'non_table_objects', equal: true, orig_hash: 'a5f1f6d27db326398e57b20895106cf49a81ff48987829cc1e692ed02038e421', remote_hash: 'a5f1f6d27db326398e57b20895106cf49a81ff48987829cc1e692ed02038e421', counts_type: 'object' },
    { case: 'untracked_ignored', equal: true, orig_hash: '1f7175989a319e45243844d664dd910a51e365a7b88c34efa48bf4dfe3d1f7c5', remote_hash: '1f7175989a319e45243844d664dd910a51e365a7b88c34efa48bf4dfe3d1f7c5', counts_type: 'object' },
    { case: 'REPEATABILITY', equal: true, hashes: ['1f7175989a319e45243844d664dd910a51e365a7b88c34efa48bf4dfe3d1f7c5', '1f7175989a319e45243844d664dd910a51e365a7b88c34efa48bf4dfe3d1f7c5', '1f7175989a319e45243844d664dd910a51e365a7b88c34efa48bf4dfe3d1f7c5'] },
  ] as const,
} as const;

export const FOUNDATION_MISSING_AUTHORITIES = [
  'ACK classifier authority',
  'pre-commit failure classifier authority',
  'fresh post-commit connection lifecycle',
  'credential acquisition',
  'target connection binding',
  'remote executor implementation',
] as const;

export const P1_PRIOR_BOOTSTRAP_PRECONDITION_CLASSIFICATIONS = [
  'CLEANLY_ABSENT',
  'EXACT_COMPATIBLE_EMPTY',
  'EXACT_COMPATIBLE_WITH_VERSIONS',
  'MALFORMED_RELATION',
  'UNKNOWN_OR_AMBIGUOUS',
] as const;

export const P1_PRIOR_BOOTSTRAP_PRECONDITION_PROCEED_CLASSIFICATIONS = ['CLEANLY_ABSENT'] as const;

export const P1_PRIOR_BOOTSTRAP_PRECONDITION_HOLD_CLASSIFICATIONS = [
  'EXACT_COMPATIBLE_EMPTY',
  'EXACT_COMPATIBLE_WITH_VERSIONS',
  'MALFORMED_RELATION',
  'UNKNOWN_OR_AMBIGUOUS',
] as const;

export const P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS = [
  'bootstrap_precondition_classification',
  'bootstrap_precondition_proceed',
  'bootstrap_precondition_hold',
  'history_schema_exists',
  'history_schema_owner',
  'history_relation_exists',
  'history_relation_relkind',
  'history_relation_owner',
  'history_live_column_count',
  'history_relation_exact_shape',
  'history_primary_key_on_version_exact',
  'history_row_count',
  'applied_versions',
  'duplicate_versions',
  'unexpected_history_versions',
] as const;

export const EXACT_MANIFEST_ORDER = [
  FOUNDATION_REL_PATHS.p0,
  FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition,
  FOUNDATION_REL_PATHS.pureCountsV2,
  FOUNDATION_REL_PATHS.catalogExtractor,
  FOUNDATION_REL_PATHS.functionParityExtractor,
  FOUNDATION_REL_PATHS.foundationJson,
  FOUNDATION_REL_PATHS.loader,
  FOUNDATION_REL_PATHS.tests,
  FOUNDATION_REL_PATHS.validator,
  FOUNDATION_REL_PATHS.manifestJson,
] as const;

export const FROZEN_SOURCE_IDENTITY_KEY_ORDER = [
  'previewBaselineDisposableRuntime',
  'previewBaselineTool',
  'original_collectRuntimeCatalogSql',
  'buildFunctionParitySql',
  'execution_oracle',
  'revision7_contract',
  'revision7_matrix',
  'timeoutPolicy',
  'historyBootstrapSpec',
  'statementStream',
  'types',
] as const;

export const EXPECTED_FROZEN_SOURCE_IDENTITIES = {
  previewBaselineDisposableRuntime: {
    path: 'scripts/m55/previewBaselineDisposableRuntime.ts',
    bytes: 113501,
    sha256: '6b82c8e11e21c2e04121da0fb171265858f65a45243c1c174ac3ce12053b5c73',
  },
  previewBaselineTool: {
    path: 'scripts/m55/previewBaselineTool.ts',
    bytes: 228708,
    sha256: 'd660c9212a0aed62acaf602183504a90d926facdbebd449ce399ff5ed8033f78',
  },
  original_collectRuntimeCatalogSql: {
    bytes: 11075,
    sha256: 'f1e62c72d10c0a40753c3f8df8ac41171a46a04783e91b7eed9a225cc74da9e9',
  },
  buildFunctionParitySql: {
    bytes: 1268,
    sha256: '0322d98ef02c095ff0942bb7498ff625bee67766597ee78aefa30aca56e806ed',
  },
  execution_oracle: {
    path: 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json',
    sha256: '52832c14d55bba8b6194065aa17901c7373d39d208e8175781d729be17855062',
    mutation_forbidden: true,
  },
  revision7_contract: {
    path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json',
    sha256: 'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c',
  },
  revision7_matrix: {
    path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json',
    sha256: '6d677b02ff9c73591cbea151444d5dc61ea766bda7ed6cd0598e63ad16ca9f93',
  },
  timeoutPolicy: {
    path: 'lib/m55/previewRemoteApply/timeoutPolicy.ts',
    sha256: '9ae3067eb912c72711477ec9507c5c26ad90768f238ef83034aa0a79af642efa',
  },
  historyBootstrapSpec: {
    path: 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts',
    sha256: 'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
  },
  statementStream: {
    path: 'lib/m55/transactionNormalized/statementStream.ts',
    sha256: '1a3faaeed3eaefb25e5b5cedb7ece422d537126caef2eaf17a8c10c794953a13',
  },
  types: {
    path: 'lib/m55/previewRemoteApply/types.ts',
    sha256: 'a1f325a308f99c149a065e531d938756db6f3ae200b9a14042184ff55f5d22b7',
  },
} as const;

export const EXPECTED_P0_PREFLIGHT_PATCH2 = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  bytes: 21188,
  sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
} as const;

export const EXPECTED_PURE_APPLICATION_RELATION_COUNTS_V2 = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_APPLICATION_RELATION_COUNTS_PURE_SELECT_v2.sql',
  bytes: 1647,
  sha256: 'fbea819218345a5cf2f0d10e0704100beb0ae876ecc4dd26bbc422244ef97905',
  helper_elimination_patch1_verdict: 'PURE_SELECT_APPLICATION_RELATION_COUNTS_EQUIVALENCE_PATCH1_CLOSED_GREEN',
  equivalence_cases: 9,
} as const;

export const EXPECTED_REMOTE_CATALOG_EXTRACTOR_METADATA = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_CATALOG_EXTRACTOR_v1.sql',
  bytes: 11114,
  sha256: 'dff8152e5af9735e43952c71000f52a3c84cb5f27f700e98f7faa09a2fb3be1d',
  source_collector_sha256: 'f1e62c72d10c0a40753c3f8df8ac41171a46a04783e91b7eed9a225cc74da9e9',
  allowed_transformations: [
    'remove_pg_temp_helper_drop_create_block',
    'embed_pure_select_v2_application_relation_counts_scalar',
    'replace_m55_fixture_meta_applied_migrations_with_supabase_migrations_schema_migrations_version',
  ],
  forbidden_remaining: ['pg_temp', 'm55_fixture_meta', 'helper_function_call'],
  application_relation_counts_json_type: 'object',
} as const;

export const EXPECTED_REMOTE_FUNCTION_PARITY_EXTRACTOR_METADATA = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_FUNCTION_PARITY_EXTRACTOR_v1.sql',
  bytes: 1268,
  sha256: '0322d98ef02c095ff0942bb7498ff625bee67766597ee78aefa30aca56e806ed',
  rewrite_forbidden: true,
} as const;

export const EXPECTED_POST_CONNECT_IDENTITY = {
  sql: 'SELECT current_database()::text AS current_database_name, current_user::text AS current_user_name;',
  sql_sha256: '99f233b1b1daae53391d51c986ffcf335639d19aa60044ecca1ef443f3895536',
  expected: {
    current_database_name: 'postgres',
    current_user_name: 'postgres',
    row_count: 1,
  },
  host_path_secret_output_forbidden: true,
} as const;

export const EXPECTED_SESSION_SETTINGS = {
  placement: 'before_BEGIN',
  timeout_policy_source: 'lib/m55/previewRemoteApply/timeoutPolicy.ts',
  timeout_policy_sha256: '9ae3067eb912c72711477ec9507c5c26ad90768f238ef83034aa0a79af642efa',
  statements: [
    {
      ordinal: 1,
      sql: "SET lock_timeout TO '30000ms';",
      sql_sha256: '1944c4c2fbc2d6e87bad74810b7b6e28737fa872b0d3a61638a2999519889231',
    },
    {
      ordinal: 2,
      sql: "SET statement_timeout TO '120000ms';",
      sql_sha256: '519c1875fa8ed7f28d594ca70bfc18be886de15e6fee9b823a23e8266b31637e',
    },
    {
      ordinal: 3,
      sql: "SET idle_in_transaction_session_timeout TO '180000ms';",
      sql_sha256: '1c3a0e3e67aa96ef992a08bc20a5bb020bfd67324ca372fdb3bd2c0a9a192202',
    },
  ],
} as const;

export const EXPECTED_POLICY2_HISTORY_INSERT = {
  sql: 'INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ($1, $2::text[], $3)',
  source: 'lib/m55/previewRemoteApply/types.ts:HISTORY_INSERT_SQL_METADATA',
  source_sha256: 'a1f325a308f99c149a065e531d938756db6f3ae200b9a14042184ff55f5d22b7',
  parameters: ['version', 'statements text[]', 'name'],
} as const;

export const EXPECTED_P1_BOOTSTRAP = {
  ddl_source_path: 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts',
  ddl_source_sha256: 'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
  precondition_status: 'FROZEN_EXECUTABLE_AUTHORITY',
} as const;

export const EXPECTED_P1_PRIOR_BOOTSTRAP_PRECONDITION = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_P1_PRIOR_BOOTSTRAP_PRECONDITION_v1.sql',
  bytes: 11617,
  sha256: '6f7874f6e4b16accf3eedb5c57b9f5e5847df6a9917f82a85aef5c705338e855',
  provenance_bootstrap_spec_path: 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts',
  provenance_bootstrap_spec_sha256: 'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
  provenance_p0_source_path: 'docs/planning/preview-remote-apply/M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  provenance_p0_source_sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
  provenance_roles: {
    bootstrap_exact_shape: 'historyBootstrapSpec.ts',
    absence_safe_version_read: 'M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  },
  exact_shape_column_order: ['version', 'statements', 'name'],
  bootstrap_proceed_classifications: [...P1_PRIOR_BOOTSTRAP_PRECONDITION_PROCEED_CLASSIFICATIONS],
  bootstrap_hold_classifications: [...P1_PRIOR_BOOTSTRAP_PRECONDITION_HOLD_CLASSIFICATIONS],
  statement_count: 1,
  read_only: true,
  top_level_select_stmt: true,
  classifications: [...P1_PRIOR_BOOTSTRAP_PRECONDITION_CLASSIFICATIONS],
  result_columns: [...P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS],
} as const;

export const MANIFEST_FILE_CLASSIFICATIONS: Readonly<Record<string, string>> = {
  [FOUNDATION_REL_PATHS.p0]: 'p0_preflight_patch2',
  [FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition]: 'p1_prior_bootstrap_precondition',
  [FOUNDATION_REL_PATHS.pureCountsV2]: 'pure_application_relation_counts_v2',
  [FOUNDATION_REL_PATHS.catalogExtractor]: 'remote_catalog_extractor',
  [FOUNDATION_REL_PATHS.functionParityExtractor]: 'remote_function_parity_extractor',
  [FOUNDATION_REL_PATHS.foundationJson]: 'foundation_json',
  [FOUNDATION_REL_PATHS.loader]: 'foundation_loader',
  [FOUNDATION_REL_PATHS.tests]: 'foundation_tests',
  [FOUNDATION_REL_PATHS.validator]: 'foundation_validator',
  [FOUNDATION_REL_PATHS.manifestJson]: 'foundation_manifest',
};

type LifecycleSlotSpec = {
  expected_oracle_phase: string;
  expected_history_prefix: readonly string[];
  extractor: string | null;
  classifier_exports: readonly string[];
  transaction_placement: string;
  fresh_connection_required: boolean;
  authority_semantics_frozen: boolean;
  orchestration_implemented: false;
  execution_authorized: false;
  status?: string;
};

type LifecyclePhaseSpec = {
  phase_id: string;
  prior: LifecycleSlotSpec;
  in_tx_post: LifecycleSlotSpec;
  post_commit: LifecycleSlotSpec;
};

export type ExecutionSqlAuthorityFoundationDocument = {
  readonly identifier: typeof EXECUTION_SQL_AUTHORITY_FOUNDATION_ID;
  readonly execution_authorization: false;
  readonly db_connection_remote: false;
  readonly sql_executed_remote: false;
  readonly migration_apply_authorized: false;
  readonly missing_authorities: readonly string[];
  readonly workspace_binding?: {
    readonly repository_identity_contract?: string;
    readonly expected_branch?: string;
    readonly base_head_commit_sha?: string;
  };
  readonly frozen_source_identities?: Record<string, unknown>;
  readonly p0_preflight_patch2?: Record<string, unknown>;
  readonly pure_application_relation_counts_v2?: Record<string, unknown>;
  readonly remote_catalog_extractor?: Record<string, unknown>;
  readonly remote_function_parity_extractor?: Record<string, unknown>;
  readonly post_connect_identity?: Record<string, unknown>;
  readonly session_settings?: Record<string, unknown>;
  readonly policy2_history_insert?: Record<string, unknown>;
  readonly lifecycle?: {
    readonly version_registry?: readonly string[];
    readonly phases?: readonly LifecyclePhaseSpec[];
    readonly final_p7?: LifecycleSlotSpec & { readonly phase_id: string };
  };
  readonly p1_bootstrap?: { readonly precondition_status?: string };
  readonly p1_prior_bootstrap_precondition?: Record<string, unknown>;
  readonly local_full_extractor_equivalence?: {
    readonly verdict?: string;
    readonly cases?: readonly Record<string, unknown>[];
  };
  readonly classifiers?: {
    readonly bindings?: readonly { readonly export_name: string; readonly function_source_sha256: string }[];
  };
};

export type ExecutionSqlAuthorityFoundationManifestDocument = {
  readonly identifier: typeof EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID;
  readonly base_head_commit_sha: string;
  readonly expected_branch: string;
  readonly execution_authorization: false;
  readonly db_connection_remote: false;
  readonly sql_executed_remote: false;
  readonly migration_apply_authorized: false;
  readonly files: readonly {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
    readonly classification: string;
  }[];
  readonly missing_authorities: readonly string[];
};

export type ExecutionSqlAuthorityFoundationValidationResult = {
  readonly ok: boolean;
  readonly holdReasonCode: 'HOLD_FOUNDATION_AUTHORITY_MISMATCH' | null;
  readonly checkedCategories: readonly string[];
  readonly mismatchCategories: readonly string[];
};

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function stable(value: unknown): string {
  return canonicalSerializePreviewRemoteApply(value);
}

function buildLifecycleSlot(phaseNumber: number, slot: 'prior' | 'in_tx_post' | 'post_commit'): LifecycleSlotSpec {
  const prefix = LIFECYCLE_VERSION_REGISTRY.slice(0, phaseNumber);
  const priorPrefix = LIFECYCLE_VERSION_REGISTRY.slice(0, phaseNumber - 1);
  if (slot === 'prior') {
    if (phaseNumber === 1) {
      return {
        expected_oracle_phase: 'P0',
        expected_history_prefix: [],
        extractor: P1_PRIOR_BOOTSTRAP_PRECONDITION_ID,
        classifier_exports: CLASSIFIER_EXPORTS,
        transaction_placement: 'inside_transaction_after_BEGIN_before_bootstrap_DDL',
        fresh_connection_required: false,
        authority_semantics_frozen: true,
        status: 'FROZEN_EXECUTABLE_AUTHORITY',
        orchestration_implemented: false,
        execution_authorized: false,
      };
    }
    return {
      expected_oracle_phase: `P${phaseNumber - 1}`,
      expected_history_prefix: priorPrefix,
      extractor: CATALOG_EXTRACTOR_ID,
      classifier_exports: CLASSIFIER_EXPORTS,
      transaction_placement: 'inside_mutation_transaction_after_BEGIN_before_mutation',
      fresh_connection_required: false,
      authority_semantics_frozen: true,
      orchestration_implemented: false,
      execution_authorized: false,
    };
  }
  if (slot === 'in_tx_post') {
    return {
      expected_oracle_phase: `P${phaseNumber}`,
      expected_history_prefix: prefix,
      extractor: CATALOG_EXTRACTOR_ID,
      classifier_exports: CLASSIFIER_EXPORTS,
      transaction_placement: 'after_mutation_history_insert_before_COMMIT',
      fresh_connection_required: false,
      authority_semantics_frozen: true,
      orchestration_implemented: false,
      execution_authorized: false,
    };
  }
  return {
    expected_oracle_phase: `P${phaseNumber}`,
    expected_history_prefix: prefix,
    extractor: CATALOG_EXTRACTOR_ID,
    classifier_exports: CLASSIFIER_EXPORTS,
    transaction_placement: 'fresh_readonly_connection_after_original_close',
    fresh_connection_required: true,
    authority_semantics_frozen: true,
    orchestration_implemented: false,
    execution_authorized: false,
  };
}

export function buildExpectedLifecyclePhases(): LifecyclePhaseSpec[] {
  return Array.from({ length: 7 }, (_, index) => {
    const phaseNumber = index + 1;
    return {
      phase_id: `P${phaseNumber}`,
      prior: buildLifecycleSlot(phaseNumber, 'prior'),
      in_tx_post: buildLifecycleSlot(phaseNumber, 'in_tx_post'),
      post_commit: buildLifecycleSlot(phaseNumber, 'post_commit'),
    };
  });
}

export function buildExpectedFinalP7(): LifecycleSlotSpec & { phase_id: string } {
  return {
    phase_id: 'FINAL_P7',
    expected_oracle_phase: 'P7',
    expected_history_prefix: LIFECYCLE_VERSION_REGISTRY,
    extractor: CATALOG_EXTRACTOR_ID,
    classifier_exports: CLASSIFIER_EXPORTS,
    transaction_placement: 'fresh_readonly_connection_after_original_close',
    fresh_connection_required: true,
    authority_semantics_frozen: true,
    orchestration_implemented: false,
    execution_authorized: false,
  };
}

function validateSqlArtifact(
  workspaceRoot: string,
  relPath: string,
  expected: { bytes: number; sha256: string },
  mismatches: string[],
  category: string,
): void {
  const abs = join(workspaceRoot, relPath);
  let bytes: Buffer;
  try {
    bytes = readFileSync(abs);
  } catch {
    mismatches.push(`${category}:missing`);
    return;
  }
  if (bytes.length !== expected.bytes) {
    mismatches.push(`${category}:bytes`);
  }
  if (sha256File(abs) !== expected.sha256) {
    mismatches.push(`${category}:sha256`);
  }
}

function validateP1PriorBootstrapPreconditionSql(sql: string, mismatches: string[]): void {
  const trimmed = sql.trim();
  if ((trimmed.match(/;/g) ?? []).length !== 1) mismatches.push('p1_prior_bootstrap_precondition:semicolon_count');
  const withoutLeadingComments = trimmed.replace(/^(?:\s*--[^\n]*\n)+/m, '').trim();
  if (!/^WITH\b/i.test(withoutLeadingComments)) {
    mismatches.push('p1_prior_bootstrap_precondition:top_level_select_stmt');
  }
  if (/\b(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|DO|CALL|COPY)\b/i.test(sql)) {
    mismatches.push('p1_prior_bootstrap_precondition:mutation_forbidden');
  }
  if (!sql.includes('historyBootstrapSpec.ts')) mismatches.push('p1_prior_bootstrap_precondition:provenance_bootstrap_spec');
  if (!sql.includes('M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql')) {
    mismatches.push('p1_prior_bootstrap_precondition:provenance_p0_source');
  }
  if (!sql.includes('history_schema_exists')) mismatches.push('p1_prior_bootstrap_precondition:history_schema_exists');
  if (!sql.includes('history_relation_exact_shape')) mismatches.push('p1_prior_bootstrap_precondition:history_relation_exact_shape');
  if (!sql.includes('history_primary_key_on_version_exact')) {
    mismatches.push('p1_prior_bootstrap_precondition:history_primary_key_on_version_exact');
  }
  if (!sql.includes('bootstrap_precondition_proceed')) mismatches.push('p1_prior_bootstrap_precondition:bootstrap_precondition_proceed');
  if (!sql.includes('bootstrap_precondition_hold')) mismatches.push('p1_prior_bootstrap_precondition:bootstrap_precondition_hold');
  if (!sql.includes('WHEN es.history_relation_exact_shape THEN query_to_xml')) {
    mismatches.push('p1_prior_bootstrap_precondition:unsafe_version_read_gating');
  }
  if (!sql.includes("ARRAY['version', 'statements', 'name']")) {
    mismatches.push('p1_prior_bootstrap_precondition:exact_shape_column_order');
  }
  if (!sql.includes("history_schema_owner = 'postgres'")) mismatches.push('p1_prior_bootstrap_precondition:schema_owner_predicate');
  if (!sql.includes("history_relation_owner = 'postgres'")) mismatches.push('p1_prior_bootstrap_precondition:relation_owner_predicate');
  const finalSelect = sql.slice(sql.lastIndexOf('SELECT'));
  for (const column of P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS) {
    if (!finalSelect.includes(column)) mismatches.push(`p1_prior_bootstrap_precondition:result_column:${column}`);
  }
  for (const classification of P1_PRIOR_BOOTSTRAP_PRECONDITION_CLASSIFICATIONS) {
    if (!sql.includes(`'${classification}'`)) mismatches.push(`p1_prior_bootstrap_precondition:classification:${classification}`);
  }
  const unsafeRangeVar = /FROM\s+supabase_migrations\.schema_migrations/i;
  for (const line of sql.split('\n')) {
    if (unsafeRangeVar.test(line) && !line.includes('history_query_text')) {
      mismatches.push('p1_prior_bootstrap_precondition:unsafe_rangevar');
      break;
    }
  }
}

function validateRemoteCatalogExtractorSql(sql: string, mismatches: string[]): void {
  const trimmed = sql.trim();
  if ((trimmed.match(/;/g) ?? []).length !== 1) mismatches.push('catalog_extractor:semicolon_count');
  if (!trimmed.startsWith('WITH tracked(relation_name)')) mismatches.push('catalog_extractor:missing_v2_cte_prefix');
  if (!trimmed.includes('SELECT json_build_object(')) mismatches.push('catalog_extractor:missing_json_build_object');
  if (/pg_temp/i.test(sql)) mismatches.push('catalog_extractor:pg_temp');
  if (/m55_fixture_meta/i.test(sql)) mismatches.push('catalog_extractor:m55_fixture_meta');
  if (/DROP FUNCTION/i.test(sql)) mismatches.push('catalog_extractor:drop_function');
  if (/CREATE OR REPLACE FUNCTION/i.test(sql)) mismatches.push('catalog_extractor:create_function');
  if (!sql.includes('supabase_migrations.schema_migrations')) mismatches.push('catalog_extractor:missing_remote_history');
  if (sql.includes('pg_temp.m55_application_relation_counts')) mismatches.push('catalog_extractor:helper_call_remains');
  if (!sql.includes('jsonb_object_agg(b.relation_name, b.row_count_int')) mismatches.push('catalog_extractor:missing_embedded_counts');
}

function validateClassifierBindings(workspaceRoot: string, foundation: ExecutionSqlAuthorityFoundationDocument, mismatches: string[]): void {
  const sourcePath = join(workspaceRoot, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.path);
  const source = readFileSync(sourcePath, 'utf8');
  if (sha256File(sourcePath) !== FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.sha256) {
    mismatches.push('classifier:disposable_runtime_sha256');
  }
  const ranges: Array<[keyof typeof FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.classifierFunctionSourceSha256, number, number]> = [
    ['parseRuntimeCatalogOutput', 1799, 1818],
    ['normalizeRuntimeCatalog', 1820, 1885],
    ['deriveRuntimePhaseSnapshot', 1964, 2016],
    ['compareRuntimePhaseSnapshot', 2101, 2126],
  ];
  const lines = source.split('\n');
  for (const [name, start, end] of ranges) {
    const body = lines.slice(start - 1, end).join('\n');
    const actual = createHash('sha256').update(body, 'utf8').digest('hex');
    const expected = FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.classifierFunctionSourceSha256[name];
    if (actual !== expected) mismatches.push(`classifier:${name}`);
    const binding = foundation.classifiers?.bindings?.find((entry) => entry.export_name === name);
    if (!binding || binding.function_source_sha256 !== expected) {
      mismatches.push(`classifier_binding:${name}`);
    }
  }
}

function manifestSelfSha256ExcludingSelfHashField(content: string, manifestRelPath: string): string {
  const clone = JSON.parse(content) as {
    files: Array<{ path: string; bytes: number; sha256: string; classification: string }>;
  };
  const idx = clone.files.findIndex((entry) => entry.path === manifestRelPath);
  if (idx < 0) throw new Error('manifest_self_entry_missing');
  clone.files[idx] = { ...clone.files[idx]!, sha256: '0'.repeat(64) };
  return createHash('sha256').update(`${JSON.stringify(clone, null, 2)}\n`, 'utf8').digest('hex');
}

function validateNoAbsoluteWorkspacePaths(foundationText: string, manifestText: string, mismatches: string[]): void {
  if (foundationText.includes('/Users/')) mismatches.push('workspace_binding:absolute_path');
  if (manifestText.includes('/Users/')) mismatches.push('manifest:absolute_path');
  if (/"repoRoot"/i.test(foundationText) || /"repoRoot"/i.test(manifestText)) {
    mismatches.push('workspace_binding:repoRoot_field');
  }
  if (/"expected_repo_root"/.test(foundationText)) mismatches.push('workspace_binding:expected_repo_root_field');
}

function validateLifecycleMapping(foundation: ExecutionSqlAuthorityFoundationDocument, mismatches: string[]): void {
  const lifecycle = foundation.lifecycle;
  if (!lifecycle) {
    mismatches.push('lifecycle:missing');
    return;
  }
  if (stable(lifecycle.version_registry ?? []) !== stable(LIFECYCLE_VERSION_REGISTRY)) {
    mismatches.push('lifecycle:version_registry');
  }
  const expectedPhases = buildExpectedLifecyclePhases();
  const actualPhases = lifecycle.phases ?? [];
  if (actualPhases.length !== 7) mismatches.push('lifecycle:phase_count');
  const phaseIds = actualPhases.map((phase) => phase.phase_id);
  if (new Set(phaseIds).size !== phaseIds.length) mismatches.push('lifecycle:duplicate_phase_id');
  for (let index = 0; index < expectedPhases.length; index++) {
    const expected = expectedPhases[index]!;
    const actual = actualPhases[index];
    if (!actual || actual.phase_id !== expected.phase_id) {
      mismatches.push(`lifecycle:phase_order:${index}`);
      continue;
    }
    for (const slot of ['prior', 'in_tx_post', 'post_commit'] as const) {
      if (stable(actual[slot]) !== stable(expected[slot])) {
        mismatches.push(`lifecycle:${expected.phase_id}:${slot}`);
      }
    }
  }
  const expectedFinal = buildExpectedFinalP7();
  if (!lifecycle.final_p7 || stable(lifecycle.final_p7) !== stable(expectedFinal)) {
    mismatches.push('lifecycle:final_p7');
  }
}

function validateLocalEquivalenceEvidence(foundation: ExecutionSqlAuthorityFoundationDocument, mismatches: string[]): void {
  const block = foundation.local_full_extractor_equivalence;
  if (!block || block.verdict !== FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.localEquivalenceVerdict) {
    mismatches.push('local_equivalence:verdict');
  }
  if (stable(block?.cases ?? []) !== stable(FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.localEquivalenceCases)) {
    mismatches.push('local_equivalence:cases');
  }
}

function validateFoundationMetadataBlocks(
  foundation: ExecutionSqlAuthorityFoundationDocument,
  mismatches: string[],
): void {
  const frozen = foundation.frozen_source_identities ?? {};
  const frozenKeys = Object.keys(frozen);
  if (stable(frozenKeys) !== stable([...FROZEN_SOURCE_IDENTITY_KEY_ORDER])) {
    mismatches.push('frozen_source_identities:keys');
  }
  if (stable(frozen) !== stable(EXPECTED_FROZEN_SOURCE_IDENTITIES)) {
    mismatches.push('frozen_source_identities:values');
  }
  if (stable(foundation.p0_preflight_patch2 ?? null) !== stable(EXPECTED_P0_PREFLIGHT_PATCH2)) {
    mismatches.push('p0_preflight_patch2:metadata');
  }
  if (stable(foundation.pure_application_relation_counts_v2 ?? null) !== stable(EXPECTED_PURE_APPLICATION_RELATION_COUNTS_V2)) {
    mismatches.push('pure_application_relation_counts_v2:metadata');
  }
  if (stable(foundation.remote_catalog_extractor ?? null) !== stable(EXPECTED_REMOTE_CATALOG_EXTRACTOR_METADATA)) {
    mismatches.push('remote_catalog_extractor:metadata');
  }
  if (stable(foundation.remote_function_parity_extractor ?? null) !== stable(EXPECTED_REMOTE_FUNCTION_PARITY_EXTRACTOR_METADATA)) {
    mismatches.push('remote_function_parity_extractor:metadata');
  }
  if (stable(foundation.post_connect_identity ?? null) !== stable(EXPECTED_POST_CONNECT_IDENTITY)) {
    mismatches.push('post_connect_identity:metadata');
  }
  if (stable(foundation.session_settings ?? null) !== stable(EXPECTED_SESSION_SETTINGS)) {
    mismatches.push('session_settings:metadata');
  }
  if (stable(foundation.policy2_history_insert ?? null) !== stable(EXPECTED_POLICY2_HISTORY_INSERT)) {
    mismatches.push('policy2_history_insert:metadata');
  }
  if (stable(foundation.p1_bootstrap ?? null) !== stable(EXPECTED_P1_BOOTSTRAP)) {
    mismatches.push('p1_bootstrap:metadata');
  }
  if (stable(foundation.p1_prior_bootstrap_precondition ?? null) !== stable(EXPECTED_P1_PRIOR_BOOTSTRAP_PRECONDITION)) {
    mismatches.push('p1_prior_bootstrap_precondition:metadata');
  }
}

function validateManifestEntries(
  workspaceRoot: string,
  manifest: ExecutionSqlAuthorityFoundationManifestDocument,
  mismatches: string[],
): void {
  const actualPaths = manifest.files.map((entry) => entry.path);
  const expectedPaths = [...EXACT_MANIFEST_ORDER];
  if (manifest.files.length !== 10) mismatches.push('manifest:file_count');
  if (new Set(actualPaths).size !== actualPaths.length) mismatches.push('manifest:duplicate_path');
  const actualSet = new Set<string>(actualPaths);
  const expectedSet = new Set<string>(expectedPaths);
  if (actualPaths.some((path) => !expectedSet.has(path)) || expectedPaths.some((path) => !actualSet.has(path))) {
    mismatches.push('manifest:unexpected_path');
  }
  if (stable(actualPaths) !== stable(expectedPaths)) mismatches.push('manifest:order');
  if (mismatches.some((entry) => entry.startsWith('manifest:'))) {
    return;
  }
  for (const entry of manifest.files) {
    const expectedClassification = MANIFEST_FILE_CLASSIFICATIONS[entry.path];
    if (!expectedClassification || entry.classification !== expectedClassification) {
      mismatches.push(`manifest:classification:${entry.path}`);
    }
    const abs = join(workspaceRoot, entry.path);
    let content: Buffer;
    try {
      content = readFileSync(abs);
    } catch {
      mismatches.push(`manifest_file:${entry.path}:missing`);
      continue;
    }
    const actualBytes = content.length;
    if (entry.path === FOUNDATION_REL_PATHS.manifestJson) {
      if (actualBytes !== entry.bytes) mismatches.push(`manifest_file:${entry.path}:bytes`);
      const excludedSha = manifestSelfSha256ExcludingSelfHashField(content.toString('utf8'), entry.path);
      if (entry.sha256 !== excludedSha) mismatches.push(`manifest_file:${entry.path}:self_sha256`);
      continue;
    }
    const actualSha = sha256File(abs);
    if (actualBytes !== entry.bytes || actualSha !== entry.sha256) {
      mismatches.push(`manifest_file:${entry.path}`);
    }
  }
}

export function loadExecutionSqlAuthorityFoundationDocument(
  workspaceRoot: string,
): ExecutionSqlAuthorityFoundationDocument {
  return readJsonFile<ExecutionSqlAuthorityFoundationDocument>(
    join(workspaceRoot, FOUNDATION_REL_PATHS.foundationJson),
  );
}

export function loadExecutionSqlAuthorityFoundationManifest(
  workspaceRoot: string,
): ExecutionSqlAuthorityFoundationManifestDocument {
  return readJsonFile<ExecutionSqlAuthorityFoundationManifestDocument>(
    join(workspaceRoot, FOUNDATION_REL_PATHS.manifestJson),
  );
}

export function validateExecutionSqlAuthorityFoundation(
  workspaceRoot: string,
): ExecutionSqlAuthorityFoundationValidationResult {
  const checkedCategories: string[] = [];
  const mismatches: string[] = [];

  checkedCategories.push('foundation_json');
  const foundationPath = join(workspaceRoot, FOUNDATION_REL_PATHS.foundationJson);
  const foundationText = readFileSync(foundationPath, 'utf8');
  const foundation = JSON.parse(foundationText) as ExecutionSqlAuthorityFoundationDocument;

  if (foundation.identifier !== EXECUTION_SQL_AUTHORITY_FOUNDATION_ID) mismatches.push('foundation_json:identifier');
  if (foundation.execution_authorization !== false) mismatches.push('foundation_json:execution_authorization');
  if (foundation.db_connection_remote !== false) mismatches.push('foundation_json:db_connection_remote');
  if (foundation.sql_executed_remote !== false) mismatches.push('foundation_json:sql_executed_remote');
  if (foundation.migration_apply_authorized !== false) mismatches.push('foundation_json:migration_apply_authorized');

  checkedCategories.push('workspace_binding');
  const binding = foundation.workspace_binding;
  if (binding?.repository_identity_contract !== REPOSITORY_IDENTITY_CONTRACT) {
    mismatches.push('workspace_binding:repository_identity_contract');
  }
  if (binding?.expected_branch !== EXPECTED_FOUNDATION_BRANCH) mismatches.push('workspace_binding:expected_branch');
  if (binding?.base_head_commit_sha !== EXPECTED_FOUNDATION_BASE_HEAD) {
    mismatches.push('workspace_binding:base_head_commit_sha');
  }

  checkedCategories.push('manifest_json');
  const manifestPath = join(workspaceRoot, FOUNDATION_REL_PATHS.manifestJson);
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText) as ExecutionSqlAuthorityFoundationManifestDocument;
  if (manifest.identifier !== EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID) mismatches.push('manifest_json:identifier');
  if (manifest.expected_branch !== EXPECTED_FOUNDATION_BRANCH) mismatches.push('manifest:expected_branch');
  if (manifest.base_head_commit_sha !== EXPECTED_FOUNDATION_BASE_HEAD) mismatches.push('manifest:base_head_commit_sha');
  if (manifest.execution_authorization !== false) mismatches.push('manifest:execution_authorization');
  if (manifest.db_connection_remote !== false) mismatches.push('manifest:db_connection_remote');
  if (manifest.sql_executed_remote !== false) mismatches.push('manifest:sql_executed_remote');
  if (manifest.migration_apply_authorized !== false) mismatches.push('manifest:migration_apply_authorized');

  checkedCategories.push('absolute_path_forbidden');
  validateNoAbsoluteWorkspacePaths(foundationText, manifestText, mismatches);

  checkedCategories.push('missing_authorities');
  if (stable(foundation.missing_authorities) !== stable(FOUNDATION_MISSING_AUTHORITIES)) {
    mismatches.push('missing_authorities:foundation');
  }
  if (stable(manifest.missing_authorities) !== stable(FOUNDATION_MISSING_AUTHORITIES)) {
    mismatches.push('missing_authorities:manifest');
  }

  checkedCategories.push('p0');
  validateSqlArtifact(workspaceRoot, FOUNDATION_REL_PATHS.p0, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p0, mismatches, 'p0');
  checkedCategories.push('p1_prior_bootstrap_precondition');
  validateSqlArtifact(
    workspaceRoot,
    FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition,
    FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p1PriorBootstrapPrecondition,
    mismatches,
    'p1_prior_bootstrap_precondition',
  );
  const p1SqlPath = join(workspaceRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
  try {
    validateP1PriorBootstrapPreconditionSql(readFileSync(p1SqlPath, 'utf8'), mismatches);
  } catch {
    if (!mismatches.includes('p1_prior_bootstrap_precondition:missing')) {
      mismatches.push('p1_prior_bootstrap_precondition:missing');
    }
  }
  checkedCategories.push('pure_counts_v2');
  validateSqlArtifact(workspaceRoot, FOUNDATION_REL_PATHS.pureCountsV2, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.pureCountsV2, mismatches, 'pure_counts_v2');
  checkedCategories.push('catalog_extractor');
  validateSqlArtifact(workspaceRoot, FOUNDATION_REL_PATHS.catalogExtractor, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor, mismatches, 'catalog_extractor');
  validateRemoteCatalogExtractorSql(readFileSync(join(workspaceRoot, FOUNDATION_REL_PATHS.catalogExtractor), 'utf8'), mismatches);
  checkedCategories.push('function_parity_extractor');
  validateSqlArtifact(workspaceRoot, FOUNDATION_REL_PATHS.functionParityExtractor, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.functionParityExtractor, mismatches, 'function_parity_extractor');

  checkedCategories.push('oracle');
  const oraclePath = join(workspaceRoot, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.path);
  if (sha256File(oraclePath) !== FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.sha256) mismatches.push('oracle:sha256');

  checkedCategories.push('classifiers');
  validateClassifierBindings(workspaceRoot, foundation, mismatches);

  checkedCategories.push('foundation_metadata');
  validateFoundationMetadataBlocks(foundation, mismatches);

  checkedCategories.push('lifecycle_mapping');
  validateLifecycleMapping(foundation, mismatches);

  checkedCategories.push('local_equivalence_evidence');
  validateLocalEquivalenceEvidence(foundation, mismatches);

  checkedCategories.push('manifest_file_identities');
  validateManifestEntries(workspaceRoot, manifest, mismatches);

  return {
    ok: mismatches.length === 0,
    holdReasonCode: mismatches.length === 0 ? null : 'HOLD_FOUNDATION_AUTHORITY_MISMATCH',
    checkedCategories,
    mismatchCategories: mismatches,
  };
}

export function getExecutionSqlAuthorityFoundationPublicSummary(workspaceRoot: string): Record<string, unknown> {
  const foundation = loadExecutionSqlAuthorityFoundationDocument(workspaceRoot);
  const manifest = loadExecutionSqlAuthorityFoundationManifest(workspaceRoot);
  const validation = validateExecutionSqlAuthorityFoundation(workspaceRoot);
  return {
    identifier: foundation.identifier,
    manifest_identifier: manifest.identifier,
    expected_branch: EXPECTED_FOUNDATION_BRANCH,
    base_head_commit_sha: EXPECTED_FOUNDATION_BASE_HEAD,
    repository_identity_contract: REPOSITORY_IDENTITY_CONTRACT,
    execution_authorization: false,
    db_connection_remote: false,
    sql_executed_remote: false,
    migration_apply_authorized: false,
    validation_ok: validation.ok,
    hold_reason_code: validation.holdReasonCode,
    file_count: manifest.files.length,
    missing_authorities: [...FOUNDATION_MISSING_AUTHORITIES],
    local_equivalence_verdict: foundation.local_full_extractor_equivalence?.verdict ?? null,
    lifecycle_orchestration_implemented: false,
    p1_bootstrap_precondition_status: FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p1BootstrapPreconditionStatus,
    p1_prior_authority_semantics_frozen: true,
  };
}
