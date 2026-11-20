export const R8_C_PAYOUT_TRANSFER_NETWORK_PERMANENTLY_DISABLED = true as const;

export type R8CPayoutTransferRequestV1 = {
  instructionId: string;
  netPayoutJpy: number;
  stripeConnectedAccountIdSuffix: string;
  idempotencyKey: string;
};

export type R8CPayoutTransferResultV1 =
  | { ok: false; reason: 'TRANSFER_NETWORK_DISABLED' }
  | { ok: true; providerTransferId: string; mode: 'FAKE_TEST_DOUBLE' };

export interface R8CPayoutTransferAdapterV1 {
  mode: 'DISABLED' | 'FAKE_TEST_DOUBLE';
  createNetTransfer(input: R8CPayoutTransferRequestV1): Promise<R8CPayoutTransferResultV1>;
}

function disabledAdapter(): R8CPayoutTransferAdapterV1 {
  return {
    mode: 'DISABLED',
    async createNetTransfer() {
      return { ok: false, reason: 'TRANSFER_NETWORK_DISABLED' };
    },
  };
}

/** Production and Preview always fail-closed — no env flag can enable network transfer in R8-C. */
export function resolveR8CPayoutTransferAdapterV1(): R8CPayoutTransferAdapterV1 {
  if (process.env.NODE_ENV === 'production') {
    return disabledAdapter();
  }
  if (process.env.M55_R8_PAYOUT_TRANSFER_FAKE_TEST_DOUBLE === '1') {
    return createFakeR8CPayoutTransferAdapterForTests();
  }
  return disabledAdapter();
}

export function createFakeR8CPayoutTransferAdapterForTests(): R8CPayoutTransferAdapterV1 {
  return {
    mode: 'FAKE_TEST_DOUBLE',
    async createNetTransfer(input) {
      if (R8_C_PAYOUT_TRANSFER_NETWORK_PERMANENTLY_DISABLED) {
        return { ok: false, reason: 'TRANSFER_NETWORK_DISABLED' };
      }
      return {
        ok: true,
        providerTransferId: `tr_fake_${input.idempotencyKey.slice(0, 24)}`,
        mode: 'FAKE_TEST_DOUBLE',
      };
    },
  };
}
