import { canonicalSerializePreviewRemoteApply } from './types.ts';

export const REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1' as const;

export const REVISION7_CONTRACT_PATH =
  'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json' as const;

export const REVISION7_CONTRACT_SHA256 =
  'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c' as const;

export const COMMIT_RESPONSE_CLASSES = [
  'DEFINITIVE_COMMIT_ACK',
  'ACK_UNCERTAIN_OR_MISSING',
  'DEFINITIVE_TRANSACTION_REJECTION',
] as const;

export const ACK_STATE_IDENTIFIERS = [
  'DEFINITELY_NOT_COMMITTED',
  'DEFINITELY_COMMITTED',
  'CONTRADICTORY_OR_DRIFTED',
] as const;

export const PRE_COMMIT_FAILURE_CLASSES = [
  'PRE_TRANSACTION_SETUP_REJECTION',
  'IN_TRANSACTION_SERVER_REJECTION',
  'PRE_COMMIT_TRANSPORT_LOSS',
  'ROLLBACK_ACK_UNCERTAIN',
] as const;

export const PRE_COMMIT_FAILURE_ENTRY_NORMAL_STEPS = [3, 4, 5, 6, 7, 8, 9] as const;

export const FRESH_ACK_CLASSIFIER_LIFECYCLE_STEP_IDENTIFIERS = [
  'RUN_PRE_CONNECT_TARGET_IDENTITY_GATE',
  'RUN_PRE_CONNECTION_CLIENT_POLICY',
  'OPEN_FRESH_READ_ONLY_CLASSIFIER_CONNECTION',
  'RUN_POST_CONNECT_DATABASE_ROLE_GUARD',
  'ESTABLISH_EXPLICIT_READ_ONLY_CLASSIFIER_SESSION',
  'INSPECT_HISTORY_RELATION_AND_PREFIX',
  'EXECUTE_PRIOR_AND_NEXT_ORACLE_PHASE_PROBES',
  'INSPECT_CURRENT_AND_UNEXPECTED_DELTAS',
  'CLASSIFY_ACK_STATE',
  'APPLY_ACK_OUTCOME_DISPOSITION',
  'EMIT_CLASSIFICATION_EVIDENCE_NO_SECRETS',
  'CLOSE_CLASSIFIER_CONNECTION',
] as const;

export const FRESH_POST_COMMIT_VERIFICATION_LIFECYCLE_STEP_IDENTIFIERS = [
  'RUN_PRE_CONNECT_TARGET_IDENTITY_GATE',
  'RUN_PRE_CONNECTION_CLIENT_POLICY',
  'OPEN_FRESH_READ_ONLY_VERIFICATION_CONNECTION',
  'RUN_POST_CONNECT_DATABASE_ROLE_GUARD',
  'ESTABLISH_EXPLICIT_READ_ONLY_VERIFICATION_SESSION',
  'INSPECT_EXACT_HISTORY_RELATION_AND_NEXT_PREFIX',
  'EXECUTE_EXACT_NEXT_ORACLE_PHASE_PROBE',
  'INSPECT_UNEXPECTED_AND_CURRENT_VERSION_DELTAS',
  'REQUIRE_DEFINITELY_COMMITTED',
  'EMIT_NONSECRET_VERIFICATION_EVIDENCE',
  'CLOSE_VERIFICATION_CONNECTION',
  'EMIT_HUMAN_REVIEW_REQUIRED_OUTCOME',
] as const;

export const HEALTHY_CONNECTION_SERVER_REJECTION_STEPS = [
  'STOP_STATEMENT_STREAM_IMMEDIATELY',
  'PRESERVE_FIRST_ERROR_ONLY',
  'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
  'CLASSIFY_ROLLBACK_RESPONSE',
  'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
  'FORBID_SAME_RUN_RETRY',
  'INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
  'APPLY_ACK_OUTCOME_DISPOSITION_FOR_PRE_COMMIT_REJECTION',
] as const;

export const TRANSPORT_UNCERTAIN_ROLLBACK_STEPS = [
  'MARK_ORIGINAL_CONNECTION_UNUSABLE',
  'FORBID_FURTHER_COMMAND_ON_ORIGINAL_CONNECTION',
  'CLOSE_OR_RETIRE_CONNECTION_LOCALLY',
  'INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
] as const;

