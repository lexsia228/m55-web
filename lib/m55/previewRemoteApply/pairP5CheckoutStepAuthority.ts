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
  HOLD_PAIR_P5_PROBE_MISMATCH,
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_IDENTITY_PAIR_CHECK_CONSTRAINTDEF_PG_GET_FALSE,
  PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS,
  PAIR_P5_POST_PROBE_SQL,
  PAIR_P5_PROBE_OUTPUT_COLUMN,
  type PairP5ProbeFieldMap,
  type PairP5ProbeValidationResult,
  validatePairP5PostProbeResult,
} from './pairP5IdentityStepAuthority.ts';

export const PAIR_P5_CHECKOUT_STEP_ID = 'PAIR_P5_CHECKOUT_20261010' as const;
export type PairP5CheckoutCallableStepId = typeof PAIR_P5_CHECKOUT_STEP_ID;

export const PAIR_P5_CHECKOUT_MIGRATION_VERSION = '20261010000000' as const;
export const PAIR_P5_CHECKOUT_MIGRATION_NAME = 'm55_pair_checkout_reservation_v1' as const;
export const PAIR_P5_CHECKOUT_MIGRATION_REL_PATH =
  'supabase/migrations/20261010000000_m55_pair_checkout_reservation_v1.sql' as const;
export const PAIR_P5_CHECKOUT_MIGRATION_BYTES = 21200 as const;
export const PAIR_P5_CHECKOUT_MIGRATION_SHA256 =
  'f68bf6438267713ea0c14583191a6614a7a602a003b43e814c4d34561dae6640' as const;
export const PAIR_P5_CHECKOUT_NORMALIZED_STATEMENT_COUNT = 27 as const;
export const PAIR_P5_CHECKOUT_NORMALIZED_STREAM_COMPOSITE_SHA256 =
  '851b373d0652559e6fac656abcbc7b33dbbdc2cda53564125d84c5f9aa29e23d' as const;

