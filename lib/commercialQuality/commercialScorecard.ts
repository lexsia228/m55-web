/**
 * 12-axis commercial scorecard — evaluation evidence only, never executable authority.
 * A numeric score alone cannot auto-GREEN a candidate.
 */

export const COMMERCIAL_SCORECARD_AXES = [
  'VISUAL_IDENTITY',
  'EDITORIAL_HIERARCHY',
  'SELF_DIFFERENTIATION',
  'PAIR_DIFFERENTIATION',
  'PERSONALIZATION_VISIBILITY',
  'EMOTIONAL_ENGAGEMENT',
  'PREMIUM_DESIRABILITY',
  'SHARE_DESIRABILITY',
  'MOBILE_POLISH',
  'TRUST',
  'JAPANESE_NATURALNESS',
  'INFLUENCER_READINESS',
] as const;

export type CommercialScorecardAxis = (typeof COMMERCIAL_SCORECARD_AXES)[number];

export type CommercialScorecardScores = Record<CommercialScorecardAxis, number>;

/** Master-audit baseline from sitewide commercial UIUX audit (Wave 1). */
export const WAVE1_MASTER_AUDIT_BASELINE: CommercialScorecardScores = {
  VISUAL_IDENTITY: 3,
  EDITORIAL_HIERARCHY: 2,
  SELF_DIFFERENTIATION: 3,
  PAIR_DIFFERENTIATION: 2,
  PERSONALIZATION_VISIBILITY: 2,
  EMOTIONAL_ENGAGEMENT: 2,
  PREMIUM_DESIRABILITY: 2,
  SHARE_DESIRABILITY: 2,
  MOBILE_POLISH: 2,
  TRUST: 3,
  JAPANESE_NATURALNESS: 2,
  INFLUENCER_READINESS: 1,
};

/** Wave 2 stretch targets (evaluation evidence, not auto-approval). */
export const WAVE2_SCORECARD_TARGETS: CommercialScorecardScores = {
  VISUAL_IDENTITY: 5,
  EDITORIAL_HIERARCHY: 4,
  SELF_DIFFERENTIATION: 4,
  PAIR_DIFFERENTIATION: 5,
  PERSONALIZATION_VISIBILITY: 4,
  EMOTIONAL_ENGAGEMENT: 4,
  PREMIUM_DESIRABILITY: 4,
  SHARE_DESIRABILITY: 4,
  MOBILE_POLISH: 4,
  TRUST: 4,
  JAPANESE_NATURALNESS: 4,
  INFLUENCER_READINESS: 4,
};

/** Post-Wave 2 minimum commercial GREEN threshold per axis. */
export const WAVE2_MINIMUM_GREEN_THRESHOLD = 4;

export type CommercialScorecardCandidate = {
  status: 'candidate';
  schemaVersion: '1.0.0';
  recordedAt: string;
  sourceCommit: string;
  implementerIdentity: string;
  independentAuditorIdentity: string | null;
  before: CommercialScorecardScores;
  after: CommercialScorecardScores;
  targets: CommercialScorecardScores;
  /** Explicitly false — scores never auto-approve. */
  autoApproval: false;
  knownLimitations: readonly string[];
  verdict: 'candidate_only';
};

export function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateScorecardScores(scores: Partial<CommercialScorecardScores>): string[] {
  const errors: string[] = [];
  for (const axis of COMMERCIAL_SCORECARD_AXES) {
    if (!(axis in scores)) {
      errors.push(`missing axis: ${axis}`);
      continue;
    }
    if (!isValidScore(scores[axis])) {
      errors.push(`invalid score for ${axis}: ${scores[axis]}`);
    }
  }
  return errors;
}

export function meetsWave2MinimumGreen(after: CommercialScorecardScores): boolean {
  return COMMERCIAL_SCORECARD_AXES.every(
    (axis) => after[axis] >= WAVE2_MINIMUM_GREEN_THRESHOLD,
  );
}

export function buildScorecardCandidate(input: {
  sourceCommit: string;
  implementerIdentity: string;
  independentAuditorIdentity?: string | null;
  before?: CommercialScorecardScores;
  after: CommercialScorecardScores;
  targets?: CommercialScorecardScores;
  knownLimitations?: readonly string[];
  now?: () => Date;
}): CommercialScorecardCandidate | { errors: string[] } {
  const errors = validateScorecardScores(input.after);
  if (errors.length > 0) return { errors };

  if (
    input.independentAuditorIdentity &&
    input.implementerIdentity === input.independentAuditorIdentity
  ) {
    return { errors: ['implementer == independent auditor: scorecard cannot claim independent GREEN'] };
  }

  return {
    status: 'candidate',
    schemaVersion: '1.0.0',
    recordedAt: (input.now ?? (() => new Date()))().toISOString(),
    sourceCommit: input.sourceCommit,
    implementerIdentity: input.implementerIdentity,
    independentAuditorIdentity: input.independentAuditorIdentity ?? null,
    before: input.before ?? WAVE1_MASTER_AUDIT_BASELINE,
    after: input.after,
    targets: input.targets ?? WAVE2_SCORECARD_TARGETS,
    autoApproval: false,
    knownLimitations: input.knownLimitations ?? [
      'numeric score alone cannot auto-GREEN candidate',
      'cursor self-check scores are candidate only until Codex independent audit',
    ],
    verdict: 'candidate_only',
  };
}
