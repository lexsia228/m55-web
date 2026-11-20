import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideOnboardingSessionCreateV1 } from './providerOnboardingSessionLogic.ts';

describe('decideOnboardingSessionCreateV1', () => {
  it('reuses pending rows for the same client key', () => {
    assert.deepEqual(decideOnboardingSessionCreateV1({ existingStatus: 'PENDING' }), {
      action: 'reuse',
      reason: 'pending_row',
    });
  });

  it('rejects reinsert when prior session completed under same key', () => {
    assert.deepEqual(decideOnboardingSessionCreateV1({ existingStatus: 'COMPLETED' }), {
      action: 'reject',
      reason: 'client_idempotency_key_exhausted',
      priorStatus: 'COMPLETED',
    });
  });

  it('rejects reinsert when prior session expired under same key', () => {
    assert.deepEqual(decideOnboardingSessionCreateV1({ existingStatus: 'EXPIRED' }), {
      action: 'reject',
      reason: 'client_idempotency_key_exhausted',
      priorStatus: 'EXPIRED',
    });
  });
});
