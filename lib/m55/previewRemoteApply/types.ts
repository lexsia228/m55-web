import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import { compositeStreamSha256 } from '../transactionNormalized/statementStream.ts';
import { validateMigrationSourceBytes } from '../transactionNormalized/transactionNormalizedCore.ts';

export const PREVIEW_REMOTE_APPLY_HOLD_CODES = [
  'HOLD_REPO_IDENTITY_MISMATCH',
  'HOLD_AUTHORITY_IDENTITY_MISMATCH',
  'HOLD_MIGRATION_IDENTITY_MISMATCH',
  'HOLD_NORMALIZED_STREAM_MISMATCH',
  'HOLD_INVALID_HISTORY_PREFIX',
  'HOLD_BOOTSTRAP_PRECONDITION',
  'HOLD_TIMEOUT_POLICY',
  'HOLD_RUNTIME_PROBE_REGISTRY',
  'HOLD_TARGET_FINGERPRINT_INCOMPLETE',
  'HOLD_TARGET_IDENTITY_MISMATCH',
  'HOLD_TARGET_PRODUCTION_FORBIDDEN',
  'HOLD_CREDENTIAL_METHOD_INVALID',
  'HOLD_EXECUTION_NOT_AUTHORIZED',
  'HOLD_P8_POSTCONDITION_MISMATCH',
  'HOLD_UNEXPECTED_INTERNAL',
] as const;

export type PreviewRemoteApplyHoldCode = (typeof PREVIEW_REMOTE_APPLY_HOLD_CODES)[number];

const HOLD_CODE_SET = new Set<string>(PREVIEW_REMOTE_APPLY_HOLD_CODES);

export function sanitizePreviewRemoteApplyHoldCode(value: unknown): PreviewRemoteApplyHoldCode {
  if (typeof value === 'string' && HOLD_CODE_SET.has(value)) {
    return value as PreviewRemoteApplyHoldCode;
  }
  return 'HOLD_UNEXPECTED_INTERNAL';
}

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';
export type StepId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';

export type CredentialMethodId =
  | 'SECURE_STDIN_CONNECTION_CONFIG_v1'
  | 'TEMP_PGPASSFILE_0600_v1';

export const CREDENTIAL_METHOD_IDS: readonly CredentialMethodId[] = [
  'SECURE_STDIN_CONNECTION_CONFIG_v1',
  'TEMP_PGPASSFILE_0600_v1',
];

export const APPROVED_PREVIEW_ORGANIZATION = 'm55-preview' as const;
export const APPROVED_PREVIEW_PROJECT = 'm55-soul-preview' as const;
export const APPROVED_PREVIEW_DATABASE_TIER = 'Primary Database' as const;
export const FORBIDDEN_PRODUCTION_ORGANIZATION = 'm55-soul' as const;
export const FORBIDDEN_PRODUCTION_PROJECT = 'm55-soul-core' as const;

export const EXPECTED_REPO_ROOT = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1' as const;
export const EXPECTED_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;
export const REPOSITORY_FACTS_SOURCE = 'GIT_READ_ONLY_PREFLIGHT' as const;

export const HISTORY_INSERT_SQL_METADATA =
  'INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ($1, $2::text[], $3)' as const;

export const P0_PREFLIGHT_PATCH2_AUTHORITY = {
  filename: 'M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  bytes: 21188,
  sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
} as const;

export const EXPECTED_NORMALIZED_STATEMENT_COUNTS: Readonly<Record<StepId, number>> = {
  P1: 207,
  P2: 4,
  P3: 7,
  P4: 7,
  P5: 1,
  P6: 1,
  P7: 1,
  P8: 14,
};

export const REMOTE_BOOTSTRAP_OBSERVATION_STATUS =
  'NOT_OBSERVED_REMOTE_READ_ONLY_RECHECK_REQUIRED' as const;

export type RepositoryIdentityFacts = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly treeSha: string;
  readonly trackedWorktreeClean: boolean;
  readonly indexEmpty: boolean;
  readonly factsSource: typeof REPOSITORY_FACTS_SOURCE;
};

export type TargetIdentityBinding = {
  readonly organization: string;
  readonly project: string;
  readonly databaseTier: string;
  readonly projectRef: string;
  readonly hostFingerprintSha256: string;
  readonly credentialMethod: CredentialMethodId;
};

export type TargetIdentityFacts = {
  readonly organization: string;
  readonly project: string;
  readonly databaseTier: string;
  readonly projectRef: string | null;
  readonly hostFingerprintSha256: string | null;
};

export type P1HistoryBootstrapObservedFacts = {
  readonly classification: string;
  readonly historySchemaExists: boolean;
  readonly historyRelationExists: boolean;
  readonly stopRequired: boolean;
};

export type BootstrapPreconditionBinding = {
  readonly requiredPreconditionIdentifier: string;
  readonly remoteObservationStatus: typeof REMOTE_BOOTSTRAP_OBSERVATION_STATUS;
  readonly p0PreflightAuthority: typeof P0_PREFLIGHT_PATCH2_AUTHORITY;
};

export type MigrationSourceIdentity = {
  readonly stepId: StepId;
  readonly phaseId: PhaseId;
  readonly version: string;
  readonly name: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
};

