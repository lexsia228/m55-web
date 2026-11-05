import {
  EXPECTED_CURRENT_USER,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  calculateCanonicalHostFingerprint,
  expectedConnectionUserForProjectRef,
  validateCredentialMethodSelection,
} from './remoteConnectionAuthority.ts';
import type { PairP5AuthGatedRealExecutionInput } from './pairP5IdentityAuthorizationGatedRealExecutor.ts';
import type { PairP5StructuralAuthorityContractResult } from './pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_BRANCH,
  PAIR_P5_IDENTITY_STEP_ID,
  validatePairP5OperationalLiveGitHeadAuthorityBinding,
  validatePairP5RuntimeGitHeadAuthorityBinding,
} from './pairP5IdentityStepAuthority.ts';
import {
  PAIR_P5_STATIC_EXECUTION_GATE,
  validatePairP5RepositoryIdentity,
  validatePairP5TargetIdentity,
} from './pairP5IdentityOfflinePlan.ts';
import {
  HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID,
  PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
} from './pairP5DedicatedTargetBindingReceipt.ts';
import {
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  PAIR_P5_CHECKOUT_STEP_ID,
} from './pairP5CheckoutStepAuthority.ts';
import { validateDedicatedPairP5CheckoutStepSelection } from './pairP5CheckoutOfflinePlan.ts';

export function validatePairP5CheckoutPreviewStructuralAuthorityContract(
  input: PairP5AuthGatedRealExecutionInput,
): PairP5StructuralAuthorityContractResult {
  const selection = validateDedicatedPairP5CheckoutStepSelection(input.selectedStep);
  if (!selection.ok) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
  }
  const repoHold = validatePairP5RepositoryIdentity(input.repoRoot, input.repository);
  if (repoHold) {
    return { ok: false, holdReasonCode: repoHold };
  }
  const targetHold = validatePairP5TargetIdentity(input.target);
  if (targetHold) {
    return { ok: false, holdReasonCode: targetHold };
  }
  const receipt = input.dedicatedTargetBindingReceipt ?? null;
  if (receipt !== null && receipt.body.selectedStep === PAIR_P5_IDENTITY_STEP_ID) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_DEDICATED_RECEIPT_INVALID };
  }
  const headBindingHold =
    receipt?.body.receiptClass === 'OPERATIONAL'
      ? validatePairP5OperationalLiveGitHeadAuthorityBinding({
          observedHeadCommitSha: input.repository.headCommitSha,
          observedTreeSha: input.repository.treeSha,
          receiptAuthorizedHeadCommitSha: receipt.body.git.headCommitSha,
          receiptAuthorizedTreeSha: receipt.body.git.treeSha,
          signedAttestationGitHeadCommitSha:
            receipt.body.signedHumanPreviewUiAttestation?.payload.gitHeadCommitSha ?? null,
        })
      : validatePairP5RuntimeGitHeadAuthorityBinding({
          observedHeadCommitSha: input.repository.headCommitSha,
          observedTreeSha: input.repository.treeSha,
          receiptAuthorizedHeadCommitSha: receipt?.body.git.headCommitSha ?? null,
          receiptAuthorizedTreeSha: receipt?.body.git.treeSha ?? null,
          signedAttestationGitHeadCommitSha:
            receipt?.body.signedHumanPreviewUiAttestation?.payload.gitHeadCommitSha ?? null,
        });
  if (headBindingHold) {
    return { ok: false, holdReasonCode: headBindingHold };
  }
  const credentialHold = validateCredentialMethodSelection({
    credentialMethod: PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
  });
  if (!credentialHold.ok) {
    return { ok: false, holdReasonCode: credentialHold.holdReasonCode ?? 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  const hostResult = calculateCanonicalHostFingerprint(SESSION_POOLER_HOST);
  if (!hostResult.ok || hostResult.fingerprintSha256 !== SESSION_POOLER_HOST_FINGERPRINT_SHA256) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH' };
  }
  const projectRef = input.target.projectRef ?? PAIR_P5_APPROVED_PREVIEW_PROJECT_REF;
  if (expectedConnectionUserForProjectRef(projectRef) === EXPECTED_CURRENT_USER) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_TARGET_IDENTITY_MISMATCH' };
  }
  if (input.repository.branch !== PAIR_P5_EXPECTED_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_REPO_IDENTITY_MISMATCH' };
  }
  if (PAIR_P5_STATIC_EXECUTION_GATE.executionAuthorized !== false) {
    return { ok: false, holdReasonCode: 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED' };
  }
  const dedicatedConnectionIntent = {
    dedicatedPairStepId: PAIR_P5_CHECKOUT_STEP_ID,
    migrationVersion: PAIR_P5_CHECKOUT_MIGRATION_VERSION,
    repositoryBranch: input.repository.branch,
    repositoryHeadCommitSha: input.repository.headCommitSha,
    previewOrganization: input.target.organization,
    previewProject: input.target.project,
    previewProjectRef: projectRef,
    credentialMethod: PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
    sessionPoolerHost: SESSION_POOLER_HOST,
    hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  };
  return {
    ok: true,
    structuralOfflineChecksPassed: true,
    dedicatedConnectionIntent,
    credentialMethod: PAIR_P5_DEDICATED_RECEIPT_CREDENTIAL_METHOD,
    legacyTargetBindingReceiptIssuable: false,
    independentRemoteObservationsRequired: true,
  };
}
