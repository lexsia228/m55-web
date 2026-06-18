/**
 * M55 Production controlled-deletion smoke authority (LOCAL validation only).
 * No network, DB, Clerk, webhook, or credential access.
 */

import { createHash } from 'node:crypto';

export const DELETION_AUTHORITY_SCHEMA_VERSION =
  'm55_production_controlled_deletion_authority_v1' as const;

export const DELETION_SUBJECT_LABEL = 'M55_PROD_PURCHASE_A' as const;
export const CONTROL_SUBJECT_LABEL = 'M55_PROD_PURCHASE_B' as const;

export const MAX_CLERK_DELETE_ACTION_COUNT = 1 as const;
export const MAX_NEW_WEBHOOK_EVENT_COUNT = 1 as const;
export const MAX_RPC_SUCCESS_COUNT = 1 as const;
export const MAX_RETRY_COUNT = 0 as const;
export const MAX_REPLAY_COUNT = 0 as const;

export const APPROVED_RPC_IDENTITY = 'm55_account_deletion_process_v1' as const;
export const APPROVED_WEBHOOK_ROUTE_IDENTITY = 'app/api/clerk/webhook/route.ts' as const;

export const DELETION_STATES = [
  'X0_AUTHORITY_VALIDATION',
  'X1_PRODUCTION_BINDING_CONFIRMATION',
  'X2_SUBJECT_CONTROL_PRECHECK',
  'X3_TRANSPORT_PROBE_CONFIRMATION',
  'X4_HUMAN_OPEN_CLERK_SUBJECT',
  'X5_HUMAN_VERIFY_LABEL_MAPPING',
  'X6_HUMAN_DELETE_ACTION_REQUIRED',
  'X7_CLERK_ACTION_CLASSIFICATION',
  'X8_WAIT_FOR_NATURAL_WEBHOOK',
  'X9_SVIX_METADATA_CLASSIFICATION',
  'X10_HTTP_ACCEPTANCE_CLASSIFICATION',
  'X11_DB_RPC_POSTCHECK',
  'X12_CONTROL_SUBJECT_POSTCHECK',
  'X13_RETAINED_DATA_POSTCHECK',
  'X14_FINAL_DELETION_CLASSIFICATION',
  'X15_STOP_NO_FURTHER_ACTION',
  'X16_PUBLIC_RELEASE_AUDIT_SEPARATE',
] as const;

export type DeletionState = (typeof DELETION_STATES)[number];

export const CLERK_ACTION_CLASSES = [
  'CLERK_DELETE_CONFIRMED',
  'CLERK_DELETE_NOT_EXECUTED',
  'CLERK_DELETE_REJECTED',
  'CLERK_DELETE_STATUS_AMBIGUOUS',
  'WRONG_SUBJECT_RISK',
  'UNKNOWN',
] as const;

export type ClerkActionClass = (typeof CLERK_ACTION_CLASSES)[number];

export const TRANSPORT_CLASSES = [
  'WEBHOOK_ACCEPTED_EXACT',
  'WEBHOOK_REJECTED_SIGNATURE',
  'WEBHOOK_ROUTE_FAILURE',
  'WEBHOOK_TRANSPORT_DNS_FAILURE',
  'WEBHOOK_TRANSPORT_TIMEOUT',
  'WEBHOOK_RESPONSE_AMBIGUOUS',
  'WEBHOOK_NOT_DELIVERED',
  'WRONG_ENDPOINT',
  'UNKNOWN',
] as const;

export type TransportClass = (typeof TRANSPORT_CLASSES)[number];

export const FINAL_DELETION_CLASSES = [
  'PRODUCTION_DELETION_GREEN',
  'HOLD_CLERK_ACTION_AMBIGUOUS',
  'HOLD_WEBHOOK_NOT_ACCEPTED',
  'HOLD_EVENT_LEDGER_MISMATCH',
  'HOLD_DELETION_LEDGER_MISMATCH',
  'HOLD_RPC_MISMATCH',
  'HOLD_TARGET_DATA_REMAINS',
  'HOLD_RETAINED_DATA_CONTRACT_MISMATCH',
  'HOLD_IDENTIFIABILITY_MISMATCH',
  'HOLD_CONTROL_SUBJECT_CHANGED',
  'HOLD_UNRELATED_DATA_CHANGED',
  'HOLD_UNKNOWN',
] as const;

export type FinalDeletionClass = (typeof FINAL_DELETION_CLASSES)[number];