export type NormalizedStreamIdentity = {
  readonly stepId: StepId;
  readonly statementCount: number;
  readonly normalizedStreamCompositeSha256: string;
  readonly serialization: 'm55.statement_stream.u64be_length_utf8.v1';
};

export type Policy2HistoryFacts = {
  readonly version: string;
  readonly name: string;
  readonly statementCount: number;
  readonly normalizedStreamCompositeSha256: string;
  readonly serialization: 'm55.statement_stream.u64be_length_utf8.v1';
  readonly parameterizedInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
};

export type DeterministicPlanStep = {
  readonly stepId: StepId;
  readonly phaseId: PhaseId;
  readonly migration: MigrationSourceIdentity;
  readonly normalizedStream: NormalizedStreamIdentity;
  readonly historyPayload: Policy2HistoryFacts;
  readonly bootstrapSpecId: string | null;
  readonly priorProbeId: string;
  readonly postProbeId: string;
};

export type PreviewRemoteApplyPlanInput = {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly target: TargetIdentityFacts;
  readonly credentialMethod: CredentialMethodId;
  readonly executionEnablement: false;
  /** When set to P8, build a dedicated single-step dry-run plan only. */
  readonly dedicatedStepId?: typeof P8_STEP_ID;
};

export const P8_STEP_ID = 'P8' as const;

export const P8_MIGRATION_VERSION = '20260617000001' as const;
export const P8_MIGRATION_NAME = 'm55_clerk_webhook_user_ref_hash_v1' as const;
export const P8_MIGRATION_REL_PATH =
  'supabase/migrations/20260617000001_m55_clerk_webhook_user_ref_hash_v1.sql' as const;
export const P8_MIGRATION_SHA256 =
  'ce74cb109db130ddd7381ba25ab24bd255dcb92c330c48baa2da03c636b93ea1' as const;

export const P8_ORIGINAL_STATEMENT_COUNT = 14 as const;
export const P8_NORMALIZED_STATEMENT_COUNT = 14 as const;
export const P8_NORMALIZED_STREAM_COMPOSITE_SHA256 =
  'd621d944330967d965fd6e1d31957a20a6183684ebfe6709daea7804065c16df' as const;
export const P8_ORIGINAL_STREAM_COMPOSITE_SHA256 = P8_NORMALIZED_STREAM_COMPOSITE_SHA256;

export const P8_PRIOR_HISTORY_PREFIX = [
  '20260614000000',
  '20260615000001',
  '20260615000002',
  '20260615000003',
  '20260615000004',
  '20260615000005',
  '20260615000006',
] as const;

export const P8_POST_HISTORY_PREFIX = [
  ...P8_PRIOR_HISTORY_PREFIX,
  P8_MIGRATION_VERSION,
] as const;


export const P8_PRE_ERROR_CODE_CHECK_DEFINITIONS = [
  "CHECK (error_code IS NULL OR (error_code = ANY (ARRAY['INVALID_PROCESSING_STATE'::text, 'CLEANUP_FAILED'::text, 'VERIFICATION_FAILED'::text])))",
] as const;
export const P8_POST_ERROR_CODE_CHECK_DEFINITIONS = [
  "CHECK (error_code IS NULL OR (error_code = ANY (ARRAY['INVALID_PROCESSING_STATE'::text, 'CLEANUP_FAILED'::text, 'VERIFICATION_FAILED'::text, 'CORRELATION_MISMATCH'::text])))",
] as const;
export const P8_USER_REF_HASH_CHECK_DEFINITIONS = [
  "CHECK ((user_ref_hash IS NULL) OR (user_ref_hash ~ '^[0-9a-f]{16}$'::text))",
  "CHECK (user_ref_hash IS NULL OR user_ref_hash ~ '^[0-9a-f]{16}$'::text)",
] as const;

export const P8_PROBE_OUTPUT_COLUMN = 'json_build_object' as const;
export const P8_PRE_RPC_PROSRC_MD5 = '6539ccbeedbe8e3e26bddeadb6cc624a' as const;
export const P8_POST_RPC_PROSRC_MD5 = '8e91c9cafba016e3677377fc61d3079d' as const;
export const HOLD_P8_POSTCONDITION_MISMATCH = 'HOLD_P8_POSTCONDITION_MISMATCH' as const;
export const P8_MALFORMED_PROBE_SQL_FIXTURE =
  "SELECT json_build_object('pre_error_code_check_exact', (EXISTS (SELECT 1 FROM pg_constraint WHERE pg_get_constraintdef(oid, true) = 'CHECK ((error_code IS NULL) OR (error_code = ANY (ARRAY['INVALID_PROCESSING_STATE'::text]))')))) AS json_build_object;" as const;

function p8SqlDollarQuote(tag: string, value: string): string {
  return `$${tag}$${value}$${tag}$`;
}

function p8SqlTextArray(definitions: readonly string[], prefix: string): string {
  return `ARRAY[${definitions.map((definition, index) => `${p8SqlDollarQuote(`${prefix}${index}`, definition)}::text`).join(',')}]`;
}

const P8_PRIOR_HISTORY_VERSIONS_SQL =
  "ARRAY['20260614000000'::text,'20260615000001'::text,'20260615000002'::text,'20260615000003'::text,'20260615000004'::text,'20260615000005'::text,'20260615000006'::text]";
