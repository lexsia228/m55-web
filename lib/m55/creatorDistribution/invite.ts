import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '../../supabaseAdmin';

export const INVITE_EXPIRY_DAYS = 14;
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
export function createInviteToken(): string { return randomBytes(32).toString('base64url'); }

export async function issueScoutInvite(reviewerId: string, campaign?: string) {
  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86400_000).toISOString();
  // This local gate intentionally does not regenerate database types before migration apply.
  const { data, error } = await (getSupabaseAdmin() as any).from('m55_creator_invites').insert({
    token_hash: hashInviteToken(token), source_campaign: campaign?.slice(0, 120) || null,
    issued_by_reviewer_clerk_user_id: reviewerId, expires_at: expiresAt,
  }).select('id').single();
  if (error || !data) throw new Error('INVITE_ISSUE_FAILED');
  return { token, id: data.id as string, expiresAt };
}

export async function findValidScoutInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;
  const { data, error } = await (getSupabaseAdmin() as any).from('m55_creator_invites')
    .select('id,token_hash,status,expires_at,source_campaign').eq('token_hash', hashInviteToken(token)).maybeSingle();
  if (error || !data || data.status !== 'ISSUED' || new Date(data.expires_at).getTime() <= Date.now()) return null;
  const expected = Buffer.from(data.token_hash, 'hex');
  const supplied = Buffer.from(hashInviteToken(token), 'hex');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return { id: data.id as string, sourceCampaign: data.source_campaign as string | null };
}
