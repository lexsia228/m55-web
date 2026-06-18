import { createHash } from 'node:crypto';

export const EVIDENCE_CHAIN_SCHEMA_VERSION = 'm55_preview_deletion_evidence_chain_v1' as const;
export const PRECHECK_EVIDENCE_SCHEMA_VERSION = 'm55_preview_deletion_precheck_evidence_v1' as const;
export const EXTERNAL_AUTHORITY_SCHEMA_VERSION = 'm55_preview_deletion_external_authority_v1' as const;
export const SUBJECT_LABEL = 'M55_PREVIEW_DELETE_POST_REMEDIATION_01' as const;
export const MIGRATION_IDENTITY = '20260617000001_m55_clerk_webhook_user_ref_hash_v1' as const;
export const POSTCHECK_SQL_IDENTITY = 'm55_preview_post_remediation_deletion_smoke_postcheck_v2' as const;
export const EXPECTED_BASE_HEAD = 'c5cae11010c29fe9f8207bc5891338a723a51a3b' as const;

export type PostcheckMode =
  | 'PRE_DELETE_DEPLOYMENT_SUBJECT'
  | 'PRE_DELETE_EVENT_LEDGER'
  | 'POST_DELETE_EVENT_LEDGER_RPC'
  | 'POST_DELETE_TARGET_RETAINED'
  | 'POST_DELETE_UNRELATED'
  | 'INTEGRATED_PREVIEW_DELETION_CLOSURE';

export type FailedFulfillmentBundle = {
  sorted_uuid_list: string[];
  count: number;
  digest_sha256: string;
};

export type UnrelatedSurfaceRegistrySegment = {
  segment_id: string;
  schema_name: string;
  relation_name: string;
  relation: string;
  segment_schema_version: string;
  sort_key_columns: readonly string[];
  audited_columns: readonly string[];
  canonical_encoding_version: string;
  pre_delete_exclusion_policy_id: string;
  post_delete_exclusion_policy_id: string;
  authorized_change_policy_id: string;
  empty_set_representation: 'EMPTY_SET';
};

export type UnrelatedSegment = UnrelatedSurfaceRegistrySegment & {
  row_count: number;
  segment_sha256: string;
};

export type UnrelatedSurfaceRegistryBinding = {
  registry_id: string;
  registry_schema_version: string;
  registry_sha256: string;
};

export type PrecheckEvidence = {
  schema_version: typeof PRECHECK_EVIDENCE_SCHEMA_VERSION;
  subject_label: typeof SUBJECT_LABEL;
  final_pushed_head: string;
  deployment_identity: string;
  migration_identity: typeof MIGRATION_IDENTITY;
  migration_sha256: string;
  postapply_catalog_identity: string;
  generated_at: string;
  event_watermark: {
    correlated_user_deleted_count: number;
    max_created_at: string | null;
  };
  target_baseline_counts: Record<string, number>;
  failed_fulfillments: FailedFulfillmentBundle;
  unrelated_surface_registry: UnrelatedSurfaceRegistryBinding;
  unrelated_segments: UnrelatedSegment[];
  unrelated_audited_surface_sha256: string;
};

export type ExternalDeletionAuthority = {
  schema_version: typeof EXTERNAL_AUTHORITY_SCHEMA_VERSION;
  final_pushed_head: string;
  deployment_id: string;
  deployment_commit: string;
  deployment_ready: boolean;
  branch_alias_current: boolean;
  production_binding: false;
  migration_identity: typeof MIGRATION_IDENTITY;
  migration_sha256: string;
  postapply_catalog_identity: string;
  preview_binding_confirmations: Record<string, true>;
  subject_label: typeof SUBJECT_LABEL;
  precreated: true;
  precheck_evidence_sha256: string;
  issued_at: string;
  expires_at: string;
  single_use: true;
  consumed: boolean;
  budgets: {
    subject_create_total: 1;
    additional_subject_create: 0;
    delete_action: 1;
    natural_webhook: 1;
    replay: 0;
  };
};

