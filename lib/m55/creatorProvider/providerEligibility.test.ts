import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isR8AProviderPlaneEditableV1,
  isR8AProviderPlaneVisibleV1,
} from './providerEligibility.ts';

describe('R8-A provider plane eligibility — §8 pre-activation', () => {
  it('allows tax and onboarding for APPROVED_PENDING_ACTIVATION', () => {
    assert.equal(isR8AProviderPlaneEditableV1('APPROVED_PENDING_ACTIVATION'), true);
    assert.equal(isR8AProviderPlaneVisibleV1('APPROVED_PENDING_ACTIVATION'), true);
  });

  it('blocks SUSPENDED and REVOKED from editing', () => {
    assert.equal(isR8AProviderPlaneEditableV1('SUSPENDED'), false);
    assert.equal(isR8AProviderPlaneEditableV1('REVOKED'), false);
  });
});
