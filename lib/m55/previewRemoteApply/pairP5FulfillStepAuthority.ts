import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  compositeStreamSha256,
  STATEMENT_STREAM_SERIALIZATION,
} from '../transactionNormalized/statementStream.ts';
import { validateMigrationSourceBytes } from '../transactionNormalized/transactionNormalizedCore.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';
import {
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS,
  PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS,
} from './pairP5CheckoutStepAuthority.ts';
import {
  HOLD_PAIR_P5_PROBE_MISMATCH,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE,
  PAIR_P5_PROBE_OUTPUT_COLUMN,
  pairP5FulfillRpcPublicExecuteAclGrantCountSql,
  type PairP5ProbeFieldMap,
  type PairP5ProbeValidationResult,
} from './pairP5IdentityStepAuthority.ts';

export const PAIR_P5_FULFILL_STEP_ID = 'PAIR_P5_FULFILL_20261013' as const;
export type PairP5FulfillCallableStepId = typeof PAIR_P5_FULFILL_STEP_ID;

export const PAIR_P5_FULFILL_MIGRATION_VERSION = '20261013110000' as const;
export const PAIR_P5_FULFILL_MIGRATION_NAME = 'm55_pair_fulfill_tuple_advisory_v1' as const;
export const PAIR_P5_FULFILL_MIGRATION_REL_PATH =
  'supabase/migrations/20261013110000_m55_pair_fulfill_tuple_advisory_v1.sql' as const;
export const PAIR_P5_FULFILL_MIGRATION_BYTES = 5545 as const;
export const PAIR_P5_FULFILL_MIGRATION_SHA256 =
  '82b74bfee724ef231062644dd9d5d51b0c5b68060ed0a05da28337d64bb42e75' as const;
export const PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT = 3 as const;
export const PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256 =
  'ea1d7b1e28a2b631fb6a286954c4489202451f5dbedb01b6926e3e2fef73aa46' as const;

export const PAIR_P5_FULFILL_PRE_APPLY_FULFILL_RPC_PROSRC_MD5 =
  '034a38e15248a40b801075444a5cc462' as const;
/** Migration-file body slice md5 (compatibility test extractor); pg_catalog md5(prosrc) after apply differs — see POST_APPLY_PG. */
export const PAIR_P5_FULFILL_POST_APPLY_MIGRATION_SOURCE_PROSRC_MD5 =
  'dc6ee8aa62bfab4b7eaf85dd7a89693a' as const;

/** Observed md5(pg_catalog.pg_proc.prosrc) after P5-3 apply on PostgreSQL (disposable-PG proof pin). */
export const PAIR_P5_FULFILL_POST_APPLY_FULFILL_RPC_PROSRC_MD5 =
  '18a4736e1db1625712aae5b056c7650c' as const;

export const PAIR_P5_POST_FULFILL_HISTORY_VERSIONS = [
  ...PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS,
  PAIR_P5_FULFILL_MIGRATION_VERSION,
] as const;

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

const CPC_BASELINE_SIX_CHECK_NAMES_SQL =
  "ARRAY['compatibility_purchase_contexts_check'::text,'compatibility_purchase_contexts_owner_user_id_check'::text,'compatibility_purchase_contexts_product_key_check'::text,'compatibility_purchase_contexts_snapshot_version_check'::text,'compatibility_purchase_contexts_status_check'::text,'compatibility_purchase_contexts_identity_pair_check'::text]";

function cpcColumnCountSql(columnName: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r' AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped)`;
}

function cpcColumnShapeSql(columnName: string, typeName: string, expectNullable: boolean): string {
  const nullSql = expectNullable ? 'NOT a.attnotnull' : 'a.attnotnull';
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r' AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = '${typeName}' AND ${nullSql} AND ad.adbin IS NULL) = 1`;
}

