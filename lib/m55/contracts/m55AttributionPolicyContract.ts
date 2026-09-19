/**
 * M55 attribution policy — R5-A machine semantics (window, attempt, lock, payment, invalidity, lanes, appeal).
 * Human freeze: M55-R5-R5A-POLICY-HUMAN-FREEZE-REV2.
 * Narrative owners: Operating Model §14 / §16A / §18 / §24 / §32; Compliance §AG / §AH.
 * Do not treat this contract as current runtime truth. R5-B/R5-C remain unimplemented.
 */

import {
  compareQualifiedTouchesForLock,
  parseUnixEpochMilliseconds,
  parseUnixEpochSeconds,
  selectLatestQualifiedTouch,
  type TrackingLane,
  type TouchEventOrderInput,
  type UnixEpochMsParseResult,
} from './m55CreatorTrackingContract';

export const M55_ABSOLUTE_TIME_UNITS_V1 = {
  m55HelperUnit: 'UNIX_EPOCH_MILLISECONDS',
  stripeEventCreatedNativeUnit: 'UNIX_EPOCH_SECONDS',
  qualifiedTouchAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  attributionLockedAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  canonicalPaymentSucceededAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  lockExpiresAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  rawStripeSecondsMustNotBePassedToMsHelpers: true,
  fulfilledAtMustNotBeCanonicalized: true,
} as const;

export const M55_ATTRIBUTION_POLICY_CONTRACT_VERSION = 'v1' as const;

export const M55_ATTRIBUTION_POLICY_ENFORCEMENT_STATUS =
  'R5A_SEMANTICS_FROZEN_RUNTIME_NOT_IMPLEMENTED' as const;

export const M55_ATTRIBUTION_WINDOW_DAYS = 30 as const;

export const M55_ATTRIBUTION_METHOD = 'LAST_QUALIFIED_DIRECT_CREATOR_TOUCH' as const;

export const M55_MAX_CREATORS_PER_PURCHASE = 1 as const;

export const M55_RETROACTIVE_ATTRIBUTION = 'PROHIBITED' as const;

export const M55_CREATOR_CASH_PRODUCT_ALLOWLIST_V1 = [
  'M55_PREMIUM_REPORT_LIGHT',
  'M55_PREMIUM_REPORT_FULL',
] as const;

export type CreatorCashEligibleProductV1 =
  (typeof M55_CREATOR_CASH_PRODUCT_ALLOWLIST_V1)[number];

export const M55_CREATOR_CASH_PRODUCT_EXPANSION_V1_FORBIDDEN = [
  'PAIR_PREMIUM',
  'REPLY_TICKET',
  'ADDITIONAL_INTERPRETATION',
] as const;

export const M55_PURCHASE_ATTEMPT_CONTRACT = {
  semanticIdentity: 'M55_ISSUED_IMMUTABLE_PURCHASE_ATTEMPT_ID',
  rawPurchaseContextIdIsNotAttemptAuthority: true,
  decisionsPerAttempt: 1,
  noneIsALockableDecision: true,
  sameAttemptRetryPreservesSameDecision: true,
  networkRetryOrUnknownStripeCreateOutcomeMustNotMintNewAttempt: true,
  confirmedExpiryOrCancelOrPurchaseScopeChangeRequiresNewAttempt: true,
  staleLockMustNotInheritToSuccessorAttempt: true,
} as const;

export const M55_PROVIDER_BINDING_CONTRACT = {
  maxAcceptedPayableCheckoutSessionsPerAttemptV1: 1,
  providerCreationRetryConvergesToSameAcceptedBinding: true,
  renewalAfterConfirmedExpiryOrCancelIsNewAttempt: true,
  sessionAndPaymentIntentToAttemptBindingHistoryImmutable: true,
  latestPendingRefMustNotOverwriteHistoricalBinding: true,
  newAttemptLockMustNeverServiceOldSessionOrPayment: true,
  attributionDecisionMustExistBeforeAcceptedPayableSessionExposedToBuyer: true,
  acceptedSessionAndPiBindingMustPointToPreexistingAttemptDecision: true,
  canonicalPaymentMayConsumeOnlyPreexistingBoundDecision: true,
  unknownProviderSessionCreateResult:
    'RECONCILE_RETRY_DO_NOT_EXPOSE_UNBOUND_PAYABLE_SESSION_AS_SUCCESS',
  schemaRuntimeMechanism: 'OUT_OF_SCOPE_R5A',
} as const;

