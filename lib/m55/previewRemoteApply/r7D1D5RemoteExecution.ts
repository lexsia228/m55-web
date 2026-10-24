import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildCanonicalExpectedManifest,
  deriveNormalizedStatementsFromSourceBytes,
  type ExternalReviewedCandidateBinding,
  type MigrationHistoryEntry,
  type R7DeltaStepId,
  type R7DeltaStepPlan,
  R7_PREVIEW_TARGET_PROJECT,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
  buildPolicy2HistoryPayloadForDelta,
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
  branchAfterCommitResponseClass,
  type AckStateIdentifier,
  type CommitResponseClass,
} from './remoteExecutionLifecycleAuthority.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export const R7_DELTA_STEP_ORDER: readonly R7DeltaStepId[] = ['D1', 'D2', 'D3', 'D4', 'D5'] as const;

export const R7_LOCAL_IMPLEMENTATION_MODE = 'LOCAL_OFFLINE_FAKE_TRANSPORT_ONLY' as const;

/** Live Preview apply requires an authorized migration-lock contract on the transport (not satisfied by fake transport tests). */
export const R7_LIVE_EXECUTION_MIGRATION_LOCK_REQUIREMENT =
  'AUTHORIZED_PREVIEW_MIGRATION_LOCK_OR_EQUIVALENT_FAIL_CLOSED' as const;

export type R7RemoteExecutionHoldCode =
  | 'HOLD_REPO_IDENTITY_MISMATCH'
  | 'HOLD_PREVIEW_TARGET_MISMATCH'
  | 'HOLD_STEP_NOT_FOUND'
  | 'HOLD_SOURCE_DIGEST_MISMATCH'
  | 'HOLD_HISTORY_PREFIX_MISMATCH'
  | 'HOLD_AUTHORIZATION_GATE'
  | 'HOLD_PRE_PROBE_FAILED'
  | 'HOLD_MUTATION_SEQUENCE_FAILED'
  | 'HOLD_HISTORY_INSERT_FAILED'
  | 'HOLD_POST_PROBE_FAILED'
  | 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP'
  | 'HOLD_POST_COMMIT_VERIFICATION_FAILED'
  | 'HOLD_PRE_COMMIT_FAILURE_ROLLBACK'
  | 'HOLD_LIVE_TRANSPORT_FORBIDDEN_IN_LOCAL_GATE'
  | 'HOLD_LIVE_MIGRATION_LOCK_CONTRACT_MISSING'
  | 'HOLD_TRANSACTION_BEGIN_FAILED'
  | 'HOLD_HISTORY_READONLY_QUERY_FAILED'
  | 'HOLD_PROBE_QUERY_FAILED'
  | 'HOLD_HISTORY_INSERT_QUERY_FAILED'
  | 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING';

export type R7PostCommitVerificationState =
  | 'HISTORY_READONLY_VERIFIED'
  | 'CONTRADICTORY_OR_DRIFTED'
  | 'PENDING_FRESH_READONLY_CLASSIFICATION';

export type R7PostCommitCatalogVerificationState = 'PENDING_FRESH_READONLY_CATALOG' | 'VERIFIED';

export type R7ExecutionLifecycleStage =
  | 'TARGET_IDENTITY_CHECK'
  | 'AUTHORIZATION_GATE'
  | 'BEGIN'
  | 'HISTORY_PREFIX_CHECK'
  | 'PRE_PROBE'
  | 'MUTATION_STATEMENTS'
  | 'HISTORY_INSERT'
  | 'POST_PROBE'
  | 'COMMIT'
  | 'POST_COMMIT_READONLY_VERIFICATION'
  | 'PRE_COMMIT_FAILURE_ROLLBACK'
  | 'STOP';

export type R7FakeCatalogPhase = 'pre' | 'post';

export type R7FakeCatalogState = {
  appliedSteps: ReadonlySet<R7DeltaStepId>;
  d4IndexValid: boolean;
  d4IndexReady: boolean;
  d4IndexKeyOrderOk: boolean;
  d4IndexPredicateOk: boolean;
  d5DuplicateActiveViolation: boolean;
  d5IndexValid: boolean;
  d5IndexReady: boolean;
  d5IndexSingleKeyOk: boolean;
  d5IndexPredicateOk: boolean;
  d5NonPrivilegedExecuteAbsent: boolean;
  d5CanonicalServiceRoleExecute: boolean;
};

