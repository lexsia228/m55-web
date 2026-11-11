import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveStripeAccountBindingV1,
  stableProviderCreateIdempotencyKeyV1,
} from './providerAccountBindingLogic.ts';

describe('provider account binding logic', () => {
  it('uses stable server-owned create idempotency key per economic identity', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    assert.equal(
      stableProviderCreateIdempotencyKeyV1(id),
      stableProviderCreateIdempotencyKeyV1(id),
    );
    assert.doesNotMatch(stableProviderCreateIdempotencyKeyV1(id), /client/);
  });

  it('rejects rebinding a different stripe account id', () => {
    const result = resolveStripeAccountBindingV1({
      existingStripeAccountId: 'acct_existing',
      incomingStripeAccountId: 'acct_other',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'PROVIDER_ACCOUNT_BINDING_CONFLICT');
  });

  it('allows idempotent retry with the same account id', () => {
    const result = resolveStripeAccountBindingV1({
      existingStripeAccountId: 'acct_same',
      incomingStripeAccountId: 'acct_same',
    });
    assert.deepEqual(result, { ok: true, action: 'noop' });
  });
});
