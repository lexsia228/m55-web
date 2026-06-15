import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { splitAndTrim } from './splitAndTrim.ts';
import {
  applyOptionARemoval,
  buildPolicy2HistoryPayload,
  compareStatementSnippetToEvidence,
  compositeStreamSha256,
  removedOrdinalsForLabel,
  statementSha256,
  statementUtf8ByteLength,
  type Policy2HistoryPayload,
  type VersionLabel,
} from './statementStream.ts';

export const STAGE_A_MODE = 'PLAN_ONLY' as const;

export const STAGE_A_EXECUTION_LOCK = {
  dbTransportUnavailable: true,
  localExecutionUnavailable: true,
  remoteExecutionUnavailable: true,
  executionAuthorization: false,
  implementationPureCoreOnly: true,
} as const;

export const AUTHORITY_CONTRACT_REL_PATH =
  'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json';
export const AUTHORITY_MATRIX_REL_PATH =
  'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json';
export const AUTHORITY_PARSER_EVIDENCE_REL_PATH =
  'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZATION_EXACT_PARSER_EVIDENCE.json';

export const EXPECTED_REPO_ROOT = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1' as const;
export const EXPECTED_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;
export const EXPECTED_SOURCE_AUTHORITY_BASE =
  'ceee04aab0a94376a55a576900cb2f8d597c19f4' as const;
/** @deprecated use EXPECTED_SOURCE_AUTHORITY_BASE — preserved alias for Revision-7 parity */
export const EXPECTED_SOURCE_AUTHORITY_HEAD = EXPECTED_SOURCE_AUTHORITY_BASE;

export const BASELINE_STAGE_A_COMMIT =
  '66b6bf2431b979b777d63f7d4b2b5c5c2a4a3bdc' as const;

export const STAGE_A_BINDING_ADDENDUM_REL_PATH =
  'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZED_STAGE_A_BINDING_v1.json' as const;

export const BINDING_POLICY_IDENTIFIER = 'stage_a_ancestor_and_protected_file_v1' as const;

export const PLAN_ONLY_EXTERNAL_ATTESTATION_HOLD = 'PLAN_ONLY_EXTERNAL_ATTESTATION_REQUIRED' as const;

export const GEN1_REBIND_CORE_REL_PATH = 'lib/m55/transactionNormalized/transactionNormalizedCore.ts' as const;
export const GEN1_REBIND_CLI_REL_PATH = 'scripts/m55/runTransactionNormalizedPlan.ts' as const;
export const GEN1_REVIEW_TEST_REL_PATH = 'lib/m55/transactionNormalized.core.local.test.ts' as const;

export const GEN0_IMMUTABLE_RUNTIME_REL_PATHS = [
  AUTHORITY_CONTRACT_REL_PATH,
  AUTHORITY_MATRIX_REL_PATH,
  AUTHORITY_PARSER_EVIDENCE_REL_PATH,
  'lib/m55/transactionNormalized/splitAndTrim.ts',
  'lib/m55/transactionNormalized/statementStream.ts',
] as const;

export type ExpectedBindingFileIdentity = {
  path: string;
  bytes: number;
  sha256: string;
  classification: string;
};

export const EXPECTED_GENERATION0_BASELINE_IDENTITIES: readonly ExpectedBindingFileIdentity[] = [
  {
    path: AUTHORITY_CONTRACT_REL_PATH,
    bytes: 309607,
    sha256: 'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c',
    classification: 'authority_contract',
  },
  {
    path: AUTHORITY_MATRIX_REL_PATH,
    bytes: 110904,
    sha256: '6d677b02ff9c73591cbea151444d5dc61ea766bda7ed6cd0598e63ad16ca9f93',
    classification: 'authority_matrix',
  },
  {
    path: AUTHORITY_PARSER_EVIDENCE_REL_PATH,
    bytes: 208050,
    sha256: 'bd05c68a337abbe5a29dff04d8d1e46ca3509f664e9b2d0d89959c387d822442',
    classification: 'authority_parser_evidence',
  },
  {
    path: 'lib/m55/transactionNormalized/splitAndTrim.ts',
    bytes: 9803,
    sha256: '404feb5c68a656aebed29cfc81d80d49a22cc2812589d36ce148f1491d855b04',
    classification: 'parser_port',
  },
  {
    path: 'lib/m55/transactionNormalized/statementStream.ts',
    bytes: 4060,
    sha256: '1a3faaeed3eaefb25e5b5cedb7ece422d537126caef2eaf17a8c10c794953a13',
    classification: 'statement_stream',
  },
  {
    path: GEN1_REBIND_CORE_REL_PATH,
    bytes: 72195,
    sha256: '48f45dc6136ccb71c06e80c1631e995f416be778af82afd7daf7fa351e506ff7',
    classification: 'baseline_core',
  },
  {
    path: GEN1_REVIEW_TEST_REL_PATH,
    bytes: 51580,
    sha256: 'd38cfeae877876ad4d45862f8aa22d52c3d47e4f2b762639a2dfc70f447a621c',
    classification: 'baseline_test',
  },
  {
    path: GEN1_REBIND_CLI_REL_PATH,
    bytes: 3791,
    sha256: '7d88446115941337ed45cdcee2075beeb513dfc8203ff5a53a8ed903aec75d9b',
    classification: 'baseline_plan_cli',
  },
] as const;

export const EXPECTED_GEN1_REBIND_MUTABLE_CLASSIFICATIONS = {
  core: 'rebind_core',
  cli: 'rebind_plan_cli',
  review: 'rebind_test_review_evidence',
} as const;

export const APPROVED_PREVIEW_ORGANIZATION = 'm55-preview' as const;
export const APPROVED_PREVIEW_PROJECT = 'm55-soul-preview' as const;
export const FORBIDDEN_PRODUCTION_ORGANIZATION = 'm55-soul' as const;
export const FORBIDDEN_PRODUCTION_PROJECT = 'm55-soul-core' as const;
export const FINGERPRINT_PLACEHOLDER = 'REQUIRED_NOT_FROZEN' as const;

export const AUTHORITY_FILE_EXPECTATIONS = {
  contract: {
    bytes: 309607,
    sha256: 'ad429820c689c58db5d29d7d772db2fd9ad13b6e05bb30ca1a65ca0e6de33ba0',
    classification: 'authority_contract',
  },
  matrix: {
    bytes: 110904,
    sha256: '0c56313c3df157f81552eb21ebbfcd87a9c1ad04f1f5cdb4fa999909ef6b000f',
    classification: 'authority_matrix',
  },
  parserEvidence: {
    bytes: 208072,
    sha256: '65df70ae620da0a44e3adabf929fd369b3d4f8d580aab73c08c37290e188c927',
    classification: 'authority_parser_evidence',
  },
} as const;

export const EXPECTED_IMMUTABLE_CARRY_FORWARD_IDENTITIES: readonly ExpectedBindingFileIdentity[] = [
  {
    path: AUTHORITY_CONTRACT_REL_PATH,
    bytes: AUTHORITY_FILE_EXPECTATIONS.contract.bytes,
    sha256: AUTHORITY_FILE_EXPECTATIONS.contract.sha256,
    classification: 'authority_contract',
  },
  {
    path: AUTHORITY_MATRIX_REL_PATH,
    bytes: AUTHORITY_FILE_EXPECTATIONS.matrix.bytes,
    sha256: AUTHORITY_FILE_EXPECTATIONS.matrix.sha256,
    classification: 'authority_matrix',
  },
  {
    path: AUTHORITY_PARSER_EVIDENCE_REL_PATH,
    bytes: AUTHORITY_FILE_EXPECTATIONS.parserEvidence.bytes,
    sha256: AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256,
    classification: 'authority_parser_evidence',
  },
  EXPECTED_GENERATION0_BASELINE_IDENTITIES[3]!,
  EXPECTED_GENERATION0_BASELINE_IDENTITIES[4]!,
];

export type PlanVersionSelector =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'ALL';

export type ExecutionVersionSelector = VersionLabel;

export type TransactionNormalizedPlanInput = {
  repoRoot: string;
  planVersionSelector: PlanVersionSelector;
};

export type PureCoreValidationOutcome =
  | 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY'
  | 'PRE_DB_HOLD';

export type StructuralValidationOutcome = 'PLAN_STRUCTURE_VALIDATED';

export type PureOutcome =
  | 'PLAN_ONLY_PASS'
  | 'PLAN_STRUCTURE_VALIDATED'
  | 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED'
  | 'PRE_DB_HOLD'
  | 'EXECUTION_LOCKED'
  | 'DEFINITELY_NOT_COMMITTED'
  | 'DEFINITELY_COMMITTED'
  | 'CONTRADICTORY_OR_DRIFTED'
  | 'HUMAN_REVIEW_REQUIRED_FOR_RERUN'
  | 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION'
  | 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION';

export const LIFECYCLE_STEP_IDENTIFIERS = [
  'CREATE_FRESH_CONNECTION',
  'TARGET_ROLE_GUARD',
  'BOUNDED_SESSION_SETTINGS',
  'BEGIN_EXECUTOR_OWNED_TRANSACTION',
  'P1_HISTORY_BOOTSTRAP_IN_TRANSACTION',
  'EXECUTE_NORMALIZED_STATEMENTS',
  'EXECUTE_NARROW_POSTCONDITIONS',
  'INSERT_EXACT_HISTORY_ROW',
  'VERIFY_HISTORY_PREFIX_AND_PHASE',
  'COMMIT_ONCE',
  'CLASSIFY_COMMIT_RESPONSE_CLASS',
  'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
] as const;

export const REVISION7_LIFECYCLE_IDENTIFIERS = [
  'PRE_COMMIT_FAILURE_HANDLING_LIFECYCLE',
  'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
  'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE',
  'PRE_COMMIT_FAILURE_DOMAIN_REGISTRY',
] as const;

export const PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS = [
  'PRE_CONNECT_TARGET_IDENTITY_GATE_FAILURE',
  'PRE_CONNECTION_CLIENT_POLICY_FAILURE',
  'CREATE_FRESH_CONNECTION_FAILURE',
  'TARGET_ROLE_GUARD_REJECTION',
  'BOUNDED_SESSION_SETTINGS_REJECTION',
  'BEGIN_EXECUTOR_OWNED_TRANSACTION_REJECTION',
  'BEGIN_EXECUTOR_OWNED_TRANSACTION_UNCERTAINTY',
  'PRE_MUTATION_PRIOR_STATE_GATE_FAILURE',
  'P1_HISTORY_BOOTSTRAP_IN_TRANSACTION_FAILURE',
  'EXECUTE_NORMALIZED_STATEMENTS_FAILURE',
  'EXECUTE_NARROW_POSTCONDITIONS_FAILURE',
  'INSERT_EXACT_HISTORY_ROW_FAILURE',
  'VERIFY_HISTORY_PREFIX_AND_PHASE_FAILURE',
  'PRE_COMMIT_TRANSPORT_LOSS',
  'ROLLBACK_ACK_UNCERTAIN',
] as const;

export type PreCommitFailureEvent = (typeof PRE_COMMIT_FAILURE_DOMAIN_EVENT_IDENTIFIERS)[number];

export const ACK_CLASSIFIER_IDENTIFIERS = [
  'DEFINITELY_NOT_COMMITTED',
  'DEFINITELY_COMMITTED',
  'CONTRADICTORY_OR_DRIFTED',
] as const;

export type AckClassifier = (typeof ACK_CLASSIFIER_IDENTIFIERS)[number];

export const P7_CHAIN_COMPLETION_TERMINAL = 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION' as const;

export type TransactionStateClass =
  | 'NO_CONNECTION_ESTABLISHED'
  | 'CONNECTED_NO_ACTIVE_TRANSACTION'
  | 'TRANSACTION_STATE_UNCERTAIN'
  | 'TRANSACTION_ACTIVE'
  | 'TRANSACTION_ACTIVE_OR_UNCERTAIN';

