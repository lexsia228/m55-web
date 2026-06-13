#!/usr/bin/env node --experimental-strip-types
/**
 * M55 Preview Baseline tooling — PREVIEW-ONLY artifact generator.
 * Strategy: PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  copyFileSync,
  lstatSync,
  realpathSync,
  readdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname, relative, isAbsolute, sep, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// ── Strategy / version constants ────────────────────────────────────────────

export const STRATEGY = 'PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN' as const;
export const BASELINE_VERSION = '20260614000000' as const;
export const BASELINE_FILENAME =
  '20260614000000_preview_production_aligned_baseline_p1.sql' as const;
export const GENERATOR_VERSION = '7' as const;
export const MATRIX_REVISION = 'PREVIEW-BASELINE-CONTRACT-MATRIX-v1-REVISION-7' as const;
export const MANIFEST_REVISION = 'PREVIEW-BASELINE-MANIFEST-v1-REVISION-8' as const;
export const BASELINE_SQL_REVISION = 'PREVIEW-BASELINE-SQL-v1-REVISION-8' as const;
export const PGLAST_EXPECTED_VERSION = '7.14' as const;
export const APPROVED_PENDING_COVERAGE_CATEGORIES = ['functions_body_production_parity'] as const;
export const PENDING_FUNCTION_PARITY_REASON =
  'production_pg_get_functiondef_hash_and_length_not_yet_compared' as const;
export const STATIC_READINESS_STATE = 'STATIC_READY_EXECUTION_VALIDATION_REQUIRED' as const;
export const PRODUCTION_BODY_PARITY_STATUS = 'PENDING_DISPOSABLE_EXECUTION' as const;
export const OPERATIONAL_METADATA_SCOPE = 'OPERATIONAL_SCHEMA_ONLY' as const;
export const SOURCE_DIAGNOSTIC_REVISION = 'SQL-DIAGNOSTIC-REVISION-1-PATCH-4' as const;

export const SOURCE_DIAGNOSTIC_SQL_SHA256 =
  '6a23194a9ecb97b132a9d9c221b31f8524b45a18680dab96553e4c6909e1bd65';

export const EXPECTED_GAP_DIAGNOSTIC_SHA256 =
  '59095b8fa0ed5c386a5127ef612eae3f08efc1ca519348fc169cba54b5827c9f';
export const EXPECTED_P3_COLUMNS_SHA256 =
  '8cb8e4f685fad93e7669f2e053f32624ce019066ec07dfb7437621dc9f4f3ed9';
export const EXPECTED_EVIDENCE_BUNDLE_SHA256 =
  '2ef8b8375f1b92379a13c4c38cba5650e93085e38130a77196246f77f14629e0';

export const PRODUCTION_FUNCTION_DEFINITION_EXPORT_REVISION =
  'M55-PRODUCTION-FUNCTION-DEFINITION-EXPORT-v1' as const;
export const EXPECTED_PRODUCTION_FUNCTION_DEFINITION_EXPORT_SHA256 =
  'af13d58b7b30cbb8f750d9077e28c3ac27f17b49732c3418f2fb89c7afcb7eb9' as const;
export const PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_BYTES = 18_495;
export const PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_NEWLINES = 1;

export const PRODUCTION_FUNCTION_PARITY_TARGETS = [
  {
    functionName: 'm55_consult_reply_commit',
    expectedMd5: '6a157d3b1d54ff91c85fceac209e4b26',
    expectedCharacterLength: 9635,
    expectedCrlfCount: 330,
    expectedLocalCanonicalNormalizedSha256:
      '322616dc36c916a9b4883dc4bca10af73dadc0844b15de43c8b1b35f1bb6e4f7',
  },
  {
    functionName: 'm55_reply_generate_commit',
    expectedMd5: '4a9ce16d8fad737c10a7cf8b15ea94fe',
    expectedCharacterLength: 6141,
    expectedCrlfCount: 246,
    expectedProductionRawSha256:
      '26b524761979d82498bf3b0523fd9e341dd2e135332ab1d2fbf21a7c9fa3846a',
  },
] as const;

const REPLY_ALLOWED_SPACING_PATTERN = /SELECT available_count\s+INTO v_avail_before/g;
const REPLY_ALLOWED_SPACING_REPLACEMENT = 'SELECT available_count INTO v_avail_before';

export const GAP_DIAGNOSTIC_EXPECTED_BYTES = 1_078_883;
export const GAP_DIAGNOSTIC_EXPECTED_NEWLINES = 2;
export const P3_COLUMNS_EXPECTED_BYTES = 98_669;
export const P3_COLUMNS_EXPECTED_NEWLINES = 142;
export const P3_COLUMN_COUNT = 31;
export const P3_DATA_ROW_COUNT = 141;

export const WORKSPACE_MARKER_FILENAME = '.m55-preview-baseline-workspace.json' as const;
export const WORKSPACE_DIR_BASENAME = 'm55-preview-baseline-workspace' as const;

export const REQUIRED_RELATIONS = [
  'consult_messages',
  'consult_send_commits',
  'consult_threads',
  'dtr_guest_drafts',
  'dtr_report_snapshots',
  'entitlement_rights',
  'entitlements',
  'failed_fulfillments',
  'one_time_fulfillments',
  'reply_documents',
  'reply_sessions',
  'reply_ticket_wallets',
  'reply_wallet_ledgers',
  'stripe_events',
  'stripe_processed_events',
] as const;

export const PATCH4_COLUMN_TARGET_RELATIONS = [
  'entitlements',
  'stripe_events',
  'stripe_processed_events',
  'reply_ticket_wallets',
] as const;

export const PATCH4_HEADERS = [
  'diagnostic_revision',
  'target_organization',
  'target_project',
  'target_environment',
  'target_source',
  'expected_registry_row_count',
  'independent_expected_count',
  'registry_self_check_ok',
  'requested_gap_cell_count',
  'resolved_gap_cell_count',
  'unresolved_gap_cell_count',
  'duplicate_gap_cell_count',
  'unexpected_registry_cell_count',
  'unexpected_catalog_item_count',
  'relation_security_json',
  'privilege_contract_json',
  'policy_inventory_json',
  'column_inventory_json',
  'constraint_inventory_json',
  'index_inventory_json',
  'trigger_inventory_json',
  'function_inventory_json',
  'wallet_scope_json',
  'expected_contract_mismatch_json',
  'unexpected_catalog_items_json',
  'missing_or_unknown_json',
  'catalog_snapshot_complete',
  'stop_reason',
  'next_gate_recommendation',
] as const;

export const P3_HEADERS = [
  'schema_name',
  'relation_name',
  'ordinal_position',
  'column_name',
  'formatted_type',
  'type_kind',
  'data_type',
  'udt_schema',
  'udt_name',
  'domain_schema',
  'domain_name',
  'domain_base_type',
  'domain_base_type_oid',
  'domain_not_null',
  'domain_default_expression',
  'domain_default_present',
  'domain_default_state_known',
  'is_nullable',
  'default_expression',
  'default_present',
  'identity_kind',
  'generated_kind',
  'collation',
  'storage',
  'compression',
  'attnotnull',
  'attisdropped',
  'column_comment',
  'column_contract_known',
  'domain_state_known',
  'compression_state_known',
] as const;

export const P3_EXPECTED_RELATION_COUNTS: Record<(typeof REQUIRED_RELATIONS)[number], number> = {
  consult_messages: 5,
  consult_send_commits: 14,
  consult_threads: 8,
  dtr_guest_drafts: 8,
  dtr_report_snapshots: 17,
  entitlement_rights: 6,
  entitlements: 11,
  failed_fulfillments: 6,
  one_time_fulfillments: 6,
  reply_documents: 8,
  reply_sessions: 13,
  reply_ticket_wallets: 10,
  reply_wallet_ledgers: 15,
  stripe_events: 3,
  stripe_processed_events: 11,
};

export const PATHS = {
  gapDiagnosticRaw:
    'docs/planning/preview-baseline/source/m55_production_gap_diagnostic_patch4_result.raw',
  p3ColumnsRaw:
    'docs/planning/preview-baseline/source/m55_production_contract_freeze_p3_columns_result.raw',
  baselineSql: `docs/planning/preview-baseline/migrations/${BASELINE_FILENAME}`,
  contractMatrix: 'docs/planning/preview-baseline/preview_baseline_contract_matrix_v1.json',
  manifest: 'docs/planning/preview-baseline/preview_baseline_manifest_v1.json',
  diagnosticSql: 'docs/planning/m55_production_baseline_gap_diagnostic_v1.sql',
  replyGenerateCommitMigration:
    'supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql',
  consultReplyCommitMigration:
    'supabase/migrations/20260523120000_m55_consult_reply_commit_rpc_v1.sql',
  productionFunctionDefinitionExport:
    'docs/planning/preview-baseline/source/m55_production_function_definition_export_v1.json',
  workspaceMarker: WORKSPACE_MARKER_FILENAME,
  executionOracle: 'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json',
} as const;

export const EXECUTION_ORACLE_REVISION = 'PREVIEW-BASELINE-EXECUTION-ORACLE-v1-PATCH-1' as const;
export const EXPECTED_BASELINE_ARTIFACT_SHA256 =
  'a897251fe465294918f69aad5a2fc120fb594c71d5f51cbfd90eb1a36aec01f0' as const;
export const EXPECTED_MATRIX_ARTIFACT_SHA256 =
  'd5d34b135acabe3cd7fc41144069d9deee133472810264e1b397cf5bd3a19257' as const;
export const EXPECTED_MANIFEST_ARTIFACT_SHA256 =
  '5c698f95448f823bf19bd12f44f36ea07d3c52befcf903708ab6d65442f37e20' as const;
export const FIXTURE_META_SCHEMA = 'm55_fixture_meta' as const;
export const FIXTURE_META_RELATION = 'fixture_identity' as const;

export const CANONICAL_MIGRATIONS = [
  {
    sequence: 2,
    version: '20260615000001',
    filename: '20260615000001_failed_fulfillments_user_ref_hash.sql',
    sourcePath: 'supabase/migrations/20260615000001_failed_fulfillments_user_ref_hash.sql',
    sourceClass: 'canonical' as const,
    sha256: 'd4a2f09058eac13aaea054cafaa47ca7b4288e38871973e16d99a51263d2459c',
    byteLength: 674,
    stateFrom: 'P1',
    stateTo: 'P2',
  },
  {
    sequence: 3,
    version: '20260615000002',
    filename: '20260615000002_m55_account_deletion_ledger_v1.sql',
    sourcePath: 'supabase/migrations/20260615000002_m55_account_deletion_ledger_v1.sql',
    sourceClass: 'canonical' as const,
    sha256: 'fa7cb92edb43b858d7fdbad249620a4a01fdb2c4c18c61d6079b8831aba4d8f5',
    byteLength: 1583,
    stateFrom: 'P2',
    stateTo: 'P3',
  },
  {
    sequence: 4,
    version: '20260615000003',
    filename: '20260615000003_m55_account_deletion_process_rpc_v1.sql',
    sourcePath: 'supabase/migrations/20260615000003_m55_account_deletion_process_rpc_v1.sql',
    sourceClass: 'canonical' as const,
    sha256: '25597665f594dfef6c60fb5af500e70105535c786f85c3c3b4f817c1da82567c',
    byteLength: 16040,
    stateFrom: 'P3',
    stateTo: 'P4',
  },
  {
    sequence: 5,
    version: '20260615000004',
    filename: '20260615000004_m55_entitlements_and_rights_access_security_v1.sql',
    sourcePath:
      'supabase/migrations/20260615000004_m55_entitlements_and_rights_access_security_v1.sql',
    sourceClass: 'canonical' as const,
    sha256: '40d865c874152c49706ea1fbf2eb9bb873d2d629aa758ff77877dcc25967492d',
    byteLength: 18337,
    stateFrom: 'P4',
    stateTo: 'P5',
  },
  {
    sequence: 6,
    version: '20260615000005',
    filename: '20260615000005_m55_dtr_visible_report_uniqueness_v1.sql',
    sourcePath: 'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql',
    sourceClass: 'canonical' as const,
    sha256: 'b283aa73ea4b004c006229dfc6afec222b44ea71422b34cb7a3fa3f46862d8f6',
    byteLength: 18265,
    stateFrom: 'P5',
    stateTo: 'P6',
  },
  {
    sequence: 7,
    version: '20260615000006',
    filename: '20260615000006_m55_entitlements_unique_index_cleanup_v1.sql',
    sourcePath: 'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql',
    sourceClass: 'canonical' as const,
    sha256: 'c9ddd37396985fdfb116365073a330fbd4b31b4b592f7cec661ec157b2f8903e',
    byteLength: 15577,
    stateFrom: 'P6',
    stateTo: 'P7',
  },
] as const;

export const FUNCTION_SOURCE_MIGRATIONS = [
  {
    functionIdentity: 'public.m55_reply_generate_commit',
    sourceMigrationPath: PATHS.replyGenerateCommitMigration,
    sourceMigrationSha256: '8eb356fa8c37c344fda9d42fe3e5cc27ce3b0200f11ef59eb23e7bf7efdcfee7',
    targetName: 'm55_reply_generate_commit',
    identityArguments:
      'p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text',
  },
  {
    functionIdentity: 'public.m55_consult_reply_commit',
    sourceMigrationPath: PATHS.consultReplyCommitMigration,
    sourceMigrationSha256: '119ecee04b70de6546a31be5c8a960679d6448b12f2b8dea2cdf0c0960c1b3ba',
    targetName: 'm55_consult_reply_commit',
    identityArguments:
      'p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone',
  },
] as const;

export const PERMANENTLY_ABSENT_OBJECTS = [
  'purchases',
  'subscriptions',
  'invoice_dtr_grants',
  'm55_user_identity_mappings',
  'app.user_profiles',
] as const;

export const P1_ABSENT_OBJECTS = [
  ...PERMANENTLY_ABSENT_OBJECTS,
  'failed_fulfillments.user_ref_hash',
  'failed_fulfillments_user_ref_hash_format_check',
  'idx_failed_fulfillments_user_ref_hash',
  'clerk_webhook_events',
  'm55_account_deletion_process_v1',
] as const;

/** Runtime `pg_get_constraintdef(con.oid, true)` canonical fingerprint for P2 migration 20260615000001. */
export const FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT = [
  'public',
  'failed_fulfillments',
  'failed_fulfillments_user_ref_hash_format_check',
  'c',
  "CHECK (user_ref_hash IS NULL OR user_ref_hash ~ '^[0-9a-f]{16}$'::text)",
  'true',
  'false',
  'false',
  ' ',
  ' ',
  ' ',
  '',
  '',
  'user_ref_hash',
  '',
].join('|');

/** Stale oracle fingerprint using `pg_get_constraintdef(..., false)` parentheses and empty source_columns. */
export const FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE = [
  'public',
  'failed_fulfillments',
  'failed_fulfillments_user_ref_hash_format_check',
  'c',
  "CHECK (((user_ref_hash IS NULL) OR (user_ref_hash ~ '^[0-9a-f]{16}$'::text)))",
  'true',
  'false',
  'false',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
].join('|');

/** Runtime canonical fingerprints for P3 migration 20260615000002 clerk_webhook_events constraints. */
export const CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS = [
  'public|clerk_webhook_events|clerk_webhook_events_attempt_count_check|c|CHECK (attempt_count >= 0)|true|false|false| | | |||attempt_count|',
  'public|clerk_webhook_events|clerk_webhook_events_deletion_subject_id_check|c|CHECK (deletion_subject_id IS NULL OR deletion_subject_id ~ \'^m55-del:[0-9a-f]{32}$\'::text)|true|false|false| | | |||deletion_subject_id|',
  'public|clerk_webhook_events|clerk_webhook_events_error_code_check|c|CHECK (error_code IS NULL OR (error_code = ANY (ARRAY[\'INVALID_PROCESSING_STATE\'::text, \'CLEANUP_FAILED\'::text, \'VERIFICATION_FAILED\'::text])))|true|false|false| | | |||error_code|',
  'public|clerk_webhook_events|clerk_webhook_events_pkey|p|PRIMARY KEY (svix_id)|true|false|false| | | |||svix_id|',
  'public|clerk_webhook_events|clerk_webhook_events_status_check|c|CHECK (status = ANY (ARRAY[\'pending\'::text, \'processing\'::text, \'succeeded\'::text, \'failed\'::text]))|true|false|false| | | |||status|',
] as const;

/** Stale oracle fingerprints using pretty=false definitions and empty non-FK metadata. */
export const CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS_STALE_PRETTY_FALSE = [
  'public|clerk_webhook_events|clerk_webhook_events_attempt_count_check|c|CHECK ((attempt_count >= 0))|true|false|false||||||',
  'public|clerk_webhook_events|clerk_webhook_events_deletion_subject_id_check|c|CHECK (((deletion_subject_id IS NULL) OR (deletion_subject_id ~ \'^m55-del:[0-9a-f]{32}$\'::text)))|true|false|false||||||',
  'public|clerk_webhook_events|clerk_webhook_events_error_code_check|c|CHECK (((error_code IS NULL) OR (error_code = ANY (ARRAY[\'INVALID_PROCESSING_STATE\'::text, \'CLEANUP_FAILED\'::text, \'VERIFICATION_FAILED\'::text]))))|true|false|false||||||',
  'public|clerk_webhook_events|clerk_webhook_events_pkey|p|PRIMARY KEY (svix_id)|true|false|false|||||svix_id|',
  'public|clerk_webhook_events|clerk_webhook_events_status_check|c|CHECK ((status = ANY (ARRAY[\'pending\'::text, \'processing\'::text, \'succeeded\'::text, \'failed\'::text])))|true|false|false||||||',
] as const;

/** Runtime proconfig for P4 migration 20260615000003 m55_account_deletion_process_v1. */
export const M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_PROCONFIG = [
  'search_path=public, pg_temp',
] as const;

/** Stale oracle fingerprint using empty stableStringify(proconfig) while search_path field was correct. */
export const M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT_STALE_EMPTY_PROCONFIG =
  'public|m55_account_deletion_process_v1|true|v|u|[]|search_path=public, pg_temp';

/** Runtime canonical function_config fingerprint for m55_account_deletion_process_v1 at P4+. */
export const M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT = [
  'public',
  'm55_account_deletion_process_v1',
  'true',
  'v',
  'u',
  stableStringify([...M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_PROCONFIG]),
  'search_path=public, pg_temp',
].join('|');

export const PRIVILEGE_NAMES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
] as const;

export const PRIVILEGE_ROLES = ['PUBLIC', 'anon', 'authenticated', 'service_role'] as const;

export const COVERAGE_CATEGORIES = [
  'relation',
  'columns',
  'constraints',
  'indexes',
  'policies',
  'privileges',
  'triggers',
  'functions_identity',
  'functions_body_source_provenance',
  'functions_body_production_parity',
  'wallet',
  'state_registry',
  'state_presence',
  'state_transitions',
  'excluded_objects',
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

export type RequiredRelation = (typeof REQUIRED_RELATIONS)[number];

export type MarkdownPipeTable = {
  headers: string[];
  rows: string[][];
};

export type Patch4InventoryCell<T> = {
  cell_id: string;
  category: string;
  role_name: string | null;
  actual_json: T;
  object_name: string;
  schema_name: string;
  privilege_name: string | null;
  evidence_source: string;
  resolution_state: string;
  unresolved_reason: string | null;
};

export type Patch4Row = {
  scalars: Record<string, string>;
  relation_security: Patch4InventoryCell<Record<string, unknown>>[];
  privilege_contract: Patch4InventoryCell<Record<string, unknown>>[];
  policy_inventory: Patch4InventoryCell<{ policies: PolicyRecord[] }>[];
  column_inventory: Patch4InventoryCell<{ columns: ColumnInventoryRecord[] }>[];
  constraint_inventory: Patch4InventoryCell<{ constraints: ConstraintRecord[] }>[];
  index_inventory: Patch4InventoryCell<{ indexes: IndexRecord[] }>[];
  trigger_inventory: Patch4InventoryCell<{ triggers: TriggerRecord[] }>[];
  function_inventory: Patch4InventoryCell<FunctionIdentityRecord>[];
  wallet_scope: Patch4InventoryCell<Record<string, unknown>>[];
  expected_contract_mismatch: unknown[];
  unexpected_catalog_items: unknown[];
  missing_or_unknown: unknown[];
};

export type P3ColumnRow = Record<(typeof P3_HEADERS)[number], string>;

export type PolicyRecord = {
  roles: string[];
  command: string;
  policy_oid?: string;
  policy_name: string;
  using_expression: string | null;
  with_check_expression: string | null;
  permissive_restrictive: string;
};

export type ColumnInventoryRecord = {
  ordinal_position: number;
  column_name: string;
  formatted_type?: string;
  data_type?: string;
  is_nullable: boolean;
  default_expression: string | null;
  default_present: boolean;
};

export type ConstraintRecord = {
  constraint_name: string;
  constraint_type: string;
  definition: string;
  validated?: boolean;
  deferrable?: boolean;
  initially_deferred?: boolean;
  match_type?: string;
  delete_action?: string;
  update_action?: string;
  source_columns?: string[];
  target_schema?: string | null;
  target_relation?: string | null;
  target_columns?: string[] | null;
};

export type IndexRecord = {
  index_name: string;
  definition: string;
  constraint_backed: boolean;
  is_primary?: boolean;
  is_unique?: boolean;
  key_columns?: string[];
  predicate?: string | null;
};

export type TriggerRecord = {
  trigger_name: string;
  definition: string;
  is_internal: boolean;
  function_name?: string;
  function_schema?: string;
  enabled_state?: string;
  trigger_classification?: string;
};

export type CoverageStatus = 'COMPLETE' | 'PENDING_EXECUTION' | 'FAILED';
export type RuntimeValidationStatus = 'NOT_REQUIRED' | 'NOT_RUN' | 'PASSED' | 'FAILED';

export type FunctionIdentityRecord = {
  function_name: string;
  function_schema: string;
  identity_arguments: string;
  resolved_identity_arguments?: string;
  definition_hash: string;
  definition_hash_algorithm?: string;
  definition_length: number;
  owner_role: string;
  security_definer: boolean;
  volatility: string;
  parallel_safety?: string;
  result_type: string;
  search_path?: string;
  proconfig?: string[];
  overload_count?: number;
  exact_signature_count?: number;
  public_execute?: boolean;
  anon_execute?: boolean;
  authenticated_execute?: boolean;
  service_role_execute?: boolean;
};

export type FunctionExtraction = {
  functionIdentity: string;
  targetName: string;
  identityArguments: string;
  sourceMigrationPath: string;
  sourceMigrationExpectedSha256: string;
  sourceMigrationActualSha256: string;
  sourceMigrationSha256Match: boolean;
  statements: string[];
  extractionHash: string;
  extractionStatementCount: number;
};

export type PrivacyScanMatch = {
  rule_id: string;
  file: string;
  offset: number;
  line: number;
  match_class: string;
  redacted_context: string;
  blocking: boolean;
  allowed_reason: string | null;
};

export type PrivacyScanResult = {
  status: 'pass' | 'fail';
  rules_revision: string;
  matches: PrivacyScanMatch[];
};

export type CoverageMatrixEntry = {
  category: (typeof COVERAGE_CATEGORIES)[number];
  coverage_status: CoverageStatus;
  required_object_count: number;
  expected_id_count: number;
  actual_id_count: number;
  source_artifact_ids: string[];
  source_sections: string[];
  actual_coverage_count: number;
  missing_ids: string[];
  duplicate_ids: string[];
  unexpected_ids: string[];
  missing_objects: string[];
  duplicate_objects: string[];
  unexpected_objects: string[];
  semantic_validation_pass: boolean;
  static_prerequisites_pass: boolean;
  runtime_validation_status: RuntimeValidationStatus;
  pending_validation_reason: string | null;
  source_conflicts: string[];
  coverage_complete: boolean;
  generation_authority: string;
};

export type WorkspaceMarker = {
  tool: string;
  revision: string;
  manifest_sha256: string;
  migration_tuple_hash: string;
  created_path: string;
  source_repo: string;
  safe_cleanup_root: string;
};

// ── Utility helpers ─────────────────────────────────────────────────────────

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256File(path: string): string {
  return sha256Hex(readFileSync(path));
}

export function countNewlines(text: string): number {
  const matches = text.match(/\n/g);
  return matches ? matches.length : 0;
}

export function lineNumberAtOffset(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

export function resolveRepoPath(repoRoot: string, relPath: string): string {
  return isAbsolute(relPath) ? relPath : resolve(repoRoot, relPath);
}

/** Strict path containment using path.relative — string prefix alone is forbidden. */
export function isPathStrictlyInside(parentReal: string, childReal: string): boolean {
  if (parentReal === childReal) return false;
  const rel = relative(parentReal, childReal);
  if (!rel || rel === '..') return false;
  if (isAbsolute(rel)) return false;
  if (rel.startsWith(`..${sep}`) || rel === '..') return false;
  return !rel.split(sep).includes('..');
}

export type IdSetValidation = {
  expectedIds: string[];
  actualIds: string[];
  missingIds: string[];
  duplicateIds: string[];
  unexpectedIds: string[];
  semanticValidationPass: boolean;
};

export function validateIdSet(expected: string[], actual: string[]): IdSetValidation {
  const expectedSet = new Set(expected);
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const id of actual) {
    if (seen.has(id)) duplicateIds.push(id);
    seen.add(id);
  }
  const actualUnique = [...new Set(actual)];
  const missingIds = expected.filter((id) => !seen.has(id));
  const unexpectedIds = actualUnique.filter((id) => !expectedSet.has(id));
  return {
    expectedIds: expected,
    actualIds: actualUnique,
    missingIds,
    duplicateIds: [...new Set(duplicateIds)],
    unexpectedIds,
    semanticValidationPass:
      missingIds.length === 0 && duplicateIds.length === 0 && unexpectedIds.length === 0,
  };
}

// ── Markdown pipe table parser ──────────────────────────────────────────────

function splitPipeRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    if (line[i] === '|') {
      cells.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += line[i];
    i += 1;
  }
  cells.push(current);
  if (cells.length > 0 && cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells.map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')) || cell === '')
  );
}

export function parseMarkdownPipeTable(text: string): MarkdownPipeTable {
  const lines = text.split('\n').filter((line, index, all) => {
    if (line.trim().length > 0) return true;
    return index === all.length - 1 && all[all.length - 1] === '';
  });
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length < 2) {
    throw new Error('Markdown pipe table requires header and separator rows');
  }

  const headers = splitPipeRow(nonEmpty[0]);
  const separator = splitPipeRow(nonEmpty[1]);
  if (!isSeparatorRow(separator)) {
    throw new Error('Markdown pipe table separator row is invalid');
  }
  if (separator.length !== headers.length) {
    throw new Error(
      `Markdown pipe table separator column count mismatch: headers=${headers.length} separator=${separator.length}`
    );
  }

  const headerSet = new Set<string>();
  for (const header of headers) {
    if (!header) throw new Error('Markdown pipe table contains empty header');
    if (headerSet.has(header)) throw new Error(`Markdown pipe table duplicate header: ${header}`);
    headerSet.add(header);
  }

  const rows: string[][] = [];
  for (const line of nonEmpty.slice(2)) {
    const cells = splitPipeRow(line);
    if (cells.length !== headers.length) {
      throw new Error(
        `Markdown pipe table row column count mismatch: expected ${headers.length}, got ${cells.length}`
      );
    }
    rows.push(cells);
  }

  return { headers, rows };
}

