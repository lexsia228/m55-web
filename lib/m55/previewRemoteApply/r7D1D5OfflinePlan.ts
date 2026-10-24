import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  STATEMENT_STREAM_SERIALIZATION,
  compositeStreamSha256,
  type Policy2HistoryPayload,
} from '../transactionNormalized/statementStream.ts';
import { validateMigrationSourceBytes } from '../transactionNormalized/transactionNormalizedCore.ts';

import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export const R7_D1_D5_MANIFEST_IDENTIFIER = 'M55_R7_PR249_PREVIEW_D1_D5_OFFLINE_MANIFEST_V1' as const;
export const R7_D1_D5_MANIFEST_SCHEMA_VERSION = '1.2.0' as const;
export const R7_D1_D5_NORMALIZATION_METHOD = 'SUPABASE_CLI_SPLIT_AND_TRIM_IDENTITY' as const;
export const R7_D1_D5_OPTION_A_POLICY = 'NOT_APPLICABLE_OUTSIDE_P1_P7_LABELS' as const;

export const R7_PR249_FROZEN_REPO_ROOT =
  '/Users/lexsia/Documents/M55_WORKTREE-r7-creator-dashboard-v1' as const;
export const R7_PR249_FROZEN_BRANCH = 'feat/m55-r7-creator-dashboard-v1' as const;
/** External reviewed base ancestor for the initial four-file untracked audit stage — not an eternal current-HEAD pin. */
export const R7_PR249_REVIEWED_BASE_ANCESTOR_SHA =
  'bb90d4f6e1f37e112a6ca950eebefdf949414cab' as const;

export const R7_PREVIEW_TARGET_PROJECT = 'm55-soul-preview' as const;
export const R7_PREVIEW_TARGET_PROJECT_REF = 'sbogwyzldjxxouhqtpnq' as const;

export const R7_OFFLINE_MANIFEST_RELATIVE_PATH =
  'docs/planning/r7-preview-delta/M55_R7_PR249_PREVIEW_D1_D5_OFFLINE_MANIFEST_V1.json' as const;

export const R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS: readonly string[] = [
  R7_OFFLINE_MANIFEST_RELATIVE_PATH,
  'lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts',
  'lib/m55/previewRemoteApply/r7D1D5OfflinePlan.local.test.ts',
  'scripts/m55/runR7PreviewD1D5OfflinePlan.ts',
] as const;

export const INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256 =
  '8847fb9a4ca66deeb47626a8f7c0c323cf94d5c26c9732b873790b5068ace6dc' as const;

export const R7_D1_D5_PROHIBITED_OPERATIONS = [
  'supabase db push',
  'migration repair',
  'supabase link',
  'include-all migration apply',
  'SQL Editor apply',
  'unmodified CLI apply',
  'P1_P8_LIVE_EXECUTOR_CLI_FOR_D1_D5',
] as const;

export type R7DeltaStepId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

export type OfflineWorkspaceStage = 'FOUR_FILE_UNTRACKED_AUDIT';

/** Externally issued binding (Human/Codex); never synthesized by production CLI. */
export type ExternalReviewedCandidateBinding = {
  readonly candidateCommitSha: string;
  readonly branch: typeof R7_PR249_FROZEN_BRANCH;
  readonly fileSha256ByRelativePath: Readonly<Record<string, string>>;
};

export type MigrationHistoryEntry = {
  readonly version: string;
  readonly name: string;
};

export type R7DeltaSourceIdentity = {
  readonly stepId: R7DeltaStepId;
  readonly version: string;
  readonly name: string;
  readonly relativePath: string;
  readonly bytes: number;
  readonly sourceSha256: string;
  readonly sourceStatementCount: number;
};

export type R7DeltaNormalizedIdentity = {
  readonly normalizationMethod: typeof R7_D1_D5_NORMALIZATION_METHOD;
  readonly optionAPolicy: typeof R7_D1_D5_OPTION_A_POLICY;
  readonly normalizedStatementCount: number;
  readonly normalizedStreamCompositeSha256: string;
  readonly serialization: typeof STATEMENT_STREAM_SERIALIZATION;
};

export type CatalogProbeReadiness = 'NOT_IMPLEMENTED' | 'NOT_RUN';

export type R7DeltaCatalogProbeBinding = {
  readonly preProbeId: string;
  readonly postProbeId: string;
  readonly preProbeReadiness: CatalogProbeReadiness;
  readonly postProbeReadiness: CatalogProbeReadiness;
};

export type R7DeltaStepPlan = {
  readonly stepId: R7DeltaStepId;
  readonly source: R7DeltaSourceIdentity;
  readonly normalized: R7DeltaNormalizedIdentity;
  readonly historyPrefixPrior: readonly MigrationHistoryEntry[];
  readonly historyPrefixPost: readonly MigrationHistoryEntry[];
  readonly catalogProbes: R7DeltaCatalogProbeBinding;
  readonly historyInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
};

