import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const {
  M55_R6_COMMISSION_CALCULATION_VERSION,
  M55_R6_COMMISSION_LEDGER_MIGRATION_FILENAME,
  M55_R6_DISPUTE_TRANSITION_HOLD_STARTED,
  M55_R6_DISPUTE_TRANSITION_LOST,
  M55_R6_ELIGIBLE_PRODUCT_POLICY_VERSION,
  M55_R6_FALLBACK_TAX_RATE_BPS,
  M55_R6_FINANCIAL_POLICY_VERSION,
  M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY,
  M55_R6_MS_PER_DAY,
  M55_R6_OVERLAP_HOLD_REASON,
  M55_R6_RATE_SCHEDULE_VERSION,
  M55_R6_RATE_TIER_180_DAYS_MS,
  M55_R6_RATE_TIER_365_DAYS_MS,
  M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME,
  M55_R6_RECONCILE_COMMISSION_RPC_NAME,
  M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME,
  M55_R6_REFUND_ECONOMIC_TRANSITION,
  M55_R6_REVERSAL_EXCEEDS_GROSS_REASON,
  M55_R6_REVIEW_WINDOW_MS,
  classifyEconomicEventFamilyV1,
  classifyLatestDisputeAuthorityV1,
  classifyRefundAdjustmentEventFamilyV1,
  computeAggregateReconciliationDeltaV1,
  computeCommissionBaseTaxExclusionJpyV1,
  computeCumulativeRefundGrossJpyV1,
  computeOriginalCommissionMoneyV1,
  computeReleaseAtMsV1,
  computeTargetRemainingEntitlementJpyV1,
  computeEffectiveTargetEntitlementJpyV1,
  deriveCommissionRateBasisPointsV1,
  deriveLifecycleAfterEconomicEventV1,
  deriveLifecycleStateV1,
  floorDivBigIntV1,
  isEconomicTerminalReversedV1,
  hasActivePurchaseSpecificHoldAuthorityV1,
  hasPurchaseSpecificObjectiveCancellationV1,
  hasPurchaseSpecificPositiveAuthorityV1,
  hasRefundDisputeEconomicOverlapV1,
  isAutoHoldDecisionStillActiveV1,
  isReversalGrossExceedsOriginalV1,
  modelConcurrentEvidenceLockScheduleV1,
  modelObjectiveCancelThenPartialRefundConvergenceV1,
  modelObjectiveProvenanceBeforeEconomicSourceV1,
  modelSequentialLostDisputeConvergenceV1,
  modelSequentialRefundConvergenceV1,
  modelTerminalFullReversalLifecycleV1,
  selectAggregateDeltaCarrierTransitionV1,
  selectEffectiveLostDisputesV1,
  selectEffectiveSucceededRefundsV1,
  selectMissingCanonicalEconomicTransitionsV1,
  sumEconomicEntitlementJpyV1,
} = await import('./r6CommissionLedgerContract');

const TEST_SOURCE = readFileSync(import.meta.filename, 'utf8');
const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations', M55_R6_COMMISSION_LEDGER_MIGRATION_FILENAME),
  'utf8',
);
const R5_COMPLIANCE_SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260924000000_m55_r5_compliance_control_plane_v1.sql'),
  'utf8',
);
const WEBHOOK = readFileSync(join(process.cwd(), 'app/api/stripe/webhook/route.ts'), 'utf8');
const FROZEN_HANDLE_CHARGE_REFUNDED_BODY_SHA256 =
  '8ab2356585150e209b2749b053277705d26f861e11a65c0c61b37e8a0574fc66';

function extractRpcBody(sql: string, fnName: string): string {
  const start = sql.search(new RegExp(`create function public\\.${fnName}`, 'i'));
  const end = sql.search(new RegExp(`revoke all on function public\\.${fnName}`, 'i'));
  if (start < 0 || end < 0 || end <= start) throw new Error(`RPC_BODY_NOT_FOUND:${fnName}`);
  return sql.slice(start, end);
}

function extractHandleChargeRefundedBody(source: string): string {
  const match = source.match(/async function handleChargeRefunded\([\s\S]*?\n\}/);
  if (!match) throw new Error('handleChargeRefunded not found');
  return match[0];
}

function extractHelperFunctionBody(sql: string, helper: string): string {
  const start = sql.search(new RegExp(`create function public\\.${helper}`, 'i'));
  const end = sql.search(new RegExp(`revoke all on function public\\.${helper}`, 'i'));
  if (start < 0 || end < 0 || end <= start) throw new Error(`HELPER_BODY_NOT_FOUND:${helper}`);
  return sql.slice(start, end);
}

function extractHelperPrivilegeBlock(sql: string, helper: string): string {
  const revokeStart = sql.search(new RegExp(`revoke all on function public\\.${helper}`, 'i'));
  if (revokeStart < 0) throw new Error(`HELPER_PRIVILEGE_NOT_FOUND:${helper}`);
  const grantRel = sql
    .slice(revokeStart)
    .search(new RegExp(`grant execute on function public\\.${helper}`, 'i'));
  if (grantRel < 0) throw new Error(`HELPER_GRANT_NOT_FOUND:${helper}`);
  const grantStart = revokeStart + grantRel;
  return sql.slice(revokeStart, grantStart + 400);
}

const REFUND_CONVERGENCE_ORIGINAL = {
  grossCustomerPaidJpy: 2000,
  authoritativeTaxAmountPresent: true,
  authoritativePurchaseTaxAmountJpy: 0,
  taxRateBps: 1000,
  commissionRateBasisPoints: 5000,
  immediatelyIneligibleAmountJpy: 0,
};

describe('r6CommissionLedgerContract — version constants', () => {
  it('freezes exact Human policy version identifiers', () => {
    assert.equal(M55_R6_FINANCIAL_POLICY_VERSION, 'r6_financial_policy_v1');
    assert.equal(M55_R6_COMMISSION_CALCULATION_VERSION, 'r6_commission_calculation_v1');
    assert.equal(M55_R6_RATE_SCHEDULE_VERSION, 'r6_standard_rate_schedule_v1');
    assert.equal(M55_R6_ELIGIBLE_PRODUCT_POLICY_VERSION, 'r6_affiliate_eligible_products_v1');
    assert.equal(M55_R6_FALLBACK_TAX_RATE_BPS, 1000);
    assert.equal(M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY, 0);
  });
});

describe('r6CommissionLedgerContract — rate boundaries', () => {
  const approval = 1_700_000_000_000;

  it('locks 5000 bps at exact approval and through +180d - 1ms', () => {
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval,
      }),
      { ok: true, commissionRateBasisPoints: 5000 },
    );
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval + M55_R6_RATE_TIER_180_DAYS_MS - 1,
      }),
      { ok: true, commissionRateBasisPoints: 5000 },
    );
  });

  it('locks 4000 bps at +180d through +365d - 1ms', () => {
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval + M55_R6_RATE_TIER_180_DAYS_MS,
      }),
      { ok: true, commissionRateBasisPoints: 4000 },
    );
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval + M55_R6_RATE_TIER_365_DAYS_MS - 1,
      }),
      { ok: true, commissionRateBasisPoints: 4000 },
    );
  });

  it('locks 3000 bps at +365d and beyond', () => {
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval + M55_R6_RATE_TIER_365_DAYS_MS,
      }),
      { ok: true, commissionRateBasisPoints: 3000 },
    );
  });

  it('rejects payment before approval and unsafe timestamps', () => {
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: approval,
        canonicalPaymentSucceededAtMs: approval - 1,
      }),
      { ok: false, reason: 'PAYMENT_BEFORE_APPROVAL' },
    );
    assert.deepEqual(
      deriveCommissionRateBasisPointsV1({
        creatorFirstFinalApprovedAtMs: Number.NaN,
        canonicalPaymentSucceededAtMs: approval,
      }),
      { ok: false, reason: 'INVALID_TIMESTAMP' },
    );
  });
});

