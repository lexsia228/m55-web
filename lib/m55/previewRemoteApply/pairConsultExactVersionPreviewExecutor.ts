/**
 * Exact-version Preview executor for Pair included-reply consult (20261030180000).
 * Live execution stays dormant until a controlling terminal confirms the
 * freshly observed revision. A P5 attestation cannot authorize this migration.
 * Simulation and fake-transport results are not runtime apply results.
 * Legacy EXPECTED_BRANCH and Pair P5 receipts are not used.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, createReadStream, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  acquireSecureStdinConnectionConfig,
  validatePinnedTlsCaPem,
  type ParsedConnectionSecrets,
} from './remoteExecutionCredentialAcquirer.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  EXPECTED_CURRENT_USER,
  EXPECTED_DATABASE_NAME,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
} from './remoteConnectionAuthority.ts';
import {
  branchAfterCommitResponseClass,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';
import {
  EXECUTION_PG_TRANSPORT_EVIDENCE_PROFILE,
  assertNoAmbientPgOrTlsFallback,
  resolveExecutionPgTransportEvidenceProfile,
  type ExecutionPgClient,
  type ExecutionPgTransportFactoryDeps,
} from './remoteExecutionPgTransport.ts';
import { TIMEOUT_POLICY } from './timeoutPolicy.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export const PAIR_CONSULT_WORKTREE =
  '/Users/lexsia/Documents/M55_WORKTREE-pair-p5-owned-state-identity-v1' as const;

export const PAIR_CONSULT_EXACT_VERSION = {
  version: '20261030180000',
  name: 'm55_pair_included_reply_consult_v1',
  relativePath: 'supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql',
  gitBlobSha1: '07a72e7517b2a00c3f341562d8a07f92ce3f685c',
  projectRef: APPROVED_PREVIEW_PROJECT_REF,
  projectName: 'm55-soul-preview',
  branch: 'feat/m55-pair-p5-owned-state-identity-v1',
  head: '45063eb7ff876009a37a51913b053757411e49d9',
} as const;

export const PAIR_CONSULT_LIVE_EXECUTION_READY = false as const;

const P5_ATTESTATION_SCHEMA = 'M55_PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_v1';
const BACKFILL_NAME = 'm55_backfill_compatibility_included_reply_threads_v1';

const FULFILL_NEEDLES = [
  'public.m55_ensure_compatibility_included_reply_thread_v1(v_report_id, v_owner)',
  "RAISE EXCEPTION 'm55_pair_included_reply_grant_failed'",
] as const;

const TABLE_NAMES = [
  'compatibility_consult_threads',
  'compatibility_consult_messages',
  'compatibility_consult_send_commits',
] as const;

const FUNCTION_NAMES = [
  'm55_ensure_compatibility_included_reply_thread_v1',
  'm55_backfill_compatibility_included_reply_threads_v1',
  'm55_compatibility_consult_send_release_v1',
  'm55_compatibility_consult_send_reserve_v1',
  'm55_compatibility_consult_reply_commit',
] as const;

export const PAIR_CONSULT_CATALOG_CONTRACT = {
  tables: [
    { schema: 'public', name: 'compatibility_consult_threads', relkind: 'r', rls: true, forceRls: true },
    { schema: 'public', name: 'compatibility_consult_messages', relkind: 'r', rls: true, forceRls: true },
    { schema: 'public', name: 'compatibility_consult_send_commits', relkind: 'r', rls: true, forceRls: true },
  ],
  tablePrivileges: [
    { table: 'compatibility_consult_threads', role: 'service_role', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    { table: 'compatibility_consult_messages', role: 'service_role', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    { table: 'compatibility_consult_send_commits', role: 'service_role', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
  ],
  deniedTableRoles: ['PUBLIC', 'anon', 'authenticated'] as const,
  functions: [
    { name: 'm55_ensure_compatibility_included_reply_thread_v1', identityArgs: 'uuid, text', securityDefiner: true, searchPath: 'public, pg_temp' },
    { name: 'm55_backfill_compatibility_included_reply_threads_v1', identityArgs: '', securityDefiner: true, searchPath: 'public, pg_temp' },
    { name: 'm55_compatibility_consult_send_release_v1', identityArgs: 'text, uuid, text, uuid', securityDefiner: true, searchPath: 'public, pg_temp' },
    { name: 'm55_compatibility_consult_send_reserve_v1', identityArgs: 'text, uuid, uuid, text, text', securityDefiner: true, searchPath: 'public, pg_temp' },
    { name: 'm55_compatibility_consult_reply_commit', identityArgs: 'text, uuid, uuid, text, text, text, uuid, timestamptz', securityDefiner: true, searchPath: 'public, pg_temp' },
  ],
  executeRole: 'service_role' as const,
  deniedExecuteRoles: ['PUBLIC', 'anon', 'authenticated'] as const,
  foreignKeys: [
    { table: 'compatibility_consult_threads', columns: ['owned_report_id', 'owner_user_id'], refTable: 'compatibility_owned_reports', refColumns: ['id', 'owner_user_id'], onDelete: 'CASCADE' },
    { table: 'compatibility_consult_messages', columns: ['thread_id'], refTable: 'compatibility_consult_threads', refColumns: ['id'], onDelete: 'CASCADE' },
    { table: 'compatibility_consult_send_commits', columns: ['thread_id'], refTable: 'compatibility_consult_threads', refColumns: ['id'], onDelete: 'RESTRICT' },
    { table: 'compatibility_consult_send_commits', columns: ['user_message_id'], refTable: 'compatibility_consult_messages', refColumns: ['id'], onDelete: 'SET NULL' },
    { table: 'compatibility_consult_send_commits', columns: ['assistant_message_id'], refTable: 'compatibility_consult_messages', refColumns: ['id'], onDelete: 'SET NULL' },
  ],
  uniques: [
    { name: 'compatibility_consult_threads_owner_report_uidx', table: 'compatibility_consult_threads', columns: ['owner_user_id', 'owned_report_id'] },
    { name: 'compatibility_consult_send_commits_idempotency_uidx', table: 'compatibility_consult_send_commits', columns: ['user_id', 'owned_report_id', 'idempotency_key'] },
  ],
  indexes: [
    { name: 'compatibility_consult_threads_report_idx', table: 'compatibility_consult_threads', columns: ['owned_report_id'], predicate: null },
    { name: 'compatibility_consult_messages_thread_created_idx', table: 'compatibility_consult_messages', columns: ['thread_id', 'created_at'], predicate: null },
    { name: 'compatibility_consult_send_commits_user_report_created_idx', table: 'compatibility_consult_send_commits', columns: ['user_id', 'owned_report_id', 'created_at'], predicate: null },
    { name: 'compatibility_consult_send_commits_report_pending_idx', table: 'compatibility_consult_send_commits', columns: ['user_id', 'owned_report_id'], predicate: "status = 'pending'" },
  ],
  fulfill: {
    name: 'm55_fulfill_compatibility_report_v1',
    identityArgs: 'uuid, text, text',
    securityDefiner: true,
    searchPath: 'public, pg_temp',
    needles: FULFILL_NEEDLES,
  },
} as const;

export const CONSULT_HISTORY_COLUMNS_SQL =
  "SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations' ORDER BY column_name" as const;
export const CONSULT_HISTORY_PRIVILEGE_SQL =
  "SELECT has_table_privilege(current_user, 'supabase_migrations.schema_migrations', 'SELECT') AS can_select, has_table_privilege(current_user, 'supabase_migrations.schema_migrations', 'INSERT') AS can_insert" as const;
export const CONSULT_VERSION_COUNT_SQL =
  'SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations WHERE version::text = $1' as const;
export const CONSULT_HISTORY_ROWS_SQL =
  'SELECT version::text AS version, name::text AS name, statements FROM supabase_migrations.schema_migrations ORDER BY version::text, name::text' as const;
export const CONSULT_PREEXISTING_RELATIONS_SQL =
  "SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY ($1::text[]) ORDER BY c.relname" as const;
export const CONSULT_TABLE_SQL =
  "SELECT n.nspname AS schema_name, c.relname AS name, c.relkind AS relkind, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY ($1::text[]) ORDER BY c.relname" as const;
export const CONSULT_TABLE_GRANT_SQL =
  "SELECT c.relname AS table_name, COALESCE(r.rolname, 'PUBLIC') AS grantee, a.privilege_type AS privilege FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace LEFT JOIN LATERAL aclexplode(c.relacl) AS a ON true LEFT JOIN pg_roles r ON r.oid = a.grantee WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY ($1::text[]) AND a.privilege_type IS NOT NULL ORDER BY c.relname, grantee, a.privilege_type" as const;
export const CONSULT_FUNCTION_SQL =
  "SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS identity_args, p.prosecdef AS security_definer, (SELECT option FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS option WHERE option LIKE 'search_path=%' LIMIT 1) AS search_path FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = ANY ($1::text[]) ORDER BY p.proname, identity_args" as const;
export const CONSULT_FUNCTION_GRANT_SQL =
  "SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS identity_args, COALESCE(r.rolname, 'PUBLIC') AS grantee, a.privilege_type AS privilege FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace LEFT JOIN LATERAL aclexplode(p.proacl) AS a ON true LEFT JOIN pg_roles r ON r.oid = a.grantee WHERE n.nspname = 'public' AND p.proname = ANY ($1::text[]) AND a.privilege_type IS NOT NULL ORDER BY p.proname, identity_args, grantee, a.privilege_type" as const;
export const CONSULT_FOREIGN_KEY_SQL =
  "SELECT src.relname AS table_name, ARRAY(SELECT att.attname FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum ORDER BY k.ord) AS columns, tgt.relname AS ref_table, ARRAY(SELECT att.attname FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = k.attnum ORDER BY k.ord) AS ref_columns, con.confdeltype AS on_delete FROM pg_constraint con JOIN pg_class src ON src.oid = con.conrelid JOIN pg_namespace n ON n.oid = src.relnamespace JOIN pg_class tgt ON tgt.oid = con.confrelid WHERE con.contype = 'f' AND n.nspname = 'public' AND src.relname = ANY ($1::text[]) ORDER BY src.relname, con.conname" as const;
export const CONSULT_UNIQUE_SQL =
  "SELECT con.conname AS name, src.relname AS table_name, ARRAY(SELECT att.attname FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum ORDER BY k.ord) AS columns FROM pg_constraint con JOIN pg_class src ON src.oid = con.conrelid JOIN pg_namespace n ON n.oid = src.relnamespace WHERE con.contype = 'u' AND n.nspname = 'public' AND src.relname = ANY ($1::text[]) ORDER BY con.conname" as const;
export const CONSULT_INDEX_SQL =
  "SELECT ic.relname AS name, tc.relname AS table_name, ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum WHERE k.attnum > 0 ORDER BY k.ord) AS columns, pg_get_expr(i.indpred, i.indrelid) AS predicate FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid JOIN pg_class tc ON tc.oid = i.indrelid JOIN pg_namespace n ON n.oid = tc.relnamespace WHERE n.nspname = 'public' AND ic.relname = ANY ($1::text[]) ORDER BY ic.relname" as const;
export const CONSULT_ADVISORY_LOCK_SQL = 'SELECT pg_advisory_xact_lock(hashtext($1))' as const;
export const CONSULT_SET_LOCAL_SQL = 'SELECT set_config($1, $2, true)' as const;
export const CONSULT_FULFILL_SQL =
  "SELECT pg_get_function_identity_arguments(p.oid) AS identity_args, p.prosecdef AS security_definer, (SELECT option FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS option WHERE option LIKE 'search_path=%' LIMIT 1) AS search_path, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'm55_fulfill_compatibility_report_v1'" as const;

export const CONSULT_CATALOG_SQL = [
  CONSULT_TABLE_SQL,
  CONSULT_TABLE_GRANT_SQL,
  CONSULT_FUNCTION_SQL,
  CONSULT_FUNCTION_GRANT_SQL,
  CONSULT_FOREIGN_KEY_SQL,
  CONSULT_UNIQUE_SQL,
  CONSULT_INDEX_SQL,
  CONSULT_FULFILL_SQL,
  CONSULT_HISTORY_ROWS_SQL,
] as const;

const PROBE_SQL = new Set<string>([
  POST_CONNECT_GUARD_SQL,
  CONSULT_HISTORY_COLUMNS_SQL,
  CONSULT_HISTORY_PRIVILEGE_SQL,
  CONSULT_VERSION_COUNT_SQL,
  CONSULT_HISTORY_ROWS_SQL,
  CONSULT_PREEXISTING_RELATIONS_SQL,
  ...CONSULT_CATALOG_SQL,
  HISTORY_INSERT_SQL_METADATA,
]);

export type PairConsultExactVersionDisposition =
  | 'AUTHORIZATION_BLOCKED'
  | 'IDENTITY_REJECTED'
  | 'TARGET_BINDING_STOP'
  | 'PRE_BEGIN_STOP'
  | 'ROLLED_BACK'
  | 'ROLLBACK_UNCERTAIN'
  | 'COMMIT_ACK_UNCERTAIN'
  | 'COMMIT_REJECTED'
  | 'LOCAL_SIMULATION_CATALOG_HOLD'
  | 'LOCAL_SIMULATION_CLEANUP_HOLD'
  | 'LOCAL_SIMULATION_CONTRACT_PASS'
  | 'COMMITTED_BUT_VERIFICATION_HOLD'
  | 'COMMITTED_BUT_CLEANUP_HOLD'
  | 'LOCAL_TRANSPORT_CONTRACT_PASS'
  | 'REAL_COMMIT_CATALOG_VERIFIED';

export type ConsultTransportEvidenceKind =
  | 'NONE'
  | 'TEST_INJECTED'
  | 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1'
  | 'UNKNOWN';

export type ConsultExecutionTruth = {
  readonly transportEvidence: ConsultTransportEvidenceKind;
  readonly runtimeApplied: boolean;
  readonly transactionCommitted: boolean;
  readonly catalogRuntimeVerified: boolean;
  readonly realDisposition: 'REAL_COMMIT_CATALOG_VERIFIED' | 'COMMITTED_BUT_VERIFICATION_HOLD' | null;
};

export type PairConsultHistoryInsertProof = {
  readonly version: string;
  readonly name: string;
  readonly statementCount: number;
};

export type PairConsultExactVersionResult = {
  readonly disposition: PairConsultExactVersionDisposition;
  readonly reason: string;
  readonly commitAttempts: number;
  readonly retryForbidden: true;
  readonly selectedVersion: typeof PAIR_CONSULT_EXACT_VERSION.version | null;
  readonly querySequence: readonly string[];
  readonly catalogGreen: false;
  readonly catalogContractMatched: boolean;
  readonly catalogRuntimeVerified: boolean;
  readonly localContractPass: boolean;
  readonly runtimeApplied: boolean;
  readonly transactionCommitted: boolean;
  readonly transportEvidence: ConsultTransportEvidenceKind;
  readonly liveExecutionReady: false;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly historyInsert: PairConsultHistoryInsertProof | null;
  readonly evidence: {
    readonly intendedBranch: string | null;
    readonly intendedHead: string | null;
    readonly transportBound: boolean;
    readonly postConnectSeen: boolean;
    readonly postConnectDistinguishesPreview: false;
    readonly catalogSql: 'POSTGRES_CATALOG' | 'NONE';
  };
};

export type PairConsultExactVersionIdentity =
  | {
      readonly ok: true;
      readonly statements: readonly string[];
      readonly gitBlobSha1: string;
      readonly ignoredVersions: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

export type ConsultTransportConfig = {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly sslmode: string;
  readonly tlsTrustProfile: string;
  readonly tlsServerName: string;
  readonly tlsCaPem: string;
  readonly claimedProjectRef: string;
  readonly claimedBranch: string;
  readonly claimedHead: string;
  readonly claimedWorktree: string;
};

export type ConsultCatalogDefect =
  | 'none'
  | 'fk'
  | 'unique'
  | 'index'
  | 'function'
  | 'privilege'
  | 'query_fail'
  | 'history';

export type ConsultSimulationScenario = {
  readonly claimedProjectRef?: string;
  readonly claimedBranch?: string;
  readonly claimedHead?: string;
  readonly claimedWorktree?: string;
  readonly host?: string;
  readonly connectionUser?: string;
  readonly tlsCaPem?: string;
  readonly tlsTrustProfile?: string;
  readonly currentDatabase?: string;
  readonly currentUser?: string;
  readonly failConnect?: boolean;
  readonly versionAlreadyPresent?: boolean;
  readonly versionAppearsAfterBegin?: boolean;
  readonly objectsAlreadyPresent?: boolean;
  readonly historyPrivilegeDenied?: boolean;
  readonly failBegin?: boolean;
  readonly failOnStatement?: boolean;
  readonly rollbackAcknowledged?: boolean;
  readonly commit?: 'ACK' | 'REJECT' | 'THROW';
  readonly postCommitFailConnect?: boolean;
  readonly postCommitCloseFails?: boolean;
  readonly catalogDefect?: ConsultCatalogDefect;
  readonly baselineVersions?: readonly string[];
};

type HistoryRow = {
  readonly version: string;
  readonly name: string | null;
  readonly statements: readonly string[] | null;
};

export function gitBlobSha1(bytes: Buffer): string {
  return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

export function loadFrozenConsultMigrationBytes(repoRoot: string): Buffer {
  return readFileSync(join(repoRoot, PAIR_CONSULT_EXACT_VERSION.relativePath));
}

export function observeConsultGitIdentity(repoRoot: string):
  | { readonly ok: true; readonly branch: string; readonly head: string; readonly worktree: string }
  | { readonly ok: false; readonly reason: string } {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const worktree = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    if (branch !== PAIR_CONSULT_EXACT_VERSION.branch) return { ok: false, reason: 'BRANCH_MISMATCH' };
    if (!/^[0-9a-f]{40}$/.test(head)) return { ok: false, reason: 'GIT_IDENTITY_UNREADABLE' };
    if (worktree !== PAIR_CONSULT_WORKTREE) return { ok: false, reason: 'WORKTREE_MISMATCH' };
    return { ok: true, branch, head, worktree };
  } catch {
    return { ok: false, reason: 'GIT_IDENTITY_UNREADABLE' };
  }
}

export function evaluatePairConsultExactVersionIdentity(input: {
  readonly projectRef: string;
  readonly sqlBytes: Buffer;
  readonly localOnlyVersions: readonly string[];
}): PairConsultExactVersionIdentity {
  if (input.projectRef !== PAIR_CONSULT_EXACT_VERSION.projectRef) {
    return { ok: false, reason: 'PROJECT_REF_MISMATCH' };
  }
  const blob = gitBlobSha1(input.sqlBytes);
  if (blob !== PAIR_CONSULT_EXACT_VERSION.gitBlobSha1) {
    return { ok: false, reason: 'GIT_BLOB_MISMATCH' };
  }
  const statements = splitAndTrim(input.sqlBytes.toString('utf8'));
  if (statements.length < 1) return { ok: false, reason: 'NO_STATEMENTS' };
  if (statements.some(isBackfillInvocation)) {
    return { ok: false, reason: 'BACKFILL_INVOCATION_FORBIDDEN' };
  }
  const ignoredVersions = input.localOnlyVersions.filter((version) => version !== PAIR_CONSULT_EXACT_VERSION.version);
  if (ignoredVersions.some((version) => statements.join('\n').includes(version))) {
    return { ok: false, reason: 'UNRELATED_VERSION_IN_SQL' };
  }
  return { ok: true, statements, gitBlobSha1: blob, ignoredVersions };
}

export function evaluateConsultTransportBinding(config: ConsultTransportConfig):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  if (config.claimedBranch !== PAIR_CONSULT_EXACT_VERSION.branch) {
    return { ok: false, reason: 'BRANCH_MISMATCH' };
  }
  if (config.claimedHead !== PAIR_CONSULT_EXACT_VERSION.head) {
    return { ok: false, reason: 'HEAD_MISMATCH' };
  }
  if (config.claimedWorktree !== PAIR_CONSULT_WORKTREE) {
    return { ok: false, reason: 'WORKTREE_MISMATCH' };
  }
  if (config.claimedProjectRef !== APPROVED_PREVIEW_PROJECT_REF) {
    return { ok: false, reason: 'CLAIMED_PROJECT_REF_MISMATCH' };
  }
  const boundUser = expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF);
  if (config.user !== boundUser) {
    return { ok: false, reason: 'CONNECTION_USER_NOT_PROJECT_BOUND' };
  }
  const host = calculateCanonicalHostFingerprint(config.host);
  if (!host.ok || host.normalizedHost !== SESSION_POOLER_HOST) {
    return { ok: false, reason: 'POOLER_HOST_MISMATCH' };
  }
  if (host.fingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return { ok: false, reason: 'POOLER_FINGERPRINT_MISMATCH' };
  }
  if (config.port !== EXPECTED_PORT || config.sslmode !== EXPECTED_SSLMODE) {
    return { ok: false, reason: 'PORT_OR_SSLMODE_MISMATCH' };
  }
  if (config.database !== EXPECTED_DATABASE_NAME) {
    return { ok: false, reason: 'DATABASE_MISMATCH' };
  }
  if (config.tlsTrustProfile !== TLS_TRUST_PROFILE || config.tlsServerName !== SESSION_POOLER_TLS_SERVER_NAME) {
    return { ok: false, reason: 'TLS_PROFILE_MISMATCH' };
  }
  if (!validatePinnedTlsCaPem(config.tlsCaPem)) {
    return { ok: false, reason: 'TLS_CA_NOT_PINNED' };
  }
  return { ok: true };
}

function isBackfillInvocation(statement: string): boolean {
  if (!new RegExp(`\\b${BACKFILL_NAME}\\s*\\(`, 'i').test(statement)) return false;
  return !/^\s*(create\s+(or\s+replace\s+)?function|grant|revoke|comment)\b/i.test(statement);
}

function classifyPresentedAuthorization(value: unknown): string {
  if (typeof value === 'string') return 'FORGED_AUTHORIZATION_STRING';
  if (typeof value === 'boolean') return 'FORGED_AUTHORIZATION_BOOLEAN';
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const schema = typeof record.schemaId === 'string'
      ? record.schemaId
      : typeof (record.payload as Record<string, unknown> | undefined)?.schemaId === 'string'
        ? String((record.payload as Record<string, unknown>).schemaId)
        : '';
    if (schema === P5_ATTESTATION_SCHEMA || schema.startsWith('M55_PAIR_P5_')) {
      return 'P5_ATTESTATION_NOT_CONSULT_AUTHORIZATION';
    }
    return 'AUTHORIZATION_EVIDENCE_UNVERIFIABLE';
  }
  return 'AUTHORIZATION_ABSENT';
}

function blocked(reason: string): PairConsultExactVersionResult {
  return {
    disposition: 'AUTHORIZATION_BLOCKED',
    reason,
    commitAttempts: 0,
    retryForbidden: true,
    selectedVersion: null,
    querySequence: [],
    catalogGreen: false,
    catalogContractMatched: false,
    catalogRuntimeVerified: false,
    localContractPass: false,
    runtimeApplied: false,
    transactionCommitted: false,
    transportEvidence: 'NONE',
    liveExecutionReady: false,
    commitResponseClass: null,
    historyInsert: null,
    evidence: {
      intendedBranch: null,
      intendedHead: null,
      transportBound: false,
      postConnectSeen: false,
      postConnectDistinguishesPreview: false,
      catalogSql: 'NONE',
    },
  };
}

/**
 * Remote entry. No Human authorization evidence for this migration can be
 * verified inside the allowlist, so this function never connects.
 * A client, a GO string, a boolean, CLI login, and a P5 attestation are not authorization.
 */
