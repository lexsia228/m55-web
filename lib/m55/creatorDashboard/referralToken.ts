import { createHmac, randomUUID } from 'node:crypto';
import {
  M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1,
  assertCreatorTrackingTokenWireV1,
  digestCreatorTrackingTokenV1,
} from '../attribution/r5CreatorTrackingToken';
import { resolveTrustedCheckoutOrigin } from '../trustedCheckoutOrigin';

export const M55_CREATOR_REFERRAL_TOKEN_HMAC_PURPOSE_V1 =
  'm55.r7.creator.referral.token.body.v1' as const;

export const M55_R7_REFERRAL_TOKEN_SECRET_ENV = 'M55_CREATOR_REFERRAL_TOKEN_HMAC_SECRET_V1' as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeLinkUuidV1(linkId: string): string {
  if (!UUID_RE.test(linkId)) {
    throw new Error('INVALID_LINK_ID');
  }
  return linkId.toLowerCase();
}

export function mintReferralLinkIdV1(): string {
  return randomUUID();
}

export function requireReferralHmacSecretV1(): string {
  const raw = process.env[M55_R7_REFERRAL_TOKEN_SECRET_ENV];
  if (typeof raw !== 'string' || raw.trim().length < 32) {
    throw new Error('REFERRAL_TOKEN_SECRET_UNAVAILABLE');
  }
  return raw;
}

export function buildReferralTokenBodyV1(linkId: string, secret: string): string {
  const canonicalId = normalizeLinkUuidV1(linkId);
  const message = `${M55_CREATOR_REFERRAL_TOKEN_HMAC_PURPOSE_V1}\0${canonicalId}`;
  return createHmac('sha256', secret).update(message, 'utf8').digest('base64url');
}

export function buildReferralWireTokenV1(linkId: string, secret: string): string {
  const body = buildReferralTokenBodyV1(linkId, secret);
  const wire = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${body}`;
  assertCreatorTrackingTokenWireV1(wire);
  return wire;
}

export function digestReferralWireTokenV1(wireToken: string): string {
  return digestCreatorTrackingTokenV1(wireToken);
}

export function buildCanonicalShareUrlV1(canonicalOrigin: string, wireToken: string): string {
  const origin = canonicalOrigin.replace(/\/+$/, '');
  return `${origin}/m55/r#${wireToken}`;
}

export function resolveCreatorReferralShareOriginV1(input: {
  requestOrigin?: string | null;
}): string {
  return resolveTrustedCheckoutOrigin({ requestOrigin: input.requestOrigin });
}
