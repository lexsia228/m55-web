import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  FORBIDDEN_PRODUCTION_ORGANIZATION,
  FORBIDDEN_PRODUCTION_PROJECT,
  type RepositoryIdentityFacts,
  REPOSITORY_FACTS_SOURCE,
  type TargetIdentityFacts,
} from './types.ts';
import { SESSION_POOLER_HOST_FINGERPRINT_SHA256 } from './remoteConnectionAuthority.ts';
import {
  HOLD_PAIR_P5_PROBE_MISMATCH,
  type PairP5ProbeValidationResult,
} from './pairP5IdentityStepAuthority.ts';
import {
  buildPairP5IdentityHistoryInsertBinding,
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_BRANCH,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS,
  PAIR_P5_IDENTITY_MIGRATION_BYTES,
  PAIR_P5_IDENTITY_MIGRATION_NAME,
  PAIR_P5_IDENTITY_MIGRATION_REL_PATH,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_IDENTITY_STEP_ID,
  PAIR_P5_POST_PROBE_SQL,
  PAIR_P5_POST_PROBE_SQL_SHA256,
  PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS,
  PAIR_P5_PRIOR_PROBE_SQL,
  PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL,
  type PairP5CallableStepId,
} from './pairP5IdentityStepAuthority.ts';

export const PAIR_P5_STATIC_EXECUTION_GATE = {
  executionAuthorized: false as const,
  migrationApplyAuthorized: false as const,
  productionAccessAuthorized: false as const,
  automaticNextStep: false as const,
  sameRunRetry: false as const,
  remoteConnectionAttempted: false as const,
  sqlExecuted: false as const,
  codeImplemented: true as const,
};

export type PairP5IdentityHoldCode =
  | 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH'
  | 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH'
  | 'HOLD_PAIR_P5_TARGET_PRODUCTION_FORBIDDEN'
  | 'HOLD_PAIR_P5_STEP_SELECTION_INVALID'
  | 'HOLD_PAIR_P5_NON_CALLABLE_STEP_FORBIDDEN'
  | 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED'
  | 'HOLD_PAIR_P5_NORMALIZED_STREAM_MISMATCH'
  | 'HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH';

export type PairP5DedicatedStepSelectionError =
  | 'HOLD_DEDICATED_STEP_EMPTY'
  | 'HOLD_DEDICATED_STEP_ALL_FORBIDDEN'
  | 'HOLD_DEDICATED_STEP_MULTI_FORBIDDEN'
  | 'HOLD_DEDICATED_STEP_DUPLICATE'
  | 'HOLD_DEDICATED_STEP_UNKNOWN'
  | 'HOLD_DEDICATED_STEP_NOT_PAIR_P5_IDENTITY'
  | 'HOLD_DEDICATED_STEP_LEGACY_P_PHASE_FORBIDDEN'
  | 'HOLD_DEDICATED_STEP_PAIR_P5_NON_CALLABLE_VERSION';

export type PairP5DedicatedStepSelectionResult =
  | { readonly ok: true; readonly stepId: PairP5CallableStepId }
  | { readonly ok: false; readonly error: PairP5DedicatedStepSelectionError };

const LEGACY_STEP_PATTERN = /^P[1-8]$/;
const FROZEN_VERSION_TOKENS = new Set<string>([
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS.P5_2_CHECKOUT_RESERVATION.version,
  PAIR_P5_FROZEN_NON_CALLABLE_STEPS.P5_3_FULFILL_ADVISORY.version,
  'P5-2',
  'P5-3',
  'PAIR_P5_CHECKOUT_20261010',
  'PAIR_P5_FULFILL_20261013',
]);

