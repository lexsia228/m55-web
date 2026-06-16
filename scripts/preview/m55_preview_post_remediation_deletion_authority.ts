/**
 * M55 Preview post-remediation deletion smoke authority (LOCAL validation only).
 * No network, DB, Clerk, webhook, or credential access.
 */

import { createHash } from 'node:crypto';

export const PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION =
  'm55_preview_post_remediation_deletion_authority_v1' as const;

export const APPROVED_FEATURE_HEAD = '45e75b3020636ab4e6fb313501ce739a818d7cf0' as const;
// Planning/historical deployment — NOT the execution target after commit/push.
// After the authority commit is pushed, Vercel creates a NEW deployment for the new commit.
// The smoke must execute against that post-push deployment, not this planning deployment.
export const PLANNING_DEPLOYMENT_ID = 'dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh' as const;
// Backward-compat alias used in historical exclusion validation
export const APPROVED_DEPLOYMENT_ID = PLANNING_DEPLOYMENT_ID;
// SHA-256 of the planning deployment ID — stored in authority token for forbidden-set binding
export const HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH = createHash('sha256')
  .update(PLANNING_DEPLOYMENT_ID)
  .digest('hex');
export const APPROVED_ENVIRONMENT = 'Preview' as const;
export const APPROVED_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;
export const APPROVED_VERCEL_PROJECT_IDENTITY = 'm55-webv2' as const;
export const APPROVED_BRANCH_ALIAS_IDENTITY =
  'm55-webv2-git-feat-m55-paid-lp-canonical-wave1-m55-official.vercel.app' as const;
export const APPROVED_SUPABASE_PREVIEW_ORG = 'm55-preview' as const;
export const APPROVED_SUPABASE_PREVIEW_PROJECT = 'm55-soul-preview' as const;
export const APPROVED_SUPABASE_PREVIEW_REF_IDENTITY = 'sbogwyzldjxxouhqtpoq' as const;
export const APPROVED_CLERK_DEVELOPMENT_INSTANCE_IDENTITY = 'clerk-development-instance-v1' as const;
export const APPROVED_CLERK_DEVELOPMENT_ENDPOINT_IDENTITY =
  'clerk-development-user-deleted-endpoint-v1' as const;
export const APPROVED_SIGNING_SECRET_SCOPE_MARKER = 'preview-scope-only' as const;
export const APPROVED_WEBHOOK_ROUTE_IDENTITY = 'app/api/clerk/webhook/route.ts' as const;
export const APPROVED_WEBHOOK_URL_IDENTITY =
  'preview-branch-alias-clerk-webhook-route-v1' as const;
export const SUBJECT_LABEL = 'M55_PREVIEW_DELETE_POST_REMEDIATION_01' as const;
export const APPROVED_SUBJECT_PRECHECK_IDENTITY = 'preview-subject-precheck-v1' as const;
export const APPROVED_EVENT_LEDGER_PRECHECK_IDENTITY = 'preview-event-ledger-precheck-v1' as const;
export const APPROVED_RPC_IDENTITY = 'm55_account_deletion_process_v1' as const;
export const APPROVED_POSTCHECK_IDENTITY =
  'm55_preview_post_remediation_deletion_smoke_postcheck_v1' as const;
export const APPROVED_HISTORICAL_ATTEMPT_EXCLUSION_IDENTITY =
  'four-prior-preview-dns-failure-attempts-frozen-v1' as const;
export const DNS_REMEDIATION_STATE = 'USE_EXISTING_FRESH_DEPLOYMENT' as const;

export const MAX_SUBJECT_CREATE_COUNT = 1 as const;
export const MAX_DELETE_ACTION_COUNT = 1 as const;
export const MAX_NATURAL_WEBHOOK_COUNT = 1 as const;
export const MAX_RETRY_COUNT = 0 as const;
export const MAX_REPLAY_COUNT = 0 as const;
export const MAX_SEND_EXAMPLE_COUNT = 0 as const;
export const MAX_SYNTHETIC_POST_COUNT = 0 as const;
export const MAX_MANUAL_RPC_COUNT = 0 as const;
export const MAX_MANUAL_DB_REPAIR_COUNT = 0 as const;

