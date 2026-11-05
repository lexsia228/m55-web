import {
  PAIR_P5_FULFILL_MIGRATION_NAME,
  PAIR_P5_FULFILL_MIGRATION_SHA256,
  PAIR_P5_FULFILL_MIGRATION_VERSION,
  PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE_BASE,
  PAIR_P5_FULFILL_POST_APPLY_FULFILL_RPC_PROSRC_MD5,
  PAIR_P5_FULFILL_POST_PROBE_SQL,
  PAIR_P5_FULFILL_PRIOR_PROBE_SQL,
  PAIR_P5_FULFILL_STEP_ID,
  buildMockPairP5FulfillPostProbeRow,
  buildMockPairP5FulfillPriorProbeRow,
} from './pairP5FulfillStepAuthority.ts';
import {
  buildPairP5FulfillOfflinePlan,
  validateDedicatedPairP5FulfillStepSelection,
  type PairP5FulfillOfflinePlanSuccess,
} from './pairP5FulfillOfflinePlan.ts';
import {
  HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING,
  resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt,
} from './pairP5DedicatedTargetBindingReceipt.ts';
import { PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL } from './pairP5DedicatedReceiptConsumptionLedger.ts';
import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  validatePairP5RepositoryIdentity,
  validatePairP5TargetIdentity,
} from './pairP5IdentityOfflinePlan.ts';
import { PAIR_P5_CHECKOUT_STEP_ID } from './pairP5CheckoutStepAuthority.ts';
import {
  PAIR_P5_IDENTITY_STEP_ID,
  validatePairP5OperationalLiveGitHeadAuthorityBinding,
  validatePairP5RuntimeGitHeadAuthorityBinding,
} from './pairP5IdentityStepAuthority.ts';
import {
  PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS,
  PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL,
  buildMockPairP5FunctionBodyCatalogProbeRow,
  buildPairP5FunctionBodyCatalogProbeSql,
  emptyEvidence,
  PAIR_P5_LIVE_SECURE_STDIN_CREDENTIAL_DEPS,
  serializePairP5AuthGatedRealExecutionResult,
  mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult,
  pairP5AuthGatedRealExecutionCliExitCode,
  runPairP5AuthorizationGatedPgTransactionOrchestration,
  type PairP5AuthGatedLiveSessionPoolerSurface,
  type PairP5AuthGatedOfflineSimulationOptions,
  type PairP5AuthGatedRealExecutionInput,
  type PairP5AuthGatedRealExecutionResult,
} from './pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  assertPairP5FulfillPrerequisiteLocalCodeIntegrity,
  isPairP5FulfillHumanPreviewApplyAuthorizationGranted,
  PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
} from './pairP5FulfillLiveExecutionAuthority.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export { assertPairP5FulfillPrerequisiteLocalCodeIntegrity, serializePairP5AuthGatedRealExecutionResult };

export const PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE = {
  ...PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE_BASE,
  functionBodyCatalogProbeSql: buildPairP5FunctionBodyCatalogProbeSql({
    fulfillRpcBodyMd5: PAIR_P5_FULFILL_POST_APPLY_FULFILL_RPC_PROSRC_MD5,
  }),
} as const;

export const PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTION_READINESS = {
  ...PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS,
  executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
  callableStepId: PAIR_P5_FULFILL_STEP_ID,
  migrationVersion: PAIR_P5_FULFILL_MIGRATION_VERSION,
} as const;

function mapFulfillOrchestrationOutcome(
  outcome: Parameters<typeof mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult>[0],
  simulationOnly: boolean,
): PairP5AuthGatedRealExecutionResult {
  const mapped = mapPairP5AuthGatedOrchestrationOutcomeToExecutionResult(outcome, simulationOnly);
  return { ...mapped, executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID };
}

