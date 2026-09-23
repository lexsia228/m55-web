import { createHash } from 'node:crypto';

export const M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME =
  '20260921000000_m55_r5_attribution_purchase_lock_v1.sql' as const;

export const M55_R5_PURCHASE_ATTEMPT_ID_ISSUER =
  'TRUSTED_M55_LOCK_RPC_GEN_RANDOM_UUID' as const;

export const M55_R5_PURCHASE_ATTEMPT_SCOPE_PURPOSE_V1 =
  'm55.r5.attribution.purchase_attempt.scope.v1' as const;

export const M55_R5_STRIPE_PURCHASE_ATTEMPT_METADATA_KEY = 'm55_pa' as const;

export const M55_R5_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX_V1 = 'm55_r5_pa_co_v1_' as const;

export const M55_R5_ATTRIBUTION_WINDOW_MS = 2_592_000_000 as const;

export const M55_R5_REQUIRED_CREATOR_TERMS_VERSION = '2026-09-13-v1' as const;

export const M55_R5_LOCK_PURCHASE_ATTEMPT_RPC_NAME =
  'm55_r5_attribution_lock_purchase_attempt_v1' as const;
export const M55_R5_BIND_CHECKOUT_SESSION_RPC_NAME =
  'm55_r5_attribution_bind_checkout_session_v1' as const;
export const M55_R5_TERMINALIZE_PURCHASE_ATTEMPT_RPC_NAME =
  'm55_r5_attribution_terminalize_purchase_attempt_v1' as const;
export const M55_R5_RECORD_CANONICAL_PAYMENT_RPC_NAME =
  'm55_r5_attribution_record_canonical_payment_v1' as const;
export const M55_R5_RECORD_CANONICAL_PAYMENT_HOLD_RPC_NAME =
  'm55_r5_attribution_record_canonical_payment_hold_v1' as const;

export const M55_R5_PURCHASE_ATTEMPT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const M55_R5_CREATOR_CASH_RUNTIME_PRODUCTS = [
  'dtr_core_light_v1',
  'DTR_CORE_STATIC_V1',
  'dtr_core_full_v1',
  'dtr_core_light_to_full_upgrade_v1',
] as const;

export type R5bRuntimeProductIdV1 = (typeof M55_R5_CREATOR_CASH_RUNTIME_PRODUCTS)[number];

export type R5bPolicyProductIdV1 = 'M55_PREMIUM_REPORT_LIGHT' | 'M55_PREMIUM_REPORT_FULL';

export type R5bConversionKindV1 =
  | 'FIRST_ELIGIBLE_PAID'
  | 'LIGHT_TO_FULL_UPGRADE'
  | 'REPURCHASE';

export type R5bLockOutcomeV1 =
  | 'LOCKED_WINNER'
  | 'LOCKED_NONE'
  | 'CONVERGED'
  | 'HOLD_PENDING_ADMISSION';

export type R5bBindOutcomeV1 = 'BOUND' | 'CONVERGED';

export type R5bTerminalizeOutcomeV1 = 'TERMINALIZED' | 'CONVERGED';

export type R5bRecordCanonicalOutcomeV1 =
  | 'RECORDED'
  | 'CONVERGED'
  | 'HOLD_RECONCILE'
  | 'NO_R5_BINDING'
  | 'CONFLICTING_EVIDENCE';

export type R5bHoldOutcomeV1 = 'HOLD_RECONCILE' | 'CONVERGED' | 'CONFLICTING_EVIDENCE';

export type R5bPreliminaryEligibilityV1 =
  | 'CREATOR_CASH'
  | 'NONE'
  | 'HOLD_RECONCILE'
  | 'OBJECTIVE_DENIAL';

export const M55_R5_PROVIDER_PROOF_LIST_LIMIT = 2 as const;

