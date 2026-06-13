export const PREVIEW_REMOTE_APPLY_HOLD_CODES = [
  'HOLD_REPO_IDENTITY_MISMATCH',
  'HOLD_AUTHORITY_IDENTITY_MISMATCH',
  'HOLD_MIGRATION_IDENTITY_MISMATCH',
  'HOLD_NORMALIZED_STREAM_MISMATCH',
  'HOLD_INVALID_HISTORY_PREFIX',
  'HOLD_BOOTSTRAP_PRECONDITION',
  'HOLD_TIMEOUT_POLICY',
  'HOLD_RUNTIME_PROBE_REGISTRY',
  'HOLD_TARGET_FINGERPRINT_INCOMPLETE',
  'HOLD_TARGET_IDENTITY_MISMATCH',
  'HOLD_TARGET_PRODUCTION_FORBIDDEN',
  'HOLD_CREDENTIAL_METHOD_INVALID',
  'HOLD_EXECUTION_NOT_AUTHORIZED',
  'HOLD_UNEXPECTED_INTERNAL',
] as const;

export type PreviewRemoteApplyHoldCode = (typeof PREVIEW_REMOTE_APPLY_HOLD_CODES)[number];

const HOLD_CODE_SET = new Set<string>(PREVIEW_REMOTE_APPLY_HOLD_CODES);

export function sanitizePreviewRemoteApplyHoldCode(value: unknown): PreviewRemoteApplyHoldCode {
  if (typeof value === 'string' && HOLD_CODE_SET.has(value)) {
    return value as PreviewRemoteApplyHoldCode;
  }
  return 'HOLD_UNEXPECTED_INTERNAL';
}

export type PhaseId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
export type StepId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export type CredentialMethodId =
  | 'SECURE_STDIN_CONNECTION_CONFIG_v1'
  | 'TEMP_PGPASSFILE_0600_v1';

export const CREDENTIAL_METHOD_IDS: readonly CredentialMethodId[] = [
  'SECURE_STDIN_CONNECTION_CONFIG_v1',
  'TEMP_PGPASSFILE_0600_v1',
];

export const APPROVED_PREVIEW_ORGANIZATION = 'm55-preview' as const;
export const APPROVED_PREVIEW_PROJECT = 'm55-soul-preview' as const;
export const APPROVED_PREVIEW_DATABASE_TIER = 'Primary Database' as const;
export const FORBIDDEN_PRODUCTION_ORGANIZATION = 'm55-soul' as const;
export const FORBIDDEN_PRODUCTION_PROJECT = 'm55-soul-core' as const;

export const EXPECTED_REPO_ROOT = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1' as const;
export const EXPECTED_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;
export const REPOSITORY_FACTS_SOURCE = 'GIT_READ_ONLY_PREFLIGHT' as const;

export const HISTORY_INSERT_SQL_METADATA =
  'INSERT INTO supabase_migrations.schema_migrations (version, statements, name) VALUES ($1, $2::text[], $3)' as const;

export const P0_PREFLIGHT_PATCH2_AUTHORITY = {
  filename: 'M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql',
  bytes: 21188,
  sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
} as const;

export const EXPECTED_NORMALIZED_STATEMENT_COUNTS: Readonly<Record<StepId, number>> = {
  P1: 207,
  P2: 4,
  P3: 7,
  P4: 7,
  P5: 1,
  P6: 1,
  P7: 1,
};

export const REMOTE_BOOTSTRAP_OBSERVATION_STATUS =
  'NOT_OBSERVED_REMOTE_READ_ONLY_RECHECK_REQUIRED' as const;

export type RepositoryIdentityFacts = {
  readonly repoRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly treeSha: string;
  readonly trackedWorktreeClean: boolean;
  readonly indexEmpty: boolean;
  readonly factsSource: typeof REPOSITORY_FACTS_SOURCE;
};

