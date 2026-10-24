import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  EXPECTED_CURRENT_USER,
  EXPECTED_DATABASE_NAME,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
  validateCredentialMethodSelection,
} from './remoteConnectionAuthority.ts';
import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  FORBIDDEN_PRODUCTION_ORGANIZATION,
  FORBIDDEN_PRODUCTION_PROJECT,
  type CredentialMethodId,
} from './types.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_BRANCH,
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_IDENTITY_MIGRATION_NAME,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_IDENTITY_MIGRATION_VERSION,
  PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
  PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
  PAIR_P5_IDENTITY_STEP_ID,
} from './pairP5IdentityStepAuthority.ts';
import {
  type PairP5SignedHumanPreviewUiAttestation,
  PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS,
  verifyPairP5SignedHumanPreviewUiAttestation,
  verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt,
  digestPairP5HumanAttestationIdentity,
  HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN,
  HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID,
  HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED,
  type PairP5HumanPreviewUiAttestationPurpose,
  type PairP5HumanPreviewUiAttestationPayload,
  type PairP5HumanAttestationTrustAnchor,
} from './pairP5HumanPreviewUiAttestation.ts';
import {
  claimPairP5DedicatedReceiptAtomicOneUse,
  digestPairP5HumanAuthorizationIdentity,
  type PairP5DedicatedReceiptConsumptionBinding,
  HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID,
  HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN,
  PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID,
  validatePairP5DedicatedReceiptConsumptionBinding,
} from './pairP5DedicatedReceiptConsumptionLedger.ts';

export const PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD =
  'SECURE_STDIN_CONNECTION_CONFIG_v1' as const satisfies CredentialMethodId;

export const PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID =
  'M55_PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_v1' as const;

/** Process-local anti-replay only; NOT durable across processes or real execution. */
export const PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_REGISTRY_SCOPE =
  'PROCESS_LOCAL_TEST_ONLY_NOT_DURABLE' as const;

export const HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING = 'HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_REPLAY = 'HOLD_PAIR_P5_DEDICATED_RECEIPT_REPLAY' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN' as const;
export const HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID =
  'HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID' as const;
export const HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED =
  'HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED' as const;
export const HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED =
  'HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED' as const;
export const HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID =
  'HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID' as const;
export const HOLD_PAIR_P5_DURABLE_RECEIPT_REPLAY_AUTHORITY_UNAVAILABLE =
  'HOLD_PAIR_P5_DURABLE_RECEIPT_REPLAY_AUTHORITY_UNAVAILABLE' as const;
export const HOLD_PAIR_P5_OPERATIONAL_INDEPENDENT_WITNESS_NOT_ACCEPTED =
  'HOLD_PAIR_P5_OPERATIONAL_INDEPENDENT_WITNESS_NOT_ACCEPTED' as const;
export const HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED =
  'HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_FRESH_CONTEXT_UNAVAILABLE =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_FRESH_CONTEXT_UNAVAILABLE' as const;
export const HOLD_PAIR_P5_OPERATIONAL_RECEIPT_PREFLIGHT_TRUST_ANCHOR_UNAVAILABLE =
  'HOLD_PAIR_P5_OPERATIONAL_RECEIPT_PREFLIGHT_TRUST_ANCHOR_UNAVAILABLE' as const;
export const HOLD_PAIR_P5_OPERATIONAL_RECEIPT_HUMAN_AUTHORIZATION_REQUIRED =
  'HOLD_PAIR_P5_OPERATIONAL_RECEIPT_HUMAN_AUTHORIZATION_REQUIRED' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID' as const;
export const HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_READ_FAILED =
  'HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_READ_FAILED' as const;

export const PAIR_P5_DEDICATED_RECEIPT_JSON_MAX_BYTES = 262_144 as const;

const FORBIDDEN_RECEIPT_KEY_FRAGMENTS = [
  'password',
  'secret',
  'token',
  'dsn',
  'credential',
  'private',
  'apikey',
  'api_key',
] as const;

const FORBIDDEN_KEY_FRAGMENT_ALLOWLIST = new Set<string>(['credentialMethod']);

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const RECEIPT_ENVELOPE_KEYS = new Set(['body', 'canonicalSerializationSha256', 'receiptIdentifierSha256']);
const RECEIPT_BODY_KEYS = new Set([
  'schemaId',
  'receiptClass',
  'selectedStep',
  'migrationVersion',
  'migrationName',
  'migrationSourceSha256',
  'normalizedStatementCount',
  'normalizedStreamCompositeSha256',
  'git',
  'previewOrganization',
  'previewProject',
  'previewProjectRef',
  'connectionEndpointProfile',
  'sessionPoolerHost',
  'hostFingerprintSha256',
  'connectionUser',
  'port',
  'sslmode',
  'tlsTrustProfile',
  'tlsServerName',
  'credentialMethod',
  'witnessedObservation',
  'humanAuthorizationId',
  'signedHumanPreviewUiAttestation',
]);
const GIT_PROVENANCE_KEYS = new Set([
  'worktreeRealpath',
  'branch',
  'headCommitSha',
  'treeSha',
  'indexHasEmptyIntentToAddPlaceholders',
  'worktreeContentPresent',
]);
const WITNESS_OBSERVATION_KEYS = new Set([
  'sourceKind',
  'witnessedOrganization',
  'witnessedProject',
  'witnessedProjectRef',
  'witnessedDatabaseTier',
  'witnessedDatabaseName',
  'observationTimeIso',
  'attestationId',
]);

const PAIR_P5_EXECUTOR_WORKTREE_PROBE_REL =
  'lib/m55/previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts' as const;

const PAIR_P5_TEST_ONLY_WITNESS_MAX_AGE_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const PAIR_P5_INDEPENDENT_UI_WITNESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Human UI screenshot review 2026-10-23 — contract fields, not live attestation. */
export const PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE = {
  witnessedOrganizationObserved: true as const,
  witnessedProjectObserved: true as const,
  witnessedProjectRefObserved: true as const,
  witnessedDatabaseTierObserved: true as const,
  witnessedDatabaseNameUiObserved: false as const,
} as const;

export const PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL =
  'M55_PREVIEW_UI_DATABASE_NAME_NOT_INDEPENDENTLY_OBSERVED_v1' as const;

export const PAIR_P5_INDEPENDENT_PREVIEW_UI_ATTESTATION_ID_PREFIX =
  'INDEPENDENT_PREVIEW_UI_WITNESS_' as const;

const independentPreviewUiAttestationRegistry = new Set<string>();

export function resetPairP5IndependentPreviewUiAttestationRegistryForTestsOnly(): void {
  independentPreviewUiAttestationRegistry.clear();
}

export function registerPairP5IndependentPreviewUiAttestationForTestsOnly(attestationId: string): void {
  independentPreviewUiAttestationRegistry.add(attestationId);
}

export type PairP5HumanPreviewApplyAuthorizationPurpose = 'LIVE_MUTATION' | 'LIVE_FRESH_READONLY';

export type PairP5HumanPreviewApplyAuthorizationRecord = {
  readonly authorizationId: string;
  readonly purpose: PairP5HumanPreviewApplyAuthorizationPurpose;
  readonly selectedStep: typeof PAIR_P5_IDENTITY_STEP_ID;
  readonly migrationSourceSha256: typeof PAIR_P5_IDENTITY_MIGRATION_SHA256;
  readonly previewProjectRef: typeof PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
};

const humanPreviewApplyAuthorizationRegistry = new Map<string, PairP5HumanPreviewApplyAuthorizationRecord>();

export function resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly(): void {
  humanPreviewApplyAuthorizationRegistry.clear();
}

export function registerPairP5HumanPreviewApplyAuthorizationForTestsOnly(
  record: PairP5HumanPreviewApplyAuthorizationRecord,
): void {
  humanPreviewApplyAuthorizationRegistry.set(record.authorizationId, record);
}

export type PairP5DurableReceiptConsumptionClaimResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_REPLAY_AUTHORITY_UNAVAILABLE
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED
        | typeof HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID
        | typeof HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN;
    };

export const PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_AUTHORITY_STATUS =
  'LOCAL_CONTRACT_POSTGRES_LEDGER_MIGRATION_DRAFT_NOT_APPLIED' as const;

export { PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID };
export { HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED } from './pairP5HumanPreviewUiAttestation.ts';
export {
  HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID,
  HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN,
} from './pairP5DedicatedReceiptConsumptionLedger.ts';

