import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  deriveNormalizedStatementsFromSourceBytes,
  FROZEN_DELTA_SOURCE_SPECS,
  type R7DeltaStepId,
} from './r7D1D5OfflinePlan.ts';
import {
  deriveD1ExactPostCatalogContract,
  deriveExactCatalogObservationQueryPlanDigestSha256,
  evaluateProducerBoundD1CatalogEvidence,
  observationProvenanceTierAllowsVerifiedCatalogAttestation,
  produceProducerBoundD1CatalogEvidenceFromQueryResults,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
  type R7D1CatalogObservationProvenanceTier,
  R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN,
  type R7D1ExactCatalogObservationPhase,
  type R7D1ExactCatalogQueryKey,
  type R7D1ProducerBoundCatalogEvidence,
  type R7D1TrustedCatalogQueryExecutionContext,
} from './r7D1ExactCatalogContract.ts';

export const R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE = true as const;

/** Isolated local disposable PostgreSQL proof scope — does not open Preview/Production execution gates. */
let localDisposableCatalogProofScopeDepth = 0;

export type R7D1LocalDisposableCatalogProofScope = {
  readonly exit: () => void;
};

export function enterR7D1LocalDisposableCatalogProofScope(): R7D1LocalDisposableCatalogProofScope {
  localDisposableCatalogProofScopeDepth += 1;
  return {
    exit: () => {
      localDisposableCatalogProofScopeDepth = Math.max(0, localDisposableCatalogProofScopeDepth - 1);
    },
  };
}

export function isR7D1LocalDisposableCatalogProofScopeActive(): boolean {
  return localDisposableCatalogProofScopeDepth > 0;
}

export const R7_D1_PINNED_MIGRATION_VERSION = '20260924000000' as const;

export const R7_D1_PINNED_SOURCE_SHA256 =
  'be909ec8e3737f87f668d6504400fafde2c5d57203667aaedc93b3c0b308d159' as const;

export const R7_D1_PINNED_NORMALIZED_COMPOSITE_SHA256 =
  'a75610d21f75f791c6424817afed00dca5f21e3c9b16eed4955b8dd6d16023df' as const;

export const R7_D1_PINNED_RELATIVE_MIGRATION_PATH =
  'supabase/migrations/20260924000000_m55_r5_compliance_control_plane_v1.sql' as const;

export type R7D1CatalogEvidenceCategory =
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

export const R7_D1_FULL_CATALOG_SEMANTIC_COVERAGE_PENDING_CATEGORIES: readonly R7D1CatalogEvidenceCategory[] = [
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
  'PRE_STATE_ABSENCE',
  'POST_UNEXPECTED_EXTRA',
  'FUNCTION_SECURITY_RUNTIME',
  'TRIGGER_TIMING_RUNTIME',
  'IMPLICIT_INDEX_RUNTIME',
  'GRANT_REVOKE_RUNTIME',
  'POLICY_BODY_RUNTIME',
] as const;

export type R7D1StaticCatalogExpectation = {
  readonly migrationVersion: typeof R7_D1_PINNED_MIGRATION_VERSION;
  readonly sourceSha256: typeof R7_D1_PINNED_SOURCE_SHA256;
  readonly tables: readonly string[];
  readonly functions: readonly string[];
  readonly triggers: readonly string[];
  readonly explicitIndexes: readonly string[];
  readonly rlsEnabledTables: readonly string[];
  readonly staticVerifiedCategories: readonly R7D1CatalogEvidenceCategory[];
  readonly runtimeUnverifiedCategories: readonly R7D1CatalogEvidenceCategory[];
};

export type R7D1CatalogObservation = {
  readonly anchorTableCount: number | null;
  readonly tablesPresent: readonly string[];
  readonly functionsPresent: readonly string[];
  readonly triggersPresent: readonly string[];
  readonly explicitIndexesPresent: readonly string[];
  readonly rlsEnabledTablesPresent: readonly string[];
};

