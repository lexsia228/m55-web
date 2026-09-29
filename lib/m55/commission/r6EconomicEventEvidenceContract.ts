import 'server-only';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { isSafeIntegerInRangeV1, normalizeStripeCurrencyToJpyV1 } from './r6PurchaseMoneyEvidenceContract';

export const M55_R6_REFUND_DISPUTE_ECONOMIC_EVIDENCE_MIGRATION_FILENAME =
  '20260927100000_m55_r6_refund_dispute_economic_evidence_v1.sql' as const;

export const M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION =
  'r6_refund_economic_evidence_v1' as const;

export const M55_R6_DISPUTE_ECONOMIC_SOURCE_CAPTURE_VERSION =
  'r6_dispute_economic_evidence_v1' as const;

export const M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME =
  'm55_r6_record_refund_economic_evidence_v1' as const;

export const M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME =
  'm55_r6_record_dispute_economic_evidence_v1' as const;

export const M55_R6_ECONOMIC_AMOUNT_MIN_JPY = 1 as const;
export const M55_R6_ECONOMIC_AMOUNT_MAX_JPY = 99_999_999 as const;
export const M55_R6_ECONOMIC_PROVIDER_STATUS_MAX_LEN = 128 as const;
export const M55_R6_ECONOMIC_RPC_TRANSPORT_ERROR = 'ECONOMIC_RPC_TRANSPORT_ERROR' as const;

export const M55_R6_REFUND_ECONOMIC_EVENT_TYPES = [
  'refund.created',
  'refund.updated',
] as const;

export const M55_R6_DISPUTE_ECONOMIC_EVENT_TYPES = [
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed',
  'charge.dispute.funds_withdrawn',
  'charge.dispute.funds_reinstated',
] as const;

export type R6RefundEconomicEventTypeV1 = (typeof M55_R6_REFUND_ECONOMIC_EVENT_TYPES)[number];
export type R6DisputeEconomicEventTypeV1 = (typeof M55_R6_DISPUTE_ECONOMIC_EVENT_TYPES)[number];
export type R6EconomicEvidenceEventTypeV1 =
  | R6RefundEconomicEventTypeV1
  | R6DisputeEconomicEventTypeV1;

export type R6RecordEconomicEvidenceOutcomeV1 = 'RECORDED' | 'CONVERGED';

export type R6RefundEconomicEvidencePayloadV1 = {
  stripeEventId: string;
  stripeEventType: R6RefundEconomicEventTypeV1;
  stripeEventCreatedAtMs: number;
  providerRefundId: string;
  providerRefundCreatedAtMs: number;
  paymentIntentId: string;
  amountJpy: number;
  currency: 'jpy';
  refundStatus: string;
  sourceCaptureVersion: typeof M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION;
};

export type R6DisputeEconomicEvidencePayloadV1 = {
  stripeEventId: string;
  stripeEventType: R6DisputeEconomicEventTypeV1;
  stripeEventCreatedAtMs: number;
  providerDisputeId: string;
  providerDisputeCreatedAtMs: number;
  paymentIntentId: string;
  amountJpy: number;
  currency: 'jpy';
  disputeStatus: string;
  sourceCaptureVersion: typeof M55_R6_DISPUTE_ECONOMIC_SOURCE_CAPTURE_VERSION;
};

export type NormalizeRefundEconomicEventResultV1 =
  | { ok: true; payload: R6RefundEconomicEvidencePayloadV1 }
  | { ok: false; reason: string };

export type NormalizeDisputeEconomicEventResultV1 =
  | { ok: true; payload: R6DisputeEconomicEvidencePayloadV1 }
  | { ok: false; reason: string };

export type RecordRefundEconomicEvidenceRpcResultV1 = {
  outcome: R6RecordEconomicEvidenceOutcomeV1;
  refundEconomicEvidenceId?: string;
};

export type RecordDisputeEconomicEvidenceRpcResultV1 = {
  outcome: R6RecordEconomicEvidenceOutcomeV1;
  disputeEconomicEvidenceId?: string;
};

const ECONOMIC_RPC_SEMANTIC = new Set([
  'INVALID_INPUT',
  'PURCHASE_MONEY_EVIDENCE_NOT_FOUND',
  'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT',
]);

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function classifyRecordEconomicEvidenceRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && ECONOMIC_RPC_SEMANTIC.has(message)) return message;
  return M55_R6_ECONOMIC_RPC_TRANSPORT_ERROR;
}

export function isR6RefundEconomicEventTypeV1(
  value: string,
): value is R6RefundEconomicEventTypeV1 {
  return (M55_R6_REFUND_ECONOMIC_EVENT_TYPES as readonly string[]).includes(value);
}

