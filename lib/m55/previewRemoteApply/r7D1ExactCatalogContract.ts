import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  deriveNormalizedStatementsFromSourceBytes,
  FROZEN_DELTA_SOURCE_SPECS,
  FROZEN_PREVIEW_HISTORY_SNAPSHOT,
} from './r7D1D5OfflinePlan.ts';
import { canonicalSerializePreviewRemoteApply } from './types.ts';

export const R7_D1_EXACT_CONTRACT_PINNED_MIGRATION_VERSION = '20260924000000' as const;
export const R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256 =
  'be909ec8e3737f87f668d6504400fafde2c5d57203667aaedc93b3c0b308d159' as const;
export const R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256 =
  'a75610d21f75f791c6424817afed00dca5f21e3c9b16eed4955b8dd6d16023df' as const;
export const R7_D1_EXACT_CONTRACT_PINNED_RELATIVE_MIGRATION_PATH =
  'supabase/migrations/20260924000000_m55_r5_compliance_control_plane_v1.sql' as const;

export type R7D1ExactCatalogEvidenceCategory =
  | 'TABLES'
  | 'FUNCTIONS'
  | 'TRIGGERS'
  | 'EXPLICIT_INDEXES'
  | 'RLS_ENABLEMENTS'
  | 'TABLE_COLUMNS_TYPES_NULLABILITY'
  | 'TABLE_DEFAULTS'
  | 'TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK'
  | 'FUNCTION_IDENTITY_ARGS_SECURITY_OWNER'
  | 'FUNCTION_DEFINITION_SEARCH_PATH'
  | 'TRIGGER_TIMING_EVENTS_BINDING'
  | 'INDEX_DEFINITIONS_PREDICATES'
  | 'RLS_POLICIES'
  | 'GRANTS_REVOKES'
  | 'MIGRATION_HISTORY_ROW'
  | 'PRE_STATE_ABSENCE'
  | 'POST_UNEXPECTED_EXTRA'
  | 'FUNCTION_SECURITY_RUNTIME'
  | 'TRIGGER_TIMING_RUNTIME'
  | 'IMPLICIT_INDEX_RUNTIME'
  | 'GRANT_REVOKE_RUNTIME'
  | 'POLICY_BODY_RUNTIME';

const R7_D1_EXACT_SHARED_MANDATORY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] = [
  'TABLES',
  'FUNCTIONS',
  'TRIGGERS',
  'EXPLICIT_INDEXES',
  'RLS_ENABLEMENTS',
  'TABLE_COLUMNS_TYPES_NULLABILITY',
  'TABLE_DEFAULTS',
  'TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK',
  'FUNCTION_IDENTITY_ARGS_SECURITY_OWNER',
  'FUNCTION_DEFINITION_SEARCH_PATH',
  'TRIGGER_TIMING_EVENTS_BINDING',
  'INDEX_DEFINITIONS_PREDICATES',
  'RLS_POLICIES',
  'GRANTS_REVOKES',
  'MIGRATION_HISTORY_ROW',
  'POST_UNEXPECTED_EXTRA',
  'FUNCTION_SECURITY_RUNTIME',
  'TRIGGER_TIMING_RUNTIME',
  'IMPLICIT_INDEX_RUNTIME',
  'GRANT_REVOKE_RUNTIME',
  'POLICY_BODY_RUNTIME',
] as const;

const R7_D1_EXACT_RUNTIME_ONLY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] = [
  'POST_UNEXPECTED_EXTRA',
  'FUNCTION_SECURITY_RUNTIME',
  'TRIGGER_TIMING_RUNTIME',
  'IMPLICIT_INDEX_RUNTIME',
  'GRANT_REVOKE_RUNTIME',
  'POLICY_BODY_RUNTIME',
] as const;

/** PRE readonly session only — compliance objects must be absent (static catalog; no runtime probes). */
export const R7_D1_EXACT_MANDATORY_PRE_READONLY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] = [
  ...R7_D1_EXACT_SHARED_MANDATORY_CATEGORIES.filter(
    (c) => !R7_D1_EXACT_RUNTIME_ONLY_CATEGORIES.includes(c),
  ),
  'PRE_STATE_ABSENCE',
] as const;

/** POST readonly — PRE absence is satisfied only via an immutable bound PRE proof digest (A1). */
export const R7_D1_EXACT_MANDATORY_POST_READONLY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] =
  R7_D1_EXACT_SHARED_MANDATORY_CATEGORIES;

export const R7_D1_EXACT_MANDATORY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] =
  R7_D1_EXACT_MANDATORY_PRE_READONLY_CATEGORIES;

export function listMandatoryD1ExactCategoriesForPhase(
  phase: R7D1ExactCatalogObservationPhase,
): readonly R7D1ExactCatalogEvidenceCategory[] {
  return phase === 'PRE_READONLY'
    ? R7_D1_EXACT_MANDATORY_PRE_READONLY_CATEGORIES
    : R7_D1_EXACT_MANDATORY_POST_READONLY_CATEGORIES;
}

export type R7D1ExactColumnExpectation = {
  readonly columnName: string;
  readonly pgCanonicalType: string;
  readonly isNullable: boolean;
  readonly hasDefault: boolean;
  /** Normalized migration default expression identity; null when no default. */
  readonly canonicalDefaultExpression: string | null;
};

export type R7D1ExactFunctionExpectation = {
  readonly functionName: string;
  readonly identitySignature: string;
  /** Normalized proconfig search_path entry; empty when migration sets no search_path. */
  readonly canonicalSearchPathConfig: string;
  readonly securityDefiner: boolean;
};

export type R7D1ExactTriggerExpectation = {
  readonly triggerName: string;
  readonly tableName: string;
  readonly functionName: string;
  readonly timingEvents: string;
};

export type R7D1ExactConstraintExpectation = {
  readonly tableName: string;
  readonly constraintName: string | null;
  readonly constraintType: 'p' | 'f' | 'c' | 'u';
  readonly canonicalDefFingerprint: string;
  readonly migrationDefVerifiable: boolean;
};

export type R7D1ExactIndexExpectation = {
  readonly indexName: string;
  readonly tableName: string;
  readonly isUnique: boolean;
  readonly indexColumnList: string;
  readonly wherePredicate: string | null;
  readonly canonicalDefFingerprint: string;
};

export type R7D1ExactGrantRevokeExpectation = {
  readonly objectKind: 'table' | 'function';
  readonly objectName: string;
  readonly identityArguments: string | null;
  readonly grantee: string;
  readonly privilege: string;
  readonly granted: boolean;
};

export type R7D1ExactRlsPolicyExpectation = {
  readonly policyName: string;
  readonly tableName: string;
};

export type R7D1ExactPostCatalogContract = {
  readonly migrationVersion: typeof R7_D1_EXACT_CONTRACT_PINNED_MIGRATION_VERSION;
  readonly sourceSha256: typeof R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256;
  readonly tables: readonly string[];
  readonly functions: readonly R7D1ExactFunctionExpectation[];
  readonly triggers: readonly R7D1ExactTriggerExpectation[];
  readonly explicitIndexes: readonly string[];
  readonly rlsEnabledTables: readonly string[];
  readonly expectedRlsPolicies: readonly R7D1ExactRlsPolicyExpectation[];
  readonly tableColumnsByTable: Readonly<Record<string, readonly R7D1ExactColumnExpectation[]>>;
  readonly expectedFunctionGrantRevokeStatements: readonly string[];
  readonly expectedTableGrantRevokeStatements: readonly string[];
  readonly expectedConstraints: readonly R7D1ExactConstraintExpectation[];
  readonly expectedStandaloneIndexes: readonly R7D1ExactIndexExpectation[];
  readonly expectedGrantRevokes: readonly R7D1ExactGrantRevokeExpectation[];
  /** After ordered migration revoke/grant: grantees that must hold zero table privileges. */
  readonly expectedTablePrivilegeAbsences: readonly { readonly tableName: string; readonly grantee: string }[];
  /** Final positive function privileges after ordered migration statements. */
  readonly expectedFinalFunctionGrants: readonly R7D1ExactGrantRevokeExpectation[];
  /** False when any migration-derived constraint could not be parsed with balanced-paren fidelity. */
  readonly migrationDerivedConstraintsVerifiable: boolean;
  /** False when any function header boundary could not be isolated before AS $$. */
  readonly migrationDerivedFunctionExpectationsVerifiable: boolean;
};

export type R7D1ExactPreCatalogContract = {
  readonly complianceTablesAbsent: true;
  readonly complianceFunctionsAbsent: true;
  readonly complianceTriggersAbsent: true;
};

export type R7D1ExactCatalogQueryKey =
  | 'TABLES'
  | 'FUNCTIONS'
  | 'TRIGGERS'
  | 'EXPLICIT_INDEXES'
  | 'RLS_ENABLEMENTS'
  | 'MIGRATION_HISTORY_ROW'
  | 'TABLE_COLUMNS_TYPES_NULLABILITY'
  | 'RLS_POLICIES'
  | 'TABLE_CONSTRAINTS'
  | 'FUNCTION_IDENTITY_ROWS'
  | 'TRIGGER_BINDING_ROWS'
  | 'STANDALONE_INDEX_DEFINITIONS'
  | 'TABLE_PRIVILEGES'
  | 'FUNCTION_PRIVILEGES';