export function normalizePairP5StepTokens(
  raw: string | readonly string[] | null | undefined,
): readonly string[] {
  if (raw === null || raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    const tokens: string[] = [];
    for (const entry of raw) {
      const trimmed = String(entry).trim();
      if (trimmed.length > 0) {
        tokens.push(trimmed);
      }
    }
    return tokens;
  }
  if (typeof raw !== 'string') {
    return [];
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function validateDedicatedPairP5IdentityStepSelection(
  raw: string | readonly string[] | null | undefined,
): PairP5DedicatedStepSelectionResult {
  const tokens = normalizePairP5StepTokens(raw);
  if (tokens.length === 0) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_EMPTY' };
  }
  if (tokens.some((token) => token.toUpperCase() === 'ALL')) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_ALL_FORBIDDEN' };
  }
  if (tokens.length !== 1) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_MULTI_FORBIDDEN' };
  }
  const token = tokens[0]!;
  if (FROZEN_VERSION_TOKENS.has(token)) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_PAIR_P5_NON_CALLABLE_VERSION' };
  }
  if (LEGACY_STEP_PATTERN.test(token)) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_LEGACY_P_PHASE_FORBIDDEN' };
  }
  if (token !== PAIR_P5_IDENTITY_STEP_ID) {
    if (token.startsWith('PAIR_P5_')) {
      return { ok: false, error: 'HOLD_DEDICATED_STEP_NOT_PAIR_P5_IDENTITY' };
    }
    return { ok: false, error: 'HOLD_DEDICATED_STEP_UNKNOWN' };
  }
  return { ok: true, stepId: PAIR_P5_IDENTITY_STEP_ID };
}

export function validateDedicatedPairP5IdentityStepSelectionList(
  raw: readonly string[],
): PairP5DedicatedStepSelectionResult {
  const identityCount = raw.filter((entry) => entry === PAIR_P5_IDENTITY_STEP_ID).length;
  if (identityCount > 1) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_DUPLICATE' };
  }
  return validateDedicatedPairP5IdentityStepSelection(raw.join(','));
}

export function validatePairP5RepositoryIdentity(
  repoRoot: string,
  repository: RepositoryIdentityFacts,
): PairP5IdentityHoldCode | null {
  if (repoRoot !== PAIR_P5_EXPECTED_REPO_ROOT || repository.repoRoot !== PAIR_P5_EXPECTED_REPO_ROOT) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  if (repository.branch !== PAIR_P5_EXPECTED_BRANCH) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  if (repository.headCommitSha !== PAIR_P5_EXPECTED_HEAD_COMMIT_SHA) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  if (repository.trackedWorktreeClean !== true || repository.indexEmpty !== true) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  return null;
}

export function validatePairP5TargetIdentity(target: TargetIdentityFacts): PairP5IdentityHoldCode | null {
  if (
    target.organization === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    target.project === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return 'HOLD_PAIR_P5_TARGET_PRODUCTION_FORBIDDEN';
  }
  if (
    target.organization !== APPROVED_PREVIEW_ORGANIZATION ||
    target.project !== APPROVED_PREVIEW_PROJECT ||
    target.databaseTier !== APPROVED_PREVIEW_DATABASE_TIER
  ) {
    return 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH';
  }
  if (target.projectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF) {
    return 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH';
  }
  if (target.hostFingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH';
  }
  return null;
}

export type PairP5RepositoryFactsProvenance =
  | 'GIT_READ_ONLY_OBSERVED'
  | 'SYNTHETIC_FIXTURE_UNVERIFIED';

function gitExec(repoRoot: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('GIT_READ_FAILED');
  }
  return result.stdout.trim();
}

export function readPairP5RepositoryIdentityFromGit(
  repoRoot: string,
): { readonly provenance: 'GIT_READ_ONLY_OBSERVED'; readonly facts: RepositoryIdentityFacts } {
  const topLevel = gitExec(repoRoot, ['rev-parse', '--show-toplevel']);
  const branch = gitExec(repoRoot, ['branch', '--show-current']);
  const headCommitSha = gitExec(repoRoot, ['rev-parse', 'HEAD']);
  const treeSha = gitExec(repoRoot, ['rev-parse', 'HEAD^{tree}']);
  const porcelain = gitExec(repoRoot, ['status', '--porcelain']);
  const trackedDirty = porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => !line.startsWith('??'));
  const indexDirty = gitExec(repoRoot, ['diff', '--cached', '--name-only']).length > 0;
  return {
    provenance: 'GIT_READ_ONLY_OBSERVED',
    facts: {
      repoRoot: topLevel,
      branch,
      headCommitSha,
      treeSha,
      trackedWorktreeClean: !trackedDirty,
      indexEmpty: !indexDirty,
      factsSource: REPOSITORY_FACTS_SOURCE,
    },
  };
}

