import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';

export const M55_R6_COMMISSION_LEDGER_MIGRATION_FILENAME =
  '20260927200000_m55_r6_commission_ledger_v1.sql' as const;

export const M55_R6_FINANCIAL_POLICY_VERSION = 'r6_financial_policy_v1' as const;
export const M55_R6_COMMISSION_CALCULATION_VERSION = 'r6_commission_calculation_v1' as const;
export const M55_R6_RATE_SCHEDULE_VERSION = 'r6_standard_rate_schedule_v1' as const;
export const M55_R6_ELIGIBLE_PRODUCT_POLICY_VERSION = 'r6_affiliate_eligible_products_v1' as const;

export const M55_R6_FALLBACK_TAX_RATE_BPS = 1000 as const;
export const M55_R6_REVIEW_WINDOW_MS = 2_592_000_000 as const;
export const M55_R6_MS_PER_DAY = 86_400_000 as const;
export const M55_R6_RATE_TIER_180_DAYS_MS = 180 * M55_R6_MS_PER_DAY;
export const M55_R6_RATE_TIER_365_DAYS_MS = 365 * M55_R6_MS_PER_DAY;

export const M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY = 0 as const;

export const M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME =
  'm55_r6_record_original_commission_v1' as const;
export const M55_R6_RECONCILE_COMMISSION_RPC_NAME = 'm55_r6_reconcile_commission_v1' as const;
export const M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME =
  'm55_r6_reconcile_due_commissions_v1' as const;

export const M55_R6_COMMISSION_LEDGER_RPC_TRANSPORT_ERROR =
  'COMMISSION_LEDGER_RPC_TRANSPORT_ERROR' as const;

export const M55_R6_COMMISSION_EVENT_FAMILIES = [
  'COMMISSION_ACCRUED',
  'COMMISSION_HELD',
  'COMMISSION_RELEASED',
  'COMMISSION_PAYABLE',
  'COMMISSION_REVERSED',
  'COMMISSION_ADJUSTED',
  'CLAWBACK_ACCRUED',
] as const;

export const M55_R6_COMMISSION_CANONICAL_STATES = [
  'COMMISSION_PENDING_COMPLIANCE_REVIEW',
  'COMMISSION_HOLD',
  'COMMISSION_PAYABLE',
  'COMMISSION_REVERSED',
  'COMMISSION_ADJUSTED',
] as const;

export const M55_R6_COMMISSION_LIFECYCLE_STATES = [
  'COMMISSION_PENDING_COMPLIANCE_REVIEW',
  'COMMISSION_HOLD',
  'COMMISSION_PAYABLE',
  'COMMISSION_REVERSED',
] as const;

export const M55_R6_ECONOMIC_DELTA_EVENT_FAMILIES = new Set([
  'COMMISSION_ACCRUED',
  'COMMISSION_ADJUSTED',
  'COMMISSION_REVERSED',
  'CLAWBACK_ACCRUED',
]);

export const M55_R6_ELIGIBLE_POLICY_PRODUCTS = new Set([
  'M55_PREMIUM_REPORT_LIGHT',
  'M55_PREMIUM_REPORT_FULL',
]);

export const M55_R6_REFUND_ECONOMIC_TRANSITION = 'REFUND_SUCCEEDED' as const;
export const M55_R6_DISPUTE_TRANSITION_HOLD_STARTED = 'DISPUTE_HOLD_STARTED' as const;
export const M55_R6_DISPUTE_TRANSITION_HOLD_RELEASED = 'DISPUTE_HOLD_RELEASED' as const;
export const M55_R6_DISPUTE_TRANSITION_WON = 'DISPUTE_WON' as const;
export const M55_R6_DISPUTE_TRANSITION_LOST = 'DISPUTE_LOST' as const;

export const M55_R6_OVERLAP_HOLD_REASON = 'ECONOMIC_OVERLAP_RECONCILIATION_REQUIRED' as const;
export const M55_R6_REVERSAL_EXCEEDS_GROSS_REASON =
  'ECONOMIC_REVERSAL_EXCEEDS_ORIGINAL_GROSS' as const;

export const M55_R6_AUTO_HOLD_RELEASE_DECISIONS = new Set([
  'RELEASE',
  'AUTO_RELEASE',
  'SUPERSEDED_BY_OBJECTIVE_DECISION',
  'SUPERSEDED_BY_NEW_MACHINE_DECISION',
]);

export type R6RecordOriginalCommissionOutcomeV1 =
  | 'RECORDED'
  | 'CONVERGED'
  | 'NOT_COMMISSION_ELIGIBLE';

export type R6ReconcileCommissionOutcomeV1 =
  | 'RECORDED'
  | 'CONVERGED'
  | 'NO_CHANGE'
  | 'NO_COMMISSION_ORIGIN'
  | 'HELD';

export type R6ReconcileDueCommissionsOutcomeV1 = 'RECORDED' | 'CONVERGED' | 'NO_CHANGE';