function parseJsonCell<T>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON field ${fieldName}: ${message}`);
  }
}

function rowToRecord(headers: readonly string[], cells: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (let i = 0; i < headers.length; i += 1) {
    record[headers[i]] = cells[i] ?? '';
  }
  return record;
}

// ── PATCH-4 parser ──────────────────────────────────────────────────────────

export function parsePatch4Artifact(rawBytes: Buffer | string): Patch4Row {
  const text = typeof rawBytes === 'string' ? rawBytes : rawBytes.toString('utf8');
  const table = parseMarkdownPipeTable(text);
  if (table.headers.length !== PATCH4_HEADERS.length) {
    throw new Error(`PATCH-4 header count mismatch: expected ${PATCH4_HEADERS.length}`);
  }
  for (let i = 0; i < PATCH4_HEADERS.length; i += 1) {
    if (table.headers[i] !== PATCH4_HEADERS[i]) {
      throw new Error(
        `PATCH-4 header mismatch at ${i}: expected ${PATCH4_HEADERS[i]}, got ${table.headers[i]}`
      );
    }
  }
  if (table.rows.length !== 1) {
    throw new Error(`PATCH-4 result must contain exactly one row, got ${table.rows.length}`);
  }

  const scalars = rowToRecord(PATCH4_HEADERS, table.rows[0]);
  validatePatch4Scalars(scalars);

  return {
    scalars,
    relation_security: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('relation_security_json')], 'relation_security_json'),
    privilege_contract: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('privilege_contract_json')], 'privilege_contract_json'),
    policy_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('policy_inventory_json')], 'policy_inventory_json'),
    column_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('column_inventory_json')], 'column_inventory_json'),
    constraint_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('constraint_inventory_json')], 'constraint_inventory_json'),
    index_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('index_inventory_json')], 'index_inventory_json'),
    trigger_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('trigger_inventory_json')], 'trigger_inventory_json'),
    function_inventory: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('function_inventory_json')], 'function_inventory_json'),
    wallet_scope: parseJsonCell(table.rows[0][PATCH4_HEADERS.indexOf('wallet_scope_json')], 'wallet_scope_json'),
    expected_contract_mismatch: parseJsonCell(
      table.rows[0][PATCH4_HEADERS.indexOf('expected_contract_mismatch_json')],
      'expected_contract_mismatch_json'
    ),
    unexpected_catalog_items: parseJsonCell(
      table.rows[0][PATCH4_HEADERS.indexOf('unexpected_catalog_items_json')],
      'unexpected_catalog_items_json'
    ),
    missing_or_unknown: parseJsonCell(
      table.rows[0][PATCH4_HEADERS.indexOf('missing_or_unknown_json')],
      'missing_or_unknown_json'
    ),
  };
}

function validatePatch4Scalars(scalars: Record<string, string>): void {
  const expected: Record<string, string> = {
    diagnostic_revision: SOURCE_DIAGNOSTIC_REVISION,
    target_organization: 'm55-soul',
    target_project: 'm55-soul-core',
    target_environment: 'PRODUCTION',
    target_source: 'Primary Database',
    expected_registry_row_count: '536',
    independent_expected_count: '536',
    registry_self_check_ok: 'true',
    requested_gap_cell_count: '536',
    resolved_gap_cell_count: '536',
    unresolved_gap_cell_count: '0',
    duplicate_gap_cell_count: '0',
    unexpected_registry_cell_count: '0',
    unexpected_catalog_item_count: '0',
    catalog_snapshot_complete: 'true',
    stop_reason: 'CATALOG_SNAPSHOT_COMPLETE',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (scalars[key] !== value) {
      throw new Error(`PATCH-4 scalar mismatch for ${key}: expected ${value}, got ${scalars[key]}`);
    }
  }
}

// ── P3 parser ───────────────────────────────────────────────────────────────

export function parseP3Artifact(rawBytes: Buffer | string): P3ColumnRow[] {
  const text = typeof rawBytes === 'string' ? rawBytes : rawBytes.toString('utf8');
  const table = parseMarkdownPipeTable(text);
  if (table.headers.length !== P3_HEADERS.length) {
    throw new Error(`P3 header count mismatch: expected ${P3_HEADERS.length}`);
  }
  for (let i = 0; i < P3_HEADERS.length; i += 1) {
    if (table.headers[i] !== P3_HEADERS[i]) {
      throw new Error(`P3 header mismatch at ${i}: expected ${P3_HEADERS[i]}, got ${table.headers[i]}`);
    }
  }
  if (table.rows.length !== P3_DATA_ROW_COUNT) {
    throw new Error(`P3 data row count mismatch: expected ${P3_DATA_ROW_COUNT}, got ${table.rows.length}`);
  }

  const rows = table.rows.map((cells) => rowToRecord(P3_HEADERS, cells) as P3ColumnRow);
  validateP3Rows(rows);
  return rows;
}

function validateP3Rows(rows: P3ColumnRow[]): void {
  const relationCounts: Record<string, number> = {};
  const ordinalSeen = new Set<string>();
  const columnSeen = new Set<string>();

  for (const row of rows) {
    if (row.schema_name !== 'public') {
      throw new Error(`P3 row schema must be public, got ${row.schema_name}`);
    }
    const relation = row.relation_name;
    if (!(REQUIRED_RELATIONS as readonly string[]).includes(relation)) {
      throw new Error(`P3 unexpected relation: ${relation}`);
    }
    relationCounts[relation] = (relationCounts[relation] ?? 0) + 1;

    const ordinal = Number(row.ordinal_position);
    if (!Number.isInteger(ordinal) || ordinal < 1) {
      throw new Error(`P3 invalid ordinal for ${relation}.${row.column_name}`);
    }
    const ordinalKey = `${relation}:${ordinal}`;
    if (ordinalSeen.has(ordinalKey)) {
      throw new Error(`P3 duplicate ordinal ${ordinalKey}`);
    }
    ordinalSeen.add(ordinalKey);

    const columnKey = `${relation}:${row.column_name}`;
    if (columnSeen.has(columnKey)) {
      throw new Error(`P3 duplicate column ${columnKey}`);
    }
    columnSeen.add(columnKey);

    if (!row.formatted_type || row.formatted_type === 'null') {
      throw new Error(`P3 missing formatted_type for ${columnKey}`);
    }
    if (row.column_contract_known !== 'true') {
      throw new Error(`P3 column_contract_known must be true for ${columnKey}`);
    }
    if (row.domain_state_known !== 'true') {
      throw new Error(`P3 domain_state_known must be true for ${columnKey}`);
    }
    if (row.compression_state_known !== 'true') {
      throw new Error(`P3 compression_state_known must be true for ${columnKey}`);
    }
    if (row.attisdropped !== 'false') {
      throw new Error(`P3 attisdropped must be false for ${columnKey}`);
    }
  }

  for (const relation of REQUIRED_RELATIONS) {
    const expected = P3_EXPECTED_RELATION_COUNTS[relation];
    const actual = relationCounts[relation] ?? 0;
    if (actual !== expected) {
      throw new Error(`P3 relation count mismatch for ${relation}: expected ${expected}, got ${actual}`);
    }
  }

  for (const relation of REQUIRED_RELATIONS) {
    const relationRows = rows
      .filter((row) => row.relation_name === relation)
      .sort((a, b) => Number(a.ordinal_position) - Number(b.ordinal_position));
    for (let i = 0; i < relationRows.length; i += 1) {
      if (Number(relationRows[i].ordinal_position) !== i + 1) {
        throw new Error(`P3 non-contiguous ordinals for relation ${relation}`);
      }
    }
  }
}

// ── Evidence bundle ─────────────────────────────────────────────────────────

export function computeEvidenceBundleSha256(
  gapSha256: string = EXPECTED_GAP_DIAGNOSTIC_SHA256,
  p3Sha256: string = EXPECTED_P3_COLUMNS_SHA256
): string {
  const payload =
    `GAP_DIAGNOSTIC_PATCH4_RESULT\n${gapSha256}\n` +
    `CONTRACT_FREEZE_P3_COLUMN_RESULT\n${p3Sha256}\n`;
  return sha256Hex(payload);
}

// ── Privacy scan ────────────────────────────────────────────────────────────

type PrivacyRule = {
  id: string;
  class: string;
  pattern: RegExp;
  blocking: boolean;
  context?: PrivacyScanContext;
};

type PrivacyScanContext =
  | 'artifact'
  | 'generated_sql'
  | 'generated_json'
  | 'tool_source'
  | 'any';

const CATALOG_ROLE_NAMES = new Set(['service_role', 'anon', 'authenticated', 'PUBLIC']);
const CATALOG_COLUMN_NAMES = new Set(['user_id', 'event_id', 'checkout_session_id', 'payment_intent_id']);

const PRIVACY_RULES: PrivacyRule[] = [
  {
    id: 'stripe_secret_key',
    class: 'stripe_secret',
    pattern: /\bsk_(live|test)_[A-Za-z0-9]+\b/g,
    blocking: true,
  },
  {
    id: 'stripe_webhook_secret',
    class: 'stripe_webhook_secret',
    pattern: /\bwhsec_[A-Za-z0-9]+\b/g,
    blocking: true,
  },
  {
    id: 'clerk_secret',
    class: 'clerk_secret',
    pattern: /\bsk_(live|test)_[A-Za-z0-9]{20,}\b/g,
    blocking: true,
  },
  {
    id: 'supabase_secret_value',
    class: 'supabase_secret',
    pattern: /\bsb_secret_[A-Za-z0-9._-]+\b/g,
    blocking: true,
  },
  {
    id: 'jwt_token',
    class: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
    blocking: true,
  },
  {
    id: 'credentialed_postgres_url',
    class: 'database_url',
    pattern: /postgres(ql)?:\/\/[^/\s:@]+:[^@\s/]+@/gi,
    blocking: true,
  },
  {
    id: 'supabase_project_host',
    class: 'supabase_host',
    pattern: /\b[a-z0-9-]+\.supabase\.co\b/gi,
    blocking: true,
    context: 'artifact',
  },
  {
    id: 'stripe_customer_id',
    class: 'stripe_identifier',
    pattern: /\bcus_[A-Za-z0-9]{8,}\b/g,
    blocking: true,
  },
  {
    id: 'stripe_checkout_session_id',
    class: 'stripe_identifier',
    pattern: /\bcs_(live|test)_[A-Za-z0-9]+\b/g,
    blocking: true,
  },
  {
    id: 'stripe_payment_intent_id',
    class: 'stripe_identifier',
    pattern: /\bpi_(live|test)_[A-Za-z0-9]+\b/g,
    blocking: true,
  },
  {
    id: 'stripe_event_value',
    class: 'stripe_identifier',
    pattern: /\bevt_[A-Za-z0-9]+\b/g,
    blocking: true,
  },
  {
    id: 'clerk_user_id',
    class: 'clerk_identifier',
    pattern: /\buser_[A-Za-z0-9]{20,}\b/g,
    blocking: true,
  },
];

function redactMatch(text: string): string {
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function classifyAllowedMetadata(
  rule: PrivacyRule,
  matchText: string,
  context: PrivacyScanContext,
  lineText: string
): string | null {
  if (CATALOG_ROLE_NAMES.has(matchText)) {
    return 'catalog_role_name';
  }
  if (rule.id === 'supabase_project_host' && context !== 'artifact') {
    return null;
  }
  if (rule.class === 'database_url' && !/:[^@\s/]+@/.test(matchText)) {
    return 'identifier_only';
  }
  if (rule.id === 'stripe_event_value' && /\bevent_id\b/.test(lineText) && !/\bevt_/.test(lineText)) {
    return 'column_name_context';
  }
  if (rule.id === 'clerk_user_id' && /\buser_id\b/.test(lineText) && !/\buser_[A-Za-z0-9]{20,}\b/.test(lineText)) {
    return 'column_name_context';
  }
  if (CATALOG_COLUMN_NAMES.has(matchText)) {
    return 'catalog_column_name';
  }
  if (
    rule.id === 'supabase_secret_value' &&
    /\bSUPABASE_SERVICE_ROLE_KEY\b/.test(lineText) &&
    !/\bsb_secret_/.test(lineText)
  ) {
    return 'env_variable_name_only';
  }
  if (context === 'generated_sql' && rule.class === 'stripe_identifier' && /column_name|CONSTRAINT|INDEX/i.test(lineText)) {
    return 'schema_metadata';
  }
  return null;
}

export function privacyScan(text: string, context: PrivacyScanContext = 'any'): PrivacyScanResult {
  const matches: PrivacyScanMatch[] = [];
  for (const rule of PRIVACY_RULES) {
    if (rule.context && rule.context !== 'any' && context !== 'any' && rule.context !== context) {
      continue;
    }
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const matchText = match[0];
      const offset = match.index;
      const line = lineNumberAtOffset(text, offset);
      const lineStart = text.lastIndexOf('\n', offset) + 1;
      const lineEnd = text.indexOf('\n', offset);
      const lineText = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const allowedReason = classifyAllowedMetadata(rule, matchText, context, lineText);
      matches.push({
        rule_id: rule.id,
        file: context,
        offset,
        line,
        match_class: rule.class,
        redacted_context: redactMatch(matchText),
        blocking: allowedReason ? false : rule.blocking,
        allowed_reason: allowedReason,
      });
    }
  }
  const blockingCount = matches.filter((item) => item.blocking).length;
  return {
    status: blockingCount > 0 ? 'fail' : 'pass',
    rules_revision: '1',
    matches,
  };
}

// ── pglast integration ──────────────────────────────────────────────────────

const PGLAST_HELPER = String.raw`
import json, re, sys, hashlib
from pglast import parse_sql

def split_sql_statements(sql):
    stmts = []
    buf = []
    in_dollar = None
    in_single = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        if in_dollar:
            if sql.startswith(in_dollar, i):
                buf.append(in_dollar)
                i += len(in_dollar)
                in_dollar = None
                continue
            buf.append(ch)
            i += 1
            continue
        if in_single:
            buf.append(ch)
            if ch == "'" and i + 1 < len(sql) and sql[i + 1] == "'":
                buf.append(sql[i + 1])
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue
        m = re.match(r'\$([A-Za-z_]*)\$', sql[i:])
        if m:
            tag = m.group(0)
            in_dollar = tag
            buf.append(tag)
            i += len(tag)
            continue
        if ch == "'":
            in_single = True
            buf.append(ch)
            i += 1
            continue
        if ch == ';':
            chunk = ''.join(buf).strip()
            if chunk:
                stmts.append(chunk)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    chunk = ''.join(buf).strip()
    if chunk:
        stmts.append(chunk)
    return stmts

def stmt_type(chunk):
    return type(parse_sql(chunk)[0].stmt).__name__

def function_name(stmt):
    if stmt_type(chunk := stmt) != 'CreateFunctionStmt':
        return None
    node = parse_sql(chunk)[0].stmt
    return node.funcname[-1].sval

def matches_target(chunk, target):
    t = stmt_type(chunk)
    upper = chunk.upper()
    if t == 'CreateFunctionStmt':
        return function_name(chunk) == target
    if t in ('GrantStmt', 'CommentStmt'):
        return target in chunk
    return False

def should_keep(chunk, target):
    t = stmt_type(chunk)
    if t == 'CreateFunctionStmt':
        return function_name(chunk) == target
    if t == 'CommentStmt':
        return target in chunk
    return False

mode = sys.argv[1]
if mode == 'parse_sql':
    sql = sys.stdin.read()
    chunks = split_sql_statements(sql)
    out = []
    for chunk in chunks:
        out.append({'type': stmt_type(chunk), 'sql': chunk[:120]})
    print(json.dumps({'statement_count': len(chunks), 'statements': out}))
elif mode == 'extract_function':
    migration_path, target = sys.argv[2], sys.argv[3]
    sql = open(migration_path, encoding='utf-8').read()
    kept = []
    for chunk in split_sql_statements(sql):
        t = stmt_type(chunk)
        if t in ('InsertStmt', 'SelectStmt', 'DoStmt', 'CreateStmt', 'AlterTableStmt', 'IndexStmt'):
            continue
        if should_keep(chunk, target):
            kept.append(chunk.strip() + ';')
    if not kept:
        raise SystemExit(f'no statements extracted for {target}')
    payload = '\n\n'.join(kept)
    print(json.dumps({
        'statements': kept,
        'extraction_hash': hashlib.sha256(payload.encode('utf-8')).hexdigest(),
        'statement_count': len(kept),
    }))
elif mode == 'version':
    import pglast
    print(json.dumps({'version': pglast.__version__}))
else:
    raise SystemExit('unknown mode')