export type HistoryProvenanceMetadata = {
  readonly evidenceType: 'M55_R7_PR249_PREVIEW_MIGRATION_HISTORY_OBSERVATION';
  readonly observedAtJst: '2026-10-11';
  readonly sourceKind: 'CONNECTED_SUPABASE_LIST_MIGRATIONS_READ_ONLY';
  readonly projectName: typeof R7_PREVIEW_TARGET_PROJECT;
  readonly projectId: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly rowCount: 16;
  readonly recordsCanonicalDigestSha256: typeof INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256;
  readonly orderPolicy: 'AS_RETURNED_BY_LIST_MIGRATIONS';
  readonly limitations: readonly string[];
};

/** Fresh Preview execution-start observation (2026-10-24 JST) — local read-only, not independent external review. */
export type ExecutionStartHistoryProvenanceMetadata = {
  readonly evidenceType: 'M55_R7_PR249_PREVIEW_EXECUTION_START_HISTORY_OBSERVATION';
  readonly observedAtJst: '2026-10-24';
  readonly sourceKind: 'CONNECTED_SUPABASE_LIST_MIGRATIONS_READ_ONLY';
  readonly attestationClass: 'LOCAL_OPERATOR_READ_ONLY_OBSERVATION_NOT_INDEPENDENTLY_REVIEWED';
  readonly projectName: typeof R7_PREVIEW_TARGET_PROJECT;
  readonly projectId: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly rowCount: 17;
  readonly recordsCanonicalDigestSha256: string;
  readonly orderPolicy: 'VERSION_TEXT_ASCENDING';
  readonly preappliedPairLedgerVersion: '20261008200000';
  readonly preappliedPairLedgerName: 'm55_pair_p5_dedicated_receipt_one_use_ledger_v1';
  readonly limitations: readonly string[];
};

export type OfflineAllowlistBundleIntegrity = {
  readonly digestType: 'SHA256_FILE_BYTES';
  readonly files: Readonly<Record<string, string>>;
};

export type R7D1D5OfflineManifest = {
  readonly identifier: typeof R7_D1_D5_MANIFEST_IDENTIFIER;
  readonly manifestSchemaVersion: typeof R7_D1_D5_MANIFEST_SCHEMA_VERSION;
  readonly offlineAllowlistBundleIntegrity: OfflineAllowlistBundleIntegrity;
  readonly repository: {
    readonly root: typeof R7_PR249_FROZEN_REPO_ROOT;
    readonly branch: typeof R7_PR249_FROZEN_BRANCH;
    readonly reviewedBaseAncestorSha: typeof R7_PR249_REVIEWED_BASE_ANCESTOR_SHA;
  };
  readonly previewTarget: {
    readonly organization: 'm55-preview';
    readonly project: typeof R7_PREVIEW_TARGET_PROJECT;
    readonly projectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  };
  readonly historyProvenance: HistoryProvenanceMetadata;
  readonly executionStartHistoryProvenance: ExecutionStartHistoryProvenanceMetadata;
  readonly authorization: {
    readonly executionAuthorized: false;
    readonly databaseMutationAuthorized: false;
    readonly remoteReady: false;
    readonly remoteConnectionAttempted: false;
  };
  readonly prohibitedOperations: readonly string[];
  readonly startingHistoryPrefix: readonly MigrationHistoryEntry[];
  readonly steps: readonly R7DeltaStepPlan[];
};

export type R7D1D5OfflinePlanHoldCode =
  | 'HOLD_REPO_IDENTITY_MISMATCH'
  | 'HOLD_BRANCH_MISMATCH'
  | 'HOLD_HEAD_COMMIT_MISMATCH'
  | 'HOLD_SOURCE_SHA_MISMATCH'
  | 'HOLD_SOURCE_BYTES_MISMATCH'
  | 'HOLD_SOURCE_STATEMENT_COUNT_MISMATCH'
  | 'HOLD_DUPLICATE_DELTA_VERSION'
  | 'HOLD_HISTORY_PREFIX_ORDER_DRIFT'
  | 'HOLD_HISTORY_PREFIX_LENGTH_MISMATCH'
  | 'HOLD_MANIFEST_IDENTITY_MISMATCH'
  | 'HOLD_MANIFEST_STEP_COUNT_MISMATCH'
  | 'HOLD_NORMALIZED_COMPOSITE_MISMATCH'
  | 'HOLD_MANIFEST_SCHEMA_DRIFT'
  | 'HOLD_MANIFEST_UNKNOWN_KEY'
  | 'HOLD_MANIFEST_PATH_VIOLATION'
  | 'HOLD_HISTORY_PROVENANCE_MISMATCH'
  | 'HOLD_WORKSPACE_STAGE_MISMATCH'
  | 'HOLD_GIT_OBSERVATION_FAILED'
  | 'HOLD_ALLOWLIST_FILE_MISMATCH'
  | 'HOLD_COMMITTED_CANDIDATE_REQUIRES_EXTERNAL_BINDING'
  | 'HOLD_UNEXPECTED_INTERNAL';

export type R7D1D5OfflinePlanHold = {
  readonly mode: 'R7_D1_D5_OFFLINE_HOLD';
  readonly holdReasonCode: R7D1D5OfflinePlanHoldCode;
};

