import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_ABSOLUTE_TIME_UNITS_V1,
  M55_ADVERSE_DECISION_REQUIRED_FIELDS,
  M55_APPEAL_CONTRACT,
  M55_ATTRIBUTION_METHOD,
  M55_ATTRIBUTION_POLICY_CONTRACT_VERSION,
  M55_ATTRIBUTION_POLICY_ENFORCEMENT_STATUS,
  M55_ATTRIBUTION_WINDOW_DAYS,
  M55_CANONICAL_BINDING_VALIDATION,
  M55_CANONICAL_PAYMENT_EVIDENCE_REQUIRED_FIELDS,
  M55_CREATOR_CASH_PRODUCT_ALLOWLIST_V1,
  M55_CREATOR_CASH_PRODUCT_EXPANSION_V1_FORBIDDEN,
  M55_CREATOR_PROFILE_STATUS_VOCABULARY,
  M55_FORBIDDEN_PAYMENT_SUCCESS_AUTHORITIES,
  M55_GENERAL_VS_CREATOR_LANE,
  M55_INVALIDITY_CONTRACT,
  M55_MAX_CREATORS_PER_PURCHASE,
  M55_PAYMENT_LOCK_EVALUATION,
  M55_PAYMENT_SUCCESS_AUTHORITY,
  M55_PROVIDER_BINDING_CONTRACT,
  M55_PURCHASE_ATTEMPT_CONTRACT,
  M55_RETROACTIVE_ATTRIBUTION,
  M55_STATUS_EARNING_CONTRACT,
  canLaneCreateCreatorCashAttribution,
  canLaneOverwriteCreatorLock,
  canLateClickOverwriteLockedAttribution,
  canonicalizePaymentSuccessTimestamp,
  canonicalPaymentEvidenceIsComplete,
  delayedProcessingPreservesPreExpiryLock,
  evaluateConflictingCanonicalEvidence,
  evaluateLockAndPaymentOutcome,
  evaluatePaymentTimeEarningGate,
  evaluateProviderBindingWrite,
  evaluateUnknownProviderSessionCreate,
  evaluateWinnerInvalidity,
  isCanonicalPaymentSuccessAuthority,
  isCanonicalSuccessInsideLockValidity,
  isCreatorCashProductAllowedV1,
  isForbiddenPaymentSuccessAuthority,
  isInsideHalfOpenAttributionWindow,
  mayCanonicalPaymentConsumeMissingPreexistingBoundDecision,
  mayCreateNewAttributionLock,
  mayExposeUnboundPayableSessionAsSuccess,
  normalizeStripeEventCreatedToCanonicalMs,
  postPaymentStatusChangeAutomaticallyRetroactivelyDenies,
  validateCanonicalPaymentSucceededAtMs,
  requiresNewPurchaseAttempt,
  selectLockWinner,
  webhookMayRecalculateWinner,
} from './m55AttributionPolicyContract';

const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_OLDER = '00000000000000000000000000000001';
const KEY_NEWER = '00000000000000000000000000000002';