`;

function runPglastHelper(
  args: string[],
  input?: string
): { ok: true; stdout: string } | { ok: false; error: string; code: number | null } {
  const result = spawnSync('python3', ['-c', PGLAST_HELPER, ...args], {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    return { ok: false, error: result.error.message, code: result.status };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || 'pglast helper failed').trim(),
      code: result.status,
    };
  }
  return { ok: true, stdout: result.stdout };
}

export function queryPglastRuntimeVersion(): string {
  const result = runPglastHelper(['version']);
  if (!result.ok) {
    throw new Error(`pglast version query failed: ${result.error}`);
  }
  const parsed = JSON.parse(result.stdout) as { version?: string };
  if (!parsed.version) {
    throw new Error('pglast version query returned no version');
  }
  return String(parsed.version);
}

function normalizePglastVersion(version: string): string {
  const trimmed = version.trim().replace(/^v/i, '');
  if (trimmed === PGLAST_EXPECTED_VERSION) return PGLAST_EXPECTED_VERSION;
  if (trimmed.startsWith(`${PGLAST_EXPECTED_VERSION}.`)) return PGLAST_EXPECTED_VERSION;
  return trimmed;
}

export function assertPglastRuntimeVersion(): {
  expected_version: string;
  actual_version: string;
  version_match: boolean;
} {
  const raw = queryPglastRuntimeVersion();
  const actual = normalizePglastVersion(raw);
  const version_match = actual === PGLAST_EXPECTED_VERSION;
  if (!version_match) {
    throw new Error(`pglast_version_mismatch:expected=${PGLAST_EXPECTED_VERSION}:actual=${raw}`);
  }
  return {
    expected_version: PGLAST_EXPECTED_VERSION,
    actual_version: actual,
    version_match,
  };
}

export function pglastParseSql(sql: string): { statement_count: number; statements: { type: string; sql: string }[] } {
  assertPglastRuntimeVersion();
  const result = runPglastHelper(['parse_sql'], sql);
  if (!result.ok) {
    throw new Error(`pglast parse_sql failed: ${result.error}`);
  }
  return JSON.parse(result.stdout) as {
    statement_count: number;
    statements: { type: string; sql: string }[];
  };
}

export function verifyFunctionSourceMigration(
  repoRoot: string,
  source: (typeof FUNCTION_SOURCE_MIGRATIONS)[number]
): { expectedSha256: string; actualSha256: string; sha256Match: boolean } {
  const absPath = resolveRepoPath(repoRoot, source.sourceMigrationPath);
  if (!existsSync(absPath)) {
    throw new Error(`function_source_missing:${source.sourceMigrationPath}`);
  }
  const stat = lstatSync(absPath);
  if (stat.isSymbolicLink()) {
    throw new Error(`function_source_symlink_forbidden:${source.sourceMigrationPath}`);
  }
  if (!stat.isFile()) {
    throw new Error(`function_source_not_regular_file:${source.sourceMigrationPath}`);
  }
  const actualSha256 = sha256File(absPath);
  const expectedSha256 = source.sourceMigrationSha256;
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `function_source_sha_mismatch:${source.targetName}:expected=${expectedSha256}:actual=${actualSha256}`
    );
  }
  return { expectedSha256, actualSha256, sha256Match: true };
}

export function extractFunctionStatements(
  repoRoot: string,
  migrationPath: string,
  targetName: string
): FunctionExtraction {
  const source = FUNCTION_SOURCE_MIGRATIONS.find((item) => item.targetName === targetName);
  if (!source) {
    throw new Error(`Unknown function target: ${targetName}`);
  }
  if (migrationPath !== resolveRepoPath(repoRoot, source.sourceMigrationPath)) {
    throw new Error(`function_source_path_mismatch:${targetName}`);
  }
  const sha = verifyFunctionSourceMigration(repoRoot, source);
  assertPglastRuntimeVersion();
  const result = runPglastHelper(['extract_function', migrationPath, targetName]);
  if (!result.ok) {
    throw new Error(`extractFunctionStatements failed for ${targetName}: ${result.error}`);
  }
  const parsed = JSON.parse(result.stdout) as {
    statements: string[];
    extraction_hash: string;
    statement_count: number;
  };
  const createCount = parsed.statements.filter((s) =>
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(s)
  ).length;
  if (createCount !== 1) {
    throw new Error(`function_source_duplicate_or_missing_create:${targetName}:${createCount}`);
  }
  if (!parsed.statements.some((s) => s.includes(`public.${targetName}`) || s.includes(`FUNCTION ${targetName}`))) {
    throw new Error(`function_source_wrong_target:${targetName}`);
  }
  return {
    functionIdentity: source.functionIdentity,
    targetName,
    identityArguments: source.identityArguments,
    sourceMigrationPath: source.sourceMigrationPath,
    sourceMigrationExpectedSha256: sha.expectedSha256,
    sourceMigrationActualSha256: sha.actualSha256,
    sourceMigrationSha256Match: sha.sha256Match,
    statements: parsed.statements,
    extractionHash: parsed.extraction_hash,
    extractionStatementCount: parsed.statement_count,
  };
}

export function extractAllFunctionStatements(repoRoot: string): FunctionExtraction[] {
  return FUNCTION_SOURCE_MIGRATIONS.map((source) =>
    extractFunctionStatements(
      repoRoot,
      resolveRepoPath(repoRoot, source.sourceMigrationPath),
      source.targetName
    )
  );
}

export type ProductionFunctionDefinitionRecord = {
  ordinal: number;
  schema_name: string;
  function_name: string;
  definition_md5: string;
  definition_character_length: number;
  exact_match_count: number;
  security_definer: boolean;
  volatility: string;
  parallel_safety: string;
  proconfig: string[];
  function_definition: string;
  actual_identity_arguments: string;
  expected_identity_arguments: string;
};

export type ProductionFunctionDefinitionExport = {
  diagnostic_revision: string;
  current_database: string;
  current_user: string;
  server_version_num: string | number;
  target_count: number;
  resolved_count: number;
  all_exactly_one: boolean;
  functions: ProductionFunctionDefinitionRecord[];
};

function md5Hex(text: string): string {
  return createHash('md5').update(text, 'utf8').digest('hex');
}

function countCrlfSequences(text: string): number {
  const matches = text.match(/\r\n/g);
  return matches ? matches.length : 0;
}

export function normalizeFunctionDefinitionEol(definition: string): string {
  return definition.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function extractFunctionDollarQuotedBody(definition: string): string {
  const match =
    definition.match(/\$function\$([\s\S]*?)\$function\$/) ??
    definition.match(/\$\$([\s\S]*?)\$\$/);
  if (!match) {
    throw new Error('function_dollar_body_missing');
  }
  return match[1];
}

export function stripLeadingSqlComments(sql: string): string {
  return sql.replace(/^(?:\s*--[^\n]*\n)+/, '').trim();
}

export function collapseReplyAllowedSpacingDelta(definition: string): string {
  return definition.replace(REPLY_ALLOWED_SPACING_PATTERN, REPLY_ALLOWED_SPACING_REPLACEMENT);
}

export function findMigrationFunctionCreateStatement(extraction: FunctionExtraction): string {
  const statement = extraction.statements.find((item) =>
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(item)
  );
  if (!statement) {
    throw new Error(`migration_create_missing:${extraction.targetName}`);
  }
  return stripLeadingSqlComments(statement);
}

export function formatProductionFunctionCreateForBaseline(definition: string): string {
  const trimmed = definition.trimEnd();
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}

export function loadProductionFunctionDefinitionExport(
  repoRoot: string
): ProductionFunctionDefinitionExport {
  const absPath = resolveRepoPath(repoRoot, PATHS.productionFunctionDefinitionExport);
  if (!existsSync(absPath)) {
    throw new Error(
      `missing_production_function_definition_export:${PATHS.productionFunctionDefinitionExport}`
    );
  }
  const bytes = readFileSync(absPath);
  const actualSha = sha256Hex(bytes);
  if (actualSha !== EXPECTED_PRODUCTION_FUNCTION_DEFINITION_EXPORT_SHA256) {
    throw new Error(`production_function_definition_export_sha_mismatch:${actualSha}`);
  }
  if (bytes.length !== PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_BYTES) {
    throw new Error('production_function_definition_export_byte_length_mismatch');
  }
  if (countNewlines(bytes.toString('utf8')) !== PRODUCTION_FUNCTION_DEFINITION_EXPORT_EXPECTED_NEWLINES) {
    throw new Error('production_function_definition_export_newline_mismatch');
  }
  return JSON.parse(bytes.toString('utf8')) as ProductionFunctionDefinitionExport;
}

export function verifyProductionFunctionDefinitionExport(
  exportDoc: ProductionFunctionDefinitionExport
): void {
  if (exportDoc.diagnostic_revision !== PRODUCTION_FUNCTION_DEFINITION_EXPORT_REVISION) {
    throw new Error(
      `production_function_definition_export_revision_mismatch:${exportDoc.diagnostic_revision}`
    );
  }
  if (exportDoc.current_database !== 'postgres') {
    throw new Error(`production_function_definition_export_database_mismatch:${exportDoc.current_database}`);
  }
  if (exportDoc.current_user !== 'postgres') {
    throw new Error(`production_function_definition_export_user_mismatch:${exportDoc.current_user}`);
  }
  if (String(exportDoc.server_version_num) !== '170006') {
    throw new Error(
      `production_function_definition_export_server_version_mismatch:${String(exportDoc.server_version_num)}`
    );
  }
  if (exportDoc.target_count !== 2 || exportDoc.resolved_count !== 2 || !exportDoc.all_exactly_one) {
    throw new Error('production_function_definition_export_target_resolution_invalid');
  }
  if (exportDoc.functions.length !== 2) {
    throw new Error(`production_function_definition_export_function_count:${exportDoc.functions.length}`);
  }

  const names = exportDoc.functions.map((item) => item.function_name).sort();
  const expectedNames = PRODUCTION_FUNCTION_PARITY_TARGETS.map((item) => item.functionName).sort();
  if (names.join('|') !== expectedNames.join('|')) {
    throw new Error(`production_function_definition_export_function_names:${names.join(',')}`);
  }

  for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
    const record = exportDoc.functions.find((item) => item.function_name === target.functionName);
    if (!record) {
      throw new Error(`production_function_definition_export_missing:${target.functionName}`);
    }
    if (record.schema_name !== 'public' || record.exact_match_count !== 1) {
      throw new Error(`production_function_definition_export_identity_invalid:${target.functionName}`);
    }
    if (record.definition_md5 !== target.expectedMd5) {
      throw new Error(`production_function_definition_export_md5_mismatch:${target.functionName}`);
    }
    if (record.definition_character_length !== target.expectedCharacterLength) {
      throw new Error(`production_function_definition_export_length_mismatch:${target.functionName}`);
    }
    if (record.security_definer !== true || record.volatility !== 'v' || record.parallel_safety !== 'u') {
      throw new Error(`production_function_definition_export_metadata_mismatch:${target.functionName}`);
    }
    if (
      !Array.isArray(record.proconfig) ||
      record.proconfig.length !== 1 ||
      record.proconfig[0] !== 'search_path=public'
    ) {
      throw new Error(`production_function_definition_export_proconfig_mismatch:${target.functionName}`);
    }
    if (record.actual_identity_arguments !== record.expected_identity_arguments) {
      throw new Error(`production_function_definition_export_identity_arguments_mismatch:${target.functionName}`);
    }
    const source = FUNCTION_SOURCE_MIGRATIONS.find((item) => item.targetName === target.functionName);
    if (!source || source.identityArguments !== record.expected_identity_arguments) {
      throw new Error(`production_function_definition_export_source_identity_mismatch:${target.functionName}`);
    }
    if (md5Hex(record.function_definition) !== target.expectedMd5) {
      throw new Error(`production_function_definition_export_definition_md5_mismatch:${target.functionName}`);
    }
    if (record.function_definition.length !== target.expectedCharacterLength) {
      throw new Error(`production_function_definition_export_definition_length_mismatch:${target.functionName}`);
    }
    if (countCrlfSequences(record.function_definition) !== target.expectedCrlfCount) {
      throw new Error(`production_function_definition_export_crlf_mismatch:${target.functionName}`);
    }
  }
}

function assertOnlyAllowedReplySpacingDelta(before: string, after: string): void {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  if (beforeLines.length !== afterLines.length) {
    throw new Error('reply_semantic_guard_line_count_mismatch');
  }
  let diffCount = 0;
  for (let index = 0; index < beforeLines.length; index++) {
    if (beforeLines[index] === afterLines[index]) {
      continue;
    }
    diffCount++;
    const collapsed = collapseReplyAllowedSpacingDelta(beforeLines[index]!);
    if (collapsed !== afterLines[index]) {
      throw new Error(`reply_semantic_guard_unapproved_delta_line_${index}`);
    }
  }
  if (diffCount !== 1) {
    throw new Error(`reply_semantic_guard_diff_count_${diffCount}`);
  }
}

export function assertProductionFunctionSemanticGuards(
  exportDoc: ProductionFunctionDefinitionExport,
  functionExtractions: FunctionExtraction[]
): void {
  verifyProductionFunctionDefinitionExport(exportDoc);

  for (const target of PRODUCTION_FUNCTION_PARITY_TARGETS) {
    const record = exportDoc.functions.find((item) => item.function_name === target.functionName);
    const extraction = functionExtractions.find((item) => item.targetName === target.functionName);
    if (!record || !extraction) {
      throw new Error(`production_function_semantic_guard_missing:${target.functionName}`);
    }

    const migrationCreate = findMigrationFunctionCreateStatement(extraction);
    const migrationBody = normalizeFunctionDefinitionEol(extractFunctionDollarQuotedBody(migrationCreate));
    const productionBody = normalizeFunctionDefinitionEol(
      extractFunctionDollarQuotedBody(record.function_definition)
    );

    if (target.functionName === 'm55_consult_reply_commit') {
      const productionNormalized = normalizeFunctionDefinitionEol(record.function_definition);
      if (sha256Hex(productionNormalized) !== target.expectedLocalCanonicalNormalizedSha256) {
        throw new Error('consult_semantic_guard_normalized_sha_mismatch');
      }
      if (migrationBody !== productionBody) {
        throw new Error('consult_semantic_guard_body_mismatch');
      }
      continue;
    }

    if (sha256Hex(record.function_definition) !== target.expectedProductionRawSha256) {
      throw new Error('reply_semantic_guard_raw_sha_mismatch');
    }
    if (collapseReplyAllowedSpacingDelta(migrationBody) !== productionBody) {
      throw new Error('reply_semantic_guard_body_mismatch');
    }
    assertOnlyAllowedReplySpacingDelta(migrationBody, productionBody);
  }
}

export function buildProductionFunctionDefinitionMap(
  exportDoc: ProductionFunctionDefinitionExport
): Map<string, ProductionFunctionDefinitionRecord> {
  verifyProductionFunctionDefinitionExport(exportDoc);
  return new Map(exportDoc.functions.map((item) => [item.function_name, item]));
}

// ── Inventory normalization helpers ─────────────────────────────────────────

export function inventoryByRelation<T>(
  cells: Patch4InventoryCell<{ [key: string]: unknown }>[],
  nestedKey: string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const cell of cells) {
    const nested = cell.actual_json[nestedKey];
    map.set(cell.object_name, Array.isArray(nested) ? (nested as T[]) : []);
  }
  return map;
}

function relationSecurityAspects(
  cells: Patch4InventoryCell<Record<string, unknown>>[]
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const cell of cells) {
    const aspect = String(cell.actual_json.aspect ?? '');
    const current = map.get(cell.object_name) ?? {};
    current[aspect] = cell.actual_json;
    map.set(cell.object_name, current);
  }
  return map;
}

function topoSortRelations(
  constraintsByRelation: Map<string, ConstraintRecord[]>
): RequiredRelation[] {
  const remaining = new Set<RequiredRelation>(REQUIRED_RELATIONS);
  const deps = new Map<RequiredRelation, Set<RequiredRelation>>();
  for (const relation of REQUIRED_RELATIONS) {
    deps.set(relation, new Set());
  }
  for (const relation of REQUIRED_RELATIONS) {
    for (const constraint of constraintsByRelation.get(relation) ?? []) {
      if (constraint.constraint_type !== 'f') continue;
      const target = constraint.target_relation;
      if (target && (REQUIRED_RELATIONS as readonly string[]).includes(target) && target !== relation) {
        deps.get(relation)?.add(target as RequiredRelation);
      }
    }
  }
  const order: RequiredRelation[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((relation) => {
        const needs = deps.get(relation) ?? new Set();
        for (const dep of needs) {
          if (remaining.has(dep)) return false;
        }
        return true;
      })
      .sort();
    if (ready.length === 0) {
      throw new Error('Failed to topo-sort relations due to cyclic foreign keys');
    }
    for (const relation of ready) {
      order.push(relation);
      remaining.delete(relation);
    }
  }
  return order;
}

function p3ColumnsByRelation(rows: P3ColumnRow[]): Map<string, P3ColumnRow[]> {
  const map = new Map<string, P3ColumnRow[]>();
  for (const row of rows) {
    const list = map.get(row.relation_name) ?? [];
    list.push(row);
    map.set(row.relation_name, list);
  }
  for (const [relation, list] of map) {
    list.sort((a, b) => Number(a.ordinal_position) - Number(b.ordinal_position));
    map.set(relation, list);
  }
  return map;
}

function renderColumnDefinition(row: P3ColumnRow): string {
  const parts = [`${quoteIdent(row.column_name)} ${row.formatted_type}`];
  if (row.is_nullable === 'false') {
    parts.push('NOT NULL');
  }
  if (row.default_present === 'true' && row.default_expression && row.default_expression !== 'null') {
    parts.push(`DEFAULT ${row.default_expression}`);
  }
  return parts.join(' ');
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

/** PostgreSQL pseudo-role PUBLIC is unquoted; all other roles use quoted identifiers. */
export function renderSqlRole(role: string): string {
  if (role === 'PUBLIC') return 'PUBLIC';
  return quoteIdent(role);
}

export function functionSignatureTypeList(identityArguments: string): string {
  return identityArguments
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const space = part.indexOf(' ');
      if (space < 0) throw new Error(`Invalid identity argument token: ${part}`);
      return part.slice(space + 1).trim();
    })
    .join(', ');
}

function requireOwnField(record: Record<string, unknown>, field: string, context: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
    throw new Error(`function_contract_field_missing:${context}:${field}`);
  }
  return record[field];
}

function requireFunctionString(record: Record<string, unknown>, field: string, context: string): string {
  const value = requireOwnField(record, field, context);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`function_contract_string_invalid:${context}:${field}`);
  }
  return value;
}

function requireFunctionBoolean(record: Record<string, unknown>, field: string, context: string): boolean {
  const value = requireOwnField(record, field, context);
  if (typeof value !== 'boolean') {
    throw new Error(`function_contract_boolean_invalid:${context}:${field}`);
  }
  return value;
}

function requireFunctionNumber(record: Record<string, unknown>, field: string, context: string): number {
  const value = requireOwnField(record, field, context);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`function_contract_number_invalid:${context}:${field}`);
  }
  return value;
}

function requireFunctionStringArray(record: Record<string, unknown>, field: string, context: string): string[] {
  const value = requireOwnField(record, field, context);
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`function_contract_string_array_invalid:${context}:${field}`);
  }
  return [...value];
}

export function normalizeFunctionContract(
  cell: Patch4InventoryCell<FunctionIdentityRecord>,
  extraction?: FunctionExtraction
): Record<string, unknown> {
  const aj = cell.actual_json as unknown as Record<string, unknown>;
  const context = `${String(aj.function_schema ?? cell.schema_name)}.${String(aj.function_name ?? cell.object_name)}`;
  const functionName = requireFunctionString(aj, 'function_name', context);
  const source = FUNCTION_SOURCE_MIGRATIONS.find((item) => item.targetName === functionName);
  const definitionHash = requireFunctionString(aj, 'definition_hash', context);
  const definitionHashAlgorithm = requireFunctionString(aj, 'definition_hash_algorithm', context);
  const definitionLength = requireFunctionNumber(aj, 'definition_length', context);
  return {
    schema_name: requireFunctionString(aj, 'function_schema', context),
    function_name: functionName,
    identity_arguments: requireFunctionString(aj, 'identity_arguments', context),
    resolved_identity_arguments: requireFunctionString(aj, 'resolved_identity_arguments', context),
    result_type: requireFunctionString(aj, 'result_type', context),
    owner_role: requireFunctionString(aj, 'owner_role', context),
    security_definer: requireFunctionBoolean(aj, 'security_definer', context),
    volatility: requireFunctionString(aj, 'volatility', context),
    parallel_safety: requireFunctionString(aj, 'parallel_safety', context),
    proconfig: requireFunctionStringArray(aj, 'proconfig', context),
    search_path: requireFunctionString(aj, 'search_path', context),
    definition_hash: definitionHash,
    definition_hash_algorithm: definitionHashAlgorithm,
    definition_length: definitionLength,
    overload_count: requireFunctionNumber(aj, 'overload_count', context),
    exact_signature_count: requireFunctionNumber(aj, 'exact_signature_count', context),
    public_execute: requireFunctionBoolean(aj, 'public_execute', context),
    anon_execute: requireFunctionBoolean(aj, 'anon_execute', context),
    authenticated_execute: requireFunctionBoolean(aj, 'authenticated_execute', context),
    service_role_execute: requireFunctionBoolean(aj, 'service_role_execute', context),
    source_migration_expected_sha256:
      extraction?.sourceMigrationExpectedSha256 ?? source?.sourceMigrationSha256 ?? null,
    source_migration_actual_sha256: extraction?.sourceMigrationActualSha256 ?? null,
    source_migration_sha256_match: extraction?.sourceMigrationSha256Match ?? null,
    source_extraction_hash: extraction?.extractionHash ?? null,
    source_extraction_statement_count: extraction?.extractionStatementCount ?? null,
    production_definition_hash: definitionHash,
    production_definition_hash_algorithm: definitionHashAlgorithm,
    production_definition_length: definitionLength,
    production_body_parity_status: PRODUCTION_BODY_PARITY_STATUS,
  };
}

const REQUIRED_FUNCTION_CONTRACT_FIELDS = [
  'schema_name',
  'function_name',
  'identity_arguments',
  'resolved_identity_arguments',
  'result_type',
  'owner_role',
  'security_definer',
  'volatility',
  'parallel_safety',
  'proconfig',
  'search_path',
  'definition_hash',
  'definition_hash_algorithm',
  'definition_length',
  'overload_count',
  'exact_signature_count',
  'public_execute',
  'anon_execute',
  'authenticated_execute',
  'service_role_execute',
] as const;

export function validateFunctionContracts(patch4: Patch4Row): void {
  if (patch4.function_inventory.length !== 2) {
    throw new Error(`Expected exactly 2 function contracts, found ${patch4.function_inventory.length}`);
  }
  const names = new Set<string>();
  for (const cell of patch4.function_inventory) {
    const contract = normalizeFunctionContract(cell);
    for (const field of REQUIRED_FUNCTION_CONTRACT_FIELDS) {
      if (contract[field] === null || contract[field] === undefined) {
        throw new Error(`Missing function contract field ${field} for ${cell.actual_json.function_name}`);
      }
    }
    const aj = cell.actual_json;
    if (aj.overload_count !== 1 || aj.exact_signature_count !== 1) {
      throw new Error(`Function overload contract invalid for ${aj.function_name}`);
    }
    if (aj.owner_role !== 'postgres' || aj.security_definer !== true || aj.result_type !== 'jsonb') {
      throw new Error(`Function identity contract mismatch for ${aj.function_name}`);
    }
    if (aj.public_execute !== false || aj.anon_execute !== true || aj.authenticated_execute !== true || aj.service_role_execute !== true) {
      throw new Error(`Function ACL contract mismatch for ${aj.function_name}`);
    }
    names.add(`${aj.function_schema}.${aj.function_name}`);
  }
  const expected = new Set(['public.m55_consult_reply_commit', 'public.m55_reply_generate_commit']);
  for (const name of names) {
    if (!expected.has(name)) {
      throw new Error(`Unexpected function in contract inventory: ${name}`);
    }
  }
}

export function synthesizeFunctionOwnershipAndAcl(fn: FunctionIdentityRecord): string[] {
  const schema = fn.function_schema;
  const name = fn.function_name;
  const sig = functionSignatureTypeList(fn.identity_arguments);
  const qualified = `${quoteIdent(schema)}.${quoteIdent(name)}(${sig})`;
  const lines: string[] = [];
  lines.push(`ALTER FUNCTION ${qualified} OWNER TO ${renderSqlRole(fn.owner_role)};`);
  lines.push(`REVOKE ALL ON FUNCTION ${qualified} FROM PUBLIC;`);
  if (fn.anon_execute) {
    lines.push(`GRANT EXECUTE ON FUNCTION ${qualified} TO ${renderSqlRole('anon')};`);
  }
  if (fn.authenticated_execute) {
    lines.push(`GRANT EXECUTE ON FUNCTION ${qualified} TO ${renderSqlRole('authenticated')};`);
  }
  if (fn.service_role_execute) {
    lines.push(`GRANT EXECUTE ON FUNCTION ${qualified} TO ${renderSqlRole('service_role')};`);
  }
  if (fn.public_execute) {
    throw new Error(`PUBLIC execute grant forbidden for ${name}`);
  }
  return lines;
}

function qualifyFunctionCreateStatement(sql: string, targetName: string): string {
  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\./i.test(sql)) {
    return sql;
  }
  return sql.replace(
    new RegExp(`(CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+)${targetName}(\\s*\\()`, 'i'),
    `$1public.${targetName}$2`
  );
}

function qualifyFkConstraintDefinition(definition: string): string {
  return definition.replace(
    /REFERENCES\s+(?!public\.)([a-zA-Z_][\w]*)/g,
    'REFERENCES public.$1'
  );
}

function isExecutableFunctionBodyStatement(sql: string, targetName: string): boolean {
  const upper = sql.toUpperCase();
  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(sql) && sql.includes(targetName)) {
    return true;
  }
  if (/COMMENT\s+ON\s+FUNCTION/i.test(sql) && sql.includes(targetName)) {
    return true;
  }
  return false;
}

function normalizeTypeToken(typeName: string): string {
  const normalized = typeName.trim().toLowerCase();
  const aliases: Record<string, string> = {
    timestamptz: 'timestamp with time zone',
    int4: 'integer',
    int8: 'bigint',
    bool: 'boolean',
    float8: 'double precision',
    float4: 'real',
  };
  return aliases[normalized] ?? normalized;
}

function detectSourceConflicts(patch4: Patch4Row, p3Rows: P3ColumnRow[]): string[] {
  const conflicts: string[] = [];
  const p3ByRelation = p3ColumnsByRelation(p3Rows);
  for (const cell of patch4.function_inventory) {
    const actual = cell.actual_json;
    const source = FUNCTION_SOURCE_MIGRATIONS.find((item) => item.targetName === actual.function_name);
    if (!source) {
      conflicts.push(`function_missing_source:${actual.function_name}`);
      continue;
    }
    if (source.identityArguments !== actual.identity_arguments) {
      conflicts.push(
        `function_signature_conflict:${actual.function_name}:${source.identityArguments}!=${actual.identity_arguments}`
      );
    }
  }
  for (const cell of patch4.column_inventory) {
    const relation = cell.object_name;
    const patchColumns = cell.actual_json.columns ?? [];
    const p3Columns = p3ByRelation.get(relation) ?? [];
    const p3Map = new Map(p3Columns.map((row) => [row.column_name, row]));
    for (const patchColumn of patchColumns) {
      const p3Column = p3Map.get(patchColumn.column_name);
      if (!p3Column) {
        conflicts.push(`patch4_column_missing_in_p3:${relation}.${patchColumn.column_name}`);
        continue;
      }
      const patchType = normalizeTypeToken(patchColumn.data_type ?? patchColumn.formatted_type ?? '');
      const p3Type = normalizeTypeToken(p3Column.data_type ?? p3Column.formatted_type);
      if (patchType && p3Type && patchType !== p3Type) {
        conflicts.push(
          `column_type_conflict:${relation}.${patchColumn.column_name}:${patchType}!=${p3Type}`
        );
      }
      const patchNullable = patchColumn.is_nullable ? 'true' : 'false';
      const p3Nullable = p3Column.is_nullable;
      if (patchNullable !== p3Nullable) {
        conflicts.push(`column_nullable_conflict:${relation}.${patchColumn.column_name}`);
      }
      const patchDefault = patchColumn.default_present ? 'true' : 'false';
      if (patchDefault !== p3Column.default_present) {
        conflicts.push(`column_default_presence_conflict:${relation}.${patchColumn.column_name}`);
      }
    }
  }
  return conflicts.sort();
}

// ── Coverage semantic validation ────────────────────────────────────────────

export type InternalFkTriggerContract = {
  contract_id: string;
  source_schema: string;
  source_relation: string;
  constraint_name: string;
  target_schema: string;
  target_relation: string;
  source_columns: string[];
  target_columns: string[];
  match_type: string;
  update_action: string;
  delete_action: string;
  deferrable: boolean;
  initially_deferred: boolean;
  validated: boolean;
};

const KNOWN_DELETE_ACTIONS = new Set(['SET NULL', 'CASCADE', 'RESTRICT', 'NO ACTION']);
const KNOWN_UPDATE_ACTIONS = new Set(['NO ACTION', 'RESTRICT']);
const KNOWN_MATCH_TYPES = new Set(['SIMPLE', 'FULL', 'PARTIAL']);

function requireFkString(
  value: string | null | undefined,
  field: string,
  constraintName: string
): string {
  if (!value || !String(value).trim()) {
    throw new Error(`fk_field_missing:${field}:${constraintName}`);
  }
  return String(value).trim();
}

function requireFkBoolean(
  value: boolean | null | undefined,
  field: string,
  constraintName: string
): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`fk_field_not_boolean:${field}:${constraintName}`);
  }
  return value;
}

function requireFkStringArray(
  value: string[] | null | undefined,
  field: string,
  constraintName: string
): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !String(item).trim())) {
    throw new Error(`fk_field_array_missing:${field}:${constraintName}`);
  }
  return value.map((item) => String(item).trim());
}

export function validateForeignKeyRecord(
  constraint: ConstraintRecord,
  sourceRelation: string
): ConstraintRecord {
  if (constraint.constraint_type !== 'f') {
    return constraint;
  }
  const name = constraint.constraint_name;
  requireFkString(constraint.definition, 'definition', name);
  const targetSchema = requireFkString(constraint.target_schema, 'target_schema', name);
  const targetRelation = requireFkString(constraint.target_relation, 'target_relation', name);
  const sourceColumns = requireFkStringArray(constraint.source_columns, 'source_columns', name);
  const targetColumns = requireFkStringArray(constraint.target_columns, 'target_columns', name);
  if (sourceColumns.length !== targetColumns.length) {
    throw new Error(`fk_column_count_mismatch:${name}`);
  }
  const matchType = requireFkString(constraint.match_type, 'match_type', name);
  if (!KNOWN_MATCH_TYPES.has(matchType)) {
    throw new Error(`fk_unknown_match_type:${name}:${matchType}`);
  }
  return {
    ...constraint,
    definition: constraint.definition.trim(),
    target_schema: targetSchema,
    target_relation: targetRelation,
    source_columns: sourceColumns,
    target_columns: targetColumns,
    match_type: matchType,
    delete_action: requireFkAction(constraint.delete_action, 'delete_action', name),
    update_action: requireFkAction(constraint.update_action, 'update_action', name),
    deferrable: requireFkBoolean(constraint.deferrable, 'deferrable', name),
    initially_deferred: requireFkBoolean(constraint.initially_deferred, 'initially_deferred', name),
    validated: requireFkBoolean(constraint.validated, 'validated', name),
  };
}

function requireFkAction(value: string | undefined, field: string, constraintName: string): string {
  if (!value || !value.trim()) {
    throw new Error(`fk_action_missing:${field}:${constraintName}`);
  }
  const normalized = value.trim().toUpperCase() === 'NO ACTION' ? 'NO ACTION' : value.trim().toUpperCase();
  const canonical =
    normalized === 'SET NULL'
      ? 'SET NULL'
      : normalized === 'CASCADE'
        ? 'CASCADE'
        : normalized === 'RESTRICT'
          ? 'RESTRICT'
          : normalized === 'NO ACTION'
            ? 'NO ACTION'
            : value.trim();
  if (field === 'delete_action' && !KNOWN_DELETE_ACTIONS.has(canonical)) {
    throw new Error(`fk_unknown_delete_action:${constraintName}:${canonical}`);
  }
  if (field === 'update_action' && !KNOWN_UPDATE_ACTIONS.has(canonical)) {
    throw new Error(`fk_unknown_update_action:${constraintName}:${canonical}`);
  }
  return canonical;
}

export function deriveInternalFkTriggerContracts(
  constraintsByRelation: Map<string, ConstraintRecord[]>
): InternalFkTriggerContract[] {
  const contracts: InternalFkTriggerContract[] = [];
  for (const relation of REQUIRED_RELATIONS) {
    for (const raw of constraintsByRelation.get(relation) ?? []) {
      if (raw.constraint_type !== 'f') continue;
      const constraint = validateForeignKeyRecord(raw, relation);
      contracts.push({
        contract_id: `internal_fk:public.${relation}:${constraint.constraint_name}`,
        source_schema: 'public',
        source_relation: relation,
        constraint_name: constraint.constraint_name,
        target_schema: constraint.target_schema!,
        target_relation: constraint.target_relation!,
        source_columns: constraint.source_columns!,
        target_columns: constraint.target_columns!,
        match_type: constraint.match_type!,
        update_action: constraint.update_action!,
        delete_action: constraint.delete_action!,
        deferrable: constraint.deferrable!,
        initially_deferred: constraint.initially_deferred!,
        validated: constraint.validated!,
      });
    }
  }
  if (contracts.length !== 10) {
    throw new Error(`fk_contract_count_mismatch:${contracts.length}`);
  }
  return contracts.sort((a, b) => a.contract_id.localeCompare(b.contract_id));
}

export type InternalTriggerBindingStatus = 'UNAMBIGUOUS' | 'AMBIGUOUS_EQUIVALENCE_CLASS';

export type InternalTriggerSemanticGroup = {
  semantic_group_id: string;
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'AFTER';
  enabled_state: string;
  trigger_classification: string;
  side: 'referencing' | 'referenced';
  expected_count: number;
  actual_count: number;
  binding_status: InternalTriggerBindingStatus;
  candidate_constraint_contract_ids: string[];
  exact_constraint_contract_id: string | null;
  portable_identity: true;
};

export type ValidatedInternalTrigger = {
  inventoryRelation: string;
  trigger: TriggerRecord;
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'AFTER';
  enabled_state: string;
  trigger_classification: string;
  side: 'referencing' | 'referenced';
};

function updateActionFunctionName(updateAction: string): string {
  if (updateAction === 'RESTRICT') return 'RI_FKey_restrict_upd';
  if (updateAction === 'NO ACTION') return 'RI_FKey_noaction_upd';
  throw new Error(`fk_unsupported_update_action:${updateAction}`);
}

function deleteActionFunctionName(deleteAction: string): string {
  if (deleteAction === 'CASCADE') return 'RI_FKey_cascade_del';
  if (deleteAction === 'SET NULL') return 'RI_FKey_setnull_del';
  if (deleteAction === 'RESTRICT') return 'RI_FKey_restrict_del';
  throw new Error(`fk_unsupported_delete_action:${deleteAction}`);
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

export function internalTriggerSemanticGroupFingerprint(
  group: Pick<
    InternalTriggerSemanticGroup,
    | 'relation_schema'
    | 'relation_name'
    | 'referenced_relation'
    | 'function_schema'
    | 'function_name'
    | 'event'
    | 'timing'
    | 'enabled_state'
    | 'trigger_classification'
    | 'side'
  >
): string {
  return portableInternalTriggerGroupKey(group);
}

function expandInternalTriggerGroupMultiset(
  groups: InternalTriggerSemanticGroup[],
  countField: 'expected_count' | 'actual_count'
): string[] {
  const result: string[] = [];
  for (const group of groups) {
    const fp = internalTriggerSemanticGroupFingerprint(group);
    const count = group[countField];
    for (let i = 0; i < count; i += 1) result.push(fp);
  }
  return result;
}

function portableSemanticsFromFkContract(contract: InternalFkTriggerContract): {
  relation_schema: string;
  relation_name: string;
  referenced_relation: string;
  function_schema: string;
  function_name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'AFTER';
  enabled_state: string;
  trigger_classification: string;
  side: 'referencing' | 'referenced';
  contract_id: string;
}[] {
  return [
    {
      relation_schema: contract.source_schema,
      relation_name: contract.source_relation,
      referenced_relation: contract.target_relation,
      function_schema: 'pg_catalog',
      function_name: 'RI_FKey_check_ins',
      event: 'INSERT',
      timing: 'AFTER',
      enabled_state: 'O',
      trigger_classification: 'SYSTEM_INTERNAL',
      side: 'referencing',
      contract_id: contract.contract_id,
    },
    {
      relation_schema: contract.source_schema,
      relation_name: contract.source_relation,
      referenced_relation: contract.target_relation,
      function_schema: 'pg_catalog',
      function_name: 'RI_FKey_check_upd',
      event: 'UPDATE',
      timing: 'AFTER',
      enabled_state: 'O',
      trigger_classification: 'SYSTEM_INTERNAL',
      side: 'referencing',
      contract_id: contract.contract_id,
    },
    {
      relation_schema: contract.source_schema,
      relation_name: contract.target_relation,
      referenced_relation: contract.source_relation,
      function_schema: 'pg_catalog',
      function_name: updateActionFunctionName(contract.update_action),
      event: 'UPDATE',
      timing: 'AFTER',
      enabled_state: 'O',
      trigger_classification: 'SYSTEM_INTERNAL',
      side: 'referenced',
      contract_id: contract.contract_id,
    },
    {
      relation_schema: contract.source_schema,
      relation_name: contract.target_relation,
      referenced_relation: contract.source_relation,
      function_schema: 'pg_catalog',
      function_name: deleteActionFunctionName(contract.delete_action),
      event: 'DELETE',
      timing: 'AFTER',
      enabled_state: 'O',
      trigger_classification: 'SYSTEM_INTERNAL',
      side: 'referenced',
      contract_id: contract.contract_id,
    },
  ];
}

export function deriveExpectedInternalTriggerSemanticGroups(
  contracts: InternalFkTriggerContract[]
): InternalTriggerSemanticGroup[] {
  const groupMap = new Map<
    string,
    {
      fields: Omit<
        InternalTriggerSemanticGroup,
        | 'semantic_group_id'
        | 'expected_count'
        | 'actual_count'
        | 'binding_status'
        | 'candidate_constraint_contract_ids'
        | 'exact_constraint_contract_id'
        | 'portable_identity'
      >;
      contractIds: Set<string>;
    }
  >();
  for (const contract of contracts) {
    for (const sem of portableSemanticsFromFkContract(contract)) {
      const { contract_id, ...fields } = sem;
      const key = portableInternalTriggerGroupKey(fields);
      const entry = groupMap.get(key) ?? { fields, contractIds: new Set<string>() };
      entry.contractIds.add(contract_id);
      groupMap.set(key, entry);
    }
  }
  return [...groupMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entry]) => {
      const candidateIds = [...entry.contractIds].sort();
      const bindingStatus: InternalTriggerBindingStatus =
        candidateIds.length > 1 ? 'AMBIGUOUS_EQUIVALENCE_CLASS' : 'UNAMBIGUOUS';
      return {
        semantic_group_id: `group:${key}`,
        ...entry.fields,
        expected_count: candidateIds.length,
        actual_count: 0,
        binding_status: bindingStatus,
        candidate_constraint_contract_ids: candidateIds,
        exact_constraint_contract_id: bindingStatus === 'UNAMBIGUOUS' ? candidateIds[0]! : null,
        portable_identity: true as const,
      };
    });
}

/** @deprecated Use deriveExpectedInternalTriggerSemanticGroups for portable equivalence classes. */
export function deriveExpectedInternalTriggerSemanticsFromFk(
  contract: InternalFkTriggerContract
): Omit<ValidatedInternalTrigger, 'inventoryRelation' | 'trigger'>[] {
  return portableSemanticsFromFkContract(contract).map(({ contract_id: _id, ...fields }) => fields);
}

export function internalTriggerSemanticFingerprint(record: {
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
  return internalTriggerSemanticGroupFingerprint(record as InternalTriggerSemanticGroup);
}

export function parseInternalTriggerStrict(
  inventoryRelation: string,
  trigger: TriggerRecord
): ValidatedInternalTrigger {
  if (!trigger.definition?.trim()) {
    throw new Error(`internal_trigger_definition_missing:${trigger.trigger_name}`);
  }
  if (!trigger.function_name?.trim()) {
    throw new Error(`internal_trigger_function_name_missing:${trigger.trigger_name}`);
  }
  if (!trigger.function_schema?.trim()) {
    throw new Error(`internal_trigger_function_schema_missing:${trigger.trigger_name}`);
  }
  if (!trigger.enabled_state?.trim()) {
    throw new Error(`internal_trigger_enabled_state_missing:${trigger.trigger_name}`);
  }
  if (trigger.enabled_state !== 'O') {
    throw new Error(`internal_trigger_enabled_state_unknown:${trigger.trigger_name}:${trigger.enabled_state}`);
  }
  if (!trigger.trigger_classification?.trim()) {
    throw new Error(`internal_trigger_classification_missing:${trigger.trigger_name}`);
  }
  if (trigger.trigger_classification !== 'SYSTEM_INTERNAL') {
    throw new Error(
      `internal_trigger_classification_unexpected:${trigger.trigger_name}:${trigger.trigger_classification}`
    );
  }
  const parsed = trigger.definition.match(/AFTER (INSERT|UPDATE|DELETE) ON (\w+) FROM (\w+)/i);
  if (!parsed) {
    throw new Error(`internal_trigger_parse_failed:${trigger.trigger_name}`);
  }
  const event = parsed[1].toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE';
  const onRelation = parsed[2];
  const fromRelation = parsed[3];
  if (inventoryRelation !== onRelation) {
    throw new Error(
      `internal_trigger_inventory_relation_mismatch:${trigger.trigger_name}:${inventoryRelation}:${onRelation}`
    );
  }
  const functionName = trigger.function_name;
  const side: 'referencing' | 'referenced' =
    functionName === 'RI_FKey_check_ins' || functionName === 'RI_FKey_check_upd'
      ? 'referencing'
      : 'referenced';
  return {
    inventoryRelation,
    trigger,
    relation_schema: 'public',
    relation_name: onRelation,
    referenced_relation: fromRelation,
    function_schema: trigger.function_schema,
    function_name: functionName,
    event,
    timing: 'AFTER',
    enabled_state: trigger.enabled_state,
    trigger_classification: trigger.trigger_classification,
    side,
  };
}

export function validateInternalTriggerInventory(
  triggersByRelation: Map<string, TriggerRecord[]>
): ValidatedInternalTrigger[] {
  const records: ValidatedInternalTrigger[] = [];
  const seenNames = new Set<string>();
  let internalCount = 0;
  for (const [inventoryRelation, items] of triggersByRelation) {
    for (const trigger of items) {
      if (!trigger.is_internal) continue;
      internalCount += 1;
      if (seenNames.has(trigger.trigger_name)) {
        throw new Error(`internal_trigger_duplicate_name:${trigger.trigger_name}`);
      }
      seenNames.add(trigger.trigger_name);
      records.push(parseInternalTriggerStrict(inventoryRelation, trigger));
    }
  }
  if (internalCount !== 40) {
    throw new Error(`internal_trigger_count_mismatch:${internalCount}`);
  }
  return records.sort((a, b) => a.trigger.trigger_name.localeCompare(b.trigger.trigger_name));
}

function deriveActualInternalTriggerCounts(
  validated: ValidatedInternalTrigger[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of validated) {
    const key = portableInternalTriggerGroupKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function buildInternalTriggerSemanticGroups(
  triggersByRelation: Map<string, TriggerRecord[]>,
  contracts: InternalFkTriggerContract[]
): {
  groups: InternalTriggerSemanticGroup[];
  inventory: {
    schema_name: string;
    relation_name: string;
    trigger_name: string;
    is_internal: true;
    evidence_only: true;
    portable_identity: false;
    semantic_group_id: string;
    function_schema: string;
    function_name: string;
    enabled_state: string;
    trigger_classification: string;
  }[];
  validated: ValidatedInternalTrigger[];
} {
  const validated = validateInternalTriggerInventory(triggersByRelation);
  const expectedGroups = deriveExpectedInternalTriggerSemanticGroups(contracts);
  const actualCounts = deriveActualInternalTriggerCounts(validated);
  const expectedKeys = new Set(
    expectedGroups.map((group) => group.semantic_group_id.replace(/^group:/, ''))
  );
  for (const [key, count] of actualCounts) {
    if (!expectedKeys.has(key)) {
      throw new Error(`internal_trigger_unexpected_semantic_group:${key}:${count}`);
    }
  }
  const groups = expectedGroups.map((group) => {
    const key = group.semantic_group_id.replace(/^group:/, '');
    return { ...group, actual_count: actualCounts.get(key) ?? 0 };
  });
  const totalActual = groups.reduce((sum, group) => sum + group.actual_count, 0);
  if (totalActual !== 40) {
    throw new Error(`internal_trigger_actual_count_mismatch:${totalActual}`);
  }
  const inventory = validated.map((item) => {
    const groupKey = portableInternalTriggerGroupKey(item);
    return {
      schema_name: 'public',
      relation_name: item.inventoryRelation,
      trigger_name: item.trigger.trigger_name,
      is_internal: true as const,
      evidence_only: true as const,
      portable_identity: false as const,
      semantic_group_id: `group:${groupKey}`,
      function_schema: item.function_schema,
      function_name: item.function_name,
      enabled_state: item.enabled_state,
      trigger_classification: item.trigger_classification,
    };
  });
  return { groups, inventory, validated };
}

export function assignInternalTriggerSemantics(
  triggersByRelation: Map<string, TriggerRecord[]>,
  contracts: InternalFkTriggerContract[]
): { inventoryRelation: string; trigger: TriggerRecord; semantic: ValidatedInternalTrigger }[] {
  const { validated } = buildInternalTriggerSemanticGroups(triggersByRelation, contracts);
  return validated.map((item) => ({
    inventoryRelation: item.inventoryRelation,
    trigger: item.trigger,
    semantic: item,
  }));
}

export function extractInternalTriggerSemanticFromRaw(
  inventoryRelation: string,
  trigger: TriggerRecord,
  contracts: InternalFkTriggerContract[]
): { semantic_group_id: string } {
  const parsed = parseInternalTriggerStrict(inventoryRelation, trigger);
  const key = portableInternalTriggerGroupKey(parsed);
  const expected = deriveExpectedInternalTriggerSemanticGroups(contracts);
  const match = expected.find((group) => group.semantic_group_id === `group:${key}`);
  if (!match) {
    throw new Error(`internal_trigger_unmatched_semantic:${trigger.trigger_name}`);
  }
  return { semantic_group_id: match.semantic_group_id };
}

export function extractInternalTriggerSemanticId(trigger: TriggerRecord): string {
  if (!trigger.function_name?.trim()) {
    throw new Error(`internal_trigger_function_name_missing:${trigger.trigger_name}`);
  }
  if (!trigger.function_schema?.trim()) {
    throw new Error(`internal_trigger_function_schema_missing:${trigger.trigger_name}`);
  }
  return `${trigger.function_schema}.${trigger.function_name}`;
}

function multisetFromItems(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

export function compareSemanticMultisets(
  expected: string[],
  actual: string[]
): {
  missingIds: string[];
  duplicateIds: string[];
  unexpectedIds: string[];
  semanticValidationPass: boolean;
} {
  const expectedCounts = multisetFromItems(expected);
  const actualCounts = multisetFromItems(actual);
  const missingIds: string[] = [];
  const duplicateIds: string[] = [];
  const unexpectedIds: string[] = [];
  for (const [key, count] of expectedCounts) {
    const actualCount = actualCounts.get(key) ?? 0;
    if (actualCount < count) {
      for (let i = 0; i < count - actualCount; i += 1) missingIds.push(key);
    }
    if (actualCount > count) {
      for (let i = 0; i < actualCount - count; i += 1) unexpectedIds.push(key);
    }
  }
  for (const [key, count] of actualCounts) {
    if (!expectedCounts.has(key)) {
      for (let i = 0; i < count; i += 1) unexpectedIds.push(key);
    }
  }
  return {
    missingIds: missingIds.sort(),
    duplicateIds: [...new Set(duplicateIds)].sort(),
    unexpectedIds: unexpectedIds.sort(),
    semanticValidationPass:
      missingIds.length === 0 && unexpectedIds.length === 0 && expected.length === actual.length,
  };
}

export function validateRelationSecurityEvidence(
  cells: Patch4InventoryCell<Record<string, unknown>>[]
): void {
  const expectedAspects = ['owner', 'rls', 'force_rls'] as const;
  const seen = new Set<string>();
  for (const relation of REQUIRED_RELATIONS) {
    for (const aspect of expectedAspects) {
      const cell = cells.find((c) => c.object_name === relation && c.actual_json.aspect === aspect);
      if (!cell) {
        throw new Error(`relation_security_missing:${aspect}.${relation}`);
      }
      if (cell.resolution_state !== 'RESOLVED') {
        throw new Error(`relation_security_unresolved:${cell.cell_id}`);
      }
      if (cell.actual_json.relation_exists !== true) {
        throw new Error(`relation_security_missing_relation:${cell.cell_id}`);
      }
      if (seen.has(cell.cell_id)) {
        throw new Error(`relation_security_duplicate:${cell.cell_id}`);
      }
      seen.add(cell.cell_id);
      if (aspect === 'owner') {
        const ownerRole = cell.actual_json.owner_role;
        if (typeof ownerRole !== 'string' || !ownerRole.trim()) {
          throw new Error(`relation_security_owner_missing:${cell.cell_id}`);
        }
      } else if (typeof cell.actual_json.aspect_value !== 'boolean') {
        throw new Error(`relation_security_aspect_not_boolean:${cell.cell_id}`);
      }
    }
  }
  if (seen.size !== 45) {
    throw new Error(`relation_security_count_mismatch:${seen.size}`);
  }
  const unexpected = cells.filter((c) => !seen.has(c.cell_id));
  if (unexpected.length > 0) {
    throw new Error(`relation_security_unexpected:${unexpected.map((c) => c.cell_id).join(',')}`);
  }
}

export function buildRelationsFromEvidence(
  cells: Patch4InventoryCell<Record<string, unknown>>[]
): {
  schema_name: string;
  relation_name: string;
  owner_role: string;
  rls_enabled: boolean;
  force_rls_enabled: boolean;
  source_cell_ids: string[];
}[] {
  validateRelationSecurityEvidence(cells);
  const aspects = relationSecurityAspects(cells);
  return REQUIRED_RELATIONS.map((relation) => {
    const security = aspects.get(relation);
    const ownerCell = security?.owner as Record<string, unknown>;
    const rlsCell = security?.rls as Record<string, unknown>;
    const forceCell = security?.force_rls as Record<string, unknown>;
    if (!ownerCell || !rlsCell || !forceCell) {
      throw new Error(`relation_security_incomplete:${relation}`);
    }
    return {
      schema_name: 'public',
      relation_name: relation,
      owner_role: String(ownerCell.owner_role),
      rls_enabled: rlsCell.aspect_value === true,
      force_rls_enabled: forceCell.aspect_value === true,
      source_cell_ids: [
        `owner.${relation}`,
        `rls.${relation}`,
        `force_rls.${relation}`,
      ],
    };
  });
}

type MatrixOutputForCoverage = {
  relations: ReturnType<typeof buildRelationsFromEvidence>;
  columns: {
    schema_name: string;
    relation_name: string;
    ordinal_position: number;
    column_name: string;
    formatted_type: string;
    is_nullable: boolean;
    default_expression: string | null;
    default_present: boolean;
  }[];
  constraints: {
    schema_name: string;
    relation_name: string;
    constraint_name: string;
    constraint_type: string;
    definition: string;
    validated: boolean;
    deferrable: boolean;
    initially_deferred: boolean;
    match_type: string | null;
    delete_action: string | null;
    update_action: string | null;
    target_schema: string | null;
    target_relation: string | null;
    source_columns: string[];
    target_columns: string[];
  }[];
  indexes: {
    schema_name: string;
    relation_name: string;
    index_name: string;
    definition: string;
    constraint_backed: boolean;
  }[];
  policies: {
    schema_name: string;
    relation_name: string;
    policy_name: string;
    command: string;
    roles: string[];
    permissive: string;
    using_expression: string | null;
    with_check_expression: string | null;
  }[];
  privileges: { cell_id: string; effective_privilege: boolean }[];
  user_defined_triggers: {
    schema_name: string;
    relation_name: string;
    trigger_name: string;
    definition: string;
  }[];
  internal_trigger_semantic_groups: InternalTriggerSemanticGroup[];
  internal_trigger_inventory: {
    schema_name: string;
    relation_name: string;
    trigger_name: string;
    is_internal: true;
    evidence_only: true;
    portable_identity: false;
    semantic_group_id: string;
    function_schema: string;
    function_name: string;
    enabled_state: string;
    trigger_classification: string;
  }[];
  functions: Record<string, unknown>[];
  function_sources: {
    function_identity: string;
    source_migration_path: string;
    source_migration_expected_sha256: string;
    source_migration_actual_sha256: string;
    source_migration_sha256_match: boolean;
    extraction_hash: string;
    statement_count: number;
  }[];
  wallet_scope: { cell_id: string; actual_json: unknown; fingerprint?: string }[];
  states: string[];
  state_specific_presence: { state: string; object: string }[];
  state_specific_absence: { state: string; object: string }[];
  state_transitions: {
    transition_id: string;
    state_from: string;
    state_to: string;
    migration_version: string;
    application_row_count: number;
    history_prefix: string[];
  }[];
  excluded_objects: { state: string; object: string }[];
};

function columnFingerprint(row: {
  schema_name: string;
  relation_name: string;
  ordinal_position: number;
  column_name: string;
  formatted_type: string;
  is_nullable: boolean;
  default_present: boolean;
  default_expression: string | null;
}): string {
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

function constraintFingerprint(row: MatrixOutputForCoverage['constraints'][number]): string {
  return [
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
    (row.target_columns ?? []).join(','),
  ].join('|');
}

function indexFingerprint(row: MatrixOutputForCoverage['indexes'][number]): string {
  return [row.schema_name, row.relation_name, row.index_name, row.definition, String(row.constraint_backed)].join(
    '|'
  );
}

function policyFingerprint(row: MatrixOutputForCoverage['policies'][number]): string {
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

function walletFingerprint(cell: Patch4InventoryCell<Record<string, unknown>>): string {
  return stableStringify(cell.actual_json);
}

export function relationSecurityFingerprintFromEvidence(
  cell: Patch4InventoryCell<Record<string, unknown>>
): string {
  const aspect = String(cell.actual_json.aspect ?? '');
  const value =
    aspect === 'owner'
      ? String(cell.actual_json.owner_role ?? '')
      : String(cell.actual_json.aspect_value === true);
  return `${cell.schema_name}|${cell.object_name}|${aspect}|${value}`;
}

export function relationSecurityFingerprintsFromMatrix(
  relation: {
    schema_name: string;
    relation_name: string;
    owner_role: string;
    rls_enabled: boolean;
    force_rls_enabled: boolean;
  }
): string[] {
  return [
    `${relation.schema_name}|${relation.relation_name}|owner|${relation.owner_role}`,
    `${relation.schema_name}|${relation.relation_name}|rls|${relation.rls_enabled}`,
    `${relation.schema_name}|${relation.relation_name}|force_rls|${relation.force_rls_enabled}`,
  ];
}

export function normalizedFunctionFingerprint(fn: Record<string, unknown>): string {
  return [
    String(fn.schema_name ?? ''),
    String(fn.function_name ?? ''),
    String(fn.identity_arguments ?? ''),
    String(fn.resolved_identity_arguments ?? ''),
    String(fn.result_type ?? ''),
    String(fn.owner_role ?? ''),
    String(fn.security_definer ?? ''),
    String(fn.volatility ?? ''),
    String(fn.parallel_safety ?? ''),
    stableStringify(fn.proconfig ?? []),
    String(fn.search_path ?? ''),
    String(fn.definition_hash ?? ''),
    String(fn.definition_length ?? ''),
    String(fn.overload_count ?? ''),
    String(fn.exact_signature_count ?? ''),
    String(fn.public_execute ?? ''),
    String(fn.anon_execute ?? ''),
    String(fn.authenticated_execute ?? ''),
    String(fn.service_role_execute ?? ''),
  ].join('|');
}

export function functionIdentityFingerprintV7(fn: Record<string, unknown>): string {
  return [
    normalizedFunctionFingerprint(fn),
    String(fn.definition_hash_algorithm ?? ''),
    String(fn.production_definition_hash_algorithm ?? ''),
    String(fn.production_definition_hash ?? ''),
    String(fn.production_definition_length ?? ''),
    String(fn.production_body_parity_status ?? ''),
  ].join('|');
}

/** Backward-compatible export; Revision-7 semantics include Production hash and length. */
export function functionIdentityFingerprintV6(fn: Record<string, unknown>): string {
  return functionIdentityFingerprintV7(fn);
}

export function functionParityPendingFingerprint(fn: Record<string, unknown>): string {
  return [
    String(fn.schema_name ?? ''),
    String(fn.function_name ?? ''),
    String(fn.production_body_parity_status ?? ''),
    String(fn.production_definition_hash_algorithm ?? ''),
    String(fn.production_definition_hash ?? ''),
    String(fn.production_definition_length ?? ''),
  ].join('|');
}


export const productionFunctionPendingFingerprint = functionParityPendingFingerprint;

export function internalTriggerGroupMetadataFingerprint(group: InternalTriggerSemanticGroup): string {
  return [
    group.semantic_group_id,
    internalTriggerSemanticGroupFingerprint(group),
    String(group.expected_count),
    String(group.actual_count),
    group.binding_status,
    [...group.candidate_constraint_contract_ids].sort().join(','),
    group.exact_constraint_contract_id ?? '',
    String(group.portable_identity),
  ].join('|');
}

export function internalTriggerInventoryFingerprint(item: {
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
}): string {
  return [
    item.schema_name,
    item.relation_name,
    item.trigger_name,
    String(item.is_internal),
    String(item.evidence_only),
    String(item.portable_identity),
    item.semantic_group_id,
    item.function_schema,
    item.function_name,
    item.enabled_state,
    item.trigger_classification,
  ].join('|');
}

export function stateRegistryFingerprint(state: string, index: number): string {
  return `${index}|${state}`;
}

export function stateSpecificPresenceFingerprint(item: { state: string; object: string }): string {
  return `${item.state}|${item.object}`;
}

function validateFunctionParityPendingState(functions: Record<string, unknown>[]): boolean {
  if (functions.length !== 2) return false;
  return functions.every((fn) => {
    const hash = fn.production_definition_hash;
    const length = Number(fn.production_definition_length);
    return (
      fn.production_body_parity_status === PRODUCTION_BODY_PARITY_STATUS &&
      fn.production_definition_hash_algorithm === 'md5' &&
      typeof hash === 'string' &&
      hash.length > 0 &&
      Number.isFinite(length) &&
      length > 0
    );
  });
}

export function stateTransitionFingerprint(transition: {
  transition_id: string;
  state_from: string;
  state_to: string;
  migration_version: string;
  application_row_count: number;
  history_prefix: string[];
}): string {
  return [
    transition.transition_id,
    transition.state_from,
    transition.state_to,
    transition.migration_version,
    String(transition.application_row_count),
    transition.history_prefix.join(','),
  ].join('|');
}

export function stateSpecificAbsenceFingerprint(item: { state: string; object: string }): string {
  return `${item.state}|${item.object}`;
}

export function walletFingerprintFromNormalizedOutput(cell: {
  cell_id: string;
  actual_json: unknown;
  fingerprint?: string;
}): string {
  return `${cell.cell_id}|${stableStringify(cell.actual_json)}`;
}

export function verifyWalletFingerprintIntegrity(cell: {
  cell_id: string;
  actual_json: unknown;
  fingerprint?: string;
}): boolean {
  if (cell.fingerprint === undefined) return true;
  return cell.fingerprint === stableStringify(cell.actual_json);
}

export function functionSourceFingerprint(source: {
  function_identity: string;
  source_migration_path: string;
  source_migration_expected_sha256: string;
  source_migration_actual_sha256: string;
  source_migration_sha256_match: boolean;
  extraction_hash: string;
  statement_count: number;
}): string {
  return [
    source.function_identity,
    source.source_migration_path,
    source.source_migration_expected_sha256,
    source.source_migration_actual_sha256,
    source.source_migration_sha256_match ? '1' : '0',
    source.extraction_hash,
    String(source.statement_count),
  ].join('|');
}

export function matrixOutputFromSerialized(
  serializedMatrix: Record<string, unknown>
): MatrixOutputForCoverage {
  const stateAbsence = serializedMatrix.state_specific_absence as { state: string; object: string }[];
  return {
    relations: serializedMatrix.relations as MatrixOutputForCoverage['relations'],
    columns: serializedMatrix.columns as MatrixOutputForCoverage['columns'],
    constraints: serializedMatrix.constraints as MatrixOutputForCoverage['constraints'],
    indexes: serializedMatrix.indexes as MatrixOutputForCoverage['indexes'],
    policies: serializedMatrix.policies as MatrixOutputForCoverage['policies'],
    privileges: (serializedMatrix.privileges as { cell_id: string; effective_privilege: boolean }[]).map(
      (item) => ({ cell_id: item.cell_id, effective_privilege: item.effective_privilege })
    ),
    user_defined_triggers: (
      serializedMatrix.user_defined_triggers as MatrixOutputForCoverage['user_defined_triggers']
    ).map((item) => ({
      schema_name: item.schema_name,
      relation_name: item.relation_name,
      trigger_name: item.trigger_name,
      definition: item.definition,
    })),
    internal_trigger_semantic_groups:
      serializedMatrix.internal_trigger_semantic_groups as InternalTriggerSemanticGroup[],
    internal_trigger_inventory:
      serializedMatrix.internal_trigger_inventory as MatrixOutputForCoverage['internal_trigger_inventory'],
    functions: serializedMatrix.functions as Record<string, unknown>[],
    function_sources: serializedMatrix.function_sources as MatrixOutputForCoverage['function_sources'],
    wallet_scope: (serializedMatrix.wallet_scope as {
      cell_id: string;
      actual_json: unknown;
      fingerprint?: string;
    }[]).map((item) => ({
      cell_id: item.cell_id,
      actual_json: item.actual_json,
      fingerprint: item.fingerprint,
    })),
    states: serializedMatrix.states as string[],
    state_specific_presence:
      serializedMatrix.state_specific_presence as MatrixOutputForCoverage['state_specific_presence'],
    state_specific_absence: stateAbsence,
    state_transitions: serializedMatrix.state_transitions as MatrixOutputForCoverage['state_transitions'],
    excluded_objects: stateAbsence.map((item) => ({ state: item.state, object: item.object })),
  };
}

export function evaluateSerializedMatrixCoverage(
  patch4: Patch4Row,
  p3Rows: P3ColumnRow[],
  functionExtractions: FunctionExtraction[],
  serializedMatrix: Record<string, unknown>,
  sourceConflicts: string[] = []
): CoverageMatrixEntry[] {
  return evaluateMatrixCoverage(
    patch4,
    p3Rows,
    functionExtractions,
    matrixOutputFromSerialized(serializedMatrix),
    sourceConflicts
  );
}

export function evaluateMatrixCoverage(
  patch4: Patch4Row,
  p3Rows: P3ColumnRow[],
  functionExtractions: FunctionExtraction[],
  output: MatrixOutputForCoverage,
  sourceConflicts: string[] = []
): CoverageMatrixEntry[] {
  const constraintsByRelation = inventoryByRelation<ConstraintRecord>(
    patch4.constraint_inventory,
    'constraints'
  );
  const internalFkContracts = deriveInternalFkTriggerContracts(constraintsByRelation);
  return buildCoverageMatrixEntries(
    patch4,
    p3Rows,
    functionExtractions,
    constraintsByRelation,
    internalFkContracts,
    output,
    sourceConflicts
  );
}

function buildCoverageMatrixEntries(
  patch4: Patch4Row,
  p3Rows: P3ColumnRow[],
  functionExtractions: FunctionExtraction[],
  constraintsByRelation: Map<string, ConstraintRecord[]>,
  internalFkContracts: InternalFkTriggerContract[],
  output: MatrixOutputForCoverage,
  sourceConflicts: string[]
): CoverageMatrixEntry[] {
  const relationExpected = patch4.relation_security
    .map((c) => relationSecurityFingerprintFromEvidence(c))
    .sort();
  const relationActual = output.relations
    .flatMap((r) => relationSecurityFingerprintsFromMatrix(r))
    .sort();
  const relationVal = validateIdSet(relationExpected, relationActual);

  const columnExpected = p3Rows.map((r) => columnFingerprint({
    schema_name: r.schema_name,
    relation_name: r.relation_name,
    ordinal_position: Number(r.ordinal_position),
    column_name: r.column_name,
    formatted_type: r.formatted_type,
    is_nullable: r.is_nullable === 'true',
    default_present: r.default_present === 'true',
    default_expression: r.default_present === 'true' ? r.default_expression : null,
  }));
  const columnActual = output.columns.map((r) => columnFingerprint(r));
  const columnVal = validateIdSet(columnExpected, columnActual);

  const constraintExpected = [...constraintsByRelation.entries()]
    .flatMap(([relation, items]) =>
      items.map((raw) => {
        const c = raw.constraint_type === 'f' ? validateForeignKeyRecord(raw, relation) : raw;
        return constraintFingerprint({
          schema_name: 'public',
          relation_name: relation,
          constraint_name: c.constraint_name,
          constraint_type: c.constraint_type,
          definition: c.definition,
          validated: c.validated ?? false,
          deferrable: c.deferrable ?? false,
          initially_deferred: c.initially_deferred ?? false,
          match_type: c.match_type ?? null,
          delete_action: c.delete_action ?? null,
          update_action: c.update_action ?? null,
          target_schema: c.target_schema ?? null,
          target_relation: c.target_relation ?? null,
          source_columns: c.source_columns ?? [],
          target_columns: c.target_columns ?? [],
        });
      })
    )
    .sort();
  const constraintActual = output.constraints.map((c) => constraintFingerprint(c)).sort();
  const constraintVal = validateIdSet(constraintExpected, constraintActual);

  const indexExpected = [...indexesByRelationFromPatch4(patch4)]
    .map((i) => indexFingerprint(i))
    .sort();
  const indexActual = output.indexes.map((i) => indexFingerprint(i)).sort();
  const indexVal = validateIdSet(indexExpected, indexActual);

  const policyExpected = [...policiesByRelationFromPatch4(patch4)]
    .map((p) => policyFingerprint(p))
    .sort();
  const policyActual = output.policies.map((p) => policyFingerprint(p)).sort();
  const policyVal = validateIdSet(policyExpected, policyActual);

  const privilegeExpected = patch4.privilege_contract.map(
    (c) => `${c.cell_id}|${c.actual_json.effective_privilege === true ? '1' : '0'}`
  );
  const privilegeActual = output.privileges.map(
    (c) => `${c.cell_id}|${c.effective_privilege ? '1' : '0'}`
  );
  const privilegeVal = validateIdSet(privilegeExpected, privilegeActual);

  const userDefinedExpected = [...triggersByRelationFromPatch4(patch4)]
    .filter((t) => !t.is_internal)
    .map((t) => `public.${t.relation_name}.${t.trigger_name}|${t.definition}`)
    .sort();
  const userDefinedActual = output.user_defined_triggers
    .map((t) => `public.${t.relation_name}.${t.trigger_name}|${t.definition}`)
    .sort();

  const authoritativeTriggerData = buildInternalTriggerSemanticGroups(
    inventoryByRelation<TriggerRecord>(patch4.trigger_inventory, 'triggers'),
    internalFkContracts
  );
  const expectedGroupMetadata = authoritativeTriggerData.groups
    .map((group) => internalTriggerGroupMetadataFingerprint(group))
    .sort();
  const actualGroupMetadata = output.internal_trigger_semantic_groups
    .map((group) => internalTriggerGroupMetadataFingerprint(group))
    .sort();
  const expectedInventory = authoritativeTriggerData.inventory
    .map((item) => internalTriggerInventoryFingerprint(item))
    .sort();
  const actualInventory = output.internal_trigger_inventory
    .map((item) => internalTriggerInventoryFingerprint(item))
    .sort();

  const triggerExpectedIds = [...userDefinedExpected, ...expectedGroupMetadata, ...expectedInventory];
  const triggerActualIds = [...userDefinedActual, ...actualGroupMetadata, ...actualInventory];
  const triggerVal = validateIdSet(triggerExpectedIds, triggerActualIds);
  const triggerExpectedCount = triggerExpectedIds.length;
  const triggerActualCount = triggerActualIds.length;

  const functionIdentityExpected = patch4.function_inventory
    .map((c) => functionIdentityFingerprintV7(normalizeFunctionContract(c)))
    .sort();
  const functionIdentityActual = output.functions.map((f) => functionIdentityFingerprintV7(f)).sort();
  const functionIdentityVal = validateIdSet(functionIdentityExpected, functionIdentityActual);

  const bodyProvExpected = functionExtractions
    .map((item) =>
      functionSourceFingerprint({
        function_identity: item.functionIdentity,
        source_migration_path: item.sourceMigrationPath,
        source_migration_expected_sha256: item.sourceMigrationExpectedSha256,
        source_migration_actual_sha256: item.sourceMigrationActualSha256,
        source_migration_sha256_match: item.sourceMigrationSha256Match,
        extraction_hash: item.extractionHash,
        statement_count: item.extractionStatementCount,
      })
    )
    .sort();
  const bodyProvActual = output.function_sources
    .map((item) => functionSourceFingerprint(item))
    .sort();
  const bodyProvVal = validateIdSet(bodyProvExpected, bodyProvActual);
  const bodyProvSemantic = bodyProvVal.semanticValidationPass;

  const bodyParityExpected = patch4.function_inventory
    .map((cell) => functionParityPendingFingerprint(normalizeFunctionContract(cell)))
    .sort();
  const bodyParityActual = output.functions
    .map((fn) => functionParityPendingFingerprint(fn))
    .sort();
  const bodyParityVal = validateIdSet(bodyParityExpected, bodyParityActual);
  const bodyParitySemantic =
    bodyParityVal.semanticValidationPass && validateFunctionParityPendingState(output.functions);

  const walletExpected = patch4.wallet_scope
    .map((c) => walletFingerprintFromNormalizedOutput({ cell_id: c.cell_id, actual_json: c.actual_json }))
    .sort();
  const walletFingerprintIntegrity = output.wallet_scope.every((cell) =>
    verifyWalletFingerprintIntegrity(cell)
  );
  const walletActual = output.wallet_scope
    .map((c) => walletFingerprintFromNormalizedOutput(c))
    .sort();
  const walletVal = validateIdSet(walletExpected, walletActual);
  const walletSemantic = walletVal.semanticValidationPass && walletFingerprintIntegrity;

  const stateRegistryExpected = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
    .map((state, index) => stateRegistryFingerprint(state, index));
  const stateRegistryActual = output.states
    .map((state, index) => stateRegistryFingerprint(state, index));
  const stateRegistryVal = validateIdSet(stateRegistryExpected, stateRegistryActual);

  const statePresenceExpected = stateSpecificPresence()
    .map((item) => stateSpecificPresenceFingerprint(item))
    .sort();
  const statePresenceActual = output.state_specific_presence
    .map((item) => stateSpecificPresenceFingerprint(item))
    .sort();
  const statePresenceVal = validateIdSet(statePresenceExpected, statePresenceActual);

  const stateExpected = buildStateTransitions().map((t) => stateTransitionFingerprint(t)).sort();
  const stateActual = output.state_transitions.map((t) => stateTransitionFingerprint(t)).sort();
  const stateVal = validateIdSet(stateExpected, stateActual);

  const excludedExpected = stateSpecificAbsence().map((item) => stateSpecificAbsenceFingerprint(item)).sort();
  const excludedActual = output.state_specific_absence
    .map((item) => stateSpecificAbsenceFingerprint(item))
    .sort();
  const excludedVal = validateIdSet(excludedExpected, excludedActual);

  const mk = (
    category: (typeof COVERAGE_CATEGORIES)[number],
    required: number,
    artifactIds: string[],
    sections: string[],
    val: IdSetValidation & { semanticValidationPass?: boolean },
    authority: string,
    options?: {
      extraSemantic?: boolean;
      pendingExecution?: boolean;
      pendingReason?: string;
    }
  ): CoverageMatrixEntry => {
    const extraSemantic = options?.extraSemantic ?? true;
    const semantic =
      (val.semanticValidationPass ?? true) &&
      extraSemantic &&
      sourceConflicts.length === 0;
    return coverageEntry(
      category,
      required,
      artifactIds,
      sections,
      val.actualIds.length,
      val.missingIds,
      val.duplicateIds,
      val.unexpectedIds,
      val.expectedIds.length,
      val.actualIds.length,
      semantic,
      sourceConflicts,
      authority,
      options?.pendingExecution
        ? {
            pendingExecution: true,
            pendingReason: options.pendingReason ?? PENDING_FUNCTION_PARITY_REASON,
          }
        : undefined
    );
  };

  return [
    mk('relation', 45, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['relation_security_json'], relationVal, 'PATCH-4'),
    mk('columns', P3_DATA_ROW_COUNT, ['CONTRACT_FREEZE_P3_COLUMN_RESULT'], ['column_rows'], columnVal, 'P3'),
    mk('constraints', constraintExpected.length, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['constraint_inventory_json'], constraintVal, 'PATCH-4'),
    mk('indexes', indexExpected.length, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['index_inventory_json'], indexVal, 'PATCH-4'),
    mk('policies', policyExpected.length, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['policy_inventory_json'], policyVal, 'PATCH-4'),
    mk('privileges', 420, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['privilege_contract_json'], privilegeVal, 'PATCH-4'),
    coverageEntry(
      'triggers',
      triggerExpectedCount,
      ['GAP_DIAGNOSTIC_PATCH4_RESULT'],
      ['trigger_inventory_json'],
      triggerActualCount,
      triggerVal.missingIds,
      triggerVal.duplicateIds,
      triggerVal.unexpectedIds,
      triggerExpectedCount,
      triggerActualCount,
      triggerVal.semanticValidationPass,
      sourceConflicts,
      'PATCH-4'
    ),
    mk('functions_identity', 2, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['function_inventory_json'], functionIdentityVal, 'PATCH-4'),
    mk('functions_body_source_provenance', 2, ['CANONICAL_FUNCTION_DDL_SOURCES'], ['extracted_statements'], bodyProvVal, 'canonical_migration_extraction', { extraSemantic: bodyProvSemantic }),
    mk('functions_body_production_parity', 2, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['function_inventory_json'], bodyParityVal, 'PATCH-4', {
      extraSemantic: bodyParitySemantic,
      pendingExecution: true,
      pendingReason: PENDING_FUNCTION_PARITY_REASON,
    }),
    mk('wallet', 5, ['GAP_DIAGNOSTIC_PATCH4_RESULT'], ['wallet_scope_json'], walletVal, 'PATCH-4', {
      extraSemantic: walletSemantic,
    }),
    mk('state_registry', 8, ['STATE_MODEL'], ['states'], stateRegistryVal, 'state_model'),
    mk('state_presence', 3, ['STATE_MODEL'], ['state_specific_presence'], statePresenceVal, 'state_model'),
    mk('state_transitions', 7, ['CANONICAL_MIGRATIONS'], ['P0-P7'], stateVal, 'canonical_migrations'),
    mk('excluded_objects', P1_ABSENT_OBJECTS.length, ['STATE_MODEL'], ['P1_absent'], excludedVal, 'state_model'),
  ];
}

function indexesByRelationFromPatch4(patch4: Patch4Row): MatrixOutputForCoverage['indexes'] {
  const map = inventoryByRelation<IndexRecord>(patch4.index_inventory, 'indexes');
  return [...map.entries()].flatMap(([relation, items]) =>
    items.map((item) => ({
      schema_name: 'public',
      relation_name: relation,
      index_name: item.index_name,
      definition: item.definition,
      constraint_backed: item.constraint_backed,
    }))
  );
}

function policiesByRelationFromPatch4(patch4: Patch4Row): MatrixOutputForCoverage['policies'] {
  const map = inventoryByRelation<PolicyRecord>(patch4.policy_inventory, 'policies');
  return [...map.entries()].flatMap(([relation, items]) =>
    items.map((item) => ({
      schema_name: 'public',
      relation_name: relation,
      policy_name: item.policy_name,
      command: item.command,
      roles: item.roles,
      permissive: item.permissive_restrictive,
      using_expression: item.using_expression,
      with_check_expression: item.with_check_expression,
    }))
  );
}

function triggersByRelationFromPatch4(
  patch4: Patch4Row
): (TriggerRecord & { relation_name: string })[] {
  const map = inventoryByRelation<TriggerRecord>(patch4.trigger_inventory, 'triggers');
  return [...map.entries()].flatMap(([relation, items]) =>
    items.map((item) => ({ ...item, relation_name: relation }))
  );
}

export function validateCoverageForDerivation(coverage: CoverageMatrixEntry[]): void {
  const failed = coverage.filter((entry) => entry.coverage_status === 'FAILED');
  if (failed.length > 0) {
    throw new Error(`Coverage failed for categories: ${failed.map((e) => e.category).join(', ')}`);
  }
  const pending = coverage.filter((entry) => entry.coverage_status === 'PENDING_EXECUTION');
  const approved = new Set<string>(APPROVED_PENDING_COVERAGE_CATEGORIES);
  const unapprovedPending = pending.filter((entry) => !approved.has(entry.category));
  if (unapprovedPending.length > 0) {
    throw new Error(
      `Unapproved pending coverage categories: ${unapprovedPending.map((e) => e.category).join(', ')}`
    );
  }
  if (pending.length !== 1 || pending[0].category !== 'functions_body_production_parity') {
    throw new Error('Coverage pending list must contain exactly functions_body_production_parity');
  }
  const parity = pending[0];
  if (parity.coverage_complete || parity.semantic_validation_pass) {
    throw new Error('functions_body_production_parity must remain pending and incomplete');
  }
  if (!parity.static_prerequisites_pass) {
    throw new Error('functions_body_production_parity static prerequisites must pass');
  }
  if (parity.runtime_validation_status !== 'NOT_RUN') {
    throw new Error('functions_body_production_parity runtime validation must be NOT_RUN');
  }
  if (
    parity.missing_ids.length !== 0 ||
    parity.duplicate_ids.length !== 0 ||
    parity.unexpected_ids.length !== 0 ||
    parity.expected_id_count !== parity.actual_id_count ||
    parity.actual_coverage_count < parity.required_object_count
  ) {
    throw new Error('functions_body_production_parity static identity contract is incomplete');
  }
  if (!parity.pending_validation_reason) {
    throw new Error('functions_body_production_parity pending reason is required');
  }
  const complete = coverage.filter((entry) => entry.coverage_status === 'COMPLETE');
  if (
    complete.some(
      (entry) =>
        !entry.coverage_complete ||
        !entry.semantic_validation_pass ||
        !entry.static_prerequisites_pass ||
        entry.runtime_validation_status !== 'NOT_REQUIRED'
    )
  ) {
    throw new Error('COMPLETE coverage entries must be fully complete');
  }
  if (complete.length !== coverage.length - 1) {
    throw new Error('Exactly one coverage category may remain pending');
  }
}

export function buildContractMatrix(
  patch4: Patch4Row,
  p3Rows: P3ColumnRow[],
  functionExtractions: FunctionExtraction[],
  options?: {
    gapSha256?: string;
    p3Sha256?: string;
    evidenceBundleSha256?: string;
    privacyScanResult?: PrivacyScanResult;
  }
): Record<string, unknown> {
  const gapSha256 = options?.gapSha256 ?? EXPECTED_GAP_DIAGNOSTIC_SHA256;
  const p3Sha256 = options?.p3Sha256 ?? EXPECTED_P3_COLUMNS_SHA256;
  const evidenceBundleSha256 =
    options?.evidenceBundleSha256 ?? computeEvidenceBundleSha256(gapSha256, p3Sha256);
  const privacy = options?.privacyScanResult ?? { status: 'pass', rules_revision: '1', matches: [] };
  const sourceConflicts = detectSourceConflicts(patch4, p3Rows);

  const constraintsByRelation = inventoryByRelation<ConstraintRecord>(
    patch4.constraint_inventory,
    'constraints'
  );
  const triggersByRelation = inventoryByRelation<TriggerRecord>(patch4.trigger_inventory, 'triggers');
  const relations = buildRelationsFromEvidence(patch4.relation_security);

  const columns = p3Rows.map((row) => ({
    schema_name: row.schema_name,
    relation_name: row.relation_name,
    ordinal_position: Number(row.ordinal_position),
    column_name: row.column_name,
    formatted_type: row.formatted_type,
    is_nullable: row.is_nullable === 'true',
    default_expression: row.default_present === 'true' ? row.default_expression : null,
    default_present: row.default_present === 'true',
  }));

  const constraints = [...constraintsByRelation.entries()].flatMap(([relation, items]) =>
    items.map((raw) => {
      const item = raw.constraint_type === 'f' ? validateForeignKeyRecord(raw, relation) : raw;
      return {
        schema_name: 'public',
        relation_name: relation,
        constraint_name: item.constraint_name,
        constraint_type: item.constraint_type,
        definition: item.definition,
        validated: item.validated ?? false,
        deferrable: item.deferrable ?? false,
        initially_deferred: item.initially_deferred ?? false,
        match_type: item.match_type ?? null,
        delete_action: item.delete_action ?? null,
        update_action: item.update_action ?? null,
        target_schema: item.target_schema ?? null,
        target_relation: item.target_relation ?? null,
        source_columns: item.source_columns ?? [],
        target_columns: item.target_columns ?? [],
      };
    })
  );

  const indexes = indexesByRelationFromPatch4(patch4);
  const policies = policiesByRelationFromPatch4(patch4);

  const privileges = patch4.privilege_contract.map((cell) => ({
    cell_id: cell.cell_id,
    schema_name: cell.schema_name,
    relation_name: cell.object_name,
    role_name: cell.role_name,
    privilege_name: cell.privilege_name,
    effective_privilege: cell.actual_json.effective_privilege === true,
  }));

  const userDefinedTriggers = [...triggersByRelation.entries()].flatMap(([relation, items]) =>
    items
      .filter((item) => !item.is_internal)
      .map((item) => ({
        schema_name: 'public',
        relation_name: relation,
        trigger_name: item.trigger_name,
        is_internal: false,
        definition: item.definition,
      }))
  );
  const internalFkContracts = deriveInternalFkTriggerContracts(constraintsByRelation);
  const {
    groups: internalTriggerSemanticGroups,
    inventory: internalTriggerInventory,
  } = buildInternalTriggerSemanticGroups(triggersByRelation, internalFkContracts);

  validateFunctionContracts(patch4);
  const extractionByName = new Map(functionExtractions.map((e) => [e.targetName, e]));
  const functions = patch4.function_inventory.map((cell) =>
    normalizeFunctionContract(cell, extractionByName.get(cell.actual_json.function_name))
  );

  const wallet_scope = patch4.wallet_scope.map((cell) => ({
    cell_id: cell.cell_id,
    object_name: cell.object_name,
    actual_json: cell.actual_json,
    fingerprint: walletFingerprint(cell),
  }));

  const state_transitions = buildStateTransitions();
  const function_sources = functionExtractions.map((item) => ({
    function_identity: item.functionIdentity,
    source_migration_path: item.sourceMigrationPath,
    source_migration_expected_sha256: item.sourceMigrationExpectedSha256,
    source_migration_actual_sha256: item.sourceMigrationActualSha256,
    source_migration_sha256_match: item.sourceMigrationSha256Match,
    extraction_hash: item.extractionHash,
    statement_count: item.extractionStatementCount,
  }));

  const matrixOutput: MatrixOutputForCoverage = {
    relations,
    columns,
    constraints,
    indexes,
    policies,
    privileges: privileges.map((p) => ({
      cell_id: p.cell_id,
      effective_privilege: p.effective_privilege,
    })),
    user_defined_triggers: userDefinedTriggers.map((t) => ({
      schema_name: t.schema_name,
      relation_name: t.relation_name,
      trigger_name: t.trigger_name,
      definition: t.definition,
    })),
    internal_trigger_semantic_groups: internalTriggerSemanticGroups,
    internal_trigger_inventory: internalTriggerInventory,
    functions,
    function_sources,
    wallet_scope: wallet_scope.map((w) => ({
      cell_id: w.cell_id,
      actual_json: w.actual_json,
      fingerprint: w.fingerprint,
    })),
    states: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    state_specific_presence: stateSpecificPresence(),
    state_specific_absence: stateSpecificAbsence(),
    state_transitions,
    excluded_objects: stateSpecificAbsence(),
  };

  const coverage_matrix = buildCoverageMatrixEntries(
    patch4,
    p3Rows,
    functionExtractions,
    constraintsByRelation,
    internalFkContracts,
    matrixOutput,
    sourceConflicts
  );

  if (sourceConflicts.length > 0) {
    for (const entry of coverage_matrix) {
      entry.coverage_status = 'FAILED';
      entry.coverage_complete = false;
      entry.semantic_validation_pass = false;
      entry.static_prerequisites_pass = false;
      entry.runtime_validation_status =
        entry.category === 'functions_body_production_parity' ? 'NOT_RUN' : 'NOT_REQUIRED';
      entry.pending_validation_reason = null;
    }
  }

  const parserVersion = assertPglastRuntimeVersion();

  return {
    schema_version: '1',
    matrix_revision: MATRIX_REVISION,
    strategy: STRATEGY,
    baseline_version: BASELINE_VERSION,
    source_artifacts: [
      sourceArtifact('GAP_DIAGNOSTIC_PATCH4_RESULT', PATHS.gapDiagnosticRaw, gapSha256, GAP_DIAGNOSTIC_EXPECTED_BYTES, GAP_DIAGNOSTIC_EXPECTED_NEWLINES, [
        'relation',
        'constraints',
        'indexes',
        'policies',
        'privileges',
        'triggers',
        'functions_identity',
        'wallet',
      ], privacy.status),
      sourceArtifact('CONTRACT_FREEZE_P3_COLUMN_RESULT', PATHS.p3ColumnsRaw, p3Sha256, P3_COLUMNS_EXPECTED_BYTES, P3_COLUMNS_EXPECTED_NEWLINES, ['columns'], privacy.status),
    ],
    evidence_bundle_sha256: evidenceBundleSha256,
    coverage_matrix,
    operational_metadata_scope: OPERATIONAL_METADATA_SCOPE,
    production_target: {
      environment: 'PRODUCTION',
      patch: 'PATCH-4',
      resolved_cells: 536,
      organization: patch4.scalars.target_organization,
      project: patch4.scalars.target_project,
      source: patch4.scalars.target_source,
    },
    states: ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    relations,
    columns,
    constraints,
    indexes,
    policies,
    privileges,
    trigger_parity_mode: 'USER_DEFINED_EXACT_AND_INTERNAL_DERIVED_FROM_FK',
    internal_trigger_exact_name_parity: false,
    internal_trigger_derivation_source: 'constraints',
    user_defined_triggers: userDefinedTriggers,
    internal_fk_trigger_contracts: internalFkContracts,
    internal_trigger_inventory: internalTriggerInventory,
    functions,
    static_readiness_state: STATIC_READINESS_STATE,
    wallet_scope,
    state_specific_presence: stateSpecificPresence(),
    state_specific_absence: stateSpecificAbsence(),
    state_transitions,
    source_conflicts: sourceConflicts,
    parser_contract: {
      parser: 'pglast',
      version: PGLAST_EXPECTED_VERSION,
      expected_version: parserVersion.expected_version,
      actual_version: parserVersion.actual_version,
      version_match: parserVersion.version_match,
      mandatory: true,
      regex_fallback_parser_pass: false,
    },
    function_sources,
    internal_trigger_semantic_groups: internalTriggerSemanticGroups,
    baseline_prerequisites: {
      gen_random_uuid_callable: true,
      extension_owned_by_baseline: false,
      notes:
        'gen_random_uuid() must be callable on disposable target; baseline does not CREATE EXTENSION',
    },
    privacy_scan: {
      status: privacy.status,
      rules_revision: privacy.rules_revision,
    },
    generation_metadata: {
      tool: 'previewBaselineTool',
      tool_version: GENERATOR_VERSION,
    },
  };
}

function coverageEntry(
  category: (typeof COVERAGE_CATEGORIES)[number],
  required: number,
  artifactIds: string[],
  sections: string[],
  actual: number,
  missing: string[],
  duplicate: string[],
  unexpected: string[],
  expectedIdCount: number,
  actualIdCount: number,
  semanticValidationPass: boolean,
  conflicts: string[],
  authority: string,
  pending?: { pendingExecution: boolean; pendingReason: string }
): CoverageMatrixEntry {
  const idComplete =
    conflicts.length === 0 &&
    missing.length === 0 &&
    duplicate.length === 0 &&
    unexpected.length === 0 &&
    actual >= required &&
    expectedIdCount === actualIdCount;
  const staticPrerequisitesPass = idComplete && semanticValidationPass;

  if (pending?.pendingExecution) {
    if (!staticPrerequisitesPass) {
      return {
        category,
        coverage_status: 'FAILED',
        required_object_count: required,
        expected_id_count: expectedIdCount,
        actual_id_count: actualIdCount,
        source_artifact_ids: artifactIds,
        source_sections: sections,
        actual_coverage_count: actual,
        missing_ids: missing,
        duplicate_ids: duplicate,
        unexpected_ids: unexpected,
        missing_objects: missing,
        duplicate_objects: duplicate,
        unexpected_objects: unexpected,
        semantic_validation_pass: false,
        static_prerequisites_pass: false,
        runtime_validation_status: 'NOT_RUN',
        pending_validation_reason: null,
        source_conflicts: conflicts,
        coverage_complete: false,
        generation_authority: authority,
      };
    }
    return {
      category,
      coverage_status: 'PENDING_EXECUTION',
      required_object_count: required,
      expected_id_count: expectedIdCount,
      actual_id_count: actualIdCount,
      source_artifact_ids: artifactIds,
      source_sections: sections,
      actual_coverage_count: actual,
      missing_ids: missing,
      duplicate_ids: duplicate,
      unexpected_ids: unexpected,
      missing_objects: missing,
      duplicate_objects: duplicate,
      unexpected_objects: unexpected,
      semantic_validation_pass: false,
      static_prerequisites_pass: true,
      runtime_validation_status: 'NOT_RUN',
      pending_validation_reason: pending.pendingReason,
      source_conflicts: conflicts,
      coverage_complete: false,
      generation_authority: authority,
    };
  }

  const complete = staticPrerequisitesPass;
  return {
    category,
    coverage_status: complete ? 'COMPLETE' : 'FAILED',
    required_object_count: required,
    expected_id_count: expectedIdCount,
    actual_id_count: actualIdCount,
    source_artifact_ids: artifactIds,
    source_sections: sections,
    actual_coverage_count: actual,
    missing_ids: missing,
    duplicate_ids: duplicate,
    unexpected_ids: unexpected,
    missing_objects: missing,
    duplicate_objects: duplicate,
    unexpected_objects: unexpected,
    semantic_validation_pass: complete,
    static_prerequisites_pass: complete,
    runtime_validation_status: 'NOT_REQUIRED',
    pending_validation_reason: null,
    source_conflicts: conflicts,
    coverage_complete: complete,
    generation_authority: authority,
  };
}

function sourceArtifact(
  artifactId: string,
  repoPath: string,
  sha256: string,
  byteLength: number,
  lineCount: number,
  authorityCategories: string[],
  privacyStatus: string
) {
  return {
    artifact_id: artifactId,
    repo_path: repoPath,
    sha256,
    byte_length: byteLength,
    line_count: lineCount,
    artifact_type: 'production_human_result_raw',
    authority_categories: authorityCategories,
    privacy_scan_status: privacyStatus,
  };
}

function stateSpecificPresence() {
  return [
    { state: 'P2', object: 'failed_fulfillments.user_ref_hash' },
    { state: 'P3', object: 'clerk_webhook_events' },
    { state: 'P4', object: 'm55_account_deletion_process_v1' },
  ];
}

function stateSpecificAbsence() {
  return P1_ABSENT_OBJECTS.map((object) => ({ state: 'P1', object }));
}

function buildStateTransitions() {
  const transitions = [
    { state_from: 'P0', state_to: 'P1', migration_version: BASELINE_VERSION },
    ...CANONICAL_MIGRATIONS.map((item) => ({
      state_from: item.stateFrom,
      state_to: item.stateTo,
      migration_version: item.version,
    })),
  ];
  return transitions.map((item) => ({
    ...item,
    transition_id: item.migration_version,
    application_row_count: 0,
    history_prefix: [BASELINE_VERSION, ...CANONICAL_MIGRATIONS.map((m) => m.version)].filter((version) => {
      const order = [BASELINE_VERSION, ...CANONICAL_MIGRATIONS.map((m) => m.version)];
      return order.indexOf(version) <= order.indexOf(item.migration_version);
    }),
  }));
}

// ── Baseline SQL generation ─────────────────────────────────────────────────

export const PRE_FK_PREREQUISITE_INDEX_REGISTRY_P1 = ['reply_sessions_id_theme_key'] as const;

function columnsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((column, index) => column === right[index]);
}

function indexKeyColumns(item: IndexRecord): string[] {
  if (item.key_columns && item.key_columns.length > 0) {
    return item.key_columns;
  }
  const match = item.definition.match(/USING\s+\w+\s*\(([^)]+)\)/i);
  if (!match) return [];
  return match[1].split(',').map((column) => column.trim());
}

function isStandaloneNonPartialUniqueIndex(item: IndexRecord): boolean {
  if (item.constraint_backed) return false;
  if (!/^CREATE\s+UNIQUE\s+INDEX\s+/i.test(item.definition.trim())) return false;
  if (item.predicate != null && item.predicate.trim() !== '') return false;
  if (/\bWHERE\b/i.test(item.definition)) return false;
  return true;
}

export function identifyPreFkPrerequisiteIndexNames(
  constraintsByRelation: Map<string, ConstraintRecord[]>,
  indexesByRelation: Map<string, IndexRecord[]>
): string[] {
  const names = new Set<string>();
  for (const [, constraints] of constraintsByRelation) {
    for (const constraint of constraints) {
      if (constraint.constraint_type !== 'f') continue;
      const targetRelation = constraint.target_relation;
      const targetColumns = constraint.target_columns;
      if (!targetRelation || !targetColumns || targetColumns.length === 0) continue;
      for (const index of indexesByRelation.get(targetRelation) ?? []) {
        if (!isStandaloneNonPartialUniqueIndex(index)) continue;
        if (!columnsEqual(indexKeyColumns(index), targetColumns)) continue;
        names.add(index.index_name);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function baselineDdlStatementMultiset(baselineSql: string): string[] {
  const parsed = pglastParseSql(baselineSql);
  return parsed.statements
    .map((statement) => statement.sql.trim())
    .filter((statement) => !/^(BEGIN|COMMIT|SET LOCAL search_path)/i.test(statement))
    .sort();
}

export function baselineDdlStatementMultisetSha256(baselineSql: string): string {
  return sha256Hex(stableStringify(baselineDdlStatementMultiset(baselineSql)));
}

function assertBaselinePreFkOrdering(baselineSql: string): void {
  const indexMarker = 'CREATE UNIQUE INDEX reply_sessions_id_theme_key';
  const fkMarker = 'ADD CONSTRAINT "reply_documents_session_theme_fk"';
  const indexPosition = baselineSql.indexOf(indexMarker);
  const fkPosition = baselineSql.indexOf(fkMarker);
  if (indexPosition < 0 || fkPosition < 0 || indexPosition >= fkPosition) {
    throw new Error('baseline_pre_fk_prerequisite_index_order_invalid');
  }
}

export function buildBaselineSql(
  patch4: Patch4Row,
  p3Rows: P3ColumnRow[],
  functionExtractions: FunctionExtraction[],
  matrixSha: string,
  bundleSha: string,
  options?: {
    gapSha256?: string;
    p3Sha256?: string;
    productionFunctionExport?: ProductionFunctionDefinitionExport;
  }
): string {
  const gapSha256 = options?.gapSha256 ?? EXPECTED_GAP_DIAGNOSTIC_SHA256;
  const p3Sha256 = options?.p3Sha256 ?? EXPECTED_P3_COLUMNS_SHA256;
  const lines: string[] = [];
  const push = (...parts: string[]) => {
    lines.push(...parts);
  };

  push(
    '-- M55 Preview Baseline P1',
    `-- revision: ${BASELINE_SQL_REVISION}`,
    `-- baseline_version: ${BASELINE_VERSION}`,
    `-- strategy: ${STRATEGY}`,
    `-- generator_version: ${GENERATOR_VERSION}`,
    `-- source_gap_diagnostic_sha256: ${gapSha256}`,
    `-- source_p3_columns_sha256: ${p3Sha256}`,
    `-- evidence_bundle_sha256: ${bundleSha}`,
    `-- contract_matrix_sha256: ${matrixSha}`,
    '-- WARNING: PREVIEW-ONLY — DO NOT execute on Production',
    '-- WARNING: Production execution STOP',
    '-- operational_metadata_scope: OPERATIONAL_SCHEMA_ONLY',
    ''
  );

  const constraintsByRelation = inventoryByRelation<ConstraintRecord>(
    patch4.constraint_inventory,
    'constraints'
  );
  const indexesByRelation = inventoryByRelation<IndexRecord>(patch4.index_inventory, 'indexes');
  const policiesByRelation = inventoryByRelation<PolicyRecord>(patch4.policy_inventory, 'policies');
  const relationsEvidence = buildRelationsFromEvidence(patch4.relation_security);
  const relationByName = new Map(relationsEvidence.map((item) => [item.relation_name, item]));
  const p3ByRelation = p3ColumnsByRelation(p3Rows);
  const tableOrder = topoSortRelations(constraintsByRelation);

  push('BEGIN;', '', 'SET LOCAL search_path = pg_catalog, public;', '');

  for (const relation of tableOrder) {
    const columns = p3ByRelation.get(relation) ?? [];
    const columnSql = columns.map((row) => `  ${renderColumnDefinition(row)}`).join(',\n');
    push(`CREATE TABLE public.${quoteIdent(relation)} (`, columnSql, ');', '');
  }

  for (const relation of tableOrder) {
    for (const constraint of constraintsByRelation.get(relation) ?? []) {
      if (constraint.constraint_type === 'f') continue;
      push(
        `ALTER TABLE public.${quoteIdent(relation)} ADD CONSTRAINT ${quoteIdent(constraint.constraint_name)} ${constraint.definition};`
      );
    }
  }
  push('');

  const preFkPrerequisiteIndexNames = new Set(
    identifyPreFkPrerequisiteIndexNames(constraintsByRelation, indexesByRelation)
  );
  const preFkPrerequisiteIndexes = [...indexesByRelation.entries()]
    .flatMap(([relation, items]) =>
      items
        .filter((item) => preFkPrerequisiteIndexNames.has(item.index_name))
        .map((item) => ({ relation, item }))
    )
    .sort((a, b) => a.item.index_name.localeCompare(b.item.index_name));
  for (const { item } of preFkPrerequisiteIndexes) {
    const definition = item.definition.trim().replace(/;\s*$/, '');
    push(`${definition};`);
  }
  if (preFkPrerequisiteIndexes.length > 0) push('');

  for (const relation of tableOrder) {
    for (const constraint of constraintsByRelation.get(relation) ?? []) {
      if (constraint.constraint_type !== 'f') continue;
      const definition = qualifyFkConstraintDefinition(constraint.definition);
      push(
        `ALTER TABLE public.${quoteIdent(relation)} ADD CONSTRAINT ${quoteIdent(constraint.constraint_name)} ${definition};`
      );
    }
  }
  push('');

  const standaloneIndexes = [...indexesByRelation.entries()].flatMap(([relation, items]) =>
    items
      .filter((item) => !item.constraint_backed && !preFkPrerequisiteIndexNames.has(item.index_name))
      .map((item) => ({ relation, item }))
      .sort((a, b) => a.item.index_name.localeCompare(b.item.index_name))
  );
  for (const { item } of standaloneIndexes) {
    const definition = item.definition.trim().replace(/;\s*$/, '');
    push(`${definition};`);
  }
  if (standaloneIndexes.length > 0) push('');

  for (const relation of tableOrder) {
    const relSecurity = relationByName.get(relation);
    if (!relSecurity) {
      throw new Error(`relation_security_missing_for_sql:${relation}`);
    }
    const rlsEnabled = relSecurity.rls_enabled;
    const forceRls = relSecurity.force_rls_enabled;
    if (rlsEnabled) {
      push(`ALTER TABLE public.${quoteIdent(relation)} ENABLE ROW LEVEL SECURITY;`);
    }
    if (forceRls) {
      push(`ALTER TABLE public.${quoteIdent(relation)} FORCE ROW LEVEL SECURITY;`);
    }
  }
  push('');

  for (const relation of tableOrder) {
    for (const policy of policiesByRelation.get(relation) ?? []) {
      const roles = policy.roles.map((role) => renderSqlRole(role)).join(', ');
      const permissive = policy.permissive_restrictive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
      const usingExpr = policy.using_expression ? ` USING (${policy.using_expression})` : '';
      const checkExpr = policy.with_check_expression
        ? ` WITH CHECK (${policy.with_check_expression})`
        : '';
      push(
        `CREATE POLICY ${quoteIdent(policy.policy_name)} ON public.${quoteIdent(relation)} AS ${permissive} FOR ${policy.command} TO ${roles}${usingExpr}${checkExpr};`
      );
    }
  }
  if ([...policiesByRelation.values()].some((items) => items.length > 0)) push('');

  for (const relation of tableOrder) {
    push(`REVOKE ALL ON TABLE public.${quoteIdent(relation)} FROM PUBLIC;`);
    for (const role of PRIVILEGE_ROLES) {
      if (role === 'PUBLIC') continue;
      const grants: string[] = [];
      for (const privilege of PRIVILEGE_NAMES) {
        const cell = patch4.privilege_contract.find(
          (item) =>
            item.object_name === relation &&
            item.role_name === role &&
            item.cell_id === `priv.${relation}.${role}.${privilege}`
        );
        if (cell?.actual_json.effective_privilege === true) {
          grants.push(privilege);
        }
      }
      if (grants.length > 0) {
        push(
          `GRANT ${grants.join(', ')} ON TABLE public.${quoteIdent(relation)} TO ${renderSqlRole(role)};`
        );
      }
    }
  }
  push('');

  const productionFunctionMap = options?.productionFunctionExport
    ? buildProductionFunctionDefinitionMap(options.productionFunctionExport)
    : null;
  const sortedExtractions = [...functionExtractions].sort((a, b) =>
    a.targetName.localeCompare(b.targetName)
  );
  for (const extraction of sortedExtractions) {
    const identityCell = patch4.function_inventory.find(
      (cell) => cell.actual_json.function_name === extraction.targetName
    );
    if (!identityCell) {
      throw new Error(`Missing PATCH-4 function inventory for ${extraction.targetName}`);
    }
    const frozenProduction = productionFunctionMap?.get(extraction.targetName) ?? null;
    for (const statement of extraction.statements) {
      if (!isExecutableFunctionBodyStatement(statement, extraction.targetName)) {
        continue;
      }
      if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(statement)) {
        if (frozenProduction) {
          push(formatProductionFunctionCreateForBaseline(frozenProduction.function_definition));
        } else {
          push(qualifyFunctionCreateStatement(statement, extraction.targetName));
        }
        continue;
      }
      const qualified = statement.replace(
        new RegExp(`(COMMENT\\s+ON\\s+FUNCTION\\s+)${extraction.targetName}`, 'i'),
        `$1public.${extraction.targetName}`
      );
      push(qualified);
    }
    for (const line of synthesizeFunctionOwnershipAndAcl(identityCell.actual_json)) {
      push(line);
    }
    push('');
  }

  for (const relation of tableOrder) {
    const relSecurity = relationByName.get(relation);
    if (!relSecurity) {
      throw new Error(`relation_security_missing_for_owner:${relation}`);
    }
    push(
      `ALTER TABLE public.${quoteIdent(relation)} OWNER TO ${renderSqlRole(relSecurity.owner_role)};`
    );
  }
  push('');

  push('COMMIT;', '');
  const sql = `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
  const registry = identifyPreFkPrerequisiteIndexNames(constraintsByRelation, indexesByRelation);
  if (registry.join(',') !== PRE_FK_PREREQUISITE_INDEX_REGISTRY_P1.join(',')) {
    throw new Error(`baseline_pre_fk_prerequisite_registry_mismatch:${registry.join(',')}`);
  }
  assertBaselinePreFkOrdering(sql);
  return sql;
}

// ── Manifest ────────────────────────────────────────────────────────────────

function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}