export type R7FakeInjectedFailures = {
  throwOnBegin?: boolean;
  throwOnHistoryRead?: boolean;
  throwOnPreProbeQuery?: boolean;
  throwOnHistoryInsert?: boolean;
  throwOnPostProbeQuery?: boolean;
  throwOnCommit?: boolean;
};

type TransactionSnapshot = {
  historyVersions: string[];
  catalog: R7FakeCatalogState;
  executedStatements: string[];
};

export type R7FakeTransportQueryResult = {
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number;
};

export type R7FakeTransport = {
  readonly mode: typeof R7_LOCAL_IMPLEMENTATION_MODE;
  readonly migrationLockContractSatisfied: boolean;
  catalog: R7FakeCatalogState;
  historyVersions: string[];
  inTransaction: boolean;
  rolledBack: boolean;
  committed: boolean;
  ambiguousCommit: boolean;
  lifecycleLog: R7ExecutionLifecycleStage[];
  executedStatements: string[];
  commitResponseClass: CommitResponseClass;
  postCommitHistoryMismatch: boolean;
  injectFailures: R7FakeInjectedFailures;
  readonly queries: Array<{ sql: string; params?: unknown[] }>;
  begin(): void;
  rollback(): void;
  commit(): { responseClass: CommitResponseClass };
  query(sql: string, params?: unknown[]): Promise<R7FakeTransportQueryResult>;
};

export type R7RemoteExecutionPublicEvidence = {
  readonly stepId: R7DeltaStepId;
  readonly lifecycleStages: readonly R7ExecutionLifecycleStage[];
  readonly statementCount: number;
  readonly preProbeId: R7RuntimeProbeId;
  readonly postProbeId: R7RuntimeProbeId;
  readonly commitResponseClass: CommitResponseClass | null;
  readonly ackState: AckStateIdentifier | null;
  readonly postCommitVerificationState: R7PostCommitVerificationState | null;
  readonly postCommitCatalogVerificationState: R7PostCommitCatalogVerificationState | null;
  readonly outcome: 'SUCCESS' | 'HOLD' | 'PRE_COMMIT_FAILURE';
  readonly holdReasonCode: string | null;
};

const HISTORY_READONLY_SELECT_SQL =
  'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC';

function cloneCatalogState(catalog: R7FakeCatalogState): R7FakeCatalogState {
  return {
    appliedSteps: new Set(catalog.appliedSteps),
    d4IndexValid: catalog.d4IndexValid,
    d4IndexReady: catalog.d4IndexReady,
    d4IndexKeyOrderOk: catalog.d4IndexKeyOrderOk,
    d4IndexPredicateOk: catalog.d4IndexPredicateOk,
    d5DuplicateActiveViolation: catalog.d5DuplicateActiveViolation,
    d5IndexValid: catalog.d5IndexValid,
    d5IndexReady: catalog.d5IndexReady,
    d5IndexSingleKeyOk: catalog.d5IndexSingleKeyOk,
    d5IndexPredicateOk: catalog.d5IndexPredicateOk,
    d5NonPrivilegedExecuteAbsent: catalog.d5NonPrivilegedExecuteAbsent,
    d5CanonicalServiceRoleExecute: catalog.d5CanonicalServiceRoleExecute,
  };
}

function historyVersionsMatchPrefix(observed: readonly string[], expected: readonly MigrationHistoryEntry[]): boolean {
  if (observed.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (observed[i] !== expected[i].version) return false;
  }
  return true;
}

function tailVersion(prefix: readonly MigrationHistoryEntry[]): string {
  if (prefix.length === 0) throw new Error('HOLD_EMPTY_HISTORY_PREFIX');
  return prefix[prefix.length - 1].version;
}

