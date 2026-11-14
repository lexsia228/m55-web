import {
  PAIR_P5_FULFILL_MIGRATION_SHA256,
  PAIR_P5_FULFILL_MIGRATION_VERSION,
  PAIR_P5_FULFILL_STEP_ID,
  assertPairP5FulfillProbeSqlPinnedIntegrity,
} from './pairP5FulfillStepAuthority.ts';
import {
  PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE,
  resolvePairP5TestAttestationTrustAnchorForTestsOnly,
  validatePairP5HumanPreviewApplyAuthorizationRecord,
  type PairP5DedicatedTargetBindingReceipt,
} from './pairP5DedicatedTargetBindingReceipt.ts';
import { PAIR_P5_STATIC_EXECUTION_GATE } from './pairP5IdentityOfflinePlan.ts';
import { PAIR_P5_APPROVED_PREVIEW_PROJECT_REF } from './pairP5IdentityStepAuthority.ts';
import {
  verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt,
  verifyPairP5SignedHumanPreviewUiAttestation,
} from './pairP5HumanPreviewUiAttestation.ts';

export const PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID =
  'M55_PAIR_P5_FULFILL_AUTHORIZATION_GATED_REAL_EXECUTOR_v1' as const;

/** Code-only implementation GO — does not authorize Preview APPLY or LIVE mutation by itself. */
export const PAIR_P5_FULFILL_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED = false as const;

/** Post-commit READ-ONLY verifier on a distinct live connection (fulfill step only). */
export const PAIR_P5_FULFILL_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED = true as const;

export const PAIR_P5_FULFILL_STATIC_EXECUTION_GATE = PAIR_P5_STATIC_EXECUTION_GATE;

export type PairP5FulfillHumanApplyAuthorizationInput = {
  readonly dedicatedTargetBindingReceipt?: PairP5DedicatedTargetBindingReceipt | null;
};

export function isPairP5FulfillHumanPreviewApplyAuthorizationGranted(
  input?: PairP5FulfillHumanApplyAuthorizationInput,
): boolean {
  if (PAIR_P5_FULFILL_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED !== false) {
    return false;
  }
  const receipt = input?.dedicatedTargetBindingReceipt ?? null;
  if (receipt === null) {
    return false;
  }
  const body = receipt.body;
  if (body.receiptClass !== 'OPERATIONAL') {
    return false;
  }
  if (body.selectedStep !== PAIR_P5_FULFILL_STEP_ID) {
    return false;
  }
  if (body.previewProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF) {
    return false;
  }
  if (body.migrationSourceSha256 !== PAIR_P5_FULFILL_MIGRATION_SHA256) {
    return false;
  }
  if (body.signedHumanPreviewUiAttestation === null || body.humanAuthorizationId === null) {
    return false;
  }
  const signed = body.signedHumanPreviewUiAttestation;
  let attestation = verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt({
    signed,
    expectedPurpose: 'LIVE_MUTATION',
    authorizedExternalAttestationIssuerAvailable: PAIR_P5_AUTHORIZED_EXTERNAL_ATTESTATION_ISSUER_AVAILABLE,
  });
  if (!attestation.ok) {
    const testAnchor = resolvePairP5TestAttestationTrustAnchorForTestsOnly(signed.payload.trustKeyId);
    if (testAnchor === undefined) {
      return false;
    }
    attestation = verifyPairP5SignedHumanPreviewUiAttestation({
      signed,
      trustAnchors: [testAnchor],
      expectedPurpose: 'LIVE_MUTATION',
      requireOperationalEvidenceDigest: true,
    });
    if (!attestation.ok) {
      return false;
    }
  }
  const payload = attestation.payload;
  if (
    payload.selectedStep !== PAIR_P5_FULFILL_STEP_ID ||
    payload.migrationSourceSha256 !== PAIR_P5_FULFILL_MIGRATION_SHA256 ||
    payload.previewProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF ||
    payload.purpose !== 'LIVE_MUTATION'
  ) {
    return false;
  }
  const human = validatePairP5HumanPreviewApplyAuthorizationRecord(body.humanAuthorizationId, 'LIVE_MUTATION', {
    verifiedAttestationPayload: payload,
  });
  if (!human.ok) {
    return false;
  }
  return human.authorization.selectedStep === PAIR_P5_FULFILL_STEP_ID;
}

export function pairP5FulfillLiveFreshReadonlyProbeAuthorizationGranted(): boolean {
  return PAIR_P5_FULFILL_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED;
}

export function assertPairP5FulfillPrerequisiteLocalCodeIntegrity(): void {
  assertPairP5FulfillProbeSqlPinnedIntegrity();
}

export const PAIR_P5_FULFILL_LIVE_EXECUTION_PREP_READINESS = {
  executorId: PAIR_P5_FULFILL_AUTH_GATED_REAL_EXECUTOR_ID,
  callableStepId: PAIR_P5_FULFILL_STEP_ID,
  migrationVersion: PAIR_P5_FULFILL_MIGRATION_VERSION,
  fulfillHumanPreviewApplyAuthorizationGranted: PAIR_P5_FULFILL_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED,
  fulfillLiveFreshReadonlyProbeAuthorizationGranted:
    PAIR_P5_FULFILL_LIVE_FRESH_READONLY_PROBE_AUTHORIZATION_GRANTED,
  dedicatedFulfillCliImplemented: true as const,
  liveMutationPathUsesFulfillHumanGate: true as const,
  liveFreshReadonlyDistinctConnectionWired: true as const,
  previewApplyReady: false as const,
  nextHumanAction: 'ISSUE_P5_3_OPERATIONAL_RECEIPT_AND_RUN_FULFILL_CLI_ONCE' as const,
} as const;
