import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME } from './r5PurchaseAttemptContract';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const { buildLockPurchaseAttemptRpcParamsV1 } = await import('./r5LockPurchaseAttemptRpc');
const { buildBindCheckoutSessionRpcParamsV1 } = await import('./r5BindCheckoutSessionRpc');
const { buildTerminalizePurchaseAttemptRpcParamsV1 } = await import(
  './r5TerminalizePurchaseAttemptRpc'
);
const { buildRecordCanonicalPaymentRpcParamsV1 } = await import('./r5RecordCanonicalPaymentRpc');
const { buildRecordCanonicalPaymentHoldRpcParamsV1 } = await import(
  './r5RecordCanonicalPaymentHoldRpc'
);

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations', M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME),
  'utf8',
);

describe('r5PurchaseLockRpcContract — migration SQL', () => {
  it('defines lock/bind/terminalize/record/hold RPCs as SECURITY INVOKER', () => {
    assert.match(SQL, /create function public\.m55_r5_attribution_lock_purchase_attempt_v1/i);
    assert.match(SQL, /create function public\.m55_r5_attribution_bind_checkout_session_v1/i);
    assert.match(SQL, /create function public\.m55_r5_attribution_terminalize_purchase_attempt_v1/i);
    assert.match(SQL, /create function public\.m55_r5_attribution_record_canonical_payment_v1/i);
    assert.match(SQL, /create function public\.m55_r5_attribution_record_canonical_payment_hold_v1/i);
    assert.match(SQL, /security invoker/i);
  });

  it('does not take caller purchase_attempt_id on lock RPC', () => {
    const start = SQL.indexOf('create function public.m55_r5_attribution_lock_purchase_attempt_v1');
    const lockSql = SQL.slice(start, SQL.indexOf('$fn$;', start) + 5);
    assert.match(
      lockSql,
      /m55_r5_attribution_lock_purchase_attempt_v1\(\s*p_clerk_subject_lookup_digest text,/i,
    );
    assert.equal(lockSql.includes('p_purchase_attempt_id'), false);
    assert.match(SQL, /purchase_attempt_id uuid primary key default gen_random_uuid\(\)/);
  });

  it('locks one OPEN attempt per reuse digest and requires ACTIVE + required terms at lock', () => {
    assert.match(SQL, /unique index m55_r5_attribution_purchase_attempts_open_reuse_uq/i);
    const start = SQL.indexOf('create function public.m55_r5_attribution_lock_purchase_attempt_v1');
    const lockSql = SQL.slice(start, SQL.indexOf('$fn$;', start) + 5);
    assert.match(lockSql, /p\.status = 'ACTIVE'/);
    assert.match(lockSql, /p\.terms_version = v_terms/);
  });

  it('record RPC never selects current profile status or terms', () => {
    const recordStart = SQL.indexOf(
      'create function public.m55_r5_attribution_record_canonical_payment_v1',
    );
    const recordSql = SQL.slice(recordStart, SQL.indexOf('$fn$;', recordStart) + 5);
    assert.equal(recordSql.includes('m55_creator_profiles.status'), false);
    assert.equal(recordSql.includes('profiles.status'), false);
    assert.match(recordSql, /m55_creator_profile_eligibility_events/);
    assert.match(recordSql, /preliminary_r5b_eligibility/);
  });

  it('hold writer is typed, unique per event and PI, and mutually exclusive with evidence', () => {
    assert.match(SQL, /stripe_canonical_event_id text not null unique/i);
    assert.match(SQL, /payment_intent_id text not null unique/i);
    assert.match(SQL, /HOLD_EVIDENCE_MUTUAL_EXCLUSION/);
    assert.match(SQL, /HOLD_PAYLOAD_CONFLICT/);
    assert.match(SQL, /CONTROL_CONSTANTS_IMMUTABLE/);
    assert.match(SQL, /required_creator_terms_version = '2026-09-13-v1'/);
  });

  it('revokes client execute and grants service_role only', () => {
    assert.match(
      SQL,
      /revoke all on function public\.m55_r5_attribution_lock_purchase_attempt_v1\(text, text, text, text, text, bigint, bigint, bytea, text, text\) from public, anon, authenticated/i,
    );
    assert.match(
      SQL,
      /grant execute on function public\.m55_r5_attribution_record_canonical_payment_hold_v1\(text, text, bigint, text, uuid, uuid, text, text\) to service_role/i,
    );
    assert.match(
      SQL,
      /revoke all on function public\.m55_r5_eligibility_history_epoch_backfill_v1\(\) from public, anon, authenticated, service_role/i,
    );
  });
});

describe('r5PurchaseLockRpcContract — TS params', () => {
  it('lock params omit purchase_attempt_id', () => {
    const params = buildLockPurchaseAttemptRpcParamsV1({
      clerkSubjectLookupDigest: 'a'.repeat(64),
      runtimeProductId: 'dtr_core_light_v1',
      policyProductId: 'M55_PREMIUM_REPORT_LIGHT',
      conversionKind: 'FIRST_ELIGIBLE_PAID',
      purchaseScopeId: 'scope',
      cutoffAtMs: 1,
      attributionLockedAtMs: 1,
      pendingContinuationIdBytes: null,
    });
    assert.equal('p_purchase_attempt_id' in params, false);
    assert.equal(params.p_pending_continuation_id, null);
  });

  it('bind/terminalize/record/hold signatures match PATCH-4', () => {
    assert.deepEqual(
      Object.keys(
        buildBindCheckoutSessionRpcParamsV1({
          purchaseAttemptId: '11111111-2222-3333-4444-555555555555',
          stripeCheckoutSessionId: 'cs_1',
          stripePaymentIntentId: null,
          lockExpiresAtMs: 2,
        }),
      ),
      [
        'p_purchase_attempt_id',
        'p_stripe_checkout_session_id',
        'p_stripe_payment_intent_id',
        'p_lock_expires_at_ms',
      ],
    );
    assert.equal(
      buildTerminalizePurchaseAttemptRpcParamsV1({
        purchaseAttemptId: '11111111-2222-3333-4444-555555555555',
        terminalState: 'EXPIRED',
      }).p_terminal_state,
      'EXPIRED',
    );
    const record = buildRecordCanonicalPaymentRpcParamsV1({
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
      canonicalEventCreatedAtMs: 3,
      verifiedCheckoutSessionId: 'cs_1',
      metadataPurchaseAttemptId: null,
    });
    assert.equal('p_purchase_attempt_id' in record, false);
    assert.equal(record.p_verified_checkout_session_id, 'cs_1');
    const hold = buildRecordCanonicalPaymentHoldRpcParamsV1({
      stripeCanonicalEventId: 'evt_1',
      paymentIntentId: 'pi_1',
      canonicalEventCreatedAtMs: 3,
      verifiedCheckoutSessionId: null,
      metadataPurchaseAttemptId: null,
      resolvedPurchaseAttemptId: null,
      reasonCode: 'PI_LOOKUP_ZERO',
      providerCorrelationState: 'PROVIDER_ZERO',
    });
    assert.equal(hold.p_reason_code, 'PI_LOOKUP_ZERO');
  });
});
