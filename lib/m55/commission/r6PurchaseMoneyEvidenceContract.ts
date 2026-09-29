import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import type { PaymentIntentCheckoutSessionProofV1 } from '../attribution/r5VerifyPaymentIntentCheckoutSessionProof';

export const M55_R6_PURCHASE_MONEY_EVIDENCE_MIGRATION_FILENAME =
  '20260927000000_m55_r6_purchase_money_evidence_v1.sql' as const;

export const M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION = 'r6_purchase_money_v1' as const;

export const M55_R6_RECORD_PURCHASE_MONEY_EVIDENCE_RPC_NAME =
  'm55_r6_record_purchase_money_evidence_v1' as const;

export const M55_R6_MONEY_GROSS_MIN_JPY = 1 as const;
export const M55_R6_MONEY_GROSS_MAX_JPY = 99_999_999 as const;
export const M55_R6_MONEY_DISCOUNT_MAX_JPY = 99_999_999 as const;

export const M55_R6_MONEY_RPC_TRANSPORT_ERROR = 'MONEY_RPC_TRANSPORT_ERROR' as const;

export const M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED =
  'PURCHASE_MONEY_SNAPSHOT_READ_FAILED' as const;

export type R6PurchaseMoneyDiscountStateV1 = 'NONE' | 'PRESENT';

export type R6PurchaseMoneyEvidencePayloadV1 = {
  grossCustomerPaidJpy: number;
  currency: 'jpy';
  authoritativeTaxAmountPresent: boolean;
  authoritativePurchaseTaxAmountJpy: number | null;
  discountAmountJpy: number;
  discountState: R6PurchaseMoneyDiscountStateV1;
  sourceCaptureVersion: typeof M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION;
};

export type R6PurchaseMoneyEvidenceRowV1 = R6PurchaseMoneyEvidencePayloadV1 & {
  purchaseMoneyEvidenceId: string;
  canonicalPaymentEvidenceId: string;
};

export type R6RecordPurchaseMoneyOutcomeV1 = 'RECORDED' | 'CONVERGED';

export type NormalizePurchaseMoneyFailureReasonV1 =
  | 'INVALID_PAYMENT_INTENT_AMOUNT_RECEIVED'
  | 'INVALID_PAYMENT_INTENT_CURRENCY'
  | 'INVALID_SESSION_AMOUNT_TOTAL'
  | 'INVALID_SESSION_CURRENCY'
  | 'AMOUNT_TOTAL_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'MISSING_TOTAL_DETAILS'
  | 'INVALID_AMOUNT_DISCOUNT'
  | 'MALFORMED_AUTOMATIC_TAX'
  | 'AUTOMATIC_TAX_INCOMPLETE'
  | 'INVALID_AMOUNT_TAX';

export type NormalizePurchaseMoneyResultV1 =
  | { ok: true; payload: R6PurchaseMoneyEvidencePayloadV1 }
  | { ok: false; reason: NormalizePurchaseMoneyFailureReasonV1 };

export type ValidateCompletedMoneyReplayResultV1 =
  | { ok: true }
  | {
      ok: false;
      reason: 'GROSS_MISMATCH' | 'CURRENCY_MISMATCH';
    };

export type RecordPurchaseMoneyEvidenceRpcParamsV1 = {
  p_stripe_canonical_event_id: string;
  p_payment_intent_id: string;
  p_gross_customer_paid_jpy: number;
  p_currency: 'jpy';
  p_authoritative_tax_amount_present: boolean;
  p_authoritative_purchase_tax_amount_jpy: number | null;
  p_discount_amount_jpy: number;
  p_discount_state: R6PurchaseMoneyDiscountStateV1;
};

export type RecordPurchaseMoneyEvidenceRpcResultV1 = {
  outcome: R6RecordPurchaseMoneyOutcomeV1;
  purchaseMoneyEvidenceId?: string;
};

export type PurchaseMoneySnapshotV1 = {
  evidenceId: string;
  money: R6PurchaseMoneyEvidenceRowV1 | null;
};

const MONEY_RPC_SEMANTIC = new Set([
  'INVALID_INPUT',
  'EVIDENCE_NOT_FOUND',
  'MONEY_PAYLOAD_CONFLICT',
]);

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function classifyRecordPurchaseMoneyEvidenceRpcErrorV1(error: unknown): string {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && MONEY_RPC_SEMANTIC.has(message)) return message;
  return M55_R6_MONEY_RPC_TRANSPORT_ERROR;
}

