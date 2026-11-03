import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
  classifyFinalizeLockBindRpcErrorV1,
  type AttributionDecisionKindV1,
  type LockDenialReasonCodeV1,
} from './r5PurchaseAttemptLockContract';

export type FinalizeLockBindRpcParamsV1 = {
  p_purchase_attempt_id: string;
  p_stripe_checkout_session_id: string;
  p_lock_expires_at_ms: number;
};

export function buildFinalizeLockBindRpcParamsV1(args: {
  purchaseAttemptId: string;
  stripeCheckoutSessionId: string;
  lockExpiresAtMs: number;
}): FinalizeLockBindRpcParamsV1 {
  return {
    p_purchase_attempt_id: args.purchaseAttemptId,
    p_stripe_checkout_session_id: args.stripeCheckoutSessionId,
    p_lock_expires_at_ms: args.lockExpiresAtMs,
  };
}

export type FinalizeLockBindResultV1 = {
  purchaseAttemptId: string;
  decisionKind: AttributionDecisionKindV1;
  lockDenialReasonCode: LockDenialReasonCodeV1 | null;
  stripeCheckoutSessionId: string;
  finalizationState: 'FINALIZED';
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

function parseFinalizeResult(raw: unknown): FinalizeLockBindResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('FINALIZE_LOCK_BIND_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  const purchaseAttemptId = row.purchase_attempt_id;
  const decisionKind = row.decision_kind;
  const stripeCheckoutSessionId = row.stripe_checkout_session_id;
  const finalizationState = row.finalization_state;
  const lockDenialReasonCode = row.lock_denial_reason_code;
  if (typeof purchaseAttemptId !== 'string' || !UUID_RE.test(purchaseAttemptId)) {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (decisionKind !== 'CREATOR_WINNER' && decisionKind !== 'NONE') {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (typeof stripeCheckoutSessionId !== 'string' || stripeCheckoutSessionId.length === 0) {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (finalizationState !== 'FINALIZED') {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (
    lockDenialReasonCode !== null &&
    (typeof lockDenialReasonCode !== 'string' || !DENIAL_CODES.has(lockDenialReasonCode))
  ) {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (decisionKind === 'CREATOR_WINNER' && lockDenialReasonCode !== null) {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  if (decisionKind === 'NONE' && lockDenialReasonCode === null) {
    throw new Error('FINALIZE_LOCK_BIND_RPC_UNEXPECTED_SHAPE');
  }
  return {
    purchaseAttemptId,
    decisionKind,
    lockDenialReasonCode: lockDenialReasonCode as LockDenialReasonCodeV1 | null,
    stripeCheckoutSessionId,
    finalizationState: 'FINALIZED',
  };
}

export async function finalizeAttributionLockAndBindCheckoutSessionV1(args: {
  purchaseAttemptId: string;
  stripeCheckoutSessionId: string;
  lockExpiresAtMs: number;
}): Promise<FinalizeLockBindResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = JSON.parse(
    JSON.stringify(buildFinalizeLockBindRpcParamsV1(args)),
  ) as FinalizeLockBindRpcParamsV1;
  const { data, error } = await db.rpc(M55_R5_FINALIZE_LOCK_BIND_RPC_NAME, params);
  if (error) {
    throw new Error(classifyFinalizeLockBindRpcErrorV1(error));
  }
  return parseFinalizeResult(data);
}
