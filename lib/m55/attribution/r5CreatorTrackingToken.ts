import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { CreatorTrackingTokenRegistryErrorCodeV1 } from './r5TouchIngestContract';

export const M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1 = 'm55ct1.' as const;
export const M55_CREATOR_TRACKING_TOKEN_DIGEST_PURPOSE_V1 =
  'm55.r5.creator.tracking.token.v1' as const;

const BASE64URL_BODY_RE = /^[A-Za-z0-9_-]{40,128}$/;

export function assertCreatorTrackingTokenWireV1(raw: string): void {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('INVALID_TOKEN');
  }
  if (!raw.startsWith(M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1)) {
    throw new Error('INVALID_TOKEN');
  }
  const body = raw.slice(M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1.length);
  if (!BASE64URL_BODY_RE.test(body)) {
    throw new Error('INVALID_TOKEN');
  }
  if (raw !== raw.trim()) {
    throw new Error('INVALID_TOKEN');
  }
}

export function digestCreatorTrackingTokenV1(raw: string): string {
  assertCreatorTrackingTokenWireV1(raw);
  return createHash('sha256')
    .update(M55_CREATOR_TRACKING_TOKEN_DIGEST_PURPOSE_V1, 'utf8')
    .update('\0', 'utf8')
    .update(raw, 'utf8')
    .digest('hex');
}

export type CreatorTrackingTokenRegistryContextV1 =
  | {
      ok: true;
      tokenDigest: string;
      tokenVersion: 'v1';
    }
  | {
      ok: false;
      errorCode: CreatorTrackingTokenRegistryErrorCodeV1;
    };

export async function resolveCreatorTrackingTokenFromRegistryV1(
  rawToken: string,
): Promise<CreatorTrackingTokenRegistryContextV1> {
  let tokenDigest: string;
  try {
    tokenDigest = digestCreatorTrackingTokenV1(rawToken);
  } catch {
    return { ok: false, errorCode: 'INVALID_TOKEN' };
  }

  const db = getSupabaseAdmin() as any;
  const { data: link, error: linkError } = await db
    .from('m55_creator_referral_links')
    .select('id, creator_profile_id, creator_economic_identity_id, ingest_state, token_version')
    .eq('token_digest', tokenDigest)
    .eq('token_version', 'v1')
    .maybeSingle();

  if (linkError || !link) {
    return { ok: false, errorCode: 'REFERRAL_LINK_NOT_FOUND' };
  }

  if (link.ingest_state !== 'ACTIVE') {
    return { ok: false, errorCode: 'LINK_NOT_ACTIVE' };
  }

  const { data: profile, error: profileError } = await db
    .from('m55_creator_profiles')
    .select('id, economic_identity_id, status, clerk_user_id')
    .eq('id', link.creator_profile_id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, errorCode: 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH' };
  }

  if (profile.economic_identity_id !== link.creator_economic_identity_id) {
    return { ok: false, errorCode: 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH' };
  }

  if (profile.status !== 'ACTIVE') {
    return { ok: false, errorCode: 'CREATOR_NOT_ACTIVE' };
  }

  return { ok: true, tokenDigest, tokenVersion: 'v1' };
}

export async function issueCreatorTrackingTokenV1ForTests(args: {
  creatorProfileId: string;
  creatorEconomicIdentityId: string;
}): Promise<{ rawToken: string; tokenDigest: string }> {
  const rawToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${randomBytes(32).toString('base64url')}`;
  const tokenDigest = digestCreatorTrackingTokenV1(rawToken);
  const db = getSupabaseAdmin() as any;
  const { error } = await db.from('m55_creator_referral_links').insert({
    creator_profile_id: args.creatorProfileId,
    creator_economic_identity_id: args.creatorEconomicIdentityId,
    token_version: 'v1',
    token_digest: tokenDigest,
    ingest_state: 'ACTIVE',
  });
  if (error) {
    throw new Error('TEST_TOKEN_ISSUE_FAILED');
  }
  return { rawToken, tokenDigest };
}

export function mapRegistryErrorToHttpError(
  errorCode: CreatorTrackingTokenRegistryErrorCodeV1,
): string {
  if (errorCode === 'REFERRAL_LINK_NOT_FOUND') {
    return 'INVALID_TOKEN';
  }
  return errorCode;
}
