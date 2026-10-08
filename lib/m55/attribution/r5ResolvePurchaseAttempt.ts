import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_RESOLVE_ATTEMPT_RPC_NAME,
  classifyResolvePurchaseAttemptRpcErrorV1,
  type AttributionDecisionKindV1,
  type AttributionFinalizationStateV1,
  type LockDenialReasonCodeV1,
  type PurchaseAttemptSuccessorReasonV1,
} from './r5PurchaseAttemptLockContract';
import type { CreatorCashEligibleProductV1 } from '../contracts/m55AttributionPolicyContract';

export type ResolvePurchaseAttemptRpcParamsV1 = {
  p_clerk_subject_lookup_digest: string;
  p_buyer_clerk_user_id: string;
  p_creator_cash_product_key: CreatorCashEligibleProductV1;
  p_repurchase_lane: boolean;
  p_scope_generation: number;
  p_successor_reason: PurchaseAttemptSuccessorReasonV1 | null;
  p_correlation_purchase_context_id: string | null;
};

export function buildResolvePurchaseAttemptRpcParamsV1(args: {
  clerkSubjectLookupDigest: string;
  buyerClerkUserId: string;
  creatorCashProductKey: CreatorCashEligibleProductV1;
  repurchaseLane: boolean;
  scopeGeneration: number;
  successorReason: PurchaseAttemptSuccessorReasonV1 | null;
  correlationPurchaseContextId: string | null;
}): ResolvePurchaseAttemptRpcParamsV1 {
  return {
    p_clerk_subject_lookup_digest: args.clerkSubjectLookupDigest,
    p_buyer_clerk_user_id: args.buyerClerkUserId,
    p_creator_cash_product_key: args.creatorCashProductKey,
    p_repurchase_lane: args.repurchaseLane,
    p_scope_generation: args.scopeGeneration,
    p_successor_reason: args.successorReason,
    p_correlation_purchase_context_id: args.correlationPurchaseContextId,
  };
}

export type ResolvePurchaseAttemptResultV1 = {
  purchaseAttemptId: string;
  cutoffAtMs: number;
  finalizationState: AttributionFinalizationStateV1;
  stripeCheckoutSessionId: string | null;
  decisionKind: AttributionDecisionKindV1 | null;
  lockDenialReasonCode: LockDenialReasonCodeV1 | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DENIAL_CODES = new Set([
  'NO_QUALIFIED_TOUCH',
  'WINDOW_EXPIRED',
  'SELF_REFERRAL',
  'CIRCULAR_ABUSE',
  'CREATOR_NOT_ACTIVE',
]);

function parseNullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  return value;
}

function parseResolveResult(raw: unknown): ResolvePurchaseAttemptResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('RESOLVE_ATTEMPT_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  const purchaseAttemptId = row.purchase_attempt_id;
  const cutoffAtMs = row.cutoff_at_ms;
  const finalizationState = row.finalization_state;
  if (typeof purchaseAttemptId !== 'string' || !UUID_RE.test(purchaseAttemptId)) {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  if (
    typeof cutoffAtMs !== 'number' ||
    !Number.isSafeInteger(cutoffAtMs) ||
    cutoffAtMs < 0
  ) {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  if (finalizationState !== 'UNFINALIZED' && finalizationState !== 'FINALIZED') {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  const stripeCheckoutSessionId = parseNullableString(row.stripe_checkout_session_id);
  const decisionKind = row.decision_kind;
  if (decisionKind !== null && decisionKind !== 'CREATOR_WINNER' && decisionKind !== 'NONE') {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  const lockDenialReasonCode = row.lock_denial_reason_code;
  if (
    lockDenialReasonCode !== null &&
    (typeof lockDenialReasonCode !== 'string' || !DENIAL_CODES.has(lockDenialReasonCode))
  ) {
    throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
  }
  if (finalizationState === 'UNFINALIZED') {
    if (stripeCheckoutSessionId !== null || decisionKind !== null || lockDenialReasonCode !== null) {
      throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
    }
  }
  if (finalizationState === 'FINALIZED') {
    if (typeof stripeCheckoutSessionId !== 'string' || stripeCheckoutSessionId.length === 0) {
      throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
    }
    if (decisionKind !== 'CREATOR_WINNER' && decisionKind !== 'NONE') {
      throw new Error('RESOLVE_ATTEMPT_RPC_UNEXPECTED_SHAPE');
    }
  }
  return {
    purchaseAttemptId,
    cutoffAtMs,
    finalizationState,
    stripeCheckoutSessionId,
    decisionKind: decisionKind as AttributionDecisionKindV1 | null,
    lockDenialReasonCode: lockDenialReasonCode as LockDenialReasonCodeV1 | null,
  };
}

export async function resolvePurchaseAttemptV1(args: {
  clerkSubjectLookupDigest: string;
  buyerClerkUserId: string;
  creatorCashProductKey: CreatorCashEligibleProductV1;
  repurchaseLane: boolean;
  scopeGeneration: number;
  successorReason: PurchaseAttemptSuccessorReasonV1 | null;
  correlationPurchaseContextId: string | null;
}): Promise<ResolvePurchaseAttemptResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = JSON.parse(
    JSON.stringify(buildResolvePurchaseAttemptRpcParamsV1(args)),
  ) as ResolvePurchaseAttemptRpcParamsV1;
  const { data, error } = await db.rpc(M55_R5_RESOLVE_ATTEMPT_RPC_NAME, params);
  if (error) {
    throw new Error(classifyResolvePurchaseAttemptRpcErrorV1(error));
  }
  return parseResolveResult(data);
}
