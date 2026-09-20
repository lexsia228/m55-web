import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('r5TouchSelfReferralGuard — source contract', () => {
  const src = readFileSync(
    join(process.cwd(), 'lib/m55/attribution/r5TouchSelfReferralGuard.ts'),
    'utf8',
  );

  it('exports resolveTouchAdmissionServerContextV1', () => {
    assert.match(src, /export async function resolveTouchAdmissionServerContextV1/);
  });

  it('branches on bound continuation triple for historical retry', () => {
    assert.match(src, /isContinuationTouchTripleBound/);
    assert.match(src, /if \(!bound\)/);
    assert.match(src, /SELF_REFERRAL/);
    assert.match(src, /boundTouchEventKeyBytes/);
  });

  it('rejects self-referral when buyer Clerk user id matches creator Clerk user id on unbound continuation', () => {
    assert.match(src, /if \(profile\.clerk_user_id === args\.buyerClerkUserId\)/);
    assert.match(src, /return \{ ok: false, errorCode: 'SELF_REFERRAL' \}/);
  });

  it('does not expose browser-facing creator identifiers in return type', () => {
    assert.doesNotMatch(src, /NextResponse/);
  });

  it('does not convert query errors into zero-row semantic codes', () => {
    assert.match(src, /interpretSupabaseMaybeSingleReadV1/);
    assert.equal((src.match(/interpretSupabaseMaybeSingleReadV1/g) || []).length, 4);
    assert.doesNotMatch(src, /if \(error \|\| !data\) return null/);
    assert.doesNotMatch(src, /if \(linkError \|\| !link\)/);
    assert.doesNotMatch(src, /if \(profileError \|\| !profile\)/);
  });

  it('maps transient context reads to 5xx while preserving the continuation cookie', () => {
    const route = readFileSync(
      join(process.cwd(), 'app/api/m55/attribution/creator-touch/continue/route.ts'),
      'utf8',
    );
    assert.match(route, /M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR/);
    assert.match(route, /\n      503,\n      false,/);
    assert.match(
      route,
      /responseWithOptionalCookieClear\(\s*\{\s*error: M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR \},\s*503,\s*false,/,
    );
    assert.match(route, /ADMIT_RPC_TRANSPORT_ERROR/);
    assert.match(route, /classified === M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR/);
    assert.match(
      route,
      /responseWithOptionalCookieClear\(\s*\{\s*error: M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR \},\s*503,\s*false,/,
    );
  });
});
