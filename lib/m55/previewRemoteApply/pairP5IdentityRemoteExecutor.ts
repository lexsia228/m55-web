import {
  branchAfterCommitResponseClass,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';
import {
  createExecutionPgTransport,
  type ExecutionPgClient,
  type ExecutionPgClientConfig,
  type ExecutionPgQueryResult,
  type FakeExecutionPgClientOptions,
  createFakeExecutionPgClientFactory,
  resolveExecutionPgTransportEvidenceProfile,
} from './remoteExecutionPgTransport.ts';
import {
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
} from './remoteConnectionAuthority.ts';
import { HISTORY_INSERT_SQL_METADATA, type RepositoryIdentityFacts, type TargetIdentityFacts } from './types.ts';
import {
  PAIR_P5_POST_PROBE_SQL,
  PAIR_P5_PRIOR_PROBE_SQL,
  PAIR_P5_PROBE_OUTPUT_COLUMN,
  buildMockPairP5PostProbeRow,
  buildMockPairP5PriorProbeRow,
  validatePairP5PostProbeResult,
  validatePairP5PriorProbeResult,
} from './pairP5IdentityStepAuthority.ts';
import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  buildPairP5IdentityOfflinePlan,
  type PairP5IdentityOfflinePlanSuccess,
  type PairP5RepositoryFactsProvenance,
  validateDedicatedPairP5IdentityStepSelection,
} from './pairP5IdentityOfflinePlan.ts';
import { PAIR_P5_IDENTITY_STEP_ID } from './pairP5IdentityStepAuthority.ts';

export const PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID =
  'M55_PAIR_P5_IDENTITY_PREVIEW_REMOTE_EXECUTOR_WIRED_v1' as const;

export const PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION = {
  CODE_ONLY_WIRED_AND_EXECUTION_DISABLED: 'CODE_ONLY_WIRED_AND_EXECUTION_DISABLED',
  MOCK_INJECTED_TRANSACTION_COMPLETE: 'MOCK_INJECTED_TRANSACTION_COMPLETE',
} as const;

export const HOLD_PAIR_P5_COMMIT_REJECTED = 'HOLD_PAIR_P5_COMMIT_REJECTED' as const;
export const HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY =
  'HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY' as const;

export type PairP5IdentityRemoteExecutionClassification =
  (typeof PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION)[keyof typeof PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION];

const WIRING_PLACEHOLDER_CLIENT_CONFIG: ExecutionPgClientConfig = {
  host: 'pair-p5-wiring.placeholder.invalid',
  port: 5432,
  database: 'postgres',
  user: 'pair_p5_wiring_placeholder',
  password: 'forbidden_live_use',
  sslmode: 'require',
  tlsCaPem: '-----BEGIN CERTIFICATE-----\nPLACEHOLDER\n-----END CERTIFICATE-----',
  tlsTrustProfile: TLS_TRUST_PROFILE,
  tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
  connectionTimeoutMillis: 1,
};

export type PairP5IdentityRemoteExecutionInput = {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
  readonly target: TargetIdentityFacts;
  readonly selectedStep: string;
  readonly executionEnablement: false;
};

export type PairP5IdentityRemoteExecutionTestHarness = {
  readonly mode: 'INJECTED_MOCK_TRANSPORT_ONLY';
  readonly fakeClientOptions?: FakeExecutionPgClientOptions;
  readonly priorProbeFieldOverrides?: Partial<Record<string, boolean>>;
  readonly postProbeFieldOverrides?: Partial<Record<string, boolean>>;
};

export type PairP5IdentityRemoteExecutionDeps = {
  readonly testHarness?: PairP5IdentityRemoteExecutionTestHarness;
};

export type PairP5IdentityRemoteExecutionStage =
  | 'PRECHECK'
  | 'PLAN_BUILT'
  | 'MOCK_CONNECT'
  | 'IN_TRANSACTION_PRIOR'
  | 'IN_TRANSACTION_MUTATION'
  | 'IN_TRANSACTION_HISTORY'
  | 'IN_TRANSACTION_POST'
  | 'COMMIT_SENT'
  | 'ORIGINAL_CONNECTION_CLOSED'
  | 'FRESH_READONLY_SKIPPED_CODE_ONLY';

