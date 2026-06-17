import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPROVED_CORRELATION_MIGRATION_IDENTITY,
  APPROVED_FEATURE_HEAD,
  APPROVED_POSTCHECK_IDENTITY,
  EXPECTED_BASE_FEATURE_HEAD,
  EXTERNAL_AUTHORITY_REQUIRED,
  parseSqlMutationKeywords,
  sqlHasSingleTopLevelSelect,
  sqlModeCount,
  validatePreviewDeletionExternalAuthority,
} from './m55_preview_post_remediation_deletion_authority.ts';
import {
  PreviewPostRemediationDeletionSmokeHarness,
  SUBJECT_LABEL,
  sqlPostcheckModeCount,
} from './m55_preview_post_remediation_deletion_smoke.ts';
import {
  EXTERNAL_AUTHORITY_SCHEMA_VERSION,
  EXPECTED_BASE_HEAD,
  MIGRATION_IDENTITY,
  M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING,
  M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1,
  POSTCHECK_SQL_IDENTITY,
  PRECHECK_EVIDENCE_SCHEMA_VERSION,
  buildFailedFulfillmentBundle,
  buildUnrelatedSurfaceDigest,
  canonicalSha256,
  deriveUserRefHash,
  generatePreviewSqlPackage,
  validateExternalAuthority,
  validatePrecheckEvidence,
  type ExternalDeletionAuthority,
  type PrecheckEvidence,
  type UnrelatedSegment,
} from './m55_preview_deletion_evidence_chain.ts';

const ROOT = process.cwd();
const SQL_PATH = join(ROOT, 'scripts/sql/preview/m55_preview_post_remediation_deletion_smoke_postcheck.sql');
const MIGRATION_PATH = join(ROOT, 'supabase/migrations/20260617000001_m55_clerk_webhook_user_ref_hash_v1.sql');
const RUNBOOK_PATH = join(ROOT, 'docs/planning/m55_preview_post_remediation_deletion_smoke_human_runbook.md');
const AUTHORITY_PATH = join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_authority.ts');
const ORCHESTRATOR_PATH = join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_smoke.ts');
const HELPER_PATH = join(ROOT, 'scripts/preview/m55_preview_deletion_evidence_chain.ts');

const DEPLOYMENT_ID = 'dpl_POST_PUSH_READY_123456789';
const FINAL_HEAD = 'f'.repeat(40);
const MIGRATION_SHA = 'a'.repeat(64);
const CATALOG_IDENTITY = 'postapply-catalog-identity-94c4fe9a';

function segments(): UnrelatedSegment[] {
  return M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.segments.map((segment, idx) => ({
    ...segment,
    row_count: idx,
    segment_sha256: String(idx + 1).repeat(64),
  }));
}

function evidence(overrides: Partial<PrecheckEvidence> = {}): PrecheckEvidence {
  const ff = buildFailedFulfillmentBundle(['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001']);
  const unrelated_segments = segments();
  return {
    schema_version: PRECHECK_EVIDENCE_SCHEMA_VERSION,
    subject_label: SUBJECT_LABEL,
    final_pushed_head: FINAL_HEAD,
    deployment_identity: DEPLOYMENT_ID,
    migration_identity: MIGRATION_IDENTITY,
    migration_sha256: MIGRATION_SHA,
    postapply_catalog_identity: CATALOG_IDENTITY,
    generated_at: '2026-06-17T00:00:00.000Z',
    event_watermark: { correlated_user_deleted_count: 0, max_created_at: null },
    target_baseline_counts: { entitlements: 0, one_time_fulfillments: 0 },
    failed_fulfillments: ff,
    unrelated_surface_registry: M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING,
    unrelated_segments,
    unrelated_audited_surface_sha256: buildUnrelatedSurfaceDigest(unrelated_segments),
    ...overrides,
  };
}