/** Operational Human Ed25519 issuer wired; LIVE still requires valid signed attestation + receipt. */
export const PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE = true as const;

export const PAIR_P5_LIVE_PRE_CREDENTIAL_BOUNDARY_STEP_ORDER = [
  'FRESH_GIT_AND_MIGRATION_PINS',
  'DEDICATED_RECEIPT_PRESENT',
  'OPERATIONAL_INDEPENDENT_PREVIEW_UI_WITNESS',
  'PURPOSE_SCOPED_HUMAN_AUTHORIZATION',
  'DEDICATED_RECEIPT_POLICY_PREFLIGHT_NON_CONSUMING',
  'LIVE_CREDENTIAL_ACQUISITION_EXTERNAL_GATE',
] as const;

export const PAIR_P5_POST_CONNECT_MUTATION_TRANSACTION_STEP_ORDER = [
  'CREDENTIAL_ACQUISITION_AND_TLS_CONNECT',
  'POST_CONNECT_PINNED_TARGET_VERIFICATION',
  'DURABLE_LEDGER_ATOMIC_CLAIM_WITHIN_SAME_PG_TRANSACTION',
  'P5_1_IDENTITY_DDL_AND_MIGRATION_HISTORY',
  'COMMIT_OR_ROLLBACK_NO_AMBIGUOUS_RETRY',
] as const;

let pairP5DurableReceiptClaimAttemptCountForTestsOnly = 0;

export function resetPairP5DurableReceiptClaimAttemptCountForTestsOnly(): void {
  pairP5DurableReceiptClaimAttemptCountForTestsOnly = 0;
}

export function getPairP5DurableReceiptClaimAttemptCountForTestsOnly(): number {
  return pairP5DurableReceiptClaimAttemptCountForTestsOnly;
}

export function claimPairP5DurableDedicatedReceiptOneTimeUse(
  input: string | PairP5DedicatedReceiptConsumptionBinding,
): PairP5DurableReceiptConsumptionClaimResult {
  pairP5DurableReceiptClaimAttemptCountForTestsOnly += 1;
  const binding: PairP5DedicatedReceiptConsumptionBinding =
    typeof input === 'string'
      ? {
          receiptIdentifierSha256: input,
          previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
          selectedStep: PAIR_P5_IDENTITY_STEP_ID,
          operationPurpose: 'LIVE_MUTATION',
          attestationIdentityDigestSha256: createHash('sha256')
            .update('PAIR_P5_LEGACY_SINGLE_ARG_CLAIM', 'utf8')
            .digest('hex'),
          humanAuthorizationIdentityDigestSha256: digestPairP5HumanAuthorizationIdentity(null),
        }
      : input;
  const claimed = claimPairP5DedicatedReceiptAtomicOneUse(binding);
  if (!claimed.ok) {
    return claimed;
  }
  return { ok: true };
}

export function buildPairP5DedicatedReceiptConsumptionBinding(input: {
  readonly receiptIdentifierSha256: string;
  readonly operationPurpose: PairP5HumanPreviewApplyAuthorizationPurpose;
  readonly attestationIdentityDigestSha256: string;
  readonly humanAuthorizationId: string | null | undefined;
}): PairP5DedicatedReceiptConsumptionBinding {
  return {
    receiptIdentifierSha256: input.receiptIdentifierSha256,
    previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    operationPurpose: input.operationPurpose,
    attestationIdentityDigestSha256: input.attestationIdentityDigestSha256,
    humanAuthorizationIdentityDigestSha256: digestPairP5HumanAuthorizationIdentity(
      input.humanAuthorizationId,
    ),
  };
}

export const PAIR_P5_LIVE_CREDENTIAL_PATH_ORDERING = [
  'FRESH_GIT_AND_MIGRATION_PINS',
  'INDEPENDENT_PREVIEW_UI_WITNESS',
  'PURPOSE_SCOPED_HUMAN_AUTHORIZATION',
  'DEDICATED_OPERATIONAL_RECEIPT_VALIDATION',
  'DURABLE_CROSS_PROCESS_ONE_USE_CLAIM',
  'SECURE_STDIN_CONNECTION_CONFIG_v1',
  'PINNED_SSL_TLS_AND_POST_CONNECT_GUARD',
  'P5_1_CONTROLLED_TRANSACTION_AND_FRESH_READONLY_CLASSIFIER',
] as const;

export type PairP5WitnessedPreviewObservationSourceKind =
  | 'TEST_ONLY_FIXTURE_v1'
  | 'INDEPENDENT_PREVIEW_UI_WITNESS_v1';

export type PairP5WitnessedPreviewObservation = {
  readonly sourceKind: PairP5WitnessedPreviewObservationSourceKind;
  readonly witnessedOrganization: string;
  readonly witnessedProject: string;
  readonly witnessedProjectRef: string;
  readonly witnessedDatabaseTier: string;
  readonly witnessedDatabaseName: string;
  readonly observationTimeIso: string;
  readonly attestationId: string;
};

export type PairP5DedicatedReceiptGitProvenance = {
  readonly worktreeRealpath: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly treeSha: string;
  readonly indexHasEmptyIntentToAddPlaceholders: boolean;
  readonly worktreeContentPresent: boolean;
};

export type PairP5DedicatedReceiptGitEvidenceKind =
  | 'GIT_READ_ONLY_OBSERVED'
  | 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL';

export type PairP5DedicatedTargetBindingReceiptClass = 'TEST_ONLY' | 'OPERATIONAL';

export type PairP5DedicatedTargetBindingReceiptBody = {
  readonly schemaId: typeof PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID;
  readonly receiptClass: PairP5DedicatedTargetBindingReceiptClass;
  readonly selectedStep: typeof PAIR_P5_IDENTITY_STEP_ID;
  readonly migrationVersion: typeof PAIR_P5_IDENTITY_MIGRATION_VERSION;
  readonly migrationName: typeof PAIR_P5_IDENTITY_MIGRATION_NAME;
  readonly migrationSourceSha256: typeof PAIR_P5_IDENTITY_MIGRATION_SHA256;
  readonly normalizedStatementCount: typeof PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT;
  readonly normalizedStreamCompositeSha256: typeof PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256;
  readonly git: PairP5DedicatedReceiptGitProvenance;
  readonly previewOrganization: string;
  readonly previewProject: string;
  readonly previewProjectRef: string;
  readonly connectionEndpointProfile: typeof SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE;
  readonly sessionPoolerHost: typeof SESSION_POOLER_HOST;
  readonly hostFingerprintSha256: typeof SESSION_POOLER_HOST_FINGERPRINT_SHA256;
  readonly connectionUser: string;
  readonly port: typeof EXPECTED_PORT;
  readonly sslmode: typeof EXPECTED_SSLMODE;
  readonly tlsTrustProfile: typeof TLS_TRUST_PROFILE;
  readonly tlsServerName: typeof SESSION_POOLER_TLS_SERVER_NAME;
  readonly credentialMethod: typeof PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD;
  readonly witnessedObservation: PairP5WitnessedPreviewObservation;
  readonly humanAuthorizationId: string | null;
  readonly signedHumanPreviewUiAttestation: PairP5SignedHumanPreviewUiAttestation | null;
};

export type PairP5DedicatedTargetBindingReceipt = {
  readonly body: PairP5DedicatedTargetBindingReceiptBody;
  readonly canonicalSerializationSha256: string;
  readonly receiptIdentifierSha256: string;
};

export type PairP5DedicatedReceiptFrozenPolicy = {
  readonly schemaId: typeof PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID;
  readonly selectedStep: typeof PAIR_P5_IDENTITY_STEP_ID;
  readonly migrationVersion: typeof PAIR_P5_IDENTITY_MIGRATION_VERSION;
  readonly migrationName: typeof PAIR_P5_IDENTITY_MIGRATION_NAME;
  readonly migrationSourceSha256: typeof PAIR_P5_IDENTITY_MIGRATION_SHA256;
  readonly normalizedStatementCount: typeof PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT;
  readonly normalizedStreamCompositeSha256: typeof PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256;
  readonly previewOrganization: typeof APPROVED_PREVIEW_ORGANIZATION;
  readonly previewProject: typeof APPROVED_PREVIEW_PROJECT;
  readonly previewProjectRef: typeof PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
  readonly connectionEndpointProfile: typeof SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE;
  readonly sessionPoolerHost: typeof SESSION_POOLER_HOST;
  readonly hostFingerprintSha256: typeof SESSION_POOLER_HOST_FINGERPRINT_SHA256;
  readonly connectionUser: string;
  readonly port: typeof EXPECTED_PORT;
  readonly sslmode: typeof EXPECTED_SSLMODE;
  readonly tlsTrustProfile: typeof TLS_TRUST_PROFILE;
  readonly tlsServerName: typeof SESSION_POOLER_TLS_SERVER_NAME;
  readonly credentialMethod: typeof PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD;
  readonly expectedBranch: typeof PAIR_P5_EXPECTED_BRANCH;
  readonly expectedWorktreeRealpath: typeof PAIR_P5_EXPECTED_REPO_ROOT;
};