const P8_POST_HISTORY_VERSIONS_SQL =
  "ARRAY['20260614000000'::text,'20260615000001'::text,'20260615000002'::text,'20260615000003'::text,'20260615000004'::text,'20260615000005'::text,'20260615000006'::text,'20260617000001'::text]";

const P8_HISTORY_TOTAL_COUNT_SQL = '(SELECT count(*)::int FROM supabase_migrations.schema_migrations)';
const P8_HISTORY_DISTINCT_COUNT_SQL =
  '(SELECT count(DISTINCT version)::int FROM supabase_migrations.schema_migrations)';

function p8HistoryPrefixExactSql(versionsSql: string): string {
  return `(COALESCE((SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations WHERE version = ANY (${versionsSql})), ARRAY[]::text[]) = ${versionsSql})`;
}

const P8_CLERK_RELATION_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events')";
const P8_CLERK_ORDINARY_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND c.relkind = 'r')";
const P8_USER_REF_HASH_COLUMN_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND a.attname = 'user_ref_hash' AND a.attnum > 0 AND NOT a.attisdropped)";
const P8_NAMED_USER_REF_HASH_CHECK_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_user_ref_hash_check')";
const P8_STRUCTURAL_USER_REF_HASH_CHECK_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.contype = 'c' AND con.conname <> 'clerk_webhook_events_user_ref_hash_check' AND pg_get_constraintdef(con.oid, true) LIKE '%user_ref_hash%')";
const P8_TARGET_INDEX_PARTIAL_PREDICATE_DEPARSE = 'user_ref_hash IS NOT NULL' as const;

const P8_TARGET_INDEX_NAMESPACE_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_class ic JOIN pg_catalog.pg_namespace n ON n.oid = ic.relnamespace WHERE n.nspname = 'public' AND ic.relname = 'idx_clerk_webhook_events_user_ref_hash')";
const P8_COMPETING_USER_REF_HASH_INDEX_COUNT_SQL =
  `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid JOIN pg_catalog.pg_namespace in_ns ON in_ns.oid = ic.relnamespace JOIN pg_catalog.pg_namespace tbl_ns ON tbl_ns.oid = rc.relnamespace WHERE in_ns.nspname = 'public' AND tbl_ns.nspname = 'public' AND rc.relname = 'clerk_webhook_events' AND i.indislive AND i.indisvalid AND NOT (ic.relname = 'idx_clerk_webhook_events_user_ref_hash' AND i.indpred IS NOT NULL AND pg_get_expr(i.indpred, i.indrelid, true) = '${P8_TARGET_INDEX_PARTIAL_PREDICATE_DEPARSE}' AND i.indexprs IS NULL AND i.indnatts = 1 AND i.indnkeyatts = 1) AND (EXISTS (SELECT 1 FROM pg_catalog.pg_attribute att WHERE att.attrelid = rc.oid AND att.attname = 'user_ref_hash' AND NOT att.attisdropped AND att.attnum = ANY (i.indkey::int2[])) OR (i.indexprs IS NOT NULL AND position('user_ref_hash' in pg_get_expr(i.indexprs, i.indrelid, true)) > 0) OR (i.indpred IS NOT NULL AND position('user_ref_hash' in pg_get_expr(i.indpred, i.indrelid, true)) > 0)))`;
const P8_NAMED_ERROR_CODE_CHECK_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_error_code_check')";

function p8ExactPreErrorCodeDefinitionCountSql(): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_error_code_check' AND pg_get_constraintdef(con.oid, true) = ANY (${p8SqlTextArray(P8_PRE_ERROR_CODE_CHECK_DEFINITIONS, 'pre_ec')}))`;
}

function p8ExactPostErrorCodeDefinitionCountSql(): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_error_code_check' AND pg_get_constraintdef(con.oid, true) = ANY (${p8SqlTextArray(P8_POST_ERROR_CODE_CHECK_DEFINITIONS, 'post_ec')}))`;
}

function p8UnexpectedNamedErrorCodeDefinitionCountSql(): string {
  const definitions = [
    ...P8_PRE_ERROR_CODE_CHECK_DEFINITIONS,
    ...P8_POST_ERROR_CODE_CHECK_DEFINITIONS,
  ] as const;
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_error_code_check' AND pg_get_constraintdef(con.oid, true) <> ALL (${p8SqlTextArray(definitions, 'all_ec')}))`;
}

const P8_STRUCTURAL_ERROR_CODE_CHECK_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.contype = 'c' AND con.conname <> 'clerk_webhook_events_error_code_check' AND pg_get_constraintdef(con.oid, true) LIKE '%error_code%')";
const P8_RPC_PRONAME_TOTAL_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_account_deletion_process_v1')";
const P8_RPC_EXACT_SIGNATURE_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)'))";
const P8_RPC_UNEXPECTED_OVERLOAD_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_account_deletion_process_v1' AND p.oid <> to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)'))";
const P8_RPC_IDENTITY_ARGUMENTS_EXACT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)') AND pg_get_function_identity_arguments(p.oid) = 'p_svix_id text, p_event_type text, p_clerk_user_id text, p_user_ref_hash text')";
const P8_RPC_PRE_MD5_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)') AND md5(p.prosrc) = '6539ccbeedbe8e3e26bddeadb6cc624a')";
const P8_RPC_POST_MD5_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)') AND md5(p.prosrc) = '8e91c9cafba016e3677377fc61d3079d')";
const P8_RPC_UNKNOWN_MD5_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)') AND md5(p.prosrc) NOT IN ('6539ccbeedbe8e3e26bddeadb6cc624a', '8e91c9cafba016e3677377fc61d3079d'))";
const P8_RPC_PROSECDEF_SQL =
  "(SELECT COALESCE((SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)')), false))";
