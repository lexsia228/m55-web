import type {
  R8ProviderAccountSnapshotV1,
  R8ReadinessBlockReasonV1,
  R8StripeLinkStateV1,
} from './contract';

export type CreatorStripeOnboardingCtaV1 =
  | 'NONE'
  | 'START'
  | 'RESUME'
  | 'AWAITING_PROVIDER_SYNC'
  | 'CAPABILITY_INCOMPLETE_RESUME'
  | 'PROVIDER_ERROR_SUPPORT'
  | 'COMPLETE';

function snapshotLooksCapabilityComplete(snapshot: R8ProviderAccountSnapshotV1 | null): boolean {
  if (!snapshot) return false;
  return (
    snapshot.detailsSubmitted === true &&
    snapshot.payoutsEnabled === true &&
    snapshot.transfersCapability === 'active'
  );
}

export function deriveCreatorStripeOnboardingCtaV1(input: {
  providerPayoutReadinessGreen: boolean;
  providerLinkState: R8StripeLinkStateV1;
  taxProfileReady: boolean;
  blockReasons: R8ReadinessBlockReasonV1[];
  providerSnapshot: R8ProviderAccountSnapshotV1 | null;
}): CreatorStripeOnboardingCtaV1 {
  if (input.providerPayoutReadinessGreen) {
    return 'COMPLETE';
  }
  if (!input.taxProfileReady) {
    return 'NONE';
  }
  if (input.blockReasons.includes('PROVIDER_ERROR')) {
    return 'PROVIDER_ERROR_SUPPORT';
  }
  if (input.providerLinkState === 'BLOCKED' || input.providerLinkState === 'ERROR') {
    return 'PROVIDER_ERROR_SUPPORT';
  }
  if (input.providerLinkState === 'NOT_STARTED') {
    return 'START';
  }
  if (input.blockReasons.includes('PROVIDER_KYC_INCOMPLETE')) {
    return 'RESUME';
  }
  if (input.blockReasons.includes('PROVIDER_ONBOARDING_INCOMPLETE')) {
    return 'RESUME';
  }
  if (input.blockReasons.includes('PROVIDER_PAYOUTS_NOT_READY')) {
    if (snapshotLooksCapabilityComplete(input.providerSnapshot)) {
      return 'AWAITING_PROVIDER_SYNC';
    }
    if (
      input.providerLinkState === 'PAYOUTS_CAPABILITY_ACTIVE' ||
      input.providerLinkState === 'PROVIDER_DETAILS_SUBMITTED'
    ) {
      return 'CAPABILITY_INCOMPLETE_RESUME';
    }
    return 'AWAITING_PROVIDER_SYNC';
  }
  if (
    input.providerLinkState === 'ONBOARDING_LINK_ISSUED' ||
    input.providerLinkState === 'ACCOUNT_STUB' ||
    input.providerLinkState === 'PROVIDER_DETAILS_SUBMITTED'
  ) {
    return 'RESUME';
  }
  return 'RESUME';
}