export type R7D1CatalogSemanticCategoryStatus = 'pass' | 'fail' | 'unobserved';

/** Caller-supplied maps are forgeable — never used for trusted VERIFIED (EXR-02). */
export type R7D1CatalogSemanticObservation = {
  readonly supabaseMigrationVersion: string | null;
  readonly categoryStatus: Readonly<Partial<Record<R7D1CatalogEvidenceCategory, R7D1CatalogSemanticCategoryStatus>>>;
};

export type R7D1TableColumnExpectation = {
  readonly columnName: string;
  readonly dataTypeToken: string;
  readonly isNullable: boolean;
};

export type R7D1SemanticCatalogExpectation = R7D1StaticCatalogExpectation & {
  readonly tableColumnsByTable: Readonly<Record<string, readonly R7D1TableColumnExpectation[]>>;
  readonly expectedFunctionCount: number;
  readonly expectedTriggerCount: number;
};

export const R7_D1_TRUSTED_COLLECTOR_PROVENANCE = 'D1_READONLY_QUERY_COLLECTOR_INTERNAL_V1' as const;

export type R7D1TrustedCollectedCatalogObservation = {
  readonly provenance: typeof R7_D1_TRUSTED_COLLECTOR_PROVENANCE;
  readonly observationProvenanceTier: R7D1CatalogObservationProvenanceTier;
  readonly observationDigestSha256: string;
  readonly nameObservation: R7D1CatalogObservation;
  readonly supabaseMigrationVersion: string | null;
  readonly categoryOutcomes: Readonly<Partial<Record<R7D1CatalogEvidenceCategory, R7D1CatalogSemanticCategoryStatus>>>;
};

const trustedCollectedCatalogObservationRegistry = new WeakSet<R7D1TrustedCollectedCatalogObservation>();
const trustedCollectedToProducerEvidence = new WeakMap<
  R7D1TrustedCollectedCatalogObservation,
  R7D1ProducerBoundCatalogEvidence
>();

export type R7D1TrustedCatalogVerificationResult =
  | {
      readonly ok: true;
      readonly catalogState: 'VERIFIED' | 'PENDING_FRESH_READONLY_CATALOG';
      readonly staticDrift: false;
      readonly runtimeUnverifiedCategories: readonly R7D1CatalogEvidenceCategory[];
    }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | 'HOLD_SOURCE_DIGEST_MISMATCH'
        | 'HOLD_POST_COMMIT_VERIFICATION_FAILED'
        | 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED';
      readonly driftClass: 'PARTIAL' | 'EXTRA' | 'MISSING' | 'SHAPE';
      readonly pendingCategories?: readonly R7D1CatalogEvidenceCategory[];
    };

export const R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES: readonly R7D1CatalogEvidenceCategory[] = [
  'TABLES',
  'FUNCTIONS',
  'TRIGGERS',
  'EXPLICIT_INDEXES',
  'RLS_ENABLEMENTS',
  ...R7_D1_FULL_CATALOG_SEMANTIC_COVERAGE_PENDING_CATEGORIES,
] as const;

export type R7D1CatalogObservationQuerySession = {
  query(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: readonly Record<string, unknown>[]; readonly rowCount: number }>;
};

/** Read-only pg_catalog observation bundle — executed only when trusted catalog gate is open. */
export type R7D1CatalogObservationQueryKey = R7D1ExactCatalogQueryKey;

export const R7_D1_PG_CATALOG_OBSERVATION_QUERIES: readonly {
  readonly key: R7D1CatalogObservationQueryKey;
  readonly sql: string;
}[] = R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN.map((entry) => ({
  key: entry.key as R7D1CatalogObservationQueryKey,
  sql: entry.sql,
}));

export function listMandatoryD1CatalogEvidenceCategories(): readonly R7D1CatalogEvidenceCategory[] {
  return R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES;
}

const D1_TABLE_PREFIX = 'm55_r5_compliance_';

