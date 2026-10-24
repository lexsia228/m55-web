import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL,
  PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID,
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL,
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CATALOG_SHAPE_SQL,
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_EXECUTION_PLAN,
  PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_INSERT_PRIVILEGE_SQL,
  PAIR_P5_LEDGER_PREVIEW_EXECUTION_ROLE_CONTRACT,
  PAIR_P5_LEDGER_PREVIEW_POST_APPLY_CONTRACT_SQL,
  PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION,
  PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS,
  PAIR_P5_PREVIEW_MIGRATION_APPLY_SEQUENCE,
  resolvePairP5LedgerPreviewPreflightApplyDecision,
  claimPairP5DedicatedReceiptAtomicOneUse,
  createInMemoryPairP5DedicatedReceiptConsumptionStoreForTestsOnly,
  resetPairP5DedicatedReceiptConsumptionStoreForTestsOnly,
} from './previewRemoteApply/pairP5DedicatedReceiptConsumptionLedger.ts';
import {
  HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID,
  HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN,
  PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS,
  PAIR_P5_OPERATIONAL_HUMAN_PUBLIC_KEY_SPKI_DER_SHA256,
  PAIR_P5_OPERATIONAL_HUMAN_TRUST_KEY_ID,
  buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly,
  generatePairP5HumanAttestationTestKeyMaterialForTestsOnly,
  signPairP5HumanPreviewUiAttestationForTestsOnly,
  verifyPairP5SignedHumanPreviewUiAttestation,
  verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt,
  HOLD_PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_ISSUER_NOT_AUTHORIZED,
} from './previewRemoteApply/pairP5HumanPreviewUiAttestation.ts';
import { PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE } from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import {
  HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED,
  HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED,
  HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED,
  PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
  acceptPairP5OperationalIndependentPreviewUiWitness,
  claimPairP5DurableDedicatedReceiptOneTimeUse,
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly,
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly,
  validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly,
} from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import {
  HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID,
  PAIR_P5_HUMAN_AUTHORIZATION_ABSENT_IDENTITY_DIGEST_SHA256,
  validatePairP5DedicatedReceiptConsumptionBinding,
} from './previewRemoteApply/pairP5DedicatedReceiptConsumptionLedger.ts';
import {
  HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN,
  claimPairP5DedicatedReceiptAtomicOneUseAfterPostConnectVerification,
} from './previewRemoteApply/pairP5DedicatedReceiptConsumptionLedger.ts';
import { attemptPairP5PostConnectLedgerAtomicClaimInMutationTransaction } from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_IDENTITY_STEP_ID,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';

