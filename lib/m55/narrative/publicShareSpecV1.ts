/**
 * PublicShareSpecV1 — sanitized, separately testable public share contract.
 * Derived from private narrative; never serializes the private reading.
 */

import {
  assertSharePayloadPrivacySafe,
  CANONICAL_PRODUCTION_ORIGIN,
  resolveShareAbsoluteUrl,
} from '../freeResult/privacySafeShareCardV1';
import type { M55NarrativeSurface, ShareCandidateVariant } from './m55NarrativeSpecV1';
import { assertNarrativeCopySafe, narrativeSafetyHits, paidContentWouldLeak } from './narrativeSafetyV1';

export const PUBLIC_SHARE_SPEC_VERSION = 'public_share_v1' as const;

export type PublicShareImageSpecV1 = {
  readonly kind: 'og';
  readonly path: string;
};

export type PublicShareSpecV1 = {
  readonly version: typeof PUBLIC_SHARE_SPEC_VERSION;
  readonly surface: M55NarrativeSurface;
  readonly variant: ShareCandidateVariant;
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  readonly canonicalUrl: string;
  readonly imageSpec: PublicShareImageSpecV1;
  readonly publicProvenanceIds: readonly string[];
  readonly token: string;
  readonly sharePath: string;
  readonly shareTextJa: string;
};

const FORBIDDEN_PUBLIC_ID =
  /dob|birthDate|answer|userId|ownerId|reportId|email|focus|entitlement|payment|fingerprint|dal-v1|clerk/i;

export function assertPublicProvenanceIds(ids: readonly string[]): void {
  for (const id of ids) {
    if (FORBIDDEN_PUBLIC_ID.test(id) || /\d{4}-\d{2}-\d{2}/.test(id)) {
      throw new Error('public provenance id is not public-safe');
    }
  }
}

export function assertPublicShareSpecSafe(spec: PublicShareSpecV1): void {
  assertPublicProvenanceIds(spec.publicProvenanceIds);
  const blob = `${spec.headline}\n${spec.body}\n${spec.cta}\n${spec.shareTextJa}\n${spec.canonicalUrl}`;
  const hits = narrativeSafetyHits(blob);
  if (hits.length > 0) {
    throw new Error(`public share failed safety: ${hits.join(',')}`);
  }
  if (paidContentWouldLeak(blob) && spec.surface !== 'personal_premium') {
    throw new Error('public share would leak paid content');
  }
  if (spec.surface === 'personal_premium' && paidContentWouldLeak(spec.body)) {
    throw new Error('premium public share must not dump chapter body');
  }
  assertNarrativeCopySafe(blob);
  assertSharePayloadPrivacySafe({
    title: 'M55',
    text: spec.shareTextJa,
    url: spec.canonicalUrl,
  });
  if (/[?&](dob|birth|nickname|answer|userId)=/i.test(spec.canonicalUrl)) {
    throw new Error('share URL contains sensitive query');
  }
}

export function resolvePublicShareAbsoluteUrl(sharePath: string, origin?: string): string {
  return resolveShareAbsoluteUrl(sharePath, origin ?? CANONICAL_PRODUCTION_ORIGIN);
}