export type FailureDomainBehavior = {
  eventIdentifier: PreCommitFailureEvent;
  lifecycleGateSource: string;
  transactionStateClass: TransactionStateClass;
  originalConnectionDisposition: string;
  rollbackAction: string;
  classifierRequired: boolean;
  terminalOutcome: string;
  sameRunRetry: false;
  firstErrorTerminal: true;
  automaticRetry: false;
  automaticNextVersion: false;
  commitAllowedAfterFailure: false;
};

export type P1AckFacts = {
  historyRelationAbsent: boolean;
  historyRelationExact: boolean;
  historyPrefixExactlyP1: boolean;
  exactP0OraclePhase: boolean;
  exactP1OraclePhase: boolean;
  p1DeltaAbsent: boolean;
  unexpectedDeltaZero: boolean;
  targetIdentityExact: boolean;
};

export type P2ThroughP7AckFacts = {
  exactPriorHistoryPrefix: boolean;
  exactNextHistoryPrefix: boolean;
  exactPriorOraclePhase: boolean;
  exactNextOraclePhase: boolean;
  currentVersionDeltaAbsent: boolean;
  unexpectedDeltaZero: boolean;
  targetIdentityExact: boolean;
};

export const SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER =
  'source_authority_head_rebind_contract_revision_required' as const;

export const STAGE_B_EXECUTION_BLOCKERS = [
  'approved_preview_target_fingerprint',
  'executor_artifact_identity',
  'execution_package_identity',
  'exact_connect_timeout_value',
  'pre_commit_failure_runtime_probe_status',
  'pre_mutation_prior_state_gate_runtime_probe_status',
  'policy_2_statements_text_array_exact_bytes_contract',
  'p1_bootstrap_ddl_text_binding',
  'in_transaction_oracle_narrow_postcondition_probes',
  'post_commit_readonly_verification_lifecycle_implementation',
  'commit_acknowledgement_probe_implementation',
  'target_identity_fail_closed_dual_channel_guard',
  'post_connect_identity_probe_implementation',
  'db_transport_binding',
] as const;

export const STAGE_B_BLOCKERS = [
  ...STAGE_B_EXECUTION_BLOCKERS,
  SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER,
] as const;

export interface DbTransport {
  readonly __stageBOnly: unique symbol;
}

export interface ReadOnlyPhaseProbe {
  readonly __stageBOnly: unique symbol;
}

export interface HistoryStore {
  readonly __stageBOnly: unique symbol;
}

export interface TargetIdentityProbe {
  readonly __stageBOnly: unique symbol;
}

export interface CommitResponseClassifier {
  readonly __stageBOnly: unique symbol;
}

export type WorkspaceFacts = {
  branch: string;
  head: string;
  cleanWorktree: boolean;
  cleanIndex: boolean;
  repoRoot?: string;
};

type AuthorityBundle = {
  contract: ContractAuthority;
  matrix: MatrixAuthority;
  parserEvidence: ParserEvidenceAuthority;
};

type ContractVersion = {
  label: VersionLabel;
  version: string;
  path: string;
  name: string;
  frozen_source_sha256: string;
  original_statement_count: number;
  original_stream_composite_sha256: string;
  normalized_statement_count: number;
  normalized_stream_composite_sha256: string;
  removed_token_ordinals: number[];
  removed_token_count: number;
  removed_token_stream_composite_sha256: string;
};

type ContractAuthority = {
  schema_version: string;
  schema: string;
  revision: string;
  execution_status: string;
  execution_authorization: boolean;
  remote_apply_authorization: boolean;
  implementation_authorization: boolean;
  source_workspace_identity: {
    expected_branch: string;
    current_source_authority_head: string;
  };
  frozen_authority: {
    primary_evidence_sha256: string;
  };
  versions: ContractVersion[];
  normalization: {
    removed_ordinals_by_label: Record<VersionLabel, number[]>;
  };
};

type MatrixAuthority = {
  schema_version: string;
  execution_status: string;
  frozen_authority: {
    primary_evidence_sha256: string;
  };
};

type ParserStatementEvidence = {
  ordinal: number;
  utf8_bytes: number;
  sha256: string;
  first160_escaped?: string;
  last160_escaped?: string;
};

type ParserMigrationEvidence = {
  version: string;
  path: string;
  frozen_sha256: string;
  statement_count: number;
  statements: ParserStatementEvidence[];
  first_statement_full_escaped?: string;
  last_statement_full_escaped?: string;
};

type ParserEvidenceAuthority = {
  serialization_version: string;
  source_shas: Array<{ version: string; path: string; sha256: string }>;
  migrations: ParserMigrationEvidence[];
};

export type VersionValidationStatus = {
  label: VersionLabel;
  version: string;
  name: string;
  sourceSha256Match: boolean;
  parserFingerprintMatch: boolean;
  originalCompositeMatch: boolean;
  normalizedCompositeMatch: boolean;
  removedCompositeMatch: boolean;
  removedOrdinalsMatch: boolean;
  policy2PayloadValid: boolean;
};

export type PlanResult = {
  mode: typeof STAGE_A_MODE;
  coreValidation: PureOutcome;
  structuralValidation?: StructuralValidationOutcome;
  executionState: 'EXECUTION_LOCKED';
  selectedVersions: VersionLabel[];
  authorityIdentities: {
    contractSha256: string;
    matrixSha256: string;
    parserEvidenceSha256: string;
    revision: string;
    executionStatus: string;
  };
  perVersionStatus: VersionValidationStatus[];
  stageBBlockers: readonly string[];
  executionLock: typeof STAGE_A_EXECUTION_LOCK;
  targetFingerprintReadiness: 'REQUIRED_NOT_FROZEN';
  holdReasonCode?: string;
  sourceAuthorityBase: typeof EXPECTED_SOURCE_AUTHORITY_BASE;
  baselineStageACommit: typeof BASELINE_STAGE_A_COMMIT;
  bindingAddendumPath: typeof STAGE_A_BINDING_ADDENDUM_REL_PATH;
  bindingAddendumCanonicalPayloadSha256?: string;
  planOnlyPassIsNotExecutionAuthorization: true;
  executionRemainsLocked: true;
  externalPlanAttestationRequired: true;
};

export type PlanCoreEvaluationResult = {
  coreValidation: PureCoreValidationOutcome;
  selectedVersions: VersionLabel[];
  perVersionStatus: VersionValidationStatus[];
  holdReasonCode?: string;
  evaluatedFromValidatedWorkspaceFacts: true;
  actualGitInspectionPerformed: false;
  ancestryValidationPerformed: false;
};

type ContractFailureRegistryEntry = {
  event_identifier: string;
  lifecycle_gate_source: string;
  transaction_state_class: string;
  original_connection_disposition: string;
  rollback_action: string;
  classifier_required: boolean;
  terminal_outcome: string;
  same_run_retry: boolean;
};

type ContractLifecycleStep = {
  step: number;
  identifier: string;
};

export type ContractBindingSource = ContractAuthority & {
  lifecycle_steps_reference_section_5c: ContractLifecycleStep[];
  pre_connect_target_identity_gate: {
    identifier: string;
    approved_preview_target_fingerprint: string;
    approved_organization_label: string;
    approved_project_label: string;
    forbidden_production_identity: {
      organization_label: string;
      project_label: string;
    };
  };
  pre_connection_client_policy: { identifier: string };
  pre_mutation_prior_state_gate: {
    identifier: string;
    predicates: {
      P1: { all_required: string[] };
      P2_through_P7: { all_required: string[] };
    };
  };
  pre_commit_failure_handling_lifecycle: { identifier: string };
  post_commit_readonly_verification_lifecycle: { identifier: string };
  ack_state_readonly_classification_lifecycle: {
    identifier: string;
    ack_outcome_disposition: {
      DEFINITELY_NOT_COMMITTED: {
        disposition: string;
        same_run_retry_forbidden: boolean;
        automatic_next_version_forbidden: boolean;
        automatic_rerun_forbidden: boolean;
      };
      DEFINITELY_COMMITTED: {
        P1_through_P6: string;
        P7: string;
        same_run_retry_forbidden: boolean;
        automatic_next_version_forbidden: boolean;
      };
      CONTRADICTORY_OR_DRIFTED: { mandatory_STOP: boolean };
    };
  };
  pre_commit_failure_domain_registry: {
    identifier: string;
    entries: ContractFailureRegistryEntry[];
  };
  target_identity: {
    expected_organization_label: string;
    expected_project_label: string;
    forbidden_production_identity: {
      organization_label: string;
      project_label: string;
    };
    dual_channel_guard_required: boolean;
  };
  ack_classifiers: {
    identifiers: string[];
    rules: {
      no_blind_retry: boolean;
      no_automatic_retry: boolean;
      no_silent_skip: boolean;
      only_DEFINITELY_NOT_COMMITTED_may_be_human_approved_rerun_candidate: boolean;
      every_other_state_is_CONTRADICTORY_OR_DRIFTED_and_mandatory_STOP: boolean;
      ack_outcome_disposition_required: boolean;
      same_run_retry_forbidden: boolean;
      automatic_next_version_forbidden: boolean;
      DEFINITELY_COMMITTED_requires_human_review_not_automatic_advance: boolean;
    };
    predicates: {
      P1: {
        DEFINITELY_NOT_COMMITTED: { all_required: string[] };
        DEFINITELY_COMMITTED: { all_required: string[] };
      };
      P2_through_P7: {
        DEFINITELY_NOT_COMMITTED: { all_required: string[] };
        DEFINITELY_COMMITTED: { all_required: string[] };
      };
      CONTRADICTORY_OR_DRIFTED: { mandatory_STOP: boolean };
    };
  };
};

type MatrixVersionRow = {
  label: string;
  version: string;
  migration_name: string;
  execution_authorization: boolean;
  next_version_authorization: boolean;
  successful_terminal_outcome: string;
};

type MatrixBindingSource = MatrixAuthority & {
  version_matrices: MatrixVersionRow[];
};

const STAGE_A_INTERSTITIAL_LIFECYCLE_IDENTIFIERS = [
  'PRE_CONNECT_TARGET_IDENTITY_GATE',
  'PRE_CONNECTION_CLIENT_POLICY',
  'PRE_MUTATION_PRIOR_STATE_GATE',
  'PRE_COMMIT_FAILURE_HANDLING_LIFECYCLE',
  'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE',
  'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
  'PRE_COMMIT_FAILURE_DOMAIN_REGISTRY',
] as const;

const P1_REQUIRED_PREDICATES = [
  'target_identity_exact',
  'history_relation_absent',
  'exact_P0_oracle_phase',
  'P1_delta_absent',
  'unexpected_delta_zero',
] as const;

const P2_THROUGH_P7_REQUIRED_PREDICATES = [
  'target_identity_exact',
  'exact_prior_history_prefix',
  'exact_prior_oracle_phase',
  'current_version_delta_absent',
  'unexpected_delta_zero',
] as const;

type ExpectedFailureRegistryEntry = {
  event_identifier: PreCommitFailureEvent;
  lifecycle_gate_source: string;
  transaction_state_class: TransactionStateClass;
  original_connection_disposition: string;
  rollback_action: string;
  classifier_required: boolean;
  terminal_outcome: string;
  same_run_retry: false;
};