describe('r6CommissionLedgerContract — original money calculation', () => {
  it('A: authoritative tax 134 on gross 1480 at 50% => 673', () => {
    const result = computeOriginalCommissionMoneyV1({
      grossCustomerPaidJpy: 1480,
      authoritativeTaxAmountPresent: true,
      authoritativePurchaseTaxAmountJpy: 134,
      taxRateBps: 1000,
      commissionRateBasisPoints: 5000,
      immediatelyIneligibleAmountJpy: 0,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.commissionableRevenueJpy, 1346);
      assert.equal(result.grossCommissionJpy, 673);
    }
  });

  it('B: fallback tax on gross 1000 at 50% => 455', () => {
    const result = computeOriginalCommissionMoneyV1({
      grossCustomerPaidJpy: 1000,
      authoritativeTaxAmountPresent: false,
      authoritativePurchaseTaxAmountJpy: null,
      taxRateBps: 1000,
      commissionRateBasisPoints: 5000,
      immediatelyIneligibleAmountJpy: 0,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.commissionBaseTaxExclusionJpy, 90);
      assert.equal(result.commissionableRevenueJpy, 910);
      assert.equal(result.grossCommissionJpy, 455);
    }
  });

  it('C: 910 @ 4000 => 364', () => {
    const result = computeGrossCommissionFromCommissionable(910, 4000);
    assert.equal(result, 364);
  });

  it('D: 910 @ 3000 => 273', () => {
    const result = computeGrossCommissionFromCommissionable(910, 3000);
    assert.equal(result, 273);
  });

  it('E: authoritative tax 0 is valid', () => {
    const tax = computeCommissionBaseTaxExclusionJpyV1({
      grossCustomerPaidJpy: 1000,
      authoritativeTaxAmountPresent: true,
      authoritativePurchaseTaxAmountJpy: 0,
      taxRateBps: 1000,
    });
    assert.equal(tax.ok, true);
    if (tax.ok) assert.equal(tax.commissionBaseTaxExclusionJpy, 0);
  });

  it('F/G: discount is not subtracted again and ineligible amount is zero', () => {
    const result = computeOriginalCommissionMoneyV1({
      grossCustomerPaidJpy: 900,
      authoritativeTaxAmountPresent: false,
      authoritativePurchaseTaxAmountJpy: null,
      taxRateBps: 1000,
      commissionRateBasisPoints: 5000,
      immediatelyIneligibleAmountJpy: M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.commissionableRevenueJpy, 900 - 81);
  });

  it('H: rejects negative and unsafe values', () => {
    assert.equal(
      computeOriginalCommissionMoneyV1({
        grossCustomerPaidJpy: -1,
        authoritativeTaxAmountPresent: false,
        authoritativePurchaseTaxAmountJpy: null,
        taxRateBps: 1000,
        commissionRateBasisPoints: 5000,
        immediatelyIneligibleAmountJpy: 0,
      }).ok,
      false,
    );
  });

  it('I: BigInt intermediate exactness for fallback tax', () => {
    const exclusion = Number(floorDivBigIntV1(1000n * 1000n, 11000n));
    assert.equal(exclusion, 90);
  });
});

function computeGrossCommissionFromCommissionable(
  commissionable: number,
  bps: number,
): number {
  const result = computeOriginalCommissionMoneyV1({
    grossCustomerPaidJpy: commissionable,
    authoritativeTaxAmountPresent: true,
    authoritativePurchaseTaxAmountJpy: 0,
    taxRateBps: 1000,
    commissionRateBasisPoints: bps,
    immediatelyIneligibleAmountJpy: 0,
  });
  assert.equal(result.ok, true);
  return result.ok ? result.grossCommissionJpy : -1;
}

describe('r6CommissionLedgerContract — partial reversal tax', () => {
  const original = {
    grossCustomerPaidJpy: 1480,
    authoritativeTaxAmountPresent: true,
    authoritativePurchaseTaxAmountJpy: 134,
    taxRateBps: 1000,
    commissionRateBasisPoints: 5000,
    immediatelyIneligibleAmountJpy: 0,
  };

  it('uses proportional authoritative tax from original snapshot', () => {
    const remainingGross = 740;
    const target = computeTargetRemainingEntitlementJpyV1({
      original,
      effectiveReversalGrossJpy: 1480 - remainingGross,
    });
    assert.equal(target.ok, true);
    if (target.ok) {
      const expectedTax = Number(floorDivBigIntV1(134n * 740n, 1480n));
      assert.equal(expectedTax, 67);
      assert.equal(target.targetRemainingEntitlementJpy, 336);
    }
  });

  it('uses fallback tax formula on remaining gross', () => {
    const target = computeTargetRemainingEntitlementJpyV1({
      original: {
        grossCustomerPaidJpy: 1000,
        authoritativeTaxAmountPresent: false,
        authoritativePurchaseTaxAmountJpy: null,
        taxRateBps: 1000,
        commissionRateBasisPoints: 5000,
        immediatelyIneligibleAmountJpy: 0,
      },
      effectiveReversalGrossJpy: 500,
    });
    assert.equal(target.ok, true);
    if (target.ok) assert.equal(target.targetRemainingEntitlementJpy, 227);
  });

  it('full reversal target is zero', () => {
    const target = computeTargetRemainingEntitlementJpyV1({
      original,
      effectiveReversalGrossJpy: 1480,
    });
    assert.equal(target.ok, true);
    if (target.ok) assert.equal(target.targetRemainingEntitlementJpy, 0);
  });
});

describe('r6CommissionLedgerContract — refund replay', () => {
  it('selects latest authority per provider refund id', () => {
    const effective = selectEffectiveSucceededRefundsV1([
      {
        providerRefundId: 're_1',
        stripeEventCreatedAtMs: 100,
        stripeEventId: 'evt_a',
        refundStatus: 'pending',
        amountJpy: 100,
      },
      {
        providerRefundId: 're_1',
        stripeEventCreatedAtMs: 200,
        stripeEventId: 'evt_b',
        refundStatus: 'succeeded',
        amountJpy: 100,
      },
      {
        providerRefundId: 're_2',
        stripeEventCreatedAtMs: 150,
        stripeEventId: 'evt_c',
        refundStatus: 'succeeded',
        amountJpy: 50,
      },
    ]);
    assert.equal(effective.length, 2);
    assert.equal(effective[0].providerRefundId, 're_2');
    assert.equal(effective[1].providerRefundId, 're_1');
    assert.equal(computeCumulativeRefundGrossJpyV1(effective), 150);
  });

  it('out-of-order arrival yields same cumulative total as chronological', () => {
    const chronological = selectEffectiveSucceededRefundsV1([
      { providerRefundId: 're_1', stripeEventCreatedAtMs: 100, stripeEventId: 'a', refundStatus: 'succeeded', amountJpy: 100 },
      { providerRefundId: 're_2', stripeEventCreatedAtMs: 200, stripeEventId: 'b', refundStatus: 'succeeded', amountJpy: 50 },
    ]);
    const outOfOrder = selectEffectiveSucceededRefundsV1([
      { providerRefundId: 're_2', stripeEventCreatedAtMs: 200, stripeEventId: 'b', refundStatus: 'succeeded', amountJpy: 50 },
      { providerRefundId: 're_1', stripeEventCreatedAtMs: 100, stripeEventId: 'a', refundStatus: 'succeeded', amountJpy: 100 },
    ]);
    assert.equal(
      computeCumulativeRefundGrossJpyV1(chronological),
      computeCumulativeRefundGrossJpyV1(outOfOrder),
    );
  });
});

describe('r6CommissionLedgerContract — dispute authority', () => {
  it('classifies hold-only nonterminal events', () => {
    assert.equal(
      classifyLatestDisputeAuthorityV1({
        providerDisputeId: 'dp_1',
        stripeEventType: 'charge.dispute.funds_withdrawn',
        stripeEventCreatedAtMs: 1,
        stripeEventId: 'evt_1',
        disputeStatus: 'needs_response',
        amountJpy: 1000,
      }),
      'ACTIVE_HOLD',
    );
  });

  it('classifies won and lost closed disputes', () => {
    assert.equal(
      classifyLatestDisputeAuthorityV1({
        providerDisputeId: 'dp_1',
        stripeEventType: 'charge.dispute.closed',
        stripeEventCreatedAtMs: 1,
        stripeEventId: 'evt_1',
        disputeStatus: 'won',
        amountJpy: 1000,
      }),
      'DISPUTE_WON',
    );
    assert.equal(
      classifyLatestDisputeAuthorityV1({
        providerDisputeId: 'dp_1',
        stripeEventType: 'charge.dispute.closed',
        stripeEventCreatedAtMs: 1,
        stripeEventId: 'evt_1',
        disputeStatus: 'lost',
        amountJpy: 1000,
      }),
      'DISPUTE_LOST',
    );
  });

  it('selects effective lost disputes deterministically', () => {
    const lost = selectEffectiveLostDisputesV1([
      {
        providerDisputeId: 'dp_2',
        stripeEventType: 'charge.dispute.closed',
        stripeEventCreatedAtMs: 200,
        stripeEventId: 'evt_b',
        disputeStatus: 'lost',
        amountJpy: 500,
      },
      {
        providerDisputeId: 'dp_1',
        stripeEventType: 'charge.dispute.closed',
        stripeEventCreatedAtMs: 100,
        stripeEventId: 'evt_a',
        disputeStatus: 'lost',
        amountJpy: 300,
      },
    ]);
    assert.equal(lost[0].providerDisputeId, 'dp_1');
    assert.equal(lost[1].providerDisputeId, 'dp_2');
  });
});

describe('r6CommissionLedgerContract — overlap safety', () => {
  it('detects refund + lost dispute overlap', () => {
    assert.equal(
      hasRefundDisputeEconomicOverlapV1({
        effectiveRefundGrossJpy: 100,
        effectiveLostDisputeGrossJpy: 200,
      }),
      true,
    );
    assert.equal(
      hasRefundDisputeEconomicOverlapV1({
        effectiveRefundGrossJpy: 0,
        effectiveLostDisputeGrossJpy: 200,
      }),
      false,
    );
    assert.equal(M55_R6_OVERLAP_HOLD_REASON, 'ECONOMIC_OVERLAP_RECONCILIATION_REQUIRED');
  });
});

describe('r6CommissionLedgerContract — compliance lifecycle', () => {
  const purchaseAttemptId = 'pa_1';

  it('objective cancellation reverses', () => {
    assert.equal(
      hasPurchaseSpecificObjectiveCancellationV1(
        [{ decisionId: 'd1', purchaseAttemptId, disposition: 'AUTO_CANCEL_OBJECTIVE', decisionTimestampMs: 1 }],
        purchaseAttemptId,
      ),
      true,
    );
    assert.equal(
      deriveLifecycleStateV1({
        hasObjectiveCancellation: true,
        economicTerminalReversed: false,
        hasActiveHold: false,
        hasEconomicOverlapHold: false,
        hasActiveDisputeHold: false,
        hasPositiveAuthority: true,
        releaseAtMs: 0,
        currentEpochMs: 999_999_999_999,
        currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      }),
      'COMMISSION_REVERSED',
    );
  });

  it('active hold blocks payable even after release', () => {
    assert.equal(
      hasActivePurchaseSpecificHoldAuthorityV1(
        [{ decisionId: 'd1', purchaseAttemptId, disposition: 'AUTO_HOLD', decisionTimestampMs: 1 }],
        [
          {
            caseId: 'c1',
            purchaseAttemptId,
            status: 'HOLD',
            decision: 'KEEP_HOLD',
            adverseDecisionId: null,
            createdAtMs: 1,
            eventId: 'e1',
          },
        ],
        purchaseAttemptId,
      ),
      true,
    );
    assert.equal(
      deriveLifecycleStateV1({
        hasObjectiveCancellation: false,
        economicTerminalReversed: false,
        hasActiveHold: true,
        hasEconomicOverlapHold: false,
        hasActiveDisputeHold: false,
        hasPositiveAuthority: true,
        releaseAtMs: 1,
        currentEpochMs: 999_999_999_999,
        currentLifecycleState: 'COMMISSION_HOLD',
      }),
      'COMMISSION_HOLD',
    );
  });

  it('requires positive authority for payable after release', () => {
    assert.equal(
      hasPurchaseSpecificPositiveAuthorityV1(
        [{ decisionId: 'd1', purchaseAttemptId, disposition: 'AUTO_PASS', decisionTimestampMs: 1 }],
        [],
        purchaseAttemptId,
      ),
      true,
    );
    assert.equal(
      deriveLifecycleStateV1({
        hasObjectiveCancellation: false,
        economicTerminalReversed: false,
        hasActiveHold: false,
        hasEconomicOverlapHold: false,
        hasActiveDisputeHold: false,
        hasPositiveAuthority: true,
        releaseAtMs: 1000,
        currentEpochMs: 1000,
        currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      }),
      'COMMISSION_PAYABLE',
    );
    assert.equal(
      deriveLifecycleStateV1({
        hasObjectiveCancellation: false,
        economicTerminalReversed: false,
        hasActiveHold: false,
        hasEconomicOverlapHold: false,
        hasActiveDisputeHold: false,
        hasPositiveAuthority: false,
        releaseAtMs: 1000,
        currentEpochMs: 2000,
        currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      }),
      'COMMISSION_PENDING_COMPLIANCE_REVIEW',
    );
  });

  it('creator-wide null purchase decision does not auto-reverse historical commission', () => {
    assert.equal(
      hasPurchaseSpecificObjectiveCancellationV1(
        [{ decisionId: 'd1', purchaseAttemptId: null, disposition: 'AUTO_CANCEL_OBJECTIVE', decisionTimestampMs: 1 }],
        purchaseAttemptId,
      ),
      false,
    );
  });
});

describe('r6CommissionLedgerContract — AUTO_HOLD release semantics', () => {
  const purchaseAttemptId = 'pa_1';
  const holdDecision = {
    decisionId: 'd_hold',
    purchaseAttemptId,
    disposition: 'AUTO_HOLD',
    decisionTimestampMs: 1,
  };

  it('released AUTO_HOLD is no longer active', () => {
    assert.equal(
      isAutoHoldDecisionStillActiveV1(holdDecision, [
        {
          caseId: 'c1',
          purchaseAttemptId,
          status: 'RESOLVED',
          decision: 'RELEASE',
          adverseDecisionId: 'd_hold',
          createdAtMs: 2,
          eventId: 'e1',
        },
      ]),
      false,
    );
    assert.equal(
      hasActivePurchaseSpecificHoldAuthorityV1([holdDecision], [], purchaseAttemptId),
      true,
    );
    assert.equal(
      hasActivePurchaseSpecificHoldAuthorityV1(
        [holdDecision],
        [
          {
            caseId: 'c1',
            purchaseAttemptId,
            status: 'RESOLVED',
            decision: 'RELEASE',
            adverseDecisionId: 'd_hold',
            createdAtMs: 2,
            eventId: 'e1',
          },
        ],
        purchaseAttemptId,
      ),
      false,
    );
  });

  it('AUTO_RELEASE and supersession clear historical AUTO_HOLD', () => {
    for (const decision of [
      'AUTO_RELEASE',
      'SUPERSEDED_BY_NEW_MACHINE_DECISION',
      'SUPERSEDED_BY_OBJECTIVE_DECISION',
    ]) {
      assert.equal(
        isAutoHoldDecisionStillActiveV1(holdDecision, [
          {
            caseId: 'c2',
            purchaseAttemptId,
            status: 'RESOLVED',
            decision,
            adverseDecisionId: 'd_hold',
            createdAtMs: 2,
            eventId: 'e2',
          },
        ]),
        false,
      );
    }
  });

  it('KEEP_HOLD and unresolved AUTO_HOLD remain active', () => {
    assert.equal(
      isAutoHoldDecisionStillActiveV1(holdDecision, [
        {
          caseId: 'c3',
          purchaseAttemptId,
          status: 'RESOLVED',
          decision: 'KEEP_HOLD',
          adverseDecisionId: 'd_hold',
          createdAtMs: 2,
          eventId: 'e3',
        },
      ]),
      true,
    );
    assert.equal(isAutoHoldDecisionStillActiveV1(holdDecision, []), true);
  });

  it('independent active OPEN/HOLD case still holds', () => {
    assert.equal(
      hasActivePurchaseSpecificHoldAuthorityV1(
        [],
        [
          {
            caseId: 'c4',
            purchaseAttemptId,
            status: 'OPEN',
            decision: null,
            adverseDecisionId: null,
            createdAtMs: 1,
            eventId: 'e4',
          },
        ],
        purchaseAttemptId,
      ),
      true,
    );
  });
});

describe('r6CommissionLedgerContract — release_at and entitlement delta', () => {
  it('uses exact 30-day review window in milliseconds', () => {
    const payment = 1_700_000_000_000;
    assert.equal(computeReleaseAtMsV1(payment), payment + M55_R6_REVIEW_WINDOW_MS);
    assert.equal(M55_R6_REVIEW_WINDOW_MS, 2_592_000_000);
  });

  it('sums economic entitlement from delta families only', () => {
    const total = sumEconomicEntitlementJpyV1([
      { eventFamily: 'COMMISSION_ACCRUED', commissionDeltaJpy: 455 },
      { eventFamily: 'COMMISSION_ADJUSTED', commissionDeltaJpy: -100 },
      { eventFamily: 'COMMISSION_HELD', commissionDeltaJpy: 0 },
      { eventFamily: 'CLAWBACK_ACCRUED', commissionDeltaJpy: -50 },
    ]);
    assert.equal(total, 305);
  });

  it('classifies economic event families with PAYABLE clawback before reversal', () => {
    assert.equal(
      classifyEconomicEventFamilyV1({
        deltaJpy: -455,
        targetRemainingEntitlementJpy: 0,
        currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      }),
      'COMMISSION_REVERSED',
    );
    assert.equal(
      classifyEconomicEventFamilyV1({
        deltaJpy: -1000,
        targetRemainingEntitlementJpy: 0,
        currentLifecycleState: 'COMMISSION_PAYABLE',
      }),
      'CLAWBACK_ACCRUED',
    );
    assert.equal(
      classifyEconomicEventFamilyV1({
        deltaJpy: -50,
        targetRemainingEntitlementJpy: 405,
        currentLifecycleState: 'COMMISSION_PAYABLE',
      }),
      'CLAWBACK_ACCRUED',
    );
    assert.equal(
      classifyRefundAdjustmentEventFamilyV1({
        deltaJpy: 0,
        targetRemainingEntitlementJpy: 405,
        currentLifecycleState: 'COMMISSION_PAYABLE',
      }),
      null,
    );
  });

  it('computes aggregate reconciliation delta from full current target', () => {
    const recon = computeAggregateReconciliationDeltaV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      effectiveReversalGrossJpy: 400,
      currentEntitlementJpy: 900,
    });
    assert.equal(recon.ok, true);
    if (recon.ok) {
      assert.equal(recon.targetRemainingEntitlementJpy, 800);
      assert.equal(recon.deltaJpy, -100);
    }
  });
});