export type ValidationResult = {
  ready: boolean;
  failed_flags: string[];
  sha256: string | null;
};

const SHA256_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLERK_USER_ID_RE = /^user_[A-Za-z0-9_-]{8,128}$/;


const UNRELATED_SURFACE_REGISTRY_DEFINITION = {
  registry_id: 'M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1',
  registry_schema_version: 'm55_unrelated_surface_registry_v1',
  segments: [
    {
      segment_id: 'stripe_events_all_v1',
      schema_name: 'public',
      relation_name: 'stripe_events',
      relation: 'public.stripe_events',
      segment_schema_version: 'stripe_events_v1',
      sort_key_columns: ['event_id'],
      audited_columns: ['event_id', 'event_type', 'received_at'],
      canonical_encoding_version: 'ordered_jsonb_build_array_v1',
      pre_delete_exclusion_policy_id: 'exclude_none_v1',
      post_delete_exclusion_policy_id: 'exclude_none_v1',
      authorized_change_policy_id: 'none_v1',
      empty_set_representation: 'EMPTY_SET',
    },
    {
      segment_id: 'stripe_processed_events_all_v1',
      schema_name: 'public',
      relation_name: 'stripe_processed_events',
      relation: 'public.stripe_processed_events',
      segment_schema_version: 'stripe_processed_events_v1',
      sort_key_columns: ['stripe_event_id'],
      audited_columns: ['stripe_event_id', 'processed_at'],
      canonical_encoding_version: 'ordered_jsonb_build_array_v1',
      pre_delete_exclusion_policy_id: 'exclude_none_v1',
      post_delete_exclusion_policy_id: 'exclude_none_v1',
      authorized_change_policy_id: 'none_v1',
      empty_set_representation: 'EMPTY_SET',
    },
    {
      segment_id: 'clerk_webhook_events_excluding_subject_v1',
      schema_name: 'public',
      relation_name: 'clerk_webhook_events',
      relation: 'public.clerk_webhook_events',
      segment_schema_version: 'clerk_webhook_events_excluding_subject_v1',
      sort_key_columns: ['created_at', 'event_type'],
      audited_columns: ['event_type', 'status', 'error_code'],
      canonical_encoding_version: 'ordered_jsonb_build_array_v1',
      pre_delete_exclusion_policy_id: 'exclude_subject_user_ref_hash_v1',
      post_delete_exclusion_policy_id: 'exclude_subject_user_ref_hash_v1',
      authorized_change_policy_id: 'expected_subject_event_only_v1',
      empty_set_representation: 'EMPTY_SET',
    },
    {
      segment_id: 'failed_fulfillments_excluding_bound_v1',
      schema_name: 'public',
      relation_name: 'failed_fulfillments',
      relation: 'public.failed_fulfillments',
      segment_schema_version: 'failed_fulfillments_excluding_bound_v1',
      sort_key_columns: ['id'],
      audited_columns: ['id', 'failure_reason', 'created_at'],
      canonical_encoding_version: 'ordered_jsonb_build_array_v1',
      pre_delete_exclusion_policy_id: 'exclude_bound_failed_fulfillment_ids_v1',
      post_delete_exclusion_policy_id: 'exclude_bound_failed_fulfillment_ids_v1',
      authorized_change_policy_id: 'scrub_bound_failed_fulfillments_only_v1',
      empty_set_representation: 'EMPTY_SET',
    },
  ],
} as const;

export const M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1 = {
  ...UNRELATED_SURFACE_REGISTRY_DEFINITION,
  registry_sha256: sha256Hex(canonicalJson(UNRELATED_SURFACE_REGISTRY_DEFINITION)),
} as const;

export const M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING: UnrelatedSurfaceRegistryBinding = {
  registry_id: M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.registry_id,
  registry_schema_version: M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.registry_schema_version,
  registry_sha256: M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.registry_sha256,
};

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function deriveUserRefHash(rawClerkUserId: string): string {
  if (!CLERK_USER_ID_RE.test(rawClerkUserId)) throw new Error('HOLD_RAW_SUBJECT_INVALID');
  return sha256Hex(rawClerkUserId).slice(0, 16);
}