export type R7D1D5OfflinePlanReady = {
  readonly mode: 'READY_FOR_INDEPENDENT_DELTA_REVIEW';
  readonly holdReasonCode: null;
  readonly offlineWorkspaceStage: OfflineWorkspaceStage;
  readonly manifest: R7D1D5OfflineManifest;
  readonly manifestPayloadSha256: string;
};

export type R7D1D5OfflinePlanResult = R7D1D5OfflinePlanHold | R7D1D5OfflinePlanReady;

export const FROZEN_PREVIEW_HISTORY_SNAPSHOT: readonly MigrationHistoryEntry[] = [
  { version: '20260614000000', name: 'preview_production_aligned_baseline_p1' },
  { version: '20260615000001', name: 'failed_fulfillments_user_ref_hash' },
  { version: '20260615000002', name: 'm55_account_deletion_ledger_v1' },
  { version: '20260615000003', name: 'm55_account_deletion_process_rpc_v1' },
  { version: '20260615000004', name: 'm55_entitlements_and_rights_access_security_v1' },
  { version: '20260615000005', name: 'm55_dtr_visible_report_uniqueness_v1' },
  { version: '20260615000006', name: 'm55_entitlements_unique_index_cleanup_v1' },
  { version: '20260617000001', name: 'm55_clerk_webhook_user_ref_hash_v1' },
  { version: '20260626000000', name: 'm55_consult_reply_assistant_length_v1' },
  { version: '20260713000000', name: 'compatibility_purchase_delivery_v1' },
  { version: '20260914000000', name: 'm55_creator_distribution_foundation_v1' },
  { version: '20260919000000', name: 'm55_attribution_touch_schema_v1' },
  { version: '20260920000000', name: 'm55_r5_attribution_admit_qualified_touch_v1' },
  { version: '20260921000000', name: 'm55_r5_attribution_purchase_lock_v1' },
  {
    version: '20260922000000',
    name: '20260922000000_m55_r5_attribution_admit_acceptance_linearized_v1',
  },
  {
    version: '20260923000000',
    name: '20260923000000_m55_r5_attribution_purchase_lock_abuse_guards_v1',
  },
] as const;

/** PAIR P5 ledger already applied on Preview before R7 D1–D5 execution (READ-ONLY observed 2026-10-24 JST). */
export const PAIR_P5_PREAPPLIED_LEDGER_HISTORY_ENTRY: MigrationHistoryEntry = {
  version: '20261008200000',
  name: 'm55_pair_p5_dedicated_receipt_one_use_ledger_v1',
};

/** Current R7 execution-start baseline: frozen historical 16 + pre-applied PAIR ledger (17 rows, version ascending). */
export const FRESH_EXECUTION_START_HISTORY_SNAPSHOT: readonly MigrationHistoryEntry[] = [
  ...FROZEN_PREVIEW_HISTORY_SNAPSHOT,
  PAIR_P5_PREAPPLIED_LEDGER_HISTORY_ENTRY,
] as const;

export const R7_POST_D5_FULL_HISTORY_SORTED_TAIL_VERSION = PAIR_P5_PREAPPLIED_LEDGER_HISTORY_ENTRY.version;

export const FROZEN_DELTA_SOURCE_SPECS: readonly R7DeltaSourceIdentity[] = [
  {
    stepId: 'D1',
    version: '20260924000000',
    name: 'm55_r5_compliance_control_plane_v1',
    relativePath: 'supabase/migrations/20260924000000_m55_r5_compliance_control_plane_v1.sql',
    bytes: 47_569,
    sourceSha256: 'be909ec8e3737f87f668d6504400fafde2c5d57203667aaedc93b3c0b308d159',
    sourceStatementCount: 63,
  },
  {
    stepId: 'D2',
    version: '20260927000000',
    name: 'm55_r6_purchase_money_evidence_v1',
    relativePath: 'supabase/migrations/20260927000000_m55_r6_purchase_money_evidence_v1.sql',
    bytes: 7_957,
    sourceSha256: 'a36b1cbc0a8fca47c3796f57702a05aa4706775142380d8559714f622452b5c2',
    sourceStatementCount: 11,
  },
  {
    stepId: 'D3',
    version: '20260927100000',
    name: 'm55_r6_refund_dispute_economic_evidence_v1',
    relativePath:
      'supabase/migrations/20260927100000_m55_r6_refund_dispute_economic_evidence_v1.sql',
    bytes: 16_508,
    sourceSha256: '4f47b1a14ef942e347dc4a7eb428825fd495c9f3d3b62f7c5c6b17127fa8b0c6',
    sourceStatementCount: 20,
  },
  {
    stepId: 'D4',
    version: '20260927200000',
    name: 'm55_r6_commission_ledger_v1',
    relativePath: 'supabase/migrations/20260927200000_m55_r6_commission_ledger_v1.sql',
    bytes: 67_526,
    sourceSha256: '2bbd7231047f1bdcce2f7b4bb1b4d253fecd1868ebdc77848ddb367d4b13bcad',
    sourceStatementCount: 64,
  },
  {
    stepId: 'D5',
    version: '20261008000000',
    name: 'm55_r7_creator_dashboard_v1',
    relativePath: 'supabase/migrations/20261008000000_m55_r7_creator_dashboard_v1.sql',
    bytes: 5_445,
    sourceSha256: 'a903a1e186b37b4e3be14af31e700a999947b91df1769cbb4c4c97c191e3c7e6',
    sourceStatementCount: 10,
  },
] as const;