export function isR6DisputeEconomicEventTypeV1(
  value: string,
): value is R6DisputeEconomicEventTypeV1 {
  return (M55_R6_DISPUTE_ECONOMIC_EVENT_TYPES as readonly string[]).includes(value);
}

export function isR6EconomicEvidenceEventTypeV1(
  value: string | undefined,
): value is R6EconomicEvidenceEventTypeV1 {
  if (!value) return false;
  return isR6RefundEconomicEventTypeV1(value) || isR6DisputeEconomicEventTypeV1(value);
}

function providerCreatedToMsV1(createdSeconds: unknown): number | null {
  if (!Number.isSafeInteger(createdSeconds)) return null;

  const seconds = createdSeconds as number;
  if (seconds < 0) return null;

  const milliseconds = seconds * 1000;
  if (!Number.isSafeInteger(milliseconds)) return null;

  return milliseconds;
}

function resolvePaymentIntentIdV1(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

function readProviderStatusV1(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > M55_R6_ECONOMIC_PROVIDER_STATUS_MAX_LEN) {
    return null;
  }
  return trimmed;
}

function readStripeEventIdV1(event: Stripe.Event): string | null {
  if (typeof event.id !== 'string' || event.id.length === 0) return null;
  return event.id;
}

function readStripeEventCreatedAtMsV1(event: Stripe.Event): number | null {
  return providerCreatedToMsV1(event.created);
}

export function normalizeRefundEconomicEventV1(
  event: Stripe.Event,
): NormalizeRefundEconomicEventResultV1 {
  if (!isR6RefundEconomicEventTypeV1(event.type)) {
    return { ok: false, reason: 'UNSUPPORTED_EVENT_TYPE' };
  }

  const stripeEventId = readStripeEventIdV1(event);
  const stripeEventCreatedAtMs = readStripeEventCreatedAtMsV1(event);
  if (!stripeEventId || stripeEventCreatedAtMs === null) {
    return { ok: false, reason: 'INVALID_EVENT_IDENTITY' };
  }

  const refund = event.data.object as Stripe.Refund;
  if (!refund || typeof refund !== 'object') {
    return { ok: false, reason: 'INVALID_REFUND_OBJECT' };
  }

  if (typeof refund.id !== 'string' || refund.id.length === 0) {
    return { ok: false, reason: 'INVALID_PROVIDER_REFUND_ID' };
  }

  const providerRefundCreatedAtMs = providerCreatedToMsV1(refund.created);
  if (providerRefundCreatedAtMs === null) {
    return { ok: false, reason: 'INVALID_PROVIDER_REFUND_CREATED' };
  }

  if (
    !isSafeIntegerInRangeV1(
      refund.amount,
      M55_R6_ECONOMIC_AMOUNT_MIN_JPY,
      M55_R6_ECONOMIC_AMOUNT_MAX_JPY,
    )
  ) {
    return { ok: false, reason: 'INVALID_AMOUNT' };
  }

  const currency = normalizeStripeCurrencyToJpyV1(refund.currency);
  if (!currency) {
    return { ok: false, reason: 'INVALID_CURRENCY' };
  }

  const paymentIntentId = resolvePaymentIntentIdV1(refund.payment_intent);
  if (!paymentIntentId) {
    return { ok: false, reason: 'INVALID_PAYMENT_INTENT' };
  }

  const refundStatus = readProviderStatusV1(refund.status);
  if (!refundStatus) {
    return { ok: false, reason: 'INVALID_REFUND_STATUS' };
  }

  return {
    ok: true,
    payload: {
      stripeEventId,
      stripeEventType: event.type,
      stripeEventCreatedAtMs,
      providerRefundId: refund.id,
      providerRefundCreatedAtMs,
      paymentIntentId,
      amountJpy: refund.amount,
      currency,
      refundStatus,
      sourceCaptureVersion: M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION,
    },
  };
}

