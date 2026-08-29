/**
 * Fail-closed baseline policy — repository-independent.
 */

import type { ComprehensionFinding, FindingSeverity } from './japaneseComprehensionTypes';

export type FrozenOpenBaselineEntry = {
  findingId: string;
  knownHumanFindingId?: string;
  invariantCategory: string;
  copyId?: string | null;
  surfaceId?: string | null;
  runtimeStateId?: string | null;
  baselineEvidenceFingerprint: string;
};

export type MachineGateStatus = 'PASS' | 'FAIL';
export type AiReviewStatus = 'PENDING' | 'COMPLETE';
export type HumanApprovalStatus = 'REQUIRED' | 'APPROVED';
export type OverallComprehensionStatus =
  | 'BLOCKED_MACHINE'
  | 'PENDING_AI_REVIEW'
  | 'PENDING_HUMAN_APPROVAL'
  | 'USER_VISIBLE_CLOSED_GREEN';

export type BaselinePassSummary = {
  machineGateStatus: MachineGateStatus;
  aiReviewStatus: AiReviewStatus;
  humanApprovalStatus: HumanApprovalStatus;
  overallComprehensionStatus: OverallComprehensionStatus;
  passed: boolean;
  structuralFailures: readonly string[];
  materialP0Count: number;
  materialP1Count: number;
  openBaselineCount: number;
  unexpectedFindingCount: number;
  identityFingerprintMismatchCount: number;
  newCurrentFindingCount: number;
  pendingAiReviewCount: number;
};

const KNOWN_HUMAN_INVARIANTS: Record<
  string,
  { category: string; predicate: (finding: ComprehensionFinding) => boolean }
> = {
  'GCJQ-01': {
    category: 'relation_stage_ambiguity',
    predicate: (f) =>
      f.category === 'relation_stage_ambiguity' && f.copyId === 'pair.relation_stage.R6',
  },
  'GCJQ-02': {
    category: 'question_answerability',
    predicate: (f) =>
      f.category === 'question_answerability' &&
      Boolean(
        f.currentTextOrItem?.includes('|decisionPace|') ||
          f.currentTextOrItem?.includes('|disagreement|'),
      ),
  },
  'GCJQ-03': {
    category: 'share_motivation_insufficient',
    predicate: (f) =>
      f.category === 'share_motivation_insufficient' && f.copyId === 'pair.share.native',
  },
  'GCJQ-04': {
    category: 'product_not_first_class',
    predicate: (f) =>
      f.category === 'product_not_first_class' &&
      (f.currentTextOrItem === 'compatibility_report_full_v1' ||
        f.deterministicEvidence.includes('compatibility_report_full_v1')),
  },
};

export function computeBaselineEvidenceFingerprint(
  finding: Pick<
    ComprehensionFinding,
    'category' | 'copyId' | 'surfaceId' | 'runtimeStateId' | 'deterministicEvidence' | 'currentTextOrItem'
  >,
): string {
  return [
    finding.category,
    finding.copyId ?? '',
    finding.surfaceId ?? '',
    finding.runtimeStateId ?? '',
    finding.deterministicEvidence,
    finding.currentTextOrItem ?? '',
  ].join('|');
}

export function matchesFrozenBaselineIdentity(
  finding: ComprehensionFinding,
  frozen: FrozenOpenBaselineEntry,
): boolean {
  if (finding.findingId !== frozen.findingId) return false;
  if (finding.category !== frozen.invariantCategory) return false;
  return computeBaselineEvidenceFingerprint(finding) === frozen.baselineEvidenceFingerprint;
}

export function finalizeFindingSeverity(
  finding: ComprehensionFinding,
  frozenRegistry: ReadonlyMap<string, FrozenOpenBaselineEntry>,
): ComprehensionFinding {
  const frozen = frozenRegistry.get(finding.findingId);
  if (frozen && matchesFrozenBaselineIdentity(finding, frozen)) {
    return {
      ...finding,
      severity: 'OPEN_BASELINE',
      knownHumanFindingId: frozen.knownHumanFindingId ?? finding.knownHumanFindingId,
    };
  }
  if (finding.severity === 'OPEN_BASELINE') {
    return { ...finding, severity: 'P1' };
  }
  return finding;
}