export const SMOKE_STATES = [
  'S0_AUTHORITY_VALIDATION',
  'S1_PREVIEW_BINDING_REVERIFY',
  'S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED',
  'S3_SAFE_LABEL_MAPPING',
  'S4_PREDELETE_READONLY_PRECHECK',
  'S5_HUMAN_CONFIRMATION_BEFORE_DELETE',
  'S6_HUMAN_DELETE_ACTION_REQUIRED',
  'S7_CLERK_ACTION_CLASSIFICATION',
  'S8_WAIT_FOR_NATURAL_WEBHOOK',
  'S9_SVIX_METADATA_CLASSIFICATION',
  'S10_HTTP_TRANSPORT_CLASSIFICATION',
  'S11_DB_RPC_TARGET_RETAINED_POSTCHECK',
  'S12_UNRELATED_DATA_POSTCHECK',
  'S13_FINAL_SMOKE_CLASSIFICATION',
  'S14_STOP_NO_FURTHER_ACTION',
  'S15_FINAL_RC_GATE_SEPARATE',
] as const;

export type SmokeState = (typeof SMOKE_STATES)[number];

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

export const FINAL_SMOKE_CLASSES = [
  'PREVIEW_DELETION_GREEN',
  'HOLD_CLERK_ACTION_AMBIGUOUS',
  'HOLD_WEBHOOK_NOT_ACCEPTED',
  'HOLD_EVENT_LEDGER_MISMATCH',
  'HOLD_DELETION_LEDGER_MISMATCH',
  'HOLD_RPC_MISMATCH',
  'HOLD_TARGET_DATA_REMAINS',
  'HOLD_RETAINED_DATA_CONTRACT_MISMATCH',
  'HOLD_IDENTIFIABILITY_MISMATCH',
  'HOLD_UNRELATED_DATA_CHANGED',
  'HOLD_UNKNOWN',
] as const;

export type FinalSmokeClass = (typeof FINAL_SMOKE_CLASSES)[number];

export const POSTCHECK_MODES = [
  'PRE_DELETE_DEPLOYMENT_SUBJECT',
  'PRE_DELETE_EVENT_LEDGER',
  'POST_DELETE_EVENT_LEDGER_RPC',
  'POST_DELETE_TARGET_RETAINED',
  'POST_DELETE_UNRELATED',
  'INTEGRATED_PREVIEW_DELETION_CLOSURE',
] as const;

export type PostcheckMode = (typeof POSTCHECK_MODES)[number];

export const SUBJECT_CLASSES = [
  'SUBJECT_NEW_AND_CLEAN',
  'SUBJECT_ALREADY_HAS_TARGET_DATA',
  'SUBJECT_IDENTITY_AMBIGUOUS',
  'SUBJECT_PREVIOUS_ATTEMPT_REUSE_RISK',
  'SUBJECT_REAL_USER_RISK',
  'SUBJECT_UNKNOWN',
] as const;

export type SubjectClass = (typeof SUBJECT_CLASSES)[number];

export const PRECHECK_CLASSES = [
  'PRECHECK_GREEN',
  'HOLD_DEPLOYMENT_MISMATCH',
  'HOLD_SUBJECT_NOT_CLEAN',
  'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT',
  'HOLD_ENDPOINT_BINDING_MISMATCH',
  'HOLD_TARGET_BASELINE_UNKNOWN',
  'HOLD_UNKNOWN',
] as const;

export type PrecheckClass = (typeof PRECHECK_CLASSES)[number];

// Approval phrase uses placeholders — the actual execution deployment ID and commit
// are discovered after commit/push and confirmed by Human at execution time.
// The planning deployment dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh is historical evidence only.
export const APPROVAL_PHRASE_TEMPLATE =
  'APPROVE CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-REMEDIATION-EXECUTION DEPLOYMENT_<safe-id> COMMIT_<safe-short-sha> SUBJECT_M55_PREVIEW_DELETE_POST_REMEDIATION_01 AUTHORITY_<safe-hash>';

// Execution-time deployment identity — supplied by Human at smoke execution time.
// The planning deployment is NOT the execution target; this is a post-push deployment
// created for the final pushed authority commit.
export type ExecutionDeploymentBinding = {
  deployment_id: string;
  deployment_commit: string;
  deployment_environment: string;
  deployment_branch: string;
  branch_alias_current: boolean;
  production_binding: boolean;
  deployment_ready: boolean;
  created_after_authority_commit: boolean;
};

