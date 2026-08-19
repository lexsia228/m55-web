import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveDtrDraftPostAuthority } from './resolveDtrDraftPostAuthority';

const AUTH_USER = 'user_auth_only_abc';
const SPOOF_USER = 'user_spoof_from_body_xyz';

describe('resolveDtrDraftPostAuthority', () => {
  it('AUTH_TEST_SIGNED_OUT_SPOOF: body clerkUserId cannot grant ownership', () => {
    const result = resolveDtrDraftPostAuthority({
      clerkAuthUserId: null,
      bodyClerkUserId: SPOOF_USER,
    });
    assert.equal(result.userId, null);
    assert.equal(result.mode, 'guest_cookie_only');
  });

  it('AUTH_TEST_SIGNED_IN: authenticated Clerk userId is used', () => {
    const result = resolveDtrDraftPostAuthority({
      clerkAuthUserId: AUTH_USER,
      bodyClerkUserId: null,
    });
    assert.equal(result.userId, AUTH_USER);
    assert.equal(result.mode, 'signed_in');
  });

  it('AUTH_TEST_CONFLICT: authenticated identity wins over body clerkUserId', () => {
    const result = resolveDtrDraftPostAuthority({
      clerkAuthUserId: AUTH_USER,
      bodyClerkUserId: SPOOF_USER,
    });
    assert.equal(result.userId, AUTH_USER);
    assert.equal(result.mode, 'signed_in');
    assert.notEqual(result.userId, SPOOF_USER);
  });

  it('AUTH_TEST_GUEST_COOKIE: unsigned requests stay guest cookie-only', () => {
    const result = resolveDtrDraftPostAuthority({
      clerkAuthUserId: undefined,
      bodyClerkUserId: undefined,
    });
    assert.equal(result.userId, null);
    assert.equal(result.mode, 'guest_cookie_only');
  });
});

describe('POST /api/dtr/draft authority wiring', () => {
  it('route resolves ownership via resolveDtrDraftPostAuthority only', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      new URL('../../../app/api/dtr/draft/route.ts', import.meta.url),
      'utf8',
    );
    assert.match(src, /resolveDtrDraftPostAuthority/);
    assert.doesNotMatch(src, /clerkFromAuth\s*\?\?\s*\(.*body\.clerkUserId/);
    assert.doesNotMatch(src, /body\.clerkUserId.*userId/);
    assert.match(src, /anonymous_draft_cookie_only/);
  });
});