export async function executePairConsultExactVersionPreview(input: {
  readonly client: ExecutionPgClient | null;
  readonly liveHumanGo: string | null;
  readonly authorized?: boolean;
  readonly presentedAuthorization?: unknown;
  readonly password?: string;
}): Promise<PairConsultExactVersionResult> {
  void input.client;
  void input.password;
  if (input.authorized === true) return blocked('FORGED_AUTHORIZATION_BOOLEAN');
  if (input.liveHumanGo !== null && input.liveHumanGo !== undefined) {
    return blocked('FORGED_AUTHORIZATION_STRING');
  }
  if (input.presentedAuthorization !== undefined && input.presentedAuthorization !== null) {
    return blocked(classifyPresentedAuthorization(input.presentedAuthorization));
  }
  return blocked('AUTHORIZATION_ABSENT');
}

type SimOptions = {
  readonly failConnect?: boolean;
  readonly failBegin?: boolean;
  readonly failOnStatement?: boolean;
  readonly rollbackAcknowledged?: boolean;
  readonly commit?: 'ACK' | 'REJECT' | 'THROW';
  readonly closeFails?: boolean;
  readonly currentDatabase: string;
  readonly currentUser: string;
  readonly versionAlreadyPresent: boolean;
  readonly versionAppearsAfterBegin: boolean;
  readonly objectsAlreadyPresent: boolean;
  readonly historyPrivilegeDenied: boolean;
  readonly baselineVersions: readonly string[];
  readonly statements: readonly string[];
  readonly catalogDefect: ConsultCatalogDefect;
  readonly role: 'mutation' | 'postcommit';
  readonly failPostGuard?: boolean;
};