export function buildPairP5SyntheticFixtureRepositoryIdentity(): {
  readonly provenance: 'SYNTHETIC_FIXTURE_UNVERIFIED';
  readonly facts: RepositoryIdentityFacts;
} {
  return {
    provenance: 'SYNTHETIC_FIXTURE_UNVERIFIED',
    facts: {
      repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      branch: PAIR_P5_EXPECTED_BRANCH,
      headCommitSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
      treeSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
      trackedWorktreeClean: true,
      indexEmpty: true,
      factsSource: REPOSITORY_FACTS_SOURCE,
    },
  };
}

export type PairP5IdentityTransactionPhase =
  | 'BIND_PREVIEW_TARGET'
  | 'BEGIN'
  | 'PRIOR_PROBE'
  | 'MUTATION_STATEMENT'
  | 'HISTORY_INSERT'
  | 'POST_PROBE'
  | 'COMMIT'
  | 'CLOSE_MUTATION_CONNECTION'
  | 'FRESH_READONLY_VERIFICATION';

export type PairP5IdentityOfflinePlanSuccess = {
  readonly mode: 'PAIR_P5_IDENTITY_OFFLINE_PLAN';
  readonly holdReasonCode: null;
  readonly stepId: PairP5CallableStepId;
  readonly migration: {
    readonly version: typeof PAIR_P5_IDENTITY_MIGRATION_VERSION;
    readonly name: typeof PAIR_P5_IDENTITY_MIGRATION_NAME;
    readonly path: typeof PAIR_P5_IDENTITY_MIGRATION_REL_PATH;
    readonly bytes: typeof PAIR_P5_IDENTITY_MIGRATION_BYTES;
    readonly sha256: typeof PAIR_P5_IDENTITY_MIGRATION_SHA256;
    readonly statementCount: typeof PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT;
    readonly normalizedStreamCompositeSha256: typeof PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256;
  };
  readonly requiredPriorHistoryVersions: typeof PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS;
  readonly priorProbeSqlSha256: typeof PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL;
  readonly postProbeSqlSha256: typeof PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL;
  readonly historyInsert: ReturnType<typeof buildPairP5IdentityHistoryInsertBinding>;
  readonly orderedPhases: readonly PairP5IdentityTransactionPhase[];
  readonly frozenNonCallableSteps: typeof PAIR_P5_FROZEN_NON_CALLABLE_STEPS;
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
  readonly fulfillRpcBodyFingerprintVerification: 'UNKNOWN_NOT_PINNED';
} & typeof PAIR_P5_STATIC_EXECUTION_GATE;

export type PairP5IdentityOfflinePlanHold = {
  readonly mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD';
  readonly holdReasonCode: PairP5IdentityHoldCode;
} & typeof PAIR_P5_STATIC_EXECUTION_GATE;

export type PairP5IdentityOfflinePlanResult =
  | PairP5IdentityOfflinePlanSuccess
  | PairP5IdentityOfflinePlanHold;

