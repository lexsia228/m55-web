import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  validatePairP5RepositoryIdentity,
  validatePairP5TargetIdentity,
  type PairP5RepositoryFactsProvenance,
} from './pairP5IdentityOfflinePlan.ts';
import type { RepositoryIdentityFacts, TargetIdentityFacts } from './types.ts';
import { PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS } from './pairP5CheckoutStepAuthority.ts';
import { PAIR_P5_IDENTITY_STEP_ID } from './pairP5IdentityStepAuthority.ts';
import { PAIR_P5_CHECKOUT_STEP_ID } from './pairP5CheckoutStepAuthority.ts';
import {
  buildPairP5FulfillHistoryInsertBinding,
  PAIR_P5_FULFILL_MIGRATION_BYTES,
  PAIR_P5_FULFILL_MIGRATION_NAME,
  PAIR_P5_FULFILL_MIGRATION_REL_PATH,
  PAIR_P5_FULFILL_MIGRATION_SHA256,
  PAIR_P5_FULFILL_MIGRATION_VERSION,
  PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_FULFILL_STEP_ID,
  type PairP5FulfillCallableStepId,
} from './pairP5FulfillStepAuthority.ts';
import {
  normalizePairP5StepTokens,
  type PairP5DedicatedStepSelectionError,
  type PairP5IdentityHoldCode,
  type PairP5IdentityTransactionPhase,
} from './pairP5IdentityOfflinePlan.ts';

const LEGACY_STEP_PATTERN = /^P[1-8]$/;

export type PairP5FulfillDedicatedStepSelectionResult =
  | { readonly ok: true; readonly stepId: PairP5FulfillCallableStepId }
  | { readonly ok: false; readonly error: PairP5DedicatedStepSelectionError };

export function validateDedicatedPairP5FulfillStepSelection(
  raw: string | readonly string[] | null | undefined,
): PairP5FulfillDedicatedStepSelectionResult {
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
  if (LEGACY_STEP_PATTERN.test(token)) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_LEGACY_P_PHASE_FORBIDDEN' };
  }
  if (token === PAIR_P5_IDENTITY_STEP_ID) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_NOT_PAIR_P5_IDENTITY' };
  }
  if (token === PAIR_P5_CHECKOUT_STEP_ID) {
    return { ok: false, error: 'HOLD_DEDICATED_STEP_UNKNOWN' };
  }
  if (token !== PAIR_P5_FULFILL_STEP_ID) {
    if (token.startsWith('PAIR_P5_')) {
      return { ok: false, error: 'HOLD_DEDICATED_STEP_UNKNOWN' };
    }
    return { ok: false, error: 'HOLD_DEDICATED_STEP_UNKNOWN' };
  }
  return { ok: true, stepId: PAIR_P5_FULFILL_STEP_ID };
}

export type PairP5FulfillOfflinePlanSuccess = {
  readonly mode: 'PAIR_P5_FULFILL_OFFLINE_PLAN';
  readonly holdReasonCode: null;
  readonly stepId: PairP5FulfillCallableStepId;
  readonly migration: {
    readonly version: typeof PAIR_P5_FULFILL_MIGRATION_VERSION;
    readonly name: typeof PAIR_P5_FULFILL_MIGRATION_NAME;
    readonly path: typeof PAIR_P5_FULFILL_MIGRATION_REL_PATH;
    readonly bytes: typeof PAIR_P5_FULFILL_MIGRATION_BYTES;
    readonly sha256: typeof PAIR_P5_FULFILL_MIGRATION_SHA256;
    readonly statementCount: typeof PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT;
    readonly normalizedStreamCompositeSha256: typeof PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256;
  };
  readonly requiredPriorHistoryVersions: typeof PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS;
  readonly priorProbeSqlSha256: typeof PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_LITERAL;
  readonly postProbeSqlSha256: typeof PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL;
  readonly historyInsert: ReturnType<typeof buildPairP5FulfillHistoryInsertBinding>;
  readonly orderedPhases: readonly PairP5IdentityTransactionPhase[];
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
} & typeof PAIR_P5_STATIC_EXECUTION_GATE;

