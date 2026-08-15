/**
 * X (Twitter) intent — text + URL only.
 * Does not pretend X attaches images. OG applies when the landing URL is posted.
 */

import type { PublicShareSpecV1 } from './publicShareSpecV1';
import { assertSharePayloadPrivacySafe } from '../freeResult/privacySafeShareCardV1';
import { assertNarrativeCopySafe } from './narrativeSafetyV1';

export const X_INTENT_ENDPOINT = 'https://x.com/intent/tweet' as const;

const FAKE_REACTION = /当たりすぎ|震えた|怖いくらい当たった/;

export function buildXShareIntentUrl(spec: PublicShareSpecV1): string {
  if (FAKE_REACTION.test(spec.shareTextJa)) {
    throw new Error('x share text contains fake endorsement');
  }
  assertNarrativeCopySafe(spec.shareTextJa);
  assertSharePayloadPrivacySafe({
    title: 'M55',
    text: spec.shareTextJa,
    url: spec.canonicalUrl,
  });
  const params = new URLSearchParams();
  params.set('text', spec.shareTextJa);
  params.set('url', spec.canonicalUrl);
  return `${X_INTENT_ENDPOINT}?${params.toString()}`;
}

export function xShareEncodedPreview(spec: PublicShareSpecV1): {
  readonly endpoint: typeof X_INTENT_ENDPOINT;
  readonly text: string;
  readonly url: string;
  readonly href: string;
} {
  const href = buildXShareIntentUrl(spec);
  return {
    endpoint: X_INTENT_ENDPOINT,
    text: spec.shareTextJa,
    url: spec.canonicalUrl,
    href,
  };
}