export const R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN: readonly {
  readonly key: R7D1ExactCatalogQueryKey;
  readonly sql: string;
}[] = [
  {
    key: 'TABLES',
    sql: `SELECT c.relname AS name FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'm55_r5_compliance_%' ORDER BY 1`,
  },
  {
    key: 'FUNCTIONS',
    sql: `SELECT p.proname AS name FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname LIKE 'm55_r5_compliance_%' ORDER BY 1`,
  },
  {
    key: 'TRIGGERS',
    sql: `SELECT t.tgname AS name FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgname LIKE 'm55_r5_compliance_%' ORDER BY 1`,
  },
  {
    key: 'EXPLICIT_INDEXES',
    sql: `SELECT ic.relname AS name
FROM pg_catalog.pg_index ix
JOIN pg_catalog.pg_class ic ON ic.oid = ix.indexrelid
JOIN pg_catalog.pg_class tc ON tc.oid = ix.indrelid
JOIN pg_catalog.pg_namespace n ON n.oid = tc.relnamespace
LEFT JOIN pg_catalog.pg_constraint con ON con.conindid = ic.oid
WHERE n.nspname = 'public'
  AND tc.relname LIKE 'm55_r5_compliance_%'
  AND con.oid IS NULL
  AND NOT ix.indisprimary
ORDER BY 1`,
  },
  {
    key: 'RLS_ENABLEMENTS',
    sql: `SELECT c.relname AS name FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity AND c.relname LIKE 'm55_r5_compliance_%' ORDER BY 1`,
  },
  {
    key: 'MIGRATION_HISTORY_ROW',
    sql: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
  },
  {
    key: 'TABLE_COLUMNS_TYPES_NULLABILITY',
    sql: `SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'm55_r5_compliance_%' ORDER BY 1, 2`,
  },
  {
    key: 'RLS_POLICIES',
    sql: `SELECT pol.polname AS policy_name, c.relname AS table_name FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname LIKE 'm55_r5_compliance_%' ORDER BY 1, 2`,
  },
  {
    key: 'TABLE_CONSTRAINTS',
    sql: `SELECT c.relname AS table_name, con.conname AS constraint_name, con.contype AS constraint_type,
pg_catalog.pg_get_constraintdef(con.oid, true) AS constraint_def
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname LIKE 'm55_r5_compliance_%'
ORDER BY 1, 2`,
  },
  {
    key: 'FUNCTION_IDENTITY_ROWS',
    sql: `SELECT p.proname AS function_name,
pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
p.prosecdef AS security_definer,
pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
coalesce(array_to_string(p.proconfig, ','), '') AS function_config
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'm55_r5_compliance_%'
ORDER BY 1, 2`,
  },
  {
    key: 'TRIGGER_BINDING_ROWS',
    sql: `SELECT t.tgname AS trigger_name, c.relname AS table_name, p.proname AS function_name,
t.tgenabled AS enabled, pg_catalog.pg_get_triggerdef(t.oid, true) AS trigger_def
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgname LIKE 'm55_r5_compliance_%'
ORDER BY 1`,
  },
  {
    key: 'STANDALONE_INDEX_DEFINITIONS',
    sql: `SELECT ic.relname AS index_name, tc.relname AS table_name,
pg_catalog.pg_get_indexdef(ic.oid) AS index_def
FROM pg_catalog.pg_index ix
JOIN pg_catalog.pg_class ic ON ic.oid = ix.indexrelid
JOIN pg_catalog.pg_class tc ON tc.oid = ix.indrelid
JOIN pg_catalog.pg_namespace n ON n.oid = tc.relnamespace
LEFT JOIN pg_catalog.pg_constraint con ON con.conindid = ic.oid
WHERE n.nspname = 'public'
  AND tc.relname LIKE 'm55_r5_compliance_%'
  AND con.oid IS NULL
  AND NOT ix.indisprimary
ORDER BY 1`,
  },
  {
    key: 'TABLE_PRIVILEGES',
    sql: `SELECT c.relname AS table_name,
COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee,
priv.privilege_type AS privilege_type,
owner_role.rolname AS table_owner_role
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = c.relowner
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS priv
LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = priv.grantee
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'm55_r5_compliance_%'
ORDER BY 1, 2, 3`,
  },
  {
    key: 'FUNCTION_PRIVILEGES',
    sql: `SELECT p.proname AS function_name,
pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee,
priv.privilege_type AS privilege_type,
owner_role.rolname AS function_owner_role
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = p.proowner
CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS priv
LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = priv.grantee
WHERE n.nspname = 'public' AND p.proname LIKE 'm55_r5_compliance_%'
ORDER BY 1, 2, 3`,
  },
] as const;

export type R7D1ExactCategoryStatus = 'pass' | 'fail' | 'unobserved';

/** Runtime registry — caller-forged objects cannot be registered. */
const producerBoundCatalogEvidenceRegistry = new WeakSet<object>();

/** Immutable PRE proof digests registered only from trusted session-owned query execution. */
const immutablePreCatalogProofRegistry = new Map<string, Readonly<Record<R7D1ExactCatalogEvidenceCategory, R7D1ExactCategoryStatus>>>();

const trustedCatalogQueryExecutionContextRegistry = new WeakSet<object>();
const trustedCatalogContextSessionBinding = new WeakMap<object, object>();

export type R7D1CatalogObservationProvenanceTier =
  | 'readonly_pg_verified'
  | 'local_code_only_mock'
  | 'unit_test_fixture';

export type R7D1TrustedCatalogQueryExecutionContext = {
  readonly sessionObjectIdentity: object;
  readonly queryPlanDigestSha256: string;
  readonly observationProvenanceTier: R7D1CatalogObservationProvenanceTier;
};

/**
 * Future independently authorized real-PG observation provenance.
 * LOCAL CODE-ONLY: remain false — do not establish readonly_pg_verified from collector/import order alone.
 */
export const R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION = false as const;

export function observationProvenanceTierAllowsImmutablePreProof(
  tier: R7D1CatalogObservationProvenanceTier,
): boolean {
  return tier === 'readonly_pg_verified';
}

export function observationProvenanceTierAllowsVerifiedCatalogAttestation(
  tier: R7D1CatalogObservationProvenanceTier,
): boolean {
  return tier === 'readonly_pg_verified';
}

/** Public registration is fail-closed; trusted contexts are registered only from the owned readonly collector path. */
export function registerTrustedCatalogQueryExecutionContext(
  _session: object,
  _queryPlanDigestSha256: string,
  _options: {
    readonly collectorRegistrationProof?: symbol;
    readonly observationProvenanceTier?: R7D1CatalogObservationProvenanceTier;
  } = {},
): R7D1TrustedCatalogQueryExecutionContext | null {
  return null;
}

function registerTrustedCatalogQueryExecutionContextInternal(
  session: object,
  queryPlanDigestSha256: string,
  observationProvenanceTier: R7D1CatalogObservationProvenanceTier,
): R7D1TrustedCatalogQueryExecutionContext | null {
  const context: R7D1TrustedCatalogQueryExecutionContext = Object.freeze({
    sessionObjectIdentity: session,
    queryPlanDigestSha256,
    observationProvenanceTier,
  });
  trustedCatalogQueryExecutionContextRegistry.add(context);
  trustedCatalogContextSessionBinding.set(context, session);
  return context;
}

/** Owned readonly collector (`r7D1TrustedCatalogVerifier`) — not import-order or symbol issuance. */
export function registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
  session: object,
  queryPlanDigestSha256: string,
  observationProvenanceTier: R7D1CatalogObservationProvenanceTier,
): R7D1TrustedCatalogQueryExecutionContext | null {
  if (observationProvenanceTier === 'unit_test_fixture') {
    return null;
  }
  if (observationProvenanceTier === 'readonly_pg_verified') {
    if (!R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION) {
      return null;
    }
  }
  if (observationProvenanceTier !== 'local_code_only_mock' && observationProvenanceTier !== 'readonly_pg_verified') {
    return null;
  }
  return registerTrustedCatalogQueryExecutionContextInternal(session, queryPlanDigestSha256, observationProvenanceTier);
}

export function isTrustedCatalogQueryExecutionContext(value: unknown): value is R7D1TrustedCatalogQueryExecutionContext {
  return value !== null && typeof value === 'object' && trustedCatalogQueryExecutionContextRegistry.has(value);
}

export type R7D1ProducerBoundCatalogEvidence = {
  readonly evidenceDigestSha256: string;
  readonly observationPhase: R7D1ExactCatalogObservationPhase;
  readonly boundPreCatalogProofDigestSha256: string | null;
  readonly migrationVersionTail: string | null;
  readonly observedMigrationVersions: readonly string[];
  readonly tablesPresent: readonly string[];
  readonly functionsPresent: readonly string[];
  readonly triggersPresent: readonly string[];
  readonly explicitIndexesPresent: readonly string[];
  readonly rlsEnabledTablesPresent: readonly string[];
  readonly categoryOutcomes: Readonly<Partial<Record<R7D1ExactCatalogEvidenceCategory, R7D1ExactCategoryStatus>>>;
};

function registerImmutablePreCatalogProofFromTrustedEvidence(
  evidence: R7D1ProducerBoundCatalogEvidence,
  observationProvenanceTier: R7D1CatalogObservationProvenanceTier,
): { readonly ok: true; readonly proofDigestSha256: string } | { readonly ok: false } {
  if (!observationProvenanceTierAllowsImmutablePreProof(observationProvenanceTier)) {
    return { ok: false };
  }
  if (!producerBoundCatalogEvidenceRegistry.has(evidence)) {
    return { ok: false };
  }
  if (evidence.observationPhase !== 'PRE_READONLY') {
    return { ok: false };
  }
  if (evidence.categoryOutcomes.PRE_STATE_ABSENCE !== 'pass') {
    return { ok: false };
  }
  const mandatory = listMandatoryD1ExactCategoriesForPhase('PRE_READONLY');
  for (const category of mandatory) {
    if (evidence.categoryOutcomes[category] !== 'pass') {
      return { ok: false };
    }
  }
  const frozen = Object.freeze({ ...evidence.categoryOutcomes }) as Readonly<
    Record<R7D1ExactCatalogEvidenceCategory, R7D1ExactCategoryStatus>
  >;
  immutablePreCatalogProofRegistry.set(evidence.evidenceDigestSha256, frozen);
  return { ok: true, proofDigestSha256: evidence.evidenceDigestSha256 };
}

export function resolveBoundPreCatalogProofCategoryOutcomes(
  digestSha256: string | null | undefined,
): Readonly<Partial<Record<R7D1ExactCatalogEvidenceCategory, R7D1ExactCategoryStatus>>> | null {
  if (!digestSha256) {
    return null;
  }
  return immutablePreCatalogProofRegistry.get(digestSha256) ?? null;
}

export type R7D1ExactCatalogObservationPhase = 'PRE_READONLY' | 'POST_READONLY';

export function deriveD1ExpectedPreMigrationVersionList(): readonly string[] {
  return FROZEN_PREVIEW_HISTORY_SNAPSHOT.map((entry) => entry.version);
}

export function resolveFrozenPreviewHistoryMigrationSqlPath(
  repoRoot: string,
  version: string,
): string | null {
  if (version === '20260614000000') {
    return join(
      repoRoot,
      'docs/planning/preview-baseline/migrations/20260614000000_preview_production_aligned_baseline_p1.sql',
    );
  }
  const migrationsDir = join(repoRoot, 'supabase/migrations');
  const match = readdirSync(migrationsDir).find((name) => name.startsWith(`${version}_`) && name.endsWith('.sql'));
  return match ? join(migrationsDir, match) : null;
}

