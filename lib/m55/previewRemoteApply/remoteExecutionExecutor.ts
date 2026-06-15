import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  compareRuntimePhaseSnapshot,
  deriveRuntimePhaseSnapshot,
  parseRuntimeCatalogOutput,
  type RuntimeCatalogRaw,
} from '../../../scripts/m55/previewBaselineDisposableRuntime.ts';
import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  applyOptionARemoval,
  buildPolicy2HistoryPayload,
  compositeStreamSha256,
  type VersionLabel,
} from '../transactionNormalized/statementStream.ts';
import {
  EXPECTED_REVISION7_VERSION_IDENTITIES,
  loadAuthorityBundle,
  validateMigrationSourceBytes,
} from '../transactionNormalized/transactionNormalizedCore.ts';

import {
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  EXPECTED_FOUNDATION_BASE_HEAD,
  EXPECTED_SESSION_SETTINGS,
  FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS,
  FOUNDATION_REL_PATHS,
  LIFECYCLE_VERSION_REGISTRY,
  loadExecutionSqlAuthorityFoundationDocument,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_ID,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS,
  CATALOG_EXTRACTOR_OUTPUT_COLUMN,
  validateExecutionSqlAuthorityFoundation,
} from './executionSqlAuthorityFoundation.ts';
import { HISTORY_BOOTSTRAP_DDL_STATEMENTS, HISTORY_BOOTSTRAP_SPEC } from './historyBootstrapSpec.ts';
import {
  branchAfterCommitResponseClass,
  buildPreCommitFailureDisposition,
  classifyAckState,
  REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
  type AckClassifierInput,
  type CommitResponseClass,
  type P2ThroughP7AckPredicateFacts,
  type PreCommitFailureClass,
} from './remoteExecutionLifecycleAuthority.ts';
import {
  acquireExecutionCredentials,
  type CredentialAcquirerDeps,
  type ExecutionCredentialPublicHandle,
  type ParsedConnectionSecrets,
  publicHandleToJson,
} from './remoteExecutionCredentialAcquirer.ts';
import {
  buildClientConfig,
  createExecutionPgTransport,
  normalizeExecutionTransportError,
  resolveExecutionPgTransportEvidenceProfile,
  type ExecutionPgTransportEvidenceProfile,
  type ExecutionPgClient,
  type ExecutionPgQueryResult,
  type ExecutionPgTransportFactoryDeps,
} from './remoteExecutionPgTransport.ts';
import {
  POST_CONNECT_GUARD_SQL,
  validateNonsecretTargetBinding,
  type ExpectedAuthorizationBinding,
  type ObservedPreConnectFacts,
} from './remoteConnectionAuthority.ts';
import { getRuntimeProbeById, RUNTIME_PROBE_REGISTRY, validateRuntimeProbeRegistry } from './runtimeProbeRegistry.ts';
import { TIMEOUT_POLICY, validateTimeoutPolicyInvariants } from './timeoutPolicy.ts';
import {
  EXPECTED_BRANCH,
  EXPECTED_NORMALIZED_STATEMENT_COUNTS,
  EXPECTED_REPO_ROOT,
  HISTORY_INSERT_SQL_METADATA,
  sanitizePreviewRemoteApplyHoldCode,
  type CredentialMethodId,
  type PreviewRemoteApplyHoldCode,
  type RepositoryIdentityFacts,
  type StepId,
} from './types.ts';
import { validateRepositoryIdentityFacts } from './transactionNormalizedRemoteExecutor.ts';

export const REMOTE_EXECUTOR_IMPLEMENTATION_ID = 'M55_PREVIEW_REMOTE_EXECUTOR_IMPLEMENTATION_v1' as const;

export const EXECUTION_DISABLEMENT = {
  executionAuthorized: false as const,
  realConnectionExecuted: false as const,
  codeImplemented: true as const,
  sqlExecuted: false as const,
  migrationApplyAuthorized: false as const,
  productionAccessAuthorized: false as const,
  automaticNextStep: false as const,
  sameRunRetry: false as const,
};

export type RuntimeExecutionEvidence = {
  readonly authorizationBindingAccepted: boolean;
  readonly connectionOpened: boolean;
  readonly transactionBegan: boolean;
  readonly mutationStatementsStarted: boolean;
  readonly historyInsertExecuted: boolean;
  readonly commitSent: boolean;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly freshReadonlyCheckExecuted: boolean;
  readonly freshReadonlyCheckCompleted: boolean;
  readonly transportProfile: ExecutionPgTransportEvidenceProfile | null;
  readonly executionStageReached: ExecutionStage;
  readonly inTransactionPostProbeDiagnostic?: InTransactionPostProbeDiagnostic | null;
};

export type InTransactionPostProbeDiagnostic = {
  readonly selectedStep: StepId;
  readonly postProbeId: string;
  readonly registryProbeFound: boolean;
  readonly registryKindOrdinary: boolean;
  readonly registryIdMatch: boolean;
  readonly registryPhaseMatch: boolean;
  readonly registryPrefixMatch: boolean;
  readonly expectedHistoryPrefix: readonly string[];
  readonly observedHistoryPrefix: readonly string[];
  readonly historyPrefixExact: boolean;
  readonly priorCompareOk: boolean;
  readonly postCompareOk: boolean;
  readonly currentVersionDeltaPresent: boolean;
  readonly unexpectedDeltaZero: boolean;
  readonly priorMismatchCategories: readonly string[];
  readonly postMismatchCategories: readonly string[];
  readonly priorMismatchCount: number;
  readonly postMismatchCount: number;
  readonly postForbiddenViolationCount: number;
  readonly normalizationProfile: 'CATALOG_PG_WIRE_CANONICAL_V1';
};

export type StaticExecutionGateRecord = {
  readonly executionAuthorized: false;
  readonly migrationApplyAuthorized: false;
  readonly productionAccessAuthorized: false;
  readonly automaticNextStep: false;
  readonly sameRunRetry: false;
  readonly codeImplemented: true;
};

export const STATIC_EXECUTION_GATE: StaticExecutionGateRecord = {
  executionAuthorized: false,
  migrationApplyAuthorized: false,
  productionAccessAuthorized: false,
  automaticNextStep: false,
  sameRunRetry: false,
  codeImplemented: true,
};

export type ExecutionStage =
  | 'PRE_CONNECT'
  | 'CREDENTIAL_ACQUIRED'
  | 'CONNECTED_PRE_TRANSACTION'
  | 'IN_TRANSACTION_PRIOR'
  | 'IN_TRANSACTION_BOOTSTRAP'
  | 'IN_TRANSACTION_MUTATION'
  | 'IN_TRANSACTION_HISTORY'
  | 'IN_TRANSACTION_POST'
  | 'COMMIT_SENT'
  | 'ORIGINAL_CONNECTION_CLOSED'
  | 'FRESH_READONLY_CLASSIFICATION'
  | 'COMPLETE';

export type PreviewRemoteExecutionInput = {
  readonly repoRoot: string;
  readonly authorizationDocument: unknown;
  readonly credentialMethod: CredentialMethodId;
  readonly selectedStep: StepId;
};

export const FRESH_READONLY_BEGIN_SQL =
  'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;' as const;

export function buildFreshLocalStatementTimeoutSql(deadlineMs: number): string {
  return `SET LOCAL statement_timeout = '${deadlineMs}ms';`;
}

export type VerifiedProbeSqlBundle = {
  readonly p1PriorBootstrapPreconditionSql: string;
  readonly catalogExtractorSql: string;
};

export type PreviewRemoteExecutionDeps = {
  readonly repositoryFacts?: () => RepositoryIdentityFacts;
  readonly transportFactory?: ExecutionPgTransportFactoryDeps;
  readonly verifierTransportFactory?: ExecutionPgTransportFactoryDeps;
  readonly credentialAcquirerDeps?: CredentialAcquirerDeps;
  readonly nowMs?: () => number;
  readonly deadlineRunner?: {
    readonly isExceeded: (startedAtMs: number, deadlineMs: number) => boolean;
  };
};

