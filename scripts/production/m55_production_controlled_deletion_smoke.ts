/**
 * M55 Production controlled-deletion smoke orchestrator (LOCAL dry-run default).
 * Delete Subject A (M55_PROD_PURCHASE_A); retain Subject B (M55_PROD_PURCHASE_B) as control.
 *
 * No network, Clerk, webhook, DB, or RPC capability in default mode.
 */

import {
  CLERK_ACTION_CLASSES,
  CONTROL_SUBJECT_LABEL,
  DELETION_STATES,
  DELETION_SUBJECT_LABEL,
  FINAL_DELETION_CLASSES,
  MAX_CLERK_DELETE_ACTION_COUNT,
  MAX_NEW_WEBHOOK_EVENT_COUNT,
  MAX_REPLAY_COUNT,
  MAX_RETRY_COUNT,
  MAX_RPC_SUCCESS_COUNT,
  TRANSPORT_CLASSES,
  assertSecretSafeOutput,
  clerkActionAllowsDelete,
  clerkActionIsAmbiguous,
  evaluateCombinedDeletionEvidence,
  transportAllowsProceed,
  transportIsAmbiguous,
  validateControlledDeletionAuthority,
  POSTCHECK_MODES,
  type ClerkActionClass,
  type ControlledDeletionAuthority,
  type DeletionState,
  type FinalDeletionClass,
  type TransportClass,
} from './m55_production_controlled_deletion_authority.ts';

export {
  CLERK_ACTION_CLASSES,
  CONTROL_SUBJECT_LABEL,
  DELETION_STATES,
  DELETION_SUBJECT_LABEL,
  FINAL_DELETION_CLASSES,
  TRANSPORT_CLASSES,
  evaluateCombinedDeletionEvidence,
  validateControlledDeletionAuthority,
} from './m55_production_controlled_deletion_authority.ts';

export type {
  ClerkActionClass,
  ControlledDeletionAuthority,
  FinalDeletionClass,
  TransportClass,
} from './m55_production_controlled_deletion_authority.ts';

export const HARNESS_SCHEMA_VERSION = 'm55_production_controlled_deletion_smoke_v1' as const;

export type HarnessMode = 'local_dry_run' | 'production_execution';

export type OpaqueHumanRef = {
  label: string;
  recorded_at: string;
};

export type SubjectPrecheckEvidence = {
  deletion_subject_purchase_wave_green: boolean;
  deletion_entitlement_present: boolean;
  deletion_wallet_present: boolean;
  deletion_snapshot_present: boolean;
  deletion_prior_event_absent: boolean;
  deletion_prior_ledger_absent: boolean;
  control_purchase_green: boolean;
  control_baseline_captured: boolean;
  control_prior_event_absent: boolean;
  control_prior_ledger_absent: boolean;
};

export type TransportProbeEvidence = {
  dns_http_green: boolean;
  endpoint_binding_exact: boolean;
  signing_scope_exact: boolean;
};

export type SvixMetadataEvidence = {
  event_type_user_deleted: boolean;
  one_new_delivery: boolean;
  production_endpoint: boolean;
  replay_used: boolean;
  send_example_used: boolean;
};

