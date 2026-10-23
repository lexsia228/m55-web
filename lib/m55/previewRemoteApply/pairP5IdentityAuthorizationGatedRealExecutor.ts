import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  branchAfterCommitResponseClass,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';
import { EXPECTED_SESSION_SETTINGS } from './executionSqlAuthorityFoundation.ts';
import {
  FRESH_READONLY_BEGIN_SQL,
  buildFreshLocalStatementTimeoutSql,
} from './remoteExecutionExecutor.ts';
import {
  buildClientConfig,
  createExecutionPgTransport,
  createFakeExecutionPgClientFactory,
  type ExecutionPgClient,
  type ExecutionPgClientConfig,
  type ExecutionPgQueryResult,
  type ExecutionPgTransportFactoryDeps,
  type FakeExecutionPgClientOptions,
} from './remoteExecutionPgTransport.ts';
import {
  acquireSecureStdinConnectionConfig,
  type CredentialAcquirerDeps,
} from './remoteExecutionCredentialAcquirer.ts';
import {
  POST_CONNECT_GUARD_BINDING,
  POST_CONNECT_GUARD_SQL,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  EXPECTED_DATABASE_NAME,
  EXPECTED_CURRENT_USER,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  expectedConnectionUserForProjectRef,
  calculateCanonicalHostFingerprint,
  validateCredentialMethodSelection,
  type ExpectedAuthorizationBinding,
} from './remoteConnectionAuthority.ts';
import type { CredentialMethodId } from './types.ts';
import { TIMEOUT_POLICY } from './timeoutPolicy.ts';
import { HISTORY_INSERT_SQL_METADATA, type RepositoryIdentityFacts, type TargetIdentityFacts } from './types.ts';
import {
  assertPairP5ProbeSqlPinnedIntegrity,
  buildMockPairP5PostProbeRow,
  buildMockPairP5PriorProbeRow,
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_BRANCH,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_IDENTITY_MIGRATION_NAME,
  PAIR_P5_IDENTITY_MIGRATION_REL_PATH,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_IDENTITY_STEP_ID,
  PAIR_P5_POST_PROBE_SQL,
  PAIR_P5_POST_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS,
  PAIR_P5_PRIOR_PROBE_SQL,
  PAIR_P5_PRIOR_PROBE_SQL_SHA256_LITERAL,
  validatePairP5PostProbeResult,
  validatePairP5PriorProbeResult,
} from './pairP5IdentityStepAuthority.ts';
import {
  buildPairP5IdentityOfflinePlan,
  PAIR_P5_STATIC_EXECUTION_GATE,
  type PairP5IdentityOfflinePlanSuccess,
  type PairP5RepositoryFactsProvenance,
  validateDedicatedPairP5IdentityStepSelection,
  validatePairP5RepositoryIdentity,
  validatePairP5TargetIdentity,
} from './pairP5IdentityOfflinePlan.ts';

export const PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID =
  'M55_PAIR_P5_IDENTITY_AUTHORIZATION_GATED_REAL_EXECUTOR_v1' as const;

import {
  PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
  PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_CAST_FROM_DEDICATED_FORBIDDEN,
  PAIR_P5_LIVE_CREDENTIAL_PATH_ORDERING,
  PAIR_P5_OPERATIONAL_RECEIPT_READINESS,
  PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE,
  evaluatePairP5LiveDedicatedPathPreCredentialBoundary,
  evaluatePairP5TestOnlyDedicatedReceiptBeforeCredentialsBoundary,
  PAIR_P5_POST_CONNECT_MUTATION_TRANSACTION_STEP_ORDER,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID,
  HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING,
  HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED,
  resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt,
  type PairP5DedicatedTargetBindingReceipt,
} from './pairP5DedicatedTargetBindingReceipt.ts';
import {
  PAIR_P5_POST_CONNECT_LEDGER_ATOMIC_CLAIM_INTEGRATION_STATUS,
  type PairP5DedicatedReceiptConsumptionBinding,
  type PairP5PostgresTransactionalLedgerClaimPort,
  claimPairP5DedicatedReceiptAtomicOneUseAfterPostConnectVerification,
  createPairP5PostgresTransactionalLedgerClaimPortFromExecutionPgClient,
  PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL,
} from './pairP5DedicatedReceiptConsumptionLedger.ts';

export const PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD = PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD;

export const PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5 = {
  m55_compatibility_snapshot_columns_immutable_v1: '1be04ec855cf80bab54d25f87824cb9d',
  m55_compatibility_owned_report_identity_immutable_v1: '31d96131fbb1641e4f0cbcb4ff44112a',
  m55_fulfill_compatibility_report_v1: '034a38e15248a40b801075444a5cc462',
} as const;

export const PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_OUTPUT_COLUMN = 'json_build_object' as const;

const PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_FIELD_NAMES = [
  'catalog_three_body_md5_row_count_exact',
  'snapshot_immutable_body_md5_catalog_match',
  'owned_identity_immutable_body_md5_catalog_match',
  'fulfill_rpc_body_md5_catalog_match',
  'unexpected_public_prosrc_md5_collision_zero',
  'snapshot_immutable_returns_trigger_invoker',
  'owned_identity_immutable_returns_trigger_invoker',
  'fulfill_rpc_signature_security_search_path',
  'probe_green',
] as const;

function buildPairP5FunctionBodyCatalogProbeSql(): string {
  const { m55_compatibility_snapshot_columns_immutable_v1: md5Snap } =
    PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5;
  const { m55_compatibility_owned_report_identity_immutable_v1: md5Owned } =
    PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5;
  const { m55_fulfill_compatibility_report_v1: md5Fulfill } = PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5;
  const threeMd5In = `('${md5Snap}','${md5Owned}','${md5Fulfill}')`;
  const fields: Array<readonly [string, string]> = [
    [
      'catalog_three_body_md5_row_count_exact',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND md5(p.prosrc) IN ${threeMd5In}) = 3`,
    ],
    [
      'snapshot_immutable_body_md5_catalog_match',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_compatibility_snapshot_columns_immutable_v1()') AND md5(p.prosrc) = '${md5Snap}') = 1`,
    ],
    [
      'owned_identity_immutable_body_md5_catalog_match',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_compatibility_owned_report_identity_immutable_v1()') AND md5(p.prosrc) = '${md5Owned}') = 1`,
    ],
    [
      'fulfill_rpc_body_md5_catalog_match',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)') AND md5(p.prosrc) = '${md5Fulfill}') = 1`,
    ],
    [
      'unexpected_public_prosrc_md5_collision_zero',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND md5(p.prosrc) IN ${threeMd5In} AND p.proname NOT IN ('m55_compatibility_snapshot_columns_immutable_v1','m55_compatibility_owned_report_identity_immutable_v1','m55_fulfill_compatibility_report_v1')) = 0`,
    ],
    [
      'snapshot_immutable_returns_trigger_invoker',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_compatibility_snapshot_columns_immutable_v1()') AND p.prorettype = 'pg_catalog.trigger'::regtype::oid AND NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1`,
    ],
    [
      'owned_identity_immutable_returns_trigger_invoker',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_compatibility_owned_report_identity_immutable_v1()') AND p.prorettype = 'pg_catalog.trigger'::regtype::oid AND NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1`,
    ],
    [
      'fulfill_rpc_signature_security_search_path',
      `(SELECT count(*)::int FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)') AND p.prorettype = 'pg_catalog.jsonb'::regtype::oid AND p.prosecdef AND p.proconfig @> ARRAY['search_path=public, pg_temp']) = 1`,
    ],
  ];
  const greenExprs = fields.map(([, expression]) => `(${expression})`);
  const entries = fields.map(([name, expression]) => `  '${name}', (${expression})`);
  entries.push(`  'probe_green', (${greenExprs.join(' AND ')})`);
  return `SELECT json_build_object(\n${entries.join(',\n')}\n) AS json_build_object`;
}

export const PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL_SHA256_LITERAL =
  'fb28f3c10eeccd73cab51867b01506498cdf3c791d4a9fab9dd9a2814e8bddae' as const;

export const PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL = buildPairP5FunctionBodyCatalogProbeSql();

export type PairP5FulfillRpcBodyFingerprintVerificationStatus =
  'SOURCE_DERIVED_EXPECTATION_ONLY_NOT_PG_OBSERVED';

/** Frozen false — cannot be flipped by env/CLI in this gate. Separate Human P5-1 apply GO required later. */
export const PAIR_P5_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED = false as const;

/** Frozen false — stdin credential read + PG connect only when Human explicitly authorizes. */
export const PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_AUTHORIZED = false as const;

export function isPairP5LiveCredentialAcquisitionAuthorized(): boolean {
  return PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_AUTHORIZED;
}

export const PAIR_P5_LIVE_PG_ORCHESTRATION_IMPLEMENTATION_STATUS =
  'IMPLEMENTED_BEHIND_HARD_FALSE_AUTHORIZATION' as const;

