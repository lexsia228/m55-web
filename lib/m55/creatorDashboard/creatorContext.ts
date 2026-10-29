import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../supabaseAdmin';

export type CreatorProfileStatus =
  | 'APPROVED_PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED';

export type CreatorContextError =
  | 'UNAUTHORIZED'
  | 'CREATOR_PROFILE_REQUIRED'
  | 'PORTAL_UNAVAILABLE';

export type ResolvedCreatorContext =
  | { ok: false; error: CreatorContextError }
  | {
      ok: true;
      clerkUserId: string;
      creatorProfileId: string;
      creatorEconomicIdentityId: string;
      profileStatus: CreatorProfileStatus;
      referralIssuePermitted: boolean;
      dashboardHistoryReadable: boolean;
    };

const HISTORY_READABLE: ReadonlySet<CreatorProfileStatus> = new Set([
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
]);

export function isCreatorProfileActiveForR5ReferralTouchV1(
  profileStatus: CreatorProfileStatus,
): boolean {
  return profileStatus === 'ACTIVE';
}

export async function isCreatorReferralCapabilityPermittedV1(
  creatorEconomicIdentityId: string,
  profileStatus: CreatorProfileStatus,
): Promise<boolean> {
  if (!isCreatorProfileActiveForR5ReferralTouchV1(profileStatus)) {
    return false;
  }

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r5_compliance_cases')
    .select('case_id')
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .in('status', ['OPEN', 'HOLD'])
    .or(
      'decision.is.null,decision.eq.KEEP_HOLD,decision.eq.REQUEST_CORRECTION,decision.eq.PAUSE_CREATOR,decision.eq.TERMINATE_PARTNERSHIP',
    )
    .limit(1);

  if (error) {
    throw new Error('PORTAL_UNAVAILABLE');
  }

  return (data ?? []).length === 0;
}

export async function resolveCreatorContextFromSession(): Promise<ResolvedCreatorContext> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_creator_profiles')
    .select('id, economic_identity_id, status')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'PORTAL_UNAVAILABLE' };
  }
  if (!data?.id || !data.economic_identity_id) {
    return { ok: false, error: 'CREATOR_PROFILE_REQUIRED' };
  }

  const profileStatus = data.status as CreatorProfileStatus;
  const dashboardHistoryReadable = HISTORY_READABLE.has(profileStatus);
  let referralIssuePermitted = false;
  try {
    referralIssuePermitted = await isCreatorReferralCapabilityPermittedV1(
      data.economic_identity_id as string,
      profileStatus,
    );
  } catch {
    return { ok: false, error: 'PORTAL_UNAVAILABLE' };
  }

  return {
    ok: true,
    clerkUserId: userId,
    creatorProfileId: data.id as string,
    creatorEconomicIdentityId: data.economic_identity_id as string,
    profileStatus,
    referralIssuePermitted,
    dashboardHistoryReadable,
  };
}

export async function resolveCreatorContextForEconomicIdentity(
  clerkUserId: string,
  clientSuppliedEconomicIdentityId: string | null | undefined,
): Promise<ResolvedCreatorContext> {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) return ctx;
  if (ctx.clerkUserId !== clerkUserId) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  if (
    clientSuppliedEconomicIdentityId &&
    clientSuppliedEconomicIdentityId !== ctx.creatorEconomicIdentityId
  ) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  return ctx;
}