export type PreviewRemoteExecutionHold = StaticExecutionGateRecord & {
  readonly mode: 'PREVIEW_REMOTE_EXECUTION_HOLD';
  readonly holdReasonCode: PreviewRemoteApplyHoldCode;
  readonly runtimeEvidence: RuntimeExecutionEvidence;
  readonly commitResponseClass?: CommitResponseClass | null;
  readonly postCommitLifecycle?:
    | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
    | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE'
    | null;
  readonly ackState?: string | null;
  readonly disposition?: string | null;
};

export type PreviewRemoteExecutionHumanReview = StaticExecutionGateRecord & {
  readonly mode: 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED';
  readonly holdReasonCode: null;
  readonly runtimeEvidence: RuntimeExecutionEvidence;
  readonly selectedStep: StepId;
  readonly targetBindingIdentifier: string;
  readonly credentialMethod: CredentialMethodId;
  readonly cleanupToken: string;
  readonly commitResponseClass: CommitResponseClass;
  readonly postCommitLifecycle:
    | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
    | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE';
  readonly ackState: string | null;
  readonly disposition: string;
  readonly humanReviewRequired: true;
  readonly includesFinalP7Verification: boolean;
};

export type PreviewRemoteExecutionResult = PreviewRemoteExecutionHold | PreviewRemoteExecutionHumanReview;

type OraclePhase = Record<string, unknown>;
type PhaseSnapshot = ReturnType<typeof deriveRuntimePhaseSnapshot>;

type ClassifierLifecycleOutcome = {
  readonly ackState: string | null;
  readonly disposition: string;
  readonly postCommitLifecycle:
    | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
    | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE';
};

const STEP_TO_PRIOR_PROBE: Readonly<Record<StepId, string>> = {
  P1: 'PRIOR_P1',
  P2: 'PRIOR_P2',
  P3: 'PRIOR_P3',
  P4: 'PRIOR_P4',
  P5: 'PRIOR_P5',
  P6: 'PRIOR_P6',
  P7: 'PRIOR_P7',
};

const STEP_TO_POST_PROBE: Readonly<Record<StepId, string>> = {
  P1: 'POST_P1',
  P2: 'POST_P2',
  P3: 'POST_P3',
  P4: 'POST_P4',
  P5: 'POST_P5',
  P6: 'POST_P6',
  P7: 'POST_P7',
};

const STEP_INDEX: Readonly<Record<StepId, number>> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
  P6: 6,
  P7: 7,
};

function createInitialRuntimeEvidence(
  stage: ExecutionStage,
  transportProfile: RuntimeExecutionEvidence['transportProfile'],
): RuntimeExecutionEvidence {
  return {
    authorizationBindingAccepted: false,
    connectionOpened: false,
    transactionBegan: false,
    mutationStatementsStarted: false,
    historyInsertExecuted: false,
    commitSent: false,
    commitResponseClass: null,
    freshReadonlyCheckExecuted: false,
    freshReadonlyCheckCompleted: false,
    transportProfile,
    executionStageReached: stage,
  };
}

function withRuntimeStage(
  evidence: RuntimeExecutionEvidence,
  stage: ExecutionStage,
  patch: Partial<Omit<RuntimeExecutionEvidence, 'executionStageReached'>> = {},
): RuntimeExecutionEvidence {
  return {
    ...evidence,
    ...patch,
    executionStageReached: stage,
  };
}

function resolveTransportProfile(deps: PreviewRemoteExecutionDeps): ExecutionPgTransportEvidenceProfile {
  const mutationProfile = resolveExecutionPgTransportEvidenceProfile(deps.transportFactory ?? {});
  const verifierProfile = resolveExecutionPgTransportEvidenceProfile(
    deps.verifierTransportFactory ?? deps.transportFactory ?? {},
  );
  if (
    mutationProfile === 'TEST_INJECTED' ||
    verifierProfile === 'TEST_INJECTED'
  ) {
    return 'TEST_INJECTED';
  }
  return 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1';
}

export function parseCanonicalPgInt8WireString(value: unknown): number | null {
  if (typeof value === 'object' && value !== null) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  if (value.length === 0) {
    return null;
  }
  if (/\s/.test(value)) {
    return null;
  }
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parseFinitePgInt4WireNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function buildHold(
  holdReasonCode: PreviewRemoteApplyHoldCode,
  runtimeEvidence: RuntimeExecutionEvidence,
  classifierOutcome?: {
    readonly commitResponseClass?: CommitResponseClass | null;
    readonly postCommitLifecycle?:
      | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
      | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE'
      | null;
    readonly ackState?: string | null;
    readonly disposition?: string | null;
  },
): PreviewRemoteExecutionHold {
  return {
    mode: 'PREVIEW_REMOTE_EXECUTION_HOLD',
    holdReasonCode: sanitizePreviewRemoteApplyHoldCode(holdReasonCode),
    runtimeEvidence,
    commitResponseClass: classifierOutcome?.commitResponseClass ?? null,
    postCommitLifecycle: classifierOutcome?.postCommitLifecycle ?? null,
    ackState: classifierOutcome?.ackState ?? null,
    disposition: classifierOutcome?.disposition ?? null,
    ...STATIC_EXECUTION_GATE,
  };
}

function snapshotValidatedAuthorizationEnvelope(
  authorizationDocument: unknown,
): { readonly expected: ExpectedAuthorizationBinding; readonly observed: ObservedPreConnectFacts } {
  const envelope = authorizationDocument as Record<string, unknown>;
  return {
    expected: Object.getOwnPropertyDescriptor(envelope, 'expected')!.value as ExpectedAuthorizationBinding,
    observed: Object.getOwnPropertyDescriptor(envelope, 'observed')!.value as ObservedPreConnectFacts,
  };
}

function isHumanReviewClassifierSuccess(outcome: ClassifierLifecycleOutcome | null): outcome is ClassifierLifecycleOutcome {
  if (!outcome) return false;
  return outcome.ackState === 'DEFINITELY_COMMITTED' && outcome.disposition !== 'MANDATORY_STOP';
}

function buildClassifierHoldOutcome(
  outcome: ClassifierLifecycleOutcome | null,
  commitResponseClass: CommitResponseClass | null,
): {
  readonly commitResponseClass: CommitResponseClass | null;
  readonly postCommitLifecycle:
    | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
    | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE'
    | null;
  readonly ackState: string | null;
  readonly disposition: string;
} {
  return {
    commitResponseClass,
    postCommitLifecycle: outcome?.postCommitLifecycle ?? 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
    ackState: outcome?.ackState ?? null,
    disposition: outcome?.disposition ?? 'MANDATORY_STOP',
  };
}

function validateSuppliedRepositoryIdentity(
  observed: ObservedPreConnectFacts,
  repository: RepositoryIdentityFacts,
): PreviewRemoteApplyHoldCode | null {
  if (observed.repositoryBranch !== repository.branch) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (observed.repositoryHead !== repository.headCommitSha) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (observed.repositoryTree !== repository.treeSha) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  return null;
}

function loadOraclePhases(repoRoot: string): readonly OraclePhase[] {
  try {
    const oraclePath = join(repoRoot, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.path);
    const parsed = JSON.parse(readFileSync(oraclePath, 'utf8')) as { phases?: OraclePhase[] };
    if (!Array.isArray(parsed.phases)) {
      throw new Error('HOLD_AUTHORITY_IDENTITY_MISMATCH');
    }
    return parsed.phases;
  } catch {
    throw new Error('HOLD_AUTHORITY_IDENTITY_MISMATCH');
  }
}

function getOraclePhase(phases: readonly OraclePhase[], phaseId: string): OraclePhase {
  const phase = phases.find((entry) => entry.phase === phaseId);
  if (!phase) {
    throw new Error('HOLD_AUTHORITY_IDENTITY_MISMATCH');
  }
  return phase;
}

function expectedHistoryPrefixForStep(stepId: StepId, slot: 'prior' | 'post'): readonly string[] {
  const index = STEP_INDEX[stepId];
  if (slot === 'prior') {
    return LIFECYCLE_VERSION_REGISTRY.slice(0, index - 1);
  }
  return LIFECYCLE_VERSION_REGISTRY.slice(0, index);
}

function expectedOraclePhaseForStep(stepId: StepId, slot: 'prior' | 'post'): string {
  const index = STEP_INDEX[stepId];
  if (slot === 'prior') {
    return index === 1 ? 'P0' : `P${index - 1}`;
  }
  return stepId;
}

function extractCatalogJsonLine(result: ExecutionPgQueryResult): string {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  const row = result.rows[0]!;
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== CATALOG_EXTRACTOR_OUTPUT_COLUMN) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  const value = row[CATALOG_EXTRACTOR_OUTPUT_COLUMN];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0 || !trimmed.startsWith('{') || trimmed.startsWith('[')) {
      throw new Error('HOLD_UNEXPECTED_INTERNAL');
    }
    return trimmed;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  throw new Error('HOLD_UNEXPECTED_INTERNAL');
}

function normalizeCatalogRelationCountWireValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
    return value;
  }
  const parsed = parseCanonicalPgInt8WireString(value);
  if (parsed === null) {
    throw new Error('HOLD_UNEXPECTED_INTERNAL');
  }
  return parsed;
}

function normalizeCatalogRawWireShapes(raw: RuntimeCatalogRaw): RuntimeCatalogRaw {
  const application_relation_counts = Object.fromEntries(
    Object.entries(raw.application_relation_counts ?? {}).map(([key, value]) => [
      key,
      normalizeCatalogRelationCountWireValue(value),
    ]),
  );
  const internal_trigger_groups = (raw.internal_trigger_groups ?? []).map((group) => {
    const row = group as RuntimeCatalogRaw['internal_trigger_groups'][number];
    return {
      ...row,
      expected_count: normalizeCatalogRelationCountWireValue(row.expected_count),
      actual_count: normalizeCatalogRelationCountWireValue(row.actual_count),
    };
  });
  return {
    ...raw,
    application_relation_counts,
    internal_trigger_groups,
  };
}

const MISMATCH_CATEGORY_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_PUBLIC_MISMATCH_ENTRIES = 32;
const MAX_PUBLIC_MISMATCH_ENTRY_LENGTH = 96;
const CANONICAL_MIGRATION_VERSION_PATTERN = /^[0-9]{14}$/;
const MAX_OBSERVED_HISTORY_PREFIX_ENTRIES = 7;
const UNSAFE_MISMATCH_CATEGORY_SUPPRESSED = 'UNSAFE_MISMATCH_CATEGORY_SUPPRESSED' as const;
const HISTORY_PREFIX_DIAGNOSTIC_SHAPE_INVALID = 'HISTORY_PREFIX_DIAGNOSTIC_SHAPE_INVALID' as const;
const CATALOG_PG_WIRE_NORMALIZATION_PROFILE = 'CATALOG_PG_WIRE_CANONICAL_V1' as const;

function isSafePublicMismatchCategory(entry: unknown): entry is string {
  if (typeof entry !== 'string') {
    return false;
  }
  if (entry.length === 0 || entry.length > MAX_PUBLIC_MISMATCH_ENTRY_LENGTH) {
    return false;
  }
  return MISMATCH_CATEGORY_PATTERN.test(entry);
}

export function sanitizePublicMismatchCategories(categories: readonly unknown[]): readonly string[] {
  if (categories.length > MAX_PUBLIC_MISMATCH_ENTRIES) {
    return [UNSAFE_MISMATCH_CATEGORY_SUPPRESSED];
  }
  const validated: string[] = [];
  for (const entry of categories) {
    if (!isSafePublicMismatchCategory(entry)) {
      return [UNSAFE_MISMATCH_CATEGORY_SUPPRESSED];
    }
    validated.push(entry);
  }
  return [...new Set(validated)].sort();
}

type ObservedHistoryPrefixExtraction = {
  readonly values: readonly string[];
  readonly valid: boolean;
};

function extractObservedHistoryPrefixShape(snapshot: PhaseSnapshot): ObservedHistoryPrefixExtraction {
  const raw = snapshot.history_prefix;
  if (!Array.isArray(raw)) {
    return { values: [], valid: false };
  }
  if (raw.length > MAX_OBSERVED_HISTORY_PREFIX_ENTRIES) {
    return { values: [], valid: false };
  }
  const observed: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !CANONICAL_MIGRATION_VERSION_PATTERN.test(entry)) {
      return { values: [], valid: false };
    }
    observed.push(entry);
  }
  return { values: observed, valid: true };
}

function classifyCatalogQueryResult(
  result: ExecutionPgQueryResult,
  oraclePhase: OraclePhase,
): { ok: boolean; snapshot: PhaseSnapshot; mismatches: readonly string[] } {
  const stdout = extractCatalogJsonLine(result);
  const raw = normalizeCatalogRawWireShapes(parseRuntimeCatalogOutput(stdout));
  const snapshot = deriveRuntimePhaseSnapshot(raw, oraclePhase);
  const comparison = compareRuntimePhaseSnapshot(snapshot, oraclePhase);
  return {
    ok: comparison.ok,
    snapshot,
    mismatches: comparison.mismatches,
  };
}

export type InTransactionPostProbeValidation = {
  readonly postProbeId: string;
  readonly priorOraclePhase: string;
  readonly postOraclePhase: string;
  readonly expectedPostHistoryPrefix: readonly string[];
  readonly priorCompareOk: boolean;
  readonly postCompareOk: boolean;
  readonly historyPrefixExact: boolean;
  readonly currentVersionDeltaPresent: boolean;
  readonly unexpectedDeltaZero: boolean;
  readonly ok: boolean;
};

export function buildInTransactionPostProbeDiagnostic(
  stepId: StepId,
  result: ExecutionPgQueryResult,
  oraclePhases: readonly OraclePhase[],
): InTransactionPostProbeDiagnostic {
  const postProbeId = STEP_TO_POST_PROBE[stepId];
  const registryProbe = getRuntimeProbeById(postProbeId);
  const registryProbeFound = registryProbe !== null && registryProbe !== undefined;
  const registryKindOrdinary = registryProbeFound && registryProbe!.kind === 'ORDINARY';
  const postOraclePhase = expectedOraclePhaseForStep(stepId, 'post');
  const expectedPostHistoryPrefix = expectedHistoryPrefixForStep(stepId, 'post');
  const priorOracle = getOraclePhase(oraclePhases, expectedOraclePhaseForStep(stepId, 'prior'));
  const postOracle = getOraclePhase(oraclePhases, postOraclePhase);
  const priorCompare = classifyCatalogQueryResult(result, priorOracle);
  const postCompare = classifyCatalogQueryResult(result, postOracle);
  const observedHistoryPrefixShape = extractObservedHistoryPrefixShape(postCompare.snapshot);
  const observedHistoryPrefix = observedHistoryPrefixShape.valid ? observedHistoryPrefixShape.values : [];
  const historyPrefixExact = historyPrefixMatches(postCompare.snapshot, expectedPostHistoryPrefix);
  const postForbiddenViolations = postCompare.snapshot.forbidden_violations as string[];
  const unexpectedDeltaZero = postForbiddenViolations.length === 0;
  const currentVersionDeltaPresent = !priorCompare.ok;
  const priorMismatchCategories = sanitizePublicMismatchCategories(priorCompare.mismatches);
  const postMismatchSources: unknown[] = [...postCompare.mismatches];
  if (!observedHistoryPrefixShape.valid) {
    postMismatchSources.push(HISTORY_PREFIX_DIAGNOSTIC_SHAPE_INVALID);
  }
  const postMismatchCategories = sanitizePublicMismatchCategories(postMismatchSources);
  return {
    selectedStep: stepId,
    postProbeId,
    registryProbeFound,
    registryKindOrdinary,
    registryIdMatch: registryKindOrdinary && registryProbe!.id === postProbeId,
    registryPhaseMatch: registryKindOrdinary && registryProbe!.phase === postOraclePhase,
    registryPrefixMatch:
      registryKindOrdinary &&
      stableHistoryPrefix(registryProbe!.expectedHistoryPrefix) === stableHistoryPrefix(expectedPostHistoryPrefix),
    expectedHistoryPrefix: [...expectedPostHistoryPrefix],
    observedHistoryPrefix,
    historyPrefixExact,
    priorCompareOk: priorCompare.ok,
    postCompareOk: postCompare.ok,
    currentVersionDeltaPresent,
    unexpectedDeltaZero,
    priorMismatchCategories,
    postMismatchCategories,
    priorMismatchCount: priorCompare.mismatches.length,
    postMismatchCount: postCompare.mismatches.length,
    postForbiddenViolationCount: postForbiddenViolations.length,
    normalizationProfile: CATALOG_PG_WIRE_NORMALIZATION_PROFILE,
  };
}