function authority(precheckSha: string, overrides: Partial<ExternalDeletionAuthority> = {}): ExternalDeletionAuthority {
  return {
    schema_version: EXTERNAL_AUTHORITY_SCHEMA_VERSION,
    final_pushed_head: FINAL_HEAD,
    deployment_id: DEPLOYMENT_ID,
    deployment_commit: FINAL_HEAD,
    deployment_ready: true,
    branch_alias_current: true,
    production_binding: false,
    migration_identity: MIGRATION_IDENTITY,
    migration_sha256: MIGRATION_SHA,
    postapply_catalog_identity: CATALOG_IDENTITY,
    preview_binding_confirmations: {
      vercel_preview_deployment_exact: true,
      supabase_preview_binding_exact: true,
      clerk_development_instance_exact: true,
      clerk_development_endpoint_exact: true,
      signing_secret_preview_scope_exact: true,
      webhook_url_exact: true,
      webhook_route_exact: true,
    },
    subject_label: SUBJECT_LABEL,
    precreated: true,
    precheck_evidence_sha256: precheckSha,
    issued_at: '2026-06-17T00:00:00.000Z',
    expires_at: '2026-06-18T00:00:00.000Z',
    single_use: true,
    consumed: false,
    budgets: { subject_create_total: 1, additional_subject_create: 0, delete_action: 1, natural_webhook: 1, replay: 0 },
    ...overrides,
  };
}

