export const M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME =
  '20260921000000_m55_r5_purchase_attempt_attribution_lock_v1.sql' as const;

export const M55_R5_RESOLVE_ATTEMPT_RPC_NAME =
  'm55_r5_attribution_resolve_purchase_attempt_v1' as const;

export const M55_R5_FINALIZE_LOCK_BIND_RPC_NAME =
  'm55_r5_attribution_finalize_lock_and_bind_checkout_session_v1' as const;

export const M55_R5_CLERK_LOOKUP_DIGEST_SQL_NAME =
  'm55_r5_attribution_clerk_lookup_digest_v1' as const;

export const M55_R5_RESOLVE_ATTEMPT_RPC_TRANSPORT_ERROR =
  'RESOLVE_ATTEMPT_RPC_TRANSPORT_ERROR' as const;

export const M55_R5_FINALIZE_LOCK_BIND_RPC_TRANSPORT_ERROR =
  'FINALIZE_LOCK_BIND_RPC_TRANSPORT_ERROR' as const;

export const M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_REASONS = [
  'SAME_ATTEMPT_RETRY',
  'NETWORK_RETRY',
  'UNKNOWN_STRIPE_CREATE_OUTCOME',
  'CONFIRMED_EXPIRY',
  'CONFIRMED_CANCEL',
  'PURCHASE_SCOPE_CHANGE',
] as const;

export type PurchaseAttemptSuccessorReasonV1 =
  (typeof M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_REASONS)[number];

export const M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_MINT_REASONS = [
  'CONFIRMED_EXPIRY',
  'CONFIRMED_CANCEL',
  'PURCHASE_SCOPE_CHANGE',
] as const;

export const M55_R5_PURCHASE_ATTEMPT_SUCCESSOR_RETRY_REASONS = [
  'SAME_ATTEMPT_RETRY',
  'NETWORK_RETRY',
  'UNKNOWN_STRIPE_CREATE_OUTCOME',
] as const;

export const M55_R5_RESOLVE_ATTEMPT_RPC_SEMANTIC_CODES = [
  'INVALID_INPUT',
  'BUYER_SUBJECT_DIGEST_MISMATCH',
  'BUYER_SUBJECT_DELETED',
  'BUYER_SUBJECT_AMBIGUOUS',
  'INVALID_SCOPE_GENERATION',
  'INVALID_SUCCESSOR_REASON',
  'FINALIZATION_STATE_CORRUPT',
] as const;

export type ResolvePurchaseAttemptRpcSemanticCodeV1 =
  (typeof M55_R5_RESOLVE_ATTEMPT_RPC_SEMANTIC_CODES)[number];

export const M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES = [
  'INVALID_INPUT',
  'PURCHASE_ATTEMPT_NOT_FOUND',
  'BUYER_SUBJECT_DELETED',
  'LOCK_EXPIRY_NOT_AFTER_CUTOFF',
  'CONFLICTING_FINALIZATION',
  'FINALIZATION_STATE_CORRUPT',
  'CONFLICTING_SESSION_BINDING',
  'PENDING_ADMISSION_RETRY_HOLD',
] as const;

export type FinalizeLockBindRpcSemanticCodeV1 =
  (typeof M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES)[number];

export const M55_R5_LOCK_DENIAL_REASON_CODES = [
  'NO_QUALIFIED_TOUCH',
  'WINDOW_EXPIRED',
  'SELF_REFERRAL',
  'CIRCULAR_ABUSE',
  'CREATOR_NOT_ACTIVE',
] as const;

export type LockDenialReasonCodeV1 = (typeof M55_R5_LOCK_DENIAL_REASON_CODES)[number];

export type AttributionFinalizationStateV1 = 'UNFINALIZED' | 'FINALIZED';
export type AttributionDecisionKindV1 = 'CREATOR_WINNER' | 'NONE';

const RESOLVE_CODE_SET = new Set<string>(M55_R5_RESOLVE_ATTEMPT_RPC_SEMANTIC_CODES);
const FINALIZE_CODE_SET = new Set<string>(M55_R5_FINALIZE_LOCK_BIND_RPC_SEMANTIC_CODES);

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function classifyResolvePurchaseAttemptRpcErrorV1(
  error: unknown,
): ResolvePurchaseAttemptRpcSemanticCodeV1 | typeof M55_R5_RESOLVE_ATTEMPT_RPC_TRANSPORT_ERROR {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && RESOLVE_CODE_SET.has(message)) {
    return message as ResolvePurchaseAttemptRpcSemanticCodeV1;
  }
  return M55_R5_RESOLVE_ATTEMPT_RPC_TRANSPORT_ERROR;
}

export function classifyFinalizeLockBindRpcErrorV1(
  error: unknown,
): FinalizeLockBindRpcSemanticCodeV1 | typeof M55_R5_FINALIZE_LOCK_BIND_RPC_TRANSPORT_ERROR {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && FINALIZE_CODE_SET.has(message)) {
    return message as FinalizeLockBindRpcSemanticCodeV1;
  }
  return M55_R5_FINALIZE_LOCK_BIND_RPC_TRANSPORT_ERROR;
}