const P8_RPC_PROVOLATILE_V_SQL =
  "(SELECT COALESCE((SELECT p.provolatile = 'v' FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)')), false))";
const P8_RPC_PROPARALLEL_U_SQL =
  "(SELECT COALESCE((SELECT p.proparallel = 'u' FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)')), false))";
const P8_RPC_SEARCH_PATH_EXACT_SQL =
  "(SELECT COALESCE((SELECT p.proconfig = ARRAY['search_path=public, pg_temp'] FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)')), false))";
const P8_USER_REF_HASH_COLUMN_EXACT_SHAPE_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_type t ON t.oid = a.atttypid JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND a.attname = 'user_ref_hash' AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'text' AND a.attnotnull = false AND pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) IS NULL)";
const P8_USER_REF_HASH_WRONG_SHAPE_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND a.attname = 'user_ref_hash' AND a.attnum > 0 AND NOT a.attisdropped AND NOT (a.atttypid = 'text'::regtype AND a.attnotnull = false))";

function p8ExactUserRefHashDefinitionCountSql(): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'clerk_webhook_events' AND con.conname = 'clerk_webhook_events_user_ref_hash_check' AND con.convalidated = true AND pg_get_constraintdef(con.oid, true) = ANY (${p8SqlTextArray(P8_USER_REF_HASH_CHECK_DEFINITIONS, 'urh_chk')}))`;
}

const P8_TARGET_INDEX_PUBLIC_COUNT_SQL =
  "(SELECT count(*)::int FROM pg_catalog.pg_class ic JOIN pg_catalog.pg_namespace n ON n.oid = ic.relnamespace WHERE n.nspname = 'public' AND ic.relname = 'idx_clerk_webhook_events_user_ref_hash' AND ic.relkind = 'i')";
const P8_TARGET_INDEX_EXACT_SHAPE_SQL =
  `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid JOIN pg_catalog.pg_namespace in_ns ON in_ns.oid = ic.relnamespace JOIN pg_catalog.pg_namespace tbl_ns ON tbl_ns.oid = rc.relnamespace JOIN pg_catalog.pg_am am ON am.oid = ic.relam WHERE in_ns.nspname = 'public' AND tbl_ns.nspname = 'public' AND ic.relname = 'idx_clerk_webhook_events_user_ref_hash' AND rc.relname = 'clerk_webhook_events' AND ic.relkind = 'i' AND am.amname = 'btree' AND NOT i.indisunique AND NOT i.indisprimary AND NOT i.indisexclusion AND i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate AND i.indnatts = 1 AND i.indnkeyatts = 1 AND i.indexprs IS NULL AND i.indpred IS NOT NULL AND pg_get_expr(i.indpred, i.indrelid, true) = '${P8_TARGET_INDEX_PARTIAL_PREDICATE_DEPARSE}' AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped WHERE k.ord = 1 AND att.attname = 'user_ref_hash') AND (SELECT count(*)::bigint FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)) = 1 AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN unnest(i.indclass::oid[]) WITH ORDINALITY AS cls(opcoid, ord2) ON k.ord = cls.ord2 JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped JOIN pg_catalog.pg_opclass opc ON opc.oid = cls.opcoid JOIN pg_catalog.pg_am am2 ON am2.oid = opc.opcmethod WHERE k.ord = 1 AND am2.amname = 'btree' AND opc.opcdefault AND opc.opcintype = att.atttypid) AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN unnest(i.indcollation::oid[]) WITH ORDINALITY AS coll(colloid, ord2) ON k.ord = coll.ord2 JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped WHERE k.ord = 1 AND coll.colloid = att.attcollation) AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN unnest(i.indoption::int2[]) WITH ORDINALITY AS opt(indopt, ord2) ON k.ord = opt.ord2 WHERE k.ord = 1 AND opt.indopt = 0))`;

function p8BuildProbeSql(fields: ReadonlyArray<readonly [string, string]>): string {
  const entries = fields.map(([name, expression]) => `  '${name}', (${expression})`);
  const probeGreen = fields.map(([, expression]) => `(${expression})`).join(' AND ');
  entries.push(`  'probe_green', (${probeGreen})`);
  return `SELECT json_build_object(\n${entries.join(',\n')}\n) AS json_build_object`;
}

function buildP8PriorProbeSql(): string {
  const fields: Array<readonly [string, string]> = [
    ['history_total_count_seven', `${P8_HISTORY_TOTAL_COUNT_SQL} = 7`],
    ['history_distinct_count_seven', `${P8_HISTORY_DISTINCT_COUNT_SQL} = 7`],
    ['history_prefix_exact', p8HistoryPrefixExactSql(P8_PRIOR_HISTORY_VERSIONS_SQL)],
    ['history_duplicate_zero', `${P8_HISTORY_TOTAL_COUNT_SQL} = ${P8_HISTORY_DISTINCT_COUNT_SQL}`],
    ['history_missing_zero', p8HistoryPrefixExactSql(P8_PRIOR_HISTORY_VERSIONS_SQL)],
    ['history_unexpected_zero', `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version <> ALL (${P8_PRIOR_HISTORY_VERSIONS_SQL})) = 0`],
    ['target_version_absent', "(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version = '20260617000001') = 0"],
    ['clerk_relation_count_one', `${P8_CLERK_RELATION_COUNT_SQL} = 1`],
    ['clerk_ordinary_count_one', `${P8_CLERK_ORDINARY_COUNT_SQL} = 1`],
    ['user_ref_hash_column_count_zero', `${P8_USER_REF_HASH_COLUMN_COUNT_SQL} = 0`],
    ['named_user_ref_hash_check_count_zero', `${P8_NAMED_USER_REF_HASH_CHECK_COUNT_SQL} = 0`],
    ['structural_user_ref_hash_check_count_zero', `${P8_STRUCTURAL_USER_REF_HASH_CHECK_COUNT_SQL} = 0`],
    ['target_index_namespace_count_zero', `${P8_TARGET_INDEX_NAMESPACE_COUNT_SQL} = 0`],
    ['competing_user_ref_hash_index_count_zero', `${P8_COMPETING_USER_REF_HASH_INDEX_COUNT_SQL} = 0`],
    ['named_error_code_check_count_one', `${P8_NAMED_ERROR_CODE_CHECK_COUNT_SQL} = 1`],
    ['exact_pre_definition_count_one', `${p8ExactPreErrorCodeDefinitionCountSql()} = 1`],
    ['exact_post_definition_count_zero', `${p8ExactPostErrorCodeDefinitionCountSql()} = 0`],
    ['unexpected_named_error_code_definition_count_zero', `${p8UnexpectedNamedErrorCodeDefinitionCountSql()} = 0`],
    ['additional_structural_error_code_check_count_zero', `${P8_STRUCTURAL_ERROR_CODE_CHECK_COUNT_SQL} = 0`],
    ['rpc_proname_total_one', `${P8_RPC_PRONAME_TOTAL_SQL} = 1`],
    ['rpc_exact_signature_count_one', `${P8_RPC_EXACT_SIGNATURE_COUNT_SQL} = 1`],
    ['rpc_unexpected_overload_zero', `${P8_RPC_UNEXPECTED_OVERLOAD_COUNT_SQL} = 0`],
    ['rpc_identity_arguments_exact_one', `${P8_RPC_IDENTITY_ARGUMENTS_EXACT_SQL} = 1`],
    ['rpc_pre_md5_count_one', `${P8_RPC_PRE_MD5_COUNT_SQL} = 1`],
    ['rpc_post_md5_count_zero', `${P8_RPC_POST_MD5_COUNT_SQL} = 0`],
    ['rpc_unknown_md5_count_zero', `${P8_RPC_UNKNOWN_MD5_COUNT_SQL} = 0`],
    ['rpc_prosecdef', P8_RPC_PROSECDEF_SQL],
    ['rpc_provolatile_v', P8_RPC_PROVOLATILE_V_SQL],
    ['rpc_proparallel_u', P8_RPC_PROPARALLEL_U_SQL],
    ['rpc_search_path_exact', P8_RPC_SEARCH_PATH_EXACT_SQL],
  ];
  return p8BuildProbeSql(fields);
}

function buildP8PostProbeSql(): string {
  const fields: Array<readonly [string, string]> = [
    ['history_total_count_eight', `${P8_HISTORY_TOTAL_COUNT_SQL} = 8`],
    ['history_distinct_count_eight', `${P8_HISTORY_DISTINCT_COUNT_SQL} = 8`],
    ['history_prefix_exact', p8HistoryPrefixExactSql(P8_POST_HISTORY_VERSIONS_SQL)],
    ['history_duplicate_zero', `${P8_HISTORY_TOTAL_COUNT_SQL} = ${P8_HISTORY_DISTINCT_COUNT_SQL}`],
    ['history_missing_zero', p8HistoryPrefixExactSql(P8_POST_HISTORY_VERSIONS_SQL)],
    ['history_unexpected_zero', `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version <> ALL (${P8_POST_HISTORY_VERSIONS_SQL})) = 0`],
    ['target_version_count_one', "(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version = '20260617000001') = 1"],
    ['clerk_relation_count_one', `${P8_CLERK_RELATION_COUNT_SQL} = 1`],
    ['clerk_ordinary_count_one', `${P8_CLERK_ORDINARY_COUNT_SQL} = 1`],
    ['user_ref_hash_column_count_one', `${P8_USER_REF_HASH_COLUMN_COUNT_SQL} = 1`],
    ['user_ref_hash_column_exact_shape', `${P8_USER_REF_HASH_COLUMN_EXACT_SHAPE_SQL} = 1`],
    ['user_ref_hash_wrong_shape_count_zero', `${P8_USER_REF_HASH_WRONG_SHAPE_COUNT_SQL} = 0`],
    ['named_user_ref_hash_check_count_one', `${P8_NAMED_USER_REF_HASH_CHECK_COUNT_SQL} = 1`],
    ['exact_user_ref_hash_definition_count_one', `${p8ExactUserRefHashDefinitionCountSql()} = 1`],
    ['structural_user_ref_hash_check_count_zero', `${P8_STRUCTURAL_USER_REF_HASH_CHECK_COUNT_SQL} = 0`],
    ['target_index_public_count_one', `${P8_TARGET_INDEX_PUBLIC_COUNT_SQL} = 1`],
    ['target_index_exact_shape', `${P8_TARGET_INDEX_EXACT_SHAPE_SQL} = 1`],
    ['competing_user_ref_hash_index_count_zero', `${P8_COMPETING_USER_REF_HASH_INDEX_COUNT_SQL} = 0`],
    ['named_error_code_check_count_one', `${P8_NAMED_ERROR_CODE_CHECK_COUNT_SQL} = 1`],
    ['exact_post_definition_count_one', `${p8ExactPostErrorCodeDefinitionCountSql()} = 1`],
    ['exact_pre_definition_count_zero', `${p8ExactPreErrorCodeDefinitionCountSql()} = 0`],
    ['unexpected_named_error_code_definition_count_zero', `${p8UnexpectedNamedErrorCodeDefinitionCountSql()} = 0`],
    ['additional_structural_error_code_check_count_zero', `${P8_STRUCTURAL_ERROR_CODE_CHECK_COUNT_SQL} = 0`],
    ['rpc_proname_total_one', `${P8_RPC_PRONAME_TOTAL_SQL} = 1`],
    ['rpc_exact_signature_count_one', `${P8_RPC_EXACT_SIGNATURE_COUNT_SQL} = 1`],
    ['rpc_unexpected_overload_zero', `${P8_RPC_UNEXPECTED_OVERLOAD_COUNT_SQL} = 0`],
    ['rpc_identity_arguments_exact_one', `${P8_RPC_IDENTITY_ARGUMENTS_EXACT_SQL} = 1`],
    ['rpc_post_md5_count_one', `${P8_RPC_POST_MD5_COUNT_SQL} = 1`],
    ['rpc_pre_md5_count_zero', `${P8_RPC_PRE_MD5_COUNT_SQL} = 0`],
    ['rpc_unknown_md5_count_zero', `${P8_RPC_UNKNOWN_MD5_COUNT_SQL} = 0`],
    ['rpc_prosecdef', P8_RPC_PROSECDEF_SQL],
    ['rpc_provolatile_v', P8_RPC_PROVOLATILE_V_SQL],
    ['rpc_proparallel_u', P8_RPC_PROPARALLEL_U_SQL],
    ['rpc_search_path_exact', P8_RPC_SEARCH_PATH_EXACT_SQL],
  ];
  return p8BuildProbeSql(fields);
}

export const P8_PRIOR_PROBE_SQL = buildP8PriorProbeSql();
export const P8_POST_PROBE_SQL = buildP8PostProbeSql();
export const P8_PRIOR_PROBE_SQL_BYTES = 20069 as const;
export const P8_POST_PROBE_SQL_BYTES = 27954 as const;
export const P8_PRIOR_PROBE_SQL_SHA256 =
  '9bea4295bf96d3590f110a0b10609966467f4045878e72ad2c335f5bee6a0623' as const;
export const P8_POST_PROBE_SQL_SHA256 =
  'b308e7872483b7fe2104b42f0312263223336b79e01bc02e002878fdbc0fe244' as const;
export const P8_PRIOR_REQUIRED_FIELDS = [
  'history_total_count_seven',
  'history_distinct_count_seven',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_missing_zero',
  'history_unexpected_zero',
  'target_version_absent',
  'clerk_relation_count_one',
  'clerk_ordinary_count_one',
  'user_ref_hash_column_count_zero',
  'named_user_ref_hash_check_count_zero',
  'structural_user_ref_hash_check_count_zero',
  'target_index_namespace_count_zero',
  'competing_user_ref_hash_index_count_zero',
  'named_error_code_check_count_one',
  'exact_pre_definition_count_one',
  'exact_post_definition_count_zero',
  'unexpected_named_error_code_definition_count_zero',
  'additional_structural_error_code_check_count_zero',
  'rpc_proname_total_one',
  'rpc_exact_signature_count_one',
  'rpc_unexpected_overload_zero',
  'rpc_identity_arguments_exact_one',
  'rpc_pre_md5_count_one',
  'rpc_post_md5_count_zero',
  'rpc_unknown_md5_count_zero',
  'rpc_prosecdef',
  'rpc_provolatile_v',
  'rpc_proparallel_u',
  'rpc_search_path_exact',
  'probe_green',
] as const;
export const P8_POST_REQUIRED_FIELDS = [
  'history_total_count_eight',
  'history_distinct_count_eight',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_missing_zero',
  'history_unexpected_zero',
  'target_version_count_one',
  'clerk_relation_count_one',
  'clerk_ordinary_count_one',
  'user_ref_hash_column_count_one',
  'user_ref_hash_column_exact_shape',
  'user_ref_hash_wrong_shape_count_zero',
  'named_user_ref_hash_check_count_one',
  'exact_user_ref_hash_definition_count_one',
  'structural_user_ref_hash_check_count_zero',
  'target_index_public_count_one',
  'target_index_exact_shape',
  'competing_user_ref_hash_index_count_zero',
  'named_error_code_check_count_one',
  'exact_post_definition_count_one',
  'exact_pre_definition_count_zero',
  'unexpected_named_error_code_definition_count_zero',
  'additional_structural_error_code_check_count_zero',
  'rpc_proname_total_one',
  'rpc_exact_signature_count_one',
  'rpc_unexpected_overload_zero',
  'rpc_identity_arguments_exact_one',
  'rpc_post_md5_count_one',
  'rpc_pre_md5_count_zero',
  'rpc_unknown_md5_count_zero',
  'rpc_prosecdef',
  'rpc_provolatile_v',
  'rpc_proparallel_u',
  'rpc_search_path_exact',
  'probe_green',
] as const;

export type P8ProbeFieldMap = Readonly<Record<string, boolean>>;

export type P8ProbeValidationResult = {
  readonly ok: true;
  readonly probeGreen: true;
  readonly fields: P8ProbeFieldMap;
} | {
  readonly ok: false;
  readonly probeGreen: false;
  readonly fields: P8ProbeFieldMap;
  readonly holdReasonCode: typeof HOLD_P8_POSTCONDITION_MISMATCH;
};

type P8ProbeRow = {
  readonly rowCount: number | null;
  readonly rows: readonly Record<string, unknown>[];
};

function parseP8ProbePayload(result: P8ProbeRow): Record<string, unknown> {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
  }
  const row = result.rows[0]!;
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== P8_PROBE_OUTPUT_COLUMN) {
    throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
  }
  const value = row[P8_PROBE_OUTPUT_COLUMN];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0 || !trimmed.startsWith('{')) {
      throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
    }
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
}

function readP8ProbeBooleanField(payload: Record<string, unknown>, field: string): boolean {
  const value = payload[field];
  if (typeof value !== 'boolean') {
    throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
  }
  return value;
}

function validateP8ProbeFields(
  payload: Record<string, unknown>,
  requiredFields: readonly string[],
): P8ProbeFieldMap {
  const keys = Object.keys(payload).sort();
  const expected = [...requiredFields].sort();
  if (keys.length !== expected.length) {
    throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== expected[index]) {
      throw new Error(HOLD_P8_POSTCONDITION_MISMATCH);
    }
  }
  const fields: Record<string, boolean> = {};
  for (const field of requiredFields) {
    fields[field] = readP8ProbeBooleanField(payload, field);
  }
  return fields;
}

function finalizeP8ProbeValidation(fields: P8ProbeFieldMap): P8ProbeValidationResult {
  const probeGreen = fields.probe_green === true;
  const allRequiredTrue = Object.values(fields).every((entry) => entry === true);
  if (probeGreen && allRequiredTrue) {
    return { ok: true, probeGreen: true, fields };
  }
  return {
    ok: false,
    probeGreen: false,
    fields,
    holdReasonCode: HOLD_P8_POSTCONDITION_MISMATCH,
  };
}

export function validateP8PriorProbeResult(result: P8ProbeRow): P8ProbeValidationResult {
  const payload = parseP8ProbePayload(result);
  const fields = validateP8ProbeFields(payload, P8_PRIOR_REQUIRED_FIELDS);
  return finalizeP8ProbeValidation(fields);
}

export function validateP8PostProbeResult(result: P8ProbeRow): P8ProbeValidationResult {
  const payload = parseP8ProbePayload(result);
  const fields = validateP8ProbeFields(payload, P8_POST_REQUIRED_FIELDS);
  return finalizeP8ProbeValidation(fields);
}

export function buildMockP8PriorProbeRow(overrides: Partial<P8ProbeFieldMap> = {}): P8ProbeRow {
  const fields = Object.fromEntries(
    P8_PRIOR_REQUIRED_FIELDS.map((field) => [field, overrides[field] ?? true]),
  ) as Record<string, boolean>;
  if (!('probe_green' in overrides)) {
    fields.probe_green = P8_PRIOR_REQUIRED_FIELDS.every((field) => fields[field] === true);
  }
  return {
    rowCount: 1,
    rows: [{ [P8_PROBE_OUTPUT_COLUMN]: fields }],
  };
}

export function buildMockP8PostProbeRow(overrides: Partial<P8ProbeFieldMap> = {}): P8ProbeRow {
  const fields = Object.fromEntries(
    P8_POST_REQUIRED_FIELDS.map((field) => [field, overrides[field] ?? true]),
  ) as Record<string, boolean>;
  if (!('probe_green' in overrides)) {
    fields.probe_green = P8_POST_REQUIRED_FIELDS.every((field) => fields[field] === true);
  }
  return {
    rowCount: 1,
    rows: [{ [P8_PROBE_OUTPUT_COLUMN]: fields }],
  };
}

export const P8_SUCCESSFUL_TERMINAL_OUTCOME =
  'HUMAN_REVIEW_REQUIRED_FOR_CORRELATION_MIGRATION_COMPLETION' as const;

export type DedicatedP8SelectionError =
  | 'HOLD_DEDICATED_STEP_EMPTY'
  | 'HOLD_DEDICATED_STEP_ALL_FORBIDDEN'
  | 'HOLD_DEDICATED_STEP_MULTI_FORBIDDEN'
  | 'HOLD_DEDICATED_STEP_DUPLICATE'
  | 'HOLD_DEDICATED_STEP_UNKNOWN'
  | 'HOLD_DEDICATED_STEP_NOT_P8';

export type DedicatedP8SelectionResult =
  | { readonly ok: true; readonly stepId: typeof P8_STEP_ID }
  | { readonly ok: false; readonly error: DedicatedP8SelectionError };

export type P8DedicatedTransactionPlanOutline = {
  readonly beginCount: 1;
  readonly transactionCount: 1;
  readonly commitCount: 1;
  readonly p1ThroughP7StatementCount: 0;
  readonly targetStatementCount: typeof P8_NORMALIZED_STATEMENT_COUNT;
  readonly historyInsertCount: 1;
  readonly orderedPhases: readonly [
    'BEGIN',
    'PRIOR_PROBE',
    'MUTATION',
    'HISTORY_INSERT',
    'POST_PROBE',
    'COMMIT',
  ];
};

export function normalizeDedicatedStepTokens(
  raw: string | readonly string[] | null | undefined,
): readonly string[] {
  if (raw === null || raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry: string) => entry.trim()).filter((entry: string) => entry.length > 0);
  }
  if (typeof raw !== 'string') {
    return [];
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function validateDedicatedP8StepSelection(
  raw: string | readonly string[] | null | undefined,
): DedicatedP8SelectionResult {
  const tokens = normalizeDedicatedStepTokens(raw);
  if (tokens.length === 0) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_EMPTY' };
  }
  if (tokens.some((token) => token.toUpperCase() === 'ALL')) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_ALL_FORBIDDEN' };
  }
  if (tokens.length !== 1) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_MULTI_FORBIDDEN' };
  }
  const token = tokens[0]!;
  if (token !== P8_STEP_ID) {
    if (/^P[1-8]$/.test(token)) {
      return { ok: false, error: 'HOLD_DEDICATED_STEP_NOT_P8' };
    }
    return { ok: false, error: 'HOLD_DEDICATED_STEP_UNKNOWN' };
  }
  return { ok: true, stepId: P8_STEP_ID };
}

export function validateDedicatedP8StepSelectionList(
  raw: readonly string[],
): DedicatedP8SelectionResult {
  if (raw.length === 0) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_EMPTY' };
  }
  const p8Count = raw.filter((entry) => entry === P8_STEP_ID).length;
  if (p8Count > 1) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_DUPLICATE' };
  }
  return validateDedicatedP8StepSelection(raw.join(','));
}

export function buildP8DedicatedTransactionPlanOutline(): P8DedicatedTransactionPlanOutline {
  return {
    beginCount: 1,
    transactionCount: 1,
    commitCount: 1,
    p1ThroughP7StatementCount: 0,
    targetStatementCount: P8_NORMALIZED_STATEMENT_COUNT,
    historyInsertCount: 1,
    orderedPhases: ['BEGIN', 'PRIOR_PROBE', 'MUTATION', 'HISTORY_INSERT', 'POST_PROBE', 'COMMIT'],
  };
}

export function isP8StepId(stepId: StepId): stepId is typeof P8_STEP_ID {
  return stepId === P8_STEP_ID;
}

export function buildP8NormalizedStatements(repoRoot: string): readonly string[] {
  const path = join(repoRoot, P8_MIGRATION_REL_PATH);
  const rawBytes = readFileSync(path);
  validateMigrationSourceBytes(rawBytes, P8_MIGRATION_SHA256, P8_STEP_ID);
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  if (statements.length !== P8_ORIGINAL_STATEMENT_COUNT) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  if (compositeStreamSha256(statements) !== P8_NORMALIZED_STREAM_COMPOSITE_SHA256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return statements;
}

export type ExecutionDisablementFlags = {
  readonly executionAuthorized: false;
  readonly remoteConnectionAttempted: false;
  readonly sqlExecuted: false;
  readonly migrationApplyAuthorized: false;
  readonly productionAccessAuthorized: false;
  readonly automaticNextGate: false;
  readonly transportCallCount: 0;
};

export type PreviewRemoteApplyPlanSuccess = ExecutionDisablementFlags & {
  readonly mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN';
  readonly holdReasonCode: null;
  readonly repository: RepositoryIdentityFacts;
  readonly target: TargetIdentityBinding;
  readonly bootstrapPrecondition: BootstrapPreconditionBinding;
  readonly bootstrapSpecId: string;
  readonly bootstrapSpecCanonicalPayloadSha256: string;
  readonly timeoutPolicyId: string;
  readonly timeoutPolicyCanonicalPayloadSha256: string;
  readonly runtimeProbeRegistryId: string;
  readonly runtimeProbeRegistryCanonicalPayloadSha256: string;
  readonly steps: readonly DeterministicPlanStep[];
};

export type PreviewRemoteApplyPlanHold = ExecutionDisablementFlags & {
  readonly mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD';
  readonly holdReasonCode: PreviewRemoteApplyHoldCode;
};

export type PreviewRemoteApplyPlanResult = PreviewRemoteApplyPlanSuccess | PreviewRemoteApplyPlanHold;

export type PlanCliPublicOutput = PreviewRemoteApplyPlanResult;

export type ExecutionAuthority = {
  readonly __executionAuthorityBrand: unique symbol;
};

export function canonicalSerializePreviewRemoteApply(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalSerializePreviewRemoteApply(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalSerializePreviewRemoteApply(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}