describe('m55AttributionPolicyContract — R5-A attribution/attempt/payment semantics', () => {
  it('locks contract version, 30-day last-touch core, and deferred runtime', () => {
    assert.equal(M55_ATTRIBUTION_POLICY_CONTRACT_VERSION, 'v1');
    assert.equal(
      M55_ATTRIBUTION_POLICY_ENFORCEMENT_STATUS,
      'R5A_SEMANTICS_FROZEN_RUNTIME_NOT_IMPLEMENTED',
    );
    assert.equal(M55_ATTRIBUTION_WINDOW_DAYS, 30);
    assert.equal(M55_ATTRIBUTION_METHOD, 'LAST_QUALIFIED_DIRECT_CREATOR_TOUCH');
    assert.equal(M55_MAX_CREATORS_PER_PURCHASE, 1);
    assert.equal(M55_RETROACTIVE_ATTRIBUTION, 'PROHIBITED');
  });

  it('preserves the 30-day half-open window inclusive of lock at touch time and exclusive of +30d', () => {
    const touch = 1_000_000;
    assert.equal(
      isInsideHalfOpenAttributionWindow({
        qualifiedTouchAtMs: touch,
        attributionLockedAtMs: touch,
      }),
      true,
    );
    assert.equal(
      isInsideHalfOpenAttributionWindow({
        qualifiedTouchAtMs: touch,
        attributionLockedAtMs: touch + 30 * DAY_MS - 1,
      }),
      true,
    );
    assert.equal(
      isInsideHalfOpenAttributionWindow({
        qualifiedTouchAtMs: touch,
        attributionLockedAtMs: touch + 30 * DAY_MS,
      }),
      false,
    );
    assert.equal(
      isInsideHalfOpenAttributionWindow({
        qualifiedTouchAtMs: touch,
        attributionLockedAtMs: touch - 1,
      }),
      false,
    );
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.qualifiedTouchAtMsUnit, 'UNIX_EPOCH_MILLISECONDS');
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.attributionLockedAtMsUnit, 'UNIX_EPOCH_MILLISECONDS');
    assert.equal(M55_PAYMENT_SUCCESS_AUTHORITY.attributionWindowEvaluatedAtLockNotAtWebhook, true);
  });

  it('selects the latest qualified touch at lock using PATCH-1A fixed-length keys', () => {
    const older = { qualifiedTouchAtMs: 10, touchEventKeyHex: KEY_OLDER };
    const newer = { qualifiedTouchAtMs: 20, touchEventKeyHex: KEY_NEWER };
    assert.equal(selectLockWinner([older, newer]), newer);
  });

  it('prevents the General lane from creating Creator cash attribution', () => {
    assert.equal(canLaneCreateCreatorCashAttribution('GENERAL'), false);
    assert.equal(canLaneCreateCreatorCashAttribution('CREATOR'), true);
    assert.equal(M55_GENERAL_VS_CREATOR_LANE.generalCannotCreateCreatorCashCommission, true);
    assert.equal(M55_GENERAL_VS_CREATOR_LANE.generalCannotCreateCreatorCandidate, true);
  });

  it('prevents the General lane from overwriting a Creator lock', () => {
    assert.equal(canLaneOverwriteCreatorLock('GENERAL'), false);
    assert.equal(canLateClickOverwriteLockedAttribution(), false);
    assert.equal(M55_GENERAL_VS_CREATOR_LANE.generalCannotOverwriteOrDeleteCreatorTouchOrLock, true);
    assert.equal(
      M55_GENERAL_VS_CREATOR_LANE.cookieVsSignedLinkFixedSourcePrecedence,
      'PROHIBITED',
    );
  });

  it('requires M55-issued purchase_attempt_id and does not freeze raw purchaseContextId as attempt authority', () => {
    assert.equal(
      M55_PURCHASE_ATTEMPT_CONTRACT.semanticIdentity,
      'M55_ISSUED_IMMUTABLE_PURCHASE_ATTEMPT_ID',
    );
    assert.equal(M55_PURCHASE_ATTEMPT_CONTRACT.rawPurchaseContextIdIsNotAttemptAuthority, true);
    assert.equal(M55_PURCHASE_ATTEMPT_CONTRACT.decisionsPerAttempt, 1);
  });

  it('preserves the same decision on same-attempt retry and does not mint a new attempt for network/unknown Stripe create', () => {
    assert.equal(M55_PURCHASE_ATTEMPT_CONTRACT.sameAttemptRetryPreservesSameDecision, true);
    assert.equal(requiresNewPurchaseAttempt('SAME_ATTEMPT_RETRY'), false);
    assert.equal(requiresNewPurchaseAttempt('NETWORK_RETRY'), false);
    assert.equal(requiresNewPurchaseAttempt('UNKNOWN_STRIPE_CREATE_OUTCOME'), false);
  });

  it('requires a new attempt after confirmed expiry, cancel, or purchase-scope change', () => {
    assert.equal(requiresNewPurchaseAttempt('CONFIRMED_EXPIRY'), true);
    assert.equal(requiresNewPurchaseAttempt('CONFIRMED_CANCEL'), true);
    assert.equal(requiresNewPurchaseAttempt('PURCHASE_SCOPE_CHANGE'), true);
    assert.equal(M55_PURCHASE_ATTEMPT_CONTRACT.staleLockMustNotInheritToSuccessorAttempt, true);
    assert.equal(M55_PROVIDER_BINDING_CONTRACT.renewalAfterConfirmedExpiryOrCancelIsNewAttempt, true);
  });

  it('allows NONE as an immutable attribution decision', () => {
    assert.equal(M55_PURCHASE_ATTEMPT_CONTRACT.noneIsALockableDecision, true);
  });

  it('binds at most one accepted payable Checkout Session per attempt and keeps historical bindings immutable', () => {
    assert.equal(M55_PROVIDER_BINDING_CONTRACT.maxAcceptedPayableCheckoutSessionsPerAttemptV1, 1);
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.providerCreationRetryConvergesToSameAcceptedBinding,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.sessionAndPaymentIntentToAttemptBindingHistoryImmutable,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.latestPendingRefMustNotOverwriteHistoricalBinding,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.newAttemptLockMustNeverServiceOldSessionOrPayment,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.attributionDecisionMustExistBeforeAcceptedPayableSessionExposedToBuyer,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.acceptedSessionAndPiBindingMustPointToPreexistingAttemptDecision,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.canonicalPaymentMayConsumeOnlyPreexistingBoundDecision,
      true,
    );
    assert.equal(
      M55_PROVIDER_BINDING_CONTRACT.unknownProviderSessionCreateResult,
      'RECONCILE_RETRY_DO_NOT_EXPOSE_UNBOUND_PAYABLE_SESSION_AS_SUCCESS',
    );
    assert.equal(evaluateProviderBindingWrite('PROVIDER_CREATE_RETRY'), 'CONVERGE_SAME_BINDING');
    assert.equal(evaluateProviderBindingWrite('LATEST_PENDING_OVERWRITE'), 'REJECT');
    assert.equal(evaluateProviderBindingWrite('NEW_ATTEMPT_SERVICING_OLD_SESSION'), 'REJECT');
    assert.equal(evaluateUnknownProviderSessionCreate(), 'RECONCILE_RETRY');
    assert.equal(mayExposeUnboundPayableSessionAsSuccess(), false);
    assert.equal(mayCanonicalPaymentConsumeMissingPreexistingBoundDecision(), false);
  });

  it('never selects a runner-up after winner invalidity and retains original history', () => {
    const result = evaluateWinnerInvalidity({
      originalDecision: 'CREATOR_WINNER',
      invalidity: 'OBJECTIVE',
    });
    assert.equal(result.runnerUpSelected, false);
    assert.equal(result.historyPreserved, true);
    assert.equal(result.winnerIdentityRewritten, false);
    assert.equal(result.effective, 'OBJECTIVE_DENIAL');
    assert.equal(M55_INVALIDITY_CONTRACT.mustNotNullOrDeleteWinnerHistoryToRepresentNone, true);
    assert.equal(M55_INVALIDITY_CONTRACT.section32FutureNewEarningGateIsSeparateLayer, true);
  });

  it('treats HOLD as distinct from objective NONE', () => {
    const hold = evaluateWinnerInvalidity({
      originalDecision: 'CREATOR_WINNER',
      invalidity: 'UNCERTAIN',
    });
    assert.equal(hold.effective, 'HOLD_RECONCILE');
    assert.notEqual(hold.effective, 'NONE');
    assert.notEqual(hold.effective, 'OBJECTIVE_DENIAL');
    assert.equal(M55_INVALIDITY_CONTRACT.uncertaintyIsNotObjectiveInvalidity, true);
  });

  it('requires canonical event ID, PaymentIntent ID, and Event.created as immutable first-accepted evidence', () => {
    assert.equal(
      M55_PAYMENT_SUCCESS_AUTHORITY.canonical,
      'STRIPE_PAYMENT_INTENT_SUCCEEDED_EVENT_CREATED',
    );
    assert.equal(M55_PAYMENT_SUCCESS_AUTHORITY.eventType, 'payment_intent.succeeded');
    assert.equal(M55_PAYMENT_SUCCESS_AUTHORITY.timestampField, 'Event.created');
    assert.equal(M55_PAYMENT_SUCCESS_AUTHORITY.firstAcceptedCanonicalEvidenceImmutable, true);
    assert.equal(
      M55_PAYMENT_SUCCESS_AUTHORITY.replayMustNotReplaceFirstAcceptedCanonicalEvidence,
      true,
    );
    assert.deepEqual([...M55_CANONICAL_PAYMENT_EVIDENCE_REQUIRED_FIELDS], [
      'stripeCanonicalEventId',
      'paymentIntentId',
      'canonicalEventCreatedAt',
    ]);
    assert.deepEqual([...M55_CANONICAL_BINDING_VALIDATION], [
      'provider_account_mode_object',
      'payment_intent_checkout_session',
      'checkout_session_purchase_attempt',
      'purchase_attempt_buyer_product',
    ]);
    assert.equal(
      canonicalPaymentEvidenceIsComplete({
        stripeCanonicalEventId: 'evt_1',
        paymentIntentId: 'pi_1',
        canonicalEventCreatedAt: 100,
      }),
      true,
    );
    assert.equal(
      canonicalPaymentEvidenceIsComplete({
        stripeCanonicalEventId: null,
        paymentIntentId: 'pi_1',
        canonicalEventCreatedAt: 100,
      }),
      false,
    );
    assert.equal(
      isCanonicalPaymentSuccessAuthority('STRIPE_PAYMENT_INTENT_SUCCEEDED_EVENT_CREATED'),
      true,
    );
  });

  it('forbids fulfilled_at, processing time, webhook receive time, and PI creation time', () => {
    for (const source of [
      'fulfilled_at',
      'webhook_received_at',
      'M55_processing_started_at',
      'PaymentIntent.created',
    ]) {
      assert.equal(isForbiddenPaymentSuccessAuthority(source), true);
    }
    assert.ok(M55_FORBIDDEN_PAYMENT_SUCCESS_AUTHORITIES.includes('processing_page_synthetic_event'));
  });

  it('normalizes Stripe Event.created seconds to canonical Unix epoch milliseconds and rejects mixed units', () => {
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.stripeEventCreatedNativeUnit, 'UNIX_EPOCH_SECONDS');
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.canonicalPaymentSucceededAtMsUnit, 'UNIX_EPOCH_MILLISECONDS');
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.rawStripeSecondsMustNotBePassedToMsHelpers, true);
    assert.equal(M55_ABSOLUTE_TIME_UNITS_V1.fulfilledAtMustNotBeCanonicalized, true);
    assert.deepEqual(normalizeStripeEventCreatedToCanonicalMs(100), {
      ok: true,
      canonicalPaymentSucceededAtMs: 100_000,
    });
    assert.notEqual(100, 100_000);
    assert.deepEqual(
      canonicalizePaymentSuccessTimestamp({
        source: 'STRIPE_EVENT_CREATED_SECONDS',
        value: 100,
      }),
      { ok: true, canonicalPaymentSucceededAtMs: 100_000 },
    );
    assert.deepEqual(
      canonicalizePaymentSuccessTimestamp({
        source: 'UNIX_EPOCH_MILLISECONDS',
        value: 100_000,
      }),
      { ok: false, reason: 'FORBIDDEN_SOURCE' },
    );
    assert.equal(validateCanonicalPaymentSucceededAtMs(100_000).ok, true);
    assert.deepEqual(
      canonicalizePaymentSuccessTimestamp({
        source: 'RAW_STRIPE_SECONDS_AS_MS',
        value: 100,
      }),
      { ok: false, reason: 'FORBIDDEN_SOURCE' },
    );
    assert.deepEqual(
      canonicalizePaymentSuccessTimestamp({ source: 'FULFILLED_AT', value: 100_000 }),
      { ok: false, reason: 'FORBIDDEN_SOURCE' },
    );
    assert.deepEqual(normalizeStripeEventCreatedToCanonicalMs(100.5), {
      ok: false,
      reason: 'INVALID_TIMESTAMP',
    });
    const contemporarySeconds = 1_758_240_000;
    assert.deepEqual(normalizeStripeEventCreatedToCanonicalMs(contemporarySeconds), {
      ok: true,
      canonicalPaymentSucceededAtMs: contemporarySeconds * 1000,
    });
    assert.deepEqual(normalizeStripeEventCreatedToCanonicalMs(Number.MAX_SAFE_INTEGER + 1), {
      ok: false,
      reason: 'INVALID_TIMESTAMP',
    });
    const secondsOverflowingMs = Math.floor(Number.MAX_SAFE_INTEGER / 1000) + 1;
    assert.deepEqual(normalizeStripeEventCreatedToCanonicalMs(secondsOverflowingMs), {
      ok: false,
      reason: 'INVALID_TIMESTAMP',
    });
    const canonical = normalizeStripeEventCreatedToCanonicalMs(100);
    assert.ok(canonical.ok);
    assert.equal(
      isCanonicalSuccessInsideLockValidity({
        canonicalPaymentSucceededAtMs: canonical.canonicalPaymentSucceededAtMs,
        lockExpiresAtMs: 150_000,
      }),
      true,
    );
    assert.equal(
      isCanonicalSuccessInsideLockValidity({
        canonicalPaymentSucceededAtMs: 100_000,
        lockExpiresAtMs: 100_000,
      }),
      false,
    );
    assert.equal(
      isCanonicalSuccessInsideLockValidity({
        canonicalPaymentSucceededAtMs: 100.5,
        lockExpiresAtMs: 200_000,
      }),
      false,
    );
  });

  it('forbids webhook winner recalculation and preserves delayed processing of pre-expiry canonical success', () => {
    assert.equal(webhookMayRecalculateWinner(), false);
    assert.equal(M55_PAYMENT_LOCK_EVALUATION.webhookMustNotRecalculateWinner, true);
    assert.equal(M55_PAYMENT_SUCCESS_AUTHORITY.postPaymentTouchOrLockRescue, 'PROHIBITED');
    assert.equal(
      delayedProcessingPreservesPreExpiryLock({
        canonicalSuccessInsideLockValidity: true,
        processedAfterExpiry: true,
      }),
      true,
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'VALID_PREEXISTING',
        paymentEvidenceState: 'CANONICAL_SUCCESS',
        canonicalPaymentSucceededAtMs: 50,
        lockExpiresAtMs: 200,
      }),
      'CREATOR_CASH',
    );
  });

  it('maps explicit lock-evidence states without treating unknown evidence as confirmed NONE', () => {
    assert.equal(M55_PAYMENT_LOCK_EVALUATION.arrivalOrderMustNotResolveCanonicalConflict, true);
    assert.equal(evaluateConflictingCanonicalEvidence(), 'HOLD_RECONCILE');
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'UNKNOWN_OR_CONFLICTING',
        paymentEvidenceState: 'CANONICAL_SUCCESS',
        canonicalPaymentSucceededAtMs: 50,
        lockExpiresAtMs: 200,
      }),
      'HOLD_RECONCILE',
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'VALID_PREEXISTING',
        paymentEvidenceState: 'UNKNOWN_OR_CONFLICTING',
        canonicalPaymentSucceededAtMs: null,
        lockExpiresAtMs: 200,
      }),
      'HOLD_RECONCILE',
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'CONFIRMED_NONE',
        paymentEvidenceState: 'CANONICAL_SUCCESS',
        canonicalPaymentSucceededAtMs: 50,
        lockExpiresAtMs: 200,
      }),
      'NONE',
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'CONFIRMED_NONE',
        paymentEvidenceState: 'CONFIRMED_ABSENT',
        canonicalPaymentSucceededAtMs: null,
        lockExpiresAtMs: 200,
      }),
      'NONE',
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'CONFIRMED_NONE',
        paymentEvidenceState: 'UNKNOWN_OR_CONFLICTING',
        canonicalPaymentSucceededAtMs: null,
        lockExpiresAtMs: 200,
      }),
      'NONE',
    );
    assert.equal(
      isCanonicalSuccessInsideLockValidity({
        canonicalPaymentSucceededAtMs: 100,
        lockExpiresAtMs: 100,
      }),
      false,
    );
    assert.equal(
      evaluateLockAndPaymentOutcome({
        lockEvidenceState: 'VALID_PREEXISTING',
        paymentEvidenceState: 'CANONICAL_SUCCESS',
        canonicalPaymentSucceededAtMs: 200,
        lockExpiresAtMs: 200,
      }),
      'NONE',
    );
  });

  it('requires ACTIVE for a new lock and separates payment-time earning from winner history', () => {
    assert.equal(M55_STATUS_EARNING_CONTRACT.newLockRequiresCreatorActive, true);
    assert.equal(M55_STATUS_EARNING_CONTRACT.persistedDeactivatedEnum, 'NOT_INTRODUCED');
    assert.ok(M55_CREATOR_PROFILE_STATUS_VOCABULARY.includes('ACTIVE'));
    assert.ok(M55_CREATOR_PROFILE_STATUS_VOCABULARY.includes('SUSPENDED'));
    assert.ok(M55_CREATOR_PROFILE_STATUS_VOCABULARY.includes('REVOKED'));
    assert.equal(mayCreateNewAttributionLock('ACTIVE'), true);
    assert.equal(mayCreateNewAttributionLock('SUSPENDED'), false);
    assert.equal(mayCreateNewAttributionLock('REVOKED'), false);
    assert.deepEqual(
      evaluatePaymentTimeEarningGate({ creatorStatusEffectiveAtCanonicalSuccess: 'SUSPENDED' }),
      { winnerIdentityRewritten: false, earning: 'HOLD_RECONCILE' },
    );
    assert.deepEqual(
      evaluatePaymentTimeEarningGate({ creatorStatusEffectiveAtCanonicalSuccess: 'REVOKED' }),
      { winnerIdentityRewritten: false, earning: 'NEW_EARNING_OFF_OBJECTIVE_DENIAL' },
    );
    assert.deepEqual(
      evaluatePaymentTimeEarningGate({
        creatorStatusEffectiveAtCanonicalSuccess: 'EFFECTIVE_DEACTIVATION',
      }),
      { winnerIdentityRewritten: false, earning: 'NEW_EARNING_OFF_OBJECTIVE_DENIAL' },
    );
    assert.equal(postPaymentStatusChangeAutomaticallyRetroactivelyDenies(), false);
    assert.equal(
      M55_STATUS_EARNING_CONTRACT.processingTimeCurrentStatusIsNotHistoricalAuthority,
      true,
    );
    assert.equal(M55_STATUS_EARNING_CONTRACT.effectiveTimeStatusEvidenceRequired, true);
  });

  it('requires an appeal path while deferring only the numeric SLA', () => {
    assert.equal(M55_APPEAL_CONTRACT.discrepancyAndAppealPath, 'REQUIRED');
    assert.equal(M55_APPEAL_CONTRACT.adverseDecisionEvidenceAndReason, 'REQUIRED');
    assert.equal(M55_APPEAL_CONTRACT.appealStatusContract, 'REQUIRED');
    assert.equal(
      M55_APPEAL_CONTRACT.numericSubmissionDeadlineAndHumanSla,
      'DEFERRED_TO_BETA_TERMS_FREEZE',
    );
    assert.equal(M55_APPEAL_CONTRACT.slaDeferDoesNotDeferAppealIntake, true);
    assert.ok(M55_ADVERSE_DECISION_REQUIRED_FIELDS.includes('appeal_status'));
  });

  it('does not expand the Creator cash product allowlist beyond Light/Full', () => {
    assert.deepEqual([...M55_CREATOR_CASH_PRODUCT_ALLOWLIST_V1], [
      'M55_PREMIUM_REPORT_LIGHT',
      'M55_PREMIUM_REPORT_FULL',
    ]);
    assert.equal(isCreatorCashProductAllowedV1('M55_PREMIUM_REPORT_LIGHT'), true);
    assert.equal(isCreatorCashProductAllowedV1('PAIR_PREMIUM'), false);
    assert.equal(isCreatorCashProductAllowedV1('REPLY_TICKET'), false);
    assert.equal(isCreatorCashProductAllowedV1('ADDITIONAL_INTERPRETATION'), false);
    assert.deepEqual([...M55_CREATOR_CASH_PRODUCT_EXPANSION_V1_FORBIDDEN], [
      'PAIR_PREMIUM',
      'REPLY_TICKET',
      'ADDITIONAL_INTERPRETATION',
    ]);
  });
});