export const M55_R5_HOLD_REASON_CODES = [
  'PI_LOOKUP_ZERO',
  'PI_LOOKUP_MULTIPLE',
  'SESSION_NOT_PAYMENT',
  'SESSION_BINDING_MISMATCH',
  'PI_BINDING_MISMATCH',
  'METADATA_ATTEMPT_MISMATCH',
  'NO_R5_BINDING',
  'MISSING_BINDING',
  'PRE_EPOCH_STATUS',
  'SAME_MS_STATUS_COLLISION',
  'UNPROVEN_STATUS',
  'CONFLICTING_CANONICAL_EVIDENCE',
  'PROVIDER_READ_OK_GRAPH_MISMATCH',
  'HOLD_PAYLOAD_CONFLICT',
] as const;

export type R5bHoldReasonCodeV1 = (typeof M55_R5_HOLD_REASON_CODES)[number];

export const M55_R5_PROVIDER_CORRELATION_STATES = [
  'PROVIDER_VERIFIED',
  'PROVIDER_ZERO',
  'PROVIDER_MULTIPLE',
  'PROVIDER_NOT_ATTEMPTED',
  'BINDING_MISSING',
  'GRAPH_MISMATCH',
] as const;

export type R5bProviderCorrelationStateV1 =
  (typeof M55_R5_PROVIDER_CORRELATION_STATES)[number];

export function isM55PurchaseAttemptIdV1(value: unknown): boolean {
  return typeof value === 'string' && M55_R5_PURCHASE_ATTEMPT_UUID_RE.test(value);
}

export function buildPurchaseAttemptStripeIdempotencyKeyV1(purchaseAttemptId: string): string {
  if (!isM55PurchaseAttemptIdV1(purchaseAttemptId)) {
    throw new Error('INVALID_PURCHASE_ATTEMPT_ID');
  }
  return `${M55_R5_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX_V1}${purchaseAttemptId}`;
}

export function buildPurchaseAttemptReuseScopeDigestV1(args: {
  clerkSubjectLookupDigest: string;
  runtimeProductId: string;
  purchaseScopeId: string;
}): string {
  return createHash('sha256')
    .update(M55_R5_PURCHASE_ATTEMPT_SCOPE_PURPOSE_V1, 'utf8')
    .update('\0', 'utf8')
    .update(args.clerkSubjectLookupDigest, 'utf8')
    .update('\0', 'utf8')
    .update(args.runtimeProductId, 'utf8')
    .update('\0', 'utf8')
    .update(args.purchaseScopeId, 'utf8')
    .digest('hex');
}

export function resolveR5bCreatorCashProductMapV1(args: {
  runtimeProductId: string;
  repurchaseLane: boolean;
}):
  | {
      ok: true;
      runtimeProductId: R5bRuntimeProductIdV1;
      policyProductId: R5bPolicyProductIdV1;
      conversionKind: R5bConversionKindV1;
    }
  | { ok: false } {
  const runtime = args.runtimeProductId;
  if (runtime === 'dtr_core_light_v1' || runtime === 'DTR_CORE_STATIC_V1') {
    return {
      ok: true,
      runtimeProductId: runtime,
      policyProductId: 'M55_PREMIUM_REPORT_LIGHT',
      conversionKind: args.repurchaseLane ? 'REPURCHASE' : 'FIRST_ELIGIBLE_PAID',
    };
  }
  if (runtime === 'dtr_core_full_v1') {
    return {
      ok: true,
      runtimeProductId: runtime,
      policyProductId: 'M55_PREMIUM_REPORT_FULL',
      conversionKind: args.repurchaseLane ? 'REPURCHASE' : 'FIRST_ELIGIBLE_PAID',
    };
  }
  if (runtime === 'dtr_core_light_to_full_upgrade_v1') {
    return {
      ok: true,
      runtimeProductId: runtime,
      policyProductId: 'M55_PREMIUM_REPORT_FULL',
      conversionKind: 'LIGHT_TO_FULL_UPGRADE',
    };
  }
  return { ok: false };
}

