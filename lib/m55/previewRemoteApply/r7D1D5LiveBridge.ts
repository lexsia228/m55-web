import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  FORBIDDEN_PRODUCTION_ORGANIZATION,
  FORBIDDEN_PRODUCTION_PROJECT,
} from './types.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  EXPECTED_DATABASE_NAME,
  EXPECTED_CURRENT_USER,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  POST_CONNECT_GUARD_BINDING,
  POST_CONNECT_GUARD_SQL,
  REMOTE_CONNECTION_AUTHORITY_ID,
  REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  TLS_TRUST_PROFILE,
  expectedConnectionUserForProjectRef,
} from './remoteConnectionAuthority.ts';
import { R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID } from './r7D1D5ExecutionAuthorization.ts';
import {
  branchAfterCommitResponseClass,
  type AckStateIdentifier,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';
import type { CredentialMethodId } from './types.ts';
import {
  buildCanonicalExpectedManifest,
  deriveNormalizedStatementsFromSourceBytes,
  buildPolicy2HistoryPayloadForDelta,
  type ExternalReviewedCandidateBinding,
  type MigrationHistoryEntry,
  type R7DeltaStepId,
  R7_PREVIEW_TARGET_PROJECT,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import {
  validateR7ExecutionAuthorizationGate,
  type R7HumanExecutionAuthorizationDocument,
} from './r7D1D5ExecutionAuthorization.ts';
import {
  getR7RuntimeProbeDefinition,
  validateR7RuntimeProbeResult,
  type R7RuntimeProbeId,
} from './r7D1D5RuntimeProbes.ts';
import {
  R7_DELTA_STEP_ORDER,
  type R7ExecutionLifecycleStage,
  type R7PostCommitCatalogVerificationState,
  type R7PostCommitVerificationState,
  type R7RemoteExecutionPublicEvidence,
} from './r7D1D5RemoteExecution.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

/** Human execution authorization for live D1–D5 apply is not issued in this gate. */
export const R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED = false as const;

export const R7_LIVE_BRIDGE_IMPLEMENTATION_MODE = 'LOCAL_INJECTED_PG_SESSION_ONLY' as const;

/** simulationOnly allows injected sessions in tests; it is not proof that network access is impossible. */
export const R7_LIVE_BRIDGE_LOCAL_MOCK_BOUNDARY_NOTE =
  'SIMULATION_ONLY_DOES_NOT_PROVE_NETWORK_ISOLATION' as const;

/**
 * Injected `beginReadOnly()` / SQL recording in mocks does not prove PostgreSQL read-only mode,
 * isolation level, or physical connection distinctness. Real transport proof requires a separately
 * authorized live gate; local simulation is not LIVE READY.
 */
export const R7_LIVE_BRIDGE_READONLY_MOCK_HONESTY_NOTE =
  'MOCK_BEGIN_READONLY_DOES_NOT_PROVE_POSTGRES_READ_ONLY_ISOLATION_OR_DISTINCT_CONNECTION' as const;

export const R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN = true as const;

/**
 * Advisory xact lock coordinates cooperating D1–D5 executors only.
 * It does not exclude unrelated migration writers (CLI, SQL editor, other tools).
 */
export const R7_D1_D5_MIGRATION_COORDINATION_LOCK_DISCLAIMER =
  'ADVISORY_XACT_LOCK_DOES_NOT_BLOCK_UNRELATED_MIGRATION_WRITERS' as const;

export const R7_D1_D5_MIGRATION_COORDINATION_LOCK_KEY1 = 0x4d355f52 as const; // M5_R
export const R7_D1_D5_MIGRATION_COORDINATION_LOCK_KEY2 = 0x375f4431 as const; // 7_D1

export const R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL =
  'SELECT pg_try_advisory_xact_lock($1::int, $2::int) AS lock_acquired;' as const;

export const R7_D1_D5_MIGRATION_COORDINATION_LOCK_PARAMS: readonly [number, number] = [
  R7_D1_D5_MIGRATION_COORDINATION_LOCK_KEY1,
  R7_D1_D5_MIGRATION_COORDINATION_LOCK_KEY2,
] as const;

export const R7_LIVE_BRIDGE_HISTORY_READONLY_SELECT_SQL =
  'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC' as const;

/** Fresh post-commit verification must establish an explicit read-only transaction. */
export const R7_LIVE_BRIDGE_READONLY_TX_SQL = 'BEGIN READ ONLY' as const;

export type R7LiveBridgeHoldCode =
  | 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED'
  | 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN'
  | 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH'
  | 'HOLD_PRODUCTION_TARGET_FORBIDDEN'
  | 'HOLD_REPO_IDENTITY_MISMATCH'
  | 'HOLD_PREVIEW_TARGET_MISMATCH'
  | 'HOLD_STEP_NOT_FOUND'
  | 'HOLD_SOURCE_DIGEST_MISMATCH'
  | 'HOLD_AUTHORIZATION_GATE'
  | 'HOLD_MIGRATION_COORDINATION_LOCK_UNAVAILABLE'
  | 'HOLD_MIGRATION_COORDINATION_LOCK_QUERY_FAILED'
  | 'HOLD_TRANSACTION_BEGIN_FAILED'
  | 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN'
  | 'HOLD_SESSION_CLOSE_FAILED'
  | 'HOLD_POST_CONNECT_GUARD_FAILED'
  | 'HOLD_HISTORY_READONLY_QUERY_FAILED'
  | 'HOLD_HISTORY_PREFIX_MISMATCH'
  | 'HOLD_PROBE_QUERY_FAILED'
  | 'HOLD_PRE_PROBE_FAILED'
  | 'HOLD_PRE_COMMIT_FAILURE_ROLLBACK'
  | 'HOLD_HISTORY_INSERT_QUERY_FAILED'
  | 'HOLD_POST_PROBE_FAILED'
  | 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP'
  | 'HOLD_POST_COMMIT_VERIFICATION_FAILED'
  | 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE'
  | 'HOLD_FRESH_READONLY_CLASSIFICATION_CONTRADICTORY'
  | 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED'
  | 'HOLD_FRESH_SESSION_NOT_DISTINCT'
  | 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED'
  | 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING';

export type R7LiveBridgePgQueryResult = {
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number;
};

export type R7LiveBridgePgSession = {
  connect(): Promise<void>;
  query(sql: string, params?: readonly unknown[]): Promise<R7LiveBridgePgQueryResult>;
  begin(): Promise<void>;
  beginReadOnly(): Promise<void>;
  commit(): Promise<{ readonly responseClass: CommitResponseClass }>;
  rollback(): Promise<{ readonly acknowledged: boolean }>;
  close(): Promise<void>;
};

export type R7LiveBridgeFreshAckClassifierInput = {
  readonly stepId: R7DeltaStepId;
  readonly commitResponseClass: CommitResponseClass;
  /** Observed only from an independent post-COMMIT readonly session. */
  readonly freshHistoryVersions: readonly string[];
  readonly freshReadonlySession: R7LiveBridgePgSession;
  readonly expectedPriorPrefix: readonly MigrationHistoryEntry[];
  readonly expectedPostPrefix: readonly MigrationHistoryEntry[];
  readonly repoRoot: string;
  readonly postProbeId: R7RuntimeProbeId;
};

export type R7LiveBridgeFreshAckClassifier = {
  classify(
    input: R7LiveBridgeFreshAckClassifierInput,
  ): Promise<{ readonly ackState: AckStateIdentifier } | { readonly holdReasonCode: R7LiveBridgeHoldCode }>;
};

export type R7LiveBridgeFreshCatalogVerificationResult =
  | { readonly ok: true; readonly catalogState: 'VERIFIED' }
  | { readonly ok: true; readonly catalogState: 'PENDING_FRESH_READONLY_CATALOG' }
  | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode };

export type R7LiveBridgeFreshPriorCatalogVerificationResult =
  | { readonly ok: true; readonly priorCatalogConsistent: true }
  | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode };

