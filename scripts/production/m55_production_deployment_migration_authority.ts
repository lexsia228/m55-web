/**
 * M55 Production deployment + migration authority (LOCAL validation only).
 * No network, DB, deploy, or credential access.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AUTHORITY_SCHEMA_VERSION =
  'm55_production_deployment_migration_authority_v1' as const;

export const PRODUCTION_VERCEL_PROJECT = 'm55-official/m55-webv2' as const;
export const PRODUCTION_VERCEL_ENVIRONMENT = 'Production' as const;
export const PRODUCTION_SUPABASE_ORG = 'm55-soul' as const;
export const PRODUCTION_SUPABASE_PROJECT = 'm55-soul-core' as const;
export const PRODUCTION_SUPABASE_BRANCH = 'main' as const;
export const PRODUCTION_SUPABASE_ENVIRONMENT = 'PRODUCTION' as const;
export const PRODUCTION_SUPABASE_SOURCE = 'Primary Database' as const;
export const PRODUCTION_SUPABASE_ROLE = 'postgres' as const;
export const PRODUCTION_DATABASE_NAME = 'postgres' as const;

export const CLERK_IDENTITY_UNKNOWN = 'UNKNOWN' as const;

export const APPROVED_CONNECTION_MECHANISMS = [
  'SECURE_STDIN_CONNECTION_CONFIG_v1',
  'TEMP_PGPASSFILE_0600_v1',
] as const;

export const BASELINE_RELATIONS = [
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

export const CHAIN_OBJECTS = [
  'clerk_webhook_events',
  'm55_account_deletion_process_v1',
  'entitlements_user_id_key_unique',
  'dtr_report_snapshots_visible_unique',
] as const;

export const PRODUCTION_ENV_KEY_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SIGNING_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
  'STRIPE_PRICE_DTR_CORE_FULL_V1',
  'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1',
] as const;

export const DEPLOYMENT_OUTCOME_CLASSES = [
  'DEPLOYMENT_READY_EXACT',
  'DEPLOYMENT_NOT_FOUND',
  'DEPLOYMENT_BUILDING',
  'DEPLOYMENT_FAILED',
  'DEPLOYMENT_COMMIT_MISMATCH',
  'DEPLOYMENT_BINDING_MISMATCH',
  'DEPLOYMENT_ALIAS_MISMATCH',
  'DEPLOYMENT_ACK_AMBIGUOUS',
] as const;

export type DeploymentOutcomeClass = (typeof DEPLOYMENT_OUTCOME_CLASSES)[number];

export const PREFLIGHT_CLASSIFICATIONS = [
  'GREENFIELD_READY',
  'ALREADY_APPLIED',
  'PARTIAL_STATE_RECONCILIATION_REQUIRED',
  'HISTORY_ONLY_DRIFT',
  'SCHEMA_ONLY_DRIFT',
  'HOLD_UNKNOWN',
] as const;

export const PER_VERSION_STATUSES = [
  'APPLIED_EXACT',
  'REQUIRED_APPLY',
  'BLOCKED_BY_PREDECESSOR',
  'HISTORY_SCHEMA_CONFLICT',
  'OBJECT_STATE_PARTIAL',
  'UNKNOWN',
] as const;

export type PerVersionStatus = (typeof PER_VERSION_STATUSES)[number];

export const COMPATIBILITY_CLASSIFICATIONS = [
  'BOTH_CROSS_COMPATIBLE',
  'MIGRATE_THEN_DEPLOY_REQUIRED',
  'DEPLOY_THEN_MIGRATE_ALLOWED',
  'STAGED_PROTECTED_CUTOVER_REQUIRED',
  'HOLD_COMPATIBILITY_UNPROVEN',
] as const;

export type CompatibilityClassification = (typeof COMPATIBILITY_CLASSIFICATIONS)[number];

export const ROLLOUT_ORDERS = [
  'MIGRATE_THEN_DEPLOY',
  'DEPLOY_THEN_MIGRATE',
  'STAGED_PROTECTED_CUTOVER',
  'NONE',
] as const;

export type RolloutOrder = (typeof ROLLOUT_ORDERS)[number];

export const COMMON_PREFIX_STEPS = [
  'C0',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'C8',
] as const;

export type PerVersionPlanEntry = {
  ordinal: MigrationRegistryEntry['ordinal'];
  version: string;
  status: PerVersionStatus;
};

export type PreflightApplyPlan = {
  preflight_identity: string;
  preflight_classification: (typeof PREFLIGHT_CLASSIFICATIONS)[number];
  per_version_plan: readonly PerVersionPlanEntry[];
  required_apply_versions: readonly string[];
  already_applied_versions: readonly string[];
  blocked_versions: readonly string[];
  conflicting_versions: readonly string[];
  unknown_versions: readonly string[];
  dependency_order_valid: boolean;
  apply_set_exact: boolean;
  unconditional_apply_forbidden: true;
  apply_required: boolean;
  stop_required: boolean;
};

export type CompatibilityMatrixInput = {
  old_app_new_schema: boolean | 'UNKNOWN';
  new_app_old_schema: boolean | 'UNKNOWN';
};

export type CompatibilityMatrixResult = {
  classification: CompatibilityClassification;
  selected_order: RolloutOrder;
  old_app_new_schema: boolean | 'UNKNOWN';
  new_app_old_schema: boolean | 'UNKNOWN';
};

export const POSTCHECK_CLASSIFICATIONS = [
  'PRODUCTION_CHAIN_GREEN',
  'PRODUCTION_CHAIN_HOLD_HISTORY_DRIFT',
  'PRODUCTION_CHAIN_HOLD_OBJECT_MISMATCH',
  'PRODUCTION_CHAIN_HOLD_PRIVILEGE_MISMATCH',
  'PRODUCTION_CHAIN_HOLD_PURCHASE_CONTRACT',
  'PRODUCTION_CHAIN_HOLD_DELETION_CONTRACT',
  'PRODUCTION_CHAIN_HOLD_SCHEMA_CACHE',
  'PRODUCTION_CHAIN_UNKNOWN',
] as const;

export const DEPLOYMENT_STEPS = [
  'D0',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'D8',
  'D9',
  'D10',
  'D11',
  'D12',
] as const;

export const MIGRATION_APPLY_STEPS = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
  'M11',
  'M12',
  'M13',
  'M14',
  'M15',
  'M16',
] as const;

export const COMMIT_ACK_CLASSES = [
  'DEFINITIVE_COMMIT_ACK',
  'DEFINITIVE_ROLLBACK',
  'TRANSPORT_FAILED_BEFORE_BEGIN',
  'TRANSPORT_FAILED_BEFORE_COMMIT',
  'TRANSPORT_FAILED_AFTER_COMMIT_SEND',
  'COMMIT_ACK_AMBIGUOUS',
  'UNKNOWN',
] as const;

export type MigrationRegistryEntry = {
  ordinal: `P${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
  version: string;
  path: string;
  sha256: string;
  bytes: number;
  line_count: number;
  statement_count: number;
  predecessor: string | null;
  history_version: string;
  object_classes: readonly string[];
  immutable: true;
};

export const MIGRATION_REGISTRY_PATHS: readonly {
  ordinal: MigrationRegistryEntry['ordinal'];
  version: string;
  path: string;
  predecessor: string | null;
  object_classes: readonly string[];
}[] = [
  {
    ordinal: 'P1',
    version: '20260614000000',
    path: 'docs/planning/preview-baseline/migrations/20260614000000_preview_production_aligned_baseline_p1.sql',
    predecessor: null,
    object_classes: ['baseline_relations', 'baseline_indexes', 'baseline_constraints'],
  },
  {
    ordinal: 'P2',
    version: '20260615000001',
    path: 'supabase/migrations/20260615000001_failed_fulfillments_user_ref_hash.sql',
    predecessor: '20260614000000',
    object_classes: ['column', 'index', 'check_constraint'],
  },
  {
    ordinal: 'P3',
    version: '20260615000002',
    path: 'supabase/migrations/20260615000002_m55_account_deletion_ledger_v1.sql',
    predecessor: '20260615000001',
    object_classes: ['table', 'index', 'check_constraint'],
  },
  {
    ordinal: 'P4',
    version: '20260615000003',
    path: 'supabase/migrations/20260615000003_m55_account_deletion_process_rpc_v1.sql',
    predecessor: '20260615000002',
    object_classes: ['function', 'privilege'],
  },
  {
    ordinal: 'P5',
    version: '20260615000004',
    path: 'supabase/migrations/20260615000004_m55_entitlements_and_rights_access_security_v1.sql',
    predecessor: '20260615000003',
    object_classes: ['policy', 'privilege', 'rls'],
  },
  {
    ordinal: 'P6',
    version: '20260615000005',
    path: 'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql',
    predecessor: '20260615000004',
    object_classes: ['index', 'function', 'trigger'],
  },
  {
    ordinal: 'P7',
    version: '20260615000006',
    path: 'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql',
    predecessor: '20260615000005',
    object_classes: ['index', 'constraint'],
  },
];

export const CANONICAL_VERSIONS = MIGRATION_REGISTRY_PATHS.map((e) => e.version);

export type ProductionDeploymentMigrationAuthority = {
  schema_version: typeof AUTHORITY_SCHEMA_VERSION;
  gate_title: string;
  approved_main_commit: string;
  approved_main_parent_1: string;
  approved_main_parent_2: string;
  approved_feature_head: string;
  approved_origin_main_before_merge: string;
  final_rc_gate: string;
  final_rc_verdict: string;
  final_rc_evidence_identity: string;
  preview_deletion_smoke_gate: string;
  preview_deletion_smoke_verdict: string;
  preview_deletion_smoke_evidence_identity: string;
  production_vercel_project: typeof PRODUCTION_VERCEL_PROJECT;
  production_vercel_environment: typeof PRODUCTION_VERCEL_ENVIRONMENT;
  production_supabase_org: typeof PRODUCTION_SUPABASE_ORG;
  production_supabase_project: typeof PRODUCTION_SUPABASE_PROJECT;
  production_supabase_branch: typeof PRODUCTION_SUPABASE_BRANCH;
  production_supabase_environment: typeof PRODUCTION_SUPABASE_ENVIRONMENT;
  production_supabase_source: typeof PRODUCTION_SUPABASE_SOURCE;
  production_supabase_role: typeof PRODUCTION_SUPABASE_ROLE;
  production_database_name: typeof PRODUCTION_DATABASE_NAME;
  production_clerk_instance_identity: string;
  approved_deployment_identity: string;
  approved_deployment_commit: string;
  approved_migration_registry: readonly MigrationRegistryEntry[];
  approved_connection_mechanism: (typeof APPROVED_CONNECTION_MECHANISMS)[number];
  ca_pin_identity_or_exact_human_match_marker: string;
  human_approval_phrase_hash: string;
  issued_at: string;
  expires_at: string;
  single_use: true;
  execution_nonce_hash: string;
  consumed: boolean;
  dns_blocker_resolved: boolean;
  approved_preflight_identity: string;
  approved_preflight_classification: (typeof PREFLIGHT_CLASSIFICATIONS)[number];
  approved_required_apply_versions: readonly string[];
  approved_already_applied_versions: readonly string[];
  approved_blocked_versions: readonly string[];
  approved_per_version_plan: readonly PerVersionPlanEntry[];
  compatibility_classification: CompatibilityClassification;
  selected_rollout_order: RolloutOrder;
  old_app_new_schema_compatible: boolean;
  new_app_old_schema_compatible: boolean;
  current_production_deployment_commit: string;
  current_schema_identity: string;
  candidate_main_commit: string;
  unconditional_apply_all?: false;
};

export type AuthorityValidationResult = {
  schema_version: typeof AUTHORITY_SCHEMA_VERSION;
  ready: boolean;
  failed_flags: string[];
  unknown_flags: string[];
  next_gate: string;
};

export type DeploymentDiscoveryInput = {
  vercel_project: string;
  vercel_environment: string;
  branch: string;
  commit_sha: string;
  alias_points_to_deployment: boolean;
  build_status: 'READY' | 'BUILDING' | 'FAILED' | 'UNKNOWN';
  preview_binding_detected: boolean;
  ack_class: 'DEFINITIVE' | 'AMBIGUOUS';
};

export type RollbackStopRow = {
  row_id: number;
  phase: string;
  first_predicate: string;
  immediate_stop: true;
  read_only_classification: string;
  retry_allowed: false;
  recovery: 'forward_fix' | 'revert' | 'abort_unpublished' | 'read_only_classify';
  human_approval_required: boolean;
  release_state: string;
  next_gate: string;
};

export const ROLLBACK_STOP_MATRIX: readonly RollbackStopRow[] = [
  {
    row_id: 1,
    phase: 'main_push',
    first_predicate: 'HOLD_MAIN_PUSH_ACK_AMBIGUOUS',
    immediate_stop: true,
    read_only_classification: 'remote_main_sha_inspection_only',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-MAIN-INTEGRATION-RECOVERY',
  },
  {
    row_id: 2,
    phase: 'deployment',
    first_predicate: 'DEPLOYMENT_NOT_FOUND',
    immediate_stop: true,
    read_only_classification: 'deployment_discovery_read_only',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-VERIFICATION',
  },
  {
    row_id: 3,
    phase: 'deployment',
    first_predicate: 'DEPLOYMENT_BUILDING',
    immediate_stop: true,
    read_only_classification: 'wait_bound_exceeded_stop',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: false,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-VERIFICATION',
  },
  {
    row_id: 4,
    phase: 'deployment',
    first_predicate: 'DEPLOYMENT_FAILED',
    immediate_stop: true,
    read_only_classification: 'build_log_read_only',
    retry_allowed: false,
    recovery: 'forward_fix',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-DEPLOY-FORWARD-FIX',
  },
  {
    row_id: 5,
    phase: 'deployment',
    first_predicate: 'DEPLOYMENT_COMMIT_MISMATCH',
    immediate_stop: true,
    read_only_classification: 'deployment_identity_mismatch',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-VERIFICATION',
  },
  {
    row_id: 6,
    phase: 'deployment',
    first_predicate: 'DEPLOYMENT_BINDING_MISMATCH',
    immediate_stop: true,
    read_only_classification: 'binding_exact_match_required',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-VERIFICATION',
  },
  {
    row_id: 7,
    phase: 'preflight',
    first_predicate: 'HOLD_PREFLIGHT_MISMATCH',
    immediate_stop: true,
    read_only_classification: 'preflight_classification_only',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-PREFLIGHT-REVIEW',
  },
  {
    row_id: 8,
    phase: 'migration_apply',
    first_predicate: 'TRANSPORT_FAILED_BEFORE_BEGIN',
    immediate_stop: true,
    read_only_classification: 'connection_identity_reconfirm',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 9,
    phase: 'migration_apply',
    first_predicate: 'SQL_FAILURE_BEFORE_COMMIT',
    immediate_stop: true,
    read_only_classification: 'definitive_rollback_expected',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 10,
    phase: 'migration_apply',
    first_predicate: 'TRANSPORT_FAILED_AFTER_COMMIT_SEND',
    immediate_stop: true,
    read_only_classification: 'fresh_read_only_postcheck_required',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 11,
    phase: 'migration_apply',
    first_predicate: 'DEFINITIVE_ROLLBACK',
    immediate_stop: true,
    read_only_classification: 'version_not_applied',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 12,
    phase: 'postcheck',
    first_predicate: 'HISTORY_SCHEMA_DISAGREEMENT',
    immediate_stop: true,
    read_only_classification: 'history_schema_drift',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 13,
    phase: 'postcheck',
    first_predicate: 'PRODUCTION_CHAIN_HOLD_OBJECT_MISMATCH',
    immediate_stop: true,
    read_only_classification: 'object_registry_mismatch',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 14,
    phase: 'postcheck',
    first_predicate: 'PRODUCTION_CHAIN_HOLD_SCHEMA_CACHE',
    immediate_stop: true,
    read_only_classification: 'schema_cache_not_ready',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-RECOVERY',
  },
  {
    row_id: 15,
    phase: 'runtime',
    first_predicate: 'UNEXPECTED_LIVE_TRAFFIC_INCIDENT',
    immediate_stop: true,
    read_only_classification: 'incident_read_only_triage',
    retry_allowed: false,
    recovery: 'forward_fix',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-INCIDENT-RECOVERY',
  },
  {
    row_id: 16,
    phase: 'compatibility',
    first_predicate: 'HOLD_COMPATIBILITY_UNPROVEN',
    immediate_stop: true,
    read_only_classification: 'compatibility_matrix_read_only',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-COMPATIBILITY-AUDIT-REVIEW',
  },
  {
    row_id: 17,
    phase: 'preflight',
    first_predicate: 'HOLD_REQUIRED_APPLY_SET_AMBIGUOUS',
    immediate_stop: true,
    read_only_classification: 'apply_set_exact_required',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-PREFLIGHT-REVIEW',
  },
  {
    row_id: 18,
    phase: 'migration_apply',
    first_predicate: 'HOLD_APPLY_SET_CHANGED_AFTER_APPROVAL',
    immediate_stop: true,
    read_only_classification: 'fresh_preflight_required',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-PREFLIGHT-REVIEW',
  },
  {
    row_id: 19,
    phase: 'migration_apply',
    first_predicate: 'HOLD_UNAPPROVED_VERSION_REQUESTED',
    immediate_stop: true,
    read_only_classification: 'approved_apply_set_only',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-MIGRATION-APPLY-AUTHORITY-REVIEW',
  },
  {
    row_id: 20,
    phase: 'deployment',
    first_predicate: 'HOLD_DEPLOY_BEFORE_COMPATIBILITY_AUDIT',
    immediate_stop: true,
    read_only_classification: 'compatibility_audit_required_before_deploy',
    retry_allowed: false,
    recovery: 'read_only_classify',
    human_approval_required: true,
    release_state: 'BLOCKED',
    next_gate: 'CATEGORY-1-M55-PRODUCTION-COMPATIBILITY-AUDIT-REVIEW',
  },
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  /sk_live_/,
  /sk_test_/,
  /whsec_/,
  /Bearer\s+/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /postgres(?:ql)?:\/\//i,
  /service_role_[A-Za-z0-9]+/,
];

const PLACEHOLDER_MAIN_COMMITS = new Set([
  'APPROVED_MAIN_COMMIT_SHA',
  'PLACEHOLDER_MAIN_SHA',
  'TBD',
]);

export function hashApprovalPhrase(phrase: string): string {
  return createHash('sha256').update(phrase, 'utf8').digest('hex');
}

export function assertSecretSafeOutput(value: string): void {
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error('SECRET_OR_PII_OUTPUT_FORBIDDEN');
    }
  }
}

export function countExecutableStatements(sql: string): number {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
  const matches = stripped.match(/;(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/g);
  return matches ? matches.length : 0;
}

export function buildMigrationRegistryFromFiles(root = process.cwd()): MigrationRegistryEntry[] {
  return MIGRATION_REGISTRY_PATHS.map((entry) => {
    const abs = join(root, entry.path);
    const content = readFileSync(abs, 'utf8');
    const sha256 = createHash('sha256').update(content, 'utf8').digest('hex');
    const bytes = Buffer.byteLength(content, 'utf8');
    const line_count = content.split('\n').length;
    return {
      ordinal: entry.ordinal,
      version: entry.version,
      path: entry.path,
      sha256,
      bytes,
      line_count,
      statement_count: countExecutableStatements(content),
      predecessor: entry.predecessor,
      history_version: entry.version,
      object_classes: entry.object_classes,
      immutable: true as const,
    };
  });
}

export function computeRegistrySha256(registry: readonly MigrationRegistryEntry[]): string {
  const canonical = registry.map((r) => ({
    ordinal: r.ordinal,
    version: r.version,
    path: r.path,
    sha256: r.sha256,
    bytes: r.bytes,
    line_count: r.line_count,
    statement_count: r.statement_count,
    predecessor: r.predecessor,
    history_version: r.history_version,
    object_classes: r.object_classes,
  }));
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

export function validateMigrationRegistry(
  registry: readonly MigrationRegistryEntry[],
  root = process.cwd(),
): {
  ok: boolean;
  failed_flags: string[];
} {
  const failed: string[] = [];
  if (registry.length !== 7) failed.push('HOLD_MIGRATION_REGISTRY_NOT_EXACTLY_SEVEN');
  const versions = registry.map((r) => r.version);
  if (new Set(versions).size !== versions.length) failed.push('HOLD_MIGRATION_VERSION_DUPLICATE');
  const canonical = buildMigrationRegistryFromFiles(root);
  const compareLength = Math.min(registry.length, canonical.length, MIGRATION_REGISTRY_PATHS.length);
  for (let i = 0; i < compareLength; i++) {
    const expected = MIGRATION_REGISTRY_PATHS[i];
    const actual = registry[i];
    const canonicalEntry = canonical[i];
    if (!actual || actual.version !== expected.version || actual.path !== expected.path) {
      failed.push('HOLD_MIGRATION_ORDER_AMBIGUOUS');
      break;
    }
    if (actual.predecessor !== expected.predecessor) failed.push('HOLD_MIGRATION_PREDECESSOR_MISMATCH');
    if (canonicalEntry && actual.sha256 !== canonicalEntry.sha256) {
      failed.push('HOLD_MIGRATION_HASH_MISMATCH');
    }
  }
  if (registry.length > 7) failed.push('HOLD_UNEXPECTED_MIGRATION_COUNT');
  return { ok: failed.length === 0, failed_flags: failed };
}

export function classifySchemaCompatibility(
  input: CompatibilityMatrixInput,
): CompatibilityMatrixResult {
  const oldNew = input.old_app_new_schema;
  const newOld = input.new_app_old_schema;
  if (oldNew === 'UNKNOWN' || newOld === 'UNKNOWN') {
    return {
      classification: 'HOLD_COMPATIBILITY_UNPROVEN',
      selected_order: 'NONE',
      old_app_new_schema: oldNew,
      new_app_old_schema: newOld,
    };
  }
  if (oldNew && !newOld) {
    return {
      classification: 'MIGRATE_THEN_DEPLOY_REQUIRED',
      selected_order: 'MIGRATE_THEN_DEPLOY',
      old_app_new_schema: oldNew,
      new_app_old_schema: newOld,
    };
  }
  if (!oldNew && newOld) {
    return {
      classification: 'DEPLOY_THEN_MIGRATE_ALLOWED',
      selected_order: 'DEPLOY_THEN_MIGRATE',
      old_app_new_schema: oldNew,
      new_app_old_schema: newOld,
    };
  }
  if (oldNew && newOld) {
    return {
      classification: 'BOTH_CROSS_COMPATIBLE',
      selected_order: 'MIGRATE_THEN_DEPLOY',
      old_app_new_schema: oldNew,
      new_app_old_schema: newOld,
    };
  }
  return {
    classification: 'STAGED_PROTECTED_CUTOVER_REQUIRED',
    selected_order: 'STAGED_PROTECTED_CUTOVER',
    old_app_new_schema: oldNew,
    new_app_old_schema: newOld,
  };
}

export function computePreflightIdentity(parts: {
  classification: string;
  applied_versions: readonly string[];
  schema_fingerprint: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        classification: parts.classification,
        applied_versions: [...parts.applied_versions].sort(),
        schema_fingerprint: parts.schema_fingerprint,
      }),
      'utf8',
    )
    .digest('hex');
}

export function computeApplySetFromPreflight(input: {
  preflight_classification: (typeof PREFLIGHT_CLASSIFICATIONS)[number];
  applied_versions: readonly string[];
  version_object_exact: Readonly<Record<string, boolean>>;
  schema_fingerprint?: string;
}): PreflightApplyPlan {
  const applied = new Set(input.applied_versions);
  const driftClasses = new Set<string>([
    'PARTIAL_STATE_RECONCILIATION_REQUIRED',
    'HISTORY_ONLY_DRIFT',
    'SCHEMA_ONLY_DRIFT',
    'HOLD_UNKNOWN',
  ]);

  const per_version_plan: PerVersionPlanEntry[] = [];
  const already_applied_versions: string[] = [];
  const required_apply_versions: string[] = [];
  const blocked_versions: string[] = [];
  const conflicting_versions: string[] = [];
  const unknown_versions: string[] = [];

  let predecessorReady = true;

  for (const entry of MIGRATION_REGISTRY_PATHS) {
    const version = entry.version;
    const inHistory = applied.has(version);
    const objectExact = input.version_object_exact[version] ?? false;

    let status: PerVersionStatus;
    if (driftClasses.has(input.preflight_classification)) {
      status = input.preflight_classification === 'HOLD_UNKNOWN' ? 'UNKNOWN' : 'OBJECT_STATE_PARTIAL';
    } else if (input.preflight_classification === 'ALREADY_APPLIED') {
      status = inHistory && objectExact ? 'APPLIED_EXACT' : 'HISTORY_SCHEMA_CONFLICT';
    } else if (inHistory && objectExact) {
      status = 'APPLIED_EXACT';
    } else if (inHistory && !objectExact) {
      status = 'HISTORY_SCHEMA_CONFLICT';
    } else if (!inHistory && objectExact) {
      status = 'OBJECT_STATE_PARTIAL';
    } else if (
      input.preflight_classification === 'GREENFIELD_READY' &&
      predecessorReady &&
      !inHistory &&
      !objectExact
    ) {
      status = 'REQUIRED_APPLY';
    } else if (!predecessorReady) {
      status = 'BLOCKED_BY_PREDECESSOR';
    } else {
      status = 'UNKNOWN';
    }

    per_version_plan.push({ ordinal: entry.ordinal, version, status });

    if (status === 'APPLIED_EXACT') already_applied_versions.push(version);
    if (status === 'REQUIRED_APPLY') required_apply_versions.push(version);
    if (status === 'BLOCKED_BY_PREDECESSOR') blocked_versions.push(version);
    if (status === 'HISTORY_SCHEMA_CONFLICT') conflicting_versions.push(version);
    if (status === 'OBJECT_STATE_PARTIAL' || status === 'UNKNOWN') unknown_versions.push(version);

    predecessorReady =
      predecessorReady &&
      (status === 'APPLIED_EXACT' || status === 'REQUIRED_APPLY');
  }

  const stopFromDrift = driftClasses.has(input.preflight_classification);
  const stopFromArrays =
    blocked_versions.length > 0 ||
    conflicting_versions.length > 0 ||
    unknown_versions.length > 0;

  const forcedEmptyRequired =
    input.preflight_classification !== 'GREENFIELD_READY' || stopFromDrift || stopFromArrays;

  const finalRequired = forcedEmptyRequired ? [] : [...required_apply_versions];
  const dependency_order_valid =
    finalRequired.length === 0 ||
    finalRequired.every((version, idx) => {
      if (idx === 0) return true;
      const prevIdx = CANONICAL_VERSIONS.indexOf(finalRequired[idx - 1]);
      const curIdx = CANONICAL_VERSIONS.indexOf(version);
      return prevIdx >= 0 && curIdx === prevIdx + 1;
    });

  const preflight_identity = computePreflightIdentity({
    classification: input.preflight_classification,
    applied_versions: input.applied_versions,
    schema_fingerprint: input.schema_fingerprint ?? 'schema-fingerprint-unset',
  });

  const apply_required = finalRequired.length > 0;
  let stop_required: boolean;
  if (input.preflight_classification === 'ALREADY_APPLIED') {
    stop_required = false;
  } else if (stopFromDrift || stopFromArrays) {
    stop_required = true;
  } else {
    stop_required = false;
  }

  return {
    preflight_identity,
    preflight_classification: input.preflight_classification,
    per_version_plan,
    required_apply_versions: finalRequired,
    already_applied_versions,
    blocked_versions,
    conflicting_versions,
    unknown_versions,
    dependency_order_valid,
    apply_set_exact: dependency_order_valid,
    unconditional_apply_forbidden: true,
    apply_required,
    stop_required,
  };
}

export function validateApplySetDependency(required: readonly string[]): boolean {
  if (required.length === 0) return true;
  for (let i = 0; i < required.length; i++) {
    const version = required[i];
    const idx = CANONICAL_VERSIONS.indexOf(version);
    if (idx < 0) return false;
    if (i === 0) continue;
    if (CANONICAL_VERSIONS.indexOf(required[i - 1]) !== idx - 1) return false;
  }
  return true;
}

export function validateVersionApprovedForExecution(
  version: string,
  approvedRequired: readonly string[],
): boolean {
  return approvedRequired.includes(version);
}

export function rejectStalePreflightIdentity(
  approvedIdentity: string,
  observedIdentity: string,
): boolean {
  return approvedIdentity !== observedIdentity;
}

export function rejectApplySetChangedAfterApproval(
  approvedRequired: readonly string[],
  observedRequired: readonly string[],
): boolean {
  if (approvedRequired.length !== observedRequired.length) return true;
  return approvedRequired.some((v, i) => v !== observedRequired[i]);
}

export function mapCompatibilityToRolloutOrder(
  classification: CompatibilityClassification,
): RolloutOrder {
  switch (classification) {
    case 'MIGRATE_THEN_DEPLOY_REQUIRED':
    case 'BOTH_CROSS_COMPATIBLE':
      return 'MIGRATE_THEN_DEPLOY';
    case 'DEPLOY_THEN_MIGRATE_ALLOWED':
      return 'DEPLOY_THEN_MIGRATE';
    case 'STAGED_PROTECTED_CUTOVER_REQUIRED':
      return 'STAGED_PROTECTED_CUTOVER';
    default:
      return 'NONE';
  }
}

export function rejectDeployBeforeCompatibilityAudit(
  compatibilityAuditComplete: boolean,
  deployAttempted: boolean,
): boolean {
  return deployAttempted && !compatibilityAuditComplete;
}

export function selectedOrderMatchesMatrix(
  classification: CompatibilityClassification,
  selectedOrder: RolloutOrder,
): boolean {
  return mapCompatibilityToRolloutOrder(classification) === selectedOrder;
}

export function validateProductionDeploymentMigrationAuthority(
  authority: ProductionDeploymentMigrationAuthority | null | undefined,
  ctx: {
    now: Date;
    observedMainCommit?: string;
    observedFeatureHead?: string;
    observedRegistrySha256?: string;
    observedPreflightIdentity?: string;
    observedRequiredApplyVersions?: readonly string[];
    observedProductionDeploymentCommit?: string;
    observedSchemaIdentity?: string;
  },
): AuthorityValidationResult {
  const failed: string[] = [];
  const unknown: string[] = [];

  if (!authority) {
    return result(false, ['HOLD_AUTHORITY_MISSING'], unknown);
  }

  if (authority.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    failed.push('HOLD_AUTHORITY_SCHEMA_MISMATCH');
  }
  if (authority.single_use !== true) failed.push('HOLD_AUTHORITY_SINGLE_USE_REQUIRED');
  if (authority.consumed) failed.push('HOLD_AUTHORITY_ALREADY_CONSUMED');

  const expires = Date.parse(authority.expires_at);
  if (!Number.isFinite(expires) || ctx.now.getTime() > expires) {
    failed.push('HOLD_AUTHORITY_EXPIRED');
  }

  if (
    PLACEHOLDER_MAIN_COMMITS.has(authority.approved_main_commit) ||
    authority.approved_main_commit.length !== 40
  ) {
    failed.push('HOLD_MAIN_COMMIT_PLACEHOLDER');
  }

  if (ctx.observedFeatureHead && authority.approved_main_commit === ctx.observedFeatureHead) {
    failed.push('HOLD_FEATURE_COMMIT_USED_AS_MAIN');
  }

  if (authority.final_rc_verdict !== 'CLOSED_GREEN') {
    failed.push('HOLD_FINAL_RC_NOT_GREEN');
  }
  if (authority.preview_deletion_smoke_verdict !== 'CLOSED_GREEN') {
    failed.push('HOLD_PREVIEW_DELETION_SMOKE_NOT_GREEN');
  }
  if (authority.dns_blocker_resolved !== true) {
    failed.push('HOLD_DNS_BLOCKER_UNRESOLVED');
  }

  if (authority.production_vercel_project !== PRODUCTION_VERCEL_PROJECT) {
    failed.push('HOLD_VERCEL_PROJECT_MISMATCH');
  }
  if (authority.production_vercel_environment !== PRODUCTION_VERCEL_ENVIRONMENT) {
    failed.push('HOLD_VERCEL_ENVIRONMENT_MISMATCH');
  }
  if (authority.production_supabase_org !== PRODUCTION_SUPABASE_ORG) failed.push('HOLD_SUPABASE_ORG_MISMATCH');
  if (authority.production_supabase_project !== PRODUCTION_SUPABASE_PROJECT) {
    failed.push('HOLD_SUPABASE_PROJECT_MISMATCH');
  }
  if (authority.production_supabase_branch !== PRODUCTION_SUPABASE_BRANCH) {
    failed.push('HOLD_SUPABASE_BRANCH_MISMATCH');
  }
  if (authority.production_supabase_environment !== PRODUCTION_SUPABASE_ENVIRONMENT) {
    failed.push('HOLD_SUPABASE_ENVIRONMENT_MISMATCH');
  }
  if (authority.production_supabase_source !== PRODUCTION_SUPABASE_SOURCE) {
    failed.push('HOLD_SUPABASE_SOURCE_MISMATCH');
  }
  if (authority.production_supabase_role !== PRODUCTION_SUPABASE_ROLE) {
    failed.push('HOLD_SUPABASE_ROLE_MISMATCH');
  }
  if (authority.production_database_name !== PRODUCTION_DATABASE_NAME) {
    failed.push('HOLD_DATABASE_NAME_MISMATCH');
  }

  if (
    !authority.production_clerk_instance_identity ||
    authority.production_clerk_instance_identity === CLERK_IDENTITY_UNKNOWN
  ) {
    failed.push('HOLD_CLERK_INSTANCE_UNKNOWN');
  }

  if (authority.approved_deployment_commit !== authority.approved_main_commit) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_MISMATCH');
  }

  if (!authority.human_approval_phrase_hash || authority.human_approval_phrase_hash.length !== 64) {
    failed.push('HOLD_APPROVAL_HASH_MISSING');
  }
  if (!authority.execution_nonce_hash || authority.execution_nonce_hash.length !== 64) {
    failed.push('HOLD_EXECUTION_NONCE_MISSING');
  }

  if (
    !APPROVED_CONNECTION_MECHANISMS.includes(authority.approved_connection_mechanism)
  ) {
    failed.push('HOLD_CONNECTION_MECHANISM_INVALID');
  }
  if (!authority.ca_pin_identity_or_exact_human_match_marker) {
    failed.push('HOLD_CA_PIN_IDENTITY_MISSING');
  }

  const registryCheck = validateMigrationRegistry(authority.approved_migration_registry);
  if (!registryCheck.ok) failed.push(...registryCheck.failed_flags);

  const expectedSha = computeRegistrySha256(authority.approved_migration_registry);
  if (ctx.observedRegistrySha256 && ctx.observedRegistrySha256 !== expectedSha) {
    failed.push('HOLD_MIGRATION_REGISTRY_SHA_MISMATCH');
  }

  if (ctx.observedMainCommit && ctx.observedMainCommit !== authority.approved_main_commit) {
    failed.push('HOLD_OBSERVED_MAIN_COMMIT_MISMATCH');
  }

  if ((authority as { unconditional_apply_all?: boolean }).unconditional_apply_all === true) {
    failed.push('HOLD_UNCONDITIONAL_APPLY_ALL_FORBIDDEN');
  }

  if (!ctx.observedMainCommit) {
    failed.push('HOLD_OBSERVED_MAIN_COMMIT_MISSING');
  }
  if (!ctx.observedPreflightIdentity) {
    failed.push('HOLD_OBSERVED_PREFLIGHT_IDENTITY_MISSING');
  }
  if (!ctx.observedRequiredApplyVersions) {
    failed.push('HOLD_OBSERVED_APPLY_SET_MISSING');
  }
  if (!ctx.observedProductionDeploymentCommit) {
    failed.push('HOLD_OBSERVED_PRODUCTION_DEPLOYMENT_COMMIT_MISSING');
  }
  if (!ctx.observedSchemaIdentity) {
    failed.push('HOLD_OBSERVED_SCHEMA_IDENTITY_MISSING');
  }

  if (!authority.approved_preflight_identity || authority.approved_preflight_identity.length !== 64) {
    failed.push('HOLD_PREFLIGHT_IDENTITY_MISSING');
  }

  if (
    ctx.observedPreflightIdentity &&
    authority.approved_preflight_identity !== ctx.observedPreflightIdentity
  ) {
    failed.push('HOLD_PREFLIGHT_IDENTITY_MISMATCH');
  }

  if (
    ctx.observedRequiredApplyVersions &&
    rejectApplySetChangedAfterApproval(
      authority.approved_required_apply_versions,
      ctx.observedRequiredApplyVersions,
    )
  ) {
    failed.push('HOLD_APPLY_SET_CHANGED_AFTER_APPROVAL');
  }

  if (
    !PREFLIGHT_CLASSIFICATIONS.includes(authority.approved_preflight_classification)
  ) {
    failed.push('HOLD_PREFLIGHT_CLASSIFICATION_INVALID');
  }

  if (!validateApplySetDependency(authority.approved_required_apply_versions)) {
    failed.push('HOLD_REQUIRED_APPLY_SET_AMBIGUOUS');
  }

  for (const version of authority.approved_required_apply_versions) {
    if (!CANONICAL_VERSIONS.includes(version)) {
      failed.push('HOLD_UNAPPROVED_VERSION_REQUESTED');
      break;
    }
  }

  for (const entry of authority.approved_per_version_plan) {
    if (
      entry.status === 'HISTORY_SCHEMA_CONFLICT' ||
      entry.status === 'OBJECT_STATE_PARTIAL' ||
      entry.status === 'UNKNOWN'
    ) {
      failed.push('HOLD_REQUIRED_APPLY_SET_AMBIGUOUS');
      break;
    }
  }

  if (authority.approved_blocked_versions.length > 0) {
    failed.push('HOLD_REQUIRED_APPLY_SET_AMBIGUOUS');
  }

  if (authority.compatibility_classification === 'HOLD_COMPATIBILITY_UNPROVEN') {
    failed.push('HOLD_COMPATIBILITY_UNPROVEN');
  }

  if (
    !COMPATIBILITY_CLASSIFICATIONS.includes(authority.compatibility_classification)
  ) {
    failed.push('HOLD_COMPATIBILITY_UNPROVEN');
  }

  if (
    !selectedOrderMatchesMatrix(
      authority.compatibility_classification,
      authority.selected_rollout_order,
    )
  ) {
    failed.push('HOLD_ROLLOUT_ORDER_MATRIX_MISMATCH');
  }

  if (
    authority.candidate_main_commit !== authority.approved_main_commit ||
    authority.candidate_main_commit.length !== 40
  ) {
    failed.push('HOLD_CANDIDATE_MAIN_COMMIT_MISMATCH');
  }

  if (
    !authority.current_production_deployment_commit ||
    authority.current_production_deployment_commit.length !== 40
  ) {
    failed.push('HOLD_PRODUCTION_DEPLOYMENT_COMMIT_MISSING');
  }

  if (
    ctx.observedProductionDeploymentCommit &&
    authority.current_production_deployment_commit !== ctx.observedProductionDeploymentCommit
  ) {
    failed.push('HOLD_PRODUCTION_DEPLOYMENT_COMMIT_MISMATCH');
  }

  if (!authority.current_schema_identity || authority.current_schema_identity.length < 8) {
    failed.push('HOLD_SCHEMA_IDENTITY_MISSING');
  }

  if (
    ctx.observedSchemaIdentity &&
    authority.current_schema_identity !== ctx.observedSchemaIdentity
  ) {
    failed.push('HOLD_SCHEMA_IDENTITY_MISMATCH');
  }

  return result(failed.length === 0 && unknown.length === 0, failed, unknown);
}

function result(
  ready: boolean,
  failed_flags: string[],
  unknown_flags: string[],
): AuthorityValidationResult {
  return {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    ready,
    failed_flags,
    unknown_flags,
    next_gate: ready
      ? 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-VERIFICATION-AND-MIGRATION-PREFLIGHT'
      : 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-MIGRATION-AUTHORITY-REVIEW',
  };
}

export function serializeAuthorityValidationResult(
  value: AuthorityValidationResult,
): string {
  const json = JSON.stringify(value);
  assertSecretSafeOutput(json);
  return json;
}

export function classifyDeploymentDiscovery(
  input: DeploymentDiscoveryInput,
): DeploymentOutcomeClass {
  if (input.ack_class === 'AMBIGUOUS') return 'DEPLOYMENT_ACK_AMBIGUOUS';
  if (input.vercel_project !== PRODUCTION_VERCEL_PROJECT) return 'DEPLOYMENT_BINDING_MISMATCH';
  if (input.vercel_environment !== PRODUCTION_VERCEL_ENVIRONMENT) return 'DEPLOYMENT_BINDING_MISMATCH';
  if (input.preview_binding_detected) return 'DEPLOYMENT_BINDING_MISMATCH';
  if (input.build_status === 'BUILDING') return 'DEPLOYMENT_BUILDING';
  if (input.build_status === 'FAILED') return 'DEPLOYMENT_FAILED';
  if (!input.alias_points_to_deployment) return 'DEPLOYMENT_ALIAS_MISMATCH';
  if (input.commit_sha.length !== 40) return 'DEPLOYMENT_NOT_FOUND';
  if (input.branch !== 'main') return 'DEPLOYMENT_COMMIT_MISMATCH';
  if (input.build_status === 'READY') return 'DEPLOYMENT_READY_EXACT';
  return 'DEPLOYMENT_NOT_FOUND';
}

export function deploymentOutcomeAllowsProceed(outcome: DeploymentOutcomeClass): boolean {
  return outcome === 'DEPLOYMENT_READY_EXACT';
}

export function parseSqlMutationKeywords(sql: string): string[] {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/has_function_privilege\([^)]*\)/gi, ' ');
  const forbidden = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'TRUNCATE',
    'CREATE',
    'ALTER',
    'DROP',
    'GRANT',
    'REVOKE',
    'COPY',
    'CALL',
    'DO',
    'NOTIFY',
  ];
  const hits: string[] = [];
  for (const word of forbidden) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(stripped)) hits.push(word);
  }
  const executeRe = /\bEXECUTE\b/i;
  if (executeRe.test(stripped)) hits.push('EXECUTE');
  return hits;
}

export function sqlHasSingleTopLevelSelect(sql: string): boolean {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .trim();
  return /^(WITH\b[\s\S]+)?SELECT\b/i.test(stripped);
}

export function sqlClassificationCount(sql: string, markers: readonly string[]): number {
  return markers.filter((m) => sql.includes(m)).length;
}

export function runbookHasDeploymentSteps(text: string): boolean {
  return DEPLOYMENT_STEPS.every((s) => new RegExp(`\\b${s}\\b`).test(text));
}

export function runbookHasMigrationSteps(text: string): boolean {
  return MIGRATION_APPLY_STEPS.every((s) => new RegExp(`\\b${s}\\b`).test(text));
}

export function runbookHasFailureMatrixRows(text: string, expected = 20): boolean {
  const matches = text.match(/ROLLBACK-STOP-ROW-\d+/g) ?? [];
  return matches.length >= expected;
}

export function runbookHasCanonicalChainNotExecutionList(text: string): boolean {
  return /P1[–-]P7.*canonical chain.*not.*unconditional execution list/i.test(text);
}

export function runbookHasCompatibilityBeforeDeploy(text: string): boolean {
  return /compatibility audit.*before.*deploy/i.test(text) || /C6.*compatibility/i.test(text);
}

export function runbookHasConditionalOrder(text: string): boolean {
  return (
    /MIGRATE_THEN_DEPLOY_REQUIRED/i.test(text) &&
    /DEPLOY_THEN_MIGRATE_ALLOWED/i.test(text) &&
    /conditional rollout order/i.test(text)
  );
}

export function runbookUnconditionalApplyWordingCount(text: string): number {
  const patterns = [
    /apply P1 through P7/gi,
    /apply all P1/i,
    /unconditionally apply/i,
    /run P1 through P7/gi,
  ];
  let count = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) count += m.length;
  }
  return count;
}
