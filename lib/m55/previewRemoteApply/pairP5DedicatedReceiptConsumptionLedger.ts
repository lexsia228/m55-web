import { createHash } from 'node:crypto';

import type { PairP5HumanPreviewApplyAuthorizationPurpose } from './pairP5DedicatedTargetBindingReceipt.ts';
import type { ExecutionPgClient, ExecutionPgQueryResult } from './remoteExecutionPgTransport.ts';

export const PAIR_P5_LEDGER_MIGRATION_VERSION = '20261008200000' as const;

export const PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID =
  '20261008200000_m55_pair_p5_dedicated_receipt_one_use_ledger_v1' as const;

/** Valid timestamp; sorts after R7 D5 `20261008000000` and before frozen P5-1 `20261009000000`. */
export const PAIR_P5_LEDGER_MIGRATION_VERSION_SORT_KEY = 20261008200000 as const;
export const PAIR_P5_FROZEN_P5_IDENTITY_MIGRATION_VERSION_SORT_KEY = 20261009000000 as const;

export const PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS = {
  ABSENT: 'ABSENT',
  PRESENT_EXACT: 'PRESENT_EXACT',
  PRESENT_MISMATCH: 'PRESENT_MISMATCH',
  UNKNOWN_UNQUERYABLE: 'UNKNOWN_UNQUERYABLE',
} as const;

export const PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION = {
  ABSENT: 'APPLY_LEDGER_MIGRATION_ONCE_UNDER_HUMAN_GO',
  PRESENT_EXACT: 'SKIP_LEDGER_DDL_DO_NOT_DUPLICATE_CREATE',
  PRESENT_MISMATCH: 'STOP_INVESTIGATE_BEFORE_ANY_APPLY',
  UNKNOWN_UNQUERYABLE: 'STOP_SQL_OR_PERMISSION_ERROR',
} as const;

export function resolvePairP5LedgerPreviewPreflightApplyDecision(
  catalogClassification: string,
): (typeof PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION)[keyof typeof PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION] {
  switch (catalogClassification) {
    case PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.ABSENT:
      return PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.ABSENT;
    case PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.PRESENT_EXACT:
      return PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_EXACT;
    case PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.PRESENT_MISMATCH:
      return PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_MISMATCH;
    default:
      return PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.UNKNOWN_UNQUERYABLE;
  }
}

export const PAIR_P5_LEDGER_PREVIEW_EXECUTION_ROLE_CONTRACT = {
  approvedPreviewDbRoleName: null as string | null,
  humanDecisionRequired:
    'NAME_EXACT_PREVIEW_SESSION_POOLER_DB_ROLE_FOR_INSERT_AND_RLS_POLICY' as const,
  sessionPoolerEndpointUserIsNotDbRole: true as const,
} as const;

export const PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_EXECUTION_PLAN = {
  previewVersionSortOrder: 'LEDGER_20261008200000_THEN_P5_IDENTITY_20261009000000',
  absentIsNormalPreApplyCandidate: true,
  receiptGatedP5IdentityApplyRequires:
    'CLASSIFIER_ABSENT_APPLY_LEDGER_ONCE_OR_PRESENT_EXACT_SKIP_DDL_THEN_P5_1_UNDER_SEPARATE_GO',
  presentExactSkipsLedgerCreate: true,
  presentMismatchStopsAllApply: true,
  ordinarySinglePassMigrateAllInsufficient: false,
  explicitLedgerOnlyHumanGoStillRequired: true,
  frozenP5IdentityMigrationSha256PinRequired: true,
} as const;

export const PAIR_P5_PREVIEW_MIGRATION_APPLY_SEQUENCE = [
  {
    order: 1,
    migrationId: PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID,
    versionSortKey: PAIR_P5_LEDGER_MIGRATION_VERSION_SORT_KEY,
    whenClassifierAbsent: PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.ABSENT,
    whenClassifierPresentExact: PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_EXACT,
    whenClassifierPresentMismatch: PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_MISMATCH,
  },
  {
    order: 2,
    migrationId: '20261009000000_m55_pair_owned_state_identity_v1',
    versionSortKey: PAIR_P5_FROZEN_P5_IDENTITY_MIGRATION_VERSION_SORT_KEY,
    action: 'HUMAN_P5_1_IDENTITY_APPLY_WITH_OPERATIONAL_RECEIPT_AND_LIVE_EXECUTOR_SURFACE',
  },
] as const;