class ConsultSimulationClient implements ExecutionPgClient {
  readonly calls: string[] = [];
  readonly queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
  private connected = false;
  private state: 'open' | 'closed' | 'unusable' = 'open';
  private versionChecks = 0;
  private objectChecks = 0;

  constructor(private readonly options: SimOptions) {}

  async connect(): Promise<void> {
    this.calls.push('connect');
    if (this.options.failConnect) throw new Error('connect failed');
    this.connected = true;
  }

  async query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> {
    if (!this.connected) throw new Error('query before connect');
    this.calls.push('query');
    this.queries.push({ sql, values });
    if (this.options.failOnStatement && this.options.role === 'mutation' && !PROBE_SQL.has(sql)) {
      throw new Error('statement failed');
    }
    if (this.options.role === 'postcommit' && this.options.failPostGuard === true && sql === POST_CONNECT_GUARD_SQL) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    if (this.options.role === 'postcommit' && this.options.catalogDefect === 'query_fail' && sql === CONSULT_TABLE_SQL) {
      throw new Error('catalog query failed');
    }
    return answerConsultProbe(sql, this.options, () => {
      this.versionChecks += 1;
      return this.versionChecks;
    }, () => {
      this.objectChecks += 1;
      return this.objectChecks;
    });
  }

  async begin(): Promise<void> {
    if (!this.connected) throw new Error('begin before connect');
    this.calls.push('begin');
    if (this.options.failBegin) throw new Error('begin failed');
  }

  async commit(): Promise<{ responseClass: CommitResponseClass }> {
    this.calls.push('commit');
    if (this.options.commit === 'THROW') throw new Error('commit transport loss');
    if (this.options.commit === 'REJECT') return { responseClass: 'DEFINITIVE_TRANSACTION_REJECTION' };
    return { responseClass: 'DEFINITIVE_COMMIT_ACK' };
  }

  async rollback(): Promise<{ acknowledged: boolean }> {
    this.calls.push('rollback');
    return { acknowledged: this.options.rollbackAcknowledged !== false };
  }

  async close(): Promise<void> {
    this.calls.push('close');
    if (this.options.closeFails) throw new Error('close failed');
    this.connected = false;
    this.state = 'closed';
  }

  getConnectionState(): 'open' | 'closed' | 'unusable' {
    return this.state;
  }

  markUnusable(): void {
    this.state = 'unusable';
    this.connected = false;
  }
}

function answerConsultProbe(
  sql: string,
  options: SimOptions,
  nextVersionCheck: () => number,
  nextObjectCheck: () => number,
): { rows: Record<string, unknown>[]; rowCount: number | null } {
  if (sql === POST_CONNECT_GUARD_SQL) {
    return { rowCount: 1, rows: [{ current_database_name: options.currentDatabase, current_user_name: options.currentUser }] };
  }
  if (sql === CONSULT_HISTORY_COLUMNS_SQL) {
    return {
      rowCount: 3,
      rows: [
        { column_name: 'name', udt_name: 'text' },
        { column_name: 'statements', udt_name: '_text' },
        { column_name: 'version', udt_name: 'text' },
      ],
    };
  }
  if (sql === CONSULT_HISTORY_PRIVILEGE_SQL) {
    const allowed = !options.historyPrivilegeDenied;
    return { rowCount: 1, rows: [{ can_select: allowed, can_insert: allowed }] };
  }
  if (sql === CONSULT_VERSION_COUNT_SQL) {
    const check = nextVersionCheck();
    const present = options.versionAlreadyPresent || (options.versionAppearsAfterBegin && check >= 2);
    return { rowCount: 1, rows: [{ count: present ? '1' : '0' }] };
  }
  if (sql === CONSULT_PREEXISTING_RELATIONS_SQL) {
    const check = nextObjectCheck();
    if (options.objectsAlreadyPresent || check >= 2 && options.objectsAlreadyPresent) {
      return { rowCount: 1, rows: [{ name: TABLE_NAMES[0] }] };
    }
    return { rowCount: 0, rows: [] };
  }
  if (sql === CONSULT_HISTORY_ROWS_SQL) {
    return { rowCount: historyRows(options).length, rows: historyRows(options).map(historyToRow) };
  }
  if (sql === CONSULT_TABLE_SQL) return pack(tableRows(options.catalogDefect));
  if (sql === CONSULT_TABLE_GRANT_SQL) return pack(tableGrantRows(options.catalogDefect));
  if (sql === CONSULT_FUNCTION_SQL) return pack(functionRows(options.catalogDefect));
  if (sql === CONSULT_FUNCTION_GRANT_SQL) return pack(functionGrantRows(options.catalogDefect));
  if (sql === CONSULT_FOREIGN_KEY_SQL) return pack(foreignKeyRows(options.catalogDefect));
  if (sql === CONSULT_UNIQUE_SQL) return pack(uniqueRows(options.catalogDefect));
  if (sql === CONSULT_INDEX_SQL) return pack(indexRows(options.catalogDefect));
  if (sql === CONSULT_FULFILL_SQL) return pack(fulfillRows());
  if (sql === HISTORY_INSERT_SQL_METADATA) return { rowCount: 1, rows: [] };
  return { rowCount: 0, rows: [] };
}

export function answerConsultLocalProbeForTests(
  sql: string,
  scenario: ConsultSimulationScenario & {
    readonly statements: readonly string[];
    readonly role: 'mutation' | 'postcommit';
  },
  counters: { versionChecks: number; objectChecks: number },
): { rows: Record<string, unknown>[]; rowCount: number | null } {
  const options: SimOptions = {
    failConnect: scenario.failConnect,
    failBegin: scenario.failBegin,
    failOnStatement: scenario.failOnStatement,
    rollbackAcknowledged: scenario.rollbackAcknowledged,
    commit: scenario.commit,
    currentDatabase: scenario.currentDatabase ?? EXPECTED_DATABASE_NAME,
    currentUser: scenario.currentUser ?? EXPECTED_CURRENT_USER,
    versionAlreadyPresent: scenario.versionAlreadyPresent === true,
    versionAppearsAfterBegin: scenario.versionAppearsAfterBegin === true,
    objectsAlreadyPresent: scenario.objectsAlreadyPresent === true,
    historyPrivilegeDenied: scenario.historyPrivilegeDenied === true,
    baselineVersions: scenario.baselineVersions ?? ['20260614000000', '20261013110000'],
    statements: scenario.statements,
    catalogDefect: scenario.catalogDefect ?? 'none',
    role: scenario.role,
  };
  return answerConsultProbe(
    sql,
    options,
    () => {
      counters.versionChecks += 1;
      return counters.versionChecks;
    },
    () => {
      counters.objectChecks += 1;
      return counters.objectChecks;
    },
  );
}

function pack(rows: Record<string, unknown>[]): { rows: Record<string, unknown>[]; rowCount: number } {
  return { rows, rowCount: rows.length };
}

function historyRows(options: SimOptions): HistoryRow[] {
  const baseline = options.baselineVersions.map((version) => ({
    version,
    name: `baseline:${version}`,
    statements: null,
  }));
  if (options.role !== 'postcommit') return baseline;
  const target: HistoryRow = options.catalogDefect === 'history'
    ? { version: PAIR_CONSULT_EXACT_VERSION.version, name: 'other', statements: ['SELECT 1'] }
    : {
        version: PAIR_CONSULT_EXACT_VERSION.version,
        name: PAIR_CONSULT_EXACT_VERSION.name,
        statements: options.statements,
      };
  return options.catalogDefect === 'history'
    ? [...baseline, target, { ...target, name: 'copy' }]
    : [...baseline, target];
}

function historyToRow(row: HistoryRow): Record<string, unknown> {
  return { version: row.version, name: row.name, statements: row.statements };
}

function tableRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  return PAIR_CONSULT_CATALOG_CONTRACT.tables.map((table) => ({
    schema_name: table.schema,
    name: table.name,
    relkind: defect === 'function' ? table.relkind : table.relkind,
    rls: table.rls,
    force_rls: table.forceRls,
  }));
}

function tableGrantRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const grant of PAIR_CONSULT_CATALOG_CONTRACT.tablePrivileges) {
    for (const privilege of grant.privileges) {
      rows.push({ table_name: grant.table, grantee: grant.role, privilege });
    }
  }
  if (defect === 'privilege') {
    rows.push({ table_name: TABLE_NAMES[0], grantee: 'PUBLIC', privilege: 'SELECT' });
  }
  return rows;
}

function functionRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  return PAIR_CONSULT_CATALOG_CONTRACT.functions.map((fn, index) => ({
    name: fn.name,
    identity_args: defect === 'function' && index === 0 ? 'text' : fn.identityArgs,
    security_definer: fn.securityDefiner,
    search_path: `search_path=${fn.searchPath}`,
  }));
}

function functionGrantRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  const names = [...FUNCTION_NAMES, PAIR_CONSULT_CATALOG_CONTRACT.fulfill.name];
  const rows = names.map((name) => ({ name, identity_args: identityArgsFor(name), grantee: 'service_role', privilege: 'EXECUTE' }));
  if (defect === 'privilege') {
    rows.push({ name: FUNCTION_NAMES[0], identity_args: identityArgsFor(FUNCTION_NAMES[0]), grantee: 'PUBLIC', privilege: 'EXECUTE' });
  }
  return rows;
}

function identityArgsFor(name: string): string {
  const fn = PAIR_CONSULT_CATALOG_CONTRACT.functions.find((entry) => entry.name === name);
  if (fn) return fn.identityArgs;
  return PAIR_CONSULT_CATALOG_CONTRACT.fulfill.identityArgs;
}

function foreignKeyRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  return PAIR_CONSULT_CATALOG_CONTRACT.foreignKeys.map((fk, index) => ({
    table_name: fk.table,
    columns: [...fk.columns],
    ref_table: fk.refTable,
    ref_columns: [...fk.refColumns],
    on_delete: defect === 'fk' && index === 0 ? 'a' : deleteCode(fk.onDelete),
  }));
}

function uniqueRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  return PAIR_CONSULT_CATALOG_CONTRACT.uniques.map((unique, index) => ({
    name: unique.name,
    table_name: unique.table,
    columns: defect === 'unique' && index === 0 ? ['id'] : [...unique.columns],
  }));
}

function indexRows(defect: ConsultCatalogDefect): Record<string, unknown>[] {
  return PAIR_CONSULT_CATALOG_CONTRACT.indexes.map((index) => ({
    name: index.name,
    table_name: index.table,
    columns: [...index.columns],
    predicate: defect === 'index' && index.predicate !== null ? "status = 'failed'" : index.predicate,
  }));
}

function fulfillRows(): Record<string, unknown>[] {
  const fulfill = PAIR_CONSULT_CATALOG_CONTRACT.fulfill;
  return [{
    identity_args: fulfill.identityArgs,
    security_definer: fulfill.securityDefiner,
    search_path: `search_path=${fulfill.searchPath}`,
    definition: `CREATE FUNCTION public.${fulfill.name}() LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $fn$ BEGIN ${fulfill.needles[0]} ${fulfill.needles[1]} END $fn$`,
  }];
}

function deleteCode(action: string): string {
  if (action === 'CASCADE') return 'c';
  if (action === 'RESTRICT') return 'r';
  if (action === 'SET NULL') return 'n';
  if (action === 'NO ACTION') return 'a';
  if (action === 'SET DEFAULT') return 'd';
  return action;
}

function deleteAction(code: string): string | null {
  const mapped: Record<string, string> = { c: 'CASCADE', r: 'RESTRICT', n: 'SET NULL', a: 'NO ACTION', d: 'SET DEFAULT' };
  if (mapped[code]) return mapped[code];
  if (Object.values(mapped).includes(code)) return code;
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null;
  return value;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalizeSearchPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.replace(/^search_path=/i, '').replace(/\s+/g, ' ').trim();
}

function normalizePredicate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/::[\w\s."]+/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized.length === 0 ? null : normalized;
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function parseHistory(rows: readonly Record<string, unknown>[]): HistoryRow[] | null {
  const parsed: HistoryRow[] = [];
  for (const row of rows) {
    if (typeof row.version !== 'string') return null;
    if (row.name !== null && typeof row.name !== 'string') return null;
    if (row.statements !== null && asStringArray(row.statements) === null) return null;
    parsed.push({
      version: row.version,
      name: typeof row.name === 'string' ? row.name : null,
      statements: asStringArray(row.statements),
    });
  }
  return parsed;
}

export function evaluateConsultHistoryShape(rows: readonly Record<string, unknown>[]):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  const required = new Map<string, string>([
    ['version', 'text'],
    ['statements', '_text'],
    ['name', 'text'],
  ]);
  for (const row of rows) {
    if (typeof row.column_name !== 'string' || typeof row.udt_name !== 'string') {
      return { ok: false, reason: 'HISTORY_SCHEMA_MALFORMED' };
    }
    const expected = required.get(row.column_name);
    if (expected !== undefined && row.udt_name !== expected) {
      return { ok: false, reason: 'HISTORY_SCHEMA_MISMATCH' };
    }
    if (expected !== undefined) required.delete(row.column_name);
  }
  if (required.size > 0) return { ok: false, reason: 'HISTORY_SCHEMA_MISMATCH' };
  return { ok: true };
}

export function evaluateConsultBaselineHistory(rows: readonly HistoryRow[]):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!/^\d{14}$/.test(row.version)) return { ok: false, reason: 'HISTORY_MALFORMED' };
    if (seen.has(row.version)) return { ok: false, reason: 'HISTORY_DUPLICATE' };
    seen.add(row.version);
    if (row.version === PAIR_CONSULT_EXACT_VERSION.version) {
      return { ok: false, reason: 'VERSION_ALREADY_PRESENT' };
    }
  }
  return { ok: true };
}

export function evaluateConsultCatalogRows(input: {
  readonly tables: readonly Record<string, unknown>[];
  readonly tableGrants: readonly Record<string, unknown>[];
  readonly functions: readonly Record<string, unknown>[];
  readonly functionGrants: readonly Record<string, unknown>[];
  readonly foreignKeys: readonly Record<string, unknown>[];
  readonly uniques: readonly Record<string, unknown>[];
  readonly indexes: readonly Record<string, unknown>[];
  readonly fulfill: readonly Record<string, unknown>[];
  readonly beforeHistory: readonly HistoryRow[];
  readonly afterHistory: readonly HistoryRow[];
  readonly statements: readonly string[];
}): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const tables = input.tables.map((row) => ({
    schema: String(row.schema_name ?? ''),
    name: String(row.name ?? ''),
    relkind: String(row.relkind ?? ''),
    rls: asBoolean(row.rls),
    forceRls: asBoolean(row.force_rls),
  }));
  if (tables.length !== PAIR_CONSULT_CATALOG_CONTRACT.tables.length) {
    return { ok: false, reason: 'TABLE_SET_MISMATCH' };
  }
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.tables) {
    const found = tables.find((row) => row.name === expected.name);
    if (!found || found.schema !== expected.schema || found.relkind !== expected.relkind || found.rls !== true || found.forceRls !== true) {
      return { ok: false, reason: 'TABLE_CONTRACT_MISMATCH' };
    }
  }
  const denied = new Set<string>(PAIR_CONSULT_CATALOG_CONTRACT.deniedTableRoles);
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.tablePrivileges) {
    const actual = input.tableGrants
      .filter((row) => row.table_name === expected.table && row.grantee === expected.role)
      .map((row) => String(row.privilege))
      .sort();
    const wanted = [...expected.privileges].sort();
    if (!sameList(actual, wanted)) return { ok: false, reason: 'TABLE_PRIVILEGE_MISMATCH' };
  }
  if (input.tableGrants.some((row) => denied.has(String(row.grantee ?? '')))) {
    return { ok: false, reason: 'UNEXPECTED_TABLE_GRANT' };
  }
  if (input.functions.length !== PAIR_CONSULT_CATALOG_CONTRACT.functions.length) {
    return { ok: false, reason: 'FUNCTION_SET_MISMATCH' };
  }
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.functions) {
    const found = input.functions.find((row) => row.name === expected.name);
    if (!found) return { ok: false, reason: 'FUNCTION_CONTRACT_MISMATCH' };
    if (found.identity_args !== expected.identityArgs) return { ok: false, reason: 'FUNCTION_CONTRACT_MISMATCH' };
    if (asBoolean(found.security_definer) !== true) return { ok: false, reason: 'FUNCTION_CONTRACT_MISMATCH' };
    if (normalizeSearchPath(found.search_path) !== expected.searchPath) return { ok: false, reason: 'FUNCTION_CONTRACT_MISMATCH' };
  }
  const deniedExecute = new Set<string>(PAIR_CONSULT_CATALOG_CONTRACT.deniedExecuteRoles);
  const privilegeNames = [...FUNCTION_NAMES, PAIR_CONSULT_CATALOG_CONTRACT.fulfill.name];
  for (const name of privilegeNames) {
    const actual = input.functionGrants.filter((row) => row.name === name && row.grantee === 'service_role' && row.privilege === 'EXECUTE');
    if (actual.length !== 1) return { ok: false, reason: 'FUNCTION_PRIVILEGE_MISMATCH' };
  }
  if (input.functionGrants.some((row) => deniedExecute.has(String(row.grantee ?? '')))) {
    return { ok: false, reason: 'UNEXPECTED_FUNCTION_GRANT' };
  }
  if (input.foreignKeys.length !== PAIR_CONSULT_CATALOG_CONTRACT.foreignKeys.length) {
    return { ok: false, reason: 'FOREIGN_KEY_SET_MISMATCH' };
  }
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.foreignKeys) {
    const found = input.foreignKeys.find((row) => row.table_name === expected.table && sameList(asStringArray(row.columns) ?? [], expected.columns));
    const onDelete = found ? deleteAction(String(found.on_delete ?? '')) : null;
    if (!found || found.ref_table !== expected.refTable || !sameList(asStringArray(found.ref_columns) ?? [], expected.refColumns) || onDelete !== expected.onDelete) {
      return { ok: false, reason: 'FOREIGN_KEY_MISMATCH' };
    }
  }
  if (input.uniques.length !== PAIR_CONSULT_CATALOG_CONTRACT.uniques.length) {
    return { ok: false, reason: 'UNIQUE_SET_MISMATCH' };
  }
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.uniques) {
    const found = input.uniques.find((row) => row.name === expected.name);
    if (!found || found.table_name !== expected.table || !sameList(asStringArray(found.columns) ?? [], expected.columns)) {
      return { ok: false, reason: 'UNIQUE_MISMATCH' };
    }
  }
  if (input.indexes.length !== PAIR_CONSULT_CATALOG_CONTRACT.indexes.length) {
    return { ok: false, reason: 'INDEX_SET_MISMATCH' };
  }
  for (const expected of PAIR_CONSULT_CATALOG_CONTRACT.indexes) {
    const found = input.indexes.find((row) => row.name === expected.name);
    if (!found || found.table_name !== expected.table || !sameList(asStringArray(found.columns) ?? [], expected.columns)) {
      return { ok: false, reason: 'INDEX_MISMATCH' };
    }
    if (normalizePredicate(found.predicate) !== normalizePredicate(expected.predicate)) {
      return { ok: false, reason: 'INDEX_MISMATCH' };
    }
  }
  if (input.fulfill.length !== 1) return { ok: false, reason: 'FULFILL_MISMATCH' };
  const fulfill = input.fulfill[0];
  if (!fulfill) return { ok: false, reason: 'FULFILL_MISMATCH' };
  if (fulfill.identity_args !== PAIR_CONSULT_CATALOG_CONTRACT.fulfill.identityArgs) {
    return { ok: false, reason: 'FULFILL_MISMATCH' };
  }
  if (asBoolean(fulfill.security_definer) !== true) return { ok: false, reason: 'FULFILL_MISMATCH' };
  if (normalizeSearchPath(fulfill.search_path) !== PAIR_CONSULT_CATALOG_CONTRACT.fulfill.searchPath) {
    return { ok: false, reason: 'FULFILL_MISMATCH' };
  }
  const definition = typeof fulfill.definition === 'string' ? fulfill.definition : '';
  if (!PAIR_CONSULT_CATALOG_CONTRACT.fulfill.needles.every((needle) => definition.includes(needle))) {
    return { ok: false, reason: 'FULFILL_MISMATCH' };
  }
  const afterKey = historyKey(input.afterHistory);
  const expectedAfter = [
    ...input.beforeHistory,
    {
      version: PAIR_CONSULT_EXACT_VERSION.version,
      name: PAIR_CONSULT_EXACT_VERSION.name,
      statements: input.statements,
    },
  ];
  if (afterKey !== historyKey(expectedAfter)) return { ok: false, reason: 'HISTORY_DIVERGED' };
  const target = input.afterHistory.filter((row) => row.version === PAIR_CONSULT_EXACT_VERSION.version);
  if (target.length !== 1 || target[0]?.name !== PAIR_CONSULT_EXACT_VERSION.name) {
    return { ok: false, reason: 'HISTORY_TARGET_MISMATCH' };
  }
  if (!sameList(target[0]?.statements ?? [], input.statements)) {
    return { ok: false, reason: 'HISTORY_STATEMENTS_MISMATCH' };
  }
  return { ok: true };
}