export const PAIR_P5_AUTH_GATED_REAL_EXECUTION_READINESS = {
  humanPreviewApplyAuthorizationGranted: false as const,
  staticExecutionGateExecutionAuthorized: false as const,
  staticMigrationApplyAuthorized: false as const,
  livePgTransactionOrchestrationImplemented: true as const,
  livePgConnectionImplementedAsInertStub: false as const,
  offlineSimulationUsesSharedOrchestration: true as const,
  fulfillRpcBodyFingerprintVerification:
    'SOURCE_DERIVED_EXPECTATION_ONLY_NOT_PG_OBSERVED' as const,
  migrationSourceFunctionBodyMd5DerivationVerified: true as const,
  functionBodyCatalogProbeSqlPinned: true as const,
  previewCredentialMethodId: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
  tempPgpassCredentialMethodImplemented: false as const,
  pgObservedFunctionBodyParityVerified: false as const,
  legacyTargetBindingReceiptIssuableForDedicatedStep: false as const,
  independentRemoteObservationsRequiredBeforeLegacyReceipt: true as const,
  liveFreshReadonlyPgLifecycleImplementedBehindHumanGate: true as const,
  dedicatedTargetBindingReceiptSchemaImplemented: true as const,
  operationalDedicatedReceiptIssuancePermitted: false as const,
  liveDedicatedPathUsesLegacyTargetBindingReceiptTerminal: false as const,
  liveCredentialAcquisitionAuthorized: false as const,
  operationalIndependentWitnessObserved: PAIR_P5_OPERATIONAL_RECEIPT_READINESS.independentPreviewUiWitnessObserved,
  authorizedExternalAttestationIssuerAvailable:
    PAIR_P5_OPERATIONAL_RECEIPT_READINESS.authorizedExternalAttestationIssuerAvailable,
  humanSignedAttestationVerifierImplemented:
    PAIR_P5_OPERATIONAL_RECEIPT_READINESS.humanSignedAttestationVerifierImplemented,
  durableLedgerMigrationDraftId: PAIR_P5_OPERATIONAL_RECEIPT_READINESS.durableLedgerMigrationDraftId,
  durableLedgerClaimDeferredToPostConnectPgTransaction: true as const,
  postConnectLedgerAtomicClaimIntegrationStatus: PAIR_P5_POST_CONNECT_LEDGER_ATOMIC_CLAIM_INTEGRATION_STATUS,
  postConnectMutationTransactionStepOrder: PAIR_P5_POST_CONNECT_MUTATION_TRANSACTION_STEP_ORDER,
  legacyTargetBindingReceiptCastFromDedicatedForbidden:
    PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_CAST_FROM_DEDICATED_FORBIDDEN,
  previewUiWitnessFieldEvidence: PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE,
  liveCredentialPathOrdering: PAIR_P5_LIVE_CREDENTIAL_PATH_ORDERING,
  durableCrossProcessReplayImplemented:
    PAIR_P5_OPERATIONAL_RECEIPT_READINESS.durableCrossProcessReplayImplemented,
  liveFreshReadonlyProbeAuthorizationGranted:
    PAIR_P5_OPERATIONAL_RECEIPT_READINESS.liveFreshReadonlyProbeAuthorizationGranted,
  applyReadyClaimForbidden: true as const,
} as const;

let pairP5LiveCredentialAcquisitionProbeCount = 0;

export function resetPairP5LiveCredentialAcquisitionProbeForTestsOnly(): void {
  pairP5LiveCredentialAcquisitionProbeCount = 0;
}

export function getPairP5LiveCredentialAcquisitionProbeCountForTestsOnly(): number {
  return pairP5LiveCredentialAcquisitionProbeCount;
}

const PLACEHOLDER_CLIENT_CONFIG: ExecutionPgClientConfig = {
  host: 'pair-p5-auth-gated.placeholder.invalid',
  port: 5432,
  database: 'postgres',
  user: 'pair_p5_auth_gated_placeholder',
  password: 'forbidden_without_human_go',
  sslmode: 'require',
  tlsCaPem: '-----BEGIN CERTIFICATE-----\nPLACEHOLDER\n-----END CERTIFICATE-----',
  tlsTrustProfile: TLS_TRUST_PROFILE,
  tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
  connectionTimeoutMillis: 1,
};

export type PairP5AuthGatedRealExecutionInput = {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly repositoryFactsProvenance: PairP5RepositoryFactsProvenance;
  readonly target: TargetIdentityFacts;
  readonly selectedStep: string;
  /** Required for LIVE mutation; must be operational with verified attestation + Human authorization. */
  readonly dedicatedTargetBindingReceipt?: PairP5DedicatedTargetBindingReceipt | null;
};

export type PairP5AuthGatedLiveSessionPoolerSurface = {
  readonly kind: 'LIVE_SESSION_POOLER';
  readonly transportFactory?: ExecutionPgTransportFactoryDeps;
  readonly credentialAcquirerDeps?: CredentialAcquirerDeps;
  readonly dedicatedTargetBindingReceipt: PairP5DedicatedTargetBindingReceipt;
  readonly postConnectDedicatedReceiptLedgerBinding: PairP5DedicatedReceiptConsumptionBinding;
};

export type PairP5AuthGatedExecutionEvidence = {
  readonly authorizationCheckedFirst: true;
  readonly humanAuthorizationGranted: false;
  readonly remoteConnectionAttempted: boolean;
  readonly pgClientConstructed: boolean;
  readonly credentialAcquisitionAttempted: boolean;
  readonly beginExecuted: boolean;
  readonly priorProbeExecuted: boolean;
  readonly mutationStatementsExecuted: number;
  readonly historyInsertExecuted: boolean;
  readonly historyInsertParameterized: boolean;
  readonly postProbeExecuted: boolean;
  readonly commitSent: boolean;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly originalConnectionRetired: boolean;
  readonly originalConnectionCloseCompleted: boolean;
  readonly freshReadonlySessionOpened: boolean;
  readonly freshReadonlySessionCompleted: boolean;
  readonly freshReadonlyPriorProbeExecuted: boolean;
  readonly freshReadonlyPriorProbeValidated: boolean;
  readonly freshReadonlyPostProbeExecuted: boolean;
  readonly freshReadonlyUsesFullPostProbeNotCountOnly: true;
  readonly freshReadonlyPostProbeValidated: boolean;
  readonly freshReadonlyDistinctClientSession: boolean;
  readonly freshReadonlyCloseCompleted: boolean;
  readonly rollbackSent: boolean;
  readonly rollbackAcknowledged: boolean;
  readonly ackClassifierAckState: string | null;
  readonly sameRunRetry: false;
  readonly applyReadyFromProbeGreen: false;
  readonly fulfillRpcBodyFingerprintVerification: PairP5FulfillRpcBodyFingerprintVerificationStatus;
  readonly functionBodyCatalogProbeExecutedBeforeCommit: boolean;
  readonly functionBodyCatalogProbeValidatedBeforeCommit: boolean;
  readonly functionBodyCatalogProbeExecutedFreshReadonly: boolean;
  readonly functionBodyCatalogProbeValidatedFreshReadonly: boolean;
  readonly previewStructuralAuthorityValidated: boolean;
  readonly legacyTargetBindingReceiptIssuable: false;
  readonly liveFreshReadonlyHumanAuthorizationGateClosed: boolean;
  readonly previewCredentialMethodId: typeof PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD;
  readonly dedicatedTargetBindingReceiptValidated: boolean;
  readonly dedicatedTargetBindingReceiptIdentifierSha256: string | null;
};

