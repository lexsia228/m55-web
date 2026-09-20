import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_R5_TOUCH_INGEST_MIGRATION_FILENAME } from './r5TouchIngestContract';
import { M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME } from './r5TouchSchemaContract';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const { buildCreateTouchContinuationRpcParamsV1 } = await import('./r5CreateTouchContinuationRpc');
const { buildAdmitQualifiedTouchRpcParamsV1 } = await import('./r5AdmitQualifiedTouchRpc');

const S2_MIGRATION = join(process.cwd(), 'supabase/migrations', M55_R5_TOUCH_INGEST_MIGRATION_FILENAME);
const S1_MIGRATION = join(process.cwd(), 'supabase/migrations', M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME);

function readS2Migration(): string {
  return readFileSync(S2_MIGRATION, 'utf8');
}

describe('r5TouchIngestRpcContract — migration SQL', () => {
  const sql = readS2Migration();

  it('defines continuation table and both RPCs with SECURITY INVOKER', () => {
    assert.match(sql, /create table public\.m55_r5_attribution_touch_continuations/i);
    assert.match(sql, /create function public\.m55_r5_attribution_create_touch_continuation_v1/i);
    assert.match(sql, /create function public\.m55_r5_attribution_admit_qualified_touch_v1/i);
    assert.match(sql, /security invoker/i);
    assert.doesNotMatch(sql, /security definer/i);
  });

  it('pins exact admit RPC eight-argument signature', () => {
    assert.match(
      sql,
      /m55_r5_attribution_admit_qualified_touch_v1\(\s*p_continuation_id bytea,\s*p_clerk_subject_lookup_digest text,\s*p_qualified_action_kind text,\s*p_candidate_touch_event_key_bytes bytea,\s*p_candidate_qualified_touch_at_ms bigint,\s*p_payload_fingerprint text,\s*p_tracking_contract_version text,\s*p_attribution_policy_version text\s*\)/i,
    );
    assert.doesNotMatch(sql, /p_token_digest text,\s*p_token_version text,\s*p_qualified_action_kind text,\s*p_candidate_touch_event_key_bytes/i);
  });

  it('uses buyer digest advisory lock namespace in admit RPC', () => {
    assert.match(sql, /pg_advisory_xact_lock/);
    assert.match(sql, /hashtextextended\('m55_r5_attr_buyer_subject:' \|\| p_clerk_subject_lookup_digest, 0\)/);
  });

  it('revokes client execute and grants service_role only', () => {
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_create_touch_continuation_v1\(bytea, bytea, text, text, text, text\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /revoke all on function public\.m55_r5_attribution_admit_qualified_touch_v1\(bytea, text, text, bytea, bigint, text, text, text\) from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.m55_r5_attribution_admit_qualified_touch_v1\(bytea, text, text, bytea, bigint, text, text, text\) to service_role/i,
    );
    assert.match(sql, /revoke all on public\.m55_r5_attribution_touch_continuations from public, anon, authenticated/i);
    assert.match(sql, /grant all on public\.m55_r5_attribution_touch_continuations to service_role/i);
  });

  it('enforces DIRECT/PREAUTH buyer digest binding and touch triple atomicity', () => {
    assert.match(sql, /direct_buyer_subject_lookup_digest/);
    assert.match(sql, /AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK/);
    assert.match(sql, /VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION/);
    assert.match(sql, /CONTINUATION_TOUCH_TRIPLE_ATOMICITY_REQUIRED/);
    assert.match(sql, /interval '15 minutes'/);
  });

  it('does not alter merged S1 migration file', () => {
    const s1 = readFileSync(S1_MIGRATION, 'utf8');
    assert.equal(M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME, '20260919000000_m55_attribution_touch_schema_v1.sql');
    assert.match(s1, /create table public\.m55_creator_qualified_touches/i);
    assert.doesNotMatch(readS2Migration(), /alter table public\.m55_creator_qualified_touches/i);
  });

  it('ignores unused HTTP candidates on bound historical convergence', () => {
    const boundStart = sql.indexOf('if v_cont.touch_event_key_bytes is not null then');
    const boundEnd = sql.indexOf('perform pg_advisory_xact_lock', boundStart);
    assert.ok(boundStart >= 0 && boundEnd > boundStart);
    const boundBlock = sql.slice(boundStart, boundEnd);
    assert.doesNotMatch(
      boundBlock,
      /v_cont\.touch_event_key_bytes is distinct from p_candidate_touch_event_key_bytes/,
    );
    assert.doesNotMatch(
      boundBlock,
      /v_cont\.qualified_touch_at_ms is distinct from p_candidate_qualified_touch_at_ms/,
    );
    assert.doesNotMatch(
      boundBlock,
      /v_cont\.payload_fingerprint is distinct from p_payload_fingerprint/,
    );
    assert.match(boundBlock, /where touch_event_key_bytes = v_cont\.touch_event_key_bytes/);
    assert.match(boundBlock, /outcome', 'CONVERGED'/);
    assert.doesNotMatch(boundBlock, /\bupdate\b/i);
    assert.doesNotMatch(boundBlock, /set consumed_at/i);
    assert.doesNotMatch(boundBlock, /set\s+touch_event_key_bytes/i);
    assert.doesNotMatch(boundBlock, /set\s+qualified_touch_at_ms/i);
    assert.doesNotMatch(boundBlock, /set\s+payload_fingerprint/i);
  });

  it('does not rewrite continuation identity fields in the BOUND historical block', () => {
    const sql = readS2Migration();
    const boundStart = sql.indexOf('if v_cont.touch_event_key_bytes is not null then');
    const boundEnd = sql.indexOf('perform pg_advisory_xact_lock', boundStart);
    const boundBlock = sql.slice(boundStart, boundEnd);
    for (const column of [
      'touch_event_key_bytes',
      'qualified_touch_at_ms',
      'payload_fingerprint',
      'consumed_at',
    ]) {
      assert.doesNotMatch(
        boundBlock,
        new RegExp(`update[\\s\\S]*${column}\\s*=`, 'i'),
      );
    }
  });

  it('keeps expiry authoritative for bound and unbound continuations', () => {
    assert.match(sql, /if v_cont\.expires_at <= clock_timestamp\(\) then/);
    assert.match(sql, /raise exception 'CONTINUATION_EXPIRED'/);
  });
});

describe('r5TouchIngestRpcContract — RPC_TRANSPORT_SHAPE_PROOF', () => {
  const continuationId = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
  const touchKey = Buffer.from('ffffffffffffffffffffffffffffffff', 'hex');
  const tokenDigest = 'a'.repeat(64);
  const fingerprint = 'b'.repeat(64);

  it('builds JSON-safe create RPC params with canonical bytea text', () => {
    const params = buildCreateTouchContinuationRpcParamsV1({
      cookieContinuationIdBytes: continuationId,
      newContinuationIdBytes: touchKey,
      tokenDigest,
      tokenVersion: 'v1',
      qualifiedActionKind: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      directBuyerSubjectLookupDigest: 'c'.repeat(64),
    });
    assert.deepEqual(Object.keys(params), [
      'p_cookie_continuation_id',
      'p_new_continuation_id',
      'p_token_digest',
      'p_token_version',
      'p_qualified_action_kind',
      'p_direct_buyer_subject_lookup_digest',
    ]);
    assert.equal(params.p_cookie_continuation_id, '\\x0123456789abcdef0123456789abcdef');
    assert.equal(params.p_new_continuation_id, '\\xffffffffffffffffffffffffffffffff');
    assert.equal(typeof params.p_cookie_continuation_id, 'string');
    assert.equal(typeof params.p_new_continuation_id, 'string');
    assert.equal(Object.values(params).some((value) => Buffer.isBuffer(value)), false);
    const serialized = JSON.stringify(params);
    assert.match(serialized, /"\\\\x0123456789abcdef0123456789abcdef"/);
    assert.equal(JSON.parse(serialized).p_cookie_continuation_id, params.p_cookie_continuation_id);
    assert.equal(
      JSON.parse(JSON.stringify({ sample: '\\x01ab' })).sample,
      '\\x01ab',
    );
  });

  it('keeps nullable cookie continuation id as JSON null', () => {
    const params = buildCreateTouchContinuationRpcParamsV1({
      cookieContinuationIdBytes: null,
      newContinuationIdBytes: continuationId,
      tokenDigest,
      tokenVersion: 'v1',
      qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
      directBuyerSubjectLookupDigest: null,
    });
    assert.equal(params.p_cookie_continuation_id, null);
    assert.equal(params.p_direct_buyer_subject_lookup_digest, null);
    assert.equal(JSON.parse(JSON.stringify(params)).p_cookie_continuation_id, null);
  });

  it('builds JSON-safe admit RPC params with exact argument names', () => {
    const params = buildAdmitQualifiedTouchRpcParamsV1({
      continuationIdBytes: continuationId,
      clerkSubjectLookupDigest: tokenDigest,
      qualifiedActionKind: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      candidateTouchEventKeyBytes: touchKey,
      candidateQualifiedTouchAtMs: 1_700_000_000_000,
      payloadFingerprint: fingerprint,
      trackingContractVersion: 'v1',
      attributionPolicyVersion: 'v1',
    });
    assert.deepEqual(Object.keys(params), [
      'p_continuation_id',
      'p_clerk_subject_lookup_digest',
      'p_qualified_action_kind',
      'p_candidate_touch_event_key_bytes',
      'p_candidate_qualified_touch_at_ms',
      'p_payload_fingerprint',
      'p_tracking_contract_version',
      'p_attribution_policy_version',
    ]);
    assert.equal(params.p_continuation_id, '\\x0123456789abcdef0123456789abcdef');
    assert.equal(params.p_candidate_touch_event_key_bytes, '\\xffffffffffffffffffffffffffffffff');
    assert.equal(Object.values(params).some((value) => Buffer.isBuffer(value)), false);
    const serialized = JSON.stringify(params);
    assert.match(serialized, /"\\\\xffffffffffffffffffffffffffffffff"/);
    assert.equal(JSON.parse(serialized).p_candidate_touch_event_key_bytes, params.p_candidate_touch_event_key_bytes);
  });
});