function migrationFileStats(repoRoot: string, relPath: string) {
  const abs = resolveRepoPath(repoRoot, relPath);
  const content = readFileSync(abs, 'utf8');
  return {
    sha256: sha256Hex(content),
    byte_length: Buffer.byteLength(content, 'utf8'),
    line_count: countLines(content),
  };
}

export function computeMigrationTupleHash(
  migrations: { filename: string; sha256: string }[]
): string {
  const payload = migrations.map((m) => `${m.filename}\n${m.sha256}\n`).join('');
  return sha256Hex(payload);
}

export function buildManifest(
  repoRoot: string,
  options: {
    gapSha256: string;
    p3Sha256: string;
    evidenceBundleSha256: string;
    matrixSha256: string;
    baselineSqlSha256: string;
    baselineSqlBytes: number;
    baselineSqlLines: number;
    functionExtractions: FunctionExtraction[];
  }
): Record<string, unknown> {
  const baselineStats = {
    sequence: 1,
    version: BASELINE_VERSION,
    filename: BASELINE_FILENAME,
    source_path: PATHS.baselineSql,
    source_class: 'preview-only',
    sha256: options.baselineSqlSha256,
    byte_length: options.baselineSqlBytes,
    line_count: options.baselineSqlLines,
    prerequisites: [],
    expected_delta: {
      relations_present: [...REQUIRED_RELATIONS],
      application_row_count: 0,
    },
    forbidden_delta: [...P1_ABSENT_OBJECTS],
    state_from: 'P0',
    state_to: 'P1',
    history_identity: BASELINE_VERSION,
    copy_mode: 'generated_preview_only',
  };

  const canonicalEntries = CANONICAL_MIGRATIONS.map((item) => {
    const stats = migrationFileStats(repoRoot, item.sourcePath);
    if (stats.sha256 !== item.sha256) {
      throw new Error(`Canonical migration SHA mismatch for ${item.filename}`);
    }
    return {
      sequence: item.sequence,
      version: item.version,
      filename: item.filename,
      source_path: item.sourcePath,
      source_class: item.sourceClass,
      sha256: item.sha256,
      byte_length: stats.byte_length,
      line_count: stats.line_count,
      prerequisites: item.sequence === 2 ? [BASELINE_VERSION] : [CANONICAL_MIGRATIONS[item.sequence - 3].version],
      expected_delta: {
        migration_version: item.version,
        state_from: item.stateFrom,
        state_to: item.stateTo,
      },
      forbidden_delta: [],
      state_from: item.stateFrom,
      state_to: item.stateTo,
      history_identity: item.version,
      copy_mode: 'byte_identical',
    };
  });

  const allMigrations = [baselineStats, ...canonicalEntries];
  const migrationTupleHash = computeMigrationTupleHash(
    allMigrations.map((m) => ({ filename: m.filename, sha256: m.sha256 }))
  );

  return {
    schema_version: '1',
    manifest_revision: MANIFEST_REVISION,
    generator_revision: GENERATOR_VERSION,
    matrix_revision: MATRIX_REVISION,
    sql_revision: BASELINE_SQL_REVISION,
    strategy: STRATEGY,
    baseline_version: BASELINE_VERSION,
    static_readiness_state: STATIC_READINESS_STATE,
    production_evidence_bundle_sha256: options.evidenceBundleSha256,
    gap_result_sha256: options.gapSha256,
    p3_columns_result_sha256: options.p3Sha256,
    function_source_migration_shas: options.functionExtractions.map((item) => ({
      function_identity: item.functionIdentity,
      source_migration_path: item.sourceMigrationPath,
      expected_sha256: item.sourceMigrationExpectedSha256,
      actual_sha256: item.sourceMigrationActualSha256,
      sha256_match: item.sourceMigrationSha256Match,
    })),
    contract_matrix_sha256: options.matrixSha256,
    baseline_sql_sha256: options.baselineSqlSha256,
    baseline_sql_revision: BASELINE_SQL_REVISION,
    migration_tuple_hash: migrationTupleHash,
    pending_execution_validations: [
      'function_production_body_parity',
      'gen_random_uuid_callable',
      'disposable_p1_p7_apply',
    ],
    workspace_policy: {
      default_root: 'os_temp',
      marker_file: WORKSPACE_MARKER_FILENAME,
      canonical_dir_write: false,
    },
    history_policy: {
      repair_forbidden: true,
      record_applied_only: true,
      renumber_forbidden: true,
    },
    migrations: allMigrations,
    expected_remote_history: [
      BASELINE_VERSION,
      ...CANONICAL_MIGRATIONS.map((item) => item.version),
    ],
    state_transitions: buildStateTransitions(),
    prohibited_operations: ['apply', 'push', 'repair', 'link', 'deploy', 'production_execute'],
  };
}

