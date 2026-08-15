/**
 * Two-person "二人の取扱説明書" — derived from PairFreeInsightSpecV2 only.
 * No partner mind-reading. Public voice uses 片方 / もう片方.
 */

import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import type { ManualSlotV1, ManualSpecV1 } from './m55NarrativeSpecV1';
import { firstSentenceJa, publicPairVoiceJa } from './narrativeSafetyV1';

function slot(
  id: ManualSlotV1['id'],
  labelJa: string,
  bodyJa: string,
  provenanceIds: readonly string[],
): ManualSlotV1 {
  return { id, labelJa, bodyJa, provenanceIds };
}

export function buildPairManualV1(input: {
  spec: PairFreeInsightSpecV2;
  completeness: 'short' | 'complete';
}): ManualSpecV1 {
  const spec = input.spec;
  const ids = [spec.interactionId, spec.id];
  const slots: ManualSlotV1[] = [
    slot('mismatch_entry', 'すれ違いの入口', firstSentenceJa(spec.mismatchEntry), ids),
    slot('one_tends', '一方がしやすいこと', firstSentenceJa(spec.meshMoment), ids),
    slot('pair_misread', '誤読されやすいところ', firstSentenceJa(spec.misreadLoop), ids),
    slot('return_path', '戻りやすい方法', firstSentenceJa(spec.reset), ids),
  ];
  if (input.completeness === 'complete') {
    slots.push(
      slot('other_tends', 'もう一方がしやすいこと', firstSentenceJa(spec.betweenThem), ids),
      slot(
        'pair_talk_hint',
        '話すときのヒント',
        firstSentenceJa(spec.reset) || firstSentenceJa(spec.meshMoment),
        ids,
      ),
    );
  }
  const filled = slots.filter((item) => item.bodyJa.trim().length >= 4);
  return {
    titleJa: '二人の取扱説明書',
    slots: filled.slice(0, input.completeness === 'complete' ? 6 : Math.min(5, filled.length)),
    hiddenSpecJa: firstSentenceJa(spec.relationshipTriggerJa || spec.betweenThem),
    hiddenSpecProvenanceIds: ids,
    completeness: input.completeness,
  };
}

export function buildPairPublicManualLines(spec: PairFreeInsightSpecV2): {
  entryJa: string;
  returnJa: string;
} {
  return {
    entryJa: publicPairVoiceJa(firstSentenceJa(spec.mismatchEntry)),
    returnJa: publicPairVoiceJa(firstSentenceJa(spec.reset)),
  };
}