export type R6DeriveRateFailureReasonV1 = 'PAYMENT_BEFORE_APPROVAL' | 'INVALID_TIMESTAMP';

export type R6RefundAuthorityRowV1 = {
  providerRefundId: string;
  stripeEventCreatedAtMs: number;
  stripeEventId: string;
  refundStatus: string;
  amountJpy: number;
};

export type R6DisputeAuthorityRowV1 = {
  providerDisputeId: string;
  stripeEventType: string;
  stripeEventCreatedAtMs: number;
  stripeEventId: string;
  disputeStatus: string;
  amountJpy: number;
};

export type R6OriginalMoneySnapshotV1 = {
  grossCustomerPaidJpy: number;
  authoritativeTaxAmountPresent: boolean;
  authoritativePurchaseTaxAmountJpy: number | null;
  taxRateBps: number;
  commissionRateBasisPoints: number;
  immediatelyIneligibleAmountJpy: number;
};

const LEDGER_RPC_SEMANTIC = new Set([
  'INVALID_INPUT',
  'COMMISSION_SOURCE_NOT_FOUND',
  'COMMISSION_SOURCE_AMBIGUOUS',
  'COMMISSION_PAYLOAD_CONFLICT',
  'CREATOR_RATE_AUTHORITY_INVALID',
  'CREATOR_TERMS_AUTHORITY_INVALID',
  'NO_COMMISSION_ORIGIN',
]);

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function classifyCommissionLedgerRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && LEDGER_RPC_SEMANTIC.has(message)) return message;
  return M55_R6_COMMISSION_LEDGER_RPC_TRANSPORT_ERROR;
}

export function isSafeCommissionMoneyIntegerV1(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function floorDivBigIntV1(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('DIVISION_BY_ZERO');
  return numerator / denominator;
}

export function deriveCommissionRateBasisPointsV1(args: {
  creatorFirstFinalApprovedAtMs: number;
  canonicalPaymentSucceededAtMs: number;
}):
  | { ok: true; commissionRateBasisPoints: number }
  | { ok: false; reason: R6DeriveRateFailureReasonV1 } {
  const approval = args.creatorFirstFinalApprovedAtMs;
  const payment = args.canonicalPaymentSucceededAtMs;
  if (
    !isSafeCommissionMoneyIntegerV1(approval) ||
    !isSafeCommissionMoneyIntegerV1(payment) ||
    approval < 0 ||
    payment < 0
  ) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }
  if (payment < approval) {
    return { ok: false, reason: 'PAYMENT_BEFORE_APPROVAL' };
  }
  const approvalBig = BigInt(approval);
  const paymentBig = BigInt(payment);
  const tier180 = approvalBig + BigInt(M55_R6_RATE_TIER_180_DAYS_MS);
  const tier365 = approvalBig + BigInt(M55_R6_RATE_TIER_365_DAYS_MS);
  if (paymentBig < tier180) return { ok: true, commissionRateBasisPoints: 5000 };
  if (paymentBig < tier365) return { ok: true, commissionRateBasisPoints: 4000 };
  return { ok: true, commissionRateBasisPoints: 3000 };
}

export function computeCommissionBaseTaxExclusionJpyV1(args: {
  grossCustomerPaidJpy: number;
  authoritativeTaxAmountPresent: boolean;
  authoritativePurchaseTaxAmountJpy: number | null;
  taxRateBps: number;
}): { ok: true; commissionBaseTaxExclusionJpy: number } | { ok: false } {
  const gross = args.grossCustomerPaidJpy;
  if (!isSafeCommissionMoneyIntegerV1(gross) || gross < 1) return { ok: false };
  if (args.authoritativeTaxAmountPresent) {
    const tax = args.authoritativePurchaseTaxAmountJpy;
    if (!isSafeCommissionMoneyIntegerV1(tax) || tax < 0 || tax > gross) return { ok: false };
    return { ok: true, commissionBaseTaxExclusionJpy: tax };
  }
  if (args.authoritativePurchaseTaxAmountJpy !== null) return { ok: false };
  const exclusion = Number(
    floorDivBigIntV1(BigInt(gross) * BigInt(args.taxRateBps), BigInt(10_000 + args.taxRateBps)),
  );
  return { ok: true, commissionBaseTaxExclusionJpy: exclusion };
}

