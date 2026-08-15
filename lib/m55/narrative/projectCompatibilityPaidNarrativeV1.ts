/**
 * Compatibility Paid narrative framing — six-scene engine reused as-is.
 * Personalized public share defaults to generic NO_OP when leakage risk exists.
 */

import type { PaidCompatibilityReportSnapshot } from '../compatibility/buildPaidCompatibilityReportV1';
import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import {
  M55_NARRATIVE_SPEC_VERSION,
  type M55NarrativeSpecV1,
  type ShareCandidateV1,
} from './m55NarrativeSpecV1';
import { firstSentenceJa, paidContentWouldLeak } from './narrativeSafetyV1';
import { buildPairManualV1 } from './pairManualV1';

export type CompatibilityPaidShareDecision =
  | { readonly mode: 'generic'; readonly reason: 'privacy_or_paid_leak_guard' }
  | { readonly mode: 'personalized_safe'; readonly candidate: ShareCandidateV1 };

export const COMPATIBILITY_PAID_GENERIC_SHARE: ShareCandidateV1 = {
  variant: 'pair_generic',
  labelJa: '二人の相性レポート',
  headlineJa: '二人の相性レポートを読みました',
  bodyJa: '二人の間で回りやすい流れを、場面に分けて読みました。',
  ctaJa: 'あなたの二人では、どう出る？',
  provenanceIds: ['paid_compatibility_report_v1.generic'],
};

export function decideCompatibilityPaidShare(input: {
  snapshot: PaidCompatibilityReportSnapshot;
  pairFree?: PairFreeInsightSpecV2;
}): CompatibilityPaidShareDecision {
  const blob = [
    input.snapshot.relationshipSummary,
    input.snapshot.recurringLoop,
    ...input.snapshot.chapters.flatMap((chapter) => [
      chapter.scene,
      chapter.usablePhrase,
      chapter.smallExperiment,
      chapter.reflectionQuestion,
    ]),
  ].join('\n');
  if (paidContentWouldLeak(blob) || !input.pairFree) {
    return { mode: 'generic', reason: 'privacy_or_paid_leak_guard' };
  }
  return { mode: 'generic', reason: 'privacy_or_paid_leak_guard' };
}

export function projectCompatibilityPaidNarrativeV1(input: {
  snapshot: PaidCompatibilityReportSnapshot;
  pairFree?: PairFreeInsightSpecV2;
}): M55NarrativeSpecV1 {
  const decision = decideCompatibilityPaidShare(input);
  const manual = input.pairFree
    ? buildPairManualV1({ spec: input.pairFree, completeness: 'complete' })
    : {
        titleJa: '二人の取扱説明書',
        slots: [
          {
            id: 'return_path' as const,
            labelJa: '戻りやすい方法',
            bodyJa: firstSentenceJa(input.snapshot.recurringLoop),
            provenanceIds: ['paid_compatibility_report_v1.loop'],
          },
        ],
        hiddenSpecJa: firstSentenceJa(input.snapshot.relationshipSummary),
        hiddenSpecProvenanceIds: ['paid_compatibility_report_v1'],
        completeness: 'complete' as const,
      };

  const shareCandidates: ShareCandidateV1[] =
    decision.mode === 'generic'
      ? [COMPATIBILITY_PAID_GENERIC_SHARE]
      : [decision.candidate];

  return {
    version: M55_NARRATIVE_SPEC_VERSION,
    surface: 'compatibility_paid',
    openingHit: {
      text: firstSentenceJa(input.snapshot.relationshipSummary),
      provenanceIds: ['paid_compatibility_report_v1.summary'],
    },
    trustCue: {
      text: input.snapshot.safetyNote,
      provenanceIds: ['paid_compatibility_report_v1.safety'],
    },
    fusedDiscovery: {
      text: firstSentenceJa(input.snapshot.recurringLoop),
      provenanceIds: ['paid_compatibility_report_v1.loop'],
    },
    contextSections: input.snapshot.chapters.map((chapter) => ({
      text: chapter.scene,
      provenanceIds: [chapter.sceneInteractionId],
    })),
    manualSpec: manual,
    actions: input.snapshot.chapters.slice(0, 2).map((chapter) => ({
      text: firstSentenceJa(chapter.smallExperiment),
      provenanceIds: [chapter.sceneInteractionId],
    })),
    takeaway: {
      text: firstSentenceJa(input.snapshot.chapters[0]?.reflectionQuestion ?? ''),
      provenanceIds: [input.snapshot.chapters[0]?.sceneInteractionId ?? 'paid'],
    },
    shareCandidates,
    inferenceIds: [input.snapshot.version, ...input.snapshot.chapters.map((c) => c.sceneInteractionId)],
  };
}
