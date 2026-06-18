import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { EXPECTED_REPO_ROOT } from './transactionNormalized/transactionNormalizedCore.ts';
import {
  canonicalSerializeForTests,
  computeAttestationCanonicalPayloadSha256,
  evaluateVerifiedDocumentsForTests,
  normalizeToControlledHoldReasonCode,
  parseJsonRejectingDuplicateKeysForTests,
  parseVerifierCliArgs,
  validateLocalPathCandidate,
  validateSha256Hex,
  validateAttestationDocumentForTests,
  validateReviewRecordDocumentForTests,
  VERIFIER_HOLD_REASON_CODES,
  verifyPlanAttestationContentForTests,
} from './transactionNormalized/planAttestationVerification.ts';

const MANIFEST_SHA256 = '1b2c954bc0c093404c38d01f48c0f5d7d6b52ac3e3f349a8694def7c44fa2744';
const FROZEN_ATTESTATION_CANONICAL =
  '9fdc9ecda6f7257a6651027d4d44f7a5f19533f900729069823b35cb7c55e94d';

function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildSyntheticAttestation(): Record<string, unknown> {
  const attestation: Record<string, unknown> = {
    schema: 'm55.preview.transaction_normalized.stage_a_plan_attestation.v1',
    schema_version: 'm55.preview.transaction_normalized.stage_a_plan_attestation.v1.draft',
    revision: 'STAGE-A-PLAN-ATTESTATION-v1',
    status: 'DRAFT',
    authority_role: 'STAGE_A_PLAN_ONLY_REVIEW_ATTESTATION',
    execution_status: 'NOT EXECUTED',
    generated_at_utc: '2026-06-13T15:54:13Z',
    attestation_scope: 'PLAN_ONLY_SOURCE_VALIDATION',
    repository_binding: {
      expected_repo_root: EXPECTED_REPO_ROOT,
      expected_branch: 'feat/m55-paid-lp-canonical-wave1',
      rebind_commit_sha: 'a8ad7d7f29ba8065fb206bf5d5b6ec98bb199866',
      parent_baseline_commit_sha: '66b6bf2431b979b777d63f7d4b2b5c5c2a4a3bdc',
      source_authority_base_commit_sha: 'ceee04aab0a94376a55a576900cb2f8d597c19f4',
      rebind_commit_tree_sha: '839c29954854c20b7bab926cd1a6cef3cb6c0ef6',
    },
    binding_addendum: {
      path: 'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZED_STAGE_A_BINDING_v1.json',
      bytes: 7692,
      full_file_sha256: '812933a338050aded58f2185a66af4a2a8e00c1f46445fbc8ce0f7e9fe2c77df',
      canonical_payload_sha256: '71215fdf5cd34c1025c69b498b8e8bbf9806af7a10f4deab1c616ad90335e52e',
    },
    protected_runtime_manifest: {
      projection_identifier: 'm55.protected_runtime_manifest.v1',
      canonical_serialization: 'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1',
      entry_count: 7,
      sha256: MANIFEST_SHA256,
    },
    parent_authority: {
      contract: {
        path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json',
        bytes: 309607,
        sha256: 'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c',
      },
      matrix: {
        path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json',
        bytes: 110904,
        sha256: '6d677b02ff9c73591cbea151444d5dc61ea766bda7ed6cd0598e63ad16ca9f93',
      },
      parser_evidence: {
        path: 'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZATION_EXACT_PARSER_EVIDENCE.json',
        bytes: 208050,
        sha256: 'bd05c68a337abbe5a29dff04d8d1e46ca3509f664e9b2d0d89959c387d822442',
      },
    },
    review_contract: {
      review_gate_id: 'CATEGORY-1-M55-STAGE-A-PLAN-ATTESTATION-REVIEW',
      external_review_record_required: true,
      review_record_embedded: false,
      full_file_sha_frozen_externally: true,
      review_timestamp_embedded: false,
      reviewer_identity_embedded: false,
    },
    authorization: {
      plan_only_source_validation_authority: true,
      plan_only_pass_is_not_execution_authorization: true,
      execution_authorization: false,
      remote_apply_authorization: false,
      local_db_authorization: false,
      automatic_next_gate_authorization: false,
    },
    integrity: {
      self_full_file_sha_forbidden: true,
      self_git_blob_id_forbidden: true,
      self_git_commit_sha_forbidden: true,
      canonical_serialization: 'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1',
      canonical_payload_exclusions: ['/integrity/canonical_payload_sha256'],
      canonical_payload_sha256: '',
      canonical_payload_sha256_role: 'ACCIDENTAL_INTERNAL_CORRUPTION_DETECTION_ONLY',
      external_full_file_sha_review_required: true,
    },
  };
  const canonical = computeAttestationCanonicalPayloadSha256(attestation);
  (attestation.integrity as Record<string, unknown>).canonical_payload_sha256 = canonical;
  return attestation;
}

