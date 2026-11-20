import type { R8ProviderAccountSnapshotV1 } from './contract';
import { evaluateCreatorProviderPayoutReadinessV1 } from './providerPayoutReadinessPredicate';

export const R8_C_PROVIDER_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ProviderSnapshotFreshnessV1 = 'FRESH' | 'STALE' | 'MISSING';

export type ProviderDisbursementGateV1 = {
  disbursementPermitted: false;
  referralTransferReadinessPermitted: boolean;
  blockReasons: Array<
    | 'PROVIDER_SNAPSHOT_MISSING'
    | 'PROVIDER_SNAPSHOT_STALE'
    | 'PROVIDER_CAPABILITY_DOWNGRADE'
    | 'PROVIDER_PAYOUT_READINESS_NOT_MET'
  >;
  freshness: ProviderSnapshotFreshnessV1;
};

export function evaluateProviderSnapshotFreshnessV1(input: {
  lastSyncedAt: string | null;
  asOfUtc: Date;
  snapshot: R8ProviderAccountSnapshotV1 | null;
}): ProviderSnapshotFreshnessV1 {
  if (!input.snapshot) return 'MISSING';
  if (!input.lastSyncedAt) return 'STALE';
  const syncedMs = Date.parse(input.lastSyncedAt);
  if (!Number.isFinite(syncedMs)) return 'STALE';
  if (input.asOfUtc.getTime() - syncedMs > R8_C_PROVIDER_SNAPSHOT_MAX_AGE_MS) return 'STALE';
  return 'FRESH';
}

export function evaluateProviderDisbursementGateV1(input: {
  stripeAccountId: string | null;
  linkState: Parameters<typeof evaluateCreatorProviderPayoutReadinessV1>[0]['linkState'];
  snapshot: R8ProviderAccountSnapshotV1 | null;
  taxProfile: Parameters<typeof evaluateCreatorProviderPayoutReadinessV1>[0]['taxProfile'];
  lastSyncedAt: string | null;
  asOfUtc: Date;
  providerDowngradeActive: boolean;
}): ProviderDisbursementGateV1 {
  const freshness = evaluateProviderSnapshotFreshnessV1({
    lastSyncedAt: input.lastSyncedAt,
    asOfUtc: input.asOfUtc,
    snapshot: input.snapshot,
  });
  const blockReasons: ProviderDisbursementGateV1['blockReasons'] = [];

  if (freshness === 'MISSING') blockReasons.push('PROVIDER_SNAPSHOT_MISSING');
  if (freshness === 'STALE') blockReasons.push('PROVIDER_SNAPSHOT_STALE');
  if (input.providerDowngradeActive) blockReasons.push('PROVIDER_CAPABILITY_DOWNGRADE');

  const readinessGreen =
    freshness === 'FRESH' &&
    !input.providerDowngradeActive &&
    evaluateCreatorProviderPayoutReadinessV1({
      stripeAccountId: input.stripeAccountId,
      linkState: input.linkState,
      snapshot: input.snapshot,
      taxProfile: input.taxProfile,
    });

  if (!readinessGreen) blockReasons.push('PROVIDER_PAYOUT_READINESS_NOT_MET');

  return {
    disbursementPermitted: false,
    referralTransferReadinessPermitted: readinessGreen,
    blockReasons: [...new Set(blockReasons)],
    freshness,
  };
}
