/**
 * M55 Preview post-remediation deletion smoke orchestrator (LOCAL dry-run default).
 * Subject: M55_PREVIEW_DELETE_POST_REMEDIATION_01 on deployment dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh.
 *
 * No network, Clerk, webhook, DB, or RPC capability in default mode.
 */

import {
  APPROVED_BRANCH,
  APPROVED_DEPLOYMENT_ID,
  APPROVED_FEATURE_HEAD,
  HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH,
  PLANNING_DEPLOYMENT_ID,
  CLERK_ACTION_CLASSES,
  FINAL_SMOKE_CLASSES,
  MAX_DELETE_ACTION_COUNT,
  MAX_NATURAL_WEBHOOK_COUNT,
  MAX_REPLAY_COUNT,
  MAX_RETRY_COUNT,
  MAX_SUBJECT_CREATE_COUNT,
  POSTCHECK_MODES,
  SMOKE_STATES,
  SUBJECT_LABEL,
  TRANSPORT_CLASSES,
  assertSecretSafeOutput,
  clerkActionAllowsDelete,
  clerkActionIsAmbiguous,
  evaluateCombinedSmokeEvidence,
  transportAllowsProceed,
  transportIsAmbiguous,
  transportIsDnsFailure,
  isHistoricalForbiddenDeployment,
  validatePreviewPostRemediationDeletionAuthority,
  type ClerkActionClass,
  type ExecutionDeploymentBinding,
  type FinalSmokeClass,
  type PreviewPostRemediationDeletionAuthority,
  type SmokeState,
  type TransportClass,
} from './m55_preview_post_remediation_deletion_authority.ts';
import { validatePrecheckEvidence } from './m55_preview_deletion_evidence_chain.ts';

export {
  APPROVED_DEPLOYMENT_ID,
  CLERK_ACTION_CLASSES,
  FINAL_SMOKE_CLASSES,
  HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH,
  PLANNING_DEPLOYMENT_ID,
  SMOKE_STATES,
  SUBJECT_LABEL,
  TRANSPORT_CLASSES,
  evaluateCombinedSmokeEvidence,
  isHistoricalForbiddenDeployment,
  validatePreviewPostRemediationDeletionAuthority,
} from './m55_preview_post_remediation_deletion_authority.ts';

export type {
  ClerkActionClass,
  ExecutionDeploymentBinding,
  FinalSmokeClass,
  PreviewPostRemediationDeletionAuthority,
  TransportClass,
} from './m55_preview_post_remediation_deletion_authority.ts';

export const HARNESS_SCHEMA_VERSION = 'm55_preview_post_remediation_deletion_smoke_v1' as const;

export type HarnessMode = 'local_dry_run' | 'preview_execution';

export type OpaqueHumanRef = {
  label: string;
  recorded_at: string;
};

export type DeploymentSubjectPrecheckEvidence = {
  deployment_identity_exact: boolean;
  subject_exists: boolean;
  subject_newly_created: boolean;
  historical_reuse_detected: boolean;
  real_user_risk: boolean;
  target_baseline_captured: boolean;
  retained_baseline_captured: boolean;
  unrelated_baseline_captured: boolean;
  prior_event_absent: boolean;
  prior_deletion_ledger_absent: boolean;
};

export type SvixMetadataEvidence = {
  event_type_user_deleted: boolean;
  one_new_delivery: boolean;
  preview_endpoint: boolean;
  replay_used: boolean;
  send_example_used: boolean;
};

export type HttpTransportEvidence = {
  request_dispatched: boolean;
  response_received: boolean;
  accepted_status: boolean;
  route_exact: boolean;
  dns_failure: boolean;
};

export type DbRpcPostcheckEvidence = {
  event_row_count: number;
  deletion_ledger_row_count: number;
  rpc_success_count: number;
  duplicate_event: boolean;
  duplicate_ledger: boolean;
  partial_unknown_state: boolean;
};

export type TargetRetainedEvidence = {
  target_pseudonymized: boolean;
  entitlements_handled: boolean;
  wallet_handled: boolean;
  snapshot_handled: boolean;
  stripe_tables_retained: boolean;
  failed_fulfillments_handled: boolean;
  identifiability_green: boolean;
};

export type UnrelatedDataEvidence = {
  unrelated_data_change_count: number;
  global_control_mutation: boolean;
};

