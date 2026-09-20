import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
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
  M55_CREATOR_TRACKING_TOKEN_DIGEST_PURPOSE_V1,
  M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1,
  assertCreatorTrackingTokenWireV1,
  digestCreatorTrackingTokenV1,
  mapRegistryErrorToHttpError,
} = await import('./r5CreatorTrackingToken');

describe('r5CreatorTrackingToken — wire namespace', () => {
  const validToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${'a'.repeat(43)}`;

  it('accepts m55ct1 prefix tokens', () => {
    assert.doesNotThrow(() => assertCreatorTrackingTokenWireV1(validToken));
  });

  it('rejects General /r style tokens', () => {
    assert.throws(() => assertCreatorTrackingTokenWireV1('share-token-abc'), /INVALID_TOKEN/);
  });

  it('rejects scout invite style tokens without prefix', () => {
    assert.throws(
      () => assertCreatorTrackingTokenWireV1('abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ'),
      /INVALID_TOKEN/,
    );
  });

  it('accepts uppercase base64url characters in wire body', () => {
    const token = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${'A'.repeat(43)}`;
    assert.doesNotThrow(() => assertCreatorTrackingTokenWireV1(token));
  });

  it('accepts mixed-case base64url wire body', () => {
    const token = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}AbCdEF0123_-${'x'.repeat(30)}`;
    assert.doesNotThrow(() => assertCreatorTrackingTokenWireV1(token));
  });

  it('rejects standard base64 padding and reserved characters', () => {
    const base = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${'a'.repeat(40)}`;
    for (const invalidChar of ['+', '/', '=']) {
      assert.throws(() => assertCreatorTrackingTokenWireV1(`${base}${invalidChar}`), /INVALID_TOKEN/);
    }
  });

  it('rejects whitespace in wire token', () => {
    const token = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${'a'.repeat(43)}`;
    assert.throws(() => assertCreatorTrackingTokenWireV1(` ${token}`), /INVALID_TOKEN/);
    assert.throws(() => assertCreatorTrackingTokenWireV1(`${token} `), /INVALID_TOKEN/);
  });

  it('digests exact raw token case-sensitively', () => {
    const lowerBody = 'a'.repeat(43);
    const upperBody = 'A'.repeat(43);
    const lowerToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${lowerBody}`;
    const upperToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${upperBody}`;
    const lowerDigest = digestCreatorTrackingTokenV1(lowerToken);
    const upperDigest = digestCreatorTrackingTokenV1(upperToken);
    assert.notEqual(lowerDigest, upperDigest);
    assert.equal(
      lowerDigest,
      createHash('sha256')
        .update(M55_CREATOR_TRACKING_TOKEN_DIGEST_PURPOSE_V1, 'utf8')
        .update('\0', 'utf8')
        .update(lowerToken, 'utf8')
        .digest('hex'),
    );
  });

  it('accepts issuer-compatible base64url bodies across deterministic samples', () => {
    const lengths = [32, 40, 48, 64, 96];
    for (const byteLength of lengths) {
      for (let sample = 0; sample < 16; sample += 1) {
        const body = randomBytes(byteLength).toString('base64url');
        if (body.length < 40 || body.length > 128) continue;
        const rawToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${body}`;
        assert.doesNotThrow(() => assertCreatorTrackingTokenWireV1(rawToken));
        assert.match(digestCreatorTrackingTokenV1(rawToken), /^[0-9a-f]{64}$/);
      }
    }
  });

  it('accepts issueCreatorTrackingTokenV1ForTests wire format across random samples', () => {
    for (let sample = 0; sample < 64; sample += 1) {
      const rawToken = `${M55_CREATOR_TRACKING_TOKEN_WIRE_PREFIX_V1}${randomBytes(32).toString('base64url')}`;
      assert.doesNotThrow(() => assertCreatorTrackingTokenWireV1(rawToken));
      assert.match(digestCreatorTrackingTokenV1(rawToken), /^[0-9a-f]{64}$/);
    }
  });

  it('digests deterministically with frozen purpose', () => {
    const first = digestCreatorTrackingTokenV1(validToken);
    const second = digestCreatorTrackingTokenV1(validToken);
    const expected = createHash('sha256')
      .update(M55_CREATOR_TRACKING_TOKEN_DIGEST_PURPOSE_V1, 'utf8')
      .update('\0', 'utf8')
      .update(validToken, 'utf8')
      .digest('hex');
    assert.equal(first, second);
    assert.equal(first, expected);
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it('maps unknown registry lookup to INVALID_TOKEN at HTTP layer', () => {
    assert.equal(mapRegistryErrorToHttpError('REFERRAL_LINK_NOT_FOUND'), 'INVALID_TOKEN');
    assert.equal(mapRegistryErrorToHttpError('LINK_NOT_ACTIVE'), 'LINK_NOT_ACTIVE');
  });
});
