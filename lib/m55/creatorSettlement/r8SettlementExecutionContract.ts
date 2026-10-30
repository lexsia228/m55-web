import type {
  R8BPayoutBatchV1,
  R8BPayoutInstructionV1,
  R8BCommissionLedgerLineV1,
} from './r8SettlementContract';

export const R8_C_SETTLEMENT_EXECUTION_SCHEMA_VERSION = '2026-10-30-v1' as const;

export type R8CPayoutFeeChargeV1 = {
  feeChargeId: string;
  instructionId: string;
  feeJpy: number;
  feePolicyVersion: string;
  idempotencyKey: string;
};

export type R8CPayoutAttemptV1 = {
  attemptId: string;
  instructionId: string;
  attemptNumber: number;
  status: 'QUEUED' | 'PROCESSING' | 'POSTED' | 'FAILED' | 'RETURNED';
  idempotencyKey: string;
  parentAttemptId: string | null;
};

export type R8CProviderSettlementEventV1 = {
  providerEventId: string;
  stripeEventId: string;
  eventType: string;
  normalizedAtUtc: Date;
  idempotencyKey: string;
};

export type R8CSettlementBatchLineV1 = {
  commissionEventId: string;
  instructionId: string;
  allocatedGrossCommissionJpy: number;
};

export type R8CLockedSettlementBundleV1 = {
  batch: R8BPayoutBatchV1;
  instruction: R8BPayoutInstructionV1;
  feeCharge: R8CPayoutFeeChargeV1;
  batchLines: R8CSettlementBatchLineV1[];
};

export type R8CDurableLockInputV1 = {
  creatorEconomicIdentityId: string;
  cutoffInstantUtc: Date;
  commissionLines: ReadonlyArray<R8BCommissionLedgerLineV1>;
  asOfUtc: Date;
  withholdingJpy: number;
  applicableLegalDueAtUtc: Date | null;
  calendar: import('./r8SettlementCalculation').JapaneseBankHolidayCalendarV1;
  batchIdempotencyKey: string;
  feeChargeIdempotencyKey: string;
};

export type R8CDurableLockResultV1 =
  | { ok: true; bundle: R8CLockedSettlementBundleV1; created: boolean }
  | {
      ok: false;
      reason:
        | 'DUPLICATE_IDEMPOTENCY_CONFLICT'
        | 'COMMISSION_ALREADY_ALLOCATED'
        | 'NO_ELIGIBLE_COMMISSIONS'
        | 'SETTLEMENT_MODE_UNRESOLVED'
        | 'PAYOUT_DUE_UNRESOLVED'
        | 'INSUFFICIENT_CASH_COVERAGE'
        | 'NEGATIVE_NET_PAYOUT'
        | 'TRANSFER_EXECUTION_DISABLED'
        | 'SETTLEMENT_STORAGE_UNAVAILABLE';
    };