export const EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY: readonly ExpectedFailureRegistryEntry[] = [
  {
    event_identifier: 'PRE_CONNECT_TARGET_IDENTITY_GATE_FAILURE',
    lifecycle_gate_source: 'pre_connect_target_identity_gate',
    transaction_state_class: 'NO_CONNECTION_ESTABLISHED',
    original_connection_disposition: 'NO_CONNECTION_OPENED',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'PRE_CONNECTION_CLIENT_POLICY_FAILURE',
    lifecycle_gate_source: 'pre_connection_client_policy',
    transaction_state_class: 'NO_CONNECTION_ESTABLISHED',
    original_connection_disposition: 'NO_CONNECTION_OPENED',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'CREATE_FRESH_CONNECTION_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_1_CREATE_FRESH_CONNECTION',
    transaction_state_class: 'NO_CONNECTION_ESTABLISHED',
    original_connection_disposition: 'CONNECTION_CREATION_FAILED',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'TARGET_ROLE_GUARD_REJECTION',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_2_TARGET_ROLE_GUARD',
    transaction_state_class: 'CONNECTED_NO_ACTIVE_TRANSACTION',
    original_connection_disposition: 'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'BOUNDED_SESSION_SETTINGS_REJECTION',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_3_BOUNDED_SESSION_SETTINGS',
    transaction_state_class: 'CONNECTED_NO_ACTIVE_TRANSACTION',
    original_connection_disposition: 'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'BEGIN_EXECUTOR_OWNED_TRANSACTION_REJECTION',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_4_BEGIN_EXECUTOR_OWNED_TRANSACTION',
    transaction_state_class: 'CONNECTED_NO_ACTIVE_TRANSACTION',
    original_connection_disposition: 'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
    rollback_action: 'NO_ROLLBACK_APPLICABLE',
    classifier_required: false,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'BEGIN_EXECUTOR_OWNED_TRANSACTION_UNCERTAINTY',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_4_BEGIN_EXECUTOR_OWNED_TRANSACTION',
    transaction_state_class: 'TRANSACTION_STATE_UNCERTAIN',
    original_connection_disposition: 'MARK_ORIGINAL_CONNECTION_UNUSABLE',
    rollback_action: 'ROLLBACK_ACK_UNCERTAIN',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'PRE_MUTATION_PRIOR_STATE_GATE_FAILURE',
    lifecycle_gate_source: 'pre_mutation_prior_state_gate',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'P1_HISTORY_BOOTSTRAP_IN_TRANSACTION_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_5_P1_HISTORY_BOOTSTRAP_IN_TRANSACTION',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'EXECUTE_NORMALIZED_STATEMENTS_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_6_EXECUTE_NORMALIZED_STATEMENTS',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'EXECUTE_NARROW_POSTCONDITIONS_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_7_EXECUTE_NARROW_POSTCONDITIONS',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'INSERT_EXACT_HISTORY_ROW_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_8_INSERT_EXACT_HISTORY_ROW',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'VERIFY_HISTORY_PREFIX_AND_PHASE_FAILURE',
    lifecycle_gate_source: 'lifecycle_steps_reference_section_5c.step_9_VERIFY_HISTORY_PREFIX_AND_PHASE',
    transaction_state_class: 'TRANSACTION_ACTIVE',
    original_connection_disposition: 'CLOSE_OR_RETIRE_AFTER_ROLLBACK',
    rollback_action: 'ISSUE_ONE_EXPLICIT_ROLLBACK_IF_TRANSACTION_ACTIVE',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'PRE_COMMIT_TRANSPORT_LOSS',
    lifecycle_gate_source:
      'pre_commit_failure_handling_lifecycle.transport_or_uncertain_rollback_acknowledgement',
    transaction_state_class: 'TRANSACTION_ACTIVE_OR_UNCERTAIN',
    original_connection_disposition: 'MARK_ORIGINAL_CONNECTION_UNUSABLE_AND_CLOSE',
    rollback_action: 'ROLLBACK_ACK_UNCERTAIN',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
  {
    event_identifier: 'ROLLBACK_ACK_UNCERTAIN',
    lifecycle_gate_source: 'pre_commit_failure_handling_lifecycle.healthy_connection_server_rejection',
    transaction_state_class: 'TRANSACTION_ACTIVE_OR_UNCERTAIN',
    original_connection_disposition: 'CLOSE_OR_RETIRE_ORIGINAL_CONNECTION',
    rollback_action: 'ROLLBACK_ACK_UNCERTAIN',
    classifier_required: true,
    terminal_outcome: 'MANDATORY_STOP_HUMAN_REVIEW_BEFORE_NEW_ATTEMPT',
    same_run_retry: false,
  },
] as const;

const EXPECTED_ACK_P1_NOT_COMMITTED_PREDICATES = [
  'history_relation_absent',
  'exact_P0_oracle_phase',
  'P1_delta_absent',
  'unexpected_delta_zero',
  'target_identity_exact',
] as const;

const EXPECTED_ACK_P1_COMMITTED_PREDICATES = [
  'history_relation_exact',
  'history_prefix_exactly_20260614000000',
  'exact_P1_oracle_phase',
  'unexpected_delta_zero',
  'target_identity_exact',
] as const;

const EXPECTED_ACK_P2_P7_NOT_COMMITTED_PREDICATES = [
  'exact_prior_history_prefix',
  'exact_prior_oracle_phase',
  'current_version_delta_absent',
  'unexpected_delta_zero',
  'target_identity_exact',
] as const;

const EXPECTED_ACK_P2_P7_COMMITTED_PREDICATES = [
  'exact_next_history_prefix',
  'exact_next_oracle_phase',
  'unexpected_delta_zero',
  'target_identity_exact',
] as const;

const EXPECTED_MATRIX_VERSION_ROWS = [
  {
    label: 'P1',
    version: '20260614000000',
    migration_name: 'preview_production_aligned_baseline_p1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P2',
    version: '20260615000001',
    migration_name: 'failed_fulfillments_user_ref_hash',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P3',
    version: '20260615000002',
    migration_name: 'm55_account_deletion_ledger_v1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P4',
    version: '20260615000003',
    migration_name: 'm55_account_deletion_process_rpc_v1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P5',
    version: '20260615000004',
    migration_name: 'm55_entitlements_and_rights_access_security_v1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P6',
    version: '20260615000005',
    migration_name: 'm55_dtr_visible_report_uniqueness_v1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION',
  },
  {
    label: 'P7',
    version: '20260615000006',
    migration_name: 'm55_entitlements_unique_index_cleanup_v1',
    successful_terminal_outcome: 'HUMAN_REVIEW_REQUIRED_FOR_CHAIN_COMPLETION',
  },
] as const;

export const EXPECTED_REVISION7_VERSION_IDENTITIES = [
  {
    label: 'P1',
    version: '20260614000000',
    name: 'preview_production_aligned_baseline_p1',
    path: 'docs/planning/preview-baseline/migrations/20260614000000_preview_production_aligned_baseline_p1.sql',
  },
  {
    label: 'P2',
    version: '20260615000001',
    name: 'failed_fulfillments_user_ref_hash',
    path: 'supabase/migrations/20260615000001_failed_fulfillments_user_ref_hash.sql',
  },
  {
    label: 'P3',
    version: '20260615000002',
    name: 'm55_account_deletion_ledger_v1',
    path: 'supabase/migrations/20260615000002_m55_account_deletion_ledger_v1.sql',
  },
  {
    label: 'P4',
    version: '20260615000003',
    name: 'm55_account_deletion_process_rpc_v1',
    path: 'supabase/migrations/20260615000003_m55_account_deletion_process_rpc_v1.sql',
  },
  {
    label: 'P5',
    version: '20260615000004',
    name: 'm55_entitlements_and_rights_access_security_v1',
    path: 'supabase/migrations/20260615000004_m55_entitlements_and_rights_access_security_v1.sql',
  },
  {
    label: 'P6',
    version: '20260615000005',
    name: 'm55_dtr_visible_report_uniqueness_v1',
    path: 'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql',
  },
  {
    label: 'P7',
    version: '20260615000006',
    name: 'm55_entitlements_unique_index_cleanup_v1',
    path: 'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql',
  },
] as const;

export const STAGE_A_CONTRACT_BINDING_HOLD_CODES = [
  'STAGE_A_CONTRACT_BINDING_MISMATCH:LIFECYCLE_COUNT',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:LIFECYCLE_STEPS',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:INTERSTITIAL_IDENTIFIERS',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_CLASSIFIERS',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P1',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P2_P7',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_CONTRADICTORY',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:PRE_MUTATION_PREDICATES_P1',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:PRE_MUTATION_PREDICATES_P2_P7',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:AUTHORIZATION_LOCKS',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY_COUNT',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY_ORDER',
  'STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY',
] as const;

function mapExpectedFailureRegistryToBehaviors(
  entries: readonly ExpectedFailureRegistryEntry[],
): readonly FailureDomainBehavior[] {
  return entries.map((entry) => ({
    eventIdentifier: entry.event_identifier,
    lifecycleGateSource: entry.lifecycle_gate_source,
    transactionStateClass: entry.transaction_state_class,
    originalConnectionDisposition: entry.original_connection_disposition,
    rollbackAction: entry.rollback_action,
    classifierRequired: entry.classifier_required,
    terminalOutcome: entry.terminal_outcome,
    sameRunRetry: false,
    firstErrorTerminal: true,
    automaticRetry: false,
    automaticNextVersion: false,
    commitAllowedAfterFailure: false,
  }));
}

function requireExactStringArray(
  actual: unknown,
  expected: readonly string[],
  code: (typeof STAGE_A_CONTRACT_BINDING_HOLD_CODES)[number],
): void {
  if (!Array.isArray(actual)) {
    throw new Error(code);
  }
  if (actual.length !== expected.length) {
    throw new Error(code);
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(code);
    }
  }
}

function validateContractFailureRegistryAgainstExpected(entries: ContractFailureRegistryEntry[]): void {
  if (entries.length !== EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY.length) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY_COUNT');
  }
  for (let i = 0; i < EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY.length; i++) {
    const expected = EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY[i];
    const actual = entries[i];
    if (!expected || !actual) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.event_identifier !== expected.event_identifier) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY_ORDER');
    }
    if (actual.lifecycle_gate_source !== expected.lifecycle_gate_source) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.transaction_state_class !== expected.transaction_state_class) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.original_connection_disposition !== expected.original_connection_disposition) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.rollback_action !== expected.rollback_action) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.classifier_required !== expected.classifier_required) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.terminal_outcome !== expected.terminal_outcome) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
    if (actual.same_run_retry !== false) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:FAILURE_REGISTRY');
    }
  }
}

let failureDomainRegistry: readonly FailureDomainBehavior[] = mapExpectedFailureRegistryToBehaviors(
  EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY,
);

const HOLD_REASON_GRAMMAR = /^[A-Z0-9_]+(?::[A-Z0-9_]+)*$/;

const HOLD_REASON_BASE_ALLOWLIST = new Set<string>([
  'UNKNOWN_HOLD',
  'PLAN_SELECTOR_INVALID',
  'REPO_ROOT_MISSING',
  'WORKSPACE_REPO_ROOT_MISMATCH',
  'WORKSPACE_BRANCH_MISMATCH',
  'WORKSPACE_HEAD_MISMATCH',
  'WORKSPACE_NOT_CLEAN',
  'AUTHORITY_CONTRACT_BYTES_MISMATCH',
  'AUTHORITY_CONTRACT_SHA_MISMATCH',
  'AUTHORITY_MATRIX_BYTES_MISMATCH',
  'AUTHORITY_MATRIX_SHA_MISMATCH',
  'AUTHORITY_PARSER_EVIDENCE_BYTES_MISMATCH',
  'AUTHORITY_PARSER_EVIDENCE_SHA_MISMATCH',
  'CONTRACT_SCHEMA_VERSION_MISMATCH',
  'CONTRACT_SCHEMA_MISMATCH',
  'CONTRACT_REVISION_MISMATCH',
  'CONTRACT_EXECUTION_STATUS_MISMATCH',
  'CONTRACT_EXECUTION_AUTH_TRUE',
  'CONTRACT_REMOTE_AUTH_TRUE',
  'CONTRACT_IMPL_AUTH_TRUE',
  'CONTRACT_BRANCH_MISMATCH',
  'CONTRACT_HEAD_MISMATCH',
  'CONTRACT_PRIMARY_EVIDENCE_SHA_MISMATCH',
  'CONTRACT_VERSION_COUNT_MISMATCH',
  'MATRIX_SCHEMA_VERSION_MISMATCH',
  'MATRIX_EXECUTION_STATUS_MISMATCH',
  'MATRIX_PRIMARY_EVIDENCE_SHA_MISMATCH',
  'PARSER_EVIDENCE_SERIALIZATION_MISMATCH',
  'PARSER_EVIDENCE_SOURCE_SHA_COUNT_MISMATCH',
  'PARSER_EVIDENCE_MIGRATION_COUNT_MISMATCH',
  'STAGE_A_CONTRACT_BINDING_MISMATCH',
  'EVIDENCE_MISSING',
  'EXECUTION_SELECTOR_ALL_FORBIDDEN',
  'EXECUTION_SELECTOR_INVALID',
  'FAILURE_DOMAIN_EVENT_UNKNOWN',
  'SOURCE_SHA_MISMATCH',
  'SOURCE_UTF8_ROUNDTRIP_MISMATCH',
  'EVIDENCE_SOURCE_SHA_MISMATCH',
  'STATEMENT_COUNT_MISMATCH',
  'CONTRACT_STATEMENT_COUNT_MISMATCH',
  'MISSING_STATEMENT',
  'STATEMENT_FINGERPRINT_MISMATCH',
  'FIRST160_MISMATCH',
  'LAST160_MISMATCH',
  'FIRST_FULL_MISMATCH',
  'LAST_FULL_MISMATCH',
  'ORIGINAL_COMPOSITE_MISMATCH',
  'NORMALIZED_COUNT_MISMATCH',
  'REMOVED_COUNT_MISMATCH',
  'REMOVED_ORDINALS_MISMATCH',
  'OPTION_A_ORDINALS_MISMATCH',
  'NORMALIZED_COMPOSITE_MISMATCH',
  'REMOVED_COMPOSITE_MISMATCH',
  'FORBIDDEN_ARGUMENT',
  'EXTRA_ARGUMENT',
  'UNKNOWN_ARGUMENT',
  'PRE_DB_HOLD',
  'DB_TRANSPORT_INSTANTIATION_FORBIDDEN',
  'STAGE_A_BINDING_ADDENDUM_MISSING',
  'STAGE_A_BINDING_ADDENDUM_MALFORMED',
  'STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH',
  'STAGE_A_BINDING_BASELINE_ANCESTRY_FAILURE',
  'STAGE_A_BINDING_IMPLEMENTATION_ANCESTRY_FAILURE',
  'STAGE_A_BINDING_GEN0_HISTORICAL_IDENTITY_MISMATCH',
  'STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH',
  'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH',
  'STAGE_A_BINDING_CANONICAL_PAYLOAD_MISMATCH',
  'STAGE_A_BINDING_UNAUTHORIZED_PROTECTED_FILE_CHANGE',
  'PLAN_ONLY_EXTERNAL_ATTESTATION_REQUIRED',
]);