export const M55_PAYMENT_SUCCESS_AUTHORITY = {
  canonical: 'STRIPE_PAYMENT_INTENT_SUCCEEDED_EVENT_CREATED',
  eventType: 'payment_intent.succeeded',
  timestampField: 'Event.created',
  firstAcceptedCanonicalEvidenceImmutable: true,
  replayMustNotReplaceFirstAcceptedCanonicalEvidence: true,
  attributionWindowEvaluatedAtLockNotAtWebhook: true,
  postPaymentTouchOrLockRescue: 'PROHIBITED',
} as const;

export const M55_CANONICAL_PAYMENT_EVIDENCE_REQUIRED_FIELDS = [
  'stripeCanonicalEventId',
  'paymentIntentId',
  'canonicalEventCreatedAt',
] as const;

export const M55_CANONICAL_BINDING_VALIDATION = [
  'provider_account_mode_object',
  'payment_intent_checkout_session',
  'checkout_session_purchase_attempt',
  'purchase_attempt_buyer_product',
] as const;

export const M55_FORBIDDEN_PAYMENT_SUCCESS_AUTHORITIES = [
  'fulfilled_at',
  'webhook_received_at',
  'M55_processing_started_at',
  'PaymentIntent.created',
  'processing_page_synthetic_event',
] as const;

export const M55_PAYMENT_LOCK_EVALUATION = {
  delayedProcessingUsesPreExistingLockWhenCanonicalSuccessBeforeExpiry: true,
  webhookMustNotRecalculateWinner: true,
  canonicalSuccessEqualToLockExpiry: 'UPPER_BOUND_EXCLUDED',
  conflictingCanonicalEvidence: 'HOLD_RECONCILE',
  arrivalOrderMustNotResolveCanonicalConflict: true,
} as const;

export type LockEvidenceState =
  | 'VALID_PREEXISTING'
  | 'CONFIRMED_NONE'
  | 'UNKNOWN_OR_CONFLICTING';

export type PaymentEvidenceState =
  | 'CANONICAL_SUCCESS'
  | 'CONFIRMED_ABSENT'
  | 'UNKNOWN_OR_CONFLICTING';

export const M55_GENERAL_VS_CREATOR_LANE = {
  creatorMethod: 'EVIDENCE_SOURCE_NEUTRAL_LAST_QUALIFIED_DIRECT_CREATOR_TOUCH',
  cookieVsSignedLinkFixedSourcePrecedence: 'PROHIBITED',
  generalInvitePath: '/r/[token]',
  generalCannotCreateCreatorCandidate: true,
  generalCannotOverwriteOrDeleteCreatorTouchOrLock: true,
  generalCannotCreateCreatorCashCommission: true,
  purposeNamespaceSeparationRequired: true,
} as const;

export const M55_CREATOR_PROFILE_STATUS_VOCABULARY = [
  'APPROVED_PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
] as const;

export const M55_STATUS_EARNING_CONTRACT = {
  newLockRequiresCreatorActive: true,
  winnerIdentityNeverRewrittenByLaterStatus: true,
  suspendedAtCanonicalPaymentSuccess: 'HOLD_RECONCILE',
  revokedOrEffectiveDeactivationBeforeCanonicalPaymentSuccess:
    'NEW_EARNING_OFF_OBJECTIVE_DENIAL',
  postPaymentStatusChangeDoesNotAutomaticallyRetroactivelyDeny: true,
  processingTimeCurrentStatusIsNotHistoricalAuthority: true,
  effectiveTimeStatusEvidenceRequired: true,
  persistedDeactivatedEnum: 'NOT_INTRODUCED',
  effectiveDeactivationIsPolicyStateNotNewPersistedEnum: true,
} as const;

