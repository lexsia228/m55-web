/**
 * align / diverge items + free one-point pick (fp-v1).
 */

import { AXIS_PRIORITY, FREE_AXIS_QUESTION_IDS } from './answerIdMapsV1';
import type {
  AlignDivergeItem,
  ExpressionAxes,
  ExpressionAxisId,
  Result,
} from './types';

function evidenceForAxis(
  axisId: ExpressionAxisId,
  freeAnswerSet: Record<string, string>,
): string[] {
  const qid = FREE_AXIS_QUESTION_IDS[axisId];
  const aid = freeAnswerSet[qid];
  return typeof aid === 'string' && aid.length > 0 ? [aid] : [];
}

export function buildAlignDivergeItemsV1(input: {
  dobAxes: ExpressionAxes;
  freeAxes: ExpressionAxes;
  freeAnswerSet: Record<string, string>;
}): Result<{ alignItems: AlignDivergeItem[]; divergeItems: AlignDivergeItem[] }> {
  const alignItems: AlignDivergeItem[] = [];
  const divergeItems: AlignDivergeItem[] = [];

  const allAxes: ExpressionAxisId[] = [
    'start',
    'decision',
    'recovery',
    'distance',
    'change',
  ];

  for (const axisId of allAxes) {
    const dobTendency = input.dobAxes[axisId];
    const freeTendency = input.freeAxes[axisId];
    const evidenceAnswerIds = evidenceForAxis(axisId, input.freeAnswerSet);
    if (evidenceAnswerIds.length < 1) {
      return { ok: false, code: 'missing_free_answers' };
    }
    const relation = dobTendency === freeTendency ? 'align' : 'diverge';
    const item: AlignDivergeItem = {
      axisId,
      dobTendency,
      freeTendency,
      relation,
      evidenceAnswerIds,
      uiSlot: 'freeOne',
    };
    if (relation === 'align') alignItems.push(item);
    else divergeItems.push(item);
  }

  return { ok: true, value: { alignItems, divergeItems } };
}

function priorityIndex(axisId: ExpressionAxisId): number {
  return AXIS_PRIORITY.indexOf(axisId);
}

/**
 * Free surface: exactly one point. Diverge preferred; else align.
 * Axis priority: distance > recovery > decision > start > change.
 */
export function pickFreeAlignDivergeItemV1(input: {
  alignItems: AlignDivergeItem[];
  divergeItems: AlignDivergeItem[];
}): AlignDivergeItem | null {
  const sortByPriority = (items: AlignDivergeItem[]) =>
    [...items].sort((a, b) => priorityIndex(a.axisId) - priorityIndex(b.axisId));

  const diverges = sortByPriority(input.divergeItems);
  if (diverges.length > 0) return diverges[0]!;

  const aligns = sortByPriority(input.alignItems);
  if (aligns.length > 0) return aligns[0]!;

  return null;
}
