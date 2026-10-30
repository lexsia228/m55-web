import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createFakeR8CPayoutTransferAdapterForTests,
  resolveR8CPayoutTransferAdapterV1,
} from './r8PayoutTransferAdapter.ts';

describe('R8-C payout transfer adapter — network disabled', () => {
  it('defaults to DISABLED outside explicit fake test double', async () => {
    const adapter = resolveR8CPayoutTransferAdapterV1();
    assert.equal(adapter.mode, 'DISABLED');
    const result = await adapter.createNetTransfer({
      instructionId: 'inst',
      netPayoutJpy: 1000,
      stripeConnectedAccountIdSuffix: 'abcd',
      idempotencyKey: 'xfer:1',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'TRANSFER_NETWORK_DISABLED');
  });

  it('fake test double still fail-closed while R8-C permanent disable flag is true', async () => {
    const fake = createFakeR8CPayoutTransferAdapterForTests();
    const result = await fake.createNetTransfer({
      instructionId: 'inst',
      netPayoutJpy: 1000,
      stripeConnectedAccountIdSuffix: 'abcd',
      idempotencyKey: 'xfer:2',
    });
    assert.equal(result.ok, false);
  });
});
