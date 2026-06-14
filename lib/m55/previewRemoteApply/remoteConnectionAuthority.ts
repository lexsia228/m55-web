import { createHash } from 'node:crypto';

import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  canonicalSerializePreviewRemoteApply,
  CREDENTIAL_METHOD_IDS,
  EXPECTED_BRANCH,
  FORBIDDEN_PRODUCTION_ORGANIZATION,
  FORBIDDEN_PRODUCTION_PROJECT,
  type CredentialMethodId,
  type PreviewRemoteApplyHoldCode,
} from './types.ts';

export const REMOTE_CONNECTION_AUTHORITY_ID =
  'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1' as const;

export const REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1' as const;

export const APPROVED_CREDENTIAL_METHODS = [...CREDENTIAL_METHOD_IDS] as const;

export const EXPECTED_ENVIRONMENT = 'Preview' as const;
export const EXPECTED_DATABASE_NAME = 'postgres' as const;
export const EXPECTED_CURRENT_USER = 'postgres' as const;
export const EXPECTED_PORT = 5432 as const;
export const EXPECTED_SSLMODE = 'require' as const;

export const EXECUTION_SQL_AUTHORITY_FOUNDATION_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1' as const;

export const EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID =
  'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1' as const;

export const STATIC_EXECUTION_AUTHORIZATION_IDS = [
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  REMOTE_CONNECTION_AUTHORITY_ID,
  REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
] as const;

export const POST_CONNECT_GUARD_SQL =
  'SELECT current_database()::text AS current_database_name, current_user::text AS current_user_name;' as const;

export const POST_CONNECT_GUARD_SQL_SHA256 =
  '99f233b1b1daae53391d51c986ffcf335639d19aa60044ecca1ef443f3895536' as const;

export const POST_CONNECT_GUARD_BINDING = {
  sql: POST_CONNECT_GUARD_SQL,
  sql_sha256: POST_CONNECT_GUARD_SQL_SHA256,
  expected: {
    current_database_name: EXPECTED_DATABASE_NAME,
    current_user_name: EXPECTED_CURRENT_USER,
    row_count: 1,
  },
  mandatory_before_begin: true,
  pre_connect_pass_never_substitutes: true,
  mismatch_closes_connection_and_stop: true,
  no_mutation_before_pass: true,
} as const;

export const EVIDENCE_ALLOWED_FIELDS = [
  'credential_method',
  'target_binding_hash',
  'target_binding_identifier',
  'outcome_code',
  'repository_branch',
  'repository_head',
  'repository_tree',
  'selected_step',
  'authority_identifier',
  'manifest_identifier',
  'cleanup_temp_file_removed',
  'cleanup_pgpass_removed',
  'cleanup_stdin_buffer_zeroized',
] as const;

export const EVIDENCE_FORBIDDEN_FIELDS = [
  'password',
  'token',
  'key',
  'connection_string',
  'full_db_url',
  'pgpass_path',
  'pgpass_content',
  'stdin_body',
  'raw_host',
  'error_message',
  'stack',
  'cwd',
  'filesystem_path',
  'access_token',
  'refresh_token',
  'service_role_value',
  'private_key',
] as const;

export const FORBIDDEN_HOST_LITERALS = [
  'localhost',
  '127.0.0.1',
  '::1',
] as const;

export const PRIVATE_IPV4_PREFIXES = [
  '10.',
  '192.168.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
] as const;

export const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

export const STEP_IDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const;

export type ConnectionAuthorityStepId = (typeof STEP_IDS)[number];

export type TargetBindingOutcome = 'PASS_TARGET_BINDING' | PreviewRemoteApplyHoldCode;

export type CredentialMethodSelectionInput = {
  readonly credentialMethod: string;
  readonly ambientEnvFallback?: boolean;
  readonly credentialInArgv?: boolean;
  readonly credentialDsnInput?: boolean;
  readonly evidenceFields?: readonly string[];
};

export type CredentialMethodSelectionResult = {
  readonly ok: boolean;
  readonly holdReasonCode?: PreviewRemoteApplyHoldCode;
};

export type ExpectedAuthorizationBinding = {
  readonly environment: string;
  readonly organizationSlug: string;
  readonly projectName: string;
  readonly databaseSource: string;
  readonly databaseName: string;
  readonly expectedCurrentUser: string;
  readonly projectRef: string;
  readonly host: string;
  readonly hostFingerprintSha256: string;
  readonly port: number;
  readonly sslmode: string;
  readonly credentialMethod: string;
  readonly repositoryBranch: string;
  readonly repositoryHead: string;
  readonly repositoryTree: string;
  readonly executionAuthorizationId: string;
  readonly selectedStep: string;
  readonly executionSqlAuthorityFoundationId: string;
  readonly executionSqlAuthorityFoundationManifestId: string;
  readonly remoteExecutionLifecycleAuthorityId: string;
  readonly remoteConnectionAuthorityId: string;
  readonly executeBooleanOnly?: boolean;
  readonly secretFieldsInBinding?: readonly string[];
};

export type ObservedPreConnectFacts = {
  readonly environment: string;
  readonly organizationSlug: string;
  readonly projectName: string;
  readonly databaseSource: string;
  readonly databaseName: string;
  readonly expectedCurrentUser: string;
  readonly projectRef: string;
  readonly host: string;
  readonly hostFingerprintSha256: string;
  readonly port: number;
  readonly sslmode: string;
  readonly credentialMethod: string;
  readonly repositoryBranch: string;
  readonly repositoryHead: string;
  readonly repositoryTree: string;
  readonly executionAuthorizationId: string;
  readonly selectedStep: string;
  readonly executionSqlAuthorityFoundationId: string;
  readonly executionSqlAuthorityFoundationManifestId: string;
  readonly remoteExecutionLifecycleAuthorityId: string;
  readonly remoteConnectionAuthorityId: string;
};

export type NonsecretTargetBindingInput = {
  readonly expected: ExpectedAuthorizationBinding;
  readonly observed: ObservedPreConnectFacts;
};

export type TargetBindingReceipt = {
  readonly outcome: 'PASS_TARGET_BINDING';
  readonly targetBindingIdentifier: string;
  readonly credentialMethod: string;
  readonly selectedStep: string;
  readonly repositoryHead: string;
  readonly repositoryTree: string;
  readonly executionAuthorizationId: string;
};

export type NonsecretTargetBindingResult =
  | { readonly ok: true; readonly outcome: 'PASS_TARGET_BINDING'; readonly receipt: TargetBindingReceipt }
  | { readonly ok: false; readonly outcome: PreviewRemoteApplyHoldCode };