function sha256Buffer(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function extractIdentifiers(sql: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  for (const match of sql.matchAll(pattern)) {
    const id = match[1];
    if (id) found.add(id);
  }
  return [...found].sort();
}

export function verifyD1PinnedSourceAndNormalizedComposite(
  repoRoot: string,
): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: 'HOLD_SOURCE_DIGEST_MISMATCH' } {
  const spec = FROZEN_DELTA_SOURCE_SPECS.find((s) => s.stepId === 'D1');
  if (!spec || spec.relativePath !== R7_D1_PINNED_RELATIVE_MIGRATION_PATH) {
    return { ok: false, holdReasonCode: 'HOLD_SOURCE_DIGEST_MISMATCH' };
  }
  const bytes = loadPinnedD1MigrationBytes(repoRoot);
  if (sha256Buffer(bytes) !== R7_D1_PINNED_SOURCE_SHA256 || spec.sourceSha256 !== R7_D1_PINNED_SOURCE_SHA256) {
    return { ok: false, holdReasonCode: 'HOLD_SOURCE_DIGEST_MISMATCH' };
  }
  const { normalized } = deriveNormalizedStatementsFromSourceBytes(bytes, spec);
  if (normalized.normalizedStreamCompositeSha256 !== R7_D1_PINNED_NORMALIZED_COMPOSITE_SHA256) {
    return { ok: false, holdReasonCode: 'HOLD_SOURCE_DIGEST_MISMATCH' };
  }
  return { ok: true };
}

export function loadPinnedD1MigrationBytes(repoRoot: string): Buffer {
  const spec = FROZEN_DELTA_SOURCE_SPECS.find((s) => s.stepId === 'D1');
  if (!spec || spec.relativePath !== R7_D1_PINNED_RELATIVE_MIGRATION_PATH) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  const bytes = readFileSync(join(repoRoot, spec.relativePath));
  const digest = sha256Buffer(bytes);
  if (digest !== spec.sourceSha256 || digest !== R7_D1_PINNED_SOURCE_SHA256) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  return bytes;
}

export function extractD1StaticCatalogExpectation(repoRoot: string): R7D1StaticCatalogExpectation {
  const pinned = verifyD1PinnedSourceAndNormalizedComposite(repoRoot);
  if (!pinned.ok) {
    throw new Error(pinned.holdReasonCode);
  }
  const sql = loadPinnedD1MigrationBytes(repoRoot).toString('utf8');
  const tables = extractIdentifiers(sql, /create table public\.([a-z0-9_]+)/gi);
  const functions = extractIdentifiers(sql, /create or replace function public\.([a-z0-9_]+)/gi);
  const triggers = extractIdentifiers(sql, /create trigger ([a-z0-9_]+)/gi);
  const explicitIndexes = extractIdentifiers(sql, /create (?:unique )?index ([a-z0-9_]+)/gi);
  const rlsEnabledTables = extractIdentifiers(sql, /alter table public\.([a-z0-9_]+) enable row level security/gi);

  const staticVerified: R7D1CatalogEvidenceCategory[] = ['TABLES', 'FUNCTIONS', 'TRIGGERS', 'EXPLICIT_INDEXES', 'RLS_ENABLEMENTS'];
  const runtimeUnverified: R7D1CatalogEvidenceCategory[] = [...R7_D1_FULL_CATALOG_SEMANTIC_COVERAGE_PENDING_CATEGORIES];

  return {
    migrationVersion: R7_D1_PINNED_MIGRATION_VERSION,
    sourceSha256: R7_D1_PINNED_SOURCE_SHA256,
    tables,
    functions,
    triggers,
    explicitIndexes,
    rlsEnabledTables,
    staticVerifiedCategories: staticVerified,
    runtimeUnverifiedCategories: runtimeUnverified,
  };
}

