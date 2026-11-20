import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computePriorMonthEndCutoffInstantUtc,
  computeStandardPayoutProcessingFeeJpy,
  computeTailEffectivePayoutFeeJpy,
  computeTailDueInstantUtc,
  filterStandardBatchEligibleCommissionLinesV1,
  isPayableAtOrBeforeCutoffJst,
  adjustToNextJapaneseBankBusinessDayUtc,
  resolvePayoutInstructionModeV1,
  type JapaneseBankHolidayCalendarV1,
} from './r8SettlementCalculation.ts';

describe('R8-B settlement calculation', () => {
  it('uses prior JST month-end cutoff for February batching', () => {
    const cutoff = computePriorMonthEndCutoffInstantUtc(2026, 2);
    assert.ok(cutoff);
    assert.equal(cutoff?.toISOString(), '2026-01-31T14:59:59.999Z');
    const justBefore = new Date('2026-01-31T14:59:59.999Z');
    const justAfter = new Date('2026-01-31T15:00:00.000Z');
    assert.equal(isPayableAtOrBeforeCutoffJst(justBefore, cutoff!), true);
    assert.equal(isPayableAtOrBeforeCutoffJst(justAfter, cutoff!), false);
  });

  it('excludes pending/hold and post-cutoff payable rows', () => {
    const cutoff = computePriorMonthEndCutoffInstantUtc(2026, 2)!;
    const eligible = filterStandardBatchEligibleCommissionLinesV1(
      [
        {
          commissionEventId: 'a',
          commissionState: 'COMMISSION_PAYABLE',
          payableAtUtc: new Date('2026-01-15T00:00:00.000Z'),
          grossCommissionJpy: 1000,
          settledPayoutInstructionId: null,
        },
        {
          commissionEventId: 'b',
          commissionState: 'COMMISSION_HOLD',
          payableAtUtc: new Date('2026-01-10T00:00:00.000Z'),
          grossCommissionJpy: 5000,
          settledPayoutInstructionId: null,
        },
        {
          commissionEventId: 'c',
          commissionState: 'COMMISSION_PAYABLE',
          payableAtUtc: new Date('2026-02-01T00:00:00.000Z'),
          grossCommissionJpy: 9000,
          settledPayoutInstructionId: null,
        },
      ],
      cutoff,
    );
    assert.deepEqual(eligible.map((row) => row.commissionEventId), ['a']);
  });

  it('computes standard fee at threshold boundary and rounding', () => {
    assert.equal(computeStandardPayoutProcessingFeeJpy(20_000), 770);
    assert.equal(computeStandardPayoutProcessingFeeJpy(19_999), 770);
    assert.equal(computeStandardPayoutProcessingFeeJpy(20_001), 780);
    assert.equal(computeStandardPayoutProcessingFeeJpy(30_000), 830);
  });

  it('caps tail fee at 25% floor without fee-caused forfeiture', () => {
    assert.equal(computeTailEffectivePayoutFeeJpy(4_000), 770);
    assert.equal(computeTailEffectivePayoutFeeJpy(1_000), 250);
  });

  it('measures 180-day tail from oldest unsettled payable anchor', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z');
    const tailDue = computeTailDueInstantUtc(anchor);
    assert.equal(tailDue?.toISOString(), '2026-06-30T00:00:00.000Z');
  });

  it('fail-closes bank holiday adjustment when calendar unknown', () => {
    const unknownCalendar: JapaneseBankHolidayCalendarV1 = {
      classifyLocalJstDate: () => 'UNKNOWN',
    };
    const result = adjustToNextJapaneseBankBusinessDayUtc(
      new Date('2026-03-15T00:00:00.000Z'),
      unknownCalendar,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'BANK_HOLIDAY_CALENDAR_UNKNOWN');
  });

  it('selects legal deadline mode when override due date reached', () => {
    const mode = resolvePayoutInstructionModeV1({
      settlementPayableJpy: 5_000,
      oldestUnsettledPayableAtUtc: new Date('2025-01-01T00:00:00.000Z'),
      asOfUtc: new Date('2026-06-01T00:00:00.000Z'),
      applicableLegalDueAtUtc: new Date('2026-05-01T00:00:00.000Z'),
    });
    assert.equal(mode, 'LEGAL_DEADLINE');
  });
});
