import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { encodeNullableByteaForPostgrestRpcV1 } from './r5TouchContinuation';
import {
  M55_R5_LOCK_PURCHASE_ATTEMPT_RPC_NAME,
  classifyLockPurchaseAttemptRpcErrorV1,
  isM55PurchaseAttemptIdV1,
  type R5bConversionKindV1,
  type R5bLockOutcomeV1,
  type R5bPolicyProductIdV1,
} from './r5PurchaseAttemptContract';

export type LockPurchaseAttemptRpcParamsV1 = {
  p_clerk_subject_lookup_digest: string;
  p_runtime_product_id: string;
  p_policy_product_id: R5bPolicyProductIdV1;
  p_conversion_kind: R5bConversionKindV1;
  p_purchase_scope_id: string;
  p_cutoff_at_ms: number;
  p_attribution_locked_at_ms: number;
  p_pending_continuation_id: string | null;
  p_tracking_contract_version: 'v1';
  p_attribution_policy_version: 'v1';
};

export function buildLockPurchaseAttemptRpcParamsV1(args: {
  clerkSubjectLookupDigest: string;
  runtimeProductId: string;
  policyProductId: R5bPolicyProductIdV1;
  conversionKind: R5bConversionKindV1;
  purchaseScopeId: string;
  cutoffAtMs: number;
  attributionLockedAtMs: number;
  pendingContinuationIdBytes: Buffer | null;
}): LockPurchaseAttemptRpcParamsV1 {
  return {
    p_clerk_subject_lookup_digest: args.clerkSubjectLookupDigest,
    p_runtime_product_id: args.runtimeProductId,
    p_policy_product_id: args.policyProductId,
    p_conversion_kind: args.conversionKind,
    p_purchase_scope_id: args.purchaseScopeId,
    p_cutoff_at_ms: args.cutoffAtMs,
    p_attribution_locked_at_ms: args.attributionLockedAtMs,
    p_pending_continuation_id: encodeNullableByteaForPostgrestRpcV1(
      args.pendingContinuationIdBytes,
    ),
    p_tracking_contract_version: 'v1',
    p_attribution_policy_version: 'v1',
  };
}

export type LockPurchaseAttemptRpcResultV1 =
  | { outcome: Exclude<R5bLockOutcomeV1, 'HOLD_PENDING_ADMISSION'>; purchaseAttemptId: string }
  | { outcome: 'HOLD_PENDING_ADMISSION'; purchaseAttemptId: null };

function parseLockRpcResult(raw: unknown): LockPurchaseAttemptRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('LOCK_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('LOCK_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome === 'HOLD_PENDING_ADMISSION') {
    return { outcome, purchaseAttemptId: null };
  }
  const purchaseAttemptId = row.purchase_attempt_id;
  if (
    (outcome !== 'LOCKED_WINNER' &&
      outcome !== 'LOCKED_NONE' &&
      outcome !== 'CONVERGED') ||
    !isM55PurchaseAttemptIdV1(purchaseAttemptId)
  ) {
    throw new Error('LOCK_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome,
    purchaseAttemptId: String(purchaseAttemptId).toLowerCase(),
  };
}

export async function callLockPurchaseAttemptRpcV1(args: {
  clerkSubjectLookupDigest: string;
  runtimeProductId: string;
  policyProductId: R5bPolicyProductIdV1;
  conversionKind: R5bConversionKindV1;
  purchaseScopeId: string;
  cutoffAtMs: number;
  attributionLockedAtMs: number;
  pendingContinuationIdBytes: Buffer | null;
}): Promise<LockPurchaseAttemptRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildLockPurchaseAttemptRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_LOCK_PURCHASE_ATTEMPT_RPC_NAME, params);
  if (error) {
    throw new Error(classifyLockPurchaseAttemptRpcErrorV1(error));
  }
  return parseLockRpcResult(data);
}