export function computeCommissionableRevenueJpyV1(args: {
  grossCustomerPaidJpy: number;
  commissionBaseTaxExclusionJpy: number;
  immediatelyIneligibleAmountJpy: number;
}): { ok: true; commissionableRevenueJpy: number } | { ok: false } {
  const { grossCustomerPaidJpy, commissionBaseTaxExclusionJpy, immediatelyIneligibleAmountJpy } =
    args;
  if (
    !isSafeCommissionMoneyIntegerV1(grossCustomerPaidJpy) ||
    !isSafeCommissionMoneyIntegerV1(commissionBaseTaxExclusionJpy) ||
    !isSafeCommissionMoneyIntegerV1(immediatelyIneligibleAmountJpy)
  ) {
    return { ok: false };
  }
  if (
    commissionBaseTaxExclusionJpy < 0 ||
    commissionBaseTaxExclusionJpy > grossCustomerPaidJpy ||
    immediatelyIneligibleAmountJpy < 0 ||
    immediatelyIneligibleAmountJpy > grossCustomerPaidJpy
  ) {
    return { ok: false };
  }
  const commissionable =
    grossCustomerPaidJpy - commissionBaseTaxExclusionJpy - immediatelyIneligibleAmountJpy;
  if (commissionable < 0 || commissionable > grossCustomerPaidJpy) return { ok: false };
  return { ok: true, commissionableRevenueJpy: commissionable };
}

export function computeGrossCommissionJpyV1(args: {
  commissionableRevenueJpy: number;
  commissionRateBasisPoints: number;
}): { ok: true; grossCommissionJpy: number } | { ok: false } {
  const { commissionableRevenueJpy, commissionRateBasisPoints } = args;
  if (
    !isSafeCommissionMoneyIntegerV1(commissionableRevenueJpy) ||
    !isSafeCommissionMoneyIntegerV1(commissionRateBasisPoints) ||
    commissionableRevenueJpy < 0 ||
    commissionRateBasisPoints < 0 ||
    commissionRateBasisPoints > 10_000
  ) {
    return { ok: false };
  }
  const grossCommission = Number(
    floorDivBigIntV1(
      BigInt(commissionableRevenueJpy) * BigInt(commissionRateBasisPoints),
      10_000n,
    ),
  );
  return { ok: true, grossCommissionJpy: grossCommission };
}

export function computeOriginalCommissionMoneyV1(args: {
  grossCustomerPaidJpy: number;
  authoritativeTaxAmountPresent: boolean;
  authoritativePurchaseTaxAmountJpy: number | null;
  taxRateBps: number;
  commissionRateBasisPoints: number;
  immediatelyIneligibleAmountJpy: number;
}):
  | {
      ok: true;
      commissionBaseTaxExclusionJpy: number;
      commissionableRevenueJpy: number;
      grossCommissionJpy: number;
    }
  | { ok: false } {
  const tax = computeCommissionBaseTaxExclusionJpyV1(args);
  if (!tax.ok) return { ok: false };
  const commissionable = computeCommissionableRevenueJpyV1({
    grossCustomerPaidJpy: args.grossCustomerPaidJpy,
    commissionBaseTaxExclusionJpy: tax.commissionBaseTaxExclusionJpy,
    immediatelyIneligibleAmountJpy: args.immediatelyIneligibleAmountJpy,
  });
  if (!commissionable.ok) return { ok: false };
  const commission = computeGrossCommissionJpyV1({
    commissionableRevenueJpy: commissionable.commissionableRevenueJpy,
    commissionRateBasisPoints: args.commissionRateBasisPoints,
  });
  if (!commission.ok) return { ok: false };
  return {
    ok: true,
    commissionBaseTaxExclusionJpy: tax.commissionBaseTaxExclusionJpy,
    commissionableRevenueJpy: commissionable.commissionableRevenueJpy,
    grossCommissionJpy: commission.grossCommissionJpy,
  };
}

export function computeReleaseAtMsV1(canonicalPaymentSucceededAtMs: number): number | null {
  if (!isSafeCommissionMoneyIntegerV1(canonicalPaymentSucceededAtMs) || canonicalPaymentSucceededAtMs < 0) {
    return null;
  }
  const release = canonicalPaymentSucceededAtMs + M55_R6_REVIEW_WINDOW_MS;
  if (!Number.isSafeInteger(release)) return null;
  return release;
}

export function sumEconomicEntitlementJpyV1(
  deltas: ReadonlyArray<{ eventFamily: string; commissionDeltaJpy: number }>,
): number {
  let total = 0;
  for (const row of deltas) {
    if (!M55_R6_ECONOMIC_DELTA_EVENT_FAMILIES.has(row.eventFamily)) continue;
    if (!isSafeCommissionMoneyIntegerV1(row.commissionDeltaJpy)) {
      throw new Error('INVALID_ECONOMIC_DELTA');
    }
    total += row.commissionDeltaJpy;
  }
  if (!Number.isSafeInteger(total)) throw new Error('ENTITLEMENT_OVERFLOW');
  return total;
}

