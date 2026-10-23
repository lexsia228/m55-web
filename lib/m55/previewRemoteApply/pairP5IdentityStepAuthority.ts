import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  compositeStreamSha256,
  STATEMENT_STREAM_SERIALIZATION,
} from '../transactionNormalized/statementStream.ts';
import { validateMigrationSourceBytes } from '../transactionNormalized/transactionNormalizedCore.ts';
import { PAIR_P5_LEDGER_MIGRATION_VERSION } from './pairP5DedicatedReceiptConsumptionLedger.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export const PAIR_P5_IDENTITY_STEP_ID = 'PAIR_P5_IDENTITY_20261009' as const;
export type PairP5CallableStepId = typeof PAIR_P5_IDENTITY_STEP_ID;

export const PAIR_P5_EXPECTED_REPO_ROOT =
  '/Users/lexsia/Documents/M55_WORKTREE-pair-p5-owned-state-identity-v1' as const;
export const PAIR_P5_EXPECTED_BRANCH = 'feat/m55-pair-p5-owned-state-identity-v1' as const;
export const PAIR_P5_EXPECTED_HEAD_COMMIT_SHA =
  'e56066890f1d3e091fe13caa0ecd10360cb0b724' as const;
export const PAIR_P5_APPROVED_PREVIEW_PROJECT_REF = 'sbogwyzldjxxouhqtpnq' as const;

export const PAIR_P5_IDENTITY_MIGRATION_VERSION = '20261009000000' as const;
export const PAIR_P5_IDENTITY_MIGRATION_NAME = 'm55_pair_owned_state_identity_v1' as const;
export const PAIR_P5_IDENTITY_MIGRATION_REL_PATH =
  'supabase/migrations/20261009000000_m55_pair_owned_state_identity_v1.sql' as const;
export const PAIR_P5_IDENTITY_MIGRATION_BYTES = 6917 as const;
export const PAIR_P5_IDENTITY_MIGRATION_SHA256 =
  '193dee681b3e96c092729e563a69b3d3c47e6971a46928c7eddedf42849182fe' as const;
export const PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT = 18 as const;
export const PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256 =
  '879366be1ce81a662562b243a4a09d070593966801d88c350434db25ed6e666b' as const;

/** Frozen metadata only — not callable in this gate. P5-2 remains NOT_EXECUTION_READY. */
export const PAIR_P5_FROZEN_NON_CALLABLE_STEPS = {
  P5_2_CHECKOUT_RESERVATION: {
    version: '20261010000000',
    name: 'm55_pair_checkout_reservation_v1',
    sha256: 'f68bf6438267713ea0c14583191a6614a7a602a003b43e814c4d34561dae6640',
    executionReady: false as const,
  },
  P5_3_FULFILL_ADVISORY: {
    version: '20261013110000',
    name: 'm55_pair_fulfill_tuple_advisory_v1',
    sha256: '82b74bfee724ef231062644dd9d5d51b0c5b68060ed0a05da28337d64bb42e75',
  },
} as const;

export const PAIR_P5_PRE_P2_HISTORY_VERSIONS = [
  '20260614000000',
  '20260615000001',
  '20260615000002',
  '20260615000003',
  '20260615000004',
  '20260615000005',
  '20260615000006',
  '20260617000001',
  '20260626000000',
  '20260713000000',
  '20260914000000',
  '20260919000000',
  '20260920000000',
  '20260921000000',
  '20260922000000',
  '20260923000000',
] as const;

/** R7 Preview D1–D5 (exact versions; must match applied migration history). */
export const PAIR_P5_R7_PREVIEW_DELTA_HISTORY_VERSIONS = [
  '20260924000000',
  '20260927000000',
  '20260927100000',
  '20260927200000',
  '20261008000000',
] as const;

/** Pair P5 dedicated receipt ledger (between R7 D5 and frozen P5-1 identity). */
export const PAIR_P5_LEDGER_HISTORY_VERSION = PAIR_P5_LEDGER_MIGRATION_VERSION;