export const BEFORE_ACTIVE_TRANSACTION_STEPS = [
  'CLOSE_OR_RETIRE_CONNECTION',
  'EMIT_FIRST_ERROR_EVIDENCE_NO_SECRETS',
  'MANDATORY_STOP',
  'FORBID_SAME_RUN_RETRY',
  'HUMAN_REVIEW_REQUIRED_BEFORE_NEW_ATTEMPT',
] as const;

export type CommitResponseClass = (typeof COMMIT_RESPONSE_CLASSES)[number];
export type AckStateIdentifier = (typeof ACK_STATE_IDENTIFIERS)[number];
export type PreCommitFailureClass = (typeof PRE_COMMIT_FAILURE_CLASSES)[number];
export type LifecyclePhase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type P1AckPredicateFacts = {
  readonly historyRelationAbsent: boolean;
  readonly exactP0OraclePhase: boolean;
  readonly p1DeltaAbsent: boolean;
  readonly unexpectedDeltaZero: boolean;
  readonly targetIdentityExact: boolean;
  readonly historyRelationExact: boolean;
  readonly historyPrefixExactlyP1: boolean;
  readonly exactP1OraclePhase: boolean;
};

export type P2ThroughP7AckPredicateFacts = {
  readonly exactPriorHistoryPrefix: boolean;
  readonly exactPriorOraclePhase: boolean;
  readonly currentVersionDeltaAbsent: boolean;
  readonly unexpectedDeltaZero: boolean;
  readonly targetIdentityExact: boolean;
  readonly exactNextHistoryPrefix: boolean;
  readonly exactNextOraclePhase: boolean;
};

export type AckClassifierInput =
  | { readonly phase: 'P1'; readonly predicates: P1AckPredicateFacts }
  | { readonly phase: Exclude<LifecyclePhase, 'P1'>; readonly predicates: P2ThroughP7AckPredicateFacts };

export type AckClassifierResult = {
  readonly ackState: AckStateIdentifier;
  readonly disposition:
    | 'HUMAN_REVIEW_REQUIRED_FOR_RERUN'
    | 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION'
    | 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION'
    | 'MANDATORY_STOP';
  readonly sameRunRetryForbidden: true;
  readonly automaticNextVersionForbidden: true;
};

export type CommitResponseBranchInput = {
  readonly responseClass: CommitResponseClass;
  readonly originalConnectionClosed: boolean;
};

export type CommitResponseBranchResult = {
  readonly ok: boolean;
  readonly lifecycle?:
    | 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE'
    | 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE';
  readonly rejectionReason?: 'BRANCH_BEFORE_ORIGINAL_CLOSE_FORBIDDEN' | 'UNKNOWN_COMMIT_RESPONSE_CLASS';
};

export type PreCommitFailureDispositionInput = {
  readonly failureClass: PreCommitFailureClass;
  readonly attemptCommitAfterFailure?: boolean;
  readonly attemptContinuedExecution?: boolean;
  readonly attemptSameRunRetry?: boolean;
  readonly explicitReadOnlyClassifierSession?: boolean;
};

export type PreCommitFailureDisposition = {
  readonly ok: boolean;
  readonly rejectionReason?:
    | 'COMMIT_AFTER_PRE_COMMIT_FAILURE_FORBIDDEN'
    | 'CONTINUED_EXECUTION_AFTER_FIRST_ERROR_FORBIDDEN'
    | 'SAME_RUN_RETRY_FORBIDDEN'
    | 'EXPLICIT_READ_ONLY_CLASSIFIER_SESSION_REQUIRED'
    | 'UNKNOWN_PRE_COMMIT_FAILURE_CLASS';
  readonly orderedSteps: readonly string[];
  readonly mandatoryStop: boolean;
  readonly sameRunRetryForbidden: true;
  readonly invokeAckClassifierLifecycle: boolean;
  readonly commitForbidden: true;
};

