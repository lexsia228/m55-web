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

test('Creator discovery stays selective, separate from support, and footer-only', () => {
  const support = read('app/support/page.tsx');
  assert.doesNotMatch(support, /Creator Affiliateについて|creator-affiliate-terms/);

  const footer = read('app/_components/PublicFooter.tsx');
  assert.equal([...footer.matchAll(/href="\/creator"/g)].length, 1);
  assert.match(footer, /aria-label="Creator \/ Partner"/);
  assert.match(footer, /data-testid="m55-creator-partner-footer-link"/);
  assert.match(footer, />\s*Creator \/ Partner\s*</);

  const landing = read('app/creator/page.tsx');
  assert.match(landing, /個別審査制/);
  assert.doesNotMatch(landing, /人の目/);
  assert.doesNotMatch(landing, /人による審査/);
  assert.match(landing, /当社所定の基準に基づき審査します/);
  assert.match(landing, /一律のフォロワー最低数は設けず/);
  assert.match(landing, /自動参加できるオープンアクセス型ではありません/);
  assert.match(landing, /M55からの招待は、参加承認を保証するものではありません/);
});

test('all Creator acquisition and status pages are noindex and nofollow', () => {
  for (const page of [
    'app/creator/page.tsx', 'app/creator/apply/page.tsx',
    'app/creator/portal/page.tsx', 'app/creator/invite/[token]/page.tsx',
  ]) {
    assert.match(read(page), /robots: \{ index: false, follow: false \}/, page);
  }
});

