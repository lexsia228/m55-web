/**
 * Optional vision-judge evidence attachment schema.
 * External GPT/Vision review attaches here — CANDIDATE ONLY.
 * Never auto-approves merge, Production, commercial release, or Safari independent GREEN.
 */
import type { CommercialScorecardAxis, CommercialScorecardScores } from './commercialScorecard';
import { COMMERCIAL_SCORECARD_AXES, validateScorecardScores } from './commercialScorecard';

export const VISION_JUDGE_ATTACHMENT_SCHEMA_VERSION = '1.0.0';

export type VisionFindingSeverity = 'P0' | 'P1' | 'P2';

export type VisionFinding = {
  id: string;
  severity: VisionFindingSeverity;
  axis: CommercialScorecardAxis | 'RUNTIME' | 'PRIVACY' | 'ACCESSIBILITY_OBSERVATION';
  surfaceId: string;
  route: string;
  summary: string;
};

export type VisionJudgeAttachment = {
  schemaVersion: typeof VISION_JUDGE_ATTACHMENT_SCHEMA_VERSION;
  status: 'candidate';
  reviewerIdentity: string;
  screenshotIdentity: string;
  screenshotSha256: string | null;
  recordedAt: string;
  sourceCommit: string;
  scores: CommercialScorecardScores;
  findings: readonly VisionFinding[];
  commercialObservations: readonly string[];
  candidateVerdict: 'candidate_only';
  /** Explicitly prohibited auto-actions. */
  cannotAutoApprove: readonly [
    'merge',
    'production',
    'commercial_release',
    'safari_independent_green',
  ];
  knownLimitations: readonly string[];
};

export function validateVisionJudgeAttachment(
  attachment: Partial<VisionJudgeAttachment>,
): string[] {
  const errors: string[] = [];

  if (attachment.schemaVersion !== VISION_JUDGE_ATTACHMENT_SCHEMA_VERSION) {
    errors.push('invalid or missing schemaVersion');
  }
  if (attachment.status !== 'candidate') {
    errors.push('vision judge attachment must have status=candidate');
  }
  if (!attachment.reviewerIdentity?.trim()) {
    errors.push('missing reviewerIdentity');
  }
  if (!attachment.screenshotIdentity?.trim()) {
    errors.push('missing screenshotIdentity');
  }
  if (!attachment.sourceCommit?.trim()) {
    errors.push('missing sourceCommit');
  }
  if (attachment.candidateVerdict !== 'candidate_only') {
    errors.push('candidateVerdict must be candidate_only');
  }

  if (attachment.scores) {
    errors.push(...validateScorecardScores(attachment.scores));
  } else {
    errors.push('missing scores');
  }

  const cannot = attachment.cannotAutoApprove ?? [];
  for (const action of ['merge', 'production', 'commercial_release', 'safari_independent_green']) {
    if (!cannot.includes(action)) {
      errors.push(`cannotAutoApprove must include ${action}`);
    }
  }

  return errors;
}

export function buildVisionJudgeAttachment(input: {
  reviewerIdentity: string;
  screenshotIdentity: string;
  screenshotSha256?: string | null;
  sourceCommit: string;
  scores: CommercialScorecardScores;
  findings?: readonly VisionFinding[];
  commercialObservations?: readonly string[];
  knownLimitations?: readonly string[];
  now?: () => Date;
}): VisionJudgeAttachment | { errors: string[] } {
  const scoreErrors = validateScorecardScores(input.scores);
  if (scoreErrors.length > 0) return { errors: scoreErrors };

  const attachment: VisionJudgeAttachment = {
    schemaVersion: VISION_JUDGE_ATTACHMENT_SCHEMA_VERSION,
    status: 'candidate',
    reviewerIdentity: input.reviewerIdentity,
    screenshotIdentity: input.screenshotIdentity,
    screenshotSha256: input.screenshotSha256 ?? null,
    recordedAt: (input.now ?? (() => new Date()))().toISOString(),
    sourceCommit: input.sourceCommit,
    scores: input.scores,
    findings: input.findings ?? [],
    commercialObservations: input.commercialObservations ?? [],
    candidateVerdict: 'candidate_only',
    cannotAutoApprove: [
      'merge',
      'production',
      'commercial_release',
      'safari_independent_green',
    ],
    knownLimitations: input.knownLimitations ?? [
      'vision judge verdict is candidate only',
      'no CI auto-LLM call',
      'cannot replace Codex independent Safari audit',
    ],
  };

  const errors = validateVisionJudgeAttachment(attachment);
  if (errors.length > 0) return { errors };

  return attachment;
}

export function allAxesPresent(scores: CommercialScorecardScores): boolean {
  return COMMERCIAL_SCORECARD_AXES.every((axis) => axis in scores);
}