export function validateInTransactionPostProbe(
  stepId: StepId,
  result: ExecutionPgQueryResult,
  oraclePhases: readonly OraclePhase[],
): InTransactionPostProbeValidation {
  const postProbeId = STEP_TO_POST_PROBE[stepId];
  const registryProbe = getRuntimeProbeById(postProbeId);
  if (!registryProbe || registryProbe.kind !== 'ORDINARY') {
    throw new Error('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  const priorOraclePhase = expectedOraclePhaseForStep(stepId, 'prior');
  const postOraclePhase = expectedOraclePhaseForStep(stepId, 'post');
  const expectedPostHistoryPrefix = expectedHistoryPrefixForStep(stepId, 'post');
  const priorOracle = getOraclePhase(oraclePhases, priorOraclePhase);
  const postOracle = getOraclePhase(oraclePhases, postOraclePhase);
  const priorCompare = classifyCatalogQueryResult(result, priorOracle);
  const postCompare = classifyCatalogQueryResult(result, postOracle);
  const historyPrefixExact = historyPrefixMatches(postCompare.snapshot, expectedPostHistoryPrefix);
  const unexpectedDeltaZero = (postCompare.snapshot.forbidden_violations as string[]).length === 0;
  const currentVersionDeltaPresent = !priorCompare.ok;
  const ok =
    registryProbe.id === postProbeId &&
    registryProbe.phase === postOraclePhase &&
    stableHistoryPrefix(registryProbe.expectedHistoryPrefix) === stableHistoryPrefix(expectedPostHistoryPrefix) &&
    historyPrefixExact &&
    currentVersionDeltaPresent &&
    postCompare.ok &&
    unexpectedDeltaZero;
  return {
    postProbeId,
    priorOraclePhase,
    postOraclePhase,
    expectedPostHistoryPrefix,
    priorCompareOk: priorCompare.ok,
    postCompareOk: postCompare.ok,
    historyPrefixExact,
    currentVersionDeltaPresent,
    unexpectedDeltaZero,
    ok,
  };
}

function stableHistoryPrefix(prefix: readonly string[]): string {
  return prefix.join('\u001f');
}

function resolveNowMs(deps: PreviewRemoteExecutionDeps): () => number {
  return deps.nowMs ?? (() => Date.now());
}

function isDeadlineExceeded(
  deps: PreviewRemoteExecutionDeps,
  startedAtMs: number,
  deadlineMs: number,
): boolean {
  if (deps.deadlineRunner) {
    return deps.deadlineRunner.isExceeded(startedAtMs, deadlineMs);
  }
  return resolveNowMs(deps)() - startedAtMs > deadlineMs;
}

function parseP1PriorBootstrapResult(result: ExecutionPgQueryResult): {
  readonly classification: string;
  readonly proceed: boolean;
} {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  const row = result.rows[0]!;
  const keys = Object.keys(row);
  for (const column of P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS) {
    if (!keys.includes(column)) {
      throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
    }
  }
  if (keys.length !== P1_PRIOR_BOOTSTRAP_PRECONDITION_RESULT_COLUMNS.length) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  const classification = row.bootstrap_precondition_classification;
  const proceed = row.bootstrap_precondition_proceed;
  const hold = row.bootstrap_precondition_hold;
  if (typeof classification !== 'string' || typeof proceed !== 'boolean' || typeof hold !== 'boolean') {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  const arrayOrNullColumns = ['applied_versions', 'duplicate_versions', 'unexpected_history_versions'] as const;
  for (const column of arrayOrNullColumns) {
    const value = row[column];
    if (value !== null && !Array.isArray(value)) {
      throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
    }
  }
  const nullableStringColumns = ['history_schema_owner', 'history_relation_relkind', 'history_relation_owner'] as const;
  for (const column of nullableStringColumns) {
    const value = row[column];
    if (value !== null && typeof value !== 'string') {
      throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
    }
  }
  const booleanColumns = [
    'history_schema_exists',
    'history_relation_exists',
    'history_relation_exact_shape',
    'history_primary_key_on_version_exact',
  ] as const;
  for (const column of booleanColumns) {
    if (typeof row[column] !== 'boolean') {
      throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
    }
  }
  if (parseFinitePgInt4WireNumber(row.history_live_column_count) === null) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  const historyRowCount = parseCanonicalPgInt8WireString(row.history_row_count);
  if (historyRowCount === null) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  if (proceed === true && hold === true) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  if (proceed === true && classification !== 'CLEANLY_ABSENT') {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  if (proceed === true && classification === 'CLEANLY_ABSENT' && historyRowCount !== 0) {
    throw new Error('HOLD_BOOTSTRAP_PRECONDITION');
  }
  return {
    classification,
    proceed,
  };
}

export function loadVerifiedProbeSqlBundle(
  repoRoot: string,
):
  | { readonly ok: true; readonly bundle: VerifiedProbeSqlBundle }
  | { readonly ok: false; readonly holdReasonCode: PreviewRemoteApplyHoldCode } {
  const foundationValidation = validateExecutionSqlAuthorityFoundation(repoRoot);
  if (foundationValidation.ok !== true) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORITY_IDENTITY_MISMATCH' };
  }
  const p1Path = join(repoRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
  const catalogPath = join(repoRoot, FOUNDATION_REL_PATHS.catalogExtractor);
  let p1Bytes: Buffer;
  let catalogBytes: Buffer;
  try {
    p1Bytes = readFileSync(p1Path);
    catalogBytes = readFileSync(catalogPath);
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORITY_IDENTITY_MISMATCH' };
  }
  const p1Expected = FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p1PriorBootstrapPrecondition;
  const catalogExpected = FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor;
  if (
    p1Bytes.length !== p1Expected.bytes ||
    createHash('sha256').update(p1Bytes).digest('hex') !== p1Expected.sha256
  ) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORITY_IDENTITY_MISMATCH' };
  }
  if (
    catalogBytes.length !== catalogExpected.bytes ||
    createHash('sha256').update(catalogBytes).digest('hex') !== catalogExpected.sha256
  ) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORITY_IDENTITY_MISMATCH' };
  }
  return {
    ok: true,
    bundle: {
      p1PriorBootstrapPreconditionSql: p1Bytes.toString('utf8').trim(),
      catalogExtractorSql: catalogBytes.toString('utf8').trim(),
    },
  };
}

function resolveProbeSqlFromBundle(bundle: VerifiedProbeSqlBundle, probeId: string): string {
  if (probeId === 'PRIOR_P1') {
    return bundle.p1PriorBootstrapPreconditionSql;
  }
  return bundle.catalogExtractorSql;
}

function loadNormalizedStatements(
  repoRoot: string,
  stepId: StepId,
  expectedSourceSha256: string,
  expectedCompositeSha256: string,
): readonly string[] {
  const identity = EXPECTED_REVISION7_VERSION_IDENTITIES.find((entry) => entry.label === stepId);
  if (!identity) {
    throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
  }
  const rawBytes = readFileSync(join(repoRoot, identity.path));
  validateMigrationSourceBytes(rawBytes, expectedSourceSha256, stepId as VersionLabel);
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  const { normalized } = applyOptionARemoval(stepId as VersionLabel, statements);
  if (normalized.length !== EXPECTED_NORMALIZED_STATEMENT_COUNTS[stepId]) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  if (compositeStreamSha256(normalized) !== expectedCompositeSha256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return normalized;
}

function validateImplementationAuthority(repoRoot: string): PreviewRemoteApplyHoldCode | null {
  const foundation = loadExecutionSqlAuthorityFoundationDocument(repoRoot);
  if (foundation.identifier !== EXECUTION_SQL_AUTHORITY_FOUNDATION_ID) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  const binding = foundation.remote_executor_implementation;
  if (!binding?.path || binding.path !== FOUNDATION_REL_PATHS.executorImplementationJson) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (binding.code_implemented !== true) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  return null;
}

function validatePostConnectGuard(
  result: ExecutionPgQueryResult,
  expected: ExpectedAuthorizationBinding,
): boolean {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    return false;
  }
  const row = result.rows[0]!;
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
  return databaseName === expected.databaseName && userName === expected.expectedCurrentUser;
}

function historyPrefixMatches(snapshot: PhaseSnapshot, expectedPrefix: readonly string[]): boolean {
  const actual = (snapshot.history_prefix as readonly unknown[]).map(String);
  if (actual.length !== expectedPrefix.length) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expectedPrefix[index]) return false;
  }
  return true;
}

