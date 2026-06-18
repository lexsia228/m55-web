import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import {
  applyOptionARemoval,
  buildPolicy2HistoryPayload,
  compositeStreamSha256,
  STATEMENT_STREAM_SERIALIZATION,
  type Policy2HistoryPayload,
  type VersionLabel,
} from '../transactionNormalized/statementStream.ts';
import {
  EXPECTED_P8_VERSION_IDENTITY,
  EXPECTED_REVISION7_VERSION_IDENTITIES,
  loadAuthorityBundle,
  validateAuthorityBytes,
  validateMigrationSourceBytes,
  validateWorkspaceRepoRoot,
} from '../transactionNormalized/transactionNormalizedCore.ts';

import { HISTORY_BOOTSTRAP_SPEC } from './historyBootstrapSpec.ts';
import { getRuntimeProbeById, RUNTIME_PROBE_REGISTRY, validateRuntimeProbeRegistry } from './runtimeProbeRegistry.ts';
import { TIMEOUT_POLICY, validateTimeoutPolicyInvariants } from './timeoutPolicy.ts';
import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  buildP8NormalizedStatements,
  CREDENTIAL_METHOD_IDS,
  EXPECTED_BRANCH,
  EXPECTED_NORMALIZED_STATEMENT_COUNTS,
  EXPECTED_REPO_ROOT,
  FORBIDDEN_PRODUCTION_ORGANIZATION,
  FORBIDDEN_PRODUCTION_PROJECT,
  HISTORY_INSERT_SQL_METADATA,
  isP8StepId,
  P0_PREFLIGHT_PATCH2_AUTHORITY,
  P8_MIGRATION_SHA256,
  P8_NORMALIZED_STREAM_COMPOSITE_SHA256,
  P8_STEP_ID,
  REMOTE_BOOTSTRAP_OBSERVATION_STATUS,
  REPOSITORY_FACTS_SOURCE,
  sanitizePreviewRemoteApplyHoldCode,
  validateDedicatedP8StepSelection,
  type CredentialMethodId,
  type DeterministicPlanStep,
  type P1HistoryBootstrapObservedFacts,
  type Policy2HistoryFacts,
  type PreviewRemoteApplyHoldCode,
  type PreviewRemoteApplyPlanInput,
  type PreviewRemoteApplyPlanResult,
  type RepositoryIdentityFacts,
  type StepId,
  type TargetIdentityBinding,
  type TargetIdentityFacts,
} from './types.ts';

const STEP_ORDER: readonly StepId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function isCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

const EXECUTION_DISABLEMENT = {
  executionAuthorized: false as const,
  remoteConnectionAttempted: false as const,
  sqlExecuted: false as const,
  migrationApplyAuthorized: false as const,
  productionAccessAuthorized: false as const,
  automaticNextGate: false as const,
  transportCallCount: 0 as const,
};

export function parseMigrationFilename(path: string): { version: string; name: string } {
  const file = basename(path);
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  if (!match) {
    throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
  }
  return { version: match[1], name: match[2] };
}

export function evaluateP1HistoryBootstrapPrecondition(
  facts: P1HistoryBootstrapObservedFacts,
): PreviewRemoteApplyHoldCode | null {
  if (
    facts.classification === 'GREENFIELD_READY' &&
    facts.historySchemaExists === false &&
    facts.historyRelationExists === false &&
    facts.stopRequired === false
  ) {
    return null;
  }
  return 'HOLD_BOOTSTRAP_PRECONDITION';
}

export function buildHistoryPayloadForStep(input: {
  stepId: StepId;
  version: string;
  name: string;
  normalizedStatements: readonly string[];
  expectedNormalizedCompositeSha256: string;
}): Policy2HistoryPayload {
  if (!Array.isArray(input.normalizedStatements) || input.normalizedStatements.length === 0) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }

  const identity =
    input.stepId === P8_STEP_ID
      ? EXPECTED_P8_VERSION_IDENTITY
      : EXPECTED_REVISION7_VERSION_IDENTITIES.find((entry) => entry.label === input.stepId);
  if (!identity) {
    throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
  }
  if (input.version !== identity.version || input.name !== identity.name) {
    throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
  }
  if (input.normalizedStatements.length !== EXPECTED_NORMALIZED_STATEMENT_COUNTS[input.stepId]) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }

  return buildPolicy2HistoryPayload({
    version: input.version,
    name: input.name,
    normalizedStatements: input.normalizedStatements,
    expectedNormalizedCompositeSha256: input.expectedNormalizedCompositeSha256,
  });
}

