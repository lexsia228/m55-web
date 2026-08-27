/**
 * Two-person "二人の取扱説明書" — derived from PairFreeInsightSpecV2 only.
 * No partner mind-reading. Public voice uses 片方 / もう片方.
 */

import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import type { RelationStatusId } from '../compatibility/pairReadingTypes';
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

function manualSlotLabels(relationStatusId: RelationStatusId): {
  mismatch: string;
  returnPath: string;
  sharePrefix: string;
} {
  if (relationStatusId === 'R1') {
    return {
      mismatch: '読み取りのずれ',
      returnPath: '次の一歩',
      sharePrefix: '読み取りのずれ',
    };
  }
  if (relationStatusId === 'R2') {
    return {
      mismatch: '読み取りのずれ',
      returnPath: '次の接点',
      sharePrefix: '読み取りのずれ',
    };
  }
  if (relationStatusId === 'R5') {
    return {
      mismatch: 'すれ違い',
      returnPath: '再接近',
      sharePrefix: 'すれ違い',
    };
  }
  if (relationStatusId === 'R4') {
    return {
      mismatch: 'すれ違い',
      returnPath: '距離の取り方',
      sharePrefix: 'すれ違い',
    };
  }
  return {
    mismatch: 'すれ違い',
    returnPath: '戻り',
    sharePrefix: 'すれ違い',
  };
}

const R1_PARTNER_MANUAL_UNCERTAINTY =
  'もう一方については、まだ反応材料が少なく、こちらから意味を決めにくい';

const R1_MANUAL_HANDLING_FORBIDDEN =
  /書き留|試して|一度だけ|次に(話す|連絡)|してください|しなさい|戻りやすい|話すときのヒント/;

function pairManualRelationSides(
  spec: PairFreeInsightSpecV2,
): { oneJa: string; otherJa: string } | null {
  if (spec.relationStatusId === 'R1') {
    return {
      oneJa: firstSentenceJa(spec.meshMoment),
      otherJa: R1_PARTNER_MANUAL_UNCERTAINTY,
    };
  }
  const starts = pairStartsFromInsight(spec);
  return pairRelationSidesJa(starts.visibleStart, starts.inwardStart);
}

export function buildPairManualV1(input: {
  spec: PairFreeInsightSpecV2;
  completeness: 'short' | 'complete';
}): ManualSpecV1 {
  const spec = input.spec;
  const labels = manualSlotLabels(spec.relationStatusId);
  const ids = [spec.interactionId, spec.id];
  const sides = pairManualRelationSides(spec);
  const slots: ManualSlotV1[] = [
    slot('one_tends', '一方', sides?.oneJa ?? firstSentenceJa(spec.meshMoment), ids),
    ...(sides
      ? [slot('other_tends', 'もう一方', sides.otherJa, ids)]
      : input.completeness === 'complete' && spec.relationStatusId !== 'R1'
        ? [slot('other_tends', 'もう一方', firstSentenceJa(spec.betweenThem), ids)]
        : []),
    slot('mismatch_entry', labels.mismatch, firstSentenceJa(spec.mismatchEntry), ids),
    slot('pair_misread', '誤読されやすいところ', firstSentenceJa(spec.misreadLoop), ids),
  ];
  if (input.completeness === 'complete' && spec.relationStatusId !== 'R1') {
    slots.push(
      slot('return_path', labels.returnPath, firstSentenceJa(spec.reset), ids),
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
  const labels = manualSlotLabels(spec.relationStatusId);
  return {
    entryJa: `${labels.sharePrefix}：${publicPairVoiceJa(firstSentenceJa(spec.mismatchEntry))}`,
  };
}