export function isSafeIntegerInRangeV1(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
  );
}

export function normalizeStripeCurrencyToJpyV1(value: unknown): 'jpy' | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const normalized = value.trim().toLowerCase();
  return normalized === 'jpy' ? 'jpy' : null;
}

function readAutomaticTaxShapeV1(
  automaticTax: unknown,
): { enabled: boolean; status: string | null } | null {
  if (automaticTax === null || automaticTax === undefined || typeof automaticTax !== 'object') {
    return null;
  }
  const enabled = (automaticTax as { enabled?: unknown }).enabled;
  if (typeof enabled !== 'boolean') return null;
  const statusRaw = (automaticTax as { status?: unknown }).status;
  const status = typeof statusRaw === 'string' ? statusRaw : null;
  return { enabled, status };
}

function readTotalDetailsShapeV1(
  totalDetails: unknown,
): { amountDiscount: unknown; amountTax: unknown } | null {
  if (totalDetails === null || totalDetails === undefined || typeof totalDetails !== 'object') {
    return null;
  }
  return {
    amountDiscount: (totalDetails as { amount_discount?: unknown }).amount_discount,
    amountTax: (totalDetails as { amount_tax?: unknown }).amount_tax,
  };
}

export function normalizePurchaseMoneyEvidenceV1(args: {
  paymentIntentAmountReceived: unknown;
  paymentIntentCurrency: unknown;
  sessionAmountTotal: unknown;
  sessionCurrency: unknown;
  automaticTax: unknown;
  totalDetails: unknown;
}): NormalizePurchaseMoneyResultV1 {
  if (
    !isSafeIntegerInRangeV1(
      args.paymentIntentAmountReceived,
      M55_R6_MONEY_GROSS_MIN_JPY,
      M55_R6_MONEY_GROSS_MAX_JPY,
    )
  ) {
    return { ok: false, reason: 'INVALID_PAYMENT_INTENT_AMOUNT_RECEIVED' };
  }

  const paymentCurrency = normalizeStripeCurrencyToJpyV1(args.paymentIntentCurrency);
  if (!paymentCurrency) {
    return { ok: false, reason: 'INVALID_PAYMENT_INTENT_CURRENCY' };
  }

  if (
    !isSafeIntegerInRangeV1(
      args.sessionAmountTotal,
      M55_R6_MONEY_GROSS_MIN_JPY,
      M55_R6_MONEY_GROSS_MAX_JPY,
    )
  ) {
    return { ok: false, reason: 'INVALID_SESSION_AMOUNT_TOTAL' };
  }

  const sessionCurrency = normalizeStripeCurrencyToJpyV1(args.sessionCurrency);
  if (!sessionCurrency) {
    return { ok: false, reason: 'INVALID_SESSION_CURRENCY' };
  }

  if (args.sessionAmountTotal !== args.paymentIntentAmountReceived) {
    return { ok: false, reason: 'AMOUNT_TOTAL_MISMATCH' };
  }

  if (sessionCurrency !== paymentCurrency) {
    return { ok: false, reason: 'CURRENCY_MISMATCH' };
  }

  const totalDetails = readTotalDetailsShapeV1(args.totalDetails);
  if (!totalDetails) {
    return { ok: false, reason: 'MISSING_TOTAL_DETAILS' };
  }

  if (
    !isSafeIntegerInRangeV1(totalDetails.amountDiscount, 0, M55_R6_MONEY_DISCOUNT_MAX_JPY)
  ) {
    return { ok: false, reason: 'INVALID_AMOUNT_DISCOUNT' };
  }

  const discountAmountJpy = totalDetails.amountDiscount;
  const discountState: R6PurchaseMoneyDiscountStateV1 =
    discountAmountJpy === 0 ? 'NONE' : 'PRESENT';

  const automaticTax = readAutomaticTaxShapeV1(args.automaticTax);
  if (!automaticTax) {
    return { ok: false, reason: 'MALFORMED_AUTOMATIC_TAX' };
  }

  let authoritativeTaxAmountPresent: boolean;
  let authoritativePurchaseTaxAmountJpy: number | null;

  if (!automaticTax.enabled) {
    authoritativeTaxAmountPresent = false;
    authoritativePurchaseTaxAmountJpy = null;
  } else {
    if (automaticTax.status !== 'complete') {
      return { ok: false, reason: 'AUTOMATIC_TAX_INCOMPLETE' };
    }
    if (
      !isSafeIntegerInRangeV1(
        totalDetails.amountTax,
        0,
        args.paymentIntentAmountReceived,
      )
    ) {
      return { ok: false, reason: 'INVALID_AMOUNT_TAX' };
    }
    authoritativeTaxAmountPresent = true;
    authoritativePurchaseTaxAmountJpy = totalDetails.amountTax;
  }

  return {
    ok: true,
    payload: {
      grossCustomerPaidJpy: args.paymentIntentAmountReceived,
      currency: 'jpy',
      authoritativeTaxAmountPresent,
      authoritativePurchaseTaxAmountJpy,
      discountAmountJpy,
      discountState,
      sourceCaptureVersion: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
    },
  };
}