export type R7LiveBridgeFreshReadonlyVerification = {
  verifyPostCommitCatalog(input: {
    readonly stepId: R7DeltaStepId;
    readonly session: R7LiveBridgePgSession;
    readonly repoRoot: string;
    readonly postProbeId: R7RuntimeProbeId;
  }): Promise<R7LiveBridgeFreshCatalogVerificationResult>;
  /**
   * Independent fresh-session prior catalog comparator for DEFINITELY_NOT_COMMITTED ACK.
   * History prefix alone is insufficient; absent a trusted production implementation, reject definitive non-commit.
   */
  verifyFreshPriorCatalogState(input: {
    readonly stepId: R7DeltaStepId;
    readonly session: R7LiveBridgePgSession;
    readonly repoRoot: string;
    readonly preProbeId: R7RuntimeProbeId;
  }): Promise<R7LiveBridgeFreshPriorCatalogVerificationResult>;
};

export type R7LiveBridgeInjectedDeps = {
  readonly implementationMode: typeof R7_LIVE_BRIDGE_IMPLEMENTATION_MODE;
  /** Local gate: injected session simulation only; never opens ambient `pg` connections. */
  readonly simulationOnly: true;
  readonly transactionSession: R7LiveBridgePgSession;
  readonly freshReadonlySessionFactory: () => R7LiveBridgePgSession;
  readonly freshAckClassifier: R7LiveBridgeFreshAckClassifier;
  readonly freshReadonlyVerification: R7LiveBridgeFreshReadonlyVerification;
};

export type R7LiveBridgeTargetObservedFacts = {
  readonly organizationSlug: string;
  readonly projectName: string;
  readonly projectRef: string;
  readonly databaseName: string;
  readonly host: string;
  readonly hostFingerprintSha256: string;
  readonly port: number;
  readonly sslmode: string;
  readonly connectionUser: string;
  readonly credentialMethod: CredentialMethodId;
  readonly tlsTrustProfile: typeof TLS_TRUST_PROFILE;
};