/**
 * SELECT-only Preview preflight (not executed by Cursor). Always returns exactly one row.
 * Bind execution_role via session parameter or replace literal NULL before run when Human approves role name.
 */
export const PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL = `WITH params AS (
  SELECT
    'public'::text AS schema_name,
    'm55_pair_p5_dedicated_receipt_consumption_v1'::text AS rel_name,
    NULL::text AS execution_role_name
),
rel AS (
  SELECT c.oid, c.relkind, c.relname, c.relrowsecurity, c.relforcerowsecurity, r.rolname AS owner_name
  FROM params p
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = p.schema_name
  LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relname = p.rel_name
  LEFT JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
),
col_contract AS (
  SELECT
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'receipt_identifier_sha256' AND col.udt_name = 'bpchar' AND col.character_maximum_length = 64
        AND col.is_nullable = 'NO') AS receipt_id_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'preview_project_ref' AND col.udt_name = 'text' AND col.is_nullable = 'NO') AS preview_ref_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'selected_step' AND col.udt_name = 'text' AND col.is_nullable = 'NO') AS step_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'operation_purpose' AND col.udt_name = 'text' AND col.is_nullable = 'NO') AS purpose_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'attestation_identity_digest_sha256' AND col.udt_name = 'bpchar'
        AND col.character_maximum_length = 64 AND col.is_nullable = 'NO') AS attestation_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'human_authorization_identity_digest_sha256' AND col.udt_name = 'bpchar'
        AND col.character_maximum_length = 64 AND col.is_nullable = 'NO') AS human_auth_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name
        AND col.column_name = 'consumed_at' AND col.udt_name = 'timestamptz' AND col.is_nullable = 'NO') AS consumed_at_col_ok,
    (SELECT count(*)::int FROM information_schema.columns col, params p
      WHERE col.table_schema = p.schema_name AND col.table_name = p.rel_name) AS total_column_count
),
constraint_contract AS (
  SELECT
    (SELECT count(*)::int FROM pg_constraint con
      JOIN rel ON rel.oid = con.conrelid
      WHERE con.contype = 'p' AND con.conname = 'm55_pair_p5_dedicated_receipt_consumption_v1_pkey') AS pk_ok,
    (SELECT count(*)::int FROM pg_constraint con
      JOIN rel ON rel.oid = con.conrelid
      WHERE con.contype = 'c') AS check_constraint_count,
    (SELECT count(*)::int FROM pg_index ix
      JOIN rel ON rel.oid = ix.indrelid
      WHERE ix.indisprimary IS FALSE) AS non_pk_index_count,
    (SELECT count(*)::int FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
      JOIN rel ON rel.oid = a.attrelid
      WHERE a.attname = 'consumed_at' AND pg_get_expr(ad.adbin, ad.adrelid) LIKE '%now()%') AS consumed_at_default_ok
),
revoke_contract AS (
  SELECT
    CASE
      WHEN rel.oid IS NULL THEN true
      WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon')
        AND COALESCE(has_table_privilege('anon', rel.oid, 'INSERT'), false) THEN false
      WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
        AND COALESCE(has_table_privilege('authenticated', rel.oid, 'INSERT'), false) THEN false
      ELSE true
    END AS anon_authenticated_insert_revoked_ok
  FROM rel
),
priv_contract AS (
  SELECT
    CASE
      WHEN p.execution_role_name IS NULL THEN 'HOLD_EXECUTION_ROLE_NOT_PROVIDED'
      WHEN rel.oid IS NULL THEN 'NOT_APPLICABLE_RELATION_ABSENT'
      WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = p.execution_role_name)
        THEN 'HOLD_EXECUTION_ROLE_UNKNOWN'
      ELSE CASE
        WHEN has_table_privilege(
            (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = p.execution_role_name),
            rel.oid,
            'INSERT')
          AND NOT has_table_privilege(
            (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = p.execution_role_name),
            rel.oid,
            'UPDATE')
          AND NOT has_table_privilege(
            (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = p.execution_role_name),
            rel.oid,
            'DELETE')
          AND NOT has_table_privilege(
            (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname = p.execution_role_name),
            rel.oid,
            'TRUNCATE')
        THEN 'INSERT_ONLY_EFFECTIVE'
        ELSE 'PRIVILEGE_MISMATCH'
      END
    END AS insert_privilege_classification
  FROM params p
  CROSS JOIN rel
),
classified AS (
  SELECT
    CASE
      WHEN rel.oid IS NULL THEN 'ABSENT'
      WHEN rel.relkind IS DISTINCT FROM 'r' THEN 'PRESENT_MISMATCH'
      WHEN rel.owner_name IS DISTINCT FROM 'postgres' THEN 'PRESENT_MISMATCH'
      WHEN rel.relrowsecurity IS DISTINCT FROM true OR rel.relforcerowsecurity IS DISTINCT FROM true THEN 'PRESENT_MISMATCH'
      WHEN col_contract.total_column_count IS DISTINCT FROM 7 THEN 'PRESENT_MISMATCH'
      WHEN col_contract.receipt_id_col_ok <> 1
        OR col_contract.preview_ref_col_ok <> 1
        OR col_contract.step_col_ok <> 1
        OR col_contract.purpose_col_ok <> 1
        OR col_contract.attestation_col_ok <> 1
        OR col_contract.human_auth_col_ok <> 1
        OR col_contract.consumed_at_col_ok <> 1
        OR constraint_contract.pk_ok <> 1
        OR constraint_contract.check_constraint_count <> 6
        OR constraint_contract.non_pk_index_count <> 0
        OR constraint_contract.consumed_at_default_ok <> 1
        OR revoke_contract.anon_authenticated_insert_revoked_ok IS DISTINCT FROM true
      THEN 'PRESENT_MISMATCH'
      ELSE 'PRESENT_EXACT'
    END AS catalog_classification,
    priv_contract.insert_privilege_classification,
    rel.relname IS NOT NULL AS relation_present,
    col_contract.total_column_count,
    constraint_contract.pk_ok,
    constraint_contract.check_constraint_count
  FROM params
  CROSS JOIN rel
  CROSS JOIN col_contract
  CROSS JOIN constraint_contract
  CROSS JOIN revoke_contract
  CROSS JOIN priv_contract
)
SELECT
  catalog_classification,
  CASE catalog_classification
    WHEN 'ABSENT' THEN 'APPLY_LEDGER_MIGRATION_ONCE_UNDER_HUMAN_GO'
    WHEN 'PRESENT_EXACT' THEN 'SKIP_LEDGER_DDL_DO_NOT_DUPLICATE_CREATE'
    WHEN 'PRESENT_MISMATCH' THEN 'STOP_INVESTIGATE_BEFORE_ANY_APPLY'
    ELSE 'STOP_SQL_OR_PERMISSION_ERROR'
  END AS apply_decision,
  insert_privilege_classification,
  relation_present,
  total_column_count,
  pk_ok,
  check_constraint_count
FROM classified` as const;

