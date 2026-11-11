import { randomUUID } from 'node:crypto';
import {
  R8_B_CASH_TRANSFER_NETWORK_ENABLED,
  R8_B_PAYOUT_FEE_POLICY_VERSION,
  type R8BPayoutBatchV1,
  type R8BPayoutInstructionV1,
  type R8BCommissionLedgerLineV1,
} from './r8SettlementContract';
import {
  computeNetPayoutJpy,
  computePayoutDueAtUtc,
  filterStandardBatchEligibleCommissionLinesV1,
  findOldestUnsettledPayableAtUtc,
  resolvePayoutInstructionModeV1,
  selectPayoutProcessingFeeJpy,
  sumSettlementPayableJpy,
} from './r8SettlementCalculation';
import type {
  R8CDurableLockInputV1,
  R8CDurableLockResultV1,
  R8CLockedSettlementBundleV1,
  R8CPayoutFeeChargeV1,
  R8CSettlementBatchLineV1,
} from './r8SettlementExecutionContract';

export type R8CPlatformCashCoverageProofV1 =
  | { ok: true; availableJpy: number; effectiveAvailableJpy: number; proofSnapshotId: string }
  | {
      ok: false;
      reason: 'COVERAGE_PROOF_MISSING' | 'COVERAGE_INSUFFICIENT' | 'COVERAGE_STALE' | 'COVERAGE_UNVERIFIED';
    };

export type R8CDurableLockCoreInputV1 = Omit<R8CDurableLockInputV1, 'commissionLines'> & {
  commissionLines: ReadonlyArray<R8BCommissionLedgerLineV1>;
  coverage: R8CPlatformCashCoverageProofV1;
};

export function lockSettlementBatchCoreV1(input: R8CDurableLockCoreInputV1): R8CDurableLockResultV1 {
  if (R8_B_CASH_TRANSFER_NETWORK_ENABLED) {
    return { ok: false, reason: 'TRANSFER_EXECUTION_DISABLED' };
  }
  if (!input.coverage.ok) {
    return { ok: false, reason: 'INSUFFICIENT_CASH_COVERAGE' };
  }

  const eligible = filterStandardBatchEligibleCommissionLinesV1(
    input.commissionLines,
    input.cutoffInstantUtc,
  );
  const settlementPayable = sumSettlementPayableJpy(eligible);
  if (settlementPayable == null || settlementPayable <= 0) {
    return { ok: false, reason: 'NO_ELIGIBLE_COMMISSIONS' };
  }

  const oldest = findOldestUnsettledPayableAtUtc(input.commissionLines);
  const mode = resolvePayoutInstructionModeV1({
    settlementPayableJpy: settlementPayable,
    oldestUnsettledPayableAtUtc: oldest,
    asOfUtc: input.asOfUtc,
    applicableLegalDueAtUtc: input.applicableLegalDueAtUtc,
  });
  if (!mode) return { ok: false, reason: 'SETTLEMENT_MODE_UNRESOLVED' };

  const due = computePayoutDueAtUtc({
    cutoffInstantUtc: input.cutoffInstantUtc,
    mode,
    oldestUnsettledPayableAtUtc: oldest,
    applicableLegalDueAtUtc: input.applicableLegalDueAtUtc,
    calendar: input.calendar,
  });
  if (!due.ok) return { ok: false, reason: 'PAYOUT_DUE_UNRESOLVED' };

  const fee = selectPayoutProcessingFeeJpy(settlementPayable, mode);
  if (fee == null) return { ok: false, reason: 'NEGATIVE_NET_PAYOUT' };
  const net = computeNetPayoutJpy({
    settlementPayableJpy: settlementPayable,
    payoutProcessingFeeJpy: fee,
    withholdingJpy: input.withholdingJpy,
  });
  if (net == null) return { ok: false, reason: 'NEGATIVE_NET_PAYOUT' };
  const spendable =
    input.coverage.effectiveAvailableJpy ?? input.coverage.availableJpy;
  if (spendable < net) {
    return { ok: false, reason: 'INSUFFICIENT_CASH_COVERAGE' };
  }

  const batchId = randomUUID();
  const instructionId = randomUUID();
  const feeChargeId = randomUUID();
  const lockedAtUtc = input.asOfUtc;

  const instruction: R8BPayoutInstructionV1 = {
    instructionId,
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    batchId,
    idempotencyKey: input.batchIdempotencyKey,
    mode,
    cutoffInstantUtc: input.cutoffInstantUtc,
    payoutDueAtUtc: due.payoutDueAtUtc,
    settlementPayableJpy: settlementPayable,
    payoutProcessingFeeJpy: fee,
    payoutFeePolicyVersion: R8_B_PAYOUT_FEE_POLICY_VERSION,
    withholdingJpy: input.withholdingJpy,
    netPayoutJpy: net,
    lockedAtUtc,
    parentInstructionId: null,
  };

  const batch: R8BPayoutBatchV1 = {
    batchId,
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    cutoffInstantUtc: input.cutoffInstantUtc,
    idempotencyKey: input.batchIdempotencyKey,
    lockedAtUtc,
    instructionId,
  };

  const feeCharge: R8CPayoutFeeChargeV1 = {
    feeChargeId,
    instructionId,
    feeJpy: fee,
    feePolicyVersion: R8_B_PAYOUT_FEE_POLICY_VERSION,
    idempotencyKey: input.feeChargeIdempotencyKey,
  };

  const batchLines: R8CSettlementBatchLineV1[] = eligible.map((line) => ({
    commissionEventId: line.commissionEventId,
    instructionId,
    allocatedGrossCommissionJpy: line.grossCommissionJpy,
  }));

  return {
    ok: true,
    bundle: { batch, instruction, feeCharge, batchLines },
    created: true,
  };
}