export function computeRemainingTaxExclusionJpyV1(args: {
  originalGrossCustomerPaidJpy: number;
  originalAuthoritativeTaxAmountPresent: boolean;
  originalAuthoritativePurchaseTaxAmountJpy: number | null;
  originalTaxRateBps: number;
  remainingGrossJpy: number;
}): { ok: true; remainingTaxExclusionJpy: number } | { ok: false } {
  const {
    originalGrossCustomerPaidJpy: originalGross,
    remainingGrossJpy: remainingGross,
    originalAuthoritativeTaxAmountPresent,
    originalAuthoritativePurchaseTaxAmountJpy,
    originalTaxRateBps,
  } = args;
  if (
    !isSafeCommissionMoneyIntegerV1(originalGross) ||
    !isSafeCommissionMoneyIntegerV1(remainingGross) ||
    remainingGross < 0 ||
    remainingGross > originalGross
  ) {
    return { ok: false };
  }
  if (originalAuthoritativeTaxAmountPresent) {
    const originalTax = originalAuthoritativePurchaseTaxAmountJpy;
    if (!isSafeCommissionMoneyIntegerV1(originalTax) || originalTax < 0) return { ok: false };
    if (remainingGross === 0) return { ok: true, remainingTaxExclusionJpy: 0 };
    const remainingTax = Number(
      floorDivBigIntV1(
        BigInt(originalTax) * BigInt(remainingGross),
        BigInt(originalGross),
      ),
    );
    return { ok: true, remainingTaxExclusionJpy: remainingTax };
  }
  const remainingTax = Number(
    floorDivBigIntV1(
      BigInt(remainingGross) * BigInt(originalTaxRateBps),
      BigInt(10_000 + originalTaxRateBps),
    ),
  );
  return { ok: true, remainingTaxExclusionJpy: remainingTax };
}

export function computeTargetRemainingEntitlementJpyV1(args: {
  original: R6OriginalMoneySnapshotV1;
  effectiveReversalGrossJpy: number;
}): { ok: true; targetRemainingEntitlementJpy: number } | { ok: false; reason?: string } {
  const originalGross = args.original.grossCustomerPaidJpy;
  const reversal = args.effectiveReversalGrossJpy;
  if (
    !isSafeCommissionMoneyIntegerV1(originalGross) ||
    !isSafeCommissionMoneyIntegerV1(reversal) ||
    reversal < 0 ||
    reversal > originalGross
  ) {
    return { ok: false, reason: 'INVALID_REVERSAL_GROSS' };
  }
  const remainingGross = originalGross - reversal;
  const remainingTax = computeRemainingTaxExclusionJpyV1({
    originalGrossCustomerPaidJpy: originalGross,
    originalAuthoritativeTaxAmountPresent: args.original.authoritativeTaxAmountPresent,
    originalAuthoritativePurchaseTaxAmountJpy: args.original.authoritativePurchaseTaxAmountJpy,
    originalTaxRateBps: args.original.taxRateBps,
    remainingGrossJpy: remainingGross,
  });
  if (!remainingTax.ok) return { ok: false, reason: 'INVALID_REMAINING_TAX' };
  const remainingCommissionable = Math.max(
    remainingGross - remainingTax.remainingTaxExclusionJpy - args.original.immediatelyIneligibleAmountJpy,
    0,
  );
  const target = computeGrossCommissionJpyV1({
    commissionableRevenueJpy: remainingCommissionable,
    commissionRateBasisPoints: args.original.commissionRateBasisPoints,
  });
  if (!target.ok) return { ok: false, reason: 'INVALID_TARGET_ENTITLEMENT' };
  return { ok: true, targetRemainingEntitlementJpy: target.grossCommissionJpy };
}

export function selectLatestRefundAuthorityPerProviderIdV1(
  rows: ReadonlyArray<R6RefundAuthorityRowV1>,
): Map<string, R6RefundAuthorityRowV1> {
  const latest = new Map<string, R6RefundAuthorityRowV1>();
  for (const row of rows) {
    const existing = latest.get(row.providerRefundId);
    if (!existing) {
      latest.set(row.providerRefundId, row);
      continue;
    }
    if (
      row.stripeEventCreatedAtMs > existing.stripeEventCreatedAtMs ||
      (row.stripeEventCreatedAtMs === existing.stripeEventCreatedAtMs &&
        row.stripeEventId > existing.stripeEventId)
    ) {
      latest.set(row.providerRefundId, row);
    }
  }
  return latest;
}

export function selectEffectiveSucceededRefundsV1(
  rows: ReadonlyArray<R6RefundAuthorityRowV1>,
): R6RefundAuthorityRowV1[] {
  const latest = selectLatestRefundAuthorityPerProviderIdV1(rows);
  const succeeded = [...latest.values()].filter((row) => row.refundStatus === 'succeeded');
  succeeded.sort((a, b) => {
    if (a.stripeEventCreatedAtMs !== b.stripeEventCreatedAtMs) {
      return a.stripeEventCreatedAtMs - b.stripeEventCreatedAtMs;
    }
    if (a.stripeEventId !== b.stripeEventId) return a.stripeEventId.localeCompare(b.stripeEventId);
    return a.providerRefundId.localeCompare(b.providerRefundId);
  });
  return succeeded;
}

export function computeCumulativeRefundGrossJpyV1(
  refunds: ReadonlyArray<R6RefundAuthorityRowV1>,
): number {
  let total = 0;
  for (const refund of refunds) {
    if (!isSafeCommissionMoneyIntegerV1(refund.amountJpy) || refund.amountJpy < 0) {
      throw new Error('INVALID_REFUND_AMOUNT');
    }
    total += refund.amountJpy;
    if (!Number.isSafeInteger(total)) throw new Error('REFUND_TOTAL_OVERFLOW');
  }
  return total;
}

