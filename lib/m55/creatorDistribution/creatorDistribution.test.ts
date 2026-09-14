import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APPLICATION_STATUSES, applicationInput, approvalEvidenceInput, CREATOR_TERMS_VERSION, PROFILE_STATUSES, REVIEW_DIMENSIONS } from './contract';

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8');
const migration = read('supabase/migrations/20260914000000_m55_creator_distribution_foundation_v1.sql');

test('Creator terms source and R4 contract remain version-pinned', () => {
  const terms = read('app/legal/creator-affiliate-terms/page.tsx');
  assert.equal(CREATOR_TERMS_VERSION, '2026-09-13-v1');
  assert.match(terms, new RegExp(`CREATOR_AFFILIATE_TERMS_VERSION = ["']${CREATOR_TERMS_VERSION}["']`));
  assert.match(migration, new RegExp(`p_current_terms_version <> '${CREATOR_TERMS_VERSION}'`));
  assert.match(migration, /TERMS_REACCEPT_REQUIRED/);
});

test('application schema requires eligibility, terms, and public media without follower threshold', () => {
  const valid = applicationInput.parse({
    age18Plus: true, japanResident: true, termsAccepted: true,
    termsVersion: CREATOR_TERMS_VERSION, contentFocus: '美容とセルフケア',
    platform: 'Instagram', mediaUrl: 'https://www.instagram.com/example',
    audienceSize: 0, recentAvgViews: 0,
  });
  assert.equal(valid.audienceSize, 0);
  assert.equal(applicationInput.safeParse({ ...valid, age18Plus: false }).success, false);
  assert.equal(applicationInput.safeParse({ ...valid, termsVersion: 'stale-version' }).success, false);
});

test('state models preserve application lifecycle and durable profile enforcement states', () => {
  assert.deepEqual(APPLICATION_STATUSES, [
    'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO', 'TERMS_REACCEPT_REQUIRED',
    'APPROVED_PENDING_ACTIVATION', 'REJECTED', 'BLOCKED',
  ]);
  assert.deepEqual(PROFILE_STATUSES, ['APPROVED_PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'REVOKED']);
  assert.match(migration, /control_verification_status = 'VERIFIED'/);
  assert.match(migration, /economic_identity_id uuid not null unique/);
  assert.match(migration, /first_final_approved_at timestamptz not null/);
  assert.match(migration, /rejected_reapply_after is null or v_previous\.rejected_reapply_after > now\(\)/);
  assert.match(migration, /v_previous\.status = 'BLOCKED'/);
});

test('database boundary is server-only, atomic, and audit-oriented', () => {
  for (const table of ['invites', 'applications', 'application_media', 'review_events', 'profiles']) {
    assert.match(migration, new RegExp(`alter table public\\.m55_creator_${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on public\\.m55_creator_${table} from public, anon, authenticated`));
  }
  assert.match(migration, /security invoker set search_path = ''/);
  assert.match(migration, /CREATOR_REVIEW_EVENTS_APPEND_ONLY/);
  assert.match(migration, /m55_creator_approve_application_v1/);
  assert.match(migration, /status = 'ACCEPTED', accepted_at = now\(\)/);
  assert.doesNotMatch(migration, /raw_token|invite_token text/);
});

test('approval evidence requires all six explicit Human PASS ratings in API and atomic RPC', () => {
  const allPass = Object.fromEntries(REVIEW_DIMENSIONS.map((dimension) => [dimension, 'PASS']));
  assert.equal(REVIEW_DIMENSIONS.length, 6);
  assert.equal(approvalEvidenceInput.safeParse(allPass).success, true);
  assert.equal(approvalEvidenceInput.safeParse({ ...allPass, ENGAGEMENT_QUALITY: 'UNRATED' }).success, false);
  assert.equal(approvalEvidenceInput.safeParse({ ...allPass, CONTENT_FIT: undefined }).success, false);
  const review = read('lib/m55/creatorDistribution/review.ts');
  assert.match(review, /REVIEW_DIMENSIONS\.every\(\(dimension\) => evidence\[dimension\] === 'PASS'\)/);
  for (const parameter of [
    'p_activity_continuity', 'p_creator_track_record', 'p_engagement_quality',
    'p_audience_authenticity', 'p_content_fit', 'p_disclosure_readiness',
  ]) {
    assert.match(migration, new RegExp(`${parameter} is distinct from 'PASS'`));
    assert.match(migration, new RegExp(`'${parameter.slice(2).toUpperCase()}', ${parameter}`));
  }
  assert.match(migration, /APPROVAL_EVIDENCE_NOT_ALL_PASS/);
  const queue = read('app/internal/creator-review/_components/CreatorReviewQueue.tsx');
  assert.match(queue, /promotion_experience_safe/);
  assert.match(queue, /REVIEW_DIMENSIONS\.map/);
  assert.doesNotMatch(migration, /follower_minimum|follower_threshold/i);
});

test('both bearer-token pages declare a no-referrer policy', () => {
  for (const page of ['app/creator/apply/page.tsx', 'app/creator/invite/[token]/page.tsx']) {
    assert.match(read(page), /other: \{ referrer: 'no-referrer' \}/);
  }
});

test('R4 source contains no cash, payout, commission, or attribution implementation', () => {
  const implementation = [
    'lib/m55/creatorDistribution/contract.ts', 'lib/m55/creatorDistribution/repository.ts',
    'lib/m55/creatorDistribution/security.ts', 'lib/m55/creatorDistribution/invite.ts',
    'lib/m55/creatorDistribution/review.ts',
  ].map(read).join('\n');
  assert.doesNotMatch(implementation, /stripe|connect account|bank account|commission ledger|attribution cookie/i);
});