type CatalogOracleCompare = {
  readonly snapshot: PhaseSnapshot;
  readonly ok: boolean;
};

function phaseAlignedUnexpectedDeltaZero(
  priorCompare: CatalogOracleCompare,
  nextCompare: CatalogOracleCompare,
): boolean {
  const priorExact = priorCompare.ok;
  const nextExact = nextCompare.ok;
  if (priorExact && !nextExact) {
    return (priorCompare.snapshot.forbidden_violations as string[]).length === 0;
  }
  if (nextExact && !priorExact) {
    return (nextCompare.snapshot.forbidden_violations as string[]).length === 0;
  }
  if (priorExact && nextExact) {
    return (
      (priorCompare.snapshot.forbidden_violations as string[]).length === 0 &&
      (nextCompare.snapshot.forbidden_violations as string[]).length === 0
    );
  }
  return false;
}

function buildP2ThroughP7AckPredicates(
  stepId: Exclude<StepId, 'P1'>,
  priorSnapshot: PhaseSnapshot,
  postSnapshot: PhaseSnapshot,
  priorCompareOk: boolean,
  postCompareOk: boolean,
): P2ThroughP7AckPredicateFacts {
  return {
    exactPriorHistoryPrefix: historyPrefixMatches(priorSnapshot, expectedHistoryPrefixForStep(stepId, 'prior')),
    exactPriorOraclePhase: priorCompareOk,
    currentVersionDeltaAbsent: priorCompareOk && !postCompareOk,
    unexpectedDeltaZero: phaseAlignedUnexpectedDeltaZero(
      { snapshot: priorSnapshot, ok: priorCompareOk },
      { snapshot: postSnapshot, ok: postCompareOk },
    ),
    targetIdentityExact: true,
    exactNextHistoryPrefix: historyPrefixMatches(postSnapshot, expectedHistoryPrefixForStep(stepId, 'post')),
    exactNextOraclePhase: postCompareOk,
  };
}

function mapStageToFailureClass(stage: ExecutionStage, transportUnusable: boolean): PreCommitFailureClass {
  if (stage === 'PRE_CONNECT' || stage === 'CREDENTIAL_ACQUIRED' || stage === 'CONNECTED_PRE_TRANSACTION') {
    return 'PRE_TRANSACTION_SETUP_REJECTION';
  }
  if (transportUnusable || stage === 'COMMIT_SENT') {
    return 'PRE_COMMIT_TRANSPORT_LOSS';
  }
  return 'IN_TRANSACTION_SERVER_REJECTION';
}

async function handlePreCommitFailure(
  mutationClient: ExecutionPgClient | null,
  failureClass: PreCommitFailureClass,
): Promise<PreCommitFailureClass> {
  let actualFailureClass = failureClass;
  const disposition = buildPreCommitFailureDisposition({
    failureClass: actualFailureClass,
    explicitReadOnlyClassifierSession:
      actualFailureClass === 'IN_TRANSACTION_SERVER_REJECTION' ||
      actualFailureClass === 'PRE_COMMIT_TRANSPORT_LOSS' ||
      actualFailureClass === 'ROLLBACK_ACK_UNCERTAIN',
  });
  if (!mutationClient) {
    return actualFailureClass;
  }
  if (actualFailureClass === 'IN_TRANSACTION_SERVER_REJECTION') {
    if (disposition.invokeAckClassifierLifecycle && mutationClient.getConnectionState() === 'open') {
      try {
        const rollbackResult = await mutationClient.rollback();
        if (!rollbackResult.acknowledged) {
          actualFailureClass = 'ROLLBACK_ACK_UNCERTAIN';
          mutationClient.markUnusable();
        }
      } catch {
        mutationClient.markUnusable();
        actualFailureClass = 'ROLLBACK_ACK_UNCERTAIN';
      }
    }
  } else if (actualFailureClass === 'PRE_COMMIT_TRANSPORT_LOSS' || actualFailureClass === 'ROLLBACK_ACK_UNCERTAIN') {
    mutationClient.markUnusable();
  }
  try {
    await mutationClient.close();
  } catch {
    mutationClient.markUnusable();
  }
  return actualFailureClass;
}

function validateFreshTargetGate(
  repoRoot: string,
  authorizationDocument: unknown,
  deps: PreviewRemoteExecutionDeps,
): PreviewRemoteApplyHoldCode | null {
  const bindingResult = validateNonsecretTargetBinding(authorizationDocument);
  if (!bindingResult.ok) {
    return bindingResult.outcome;
  }
  const repository = deps.repositoryFacts?.();
  if (!repository) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  const envelope = snapshotValidatedAuthorizationEnvelope(authorizationDocument);
  const suppliedRepoHold = validateSuppliedRepositoryIdentity(envelope.observed, repository);
  if (suppliedRepoHold) return suppliedRepoHold;
  const repoHold = validateRepositoryIdentityFacts(repoRoot, repository);
  if (repoHold) return repoHold;
  const foundationValidation = validateExecutionSqlAuthorityFoundation(repoRoot);
  if (!foundationValidation.ok) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  return null;
}