async function readHistoryVersionsReadonly(transport: R7FakeTransport): Promise<string[]> {
  const result = await transport.query(HISTORY_READONLY_SELECT_SQL);
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

function buildSyntheticProbePayload(
  probeId: R7RuntimeProbeId,
  catalog: R7FakeCatalogState,
  stepId: R7DeltaStepId,
  phase: R7FakeCatalogPhase,
): Record<string, unknown> {
  const stepApplied = catalog.appliedSteps.has(stepId);
  const effectivePost = phase === 'post' ? true : stepApplied;

  switch (probeId) {
    case 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT':
      return { probe_payload: { anchor_table_count: effectivePost ? 7 : 0 } };
    case 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT':
      return {
        probe_payload: {
          anchor_table_count: 7,
          reject_mutation_function_present: true,
          reject_mutation_empty_args: true,
          snapshots_content_fingerprint_text_column_ok: true,
        },
      };
    case 'R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT':
      return {
        probe_payload: {
          purchase_money_table_absent: !effectivePost,
          record_function_absent: true,
        },
      };
    case 'R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT':
      return {
        probe_payload: {
          purchase_money_table_present: true,
          canonical_payment_evidence_id_column_present: true,
          record_function_present: true,
          record_function_signature_ok: true,
          record_function_search_path_empty: true,
        },
      };
    case 'R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT':
      return {
        probe_payload: {
          refund_table_absent: !effectivePost,
          dispute_table_absent: !effectivePost,
        },
      };
    case 'R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT':
      return {
        probe_payload: {
          refund_table_present: true,
          dispute_table_present: true,
          refund_record_function_present: true,
          refund_record_function_signature_ok: true,
          refund_record_function_search_path_empty: true,
        },
      };
    case 'R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT':
      return { probe_payload: { ledger_table_absent: !effectivePost } };
    case 'R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT':
      return {
        probe_payload: {
          ledger_table_present: true,
          one_accrual_unique_index_present: true,
          one_accrual_index_on_ledger_table: true,
          one_accrual_index_unique: true,
          one_accrual_index_valid: catalog.d4IndexValid,
          one_accrual_index_ready: catalog.d4IndexReady,
          one_accrual_index_key_order_ok: catalog.d4IndexKeyOrderOk,
          one_accrual_index_predicate_exact_ok: catalog.d4IndexPredicateOk,
          insert_ledger_function_present: true,
          insert_ledger_function_signature_ok: true,
        },
      };
    case 'R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT':
      return {
        probe_payload: {
          issue_or_get_absent: !effectivePost,
          rotate_absent: !effectivePost,
          one_active_unique_index_absent: !effectivePost,
        },
      };
    case 'R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT':
      return {
        probe_payload: {
          issue_or_get_present: true,
          rotate_present: true,
          issue_or_get_signature_ok: true,
          rotate_signature_ok: true,
          issue_or_get_service_role_execute: catalog.d5CanonicalServiceRoleExecute,
          rotate_service_role_execute: catalog.d5CanonicalServiceRoleExecute,
          issue_or_get_security_definer: true,
          rotate_security_definer: true,
          issue_or_get_search_path_empty: true,
          rotate_search_path_empty: true,
          issue_or_get_non_privileged_execute_absent: catalog.d5NonPrivilegedExecuteAbsent,
          rotate_non_privileged_execute_absent: catalog.d5NonPrivilegedExecuteAbsent,
          one_active_index_on_referral_links_table: true,
          one_active_index_unique: true,
          one_active_index_valid: catalog.d5IndexValid,
          one_active_index_ready: catalog.d5IndexReady,
          one_active_index_single_key_ok: catalog.d5IndexSingleKeyOk,
          one_active_index_predicate_exact_ok: catalog.d5IndexPredicateOk,
          duplicate_active_violation_present: catalog.d5DuplicateActiveViolation,
          post_apply_unique_index_invariant_scope_only: true,
        },
      };
    default:
      return { probe_payload: {} };
  }
}

export function createR7FakeTransport(initialHistory: readonly MigrationHistoryEntry[]): R7FakeTransport {
  let txSnapshot: TransactionSnapshot | null = null;

  const transport: R7FakeTransport = {
    mode: R7_LOCAL_IMPLEMENTATION_MODE,
    migrationLockContractSatisfied: true,
    catalog: {
      appliedSteps: new Set(),
      d4IndexValid: true,
      d4IndexReady: true,
      d4IndexKeyOrderOk: true,
      d4IndexPredicateOk: true,
      d5DuplicateActiveViolation: false,
      d5IndexValid: true,
      d5IndexReady: true,
      d5IndexSingleKeyOk: true,
      d5IndexPredicateOk: true,
      d5NonPrivilegedExecuteAbsent: true,
      d5CanonicalServiceRoleExecute: true,
    },
    injectFailures: {},
    historyVersions: initialHistory.map((e) => e.version),
    inTransaction: false,
    rolledBack: false,
    committed: false,
    ambiguousCommit: false,
    lifecycleLog: [],
    executedStatements: [],
    commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
    postCommitHistoryMismatch: false,
    queries: [],
    begin() {
      if (this.injectFailures.throwOnBegin) {
        throw new Error('INJECTED_BEGIN_FAILURE');
      }
      txSnapshot = {
        historyVersions: [...this.historyVersions],
        catalog: cloneCatalogState(this.catalog),
        executedStatements: [...this.executedStatements],
      };
      this.inTransaction = true;
      this.rolledBack = false;
      this.committed = false;
      this.ambiguousCommit = false;
    },
    rollback() {
      if (txSnapshot) {
        this.historyVersions = [...txSnapshot.historyVersions];
        this.catalog = cloneCatalogState(txSnapshot.catalog);
        this.executedStatements = [...txSnapshot.executedStatements];
      }
      this.inTransaction = false;
      this.rolledBack = true;
      this.committed = false;
      this.ambiguousCommit = false;
      txSnapshot = null;
    },
    commit() {
      if (this.injectFailures.throwOnCommit) {
        throw new Error('INJECTED_COMMIT_TRANSPORT_FAILURE');
      }
      const responseClass = this.commitResponseClass;
      if (responseClass === 'DEFINITIVE_COMMIT_ACK') {
        this.inTransaction = false;
        this.committed = true;
        this.ambiguousCommit = false;
        txSnapshot = null;
        return { responseClass };
      }
      if (txSnapshot) {
        this.historyVersions = [...txSnapshot.historyVersions];
        this.catalog = cloneCatalogState(txSnapshot.catalog);
        this.executedStatements = [...txSnapshot.executedStatements];
      }
      this.inTransaction = false;
      this.committed = false;
      this.ambiguousCommit = true;
      txSnapshot = null;
      return { responseClass };
    },
    async query(sql, params) {
      this.queries.push({ sql, params });
      if (sql === HISTORY_READONLY_SELECT_SQL && this.injectFailures.throwOnHistoryRead) {
        throw new Error('INJECTED_HISTORY_READ_FAILURE');
      }
      const probeIdMatchEarly = /-- R7_PROBE_ID:([A-Z0-9_]+)/.exec(sql);
      const phaseMatchEarly = /-- R7_PROBE_PHASE:(pre|post)/.exec(sql);
      if (probeIdMatchEarly && phaseMatchEarly) {
        if (phaseMatchEarly[1] === 'pre' && this.injectFailures.throwOnPreProbeQuery) {
          throw new Error('INJECTED_PRE_PROBE_FAILURE');
        }
        if (phaseMatchEarly[1] === 'post' && this.injectFailures.throwOnPostProbeQuery) {
          throw new Error('INJECTED_POST_PROBE_FAILURE');
        }
      }
      if (
        (sql === HISTORY_INSERT_SQL_METADATA || sql.startsWith('INSERT INTO supabase_migrations')) &&
        this.injectFailures.throwOnHistoryInsert
      ) {
        throw new Error('INJECTED_HISTORY_INSERT_FAILURE');
      }
      if (sql === HISTORY_READONLY_SELECT_SQL) {
        const versions = this.postCommitHistoryMismatch && !this.inTransaction
          ? this.historyVersions.slice(0, -1)
          : [...this.historyVersions];
        const rows = versions.map((version) => ({ version }));
        return { rows, rowCount: rows.length };
      }
      const probeIdMatch = /-- R7_PROBE_ID:([A-Z0-9_]+)/.exec(sql);
      const phaseMatch = /-- R7_PROBE_PHASE:(pre|post)/.exec(sql);
      if (probeIdMatch && phaseMatch) {
        const probeId = probeIdMatch[1] as R7RuntimeProbeId;
        const phase = phaseMatch[1] as R7FakeCatalogPhase;
        const stepFromId = probeId.match(/R7_(D[1-5])_/)?.[1] as R7DeltaStepId;
        const payload = buildSyntheticProbePayload(probeId, this.catalog, stepFromId, phase);
        return { rows: [payload], rowCount: 1 };
      }
      if (sql === HISTORY_INSERT_SQL_METADATA || sql.startsWith('INSERT INTO supabase_migrations')) {
        const version = String(params?.[0] ?? '');
        if (this.inTransaction && version) {
          this.historyVersions = [...this.historyVersions, version].sort((a, b) => a.localeCompare(b, 'en'));
        }
        return { rows: [], rowCount: 1 };
      }
      if (this.inTransaction) {
        this.executedStatements.push(sql);
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return transport;
}

export type ResolveR7StepPlanInput = {
  readonly repoRoot: string;
  readonly stepId: R7DeltaStepId;
  readonly expectedSourceSha256: string;
  readonly expectedNormalizedCompositeSha256: string;
};

export function resolveR7StepPlan(input: ResolveR7StepPlanInput): R7DeltaStepPlan {
  const manifest = buildCanonicalExpectedManifest(input.repoRoot);
  const step = manifest.steps.find((s) => s.stepId === input.stepId);
  if (!step) throw new Error('HOLD_STEP_NOT_FOUND');
  if (step.source.sourceSha256 !== input.expectedSourceSha256) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  if (step.normalized.normalizedStreamCompositeSha256 !== input.expectedNormalizedCompositeSha256) {
    throw new Error('HOLD_SOURCE_DIGEST_MISMATCH');
  }
  return step;
}

export type ExecuteR7DeltaStepInput = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly stepId: R7DeltaStepId;
  readonly transport: R7FakeTransport;
  readonly reviewedCandidateBinding: ExternalReviewedCandidateBinding | null;
  readonly humanAuthorization: R7HumanExecutionAuthorizationDocument | null;
  readonly offlineManifestExecutionAuthorized: boolean;
  readonly allowLiveTransport: false;
};

function wrapProbeSql(probeId: R7RuntimeProbeId, phase: R7FakeCatalogPhase, sql: string): string {
  return `-- R7_PROBE_ID:${probeId}\n-- R7_PROBE_PHASE:${phase}\n${sql}`;
}

export async function executeR7DeltaStepOffline(
  input: ExecuteR7DeltaStepInput,
): Promise<R7RemoteExecutionPublicEvidence> {
  const lifecycle: R7ExecutionLifecycleStage[] = [];
  const log = (stage: R7ExecutionLifecycleStage) => {
    lifecycle.push(stage);
    input.transport.lifecycleLog.push(stage);
  };

  if (input.allowLiveTransport !== false) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_LIVE_TRANSPORT_FORBIDDEN_IN_LOCAL_GATE', null);
  }
  if (input.transport.mode !== R7_LOCAL_IMPLEMENTATION_MODE) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_LIVE_TRANSPORT_FORBIDDEN_IN_LOCAL_GATE', null);
  }

  log('TARGET_IDENTITY_CHECK');
  if (input.repoRoot !== R7_PR249_FROZEN_REPO_ROOT || input.branch !== R7_PR249_FROZEN_BRANCH) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_REPO_IDENTITY_MISMATCH', null);
  }

  const manifest = buildCanonicalExpectedManifest(input.repoRoot);
  if (
    manifest.previewTarget.project !== R7_PREVIEW_TARGET_PROJECT ||
    manifest.previewTarget.projectRef !== R7_PREVIEW_TARGET_PROJECT_REF
  ) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PREVIEW_TARGET_MISMATCH', null);
  }

  const stepPlan = manifest.steps.find((s) => s.stepId === input.stepId);
  if (!stepPlan) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_STEP_NOT_FOUND', null);
  }

  const rawBytes = readFileSync(join(input.repoRoot, stepPlan.source.relativePath));
  const { statements, normalized } = deriveNormalizedStatementsFromSourceBytes(rawBytes, stepPlan.source);
  if (normalized.normalizedStreamCompositeSha256 !== stepPlan.normalized.normalizedStreamCompositeSha256) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_SOURCE_DIGEST_MISMATCH', null);
  }

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
    preProbeId: stepPlan.catalogProbes.preProbeId as R7RuntimeProbeId,
    postProbeId: stepPlan.catalogProbes.postProbeId as R7RuntimeProbeId,
    expectedPriorHistoryVersionTail: tailVersion(stepPlan.historyPrefixPrior),
    offlineManifestExecutionAuthorized: input.offlineManifestExecutionAuthorized,
  });
  if (!auth.ok) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_AUTHORIZATION_GATE', auth.holdReasonCode);
  }

  const preProbeId = stepPlan.catalogProbes.preProbeId as R7RuntimeProbeId;
  const postProbeId = stepPlan.catalogProbes.postProbeId as R7RuntimeProbeId;
  const preProbeSql = getR7RuntimeProbeDefinition(input.repoRoot, preProbeId).sqlText;

  return await runTransactionalApply({
    input,
    stepPlan,
    statements,
    lifecycle,
    preProbeId,
    postProbeId,
    preProbeSql,
    log,
  });
}