export function normalizePurchaseMoneyEvidenceFromProofV1(args: {
  paymentIntentAmountReceived: unknown;
  paymentIntentCurrency: unknown;
  proof: Extract<PaymentIntentCheckoutSessionProofV1, { status: 'PROVIDER_VERIFIED' }>;
}): NormalizePurchaseMoneyResultV1 {
  return normalizePurchaseMoneyEvidenceV1({
    paymentIntentAmountReceived: args.paymentIntentAmountReceived,
    paymentIntentCurrency: args.paymentIntentCurrency,
    sessionAmountTotal: args.proof.sessionAmountTotal,
    sessionCurrency: args.proof.sessionCurrency,
    automaticTax: args.proof.automaticTax,
    totalDetails: args.proof.totalDetails,
  });
}

export function validateCompletedMoneyReplayV1(args: {
  paymentIntentAmountReceived: unknown;
  paymentIntentCurrency: unknown;
  stored: R6PurchaseMoneyEvidencePayloadV1;
}): ValidateCompletedMoneyReplayResultV1 {
  if (
    !isSafeIntegerInRangeV1(
      args.paymentIntentAmountReceived,
      M55_R6_MONEY_GROSS_MIN_JPY,
      M55_R6_MONEY_GROSS_MAX_JPY,
    ) ||
    args.paymentIntentAmountReceived !== args.stored.grossCustomerPaidJpy
  ) {
    return { ok: false, reason: 'GROSS_MISMATCH' };
  }

  const currency = normalizeStripeCurrencyToJpyV1(args.paymentIntentCurrency);
  if (!currency || currency !== args.stored.currency) {
    return { ok: false, reason: 'CURRENCY_MISMATCH' };
  }

  return { ok: true };
}

export function buildRecordPurchaseMoneyEvidenceRpcParamsV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  payload: R6PurchaseMoneyEvidencePayloadV1;
}): RecordPurchaseMoneyEvidenceRpcParamsV1 {
  return {
    p_stripe_canonical_event_id: args.stripeCanonicalEventId,
    p_payment_intent_id: args.paymentIntentId,
    p_gross_customer_paid_jpy: args.payload.grossCustomerPaidJpy,
    p_currency: args.payload.currency,
    p_authoritative_tax_amount_present: args.payload.authoritativeTaxAmountPresent,
    p_authoritative_purchase_tax_amount_jpy: args.payload.authoritativePurchaseTaxAmountJpy,
    p_discount_amount_jpy: args.payload.discountAmountJpy,
    p_discount_state: args.payload.discountState,
  };
}

function parseRecordPurchaseMoneyRpcResult(raw: unknown): RecordPurchaseMoneyEvidenceRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('MONEY_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('MONEY_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome !== 'RECORDED' && outcome !== 'CONVERGED') {
    throw new Error('MONEY_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome,
    purchaseMoneyEvidenceId:
      typeof row.purchase_money_evidence_id === 'string'
        ? row.purchase_money_evidence_id
        : undefined,
  };
}

export async function callRecordPurchaseMoneyEvidenceRpcV1(args: {
  stripeCanonicalEventId: string;
  paymentIntentId: string;
  payload: R6PurchaseMoneyEvidencePayloadV1;
}): Promise<RecordPurchaseMoneyEvidenceRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildRecordPurchaseMoneyEvidenceRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R6_RECORD_PURCHASE_MONEY_EVIDENCE_RPC_NAME, params);
  if (error) {
    throw new Error(classifyRecordPurchaseMoneyEvidenceRpcErrorV1(error));
  }
  return parseRecordPurchaseMoneyRpcResult(data);
}