describe('hash and evidence chain helper', () => {
  it('derives exact route-compatible hash for UTF-8 input', () => {
    assert.equal(deriveUserRefHash('user_TEST_12345678'), '34df2ff14686520c');
  });

  it('rejects independent invalid raw subject input', () => {
    assert.throws(() => deriveUserRefHash('not-a-clerk-id'), /HOLD_RAW_SUBJECT_INVALID/);
  });

  it('canonical JSON is deterministic regardless of key order', () => {
    assert.equal(canonicalSha256({ b: 1, a: [2, null] }), canonicalSha256({ a: [2, null], b: 1 }));
  });

  it('failed_fulfillments UUID bundle sorts and binds count plus digest', () => {
    const b = buildFailedFulfillmentBundle(['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001']);
    assert.deepEqual(b.sorted_uuid_list, ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']);
    assert.equal(b.count, 2);
    assert.match(b.digest_sha256, /^[0-9a-f]{64}$/);
  });

  it('zero UUID state is explicit and valid', () => {
    const b = buildFailedFulfillmentBundle([]);
    assert.equal(b.count, 0);
    assert.deepEqual(b.sorted_uuid_list, []);
  });

  it('duplicate UUIDs reject', () => {
    assert.throws(() => buildFailedFulfillmentBundle(['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001']), /DUPLICATE/);
  });

  it('unrelated segment digest binds relation names and counts', () => {
    assert.match(buildUnrelatedSurfaceDigest(segments()), /^[0-9a-f]{64}$/);
  });

  it('precheck evidence schema validates and produces SHA', () => {
    const result = validatePrecheckEvidence(evidence());
    assert.equal(result.ready, true);
    assert.match(result.sha256 ?? '', /^[0-9a-f]{64}$/);
  });

  it('missing or extra evidence fields reject', () => {
    const e = evidence() as unknown as Record<string, unknown>;
    delete e.generated_at;
    assert.equal(validatePrecheckEvidence(e).ready, false);
    assert.equal(validatePrecheckEvidence({ ...evidence(), extra: true }).ready, false);
  });

  it('tampered UUID count or digest rejects', () => {
    assert.equal(validatePrecheckEvidence(evidence({ failed_fulfillments: { ...evidence().failed_fulfillments, count: 99 } })).ready, false);
    assert.equal(validatePrecheckEvidence(evidence({ failed_fulfillments: { ...evidence().failed_fulfillments, digest_sha256: 'b'.repeat(64) } })).ready, false);
  });

  it('precheck SHA changes on material field changes', () => {
    const a = validatePrecheckEvidence(evidence()).sha256;
    const b = validatePrecheckEvidence(evidence({ deployment_identity: 'dpl_OTHER_READY_123456789' })).sha256;
    assert.notEqual(a, b);
  });

  it('raw subject and hash never serialize into evidence artifacts', () => {
    assert.equal(JSON.stringify(evidence()).includes('user_TEST_12345678'), false);
    assert.equal(JSON.stringify(evidence()).includes(deriveUserRefHash('user_TEST_12345678')), false);
  });

  it('arbitrary relation and columns with recomputed digests reject', () => {
    const arbitrary = [{
      ...segments()[0],
      segment_id: 'made_up_segment',
      relation: 'public.not_approved',
      relation_name: 'not_approved',
      audited_columns: ['made_up'],
      segment_sha256: '9'.repeat(64),
    }];
    const bad = evidence({ unrelated_segments: arbitrary, unrelated_audited_surface_sha256: canonicalSha256(arbitrary) });
    assert.equal(validatePrecheckEvidence(bad).ready, false);
  });

  it('changed relation with recomputed digests rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], relation: 'public.other_table', relation_name: 'other_table' };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('changed audited column with recomputed digests rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], audited_columns: ['event_id', 'event_type', 'wrong_column'] };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('reordered audited columns with recomputed digests rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], audited_columns: [...changed[0].audited_columns].reverse() };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('changed pre-delete exclusion policy rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], pre_delete_exclusion_policy_id: 'changed_policy' };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('changed post-delete exclusion policy rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], post_delete_exclusion_policy_id: 'changed_policy' };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('changed encoding version rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], canonical_encoding_version: 'ambiguous_concat_v0' };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('missing segment rejects', () => {
    const changed = segments().slice(0, -1);
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('extra segment rejects', () => {
    const changed = [...segments(), { ...segments()[0], segment_id: 'extra_segment_v1' }];
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('duplicate segment ID rejects', () => {
    const changed = segments();
    changed[1] = { ...changed[1], segment_id: changed[0].segment_id };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('unknown segment ID rejects', () => {
    const changed = segments();
    changed[0] = { ...changed[0], segment_id: 'unknown_segment_v1' };
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('non-canonical segment order rejects', () => {
    const changed = [...segments()].reverse();
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_segments: changed, unrelated_audited_surface_sha256: canonicalSha256(changed) })).ready, false);
  });

  it('wrong registry_id rejects', () => {
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_surface_registry: { ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING, registry_id: 'WRONG_REGISTRY' } })).ready, false);
  });

  it('wrong registry_schema_version rejects', () => {
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_surface_registry: { ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING, registry_schema_version: 'wrong_schema' } })).ready, false);
  });

  it('wrong registry_sha256 rejects', () => {
    assert.equal(validatePrecheckEvidence(evidence({ unrelated_surface_registry: { ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING, registry_sha256: '3'.repeat(64) } })).ready, false);
  });

  it('exact immutable registry with valid DB-derived segment results passes', () => {
    assert.equal(validatePrecheckEvidence(evidence()).ready, true);
  });

  it('exact registry canonicalization is deterministic', () => {
    assert.equal(canonicalSha256(M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1), canonicalSha256(M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1));
  });

  it('any immutable registry change changes registry_sha256', () => {
    const changed = { ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1, segments: [{ ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.segments[0], audited_columns: ['changed'] }] };
    assert.notEqual(canonicalSha256(changed), M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1.registry_sha256);
  });

  it('postcheck generation refuses wrong-registry evidence', () => {
    const bad = evidence({ unrelated_surface_registry: { ...M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_BINDING, registry_id: 'WRONG_REGISTRY' } });
    assert.throws(() => generatePreviewSqlPackage({ mode: 'POST_DELETE_UNRELATED', rawClerkUserId: 'user_TEST_12345678', finalPushedHead: FINAL_HEAD, deploymentIdentity: DEPLOYMENT_ID, migrationIdentity: MIGRATION_IDENTITY, migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY, precheckEvidence: bad }), /HOLD_UNRELATED_REGISTRY_ID_MISMATCH/);
  });

  it('raw identity and hash serialization remains absent with registry evidence', () => {
    const serialized = JSON.stringify(evidence());
    assert.equal(serialized.includes('user_TEST_12345678'), false);
    assert.equal(serialized.includes(deriveUserRefHash('user_TEST_12345678')), false);
  });

  it('SQL package generation uses one raw input and does not use psql placeholders', () => {
    const pkg = generatePreviewSqlPackage({ mode: 'PRE_DELETE_DEPLOYMENT_SUBJECT', rawClerkUserId: 'user_TEST_12345678', finalPushedHead: FINAL_HEAD, deploymentIdentity: DEPLOYMENT_ID, migrationIdentity: MIGRATION_IDENTITY, migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY });
    assert.match(pkg, /SET LOCAL/);
    assert.doesNotMatch(pkg, /:'[A-Za-z0-9_]+/);
  });
});