function parseTableColumnExpectationsFromMigrationSql(sql: string): Record<string, R7D1TableColumnExpectation[]> {
  const tableColumnsByTable: Record<string, R7D1TableColumnExpectation[]> = {};
  const tableBlockPattern = /create table public\.([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  for (const match of sql.matchAll(tableBlockPattern)) {
    const tableName = match[1];
    const body = match[2];
    if (!tableName || !body) {
      continue;
    }
    const columns: R7D1TableColumnExpectation[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      if (
        line.length === 0 ||
        line.startsWith('constraint ') ||
        line.startsWith('unique (') ||
        line.startsWith('primary key') ||
        line.startsWith('foreign key') ||
        line.startsWith('check (')
      ) {
        continue;
      }
      const columnMatch = /^([a-z_][a-z0-9_]*)\s+([a-z][a-z0-9_]*(?:\s*\([^)]*\))?)/i.exec(line);
      if (!columnMatch) {
        continue;
      }
      const columnName = columnMatch[1];
      const dataTypeToken = columnMatch[2].toLowerCase();
      const isNullable = !/\bnot\s+null\b/i.test(line);
      columns.push({ columnName, dataTypeToken, isNullable });
    }
    if (columns.length > 0) {
      tableColumnsByTable[tableName] = columns;
    }
  }
  return tableColumnsByTable;
}

export function extractD1SemanticCatalogExpectation(repoRoot: string): R7D1SemanticCatalogExpectation {
  const staticExpectation = extractD1StaticCatalogExpectation(repoRoot);
  const exact = deriveD1ExactPostCatalogContract(repoRoot);
  const tableColumnsByTable: Record<string, R7D1TableColumnExpectation[]> = {};
  for (const [table, cols] of Object.entries(exact.tableColumnsByTable)) {
    tableColumnsByTable[table] = cols.map((col) => ({
      columnName: col.columnName,
      dataTypeToken: col.pgCanonicalType,
      isNullable: col.isNullable,
    }));
  }
  return {
    ...staticExpectation,
    tableColumnsByTable,
    expectedFunctionCount: exact.functions.length,
    expectedTriggerCount: exact.triggers.length,
  };
}

function digestTrustedObservationPayload(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
}

function readStrictStringColumn(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function decodeStringNameRows(
  rows: readonly Record<string, unknown>[],
  key: string,
): { readonly ok: true; readonly names: string[] } | { readonly ok: false } {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = readStrictStringColumn(row, key);
    if (!name || seen.has(name)) {
      return { ok: false };
    }
    seen.add(name);
    names.push(name);
  }
  return { ok: true, names };
}

function compareObservedColumnsToExpectation(
  expectation: R7D1SemanticCatalogExpectation,
  rows: readonly Record<string, unknown>[],
): R7D1CatalogSemanticCategoryStatus {
  const observedByTable: Record<string, R7D1TableColumnExpectation[]> = {};
  for (const row of rows) {
    const tableName = readStrictStringColumn(row, 'table_name');
    const columnName = readStrictStringColumn(row, 'column_name');
    const dataType = readStrictStringColumn(row, 'data_type');
    const nullableRaw = readStrictStringColumn(row, 'is_nullable');
    if (!tableName || !columnName || !dataType || (nullableRaw !== 'YES' && nullableRaw !== 'NO')) {
      return 'fail';
    }
    if (!observedByTable[tableName]) {
      observedByTable[tableName] = [];
    }
    observedByTable[tableName].push({
      columnName,
      dataTypeToken: dataType.toLowerCase(),
      isNullable: nullableRaw === 'YES',
    });
  }
  for (const table of expectation.tables) {
    const expectedCols = expectation.tableColumnsByTable[table];
    const observedCols = observedByTable[table];
    if (!expectedCols || !observedCols) {
      return 'unobserved';
    }
    if (expectedCols.length !== observedCols.length) {
      return 'fail';
    }
    for (let i = 0; i < expectedCols.length; i++) {
      const expected = expectedCols[i];
      const observed = observedCols[i];
      if (
        expected.columnName !== observed.columnName ||
        expected.dataTypeToken !== observed.dataTypeToken ||
        expected.isNullable !== observed.isNullable
      ) {
        return 'fail';
      }
    }
  }
  return 'pass';
}

export function buildTrustedCollectedCatalogObservationFromQueryResults(
  repoRoot: string,
  resultsByKey: Readonly<Partial<Record<R7D1CatalogObservationQueryKey, readonly Record<string, unknown>[]>>>,
  input: {
    readonly trustedQueryExecutionContext: R7D1TrustedCatalogQueryExecutionContext;
    readonly phase: R7D1ExactCatalogObservationPhase;
    readonly boundPreCatalogProofDigestSha256?: string | null;
  },
): { readonly ok: true; readonly trusted: R7D1TrustedCollectedCatalogObservation } | { readonly ok: false } {
  const produced = produceProducerBoundD1CatalogEvidenceFromQueryResults(
    repoRoot,
    resultsByKey as Readonly<Partial<Record<R7D1ExactCatalogQueryKey, readonly Record<string, unknown>[]>>>,
    input.phase,
    {
      trustedQueryExecutionContext: input.trustedQueryExecutionContext,
      boundPreCatalogProofDigestSha256: input.boundPreCatalogProofDigestSha256 ?? null,
    },
  );
  if (!produced.ok) {
    return { ok: false };
  }
  const evidence = produced.evidence;
  const nameObservation: R7D1CatalogObservation = {
    anchorTableCount: evidence.tablesPresent.length,
    tablesPresent: evidence.tablesPresent,
    functionsPresent: evidence.functionsPresent,
    triggersPresent: evidence.triggersPresent,
    explicitIndexesPresent: evidence.explicitIndexesPresent,
    rlsEnabledTablesPresent: evidence.rlsEnabledTablesPresent,
  };
  const trusted: R7D1TrustedCollectedCatalogObservation = Object.freeze({
    provenance: R7_D1_TRUSTED_COLLECTOR_PROVENANCE,
    observationProvenanceTier: input.trustedQueryExecutionContext.observationProvenanceTier,
    observationDigestSha256: evidence.evidenceDigestSha256,
    nameObservation: Object.freeze(nameObservation),
    supabaseMigrationVersion: evidence.migrationVersionTail,
    categoryOutcomes: Object.freeze(
      evidence.categoryOutcomes as Partial<Record<R7D1CatalogEvidenceCategory, R7D1CatalogSemanticCategoryStatus>>,
    ),
  });
  trustedCollectedCatalogObservationRegistry.add(trusted);
  trustedCollectedToProducerEvidence.set(trusted, evidence);
  return { ok: true, trusted };
}

export function isTrustedCollectedCatalogObservationProducedInternally(
  trusted: R7D1TrustedCollectedCatalogObservation,
): boolean {
  return trustedCollectedCatalogObservationRegistry.has(trusted);
}

export function evaluateTrustedCollectedCatalogObservationEvidence(
  repoRoot: string,
  trusted: R7D1TrustedCollectedCatalogObservation,
): ReturnType<typeof evaluateProducerBoundD1CatalogEvidence> {
  const producer = trustedCollectedToProducerEvidence.get(trusted);
  if (!producer) {
    return { ok: false, pendingCategories: [] };
  }
  return evaluateProducerBoundD1CatalogEvidence(repoRoot, producer);
}

function sortedSetEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function allTablesAreD1Compliance(tables: readonly string[]): boolean {
  return tables.every((t) => t.startsWith(D1_TABLE_PREFIX));
}

const CATALOG_OBSERVATION_WIRE_KEYS = [
  'anchor_table_count',
  'tables_present',
  'functions_present',
  'triggers_present',
  'explicit_indexes_present',
  'rls_enabled_tables_present',
] as const;

function readStrictStringArray(
  payload: Record<string, unknown>,
  key: string,
): { readonly ok: true; readonly values: string[] } | { readonly ok: false } {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) {
    return { ok: false };
  }
  const value = payload[key];
  if (!Array.isArray(value)) {
    return { ok: false };
  }
  const values: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length === 0) {
      return { ok: false };
    }
    if (seen.has(entry)) {
      return { ok: false };
    }
    seen.add(entry);
    values.push(entry);
  }
  return { ok: true, values };
}