export function buildPairP5IdentityOfflinePlan(input: {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
  readonly target: TargetIdentityFacts;
  readonly selectedStep: PairP5CallableStepId;
  readonly executionEnablement: false;
}): PairP5IdentityOfflinePlanResult {
  if (input.executionEnablement !== false) {
    return {
      mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  }
  if (input.selectedStep !== PAIR_P5_IDENTITY_STEP_ID) {
    return {
      mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_NON_CALLABLE_STEP_FORBIDDEN',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  }
  const repoHold = validatePairP5RepositoryIdentity(input.repoRoot, input.repository);
  if (repoHold) {
    return { mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD', holdReasonCode: repoHold, ...PAIR_P5_STATIC_EXECUTION_GATE };
  }
  const targetHold = validatePairP5TargetIdentity(input.target);
  if (targetHold) {
    return { mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD', holdReasonCode: targetHold, ...PAIR_P5_STATIC_EXECUTION_GATE };
  }
  try {
    const historyInsert = buildPairP5IdentityHistoryInsertBinding(input.repoRoot);
    if (
      historyInsert.version !== PAIR_P5_IDENTITY_MIGRATION_VERSION ||
      historyInsert.name !== PAIR_P5_IDENTITY_MIGRATION_NAME
    ) {
      return {
        mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD',
        holdReasonCode: 'HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH',
        ...PAIR_P5_STATIC_EXECUTION_GATE,
      };
    }
    const phases = expandPairP5IdentityExecutionPhases(historyInsert.statements.length);
    return {
      mode: 'PAIR_P5_IDENTITY_OFFLINE_PLAN',
      holdReasonCode: null,
      stepId: PAIR_P5_IDENTITY_STEP_ID,
      migration: {
        version: PAIR_P5_IDENTITY_MIGRATION_VERSION,
        name: PAIR_P5_IDENTITY_MIGRATION_NAME,
        path: PAIR_P5_IDENTITY_MIGRATION_REL_PATH,
        bytes: PAIR_P5_IDENTITY_MIGRATION_BYTES,
        sha256: PAIR_P5_IDENTITY_MIGRATION_SHA256,
        statementCount: PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
        normalizedStreamCompositeSha256: PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
      },
      requiredPriorHistoryVersions: PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS,
      priorProbeSqlSha256: PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL,
      postProbeSqlSha256: PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL,
      historyInsert,
      orderedPhases: phases,
      frozenNonCallableSteps: PAIR_P5_FROZEN_NON_CALLABLE_STEPS,
      repositoryFactsProvenance: input.repositoryFactsProvenance,
      fulfillRpcBodyFingerprintVerification: 'UNKNOWN_NOT_PINNED',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  } catch {
    return {
      mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_NORMALIZED_STREAM_MISMATCH',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  }
}

export function expandPairP5IdentityExecutionPhases(
  mutationStatementCount: number,
): readonly PairP5IdentityTransactionPhase[] {
  const phases: PairP5IdentityTransactionPhase[] = [
    'BIND_PREVIEW_TARGET',
    'BEGIN',
    'PRIOR_PROBE',
  ];
  for (let index = 0; index < mutationStatementCount; index += 1) {
    phases.push('MUTATION_STATEMENT');
  }
  phases.push('HISTORY_INSERT', 'POST_PROBE', 'COMMIT', 'CLOSE_MUTATION_CONNECTION', 'FRESH_READONLY_VERIFICATION');
  return phases;
}

export type PairP5MockTransportQueryRecord = {
  readonly phase: PairP5IdentityTransactionPhase;
  readonly sql: string;
  readonly parameters?: readonly unknown[];
};

export function simulatePairP5IdentityMockTransportTrace(plan: PairP5IdentityOfflinePlanSuccess): {
  readonly records: readonly PairP5MockTransportQueryRecord[];
  readonly historyInsertCount: number;
  readonly mutationStatementCount: number;
} {
  const records: PairP5MockTransportQueryRecord[] = [
    { phase: 'BIND_PREVIEW_TARGET', sql: '/* bind preview target sbogwyzldjxxouhqtpnq */' },
    { phase: 'BEGIN', sql: 'BEGIN' },
    { phase: 'PRIOR_PROBE', sql: PAIR_P5_PRIOR_PROBE_SQL },
  ];
  for (const statement of plan.historyInsert.statements) {
    records.push({ phase: 'MUTATION_STATEMENT', sql: statement });
  }
  records.push({
    phase: 'HISTORY_INSERT',
    sql: plan.historyInsert.parameterizedInsertShape,
    parameters: [
      plan.historyInsert.version,
      plan.historyInsert.statements,
      plan.historyInsert.name,
    ],
  });
  records.push({ phase: 'POST_PROBE', sql: PAIR_P5_POST_PROBE_SQL });
  records.push({ phase: 'COMMIT', sql: 'COMMIT' });
  records.push({ phase: 'CLOSE_MUTATION_CONNECTION', sql: '/* close */' });
  records.push({ phase: 'FRESH_READONLY_VERIFICATION', sql: '/* readonly ack */' });
  return {
    records,
    historyInsertCount: 1,
    mutationStatementCount: plan.historyInsert.statements.length,
  };
}

export type PairP5MockCommitResponseClass = 'COMMIT_OK' | 'COMMIT_AMBIGUOUS' | 'COMMIT_FAILED';

export type PairP5MockBoundedTransactionDisposition =
  | 'ROLLBACK_PRIOR_PROBE_FAILED'
  | 'ROLLBACK_POST_PROBE_FAILED'
  | 'STOP_COMMIT_AMBIGUOUS_NO_RETRY'
  | 'COMMIT_SENT';

export type PairP5MockBoundedTransactionResult = {
  readonly disposition: PairP5MockBoundedTransactionDisposition;
  readonly commitSent: boolean;
  readonly rollbackSent: boolean;
  readonly sameRunRetry: false;
  readonly phasesExecuted: readonly PairP5IdentityTransactionPhase[];
  readonly holdReasonCode: typeof HOLD_PAIR_P5_PROBE_MISMATCH | 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS' | null;
};

export function runPairP5MockBoundedTransaction(input: {
  readonly plan: PairP5IdentityOfflinePlanSuccess;
  readonly priorProbe: PairP5ProbeValidationResult;
  readonly postProbe: PairP5ProbeValidationResult;
  readonly commitResponseClass: PairP5MockCommitResponseClass;
}): PairP5MockBoundedTransactionResult {
  const phasesExecuted: PairP5IdentityTransactionPhase[] = [
    'BIND_PREVIEW_TARGET',
    'BEGIN',
    'PRIOR_PROBE',
  ];
  if (!input.priorProbe.ok) {
    phasesExecuted.push('CLOSE_MUTATION_CONNECTION');
    return {
      disposition: 'ROLLBACK_PRIOR_PROBE_FAILED',
      commitSent: false,
      rollbackSent: true,
      sameRunRetry: false,
      phasesExecuted,
      holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
    };
  }
  for (let index = 0; index < input.plan.historyInsert.statements.length; index += 1) {
    phasesExecuted.push('MUTATION_STATEMENT');
  }
  phasesExecuted.push('HISTORY_INSERT', 'POST_PROBE');
  if (!input.postProbe.ok) {
    phasesExecuted.push('CLOSE_MUTATION_CONNECTION');
    return {
      disposition: 'ROLLBACK_POST_PROBE_FAILED',
      commitSent: false,
      rollbackSent: true,
      sameRunRetry: false,
      phasesExecuted,
      holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
    };
  }
  if (input.commitResponseClass === 'COMMIT_AMBIGUOUS') {
    phasesExecuted.push('COMMIT', 'CLOSE_MUTATION_CONNECTION');
    return {
      disposition: 'STOP_COMMIT_AMBIGUOUS_NO_RETRY',
      commitSent: true,
      rollbackSent: false,
      sameRunRetry: false,
      phasesExecuted,
      holdReasonCode: 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS',
    };
  }
  if (input.commitResponseClass === 'COMMIT_FAILED') {
    phasesExecuted.push('CLOSE_MUTATION_CONNECTION');
    return {
      disposition: 'ROLLBACK_POST_PROBE_FAILED',
      commitSent: false,
      rollbackSent: true,
      sameRunRetry: false,
      phasesExecuted,
      holdReasonCode: HOLD_PAIR_P5_PROBE_MISMATCH,
    };
  }
  phasesExecuted.push('COMMIT', 'CLOSE_MUTATION_CONNECTION', 'FRESH_READONLY_VERIFICATION');
  return {
    disposition: 'COMMIT_SENT',
    commitSent: true,
    rollbackSent: false,
    sameRunRetry: false,
    phasesExecuted,
    holdReasonCode: null,
  };
}

export function canonicalSerializePairP5OfflinePlan(plan: PairP5IdentityOfflinePlanSuccess): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        stepId: plan.stepId,
        migrationSha256: plan.migration.sha256,
        statementCount: plan.migration.statementCount,
        composite: plan.migration.normalizedStreamCompositeSha256,
        priorProbeSha256: plan.priorProbeSqlSha256,
        postProbeSha256: plan.postProbeSqlSha256,
        phases: plan.orderedPhases,
      }),
    )
    .digest('hex');
}