export const M55_INVALIDITY_CONTRACT = {
  originalLockedWinnerAndEvidenceImmutable: true,
  invalidWinnerMustNotSelectRunnerUp: true,
  confirmedObjectiveInvalidity: 'EFFECTIVE_CASH_ATTRIBUTION_NONE_OR_OBJECTIVE_DENIAL',
  uncertaintyIsNotObjectiveInvalidity: true,
  mustNotNullOrDeleteWinnerHistoryToRepresentNone: true,
  attributionIdentityDistinctFromEarningOutcome: true,
  postLockStatusChangeMustNotRewriteWinnerIdentity: true,
  section32FutureNewEarningGateIsSeparateLayer: true,
  postPaymentLegitimateEarningMustNotAutoDenyFromLaterStatusChangeAlone: true,
  documentedObjectiveSystemErrorCorrection: 'LIMITED_EXCEPTION_ONLY',
} as const;

export const M55_APPEAL_CONTRACT = {
  discrepancyAndAppealPath: 'REQUIRED',
  adverseDecisionEvidenceAndReason: 'REQUIRED',
  appealStatusContract: 'REQUIRED',
  numericSubmissionDeadlineAndHumanSla: 'DEFERRED_TO_BETA_TERMS_FREEZE',
  slaDeferDoesNotDeferAppealIntake: true,
} as const;

export const M55_ADVERSE_DECISION_REQUIRED_FIELDS = [
  'reason_code',
  'rule_version',
  'evidence_reference',
  'decision_timestamp',
  'reviewer_type',
  'appeal_status',
] as const;

export type AttributionDecisionKind = 'CREATOR_WINNER' | 'NONE';

export type EffectiveCashAttributionOutcome =
  | 'CREATOR_CASH'
  | 'NONE'
  | 'HOLD_RECONCILE'
  | 'OBJECTIVE_DENIAL';

export type PurchaseAttemptSuccessorReason =
  | 'SAME_ATTEMPT_RETRY'
  | 'NETWORK_RETRY'
  | 'UNKNOWN_STRIPE_CREATE_OUTCOME'
  | 'CONFIRMED_EXPIRY'
  | 'CONFIRMED_CANCEL'
  | 'PURCHASE_SCOPE_CHANGE';

export type ProviderBindingWriteKind =
  | 'PROVIDER_CREATE_RETRY'
  | 'LATEST_PENDING_OVERWRITE'
  | 'NEW_ATTEMPT_SERVICING_OLD_SESSION';

export type CreatorStatusEffectiveAtPayment =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EFFECTIVE_DEACTIVATION';

export type AttributionWindowInput = {
  /** v1: Unix epoch milliseconds (integer). */
  qualifiedTouchAtMs: number;
  /** v1: Unix epoch milliseconds (integer). */
  attributionLockedAtMs: number;
};

export type CanonicalPaymentEvidence = {
  stripeCanonicalEventId: string | null;
  paymentIntentId: string | null;
  /** v1: Unix epoch milliseconds after Stripe Event.created second→ms normalization. */
  canonicalEventCreatedAt: number | null;
};

export type StripeEventCreatedNormalizationResult =
  | { ok: true; canonicalPaymentSucceededAtMs: number }
  | { ok: false; reason: 'INVALID_TIMESTAMP' | 'FORBIDDEN_SOURCE' };

export type PaymentSuccessTimestampSource =
  | 'STRIPE_EVENT_CREATED_SECONDS'
  | 'UNIX_EPOCH_MILLISECONDS'
  | 'FULFILLED_AT'
  | 'RAW_STRIPE_SECONDS_AS_MS';

export function isInsideHalfOpenAttributionWindow(input: AttributionWindowInput): boolean {
  const touch = parseUnixEpochMilliseconds(input.qualifiedTouchAtMs);
  const locked = parseUnixEpochMilliseconds(input.attributionLockedAtMs);
  if (!touch.ok || !locked.ok) return false;
  const windowMs = M55_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (
    input.qualifiedTouchAtMs <= input.attributionLockedAtMs &&
    input.attributionLockedAtMs < input.qualifiedTouchAtMs + windowMs
  );
}

