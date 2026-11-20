import type { CreatorProfileStatus } from '../creatorDashboard/creatorContext';

/** §8 pre-activation: tax + Connect onboarding before Human FINAL → ACTIVE. */
export function isR8AProviderPlaneEditableV1(profileStatus: CreatorProfileStatus): boolean {
  return profileStatus === 'APPROVED_PENDING_ACTIVATION' || profileStatus === 'ACTIVE';
}

export function isR8AProviderPlaneReadOnlyV1(profileStatus: CreatorProfileStatus): boolean {
  return profileStatus === 'SUSPENDED' || profileStatus === 'REVOKED';
}

export function isR8AProviderPlaneVisibleV1(profileStatus: CreatorProfileStatus): boolean {
  return isR8AProviderPlaneEditableV1(profileStatus) || isR8AProviderPlaneReadOnlyV1(profileStatus);
}