function holdEvidence(
  stepId: R7DeltaStepId,
  lifecycle: R7ExecutionLifecycleStage[],
  code: R7RemoteExecutionHoldCode | string,
  detail: string | null,
): R7RemoteExecutionPublicEvidence {
  return {
    stepId,
    lifecycleStages: lifecycle,
    statementCount: 0,
    preProbeId: 'R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT',
    postProbeId: 'R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT',
    commitResponseClass: null,
    ackState: null,
    postCommitVerificationState: null,
    postCommitCatalogVerificationState: null,
    outcome: 'HOLD',
    holdReasonCode: detail ?? code,
  };
}

function ambiguousCommitHoldEvidence(
  input: ExecuteR7DeltaStepInput,
  lifecycle: R7ExecutionLifecycleStage[],
  preProbeId: R7RuntimeProbeId,
  postProbeId: R7RuntimeProbeId,
  commitResponseClass: CommitResponseClass | null,
  statementCount: number,
): R7RemoteExecutionPublicEvidence {
  return {
    stepId: input.stepId,
    lifecycleStages: lifecycle,
    statementCount,
    preProbeId,
    postProbeId,
    commitResponseClass,
    ackState: 'CONTRADICTORY_OR_DRIFTED',
    postCommitVerificationState: 'PENDING_FRESH_READONLY_CLASSIFICATION',
    postCommitCatalogVerificationState: 'PENDING_FRESH_READONLY_CATALOG',
    outcome: 'HOLD',
    holdReasonCode: 'HOLD_COMMIT_ACK_AMBIGUOUS_MANDATORY_STOP',
  };
}

