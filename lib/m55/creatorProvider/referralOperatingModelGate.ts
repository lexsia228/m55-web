import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { evaluateCreatorProviderPayoutReadinessV1 } from './providerPayoutReadinessPredicate';
import type { R8ProviderAccountSnapshotV1, R8TaxProfileRecordV1 } from './contract';
import { loadTaxProfileV1 } from './taxProfileRepository';

/**
 * Operating Model §8 referral gate (server-side). Uses the same predicate as UI readiness.
 * Identity dedup remains a separate Human gate — not auto-satisfied here.
 */
export async function isOperatingModelReferralGateMetV1(
  creatorEconomicIdentityId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .select('stripe_account_id,link_state,last_provider_snapshot')
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  let taxProfile: R8TaxProfileRecordV1 | null = null;
  try {
    taxProfile = await loadTaxProfileV1(creatorEconomicIdentityId);
  } catch {
    return false;
  }

  const snapshot = data.last_provider_snapshot as R8ProviderAccountSnapshotV1 | null;
  return evaluateCreatorProviderPayoutReadinessV1({
    stripeAccountId: (data.stripe_account_id as string | null) ?? null,
    linkState: data.link_state,
    snapshot,
    taxProfile,
  });
}