export function listFrozenPreviewHistoryMigrationSqlPaths(
  repoRoot: string,
): { readonly ok: true; readonly paths: readonly { readonly version: string; readonly path: string }[] } | { readonly ok: false; readonly missingVersion: string } {
  const paths: { version: string; path: string }[] = [];
  for (const entry of FROZEN_PREVIEW_HISTORY_SNAPSHOT) {
    const path = resolveFrozenPreviewHistoryMigrationSqlPath(repoRoot, entry.version);
    if (!path) {
      return { ok: false, missingVersion: entry.version };
    }
    paths.push({ version: entry.version, path });
  }
  return { ok: true, paths };
}

export function deriveD1ExpectedPostMigrationVersionList(): readonly string[] {
  return [...deriveD1ExpectedPreMigrationVersionList(), R7_D1_EXACT_CONTRACT_PINNED_MIGRATION_VERSION];
}

function orderedVersionListEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function classifyMigrationHistoryObservation(
  observedVersions: readonly string[],
  phase: R7D1ExactCatalogObservationPhase,
): R7D1ExactCategoryStatus {
  const seen = new Set<string>();
  for (const version of observedVersions) {
    if (seen.has(version)) {
      return 'fail';
    }
    seen.add(version);
  }
  const expected =
    phase === 'PRE_READONLY'
      ? deriveD1ExpectedPreMigrationVersionList()
      : deriveD1ExpectedPostMigrationVersionList();
  return orderedVersionListEqual(observedVersions, expected) ? 'pass' : 'fail';
}

export function deriveD1ExactPreCatalogContract(): R7D1ExactPreCatalogContract {
  return {
    complianceTablesAbsent: true,
    complianceFunctionsAbsent: true,
    complianceTriggersAbsent: true,
  };
}

function sha256Buffer(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function loadPinnedMigrationBytes(repoRoot: string): Buffer {
  const spec = FROZEN_DELTA_SOURCE_SPECS.find((s) => s.stepId === 'D1');
  if (!spec || spec.relativePath !== R7_D1_EXACT_CONTRACT_PINNED_RELATIVE_MIGRATION_PATH) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  const bytes = readFileSync(join(repoRoot, spec.relativePath));
  if (sha256Buffer(bytes) !== R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  const { normalized } = deriveNormalizedStatementsFromSourceBytes(bytes, spec);
  if (normalized.normalizedStreamCompositeSha256 !== R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  return bytes;
}

function extractIdentifiers(sql: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  for (const match of sql.matchAll(pattern)) {
    const id = match[1];
    if (id) found.add(id);
  }
  return [...found].sort();
}

export function canonicalizePgInformationSchemaType(dataType: string): string | null {
  const normalized = dataType.trim().toLowerCase();
  if (normalized === 'timestamp with time zone') {
    return 'timestamptz';
  }
  if (normalized === 'character varying') {
    return 'varchar';
  }
  if (/^[a-z][a-z0-9_]*$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function canonicalizeObservedDefaultExpression(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const normalized = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized.length === 0) {
    return null;
  }
  return normalized.replace(/::[a-z0-9_]+(\[\])?/gi, '');
}

export function canonicalizeMigrationDefaultExpression(fragment: string): string {
  return fragment.trim().replace(/\s+/g, ' ').toLowerCase().replace(/::[a-z0-9_]+(\[\])?/gi, '');
}

export function canonicalizeMigrationColumnTypeToken(token: string): string | null {
  const normalized = token.trim().toLowerCase();
  if (normalized.startsWith('timestamptz')) {
    return 'timestamptz';
  }
  if (normalized === 'uuid' || normalized === 'text' || normalized === 'integer' || normalized === 'jsonb') {
    return normalized;
  }
  if (normalized.startsWith('text')) {
    return 'text';
  }
  if (/^[a-z][a-z0-9_]*$/.test(normalized)) {
    return normalized;
  }
  return null;
}

function parseTableColumns(sql: string): Record<string, R7D1ExactColumnExpectation[]> {
  const tableColumnsByTable: Record<string, R7D1ExactColumnExpectation[]> = {};
  const tableBlockPattern = /create table public\.([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  for (const match of sql.matchAll(tableBlockPattern)) {
    const tableName = match[1];
    const body = match[2];
    if (!tableName || !body) continue;
    const columns: R7D1ExactColumnExpectation[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      if (
        line.length === 0 ||
        /^(constraint|unique|primary|foreign|check|references|or|and)\b/i.test(line)
      ) {
        continue;
      }
      const columnMatch =
        /^([a-z_][a-z0-9_]*)\s+(uuid|text|integer|timestamptz|jsonb|boolean|bigint)\b/i.exec(line);
      if (!columnMatch) continue;
      const pgCanonicalType = canonicalizeMigrationColumnTypeToken(columnMatch[2]);
      if (!pgCanonicalType) continue;
      const isPrimaryKeyColumn = /\bprimary\s+key\b/i.test(line);
      const defaultMatch = /\bdefault\s+(.+)$/i.exec(line);
      const canonicalDefaultExpression =
        defaultMatch?.[1] !== undefined ? canonicalizeMigrationDefaultExpression(defaultMatch[1]) : null;
      columns.push({
        columnName: columnMatch[1],
        pgCanonicalType,
        isNullable: isPrimaryKeyColumn ? false : !/\bnot\s+null\b/i.test(line),
        hasDefault: canonicalDefaultExpression !== null,
        canonicalDefaultExpression,
      });
    }
    if (columns.length > 0) {
      tableColumnsByTable[tableName] = columns;
    }
  }
  return tableColumnsByTable;
}

function extractFunctionHeaderBeforeBody(sql: string, startIndex: number): { readonly header: string; readonly ok: boolean } {
  const slice = sql.slice(startIndex);
  const asBodyMatch = /\bas\s+\$\$/i.exec(slice);
  if (!asBodyMatch || asBodyMatch.index === undefined) {
    return { header: '', ok: false };
  }
  return { header: slice.slice(0, asBodyMatch.index), ok: true };
}

function parseFunctionExpectations(sql: string): {
  readonly functions: R7D1ExactFunctionExpectation[];
  readonly verifiable: boolean;
} {
  const functions: R7D1ExactFunctionExpectation[] = [];
  let verifiable = true;
  const headerPattern = /create or replace function public\.([a-z0-9_]+)\s*(\([^)]*\))/gi;
  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(sql)) !== null) {
    const functionName = match[1];
    const identitySignature = match[2] ?? '()';
    if (!functionName || match.index === undefined) {
      continue;
    }
    const boundedHeader = extractFunctionHeaderBeforeBody(sql, match.index);
    if (!boundedHeader.ok) {
      verifiable = false;
      continue;
    }
    const searchPathMatch = /set\s+search_path\s*=\s*([^\n;]+)/i.exec(boundedHeader.header);
    const canonicalSearchPathConfig = searchPathMatch?.[1]
      ? `search_path=${searchPathMatch[1].replace(/\s+/g, ' ').trim().toLowerCase()}`
      : '';
    functions.push({
      functionName,
      identitySignature: identitySignature.replace(/\s+/g, ' ').trim(),
      canonicalSearchPathConfig,
      securityDefiner: /\bsecurity\s+definer\b/i.test(boundedHeader.header),
    });
  }
  return {
    functions: functions.sort((a, b) => a.functionName.localeCompare(b.functionName)),
    verifiable,
  };
}

function extractCanonicalSearchPathProconfigEntry(configRaw: string): string {
  const normalized = configRaw.trim().toLowerCase();
  if (!normalized) {
    return '';
  }
  const searchPathIndex = normalized.indexOf('search_path=');
  if (searchPathIndex < 0) {
    return '';
  }
  return normalized.slice(searchPathIndex).replace(/\s+/g, ' ').trim();
}

function combineCategoryStatuses(parts: readonly R7D1ExactCategoryStatus[]): R7D1ExactCategoryStatus {
  if (parts.includes('fail')) {
    return 'fail';
  }
  if (parts.includes('unobserved')) {
    return 'unobserved';
  }
  return 'pass';
}

function extractBalancedParenthesisContent(source: string, openParenIndex: number): { readonly content: string; readonly ok: boolean } {
  if (source[openParenIndex] !== '(') {
    return { content: '', ok: false };
  }
  let depth = 0;
  const contentStart = openParenIndex + 1;
  for (let i = openParenIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { content: source.slice(contentStart, i), ok: true };
      }
    }
  }
  return { content: '', ok: false };
}

function extractCreateTableBody(sql: string, tableName: string): string | null {
  const headerPattern = new RegExp(`create\\s+table\\s+public\\.${tableName}\\s*\\(`, 'i');
  const headerMatch = headerPattern.exec(sql);
  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }
  const openParenIndex = headerMatch.index + headerMatch[0].length - 1;
  const balanced = extractBalancedParenthesisContent(sql, openParenIndex);
  return balanced.ok ? balanced.content : null;
}

function splitSqlClausesAtDepthZero(body: string): string[] {
  const clauses: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    }
    if (ch === ',' && depth === 0) {
      if (current.trim()) {
        clauses.push(current.trim());
      }
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    clauses.push(current.trim());
  }
  return clauses;
}

function pushConstraintExpectation(
  expectations: R7D1ExactConstraintExpectation[],
  expectation: Omit<R7D1ExactConstraintExpectation, 'migrationDefVerifiable'> & { readonly migrationDefVerifiable?: boolean },
): void {
  expectations.push({
    ...expectation,
    migrationDefVerifiable: expectation.migrationDefVerifiable ?? true,
  });
}

function normalizeSqlFingerprint(fragment: string): string {
  return fragment
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/public\./gi, '')
    .toLowerCase();
}

function parseTriggerExpectations(sql: string): R7D1ExactTriggerExpectation[] {
  const triggers: R7D1ExactTriggerExpectation[] = [];
  const blockPattern =
    /create\s+trigger\s+([a-z0-9_]+)\s+([\s\S]*?)\s+on\s+public\.([a-z0-9_]+)\s+([\s\S]*?)execute\s+function\s+public\.([a-z0-9_]+)\s*\(\s*\)/gi;
  for (const match of sql.matchAll(blockPattern)) {
    const triggerName = match[1];
    const timingHeader = match[2] ?? '';
    const tableName = match[3];
    const functionName = match[5];
    if (!triggerName || !tableName || !functionName) continue;
    const normalized = timingHeader.replace(/\s+/g, ' ').trim().toLowerCase();
    triggers.push({
      triggerName,
      tableName,
      functionName,
      timingEvents: normalized,
    });
  }
  return triggers.sort((a, b) => a.triggerName.localeCompare(b.triggerName));
}