function mapPurchaseMoneyEvidenceRow(raw: Record<string, unknown>): R6PurchaseMoneyEvidenceRowV1 {
  const discountState = raw.discount_state;
  if (discountState !== 'NONE' && discountState !== 'PRESENT') {
    throw new Error('MONEY_ROW_UNEXPECTED_SHAPE');
  }
  const authoritativeTaxAmountPresent = raw.authoritative_tax_amount_present;
  if (typeof authoritativeTaxAmountPresent !== 'boolean') {
    throw new Error('MONEY_ROW_UNEXPECTED_SHAPE');
  }
  const authoritativePurchaseTaxAmountJpy = raw.authoritative_purchase_tax_amount_jpy;
  if (
    authoritativePurchaseTaxAmountJpy !== null &&
    (typeof authoritativePurchaseTaxAmountJpy !== 'number' ||
      !Number.isSafeInteger(authoritativePurchaseTaxAmountJpy))
  ) {
    throw new Error('MONEY_ROW_UNEXPECTED_SHAPE');
  }
  const grossCustomerPaidJpy = raw.gross_customer_paid_jpy;
  const discountAmountJpy = raw.discount_amount_jpy;
  if (
    typeof raw.purchase_money_evidence_id !== 'string' ||
    typeof raw.canonical_payment_evidence_id !== 'string' ||
    typeof grossCustomerPaidJpy !== 'number' ||
    !Number.isSafeInteger(grossCustomerPaidJpy) ||
    raw.currency !== 'jpy' ||
    typeof discountAmountJpy !== 'number' ||
    !Number.isSafeInteger(discountAmountJpy) ||
    raw.source_capture_version !== M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION
  ) {
    throw new Error('MONEY_ROW_UNEXPECTED_SHAPE');
  }
  return {
    purchaseMoneyEvidenceId: raw.purchase_money_evidence_id,
    canonicalPaymentEvidenceId: raw.canonical_payment_evidence_id,
    grossCustomerPaidJpy,
    currency: 'jpy',
    authoritativeTaxAmountPresent,
    authoritativePurchaseTaxAmountJpy,
    discountAmountJpy,
    discountState,
    sourceCaptureVersion: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
  };
}

export async function loadPurchaseMoneySnapshotByCanonicalIdentityV1(args: {
  db: unknown;
  stripeCanonicalEventId: string;
  paymentIntentId: string;
}): Promise<PurchaseMoneySnapshotV1 | null> {
  const db = args.db as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{
              data: Record<string, unknown> | null;
              error: unknown;
            }>;
          };
        };
      };
    };
  };

  const { data: evidence, error: evidenceError } = await db
    .from('m55_r5_attribution_canonical_payment_evidence')
    .select('evidence_id')
    .eq('stripe_canonical_event_id', args.stripeCanonicalEventId)
    .eq('payment_intent_id', args.paymentIntentId)
    .maybeSingle();

  if (evidenceError) {
    throw new Error(M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED);
  }

  if (!evidence || typeof evidence.evidence_id !== 'string') {
    return null;
  }

  const { data: money, error: moneyError } = await (args.db as any)
    .from('m55_r6_purchase_money_evidence')
    .select(
      'purchase_money_evidence_id, canonical_payment_evidence_id, gross_customer_paid_jpy, currency, authoritative_tax_amount_present, authoritative_purchase_tax_amount_jpy, discount_amount_jpy, discount_state, source_capture_version',
    )
    .eq('canonical_payment_evidence_id', evidence.evidence_id)
    .maybeSingle();

  if (moneyError) {
    throw new Error(M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED);
  }

  return {
    evidenceId: evidence.evidence_id,
    money: money ? mapPurchaseMoneyEvidenceRow(money as Record<string, unknown>) : null,
  };
}

export async function loadPurchaseMoneyEvidenceByEvidenceIdV1(args: {
  db: unknown;
  canonicalPaymentEvidenceId: string;
}): Promise<R6PurchaseMoneyEvidenceRowV1 | null> {
  const { data: money, error } = await (args.db as any)
    .from('m55_r6_purchase_money_evidence')
    .select(
      'purchase_money_evidence_id, canonical_payment_evidence_id, gross_customer_paid_jpy, currency, authoritative_tax_amount_present, authoritative_purchase_tax_amount_jpy, discount_amount_jpy, discount_state, source_capture_version',
    )
    .eq('canonical_payment_evidence_id', args.canonicalPaymentEvidenceId)
    .maybeSingle();

  if (error) {
    throw new Error(M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED);
  }

  return money ? mapPurchaseMoneyEvidenceRow(money as Record<string, unknown>) : null;
}