export type StepEvidence =
  | { step: 'S0_AUTHORITY_VALIDATION'; authority_valid: boolean }
  | { step: 'S1_PREVIEW_BINDING_REVERIFY'; bindings_exact: boolean }
  | { step: 'S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED'; human_ref: OpaqueHumanRef }
  | { step: 'S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED'; subject_label: typeof SUBJECT_LABEL; precreated: true }
  | { step: 'S3_SAFE_LABEL_MAPPING'; subject_label: typeof SUBJECT_LABEL }
  | { step: 'S4_PREDELETE_READONLY_PRECHECK'; evidence: DeploymentSubjectPrecheckEvidence }
  | { step: 'S5_HUMAN_CONFIRMATION_BEFORE_DELETE'; human_ref: OpaqueHumanRef }
  | { step: 'S6_HUMAN_DELETE_ACTION_REQUIRED'; human_ref: OpaqueHumanRef }
  | { step: 'S7_CLERK_ACTION_CLASSIFICATION'; classification: ClerkActionClass }
  | { step: 'S8_WAIT_FOR_NATURAL_WEBHOOK'; bounded_wait_ms: number }
  | { step: 'S9_SVIX_METADATA_CLASSIFICATION'; evidence: SvixMetadataEvidence }
  | { step: 'S10_HTTP_TRANSPORT_CLASSIFICATION'; evidence: HttpTransportEvidence; classification: TransportClass }
  | { step: 'S11_DB_RPC_TARGET_RETAINED_POSTCHECK'; db: DbRpcPostcheckEvidence; target: TargetRetainedEvidence }
  | { step: 'S12_UNRELATED_DATA_POSTCHECK'; evidence: UnrelatedDataEvidence }
  | { step: 'S13_FINAL_SMOKE_CLASSIFICATION'; classification: FinalSmokeClass }
  | { step: 'S14_STOP_NO_FURTHER_ACTION' }
  | { step: 'S15_FINAL_RC_GATE_SEPARATE'; deferred: true };

export type HarnessEvidenceRecord = {
  schema_version: typeof HARNESS_SCHEMA_VERSION;
  mode: HarnessMode;
  branch: string;
  commit_sha: string;
  deployment_id: string;
  current_state: SmokeState;
  verdict: 'GREEN' | 'HOLD' | 'RED';
  first_failure_predicate: string | null;
  steps_completed: StepEvidence[];
  subject_label: typeof SUBJECT_LABEL;
};

export type IrreversibleBudget = {
  subject_create: number;
  delete_action: number;
  natural_webhook: number;
  retry: number;
  replay: number;
};

export type HarnessTransports = {
  log: (payload: Record<string, string>) => void;
};

export type HarnessOptions = {
  mode?: HarnessMode;
  branch?: string;
  commitSha?: string;
  // deploymentId: the EXECUTION deployment ID (post-push, not planning deployment).
  // Defaults to APPROVED_DEPLOYMENT_ID only for local_dry_run testing; must be a fresh
  // post-push deployment in preview_execution mode.
  deploymentId?: string;
  executionDeployment?: ExecutionDeploymentBinding;
  authority?: PreviewPostRemediationDeletionAuthority | null;
  transports?: Partial<HarnessTransports>;
  now?: () => Date;
};

const defaultTransports: HarnessTransports = {
  log: () => {
    /* no-op in local dry-run */
  },
};

const FIXED_EVIDENCE_KEYS = [
  'schema_version',
  'mode',
  'branch',
  'commit_sha',
  'deployment_id',
  'current_state',
  'verdict',
  'first_failure_predicate',
  'steps_completed',
  'subject_label',
] as const;

export function serializeEvidence(record: HarnessEvidenceRecord): string {
  const json = JSON.stringify(record);
  assertSecretSafeOutput(json);
  return json;
}

export function evidenceSchemaIsFixed(record: HarnessEvidenceRecord): boolean {
  const keys = Object.keys(record).sort();
  return keys.join(',') === [...FIXED_EVIDENCE_KEYS].sort().join(',');
}

export function redactHostileError(error: unknown): string {
  try {
    const msg = error instanceof Error ? error.message : String(error);
    assertSecretSafeOutput(msg.slice(0, 256));
    return 'HOSTILE_ERROR_REDACTED';
  } catch {
    return 'HOSTILE_ERROR_REDACTED';
  }
}