async function runFreshReadonlyAckClassification(
  repoRoot: string,
  authorizationDocument: unknown,
  binding: ExpectedAuthorizationBinding,
  probeBundle: VerifiedProbeSqlBundle,
  secretsRelease: () => ParsedConnectionSecrets,
  deps: PreviewRemoteExecutionDeps,
  lifecycle: 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE' | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
  stepId: StepId,
  commitResponseClass: CommitResponseClass | null,
  oraclePhases: readonly OraclePhase[],
): Promise<{
  ackState: string | null;
  disposition: string;
  postCommitLifecycle: 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE' | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE';
  completed: boolean;
}> {
  const freshGateHold = validateFreshTargetGate(repoRoot, authorizationDocument, deps);
  if (freshGateHold) {
    return {
      ackState: null,
      disposition: 'MANDATORY_STOP',
      postCommitLifecycle: lifecycle,
      completed: true,
    };
  }

  const freshStartedAtMs = resolveNowMs(deps)();
  const freshDeadlineMs =
    lifecycle === 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
      ? TIMEOUT_POLICY.values.postCommitVerificationMs
      : TIMEOUT_POLICY.values.ackClassifierMs;

  const transport = createExecutionPgTransport(deps.verifierTransportFactory ?? deps.transportFactory ?? {});
  const configResult = buildClientConfig(binding, secretsRelease());
  if (typeof configResult === 'string') {
    throw new Error(configResult);
  }
  const client = transport.createClient(configResult);
  try {
    if (isDeadlineExceeded(deps, freshStartedAtMs, freshDeadlineMs)) {
      return {
        ackState: null,
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }
    await client.connect();
    const guardResult = await client.query(POST_CONNECT_GUARD_SQL);
    if (!validatePostConnectGuard(guardResult, binding)) {
      throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
    }
    await client.query(FRESH_READONLY_BEGIN_SQL);

    if (isDeadlineExceeded(deps, freshStartedAtMs, freshDeadlineMs)) {
      return {
        ackState: null,
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }

    try {
      await client.query(buildFreshLocalStatementTimeoutSql(freshDeadlineMs));
    } catch {
      return {
        ackState: null,
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }

    if (isDeadlineExceeded(deps, freshStartedAtMs, freshDeadlineMs)) {
      return {
        ackState: null,
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }

    if (lifecycle === 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE') {
      const probeId = stepId === 'P7' ? 'FINAL_P7' : STEP_TO_POST_PROBE[stepId];
      const extractorSql = resolveProbeSqlFromBundle(probeBundle, probeId);
      const catalogResult = await client.query(extractorSql);
      const postOraclePhaseId = stepId === 'P7' ? 'P7' : expectedOraclePhaseForStep(stepId, 'post');
      const postOracle = getOraclePhase(oraclePhases, postOraclePhaseId);
      const postCompare = classifyCatalogQueryResult(catalogResult, postOracle);
      if (!postCompare.ok) {
        return {
          ackState: 'CONTRADICTORY_OR_DRIFTED',
          disposition: 'MANDATORY_STOP',
          postCommitLifecycle: lifecycle,
          completed: true,
        };
      }
      return {
        ackState: 'DEFINITELY_COMMITTED',
        disposition:
          stepId === 'P7'
            ? 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION'
            : 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }

    if (stepId === 'P1') {
      const bootstrapResult = await client.query(resolveProbeSqlFromBundle(probeBundle, 'PRIOR_P1'));
      const bootstrapParsed = parseP1PriorBootstrapResult(bootstrapResult);
      const { classification, proceed } = bootstrapParsed;

      if (classification === 'CLEANLY_ABSENT' && proceed) {
        const ack = classifyAckState({
          phase: 'P1',
          predicates: {
            historyRelationAbsent: true,
            exactP0OraclePhase: true,
            p1DeltaAbsent: true,
            unexpectedDeltaZero: true,
            targetIdentityExact: true,
            historyRelationExact: false,
            historyPrefixExactlyP1: false,
            exactP1OraclePhase: false,
          },
        });
        void commitResponseClass;
        return { ackState: ack.ackState, disposition: ack.disposition, postCommitLifecycle: lifecycle, completed: true };
      }

      if (classification === 'EXACT_COMPATIBLE_EMPTY' || classification === 'EXACT_COMPATIBLE_WITH_VERSIONS') {
        const catalogResult = await client.query(resolveProbeSqlFromBundle(probeBundle, STEP_TO_POST_PROBE.P1));
        const postOracle = getOraclePhase(oraclePhases, 'P1');
        const postCompare = classifyCatalogQueryResult(catalogResult, postOracle);
        const ackInput: AckClassifierInput = {
          phase: 'P1',
          predicates: {
            historyRelationAbsent: false,
            exactP0OraclePhase: false,
            p1DeltaAbsent: false,
            unexpectedDeltaZero: (postCompare.snapshot.forbidden_violations as string[]).length === 0,
            targetIdentityExact: true,
            historyRelationExact: true,
            historyPrefixExactlyP1: historyPrefixMatches(
              postCompare.snapshot,
              expectedHistoryPrefixForStep('P1', 'post'),
            ),
            exactP1OraclePhase: postCompare.ok,
          },
        };
        void commitResponseClass;
        const ack = classifyAckState(ackInput);
        return { ackState: ack.ackState, disposition: ack.disposition, postCommitLifecycle: lifecycle, completed: true };
      }

      return {
        ackState: 'CONTRADICTORY_OR_DRIFTED',
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }

    const extractorSql = resolveProbeSqlFromBundle(probeBundle, STEP_TO_POST_PROBE[stepId]);
    const catalogResult = await client.query(extractorSql);
    const priorOracle = getOraclePhase(oraclePhases, expectedOraclePhaseForStep(stepId, 'prior'));
    const nextOracle = getOraclePhase(oraclePhases, expectedOraclePhaseForStep(stepId, 'post'));
    const priorCompare = classifyCatalogQueryResult(catalogResult, priorOracle);
    const nextCompare = classifyCatalogQueryResult(catalogResult, nextOracle);
    const ackInput = {
      phase: stepId as Exclude<StepId, 'P1'>,
      predicates: buildP2ThroughP7AckPredicates(
        stepId,
        priorCompare.snapshot,
        nextCompare.snapshot,
        priorCompare.ok,
        nextCompare.ok,
      ),
    } satisfies AckClassifierInput;
    void commitResponseClass;
    const ack = classifyAckState(ackInput);
    return { ackState: ack.ackState, disposition: ack.disposition, postCommitLifecycle: lifecycle, completed: true };
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch {
      client.markUnusable();
    }
    await client.close();
  }
}

export async function executePreviewRemoteExecution(
  input: PreviewRemoteExecutionInput,
  deps: PreviewRemoteExecutionDeps = {},
): Promise<PreviewRemoteExecutionResult> {
  let credentialCleanup: (() => void) | null = null;
  let mutationClient: ExecutionPgClient | null = null;
  let publicHandle: ExecutionCredentialPublicHandle | null = null;
  let secretsRelease: (() => ParsedConnectionSecrets) | null = null;
  let expectedBinding: ExpectedAuthorizationBinding | null = null;
  let probeBundle: VerifiedProbeSqlBundle | null = null;
  let executionStage: ExecutionStage = 'PRE_CONNECT';
  const transportProfile = resolveTransportProfile(deps);
  let runtimeEvidence = createInitialRuntimeEvidence(executionStage, transportProfile);
  let oraclePhases: readonly OraclePhase[] = [];

  const invokeFreshClassifier = async (
    lifecycle: 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE' | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
    commitResponseClass: CommitResponseClass | null,
  ) => {
    if (!secretsRelease || !expectedBinding || !probeBundle) {
      return null;
    }
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
      freshReadonlyCheckExecuted: true,
    });
    try {
      return await runFreshReadonlyAckClassification(
        input.repoRoot,
        input.authorizationDocument,
        expectedBinding,
        probeBundle,
        secretsRelease,
        deps,
        lifecycle,
        input.selectedStep,
        commitResponseClass,
        oraclePhases,
      );
    } catch {
      return {
        ackState: null,
        disposition: 'MANDATORY_STOP',
        postCommitLifecycle: lifecycle,
        completed: true,
      };
    }
  };

  const finishPreCommitHold = async (
    holdReasonCode: PreviewRemoteApplyHoldCode,
    failureClass: PreCommitFailureClass,
    commitResponseClass: CommitResponseClass | null = null,
  ): Promise<PreviewRemoteExecutionHold> => {
    const actualFailureClass = await handlePreCommitFailure(mutationClient, failureClass);
    mutationClient = null;
    if (
      actualFailureClass === 'IN_TRANSACTION_SERVER_REJECTION' ||
      actualFailureClass === 'PRE_COMMIT_TRANSPORT_LOSS' ||
      actualFailureClass === 'ROLLBACK_ACK_UNCERTAIN'
    ) {
      executionStage = 'FRESH_READONLY_CLASSIFICATION';
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
      const classifierOutcome = await invokeFreshClassifier('ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE', commitResponseClass);
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
        freshReadonlyCheckExecuted: true,
        freshReadonlyCheckCompleted: classifierOutcome?.completed === true,
      });
      return buildHold(holdReasonCode, runtimeEvidence, {
        ...buildClassifierHoldOutcome(classifierOutcome, commitResponseClass),
      });
    }
    return buildHold(holdReasonCode, runtimeEvidence);
  };

  try {
    const authorityHold = validateImplementationAuthority(input.repoRoot);
    if (authorityHold) return buildHold(authorityHold, runtimeEvidence);

    validateRuntimeProbeRegistry();
    validateTimeoutPolicyInvariants();

    try {
      oraclePhases = loadOraclePhases(input.repoRoot);
    } catch {
      return buildHold('HOLD_AUTHORITY_IDENTITY_MISMATCH', runtimeEvidence);
    }

    const bundle = loadAuthorityBundle(input.repoRoot);

    const repository = deps.repositoryFacts?.();
    if (!repository) {
      return buildHold('HOLD_REPO_IDENTITY_MISMATCH', runtimeEvidence);
    }

    const bindingResult = validateNonsecretTargetBinding(input.authorizationDocument);
    if (!bindingResult.ok) {
      return buildHold(bindingResult.outcome, runtimeEvidence);
    }
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
      authorizationBindingAccepted: true,
    });

    const envelope = snapshotValidatedAuthorizationEnvelope(input.authorizationDocument);
    const expected = envelope.expected;
    expectedBinding = expected;

    if (input.credentialMethod !== expected.credentialMethod) {
      return buildHold('HOLD_CREDENTIAL_METHOD_INVALID', runtimeEvidence);
    }
    if (input.selectedStep !== expected.selectedStep) {
      return buildHold('HOLD_EXECUTION_NOT_AUTHORIZED', runtimeEvidence);
    }

    const suppliedRepoHold = validateSuppliedRepositoryIdentity(envelope.observed, repository);
    if (suppliedRepoHold) return buildHold(suppliedRepoHold, runtimeEvidence);

    const repoHold = validateRepositoryIdentityFacts(input.repoRoot, repository);
    if (repoHold) return buildHold(repoHold, runtimeEvidence);

    if (repository.branch !== EXPECTED_BRANCH) {
      return buildHold('HOLD_REPO_IDENTITY_MISMATCH', runtimeEvidence);
    }

    const probeBundleResult = loadVerifiedProbeSqlBundle(input.repoRoot);
    if (!probeBundleResult.ok) {
      return buildHold(probeBundleResult.holdReasonCode, runtimeEvidence);
    }
    probeBundle = probeBundleResult.bundle;

    const credentialResult = await acquireExecutionCredentials(
      input.credentialMethod,
      bindingResult.receipt,
      expected,
      deps.credentialAcquirerDeps,
    );
    executionStage = 'CREDENTIAL_ACQUIRED';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
    if (!credentialResult.ok) {
      return buildHold(credentialResult.holdReasonCode, runtimeEvidence);
    }
    publicHandle = credentialResult.handle;
    credentialCleanup = credentialResult.cleanup;
    secretsRelease = credentialResult.releaseConnectionSecrets;

    const configResult = buildClientConfig(expected, secretsRelease());
    if (typeof configResult === 'string') {
      return buildHold(configResult, runtimeEvidence);
    }

    const transport = createExecutionPgTransport(deps.transportFactory ?? {});
    mutationClient = transport.createClient(configResult);

    await mutationClient.connect();
    executionStage = 'CONNECTED_PRE_TRANSACTION';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { connectionOpened: true });

    const guardResult = await mutationClient.query(POST_CONNECT_GUARD_SQL);
    if (!validatePostConnectGuard(guardResult, expected)) {
      await mutationClient.close();
      mutationClient = null;
      return buildHold('HOLD_EXECUTION_NOT_AUTHORIZED', runtimeEvidence);
    }

    for (const setting of EXPECTED_SESSION_SETTINGS.statements) {
      await mutationClient.query(setting.sql);
    }

    await mutationClient.begin();
    executionStage = 'IN_TRANSACTION_PRIOR';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { transactionBegan: true });

    const priorProbeId = STEP_TO_PRIOR_PROBE[input.selectedStep];
    const priorResult = await mutationClient.query(resolveProbeSqlFromBundle(probeBundle, priorProbeId));

    if (input.selectedStep === 'P1') {
      const priorParsed = parseP1PriorBootstrapResult(priorResult);
      if (priorParsed.classification !== 'CLEANLY_ABSENT' || !priorParsed.proceed) {
        return await finishPreCommitHold('HOLD_BOOTSTRAP_PRECONDITION', 'IN_TRANSACTION_SERVER_REJECTION');
      }
      executionStage = 'IN_TRANSACTION_BOOTSTRAP';
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
      for (const ddl of HISTORY_BOOTSTRAP_DDL_STATEMENTS) {
        await mutationClient.query(ddl.sql);
      }
    } else {
      const priorOracle = getOraclePhase(oraclePhases, expectedOraclePhaseForStep(input.selectedStep, 'prior'));
      const priorCompare = classifyCatalogQueryResult(priorResult, priorOracle);
      if (!priorCompare.ok) {
        return await finishPreCommitHold('HOLD_INVALID_HISTORY_PREFIX', 'IN_TRANSACTION_SERVER_REJECTION');
      }
    }

    executionStage = 'IN_TRANSACTION_MUTATION';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
    const mutationStartedAtMs = resolveNowMs(deps)();
    const contractVersion = bundle.contract.versions.find((entry) => entry.label === input.selectedStep);
    if (!contractVersion) {
      return await finishPreCommitHold('HOLD_AUTHORITY_IDENTITY_MISMATCH', 'IN_TRANSACTION_SERVER_REJECTION');
    }
    const normalizedStatements = loadNormalizedStatements(
      input.repoRoot,
      input.selectedStep,
      contractVersion.frozen_source_sha256,
      contractVersion.normalized_stream_composite_sha256,
    );
    for (const statement of normalizedStatements) {
      if (isDeadlineExceeded(deps, mutationStartedAtMs, TIMEOUT_POLICY.values.mutationDeadlineMs)) {
        mutationClient.markUnusable();
        return await finishPreCommitHold('HOLD_UNEXPECTED_INTERNAL', 'PRE_COMMIT_TRANSPORT_LOSS');
      }
      if (!runtimeEvidence.mutationStatementsStarted) {
        runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { mutationStatementsStarted: true });
      }
      await mutationClient.query(statement);
    }

    executionStage = 'IN_TRANSACTION_HISTORY';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
    const identity = EXPECTED_REVISION7_VERSION_IDENTITIES.find((entry) => entry.label === input.selectedStep)!;
    const historyPayload = buildPolicy2HistoryPayload({
      version: identity.version,
      name: identity.name,
      normalizedStatements,
      expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
    });
    if (isDeadlineExceeded(deps, mutationStartedAtMs, TIMEOUT_POLICY.values.mutationDeadlineMs)) {
      mutationClient.markUnusable();
      return await finishPreCommitHold('HOLD_UNEXPECTED_INTERNAL', 'PRE_COMMIT_TRANSPORT_LOSS');
    }
    await mutationClient.query(HISTORY_INSERT_SQL_METADATA, [
      historyPayload.version,
      historyPayload.statements,
      historyPayload.name,
    ]);
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { historyInsertExecuted: true });

    executionStage = 'IN_TRANSACTION_POST';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
    if (isDeadlineExceeded(deps, mutationStartedAtMs, TIMEOUT_POLICY.values.mutationDeadlineMs)) {
      mutationClient.markUnusable();
      return await finishPreCommitHold('HOLD_UNEXPECTED_INTERNAL', 'PRE_COMMIT_TRANSPORT_LOSS');
    }
    const postResult = await mutationClient.query(
      resolveProbeSqlFromBundle(probeBundle, STEP_TO_POST_PROBE[input.selectedStep]),
    );
    const postValidation = validateInTransactionPostProbe(input.selectedStep, postResult, oraclePhases);
    if (!postValidation.ok) {
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
        inTransactionPostProbeDiagnostic: buildInTransactionPostProbeDiagnostic(
          input.selectedStep,
          postResult,
          oraclePhases,
        ),
      });
      return await finishPreCommitHold('HOLD_INVALID_HISTORY_PREFIX', 'IN_TRANSACTION_SERVER_REJECTION');
    }

    if (isDeadlineExceeded(deps, mutationStartedAtMs, TIMEOUT_POLICY.values.mutationDeadlineMs)) {
      mutationClient.markUnusable();
      return await finishPreCommitHold('HOLD_UNEXPECTED_INTERNAL', 'PRE_COMMIT_TRANSPORT_LOSS');
    }

    executionStage = 'COMMIT_SENT';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { commitSent: true });
    const commitResult = await mutationClient.commit();
    const commitResponseClass = commitResult.responseClass;
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { commitResponseClass });
    await mutationClient.close();
    mutationClient = null;
    executionStage = 'ORIGINAL_CONNECTION_CLOSED';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);

    const branch = branchAfterCommitResponseClass({
      responseClass: commitResponseClass,
      originalConnectionClosed: true,
    });
    if (!branch.ok || !branch.lifecycle) {
      return buildHold('HOLD_UNEXPECTED_INTERNAL', runtimeEvidence);
    }

    executionStage = 'FRESH_READONLY_CLASSIFICATION';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, { freshReadonlyCheckExecuted: true });
    let lifecycleOutcome: ClassifierLifecycleOutcome | null;
    let lifecycleCompleted = false;
    try {
      const freshResult = await runFreshReadonlyAckClassification(
        input.repoRoot,
        input.authorizationDocument,
        expected,
        probeBundle,
        secretsRelease,
        deps,
        branch.lifecycle,
        input.selectedStep,
        commitResponseClass,
        oraclePhases,
      );
      lifecycleCompleted = freshResult.completed;
      lifecycleOutcome = {
        ackState: freshResult.ackState,
        disposition: freshResult.disposition,
        postCommitLifecycle: freshResult.postCommitLifecycle,
      };
    } catch {
      lifecycleOutcome = null;
      lifecycleCompleted = true;
    }
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
      freshReadonlyCheckExecuted: true,
      freshReadonlyCheckCompleted: lifecycleCompleted,
    });

    if (!isHumanReviewClassifierSuccess(lifecycleOutcome)) {
      return buildHold('HOLD_EXECUTION_NOT_AUTHORIZED', runtimeEvidence, {
        ...buildClassifierHoldOutcome(lifecycleOutcome, commitResponseClass),
      });
    }

    executionStage = 'COMPLETE';
    runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
    return {
      mode: 'PREVIEW_REMOTE_EXECUTION_HUMAN_REVIEW_REQUIRED',
      holdReasonCode: null,
      runtimeEvidence,
      selectedStep: input.selectedStep,
      targetBindingIdentifier: bindingResult.receipt.targetBindingIdentifier,
      credentialMethod: publicHandle.credentialMethod,
      cleanupToken: publicHandle.cleanupToken,
      commitResponseClass,
      postCommitLifecycle: lifecycleOutcome.postCommitLifecycle,
      ackState: lifecycleOutcome.ackState,
      disposition: lifecycleOutcome.disposition,
      humanReviewRequired: true,
      includesFinalP7Verification:
        input.selectedStep === 'P7' && branch.lifecycle === 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE',
      ...STATIC_EXECUTION_GATE,
    };
  } catch (error) {
    const hold = normalizeExecutionTransportError(error);
    const transportUnusable = mutationClient?.getConnectionState() === 'unusable';

    if (executionStage === 'COMMIT_SENT') {
      if (mutationClient && mutationClient.getConnectionState() !== 'closed') {
        try {
          await mutationClient.close();
        } catch {
          mutationClient.markUnusable();
        }
      }
      mutationClient = null;
      executionStage = 'FRESH_READONLY_CLASSIFICATION';
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage);
      const classifierOutcome = await invokeFreshClassifier(
        'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
        'ACK_UNCERTAIN_OR_MISSING',
      );
      runtimeEvidence = withRuntimeStage(runtimeEvidence, executionStage, {
        freshReadonlyCheckExecuted: true,
        freshReadonlyCheckCompleted: classifierOutcome?.completed === true,
        commitResponseClass: 'ACK_UNCERTAIN_OR_MISSING',
      });
      return buildHold(hold, runtimeEvidence, {
        ...buildClassifierHoldOutcome(classifierOutcome, 'ACK_UNCERTAIN_OR_MISSING'),
      });
    }

    const failureClass = mapStageToFailureClass(executionStage, transportUnusable === true);
    if (failureClass === 'PRE_TRANSACTION_SETUP_REJECTION') {
      if (mutationClient && mutationClient.getConnectionState() === 'open') {
        try {
          await mutationClient.close();
        } catch {
          mutationClient.markUnusable();
        }
      }
      mutationClient = null;
      return buildHold(hold, runtimeEvidence);
    }

    if (
      failureClass === 'IN_TRANSACTION_SERVER_REJECTION' ||
      failureClass === 'PRE_COMMIT_TRANSPORT_LOSS'
    ) {
      return await finishPreCommitHold(hold, failureClass);
    }

    if (mutationClient && mutationClient.getConnectionState() !== 'closed') {
      try {
        await mutationClient.close();
      } catch {
        mutationClient.markUnusable();
      }
    }
    mutationClient = null;
    return buildHold(hold, runtimeEvidence);
  } finally {
    credentialCleanup?.();
    if (mutationClient && mutationClient.getConnectionState() !== 'closed') {
      try {
        await mutationClient.close();
      } catch {
        // ignore
      }
    }
  }
}