export type PairP5AuthGatedRealExecutionResult =
  | {
      readonly mode: 'PAIR_P5_AUTH_GATED_REAL_EXECUTION_DISABLED';
      readonly holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED';
      readonly executorId: typeof PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID;
      readonly evidence: PairP5AuthGatedExecutionEvidence;
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE
  | {
      readonly mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD';
      readonly holdReasonCode: string;
      readonly executorId: typeof PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID;
      readonly evidence: PairP5AuthGatedExecutionEvidence;
      readonly querySequence?: readonly string[];
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE
  | {
      readonly mode: 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE';
      readonly holdReasonCode: null;
      readonly executorId: typeof PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID;
      readonly evidence: PairP5AuthGatedExecutionEvidence;
      readonly querySequence: readonly string[];
      readonly simulationOnly: true;
      readonly simulationCannotAuthorizeApply: true;
    } & typeof PAIR_P5_STATIC_EXECUTION_GATE;

function emptyEvidence(): PairP5AuthGatedExecutionEvidence {
  return {
    authorizationCheckedFirst: true,
    humanAuthorizationGranted: false,
    remoteConnectionAttempted: false,
    pgClientConstructed: false,
    credentialAcquisitionAttempted: false,
    beginExecuted: false,
    priorProbeExecuted: false,
    mutationStatementsExecuted: 0,
    historyInsertExecuted: false,
    historyInsertParameterized: false,
    postProbeExecuted: false,
    commitSent: false,
    commitResponseClass: null,
    originalConnectionRetired: false,
    originalConnectionCloseCompleted: false,
    freshReadonlySessionOpened: false,
    freshReadonlySessionCompleted: false,
    freshReadonlyPriorProbeExecuted: false,
    freshReadonlyPriorProbeValidated: false,
    freshReadonlyPostProbeExecuted: false,
    freshReadonlyUsesFullPostProbeNotCountOnly: true,
    freshReadonlyPostProbeValidated: false,
    freshReadonlyDistinctClientSession: false,
    freshReadonlyCloseCompleted: false,
    rollbackSent: false,
    rollbackAcknowledged: false,
    ackClassifierAckState: null,
    sameRunRetry: false,
    applyReadyFromProbeGreen: false,
    fulfillRpcBodyFingerprintVerification: 'SOURCE_DERIVED_EXPECTATION_ONLY_NOT_PG_OBSERVED',
    functionBodyCatalogProbeExecutedBeforeCommit: false,
    functionBodyCatalogProbeValidatedBeforeCommit: false,
    functionBodyCatalogProbeExecutedFreshReadonly: false,
    functionBodyCatalogProbeValidatedFreshReadonly: false,
    previewStructuralAuthorityValidated: false,
    legacyTargetBindingReceiptIssuable: false,
    liveFreshReadonlyHumanAuthorizationGateClosed: false,
    previewCredentialMethodId: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
    dedicatedTargetBindingReceiptValidated: false,
    dedicatedTargetBindingReceiptIdentifierSha256: null,
  };
}

export const HOLD_PAIR_P5_COMMIT_REJECTED = 'HOLD_PAIR_P5_COMMIT_REJECTED' as const;
export const HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED =
  'HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED' as const;
export const HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH =
  'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' as const;

export const HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP =
  'HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP' as const;

/** Post-commit fresh prior (16) vs post (17) are mutually exclusive observation classes. */
export function classifyPairP5PostCommitAckFromFreshObservations(
  commitResponseClass: CommitResponseClass,
  freshPriorOk: boolean,
  freshPostOk: boolean,
): string {
  if (freshPriorOk === freshPostOk) {
    return 'CONTRADICTORY_OR_DRIFTED';
  }
  if (freshPriorOk && !freshPostOk) {
    if (commitResponseClass === 'DEFINITIVE_COMMIT_ACK') {
      return 'CONTRADICTORY_OR_DRIFTED';
    }
    return 'DEFINITELY_NOT_COMMITTED';
  }
  return 'DEFINITELY_COMMITTED';
}

export function isPairP5HumanPreviewApplyAuthorizationGranted(): boolean {
  const granted: boolean = PAIR_P5_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED;
  return granted;
}

function extractMigrationFunctionProsrcBody(migrationSql: string, anchorFunctionName: string): string {
  const anchorIndex = migrationSql.indexOf(anchorFunctionName);
  if (anchorIndex < 0) {
    throw new Error('HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH');
  }
  const dollarStart = migrationSql.indexOf('AS $$', anchorIndex);
  const bodyStart = dollarStart + 5;
  const bodyEnd = migrationSql.indexOf('$$;', bodyStart);
  if (dollarStart < 0 || bodyEnd < 0) {
    throw new Error('HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH');
  }
  return migrationSql.slice(bodyStart, bodyEnd);
}

function assertPairP5MigrationSourceFunctionBodyDerivation(): void {
  const migrationPath = join(PAIR_P5_EXPECTED_REPO_ROOT, PAIR_P5_IDENTITY_MIGRATION_REL_PATH);
  const rawBytes = readFileSync(migrationPath);
  const migrationSha256 = createHash('sha256').update(rawBytes).digest('hex');
  if (migrationSha256 !== PAIR_P5_IDENTITY_MIGRATION_SHA256) {
    throw new Error('HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH');
  }
  const migrationSql = rawBytes.toString('utf8');
  const derived = {
    m55_compatibility_snapshot_columns_immutable_v1: createHash('md5')
      .update(
        extractMigrationFunctionProsrcBody(
          migrationSql,
          'm55_compatibility_snapshot_columns_immutable_v1',
        ),
        'utf8',
      )
      .digest('hex'),
    m55_compatibility_owned_report_identity_immutable_v1: createHash('md5')
      .update(
        extractMigrationFunctionProsrcBody(
          migrationSql,
          'm55_compatibility_owned_report_identity_immutable_v1',
        ),
        'utf8',
      )
      .digest('hex'),
    m55_fulfill_compatibility_report_v1: createHash('md5')
      .update(
        extractMigrationFunctionProsrcBody(migrationSql, 'm55_fulfill_compatibility_report_v1'),
        'utf8',
      )
      .digest('hex'),
  };
  if (
    derived.m55_compatibility_snapshot_columns_immutable_v1 !==
      PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5.m55_compatibility_snapshot_columns_immutable_v1 ||
    derived.m55_compatibility_owned_report_identity_immutable_v1 !==
      PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5.m55_compatibility_owned_report_identity_immutable_v1 ||
    derived.m55_fulfill_compatibility_report_v1 !==
      PAIR_P5_MIGRATION_SOURCE_FUNCTION_BODY_MD5.m55_fulfill_compatibility_report_v1
  ) {
    throw new Error('HOLD_PAIR_P5_MIGRATION_FUNCTION_BODY_MD5_MISMATCH');
  }
}

function assertPairP5FunctionBodyCatalogProbeSqlPinnedIntegrity(): void {
  const digest = createHash('sha256').update(PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL, 'utf8').digest('hex');
  if (digest !== PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL_SHA256_LITERAL) {
    throw new Error('HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL_SHA256_MISMATCH');
  }
}

export function assertPairP5PrerequisiteLocalCodeIntegrity(): void {
  assertPairP5ProbeSqlPinnedIntegrity();
  assertPairP5MigrationSourceFunctionBodyDerivation();
  assertPairP5FunctionBodyCatalogProbeSqlPinnedIntegrity();
}

assertPairP5PrerequisiteLocalCodeIntegrity();

type PairP5FunctionBodyCatalogProbeValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };

export function validatePairP5FunctionBodyCatalogProbeResult(
  result: ExecutionPgQueryResult,
): PairP5FunctionBodyCatalogProbeValidation {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
  }
  const row = result.rows[0]!;
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_OUTPUT_COLUMN) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
  }
  const payload = row[PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_OUTPUT_COLUMN];
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
  }
  const record = payload as Record<string, unknown>;
  const expectedKeys = [...PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_FIELD_NAMES].sort();
  const actualKeys = Object.keys(record).sort();
  if (expectedKeys.length !== actualKeys.length) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (expectedKeys[index] !== actualKeys[index]) {
      return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
    }
  }
  for (const field of PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_FIELD_NAMES) {
    if (typeof record[field] !== 'boolean' || record[field] !== true) {
      return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
    }
  }
  return { ok: true };
}

export function buildMockPairP5FunctionBodyCatalogProbeRow(): ExecutionPgQueryResult {
  const fields = Object.fromEntries(
    PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_FIELD_NAMES.map((field) => [field, true]),
  );
  return {
    rowCount: 1,
    rows: [{ [PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_OUTPUT_COLUMN]: fields }],
  };
}

export type PairP5DedicatedPreviewConnectionIntent = {
  readonly dedicatedPairStepId: typeof PAIR_P5_IDENTITY_STEP_ID;
  readonly migrationVersion: typeof PAIR_P5_IDENTITY_MIGRATION_VERSION;
  readonly repositoryBranch: string;
  readonly repositoryHeadCommitSha: string;
  readonly previewOrganization: string;
  readonly previewProject: string;
  readonly previewProjectRef: string;
  readonly credentialMethod: typeof PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD;
  readonly sessionPoolerHost: typeof SESSION_POOLER_HOST;
  readonly hostFingerprintSha256: typeof SESSION_POOLER_HOST_FINGERPRINT_SHA256;
};