export type PairP5DedicatedReceiptValidationContext = {
  readonly permitTestOnlyReceipt: boolean;
  readonly permitOperationalReceiptPreflight: boolean;
  readonly policy: PairP5DedicatedReceiptFrozenPolicy;
  readonly observedGit: PairP5DedicatedReceiptGitProvenance;
  readonly observedGitEvidenceKind: PairP5DedicatedReceiptGitEvidenceKind;
  readonly operationalTrustAnchorsOverrideForTestsOnly?: readonly PairP5HumanAttestationTrustAnchor[];
  readonly permitOperationalHumanAuthorizationRegistryForTestsOnly?: boolean;
};

export function withPairP5OperationalReceiptPreflightContext(
  context: PairP5DedicatedReceiptValidationContext,
): PairP5DedicatedReceiptValidationContext {
  return { ...context, permitOperationalReceiptPreflight: true };
}

export function withPairP5OperationalReceiptPreflightContextForTestsOnly(
  context: PairP5DedicatedReceiptValidationContext,
  input: {
    readonly trustAnchors: readonly PairP5HumanAttestationTrustAnchor[];
    readonly permitHumanAuthorizationRegistry: boolean;
  },
): PairP5DedicatedReceiptValidationContext {
  return {
    ...withPairP5OperationalReceiptPreflightContext(context),
    operationalTrustAnchorsOverrideForTestsOnly: input.trustAnchors,
    permitOperationalHumanAuthorizationRegistryForTestsOnly: input.permitHumanAuthorizationRegistry,
  };
}

const consumedReceiptIdentifiers = new Set<string>();

type PairP5DedicatedReceiptIssuanceOrigin =
  | 'FRESH_GIT_READ_ONLY_TEST_ONLY'
  | 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL'
  | 'HUMAN_AUTHORIZED_OPERATIONAL_ISSUANCE_EXTERNAL';

/** In-process issuance origin only; clones/reconstitutions are not registered. */
const receiptIssuanceOriginRegistry = new WeakMap<object, PairP5DedicatedReceiptIssuanceOrigin>();

function registerPairP5DedicatedReceiptIssuanceOrigin(
  receipt: PairP5DedicatedTargetBindingReceipt,
  origin: PairP5DedicatedReceiptIssuanceOrigin,
): void {
  receiptIssuanceOriginRegistry.set(receipt, origin);
}

function resolvePairP5DedicatedReceiptIssuanceOrigin(
  receipt: PairP5DedicatedTargetBindingReceipt,
): PairP5DedicatedReceiptIssuanceOrigin | null {
  return receiptIssuanceOriginRegistry.get(receipt) ?? null;
}

export function resetPairP5DedicatedReceiptConsumptionRegistryForTestsOnly(): void {
  consumedReceiptIdentifiers.clear();
}

export function registerPairP5DedicatedReceiptProcessLocalConsumptionForTestsOnly(
  receiptIdentifierSha256: string,
): void {
  if (/^[0-9a-f]{64}$/.test(receiptIdentifierSha256)) {
    consumedReceiptIdentifiers.add(receiptIdentifierSha256);
  }
}

export function wasPairP5DedicatedReceiptIssuedFromInjectedTestFixture(receipt: PairP5DedicatedTargetBindingReceipt): boolean {
  return resolvePairP5DedicatedReceiptIssuanceOrigin(receipt) === 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactAllowlistedKeys(value: Record<string, unknown>, allowlist: Set<string>): boolean {
  const keys = Object.keys(value);
  if (keys.length !== allowlist.size) {
    return false;
  }
  for (const key of keys) {
    if (DANGEROUS_OBJECT_KEYS.has(key) || !allowlist.has(key)) {
      return false;
    }
  }
  return true;
}

function assertNoForbiddenKeys(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => assertNoForbiddenKeys(entry));
  }
  if (!isPlainObject(value)) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) {
      return false;
    }
    const lower = key.toLowerCase();
    if (
      !FORBIDDEN_KEY_FRAGMENT_ALLOWLIST.has(key) &&
      FORBIDDEN_RECEIPT_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment))
    ) {
      return false;
    }
    const entryValue = value[key];
    if (typeof entryValue === 'string') {
      const valueLower = entryValue.toLowerCase();
      if (FORBIDDEN_RECEIPT_KEY_FRAGMENTS.some((fragment) => valueLower.includes(fragment))) {
        return false;
      }
    }
    if (!assertNoForbiddenKeys(entryValue)) {
      return false;
    }
  }
  return true;
}

function isStrictIso8601Utc(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  try {
    return new Date(parsed).toISOString() === value;
  } catch {
    return false;
  }
}

function gitExec(repoRoot: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0 || result.stdout === undefined || result.stdout === null) {
    throw new Error('GIT_READ_FAILED');
  }
  const trimmed = result.stdout.trim();
  if (trimmed.length === 0) {
    throw new Error('GIT_READ_EMPTY');
  }
  return trimmed;
}

export function buildPairP5DedicatedReceiptFrozenPolicyFromPinnedPairSource(): PairP5DedicatedReceiptFrozenPolicy {
  const connectionUser = expectedConnectionUserForProjectRef(PAIR_P5_APPROVED_PREVIEW_PROJECT_REF);
  return {
    schemaId: PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    migrationVersion: PAIR_P5_IDENTITY_MIGRATION_VERSION,
    migrationName: PAIR_P5_IDENTITY_MIGRATION_NAME,
    migrationSourceSha256: PAIR_P5_IDENTITY_MIGRATION_SHA256,
    normalizedStatementCount: PAIR_P5_IDENTITY_NORMALIZED_STATEMENT_COUNT,
    normalizedStreamCompositeSha256: PAIR_P5_IDENTITY_NORMALIZED_STREAM_COMPOSITE_SHA256,
    previewOrganization: APPROVED_PREVIEW_ORGANIZATION,
    previewProject: APPROVED_PREVIEW_PROJECT,
    previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    connectionEndpointProfile: SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
    sessionPoolerHost: SESSION_POOLER_HOST,
    hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
    connectionUser,
    port: EXPECTED_PORT,
    sslmode: EXPECTED_SSLMODE,
    tlsTrustProfile: TLS_TRUST_PROFILE,
    tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
    credentialMethod: PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
    expectedBranch: PAIR_P5_EXPECTED_BRANCH,
    expectedWorktreeRealpath: PAIR_P5_EXPECTED_REPO_ROOT,
  };
}