export class PreviewPostRemediationDeletionSmokeHarness {
  readonly mode: HarnessMode;
  readonly branch: string;
  readonly commitSha: string;
  readonly deploymentId: string;
  readonly authority: PreviewPostRemediationDeletionAuthority | null;
  readonly executionDeployment: ExecutionDeploymentBinding | null;
  readonly transports: HarnessTransports;
  readonly now: () => Date;

  private stateIndex = 0;
  private steps: StepEvidence[] = [];
  private verdict: 'GREEN' | 'HOLD' | 'RED' = 'GREEN';
  private firstFailure: string | null = null;
  private halted = false;
  private precheckGreen = false;
  private subjectCreated = false;
  private precheckEvidenceSha256: string | null = null;
  private clerkAction: ClerkActionClass | null = null;
  private transportClass: TransportClass | null = null;
  private humanClerkMarkerPresent = false;
  private humanTransportMarkerPresent = false;
  private enotfoundPermanentStop = false;
  private actionsConsumed: IrreversibleBudget = {
    subject_create: 0,
    delete_action: 0,
    natural_webhook: 0,
    retry: 0,
    replay: 0,
  };

  constructor(options: HarnessOptions = {}) {
    this.mode = options.mode ?? 'local_dry_run';
    this.branch = options.branch ?? APPROVED_BRANCH;
    this.commitSha = options.commitSha ?? APPROVED_FEATURE_HEAD;
    this.deploymentId = options.deploymentId ?? APPROVED_DEPLOYMENT_ID;
    this.executionDeployment = options.executionDeployment ?? null;
    this.authority = options.authority ?? null;
    this.now = options.now ?? (() => new Date());
    this.transports = { ...defaultTransports, ...options.transports };
  }

  get irreversibleBudget(): IrreversibleBudget {
    return { ...this.actionsConsumed };
  }

  get currentState(): SmokeState {
    return SMOKE_STATES[this.stateIndex];
  }

  get evidenceRecord(): HarnessEvidenceRecord {
    return {
      schema_version: HARNESS_SCHEMA_VERSION,
      mode: this.mode,
      branch: this.branch,
      commit_sha: this.commitSha,
      deployment_id: this.deploymentId,
      current_state: this.currentState,
      verdict: this.verdict,
      first_failure_predicate: this.firstFailure,
      steps_completed: [...this.steps],
      subject_label: SUBJECT_LABEL,
    };
  }

  private hold(predicate: string): void {
    if (this.halted) return;
    this.halted = true;
    this.verdict = 'HOLD';
    this.firstFailure = predicate;
  }

  private completeStep(step: StepEvidence): void {
    if (this.halted) return;
    this.steps.push(step);
    if (this.stateIndex < SMOKE_STATES.length - 1) {
      this.stateIndex += 1;
    }
  }

  private assertStepOrder(expected: SmokeState): boolean {
    return this.currentState === expected;
  }

  private assertIrreversibleBudget(
    kind: 'subject_create' | 'delete_action' | 'natural_webhook' | 'retry' | 'replay',
  ): boolean {
    if (
      kind === 'subject_create' &&
      this.actionsConsumed.subject_create >= MAX_SUBJECT_CREATE_COUNT
    ) {
      this.hold('HOLD_SUBJECT_CREATE_BUDGET_EXCEEDED');
      return false;
    }
    if (
      kind === 'delete_action' &&
      this.actionsConsumed.delete_action >= MAX_DELETE_ACTION_COUNT
    ) {
      this.hold('HOLD_DELETE_ACTION_BUDGET_EXCEEDED');
      return false;
    }
    if (
      kind === 'natural_webhook' &&
      this.actionsConsumed.natural_webhook >= MAX_NATURAL_WEBHOOK_COUNT
    ) {
      this.hold('HOLD_WEBHOOK_BUDGET_EXCEEDED');
      return false;
    }
    if (kind === 'retry' && this.actionsConsumed.retry >= MAX_RETRY_COUNT) {
      this.hold('HOLD_RETRY_BUDGET_EXCEEDED');
      return false;
    }
    if (kind === 'replay' && this.actionsConsumed.replay >= MAX_REPLAY_COUNT) {
      this.hold('HOLD_REPLAY_BUDGET_EXCEEDED');
      return false;
    }
    return true;
  }