describe('r6CommissionLedgerContract — out-of-order economic convergence', () => {
  const refundA = {
    providerRefundId: 're_a',
    stripeEventCreatedAtMs: 100,
    stripeEventId: 'evt_a',
    refundStatus: 'succeeded',
    amountJpy: 200,
  };
  const refundB = {
    providerRefundId: 're_b',
    stripeEventCreatedAtMs: 200,
    stripeEventId: 'evt_b',
    refundStatus: 'succeeded',
    amountJpy: 200,
  };
  const refunds = [refundA, refundB];

  it('late-earlier refund arrival converges to full current target entitlement', () => {
    const reverseArrival = modelSequentialRefundConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      refunds,
      arrivalOrder: ['re_b', 're_a'],
    });
    assert.equal(reverseArrival, 800);
  });

  it('chronological refund arrival converges to the same final entitlement', () => {
    const chronological = modelSequentialRefundConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      refunds,
      arrivalOrder: ['re_a', 're_b'],
    });
    assert.equal(chronological, 800);
  });

  it('selects deterministic canonical missing transitions and delta carrier', () => {
    const missing = selectMissingCanonicalEconomicTransitionsV1({
      refunds,
      disputes: [],
      recordedTransitions: [],
    });
    assert.deepEqual(
      missing.map((row) => row.sourceEconomicObjectId),
      ['re_a', 're_b'],
    );
    const carrier = selectAggregateDeltaCarrierTransitionV1(missing);
    assert.equal(carrier?.sourceEconomicObjectId, 're_b');
  });

  it('lost-dispute late-earlier arrival converges to full current target', () => {
    const disputeA = {
      providerDisputeId: 'dp_a',
      stripeEventType: 'charge.dispute.closed',
      stripeEventCreatedAtMs: 100,
      stripeEventId: 'evt_a',
      disputeStatus: 'lost',
      amountJpy: 200,
    };
    const disputeB = {
      providerDisputeId: 'dp_b',
      stripeEventType: 'charge.dispute.closed',
      stripeEventCreatedAtMs: 200,
      stripeEventId: 'evt_b',
      disputeStatus: 'lost',
      amountJpy: 200,
    };
    const disputes = [disputeA, disputeB];
    const reverseArrival = modelSequentialLostDisputeConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      disputes,
      arrivalOrder: ['dp_b', 'dp_a'],
    });
    const chronological = modelSequentialLostDisputeConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      disputes,
      arrivalOrder: ['dp_a', 'dp_b'],
    });
    assert.equal(reverseArrival, 800);
    assert.equal(chronological, 800);
  });
});