function validateFulfillPreMutationContext(input: PairP5AuthGatedRealExecutionInput): string | null {
  const selection = validateDedicatedPairP5FulfillStepSelection(input.selectedStep);
  if (!selection.ok) {
    return 'HOLD_PAIR_P5_STEP_SELECTION_INVALID';
  }
  if (selection.stepId !== PAIR_P5_FULFILL_STEP_ID) {
    return 'HOLD_PAIR_P5_NON_CALLABLE_STEP_FORBIDDEN';
  }
  const repoHold = validatePairP5RepositoryIdentity(input.repoRoot, input.repository);
  if (repoHold) {
    return repoHold;
  }
  const targetHold = validatePairP5TargetIdentity(input.target);
  if (targetHold) {
    return targetHold;
  }
  const receipt = input.dedicatedTargetBindingReceipt ?? null;
  if (
    receipt !== null &&
    (receipt.body.selectedStep === PAIR_P5_IDENTITY_STEP_ID ||
      receipt.body.selectedStep === PAIR_P5_CHECKOUT_STEP_ID)
  ) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID;
  }
  const headBindingHold =
    receipt?.body.receiptClass === 'OPERATIONAL'
      ? validatePairP5OperationalLiveGitHeadAuthorityBinding({
          observedHeadCommitSha: input.repository.headCommitSha,
          observedTreeSha: input.repository.treeSha,
          receiptAuthorizedHeadCommitSha: receipt.body.git.headCommitSha,
          receiptAuthorizedTreeSha: receipt.body.git.treeSha,
          signedAttestationGitHeadCommitSha:
            receipt.body.signedHumanPreviewUiAttestation?.payload.gitHeadCommitSha ?? null,
        })
      : validatePairP5RuntimeGitHeadAuthorityBinding({
          observedHeadCommitSha: input.repository.headCommitSha,
          observedTreeSha: input.repository.treeSha,
          receiptAuthorizedHeadCommitSha: receipt?.body.git.headCommitSha ?? null,
          receiptAuthorizedTreeSha: receipt?.body.git.treeSha ?? null,
          signedAttestationGitHeadCommitSha:
            receipt?.body.signedHumanPreviewUiAttestation?.payload.gitHeadCommitSha ?? null,
        });
  if (headBindingHold) {
    return headBindingHold;
  }
  return null;
}

function buildFulfillOfflinePlanOrHold(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5FulfillOfflinePlanSuccess | string {
  const preHold = validateFulfillPreMutationContext(input);
  if (preHold) {
    return preHold;
  }
  const planResult = buildPairP5FulfillOfflinePlan({
    repoRoot: input.repoRoot,
    repository: input.repository,
    repositoryFactsProvenance: input.repositoryFactsProvenance,
    target: input.target,
    selectedStep: PAIR_P5_FULFILL_STEP_ID,
    executionEnablement: false,
  });
  if (planResult.mode !== 'PAIR_P5_FULFILL_OFFLINE_PLAN') {
    return planResult.holdReasonCode;
  }
  if (
    planResult.migration.sha256 !== PAIR_P5_FULFILL_MIGRATION_SHA256 ||
    planResult.migration.version !== PAIR_P5_FULFILL_MIGRATION_VERSION ||
    planResult.migration.name !== PAIR_P5_FULFILL_MIGRATION_NAME ||
    planResult.migration.statementCount !== PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT ||
    planResult.migration.normalizedStreamCompositeSha256 !==
      PAIR_P5_FULFILL_NORMALIZED_STREAM_COMPOSITE_SHA256
  ) {
    return 'HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH';
  }
  return planResult;
}

export function preparePairP5FulfillLiveSessionPoolerOrchestrationSurface(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5AuthGatedLiveSessionPoolerSurface | string {
  const receipt = input.dedicatedTargetBindingReceipt ?? null;
  if (receipt === null) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING;
  }
  if (receipt.body.selectedStep !== PAIR_P5_FULFILL_STEP_ID) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID;
  }
  const resolved = resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt({
    repoRoot: input.repoRoot,
    dedicatedReceipt: receipt,
  });
  if (!resolved.ok) {
    return resolved.holdReasonCode;
  }
  return {
    kind: 'LIVE_SESSION_POOLER',
    credentialAcquirerDeps: PAIR_P5_LIVE_SECURE_STDIN_CREDENTIAL_DEPS,
    dedicatedTargetBindingReceipt: resolved.receipt,
    postConnectDedicatedReceiptLedgerBinding: resolved.binding,
  };
}