export function parseMetadataPurchaseAttemptIdV1(value: unknown): string | null {
  if (!isM55PurchaseAttemptIdV1(value)) return null;
  return (value as string).toLowerCase();
}

export function stripeEventCreatedToMsV1(createdSeconds: number): number {
  if (!Number.isInteger(createdSeconds) || createdSeconds < 0) {
    throw new Error('INVALID_STRIPE_EVENT_CREATED');
  }
  return createdSeconds * 1000;
}

export function stripeCheckoutExpiresAtToMsV1(expiresAtSeconds: number): number {
  if (!Number.isInteger(expiresAtSeconds) || expiresAtSeconds < 0) {
    throw new Error('INVALID_STRIPE_EXPIRES_AT');
  }
  return expiresAtSeconds * 1000;
}

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

const LOCK_SEMANTIC = new Set([
  'INVALID_INPUT',
  'BUYER_SUBJECT_DELETED',
  'BUYER_SUBJECT_AMBIGUOUS',
  'HOLD_PENDING_ADMISSION',
]);

const BIND_SEMANTIC = new Set([
  'INVALID_INPUT',
  'INVALID_EXPIRY',
  'ATTEMPT_NOT_FOUND',
  'ATTEMPT_NOT_OPEN',
  'SESSION_ALREADY_BOUND',
  'SESSION_BOUND_TO_OTHER_ATTEMPT',
]);

const TERMINALIZE_SEMANTIC = new Set([
  'INVALID_INPUT',
  'ATTEMPT_NOT_FOUND',
  'ATTEMPT_NOT_OPEN',
  'PAID_CANONICAL',
  'TERMINAL_STATE_MISMATCH',
]);

const RECORD_SEMANTIC = new Set([
  'INVALID_INPUT',
  'HOLD_PAYLOAD_CONFLICT',
  'CONFLICTING_EVIDENCE',
]);

const HOLD_SEMANTIC = new Set(['INVALID_INPUT', 'HOLD_PAYLOAD_CONFLICT', 'CONFLICTING_EVIDENCE']);

export const M55_R5_LOCK_RPC_TRANSPORT_ERROR = 'LOCK_RPC_TRANSPORT_ERROR' as const;
export const M55_R5_BIND_RPC_TRANSPORT_ERROR = 'BIND_RPC_TRANSPORT_ERROR' as const;
export const M55_R5_TERMINALIZE_RPC_TRANSPORT_ERROR = 'TERMINALIZE_RPC_TRANSPORT_ERROR' as const;
export const M55_R5_RECORD_RPC_TRANSPORT_ERROR = 'RECORD_RPC_TRANSPORT_ERROR' as const;
export const M55_R5_HOLD_RPC_TRANSPORT_ERROR = 'HOLD_RPC_TRANSPORT_ERROR' as const;

export function classifyLockPurchaseAttemptRpcErrorV1(
  error: unknown,
): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && LOCK_SEMANTIC.has(message)) return message;
  return M55_R5_LOCK_RPC_TRANSPORT_ERROR;
}

export function classifyBindCheckoutSessionRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && BIND_SEMANTIC.has(message)) return message;
  return M55_R5_BIND_RPC_TRANSPORT_ERROR;
}

export function classifyTerminalizePurchaseAttemptRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && TERMINALIZE_SEMANTIC.has(message)) return message;
  return M55_R5_TERMINALIZE_RPC_TRANSPORT_ERROR;
}

export function classifyRecordCanonicalPaymentRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && RECORD_SEMANTIC.has(message)) return message;
  return M55_R5_RECORD_RPC_TRANSPORT_ERROR;
}

export function classifyRecordCanonicalPaymentHoldRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && HOLD_SEMANTIC.has(message)) return message;
  return M55_R5_HOLD_RPC_TRANSPORT_ERROR;
}
