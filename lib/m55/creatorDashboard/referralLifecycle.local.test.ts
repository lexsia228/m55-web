import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('referralLifecycle RPC boundary (static)', () => {
  it('names frozen issue and rotate RPCs', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/referralLifecycle.ts'), 'utf8');
    assert.match(src, /m55_r7_creator_referral_issue_or_get_v1/);
    assert.match(src, /m55_r7_creator_referral_rotate_v1/);
    assert.match(src, /p_expected_active_link_id/);
  });

  it('compares registry digest and issued link id before returning share url', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/referralLifecycle.ts'), 'utf8');
    assert.match(src, /REFERRAL_LINK_ROTATION_REQUIRED/);
    assert.match(src, /resolvedLinkId !== linkId/);
    assert.match(src, /after\.tokenDigest !== tokenDigest/);
  });

  it('keeps getCurrent read-only without issue_or_get RPC', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/referralLifecycle.ts'), 'utf8');
    const start = src.indexOf('export async function getCurrentReferralShareV1');
    const end = src.indexOf('export async function', start + 1);
    const block = end === -1 ? src.slice(start) : src.slice(start, end);
    assert.equal(block.includes('M55_R7_REFERRAL_ISSUE_RPC'), false);
    assert.equal(block.includes('issueOrGetReferralShareV1'), false);
    assert.match(block, /readShareUrlForActiveLinkV1/);
    assert.match(src, /legacyRotationRequired: true/);
  });

  it('binds issuedAt to persisted created_at rather than wall-clock now', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorDashboard/referralLifecycle.ts'), 'utf8');
    assert.match(src, /select\('id, token_digest, created_at'\)/);
    assert.match(src, /linkCreatedAt:/);
    assert.doesNotMatch(src, /issuedAt:.*new Date\(\)/);
    assert.match(src, /issuedAt: input\.linkCreatedAt/);
  });
});