function buildSyntheticReviewRecord(
  attestationSha = '9b919d3a4aa1c701c49bf597e26d7d69db9977399287ad55960f4a06a75e5751',
  attestationCanonical?: string,
): Record<string, unknown> {
  const canonical = attestationCanonical ?? FROZEN_ATTESTATION_CANONICAL;
  return {
    schema: 'm55.preview.transaction_normalized.stage_a_plan_attestation_review_record.v1',
    schema_version: 'm55.preview.transaction_normalized.stage_a_plan_attestation_review_record.v1',
    revision: 'STAGE-A-PLAN-ATTESTATION-REVIEW-RECORD-v1',
    status: 'CLOSED_GREEN',
    authority_role: 'STAGE_A_PLAN_ONLY_ATTESTATION_EXTERNAL_REVIEW_RECORD',
    review_gate_id: 'CATEGORY-1-M55-STAGE-A-PLAN-ATTESTATION-REVIEW',
    reviewed_at_utc: '2026-06-13T15:59:10Z',
    review_scope: 'PLAN_ONLY_ATTESTATION_ARTIFACT_REVIEW',
    reviewed_attestation: {
      filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_v1.json',
      bytes: 3491,
      full_file_sha256: attestationSha,
      canonical_payload_sha256: canonical,
      protected_runtime_manifest_sha256: MANIFEST_SHA256,
      rebind_commit_sha: 'a8ad7d7f29ba8065fb206bf5d5b6ec98bb199866',
      rebind_commit_tree_sha: '839c29954854c20b7bab926cd1a6cef3cb6c0ef6',
      binding_addendum_full_file_sha256: '812933a338050aded58f2185a66af4a2a8e00c1f46445fbc8ce0f7e9fe2c77df',
      binding_addendum_canonical_payload_sha256: '71215fdf5cd34c1025c69b498b8e8bbf9806af7a10f4deab1c616ad90335e52e',
    },
    supporting_artifacts: [
      {
        filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_GENERATION_REPORT.txt',
        bytes: 1423,
        sha256: '94177d24bd5c6fcf9a0392e493c836d1cc1e7552e7a2585a9731766d4e1ddb56',
      },
      {
        filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_FILE_IDENTITIES.json',
        bytes: 1926,
        sha256: '2cfe270a04e9c14dfaf52d190778a071bd5d2fa28d672e168bc45741ef954c9a',
      },
      {
        filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_REVIEW_BUNDLE.zip',
        bytes: 3882,
        sha256: 'e106479d9fbe69386614a45c62cbb4ebed613ea5f1f3a41282aa4a2022e74bb9',
      },
    ],
    review_checks: {
      attestation_schema_exact: true,
      duplicate_json_keys_absent: true,
      canonical_payload_property_deletion_verified: true,
      canonical_payload_sha_exact: true,
      protected_runtime_manifest_projection_exact: true,
      protected_runtime_manifest_sha_exact: true,
      self_full_file_identity_absent: true,
      embedded_human_review_data_absent: true,
      authorization_flags_fail_closed: true,
      review_bundle_exact_three_members: true,
      review_bundle_member_order_exact: true,
      review_bundle_directory_entries_absent: true,
      review_bundle_member_bytes_match_sources: true,
      review_bundle_metadata_normalized: true,
      secret_or_credential_material_absent: true,
    },
    authorization: {
      plan_attestation_review_green: true,
      plan_only_pass_authorized: false,
      execution_authorization: false,
      remote_apply_authorization: false,
      local_db_authorization: false,
      push_authorization: false,
    },
    next_gate: 'STAGE-A EXTERNAL PLAN-ONLY ATTESTATION VERIFIER IMPLEMENTATION PLANNING',
    self_identity: 'SELF_IDENTITY_REPORTED_EXTERNALLY_ONLY',
  };
}