export function selectLatestDisputeAuthorityPerProviderIdV1(
  rows: ReadonlyArray<R6DisputeAuthorityRowV1>,
): Map<string, R6DisputeAuthorityRowV1> {
  const latest = new Map<string, R6DisputeAuthorityRowV1>();
  for (const row of rows) {
    const existing = latest.get(row.providerDisputeId);
    if (!existing) {
      latest.set(row.providerDisputeId, row);
      continue;
    }
    if (
      row.stripeEventCreatedAtMs > existing.stripeEventCreatedAtMs ||
      (row.stripeEventCreatedAtMs === existing.stripeEventCreatedAtMs &&
        row.stripeEventId > existing.stripeEventId)
    ) {
      latest.set(row.providerDisputeId, row);
    }
  }
  return latest;
}

export type R6DisputeAuthorityClassificationV1 =
  | 'ACTIVE_HOLD'
  | 'HOLD_RELEASE_CANDIDATE'
  | 'DISPUTE_WON'
  | 'DISPUTE_LOST'
  | 'UNKNOWN_CLOSED_HOLD';

export function classifyLatestDisputeAuthorityV1(
  row: R6DisputeAuthorityRowV1,
): R6DisputeAuthorityClassificationV1 {
  const type = row.stripeEventType;
  const status = row.disputeStatus.toLowerCase();
  if (
    type === 'charge.dispute.created' ||
    type === 'charge.dispute.updated' ||
    type === 'charge.dispute.funds_withdrawn'
  ) {
    return 'ACTIVE_HOLD';
  }
  if (type === 'charge.dispute.funds_reinstated') {
    return 'HOLD_RELEASE_CANDIDATE';
  }
  if (type === 'charge.dispute.closed') {
    if (status === 'won') return 'DISPUTE_WON';
    if (status === 'lost') return 'DISPUTE_LOST';
    return 'UNKNOWN_CLOSED_HOLD';
  }
  return 'UNKNOWN_CLOSED_HOLD';
}

export function selectEffectiveLostDisputesV1(
  rows: ReadonlyArray<R6DisputeAuthorityRowV1>,
): R6DisputeAuthorityRowV1[] {
  const latest = selectLatestDisputeAuthorityPerProviderIdV1(rows);
  const lost = [...latest.values()].filter(
    (row) => classifyLatestDisputeAuthorityV1(row) === 'DISPUTE_LOST',
  );
  lost.sort((a, b) => {
    if (a.stripeEventCreatedAtMs !== b.stripeEventCreatedAtMs) {
      return a.stripeEventCreatedAtMs - b.stripeEventCreatedAtMs;
    }
    if (a.stripeEventId !== b.stripeEventId) return a.stripeEventId.localeCompare(b.stripeEventId);
    return a.providerDisputeId.localeCompare(b.providerDisputeId);
  });
  return lost;
}

export function hasRefundDisputeEconomicOverlapV1(args: {
  effectiveRefundGrossJpy: number;
  effectiveLostDisputeGrossJpy: number;
}): boolean {
  return args.effectiveRefundGrossJpy > 0 && args.effectiveLostDisputeGrossJpy > 0;
}

export type R6ComplianceDecisionRowV1 = {
  decisionId: string;
  purchaseAttemptId: string | null;
  disposition: string;
  decisionTimestampMs: number;
};

export type R6ComplianceCaseRowV1 = {
  caseId: string;
  purchaseAttemptId: string | null;
  status: string;
  decision: string | null;
  adverseDecisionId: string | null;
  createdAtMs: number;
  eventId: string;
};

export type R6RecordedEconomicTransitionV1 = {
  sourceEconomicObjectType: 'REFUND' | 'DISPUTE';
  sourceEconomicObjectId: string;
  economicTransition: string;
};

export function hasPurchaseSpecificObjectiveCancellationV1(
  decisions: ReadonlyArray<R6ComplianceDecisionRowV1>,
  purchaseAttemptId: string,
): boolean {
  return decisions.some(
    (row) =>
      row.purchaseAttemptId === purchaseAttemptId && row.disposition === 'AUTO_CANCEL_OBJECTIVE',
  );
}

export function isAutoHoldDecisionStillActiveV1(
  holdDecision: R6ComplianceDecisionRowV1,
  cases: ReadonlyArray<R6ComplianceCaseRowV1>,
): boolean {
  const linkedRelease = cases.some(
    (row) =>
      row.adverseDecisionId === holdDecision.decisionId &&
      row.status === 'RESOLVED' &&
      row.decision !== null &&
      M55_R6_AUTO_HOLD_RELEASE_DECISIONS.has(row.decision),
  );
  return !linkedRelease;
}