describe('external authority', () => {
  it('source head is base only, not final self-reference', () => {
    assert.equal(EXPECTED_BASE_HEAD, 'c5cae11010c29fe9f8207bc5891338a723a51a3b');
    assert.equal(APPROVED_FEATURE_HEAD, EXPECTED_BASE_FEATURE_HEAD);
  });

  it('external authority validates when bound to precheck SHA', () => {
    const sha = validatePrecheckEvidence(evidence()).sha256!;
    const result = validateExternalAuthority(authority(sha), { now: new Date('2026-06-17T01:00:00.000Z'), precheckEvidenceSha256: sha, observedFinalHead: FINAL_HEAD, observedDeploymentId: DEPLOYMENT_ID, observedDeploymentCommit: FINAL_HEAD, migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY });
    assert.equal(result.ready, true);
  });

  it('authority is not ready before matching precheck evidence SHA', () => {
    const sha = validatePrecheckEvidence(evidence()).sha256!;
    const result = validateExternalAuthority(authority('b'.repeat(64)), { now: new Date('2026-06-17T01:00:00.000Z'), precheckEvidenceSha256: sha, observedFinalHead: FINAL_HEAD, observedDeploymentId: DEPLOYMENT_ID, observedDeploymentCommit: FINAL_HEAD, migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY });
    assert.equal(result.ready, false);
  });

  it('single-use expiry and consumed state fail closed', () => {
    const sha = validatePrecheckEvidence(evidence()).sha256!;
    const result = validatePreviewDeletionExternalAuthority(authority(sha, { consumed: true }), { now: new Date('2026-06-17T01:00:00.000Z'), precheckEvidenceSha256: sha, observedFinalHead: FINAL_HEAD, observedDeploymentId: DEPLOYMENT_ID, observedDeploymentCommit: FINAL_HEAD, migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY });
    assert.equal(result.ready, false);
  });

  it('deployment commit must match final runtime head', () => {
    const sha = validatePrecheckEvidence(evidence()).sha256!;
    const result = validateExternalAuthority(authority(sha, { deployment_commit: 'e'.repeat(40) }), { now: new Date('2026-06-17T01:00:00.000Z'), precheckEvidenceSha256: sha, observedFinalHead: FINAL_HEAD, observedDeploymentId: DEPLOYMENT_ID, observedDeploymentCommit: 'e'.repeat(40), migrationSha256: MIGRATION_SHA, postapplyCatalogIdentity: CATALOG_IDENTITY });
    assert.equal(result.ready, false);
  });

  it('historical source authority is superseded by external authority requirement', () => {
    assert.equal(EXTERNAL_AUTHORITY_REQUIRED, true);
    assert.equal(APPROVED_CORRELATION_MIGRATION_IDENTITY, MIGRATION_IDENTITY);
    assert.equal(APPROVED_POSTCHECK_IDENTITY, POSTCHECK_SQL_IDENTITY);
  });
});

