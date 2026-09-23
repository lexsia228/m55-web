import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_RECORD_CANONICAL_PAYMENT_RPC_NAME,
  classifyRecordCanonicalPaymentRpcErrorV1,
  type R5bRecordCanonicalOutcomeV1,
} from './r5PurchaseAttemptContract';

export type RecordCanonicalPaymentRpcParamsV1 = {
  p_stripe_canonical_event_id: string;
  p_payment_intent_id: string;
  p_canonical_event_created_at_ms: number;
  p_verified_checkout_session_id: string;
  p_metadata_purchase_attempt_id: string | null;
};

export function buildRecordCanonicalPaymentRpcParamsV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  canonicalEventCreatedAtMs: number;
  verifiedCheckoutSessionId: string;
  metadataPurchaseAttemptId: string | null;
}): RecordCanonicalPaymentRpcParamsV1 {
  return {
    p_stripe_canonical_event_id: args.stripeCanonicalEventId,
    p_payment_intent_id: args.paymentIntentId,
    p_canonical_event_created_at_ms: args.canonicalEventCreatedAtMs,
    p_verified_checkout_session_id: args.verifiedCheckoutSessionId,
    p_metadata_purchase_attempt_id: args.metadataPurchaseAttemptId,
  };
}

export type RecordCanonicalPaymentRpcResultV1 = {
  outcome: R5bRecordCanonicalOutcomeV1;
  holdId?: string;
  reasonCode?: string;
};

function parseRecordRpcResult(raw: unknown): RecordCanonicalPaymentRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('RECORD_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('RECORD_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (
    outcome !== 'RECORDED' &&
    outcome !== 'CONVERGED' &&
    outcome !== 'HOLD_RECONCILE' &&
    outcome !== 'NO_R5_BINDING' &&
    outcome !== 'CONFLICTING_EVIDENCE'
  ) {
    throw new Error('RECORD_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome,
    holdId: typeof row.hold_id === 'string' ? row.hold_id : undefined,
    reasonCode: typeof row.reason_code === 'string' ? row.reason_code : undefined,
  };
}

export async function callRecordCanonicalPaymentRpcV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  canonicalEventCreatedAtMs: number;
  verifiedCheckoutSessionId: string;
  metadataPurchaseAttemptId: string | null;
}): Promise<RecordCanonicalPaymentRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildRecordCanonicalPaymentRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_RECORD_CANONICAL_PAYMENT_RPC_NAME, params);
  if (error) {
    throw new Error(classifyRecordCanonicalPaymentRpcErrorV1(error));
  }
  return parseRecordRpcResult(data);
}