const CATALOG_PROBE_BINDINGS: Readonly<Record<R7DeltaStepId, R7DeltaCatalogProbeBinding>> = {
  D1: {
    preProbeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
    postProbeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
    preProbeReadiness: 'NOT_IMPLEMENTED',
    postProbeReadiness: 'NOT_IMPLEMENTED',
  },
  D2: {
    preProbeId: 'R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT',
    postProbeId: 'R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT',
    preProbeReadiness: 'NOT_IMPLEMENTED',
    postProbeReadiness: 'NOT_IMPLEMENTED',
  },
  D3: {
    preProbeId: 'R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT',
    postProbeId: 'R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT',
    preProbeReadiness: 'NOT_IMPLEMENTED',
    postProbeReadiness: 'NOT_IMPLEMENTED',
  },
  D4: {
    preProbeId: 'R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT',
    postProbeId: 'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT',
    preProbeReadiness: 'NOT_IMPLEMENTED',
    postProbeReadiness: 'NOT_IMPLEMENTED',
  },
  D5: {
    preProbeId: 'R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT',
    postProbeId: 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT',
    preProbeReadiness: 'NOT_IMPLEMENTED',
    postProbeReadiness: 'NOT_IMPLEMENTED',
  },
};

const HISTORY_PROVENANCE_LIMITATIONS: readonly string[] = [
  'This is an independent read-only observation, not DB apply approval or a cryptographic Supabase attestation.',
  'At a later Preview apply preflight, repeat read-only history and state verification; do not assume this snapshot stays current.',
  'Do not equate canonical SQL filenames with remote recorded history names; names for versions 20260922000000 and 20260923000000 include their version prefixes.',
] as const;

export type GitSpawnResult = {
  readonly spawnError: string | null;
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string | undefined;
  readonly stderr: string;
};

export type GitStdoutContract =
  | { readonly kind: 'required_non_empty_text' }
  | { readonly kind: 'optional_text' }
  | { readonly kind: 'is_ancestor' };

export type WorkspaceGitObservation = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly porcelainLines: readonly string[];
  readonly stagedPaths: readonly string[];
  readonly changedPathsSinceBase: readonly string[];
  readonly trackedAllowlistPaths: readonly string[];
  readonly isAncestor: (ancestor: string, descendant: string) => boolean;
};

export function sha256Utf8Json(value: unknown): string {
  return createHash('sha256').update(Buffer.from(JSON.stringify(value), 'utf8')).digest('hex');
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonStringify(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function assertObservedGitStderrIsCleanEmpty(stderr: unknown): void {
  if (typeof stderr !== 'string' || stderr.length !== 0) {
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }
}

function assertObservedGitStdoutIsString(stdout: unknown): string {
  if (typeof stdout !== 'string') {
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }
  return stdout;
}

export function interpretGitSpawn(result: GitSpawnResult, contract: GitStdoutContract): string | boolean {
  if (result.spawnError) {
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }
  if (result.signal) {
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }
  assertObservedGitStderrIsCleanEmpty(result.stderr);

  if (contract.kind === 'is_ancestor') {
    if (result.status === 0 || result.status === 1) {
      const stdout = assertObservedGitStdoutIsString(result.stdout);
      if (stdout.length > 0) {
        throw new Error('HOLD_GIT_OBSERVATION_FAILED');
      }
      return result.status === 0;
    }
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }

  if (result.status !== 0) {
    throw new Error('HOLD_GIT_OBSERVATION_FAILED');
  }

  const stdout = assertObservedGitStdoutIsString(result.stdout);
  if (contract.kind === 'required_non_empty_text') {
    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error('HOLD_GIT_OBSERVATION_FAILED');
    }
    return trimmed;
  }

  return stdout;
}

/** @deprecated use interpretGitSpawn */
export function assertGitSpawnOk(result: GitSpawnResult, requireStdout = true): string {
  if (requireStdout) {
    return interpretGitSpawn(result, { kind: 'required_non_empty_text' }) as string;
  }
  return interpretGitSpawn(result, { kind: 'optional_text' }) as string;
}

export function parsePorcelainPaths(lines: readonly string[]): {
  untracked: string[];
  trackedChanges: string[];
} {
  const untracked: string[] = [];
  const trackedChanges: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const path = line.slice(3).trim();
    if (line.startsWith('?? ')) {
      untracked.push(path);
      continue;
    }
    trackedChanges.push(path);
  }
  return { untracked, trackedChanges };
}

export function classifyOfflineWorkspaceStage(
  observation: WorkspaceGitObservation,
): OfflineWorkspaceStage | null {
  const { untracked, trackedChanges } = parsePorcelainPaths(observation.porcelainLines);
  const allowlist = [...R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS].sort();
  const untrackedSorted = [...untracked].sort();

  if (observation.stagedPaths.length > 0) {
    return null;
  }

  if (
    observation.headCommitSha === R7_PR249_REVIEWED_BASE_ANCESTOR_SHA &&
    trackedChanges.length === 0 &&
    untrackedSorted.length === allowlist.length &&
    untrackedSorted.every((p, i) => p === allowlist[i])
  ) {
    return 'FOUR_FILE_UNTRACKED_AUDIT';
  }

  return null;
}

