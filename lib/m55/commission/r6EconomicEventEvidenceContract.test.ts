import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type Stripe from 'stripe';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const {
  M55_R6_DISPUTE_ECONOMIC_EVENT_TYPES,
  M55_R6_DISPUTE_ECONOMIC_SOURCE_CAPTURE_VERSION,
  M55_R6_ECONOMIC_RPC_TRANSPORT_ERROR,
  M55_R6_REFUND_DISPUTE_ECONOMIC_EVIDENCE_MIGRATION_FILENAME,
  M55_R6_REFUND_ECONOMIC_EVENT_TYPES,
  M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION,
  M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME,
  M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME,
  callRecordDisputeEconomicEvidenceRpcV1,
  callRecordRefundEconomicEvidenceRpcV1,
  classifyRecordEconomicEvidenceRpcErrorV1,
  isR6DisputeEconomicEventTypeV1,
  isR6EconomicEvidenceEventTypeV1,
  isR6RefundEconomicEventTypeV1,
  normalizeDisputeEconomicEventV1,
  normalizeRefundEconomicEventV1,
} = await import('./r6EconomicEventEvidenceContract');

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations', M55_R6_REFUND_DISPUTE_ECONOMIC_EVIDENCE_MIGRATION_FILENAME),
  'utf8',
);
const WEBHOOK = readFileSync(join(process.cwd(), 'app/api/stripe/webhook/route.ts'), 'utf8');
const TEST_SOURCE = readFileSync(
  join(process.cwd(), 'lib/m55/commission/r6EconomicEventEvidenceContract.test.ts'),
  'utf8',
);
const CONTRACT_SOURCE = readFileSync(
  join(process.cwd(), 'lib/m55/commission/r6EconomicEventEvidenceContract.ts'),
  'utf8',
);
const FROZEN_HANDLE_CHARGE_REFUNDED_BODY_SHA =
  '8ab2356585150e209b2749b053277705d26f861e11a65c0c61b37e8a0574fc66';

function extractRpcBody(sql: string, fnName: string): string {
  const start = sql.search(new RegExp(`create function public\\.${fnName}`, 'i'));
  const end = sql.search(new RegExp(`revoke all on function public\\.${fnName}`, 'i'));
  if (start < 0 || end < 0 || end <= start) throw new Error(`RPC_BODY_NOT_FOUND:${fnName}`);
  return sql.slice(start, end);
}

function extractHandleChargeRefundedBody(source: string): string {
  const match = source.match(/async function handleChargeRefunded\([\s\S]*?\n\}/);
  if (!match) throw new Error('handleChargeRefunded not found');
  return match[0];
}

function refundEvent(overrides: Record<string, unknown> = {}): Stripe.Event {
  const base = {
    id: 'evt_refund_1',
    type: 'refund.created',
    created: 1_700_000_000,
    data: {
      object: {
        id: 're_1',
        amount: 1000,
        currency: 'jpy',
        payment_intent: 'pi_1',
        status: 'succeeded',
        created: 1_700_000_000,
      },
    },
  };
  return { ...base, ...overrides } as Stripe.Event;
}

function disputeEvent(
  type: string,
  overrides: Record<string, unknown> = {},
): Stripe.Event {
  const base = {
    id: 'evt_dispute_1',
    type,
    created: 1_700_000_000,
    data: {
      object: {
        id: 'dp_1',
        amount: 1000,
        currency: 'jpy',
        payment_intent: 'pi_1',
        status: 'needs_response',
        created: 1_700_000_000,
      },
    },
  };
  return { ...base, ...overrides } as Stripe.Event;
}