export function readPairP5DedicatedReceiptGitProvenance(repoRoot: string): PairP5DedicatedReceiptGitProvenance {
  const top = realpathSync(gitExec(repoRoot, ['rev-parse', '--show-toplevel']));
  const branch = gitExec(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const headCommitSha = gitExec(repoRoot, ['rev-parse', 'HEAD']);
  const treeSha = gitExec(repoRoot, ['rev-parse', 'HEAD^{tree}']);
  const stageResult = spawnSync(
    'git',
    ['ls-files', '--stage', '--', PAIR_P5_EXECUTOR_WORKTREE_PROBE_REL],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (stageResult.status !== 0 || stageResult.stdout === undefined || stageResult.stdout === null) {
    throw new Error('GIT_INDEX_READ_FAILED');
  }
  const stageLine = stageResult.stdout.trim();
  const indexHasEmptyIntentToAddPlaceholders = stageLine.includes('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  const probePath = `${top}/${PAIR_P5_EXECUTOR_WORKTREE_PROBE_REL}`;
  const worktreeContentPresent = existsSync(probePath);
  return {
    worktreeRealpath: top,
    branch,
    headCommitSha,
    treeSha,
    indexHasEmptyIntentToAddPlaceholders,
    worktreeContentPresent,
  };
}

export function buildPairP5DedicatedReceiptValidationContextFromFreshGitRead(input: {
  readonly repoRoot: string;
  readonly permitTestOnlyReceipt: boolean;
}):
  | { readonly ok: true; readonly context: PairP5DedicatedReceiptValidationContext }
  | { readonly ok: false; readonly holdReasonCode: typeof HOLD_PAIR_P5_DEDICATED_RECEIPT_FRESH_CONTEXT_UNAVAILABLE } {
  try {
    const observedGit = readPairP5DedicatedReceiptGitProvenance(input.repoRoot);
    const policy = buildPairP5DedicatedReceiptFrozenPolicyFromPinnedPairSource();
    if (connectionUserInvalid(policy.connectionUser)) {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_FRESH_CONTEXT_UNAVAILABLE };
    }
    return {
      ok: true,
      context: {
        permitTestOnlyReceipt: input.permitTestOnlyReceipt,
        permitOperationalReceiptPreflight: false,
        policy,
        observedGit,
        observedGitEvidenceKind: 'GIT_READ_ONLY_OBSERVED',
      },
    };
  } catch {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_FRESH_CONTEXT_UNAVAILABLE };
  }
}

function connectionUserInvalid(connectionUser: string): boolean {
  return connectionUser === EXPECTED_CURRENT_USER;
}

export function buildPairP5DedicatedReceiptValidationContextFromInjectedTestFixture(input: {
  readonly injectedGit: PairP5DedicatedReceiptGitProvenance;
  readonly permitTestOnlyReceipt: boolean;
}): PairP5DedicatedReceiptValidationContext {
  return {
    permitTestOnlyReceipt: input.permitTestOnlyReceipt,
    permitOperationalReceiptPreflight: false,
    policy: buildPairP5DedicatedReceiptFrozenPolicyFromPinnedPairSource(),
    observedGit: input.injectedGit,
    observedGitEvidenceKind: 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL',
  };
}

function validateGitProvenanceShape(git: unknown): { ok: true; git: PairP5DedicatedReceiptGitProvenance } | { ok: false } {
  if (!isPlainObject(git) || !hasExactAllowlistedKeys(git, GIT_PROVENANCE_KEYS)) {
    return { ok: false };
  }
  for (const key of GIT_PROVENANCE_KEYS) {
    const value = git[key];
    if (key === 'indexHasEmptyIntentToAddPlaceholders' || key === 'worktreeContentPresent') {
      if (typeof value !== 'boolean') {
        return { ok: false };
      }
      continue;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return { ok: false };
    }
  }
  return { ok: true, git: git as PairP5DedicatedReceiptGitProvenance };
}

function validatePairP5WitnessedPreviewObservationShape(
  observation: unknown,
): { readonly ok: true; readonly record: Record<string, unknown> } | { readonly ok: false; readonly holdReasonCode: typeof HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID } {
  if (!isPlainObject(observation) || !hasExactAllowlistedKeys(observation, WITNESS_OBSERVATION_KEYS)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (!assertNoForbiddenKeys(observation)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  return { ok: true, record: observation };
}

function pairP5ValidateIndependentPreviewUiWitnessFieldContract(
  observation: unknown,
):
  | { readonly ok: true; readonly observation: PairP5WitnessedPreviewObservation }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID
        | typeof HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED;
    } {
  const shape = validatePairP5WitnessedPreviewObservationShape(observation);
  if (!shape.ok) {
    return shape;
  }
  const record = shape.record;
  if (record.sourceKind !== 'INDEPENDENT_PREVIEW_UI_WITNESS_v1') {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const witnessedOrganization = record.witnessedOrganization;
  const witnessedProject = record.witnessedProject;
  const witnessedProjectRef = record.witnessedProjectRef;
  const witnessedDatabaseTier = record.witnessedDatabaseTier;
  const witnessedDatabaseName = record.witnessedDatabaseName;
  if (
    typeof witnessedOrganization !== 'string' ||
    typeof witnessedProject !== 'string' ||
    typeof witnessedProjectRef !== 'string' ||
    typeof witnessedDatabaseTier !== 'string' ||
    typeof witnessedDatabaseName !== 'string'
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (
    witnessedOrganization === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    witnessedProject === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (
    witnessedOrganization !== APPROVED_PREVIEW_ORGANIZATION ||
    witnessedProject !== APPROVED_PREVIEW_PROJECT ||
    witnessedProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF ||
    witnessedDatabaseTier !== APPROVED_PREVIEW_DATABASE_TIER
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (witnessedDatabaseName === EXPECTED_DATABASE_NAME) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED };
  }
  if (witnessedDatabaseName !== PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED };
  }
  const attestationId = record.attestationId;
  if (typeof attestationId !== 'string' || attestationId.trim().length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (!attestationId.startsWith(PAIR_P5_INDEPENDENT_PREVIEW_UI_ATTESTATION_ID_PREFIX)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const observationTimeIso = record.observationTimeIso;
  if (!isStrictIso8601Utc(observationTimeIso)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const ageMs = Math.abs(Date.now() - Date.parse(observationTimeIso));
  if (ageMs > PAIR_P5_INDEPENDENT_UI_WITNESS_MAX_AGE_MS) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  return {
    ok: true,
    observation: {
      sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1',
      witnessedOrganization,
      witnessedProject,
      witnessedProjectRef,
      witnessedDatabaseTier,
      witnessedDatabaseName,
      observationTimeIso,
      attestationId,
    },
  };
}

/** TEST_ONLY shape seam; registry membership does NOT authorize operational witness. */
export function validatePairP5IndependentPreviewUiWitnessFieldContractForTestsOnly(
  observation: unknown,
):
  | { readonly ok: true; readonly observation: PairP5WitnessedPreviewObservation }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID
        | typeof HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED
        | typeof HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED;
    } {
  const fields = pairP5ValidateIndependentPreviewUiWitnessFieldContract(observation);
  if (!fields.ok) {
    return fields;
  }
  if (!independentPreviewUiAttestationRegistry.has(fields.observation.attestationId)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED };
  }
  return fields;
}

export function acceptPairP5OperationalIndependentPreviewUiWitness(
  observation: unknown,
  context?: {
    readonly signedHumanAttestation?: PairP5SignedHumanPreviewUiAttestation | null;
    readonly expectedPurpose?: PairP5HumanPreviewUiAttestationPurpose;
    readonly trustAnchorsOverrideForTestsOnly?: typeof PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS;
  },
):
  | { readonly ok: true; readonly observation: PairP5WitnessedPreviewObservation }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID
        | typeof HOLD_PAIR_P5_WITNESS_DATABASE_NAME_NOT_UI_OBSERVED
        | typeof HOLD_PAIR_P5_OPERATIONAL_INDEPENDENT_WITNESS_NOT_ACCEPTED
        | typeof HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED
        | typeof HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN
        | typeof HOLD_PAIR_P5_WITNESS_ATTESTATION_NOT_REGISTERED;
    } {
  const fields = pairP5ValidateIndependentPreviewUiWitnessFieldContract(observation);
  if (!fields.ok) {
    return fields;
  }
  const signed = context?.signedHumanAttestation;
  if (signed === null || signed === undefined) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED };
  }
  const expectedPurpose = context?.expectedPurpose ?? 'LIVE_MUTATION';
  const testOverride = context?.trustAnchorsOverrideForTestsOnly;
  const trustAnchors = testOverride ?? PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS;
  const verified = verifyPairP5SignedHumanPreviewUiAttestation({
    signed,
    trustAnchors,
    expectedPurpose,
    requireOperationalEvidenceDigest: trustAnchors.length > 0,
  });
  if (!verified.ok) {
    if (verified.holdReasonCode === HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN) {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN };
    }
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED };
  }
  if (verified.payload.attestationId !== fields.observation.attestationId) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (testOverride !== undefined && testOverride.length > 0) {
    return { ok: true, observation: fields.observation };
  }
  if (trustAnchors.length === 0 || !PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESS_ATTESTATION_ISSUER_NOT_AUTHORIZED };
  }
  return { ok: true, observation: fields.observation };
}

export function verifyPairP5SignedHumanAttestationForDedicatedReceiptWitnessForTestsOnly(input: {
  readonly observation: unknown;
  readonly signedHumanAttestation: PairP5SignedHumanPreviewUiAttestation;
  readonly expectedPurpose: PairP5HumanPreviewUiAttestationPurpose;
  readonly trustAnchors: typeof PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS;
}): ReturnType<typeof verifyPairP5SignedHumanPreviewUiAttestation> {
  const fields = pairP5ValidateIndependentPreviewUiWitnessFieldContract(input.observation);
  if (!fields.ok) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID };
  }
  return verifyPairP5SignedHumanPreviewUiAttestation({
    signed: input.signedHumanAttestation,
    trustAnchors: input.trustAnchors,
    expectedPurpose: input.expectedPurpose,
  });
}

