import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { isProviderPayoutReadinessGreenV1, type R8ProviderAccountSnapshotV1 } from './contract';

/**
 * Operating Model §8 referral gate (server-side). Fail-closed when R8 tables missing or
 * provider readiness not green. Identity dedup is a separate Human gate — not auto-satisfied here.
 */
export async function isOperatingModelReferralGateMetV1(
  creatorEconomicIdentityId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .select('link_state,last_provider_snapshot')
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();

  if (error) {
    return false;
  }
  if (!data?.last_provider_snapshot) {
    return false;
  }

  const snapshot = data.last_provider_snapshot as R8ProviderAccountSnapshotV1;
  return isProviderPayoutReadinessGreenV1(data.link_state, snapshot);
}