function toPolicy2HistoryFacts(payload: Policy2HistoryPayload): Policy2HistoryFacts {
  return {
    version: payload.version,
    name: payload.name,
    statementCount: payload.statements.length,
    normalizedStreamCompositeSha256: payload.normalizedStreamCompositeSha256,
    serialization: STATEMENT_STREAM_SERIALIZATION,
    parameterizedInsertShape: HISTORY_INSERT_SQL_METADATA,
  };
}

export function validateRepositoryIdentityFacts(
  repoRoot: string,
  repository: RepositoryIdentityFacts,
): PreviewRemoteApplyHoldCode | null {
  if (repository.repoRoot !== repoRoot) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (repoRoot !== EXPECTED_REPO_ROOT) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (repository.branch !== EXPECTED_BRANCH) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (!isCommitSha(repository.headCommitSha)) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (!isCommitSha(repository.treeSha)) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (repository.trackedWorktreeClean !== true) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (repository.indexEmpty !== true) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  if (repository.factsSource !== REPOSITORY_FACTS_SOURCE) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  return null;
}

export function validateTargetIdentityFacts(target: TargetIdentityFacts): PreviewRemoteApplyHoldCode | null {
  if (
    target.organization === FORBIDDEN_PRODUCTION_ORGANIZATION ||
    target.project === FORBIDDEN_PRODUCTION_PROJECT
  ) {
    return 'HOLD_TARGET_PRODUCTION_FORBIDDEN';
  }
  if (
    target.organization !== APPROVED_PREVIEW_ORGANIZATION ||
    target.project !== APPROVED_PREVIEW_PROJECT ||
    target.databaseTier !== APPROVED_PREVIEW_DATABASE_TIER
  ) {
    return 'HOLD_TARGET_IDENTITY_MISMATCH';
  }
  if (!target.projectRef || target.projectRef.trim().length === 0) {
    return 'HOLD_TARGET_FINGERPRINT_INCOMPLETE';
  }
  if (!target.hostFingerprintSha256 || !isSha256Hex(target.hostFingerprintSha256)) {
    return 'HOLD_TARGET_FINGERPRINT_INCOMPLETE';
  }
  return null;
}

function validateCredentialMethod(method: CredentialMethodId): PreviewRemoteApplyHoldCode | null {
  if (!CREDENTIAL_METHOD_IDS.includes(method)) {
    return 'HOLD_CREDENTIAL_METHOD_INVALID';
  }
  return null;
}

function buildHoldResult(holdReasonCode: PreviewRemoteApplyHoldCode): PreviewRemoteApplyPlanResult {
  return {
    mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD',
    holdReasonCode,
    ...EXECUTION_DISABLEMENT,
  };
}

function buildTargetBinding(
  target: TargetIdentityFacts,
  credentialMethod: CredentialMethodId,
): TargetIdentityBinding {
  return {
    organization: target.organization,
    project: target.project,
    databaseTier: target.databaseTier,
    projectRef: target.projectRef as string,
    hostFingerprintSha256: target.hostFingerprintSha256 as string,
    credentialMethod,
  };
}

function buildNormalizedStatements(
  repoRoot: string,
  label: VersionLabel | StepId,
  path: string,
  expectedSha256: string,
  expectedCompositeSha256: string,
): readonly string[] {
  if (isP8StepId(label as StepId)) {
    const statements = buildP8NormalizedStatements(repoRoot);
    if (expectedSha256 !== P8_MIGRATION_SHA256) {
      throw new Error('HOLD_MIGRATION_IDENTITY_MISMATCH');
    }
    if (expectedCompositeSha256 !== P8_NORMALIZED_STREAM_COMPOSITE_SHA256) {
      throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
    }
    return statements;
  }
  const rawBytes = readFileSync(join(repoRoot, path));
  validateMigrationSourceBytes(rawBytes, expectedSha256, label as VersionLabel);
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  const { normalized } = applyOptionARemoval(label as VersionLabel, statements);
  if (normalized.length !== EXPECTED_NORMALIZED_STATEMENT_COUNTS[label as StepId]) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  const composite = compositeStreamSha256(normalized);
  if (composite !== expectedCompositeSha256) {
    throw new Error('HOLD_NORMALIZED_STREAM_MISMATCH');
  }
  return normalized;
}