export type RemoteExecutionLifecycleAuthorityDocument = {
  readonly identifier: typeof REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID;
  readonly execution_authorization: false;
  readonly orchestration_implemented: false;
  readonly revision7_contract_path: typeof REVISION7_CONTRACT_PATH;
  readonly revision7_contract_sha256: typeof REVISION7_CONTRACT_SHA256;
  readonly commit_response_classes: readonly CommitResponseClass[];
  readonly ack_classifiers: Record<string, unknown>;
  readonly commit_response_class_branches_after_step_12: Record<string, string>;
  readonly ack_state_readonly_classification_lifecycle: Record<string, unknown>;
  readonly post_commit_readonly_verification_lifecycle: Record<string, unknown>;
  readonly pre_commit_failure_handling_lifecycle: Record<string, unknown>;
  readonly authority_semantics_frozen: true;
};

export type RemoteExecutionLifecycleAuthorityValidationResult = {
  readonly ok: boolean;
  readonly mismatchCategories: readonly string[];
};

function stable(value: unknown): string {
  return canonicalSerializePreviewRemoteApply(value);
}

function evaluateP1NotCommitted(facts: P1AckPredicateFacts): boolean {
  return (
    facts.historyRelationAbsent &&
    facts.exactP0OraclePhase &&
    facts.p1DeltaAbsent &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

function evaluateP1Committed(facts: P1AckPredicateFacts): boolean {
  return (
    facts.historyRelationExact &&
    facts.historyPrefixExactlyP1 &&
    facts.exactP1OraclePhase &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

function evaluateP2ThroughP7NotCommitted(facts: P2ThroughP7AckPredicateFacts): boolean {
  return (
    facts.exactPriorHistoryPrefix &&
    facts.exactPriorOraclePhase &&
    facts.currentVersionDeltaAbsent &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

function evaluateP2ThroughP7Committed(facts: P2ThroughP7AckPredicateFacts): boolean {
  return (
    facts.exactNextHistoryPrefix &&
    facts.exactNextOraclePhase &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

function resolveAckDisposition(
  ackState: AckStateIdentifier,
  phase: LifecyclePhase,
): AckClassifierResult['disposition'] {
  if (ackState === 'DEFINITELY_NOT_COMMITTED') return 'HUMAN_REVIEW_REQUIRED_FOR_RERUN';
  if (ackState === 'CONTRADICTORY_OR_DRIFTED') return 'MANDATORY_STOP';
  return phase === 'P7' ? 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION' : 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION';
}

export function classifyAckState(input: AckClassifierInput): AckClassifierResult {
  let ackState: AckStateIdentifier;
  if (input.phase === 'P1') {
    const notCommitted = evaluateP1NotCommitted(input.predicates);
    const committed = evaluateP1Committed(input.predicates);
    if (notCommitted && !committed) ackState = 'DEFINITELY_NOT_COMMITTED';
    else if (committed && !notCommitted) ackState = 'DEFINITELY_COMMITTED';
    else ackState = 'CONTRADICTORY_OR_DRIFTED';
  } else {
    const notCommitted = evaluateP2ThroughP7NotCommitted(input.predicates);
    const committed = evaluateP2ThroughP7Committed(input.predicates);
    if (notCommitted && !committed) ackState = 'DEFINITELY_NOT_COMMITTED';
    else if (committed && !notCommitted) ackState = 'DEFINITELY_COMMITTED';
    else ackState = 'CONTRADICTORY_OR_DRIFTED';
  }
  return {
    ackState,
    disposition: resolveAckDisposition(ackState, input.phase),
    sameRunRetryForbidden: true,
    automaticNextVersionForbidden: true,
  };
}

export function branchAfterCommitResponseClass(input: CommitResponseBranchInput): CommitResponseBranchResult {
  if (!input.originalConnectionClosed) {
    return { ok: false, rejectionReason: 'BRANCH_BEFORE_ORIGINAL_CLOSE_FORBIDDEN' };
  }
  switch (input.responseClass) {
    case 'DEFINITIVE_COMMIT_ACK':
      return { ok: true, lifecycle: 'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE' };
    case 'ACK_UNCERTAIN_OR_MISSING':
    case 'DEFINITIVE_TRANSACTION_REJECTION':
      return { ok: true, lifecycle: 'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE' };
    default:
      return { ok: false, rejectionReason: 'UNKNOWN_COMMIT_RESPONSE_CLASS' };
  }
}

export function buildPreCommitFailureDisposition(
  input: PreCommitFailureDispositionInput,
): PreCommitFailureDisposition {
  if (input.attemptCommitAfterFailure) {
    return {
      ok: false,
      rejectionReason: 'COMMIT_AFTER_PRE_COMMIT_FAILURE_FORBIDDEN',
      orderedSteps: [],
      mandatoryStop: true,
      sameRunRetryForbidden: true,
      invokeAckClassifierLifecycle: false,
      commitForbidden: true,
    };
  }
  if (input.attemptContinuedExecution) {
    return {
      ok: false,
      rejectionReason: 'CONTINUED_EXECUTION_AFTER_FIRST_ERROR_FORBIDDEN',
      orderedSteps: [],
      mandatoryStop: true,
      sameRunRetryForbidden: true,
      invokeAckClassifierLifecycle: false,
      commitForbidden: true,
    };
  }
  if (input.attemptSameRunRetry) {
    return {
      ok: false,
      rejectionReason: 'SAME_RUN_RETRY_FORBIDDEN',
      orderedSteps: [],
      mandatoryStop: true,
      sameRunRetryForbidden: true,
      invokeAckClassifierLifecycle: false,
      commitForbidden: true,
    };
  }

  const invokeAckClassifierLifecycle =
    input.failureClass === 'IN_TRANSACTION_SERVER_REJECTION' ||
    input.failureClass === 'PRE_COMMIT_TRANSPORT_LOSS' ||
    input.failureClass === 'ROLLBACK_ACK_UNCERTAIN';

  if (invokeAckClassifierLifecycle && input.explicitReadOnlyClassifierSession !== true) {
    return {
      ok: false,
      rejectionReason: 'EXPLICIT_READ_ONLY_CLASSIFIER_SESSION_REQUIRED',
      orderedSteps: [],
      mandatoryStop: true,
      sameRunRetryForbidden: true,
      invokeAckClassifierLifecycle: true,
      commitForbidden: true,
    };
  }

  switch (input.failureClass) {
    case 'PRE_TRANSACTION_SETUP_REJECTION':
      return {
        ok: true,
        orderedSteps: BEFORE_ACTIVE_TRANSACTION_STEPS,
        mandatoryStop: true,
        sameRunRetryForbidden: true,
        invokeAckClassifierLifecycle: false,
        commitForbidden: true,
      };
    case 'IN_TRANSACTION_SERVER_REJECTION':
      return {
        ok: true,
        orderedSteps: HEALTHY_CONNECTION_SERVER_REJECTION_STEPS,
        mandatoryStop: true,
        sameRunRetryForbidden: true,
        invokeAckClassifierLifecycle: true,
        commitForbidden: true,
      };
    case 'PRE_COMMIT_TRANSPORT_LOSS':
    case 'ROLLBACK_ACK_UNCERTAIN':
      return {
        ok: true,
        orderedSteps: TRANSPORT_UNCERTAIN_ROLLBACK_STEPS,
        mandatoryStop: true,
        sameRunRetryForbidden: true,
        invokeAckClassifierLifecycle: true,
        commitForbidden: true,
      };
    default:
      return {
        ok: false,
        rejectionReason: 'UNKNOWN_PRE_COMMIT_FAILURE_CLASS',
        orderedSteps: [],
        mandatoryStop: true,
        sameRunRetryForbidden: true,
        invokeAckClassifierLifecycle: false,
        commitForbidden: true,
      };
  }
}

export function getFreshAckClassifierLifecycle(): readonly string[] {
  return FRESH_ACK_CLASSIFIER_LIFECYCLE_STEP_IDENTIFIERS;
}

export function getFreshPostCommitVerificationLifecycle(): readonly string[] {
  return FRESH_POST_COMMIT_VERIFICATION_LIFECYCLE_STEP_IDENTIFIERS;
}


export const EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_BINDING = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1.json',
  revision7_contract_path: REVISION7_CONTRACT_PATH,
  revision7_contract_sha256: REVISION7_CONTRACT_SHA256,
  commit_response_classes: [...COMMIT_RESPONSE_CLASSES],
  ack_state_identifiers: [...ACK_STATE_IDENTIFIERS],
  pre_commit_failure_classes: [...PRE_COMMIT_FAILURE_CLASSES],
  pre_commit_failure_entry_normal_steps: [...PRE_COMMIT_FAILURE_ENTRY_NORMAL_STEPS],
  fresh_ack_classifier_lifecycle: [...FRESH_ACK_CLASSIFIER_LIFECYCLE_STEP_IDENTIFIERS],
  fresh_post_commit_verification_lifecycle: [...FRESH_POST_COMMIT_VERIFICATION_LIFECYCLE_STEP_IDENTIFIERS],
  commit_response_class_branches_after_step_12: {
    DEFINITIVE_COMMIT_ACK: 'post_commit_readonly_verification_lifecycle',
    ACK_UNCERTAIN_OR_MISSING: 'ack_state_readonly_classification_lifecycle',
    DEFINITIVE_TRANSACTION_REJECTION: 'ack_state_readonly_classification_lifecycle',
  },
  authority_semantics_frozen: true,
  orchestration_implemented: false,
  execution_authorized: false,
} as const;

export const EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY = {
  "identifier": "M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1",
  "execution_authorization": false,
  "orchestration_implemented": false,
  "revision7_contract_path": "docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json",
  "revision7_contract_sha256": "d6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c",
  "commit_response_classes": [
    "DEFINITIVE_COMMIT_ACK",
    "ACK_UNCERTAIN_OR_MISSING",
    "DEFINITIVE_TRANSACTION_REJECTION"
  ],
  "ack_classifiers": {
    "identifiers": [
      "DEFINITELY_NOT_COMMITTED",
      "DEFINITELY_COMMITTED",
      "CONTRADICTORY_OR_DRIFTED"
    ],
    "rules": {
      "no_blind_retry": true,
      "no_automatic_retry": true,
      "no_silent_skip": true,
      "only_DEFINITELY_NOT_COMMITTED_may_be_human_approved_rerun_candidate": true,
      "every_other_state_is_CONTRADICTORY_OR_DRIFTED_and_mandatory_STOP": true,
      "ack_outcome_disposition_required": true,
      "same_run_retry_forbidden": true,
      "automatic_next_version_forbidden": true,
      "DEFINITELY_COMMITTED_requires_human_review_not_automatic_advance": true
    },
    "predicates": {
      "P1": {
        "DEFINITELY_NOT_COMMITTED": {
          "all_required": [
            "history_relation_absent",
            "exact_P0_oracle_phase",
            "P1_delta_absent",
            "unexpected_delta_zero",
            "target_identity_exact"
          ]
        },
        "DEFINITELY_COMMITTED": {
          "all_required": [
            "history_relation_exact",
            "history_prefix_exactly_20260614000000",
            "exact_P1_oracle_phase",
            "unexpected_delta_zero",
            "target_identity_exact"
          ]
        }
      },
      "P2_through_P7": {
        "DEFINITELY_NOT_COMMITTED": {
          "all_required": [
            "exact_prior_history_prefix",
            "exact_prior_oracle_phase",
            "current_version_delta_absent",
            "unexpected_delta_zero",
            "target_identity_exact"
          ]
        },
        "DEFINITELY_COMMITTED": {
          "all_required": [
            "exact_next_history_prefix",
            "exact_next_oracle_phase",
            "unexpected_delta_zero",
            "target_identity_exact"
          ]
        }
      },
      "CONTRADICTORY_OR_DRIFTED": {
        "definition": "any_state_not_matching_DEFINITELY_NOT_COMMITTED_or_DEFINITELY_COMMITTED_predicates",
        "mandatory_STOP": true
      }
    },
    "p1_prior_state_reference": {
      "history_relation_absent": true,
      "exact_p0_catalog": true
    },
    "p2_through_p7_prior_state_reference": {
      "exact_prior_history_prefix": true,
      "exact_prior_phase": true
    }
  },
  "commit_response_class_branches_after_step_12": {
    "DEFINITIVE_COMMIT_ACK": "post_commit_readonly_verification_lifecycle",
    "ACK_UNCERTAIN_OR_MISSING": "ack_state_readonly_classification_lifecycle",
    "DEFINITIVE_TRANSACTION_REJECTION": "ack_state_readonly_classification_lifecycle"
  },
  "ack_state_readonly_classification_lifecycle": {
    "separate_from_normal_12_step_lifecycle": true,
    "read_only_only": true,
    "transport_error_timeout_missing_commit_ack_not_proof_of_rollback": true,
    "no_connection_before_pre_connect_target_pass": true,
    "classifier_session_must_be_explicitly_read_only": true,
    "no_ddl_dml_history_mutation": true,
    "ordered_steps": [
      {
        "step": 1,
        "identifier": "RUN_PRE_CONNECT_TARGET_IDENTITY_GATE",
        "description": "Run PRE_CONNECT_TARGET_IDENTITY_GATE before any new connection (mutation connection already closed in normal step 12)."
      },
      {
        "step": 2,
        "identifier": "RUN_PRE_CONNECTION_CLIENT_POLICY",
        "description": "Apply PRE_CONNECTION_CLIENT_POLICY bounded connect timeout before opening verification or classifier connection."
      },
      {
        "step": 3,
        "identifier": "OPEN_FRESH_READ_ONLY_CLASSIFIER_CONNECTION",
        "description": "Open fresh read-only classifier connection only after pre-connect and pre-connection client policy PASS."
      },
      {
        "step": 4,
        "identifier": "RUN_POST_CONNECT_DATABASE_ROLE_GUARD",
        "description": "Run post-connect database/current_user guard (postgres/postgres, read-only probes)."
      },
      {
        "step": 5,
        "identifier": "ESTABLISH_EXPLICIT_READ_ONLY_CLASSIFIER_SESSION",
        "description": "Establish an explicitly read-only classifier session."
      },
      {
        "step": 6,
        "identifier": "INSPECT_HISTORY_RELATION_AND_PREFIX",
        "description": "Inspect exact history relation and prefix."
      },
      {
        "step": 7,
        "identifier": "EXECUTE_PRIOR_AND_NEXT_ORACLE_PHASE_PROBES",
        "description": "Execute exact prior and next Oracle phase probes."
      },
      {
        "step": 8,
        "identifier": "INSPECT_CURRENT_AND_UNEXPECTED_DELTAS",
        "description": "Inspect current-version and unexpected deltas."
      },
      {
        "step": 9,
        "identifier": "CLASSIFY_ACK_STATE",
        "description": "Classify DEFINITELY_NOT_COMMITTED, DEFINITELY_COMMITTED, or CONTRADICTORY_OR_DRIFTED."
      },
      {
        "step": 10,
        "identifier": "APPLY_ACK_OUTCOME_DISPOSITION",
        "description": "Apply ack_outcome_disposition; no same-run retry or automatic next version."
      },
      {
        "step": 11,
        "identifier": "EMIT_CLASSIFICATION_EVIDENCE_NO_SECRETS",
        "description": "Emit disposition evidence without secrets."
      },
      {
        "step": 12,
        "identifier": "CLOSE_CLASSIFIER_CONNECTION",
        "description": "Close classifier connection."
      }
    ],
    "identifier": "ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE",
    "renamed_from": "ack_uncertain_recovery_lifecycle",
    "branch_entry_after_normal_step_12_only": true,
    "ack_outcome_disposition": {
      "DEFINITELY_NOT_COMMITTED": {
        "disposition": "HUMAN_REVIEW_REQUIRED_FOR_RERUN",
        "same_run_retry_forbidden": true,
        "automatic_next_version_forbidden": true,
        "automatic_rerun_forbidden": true
      },
      "DEFINITELY_COMMITTED": {
        "P1_through_P6": "HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION",
        "P7": "HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION",
        "same_run_retry_forbidden": true,
        "automatic_next_version_forbidden": true
      },
      "CONTRADICTORY_OR_DRIFTED": {
        "mandatory_STOP": true
      }
    },
    "orchestration_implemented": false,
    "execution_authorized": false,
    "runtime_probe_status": "REQUIRED_NOT_IMPLEMENTED"
  },
  "post_commit_readonly_verification_lifecycle": {
    "identifier": "POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE",
    "separate_from_normal_12_step_lifecycle": true,
    "mandatory_after_definitive_commit_before_next_version": true,
    "read_only_only": true,
    "mutation_on_verification_connection_forbidden": true,
    "in_transaction_verification_necessary_not_sufficient": true,
    "successful_commit_response_alone_does_not_authorize_next_version": true,
    "runtime_probe_status": "REQUIRED_NOT_IMPLEMENTED",
    "next_version_authorization": false,
    "ordered_steps": [
      {
        "step": 1,
        "identifier": "RUN_PRE_CONNECT_TARGET_IDENTITY_GATE",
        "description": "Run PRE_CONNECT_TARGET_IDENTITY_GATE before any new connection (mutation connection already closed in normal step 12)."
      },
      {
        "step": 2,
        "identifier": "RUN_PRE_CONNECTION_CLIENT_POLICY",
        "description": "Apply PRE_CONNECTION_CLIENT_POLICY bounded connect timeout before opening verification or classifier connection."
      },
      {
        "step": 3,
        "identifier": "OPEN_FRESH_READ_ONLY_VERIFICATION_CONNECTION",
        "description": "Open a fresh read-only verification connection."
      },
      {
        "step": 4,
        "identifier": "RUN_POST_CONNECT_DATABASE_ROLE_GUARD",
        "description": "Run post-connect database/current_user guard (postgres/postgres, read-only probes)."
      },
      {
        "step": 5,
        "identifier": "ESTABLISH_EXPLICIT_READ_ONLY_VERIFICATION_SESSION",
        "description": "Establish an explicitly read-only verification transaction/session."
      },
      {
        "step": 6,
        "identifier": "INSPECT_EXACT_HISTORY_RELATION_AND_NEXT_PREFIX",
        "description": "Inspect exact history relation and exact next prefix."
      },
      {
        "step": 7,
        "identifier": "EXECUTE_EXACT_NEXT_ORACLE_PHASE_PROBE",
        "description": "Execute exact next Oracle phase probe."
      },
      {
        "step": 8,
        "identifier": "INSPECT_UNEXPECTED_AND_CURRENT_VERSION_DELTAS",
        "description": "Inspect unexpected and current-version deltas."
      },
      {
        "step": 9,
        "identifier": "REQUIRE_DEFINITELY_COMMITTED",
        "description": "Require DEFINITELY_COMMITTED predicate match."
      },
      {
        "step": 10,
        "identifier": "EMIT_NONSECRET_VERIFICATION_EVIDENCE",
        "description": "Emit nonsecret verification evidence."
      },
      {
        "step": 11,
        "identifier": "CLOSE_VERIFICATION_CONNECTION",
        "description": "Close verification connection."
      },
      {
        "step": 12,
        "identifier": "EMIT_HUMAN_REVIEW_REQUIRED_OUTCOME",
        "description": "Emit HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION (P1-P6) or HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION (P7); does not authorize automatic next version."
      }
    ],
    "branch_entry_after_normal_step_12_only": true,
    "post_commit_outcome_disposition": {
      "success": {
        "P1_through_P6": "HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION",
        "P7": "HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION",
        "emit_step_identifier": "EMIT_HUMAN_REVIEW_REQUIRED_OUTCOME"
      },
      "failure": {
        "CONTRADICTORY_OR_DRIFTED": {
          "mandatory_STOP": true
        }
      }
    },
    "orchestration_implemented": false,
    "execution_authorized": false
  },
  "pre_commit_failure_handling_lifecycle": {
    "identifier": "PRE_COMMIT_FAILURE_HANDLING_LIFECYCLE",
    "separate_from_normal_12_step_lifecycle": true,
    "commit_once_forbidden_after_prior_failure": true,
    "continued_execution_after_first_error_forbidden": true,
    "same_run_retry_forbidden": true,
    "failure_entry_normal_lifecycle_steps": [
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ],
    "failure_classes": [
      "PRE_TRANSACTION_SETUP_REJECTION",
      "IN_TRANSACTION_SERVER_REJECTION",
      "PRE_COMMIT_TRANSPORT_LOSS",
      "ROLLBACK_ACK_UNCERTAIN"
    ],
    "before_active_transaction": {
      "no_migration_or_history_mutation_allowed": true,
      "close_or_retire_connection_required": true,
      "emit_step_identifier": "EMIT_FIRST_ERROR_EVIDENCE_NO_SECRETS",
      "mandatory_stop": true,
      "same_run_retry_forbidden": true,
      "human_review_required_before_new_attempt": true
    },
    "healthy_connection_server_rejection": {
      "ordered_steps": [
        {
          "step": 1,
          "identifier": "STOP_STATEMENT_STREAM_IMMEDIATELY"
        },
        {
          "step": 2,
          "identifier": "PRESERVE_FIRST_ERROR_ONLY"
        },
        {
          "step": 3,
          "identifier": "ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE"
        },
        {
          "step": 4,
          "identifier": "CLASSIFY_ROLLBACK_RESPONSE"
        },
        {
          "step": 5,
          "identifier": "CLOSE_OR_RETIRE_ORIGINAL_CONNECTION"
        },
        {
          "step": 6,
          "identifier": "FORBID_SAME_RUN_RETRY"
        },
        {
          "step": 7,
          "identifier": "INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE"
        },
        {
          "step": 8,
          "identifier": "APPLY_ACK_OUTCOME_DISPOSITION_FOR_PRE_COMMIT_REJECTION"
        }
      ],
      "only_definitely_not_committed_may_emit_human_review_required_for_rerun": true,
      "any_other_state_is_contradictory_or_drifted_and_stop": true
    },
    "transport_or_uncertain_rollback_acknowledgement": {
      "driver_error_does_not_prove_rollback": true,
      "ordered_steps": [
        {
          "step": 1,
          "identifier": "MARK_ORIGINAL_CONNECTION_UNUSABLE"
        },
        {
          "step": 2,
          "identifier": "FORBID_FURTHER_COMMAND_ON_ORIGINAL_CONNECTION"
        },
        {
          "step": 3,
          "identifier": "CLOSE_OR_RETIRE_CONNECTION_LOCALLY"
        },
        {
          "step": 4,
          "identifier": "INVOKE_ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE"
        }
      ]
    },
    "runtime_probe_status": "REQUIRED_NOT_IMPLEMENTED",
    "canonical_state_classifier_reference": "ack_state_readonly_classification_lifecycle",
    "partial_classifier_implementation_forbidden": true,
    "post_connect_target_guard_required_in_classifier": true,
    "explicit_read_only_session_required_in_classifier": true,
    "orchestration_implemented": false,
    "execution_authorized": false
  },
  "authority_semantics_frozen": true
} as const;

function validateBooleanFlagsFalseEverywhere(value: unknown, path: string, mismatches: string[]): void {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (key === 'execution_authorized' || key === 'orchestration_implemented') {
      if (nested !== false) mismatches.push(`${nextPath}:must_be_false`);
    }
    if (typeof nested === 'object' && nested !== null) {
      validateBooleanFlagsFalseEverywhere(nested, nextPath, mismatches);
    }
  }
}

function collectSemanticDrift(
  actual: unknown,
  expected: unknown,
  path: string,
  mismatches: string[],
): void {
  if (stable(actual) === stable(expected)) return;
  if (
    actual === null ||
    expected === null ||
    typeof actual !== 'object' ||
    typeof expected !== 'object'
  ) {
    mismatches.push(`${path}:drift`);
    return;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) mismatches.push(`${path}:array_length`);
    const limit = Math.max(actual.length, expected.length);
    for (let index = 0; index < limit; index += 1) {
      collectSemanticDrift(actual[index], expected[index], `${path}[${index}]`, mismatches);
    }
    return;
  }
  if (Array.isArray(actual) !== Array.isArray(expected)) {
    mismatches.push(`${path}:type_mismatch`);
    return;
  }
  const actualRecord = actual as Record<string, unknown>;
  const expectedRecord = expected as Record<string, unknown>;
  const actualKeys = Object.keys(actualRecord).sort();
  const expectedKeys = Object.keys(expectedRecord).sort();
  if (stable(actualKeys) !== stable(expectedKeys)) mismatches.push(`${path}:keys`);
  for (const key of new Set([...actualKeys, ...expectedKeys])) {
    if (!(key in expectedRecord)) mismatches.push(`${path}.${key}:extra_key`);
    else if (!(key in actualRecord)) mismatches.push(`${path}.${key}:missing_key`);
    else collectSemanticDrift(actualRecord[key], expectedRecord[key], `${path}.${key}`, mismatches);
  }
}

export function validateRemoteExecutionLifecycleAuthorityDocument(
  document: RemoteExecutionLifecycleAuthorityDocument,
): RemoteExecutionLifecycleAuthorityValidationResult {
  const mismatches: string[] = [];

  if (stable(document) !== stable(EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY)) {
    mismatches.push('document:exact_semantic_mismatch');
    collectSemanticDrift(document, EXPECTED_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY, 'document', mismatches);
  }

  validateBooleanFlagsFalseEverywhere(document, 'document', mismatches);

  return {
    ok: mismatches.length === 0,
    mismatchCategories: [...new Set(mismatches)],
  };
}
