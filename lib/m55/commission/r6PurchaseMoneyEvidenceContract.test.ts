import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const {
  M55_R6_PURCHASE_MONEY_EVIDENCE_MIGRATION_FILENAME,
  M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
  M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED,
  M55_R6_RECORD_PURCHASE_MONEY_EVIDENCE_RPC_NAME,
  buildRecordPurchaseMoneyEvidenceRpcParamsV1,
  classifyRecordPurchaseMoneyEvidenceRpcErrorV1,
  isSafeIntegerInRangeV1,
  loadPurchaseMoneyEvidenceByEvidenceIdV1,
  loadPurchaseMoneySnapshotByCanonicalIdentityV1,
  normalizePurchaseMoneyEvidenceV1,
  validateCompletedMoneyReplayV1,
} = await import('./r6PurchaseMoneyEvidenceContract');

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations', M55_R6_PURCHASE_MONEY_EVIDENCE_MIGRATION_FILENAME),
  'utf8',
);

function extractRecordPurchaseMoneyRpcBodyV1(sql: string): string {
  const start = sql.search(/create function public\.m55_r6_record_purchase_money_evidence_v1/i);
  const end = sql.search(/revoke all on function public\.m55_r6_record_purchase_money_evidence_v1/i);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('RPC_BODY_NOT_FOUND');
  }
  return sql.slice(start, end);
}

function baseSessionEconomic(overrides: Record<string, unknown> = {}) {
  return {
    sessionAmountTotal: 1000,
    sessionCurrency: 'jpy',
    automaticTax: { enabled: false, status: null },
    totalDetails: { amount_discount: 0, amount_tax: 0 },
    ...overrides,
  };
}