export function hasActivePurchaseSpecificHoldAuthorityV1(
  decisions: ReadonlyArray<R6ComplianceDecisionRowV1>,
  cases: ReadonlyArray<R6ComplianceCaseRowV1>,
  purchaseAttemptId: string,
): boolean {
  const activeAutoHold = decisions.some(
    (row) =>
      row.purchaseAttemptId === purchaseAttemptId &&
      row.disposition === 'AUTO_HOLD' &&
      isAutoHoldDecisionStillActiveV1(row, cases),
  );
  if (activeAutoHold) return true;
  return cases.some(
    (row) =>
      row.purchaseAttemptId === purchaseAttemptId &&
      (row.status === 'OPEN' ||
        row.status === 'HOLD' ||
        row.decision === 'KEEP_HOLD' ||
        row.decision === 'REQUEST_CORRECTION' ||
        row.decision === 'PAUSE_CREATOR' ||
        row.decision === 'TERMINATE_PARTNERSHIP'),
  );
}

export function hasPurchaseSpecificPositiveAuthorityV1(
  decisions: ReadonlyArray<R6ComplianceDecisionRowV1>,
  cases: ReadonlyArray<R6ComplianceCaseRowV1>,
  purchaseAttemptId: string,
): boolean {
  const hasPositiveDecision = decisions.some(
    (row) =>
      row.purchaseAttemptId === purchaseAttemptId &&
      (row.disposition === 'AUTO_PASS' || row.disposition === 'HUMAN_EXCEPTION'),
  );
  if (!hasPositiveDecision) return false;
  const activeHold = hasActivePurchaseSpecificHoldAuthorityV1(decisions, cases, purchaseAttemptId);
  return !activeHold;
}

export function deriveLifecycleStateV1(args: {
  hasObjectiveCancellation: boolean;
  hasActiveHold: boolean;
  hasEconomicOverlapHold: boolean;
  hasActiveDisputeHold: boolean;
  hasPositiveAuthority: boolean;
  releaseAtMs: number;
  currentEpochMs: number;
  currentLifecycleState: string | null;
}): string {
  if (args.hasObjectiveCancellation) return 'COMMISSION_REVERSED';
  if (args.hasEconomicOverlapHold || args.hasActiveDisputeHold || args.hasActiveHold) {
    return 'COMMISSION_HOLD';
  }
  if (!args.hasPositiveAuthority) {
    return args.currentLifecycleState === 'COMMISSION_HOLD'
      ? 'COMMISSION_HOLD'
      : 'COMMISSION_PENDING_COMPLIANCE_REVIEW';
  }
  if (args.currentEpochMs < args.releaseAtMs) return 'COMMISSION_PENDING_COMPLIANCE_REVIEW';
  return 'COMMISSION_PAYABLE';
}

export function classifyEconomicEventFamilyV1(args: {
  deltaJpy: number;
  targetRemainingEntitlementJpy: number;
  currentLifecycleState: string;
}): 'COMMISSION_ADJUSTED' | 'COMMISSION_REVERSED' | 'CLAWBACK_ACCRUED' | null {
  if (args.deltaJpy === 0) return null;
  if (args.currentLifecycleState === 'COMMISSION_PAYABLE' && args.deltaJpy < 0) {
    return 'CLAWBACK_ACCRUED';
  }
  if (args.targetRemainingEntitlementJpy === 0) return 'COMMISSION_REVERSED';
  return 'COMMISSION_ADJUSTED';
}

export const classifyRefundAdjustmentEventFamilyV1 = classifyEconomicEventFamilyV1;

export function isReversalGrossExceedsOriginalV1(args: {
  effectiveReversalGrossJpy: number;
  originalGrossCustomerPaidJpy: number;
}): boolean {
  return (
    isSafeCommissionMoneyIntegerV1(args.effectiveReversalGrossJpy) &&
    isSafeCommissionMoneyIntegerV1(args.originalGrossCustomerPaidJpy) &&
    args.effectiveReversalGrossJpy > args.originalGrossCustomerPaidJpy
  );
}

export function computeAggregateReconciliationDeltaV1(args: {
  original: R6OriginalMoneySnapshotV1;
  effectiveReversalGrossJpy: number;
  currentEntitlementJpy: number;
}):
  | { ok: true; targetRemainingEntitlementJpy: number; deltaJpy: number }
  | { ok: false; reason: string } {
  if (
    isReversalGrossExceedsOriginalV1({
      effectiveReversalGrossJpy: args.effectiveReversalGrossJpy,
      originalGrossCustomerPaidJpy: args.original.grossCustomerPaidJpy,
    })
  ) {
    return { ok: false, reason: M55_R6_REVERSAL_EXCEEDS_GROSS_REASON };
  }
  const target = computeTargetRemainingEntitlementJpyV1({
    original: args.original,
    effectiveReversalGrossJpy: args.effectiveReversalGrossJpy,
  });
  if (!target.ok) {
    return { ok: false, reason: target.reason ?? 'INVALID_TARGET' };
  }
  const delta = target.targetRemainingEntitlementJpy - args.currentEntitlementJpy;
  if (!Number.isSafeInteger(delta)) return { ok: false, reason: 'DELTA_OVERFLOW' };
  return {
    ok: true,
    targetRemainingEntitlementJpy: target.targetRemainingEntitlementJpy,
    deltaJpy: delta,
  };
}

