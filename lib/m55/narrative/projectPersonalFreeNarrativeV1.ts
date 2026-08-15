/**
 * Personal Free narrative projection — wraps existing fused / depth analysis.
 * Does not duplicate inference. Rebuilds via existing builders only.
 */

import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import type { ExpressionAxes, ExpressionAxisId, Result } from '../individualization/types';
import {
  resolveDobAxes,
  resolveFreeAxes,
  type FreeFiveViewInput,
} from '../freeResult/buildFreeFiveViewCompositionV1';
import { buildFreeDepthAnalysisV1 } from '../freeResult/buildFreeDepthAnalysisV1';
import { buildPersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import {
  M55_NARRATIVE_SPEC_VERSION,
  type M55NarrativeSpecV1,
  type ShareCandidateV1,
} from './m55NarrativeSpecV1';
import { compactSentencesJa, firstSentenceJa } from './narrativeSafetyV1';
import { buildPersonalManualV1, seenVsActualFromFused } from './personalManualV1';

export function projectPersonalFreeNarrativeV1(
  input: FreeFiveViewInput,
): Result<M55NarrativeSpecV1> {
  const depth = buildFreeDepthAnalysisV1(input);
  if (!depth.ok) return depth;

  const dobAxes = resolveDobAxes(input);
  if (!dobAxes.ok) return dobAxes;
  const free = resolveFreeAxes(input.freeAnswerSet);
  if (!free.ok) return free;
  const alignDiv = buildAlignDivergeItemsV1({
    dobAxes: dobAxes.value,
    freeAxes: free.value.axes,
    freeAnswerSet: input.freeAnswerSet,
  });
  if (!alignDiv.ok) return alignDiv;
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: input.birthDate });
  if (!canonical.ok) return canonical;

  const fused = buildPersonalFreeFusedInsightSpecV3({
    birth: canonical.value.birthSignature,
    answers: free.value.axes,
    alignItems: alignDiv.value.alignItems,
    divergeItems: alignDiv.value.divergeItems,
    modifiers: {
      stemLane: canonical.value.stemLane,
      lunarMonth: canonical.value.lunarMonth,
      season3: canonical.value.season3,
      dayBand: canonical.value.dayBand,
      tensionIds: canonical.value.tensionIds,
    },
  });

  const manual = buildPersonalManualV1({
    axes: free.value.axes,
    fused,
    completeness: 'short',
  });
  const contrast = seenVsActualFromFused(fused);
  const hidden = firstSentenceJa(fused.manifestation.shortJa);
  const hiddenBody = compactSentencesJa(fused.body, 2);

  const shareCandidates: ShareCandidateV1[] = [
    {
      variant: 'manual',
      labelJa: '私の取扱説明書',
      headlineJa: '私の取扱説明書',
      bodyJa: manual.slots.map((slot) => `${slot.labelJa}：${slot.bodyJa}`).join('\n'),
      ctaJa: 'あなたの取扱説明書は？',
      provenanceIds: manual.slots.flatMap((slot) => slot.provenanceIds),
    },
    {
      variant: 'seen_vs_actual',
      labelJa: '人から見える私 / 実際の私',
      headlineJa: '人から見える私 / 実際の私',
      bodyJa: `人から見える私\n「${contrast.seenJa}」\n\n実際の私\n「${contrast.actualJa}」`,
      ctaJa: 'これ、私っぽい？\nあなたはどう出る？',
      provenanceIds: [fused.interactionId, fused.manifestation.patternId],
    },
    {
      variant: 'hidden_spec',
      labelJa: '自分でも知らなかった仕様',
      headlineJa: '自分でも知らなかった仕様',
      bodyJa: `${hidden}\n${hiddenBody}`,
      ctaJa: 'あなたの場合は？',
      provenanceIds: [fused.manifestation.patternId, fused.interactionId],
    },
  ];

  return {
    ok: true,
    value: {
      version: M55_NARRATIVE_SPEC_VERSION,
      surface: 'personal_free',
      openingHit: {
        text: compactSentencesJa(depth.value.headlineJa, 2),
        provenanceIds: [fused.id, fused.manifestation.patternId],
      },
      trustCue: {
        text: depth.value.trustCueJa,
        provenanceIds: ['free-depth-v4.trustCueJa'],
      },
      birthFoundation: {
        text: depth.value.birthBaseJa,
        provenanceIds: [...fused.birthEvidenceIds],
      },
      currentExpression: {
        text: depth.value.currentExpressionJa,
        provenanceIds: [...fused.answerEvidenceQuestionIds],
      },
      fusedDiscovery: {
        text: compactSentencesJa(fused.body, 2),
        provenanceIds: [fused.interactionId, fused.hingeAxisId],
      },
      contextSections: [
        {
          text: depth.value.primarySceneJa,
          provenanceIds: [fused.manifestation.patternId, 'scene.primary'],
        },
      ],
      strengthFriction: {
        strengthJa: depth.value.strengthConditionsJa[0] ?? '',
        frictionJa: depth.value.loadConditionsJa[0] ?? '',
        provenanceIds: ['strengthConditions', 'loadConditions'],
      },
      manualSpec: manual,
      actions: [],
      shareCandidates,
      inferenceIds: [
        fused.id,
        fused.interactionId,
        fused.manifestation.patternId,
        canonical.value.birthSignature.birthSignatureId,
      ],
    },
  };
}

export type PersonalFreeNarrativeShareContextV1 = {
  readonly narrative: M55NarrativeSpecV1;
  readonly answerAxes: ExpressionAxes;
  readonly birthAxes: ExpressionAxes;
  readonly hingeAxisId: ExpressionAxisId;
  readonly stemLaneIndex: number;
};

export function buildPersonalFreeNarrativeShareContextV1(
  input: FreeFiveViewInput,
): Result<PersonalFreeNarrativeShareContextV1> {
  const projected = projectPersonalFreeNarrativeV1(input);
  if (!projected.ok) return projected;
  const dobAxes = resolveDobAxes(input);
  if (!dobAxes.ok) return dobAxes;
  const free = resolveFreeAxes(input.freeAnswerSet);
  if (!free.ok) return free;
  const alignDiv = buildAlignDivergeItemsV1({
    dobAxes: dobAxes.value,
    freeAxes: free.value.axes,
    freeAnswerSet: input.freeAnswerSet,
  });
  if (!alignDiv.ok) return alignDiv;
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: input.birthDate });
  if (!canonical.ok) return canonical;
  const fused = buildPersonalFreeFusedInsightSpecV3({
    birth: canonical.value.birthSignature,
    answers: free.value.axes,
    alignItems: alignDiv.value.alignItems,
    divergeItems: alignDiv.value.divergeItems,
    modifiers: {
      stemLane: canonical.value.stemLane,
      lunarMonth: canonical.value.lunarMonth,
      season3: canonical.value.season3,
      dayBand: canonical.value.dayBand,
      tensionIds: canonical.value.tensionIds,
    },
  });
  return {
    ok: true,
    value: {
      narrative: projected.value,
      answerAxes: free.value.axes,
      birthAxes: canonical.value.birthSignature.dimensions,
      hingeAxisId: fused.hingeAxisId,
      stemLaneIndex: input.stemLaneIndex ?? canonical.value.stemLane,
    },
  };
}
