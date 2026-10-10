import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { ResolvedCreatorContext } from './creatorContext';
import {
  buildCanonicalShareUrlV1,
  buildReferralWireTokenV1,
  digestReferralWireTokenV1,
  mintReferralLinkIdV1,
  requireReferralHmacSecretV1,
} from './referralToken';

export const M55_R7_REFERRAL_ISSUE_RPC = 'm55_r7_creator_referral_issue_or_get_v1' as const;
export const M55_R7_REFERRAL_ROTATE_RPC = 'm55_r7_creator_referral_rotate_v1' as const;

export type ReferralShareSnapshotV1 = {
  activeLinkId: string;
  shareUrl: string;
  linkDisplayReference: string;
  issuedAt: string;
  legacyRotationRequired?: boolean;
};

export type ReferralLifecycleError =
  | 'REFERRAL_TOKEN_SECRET_UNAVAILABLE'
  | 'CREATOR_REFERRAL_NOT_PERMITTED'
  | 'REFERRAL_RPC_FAILED'
  | 'STALE_ACTIVE_LINK'
  | 'REFERRAL_LINK_ROTATION_REQUIRED'
  | 'PORTAL_UNAVAILABLE';

function mapRpcError(error: { message?: string; code?: string } | null): ReferralLifecycleError {
  const message = error?.message ?? '';
  if (message.includes('CREATOR_REFERRAL_NOT_PERMITTED')) return 'CREATOR_REFERRAL_NOT_PERMITTED';
  if (message.includes('STALE_ACTIVE_LINK')) return 'STALE_ACTIVE_LINK';
  if (message.includes('R7_REFERRAL_DUPLICATE_ACTIVE_PRECONDITION_FAILED')) {
    return 'REFERRAL_RPC_FAILED';
  }
  if (error?.code === '23505' || message.includes('unique')) {
    return 'REFERRAL_RPC_FAILED';
  }
  return 'REFERRAL_RPC_FAILED';
}

export async function loadActiveReferralLinkV1(
  creatorEconomicIdentityId: string,
): Promise<{ id: string; tokenDigest: string; createdAt: string } | null> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_creator_referral_links')
    .select('id, token_digest, created_at')
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .eq('ingest_state', 'ACTIVE')
    .maybeSingle();
  if (error) throw new Error('PORTAL_UNAVAILABLE');
  if (!data?.id || !data.token_digest || !data.created_at) return null;
  return {
    id: data.id as string,
    tokenDigest: data.token_digest as string,
    createdAt: data.created_at as string,
  };
}

function buildShareSnapshotV1(input: {
  linkId: string;
  wireToken: string;
  canonicalOrigin: string;
  linkDisplayReferenceFor: (linkId: string) => string;
  linkCreatedAt: string;
  legacyRotationRequired?: boolean;
}): ReferralShareSnapshotV1 {
  return {
    activeLinkId: input.linkId,
    shareUrl: input.legacyRotationRequired
      ? ''
      : buildCanonicalShareUrlV1(input.canonicalOrigin, input.wireToken),
    linkDisplayReference: input.linkDisplayReferenceFor(input.linkId),
    issuedAt: input.linkCreatedAt,
    legacyRotationRequired: input.legacyRotationRequired ?? false,
  };
}

function readShareUrlForActiveLinkV1(input: {
  active: { id: string; tokenDigest: string; createdAt: string };
  canonicalOrigin: string;
  linkDisplayReferenceFor: (linkId: string) => string;
}):
  | { ok: true; snapshot: ReferralShareSnapshotV1 }
  | { ok: false; error: ReferralLifecycleError } {
  let secret: string;
  try {
    secret = requireReferralHmacSecretV1();
  } catch {
    return { ok: false, error: 'REFERRAL_TOKEN_SECRET_UNAVAILABLE' };
  }

  const wireToken = buildReferralWireTokenV1(input.active.id, secret);
  const tokenDigest = digestReferralWireTokenV1(wireToken);

  if (input.active.tokenDigest !== tokenDigest) {
    return {
      ok: true,
      snapshot: {
        activeLinkId: input.active.id,
        shareUrl: '',
        linkDisplayReference: input.linkDisplayReferenceFor(input.active.id),
        issuedAt: input.active.createdAt,
        legacyRotationRequired: true,
      },
    };
  }

  return {
    ok: true,
    snapshot: buildShareSnapshotV1({
      linkId: input.active.id,
      wireToken,
      canonicalOrigin: input.canonicalOrigin,
      linkDisplayReferenceFor: input.linkDisplayReferenceFor,
      linkCreatedAt: input.active.createdAt,
    }),
  };
}

export async function issueOrGetReferralShareV1(input: {
  ctx: ResolvedCreatorContext & { ok: true };
  canonicalOrigin: string;
  linkDisplayReferenceFor: (linkId: string) => string;
}): Promise<
  | { ok: true; snapshot: ReferralShareSnapshotV1; created: boolean }
  | { ok: false; error: ReferralLifecycleError }