function historyKey(rows: readonly HistoryRow[]): string {
  return JSON.stringify(rows.map((row) => [row.version, row.name, row.statements]));
}

function resultBase(partial: {
  readonly disposition: PairConsultExactVersionDisposition;
  readonly reason: string;
  readonly commitAttempts: number;
  readonly selectedVersion: typeof PAIR_CONSULT_EXACT_VERSION.version | null;
  readonly querySequence: readonly string[];
  readonly localContractPass: boolean;
  readonly catalogContractMatched?: boolean;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly historyInsert?: PairConsultHistoryInsertProof | null;
  readonly evidence: PairConsultExactVersionResult['evidence'];
  readonly truth?: ConsultExecutionTruth;
}): PairConsultExactVersionResult {
  const { truth, ...rest } = partial;
  return {
    ...rest,
    retryForbidden: true,
    catalogGreen: false,
    catalogContractMatched: partial.catalogContractMatched === true,
    catalogRuntimeVerified: truth?.catalogRuntimeVerified === true,
    runtimeApplied: truth?.runtimeApplied === true,
    transactionCommitted: truth?.transactionCommitted === true,
    transportEvidence: truth?.transportEvidence ?? 'NONE',
    liveExecutionReady: false,
    historyInsert: partial.historyInsert ?? null,
  };
}

function evidence(transportBound: boolean, postConnectSeen: boolean, catalogSql: 'POSTGRES_CATALOG' | 'NONE' = 'NONE'): PairConsultExactVersionResult['evidence'] {
  return {
    intendedBranch: PAIR_CONSULT_EXACT_VERSION.branch,
    intendedHead: PAIR_CONSULT_EXACT_VERSION.head,
    transportBound,
    postConnectSeen,
    postConnectDistinguishesPreview: false,
    catalogSql,
  };
}

function stopBeforeBegin(sequence: string[], reason: string): PairConsultExactVersionResult {
  return resultBase({
    disposition: 'PRE_BEGIN_STOP',
    reason,
    commitAttempts: 0,
    selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
    querySequence: sequence,
    localContractPass: false,
    commitResponseClass: null,
    evidence: evidence(true, true),
  });
}

function holdAfterAck(
  sequence: string[],
  reason: string,
  commitResponseClass: CommitResponseClass,
  historyInsert: PairConsultHistoryInsertProof,
  disposition: 'LOCAL_SIMULATION_CATALOG_HOLD' | 'COMMITTED_BUT_VERIFICATION_HOLD' = 'LOCAL_SIMULATION_CATALOG_HOLD',
  truth?: ConsultExecutionTruth,
): PairConsultExactVersionResult {
  return resultBase({
    disposition,
    reason,
    commitAttempts: 1,
    selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
    querySequence: sequence,
    localContractPass: false,
    commitResponseClass,
    historyInsert,
    evidence: evidence(true, true, 'POSTGRES_CATALOG'),
    truth,
  });
}

export async function simulatePairConsultExactVersion(input: {
  readonly sqlBytes: Buffer;
  readonly localOnlyVersions: readonly string[];
  readonly scenario?: ConsultSimulationScenario;
}): Promise<PairConsultExactVersionResult> {
  const scenario = input.scenario ?? {};
  const identity = evaluatePairConsultExactVersionIdentity({
    projectRef: scenario.claimedProjectRef ?? PAIR_CONSULT_EXACT_VERSION.projectRef,
    sqlBytes: input.sqlBytes,
    localOnlyVersions: input.localOnlyVersions,
  });
  if (!identity.ok) {
    return resultBase({
      disposition: 'IDENTITY_REJECTED',
      reason: identity.reason,
      commitAttempts: 0,
      selectedVersion: null,
      querySequence: [],
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(false, false),
    });
  }
  const transport: ConsultTransportConfig = {
    host: scenario.host ?? SESSION_POOLER_HOST,
    port: EXPECTED_PORT,
    database: EXPECTED_DATABASE_NAME,
    user: scenario.connectionUser ?? expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF),
    sslmode: EXPECTED_SSLMODE,
    tlsTrustProfile: scenario.tlsTrustProfile ?? TLS_TRUST_PROFILE,
    tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
    tlsCaPem: scenario.tlsCaPem ?? '',
    claimedProjectRef: scenario.claimedProjectRef ?? APPROVED_PREVIEW_PROJECT_REF,
    claimedBranch: scenario.claimedBranch ?? PAIR_CONSULT_EXACT_VERSION.branch,
    claimedHead: scenario.claimedHead ?? PAIR_CONSULT_EXACT_VERSION.head,
    claimedWorktree: scenario.claimedWorktree ?? PAIR_CONSULT_WORKTREE,
  };
  const binding = evaluateConsultTransportBinding(transport);
  if (!binding.ok) {
    return resultBase({
      disposition: 'TARGET_BINDING_STOP',
      reason: binding.reason,
      commitAttempts: 0,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: [],
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(false, false),
    });
  }
  const sequence: string[] = [];
  const baselineVersions = scenario.baselineVersions ?? ['20260614000000', '20261013110000'];
  const shared = {
    failConnect: scenario.failConnect,
    failBegin: scenario.failBegin,
    failOnStatement: scenario.failOnStatement,
    rollbackAcknowledged: scenario.rollbackAcknowledged,
    commit: scenario.commit ?? 'ACK',
    currentDatabase: scenario.currentDatabase ?? EXPECTED_DATABASE_NAME,
    currentUser: scenario.currentUser ?? EXPECTED_CURRENT_USER,
    versionAlreadyPresent: scenario.versionAlreadyPresent === true,
    versionAppearsAfterBegin: scenario.versionAppearsAfterBegin === true,
    objectsAlreadyPresent: scenario.objectsAlreadyPresent === true,
    historyPrivilegeDenied: scenario.historyPrivilegeDenied === true,
    baselineVersions,
    statements: identity.statements,
    catalogDefect: scenario.catalogDefect ?? 'none',
  } as const;
  const mutation = new ConsultSimulationClient({ ...shared, role: 'mutation' });
  try {
    await mutation.connect();
    sequence.push('CONNECT');
  } catch {
    sequence.push('CONNECT_FAILED');
    return resultBase({
      disposition: 'PRE_BEGIN_STOP',
      reason: 'CONNECT_FAILED',
      commitAttempts: 0,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(true, false),
    });
  }
  const guard = await mutation.query(POST_CONNECT_GUARD_SQL);
  sequence.push('POST_CONNECT_GUARD');
  const guardRow = guard.rows[0];
  if (guard.rowCount !== 1 || guardRow?.current_database_name !== EXPECTED_DATABASE_NAME || guardRow?.current_user_name !== EXPECTED_CURRENT_USER) {
    await mutation.close();
    return stopBeforeBegin(sequence, 'POST_CONNECT_GUARD_MISMATCH');
  }
  const columns = await mutation.query(CONSULT_HISTORY_COLUMNS_SQL);
  sequence.push('HISTORY_SCHEMA');
  const columnShape = evaluateConsultHistoryShape(columns.rows);
  if (!columnShape.ok) {
    await mutation.close();
    return stopBeforeBegin(sequence, columnShape.reason);
  }
  const privilege = await mutation.query(CONSULT_HISTORY_PRIVILEGE_SQL);
  sequence.push('HISTORY_PRIVILEGE');
  if (privilege.rows[0]?.can_select !== true || privilege.rows[0]?.can_insert !== true) {
    await mutation.close();
    return stopBeforeBegin(sequence, 'HISTORY_PRIVILEGE_MISMATCH');
  }
  const existing = await mutation.query(CONSULT_VERSION_COUNT_SQL, [PAIR_CONSULT_EXACT_VERSION.version]);
  sequence.push('VERSION_ABSENT_CHECK');
  if (String(existing.rows[0]?.count ?? '') !== '0') {
    await mutation.close();
    return stopBeforeBegin(sequence, 'VERSION_ALREADY_PRESENT');
  }
  const baselineResult = await mutation.query(CONSULT_HISTORY_ROWS_SQL);
  sequence.push('BASELINE_HISTORY');
  const baseline = parseHistory(baselineResult.rows);
  if (baseline === null) {
    await mutation.close();
    return stopBeforeBegin(sequence, 'HISTORY_ROW_MALFORMED');
  }
  const baselineShape = evaluateConsultBaselineHistory(baseline);
  if (!baselineShape.ok) {
    await mutation.close();
    return stopBeforeBegin(sequence, baselineShape.reason);
  }
  const preexisting = await mutation.query(CONSULT_PREEXISTING_RELATIONS_SQL, [TABLE_NAMES]);
  sequence.push('PREEXISTING_RELATIONS');
  if (preexisting.rows.length !== 0) {
    await mutation.close();
    return stopBeforeBegin(sequence, 'OBJECTS_ALREADY_PRESENT');
  }
  try {
    await mutation.begin();
    sequence.push('BEGIN');
  } catch {
    sequence.push('BEGIN_FAILED');
    await mutation.close();
    return stopBeforeBegin(sequence, 'BEGIN_FAILED');
  }
  try {
    const again = await mutation.query(CONSULT_VERSION_COUNT_SQL, [PAIR_CONSULT_EXACT_VERSION.version]);
    const againObjects = await mutation.query(CONSULT_PREEXISTING_RELATIONS_SQL, [TABLE_NAMES]);
    sequence.push('IN_TRANSACTION_RECHECK');
    if (String(again.rows[0]?.count ?? '') !== '0' || againObjects.rows.length !== 0) {
      throw new Error('in-transaction conflict');
    }
    for (const statement of identity.statements) {
      await mutation.query(statement);
      sequence.push('TARGET_STATEMENT');
    }
    await mutation.query(HISTORY_INSERT_SQL_METADATA, [
      PAIR_CONSULT_EXACT_VERSION.version,
      identity.statements,
      PAIR_CONSULT_EXACT_VERSION.name,
    ]);
    sequence.push('HISTORY_INSERT');
  } catch {
    let acknowledged = false;
    try {
      acknowledged = (await mutation.rollback()).acknowledged;
      sequence.push(acknowledged ? 'ROLLBACK' : 'ROLLBACK_UNCERTAIN');
    } catch {
      sequence.push('ROLLBACK_THROWN');
    }
    await mutation.close().catch(() => undefined);
    return resultBase({
      disposition: acknowledged ? 'ROLLED_BACK' : 'ROLLBACK_UNCERTAIN',
      reason: acknowledged ? 'PRE_COMMIT_FAILURE' : 'ROLLBACK_NOT_ACKNOWLEDGED',
      commitAttempts: 0,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(true, true),
    });
  }
  const historyInsert: PairConsultHistoryInsertProof = {
    version: PAIR_CONSULT_EXACT_VERSION.version,
    name: PAIR_CONSULT_EXACT_VERSION.name,
    statementCount: identity.statements.length,
  };
  let commitResponseClass: CommitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
  try {
    commitResponseClass = (await mutation.commit()).responseClass;
    sequence.push('COMMIT');
  } catch {
    sequence.push('COMMIT_THROWN');
    commitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
  }
  try {
    await mutation.close();
    sequence.push('CLOSE');
  } catch {
    sequence.push('MUTATION_CLOSE_FAILED');
  }
  const branch = branchAfterCommitResponseClass({
    responseClass: commitResponseClass,
    originalConnectionClosed: true,
  });
  if (commitResponseClass !== 'DEFINITIVE_COMMIT_ACK' || !branch.ok) {
    return resultBase({
      disposition: commitResponseClass === 'DEFINITIVE_TRANSACTION_REJECTION' ? 'COMMIT_REJECTED' : 'COMMIT_ACK_UNCERTAIN',
      reason: commitResponseClass,
      commitAttempts: 1,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass,
      historyInsert,
      evidence: evidence(true, true),
    });
  }
  const post = new ConsultSimulationClient({
    ...shared,
    failConnect: scenario.postCommitFailConnect,
    closeFails: scenario.postCommitCloseFails,
    role: 'postcommit',
  });
  try {
    await post.connect();
    sequence.push('POST_COMMIT_CONNECT');
  } catch {
    sequence.push('POST_COMMIT_CONNECT_FAILED');
    return holdAfterAck(sequence, 'POST_COMMIT_CONNECT_FAILED', commitResponseClass, historyInsert);
  }
  const postGuard = await post.query(POST_CONNECT_GUARD_SQL);
  sequence.push('POST_COMMIT_GUARD');
  if (postGuard.rows[0]?.current_database_name !== EXPECTED_DATABASE_NAME || postGuard.rows[0]?.current_user_name !== EXPECTED_CURRENT_USER) {
    await post.close().catch(() => undefined);
    return holdAfterAck(sequence, 'POST_COMMIT_GUARD_MISMATCH', commitResponseClass, historyInsert);
  }
  let catalogOk = false;
  let catalogReason = 'CATALOG_CONTRACT_MISMATCH';
  try {
    const tables = await post.query(CONSULT_TABLE_SQL, [TABLE_NAMES]);
    const tableGrants = await post.query(CONSULT_TABLE_GRANT_SQL, [TABLE_NAMES]);
    const functions = await post.query(CONSULT_FUNCTION_SQL, [FUNCTION_NAMES]);
    const functionGrants = await post.query(CONSULT_FUNCTION_GRANT_SQL, [[...FUNCTION_NAMES, PAIR_CONSULT_CATALOG_CONTRACT.fulfill.name]]);
    const foreignKeys = await post.query(CONSULT_FOREIGN_KEY_SQL, [TABLE_NAMES]);
    const uniques = await post.query(CONSULT_UNIQUE_SQL, [TABLE_NAMES]);
    const indexes = await post.query(CONSULT_INDEX_SQL, PAIR_CONSULT_CATALOG_CONTRACT.indexes.map((index) => index.name));
    const fulfill = await post.query(CONSULT_FULFILL_SQL);
    const after = await post.query(CONSULT_HISTORY_ROWS_SQL);
    sequence.push('POST_COMMIT_CATALOG');
    const afterHistory = parseHistory(after.rows);
    if (afterHistory === null) {
      catalogReason = 'HISTORY_ROW_MALFORMED';
    } else {
      const catalog = evaluateConsultCatalogRows({
        tables: tables.rows,
        tableGrants: tableGrants.rows,
        functions: functions.rows,
        functionGrants: functionGrants.rows,
        foreignKeys: foreignKeys.rows,
        uniques: uniques.rows,
        indexes: indexes.rows,
        fulfill: fulfill.rows,
        beforeHistory: baseline,
        afterHistory,
        statements: identity.statements,
      });
      catalogOk = catalog.ok;
      if (!catalog.ok) catalogReason = catalog.reason;
    }
  } catch {
    sequence.push('POST_COMMIT_CATALOG_FAILED');
    await post.close().catch(() => undefined);
    return holdAfterAck(sequence, 'CATALOG_QUERY_FAILED', commitResponseClass, historyInsert);
  }
  try {
    await post.close();
    sequence.push('POST_COMMIT_CLOSE');
  } catch {
    sequence.push('POST_COMMIT_CLOSE_FAILED');
    return resultBase({
      disposition: 'LOCAL_SIMULATION_CLEANUP_HOLD',
      reason: 'POST_COMMIT_CLOSE_FAILED',
      commitAttempts: 1,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      catalogContractMatched: catalogOk,
      commitResponseClass,
      historyInsert,
      evidence: evidence(true, true, 'POSTGRES_CATALOG'),
    });
  }
  if (!catalogOk) {
    return holdAfterAck(sequence, catalogReason, commitResponseClass, historyInsert);
  }
  return resultBase({
    disposition: 'LOCAL_SIMULATION_CONTRACT_PASS',
    reason: 'LOCAL_SIMULATION_ONLY',
    commitAttempts: 1,
    selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
    querySequence: sequence,
    localContractPass: true,
    catalogContractMatched: true,
    commitResponseClass,
    historyInsert,
    evidence: evidence(true, true, 'POSTGRES_CATALOG'),
  });
}