function cpcNamedCheckDefinitionSql(constraintName: string, constraintDef: string): string {
  const escapedDef = constraintDef.replace(/'/g, "''");
  return `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname = '${constraintName}' AND con.convalidated = true AND pg_catalog.pg_get_constraintdef(con.oid, false) = '${escapedDef}') = 1`;
}

const PAIR_P5_CHECKOUT_POST_STATUS_CHECK_CONSTRAINTDEF =
  "CHECK ((status = ANY (ARRAY['pending'::text, 'fulfilled'::text, 'expired'::text])))" as const;

const PAIR_P5_CHECKOUT_POST_DOMAIN_CHECK_CONSTRAINTDEF =
  "CHECK ((((status = 'pending'::text) AND (fulfilled_at IS NULL)) OR ((status = 'fulfilled'::text) AND (fulfilled_at IS NOT NULL)) OR ((status = 'expired'::text) AND (fulfilled_at IS NULL))))" as const;

const PAIR_P5_CHECKOUT_POST_OWNER_CHECK_CONSTRAINTDEF =
  'CHECK ((length(btrim(owner_user_id)) > 0))' as const;

const PAIR_P5_CHECKOUT_POST_PRODUCT_CHECK_CONSTRAINTDEF =
  "CHECK ((product_key = 'compatibility_report_full_v1'::text))" as const;

const PAIR_P5_CHECKOUT_POST_SNAPSHOT_CHECK_CONSTRAINTDEF =
  "CHECK ((snapshot_version = 'paid_compatibility_report_v1'::text))" as const;

const PAIR_P5_CHECKOUT_PENDING_TUPLE_INDEX_PREDICATE =
  "((status = 'pending'::text) AND (pair_identity_id IS NOT NULL) AND (paid_context_id IS NOT NULL))" as const;

function checkoutReservationRpcContractSql(regprocedureExpr: string, expectSecdef: boolean): string {
  const secdefSql = expectSecdef ? 'p.prosecdef = true' : 'p.prosecdef = false';
  return `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = ${regprocedureExpr} AND ${secdefSql} AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg WHERE cfg = 'search_path=public, pg_temp') AND has_function_privilege('service_role', p.oid, 'EXECUTE') AND NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')) = 1`;
}

function buildProbeSql(greenFields: ReadonlyArray<readonly [string, string]>): string {
  const entries = greenFields.map(([name, expression]) => `  '${name}', (${expression})`);
  const probeGreen = greenFields.map(([, expression]) => `(${expression})`).join(' AND ');
  entries.push(`  'probe_green', (${probeGreen})`);
  return `SELECT json_build_object(\n${entries.join(',\n')}\n) AS json_build_object`;
}

const POST_FULFILL_HISTORY_VERSIONS_SQL = sqlTextArray(PAIR_P5_POST_FULFILL_HISTORY_VERSIONS);

const FULFILL_RPC_REGPROCEDURE =
  "to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)')";

function fulfillRpcProsrcMd5MatchSql(md5: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = ${FULFILL_RPC_REGPROCEDURE} AND md5(p.prosrc) = '${md5}') = 1`;
}

function buildPairP5CheckoutPostStateGreenFields(): Array<readonly [string, string]> {
  return [
    ['history_total_twenty_four', `${HISTORY_TOTAL_SQL} = 24`],
    ['history_distinct_twenty_four', `${HISTORY_DISTINCT_SQL} = 24`],
    ['history_prefix_exact', historyPrefixExactSql(PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS)],
    ['history_duplicate_zero', `${HISTORY_TOTAL_SQL} = ${HISTORY_DISTINCT_SQL}`],
    [
      'history_unexpected_zero',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text <> ALL (${sqlTextArray(PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS)})) = 0`,
    ],
    [
      'target_version_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_CHECKOUT_MIGRATION_VERSION}') = 1`,
    ],
    [
      'p5_1_identity_version_still_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_IDENTITY_MIGRATION_VERSION}') = 1`,
    ],
    [
      'p5_3_target_version_absent',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_FULFILL_MIGRATION_VERSION}') = 0`,
    ],
    ['checkout_origin_frozen_text_nullable', cpcColumnShapeSql('checkout_origin_frozen', 'text', true)],
    [
      'stripe_create_first_attempt_timestamptz_nullable',
      cpcColumnShapeSql('stripe_create_first_attempt_at', 'timestamptz', true),
    ],
    ['stripe_create_lease_token_uuid_nullable', cpcColumnShapeSql('stripe_create_lease_token', 'uuid', true)],
    [
      'stripe_create_lease_until_timestamptz_nullable',
      cpcColumnShapeSql('stripe_create_lease_until', 'timestamptz', true),
    ],
    [
      'cpc_six_checks_validated',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.convalidated = true) = 6`,
    ],
    [
      'unexpected_cpc_check_zero',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname <> ALL (${CPC_BASELINE_SIX_CHECK_NAMES_SQL})) = 0`,
    ],
    [
      'checkout_status_check_definition_exact',
      cpcNamedCheckDefinitionSql('compatibility_purchase_contexts_status_check', PAIR_P5_CHECKOUT_POST_STATUS_CHECK_CONSTRAINTDEF),
    ],
    [
      'checkout_domain_check_definition_exact',
      cpcNamedCheckDefinitionSql('compatibility_purchase_contexts_check', PAIR_P5_CHECKOUT_POST_DOMAIN_CHECK_CONSTRAINTDEF),
    ],
    [
      'legacy_owner_user_id_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_owner_user_id_check',
        PAIR_P5_CHECKOUT_POST_OWNER_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_product_key_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_product_key_check',
        PAIR_P5_CHECKOUT_POST_PRODUCT_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_snapshot_version_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_snapshot_version_check',
        PAIR_P5_CHECKOUT_POST_SNAPSHOT_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_identity_pair_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_identity_pair_check',
        PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE,
      ),
    ],
    [
      'pending_tuple_partial_unique_index_present',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND c.relkind = 'i') = 1",
    ],
    [
      'pending_tuple_unique_index_key_columns',
      `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND i.indisunique AND array_to_string(ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute a WHERE a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey) AND a.attnum > 0 ORDER BY a.attnum), ',') = 'owner_user_id,pair_identity_id,paid_context_id') = 1`,
    ],
    [
      'pending_tuple_unique_index_predicate_exact',
      `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND pg_catalog.pg_get_expr(i.indpred, i.indrelid) = '${PAIR_P5_CHECKOUT_PENDING_TUPLE_INDEX_PREDICATE.replace(/'/g, "''")}') = 1`,
    ],
    [
      'reserve_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_reserve_compatibility_checkout_v1(uuid, text, uuid, uuid, jsonb, text)')",
        true,
      ),
    ],
    [
      'classify_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_classify_pending_checkout_context_v1(compatibility_purchase_contexts)')",
        false,
      ),
    ],
    [
      'acquire_slot_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_acquire_compatibility_checkout_create_slot_v1(uuid, text, uuid)')",
        true,
      ),
    ],
    [
      'attach_session_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_cas_attach_compatibility_checkout_session_v1(uuid, text, text, timestamptz, uuid)')",
        true,
      ),
    ],
    [
      'release_expired_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_cas_release_compatibility_checkout_expired_v1(uuid, text, text, text, text)')",
        true,
      ),
    ],
    [
      'identity_links_ordinary_table_still_one',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_report_identity_links' AND c.relkind = 'r') = 1",
    ],
    ['pair_identity_column_still_present', `${cpcColumnCountSql('pair_identity_id')} = 1`],
  ];
}