export const PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS = [
  ...PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS,
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
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

const POST_CHECKOUT_HISTORY_VERSIONS_SQL = sqlTextArray(PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS);
const P5_3_VERSION = PAIR_P5_FROZEN_NON_CALLABLE_STEPS.P5_3_FULFILL_ADVISORY.version;

const RESERVE_RPC_NAMES_SQL =
  "ARRAY['m55_reserve_compatibility_checkout_v1','m55_classify_pending_checkout_context_v1','m55_acquire_compatibility_checkout_create_slot_v1','m55_cas_attach_compatibility_checkout_session_v1','m55_cas_release_compatibility_checkout_expired_v1']::text[]";

/** P5-2 apply prior state equals independent P5-1 POST catalog (23 history). */
export const PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL = PAIR_P5_POST_PROBE_SQL;

function buildPairP5CheckoutPostProbeSql(): string {
  const greenFields: Array<readonly [string, string]> = [
    ['history_total_twenty_four', `${HISTORY_TOTAL_SQL} = 24`],
    ['history_distinct_twenty_four', `${HISTORY_DISTINCT_SQL} = 24`],
    ['history_prefix_exact', historyPrefixExactSql(PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS)],
    ['history_duplicate_zero', `${HISTORY_TOTAL_SQL} = ${HISTORY_DISTINCT_SQL}`],
    [
      'history_unexpected_zero',
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text <> ALL (${POST_CHECKOUT_HISTORY_VERSIONS_SQL})) = 0`,
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
      `(SELECT count(*)::int FROM supabase_migrations.schema_migrations WHERE version::text = '${P5_3_VERSION}') = 0`,
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
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_status_check',
        PAIR_P5_CHECKOUT_POST_STATUS_CHECK_CONSTRAINTDEF,
      ),
    ],
    [
      'checkout_domain_check_definition_exact',
      cpcNamedCheckDefinitionSql(
        'compatibility_purchase_contexts_check',
        PAIR_P5_CHECKOUT_POST_DOMAIN_CHECK_CONSTRAINTDEF,
      ),
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
  return buildProbeSql(greenFields);
}

export const PAIR_P5_CHECKOUT_POST_PROBE_SQL = buildPairP5CheckoutPostProbeSql();

export const PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL_SHA256_LITERAL =
  '807a523f2980548b64f2767f5f05a694fdd2c247be0ef64198afedd5d1209338' as const;

function digestProbeSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/** Independently pinned at probe contract freeze; verified by assertPairP5CheckoutProbeSqlPinnedIntegrity(). */
export const PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL =
  'db936faaeab576e5facfea413c08ae00cf1d663bd538c0ca61c0571138cf69f2' as const;

export const PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS = [
  'history_total_twenty_four',
  'history_distinct_twenty_four',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_unexpected_zero',
  'target_version_present_once',
  'p5_1_identity_version_still_present_once',
  'p5_3_target_version_absent',
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
] as const;

export const PAIR_P5_CHECKOUT_POST_REQUIRED_PROBE_FIELDS = [
  ...PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS,
  'probe_green',
] as const;

export function assertPairP5CheckoutProbeSqlPinnedIntegrity(): void {
  const priorDigest = digestProbeSql(PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL);
  if (priorDigest !== PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL_SHA256_MISMATCH');
  }
  const postDigest = digestProbeSql(PAIR_P5_CHECKOUT_POST_PROBE_SQL);
  if (postDigest !== PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_MISMATCH');
  }
}

assertPairP5CheckoutProbeSqlPinnedIntegrity();

type PairP5ProbeRow = {
  readonly rowCount: number | null;
  readonly rows: readonly Record<string, unknown>[];
};

function parseCheckoutProbePayload(result: PairP5ProbeRow): Record<string, unknown> {
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

export function validatePairP5CheckoutPriorProbeResult(
  result: PairP5ProbeRow,
): PairP5ProbeValidationResult {
  return validatePairP5PostProbeResult(result);
}

export function validatePairP5CheckoutPostProbeResult(
  result: PairP5ProbeRow,
): PairP5ProbeValidationResult {
  try {
    const fields = parseCheckoutProbePayload(result) as PairP5ProbeFieldMap;
    const probeGreen = fields.probe_green === true;
    const greenOk = PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS.every((field) => fields[field] === true);
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

export function buildPairP5CheckoutNormalizedStatements(repoRoot: string): readonly string[] {
  const path = join(repoRoot, PAIR_P5_CHECKOUT_MIGRATION_REL_PATH);
  const rawBytes = readFileSync(path);
  validateMigrationSourceBytes(
    rawBytes,
    PAIR_P5_CHECKOUT_MIGRATION_SHA256,
    PAIR_P5_CHECKOUT_STEP_ID,
  );
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  if (statements.length !== PAIR_P5_CHECKOUT_NORMALIZED_STATEMENT_COUNT) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  const composite = compositeStreamSha256(statements);
  if (composite !== PAIR_P5_CHECKOUT_NORMALIZED_STREAM_COMPOSITE_SHA256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return statements;
}

export type PairP5CheckoutHistoryInsertBinding = {
  readonly version: typeof PAIR_P5_CHECKOUT_MIGRATION_VERSION;
  readonly name: typeof PAIR_P5_CHECKOUT_MIGRATION_NAME;
  readonly statements: readonly string[];
  readonly parameterizedInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
  readonly serialization: typeof STATEMENT_STREAM_SERIALIZATION;
  readonly normalizedStreamCompositeSha256: typeof PAIR_P5_CHECKOUT_NORMALIZED_STREAM_COMPOSITE_SHA256;
};

export const PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE = {
  priorProbeSql: PAIR_P5_CHECKOUT_PRIOR_PROBE_SQL,
  postProbeSql: PAIR_P5_CHECKOUT_POST_PROBE_SQL,
  validatePriorProbe: validatePairP5CheckoutPriorProbeResult,
  validatePostProbe: validatePairP5CheckoutPostProbeResult,
  normalizedStatementCount: PAIR_P5_CHECKOUT_NORMALIZED_STATEMENT_COUNT,
} as const;

export function buildMockPairP5CheckoutPostProbeRow(
  fieldOverrides: Partial<Record<string, boolean>> = {},
): { readonly rowCount: 1; readonly rows: readonly [Record<string, unknown>] } {
  const fields: Record<string, boolean> = {};
  for (const field of PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS) {
    fields[field] = fieldOverrides[field] ?? true;
  }
  fields.probe_green = fieldOverrides.probe_green ?? true;
  return { rowCount: 1, rows: [{ [PAIR_P5_PROBE_OUTPUT_COLUMN]: fields }] };
}

export function buildPairP5CheckoutHistoryInsertBinding(
  repoRoot: string,
): PairP5CheckoutHistoryInsertBinding {
  const statements = buildPairP5CheckoutNormalizedStatements(repoRoot);
  return {
    version: PAIR_P5_CHECKOUT_MIGRATION_VERSION,
    name: PAIR_P5_CHECKOUT_MIGRATION_NAME,
    statements,
    parameterizedInsertShape: HISTORY_INSERT_SQL_METADATA,
    serialization: STATEMENT_STREAM_SERIALIZATION,
    normalizedStreamCompositeSha256: PAIR_P5_CHECKOUT_NORMALIZED_STREAM_COMPOSITE_SHA256,
  };
}