export function validatePairP5IndependentPreviewUiWitnessObservation(
  observation: unknown,
): ReturnType<typeof acceptPairP5OperationalIndependentPreviewUiWitness> {
  return acceptPairP5OperationalIndependentPreviewUiWitness(observation);
}

export function validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly(
  authorizationId: string | null | undefined,
  expectedPurpose: PairP5HumanPreviewApplyAuthorizationPurpose,
):
  | { readonly ok: true; readonly authorization: PairP5HumanPreviewApplyAuthorizationRecord }
  | { readonly ok: false; readonly holdReasonCode: typeof HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID } {
  if (typeof authorizationId !== 'string' || authorizationId.trim().length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  const registered = humanPreviewApplyAuthorizationRegistry.get(authorizationId);
  if (registered === undefined) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  if (
    registered.purpose !== expectedPurpose ||
    registered.selectedStep !== PAIR_P5_IDENTITY_STEP_ID ||
    registered.migrationSourceSha256 !== PAIR_P5_IDENTITY_MIGRATION_SHA256 ||
    registered.previewProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  return { ok: true, authorization: registered };
}

export const HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE =
  'HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE' as const;

export function validatePairP5HumanPreviewApplyAuthorizationRecord(
  authorizationId: string | null | undefined,
  expectedPurpose: PairP5HumanPreviewApplyAuthorizationPurpose,
  context?: {
    readonly verifiedAttestationPayload?: PairP5HumanPreviewUiAttestationPayload | null;
  },
):
  | { readonly ok: true; readonly authorization: PairP5HumanPreviewApplyAuthorizationRecord }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID
        | typeof HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE
        | typeof HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED;
    } {
  if (typeof authorizationId !== 'string' || authorizationId.trim().length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  if (
    !PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE ||
    PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS.length === 0
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE };
  }
  const payload = context?.verifiedAttestationPayload;
  if (payload === null || payload === undefined) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_EXTERNAL_RECORD_UNAVAILABLE };
  }
  if (payload.purpose !== expectedPurpose) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  const applyDigest = payload.humanP51ApplyAuthorizationIdDigestSha256;
  if (applyDigest === null || !/^[0-9a-f]{64}$/.test(applyDigest)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED };
  }
  const authorizationDigest = digestPairP5HumanAuthorizationIdentity(authorizationId);
  if (authorizationDigest !== applyDigest) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_AUTHORIZATION_ID_INVALID };
  }
  return {
    ok: true,
    authorization: {
      authorizationId: authorizationId.trim(),
      purpose: expectedPurpose,
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      migrationSourceSha256: PAIR_P5_IDENTITY_MIGRATION_SHA256,
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    },
  };
}

