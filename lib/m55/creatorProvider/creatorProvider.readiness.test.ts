import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicReadinessSnapshotV1 } from './readinessModel.ts';

describe('R8-A readiness — §8 vs deployed R7', () => {
  it('allows deployed R7 referral while Operating Model gate is open', () => {
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
    assert.ok(snapshot.blockReasons.includes('PAYOUT_SETTLEMENT_NOT_IMPLEMENTED'));
  });

  it('blocks onboarding actions messaging for suspended profiles', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'SUSPENDED',
      referralIssuePermittedDeployedR7: false,
      complianceBlocksReferral: false,
      taxProfileReady: true,
      linkState: 'NOT_STARTED',
      providerSnapshot: null,
      v1JapanBlocked: false,
    });
    assert.ok(snapshot.blockReasons.includes('PROFILE_SUSPENDED'));
  });
});