export const CONSULT_OPERATIONAL_SOURCE_PATHS = [
  'lib/m55/previewRemoteApply/pairConsultExactVersionPreviewExecutor.ts',
  'scripts/m55/runPreviewPairConsultExactVersionExecution.ts',
  PAIR_CONSULT_EXACT_VERSION.relativePath,
] as const;

export type ConsultOperationalObservation =
  | {
      readonly ok: true;
      readonly branch: string;
      readonly head: string;
      readonly worktree: string;
      readonly migrationBlobSha1: string;
      readonly sourceClean: boolean;
    }
  | { readonly ok: false; readonly reason: string };

export function consultConfirmationPhrase(head: string): string {
  return [
    'APPLY',
    'PREVIEW',
    PAIR_CONSULT_EXACT_VERSION.projectRef,
    PAIR_CONSULT_EXACT_VERSION.version,
    PAIR_CONSULT_EXACT_VERSION.gitBlobSha1,
    head,
  ].join(' ');
}

export function renderConsultConfirmationPrompt(head: string): string {
  return [
    'M55 consult Preview apply confirmation',
    'environment=preview',
    `project=${PAIR_CONSULT_EXACT_VERSION.projectName}`,
    `projectRef=${PAIR_CONSULT_EXACT_VERSION.projectRef}`,
    'operation=APPLY_ONE_MIGRATION',
    `version=${PAIR_CONSULT_EXACT_VERSION.version}`,
    `gitBlobSha1=${PAIR_CONSULT_EXACT_VERSION.gitBlobSha1}`,
    `branch=${PAIR_CONSULT_EXACT_VERSION.branch}`,
    `head=${head}`,
    `worktree=${PAIR_CONSULT_WORKTREE}`,
    'Type the confirmation line exactly. Do not enter a password.',
    consultConfirmationPhrase(head),
  ].join('\n');
}

export function observeConsultOperationalIdentity(repoRoot: string): ConsultOperationalObservation {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const worktree = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const migrationBlobSha1 = gitBlobSha1(loadFrozenConsultMigrationBytes(repoRoot));
    const porcelain = execFileSync('git', ['status', '--porcelain', '--', ...CONSULT_OPERATIONAL_SOURCE_PATHS], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const listed = execFileSync('git', ['ls-files', '--', ...CONSULT_OPERATIONAL_SOURCE_PATHS], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const tracked = new Set(listed.split('\n').map((line) => line.trim()).filter((line) => line.length > 0));
    const sourceClean = porcelain.trim().length === 0
      && CONSULT_OPERATIONAL_SOURCE_PATHS.every((path) => tracked.has(path));
    if (!/^[0-9a-f]{40}$/.test(head)) return { ok: false, reason: 'GIT_IDENTITY_UNREADABLE' };
    return { ok: true, branch, head, worktree, migrationBlobSha1, sourceClean };
  } catch {
    return { ok: false, reason: 'GIT_IDENTITY_UNREADABLE' };
  }
}

export function consultControllingTerminalAvailable(): boolean {
  try {
    const fd = openSync('/dev/tty', 'r');
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

export function consultLiveMutationPermitted(): boolean {
  return PAIR_CONSULT_LIVE_EXECUTION_READY;
}

export function interpretConsultTransportProfile(profile: string, claimedLabel?: string): ConsultTransportEvidenceKind {
  void claimedLabel;
  if (profile === EXECUTION_PG_TRANSPORT_EVIDENCE_PROFILE.TEST_INJECTED) return 'TEST_INJECTED';
  if (profile === EXECUTION_PG_TRANSPORT_EVIDENCE_PROFILE.PG_REAL_SESSION_POOLER_TLS_PINNED_V1) {
    return 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1';
  }
  return 'UNKNOWN';
}

export function classifyConsultTransportEvidence(
  deps: ExecutionPgTransportFactoryDeps = {},
  claimedLabel?: string,
): ConsultTransportEvidenceKind {
  return interpretConsultTransportProfile(resolveExecutionPgTransportEvidenceProfile(deps), claimedLabel);
}

export function projectConsultExecutionTruth(input: {
  readonly transportEvidence: ConsultTransportEvidenceKind;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly catalogContractMatched: boolean;
}): ConsultExecutionTruth {
  const real = input.transportEvidence === 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1';
  const acknowledged = real && input.commitResponseClass === 'DEFINITIVE_COMMIT_ACK';
  const verified = acknowledged && input.catalogContractMatched;
  return {
    transportEvidence: input.transportEvidence,
    runtimeApplied: acknowledged,
    transactionCommitted: acknowledged,
    catalogRuntimeVerified: verified,
    realDisposition: !real || !acknowledged
      ? null
      : verified
        ? 'REAL_COMMIT_CATALOG_VERIFIED'
        : 'COMMITTED_BUT_VERIFICATION_HOLD',
  };
}

export function readConsultConfirmationFromControllingTerminal(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = createReadStream('/dev/tty', { encoding: 'utf8' });
    const lines = createInterface({ input, terminal: false });
    let settled = false;
    const finish = (value: string): void => {
      if (settled) return;
      settled = true;
      lines.close();
      input.destroy();
      resolve(value);
    };
    lines.once('line', (line) => finish(line));
    input.once('error', (error) => {
      if (settled) return;
      settled = true;
      lines.close();
      reject(error);
    });
  });
}

export type ConsultHumanOperatedInput = {
  readonly repoRoot: string;
  readonly localOnlyVersions?: readonly string[];
  readonly yes?: boolean;
  readonly force?: boolean;
  readonly authorized?: boolean;
  readonly isControllingTerminal?: () => boolean;
  readonly observe?: () => ConsultOperationalObservation;
  readonly readConfirmation?: () => Promise<string>;
  readonly readCredentialBytes?: () => Buffer | Promise<Buffer>;
  readonly writePrompt?: (text: string) => void;
  readonly claimedTransportLabel?: string;
  readonly presentedAuthorization?: unknown;
  readonly localFakeScenario?: ConsultLocalFakeScenario;
};

export type ConsultLocalFakeScenario = {
  readonly versionAlreadyPresent?: boolean;
  readonly versionAppearsAfterBegin?: boolean;
  readonly catalogDefect?: ConsultCatalogDefect;
  readonly failBegin?: boolean;
  readonly failOnStatement?: boolean;
  readonly rollbackAcknowledged?: boolean;
  readonly transportLossOnCommit?: boolean;
  readonly failPostClose?: boolean;
  readonly failPostGuard?: boolean;
};

const LOCAL_FAKE_SCENARIO_KEYS = new Set<string>([
  'versionAlreadyPresent',
  'versionAppearsAfterBegin',
  'catalogDefect',
  'failBegin',
  'failOnStatement',
  'rollbackAcknowledged',
  'transportLossOnCommit',
  'failPostClose',
  'failPostGuard',
]);

const LOCAL_FAKE_CATALOG_DEFECTS = new Set<string>([
  'none',
  'fk',
  'unique',
  'index',
  'function',
  'privilege',
  'query_fail',
  'history',
]);

export type LocalFakeTransportTraceClient = {
  readonly calls: readonly string[];
  readonly queries: readonly { readonly sql: string }[];
};

let localFakeTraceClients: ConsultSimulationClient[] = [];

export function readLastLocalFakeTransportTrace(): readonly LocalFakeTransportTraceClient[] {
  return localFakeTraceClients.map((client) => ({
    calls: [...client.calls],
    queries: client.queries.map((query) => ({ sql: query.sql })),
  }));
}

function callerSuppliedPgTransport(input: ConsultHumanOperatedInput): boolean {
  const record = input as ConsultHumanOperatedInput & {
    readonly transportDeps?: unknown;
    readonly createClient?: unknown;
    readonly queryHandler?: unknown;
  };
  if (record.transportDeps != null) return true;
  if (typeof record.createClient === 'function') return true;
  if (typeof record.queryHandler === 'function') return true;
  return false;
}

function acceptLocalFakeScenario(value: ConsultLocalFakeScenario | undefined):
  | { readonly ok: true; readonly scenario: ConsultLocalFakeScenario }
  | { readonly ok: false; readonly reason: string } {
  if (value == null) return { ok: true, scenario: {} };
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'LOCAL_FAKE_SCENARIO_REJECTED' };
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!LOCAL_FAKE_SCENARIO_KEYS.has(key)) return { ok: false, reason: 'LOCAL_FAKE_SCENARIO_REJECTED' };
    const field = record[key];
    if (typeof field === 'function') return { ok: false, reason: 'LOCAL_FAKE_SCENARIO_REJECTED' };
  }
  const defect = record.catalogDefect;
  if (defect != null && (typeof defect !== 'string' || !LOCAL_FAKE_CATALOG_DEFECTS.has(defect))) {
    return { ok: false, reason: 'LOCAL_FAKE_SCENARIO_REJECTED' };
  }
  for (const key of LOCAL_FAKE_SCENARIO_KEYS) {
    if (key === 'catalogDefect') continue;
    const field = record[key];
    if (field != null && typeof field !== 'boolean') return { ok: false, reason: 'LOCAL_FAKE_SCENARIO_REJECTED' };
  }
  return { ok: true, scenario: value };
}