function parseConstraintExpectations(sql: string, tables: readonly string[]): {
  readonly expectations: R7D1ExactConstraintExpectation[];
  readonly verifiable: boolean;
} {
  const expectations: R7D1ExactConstraintExpectation[] = [];
  let verifiable = true;

  const parseParenAfterKeyword = (
    clause: string,
    keywordPattern: RegExp,
  ): { readonly inner: string; readonly ok: boolean } => {
    const match = keywordPattern.exec(clause);
    if (!match || match.index === undefined) {
      return { inner: '', ok: false };
    }
    const parenIndex = clause.indexOf('(', match.index + match[0].length - 1);
    if (parenIndex < 0) {
      return { inner: '', ok: false };
    }
    const balanced = extractBalancedParenthesisContent(clause, parenIndex);
    return { inner: balanced.content.replace(/\s+/g, ' ').trim(), ok: balanced.ok };
  };

  for (const table of tables) {
    const body = extractCreateTableBody(sql, table);
    if (!body) {
      verifiable = false;
      continue;
    }
    for (const clause of splitSqlClausesAtDepthZero(body)) {
      const normalizedClause = clause.replace(/\s+/g, ' ').trim();
      if (!normalizedClause) {
        continue;
      }

      const named = /^constraint\s+([a-z0-9_]+)\s+(check|foreign\s+key|unique|primary\s+key)\s+/i.exec(
        normalizedClause,
      );
      if (named) {
        const constraintName = named[1];
        const kind = named[2]?.toLowerCase() ?? '';
        const inner = parseParenAfterKeyword(normalizedClause, /constraint\s+[a-z0-9_]+\s+(?:check|foreign\s+key|unique|primary\s+key)\s*/i);
        if (!inner.ok || !constraintName) {
          verifiable = false;
          continue;
        }
        const constraintType: R7D1ExactConstraintExpectation['constraintType'] = kind.startsWith('check')
          ? 'c'
          : kind.startsWith('foreign')
            ? 'f'
            : kind.startsWith('unique')
              ? 'u'
              : 'p';
        const defPrefix = kind.startsWith('check')
          ? 'CHECK'
          : kind.startsWith('foreign')
            ? 'FOREIGN KEY'
            : kind.startsWith('unique')
              ? 'UNIQUE'
              : 'PRIMARY KEY';
        pushConstraintExpectation(expectations, {
          tableName: table,
          constraintName,
          constraintType,
          canonicalDefFingerprint: normalizeConstraintDefForCompare(`${defPrefix} (${inner.inner})`),
        });
        continue;
      }

      if (/^unique\s*\(/i.test(normalizedClause)) {
        const inner = parseParenAfterKeyword(normalizedClause, /^unique\s*/i);
        if (!inner.ok) {
          verifiable = false;
          continue;
        }
        pushConstraintExpectation(expectations, {
          tableName: table,
          constraintName: null,
          constraintType: 'u',
          canonicalDefFingerprint: normalizeConstraintDefForCompare(`UNIQUE (${inner.inner})`),
        });
        continue;
      }

      const inlinePk = /^(\w+)\s+[\s\w]+\bprimary\s+key\b/i.exec(normalizedClause);
      if (inlinePk?.[1]) {
        pushConstraintExpectation(expectations, {
          tableName: table,
          constraintName: null,
          constraintType: 'p',
          canonicalDefFingerprint: normalizeConstraintDefForCompare(`PRIMARY KEY (${inlinePk[1]})`),
        });
      }

      const checkIdx = normalizedClause.toLowerCase().indexOf(' check (');
      if (checkIdx >= 0) {
        const parenIndex = normalizedClause.indexOf('(', checkIdx);
        const balanced = extractBalancedParenthesisContent(normalizedClause, parenIndex);
        if (!balanced.ok) {
          verifiable = false;
          continue;
        }
        pushConstraintExpectation(expectations, {
          tableName: table,
          constraintName: null,
          constraintType: 'c',
          canonicalDefFingerprint: normalizeConstraintDefForCompare(`CHECK (${balanced.content.replace(/\s+/g, ' ').trim()})`),
        });
      }

      const referencesMatch = /^(\w+)\s+[\s\w]*references\s+public\.([a-z0-9_]+)\s*\(/i.exec(normalizedClause);
      if (referencesMatch) {
        const localColumn = referencesMatch[1];
        const refTable = referencesMatch[2];
        const refParenIndex = normalizedClause.indexOf('(', (referencesMatch.index ?? 0) + referencesMatch[0].length - 1);
        const refColsBalanced = extractBalancedParenthesisContent(normalizedClause, refParenIndex);
        if (!localColumn || !refTable || !refColsBalanced.ok) {
          verifiable = false;
          continue;
        }
        const refCol = refColsBalanced.content.replace(/\s+/g, ' ').trim();
        pushConstraintExpectation(expectations, {
          tableName: table,
          constraintName: null,
          constraintType: 'f',
          canonicalDefFingerprint: normalizeConstraintDefForCompare(
            `FOREIGN KEY (${localColumn}) REFERENCES ${refTable}(${refCol})`,
          ),
        });
      }
    }
  }

  const alterFkPattern =
    /alter\s+table\s+public\.([a-z0-9_]+)\s+add\s+constraint\s+([a-z0-9_]+)\s+foreign\s+key\s*\(/gi;
  for (const match of sql.matchAll(alterFkPattern)) {
    const tableName = match[1];
    const constraintName = match[2];
    const openParenIndex = match.index !== undefined ? sql.indexOf('(', match.index) : -1;
    if (!tableName || !constraintName || openParenIndex < 0) {
      verifiable = false;
      continue;
    }
    const localColsBalanced = extractBalancedParenthesisContent(sql, openParenIndex);
    if (!localColsBalanced.ok) {
      verifiable = false;
      continue;
    }
    const tail = sql.slice(openParenIndex + localColsBalanced.content.length + 2);
    const referencesMatch = /references\s+public\.([a-z0-9_]+)\s*\(/i.exec(tail);
    if (!referencesMatch || referencesMatch.index === undefined) {
      verifiable = false;
      continue;
    }
    const refOpen = tail.indexOf('(', referencesMatch.index);
    const refColsBalanced = extractBalancedParenthesisContent(tail, refOpen);
    if (!refColsBalanced.ok) {
      verifiable = false;
      continue;
    }
    pushConstraintExpectation(expectations, {
      tableName,
      constraintName,
      constraintType: 'f',
      canonicalDefFingerprint: normalizeConstraintDefForCompare(
        `FOREIGN KEY (${localColsBalanced.content.replace(/\s+/g, ' ').trim()}) REFERENCES ${referencesMatch[1]}(${refColsBalanced.content.replace(/\s+/g, ' ').trim()})`,
      ),
    });
  }

  return { expectations, verifiable };
}

function parseStandaloneIndexExpectations(sql: string): R7D1ExactIndexExpectation[] {
  const indexes: R7D1ExactIndexExpectation[] = [];
  const pattern =
    /create\s+(unique\s+)?index\s+([a-z0-9_]+)\s+on\s+public\.([a-z0-9_]+)\s*(\([\s\S]*?\))(?:\s+where\s+([\s\S]*?))?;/gi;
  for (const match of sql.matchAll(pattern)) {
    const isUnique = Boolean(match[1]);
    const indexName = match[2];
    const tableName = match[3];
    const columns = match[4] ?? '';
    const predicate = match[5] ?? '';
    if (!indexName || !tableName) continue;
    const indexDefForCompare = normalizeIndexDefForCompare(
      `create ${isUnique ? 'unique ' : ''}index ${indexName} on ${tableName} ${columns}${
        predicate ? ` where ${predicate}` : ''
      }`,
    );
    indexes.push({
      indexName,
      tableName,
      isUnique,
      indexColumnList: columns.trim(),
      wherePredicate: predicate ? predicate.replace(/\s+/g, ' ').trim() : null,
      canonicalDefFingerprint: indexDefForCompare,
    });
  }
  return indexes.sort((a, b) => a.indexName.localeCompare(b.indexName));
}

function splitMigrationGranteeList(raw: string): string[] {
  return raw
    .split(',')
    .map((grantee) => grantee.trim().toLowerCase())
    .filter(Boolean);
}

function deriveFinalPrivilegeExpectations(sql: string): {
  readonly expectedTablePrivilegeAbsences: readonly { readonly tableName: string; readonly grantee: string }[];
  readonly expectedFinalFunctionGrants: readonly R7D1ExactGrantRevokeExpectation[];
} {
  type PrivilegeEvent =
    | { readonly pos: number; readonly kind: 'revoke_table'; readonly tableName: string; readonly grantees: string[] }
    | {
        readonly pos: number;
        readonly kind: 'revoke_fn';
        readonly functionName: string;
        readonly identityArguments: string;
        readonly grantees: string[];
      }
    | {
        readonly pos: number;
        readonly kind: 'grant_fn';
        readonly functionName: string;
        readonly identityArguments: string;
        readonly grantee: string;
      };
  const events: PrivilegeEvent[] = [];
  const revokeTablePattern =
    /revoke\s+all\s+on\s+public\.([a-z0-9_]+)\s+from\s+([a-z0-9_,\s]+)/gi;
  for (const match of sql.matchAll(revokeTablePattern)) {
    const tableName = match[1];
    if (!tableName || match.index === undefined) continue;
    events.push({
      pos: match.index,
      kind: 'revoke_table',
      tableName,
      grantees: splitMigrationGranteeList(match[2] ?? ''),
    });
  }
  const revokeFnPattern =
    /revoke\s+all\s+on\s+function\s+public\.([a-z0-9_]+)\(([^)]*)\)\s+from\s+([a-z0-9_,\s]+)/gi;
  for (const match of sql.matchAll(revokeFnPattern)) {
    if (match.index === undefined) continue;
    events.push({
      pos: match.index,
      kind: 'revoke_fn',
      functionName: match[1],
      identityArguments: match[2] ?? '',
      grantees: splitMigrationGranteeList(match[3] ?? ''),
    });
  }
  const grantFnPattern =
    /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\(([^)]*)\)\s+to\s+([a-z0-9_]+)/gi;
  for (const match of sql.matchAll(grantFnPattern)) {
    if (match.index === undefined) continue;
    events.push({
      pos: match.index,
      kind: 'grant_fn',
      functionName: match[1],
      identityArguments: match[2] ?? '',
      grantee: (match[3] ?? '').trim().toLowerCase(),
    });
  }
  events.sort((a, b) => a.pos - b.pos);

  const tableAbsences = new Set<string>();
  const functionExecuteGrants = new Map<string, Set<string>>();

  const functionKey = (functionName: string, identityArguments: string): string =>
    `${functionName}|${normalizeFunctionIdentityArguments(identityArguments)}`;

  for (const event of events) {
    if (event.kind === 'revoke_table') {
      for (const grantee of event.grantees) {
        tableAbsences.add(`${event.tableName}|${grantee}`);
      }
      continue;
    }
    const fk = functionKey(event.functionName, event.identityArguments);
    if (event.kind === 'revoke_fn') {
      const grantees = functionExecuteGrants.get(fk) ?? new Set<string>();
      for (const grantee of event.grantees) {
        grantees.delete(grantee);
      }
      if (grantees.size === 0) {
        functionExecuteGrants.delete(fk);
      } else {
        functionExecuteGrants.set(fk, grantees);
      }
      continue;
    }
    const grantees = functionExecuteGrants.get(fk) ?? new Set<string>();
    grantees.add(event.grantee);
    functionExecuteGrants.set(fk, grantees);
  }

  const expectedTablePrivilegeAbsences = [...tableAbsences]
    .map((key) => {
      const [tableName, grantee] = key.split('|');
      return { tableName, grantee };
    })
    .sort((a, b) => `${a.tableName}:${a.grantee}`.localeCompare(`${b.tableName}:${b.grantee}`));

  const expectedFinalFunctionGrants: R7D1ExactGrantRevokeExpectation[] = [];
  for (const [fk, grantees] of functionExecuteGrants.entries()) {
    const splitAt = fk.indexOf('|');
    const functionName = splitAt >= 0 ? fk.slice(0, splitAt) : fk;
    const identityArguments = splitAt >= 0 ? fk.slice(splitAt + 1) : '';
    for (const grantee of [...grantees].sort()) {
      expectedFinalFunctionGrants.push({
        objectKind: 'function',
        objectName: functionName,
        identityArguments,
        grantee,
        privilege: 'EXECUTE',
        granted: true,
      });
    }
  }
  expectedFinalFunctionGrants.sort((a, b) =>
    `${a.objectName}:${a.identityArguments}:${a.grantee}`.localeCompare(
      `${b.objectName}:${b.identityArguments}:${b.grantee}`,
    ),
  );

  return { expectedTablePrivilegeAbsences, expectedFinalFunctionGrants };
}

function parseGrantRevokeExpectations(sql: string): R7D1ExactGrantRevokeExpectation[] {
  const expectations: R7D1ExactGrantRevokeExpectation[] = [];
  const revokeTablePattern =
    /revoke\s+all\s+on\s+public\.([a-z0-9_]+)\s+from\s+([a-z0-9_,\s]+)/gi;
  for (const match of sql.matchAll(revokeTablePattern)) {
    const tableName = match[1];
    const grantees = (match[2] ?? '').split(',').map((g) => g.trim()).filter(Boolean);
    for (const grantee of grantees) {
      expectations.push({
        objectKind: 'table',
        objectName: tableName,
        identityArguments: null,
        grantee,
        privilege: 'ALL',
        granted: false,
      });
    }
  }
  const revokeFnPattern =
    /revoke\s+all\s+on\s+function\s+public\.([a-z0-9_]+)\(([^)]*)\)\s+from\s+([a-z0-9_,\s]+)/gi;
  for (const match of sql.matchAll(revokeFnPattern)) {
    const functionName = match[1];
    const identityArguments = match[2] ?? '';
    const grantees = (match[3] ?? '').split(',').map((g) => g.trim()).filter(Boolean);
    for (const grantee of grantees) {
      expectations.push({
        objectKind: 'function',
        objectName: functionName,
        identityArguments,
        grantee,
        privilege: 'ALL',
        granted: false,
      });
    }
  }
  const grantFnPattern =
    /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\(([^)]*)\)\s+to\s+([a-z0-9_]+)/gi;
  for (const match of sql.matchAll(grantFnPattern)) {
    expectations.push({
      objectKind: 'function',
      objectName: match[1],
      identityArguments: match[2] ?? '',
      grantee: match[3],
      privilege: 'EXECUTE',
      granted: true,
    });
  }
  return expectations;
}