// ── Artifact build / verify ─────────────────────────────────────────────────

export type DeriveArtifactsResult = {
  matrixObject: Record<string, unknown>;
  matrixJson: string;
  matrixSha256: string;
  baselineSql: string;
  baselineSha256: string;
  manifestObject: Record<string, unknown>;
  manifestJson: string;
  manifestSha256: string;
  evidenceBundleSha256: string;
};

export type BuildArtifactsResult = {
  matrixPath: string;
  baselinePath: string;
  manifestPath: string;
  matrixSha256: string;
  baselineSha256: string;
  manifestSha256: string;
  evidenceBundleSha256: string;
};

export type ArtifactPaths = {
  matrixPath: string;
  baselinePath: string;
  manifestPath: string;
};

export function resolveArtifactPaths(repoRoot: string): ArtifactPaths {
  return {
    matrixPath: resolveRepoPath(repoRoot, PATHS.contractMatrix),
    baselinePath: resolveRepoPath(repoRoot, PATHS.baselineSql),
    manifestPath: resolveRepoPath(repoRoot, PATHS.manifest),
  };
}

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function verifyRawSources(repoRoot: string): {
  gapBytes: Buffer;
  p3Bytes: Buffer;
  gapSha256: string;
  p3Sha256: string;
} {
  const gapPath = resolveRepoPath(repoRoot, PATHS.gapDiagnosticRaw);
  const p3Path = resolveRepoPath(repoRoot, PATHS.p3ColumnsRaw);
  if (!existsSync(gapPath)) throw new Error(`Missing PATCH-4 raw source: ${PATHS.gapDiagnosticRaw}`);
  if (!existsSync(p3Path)) throw new Error(`Missing P3 raw source: ${PATHS.p3ColumnsRaw}`);

  const gapBytes = readFileSync(gapPath);
  const p3Bytes = readFileSync(p3Path);
  const gapSha256 = sha256Hex(gapBytes);
  const p3Sha256 = sha256Hex(p3Bytes);

  if (gapSha256 !== EXPECTED_GAP_DIAGNOSTIC_SHA256) {
    throw new Error(`PATCH-4 SHA mismatch: expected ${EXPECTED_GAP_DIAGNOSTIC_SHA256}, got ${gapSha256}`);
  }
  if (p3Sha256 !== EXPECTED_P3_COLUMNS_SHA256) {
    throw new Error(`P3 SHA mismatch: expected ${EXPECTED_P3_COLUMNS_SHA256}, got ${p3Sha256}`);
  }
  if (gapBytes.length !== GAP_DIAGNOSTIC_EXPECTED_BYTES) {
    throw new Error(`PATCH-4 byte length mismatch: expected ${GAP_DIAGNOSTIC_EXPECTED_BYTES}, got ${gapBytes.length}`);
  }
  if (p3Bytes.length !== P3_COLUMNS_EXPECTED_BYTES) {
    throw new Error(`P3 byte length mismatch: expected ${P3_COLUMNS_EXPECTED_BYTES}, got ${p3Bytes.length}`);
  }
  if (countNewlines(gapBytes.toString('utf8')) !== GAP_DIAGNOSTIC_EXPECTED_NEWLINES) {
    throw new Error('PATCH-4 newline count mismatch');
  }
  if (countNewlines(p3Bytes.toString('utf8')) !== P3_COLUMNS_EXPECTED_NEWLINES) {
    throw new Error('P3 newline count mismatch');
  }

  for (const [label, bytes] of [
    ['PATCH-4', gapBytes],
    ['P3', p3Bytes],
  ] as const) {
    const scan = privacyScan(bytes.toString('utf8'), 'artifact');
    if (scan.status !== 'pass') {
      throw new Error(`${label} privacy scan failed with ${scan.matches.filter((m) => m.blocking).length} blocking matches`);
    }
  }

  return { gapBytes, p3Bytes, gapSha256, p3Sha256 };
}