function validateContractVersionIdentities(contract: ContractBindingSource): void {
  if (contract.versions.length !== EXPECTED_REVISION7_VERSION_IDENTITIES.length) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
  }
  const seenLabels = new Set<string>();
  const seenVersions = new Set<string>();
  for (let i = 0; i < EXPECTED_REVISION7_VERSION_IDENTITIES.length; i++) {
    const expected = EXPECTED_REVISION7_VERSION_IDENTITIES[i];
    const actual = contract.versions[i];
    if (!expected || !actual) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (actual.label !== expected.label) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (actual.version !== expected.version) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (actual.name !== expected.name) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (actual.path !== expected.path) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (seenLabels.has(actual.label) || seenVersions.has(actual.version)) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    seenLabels.add(actual.label);
    seenVersions.add(actual.version);
  }
}

function validateTargetAuthorityBindings(contract: ContractBindingSource): void {
  const target = contract.target_identity;
  const preConnect = contract.pre_connect_target_identity_gate;
  if (target.expected_organization_label !== APPROVED_PREVIEW_ORGANIZATION) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (target.expected_project_label !== APPROVED_PREVIEW_PROJECT) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (target.forbidden_production_identity.organization_label !== FORBIDDEN_PRODUCTION_ORGANIZATION) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (target.forbidden_production_identity.project_label !== FORBIDDEN_PRODUCTION_PROJECT) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (target.dual_channel_guard_required !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.approved_organization_label !== APPROVED_PREVIEW_ORGANIZATION) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.approved_project_label !== APPROVED_PREVIEW_PROJECT) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.forbidden_production_identity.organization_label !== FORBIDDEN_PRODUCTION_ORGANIZATION) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.forbidden_production_identity.project_label !== FORBIDDEN_PRODUCTION_PROJECT) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.approved_preview_target_fingerprint !== FINGERPRINT_PLACEHOLDER) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.approved_organization_label !== target.expected_organization_label) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (preConnect.approved_project_label !== target.expected_project_label) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (
    preConnect.forbidden_production_identity.organization_label !==
    target.forbidden_production_identity.organization_label
  ) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
  if (
    preConnect.forbidden_production_identity.project_label !==
    target.forbidden_production_identity.project_label
  ) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:TARGET_AUTHORITY');
  }
}

export function validateStageACoreContractBindings(
  contract: ContractBindingSource,
  matrix: MatrixBindingSource,
): void {
  const lifecycle = contract.lifecycle_steps_reference_section_5c;
  if (lifecycle.length !== 12) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:LIFECYCLE_COUNT');
  }
  for (let i = 0; i < lifecycle.length; i++) {
    const step = lifecycle[i];
    const expectedId = LIFECYCLE_STEP_IDENTIFIERS[i];
    if (step?.step !== i + 1 || step.identifier !== expectedId) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:LIFECYCLE_STEPS');
    }
  }

  const interstitialChecks: Array<[string, string]> = [
    [contract.pre_connect_target_identity_gate.identifier, 'PRE_CONNECT_TARGET_IDENTITY_GATE'],
    [contract.pre_connection_client_policy.identifier, 'PRE_CONNECTION_CLIENT_POLICY'],
    [contract.pre_mutation_prior_state_gate.identifier, 'PRE_MUTATION_PRIOR_STATE_GATE'],
    [contract.pre_commit_failure_handling_lifecycle.identifier, 'PRE_COMMIT_FAILURE_HANDLING_LIFECYCLE'],
    [
      contract.post_commit_readonly_verification_lifecycle.identifier,
      'POST_COMMIT_READONLY_VERIFICATION_LIFECYCLE',
    ],
    [
      contract.ack_state_readonly_classification_lifecycle.identifier,
      'ACK_STATE_READONLY_CLASSIFICATION_LIFECYCLE',
    ],
    [contract.pre_commit_failure_domain_registry.identifier, 'PRE_COMMIT_FAILURE_DOMAIN_REGISTRY'],
  ];
  for (const [actual, expected] of interstitialChecks) {
    if (actual !== expected) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:INTERSTITIAL_IDENTIFIERS');
    }
  }

  const ackIds = contract.ack_classifiers.identifiers;
  if (ackIds.length !== 3 || ackIds.join('|') !== ACK_CLASSIFIER_IDENTIFIERS.join('|')) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_CLASSIFIERS');
  }

  const ackRules = contract.ack_classifiers.rules;
  if (ackRules.no_blind_retry !== true) throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  if (ackRules.no_automatic_retry !== true) throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  if (ackRules.no_silent_skip !== true) throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  if (ackRules.only_DEFINITELY_NOT_COMMITTED_may_be_human_approved_rerun_candidate !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  }
  if (ackRules.every_other_state_is_CONTRADICTORY_OR_DRIFTED_and_mandatory_STOP !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  }
  if (ackRules.ack_outcome_disposition_required !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  }
  if (ackRules.same_run_retry_forbidden !== true) throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  if (ackRules.automatic_next_version_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  }
  if (ackRules.DEFINITELY_COMMITTED_requires_human_review_not_automatic_advance !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_RULES');
  }

  requireExactStringArray(
    contract.ack_classifiers.predicates.P1.DEFINITELY_NOT_COMMITTED.all_required,
    EXPECTED_ACK_P1_NOT_COMMITTED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P1',
  );
  requireExactStringArray(
    contract.ack_classifiers.predicates.P1.DEFINITELY_COMMITTED.all_required,
    EXPECTED_ACK_P1_COMMITTED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P1',
  );
  requireExactStringArray(
    contract.ack_classifiers.predicates.P2_through_P7.DEFINITELY_NOT_COMMITTED.all_required,
    EXPECTED_ACK_P2_P7_NOT_COMMITTED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P2_P7',
  );
  requireExactStringArray(
    contract.ack_classifiers.predicates.P2_through_P7.DEFINITELY_COMMITTED.all_required,
    EXPECTED_ACK_P2_P7_COMMITTED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_P2_P7',
  );
  if (contract.ack_classifiers.predicates.CONTRADICTORY_OR_DRIFTED.mandatory_STOP !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_PREDICATES_CONTRADICTORY');
  }

  requireExactStringArray(
    contract.pre_mutation_prior_state_gate.predicates.P1.all_required,
    P1_REQUIRED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:PRE_MUTATION_PREDICATES_P1',
  );
  requireExactStringArray(
    contract.pre_mutation_prior_state_gate.predicates.P2_through_P7.all_required,
    P2_THROUGH_P7_REQUIRED_PREDICATES,
    'STAGE_A_CONTRACT_BINDING_MISMATCH:PRE_MUTATION_PREDICATES_P2_P7',
  );

  const ackDisposition = contract.ack_state_readonly_classification_lifecycle.ack_outcome_disposition;
  if (ackDisposition.DEFINITELY_NOT_COMMITTED.disposition !== 'HUMAN_REVIEW_REQUIRED_FOR_RERUN') {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_NOT_COMMITTED.same_run_retry_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_NOT_COMMITTED.automatic_next_version_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_NOT_COMMITTED.automatic_rerun_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_COMMITTED.P1_through_P6 !== 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION') {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_COMMITTED.P7 !== P7_CHAIN_COMPLETION_TERMINAL) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_COMMITTED.same_run_retry_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.DEFINITELY_COMMITTED.automatic_next_version_forbidden !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }
  if (ackDisposition.CONTRADICTORY_OR_DRIFTED.mandatory_STOP !== true) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:ACK_DISPOSITION');
  }

  validateTargetAuthorityBindings(contract);

  if (contract.execution_authorization !== false) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:AUTHORIZATION_LOCKS');
  }
  if (contract.implementation_authorization !== false) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:AUTHORIZATION_LOCKS');
  }
  if (contract.remote_apply_authorization !== false) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:AUTHORIZATION_LOCKS');
  }

  validateContractVersionIdentities(contract);

  if (matrix.version_matrices.length !== 7) {
    throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
  }
  for (let i = 0; i < EXPECTED_MATRIX_VERSION_ROWS.length; i++) {
    const expectedRow = EXPECTED_MATRIX_VERSION_ROWS[i];
    const actualRow = matrix.version_matrices[i];
    const contractVersion = contract.versions[i];
    if (!expectedRow || !actualRow || !contractVersion) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (actualRow.label !== expectedRow.label) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (contractVersion.label !== expectedRow.label) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:VERSION_IDENTITIES');
    }
    if (actualRow.version !== expectedRow.version || contractVersion.version !== expectedRow.version) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (
      actualRow.migration_name !== expectedRow.migration_name ||
      contractVersion.name !== expectedRow.migration_name
    ) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (actualRow.successful_terminal_outcome !== expectedRow.successful_terminal_outcome) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (actualRow.execution_authorization !== false) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
    if (actualRow.next_version_authorization !== false) {
      throw new Error('STAGE_A_CONTRACT_BINDING_MISMATCH:MATRIX_ROWS');
    }
  }

  validateContractFailureRegistryAgainstExpected(contract.pre_commit_failure_domain_registry.entries);
  failureDomainRegistry = mapExpectedFailureRegistryToBehaviors(EXPECTED_REVISION7_FAILURE_DOMAIN_REGISTRY);
}

const FAILURE_STEP_INDEX: Record<PreCommitFailureEvent, number> = {
  PRE_CONNECT_TARGET_IDENTITY_GATE_FAILURE: 0,
  PRE_CONNECTION_CLIENT_POLICY_FAILURE: 0,
  CREATE_FRESH_CONNECTION_FAILURE: 1,
  TARGET_ROLE_GUARD_REJECTION: 2,
  BOUNDED_SESSION_SETTINGS_REJECTION: 3,
  BEGIN_EXECUTOR_OWNED_TRANSACTION_REJECTION: 4,
  BEGIN_EXECUTOR_OWNED_TRANSACTION_UNCERTAINTY: 4,
  PRE_MUTATION_PRIOR_STATE_GATE_FAILURE: 5,
  P1_HISTORY_BOOTSTRAP_IN_TRANSACTION_FAILURE: 5,
  EXECUTE_NORMALIZED_STATEMENTS_FAILURE: 6,
  EXECUTE_NARROW_POSTCONDITIONS_FAILURE: 7,
  INSERT_EXACT_HISTORY_ROW_FAILURE: 8,
  VERIFY_HISTORY_PREFIX_AND_PHASE_FAILURE: 9,
  PRE_COMMIT_TRANSPORT_LOSS: 10,
  ROLLBACK_ACK_UNCERTAIN: 10,
};