export type PairP5IdentityRemoteExecutionEvidence = {
  readonly transportProfile: ReturnType<typeof resolveExecutionPgTransportEvidenceProfile> | null;
  readonly connectionOpened: boolean;
  readonly transactionBegan: boolean;
  readonly mutationStatementsExecuted: number;
  readonly historyInsertExecuted: boolean;
  readonly commitSent: boolean;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly rollbackSent: boolean;
  readonly sameRunRetry: false;
  readonly stageReached: PairP5IdentityRemoteExecutionStage;
  readonly fulfillRpcBodyFingerprintVerification: 'UNKNOWN_NOT_PINNED';
  readonly applyReadyFromProbeGreen: false;
};

export type PairP5IdentityRemoteExecutionResult =
  | {
      readonly mode: 'PAIR_P5_IDENTITY_REMOTE_EXECUTION_DISABLED';
      readonly classification: typeof PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED;
      readonly holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED';
      readonly wiringId: typeof PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID;
      readonly remoteExecutorWired: true;
      readonly legacyP1P8ExecutorModified: false;
      readonly evidence: PairP5IdentityRemoteExecutionEvidence;
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE
  | {
      readonly mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD';
      readonly classification: typeof PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED;
      readonly holdReasonCode: string;
      readonly wiringId: typeof PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID;
      readonly remoteExecutorWired: true;
      readonly legacyP1P8ExecutorModified: false;
      readonly evidence: PairP5IdentityRemoteExecutionEvidence;
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE
  | {
      readonly mode: 'PAIR_P5_IDENTITY_REMOTE_MOCK_COMPLETE';
      readonly classification: typeof PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.MOCK_INJECTED_TRANSACTION_COMPLETE;
      readonly holdReasonCode: null;
      readonly wiringId: typeof PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID;
      readonly remoteExecutorWired: true;
      readonly legacyP1P8ExecutorModified: false;
      readonly evidence: PairP5IdentityRemoteExecutionEvidence;
      readonly querySequence: readonly string[];
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE;

function emptyEvidence(
  stage: PairP5IdentityRemoteExecutionStage,
): PairP5IdentityRemoteExecutionEvidence {
  return {
    transportProfile: null,
    connectionOpened: false,
    transactionBegan: false,
    mutationStatementsExecuted: 0,
    historyInsertExecuted: false,
    commitSent: false,
    commitResponseClass: null,
    rollbackSent: false,
    sameRunRetry: false,
    stageReached: stage,
    fulfillRpcBodyFingerprintVerification: 'UNKNOWN_NOT_PINNED',
    applyReadyFromProbeGreen: false,
  };
}

function probeRowToQueryResult(row: {
  readonly rowCount: number | null;
  readonly rows: readonly Record<string, unknown>[];
}): ExecutionPgQueryResult {
  return { rowCount: row.rowCount, rows: [...row.rows] };
}

function isPriorProbeSql(sql: string): boolean {
  return sql.trim() === PAIR_P5_PRIOR_PROBE_SQL.trim();
}

function isPostProbeSql(sql: string): boolean {
  return sql.trim() === PAIR_P5_POST_PROBE_SQL.trim();
}

function buildDefaultQueryHandler(
  priorRow: ReturnType<typeof buildMockPairP5PriorProbeRow>,
  postRow: ReturnType<typeof buildMockPairP5PostProbeRow>,
): FakeExecutionPgClientOptions['queryHandler'] {
  return (sql: string) => {
    if (isPriorProbeSql(sql)) {
      return probeRowToQueryResult(priorRow);
    }
    if (isPostProbeSql(sql)) {
      return probeRowToQueryResult(postRow);
    }
    return { rows: [], rowCount: 0 };
  };
}

function holdCodeForNonAckCommitResponse(responseClass: CommitResponseClass): string {
  if (responseClass === 'DEFINITIVE_TRANSACTION_REJECTION') {
    return HOLD_PAIR_P5_COMMIT_REJECTED;
  }
  if (responseClass === 'ACK_UNCERTAIN_OR_MISSING') {
    return 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS';
  }
  return 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS';
}

function forbiddenMockHarnessInjectionHold(
  harness: PairP5IdentityRemoteExecutionTestHarness,
): typeof HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY | null {
  if (Object.prototype.hasOwnProperty.call(harness, 'transportFactory')) {
    return HOLD_PAIR_P5_FORBIDDEN_MOCK_TRANSPORT_FACTORY;
  }
  return null;
}

async function retireClientWithoutRollback(
  client: ExecutionPgClient,
  evidence: PairP5IdentityRemoteExecutionEvidence,
): Promise<PairP5IdentityRemoteExecutionEvidence> {
  client.markUnusable();
  try {
    await client.close();
  } catch {
    client.markUnusable();
  }
  return {
    ...evidence,
    rollbackSent: false,
    stageReached: 'FRESH_READONLY_SKIPPED_CODE_ONLY',
  };
}

async function attemptRollbackAndClose(
  client: ExecutionPgClient,
  evidence: PairP5IdentityRemoteExecutionEvidence,
): Promise<PairP5IdentityRemoteExecutionEvidence> {
  let rollbackAcknowledged = false;
  try {
    const rollbackResult = await client.rollback();
    rollbackAcknowledged = rollbackResult.acknowledged === true;
  } catch {
    rollbackAcknowledged = false;
  }
  try {
    await client.close();
  } catch {
    client.markUnusable();
  }
  return {
    ...evidence,
    rollbackSent: rollbackAcknowledged,
    stageReached: 'ORIGINAL_CONNECTION_CLOSED',
  };
}

export async function executePairP5IdentityPreviewRemoteExecution(
  input: PairP5IdentityRemoteExecutionInput,
  deps: PairP5IdentityRemoteExecutionDeps = {},
): Promise<PairP5IdentityRemoteExecutionResult> {
  const baseGate = { ...PAIR_P5_STATIC_EXECUTION_GATE };

  if (input.executionEnablement !== false) {
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: emptyEvidence('PRECHECK'),
      ...baseGate,
    };
  }

  const selection = validateDedicatedPairP5IdentityStepSelection(input.selectedStep);
  if (!selection.ok) {
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID',
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: emptyEvidence('PRECHECK'),
      ...baseGate,
    };
  }

  const planResult = buildPairP5IdentityOfflinePlan({
    repoRoot: input.repoRoot,
    repository: input.repository,
    repositoryFactsProvenance: input.repositoryFactsProvenance,
    target: input.target,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    executionEnablement: false,
  });

  if (planResult.mode !== 'PAIR_P5_IDENTITY_OFFLINE_PLAN') {
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: planResult.holdReasonCode,
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: emptyEvidence('PLAN_BUILT'),
      ...baseGate,
    };
  }

  const plan: PairP5IdentityOfflinePlanSuccess = planResult;

  if (!deps.testHarness || deps.testHarness.mode !== 'INJECTED_MOCK_TRANSPORT_ONLY') {
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_EXECUTION_DISABLED',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: {
        ...emptyEvidence('PLAN_BUILT'),
        stageReached: 'PLAN_BUILT',
      },
      ...baseGate,
    };
  }

  const injectionHold = forbiddenMockHarnessInjectionHold(deps.testHarness);
  if (injectionHold) {
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: injectionHold,
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: emptyEvidence('PLAN_BUILT'),
      ...baseGate,
    };
  }

  const priorRow = buildMockPairP5PriorProbeRow(deps.testHarness.priorProbeFieldOverrides ?? {});
  const postRow = buildMockPairP5PostProbeRow(deps.testHarness.postProbeFieldOverrides ?? {});

  const fakeOptions: FakeExecutionPgClientOptions = {
    ...deps.testHarness.fakeClientOptions,
    queryHandler:
      deps.testHarness.fakeClientOptions?.queryHandler ??
      buildDefaultQueryHandler(priorRow, postRow),
  };

  const fakeFactory = createFakeExecutionPgClientFactory(fakeOptions);
  const injectedTransportFactory = { createClient: (config: ExecutionPgClientConfig) => fakeFactory.createClient(config) };
  const transport = createExecutionPgTransport(injectedTransportFactory);

  let evidence: PairP5IdentityRemoteExecutionEvidence = {
    ...emptyEvidence('MOCK_CONNECT'),
    transportProfile: resolveExecutionPgTransportEvidenceProfile(injectedTransportFactory),
  };

  const client = transport.createClient(WIRING_PLACEHOLDER_CLIENT_CONFIG);
  const querySequence: string[] = [];

  try {
    await client.connect();
    evidence = { ...evidence, connectionOpened: true, stageReached: 'MOCK_CONNECT' };
    await client.begin();
    evidence = { ...evidence, transactionBegan: true, stageReached: 'IN_TRANSACTION_PRIOR' };

    const priorResult = await client.query(PAIR_P5_PRIOR_PROBE_SQL);
    querySequence.push('PRIOR_PROBE');
    const priorParsed = validatePairP5PriorProbeResult(priorResult);
    if (!priorParsed.ok) {
      evidence = await attemptRollbackAndClose(client, evidence);
      return {
        mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
        classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
        holdReasonCode: 'HOLD_PAIR_P5_PROBE_MISMATCH',
        wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
        remoteExecutorWired: true,
        legacyP1P8ExecutorModified: false,
        evidence,
        ...baseGate,
      };
    }

    evidence = { ...evidence, stageReached: 'IN_TRANSACTION_MUTATION' };
    for (const statement of plan.historyInsert.statements) {
      await client.query(statement);
      querySequence.push('MUTATION_STATEMENT');
      evidence = {
        ...evidence,
        mutationStatementsExecuted: evidence.mutationStatementsExecuted + 1,
      };
    }

    evidence = { ...evidence, stageReached: 'IN_TRANSACTION_HISTORY' };
    await client.query(HISTORY_INSERT_SQL_METADATA, [
      plan.historyInsert.version,
      plan.historyInsert.statements,
      plan.historyInsert.name,
    ]);
    querySequence.push('HISTORY_INSERT');
    evidence = { ...evidence, historyInsertExecuted: true, stageReached: 'IN_TRANSACTION_POST' };

    const postResult = await client.query(PAIR_P5_POST_PROBE_SQL);
    querySequence.push('POST_PROBE');
    const postParsed = validatePairP5PostProbeResult(postResult);
    if (!postParsed.ok) {
      evidence = await attemptRollbackAndClose(client, evidence);
      return {
        mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
        classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
        holdReasonCode: 'HOLD_PAIR_P5_PROBE_MISMATCH',
        wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
        remoteExecutorWired: true,
        legacyP1P8ExecutorModified: false,
        evidence,
        ...baseGate,
      };
    }

    evidence = { ...evidence, stageReached: 'COMMIT_SENT', commitSent: true };
    const commitResult = await client.commit();
    querySequence.push('COMMIT');
    evidence = {
      ...evidence,
      commitResponseClass: commitResult.responseClass,
    };
    await client.close();
    evidence = { ...evidence, stageReached: 'ORIGINAL_CONNECTION_CLOSED' };

    const branch = branchAfterCommitResponseClass({
      responseClass: commitResult.responseClass,
      originalConnectionClosed: true,
    });
    void branch;

    if (commitResult.responseClass !== 'DEFINITIVE_COMMIT_ACK') {
      return {
        mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
        classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
        holdReasonCode: holdCodeForNonAckCommitResponse(commitResult.responseClass),
        wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
        remoteExecutorWired: true,
        legacyP1P8ExecutorModified: false,
        evidence: {
          ...evidence,
          rollbackSent: false,
          stageReached: 'FRESH_READONLY_SKIPPED_CODE_ONLY',
        },
        ...baseGate,
      };
    }

    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_MOCK_COMPLETE',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.MOCK_INJECTED_TRANSACTION_COMPLETE,
      holdReasonCode: null,
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence: {
        ...evidence,
        commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
        rollbackSent: false,
        stageReached: 'FRESH_READONLY_SKIPPED_CODE_ONLY',
      },
      querySequence,
      ...baseGate,
    };
  } catch {
    const holdAfterCommitAttempt = evidence.commitSent === true;
    if (holdAfterCommitAttempt) {
      evidence = await retireClientWithoutRollback(client, evidence);
      return {
        mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
        classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
        holdReasonCode: 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS',
        wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
        remoteExecutorWired: true,
        legacyP1P8ExecutorModified: false,
        evidence: {
          ...evidence,
          commitSent: true,
          rollbackSent: false,
        },
        ...baseGate,
      };
    }
    evidence = await attemptRollbackAndClose(client, evidence);
    return {
      mode: 'PAIR_P5_IDENTITY_REMOTE_HOLD',
      classification: PAIR_P5_IDENTITY_REMOTE_WIRING_CLASSIFICATION.CODE_ONLY_WIRED_AND_EXECUTION_DISABLED,
      holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL',
      wiringId: PAIR_P5_IDENTITY_REMOTE_EXECUTOR_WIRING_ID,
      remoteExecutorWired: true,
      legacyP1P8ExecutorModified: false,
      evidence,
      ...baseGate,
    };
  }
}

export function serializePairP5IdentityRemoteExecutionResult(
  result: PairP5IdentityRemoteExecutionResult,
): string {
  return JSON.stringify(result, null, 2);
}
