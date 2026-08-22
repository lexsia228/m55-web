/**
 * Two-person "二人の取扱説明書" — derived from PairFreeInsightSpecV2 only.
 * No partner mind-reading. Public voice uses 片方 / もう片方.
 */

import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import type { ManualSlotV1, ManualSpecV1 } from './m55NarrativeSpecV1';
import { firstSentenceJa, publicPairVoiceJa } from './narrativeSafetyV1';
import { humanizePrivatePresentationJa } from './humanizePrivatePresentationV1';
import { pairStartsFromInsight } from './projectPublicShareV1';
import { pairRelationSidesJa } from './reconstructPublicCardV1';

function slot(
  id: ManualSlotV1['id'],
  labelJa: string,
  bodyJa: string,
  provenanceIds: readonly string[],
): ManualSlotV1 {
  return { id, labelJa, bodyJa: humanizePrivatePresentationJa(bodyJa), provenanceIds };
}

export function buildPairManualV1(input: {
  spec: PairFreeInsightSpecV2;
  completeness: 'short' | 'complete';
}): ManualSpecV1 {
  const spec = input.spec;
  const ids = [spec.interactionId, spec.id];
  const starts = pairStartsFromInsight(spec);
  const sides = pairRelationSidesJa(starts.visibleStart, starts.inwardStart);
  const slots: ManualSlotV1[] = [
    slot('one_tends', '一方', sides?.oneJa ?? firstSentenceJa(spec.meshMoment), ids),
    ...(sides
      ? [slot('other_tends', 'もう一方', sides.otherJa, ids)]
      : input.completeness === 'complete'
        ? [slot('other_tends', 'もう一方', firstSentenceJa(spec.betweenThem), ids)]
        : []),
    slot('mismatch_entry', 'すれ違い', firstSentenceJa(spec.mismatchEntry), ids),
    slot('pair_misread', '誤読されやすいところ', firstSentenceJa(spec.misreadLoop), ids),
  ];
  if (input.completeness === 'complete') {
    slots.push(
      slot('return_path', '戻り', firstSentenceJa(spec.reset), ids),
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
} {
  return {
    entryJa: publicPairVoiceJa(firstSentenceJa(spec.mismatchEntry)),
  };
}