/** PRE for P5-1 identity apply: Preview baseline 16 + R7 five + ledger one. */
export const PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS = [
  ...PAIR_P5_PRE_P2_HISTORY_VERSIONS,
  ...PAIR_P5_R7_PREVIEW_DELTA_HISTORY_VERSIONS,
  PAIR_P5_LEDGER_HISTORY_VERSION,
] as const;

export const PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS = [
  ...PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
] as const;

export const PAIR_P5_PROBE_OUTPUT_COLUMN = 'json_build_object' as const;
export const HOLD_PAIR_P5_PROBE_MISMATCH = 'HOLD_PAIR_P5_PROBE_MISMATCH' as const;

const HISTORY_TOTAL_SQL = '(SELECT count(*)::int FROM supabase_migrations.schema_migrations)';
const HISTORY_DISTINCT_SQL =
  '(SELECT count(DISTINCT version)::int FROM supabase_migrations.schema_migrations)';

function sqlTextArray(versions: readonly string[]): string {
  return `ARRAY[${versions.map((version) => `'${version}'::text`).join(',')}]`;
}

function historyPrefixExactSql(versions: readonly string[]): string {
  const versionsSql = sqlTextArray(versions);
  return `(COALESCE((SELECT array_agg(version::text ORDER BY version::text) FROM supabase_migrations.schema_migrations WHERE version::text = ANY (${versionsSql})), ARRAY[]::text[]) = ${versionsSql})`;
}

const CPC_REL_OID_SQL =
  "(SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r')";

const IL_REL_OID_SQL =
  "(SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_report_identity_links' AND c.relkind = 'r')";

const OWNED_REPORTS_REL_OID_SQL =
  "(SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_reports' AND c.relkind = 'r')";

/**
 * Frozen pg_get_constraintdef(oid, false) contract from disposable-PG preapply reference
 * (`20261010000000_m55_pair_checkout_reservation_v1.sql`, v_identity_check_def).
 */
export const PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE =
  'CHECK ((((pair_identity_id IS NULL) AND (paid_context_id IS NULL)) OR ((pair_identity_id IS NOT NULL) AND (paid_context_id IS NOT NULL))))' as const;

const CPC_BASELINE_CHECK_NAMES_SQL =
  "ARRAY['compatibility_purchase_contexts_check'::text,'compatibility_purchase_contexts_owner_user_id_check'::text,'compatibility_purchase_contexts_product_key_check'::text,'compatibility_purchase_contexts_snapshot_version_check'::text,'compatibility_purchase_contexts_status_check'::text,'compatibility_purchase_contexts_identity_pair_check'::text]";

function cpcColumnCountSql(columnName: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r' AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped)`;
}

function cpcNamedCheckCountSql(constraintName: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname = '${constraintName}')`;
}

function publicOrdinaryTableCountSql(relname: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${relname}' AND c.relkind = 'r')`;
}

function publicWrongRelkindSameNameZeroSql(relname: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${relname}' AND c.relkind <> 'r') = 0`;
}

/** Ordinary heap indexes use pg_class.relkind = 'i' (not 'r'). */
function publicWrongRelkindIndexSameNameZeroSql(indexRelname: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${indexRelname}' AND c.relkind <> 'i') = 0`;
}

/** PostgreSQL trigger type mask: ROW(1) + BEFORE(2) + UPDATE(16) = 19. */
export const PAIR_P5_PG_TRIGGER_BEFORE_UPDATE_ROW_TGTYPE = 19 as const;

function cpcUuidColumnShapeSql(columnName: string, expectNullable: boolean): string {
  const nullSql = expectNullable ? 'NOT a.attnotnull' : 'a.attnotnull';
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r' AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'uuid' AND ${nullSql}) = 1`;
}

function identityPairCheckDefinitionSql(): string {
  const escapedDef = PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE.replace(/'/g, "''");
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname = 'compatibility_purchase_contexts_identity_pair_check' AND con.convalidated = true AND pg_catalog.pg_get_constraintdef(con.oid, false) = '${escapedDef}') = 1`;
}

function ilColumnShapeSql(
  columnName: string,
  typeName: string,
  expectNotNull: boolean,
  expectDefaultNow: boolean,
): string {
  const nullSql = expectNotNull ? 'a.attnotnull' : 'NOT a.attnotnull';
  const defaultSql = expectDefaultNow
    ? "pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) LIKE '%now()%'"
    : 'ad.adbin IS NULL';
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum WHERE n.nspname = 'public' AND c.oid = ${IL_REL_OID_SQL} AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = '${typeName}' AND ${nullSql} AND ${defaultSql}) = 1`;
}