describe('r6PurchaseMoneyEvidenceContract — SQL static contract', () => {
  it('defines the money evidence table with exact 1:1 FK and economic checks', () => {
    assert.match(SQL, /create table public\.m55_r6_purchase_money_evidence/i);
    assert.match(
      SQL,
      /canonical_payment_evidence_id uuid not null unique[\s\S]*references public\.m55_r5_attribution_canonical_payment_evidence\(evidence_id\)/i,
    );
    assert.match(SQL, /on delete restrict/i);
    assert.match(SQL, /gross_customer_paid_jpy bigint not null check/i);
    assert.match(SQL, /gross_customer_paid_jpy >= 1[\s\S]*gross_customer_paid_jpy <= 99999999/i);
    assert.match(SQL, /currency text not null check \(currency = 'jpy'\)/i);
    assert.match(SQL, /authoritative_tax_amount_present boolean not null/i);
    assert.match(SQL, /discount_state = 'NONE'[\s\S]*discount_amount_jpy = 0/i);
    assert.match(SQL, /discount_state = 'PRESENT'[\s\S]*discount_amount_jpy > 0/i);
    assert.match(
      SQL,
      /source_capture_version text not null check \(source_capture_version = 'r6_purchase_money_v1'\)/i,
    );
    assert.equal(SQL.includes('commission_amount'), false);
    assert.equal(SQL.includes('commission_rate'), false);
    assert.equal(SQL.includes('release_at'), false);
  });

  it('enforces append-only, truncate rejection, RLS, and minimal service_role grants', () => {
    assert.match(SQL, /PURCHASE_MONEY_EVIDENCE_APPEND_ONLY/);
    assert.match(SQL, /before update or delete on public\.m55_r6_purchase_money_evidence/i);
    assert.match(SQL, /PURCHASE_MONEY_EVIDENCE_NO_TRUNCATE/);
    assert.match(SQL, /before truncate on public\.m55_r6_purchase_money_evidence/i);
    assert.match(SQL, /enable row level security/i);
    assert.match(
      SQL,
      /revoke all on public\.m55_r6_purchase_money_evidence from public, anon, authenticated, service_role/i,
    );
    assert.match(SQL, /grant select, insert on public\.m55_r6_purchase_money_evidence to service_role/i);
    assert.equal(/grant all on public\.m55_r6_purchase_money_evidence/i.test(SQL), false);
  });

  it('defines the record RPC with service_role execute only and converge semantics', () => {
    assert.match(SQL, /create function public\.m55_r6_record_purchase_money_evidence_v1/i);
    assert.match(SQL, /outcome', 'RECORDED'/);
    assert.match(SQL, /outcome', 'CONVERGED'/);
    assert.match(SQL, /MONEY_PAYLOAD_CONFLICT/);
    assert.match(SQL, /EVIDENCE_NOT_FOUND/);
    assert.match(
      SQL,
      /grant execute on function public\.m55_r6_record_purchase_money_evidence_v1\([\s\S]*\) to service_role/i,
    );
    assert.match(
      SQL,
      /revoke all on function public\.m55_r6_record_purchase_money_evidence_v1\([\s\S]*\) from public, anon, authenticated/i,
    );
  });

  it('reconciles RPC row-lock privilege with append-only SELECT+INSERT grants', () => {
    const rpcBody = extractRecordPurchaseMoneyRpcBodyV1(SQL);

    assert.match(rpcBody, /security invoker/i);
    assert.match(SQL, /grant select, insert on public\.m55_r6_purchase_money_evidence to service_role/i);
    assert.equal(/grant\s+update\s+on\s+public\.m55_r6_purchase_money_evidence/i.test(SQL), false);
    assert.equal(/grant all on public\.m55_r6_purchase_money_evidence/i.test(SQL), false);
    assert.equal(/\bfor update\b/i.test(rpcBody), false);
    assert.equal(/\bfor no key update\b/i.test(rpcBody), false);
    assert.equal(/\bupdate\s+public\.m55_r6_purchase_money_evidence\b/i.test(rpcBody), false);
    assert.match(rpcBody, /when unique_violation then/i);
    assert.match(
      rpcBody,
      /from public\.m55_r6_purchase_money_evidence[\s\S]*where canonical_payment_evidence_id = v_evidence_id/i,
    );
    assert.match(rpcBody, /outcome', 'RECORDED'/);
    assert.match(rpcBody, /outcome', 'CONVERGED'/);
    assert.match(rpcBody, /MONEY_PAYLOAD_CONFLICT/);
    assert.match(SQL, /canonical_payment_evidence_id uuid not null unique/i);
    assert.equal(/on conflict do update/i.test(rpcBody), false);
  });
});

describe('r6PurchaseMoneyEvidenceContract — economic extraction', () => {
  it('accepts valid JPY gross/session match with explicit automatic_tax disabled', () => {
    const result = normalizePurchaseMoneyEvidenceV1({
      paymentIntentAmountReceived: 1480,
      paymentIntentCurrency: 'jpy',
      sessionAmountTotal: 1480,
      sessionCurrency: 'JPY',
      automaticTax: { enabled: false },
      totalDetails: { amount_discount: 0, amount_tax: 0 },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.payload, {
        grossCustomerPaidJpy: 1480,
        currency: 'jpy',
        authoritativeTaxAmountPresent: false,
        authoritativePurchaseTaxAmountJpy: null,
        discountAmountJpy: 0,
        discountState: 'NONE',
        sourceCaptureVersion: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
      });
    }
  });

  it('accepts automatic_tax complete with zero tax and positive discount', () => {
    const result = normalizePurchaseMoneyEvidenceV1({
      paymentIntentAmountReceived: 900,
      paymentIntentCurrency: 'jpy',
      sessionAmountTotal: 900,
      sessionCurrency: 'jpy',
      automaticTax: { enabled: true, status: 'complete' },
      totalDetails: { amount_discount: 100, amount_tax: 0 },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.authoritativeTaxAmountPresent, true);
      assert.equal(result.payload.authoritativePurchaseTaxAmountJpy, 0);
      assert.equal(result.payload.discountState, 'PRESENT');
      assert.equal(result.payload.discountAmountJpy, 100);
    }
  });

  it('accepts automatic_tax complete with positive tax', () => {
    const result = normalizePurchaseMoneyEvidenceV1({
      paymentIntentAmountReceived: 1100,
      paymentIntentCurrency: 'jpy',
      ...baseSessionEconomic({
        sessionAmountTotal: 1100,
        automaticTax: { enabled: true, status: 'complete' },
        totalDetails: { amount_discount: 0, amount_tax: 100 },
      }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.authoritativePurchaseTaxAmountJpy, 100);
    }
  });

  it('fails closed on non-JPY, amount mismatch, unsafe integers, and malformed tax/discount', () => {
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'usd',
        ...baseSessionEconomic(),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({ sessionAmountTotal: 999 }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1.5,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({ sessionAmountTotal: 1.5 }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({ totalDetails: null }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({ totalDetails: { amount_discount: -1, amount_tax: 0 } }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({ automaticTax: null }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({
          automaticTax: { enabled: true, status: 'requires_location_inputs' },
        }),
      }).ok,
      false,
    );
    assert.equal(
      normalizePurchaseMoneyEvidenceV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'jpy',
        ...baseSessionEconomic({
          automaticTax: { enabled: true, status: 'complete' },
          totalDetails: { amount_discount: 0, amount_tax: null },
        }),
      }).ok,
      false,
    );
  });

  it('validates completed replay against stored gross and currency only', () => {
    const stored = {
      grossCustomerPaidJpy: 1000,
      currency: 'jpy' as const,
      authoritativeTaxAmountPresent: false,
      authoritativePurchaseTaxAmountJpy: null,
      discountAmountJpy: 0,
      discountState: 'NONE' as const,
      sourceCaptureVersion: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
    };
    assert.deepEqual(
      validateCompletedMoneyReplayV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'JPY',
        stored,
      }),
      { ok: true },
    );
    assert.equal(
      validateCompletedMoneyReplayV1({
        paymentIntentAmountReceived: 999,
        paymentIntentCurrency: 'jpy',
        stored,
      }).ok,
      false,
    );
    assert.equal(
      validateCompletedMoneyReplayV1({
        paymentIntentAmountReceived: 1000,
        paymentIntentCurrency: 'usd',
        stored,
      }).ok,
      false,
    );
  });
});

describe('r6PurchaseMoneyEvidenceContract — RPC params and errors', () => {
  it('builds RPC params from normalized payload', () => {
    const params = buildRecordPurchaseMoneyEvidenceRpcParamsV1({
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
      payload: {
        grossCustomerPaidJpy: 1000,
        currency: 'jpy',
        authoritativeTaxAmountPresent: true,
        authoritativePurchaseTaxAmountJpy: 90,
        discountAmountJpy: 0,
        discountState: 'NONE',
        sourceCaptureVersion: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
      },
    });
    assert.equal(params.p_stripe_canonical_event_id, 'evt_1');
    assert.equal(params.p_payment_intent_id, 'pi_1');
    assert.equal(params.p_gross_customer_paid_jpy, 1000);
    assert.equal(params.p_currency, 'jpy');
    assert.equal(params.p_authoritative_tax_amount_present, true);
    assert.equal(params.p_authoritative_purchase_tax_amount_jpy, 90);
    assert.equal(params.p_discount_state, 'NONE');
    assert.equal(M55_R6_RECORD_PURCHASE_MONEY_EVIDENCE_RPC_NAME, 'm55_r6_record_purchase_money_evidence_v1');
  });

  it('classifies semantic RPC failures separately from transport', () => {
    assert.equal(
      classifyRecordPurchaseMoneyEvidenceRpcErrorV1({ message: 'MONEY_PAYLOAD_CONFLICT' }),
      'MONEY_PAYLOAD_CONFLICT',
    );
    assert.equal(
      classifyRecordPurchaseMoneyEvidenceRpcErrorV1({ message: 'network down' }),
      'MONEY_RPC_TRANSPORT_ERROR',
    );
  });

  it('uses safe integer range helper for capture bounds', () => {
    assert.equal(isSafeIntegerInRangeV1(1, 1, 99_999_999), true);
    assert.equal(isSafeIntegerInRangeV1(0, 1, 99_999_999), false);
    assert.equal(isSafeIntegerInRangeV1(Number.MAX_SAFE_INTEGER + 1, 1, 99_999_999), false);
  });
});

function makeMoneyEvidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    purchase_money_evidence_id: 'pm_1',
    canonical_payment_evidence_id: 'ev_1',
    gross_customer_paid_jpy: 1000,
    currency: 'jpy',
    authoritative_tax_amount_present: false,
    authoritative_purchase_tax_amount_jpy: null,
    discount_amount_jpy: 0,
    discount_state: 'NONE',
    source_capture_version: M55_R6_PURCHASE_MONEY_SOURCE_CAPTURE_VERSION,
    ...overrides,
  };
}

function makeSnapshotDb(args: {
  r5Result: { data: unknown; error: unknown };
  r6Result?: { data: unknown; error: unknown };
}) {
  return {
    from: (table: string) => {
      if (table === 'm55_r5_attribution_canonical_payment_evidence') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => args.r5Result,
              }),
            }),
          }),
        };
      }
      if (table === 'm55_r6_purchase_money_evidence') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => args.r6Result ?? { data: null, error: null },
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe('r6PurchaseMoneyEvidenceContract — snapshot read fail-closed', () => {
  it('returns null when canonical evidence row is genuinely absent', async () => {
    const snapshot = await loadPurchaseMoneySnapshotByCanonicalIdentityV1({
      db: makeSnapshotDb({ r5Result: { data: null, error: null } }),
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
    });
    assert.equal(snapshot, null);
  });

  it('throws stable snapshot-read error when canonical evidence read fails', async () => {
    await assert.rejects(
      () =>
        loadPurchaseMoneySnapshotByCanonicalIdentityV1({
          db: makeSnapshotDb({
            r5Result: { data: null, error: { message: 'db down' } },
          }),
          stripeCanonicalEventId: 'evt_1',
          paymentIntentId: 'pi_1',
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED,
    );
  });

  it('returns incomplete snapshot when R5 exists and money row is absent', async () => {
    const snapshot = await loadPurchaseMoneySnapshotByCanonicalIdentityV1({
      db: makeSnapshotDb({
        r5Result: { data: { evidence_id: 'ev_1' }, error: null },
        r6Result: { data: null, error: null },
      }),
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
    });
    assert.deepEqual(snapshot, { evidenceId: 'ev_1', money: null });
  });

  it('throws stable snapshot-read error when money row read fails', async () => {
    await assert.rejects(
      () =>
        loadPurchaseMoneySnapshotByCanonicalIdentityV1({
          db: makeSnapshotDb({
            r5Result: { data: { evidence_id: 'ev_1' }, error: null },
            r6Result: { data: null, error: { message: 'db down' } },
          }),
          stripeCanonicalEventId: 'evt_1',
          paymentIntentId: 'pi_1',
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED,
    );
  });

  it('returns completed mapped snapshot when R5 and R6 rows exist', async () => {
    const snapshot = await loadPurchaseMoneySnapshotByCanonicalIdentityV1({
      db: makeSnapshotDb({
        r5Result: { data: { evidence_id: 'ev_1' }, error: null },
        r6Result: { data: makeMoneyEvidenceRow(), error: null },
      }),
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
    });
    assert.equal(snapshot?.evidenceId, 'ev_1');
    assert.equal(snapshot?.money?.purchaseMoneyEvidenceId, 'pm_1');
    assert.equal(snapshot?.money?.grossCustomerPaidJpy, 1000);
    assert.equal(snapshot?.money?.currency, 'jpy');
  });

  it('loadPurchaseMoneyEvidenceByEvidenceIdV1 returns null without row and throws on DB error', async () => {
    const absent = await loadPurchaseMoneyEvidenceByEvidenceIdV1({
      db: makeSnapshotDb({ r5Result: { data: null, error: null }, r6Result: { data: null, error: null } }),
      canonicalPaymentEvidenceId: 'ev_1',
    });
    assert.equal(absent, null);

    await assert.rejects(
      () =>
        loadPurchaseMoneyEvidenceByEvidenceIdV1({
          db: makeSnapshotDb({
            r5Result: { data: null, error: null },
            r6Result: { data: null, error: { message: 'db down' } },
          }),
          canonicalPaymentEvidenceId: 'ev_1',
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === M55_R6_PURCHASE_MONEY_SNAPSHOT_READ_FAILED,
    );
  });
});