function buildDedicatedP8PlanStep(
  input: PreviewRemoteApplyPlanInput,
  bundle: ReturnType<typeof loadAuthorityBundle>,
): DeterministicPlanStep | PreviewRemoteApplyPlanResult {
  const stepId = P8_STEP_ID;
  const identity = EXPECTED_P8_VERSION_IDENTITY;
  const contractVersion = bundle.contract.versions.find(
    (entry) => (entry as { label: string }).label === stepId,
  );
  if (!contractVersion) {
    return buildHoldResult('HOLD_AUTHORITY_IDENTITY_MISMATCH');
  }
  const parsed = parseMigrationFilename(identity.path);
  if (parsed.version !== identity.version || parsed.name !== identity.name) {
    return buildHoldResult('HOLD_MIGRATION_IDENTITY_MISMATCH');
  }
  const normalizedStatements = buildNormalizedStatements(
    input.repoRoot,
    stepId,
    identity.path,
    contractVersion.frozen_source_sha256,
    contractVersion.normalized_stream_composite_sha256,
  );
  const historyPayload = buildHistoryPayloadForStep({
    stepId,
    version: identity.version,
    name: identity.name,
    normalizedStatements,
    expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
  });
  const priorProbe = getRuntimeProbeById(`PRIOR_${stepId}`);
  const postProbe = getRuntimeProbeById(`POST_${stepId}`);
  if (!priorProbe || !postProbe || priorProbe.kind !== 'ORDINARY' || postProbe.kind !== 'ORDINARY') {
    return buildHoldResult('HOLD_RUNTIME_PROBE_REGISTRY');
  }
  const rawBytes = readFileSync(join(input.repoRoot, identity.path));
  return {
    stepId,
    phaseId: stepId,
    migration: {
      stepId,
      phaseId: stepId,
      version: identity.version,
      name: identity.name,
      path: identity.path,
      bytes: rawBytes.length,
      sha256: contractVersion.frozen_source_sha256,
    },
    normalizedStream: {
      stepId,
      statementCount: normalizedStatements.length,
      normalizedStreamCompositeSha256: historyPayload.normalizedStreamCompositeSha256,
      serialization: STATEMENT_STREAM_SERIALIZATION,
    },
    historyPayload: toPolicy2HistoryFacts(historyPayload),
    bootstrapSpecId: null,
    priorProbeId: priorProbe.id,
    postProbeId: postProbe.id,
  };
}