async function writeTempJson(dir: string, name: string, value: Record<string, unknown>): Promise<{ path: string; sha: string; text: string }> {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const path = join(dir, name);
  await writeFile(path, text, 'utf8');
  return { path, sha: sha256Text(text), text };
}

test('plan attestation verifier', async (t) => {
  await t.test('1 parseVerifierCliArgs accepts exact required options', () => {
    const args = parseVerifierCliArgs([
      '--attestation-path',
      '/tmp/a.json',
      '--attestation-sha256',
      'a'.repeat(64),
      '--review-record-path',
      '/tmp/r.json',
      '--review-record-sha256',
      'b'.repeat(64),
    ]);
    assert.equal(args.attestationPath, '/tmp/a.json');
    assert.equal(args.expectedAttestationSha256, 'a'.repeat(64));
  });

  await t.test('2 missing option fails closed', () => {
    assert.throws(() => parseVerifierCliArgs(['--attestation-path', '/tmp/a.json']), /VERIFIER_INVOCATION_ARGUMENT_MISSING/);
  });

  await t.test('3 duplicate option fails closed', () => {
    assert.throws(
      () =>
        parseVerifierCliArgs([
          '--attestation-path',
          '/tmp/a.json',
          '--attestation-path',
          '/tmp/b.json',
          '--attestation-sha256',
          'a'.repeat(64),
          '--review-record-path',
          '/tmp/r.json',
          '--review-record-sha256',
          'b'.repeat(64),
        ]),
      /VERIFIER_INVOCATION_ARGUMENT_DUPLICATE/,
    );
  });

  await t.test('4 unknown option fails closed', () => {
    assert.throws(
      () =>
        parseVerifierCliArgs([
          '--attestation-path',
          '/tmp/a.json',
          '--attestation-sha256',
          'a'.repeat(64),
          '--review-record-path',
          '/tmp/r.json',
          '--review-record-sha256',
          'b'.repeat(64),
          '--repo-root',
          EXPECTED_REPO_ROOT,
        ]),
      /VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED/,
    );
  });

  await t.test('5 positional argument fails closed', () => {
    assert.throws(
      () =>
        parseVerifierCliArgs([
          'positional',
          '--attestation-path',
          '/tmp/a.json',
          '--attestation-sha256',
          'a'.repeat(64),
          '--review-record-path',
          '/tmp/r.json',
          '--review-record-sha256',
          'b'.repeat(64),
        ]),
      /VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED/,
    );
  });

  await t.test('6 validateSha256Hex accepts lowercase 64 hex', () => {
    assert.equal(validateSha256Hex('a'.repeat(64)), true);
  });

  await t.test('7 validateSha256Hex rejects uppercase', () => {
    assert.equal(validateSha256Hex('A'.repeat(64)), false);
  });

  await t.test('8 validateLocalPathCandidate rejects URL scheme', () => {
    assert.equal(validateLocalPathCandidate('https://example.com/a.json'), 'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN');
  });

  await t.test('9 validateLocalPathCandidate rejects relative path', () => {
    assert.equal(validateLocalPathCandidate('relative/path.json'), 'VERIFIER_INVOCATION_PATH_INVALID');
  });

  await t.test('10 validateLocalPathCandidate accepts absolute path', () => {
    assert.equal(validateLocalPathCandidate('/tmp/test.json'), null);
  });

  await t.test('11 readVerifiedLocalFile rejects SHA mismatch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: '0'.repeat(64),
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: revWritten.sha,
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'VERIFICATION_HOLD');
    if (result.technicalOutcome === 'VERIFICATION_HOLD') {
      assert.equal(result.holdReasonCode, 'PLAN_ATTESTATION_SHA_MISMATCH');
    }
  });

  await t.test('12 readVerifiedLocalFile rejects missing file', async () => {
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: '/tmp/m55-missing-attestation.json',
        expectedAttestationSha256: 'a'.repeat(64),
        reviewRecordPath: '/tmp/m55-missing-review.json',
        expectedReviewRecordSha256: 'b'.repeat(64),
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'VERIFICATION_HOLD');
    if (result.technicalOutcome === 'VERIFICATION_HOLD') {
      assert.equal(result.holdReasonCode, 'PLAN_REVIEW_RECORD_MISSING');
    }
  });

  await t.test('13 readVerifiedLocalFile rejects invalid SHA format', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: 'not-a-sha',
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: revWritten.sha,
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'VERIFICATION_HOLD');
    if (result.technicalOutcome === 'VERIFICATION_HOLD') {
      assert.equal(result.holdReasonCode, 'VERIFIER_INVOCATION_SHA_FORMAT_INVALID');
    }
  });

  await t.test('14 readVerifiedLocalFile rejects network path', async () => {
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: 'https://example.com/a.json',
        expectedAttestationSha256: 'a'.repeat(64),
        reviewRecordPath: '/tmp/r.json',
        expectedReviewRecordSha256: 'b'.repeat(64),
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'VERIFICATION_HOLD');
    if (result.technicalOutcome === 'VERIFICATION_HOLD') {
      assert.equal(result.holdReasonCode, 'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN');
    }
  });

  await t.test('15 readVerifiedLocalFile validates bytes before parse on good fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: attWritten.sha,
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: revWritten.sha,
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'ATTESTATION_CONTENT_VERIFIED');
  });

  await t.test('16 readVerifiedLocalFile rejects review record SHA mismatch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: attWritten.sha,
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: '0'.repeat(64),
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.technicalOutcome, 'VERIFICATION_HOLD');
    if (result.technicalOutcome === 'VERIFICATION_HOLD') {
      assert.equal(result.holdReasonCode, 'PLAN_REVIEW_RECORD_SHA_MISMATCH');
    }
  });

  await t.test('17 duplicate-key parser accepts valid object', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":1,"b":"x"}');
    assert.deepEqual(parsed, { a: 1, b: 'x' });
  });

  await t.test('18 duplicate-key parser rejects duplicate keys', () => {
    assert.throws(() => parseJsonRejectingDuplicateKeysForTests('{"a":1,"a":2}'), /PLAN_ATTESTATION_MALFORMED/);
  });

  await t.test('19 duplicate-key parser permits same key in different objects', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":{"k":1},"b":{"k":2}}');
    assert.deepEqual(parsed, { a: { k: 1 }, b: { k: 2 } });
  });

  await t.test('20 duplicate-key parser handles escaped quotes', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":"\\"quoted\\""}');
    assert.deepEqual(parsed, { a: '"quoted"' });
  });

  await t.test('21 duplicate-key parser handles unicode escapes', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":"\\u0041"}');
    assert.deepEqual(parsed, { a: 'A' });
  });

  await t.test('22 duplicate-key parser handles nested arrays', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":[1,{"b":2}]}');
    assert.deepEqual(parsed, { a: [1, { b: 2 }] });
  });

  await t.test('23 duplicate-key parser rejects malformed JSON', () => {
    assert.throws(() => parseJsonRejectingDuplicateKeysForTests('{"a":}'), /PLAN_ATTESTATION_MALFORMED/);
  });

  await t.test('24 duplicate-key parser handles strings with punctuation', () => {
    const parsed = parseJsonRejectingDuplicateKeysForTests('{"a":"{not:json}"}');
    assert.deepEqual(parsed, { a: '{not:json}' });
  });

  await t.test('25 canonicalSerialize sorts object keys', () => {
    assert.equal(canonicalSerializeForTests({ b: 1, a: 2 }), '{"a":2,"b":1}');
  });

  await t.test('26 canonicalSerialize preserves array order', () => {
    assert.equal(canonicalSerializeForTests([2, 1]), '[2,1]');
  });

  await t.test('27 canonicalSerialize uses UTF-8 without ASCII escaping', () => {
    assert.equal(canonicalSerializeForTests({ note: '日本語' }), '{"note":"日本語"}');
  });

  await t.test('28 attestation canonical uses property deletion not blanking', () => {
    const attestation = buildSyntheticAttestation();
    const deleted = computeAttestationCanonicalPayloadSha256(attestation);
    const clone = structuredClone(attestation) as Record<string, unknown>;
    (clone.integrity as Record<string, unknown>).canonical_payload_sha256 = '';
    const blanked = sha256Text(canonicalSerializeForTests(clone));
    assert.notEqual(deleted, blanked);
  });

  await t.test('29 attestation canonical matches stored integrity hash', () => {
    const attestation = buildSyntheticAttestation();
    assert.equal(
      computeAttestationCanonicalPayloadSha256(attestation),
      (attestation.integrity as Record<string, unknown>).canonical_payload_sha256,
    );
  });

  await t.test('30 manifest projection SHA matches frozen value for synthetic entries', () => {
    const projection = {
      projection_identifier: 'm55.protected_runtime_manifest.v1',
      canonical_serialization: 'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1',
      entry_count: 7,
      entries: [
        {
          path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json',
          bytes: 309607,
          sha256: 'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c',
          classification: 'authority_contract',
        },
        {
          path: 'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json',
          bytes: 110904,
          sha256: '6d677b02ff9c73591cbea151444d5dc61ea766bda7ed6cd0598e63ad16ca9f93',
          classification: 'authority_matrix',
        },
        {
          path: 'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZATION_EXACT_PARSER_EVIDENCE.json',
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
          path: 'lib/m55/transactionNormalized/transactionNormalizedCore.ts',
          bytes: 96725,
          sha256: 'a85d428231116891b7ad94aed0fcf57e243e7309e19df2694e35987124637bda',
          classification: 'rebind_core',
        },
        {
          path: 'scripts/m55/runTransactionNormalizedPlan.ts',
          bytes: 4110,
          sha256: 'b13f5dfc1177c673f3bda20be90d4011d84b7b8d9c42949f8c8e0f1a81d2c26f',
          classification: 'rebind_plan_cli',
        },
      ],
    };
    assert.equal(sha256Text(canonicalSerializeForTests(projection)), MANIFEST_SHA256);
  });

  await t.test('31 review record schema validates synthetic fixture', () => {
    const attestation = buildSyntheticAttestation();
    const review = buildSyntheticReviewRecord(undefined, computeAttestationCanonicalPayloadSha256(attestation));
    assert.equal(
      evaluateVerifiedDocumentsForTests({ reviewRecord: review, attestation }),
      'ATTESTATION_CONTENT_VERIFIED',
    );
  });

  await t.test('32 review record status mutation fails closed', () => {
    const review = buildSyntheticReviewRecord();
    review.status = 'HOLD';
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('33 review record authorization mutation fails closed', () => {
    const review = buildSyntheticReviewRecord();
    (review.authorization as Record<string, unknown>).plan_only_pass_authorized = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  });

  await t.test('34 review record extra top-level field fails closed', () => {
    const review = buildSyntheticReviewRecord();
    review.extra = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('35 review record supporting artifact order is contractual', () => {
    const review = buildSyntheticReviewRecord();
    const artifacts = review.supporting_artifacts as Array<Record<string, unknown>>;
    artifacts.reverse();
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('36 attestation schema validates synthetic fixture', () => {
    const attestation = buildSyntheticAttestation();
    const review = buildSyntheticReviewRecord(undefined, computeAttestationCanonicalPayloadSha256(attestation));
    assert.equal(
      evaluateVerifiedDocumentsForTests({ reviewRecord: review, attestation }),
      'ATTESTATION_CONTENT_VERIFIED',
    );
  });

  await t.test('37 attestation scope mutation fails closed', () => {
    const attestation = buildSyntheticAttestation();
    attestation.attestation_scope = 'MUTATED';
    (attestation.integrity as Record<string, unknown>).canonical_payload_sha256 =
      computeAttestationCanonicalPayloadSha256(attestation);
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_SCOPE_MISMATCH');
  });

  await t.test('38 attestation canonical mutation fails closed', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.integrity as Record<string, unknown>).canonical_payload_sha256 = '0'.repeat(64);
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_CANONICAL_PAYLOAD_MISMATCH');
  });

  await t.test('39 attestation manifest mutation fails closed', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.protected_runtime_manifest as Record<string, unknown>).sha256 = '0'.repeat(64);
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH');
  });

  await t.test('40 cross-binding mismatch fails closed', () => {
    const attestation = buildSyntheticAttestation();
    const review = buildSyntheticReviewRecord(undefined, computeAttestationCanonicalPayloadSha256(attestation));
    assert.equal(
      evaluateVerifiedDocumentsForTests({
        reviewRecord: review,
        attestation,
        expectedAttestationSha256: 'b'.repeat(64),
      }),
      'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH',
    );
  });

  await t.test('41 evaluateVerifiedDocuments rejects execution authorization true', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.authorization as Record<string, unknown>).execution_authorization = true;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  });

  await t.test('42 evaluateVerifiedDocuments rejects parent authority mutation', () => {
    const attestation = buildSyntheticAttestation();
    ((attestation.parent_authority as Record<string, unknown>).contract as Record<string, unknown>).bytes = 1;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_PARENT_AUTHORITY_MISMATCH');
  });

  await t.test('43 evaluateVerifiedDocuments rejects addendum identity mutation', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.binding_addendum as Record<string, unknown>).bytes = 1;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH');
  });

  await t.test('44 evaluateVerifiedDocuments rejects rebind commit mutation', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.repository_binding as Record<string, unknown>).rebind_commit_sha = '0'.repeat(64);
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH');
  });

  await t.test('45 success semantics keep plan_only_pass false', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: attWritten.sha,
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: revWritten.sha,
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.planOnlyPass, false);
    assert.equal(result.humanGateRequired, true);
    assert.equal(result.verifierImplementationReviewRequired, true);
  });

  await t.test('46 success semantics require human gate review', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm55-verifier-'));
    const attestation = buildSyntheticAttestation();
    const attWritten = await writeTempJson(dir, 'attestation.json', attestation);
    const review = buildSyntheticReviewRecord(attWritten.sha, computeAttestationCanonicalPayloadSha256(attestation));
    const revWritten = await writeTempJson(dir, 'review.json', review);
    const result = await verifyPlanAttestationContentForTests(
      {
        attestationPath: attWritten.path,
        expectedAttestationSha256: attWritten.sha,
        reviewRecordPath: revWritten.path,
        expectedReviewRecordSha256: revWritten.sha,
        repoRoot: EXPECTED_REPO_ROOT,
      },
      { skipWorkspaceValidation: true },
    );
    assert.equal(result.humanGateOutcome, 'HUMAN_GATE_REVIEW_REQUIRED');
    assert.equal(result.executionLocked, true);
  });

  await t.test('47 normal plan CLI unchanged and does not import verifier', () => {
    const cliSource = readFileSync(resolve('scripts/m55/runTransactionNormalizedPlan.ts'), 'utf8');
    assert.equal(cliSource.includes('planAttestationVerification'), false);
    assert.equal(cliSource.includes('attestation'), true);
  });

  await t.test('48 dedicated verifier CLI does not emit PLAN_ONLY_PASS', () => {
    const cliSource = readFileSync(resolve('scripts/m55/runStageAPlanAttestationVerification.ts'), 'utf8');
    assert.equal(cliSource.includes('PLAN_ONLY_PASS'), false);
    assert.equal(cliSource.includes('plan_only_pass: false'), true);
  });

  await t.test('50 review reviewed_attestation extra field fails closed', () => {
    const review = buildSyntheticReviewRecord();
    (review.reviewed_attestation as Record<string, unknown>).extra = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('51 review supporting-artifact entry extra field fails closed', () => {
    const review = buildSyntheticReviewRecord();
    const artifacts = review.supporting_artifacts as Array<Record<string, unknown>>;
    artifacts[0].extra = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('52 review review_checks extra field fails closed', () => {
    const review = buildSyntheticReviewRecord();
    (review.review_checks as Record<string, unknown>).extra = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('53 review authorization extra field fails closed', () => {
    const review = buildSyntheticReviewRecord();
    (review.authorization as Record<string, unknown>).extra = true;
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('54 invalid review timestamp fails closed', () => {
    const review = buildSyntheticReviewRecord();
    review.reviewed_at_utc = 'not-a-time';
    assert.equal(validateReviewRecordDocumentForTests(review), 'PLAN_REVIEW_RECORD_MALFORMED');
  });

  await t.test('55 attestation repository addendum manifest extra fields fail closed', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.repository_binding as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_MALFORMED');

    const attestation2 = buildSyntheticAttestation();
    (attestation2.binding_addendum as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation2), 'PLAN_ATTESTATION_MALFORMED');

    const attestation3 = buildSyntheticAttestation();
    (attestation3.protected_runtime_manifest as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation3), 'PLAN_ATTESTATION_MALFORMED');
  });

  await t.test('56 attestation parent-authority nested extra field fails closed', () => {
    const attestation = buildSyntheticAttestation();
    ((attestation.parent_authority as Record<string, unknown>).contract as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_PARENT_AUTHORITY_MISMATCH');
  });

  await t.test('57 attestation review-contract authorization integrity extras fail closed', () => {
    const attestation = buildSyntheticAttestation();
    (attestation.review_contract as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_MALFORMED');

    const attestation2 = buildSyntheticAttestation();
    (attestation2.authorization as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation2), 'PLAN_ATTESTATION_MALFORMED');

    const attestation3 = buildSyntheticAttestation();
    (attestation3.integrity as Record<string, unknown>).extra = true;
    assert.equal(validateAttestationDocumentForTests(attestation3), 'PLAN_ATTESTATION_MALFORMED');
  });

  await t.test('58 invalid attestation generated timestamp fails closed', () => {
    const attestation = buildSyntheticAttestation();
    attestation.generated_at_utc = 'not-a-time';
    assert.equal(validateAttestationDocumentForTests(attestation), 'PLAN_ATTESTATION_MALFORMED');
  });

  await t.test('59 valid exact UTC timestamps pass', () => {
    const review = buildSyntheticReviewRecord();
    const attestation = buildSyntheticAttestation();
    assert.equal(validateReviewRecordDocumentForTests(review), null);
    assert.equal(validateAttestationDocumentForTests(attestation), null);
  });

  await t.test('60 CLI unknown exception cannot emit free-form message', () => {
    const code = normalizeToControlledHoldReasonCode(new Error('/secret/path leaked'));
    assert.equal(code, 'VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED');
    assert.equal(code.includes('/'), false);
  });

  await t.test('61 every registered controlled HOLD code is preserved by normalizer', () => {
    for (const code of VERIFIER_HOLD_REASON_CODES) {
      assert.equal(normalizeToControlledHoldReasonCode(code), code);
    }
  });

  await t.test('62 CLI source does not pass raw error.message to output', () => {
    const cliSource = readFileSync(resolve('scripts/m55/runStageAPlanAttestationVerification.ts'), 'utf8');
    assert.equal(cliSource.includes('error.message'), false);
    assert.equal(cliSource.includes('normalizeToControlledHoldReasonCode'), true);
    assert.equal(cliSource.includes('parseVerifierCliArgs'), true);
    assert.equal(cliSource.includes('verifyPlanAttestationContent'), true);
    assert.equal(cliSource.includes('ForTests'), false);
  });
});