export type HttpAcceptanceEvidence = {
  request_dispatched: boolean;
  response_received: boolean;
  accepted_status: boolean;
  route_exact: boolean;
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

export type ControlSubjectEvidence = {
  baseline_unchanged: boolean;
  no_event_mutation: boolean;
  no_ledger_mutation: boolean;
  no_wallet_change: boolean;
  no_snapshot_change: boolean;
  unrelated_data_change_count: number;
};

export type StepEvidence =
  | { step: 'X0_AUTHORITY_VALIDATION'; authority_valid: boolean }
  | { step: 'X1_PRODUCTION_BINDING_CONFIRMATION'; bindings_exact: boolean }
  | { step: 'X2_SUBJECT_CONTROL_PRECHECK'; evidence: SubjectPrecheckEvidence }
  | { step: 'X3_TRANSPORT_PROBE_CONFIRMATION'; evidence: TransportProbeEvidence }
  | { step: 'X4_HUMAN_OPEN_CLERK_SUBJECT'; human_ref: OpaqueHumanRef }
  | { step: 'X5_HUMAN_VERIFY_LABEL_MAPPING'; deletion_label: typeof DELETION_SUBJECT_LABEL }
  | { step: 'X6_HUMAN_DELETE_ACTION_REQUIRED'; human_ref: OpaqueHumanRef }
  | { step: 'X7_CLERK_ACTION_CLASSIFICATION'; classification: ClerkActionClass }
  | { step: 'X8_WAIT_FOR_NATURAL_WEBHOOK'; bounded_wait_ms: number }
  | { step: 'X9_SVIX_METADATA_CLASSIFICATION'; evidence: SvixMetadataEvidence }
  | { step: 'X10_HTTP_ACCEPTANCE_CLASSIFICATION'; evidence: HttpAcceptanceEvidence }
  | { step: 'X11_DB_RPC_POSTCHECK'; evidence: DbRpcPostcheckEvidence }
  | { step: 'X12_CONTROL_SUBJECT_POSTCHECK'; evidence: ControlSubjectEvidence }
  | { step: 'X13_RETAINED_DATA_POSTCHECK'; evidence: TargetRetainedEvidence }
  | { step: 'X14_FINAL_DELETION_CLASSIFICATION'; classification: FinalDeletionClass }
  | { step: 'X15_STOP_NO_FURTHER_ACTION' }
  | { step: 'X16_PUBLIC_RELEASE_AUDIT_SEPARATE'; deferred: true };

export type HarnessEvidenceRecord = {
  schema_version: typeof HARNESS_SCHEMA_VERSION;
  mode: HarnessMode;
  branch: string;
  commit_sha: string;
  current_state: DeletionState;
  verdict: 'GREEN' | 'HOLD' | 'RED';
  first_failure_predicate: string | null;
  steps_completed: StepEvidence[];
  deletion_subject_label: typeof DELETION_SUBJECT_LABEL;
  control_subject_label: typeof CONTROL_SUBJECT_LABEL;
};

export type IrreversibleBudget = {
  clerk_delete: number;
  new_webhook_event: number;
  rpc_success: number;
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
  authority?: ControlledDeletionAuthority | null;
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
  'current_state',
  'verdict',
  'first_failure_predicate',
  'steps_completed',
  'deletion_subject_label',
  'control_subject_label',
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

export class ControlledDeletionSmokeHarness {
  readonly mode: HarnessMode;
  readonly branch: string;
  readonly commitSha: string;
  readonly authority: ControlledDeletionAuthority | null;
  readonly transports: HarnessTransports;
  readonly now: () => Date;

  private stateIndex = 0;
  private steps: StepEvidence[] = [];
  private verdict: 'GREEN' | 'HOLD' | 'RED' = 'GREEN';
  private firstFailure: string | null = null;
  private halted = false;
  private precheckGreen = false;
  private clerkAction: ClerkActionClass | null = null;
  private transportClass: TransportClass | null = null;
  private actionsConsumed: IrreversibleBudget = {
    clerk_delete: 0,
    new_webhook_event: 0,
    rpc_success: 0,
    retry: 0,
    replay: 0,
  };

  constructor(options: HarnessOptions = {}) {
    this.mode = options.mode ?? 'local_dry_run';
    this.branch = options.branch ?? 'feat/m55-paid-lp-canonical-wave1';
    this.commitSha = options.commitSha ?? '941d00acc0abff7ff8bf6816e13770b3a286e454';
    this.authority = options.authority ?? null;
    this.now = options.now ?? (() => new Date());
    this.transports = { ...defaultTransports, ...options.transports };
  }

  get irreversibleBudget(): IrreversibleBudget {
    return { ...this.actionsConsumed };
  }

  get currentState(): DeletionState {
    return DELETION_STATES[this.stateIndex];
  }

  get evidenceRecord(): HarnessEvidenceRecord {
    return {
      schema_version: HARNESS_SCHEMA_VERSION,
      mode: this.mode,
      branch: this.branch,
      commit_sha: this.commitSha,
      current_state: this.currentState,
      verdict: this.verdict,
      first_failure_predicate: this.firstFailure,
      steps_completed: [...this.steps],
      deletion_subject_label: DELETION_SUBJECT_LABEL,
      control_subject_label: CONTROL_SUBJECT_LABEL,
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
    if (this.stateIndex < DELETION_STATES.length - 1) {
      this.stateIndex += 1;
    }
  }

  private assertStepOrder(expected: DeletionState): boolean {
    return this.currentState === expected;
  }

  private assertIrreversibleBudget(
    kind: 'clerk_delete' | 'new_webhook_event' | 'rpc_success' | 'retry' | 'replay',
  ): boolean {
    if (kind === 'clerk_delete' && this.actionsConsumed.clerk_delete >= MAX_CLERK_DELETE_ACTION_COUNT) {
      this.hold('HOLD_CLERK_DELETE_BUDGET_EXCEEDED');
      return false;
    }
    if (
      kind === 'new_webhook_event' &&
      this.actionsConsumed.new_webhook_event >= MAX_NEW_WEBHOOK_EVENT_COUNT
    ) {
      this.hold('HOLD_WEBHOOK_EVENT_BUDGET_EXCEEDED');
      return false;
    }
    if (kind === 'rpc_success' && this.actionsConsumed.rpc_success >= MAX_RPC_SUCCESS_COUNT) {
      this.hold('HOLD_RPC_SUCCESS_BUDGET_EXCEEDED');
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

  runX0AuthorityValidation(): void {
    if (!this.assertStepOrder('X0_AUTHORITY_VALIDATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (this.mode === 'production_execution') {
      const result = validateControlledDeletionAuthority(this.authority, {
        now: this.now(),
        observedMainCommit: this.commitSha,
      });
      if (!result.ready) {
        this.hold(result.failed_flags[0] ?? 'HOLD_AUTHORITY_INVALID');
        return;
      }
    }
    this.completeStep({ step: 'X0_AUTHORITY_VALIDATION', authority_valid: true });
  }

  runX1ProductionBindingConfirmation(bindingsExact = true): void {
    if (!this.assertStepOrder('X1_PRODUCTION_BINDING_CONFIRMATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!bindingsExact) {
      this.hold('HOLD_PRODUCTION_BINDING_MISMATCH');
      return;
    }
    this.completeStep({ step: 'X1_PRODUCTION_BINDING_CONFIRMATION', bindings_exact: true });
  }

  runX2SubjectControlPrecheck(evidence: SubjectPrecheckEvidence): void {
    if (!this.assertStepOrder('X2_SUBJECT_CONTROL_PRECHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (
      !evidence.deletion_subject_purchase_wave_green ||
      !evidence.deletion_entitlement_present ||
      !evidence.deletion_prior_event_absent ||
      !evidence.deletion_prior_ledger_absent ||
      !evidence.control_purchase_green ||
      !evidence.control_baseline_captured ||
      !evidence.control_prior_event_absent
    ) {
      this.hold('HOLD_SUBJECT_PRECHECK_NOT_CLEAN');
      return;
    }
    this.precheckGreen = true;
    this.completeStep({ step: 'X2_SUBJECT_CONTROL_PRECHECK', evidence });
  }

  runX3TransportProbeConfirmation(evidence: TransportProbeEvidence): void {
    if (!this.assertStepOrder('X3_TRANSPORT_PROBE_CONFIRMATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!evidence.dns_http_green || !evidence.endpoint_binding_exact) {
      this.hold('HOLD_TRANSPORT_PROBE_NOT_GREEN');
      return;
    }
    this.completeStep({ step: 'X3_TRANSPORT_PROBE_CONFIRMATION', evidence });
  }

  recordHumanOpenClerkSubject(humanRef: OpaqueHumanRef): void {
    if (this.halted) return;
    if (!this.precheckGreen) {
      this.hold('HOLD_SUBJECT_PRECHECK_REQUIRED');
      return;
    }
    if (!this.assertStepOrder('X4_HUMAN_OPEN_CLERK_SUBJECT')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    assertSecretSafeOutput(humanRef.label);
    this.completeStep({ step: 'X4_HUMAN_OPEN_CLERK_SUBJECT', human_ref: humanRef });
  }

  runX5HumanVerifyLabelMapping(labelMatches = true): void {
    if (!this.assertStepOrder('X5_HUMAN_VERIFY_LABEL_MAPPING')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!labelMatches) {
      this.hold('HOLD_WRONG_SUBJECT_RISK');
      return;
    }
    this.completeStep({
      step: 'X5_HUMAN_VERIFY_LABEL_MAPPING',
      deletion_label: DELETION_SUBJECT_LABEL,
    });
  }

  recordHumanDeleteAction(humanRef: OpaqueHumanRef, classification: ClerkActionClass): void {
    if (this.halted) return;
    if (!this.assertStepOrder('X6_HUMAN_DELETE_ACTION_REQUIRED')) {
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
    if (!this.assertIrreversibleBudget('clerk_delete')) return;
    if (clerkActionAllowsDelete(classification)) {
      this.actionsConsumed.clerk_delete += 1;
    } else {
      this.hold('HOLD_CLERK_DELETE_NOT_EXECUTED');
      return;
    }
    assertSecretSafeOutput(humanRef.label);
    this.clerkAction = classification;
    this.completeStep({ step: 'X6_HUMAN_DELETE_ACTION_REQUIRED', human_ref: humanRef });
    this.runX7ClerkActionClassification(classification);
  }

  private runX7ClerkActionClassification(classification: ClerkActionClass): void {
    if (!this.assertStepOrder('X7_CLERK_ACTION_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'X7_CLERK_ACTION_CLASSIFICATION', classification });
  }

  runX8WaitForNaturalWebhook(boundedWaitMs = 60_000): void {
    if (!this.assertStepOrder('X8_WAIT_FOR_NATURAL_WEBHOOK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'X8_WAIT_FOR_NATURAL_WEBHOOK', bounded_wait_ms: boundedWaitMs });
  }

  runX9SvixMetadataClassification(
    evidence: SvixMetadataEvidence,
    transport: TransportClass,
  ): void {
    if (!this.assertStepOrder('X9_SVIX_METADATA_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (evidence.replay_used || evidence.send_example_used) {
      this.hold('HOLD_REPLAY_OR_SEND_EXAMPLE_FORBIDDEN');
      return;
    }
    if (!this.assertIrreversibleBudget('new_webhook_event')) return;
    if (transportIsAmbiguous(transport)) {
      this.hold('HOLD_WEBHOOK_TRANSPORT_AMBIGUOUS');
      return;
    }
    if (transportAllowsProceed(transport) && evidence.one_new_delivery) {
      this.actionsConsumed.new_webhook_event += 1;
    }
    this.transportClass = transport;
    this.completeStep({ step: 'X9_SVIX_METADATA_CLASSIFICATION', evidence });
    this.runX10HttpAcceptanceClassification(
      {
        request_dispatched: true,
        response_received: transportAllowsProceed(transport),
        accepted_status: transportAllowsProceed(transport),
        route_exact: evidence.production_endpoint,
      },
      transport,
    );
  }

  private runX10HttpAcceptanceClassification(
    evidence: HttpAcceptanceEvidence,
    transport: TransportClass,
  ): void {
    if (!this.assertStepOrder('X10_HTTP_ACCEPTANCE_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!transportAllowsProceed(transport) || !evidence.accepted_status) {
      this.hold('HOLD_WEBHOOK_NOT_ACCEPTED');
      return;
    }
    this.completeStep({ step: 'X10_HTTP_ACCEPTANCE_CLASSIFICATION', evidence });
  }

  runX11DbRpcPostcheck(evidence: DbRpcPostcheckEvidence): void {
    if (!this.assertStepOrder('X11_DB_RPC_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (
      evidence.event_row_count !== 1 ||
      evidence.deletion_ledger_row_count !== 1 ||
      evidence.rpc_success_count !== 1 ||
      evidence.duplicate_event ||
      evidence.duplicate_ledger ||
      evidence.partial_unknown_state
    ) {
      this.hold('HOLD_EVENT_LEDGER_OR_RPC_MISMATCH');
      return;
    }
    if (!this.assertIrreversibleBudget('rpc_success')) return;
    this.actionsConsumed.rpc_success += 1;
    this.completeStep({ step: 'X11_DB_RPC_POSTCHECK', evidence });
  }

  runX12ControlSubjectPostcheck(evidence: ControlSubjectEvidence): void {
    if (!this.assertStepOrder('X12_CONTROL_SUBJECT_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!evidence.baseline_unchanged || evidence.unrelated_data_change_count !== 0) {
      this.hold('HOLD_CONTROL_SUBJECT_CHANGED');
      return;
    }
    this.completeStep({ step: 'X12_CONTROL_SUBJECT_POSTCHECK', evidence });
  }

  runX13RetainedDataPostcheck(evidence: TargetRetainedEvidence): void {
    if (!this.assertStepOrder('X13_RETAINED_DATA_POSTCHECK')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    if (!evidence.target_pseudonymized || !evidence.identifiability_green) {
      this.hold('HOLD_TARGET_OR_IDENTIFIABILITY_MISMATCH');
      return;
    }
    if (!evidence.stripe_tables_retained) {
      this.hold('HOLD_RETAINED_DATA_CONTRACT_MISMATCH');
      return;
    }
    this.completeStep({ step: 'X13_RETAINED_DATA_POSTCHECK', evidence });
  }

  runX14FinalDeletionClassification(
    dbEvidence: DbRpcPostcheckEvidence,
    targetEvidence: TargetRetainedEvidence,
    controlEvidence: ControlSubjectEvidence,
  ): void {
    if (!this.assertStepOrder('X14_FINAL_DELETION_CLASSIFICATION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    const combined = evaluateCombinedDeletionEvidence({
      clerk_action: this.clerkAction ?? 'UNKNOWN',
      transport: this.transportClass ?? 'UNKNOWN',
      event_ledger_green: dbEvidence.event_row_count === 1 && !dbEvidence.duplicate_event,
      deletion_ledger_green:
        dbEvidence.deletion_ledger_row_count === 1 && !dbEvidence.duplicate_ledger,
      rpc_green: dbEvidence.rpc_success_count === 1,
      target_state_green: targetEvidence.target_pseudonymized,
      retained_state_green: targetEvidence.stripe_tables_retained,
      identifiability_green: targetEvidence.identifiability_green,
      control_subject_unchanged: controlEvidence.baseline_unchanged,
      unrelated_data_change_count: controlEvidence.unrelated_data_change_count,
    });
    const classification: FinalDeletionClass = combined
      ? 'PRODUCTION_DELETION_GREEN'
      : 'HOLD_UNKNOWN';
    if (!combined) {
      this.hold('HOLD_FINAL_CLASSIFICATION_NOT_GREEN');
      return;
    }
    this.completeStep({ step: 'X14_FINAL_DELETION_CLASSIFICATION', classification });
    this.runX15StopNoFurtherAction();
  }

  runX15StopNoFurtherAction(): void {
    if (!this.assertStepOrder('X15_STOP_NO_FURTHER_ACTION')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'X15_STOP_NO_FURTHER_ACTION' });
    this.runX16PublicReleaseAuditSeparate();
  }

  runX16PublicReleaseAuditSeparate(): void {
    if (!this.assertStepOrder('X16_PUBLIC_RELEASE_AUDIT_SEPARATE')) {
      this.hold('HOLD_STEP_ORDER_VIOLATION');
      return;
    }
    this.completeStep({ step: 'X16_PUBLIC_RELEASE_AUDIT_SEPARATE', deferred: true });
    if (!this.halted) this.verdict = 'GREEN';
  }

  runLocalDryRunHappyPath(): void {
    this.runX0AuthorityValidation();
    this.runX1ProductionBindingConfirmation();
    this.runX2SubjectControlPrecheck({
      deletion_subject_purchase_wave_green: true,
      deletion_entitlement_present: true,
      deletion_wallet_present: true,
      deletion_snapshot_present: true,
      deletion_prior_event_absent: true,
      deletion_prior_ledger_absent: true,
      control_purchase_green: true,
      control_baseline_captured: true,
      control_prior_event_absent: true,
      control_prior_ledger_absent: true,
    });
    this.runX3TransportProbeConfirmation({
      dns_http_green: true,
      endpoint_binding_exact: true,
      signing_scope_exact: true,
    });
    this.recordHumanOpenClerkSubject({
      label: 'human-open-clerk-subject-a',
      recorded_at: new Date().toISOString(),
    });
    this.runX5HumanVerifyLabelMapping(true);
    this.recordHumanDeleteAction(
      { label: 'human-delete-subject-a', recorded_at: new Date().toISOString() },
      'CLERK_DELETE_CONFIRMED',
    );
    this.runX8WaitForNaturalWebhook();
    this.runX9SvixMetadataClassification(
      {
        event_type_user_deleted: true,
        one_new_delivery: true,
        production_endpoint: true,
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
    this.runX11DbRpcPostcheck(dbEvidence);
    this.runX12ControlSubjectPostcheck({
      baseline_unchanged: true,
      no_event_mutation: true,
      no_ledger_mutation: true,
      no_wallet_change: true,
      no_snapshot_change: true,
      unrelated_data_change_count: 0,
    });
    const targetEvidence: TargetRetainedEvidence = {
      target_pseudonymized: true,
      entitlements_handled: true,
      wallet_handled: true,
      snapshot_handled: true,
      stripe_tables_retained: true,
      failed_fulfillments_handled: true,
      identifiability_green: true,
    };
    this.runX13RetainedDataPostcheck(targetEvidence);
    this.runX14FinalDeletionClassification(dbEvidence, targetEvidence, {
      baseline_unchanged: true,
      no_event_mutation: true,
      no_ledger_mutation: true,
      no_wallet_change: true,
      no_snapshot_change: true,
      unrelated_data_change_count: 0,
    });
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
}

export function sqlPostcheckModeCount(sql: string): number {
  return POSTCHECK_MODES.filter((m) => sql.includes(m)).length;
}

export function runCli(_argv: string[]): number {
  const harness = new ControlledDeletionSmokeHarness();
  harness.runLocalDryRunHappyPath();
  return harness.evidenceRecord.verdict === 'GREEN' ? 0 : 1;
}

if (process.argv[1]?.endsWith('m55_production_controlled_deletion_smoke.ts')) {
  process.exitCode = runCli(process.argv.slice(2));
}