describe('orchestrator precreated subject and evidence flow', () => {
  it('records safe-label-only precreated subject evidence', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectPrecreated();
    const s2 = h.evidenceRecord.steps_completed[2] as Record<string, unknown>;
    assert.equal(s2.subject_label, SUBJECT_LABEL);
    assert.equal(s2.precreated, true);
    assert.equal('human_ref' in s2, false);
  });

  it('second creation is structurally blocked after precreated path', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectPrecreated();
    h.recordHumanSubjectCreation({ label: 'unsafe-second-create', recorded_at: new Date().toISOString() });
    assert.equal(h.irreversibleBudget.subject_create, 1);
    assert.equal(h.evidenceRecord.steps_completed.length, 3);
  });

  it('precheck may proceed after precreated subject', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    h.runS0AuthorityValidation();
    h.runS1PreviewBindingReverify();
    h.recordHumanSubjectPrecreated();
    h.runS3SafeLabelMapping();
    h.runS4PredeleteReadonlyPrecheck({ deployment_identity_exact: true, subject_exists: true, subject_newly_created: true, historical_reuse_detected: false, real_user_risk: false, target_baseline_captured: true, retained_baseline_captured: true, unrelated_baseline_captured: true, prior_event_absent: true, prior_deletion_ledger_absent: true });
    assert.equal(h.evidenceRecord.verdict, 'GREEN');
  });

  it('deletion authority cannot issue before evidence SHA', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    assert.equal(h.canIssueDeletionAuthority(), false);
  });

  it('postcheck generation is bound to matching evidence SHA only', () => {
    const h = new PreviewPostRemediationDeletionSmokeHarness();
    const sha = h.recordValidatedPrecheckEvidence(evidence());
    assert.equal(h.canGeneratePostcheckFromBoundEvidence(sha!), true);
    assert.equal(h.canGeneratePostcheckFromBoundEvidence('c'.repeat(64)), false);
  });
});

describe('migration contract', () => {
  const migration = readFileSync(MIGRATION_PATH, 'utf8');

  it('adds nullable user_ref_hash column', () => {
    assert.match(migration, /ADD COLUMN IF NOT EXISTS user_ref_hash text NULL/);
    assert.doesNotMatch(migration, /user_ref_hash text NOT NULL/);
  });

  it('format check is exact 16 lowercase hex or NULL', () => {
    assert.match(migration, /clerk_webhook_events_user_ref_hash_check/);
    assert.match(migration, /user_ref_hash ~ '\^\[0-9a-f\]\{16\}\$'/);
  });

  it('partial non-unique index is exact', () => {
    assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_user_ref_hash/);
    assert.match(migration, /ON public\.clerk_webhook_events \(user_ref_hash\)/);
    assert.match(migration, /WHERE user_ref_hash IS NOT NULL/);
    assert.doesNotMatch(migration, /CREATE UNIQUE INDEX/);
  });

  it('error code contract preserves values and adds CORRELATION_MISMATCH only', () => {
    for (const code of ['INVALID_PROCESSING_STATE', 'CLEANUP_FAILED', 'VERIFICATION_FAILED', 'CORRELATION_MISMATCH']) assert.match(migration, new RegExp(code));
    assert.match(migration, /error_code IN \(/);
  });

  it('same signature security definer and search path preserved', () => {
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.m55_account_deletion_process_v1\(\s*p_svix_id text,\s*p_event_type text,\s*p_clerk_user_id text,\s*p_user_ref_hash text\s*\)/s);
    assert.match(migration, /RETURNS jsonb/);
    assert.match(migration, /SECURITY DEFINER/);
    assert.match(migration, /SET search_path = public, pg_temp/);
  });

  it('new rows persist hash', () => {
    assert.match(migration, /user_ref_hash\s*\)\s*VALUES[\s\S]*p_user_ref_hash/);
  });

  it('nonnull mismatch fails before status shortcut', () => {
    const mismatch = migration.indexOf('v_existing_user_ref_hash IS NOT NULL');
    const succeeded = migration.indexOf("IF v_ledger_status = 'succeeded' THEN", mismatch);
    assert.ok(mismatch > 0 && succeeded > mismatch);
    assert.match(migration, /CORRELATION_MISMATCH/);
  });

  it('succeeded mismatch does not overwrite succeeded evidence', () => {
    assert.match(migration, /IF v_ledger_status IS DISTINCT FROM 'succeeded' THEN[\s\S]*status = 'failed'/);
  });

  it('NULL succeeded is legacy transport-only success', () => {
    assert.match(migration, /v_existing_user_ref_hash IS NULL[\s\S]*LEGACY_SUCCEEDED_UNCORRELATED/);
  });

  it('NULL non-succeeded fails closed before retry processing', () => {
    const nullBlock = migration.indexOf('IF v_existing_user_ref_hash IS NULL THEN');
    const failedRetry = migration.indexOf("ELSIF v_ledger_status = 'failed' THEN", nullBlock);
    assert.ok(nullBlock > 0 && failedRetry > nullBlock);
    assert.match(migration.slice(nullBlock, failedRetry), /CORRELATION_MISMATCH/);
  });

  it('route change is not required by migration', () => {
    assert.doesNotMatch(migration, /app\/api\/clerk\/webhook/);
  });
});

