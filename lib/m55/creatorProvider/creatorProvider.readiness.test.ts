import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicReadinessSnapshotV1 } from './readinessModel.ts';

const eligibleTax = {
  schemaVersion: '2026-10-29-v1' as const,
  taxResidency: 'JAPAN_RESIDENT' as const,
  payeeType: 'INDIVIDUAL' as const,
  invoiceRegistrationStatus: 'NOT_REGISTERED' as const,
  invoiceRegistrationNumberIfAny: null,
  withholdingClassification: 'ORDINARY_JP_AFFILIATE_V1_ZERO' as const,
  taxProfileEffectiveAt: '2026-10-29T00:00:00.000Z',
  v1JapanResidentAttested: true as const,
  v1Age18PlusAttested: true as const,
};

describe('R8-A readiness — §8 vs deployed R7', () => {
  it('does not treat R7 eligibility alone as §8 revenue-ready before provider/tax', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'ACTIVE',
      r7ReferralIssueEligible: true,
      complianceBlocksReferral: false,
      taxProfileReady: false,
      taxProfile: null,
      linkState: 'NOT_STARTED',
      providerSnapshot: null,
      stripeAccountId: null,
      providerLastSyncedAt: null,
      providerDowngradeActive: false,
      v1JapanBlocked: false,
    });
    assert.equal(snapshot.r7ReferralIssueEligible, true);
    assert.equal(snapshot.operatingModelReferralGateMet, false);
    assert.ok(snapshot.operatingModelSteps.includes('REFERRAL_URL_ACTIVE_DEPLOYED_R7'));
    assert.ok(!snapshot.operatingModelSteps.includes('REFERRAL_URL_ACTIVE_OPERATING_MODEL'));
  });

  it('surfaces awaiting Human final approval after provider green while pending activation', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'APPROVED_PENDING_ACTIVATION',
      r7ReferralIssueEligible: false,
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
      providerLastSyncedAt: new Date().toISOString(),
      providerDowngradeActive: false,
      v1JapanBlocked: false,
    });
    assert.ok(snapshot.blockReasons.includes('AWAITING_HUMAN_FINAL_APPROVAL'));
    assert.equal(snapshot.providerPayoutReadinessGreen, true);
  });

  it('denies green when link_state BLOCKED despite green snapshot', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'ACTIVE',
      r7ReferralIssueEligible: true,
      complianceBlocksReferral: false,
      taxProfileReady: true,
      taxProfile: eligibleTax,
      linkState: 'BLOCKED',
      stripeAccountId: 'acct_test',
      providerSnapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      },
      providerLastSyncedAt: new Date().toISOString(),
      providerDowngradeActive: false,
      v1JapanBlocked: false,
    });
    assert.equal(snapshot.providerPayoutReadinessGreen, false);
    assert.equal(snapshot.operatingModelReferralGateMet, false);
  });
});
