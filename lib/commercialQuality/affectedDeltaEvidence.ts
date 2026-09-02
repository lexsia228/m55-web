/**
 * Affected-delta browser candidate evidence binding.
 * Extends existing candidate/provenance architecture for Wave 2 review packages.
 */
import { createHash } from 'node:crypto';

export const AFFECTED_DELTA_SCHEMA_VERSION = '1.0.0';

export type AffectedDeltaEvidence = {
  schemaVersion: typeof AFFECTED_DELTA_SCHEMA_VERSION;
  status: 'candidate';
  sourceCommit: string;
  workingTreeCandidateIdentity: string;
  affectedPathManifest: readonly string[];
  surfaceId: string;
  stateId: string;
  route: string;
  viewport: { width: number; height: number };
  environment: 'local' | 'preview' | 'production_read_only';
  browserIdentity: string;
  benchmarkRevision: string;
  implementerIdentity: string;
  independentAuditorIdentity: string | null;
  captureTimestamp: string;
  requiredEvidenceFacets: readonly string[];
  screenshotIdentity: string | null;
  screenshotSha256: string | null;
  knownLimitations: readonly string[];
  candidateVerdict: 'candidate_only';
};

export function workingTreeCandidateIdentity(
  sourceCommit: string,
  dirtyPaths: readonly { code: string; path: string }[],
): string {
  const payload = [
    sourceCommit,
    ...dirtyPaths.map((entry) => `${entry.code}:${entry.path}`).sort(),
  ].join('\n');
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function validateAffectedDeltaEvidence(
  evidence: Partial<AffectedDeltaEvidence>,
): string[] {
  const errors: string[] = [];
  const required: (keyof AffectedDeltaEvidence)[] = [
    'schemaVersion',
    'status',
    'sourceCommit',
    'workingTreeCandidateIdentity',
    'affectedPathManifest',
    'surfaceId',
    'stateId',
    'route',
    'viewport',
    'environment',
    'browserIdentity',
    'benchmarkRevision',
    'implementerIdentity',
    'captureTimestamp',
    'requiredEvidenceFacets',
    'knownLimitations',
    'candidateVerdict',
  ];

  for (const key of required) {
    if (evidence[key] === undefined || evidence[key] === null) {
      errors.push(`missing ${key}`);
    }
  }

  if (evidence.status !== 'candidate') {
    errors.push('status must be candidate');
  }
  if (evidence.candidateVerdict !== 'candidate_only') {
    errors.push('candidateVerdict must be candidate_only');
  }
  if (
    evidence.implementerIdentity &&
    evidence.independentAuditorIdentity &&
    evidence.implementerIdentity === evidence.independentAuditorIdentity
  ) {
    errors.push('implementer == independent auditor');
  }

  return errors;
}

export function buildAffectedDeltaEvidence(input: {
  sourceCommit: string;
  dirtyPaths: readonly { code: string; path: string }[];
  affectedPathManifest: readonly string[];
  surfaceId: string;
  stateId: string;
  route: string;
  viewport: { width: number; height: number };
  environment?: AffectedDeltaEvidence['environment'];
  browserIdentity: string;
  benchmarkRevision?: string;
  implementerIdentity?: string;
  independentAuditorIdentity?: string | null;
  requiredEvidenceFacets?: readonly string[];
  screenshotIdentity?: string | null;
  screenshotSha256?: string | null;
  knownLimitations?: readonly string[];
  now?: () => Date;
}): AffectedDeltaEvidence | { errors: string[] } {
  const evidence: AffectedDeltaEvidence = {
    schemaVersion: AFFECTED_DELTA_SCHEMA_VERSION,
    status: 'candidate',
    sourceCommit: input.sourceCommit,
    workingTreeCandidateIdentity: workingTreeCandidateIdentity(
      input.sourceCommit,
      input.dirtyPaths,
    ),
    affectedPathManifest: [...input.affectedPathManifest],
    surfaceId: input.surfaceId,
    stateId: input.stateId,
    route: input.route,
    viewport: input.viewport,
    environment: input.environment ?? 'local',
    browserIdentity: input.browserIdentity,
    benchmarkRevision: input.benchmarkRevision ?? 'docs/ssot/M55_UX_BENCHMARK_STACK.md',
    implementerIdentity: input.implementerIdentity ?? 'cursor',
    independentAuditorIdentity: input.independentAuditorIdentity ?? null,
    captureTimestamp: (input.now ?? (() => new Date()))().toISOString(),
    requiredEvidenceFacets: input.requiredEvidenceFacets ?? [
      'visual',
      'commercial',
      'readability',
      'runtime',
      'accessibility_observation',
    ],
    screenshotIdentity: input.screenshotIdentity ?? null,
    screenshotSha256: input.screenshotSha256 ?? null,
    knownLimitations: input.knownLimitations ?? [],
    candidateVerdict: 'candidate_only',
  };

  const errors = validateAffectedDeltaEvidence(evidence);
  if (errors.length > 0) return { errors };
  return evidence;
}
