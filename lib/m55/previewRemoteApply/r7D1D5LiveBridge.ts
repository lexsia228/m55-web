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
  FROZEN_DELTA_SOURCE_SPECS,
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
import {
  collectD1CatalogObservationFromReadonlySession,
  extractD1StaticCatalogExpectation,
  mapTrustedD1ResultToBridgeCatalogState,
  verifyD1PinnedSourceAndNormalizedComposite,
  verifyD1PostCommitCatalogObservation,
  verifyD1PriorCatalogObservation,
  R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE,
  assertStepIsD1,
} from './r7D1TrustedCatalogVerifier.ts';
import {
  assertR7D1LiveExecutionHumanAuthorizationPresent,
  evaluateR7D1PreviewExecutionCodeOnlyPrep,
  validateR7D1LiveImplementationCandidateBinding,
  type R7D1LiveImplementationCandidateBinding,
} from './r7D1LiveCandidateBinding.ts';
import {
  assertR7D1PhysicalBackendDistinctnessAvailable,
  assertR7D1RealPgNetworkAccessAllowed,
  compareR7LiveBridgeSessionUnderlyingTransport,
  isR7LiveBridgeHarnessSessionInstance,
  registerR7LiveBridgeHarnessSessionInstance,
  validateR7D1ExecutionPgClientConfigPreviewTargetBinding,
} from './r7D1RealPgAdapter.ts';

import {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
} from './r7D1LiveExecutionGateConstants.ts';

export {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
};

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
  | 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING'
  | 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED'
  | 'HOLD_CANDIDATE_MANIFEST_MISMATCH';

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

type R7LiveBridgeInjectedDeps = {
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

/** Public executor input — no caller-supplied session / deps (local code-only gate). */
export type ExecuteR7LiveBridgePublicInput = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly stepId: R7DeltaStepId;
  readonly reviewedCandidateBinding: ExternalReviewedCandidateBinding | null;
  readonly humanAuthorization: R7HumanExecutionAuthorizationDocument | null;
  readonly offlineManifestExecutionAuthorized: boolean;
  readonly remoteExecutionAuthorized: boolean;
  readonly targetObserved: R7LiveBridgeTargetObservedFacts;
};