function readStrictAnchorCount(payload: Record<string, unknown>): { readonly ok: true; readonly value: number } | { readonly ok: false } {
  if (!Object.prototype.hasOwnProperty.call(payload, 'anchor_table_count')) {
    return { ok: false };
  }
  const raw = payload.anchor_table_count;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
    return { ok: false };
  }
  return { ok: true, value: raw };
}

export function parseStrictD1CatalogObservationWirePayload(
  payload: unknown,
): { readonly ok: true; readonly observation: R7D1CatalogObservation } | { readonly ok: false } {
  if (payload === null || typeof payload !== 'object') {
    return { ok: false };
  }
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== CATALOG_OBSERVATION_WIRE_KEYS.length) {
    return { ok: false };
  }
  for (const key of CATALOG_OBSERVATION_WIRE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      return { ok: false };
    }
  }
  const anchor = readStrictAnchorCount(record);
  if (!anchor.ok) {
    return { ok: false };
  }
  const tables = readStrictStringArray(record, 'tables_present');
  const functions = readStrictStringArray(record, 'functions_present');
  const triggers = readStrictStringArray(record, 'triggers_present');
  const indexes = readStrictStringArray(record, 'explicit_indexes_present');
  const rls = readStrictStringArray(record, 'rls_enabled_tables_present');
  if (!tables.ok || !functions.ok || !triggers.ok || !indexes.ok || !rls.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    observation: {
      anchorTableCount: anchor.value,
      tablesPresent: tables.values,
      functionsPresent: functions.values,
      triggersPresent: triggers.values,
      explicitIndexesPresent: indexes.values,
      rlsEnabledTablesPresent: rls.values,
    },
  };
}