/** @deprecated Use PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL (single-row classifier). */
export const PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CATALOG_SHAPE_SQL =
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL;

/** @deprecated Use PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL (privilege columns in same row). */
export const PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_INSERT_PRIVILEGE_SQL =
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL;

/** SELECT-only post-apply contract check (not executed by Cursor). */
export const PAIR_P5_LEDGER_PREVIEW_POST_APPLY_CONTRACT_SQL = `SELECT
  CASE
    WHEN to_regclass('public.m55_pair_p5_dedicated_receipt_consumption_v1') IS NULL THEN 'ABSENT'
    ELSE 'RELATION_PRESENT'
  END AS post_apply_relation_state,
  (SELECT count(*)::int FROM pg_policies pol
    WHERE pol.schemaname = 'public'
      AND pol.tablename = 'm55_pair_p5_dedicated_receipt_consumption_v1'
      AND pol.cmd = 'INSERT') AS insert_policy_count` as const;

export const PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_TABLE =
  'public.m55_pair_p5_dedicated_receipt_consumption_v1' as const;

export const PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL = `INSERT INTO ${PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_TABLE} (
  receipt_identifier_sha256,
  preview_project_ref,
  selected_step,
  operation_purpose,
  attestation_identity_digest_sha256,
  human_authorization_identity_digest_sha256
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (receipt_identifier_sha256) DO NOTHING
RETURNING receipt_identifier_sha256` as const;

