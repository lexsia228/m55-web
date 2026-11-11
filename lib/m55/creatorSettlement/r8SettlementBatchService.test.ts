import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computePriorMonthEndCutoffInstantUtc } from './r8SettlementCalculation.ts';
import {
  applyCommissionClawbackDeltaV1,
  createPayoutRetryInstructionV1,
  lockPayoutBatchV1,
  resetR8BSettlementStoreForTests,
  stablePayoutBatchIdempotencyKeyV1,
} from './r8SettlementBatchService.ts';
import type { JapaneseBankHolidayCalendarV1 } from './r8SettlementCalculation.ts';

const businessDayCalendar: JapaneseBankHolidayCalendarV1 = {
  classifyLocalJstDate: () => 'BUSINESS',
};

describe('R8-B payout batch lock (local, no Stripe transfer)', () => {
  it('locks at-most-once with stable idempotency and 100% cash coverage gate', () => {
    resetR8BSettlementStoreForTests();
    const cutoff = computePriorMonthEndCutoffInstantUtc(2026, 3)!;
    const idempotencyKey = stablePayoutBatchIdempotencyKeyV1(
      '11111111-1111-4111-8111-111111111111',
      cutoff.toISOString(),
    );
    const baseInput = {
      creatorEconomicIdentityId: '11111111-1111-4111-8111-111111111111',
      batchYear: 2026,
      batchMonth1: 3,
      cutoffInstantUtc: cutoff,
      asOfUtc: new Date('2026-03-05T00:00:00.000Z'),
      withholdingJpy: 0,
      legacyTestCoverageProofJpy: 50_000,
      applicableLegalDueAtUtc: null,
      calendar: businessDayCalendar,
      idempotencyKey,
      commissionLines: [
        {
          commissionEventId: 'c1',
          commissionState: 'COMMISSION_PAYABLE' as const,
          payableAtUtc: new Date('2026-02-10T00:00:00.000Z'),
          grossCommissionJpy: 25_000,
          settledPayoutInstructionId: null,
        },
      ],
    };

    const first = lockPayoutBatchV1(baseInput);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.created, true);
    assert.equal(first.instruction.payoutProcessingFeeJpy, 800);

    const second = lockPayoutBatchV1(baseInput);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.created, false);
    assert.equal(second.instruction.instructionId, first.instruction.instructionId);

    const underFunded = lockPayoutBatchV1({
      ...baseInput,
      idempotencyKey: `${idempotencyKey}:other`,
      legacyTestCoverageProofJpy: 100,
    });
    assert.equal(underFunded.ok, false);
    if (!underFunded.ok) assert.equal(underFunded.reason, 'INSUFFICIENT_CASH_COVERAGE');
  });

  it('inherits parent fee on payout retry instruction', () => {
    const parent = {
      instructionId: 'inst-parent',
      creatorEconomicIdentityId: '11111111-1111-4111-8111-111111111111',
      batchId: 'batch-1',
      idempotencyKey: 'batch:key',
      mode: 'STANDARD_THRESHOLD' as const,
      cutoffInstantUtc: new Date('2026-02-28T14:59:59.999Z'),
      payoutDueAtUtc: new Date('2026-03-14T15:00:00.000Z'),
      settlementPayableJpy: 25_000,
      payoutProcessingFeeJpy: 830,
      payoutFeePolicyVersion: 'r8_b_payout_fee_v1' as const,
      withholdingJpy: 0,
      netPayoutJpy: 24_170,
      lockedAtUtc: new Date('2026-03-01T00:00:00.000Z'),
      parentInstructionId: null,
    };
    const retry = createPayoutRetryInstructionV1({
      parent,
      asOfUtc: new Date('2026-03-20T00:00:00.000Z'),
    });
    assert.equal(retry.payoutProcessingFeeJpy, 830);
    assert.equal(retry.payoutFeePolicyVersion, parent.payoutFeePolicyVersion);
    assert.equal(retry.parentInstructionId, parent.instructionId);
  });

  it('rejects clawback that would over-allocate negative net', () => {
    const lines = [
      {
        commissionEventId: 'c1',
        commissionState: 'COMMISSION_PAYABLE' as const,
        payableAtUtc: new Date('2026-01-01T00:00:00.000Z'),
        grossCommissionJpy: 1000,
        settledPayoutInstructionId: null,
      },
    ];
    const clawback = applyCommissionClawbackDeltaV1({
      lines,
      commissionEventId: 'c1',
      deltaJpy: -2000,
    });
    assert.equal(clawback.ok, false);
  });
});