export function deriveD1ExactPostCatalogContract(repoRoot: string): R7D1ExactPostCatalogContract {
  const sql = loadPinnedMigrationBytes(repoRoot).toString('utf8');
  const tables = extractIdentifiers(sql, /create table public\.([a-z0-9_]+)/gi);
  const parsedFunctions = parseFunctionExpectations(sql);
  const functions = parsedFunctions.functions;
  const triggers = parseTriggerExpectations(sql);
  const explicitIndexes = extractIdentifiers(sql, /create (?:unique )?index ([a-z0-9_]+)/gi);
  const rlsEnabledTables = extractIdentifiers(sql, /alter table public\.([a-z0-9_]+) enable row level security/gi);
  const tableColumnsByTable = parseTableColumns(sql);
  const expectedFunctionGrantRevokeStatements = extractIdentifiers(
    sql,
    /revoke all on function public\.([a-z0-9_]+)\([^)]*\)[^;]*/gi,
  ).map((name) => `function:${name}`);
  const expectedTableGrantRevokeStatements = extractIdentifiers(
    sql,
    /revoke all on public\.([a-z0-9_]+)/gi,
  ).map((name) => `table:${name}`);
  const expectedRlsPolicies: R7D1ExactRlsPolicyExpectation[] = [];
  const policyPattern =
    /create\s+policy\s+([a-z0-9_]+)\s+on\s+public\.([a-z0-9_]+)/gi;
  for (const match of sql.matchAll(policyPattern)) {
    const policyName = match[1];
    const tableName = match[2];
    if (policyName && tableName) {
      expectedRlsPolicies.push({ policyName, tableName });
    }
  }
  expectedRlsPolicies.sort((a, b) =>
    `${a.tableName}:${a.policyName}`.localeCompare(`${b.tableName}:${b.policyName}`),
  );
  const parsedConstraints = parseConstraintExpectations(sql, tables);
  const expectedStandaloneIndexes = parseStandaloneIndexExpectations(sql);
  const expectedGrantRevokes = parseGrantRevokeExpectations(sql);
  const { expectedTablePrivilegeAbsences, expectedFinalFunctionGrants } = deriveFinalPrivilegeExpectations(sql);
  return {
    migrationVersion: R7_D1_EXACT_CONTRACT_PINNED_MIGRATION_VERSION,
    sourceSha256: R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256,
    tables,
    functions,
    triggers,
    explicitIndexes,
    rlsEnabledTables,
    expectedRlsPolicies,
    tableColumnsByTable,
    expectedFunctionGrantRevokeStatements,
    expectedTableGrantRevokeStatements,
    expectedConstraints: parsedConstraints.expectations,
    expectedStandaloneIndexes,
    expectedGrantRevokes,
    expectedTablePrivilegeAbsences,
    expectedFinalFunctionGrants,
    migrationDerivedConstraintsVerifiable: parsedConstraints.verifiable,
    migrationDerivedFunctionExpectationsVerifiable: parsedFunctions.verifiable,
  };
}

/** POST static (non-runtime) categories used for bounded exact-catalog remediation acceptance. */
export const R7_D1_EXACT_STATIC_POST_READONLY_CATEGORIES: readonly R7D1ExactCatalogEvidenceCategory[] =
  R7_D1_EXACT_MANDATORY_POST_READONLY_CATEGORIES.filter(
    (category) =>
      !R7_D1_EXACT_RUNTIME_ONLY_CATEGORIES.includes(category) &&
      category !== 'PRE_STATE_ABSENCE' &&
      category !== 'FUNCTION_IDENTITY_ARGS_SECURITY_OWNER',
  );

function sortedSetEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function readStrictString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function decodeNameRows(rows: readonly Record<string, unknown>[], key: string): string[] | null {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = readStrictString(row, key);
    if (!name || seen.has(name)) return null;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function readColumnDefaultRaw(row: Record<string, unknown>): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(row, 'column_default')) {
    return undefined;
  }
  const value = row.column_default;
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? value : undefined;
}

function compareColumns(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[],
): R7D1ExactCategoryStatus {
  const observedByTable: Record<string, Map<string, R7D1ExactColumnExpectation>> = {};
  for (const row of rows) {
    const tableName = readStrictString(row, 'table_name');
    const columnName = readStrictString(row, 'column_name');
    const dataTypeRaw = readStrictString(row, 'data_type');
    const nullableRaw = readStrictString(row, 'is_nullable');
    const defaultRaw = readColumnDefaultRaw(row);
    if (
      !tableName ||
      !columnName ||
      !dataTypeRaw ||
      (nullableRaw !== 'YES' && nullableRaw !== 'NO') ||
      defaultRaw === undefined
    ) {
      return 'fail';
    }
    const pgCanonicalType = canonicalizePgInformationSchemaType(dataTypeRaw);
    if (!pgCanonicalType) return 'fail';
    if (!observedByTable[tableName]) {
      observedByTable[tableName] = new Map();
    }
    observedByTable[tableName].set(columnName, {
      columnName,
      pgCanonicalType,
      isNullable: nullableRaw === 'YES',
      hasDefault: defaultRaw !== null,
      canonicalDefaultExpression: canonicalizeObservedDefaultExpression(defaultRaw),
    });
  }
  for (const table of contract.tables) {
    const expected = contract.tableColumnsByTable[table];
    const observedByName = observedByTable[table];
    if (!expected || !observedByName) return 'unobserved';
    if (observedByName.size !== expected.length) return 'fail';
    for (const e of expected) {
      const o = observedByName.get(e.columnName);
      if (
        !o ||
        e.pgCanonicalType !== o.pgCanonicalType ||
        e.isNullable !== o.isNullable
      ) {
        return 'fail';
      }
    }
  }
  return 'pass';
}