export function deriveArtifacts(repoRoot: string): DeriveArtifactsResult {
  assertPglastRuntimeVersion();
  const { gapBytes, p3Bytes, gapSha256, p3Sha256 } = verifyRawSources(repoRoot);
  const evidenceBundleSha256 = computeEvidenceBundleSha256(gapSha256, p3Sha256);

  const patch4 = parsePatch4Artifact(gapBytes);
  const p3Rows = parseP3Artifact(p3Bytes);
  const functionExtractions = extractAllFunctionStatements(repoRoot);
  const productionFunctionExport = loadProductionFunctionDefinitionExport(repoRoot);
  assertProductionFunctionSemanticGuards(productionFunctionExport, functionExtractions);

  const matrixObject = buildContractMatrix(patch4, p3Rows, functionExtractions, {
    gapSha256,
    p3Sha256,
    evidenceBundleSha256,
  });
  const conflicts = matrixObject.source_conflicts as string[];
  if (conflicts.length > 0) {
    throw new Error(`Source conflicts detected: ${conflicts.join(', ')}`);
  }
  const coverage = matrixObject.coverage_matrix as CoverageMatrixEntry[];
  validateCoverageForDerivation(coverage);

  const matrixJson = stableStringify(matrixObject);
  const matrixSha256 = sha256Hex(matrixJson);
  const baselineSql = buildBaselineSql(patch4, p3Rows, functionExtractions, matrixSha256, evidenceBundleSha256, {
    gapSha256,
    p3Sha256,
    productionFunctionExport,
  });
  const baselineScan = privacyScan(baselineSql, 'generated_sql');
  if (baselineScan.status !== 'pass') {
    throw new Error('Generated baseline SQL failed privacy scan');
  }
  pglastParseSql(baselineSql);

  const baselineSha256 = sha256Hex(baselineSql);
  const manifestObject = buildManifest(repoRoot, {
    gapSha256,
    p3Sha256,
    evidenceBundleSha256,
    matrixSha256,
    baselineSqlSha256: baselineSha256,
    baselineSqlBytes: Buffer.byteLength(baselineSql, 'utf8'),
    baselineSqlLines: countLines(baselineSql),
    functionExtractions,
  });
  const manifestJson = stableStringify(manifestObject);
  const manifestSha256 = sha256Hex(manifestJson);

  return {
    matrixObject,
    matrixJson,
    matrixSha256,
    baselineSql,
    baselineSha256,
    manifestObject,
    manifestJson,
    manifestSha256,
    evidenceBundleSha256,
  };
}

export function buildArtifacts(repoRoot: string): BuildArtifactsResult {
  const derived = deriveArtifacts(repoRoot);
  const paths = resolveArtifactPaths(repoRoot);

  ensureParentDir(paths.matrixPath);
  ensureParentDir(paths.baselinePath);
  ensureParentDir(paths.manifestPath);

  writeFileSync(paths.matrixPath, derived.matrixJson, 'utf8');
  writeFileSync(paths.baselinePath, derived.baselineSql, 'utf8');
  writeFileSync(paths.manifestPath, derived.manifestJson, 'utf8');

  const matrixWritten = readFileSync(paths.matrixPath, 'utf8');
  const baselineWritten = readFileSync(paths.baselinePath, 'utf8');
  const manifestWritten = readFileSync(paths.manifestPath, 'utf8');
  if (matrixWritten !== derived.matrixJson) {
    throw new Error('Matrix write verification failed');
  }
  if (baselineWritten !== derived.baselineSql) {
    throw new Error('Baseline SQL write verification failed');
  }
  if (manifestWritten !== derived.manifestJson) {
    throw new Error('Manifest write verification failed');
  }

  return {
    matrixPath: paths.matrixPath,
    baselinePath: paths.baselinePath,
    manifestPath: paths.manifestPath,
    matrixSha256: derived.matrixSha256,
    baselineSha256: derived.baselineSha256,
    manifestSha256: derived.manifestSha256,
    evidenceBundleSha256: derived.evidenceBundleSha256,
  };
}

export function verifyArtifacts(repoRoot: string, artifactPaths?: Partial<ArtifactPaths>): void {
  assertPglastRuntimeVersion();
  const paths = { ...resolveArtifactPaths(repoRoot), ...artifactPaths };
  if (!existsSync(paths.matrixPath)) {
    throw new Error(`verify_artifacts_missing_matrix:${paths.matrixPath}`);
  }
  if (!existsSync(paths.baselinePath)) {
    throw new Error(`verify_artifacts_missing_baseline:${paths.baselinePath}`);
  }
  if (!existsSync(paths.manifestPath)) {
    throw new Error(`verify_artifacts_missing_manifest:${paths.manifestPath}`);
  }

  const matrixOnDisk = readFileSync(paths.matrixPath, 'utf8');
  const baselineOnDisk = readFileSync(paths.baselinePath, 'utf8');
  const manifestOnDisk = readFileSync(paths.manifestPath, 'utf8');

  const derived = deriveArtifacts(repoRoot);

  if (matrixOnDisk !== derived.matrixJson) {
    throw new Error('Matrix on disk does not match derived bytes');
  }
  if (baselineOnDisk !== derived.baselineSql) {
    throw new Error('Baseline SQL on disk does not match derived bytes');
  }
  if (manifestOnDisk !== derived.manifestJson) {
    throw new Error('Manifest on disk does not match derived bytes');
  }
  if (sha256Hex(matrixOnDisk) !== derived.matrixSha256) {
    throw new Error('Matrix SHA on disk does not match derived SHA');
  }
  if (sha256Hex(baselineOnDisk) !== derived.baselineSha256) {
    throw new Error('Baseline SHA on disk does not match derived SHA');
  }
  if (sha256Hex(manifestOnDisk) !== derived.manifestSha256) {
    throw new Error('Manifest SHA on disk does not match derived SHA');
  }
  const matrixObj = JSON.parse(matrixOnDisk) as { matrix_revision?: string };
  if (matrixObj.matrix_revision !== MATRIX_REVISION) {
    throw new Error('Matrix revision mismatch on disk');
  }
  if (!baselineOnDisk.includes(BASELINE_SQL_REVISION)) {
    throw new Error('Baseline SQL revision header mismatch on disk');
  }
}

// ── Workspace helpers ───────────────────────────────────────────────────────

const WORKSPACE_MIGRATIONS = [
  PATHS.baselineSql,
  ...CANONICAL_MIGRATIONS.map((item) => item.sourcePath),
] as const;

function defaultWorkspaceRoot(_repoRoot: string, manifestSha256: string): string {
  return join(tmpdir(), `${WORKSPACE_DIR_BASENAME}-${manifestSha256.slice(0, 12)}`);
}

function resolveRealPath(candidate: string): string {
  const resolved = resolve(candidate);
  if (existsSync(resolved)) {
    return realpathSync(resolved);
  }
  let parent = dirname(resolved);
  while (!existsSync(parent)) {
    const next = dirname(parent);
    if (next === parent) {
      return resolved;
    }
    parent = next;
  }
  const realParent = realpathSync(parent);
  return join(realParent, resolved.slice(parent.length));
}

export function validateWorkspaceRoot(repoRoot: string, candidate: string): string {
  const resolvedRepo = resolve(realpathSync(repoRoot));
  const resolved = resolve(candidate);
  const realCandidate = resolveRealPath(candidate);
  const realTmp = resolveRealPath(tmpdir());
  const home = process.env.HOME ? resolve(realpathSync(process.env.HOME)) : '';

  const rootBasename = basename(realCandidate);
  if (!rootBasename.startsWith(`${WORKSPACE_DIR_BASENAME}-`)) {
    throw new Error(`workspace_root_missing_basename:${resolved}`);
  }
  if (resolved === '/' || realCandidate === '/') {
    throw new Error('workspace_root_forbidden:/');
  }
  if (home && (resolved === home || realCandidate === home)) {
    throw new Error('workspace_root_forbidden:home');
  }
  if (realCandidate === realTmp || resolved === tmpdir()) {
    throw new Error('workspace_root_forbidden:tmpdir_root');
  }
  if (!isPathStrictlyInside(realTmp, realCandidate)) {
    throw new Error(`workspace_root_forbidden:outside_tmpdir:${realCandidate}`);
  }
  if (
    resolvedRepo === realCandidate ||
    isPathStrictlyInside(resolvedRepo, realCandidate) ||
    isPathStrictlyInside(realCandidate, resolvedRepo)
  ) {
    throw new Error('workspace_root_forbidden:inside_repo');
  }
  const canonicalMigrations = resolveRealPath(resolveRepoPath(repoRoot, 'supabase/migrations'));
  if (
    realCandidate === canonicalMigrations ||
    isPathStrictlyInside(canonicalMigrations, realCandidate)
  ) {
    throw new Error('workspace_root_forbidden:canonical_migrations');
  }
  if (existsSync(resolved) && lstatSync(resolved).isSymbolicLink()) {
    throw new Error(`workspace_root_forbidden:symlink_ancestor:${resolved}`);
  }
  if (existsSync(realCandidate)) {
    throw new Error(`workspace_root_forbidden:already_exists:${realCandidate}`);
  }
  let probe = dirname(realCandidate);
  while (probe !== realTmp && probe !== dirname(probe)) {
    if (existsSync(probe) && lstatSync(probe).isSymbolicLink()) {
      throw new Error(`workspace_root_forbidden:symlink_ancestor:${probe}`);
    }
    probe = dirname(probe);
  }
  return resolved;
}

function isSafeCleanupRoot(candidate: string): boolean {
  if (!existsSync(candidate)) return false;
  const resolved = resolveRealPath(candidate);
  const realTmp = resolveRealPath(tmpdir());
  const home = process.env.HOME ? resolve(realpathSync(process.env.HOME)) : '';
  if (!basename(resolved).startsWith(`${WORKSPACE_DIR_BASENAME}-`)) return false;
  if (resolved === '/' || resolved === home || resolved === realTmp) return false;
  return isPathStrictlyInside(realTmp, resolved);
}

export function preflightWorkspaceMigrations(
  repoRoot: string,
  manifest: { migrations: { filename: string; source_path: string; sha256: string; byte_length: number; line_count: number }[] }
): void {
  if (manifest.migrations.length !== 7) {
    throw new Error(`workspace_preflight_migration_count:${manifest.migrations.length}`);
  }
  for (const entry of manifest.migrations) {
    const sourcePath = resolveRepoPath(repoRoot, entry.source_path);
    if (!existsSync(sourcePath)) {
      throw new Error(`workspace_preflight_missing_source:${entry.source_path}`);
    }
    const stat = lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`workspace_preflight_source_symlink:${entry.source_path}`);
    }
    if (!stat.isFile()) {
      throw new Error(`workspace_preflight_source_not_file:${entry.source_path}`);
    }
    const bytes = readFileSync(sourcePath);
    const sha = sha256Hex(bytes);
    if (sha !== entry.sha256) {
      throw new Error(`workspace_preflight_sha_mismatch:${entry.filename}`);
    }
    if (bytes.length !== entry.byte_length) {
      throw new Error(`workspace_preflight_byte_length_mismatch:${entry.filename}`);
    }
    if (countLines(bytes.toString('utf8')) !== entry.line_count) {
      throw new Error(`workspace_preflight_line_count_mismatch:${entry.filename}`);
    }
    if (entry.filename !== entry.source_path.split('/').pop()) {
      throw new Error(`workspace_preflight_filename_mismatch:${entry.filename}`);
    }
  }
}