describe('r6CommissionLedgerContract — PATCH-3 terminal reversal', () => {
  it('CASE A: PENDING full refund stays REVERSED after release reconcile', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      releaseAtMs: 1,
      currentEpochMs: 2,
      hasPositiveAuthority: true,
    });
    assert.equal(result.moneyEventFamily, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterMoneyEvent, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.payableStateEventEmitted, false);
  });

  it('CASE B: PAYABLE full refund uses CLAWBACK_ACCRUED and stays REVERSED', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_PAYABLE',
      releaseAtMs: 1,
      currentEpochMs: 2,
      hasPositiveAuthority: true,
    });
    assert.equal(result.moneyEventFamily, 'CLAWBACK_ACCRUED');
    assert.equal(result.lifecycleAfterMoneyEvent, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.payableStateEventEmitted, false);
  });

  it('derives economic terminal reversal from current authority not zero balance alone', () => {
    assert.equal(
      isEconomicTerminalReversedV1({
        hasObjectiveCancellation: false,
        targetRemainingEntitlementJpy: 0,
        effectiveReversalGrossJpy: 2000,
      }),
      true,
    );
    assert.equal(
      isEconomicTerminalReversedV1({
        hasObjectiveCancellation: false,
        targetRemainingEntitlementJpy: 0,
        effectiveReversalGrossJpy: 0,
      }),
      false,
    );
    assert.equal(
      deriveLifecycleAfterEconomicEventV1({
        hasObjectiveCancellation: false,
        entitlementAfterEventJpy: 0,
        effectiveReversalGrossJpy: 2000,
        currentLifecycleState: 'COMMISSION_PAYABLE',
      }),
      'COMMISSION_REVERSED',
    );
  });
});

describe('r6CommissionLedgerContract — PATCH-3A terminal lifecycle priority', () => {
  it('no-positive authority + full refund stays REVERSED after reconcile', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      releaseAtMs: 1,
      currentEpochMs: 2,
      hasPositiveAuthority: false,
    });
    assert.equal(result.moneyEventFamily, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterMoneyEvent, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterRepeatReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.pendingStateEventEmitted, false);
    assert.equal(result.payableStateEventEmitted, false);
  });

  it('active hold + full refund outranks HOLD and stays REVERSED', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_HOLD',
      releaseAtMs: 1,
      currentEpochMs: 2,
      hasPositiveAuthority: true,
      hasActiveHold: true,
    });
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.lifecycleAfterRepeatReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.holdStateEventEmitted, false);
  });

  it('positive authority pre-release full reversal stays REVERSED not PENDING', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      releaseAtMs: 100,
      currentEpochMs: 50,
      hasPositiveAuthority: true,
    });
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.pendingStateEventEmitted, false);
  });

  it('positive authority post-release full reversal stays REVERSED not PAYABLE', () => {
    const result = modelTerminalFullReversalLifecycleV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 1000,
      fullReversalGrossJpy: 2000,
      currentLifecycleState: 'COMMISSION_PAYABLE',
      releaseAtMs: 1,
      currentEpochMs: 2,
      hasPositiveAuthority: true,
    });
    assert.equal(result.moneyEventFamily, 'CLAWBACK_ACCRUED');
    assert.equal(result.lifecycleAfterReleaseReconcile, 'COMMISSION_REVERSED');
    assert.equal(result.payableStateEventEmitted, false);
    assert.equal(result.lifecycleAfterRepeatReconcile, 'COMMISSION_REVERSED');
  });

  it('objective cancellation preservation keeps target zero without economicTerminalReversed', () => {
    const result = modelObjectiveCancelThenPartialRefundConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 5000,
      partialRefundGrossJpy: 1000,
    });
    assert.equal(
      isEconomicTerminalReversedV1({
        hasObjectiveCancellation: true,
        targetRemainingEntitlementJpy: 0,
        effectiveReversalGrossJpy: 1000,
      }),
      false,
    );
    assert.equal(result.entitlementJpy, 0);
    assert.equal(result.lifecycleState, 'COMMISSION_REVERSED');
    assert.equal(result.positiveEconomicDeltaEmitted, false);
  });
});

describe('r6CommissionLedgerContract — PATCH-3 objective cancellation terminality', () => {
  it('objective cancel forces target zero before refund delta generation', () => {
    const target = computeEffectiveTargetEntitlementJpyV1({
      hasObjectiveCancellation: true,
      original: REFUND_CONVERGENCE_ORIGINAL,
      effectiveReversalGrossJpy: 1000,
    });
    assert.equal(target.ok, true);
    if (target.ok) assert.equal(target.targetRemainingEntitlementJpy, 0);
  });

  it('cancel then partial refund does not resurrect positive entitlement', () => {
    const result = modelObjectiveCancelThenPartialRefundConvergenceV1({
      original: REFUND_CONVERGENCE_ORIGINAL,
      originalEntitlementJpy: 5000,
      partialRefundGrossJpy: 1000,
    });
    assert.equal(result.entitlementJpy, 0);
    assert.equal(result.positiveEconomicDeltaEmitted, false);
    assert.equal(result.lifecycleState, 'COMMISSION_REVERSED');
  });

  it('partial refund then cancel still converges to zero', () => {
    const partialTarget = computeEffectiveTargetEntitlementJpyV1({
      hasObjectiveCancellation: false,
      original: REFUND_CONVERGENCE_ORIGINAL,
      effectiveReversalGrossJpy: 1000,
    });
    assert.equal(partialTarget.ok, true);
    const afterCancel = computeEffectiveTargetEntitlementJpyV1({
      hasObjectiveCancellation: true,
      original: REFUND_CONVERGENCE_ORIGINAL,
      effectiveReversalGrossJpy: 1000,
    });
    assert.equal(afterCancel.ok, true);
    if (partialTarget.ok && afterCancel.ok) {
      assert.ok(partialTarget.targetRemainingEntitlementJpy > 0);
      assert.equal(afterCancel.targetRemainingEntitlementJpy, 0);
    }
  });
});

describe('r6CommissionLedgerContract — PATCH-3 concurrent evidence lock', () => {
  it('blocks T2 evidence insert visibility while T1 holds commission lock', () => {
    const blocked = modelConcurrentEvidenceLockScheduleV1({
      refundACommitted: true,
      t1AcquiresLock: true,
      t2AttemptsInsertWhileT1Locked: true,
      t1ReleasesLock: false,
      t2RetriesInsert: false,
    });
    assert.equal(blocked.t2InsertVisibleDuringT1, false);
    assert.equal(blocked.reconcileSeesConsistentEvidence, true);
  });

  it('allows T2 insert after T1 releases lock and converges consistently', () => {
    const released = modelConcurrentEvidenceLockScheduleV1({
      refundACommitted: true,
      t1AcquiresLock: true,
      t2AttemptsInsertWhileT1Locked: true,
      t1ReleasesLock: true,
      t2RetriesInsert: true,
    });
    assert.equal(released.t2InsertVisibleDuringT1, false);
    assert.equal(released.t2InsertVisibleAfterT1, true);
    assert.equal(released.reconcileSeesConsistentEvidence, true);
  });
});

