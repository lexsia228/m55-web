import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ExternalReviewedCandidateBinding, R7DeltaStepId } from './r7D1D5OfflinePlan.ts';
import {
  R7_PREVIEW_TARGET_PROJECT,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import type { R7RuntimeProbeId } from './r7D1D5RuntimeProbes.ts';

/** Exact six-file D1–D5 local execution candidate bundle (paths only; digests supplied externally). */
export const R7_D1_D5_EXECUTION_CANDIDATE_BUNDLE_PATHS: readonly string[] = [
  'docs/planning/r7-preview-delta/M55_R7_D1_D5_RUNTIME_PROBES_V1.sql',
  'lib/m55/previewRemoteApply/r7D1D5RuntimeProbes.ts',
  'lib/m55/previewRemoteApply/r7D1D5RemoteExecution.ts',
  'lib/m55/previewRemoteApply/r7D1D5ExecutionAuthorization.ts',
  'scripts/m55/runR7PreviewD1D5RemoteExecution.ts',
  'lib/m55/previewRemoteApply/r7D1D5RemoteExecution.local.test.ts',
] as const;

export const R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID =
  'M55_R7_D1_D5_HUMAN_EXECUTION_AUTHORIZATION_V1' as const;

export type R7HumanExecutionAuthorizationDocument = {
  readonly documentId: typeof R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID;
  readonly authorizedStepId: R7DeltaStepId;
  readonly candidateCommitSha: string;
  readonly repositoryRoot: typeof R7_PR249_FROZEN_REPO_ROOT;
  readonly branch: typeof R7_PR249_FROZEN_BRANCH;
  readonly previewProject: typeof R7_PREVIEW_TARGET_PROJECT;
  readonly previewProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly sourceSha256: string;
  readonly normalizedStreamCompositeSha256: string;
  readonly preProbeId: R7RuntimeProbeId;
  readonly postProbeId: R7RuntimeProbeId;
  readonly expectedPriorHistoryVersionTail: string;
  readonly executionAuthorized: true;
};

export type R7ExecutionAuthorizationHoldCode =
  | 'HOLD_MISSING_REVIEWED_CANDIDATE_BINDING'
  | 'HOLD_CANDIDATE_BINDING_MISMATCH'
  | 'HOLD_CANDIDATE_BUNDLE_PATH_UNEXPECTED'
  | 'HOLD_CANDIDATE_BUNDLE_DIGEST_MISMATCH'
  | 'HOLD_MISSING_HUMAN_EXECUTION_AUTHORIZATION'
  | 'HOLD_HUMAN_AUTHORIZATION_STEP_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_REPO_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_PREVIEW_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_SOURCE_IDENTITY_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_PROBE_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_HISTORY_MISMATCH'
  | 'HOLD_HUMAN_AUTHORIZATION_NOT_EXPLICITLY_TRUE'
  | 'HOLD_HUMAN_AUTHORIZATION_DOCUMENT_ID_MISMATCH'
  | 'HOLD_MANIFEST_AUTHORIZATION_INFERENCE_FORBIDDEN';

export type R7ExecutionAuthorizationGateInput = {
  readonly repoRoot: string;
  readonly selectedStepId: R7DeltaStepId;
  readonly repositoryRoot: string;
  readonly branch: string;
  readonly headCommitSha: string;
  readonly reviewedCandidateBinding: ExternalReviewedCandidateBinding | null;
  readonly humanAuthorization: R7HumanExecutionAuthorizationDocument | null;
  readonly sourceSha256: string;
  readonly normalizedStreamCompositeSha256: string;
  readonly preProbeId: R7RuntimeProbeId;
  readonly postProbeId: R7RuntimeProbeId;
  readonly expectedPriorHistoryVersionTail: string;
  readonly offlineManifestExecutionAuthorized: boolean;
};

export type R7ExecutionAuthorizationGateResult =
  | { readonly ok: true; readonly binding: ExternalReviewedCandidateBinding; readonly authorization: R7HumanExecutionAuthorizationDocument }
  | { readonly ok: false; readonly holdReasonCode: R7ExecutionAuthorizationHoldCode };

function isHexSha40(s: string): boolean {
  return /^[0-9a-f]{40}$/.test(s);
}

function isHexSha256(s: string): boolean {
  return /^[0-9a-f]{64}$/.test(s);
}

function sha256File(repoRoot: string, relativePath: string): string {
  const bytes = readFileSync(join(repoRoot, relativePath));
  return createHash('sha256').update(bytes).digest('hex');
}

export function validateReviewedCandidateBundleDigests(
  repoRoot: string,
  binding: ExternalReviewedCandidateBinding,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: R7ExecutionAuthorizationHoldCode } {
  const expectedPaths = [...R7_D1_D5_EXECUTION_CANDIDATE_BUNDLE_PATHS].sort();
  const providedPaths = Object.keys(binding.fileSha256ByRelativePath).sort();
  if (expectedPaths.length !== providedPaths.length) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BUNDLE_PATH_UNEXPECTED' };
  }
  for (let i = 0; i < expectedPaths.length; i++) {
    if (expectedPaths[i] !== providedPaths[i]) {
      return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BUNDLE_PATH_UNEXPECTED' };
    }
  }
  for (const relativePath of expectedPaths) {
    const expectedDigest = binding.fileSha256ByRelativePath[relativePath];
    if (!expectedDigest || !isHexSha256(expectedDigest)) {
      return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BUNDLE_DIGEST_MISMATCH' };
    }
    const observed = sha256File(repoRoot, relativePath);
    if (observed !== expectedDigest) {
      return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BUNDLE_DIGEST_MISMATCH' };
    }
  }
  return { ok: true };
}