  runS0AuthorityValidation(): void {
    if (!this.assertStepOrder('S0_AUTHORITY_VALIDATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    // In execution mode the planning deployment is forbidden as the execution target.
    // A fresh post-push deployment for the final authority commit is required instead.
    if (this.mode !== 'local_dry_run' && this.deploymentId === PLANNING_DEPLOYMENT_ID) {
      this.hold('HOLD_EXECUTION_DEPLOYMENT_IS_PLANNING_DEPLOYMENT_STALE');
      return;
    }
    if (this.mode === 'preview_execution') {
      const result = validatePreviewPostRemediationDeletionAuthority(this.authority, {
        now: this.now(),
        observedFeatureHead: this.commitSha,
        observedDeploymentId: APPROVED_DEPLOYMENT_ID,
        observedDeploymentCommit: this.commitSha,
        observedBranchAliasCurrent: true,
        observedProductionBinding: false,
        executionDeployment: this.executionDeployment ?? undefined,
      });
      if (!result.ready) {
        this.hold(result.failed_flags[0] ?? 'HOLD_AUTHORITY_INVALID');
        return;
      }
    }
    this.completeStep({ step: 'S0_AUTHORITY_VALIDATION', authority_valid: true });
  }

  isExecutionDeploymentSafe(): boolean {
    if (this.mode === 'local_dry_run') return true;
    if (!this.executionDeployment) return false;
    return !isHistoricalForbiddenDeployment(this.executionDeployment.deployment_id) &&
      this.executionDeployment.deployment_ready &&
      !this.executionDeployment.production_binding &&
      this.executionDeployment.branch_alias_current &&
      this.executionDeployment.created_after_authority_commit;
  }

  runS1PreviewBindingReverify(bindingsExact = true): void {
    if (!this.assertStepOrder('S1_PREVIEW_BINDING_REVERIFY')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!bindingsExact) {
      this.hold('HOLD_PREVIEW_BINDING_MISMATCH');
      return;
    }
    this.completeStep({ step: 'S1_PREVIEW_BINDING_REVERIFY', bindings_exact: true });
  }

  recordHumanSubjectCreation(humanRef: OpaqueHumanRef): void {
    if (this.halted) return;
    if (!this.assertStepOrder('S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!this.assertIrreversibleBudget('subject_create')) return;
    assertSecretSafeOutput(humanRef.label);
    this.actionsConsumed.subject_create += 1;
    this.subjectCreated = true;
    this.completeStep({ step: 'S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED', human_ref: humanRef });
  }


  recordHumanSubjectPrecreated(): void {
    if (this.halted) return;
    if (!this.assertStepOrder('S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.actionsConsumed.subject_create = MAX_SUBJECT_CREATE_COUNT;
    this.subjectCreated = true;
    this.completeStep({
      step: 'S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED',
      subject_label: SUBJECT_LABEL,
      precreated: true,
    });
  }

  recordValidatedPrecheckEvidence(evidence: unknown): string | null {
    const result = validatePrecheckEvidence(evidence);
    if (!result.ready || !result.sha256) {
      this.hold(result.failed_flags[0] ?? 'HOLD_PRECHECK_EVIDENCE_INVALID');
      return null;
    }
    this.precheckEvidenceSha256 = result.sha256;
    return result.sha256;
  }

  canIssueDeletionAuthority(): boolean {
    return this.precheckGreen && this.precheckEvidenceSha256 !== null;
  }

  canGeneratePostcheckFromBoundEvidence(evidenceSha256: string): boolean {
    return this.precheckEvidenceSha256 === evidenceSha256;
  }

  runS3SafeLabelMapping(labelMatches = true): void {
    if (!this.assertStepOrder('S3_SAFE_LABEL_MAPPING')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!labelMatches) {
      this.hold('HOLD_WRONG_SUBJECT_RISK');
      return;
    }
    this.completeStep({ step: 'S3_SAFE_LABEL_MAPPING', subject_label: SUBJECT_LABEL });
  }

  runS4PredeleteReadonlyPrecheck(evidence: DeploymentSubjectPrecheckEvidence): void {
    if (!this.assertStepOrder('S4_PREDELETE_READONLY_PRECHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!this.subjectCreated) {
      this.hold('HOLD_SUBJECT_NOT_CREATED');
      return;
    }
    if (
      !evidence.deployment_identity_exact ||
      !evidence.subject_exists ||
      !evidence.subject_newly_created ||
      evidence.historical_reuse_detected ||
      evidence.real_user_risk ||
      !evidence.prior_event_absent ||
      !evidence.prior_deletion_ledger_absent ||
      !evidence.target_baseline_captured ||
      !evidence.retained_baseline_captured ||
      !evidence.unrelated_baseline_captured
    ) {
      this.hold('HOLD_SUBJECT_PRECHECK_NOT_GREEN');
      return;
    }
    this.precheckGreen = true;
    this.completeStep({ step: 'S4_PREDELETE_READONLY_PRECHECK', evidence });
  }

  recordHumanConfirmationBeforeDelete(humanRef: OpaqueHumanRef): void {
    if (this.halted) return;
    if (!this.precheckGreen) {
      this.hold('HOLD_SUBJECT_PRECHECK_REQUIRED');
      return;
    }
    if (!this.assertStepOrder('S5_HUMAN_CONFIRMATION_BEFORE_DELETE')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    assertSecretSafeOutput(humanRef.label);
    this.completeStep({ step: 'S5_HUMAN_CONFIRMATION_BEFORE_DELETE', human_ref: humanRef });
  }

  recordHumanDeleteAction(humanRef: OpaqueHumanRef, classification: ClerkActionClass): void {
    if (this.halted) return;
    if (!this.precheckGreen) {
      this.hold('HOLD_SUBJECT_PRECHECK_REQUIRED');
      return;
    }
    if (!this.assertStepOrder('S6_HUMAN_DELETE_ACTION_REQUIRED')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (classification === 'WRONG_SUBJECT_RISK') {
      this.hold('HOLD_WRONG_SUBJECT_RISK');
      return;
    }
    if (clerkActionIsAmbiguous(classification)) {
      this.hold('HOLD_CLERK_ACTION_AMBIGUOUS');
      return;
    }
    if (!this.assertIrreversibleBudget('delete_action')) return;
    if (clerkActionAllowsDelete(classification)) {
      this.actionsConsumed.delete_action += 1;
      this.humanClerkMarkerPresent = true;
    } else {
      this.hold('HOLD_CLERK_DELETE_NOT_EXECUTED');
      return;
    }
    assertSecretSafeOutput(humanRef.label);
    this.clerkAction = classification;
    this.completeStep({ step: 'S6_HUMAN_DELETE_ACTION_REQUIRED', human_ref: humanRef });
    this.runS7ClerkActionClassification(classification);
  }

  private runS7ClerkActionClassification(classification: ClerkActionClass): void {
    if (!this.assertStepOrder('S7_CLERK_ACTION_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'S7_CLERK_ACTION_CLASSIFICATION', classification });
  }

  runS8WaitForNaturalWebhook(boundedWaitMs = 60_000): void {
    if (!this.assertStepOrder('S8_WAIT_FOR_NATURAL_WEBHOOK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'S8_WAIT_FOR_NATURAL_WEBHOOK', bounded_wait_ms: boundedWaitMs });
  }

  runS9SvixMetadataClassification(
    evidence: SvixMetadataEvidence,
    transport: TransportClass,
  ): void {
    if (!this.assertStepOrder('S9_SVIX_METADATA_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (evidence.replay_used || evidence.send_example_used) {
      this.hold('HOLD_REPLAY_OR_SEND_EXAMPLE_FORBIDDEN');
      return;
    }
    if (!this.assertIrreversibleBudget('natural_webhook')) return;
    if (transportIsDnsFailure(transport)) {
      this.enotfoundPermanentStop = true;
      this.hold('HOLD_WEBHOOK_TRANSPORT_DNS_FAILURE_PERMANENT');
      return;
    }
    if (transportIsAmbiguous(transport)) {
      this.hold('HOLD_WEBHOOK_TRANSPORT_AMBIGUOUS');
      return;
    }
    if (transportAllowsProceed(transport) && evidence.one_new_delivery) {
      this.actionsConsumed.natural_webhook += 1;
      this.humanTransportMarkerPresent = true;
    }
    this.transportClass = transport;
    this.completeStep({ step: 'S9_SVIX_METADATA_CLASSIFICATION', evidence });
    this.runS10HttpTransportClassification(
      {
        request_dispatched: true,
        response_received: transportAllowsProceed(transport),
        accepted_status: transportAllowsProceed(transport),
        route_exact: evidence.preview_endpoint,
        dns_failure: transportIsDnsFailure(transport),
      },
      transport,
    );
  }

  private runS10HttpTransportClassification(
    evidence: HttpTransportEvidence,
    transport: TransportClass,
  ): void {
    if (!this.assertStepOrder('S10_HTTP_TRANSPORT_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (transportIsDnsFailure(transport) || evidence.dns_failure) {
      this.enotfoundPermanentStop = true;
      this.hold('HOLD_WEBHOOK_TRANSPORT_DNS_FAILURE_PERMANENT');
      return;
    }
    if (!transportAllowsProceed(transport) || !evidence.accepted_status) {
      this.hold('HOLD_WEBHOOK_NOT_ACCEPTED');
      return;
    }
    this.completeStep({
      step: 'S10_HTTP_TRANSPORT_CLASSIFICATION',
      evidence,
      classification: transport,
    });
  }

  runS11DbRpcTargetRetainedPostcheck(
    dbEvidence: DbRpcPostcheckEvidence,
    targetEvidence: TargetRetainedEvidence,
  ): void {
    if (!this.assertStepOrder('S11_DB_RPC_TARGET_RETAINED_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (
      dbEvidence.event_row_count !== 1 ||
      dbEvidence.deletion_ledger_row_count !== 1 ||
      dbEvidence.rpc_success_count !== 1 ||
      dbEvidence.duplicate_event ||
      dbEvidence.duplicate_ledger ||
      dbEvidence.partial_unknown_state
    ) {
      this.hold('HOLD_EVENT_LEDGER_OR_RPC_MISMATCH');
      return;
    }
    if (!targetEvidence.target_pseudonymized || !targetEvidence.identifiability_green) {
      this.hold('HOLD_TARGET_OR_IDENTIFIABILITY_MISMATCH');
      return;
    }
    if (!targetEvidence.stripe_tables_retained) {
      this.hold('HOLD_RETAINED_DATA_CONTRACT_MISMATCH');
      return;
    }
    this.completeStep({
      step: 'S11_DB_RPC_TARGET_RETAINED_POSTCHECK',
      db: dbEvidence,
      target: targetEvidence,
    });
  }

  runS12UnrelatedDataPostcheck(evidence: UnrelatedDataEvidence): void {
    if (!this.assertStepOrder('S12_UNRELATED_DATA_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (evidence.unrelated_data_change_count !== 0 || evidence.global_control_mutation) {
      this.hold('HOLD_UNRELATED_DATA_CHANGED');
      return;
    }
    this.completeStep({ step: 'S12_UNRELATED_DATA_POSTCHECK', evidence });
  }

  runS13FinalSmokeClassification(
    dbEvidence: DbRpcPostcheckEvidence,
    targetEvidence: TargetRetainedEvidence,
    unrelatedEvidence: UnrelatedDataEvidence,
  ): void {
    if (!this.assertStepOrder('S13_FINAL_SMOKE_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const combined = evaluateCombinedSmokeEvidence({
      clerk_action: this.clerkAction ?? 'UNKNOWN',
      transport: this.transportClass ?? 'UNKNOWN',
      human_clerk_marker_present: this.humanClerkMarkerPresent,
      human_transport_marker_present: this.humanTransportMarkerPresent,
      event_ledger_green: dbEvidence.event_row_count === 1 && !dbEvidence.duplicate_event,
      deletion_ledger_green:
        dbEvidence.deletion_ledger_row_count === 1 && !dbEvidence.duplicate_ledger,
      rpc_green: dbEvidence.rpc_success_count === 1,
      target_state_green: targetEvidence.target_pseudonymized,
      retained_state_green: targetEvidence.stripe_tables_retained,
      identifiability_green: targetEvidence.identifiability_green,
      unrelated_data_change_count: unrelatedEvidence.unrelated_data_change_count,
    });
    const classification: FinalSmokeClass = combined ? 'PREVIEW_DELETION_GREEN' : 'HOLD_UNKNOWN';
    if (!combined) {
      this.hold('HOLD_FINAL_CLASSIFICATION_NOT_GREEN');
      return;
    }
    this.completeStep({ step: 'S13_FINAL_SMOKE_CLASSIFICATION', classification });
    this.runS14StopNoFurtherAction();
  }

  runS14StopNoFurtherAction(): void {
    if (!this.assertStepOrder('S14_STOP_NO_FURTHER_ACTION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'S14_STOP_NO_FURTHER_ACTION' });
    this.runS15FinalRcGateSeparate();
  }

  runS15FinalRcGateSeparate(): void {
    if (!this.assertStepOrder('S15_FINAL_RC_GATE_SEPARATE')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'S15_FINAL_RC_GATE_SEPARATE', deferred: true });
    if (!this.halted) this.verdict = 'GREEN';
  }

  runLocalDryRunHappyPath(): void {
    this.runS0AuthorityValidation();
    this.runS1PreviewBindingReverify();
    this.recordHumanSubjectCreation({
      label: 'human-create-preview-subject',
      recorded_at: new Date().toISOString(),
    });
    this.runS3SafeLabelMapping(true);
    this.runS4PredeleteReadonlyPrecheck({
      deployment_identity_exact: true,
      subject_exists: true,
      subject_newly_created: true,
      historical_reuse_detected: false,
      real_user_risk: false,
      target_baseline_captured: true,
      retained_baseline_captured: true,
      unrelated_baseline_captured: true,
      prior_event_absent: true,
      prior_deletion_ledger_absent: true,
    });
    this.recordHumanConfirmationBeforeDelete({
      label: 'human-confirm-before-delete',
      recorded_at: new Date().toISOString(),
    });
    this.recordHumanDeleteAction(
      { label: 'human-delete-preview-subject', recorded_at: new Date().toISOString() },
      'CLERK_DELETE_CONFIRMED',
    );
    this.runS8WaitForNaturalWebhook();
    this.runS9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        preview_endpoint: true,
        replay_used: false,
        send_example_used: false,
      },
      'WEBHOOK_ACCEPTED_EXACT',
    );
    const dbEvidence: DbRpcPostcheckEvidence = {
      event_row_count: 1,
      deletion_ledger_row_count: 1,
      rpc_success_count: 1,
      duplicate_event: false,
      duplicate_ledger: false,
      partial_unknown_state: false,
    };
    const targetEvidence: TargetRetainedEvidence = {
      target_pseudonymized: true,
      entitlements_handled: true,
      wallet_handled: true,
      snapshot_handled: true,
      stripe_tables_retained: true,
      failed_fulfillments_handled: true,
      identifiability_green: true,
    };
    this.runS11DbRpcTargetRetainedPostcheck(dbEvidence, targetEvidence);
    this.runS12UnrelatedDataPostcheck({
      unrelated_data_change_count: 0,
      global_control_mutation: false,
    });
    this.runS13FinalSmokeClassification(dbEvidence, targetEvidence, {
      unrelated_data_change_count: 0,
      global_control_mutation: false,
    });
  }

  supportsAutomaticSubjectCreate(): false {
    return false;
  }

  supportsAutomaticClerkDelete(): false {
    return false;
  }

  supportsAutomaticWebhook(): false {
    return false;
  }

  supportsAutomaticRpc(): false {
    return false;
  }

  supportsWebhookReplay(): false {
    return false;
  }

  supportsSyntheticPost(): false {
    return false;
  }

  supportsManualRpc(): false {
    return false;
  }

  supportsManualDbRepair(): false {
    return false;
  }

  supportsSubjectRecreation(): false {
    return false;
  }

  supportsAutomaticRetry(): false {
    return false;
  }

  isEnotfoundPermanentStop(): boolean {
    return this.enotfoundPermanentStop;
  }
}

export function sqlPostcheckModeCount(sql: string): number {
  return POSTCHECK_MODES.filter((m) => sql.includes(m)).length;
}

export function runCli(_argv: string[]): number {
  const harness = new PreviewPostRemediationDeletionSmokeHarness();
  harness.runLocalDryRunHappyPath();
  return harness.evidenceRecord.verdict === 'GREEN' ? 0 : 1;
}

if (process.argv[1]?.endsWith('m55_preview_post_remediation_deletion_smoke.ts')) {
  process.exitCode = runCli(process.argv.slice(2));
}
