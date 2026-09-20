import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  M55_R5_S2_CONTINUATION_TTL_MS,
  M55_R5_TOUCH_ADMIT_RPC_NAME,
  M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES,
  M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
  M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR,
  M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS,
  M55_R5_TOUCH_CREATE_RPC_NAME,
  M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES,
  M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
  M55_R5_TOUCH_INGEST_MIGRATION_FILENAME,
  M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS,
  M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS,
  classifyAdmitQualifiedTouchRpcErrorV1,
  classifyCreateTouchContinuationRpcErrorV1,
  interpretSupabaseMaybeSingleReadV1,
  isEmptyHttpRequestBodyV1,
  parseCreatorTouchPhase1JsonBodyV1,
} from './r5TouchIngestContract';

describe('r5TouchIngestContract', () => {
  it('pins RPC names and continuation TTL constant', () => {
    assert.equal(M55_R5_TOUCH_CREATE_RPC_NAME, 'm55_r5_attribution_create_touch_continuation_v1');
    assert.equal(M55_R5_TOUCH_ADMIT_RPC_NAME, 'm55_r5_attribution_admit_qualified_touch_v1');
    assert.equal(M55_R5_S2_CONTINUATION_TTL_MS, 900_000);
    assert.equal(M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS, 900);
  });

  it('accepts only the two persistable qualified actions', () => {
    assert.deepEqual(M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS, [
      'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
    ]);
  });

  it('clears cookies on terminal continuation failures', () => {
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has('CONTINUATION_EXPIRED'), true);
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has('SELF_REFERRAL'), true);
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has('ADMIT_RPC_TRANSPORT_ERROR'), false);
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has(M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR), false);
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has(M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR), false);
    assert.equal(M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has(M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR), false);
  });

  it('maps query errors to retryable context-read failures and zero-row to empty', () => {
    assert.throws(
      () => interpretSupabaseMaybeSingleReadV1({ data: null, error: { message: 'network' } }),
      new RegExp(M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR),
    );
    assert.throws(
      () => interpretSupabaseMaybeSingleReadV1({ data: { id: 1 }, error: { code: '57014' } }),
      new RegExp(M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR),
    );
    assert.deepEqual(interpretSupabaseMaybeSingleReadV1({ data: null, error: null }), {
      status: 'empty',
    });
    assert.deepEqual(interpretSupabaseMaybeSingleReadV1({ data: undefined, error: undefined }), {
      status: 'empty',
    });
    assert.deepEqual(interpretSupabaseMaybeSingleReadV1({ data: { token_digest: 'abc' }, error: null }), {
      status: 'row',
      row: { token_digest: 'abc' },
    });
  });
});

function extractRaiseExceptionCodesFromFunction(sql: string, functionName: string): string[] {
  const marker = `create function public.${functionName}`;
  const start = sql.indexOf(marker);
  assert.ok(start >= 0, `missing function ${functionName}`);
  const nextCreate = sql.indexOf('create function public.', start + marker.length);
  const body = nextCreate >= 0 ? sql.slice(start, nextCreate) : sql.slice(start);
  const codes = [...body.matchAll(/raise exception '([A-Z0-9_]+)'/g)].map((match) => match[1]);
  return [...new Set(codes)].sort();
}

