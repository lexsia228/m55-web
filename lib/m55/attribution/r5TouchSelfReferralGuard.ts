import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { isValidClerkUserId } from '../accountDeletionClerkWebhookContract';
import {
  interpretSupabaseMaybeSingleReadV1,
  type TouchAdmissionServerContextV1,
} from './r5TouchIngestContract';
import {
  decodePostgrestByteaToBufferV1,
  encodeByteaForPostgrestRpcV1,
  isContinuationTouchTripleBound,
} from './r5TouchContinuation';
import {
  isPersistableQualifiedActionKind,
  isSha256LowerHex64,
} from './r5TouchSchemaContract';

type ContinuationRow = {
  token_digest: string;
  token_version: string;
  qualified_action_kind: string;
  touch_event_key_bytes: Buffer | null;
  qualified_touch_at_ms: number | null;
  payload_fingerprint: string | null;
  expires_at: string;
};

type LinkRow = {
  creator_profile_id: string;
  creator_economic_identity_id: string;
  ingest_state: string;
};

type ProfileRow = {
  clerk_user_id: string;
  economic_identity_id: string;
  status: string;
};

async function loadContinuationRow(
  continuationIdBytes: Buffer,
): Promise<ContinuationRow | null> {
  const db = getSupabaseAdmin() as any;
  const continuationIdHex = encodeByteaForPostgrestRpcV1(continuationIdBytes);
  const { data, error } = await db
    .from('m55_r5_attribution_touch_continuations')
    .select(
      'token_digest, token_version, qualified_action_kind, touch_event_key_bytes, qualified_touch_at_ms, payload_fingerprint, expires_at',
    )
    .eq('continuation_id', continuationIdHex)
    .maybeSingle();

  const interpreted = interpretSupabaseMaybeSingleReadV1<Record<string, unknown>>({ data, error });
  if (interpreted.status === 'empty') return null;
  const row = interpreted.row;
  return {
    token_digest: row.token_digest as string,
    token_version: row.token_version as string,
    qualified_action_kind: row.qualified_action_kind as string,
    touch_event_key_bytes: decodePostgrestByteaToBufferV1(row.touch_event_key_bytes),
    qualified_touch_at_ms:
      row.qualified_touch_at_ms === null || row.qualified_touch_at_ms === undefined
        ? null
        : Number(row.qualified_touch_at_ms),
    payload_fingerprint: (row.payload_fingerprint as string | null) ?? null,
    expires_at: row.expires_at as string,
  };
}

async function loadLinkAndProfile(tokenDigest: string): Promise<
  | { ok: true; link: LinkRow; profile: ProfileRow }
  | { ok: false; errorCode: 'REFERRAL_LINK_NOT_FOUND' | 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH' }
> {
  const db = getSupabaseAdmin() as any;
  const { data: link, error: linkError } = await db
    .from('m55_creator_referral_links')
    .select('creator_profile_id, creator_economic_identity_id, ingest_state')
    .eq('token_digest', tokenDigest)
    .eq('token_version', 'v1')
    .maybeSingle();

  const interpretedLink = interpretSupabaseMaybeSingleReadV1<LinkRow>({
    data: link,
    error: linkError,
  });
  if (interpretedLink.status === 'empty') {
    return { ok: false, errorCode: 'REFERRAL_LINK_NOT_FOUND' };
  }

  const { data: profile, error: profileError } = await db
    .from('m55_creator_profiles')
    .select('clerk_user_id, economic_identity_id, status')
    .eq('id', interpretedLink.row.creator_profile_id)
    .maybeSingle();

  const interpretedProfile = interpretSupabaseMaybeSingleReadV1<ProfileRow>({
    data: profile,
    error: profileError,
  });
  if (interpretedProfile.status === 'empty') {
    return { ok: false, errorCode: 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH' };
  }

  if (interpretedProfile.row.economic_identity_id !== interpretedLink.row.creator_economic_identity_id) {
    return { ok: false, errorCode: 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH' };
  }

  return { ok: true, link: interpretedLink.row, profile: interpretedProfile.row };
}

export async function resolveTouchAdmissionServerContextV1(args: {
  continuationIdBytes: Buffer;
  buyerClerkUserId: string;
}): Promise<TouchAdmissionServerContextV1> {
  if (!isValidClerkUserId(args.buyerClerkUserId)) {
    return { ok: false, errorCode: 'CONTINUATION_INVALID' };
  }

  const continuation = await loadContinuationRow(args.continuationIdBytes);
  if (!continuation) {
    return { ok: false, errorCode: 'CONTINUATION_NOT_FOUND' };
  }

  if (new Date(continuation.expires_at).getTime() <= Date.now()) {
    return { ok: false, errorCode: 'CONTINUATION_EXPIRED' };
  }

  if (!isPersistableQualifiedActionKind(continuation.qualified_action_kind)) {
    return { ok: false, errorCode: 'CONTINUATION_INVALID' };
  }

  if (continuation.token_version !== 'v1' || !isSha256LowerHex64(continuation.token_digest)) {
    return { ok: false, errorCode: 'CONTINUATION_INVALID' };
  }

  const bound = isContinuationTouchTripleBound(continuation);
  const resolved = await loadLinkAndProfile(continuation.token_digest);
  if (!resolved.ok) {
    return { ok: false, errorCode: resolved.errorCode };
  }

  const { link, profile } = resolved;

  if (!bound) {
    if (link.ingest_state !== 'ACTIVE') {
      return { ok: false, errorCode: 'LINK_NOT_ACTIVE' };
    }
    if (profile.status !== 'ACTIVE') {
      return { ok: false, errorCode: 'CREATOR_NOT_ACTIVE' };
    }
    if (profile.clerk_user_id === args.buyerClerkUserId) {
      return { ok: false, errorCode: 'SELF_REFERRAL' };
    }
  }

  return {
    ok: true,
    tokenDigest: continuation.token_digest,
    tokenVersion: 'v1',
    qualifiedActionKind: continuation.qualified_action_kind,
    creatorClerkUserId: profile.clerk_user_id,
    isBound: bound,
    boundTouchEventKeyBytes: bound ? continuation.touch_event_key_bytes : null,
    boundQualifiedTouchAtMs: bound ? continuation.qualified_touch_at_ms : null,
    boundPayloadFingerprint: bound ? continuation.payload_fingerprint : null,
  };
}
