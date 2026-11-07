import type {
  R8CDurableLockInputV1,
  R8CDurableLockResultV1,
  R8CLockedSettlementBundleV1,
} from './r8SettlementExecutionContract';
import type { R8BPayoutInstructionV1 } from './r8SettlementContract';
import {
  lockSettlementBatchCoreV1,
  type R8CPlatformCashCoverageProofV1,
} from './r8SettlementLockLogic';

export interface DurableSettlementRepositoryV1 {
  lockSettlementBatch(
    input: R8CDurableLockInputV1,
    coverage: R8CPlatformCashCoverageProofV1,
  ): R8CDurableLockResultV1;
  getBatchByIdempotencyKey(key: string): R8CLockedSettlementBundleV1 | null;
  getInstructionById(instructionId: string): R8BPayoutInstructionV1 | null;
  listBundlesForCreator(creatorEconomicIdentityId: string): R8CLockedSettlementBundleV1[];
}

type InternalStore = {
  bundlesByBatchKey: Map<string, R8CLockedSettlementBundleV1>;
  commissionAllocations: Map<string, string>;
  feeChargesByKey: Map<string, string>;
};

function createEmptyStore(): InternalStore {
  return {
    bundlesByBatchKey: new Map(),
    commissionAllocations: new Map(),
    feeChargesByKey: new Map(),
  };
}

/** Test-only process-local store — not used for runtime Creator statement authority. */
let testStore: InternalStore = createEmptyStore();

export function resetInMemorySettlementRepositoryForTests(): void {
  testStore = createEmptyStore();
}

export function inMemorySettlementRepositoryForTests(): DurableSettlementRepositoryV1 {
  return {
    lockSettlementBatch(input, coverage) {
      const existing = testStore.bundlesByBatchKey.get(input.batchIdempotencyKey);
      if (existing) return { ok: true, bundle: existing, created: false };
      if (testStore.feeChargesByKey.has(input.feeChargeIdempotencyKey)) {
        return { ok: false, reason: 'DUPLICATE_IDEMPOTENCY_CONFLICT' };
      }
      for (const line of input.commissionLines) {
        if (testStore.commissionAllocations.has(line.commissionEventId)) {
          return { ok: false, reason: 'COMMISSION_ALREADY_ALLOCATED' };
        }
      }

      const core = lockSettlementBatchCoreV1({ ...input, coverage });
      if (!core.ok) return core;

      for (const line of core.bundle.batchLines) {
        testStore.commissionAllocations.set(line.commissionEventId, core.bundle.instruction.instructionId);
      }
      testStore.feeChargesByKey.set(input.feeChargeIdempotencyKey, core.bundle.feeCharge.feeChargeId);
      testStore.bundlesByBatchKey.set(input.batchIdempotencyKey, core.bundle);
      return core;
    },
    getBatchByIdempotencyKey(key) {
      return testStore.bundlesByBatchKey.get(key) ?? null;
    },
    getInstructionById(instructionId) {
      for (const bundle of testStore.bundlesByBatchKey.values()) {
        if (bundle.instruction.instructionId === instructionId) return bundle.instruction;
      }
      return null;
    },
    listBundlesForCreator(creatorEconomicIdentityId) {
      return [...testStore.bundlesByBatchKey.values()].filter(
        (b) => b.batch.creatorEconomicIdentityId === creatorEconomicIdentityId,
      );
    },
  };
}

export function testCoverageProofV1(availableJpy: number): R8CPlatformCashCoverageProofV1 {
  return {
    ok: true,
    availableJpy,
    effectiveAvailableJpy: availableJpy,
    proofSnapshotId: 'TEST_FIXTURE_COVERAGE',
  };
}
