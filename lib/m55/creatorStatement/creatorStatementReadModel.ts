import { R8_B_CASH_TRANSFER_NETWORK_ENABLED } from '../creatorSettlement/r8SettlementContract';
import { R8_C_BANK_CALENDAR_BLOCKER } from '../creatorSettlement/japaneseBankBusinessDayCalendar';
import type { R8CLockedSettlementBundleV1, R8CPayoutAttemptV1 } from '../creatorSettlement/r8SettlementExecutionContract';

export type CreatorStatementPayoutPhaseV1 =
  | 'NOT_LOCKED'
  | 'INSTRUCTION_LOCKED'
  | 'PROCESSING'
  | 'POSTED'
  | 'FAILED'
  | 'RETURNED';

export type CreatorStatementBundleV1 = {
  schemaVersion: '2026-10-30-v1';
  productionCashActivation: false;
  payoutTransferNetworkEnabled: false;
  commissionLifecycleCounts: Record<string, number>;
  lockedInstructions: Array<{
    instructionIdSuffix: string;
    settlementPayableJpy: number;
    payoutProcessingFeeJpy: number;
    netPayoutJpy: number;
    payoutDueAtUtc: string | null;
    payoutDueDateReliable: boolean;
    payoutDueHoldReason: typeof R8_C_BANK_CALENDAR_BLOCKER | null;
    phase: CreatorStatementPayoutPhaseV1;
    fundsTransferred: false;
  }>;
  notices: string[];
};

export function resolveCreatorStatementPayoutPhaseV1(
  attempts: ReadonlyArray<R8CPayoutAttemptV1> | undefined,
): CreatorStatementPayoutPhaseV1 {
  if (!attempts || attempts.length === 0) {
    return 'INSTRUCTION_LOCKED';
  }
  const statuses = attempts.map((a) => a.status);
  if (statuses.some((s) => s === 'FAILED' || s === 'RETURNED')) {
    return statuses.includes('RETURNED') ? 'RETURNED' : 'FAILED';
  }
  if (statuses.some((s) => s === 'PROCESSING' || s === 'QUEUED')) {
    return 'PROCESSING';
  }
  if (R8_B_CASH_TRANSFER_NETWORK_ENABLED && statuses.some((s) => s === 'POSTED')) {
    return 'POSTED';
  }
  return 'INSTRUCTION_LOCKED';
}

export function buildCreatorStatementBundleV1(input: {
  commissionLifecycleCounts: Record<string, number>;
  lockedBundles: ReadonlyArray<R8CLockedSettlementBundleV1>;
}): CreatorStatementBundleV1 {
  const lockedInstructions = input.lockedBundles.map((bundle) => {
    const payoutDueDateReliable = bundle.payoutDueReliable === true;
    return {
      instructionIdSuffix: bundle.instruction.instructionId.slice(-8),
      settlementPayableJpy: bundle.instruction.settlementPayableJpy,
      payoutProcessingFeeJpy: bundle.instruction.payoutProcessingFeeJpy,
      netPayoutJpy: bundle.instruction.netPayoutJpy,
      payoutDueAtUtc: payoutDueDateReliable ? bundle.instruction.payoutDueAtUtc.toISOString() : null,
      payoutDueDateReliable,
      payoutDueHoldReason: payoutDueDateReliable ? null : R8_C_BANK_CALENDAR_BLOCKER,
      phase: resolveCreatorStatementPayoutPhaseV1(bundle.attempts),
      fundsTransferred: false as const,
    };
  });

  return {
    schemaVersion: '2026-10-30-v1',
    productionCashActivation: false,
    payoutTransferNetworkEnabled: false,
    commissionLifecycleCounts: input.commissionLifecycleCounts,
    lockedInstructions,
    notices: [
      'コミッションの銀行振込は開始されていません（現金送金は無効）。',
      '表示は確定した台帳・ロック済み精算指示に基づくものであり、送金完了を意味しません。',
    ],
  };
}