> {
  if (!input.ctx.referralIssuePermitted) {
    return { ok: false, error: 'CREATOR_REFERRAL_NOT_PERMITTED' };
  }

  let secret: string;
  try {
    secret = requireReferralHmacSecretV1();
  } catch {
    return { ok: false, error: 'REFERRAL_TOKEN_SECRET_UNAVAILABLE' };
  }

  const existing = await loadActiveReferralLinkV1(input.ctx.creatorEconomicIdentityId);
  const linkId = existing?.id ?? mintReferralLinkIdV1();
  const wireToken = buildReferralWireTokenV1(linkId, secret);
  const tokenDigest = digestReferralWireTokenV1(wireToken);

  if (existing && existing.tokenDigest !== tokenDigest) {
    return { ok: false, error: 'REFERRAL_LINK_ROTATION_REQUIRED' };
  }

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc(M55_R7_REFERRAL_ISSUE_RPC, {
    p_creator_profile_id: input.ctx.creatorProfileId,
    p_creator_economic_identity_id: input.ctx.creatorEconomicIdentityId,
    p_link_id: linkId,
    p_token_digest: tokenDigest,
  });

  if (error || !data) {
    return { ok: false, error: mapRpcError(error) };
  }

  const resolvedLinkId = data as string;
  if (resolvedLinkId !== linkId) {
    return { ok: false, error: 'REFERRAL_RPC_FAILED' };
  }

  const after = await loadActiveReferralLinkV1(input.ctx.creatorEconomicIdentityId);
  if (!after || after.id !== resolvedLinkId || after.tokenDigest !== tokenDigest) {
    return { ok: false, error: 'REFERRAL_RPC_FAILED' };
  }

  return {
    ok: true,
    created: !existing,
    snapshot: buildShareSnapshotV1({
      linkId: resolvedLinkId,
      wireToken,
      canonicalOrigin: input.canonicalOrigin,
      linkDisplayReferenceFor: input.linkDisplayReferenceFor,
      linkCreatedAt: after.createdAt,
    }),
  };
}

export async function rotateReferralShareV1(input: {
  ctx: ResolvedCreatorContext & { ok: true };
  canonicalOrigin: string;
  expectedActiveLinkId: string;
  linkDisplayReferenceFor: (linkId: string) => string;
}): Promise<
  | { ok: true; snapshot: ReferralShareSnapshotV1 }
  | { ok: false; error: ReferralLifecycleError }
> {
  if (!input.ctx.referralIssuePermitted) {
    return { ok: false, error: 'CREATOR_REFERRAL_NOT_PERMITTED' };
  }

  let secret: string;
  try {
    secret = requireReferralHmacSecretV1();
  } catch {
    return { ok: false, error: 'REFERRAL_TOKEN_SECRET_UNAVAILABLE' };
  }

  const active = await loadActiveReferralLinkV1(input.ctx.creatorEconomicIdentityId);
  if (!active || active.id !== input.expectedActiveLinkId) {
    return { ok: false, error: 'STALE_ACTIVE_LINK' };
  }

  const newLinkId = mintReferralLinkIdV1();
  const wireToken = buildReferralWireTokenV1(newLinkId, secret);
  const tokenDigest = digestReferralWireTokenV1(wireToken);

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc(M55_R7_REFERRAL_ROTATE_RPC, {
    p_creator_profile_id: input.ctx.creatorProfileId,
    p_creator_economic_identity_id: input.ctx.creatorEconomicIdentityId,
    p_expected_active_link_id: input.expectedActiveLinkId,
    p_new_link_id: newLinkId,
    p_new_token_digest: tokenDigest,
  });

  if (error || !data) {
    return { ok: false, error: mapRpcError(error) };
  }

  const resolvedLinkId = data as string;
  if (resolvedLinkId !== newLinkId) {
    return { ok: false, error: 'REFERRAL_RPC_FAILED' };
  }

  const after = await loadActiveReferralLinkV1(input.ctx.creatorEconomicIdentityId);
  if (!after || after.id !== resolvedLinkId || after.tokenDigest !== tokenDigest) {
    return { ok: false, error: 'REFERRAL_RPC_FAILED' };
  }

  return {
    ok: true,
    snapshot: buildShareSnapshotV1({
      linkId: resolvedLinkId,
      wireToken,
      canonicalOrigin: input.canonicalOrigin,
      linkDisplayReferenceFor: input.linkDisplayReferenceFor,
      linkCreatedAt: after.createdAt,
    }),
  };
}

export async function getCurrentReferralShareV1(input: {
  ctx: ResolvedCreatorContext & { ok: true };
  canonicalOrigin: string;
  linkDisplayReferenceFor: (linkId: string) => string;
}): Promise<
  | { ok: true; snapshot: ReferralShareSnapshotV1 | null }
  | { ok: false; error: ReferralLifecycleError }
> {
  if (!input.ctx.dashboardHistoryReadable) {
    return { ok: true, snapshot: null };
  }

  const active = await loadActiveReferralLinkV1(input.ctx.creatorEconomicIdentityId);
  if (!active) {
    return { ok: true, snapshot: null };
  }

  if (!input.ctx.referralIssuePermitted) {
    return {
      ok: true,
      snapshot: {
        activeLinkId: active.id,
        shareUrl: '',
        linkDisplayReference: input.linkDisplayReferenceFor(active.id),
        issuedAt: active.createdAt,
      },
    };
  }

  const read = readShareUrlForActiveLinkV1({
    active,
    canonicalOrigin: input.canonicalOrigin,
    linkDisplayReferenceFor: input.linkDisplayReferenceFor,
  });
  if (!read.ok) {
    return read;
  }
  return { ok: true, snapshot: read.snapshot };
}