function buildProbeSql(
  greenFields: ReadonlyArray<readonly [string, string]>,
  informationalFields: ReadonlyArray<readonly [string, string]> = [],
): string {
  const allFields = [...greenFields, ...informationalFields];
  const entries = allFields.map(([name, expression]) => `  '${name}', (${expression})`);
  const probeGreen = greenFields.map(([, expression]) => `(${expression})`).join(' AND ');
  entries.push(`  'probe_green', (${probeGreen})`);
  return `SELECT json_build_object(\n${entries.join(',\n')}\n) AS json_build_object`;
}

const PRIOR_HISTORY_VERSIONS_SQL = sqlTextArray(PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS);
const POST_HISTORY_VERSIONS_SQL = sqlTextArray(PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS);
const P5_TARGET_VERSIONS_SQL = sqlTextArray([
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS.P5_2_CHECKOUT_RESERVATION.version,
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS.P5_3_FULFILL_ADVISORY.version,
]);

function buildPairP5PriorProbeSql(): string {
  const fields: Array<readonly [string, string]> = [
    ['history_total_twenty_two', `${HISTORY_TOTAL_SQL} = 22`],
    ['history_distinct_twenty_two', `${HISTORY_DISTINCT_SQL} = 22`],
    [
      'history_prefix_exact',
      historyPrefixExactSql(PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS),
    ],
    ['history_duplicate_zero', `${HISTORY_TOTAL_SQL} = ${HISTORY_DISTINCT_SQL}`],
    ['history_unexpected_zero', `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text <> ALL (${PRIOR_HISTORY_VERSIONS_SQL})) = 0`],
    ['p5_target_versions_absent', `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = ANY (${P5_TARGET_VERSIONS_SQL})) = 0`],
    [
      'dedicated_receipt_ledger_table_ordinary_one',
      `${publicOrdinaryTableCountSql('m55_pair_p5_dedicated_receipt_consumption_v1')} = 1`,
    ],
    ['pair_identity_column_absent', `${cpcColumnCountSql('pair_identity_id')} = 0`],
    ['paid_context_column_absent', `${cpcColumnCountSql('paid_context_id')} = 0`],
    ['identity_pair_check_absent', `${cpcNamedCheckCountSql('compatibility_purchase_contexts_identity_pair_check')} = 0`],
    [
      'identity_links_table_absent',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_report_identity_links' AND c.relkind = 'r') = 0",
    ],
    ['p52_reservation_column_absent', `${cpcColumnCountSql('checkout_origin_frozen')} = 0`],
    [
      'pending_tuple_index_absent',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx') = 0",
    ],
    [
      'reserve_rpc_absent',
      "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_reserve_compatibility_checkout_v1') = 0",
    ],
    ['baseline_cpc_table_ordinary_one', `${publicOrdinaryTableCountSql('compatibility_purchase_contexts')} = 1`],
    [
      'baseline_owned_reports_ordinary_one',
      `${publicOrdinaryTableCountSql('compatibility_owned_reports')} = 1`,
    ],
    ['cpc_wrong_relkind_same_name_zero', publicWrongRelkindSameNameZeroSql('compatibility_purchase_contexts')],
    [
      'identity_links_wrong_relkind_same_name_zero',
      publicWrongRelkindSameNameZeroSql('compatibility_owned_report_identity_links'),
    ],
  ];
  return buildProbeSql(fields);
}

