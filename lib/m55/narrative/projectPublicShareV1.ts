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
import type { ExpressionAxisId, ExpressionAxes } from '../individualization/types';

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

export function projectPairPublicShareV1(input: {
  spec: PairFreeInsightSpecV2;
  origin?: string;
}): PublicShareSpecV1 {
  const card = reconstructPairPublicCard(input.spec.interactionId);
  const key: PublicShareKeyV1 = {
    kind: 'pair',
    surface: 'compatibility_free',
    variant: 'pair_manual',
    interactionId: input.spec.interactionId,
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
    const card = reconstructPairPublicCard(key.interactionId);
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
