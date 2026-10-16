import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  deriveNormalizedStatementsFromSourceBytes,
  FROZEN_DELTA_SOURCE_SPECS,
  type R7DeltaStepId,
} from './r7D1D5OfflinePlan.ts';

export const R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE = true as const;

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

export type R7D1TrustedCatalogVerificationResult =
  | {
      readonly ok: true;
      readonly catalogState: 'PENDING_FRESH_READONLY_CATALOG';
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
    };

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

export function verifyD1PostCommitCatalogObservation(
  expectation: R7D1StaticCatalogExpectation,
  observation: R7D1CatalogObservation,
): R7D1TrustedCatalogVerificationResult {
  if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'SHAPE',
    };
  }
  const nameOnly = assessD1NameInventoryOnlyObservation(expectation);
  if (!nameOnly.ok) {
    return {
      ok: false,
      holdReasonCode: nameOnly.holdReasonCode,
      driftClass: 'SHAPE',
    };
  }
  if (observation.anchorTableCount !== expectation.tables.length) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'PARTIAL',
    };
  }
  if (!sortedSetEqual([...observation.tablesPresent].sort(), [...expectation.tables].sort())) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'MISSING',
    };
  }
  if (!sortedSetEqual([...observation.functionsPresent].sort(), [...expectation.functions].sort())) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'MISSING',
    };
  }
  if (!sortedSetEqual([...observation.triggersPresent].sort(), [...expectation.triggers].sort())) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'MISSING',
    };
  }
  if (!sortedSetEqual([...observation.explicitIndexesPresent].sort(), [...expectation.explicitIndexes].sort())) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'MISSING',
    };
  }
  if (!sortedSetEqual([...observation.rlsEnabledTablesPresent].sort(), [...expectation.rlsEnabledTables].sort())) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      driftClass: 'MISSING',
    };
  }
  for (const table of observation.tablesPresent) {
    if (!allTablesAreD1Compliance([table])) {
      return {
        ok: false,
        holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
        driftClass: 'EXTRA',
      };
    }
  }
  return {
    ok: false,
    holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
    driftClass: 'SHAPE',
  };
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

/** Never returns public VERIFIED — runtime semantics remain unverified without a live PG fixture. */
export function mapTrustedD1ResultToBridgeCatalogState(
  result: R7D1TrustedCatalogVerificationResult,
): 'PENDING_FRESH_READONLY_CATALOG' | null {
  if (!result.ok) {
    return null;
  }
  return 'PENDING_FRESH_READONLY_CATALOG';
}
