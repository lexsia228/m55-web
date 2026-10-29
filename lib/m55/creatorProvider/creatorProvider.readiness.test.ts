import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicReadinessSnapshotV1 } from './readinessModel.ts';

describe('R8-A readiness — §8 vs deployed R7', () => {
  it('does not treat deployed R7 referral as §8 revenue-ready before ACTIVE', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'ACTIVE',
      referralIssuePermittedDeployedR7: true,
      complianceBlocksReferral: false,
      taxProfileReady: false,
      linkState: 'NOT_STARTED',
      providerSnapshot: null,
      v1JapanBlocked: false,
    });
    assert.equal(snapshot.referralIssuePermittedDeployedR7, true);
    assert.equal(snapshot.operatingModelReferralGateMet, false);
    assert.ok(snapshot.operatingModelSteps.includes('REFERRAL_URL_ACTIVE_DEPLOYED_R7'));
    assert.ok(!snapshot.operatingModelSteps.includes('REFERRAL_URL_ACTIVE_OPERATING_MODEL'));
  });

  it('surfaces awaiting Human final approval after provider green while pending activation', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'APPROVED_PENDING_ACTIVATION',
      referralIssuePermittedDeployedR7: false,
      complianceBlocksReferral: false,
      taxProfileReady: true,
      linkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      providerSnapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      },
      v1JapanBlocked: false,
    });
    assert.ok(snapshot.blockReasons.includes('AWAITING_HUMAN_FINAL_APPROVAL'));
    assert.equal(snapshot.providerPayoutReadinessGreen, true);
  });
});