export async function executePairP5FulfillAuthorizationGatedRealExecution(
  input: PairP5AuthGatedRealExecutionInput,
): Promise<PairP5AuthGatedRealExecutionResult> {
  const baseGate = { ...PAIR_P5_STATIC_EXECUTION_GATE };
  const evidence = emptyEvidence();
  const planOrHold = buildFulfillOfflinePlanOrHold(input);
  if (typeof planOrHold === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: planOrHold,
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
  const liveSurface = preparePairP5FulfillLiveSessionPoolerOrchestrationSurface(input);
  if (typeof liveSurface === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: liveSurface,
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
  if (!isPairP5FulfillHumanPreviewApplyAuthorizationGranted(input)) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_EXECUTION_DISABLED',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
  if (PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized !== false) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
  try {
    const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(
      input,
      planOrHold,
      liveSurface,
      PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE,
      liveSurface.dedicatedTargetBindingReceipt,
    );
    return mapFulfillOrchestrationOutcome(outcome, false);
  } catch {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_CREDENTIAL_ACQUISITION_NOT_WIRED_IN_THIS_GATE',
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
}

export async function simulatePairP5FulfillAuthorizationGatedTransactionOffline(
  input: PairP5AuthGatedRealExecutionInput,
  options: PairP5AuthGatedOfflineSimulationOptions = {},
): Promise<PairP5AuthGatedRealExecutionResult> {
  const baseGate = { ...PAIR_P5_STATIC_EXECUTION_GATE };
  const planOrHold = buildFulfillOfflinePlanOrHold(input);
  if (typeof planOrHold === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: planOrHold,
      executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence: emptyEvidence(),
      ...baseGate,
    };
  }
  const priorRow = buildMockPairP5FulfillPriorProbeRow(options.priorProbeFieldOverrides ?? {});
  const postRow = buildMockPairP5FulfillPostProbeRow(options.postProbeFieldOverrides ?? {});
  const freshPostRow = buildMockPairP5FulfillPostProbeRow(
    options.freshPostProbeFieldOverrides ?? options.postProbeFieldOverrides ?? {},
  );
  const freshPriorRow = buildMockPairP5FulfillPriorProbeRow(
    options.freshPriorProbeFieldOverrides ?? { fulfill_rpc_pre_apply_prosrc_md5_catalog_match: false, probe_green: false },
  );
  const catalogProbeSql =
    PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE.functionBodyCatalogProbeSql ??
    PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL;
  const simulatedLedgerConsumed = new Set<string>();
  const ledgerBinding = options.postConnectDedicatedReceiptLedgerBinding ?? null;
  const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(
    input,
    planOrHold,
    {
      kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY',
      mutationFakeOptions: {
        ...options.fakeClientOptions,
        queryHandler: (sql, values) => {
          if (
            ledgerBinding !== null &&
            sql.trim() === PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL.trim()
          ) {
            const receiptId = typeof values?.[0] === 'string' ? values[0] : '';
            if (options.postConnectDedicatedReceiptLedgerSimulateAlreadyConsumed === true) {
              return { rowCount: 0, rows: [] };
            }
            if (simulatedLedgerConsumed.has(receiptId)) {
              return { rowCount: 0, rows: [] };
            }
            simulatedLedgerConsumed.add(receiptId);
            return {
              rowCount: 1,
              rows: [{ receipt_identifier_sha256: receiptId }],
            };
          }
          if (sql.trim() === PAIR_P5_FULFILL_PRIOR_PROBE_SQL.trim()) {
            return { rowCount: priorRow.rowCount, rows: [...priorRow.rows] };
          }
          if (sql.trim() === PAIR_P5_FULFILL_POST_PROBE_SQL.trim()) {
            return { rowCount: postRow.rowCount, rows: [...postRow.rows] };
          }
          if (sql.trim() === catalogProbeSql.trim()) {
            return buildMockPairP5FunctionBodyCatalogProbeRow();
          }
          if (sql === HISTORY_INSERT_SQL_METADATA) {
            if (
              values?.[0] === planOrHold.historyInsert.version &&
              Array.isArray(values?.[1]) &&
              values[1].length === PAIR_P5_FULFILL_NORMALIZED_STATEMENT_COUNT &&
              values?.[2] === planOrHold.historyInsert.name
            ) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          }
          return { rows: [], rowCount: 1 };
        },
      },
      freshReadonlyFakeOptions: options.freshReadonlyFakeOptions ?? {},
      freshPostProbeRow: freshPostRow,
      freshPriorProbeRow: freshPriorRow,
      mutationCloseFailsAfterCommit: options.mutationCloseFailsAfterSuccessfulCommit === true,
      internalLiveFreshReadonlyStructureExercise: options.internalLiveFreshReadonlyStructureExercise === true,
      postConnectDedicatedReceiptLedgerBinding: options.postConnectDedicatedReceiptLedgerBinding ?? null,
    },
    PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE,
    input.dedicatedTargetBindingReceipt ?? null,
  );
  return mapFulfillOrchestrationOutcome(outcome, true);
}

export {
  pairP5AuthGatedRealExecutionCliExitCode as pairP5FulfillAuthGatedRealExecutionCliExitCode,
};

export type PairP5FulfillAuthGatedRealExecutionResult = PairP5AuthGatedRealExecutionResult;
