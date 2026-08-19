/**
 * Typed Premium semantic projection from frozen purchase input.
 * Single SSOT for manual slots, takeaway, share identity, and post-purchase next action.
 */

import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import type { ExpressionAxes, ExpressionAxisId, Result } from '../individualization/types';
import { buildPersonalFreeFusedInsightSpecV3, type PersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import { resolveFreeAxes } from '../freeResult/buildFreeFiveViewCompositionV1';
import type { PurchaseInputSnapshotV1 } from '../paidResult/purchaseInputSnapshotV1';
import { readPurchaseInputSnapshotV1 } from '../paidResult/purchaseInputSnapshotV1';
import {
  PAID_DTR_DEEP_READING_TAKEAWAYS,
  type PaidDtrReportPartId,
} from '../paidDtrProductCopy';
import type { ReplyThemeId } from '../individualization/types';
import { firstSentenceJa } from './narrativeSafetyV1';
import { pickHiddenSpecFromFused, type PremiumManualHiddenSpec } from './premiumManualHiddenSpecV1';

export type PremiumPurchasedSemanticProjectionV1 = {
  axes: ExpressionAxes;
  birthAxes: ExpressionAxes;
  hingeAxisId: ExpressionAxisId;
  stemLaneIndex: number;
  fused: PersonalFreeFusedInsightSpecV3;
  takeawayJa: string;
  nextActionJa: string | null;
  hiddenSpec: PremiumManualHiddenSpec | null;
};

const THEME_TO_TAKEAWAY_PART: Readonly<Record<ReplyThemeId, PaidDtrReportPartId>> = {
  work: '2',
  relation: '3',
  fatigue: '4',
  tendency: '1',
  report: '1',
};

function takeawayPartForTheme(theme: ReplyThemeId | undefined): PaidDtrReportPartId {
  return theme ? THEME_TO_TAKEAWAY_PART[theme] : '1';
}

export function readPurchaseInputFromDraftSnapshot(
  draftSnapshot: Record<string, unknown> | null | undefined,
): PurchaseInputSnapshotV1 | null {
  if (!draftSnapshot || typeof draftSnapshot !== 'object') return null;
  const extra = draftSnapshot.extra_json;
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return null;
  return readPurchaseInputSnapshotV1(extra as Record<string, unknown>);
}

export function buildPremiumPurchasedSemanticProjectionV1(input: {
  purchaseInput: PurchaseInputSnapshotV1;
  stemLaneIndex: number;
}): Result<PremiumPurchasedSemanticProjectionV1> {
  const { purchaseInput, stemLaneIndex } = input;
  const birthDate = purchaseInput.normalizedProfile.birthDate;
  const freeAnswerSet = purchaseInput.freeAnswerSet;

  const free = resolveFreeAxes(freeAnswerSet);
  if (!free.ok) return free;

  const canonical = resolveCanonicalBirthProfileV2({ birthDate });
  if (!canonical.ok) return canonical;

  const fingerprint = purchaseInput.individualization.fingerprint;
  const fused = buildPersonalFreeFusedInsightSpecV3({
    birth: canonical.value.birthSignature,
    answers: free.value.axes,
    alignItems: fingerprint.alignItems,
    divergeItems: fingerprint.divergeItems,
    modifiers: {
      stemLane: canonical.value.stemLane,
      lunarMonth: canonical.value.lunarMonth,
      season3: canonical.value.season3,
      dayBand: canonical.value.dayBand,
      tensionIds: canonical.value.tensionIds,
    },
  });

  const hiddenSpec = pickHiddenSpecFromFused(fused);
  const primaryTheme = fingerprint.freeExpression.primaryReplyTheme ?? undefined;
  const takeawayPart = takeawayPartForTheme(primaryTheme);
  const takeawayCatalog = PAID_DTR_DEEP_READING_TAKEAWAYS[takeawayPart].itemsJa[2] ?? '';
  const takeawayFromFused = firstSentenceJa(fused.behavioralPrediction);
  const takeawayJa =
    (hiddenSpec?.text && hiddenSpec.text.length >= 8 ? firstSentenceJa(hiddenSpec.text) : '') ||
    (takeawayFromFused.length >= 8 ? takeawayFromFused : '') ||
    firstSentenceJa(takeawayCatalog);

  const nextActionJa = firstSentenceJa(
    PAID_DTR_DEEP_READING_TAKEAWAYS[takeawayPart].itemsJa[1] ?? '',
  );

  return {
    ok: true,
    value: {
      axes: free.value.axes,
      birthAxes: canonical.value.birthSignature.dimensions,
      hingeAxisId: fused.hingeAxisId,
      stemLaneIndex,
      fused,
      takeawayJa,
      nextActionJa: nextActionJa.length >= 4 ? nextActionJa : null,
      hiddenSpec,
    },
  };
}
