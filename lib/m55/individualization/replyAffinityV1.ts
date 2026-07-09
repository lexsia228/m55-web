/**
 * reply_affinity ranked builder (ptrm-v1 + fp-v1 signals).
 * score is internal-only and NEVER written to output.
 */

import type {
  AlignDivergeItem,
  FreeExpression,
  Hesitation,
  PaidDepth,
  ReplyAffinity,
  ReplyAffinityRankedItem,
  ReplyThemeId,
} from './types';

type Acc = {
  score: number;
  reasonCodes: Set<string>;
  evidenceAnswerIds: Set<string>;
};

function emptyAcc(): Acc {
  return { score: 0, reasonCodes: new Set(), evidenceAnswerIds: new Set() };
}

function ensure(map: Map<ReplyThemeId, Acc>, theme: ReplyThemeId): Acc {
  let acc = map.get(theme);
  if (!acc) {
    acc = emptyAcc();
    map.set(theme, acc);
  }
  return acc;
}

export function buildReplyAffinityV1(input: {
  freeExpression: FreeExpression;
  paidDepth: PaidDepth | null;
  paidAnswerSet: Record<string, string> | null;
  divergeItems: AlignDivergeItem[];
  hesitation: Hesitation;
}): ReplyAffinity {
  const map = new Map<ReplyThemeId, Acc>();

  const primary = input.freeExpression.primaryReplyTheme;
  const primaryAid = input.freeExpression.primaryThemeAnswerId;
  if (primary && primaryAid) {
    const acc = ensure(map, primary);
    acc.score += 3;
    acc.reasonCodes.add('pt_map');
    acc.evidenceAnswerIds.add(primaryAid);
  }

  const secondary = input.freeExpression.secondaryReplyTheme;
  if (secondary && primaryAid && secondary !== primary) {
    const acc = ensure(map, secondary);
    // secondary itself adds +0; still record candidate reason if later boosted
    acc.reasonCodes.add('pt_secondary');
    acc.evidenceAnswerIds.add(primaryAid);
  }

  const paid = input.paidAnswerSet;
  if (paid) {
    if (paid['paid.work_focus']) {
      const acc = ensure(map, 'work');
      acc.score += 2;
      acc.reasonCodes.add('paid_work');
      acc.evidenceAnswerIds.add(paid['paid.work_focus']!);
    }
    if (paid['paid.relation_focus']) {
      const acc = ensure(map, 'relation');
      acc.score += 2;
      acc.reasonCodes.add('paid_relation');
      acc.evidenceAnswerIds.add(paid['paid.relation_focus']!);
    }
    if (paid['paid.fatigue_signal']) {
      const acc = ensure(map, 'fatigue');
      acc.score += 2;
      acc.reasonCodes.add('paid_fatigue');
      acc.evidenceAnswerIds.add(paid['paid.fatigue_signal']!);
    }
    if (paid['paid.report_usage']) {
      const acc = ensure(map, 'report');
      acc.score += 2;
      acc.reasonCodes.add('paid_report');
      acc.evidenceAnswerIds.add(paid['paid.report_usage']!);
    }
    if (paid['paid.reading_style']) {
      const acc = ensure(map, 'tendency');
      acc.score += 2;
      acc.reasonCodes.add('paid_reading');
      acc.evidenceAnswerIds.add(paid['paid.reading_style']!);
    }
  }

  for (const item of input.divergeItems) {
    if (item.axisId === 'distance') {
      const acc = ensure(map, 'relation');
      acc.score += 2;
      acc.reasonCodes.add('div_distance');
      for (const e of item.evidenceAnswerIds) acc.evidenceAnswerIds.add(e);
    } else if (item.axisId === 'recovery') {
      const acc = ensure(map, 'fatigue');
      acc.score += 2;
      acc.reasonCodes.add('div_recovery');
      for (const e of item.evidenceAnswerIds) acc.evidenceAnswerIds.add(e);
    } else if (item.axisId === 'decision') {
      const acc = ensure(map, 'work');
      acc.score += 1;
      acc.reasonCodes.add('div_decision');
      for (const e of item.evidenceAnswerIds) acc.evidenceAnswerIds.add(e);
    } else if (item.axisId === 'start') {
      const acc = ensure(map, 'work');
      acc.score += 1;
      acc.reasonCodes.add('div_start');
      for (const e of item.evidenceAnswerIds) acc.evidenceAnswerIds.add(e);
    }
  }

  if (input.hesitation.present) {
    const acc = ensure(map, 'tendency');
    acc.score += 1;
    acc.reasonCodes.add('hesitation');
    for (const d of input.hesitation.drivers) acc.evidenceAnswerIds.add(d);
  }

  const ranked: ReplyAffinityRankedItem[] = [...map.entries()]
    .filter(([, acc]) => acc.score > 0 && acc.evidenceAnswerIds.size >= 1)
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([replyThemeId, acc]) => ({
      replyThemeId,
      reasonCodes: [...acc.reasonCodes].sort(),
      evidenceAnswerIds: [...acc.evidenceAnswerIds].sort(),
    }));

  return { ranked };
}
