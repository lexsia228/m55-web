import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import {
  M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS,
  M55_R5_TOUCH_CONTINUATION_COOKIE_NAME,
  M55_R5_TOUCH_CONTINUATION_COOKIE_PATH,
} from './r5TouchIngestContract';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const {
  buildContinuationClearCookieHeader,
  buildContinuationSetCookieHeader,
  continuationIdBytesToHex,
  decodePostgrestByteaToBufferV1,
  encodeByteaForPostgrestRpcV1,
  encodeNullableByteaForPostgrestRpcV1,
  mintContinuationIdBytes,
  parseContinuationCookieValue,
  parseContinuationIdHex,
} = await import('./r5TouchContinuation');

describe('r5TouchContinuation', () => {
  it('mints 16-byte continuation ids rendered as 32 lowercase hex', () => {
    const bytes = mintContinuationIdBytes();
    assert.equal(bytes.length, 16);
    const hex = continuationIdBytesToHex(bytes);
    assert.match(hex, /^[0-9a-f]{32}$/);
    assert.deepEqual(parseContinuationIdHex(hex), bytes);
  });

  it('parses continuation cookie values', () => {
    const hex = '0123456789abcdef0123456789abcdef';
    const cookie = `other=1; ${M55_R5_TOUCH_CONTINUATION_COOKIE_NAME}=${hex}; foo=bar`;
    const parsed = parseContinuationCookieValue(cookie);
    assert.ok(parsed);
    assert.equal(parsed.toString('hex'), hex);
  });

  it('builds frozen cookie attributes', () => {
    const hex = '0123456789abcdef0123456789abcdef';
    const setCookie = buildContinuationSetCookieHeader(hex);
    assert.match(setCookie, new RegExp(`${M55_R5_TOUCH_CONTINUATION_COOKIE_NAME}=${hex}`));
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, new RegExp(`Path=${M55_R5_TOUCH_CONTINUATION_COOKIE_PATH}`));
    assert.equal(M55_R5_TOUCH_CONTINUATION_COOKIE_PATH, '/api');
    assert.match(setCookie, new RegExp(`Max-Age=${M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS}`));

    const clearCookie = buildContinuationClearCookieHeader();
    assert.match(clearCookie, /Max-Age=0/);
  });

  it('encodes 16-byte values as canonical PostgREST bytea text', () => {
    const bytes = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    const encoded = encodeByteaForPostgrestRpcV1(bytes);
    assert.equal(encoded, '\\x0123456789abcdef0123456789abcdef');
    assert.equal(JSON.parse(JSON.stringify({ value: encoded })).value, encoded);
    assert.equal(encodeNullableByteaForPostgrestRpcV1(null), null);
    assert.deepEqual(decodePostgrestByteaToBufferV1(encoded), bytes);
    assert.equal(decodePostgrestByteaToBufferV1(null), null);
  });
});
