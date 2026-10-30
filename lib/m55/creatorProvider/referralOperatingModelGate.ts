import 'server-only';
import {
  getProviderEventStoreSingletonV1,
  isProviderDowngradeActiveV1,
} from './providerWebhookEventContract';
import { evaluateProviderDisbursementGateV1 } from './providerFreshness';
import { loadTaxProfileV1 } from './taxProfileRepository';
import { getSupabaseAdmin } from '../../supabaseAdmin';

export async function isOperatingModelReferralGateMetV1(
  creatorEconomicIdentityId: string,
): Promise<boolean> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r8_stripe_connected_accounts_v1')
    .select('stripe_account_id,link_state,last_provider_snapshot,last_synced_at')
    .eq('creator_economic_identity_id', creatorEconomicIdentityId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  let taxProfile = null;
  try {
    taxProfile = await loadTaxProfileV1(creatorEconomicIdentityId);
  } catch {
    return false;
  }

  const gate = evaluateProviderDisbursementGateV1({
    stripeAccountId: (data.stripe_account_id as string | null) ?? null,
    linkState: data.link_state,
    snapshot: data.last_provider_snapshot,
    taxProfile,
    lastSyncedAt: (data.last_synced_at as string | null) ?? null,
    asOfUtc: new Date(),
    providerDowngradeActive: isProviderDowngradeActiveV1(
      getProviderEventStoreSingletonV1(),
      creatorEconomicIdentityId,
    ),
  });

  return gate.referralTransferReadinessPermitted;
}