export type PairP5DedicatedReceiptConsumptionBinding = {
  readonly receiptIdentifierSha256: string;
  readonly previewProjectRef: string;
  readonly selectedStep: string;
  readonly operationPurpose: PairP5HumanPreviewApplyAuthorizationPurpose;
  readonly attestationIdentityDigestSha256: string;
  readonly humanAuthorizationIdentityDigestSha256: string;
};

export const HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED =
  'HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED' as const;
export const HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID =
  'HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID' as const;
export const HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED =
  'HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED' as const;
export const HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN =
  'HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN' as const;

export const PAIR_P5_POST_CONNECT_LEDGER_ATOMIC_CLAIM_INTEGRATION_STATUS =
  'WIRED_IN_AUTHORIZATION_GATED_ORCHESTRATION_LOCAL_ONLY' as const;

export const PAIR_P5_HUMAN_AUTHORIZATION_ABSENT_IDENTITY_DIGEST_SHA256 =
  createHash('sha256').update('HUMAN_AUTHORIZATION_ABSENT', 'utf8').digest('hex');

export type PairP5DedicatedReceiptConsumptionClaimResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED
        | typeof HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN
        | 'HOLD_PAIR_P5_DURABLE_RECEIPT_REPLAY_AUTHORITY_UNAVAILABLE';
    };

export type PairP5DedicatedReceiptConsumptionStore = {
  readonly kind: 'UNWIRED' | 'IN_MEMORY_TEST_DOUBLE' | 'POSTGRESQL';
  claimAtomicOneUse(binding: PairP5DedicatedReceiptConsumptionBinding): PairP5DedicatedReceiptConsumptionClaimResult;
};

export type PairP5PostgresTransactionalLedgerClaimPort = {
  claimAtomicOneUseWithinOpenTransaction(
    binding: PairP5DedicatedReceiptConsumptionBinding,
  ): Promise<PairP5DedicatedReceiptConsumptionClaimResult>;
};

export function digestPairP5HumanAuthorizationIdentity(
  humanAuthorizationId: string | null | undefined,
): string {
  if (typeof humanAuthorizationId !== 'string' || humanAuthorizationId.trim().length === 0) {
    return createHash('sha256').update('HUMAN_AUTHORIZATION_ABSENT', 'utf8').digest('hex');
  }
  return createHash('sha256').update(humanAuthorizationId.trim(), 'utf8').digest('hex');
}

export function validatePairP5DedicatedReceiptConsumptionBinding(
  binding: PairP5DedicatedReceiptConsumptionBinding,
): boolean {
  const hex64 = /^[0-9a-f]{64}$/;
  if (!hex64.test(binding.receiptIdentifierSha256)) {
    return false;
  }
  if (!hex64.test(binding.attestationIdentityDigestSha256)) {
    return false;
  }
  if (!hex64.test(binding.humanAuthorizationIdentityDigestSha256)) {
    return false;
  }
  if (binding.previewProjectRef.trim().length === 0 || binding.selectedStep.trim().length === 0) {
    return false;
  }
  if (binding.operationPurpose !== 'LIVE_MUTATION' && binding.operationPurpose !== 'LIVE_FRESH_READONLY') {
    return false;
  }
  if (
    binding.operationPurpose === 'LIVE_MUTATION' &&
    binding.humanAuthorizationIdentityDigestSha256 === PAIR_P5_HUMAN_AUTHORIZATION_ABSENT_IDENTITY_DIGEST_SHA256
  ) {
    return false;
  }
  const legacyProbeDigest = createHash('sha256').update('PAIR_P5_LEGACY_SINGLE_ARG_CLAIM', 'utf8').digest('hex');
  if (
    binding.operationPurpose === 'LIVE_MUTATION' &&
    binding.attestationIdentityDigestSha256 === legacyProbeDigest
  ) {
    return false;
  }
  return true;
}