/** Identifier inventory from migration SQL is static analysis only — never live catalog VERIFIED. */
export function assessD1NameInventoryOnlyObservation(
  expectation: R7D1StaticCatalogExpectation,
): { readonly ok: false; readonly holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED'; readonly pendingCategories: readonly R7D1CatalogEvidenceCategory[] } {
  if (expectation.tables.length === 0) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      pendingCategories: R7_D1_FULL_CATALOG_SEMANTIC_COVERAGE_PENDING_CATEGORIES,
    };
  }
  return {
    ok: false,
    holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
    pendingCategories: expectation.runtimeUnverifiedCategories,
  };
}

function verifyD1NameInventoryParity(
  expectation: R7D1StaticCatalogExpectation,
  observation: R7D1CatalogObservation,
): { readonly ok: true } | { readonly ok: false; readonly driftClass: 'PARTIAL' | 'EXTRA' | 'MISSING' } {
  if (observation.anchorTableCount !== expectation.tables.length) {
    return { ok: false, driftClass: 'PARTIAL' };
  }
  if (!sortedSetEqual([...observation.tablesPresent].sort(), [...expectation.tables].sort())) {
    return { ok: false, driftClass: 'MISSING' };
  }
  if (!sortedSetEqual([...observation.functionsPresent].sort(), [...expectation.functions].sort())) {
    return { ok: false, driftClass: 'MISSING' };
  }
  if (!sortedSetEqual([...observation.triggersPresent].sort(), [...expectation.triggers].sort())) {
    return { ok: false, driftClass: 'MISSING' };
  }
  if (!sortedSetEqual([...observation.explicitIndexesPresent].sort(), [...expectation.explicitIndexes].sort())) {
    return { ok: false, driftClass: 'MISSING' };
  }
  if (!sortedSetEqual([...observation.rlsEnabledTablesPresent].sort(), [...expectation.rlsEnabledTables].sort())) {
    return { ok: false, driftClass: 'MISSING' };
  }
  for (const table of observation.tablesPresent) {
    if (!allTablesAreD1Compliance([table])) {
      return { ok: false, driftClass: 'EXTRA' };
    }
  }
  const expectedTableSet = new Set(expectation.tables);
  for (const table of observation.tablesPresent) {
    if (!expectedTableSet.has(table)) {
      return { ok: false, driftClass: 'EXTRA' };
    }
  }
  return { ok: true };
}

