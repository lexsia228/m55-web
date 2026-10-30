import type { R8CDurableLockInputV1, R8CDurableLockResultV1 } from './r8SettlementExecutionContract';
import type { R8CPlatformCashCoverageProofV1 } from './r8SettlementLockLogic';
import {
  inMemorySettlementRepositoryForTests,
  resetInMemorySettlementRepositoryForTests,
  testCoverageProofV1,
} from './r8SettlementInMemoryRepository';

export {
  inMemorySettlementRepositoryForTests,
  resetInMemorySettlementRepositoryForTests,
  testCoverageProofV1,
} from './r8SettlementInMemoryRepository';

export function stableFeeChargeIdempotencyKeyV1(instructionIdempotencyKey: string): string {
  return `fee:${instructionIdempotencyKey}`;
}

let transactionChain: Promise<unknown> = Promise.resolve();

export function runSettlementTransactionExclusiveV1<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = transactionChain.then(() => fn());
  transactionChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** @deprecated Use resetInMemorySettlementRepositoryForTests in unit tests only. */
export const resetDurableSettlementRepositoryForTests = resetInMemorySettlementRepositoryForTests;

export async function lockSettlementBatchDurableV1(
  input: R8CDurableLockInputV1,
  options?: {
    coverage?: R8CPlatformCashCoverageProofV1;
    testRepository?: ReturnType<typeof inMemorySettlementRepositoryForTests>;
  },
): Promise<R8CDurableLockResultV1> {
  return runSettlementTransactionExclusiveV1(async () => {
    if (options?.testRepository) {
      const coverage = options.coverage ?? testCoverageProofV1(999_999_999);
      return options.testRepository.lockSettlementBatch(input, coverage);
    }
    const postgres = await import('./r8SettlementPostgresRepository.ts');
    const coverage = options?.coverage ?? (await postgres.loadPlatformCashCoverageProofFromDbV1());
    return postgres.lockSettlementBatchViaPostgresRpcV1(input, coverage);
  });
}

export async function listSettlementBundlesForCreatorRuntimeV1(
  creatorEconomicIdentityId: string,
): Promise<Awaited<ReturnType<(typeof import('./r8SettlementPostgresRepository.ts'))['listPersistedSettlementBundlesForCreatorV1']>>> {
  const postgres = await import('./r8SettlementPostgresRepository.ts');
  return postgres.listPersistedSettlementBundlesForCreatorV1(creatorEconomicIdentityId);
}