export type PairP5FulfillOfflinePlanHold = {
  readonly mode: 'PAIR_P5_FULFILL_OFFLINE_HOLD';
  readonly holdReasonCode: PairP5IdentityHoldCode;
} & typeof PAIR_P5_STATIC_EXECUTION_GATE;

export type PairP5FulfillOfflinePlanResult = PairP5FulfillOfflinePlanSuccess | PairP5FulfillOfflinePlanHold;

function expandPhases(statementCount: number): readonly PairP5IdentityTransactionPhase[] {
  const phases: PairP5IdentityTransactionPhase[] = [
    'BIND_PREVIEW_TARGET',
    'BEGIN',
    'PRIOR_PROBE',
  ];
  for (let i = 0; i < statementCount; i += 1) {
    phases.push('MUTATION_STATEMENT');
  }
  phases.push('HISTORY_INSERT', 'POST_PROBE', 'COMMIT', 'CLOSE_MUTATION_CONNECTION', 'FRESH_READONLY_VERIFICATION');
  return phases;
}

export function buildPairP5FulfillOfflinePlan(input: {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
  readonly target: TargetIdentityFacts;
  readonly selectedStep: PairP5FulfillCallableStepId;
  readonly executionEnablement: false;
}): PairP5FulfillOfflinePlanResult {
  if (input.executionEnablement !== false || input.selectedStep !== PAIR_P5_FULFILL_STEP_ID) {
    return {
      mode: 'PAIR_P5_FULFILL_OFFLINE_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  }
  const repoHold = validatePairP5RepositoryIdentity(input.repoRoot, input.repository);
  if (repoHold) {
    return { mode: 'PAIR_P5_FULFILL_OFFLINE_HOLD', holdReasonCode: repoHold, ...PAIR_P5_STATIC_EXECUTION_GATE };
  }
  const targetHold = validatePairP5TargetIdentity(input.target);
  if (targetHold) {
    return { mode: 'PAIR_P5_FULFILL_OFFLINE_HOLD', holdReasonCode: targetHold, ...PAIR_P5_STATIC_EXECUTION_GATE };
  }
  try {
    const historyInsert = buildPairP5FulfillHistoryInsertBinding(input.repoRoot);
    return {
      mode: 'PAIR_P5_FULFILL_OFFLINE_PLAN',
      holdReasonCode: null,
      stepId: PAIR_P5_FULFILL_STEP_ID,
      migration: {
        version: PAIR_P5_FULFILL_MIGRATION_VERSION,
        name: PAIR_P5_FULFILL_MIGRATION_NAME,
        path: PAIR_P5_FULFILL_MIGRATION_REL_PATH,
        bytes: PAIR_P5_FULFILL_MIGRATION_BYTES,
        sha256: PAIR_P5_FULFILL_MIGRATION_SHA256,
        statementCount: PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT,
        normalizedStreamCompositeSha256: PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256,
      },
      requiredPriorHistoryVersions: PAIR_P5_POST_CHECKOUT_HISTORY_VERSIONS,
      priorProbeSqlSha256: PAIR_P5_FULFILL_PRIOR_PROBE_SQL_SHA256_LITERAL,
      postProbeSqlSha256: PAIR_P5_FULFILL_POST_PROBE_SQL_SHA256_LITERAL,
      historyInsert,
      orderedPhases: expandPhases(historyInsert.statements.length),
      repositoryFactsProvenance: input.repositoryFactsProvenance,
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  } catch {
    return {
      mode: 'PAIR_P5_FULFILL_OFFLINE_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_NORMALIZED_STREAM_MISMATCH',
      ...PAIR_P5_STATIC_EXECUTION_GATE,
    };
  }
}