function evaluateStaticNameInventoryCategory(
  category: R7D1CatalogEvidenceCategory,
  expectation: R7D1StaticCatalogExpectation,
  observation: R7D1CatalogObservation,
): R7D1CatalogSemanticCategoryStatus {
  switch (category) {
    case 'TABLES':
      return sortedSetEqual([...observation.tablesPresent].sort(), [...expectation.tables].sort()) ? 'pass' : 'fail';
    case 'FUNCTIONS':
      return sortedSetEqual([...observation.functionsPresent].sort(), [...expectation.functions].sort())
        ? 'pass'
        : 'fail';
    case 'TRIGGERS':
      return sortedSetEqual([...observation.triggersPresent].sort(), [...expectation.triggers].sort())
        ? 'pass'
        : 'fail';
    case 'EXPLICIT_INDEXES':
      return sortedSetEqual([...observation.explicitIndexesPresent].sort(), [...expectation.explicitIndexes].sort())
        ? 'pass'
        : 'fail';
    case 'RLS_ENABLEMENTS':
      return sortedSetEqual([...observation.rlsEnabledTablesPresent].sort(), [...expectation.rlsEnabledTables].sort())
        ? 'pass'
        : 'fail';
    case 'POST_UNEXPECTED_EXTRA':
      for (const table of observation.tablesPresent) {
        if (!expectation.tables.includes(table)) {
          return 'fail';
        }
      }
      return 'pass';
    case 'PRE_STATE_ABSENCE':
      return 'unobserved';
    default:
      return 'unobserved';
  }
}

/** EXR-02: forgeable caller maps are never trusted verification input. */
export function verifyD1FullCatalogSemanticParity(
  expectation: R7D1StaticCatalogExpectation,
  observation: R7D1CatalogObservation,
  untrustedSemantic: R7D1CatalogSemanticObservation,
): R7D1TrustedCatalogVerificationResult {
  void expectation;
  void observation;
  void untrustedSemantic;
  return {
    ok: false,
    holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
    driftClass: 'SHAPE',
    pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
  };
}

export function verifyD1TrustedCollectedCatalogParity(
  repoRoot: string,
  trusted: R7D1TrustedCollectedCatalogObservation,
): R7D1TrustedCatalogVerificationResult {
  if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  if (trusted.provenance !== R7_D1_TRUSTED_COLLECTOR_PROVENANCE) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  if (!observationProvenanceTierAllowsVerifiedCatalogAttestation(trusted.observationProvenanceTier)) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  if (!trustedCollectedCatalogObservationRegistry.has(trusted)) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  const producerEvidence = trustedCollectedToProducerEvidence.get(trusted);
  if (!producerEvidence) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  const expectation = extractD1SemanticCatalogExpectation(repoRoot);
  const nameParity = verifyD1NameInventoryParity(expectation, trusted.nameObservation);
  if (!nameParity.ok) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: nameParity.driftClass,
    };
  }
  const evaluated = evaluateProducerBoundD1CatalogEvidence(repoRoot, producerEvidence);
  if (!evaluated.ok) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: evaluated.pendingCategories.some((c) => producerEvidence.categoryOutcomes[c] === 'fail')
        ? 'PARTIAL'
        : 'SHAPE',
      pendingCategories: evaluated.pendingCategories,
    };
  }
  return {
    ok: true,
    catalogState: 'VERIFIED',
    staticDrift: false,
    runtimeUnverifiedCategories: [],
  };
}