export type CanonicalHostFingerprintResult =
  | { readonly ok: true; readonly normalizedHost: string; readonly fingerprintSha256: string }
  | { readonly ok: false; readonly rejectionReason: PreviewRemoteApplyHoldCode };

export type CredentialAcquisitionPlanInput = NonsecretTargetBindingInput;

export type CredentialAcquisitionPlan = {
  readonly credentialMethod: CredentialMethodId;
  readonly implementation_status: 'UNIMPLEMENTED';
  readonly execution_authorized: false;
  readonly acquisition_implemented: false;
  readonly target_binding_identifier: string;
  readonly cleanup_required: {
    readonly temp_file_removed: true;
    readonly pgpass_removed: true;
    readonly stdin_buffer_zeroized: true;
  };
};

export type CredentialAcquisitionPlanResult =
  | { readonly ok: false; readonly outcome: PreviewRemoteApplyHoldCode }
  | { readonly ok: true; readonly plan: CredentialAcquisitionPlan };

export type RemoteConnectionAuthorityDocument = {
  readonly identifier: typeof REMOTE_CONNECTION_AUTHORITY_ID;
  readonly execution_authorized: false;
  readonly acquisition_implemented: false;
  readonly target_binding_implemented: false;
  readonly authority_semantics_frozen: true;
  readonly approved_credential_methods: readonly CredentialMethodId[];
  readonly global_credential_rules: Record<string, unknown>;
  readonly secure_stdin_connection_config_v1: Record<string, unknown>;
  readonly temp_pgpassfile_0600_v1: Record<string, unknown>;
  readonly execution_authorization_identity: Record<string, unknown>;
  readonly expected_vs_observed_binding: Record<string, unknown>;
  readonly runtime_schema_validation: Record<string, unknown>;
  readonly runtime_type_validation: Record<string, unknown>;
  readonly outer_binding_envelope_validation: Record<string, unknown>;
  readonly credential_method_selection_input_validation: Record<string, unknown>;
  readonly dense_plain_string_array_validation: Record<string, unknown>;
  readonly plan_requires_validated_binding_receipt: true;
  readonly validated_receipt_is_only_public_binding_identifier_source: true;
  readonly target_connection_binding: Record<string, unknown>;
  readonly pre_connect_target_gate: Record<string, unknown>;
  readonly post_connect_guard_binding: typeof POST_CONNECT_GUARD_BINDING;
  readonly evidence_logging: {
    readonly allowed_fields: readonly string[];
    readonly forbidden_fields: readonly string[];
  };
};

export type RemoteConnectionAuthorityValidationResult = {
  readonly ok: boolean;
  readonly mismatchCategories: readonly string[];
};

export const EXPECTED_AUTHORIZATION_BINDING_REQUIRED_KEYS = [
  'environment',
  'organizationSlug',
  'projectName',
  'databaseSource',
  'databaseName',
  'expectedCurrentUser',
  'projectRef',
  'host',
  'hostFingerprintSha256',
  'port',
  'sslmode',
  'credentialMethod',
  'repositoryBranch',
  'repositoryHead',
  'repositoryTree',
  'executionAuthorizationId',
  'selectedStep',
  'executionSqlAuthorityFoundationId',
  'executionSqlAuthorityFoundationManifestId',
  'remoteExecutionLifecycleAuthorityId',
  'remoteConnectionAuthorityId',
] as const satisfies readonly (keyof ExpectedAuthorizationBinding)[];

export const EXPECTED_AUTHORIZATION_BINDING_OPTIONAL_KEYS = [
  'executeBooleanOnly',
  'secretFieldsInBinding',
] as const satisfies readonly (keyof ExpectedAuthorizationBinding)[];

export const NONSECRET_TARGET_BINDING_ENVELOPE_REQUIRED_KEYS = [
  'expected',
  'observed',
] as const;

export const CREDENTIAL_METHOD_SELECTION_REQUIRED_KEYS = ['credentialMethod'] as const;

export const CREDENTIAL_METHOD_SELECTION_OPTIONAL_KEYS = [
  'ambientEnvFallback',
  'credentialInArgv',
  'credentialDsnInput',
  'evidenceFields',
] as const satisfies readonly (keyof CredentialMethodSelectionInput)[];

export const OBSERVED_PRE_CONNECT_REQUIRED_KEYS = [
  'environment',
  'organizationSlug',
  'projectName',
  'databaseSource',
  'databaseName',
  'expectedCurrentUser',
  'projectRef',
  'host',
  'hostFingerprintSha256',
  'port',
  'sslmode',
  'credentialMethod',
  'repositoryBranch',
  'repositoryHead',
  'repositoryTree',
  'executionAuthorizationId',
  'selectedStep',
  'executionSqlAuthorityFoundationId',
  'executionSqlAuthorityFoundationManifestId',
  'remoteExecutionLifecycleAuthorityId',
  'remoteConnectionAuthorityId',
] as const satisfies readonly (keyof ObservedPreConnectFacts)[];

export const FORBIDDEN_SECRET_BINDING_KEYS = [
  'password',
  'token',
  'key',
  'connectionString',
  'connection_string',
  'fullDbUrl',
  'full_db_url',
  'dsn',
  'pgpass',
  'pgpassPath',
  'stdinBody',
  'accessToken',
  'refreshToken',
  'serviceRoleValue',
  'privateKey',
] as const;

const OBSERVED_BINDING_FIELDS = OBSERVED_PRE_CONNECT_REQUIRED_KEYS;

function stable(value: unknown): string {
  return canonicalSerializePreviewRemoteApply(value);
}

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function isCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function isStaticExecutionAuthorizationId(value: string): boolean {
  return STATIC_EXECUTION_AUTHORIZATION_IDS.includes(
    value as (typeof STATIC_EXECUTION_AUTHORIZATION_IDS)[number],
  );
}

function isPlainBindingObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateCanonicalExecutionAuthorizationId(
  executionAuthorizationId: string,
): PreviewRemoteApplyHoldCode | null {
  if (typeof executionAuthorizationId !== 'string' || executionAuthorizationId.length === 0) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (executionAuthorizationId !== executionAuthorizationId.trim()) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (executionAuthorizationId.trim().length === 0) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (isStaticExecutionAuthorizationId(executionAuthorizationId)) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  return null;
}

function isOwnEnumerableDataDescriptor(
  descriptors: Record<PropertyKey, PropertyDescriptor>,
  key: string,
): boolean {
  const descriptor = descriptors[key];
  if (!descriptor) return false;
  return (
    descriptor.enumerable === true &&
    descriptor.get === undefined &&
    descriptor.set === undefined &&
    'value' in descriptor
  );
}

function isExactRuntimeString(value: unknown): value is string {
  return typeof value === 'string';
}

function isExactRuntimeFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value === Math.trunc(value);
}

function isExactRuntimeBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isBoxedPrimitive(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const tag = Object.prototype.toString.call(value);
  return tag === '[object String]' || tag === '[object Number]' || tag === '[object Boolean]';
}

function hasInheritedEnumerableProperty(value: object): boolean {
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return true;
    }
  }
  return false;
}

function validateRuntimeObjectSchema(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  forbiddenSecretKeys: readonly string[] = FORBIDDEN_SECRET_BINDING_KEYS,
): PreviewRemoteApplyHoldCode | null {
  if (!isPlainBindingObject(value)) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }

  if (hasInheritedEnumerableProperty(value)) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }

  const allowedKeys = new Set<string>([...requiredKeys, ...optionalKeys]);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);

  for (const key of ownKeys) {
    if (typeof key === 'symbol') {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
    if (
      forbiddenSecretKeys.includes(
        key as (typeof FORBIDDEN_SECRET_BINDING_KEYS)[number],
      )
    ) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
    if (!allowedKeys.has(key)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
    const descriptor = descriptors[key];
    if (!descriptor) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
    if (!descriptor.enumerable || !('value' in descriptor)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
    if (!isOwnEnumerableDataDescriptor(descriptors, key)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  for (const key of optionalKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      if (!isOwnEnumerableDataDescriptor(descriptors, key)) {
        return 'HOLD_EXECUTION_NOT_AUTHORIZED';
      }
    }
  }

  return null;
}

function validateBindingRuntimeSchema(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
): PreviewRemoteApplyHoldCode | null {
  return validateRuntimeObjectSchema(value, requiredKeys, optionalKeys);
}

function validateNonsecretTargetBindingEnvelope(
  value: unknown,
): PreviewRemoteApplyHoldCode | null {
  const envelopeHold = validateRuntimeObjectSchema(
    value,
    NONSECRET_TARGET_BINDING_ENVELOPE_REQUIRED_KEYS,
    [],
    [],
  );
  if (envelopeHold) {
    return envelopeHold;
  }
  const record = value as Record<string, unknown>;
  const expectedValue = Object.getOwnPropertyDescriptor(record, 'expected')?.value;
  const observedValue = Object.getOwnPropertyDescriptor(record, 'observed')?.value;
  if (!isPlainBindingObject(expectedValue) || !isPlainBindingObject(observedValue)) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  return null;
}

function isCanonicalArrayIndexKey(key: string): boolean {
  return /^(?:0|[1-9][0-9]*)$/.test(key);
}

type DensePlainStringArrayResult =
  | { readonly ok: true; readonly snapshot: readonly string[] }
  | { readonly ok: false; readonly hold: PreviewRemoteApplyHoldCode };

function validateDensePlainStringArray(value: unknown): DensePlainStringArrayResult {
  try {
    if (!Array.isArray(value)) {
      return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    if (hasInheritedEnumerableProperty(value)) {
      return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(value);
    const lengthDescriptor = descriptors.length;
    if (
      !lengthDescriptor ||
      lengthDescriptor.get !== undefined ||
      lengthDescriptor.set !== undefined ||
      !('value' in lengthDescriptor)
    ) {
      return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    const length = lengthDescriptor.value;
    if (
      typeof length !== 'number' ||
      !Number.isFinite(length) ||
      length !== Math.trunc(length) ||
      length < 0
    ) {
      return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }

    for (const key of ownKeys) {
      if (typeof key === 'symbol') {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      if (key === 'length') {
        continue;
      }
      if (!isCanonicalArrayIndexKey(key)) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      const index = Number(key);
      if (index < 0 || index >= length) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      const descriptor = descriptors[key];
      if (!descriptor) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      if (!descriptor.enumerable || !('value' in descriptor)) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      const item = descriptor.value;
      if (!isExactRuntimeString(item) || isBoxedPrimitive(item)) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
    }

    const snapshot: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      ) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      const item = descriptor.value;
      if (!isExactRuntimeString(item) || isBoxedPrimitive(item)) {
        return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
      }
      snapshot.push(item);
    }

    return { ok: true, snapshot };
  } catch {
    return { ok: false, hold: 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
}

function validateCredentialMethodSelectionEnvelope(
  value: unknown,
): PreviewRemoteApplyHoldCode | null {
  const envelopeHold = validateRuntimeObjectSchema(
    value,
    CREDENTIAL_METHOD_SELECTION_REQUIRED_KEYS,
    CREDENTIAL_METHOD_SELECTION_OPTIONAL_KEYS,
    [],
  );
  if (envelopeHold) {
    return envelopeHold;
  }
  const record = value as Record<string, unknown>;
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') continue;
    const fieldValue = Object.getOwnPropertyDescriptor(record, key)?.value;
    if (isBoxedPrimitive(fieldValue)) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
  }
  const credentialMethod = Object.getOwnPropertyDescriptor(record, 'credentialMethod')?.value;
  if (!isExactRuntimeString(credentialMethod)) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  for (const key of CREDENTIAL_METHOD_SELECTION_OPTIONAL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const fieldValue = Object.getOwnPropertyDescriptor(record, key)?.value;
    if (key === 'evidenceFields') {
      const arrayResult = validateDensePlainStringArray(fieldValue);
      if (!arrayResult.ok) {
        return arrayResult.hold;
      }
      continue;
    }
    if (!isExactRuntimeBoolean(fieldValue)) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
  }
  return null;
}

function validateExpectedBindingRuntimeTypes(
  value: Record<string, unknown>,
): PreviewRemoteApplyHoldCode | null {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue;
    const fieldValue = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (isBoxedPrimitive(fieldValue)) {
      if (key === 'secretFieldsInBinding') {
        return 'HOLD_CREDENTIAL_METHOD_INVALID';
      }
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  for (const key of EXPECTED_AUTHORIZATION_BINDING_REQUIRED_KEYS) {
    const fieldValue = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (key === 'port') {
      if (!isExactRuntimeFiniteInteger(fieldValue)) {
        return 'HOLD_EXECUTION_NOT_AUTHORIZED';
      }
      continue;
    }
    if (!isExactRuntimeString(fieldValue)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  for (const key of EXPECTED_AUTHORIZATION_BINDING_OPTIONAL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const fieldValue = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (key === 'executeBooleanOnly') {
      if (!isExactRuntimeBoolean(fieldValue)) {
        return 'HOLD_EXECUTION_NOT_AUTHORIZED';
      }
      continue;
    }
    if (key === 'secretFieldsInBinding') {
      const arrayResult = validateDensePlainStringArray(fieldValue);
      if (!arrayResult.ok) {
        return arrayResult.hold;
      }
    }
  }

  return null;
}

function validateObservedBindingRuntimeTypes(
  value: Record<string, unknown>,
): PreviewRemoteApplyHoldCode | null {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue;
    const fieldValue = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (isBoxedPrimitive(fieldValue)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  for (const key of OBSERVED_PRE_CONNECT_REQUIRED_KEYS) {
    const fieldValue = Object.getOwnPropertyDescriptor(value, key)?.value;
    if (key === 'port') {
      if (!isExactRuntimeFiniteInteger(fieldValue)) {
        return 'HOLD_EXECUTION_NOT_AUTHORIZED';
      }
      continue;
    }
    if (!isExactRuntimeString(fieldValue)) {
      return 'HOLD_EXECUTION_NOT_AUTHORIZED';
    }
  }

  return null;
}

function isNonsecretTargetBindingInput(value: unknown): value is NonsecretTargetBindingInput {
  return validateNonsecretTargetBindingEnvelope(value) === null;
}

function snapshotValidatedExpectedBinding(value: Record<string, unknown>): ExpectedAuthorizationBinding {
  const snapshot: Record<string, unknown> = {};
  for (const key of EXPECTED_AUTHORIZATION_BINDING_REQUIRED_KEYS) {
    snapshot[key] = Object.getOwnPropertyDescriptor(value, key)!.value;
  }
  for (const key of EXPECTED_AUTHORIZATION_BINDING_OPTIONAL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      snapshot[key] = Object.getOwnPropertyDescriptor(value, key)!.value;
    }
  }
  return snapshot as ExpectedAuthorizationBinding;
}

function snapshotValidatedObservedFacts(value: Record<string, unknown>): ObservedPreConnectFacts {
  const snapshot: Record<string, unknown> = {};
  for (const key of OBSERVED_PRE_CONNECT_REQUIRED_KEYS) {
    snapshot[key] = Object.getOwnPropertyDescriptor(value, key)!.value;
  }
  return snapshot as ObservedPreConnectFacts;
}

function containsForbiddenHostLiteral(normalizedHost: string): boolean {
  if (FORBIDDEN_HOST_LITERALS.includes(normalizedHost as (typeof FORBIDDEN_HOST_LITERALS)[number])) {
    return true;
  }
  return PRIVATE_IPV4_PREFIXES.some((prefix) => normalizedHost.startsWith(prefix));
}

function expectedHostForProjectRef(projectRef: string): string {
  return `db.${projectRef.trim().toLowerCase()}.supabase.co`;
}

export function calculateCanonicalHostFingerprint(host: string): CanonicalHostFingerprintResult {
  const trimmed = host.trim();
  if (trimmed.length === 0) {
    return { ok: false, rejectionReason: 'HOLD_TARGET_FINGERPRINT_INCOMPLETE' };
  }
  if (URI_SCHEME_PATTERN.test(trimmed)) {
    return { ok: false, rejectionReason: 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  if (/[@:?#\/]/.test(trimmed)) {
    return { ok: false, rejectionReason: 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  const normalizedHost = trimmed.toLowerCase();
  if (containsForbiddenHostLiteral(normalizedHost)) {
    return { ok: false, rejectionReason: 'HOLD_TARGET_PRODUCTION_FORBIDDEN' };
  }
  const fingerprintSha256 = createHash('sha256').update(normalizedHost, 'utf8').digest('hex');
  return { ok: true, normalizedHost, fingerprintSha256 };
}

function validateEvidenceFields(fields: readonly string[] | undefined): PreviewRemoteApplyHoldCode | null {
  if (!fields) return null;
  for (const field of fields) {
    if (EVIDENCE_FORBIDDEN_FIELDS.includes(field as (typeof EVIDENCE_FORBIDDEN_FIELDS)[number])) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
    if (!EVIDENCE_ALLOWED_FIELDS.includes(field as (typeof EVIDENCE_ALLOWED_FIELDS)[number])) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
  }
  return null;
}

export function validateCredentialMethodSelection(
  input: unknown,
): CredentialMethodSelectionResult {
  try {
    const envelopeHold = validateCredentialMethodSelectionEnvelope(input);
    if (envelopeHold) {
      return { ok: false, holdReasonCode: envelopeHold };
    }
    const record = input as Record<string, unknown>;
    const ambientEnvFallback = Object.getOwnPropertyDescriptor(record, 'ambientEnvFallback')?.value;
    if (ambientEnvFallback === true) {
      return { ok: false, holdReasonCode: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    const credentialInArgv = Object.getOwnPropertyDescriptor(record, 'credentialInArgv')?.value;
    const credentialDsnInput = Object.getOwnPropertyDescriptor(record, 'credentialDsnInput')?.value;
    if (credentialInArgv === true || credentialDsnInput === true) {
      return { ok: false, holdReasonCode: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    const evidenceFieldsValue = Object.getOwnPropertyDescriptor(record, 'evidenceFields')?.value;
    if (evidenceFieldsValue !== undefined) {
      const arrayResult = validateDensePlainStringArray(evidenceFieldsValue);
      if (!arrayResult.ok) {
        return { ok: false, holdReasonCode: arrayResult.hold };
      }
      const evidenceHold = validateEvidenceFields(arrayResult.snapshot);
      if (evidenceHold) {
        return { ok: false, holdReasonCode: evidenceHold };
      }
    }
    const credentialMethod = Object.getOwnPropertyDescriptor(record, 'credentialMethod')!.value as string;
    if (!APPROVED_CREDENTIAL_METHODS.includes(credentialMethod as CredentialMethodId)) {
      return { ok: false, holdReasonCode: 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    return { ok: true };
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_EXECUTION_NOT_AUTHORIZED' };
  }
}

function validateExpectedAuthorityIdentifiers(
  expected: ExpectedAuthorizationBinding,
): PreviewRemoteApplyHoldCode | null {
  if (expected.executionSqlAuthorityFoundationId !== EXECUTION_SQL_AUTHORITY_FOUNDATION_ID) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.executionSqlAuthorityFoundationManifestId !== EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.remoteExecutionLifecycleAuthorityId !== REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.remoteConnectionAuthorityId !== REMOTE_CONNECTION_AUTHORITY_ID) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  return null;
}

function validateExpectedBindingRules(
  expected: ExpectedAuthorizationBinding,
): PreviewRemoteApplyHoldCode | null {
  if (expected.executeBooleanOnly === true) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (expected.secretFieldsInBinding && expected.secretFieldsInBinding.length > 0) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (
    expected.organizationSlug === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    expected.projectName === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return 'HOLD_TARGET_PRODUCTION_FORBIDDEN';
  }
  if (
    expected.environment !== EXPECTED_ENVIRONMENT ||
    expected.organizationSlug !== APPROVED_PREVIEW_ORGANIZATION ||
    expected.projectName !== APPROVED_PREVIEW_PROJECT ||
    expected.databaseSource !== APPROVED_PREVIEW_DATABASE_TIER ||
    expected.databaseName !== EXPECTED_DATABASE_NAME ||
    expected.expectedCurrentUser !== EXPECTED_CURRENT_USER
  ) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  if (expected.repositoryBranch !== EXPECTED_BRANCH) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (!isCommitSha(expected.repositoryHead) || !isCommitSha(expected.repositoryTree)) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (!STEP_IDS.includes(expected.selectedStep as ConnectionAuthorityStepId)) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  const credentialHold = validateCredentialMethodSelection({ credentialMethod: expected.credentialMethod });
  if (!credentialHold.ok) {
    return credentialHold.holdReasonCode ?? 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (!expected.projectRef || expected.projectRef.trim().length === 0) {
    return 'HOLD_TARGET_FINGERPRINT_INCOMPLETE';
  }
  if (!expected.hostFingerprintSha256 || !isSha256Hex(expected.hostFingerprintSha256)) {
    return 'HOLD_TARGET_FINGERPRINT_INCOMPLETE';
  }
  const hostResult = calculateCanonicalHostFingerprint(expected.host);
  if (!hostResult.ok) {
    return hostResult.rejectionReason;
  }
  const derivedHost = expectedHostForProjectRef(expected.projectRef);
  if (hostResult.normalizedHost !== derivedHost) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  if (hostResult.fingerprintSha256 !== expected.hostFingerprintSha256) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  if (expected.port !== EXPECTED_PORT || expected.sslmode !== EXPECTED_SSLMODE) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  const executionAuthHold = validateCanonicalExecutionAuthorizationId(expected.executionAuthorizationId);
  if (executionAuthHold) {
    return executionAuthHold;
  }
  const authorityHold = validateExpectedAuthorityIdentifiers(expected);
  if (authorityHold) {
    return authorityHold;
  }
  return null;
}

function compareExpectedObservedBinding(
  expected: ExpectedAuthorizationBinding,
  observed: ObservedPreConnectFacts,
): PreviewRemoteApplyHoldCode | null {
  const expectedAuthHold = validateCanonicalExecutionAuthorizationId(expected.executionAuthorizationId);
  if (expectedAuthHold) {
    return expectedAuthHold;
  }
  const observedAuthHold = validateCanonicalExecutionAuthorizationId(observed.executionAuthorizationId);
  if (observedAuthHold) {
    return observedAuthHold;
  }
  if (expected.executionAuthorizationId !== observed.executionAuthorizationId) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (expected.repositoryHead !== observed.repositoryHead) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (expected.repositoryTree !== observed.repositoryTree) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (expected.selectedStep !== observed.selectedStep) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (expected.credentialMethod !== observed.credentialMethod) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  if (
    expected.projectRef !== observed.projectRef ||
    expected.host !== observed.host ||
    expected.hostFingerprintSha256 !== observed.hostFingerprintSha256
  ) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  if (expected.executionSqlAuthorityFoundationId !== observed.executionSqlAuthorityFoundationId) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.executionSqlAuthorityFoundationManifestId !== observed.executionSqlAuthorityFoundationManifestId) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.remoteExecutionLifecycleAuthorityId !== observed.remoteExecutionLifecycleAuthorityId) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  if (expected.remoteConnectionAuthorityId !== observed.remoteConnectionAuthorityId) {
    return 'HOLD_AUTHORITY_IDENTITY_MISMATCH';
  }
  for (const field of OBSERVED_BINDING_FIELDS) {
    if (expected[field] !== observed[field]) {
      if (
        field === 'organizationSlug' ||
        field === 'projectName' ||
        field === 'databaseSource' ||
        field === 'databaseName' ||
        field === 'expectedCurrentUser' ||
        field === 'environment'
      ) {
        return 'HOLD_TARGET_IDENTITY_MISMATCH';
      }
      if (field === 'repositoryBranch') {
        return 'HOLD_REPO_IDENTITY_MISMATCH';
      }
      if (field === 'port' || field === 'sslmode') {
        return 'HOLD_TARGET_IDENTITY_MISMATCH';
      }
    }
  }
  return null;
}

function computeTargetBindingIdentifier(expected: ExpectedAuthorizationBinding): string {
  return createHash('sha256')
    .update(
      stable({
        environment: expected.environment,
        organizationSlug: expected.organizationSlug,
        projectName: expected.projectName,
        databaseSource: expected.databaseSource,
        databaseName: expected.databaseName,
        expectedCurrentUser: expected.expectedCurrentUser,
        projectRef: expected.projectRef,
        host: expected.host,
        hostFingerprintSha256: expected.hostFingerprintSha256,
        port: expected.port,
        sslmode: expected.sslmode,
        credentialMethod: expected.credentialMethod,
        repositoryBranch: expected.repositoryBranch,
        repositoryHead: expected.repositoryHead,
        repositoryTree: expected.repositoryTree,
        executionAuthorizationId: expected.executionAuthorizationId,
        selectedStep: expected.selectedStep,
        executionSqlAuthorityFoundationId: expected.executionSqlAuthorityFoundationId,
        executionSqlAuthorityFoundationManifestId: expected.executionSqlAuthorityFoundationManifestId,
        remoteExecutionLifecycleAuthorityId: expected.remoteExecutionLifecycleAuthorityId,
        remoteConnectionAuthorityId: expected.remoteConnectionAuthorityId,
      }),
      'utf8',
    )
    .digest('hex');
}

export function validateNonsecretTargetBinding(
  input: unknown,
): NonsecretTargetBindingResult {
  try {
    const envelopeHold = validateNonsecretTargetBindingEnvelope(input);
    if (envelopeHold) {
      return { ok: false, outcome: envelopeHold };
    }

    const envelope = input as Record<string, unknown>;
    const expectedRecord = Object.getOwnPropertyDescriptor(envelope, 'expected')!
      .value as Record<string, unknown>;
    const observedRecord = Object.getOwnPropertyDescriptor(envelope, 'observed')!
      .value as Record<string, unknown>;

    const expectedSchemaHold = validateBindingRuntimeSchema(
      expectedRecord,
      EXPECTED_AUTHORIZATION_BINDING_REQUIRED_KEYS,
      EXPECTED_AUTHORIZATION_BINDING_OPTIONAL_KEYS,
    );
    if (expectedSchemaHold) {
      return { ok: false, outcome: expectedSchemaHold };
    }
    const observedSchemaHold = validateBindingRuntimeSchema(
      observedRecord,
      OBSERVED_PRE_CONNECT_REQUIRED_KEYS,
      [],
    );
    if (observedSchemaHold) {
      return { ok: false, outcome: observedSchemaHold };
    }

    const expectedTypeHold = validateExpectedBindingRuntimeTypes(expectedRecord);
    if (expectedTypeHold) {
      return { ok: false, outcome: expectedTypeHold };
    }
    const observedTypeHold = validateObservedBindingRuntimeTypes(observedRecord);
    if (observedTypeHold) {
      return { ok: false, outcome: observedTypeHold };
    }

    const expected = snapshotValidatedExpectedBinding(expectedRecord);
    const observed = snapshotValidatedObservedFacts(observedRecord);

    const expectedHold = validateExpectedBindingRules(expected);
    if (expectedHold) {
      return { ok: false, outcome: expectedHold };
    }
    const observedHold = compareExpectedObservedBinding(expected, observed);
    if (observedHold) {
      return { ok: false, outcome: observedHold };
    }
    return {
      ok: true,
      outcome: 'PASS_TARGET_BINDING',
      receipt: {
        outcome: 'PASS_TARGET_BINDING',
        targetBindingIdentifier: computeTargetBindingIdentifier(expected),
        credentialMethod: expected.credentialMethod,
        selectedStep: expected.selectedStep,
        repositoryHead: expected.repositoryHead,
        repositoryTree: expected.repositoryTree,
        executionAuthorizationId: expected.executionAuthorizationId,
      },
    };
  } catch {
    return { ok: false, outcome: 'HOLD_EXECUTION_NOT_AUTHORIZED' };
  }
}

export function buildCredentialAcquisitionPlan(
  input: unknown,
): CredentialAcquisitionPlanResult {
  try {
    const envelopeHold = validateNonsecretTargetBindingEnvelope(input);
    if (envelopeHold) {
      return { ok: false, outcome: envelopeHold };
    }
    const envelope = input as Record<string, unknown>;
    const expectedRecord = Object.getOwnPropertyDescriptor(envelope, 'expected')!.value;
    if (!isPlainBindingObject(expectedRecord)) {
      return { ok: false, outcome: 'HOLD_EXECUTION_NOT_AUTHORIZED' };
    }
    const credentialMethod = Object.getOwnPropertyDescriptor(expectedRecord, 'credentialMethod')?.value;
    const credentialHold = validateCredentialMethodSelection({ credentialMethod });
    if (!credentialHold.ok) {
      return { ok: false, outcome: credentialHold.holdReasonCode ?? 'HOLD_CREDENTIAL_METHOD_INVALID' };
    }
    const bindingResult = validateNonsecretTargetBinding(input);
    if (!bindingResult.ok) {
      return { ok: false, outcome: bindingResult.outcome };
    }
    return {
      ok: true,
      plan: {
        credentialMethod: bindingResult.receipt.credentialMethod as CredentialMethodId,
        implementation_status: 'UNIMPLEMENTED',
        execution_authorized: false,
        acquisition_implemented: false,
        target_binding_identifier: bindingResult.receipt.targetBindingIdentifier,
        cleanup_required: {
          temp_file_removed: true,
          pgpass_removed: true,
          stdin_buffer_zeroized: true,
        },
      },
    };
  } catch {
    return { ok: false, outcome: 'HOLD_EXECUTION_NOT_AUTHORIZED' };
  }
}

export const EXPECTED_REMOTE_CONNECTION_AUTHORITY_BINDING = {
  path: 'docs/planning/preview-remote-apply/M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1.json',
  approved_credential_methods: [...APPROVED_CREDENTIAL_METHODS],
  post_connect_guard_sql_sha256: POST_CONNECT_GUARD_SQL_SHA256,
  evidence_allowed_field_count: EVIDENCE_ALLOWED_FIELDS.length,
  evidence_forbidden_field_count: EVIDENCE_FORBIDDEN_FIELDS.length,
  authority_semantics_frozen: true,
  acquisition_implemented: false,
  target_binding_implemented: false,
  execution_authorized: false,
  plan_requires_validated_binding_receipt: true,
} as const;

export const EXPECTED_REMOTE_CONNECTION_AUTHORITY = {
  identifier: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
  execution_authorized: false,
  acquisition_implemented: false,
  target_binding_implemented: false,
  authority_semantics_frozen: true,
  approved_credential_methods: [
    'SECURE_STDIN_CONNECTION_CONFIG_v1',
    'TEMP_PGPASSFILE_0600_v1',
  ],
  global_credential_rules: {
    credentials_never_stored_in_repository: true,
    credentials_never_stored_in_authority_json: true,
    credentials_never_printed: true,
    credentials_never_in_public_evidence: true,
    credentials_never_accepted_in_cli_argv: true,
    credentials_never_accepted_in_query_string: true,
    credentials_never_from_ambient_pghost: true,
    credentials_never_from_ambient_pgport: true,
    credentials_never_from_ambient_pguser: true,
    credentials_never_from_ambient_pgpassword: true,
    credentials_never_from_ambient_pgdatabase: true,
    full_connection_url_forbidden: true,
    automatic_credential_fallback_forbidden: true,
    method_must_be_explicitly_selected: true,
    acquisition_only_after_nonsecret_pre_connect_pass: true,
    credential_lifetime_one_execution_attempt_only: true,
    no_retry_reuse: true,
    no_secret_bearing_error_propagation: true,
    execution_authorized: false,
    acquisition_implemented: false,
  },
  secure_stdin_connection_config_v1: {
    identifier: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
    input_channel: 'stdin_only',
    payload_format: 'one_bounded_json_object',
    allowed_secret_bearing_fields: ['host', 'port', 'database', 'user', 'password', 'sslmode'],
    reject_unknown_fields: true,
    reject_duplicate_fields: true,
    reject_trailing_data: true,
    reject_multiple_json_objects: true,
    reject_empty_values: true,
    reject_embedded_credentials_in_host: true,
    reject_uri_or_dsn_input: true,
    reject_environment_interpolation: true,
    bounded_maximum_input_size: true,
    parse_once: true,
    secret_buffer_lifetime_bounded: true,
    overwrite_zeroize_mutable_byte_buffers: true,
    release_references_after_transport_close: true,
    never_serialize_parsed_credentials_to_evidence: true,
    implementation_status: 'UNIMPLEMENTED',
    execution_authorized: false,
    acquisition_implemented: false,
  },
  temp_pgpassfile_0600_v1: {
    identifier: 'TEMP_PGPASSFILE_0600_v1',
    temp_file_only_after_nonsecret_authorization: true,
    unique_private_directory_and_file: true,
    file_mode_exactly_0600: true,
    regular_file_only: true,
    owner_must_equal_effective_user: true,
    no_symlink_or_hardlink: true,
    no_preexisting_file_reuse: true,
    no_world_or_group_permissions: true,
    one_exact_target_tuple_only: true,
    path_never_emitted_in_public_evidence: true,
    file_removed_in_finally: true,
    parent_temp_directory_removed_when_empty: true,
    file_descriptor_closed_before_client_use_if_required: true,
    no_reuse_between_attempts: true,
    implementation_status: 'UNIMPLEMENTED',
    execution_authorized: false,
    acquisition_implemented: false,
  },
  execution_authorization_identity: {
    human_opaque_nonsecret_id_required: true,
    expected_must_equal_observed: true,
    nonempty_required: true,
    leading_trailing_whitespace_forbidden: true,
    whitespace_only_forbidden: true,
    padded_static_authority_identifier_forbidden: true,
    human_authorization_issuance_outside_authority_gate: true,
    static_authority_identifiers_forbidden_as_execution_authorization_id: [
      'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1',
      'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1',
      'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
      'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
    ],
    execution_authorized: false,
  },
  runtime_schema_validation: {
    expected_required_keys: [
      'environment',
      'organizationSlug',
      'projectName',
      'databaseSource',
      'databaseName',
      'expectedCurrentUser',
      'projectRef',
      'host',
      'hostFingerprintSha256',
      'port',
      'sslmode',
      'credentialMethod',
      'repositoryBranch',
      'repositoryHead',
      'repositoryTree',
      'executionAuthorizationId',
      'selectedStep',
      'executionSqlAuthorityFoundationId',
      'executionSqlAuthorityFoundationManifestId',
      'remoteExecutionLifecycleAuthorityId',
      'remoteConnectionAuthorityId',
    ],
    expected_optional_control_keys: ['executeBooleanOnly', 'secretFieldsInBinding'],
    observed_required_keys: [
      'environment',
      'organizationSlug',
      'projectName',
      'databaseSource',
      'databaseName',
      'expectedCurrentUser',
      'projectRef',
      'host',
      'hostFingerprintSha256',
      'port',
      'sslmode',
      'credentialMethod',
      'repositoryBranch',
      'repositoryHead',
      'repositoryTree',
      'executionAuthorizationId',
      'selectedStep',
      'executionSqlAuthorityFoundationId',
      'executionSqlAuthorityFoundationManifestId',
      'remoteExecutionLifecycleAuthorityId',
      'remoteConnectionAuthorityId',
    ],
    unknown_keys_forbidden: true,
    non_plain_object_forbidden: true,
    symbol_keys_forbidden: true,
    inherited_enumerable_properties_forbidden: true,
    inherited_enumerable_for_in_inspection: true,
    reflect_own_keys_closure: true,
    non_enumerable_unknown_or_secret_rejection: true,
    accessor_descriptor_rejection: true,
    own_enumerable_data_property_requirement: true,
    forbidden_secret_bearing_binding_keys: [...FORBIDDEN_SECRET_BINDING_KEYS],
    acquisition_plan_requires_schema_valid_receipt: true,
    execution_authorized: false,
    target_binding_implemented: false,
  },
  runtime_type_validation: {
    exact_primitive_types_required: true,
    no_boxed_primitives: true,
    no_implicit_coercion: true,
    no_valueof_or_tostring_invocation: true,
    port_must_be_finite_integer: true,
    execute_boolean_only_must_be_boolean: true,
    secret_fields_in_binding_must_be_string_array: true,
    malformed_values_return_finite_hold_only: true,
    public_surface_must_not_throw: true,
    execution_authorized: false,
    target_binding_implemented: false,
  },
  outer_binding_envelope_validation: {
    required_keys: [...NONSECRET_TARGET_BINDING_ENVELOPE_REQUIRED_KEYS],
    unknown_keys_forbidden: true,
    non_plain_object_forbidden: true,
    symbol_keys_forbidden: true,
    inherited_enumerable_for_in_inspection: true,
    inherited_enumerable_properties_forbidden: true,
    reflect_own_keys_closure: true,
    accessor_descriptor_rejection: true,
    own_enumerable_data_property_requirement: true,
    nested_expected_observed_must_be_plain_objects: true,
    malformed_envelope_returns_finite_hold_only: true,
    execution_authorized: false,
    target_binding_implemented: false,
  },
  credential_method_selection_input_validation: {
    required_keys: [...CREDENTIAL_METHOD_SELECTION_REQUIRED_KEYS],
    optional_keys: [...CREDENTIAL_METHOD_SELECTION_OPTIONAL_KEYS],
    unknown_keys_forbidden: true,
    non_plain_object_forbidden: true,
    symbol_keys_forbidden: true,
    inherited_enumerable_for_in_inspection: true,
    inherited_enumerable_properties_forbidden: true,
    reflect_own_keys_closure: true,
    accessor_descriptor_rejection: true,
    own_enumerable_data_property_requirement: true,
    exact_runtime_types_required: true,
    malformed_input_returns_finite_hold_only: true,
    execution_authorized: false,
    acquisition_implemented: false,
    evidence_fields_dense_plain_string_array_required: true,
  },
  dense_plain_string_array_validation: {
    evidence_fields_dense_plain_string_array_required: true,
    secret_fields_dense_plain_string_array_required: true,
    array_prototype_must_equal_Array_prototype: true,
    array_allowed_own_keys_length_and_canonical_indices_only: true,
    sparse_array_forbidden: true,
    array_accessor_index_forbidden: true,
    array_symbol_and_extra_properties_forbidden: true,
    array_inherited_enumerable_forbidden: true,
    array_getters_never_invoked: true,
    validated_snapshot_only_semantic_use: true,
    secret_fields_nonempty_array_forbidden: true,
    malformed_array_returns_finite_hold_only: true,
    execution_authorized: false,
    acquisition_implemented: false,
    target_binding_implemented: false,
  },
  expected_vs_observed_binding: {
    expected_authorization_binding_fields: [
      'environment',
      'organization_slug',
      'project_name',
      'database_source',
      'database_name',
      'expected_current_user',
      'project_ref',
      'host',
      'host_fingerprint_sha256',
      'port',
      'sslmode',
      'credential_method',
      'repository_branch',
      'repository_head',
      'repository_tree',
      'execution_authorization_id',
      'selected_step',
      'execution_sql_authority_foundation_id',
      'execution_sql_authority_foundation_manifest_id',
      'remote_execution_lifecycle_authority_id',
      'remote_connection_authority_id',
    ],
    observed_pre_connect_facts_fields: [
      'environment',
      'organization_slug',
      'project_name',
      'database_source',
      'database_name',
      'expected_current_user',
      'project_ref',
      'host',
      'host_fingerprint_sha256',
      'port',
      'sslmode',
      'credential_method',
      'repository_branch',
      'repository_head',
      'repository_tree',
      'execution_authorization_id',
      'selected_step',
      'execution_sql_authority_foundation_id',
      'execution_sql_authority_foundation_manifest_id',
      'remote_execution_lifecycle_authority_id',
      'remote_connection_authority_id',
    ],
    exact_equality_required: true,
    pass_receipt_fields: [
      'outcome',
      'target_binding_identifier',
      'credential_method',
      'selected_step',
      'repository_head',
      'repository_tree',
      'execution_authorization_id',
    ],
    target_binding_identifier_hash_includes_host_and_authority_ids: true,
    target_binding_identifier_receipt_excludes_raw_host: true,
  },
  plan_requires_validated_binding_receipt: true,
  validated_receipt_is_only_public_binding_identifier_source: true,
  target_connection_binding: {
    required_nonsecret_fields: [
      'environment',
      'organization_slug',
      'project_name',
      'database_source',
      'database_name',
      'expected_current_user',
      'project_ref',
      'host',
      'host_fingerprint_sha256',
      'port',
      'sslmode',
      'credential_method',
      'repository_branch',
      'repository_head',
      'repository_tree',
      'execution_authorization_id',
      'selected_step',
      'execution_sql_authority_foundation_id',
      'execution_sql_authority_foundation_manifest_id',
      'remote_execution_lifecycle_authority_id',
      'remote_connection_authority_id',
    ],
    frozen_preview_values: {
      environment: 'Preview',
      organization_slug: 'm55-preview',
      project_name: 'm55-soul-preview',
      database_source: 'Primary Database',
      database_name: 'postgres',
      expected_current_user: 'postgres',
      port: 5432,
      sslmode: 'require',
      repository_branch: 'feat/m55-paid-lp-canonical-wave1',
      execution_sql_authority_foundation_id: 'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_v1',
      execution_sql_authority_foundation_manifest_id:
        'M55_PREVIEW_REMOTE_EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_v1',
      remote_execution_lifecycle_authority_id: 'M55_PREVIEW_REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_v1',
      remote_connection_authority_id: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v1',
    },
    host_fingerprint_algorithm: 'sha256_canonical_normalized_host',
    host_normalization: {
      trim: true,
      lowercase: true,
      reject_characters: ['@', ':', '/', '?', '#'],
      reject_uri_schemes: true,
    },
    project_ref_host_consistency_rule: 'normalized_host_must_equal_db_dot_project_ref_dot_supabase_dot_co',
    forbidden_hosts: {
      literals: ['localhost', '127.0.0.1', '::1'],
      private_ipv4_prefixes: [
        '10.',
        '192.168.',
        '172.16.',
        '172.17.',
        '172.18.',
        '172.19.',
        '172.20.',
        '172.21.',
        '172.22.',
        '172.23.',
        '172.24.',
        '172.25.',
        '172.26.',
        '172.27.',
        '172.28.',
        '172.29.',
        '172.30.',
        '172.31.',
      ],
    },
    forbidden_production_identity: {
      organization_slug: 'm55-soul',
      project_name: 'm55-soul-core',
    },
    human_supplied_at_execution_authorization: [
      'project_ref',
      'host',
      'host_fingerprint_sha256',
      'execution_authorization_id',
    ],
    all_fields_required_before_credential_acquisition: true,
    no_boolean_only_execute_authorization: true,
    no_wildcard_or_partial_match: true,
    no_environment_fallback: true,
    target_binding_implemented: false,
    execution_authorized: false,
  },
  pre_connect_target_gate: {
    identifier: 'PRE_CONNECT_TARGET_IDENTITY_GATE',
    mandatory_before_any_db_connection: true,
    deterministic_checks: [
      'exact_branch_head_tree',
      'exact_preview_organization_project_source_database_user',
      'exact_selected_step',
      'exact_credential_method',
      'exact_project_ref_host_fingerprint_consistency',
      'execution_authorization_identity',
      'authority_manifest_identities',
      'no_credential_material_in_nonsecret_binding',
    ],
    pass_outcome: 'PASS_TARGET_BINDING',
    network_lookup_forbidden: true,
    implementation_status: 'UNIMPLEMENTED',
    execution_authorized: false,
    target_binding_implemented: false,
  },
  post_connect_guard_binding: POST_CONNECT_GUARD_BINDING,
  evidence_logging: {
    allowed_fields: [...EVIDENCE_ALLOWED_FIELDS],
    forbidden_fields: [...EVIDENCE_FORBIDDEN_FIELDS],
  },
} as const;

function validateBooleanFlagsFalseEverywhere(value: unknown, path: string, mismatches: string[]): void {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (
      key === 'execution_authorized' ||
      key === 'acquisition_implemented' ||
      key === 'target_binding_implemented' ||
      key === 'orchestration_implemented'
    ) {
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

function validateNoSecretValues(value: unknown, path: string, mismatches: string[]): void {
  if (typeof value === 'string') {
    if (/^postgres(ql)?:\/\//i.test(value)) {
      mismatches.push(`${path}:connection_url_forbidden`);
    }
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (EVIDENCE_FORBIDDEN_FIELDS.includes(key as (typeof EVIDENCE_FORBIDDEN_FIELDS)[number])) {
      mismatches.push(`${nextPath}:forbidden_evidence_field_key`);
    }
    validateNoSecretValues(nested, nextPath, mismatches);
  }
}

export function validateRemoteConnectionAuthorityDocument(
  document: RemoteConnectionAuthorityDocument,
): RemoteConnectionAuthorityValidationResult {
  const mismatches: string[] = [];

  if (stable(document) !== stable(EXPECTED_REMOTE_CONNECTION_AUTHORITY)) {
    mismatches.push('document:exact_semantic_mismatch');
    collectSemanticDrift(document, EXPECTED_REMOTE_CONNECTION_AUTHORITY, 'document', mismatches);
  }

  validateBooleanFlagsFalseEverywhere(document, 'document', mismatches);
  validateNoSecretValues(document, 'document', mismatches);

  if (stable(document.approved_credential_methods) !== stable(APPROVED_CREDENTIAL_METHODS)) {
    mismatches.push('approved_credential_methods:order');
  }

  if (document.plan_requires_validated_binding_receipt !== true) {
    mismatches.push('plan_requires_validated_binding_receipt:must_be_true');
  }

  if (document.validated_receipt_is_only_public_binding_identifier_source !== true) {
    mismatches.push('validated_receipt_is_only_public_binding_identifier_source:must_be_true');
  }

  return {
    ok: mismatches.length === 0,
    mismatchCategories: [...new Set(mismatches)],
  };
}
