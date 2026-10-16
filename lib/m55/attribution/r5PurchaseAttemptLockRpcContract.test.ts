import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
  M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
  M55_R5_RESOLVE_ATTEMPT_RPC_NAME,
} from './r5PurchaseAttemptLockContract';
import { M55_R5_TOUCH_INGEST_MIGRATION_FILENAME } from './r5TouchIngestContract';
import { M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME } from './r5TouchSchemaContract';

const RESOLVE_WRAPPER = join(process.cwd(), 'lib/m55/attribution/r5ResolvePurchaseAttempt.ts');
const FINALIZE_WRAPPER = join(
  process.cwd(),
  'lib/m55/attribution/r5FinalizeAttributionLockAndBindCheckoutSession.ts',
);

const S3A_MIGRATION = join(
  process.cwd(),
  'supabase/migrations',
  M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME,
);

const S3B_MIGRATION = join(
  process.cwd(),
  'supabase/migrations',
  '20260922000001_m55_r5_finalize_pending_admission_hold_v1.sql',
);

function readS3a(): string {
  return readFileSync(S3A_MIGRATION, 'utf8');
}

function readS3b(): string {
  return readFileSync(S3B_MIGRATION, 'utf8');
}

function extractCreateFunction(sql: string, functionName: string): string {
  const replaceNeedle = `create or replace function public.${functionName}`;
  const createNeedle = `create function public.${functionName}`;
  const start = sql.includes(replaceNeedle)
    ? sql.indexOf(replaceNeedle)
    : sql.indexOf(createNeedle);
  assert.ok(start >= 0, `missing ${functionName}`);
  const asDollar = sql.indexOf('as $$', start);
  assert.ok(asDollar >= 0, `missing as $$ for ${functionName}`);
  const end = sql.indexOf('$$;', asDollar + 5);
  assert.ok(end >= 0, `missing function terminator for ${functionName}`);
  return sql.slice(start, end + 3);
}

function extractWinnerCandidateSelect(finalizeSql: string): string {
  const from = finalizeSql.indexOf('from public.m55_creator_qualified_touches');
  assert.ok(from >= 0, 'missing winner candidate FROM');
  const limit = finalizeSql.indexOf('limit 1;', from);
  assert.ok(limit >= 0, 'missing winner candidate LIMIT');
  return finalizeSql.slice(from, limit + 'limit 1;'.length);
}

function extractCircularExists(finalizeSql: string): string {
  const from = finalizeSql.indexOf('from public.m55_creator_qualified_touches as t');
  assert.ok(from >= 0, 'missing circular reciprocal FROM');
  const thenDenial = finalizeSql.indexOf("v_denial := 'CIRCULAR_ABUSE';", from);
  assert.ok(thenDenial >= 0, 'missing CIRCULAR_ABUSE assignment after reciprocal');
  return finalizeSql.slice(from, thenDenial);
}