test('Creator public routes reuse PublicShell without nested page-local main elements', () => {
  const layout = read('app/creator/layout.tsx');
  assert.match(layout, /import \{ PublicShell \} from ['"]\.\.\/_components\/PublicShell['"]/);
  assert.match(layout, /<PublicShell>\{children\}<\/PublicShell>/);

  for (const page of [
    'app/creator/page.tsx', 'app/creator/apply/page.tsx',
    'app/creator/portal/page.tsx', 'app/creator/invite/[token]/page.tsx',
  ]) {
    assert.doesNotMatch(read(page), /<main\b/, page);
  }
});

test('Creator public pages use the approved application-review and non-activation wording', () => {
  const landing = read('app/creator/page.tsx');
  const apply = read('app/creator/apply/page.tsx');
  const invite = read('app/creator/invite/[token]/page.tsx');
  assert.doesNotMatch([landing, apply, invite].join('\n'), /3〜5営業日/);
  assert.match(landing, /申請内容を確認のうえ、当社所定の基準に基づき審査します。確認のため、追加情報の提出をお願いする場合があります。申請またはM55からの招待は、参加承認を保証するものではありません。/);
  assert.doesNotMatch(apply, /人の目/);
  assert.match(apply, /当社所定の基準に基づき審査します/);
  assert.match(invite, /M55からの招待は、Creator Affiliateへの申請をご案内するものです。招待を受けたことにより、参加承認または報酬の発生が保証されるものではありません。/);
  assert.match(landing, /このページの公開は、紹介計測・報酬発生・報酬支払の開始を意味しません。/);
});

test('R4 source contains no cash, payout, commission, or attribution implementation', () => {
  const implementation = [
    'lib/m55/creatorDistribution/contract.ts', 'lib/m55/creatorDistribution/repository.ts',
    'lib/m55/creatorDistribution/security.ts', 'lib/m55/creatorDistribution/invite.ts',
    'lib/m55/creatorDistribution/review.ts',
  ].map(read).join('\n');
  assert.doesNotMatch(implementation, /stripe|connect account|bank account|commission ledger|attribution cookie/i);
});

const APPLICATION_PUBLIC_LABELS = {
  SUBMITTED: '申請受付済み',
  UNDER_REVIEW: '審査中',
  NEED_MORE_INFO: '追加情報が必要です',
  TERMS_REACCEPT_REQUIRED: '規約への再同意が必要です',
  APPROVED_PENDING_ACTIVATION: '承認済み・有効化待ち',
  REJECTED: '今回は承認されませんでした',
  BLOCKED: '現在ご利用いただけません',
} as const;

const PROFILE_PUBLIC_LABELS = {
  APPROVED_PENDING_ACTIVATION: '承認済み・有効化待ち',
  ACTIVE: '有効',
  SUSPENDED: '一時停止中',
  REVOKED: '利用停止',
} as const;

function objectLiteral(source: string, name: string) {
  const match = source.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\} as const satisfies`));
  assert.ok(match, `${name} map missing`);
  return match[1];
}

test('ProfileStatus type is derived from unchanged PROFILE_STATUSES', () => {
  const contract = read('lib/m55/creatorDistribution/contract.ts');
  assert.match(contract, /export type ProfileStatus = typeof PROFILE_STATUSES\[number\];/);
  assert.doesNotMatch(contract, /APPLICATION_PUBLIC_LABELS|PROFILE_PUBLIC_LABELS/);
});

test('Creator portal presents Japanese status labels without raw enum leakage', () => {
  const panel = read('app/creator/_components/CreatorPortalPanel.tsx');
  const applicationMap = objectLiteral(panel, 'APPLICATION_PUBLIC_LABELS');
  const profileMap = objectLiteral(panel, 'PROFILE_PUBLIC_LABELS');

  assert.equal(APPLICATION_STATUSES.length, 7);
  assert.equal(PROFILE_STATUSES.length, 4);
  for (const status of APPLICATION_STATUSES) {
    assert.match(applicationMap, new RegExp(`${status}: '${APPLICATION_PUBLIC_LABELS[status]}'`));
    assert.notEqual(APPLICATION_PUBLIC_LABELS[status], status);
  }
  for (const status of PROFILE_STATUSES) {
    assert.match(profileMap, new RegExp(`${status}: '${PROFILE_PUBLIC_LABELS[status]}'`));
    assert.notEqual(PROFILE_PUBLIC_LABELS[status], status);
  }

  assert.doesNotMatch(panel, /\{app\.status\}/);
  assert.doesNotMatch(panel, /\{profile\.status\}/);
  assert.match(panel, /publicStatusLabel\(app\.status, APPLICATION_PUBLIC_LABELS\)/);
  assert.match(panel, /publicStatusLabel\(profile\.status, PROFILE_PUBLIC_LABELS\)/);
  assert.match(panel, /UNKNOWN_PUBLIC_STATUS_LABEL = '状態を確認中'/);
  assert.match(panel, /Object\.hasOwn\(labels, status\) \? labels\[status\] : UNKNOWN_PUBLIC_STATUS_LABEL/);
  assert.doesNotMatch(panel, /return status/);
});

test('Creator portal preserves special next-action flows', () => {
  const panel = read('app/creator/_components/CreatorPortalPanel.tsx');
  assert.match(panel, /app\.status === 'NEED_MORE_INFO' && <p><Link href="\/support">/);
  assert.match(panel, /app\.status === 'TERMS_REACCEPT_REQUIRED'[\s\S]*href="\/legal\/creator-affiliate-terms"/);
  assert.match(panel, /action: 'REACCEPT_TERMS'/);
  assert.match(panel, />再同意する<\/button>/);
  assert.match(panel, /app\.status === 'REJECTED'[\s\S]*href="\/creator\/apply"/);
  assert.match(panel, /app\.status === 'BLOCKED'[\s\S]*href="\/support"/);
  assert.match(panel, /profile\.status === 'SUSPENDED'[\s\S]*href="\/support"/);
  assert.match(panel, /profile\.status === 'REVOKED'[\s\S]*href="\/support"|profile\.status === 'SUSPENDED' \|\| profile\.status === 'REVOKED'/);
});

test('pending-activation next action is shown once on the normal approved path', () => {
  const panel = read('app/creator/_components/CreatorPortalPanel.tsx');
  assert.match(panel, /app\.status === 'APPROVED_PENDING_ACTIVATION' && !profile && <p>有効化は別途ご案内します。<\/p>/);
  assert.match(panel, /profile\.status === 'APPROVED_PENDING_ACTIVATION' && <p>有効化は別途ご案内します。<\/p>/);
  assert.equal([...panel.matchAll(/有効化は別途ご案内します。/g)].length, 2);
});

test('Creator landing CTA uses existing M55 hierarchy without header recruitment', () => {
  const landing = read('app/creator/page.tsx');
  assert.match(landing, /from ['"]\.\.\/how-m55-works\/how-it-works\.module\.css['"]/);
  assert.match(landing, /className=\{styles\.ctaStack\}/);
  const primary = landing.match(/<Link href="\/creator\/apply" className=\{styles\.primaryCta\}>([^<]+)<\/Link>/);
  const secondary = landing.match(/<Link href="\/creator\/portal" className=\{styles\.secondaryCta\}>([^<]+)<\/Link>/);
  const terms = landing.match(/<Link href="\/legal\/creator-affiliate-terms">([^<]+)<\/Link>/);
  assert.equal(primary?.[1], 'Creatorとして申請する');
  assert.equal(secondary?.[1], '申請状況を見る');
  assert.equal(terms?.[1], 'Creator Affiliate利用規約');
  assert.ok(landing.indexOf('styles.ctaStack') < landing.indexOf('/legal/creator-affiliate-terms'));
  assert.doesNotMatch(landing, /人の目|人による審査|Human review|individual-review/);

  const header = read('components/shell/PublicHeader.tsx');
  assert.doesNotMatch(header, /\/creator/);
});
