import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_BIND_CHECKOUT_SESSION_RPC_NAME,
  classifyBindCheckoutSessionRpcErrorV1,
  type R5bBindOutcomeV1,
} from './r5PurchaseAttemptContract';

export type BindCheckoutSessionRpcParamsV1 = {
  p_purchase_attempt_id: string;
  p_stripe_checkout_session_id: string;
  p_stripe_payment_intent_id: string | null;
  p_lock_expires_at_ms: number;
};

export function buildBindCheckoutSessionRpcParamsV1(args: {
  purchaseAttemptId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  lockExpiresAtMs: number;
}): BindCheckoutSessionRpcParamsV1 {
  return {
    p_purchase_attempt_id: args.purchaseAttemptId,
    p_stripe_checkout_session_id: args.stripeCheckoutSessionId,
    p_stripe_payment_intent_id: args.stripePaymentIntentId,
    p_lock_expires_at_ms: args.lockExpiresAtMs,
  };
}

export type BindCheckoutSessionRpcResultV1 = {
  outcome: R5bBindOutcomeV1;
};

function parseBindRpcResult(raw: unknown): BindCheckoutSessionRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('BIND_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('BIND_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome !== 'BOUND' && outcome !== 'CONVERGED') {
    throw new Error('BIND_RPC_UNEXPECTED_SHAPE');
  }
  return { outcome };
}

export async function callBindCheckoutSessionRpcV1(args: {
  purchaseAttemptId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  lockExpiresAtMs: number;
}): Promise<BindCheckoutSessionRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildBindCheckoutSessionRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_BIND_CHECKOUT_SESSION_RPC_NAME, params);
  if (error) {
    throw new Error(classifyBindCheckoutSessionRpcErrorV1(error));
  }
  return parseBindRpcResult(data);
}

export async function loadAcceptedPayableBindingV1(purchaseAttemptId: string): Promise<{
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
} | null> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('m55_r5_attribution_attempt_provider_bindings')
    .select('stripe_checkout_session_id, stripe_payment_intent_id')
    .eq('purchase_attempt_id', purchaseAttemptId)
    .eq('binding_kind', 'ACCEPTED_PAYABLE_SESSION')
    .maybeSingle();
  if (error) {
    throw new Error('BIND_LOOKUP_TRANSPORT_ERROR');
  }
  if (!data || typeof data.stripe_checkout_session_id !== 'string') {
    return null;
  }
  return {
    stripeCheckoutSessionId: data.stripe_checkout_session_id,
    stripePaymentIntentId:
      typeof data.stripe_payment_intent_id === 'string' ? data.stripe_payment_intent_id : null,
  };
}