export type PreviewBindingConfirmations = {
  vercel_preview_deployment_exact: boolean;
  vercel_branch_alias_current: boolean;
  production_binding_false: boolean;
  supabase_preview_binding_exact: boolean;
  clerk_development_instance_exact: boolean;
  clerk_development_endpoint_exact: boolean;
  signing_secret_preview_scope_exact: boolean;
  webhook_route_exact: boolean;
  webhook_url_exact: boolean;
};

export type PreviewPostRemediationDeletionAuthority = {
  schema_version: typeof PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION;
  gate_title: string;
  approved_feature_head: string;
  approved_deployment_id: string;
  approved_deployment_commit: string;
  approved_environment: string;
  approved_branch: string;
  approved_branch_alias_identity: string;
  approved_vercel_project_identity: string;
  approved_supabase_preview_identity: string;
  approved_clerk_development_instance_identity: string;
  approved_clerk_development_endpoint_identity: string;
  approved_signing_secret_scope_marker: string;
  approved_webhook_route_identity: string;
  approved_webhook_url_identity: string;
  approved_subject_label: string;
  approved_subject_precheck_identity: string;
  approved_event_ledger_precheck_identity: string;
  approved_rpc_identity: string;
  approved_postcheck_identity: string;
  approved_historical_attempt_exclusion_identity: string;
  approved_max_subject_create_count: number;
  approved_max_delete_action_count: number;
  approved_max_natural_webhook_count: number;
  approved_max_retry_count: number;
  approved_max_replay_count: number;
  dns_remediation_state: string;
  binding_confirmations: PreviewBindingConfirmations;
  human_approval_phrase_hash: string;
  issued_at: string;
  expires_at: string;
  single_use: true;
  consumed: boolean;
  execution_nonce_hash: string;
  // Execution-time fields — fail-closed (empty string / false) until Human discovery after push.
  // expected_authority_commit: the final pushed commit SHA this smoke must run against.
  expected_authority_commit: string;
  // historical_forbidden_deployment_ids_hash: must match HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH.
  historical_forbidden_deployment_ids_hash: string;
  // deployment_binding_confirmation_identity: opaque marker confirming Human binding verification.
  deployment_binding_confirmation_identity: string;
  prior_ambiguous_action: boolean;
};

export type PreviewAuthorityValidationResult = {
  schema_version: typeof PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION;
  ready: boolean;
  failed_flags: string[];
  unknown_flags: string[];
  allowed_next_action: string;
  irreversible_action_budget: {
    subject_create: number;
    delete_action: number;
    natural_webhook: number;
    retry: number;
    replay: number;
  };
  approved_subject_label: string;
  approved_deployment_id: string;
};