function compareDefaults(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[],
): R7D1ExactCategoryStatus {
  const observedByTable: Record<string, Map<string, string | null>> = {};
  for (const row of rows) {
    const tableName = readStrictString(row, 'table_name');
    const columnName = readStrictString(row, 'column_name');
    const defaultRaw = readColumnDefaultRaw(row);
    if (!tableName || !columnName || defaultRaw === undefined) {
      return 'fail';
    }
    if (!observedByTable[tableName]) {
      observedByTable[tableName] = new Map();
    }
    observedByTable[tableName].set(columnName, canonicalizeObservedDefaultExpression(defaultRaw));
  }
  for (const table of contract.tables) {
    const cols = contract.tableColumnsByTable[table];
    const observed = observedByTable[table];
    if (!cols || !observed) return 'unobserved';
    for (const col of cols) {
      const observedDefault = observed.get(col.columnName);
      if (observedDefault === undefined) {
        return 'unobserved';
      }
      if (observedDefault !== col.canonicalDefaultExpression) {
        return 'fail';
      }
    }
  }
  return 'pass';
}

function normalizeConstraintDefForCompare(def: string): string {
  return normalizeSqlFingerprint(def.replace(/\s+/g, ' '));
}

function compareTableConstraints(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!rows) {
    return 'unobserved';
  }
  if (!contract.migrationDerivedConstraintsVerifiable) {
    return 'unobserved';
  }
  if (contract.expectedConstraints.length === 0) {
    return 'unobserved';
  }
  const observedRows: {
    tableName: string;
    constraintName: string | null;
    constraintType: string;
    def: string;
  }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const tableName = readStrictString(row, 'table_name');
    const constraintName = readStrictString(row, 'constraint_name');
    const constraintType = readStrictString(row, 'constraint_type');
    const constraintDef = readStrictString(row, 'constraint_def');
    if (!tableName || !constraintType || !constraintDef) {
      return 'fail';
    }
    if (!contract.tables.includes(tableName)) {
      return 'fail';
    }
    const key = `${tableName}:${constraintName ?? ''}:${constraintType}:${constraintDef}`;
    if (seen.has(key)) {
      return 'fail';
    }
    seen.add(key);
    observedRows.push({
      tableName,
      constraintName,
      constraintType,
      def: normalizeConstraintDefForCompare(constraintDef),
    });
  }
  if (observedRows.length !== contract.expectedConstraints.length) {
    return 'fail';
  }
  const used = new Set<number>();
  for (const expected of contract.expectedConstraints) {
    if (!expected.migrationDefVerifiable) {
      return 'unobserved';
    }
    const matchIndex = observedRows.findIndex((observed, index) => {
      if (used.has(index)) {
        return false;
      }
      if (observed.tableName !== expected.tableName || observed.constraintType !== expected.constraintType) {
        return false;
      }
      if (observed.def !== expected.canonicalDefFingerprint) {
        return false;
      }
      if (expected.constraintName !== null && observed.constraintName !== expected.constraintName) {
        return false;
      }
      return true;
    });
    if (matchIndex < 0) {
      return 'fail';
    }
    used.add(matchIndex);
  }
  return 'pass';
}

function normalizeFunctionIdentityArguments(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

function compareFunctionArgsAndSecurityRows(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!contract.migrationDerivedFunctionExpectationsVerifiable) {
    return 'unobserved';
  }
  if (!rows) {
    return 'unobserved';
  }
  const matched = new Set<string>();
  for (const row of rows) {
    const functionName = readStrictString(row, 'function_name');
    const identityArgumentsRaw = row.identity_arguments;
    const securityDefiner = row.security_definer;
    if (!functionName || typeof identityArgumentsRaw !== 'string' || typeof securityDefiner !== 'boolean') {
      return 'fail';
    }
    const expected = contract.functions.find((f) => f.functionName === functionName);
    if (!expected) {
      return 'fail';
    }
    const expectedArgs = normalizeFunctionIdentityArguments(
      expected.identitySignature.replace(/^\(|\)$/g, ''),
    );
    if (normalizeFunctionIdentityArguments(identityArgumentsRaw) !== expectedArgs) {
      return 'fail';
    }
    if (securityDefiner !== expected.securityDefiner) {
      return 'fail';
    }
    if (matched.has(functionName)) {
      return 'fail';
    }
    matched.add(functionName);
  }
  return matched.size === contract.functions.length ? 'pass' : 'fail';
}

function compareFunctionOwnerRows(
  _contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!rows) {
    return 'unobserved';
  }
  return 'unobserved';
}

function compareFunctionIdentityArgsSecurityOwnerRows(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  const argsAndSecurity = compareFunctionArgsAndSecurityRows(contract, rows);
  if (argsAndSecurity === 'fail') {
    return 'fail';
  }
  const owner = compareFunctionOwnerRows(contract, rows);
  if (owner === 'unobserved') {
    return 'unobserved';
  }
  return argsAndSecurity;
}

function compareFunctionSearchPathRows(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!contract.migrationDerivedFunctionExpectationsVerifiable) {
    return 'unobserved';
  }
  if (!rows) {
    return 'unobserved';
  }
  for (const expected of contract.functions) {
    const row = rows.find((candidate) => readStrictString(candidate, 'function_name') === expected.functionName);
    if (!row) {
      return 'fail';
    }
    const configRaw = typeof row.function_config === 'string' ? row.function_config : '';
    const observedSearchPath = extractCanonicalSearchPathProconfigEntry(configRaw);
    if (observedSearchPath !== expected.canonicalSearchPathConfig) {
      return 'fail';
    }
  }
  return 'pass';
}

function stripPgCatalogQualifier(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  const parts = trimmed.split('.');
  return parts[parts.length - 1] ?? trimmed;
}

function parseTriggerDefParts(triggerDef: string): {
  timingEvents: string;
  tableName: string | null;
  functionName: string | null;
} {
  const compact = triggerDef.replace(/\s+/g, ' ').trim();
  const tableMatch = /\bon\s+((?:public\.)?[a-z0-9_]+)\b/i.exec(compact);
  const functionMatch = /execute\s+function\s+((?:public\.)?[a-z0-9_]+)/i.exec(compact);
  const timingMatch = /^create\s+trigger\s+[a-z0-9_]+\s+(.*?)\s+on\s+/i.exec(compact);
  return {
    timingEvents: normalizeSqlFingerprint(timingMatch?.[1] ?? ''),
    tableName: tableMatch ? stripPgCatalogQualifier(tableMatch[1]) : null,
    functionName: functionMatch ? stripPgCatalogQualifier(functionMatch[1]) : null,
  };
}

function compareTriggerBindingRows(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!rows) {
    return 'unobserved';
  }
  const matched = new Set<string>();
  for (const row of rows) {
    const triggerName = readStrictString(row, 'trigger_name');
    const tableName = readStrictString(row, 'table_name');
    const functionName = readStrictString(row, 'function_name');
    const enabled = readStrictString(row, 'enabled');
    const triggerDef = readStrictString(row, 'trigger_def');
    if (!triggerName || !tableName || !functionName || !enabled || !triggerDef) {
      return 'fail';
    }
    if (enabled !== 'O') {
      return 'fail';
    }
    const expected = contract.triggers.find((t) => t.triggerName === triggerName);
    if (!expected) {
      return 'fail';
    }
    if (tableName !== expected.tableName || functionName !== expected.functionName) {
      return 'fail';
    }
    const parts = parseTriggerDefParts(triggerDef);
    if (parts.tableName !== expected.tableName || parts.functionName !== expected.functionName) {
      return 'fail';
    }
    if (parts.timingEvents !== normalizeSqlFingerprint(expected.timingEvents)) {
      return 'fail';
    }
    if (matched.has(triggerName)) {
      return 'fail';
    }
    matched.add(triggerName);
  }
  return matched.size === contract.triggers.length ? 'pass' : 'fail';
}

function normalizeIndexDefForCompare(def: string): string {
  return normalizeSqlFingerprint(def.replace(/using\s+btree\s+/i, ''));
}

function compareStandaloneIndexDefinitions(
  contract: R7D1ExactPostCatalogContract,
  rows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!rows) {
    return 'unobserved';
  }
  if (contract.expectedStandaloneIndexes.length === 0) {
    return 'unobserved';
  }
  const matched = new Set<string>();
  for (const expected of contract.expectedStandaloneIndexes) {
    const row = rows.find((candidate) => readStrictString(candidate, 'index_name') === expected.indexName);
    if (!row) {
      return 'fail';
    }
    const tableName = readStrictString(row, 'table_name');
    const indexDef = readStrictString(row, 'index_def');
    if (!tableName || !indexDef) {
      return 'fail';
    }
    if (tableName !== expected.tableName) {
      return 'fail';
    }
    const normalizedDef = normalizeIndexDefForCompare(indexDef);
    if (normalizedDef !== expected.canonicalDefFingerprint) {
      return 'fail';
    }
    if (matched.has(expected.indexName)) {
      return 'fail';
    }
    matched.add(expected.indexName);
  }
  if (rows.length !== contract.expectedStandaloneIndexes.length) {
    return 'fail';
  }
  return 'pass';
}

function grantExpectationKey(expectation: R7D1ExactGrantRevokeExpectation): string {
  return `${expectation.objectKind}:${expectation.objectName}:${expectation.identityArguments ?? ''}:${expectation.grantee}:${expectation.privilege}:${expectation.granted}`;
}