export function sanitizeHoldReasonCode(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return 'UNKNOWN_HOLD';
  const base = raw.split('\n')[0]?.slice(0, 128) ?? 'UNKNOWN_HOLD';
  if (!HOLD_REASON_GRAMMAR.test(base)) return 'UNKNOWN_HOLD';
  const root = base.split(':')[0] ?? 'UNKNOWN_HOLD';
  if (!HOLD_REASON_BASE_ALLOWLIST.has(root)) return 'UNKNOWN_HOLD';
  return base;
}

export function validateMigrationSourceBytes(
  rawBytes: Buffer,
  expectedSha256: string,
  label: string,
): { text: string; sha256: string } {
  const sha256 = sha256Buffer(rawBytes);
  if (sha256 !== expectedSha256) {
    throw new Error(`SOURCE_SHA_MISMATCH:${label}`);
  }
  const text = rawBytes.toString('utf8');
  const roundtrip = Buffer.from(text, 'utf8');
  if (roundtrip.compare(rawBytes) !== 0) {
    throw new Error(`SOURCE_UTF8_ROUNDTRIP_MISMATCH:${label}`);
  }
  return { text, sha256 };
}

function sha256File(path: string): { bytes: number; sha256: string } {
  const bytes = readFileSync(path);
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function readAuthorityJson<T>(repoRoot: string, relPath: string): T {
  const abs = join(repoRoot, relPath);
  return JSON.parse(readFileSync(abs, 'utf8')) as T;
}

export function resolveCanonicalRepoRoot(repoRoot: string): string {
  return realpathSync(resolve(repoRoot));
}

export function validateRepoRootGateBeforeGit(repoRoot: string): string {
  if (!existsSync(repoRoot)) throw new Error('REPO_ROOT_MISSING');
  const canonical = resolveCanonicalRepoRoot(repoRoot);
  validateWorkspaceRepoRoot(canonical);
  return canonical;
}

export function validateWorkspaceRepoRoot(resolvedRoot: string): void {
  const expected = realpathSync(EXPECTED_REPO_ROOT);
  if (resolvedRoot !== expected) {
    throw new Error('WORKSPACE_REPO_ROOT_MISMATCH');
  }
}

export function parsePlanVersionSelector(value: string): PlanVersionSelector | null {
  if (value === 'P1' || value === 'P2' || value === 'P3' || value === 'P4' || value === 'P5' || value === 'P6' || value === 'P7' || value === 'ALL') {
    return value;
  }
  return null;
}

export function validateAuthorityBytes(repoRoot: string): {
  contract: { bytes: number; sha256: string };
  matrix: { bytes: number; sha256: string };
  parserEvidence: { bytes: number; sha256: string };
} {
  const contractPath = join(repoRoot, AUTHORITY_CONTRACT_REL_PATH);
  const matrixPath = join(repoRoot, AUTHORITY_MATRIX_REL_PATH);
  const evidencePath = join(repoRoot, AUTHORITY_PARSER_EVIDENCE_REL_PATH);

  const contract = sha256File(contractPath);
  const matrix = sha256File(matrixPath);
  const parserEvidence = sha256File(evidencePath);

  if (contract.bytes !== AUTHORITY_FILE_EXPECTATIONS.contract.bytes) {
    throw new Error('AUTHORITY_CONTRACT_BYTES_MISMATCH');
  }
  if (contract.sha256 !== AUTHORITY_FILE_EXPECTATIONS.contract.sha256) {
    throw new Error('AUTHORITY_CONTRACT_SHA_MISMATCH');
  }
  if (matrix.bytes !== AUTHORITY_FILE_EXPECTATIONS.matrix.bytes) {
    throw new Error('AUTHORITY_MATRIX_BYTES_MISMATCH');
  }
  if (matrix.sha256 !== AUTHORITY_FILE_EXPECTATIONS.matrix.sha256) {
    throw new Error('AUTHORITY_MATRIX_SHA_MISMATCH');
  }
  if (parserEvidence.bytes !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.bytes) {
    throw new Error('AUTHORITY_PARSER_EVIDENCE_BYTES_MISMATCH');
  }
  if (parserEvidence.sha256 !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256) {
    throw new Error('AUTHORITY_PARSER_EVIDENCE_SHA_MISMATCH');
  }

  return { contract, matrix, parserEvidence };
}

export function loadAuthorityBundle(repoRoot: string): AuthorityBundle {
  validateAuthorityBytes(repoRoot);
  const contract = readAuthorityJson<ContractAuthority>(repoRoot, AUTHORITY_CONTRACT_REL_PATH);
  const matrix = readAuthorityJson<MatrixAuthority>(repoRoot, AUTHORITY_MATRIX_REL_PATH);
  const parserEvidence = readAuthorityJson<ParserEvidenceAuthority>(
    repoRoot,
    AUTHORITY_PARSER_EVIDENCE_REL_PATH,
  );

  if (contract.schema_version !== 'm55.preview.transaction_normalized_execution_contract.v1.revision-7.draft') {
    throw new Error('CONTRACT_SCHEMA_VERSION_MISMATCH');
  }
  if (contract.schema !== 'revision-7.draft') throw new Error('CONTRACT_SCHEMA_MISMATCH');
  if (contract.revision !== 'REVISION-7') throw new Error('CONTRACT_REVISION_MISMATCH');
  if (contract.execution_status !== 'NOT EXECUTED') throw new Error('CONTRACT_EXECUTION_STATUS_MISMATCH');
  if (contract.execution_authorization !== false) throw new Error('CONTRACT_EXECUTION_AUTH_TRUE');
  if (contract.remote_apply_authorization !== false) throw new Error('CONTRACT_REMOTE_AUTH_TRUE');
  if (contract.implementation_authorization !== false) throw new Error('CONTRACT_IMPL_AUTH_TRUE');
  if (contract.source_workspace_identity.expected_branch !== EXPECTED_BRANCH) {
    throw new Error('CONTRACT_BRANCH_MISMATCH');
  }
  if (contract.source_workspace_identity.current_source_authority_head !== EXPECTED_SOURCE_AUTHORITY_HEAD) {
    throw new Error('CONTRACT_HEAD_MISMATCH');
  }
  if (contract.frozen_authority.primary_evidence_sha256 !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256) {
    throw new Error('CONTRACT_PRIMARY_EVIDENCE_SHA_MISMATCH');
  }
  if (contract.versions.length !== 7) throw new Error('CONTRACT_VERSION_COUNT_MISMATCH');

  if (matrix.schema_version !== 'm55.preview.transaction_normalized_step_matrix.v1.revision-7.draft') {
    throw new Error('MATRIX_SCHEMA_VERSION_MISMATCH');
  }
  if (matrix.execution_status !== 'NOT EXECUTED') throw new Error('MATRIX_EXECUTION_STATUS_MISMATCH');
  if (matrix.frozen_authority.primary_evidence_sha256 !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256) {
    throw new Error('MATRIX_PRIMARY_EVIDENCE_SHA_MISMATCH');
  }

  if (parserEvidence.serialization_version !== 'm55.transaction_normalization.exact_parser.v1') {
    throw new Error('PARSER_EVIDENCE_SERIALIZATION_MISMATCH');
  }
  if (parserEvidence.source_shas.length !== 7) throw new Error('PARSER_EVIDENCE_SOURCE_SHA_COUNT_MISMATCH');
  if (parserEvidence.migrations.length !== 7) throw new Error('PARSER_EVIDENCE_MIGRATION_COUNT_MISMATCH');

  validateStageACoreContractBindings(
    contract as unknown as ContractBindingSource,
    matrix as unknown as MatrixBindingSource,
  );

  return { contract, matrix, parserEvidence };
}

export function readWorkspaceFacts(repoRoot: string): WorkspaceFacts {
  const branch = execSync('git branch --show-current', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const head = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const status = execSync('git status --short -uall', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const staged = execSync('git diff --cached --name-only', { cwd: repoRoot, encoding: 'utf8' }).trim();
  return {
    branch,
    head,
    cleanWorktree: status.length === 0,
    cleanIndex: staged.length === 0,
    repoRoot: resolveCanonicalRepoRoot(repoRoot),
  };
}

export function parseExecutionVersionSelector(value: string): ExecutionVersionSelector {
  if (value === 'ALL') throw new Error('EXECUTION_SELECTOR_ALL_FORBIDDEN');
  if (!['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(value)) {
    throw new Error('EXECUTION_SELECTOR_INVALID');
  }
  return value as ExecutionVersionSelector;
}

export function expandPlanSelector(selector: PlanVersionSelector): VersionLabel[] {
  if (selector === 'ALL') return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  return [selector];
}

export function evaluateP1NotCommittedPredicate(facts: P1AckFacts): boolean {
  return (
    facts.historyRelationAbsent &&
    facts.exactP0OraclePhase &&
    facts.p1DeltaAbsent &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

export function evaluateP1CommittedPredicate(facts: P1AckFacts): boolean {
  return (
    facts.historyRelationExact &&
    facts.historyPrefixExactlyP1 &&
    facts.exactP1OraclePhase &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

export function classifyP1AckFromFacts(facts: P1AckFacts): AckClassifier {
  const notCommitted = evaluateP1NotCommittedPredicate(facts);
  const committed = evaluateP1CommittedPredicate(facts);
  if (notCommitted && !committed) return 'DEFINITELY_NOT_COMMITTED';
  if (committed && !notCommitted) return 'DEFINITELY_COMMITTED';
  return 'CONTRADICTORY_OR_DRIFTED';
}

export function evaluateP2ThroughP7NotCommittedPredicate(facts: P2ThroughP7AckFacts): boolean {
  return (
    facts.exactPriorHistoryPrefix &&
    facts.exactPriorOraclePhase &&
    facts.currentVersionDeltaAbsent &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

export function evaluateP2ThroughP7CommittedPredicate(facts: P2ThroughP7AckFacts): boolean {
  return (
    facts.exactNextHistoryPrefix &&
    facts.exactNextOraclePhase &&
    facts.unexpectedDeltaZero &&
    facts.targetIdentityExact
  );
}

export function classifyP2ThroughP7AckFromFacts(facts: P2ThroughP7AckFacts): AckClassifier {
  const notCommitted = evaluateP2ThroughP7NotCommittedPredicate(facts);
  const committed = evaluateP2ThroughP7CommittedPredicate(facts);
  if (notCommitted && !committed) return 'DEFINITELY_NOT_COMMITTED';
  if (committed && !notCommitted) return 'DEFINITELY_COMMITTED';
  return 'CONTRADICTORY_OR_DRIFTED';
}

function compareFingerprintValues(approvedFingerprint: string, candidateFingerprint: string): 'PASS' | 'HOLD' {
  if (!approvedFingerprint || !candidateFingerprint) return 'HOLD';
  if (approvedFingerprint === FINGERPRINT_PLACEHOLDER || candidateFingerprint === FINGERPRINT_PLACEHOLDER) {
    return 'HOLD';
  }
  if (approvedFingerprint.trim() !== approvedFingerprint || candidateFingerprint.trim() !== candidateFingerprint) {
    return 'HOLD';
  }
  if (approvedFingerprint !== candidateFingerprint) return 'HOLD';
  const credentialPattern = (value: string): boolean =>
    value.includes('://') ||
    value.includes('@') ||
    value.includes('?') ||
    value.includes('#') ||
    /[\x00-\x1f\x7f]/.test(value);
  if (credentialPattern(approvedFingerprint) || credentialPattern(candidateFingerprint)) return 'HOLD';
  return 'PASS';
}

export function compareFingerprintValuesForTests(
  approvedFingerprint: string,
  candidateFingerprint: string,
): 'PASS' | 'HOLD' {
  return compareFingerprintValues(approvedFingerprint, candidateFingerprint);
}

export function evaluateStageATargetFingerprintReadiness(candidateFingerprint: string): 'PASS' | 'HOLD' {
  if (!candidateFingerprint) return 'HOLD';
  try {
    const bundle = loadAuthorityBundle(EXPECTED_REPO_ROOT);
    const approved = (bundle.contract as ContractBindingSource).pre_connect_target_identity_gate
      .approved_preview_target_fingerprint;
    if (!approved || approved === FINGERPRINT_PLACEHOLDER) return 'HOLD';
    return compareFingerprintValues(approved, candidateFingerprint);
  } catch {
    return 'HOLD';
  }
}

export function compareTargetIdentityLabels(
  organizationLabel: string,
  projectLabel: string,
): 'PASS' | 'HOLD' {
  if (!organizationLabel || !projectLabel) return 'HOLD';
  if (organizationLabel.trim() !== organizationLabel || projectLabel.trim() !== projectLabel) return 'HOLD';
  if (organizationLabel === FORBIDDEN_PRODUCTION_ORGANIZATION) return 'HOLD';
  if (projectLabel === FORBIDDEN_PRODUCTION_PROJECT) return 'HOLD';
  if (organizationLabel !== APPROVED_PREVIEW_ORGANIZATION || projectLabel !== APPROVED_PREVIEW_PROJECT) {
    return 'HOLD';
  }
  return 'PASS';
}

export function evaluateProductionLabelGuard(input: {
  organizationLabel: string;
  projectLabel: string;
}): 'PASS' | 'HOLD' {
  return compareTargetIdentityLabels(input.organizationLabel, input.projectLabel);
}

export function classifyAckState(state: AckClassifier): PureOutcome {
  switch (state) {
    case 'DEFINITELY_NOT_COMMITTED':
      return 'HUMAN_REVIEW_REQUIRED_FOR_RERUN';
    case 'DEFINITELY_COMMITTED':
      return 'HUMAN_REVIEW_REQUIRED_FOR_NEXT_VERSION';
    case 'CONTRADICTORY_OR_DRIFTED':
      return 'CONTRADICTORY_OR_DRIFTED';
    default:
      return 'PRE_DB_HOLD';
  }
}

export function classifyAckStateForVersion(state: AckClassifier, label: VersionLabel): PureOutcome {
  if (state === 'DEFINITELY_COMMITTED' && label === 'P7') {
    return P7_CHAIN_COMPLETION_TERMINAL;
  }
  return classifyAckState(state);
}

export function getFailureDomainBehavior(event: PreCommitFailureEvent): FailureDomainBehavior {
  const behavior = failureDomainRegistry.find((entry) => entry.eventIdentifier === event);
  if (!behavior) throw new Error('FAILURE_DOMAIN_EVENT_UNKNOWN');
  return behavior;
}

export function getFailureDomainRegistry(): readonly FailureDomainBehavior[] {
  return failureDomainRegistry;
}

export type PureTransitionStep = {
  identifier: string;
  allowed: boolean;
  failureEvent?: PreCommitFailureEvent;
};

export function simulatePreCommitTransitionStream(
  failures: PreCommitFailureEvent[],
): {
  steps: PureTransitionStep[];
  commitReached: boolean;
  firstFailure?: PreCommitFailureEvent;
  behavior?: FailureDomainBehavior;
} {
  const firstFailure = failures[0];
  if (!firstFailure) {
    return {
      steps: LIFECYCLE_STEP_IDENTIFIERS.map((identifier) => ({ identifier, allowed: true })),
      commitReached: true,
    };
  }

  const behavior = getFailureDomainBehavior(firstFailure);
  const failureStepIndex = FAILURE_STEP_INDEX[firstFailure];
  const steps: PureTransitionStep[] = [];

  for (let i = 0; i < LIFECYCLE_STEP_IDENTIFIERS.length; i++) {
    const identifier = LIFECYCLE_STEP_IDENTIFIERS[i];
    const stepNumber = i + 1;
    if (failureStepIndex === 0 || stepNumber >= failureStepIndex) {
      steps.push({
        identifier,
        allowed: false,
        failureEvent: stepNumber === failureStepIndex ? firstFailure : undefined,
      });
      continue;
    }
    steps.push({ identifier, allowed: true });
  }

  const commitReached = steps.some((step) => step.identifier === 'COMMIT_ONCE' && step.allowed);
  return { steps, commitReached, firstFailure, behavior };
}

function validateParserFingerprints(
  repoRoot: string,
  contractVersion: ContractVersion,
  migrationEvidence: ParserMigrationEvidence,
): { statements: string[]; match: boolean } {
  const rawBytes = readFileSync(join(repoRoot, contractVersion.path));
  const { text: source } = validateMigrationSourceBytes(
    rawBytes,
    contractVersion.frozen_source_sha256,
    contractVersion.label,
  );
  if (sha256Buffer(rawBytes) !== migrationEvidence.frozen_sha256) {
    throw new Error(`EVIDENCE_SOURCE_SHA_MISMATCH:${contractVersion.label}`);
  }

  const statements = splitAndTrim(source);
  if (statements.length !== migrationEvidence.statement_count) {
    throw new Error(`STATEMENT_COUNT_MISMATCH:${contractVersion.label}`);
  }
  if (statements.length !== contractVersion.original_statement_count) {
    throw new Error(`CONTRACT_STATEMENT_COUNT_MISMATCH:${contractVersion.label}`);
  }

  for (const expected of migrationEvidence.statements) {
    const actual = statements[expected.ordinal];
    if (actual === undefined) throw new Error(`MISSING_STATEMENT:${contractVersion.label}:${expected.ordinal}`);
    const bytes = statementUtf8ByteLength(actual);
    const sha = statementSha256(actual);
    if (bytes !== expected.utf8_bytes || sha !== expected.sha256) {
      throw new Error(`STATEMENT_FINGERPRINT_MISMATCH:${contractVersion.label}:${expected.ordinal}`);
    }
    if (expected.first160_escaped !== undefined) {
      if (!compareStatementSnippetToEvidence(actual.slice(0, 160), expected.first160_escaped)) {
        throw new Error(`FIRST160_MISMATCH:${contractVersion.label}:${expected.ordinal}`);
      }
    }
    if (expected.last160_escaped !== undefined) {
      const start = Math.max(0, actual.length - 160);
      if (!compareStatementSnippetToEvidence(actual.slice(start), expected.last160_escaped)) {
        throw new Error(`LAST160_MISMATCH:${contractVersion.label}:${expected.ordinal}`);
      }
    }
  }

  if (migrationEvidence.first_statement_full_escaped !== undefined && statements[0] !== undefined) {
    if (!compareStatementSnippetToEvidence(statements[0], migrationEvidence.first_statement_full_escaped)) {
      throw new Error(`FIRST_FULL_MISMATCH:${contractVersion.label}`);
    }
  }
  if (migrationEvidence.last_statement_full_escaped !== undefined) {
    const last = statements[statements.length - 1];
    if (!compareStatementSnippetToEvidence(last, migrationEvidence.last_statement_full_escaped)) {
      throw new Error(`LAST_FULL_MISMATCH:${contractVersion.label}`);
    }
  }

  return { statements, match: true };
}

function validateNormalization(
  label: VersionLabel,
  contractVersion: ContractVersion,
  statements: string[],
): {
  normalizedCompositeMatch: boolean;
  removedCompositeMatch: boolean;
  removedOrdinalsMatch: boolean;
  policy2PayloadValid: boolean;
} {
  const originalComposite = compositeStreamSha256(statements);
  if (originalComposite !== contractVersion.original_stream_composite_sha256) {
    throw new Error(`ORIGINAL_COMPOSITE_MISMATCH:${label}`);
  }

  const { normalized, removed, removedOrdinals } = applyOptionARemoval(label, statements);
  if (normalized.length !== contractVersion.normalized_statement_count) {
    throw new Error(`NORMALIZED_COUNT_MISMATCH:${label}`);
  }
  if (removed.length !== contractVersion.removed_token_count) {
    throw new Error(`REMOVED_COUNT_MISMATCH:${label}`);
  }

  const expectedRemoved = [...contractVersion.removed_token_ordinals].sort((a, b) => a - b);
  const actualRemoved = [...removedOrdinals].sort((a, b) => a - b);
  if (JSON.stringify(expectedRemoved) !== JSON.stringify(actualRemoved)) {
    throw new Error(`REMOVED_ORDINALS_MISMATCH:${label}`);
  }
  const authRemoved = [...removedOrdinalsForLabel(label)].sort((a, b) => a - b);
  if (JSON.stringify(authRemoved) !== JSON.stringify(actualRemoved)) {
    throw new Error(`OPTION_A_ORDINALS_MISMATCH:${label}`);
  }

  const normalizedComposite = compositeStreamSha256(normalized);
  if (normalizedComposite !== contractVersion.normalized_stream_composite_sha256) {
    throw new Error(`NORMALIZED_COMPOSITE_MISMATCH:${label}`);
  }

  const removedComposite = compositeStreamSha256(removed);
  if (removedComposite !== contractVersion.removed_token_stream_composite_sha256) {
    throw new Error(`REMOVED_COMPOSITE_MISMATCH:${label}`);
  }

  buildPolicy2HistoryPayload({
    version: contractVersion.version,
    name: contractVersion.name,
    normalizedStatements: normalized,
    expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
  });

  return {
    normalizedCompositeMatch: true,
    removedCompositeMatch: true,
    removedOrdinalsMatch: true,
    policy2PayloadValid: true,
  };
}

export type BindingFileIdentity = {
  path: string;
  bytes: number;
  sha256: string;
  classification: string;
};

export type StageABindingAddendum = {
  schema: string;
  schema_version: string;
  revision: string;
  status: string;
  authority_role: string;
  execution_status: string;
  execution_authorization: boolean;
  remote_apply_authorization: boolean;
  local_db_authorization: boolean;
  implementation_authorization: boolean;
  plan_only_pass_is_not_execution_authorization: boolean;
  external_plan_attestation_required: boolean;
  external_execution_attestation_required: boolean;
  no_automatic_next_gate: boolean;
  parent_authority: {
    contract: BindingFileIdentity;
    matrix: BindingFileIdentity;
    parser_evidence: BindingFileIdentity;
  };
  contract_revision_fulfillment: {
    satisfies_head_change_requires_contract_revision: boolean;
    trigger: string;
    frozen_source_authority_head: string;
    baseline_stage_a_commit: string;
    does_not_mutate_revision_7_bytes: boolean;
    supersedes_plan_only_checks: string[];
    does_not_change_transaction_or_execution_semantics: boolean;
  };
  workspace_binding: {
    expected_repo_root: string;
    expected_branch: string;
    source_authority_base_commit: string;
    baseline_stage_a_commit: string;
    binding_policy_identifier: string;
  };
  generation_0_historical_identities: {
    anchor_commit: string;
    files: BindingFileIdentity[];
  };
  generation_1_protected_runtime_identities: {
    files: BindingFileIdentity[];
  };
  generation_1_review_evidence: {
    files: BindingFileIdentity[];
  };
  execution_identities: {
    approved_preview_target_fingerprint: string;
    executor_artifact_identity: string;
    execution_package_identity: string;
  };
  integrity: {
    self_commit_sha_forbidden: boolean;
    full_file_sha_self_reference_forbidden: boolean;
    canonical_serialization: string;
    canonical_payload_sha256: string;
    canonical_payload_exclusions: string[];
    canonical_payload_sha256_role: string;
    external_full_file_sha_attestation_required: boolean;
  };
};

export type StageABindingValidation = {
  addendum: StageABindingAddendum;
  canonicalPayloadSha256: string;
};

export type ExternalPlanAttestation = {
  schema: string;
  revision: string;
  execution_status: string;
  authority_role: string;
  rebind_commit_sha: string;
  binding_addendum_full_file_sha256: string;
  binding_addendum_canonical_payload_sha256: string;
  attestation_scope: string;
  execution_authorization: boolean;
  remote_apply_authorization: boolean;
  local_db_authorization: boolean;
};

function canonicalSerialize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalSerialize(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key])}`).join(',')}}`;
}

export function computeCanonicalPayloadSha256(addendum: StageABindingAddendum): string {
  const clone = structuredClone(addendum) as StageABindingAddendum;
  const integrityRecord = { ...clone.integrity } as Record<string, unknown>;
  delete integrityRecord.canonical_payload_sha256;
  const payload = {
    ...clone,
    integrity: integrityRecord,
  };
  const serialized = canonicalSerialize(payload);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/** Test-only comparator proving blank substitution is not accepted exclusion semantics. */
export function computeCanonicalPayloadSha256WithBlankSubstitution(addendum: StageABindingAddendum): string {
  const clone = structuredClone(addendum) as StageABindingAddendum;
  clone.integrity.canonical_payload_sha256 = '';
  const serialized = canonicalSerialize(clone);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

function readBindingAddendumJson(repoRoot: string): StageABindingAddendum {
  const abs = join(repoRoot, STAGE_A_BINDING_ADDENDUM_REL_PATH);
  if (!existsSync(abs)) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MISSING');
  }
  return JSON.parse(readFileSync(abs, 'utf8')) as StageABindingAddendum;
}

function validateBindingFileIdentityAgainstLive(
  repoRoot: string,
  expected: BindingFileIdentity,
  errorCode: 'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH' | 'STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH',
): void {
  const actual = sha256File(join(repoRoot, expected.path));
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(errorCode);
  }
}

function validateExactIdentityRegistry(
  actual: readonly BindingFileIdentity[],
  expected: readonly ExpectedBindingFileIdentity[],
  errorCode:
    | 'STAGE_A_BINDING_GEN0_HISTORICAL_IDENTITY_MISMATCH'
    | 'STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH'
    | 'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH',
): void {
  if (actual.length !== expected.length) {
    throw new Error(errorCode);
  }
  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (!exp || !act) {
      throw new Error(errorCode);
    }
    if (
      act.path !== exp.path ||
      act.bytes !== exp.bytes ||
      act.sha256 !== exp.sha256 ||
      act.classification !== exp.classification
    ) {
      throw new Error(errorCode);
    }
  }
}

function validateIntegrityBlockExact(addendum: StageABindingAddendum): void {
  const integrity = addendum.integrity;
  if (integrity.self_commit_sha_forbidden !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.full_file_sha_self_reference_forbidden !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.canonical_serialization !== 'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.canonical_payload_exclusions.length !== 1) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.canonical_payload_exclusions[0] !== '/integrity/canonical_payload_sha256') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.canonical_payload_sha256_role !== 'ACCIDENTAL_INTERNAL_CORRUPTION_DETECTION_ONLY') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (integrity.external_full_file_sha_attestation_required !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
}

function validateContractRevisionFulfillmentExact(addendum: StageABindingAddendum): void {
  const fulfillment = addendum.contract_revision_fulfillment;
  if (fulfillment.satisfies_head_change_requires_contract_revision !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (fulfillment.trigger !== 'workspace_implementation_head_advanced_beyond_frozen_source_authority_head') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (fulfillment.frozen_source_authority_head !== EXPECTED_SOURCE_AUTHORITY_BASE) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (fulfillment.baseline_stage_a_commit !== BASELINE_STAGE_A_COMMIT) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (fulfillment.does_not_mutate_revision_7_bytes !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (fulfillment.does_not_change_transaction_or_execution_semantics !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (
    fulfillment.supersedes_plan_only_checks.length !== 1 ||
    fulfillment.supersedes_plan_only_checks[0] !== 'repo_root_branch_head_exact'
  ) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
}

function validateParentAuthorityClassificationsExact(addendum: StageABindingAddendum): void {
  if (addendum.parent_authority.contract.classification !== 'authority_contract') {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
  if (addendum.parent_authority.matrix.classification !== 'authority_matrix') {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
  if (addendum.parent_authority.parser_evidence.classification !== 'authority_parser_evidence') {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
}

function assertBindingParentAuthority(addendum: StageABindingAddendum): void {
  const contract = addendum.parent_authority.contract;
  const matrix = addendum.parent_authority.matrix;
  const parserEvidence = addendum.parent_authority.parser_evidence;
  validateParentAuthorityClassificationsExact(addendum);
  if (
    contract.path !== AUTHORITY_CONTRACT_REL_PATH ||
    contract.bytes !== AUTHORITY_FILE_EXPECTATIONS.contract.bytes ||
    contract.sha256 !== AUTHORITY_FILE_EXPECTATIONS.contract.sha256
  ) {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
  if (
    matrix.path !== AUTHORITY_MATRIX_REL_PATH ||
    matrix.bytes !== AUTHORITY_FILE_EXPECTATIONS.matrix.bytes ||
    matrix.sha256 !== AUTHORITY_FILE_EXPECTATIONS.matrix.sha256
  ) {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
  if (
    parserEvidence.path !== AUTHORITY_PARSER_EVIDENCE_REL_PATH ||
    parserEvidence.bytes !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.bytes ||
    parserEvidence.sha256 !== AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256
  ) {
    throw new Error('STAGE_A_BINDING_PARENT_AUTHORITY_MISMATCH');
  }
}

function assertAddendumSelfIdentityRules(addendum: StageABindingAddendum): void {
  const serialized = JSON.stringify(addendum);
  validateIntegrityBlockExact(addendum);
  if (serialized.includes('full_file_sha256') || serialized.includes('git_blob') || serialized.includes('git_commit_sha')) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  for (const file of addendum.generation_1_protected_runtime_identities.files) {
    if (file.path === STAGE_A_BINDING_ADDENDUM_REL_PATH) {
      throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
    }
  }
}

function validateGeneration1ProtectedStructure(addendum: StageABindingAddendum): void {
  const protectedFiles = addendum.generation_1_protected_runtime_identities.files;
  const expectedProtectedPaths = [
    AUTHORITY_CONTRACT_REL_PATH,
    AUTHORITY_MATRIX_REL_PATH,
    AUTHORITY_PARSER_EVIDENCE_REL_PATH,
    'lib/m55/transactionNormalized/splitAndTrim.ts',
    'lib/m55/transactionNormalized/statementStream.ts',
    GEN1_REBIND_CORE_REL_PATH,
    GEN1_REBIND_CLI_REL_PATH,
  ];
  if (protectedFiles.length !== expectedProtectedPaths.length) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  for (let i = 0; i < expectedProtectedPaths.length; i++) {
    if (protectedFiles[i]?.path !== expectedProtectedPaths[i]) {
      throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
    }
  }
  validateExactIdentityRegistry(
    protectedFiles.slice(0, 5),
    EXPECTED_IMMUTABLE_CARRY_FORWARD_IDENTITIES,
    'STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH',
  );
  const coreEntry = protectedFiles[5];
  const cliEntry = protectedFiles[6];
  if (!coreEntry || !cliEntry) {
    throw new Error('STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  }
  if (coreEntry.classification !== EXPECTED_GEN1_REBIND_MUTABLE_CLASSIFICATIONS.core) {
    throw new Error('STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  }
  if (cliEntry.classification !== EXPECTED_GEN1_REBIND_MUTABLE_CLASSIFICATIONS.cli) {
    throw new Error('STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  }
}

function validateReviewEvidenceExact(addendum: StageABindingAddendum): void {
  const reviewFiles = addendum.generation_1_review_evidence.files;
  if (reviewFiles.length !== 1) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  const reviewEntry = reviewFiles[0];
  if (!reviewEntry || reviewEntry.path !== GEN1_REVIEW_TEST_REL_PATH) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (reviewEntry.classification !== EXPECTED_GEN1_REBIND_MUTABLE_CLASSIFICATIONS.review) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
}

/** Shared semantic validator used by production loader and tests. */
export function validateStageABindingAddendumSemantics(addendum: StageABindingAddendum): string {
  if (addendum.schema !== 'm55.preview.transaction_normalized.stage_a_binding.v1') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.schema_version !== 'm55.preview.transaction_normalized.stage_a_binding.v1.draft') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.revision !== 'STAGE-A-BINDING-v1') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.status !== 'DRAFT') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.authority_role !== 'REVISION_7_STAGE_A_BINDING_CONTRACT_ADDENDUM') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.execution_status !== 'NOT EXECUTED') {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (
    addendum.execution_authorization !== false ||
    addendum.remote_apply_authorization !== false ||
    addendum.local_db_authorization !== false ||
    addendum.implementation_authorization !== false
  ) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.plan_only_pass_is_not_execution_authorization !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.external_plan_attestation_required !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.external_execution_attestation_required !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }
  if (addendum.no_automatic_next_gate !== true) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }

  assertBindingParentAuthority(addendum);
  assertAddendumSelfIdentityRules(addendum);
  validateContractRevisionFulfillmentExact(addendum);

  const workspace = addendum.workspace_binding;
  if (
    workspace.expected_repo_root !== EXPECTED_REPO_ROOT ||
    workspace.expected_branch !== EXPECTED_BRANCH ||
    workspace.source_authority_base_commit !== EXPECTED_SOURCE_AUTHORITY_BASE ||
    workspace.baseline_stage_a_commit !== BASELINE_STAGE_A_COMMIT ||
    workspace.binding_policy_identifier !== BINDING_POLICY_IDENTIFIER
  ) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }

  if (addendum.generation_0_historical_identities.anchor_commit !== BASELINE_STAGE_A_COMMIT) {
    throw new Error('STAGE_A_BINDING_GEN0_HISTORICAL_IDENTITY_MISMATCH');
  }
  validateExactIdentityRegistry(
    addendum.generation_0_historical_identities.files,
    EXPECTED_GENERATION0_BASELINE_IDENTITIES,
    'STAGE_A_BINDING_GEN0_HISTORICAL_IDENTITY_MISMATCH',
  );

  validateGeneration1ProtectedStructure(addendum);
  validateReviewEvidenceExact(addendum);

  if (
    addendum.execution_identities.approved_preview_target_fingerprint !== FINGERPRINT_PLACEHOLDER ||
    addendum.execution_identities.executor_artifact_identity !== FINGERPRINT_PLACEHOLDER ||
    addendum.execution_identities.execution_package_identity !== FINGERPRINT_PLACEHOLDER
  ) {
    throw new Error('STAGE_A_BINDING_ADDENDUM_MALFORMED');
  }

  const canonicalPayloadSha256 = computeCanonicalPayloadSha256(addendum);
  if (addendum.integrity.canonical_payload_sha256 !== canonicalPayloadSha256) {
    throw new Error('STAGE_A_BINDING_CANONICAL_PAYLOAD_MISMATCH');
  }

  return canonicalPayloadSha256;
}

export function loadStageABindingAddendum(repoRoot: string): StageABindingValidation {
  const addendum = readBindingAddendumJson(repoRoot);
  const canonicalPayloadSha256 = validateStageABindingAddendumSemantics(addendum);

  for (const file of EXPECTED_IMMUTABLE_CARRY_FORWARD_IDENTITIES) {
    validateBindingFileIdentityAgainstLive(repoRoot, file, 'STAGE_A_BINDING_IMMUTABLE_CARRY_FORWARD_MISMATCH');
  }

  const protectedFiles = addendum.generation_1_protected_runtime_identities.files;
  const coreEntry = protectedFiles[5];
  const cliEntry = protectedFiles[6];
  if (!coreEntry || !cliEntry) {
    throw new Error('STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  }
  validateBindingFileIdentityAgainstLive(repoRoot, coreEntry, 'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  validateBindingFileIdentityAgainstLive(repoRoot, cliEntry, 'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');

  for (const file of addendum.generation_1_review_evidence.files) {
    validateBindingFileIdentityAgainstLive(repoRoot, file, 'STAGE_A_BINDING_GEN1_PROTECTED_IDENTITY_MISMATCH');
  }

  return { addendum, canonicalPayloadSha256 };
}

export function isGitAncestor(repoRoot: string, ancestor: string, descendant: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${ancestor} ${descendant}`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function validateWorkspaceAncestryFromGit(repoRoot: string, currentHead: string): void {
  if (!isGitAncestor(repoRoot, EXPECTED_SOURCE_AUTHORITY_BASE, BASELINE_STAGE_A_COMMIT)) {
    throw new Error('STAGE_A_BINDING_BASELINE_ANCESTRY_FAILURE');
  }
  if (!isGitAncestor(repoRoot, BASELINE_STAGE_A_COMMIT, currentHead)) {
    throw new Error('STAGE_A_BINDING_IMPLEMENTATION_ANCESTRY_FAILURE');
  }
}

/** Later-gate pure verifier — not wired to public PLAN_ONLY_PASS in this implementation. */
export function verifyExternalPlanAttestation(
  attestation: ExternalPlanAttestation,
  expected: {
    rebindCommitSha: string;
    addendumFullFileSha256: string;
    addendumCanonicalPayloadSha256: string;
  },
): 'PASS' | 'HOLD' {
  if (attestation.authority_role !== 'STAGE_A_PLAN_ONLY_REVIEW_ATTESTATION') {
    return 'HOLD';
  }
  if (attestation.execution_status !== 'NOT EXECUTED') {
    return 'HOLD';
  }
  if (
    attestation.execution_authorization !== false ||
    attestation.remote_apply_authorization !== false ||
    attestation.local_db_authorization !== false
  ) {
    return 'HOLD';
  }
  if (attestation.attestation_scope !== 'PLAN_ONLY_SOURCE_VALIDATION') {
    return 'HOLD';
  }
  if (attestation.rebind_commit_sha !== expected.rebindCommitSha) {
    return 'HOLD';
  }
  if (attestation.binding_addendum_full_file_sha256 !== expected.addendumFullFileSha256) {
    return 'HOLD';
  }
  if (attestation.binding_addendum_canonical_payload_sha256 !== expected.addendumCanonicalPayloadSha256) {
    return 'HOLD';
  }
  return 'PASS';
}

function validateWorkspaceFactsAfterGit(workspace: WorkspaceFacts): void {
  if (workspace.branch !== EXPECTED_BRANCH) throw new Error('WORKSPACE_BRANCH_MISMATCH');
  if (!workspace.cleanWorktree || !workspace.cleanIndex) throw new Error('WORKSPACE_NOT_CLEAN');
}

function validateWorkspaceGate(repoRoot: string, workspace: WorkspaceFacts, requireGitAncestry: boolean): void {
  validateRepoRootGateBeforeGit(repoRoot);
  validateWorkspaceFactsAfterGit(workspace);
  if (requireGitAncestry) {
    validateWorkspaceAncestryFromGit(repoRoot, workspace.head);
  }
}

function validateStageABindingGate(repoRoot: string): StageABindingValidation {
  return loadStageABindingAddendum(repoRoot);
}

function executePlanCore(
  repoRoot: string,
  selected: VersionLabel[],
): {
  perVersionStatus: VersionValidationStatus[];
  authorityIdentities: PlanResult['authorityIdentities'];
} {
  const identities = validateAuthorityBytes(repoRoot);
  const authority = loadAuthorityBundle(repoRoot);
  const evidenceByVersion = new Map(
    authority.parserEvidence.migrations.map((row) => [row.version, row] as const),
  );
  const perVersionStatus: VersionValidationStatus[] = [];

  for (const contractVersion of authority.contract.versions) {
    if (!selected.includes(contractVersion.label)) continue;
    const migrationEvidence = evidenceByVersion.get(contractVersion.version);
    if (!migrationEvidence) throw new Error(`EVIDENCE_MISSING:${contractVersion.label}`);

    const { statements, match } = validateParserFingerprints(repoRoot, contractVersion, migrationEvidence);
    const normalization = validateNormalization(contractVersion.label, contractVersion, statements);

    perVersionStatus.push({
      label: contractVersion.label,
      version: contractVersion.version,
      name: contractVersion.name,
      sourceSha256Match: true,
      parserFingerprintMatch: match,
      originalCompositeMatch: true,
      normalizedCompositeMatch: normalization.normalizedCompositeMatch,
      removedCompositeMatch: normalization.removedCompositeMatch,
      removedOrdinalsMatch: normalization.removedOrdinalsMatch,
      policy2PayloadValid: normalization.policy2PayloadValid,
    });
  }

  return {
    perVersionStatus,
    authorityIdentities: {
      contractSha256: identities.contract.sha256,
      matrixSha256: identities.matrix.sha256,
      parserEvidenceSha256: identities.parserEvidence.sha256,
      revision: authority.contract.revision,
      executionStatus: authority.contract.execution_status,
    },
  };
}

function buildPlanEvidenceFields(
  binding?: StageABindingValidation,
): Pick<
  PlanResult,
  | 'sourceAuthorityBase'
  | 'baselineStageACommit'
  | 'bindingAddendumPath'
  | 'bindingAddendumCanonicalPayloadSha256'
  | 'planOnlyPassIsNotExecutionAuthorization'
  | 'executionRemainsLocked'
  | 'externalPlanAttestationRequired'
> {
  return {
    sourceAuthorityBase: EXPECTED_SOURCE_AUTHORITY_BASE,
    baselineStageACommit: BASELINE_STAGE_A_COMMIT,
    bindingAddendumPath: STAGE_A_BINDING_ADDENDUM_REL_PATH,
    bindingAddendumCanonicalPayloadSha256: binding?.canonicalPayloadSha256,
    planOnlyPassIsNotExecutionAuthorization: true,
    executionRemainsLocked: true,
    externalPlanAttestationRequired: true,
  };
}

function buildHoldResult(
  selectedVersions: VersionLabel[],
  holdReasonCode: string,
  binding?: StageABindingValidation,
): PlanResult {
  const bindingValidated = binding !== undefined;
  return {
    mode: STAGE_A_MODE,
    coreValidation: 'PRE_DB_HOLD',
    executionState: 'EXECUTION_LOCKED',
    selectedVersions,
    authorityIdentities: {
      contractSha256: AUTHORITY_FILE_EXPECTATIONS.contract.sha256,
      matrixSha256: AUTHORITY_FILE_EXPECTATIONS.matrix.sha256,
      parserEvidenceSha256: AUTHORITY_FILE_EXPECTATIONS.parserEvidence.sha256,
      revision: 'REVISION-7',
      executionStatus: 'NOT EXECUTED',
    },
    perVersionStatus: [],
    stageBBlockers: bindingValidated ? [...STAGE_B_EXECUTION_BLOCKERS] : [...STAGE_B_BLOCKERS],
    executionLock: STAGE_A_EXECUTION_LOCK,
    targetFingerprintReadiness: 'REQUIRED_NOT_FROZEN',
    holdReasonCode: sanitizeHoldReasonCode(holdReasonCode),
    ...buildPlanEvidenceFields(binding),
  };
}

function buildStructuralHoldResult(
  selectedVersions: VersionLabel[],
  perVersionStatus: VersionValidationStatus[],
  authorityIdentities: PlanResult['authorityIdentities'],
  binding: StageABindingValidation,
): PlanResult {
  return {
    mode: STAGE_A_MODE,
    coreValidation: 'PLAN_ONLY_HOLD_EXTERNAL_ATTESTATION_REQUIRED',
    structuralValidation: 'PLAN_STRUCTURE_VALIDATED',
    executionState: 'EXECUTION_LOCKED',
    selectedVersions,
    authorityIdentities,
    perVersionStatus,
    stageBBlockers: [...STAGE_B_EXECUTION_BLOCKERS],
    executionLock: STAGE_A_EXECUTION_LOCK,
    targetFingerprintReadiness: 'REQUIRED_NOT_FROZEN',
    holdReasonCode: PLAN_ONLY_EXTERNAL_ATTESTATION_HOLD,
    ...buildPlanEvidenceFields(binding),
  };
}

// PURE_TEST_AND_POST_VALIDATION_HELPER_NOT_A_WORKSPACE_GATE
export function evaluatePlanCoreFromValidatedWorkspaceFacts(
  input: TransactionNormalizedPlanInput,
  workspace: WorkspaceFacts,
): PlanCoreEvaluationResult {
  const selector = parsePlanVersionSelector(String(input.planVersionSelector));
  if (selector === null) {
    return {
      coreValidation: 'PRE_DB_HOLD',
      selectedVersions: [],
      perVersionStatus: [],
      holdReasonCode: 'PLAN_SELECTOR_INVALID',
      evaluatedFromValidatedWorkspaceFacts: true,
      actualGitInspectionPerformed: false,
      ancestryValidationPerformed: false,
    };
  }

  const selected = expandPlanSelector(selector);
  try {
    const repoRoot = resolve(input.repoRoot);
    validateWorkspaceGate(repoRoot, workspace, false);
    const binding = validateStageABindingGate(repoRoot);
    const core = executePlanCore(repoRoot, selected);
    return {
      coreValidation: 'PURE_BINDING_AND_CORE_VALIDATED_WITHOUT_GIT_ANCESTRY',
      selectedVersions: selected,
      perVersionStatus: core.perVersionStatus,
      evaluatedFromValidatedWorkspaceFacts: true,
      actualGitInspectionPerformed: false,
      ancestryValidationPerformed: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_HOLD';
    return {
      coreValidation: 'PRE_DB_HOLD',
      selectedVersions: selected,
      perVersionStatus: [],
      holdReasonCode: sanitizeHoldReasonCode(message),
      evaluatedFromValidatedWorkspaceFacts: true,
      actualGitInspectionPerformed: false,
      ancestryValidationPerformed: false,
    };
  }
}

export function formatRedactedPlanEvidence(result: PlanResult): string {
  const payload = {
    mode: result.mode,
    coreValidation: result.coreValidation,
    structuralValidation: result.structuralValidation,
    executionState: result.executionState,
    selectedVersions: result.selectedVersions,
    authorityIdentities: result.authorityIdentities,
    perVersionStatus: result.perVersionStatus.map((row) => ({
      label: row.label,
      version: row.version,
      name: row.name,
      sourceSha256Match: row.sourceSha256Match,
      parserFingerprintMatch: row.parserFingerprintMatch,
      originalCompositeMatch: row.originalCompositeMatch,
      normalizedCompositeMatch: row.normalizedCompositeMatch,
      removedCompositeMatch: row.removedCompositeMatch,
      removedOrdinalsMatch: row.removedOrdinalsMatch,
      policy2PayloadValid: row.policy2PayloadValid,
    })),
    stageBBlockers: result.stageBBlockers,
    executionLock: result.executionLock,
    targetFingerprintReadiness: result.targetFingerprintReadiness,
    holdReasonCode: result.holdReasonCode,
    sourceAuthorityBase: result.sourceAuthorityBase,
    baselineStageACommit: result.baselineStageACommit,
    bindingAddendumPath: result.bindingAddendumPath,
    bindingAddendumCanonicalPayloadSha256: result.bindingAddendumCanonicalPayloadSha256,
    planOnlyPassIsNotExecutionAuthorization: result.planOnlyPassIsNotExecutionAuthorization,
    executionRemainsLocked: result.executionRemainsLocked,
    externalPlanAttestationRequired: result.externalPlanAttestationRequired,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function assertNoDbTransportInstantiation(value: DbTransport | undefined): void {
  if (value !== undefined) {
    throw new Error('DB_TRANSPORT_INSTANTIATION_FORBIDDEN');
  }
}

export function runTransactionNormalizedPlan(input: TransactionNormalizedPlanInput): PlanResult {
  const selector = parsePlanVersionSelector(String(input.planVersionSelector));
  if (selector === null) {
    return buildHoldResult([], 'PLAN_SELECTOR_INVALID');
  }

  const selected = expandPlanSelector(selector);

  try {
    const repoRoot = resolve(input.repoRoot);
    validateRepoRootGateBeforeGit(repoRoot);
    const workspace = readWorkspaceFacts(repoRoot);
    validateWorkspaceGate(repoRoot, workspace, true);
    const binding = validateStageABindingGate(repoRoot);
    const core = executePlanCore(repoRoot, selected);

    return buildStructuralHoldResult(selected, core.perVersionStatus, core.authorityIdentities, binding);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_HOLD';
    return buildHoldResult(selected, message);
  }
}

export type { Policy2HistoryPayload };