export const POSTCHECK_MODES = [
  'PRE_DELETE_SUBJECT_CONTROL',
  'PRE_DELETE_EVENT_LEDGER',
  'POST_DELETE_EVENT_RPC',
  'POST_DELETE_TARGET_RETAINED',
  'POST_DELETE_CONTROL_UNRELATED',
  'INTEGRATED_DELETION_CLOSURE',
] as const;

export type PostcheckMode = (typeof POSTCHECK_MODES)[number];

export const DELETION_SUBJECT_PRECHECK_CLASSIFICATIONS = [
  'DELETION_SUBJECT_READY',
  'HOLD_SUBJECT_STATE_MISMATCH',
  'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT',
  'HOLD_UNKNOWN',
] as const;

export const CONTROL_SUBJECT_PRECHECK_CLASSIFICATIONS = [
  'CONTROL_SUBJECT_READY',
  'HOLD_SUBJECT_STATE_MISMATCH',
  'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT',
  'HOLD_UNKNOWN',
] as const;

export const APPROVAL_PHRASE_TEMPLATE =
  'APPROVE CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-EXECUTION MAIN_<safe-short-sha> DEPLOYMENT_<safe-id> SUBJECT_M55_PROD_PURCHASE_A AUTHORITY_<safe-hash>';

export type BindingConfirmations = {
  vercel_production_binding_exact: boolean;
  supabase_production_binding_exact: boolean;
  clerk_live_instance_exact: boolean;
  clerk_endpoint_exact: boolean;
  signing_secret_scope_exact: boolean;
  webhook_route_exact: boolean;
};

export type ControlledDeletionAuthority = {
  schema_version: typeof DELETION_AUTHORITY_SCHEMA_VERSION;
  gate_title: string;
  approved_main_commit: string;
  approved_production_deployment_identity: string;
  approved_production_deployment_commit: string;
  approved_production_chain_evidence_identity: string;
  approved_purchase_wave_evidence_identity: string;
  approved_account_deletion_contract_identity: string;
  approved_clerk_live_instance_identity: string;
  approved_clerk_webhook_endpoint_identity: string;
  approved_webhook_route_identity: string;
  approved_supabase_project_identity: string;
  approved_deletion_subject_label: string;
  approved_control_subject_label: string;
  approved_subject_precheck_identity: string;
  approved_event_ledger_precheck_identity: string;
  approved_rpc_identity: string;
  approved_postcheck_identity: string;
  approved_transport_probe_identity: string;
  approved_max_clerk_delete_action_count: number;
  approved_max_new_webhook_event_count: number;
  approved_max_rpc_success_count: number;
  approved_max_retry_count: number;
  approved_max_replay_count: number;
  binding_confirmations: BindingConfirmations;
  final_rc_gate: string;
  final_rc_verdict: string;
  preview_deletion_smoke_gate: string;
  preview_deletion_smoke_verdict: string;
  production_purchase_wave_verdict: string;
  dns_http_path_healthy: boolean;
  human_approval_phrase_hash: string;
  issued_at: string;
  expires_at: string;
  single_use: true;
  consumed: boolean;
  execution_nonce_hash: string;
  prior_ambiguous_action: boolean;
};

export type ControlledDeletionAuthorityValidationResult = {
  schema_version: typeof DELETION_AUTHORITY_SCHEMA_VERSION;
  ready: boolean;
  failed_flags: string[];
  unknown_flags: string[];
  allowed_next_action: string;
  irreversible_action_budget: {
    clerk_delete: number;
    new_webhook_event: number;
    rpc_success: number;
    retry: number;
    replay: number;
  };
  approved_deletion_subject_label: string;
  approved_control_subject_label: string;
};

const FORBIDDEN_FIELD_PATTERNS = [
  /sk_live_/,
  /sk_test_/,
  /whsec_/,
  /price_[A-Za-z0-9]{8,}/,
  /Bearer\s+/,
  /msg_[A-Za-z0-9]+/,
  /evt_[A-Za-z0-9]+/,
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  ...FORBIDDEN_FIELD_PATTERNS,
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /user_[a-zA-Z0-9]{10,}/,
  /cus_[a-zA-Z0-9]+/,
];

export function hashApprovalPhrase(phrase: string): string {
  return createHash('sha256').update(phrase, 'utf8').digest('hex');
}

export function assertSecretSafeOutput(value: string): void {
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error('SECRET_OR_PII_OUTPUT_FORBIDDEN');
    }
  }
}

export function authorityContainsForbiddenFields(value: unknown): boolean {
  const json = JSON.stringify(value);
  return FORBIDDEN_FIELD_PATTERNS.some((p) => p.test(json));
}