describe('r6CommissionLedgerContract — fail-closed reversal gross', () => {
  it('flags refund and lost-dispute totals above original gross', () => {
    assert.equal(
      isReversalGrossExceedsOriginalV1({
        effectiveReversalGrossJpy: 2001,
        originalGrossCustomerPaidJpy: 2000,
      }),
      true,
    );
    assert.deepEqual(
      computeAggregateReconciliationDeltaV1({
        original: REFUND_CONVERGENCE_ORIGINAL,
        effectiveReversalGrossJpy: 2001,
        currentEntitlementJpy: 1000,
      }),
      { ok: false, reason: M55_R6_REVERSAL_EXCEEDS_GROSS_REASON },
    );
  });
});

describe('r6CommissionLedgerContract — SQL static contract', () => {
  it('defines one append-only ledger table with exact version constants', () => {
    assert.match(SQL, /create table public\.m55_r6_commission_ledger_events/i);
    assert.match(SQL, /financial_policy_version = 'r6_financial_policy_v1'/i);
    assert.match(SQL, /calculation_version = 'r6_commission_calculation_v1'/i);
    assert.match(SQL, /rate_schedule_version = 'r6_standard_rate_schedule_v1'/i);
    assert.match(SQL, /eligible_product_policy_version = 'r6_affiliate_eligible_products_v1'/i);
    assert.match(SQL, /immediately_ineligible_amount_jpy = 0/i);
    assert.match(SQL, /tax_rate_bps = 1000/i);
    assert.equal(SQL.includes('payout'), false);
    assert.equal(/create table public\.m55_r6_commission_wallet/i.test(SQL), false);
  });

  it('enforces append-only, RLS, and minimal service_role grants', () => {
    assert.match(SQL, /COMMISSION_LEDGER_APPEND_ONLY/);
    assert.match(SQL, /COMMISSION_LEDGER_NO_TRUNCATE/);
    assert.match(SQL, /enable row level security/i);
    assert.match(
      SQL,
      /revoke all on public\.m55_r6_commission_ledger_events from public, anon, authenticated, service_role/i,
    );
    assert.match(SQL, /grant select, insert on public\.m55_r6_commission_ledger_events to service_role/i);
    assert.equal(/grant all on public\.m55_r6_commission_ledger_events/i.test(SQL), false);
    assert.equal(/grant\s+update\s+on\s+public\.m55_r6_commission_ledger_events/i.test(SQL), false);
  });

  it('defines original and transition uniqueness without version keys', () => {
    assert.match(SQL, /event_family = 'COMMISSION_ACCRUED'/i);
    assert.match(SQL, /provider, payment_intent_id/i);
    assert.match(SQL, /source_economic_object_type/i);
    assert.match(SQL, /economic_transition/i);
    assert.match(SQL, /REFUND_SUCCEEDED/);
    assert.match(SQL, /DISPUTE_HOLD_STARTED/);
    assert.match(SQL, /DISPUTE_HOLD_RELEASED/);
    assert.match(SQL, /DISPUTE_WON/);
    assert.match(SQL, /DISPUTE_LOST/);
    assert.equal(SQL.includes('calculation_version') && SQL.includes('unique') && /calculation_version[\s\S]{0,80}unique/i.test(SQL), false);
  });

  it('defines RPCs with SECURITY INVOKER and service_role execute only', () => {
    for (const fn of [
      M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME,
      M55_R6_RECONCILE_COMMISSION_RPC_NAME,
      M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME,
    ]) {
      const body = extractRpcBody(SQL, fn);
      assert.match(body, /security invoker/i);
      assert.equal(/\bfor update\b/i.test(body), false);
      assert.match(
        SQL,
        new RegExp(`grant execute on function public\\.${fn}`, 'i'),
      );
    }
  });

  it('records overlap fail-closed hold reason in reconcile RPC', () => {
    const body = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    assert.match(body, /ECONOMIC_OVERLAP_RECONCILIATION_REQUIRED/);
    assert.match(body, /ECONOMIC_REVERSAL_EXCEEDS_ORIGINAL_GROSS/);
  });

  it('defines monotonic ledger_event_seq and uses it for latest lifecycle', () => {
    assert.match(SQL, /ledger_event_seq bigint generated always as identity not null unique/i);
    const latestBody = SQL.slice(
      SQL.search(/create function public\.m55_r6_latest_lifecycle_state_v1/i),
      SQL.search(/revoke all on function public\.m55_r6_latest_lifecycle_state_v1/i),
    );
    assert.match(latestBody, /order by ledger_event_seq desc/i);
    assert.equal(/order by recorded_at desc,\s*commission_event_id desc/i.test(latestBody), false);
  });

  it('grants helper EXECUTE to service_role only in entry RPC call graph', () => {
    const helpers = [
      'm55_r6_floor_div_bigint_v1',
      'm55_r6_derive_rate_bps_v1',
      'm55_r6_compute_remaining_tax_exclusion_v1',
      'm55_r6_compute_target_entitlement_v1',
      'm55_r6_sum_economic_entitlement_v1',
      'm55_r6_latest_lifecycle_state_v1',
      'm55_r6_has_purchase_objective_cancel_v1',
      'm55_r6_has_purchase_active_hold_v1',
      'm55_r6_has_purchase_positive_authority_v1',
      'm55_r6_purchase_compliance_authority_snapshot_v1',
      'm55_r6_classify_dispute_authority_v1',
      'm55_r6_classify_economic_event_family_v1',
      'm55_r6_insert_ledger_event_v1',
    ];
    for (const helper of helpers) {
      const block = extractHelperPrivilegeBlock(SQL, helper);
      assert.match(block, /grant execute on function/i);
      assert.match(block, /from public, anon, authenticated, service_role/i);
      assert.match(block, /to service_role/i);
      assert.equal(/to anon/i.test(block), false);
      assert.equal(/to authenticated/i.test(block), false);
      assert.equal(/to public/i.test(block), false);
    }
  });

  it('serializes original and reconcile with the same per-PI advisory lock namespace', () => {
    const originalBody = extractRpcBody(SQL, M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME);
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    assert.match(originalBody, /pg_advisory_xact_lock/);
    assert.match(reconcileBody, /pg_advisory_xact_lock/);
    assert.match(originalBody, /m55_r6_commission:/);
    assert.match(reconcileBody, /m55_r6_commission:/);
  });

  it('PATCH-3: reconcile derives terminal lifecycle before PAYABLE and on economic events', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    assert.match(reconcileBody, /v_has_objective_cancel then\s+v_target_entitlement := 0/i);
    assert.match(reconcileBody, /v_economic_terminal_reversed/);
    assert.match(reconcileBody, /v_event_lifecycle_after := 'COMMISSION_REVERSED'/);
    assert.match(reconcileBody, /if v_economic_terminal_reversed then/i);
    assert.equal(
      /not exists \([\s\S]*AUTO_CANCEL_OBJECTIVE[\s\S]*commission_delta_jpy < 0/i.test(
        reconcileBody,
      ),
      false,
    );
  });

  it('PATCH-3A: final lifecycle priority places economic terminal reversal before hold and pending', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    const finalLifecycleAnchor = reconcileBody.lastIndexOf(
      'v_economic_terminal_reversed := not v_has_objective_cancel',
    );
    assert.ok(finalLifecycleAnchor > 0);
    const finalLifecycleBlock = reconcileBody.slice(finalLifecycleAnchor);
    const objectiveIdx = finalLifecycleBlock.indexOf('if v_has_objective_cancel then');
    const terminalIdx = finalLifecycleBlock.indexOf('elsif v_economic_terminal_reversed then');
    const overlapIdx = finalLifecycleBlock.indexOf('elsif v_overlap then');
    const holdIdx = finalLifecycleBlock.indexOf(
      'elsif v_held or v_has_unknown_dispute_hold or v_has_active_dispute_hold or v_has_active_hold then',
    );
    const noPositiveIdx = finalLifecycleBlock.indexOf('elsif not v_has_positive_authority then');
    const preReleaseIdx = finalLifecycleBlock.indexOf(
      'elsif v_current_epoch_ms < v_origin.release_at_ms then',
    );
    assert.ok(objectiveIdx >= 0);
    assert.ok(terminalIdx > objectiveIdx);
    assert.ok(overlapIdx > terminalIdx);
    assert.ok(holdIdx > overlapIdx);
    assert.ok(noPositiveIdx > holdIdx);
    assert.ok(preReleaseIdx > noPositiveIdx);
    assert.match(
      reconcileBody,
      /v_current_lifecycle := public\.m55_r6_latest_lifecycle_state_v1\(v_origin\.commission_event_id\);[\s\S]*v_economic_terminal_reversed := not v_has_objective_cancel/,
    );
    assert.equal(
      /if v_overlap and not v_has_objective_cancel then[\s\S]*v_target_lifecycle := 'COMMISSION_HOLD'/i.test(
        reconcileBody,
      ),
      false,
    );
  });

  it('PATCH-3B: zero-money COMMISSION_REVERSED lifecycle carrier is absent', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    const invariantIdx = reconcileBody.indexOf("raise exception 'R6_TERMINAL_LIFECYCLE_INVARIANT_VIOLATION'");
    assert.ok(invariantIdx > 0);
    const afterInvariant = reconcileBody.slice(invariantIdx);
    assert.equal(/v_state_event_family = 'COMMISSION_REVERSED'/i.test(afterInvariant), false);
    assert.equal(
      /else 'COMMISSION_REVERSED'[\s\S]*'LIFECYCLE_TRANSITION'/i.test(afterInvariant),
      false,
    );
    assert.equal(
      /'COMMISSION_REVERSED',\s*'COMMISSION_REVERSED',\s*'COMMISSION_REVERSED'[\s\S]{0,1600},\s*0\s*,\s*0[\s\S]{0,240}'LIFECYCLE_TRANSITION'/i.test(
        reconcileBody,
      ),
      false,
    );
  });

  it('PATCH-3B: no zero-money state family masquerades as COMMISSION_REVERSED', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    assert.equal(
      /when v_has_objective_cancel then 'COMMISSION_HELD'[\s\S]*'COMMISSION_REVERSED'/i.test(
        reconcileBody,
      ),
      false,
    );
    assert.equal(
      /v_state_event_family[\s\S]{0,400}'COMMISSION_HELD'[\s\S]{0,800}'COMMISSION_REVERSED'[\s\S]{0,400},\s*0\s*,\s*0/i.test(
        reconcileBody,
      ),
      false,
    );
  });

  it('PATCH-3B: non-REVERSED current lifecycle fails closed when target is REVERSED', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    assert.match(reconcileBody, /R6_TERMINAL_LIFECYCLE_INVARIANT_VIOLATION/);
    const invariantIdx = reconcileBody.lastIndexOf(
      "raise exception 'R6_TERMINAL_LIFECYCLE_INVARIANT_VIOLATION'",
    );
    const stateInsertIdx = reconcileBody.lastIndexOf("v_state_event_family in ('COMMISSION_HELD'");
    assert.ok(invariantIdx > 0);
    assert.ok(stateInsertIdx > invariantIdx);
    assert.match(
      reconcileBody,
      /if v_target_lifecycle = 'COMMISSION_REVERSED'\s+and v_current_lifecycle is distinct from 'COMMISSION_REVERSED' then\s+raise exception 'R6_TERMINAL_LIFECYCLE_INVARIANT_VIOLATION'/i,
    );
  });

  it('PATCH-3C: zero original commission and full-tax commission are legal zero entitlements', () => {
    const fallback = computeOriginalCommissionMoneyV1({
      grossCustomerPaidJpy: 1,
      authoritativeTaxAmountPresent: false,
      authoritativePurchaseTaxAmountJpy: null,
      taxRateBps: M55_R6_FALLBACK_TAX_RATE_BPS,
      commissionRateBasisPoints: 5000,
      immediatelyIneligibleAmountJpy: M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY,
    });
    assert.equal(fallback.ok, true);
    if (fallback.ok) {
      assert.equal(fallback.commissionBaseTaxExclusionJpy, 0);
      assert.equal(fallback.commissionableRevenueJpy, 1);
      assert.equal(fallback.grossCommissionJpy, 0);
    }
    const fullTax = computeOriginalCommissionMoneyV1({
      grossCustomerPaidJpy: 2000,
      authoritativeTaxAmountPresent: true,
      authoritativePurchaseTaxAmountJpy: 2000,
      taxRateBps: M55_R6_FALLBACK_TAX_RATE_BPS,
      commissionRateBasisPoints: 5000,
      immediatelyIneligibleAmountJpy: M55_R6_IMMEDIATELY_INELIGIBLE_AMOUNT_JPY,
    });
    assert.equal(fullTax.ok, true);
    if (fullTax.ok) {
      assert.equal(fullTax.commissionableRevenueJpy, 0);
      assert.equal(fullTax.grossCommissionJpy, 0);
    }
  });

  it('PATCH-3C: zero-entitlement objective cancel writes one AUTO_CANCEL_OBJECTIVE marker before the invariant', () => {
    const reconcileBody = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    const objectiveBlock = reconcileBody.indexOf('if v_has_objective_cancel then');
    const aggregateIdx = reconcileBody.indexOf('v_aggregate_delta := v_target_entitlement - v_current_entitlement');
    const finalInvariant = reconcileBody.lastIndexOf(
      "if v_target_lifecycle = 'COMMISSION_REVERSED'",
    );
    assert.ok(objectiveBlock > 0);
    assert.ok(aggregateIdx > objectiveBlock);
    assert.ok(finalInvariant > objectiveBlock);
    const objectiveSlice = reconcileBody.slice(objectiveBlock, aggregateIdx);
    assert.match(objectiveSlice, /v_delta := -v_current_entitlement/);
    assert.match(objectiveSlice, /'AUTO_CANCEL_OBJECTIVE'/);
    assert.equal(/current_lifecycle is distinct from 'COMMISSION_REVERSED'/.test(objectiveSlice), false);
    assert.equal(/LIFECYCLE_TRANSITION/.test(objectiveSlice), false);
  });

  it('PATCH-3C: schema allows only the narrow zero-delta COMMISSION_REVERSED form', () => {
    const guard = SQL.slice(
      SQL.indexOf('constraint m55_r6_commission_ledger_reversed_delta_chk'),
      SQL.indexOf('create unique index m55_r6_commission_ledger_one_accrual_uq'),
    );
    assert.match(guard, /event_family <> 'COMMISSION_REVERSED'/);
    assert.match(guard, /entitlement_after_event_jpy = 0/);
    assert.match(guard, /commission_delta_jpy < 0/);
    assert.match(guard, /commission_delta_jpy = 0/);
    assert.match(guard, /reason_code = 'AUTO_CANCEL_OBJECTIVE'/);
    assert.match(guard, /source_economic_object_type is null/);
    assert.match(guard, /source_economic_object_id is null/);
    assert.match(guard, /economic_transition is null/);
    assert.match(guard, /canonical_event_state = 'COMMISSION_REVERSED'/);
    assert.match(guard, /lifecycle_state_after_event = 'COMMISSION_REVERSED'/);
    assert.equal(/LIFECYCLE_TRANSITION/.test(guard), false);
    assert.equal(/REFUND_SUCCEEDED/.test(guard), false);
  });

  it('excludes current lifecycle from immutable original replay comparison', () => {
    const originalBody = extractRpcBody(SQL, M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME);
    const convergedBlock = originalBody.slice(
      originalBody.indexOf('if found then'),
      originalBody.indexOf('raise exception \'COMMISSION_PAYLOAD_CONFLICT\''),
    );
    assert.equal(/lifecycle_state_after_event is not distinct from v_initial_lifecycle/i.test(convergedBlock), false);
    assert.match(originalBody, /v_initial_lifecycle :=/);
    assert.ok(originalBody.indexOf('v_initial_lifecycle :=') > originalBody.indexOf('if found then'));
  });
});