export type R7LiveBridgeCliResult =
  | {
      readonly mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD';
      readonly holdReasonCode: string;
      readonly evidence: R7RemoteExecutionPublicEvidence | null;
    }
  | {
      readonly mode: 'R7_D1_D5_LIVE_BRIDGE_OUTCOME';
      readonly evidence: R7RemoteExecutionPublicEvidence;
    };

export type ExecuteR7LiveBridgeInput = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly stepId: R7DeltaStepId;
  readonly reviewedCandidateBinding: ExternalReviewedCandidateBinding | null;
  readonly humanAuthorization: R7HumanExecutionAuthorizationDocument | null;
  readonly offlineManifestExecutionAuthorized: boolean;
  readonly remoteExecutionAuthorized: boolean;
  readonly targetObserved: R7LiveBridgeTargetObservedFacts;
  readonly deps: R7LiveBridgeInjectedDeps;
};

function tailVersion(prefix: readonly MigrationHistoryEntry[]): string {
  if (prefix.length === 0) throw new Error('HOLD_EMPTY_HISTORY_PREFIX');
  return prefix[prefix.length - 1].version;
}

function historyVersionsMatchPrefix(
  observed: readonly string[],
  expected: readonly MigrationHistoryEntry[],
): boolean {
  if (observed.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (observed[i] !== expected[i].version) return false;
  }
  return true;
}

async function readHistoryVersions(session: R7LiveBridgePgSession): Promise<string[]> {
  const result = await session.query(R7_LIVE_BRIDGE_HISTORY_READONLY_SELECT_SQL);
  const versions: string[] = [];
  for (const row of result.rows) {
    const version = row.version;
    if (typeof version !== 'string') {
      throw new Error('HOLD_HISTORY_READONLY_SHAPE_MISMATCH');
    }
    versions.push(version);
  }
  return versions;
}

function wrapProbeSql(probeId: R7RuntimeProbeId, phase: 'pre' | 'post', sql: string): string {
  return `-- R7_PROBE_ID:${probeId}\n-- R7_PROBE_PHASE:${phase}\n${sql}`;
}

function holdEvidence(
  stepId: R7DeltaStepId,
  lifecycle: R7ExecutionLifecycleStage[],
  code: R7LiveBridgeHoldCode | string,
  preProbeId: R7RuntimeProbeId,
  postProbeId: R7RuntimeProbeId,
  options: {
    readonly statementCount?: number;
    readonly commitResponseClass?: CommitResponseClass | null;
  } = {},
): R7RemoteExecutionPublicEvidence {
  return {
    stepId,
    lifecycleStages: lifecycle,
    statementCount: options.statementCount ?? 0,
    preProbeId,
    postProbeId,
    commitResponseClass: options.commitResponseClass ?? null,
    ackState: null,
    postCommitVerificationState: null,
    postCommitCatalogVerificationState: null,
    outcome: 'HOLD',
    holdReasonCode: code,
  };
}

/** Public catalog evidence stays pending until a separately authorized production verifier exists. */
function resolvePublicCatalogVerificationState(
  _verify: R7LiveBridgeFreshCatalogVerificationResult,
): R7PostCommitCatalogVerificationState {
  return 'PENDING_FRESH_READONLY_CATALOG';
}

async function validateTransactionPostConnectGuard(
  session: R7LiveBridgePgSession,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode }> {
  let guardResult: R7LiveBridgePgQueryResult;
  try {
    guardResult = await session.query(POST_CONNECT_GUARD_SQL);
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_POST_CONNECT_GUARD_FAILED' };
  }
  if (!validateR7LiveBridgePostConnectGuardResult(guardResult)) {
    return { ok: false, holdReasonCode: 'HOLD_POST_CONNECT_GUARD_FAILED' };
  }
  return { ok: true };
}

async function evaluateTrustedFreshAckFromClassifier(
  input: ExecuteR7LiveBridgeInput,
  classifierAck: AckStateIdentifier,
  freshHistory: readonly string[],
  freshSession: R7LiveBridgePgSession,
  stepPlan: {
    readonly historyPrefixPrior: readonly MigrationHistoryEntry[];
    readonly historyPrefixPost: readonly MigrationHistoryEntry[];
  },
  preProbeId: R7RuntimeProbeId,
  postProbeId: R7RuntimeProbeId,
): Promise<
  { readonly ok: true; readonly ackState: AckStateIdentifier } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode }
