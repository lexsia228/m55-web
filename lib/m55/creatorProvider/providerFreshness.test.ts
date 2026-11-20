import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicReadinessSnapshotV1 } from './readinessModel.ts';
import {
  evaluateProviderDisbursementGateV1,
  evaluateProviderSnapshotFreshnessV1,
} from './providerFreshness.ts';
import {
  createProviderEventStoreV1,
  fixtureProviderPayoutCapabilityRevokedEventV1,
  ingestNormalizedProviderCapabilityEventV1,
} from './providerWebhookEventContract.ts';

const eligibleTax = {
  schemaVersion: '2026-10-29-v1' as const,
  taxResidency: 'JAPAN_RESIDENT' as const,
  payeeType: 'INDIVIDUAL' as const,
  invoiceRegistrationStatus: 'NOT_REGISTERED' as const,
  invoiceRegistrationNumberIfAny: null,
  withholdingClassification: 'ORDINARY_JP_AFFILIATE_V1_ZERO' as const,
  taxProfileEffectiveAt: '2026-10-29T00:00:00.000Z',
  v1JapanResidentAttested: true,
  v1Age18PlusAttested: true,
};

describe('R8-C provider freshness and downgrade', () => {
  it('marks stale snapshots as not disbursement-ready', () => {
    const freshness = evaluateProviderSnapshotFreshnessV1({
      lastSyncedAt: '2020-01-01T00:00:00.000Z',
      asOfUtc: new Date(),
      snapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      },
    });
    assert.equal(freshness, 'STALE');
  });

  it('blocks referral readiness after normalized downgrade event', () => {
    const store = createProviderEventStoreV1();
    const creatorId = '22222222-2222-4222-8222-222222222222';
    ingestNormalizedProviderCapabilityEventV1(
      store,
      creatorId,
      fixtureProviderPayoutCapabilityRevokedEventV1(),
    );
    const duplicate = ingestNormalizedProviderCapabilityEventV1(
      store,
      creatorId,
      fixtureProviderPayoutCapabilityRevokedEventV1(),
    );
    assert.equal(duplicate.ok, true);
    if (duplicate.ok) assert.equal(duplicate.duplicate, true);

    const gate = evaluateProviderDisbursementGateV1({
      stripeAccountId: 'acct_test',
      linkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      snapshot: fixtureProviderPayoutCapabilityRevokedEventV1().snapshotAfter,
      taxProfile: eligibleTax,
      lastSyncedAt: new Date().toISOString(),
      asOfUtc: new Date(),
      providerDowngradeActive: true,
    });
    assert.equal(gate.referralTransferReadinessPermitted, false);
    assert.ok(gate.blockReasons.includes('PROVIDER_CAPABILITY_DOWNGRADE'));
  });

  it('denies UI green when snapshot is stale despite green fields', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'ACTIVE',
      r7ReferralIssueEligible: true,
      complianceBlocksReferral: false,
      taxProfileReady: true,
      taxProfile: eligibleTax,
      linkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      stripeAccountId: 'acct_test',
      providerSnapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      },
      providerLastSyncedAt: '2020-01-01T00:00:00.000Z',
      providerDowngradeActive: false,
      v1JapanBlocked: false,
    });
    assert.equal(snapshot.providerPayoutReadinessGreen, false);
  });
});
