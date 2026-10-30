import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lockSettlementBatchDurableV1,
  resetDurableSettlementRepositoryForTests,
  stableFeeChargeIdempotencyKeyV1,
} from './r8SettlementDurableRepository.ts';
import { stablePayoutBatchIdempotencyKeyV1 } from './r8SettlementBatchService.ts';
import { computePriorMonthEndCutoffInstantUtc } from './r8SettlementCalculation.ts';

const businessCalendar = { classifyLocalJstDate: () => 'BUSINESS' as const };
const creatorId = '11111111-1111-4111-8111-111111111111';

describe('R8-C durable settlement lock', () => {
  it('serializes batch lock idempotency and prevents double commission allocation', async () => {
    resetDurableSettlementRepositoryForTests();
    const cutoff = computePriorMonthEndCutoffInstantUtc(2026, 3)!;
    const batchKey = stablePayoutBatchIdempotencyKeyV1(creatorId, cutoff.toISOString());
    const line = {
      commissionEventId: 'ce-1',
      commissionState: 'COMMISSION_PAYABLE' as const,
      payableAtUtc: new Date('2026-02-01T00:00:00.000Z'),
      grossCommissionJpy: 25_000,
      settledPayoutInstructionId: null,
    };
    const base = {
      creatorEconomicIdentityId: creatorId,
      cutoffInstantUtc: cutoff,
      commissionLines: [line],
      asOfUtc: new Date('2026-03-01T00:00:00.000Z'),
      withholdingJpy: 0,
      platformCashAvailableJpy: 100_000,
      applicableLegalDueAtUtc: null,
      calendar: businessCalendar,
      batchIdempotencyKey: batchKey,
      feeChargeIdempotencyKey: stableFeeChargeIdempotencyKeyV1(batchKey),
    };

    const first = await lockSettlementBatchDurableV1(base);
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.created, true);

    const replay = await lockSettlementBatchDurableV1(base);
    assert.equal(replay.ok, true);
    if (replay.ok) assert.equal(replay.created, false);

    const duplicateAllocation = await lockSettlementBatchDurableV1({
      ...base,
      batchIdempotencyKey: `${batchKey}:other-batch`,
      feeChargeIdempotencyKey: stableFeeChargeIdempotencyKeyV1(`${batchKey}:other-batch`),
    });
    assert.equal(duplicateAllocation.ok, false);
    if (!duplicateAllocation.ok) {
      assert.equal(duplicateAllocation.reason, 'COMMISSION_ALREADY_ALLOCATED');
    }
  });

  it('reuses fee policy on retry instruction inheritance via parent bundle', async () => {
    resetDurableSettlementRepositoryForTests();
    const cutoff = computePriorMonthEndCutoffInstantUtc(2026, 4)!;
    const batchKey = stablePayoutBatchIdempotencyKeyV1(creatorId, cutoff.toISOString());
    const locked = await lockSettlementBatchDurableV1({
      creatorEconomicIdentityId: creatorId,
      cutoffInstantUtc: cutoff,
      commissionLines: [
        {
          commissionEventId: 'ce-2',
          commissionState: 'COMMISSION_PAYABLE',
          payableAtUtc: new Date('2026-03-01T00:00:00.000Z'),
          grossCommissionJpy: 22_000,
          settledPayoutInstructionId: null,
        },
      ],
      asOfUtc: new Date('2026-04-02T00:00:00.000Z'),
      withholdingJpy: 0,
      platformCashAvailableJpy: 100_000,
      applicableLegalDueAtUtc: null,
      calendar: businessCalendar,
      batchIdempotencyKey: batchKey,
      feeChargeIdempotencyKey: stableFeeChargeIdempotencyKeyV1(batchKey),
    });
    assert.equal(locked.ok, true);
    if (!locked.ok) return;
    assert.equal(locked.bundle.feeCharge.feeJpy, locked.bundle.instruction.payoutProcessingFeeJpy);
  });
});
