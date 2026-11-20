import { randomUUID } from 'node:crypto';
import {
  R8_B_CASH_TRANSFER_NETWORK_ENABLED,
  R8_B_PAYOUT_FEE_POLICY_VERSION,
  type R8BCommissionLedgerLineV1,
  type R8BPayoutBatchV1,
  type R8BPayoutInstructionV1,
} from './r8SettlementContract';
import {
  computePayoutDueAtUtc,
  filterStandardBatchEligibleCommissionLinesV1,
  computeNetPayoutJpy,
  findOldestUnsettledPayableAtUtc,
  resolvePayoutInstructionModeV1,
  selectPayoutProcessingFeeJpy,
  sumSettlementPayableJpy,
  type JapaneseBankHolidayCalendarV1,
} from './r8SettlementCalculation';

export function stablePayoutBatchIdempotencyKeyV1(
  creatorEconomicIdentityId: string,
  cutoffInstantIso: string,
): string {
  return `batch:${creatorEconomicIdentityId}:${cutoffInstantIso}`;
}

export type LockPayoutBatchInputV1 = {
  creatorEconomicIdentityId: string;
  batchYear: number;
  batchMonth1: number;
  cutoffInstantUtc: Date;
  commissionLines: ReadonlyArray<R8BCommissionLedgerLineV1>;
  asOfUtc: Date;
  withholdingJpy: number;
  applicableLegalDueAtUtc: Date | null;
  calendar: JapaneseBankHolidayCalendarV1;
  idempotencyKey: string;
  /** @deprecated R8-B legacy test helper only — runtime uses DB coverage snapshots. */
  legacyTestCoverageProofJpy: number;
};

export type LockPayoutBatchResultV1 =
  | { ok: true; batch: R8BPayoutBatchV1; instruction: R8BPayoutInstructionV1; created: boolean }
  | {
      ok: false;
      reason:
        | 'DUPLICATE_BATCH_CONFLICT'
        | 'NO_ELIGIBLE_COMMISSIONS'
        | 'SETTLEMENT_MODE_UNRESOLVED'
        | 'PAYOUT_DUE_UNRESOLVED'
        | 'INSUFFICIENT_CASH_COVERAGE'
        | 'NEGATIVE_NET_PAYOUT'
        | 'TRANSFER_NETWORK_DISABLED';
    };

type StoreState = {
  batchesByKey: Map<string, R8BPayoutBatchV1>;
  instructionsById: Map<string, R8BPayoutInstructionV1>;
  lineAllocations: Map<string, string>;
};

const store: StoreState = {
  batchesByKey: new Map(),
  instructionsById: new Map(),
  lineAllocations: new Map(),
};

export function resetR8BSettlementStoreForTests(): void {
  store.batchesByKey.clear();
  store.instructionsById.clear();
  store.lineAllocations.clear();
}

export function lockPayoutBatchV1(input: LockPayoutBatchInputV1): LockPayoutBatchResultV1 {
  if (!R8_B_CASH_TRANSFER_NETWORK_ENABLED) {
    // R8-B: calculation + lock only; no Stripe transfer execution path exists.
  }

  const existing = store.batchesByKey.get(input.idempotencyKey);
  if (existing) {
    const instruction = store.instructionsById.get(existing.instructionId);
    if (!instruction) return { ok: false, reason: 'DUPLICATE_BATCH_CONFLICT' };
    return { ok: true, batch: existing, instruction, created: false };
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
  if (input.legacyTestCoverageProofJpy < net) {
    return { ok: false, reason: 'INSUFFICIENT_CASH_COVERAGE' };
  }

  const batchId = randomUUID();
  const instructionId = randomUUID();
  const lockedAtUtc = input.asOfUtc;
  const instruction: R8BPayoutInstructionV1 = {
    instructionId,
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    batchId,
    idempotencyKey: input.idempotencyKey,
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

  for (const line of eligible) {
    if (store.lineAllocations.has(line.commissionEventId)) {
      return { ok: false, reason: 'DUPLICATE_BATCH_CONFLICT' };
    }
    store.lineAllocations.set(line.commissionEventId, instructionId);
  }

  const batch: R8BPayoutBatchV1 = {
    batchId,
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    cutoffInstantUtc: input.cutoffInstantUtc,
    idempotencyKey: input.idempotencyKey,
    lockedAtUtc,
    instructionId,
  };

  store.batchesByKey.set(input.idempotencyKey, batch);
  store.instructionsById.set(instructionId, instruction);

  return { ok: true, batch, instruction, created: true };
}

export function createPayoutRetryInstructionV1(args: {
  parent: R8BPayoutInstructionV1;
  asOfUtc: Date;
}): R8BPayoutInstructionV1 {
  return {
    ...args.parent,
    instructionId: randomUUID(),
    parentInstructionId: args.parent.instructionId,
    lockedAtUtc: args.asOfUtc,
    payoutProcessingFeeJpy: args.parent.payoutProcessingFeeJpy,
    payoutFeePolicyVersion: args.parent.payoutFeePolicyVersion,
  };
}

export function applyCommissionClawbackDeltaV1(args: {
  lines: R8BCommissionLedgerLineV1[];
  commissionEventId: string;
  deltaJpy: number;
}): { ok: true; settlementPayableJpy: number } | { ok: false; reason: 'OVER_ALLOCATION' } {
  const next = args.lines.map((line) => ({ ...line }));
  const target = next.find((line) => line.commissionEventId === args.commissionEventId);
  if (!target) return { ok: false, reason: 'OVER_ALLOCATION' };
  if (!Number.isInteger(args.deltaJpy)) return { ok: false, reason: 'OVER_ALLOCATION' };
  target.grossCommissionJpy += args.deltaJpy;
  if (target.grossCommissionJpy < 0) return { ok: false, reason: 'OVER_ALLOCATION' };
  const unsettled = next.filter(
    (line) => line.commissionState === 'COMMISSION_PAYABLE' && line.settledPayoutInstructionId == null,
  );
  const total = sumSettlementPayableJpy(unsettled);
  if (total == null) return { ok: false, reason: 'OVER_ALLOCATION' };
  return { ok: true, settlementPayableJpy: total };
}