export function detectCommittedCandidateWorkspacePattern(
  observation: WorkspaceGitObservation,
): boolean {
  const allowlist = [...R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS].sort();
  if (observation.headCommitSha === R7_PR249_REVIEWED_BASE_ANCESTOR_SHA) {
    return false;
  }
  return (
    observation.porcelainLines.every((line) => line.trim().length === 0) &&
    observation.isAncestor(R7_PR249_REVIEWED_BASE_ANCESTOR_SHA, observation.headCommitSha) &&
    observation.changedPathsSinceBase.length === allowlist.length &&
    [...observation.changedPathsSinceBase].sort().every((path, index) => path === allowlist[index]) &&
    observation.trackedAllowlistPaths.length === allowlist.length
  );
}

function assertRelativePathLexicallySafe(relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, '/');
  if (isAbsolute(normalized) || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
}

function assertPathWalkNoSymlinkParents(trustedRootRealpath: string, relativePath: string): void {
  assertRelativePathLexicallySafe(relativePath);
  const segments = relativePath.split('/').filter((segment) => segment.length > 0);
  let cursor = trustedRootRealpath;
  for (let index = 0; index < segments.length; index += 1) {
    cursor = join(cursor, segments[index]);
    if (!existsSync(cursor)) {
      if (index === segments.length - 1) {
        throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
      }
      throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
    }
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
    }
  }
}

export function resolveTrustedRepositoryRoot(repoRootInput: string): string {
  const canonicalRoot = realpathSync(repoRootInput);
  if (canonicalRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
  return canonicalRoot;
}

/** Resolve a relative path to a regular file strictly contained under trustedRoot (test seam). */
export function resolveConfinedRegularFileUnderRoot(
  trustedRootRealpath: string,
  relativePath: string,
): string {
  assertPathWalkNoSymlinkParents(trustedRootRealpath, relativePath);
  const absoluteCandidate = join(trustedRootRealpath, relativePath);
  const relativeFromRoot = relative(trustedRootRealpath, absoluteCandidate);
  if (relativeFromRoot.startsWith('..') || isAbsolute(relativeFromRoot)) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
  const finalStat = lstatSync(absoluteCandidate);
  if (!finalStat.isFile() || finalStat.isSymbolicLink()) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
  const resolvedTarget = realpathSync(absoluteCandidate);
  const relativeResolved = relative(trustedRootRealpath, resolvedTarget);
  if (relativeResolved.startsWith('..') || isAbsolute(relativeResolved)) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
  return resolvedTarget;
}

/** Resolve an allowlisted relative path under the frozen R7 repository root. */
export function resolveConfinedAllowlistRegularFile(
  trustedRootRealpath: string,
  relativePath: string,
): string {
  if (trustedRootRealpath !== R7_PR249_FROZEN_REPO_ROOT) {
    throw new Error('HOLD_MANIFEST_PATH_VIOLATION');
  }
  return resolveConfinedRegularFileUnderRoot(trustedRootRealpath, relativePath);
}

function computeManifestAllowlistDigestFromParsed(manifest: Record<string, unknown>): string {
  const clone = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>;
  const integrity = clone.offlineAllowlistBundleIntegrity as Record<string, unknown> | undefined;
  if (!integrity || typeof integrity !== 'object') {
    throw new Error('HOLD_ALLOWLIST_FILE_MISMATCH');
  }
  const files = integrity.files as Record<string, string> | undefined;
  if (!files || typeof files !== 'object') {
    throw new Error('HOLD_ALLOWLIST_FILE_MISMATCH');
  }
  files[R7_OFFLINE_MANIFEST_RELATIVE_PATH] = '';
  return createHash('sha256')
    .update(Buffer.from(canonicalJsonStringify(clone), 'utf8'))
    .digest('hex');
}

function computeAllowlistFileDigest(
  trustedRootRealpath: string,
  relativePath: string,
): string {
  const confinedPath = resolveConfinedAllowlistRegularFile(trustedRootRealpath, relativePath);
  const bytes = readFileSync(confinedPath);
  if (relativePath === R7_OFFLINE_MANIFEST_RELATIVE_PATH) {
    const parsed = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    return computeManifestAllowlistDigestFromParsed(parsed);
  }
  return createHash('sha256').update(bytes).digest('hex');
}

export function computeOfflineAllowlistFileDigests(
  trustedRootRealpath: string,
): Readonly<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const relativePath of R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS) {
    files[relativePath] = computeAllowlistFileDigest(trustedRootRealpath, relativePath);
  }
  return files;
}

export function verifyAllowlistFileIntegrity(
  trustedRootRealpath: string,
  bundleIntegrity: OfflineAllowlistBundleIntegrity,
): R7D1D5OfflinePlanHoldCode | null {
  if (bundleIntegrity.digestType !== 'SHA256_FILE_BYTES') {
    return 'HOLD_ALLOWLIST_FILE_MISMATCH';
  }
  for (const relativePath of R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS) {
    const expected = bundleIntegrity.files[relativePath];
    if (!expected) {
      return 'HOLD_ALLOWLIST_FILE_MISMATCH';
    }
    const digest = computeAllowlistFileDigest(trustedRootRealpath, relativePath);
    if (digest !== expected) {
      return 'HOLD_ALLOWLIST_FILE_MISMATCH';
    }
  }
  return null;
}

