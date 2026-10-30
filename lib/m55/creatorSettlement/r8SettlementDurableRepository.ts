import { randomUUID } from 'node:crypto';
import {
  R8_B_CASH_TRANSFER_NETWORK_ENABLED,
  R8_B_PAYOUT_FEE_POLICY_VERSION,
  type R8BPayoutBatchV1,
  type R8BPayoutInstructionV1,
} from './r8SettlementContract';
import {
  computeNetPayoutJpy,
  computePayoutDueAtUtc,
  filterStandardBatchEligibleCommissionLinesV1,
  findOldestUnsettledPayableAtUtc,
  resolvePayoutInstructionModeV1,
  selectPayoutProcessingFeeJpy,
  sumSettlementPayableJpy,
  type JapaneseBankHolidayCalendarV1,
} from './r8SettlementCalculation';
import type {
  R8CDurableLockInputV1,
  R8CDurableLockResultV1,
  R8CLockedSettlementBundleV1,
  R8CPayoutFeeChargeV1,
  R8CSettlementBatchLineV1,
} from './r8SettlementExecutionContract';

export interface DurableSettlementRepositoryV1 {
  lockSettlementBatch(input: R8CDurableLockInputV1): R8CDurableLockResultV1;
  getBatchByIdempotencyKey(key: string): R8CLockedSettlementBundleV1 | null;
  getInstructionById(instructionId: string): R8BPayoutInstructionV1 | null;
  listBundlesForCreator(creatorEconomicIdentityId: string): R8CLockedSettlementBundleV1[];
}

type InternalStore = {
  bundlesByBatchKey: Map<string, R8CLockedSettlementBundleV1>;
  commissionAllocations: Map<string, string>;
  feeChargesByKey: Map<string, R8CPayoutFeeChargeV1>;
};

function createEmptyStore(): InternalStore {
  return {
    bundlesByBatchKey: new Map(),
    commissionAllocations: new Map(),
    feeChargesByKey: new Map(),
  };
}

let activeStore: InternalStore = createEmptyStore();
let transactionChain: Promise<unknown> = Promise.resolve();

export function resetDurableSettlementRepositoryForTests(): void {
  activeStore = createEmptyStore();
  transactionChain = Promise.resolve();
}

export function runSettlementTransactionExclusiveV1<T>(fn: () => T): Promise<T> {
  const run = transactionChain.then(() => fn());
  transactionChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function lockSettlementBatchInternal(
  store: InternalStore,
  input: R8CDurableLockInputV1,
): R8CDurableLockResultV1 {
  if (R8_B_CASH_TRANSFER_NETWORK_ENABLED) {
    return { ok: false, reason: 'TRANSFER_EXECUTION_DISABLED' };
  }

  const existing = store.bundlesByBatchKey.get(input.batchIdempotencyKey);
  if (existing) {
    return { ok: true, bundle: existing, created: false };
  }

  if (store.feeChargesByKey.has(input.feeChargeIdempotencyKey)) {
    return { ok: false, reason: 'DUPLICATE_IDEMPOTENCY_CONFLICT' };
  }

  const eligible = filterStandardBatchEligibleCommissionLinesV1(
    input.commissionLines,
    input.cutoffInstantUtc,
  );
  const settlementPayable = sumSettlementPayableJpy(eligible);
  if (settlementPayable == null || settlementPayable <= 0) {
    return { ok: false, reason: 'NO_ELIGIBLE_COMMISSIONS' };
  }

  for (const line of eligible) {
    if (store.commissionAllocations.has(line.commissionEventId)) {
      return { ok: false, reason: 'COMMISSION_ALREADY_ALLOCATED' };
    }
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
  if (input.platformCashAvailableJpy < net) {
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

  for (const line of batchLines) {
    store.commissionAllocations.set(line.commissionEventId, instructionId);
  }
  store.feeChargesByKey.set(input.feeChargeIdempotencyKey, feeCharge);

  const bundle: R8CLockedSettlementBundleV1 = { batch, instruction, feeCharge, batchLines };
  store.bundlesByBatchKey.set(input.batchIdempotencyKey, bundle);
  return { ok: true, bundle, created: true };
}

export const inMemoryDurableSettlementRepository: DurableSettlementRepositoryV1 = {
  lockSettlementBatch(input) {
    return lockSettlementBatchInternal(activeStore, input);
  },
  getBatchByIdempotencyKey(key) {
    return activeStore.bundlesByBatchKey.get(key) ?? null;
  },
  getInstructionById(instructionId) {
    for (const bundle of activeStore.bundlesByBatchKey.values()) {
      if (bundle.instruction.instructionId === instructionId) return bundle.instruction;
    }
    return null;
  },
  listBundlesForCreator(creatorEconomicIdentityId) {
    return [...activeStore.bundlesByBatchKey.values()].filter(
      (bundle) => bundle.batch.creatorEconomicIdentityId === creatorEconomicIdentityId,
    );
  },
};

export async function lockSettlementBatchDurableV1(
  input: R8CDurableLockInputV1,
  repo: DurableSettlementRepositoryV1 = inMemoryDurableSettlementRepository,
): Promise<R8CDurableLockResultV1> {
  return runSettlementTransactionExclusiveV1(() => repo.lockSettlementBatch(input));
}

export function stableFeeChargeIdempotencyKeyV1(instructionIdempotencyKey: string): string {
  return `fee:${instructionIdempotencyKey}`;
}