function compareGrantRevokeExpectations(
  contract: R7D1ExactPostCatalogContract,
  tablePrivilegeRows: readonly Record<string, unknown>[] | undefined,
  functionPrivilegeRows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!tablePrivilegeRows || !functionPrivilegeRows) {
    return 'unobserved';
  }
  if (
    contract.expectedTablePrivilegeAbsences.length === 0 &&
    contract.expectedFinalFunctionGrants.length === 0
  ) {
    return 'unobserved';
  }
  for (const row of tablePrivilegeRows) {
    const tableName = readStrictString(row, 'table_name');
    const grantee = readStrictString(row, 'grantee');
    const privilegeType = readStrictString(row, 'privilege_type');
    const tableOwnerRole = readStrictString(row, 'table_owner_role');
    if (!tableName || !grantee || !privilegeType) {
      return 'fail';
    }
    if (!contract.tables.includes(tableName)) {
      return 'fail';
    }
    const granteeKey = grantee.toLowerCase();
    const forbidden = contract.expectedTablePrivilegeAbsences.some(
      (absence) => absence.tableName === tableName && absence.grantee === granteeKey,
    );
    if (forbidden) {
      return 'fail';
    }
    if (!tableOwnerRole) {
      return 'unobserved';
    }
    if (granteeKey !== tableOwnerRole.toLowerCase()) {
      return 'fail';
    }
  }
  const expectedFunctionPrivileges = new Set<string>();
  for (const expected of contract.expectedFinalFunctionGrants) {
    expectedFunctionPrivileges.add(
      `${expected.objectName}|${normalizeFunctionIdentityArguments(expected.identityArguments ?? '')}|${expected.grantee.toLowerCase()}|${expected.privilege}`,
    );
  }
  const observedFunctionPrivileges = new Set<string>();
  const revokedFunctionGrantees = new Set(
    contract.expectedGrantRevokes
      .filter((entry) => entry.objectKind === 'function' && !entry.granted)
      .map((entry) => entry.grantee.toLowerCase()),
  );
  for (const row of functionPrivilegeRows) {
    const functionName = readStrictString(row, 'function_name');
    const identityArgumentsValue = row.identity_arguments;
    const grantee = readStrictString(row, 'grantee');
    const privilegeType = readStrictString(row, 'privilege_type');
    const functionOwnerRole = readStrictString(row, 'function_owner_role');
    if (!functionName || typeof identityArgumentsValue !== 'string' || !grantee || !privilegeType) {
      return 'fail';
    }
    const identityArgumentsRaw = identityArgumentsValue;
    if (!contract.functions.some((f) => f.functionName === functionName)) {
      return 'fail';
    }
    const granteeKey = grantee.toLowerCase();
    const privilege = privilegeType.toUpperCase();
    const privilegeKey = `${functionName}|${normalizeFunctionIdentityArguments(identityArgumentsRaw)}|${granteeKey}|${privilege}`;
    observedFunctionPrivileges.add(privilegeKey);
    if (expectedFunctionPrivileges.has(privilegeKey)) {
      continue;
    }
    if (revokedFunctionGrantees.has(granteeKey)) {
      return 'fail';
    }
    if (!functionOwnerRole) {
      return 'unobserved';
    }
    if (granteeKey !== functionOwnerRole.toLowerCase()) {
      return 'fail';
    }
  }
  for (const expectedKey of expectedFunctionPrivileges) {
    if (!observedFunctionPrivileges.has(expectedKey)) {
      return 'fail';
    }
  }
  return 'pass';
}

function compareRlsPolicies(
  contract: R7D1ExactPostCatalogContract,
  policyRows: readonly Record<string, unknown>[] | undefined,
): R7D1ExactCategoryStatus {
  if (!policyRows) {
    return 'unobserved';
  }
  const observed: string[] = [];
  const seen = new Set<string>();
  for (const row of policyRows) {
    const policyName = readStrictString(row, 'policy_name');
    const tableName = readStrictString(row, 'table_name');
    if (!policyName || !tableName) {
      return 'fail';
    }
    const key = `${tableName}:${policyName}`;
    if (seen.has(key)) {
      return 'fail';
    }
    seen.add(key);
    observed.push(key);
  }
  observed.sort();
  const expected = contract.expectedRlsPolicies.map((p) => `${p.tableName}:${p.policyName}`).sort();
  return sortedSetEqual(observed, expected) ? 'pass' : 'fail';
}

export function isProducerBoundCatalogEvidence(value: unknown): value is R7D1ProducerBoundCatalogEvidence {
  return value !== null && typeof value === 'object' && producerBoundCatalogEvidenceRegistry.has(value);
}

export type ProduceProducerBoundD1CatalogEvidenceOptions = {
  readonly trustedQueryExecutionContext?: R7D1TrustedCatalogQueryExecutionContext;
  /** Unit tests only — never confers production VERIFIED. */
  readonly unitTestFixtureRows?: true;
  readonly boundPreCatalogProofDigestSha256?: string | null;
};

export function deriveExactCatalogObservationQueryPlanDigestSha256(): string {
  return createHash('sha256')
    .update(R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN.map((e) => `${e.key}:${e.sql}`).join('\n'), 'utf8')
    .digest('hex');
}

export function produceProducerBoundD1CatalogEvidenceFromQueryResults(
  repoRoot: string,
  resultsByKey: Readonly<Partial<Record<R7D1ExactCatalogQueryKey, readonly Record<string, unknown>[]>>>,
  phase: R7D1ExactCatalogObservationPhase = 'POST_READONLY',
  options: ProduceProducerBoundD1CatalogEvidenceOptions = {},
): { readonly ok: true; readonly evidence: R7D1ProducerBoundCatalogEvidence } | { readonly ok: false } {
  if (!options.unitTestFixtureRows) {
    const ctx = options.trustedQueryExecutionContext;
    if (!ctx || !isTrustedCatalogQueryExecutionContext(ctx)) {
      return { ok: false };
    }
    if (ctx.queryPlanDigestSha256 !== deriveExactCatalogObservationQueryPlanDigestSha256()) {
      return { ok: false };
    }
    for (const entry of R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN) {
      if (!resultsByKey[entry.key]) {
        return { ok: false };
      }
    }
  }
  const contract = deriveD1ExactPostCatalogContract(repoRoot);
  const categoryOutcomes: Partial<Record<R7D1ExactCatalogEvidenceCategory, R7D1ExactCategoryStatus>> = {};

  const tablesRows = resultsByKey.TABLES;
  const functionsRows = resultsByKey.FUNCTIONS;
  const triggersRows = resultsByKey.TRIGGERS;
  const indexesRows = resultsByKey.EXPLICIT_INDEXES;
  const rlsRows = resultsByKey.RLS_ENABLEMENTS;
  const migrationRows = resultsByKey.MIGRATION_HISTORY_ROW;
  const columnRows = resultsByKey.TABLE_COLUMNS_TYPES_NULLABILITY;
  const policyRows = resultsByKey.RLS_POLICIES;
  const constraintRows = resultsByKey.TABLE_CONSTRAINTS;
  const functionIdentityRows = resultsByKey.FUNCTION_IDENTITY_ROWS;
  const triggerBindingRows = resultsByKey.TRIGGER_BINDING_ROWS;
  const standaloneIndexRows = resultsByKey.STANDALONE_INDEX_DEFINITIONS;
  const tablePrivilegeRows = resultsByKey.TABLE_PRIVILEGES;
  const functionPrivilegeRows = resultsByKey.FUNCTION_PRIVILEGES;
  if (!tablesRows || !functionsRows || !triggersRows || !indexesRows || !rlsRows || !migrationRows || !columnRows) {
    return { ok: false };
  }
  if (!options.unitTestFixtureRows) {
    const ctx = options.trustedQueryExecutionContext;
    if (!ctx || trustedCatalogContextSessionBinding.get(ctx) !== ctx.sessionObjectIdentity) {
      return { ok: false };
    }
  }

  const tablesPresent = decodeNameRows(tablesRows, 'name');
  const functionsPresent = decodeNameRows(functionsRows, 'name');
  const triggersPresent = decodeNameRows(triggersRows, 'name');
  const explicitIndexesPresent = decodeNameRows(indexesRows, 'name');
  const rlsEnabledTablesPresent = decodeNameRows(rlsRows, 'name');
  if (
    !tablesPresent ||
    !functionsPresent ||
    !triggersPresent ||
    !explicitIndexesPresent ||
    !rlsEnabledTablesPresent
  ) {
    return { ok: false };
  }

  const expectedFunctionNames = contract.functions.map((f) => f.functionName).sort();
  const expectedTriggerNames = contract.triggers.map((t) => t.triggerName).sort();

  const preComplianceInventoryAbsent =
    phase === 'PRE_READONLY' &&
    tablesPresent.length === 0 &&
    functionsPresent.length === 0 &&
    triggersPresent.length === 0 &&
    explicitIndexesPresent.length === 0;

  if (preComplianceInventoryAbsent) {
    categoryOutcomes.TABLES = 'pass';
    categoryOutcomes.FUNCTIONS = 'pass';
    categoryOutcomes.TRIGGERS = 'pass';
    categoryOutcomes.EXPLICIT_INDEXES = 'pass';
    categoryOutcomes.RLS_ENABLEMENTS = 'pass';
    categoryOutcomes.TABLE_COLUMNS_TYPES_NULLABILITY = 'pass';
    categoryOutcomes.TABLE_DEFAULTS = 'pass';
    categoryOutcomes.TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK = 'pass';
    categoryOutcomes.FUNCTION_IDENTITY_ARGS_SECURITY_OWNER = 'pass';
    categoryOutcomes.FUNCTION_DEFINITION_SEARCH_PATH = 'pass';
    categoryOutcomes.TRIGGER_TIMING_EVENTS_BINDING = 'pass';
    categoryOutcomes.INDEX_DEFINITIONS_PREDICATES = 'pass';
    categoryOutcomes.RLS_POLICIES = 'pass';
    categoryOutcomes.GRANTS_REVOKES = 'pass';
  } else {
    categoryOutcomes.TABLES = sortedSetEqual(tablesPresent, [...contract.tables].sort()) ? 'pass' : 'fail';
    categoryOutcomes.FUNCTIONS =
      sortedSetEqual(functionsPresent, expectedFunctionNames) && functionsPresent.length === contract.functions.length
        ? 'pass'
        : 'fail';
    categoryOutcomes.TRIGGERS =
      sortedSetEqual(triggersPresent, expectedTriggerNames) && triggersPresent.length === contract.triggers.length
        ? 'pass'
        : 'fail';
    categoryOutcomes.EXPLICIT_INDEXES = sortedSetEqual(explicitIndexesPresent, [...contract.explicitIndexes].sort())
      ? 'pass'
      : 'fail';
    categoryOutcomes.RLS_ENABLEMENTS = sortedSetEqual(rlsEnabledTablesPresent, [...contract.rlsEnabledTables].sort())
      ? 'pass'
      : 'fail';

    categoryOutcomes.TABLE_COLUMNS_TYPES_NULLABILITY = compareColumns(contract, columnRows);
    categoryOutcomes.TABLE_DEFAULTS = compareDefaults(contract, columnRows);
    categoryOutcomes.TABLE_PRIMARY_FOREIGN_UNIQUE_CHECK = compareTableConstraints(contract, constraintRows);
    categoryOutcomes.FUNCTION_IDENTITY_ARGS_SECURITY_OWNER = compareFunctionIdentityArgsSecurityOwnerRows(
      contract,
      functionIdentityRows,
    );
    categoryOutcomes.FUNCTION_DEFINITION_SEARCH_PATH = compareFunctionSearchPathRows(contract, functionIdentityRows);
    categoryOutcomes.TRIGGER_TIMING_EVENTS_BINDING = compareTriggerBindingRows(contract, triggerBindingRows);
    categoryOutcomes.INDEX_DEFINITIONS_PREDICATES = compareStandaloneIndexDefinitions(contract, standaloneIndexRows);
    categoryOutcomes.RLS_POLICIES = compareRlsPolicies(contract, policyRows);
    categoryOutcomes.GRANTS_REVOKES = compareGrantRevokeExpectations(
      contract,
      tablePrivilegeRows,
      functionPrivilegeRows,
    );
  }

  const versions: string[] = [];
  for (const row of migrationRows) {
    const version = readStrictString(row, 'version');
    if (!version) return { ok: false };
    versions.push(version);
  }
  const migrationTail = versions.length > 0 ? versions[versions.length - 1] : null;
  categoryOutcomes.MIGRATION_HISTORY_ROW =
    versions.length === 0 ? 'unobserved' : classifyMigrationHistoryObservation(versions, phase);

  if (phase === 'PRE_READONLY') {
    categoryOutcomes.PRE_STATE_ABSENCE =
      tablesPresent.length === 0 &&
      functionsPresent.length === 0 &&
      triggersPresent.length === 0 &&
      explicitIndexesPresent.length === 0
        ? 'pass'
        : 'fail';
  } else {
    const boundPre = resolveBoundPreCatalogProofCategoryOutcomes(options.boundPreCatalogProofDigestSha256);
    categoryOutcomes.PRE_STATE_ABSENCE = boundPre?.PRE_STATE_ABSENCE === 'pass' ? 'pass' : 'unobserved';
  }
  categoryOutcomes.POST_UNEXPECTED_EXTRA = 'unobserved';
  categoryOutcomes.FUNCTION_SECURITY_RUNTIME = 'unobserved';
  categoryOutcomes.TRIGGER_TIMING_RUNTIME = 'unobserved';
  categoryOutcomes.IMPLICIT_INDEX_RUNTIME = 'unobserved';
  categoryOutcomes.GRANT_REVOKE_RUNTIME = 'unobserved';
  categoryOutcomes.POLICY_BODY_RUNTIME = 'unobserved';

  const mandatoryForPhase = listMandatoryD1ExactCategoriesForPhase(phase);
  for (const category of mandatoryForPhase) {
    if (categoryOutcomes[category] === undefined) {
      categoryOutcomes[category] = 'unobserved';
    }
  }
  if (phase === 'POST_READONLY' && categoryOutcomes.PRE_STATE_ABSENCE !== 'pass') {
    categoryOutcomes.PRE_STATE_ABSENCE = 'unobserved';
  }

  const observationDigestPayload = {
    phase,
    boundPreCatalogProofDigestSha256: options.boundPreCatalogProofDigestSha256 ?? null,
    migrationVersion: R7_D1_EXACT_CONTRACT_PINNED_MIGRATION_VERSION,
    sourceSha256: R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256,
    normalizedCompositeSha256: R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256,
    queryPlanDigestSha256: deriveExactCatalogObservationQueryPlanDigestSha256(),
    observedMigrationVersions: versions,
    resultsByKey: R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN.map((entry) => ({
      key: entry.key,
      rows: resultsByKey[entry.key] ?? [],
    })),
    categoryOutcomes,
  };
  const evidenceDigestSha256 = createHash('sha256')
    .update(Buffer.from(canonicalSerializePreviewRemoteApply(observationDigestPayload), 'utf8'))
    .digest('hex');

  const evidence: R7D1ProducerBoundCatalogEvidence = {
    evidenceDigestSha256,
    observationPhase: phase,
    boundPreCatalogProofDigestSha256: options.boundPreCatalogProofDigestSha256 ?? null,
    migrationVersionTail: migrationTail,
    observedMigrationVersions: versions,
    tablesPresent,
    functionsPresent,
    triggersPresent,
    explicitIndexesPresent,
    rlsEnabledTablesPresent,
    categoryOutcomes: Object.freeze({ ...categoryOutcomes }),
  };
  Object.freeze(evidence);
  producerBoundCatalogEvidenceRegistry.add(evidence);
  if (phase === 'PRE_READONLY' && categoryOutcomes.PRE_STATE_ABSENCE === 'pass') {
    const provenanceTier: R7D1CatalogObservationProvenanceTier = options.unitTestFixtureRows
      ? 'unit_test_fixture'
      : (options.trustedQueryExecutionContext?.observationProvenanceTier ?? 'unit_test_fixture');
    registerImmutablePreCatalogProofFromTrustedEvidence(evidence, provenanceTier);
  }
  return { ok: true, evidence };
}