function localFakeSimOptions(
  scenario: ConsultLocalFakeScenario,
  statements: readonly string[],
  role: 'mutation' | 'postcommit',
): SimOptions {
  return {
    failBegin: role === 'mutation' && scenario.failBegin === true,
    failOnStatement: role === 'mutation' && scenario.failOnStatement === true,
    rollbackAcknowledged: scenario.rollbackAcknowledged,
    commit: role === 'mutation' && scenario.transportLossOnCommit === true ? 'THROW' : 'ACK',
    closeFails: role === 'postcommit' && scenario.failPostClose === true,
    failPostGuard: role === 'postcommit' && scenario.failPostGuard === true,
    currentDatabase: EXPECTED_DATABASE_NAME,
    currentUser: EXPECTED_CURRENT_USER,
    versionAlreadyPresent: scenario.versionAlreadyPresent === true,
    versionAppearsAfterBegin: scenario.versionAppearsAfterBegin === true,
    objectsAlreadyPresent: false,
    historyPrivilegeDenied: false,
    baselineVersions: ['20260614000000', '20261013110000'],
    statements,
    catalogDefect: scenario.catalogDefect ?? 'none',
    role,
  };
}

function credentialMatchesPreview(secrets: ParsedConnectionSecrets):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  const host = calculateCanonicalHostFingerprint(secrets.host);
  if (!host.ok || host.normalizedHost !== SESSION_POOLER_HOST || host.fingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return { ok: false, reason: 'POOLER_HOST_MISMATCH' };
  }
  if (secrets.user !== expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF)) {
    return { ok: false, reason: 'CONNECTION_USER_NOT_PROJECT_BOUND' };
  }
  if (secrets.port !== EXPECTED_PORT || secrets.database !== EXPECTED_DATABASE_NAME || secrets.sslmode !== EXPECTED_SSLMODE) {
    return { ok: false, reason: 'CREDENTIAL_TARGET_MISMATCH' };
  }
  if (!validatePinnedTlsCaPem(secrets.tlsCaPem)) return { ok: false, reason: 'TLS_CA_NOT_PINNED' };
  return { ok: true };
}

function publicFailure(reason: string, password: string): PairConsultExactVersionResult {
  return blocked(sanitizePublicReason(reason, password));
}

function sanitizePublicReason(reason: string, password: string): string {
  if ((password.length > 0 && reason.includes(password)) || /postgres(ql)?:\/\//i.test(reason) || /:\/\/[^/\s]*@/.test(reason)) {
    return 'HOLD_UNEXPECTED_INTERNAL';
  }
  if (reason.length > 160) return 'HOLD_UNEXPECTED_INTERNAL';
  return reason;
}

function acceptOperationalIdentity(observation: ConsultOperationalObservation):
  | { readonly ok: true; readonly value: Extract<ConsultOperationalObservation, { readonly ok: true }> }
  | { readonly ok: false; readonly reason: string } {
  if (!observation.ok) return observation;
  if (observation.branch !== PAIR_CONSULT_EXACT_VERSION.branch) return { ok: false, reason: 'BRANCH_MISMATCH' };
  if (observation.worktree !== PAIR_CONSULT_WORKTREE) return { ok: false, reason: 'WORKTREE_MISMATCH' };
  if (observation.migrationBlobSha1 !== PAIR_CONSULT_EXACT_VERSION.gitBlobSha1) return { ok: false, reason: 'GIT_BLOB_MISMATCH' };
  if (!observation.sourceClean) return { ok: false, reason: 'UNREVIEWED_SOURCE' };
  if (!/^[0-9a-f]{40}$/.test(observation.head)) return { ok: false, reason: 'GIT_IDENTITY_UNREADABLE' };
  return { ok: true, value: observation };
}

function identityDrift(
  authority: Extract<ConsultOperationalObservation, { readonly ok: true }>,
  next: ConsultOperationalObservation,
): string | null {
  const confirmed = acceptOperationalIdentity(next);
  if (!confirmed.ok) return confirmed.reason;
  if (confirmed.value.branch !== authority.branch) return 'BRANCH_MISMATCH';
  if (confirmed.value.worktree !== authority.worktree) return 'WORKTREE_MISMATCH';
  if (confirmed.value.head !== authority.head) return 'HEAD_CHANGED_AFTER_CONFIRMATION';
  if (confirmed.value.migrationBlobSha1 !== authority.migrationBlobSha1) return 'GIT_BLOB_MISMATCH';
  return null;
}

export async function executePairConsultHumanOperatedPreview(
  input: ConsultHumanOperatedInput,
): Promise<PairConsultExactVersionResult> {
  if (input.yes === true || input.force === true || input.authorized === true || input.presentedAuthorization != null) {
    return blocked('FORGED_AUTHORIZATION');
  }
  if (!consultControllingTerminalAvailable()) return blocked('NONINTERACTIVE');
  if (!consultLiveMutationPermitted()) return blocked('LIVE_EXECUTION_DENIED');
  return blocked('LIVE_EXECUTION_DENIED');
}

