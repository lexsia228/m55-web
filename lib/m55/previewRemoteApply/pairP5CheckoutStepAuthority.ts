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

function cpcColumnCountSql(columnName: string): string {
  return `(SELECT count(*)::int FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts' AND c.relkind = 'r' AND a.attname = '${columnName}' AND a.attnum > 0 AND NOT a.attisdropped)`;
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
    ['checkout_origin_frozen_column_present', `${cpcColumnCountSql('checkout_origin_frozen')} = 1`],
    ['stripe_create_first_attempt_column_present', `${cpcColumnCountSql('stripe_create_first_attempt_at')} = 1`],
    [
      'pending_tuple_partial_unique_index_present',
      "(SELECT count(*)::int FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx' AND c.relkind = 'i') = 1",
    ],
    [
      'reservation_rpcs_present_five',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = ANY (${RESERVE_RPC_NAMES_SQL})) = 5`,
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
  '4f18581b70666b7d04dedb7b36da3a432be3e5faf1700cae2ad224eb192024b6' as const;

export const PAIR_P5_CHECKOUT_POST_GREEN_PROBE_FIELDS = [
  'history_total_twenty_four',
  'history_distinct_twenty_four',
  'history_prefix_exact',
  'history_duplicate_zero',
  'history_unexpected_zero',
  'target_version_present_once',
  'p5_1_identity_version_still_present_once',
  'p5_3_target_version_absent',
  'checkout_origin_frozen_column_present',
  'stripe_create_first_attempt_column_present',
  'pending_tuple_partial_unique_index_present',
  'reservation_rpcs_present_five',
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
