/**
 * Build PublicShareSpecV1 from a private narrative candidate, or reconstruct from token.
 */

import { SHARE_ENTRY_PATH_PREFIX } from '../freeResult/privacySafeShareCardV1';
import type { M55NarrativeSpecV1, ShareCandidateV1, ShareCandidateVariant } from './m55NarrativeSpecV1';
import {
  PUBLIC_SHARE_SPEC_VERSION,
  assertPublicShareSpecSafe,
  resolvePublicShareAbsoluteUrl,
  type PublicShareSpecV1,
} from './publicShareSpecV1';
import {
  decodePublicShareToken,
  encodePublicShareToken,
  type PublicShareKeyV1,
} from './publicShareTokenV1';
import {
  reconstructGenericPublicCard,
  reconstructPairPublicCard,
  reconstructPersonalPublicCard,
} from './reconstructPublicCardV1';
import type { PairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import type { ExpressionAxisId, ExpressionAxes, StartTendency } from '../individualization/types';
import { firstSentenceJa } from './narrativeSafetyV1';
import { recommendPublicShareVariant } from './reconstructPublicCardV1';

function sharePathFor(token: string): string {
  return `${SHARE_ENTRY_PATH_PREFIX}/${token}`;
}

function specFromCard(input: {
  surface: PublicShareSpecV1['surface'];
  variant: ShareCandidateVariant;
  headline: string;
  body: string;
  cta: string;
  shareTextJa: string;
  token: string;
  provenanceIds: readonly string[];
  origin?: string;
}): PublicShareSpecV1 {
  const sharePath = sharePathFor(input.token);
  const spec: PublicShareSpecV1 = {
    version: PUBLIC_SHARE_SPEC_VERSION,
    surface: input.surface,
    variant: input.variant,
    headline: input.headline,
    body: input.body,
    cta: input.cta,
    canonicalUrl: resolvePublicShareAbsoluteUrl(sharePath, input.origin),
    imageSpec: { kind: 'og', path: `${sharePath}/opengraph-image` },
    publicProvenanceIds: input.provenanceIds,
    token: input.token,
    sharePath,
    shareTextJa: input.shareTextJa,
  };
  assertPublicShareSpecSafe(spec);
  return spec;
}

export function projectPersonalPublicShareV1(input: {
  narrative: M55NarrativeSpecV1;
  variant: ShareCandidateVariant;
  stemLaneIndex: number;
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
  hingeAxisId: ExpressionAxisId;
  origin?: string;
}): PublicShareSpecV1 | null {
  const candidate = input.narrative.shareCandidates.find((item) => item.variant === input.variant);
  if (!candidate) return null;
  const reconstructed = reconstructPersonalPublicCard({
    variant: input.variant,
    answerAxes: input.answerAxes,
    birthAxes: input.birthAxes,
    hingeAxisId: input.hingeAxisId,
  });
  if (!reconstructed) return null;
  const key: PublicShareKeyV1 = {
    kind: 'personal',
    surface: input.narrative.surface === 'personal_premium' ? 'personal_premium' : 'personal_free',
    variant: input.variant,
    stemLaneIndex: input.stemLaneIndex,
    answerAxes: input.answerAxes,
    birthAxes: input.birthAxes,
    hingeAxisId: input.hingeAxisId,
  };
  return specFromCard({
    surface: key.surface,
    variant: reconstructed.variant,
    headline: reconstructed.headline,
    body: reconstructed.body,
    cta: reconstructed.cta,
    shareTextJa: reconstructed.shareTextJa,
    token: encodePublicShareToken(key),
    provenanceIds: candidate.provenanceIds.filter((id) => !/\d{4}-\d{2}-\d{2}|dal-v1|free\./.test(id)),
    origin: input.origin,
  });
}

const START_FROM_NAME: Readonly<Record<string, StartTendency>> = {
  try: 'try',
  map: 'map',
  ask: 'ask',
};

export function pairStartsFromInsight(spec: PairFreeInsightSpecV2): {
  visibleStart?: StartTendency;
  inwardStart?: StartTendency;
} {
  const match = /:(try|map|ask)x(try|map|ask):/.exec(spec.manifestationPatternId);
  if (!match) return {};
  return {
    visibleStart: START_FROM_NAME[match[1]!],
    inwardStart: START_FROM_NAME[match[2]!],
  };
}

import type { RelationStatusId } from '../compatibility/pairReadingTypes';

const PAIR_SHARE_STATUS_LEAD: Readonly<Partial<Record<RelationStatusId, string>>> = {
  R1: 'まだ会話がない二人では、',
  R2: 'やり取りが始まった二人では、',
  R3: '付き合っている二人では、',
  R4: '距離ができている二人では、',
  R5: 'いま離れている二人では、',
  R6: '長く一緒にいる二人では、',
};

export function projectPairPublicShareV1(input: {
  spec: PairFreeInsightSpecV2;
  origin?: string;
}): PublicShareSpecV1 {
  const starts = pairStartsFromInsight(input.spec);
  const statusLead = PAIR_SHARE_STATUS_LEAD[input.spec.relationStatusId] ?? '';
  const mismatch = firstSentenceJa(input.spec.mismatchEntry);
  const trigger = firstSentenceJa(input.spec.relationshipTriggerJa);
  const coreInsight = trigger.includes(mismatch.slice(0, Math.min(12, mismatch.length)))
    ? trigger
    : mismatch;
  const shareInsight = `${statusLead}${coreInsight}`;
  const card = reconstructPairPublicCard({
    interactionId: input.spec.interactionId,
    relationStatusId: input.spec.relationStatusId,
    visibleStart: starts.visibleStart,
    inwardStart: starts.inwardStart,
    shareInsightJa: shareInsight,
  });
  const key: PublicShareKeyV1 = {
    kind: 'pair',
    surface: 'compatibility_free',
    variant: 'pair_manual',
    interactionId: input.spec.interactionId,
    visibleStart: starts.visibleStart,
    inwardStart: starts.inwardStart,
  };
  return specFromCard({
    surface: 'compatibility_free',
    variant: 'pair_manual',
    headline: card.headline,
    body: card.body,
    cta: card.cta,
    shareTextJa: card.shareTextJa,
    token: encodePublicShareToken(key),
    provenanceIds: [input.spec.interactionId],
    origin: input.origin,
  });
}

export function projectGenericPublicShareV1(input: {
  variant: 'pair_generic' | 'premium_takeaway';
  stemLaneIndex?: number;
  origin?: string;
}): PublicShareSpecV1 {
  const card = reconstructGenericPublicCard(input);
  const key: PublicShareKeyV1 = {
    kind: 'generic',
    surface: input.variant === 'pair_generic' ? 'compatibility_paid' : 'personal_premium',
    variant: input.variant,
    stemLaneIndex: input.stemLaneIndex,
  };
  return specFromCard({
    surface: key.surface,
    variant: input.variant,
    headline: card.headline,
    body: card.body,
    cta: card.cta,
    shareTextJa: card.shareTextJa,
    token: encodePublicShareToken(key),
    provenanceIds: [input.variant],
    origin: input.origin,
  });
}

export const PREMIUM_SHARE_IDENTITY_PERSISTENCE = 'PURCHASE_INPUT_SEMANTIC_PROJECTION_V1' as const;

/**
 * Premium share identity derives from frozen purchase input semantic projection
 * (answerAxes, birthAxes, hingeAxisId) — not sessionStorage or raw answers/DOB.
 */
export function projectPremiumPublicShareV1(input: {
  stemLaneIndex: number;
  answerAxes?: ExpressionAxes;
  birthAxes?: ExpressionAxes;
  hingeAxisId?: ExpressionAxisId;
  premiumTakeawayJa?: string;
  origin?: string;
}): PublicShareSpecV1 {
  if (input.answerAxes && input.birthAxes && input.hingeAxisId) {
    const reconstructed = reconstructPersonalPublicCard({
      variant: 'premium_takeaway',
      answerAxes: input.answerAxes,
      birthAxes: input.birthAxes,
      hingeAxisId: input.hingeAxisId,
      premiumTakeawayJa: input.premiumTakeawayJa,
    });
    if (reconstructed) {
      const key: PublicShareKeyV1 = {
        kind: 'personal',
        surface: 'personal_premium',
        variant: 'premium_takeaway',
        stemLaneIndex: input.stemLaneIndex,
        answerAxes: input.answerAxes,
        birthAxes: input.birthAxes,
        hingeAxisId: input.hingeAxisId,
      };
      return specFromCard({
        surface: 'personal_premium',
        variant: 'premium_takeaway',
        headline: reconstructed.headline,
        body: reconstructed.body,
        cta: reconstructed.cta,
        shareTextJa: reconstructed.shareTextJa,
        token: encodePublicShareToken(key),
        provenanceIds: ['premium_takeaway', input.hingeAxisId],
        origin: input.origin,
      });
    }
  }
  return projectGenericPublicShareV1({
    variant: 'premium_takeaway',
    stemLaneIndex: input.stemLaneIndex,
    origin: input.origin,
  });
}

export function resolvePublicShareSpecFromToken(
  token: string | null | undefined,
  origin?: string,
): PublicShareSpecV1 | null {
  const key = decodePublicShareToken(token);
  if (!key) return null;
  if (key.kind === 'generic') {
    return projectGenericPublicShareV1({
      variant: key.variant,
      stemLaneIndex: key.stemLaneIndex,
      origin,
    });
  }
  if (key.kind === 'pair') {
    const card = reconstructPairPublicCard({
      interactionId: key.interactionId,
      visibleStart: key.visibleStart,
      inwardStart: key.inwardStart,
    });
    return specFromCard({
      surface: 'compatibility_free',
      variant: 'pair_manual',
      headline: card.headline,
      body: card.body,
      cta: card.cta,
      shareTextJa: card.shareTextJa,
      token: encodePublicShareToken(key),
      provenanceIds: [key.interactionId],
      origin,
    });
  }
  const card = reconstructPersonalPublicCard({
    variant: key.variant,
    answerAxes: key.answerAxes,
    birthAxes: key.birthAxes,
    hingeAxisId: key.hingeAxisId,
  });
  if (!card) return null;
  return specFromCard({
    surface: key.surface,
    variant: card.variant,
    headline: card.headline,
    body: card.body,
    cta: card.cta,
    shareTextJa: card.shareTextJa,
    token: encodePublicShareToken(key),
    provenanceIds: [key.variant, key.hingeAxisId],
    origin,
  });
}

export function pickShareCandidate(
  narrative: M55NarrativeSpecV1,
  variant: ShareCandidateVariant,
): ShareCandidateV1 | null {
  return narrative.shareCandidates.find((item) => item.variant === variant) ?? null;
}

export { recommendPublicShareVariant };
