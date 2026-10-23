import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  R7_PREVIEW_TARGET_PROJECT,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import { R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID } from './r7D1D5ExecutionAuthorization.ts';
import {
  R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256,
  R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
} from './r7D1ExactCatalogContract.ts';
import {
  R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE,
  verifyD1PinnedSourceAndNormalizedComposite,
} from './r7D1TrustedCatalogVerifier.ts';

export const R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID =
  'M55_R7_D1_LIVE_PG_AND_CATALOG_IMPLEMENTATION_CANDIDATE_V1' as const;

/** Registry WT-058 parent commit — historical anchor only; not required for workspace digest observation. */
export const R7_D1_FEATURE_BASE_COMMIT_SHA = '74d084ab11eae11fb5432d067f39bd818761ec45' as const;

/** Commit where an independent reviewer recorded the published six-file digest manifest (metadata only). */
export const R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA =
  '206ee0d7750c17cc36a797a96fb7eb73efccb8e4' as const;

/** Reviewer-published six-file SHA-256 table at `R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA` — not self-referential workspace proof. */
export const R7_D1_INDEPENDENTLY_REVIEWED_SIX_FILE_DIGESTS: Readonly<Record<string, string>> = {
  'lib/m55/previewRemoteApply/r7D1D5LiveBridge.ts':
    '4727922a681919d53112f3769b1c12d26f505cc594c980562c66a2cda0cea724',
  'lib/m55/previewRemoteApply/r7D1D5LiveBridge.local.test.ts':
    'c6a3417b64e0f705e8c39890af9ac978127ae4c03e44496f2d836b2bb24f3b75',
  'lib/m55/previewRemoteApply/r7D1RealPgAdapter.ts':
    '82d2bf3d60b9cc06b1f03805166e36948db1dbd7d8577a0b7d88f72eef543e40',
  'lib/m55/previewRemoteApply/r7D1TrustedCatalogVerifier.ts':
    '92dde0571c148ca207bb52e0628ab5130e923eb39f54e1300869e5f27fe14b6e',
  'lib/m55/previewRemoteApply/r7D1LiveCandidateBinding.ts':
    'a7406e6d9c4f5001079ff6337e7bc5a260c7decc635be2ea4ea90e46c046c7fa',
  'lib/m55/previewRemoteApply/r7D1LivePgAndCatalog.local.test.ts':
    'f151f652911ff9815f8214171ec8d911a9d583b888840e1bd770b370d5cdeeaf',
};

export const R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256 =
  '4bdf49171dfe2f833abebebfe92cb2e10eb912b08b6d725af8c39bf1c6759402' as const;

/** Post-patch workspace digest is not frozen — independent review must publish a new manifest (EXR-05). */
export const R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN = true as const;

/** Human-published external review attestation digest — format-only caller values are UNVERIFIED until set. */
export const R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256: string | null = null;

/** Historical 206ee0d7 reviewer snapshot — lacks live execution attestation; alignment-only reference. */
export function buildHistoricalExternalReviewManifestSnapshot206ee0d7(): R7D1LiveImplementationCandidateBinding {
  return {
    bundleId: R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
    declaredCandidateIdentitySha256: R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256,
    repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    fileSha256ByRelativePath: R7_D1_INDEPENDENTLY_REVIEWED_SIX_FILE_DIGESTS,
  };
}

export const R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS: readonly string[] = [
  'lib/m55/previewRemoteApply/r7D1D5LiveBridge.ts',
  'lib/m55/previewRemoteApply/r7D1D5LiveBridge.local.test.ts',
  'lib/m55/previewRemoteApply/r7D1RealPgAdapter.ts',
  'lib/m55/previewRemoteApply/r7D1TrustedCatalogVerifier.ts',
  'lib/m55/previewRemoteApply/r7D1LiveCandidateBinding.ts',
  'lib/m55/previewRemoteApply/r7D1LivePgAndCatalog.local.test.ts',
] as const;

