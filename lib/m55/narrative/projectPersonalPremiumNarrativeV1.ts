/**
 * Personal Premium narrative framing — wraps existing DTR payload.
 * Does not replace chapter bodies or invent Light/Full differences.
 */

import type { DtrPayload } from '../dtrEngine';
import type { PersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import type { ExpressionAxes } from '../individualization/types';
import {
  M55_NARRATIVE_SPEC_VERSION,
  type M55NarrativeSpecV1,
  type ShareCandidateV1,
} from './m55NarrativeSpecV1';
import { compactSentencesJa, firstSentenceJa, stripNicknameJa } from './narrativeSafetyV1';
import { buildPersonalManualV1 } from './personalManualV1';
import type { PremiumPurchasedSemanticProjectionV1 } from './buildPremiumPurchasedSemanticProjectionV1';

function sectionBody(payload: DtrPayload, id: string): string {
  return payload.fullSections.find((section) => section.id === id)?.body ?? '';
}

function sectionSummary(payload: DtrPayload, id: string): string {
  return payload.fullSections.find((section) => section.id === id)?.summary ?? '';
}

export function derivePremiumTakeawayJa(
  payload: DtrPayload,
  nickname?: string,
  projection?: PremiumPurchasedSemanticProjectionV1,
): string {
  if (projection?.takeawayJa.trim()) {
    return projection.takeawayJa;
  }
  const s1 = firstSentenceJa(stripNicknameJa(sectionSummary(payload, 's1_identity'), nickname));
  return s1;
}

export function projectPersonalPremiumNarrativeV1(input: {
  payload: DtrPayload;
  nickname?: string;
  stemLaneIndex: number;
  fused?: PersonalFreeFusedInsightSpecV3;
  axes?: ExpressionAxes;
  projection?: PremiumPurchasedSemanticProjectionV1;
}): M55NarrativeSpecV1 {
  const projection = input.projection;
  const takeaway = derivePremiumTakeawayJa(input.payload, input.nickname, projection);
  const s1 = compactSentencesJa(
    stripNicknameJa(sectionSummary(input.payload, 's1_identity'), input.nickname),
    2,
  );
  const s3 = compactSentencesJa(
    stripNicknameJa(sectionSummary(input.payload, 's3_essence'), input.nickname),
    2,
  );
  const s5 = compactSentencesJa(
    stripNicknameJa(sectionSummary(input.payload, 's5_friction'), input.nickname),
    2,
  );
  const s7 = compactSentencesJa(
    stripNicknameJa(sectionBody(input.payload, 's7_work'), input.nickname),
    2,
  );

  const manualBase = projection
    ? buildPersonalManualV1({
        axes: projection.axes,
        fused: projection.fused,
        completeness: 'complete',
      })
    : input.fused && input.axes
      ? buildPersonalManualV1({
          axes: input.axes,
          fused: input.fused,
          completeness: 'complete',
        })
      : {
          titleJa: '私の取扱説明書',
          slots: [],
          hiddenSpecJa: takeaway,
          hiddenSpecProvenanceIds: ['premium_purchased_projection'],
          completeness: 'complete' as const,
        };

  const manual =
    projection?.hiddenSpec && !manualBase.hiddenSpecJa.trim()
      ? {
          ...manualBase,
          hiddenSpecJa: projection.hiddenSpec.text,
          hiddenSpecProvenanceIds: [...projection.hiddenSpec.provenanceIds],
        }
      : manualBase;

  const shareCandidates: ShareCandidateV1[] = [
    {
      variant: 'premium_takeaway',
      labelJa: '今のあなたへ残す一文',
      headlineJa: '今のあなたへ残しておく一文',
      bodyJa: takeaway,
      ctaJa: 'M55 プレミアムレポートから',
      provenanceIds: projection
        ? ['premium_purchased_projection', projection.hingeAxisId]
        : ['s1_identity'],
    },
    {
      variant: 'hidden_spec',
      labelJa: '自分でも知らなかった仕様',
      headlineJa: '自分でも知らなかった仕様',
      bodyJa: manual.hiddenSpecJa || takeaway,
      ctaJa: 'M55 プレミアムレポートから',
      provenanceIds: manual.hiddenSpecProvenanceIds,
    },
  ];

  const nextAction = projection?.nextActionJa?.trim();
  const actions = nextAction
    ? [{ text: nextAction, provenanceIds: ['premium_purchased_projection'] as const }]
    : [];

  return {
    version: M55_NARRATIVE_SPEC_VERSION,
    surface: 'personal_premium',
    openingHit: {
      text: s1 || takeaway,
      provenanceIds: ['s1_identity'],
    },
    trustCue: {
      text: 'この読みは、いまのレポート本文から組み立てています。',
      provenanceIds: ['dtr_payload_v1'],
    },
    birthFoundation: {
      text: s1,
      provenanceIds: ['s1_identity'],
    },
    fusedDiscovery: {
      text: s3,
      provenanceIds: ['s3_essence'],
    },
    contextSections: [
      { text: s5, provenanceIds: ['s5_friction'] },
      { text: s7, provenanceIds: ['s7_work'] },
    ],
    strengthFriction: {
      strengthJa: firstSentenceJa(sectionSummary(input.payload, 's4_strengths')),
      frictionJa: firstSentenceJa(s5),
      provenanceIds: ['s4_strengths', 's5_friction'],
    },
    manualSpec: manual,
    actions,
    takeaway: {
      text: takeaway,
      provenanceIds: projection
        ? ['premium_purchased_projection', projection.hingeAxisId]
        : ['s1_identity'],
    },
    shareCandidates,
    inferenceIds: ['dtr_payload_v1', `stem.${input.stemLaneIndex}`],
  };
}

export const PREMIUM_NARRATIVE_JOURNEY_LABELS_JA = [
  '表紙 / 所有',
  'いちばん強い発見',
  '土台',
  '今回の出方',
  'なぜこれが自分か',
  '場面ごとの変化',
  '力と摩擦',
  '私の取扱説明書',
  '次の一歩',
  '今のあなたへ残す一文',
  '閉じ',
] as const;