function rpcBodyUntilNextFunction(sql: string, fnName: string): string {
  const region = extractRpcBody(sql, fnName);
  const nextFunction = region.indexOf('\ncreate function ', 1);
  return nextFunction > 0 ? region.slice(0, nextFunction) : region;
}

describe('r6CommissionLedgerContract — PATCH-3E purchase key share before advisory', () => {
  it('original commission locks the purchase row before the PI advisory lock and before ledger insert', () => {
    const body = rpcBodyUntilNextFunction(SQL, M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME);
    const keyShareIdx = body.search(/for key share/i);
    const advisoryIdx = body.indexOf('pg_advisory_xact_lock');
    const insertIdx = body.indexOf('m55_r6_insert_ledger_event_v1');
    assert.ok(keyShareIdx > 0);
    assert.ok(advisoryIdx > keyShareIdx);
    assert.ok(insertIdx > advisoryIdx);
    assert.match(body, /m55_r5_attribution_canonical_payment_evidence/);
    assert.match(body, /m55_r5_attribution_purchase_attempts/);
    assert.equal(/for update/i.test(body), false);
    assert.equal(/for no key update/i.test(body), false);
  });

  it('reconcile locks the purchase row before the PI advisory lock and the compliance snapshot', () => {
    const body = rpcBodyUntilNextFunction(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    const resolveIdx = body.indexOf('m55_r5_attribution_canonical_payment_evidence');
    const keyShareIdx = body.search(/for key share/i);
    const advisoryIdx = body.indexOf('pg_advisory_xact_lock');
    const snapshotIdx = body.indexOf('m55_r6_purchase_compliance_authority_snapshot_v1');
    const aggregateIdx = body.indexOf('v_aggregate_delta :=');
    assert.ok(resolveIdx > 0);
    assert.ok(keyShareIdx > resolveIdx);
    assert.ok(advisoryIdx > keyShareIdx);
    assert.ok(snapshotIdx > advisoryIdx);
    assert.ok(aggregateIdx > snapshotIdx);
    const afterAdvisory = body.slice(advisoryIdx + 'pg_advisory_xact_lock'.length);
    assert.equal(/for key share/i.test(afterAdvisory), false);
    assert.equal(/for update/i.test(body), false);
    assert.equal(/for no key update/i.test(body), false);
    assert.equal(/for share/i.test(body), false);
    assert.equal(/m55_r5_compliance_decisions[\s\S]{0,200}for update/i.test(body), false);
    assert.equal(/m55_r5_compliance_cases[\s\S]{0,200}for update/i.test(body), false);
  });
});

describe('r6CommissionLedgerContract — PATCH-3D objective provenance and compliance serialization', () => {
  it('objective forfeiture precedes a zero-delta partial refund marker', () => {
    const events = modelObjectiveProvenanceBeforeEconomicSourceV1({
      currentEntitlementJpy: 5000,
      currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      objectiveAuthoritative: true,
      objectiveMarkerAlreadyRecorded: false,
      economicSource: {
        kind: 'REFUND',
        sourceId: 're_partial',
        reasonCode: 'REFUND_SUCCEEDED',
      },
    });
    assert.deepEqual(events, [
      {
        eventFamily: 'COMMISSION_REVERSED',
        reasonCode: 'AUTO_CANCEL_OBJECTIVE',
        deltaJpy: -5000,
        sourceKind: 'NONE',
        sourceId: null,
        entitlementAfterJpy: 0,
        lifecycleAfter: 'COMMISSION_REVERSED',
      },
      {
        eventFamily: 'COMMISSION_ADJUSTED',
        reasonCode: 'REFUND_SUCCEEDED',
        deltaJpy: 0,
        sourceKind: 'REFUND',
        sourceId: 're_partial',
        entitlementAfterJpy: 0,
        lifecycleAfter: 'COMMISSION_REVERSED',
      },
    ]);
    assert.equal(events.some((event) => event.sourceKind === 'REFUND' && event.deltaJpy === -5000), false);
  });

  it('objective forfeiture precedes a zero-delta lost-dispute marker', () => {
    const events = modelObjectiveProvenanceBeforeEconomicSourceV1({
      currentEntitlementJpy: 5000,
      currentLifecycleState: 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      objectiveAuthoritative: true,
      objectiveMarkerAlreadyRecorded: false,
      economicSource: {
        kind: 'DISPUTE',
        sourceId: 'dp_lost',
        reasonCode: 'DISPUTE_LOST',
      },
    });
    assert.equal(events[0]?.deltaJpy, -5000);
    assert.equal(events[0]?.reasonCode, 'AUTO_CANCEL_OBJECTIVE');
    assert.equal(events[1]?.deltaJpy, 0);
    assert.equal(events[1]?.sourceId, 'dp_lost');
    assert.equal(events[1]?.reasonCode, 'DISPUTE_LOST');
  });

  it('records one zero-delta objective marker after an already reversed economic terminal', () => {
    const first = modelObjectiveProvenanceBeforeEconomicSourceV1({
      currentEntitlementJpy: 0,
      currentLifecycleState: 'COMMISSION_REVERSED',
      objectiveAuthoritative: true,
      objectiveMarkerAlreadyRecorded: false,
      economicSource: { kind: 'NONE' },
    });
    assert.equal(first.length, 1);
    assert.equal(first[0]?.deltaJpy, 0);
    assert.equal(first[0]?.reasonCode, 'AUTO_CANCEL_OBJECTIVE');
    const replay = modelObjectiveProvenanceBeforeEconomicSourceV1({
      currentEntitlementJpy: 0,
      currentLifecycleState: 'COMMISSION_REVERSED',
      objectiveAuthoritative: true,
      objectiveMarkerAlreadyRecorded: true,
      economicSource: { kind: 'NONE' },
    });
    assert.deepEqual(replay, []);
  });

  it('serializes purchase compliance mutations on the R6 commission lock', () => {
    const triggerBody = SQL.slice(
      SQL.indexOf('create function public.m55_r6_lock_purchase_compliance_mutation_v1'),
      SQL.indexOf('create function public.m55_r6_classify_dispute_authority_v1'),
    );
    assert.match(triggerBody, /before insert or update or delete on public\.m55_r5_compliance_decisions/i);
    assert.match(triggerBody, /before insert or update or delete on public\.m55_r5_compliance_cases/i);
    assert.match(triggerBody, /m55_r5_attribution_canonical_payment_evidence/);
    assert.match(triggerBody, /pg_advisory_xact_lock/);
    assert.match(triggerBody, /m55_r6_commission:/);
    assert.match(triggerBody, /purchase_attempt_id is not null/);
    assert.equal(/pg_advisory_lock\s*\(/i.test(triggerBody), false);
    assert.equal(/m55_r6_compliance_lock/i.test(triggerBody), false);
    assert.match(
      SQL,
      /revoke all on function public\.m55_r6_lock_purchase_compliance_mutation_v1\(\)\s+from public, anon, authenticated, service_role/i,
    );
    assert.equal(/grant execute on function public\.m55_r6_lock_purchase_compliance_mutation_v1/i.test(SQL), false);
  });

  it('captures compliance authority once inside reconcile', () => {
    const reconcileRegion = extractRpcBody(SQL, M55_R6_RECONCILE_COMMISSION_RPC_NAME);
    const nextFunction = reconcileRegion.indexOf('\ncreate function ', 1);
    const reconcileBody = nextFunction > 0 ? reconcileRegion.slice(0, nextFunction) : reconcileRegion;
    const snapshotCalls = reconcileBody.match(/m55_r6_purchase_compliance_authority_snapshot_v1/g) ?? [];
    assert.equal(snapshotCalls.length, 1);
    assert.equal(/m55_r6_has_purchase_objective_cancel_v1/.test(reconcileBody), false);
    assert.equal(/m55_r6_has_purchase_active_hold_v1/.test(reconcileBody), false);
    assert.equal(/m55_r6_has_purchase_positive_authority_v1/.test(reconcileBody), false);
    const snapshotIdx = reconcileBody.indexOf('m55_r6_purchase_compliance_authority_snapshot_v1');
    const aggregateIdx = reconcileBody.indexOf('v_aggregate_delta :=');
    assert.ok(snapshotIdx > 0);
    assert.ok(aggregateIdx > snapshotIdx);
  });
});

describe('r6CommissionLedgerContract — PATCH-2 compliance privilege bridge', () => {
  const complianceReaders = [
    'm55_r6_has_purchase_objective_cancel_v1',
    'm55_r6_has_purchase_active_hold_v1',
    'm55_r6_has_purchase_positive_authority_v1',
    'm55_r6_purchase_compliance_authority_snapshot_v1',
  ];

  it('keeps R5 compliance tables revoked from service_role direct SELECT', () => {
    assert.match(
      R5_COMPLIANCE_SQL,
      /revoke all on public\.m55_r5_compliance_decisions from public, anon, authenticated, service_role/i,
    );
    assert.match(
      R5_COMPLIANCE_SQL,
      /revoke all on public\.m55_r5_compliance_cases from public, anon, authenticated, service_role/i,
    );
    assert.equal(/grant select on public\.m55_r5_compliance_decisions/i.test(SQL), false);
    assert.equal(/grant select on public\.m55_r5_compliance_cases/i.test(SQL), false);
    assert.equal(/grant all on public\.m55_r5_compliance_decisions/i.test(SQL), false);
    assert.equal(/grant all on public\.m55_r5_compliance_cases/i.test(SQL), false);
  });

  for (const helper of complianceReaders) {
    it(`${helper} is SECURITY DEFINER with empty search_path and schema-qualified reads`, () => {
      const body = extractHelperFunctionBody(SQL, helper);
      assert.match(body, /security definer/i);
      assert.match(body, /set search_path = ''/i);
      assert.match(body, /public\.m55_r5_compliance_/i);
      assert.equal(/\bexecute\b/i.test(body) && /\$\{/i.test(body), false);
      const block = extractHelperPrivilegeBlock(SQL, helper);
      assert.match(block, /grant execute on function/i);
      assert.match(block, /to service_role/i);
      assert.equal(/to anon/i.test(block), false);
      assert.equal(/to authenticated/i.test(block), false);
      assert.equal(/to public/i.test(block), false);
    });
  }

  it('retains entry RPCs as SECURITY INVOKER without broader SECURITY DEFINER expansion', () => {
    for (const fn of [
      M55_R6_RECORD_ORIGINAL_COMMISSION_RPC_NAME,
      M55_R6_RECONCILE_COMMISSION_RPC_NAME,
      M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME,
    ]) {
      const body = extractRpcBody(SQL, fn);
      assert.match(body, /security invoker/i);
      assert.equal(/security definer/i.test(body), false);
    }
    const financialHelpers = [
      'm55_r6_floor_div_bigint_v1',
      'm55_r6_sum_economic_entitlement_v1',
      'm55_r6_insert_ledger_event_v1',
    ];
    for (const helper of financialHelpers) {
      const body = extractHelperFunctionBody(SQL, helper);
      const headerEnd = body.search(/as \$fn\$/i);
      const header = headerEnd > 0 ? body.slice(0, headerEnd) : body;
      assert.equal(/security definer/i.test(header), false);
    }
  });
});

type DueScanSimOutcomeV1 = 'RECORDED' | 'NO_CHANGE' | 'HELD' | 'CONVERGED' | 'NO_COMMISSION_ORIGIN';

function simulateDueScanProgressV1(args: {
  candidates: ReadonlyArray<{ lifecycle: string; outcome: DueScanSimOutcomeV1 }>;
  pLimit: number;
}): { scannedCount: number; recordedCount: number; lastRecordedIndex: number | null } {
  let recordedCount = 0;
  let scannedCount = 0;
  let lastRecordedIndex: number | null = null;
  for (let i = 0; i < args.candidates.length; i += 1) {
    scannedCount += 1;
    if (args.candidates[i].outcome === 'RECORDED') {
      recordedCount += 1;
      lastRecordedIndex = i;
      if (recordedCount >= args.pLimit) break;
    }
  }
  return { scannedCount, recordedCount, lastRecordedIndex };
}

describe('r6CommissionLedgerContract — PATCH-2 due-scan progress guarantee', () => {
  it('scans all due candidates without SQL LIMIT v_limit and counts RECORDED only', () => {
    const body = extractRpcBody(SQL, M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME);
    const candidateSelect = body.slice(
      body.indexOf('for v_origin in'),
      body.indexOf('loop', body.indexOf('for v_origin in')),
    );
    assert.equal(/\blimit\s+v_limit\b/i.test(candidateSelect), false);
    assert.match(body, /v_recorded_origin_count integer := 0/i);
    assert.match(body, /v_recorded_origin_count := v_recorded_origin_count \+ 1/i);
    assert.match(body, /if v_recorded_origin_count >= v_limit then/i);
    assert.match(candidateSelect, /order by a\.release_at_ms asc, a\.ledger_event_seq asc/i);
    assert.equal(/commission_event_id asc/i.test(candidateSelect), false);
    assert.match(candidateSelect, /<> 'COMMISSION_REVERSED'/i);
    assert.equal(/<> 'COMMISSION_PAYABLE'/i.test(candidateSelect), false);
    assert.equal(/<> 'COMMISSION_HOLD'/i.test(candidateSelect), false);
  });

  it('does not consume mutation budget for NO_CHANGE or HELD outcomes', () => {
    const body = extractRpcBody(SQL, M55_R6_RECONCILE_DUE_COMMISSIONS_RPC_NAME);
    const recordedBlock = body.slice(
      body.indexOf("if v_outcome = 'RECORDED'"),
      body.indexOf("elsif v_outcome in ('CONVERGED', 'HELD', 'NO_COMMISSION_ORIGIN')"),
    );
    assert.match(recordedBlock, /v_recorded_origin_count := v_recorded_origin_count \+ 1/i);
    const stableBlock = body.slice(
      body.indexOf("elsif v_outcome in ('CONVERGED', 'HELD', 'NO_COMMISSION_ORIGIN')"),
      body.indexOf("elsif v_outcome = 'NO_CHANGE'"),
    );
    assert.equal(/v_recorded_origin_count/i.test(stableBlock), false);
    const noChangeBlock = body.slice(body.indexOf("elsif v_outcome = 'NO_CHANGE'"), body.indexOf('end loop'));
    assert.equal(/v_recorded_origin_count/i.test(noChangeBlock), false);
  });

  it('reaches actionable origin after stable PAYABLE/HOLD rows with p_limit=1', () => {
    const result = simulateDueScanProgressV1({
      pLimit: 1,
      candidates: [
        { lifecycle: 'COMMISSION_PAYABLE', outcome: 'NO_CHANGE' },
        { lifecycle: 'COMMISSION_HOLD', outcome: 'HELD' },
        { lifecycle: 'COMMISSION_PAYABLE', outcome: 'NO_CHANGE' },
        { lifecycle: 'COMMISSION_PENDING_COMPLIANCE_REVIEW', outcome: 'RECORDED' },
        { lifecycle: 'COMMISSION_PENDING_COMPLIANCE_REVIEW', outcome: 'RECORDED' },
      ],
    });
    assert.equal(result.lastRecordedIndex, 3);
    assert.equal(result.recordedCount, 1);
    assert.equal(result.scannedCount, 4);
  });

  it('reaches actionable origin after 100 stable rows with p_limit=1', () => {
    const stable = Array.from({ length: 100 }, (_, i) => ({
      lifecycle: i % 2 === 0 ? 'COMMISSION_PAYABLE' : 'COMMISSION_HOLD',
      outcome: (i % 2 === 0 ? 'NO_CHANGE' : 'HELD') as DueScanSimOutcomeV1,
    }));
    const result = simulateDueScanProgressV1({
      pLimit: 1,
      candidates: [...stable, { lifecycle: 'COMMISSION_PENDING_COMPLIANCE_REVIEW', outcome: 'RECORDED' }],
    });
    assert.equal(result.lastRecordedIndex, 100);
    assert.equal(result.recordedCount, 1);
    assert.equal(result.scannedCount, 101);
  });

  it('records two actionable origins separated by stable rows with p_limit=2', () => {
    const result = simulateDueScanProgressV1({
      pLimit: 2,
      candidates: [
        { lifecycle: 'COMMISSION_PAYABLE', outcome: 'RECORDED' },
        { lifecycle: 'COMMISSION_HOLD', outcome: 'HELD' },
        { lifecycle: 'COMMISSION_PAYABLE', outcome: 'NO_CHANGE' },
        { lifecycle: 'COMMISSION_PENDING_COMPLIANCE_REVIEW', outcome: 'RECORDED' },
      ],
    });
    assert.equal(result.lastRecordedIndex, 3);
    assert.equal(result.recordedCount, 2);
    assert.equal(result.scannedCount, 4);
  });
});

describe('r6CommissionLedgerContract — route static contract', () => {
  it('runs R6 original then reconcile before stripe_events on payment success', () => {
    assert.match(WEBHOOK, /runR6CommissionLedgerPipelineForPaymentIntentV1/);
    const moneyIdx = WEBHOOK.indexOf('callRecordPurchaseMoneyEvidenceRpcV1');
    const r6Idx = WEBHOOK.indexOf('runR6CommissionLedgerPipelineForPaymentIntentV1');
    const stripeIdx = WEBHOOK.indexOf('insertPaymentIntentSucceededStripeEventV1');
    assert.ok(moneyIdx > 0 && r6Idx > moneyIdx && stripeIdx > r6Idx);
  });

  it('runs A2 evidence before R6 ledger before stripe_events', () => {
    const a2Start = WEBHOOK.indexOf('async function handleR6EconomicEvidenceEventV1');
    const a2End = WEBHOOK.indexOf('async function handleChargeRefunded');
    const a2Block = WEBHOOK.slice(a2Start, a2End);
    const refundIdx = a2Block.indexOf('callRecordRefundEconomicEvidenceRpcV1');
    const disputeIdx = a2Block.indexOf('callRecordDisputeEconomicEvidenceRpcV1');
    const r6Idx = a2Block.indexOf('runR6CommissionLedgerPipelineForPaymentIntentV1');
    const stripeIdx = a2Block.indexOf("event_type: eventType");
    assert.ok(refundIdx > 0 || disputeIdx > 0);
    assert.ok(r6Idx > Math.max(refundIdx, disputeIdx));
    assert.ok(stripeIdx > r6Idx);
  });

  it('does not add Stripe refund/dispute retrieve calls', () => {
    assert.equal(WEBHOOK.includes('refunds.retrieve'), false);
    assert.equal(WEBHOOK.includes('disputes.retrieve'), false);
  });

  it('preserves completed P0-A1 replay provider lookup count at zero', () => {
    const replayBlock = WEBHOOK.slice(
      WEBHOOK.indexOf('if (snapshot?.money)'),
      WEBHOOK.indexOf('let stripe: ReturnType<typeof getStripe>'),
    );
    assert.equal(replayBlock.includes('getStripe'), false);
    assert.equal(replayBlock.includes('verifyPaymentIntentCheckoutSessionProofV1'), false);
    assert.equal(replayBlock.includes('runR6CommissionLedgerPipelineForPaymentIntentV1'), true);
  });

  it('contains zero external Downloads references', () => {
    const downloadsPath = ['/', 'Users', 'lexsia', 'Downloads', '/'].join('');
    const tildeDownloads = ['~', '/Downloads'].join('');
    assert.equal(TEST_SOURCE.includes(downloadsPath), false);
    assert.equal(TEST_SOURCE.includes(tildeDownloads), false);
    for (const call of TEST_SOURCE.match(/readFileSync\([^;]+\)/g) ?? []) {
      assert.equal(call.includes('Downloads'), false);
      assert.equal(call.includes('/Users/lexsia'), false);
    }
  });

  it('preserves frozen handleChargeRefunded body without external fixtures', () => {
    const body = extractHandleChargeRefundedBody(WEBHOOK);
    const sha = createHash('sha256').update(body).digest('hex');
    assert.equal(sha, FROZEN_HANDLE_CHARGE_REFUNDED_BODY_SHA256);
  });
});