export function buildPreviewRemoteApplyPlan(
  input: PreviewRemoteApplyPlanInput,
): PreviewRemoteApplyPlanResult {
  try {
    if (input.executionEnablement !== false) {
      return buildHoldResult('HOLD_EXECUTION_NOT_AUTHORIZED');
    }

    const repoHold = validateRepositoryIdentityFacts(input.repoRoot, input.repository);
    if (repoHold) {
      return buildHoldResult(repoHold);
    }

    validateWorkspaceRepoRoot(input.repoRoot);

    const credentialHold = validateCredentialMethod(input.credentialMethod);
    if (credentialHold) {
      return buildHoldResult(credentialHold);
    }

    const targetHold = validateTargetIdentityFacts(input.target);
    if (targetHold) {
      return buildHoldResult(targetHold);
    }

    validateAuthorityBytes(input.repoRoot);
    validateTimeoutPolicyInvariants();
    validateRuntimeProbeRegistry();
    const bundle = loadAuthorityBundle(input.repoRoot);

    if (input.dedicatedStepId === P8_STEP_ID) {
      const dedicated = buildDedicatedP8PlanStep(input, bundle);
      if ('mode' in dedicated) {
        return dedicated;
      }
      return {
        mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN',
        holdReasonCode: null,
        repository: input.repository,
        target: buildTargetBinding(input.target, input.credentialMethod),
        bootstrapPrecondition: {
          requiredPreconditionIdentifier: HISTORY_BOOTSTRAP_SPEC.strictPrecondition,
          remoteObservationStatus: REMOTE_BOOTSTRAP_OBSERVATION_STATUS,
          p0PreflightAuthority: P0_PREFLIGHT_PATCH2_AUTHORITY,
        },
        bootstrapSpecId: HISTORY_BOOTSTRAP_SPEC.identifier,
        bootstrapSpecCanonicalPayloadSha256: HISTORY_BOOTSTRAP_SPEC.canonical_payload_sha256,
        timeoutPolicyId: TIMEOUT_POLICY.identifier,
        timeoutPolicyCanonicalPayloadSha256: TIMEOUT_POLICY.canonical_payload_sha256,
        runtimeProbeRegistryId: RUNTIME_PROBE_REGISTRY.identifier,
        runtimeProbeRegistryCanonicalPayloadSha256: RUNTIME_PROBE_REGISTRY.canonical_payload_sha256,
        steps: [dedicated],
        ...EXECUTION_DISABLEMENT,
      };
    }

    const steps: DeterministicPlanStep[] = [];

    for (const stepId of STEP_ORDER) {
      const identity = EXPECTED_REVISION7_VERSION_IDENTITIES.find((entry) => entry.label === stepId);
      if (!identity) {
        return buildHoldResult('HOLD_MIGRATION_IDENTITY_MISMATCH');
      }

      const contractVersion = bundle.contract.versions.find((entry) => entry.label === stepId);
      if (!contractVersion) {
        return buildHoldResult('HOLD_AUTHORITY_IDENTITY_MISMATCH');
      }

      const parsed = parseMigrationFilename(identity.path);
      if (parsed.version !== identity.version || parsed.name !== identity.name) {
        return buildHoldResult('HOLD_MIGRATION_IDENTITY_MISMATCH');
      }

      const normalizedStatements = buildNormalizedStatements(
        input.repoRoot,
        stepId,
        identity.path,
        contractVersion.frozen_source_sha256,
        contractVersion.normalized_stream_composite_sha256,
      );

      const historyPayload = buildHistoryPayloadForStep({
        stepId,
        version: identity.version,
        name: identity.name,
        normalizedStatements,
        expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
      });

      const priorProbe = getRuntimeProbeById(`PRIOR_${stepId}`);
      const postProbe = getRuntimeProbeById(`POST_${stepId}`);
      if (!priorProbe || !postProbe || priorProbe.kind !== 'ORDINARY' || postProbe.kind !== 'ORDINARY') {
        return buildHoldResult('HOLD_RUNTIME_PROBE_REGISTRY');
      }

      const rawBytes = readFileSync(join(input.repoRoot, identity.path));
      steps.push({
        stepId,
        phaseId: stepId,
        migration: {
          stepId,
          phaseId: stepId,
          version: identity.version,
          name: identity.name,
          path: identity.path,
          bytes: rawBytes.length,
          sha256: contractVersion.frozen_source_sha256,
        },
        normalizedStream: {
          stepId,
          statementCount: normalizedStatements.length,
          normalizedStreamCompositeSha256: historyPayload.normalizedStreamCompositeSha256,
          serialization: STATEMENT_STREAM_SERIALIZATION,
        },
        historyPayload: toPolicy2HistoryFacts(historyPayload),
        bootstrapSpecId: stepId === 'P1' ? HISTORY_BOOTSTRAP_SPEC.identifier : null,
        priorProbeId: priorProbe.id,
        postProbeId: postProbe.id,
      });
    }

    return {
      mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN',
      holdReasonCode: null,
      repository: input.repository,
      target: buildTargetBinding(input.target, input.credentialMethod),
      bootstrapPrecondition: {
        requiredPreconditionIdentifier: HISTORY_BOOTSTRAP_SPEC.strictPrecondition,
        remoteObservationStatus: REMOTE_BOOTSTRAP_OBSERVATION_STATUS,
        p0PreflightAuthority: P0_PREFLIGHT_PATCH2_AUTHORITY,
      },
      bootstrapSpecId: HISTORY_BOOTSTRAP_SPEC.identifier,
      bootstrapSpecCanonicalPayloadSha256: HISTORY_BOOTSTRAP_SPEC.canonical_payload_sha256,
      timeoutPolicyId: TIMEOUT_POLICY.identifier,
      timeoutPolicyCanonicalPayloadSha256: TIMEOUT_POLICY.canonical_payload_sha256,
      runtimeProbeRegistryId: RUNTIME_PROBE_REGISTRY.identifier,
      runtimeProbeRegistryCanonicalPayloadSha256: RUNTIME_PROBE_REGISTRY.canonical_payload_sha256,
      steps,
      ...EXECUTION_DISABLEMENT,
    };
  } catch (error) {
    if (error instanceof Error) {
      const mapped = sanitizePreviewRemoteApplyHoldCode(error.message);
      if (mapped !== 'HOLD_UNEXPECTED_INTERNAL') {
        return buildHoldResult(mapped);
      }
    }
    return buildHoldResult('HOLD_UNEXPECTED_INTERNAL');
  }
}