const FORBIDDEN_FIELD_PATTERNS = [
  /sk_live_/,
  /sk_test_/,
  /whsec_/,
  /Bearer\s+/,
  /msg_[A-Za-z0-9]+/,
  /evt_[A-Za-z0-9]+/,
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  ...FORBIDDEN_FIELD_PATTERNS,
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /user_[a-zA-Z0-9]{10,}/,
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

export function transportIsDnsFailure(cls: TransportClass): boolean {
  return cls === 'WEBHOOK_TRANSPORT_DNS_FAILURE';
}

export function subjectAllowsProceed(cls: SubjectClass): boolean {
  return cls === 'SUBJECT_NEW_AND_CLEAN';
}

export type CombinedSmokeEvidenceInput = {
  clerk_action: ClerkActionClass;
  transport: TransportClass;
  human_clerk_marker_present: boolean;
  human_transport_marker_present: boolean;
  event_ledger_green: boolean;
  deletion_ledger_green: boolean;
  rpc_green: boolean;
  target_state_green: boolean;
  retained_state_green: boolean;
  identifiability_green: boolean;
  unrelated_data_change_count: number;
};

export function evaluateCombinedSmokeEvidence(input: CombinedSmokeEvidenceInput): boolean {
  if (!input.human_clerk_marker_present) return false;
  if (!input.human_transport_marker_present) return false;
  if (!clerkActionAllowsDelete(input.clerk_action)) return false;
  if (!transportAllowsProceed(input.transport)) return false;
  if (!input.event_ledger_green) return false;
  if (!input.deletion_ledger_green) return false;
  if (!input.rpc_green) return false;
  if (!input.target_state_green) return false;
  if (!input.retained_state_green) return false;
  if (!input.identifiability_green) return false;
  if (input.unrelated_data_change_count !== 0) return false;
  return true;
}

export function validatePreviewPostRemediationDeletionAuthority(
  authority: PreviewPostRemediationDeletionAuthority | null | undefined,
  ctx: {
    now: Date;
    observedFeatureHead?: string;
    observedDeploymentId?: string;
    observedDeploymentCommit?: string;
    observedBranchAliasCurrent?: boolean;
    observedProductionBinding?: boolean;
    observedSubjectPrecheckIdentity?: string;
    observedEventLedgerPrecheckIdentity?: string;
    observedRpcIdentity?: string;
    observedPostcheckIdentity?: string;
    observedHistoricalExclusionIdentity?: string;
    subjectClass?: SubjectClass;
    historicalReuseDetected?: boolean;
    realUserRisk?: boolean;
    subjectPrecheckGreen?: boolean;
    priorEventPresent?: boolean;
    priorDeletionLedgerPresent?: boolean;
    actionsConsumed?: {
      subject_create: number;
      delete_action: number;
      natural_webhook: number;
      retry: number;
      replay: number;
    };
    requestedSendExample?: boolean;
    requestedSyntheticPost?: boolean;
    requestedManualRpc?: boolean;
    requestedManualDbRepair?: boolean;
    requestedSubjectRecreation?: boolean;
    executionDeployment?: ExecutionDeploymentBinding;
    // Exact Supabase Preview project ref — must equal APPROVED_SUPABASE_PREVIEW_REF_IDENTITY.
    // Required for GREEN; boolean-only confirmation is insufficient.
    actual_supabase_preview_ref?: string;
  },
): PreviewAuthorityValidationResult {
  const failed: string[] = [];
  const unknown: string[] = [];

  const budget: PreviewAuthorityValidationResult['irreversible_action_budget'] = {
    subject_create: MAX_SUBJECT_CREATE_COUNT,
    delete_action: MAX_DELETE_ACTION_COUNT,
    natural_webhook: MAX_NATURAL_WEBHOOK_COUNT,
    retry: MAX_RETRY_COUNT,
    replay: MAX_REPLAY_COUNT,
  };

  if (!authority) {
    return result(false, ['HOLD_AUTHORITY_MISSING'], unknown, budget);
  }

  if (authorityContainsForbiddenFields(authority)) {
    failed.push('HOLD_FORBIDDEN_SECRET_FIELD');
  }

  if (authority.schema_version !== PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION) {
    failed.push('HOLD_AUTHORITY_SCHEMA_MISMATCH');
  }
  if (authority.single_use !== true) failed.push('HOLD_AUTHORITY_SINGLE_USE_REQUIRED');
  if (authority.consumed) failed.push('HOLD_AUTHORITY_ALREADY_CONSUMED');
  if (authority.prior_ambiguous_action) failed.push('HOLD_PRIOR_AMBIGUOUS_ACTION');

  const expires = Date.parse(authority.expires_at);
  if (!Number.isFinite(expires) || ctx.now.getTime() > expires) {
    failed.push('HOLD_AUTHORITY_EXPIRED');
  }

  if (authority.approved_feature_head !== APPROVED_FEATURE_HEAD) {
    failed.push('HOLD_FEATURE_HEAD_MISMATCH');
  }
  if (ctx.observedFeatureHead && authority.approved_feature_head !== ctx.observedFeatureHead) {
    failed.push('HOLD_FEATURE_HEAD_OBSERVED_MISMATCH');
  }

  if (authority.approved_deployment_id !== APPROVED_DEPLOYMENT_ID) {
    failed.push('HOLD_DEPLOYMENT_ID_MISMATCH');
  }
  if (ctx.observedDeploymentId && authority.approved_deployment_id !== ctx.observedDeploymentId) {
    failed.push('HOLD_DEPLOYMENT_ID_OBSERVED_MISMATCH');
  }

  if (authority.approved_deployment_commit !== APPROVED_FEATURE_HEAD) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_MISMATCH');
  }
  if (
    ctx.observedDeploymentCommit &&
    authority.approved_deployment_commit !== ctx.observedDeploymentCommit
  ) {
    failed.push('HOLD_DEPLOYMENT_COMMIT_OBSERVED_MISMATCH');
  }

  // Execution deployment validation — required for GREEN.
  // The planning deployment is historical evidence only.  The execution deployment must be
  // a post-push deployment created for the final authority commit.
  if (!ctx.executionDeployment) {
    failed.push('HOLD_EXECUTION_DEPLOYMENT_NOT_SUPPLIED');
  } else {
    const ed = ctx.executionDeployment;
    if (ed.deployment_id === PLANNING_DEPLOYMENT_ID) {
      failed.push('HOLD_EXECUTION_DEPLOYMENT_IS_HISTORICAL_FORBIDDEN');
    }
    if (!authority.expected_authority_commit || authority.expected_authority_commit.length === 0) {
      failed.push('HOLD_EXPECTED_AUTHORITY_COMMIT_NOT_SET');
    } else if (ed.deployment_commit !== authority.expected_authority_commit) {
      failed.push('HOLD_EXECUTION_DEPLOYMENT_COMMIT_MISMATCH');
    }
    if (!ed.deployment_ready) failed.push('HOLD_EXECUTION_DEPLOYMENT_NOT_READY');
    if (ed.deployment_environment !== 'Preview') failed.push('HOLD_EXECUTION_DEPLOYMENT_NOT_PREVIEW');
    if (!ed.branch_alias_current) failed.push('HOLD_EXECUTION_DEPLOYMENT_ALIAS_STALE');
    if (ed.production_binding) failed.push('HOLD_EXECUTION_DEPLOYMENT_PRODUCTION_BINDING');
    if (!ed.created_after_authority_commit) {
      failed.push('HOLD_EXECUTION_DEPLOYMENT_PREDATES_AUTHORITY_COMMIT');
    }
    if (
      authority.historical_forbidden_deployment_ids_hash &&
      authority.historical_forbidden_deployment_ids_hash !== HISTORICAL_FORBIDDEN_DEPLOYMENT_IDS_HASH
    ) {
      failed.push('HOLD_HISTORICAL_FORBIDDEN_HASH_MISMATCH');
    }
  }

  if (authority.approved_environment !== APPROVED_ENVIRONMENT) {
    failed.push('HOLD_ENVIRONMENT_MISMATCH');
  }
  if (authority.approved_branch !== APPROVED_BRANCH) {
    failed.push('HOLD_BRANCH_MISMATCH');
  }
  if (authority.approved_branch_alias_identity !== APPROVED_BRANCH_ALIAS_IDENTITY) {
    failed.push('HOLD_BRANCH_ALIAS_MISMATCH');
  }
  if (ctx.observedBranchAliasCurrent === false) {
    failed.push('HOLD_BRANCH_ALIAS_STALE');
  }

  if (authority.approved_vercel_project_identity !== APPROVED_VERCEL_PROJECT_IDENTITY) {
    failed.push('HOLD_VERCEL_PROJECT_MISMATCH');
  }

  if (authority.dns_remediation_state !== DNS_REMEDIATION_STATE) {
    failed.push('HOLD_DNS_REMEDIATION_STATE_MISMATCH');
  }

  if (authority.approved_subject_label !== SUBJECT_LABEL) {
    failed.push('HOLD_SUBJECT_LABEL_MISMATCH');
  }

  if (ctx.subjectClass && !subjectAllowsProceed(ctx.subjectClass)) {
    failed.push('HOLD_SUBJECT_NOT_CLEAN');
  }
  if (ctx.historicalReuseDetected) {
    failed.push('HOLD_HISTORICAL_ATTEMPT_REUSE');
  }
  if (ctx.realUserRisk) {
    failed.push('HOLD_REAL_USER_RISK');
  }
  if (ctx.subjectPrecheckGreen === false) {
    failed.push('HOLD_SUBJECT_PRECHECK_NOT_GREEN');
  }
  if (ctx.priorEventPresent) {
    failed.push('HOLD_PRIOR_EVENT_PRESENT');
  }
  if (ctx.priorDeletionLedgerPresent) {
    failed.push('HOLD_PRIOR_DELETION_LEDGER_PRESENT');
  }

  if (authority.approved_subject_precheck_identity !== APPROVED_SUBJECT_PRECHECK_IDENTITY) {
    failed.push('HOLD_SUBJECT_PRECHECK_IDENTITY_MISMATCH');
  }
  if (
    ctx.observedSubjectPrecheckIdentity &&
    authority.approved_subject_precheck_identity !== ctx.observedSubjectPrecheckIdentity
  ) {
    failed.push('HOLD_SUBJECT_PRECHECK_IDENTITY_OBSERVED_MISMATCH');
  }
  if (authority.approved_event_ledger_precheck_identity !== APPROVED_EVENT_LEDGER_PRECHECK_IDENTITY) {
    failed.push('HOLD_EVENT_LEDGER_PRECHECK_IDENTITY_MISMATCH');
  }
  if (
    ctx.observedEventLedgerPrecheckIdentity &&
    authority.approved_event_ledger_precheck_identity !== ctx.observedEventLedgerPrecheckIdentity
  ) {
    failed.push('HOLD_EVENT_LEDGER_PRECHECK_IDENTITY_OBSERVED_MISMATCH');
  }
  if (authority.approved_postcheck_identity !== APPROVED_POSTCHECK_IDENTITY) {
    failed.push('HOLD_POSTCHECK_IDENTITY_MISMATCH');
  }
  if (
    ctx.observedPostcheckIdentity &&
    authority.approved_postcheck_identity !== ctx.observedPostcheckIdentity
  ) {
    failed.push('HOLD_POSTCHECK_IDENTITY_OBSERVED_MISMATCH');
  }
  if (authority.approved_rpc_identity !== APPROVED_RPC_IDENTITY) {
    failed.push('HOLD_RPC_IDENTITY_MISMATCH');
  }
  if (ctx.observedRpcIdentity && authority.approved_rpc_identity !== ctx.observedRpcIdentity) {
    failed.push('HOLD_RPC_IDENTITY_OBSERVED_MISMATCH');
  }

  if (authority.approved_webhook_route_identity !== APPROVED_WEBHOOK_ROUTE_IDENTITY) {
    failed.push('HOLD_WEBHOOK_ROUTE_MISMATCH');
  }

  if (
    authority.approved_historical_attempt_exclusion_identity !==
    APPROVED_HISTORICAL_ATTEMPT_EXCLUSION_IDENTITY
  ) {
    failed.push('HOLD_HISTORICAL_EXCLUSION_MISMATCH');
  }
  if (
    ctx.observedHistoricalExclusionIdentity &&
    authority.approved_historical_attempt_exclusion_identity !==
      ctx.observedHistoricalExclusionIdentity
  ) {
    failed.push('HOLD_HISTORICAL_EXCLUSION_OBSERVED_MISMATCH');
  }

  if (authority.approved_max_subject_create_count !== MAX_SUBJECT_CREATE_COUNT) {
    failed.push('HOLD_MAX_SUBJECT_CREATE_MISMATCH');
  }
  if (authority.approved_max_delete_action_count !== MAX_DELETE_ACTION_COUNT) {
    failed.push('HOLD_MAX_DELETE_ACTION_MISMATCH');
  }
  if (authority.approved_max_natural_webhook_count !== MAX_NATURAL_WEBHOOK_COUNT) {
    failed.push('HOLD_MAX_WEBHOOK_MISMATCH');
  }
  if (authority.approved_max_retry_count !== MAX_RETRY_COUNT) {
    failed.push('HOLD_MAX_RETRY_MISMATCH');
  }
  if (authority.approved_max_replay_count !== MAX_REPLAY_COUNT) {
    failed.push('HOLD_MAX_REPLAY_MISMATCH');
  }

  const bc = authority.binding_confirmations;
  if (!bc.vercel_preview_deployment_exact) failed.push('HOLD_VERCEL_PREVIEW_BINDING_MISMATCH');
  if (!bc.vercel_branch_alias_current) failed.push('HOLD_BRANCH_ALIAS_NOT_CURRENT');
  if (!bc.production_binding_false) failed.push('HOLD_PRODUCTION_BINDING_DETECTED');
  if (ctx.observedProductionBinding === true) {
    failed.push('HOLD_PRODUCTION_BINDING_OBSERVED');
  }
  if (!bc.supabase_preview_binding_exact) failed.push('HOLD_SUPABASE_PREVIEW_BINDING_MISMATCH');
  // Exact ref equality is required — boolean confirmation alone is insufficient.
  if (!ctx.actual_supabase_preview_ref || ctx.actual_supabase_preview_ref.length === 0) {
    failed.push('HOLD_SUPABASE_PREVIEW_REF_MISSING');
  } else if (ctx.actual_supabase_preview_ref !== APPROVED_SUPABASE_PREVIEW_REF_IDENTITY) {
    failed.push('HOLD_SUPABASE_PREVIEW_REF_MISMATCH');
  }
  if (!bc.clerk_development_instance_exact) {
    failed.push('HOLD_CLERK_DEVELOPMENT_INSTANCE_MISMATCH');
  }
  if (!bc.clerk_development_endpoint_exact) {
    failed.push('HOLD_CLERK_DEVELOPMENT_ENDPOINT_MISMATCH');
  }
  if (!bc.signing_secret_preview_scope_exact) {
    failed.push('HOLD_SIGNING_SECRET_SCOPE_MISMATCH');
  }
  if (!bc.webhook_route_exact) failed.push('HOLD_WEBHOOK_ROUTE_BINDING_MISMATCH');
  if (!bc.webhook_url_exact) failed.push('HOLD_WEBHOOK_URL_MISMATCH');

  if (!authority.human_approval_phrase_hash || authority.human_approval_phrase_hash.length !== 64) {
    failed.push('HOLD_APPROVAL_HASH_MISSING');
  }
  if (!authority.execution_nonce_hash || authority.execution_nonce_hash.length !== 64) {
    failed.push('HOLD_EXECUTION_NONCE_MISSING');
  }

  if (ctx.requestedSendExample) failed.push('HOLD_SEND_EXAMPLE_FORBIDDEN');
  if (ctx.requestedSyntheticPost) failed.push('HOLD_SYNTHETIC_POST_FORBIDDEN');
  if (ctx.requestedManualRpc) failed.push('HOLD_MANUAL_RPC_FORBIDDEN');
  if (ctx.requestedManualDbRepair) failed.push('HOLD_MANUAL_DB_REPAIR_FORBIDDEN');
  if (ctx.requestedSubjectRecreation) failed.push('HOLD_SUBJECT_RECREATION_FORBIDDEN');

  if (ctx.actionsConsumed) {
    if (ctx.actionsConsumed.subject_create > authority.approved_max_subject_create_count) {
      failed.push('HOLD_SUBJECT_CREATE_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.delete_action > authority.approved_max_delete_action_count) {
      failed.push('HOLD_DELETE_ACTION_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.natural_webhook > authority.approved_max_natural_webhook_count) {
      failed.push('HOLD_WEBHOOK_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.retry > authority.approved_max_retry_count) {
      failed.push('HOLD_RETRY_BUDGET_EXCEEDED');
    }
    if (ctx.actionsConsumed.replay > authority.approved_max_replay_count) {
      failed.push('HOLD_REPLAY_BUDGET_EXCEEDED');
    }
    budget.subject_create = Math.max(
      0,
      authority.approved_max_subject_create_count - ctx.actionsConsumed.subject_create,
    );
    budget.delete_action = Math.max(
      0,
      authority.approved_max_delete_action_count - ctx.actionsConsumed.delete_action,
    );
    budget.natural_webhook = Math.max(
      0,
      authority.approved_max_natural_webhook_count - ctx.actionsConsumed.natural_webhook,
    );
    budget.retry = Math.max(0, authority.approved_max_retry_count - ctx.actionsConsumed.retry);
    budget.replay = Math.max(0, authority.approved_max_replay_count - ctx.actionsConsumed.replay);
  }

  return result(failed.length === 0 && unknown.length === 0, failed, unknown, budget);
}

function result(
  ready: boolean,
  failed_flags: string[],
  unknown_flags: string[],
  irreversible_action_budget: PreviewAuthorityValidationResult['irreversible_action_budget'],
): PreviewAuthorityValidationResult {
  return {
    schema_version: PREVIEW_DELETION_AUTHORITY_SCHEMA_VERSION,
    ready,
    failed_flags,
    unknown_flags,
    allowed_next_action: ready ? 'S0_AUTHORITY_VALIDATION' : 'HOLD',
    irreversible_action_budget,
    approved_subject_label: SUBJECT_LABEL,
    approved_deployment_id: APPROVED_DEPLOYMENT_ID,
  };
}

export function serializePreviewAuthorityResult(value: PreviewAuthorityValidationResult): string {
  const json = JSON.stringify(value);
  assertSecretSafeOutput(json);
  return json;
}

export function isHistoricalForbiddenDeployment(deploymentId: string): boolean {
  return deploymentId === PLANNING_DEPLOYMENT_ID;
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