export type R7D1LiveImplementationCandidateBinding = {
  readonly bundleId: typeof R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID;
  /** Deterministic checksum of sorted six-file digests — workspace alignment only, not reviewer provenance. */
  readonly declaredCandidateIdentitySha256: string;
  readonly repositoryRoot: typeof R7_PR249_FROZEN_REPO_ROOT;
  readonly branch: typeof R7_PR249_FROZEN_BRANCH;
  readonly fileSha256ByRelativePath: Readonly<Record<string, string>>;
  /** Externally issued attestation digest — never derived from workspace bytes alone (EXR-05). */
  readonly externalIndependentReviewAttestationSha256?: string;
};

export type R7D1LiveImplementationBindingHoldCode =
  | 'HOLD_REPO_IDENTITY_MISMATCH'
  | 'HOLD_AUTHORIZATION_GATE'
  | 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED'
  | 'HOLD_CANDIDATE_MANIFEST_MISMATCH';

export type R7D1WorkspaceSixFileDigestObservation = {
  readonly repositoryRoot: string;
  readonly observedAtFeatureBaseCommitSha: string;
  readonly fileSha256ByRelativePath: Readonly<Record<string, string>>;
};

function sha256FormatValid(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function gitCommitShaFormatValid(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function resolveContainedRepoFilePath(repoRoot: string, relativePath: string): string | null {
  if (relativePath.includes('..') || relativePath.startsWith('/')) {
    return null;
  }
  const repoReal = resolve(repoRoot);
  const absolute = resolve(repoReal, relativePath);
  if (!absolute.startsWith(`${repoReal}/`) && absolute !== repoReal) {
    return null;
  }
  try {
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return null;
    }
    if (!stat.isFile()) {
      return null;
    }
  } catch {
    return null;
  }
  return absolute;
}

export function observeR7D1LiveImplementationWorkspaceSixFileDigests(
  repoRoot: string,
  featureBaseCommitSha: string,
): { readonly ok: true; readonly observation: R7D1WorkspaceSixFileDigestObservation } | { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  if (repoRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    return { ok: false, holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  if (!gitCommitShaFormatValid(featureBaseCommitSha)) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  const fileSha256ByRelativePath: Record<string, string> = {};
  for (const relativePath of R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS) {
    const absolute = resolveContainedRepoFilePath(repoRoot, relativePath);
    if (!absolute) {
      return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
    }
    const bytes = readFileSync(absolute);
    fileSha256ByRelativePath[relativePath] = createHash('sha256').update(bytes).digest('hex');
  }
  return {
    ok: true,
    observation: {
      repositoryRoot: repoRoot,
      observedAtFeatureBaseCommitSha: featureBaseCommitSha,
      fileSha256ByRelativePath,
    },
  };
}

export function deriveDeterministicSixFileManifestIdentitySha256(
  fileSha256ByRelativePath: Readonly<Record<string, string>>,
): string | null {
  if (!manifestKeysetExact(fileSha256ByRelativePath)) {
    return null;
  }
  const lines = R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS.map(
    (relativePath) => `${relativePath}=${fileSha256ByRelativePath[relativePath]}`,
  );
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

function manifestKeysetExact(manifest: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(manifest).sort();
  const expected = [...R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS].sort();
  if (keys.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    if (keys[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

export function diffWorkspaceObservationAgainstIndependentlyReviewedManifest(
  observation: R7D1WorkspaceSixFileDigestObservation,
  independentlyReviewedManifest: R7D1LiveImplementationCandidateBinding | null,
): { readonly ok: true; readonly manifestMatchesWorkspace: true } | { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  if (!independentlyReviewedManifest) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  if (independentlyReviewedManifest.bundleId !== R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  if (
    independentlyReviewedManifest.repositoryRoot !== R7_PR249_FROZEN_REPO_ROOT ||
    independentlyReviewedManifest.branch !== R7_PR249_FROZEN_BRANCH
  ) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  if (!sha256FormatValid(independentlyReviewedManifest.declaredCandidateIdentitySha256)) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  const derivedIdentity = deriveDeterministicSixFileManifestIdentitySha256(
    independentlyReviewedManifest.fileSha256ByRelativePath,
  );
  if (
    !derivedIdentity ||
    derivedIdentity !== independentlyReviewedManifest.declaredCandidateIdentitySha256
  ) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_MANIFEST_MISMATCH' };
  }
  if (!manifestKeysetExact(independentlyReviewedManifest.fileSha256ByRelativePath)) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_MANIFEST_MISMATCH' };
  }
  const attestation = independentlyReviewedManifest.externalIndependentReviewAttestationSha256;
  if (!attestation || !sha256FormatValid(attestation)) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  if (R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256 === null) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  if (attestation !== R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  for (const relativePath of R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS) {
    const manifestDigest = independentlyReviewedManifest.fileSha256ByRelativePath[relativePath];
    const observedDigest = observation.fileSha256ByRelativePath[relativePath];
    if (!manifestDigest || !sha256FormatValid(manifestDigest) || !observedDigest) {
      return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_MANIFEST_MISMATCH' };
    }
    if (manifestDigest !== observedDigest) {
      return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_MANIFEST_MISMATCH' };
    }
  }
  return { ok: true, manifestMatchesWorkspace: true };
}

/** Never authorizes live execution — manifest/workspace alignment observation only. */
export function validateR7D1LiveImplementationCandidateBinding(
  repoRoot: string,
  branch: string,
  observedAtCommitSha: string,
  independentlyReviewedManifest: R7D1LiveImplementationCandidateBinding | null,
): { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  if (repoRoot !== R7_PR249_FROZEN_REPO_ROOT || branch !== R7_PR249_FROZEN_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  if (!gitCommitShaFormatValid(observedAtCommitSha)) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(repoRoot, observedAtCommitSha);
  if (!observed.ok) {
    return observed;
  }
  const diff = diffWorkspaceObservationAgainstIndependentlyReviewedManifest(
    observed.observation,
    independentlyReviewedManifest,
  );
  if (!diff.ok) {
    return diff;
  }
  return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
}

export function assertR7D1LiveExecutionHumanAuthorizationPresent(
  _document: unknown,
): { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
}

/** Human GO for Preview apply / live PG connect is separate — never implied by prep observation. */
export const R7_D1_PREVIEW_D1_APPLY_NOT_AUTHORIZED_IN_CODE_ONLY_PREP = true as const;

export type R7D1PreviewExecutionPrepHoldCode = 'HOLD_PREVIEW_EXECUTION_NOT_AUTHORIZED';

export type R7D1CandidateDigestDeltaRow = {
  readonly relativePath: string;
  readonly observedSha256: string;
  readonly historicalReviewSha256: string | null;
  readonly matchesHistoricalReview: boolean;
};

/** Local workspace observation — not third-party review attestation. */
export type R7D1CurrentCandidateLocalObservation = {
  readonly label: 'LOCAL_WORKSPACE_OBSERVATION_PENDING_INDEPENDENT_REVIEW';
  readonly repositoryRoot: typeof R7_PR249_FROZEN_REPO_ROOT;
  readonly branch: typeof R7_PR249_FROZEN_BRANCH;
  readonly observedAtCommitSha: string;
  readonly fileSha256ByRelativePath: Readonly<Record<string, string>>;
  readonly manifestIdentitySha256: string | null;
  readonly digestDeltasAgainstHistoricalReview206ee0d7: readonly R7D1CandidateDigestDeltaRow[];
  readonly allPathsMatchHistoricalReview206ee0d7: boolean;
  readonly historicalReviewAnchorCommitSha: typeof R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA;
};

export type R7D1PreviewExecutionCodeOnlyPrepResult = {
  readonly prepObservationComplete: true;
  readonly previewD1ApplyAuthorized: false;
  readonly holdReasonCode: R7D1PreviewExecutionPrepHoldCode;
  readonly candidateLocalObservation: R7D1CurrentCandidateLocalObservation;
  readonly pinnedMigrationSourceSha256: typeof R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256;
  readonly pinnedNormalizedStatementStreamSha256: typeof R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256;
  readonly pinnedD1SourceIntegrityOk: boolean;
  readonly previewTargetProject: typeof R7_PREVIEW_TARGET_PROJECT;
  readonly previewTargetProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly executionGatesClosed: true;
  readonly realPgProvenanceEstablished: false;
  readonly postPatchCandidateDigestNotExternallyFrozen: true;
  readonly externalIndependentReviewAttestationSha256: null;
  readonly humanExecutionAuthorizationDocumentId: typeof R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID;
  readonly humanExecutionAuthorizationIssuedByThisPrep: false;
};

export function summarizeCandidateDigestDeltasAgainstHistoricalReview(
  observation: R7D1WorkspaceSixFileDigestObservation,
): readonly R7D1CandidateDigestDeltaRow[] {
  return R7_D1_LIVE_IMPLEMENTATION_SIX_FILE_DIGEST_PATHS.map((relativePath) => {
    const observedSha256 = observation.fileSha256ByRelativePath[relativePath] ?? '';
    const historicalReviewSha256 = R7_D1_INDEPENDENTLY_REVIEWED_SIX_FILE_DIGESTS[relativePath] ?? null;
    const matchesHistoricalReview =
      historicalReviewSha256 !== null && observedSha256 === historicalReviewSha256;
    return {
      relativePath,
      observedSha256,
      historicalReviewSha256,
      matchesHistoricalReview,
    };
  });
}

export function buildR7D1CurrentWorkspaceCandidateLocalObservation(
  repoRoot: string,
  observedAtCommitSha: string,
):
  | { readonly ok: true; readonly observation: R7D1CurrentCandidateLocalObservation }
  | { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(repoRoot, observedAtCommitSha);
  if (!observed.ok) {
    return observed;
  }
  const digestDeltas = summarizeCandidateDigestDeltasAgainstHistoricalReview(observed.observation);
  const allPathsMatchHistoricalReview206ee0d7 = digestDeltas.every((row) => row.matchesHistoricalReview);
  return {
    ok: true,
    observation: {
      label: 'LOCAL_WORKSPACE_OBSERVATION_PENDING_INDEPENDENT_REVIEW',
      repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      observedAtCommitSha,
      fileSha256ByRelativePath: observed.observation.fileSha256ByRelativePath,
      manifestIdentitySha256: deriveDeterministicSixFileManifestIdentitySha256(
        observed.observation.fileSha256ByRelativePath,
      ),
      digestDeltasAgainstHistoricalReview206ee0d7: digestDeltas,
      allPathsMatchHistoricalReview206ee0d7,
      historicalReviewAnchorCommitSha: R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA,
    },
  };
}

/**
 * CODE-ONLY Preview execution preparation — observes candidate bytes and D1 pin integrity only.
 * Does not connect to Preview DB, issue Human execution authorization, or enable live gates.
 */
export function evaluateR7D1PreviewExecutionCodeOnlyPrep(
  repoRoot: string,
  observedAtCommitSha: string,
  gateObservation: {
    readonly remoteExecutionAuthorized: boolean;
    readonly cliLiveTransportForbidden: boolean;
    readonly localCodeOnlyPublicExecutorForbidden: boolean;
  },
): R7D1PreviewExecutionCodeOnlyPrepResult | { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  const local = buildR7D1CurrentWorkspaceCandidateLocalObservation(repoRoot, observedAtCommitSha);
  if (!local.ok) {
    return local;
  }
  const pinned = verifyD1PinnedSourceAndNormalizedComposite(repoRoot);
  const gatesClosed =
    gateObservation.remoteExecutionAuthorized === false &&
    gateObservation.cliLiveTransportForbidden === true &&
    gateObservation.localCodeOnlyPublicExecutorForbidden === true &&
    R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE === true &&
    R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION === false &&
    R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN === true &&
    R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256 === null &&
    R7_D1_PREVIEW_D1_APPLY_NOT_AUTHORIZED_IN_CODE_ONLY_PREP === true;
  if (!gatesClosed || !pinned.ok) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  return {
    prepObservationComplete: true,
    previewD1ApplyAuthorized: false,
    holdReasonCode: 'HOLD_PREVIEW_EXECUTION_NOT_AUTHORIZED',
    candidateLocalObservation: local.observation,
    pinnedMigrationSourceSha256: R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256,
    pinnedNormalizedStatementStreamSha256: R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256,
    pinnedD1SourceIntegrityOk: true,
    previewTargetProject: R7_PREVIEW_TARGET_PROJECT,
    previewTargetProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
    executionGatesClosed: true,
    realPgProvenanceEstablished: false,
    postPatchCandidateDigestNotExternallyFrozen: true,
    externalIndependentReviewAttestationSha256: null,
    humanExecutionAuthorizationDocumentId: R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID,
    humanExecutionAuthorizationIssuedByThisPrep: false,
  };
}
