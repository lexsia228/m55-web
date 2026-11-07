import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveFirstCommissionPayableRecordedAtUtcV1 } from './r6CommissionPayableAnchor.ts';

describe('R6 commission payable anchor', () => {
  it('preserves first PAYABLE instant when ADJUSTED arrives later', () => {
    const origin = 'origin-1';
    const firstPayable = new Date('2026-01-01T00:00:00.000Z');
    const adjustedAt = new Date('2026-06-01T00:00:00.000Z');
    const events = [
      {
        commissionEventId: origin,
        originCommissionEventId: null,
        eventFamily: 'COMMISSION_ACCRUED',
        lifecycleStateAfterEvent: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
        recordedAtUtc: new Date('2025-12-01T00:00:00.000Z'),
      },
      {
        commissionEventId: 'pay-1',
        originCommissionEventId: origin,
        eventFamily: 'COMMISSION_PAYABLE',
        lifecycleStateAfterEvent: 'COMMISSION_PAYABLE',
        recordedAtUtc: firstPayable,
      },
      {
        commissionEventId: 'adj-1',
        originCommissionEventId: origin,
        eventFamily: 'COMMISSION_ADJUSTED',
        lifecycleStateAfterEvent: 'COMMISSION_PAYABLE',
        recordedAtUtc: adjustedAt,
      },
    ];
    assert.equal(
      resolveFirstCommissionPayableRecordedAtUtcV1(events, origin)?.toISOString(),
      firstPayable.toISOString(),
    );
  });
});