export function selectMissingCanonicalEconomicTransitionsV1(args: {
  refunds: ReadonlyArray<R6RefundAuthorityRowV1>;
  disputes: ReadonlyArray<R6DisputeAuthorityRowV1>;
  recordedTransitions: ReadonlyArray<R6RecordedEconomicTransitionV1>;
}): R6RecordedEconomicTransitionV1[] {
  const recorded = new Set(
    args.recordedTransitions.map(
      (row) =>
        `${row.sourceEconomicObjectType}:${row.sourceEconomicObjectId}:${row.economicTransition}`,
    ),
  );
  const missing: Array<R6RecordedEconomicTransitionV1 & { sortMs: number; sortId: string }> = [];
  for (const refund of selectEffectiveSucceededRefundsV1(args.refunds)) {
    const key = `REFUND:${refund.providerRefundId}:${M55_R6_REFUND_ECONOMIC_TRANSITION}`;
    if (recorded.has(key)) continue;
    missing.push({
      sourceEconomicObjectType: 'REFUND',
      sourceEconomicObjectId: refund.providerRefundId,
      economicTransition: M55_R6_REFUND_ECONOMIC_TRANSITION,
      sortMs: refund.stripeEventCreatedAtMs,
      sortId: refund.stripeEventId,
    });
  }
  for (const dispute of selectEffectiveLostDisputesV1(args.disputes)) {
    const key = `DISPUTE:${dispute.providerDisputeId}:${M55_R6_DISPUTE_TRANSITION_LOST}`;
    if (recorded.has(key)) continue;
    missing.push({
      sourceEconomicObjectType: 'DISPUTE',
      sourceEconomicObjectId: dispute.providerDisputeId,
      economicTransition: M55_R6_DISPUTE_TRANSITION_LOST,
      sortMs: dispute.stripeEventCreatedAtMs,
      sortId: dispute.stripeEventId,
    });
  }
  missing.sort((a, b) => {
    if (a.sortMs !== b.sortMs) return a.sortMs - b.sortMs;
    if (a.sortId !== b.sortId) return a.sortId.localeCompare(b.sortId);
    if (a.sourceEconomicObjectType !== b.sourceEconomicObjectType) {
      return a.sourceEconomicObjectType.localeCompare(b.sourceEconomicObjectType);
    }
    return a.sourceEconomicObjectId.localeCompare(b.sourceEconomicObjectId);
  });
  return missing.map(({ sourceEconomicObjectType, sourceEconomicObjectId, economicTransition }) => ({
    sourceEconomicObjectType,
    sourceEconomicObjectId,
    economicTransition,
  }));
}

export function selectAggregateDeltaCarrierTransitionV1(
  missingTransitions: ReadonlyArray<R6RecordedEconomicTransitionV1>,
): R6RecordedEconomicTransitionV1 | null {
  if (missingTransitions.length === 0) return null;
  return missingTransitions[missingTransitions.length - 1] ?? null;
}

export function modelSequentialRefundConvergenceV1(args: {
  original: R6OriginalMoneySnapshotV1;
  originalEntitlementJpy: number;
  refunds: ReadonlyArray<R6RefundAuthorityRowV1>;
  arrivalOrder: ReadonlyArray<string>;
}): number {
  let currentEntitlement = args.originalEntitlementJpy;
  const recorded: R6RecordedEconomicTransitionV1[] = [];
  for (const refundId of args.arrivalOrder) {
    const refundsForStep = args.refunds.filter((row) => {
      if (row.providerRefundId === refundId) return true;
      return recorded.some(
        (transition) =>
          transition.sourceEconomicObjectType === 'REFUND' &&
          transition.sourceEconomicObjectId === row.providerRefundId,
      );
    });
    const effective = selectEffectiveSucceededRefundsV1(refundsForStep);
    const reversalTotal = computeCumulativeRefundGrossJpyV1(effective);
    const recon = computeAggregateReconciliationDeltaV1({
      original: args.original,
      effectiveReversalGrossJpy: reversalTotal,
      currentEntitlementJpy: currentEntitlement,
    });
    if (!recon.ok) throw new Error(recon.reason);
    const missing = selectMissingCanonicalEconomicTransitionsV1({
      refunds: refundsForStep,
      disputes: [],
      recordedTransitions: recorded,
    });
    for (const transition of missing) {
      recorded.push(transition);
    }
    currentEntitlement = recon.targetRemainingEntitlementJpy;
  }
  return currentEntitlement;
}

