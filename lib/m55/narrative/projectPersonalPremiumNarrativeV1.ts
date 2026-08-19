/**
 * Personal Premium narrative framing — wraps existing DTR payload.
 * Does not replace chapter bodies or invent Light/Full differences.
 */

import type { DtrPayload } from '../dtrEngine';
import { PAID_DTR_DEEP_READING_TAKEAWAYS } from '../paidDtrProductCopy';
import type { PersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import type { ExpressionAxes } from '../individualization/types';
import {
  M55_NARRATIVE_SPEC_VERSION,
  type M55NarrativeSpecV1,
  type ShareCandidateV1,
} from './m55NarrativeSpecV1';
import { compactSentencesJa, firstSentenceJa, stripNicknameJa } from './narrativeSafetyV1';
import { buildPersonalManualV1 } from './personalManualV1';

function sectionBody(payload: DtrPayload, id: string): string {
  return payload.fullSections.find((section) => section.id === id)?.body ?? '';
}

function sectionSummary(payload: DtrPayload, id: string): string {
  return payload.fullSections.find((section) => section.id === id)?.summary ?? '';
}

export function derivePremiumTakeawayJa(payload: DtrPayload, nickname?: string): string {
  const fromCatalog = PAID_DTR_DEEP_READING_TAKEAWAYS['1']?.itemsJa[2] ?? '';
  const s7 = firstSentenceJa(stripNicknameJa(sectionBody(payload, 's7_work'), nickname));
  const s1 = firstSentenceJa(stripNicknameJa(sectionSummary(payload, 's1_identity'), nickname));
  return s7 || s1 || fromCatalog;
}

export function projectPersonalPremiumNarrativeV1(input: {
  payload: DtrPayload;
  nickname?: string;
  stemLaneIndex: number;
  fused?: PersonalFreeFusedInsightSpecV3;
  axes?: ExpressionAxes;
}): M55NarrativeSpecV1 {
  const takeaway = derivePremiumTakeawayJa(input.payload, input.nickname);
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

  const s6 = compactSentencesJa(
    stripNicknameJa(sectionSummary(input.payload, 's6_relation'), input.nickname),
    1,
  );
  const s4 = firstSentenceJa(
    stripNicknameJa(sectionSummary(input.payload, 's4_strengths'), input.nickname),
  );
  const experiments = [
    firstSentenceJa(PAID_DTR_DEEP_READING_TAKEAWAYS['2']?.itemsJa[2] ?? ''),
    firstSentenceJa(PAID_DTR_DEEP_READING_TAKEAWAYS['3']?.itemsJa[2] ?? ''),
  ].filter((line) => line.length >= 4);
  const fallbackSlots = [
    s1
      ? {
          id: 'actual' as const,
          labelJa: '土台',
          bodyJa: firstSentenceJa(s1),
          provenanceIds: ['s1_identity'],
        }
      : null,
    s7
      ? {
          id: 'decision' as const,
          labelJa: '決め方',
          bodyJa: firstSentenceJa(s7),
          provenanceIds: ['s7_work'],
        }
      : null,
    s6
      ? {
          id: 'distance' as const,
          labelJa: '距離の取り方',
          bodyJa: firstSentenceJa(s6),
          provenanceIds: ['s6_relation'],
        }
      : null,
    s5
      ? {
          id: 'misread' as const,
          labelJa: '誤解されやすいところ',
          bodyJa: firstSentenceJa(s5),
          provenanceIds: ['s5_friction'],
        }
      : null,
    s4
      ? {
          id: 'start' as const,
          labelJa: '始め方',
          bodyJa: s4,
          provenanceIds: ['s4_strengths'],
        }
      : null,
    takeaway
      ? {
          id: 'talk_hint' as const,
          labelJa: '私と話すときのヒント',
          bodyJa: takeaway,
          provenanceIds: ['s7_work', 'paid_dtr_takeaway_1'],
        }
      : null,
    experiments[0]
      ? {
          id: 'recovery' as const,
          labelJa: '回復方法',
          bodyJa: experiments[0],
          provenanceIds: ['paid_dtr_takeaway'],
        }
      : null,
    experiments[1]
      ? {
          id: 'change' as const,
          labelJa: '変化への反応',
          bodyJa: experiments[1],
          provenanceIds: ['paid_dtr_takeaway'],
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item && item.bodyJa.trim().length >= 4));

  const manual =
    input.fused && input.axes
      ? buildPersonalManualV1({
          axes: input.axes,
          fused: input.fused,
          completeness: 'complete',
        })
      : {
          titleJa: '私の取扱説明書',
          slots: fallbackSlots.slice(0, 6),
          hiddenSpecJa: takeaway,
          hiddenSpecProvenanceIds: ['s7_work', 'paid_dtr_takeaway_1'],
          completeness: 'complete' as const,
        };

  const shareCandidates: ShareCandidateV1[] = [
    {
      variant: 'premium_takeaway',
      labelJa: '今のあなたへ残す一文',
      headlineJa: '今のあなたへ残しておく一文',
      bodyJa: takeaway,
      ctaJa: 'M55 プレミアムレポートから',
      provenanceIds: ['s7_work', 'paid_dtr_takeaway_1'],
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
    actions: experiments.map((text) => ({
      text,
      provenanceIds: ['paid_dtr_takeaway'],
    })),
    takeaway: {
      text: takeaway,
      provenanceIds: ['s7_work', 'paid_dtr_takeaway_1'],
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
  '一度だけ試すこと',
  '今のあなたへ残す一文',
  '閉じ',
] as const;