export function buildWorkspace(repoRoot: string, workspaceRoot?: string): {
  workspaceRoot: string;
  markerPath: string;
  manifestSha256: string;
} {
  const resolvedRepo = resolve(realpathSync(repoRoot));
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error('workspace_requires_manifest:manifest_missing');
  }
  assertPglastRuntimeVersion();
  verifyArtifacts(repoRoot);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as {
    manifest_revision: string;
    migration_tuple_hash: string;
    migrations: { filename: string; source_path: string; sha256: string; byte_length: number; line_count: number }[];
  };
  const manifestSha256 = sha256Hex(manifestBytes);
  preflightWorkspaceMigrations(repoRoot, manifest);
  const requested = workspaceRoot ?? defaultWorkspaceRoot(repoRoot, manifestSha256);
  const root = validateWorkspaceRoot(resolvedRepo, requested);
  const migrationsDir = join(root, 'migrations');
  if (existsSync(migrationsDir)) {
    throw new Error(`workspace_migrations_dir_already_exists:${migrationsDir}`);
  }
  mkdirSync(root, { recursive: false });
  mkdirSync(migrationsDir, { recursive: false });

  try {
    for (const relPath of WORKSPACE_MIGRATIONS) {
      const source = resolveRepoPath(repoRoot, relPath);
      const filename = relPath.split('/').pop()!;
      const manifestEntry = manifest.migrations.find((m) => m.filename === filename);
      if (!manifestEntry) {
        throw new Error(`workspace_manifest_entry_missing:${filename}`);
      }
      if (lstatSync(source).isSymbolicLink()) {
        throw new Error(`workspace_source_symlink_forbidden:${relPath}`);
      }
      const sourceBytes = readFileSync(source);
      if (sha256Hex(sourceBytes) !== manifestEntry.sha256) {
        throw new Error(`workspace_source_sha_mismatch_before_copy:${filename}`);
      }
      const target = join(migrationsDir, filename);
      if (existsSync(target)) {
        throw new Error(`workspace_migration_target_exists:${target}`);
      }
      copyFileSync(source, target);
      const targetBytes = readFileSync(target);
      if (!sourceBytes.equals(targetBytes)) {
        throw new Error(`workspace_copy_byte_mismatch:${relPath}`);
      }
      if (sha256Hex(targetBytes) !== manifestEntry.sha256) {
        throw new Error(`workspace_target_sha_mismatch_after_copy:${filename}`);
      }
    }

    const marker: WorkspaceMarker = {
      tool: 'previewBaselineTool',
      revision: manifest.manifest_revision ?? MANIFEST_REVISION,
      manifest_sha256: manifestSha256,
      migration_tuple_hash: manifest.migration_tuple_hash,
      created_path: root,
      source_repo: resolvedRepo,
      safe_cleanup_root: root,
    };
    const markerPath = join(root, WORKSPACE_MARKER_FILENAME);
    writeFileSync(markerPath, stableStringify(marker), 'utf8');

    return { workspaceRoot: root, markerPath, manifestSha256 };
  } catch (error) {
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
    throw error;
  }
}