export function buildPairP5DedicatedPreviewConnectionIntent(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5DedicatedPreviewConnectionIntent {
  const projectRef = input.target.projectRef ?? PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
  return {
    dedicatedPairStepId: PAIR_P5_IDENTITY_STEP_ID,
    migrationVersion: PAIR_P5_IDENTITY_MIGRATION_VERSION,
    repositoryBranch: input.repository.branch,
    repositoryHeadCommitSha: input.repository.headCommitSha,
    previewOrganization: input.target.organization,
    previewProject: input.target.project,
    previewProjectRef: projectRef,
    credentialMethod: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
    sessionPoolerHost: SESSION_POOLER_HOST,
    hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  };
}

export type PairP5StructuralAuthorityContractResult =
  | {
      readonly ok: true;
      readonly structuralOfflineChecksPassed: true;
      readonly dedicatedConnectionIntent: PairP5DedicatedPreviewConnectionIntent;
      readonly credentialMethod: typeof PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD;
      readonly legacyTargetBindingReceiptIssuable: false;
      readonly independentRemoteObservationsRequired: true;
    }
  | { readonly ok: false; readonly holdReasonCode: string };

export function validatePairP5PreviewStructuralAuthorityContract(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5StructuralAuthorityContractResult {
  const contextHold = validatePreMutationContext(input);
  if (contextHold) {
    return { ok: false, holdReasonCode: contextHold };
  }
  const credentialHold = validateCredentialMethodSelection({
    credentialMethod: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
  });
  if (!credentialHold.ok) {
    return { ok: false, holdReasonCode: credentialHold.holdReasonCode ?? 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  const hostResult = calculateCanonicalHostFingerprint(SESSION_POOLER_HOST);
  if (!hostResult.ok || hostResult.fingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH' };
  }
  const projectRef = input.target.projectRef ?? PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
  if (expectedConnectionUserForProjectRef(projectRef) === EXPECTED_CURRENT_USER) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH' };
  }
  const intent = buildPairP5DedicatedPreviewConnectionIntent(input);
  if (intent.dedicatedPairStepId !== PAIR_P5_IDENTITY_STEP_ID) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
  }
  if (intent.repositoryBranch !== PAIR_P5_EXPECTED_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH' };
  }
  return {
    ok: true,
    structuralOfflineChecksPassed: true,
    dedicatedConnectionIntent: intent,
    credentialMethod: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
    legacyTargetBindingReceiptIssuable: false,
    independentRemoteObservationsRequired: true,
  };
}

export function attemptPairP5LegacyTargetBindingReceiptIssuance(
  _input: PairP5AuthGatedRealExecutionInput,
): {
  readonly issuable: false;
  readonly holdReasonCode: typeof HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP;
  readonly reason:
    'Legacy validateNonsecretTargetBinding requires P1-P8 selectedStep and independent observed facts; Pair P5-1 dedicated step cannot be forged.';
} {
  return {
    issuable: false,
    holdReasonCode: HOLD_PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_INCOMPATIBLE_WITH_DEDICATED_STEP,
    reason:
      'Legacy validateNonsecretTargetBinding requires P1-P8 selectedStep and independent observed facts; Pair P5-1 dedicated step cannot be forged.',
  };
}

/** @deprecated Use validatePairP5PreviewStructuralAuthorityContract — no legacy TargetBindingReceipt is issued. */
export function validatePairP5PreviewCredentialBindingPreparation(
  input: PairP5AuthGatedRealExecutionInput,
):
  | { readonly ok: true; readonly credentialMethod: typeof PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD }
  | { readonly ok: false; readonly holdReasonCode: string } {
  const structural = validatePairP5PreviewStructuralAuthorityContract(input);
  if (!structural.ok) {
    return structural;
  }
  return { ok: true, credentialMethod: structural.credentialMethod };
}

function validateFrozenPins(): string | null {
  try {
    assertPairP5PrerequisiteLocalCodeIntegrity();
  } catch {
    return 'HOLD_PAIR_P5_PROBE_SHA_MISMATCH';
  }
  return null;
}

function validateFrozenTransportPins(target: TargetIdentityFacts): string | null {
  if (target.hostFingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH';
  }
  return null;
}

function validatePreMutationContext(input: PairP5AuthGatedRealExecutionInput): string | null {
  const pinHold = validateFrozenPins();
  if (pinHold) {
    return pinHold;
  }
  const transportHold = validateFrozenTransportPins(input.target);
  if (transportHold) {
    return transportHold;
  }
  const selection = validateDedicatedPairP5IdentityStepSelection(input.selectedStep);
  if (!selection.ok) {
    return 'HOLD_PAIR_P5_STEP_SELECTION_INVALID';
  }
  if (selection.stepId !== PAIR_P5_IDENTITY_STEP_ID) {
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
  if (input.repoRoot !== PAIR_P5_EXPECTED_REPO_ROOT) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  if (input.repository.branch !== PAIR_P5_EXPECTED_BRANCH) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  if (input.repository.headCommitSha !== PAIR_P5_EXPECTED_HEAD_COMMIT_SHA) {
    return 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH';
  }
  return null;
}

function buildOfflinePlanOrHold(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5IdentityOfflinePlanSuccess | string {
  const preHold = validatePreMutationContext(input);
  if (preHold) {
    return preHold;
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
    return planResult.holdReasonCode;
  }
  if (
    planResult.migration.sha256 !== PAIR_P5_IDENTITY_MIGRATION_SHA256 ||
    planResult.migration.version !== PAIR_P5_IDENTITY_MIGRATION_VERSION ||
    planResult.migration.name !== PAIR_P5_IDENTITY_MIGRATION_NAME ||
    planResult.migration.statementCount !== PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT ||
    planResult.migration.normalizedStreamCompositeSha256 !==
      PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256
  ) {
    return 'HOLD_PAIR_P5_MIGRATION_IDENTITY_MISMATCH';
  }
  return planResult;
}

function buildPairP5ExpectedAuthorizationBinding(
  input: PairP5AuthGatedRealExecutionInput,
): ExpectedAuthorizationBinding {
  const projectRef = input.target.projectRef ?? PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
  return {
    environment: 'Preview',
    organizationSlug: input.target.organization,
    projectName: input.target.project,
    databaseSource: input.target.databaseTier,
    databaseName: EXPECTED_DATABASE_NAME,
    expectedCurrentUser: EXPECTED_CURRENT_USER,
    connectionEndpointProfile: 'SESSION_POOLER_IPV4_V1',
    connectionUser: expectedConnectionUserForProjectRef(projectRef),
    projectRef,
    host: SESSION_POOLER_HOST,
    hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
    port: EXPECTED_PORT,
    sslmode: EXPECTED_SSLMODE,
    credentialMethod: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
    repositoryBranch: input.repository.branch,
    repositoryHead: input.repository.headCommitSha,
    repositoryTree: input.repository.treeSha,
    executionAuthorizationId: 'M55-HUMAN-PAIR-P5-1-PREVIEW-APPLY-GO-REQUIRED',
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    executionSqlAuthorityFoundationId: 'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1',
    executionSqlAuthorityFoundationManifestId:
      'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1',
    remoteExecutionLifecycleAuthorityId: 'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
    remoteConnectionAuthorityId: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
  };
}

function pairP5ValidatePostConnectGuard(
  result: ExecutionPgQueryResult,
  expected: ExpectedAuthorizationBinding,
): boolean {
  if (result.rowCount !== 1 || result.rows.length !== 1) {
    return false;
  }
  const row = result.rows[0]!;
  const databaseName = row.current_database_name;
  const userName = row.current_user_name;
  if (typeof databaseName !== 'string' || typeof userName !== 'string') {
    return false;
  }
  return databaseName === expected.databaseName && userName === expected.expectedCurrentUser;
}

const PAIR_P5_SIMULATION_FAKE_OPTION_ALLOWLIST: ReadonlySet<keyof FakeExecutionPgClientOptions> = new Set([
  'commitResponseClass',
  'rollbackAcknowledged',
  'failConnect',
  'failBegin',
  'failCommit',
  'failRollback',
  'failQuery',
  'transportLossOnCommit',
]);

function pickAllowlistedFakeClientOptions(
  options: FakeExecutionPgClientOptions | undefined,
): FakeExecutionPgClientOptions {
  if (!options) {
    return {};
  }
  const picked: FakeExecutionPgClientOptions = {};
  for (const key of PAIR_P5_SIMULATION_FAKE_OPTION_ALLOWLIST) {
    if (key in options) {
      Reflect.set(picked, key, Reflect.get(options, key));
    }
  }
  return picked;
}

const PAIR_P5_LIVE_STDIN_FORBIDDEN_DEPS: CredentialAcquirerDeps = {
  readBytes: () => {
    pairP5LiveCredentialAcquisitionProbeCount += 1;
    throw new Error('HOLD_PAIR_P5_CREDENTIAL_ACQUISITION_NOT_WIRED_IN_THIS_GATE');
  },
};

function wrapPairP5SimulationMutationClientCloseFailureAfterCommit(
  client: ExecutionPgClient,
): ExecutionPgClient {
  let commitObserved = false;
  return {
    connect: (...args) => client.connect(...args),
    query: (...args) => client.query(...args),
    begin: (...args) => client.begin(...args),
    async commit() {
      const result = await client.commit();
      commitObserved = true;
      return result;
    },
    rollback: (...args) => client.rollback(...args),
    async close() {
      if (commitObserved) {
        throw new Error('PAIR_P5_SIMULATED_MUTATION_CLOSE_FAILURE');
      }
      return client.close();
    },
    getConnectionState: () => client.getConnectionState(),
    markUnusable: () => client.markUnusable(),
  };
}

/** Live mutation: pre-credential boundary is non-consuming; ledger claim belongs in post-connect PG transaction seam only. */
export async function attemptPairP5PostConnectLedgerAtomicClaimInMutationTransaction(input: {
  readonly binding: PairP5DedicatedReceiptConsumptionBinding;
  readonly postgresPort: PairP5PostgresTransactionalLedgerClaimPort | null;
}): Promise<string | null> {
  const claimed = await claimPairP5DedicatedReceiptAtomicOneUseAfterPostConnectVerification({
    binding: input.binding,
    postgresPort: input.postgresPort,
  });
  if (!claimed.ok) {
    return claimed.holdReasonCode;
  }
  return null;
}

/** Live mutation: pre-credential witness → Human purpose → receipt preflight; no stdin/PG until Human-authorized external wiring exists. */
function validatePairP5DedicatedReceiptMatchesExecutionBinding(
  receipt: PairP5DedicatedTargetBindingReceipt,
  binding: ExpectedAuthorizationBinding,
): string | null {
  const body = receipt.body;
  if (body.credentialMethod !== PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (binding.credentialMethod !== PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (
    body.previewProjectRef !== binding.projectRef ||
    body.sessionPoolerHost !== binding.host ||
    body.hostFingerprintSha256 !== binding.hostFingerprintSha256 ||
    body.port !== binding.port ||
    body.sslmode !== binding.sslmode
  ) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID;
  }
  return null;
}

async function acquirePairP5LiveMutationClient(
  input: PairP5AuthGatedRealExecutionInput,
  binding: ExpectedAuthorizationBinding,
  transportFactory: ExecutionPgTransportFactoryDeps | undefined,
  credentialDeps: CredentialAcquirerDeps,
  dedicatedReceipt: PairP5DedicatedTargetBindingReceipt | null = null,
): Promise<
  | {
      readonly client: ExecutionPgClient;
      readonly cleanup: () => void;
      readonly evidencePatch: Partial<PairP5AuthGatedExecutionEvidence>;
    }
  | string
> {
  const structural = validatePairP5PreviewStructuralAuthorityContract(input);
  if (!structural.ok) {
    return structural.holdReasonCode;
  }
  if (dedicatedReceipt === null) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING;
  }
  const preCredentialHold = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
    repoRoot: input.repoRoot,
    dedicatedReceipt,
    purpose: 'LIVE_MUTATION',
    humanPreviewApplyAuthorizationGranted: isPairP5HumanPreviewApplyAuthorizationGranted(),
  });
  if (preCredentialHold !== null) {
    return preCredentialHold;
  }
  const receiptBindingHold = validatePairP5DedicatedReceiptMatchesExecutionBinding(
    dedicatedReceipt,
    binding,
  );
  if (receiptBindingHold !== null) {
    return receiptBindingHold;
  }
  if (!isPairP5LiveCredentialAcquisitionAuthorized()) {
    return HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED;
  }
  pairP5LiveCredentialAcquisitionProbeCount += 1;
  const credentialResult = await acquireSecureStdinConnectionConfig(credentialDeps);
  if (!credentialResult.ok) {
    return credentialResult.holdReasonCode;
  }
  const configResult = buildClientConfig(binding, credentialResult.releaseConnectionSecrets());
  if (typeof configResult === 'string') {
    credentialResult.cleanup();
    return configResult;
  }
  const transport = createExecutionPgTransport(transportFactory ?? {});
  const client = transport.createClient(configResult);
  return {
    client,
    cleanup: credentialResult.cleanup,
    evidencePatch: {
      remoteConnectionAttempted: false,
      pgClientConstructed: true,
      credentialAcquisitionAttempted: true,
      dedicatedTargetBindingReceiptValidated: true,
      dedicatedTargetBindingReceiptIdentifierSha256: dedicatedReceipt.receiptIdentifierSha256,
    },
  };
}

export function probePairP5DedicatedReceiptBeforeCredentialsForTestsOnly(
  input: PairP5AuthGatedRealExecutionInput,
  dedicatedReceipt: PairP5DedicatedTargetBindingReceipt | null,
  permitTestOnlyReceipt: boolean,
): string {
  const structural = validatePairP5PreviewStructuralAuthorityContract(input);
  if (!structural.ok) {
    return structural.holdReasonCode;
  }
  return evaluatePairP5TestOnlyDedicatedReceiptBeforeCredentialsBoundary({
    repoRoot: input.repoRoot,
    dedicatedReceipt,
    permitTestOnlyReceipt,
    humanPreviewApplyAuthorizationGranted: isPairP5HumanPreviewApplyAuthorizationGranted(),
  });
}

async function safeCloseExecutionClient(client: ExecutionPgClient): Promise<boolean> {
  try {
    await client.close();
    return true;
  } catch {
    client.markUnusable();
    return false;
  }
}

type PairP5AuthGatedOrchestrationSurface =
  | PairP5AuthGatedLiveSessionPoolerSurface
  | {
      readonly kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY';
      readonly mutationFakeOptions: FakeExecutionPgClientOptions;
      readonly freshReadonlyFakeOptions: FakeExecutionPgClientOptions;
      readonly freshPostProbeRow: ReturnType<typeof buildMockPairP5PostProbeRow>;
      readonly freshPriorProbeRow: ReturnType<typeof buildMockPairP5PriorProbeRow>;
      readonly mutationCloseFailsAfterCommit?: boolean;
      readonly internalLiveFreshReadonlyStructureExercise?: boolean;
      readonly postConnectDedicatedReceiptLedgerBinding?: PairP5DedicatedReceiptConsumptionBinding | null;
    };

type PairP5FreshReadonlyClassifierSurface =
  | PairP5AuthGatedOrchestrationSurface
  | { readonly kind: 'LIVE_SESSION_POOLER' };

export type PairP5AuthGatedOfflineSimulationOptions = {
  readonly fakeClientOptions?: FakeExecutionPgClientOptions;
  readonly freshReadonlyFakeOptions?: FakeExecutionPgClientOptions;
  readonly priorProbeFieldOverrides?: Partial<Record<string, boolean>>;
  readonly postProbeFieldOverrides?: Partial<Record<string, boolean>>;
  readonly freshPostProbeFieldOverrides?: Partial<Record<string, boolean>>;
  readonly freshPriorProbeFieldOverrides?: Partial<Record<string, boolean>>;
  readonly mutationCloseFailsAfterSuccessfulCommit?: boolean;
  readonly internalLiveFreshReadonlyStructureExercise?: boolean;
  readonly postConnectDedicatedReceiptLedgerBinding?: PairP5DedicatedReceiptConsumptionBinding | null;
  readonly postConnectDedicatedReceiptLedgerSimulateAlreadyConsumed?: boolean;
};

type OrchestrationOutcome = {
  readonly holdReasonCode: string | null;
  readonly evidence: PairP5AuthGatedExecutionEvidence;
  readonly querySequence: readonly string[];
  readonly simulationOnly: boolean;
};

async function attemptRollback(
  client: ExecutionPgClient,
  evidence: PairP5AuthGatedExecutionEvidence,
): Promise<PairP5AuthGatedExecutionEvidence> {
  let acknowledged = false;
  try {
    const result = await client.rollback();
    acknowledged = result.acknowledged === true;
  } catch {
    acknowledged = false;
  }
  try {
    await client.close();
  } catch {
    client.markUnusable();
  }
  return {
    ...evidence,
    rollbackSent: acknowledged,
    rollbackAcknowledged: acknowledged,
    originalConnectionRetired: true,
  };
}

async function retireWithoutRollback(
  client: ExecutionPgClient,
  evidence: PairP5AuthGatedExecutionEvidence,
): Promise<PairP5AuthGatedExecutionEvidence> {
  client.markUnusable();
  try {
    await client.close();
  } catch {
    client.markUnusable();
  }
  return {
    ...evidence,
    rollbackSent: false,
    rollbackAcknowledged: false,
    originalConnectionRetired: true,
  };
}

async function buildMutationClientForSurface(
  input: PairP5AuthGatedRealExecutionInput,
  surface: PairP5AuthGatedOrchestrationSurface,
  binding: ExpectedAuthorizationBinding,
): Promise<
  | {
      readonly client: ExecutionPgClient;
      readonly evidencePatch: Partial<PairP5AuthGatedExecutionEvidence>;
      readonly cleanup: (() => void) | null;
    }
  | string
> {
  if (surface.kind === 'LIVE_SESSION_POOLER') {
    if (!isPairP5HumanPreviewApplyAuthorizationGranted()) {
      return 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED';
    }
    const live = await acquirePairP5LiveMutationClient(
      input,
      binding,
      surface.transportFactory,
      surface.credentialAcquirerDeps ?? PAIR_P5_LIVE_STDIN_FORBIDDEN_DEPS,
      surface.dedicatedTargetBindingReceipt,
    );
    if (typeof live === 'string') {
      return live;
    }
    return { client: live.client, evidencePatch: live.evidencePatch, cleanup: live.cleanup };
  }
  const mutationFactory = createFakeExecutionPgClientFactory(surface.mutationFakeOptions);
  const transport = createExecutionPgTransport({
    createClient: (config) => mutationFactory.createClient(config),
  });
  let client = transport.createClient(PLACEHOLDER_CLIENT_CONFIG);
  if (surface.mutationCloseFailsAfterCommit) {
    client = wrapPairP5SimulationMutationClientCloseFailureAfterCommit(client);
  }
  return {
    client,
    evidencePatch: {
      remoteConnectionAttempted: false,
      pgClientConstructed: true,
      credentialAcquisitionAttempted: false,
    },
    cleanup: null,
  };
}

type FreshPostCommitClassifierResult = {
  readonly ok: boolean;
  readonly freshPriorOk: boolean;
  readonly freshPostOk: boolean;
  readonly evidencePatch: Partial<PairP5AuthGatedExecutionEvidence>;
  readonly querySequence: readonly string[];
  readonly classifierRan: boolean;
};

type FreshReadonlyProbeWork = {
  readonly guardPassed: boolean;
  readonly probesExecuted: boolean;
  readonly freshPriorOk: boolean;
  readonly freshPostOk: boolean;
  readonly catalogOk: boolean;
};

async function executeFreshReadonlyProbeWork(
  freshClient: ExecutionPgClient,
  binding: ExpectedAuthorizationBinding,
  sequence: string[],
): Promise<FreshReadonlyProbeWork> {
  const guardResult = await freshClient.query(POST_CONNECT_GUARD_SQL);
  if (!pairP5ValidatePostConnectGuard(guardResult, binding)) {
    return {
      guardPassed: false,
      probesExecuted: false,
      freshPriorOk: false,
      freshPostOk: false,
      catalogOk: false,
    };
  }
  sequence.push('FRESH_READONLY_POST_CONNECT_GUARD');
  await freshClient.query(FRESH_READONLY_BEGIN_SQL);
  sequence.push('FRESH_READONLY_BEGIN');
  await freshClient.query(
    buildFreshLocalStatementTimeoutSql(TIMEOUT_POLICY.values.postCommitVerificationMs),
  );
  sequence.push('FRESH_READONLY_STATEMENT_TIMEOUT');
  const freshPriorResult = await freshClient.query(PAIR_P5_PRIOR_PROBE_SQL);
  sequence.push('FRESH_READONLY_PRIOR_PROBE');
  const freshPostResult = await freshClient.query(PAIR_P5_POST_PROBE_SQL);
  sequence.push('FRESH_READONLY_POST_PROBE');
  const catalogResult = await freshClient.query(PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL);
  sequence.push('FRESH_READONLY_FUNCTION_BODY_CATALOG_PROBE');
  const catalogOk = validatePairP5FunctionBodyCatalogProbeResult(catalogResult).ok;
  const freshPostOk =
    validatePairP5PostProbeResult(freshPostResult).ok &&
    catalogOk;
  return {
    guardPassed: true,
    probesExecuted: true,
    freshPriorOk: validatePairP5PriorProbeResult(freshPriorResult).ok,
    freshPostOk,
    catalogOk,
  };
}

function buildFreshClassifierResult(
  sequence: string[],
  sessionOpened: boolean,
  work: FreshReadonlyProbeWork,
  closeCompleted: boolean,
): FreshPostCommitClassifierResult {
  const classifierRan = sessionOpened && work.guardPassed && work.probesExecuted;
  const sessionCompleted = classifierRan && closeCompleted;
  return {
    ok: classifierRan && work.freshPostOk && closeCompleted,
    freshPriorOk: work.freshPriorOk,
    freshPostOk: work.freshPostOk,
    classifierRan,
    evidencePatch: {
      freshReadonlySessionOpened: sessionOpened,
      freshReadonlySessionCompleted: sessionCompleted,
      freshReadonlyCloseCompleted: closeCompleted,
      freshReadonlyPriorProbeExecuted: work.probesExecuted,
      freshReadonlyPriorProbeValidated: work.freshPriorOk,
      freshReadonlyPostProbeExecuted: work.probesExecuted,
      freshReadonlyPostProbeValidated: work.freshPostOk,
      freshReadonlyDistinctClientSession: sessionOpened,
      functionBodyCatalogProbeExecutedFreshReadonly: work.probesExecuted,
      functionBodyCatalogProbeValidatedFreshReadonly: work.catalogOk,
    },
    querySequence: sequence,
  };
}

type FreshReadonlyOpenOutcome =
  | { readonly kind: 'client'; readonly client: ExecutionPgClient }
  | { readonly kind: 'blocked'; readonly humanGateClosed: boolean; readonly holdReasonCode: string };

async function openPairP5LiveFreshReadonlyPgClient(
  input: PairP5AuthGatedRealExecutionInput,
  surface: PairP5FreshReadonlyClassifierSurface,
  internalFakeOnly: boolean,
): Promise<FreshReadonlyOpenOutcome> {
  if (!internalFakeOnly) {
    if (!isPairP5HumanPreviewApplyAuthorizationGranted()) {
      return {
        kind: 'blocked',
        humanGateClosed: true,
        holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      };
    }
    const structural = validatePairP5PreviewStructuralAuthorityContract(input);
    if (!structural.ok) {
      return { kind: 'blocked', humanGateClosed: false, holdReasonCode: structural.holdReasonCode };
    }
    // Operational dedicated receipt is not threaded here until Human-authorized issuance exists; boundary fails closed on missing receipt.
    const boundary = evaluatePairP5LiveDedicatedPathPreCredentialBoundary({
      repoRoot: input.repoRoot,
      dedicatedReceipt: null,
      purpose: 'LIVE_FRESH_READONLY',
      humanPreviewApplyAuthorizationGranted: isPairP5HumanPreviewApplyAuthorizationGranted(),
    });
    return {
      kind: 'blocked',
      humanGateClosed: false,
      holdReasonCode: boundary ?? HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING,
    };
  }
  if (surface.kind !== 'INTERNAL_OFFLINE_SIMULATION_ONLY') {
    return {
      kind: 'blocked',
      humanGateClosed: false,
      holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL',
    };
  }
  const structural = validatePairP5PreviewStructuralAuthorityContract(input);
  if (!structural.ok) {
    return { kind: 'blocked', humanGateClosed: false, holdReasonCode: structural.holdReasonCode };
  }
  const freshFactory = createFakeExecutionPgClientFactory(surface.freshReadonlyFakeOptions);
  const freshTransport = createExecutionPgTransport({
    createClient: (config) => freshFactory.createClient(config),
  });
  return { kind: 'client', client: freshTransport.createClient(PLACEHOLDER_CLIENT_CONFIG) };
}

async function runFreshReadonlyPostCommitClassifier(
  input: PairP5AuthGatedRealExecutionInput,
  surface: PairP5FreshReadonlyClassifierSurface,
  binding: ExpectedAuthorizationBinding,
): Promise<FreshPostCommitClassifierResult> {
  const sequence: string[] = [];
  const emptyWork: FreshReadonlyProbeWork = {
    guardPassed: false,
    probesExecuted: false,
    freshPriorOk: false,
    freshPostOk: false,
    catalogOk: false,
  };
  let sessionOpened = false;
  let work: FreshReadonlyProbeWork = emptyWork;
  let freshClient: ExecutionPgClient | null = null;
  let humanGateClosed = false;
  let result: FreshPostCommitClassifierResult = buildFreshClassifierResult(sequence, false, emptyWork, false);

  const usesLiveFreshPath =
    surface.kind === 'LIVE_SESSION_POOLER' ||
    (surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY' &&
      surface.internalLiveFreshReadonlyStructureExercise === true);

  try {
    if (usesLiveFreshPath) {
      const internalFakeOnly =
        surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY' &&
        surface.internalLiveFreshReadonlyStructureExercise === true;
      const opened = await openPairP5LiveFreshReadonlyPgClient(input, surface, internalFakeOnly);
      if (opened.kind === 'blocked') {
        humanGateClosed = opened.humanGateClosed;
        return {
          ...buildFreshClassifierResult(sequence, false, emptyWork, false),
          evidencePatch: {
            ...buildFreshClassifierResult(sequence, false, emptyWork, false).evidencePatch,
            liveFreshReadonlyHumanAuthorizationGateClosed: opened.humanGateClosed,
          },
        };
      }
      freshClient = opened.client;
    } else if (surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY') {
      const freshFactory = createFakeExecutionPgClientFactory(surface.freshReadonlyFakeOptions);
      const freshTransport = createExecutionPgTransport({
        createClient: (config) => freshFactory.createClient(config),
      });
      freshClient = freshTransport.createClient(PLACEHOLDER_CLIENT_CONFIG);
    } else {
      return buildFreshClassifierResult(sequence, false, emptyWork, false);
    }

    await freshClient.connect();
    sessionOpened = true;
    sequence.push('FRESH_READONLY_CONNECT');
    work = await executeFreshReadonlyProbeWork(freshClient, binding, sequence);
  } catch {
    work = emptyWork;
  } finally {
    const closeCompleted = freshClient ? await safeCloseExecutionClient(freshClient) : false;
    result = buildFreshClassifierResult(sequence, sessionOpened, work, closeCompleted);
    if (humanGateClosed) {
      result = {
        ...result,
        evidencePatch: {
          ...result.evidencePatch,
          liveFreshReadonlyHumanAuthorizationGateClosed: true,
        },
      };
    }
  }
  return result;
}

export async function probePairP5LiveFreshReadonlyPostCommitClassifierWhenHumanGateClosed(
  input: PairP5AuthGatedRealExecutionInput,
): Promise<FreshPostCommitClassifierResult> {
  const binding = buildPairP5ExpectedAuthorizationBinding(input);
  return runFreshReadonlyPostCommitClassifier(input, { kind: 'LIVE_SESSION_POOLER' }, binding);
}

function buildInternalFreshReadonlySurface(
  surface: Extract<PairP5AuthGatedOrchestrationSurface, { kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY' }>,
): Extract<PairP5AuthGatedOrchestrationSurface, { kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY' }> {
  return {
    kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY',
    mutationFakeOptions: surface.mutationFakeOptions,
    freshPostProbeRow: surface.freshPostProbeRow,
    freshPriorProbeRow: surface.freshPriorProbeRow,
    freshReadonlyFakeOptions: {
      ...pickAllowlistedFakeClientOptions(surface.freshReadonlyFakeOptions),
      queryHandler: (sql: string) => {
        if (sql.trim() === POST_CONNECT_GUARD_SQL.trim()) {
          return {
            rowCount: 1,
            rows: [
              {
                current_database_name: POST_CONNECT_GUARD_BINDING.expected.current_database_name,
                current_user_name: POST_CONNECT_GUARD_BINDING.expected.current_user_name,
              },
            ],
          };
        }
        if (sql.trim() === PAIR_P5_PRIOR_PROBE_SQL.trim()) {
          return {
            rowCount: surface.freshPriorProbeRow.rowCount,
            rows: [...surface.freshPriorProbeRow.rows],
          };
        }
        if (sql.trim() === PAIR_P5_POST_PROBE_SQL.trim()) {
          return {
            rowCount: surface.freshPostProbeRow.rowCount,
            rows: [...surface.freshPostProbeRow.rows],
          };
        }
        if (sql.trim() === PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL.trim()) {
          return buildMockPairP5FunctionBodyCatalogProbeRow();
        }
        if (sql.trim() === FRESH_READONLY_BEGIN_SQL.trim()) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('statement_timeout')) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      },
    },
  };
}

/**
 * Shared P5-1 transaction orchestration for future live Session pooler execution and offline simulation.
 * Not exported — live surface requires Human GO; simulation uses `simulatePairP5AuthorizationGatedTransactionOffline` only.
 */
async function runPairP5AuthorizationGatedPgTransactionOrchestration(
  input: PairP5AuthGatedRealExecutionInput,
  plan: PairP5IdentityOfflinePlanSuccess,
  surface: PairP5AuthGatedOrchestrationSurface,
): Promise<OrchestrationOutcome> {
  const binding = buildPairP5ExpectedAuthorizationBinding(input);
  const simulationOnly = surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY';
  let evidence = emptyEvidence();
  const querySequence: string[] = [];

  const structuralAuthority = validatePairP5PreviewStructuralAuthorityContract(input);
  evidence = {
    ...evidence,
    previewStructuralAuthorityValidated: structuralAuthority.ok,
    legacyTargetBindingReceiptIssuable: false,
    previewCredentialMethodId: PAIR_P5_PREVIEW_EXECUTABLE_CREDENTIAL_METHOD,
  };
  if (!structuralAuthority.ok) {
    return { holdReasonCode: structuralAuthority.holdReasonCode, evidence, querySequence, simulationOnly };
  }

  const clientBuild = await buildMutationClientForSurface(input, surface, binding);
  if (typeof clientBuild === 'string') {
    return { holdReasonCode: clientBuild, evidence, querySequence, simulationOnly };
  }
  evidence = { ...evidence, ...clientBuild.evidencePatch };
  const client = clientBuild.client;
  const credentialCleanup = clientBuild.cleanup;

  try {
    await client.connect();
    if (surface.kind === 'LIVE_SESSION_POOLER') {
      const guardResult = await client.query(POST_CONNECT_GUARD_SQL);
      if (!pairP5ValidatePostConnectGuard(guardResult, binding)) {
        await client.close();
        return {
          holdReasonCode: 'HOLD_PAIR_P5_POST_CONNECT_GUARD_MISMATCH',
          evidence: { ...evidence, originalConnectionRetired: true },
          querySequence,
          simulationOnly,
        };
      }
      for (const setting of EXPECTED_SESSION_SETTINGS.statements) {
        await client.query(setting.sql);
        querySequence.push('SESSION_POLICY');
      }
    }

    await client.begin();
    evidence = { ...evidence, beginExecuted: true };

    const priorResult = await client.query(PAIR_P5_PRIOR_PROBE_SQL);
    querySequence.push('PRIOR_PROBE');
    evidence = { ...evidence, priorProbeExecuted: true };
    const priorValidation = validatePairP5PriorProbeResult(priorResult);
    if (!priorValidation.ok) {
      evidence = await attemptRollback(client, evidence);
      return {
        holdReasonCode: 'HOLD_PAIR_P5_PROBE_MISMATCH',
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    if (surface.kind === 'LIVE_SESSION_POOLER') {
      const ledgerPort = createPairP5PostgresTransactionalLedgerClaimPortFromExecutionPgClient(client);
      const ledgerHold = await attemptPairP5PostConnectLedgerAtomicClaimInMutationTransaction({
        binding: surface.postConnectDedicatedReceiptLedgerBinding,
        postgresPort: ledgerPort,
      });
      querySequence.push('DEDICATED_RECEIPT_LEDGER_ATOMIC_CLAIM');
      if (ledgerHold !== null) {
        evidence = await attemptRollback(client, evidence);
        return {
          holdReasonCode: ledgerHold,
          evidence,
          querySequence,
          simulationOnly,
        };
      }
    } else {
      const ledgerBinding = surface.postConnectDedicatedReceiptLedgerBinding ?? null;
      if (ledgerBinding !== null) {
        const ledgerPort = createPairP5PostgresTransactionalLedgerClaimPortFromExecutionPgClient(client);
        const ledgerHold = await attemptPairP5PostConnectLedgerAtomicClaimInMutationTransaction({
          binding: ledgerBinding,
          postgresPort: ledgerPort,
        });
        querySequence.push('DEDICATED_RECEIPT_LEDGER_ATOMIC_CLAIM');
        if (ledgerHold !== null) {
          evidence = await attemptRollback(client, evidence);
          return {
            holdReasonCode: ledgerHold,
            evidence,
            querySequence,
            simulationOnly,
          };
        }
      }
    }

    for (const statement of plan.historyInsert.statements) {
      await client.query(statement);
      querySequence.push('MUTATION_STATEMENT');
      evidence = {
        ...evidence,
        mutationStatementsExecuted: evidence.mutationStatementsExecuted + 1,
      };
    }
    if (evidence.mutationStatementsExecuted !== PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT) {
      evidence = await attemptRollback(client, evidence);
      return {
        holdReasonCode: 'HOLD_PAIR_P5_NORMALIZED_STREAM_MISMATCH',
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    await client.query(HISTORY_INSERT_SQL_METADATA, [
      plan.historyInsert.version,
      plan.historyInsert.statements,
      plan.historyInsert.name,
    ]);
    querySequence.push('HISTORY_INSERT');
    evidence = {
      ...evidence,
      historyInsertExecuted: true,
      historyInsertParameterized: true,
    };

    const postResult = await client.query(PAIR_P5_POST_PROBE_SQL);
    querySequence.push('POST_PROBE');
    evidence = { ...evidence, postProbeExecuted: true };
    const postValidation = validatePairP5PostProbeResult(postResult);
    if (!postValidation.ok) {
      evidence = await attemptRollback(client, evidence);
      return {
        holdReasonCode: 'HOLD_PAIR_P5_PROBE_MISMATCH',
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    const catalogResult = await client.query(PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL);
    querySequence.push('FUNCTION_BODY_CATALOG_PROBE');
    evidence = {
      ...evidence,
      functionBodyCatalogProbeExecutedBeforeCommit: true,
      functionBodyCatalogProbeValidatedBeforeCommit: validatePairP5FunctionBodyCatalogProbeResult(
        catalogResult,
      ).ok,
    };
    if (!evidence.functionBodyCatalogProbeValidatedBeforeCommit) {
      evidence = await attemptRollback(client, evidence);
      return {
        holdReasonCode: HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH,
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    evidence = { ...evidence, commitSent: true };
    let commitResponseClass: CommitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
    try {
      const commitResult = await client.commit();
      querySequence.push('COMMIT');
      commitResponseClass = commitResult.responseClass;
    } catch {
      commitResponseClass = 'ACK_UNCERTAIN_OR_MISSING';
      querySequence.push('COMMIT_THROWN');
    }
    evidence = {
      ...evidence,
      commitResponseClass,
    };

    const closeCompleted = await safeCloseExecutionClient(client);
    evidence = {
      ...evidence,
      originalConnectionRetired: true,
      originalConnectionCloseCompleted: closeCompleted,
      rollbackSent: false,
      rollbackAcknowledged: false,
    };

    if (!closeCompleted) {
      return {
        holdReasonCode: HOLD_PAIR_P5_ORIGINAL_CONNECTION_CLOSE_FAILED,
        evidence: {
          ...evidence,
          ackClassifierAckState: null,
        },
        querySequence,
        simulationOnly,
      };
    }

    const branch = branchAfterCommitResponseClass({
      responseClass: commitResponseClass,
      originalConnectionClosed: closeCompleted,
    });

    const freshSurfaceForRun =
      surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY'
        ? buildInternalFreshReadonlySurface(surface)
        : surface;

    let freshAfterCommit: FreshPostCommitClassifierResult = {
      ok: false,
      freshPriorOk: false,
      freshPostOk: false,
      classifierRan: false,
      evidencePatch: {},
      querySequence: [],
    };
    if (branch.ok && branch.lifecycle) {
      freshAfterCommit = await runFreshReadonlyPostCommitClassifier(input, freshSurfaceForRun, binding);
      querySequence.push(...freshAfterCommit.querySequence);
      evidence = { ...evidence, ...freshAfterCommit.evidencePatch };
    }

    const ackState = freshAfterCommit.classifierRan
      ? classifyPairP5PostCommitAckFromFreshObservations(
          commitResponseClass,
          freshAfterCommit.freshPriorOk,
          freshAfterCommit.freshPostOk,
        )
      : 'CONTRADICTORY_OR_DRIFTED';
    evidence = {
      ...evidence,
      ackClassifierAckState: ackState,
    };

    if (commitResponseClass !== 'DEFINITIVE_COMMIT_ACK') {
      return {
        holdReasonCode:
          commitResponseClass === 'DEFINITIVE_TRANSACTION_REJECTION'
            ? HOLD_PAIR_P5_COMMIT_REJECTED
            : 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS',
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    if (!freshAfterCommit.ok || ackState !== 'DEFINITELY_COMMITTED') {
      return {
        holdReasonCode:
          ackState === 'CONTRADICTORY_OR_DRIFTED'
            ? 'HOLD_PAIR_P5_FRESH_READONLY_CONTRADICTORY'
            : 'HOLD_PAIR_P5_FRESH_READONLY_MISMATCH',
        evidence,
        querySequence,
        simulationOnly,
      };
    }

    return {
      holdReasonCode: null,
      evidence,
      querySequence,
      simulationOnly,
    };
  } catch {
    if (evidence.commitSent) {
      const closeCompleted = await safeCloseExecutionClient(client);
      evidence = {
        ...evidence,
        rollbackSent: false,
        rollbackAcknowledged: false,
        originalConnectionRetired: true,
        originalConnectionCloseCompleted: closeCompleted,
        commitResponseClass: evidence.commitResponseClass ?? 'ACK_UNCERTAIN_OR_MISSING',
      };
      const freshSurfaceForRun =
        surface.kind === 'INTERNAL_OFFLINE_SIMULATION_ONLY'
          ? buildInternalFreshReadonlySurface(surface)
          : surface;
      const freshAfterCommit = await runFreshReadonlyPostCommitClassifier(input, freshSurfaceForRun, binding);
      querySequence.push(...freshAfterCommit.querySequence);
      evidence = {
        ...evidence,
        ...freshAfterCommit.evidencePatch,
        ackClassifierAckState: freshAfterCommit.classifierRan
          ? classifyPairP5PostCommitAckFromFreshObservations(
              evidence.commitResponseClass ?? 'ACK_UNCERTAIN_OR_MISSING',
              freshAfterCommit.freshPriorOk,
              freshAfterCommit.freshPostOk,
            )
          : 'CONTRADICTORY_OR_DRIFTED',
      };
      return {
        holdReasonCode: 'HOLD_PAIR_P5_COMMIT_AMBIGUOUS',
        evidence,
        querySequence,
        simulationOnly,
      };
    }
    evidence = await attemptRollback(client, evidence);
    return {
      holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL',
      evidence,
      querySequence,
      simulationOnly,
    };
  } finally {
    credentialCleanup?.();
  }
}

function mapOrchestrationOutcomeToExecutionResult(
  outcome: OrchestrationOutcome,
  baseGate: typeof PAIR_P5_STATIC_EXECUTION_GATE,
  simulationOnly: boolean,
): PairP5AuthGatedRealExecutionResult {
  if (outcome.holdReasonCode) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: outcome.holdReasonCode,
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence: outcome.evidence,
      querySequence: outcome.querySequence,
      ...baseGate,
    };
  }
  if (simulationOnly) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_OFFLINE_SIMULATION_COMPLETE',
      holdReasonCode: null,
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence: outcome.evidence,
      querySequence: outcome.querySequence,
      simulationOnly: true,
      simulationCannotAuthorizeApply: true,
      ...baseGate,
    };
  }
  return {
    mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
    holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
    executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
    evidence: outcome.evidence,
    ...baseGate,
  };
}

export function preparePairP5LiveSessionPoolerOrchestrationSurface(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5AuthGatedLiveSessionPoolerSurface | string {
  const receipt = input.dedicatedTargetBindingReceipt ?? null;
  if (receipt === null) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING;
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
    credentialAcquirerDeps: PAIR_P5_LIVE_STDIN_FORBIDDEN_DEPS,
    dedicatedTargetBindingReceipt: resolved.receipt,
    postConnectDedicatedReceiptLedgerBinding: resolved.binding,
  };
}

export async function executePairP5IdentityAuthorizationGatedRealExecution(
  input: PairP5AuthGatedRealExecutionInput,
): Promise<PairP5AuthGatedRealExecutionResult> {
  const baseGate = { ...PAIR_P5_STATIC_EXECUTION_GATE };
  const evidence = emptyEvidence();

  const planOrHold = buildOfflinePlanOrHold(input);
  if (typeof planOrHold === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: planOrHold,
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
  const plan: PairP5IdentityOfflinePlanSuccess = planOrHold;

  const liveSurface = preparePairP5LiveSessionPoolerOrchestrationSurface(input);
  if (typeof liveSurface === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: liveSurface,
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }

  if (!isPairP5HumanPreviewApplyAuthorizationGranted()) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_EXECUTION_DISABLED',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }

  if (PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized !== false) {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED',
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }

  try {
    const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(input, plan, liveSurface);
    return mapOrchestrationOutcomeToExecutionResult(outcome, baseGate, false);
  } catch {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: 'HOLD_PAIR_P5_CREDENTIAL_ACQUISITION_NOT_WIRED_IN_THIS_GATE',
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence,
      ...baseGate,
    };
  }
}

/**
 * Offline-only bounded simulation using internal fake PG clients. Not a live apply proof.
 */
export async function simulatePairP5AuthorizationGatedTransactionOffline(
  input: PairP5AuthGatedRealExecutionInput,
  options: PairP5AuthGatedOfflineSimulationOptions = {},
): Promise<PairP5AuthGatedRealExecutionResult> {
  const baseGate = { ...PAIR_P5_STATIC_EXECUTION_GATE };
  const planOrHold = buildOfflinePlanOrHold(input);
  if (typeof planOrHold === 'string') {
    return {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      holdReasonCode: planOrHold,
      executorId: PAIR_P5_AUTH_GATED_REAL_EXECUTOR_ID,
      evidence: emptyEvidence(),
      ...baseGate,
    };
  }
  const plan: PairP5IdentityOfflinePlanSuccess = planOrHold;

  const priorRow = buildMockPairP5PriorProbeRow(options.priorProbeFieldOverrides ?? {});
  const postRow = buildMockPairP5PostProbeRow(options.postProbeFieldOverrides ?? {});
  const freshPostRow = buildMockPairP5PostProbeRow(
    options.freshPostProbeFieldOverrides ?? options.postProbeFieldOverrides ?? {},
  );
  const freshPriorRow = buildMockPairP5PriorProbeRow(
    options.freshPriorProbeFieldOverrides ?? { history_total_twenty_two: false },
  );

  const simulatedLedgerConsumed = new Set<string>();
  const ledgerBinding = options.postConnectDedicatedReceiptLedgerBinding ?? null;
  const mutationFakeOptions: FakeExecutionPgClientOptions = {
    ...pickAllowlistedFakeClientOptions(options.fakeClientOptions),
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
      if (sql.trim() === PAIR_P5_PRIOR_PROBE_SQL.trim()) {
        return { rowCount: priorRow.rowCount, rows: [...priorRow.rows] };
      }
      if (sql.trim() === PAIR_P5_POST_PROBE_SQL.trim()) {
        return { rowCount: postRow.rowCount, rows: [...postRow.rows] };
      }
      if (sql.trim() === PAIR_P5_FUNCTION_BODY_CATALOG_PROBE_SQL.trim()) {
        return buildMockPairP5FunctionBodyCatalogProbeRow();
      }
      if (sql === HISTORY_INSERT_SQL_METADATA) {
        if (
          values?.[0] === plan.historyInsert.version &&
          Array.isArray(values?.[1]) &&
          values[1].length === PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT &&
          values?.[2] === plan.historyInsert.name
        ) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
  };

  const outcome = await runPairP5AuthorizationGatedPgTransactionOrchestration(input, plan, {
    kind: 'INTERNAL_OFFLINE_SIMULATION_ONLY',
    mutationFakeOptions,
    freshReadonlyFakeOptions: pickAllowlistedFakeClientOptions(options.freshReadonlyFakeOptions),
    freshPostProbeRow: freshPostRow,
    freshPriorProbeRow: freshPriorRow,
    mutationCloseFailsAfterCommit: options.mutationCloseFailsAfterSuccessfulCommit === true,
    internalLiveFreshReadonlyStructureExercise: options.internalLiveFreshReadonlyStructureExercise === true,
    postConnectDedicatedReceiptLedgerBinding: ledgerBinding,
  });

  return mapOrchestrationOutcomeToExecutionResult(outcome, baseGate, true);
}

export function serializePairP5AuthGatedRealExecutionResult(
  result: PairP5AuthGatedRealExecutionResult,
): string {
  return JSON.stringify(result, null, 2);
}

export const PAIR_P5_EXPECTED_PRIOR_HISTORY_VERSIONS = PAIR_P5_PRE_IDENTITY_EXECUTION_HISTORY_VERSIONS;
