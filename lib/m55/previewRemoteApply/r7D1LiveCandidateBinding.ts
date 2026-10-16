import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { R7_PR249_FROZEN_BRANCH, R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';

export const R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID =
  'M55_R7_D1_LIVE_PG_AND_CATALOG_IMPLEMENTATION_CANDIDATE_V1' as const;

/** Committed feature HEAD on PR #249 — base only; does not include uncommitted six-file candidate bytes. */
export const R7_D1_FEATURE_BASE_COMMIT_SHA = '74d084ab11eae11fb5432d067f39bd818761ec45' as const;

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
  featureBaseCommitSha: string,
  independentlyReviewedManifest: R7D1LiveImplementationCandidateBinding | null,
): { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  if (repoRoot !== R7_PR249_FROZEN_REPO_ROOT || branch !== R7_PR249_FROZEN_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  if (featureBaseCommitSha !== R7_D1_FEATURE_BASE_COMMIT_SHA) {
    return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
  }
  const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(repoRoot, featureBaseCommitSha);
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
  return { ok: false, holdReasonCode: 'HOLD_AUTHORIZATION_GATE' };
}

export function assertR7D1LiveExecutionHumanAuthorizationPresent(
  _document: unknown,
): { readonly ok: false; readonly holdReasonCode: R7D1LiveImplementationBindingHoldCode } {
  return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
}