export function validateReviewedCandidateBinding(
  binding: ExternalReviewedCandidateBinding | null,
  headCommitSha: string,
):
  | { readonly ok: true; readonly binding: ExternalReviewedCandidateBinding }
  | { readonly ok: false; readonly holdReasonCode: R7ExecutionAuthorizationHoldCode } {
  if (!binding) {
    return { ok: false, holdReasonCode: 'HOLD_MISSING_REVIEWED_CANDIDATE_BINDING' };
  }
  if (!isHexSha40(binding.candidateCommitSha) || binding.candidateCommitSha !== headCommitSha) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BINDING_MISMATCH' };
  }
  if (binding.branch !== R7_PR249_FROZEN_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BINDING_MISMATCH' };
  }
  return { ok: true, binding };
}

export function validateR7ExecutionAuthorizationGate(
  input: R7ExecutionAuthorizationGateInput,
): R7ExecutionAuthorizationGateResult {
  if (input.offlineManifestExecutionAuthorized) {
    return { ok: false, holdReasonCode: 'HOLD_MANIFEST_AUTHORIZATION_INFERENCE_FORBIDDEN' };
  }
  if (input.repositoryRoot !== R7_PR249_FROZEN_REPO_ROOT || input.branch !== R7_PR249_FROZEN_BRANCH) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_REPO_MISMATCH' };
  }

  const bindingCheck = validateReviewedCandidateBinding(input.reviewedCandidateBinding, input.headCommitSha);
  if (!bindingCheck.ok) return bindingCheck;
  const binding = bindingCheck.binding;

  const bundleDigestCheck = validateReviewedCandidateBundleDigests(input.repoRoot, binding);
  if (!bundleDigestCheck.ok) {
    return { ok: false, holdReasonCode: bundleDigestCheck.holdReasonCode };
  }

  const auth = input.humanAuthorization;
  if (!auth) {
    return { ok: false, holdReasonCode: 'HOLD_MISSING_HUMAN_EXECUTION_AUTHORIZATION' };
  }
  if (auth.documentId !== R7_HUMAN_EXECUTION_AUTHORIZATION_DOCUMENT_ID) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_DOCUMENT_ID_MISMATCH' };
  }
  if (auth.executionAuthorized !== true) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_NOT_EXPLICITLY_TRUE' };
  }
  if (auth.authorizedStepId !== input.selectedStepId) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_STEP_MISMATCH' };
  }
  if (auth.candidateCommitSha !== binding.candidateCommitSha) {
    return { ok: false, holdReasonCode: 'HOLD_CANDIDATE_BINDING_MISMATCH' };
  }
  if (
    auth.repositoryRoot !== R7_PR249_FROZEN_REPO_ROOT ||
    auth.branch !== R7_PR249_FROZEN_BRANCH ||
    auth.previewProject !== R7_PREVIEW_TARGET_PROJECT ||
    auth.previewProjectRef !== R7_PREVIEW_TARGET_PROJECT_REF
  ) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_PREVIEW_MISMATCH' };
  }
  if (
    auth.sourceSha256 !== input.sourceSha256 ||
    auth.normalizedStreamCompositeSha256 !== input.normalizedStreamCompositeSha256
  ) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_SOURCE_IDENTITY_MISMATCH' };
  }
  if (auth.preProbeId !== input.preProbeId || auth.postProbeId !== input.postProbeId) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_PROBE_MISMATCH' };
  }
  if (auth.expectedPriorHistoryVersionTail !== input.expectedPriorHistoryVersionTail) {
    return { ok: false, holdReasonCode: 'HOLD_HUMAN_AUTHORIZATION_HISTORY_MISMATCH' };
  }

  return { ok: true, binding, authorization: auth };
}

export function buildExecutionCandidateBundleDigestsFromRepo(
  repoRoot: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const relativePath of R7_D1_D5_EXECUTION_CANDIDATE_BUNDLE_PATHS) {
    out[relativePath] = sha256File(repoRoot, relativePath);
  }
  return out;
}