function makeRefundRpcDb(args: {
  purchaseMoney?: { purchase_money_evidence_id: string; currency: string } | null;
  existing?: Record<string, unknown> | null;
  insertError?: unknown;
}) {
  return {
    rpc: async (_fn: string, _params: Record<string, unknown>) => {
      if (!args.purchaseMoney) {
        return { data: null, error: { message: 'PURCHASE_MONEY_EVIDENCE_NOT_FOUND' } };
      }
      if (args.existing) {
        const row = args.existing;
        const same =
          row.stripe_event_type === _params.p_stripe_event_type &&
          row.stripe_event_created_at_ms === _params.p_stripe_event_created_at_ms &&
          row.provider_refund_id === _params.p_provider_refund_id &&
          row.provider_refund_created_at_ms === _params.p_provider_refund_created_at_ms &&
          row.payment_intent_id === _params.p_payment_intent_id &&
          row.amount_jpy === _params.p_amount_jpy &&
          row.currency === _params.p_currency &&
          row.refund_status === _params.p_refund_status;
        if (same) {
          return {
            data: {
              ok: true,
              status: 'succeeded',
              outcome: 'CONVERGED',
              refund_economic_evidence_id: 'rfe_1',
            },
            error: null,
          };
        }
        return { data: null, error: { message: 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT' } };
      }
      if (args.insertError) {
        return { data: null, error: args.insertError };
      }
      return {
        data: {
          ok: true,
          status: 'succeeded',
          outcome: 'RECORDED',
          refund_economic_evidence_id: 'rfe_1',
        },
        error: null,
      };
    },
  };
}

describe('r6EconomicEventEvidenceContract — refund normalization', () => {
  it('accepts refund.created and refund.updated with required provider fields', () => {
    for (const type of M55_R6_REFUND_ECONOMIC_EVENT_TYPES) {
      const result = normalizeRefundEconomicEventV1(refundEvent({ type }));
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.payload.stripeEventType, type);
        assert.equal(result.payload.amountJpy, 1000);
        assert.equal(result.payload.currency, 'jpy');
        assert.equal(result.payload.paymentIntentId, 'pi_1');
        assert.equal(result.payload.refundStatus, 'succeeded');
        assert.equal(result.payload.sourceCaptureVersion, M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION);
      }
    }
  });

  it('fails closed on missing id, amount, currency, payment_intent, status, and created', () => {
    assert.equal(normalizeRefundEconomicEventV1(refundEvent({ id: '' })).ok, false);
    assert.equal(
      normalizeRefundEconomicEventV1(
        refundEvent({
          data: { object: { id: 're_1', amount: 0, currency: 'jpy', payment_intent: 'pi_1', status: 'succeeded', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeRefundEconomicEventV1(
        refundEvent({
          data: { object: { id: 're_1', amount: 1000, currency: 'usd', payment_intent: 'pi_1', status: 'succeeded', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeRefundEconomicEventV1(
        refundEvent({
          data: { object: { id: 're_1', amount: 1000, currency: 'jpy', payment_intent: null, status: 'succeeded', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeRefundEconomicEventV1(
        refundEvent({
          data: { object: { id: 're_1', amount: 1000, currency: 'jpy', payment_intent: 'pi_1', status: '', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeRefundEconomicEventV1(
        refundEvent({
          data: { object: { id: 're_1', amount: 1000, currency: 'jpy', payment_intent: 'pi_1', status: 'succeeded', created: null } },
        }),
      ).ok,
      false,
    );
  });
});

describe('r6EconomicEventEvidenceContract — dispute normalization', () => {
  it('accepts each of the five dispute event types', () => {
    for (const type of M55_R6_DISPUTE_ECONOMIC_EVENT_TYPES) {
      assert.equal(isR6DisputeEconomicEventTypeV1(type), true);
      const result = normalizeDisputeEconomicEventV1(disputeEvent(type));
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.payload.stripeEventType, type);
        assert.equal(result.payload.disputeStatus, 'needs_response');
        assert.equal(result.payload.sourceCaptureVersion, M55_R6_DISPUTE_ECONOMIC_SOURCE_CAPTURE_VERSION);
      }
    }
  });

  it('rejects unsupported dispute events and malformed provider fields', () => {
    assert.equal(normalizeDisputeEconomicEventV1(disputeEvent('charge.dispute.funds_reinstated', { type: 'charge.dispute.opened' })).ok, false);
    assert.equal(
      normalizeDisputeEconomicEventV1(
        disputeEvent('charge.dispute.created', {
          data: { object: { id: '', amount: 1000, currency: 'jpy', payment_intent: 'pi_1', status: 'needs_response', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeDisputeEconomicEventV1(
        disputeEvent('charge.dispute.created', {
          data: { object: { id: 'dp_1', amount: null, currency: 'jpy', payment_intent: 'pi_1', status: 'needs_response', created: 1 } },
        }),
      ).ok,
      false,
    );
    assert.equal(
      normalizeDisputeEconomicEventV1(
        disputeEvent('charge.dispute.created', {
          data: { object: { id: 'dp_1', amount: 1000, currency: 'eur', payment_intent: 'pi_1', status: 'needs_response', created: 1 } },
        }),
      ).ok,
      false,
    );
  });
});

describe('r6EconomicEventEvidenceContract — SQL static contract', () => {
  const refundRpc = extractRpcBody(SQL, 'm55_r6_record_refund_economic_evidence_v1');
  const disputeRpc = extractRpcBody(SQL, 'm55_r6_record_dispute_economic_evidence_v1');

  it('defines two append-only evidence tables with purchase-money FK and stripe_event_id UNIQUE', () => {
    assert.match(SQL, /create table public\.m55_r6_refund_economic_evidence/i);
    assert.match(SQL, /create table public\.m55_r6_dispute_economic_evidence/i);
    assert.match(
      SQL,
      /purchase_money_evidence_id uuid not null[\s\S]*references public\.m55_r6_purchase_money_evidence\(purchase_money_evidence_id\)/gi,
    );
    assert.match(SQL, /stripe_event_id text not null unique/gi);
    assert.equal(/unique\s*\(\s*provider_refund_id\s*,\s*refund_status\s*\)/i.test(SQL), false);
    assert.equal(/unique\s*\(\s*provider_dispute_id\s*,/i.test(SQL), false);
    assert.equal(SQL.includes('commission_amount'), false);
    assert.equal(SQL.includes('release_at'), false);
    assert.equal(SQL.includes('payout'), false);
  });

  it('enforces append-only, truncate rejection, RLS, and service_role SELECT+INSERT only', () => {
    assert.match(SQL, /before update or delete on public\.m55_r6_refund_economic_evidence/i);
    assert.match(SQL, /before update or delete on public\.m55_r6_dispute_economic_evidence/i);
    assert.match(SQL, /before truncate on public\.m55_r6_refund_economic_evidence/i);
    assert.match(SQL, /before truncate on public\.m55_r6_dispute_economic_evidence/i);
    assert.match(SQL, /enable row level security/i);
    assert.match(SQL, /grant select, insert on public\.m55_r6_refund_economic_evidence to service_role/i);
    assert.match(SQL, /grant select, insert on public\.m55_r6_dispute_economic_evidence to service_role/i);
    assert.equal(/grant\s+update\s+on\s+public\.m55_r6_refund_economic_evidence/i.test(SQL), false);
    assert.equal(/grant all on public\.m55_r6_refund_economic_evidence/i.test(SQL), false);
  });

  it('defines SECURITY INVOKER RPCs without row locks or money-table UPDATE', () => {
    assert.match(refundRpc, /security invoker/i);
    assert.match(disputeRpc, /security invoker/i);
    assert.equal(/\bfor update\b/i.test(refundRpc), false);
    assert.equal(/\bfor update\b/i.test(disputeRpc), false);
    assert.equal(/\bupdate\s+public\.m55_r6_purchase_money_evidence\b/i.test(refundRpc), false);
    assert.match(refundRpc, /when unique_violation then/i);
    assert.match(disputeRpc, /when unique_violation then/i);
    assert.match(refundRpc, /outcome', 'RECORDED'/);
    assert.match(refundRpc, /outcome', 'CONVERGED'/);
    assert.match(refundRpc, /ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT/);
    assert.match(
      SQL,
      /grant execute on function public\.m55_r6_record_refund_economic_evidence_v1\([\s\S]*\) to service_role/i,
    );
    assert.equal(M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME, 'm55_r6_record_refund_economic_evidence_v1');
    assert.equal(M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME, 'm55_r6_record_dispute_economic_evidence_v1');
  });
});

describe('r6EconomicEventEvidenceContract — RPC contract', () => {
  const payload = {
    stripeEventId: 'evt_1',
    stripeEventType: 'refund.created' as const,
    stripeEventCreatedAtMs: 1_700_000_000_000,
    providerRefundId: 're_1',
    providerRefundCreatedAtMs: 1_700_000_000_000,
    paymentIntentId: 'pi_1',
    amountJpy: 1000,
    currency: 'jpy' as const,
    refundStatus: 'succeeded',
    sourceCaptureVersion: M55_R6_REFUND_ECONOMIC_SOURCE_CAPTURE_VERSION,
  };

  it('classifies semantic RPC failures separately from transport', () => {
    assert.equal(
      classifyRecordEconomicEvidenceRpcErrorV1({ message: 'PURCHASE_MONEY_EVIDENCE_NOT_FOUND' }),
      'PURCHASE_MONEY_EVIDENCE_NOT_FOUND',
    );
    assert.equal(
      classifyRecordEconomicEvidenceRpcErrorV1({ message: 'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT' }),
      'ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT',
    );
    assert.equal(
      classifyRecordEconomicEvidenceRpcErrorV1({ message: 'network down' }),
      M55_R6_ECONOMIC_RPC_TRANSPORT_ERROR,
    );
  });

  it('records, converges, and conflicts on exact stripe_event_id replay', async () => {
    const recorded = await callRecordRefundEconomicEvidenceRpcV1({
      db: makeRefundRpcDb({ purchaseMoney: { purchase_money_evidence_id: 'pme_1', currency: 'jpy' } }),
      payload,
    });
    assert.equal(recorded.outcome, 'RECORDED');

    const converged = await callRecordRefundEconomicEvidenceRpcV1({
      db: makeRefundRpcDb({
        purchaseMoney: { purchase_money_evidence_id: 'pme_1', currency: 'jpy' },
        existing: {
          stripe_event_type: payload.stripeEventType,
          stripe_event_created_at_ms: payload.stripeEventCreatedAtMs,
          provider_refund_id: payload.providerRefundId,
          provider_refund_created_at_ms: payload.providerRefundCreatedAtMs,
          payment_intent_id: payload.paymentIntentId,
          amount_jpy: payload.amountJpy,
          currency: payload.currency,
          refund_status: payload.refundStatus,
        },
      }),
      payload,
    });
    assert.equal(converged.outcome, 'CONVERGED');

    await assert.rejects(
      () =>
        callRecordRefundEconomicEvidenceRpcV1({
          db: makeRefundRpcDb({
            purchaseMoney: { purchase_money_evidence_id: 'pme_1', currency: 'jpy' },
            existing: {
              stripe_event_type: payload.stripeEventType,
              stripe_event_created_at_ms: payload.stripeEventCreatedAtMs,
              provider_refund_id: payload.providerRefundId,
              provider_refund_created_at_ms: payload.providerRefundCreatedAtMs,
              payment_intent_id: payload.paymentIntentId,
              amount_jpy: 999,
              currency: payload.currency,
              refund_status: payload.refundStatus,
            },
          }),
          payload,
        }),
      /ECONOMIC_EVIDENCE_PAYLOAD_CONFLICT/,
    );

    await assert.rejects(
      () => callRecordRefundEconomicEvidenceRpcV1({ db: makeRefundRpcDb({ purchaseMoney: null }), payload }),
      /PURCHASE_MONEY_EVIDENCE_NOT_FOUND/,
    );
  });

  it('preserves distinct Event.id rows for same provider object/status without monotonic rejection', () => {
    assert.equal(isR6EconomicEvidenceEventTypeV1('refund.updated'), true);
    assert.equal(isR6RefundEconomicEventTypeV1('refund.created'), true);
    assert.equal(isR6EconomicEvidenceEventTypeV1('checkout.session.completed'), false);
    assert.equal(SQL.includes('monotonic'), false);
  });
});

describe('r6EconomicEventEvidenceContract — PATCH-3 shared advisory lock', () => {
  const ledgerSql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260927200000_m55_r6_commission_ledger_v1.sql'),
    'utf8',
  );

  function extractLedgerRpcBody(fnName: string): string {
    const start = ledgerSql.search(new RegExp(`create function public\\.${fnName}`, 'i'));
    const end = ledgerSql.search(new RegExp(`revoke all on function public\\.${fnName}`, 'i'));
    if (start < 0 || end < 0 || end <= start) throw new Error(`LEDGER_RPC_BODY_NOT_FOUND:${fnName}`);
    return ledgerSql.slice(start, end);
  }

  const commissionLockExpr = "hashtextextended('m55_r6_commission:' || p_payment_intent_id, 0)";

  for (const fnName of [
    M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME,
    M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME,
  ]) {
    it(`${fnName} acquires transaction advisory lock before evidence INSERT`, () => {
      const body = extractRpcBody(SQL, fnName);
      const lockIdx = body.indexOf('pg_advisory_xact_lock');
      const insertIdx = body.indexOf('insert into public.m55_r6_');
      assert.ok(lockIdx > 0);
      assert.ok(insertIdx > lockIdx);
      assert.match(body, /pg_advisory_xact_lock/);
      assert.match(body, /m55_r6_commission:/);
      assert.equal(body.includes(commissionLockExpr), true);
      assert.equal(/pg_advisory_lock\s*\(/i.test(body), false);
      assert.equal(/pg_advisory_unlock/i.test(body), false);
    });
  }

  it('A2 writers use the same lock namespace expression as ledger reconcile', () => {
    const reconcileBody = extractLedgerRpcBody('m55_r6_reconcile_commission_v1');
    const refundBody = extractRpcBody(SQL, M55_R6_RECORD_REFUND_ECONOMIC_EVIDENCE_RPC_NAME);
    const disputeBody = extractRpcBody(SQL, M55_R6_RECORD_DISPUTE_ECONOMIC_EVIDENCE_RPC_NAME);
    assert.match(reconcileBody, /pg_advisory_xact_lock/);
    assert.match(reconcileBody, /m55_r6_commission:/);
    assert.equal(refundBody.includes(commissionLockExpr), true);
    assert.equal(disputeBody.includes(commissionLockExpr), true);
    assert.equal(reconcileBody.includes(commissionLockExpr), true);
  });
});

describe('r6EconomicEventEvidenceContract — webhook route contract', () => {
  it('dispatches A2 events before existing-event shortcut and generic soft-200', () => {
    const postIdx = WEBHOOK.indexOf('export async function POST');
    const postBody = WEBHOOK.slice(postIdx);
    const a2Idx = postBody.indexOf('isR6EconomicEvidenceEventTypeV1(event.type)');
    const existingIdx = postBody.indexOf('if (existing)');
    const softIdx = postBody.indexOf('if (!ONE_TIME_KEY_EVENTS.has(event.type ?? \'\'))');
    assert.equal(a2Idx > 0 && a2Idx < existingIdx, true);
    assert.equal(a2Idx < softIdx, true);
    assert.match(WEBHOOK, /handleR6EconomicEvidenceEventV1/);
    assert.match(WEBHOOK, /normalizeRefundEconomicEventV1/);
    assert.match(WEBHOOK, /normalizeDisputeEconomicEventV1/);
    assert.match(WEBHOOK, /callRecordRefundEconomicEvidenceRpcV1/);
    assert.match(WEBHOOK, /callRecordDisputeEconomicEvidenceRpcV1/);
  });

  it('writes economic evidence before stripe_events completion and allows 23505 after success', () => {
    const handler = WEBHOOK.slice(WEBHOOK.indexOf('async function handleR6EconomicEvidenceEventV1'));
    const rpcIdx = handler.indexOf('callRecordRefundEconomicEvidenceRpcV1');
    const insertIdx = handler.indexOf("from('stripe_events').insert");
    assert.equal(rpcIdx > 0 && rpcIdx < insertIdx, true);
    assert.match(handler, /insertErr\.code !== '23505'/);
    assert.match(handler, /status: 500/);
    assert.equal(handler.includes('stripe.refunds.retrieve'), false);
    assert.equal(handler.includes('stripe.disputes.retrieve'), false);
  });

  it('has no external fixture dependency in tracked test source', () => {
    const externalFixtureMarker = 'M55_R6_' + 'P0_A2_PRE';
    const downloadsMarker = 'Down' + 'loads';
    assert.equal(TEST_SOURCE.includes(externalFixtureMarker), false);
    const readFileCalls = TEST_SOURCE.match(/readFileSync\([^)]+\)/g) ?? [];
    for (const call of readFileCalls) {
      assert.match(call, /process\.cwd\(\)/);
      assert.equal(call.includes(downloadsMarker), false);
      assert.equal(call.includes('P0_' + 'A2_PRE'), false);
    }
  });

  it('keeps handleChargeRefunded body at frozen pre-P0-A2 SHA without external snapshot', () => {
    const body = extractHandleChargeRefundedBody(WEBHOOK);
    const hash = createHash('sha256').update(body).digest('hex');
    assert.equal(hash, FROZEN_HANDLE_CHARGE_REFUNDED_BODY_SHA);
  });
});

describe('r6EconomicEventEvidenceContract — safe timestamp normalization', () => {
  const maxSafeSeconds = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
  const overflowSeconds = maxSafeSeconds + 1;

  function refundObject(created: unknown) {
    return {
      id: 're_1',
      amount: 1000,
      currency: 'jpy',
      payment_intent: 'pi_1',
      status: 'succeeded',
      created,
    };
  }

  function disputeObject(created: unknown) {
    return {
      id: 'dp_1',
      amount: 1000,
      currency: 'jpy',
      payment_intent: 'pi_1',
      status: 'needs_response',
      created,
    };
  }

  it('accepts safe provider object.created timestamps for refund and dispute', () => {
    const zeroRefund = normalizeRefundEconomicEventV1(
      refundEvent({ data: { object: refundObject(0) } }),
    );
    assert.equal(zeroRefund.ok, true);
    if (zeroRefund.ok) assert.equal(zeroRefund.payload.providerRefundCreatedAtMs, 0);

    const ordinaryRefund = normalizeRefundEconomicEventV1(refundEvent());
    assert.equal(ordinaryRefund.ok, true);
    if (ordinaryRefund.ok) {
      assert.equal(ordinaryRefund.payload.providerRefundCreatedAtMs, 1_700_000_000_000);
    }

    const maxRefund = normalizeRefundEconomicEventV1(
      refundEvent({ data: { object: refundObject(maxSafeSeconds) } }),
    );
    assert.equal(maxRefund.ok, true);
    if (maxRefund.ok) {
      assert.equal(maxRefund.payload.providerRefundCreatedAtMs, maxSafeSeconds * 1000);
    }

    const maxDispute = normalizeDisputeEconomicEventV1(
      disputeEvent('charge.dispute.created', {
        data: { object: disputeObject(maxSafeSeconds) },
      }),
    );
    assert.equal(maxDispute.ok, true);
    if (maxDispute.ok) {
      assert.equal(maxDispute.payload.providerDisputeCreatedAtMs, maxSafeSeconds * 1000);
    }
  });

  it('rejects unsafe provider object.created values for refund and dispute', () => {
    const invalidCreatedValues = [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      overflowSeconds,
    ];
    for (const created of invalidCreatedValues) {
      assert.equal(
        normalizeRefundEconomicEventV1(
          refundEvent({ data: { object: refundObject(created) } }),
        ).ok,
        false,
      );
      assert.equal(
        normalizeDisputeEconomicEventV1(
          disputeEvent('charge.dispute.created', {
            data: { object: disputeObject(created) },
          }),
        ).ok,
        false,
      );
    }
  });

  it('accepts safe Stripe Event.created for refund and dispute normalization', () => {
    const zeroRefund = normalizeRefundEconomicEventV1(refundEvent({ created: 0 }));
    assert.equal(zeroRefund.ok, true);
    if (zeroRefund.ok) assert.equal(zeroRefund.payload.stripeEventCreatedAtMs, 0);

    const ordinaryRefund = normalizeRefundEconomicEventV1(refundEvent());
    assert.equal(ordinaryRefund.ok, true);
    if (ordinaryRefund.ok) {
      assert.equal(ordinaryRefund.payload.stripeEventCreatedAtMs, 1_700_000_000_000);
    }

    const maxRefund = normalizeRefundEconomicEventV1(
      refundEvent({ created: maxSafeSeconds }),
    );
    assert.equal(maxRefund.ok, true);
    if (maxRefund.ok) {
      assert.equal(maxRefund.payload.stripeEventCreatedAtMs, maxSafeSeconds * 1000);
    }

    const maxDispute = normalizeDisputeEconomicEventV1(
      disputeEvent('charge.dispute.created', { created: maxSafeSeconds }),
    );
    assert.equal(maxDispute.ok, true);
    if (maxDispute.ok) {
      assert.equal(maxDispute.payload.stripeEventCreatedAtMs, maxSafeSeconds * 1000);
    }
  });

  it('rejects unsafe Stripe Event.created for refund and dispute normalization', () => {
    const invalidEventCreatedValues = [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      overflowSeconds,
      '1700000000',
    ];
    for (const created of invalidEventCreatedValues) {
      assert.equal(normalizeRefundEconomicEventV1(refundEvent({ created })).ok, false);
      assert.equal(
        normalizeDisputeEconomicEventV1(
          disputeEvent('charge.dispute.created', { created }),
        ).ok,
        false,
      );
    }
  });

  it('does not import the legacy stripeEventCreatedToMsV1 helper', () => {
    assert.equal(CONTRACT_SOURCE.includes('stripeEventCreatedToMsV1'), false);
  });
});