export async function executePairConsultLocalFakeTransport(
  input: ConsultHumanOperatedInput,
): Promise<PairConsultExactVersionResult> {
  localFakeTraceClients = [];
  void input.claimedTransportLabel;
  if (callerSuppliedPgTransport(input)) return blocked('LOCAL_FAKE_CALLER_TRANSPORT_FORBIDDEN');
  const scenario = acceptLocalFakeScenario(input.localFakeScenario);
  if (!scenario.ok) return blocked(scenario.reason);
  if (input.yes === true || input.force === true || input.authorized === true || input.presentedAuthorization != null) {
    return blocked('FORGED_AUTHORIZATION');
  }
  if ((input.isControllingTerminal ?? consultControllingTerminalAvailable)() !== true) {
    return blocked('NONINTERACTIVE');
  }
  const observe = input.observe ?? (() => observeConsultOperationalIdentity(input.repoRoot));
  const first = acceptOperationalIdentity(observe());
  if (!first.ok) return blocked(first.reason);
  const phrase = consultConfirmationPhrase(first.value.head);
  const prompt = renderConsultConfirmationPrompt(first.value.head);
  (input.writePrompt ?? ((text: string) => process.stderr.write(`${text}\n`)))(prompt);
  if (!input.readConfirmation) return blocked('CONFIRMATION_READER_MISSING');
  const typed = (await input.readConfirmation()).trim();
  if (typed !== phrase) return blocked('CONFIRMATION_MISMATCH');
  const afterConfirmation = identityDrift(first.value, observe());
  if (afterConfirmation) return blocked(afterConfirmation);
  let cleanup = (): void => undefined;
  let password = '';
  try {
    assertNoAmbientPgOrTlsFallback();
  } catch {
    return blocked('AMBIENT_CREDENTIAL_FORBIDDEN');
  }
  try {
    const acquired = await acquireSecureStdinConnectionConfig({
      readBytes: input.readCredentialBytes,
    });
    if (!acquired.ok) return blocked('CREDENTIAL_REJECTED');
    cleanup = acquired.cleanup;
    const secrets = acquired.releaseConnectionSecrets();
    password = secrets.password;
    const bound = credentialMatchesPreview(secrets);
    if (!bound.ok) return publicFailure(bound.reason, password);
    const afterCredentials = identityDrift(first.value, observe());
    if (afterCredentials) return publicFailure(afterCredentials, password);
    const sqlBytes = loadFrozenConsultMigrationBytes(input.repoRoot);
    const identity = evaluatePairConsultExactVersionIdentity({
      projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
      sqlBytes,
      localOnlyVersions: input.localOnlyVersions ?? [PAIR_CONSULT_EXACT_VERSION.version],
    });
    if (!identity.ok) return publicFailure(identity.reason, password);
    return await runConsultHumanTransport({
      scenario: scenario.scenario,
      secrets,
      statements: identity.statements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HOLD_UNEXPECTED_INTERNAL';
    return publicFailure(message, password);
  } finally {
    cleanup();
    password = '';
  }
}

async function runConsultHumanTransport(input: {
  readonly scenario: ConsultLocalFakeScenario;
  readonly secrets: ParsedConnectionSecrets;
  readonly statements: readonly string[];
}): Promise<PairConsultExactVersionResult> {
  const transportEvidence = 'TEST_INJECTED' as const;
  void input.secrets;
  const sequence: string[] = [];
  const mutation = new ConsultSimulationClient(localFakeSimOptions(input.scenario, input.statements, 'mutation'));
  localFakeTraceClients = [mutation];
  try {
    await mutation.connect();
    sequence.push('CONNECT');
  } catch {
    sequence.push('CONNECT_FAILED');
    return resultBase({
      disposition: 'PRE_BEGIN_STOP',
      reason: 'CONNECT_FAILED',
      commitAttempts: 0,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(true, false),
    });
  }
  const guard = await mutation.query(POST_CONNECT_GUARD_SQL);
  sequence.push('POST_CONNECT_GUARD');
  const guardRow = guard.rows[0];
  if (guard.rowCount !== 1 || guardRow?.current_database_name !== EXPECTED_DATABASE_NAME || guardRow?.current_user_name !== EXPECTED_CURRENT_USER) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'POST_CONNECT_GUARD_MISMATCH');
  }
  const columns = await mutation.query(CONSULT_HISTORY_COLUMNS_SQL);
  sequence.push('HISTORY_SCHEMA');
  const columnShape = evaluateConsultHistoryShape(columns.rows);
  if (!columnShape.ok) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, columnShape.reason);
  }
  const privilege = await mutation.query(CONSULT_HISTORY_PRIVILEGE_SQL);
  sequence.push('HISTORY_PRIVILEGE');
  if (privilege.rows[0]?.can_select !== true || privilege.rows[0]?.can_insert !== true) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'HISTORY_PRIVILEGE_MISMATCH');
  }
  const existing = await mutation.query(CONSULT_VERSION_COUNT_SQL, [PAIR_CONSULT_EXACT_VERSION.version]);
  sequence.push('VERSION_ABSENT_CHECK');
  if (String(existing.rows[0]?.count ?? '') !== '0') {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'VERSION_ALREADY_PRESENT');
  }
  const baselineResult = await mutation.query(CONSULT_HISTORY_ROWS_SQL);
  sequence.push('BASELINE_HISTORY');
  const baseline = parseHistory(baselineResult.rows);
  if (baseline === null) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'HISTORY_ROW_MALFORMED');
  }
  const baselineShape = evaluateConsultBaselineHistory(baseline);
  if (!baselineShape.ok) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, baselineShape.reason);
  }
  const preexisting = await mutation.query(CONSULT_PREEXISTING_RELATIONS_SQL, [TABLE_NAMES]);
  sequence.push('PREEXISTING_RELATIONS');
  if (preexisting.rows.length !== 0) {
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'OBJECTS_ALREADY_PRESENT');
  }
  try {
    await mutation.begin();
  } catch {
    sequence.push('BEGIN_FAILED');
    await mutation.close().catch(() => undefined);
    return stopBeforeBegin(sequence, 'BEGIN_FAILED');
  }
  sequence.push('BEGIN');
  try {
    await mutation.query(CONSULT_SET_LOCAL_SQL, ['statement_timeout', String(TIMEOUT_POLICY.values.statementMs)]);
    await mutation.query(CONSULT_SET_LOCAL_SQL, ['lock_timeout', String(TIMEOUT_POLICY.values.lockMs)]);
    await mutation.query(CONSULT_SET_LOCAL_SQL, ['idle_in_transaction_session_timeout', String(TIMEOUT_POLICY.values.idleInTransactionMs)]);
    await mutation.query(CONSULT_ADVISORY_LOCK_SQL, [`${PAIR_CONSULT_EXACT_VERSION.version}:${PAIR_CONSULT_EXACT_VERSION.name}`]);
    sequence.push('ADVISORY_LOCK');
    const again = await mutation.query(CONSULT_VERSION_COUNT_SQL, [PAIR_CONSULT_EXACT_VERSION.version]);
    const againObjects = await mutation.query(CONSULT_PREEXISTING_RELATIONS_SQL, [TABLE_NAMES]);
    sequence.push('IN_TRANSACTION_RECHECK');
    if (String(again.rows[0]?.count ?? '') !== '0' || againObjects.rows.length !== 0) {
      throw new Error('in-transaction conflict');
    }
    for (const statement of input.statements) {
      await mutation.query(statement);
      sequence.push('TARGET_STATEMENT');
    }
    await mutation.query(HISTORY_INSERT_SQL_METADATA, [
      PAIR_CONSULT_EXACT_VERSION.version,
      input.statements,
      PAIR_CONSULT_EXACT_VERSION.name,
    ]);
    sequence.push('HISTORY_INSERT');
  } catch {
    let acknowledged = false;
    try {
      acknowledged = (await mutation.rollback()).acknowledged;
      sequence.push(acknowledged ? 'ROLLBACK' : 'ROLLBACK_UNCERTAIN');
    } catch {
      sequence.push('ROLLBACK_THROWN');
    }
    await mutation.close().catch(() => undefined);
    return resultBase({
      disposition: acknowledged ? 'ROLLED_BACK' : 'ROLLBACK_UNCERTAIN',
      reason: acknowledged ? 'PRE_COMMIT_FAILURE' : 'ROLLBACK_NOT_ACKNOWLEDGED',
      commitAttempts: 0,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass: null,
      evidence: evidence(true, true),
    });
  }
  const historyInsert: PairConsultHistoryInsertProof = {
    version: PAIR_CONSULT_EXACT_VERSION.version,
    name: PAIR_CONSULT_EXACT_VERSION.name,
    statementCount: input.statements.length,
  };
  let commitResponseClass: CommitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
  try {
    commitResponseClass = (await mutation.commit()).responseClass;
    sequence.push('COMMIT');
  } catch {
    sequence.push('COMMIT_THROWN');
    commitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
  }
  try {
    await mutation.close();
    sequence.push('CLOSE');
  } catch {
    sequence.push('MUTATION_CLOSE_FAILED');
  }
  const commitBranch = branchAfterCommitResponseClass({
    responseClass: commitResponseClass,
    originalConnectionClosed: true,
  });
  if (commitResponseClass !== 'DEFINITIVE_COMMIT_ACK' || !commitBranch.ok) {
    return resultBase({
      disposition: commitResponseClass === 'DEFINITIVE_TRANSACTION_REJECTION' ? 'COMMIT_REJECTED' : 'COMMIT_ACK_UNCERTAIN',
      reason: commitResponseClass,
      commitAttempts: 1,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: false,
      commitResponseClass,
      historyInsert,
      evidence: evidence(true, true),
    });
  }
  const post = new ConsultSimulationClient(localFakeSimOptions(input.scenario, input.statements, 'postcommit'));
  localFakeTraceClients = [mutation, post];
  const truthFor = (matched: boolean): ConsultExecutionTruth => projectConsultExecutionTruth({
    transportEvidence,
    commitResponseClass,
    catalogContractMatched: matched,
  });
  let catalogOk = false;
  let catalogReason = 'CATALOG_CONTRACT_MISMATCH';
  try {
    try {
      await post.connect();
      sequence.push('POST_COMMIT_CONNECT');
    } catch {
      sequence.push('POST_COMMIT_CONNECT_FAILED');
      return holdAfterAck(sequence, 'POST_COMMIT_CONNECT_FAILED', commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
    }
    let postGuard;
    try {
      postGuard = await post.query(POST_CONNECT_GUARD_SQL);
    } catch {
      sequence.push('POST_COMMIT_GUARD_FAILED');
      await post.close().catch(() => undefined);
      return holdAfterAck(sequence, 'POST_COMMIT_GUARD_FAILED', commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
    }
    sequence.push('POST_COMMIT_GUARD');
    if (postGuard.rows[0]?.current_database_name !== EXPECTED_DATABASE_NAME || postGuard.rows[0]?.current_user_name !== EXPECTED_CURRENT_USER) {
      await post.close().catch(() => undefined);
      return holdAfterAck(sequence, 'POST_COMMIT_GUARD_MISMATCH', commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
    }
    try {
      const tables = await post.query(CONSULT_TABLE_SQL, [TABLE_NAMES]);
      const tableGrants = await post.query(CONSULT_TABLE_GRANT_SQL, [TABLE_NAMES]);
      const functions = await post.query(CONSULT_FUNCTION_SQL, [FUNCTION_NAMES]);
      const functionGrants = await post.query(CONSULT_FUNCTION_GRANT_SQL, [[...FUNCTION_NAMES, PAIR_CONSULT_CATALOG_CONTRACT.fulfill.name]]);
      const foreignKeys = await post.query(CONSULT_FOREIGN_KEY_SQL, [TABLE_NAMES]);
      const uniques = await post.query(CONSULT_UNIQUE_SQL, [TABLE_NAMES]);
      const indexes = await post.query(CONSULT_INDEX_SQL, PAIR_CONSULT_CATALOG_CONTRACT.indexes.map((index) => index.name));
      const fulfill = await post.query(CONSULT_FULFILL_SQL);
      const after = await post.query(CONSULT_HISTORY_ROWS_SQL);
      sequence.push('POST_COMMIT_CATALOG');
      const afterHistory = parseHistory(after.rows);
      if (afterHistory === null) {
        catalogReason = 'HISTORY_ROW_MALFORMED';
      } else {
        const catalog = evaluateConsultCatalogRows({
          tables: tables.rows,
          tableGrants: tableGrants.rows,
          functions: functions.rows,
          functionGrants: functionGrants.rows,
          foreignKeys: foreignKeys.rows,
          uniques: uniques.rows,
          indexes: indexes.rows,
          fulfill: fulfill.rows,
          beforeHistory: baseline,
          afterHistory,
          statements: input.statements,
        });
        catalogOk = catalog.ok;
        if (!catalog.ok) catalogReason = catalog.reason;
      }
    } catch {
      sequence.push('POST_COMMIT_CATALOG_FAILED');
      await post.close().catch(() => undefined);
      return holdAfterAck(sequence, 'CATALOG_QUERY_FAILED', commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
    }
    try {
      await post.close();
      sequence.push('POST_COMMIT_CLOSE');
    } catch {
      sequence.push('POST_COMMIT_CLOSE_FAILED');
      return resultBase({
        disposition: 'COMMITTED_BUT_CLEANUP_HOLD',
        reason: 'POST_COMMIT_CLOSE_FAILED',
        commitAttempts: 1,
        selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
        querySequence: sequence,
        localContractPass: false,
        catalogContractMatched: catalogOk,
        commitResponseClass,
        historyInsert,
        evidence: evidence(true, true, 'POSTGRES_CATALOG'),
        truth: truthFor(catalogOk),
      });
    }
    if (!catalogOk) {
      return holdAfterAck(sequence, catalogReason, commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
    }
    const truth = truthFor(true);
    return resultBase({
      disposition: truth.realDisposition ?? 'LOCAL_TRANSPORT_CONTRACT_PASS',
      reason: truth.transactionCommitted ? 'COMMIT_ACKNOWLEDGED' : 'LOCAL_TRANSPORT_ONLY',
      commitAttempts: 1,
      selectedVersion: PAIR_CONSULT_EXACT_VERSION.version,
      querySequence: sequence,
      localContractPass: true,
      catalogContractMatched: true,
      commitResponseClass,
      historyInsert,
      evidence: evidence(true, true, 'POSTGRES_CATALOG'),
      truth,
    });
  } catch {
    sequence.push('POST_COMMIT_BOUNDARY');
    await post.close().catch(() => undefined);
    return holdAfterAck(sequence, 'POST_COMMIT_EXCEPTION', commitResponseClass, historyInsert, 'COMMITTED_BUT_VERIFICATION_HOLD', truthFor(false));
  }
}