export function clerkActionIsAmbiguous(cls: ClerkActionClass): boolean {
  return cls === 'CLERK_DELETE_STATUS_AMBIGUOUS' || cls === 'WRONG_SUBJECT_RISK' || cls === 'UNKNOWN';
}

export function clerkActionAllowsDelete(cls: ClerkActionClass): boolean {
  return cls === 'CLERK_DELETE_CONFIRMED';
}

export function transportAllowsProceed(cls: TransportClass): boolean {
  return cls === 'WEBHOOK_ACCEPTED_EXACT';
}

export function transportIsAmbiguous(cls: TransportClass): boolean {
  return cls === 'WEBHOOK_RESPONSE_AMBIGUOUS' || cls === 'UNKNOWN';
}

export type CombinedDeletionEvidenceInput = {
  clerk_action: ClerkActionClass;
  transport: TransportClass;
  event_ledger_green: boolean;
  deletion_ledger_green: boolean;
  rpc_green: boolean;
  target_state_green: boolean;
  retained_state_green: boolean;
  identifiability_green: boolean;
  control_subject_unchanged: boolean;
  unrelated_data_change_count: number;
};

export function evaluateCombinedDeletionEvidence(input: CombinedDeletionEvidenceInput): boolean {
  if (!clerkActionAllowsDelete(input.clerk_action)) return false;
  if (!transportAllowsProceed(input.transport)) return false;
  if (!input.event_ledger_green) return false;
  if (!input.deletion_ledger_green) return false;
  if (!input.rpc_green) return false;
  if (!input.target_state_green) return false;
  if (!input.retained_state_green) return false;
  if (!input.identifiability_green) return false;
  if (!input.control_subject_unchanged) return false;
  if (input.unrelated_data_change_count !== 0) return false;
  return true;
}