const IL_PARTIAL_UNIQUE_INDEX_SHAPE_SQL = `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid JOIN pg_catalog.pg_namespace in_ns ON in_ns.oid = ic.relnamespace JOIN pg_catalog.pg_namespace tbl_ns ON tbl_ns.oid = rc.relnamespace WHERE in_ns.nspname = 'public' AND tbl_ns.nspname = 'public' AND ic.relname = 'compatibility_owned_report_identity_exact_ctx_idx' AND rc.relname = 'compatibility_owned_report_identity_links' AND ic.relkind = 'i' AND rc.relkind = 'r' AND i.indrelid = rc.oid AND i.indisunique AND i.indisvalid AND i.indisready AND i.indislive AND i.indnatts = 3 AND i.indnkeyatts = 3 AND i.indexprs IS NULL AND i.indpred IS NOT NULL AND pg_catalog.pg_get_expr(i.indpred, i.indrelid, true) = 'paid_context_id IS NOT NULL' AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped WHERE k.ord = 1 AND att.attname = 'owner_user_id') AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped WHERE k.ord = 2 AND att.attname = 'pair_identity_id') AND EXISTS (SELECT 1 FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = rc.oid AND att.attnum = k.attnum AND NOT att.attisdropped WHERE k.ord = 3 AND att.attname = 'paid_context_id')) = 1`;