export function selectLockWinner(
  candidates: readonly TouchEventOrderInput[],
): TouchEventOrderInput | null {
  return selectLatestQualifiedTouch(candidates);
}

export function canLaneCreateCreatorCashAttribution(lane: TrackingLane): boolean {
  return lane === 'CREATOR';
}

export function canLaneOverwriteCreatorLock(_lane: TrackingLane): boolean {
  return false;
}

export function canLateClickOverwriteLockedAttribution(): boolean {
  return false;
}

export function requiresNewPurchaseAttempt(
  reason: PurchaseAttemptSuccessorReason,
): boolean {
  return (
    reason === 'CONFIRMED_EXPIRY' ||
    reason === 'CONFIRMED_CANCEL' ||
    reason === 'PURCHASE_SCOPE_CHANGE'
  );
}

export function evaluateProviderBindingWrite(
  kind: ProviderBindingWriteKind,
): 'CONVERGE_SAME_BINDING' | 'REJECT' {
  if (kind === 'PROVIDER_CREATE_RETRY') return 'CONVERGE_SAME_BINDING';
  return 'REJECT';
}

export function evaluateUnknownProviderSessionCreate(): 'RECONCILE_RETRY' {
  return 'RECONCILE_RETRY';
}

export function mayExposeUnboundPayableSessionAsSuccess(): boolean {
  return false;
}

export function mayCanonicalPaymentConsumeMissingPreexistingBoundDecision(): boolean {
  return false;
}

export function isCanonicalPaymentSuccessAuthority(source: string): boolean {
  return source === M55_PAYMENT_SUCCESS_AUTHORITY.canonical;
}

export function isForbiddenPaymentSuccessAuthority(source: string): boolean {
  return (M55_FORBIDDEN_PAYMENT_SUCCESS_AUTHORITIES as readonly string[]).includes(
    source,
  );
}

export function canonicalPaymentEvidenceIsComplete(
  evidence: CanonicalPaymentEvidence,
): boolean {
  return (
    Boolean(evidence.stripeCanonicalEventId) &&
    Boolean(evidence.paymentIntentId) &&
    evidence.canonicalEventCreatedAt != null &&
    parseUnixEpochMilliseconds(evidence.canonicalEventCreatedAt).ok
  );
}

export function normalizeStripeEventCreatedToCanonicalMs(
  stripeEventCreatedSeconds: number,
): StripeEventCreatedNormalizationResult {
  const seconds = parseUnixEpochSeconds(stripeEventCreatedSeconds);
  if (!seconds.ok) return { ok: false, reason: 'INVALID_TIMESTAMP' };
  const canonicalPaymentSucceededAtMs = seconds.unixEpochMs * 1000;
  if (!Number.isSafeInteger(canonicalPaymentSucceededAtMs) || canonicalPaymentSucceededAtMs < 0) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }
  return { ok: true, canonicalPaymentSucceededAtMs };
}

export function validateCanonicalPaymentSucceededAtMs(
  value: number,
): UnixEpochMsParseResult {
  return parseUnixEpochMilliseconds(value);
}

export function canonicalizePaymentSuccessTimestamp(args: {
  source: PaymentSuccessTimestampSource;
  value: number;
}): StripeEventCreatedNormalizationResult {
  if (args.source !== 'STRIPE_EVENT_CREATED_SECONDS') {
    return { ok: false, reason: 'FORBIDDEN_SOURCE' };
  }
  return normalizeStripeEventCreatedToCanonicalMs(args.value);
}

export function evaluateConflictingCanonicalEvidence(): 'HOLD_RECONCILE' {
  return 'HOLD_RECONCILE';
}

export function isCanonicalSuccessInsideLockValidity(args: {
  canonicalPaymentSucceededAtMs: number;
  lockExpiresAtMs: number;
}): boolean {
  const success = parseUnixEpochMilliseconds(args.canonicalPaymentSucceededAtMs);
  const expiry = parseUnixEpochMilliseconds(args.lockExpiresAtMs);
  if (!success.ok || !expiry.ok) return false;
  return args.canonicalPaymentSucceededAtMs < args.lockExpiresAtMs;
}