describe('r5TouchIngestContract — RPC semantic registries', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations', M55_R5_TOUCH_INGEST_MIGRATION_FILENAME),
    'utf8',
  );

  it('pins CREATE semantic codes to exact raise exception codes in the create RPC', () => {
    assert.deepEqual(
      [...M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES].slice().sort(),
      extractRaiseExceptionCodesFromFunction(sql, 'm55_r5_attribution_create_touch_continuation_v1'),
    );
  });

  it('pins ADMIT semantic codes to exact raise exception codes in the admit RPC', () => {
    assert.deepEqual(
      [...M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES].slice().sort(),
      extractRaiseExceptionCodesFromFunction(sql, 'm55_r5_attribution_admit_qualified_touch_v1'),
    );
  });

  it('preserves known exact CREATE codes and fails closed on unknown messages', () => {
    for (const code of M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES) {
      assert.equal(classifyCreateTouchContinuationRpcErrorV1({ message: code }), code);
    }
    assert.equal(
      classifyCreateTouchContinuationRpcErrorV1({ message: 'network' }),
      M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyCreateTouchContinuationRpcErrorV1({
        message: 'Could not find the function public.m55_r5_attribution_create_touch_continuation_v1 in the schema cache',
      }),
      M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyCreateTouchContinuationRpcErrorV1({
        message: 'duplicate key value violates unique constraint "pg_type_typname_nsp_index"',
      }),
      M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyCreateTouchContinuationRpcErrorV1({ details: 'INVALID_INPUT' }),
      M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
    );
  });

  it('preserves known exact ADMIT codes and fails closed on unknown messages', () => {
    for (const code of M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES) {
      assert.equal(classifyAdmitQualifiedTouchRpcErrorV1({ message: code }), code);
    }
    assert.equal(
      classifyAdmitQualifiedTouchRpcErrorV1({ message: 'network' }),
      M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyAdmitQualifiedTouchRpcErrorV1({
        message: 'PGRST202 Could not find the function public.m55_r5_attribution_admit_qualified_touch_v1',
      }),
      M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyAdmitQualifiedTouchRpcErrorV1({
        message: 'could not serialize access due to concurrent update',
      }),
      M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
    );
    assert.equal(
      classifyAdmitQualifiedTouchRpcErrorV1({ message: 'CHECK_VIOLATION' }),
      M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
    );
  });
});

describe('r5TouchIngestContract — exact request envelopes', () => {
  it('accepts Phase-1 bodies with exactly one enumerable token string key', () => {
    assert.deepEqual(parseCreatorTouchPhase1JsonBodyV1({ token: 'm55ct1.abc' }), {
      ok: true,
      token: 'm55ct1.abc',
    });
  });

  it('rejects Phase-1 extra fields, arrays, and null', () => {
    assert.deepEqual(parseCreatorTouchPhase1JsonBodyV1({ token: 'm55ct1.abc', buyer: 'x' }), {
      ok: false,
      errorCode: 'INVALID_INPUT',
    });
    assert.deepEqual(parseCreatorTouchPhase1JsonBodyV1({ token: 'm55ct1.abc', userId: 'x' }), {
      ok: false,
      errorCode: 'INVALID_INPUT',
    });
    assert.deepEqual(parseCreatorTouchPhase1JsonBodyV1([]), {
      ok: false,
      errorCode: 'INVALID_INPUT',
    });
    assert.deepEqual(parseCreatorTouchPhase1JsonBodyV1(null), {
      ok: false,
      errorCode: 'INVALID_INPUT',
    });
  });

  it('requires Phase-2 request bodies to be actually empty', () => {
    assert.equal(isEmptyHttpRequestBodyV1(''), true);
    assert.equal(isEmptyHttpRequestBodyV1('{}'), false);
    assert.equal(isEmptyHttpRequestBodyV1(' '), false);
  });

  it('keeps the Phase-2 continue page fetch bodyless', () => {
    const page = readFileSync(
      join(process.cwd(), 'app/m55/attribution/creator-touch/continue/page.tsx'),
      'utf8',
    );
    assert.doesNotMatch(page, /Content-Type:\s*application\/json/);
    assert.doesNotMatch(page, /body:\s*'\{ \}'/);
    assert.doesNotMatch(page, /body:\s*'\{\}'/);
    assert.match(
      page,
      /fetch\('\/api\/m55\/attribution\/creator-touch\/continue',\s*\{\s*method:\s*'POST',\s*credentials:\s*'include',\s*\}\)/,
    );
  });

  it('maps CREATE transport errors to HTTP 503 in the Phase-1 route', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/m55/attribution/creator-touch/route.ts'),
      'utf8',
    );
    assert.match(route, /parseCreatorTouchPhase1JsonBodyV1/);
    assert.match(route, /classified === M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR/);
    assert.match(route, /status: 503/);
  });

  it('maps ADMIT transport errors to HTTP 503 and preserves the cookie', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/m55/attribution/creator-touch/continue/route.ts'),
      'utf8',
    );
    assert.match(route, /isEmptyHttpRequestBodyV1/);
    assert.match(route, /classified === M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR/);
    assert.match(route, /\{ error: M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR \},\s*503,\s*false,/);
  });
});