type TransactionalApplyContext = {
  input: ExecuteR7DeltaStepInput;
  stepPlan: R7DeltaStepPlan;
  statements: readonly string[];
  lifecycle: R7ExecutionLifecycleStage[];
  preProbeId: R7RuntimeProbeId;
  postProbeId: R7RuntimeProbeId;
  preProbeSql: string;
  log: (stage: R7ExecutionLifecycleStage) => void;
};

async function runTransactionalApply(ctx: TransactionalApplyContext): Promise<R7RemoteExecutionPublicEvidence> {
  const { input, stepPlan, statements, lifecycle, preProbeId, postProbeId, preProbeSql, log } = ctx;
  const transport = input.transport;

  if (!transport.migrationLockContractSatisfied) {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_LIVE_MIGRATION_LOCK_CONTRACT_MISSING', null);
  }

  log('BEGIN');
  try {
    transport.begin();
  } catch {
    return holdEvidence(input.stepId, lifecycle, 'HOLD_TRANSACTION_BEGIN_FAILED', null);
  }

  log('HISTORY_PREFIX_CHECK');
  let observedPrefix: string[];
  try {
    observedPrefix = await readHistoryVersionsReadonly(transport);
  } catch {
    transport.rollback();
    return holdEvidence(input.stepId, lifecycle, 'HOLD_HISTORY_READONLY_QUERY_FAILED', null);
  }
  if (!historyVersionsMatchPrefix(observedPrefix, stepPlan.historyPrefixPrior)) {
    transport.rollback();
    return holdEvidence(input.stepId, lifecycle, 'HOLD_HISTORY_PREFIX_MISMATCH', null);
  }

  log('PRE_PROBE');
  let preRow: R7FakeTransportQueryResult;
  try {
    preRow = await transport.query(wrapProbeSql(preProbeId, 'pre', preProbeSql));
  } catch {
    transport.rollback();
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PROBE_QUERY_FAILED', null);
  }
  const preValidation = validateR7RuntimeProbeResult(preProbeId, preRow.rows[0]);
  if (!preValidation.ok) {
    transport.rollback();
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
      await transport.query(stmt);
    } catch {
      log('PRE_COMMIT_FAILURE_ROLLBACK');
      transport.rollback();
      return {
        stepId: input.stepId,
        lifecycleStages: lifecycle,
        statementCount: transport.executedStatements.length,
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
    await transport.query(HISTORY_INSERT_SQL_METADATA, [
      historyPayload.version,
      historyPayload.statements,
      historyPayload.name,
    ]);
  } catch {
    transport.rollback();
    return holdEvidence(input.stepId, lifecycle, 'HOLD_HISTORY_INSERT_QUERY_FAILED', null);
  }

  transport.catalog = {
    ...transport.catalog,
    appliedSteps: new Set([...transport.catalog.appliedSteps, input.stepId]),
  };

  log('POST_PROBE');
  const postProbeSql = getR7RuntimeProbeDefinition(input.repoRoot, postProbeId).sqlText;
  let postRow: R7FakeTransportQueryResult;
  try {
    postRow = await transport.query(wrapProbeSql(postProbeId, 'post', postProbeSql));
  } catch {
    transport.rollback();
    return holdEvidence(input.stepId, lifecycle, 'HOLD_PROBE_QUERY_FAILED', null);
  }
  const postValidation = validateR7RuntimeProbeResult(postProbeId, postRow.rows[0]);
  if (!postValidation.ok) {
    transport.rollback();
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount: transport.executedStatements.length,
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
    commitResult = transport.commit();
  } catch {
    log('STOP');
    return ambiguousCommitHoldEvidence(
      input,
      lifecycle,
      preProbeId,
      postProbeId,
      'ACK_UNCERTAIN_OR_MISSING',
      transport.executedStatements.length,
    );
  }
  const branch = branchAfterCommitResponseClass({
    responseClass: commitResult.responseClass,
    originalConnectionClosed: true,
  });
  if (!branch.ok) {
    log('STOP');
    return ambiguousCommitHoldEvidence(
      input,
      lifecycle,
      preProbeId,
      postProbeId,
      commitResult.responseClass,
      transport.executedStatements.length,
    );
  }

  if (
    commitResult.responseClass === 'ACK_UNCERTAIN_OR_MISSING' ||
    commitResult.responseClass === 'DEFINITIVE_TRANSACTION_REJECTION'
  ) {
    log('STOP');
    return ambiguousCommitHoldEvidence(
      input,
      lifecycle,
      preProbeId,
      postProbeId,
      commitResult.responseClass,
      transport.executedStatements.length,
    );
  }

  log('POST_COMMIT_READONLY_VERIFICATION');
  let observedPostCommit: string[];
  try {
    observedPostCommit = await readHistoryVersionsReadonly(transport);
  } catch {
    log('STOP');
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount: transport.executedStatements.length,
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
  if (!historyVersionsMatchPrefix(observedPostCommit, stepPlan.historyPrefixPost)) {
    log('STOP');
    return {
      stepId: input.stepId,
      lifecycleStages: lifecycle,
      statementCount: transport.executedStatements.length,
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

  log('STOP');
  return {
    stepId: input.stepId,
    lifecycleStages: lifecycle,
    statementCount: statements.length,
    preProbeId,
    postProbeId,
    commitResponseClass: commitResult.responseClass,
    ackState: 'DEFINITELY_COMMITTED',
    postCommitVerificationState: 'HISTORY_READONLY_VERIFIED',
    postCommitCatalogVerificationState: 'PENDING_FRESH_READONLY_CATALOG',
    outcome: 'HOLD',
    holdReasonCode: 'HOLD_POST_COMMIT_CATALOG_VERIFICATION_PENDING',
  };
}