> {
  if (classifierAck === 'DEFINITELY_COMMITTED') {
    if (!historyVersionsMatchPrefix(freshHistory, stepPlan.historyPrefixPost)) {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    }
    const postProbeSql = getR7RuntimeProbeDefinition(input.repoRoot, postProbeId).sqlText;
    try {
      const postRow = await freshSession.query(wrapProbeSql(postProbeId, 'post', postProbeSql));
      const postValidation = validateR7RuntimeProbeResult(postProbeId, postRow.rows[0]);
      if (!postValidation.ok) {
        return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
      }
    } catch {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    }
    return { ok: true, ackState: 'DEFINITELY_COMMITTED' };
  }
  if (classifierAck === 'DEFINITELY_NOT_COMMITTED') {
    if (!historyVersionsMatchPrefix(freshHistory, stepPlan.historyPrefixPrior)) {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    }
    let priorCatalogVerify: R7LiveBridgeFreshPriorCatalogVerificationResult;
    try {
      priorCatalogVerify = await input.deps.freshReadonlyVerification.verifyFreshPriorCatalogState({
        stepId: input.stepId,
        session: freshSession,
        repoRoot: input.repoRoot,
        preProbeId,
      });
    } catch {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    }
    if (!priorCatalogVerify.ok) {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    }
    // Mock-only gate: injected prior-catalog success is never production-backed evidence.
    return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
  }
  return { ok: true, ackState: classifierAck };
}