function buildPairP5FulfillPriorProbeSql(): string {
  const greenFields: Array<readonly [string, string]> = [
    ...buildPairP5CheckoutPostStateGreenFields(),
    [
      'fulfill_rpc_pre_apply_prosrc_md5_catalog_match',
      fulfillRpcProsrcMd5MatchSql(PAIR_P5_FULFILL_PRE_APPLY_FULFILL_RPC_PROSRC_MD5),
    ],
  ];
  return buildProbeSql(greenFields);
}

function buildPairP5FulfillPostProbeSql(): string {
  const greenFields: Array<readonly [string, string]> = [
    ['history_total_twenty_five', `${HISTORY_TOTAL_SQL} = 25`],
    ['history_distinct_twenty_five', `${HISTORY_DISTINCT_SQL} = 25`],
    ['history_prefix_exact', historyPrefixExactSql(PAIR_P5_POST_FULFILL_HISTORY_VERSIONS)],
    ['history_duplicate_zero', `${HISTORY_TOTAL_SQL} = ${HISTORY_DISTINCT_SQL}`],
    [
      'history_unexpected_zero',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text <> ALL (${POST_FULFILL_HISTORY_VERSIONS_SQL})) = 0`,
    ],
    [
      'target_version_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_FULFILL_MIGRATION_VERSION}') = 1`,
    ],
    [
      'p5_1_identity_version_still_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_IDENTITY_MIGRATION_VERSION}') = 1`,
    ],
    [
      'p5_2_checkout_version_still_present_once',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${PAIR_P5_CHECKOUT_MIGRATION_VERSION}') = 1`,
    ],
    ['checkout_origin_frozen_text_nullable', cpcColumnShapeSql('checkout_origin_frozen', 'text', true)],
    [
      'stripe_create_first_attempt_timestamptz_nullable',
      cpcColumnShapeSql('stripe_create_first_attempt_at', 'timestamptz', true),
    ],
    ['stripe_create_lease_token_uuid_nullable', cpcColumnShapeSql('stripe_create_lease_token', 'uuid', true)],
    [
      'stripe_create_lease_until_timestamptz_nullable',
      cpcColumnShapeSql('stripe_create_lease_until', 'timestamptz', true),
    ],
    [
      'cpc_six_checks_validated',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.convalidated = true) = 6`,
    ],
    [
      'unexpected_cpc_check_zero',
      `(SELECT count(*)::int FROM pg_catalog.pg_constraint con WHERE con.conrelid = ${CPC_REL_OID_SQL} AND con.contype = 'c' AND con.conname <> ALL (${CPC_BASELINE_SIX_CHECK_NAMES_SQL})) = 0`,
    ],
    [
      'checkout_status_check_definition_exact',
      cpcNamedCheckDefinitionSql('compatibility_purchase_contexts_status_check', PAIR_P5_CHECKOUT_POST_STATUS_CHECK_CONSTRAINTDEF),
    ],
    [
      'checkout_domain_check_definition_exact',
      cpcNamedCheckDefinitionSql('compatibility_purchase_contexts_check', PAIR_P5_CHECKOUT_POST_DOMAIN_CHECK_CONSTRAINTDEF),
    ],
    [
      'legacy_owner_user_id_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_owner_user_id_check',
        PAIR_P5_CHECKOUT_POST_OWNER_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_product_key_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_product_key_check',
        PAIR_P5_CHECKOUT_POST_PRODUCT_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_snapshot_version_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_snapshot_version_check',
        PAIR_P5_CHECKOUT_POST_SNAPSHOT_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'legacy_identity_pair_check_preserved',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_identity_pair_check',
        PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE,
      ),
    ],
    [
      'pending_tuple_partial_unique_index_present',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND c.relkind = 'i') = 1",
    ],
    [
      'pending_tuple_unique_index_key_columns',
      `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND i.indisunique AND array_to_string(ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute a WHERE a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey) AND a.attnum > 0 ORDER BY a.attnum), ',') = 'owner_user_id,pair_identity_id,paid_context_id') = 1`,
    ],
    [
      'pending_tuple_unique_index_predicate_exact',
      `(SELECT count(*)::int FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND pg_catalog.pg_get_expr(i.indpred, i.indrelid) = '${PAIR_P5_CHECKOUT_PENDING_TUPLE_INDEX_PREDICATE.replace(/'/g, "''")}') = 1`,
    ],
    [
      'reserve_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_reserve_compatibility_checkout_v1(uuid, text, uuid, uuid, jsonb, text)')",
        true,
      ),
    ],
    [
      'classify_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_classify_pending_checkout_context_v1(compatibility_purchase_contexts)')",
        false,
      ),
    ],
    [
      'acquire_slot_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_acquire_compatibility_checkout_create_slot_v1(uuid, text, uuid)')",
        true,
      ),
    ],
    [
      'attach_session_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_cas_attach_compatibility_checkout_session_v1(uuid, text, text, timestamptz, uuid)')",
        true,
      ),
    ],
    [
      'release_expired_rpc_contract',
      checkoutReservationRpcContractSql(
        "to_regprocedure('public.m55_cas_release_compatibility_checkout_expired_v1(uuid, text, text, text, text)')",
        true,
      ),
    ],
    [
      'identity_links_ordinary_table_still_one',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_owned_report_identity_links' AND c.relkind = 'r') = 1",
    ],
    ['pair_identity_column_still_present', `${cpcColumnCountSql('pair_identity_id')} = 1`],
    [
      'fulfill_rpc_post_apply_prosrc_md5_catalog_match',
      fulfillRpcProsrcMd5MatchSql(PAIR_P5_FULFILL_POST_APPLY_FULFILL_RPC_PROSRC_MD5),
    ],
    [
      'fulfill_rpc_prosrc_contains_advisory_xact_lock',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = ${FULFILL_RPC_REGPROCEDURE} AND position('pg_advisory_xact_lock' in p.prosrc) > 0) = 1`,
    ],
    [
      'fulfill_rpc_security_definer',
      `(SELECT COALESCE((SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid = ${FULFILL_RPC_REGPROCEDURE}), false)) = true`,
    ],
    [
      'fulfill_rpc_search_path_configured',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = ${FULFILL_RPC_REGPROCEDURE} AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1`,
    ],
    [
      'fulfill_rpc_execute_service_role_only_public',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.oid = ${FULFILL_RPC_REGPROCEDURE} AND has_function_privilege('service_role', p.oid, 'EXECUTE') AND NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE') AND ${pairP5FulfillRpcPublicExecuteAclGrantCountSql()} = 0) = 1`,
    ],
  ];
  return buildProbeSql(greenFields);
}