type ExecuteR7LiveBridgeInjectedInput = ExecuteR7LiveBridgePublicInput & {
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

function resolvePublicCatalogVerificationState(
  verify: R7LiveBridgeFreshCatalogVerificationResult,
  simulationOnly: boolean,
): R7PostCommitCatalogVerificationState {
  if (verify.ok && verify.catalogState === 'VERIFIED' && !simulationOnly) {
    return 'VERIFIED';
  }
  return 'PENDING_FRESH_READONLY_CATALOG';
}

function resolveProductionCapableNonSimulationHold(
  input: ExecuteR7LiveBridgeInjectedInput,
): R7LiveBridgeHoldCode {
  if (R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN) {
    return 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED';
  }
  const eligibility = evaluateR7D1ProductionLiveBridgeEligibility({
    repoRoot: input.repoRoot,
    branch: input.branch,
    headCommitSha: input.headCommitSha,
    stepId: input.stepId,
    liveImplementationBinding: null,
    perD1HumanExecutionAuthorization: input.humanAuthorization,
  });
  if (!eligibility.ok) {
    return eligibility.holdReasonCode;
  }
  const physical = assertR7D1PhysicalBackendDistinctnessAvailable();
  if (!physical.ok) {
    return 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED';
  }
  return 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED';
}

/** D1-only internal orchestration stages — public entry remains HOLD (EXR-04). */
export const R7_D1_CONSOLIDATED_ORCHESTRATION_PUBLIC_ENTRY_REMAINS_HOLD = true as const;

export const R7_D1_PRODUCTION_ORCHESTRATION_STAGE_SEQUENCE: readonly R7ExecutionLifecycleStage[] = [
  'TARGET_IDENTITY_CHECK',
  'AUTHORIZATION_GATE',
  'BEGIN',
  'HISTORY_PREFIX_CHECK',
  'PRE_PROBE',
  'MUTATION_STATEMENTS',
  'HISTORY_INSERT',
  'POST_PROBE',
  'COMMIT',
  'POST_COMMIT_READONLY_VERIFICATION',
  'STOP',
] as const;

export type R7D1CodeOnlyInternalLifecyclePreflightResult =
  | {
      readonly ok: false;
      readonly holdReasonCode: R7LiveBridgeHoldCode;
      readonly stagesValidated: readonly R7ExecutionLifecycleStage[];
      readonly pinnedSourceOk: boolean;
      readonly pinnedStatementCount: number;
      readonly allExecutionGatesClosed: true;
    }
  | { readonly ok: never };

/**
 * Code-only D1 lifecycle wiring check — validates pinned source and stage graph without DB I/O.
 * Public live execution remains forbidden while authorization gates are closed.
 */
export type R7D1InternalMutationLifecycleBinding = {
  readonly executorSurface: 'INJECTED_DEPS_INTERNAL_ONLY';
  readonly publiclyReachable: false;
  readonly statementCountPinned: 63;
  readonly stages: readonly R7ExecutionLifecycleStage[];
};

/** Executable D1 mutation path exists only behind closed authorization gates (A9). */
export function describeR7D1InternalMutationLifecycleBinding(): R7D1InternalMutationLifecycleBinding {
  return {
    executorSurface: 'INJECTED_DEPS_INTERNAL_ONLY',
    publiclyReachable: false,
    statementCountPinned: 63,
    stages: R7_D1_PRODUCTION_ORCHESTRATION_STAGE_SEQUENCE,
  };
}

export function evaluateR7D1PreviewExecutionCodeOnlyPrepForWorkspace(
  repoRoot: string,
  observedAtCommitSha: string,
) {
  return evaluateR7D1PreviewExecutionCodeOnlyPrep(repoRoot, observedAtCommitSha, {
    remoteExecutionAuthorized: R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
    cliLiveTransportForbidden: R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
    localCodeOnlyPublicExecutorForbidden: R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
  });
}

export function evaluateR7D1CodeOnlyInternalD1LifecyclePreflight(repoRoot: string): R7D1CodeOnlyInternalLifecyclePreflightResult {
  const pinned = verifyD1PinnedSourceAndNormalizedComposite(repoRoot);
  const d1Source = FROZEN_DELTA_SOURCE_SPECS.find((s) => s.stepId === 'D1');
  const statementCount = d1Source?.sourceStatementCount ?? 0;
  const manifest = buildCanonicalExpectedManifest(repoRoot);
  const d1Step = manifest.steps.find((s) => s.stepId === 'D1');
  const gatesClosed =
    R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED === false &&
    R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE === true;
  const stagesValidated = R7_D1_PRODUCTION_ORCHESTRATION_STAGE_SEQUENCE;
  if (!pinned.ok || statementCount !== 63 || !d1Step || !gatesClosed) {
    return {
      ok: false,
      holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED',
      stagesValidated,
      pinnedSourceOk: pinned.ok,
      pinnedStatementCount: statementCount,
      allExecutionGatesClosed: true,
    };
  }
  return {
    ok: false,
    holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED',
    stagesValidated,
    pinnedSourceOk: true,
    pinnedStatementCount: statementCount,
    allExecutionGatesClosed: true,
  };
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
  input: ExecuteR7LiveBridgeInjectedInput,
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
  input: ExecuteR7LiveBridgePublicInput,
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
  options: { readonly transactionMayBeOpen: boolean } = { transactionMayBeOpen: false },
): Promise<FreshReadonlySessionOpenResult> {
  if (options.transactionMayBeOpen) {
    const cleanupHold = await safeEndTransactionalSession(session, {
      attemptRollback: true,
      possiblyCommitted: false,
    });
    if (cleanupHold) {
      return { ok: false, holdReasonCode: cleanupHold };
    }
  } else {
    const closeHold = await safeCloseSession(session);
    if (closeHold) {
      return { ok: false, holdReasonCode: closeHold };
    }
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
  if (!assertHarnessBackedPgSession(session)) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
  }
  if (options.distinctFrom !== undefined) {
    if (session === options.distinctFrom) {
      return { ok: false, holdReasonCode: 'HOLD_FRESH_SESSION_NOT_DISTINCT' };
    }
    const relation = compareR7LiveBridgeSessionUnderlyingTransport(session, options.distinctFrom);
    if (relation === 'known_same' || relation === 'unknown') {
      return { ok: false, holdReasonCode: 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED' };
    }
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
    return await failFreshSessionOpenAfterCleanup(session, 'HOLD_POST_CONNECT_GUARD_FAILED', { transactionMayBeOpen: false });
  }
  if (!validateR7LiveBridgePostConnectGuardResult(guardResult)) {
    return await failFreshSessionOpenAfterCleanup(session, 'HOLD_POST_CONNECT_GUARD_FAILED', { transactionMayBeOpen: false });
  }
  try {
    await session.beginReadOnly();
  } catch {
    return await failFreshSessionOpenAfterCleanup(
      session,
      'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED',
      { transactionMayBeOpen: true },
    );
  }
  return { ok: true, session };
}

async function resolveUncertainCommitWithFreshEvidence(
  input: ExecuteR7LiveBridgeInjectedInput,
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
  input: ExecuteR7LiveBridgePublicInput,
): Promise<R7RemoteExecutionPublicEvidence> {
  const lifecycle: R7ExecutionLifecycleStage[] = ['TARGET_IDENTITY_CHECK'];
  const defaultPre = 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT' as R7RuntimeProbeId;
  const defaultPost = 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT' as R7RuntimeProbeId;
  if (R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN) {
    return holdEvidence(
      input.stepId,
      lifecycle,
      'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN',
      defaultPre,
      defaultPost,
    );
  }
  return holdEvidence(
    input.stepId,
    lifecycle,
    'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN',
    defaultPre,
    defaultPost,
  );
}

export type R7DeterministicHarnessSessionScenario = {
  readonly scenarioId: string;
  readonly historyPrior: readonly string[];
  readonly historyPost?: readonly string[];
  readonly lockAvailable?: boolean;
  readonly failAt?:
    | 'connect'
    | 'connect_and_close_throw'
    | 'begin'
    | 'lock'
    | 'lock_throw'
    | 'history'
    | 'pre_probe'
    | 'mutation'
    | 'history_insert'
    | 'post_probe'
    | 'commit_throw'
    | 'commit_and_close_throw'
    | 'fresh_connect'
    | 'fresh_connect_and_close_throw'
    | 'begin_readonly'
    | 'begin_readonly_and_close_throw'
    | 'close_throw';
  readonly commitResponse?: CommitResponseClass;
  readonly guardRow?: Record<string, unknown> | null;
  readonly rollbackAcknowledged?: boolean;
};

/** Data-only local node test modes — no injectable classifier/verifier/callback surfaces. */
export type R7LocalNodeTestFreshAckClassifierMode =
  | 'DEFAULT'
  | 'FORCE_DEFINITELY_COMMITTED'
  | 'FORCE_DEFINITELY_NOT_COMMITTED';

export type R7LocalNodeTestFreshCatalogVerifyMode =
  | 'DEFAULT'
  | 'SIMULATE_POST_COMMIT_VERIFIED'
  | 'SIMULATE_PRIOR_CATALOG_OK';

export type R7LiveBridgeLocalNodeTestHarnessConfig = {
  readonly transactionScenario: R7DeterministicHarnessSessionScenario;
  readonly freshScenario: R7DeterministicHarnessSessionScenario;
  readonly freshMaterializeThrows?: boolean;
  readonly freshFactoryReturnsTransactionSession?: boolean;
  readonly freshAckClassifierMode?: R7LocalNodeTestFreshAckClassifierMode;
  readonly freshCatalogVerifyMode?: R7LocalNodeTestFreshCatalogVerifyMode;
};

let r7LocalNodeTestLastTransactionQuerySqlTraceSnapshot: readonly string[] = [];

function finalizeLocalNodeTestTransactionQuerySqlTraceSnapshot(liveTrace: readonly string[]): void {
  r7LocalNodeTestLastTransactionQuerySqlTraceSnapshot = Object.freeze([...liveTrace]);
}

/** SQL trace snapshot from the last completed local node test run (detached frozen copy; not the live harness buffer). */
export function readR7LocalNodeTestTransactionQuerySqlTraceFromLastRun(): readonly string[] {
  return Object.freeze([...r7LocalNodeTestLastTransactionQuerySqlTraceSnapshot]);
}

function buildLocalNodeTestFreshAckClassifier(
  mode: R7LocalNodeTestFreshAckClassifierMode,
): R7LiveBridgeFreshAckClassifier {
  if (mode === 'FORCE_DEFINITELY_COMMITTED') {
    return {
      async classify() {
        return { ackState: 'DEFINITELY_COMMITTED' };
      },
    };
  }
  if (mode === 'FORCE_DEFINITELY_NOT_COMMITTED') {
    return {
      async classify() {
        return { ackState: 'DEFINITELY_NOT_COMMITTED' };
      },
    };
  }
  return {
    async classify(input) {
      const expectedPost = input.expectedPostPrefix.map((e) => e.version);
      if (input.freshHistoryVersions.length !== expectedPost.length) {
        return { holdReasonCode: 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE' };
      }
      for (let i = 0; i < expectedPost.length; i++) {
        if (input.freshHistoryVersions[i] !== expectedPost[i]) {
          return { holdReasonCode: 'HOLD_FRESH_READONLY_CLASSIFICATION_UNAVAILABLE' };
        }
      }
      return { ackState: 'CONTRADICTORY_OR_DRIFTED' };
    },
  };
}

function buildLocalNodeTestFreshReadonlyVerification(
  mode: R7LocalNodeTestFreshCatalogVerifyMode,
  repoRoot: string,
): R7LiveBridgeFreshReadonlyVerification {
  const pinned = verifyD1PinnedSourceAndNormalizedComposite(repoRoot);
  if (!pinned.ok) {
    throw new Error(pinned.holdReasonCode);
  }
  if (mode === 'SIMULATE_POST_COMMIT_VERIFIED') {
    return {
      async verifyPostCommitCatalog(input) {
        assertStepIsD1(input.stepId);
        return { ok: true, catalogState: 'VERIFIED' };
      },
      async verifyFreshPriorCatalogState(input) {
        assertStepIsD1(input.stepId);
        return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
      },
    };
  }
  if (mode === 'SIMULATE_PRIOR_CATALOG_OK') {
    return {
      async verifyPostCommitCatalog(input) {
        assertStepIsD1(input.stepId);
        return { ok: true, catalogState: 'PENDING_FRESH_READONLY_CATALOG' };
      },
      async verifyFreshPriorCatalogState(input) {
        assertStepIsD1(input.stepId);
        return { ok: true, priorCatalogConsistent: true };
      },
    };
  }
  return {
    async verifyPostCommitCatalog(input) {
      assertStepIsD1(input.stepId);
      return { ok: true, catalogState: 'PENDING_FRESH_READONLY_CATALOG' };
    },
    async verifyFreshPriorCatalogState(input) {
      assertStepIsD1(input.stepId);
      return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
    },
  };
}

function deterministicHarnessPreProbePayload(): Record<string, unknown> {
  return { probe_payload: { anchor_table_count: 0 } };
}

function deterministicHarnessPostProbePayload(): Record<string, unknown> {
  return {
    probe_payload: {
      anchor_table_count: 7,
      reject_mutation_function_present: true,
      reject_mutation_empty_args: true,
      snapshots_content_fingerprint_text_column_ok: true,
    },
  };
}

class DeterministicHarnessSession implements R7LiveBridgePgSession {
  readonly queries: Array<{ sql: string; params?: readonly unknown[] }> = [];
  private inTransaction = false;
  private readOnlyEstablished = false;
  private history: string[];
  private readonly historyPost: string[];
  private readonly lockAvailable: boolean;
  private readonly failAt: R7DeterministicHarnessSessionScenario['failAt'];
  private readonly commitResponse: CommitResponseClass;
  private readonly guardRow: Record<string, unknown> | null;
  private readonly rollbackAcknowledged: boolean;
  private mutationCount = 0;

  constructor(
    private readonly scenario: R7DeterministicHarnessSessionScenario,
    private readonly transactionQueryTraceSink?: string[],
  ) {
    this.history = [...scenario.historyPrior];
    this.historyPost = scenario.historyPost ? [...scenario.historyPost] : [...scenario.historyPrior];
    this.lockAvailable = scenario.lockAvailable ?? true;
    this.failAt = scenario.failAt ?? undefined;
    this.commitResponse = scenario.commitResponse ?? 'DEFINITIVE_COMMIT_ACK';
    this.guardRow =
      scenario.guardRow === undefined
        ? { current_database_name: 'postgres', current_user_name: 'postgres' }
        : scenario.guardRow;
    this.rollbackAcknowledged = scenario.rollbackAcknowledged ?? true;
    registerR7LiveBridgeHarnessSessionInstance(this);
  }

  async connect(): Promise<void> {
    this.queries.push({ sql: '__connect__' });
    this.transactionQueryTraceSink?.push('__connect__');
    if (
      this.failAt === 'connect' ||
      this.failAt === 'connect_and_close_throw' ||
      this.failAt === 'fresh_connect' ||
      this.failAt === 'fresh_connect_and_close_throw'
    ) {
      throw new Error('MOCK_CONNECT_FORBIDDEN');
    }
  }

  async begin(): Promise<void> {
    if (this.failAt === 'begin') throw new Error('MOCK_BEGIN_FAILED');
    this.inTransaction = true;
  }

  async beginReadOnly(): Promise<void> {
    if (this.failAt === 'begin_readonly' || this.failAt === 'begin_readonly_and_close_throw') {
      throw new Error('MOCK_BEGIN_READONLY_FAILED');
    }
    await this.begin();
    this.readOnlyEstablished = true;
    this.queries.push({ sql: R7_LIVE_BRIDGE_READONLY_TX_SQL });
  }

  async query(sql: string, params?: readonly unknown[]): Promise<R7LiveBridgePgQueryResult> {
    this.queries.push({ sql, params });
    this.transactionQueryTraceSink?.push(sql);
    if (sql === R7_D1_D5_MIGRATION_COORDINATION_TRY_LOCK_SQL) {
      if (this.failAt === 'lock_throw') throw new Error('MOCK_LOCK_QUERY_FAILED');
      if (this.failAt === 'lock') return { rows: [{ lock_acquired: false }], rowCount: 1 };
      return { rows: [{ lock_acquired: this.lockAvailable }], rowCount: 1 };
    }
    if (sql === POST_CONNECT_GUARD_SQL) {
      if (this.guardRow === null) return { rows: [], rowCount: 0 };
      return { rows: [this.guardRow], rowCount: 1 };
    }
    if (sql === R7_LIVE_BRIDGE_HISTORY_READONLY_SELECT_SQL) {
      if (this.failAt === 'history') throw new Error('MOCK_HISTORY_FAILED');
      const versions = this.readOnlyEstablished || !this.inTransaction ? this.historyPost : this.history;
      return { rows: versions.map((version) => ({ version })), rowCount: versions.length };
    }
    if (sql.includes('R7_PROBE_ID:R7_D1_PRE')) {
      if (this.failAt === 'pre_probe') throw new Error('MOCK_PRE_PROBE_FAILED');
      if (sql.includes('R7_PROBE_PHASE:pre')) return { rows: [deterministicHarnessPreProbePayload()], rowCount: 1 };
    }
    if (sql.includes('R7_PROBE_ID:R7_D1_POST')) {
      if (this.failAt === 'post_probe') throw new Error('MOCK_POST_PROBE_FAILED');
      return { rows: [deterministicHarnessPostProbePayload()], rowCount: 1 };
    }
    if (sql === HISTORY_INSERT_SQL_METADATA) {
      if (this.failAt === 'history_insert') throw new Error('MOCK_HISTORY_INSERT_FAILED');
      const version = String(params?.[0] ?? '');
      if (version) this.history = [...this.history, version];
      return { rows: [], rowCount: 1 };
    }
    if (this.inTransaction && !sql.startsWith('SELECT')) {
      if (this.failAt === 'mutation' && this.mutationCount === 0) {
        this.mutationCount += 1;
        throw new Error('MOCK_MUTATION_FAILED');
      }
      this.mutationCount += 1;
    }
    return { rows: [], rowCount: 0 };
  }

  async commit(): Promise<{ readonly responseClass: CommitResponseClass }> {
    if (this.failAt === 'commit_throw' || this.failAt === 'commit_and_close_throw') {
      throw new Error('MOCK_COMMIT_TRANSPORT_LOSS');
    }
    this.inTransaction = false;
    return { responseClass: this.commitResponse };
  }

  async rollback(): Promise<{ readonly acknowledged: boolean }> {
    this.inTransaction = false;
    return { acknowledged: this.rollbackAcknowledged };
  }

  async close(): Promise<void> {
    this.queries.push({ sql: '__close__' });
    this.transactionQueryTraceSink?.push('__close__');
    if (
      this.failAt === 'close_throw' ||
      this.failAt === 'connect_and_close_throw' ||
      this.failAt === 'commit_and_close_throw' ||
      this.failAt === 'fresh_connect_and_close_throw' ||
      this.failAt === 'begin_readonly_and_close_throw'
    ) {
      throw new Error('MOCK_CLOSE_FAILED');
    }
  }
}

function buildLocalNodeTestHarnessDeps(
  input: R7LiveBridgeLocalNodeTestHarnessConfig,
  repoRoot: string,
  transactionQueryTrace: string[],
): R7LiveBridgeInjectedDeps {
  const transactionSession = new DeterministicHarnessSession(input.transactionScenario, transactionQueryTrace);
  const ackMode = input.freshAckClassifierMode ?? 'DEFAULT';
  const catalogMode = input.freshCatalogVerifyMode ?? 'DEFAULT';
  return {
    implementationMode: R7_LIVE_BRIDGE_IMPLEMENTATION_MODE,
    simulationOnly: true,
    transactionSession,
    freshReadonlySessionFactory: () => {
      if (input.freshMaterializeThrows) {
        throw new Error('MOCK_FACTORY_THROW');
      }
      if (input.freshFactoryReturnsTransactionSession) {
        return transactionSession;
      }
      return new DeterministicHarnessSession(input.freshScenario);
    },
    freshAckClassifier: buildLocalNodeTestFreshAckClassifier(ackMode),
    freshReadonlyVerification: buildLocalNodeTestFreshReadonlyVerification(catalogMode, repoRoot),
  };
}

/**
 * Node local-test lifecycle only — scenarios are compiled into module-private harness sessions.
 * Callers cannot supply connect/query/commit implementations through the public input shape.
 */
export async function runR7LiveBridgeLocalNodeTestDeterministicLifecycle(
  input: ExecuteR7LiveBridgePublicInput & { readonly localNodeTestHarness: R7LiveBridgeLocalNodeTestHarnessConfig },
): Promise<R7RemoteExecutionPublicEvidence> {
  r7LocalNodeTestLastTransactionQuerySqlTraceSnapshot = [];
  const liveTransactionQueryTrace: string[] = [];
  const deps = buildLocalNodeTestHarnessDeps(
    input.localNodeTestHarness,
    input.repoRoot,
    liveTransactionQueryTrace,
  );
  try {
    const evidence = await executeR7DeltaStepLiveBridgeInjectedDepsInternal({ ...input, deps });
    finalizeLocalNodeTestTransactionQuerySqlTraceSnapshot(liveTransactionQueryTrace);
    return evidence;
  } catch (error) {
    finalizeLocalNodeTestTransactionQuerySqlTraceSnapshot(liveTransactionQueryTrace);
    throw error;
  }
}

function assertHarnessBackedPgSession(session: R7LiveBridgePgSession): boolean {
  return isR7LiveBridgeHarnessSessionInstance(session as object);
}

async function executeR7DeltaStepLiveBridgeInjectedDepsInternal(
  input: ExecuteR7LiveBridgeInjectedInput,
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
      resolveProductionCapableNonSimulationHold(input),
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
  if (!assertHarnessBackedPgSession(session)) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED', preProbeId, postProbeId);
  }
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

  const catalogState = resolvePublicCatalogVerificationState(catalogVerify, input.deps.simulationOnly);

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

/** Trusted pg_catalog path — observation queries run only when the local catalog gate is open. */
export function createR7D1TrustedFreshReadonlyVerification(
  repoRoot: string,
): R7LiveBridgeFreshReadonlyVerification {
  const pinned = verifyD1PinnedSourceAndNormalizedComposite(repoRoot);
  if (!pinned.ok) {
    throw new Error(pinned.holdReasonCode);
  }
  const expectation = extractD1StaticCatalogExpectation(repoRoot);
  return {
    async verifyPostCommitCatalog(input) {
      assertStepIsD1(input.stepId);
      if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
        return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
      }
      const collected = await collectD1CatalogObservationFromReadonlySession(input.session, input.repoRoot);
      if (!collected.ok) {
        return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
      }
      const trusted = verifyD1PostCommitCatalogObservation(
        input.repoRoot,
        collected.trusted.nameObservation,
        collected.trusted,
      );
      const catalogState = mapTrustedD1ResultToBridgeCatalogState(trusted);
      if (!catalogState) {
        return { ok: false, holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED' };
      }
      return { ok: true, catalogState };
    },
    async verifyFreshPriorCatalogState(input) {
      assertStepIsD1(input.stepId);
      if (R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE) {
        return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
      }
      const collected = await collectD1CatalogObservationFromReadonlySession(input.session, input.repoRoot);
      if (!collected.ok) {
        return { ok: false, holdReasonCode: 'HOLD_FRESH_ACK_CLASSIFICATION_REJECTED' };
      }
      const prior = verifyD1PriorCatalogObservation(expectation, collected.trusted.nameObservation);
      if (!prior.ok) {
        return { ok: false, holdReasonCode: prior.holdReasonCode };
      }
      return prior;
    },
  };
}

export function evaluateR7D1ProductionLiveBridgeEligibility(input: {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly stepId: R7DeltaStepId;
  readonly liveImplementationBinding: R7D1LiveImplementationCandidateBinding | null;
  readonly perD1HumanExecutionAuthorization: unknown;
}): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: R7LiveBridgeHoldCode } {
  if (input.stepId !== 'D1') {
    return { ok: false, holdReasonCode: 'HOLD_STEP_NOT_FOUND' };
  }
  const network = assertR7D1RealPgNetworkAccessAllowed();
  if (!network.ok) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN' };
  }
  const binding = validateR7D1LiveImplementationCandidateBinding(
    input.repoRoot,
    input.branch,
    input.headCommitSha,
    input.liveImplementationBinding,
  );
  if (!binding.ok) {
    const code: R7LiveBridgeHoldCode =
      binding.holdReasonCode === 'HOLD_REPO_IDENTITY_MISMATCH'
        ? 'HOLD_REPO_IDENTITY_MISMATCH'
        : binding.holdReasonCode === 'HOLD_CANDIDATE_MANIFEST_MISMATCH'
          ? 'HOLD_CANDIDATE_MANIFEST_MISMATCH'
          : binding.holdReasonCode === 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED'
            ? 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED'
            : 'HOLD_AUTHORIZATION_GATE';
    return { ok: false, holdReasonCode: code };
  }
  const human = assertR7D1LiveExecutionHumanAuthorizationPresent(input.perD1HumanExecutionAuthorization);
  if (!human.ok) {
    return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
  }
  return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
}

export {
  R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE,
  R7_D1_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED_IN_LOCAL_CODE_GATE,
  assertR7D1RealPgNetworkAccessAllowed,
  assertR7D1PhysicalBackendDistinctnessAvailable,
  wrapExecutionPgClientAsR7LiveBridgeSession,
  createR7D1InjectedExecutionPgTransport,
  createR7LiveBridgeSessionFactoryFromPgTransport,
  establishFreshReadOnlyPgSession,
  compareR7LiveBridgeSessionUnderlyingTransport,
  compareR7LiveBridgePhysicalBackendProof,
  readR7LiveBridgeSessionPhysicalEvidence,
  isR7LiveBridgeHarnessSessionInstance,
  normalizePgQueryResult,
  normalizePgDdlEmptyResult,
  validateR7D1ExecutionPgClientConfigPreviewTargetBinding,
} from './r7D1RealPgAdapter.ts';

export {
  R7_D1_PINNED_MIGRATION_VERSION,
  R7_D1_PINNED_SOURCE_SHA256,
  R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE,
  R7_D1_MANDATORY_CATALOG_EVIDENCE_CATEGORIES,
  R7_D1_PG_CATALOG_OBSERVATION_QUERIES,
  type R7D1CatalogObservationQueryKey,
  extractD1StaticCatalogExpectation,
  extractD1SemanticCatalogExpectation,
  buildTrustedCollectedCatalogObservationFromQueryResults,
  verifyD1PinnedSourceAndNormalizedComposite,
  verifyD1PostCommitCatalogObservation,
  verifyD1PriorCatalogObservation,
  verifyD1FullCatalogSemanticParity,
  verifyD1TrustedCollectedCatalogParity,
  listMandatoryD1CatalogEvidenceCategories,
  parseStrictD1CatalogObservationWirePayload,
  assessD1NameInventoryOnlyObservation,
  mapTrustedD1ResultToBridgeCatalogState,
  R7_D1_FULL_CATALOG_SEMANTIC_COVERAGE_PENDING_CATEGORIES,
  R7_D1_TRUSTED_COLLECTOR_PROVENANCE,
} from './r7D1TrustedCatalogVerifier.ts';

export {
  deriveD1ExactPreCatalogContract,
  deriveD1ExactPostCatalogContract,
  deriveD1ExpectedPostMigrationVersionList,
  deriveD1ExpectedPreMigrationVersionList,
  deriveExactCatalogObservationQueryPlanDigestSha256,
  listMandatoryD1ExactCategoriesForPhase,
  produceProducerBoundD1CatalogEvidenceFromQueryResults,
  registerTrustedCatalogQueryExecutionContext,
  evaluateProducerBoundD1CatalogEvidence,
  isProducerBoundCatalogEvidence,
  rejectForgeableExactCatalogEvidenceInput,
  R7_D1_EXACT_MANDATORY_CATEGORIES,
} from './r7D1ExactCatalogContract.ts';

export {
  R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
  R7_D1_FEATURE_BASE_COMMIT_SHA,
  R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA,
  R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256,
  buildHistoricalExternalReviewManifestSnapshot206ee0d7,
  R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN,
  deriveDeterministicSixFileManifestIdentitySha256,
  observeR7D1LiveImplementationWorkspaceSixFileDigests,
  diffWorkspaceObservationAgainstIndependentlyReviewedManifest,
  validateR7D1LiveImplementationCandidateBinding,
  evaluateR7D1PreviewExecutionCodeOnlyPrep,
  buildR7D1CurrentWorkspaceCandidateLocalObservation,
  R7_D1_PREVIEW_D1_APPLY_NOT_AUTHORIZED_IN_CODE_ONLY_PREP,
} from './r7D1LiveCandidateBinding.ts';