export function resolveConfinedManifestPath(repoRoot: string): string {
  const trustedRoot = resolveTrustedRepositoryRoot(repoRoot);
  return resolveConfinedAllowlistRegularFile(trustedRoot, R7_OFFLINE_MANIFEST_RELATIVE_PATH);
}

function assertNoUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): R7D1D5OfflinePlanHoldCode | null {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      return 'HOLD_MANIFEST_UNKNOWN_KEY';
    }
  }
  return null;
}

function deepEqualJson(a: unknown, b: unknown): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

export function validateHistoryProvenanceAgainstFrozenSnapshot(
  manifest: R7D1D5OfflineManifest,
): R7D1D5OfflinePlanHoldCode | null {
  const hp = manifest.historyProvenance;
  if (hp.recordsCanonicalDigestSha256 !== INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256) {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  if (hp.rowCount !== 16) {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  if (hp.observedAtJst !== '2026-10-11') {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  const executionHp = manifest.executionStartHistoryProvenance;
  if (executionHp.rowCount !== 17) {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  if (
    executionHp.recordsCanonicalDigestSha256 !==
    verifyIndependentHistoryObservationDigest(FRESH_EXECUTION_START_HISTORY_SNAPSHOT)
  ) {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  if (executionHp.attestationClass !== 'LOCAL_OPERATOR_READ_ONLY_OBSERVATION_NOT_INDEPENDENTLY_REVIEWED') {
    return 'HOLD_HISTORY_PROVENANCE_MISMATCH';
  }
  if (!deepEqualJson(manifest.startingHistoryPrefix, FRESH_EXECUTION_START_HISTORY_SNAPSHOT)) {
    return 'HOLD_HISTORY_PREFIX_ORDER_DRIFT';
  }
  return null;
}

export function validateManifestPayloadStrict(
  parsed: unknown,
  expected: R7D1D5OfflineManifest,
): R7D1D5OfflinePlanHoldCode | null {
  if (!parsed || typeof parsed !== 'object') {
    return 'HOLD_MANIFEST_SCHEMA_DRIFT';
  }
  const root = parsed as Record<string, unknown>;
  const rootKeys = [
    'identifier',
    'manifestSchemaVersion',
    'offlineAllowlistBundleIntegrity',
    'repository',
    'previewTarget',
    'historyProvenance',
    'executionStartHistoryProvenance',
    'authorization',
    'prohibitedOperations',
    'startingHistoryPrefix',
    'steps',
  ];
  const unknownRoot = assertNoUnknownKeys(root, rootKeys, 'root');
  if (unknownRoot) return unknownRoot;

  if (!deepEqualJson(parsed, expected)) {
    return 'HOLD_MANIFEST_SCHEMA_DRIFT';
  }
  return null;
}

export function parseMigrationFilename(relativePath: string): { version: string; name: string } {
  const file = basename(relativePath);
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  if (!match) {
    throw new Error('HOLD_MIGRATION_FILENAME_MISMATCH');
  }
  return { version: match[1], name: match[2] };
}

export function deriveNormalizedStatementsFromSourceBytes(
  rawBytes: Buffer,
  expectedSource: R7DeltaSourceIdentity,
): { statements: readonly string[]; normalized: R7DeltaNormalizedIdentity } {
  const { text } = validateMigrationSourceBytes(rawBytes, expectedSource.sourceSha256, expectedSource.stepId);
  if (rawBytes.length !== expectedSource.bytes) {
    throw new Error('HOLD_SOURCE_BYTES_MISMATCH');
  }
  const statements = splitAndTrim(text);
  if (statements.length !== expectedSource.sourceStatementCount) {
    throw new Error('HOLD_SOURCE_STATEMENT_COUNT_MISMATCH');
  }
  const normalizedStreamCompositeSha256 = compositeStreamSha256(statements);
  return {
    statements,
    normalized: {
      normalizationMethod: R7_D1_D5_NORMALIZATION_METHOD,
      optionAPolicy: R7_D1_D5_OPTION_A_POLICY,
      normalizedStatementCount: statements.length,
      normalizedStreamCompositeSha256,
      serialization: STATEMENT_STREAM_SERIALIZATION,
    },
  };
}

export function buildPolicy2HistoryPayloadForDelta(
  source: R7DeltaSourceIdentity,
  normalizedStatements: readonly string[],
): Policy2HistoryPayload {
  const composite = compositeStreamSha256(normalizedStatements);
  return {
    version: source.version,
    name: source.name,
    statements: [...normalizedStatements],
    serialization: STATEMENT_STREAM_SERIALIZATION,
    normalizedStreamCompositeSha256: composite,
  };
}

export function insertMigrationHistoryEntrySorted(
  prefix: readonly MigrationHistoryEntry[],
  entry: MigrationHistoryEntry,
): MigrationHistoryEntry[] {
  const combined: MigrationHistoryEntry[] = [...prefix, entry];
  return combined.sort((a, b) => a.version.localeCompare(b.version, 'en'));
}

export function sortedMigrationHistoryVersionTail(prefix: readonly MigrationHistoryEntry[]): string {
  if (prefix.length === 0) {
    throw new Error('HOLD_EMPTY_HISTORY_PREFIX');
  }
  let highest = prefix[0].version;
  for (const row of prefix) {
    if (row.version.localeCompare(highest, 'en') > 0) {
      highest = row.version;
    }
  }
  return highest;
}

const EXECUTION_START_HISTORY_PROVENANCE_LIMITATIONS: readonly string[] = [
  'This is a local operator read-only observation for current execution-start planning only; it is not independent external review.',
  'Sorted highest migration version in a prefix is not evidence of the most recently executed migration step when older R7 versions are inserted after a newer ledger row already exists.',
  'Before any live R7 apply, repeat read-only history and catalog verification; do not assume this snapshot stays current.',
] as const;

export function buildHistoryProvenanceMetadata(): HistoryProvenanceMetadata {
  return {
    evidenceType: 'M55_R7_PR249_PREVIEW_MIGRATION_HISTORY_OBSERVATION',
    observedAtJst: '2026-10-11',
    sourceKind: 'CONNECTED_SUPABASE_LIST_MIGRATIONS_READ_ONLY',
    projectName: R7_PREVIEW_TARGET_PROJECT,
    projectId: R7_PREVIEW_TARGET_PROJECT_REF,
    rowCount: 16,
    recordsCanonicalDigestSha256: INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256,
    orderPolicy: 'AS_RETURNED_BY_LIST_MIGRATIONS',
    limitations: [...HISTORY_PROVENANCE_LIMITATIONS],
  };
}

export function buildExecutionStartHistoryProvenanceMetadata(): ExecutionStartHistoryProvenanceMetadata {
  return {
    evidenceType: 'M55_R7_PR249_PREVIEW_EXECUTION_START_HISTORY_OBSERVATION',
    observedAtJst: '2026-10-24',
    sourceKind: 'CONNECTED_SUPABASE_LIST_MIGRATIONS_READ_ONLY',
    attestationClass: 'LOCAL_OPERATOR_READ_ONLY_OBSERVATION_NOT_INDEPENDENTLY_REVIEWED',
    projectName: R7_PREVIEW_TARGET_PROJECT,
    projectId: R7_PREVIEW_TARGET_PROJECT_REF,
    rowCount: 17,
    recordsCanonicalDigestSha256: verifyIndependentHistoryObservationDigest(
      FRESH_EXECUTION_START_HISTORY_SNAPSHOT,
    ),
    orderPolicy: 'VERSION_TEXT_ASCENDING',
    preappliedPairLedgerVersion: '20261008200000',
    preappliedPairLedgerName: 'm55_pair_p5_dedicated_receipt_one_use_ledger_v1',
    limitations: [...EXECUTION_START_HISTORY_PROVENANCE_LIMITATIONS],
  };
}

export function buildCanonicalExpectedManifest(repoRoot: string): R7D1D5OfflineManifest {
  const steps: R7DeltaStepPlan[] = [];
  let rollingPrefix: MigrationHistoryEntry[] = [...FRESH_EXECUTION_START_HISTORY_SNAPSHOT];

  for (const sourceSpec of FROZEN_DELTA_SOURCE_SPECS) {
    const absPath = join(repoRoot, sourceSpec.relativePath);
    if (!existsSync(absPath)) {
      throw new Error('HOLD_SOURCE_PATH_MISSING');
    }
    const parsed = parseMigrationFilename(sourceSpec.relativePath);
    if (parsed.version !== sourceSpec.version || parsed.name !== sourceSpec.name) {
      throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
    }

    const rawBytes = readFileSync(absPath);
    const { normalized } = deriveNormalizedStatementsFromSourceBytes(rawBytes, sourceSpec);
    const prior = [...rollingPrefix];
    const post = insertMigrationHistoryEntrySorted(prior, {
      version: sourceSpec.version,
      name: sourceSpec.name,
    });

    steps.push({
      stepId: sourceSpec.stepId,
      source: sourceSpec,
      normalized,
      historyPrefixPrior: prior,
      historyPrefixPost: post,
      catalogProbes: CATALOG_PROBE_BINDINGS[sourceSpec.stepId],
      historyInsertShape: HISTORY_INSERT_SQL_METADATA,
    });

    rollingPrefix = post;
  }

  const trustedRoot = resolveTrustedRepositoryRoot(repoRoot);

  return {
    identifier: R7_D1_D5_MANIFEST_IDENTIFIER,
    manifestSchemaVersion: R7_D1_D5_MANIFEST_SCHEMA_VERSION,
    offlineAllowlistBundleIntegrity: {
      digestType: 'SHA256_FILE_BYTES',
      files: computeOfflineAllowlistFileDigests(trustedRoot),
    },
    repository: {
      root: R7_PR249_FROZEN_REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      reviewedBaseAncestorSha: R7_PR249_REVIEWED_BASE_ANCESTOR_SHA,
    },
    previewTarget: {
      organization: 'm55-preview',
      project: R7_PREVIEW_TARGET_PROJECT,
      projectRef: R7_PREVIEW_TARGET_PROJECT_REF,
    },
    historyProvenance: buildHistoryProvenanceMetadata(),
    executionStartHistoryProvenance: buildExecutionStartHistoryProvenanceMetadata(),
    authorization: {
      executionAuthorized: false,
      databaseMutationAuthorized: false,
      remoteReady: false,
      remoteConnectionAttempted: false,
    },
    prohibitedOperations: [...R7_D1_D5_PROHIBITED_OPERATIONS],
    startingHistoryPrefix: [...FRESH_EXECUTION_START_HISTORY_SNAPSHOT],
    steps,
  };
}

export const FRESH_EXECUTION_START_HISTORY_OBSERVATION_DIGEST_SHA256 =
  verifyIndependentHistoryObservationDigest(FRESH_EXECUTION_START_HISTORY_SNAPSHOT);

/** @deprecated alias */
export const buildR7D1D5OfflineManifest = buildCanonicalExpectedManifest;

export type EvaluateR7D1D5OfflinePlanInput = {
  readonly repoRoot: string;
  readonly workspace: WorkspaceGitObservation;
  readonly manifestOnDisk: unknown;
};

function hold(code: R7D1D5OfflinePlanHoldCode): R7D1D5OfflinePlanHold {
  return { mode: 'R7_D1_D5_OFFLINE_HOLD', holdReasonCode: code };
}

export function evaluateR7D1D5OfflinePlan(input: EvaluateR7D1D5OfflinePlanInput): R7D1D5OfflinePlanResult {
  try {
    const canonicalRoot = realpathSync(input.repoRoot);
    if (canonicalRoot !== R7_PR249_FROZEN_REPO_ROOT) {
      return hold('HOLD_REPO_IDENTITY_MISMATCH');
    }
    if (input.workspace.repoRoot !== canonicalRoot) {
      return hold('HOLD_REPO_IDENTITY_MISMATCH');
    }
    if (input.workspace.branch !== R7_PR249_FROZEN_BRANCH) {
      return hold('HOLD_BRANCH_MISMATCH');
    }

    if (detectCommittedCandidateWorkspacePattern(input.workspace)) {
      return hold('HOLD_COMMITTED_CANDIDATE_REQUIRES_EXTERNAL_BINDING');
    }

    const stage = classifyOfflineWorkspaceStage(input.workspace);
    if (stage !== 'FOUR_FILE_UNTRACKED_AUDIT') {
      return hold('HOLD_WORKSPACE_STAGE_MISMATCH');
    }

    const versions = new Set<string>();
    for (const spec of FROZEN_DELTA_SOURCE_SPECS) {
      if (versions.has(spec.version)) {
        return hold('HOLD_DUPLICATE_DELTA_VERSION');
      }
      versions.add(spec.version);
    }

    const expected = buildCanonicalExpectedManifest(canonicalRoot);
    const provenanceHold = validateHistoryProvenanceAgainstFrozenSnapshot(expected);
    if (provenanceHold) {
      return hold(provenanceHold);
    }

    const manifestHold = validateManifestPayloadStrict(input.manifestOnDisk, expected);
    if (manifestHold) {
      return hold(manifestHold);
    }

    const manifest = input.manifestOnDisk as R7D1D5OfflineManifest;
    const allowlistIntegrityHold = verifyAllowlistFileIntegrity(
      canonicalRoot,
      manifest.offlineAllowlistBundleIntegrity,
    );
    if (allowlistIntegrityHold) {
      return hold(allowlistIntegrityHold);
    }
    const manifestPayloadSha256 = sha256Utf8Json(manifest);

    return {
      mode: 'READY_FOR_INDEPENDENT_DELTA_REVIEW',
      holdReasonCode: null,
      offlineWorkspaceStage: stage,
      manifest,
      manifestPayloadSha256,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('HOLD_GIT')) return hold('HOLD_GIT_OBSERVATION_FAILED');
    if (message.includes('HOLD_MANIFEST_PATH')) return hold('HOLD_MANIFEST_PATH_VIOLATION');
    if (message.includes('SOURCE_SHA_MISMATCH')) return hold('HOLD_SOURCE_SHA_MISMATCH');
    if (message.includes('HOLD_SOURCE_BYTES_MISMATCH')) return hold('HOLD_SOURCE_BYTES_MISMATCH');
    if (message.includes('HOLD_SOURCE_STATEMENT_COUNT_MISMATCH')) {
      return hold('HOLD_SOURCE_STATEMENT_COUNT_MISMATCH');
    }
    if (message.includes('HOLD_MIGRATION')) return hold('HOLD_SOURCE_SHA_MISMATCH');
    return hold('HOLD_UNEXPECTED_INTERNAL');
  }
}

export function verifyIndependentHistoryObservationDigest(history: readonly MigrationHistoryEntry[]): string {
  const payload = history.map((row) => ({ name: row.name, version: row.version }));
  return createHash('sha256').update(Buffer.from(canonicalJsonStringify(payload), 'utf8')).digest('hex');
}