export const PAIR_P5_FULFILL_PRIOR_PROBE_SQL = buildPairP5FulfillPriorProbeSql();
export const PAIR_P5_FULFILL_POST_PROBE_SQL = buildPairP5FulfillPostProbeSql();

function digestProbeSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/** Independently pinned at probe contract freeze; verified by assertPairP5FulfillProbeSqlPinnedIntegrity(). */
export const PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_LITERAL =
  '872d5b9beccdbd025b88648a7790592e7f17002cef1950a6bb305bf64c4c15cf' as const;

export const PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL =
  '42c39703f1b6ba960971973c6bbeba34c7748a8d53678e5fa86b741efc121022' as const;

export const PAIR_P5_FULFILL_PRIOR_GREEN_PROBE_FIELDS = [
  ...PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS,
  'fulfill_rpc_pre_apply_prosrc_md5_catalog_match',
] as const;

export const PAIR_P5_FULFILL_POST_GREEN_PROBE_FIELDS = [
  'history_total_twenty_five',
  'history_distinct_twenty_five',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_unexpected_zero',
  'target_version_present_once',
  'p5_1_identity_version_still_present_once',
  'p5_2_checkout_version_still_present_once',
  'checkout_origin_frozen_text_nullable',
  'stripe_create_first_attempt_timestamptz_nullable',
  'stripe_create_lease_token_uuid_nullable',
  'stripe_create_lease_until_timestamptz_nullable',
  'cpc_six_checks_validated',
  'unexpected_cpc_check_zero',
  'checkout_status_check_definition_exact',
  'checkout_domain_check_definition_exact',
  'legacy_owner_user_id_check_preserved',
  'legacy_product_key_check_preserved',
  'legacy_snapshot_version_check_preserved',
  'legacy_identity_pair_check_preserved',
  'pending_tuple_partial_unique_index_present',
  'pending_tuple_unique_index_key_columns',
  'pending_tuple_unique_index_predicate_exact',
  'reserve_rpc_contract',
  'classify_rpc_contract',
  'acquire_slot_rpc_contract',
  'attach_session_rpc_contract',
  'release_expired_rpc_contract',
  'identity_links_ordinary_table_still_one',
  'pair_identity_column_still_present',
  'fulfill_rpc_post_apply_prosrc_md5_catalog_match',
  'fulfill_rpc_prosrc_contains_advisory_xact_lock',
  'fulfill_rpc_security_definer',
  'fulfill_rpc_search_path_configured',
  'fulfill_rpc_execute_service_role_only_public',
] as const;