/** Declared pre-connect target facts only; live DB identity requires POST_CONNECT_GUARD on a fresh session. */
export function validateR7LiveBridgeNonsecretTargetBinding(
  input: ExecuteR7LiveBridgeInput,
): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode } {
  const preview = validateR7LiveBridgePreviewTargetBinding(input.targetObserved);
  if (!preview.ok) return preview;

  if (!R7_DELTA_STEP_ORDER.includes(input.stepId)) {
    return { ok: false, holdReasonCode: 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH' };
  }
  if (input.repoRoot !== R7_PR249_FROZEN_REPO_ROOT || input.branch !== R7_PR249_FROZEN_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  if (input.targetObserved.credentialMethod !== 'SECURE_STDIN_CONNECTION_CONFIG_v1') {
    return { ok: false, holdReasonCode: 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH' };
  }
  if (
    input.humanAuthorization &&
    input.humanAuthorization.documentId !== R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID
  ) {
    return { ok: false, holdReasonCode: 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH' };
  }
  return { ok: true };
}

export function validateR7LiveBridgePostConnectGuardResult(
  result: R7LiveBridgePgQueryResult,
): boolean {
  if (result.rowCount !== POST_CONNECT_GUARD_BINDING.expected.row_count) {
    return false;
  }
  if (result.rows.length !== 1) {
    return false;
  }
  const row = result.rows[0];
  if (!row || typeof row !== 'object') {
    return false;
  }
  const keys = Object.keys(row);
  if (keys.length !== 2) {
    return false;
  }
  if (!keys.includes('current_database_name') || !keys.includes('current_user_name')) {
    return false;
  }
  const databaseName = row.current_database_name;
  const userName = row.current_user_name;
  if (typeof databaseName !== 'string' || typeof userName !== 'string') {
    return false;
  }
  return (
    databaseName === POST_CONNECT_GUARD_BINDING.expected.current_database_name &&
    userName === POST_CONNECT_GUARD_BINDING.expected.current_user_name &&
    databaseName === EXPECTED_DATABASE_NAME &&
    userName === EXPECTED_CURRENT_USER
  );
}

export function validateR7LiveBridgePreviewTargetBinding(
  facts: R7LiveBridgeTargetObservedFacts,
): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode } {
  if (
    facts.organizationSlug === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    facts.projectName === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return { ok: false, holdReasonCode: 'HOLD_PRODUCTION_TARGET_FORBIDDEN' };
  }
  if (
    facts.organizationSlug !== APPROVED_PREVIEW_ORGANIZATION ||
    facts.projectName !== APPROVED_PREVIEW_PROJECT ||
    facts.projectRef !== APPROVED_PREVIEW_PROJECT_REF ||
    facts.databaseName !== EXPECTED_DATABASE_NAME ||
    facts.host !== SESSION_POOLER_HOST ||
    facts.hostFingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256 ||
    facts.port !== EXPECTED_PORT ||
    facts.sslmode !== EXPECTED_SSLMODE ||
    facts.connectionUser !== expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF) ||
    facts.tlsTrustProfile !== TLS_TRUST_PROFILE
  ) {
    return { ok: false, holdReasonCode: 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH' };
  }
  return { ok: true };
}

export function assertR7LiveBridgeRuntimeAuthorization(
  remoteExecutionAuthorized: boolean,
  simulationOnly: boolean,
): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode } {
  if (simulationOnly) {
    if (!remoteExecutionAuthorized) {
      return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
    }
    return { ok: true };
  }
  if (!remoteExecutionAuthorized || !R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
  }
  return { ok: true };
}

async function tryAcquireMigrationCoordinationLock(
  session: R7LiveBridgePgSession,
): Promise<boolean> {
  const result = await session.query(R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL, [
    ...R7_D1_D5_MIGRATION_COORDINATION_LOCK_PARAMS,
  ]);
  if (result.rows.length !== 1) return false;
  const acquired = result.rows[0].lock_acquired;
  return acquired === true;
}

async function safeCloseSession(session: R7LiveBridgePgSession): Promise<R7LiveBridgeHoldCode | null> {
  try {
    await session.close();
    return null;
  } catch {
    return 'HOLD_SESSION_CLOSE_FAILED';
  }
}

async function safeEndTransactionalSession(
  session: R7LiveBridgePgSession,
  options: { readonly attemptRollback: boolean; readonly possiblyCommitted: boolean },
): Promise<R7LiveBridgeHoldCode | null> {
  if (!options.possiblyCommitted && options.attemptRollback) {
    try {
      const rollback = await session.rollback();
      if (!rollback.acknowledged) {
        await safeCloseSession(session);
        return 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN';
      }
    } catch {
      await safeCloseSession(session);
      return 'HOLD_TRANSACTION_CLEANUP_UNCERTAIN';
    }
  }
  return await safeCloseSession(session);
}

type FreshReadonlySessionOpenResult =
  | { readonly ok: true; readonly session: R7LiveBridgePgSession }
  | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode };

async function failFreshSessionOpenAfterCleanup(
  session: R7LiveBridgePgSession,
  primaryHoldReasonCode: R7LiveBridgeHoldCode,
): Promise<FreshReadonlySessionOpenResult> {
  const closeHold = await safeCloseSession(session);
  if (closeHold) {
    return { ok: false, holdReasonCode: closeHold };
  }
  return { ok: false, holdReasonCode: primaryHoldReasonCode };
}

async function openFreshReadonlySessionWithGuard(
  factory: () => R7LiveBridgePgSession,
  options: { readonly distinctFrom?: R7LiveBridgePgSession } = {},
): Promise<FreshReadonlySessionOpenResult> {
  let session: R7LiveBridgePgSession;
  try {
    session = factory();
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE' };
  }
  if (options.distinctFrom !== undefined && session === options.distinctFrom) {
    return { ok: false, holdReasonCode: 'HOLD_FRESH_SESSION_NOT_DISTINCT' };
  }
  try {
    await session.connect();
  } catch {
    return await failFreshSessionOpenAfterCleanup(
      session,
      'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE',
    );
  }
  let guardResult: R7LiveBridgePgQueryResult;
  try {
    guardResult = await session.query(POST_CONNECT_GUARD_SQL);
  } catch {
    return await failFreshSessionOpenAfterCleanup(session, 'HOLD_POST_CONNECT_GUARD_FAILED');
  }
  if (!validateR7LiveBridgePostConnectGuardResult(guardResult)) {
    return await failFreshSessionOpenAfterCleanup(session, 'HOLD_POST_CONNECT_GUARD_FAILED');
  }
  try {
    await session.beginReadOnly();
  } catch {
    return await failFreshSessionOpenAfterCleanup(
      session,
      'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED',
    );
  }
  return { ok: true, session };
}

async function resolveUncertainCommitWithFreshEvidence(
  input: ExecuteR7LiveBridgeInput,
  lifecycle: R7ExecutionLifecycleStage[],
  statementCount: number,
  preProbeId: R7RuntimeProbeId,
  postProbeId: R7RuntimeProbeId,
  commitResponseClass: CommitResponseClass,
  stepPlan: { readonly historyPrefixPrior: readonly MigrationHistoryEntry[]; readonly historyPrefixPost: readonly MigrationHistoryEntry[] },
): Promise<R7RemoteExecutionPublicEvidence> {
  const uncertainHold = { statementCount, commitResponseClass };
  const freshOpen = await openFreshReadonlySessionWithGuard(input.deps.freshReadonlySessionFactory, {
    distinctFrom: input.deps.transactionSession,
  });
  if (!freshOpen.ok) {
    return holdEvidence(input.stepId, lifecycle, freshOpen.holdReasonCode, preProbeId, postProbeId, uncertainHold);
  }
  const freshSession = freshOpen.session;
  let freshHistory: string[];
  try {
    freshHistory = await readHistoryVersions(freshSession);
  } catch {
    const closeHold = await safeCloseSession(freshSession);
    if (closeHold) {
      return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, uncertainHold);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE',
      preProbeId,
      postProbeId,
      uncertainHold,
    );
  }
  let classifierResult:
    | { readonly ackState: AckStateIdentifier }
    | { readonly holdReasonCode: R7LiveBridgeHoldCode };
  try {
    classifierResult = await input.deps.freshAckClassifier.classify({
      stepId: input.stepId,
      commitResponseClass,
      freshHistoryVersions: freshHistory,
      freshReadonlySession: freshSession,
      expectedPriorPrefix: stepPlan.historyPrefixPrior,
      expectedPostPrefix: stepPlan.historyPrefixPost,
      repoRoot: input.repoRoot,
      postProbeId,
    });
  } catch {
    const closeHold = await safeCloseSession(freshSession);
    if (closeHold) {
      return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, uncertainHold);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE',
      preProbeId,
      postProbeId,
      uncertainHold,
    );
  }
  if ('holdReasonCode' in classifierResult) {
    const closeHold = await safeCloseSession(freshSession);
    if (closeHold) {
      return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, {
        statementCount,
        commitResponseClass,
      });
    }
    return holdEvidence(input.stepId, lifecycle, classifierResult.holdReasonCode, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass,
    });
  }
  const trustedAck = await evaluateTrustedFreshAckFromClassifier(
    input,
    classifierResult.ackState,
    freshHistory,
    freshSession,
    stepPlan,
    preProbeId,
    postProbeId,
  );
  const closeHold = await safeCloseSession(freshSession);
  if (closeHold) {
    return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass,
    });
  }
  if (!trustedAck.ok) {
    return holdEvidence(input.stepId, lifecycle, trustedAck.holdReasonCode, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass,
    });
  }
  return {
    stepId: input.stepId,
    lifecycleStages: lifecycle,
    statementCount,
    preProbeId,
    postProbeId,
    commitResponseClass,
    ackState: trustedAck.ackState,
    postCommitVerificationState: 'PENDING_FRESH_READONLY_CLASSIFICATION',
    postCommitCatalogVerificationState: 'PENDING_FRESH_READONLY_CATALOG',
    outcome: 'HOLD',
    holdReasonCode: 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP',
  };
}