function verifyWorkspaceIntegrity(
  repoRoot: string,
  root: string,
  options: { requireManifest: boolean }
): void {
  const resolvedRepo = resolve(realpathSync(repoRoot));
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  if (options.requireManifest && !existsSync(manifestPath)) {
    throw new Error('workspace_requires_manifest:manifest_missing');
  }
  if (!existsSync(root)) {
    throw new Error(`Workspace root missing: ${root}`);
  }
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink()) {
    throw new Error('Workspace root must not be a symlink');
  }
  if (!rootStat.isDirectory()) {
    throw new Error('Workspace root is not a directory');
  }
  const realRoot = resolveRealPath(root);
  const realTmp = resolveRealPath(tmpdir());
  if (
    !isPathStrictlyInside(realTmp, realRoot) ||
    !basename(realRoot).startsWith(`${WORKSPACE_DIR_BASENAME}-`)
  ) {
    throw new Error('Workspace root failed safety policy');
  }
  if (
    realRoot === realTmp ||
    realRoot === resolvedRepo ||
    isPathStrictlyInside(resolvedRepo, realRoot)
  ) {
    throw new Error('Workspace root is unsafe');
  }
  const markerPath = join(root, WORKSPACE_MARKER_FILENAME);
  if (!existsSync(markerPath)) {
    throw new Error(`Workspace marker missing: ${markerPath}`);
  }
  const rootEntries = readdirSorted(root);
  const allowedRootEntries = ['migrations', WORKSPACE_MARKER_FILENAME].sort();
  if (rootEntries.join(',') !== allowedRootEntries.join(',')) {
    throw new Error(`Unexpected workspace root entries: ${rootEntries.join(', ')}`);
  }
  const markerStat = lstatSync(markerPath);
  if (markerStat.isSymbolicLink()) {
    throw new Error('Workspace marker must not be a symlink');
  }
  if (!markerStat.isFile()) {
    throw new Error('Workspace marker is not a regular file');
  }
  const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as WorkspaceMarker;
  if (marker.tool !== 'previewBaselineTool') {
    throw new Error('Workspace marker tool mismatch');
  }
  if (!isSafeCleanupRoot(marker.safe_cleanup_root)) {
    throw new Error('Workspace marker safe_cleanup_root is not safe');
  }
  if (resolve(marker.created_path) !== resolve(root) || resolve(marker.safe_cleanup_root) !== resolve(root)) {
    throw new Error('Workspace marker path fields mismatch actual root');
  }
  if (resolve(marker.source_repo) !== resolvedRepo) {
    throw new Error('Workspace marker source_repo mismatch');
  }

  const manifestBytes = readFileSync(manifestPath);
  const manifestSha256 = sha256Hex(manifestBytes);
  if (marker.manifest_sha256 !== manifestSha256) {
    throw new Error('Workspace marker manifest SHA mismatch');
  }
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as {
    manifest_revision: string;
    migrations: {
      filename: string;
      source_path: string;
      sha256: string;
      byte_length: number;
      line_count: number;
    }[];
    migration_tuple_hash: string;
  };
  if (marker.revision !== manifest.manifest_revision) {
    throw new Error('Workspace marker revision mismatch');
  }
  if (marker.migration_tuple_hash !== manifest.migration_tuple_hash) {
    throw new Error('Workspace marker migration_tuple_hash mismatch');
  }

  const migrationsDir = join(root, 'migrations');
  if (!existsSync(migrationsDir)) {
    throw new Error('Workspace migrations directory missing');
  }
  const migrationsStat = lstatSync(migrationsDir);
  if (migrationsStat.isSymbolicLink()) {
    throw new Error('Workspace migrations directory must not be a symlink');
  }
  if (!migrationsStat.isDirectory()) {
    throw new Error('Workspace migrations path is not a directory');
  }
  const files = WORKSPACE_MIGRATIONS.map((relPath) => {
    const filename = relPath.split('/').pop()!;
    const diskPath = join(migrationsDir, filename);
    if (!existsSync(diskPath)) {
      throw new Error(`Workspace migration missing: ${filename}`);
    }
    const stat = lstatSync(diskPath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Workspace migration must not be symlink: ${filename}`);
    }
    if (!stat.isFile()) {
      throw new Error(`Workspace migration is not a regular file: ${filename}`);
    }
    const manifestEntry = manifest.migrations.find((m) => m.filename === filename);
    if (!manifestEntry) {
      throw new Error(`Workspace manifest entry missing: ${filename}`);
    }
    const diskBytes = readFileSync(diskPath);
    if (sha256Hex(diskBytes) !== manifestEntry.sha256) {
      throw new Error(`Workspace migration SHA mismatch: ${filename}`);
    }
    if (diskBytes.length !== manifestEntry.byte_length) {
      throw new Error(`Workspace migration byte_length mismatch: ${filename}`);
    }
    if (countLines(diskBytes.toString('utf8')) !== manifestEntry.line_count) {
      throw new Error(`Workspace migration line_count mismatch: ${filename}`);
    }
    const repoPath = resolveRepoPath(repoRoot, relPath);
    const repoBytes = readFileSync(repoPath);
    if (!repoBytes.equals(diskBytes)) {
      throw new Error(`Workspace migration bytes mismatch: ${filename}`);
    }
    return filename;
  });

  const extras = readdirSorted(migrationsDir).filter((name) => !files.includes(name));
  if (extras.length > 0) {
    throw new Error(`Unexpected workspace files: ${extras.join(', ')}`);
  }
}

export function verifyWorkspace(repoRoot: string, workspaceRoot?: string): void {
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  const manifestSha256 = sha256Hex(readFileSync(manifestPath, 'utf8'));
  const root = workspaceRoot ?? defaultWorkspaceRoot(repoRoot, manifestSha256);
  verifyWorkspaceIntegrity(repoRoot, root, { requireManifest: true });
}

export function verifyWorkspaceForCleanup(repoRoot: string, workspaceRoot?: string): void {
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error('cleanup_requires_manifest:manifest_missing');
  }
  const manifestSha256 = sha256Hex(readFileSync(manifestPath, 'utf8'));
  const root = workspaceRoot ?? defaultWorkspaceRoot(repoRoot, manifestSha256);
  verifyWorkspaceIntegrity(repoRoot, root, { requireManifest: true });
}

function readdirSorted(path: string): string[] {
  return readdirSync(path).sort();
}

export function cleanWorkspace(repoRoot: string, workspaceRoot?: string): void {
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error('cleanup_requires_manifest:manifest_missing');
  }
  const manifestSha256 = sha256Hex(readFileSync(manifestPath, 'utf8'));
  const root = workspaceRoot ?? defaultWorkspaceRoot(repoRoot, manifestSha256);
  verifyWorkspaceForCleanup(repoRoot, root);
  rmSync(root, { recursive: true, force: true });
}
export type AssertionClassification = 'STATIC_EXACT' | 'RUNTIME_REQUIRED';

export type ExecutionOraclePhase = {
  phase: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
  history_prefix: string[];
  application_row_count: number;
  relations_present: string[];
  relations_absent: string[];
  columns_present: string[];
  columns_absent: string[];
  constraints_present: string[];
  constraints_absent: string[];
  indexes_present: string[];
  indexes_absent: string[];
  policies: string[];
  privileges: string[];
  relation_security: string[];
  functions_present: string[];
  functions_absent: string[];
  function_acl: string[];
  function_config: string[];
  user_defined_triggers: string[];
  internal_trigger_semantic_contract: string[];
  state_specific_presence: { state: string; object: string }[];
  state_specific_absence: { state: string; object: string }[];
  expected_delta_from_previous: Record<string, unknown>;
  forbidden_delta: string[];
  static_exact_assertions: string[];
  runtime_required_assertions: string[];
  oracle_contract_hash: string;
  runtime_snapshot_hash: null;
  runtime_validation_status: 'NOT_RUN';
};

const PRIVILEGE_NAMES_ORDERED = [...PRIVILEGE_NAMES];

const FAILURE_CONTRACT_STOP_REASONS = [
  'source_sha_mismatch',
  'manifest_mismatch',
  'oracle_mismatch',
  'p0_prerequisite_failure',
  'migration_apply_failed',
  'history_prefix_mismatch',
  'application_row_count_mismatch',
  'function_parity_mismatch',
  'unexpected_catalog_item',
  'fixture_marker_mismatch',
  'cleanup_refusal',
] as const;

function privilegeFingerprint(
  relation: string,
  role: string,
  privilege: string,
  effective: boolean
): string {
  return `priv.${relation}.${role}.${privilege}|${effective ? '1' : '0'}`;
}

type ExecutionOraclePhaseDraft = Omit<
  ExecutionOraclePhase,
  'oracle_contract_hash' | 'runtime_snapshot_hash' | 'runtime_validation_status'
>;

function oraclePhaseBodyHash(phase: ExecutionOraclePhaseDraft): string {
  return sha256Hex(stableStringify(phase));
}

function finalizePhase(phase: ExecutionOraclePhaseDraft): ExecutionOraclePhase {
  return {
    ...phase,
    oracle_contract_hash: oraclePhaseBodyHash(phase),
    runtime_snapshot_hash: null,
    runtime_validation_status: 'NOT_RUN',
  };
}

const EXECUTION_PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const;
type ExecutionPhaseId = (typeof EXECUTION_PHASES)[number];

const STATE_PRESENCE_INTRODUCTIONS = [
  { introducedAt: 'P2', object: 'failed_fulfillments.user_ref_hash' },
  { introducedAt: 'P3', object: 'clerk_webhook_events' },
  { introducedAt: 'P4', object: 'm55_account_deletion_process_v1' },
] as const;

const STATE_ABSENCE_RESOLUTIONS = new Map<string, ExecutionPhaseId>([
  ['failed_fulfillments.user_ref_hash', 'P2'],
  ['failed_fulfillments_user_ref_hash_format_check', 'P2'],
  ['idx_failed_fulfillments_user_ref_hash', 'P2'],
  ['clerk_webhook_events', 'P3'],
  ['m55_account_deletion_process_v1', 'P4'],
]);

function phaseOrdinal(phase: ExecutionPhaseId): number {
  return EXECUTION_PHASES.indexOf(phase);
}

function phaseStateContracts(
  phase: ExecutionPhaseId
): Pick<ExecutionOraclePhaseDraft, 'state_specific_presence' | 'state_specific_absence'> {
  const current = phaseOrdinal(phase);
  const state_specific_presence = STATE_PRESENCE_INTRODUCTIONS
    .filter((item) => phaseOrdinal(item.introducedAt) <= current)
    .map((item) => ({ state: phase, object: item.object }))
    .sort((a, b) => a.object.localeCompare(b.object));
  const state_specific_absence = [...P1_ABSENT_OBJECTS]
    .filter((object) => {
      const resolvedAt = STATE_ABSENCE_RESOLUTIONS.get(object);
      return !resolvedAt || phaseOrdinal(resolvedAt) > current;
    })
    .map((object) => ({ state: phase, object }))
    .sort((a, b) => a.object.localeCompare(b.object));
  return { state_specific_presence, state_specific_absence };
}

function verifyRevision7ArtifactShas(repoRoot: string): {
  matrixSha256: string;
  manifestSha256: string;
  baselineSha256: string;
  matrix: Record<string, unknown>;
  manifest: Record<string, unknown>;
} {
  const paths = resolveArtifactPaths(repoRoot);
  const matrixBytes = readFileSync(paths.matrixPath);
  const manifestBytes = readFileSync(paths.manifestPath);
  const baselineBytes = readFileSync(paths.baselinePath);
  const matrixSha256 = sha256Hex(matrixBytes);
  const manifestSha256 = sha256Hex(manifestBytes);
  const baselineSha256 = sha256Hex(baselineBytes);
  if (matrixSha256 !== EXPECTED_MATRIX_ARTIFACT_SHA256) {
    throw new Error(`execution_oracle_matrix_sha_mismatch:${matrixSha256}`);
  }
  if (manifestSha256 !== EXPECTED_MANIFEST_ARTIFACT_SHA256) {
    throw new Error(`execution_oracle_manifest_sha_mismatch:${manifestSha256}`);
  }
  if (baselineSha256 !== EXPECTED_BASELINE_ARTIFACT_SHA256) {
    throw new Error(`execution_oracle_baseline_sha_mismatch:${baselineSha256}`);
  }
  return {
    matrixSha256,
    manifestSha256,
    baselineSha256,
    matrix: JSON.parse(matrixBytes.toString('utf8')) as Record<string, unknown>,
    manifest: JSON.parse(manifestBytes.toString('utf8')) as Record<string, unknown>,
  };
}

function verifyCanonicalMigrationSources(repoRoot: string): Record<string, string> {
  const shas: Record<string, string> = {};
  for (const entry of CANONICAL_MIGRATIONS) {
    const path = resolveRepoPath(repoRoot, entry.sourcePath);
    const bytes = readFileSync(path);
    const hash = sha256Hex(bytes);
    if (hash !== entry.sha256) {
      throw new Error(`canonical_migration_sha_mismatch:${entry.version}:${hash}`);
    }
    shas[entry.version] = hash;
  }
  return shas;
}

function extractP1PhaseFromMatrix(matrix: Record<string, unknown>): ExecutionOraclePhase {
  const relations = matrix.relations as {
    schema_name: string;
    relation_name: string;
    owner_role: string;
    rls_enabled: boolean;
    force_rls_enabled: boolean;
  }[];
  const columns = matrix.columns as Parameters<typeof columnFingerprint>[0][];
  const constraints = matrix.constraints as Parameters<typeof constraintFingerprint>[0][];
  const indexes = matrix.indexes as Parameters<typeof indexFingerprint>[0][];
  const policies = matrix.policies as Parameters<typeof policyFingerprint>[0][];
  const privileges = matrix.privileges as { cell_id: string; effective_privilege: boolean }[];
  const functions = matrix.functions as Record<string, unknown>[];
  const groups = matrix.internal_trigger_semantic_groups as InternalTriggerSemanticGroup[];
  const wallet = matrix.wallet_scope as { cell_id: string; fingerprint: string }[];

  const relationNames = relations.map((r) => r.relation_name).sort();
  const columnFps = columns.map((c) => columnFingerprint(c)).sort();
  const constraintFps = constraints.map((c) => constraintFingerprint(c)).sort();
  const indexFps = indexes.map((i) => indexFingerprint(i)).sort();
  const policyFps = policies.map((p) => policyFingerprint(p)).sort();
  const privilegeFps = privileges
    .map((p) => `${p.cell_id}|${p.effective_privilege ? '1' : '0'}`)
    .sort();
  const relationSecurity = relations
    .flatMap((r) => relationSecurityFingerprintsFromMatrix(r))
    .sort();
  const functionNames = functions
    .map((f) => `${String(f.schema_name)}.${String(f.function_name)}`)
    .sort();
  const functionAcl = functions
    .map((f) =>
      [
        String(f.schema_name),
        String(f.function_name),
        String(f.public_execute),
        String(f.anon_execute),
        String(f.authenticated_execute),
        String(f.service_role_execute),
      ].join('|')
    )
    .sort();
  const functionConfig = functions
    .map((f) =>
      [
        String(f.schema_name),
        String(f.function_name),
        String(f.security_definer),
        String(f.volatility),
        String(f.parallel_safety),
        stableStringify(f.proconfig ?? []),
        String(f.search_path ?? ''),
      ].join('|')
    )
    .sort();
  const internalGroups = groups.map((g) => internalTriggerGroupMetadataFingerprint(g)).sort();
  const walletFps = wallet.map((w) => `${w.cell_id}|${w.fingerprint}`).sort();

  return finalizePhase({
    phase: 'P1',
    history_prefix: [BASELINE_VERSION],
    application_row_count: 0,
    relations_present: relationNames,
    relations_absent: [],
    columns_present: columnFps,
    columns_absent: [],
    constraints_present: constraintFps,
    constraints_absent: [],
    indexes_present: indexFps,
    indexes_absent: [],
    policies: policyFps,
    privileges: privilegeFps,
    relation_security: relationSecurity,
    functions_present: functionNames,
    functions_absent: ['public.m55_account_deletion_process_v1'],
    function_acl: functionAcl,
    function_config: functionConfig,
    user_defined_triggers: [],
    internal_trigger_semantic_contract: internalGroups,
    ...phaseStateContracts('P1'),
    expected_delta_from_previous: {
      migration_version: BASELINE_VERSION,
      source: 'revision_7_matrix_manifest',
      relations_created: relationNames,
      wallet_contract: walletFps,
    },
    forbidden_delta: [...P1_ABSENT_OBJECTS],
    static_exact_assertions: [
      'relations_count_15',
      'columns_count_141',
      'privileges_count_420',
      'internal_trigger_groups_34',
      'internal_trigger_inventory_trace_runtime_required',
    ],
    runtime_required_assertions: [
      'internal_trigger_inventory_oid_trace',
      'pg_get_functiondef_parity_pending',
    ],
  });
}

function buildP0Phase(p1: ExecutionOraclePhase): ExecutionOraclePhase {
  return finalizePhase({
    phase: 'P0',
    history_prefix: [],
    application_row_count: 0,
    relations_present: [],
    relations_absent: [...REQUIRED_RELATIONS].sort(),
    columns_present: [],
    columns_absent: [...p1.columns_present],
    constraints_present: [],
    constraints_absent: [...p1.constraints_present],
    indexes_present: [],
    indexes_absent: [...p1.indexes_present],
    policies: [],
    privileges: [],
    relation_security: [],
    functions_present: [],
    functions_absent: [...p1.functions_present, 'public.m55_account_deletion_process_v1'],
    function_acl: [],
    function_config: [],
    user_defined_triggers: [],
    internal_trigger_semantic_contract: [],
    ...phaseStateContracts('P0'),
    expected_delta_from_previous: {
      contract: 'empty_disposable_target',
      migration_history_state: 'absent_or_empty',
      required_role_prerequisites: ['postgres', 'anon', 'authenticated', 'service_role'],
      fixture_metadata_present: false,
    },
    forbidden_delta: [...REQUIRED_RELATIONS, ...P1_ABSENT_OBJECTS],
    static_exact_assertions: ['application_relations_absent', 'migration_history_empty'],
    runtime_required_assertions: ['gen_random_uuid_callable', 'required_roles_exist'],
  });
}

function readCanonicalMigration(repoRoot: string, version: string): string {
  const entry = CANONICAL_MIGRATIONS.find((m) => m.version === version);
  if (!entry) throw new Error(`canonical_migration_missing:${version}`);
  return readFileSync(resolveRepoPath(repoRoot, entry.sourcePath), 'utf8');
}

function buildP2Phase(p1: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000001');
  if (!sql.includes('user_ref_hash')) {
    throw new Error('p2_derivation_source_invalid:user_ref_hash');
  }
  const columnFp =
    'public|failed_fulfillments|user_ref_hash|7|text|Y|D0|';
  const constraintFp = FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT;
  const indexFp =
    'public|failed_fulfillments|idx_failed_fulfillments_user_ref_hash|CREATE INDEX idx_failed_fulfillments_user_ref_hash ON public.failed_fulfillments USING btree (user_ref_hash) WHERE (user_ref_hash IS NOT NULL)|false';

  const privileges = p1.privileges.map((item) => {
    const revoked =
      (item.startsWith('priv.failed_fulfillments.anon.SELECT|') ||
        item.startsWith('priv.failed_fulfillments.anon.INSERT|') ||
        item.startsWith('priv.failed_fulfillments.anon.UPDATE|') ||
        item.startsWith('priv.failed_fulfillments.anon.DELETE|') ||
        item.startsWith('priv.failed_fulfillments.authenticated.SELECT|') ||
        item.startsWith('priv.failed_fulfillments.authenticated.INSERT|') ||
        item.startsWith('priv.failed_fulfillments.authenticated.UPDATE|') ||
        item.startsWith('priv.failed_fulfillments.authenticated.DELETE|')) &&
      item.endsWith('|1');
    if (!revoked) return item;
    return item.replace('|1', '|0');
  });

  return finalizePhase({
    ...p1,
    phase: 'P2',
    history_prefix: [BASELINE_VERSION, '20260615000001'],
    columns_present: [...p1.columns_present, columnFp].sort(),
    constraints_present: [...p1.constraints_present, constraintFp].sort(),
    indexes_present: [...p1.indexes_present, indexFp].sort(),
    privileges,
    ...phaseStateContracts('P2'),
    expected_delta_from_previous: {
      migration_version: '20260615000001',
      source_sha256: CANONICAL_MIGRATIONS[0].sha256,
      column_added: 'failed_fulfillments.user_ref_hash',
      constraint_added: 'failed_fulfillments_user_ref_hash_format_check',
      index_added: 'idx_failed_fulfillments_user_ref_hash',
      privilege_revoked: 'failed_fulfillments:anon,authenticated:SELECT,INSERT,UPDATE,DELETE',
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'failed_fulfillments_user_ref_hash_column',
      'failed_fulfillments_user_ref_hash_format_check',
      'idx_failed_fulfillments_user_ref_hash_partial',
      'failed_fulfillments_anon_authenticated_dml_revoked',
    ],
    runtime_required_assertions: p1.runtime_required_assertions,
  });
}

function buildP3Phase(p2: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000002');
  if (!sql.includes('CREATE TABLE public.clerk_webhook_events')) {
    throw new Error('p3_derivation_source_invalid:clerk_webhook_events');
  }
  const relation = 'clerk_webhook_events';
  const columnFps = [
    'public|clerk_webhook_events|svix_id|1|text|N|D0|',
    'public|clerk_webhook_events|event_type|2|text|N|D0|',
    'public|clerk_webhook_events|deletion_subject_id|3|text|Y|D0|',
    'public|clerk_webhook_events|status|4|text|N|D0|',
    'public|clerk_webhook_events|attempt_count|5|integer|N|D1|0',
    'public|clerk_webhook_events|error_code|6|text|Y|D0|',
    'public|clerk_webhook_events|created_at|7|timestamp with time zone|N|D1|now()',
    'public|clerk_webhook_events|updated_at|8|timestamp with time zone|N|D1|now()',
    'public|clerk_webhook_events|completed_at|9|timestamp with time zone|Y|D0|',
  ];
  const constraintFps = [...CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS];
  const indexFps = [
    'public|clerk_webhook_events|clerk_webhook_events_pkey|CREATE UNIQUE INDEX clerk_webhook_events_pkey ON public.clerk_webhook_events USING btree (svix_id)|true',
  ];
  const relationSecurity = [
    ...p2.relation_security,
    'public|clerk_webhook_events|owner|postgres',
    'public|clerk_webhook_events|rls|true',
    'public|clerk_webhook_events|force_rls|false',
  ].sort();
  const privilegeFps: string[] = [...p2.privileges];
  for (const role of ['PUBLIC', 'anon', 'authenticated'] as const) {
    for (const priv of PRIVILEGE_NAMES_ORDERED) {
      privilegeFps.push(privilegeFingerprint(relation, role, priv, false));
    }
  }
  for (const priv of ['SELECT', 'INSERT', 'UPDATE'] as const) {
    privilegeFps.push(privilegeFingerprint(relation, 'service_role', priv, true));
  }
  for (const priv of ['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] as const) {
    privilegeFps.push(privilegeFingerprint(relation, 'service_role', priv, false));
  }
  privilegeFps.sort();

  return finalizePhase({
    ...p2,
    phase: 'P3',
    history_prefix: [BASELINE_VERSION, '20260615000001', '20260615000002'],
    relations_present: [...p2.relations_present, relation].sort(),
    columns_present: [...p2.columns_present, ...columnFps].sort(),
    constraints_present: [...p2.constraints_present, ...constraintFps].sort(),
    indexes_present: [...p2.indexes_present, ...indexFps].sort(),
    relation_security: relationSecurity,
    privileges: privilegeFps,
    policies: [...p2.policies],
    ...phaseStateContracts('P3'),
    expected_delta_from_previous: {
      migration_version: '20260615000002',
      source_sha256: CANONICAL_MIGRATIONS[1].sha256,
      relation_created: relation,
      rls_enabled: true,
      policies_count: 0,
      service_role_grants: 'SELECT,INSERT,UPDATE',
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'clerk_webhook_events_table_columns',
      'clerk_webhook_events_constraints',
      'clerk_webhook_events_rls_enabled',
      'clerk_webhook_events_public_anon_authenticated_revoked',
    ],
    runtime_required_assertions: p2.runtime_required_assertions,
  });
}

function buildP4Phase(p3: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000003');
  if (!sql.includes('m55_account_deletion_process_v1')) {
    throw new Error('p4_derivation_source_invalid:m55_account_deletion_process_v1');
  }
  const identity = 'public.m55_account_deletion_process_v1';
  const functionAcl = [
    'public|m55_account_deletion_process_v1|false|false|false|true',
  ];
  const functionConfig = [M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT];
  return finalizePhase({
    ...p3,
    phase: 'P4',
    history_prefix: [BASELINE_VERSION, '20260615000001', '20260615000002', '20260615000003'],
    functions_present: [...p3.functions_present, identity].sort(),
    functions_absent: [],
    function_acl: [...p3.function_acl, ...functionAcl].sort(),
    function_config: [...p3.function_config, ...functionConfig].sort(),
    ...phaseStateContracts('P4'),
    expected_delta_from_previous: {
      migration_version: '20260615000003',
      source_sha256: CANONICAL_MIGRATIONS[2].sha256,
      function_created: identity,
      identity_arguments: 'p_svix_id text, p_event_type text, p_clerk_user_id text, p_user_ref_hash text',
      result_type: 'jsonb',
      security_definer: true,
      execute_grants: 'service_role_only',
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'm55_account_deletion_process_v1_identity',
      'm55_account_deletion_process_v1_acl_service_role_only',
    ],
    runtime_required_assertions: [
      ...p3.runtime_required_assertions,
      'm55_account_deletion_process_v1_pg_get_functiondef_not_compared',
    ],
  });
}

function buildP5Phase(p4: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000004');
  if (!sql.includes('DROP POLICY "Enable read access for all users" ON public.entitlements')) {
    throw new Error('p5_derivation_source_invalid:entitlements_policy_drop');
  }
  const policies: string[] = [];
  const P5_SERVICE_ROLE_GRANTED_PRIVILEGES = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
  const P5_SERVICE_ROLE_PRESERVED_PRIVILEGES = new Set(['REFERENCES', 'TRIGGER', 'TRUNCATE']);
  const privileges = p4.privileges.map((item) => {
    if (
      item.startsWith('priv.entitlements.') ||
      item.startsWith('priv.entitlement_rights.')
    ) {
      const [prefix] = item.split('|');
      const parts = prefix!.split('.');
      const relation = parts[1];
      const role = parts[2];
      const privilege = parts[3];
      if (relation === 'entitlements' || relation === 'entitlement_rights') {
        if (role === 'service_role') {
          if (P5_SERVICE_ROLE_GRANTED_PRIVILEGES.has(privilege!)) {
            return `${prefix}|1`;
          }
          if (P5_SERVICE_ROLE_PRESERVED_PRIVILEGES.has(privilege!)) {
            return item;
          }
        }
        return `${prefix}|0`;
      }
    }
    return item;
  });

  return finalizePhase({
    ...p4,
    phase: 'P5',
    history_prefix: [
      BASELINE_VERSION,
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
    ],
    ...phaseStateContracts('P5'),
    policies,
    privileges,
    expected_delta_from_previous: {
      migration_version: '20260615000004',
      source_sha256: CANONICAL_MIGRATIONS[3].sha256,
      entitlements_policy_removed: 'Enable read access for all users',
      entitlements_policies_count: 0,
      entitlement_rights_policies_count: 0,
      anon_authenticated_privileges_revoked: 'entitlements,entitlement_rights:7x4',
      service_role_core_grants: 'SELECT,INSERT,UPDATE,DELETE',
      service_role_bypassrls: true,
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'entitlements_policy_absent',
      'entitlement_rights_policy_absent',
      'entitlements_privileges_service_role_only',
      'entitlement_rights_privileges_service_role_only',
    ],
    runtime_required_assertions: [
      ...p4.runtime_required_assertions,
      'entitlements_public_acl_absent_runtime_check',
    ],
  });
}

function buildP6Phase(p5: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000005');
  if (!sql.includes('dtr_report_snapshots_one_visible_per_user_product_uq')) {
    throw new Error('p6_derivation_source_invalid:dtr_partial_unique');
  }
  const constraintsAbsent = [
    ...p5.constraints_absent,
    'public|dtr_report_snapshots|dtr_report_snapshots_user_product_key|u|UNIQUE (user_id, product_id)|true|false|false|||||user_id,product_id|',
  ].sort();
  const constraintsPresent = p5.constraints_present.filter(
    (item) => !item.includes('|dtr_report_snapshots_user_product_key|')
  );
  const indexesAbsent = [
    ...p5.indexes_absent,
    'public|dtr_report_snapshots|dtr_report_snapshots_user_product_key|CREATE UNIQUE INDEX dtr_report_snapshots_user_product_key ON public.dtr_report_snapshots USING btree (user_id, product_id)|true',
  ].sort();
  const indexesPresent = p5.indexes_present.filter(
    (item) => !item.includes('|dtr_report_snapshots_user_product_key|')
  );
  const partialIndex =
    'public|dtr_report_snapshots|dtr_report_snapshots_one_visible_per_user_product_uq|CREATE UNIQUE INDEX dtr_report_snapshots_one_visible_per_user_product_uq ON public.dtr_report_snapshots USING btree (user_id, product_id) WHERE (user_hidden_at IS NULL)|false';
  if (!indexesPresent.includes(partialIndex)) {
    indexesPresent.push(partialIndex);
  }
  indexesPresent.sort();

  return finalizePhase({
    ...p5,
    phase: 'P6',
    history_prefix: [
      BASELINE_VERSION,
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
      '20260615000005',
    ],
    ...phaseStateContracts('P6'),
    constraints_present: constraintsPresent,
    constraints_absent: constraintsAbsent,
    indexes_present: indexesPresent,
    indexes_absent: indexesAbsent,
    expected_delta_from_previous: {
      migration_version: '20260615000005',
      source_sha256: CANONICAL_MIGRATIONS[4].sha256,
      global_unique_absent: 'dtr_report_snapshots_user_product_key',
      partial_unique_present: 'dtr_report_snapshots_one_visible_per_user_product_uq',
      partial_predicate: '(user_hidden_at IS NULL)',
      acceptable_input_states: ['STATE_A_PRODUCTION', 'STATE_B_PREVIEW_REPLAY'],
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'dtr_global_unique_absent',
      'dtr_partial_unique_present',
      'dtr_partial_predicate_exact',
    ],
    runtime_required_assertions: p5.runtime_required_assertions,
  });
}

function buildP7Phase(p6: ExecutionOraclePhase, repoRoot: string): ExecutionOraclePhase {
  const sql = readCanonicalMigration(repoRoot, '20260615000006');
  if (!sql.includes('DROP INDEX public.entitlements_user_product_uq')) {
    throw new Error('p7_derivation_source_invalid:duplicate_index_drop');
  }
  const indexesAbsent = [
    ...p6.indexes_absent,
    'public|entitlements|entitlements_user_product_uq|CREATE UNIQUE INDEX entitlements_user_product_uq ON public.entitlements USING btree (user_id, product_id)|false',
    'public|entitlements|uq_entitlements_user_product|CREATE UNIQUE INDEX uq_entitlements_user_product ON public.entitlements USING btree (user_id, product_id)|false',
  ].sort();
  const indexesPresent = p6.indexes_present.filter(
    (item) =>
      !item.includes('|entitlements_user_product_uq|') &&
      !item.includes('|uq_entitlements_user_product|')
  );

  return finalizePhase({
    ...p6,
    phase: 'P7',
    history_prefix: [
      BASELINE_VERSION,
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
      '20260615000005',
      '20260615000006',
    ],
    ...phaseStateContracts('P7'),
    indexes_present: indexesPresent,
    indexes_absent: indexesAbsent,
    expected_delta_from_previous: {
      migration_version: '20260615000006',
      source_sha256: CANONICAL_MIGRATIONS[5].sha256,
      duplicate_indexes_removed: [
        'entitlements_user_product_uq',
        'uq_entitlements_user_product',
      ],
      canonical_constraint_retained: 'entitlements_user_id_product_id_key',
    },
    forbidden_delta: [],
    static_exact_assertions: [
      'entitlements_user_product_uq_absent',
      'uq_entitlements_user_product_absent',
      'entitlements_user_id_product_id_key_present',
    ],
    runtime_required_assertions: p6.runtime_required_assertions,
  });
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function complement(universe: string[], present: string[]): string[] {
  const presentSet = new Set(present);
  return universe.filter((item) => !presentSet.has(item));
}

function normalizeTrackedCatalogComplements(
  phases: ExecutionOraclePhase[]
): ExecutionOraclePhase[] {
  const relationUniverse = uniqueSorted(phases.flatMap((phase) => phase.relations_present));
  const columnUniverse = uniqueSorted(phases.flatMap((phase) => phase.columns_present));
  const constraintUniverse = uniqueSorted(phases.flatMap((phase) => phase.constraints_present));
  const indexUniverse = uniqueSorted(phases.flatMap((phase) => phase.indexes_present));
  const functionUniverse = uniqueSorted(phases.flatMap((phase) => phase.functions_present));

  return phases.map((phase) => {
    const {
      oracle_contract_hash: _oracleContractHash,
      runtime_snapshot_hash: _runtimeSnapshotHash,
      runtime_validation_status: _runtimeValidationStatus,
      ...draft
    } = phase;
    return finalizePhase({
      ...draft,
      relations_present: uniqueSorted(phase.relations_present),
      relations_absent: complement(relationUniverse, phase.relations_present),
      columns_present: uniqueSorted(phase.columns_present),
      columns_absent: complement(columnUniverse, phase.columns_present),
      constraints_present: uniqueSorted(phase.constraints_present),
      constraints_absent: complement(constraintUniverse, phase.constraints_present),
      indexes_present: uniqueSorted(phase.indexes_present),
      indexes_absent: complement(indexUniverse, phase.indexes_present),
      functions_present: uniqueSorted(phase.functions_present),
      functions_absent: complement(functionUniverse, phase.functions_present),
    });
  });
}

export type DeriveExecutionOracleResult = {
  oracleObject: Record<string, unknown>;
  oracleJson: string;
  oracleSha256: string;
};

export function deriveExecutionOracle(repoRoot: string): DeriveExecutionOracleResult {
  const { matrixSha256, manifestSha256, baselineSha256, matrix, manifest } =
    verifyRevision7ArtifactShas(repoRoot);
  const canonicalMigrationShas = verifyCanonicalMigrationSources(repoRoot);

  const p1 = extractP1PhaseFromMatrix(matrix);
  const p0 = buildP0Phase(p1);
  const p2 = buildP2Phase(p1, repoRoot);
  const p3 = buildP3Phase(p2, repoRoot);
  const p4 = buildP4Phase(p3, repoRoot);
  const p5 = buildP5Phase(p4, repoRoot);
  const p6 = buildP6Phase(p5, repoRoot);
  const p7 = buildP7Phase(p6, repoRoot);
  const phases = normalizeTrackedCatalogComplements([p0, p1, p2, p3, p4, p5, p6, p7]);

  const functions = matrix.functions as Record<string, unknown>[];
  const oracleObject: Record<string, unknown> = {
    schema_version: '1',
    oracle_revision: EXECUTION_ORACLE_REVISION,
    strategy: STRATEGY,
    generator_revision: GENERATOR_VERSION,
    source_matrix_sha256: matrixSha256,
    source_manifest_sha256: manifestSha256,
    source_baseline_sha256: baselineSha256,
    canonical_migration_shas: canonicalMigrationShas,
    derivation_method: 'static_matrix_plus_canonical_migration_semantic_delta',
    function_parity_contract: {
      algorithm: 'md5',
      comparison_source: 'pg_get_functiondef',
      length_authority: 'definition_character_length',
      octet_length_reference_only: true,
      functions: functions.map((fn) => ({
        function_identity: `${String(fn.schema_name)}.${String(fn.function_name)}`,
        production_definition_hash: String(fn.production_definition_hash ?? ''),
        production_definition_hash_algorithm: String(fn.production_definition_hash_algorithm ?? ''),
        definition_character_length: Number(fn.production_definition_length ?? 0),
        definition_octet_length_reference_only: true,
        production_body_parity_status: String(fn.production_body_parity_status ?? ''),
        classification: 'RUNTIME_REQUIRED' as AssertionClassification,
      })),
    },
    fixture_metadata_contract: {
      schema: FIXTURE_META_SCHEMA,
      relation: FIXTURE_META_RELATION,
      not_in_public_schema: true,
      application_catalog_relation_count_at_p1: 15,
      fields: [
        'fixture_revision',
        'manifest_sha256',
        'migration_tuple_hash',
        'database_name',
        'creation_nonce',
        'created_at',
        'local_only_assertion',
      ],
      classification: 'RUNTIME_REQUIRED' as AssertionClassification,
    },
    connection_contract: {
      allowed_hosts: ['localhost', '127.0.0.1', '::1'],
      unix_socket_allowed: true,
      tcp_loopback_allowed: true,
      server_addr_acceptance: {
        unix_socket: null,
        tcp_loopback: ['127.0.0.1', '::1'],
      },
      client_addr_loopback_required_for_tcp: true,
      credentials_in_logged_url_forbidden: true,
      ephemeral_password_env_allowed: ['PGPASSWORD'],
      inherited_production_preview_env_forbidden: true,
    },
    phases,
    failure_contract: {
      stop_reasons: [...FAILURE_CONTRACT_STOP_REASONS],
      history_advance_on_failure: false,
      automatic_retry_forbidden: true,
      destroy_target_on_apply_failure: true,
    },
    pending_runtime_validations: [
      'function_production_body_parity',
      'gen_random_uuid_callable',
      'disposable_p1_p7_apply',
    ],
    generation_metadata: {
      tool: 'previewBaselineTool',
      tool_version: GENERATOR_VERSION,
      manifest_revision: String(manifest.manifest_revision ?? MANIFEST_REVISION),
      matrix_revision: String(manifest.matrix_revision ?? MATRIX_REVISION),
    },
  };

  const oracleJson = `${stableStringify(oracleObject)}\n`;
  return {
    oracleObject,
    oracleJson,
    oracleSha256: sha256Hex(oracleJson),
  };
}

export type BuildExecutionOracleResult = {
  oraclePath: string;
  oracleSha256: string;
};

export function buildExecutionOracle(repoRoot: string): BuildExecutionOracleResult {
  const derived = deriveExecutionOracle(repoRoot);
  const oraclePath = resolveRepoPath(repoRoot, PATHS.executionOracle);
  ensureParentDir(oraclePath);
  writeFileSync(oraclePath, derived.oracleJson, 'utf8');
  const written = readFileSync(oraclePath, 'utf8');
  if (written !== derived.oracleJson) {
    throw new Error('execution_oracle_write_mismatch');
  }
  return { oraclePath, oracleSha256: derived.oracleSha256 };
}

export function verifyExecutionOracle(repoRoot: string): void {
  const oraclePath = resolveRepoPath(repoRoot, PATHS.executionOracle);
  if (!existsSync(oraclePath)) {
    throw new Error(`verify_execution_oracle_missing:${oraclePath}`);
  }
  const onDisk = readFileSync(oraclePath, 'utf8');
  const derived = deriveExecutionOracle(repoRoot);
  if (onDisk !== derived.oracleJson) {
    throw new Error('execution_oracle_byte_mismatch');
  }
}


// ── Disposable fixture harness (Revision-2: static plan only) ───────────────

export const HARNESS_REVISION = 'PREVIEW-BASELINE-DISPOSABLE-FIXTURE-v1-REVISION-7' as const;
export const EXECUTE_LOCAL_DISABLED_ERROR = 'local_execution_not_authorized_in_revision_7' as const;
export const PSQL_EXECUTABLE = 'psql' as const;

export type FixturePhaseId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type FixturePhasePlan = {
  phase: FixturePhaseId;
  state_from: string;
  state_to: string;
  migration_version: string;
  migration_filename: string;
  migration_relative_path: string;
  migration_absolute_path: string;
  sequence: number;
};

export const FUTURE_EXECUTION_REQUIREMENTS = [
  'dedicated_disposable_database_identity',
  'exact_allowed_database_name',
  'tool_owned_db_marker',
  'localhost_and_marker_both_required',
  'no_credentials_in_logs',
  'roles_exist_postgres_anon_authenticated_service_role',
  'gen_random_uuid_callable',
  'clean_p0_catalog',
  'migration_history_absent_or_empty',
  'exact_workspace_manifest',
  'sequential_p1_p7_apply',
  'per_state_catalog_snapshot',
  'per_state_expected_delta',
  'zero_application_rows',
  'migration_history_prefix_verification',
  'failure_injection_at_each_boundary',
  'disconnected_runtime',
  'final_differential',
  'deterministic_db_cleanup',
  'no_remote_host',
  'no_supabase_project_ref',
] as const;

export type FixturePlan = {
  harness_revision: string;
  strategy: string;
  mode: 'dry-run' | 'plan' | 'verify-local-target' | 'execute-local';
  workspace_root: string;
  workspace_materialized: boolean;
  migration_count: number;
  phases: FixturePhasePlan[];
  database_target_assessed: boolean;
  database_target_allowed: boolean | null;
  database_target_reason: string | null;
  target_assessment_allowed: boolean | null;
  execution_authorized: false;
  would_execute_db: false;
  spawn_commands: [];
  future_execution_requirements: readonly string[];
};

export type RemoteGuardVerdict = {
  allowed: boolean;
  reason: string;
  host: string | null;
};

export type ParsedFixtureFlags = {
  dryRun: boolean;
  plan: boolean;
  verifyLocalTarget: boolean;
  executeLocal: boolean;
  databaseUrl: string | undefined;
  workspaceRoot: string | undefined;
  repoRoot: string | undefined;
};

const LOCAL_HOST_ALLOWLIST = new Set(['localhost', '127.0.0.1', '::1']);

const REMOTE_HOST_PATTERNS: RegExp[] = [
  /\.supabase\.co$/i,
  /^db\.[a-z0-9-]+\.supabase\.co$/i,
  /pooler/i,
];

const CREDENTIAL_URL_PATTERN = /postgres(ql)?:\/\/[^/\s:@]+:[^@\s/]+@/i;
const SERVICE_ROLE_KEY_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/;

export function parseFixtureFlags(argv: string[]): ParsedFixtureFlags {
  const hasExecute = argv.includes('--execute-local');
  const hasVerify = argv.includes('--verify-local-target');
  const hasPlan = argv.includes('--plan');
  const dryRunExplicit = argv.includes('--dry-run');

  return {
    dryRun: !hasExecute && (dryRunExplicit || !hasVerify),
    plan: hasPlan,
    verifyLocalTarget: hasVerify,
    executeLocal: hasExecute,
    databaseUrl: readFixtureFlagValue(argv, '--database-url'),
    workspaceRoot: readFixtureFlagValue(argv, '--workspace-root'),
    repoRoot: readFixtureFlagValue(argv, '--repo-root'),
  };
}

function readFixtureFlagValue(argv: string[], flag: string): string | undefined {
  const eqPrefix = `${flag}=`;
  for (const arg of argv) {
    if (arg.startsWith(eqPrefix)) return arg.slice(eqPrefix.length);
  }
  const index = argv.indexOf(flag);
  if (index >= 0 && index + 1 < argv.length) return argv[index + 1];
  return undefined;
}

export function extractHostFromDatabaseTarget(databaseUrl: string): string | null {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function normalizeDatabaseHost(host: string | null): string | null {
  if (!host) return null;
  return host.replace(/^\[(.*)\]$/, '$1');
}

export function assessRemoteDatabaseTarget(databaseUrl: string): RemoteGuardVerdict {
  if (!databaseUrl.trim()) {
    return { allowed: false, reason: 'empty_database_target', host: null };
  }
  if (CREDENTIAL_URL_PATTERN.test(databaseUrl)) {
    return {
      allowed: false,
      reason: 'credentialed_database_url_forbidden',
      host: normalizeDatabaseHost(extractHostFromDatabaseTarget(databaseUrl)),
    };
  }
  if (SERVICE_ROLE_KEY_PATTERN.test(databaseUrl)) {
    return { allowed: false, reason: 'service_role_jwt_forbidden', host: null };
  }
  const host = normalizeDatabaseHost(extractHostFromDatabaseTarget(databaseUrl));
  if (!host) {
    return { allowed: false, reason: 'malformed_database_url', host: null };
  }
  for (const pattern of REMOTE_HOST_PATTERNS) {
    if (pattern.test(host) || pattern.test(databaseUrl)) {
      return { allowed: false, reason: 'remote_host_pattern', host };
    }
  }
  if (!LOCAL_HOST_ALLOWLIST.has(host)) {
    return { allowed: false, reason: 'host_not_in_local_allowlist', host };
  }
  return { allowed: true, reason: 'local_host_allowed_for_assessment_only', host };
}

export function buildPsqlSpawnArgs(databaseUrl: string, migrationPath: string): string[] {
  return [PSQL_EXECUTABLE, databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', migrationPath];
}

export function buildFixturePhases(workspaceRoot: string): FixturePhasePlan[] {
  const phases: FixturePhasePlan[] = [
    {
      phase: 'P1',
      state_from: 'P0',
      state_to: 'P1',
      migration_version: BASELINE_VERSION,
      migration_filename: BASELINE_FILENAME,
      migration_relative_path: PATHS.baselineSql,
      migration_absolute_path: join(workspaceRoot, 'migrations', BASELINE_FILENAME),
      sequence: 1,
    },
  ];
  CANONICAL_MIGRATIONS.forEach((migration, index) => {
    const phaseId = `P${index + 2}` as FixturePhaseId;
    phases.push({
      phase: phaseId,
      state_from: `P${index + 1}`,
      state_to: phaseId,
      migration_version: migration.version,
      migration_filename: migration.filename,
      migration_relative_path: migration.sourcePath,
      migration_absolute_path: join(workspaceRoot, 'migrations', migration.filename),
      sequence: index + 2,
    });
  });
  return phases;
}

export function computeProjectedWorkspaceRoot(repoRoot: string): string {
  const manifestPath = resolveRepoPath(repoRoot, PATHS.manifest);
  if (!existsSync(manifestPath)) {
    throw new Error('projected_workspace_requires_manifest');
  }
  const manifestSha256 = sha256Hex(readFileSync(manifestPath, 'utf8'));
  return defaultWorkspaceRoot(repoRoot, manifestSha256);
}

export function buildFixturePlan(
  repoRoot: string,
  options: {
    mode: FixturePlan['mode'];
    workspaceRoot?: string;
    databaseUrl?: string;
  }
): FixturePlan {
  let workspace: string;
  let workspaceMaterialized: boolean;

  if (options.workspaceRoot) {
    verifyWorkspace(repoRoot, options.workspaceRoot);
    workspace = options.workspaceRoot;
    workspaceMaterialized = true;
  } else {
    workspace = computeProjectedWorkspaceRoot(repoRoot);
    workspaceMaterialized = false;
  }

  const phases = buildFixturePhases(workspace);
  let database_target_assessed = false;
  let database_target_allowed: boolean | null = null;
  let database_target_reason: string | null = null;
  let target_assessment_allowed: boolean | null = null;

  if (options.databaseUrl) {
    database_target_assessed = true;
    const verdict = assessRemoteDatabaseTarget(options.databaseUrl);
    database_target_allowed = verdict.allowed;
    database_target_reason = verdict.reason;
    target_assessment_allowed = verdict.allowed;
  }

  return {
    harness_revision: HARNESS_REVISION,
    strategy: STRATEGY,
    mode: options.mode,
    workspace_root: workspace,
    workspace_materialized: workspaceMaterialized,
    migration_count: phases.length,
    phases,
    database_target_assessed,
    database_target_allowed,
    database_target_reason,
    target_assessment_allowed,
    execution_authorized: false,
    would_execute_db: false,
    spawn_commands: [],
    future_execution_requirements: FUTURE_EXECUTION_REQUIREMENTS,
  };
}

export type SpawnOutcome = {
  command: string[];
  status: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
};

export function spawnCommand(command: string[], input?: string): SpawnOutcome {
  const result = spawnSync(command[0], command.slice(1), {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    command,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? result.error.message : null,
  };
}

export function executeLocalFixture(
  _repoRoot: string,
  _databaseUrl: string,
  _workspaceRoot?: string
): never {
  throw new Error(EXECUTE_LOCAL_DISABLED_ERROR);
}

export function runDisposableFixtureHarness(
  repoRoot: string,
  flags: ParsedFixtureFlags
): { exitCode: number; payload: Record<string, unknown> } {
  if (flags.executeLocal) {
    return {
      exitCode: 1,
      payload: { ok: false, error: EXECUTE_LOCAL_DISABLED_ERROR },
    };
  }

  if (flags.verifyLocalTarget && !flags.databaseUrl) {
    return {
      exitCode: 1,
      payload: { ok: false, error: 'verify-local-target_requires_database_url' },
    };
  }

  if (flags.databaseUrl) {
    const verdict = assessRemoteDatabaseTarget(flags.databaseUrl);
    if (!verdict.allowed) {
      return {
        exitCode: 1,
        payload: {
          ok: false,
          error: 'remote_database_target_rejected',
          reason: verdict.reason,
          host: verdict.host,
        },
      };
    }
  }

  const mode: FixturePlan['mode'] = flags.verifyLocalTarget
    ? 'verify-local-target'
    : flags.plan
      ? 'plan'
      : 'dry-run';

  const plan = buildFixturePlan(repoRoot, {
    mode,
    workspaceRoot: flags.workspaceRoot,
    databaseUrl: flags.databaseUrl,
  });

  const marker =
    plan.workspace_materialized && existsSync(join(plan.workspace_root, WORKSPACE_MARKER_FILENAME))
      ? (JSON.parse(
          readFileSync(join(plan.workspace_root, WORKSPACE_MARKER_FILENAME), 'utf8')
        ) as Record<string, unknown>)
      : null;

  return {
    exitCode: 0,
    payload: {
      ok: true,
      mode,
      workspace_materialized: plan.workspace_materialized,
      would_execute_db: false,
      execution_authorized: false,
      spawn_commands: [],
      dry_run: mode === 'dry-run',
      plan,
      workspace_marker: marker,
      database_target_verified: flags.verifyLocalTarget ? true : undefined,
    },
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function repoRootFromModule(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', '..');
}

function printUsage(): void {
  console.log(`Usage: previewBaselineTool.ts <command>

Commands:
  build-artifacts     Parse evidence, generate matrix/baseline/manifest
  verify-artifacts    Re-derive artifacts and compare on-disk outputs
  build-execution-oracle  Generate P0-P7 static execution oracle JSON
  verify-execution-oracle Re-derive oracle and compare on-disk bytes
  build-workspace     Copy migration chain into disposable workspace
  verify-workspace    Verify workspace file set and hashes
  clean-workspace     Remove tool-owned workspace directory
`);
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const repoRoot = repoRootFromModule();
  const workspaceArg = readFlag(rest, '--workspace-root');

  try {
    switch (command) {
      case 'build-artifacts': {
        const result = buildArtifacts(repoRoot);
        console.log(
          stableStringify({
            ok: true,
            command,
            evidence_bundle_sha256: result.evidenceBundleSha256,
            matrix_sha256: result.matrixSha256,
            baseline_sha256: result.baselineSha256,
            manifest_sha256: result.manifestSha256,
          }).trimEnd()
        );
        return 0;
      }
      case 'verify-artifacts': {
        verifyArtifacts(repoRoot);
        console.log(stableStringify({ ok: true, command }).trimEnd());
        return 0;
      }
      case 'build-execution-oracle': {
        const result = buildExecutionOracle(repoRoot);
        console.log(
          stableStringify({
            ok: true,
            command,
            oracle_sha256: result.oracleSha256,
            oracle_path: PATHS.executionOracle,
          }).trimEnd()
        );
        return 0;
      }
      case 'verify-execution-oracle': {
        verifyExecutionOracle(repoRoot);
        console.log(stableStringify({ ok: true, command }).trimEnd());
        return 0;
      }
      case 'build-workspace': {
        const result = buildWorkspace(repoRoot, workspaceArg);
        console.log(
          stableStringify({
            ok: true,
            command,
            workspace_root: result.workspaceRoot,
            marker_path: result.markerPath,
            manifest_sha256: result.manifestSha256,
          }).trimEnd()
        );
        return 0;
      }
      case 'verify-workspace': {
        verifyWorkspace(repoRoot, workspaceArg);
        console.log(stableStringify({ ok: true, command }).trimEnd());
        return 0;
      }
      case 'clean-workspace': {
        cleanWorkspace(repoRoot, workspaceArg);
        console.log(stableStringify({ ok: true, command }).trimEnd());
        return 0;
      }
      default:
        printUsage();
        return command ? 1 : 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(stableStringify({ ok: false, command, error: message }).trimEnd());
    if (/pglast/i.test(message)) return 2;
    return 1;
  }
}

function readFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  return argv[index + 1];
}

const modulePath = fileURLToPath(import.meta.url);

const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

function ensureStripTypesAndRun(): void {
  const hasStripTypes = process.execArgv.some((arg) => arg.includes('experimental-strip-types'));
  if (!hasStripTypes) {
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', modulePath, ...process.argv.slice(2)],
      { stdio: 'inherit' }
    );
    process.exit(result.status === null ? 1 : result.status);
  }
  process.exitCode = main(process.argv.slice(2));
}

if (executedDirectly) {
  ensureStripTypesAndRun();
}