function buildPairP5PostProbeSql(): string {
  const greenFields: Array<readonly [string, string]> = [
    ['history_total_twenty_three', `${HISTORY_TOTAL_SQL} = 23`],
    ['history_distinct_twenty_three', `${HISTORY_DISTINCT_SQL} = 23`],
    ['history_prefix_exact', historyPrefixExactSql(PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS)],
    ['history_duplicate_zero', `${HISTORY_TOTAL_SQL} = ${HISTORY_DISTINCT_SQL}`],
    [
      'history_unexpected_zero',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text <> ALL (${POST_HISTORY_VERSIONS_SQL})) = 0`,
    ],
    [
      'target_version_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_IDENTITY_MIGRATION_VERSION}') = 1`,
    ],
    ['pair_identity_column_present', `${cpcColumnCountSql('pair_identity_id')} = 1`],
    ['paid_context_column_present', `${cpcColumnCountSql('paid_context_id')} = 1`],
    ['pair_identity_uuid_nullable', cpcUuidColumnShapeSql('pair_identity_id', true)],
    ['paid_context_uuid_nullable', cpcUuidColumnShapeSql('paid_context_id', true)],
    ['identity_pair_check_definition_exact', identityPairCheckDefinitionSql()],
    [
      'baseline_five_checks_validated',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname IN ('compatibility_purchase_contexts_check','compatibility_purchase_contexts_owner_user_id_check','compatibility_purchase_contexts_product_key_check','compatibility_purchase_contexts_snapshot_version_check','compatibility_purchase_contexts_status_check') AND con.convalidated = true) = 5`,
    ],
    [
      'unexpected_cpc_check_zero',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname <> ALL (${CPC_BASELINE_CHECK_NAMES_SQL})) = 0`,
    ],
    [
      'identity_links_ordinary_table',
      `(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_report_identity_links' AND c.relkind = 'r') = 1`,
    ],
    [
      'identity_links_wrong_relkind_zero',
      publicWrongRelkindSameNameZeroSql('compatibility_owned_report_identity_links'),
    ],
    [
      'identity_links_rls_enabled_force_disabled',
      `(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.oid = ${IL_REL_OID_SQL} AND c.relrowsecurity = true AND c.relforcerowsecurity = false) = 1`,
    ],
    ['identity_links_column_count_exact_seven', `(SELECT count(*)::int FROM pg_catalog.pg_attribute a WHERE a.attrelid = ${IL_REL_OID_SQL} AND a.attnum > 0 AND NOT a.attisdropped) = 7`],
    ['identity_links_report_id_shape', ilColumnShapeSql('report_id', 'uuid', true, false)],
    ['identity_links_owner_user_id_shape', ilColumnShapeSql('owner_user_id', 'text', true, false)],
    ['identity_links_pair_identity_id_shape', ilColumnShapeSql('pair_identity_id', 'uuid', true, false)],
    ['identity_links_paid_context_id_shape', ilColumnShapeSql('paid_context_id', 'uuid', false, false)],
    ['identity_links_identity_version_shape', ilColumnShapeSql('identity_version', 'text', true, false)],
    ['identity_links_source_shape', ilColumnShapeSql('source', 'text', true, false)],
    ['identity_links_created_at_shape', ilColumnShapeSql('created_at', 'timestamptz', true, true)],
    [
      'identity_links_report_owner_fk_validated',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${IL_REL_OID_SQL} AND con.contype = 'f' AND con.conname = 'compatibility_owned_report_identity_links_report_owner_fk' AND con.convalidated = true AND con.confrelid = ${OWNED_REPORTS_REL_OID_SQL} AND con.confdeltype = 'c' AND con.confupdtype = 'a') = 1`,
    ],
    [
      'identity_links_fk_source_columns_ordered',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${IL_REL_OID_SQL} AND con.conname = 'compatibility_owned_report_identity_links_report_owner_fk' AND (SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum AND NOT att.attisdropped) = ARRAY['report_id','owner_user_id']::name[]) = 1`,
    ],
    [
      'identity_links_fk_target_columns_ordered',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${IL_REL_OID_SQL} AND con.conname = 'compatibility_owned_report_identity_links_report_owner_fk' AND (SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = u.attnum AND NOT att.attisdropped) = ARRAY['id','owner_user_id']::name[]) = 1`,
    ],
    ['identity_links_partial_unique_index_shape', IL_PARTIAL_UNIQUE_INDEX_SHAPE_SQL],
    [
      'identity_links_partial_unique_index_wrong_relkind_zero',
      publicWrongRelkindIndexSameNameZeroSql('compatibility_owned_report_identity_exact_ctx_idx'),
    ],
    [
      'identity_links_immutable_trigger_contract',
      `(SELECT count(*)::int FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace WHERE t.tgrelid = ${IL_REL_OID_SQL} AND NOT t.tgisinternal AND t.tgname = 'compatibility_owned_report_identity_immutable' AND t.tgenabled IN ('O', 'A') AND t.tgtype = ${PAIR_P5_PG_TRIGGER_BEFORE_UPDATE_ROW_TGTYPE} AND p.proname = 'm55_compatibility_owned_report_identity_immutable_v1' AND p.pronargs = 0 AND p.prosecdef = false AND p.proconfig @> ARRAY['search_path=public, pg_temp'] AND pn.nspname = 'public') = 1`,
    ],
    [
      'identity_links_immutable_function_single_overload',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_compatibility_owned_report_identity_immutable_v1') = 1`,
    ],
    [
      'snapshot_trigger_contract',
      `(SELECT count(*)::int FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid WHERE t.tgrelid = ${CPC_REL_OID_SQL} AND NOT t.tgisinternal AND t.tgname = 'compatibility_purchase_context_snapshot_immutable' AND t.tgenabled IN ('O', 'A') AND t.tgtype = ${PAIR_P5_PG_TRIGGER_BEFORE_UPDATE_ROW_TGTYPE} AND p.proname = 'm55_compatibility_snapshot_columns_immutable_v1' AND p.pronargs = 0 AND p.prosecdef = false AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1`,
    ],
    [
      'snapshot_immutable_function_single_overload',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_compatibility_snapshot_columns_immutable_v1') = 1`,
    ],
    [
      'owned_reports_composite_unique_validated',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${OWNED_REPORTS_REL_OID_SQL} AND con.contype = 'u' AND con.conname = 'compatibility_owned_reports_id_owner_unique' AND con.convalidated = true AND (SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum AND NOT att.attisdropped) = ARRAY['id','owner_user_id']::name[]) = 1`,
    ],
    [
      'fulfill_rpc_exact_signature',
      "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)')) = 1",
    ],
    [
      'fulfill_rpc_security_definer',
      "(SELECT COALESCE((SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)')), false)) = true",
    ],
    [
      'fulfill_rpc_search_path_configured',
      "(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)') AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1",
    ],
    [
      'fulfill_rpc_execute_service_role_only_public',
      "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)') AND has_function_privilege('service_role', p.oid, 'EXECUTE') AND NOT has_function_privilege('PUBLIC', p.oid, 'EXECUTE') AND NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')) = 1",
    ],
    [
      'identity_links_service_role_table_grants_exact',
      "((SELECT count(*)::int FROM (VALUES ('SELECT'), ('INSERT'), ('DELETE')) AS req(priv) WHERE NOT has_table_privilege('service_role', 'public.compatibility_owned_report_identity_links', req.priv)) = 0 AND (SELECT count(*)::int FROM (VALUES ('UPDATE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS forbid(priv) WHERE has_table_privilege('service_role', 'public.compatibility_owned_report_identity_links', forbid.priv)) = 0)",
    ],
    [
      'identity_links_forbidden_table_grants_zero',
      "(SELECT count(*)::int FROM (VALUES ('anon'), ('authenticated'), ('PUBLIC')) AS roles(role_name) CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privs(priv) WHERE has_table_privilege(roles.role_name, 'public.compatibility_owned_report_identity_links', privs.priv)) = 0",
    ],
    ['p52_reservation_column_absent', `${cpcColumnCountSql('checkout_origin_frozen')} = 0`],
    [
      'pending_tuple_index_absent',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx') = 0",
    ],
    [
      'reservation_rpcs_absent',
      "(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('m55_reserve_compatibility_checkout_v1','m55_classify_pending_checkout_context_v1','m55_acquire_compatibility_checkout_create_slot_v1','m55_cas_attach_compatibility_checkout_session_v1','m55_cas_release_compatibility_checkout_expired_v1')) = 0",
    ],
  ];
  const informationalFields: Array<readonly [string, string]> = [
    ['fulfill_rpc_prosrc_fingerprint_pinned', '(false)'],
    ['snapshot_trigger_function_body_fingerprint_pinned', '(false)'],
  ];
  return buildProbeSql(greenFields, informationalFields);
}

export const PAIR_P5_PRIOR_PROBE_SQL = buildPairP5PriorProbeSql();
export const PAIR_P5_POST_PROBE_SQL = buildPairP5PostProbeSql();

/** Independently measured digests of `PAIR_P5_*_PROBE_SQL` byte strings. */
export const PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL =
  '5f9b3fa5e63181ede9faeeee6f60f2861749734244cd25347053b4d3abe82f50' as const;
export const PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL =
  'd135fd5a6aad8e50983ba46f3230c0825ac0b52730acac1e0f8d2e6987076875' as const;

export const PAIR_P5_PRIOR_PROBE_SQL_SHA256 = PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL;
export const PAIR_P5_POST_PROBE_SQL_SHA256 = PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL;

function digestPairP5ProbeSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export function assertPairP5ProbeSqlPinnedIntegrity(): void {
  const priorDigest = digestPairP5ProbeSql(PAIR_P5_PRIOR_PROBE_SQL);
  const postDigest = digestPairP5ProbeSql(PAIR_P5_POST_PROBE_SQL);
  if (priorDigest !== PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_PRIOR_PROBE_SQL_SHA256_MISMATCH');
  }
  if (postDigest !== PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_POST_PROBE_SQL_SHA256_MISMATCH');
  }
}

assertPairP5ProbeSqlPinnedIntegrity();

export const PAIR_P5_PRIOR_REQUIRED_PROBE_FIELDS = [
  'history_total_twenty_two',
  'history_distinct_twenty_two',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_unexpected_zero',
  'p5_target_versions_absent',
  'dedicated_receipt_ledger_table_ordinary_one',
  'pair_identity_column_absent',
  'paid_context_column_absent',
  'identity_pair_check_absent',
  'identity_links_table_absent',
  'p52_reservation_column_absent',
  'pending_tuple_index_absent',
  'reserve_rpc_absent',
  'baseline_cpc_table_ordinary_one',
  'baseline_owned_reports_ordinary_one',
  'cpc_wrong_relkind_same_name_zero',
  'identity_links_wrong_relkind_same_name_zero',
  'probe_green',
] as const;

export const PAIR_P5_POST_INFORMATIONAL_PROBE_FIELDS = [
  'fulfill_rpc_prosrc_fingerprint_pinned',
  'snapshot_trigger_function_body_fingerprint_pinned',
] as const;

export const PAIR_P5_POST_GREEN_PROBE_FIELDS = [
  'history_total_twenty_three',
  'history_distinct_twenty_three',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_unexpected_zero',
  'target_version_present_once',
  'pair_identity_column_present',
  'paid_context_column_present',
  'pair_identity_uuid_nullable',
  'paid_context_uuid_nullable',
  'identity_pair_check_definition_exact',
  'baseline_five_checks_validated',
  'unexpected_cpc_check_zero',
  'identity_links_ordinary_table',
  'identity_links_wrong_relkind_zero',
  'identity_links_rls_enabled_force_disabled',
  'identity_links_column_count_exact_seven',
  'identity_links_report_id_shape',
  'identity_links_owner_user_id_shape',
  'identity_links_pair_identity_id_shape',
  'identity_links_paid_context_id_shape',
  'identity_links_identity_version_shape',
  'identity_links_source_shape',
  'identity_links_created_at_shape',
  'identity_links_report_owner_fk_validated',
  'identity_links_fk_source_columns_ordered',
  'identity_links_fk_target_columns_ordered',
  'identity_links_partial_unique_index_shape',
  'identity_links_partial_unique_index_wrong_relkind_zero',
  'identity_links_immutable_trigger_contract',
  'identity_links_immutable_function_single_overload',
  'snapshot_trigger_contract',
  'snapshot_immutable_function_single_overload',
  'owned_reports_composite_unique_validated',
  'fulfill_rpc_exact_signature',
  'fulfill_rpc_security_definer',
  'fulfill_rpc_search_path_configured',
  'fulfill_rpc_execute_service_role_only_public',
  'identity_links_service_role_table_grants_exact',
  'identity_links_forbidden_table_grants_zero',
  'p52_reservation_column_absent',
  'pending_tuple_index_absent',
  'reservation_rpcs_absent',
] as const;

export const PAIR_P5_POST_REQUIRED_PROBE_FIELDS = [
  ...PAIR_P5_POST_GREEN_PROBE_FIELDS,
  ...PAIR_P5_POST_INFORMATIONAL_PROBE_FIELDS,
  'probe_green',
] as const;

export type PairP5ProbeFieldMap = Readonly<Record<string, boolean>>;

export type PairP5ProbeValidationResult =
  | { readonly ok: true; readonly probeGreen: true; readonly fields: PairP5ProbeFieldMap }
  | {
      readonly ok: false;
      readonly probeGreen: false;
      readonly fields: PairP5ProbeFieldMap;
      readonly holdReasonCode: typeof HOLD_PAIR_P5_PROBE_MISMATCH;
    };

type PairP5ProbeRow = {
  readonly rowCount: number | null;
  readonly rows: readonly Record<string, unknown>[];
};

function parsePairP5ProbePayload(result: PairP5ProbeRow): Record<string, unknown> {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
  }
  const row = result.rows[0]!;
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== PAIR_P5_PROBE_OUTPUT_COLUMN) {
    throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
  }
  const value = row[PAIR_P5_PROBE_OUTPUT_COLUMN];
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
}

function validatePairP5ProbeFields(
  payload: Record<string, unknown>,
  requiredFields: readonly string[],
): PairP5ProbeFieldMap {
  const keys = Object.keys(payload).sort();
  const expected = [...requiredFields].sort();
  if (keys.length !== expected.length) {
    throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== expected[index]) {
      throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
    }
  }
  const fields: Record<string, boolean> = {};
  for (const field of requiredFields) {
    const value = payload[field];
    if (typeof value !== 'boolean') {
      throw new Error(HOLD_PAIR_P5_PROBE_MISMATCH);
    }
    fields[field] = value;
  }
  return fields;
}

function finalizePairP5ProbeValidation(
  fields: PairP5ProbeFieldMap,
  greenFieldNames: readonly string[],
): PairP5ProbeValidationResult {
  const probeGreen = fields.probe_green === true;
  const greensOk = greenFieldNames.every((name) => fields[name] === true);
  if (probeGreen && greensOk) {
    return { ok: true, probeGreen: true, fields };
  }
  return {
    ok: false,
    probeGreen: false,
    fields,
    holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
  };
}

export function validatePairP5PriorProbeResult(result: PairP5ProbeRow): PairP5ProbeValidationResult {
  const payload = parsePairP5ProbePayload(result);
  const fields = validatePairP5ProbeFields(payload, PAIR_P5_PRIOR_REQUIRED_PROBE_FIELDS);
  const greenNames = PAIR_P5_PRIOR_REQUIRED_PROBE_FIELDS.filter((field) => field !== 'probe_green');
  return finalizePairP5ProbeValidation(fields, greenNames);
}

export function validatePairP5PostProbeResult(result: PairP5ProbeRow): PairP5ProbeValidationResult {
  const payload = parsePairP5ProbePayload(result);
  const fields = validatePairP5ProbeFields(payload, PAIR_P5_POST_REQUIRED_PROBE_FIELDS);
  return finalizePairP5ProbeValidation(fields, PAIR_P5_POST_GREEN_PROBE_FIELDS);
}

export function buildMockPairP5PriorProbeRow(
  overrides: Partial<PairP5ProbeFieldMap> = {},
): PairP5ProbeRow {
  const fields = Object.fromEntries(
    PAIR_P5_PRIOR_REQUIRED_PROBE_FIELDS.map((field) => [field, overrides[field] ?? true]),
  ) as Record<string, boolean>;
  if (!('probe_green' in overrides)) {
    const greenNames = PAIR_P5_PRIOR_REQUIRED_PROBE_FIELDS.filter((field) => field !== 'probe_green');
    fields.probe_green = greenNames.every((field) => fields[field] === true);
  }
  return { rowCount: 1, rows: [{ [PAIR_P5_PROBE_OUTPUT_COLUMN]: fields }] };
}

export function buildMockPairP5PostProbeRow(
  overrides: Partial<PairP5ProbeFieldMap> = {},
): PairP5ProbeRow {
  const informational = new Set<string>(PAIR_P5_POST_INFORMATIONAL_PROBE_FIELDS);
  const fields = Object.fromEntries(
    PAIR_P5_POST_REQUIRED_PROBE_FIELDS.map((field) => {
      if (field === 'probe_green') {
        return [field, overrides[field] ?? false];
      }
      if (informational.has(field)) {
        return [field, overrides[field] ?? false];
      }
      return [field, overrides[field] ?? true];
    }),
  ) as Record<string, boolean>;
  if (!('probe_green' in overrides)) {
    fields.probe_green = PAIR_P5_POST_GREEN_PROBE_FIELDS.every((field) => fields[field] === true);
  }
  return { rowCount: 1, rows: [{ [PAIR_P5_PROBE_OUTPUT_COLUMN]: fields }] };
}

export function buildPairP5IdentityNormalizedStatements(repoRoot: string): readonly string[] {
  const path = join(repoRoot, PAIR_P5_IDENTITY_MIGRATION_REL_PATH);
  const rawBytes = readFileSync(path);
  validateMigrationSourceBytes(
    rawBytes,
    PAIR_P5_IDENTITY_MIGRATION_SHA256,
    PAIR_P5_IDENTITY_STEP_ID,
  );
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  if (statements.length === 0) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  if (statements.length !== PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  const composite = compositeStreamSha256(statements);
  if (composite !== PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return statements;
}

export type PairP5IdentityHistoryInsertBinding = {
  readonly version: typeof PAIR_P5_IDENTITY_MIGRATION_VERSION;
  readonly name: typeof PAIR_P5_IDENTITY_MIGRATION_NAME;
  readonly statements: readonly string[];
  readonly parameterizedInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
  readonly serialization: typeof STATEMENT_STREAM_SERIALIZATION;
  readonly normalizedStreamCompositeSha256: typeof PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256;
};

export function buildPairP5IdentityHistoryInsertBinding(
  repoRoot: string,
): PairP5IdentityHistoryInsertBinding {
  const statements = buildPairP5IdentityNormalizedStatements(repoRoot);
  return {
    version: PAIR_P5_IDENTITY_MIGRATION_VERSION,
    name: PAIR_P5_IDENTITY_MIGRATION_NAME,
    statements,
    parameterizedInsertShape: HISTORY_INSERT_SQL_METADATA,
    serialization: STATEMENT_STREAM_SERIALIZATION,
    normalizedStreamCompositeSha256: PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
  };
}