export async function executeR7DeltaStepLiveBridge(
  input: ExecuteR7LiveBridgeInput,
): Promise<R7RemoteExecutionPublicEvidence> {
  const lifecycle: R7ExecutionLifecycleStage[] = [];
  const log = (stage: R7ExecutionLifecycleStage) => {
    lifecycle.push(stage);
  };

  const defaultPre = 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT' as R7RuntimeProbeId;
  const defaultPost = 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT' as R7RuntimeProbeId;

  log('TARGET_IDENTITY_CHECK');

  const authSwitch = assertR7LiveBridgeRuntimeAuthorization(
    input.remoteExecutionAuthorized,
    input.deps.simulationOnly === true,
  );
  if (!authSwitch.ok) {
    return holdEvidence(input.stepId, lifecycle, authSwitch.holdReasonCode, defaultPre, defaultPost);
  }

  if (input.deps.implementationMode !== R7_LIVE_BRIDGE_IMPLEMENTATION_MODE) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED', defaultPre, defaultPost);
  }

  if (!input.deps.simulationOnly) {
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN',
      defaultPre,
      defaultPost,
    );
  }

  if (input.repoRoot !== R7_PR249_FROZEN_REPO_ROOT || input.branch !== R7_PR249_FROZEN_BRANCH) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_REPO_IDENTITY_MISMATCH', defaultPre, defaultPost);
  }

  const targetBinding = validateR7LiveBridgePreviewTargetBinding(input.targetObserved);
  if (!targetBinding.ok) {
    return holdEvidence(input.stepId, lifecycle, targetBinding.holdReasonCode, defaultPre, defaultPost);
  }

  const bindingCheck = validateR7LiveBridgeNonsecretTargetBinding(input);
  if (!bindingCheck.ok) {
    return holdEvidence(input.stepId, lifecycle, bindingCheck.holdReasonCode, defaultPre, defaultPost);
  }

  const manifest = buildCanonicalExpectedManifest(input.repoRoot);
  if (
    manifest.previewTarget.project !== R7_PREVIEW_TARGET_PROJECT ||
    manifest.previewTarget.projectRef !== R7_PREVIEW_TARGET_PROJECT_REF
  ) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PREVIEW_TARGET_MISMATCH', defaultPre, defaultPost);
  }

  const stepPlan = manifest.steps.find((s) => s.stepId === input.stepId);
  if (!stepPlan) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_STEP_NOT_FOUND', defaultPre, defaultPost);
  }

  const stepIndex = R7_DELTA_STEP_ORDER.indexOf(input.stepId);
  if (stepIndex < 0) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_STEP_NOT_FOUND', defaultPre, defaultPost);
  }

  const rawBytes = readFileSync(join(input.repoRoot, stepPlan.source.relativePath));
  const { statements, normalized } = deriveNormalizedStatementsFromSourceBytes(rawBytes, stepPlan.source);
  if (normalized.normalizedStreamCompositeSha256 !== stepPlan.normalized.normalizedStreamCompositeSha256) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_SOURCE_DIGEST_MISMATCH', defaultPre, defaultPost);
  }

  const preProbeId = stepPlan.catalogProbes.preProbeId as R7RuntimeProbeId;
  const postProbeId = stepPlan.catalogProbes.postProbeId as R7RuntimeProbeId;
  const preProbeSql = getR7RuntimeProbeDefinition(input.repoRoot, preProbeId).sqlText;

  log('AUTHORIZATION_GATE');
  const auth = validateR7ExecutionAuthorizationGate({
    repoRoot: input.repoRoot,
    selectedStepId: input.stepId,
    repositoryRoot: input.repoRoot,
    branch: input.branch,
    headCommitSha: input.headCommitSha,
    reviewedCandidateBinding: input.reviewedCandidateBinding,
    humanAuthorization: input.humanAuthorization,
    sourceSha256: stepPlan.source.sourceSha256,
    normalizedStreamCompositeSha256: stepPlan.normalized.normalizedStreamCompositeSha256,
    preProbeId,
    postProbeId,
    expectedPriorHistoryVersionTail: tailVersion(stepPlan.historyPrefixPrior),
    offlineManifestExecutionAuthorized: input.offlineManifestExecutionAuthorized,
  });
  if (!auth.ok) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_AUTHORIZATION_GATE', preProbeId, postProbeId);
  }

  const session = input.deps.transactionSession;
  let statementCount = 0;

  try {
    await session.connect();
  } catch {
    const closeHold = await safeCloseSession(session);
    if (closeHold) {
      return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN',
      preProbeId,
      postProbeId,
    );
  }

  const transactionGuard = await validateTransactionPostConnectGuard(session);
  if (!transactionGuard.ok) {
    const cleanupHold = await safeCloseSession(session);
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(input.stepId, lifecycle, transactionGuard.holdReasonCode, preProbeId, postProbeId);
  }

  log('BEGIN');
  try {
    await session.begin();
  } catch {
    const cleanupHold = await safeCloseSession(session);
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(input.stepId, lifecycle, 'HOLD_TRANSACTION_BEGIN_FAILED', preProbeId, postProbeId);
  }

  let lockAcquired = false;
  try {
    lockAcquired = await tryAcquireMigrationCoordinationLock(session);
  } catch {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_MIGRATION_COORDINATION_LOCK_QUERY_FAILED',
      preProbeId,
      postProbeId,
    );
  }
  if (!lockAcquired) {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_MIGRATION_COORDINATION_LOCK_UNAVAILABLE',
      preProbeId,
      postProbeId,
    );
  }

  log('HISTORY_PREFIX_CHECK');
  let observedPrefix: string[];
  try {
    observedPrefix = await readHistoryVersions(session);
  } catch {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_HISTORY_READONLY_QUERY_FAILED',
      preProbeId,
      postProbeId,
    );
  }
  if (!historyVersionsMatchPrefix(observedPrefix, stepPlan.historyPrefixPrior)) {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(input.stepId, lifecycle, 'HOLD_HISTORY_PREFIX_MISMATCH', preProbeId, postProbeId);
  }

  log('PRE_PROBE');
  let preRow: R7LiveBridgePgQueryResult;
  try {
    preRow = await session.query(wrapProbeSql(preProbeId, 'pre', preProbeSql));
  } catch {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PROBE_QUERY_FAILED', preProbeId, postProbeId);
  }
  const preValidation = validateR7RuntimeProbeResult(preProbeId, preRow.rows[0]);
  if (!preValidation.ok) {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount: 0,
      preProbeId,
      postProbeId,
      commitResponseClass: null,
      ackState: null,
      postCommitVerificationState: null,
      postCommitCatalogVerificationState: null,
      outcome: 'HOLD',
      holdReasonCode: preValidation.holdReasonCode,
    };
  }

  log('MUTATION_STATEMENTS');
  for (const stmt of statements) {
    try {
      await session.query(stmt);
      statementCount += 1;
    } catch {
      log('PRE_COMMIT_FAILURE_ROLLBACK');
      const cleanupHold = await safeEndTransactionalSession(session, {
        attemptRollback: true,
        possiblyCommitted: false,
      });
      if (cleanupHold) {
        return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
      }
      return {
        stepId: input.stepId,
        lifecycleStages: lifecycle,
        statementCount,
        preProbeId,
        postProbeId,
        commitResponseClass: null,
        ackState: null,
        postCommitVerificationState: null,
        postCommitCatalogVerificationState: null,
        outcome: 'PRE_COMMIT_FAILURE',
        holdReasonCode: 'HOLD_PRE_COMMIT_FAILURE_ROLLBACK',
      };
    }
  }

  log('HISTORY_INSERT');
  const historyPayload = buildPolicy2HistoryPayloadForDelta(stepPlan.source, statements);
  try {
    await session.query(HISTORY_INSERT_SQL_METADATA, [
      historyPayload.version,
      historyPayload.statements,
      historyPayload.name,
    ]);
  } catch {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_HISTORY_INSERT_QUERY_FAILED',
      preProbeId,
      postProbeId,
    );
  }

  log('POST_PROBE');
  const postProbeSql = getR7RuntimeProbeDefinition(input.repoRoot, postProbeId).sqlText;
  let postRow: R7LiveBridgePgQueryResult;
  try {
    postRow = await session.query(wrapProbeSql(postProbeId, 'post', postProbeSql));
  } catch {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PROBE_QUERY_FAILED', preProbeId, postProbeId);
  }
  const postValidation = validateR7RuntimeProbeResult(postProbeId, postRow.rows[0]);
  if (!postValidation.ok) {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId);
    }
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount,
      preProbeId,
      postProbeId,
      commitResponseClass: null,
      ackState: null,
      postCommitVerificationState: null,
      postCommitCatalogVerificationState: null,
      outcome: 'PRE_COMMIT_FAILURE',
      holdReasonCode: postValidation.holdReasonCode,
    };
  }

  log('COMMIT');
  let commitResult: { responseClass: CommitResponseClass };
  try {
    commitResult = await session.commit();
  } catch {
    log('STOP');
    const closeHold = await safeEndTransactionalSession(session, {
      attemptRollback: false,
      possiblyCommitted: true,
    });
    const uncertainCommitHold = {
      statementCount,
      commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING' as const,
    };
    if (closeHold) {
      return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, uncertainCommitHold);
    }
    return await resolveUncertainCommitWithFreshEvidence(
      input,
      lifecycle,
      statementCount,
      preProbeId,
      postProbeId,
      'ACK_UNCERTAIN_OR_MISSING',
      stepPlan,
    );
  }

  const closeHold = await safeEndTransactionalSession(session, {
    attemptRollback: false,
    possiblyCommitted: commitResult.responseClass === 'DEFINITIVE_COMMIT_ACK',
  });
  if (closeHold) {
    return holdEvidence(input.stepId, lifecycle, closeHold, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    });
  }

  const branch = branchAfterCommitResponseClass({
    responseClass: commitResult.responseClass,
    originalConnectionClosed: true,
  });
  if (!branch.ok) {
    log('STOP');
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount,
      preProbeId,
      postProbeId,
      commitResponseClass: commitResult.responseClass,
      ackState: 'CONTRADICTORY_OR_DRIFTED',
      postCommitVerificationState: 'PENDING_FRESH_READONLY_CLASSIFICATION',
      postCommitCatalogVerificationState: 'PENDING_FRESH_READONLY_CATALOG',
      outcome: 'HOLD',
      holdReasonCode: 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP',
    };
  }

  if (
    commitResult.responseClass === 'ACK_UNCERTAIN_OR_MISSING' ||
    commitResult.responseClass === 'DEFINITIVE_TRANSACTION_REJECTION'
  ) {
    log('STOP');
    return await resolveUncertainCommitWithFreshEvidence(
      input,
      lifecycle,
      statementCount,
      preProbeId,
      postProbeId,
      commitResult.responseClass,
      stepPlan,
    );
  }

  log('POST_COMMIT_READONLY_VERIFICATION');
  const freshOpen = await openFreshReadonlySessionWithGuard(input.deps.freshReadonlySessionFactory, {
    distinctFrom: session,
  });
  if (!freshOpen.ok) {
    return holdEvidence(input.stepId, lifecycle, freshOpen.holdReasonCode, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    });
  }
  const freshSession = freshOpen.session;

  let observedPostCommit: string[];
  try {
    observedPostCommit = await readHistoryVersions(freshSession);
  } catch {
    const cleanupHold = await safeCloseSession(freshSession);
    const holdOpts = {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    };
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId, holdOpts);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      preProbeId,
      postProbeId,
      holdOpts,
    );
  }

  if (!historyVersionsMatchPrefix(observedPostCommit, stepPlan.historyPrefixPost)) {
    const cleanupHold = await safeCloseSession(freshSession);
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId, {
        statementCount,
        commitResponseClass: commitResult.responseClass,
      });
    }
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount,
      preProbeId,
      postProbeId,
      commitResponseClass: commitResult.responseClass,
      ackState: 'CONTRADICTORY_OR_DRIFTED',
      postCommitVerificationState: 'CONTRADICTORY_OR_DRIFTED',
      postCommitCatalogVerificationState: 'PENDING_FRESH_READONLY_CATALOG',
      outcome: 'HOLD',
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
    };
  }

  let catalogVerify: R7LiveBridgeFreshCatalogVerificationResult;
  try {
    catalogVerify = await input.deps.freshReadonlyVerification.verifyPostCommitCatalog({
      stepId: input.stepId,
      session: freshSession,
      repoRoot: input.repoRoot,
      postProbeId,
    });
  } catch {
    const cleanupHold = await safeCloseSession(freshSession);
    const holdOpts = {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    };
    if (cleanupHold) {
      return holdEvidence(input.stepId, lifecycle, cleanupHold, preProbeId, postProbeId, holdOpts);
    }
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE',
      preProbeId,
      postProbeId,
      holdOpts,
    );
  }
  const closeFreshHold = await safeCloseSession(freshSession);
  if (closeFreshHold) {
    return holdEvidence(input.stepId, lifecycle, closeFreshHold, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    });
  }

  if (!catalogVerify.ok) {
    return holdEvidence(input.stepId, lifecycle, catalogVerify.holdReasonCode, preProbeId, postProbeId, {
      statementCount,
      commitResponseClass: commitResult.responseClass,
    });
  }

  const catalogState = resolvePublicCatalogVerificationState(catalogVerify);

  log('STOP');
  return {
    stepId: input.stepId,
    lifecycleStages: lifecycle,
    statementCount,
    preProbeId,
    postProbeId,
    commitResponseClass: commitResult.responseClass,
    ackState: 'DEFINITELY_COMMITTED',
    postCommitVerificationState: 'HISTORY_READONLY_VERIFIED',
    postCommitCatalogVerificationState: catalogState,
    outcome: 'HOLD',
    holdReasonCode: 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING',
  };
}