export function serializePreviewRemoteExecutionResult(result: PreviewRemoteExecutionResult): string {
  return JSON.stringify(result);
}

export function resultContainsForbiddenEvidence(result: PreviewRemoteExecutionResult): boolean {
  const serialized = serializePreviewRemoteExecutionResult(result);
  const forbidden = ['password', 'pgpass', 'connection_string', 'stack', 'stderr', 'BEGIN ', 'INSERT INTO'];
  const lower = serialized.toLowerCase();
  return forbidden.some((fragment) => lower.includes(fragment.toLowerCase()));
}

export const EXECUTOR_AUTHORITY_CONSTANTS = {
  foundationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  manifestId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  lifecycleAuthorityId: REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
  implementationId: REMOTE_EXECUTOR_IMPLEMENTATION_ID,
  expectedBranch: EXPECTED_BRANCH,
  expectedFoundationHead: EXPECTED_FOUNDATION_BASE_HEAD,
  expectedRepoRoot: EXPECTED_REPO_ROOT,
  bootstrapSpecId: HISTORY_BOOTSTRAP_SPEC.identifier,
  timeoutPolicyId: TIMEOUT_POLICY.identifier,
  runtimeProbeRegistryId: RUNTIME_PROBE_REGISTRY.identifier,
  p1PriorBootstrapPreconditionId: P1_PRIOR_BOOTSTRAP_PRECONDITION_ID,
  postConnectGuardSqlSha256: FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.postConnectIdentitySqlSha256,
} as const;

export { publicHandleToJson };