describe('r5PurchaseAttemptLockRpcContract — wrapper params', () => {
  it('pins JSON-safe resolve param keys on the wrapper', () => {
    const src = readFileSync(RESOLVE_WRAPPER, 'utf8');
    assert.match(src, /export function buildResolvePurchaseAttemptRpcParamsV1/);
    assert.match(src, /export async function resolvePurchaseAttemptV1/);
    assert.match(src, /p_clerk_subject_lookup_digest:/);
    assert.match(src, /p_buyer_clerk_user_id:/);
    assert.match(src, /p_creator_cash_product_key:/);
    assert.match(src, /p_repurchase_lane:/);
    assert.match(src, /p_scope_generation:/);
    assert.match(src, /p_successor_reason:/);
    assert.match(src, /p_correlation_purchase_context_id:/);
    assert.match(src, /JSON\.parse\(\s*JSON\.stringify/);
    const jsonSafe = JSON.parse(
      JSON.stringify({
        p_clerk_subject_lookup_digest: 'a'.repeat(64),
        p_buyer_clerk_user_id: 'user_buyer',
        p_creator_cash_product_key: 'M55_PREMIUM_REPORT_LIGHT',
        p_repurchase_lane: false,
        p_scope_generation: 0,
        p_successor_reason: null,
        p_correlation_purchase_context_id: null,
      }),
    );
    assert.equal(jsonSafe.p_successor_reason, null);
    assert.equal(jsonSafe.p_correlation_purchase_context_id, null);
    assert.equal(jsonSafe.p_scope_generation, 0);
  });

  it('pins JSON-safe finalize param keys on the wrapper', () => {
    const src = readFileSync(FINALIZE_WRAPPER, 'utf8');
    assert.match(src, /export function buildFinalizeLockBindRpcParamsV1/);
    assert.match(src, /export async function finalizeAttributionLockAndBindCheckoutSessionV1/);
    assert.match(src, /p_purchase_attempt_id:/);
    assert.match(src, /p_stripe_checkout_session_id:/);
    assert.match(src, /p_lock_expires_at_ms:/);
    assert.match(src, /JSON\.parse\(\s*JSON\.stringify/);
  });
});

describe('r5PurchaseAttemptLockRpcContract — migration SQL', () => {
  const sql = readS3a();

  it('creates the three frozen tables and digest/RPC functions', () => {
    assert.match(sql, /create table public\.m55_r5_purchase_attempts_v1/i);
    assert.match(sql, /create table public\.m55_r5_attribution_locks_v1/i);
    assert.match(sql, /create table public\.m55_r5_purchase_attempt_provider_bindings_v1/i);
    assert.match(sql, /create function public\.m55_r5_attribution_clerk_lookup_digest_v1/i);
    assert.match(
      sql,
      new RegExp(`create function public\\.${M55_R5_RESOLVE_ATTEMPT_RPC_NAME}`),
    );
    assert.match(
      sql,
      new RegExp(`create function public\\.${M55_R5_FINALIZE_LOCK_BIND_RPC_NAME}`),
    );
    assert.match(sql, /security invoker/i);
    assert.doesNotMatch(sql, /security definer/i);
  });

  it('pins exact resolve and finalize argument signatures', () => {
    assert.match(
      sql,
      /m55_r5_attribution_resolve_purchase_attempt_v1\(\s*p_clerk_subject_lookup_digest text,\s*p_buyer_clerk_user_id text,\s*p_creator_cash_product_key text,\s*p_repurchase_lane boolean,\s*p_scope_generation integer,\s*p_successor_reason text,\s*p_correlation_purchase_context_id uuid\s*\)/i,
    );
    assert.match(
      sql,
      /m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1\(\s*p_purchase_attempt_id uuid,\s*p_stripe_checkout_session_id text,\s*p_lock_expires_at_ms bigint\s*\)/i,
    );
  });

  it('encodes generation and successor semantics', () => {
    assert.match(sql, /INVALID_SCOPE_GENERATION/);
    assert.match(sql, /INVALID_SUCCESSOR_REASON/);
    assert.match(sql, /BUYER_SUBJECT_DIGEST_MISMATCH/);
    assert.match(sql, /CONFIRMED_EXPIRY/);
    assert.match(sql, /CONFIRMED_CANCEL/);
    assert.match(sql, /PURCHASE_SCOPE_CHANGE/);
    assert.match(sql, /SAME_ATTEMPT_RETRY/);
    assert.match(sql, /scope_generation \+ 1/);
    assert.match(sql, /order by scope_generation desc/);
  });

  it('encodes cutoff-frozen candidate and circular evidence rules', () => {
    const schemaHead = sql.slice(0, sql.indexOf('create table public.m55_r5_purchase_attempts_v1'));
    assert.match(
      schemaHead,
      /alter table public\.m55_creator_qualified_touches\s+alter column recorded_at\s+set default clock_timestamp\(\)/i,
    );
    assert.doesNotMatch(schemaHead, /WAIT_RETRY_HOLD/);

    const finalizeSql = extractCreateFunction(
      sql,
      M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
    );
    const winnerSelect = extractWinnerCandidateSelect(finalizeSql);
    assert.match(
      winnerSelect,
      /where buyer_subject_id = v_attempt\.buyer_subject_id\s+and qualified_touch_at_ms <= v_cutoff\s+order by qualified_touch_at_ms desc, touch_event_key_bytes asc/,
    );
    assert.doesNotMatch(winnerSelect, /recorded_at/);
    assert.doesNotMatch(winnerSelect, /floor\(extract\(epoch from recorded_at\)/);

    const circularExists = extractCircularExists(finalizeSql);
    assert.match(circularExists, /t\.qualified_touch_at_ms <= v_cutoff/);
    assert.doesNotMatch(circularExists, /recorded_at/);
    assert.doesNotMatch(circularExists, /floor\(extract\(epoch from t\.recorded_at\)/);

    assert.doesNotMatch(finalizeSql, /recorded_at/);
    assert.doesNotMatch(sql, /WAIT_RETRY_HOLD/);
    assert.doesNotMatch(sql, /recorded_at <= v_cutoff/);
    assert.doesNotMatch(sql, /recorded_at <= v_cutoff_ts/);
    assert.doesNotMatch(sql, /to_timestamp\(v_cutoff::numeric \/ 1000\.0\)/);
    assert.match(sql, /LOCK_EXPIRY_NOT_AFTER_CUTOFF/);
    assert.match(sql, /BUYER_SUBJECT_DELETED/);
    assert.match(sql, /lock_expires_at_ms > locked_at_ms/);
    assert.match(
      sql,
      /decision_kind = 'NONE'\s+and lock_denial_reason_code is not null\s+and lock_denial_reason_code in \(/,
    );
    assert.match(sql, /decision_kind = 'CREATOR_WINNER'\s+and lock_denial_reason_code is null/);
  });

  it('creates immutable triggers and one-attempt-one-session uniqueness', () => {
    assert.match(sql, /m55_r5_purchase_attempt_immutable_trg/);
    assert.match(sql, /m55_r5_attribution_lock_immutable_trg/);
    assert.match(sql, /m55_r5_provider_binding_immutable_trg/);
    assert.match(sql, /ATTRIBUTION_LOCK_IMMUTABLE/);
    assert.match(sql, /PROVIDER_BINDING_IMMUTABLE/);
    assert.match(sql, /stripe_checkout_session_id text not null unique/i);
    assert.doesNotMatch(sql, /is_accepted/);
  });

  it('revokes client access and grants service_role only', () => {
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_resolve_purchase_attempt_v1\(text, text, text, boolean, integer, text, uuid\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1\(uuid, text, bigint\) to service_role/i,
    );
    assert.match(sql, /revoke all on public\.m55_r5_purchase_attempts_v1 from public, anon, authenticated/i);
    assert.match(sql, /grant all on public\.m55_r5_purchase_attempts_v1 to service_role/i);
    assert.match(sql, /grant usage on schema extensions to service_role/i);
    assert.match(sql, /enable row level security/i);
  });

  it('does not alter S1/S2 migrations or live checkout files', () => {
    assert.equal(
      M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME,
      '20260919000000_m55_attribution_touch_schema_v1.sql',
    );
    assert.equal(
      M55_R5_TOUCH_INGEST_MIGRATION_FILENAME,
      '20260920000000_m55_r5_attribution_admit_qualified_touch_v1.sql',
    );
    const wrappers = [
      readFileSync(join(process.cwd(), 'lib/m55/attribution/r5ResolvePurchaseAttempt.ts'), 'utf8'),
      readFileSync(
        join(process.cwd(), 'lib/m55/attribution/r5FinalizeAttributionLockAndBindCheckoutSession.ts'),
        'utf8',
      ),
    ].join('\n');
    assert.doesNotMatch(wrappers, /app\/api\/purchase\/checkout/);
    assert.doesNotMatch(wrappers, /from ['"].*purchaseCheckoutStartedAction['"]/);
    assert.doesNotMatch(sql, /alter table public\.m55_creator_qualified_touches[\s\S]*add column/i);
  });
});

describe('r5PurchaseAttemptLockRpcContract — S3B pending admission HOLD migration', () => {
  const sql = readS3b();

  it('replaces finalize with exact signature unchanged', () => {
    assert.match(
      sql,
      /create or replace function public\.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1\(\s*p_purchase_attempt_id uuid,\s*p_stripe_checkout_session_id text,\s*p_lock_expires_at_ms bigint\s*\) returns jsonb/i,
    );
    assert.match(sql, /security invoker/i);
    assert.doesNotMatch(sql, /security definer/i);
  });

  it('encodes B try-lock barrier before candidate read and global cutoff boundary', () => {
    const finalizeSql = extractCreateFunction(
      sql,
      M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
    );
    const buyerLock = finalizeSql.indexOf('pg_try_advisory_xact_lock');
    const candidateFrom = finalizeSql.indexOf('from public.m55_creator_qualified_touches');
    const lockInsert = finalizeSql.indexOf('insert into public.m55_r5_attribution_locks_v1');
    assert.ok(buyerLock >= 0 && candidateFrom > buyerLock, 'B try-lock must precede candidate SELECT');
    assert.ok(lockInsert > candidateFrom, 'lock INSERT must follow candidate SELECT');
    assert.match(
      finalizeSql,
      /if not pg_try_advisory_xact_lock\(\s*hashtextextended\('m55_r5_attr_buyer_subject:' \|\| v_buyer\.clerk_subject_lookup_digest, 0\)\s*\) then\s*raise exception 'PENDING_ADMISSION_RETRY_HOLD';/,
    );
    assert.match(
      finalizeSql,
      /v_now_ms := floor\(extract\(epoch from clock_timestamp\(\)\) \* 1000\)::bigint;\s*if v_now_ms <= v_cutoff then\s*raise exception 'PENDING_ADMISSION_RETRY_HOLD';/,
    );
    const winnerSelect = extractWinnerCandidateSelect(finalizeSql);
    assert.match(
      winnerSelect,
      /where buyer_subject_id = v_attempt\.buyer_subject_id\s+and qualified_touch_at_ms <= v_cutoff\s+order by qualified_touch_at_ms desc, touch_event_key_bytes asc/,
    );
    assert.doesNotMatch(winnerSelect, /recorded_at/);
    const holdBeforeInsert = finalizeSql.indexOf("raise exception 'PENDING_ADMISSION_RETRY_HOLD'");
    assert.ok(holdBeforeInsert >= 0 && holdBeforeInsert < lockInsert);
  });

  it('encodes winner A try-lock before circular EXISTS without recorded_at authority', () => {
    const finalizeSql = extractCreateFunction(
      sql,
      M55_R5_FINALIZE_LOCK_BIND_RPC_NAME,
    );
    const circularExists = extractCircularExists(finalizeSql);
    const aTryLock = finalizeSql.indexOf('v_winner_creator_digest');
    const circularFrom = finalizeSql.indexOf('from public.m55_creator_qualified_touches as t');
    assert.ok(aTryLock >= 0 && aTryLock < circularFrom);
    assert.match(
      finalizeSql,
      /if not pg_try_advisory_xact_lock\(\s*hashtextextended\('m55_r5_attr_buyer_subject:' \|\| v_winner_creator_digest, 0\)\s*\) then\s*raise exception 'PENDING_ADMISSION_RETRY_HOLD';/,
    );
    assert.match(circularExists, /t\.qualified_touch_at_ms <= v_cutoff/);
    assert.doesNotMatch(circularExists, /recorded_at/);
  });
});
