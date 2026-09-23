import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_RECORD_CANONICAL_PAYMENT_HOLD_RPC_NAME,
  classifyRecordCanonicalPaymentHoldRpcErrorV1,
  type R5bHoldOutcomeV1,
  type R5bHoldReasonCodeV1,
  type R5bProviderCorrelationStateV1,
} from './r5PurchaseAttemptContract';

export type RecordCanonicalPaymentHoldRpcParamsV1 = {
  p_stripe_canonical_event_id: string;
  p_payment_intent_id: string;
  p_canonical_event_created_at_ms: number;
  p_verified_checkout_session_id: string | null;
  p_metadata_purchase_attempt_id: string | null;
  p_resolved_purchase_attempt_id: string | null;
  p_reason_code: R5bHoldReasonCodeV1;
  p_provider_correlation_state: R5bProviderCorrelationStateV1;
};

export function buildRecordCanonicalPaymentHoldRpcParamsV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  canonicalEventCreatedAtMs: number;
  verifiedCheckoutSessionId: string | null;
  metadataPurchaseAttemptId: string | null;
  resolvedPurchaseAttemptId: string | null;
  reasonCode: R5bHoldReasonCodeV1;
  providerCorrelationState: R5bProviderCorrelationStateV1;
}): RecordCanonicalPaymentHoldRpcParamsV1 {
  return {
    p_stripe_canonical_event_id: args.stripeCanonicalEventId,
    p_payment_intent_id: args.paymentIntentId,
    p_canonical_event_created_at_ms: args.canonicalEventCreatedAtMs,
    p_verified_checkout_session_id: args.verifiedCheckoutSessionId,
    p_metadata_purchase_attempt_id: args.metadataPurchaseAttemptId,
    p_resolved_purchase_attempt_id: args.resolvedPurchaseAttemptId,
    p_reason_code: args.reasonCode,
    p_provider_correlation_state: args.providerCorrelationState,
  };
}

export type RecordCanonicalPaymentHoldRpcResultV1 = {
  outcome: R5bHoldOutcomeV1;
  holdId: string;
  reasonCode: R5bHoldReasonCodeV1;
};

function parseHoldRpcResult(raw: unknown): RecordCanonicalPaymentHoldRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('HOLD_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('HOLD_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (
    outcome !== 'HOLD_RECONCILE' &&
    outcome !== 'CONVERGED' &&
    outcome !== 'CONFLICTING_EVIDENCE'
  ) {
    throw new Error('HOLD_RPC_UNEXPECTED_SHAPE');
  }
  if (typeof row.hold_id !== 'string' || typeof row.reason_code !== 'string') {
    throw new Error('HOLD_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome,
    holdId: row.hold_id,
    reasonCode: row.reason_code as R5bHoldReasonCodeV1,
  };
}

export async function callRecordCanonicalPaymentHoldRpcV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  canonicalEventCreatedAtMs: number;
  verifiedCheckoutSessionId: string | null;
  metadataPurchaseAttemptId: string | null;
  resolvedPurchaseAttemptId: string | null;
  reasonCode: R5bHoldReasonCodeV1;
  providerCorrelationState: R5bProviderCorrelationStateV1;
}): Promise<RecordCanonicalPaymentHoldRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildRecordCanonicalPaymentHoldRpcParamsV1(args);
  const { data, error } = await db.rpc(
    M55_R5_RECORD_CANONICAL_PAYMENT_HOLD_RPC_NAME,
    params,
  );
  if (error) {
    throw new Error(classifyRecordCanonicalPaymentHoldRpcErrorV1(error));
  }
  return parseHoldRpcResult(data);
}