export function verifyD1PostCommitCatalogObservation(
  repoRoot: string,
  observation: R7D1CatalogObservation,
  trusted: R7D1TrustedCollectedCatalogObservation | null = null,
): R7D1TrustedCatalogVerificationResult {
  if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
      pendingCategories: R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
    };
  }
  const expectation = extractD1StaticCatalogExpectation(repoRoot);
  if (!trusted) {
    const nameOnly = assessD1NameInventoryOnlyObservation(expectation);
    void observation;
    return {
      ok: false,
      holdReasonCode: nameOnly.holdReasonCode,
      driftClass: 'SHAPE',
      pendingCategories: nameOnly.pendingCategories,
    };
  }
  void observation;
  return verifyD1TrustedCollectedCatalogParity(repoRoot, trusted);
}

export async function collectD1CatalogObservationFromReadonlySession(
  session: R7D1CatalogObservationQuerySession,
  repoRoot: string,
  phase: R7D1ExactCatalogObservationPhase = 'POST_READONLY',
  boundPreCatalogProofDigestSha256: string | null = null,
): Promise<
  | { readonly ok: true; readonly trusted: R7D1TrustedCollectedCatalogObservation }
  | { readonly ok: false; readonly holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' }
> {
  const disposableScope = isR7D1LocalDisposableCatalogProofScopeActive();
  if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE && !disposableScope) {
    return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
  }
  const sessionIdentity = session as object;
  try {
    let observationProvenanceTier: R7D1CatalogObservationProvenanceTier;
    if (disposableScope) {
      observationProvenanceTier = 'local_code_only_mock';
    } else if (R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION) {
      observationProvenanceTier = 'readonly_pg_verified';
    } else {
      return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
    }
    const trustedQueryExecutionContext = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      sessionIdentity,
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      observationProvenanceTier,
    );
    if (!trustedQueryExecutionContext) {
      return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
    }
    const resultsByKey: Partial<Record<R7D1CatalogObservationQueryKey, readonly Record<string, unknown>[]>> = {};
    try {
      for (const entry of R7_D1_PG_CATALOG_OBSERVATION_QUERIES) {
        const result = await session.query(entry.sql);
        resultsByKey[entry.key] = result.rows;
      }
    } catch {
      return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
    }
    const built = buildTrustedCollectedCatalogObservationFromQueryResults(repoRoot, resultsByKey, {
      trustedQueryExecutionContext,
      phase,
      boundPreCatalogProofDigestSha256,
    });
    if (!built.ok) {
      return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
    }
    return { ok: true, trusted: built.trusted };
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
  }
}

export function verifyD1PriorCatalogObservation(
  expectation: R7D1StaticCatalogExpectation,
  observation: R7D1CatalogObservation,
): { readonly ok: true; readonly priorCatalogConsistent: true } | { readonly ok: false; readonly holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' } {
  if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  if (observation.anchorTableCount !== 0) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  if (observation.tablesPresent.length !== 0) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  if (
    observation.functionsPresent.length !== 0 ||
    observation.triggersPresent.length !== 0 ||
    observation.explicitIndexesPresent.length !== 0 ||
    observation.rlsEnabledTablesPresent.length !== 0
  ) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  if (expectation.tables.length === 0) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  return { ok: true, priorCatalogConsistent: true };
}

export function assertStepIsD1(stepId: R7DeltaStepId): void {
  if (stepId !== 'D1') {
    throw new Error('HOLD_STEP_NOT_FOUND');
  }
}

export function mapTrustedD1ResultToBridgeCatalogState(
  result: R7D1TrustedCatalogVerificationResult,
): 'VERIFIED' | 'PENDING_FRESH_READONLY_CATALOG' | null {
  if (!result.ok) {
    return null;
  }
  return result.catalogState;
}
