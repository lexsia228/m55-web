import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { CREATOR_TERMS_VERSION, type ApplicationInput } from './contract';
import { hashInviteToken } from './invite';

export type CreatorPrimaryMediaVerification = null | 'ACTION_REQUIRED' | 'VERIFIED' | 'FAILED';

type PrimaryMediaProjectionRow = {
  is_primary?: boolean;
  control_verification_status: string;
  control_verification_method: string | null;
};

export function deriveCreatorPrimaryMediaVerification(
  mediaRows: PrimaryMediaProjectionRow[] | null | undefined,
): CreatorPrimaryMediaVerification {
  const primary = mediaRows?.find((row) => row.is_primary);
  if (!primary) return null;
  if (primary.control_verification_status === 'VERIFIED') return 'VERIFIED';
  if (primary.control_verification_status === 'FAILED') return 'FAILED';
  if (primary.control_verification_status === 'PENDING' && primary.control_verification_method != null) {
    return 'ACTION_REQUIRED';
  }
  return null;
}

export async function submitCreatorApplication(userId: string, input: ApplicationInput, mediaUrl: string) {
  // Generated Supabase types will learn this RPC after the unapplied migration is generated remotely.
  const { data, error } = await (getSupabaseAdmin() as any).rpc('m55_creator_submit_application_v1', {
    p_clerk_user_id: userId,
    p_source: input.inviteToken ? 'M55_SCOUT' : 'PUBLIC_APPLICATION',
    p_invite_hash: input.inviteToken ? hashInviteToken(input.inviteToken) : null,
    p_terms_version: CREATOR_TERMS_VERSION,
    p_age_18_plus: input.age18Plus,
    p_japan_resident: input.japanResident,
    p_content_focus: input.contentFocus,
    p_promotion_experience: input.promotionExperience || null,
    p_platform: input.platform,
    p_media_url: mediaUrl,
    p_handle: input.handle || null,
    p_audience_size: input.audienceSize ?? null,
    p_recent_avg_views: input.recentAvgViews ?? null,
  });
  if (error || !data) throw new Error('APPLICATION_SUBMIT_FAILED');
  return data as string;
}

export async function getCreatorPortal(userId: string) {
  const db = getSupabaseAdmin();
  const [apps, profile] = await Promise.all([
    db.from('m55_creator_applications')
      .select('id,status,application_source,source_campaign,terms_version,terms_accepted_at,submitted_at,rejected_reapply_after,m55_creator_application_media(is_primary,control_verification_status,control_verification_method)')
      .eq('clerk_user_id', userId).order('submitted_at', { ascending: false }).limit(1),
    db.from('m55_creator_profiles')
      .select('creator_code,first_final_approved_at,status,terms_version')
      .eq('clerk_user_id', userId).maybeSingle(),
  ]);
  if (apps.error || profile.error) throw new Error('PORTAL_UNAVAILABLE');
  type CreatorPortalApplicationRow = {
    id: string;
    status: string;
    application_source: string;
    source_campaign: string | null;
    terms_version: string;
    terms_accepted_at: string;
    submitted_at: string;
    rejected_reapply_after: string | null;
    m55_creator_application_media: PrimaryMediaProjectionRow[] | null;
  };
  const rawApplication = (apps.data?.[0] ?? null) as CreatorPortalApplicationRow | null;
  const application = rawApplication ? {
    id: rawApplication.id,
    status: rawApplication.status,
    application_source: rawApplication.application_source,
    source_campaign: rawApplication.source_campaign,
    terms_version: rawApplication.terms_version,
    terms_accepted_at: rawApplication.terms_accepted_at,
    submitted_at: rawApplication.submitted_at,
    rejected_reapply_after: rawApplication.rejected_reapply_after,
    primary_media_verification: deriveCreatorPrimaryMediaVerification(
      rawApplication.m55_creator_application_media as PrimaryMediaProjectionRow[] | null,
    ),
  } : null;
  return { application, profile: profile.data ?? null };
}

export async function getReviewQueue() {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('m55_creator_applications')
    .select('id,clerk_user_id,status,application_source,source_campaign,terms_version,terms_accepted_at,age_18_plus_attested,japan_resident_attested,content_focus_safe,promotion_experience_safe,submitted_at,m55_creator_application_media(id,platform,canonical_url,handle,is_primary,self_reported_audience_size,self_reported_recent_avg_views,control_verification_method,control_verification_status,verified_at)')
    .in('status', ['SUBMITTED','UNDER_REVIEW','NEED_MORE_INFO','TERMS_REACCEPT_REQUIRED'])
    .order('submitted_at', { ascending: true }).limit(100);
  if (error) throw new Error('REVIEW_QUEUE_UNAVAILABLE');
  return data ?? [];
}