export function modelSequentialLostDisputeConvergenceV1(args: {
  original: R6OriginalMoneySnapshotV1;
  originalEntitlementJpy: number;
  disputes: ReadonlyArray<R6DisputeAuthorityRowV1>;
  arrivalOrder: ReadonlyArray<string>;
}): number {
  let currentEntitlement = args.originalEntitlementJpy;
  const recorded: R6RecordedEconomicTransitionV1[] = [];
  for (const disputeId of args.arrivalOrder) {
    const disputesForStep = args.disputes.filter((row) => {
      if (row.providerDisputeId === disputeId) return true;
      return recorded.some(
        (transition) =>
          transition.sourceEconomicObjectType === 'DISPUTE' &&
          transition.sourceEconomicObjectId === row.providerDisputeId,
      );
    });
    const effective = selectEffectiveLostDisputesV1(disputesForStep);
    const reversalTotal = effective.reduce((sum, row) => sum + row.amountJpy, 0);
    const recon = computeAggregateReconciliationDeltaV1({
      original: args.original,
      effectiveReversalGrossJpy: reversalTotal,
      currentEntitlementJpy: currentEntitlement,
    });
    if (!recon.ok) throw new Error(recon.reason);
    const missing = selectMissingCanonicalEconomicTransitionsV1({
      refunds: [],
      disputes: disputesForStep,
      recordedTransitions: recorded,
    });
    for (const transition of missing) {
      recorded.push(transition);
    }
    currentEntitlement = recon.targetRemainingEntitlementJpy;
  }
  return currentEntitlement;
}

function parseOriginalRpcResult(raw: unknown): {
  outcome: R6RecordOriginalCommissionOutcomeV1;
  commissionEventId?: string;
} {
  if (!raw || typeof raw !== 'object') throw new Error('COMMISSION_RPC_INVALID_RESPONSE');
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') throw new Error('COMMISSION_RPC_FAILED');
  const outcome = row.outcome;
  if (
    outcome !== 'RECORDED' &&
    outcome !== 'CONVERGED' &&
    outcome !== 'NOT_COMMISSION_ELIGIBLE'
  ) {
    throw new Error('COMMISSION_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome,
    commissionEventId:
      typeof row.commission_event_id === 'string' ? row.commission_event_id : undefined,
  };
}

function parseReconcileRpcResult(raw: unknown): { outcome: R6ReconcileCommissionOutcomeV1 } {
  if (!raw || typeof raw !== 'object') throw new Error('COMMISSION_RPC_INVALID_RESPONSE');
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') throw new Error('COMMISSION_RPC_FAILED');
  const outcome = row.outcome;
  if (
    outcome !== 'RECORDED' &&
    outcome !== 'CONVERGED' &&
    outcome !== 'NO_CHANGE' &&
    outcome !== 'NO_COMMISSION_ORIGIN' &&
    outcome !== 'HELD'
  ) {
    throw new Error('COMMISSION_RPC_UNEXPECTED_SHAPE');
  }
  return { outcome };
}

export async function callRecordOriginalCommissionRpcV1(args: {
  db?: unknown;
  paymentIntentId: string;
}): Promise<{ outcome: R6RecordOriginalCommissionOutcomeV1; commissionEventId?: string }> {
  const db = (args.db ?? getSupabaseAdmin()) as {
    rpc: (name: string, params: Record<string, unknown>) => Promise<{
      data: unknown;
      error: unknown;
    }>;
  };
  const { data, error } = await db.rpc(M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME, {
    p_payment_intent_id: args.paymentIntentId,
  });
  if (error) throw new Error(classifyCommissionLedgerRpcErrorV1(error));
  return parseOriginalRpcResult(data);
}

export async function callReconcileCommissionRpcV1(args: {
  db?: unknown;
  paymentIntentId: string;
}): Promise<{ outcome: R6ReconcileCommissionOutcomeV1 }> {
  const db = (args.db ?? getSupabaseAdmin()) as {
    rpc: (name: string, params: Record<string, unknown>) => Promise<{
      data: unknown;
      error: unknown;
    }>;
  };
  const { data, error } = await db.rpc(M55_R6_RECONCILE_COMMISSION_RPC_NAME, {
    p_payment_intent_id: args.paymentIntentId,
  });
  if (error) throw new Error(classifyCommissionLedgerRpcErrorV1(error));
  return parseReconcileRpcResult(data);
}

export async function runR6CommissionLedgerPipelineForPaymentIntentV1(args: {
  db: unknown;
  paymentIntentId: string;
}): Promise<void> {
  const original = await callRecordOriginalCommissionRpcV1({
    db: args.db,
    paymentIntentId: args.paymentIntentId,
  });
  if (original.outcome === 'NOT_COMMISSION_ELIGIBLE') return;
  await callReconcileCommissionRpcV1({
    db: args.db,
    paymentIntentId: args.paymentIntentId,
  });
}

export function isCommissionLedgerRpcFailureMessageV1(message: string): boolean {
  return (
    message === M55_R6_COMMISSION_LEDGER_RPC_TRANSPORT_ERROR ||
    LEDGER_RPC_SEMANTIC.has(message)
  );
}