function validatePairP5TestOnlyWitnessedPreviewObservation(
  observation: unknown,
): { readonly ok: true; readonly observation: PairP5WitnessedPreviewObservation } | { readonly ok: false; readonly holdReasonCode: typeof HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID } {
  const shape = validatePairP5WitnessedPreviewObservationShape(observation);
  if (!shape.ok) {
    return shape;
  }
  const record = shape.record;
  if (record.sourceKind !== 'TEST_ONLY_FIXTURE_v1') {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const witnessedOrganization = record.witnessedOrganization;
  const witnessedProject = record.witnessedProject;
  const witnessedProjectRef = record.witnessedProjectRef;
  const witnessedDatabaseTier = record.witnessedDatabaseTier;
  const witnessedDatabaseName = record.witnessedDatabaseName;
  if (
    typeof witnessedOrganization !== 'string' ||
    typeof witnessedProject !== 'string' ||
    typeof witnessedProjectRef !== 'string' ||
    typeof witnessedDatabaseTier !== 'string' ||
    typeof witnessedDatabaseName !== 'string'
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (
    witnessedOrganization === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    witnessedProject === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (
    witnessedOrganization !== APPROVED_PREVIEW_ORGANIZATION ||
    witnessedProject !== APPROVED_PREVIEW_PROJECT ||
    witnessedProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF ||
    witnessedDatabaseTier !== APPROVED_PREVIEW_DATABASE_TIER ||
    witnessedDatabaseName !== EXPECTED_DATABASE_NAME
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const attestationId = record.attestationId;
  if (typeof attestationId !== 'string' || attestationId.trim().length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  if (!attestationId.startsWith('TEST_ONLY_')) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const observationTimeIso = record.observationTimeIso;
  if (!isStrictIso8601Utc(observationTimeIso)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const ageMs = Math.abs(Date.now() - Date.parse(observationTimeIso));
  if (ageMs > PAIR_P5_TEST_ONLY_WITNESS_MAX_AGE_MS) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const obs: PairP5WitnessedPreviewObservation = {
    sourceKind: 'TEST_ONLY_FIXTURE_v1',
    witnessedOrganization,
    witnessedProject,
    witnessedProjectRef,
    witnessedDatabaseTier,
    witnessedDatabaseName,
    observationTimeIso,
    attestationId,
  };
  return { ok: true, observation: obs };
}

export function validatePairP5WitnessedPreviewObservation(
  observation: unknown,
): { readonly ok: true; readonly observation: PairP5WitnessedPreviewObservation } | { readonly ok: false; readonly holdReasonCode: string } {
  if (!isPlainObject(observation)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_WITNESSED_OBSERVATION_INVALID };
  }
  const sourceKind = observation.sourceKind;
  if (sourceKind === 'INDEPENDENT_PREVIEW_UI_WITNESS_v1') {
    return validatePairP5IndependentPreviewUiWitnessObservation(observation);
  }
  return validatePairP5TestOnlyWitnessedPreviewObservation(observation);
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeysDeep(entry));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep(value[key]);
  }
  return sorted;
}

function canonicalizeReceiptBody(body: PairP5DedicatedTargetBindingReceiptBody): string {
  return JSON.stringify(sortKeysDeep(body));
}

function computeReceiptIdentifier(canonicalSerialization: string): string {
  return createHash('sha256').update(canonicalSerialization, 'utf8').digest('hex');
}

export function computePairP5DedicatedReceiptHashesForBody(
  body: PairP5DedicatedTargetBindingReceiptBody,
): { readonly canonicalSerializationSha256: string; readonly receiptIdentifierSha256: string } {
  const canonicalSerialization = canonicalizeReceiptBody(body);
  const canonicalSerializationSha256 = computeReceiptIdentifier(canonicalSerialization);
  const receiptIdentifierSha256 = computeReceiptIdentifier(
    `${PAIR_P5_DEDICATED_TARGET_BINDING_RECEIPT_SCHEMA_ID}\n${canonicalSerializationSha256}`,
  );
  return { canonicalSerializationSha256, receiptIdentifierSha256 };
}

export function buildPairP5TestOnlyWitnessedPreviewObservationFixture(): PairP5WitnessedPreviewObservation {
  return {
    sourceKind: 'TEST_ONLY_FIXTURE_v1',
    witnessedOrganization: APPROVED_PREVIEW_ORGANIZATION,
    witnessedProject: APPROVED_PREVIEW_PROJECT,
    witnessedProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    witnessedDatabaseTier: APPROVED_PREVIEW_DATABASE_TIER,
    witnessedDatabaseName: EXPECTED_DATABASE_NAME,
    observationTimeIso: '2026-10-19T00:00:00.000Z',
    attestationId: 'TEST_ONLY_ATTESTATION_PAIR_P5_1',
  };
}

function validateSharedReceiptBodyPolicyFields(
  b: PairP5DedicatedTargetBindingReceiptBody,
  context: PairP5DedicatedReceiptValidationContext,
): { ok: true } | { ok: false; holdReasonCode: string } {
  const policy = context.policy;
  if (
    b.selectedStep !== policy.selectedStep ||
    b.migrationVersion !== policy.migrationVersion ||
    b.migrationName !== policy.migrationName ||
    b.migrationSourceSha256 !== policy.migrationSourceSha256 ||
    b.normalizedStatementCount !== policy.normalizedStatementCount ||
    b.normalizedStreamCompositeSha256 !== policy.normalizedStreamCompositeSha256
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (
    b.previewOrganization !== policy.previewOrganization ||
    b.previewProject !== policy.previewProject ||
    b.previewProjectRef !== policy.previewProjectRef ||
    b.connectionEndpointProfile !== policy.connectionEndpointProfile ||
    b.sessionPoolerHost !== policy.sessionPoolerHost ||
    b.hostFingerprintSha256 !== policy.hostFingerprintSha256 ||
    b.connectionUser !== policy.connectionUser ||
    b.port !== policy.port ||
    b.sslmode !== policy.sslmode ||
    b.tlsTrustProfile !== policy.tlsTrustProfile ||
    b.tlsServerName !== policy.tlsServerName ||
    b.credentialMethod !== policy.credentialMethod
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const gitShape = validateGitProvenanceShape(b.git);
  if (!gitShape.ok) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const observed = context.observedGit;
  const git = gitShape.git;
  if (
    git.branch !== observed.branch ||
    git.headCommitSha !== observed.headCommitSha ||
    git.treeSha !== observed.treeSha ||
    git.worktreeRealpath !== observed.worktreeRealpath ||
    git.indexHasEmptyIntentToAddPlaceholders !== observed.indexHasEmptyIntentToAddPlaceholders ||
    git.worktreeContentPresent !== observed.worktreeContentPresent
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  if (git.branch !== policy.expectedBranch) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  if (!git.worktreeContentPresent) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  if (context.observedGitEvidenceKind === 'GIT_READ_ONLY_OBSERVED') {
    try {
      if (realpathSync(git.worktreeRealpath) !== realpathSync(policy.expectedWorktreeRealpath)) {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
      }
    } catch {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
    }
  }
  return { ok: true };
}

function validateOperationalReceiptBodyAgainstPolicy(
  b: PairP5DedicatedTargetBindingReceiptBody,
  context: PairP5DedicatedReceiptValidationContext,
): { ok: true; body: PairP5DedicatedTargetBindingReceiptBody } | { ok: false; holdReasonCode: string } {
  if (!context.permitOperationalReceiptPreflight) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN };
  }
  if (context.permitTestOnlyReceipt) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (typeof b.humanAuthorizationId !== 'string' || b.humanAuthorizationId.trim().length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_RECEIPT_HUMAN_AUTHORIZATION_REQUIRED };
  }
  if (b.signedHumanPreviewUiAttestation === null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED };
  }
  const fieldContract = pairP5ValidateIndependentPreviewUiWitnessFieldContract(b.witnessedObservation);
  if (!fieldContract.ok) {
    return fieldContract;
  }
  const shared = validateSharedReceiptBodyPolicyFields(b, context);
  if (!shared.ok) {
    return shared;
  }
  const attestationGitHead = b.signedHumanPreviewUiAttestation.payload.gitHeadCommitSha;
  if (attestationGitHead === null || !/^[0-9a-f]{40}$/.test(attestationGitHead)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  if (attestationGitHead !== b.git.headCommitSha) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  const witness = acceptPairP5OperationalIndependentPreviewUiWitness(b.witnessedObservation, {
    signedHumanAttestation: b.signedHumanPreviewUiAttestation,
    expectedPurpose: 'LIVE_MUTATION',
    trustAnchorsOverrideForTestsOnly: context.operationalTrustAnchorsOverrideForTestsOnly,
  });
  if (!witness.ok) {
    if (witness.holdReasonCode === HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN) {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_RECEIPT_PREFLIGHT_TRUST_ANCHOR_UNAVAILABLE };
    }
    return witness;
  }
  const human =
    context.permitOperationalHumanAuthorizationRegistryForTestsOnly === true
      ? validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly(
          b.humanAuthorizationId,
          'LIVE_MUTATION',
        )
      : validatePairP5HumanPreviewApplyAuthorizationRecord(b.humanAuthorizationId, 'LIVE_MUTATION', {
          verifiedAttestationPayload: b.signedHumanPreviewUiAttestation.payload,
        });
  if (!human.ok) {
    return human;
  }
  if (context.operationalTrustAnchorsOverrideForTestsOnly !== undefined) {
    return { ok: true, body: b };
  }
  if (
    PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS.length === 0 ||
    !PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_RECEIPT_PREFLIGHT_TRUST_ANCHOR_UNAVAILABLE };
  }
  return { ok: true, body: b };
}

function validateReceiptBodyAgainstPolicy(
  body: unknown,
  context: PairP5DedicatedReceiptValidationContext,
): { ok: true; body: PairP5DedicatedTargetBindingReceiptBody } | { ok: false; holdReasonCode: string } {
  if (!isPlainObject(body) || !hasExactAllowlistedKeys(body, RECEIPT_BODY_KEYS)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (!assertNoForbiddenKeys(body)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const policy = context.policy;
  const b = body as PairP5DedicatedTargetBindingReceiptBody;
  if (b.schemaId !== policy.schemaId) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (b.receiptClass === 'OPERATIONAL') {
    return validateOperationalReceiptBodyAgainstPolicy(b, context);
  }
  if (b.receiptClass !== 'TEST_ONLY' || !context.permitTestOnlyReceipt) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (b.humanAuthorizationId !== null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (b.signedHumanPreviewUiAttestation !== null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const shared = validateSharedReceiptBodyPolicyFields(b, context);
  if (!shared.ok) {
    return shared;
  }
  const witnessHold = validatePairP5WitnessedPreviewObservation(b.witnessedObservation);
  if (!witnessHold.ok) {
    return witnessHold;
  }
  return { ok: true, body: b };
}

function buildReceiptBodyFromObservedGit(
  git: PairP5DedicatedReceiptGitProvenance,
  witnessedObservation: PairP5WitnessedPreviewObservation,
  policy: PairP5DedicatedReceiptFrozenPolicy,
): PairP5DedicatedTargetBindingReceiptBody {
  return {
    schemaId: policy.schemaId,
    receiptClass: 'TEST_ONLY',
    selectedStep: policy.selectedStep,
    migrationVersion: policy.migrationVersion,
    migrationName: policy.migrationName,
    migrationSourceSha256: policy.migrationSourceSha256,
    normalizedStatementCount: policy.normalizedStatementCount,
    normalizedStreamCompositeSha256: policy.normalizedStreamCompositeSha256,
    git,
    previewOrganization: policy.previewOrganization,
    previewProject: policy.previewProject,
    previewProjectRef: policy.previewProjectRef,
    connectionEndpointProfile: policy.connectionEndpointProfile,
    sessionPoolerHost: policy.sessionPoolerHost,
    hostFingerprintSha256: policy.hostFingerprintSha256,
    connectionUser: policy.connectionUser,
    port: policy.port,
    sslmode: policy.sslmode,
    tlsTrustProfile: policy.tlsTrustProfile,
    tlsServerName: policy.tlsServerName,
    credentialMethod: policy.credentialMethod,
    witnessedObservation,
    humanAuthorizationId: null,
    signedHumanPreviewUiAttestation: null,
  };
}

export function issuePairP5TestOnlyDedicatedTargetBindingReceipt(input: { readonly repoRoot: string }):
  | { readonly ok: true; readonly receipt: PairP5DedicatedTargetBindingReceipt }
  | { readonly ok: false; readonly holdReasonCode: string } {
  const freshContext = buildPairP5DedicatedReceiptValidationContextFromFreshGitRead({
    repoRoot: input.repoRoot,
    permitTestOnlyReceipt: true,
  });
  if (!freshContext.ok) {
    return freshContext;
  }
  const witnessedObservation = buildPairP5TestOnlyWitnessedPreviewObservationFixture();
  const witnessHold = validatePairP5WitnessedPreviewObservation(witnessedObservation);
  if (!witnessHold.ok) {
    return witnessHold;
  }
  const credentialHold = validateCredentialMethodSelection({
    credentialMethod: PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
  });
  if (!credentialHold.ok) {
    return { ok: false, holdReasonCode: credentialHold.holdReasonCode ?? 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  const hostResult = calculateCanonicalHostFingerprint(SESSION_POOLER_HOST);
  if (!hostResult.ok || hostResult.fingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
  }
  const body = buildReceiptBodyFromObservedGit(
    freshContext.context.observedGit,
    witnessedObservation,
    freshContext.context.policy,
  );
  const hashes = computePairP5DedicatedReceiptHashesForBody(body);
  const receipt = {
    body,
    canonicalSerializationSha256: hashes.canonicalSerializationSha256,
    receiptIdentifierSha256: hashes.receiptIdentifierSha256,
  };
  registerPairP5DedicatedReceiptIssuanceOrigin(receipt, 'FRESH_GIT_READ_ONLY_TEST_ONLY');
  return { ok: true, receipt };
}

/** Explicit labeled test seam; injected Git is NOT operational provenance. */
export function issuePairP5TestOnlyDedicatedTargetBindingReceiptFromInjectedTestFixture(input: {
  readonly injectedGit: PairP5DedicatedReceiptGitProvenance;
  readonly witnessedObservation?: PairP5WitnessedPreviewObservation;
}):
  | { readonly ok: true; readonly receipt: PairP5DedicatedTargetBindingReceipt }
  | { readonly ok: false; readonly holdReasonCode: string } {
  const witnessedObservation = input.witnessedObservation ?? buildPairP5TestOnlyWitnessedPreviewObservationFixture();
  const witnessHold = validatePairP5WitnessedPreviewObservation(witnessedObservation);
  if (!witnessHold.ok) {
    return witnessHold;
  }
  const policy = buildPairP5DedicatedReceiptFrozenPolicyFromPinnedPairSource();
  const body = buildReceiptBodyFromObservedGit(input.injectedGit, witnessedObservation, policy);
  const hashes = computePairP5DedicatedReceiptHashesForBody(body);
  const receipt = {
    body,
    canonicalSerializationSha256: hashes.canonicalSerializationSha256,
    receiptIdentifierSha256: hashes.receiptIdentifierSha256,
  };
  registerPairP5DedicatedReceiptIssuanceOrigin(receipt, 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL');
  return { ok: true, receipt };
}

export const HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED =
  'HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED' as const;

export const HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED =
  'HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED' as const;
export const HOLD_PAIR_P5_OPERATIONAL_WITNESS_UNOBSERVED =
  'HOLD_PAIR_P5_OPERATIONAL_WITNESS_UNOBSERVED' as const;
export const HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED =
  'HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED' as const;
export const HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED =
  'HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED' as const;

export type PairP5LiveDedicatedPathPurpose = 'LIVE_MUTATION' | 'LIVE_FRESH_READONLY';

export const PAIR_P5_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED = false as const;

export const PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS = {
  independentPreviewUiWitness:
    'UNWIRED_EXTERNAL_HOLD_INDEPENDENT_PREVIEW_UI_WITNESS' as const,
  humanP51ApplyApproval: 'UNWIRED_EXTERNAL_HOLD_HUMAN_P5_1_APPLY_APPROVAL' as const,
  durableCrossProcessReplay: 'UNWIRED_EXTERNAL_HOLD_DURABLE_CROSS_PROCESS_REPLAY' as const,
  liveCredentialAdapter: 'UNWIRED_EXTERNAL_HOLD_LIVE_CREDENTIAL_ADAPTER' as const,
} as const;

export type PairP5OperationalIssuanceExternalHoldId =
  (typeof PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS)[keyof typeof PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS];

export const PAIR_P5_LEGACY_TARGET_BINDING_RECEIPT_CAST_FROM_DEDICATED_FORBIDDEN = true as const;

export const PAIR_P5_OPERATIONAL_RECEIPT_READINESS = {
  operationalIssuancePermitted: false as const,
  independentPreviewUiWitnessObserved: false as const,
  authorizedExternalAttestationIssuerAvailable: PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE,
  humanSignedAttestationVerifierImplemented: true as const,
  operationalHumanAttestationTrustAnchorsConfigured:
    PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS.length > 0,
  previewUiWitnessFieldEvidence: PAIR_P5_PREVIEW_UI_WITNESS_FIELD_EVIDENCE,
  humanPreviewApplyGoGranted: true as const,
  liveFreshReadonlyProbeAuthorizationGranted: PAIR_P5_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED,
  liveCredentialAcquisitionAuthorized: false as const,
  durableCrossProcessReplayImplemented: false as const,
  durableLedgerMigrationDraftId: PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID,
  durableConsumptionAuthorityStatus: PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_AUTHORITY_STATUS,
} as const;

export type PairP5OperationalDedicatedReceiptIssuanceDecision = {
  readonly issuable: false;
  readonly holdReasonCode: typeof HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN;
  readonly witnessObserved: false;
  readonly humanAuthorizationIdAccepted: false;
  readonly externalHolds: readonly PairP5OperationalIssuanceExternalHoldId[];
};

export function attemptPairP5OperationalDedicatedTargetBindingReceiptIssuance(input?: {
  readonly witnessedObservation?: PairP5WitnessedPreviewObservation | null;
  readonly humanAuthorizationId?: string | null;
}): PairP5OperationalDedicatedReceiptIssuanceDecision {
  const externalHolds: PairP5OperationalIssuanceExternalHoldId[] = [
    PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.independentPreviewUiWitness,
    PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.humanP51ApplyApproval,
    PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.durableCrossProcessReplay,
    PAIR_P5_OPERATIONAL_ISSUANCE_EXTERNAL_HOLDS.liveCredentialAdapter,
  ];
  if (input?.witnessedObservation !== undefined && input.witnessedObservation !== null) {
    const witness = acceptPairP5OperationalIndependentPreviewUiWitness(input.witnessedObservation);
    if (!witness.ok) {
      void witness;
    }
  }
  if (input?.humanAuthorizationId !== undefined && input.humanAuthorizationId !== null) {
    const human = validatePairP5HumanPreviewApplyAuthorizationRecord(
      input.humanAuthorizationId,
      'LIVE_MUTATION',
    );
    if (!human.ok) {
      void human;
    }
  }
  return {
    issuable: false,
    holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN,
    witnessObserved: false,
    humanAuthorizationIdAccepted: false,
    externalHolds,
  };
}

export function pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold(input: {
  readonly purpose: PairP5LiveDedicatedPathPurpose;
  readonly humanPreviewApplyAuthorizationGranted: boolean;
  readonly liveFreshReadonlyProbeAuthorizationGranted: boolean;
}): string | null {
  if (input.purpose === 'LIVE_FRESH_READONLY') {
    if (!input.liveFreshReadonlyProbeAuthorizationGranted) {
      return HOLD_PAIR_P5_LIVE_FRESH_READONLY_PROBE_NOT_AUTHORIZED;
    }
    return null;
  }
  if (!input.humanPreviewApplyAuthorizationGranted) {
    return HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED;
  }
  return null;
}

/**
 * Derives ledger consume binding only from an operational receipt that passed non-consuming preflight.
 * Caller-supplied digests cannot override validated receipt / attestation / Human authorization fields.
 */
export function resolvePairP5LiveMutationLedgerBindingFromDedicatedReceipt(input: {
  readonly repoRoot: string;
  readonly dedicatedReceipt: PairP5DedicatedTargetBindingReceipt;
}):
  | {
      readonly ok: true;
      readonly binding: PairP5DedicatedReceiptConsumptionBinding;
      readonly receipt: PairP5DedicatedTargetBindingReceipt;
    }
  | { readonly ok: false; readonly holdReasonCode: string } {
  if (input.dedicatedReceipt.body.receiptClass !== 'OPERATIONAL') {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED };
  }
  const freshContext = buildPairP5DedicatedReceiptValidationContextFromFreshGitRead({
    repoRoot: input.repoRoot,
    permitTestOnlyReceipt: false,
  });
  if (!freshContext.ok) {
    return freshContext;
  }
  const preflight = preflightValidatePairP5DedicatedTargetBindingReceipt(
    input.dedicatedReceipt,
    withPairP5OperationalReceiptPreflightContext(freshContext.context),
  );
  if (!preflight.ok) {
    return preflight;
  }
  const body = preflight.receipt.body;
  if (body.signedHumanPreviewUiAttestation === null || body.humanAuthorizationId === null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_RECEIPT_HUMAN_AUTHORIZATION_REQUIRED };
  }
  const operationalAttestation = verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt({
    signed: body.signedHumanPreviewUiAttestation,
    expectedPurpose: 'LIVE_MUTATION',
    authorizedExternalAttestationIssuerAvailable: PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE,
  });
  if (!operationalAttestation.ok) {
    return operationalAttestation;
  }
  const attestationDigest = digestPairP5HumanAttestationIdentity(
    body.signedHumanPreviewUiAttestation.payload,
  );
  const binding = buildPairP5DedicatedReceiptConsumptionBinding({
    receiptIdentifierSha256: preflight.receipt.receiptIdentifierSha256,
    operationPurpose: 'LIVE_MUTATION',
    attestationIdentityDigestSha256: attestationDigest,
    humanAuthorizationId: body.humanAuthorizationId,
  });
  if (
    binding.previewProjectRef !== body.previewProjectRef ||
    binding.selectedStep !== body.selectedStep ||
    binding.selectedStep !== PAIR_P5_IDENTITY_STEP_ID ||
    body.migrationSourceSha256 !== PAIR_P5_IDENTITY_MIGRATION_SHA256
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (!validatePairP5DedicatedReceiptConsumptionBinding(binding)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID };
  }
  return { ok: true, binding, receipt: preflight.receipt };
}

/** `null` means pre-credential checks passed; credential acquisition is a separate gate. */
export function evaluatePairP5LiveDedicatedPathPreCredentialBoundary(input: {
  readonly repoRoot: string;
  readonly dedicatedReceipt: PairP5DedicatedTargetBindingReceipt | null;
  readonly purpose: PairP5LiveDedicatedPathPurpose;
  readonly humanPreviewApplyAuthorizationGranted: boolean;
}): string | null {
  const freshContext = buildPairP5DedicatedReceiptValidationContextFromFreshGitRead({
    repoRoot: input.repoRoot,
    permitTestOnlyReceipt: false,
  });
  if (!freshContext.ok) {
    return freshContext.holdReasonCode;
  }
  if (input.dedicatedReceipt === null || input.dedicatedReceipt === undefined) {
    return HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING;
  }
  const operationalWitness = acceptPairP5OperationalIndependentPreviewUiWitness(
    input.dedicatedReceipt.body.witnessedObservation,
    {
      signedHumanAttestation: input.dedicatedReceipt.body.signedHumanPreviewUiAttestation,
      expectedPurpose: input.purpose,
    },
  );
  if (!operationalWitness.ok) {
    return operationalWitness.holdReasonCode;
  }
  const purposeHold = pairP5ResolveLiveDedicatedPathPurposeAuthorizationHold({
    purpose: input.purpose,
    humanPreviewApplyAuthorizationGranted: input.humanPreviewApplyAuthorizationGranted,
    liveFreshReadonlyProbeAuthorizationGranted: PAIR_P5_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED,
  });
  if (purposeHold !== null) {
    return purposeHold;
  }
  const receiptGuard = guardPairP5CredentialPathWithDedicatedReceipt(
    input.dedicatedReceipt,
    withPairP5OperationalReceiptPreflightContext(freshContext.context),
  );
  if (!receiptGuard.ok) {
    return receiptGuard.holdReasonCode;
  }
  if (input.dedicatedReceipt.body.receiptClass !== 'OPERATIONAL') {
    return HOLD_PAIR_P5_LIVE_MUTATION_OPERATIONAL_RECEIPT_REQUIRED;
  }
  return null;
}

export function evaluatePairP5TestOnlyDedicatedReceiptBeforeCredentialsBoundary(input: {
  readonly repoRoot: string;
  readonly dedicatedReceipt: PairP5DedicatedTargetBindingReceipt | null;
  readonly permitTestOnlyReceipt: boolean;
  readonly humanPreviewApplyAuthorizationGranted: boolean;
}): string {
  const freshContext = buildPairP5DedicatedReceiptValidationContextFromFreshGitRead({
    repoRoot: input.repoRoot,
    permitTestOnlyReceipt: input.permitTestOnlyReceipt,
  });
  if (!freshContext.ok) {
    return freshContext.holdReasonCode;
  }
  const receiptGuard = guardPairP5CredentialPathWithDedicatedReceipt(
    input.dedicatedReceipt,
    freshContext.context,
  );
  if (!receiptGuard.ok) {
    return receiptGuard.holdReasonCode;
  }
  if (!input.humanPreviewApplyAuthorizationGranted) {
    return HOLD_PAIR_P5_OPERATIONAL_HUMAN_APPLY_GO_REQUIRED;
  }
  return HOLD_PAIR_P5_LIVE_CREDENTIAL_ACQUISITION_NOT_AUTHORIZED;
}

export function preflightValidatePairP5DedicatedTargetBindingReceipt(
  receipt: PairP5DedicatedTargetBindingReceipt | null | undefined,
  context: PairP5DedicatedReceiptValidationContext,
): { readonly ok: true; readonly receipt: PairP5DedicatedTargetBindingReceipt } | { readonly ok: false; readonly holdReasonCode: string } {
  if (receipt === null || receipt === undefined) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_MISSING };
  }
  if (!isPlainObject(receipt) || !hasExactAllowlistedKeys(receipt as Record<string, unknown>, RECEIPT_ENVELOPE_KEYS)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (!assertNoForbiddenKeys(receipt)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const body = receipt.body;
  const isOperational = body.receiptClass === 'OPERATIONAL';
  if (!isOperational) {
    const issuanceOrigin = resolvePairP5DedicatedReceiptIssuanceOrigin(receipt);
    if (issuanceOrigin === null) {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
    }
    if (context.observedGitEvidenceKind === 'GIT_READ_ONLY_OBSERVED') {
      if (issuanceOrigin !== 'FRESH_GIT_READ_ONLY_TEST_ONLY') {
        return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
      }
    } else if (issuanceOrigin !== 'TEST_INJECTED_FIXTURE_NOT_OPERATIONAL') {
      return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_PROVENANCE_MISMATCH };
    }
  } else if (!context.permitOperationalReceiptPreflight) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_OPERATIONAL_FORBIDDEN };
  }
  const bodyHold = validateReceiptBodyAgainstPolicy(receipt.body, context);
  if (!bodyHold.ok) {
    return bodyHold;
  }
  const hashes = computePairP5DedicatedReceiptHashesForBody(bodyHold.body);
  if (hashes.canonicalSerializationSha256 !== receipt.canonicalSerializationSha256) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (hashes.receiptIdentifierSha256 !== receipt.receiptIdentifierSha256) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (consumedReceiptIdentifiers.has(receipt.receiptIdentifierSha256)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_REPLAY };
  }
  return { ok: true, receipt };
}

export function validatePairP5DedicatedTargetBindingReceipt(
  receipt: PairP5DedicatedTargetBindingReceipt | null | undefined,
  context: PairP5DedicatedReceiptValidationContext,
): { readonly ok: true; readonly receipt: PairP5DedicatedTargetBindingReceipt } | { readonly ok: false; readonly holdReasonCode: string } {
  const preflight = preflightValidatePairP5DedicatedTargetBindingReceipt(receipt, context);
  if (!preflight.ok) {
    return preflight;
  }
  if (preflight.receipt.body.receiptClass !== 'TEST_ONLY' || !context.permitTestOnlyReceipt) {
    return preflight;
  }
  consumedReceiptIdentifiers.add(preflight.receipt.receiptIdentifierSha256);
  return preflight;
}

export function guardPairP5CredentialPathWithDedicatedReceipt(
  receipt: PairP5DedicatedTargetBindingReceipt | null | undefined,
  context: PairP5DedicatedReceiptValidationContext,
): { readonly ok: true } | { readonly ok: false; readonly holdReasonCode: string } {
  const validated = preflightValidatePairP5DedicatedTargetBindingReceipt(receipt, context);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true };
}

function isOwnerControlledRegularJsonFile(jsonPath: string): boolean {
  if (typeof jsonPath !== 'string' || jsonPath.trim().length === 0) {
    return false;
  }
  const resolved = resolve(jsonPath);
  if (!existsSync(resolved)) {
    return false;
  }
  let stat;
  try {
    stat = lstatSync(resolved);
  } catch {
    return false;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return false;
  }
  if ((stat.mode & 0o004) !== 0) {
    return false;
  }
  try {
    realpathSync(resolved);
  } catch {
    return false;
  }
  return true;
}

export function loadPairP5DedicatedTargetBindingReceiptFromOwnerControlledJsonFile(
  jsonPath: string,
):
  | { readonly ok: true; readonly receipt: PairP5DedicatedTargetBindingReceipt }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID
        | typeof HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_READ_FAILED
        | typeof HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID;
    } {
  if (!isOwnerControlledRegularJsonFile(jsonPath)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_PATH_INVALID };
  }
  const resolved = resolve(jsonPath);
  let raw: Buffer;
  try {
    raw = readFileSync(resolved);
  } catch {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_READ_FAILED };
  }
  if (raw.byteLength === 0 || raw.byteLength > PAIR_P5_DEDICATED_RECEIPT_JSON_MAX_BYTES) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_JSON_READ_FAILED };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (!isPlainObject(parsed) || !hasExactAllowlistedKeys(parsed, RECEIPT_ENVELOPE_KEYS)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  if (!assertNoForbiddenKeys(parsed)) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const receipt = parsed as PairP5DedicatedTargetBindingReceipt;
  if (
    typeof receipt.canonicalSerializationSha256 !== 'string' ||
    typeof receipt.receiptIdentifierSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(receipt.canonicalSerializationSha256) ||
    !/^[0-9a-f]{64}$/.test(receipt.receiptIdentifierSha256)
  ) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  return { ok: true, receipt };
}
