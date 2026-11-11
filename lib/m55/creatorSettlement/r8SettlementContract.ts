export const R8_B_SETTLEMENT_SCHEMA_VERSION = '2026-10-30-v1' as const;

export const R8_B_STANDARD_PAYOUT_THRESHOLD_JPY = 20_000 as const;
export const R8_B_STANDARD_PAYOUT_FEE_BASE_JPY = 770 as const;
export const R8_B_STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY = 20_000 as const;
export const R8_B_STANDARD_PAYOUT_FEE_INCREMENT_BPS = 55 as const;
export const R8_B_STANDARD_PAYOUT_DAY_OF_MONTH = 15 as const;
export const R8_B_TAIL_SETTLEMENT_TRIGGER_AGE_DAYS = 180 as const;
export const R8_B_PAYOUT_FEE_POLICY_VERSION = 'r8_b_payout_fee_v1' as const;

export const R8_B_COMMISSION_PAYABLE_STATE = 'COMMISSION_PAYABLE' as const;

export type R8BCommissionLifecycleStateV1 =
  | typeof R8_B_COMMISSION_PAYABLE_STATE
  | 'COMMISSION_PENDING_COMPLIANCE_REVIEW'
  | 'COMMISSION_HOLD'
  | 'COMMISSION_REVERSED'
  | 'COMMISSION_ADJUSTED';

export type R8BCommissionLedgerLineV1 = {
  commissionEventId: string;
  commissionState: R8BCommissionLifecycleStateV1;
  /** TIMESTAMPTZ instant when commission became PAYABLE (UTC Date) */
  payableAtUtc: Date;
  grossCommissionJpy: number;
  settledPayoutInstructionId: string | null;
};

export type R8BPayoutInstructionModeV1 = 'STANDARD_THRESHOLD' | 'TAIL_FORCED' | 'LEGAL_DEADLINE';

export type R8BPayoutInstructionV1 = {
  instructionId: string;
  creatorEconomicIdentityId: string;
  batchId: string;
  idempotencyKey: string;
  mode: R8BPayoutInstructionModeV1;
  cutoffInstantUtc: Date;
  payoutDueAtUtc: Date;
  settlementPayableJpy: number;
  payoutProcessingFeeJpy: number;
  payoutFeePolicyVersion: typeof R8_B_PAYOUT_FEE_POLICY_VERSION;
  withholdingJpy: number;
  netPayoutJpy: number;
  lockedAtUtc: Date;
  parentInstructionId: string | null;
};

export type R8BPayoutBatchV1 = {
  batchId: string;
  creatorEconomicIdentityId: string;
  cutoffInstantUtc: Date;
  idempotencyKey: string;
  lockedAtUtc: Date;
  instructionId: string;
};

/** Stripe transfer/payout network operations remain disabled in R8-B. */
export const R8_B_CASH_TRANSFER_NETWORK_ENABLED = false as const;