export function normalizeDisputeEconomicEventV1(
  event: Stripe.Event,
): NormalizeDisputeEconomicEventResultV1 {
  if (!isR6DisputeEconomicEventTypeV1(event.type)) {
    return { ok: false, reason: 'UNSUPPORTED_EVENT_TYPE' };
  }

  const stripeEventId = readStripeEventIdV1(event);
  const stripeEventCreatedAtMs = readStripeEventCreatedAtMsV1(event);
  if (!stripeEventId || stripeEventCreatedAtMs === null) {
    return { ok: false, reason: 'INVALID_EVENT_IDENTITY' };
  }

  const dispute = event.data.object as Stripe.Dispute;
  if (!dispute || typeof dispute !== 'object') {
    return { ok: false, reason: 'INVALID_DISPUTE_OBJECT' };
  }

  if (typeof dispute.id !== 'string' || dispute.id.length === 0) {
    return { ok: false, reason: 'INVALID_PROVIDER_DISPUTE_ID' };
  }

  const providerDisputeCreatedAtMs = providerCreatedToMsV1(dispute.created);
  if (providerDisputeCreatedAtMs === null) {
    return { ok: false, reason: 'INVALID_PROVIDER_DISPUTE_CREATED' };
  }

  if (
    !isSafeIntegerInRangeV1(
      dispute.amount,
      M55_R6_ECONOMIC_AMOUNT_MIN_JPY,
      M55_R6_ECONOMIC_AMOUNT_MAX_JPY,
    )
  ) {
    return { ok: false, reason: 'INVALID_AMOUNT' };
  }

  const currency = normalizeStripeCurrencyToJpyV1(dispute.currency);
  if (!currency) {
    return { ok: false, reason: 'INVALID_CURRENCY' };
  }

  const paymentIntentId = resolvePaymentIntentIdV1(dispute.payment_intent);
  if (!paymentIntentId) {
    return { ok: false, reason: 'INVALID_PAYMENT_INTENT' };
  }

  const disputeStatus = readProviderStatusV1(dispute.status);
  if (!disputeStatus) {
    return { ok: false, reason: 'INVALID_DISPUTE_STATUS' };
  }

  return {
    ok: true,
    payload: {
      stripeEventId,
      stripeEventType: event.type,
      stripeEventCreatedAtMs,
      providerDisputeId: dispute.id,
      providerDisputeCreatedAtMs,
      paymentIntentId,
      amountJpy: dispute.amount,
      currency,
      disputeStatus,
      sourceCaptureVersion: M55_R6_DISPUTE_ECONOMIC_SOURCE_CAPTURE_VERSION,
    },
  };
}

function parseRecordEconomicEvidenceRpcResult(
  raw: unknown,
  idKey: 'refund_economic_evidence_id' | 'dispute_economic_evidence_id',
): { outcome: R6RecordEconomicEvidenceOutcomeV1; evidenceId?: string } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('ECONOMIC_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('ECONOMIC_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome !== 'RECORDED' && outcome !== 'CONVERGED') {
    throw new Error('ECONOMIC_RPC_UNEXPECTED_SHAPE');
  }
  const evidenceId = row[idKey];
  return {
    outcome,
    evidenceId: typeof evidenceId === 'string' ? evidenceId : undefined,
  };
}

export async function callRecordRefundEconomicEvidenceRpcV1(args: {
  db?: unknown;
  payload: R6RefundEconomicEvidencePayloadV1;
}): Promise<RecordRefundEconomicEvidenceRpcResultV1> {
  const db = (args.db ?? getSupabaseAdmin()) as {
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await db.rpc(M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME, {
    p_stripe_event_id: args.payload.stripeEventId,
    p_stripe_event_type: args.payload.stripeEventType,
    p_stripe_event_created_at_ms: args.payload.stripeEventCreatedAtMs,
    p_provider_refund_id: args.payload.providerRefundId,
    p_provider_refund_created_at_ms: args.payload.providerRefundCreatedAtMs,
    p_payment_intent_id: args.payload.paymentIntentId,
    p_amount_jpy: args.payload.amountJpy,
    p_currency: args.payload.currency,
    p_refund_status: args.payload.refundStatus,
  });
  if (error) {
    throw new Error(classifyRecordEconomicEvidenceRpcErrorV1(error));
  }
  const parsed = parseRecordEconomicEvidenceRpcResult(data, 'refund_economic_evidence_id');
  return {
    outcome: parsed.outcome,
    refundEconomicEvidenceId: parsed.evidenceId,
  };
}

export async function callRecordDisputeEconomicEvidenceRpcV1(args: {
  db?: unknown;
  payload: R6DisputeEconomicEvidencePayloadV1;
}): Promise<RecordDisputeEconomicEvidenceRpcResultV1> {
  const db = (args.db ?? getSupabaseAdmin()) as {
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await db.rpc(M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME, {
    p_stripe_event_id: args.payload.stripeEventId,
    p_stripe_event_type: args.payload.stripeEventType,
    p_stripe_event_created_at_ms: args.payload.stripeEventCreatedAtMs,
    p_provider_dispute_id: args.payload.providerDisputeId,
    p_provider_dispute_created_at_ms: args.payload.providerDisputeCreatedAtMs,
    p_payment_intent_id: args.payload.paymentIntentId,
    p_amount_jpy: args.payload.amountJpy,
    p_currency: args.payload.currency,
    p_dispute_status: args.payload.disputeStatus,
  });
  if (error) {
    throw new Error(classifyRecordEconomicEvidenceRpcErrorV1(error));
  }
  const parsed = parseRecordEconomicEvidenceRpcResult(data, 'dispute_economic_evidence_id');
  return {
    outcome: parsed.outcome,
    disputeEconomicEvidenceId: parsed.evidenceId,
  };
}