describe('Pair P5 human attestation + receipt ledger (local)', () => {
  it('pins operational Human Ed25519 SPKI fingerprint at module load', () => {
    assert.equal(PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS.length, 1);
    const anchor = PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS[0];
    assert.equal(anchor.trustKeyId, PAIR_P5_OPERATIONAL_HUMAN_TRUST_KEY_ID);
    assert.equal(anchor.status, 'ACTIVE');
    assert.equal(PAIR_P5_OPERATIONAL_HUMAN_PUBLIC_KEY_SPKI_DER_SHA256.length, 64);
  });

  it('verifies signed attestation with test-only key and rejects operational anchors', () => {
    const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_KEY_v1');
    const payload = buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly({
      trustKeyId: key.trustKeyId,
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_TEST_001',
      nonce: 'nonce-001',
      purpose: 'LIVE_MUTATION',
      humanUiEvidenceDigestSha256: 'a'.repeat(64),
    });
    const signed = signPairP5HumanPreviewUiAttestationForTestsOnly({
      payload,
      privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    });
    const testAnchors = [
      {
        trustKeyId: key.trustKeyId,
        publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
        status: 'ACTIVE' as const,
      },
    ];
    const ok = verifyPairP5SignedHumanPreviewUiAttestation({
      signed,
      trustAnchors: testAnchors,
      expectedPurpose: 'LIVE_MUTATION',
    });
    assert.equal(ok.ok, true);
    const operationalAnchors = verifyPairP5SignedHumanPreviewUiAttestation({
      signed,
      trustAnchors: PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS,
      expectedPurpose: 'LIVE_MUTATION',
    });
    assert.equal(operationalAnchors.ok, false);
    if (!operationalAnchors.ok) {
      assert.equal(operationalAnchors.holdReasonCode, HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN);
    }
    const tampered = {
      ...signed,
      signatureBase64: Buffer.from('invalid-signature-bytes').toString('base64'),
    };
    const badSig = verifyPairP5SignedHumanPreviewUiAttestation({
      signed: tampered,
      trustAnchors: testAnchors,
      expectedPurpose: 'LIVE_MUTATION',
    });
    assert.equal(badSig.ok, false);
    if (!badSig.ok) {
      assert.equal(badSig.holdReasonCode, HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID);
    }
  });

  it('operational witness requires signed attestation and rejects test registry laundering', () => {
    const observation = {
      sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1' as const,
      witnessedOrganization: 'm55-preview',
      witnessedProject: 'm55-soul-preview',
      witnessedProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      witnessedDatabaseTier: 'Primary Database',
      witnessedDatabaseName: PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
      observationTimeIso: '2026-10-23T08:00:00.000Z',
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_TEST_002',
    };
    const missingSigned = acceptPairP5OperationalIndependentPreviewUiWitness(observation);
    assert.equal(missingSigned.ok, false);
    if (!missingSigned.ok) {
      assert.equal(missingSigned.holdReasonCode, HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED);
    }
  });

  it('atomic ledger in-memory double models ON CONFLICT semantics', () => {
    resetPairP5DedicatedReceiptConsumptionStoreForTestsOnly(
      createInMemoryPairP5DedicatedReceiptConsumptionStoreForTestsOnly(),
    );
    const binding = {
      receiptIdentifierSha256: 'c'.repeat(64),
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      operationPurpose: 'LIVE_MUTATION' as const,
      attestationIdentityDigestSha256: 'd'.repeat(64),
      humanAuthorizationIdentityDigestSha256: 'e'.repeat(64),
    };
    assert.equal(claimPairP5DedicatedReceiptAtomicOneUse(binding).ok, true);
    const replay = claimPairP5DedicatedReceiptAtomicOneUse(binding);
    assert.equal(replay.ok, false);
    if (!replay.ok) {
      assert.equal(replay.holdReasonCode, HOLD_PAIR_P5_DURABLE_RECEIPT_ALREADY_CONSUMED);
    }
    resetPairP5DedicatedReceiptConsumptionStoreForTestsOnly();
    const legacyStringHold = claimPairP5DurableDedicatedReceiptOneTimeUse('f'.repeat(64));
    assert.equal(legacyStringHold.ok, false);
    if (!legacyStringHold.ok) {
      assert.equal(legacyStringHold.holdReasonCode, HOLD_PAIR_P5_DURABLE_RECEIPT_CONSUMPTION_BINDING_INVALID);
    }
    const unwired = claimPairP5DurableDedicatedReceiptOneTimeUse({
      ...binding,
      receiptIdentifierSha256: 'f'.repeat(64),
    });
    assert.equal(unwired.ok, false);
    if (!unwired.ok) {
      assert.equal(unwired.holdReasonCode, HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED);
    }
  });

  it('post-connect ledger claim rejects LIVE_FRESH_READONLY and unwired postgres port', async () => {
    const binding = {
      receiptIdentifierSha256: 'a'.repeat(64),
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      operationPurpose: 'LIVE_FRESH_READONLY' as const,
      attestationIdentityDigestSha256: 'b'.repeat(64),
      humanAuthorizationIdentityDigestSha256: 'c'.repeat(64),
    };
    const readonlyHold = await claimPairP5DedicatedReceiptAtomicOneUseAfterPostConnectVerification({
      binding,
      postgresPort: null,
    });
    assert.equal(readonlyHold.ok, false);
    if (!readonlyHold.ok) {
      assert.equal(readonlyHold.holdReasonCode, HOLD_PAIR_P5_LIVE_FRESH_READONLY_LEDGER_MUTATION_FORBIDDEN);
    }
    const mutationBinding = { ...binding, operationPurpose: 'LIVE_MUTATION' as const };
    const hold = await attemptPairP5PostConnectLedgerAtomicClaimInMutationTransaction({
      binding: mutationBinding,
      postgresPort: null,
    });
    assert.equal(hold, HOLD_PAIR_P5_DURABLE_RECEIPT_LEDGER_NOT_DEPLOYED);
  });

  it('operational attestation verifier fails closed without issuer and anchors', () => {
    const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_KEY_v3');
    const payload = buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly({
      trustKeyId: key.trustKeyId,
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_OPS_VERIFY_001',
      nonce: 'nonce-ops',
      purpose: 'LIVE_MUTATION',
      humanUiEvidenceDigestSha256: '2'.repeat(64),
    });
    const signed = signPairP5HumanPreviewUiAttestationForTestsOnly({
      payload,
      privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    });
    const liveIssuerDisabled = verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt({
      signed,
      expectedPurpose: 'LIVE_MUTATION',
      authorizedExternalAttestationIssuerAvailable: false,
    });
    assert.equal(liveIssuerDisabled.ok, false);
    if (!liveIssuerDisabled.ok) {
      assert.equal(
        liveIssuerDisabled.holdReasonCode,
        HOLD_PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_ISSUER_NOT_AUTHORIZED,
      );
    }
    const liveTestKeyRejected = verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt({
      signed,
      expectedPurpose: 'LIVE_MUTATION',
      authorizedExternalAttestationIssuerAvailable: PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE,
    });
    assert.equal(liveTestKeyRejected.ok, false);
    if (!liveTestKeyRejected.ok) {
      assert.equal(liveTestKeyRejected.holdReasonCode, HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN);
    }
  });

  it('accepts operational witness with offline trusted test anchors only', () => {
    const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_KEY_v2');
    const payload = buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly({
      trustKeyId: key.trustKeyId,
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_POSITIVE_001',
      nonce: 'nonce-positive',
      purpose: 'LIVE_MUTATION',
      humanUiEvidenceDigestSha256: '1'.repeat(64),
    });
    const signed = signPairP5HumanPreviewUiAttestationForTestsOnly({
      payload,
      privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    });
    const observation = {
      sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1' as const,
      witnessedOrganization: 'm55-preview',
      witnessedProject: 'm55-soul-preview',
      witnessedProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      witnessedDatabaseTier: 'Primary Database',
      witnessedDatabaseName: PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
      observationTimeIso: '2026-10-23T08:00:00.000Z',
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_POSITIVE_001',
    };
    const ok = acceptPairP5OperationalIndependentPreviewUiWitness(observation, {
      signedHumanAttestation: signed,
      expectedPurpose: 'LIVE_MUTATION',
      trustAnchorsOverrideForTestsOnly: [
        {
          trustKeyId: key.trustKeyId,
          publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
          status: 'ACTIVE',
        },
      ],
    });
    assert.equal(ok.ok, true);
    resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly();
    registerPairP5HumanPreviewApplyAuthorizationForTestsOnly({
      authorizationId: 'HUMAN_APPLY_FIXTURE_001',
      purpose: 'LIVE_MUTATION',
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      migrationSourceSha256: payload.migrationSourceSha256,
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    });
    const humanOk = validatePairP5HumanPreviewApplyAuthorizationRecordForTestsOnly(
      'HUMAN_APPLY_FIXTURE_001',
      'LIVE_MUTATION',
    );
    assert.equal(humanOk.ok, true);
  });

  it('rejects operational ledger binding with absent human authorization digest', () => {
    const binding = {
      receiptIdentifierSha256: '9'.repeat(64),
      previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      selectedStep: PAIR_P5_IDENTITY_STEP_ID,
      operationPurpose: 'LIVE_MUTATION' as const,
      attestationIdentityDigestSha256: '8'.repeat(64),
      humanAuthorizationIdentityDigestSha256: PAIR_P5_HUMAN_AUTHORIZATION_ABSENT_IDENTITY_DIGEST_SHA256,
    };
    assert.equal(validatePairP5DedicatedReceiptConsumptionBinding(binding), false);
  });

  it('exposes draft migration id and atomic consume SQL contract', () => {
    assert.equal(
      PAIR_P5_DEDICATED_RECEIPT_CONSUMPTION_LEDGER_MIGRATION_ID,
      '20261008200000_m55_pair_p5_dedicated_receipt_one_use_ledger_v1',
    );
    assert.match(PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL, /ON CONFLICT \(receipt_identifier_sha256\) DO NOTHING/);
    assert.match(PAIR_P5_DEDICATED_RECEIPT_ATOMIC_CONSUME_SQL, /RETURNING receipt_identifier_sha256/);
    const migrationPath = join(
      process.cwd(),
      'supabase/migrations/20261008200000_m55_pair_p5_dedicated_receipt_one_use_ledger_v1.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
    assert.equal(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_EXECUTION_PLAN.ordinarySinglePassMigrateAllInsufficient, false);
    assert.equal(PAIR_P5_PREVIEW_MIGRATION_APPLY_SEQUENCE[0]?.versionSortKey, 20261008200000);
    assert.equal(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_EXECUTION_PLAN.absentIsNormalPreApplyCandidate, true);
    assert.equal(
      resolvePairP5LedgerPreviewPreflightApplyDecision(PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.ABSENT),
      PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.ABSENT,
    );
    assert.equal(
      resolvePairP5LedgerPreviewPreflightApplyDecision(PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.PRESENT_EXACT),
      PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_EXACT,
    );
    assert.equal(
      resolvePairP5LedgerPreviewPreflightApplyDecision(
        PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_CLASSIFICATIONS.PRESENT_MISMATCH,
      ),
      PAIR_P5_LEDGER_PREVIEW_PREFLIGHT_APPLY_DECISION.PRESENT_MISMATCH,
    );
    assert.equal(PAIR_P5_LEDGER_PREVIEW_EXECUTION_ROLE_CONTRACT.approvedPreviewDbRoleName, null);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /catalog_classification/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /ABSENT/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /PRESENT_EXACT/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /HOLD_EXECUTION_ROLE_NOT_PROVIDED/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /HOLD_EXECUTION_ROLE_UNKNOWN/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /apply_decision/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /SKIP_LEDGER_DDL_DO_NOT_DUPLICATE_CREATE/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL, /check_constraint_count/);
    assert.match(PAIR_P5_LEDGER_PREVIEW_POST_APPLY_CONTRACT_SQL, /insert_policy_count/);
    assert.equal(
      PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CATALOG_SHAPE_SQL,
      PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL,
    );
  });

  it('operational witness accepts verified signature without test registry when test anchors supplied', () => {
    const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_KEY_REGISTRY_FREE');
    const payload = buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly({
      trustKeyId: key.trustKeyId,
      attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_REGISTRY_FREE_001',
      nonce: 'nonce-registry-free',
      purpose: 'LIVE_MUTATION',
      humanUiEvidenceDigestSha256: '3'.repeat(64),
    });
    const signed = signPairP5HumanPreviewUiAttestationForTestsOnly({
      payload,
      privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    });
    const observation = {
      sourceKind: 'INDEPENDENT_PREVIEW_UI_WITNESS_v1' as const,
      witnessedOrganization: 'm55-preview',
      witnessedProject: 'm55-soul-preview',
      witnessedProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
      witnessedDatabaseTier: 'Primary Database',
      witnessedDatabaseName: PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
      observationTimeIso: '2026-10-23T08:00:00.000Z',
      attestationId: payload.attestationId,
    };
    const anchors = [
      {
        trustKeyId: key.trustKeyId,
        publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
        status: 'ACTIVE' as const,
      },
    ];
    const accepted = acceptPairP5OperationalIndependentPreviewUiWitness(observation, {
      signedHumanAttestation: signed,
      expectedPurpose: 'LIVE_MUTATION',
      trustAnchorsOverrideForTestsOnly: anchors,
    });
    assert.equal(accepted.ok, true);
  });
});