export function assertNoRawIdentityInSerialized(value: unknown): void {
  const json = JSON.stringify(value);
  if (/user_[A-Z0-9][A-Za-z0-9_-]{8,128}/.test(json)) throw new Error('RAW_SUBJECT_FORBIDDEN');
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(json)) throw new Error('EMAIL_FORBIDDEN');
  if (/\b[0-9a-f]{16}\b/.test(json)) throw new Error('HASH_OUTPUT_FORBIDDEN');
  if (new RegExp('wh' + 'sec_|sk_' + 'live_|sk_' + 'test_|Bearer' + '\\s+').test(json)) throw new Error('SECRET_FORBIDDEN');
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) out[key] = normalize(src[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function canonicalSha256(value: unknown): string {
  const json = canonicalJson(value);
  assertNoRawIdentityInSerialized(json);
  return sha256Hex(json);
}

export function buildFailedFulfillmentBundle(uuids: string[]): FailedFulfillmentBundle {
  const sorted = [...uuids].map((v) => v.toLowerCase()).sort();
  if (new Set(sorted).size !== sorted.length) throw new Error('HOLD_DUPLICATE_FAILED_FULFILLMENT_UUID');
  for (const uuid of sorted) if (!UUID_RE.test(uuid)) throw new Error('HOLD_INVALID_FAILED_FULFILLMENT_UUID');
  return {
    sorted_uuid_list: sorted,
    count: sorted.length,
    digest_sha256: sha256Hex(canonicalJson(sorted)),
  };
}

function expectedRegistrySegments(): readonly UnrelatedSurfaceRegistrySegment[] {
  return M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.segments;
}

function compareArray(name: string, actual: readonly string[], expected: readonly string[], failed: string[]): void {
  if (actual.length !== expected.length || actual.some((value, idx) => value !== expected[idx])) {
    failed.push(name);
  }
}

export function validateUnrelatedSegmentsAgainstRegistry(segments: UnrelatedSegment[]): string[] {
  const failed: string[] = [];
  const expected = expectedRegistrySegments();
  if (segments.length !== expected.length) failed.push('HOLD_UNRELATED_SEGMENT_COUNT_MISMATCH');
  const seen = new Set<string>();
  segments.forEach((segment, idx) => {
    const contract = expected[idx];
    if (seen.has(segment.segment_id)) failed.push('HOLD_DUPLICATE_UNRELATED_SEGMENT_ID');
    seen.add(segment.segment_id);
    if (!contract) return;
    if (segment.segment_id !== contract.segment_id) failed.push('HOLD_UNRELATED_SEGMENT_ORDER_OR_ID_MISMATCH');
    if (segment.schema_name !== contract.schema_name) failed.push('HOLD_UNRELATED_SEGMENT_SCHEMA_MISMATCH');
    if (segment.relation_name !== contract.relation_name) failed.push('HOLD_UNRELATED_SEGMENT_RELATION_NAME_MISMATCH');
    if (segment.relation !== contract.relation) failed.push('HOLD_UNRELATED_SEGMENT_RELATION_MISMATCH');
    if (segment.segment_schema_version !== contract.segment_schema_version) failed.push('HOLD_UNRELATED_SEGMENT_SCHEMA_VERSION_MISMATCH');
    compareArray('HOLD_UNRELATED_SORT_KEY_COLUMNS_MISMATCH', segment.sort_key_columns, contract.sort_key_columns, failed);
    compareArray('HOLD_UNRELATED_AUDITED_COLUMNS_MISMATCH', segment.audited_columns, contract.audited_columns, failed);
    if (segment.canonical_encoding_version !== contract.canonical_encoding_version) failed.push('HOLD_UNRELATED_ENCODING_MISMATCH');
    if (segment.pre_delete_exclusion_policy_id !== contract.pre_delete_exclusion_policy_id) failed.push('HOLD_UNRELATED_PRE_EXCLUSION_POLICY_MISMATCH');
    if (segment.post_delete_exclusion_policy_id !== contract.post_delete_exclusion_policy_id) failed.push('HOLD_UNRELATED_POST_EXCLUSION_POLICY_MISMATCH');
    if (segment.authorized_change_policy_id !== contract.authorized_change_policy_id) failed.push('HOLD_UNRELATED_AUTHORIZED_CHANGE_POLICY_MISMATCH');
    if (segment.empty_set_representation !== contract.empty_set_representation) failed.push('HOLD_UNRELATED_EMPTY_SET_MISMATCH');
    if (!SHA256_RE.test(segment.segment_sha256)) failed.push('HOLD_SEGMENT_DIGEST_INVALID');
    if (!Number.isInteger(segment.row_count) || segment.row_count < 0) failed.push('HOLD_SEGMENT_ROW_COUNT_INVALID');
  });
  for (const contract of expected) {
    if (!seen.has(contract.segment_id)) failed.push('HOLD_MISSING_UNRELATED_SEGMENT_ID');
  }
  for (const segment of segments) {
    if (!expected.some((contract) => contract.segment_id === segment.segment_id)) {
      failed.push('HOLD_UNKNOWN_UNRELATED_SEGMENT_ID');
    }
  }
  return [...new Set(failed)];
}

export function buildUnrelatedSurfaceDigest(segments: UnrelatedSegment[]): string {
  const failed = validateUnrelatedSegmentsAgainstRegistry(segments);
  if (failed.length > 0) throw new Error(failed[0]);
  return canonicalSha256(segments);
}

export function validatePrecheckEvidence(value: unknown): ValidationResult {
  const failed: string[] = [];
  const e = value as Partial<PrecheckEvidence> | null;
  if (!e || typeof e !== 'object') return { ready: false, failed_flags: ['HOLD_PRECHECK_EVIDENCE_MISSING'], sha256: null };
  const exactKeys = [
    'deployment_identity', 'event_watermark', 'failed_fulfillments', 'final_pushed_head',
    'generated_at', 'migration_identity', 'migration_sha256', 'postapply_catalog_identity',
    'schema_version', 'subject_label', 'target_baseline_counts', 'unrelated_audited_surface_sha256',
    'unrelated_segments', 'unrelated_surface_registry',
  ];
  const keys = Object.keys(e).sort();
  if (keys.join('|') !== exactKeys.sort().join('|')) failed.push('HOLD_PRECHECK_SCHEMA_KEYS_MISMATCH');
  if (e.schema_version !== PRECHECK_EVIDENCE_SCHEMA_VERSION) failed.push('HOLD_PRECHECK_SCHEMA_VERSION_MISMATCH');
  if (e.subject_label !== SUBJECT_LABEL) failed.push('HOLD_PRECHECK_SUBJECT_LABEL_MISMATCH');
  if (e.migration_identity !== MIGRATION_IDENTITY) failed.push('HOLD_PRECHECK_MIGRATION_IDENTITY_MISMATCH');
  if (e.unrelated_surface_registry?.registry_id !== M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING.registry_id) failed.push('HOLD_UNRELATED_REGISTRY_ID_MISMATCH');
  if (e.unrelated_surface_registry?.registry_schema_version !== M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING.registry_schema_version) failed.push('HOLD_UNRELATED_REGISTRY_SCHEMA_VERSION_MISMATCH');
  if (e.unrelated_surface_registry?.registry_sha256 !== M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING.registry_sha256) failed.push('HOLD_UNRELATED_REGISTRY_SHA_MISMATCH');
  if (!e.migration_sha256 || !SHA256_RE.test(e.migration_sha256)) failed.push('HOLD_PRECHECK_MIGRATION_SHA_INVALID');
  if (!e.final_pushed_head || !/^[0-9a-f]{40}$/.test(e.final_pushed_head)) failed.push('HOLD_PRECHECK_HEAD_INVALID');
  if (!e.deployment_identity || e.deployment_identity.length < 6) failed.push('HOLD_PRECHECK_DEPLOYMENT_INVALID');
  if (!e.postapply_catalog_identity || e.postapply_catalog_identity.length < 6) failed.push('HOLD_PRECHECK_CATALOG_IDENTITY_INVALID');
  if (!e.generated_at || Number.isNaN(Date.parse(e.generated_at))) failed.push('HOLD_PRECHECK_GENERATED_AT_INVALID');
  try {
    const bundle = buildFailedFulfillmentBundle(e.failed_fulfillments?.sorted_uuid_list ?? []);
    if (bundle.count !== e.failed_fulfillments?.count) failed.push('HOLD_FAILED_FULFILLMENT_COUNT_MISMATCH');
    if (bundle.digest_sha256 !== e.failed_fulfillments?.digest_sha256) failed.push('HOLD_FAILED_FULFILLMENT_DIGEST_MISMATCH');
  } catch (err) {
    failed.push(err instanceof Error ? err.message : 'HOLD_FAILED_FULFILLMENT_BUNDLE_INVALID');
  }
  try {
    const digest = buildUnrelatedSurfaceDigest(e.unrelated_segments ?? []);
    if (digest !== e.unrelated_audited_surface_sha256) failed.push('HOLD_UNRELATED_SURFACE_DIGEST_MISMATCH');
  } catch (err) {
    failed.push(err instanceof Error ? err.message : 'HOLD_UNRELATED_SURFACE_INVALID');
  }
  try { assertNoRawIdentityInSerialized(e); } catch (err) { failed.push(err instanceof Error ? err.message : 'HOLD_RAW_IDENTITY_IN_EVIDENCE'); }
  return { ready: failed.length === 0, failed_flags: failed, sha256: failed.length === 0 ? canonicalSha256(e) : null };
}

export function validateExternalAuthority(
  authority: unknown,
  ctx: { now: Date; precheckEvidenceSha256: string; observedFinalHead: string; observedDeploymentId: string; observedDeploymentCommit: string; migrationSha256: string; postapplyCatalogIdentity: string },
): ValidationResult {
  const failed: string[] = [];
  const a = authority as Partial<ExternalDeletionAuthority> | null;
  if (!a || typeof a !== 'object') return { ready: false, failed_flags: ['HOLD_EXTERNAL_AUTHORITY_MISSING'], sha256: null };
  if (a.schema_version !== EXTERNAL_AUTHORITY_SCHEMA_VERSION) failed.push('HOLD_EXTERNAL_AUTHORITY_SCHEMA_MISMATCH');
  if (a.final_pushed_head !== ctx.observedFinalHead) failed.push('HOLD_FINAL_HEAD_MISMATCH');
  if (a.deployment_id !== ctx.observedDeploymentId) failed.push('HOLD_DEPLOYMENT_ID_MISMATCH');
  if (a.deployment_commit !== ctx.observedDeploymentCommit || a.deployment_commit !== a.final_pushed_head) failed.push('HOLD_DEPLOYMENT_COMMIT_MISMATCH');
  if (!a.deployment_ready) failed.push('HOLD_DEPLOYMENT_NOT_READY');
  if (!a.branch_alias_current) failed.push('HOLD_BRANCH_ALIAS_STALE');
  if (a.production_binding !== false) failed.push('HOLD_PRODUCTION_BINDING');
  if (a.migration_identity !== MIGRATION_IDENTITY) failed.push('HOLD_MIGRATION_IDENTITY_MISMATCH');
  if (a.migration_sha256 !== ctx.migrationSha256) failed.push('HOLD_MIGRATION_SHA_MISMATCH');
  if (a.postapply_catalog_identity !== ctx.postapplyCatalogIdentity) failed.push('HOLD_POSTAPPLY_CATALOG_MISMATCH');
  if (a.precheck_evidence_sha256 !== ctx.precheckEvidenceSha256 || !SHA256_RE.test(ctx.precheckEvidenceSha256)) failed.push('HOLD_PRECHECK_EVIDENCE_SHA_MISMATCH');
  if (a.subject_label !== SUBJECT_LABEL || a.precreated !== true) failed.push('HOLD_SUBJECT_STATE_MISMATCH');
  if (a.single_use !== true || a.consumed !== false) failed.push('HOLD_SINGLE_USE_STATE_MISMATCH');
  const expires = Date.parse(String(a.expires_at ?? ''));
  const issued = Date.parse(String(a.issued_at ?? ''));
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || ctx.now.getTime() > expires || issued >= expires) failed.push('HOLD_AUTHORITY_EXPIRY_INVALID');
  if (a.budgets?.subject_create_total !== 1 || a.budgets?.additional_subject_create !== 0 || a.budgets?.delete_action !== 1 || a.budgets?.natural_webhook !== 1 || a.budgets?.replay !== 0) failed.push('HOLD_AUTHORITY_BUDGET_MISMATCH');
  try { assertNoRawIdentityInSerialized(a); } catch (err) { failed.push(err instanceof Error ? err.message : 'HOLD_RAW_IDENTITY_IN_AUTHORITY'); }
  return { ready: failed.length === 0, failed_flags: failed, sha256: failed.length === 0 ? canonicalSha256(a) : null };
}

function sqlLiteral(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

export function generatePreviewSqlPackage(args: {
  mode: PostcheckMode;
  rawClerkUserId: string;
  finalPushedHead: string;
  deploymentIdentity: string;
  migrationIdentity: string;
  migrationSha256: string;
  postapplyCatalogIdentity: string;
  precheckEvidence?: PrecheckEvidence;
  sqlTemplate?: string;
}): string {
  const userRefHash = deriveUserRefHash(args.rawClerkUserId);
  if (args.precheckEvidence) {
    const validation = validatePrecheckEvidence(args.precheckEvidence);
    if (!validation.ready) throw new Error(validation.failed_flags[0] ?? 'HOLD_PRECHECK_EVIDENCE_INVALID');
  }
  const ffIds = args.precheckEvidence?.failed_fulfillments.sorted_uuid_list ?? [];
  const unrelated = args.precheckEvidence?.unrelated_audited_surface_sha256 ?? '';
  const sqlTemplate = args.sqlTemplate ??
    "SELECT jsonb_build_object('schema_version','m55_preview_deletion_ephemeral_package_v1','scenario_mode',current_setting('m55.preview_deletion_smoke.scenario_mode', true)) AS result;";
  return [
    'BEGIN;',
    `SET LOCAL m55.preview_deletion_smoke.scenario_mode = ${sqlLiteral(args.mode)};`,
    `SET LOCAL m55.preview_deletion_smoke.raw_subject_token = ${sqlLiteral(args.rawClerkUserId)};`,
    `SET LOCAL m55.preview_deletion_smoke.user_ref_hash = ${sqlLiteral(userRefHash)};`,
    `SET LOCAL m55.preview_deletion_smoke.final_pushed_head = ${sqlLiteral(args.finalPushedHead)};`,
    `SET LOCAL m55.preview_deletion_smoke.deployment_identity = ${sqlLiteral(args.deploymentIdentity)};`,
    `SET LOCAL m55.preview_deletion_smoke.migration_identity = ${sqlLiteral(args.migrationIdentity)};`,
    `SET LOCAL m55.preview_deletion_smoke.migration_sha256 = ${sqlLiteral(args.migrationSha256)};`,
    `SET LOCAL m55.preview_deletion_smoke.postapply_catalog_identity = ${sqlLiteral(args.postapplyCatalogIdentity)};`,
    `SET LOCAL m55.preview_deletion_smoke.precheck_failed_fulfillment_ids_json = ${sqlLiteral(JSON.stringify(ffIds))};`,
    `SET LOCAL m55.preview_deletion_smoke.precheck_unrelated_surface_sha256 = ${sqlLiteral(unrelated)};`,
    sqlTemplate.trim().replace(/;\s*$/, '') + ';',
    'ROLLBACK;',
  ].join('\n');
}