export function evaluateLockAndPaymentOutcome(args: {
  lockEvidenceState: LockEvidenceState;
  paymentEvidenceState: PaymentEvidenceState;
  canonicalPaymentSucceededAtMs: number | null;
  lockExpiresAtMs: number | null;
}): EffectiveCashAttributionOutcome {
  if (args.lockEvidenceState === 'CONFIRMED_NONE') return 'NONE';
  if (
    args.lockEvidenceState === 'UNKNOWN_OR_CONFLICTING' ||
    args.paymentEvidenceState === 'UNKNOWN_OR_CONFLICTING'
  ) {
    return 'HOLD_RECONCILE';
  }
  if (args.paymentEvidenceState === 'CONFIRMED_ABSENT') return 'NONE';
  if (args.paymentEvidenceState === 'CANONICAL_SUCCESS') {
    if (
      args.canonicalPaymentSucceededAtMs == null ||
      args.lockExpiresAtMs == null ||
      !parseUnixEpochMilliseconds(args.canonicalPaymentSucceededAtMs).ok ||
      !parseUnixEpochMilliseconds(args.lockExpiresAtMs).ok
    ) {
      return 'HOLD_RECONCILE';
    }
    if (
      !isCanonicalSuccessInsideLockValidity({
        canonicalPaymentSucceededAtMs: args.canonicalPaymentSucceededAtMs,
        lockExpiresAtMs: args.lockExpiresAtMs,
      })
    ) {
      return 'NONE';
    }
    return 'CREATOR_CASH';
  }
  return 'HOLD_RECONCILE';
}

export function delayedProcessingPreservesPreExpiryLock(args: {
  canonicalSuccessInsideLockValidity: boolean;
  processedAfterExpiry: boolean;
}): boolean {
  return args.canonicalSuccessInsideLockValidity && args.processedAfterExpiry;
}

export function webhookMayRecalculateWinner(): boolean {
  return false;
}

export function mayCreateNewAttributionLock(creatorStatus: string): boolean {
  return creatorStatus === 'ACTIVE';
}

export function evaluatePaymentTimeEarningGate(args: {
  creatorStatusEffectiveAtCanonicalSuccess: CreatorStatusEffectiveAtPayment;
}): {
  winnerIdentityRewritten: false;
  earning: 'ELIGIBLE' | 'HOLD_RECONCILE' | 'NEW_EARNING_OFF_OBJECTIVE_DENIAL';
} {
  if (args.creatorStatusEffectiveAtCanonicalSuccess === 'SUSPENDED') {
    return { winnerIdentityRewritten: false, earning: 'HOLD_RECONCILE' };
  }
  if (
    args.creatorStatusEffectiveAtCanonicalSuccess === 'REVOKED' ||
    args.creatorStatusEffectiveAtCanonicalSuccess === 'EFFECTIVE_DEACTIVATION'
  ) {
    return {
      winnerIdentityRewritten: false,
      earning: 'NEW_EARNING_OFF_OBJECTIVE_DENIAL',
    };
  }
  return { winnerIdentityRewritten: false, earning: 'ELIGIBLE' };
}

export function postPaymentStatusChangeAutomaticallyRetroactivelyDenies(): boolean {
  return false;
}

export function evaluateWinnerInvalidity(args: {
  originalDecision: AttributionDecisionKind;
  invalidity: 'OBJECTIVE' | 'UNCERTAIN';
}): {
  historyPreserved: true;
  runnerUpSelected: false;
  winnerIdentityRewritten: false;
  effective: EffectiveCashAttributionOutcome;
} {
  return {
    historyPreserved: true,
    runnerUpSelected: false,
    winnerIdentityRewritten: false,
    effective:
      args.invalidity === 'OBJECTIVE'
        ? args.originalDecision === 'NONE'
          ? 'NONE'
          : 'OBJECTIVE_DENIAL'
        : 'HOLD_RECONCILE',
  };
}

export function isCreatorCashProductAllowedV1(product: string): boolean {
  return (M55_CREATOR_CASH_PRODUCT_ALLOWLIST_V1 as readonly string[]).includes(product);
}

export { compareQualifiedTouchesForLock, selectLatestQualifiedTouch };