export type TargetIdentityBinding = {
  readonly organization: string;
  readonly project: string;
  readonly databaseTier: string;
  readonly projectRef: string;
  readonly hostFingerprintSha256: string;
  readonly credentialMethod: CredentialMethodId;
};

export type TargetIdentityFacts = {
  readonly organization: string;
  readonly project: string;
  readonly databaseTier: string;
  readonly projectRef: string | null;
  readonly hostFingerprintSha256: string | null;
};

export type P1HistoryBootstrapObservedFacts = {
  readonly classification: string;
  readonly historySchemaExists: boolean;
  readonly historyRelationExists: boolean;
  readonly stopRequired: boolean;
};

export type BootstrapPreconditionBinding = {
  readonly requiredPreconditionIdentifier: string;
  readonly remoteObservationStatus: typeof REMOTE_BOOTSTRAP_OBSERVATION_STATUS;
  readonly p0PreflightAuthority: typeof P0_PREFLIGHT_PATCH2_AUTHORITY;
};

export type MigrationSourceIdentity = {
  readonly stepId: StepId;
  readonly phaseId: PhaseId;
  readonly version: string;
  readonly name: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
};

export type NormalizedStreamIdentity = {
  readonly stepId: StepId;
  readonly statementCount: number;
  readonly normalizedStreamCompositeSha256: string;
  readonly serialization: 'm55.statement_stream.u64be_length_utf8.v1';
};

export type Policy2HistoryFacts = {
  readonly version: string;
  readonly name: string;
  readonly statementCount: number;
  readonly normalizedStreamCompositeSha256: string;
  readonly serialization: 'm55.statement_stream.u64be_length_utf8.v1';
  readonly parameterizedInsertShape: typeof HISTORY_INSERT_SQL_METADATA;
};

export type DeterministicPlanStep = {
  readonly stepId: StepId;
  readonly phaseId: PhaseId;
  readonly migration: MigrationSourceIdentity;
  readonly normalizedStream: NormalizedStreamIdentity;
  readonly historyPayload: Policy2HistoryFacts;
  readonly bootstrapSpecId: string | null;
  readonly priorProbeId: string;
  readonly postProbeId: string;
};

export type PreviewRemoteApplyPlanInput = {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly target: TargetIdentityFacts;
  readonly credentialMethod: CredentialMethodId;
  readonly executionEnablement: false;
};

export type ExecutionDisablementFlags = {
  readonly executionAuthorized: false;
  readonly remoteConnectionAttempted: false;
  readonly sqlExecuted: false;
  readonly migrationApplyAuthorized: false;
  readonly productionAccessAuthorized: false;
  readonly automaticNextGate: false;
  readonly transportCallCount: 0;
};

export type PreviewRemoteApplyPlanSuccess = ExecutionDisablementFlags & {
  readonly mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN';
  readonly holdReasonCode: null;
  readonly repository: RepositoryIdentityFacts;
  readonly target: TargetIdentityBinding;
  readonly bootstrapPrecondition: BootstrapPreconditionBinding;
  readonly bootstrapSpecId: string;
  readonly bootstrapSpecCanonicalPayloadSha256: string;
  readonly timeoutPolicyId: string;
  readonly timeoutPolicyCanonicalPayloadSha256: string;
  readonly runtimeProbeRegistryId: string;
  readonly runtimeProbeRegistryCanonicalPayloadSha256: string;
  readonly steps: readonly DeterministicPlanStep[];
};

export type PreviewRemoteApplyPlanHold = ExecutionDisablementFlags & {
  readonly mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD';
  readonly holdReasonCode: PreviewRemoteApplyHoldCode;
};

export type PreviewRemoteApplyPlanResult = PreviewRemoteApplyPlanSuccess | PreviewRemoteApplyPlanHold;

export type PlanCliPublicOutput = PreviewRemoteApplyPlanResult;

export type ExecutionAuthority = {
  readonly __executionAuthorityBrand: unique symbol;
};

export function canonicalSerializePreviewRemoteApply(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalSerializePreviewRemoteApply(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalSerializePreviewRemoteApply(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}