export const PAIR_P5_FULFILL_POST_REQUIRED_PROBE_FIELDS = [
  ...PAIR_P5_FULFILL_POST_GREEN_PROBE_FIELDS,
  'probe_green',
] as const;

export function assertPairP5FulfillProbeSqlPinnedIntegrity(): void {
  const priorDigest = digestProbeSql(PAIR_P5_FULFILL_PRIOR_PROBE_SQL);
  if (priorDigest !== PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_MISMATCH');
  }
  const postDigest = digestProbeSql(PAIR_P5_FULFILL_POST_PROBE_SQL);
  if (postDigest !== PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_MISMATCH');
  }
}

assertPairP5FulfillProbeSqlPinnedIntegrity();

type PairP5ProbeRow = {
  readonly rowCount: number | null;
  readonly rows: readonly Record<string, unknown>[];
};

function parseFulfillProbePayload(result: PairP5ProbeRow): Record<string, unknown> {
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

function validateFulfillProbeResult(
  result: PairP5ProbeRow,
  greenFields: readonly string[],
): PairP5ProbeValidationResult {
  try {
    const fields = parseFulfillProbePayload(result) as PairP5ProbeFieldMap;
    const probeGreen = fields.probe_green === true;
    const greenOk = greenFields.every((field) => fields[field] === true);
    if (probeGreen && greenOk) {
      return { ok: true, probeGreen: true, fields };
    }
    return {
      ok: false,
      probeGreen: false,
      fields,
      holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
    };
  } catch {
    return {
      ok: false,
      probeGreen: false,
      fields: {},
      holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
    };
  }
}

export function validatePairP5FulfillPriorProbeResult(
  result: PairP5ProbeRow,
): PairP5ProbeValidationResult {
  return validateFulfillProbeResult(result, PAIR_P5_FULFILL_PRIOR_GREEN_PROBE_FIELDS);
}

export function validatePairP5FulfillPostProbeResult(
  result: PairP5ProbeRow,
): PairP5ProbeValidationResult {
  return validateFulfillProbeResult(result, PAIR_P5_FULFILL_POST_GREEN_PROBE_FIELDS);
}

export function buildPairP5FulfillNormalizedStatements(repoRoot: string): readonly string[] {
  const path = join(repoRoot, PAIR_P5_FULFILL_MIGRATION_REL_PATH);
  const rawBytes = readFileSync(path);
  validateMigrationSourceBytes(rawBytes, PAIR_P5_FULFILL_MIGRATION_SHA256, PAIR_P5_FULFILL_STEP_ID);
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  if (statements.length !== PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  const composite = compositeStreamSha256(statements);
  if (composite !== PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return statements;
}

export type PairP5FulfillHistoryInsertBinding = {
  readonly version: typeof PAIR_P5_FULFILL_MIGRATION_VERSION;
  readonly name: typeof PAIR_P5_FULFILL_MIGRATION_NAME;
  readonly statements: readonly string[];
  readonly parameterizedInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
  readonly serialization: typeof STATEMENT_STREAM_SERIALIZATION;
  readonly normalizedStreamCompositeSha256: typeof PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256;
};

/** Base probe suite; `functionBodyCatalogProbeSql` is attached in fulfill auth-gated executor (avoids import cycle). */
export const PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE_BASE = {
  priorProbeSql: PAIR_P5_FULFILL_PRIOR_PROBE_SQL,
  postProbeSql: PAIR_P5_FULFILL_POST_PROBE_SQL,
  validatePriorProbe: validatePairP5FulfillPriorProbeResult,
  validatePostProbe: validatePairP5FulfillPostProbeResult,
  normalizedStatementCount: PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT,
} as const;

export function buildMockPairP5FulfillPostProbeRow(
  fieldOverrides: Partial<Record<string, boolean>> = {},
): { readonly rowCount: 1; readonly rows: readonly [Record<string, unknown>] } {
  const fields: Record<string, boolean> = {};
  for (const field of PAIR_P5_FULFILL_POST_GREEN_PROBE_FIELDS) {
    fields[field] = fieldOverrides[field] ?? true;
  }
  fields.probe_green = fieldOverrides.probe_green ?? true;
  return { rowCount: 1, rows: [{ [PAIR_P5_PROBE_OUTPUT_COLUMN]: fields }] };
}

export function buildMockPairP5FulfillPriorProbeRow(
  fieldOverrides: Partial<Record<string, boolean>> = {},
): { readonly rowCount: 1; readonly rows: readonly [Record<string, unknown>] } {
  const fields: Record<string, boolean> = {};
  for (const field of PAIR_P5_FULFILL_PRIOR_GREEN_PROBE_FIELDS) {
    fields[field] = fieldOverrides[field] ?? true;
  }
  fields.probe_green = fieldOverrides.probe_green ?? true;
  return { rowCount: 1, rows: [{ [PAIR_P5_PROBE_OUTPUT_COLUMN]: fields }] };
}

export function buildPairP5FulfillHistoryInsertBinding(
  repoRoot: string,
): PairP5FulfillHistoryInsertBinding {
  const statements = buildPairP5FulfillNormalizedStatements(repoRoot);
  return {
    version: PAIR_P5_FULFILL_MIGRATION_VERSION,
    name: PAIR_P5_FULFILL_MIGRATION_NAME,
    statements,
    parameterizedInsertShape: HISTORY_INSERT_SQL_METADATA,
    serialization: STATEMENT_STREAM_SERIALIZATION,
    normalizedStreamCompositeSha256: PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256,
  };
}