export function createUnwiredPairP5DedicatedReceiptConsumptionStore(): PairP5DedicatedReceiptConsumptionStore {
  return {
    kind: 'UNWIRED',
    claimAtomicOneUse(): PairP5DedicatedReceiptConsumptionClaimResult {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED };
    },
  };
}

/** Models INSERT ON CONFLICT DO NOTHING semantics for offline tests only. */
export function createInMemoryPairP5DedicatedReceiptConsumptionStoreForTestsOnly(): PairP5DedicatedReceiptConsumptionStore {
  const consumed = new Set<string>();
  return {
    kind: 'IN_MEMORY_TEST_DOUBLE',
    claimAtomicOneUse(binding: PairP5DedicatedReceiptConsumptionBinding): PairP5DedicatedReceiptConsumptionClaimResult {
      if (!validatePairP5DedicatedReceiptConsumptionBinding(binding)) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
      }
      const key = binding.receiptIdentifierSha256.toLowerCase();
      if (consumed.has(key)) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED };
      }
      consumed.add(key);
      return { ok: true };
    },
  };
}

let activeConsumptionStore: PairP5DedicatedReceiptConsumptionStore =
  createUnwiredPairP5DedicatedReceiptConsumptionStore();

export function getPairP5DedicatedReceiptConsumptionStore(): PairP5DedicatedReceiptConsumptionStore {
  return activeConsumptionStore;
}

export function resetPairP5DedicatedReceiptConsumptionStoreForTestsOnly(
  store: PairP5DedicatedReceiptConsumptionStore = createUnwiredPairP5DedicatedReceiptConsumptionStore(),
): void {
  activeConsumptionStore = store;
}

export function claimPairP5DedicatedReceiptAtomicOneUse(
  binding: PairP5DedicatedReceiptConsumptionBinding,
): PairP5DedicatedReceiptConsumptionClaimResult {
  if (!validatePairP5DedicatedReceiptConsumptionBinding(binding)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
  }
  return getPairP5DedicatedReceiptConsumptionStore().claimAtomicOneUse(binding);
}

export async function claimPairP5DedicatedReceiptAtomicOneUseAfterPostConnectVerification(input: {
  readonly binding: PairP5DedicatedReceiptConsumptionBinding;
  readonly postgresPort: PairP5PostgresTransactionalLedgerClaimPort | null;
}): Promise<PairP5DedicatedReceiptConsumptionClaimResult> {
  if (input.binding.operationPurpose === 'LIVE_FRESH_READONLY') {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN };
  }
  if (!validatePairP5DedicatedReceiptConsumptionBinding(input.binding)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
  }
  if (input.postgresPort === null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED };
  }
  return input.postgresPort.claimAtomicOneUseWithinOpenTransaction(input.binding);
}

function readReturnedReceiptIdentifierSha256(
  result: ExecutionPgQueryResult,
): string | null {
  const row = result.rows[0];
  if (row === null || row === undefined || typeof row !== 'object') {
    return null;
  }
  const record = row as Record<string, unknown>;
  const value = record.receipt_identifier_sha256;
  return typeof value === 'string' ? value : null;
}

/** Uses the caller's open PG transaction; no detached connection. */
export function createPairP5PostgresTransactionalLedgerClaimPortFromExecutionPgClient(
  client: ExecutionPgClient,
): PairP5PostgresTransactionalLedgerClaimPort {
  return {
    async claimAtomicOneUseWithinOpenTransaction(
      binding: PairP5DedicatedReceiptConsumptionBinding,
    ): Promise<PairP5DedicatedReceiptConsumptionClaimResult> {
      if (!validatePairP5DedicatedReceiptConsumptionBinding(binding)) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
      }
      const result = await client.query(PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL, [
        binding.receiptIdentifierSha256,
        binding.previewProjectRef,
        binding.selectedStep,
        binding.operationPurpose,
        binding.attestationIdentityDigestSha256,
        binding.humanAuthorizationIdentityDigestSha256,
      ]);
      if (result.rowCount !== 1) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED };
      }
      const returned = readReturnedReceiptIdentifierSha256(result);
      if (returned !== binding.receiptIdentifierSha256) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
      }
      return { ok: true };
    },
  };
}
