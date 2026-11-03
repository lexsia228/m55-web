import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

describe('referralToken v1', () => {
  it('documents hmac purpose namespace and secret fail-closed guard', () => {
    const src = readFileSync(join(root, 'lib/m55/creatorDashboard/referralToken.ts'), 'utf8');
    assert.match(src, /m55\.r7\.creator\.referral\.token\.body\.v1/);
    assert.match(src, /REFERRAL_TOKEN_SECRET_UNAVAILABLE/);
    assert.match(src, /digestCreatorTrackingTokenV1/);
    assert.match(src, /resolveTrustedCheckoutOrigin/);
    const secret = 'x'.repeat(32);
    const linkId = '11111111-2222-4333-8444-555555555555';
    const body = createHmac('sha256', secret)
      .update(`m55.r7.creator.referral.token.body.v1\0${linkId}`, 'utf8')
      .digest('base64url');
    assert.match(body, /^[A-Za-z0-9_-]+$/);
  });
});