export type DedicatedP8PlanCliArgs = {
  readonly dedicatedStep: typeof P8_STEP_ID;
  readonly organization: string;
  readonly project: string;
  readonly databaseTier: string;
  readonly projectRef: string | null;
  readonly hostFingerprintSha256: string | null;
  readonly credentialMethod: CredentialMethodId;
};

export function parseDedicatedP8PlanCliArgs(
  argv: string[],
): DedicatedP8PlanCliArgs | { holdReasonCode: PreviewRemoteApplyHoldCode } {
  let dedicatedStep: string | null = null;
  let organization: string = APPROVED_PREVIEW_ORGANIZATION;
  let project: string = APPROVED_PREVIEW_PROJECT;
  let databaseTier: string = APPROVED_PREVIEW_DATABASE_TIER;
  let projectRef: string | null = null;
  let hostFingerprintSha256: string | null = null;
  let credentialMethod: CredentialMethodId = 'SECURE_STDIN_CONNECTION_CONFIG_v1';
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    if (seen.has(token)) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    seen.add(token);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    switch (token) {
      case '--dedicated-step':
        dedicatedStep = value;
        break;
      case '--organization':
        organization = value;
        break;
      case '--project':
        project = value;
        break;
      case '--database-tier':
        databaseTier = value;
        break;
      case '--project-ref':
        projectRef = value;
        break;
      case '--host-fingerprint-sha256':
        hostFingerprintSha256 = value;
        break;
      case '--credential-method':
        credentialMethod = value as CredentialMethodId;
        break;
      default:
        return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    index += 1;
  }
  const selection = validateDedicatedP8StepSelection(dedicatedStep);
  if (!selection.ok) {
    return { holdReasonCode: 'HOLD_EXECUTION_NOT_AUTHORIZED' };
  }
  if (!CREDENTIAL_METHOD_IDS.includes(credentialMethod)) {
    return { holdReasonCode: 'HOLD_CREDENTIAL_METHOD_INVALID' };
  }
  return {
    dedicatedStep: selection.stepId,
    organization,
    project,
    databaseTier,
    projectRef,
    hostFingerprintSha256,
    credentialMethod,
  };
}

export function runPreviewRemoteApplyDedicatedPlanCli(input: {
  readonly repoRoot: string;
  readonly repository: RepositoryIdentityFacts;
  readonly cli: DedicatedP8PlanCliArgs;
}): PreviewRemoteApplyPlanResult {
  return buildPreviewRemoteApplyPlan({
    repoRoot: input.repoRoot,
    repository: input.repository,
    target: {
      organization: input.cli.organization,
      project: input.cli.project,
      databaseTier: input.cli.databaseTier,
      projectRef: input.cli.projectRef,
      hostFingerprintSha256: input.cli.hostFingerprintSha256,
    },
    credentialMethod: input.cli.credentialMethod,
    executionEnablement: false,
    dedicatedStepId: input.cli.dedicatedStep,
  });
}