describe('SQL static contract', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  it('is one top-level SelectStmt-shaped WITH query', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
    assert.equal((sql.match(/^SELECT\b/gm) ?? []).length, 1);
  });

  it('has all six modes exactly', () => {
    assert.equal(sqlPostcheckModeCount(sql), 6);
    assert.equal(sqlModeCount(sql), 6);
  });

  it('has no mutation keywords or psql placeholders', () => {
    assert.deepEqual(parseSqlMutationKeywords(sql), []);
    assert.doesNotMatch(sql, /:'[A-Za-z0-9_]+/);
  });

  it('uses correlated event filter, not global total equals one', () => {
    assert.match(sql, /c\.user_ref_hash = fb\.user_ref_hash|c\.user_ref_hash = g\.user_ref_hash|c\.user_ref_hash = fp\.user_ref_hash/);
    assert.doesNotMatch(sql, /global_succeeded_event_count/);
  });

  it('legacy NULL rows never qualify for subject proof', () => {
    assert.match(sql, /user_ref_hash IS NULL/);
    assert.match(sql, /legacy_uncorrelated_succeeded_count/);
    assert.match(sql, /c\.user_ref_hash = fb\.user_ref_hash/);
  });

  it('failed_fulfillments exact UUID proof is present', () => {
    assert.match(sql, /failed_fulfillment_uuid_list/);
    assert.match(sql, /bound_failed_fulfillment_ids/);
    assert.match(sql, /bound_ff_scrubbed_count/);
    assert.doesNotMatch(sql, /global_null/);
  });

  it('unrelated audited surface uses typed json arrays and deterministic order', () => {
    assert.match(sql, /jsonb_build_array/);
    assert.match(sql, /ORDER BY/);
    assert.match(sql, /EMPTY_SET/);
  });

  it('does not output raw or hash as selected fields', () => {
    assert.doesNotMatch(sql, /'raw_subject_token'/);
    assert.doesNotMatch(sql, /'user_ref_hash'/);
    assert.doesNotMatch(sql, /email/);
  });
});

describe('runbook and scope', () => {
  it('single runbook has 18-step sequence and no parallel SSOT', () => {
    const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
    for (let i = 1; i <= 18; i++) assert.match(runbook, new RegExp(`^${i}\\.`, 'm'));
    assert.match(runbook, /only live runbook/);
  });

  it('route and P1-P7 are not changed by this suite', () => {
    const helper = readFileSync(HELPER_PATH, 'utf8');
    assert.match(helper, /deriveUserRefHash/);
    assert.doesNotMatch(readFileSync(AUTHORITY_PATH, 'utf8'), /applyPatchToRoute|modifyWebhookRoute/);
    assert.doesNotMatch(readFileSync(ORCHESTRATOR_PATH, 'utf8'), /\.rpc\s*\(/);
  });

  it('no skip only or todo markers in test source', () => {
    const self = readFileSync(join(ROOT, 'scripts/preview/m55_preview_post_remediation_deletion_smoke.local.test.ts'), 'utf8');
    assert.doesNotMatch(self, /\.only\(/);
    assert.doesNotMatch(self, /\.skip\(/);
    assert.doesNotMatch(self, /\.todo\(/);
  });
});
