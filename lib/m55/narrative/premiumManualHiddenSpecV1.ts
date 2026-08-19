/**
 * Hidden-spec selection for Premium manual — extracted from fused projection only.
 */

import type { PersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import { normalizeCustomerCopyJa } from '../freeResult/humanizeFreeResultWhyV1';
import { firstSentenceJa } from './narrativeSafetyV1';

export type PremiumManualHiddenSpec = {
  text: string;
  provenanceIds: readonly string[];
};

export function pickHiddenSpecFromFused(
  fused: PersonalFreeFusedInsightSpecV3,
): PremiumManualHiddenSpec | null {
  const actualNorm = normalizeCustomerCopyJa(firstSentenceJa(fused.manifestation.shortJa));
  const candidates: readonly PremiumManualHiddenSpec[] = [
    {
      text: fused.manifestation.supportingObservationJa,
      provenanceIds: [fused.manifestation.patternId, 'supportingObservationJa'],
    },
    {
      text: fused.behavioralPrediction,
      provenanceIds: [fused.manifestation.patternId, 'behavioralPrediction'],
    },
    {
      text: fused.body,
      provenanceIds: [fused.interactionId, fused.hingeAxisId],
    },
    {
      text: fused.fusedStackJa,
      provenanceIds: [fused.interactionId, fused.hingeAxisId, 'fusedStackJa'],
    },
  ];

  for (const candidate of candidates) {
    const sentence = firstSentenceJa(candidate.text);
    const norm = normalizeCustomerCopyJa(sentence);
    if (
      sentence.trim().length >= 8 &&
      norm !== actualNorm &&
      !actualNorm.includes(norm.slice(0, 10)) &&
      !norm.includes(actualNorm.slice(0, 10))
    ) {
      return { text: sentence, provenanceIds: candidate.provenanceIds };
    }
  }
  return null;
}