export function validateControlledDeletionAuthority(
  authority: ControlledDeletionAuthority | null | undefined,
  ctx: {
    now: Date;
    observedMainCommit?: string;
    observedDeploymentCommit?: string;
    observedChainEvidenceIdentity?: string;
    observedPurchaseWaveEvidenceIdentity?: string;
    observedAccountDeletionContractIdentity?: string;
    observedSubjectPrecheckIdentity?: string;
    observedEventLedgerPrecheckIdentity?: string;
    observedRpcIdentity?: string;
    observedPostcheckIdentity?: string;
    observedTransportProbeIdentity?: string;
    actionsConsumed?: {
      clerk_delete: number;
      new_webhook_event: number;
      rpc_success: number;
      retry: number;
      replay: number;
    };
    requestedManualAction?: boolean;
    requestedSyntheticPost?: boolean;
    extraSubjectCount?: number;
  },
): ControlledDeletionAuthorityValidationResult {
  const failed: string[] = [];
  const unknown: string[] = [];

  const budget: ControlledDeletionAuthorityValidationResult['irreversible_action_budget'] = {
    clerk_delete: MAX_CLERK_DELETE_ACTION_COUNT,
    new_webhook_event: MAX_NEW_WEBHOOK_EVENT_COUNT,
    rpc_success: MAX_RPC_SUCCESS_COUNT,
    retry: MAX_RETRY_COUNT,
    replay: MAX_REPLAY_COUNT,
  };

  if (!authority) {
    return result(false, ['HOLD_AUTHORITY_MISSING'], unknown, budget, DELETION_SUBJECT_LABEL, CONTROL_SUBJECT_LABEL);
  }

  if (authorityContainsForbiddenFields(authority)) {
    failed.push('HOLD_FORBIDDEN_SECRET_FIELD');
  }

  if (authority.schema_version !== DELETION_AUTHORITY_SCHEMA_VERSION) {
    failed.push('HOLD_AUTHORITY_SCHEMA_MISMATCH');
  }
  if (authority.single_use !== true) failed.push('HOLD_AUTHORITY_SINGLE_USE_REQUIRED');
  if (authority.consumed) failed.push('HOLD_AUTHORITY_ALREADY_CONSUMED');
  if (authority.prior_ambiguous_action) failed.push('HOLD_PRIOR_AMBIGUOUS_ACTION');

  const expires = Date.parse(authority.expires_at);
  if (!Number.isFinite(expires) || ctx.now.getTime() > expires) {
    failed.push('HOLD_AUTHORITY_EXPIRED');
  }

  if (authority.final_rc_verdict !== 'CLOSED_GREEN') failed.push('HOLD_FINAL_RC_NOT_GREEN');
  if (authority.preview_deletion_smoke_verdict !== 'CLOSED_GREEN') {
    failed.push('HOLD_PREVIEW_DELETION_SMOKE_NOT_GREEN');
  }
  if (authority.production_purchase_wave_verdict !== 'CLOSED_GREEN') {
    failed.push('HOLD_PURCHASE_WAVE_NOT_GREEN');
  }
  if (authority.dns_http_path_healthy !== true) failed.push('HOLD_DNS_HTTP_PATH_UNHEALTHY');

  if (!authority.approved_main_commit || authority.approved_main_commit.length !== 40) {
    failed.push('HOLD_MAIN_COMMIT_INVALID');
  }
  if (ctx.observedMainCommit && authority.approved_main_commit !== ctx.observedMainCommit) {
    failed.push('HOLD_MAIN_COMMIT_MISMATCH');
  }

  if (
    !authority.approved_production_deployment_commit ||
    authority.approved_production_deployment_commit.length !== 40
  ) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_INVALID');
  }
  if (
    ctx.observedDeploymentCommit &&
    authority.approved_production_deployment_commit !== ctx.observedDeploymentCommit
  ) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_MISMATCH');
  }

  if (!authority.approved_production_chain_evidence_identity) {
    failed.push('HOLD_CHAIN_EVIDENCE_MISSING');
  }
  if (
    ctx.observedChainEvidenceIdentity &&
    authority.approved_production_chain_evidence_identity !== ctx.observedChainEvidenceIdentity
  ) {
    failed.push('HOLD_CHAIN_EVIDENCE_MISMATCH');
  }

  if (!authority.approved_purchase_wave_evidence_identity) {
    failed.push('HOLD_PURCHASE_WAVE_EVIDENCE_MISSING');
  }
  if (
    ctx.observedPurchaseWaveEvidenceIdentity &&
    authority.approved_purchase_wave_evidence_identity !== ctx.observedPurchaseWaveEvidenceIdentity
  ) {
    failed.push('HOLD_PURCHASE_WAVE_EVIDENCE_MISMATCH');
  }

  if (!authority.approved_account_deletion_contract_identity) {
    failed.push('HOLD_ACCOUNT_DELETION_CONTRACT_MISSING');
  }
  if (
    ctx.observedAccountDeletionContractIdentity &&
    authority.approved_account_deletion_contract_identity !== ctx.observedAccountDeletionContractIdentity
  ) {
    failed.push('HOLD_ACCOUNT_DELETION_CONTRACT_MISMATCH');
  }

  if (authority.approved_deletion_subject_label !== DELETION_SUBJECT_LABEL) {
    failed.push('HOLD_DELETION_SUBJECT_LABEL_MISMATCH');
  }
  if (authority.approved_control_subject_label !== CONTROL_SUBJECT_LABEL) {
    failed.push('HOLD_CONTROL_SUBJECT_LABEL_MISMATCH');
  }
  if (authority.approved_deletion_subject_label === authority.approved_control_subject_label) {
    failed.push('HOLD_DELETION_CONTROL_SAME_SUBJECT');
  }

  if ((ctx.extraSubjectCount ?? 0) > 0) failed.push('HOLD_EXTRA_SUBJECT_FORBIDDEN');

  if (authority.approved_rpc_identity !== APPROVED_RPC_IDENTITY) {
    failed.push('HOLD_RPC_IDENTITY_MISMATCH');
  }
  if (ctx.observedRpcIdentity && authority.approved_rpc_identity !== ctx.observedRpcIdentity) {
    failed.push('HOLD_RPC_IDENTITY_OBSERVED_MISMATCH');
  }

  if (authority.approved_webhook_route_identity !== APPROVED_WEBHOOK_ROUTE_IDENTITY) {
    failed.push('HOLD_WEBHOOK_ROUTE_MISMATCH');
  }

  if (authority.approved_max_clerk_delete_action_count !== MAX_CLERK_DELETE_ACTION_COUNT) {
    failed.push('HOLD_MAX_CLERK_DELETE_MISMATCH');
  }
  if (authority.approved_max_new_webhook_event_count !== MAX_NEW_WEBHOOK_EVENT_COUNT) {
    failed.push('HOLD_MAX_WEBHOOK_EVENT_MISMATCH');
  }
  if (authority.approved_max_rpc_success_count !== MAX_RPC_SUCCESS_COUNT) {
    failed.push('HOLD_MAX_RPC_SUCCESS_MISMATCH');
  }
  if (authority.approved_max_retry_count !== MAX_RETRY_COUNT) {
    failed.push('HOLD_MAX_RETRY_MISMATCH');
  }
  if (authority.approved_max_replay_count !== MAX_REPLAY_COUNT) {
    failed.push('HOLD_MAX_REPLAY_MISMATCH');
  }

  const bc = authority.binding_confirmations;
  if (!bc.vercel_production_binding_exact) failed.push('HOLD_VERCEL_BINDING_MISMATCH');
  if (!bc.supabase_production_binding_exact) failed.push('HOLD_SUPABASE_BINDING_MISMATCH');
  if (!bc.clerk_live_instance_exact) failed.push('HOLD_CLERK_INSTANCE_MISMATCH');
  if (!bc.clerk_endpoint_exact) failed.push('HOLD_CLERK_ENDPOINT_MISMATCH');
  if (!bc.signing_secret_scope_exact) failed.push('HOLD_SIGNING_SECRET_MISMATCH');
  if (!bc.webhook_route_exact) failed.push('HOLD_WEBHOOK_ROUTE_BINDING_MISMATCH');

  if (!authority.human_approval_phrase_hash || authority.human_approval_phrase_hash.length !== 64) {
    failed.push('HOLD_APPROVAL_HASH_MISSING');
  }
  if (!authority.execution_nonce_hash || authority.execution_nonce_hash.length !== 64) {
    failed.push('HOLD_EXECUTION_NONCE_MISSING');
  }

  if (ctx.requestedManualAction) failed.push('HOLD_MANUAL_ACTION_FORBIDDEN');
  if (ctx.requestedSyntheticPost) failed.push('HOLD_SYNTHETIC_POST_FORBIDDEN');

  if (ctx.actionsConsumed) {
    if (ctx.actionsConsumed.clerk_delete > authority.approved_max_clerk_delete_action_count) {
      failed.push('HOLD_CLERK_DELETE_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.new_webhook_event > authority.approved_max_new_webhook_event_count) {
      failed.push('HOLD_WEBHOOK_EVENT_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.rpc_success > authority.approved_max_rpc_success_count) {
      failed.push('HOLD_RPC_SUCCESS_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.retry > authority.approved_max_retry_count) {
      failed.push('HOLD_RETRY_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.replay > authority.approved_max_replay_count) {
      failed.push('HOLD_REPLAY_BUDGET_EXCEEDED');
    }
    budget.clerk_delete = Math.max(
      0,
      authority.approved_max_clerk_delete_action_count - ctx.actionsConsumed.clerk_delete,
    );
    budget.new_webhook_event = Math.max(
      0,
      authority.approved_max_new_webhook_event_count - ctx.actionsConsumed.new_webhook_event,
    );
    budget.rpc_success = Math.max(
      0,
      authority.approved_max_rpc_success_count - ctx.actionsConsumed.rpc_success,
    );
    budget.retry = Math.max(0, authority.approved_max_retry_count - ctx.actionsConsumed.retry);
    budget.replay = Math.max(0, authority.approved_max_replay_count - ctx.actionsConsumed.replay);
  }

  return result(
    failed.length === 0 && unknown.length === 0,
    failed,
    unknown,
    budget,
    DELETION_SUBJECT_LABEL,
    CONTROL_SUBJECT_LABEL,
  );
}

function result(
  ready: boolean,
  failed_flags: string[],
  unknown_flags: string[],
  irreversible_action_budget: ControlledDeletionAuthorityValidationResult['irreversible_action_budget'],
  deletionLabel: string,
  controlLabel: string,
): ControlledDeletionAuthorityValidationResult {
  return {
    schema_version: DELETION_AUTHORITY_SCHEMA_VERSION,
    ready,
    failed_flags,
    unknown_flags,
    allowed_next_action: ready ? 'X0_AUTHORITY_VALIDATION' : 'HOLD',
    irreversible_action_budget,
    approved_deletion_subject_label: deletionLabel,
    approved_control_subject_label: controlLabel,
  };
}

export function serializeControlledDeletionAuthorityResult(
  value: ControlledDeletionAuthorityValidationResult,
): string {
  const json = JSON.stringify(value);
  assertSecretSafeOutput(json);
  return json;
}

export function sqlHasSingleTopLevelSelect(sql: string): boolean {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .trim();
  return /^(WITH\b[\s\S]+)?SELECT\b/i.test(stripped);
}

export function parseSqlMutationKeywords(sql: string): string[] {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
  const forbidden = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'TRUNCATE',
    'CREATE',
    'ALTER',
    'DROP',
    'GRANT',
    'REVOKE',
    'COPY',
    'CALL',
    'DO',
    'NOTIFY',
    'EXECUTE',
  ];
  return forbidden.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(stripped));
}

export function sqlModeCount(sql: string): number {
  return POSTCHECK_MODES.filter((m) => sql.includes(m)).length;
}
