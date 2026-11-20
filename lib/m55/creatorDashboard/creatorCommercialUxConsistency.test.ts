import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { describeReferralIssueGateJa } from './creatorReferralUi';
import { deriveCreatorStripeOnboardingCtaV1 } from '../creatorProvider/creatorStripePortalUi';
import { buildPublicReadinessSnapshotV1 } from '../creatorProvider/readinessModel';
import { R8_PUBLIC_COMPATIBILITY_NOTE_JA } from '../creatorProvider/contract';

const root = process.cwd();

describe('creator commercial UX consistency', () => {
  it('exposes referral auth flags on dashboard API', () => {
    const route = readFileSync(join(root, 'app/api/creator/dashboard/route.ts'), 'utf8');
    assert.match(route, /referralIssuePermitted: ctx\.referralIssuePermitted/);
    assert.match(route, /r7ReferralIssueEligible: ctx\.r7ReferralIssueEligible/);
  });

  it('gates dashboard issue CTA on referralIssuePermitted', () => {
    const client = readFileSync(join(root, 'app/creator/dashboard/CreatorDashboardClient.tsx'), 'utf8');
    assert.match(client, /referralIssuePermitted/);
    assert.match(client, /canIssueNewReferral/);
    assert.match(client, /describeReferralIssueGateJa/);
  });

  it('classifies stale sync vs capability-incomplete via block reasons and snapshot', () => {
    const stale = deriveCreatorStripeOnboardingCtaV1({
      providerPayoutReadinessGreen: false,
      providerLinkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      taxProfileReady: true,
      blockReasons: ['PROVIDER_PAYOUTS_NOT_READY', 'PAYOUT_SETTLEMENT_NOT_IMPLEMENTED'],
      providerSnapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        transfersCapability: 'active',
        requirementsCurrentlyDueCount: 0,
      },
    });
    assert.equal(stale, 'AWAITING_PROVIDER_SYNC');

    const incomplete = deriveCreatorStripeOnboardingCtaV1({
      providerPayoutReadinessGreen: false,
      providerLinkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      taxProfileReady: true,
      blockReasons: ['PROVIDER_PAYOUTS_NOT_READY'],
      providerSnapshot: {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: false,
        transfersCapability: 'pending',
        requirementsCurrentlyDueCount: 1,
      },
    });
    assert.equal(incomplete, 'CAPABILITY_INCOMPLETE_RESUME');

    const kyc = deriveCreatorStripeOnboardingCtaV1({
      providerPayoutReadinessGreen: false,
      providerLinkState: 'ONBOARDING_LINK_ISSUED',
      taxProfileReady: true,
      blockReasons: ['PROVIDER_KYC_INCOMPLETE'],
      providerSnapshot: {
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        transfersCapability: 'inactive',
        requirementsCurrentlyDueCount: 2,
      },
    });
    assert.equal(kyc, 'RESUME');
  });

  it('gates referral rotate on canMutateReferral', () => {
    const client = readFileSync(join(root, 'app/creator/dashboard/CreatorDashboardClient.tsx'), 'utf8');
    assert.match(client, /canMutateReferral/);
    assert.match(client, /disabled=\{!canMutateReferral\}/);
  });

  it('uses public compatibility note without internal branch markers', () => {
    const snapshot = buildPublicReadinessSnapshotV1({
      profileStatus: 'ACTIVE',
      r7ReferralIssueEligible: true,
      complianceBlocksReferral: false,
      taxProfileReady: true,
      taxProfile: null,
      linkState: 'NOT_STARTED',
      providerSnapshot: null,
      stripeAccountId: null,
      providerLastSyncedAt: null,
      providerDowngradeActive: false,
      v1JapanBlocked: false,
    });
    assert.equal(snapshot.compatibilityNote, R8_PUBLIC_COMPATIBILITY_NOTE_JA);
    assert.doesNotMatch(snapshot.compatibilityNote, /R7|R8|docs\/planning/i);
  });

  it('aligns referral gate copy for eligible but blocked issue', () => {
    const message = describeReferralIssueGateJa({
      profileStatus: 'ACTIVE',
      referralIssuePermitted: false,
      r7ReferralIssueEligible: true,
      hasExistingLink: false,
    });
    assert.ok(message?.includes('新規発行'));
  });

  it('redirects approved creators away from application form', () => {
    const gate = readFileSync(join(root, 'app/creator/apply/ApplyPageClientGate.tsx'), 'utf8');
    const applyPage = readFileSync(join(root, 'app/creator/apply/page.tsx'), 'utf8');
    assert.match(gate, /すでにCreator登録があります/);
    assert.match(gate, /ACTIVE/);
    assert.match(applyPage, /ApplyPageClientGate/);
    assert.match(applyPage, /resolveApplyPortalGateV1/);
    assert.doesNotMatch(applyPage, /\.catch\(\(\) => null\)/);
    assert.match(gate, /portal_unavailable/);
  });

  it('parses provider link state without widening to plain string', () => {
    const panel = readFileSync(join(root, 'app/creator/_components/CreatorPayoutReadinessPanel.tsx'), 'utf8');
    assert.match(panel, /parseR8StripeLinkStateV1/);
    assert.match(panel, /R8PublicReadinessSnapshotV1/);
  });
});