export function isMaterialRegressionSeverity(severity: FindingSeverity): boolean {
  return severity === 'P0' || severity === 'P1';
}

export function summarizeBaselinePass(input: {
  structuralFailures: readonly string[];
  findings: readonly ComprehensionFinding[];
  frozenRegistry: ReadonlyMap<string, FrozenOpenBaselineEntry>;
  aiCorpusCount: number;
  aiReviewCompleteCount?: number;
}): BaselinePassSummary {
  const { structuralFailures, findings, frozenRegistry, aiCorpusCount, aiReviewCompleteCount = 0 } =
    input;

  const openBaselineCount = findings.filter((f) => f.severity === 'OPEN_BASELINE').length;
  const materialP0Count = findings.filter((f) => f.severity === 'P0').length;
  const materialP1Count = findings.filter((f) => f.severity === 'P1').length;

  const identityFingerprintMismatchCount = findings.filter((f) => {
    const frozen = frozenRegistry.get(f.findingId);
    return frozen != null && !matchesFrozenBaselineIdentity(f, frozen);
  }).length;

  const unexpectedFindingCount = findings.filter(
    (f) => f.severity === 'OPEN_BASELINE' && !frozenRegistry.has(f.findingId),
  ).length;

  const newCurrentFindingCount = findings.filter(
    (f) => isMaterialRegressionSeverity(f.severity) && !frozenRegistry.has(f.findingId),
  ).length;

  const pendingAiReviewCount =
    findings.filter((f) => f.severity === 'PENDING_AI_REVIEW').length +
    Math.max(0, aiCorpusCount - aiReviewCompleteCount);

  const machineGateStatus: MachineGateStatus =
    structuralFailures.length === 0 &&
    materialP0Count === 0 &&
    materialP1Count === 0 &&
    unexpectedFindingCount === 0 &&
    identityFingerprintMismatchCount === 0
      ? 'PASS'
      : 'FAIL';

  const aiReviewStatus: AiReviewStatus =
    pendingAiReviewCount > 0 || aiCorpusCount > aiReviewCompleteCount ? 'PENDING' : 'COMPLETE';

  const humanApprovalStatus: HumanApprovalStatus = 'REQUIRED';

  const overallComprehensionStatus: OverallComprehensionStatus =
    machineGateStatus === 'FAIL'
      ? 'BLOCKED_MACHINE'
      : aiReviewStatus === 'PENDING'
        ? 'PENDING_AI_REVIEW'
        : 'PENDING_HUMAN_APPROVAL';

  return {
    machineGateStatus,
    aiReviewStatus,
    humanApprovalStatus,
    overallComprehensionStatus,
    passed: machineGateStatus === 'PASS',
    structuralFailures,
    materialP0Count,
    materialP1Count,
    openBaselineCount,
    unexpectedFindingCount,
    identityFingerprintMismatchCount,
    newCurrentFindingCount,
    pendingAiReviewCount,
  };
}

export function countValidatedKnownHumanFindings(
  findings: readonly ComprehensionFinding[],
): number {
  const reproduced = new Set<string>();
  for (const [knownId, invariant] of Object.entries(KNOWN_HUMAN_INVARIANTS)) {
    const match = findings.some(
      (f) =>
        f.category === invariant.category &&
        invariant.predicate(f) &&
        (!f.knownHumanFindingId || f.knownHumanFindingId === knownId),
    );
    if (match) reproduced.add(knownId);
  }
  return reproduced.size;
}

export function attachKnownHumanFindingId(
  finding: ComprehensionFinding,
): ComprehensionFinding {
  for (const [knownId, invariant] of Object.entries(KNOWN_HUMAN_INVARIANTS)) {
    if (finding.category === invariant.category && invariant.predicate(finding)) {
      return { ...finding, knownHumanFindingId: knownId };
    }
  }
  return finding;
}