export function evaluateProducerBoundD1CatalogEvidence(
  repoRoot: string,
  evidence: R7D1ProducerBoundCatalogEvidence,
): { readonly ok: true } | { readonly ok: false; readonly pendingCategories: readonly R7D1ExactCatalogEvidenceCategory[] } {
  if (!isProducerBoundCatalogEvidence(evidence)) {
    return { ok: false, pendingCategories: R7_D1_EXACT_MANDATORY_CATEGORIES };
  }
  deriveD1ExactPostCatalogContract(repoRoot);
  if (!producerBoundCatalogEvidenceRegistry.has(evidence)) {
    return { ok: false, pendingCategories: R7_D1_EXACT_MANDATORY_CATEGORIES };
  }
  const pending: R7D1ExactCatalogEvidenceCategory[] = [];
  const mandatory = listMandatoryD1ExactCategoriesForPhase(evidence.observationPhase);
  for (const category of mandatory) {
    if (evidence.categoryOutcomes[category] !== 'pass') {
      pending.push(category);
    }
  }
  if (evidence.observationPhase === 'POST_READONLY') {
    if (evidence.categoryOutcomes.PRE_STATE_ABSENCE !== 'pass') {
      pending.push('PRE_STATE_ABSENCE');
    }
  }
  if (pending.length > 0) {
    return { ok: false, pendingCategories: pending };
  }
  return { ok: true };
}

/** Unit tests only — aligned positive static fixture for pinned migration contract. */
export function buildUnitTestAlignedExactCatalogQueryResults(
  repoRoot: string,
  phase: R7D1ExactCatalogObservationPhase,
): Partial<Record<R7D1ExactCatalogQueryKey, readonly Record<string, unknown>[]>> {
  if (phase === 'PRE_READONLY') {
    return {
      TABLES: [],
      FUNCTIONS: [],
      TRIGGERS: [],
      EXPLICIT_INDEXES: [],
      RLS_ENABLEMENTS: [],
      MIGRATION_HISTORY_ROW: deriveD1ExpectedPreMigrationVersionList().map((version) => ({ version })),
      TABLE_COLUMNS_TYPES_NULLABILITY: [],
      RLS_POLICIES: [],
      TABLE_CONSTRAINTS: [],
      FUNCTION_IDENTITY_ROWS: [],
      TRIGGER_BINDING_ROWS: [],
      STANDALONE_INDEX_DEFINITIONS: [],
      TABLE_PRIVILEGES: [],
      FUNCTION_PRIVILEGES: [],
    };
  }
  const contract = deriveD1ExactPostCatalogContract(repoRoot);
  const columnRows: Record<string, unknown>[] = [];
  for (const table of contract.tables) {
    const cols = contract.tableColumnsByTable[table] ?? [];
    for (const col of cols) {
      columnRows.push({
        table_name: table,
        column_name: col.columnName,
        data_type: col.pgCanonicalType === 'timestamptz' ? 'timestamp with time zone' : col.pgCanonicalType,
        is_nullable: col.isNullable ? 'YES' : 'NO',
        column_default: col.canonicalDefaultExpression,
      });
    }
  }
  const constraintRows = contract.expectedConstraints.map((expected, index) => ({
    table_name: expected.tableName,
    constraint_name: expected.constraintName ?? `synthetic_constraint_${index}`,
    constraint_type: expected.constraintType,
    constraint_def: expected.canonicalDefFingerprint,
  }));
  const functionIdentityRows = contract.functions.map((f) => ({
    function_name: f.functionName,
    identity_arguments: f.identitySignature.replace(/^\(|\)$/g, ''),
    security_definer: f.securityDefiner,
    function_config: f.canonicalSearchPathConfig,
  }));
  const triggerBindingRows = contract.triggers.map((t) => ({
    trigger_name: t.triggerName,
    table_name: t.tableName,
    function_name: t.functionName,
    enabled: 'O',
    trigger_def: `CREATE TRIGGER ${t.triggerName} ${t.timingEvents} ON ${t.tableName} FOR EACH ROW EXECUTE FUNCTION ${t.functionName}()`,
  }));
  const standaloneIndexRows = contract.expectedStandaloneIndexes.map((index) => ({
    index_name: index.indexName,
    table_name: index.tableName,
    index_def: `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${index.indexName} ON public.${index.tableName} USING btree ${index.indexColumnList}${
      index.wherePredicate ? ` WHERE ${index.wherePredicate}` : ''
    }`,
  }));
  const functionPrivilegeRows = contract.expectedFinalFunctionGrants.map((entry) => ({
    function_name: entry.objectName,
    identity_arguments: entry.identityArguments ?? '',
    grantee: entry.grantee,
    privilege_type: entry.privilege,
    function_owner_role: 'postgres',
  }));
  const migrationVersions = deriveD1ExpectedPostMigrationVersionList();
  return {
    TABLES: contract.tables.map((name) => ({ name })),
    FUNCTIONS: contract.functions.map((f) => ({ name: f.functionName })),
    TRIGGERS: contract.triggers.map((t) => ({ name: t.triggerName })),
    EXPLICIT_INDEXES: contract.explicitIndexes.map((name) => ({ name })),
    RLS_ENABLEMENTS: contract.rlsEnabledTables.map((name) => ({ name })),
    MIGRATION_HISTORY_ROW: migrationVersions.map((version) => ({ version })),
    TABLE_COLUMNS_TYPES_NULLABILITY: columnRows,
    RLS_POLICIES: contract.expectedRlsPolicies.map((p) => ({
      policy_name: p.policyName,
      table_name: p.tableName,
    })),
    TABLE_CONSTRAINTS: constraintRows,
    FUNCTION_IDENTITY_ROWS: functionIdentityRows,
    TRIGGER_BINDING_ROWS: triggerBindingRows,
    STANDALONE_INDEX_DEFINITIONS: standaloneIndexRows,
    TABLE_PRIVILEGES: [],
    FUNCTION_PRIVILEGES: functionPrivilegeRows,
  };
}

export function rejectForgeableExactCatalogEvidenceInput(_forged: Record<string, unknown>): { readonly ok: false } {
  return { ok: false };
}
