/**
 * Compatibility Free narrative projection — relationship loop, not A+B labels.
 */

import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import {
  M55_NARRATIVE_SPEC_VERSION,
  type M55NarrativeSpecV1,
  type ShareCandidateV1,
} from './m55NarrativeSpecV1';
import { compactSentencesJa } from './narrativeSafetyV1';
import { buildPairManualV1, buildPairPublicManualLines } from './pairManualV1';

export function projectCompatibilityFreeNarrativeV1(input: {
  spec: PairFreeInsightSpecV2;
}): M55NarrativeSpecV1 {
  const spec = input.spec;
  const manual = buildPairManualV1({ spec, completeness: 'short' });
  const publicLines = buildPairPublicManualLines(spec);

  const shareCandidates: ShareCandidateV1[] = [
    {
      variant: 'pair_manual',
      labelJa: '二人の取扱説明書',
      headlineJa: '二人の取扱説明書',
      bodyJa: publicLines.entryJa,
      ctaJa: 'あなたの二人では、どう出る？',
      provenanceIds: [spec.interactionId, spec.id],
    },
  ];

  return {
    version: M55_NARRATIVE_SPEC_VERSION,
    surface: 'compatibility_free',
    openingHit: {
      text: compactSentencesJa(spec.relationshipTriggerJa || spec.betweenThem, 2),
      provenanceIds: [spec.id, spec.interactionId],
    },
    trustCue: {
      text: '土台と、いまの回答の重なりから見ています。相手本人が回答したものではありません。',
      provenanceIds: ['pair_free_insight_v2'],
    },
    fusedDiscovery: {
      text: compactSentencesJa(spec.betweenThem, 2),
      provenanceIds: [spec.interactionId],
    },
    contextSections: [
      { text: spec.meshMoment, provenanceIds: [`${spec.interactionId}.mesh`] },
      { text: spec.mismatchEntry, provenanceIds: [`${spec.interactionId}.entry`] },
      { text: spec.misreadLoop, provenanceIds: [`${spec.interactionId}.loop`] },
    ],
    manualSpec: manual,
    actions: [],
    shareCandidates,
    inferenceIds: [spec.id, spec.interactionId, spec.manifestationPatternId],
  };
}
