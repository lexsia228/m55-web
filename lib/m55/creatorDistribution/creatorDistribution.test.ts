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
  assert.doesNotMatch(landing, /個別審査制|オープンアクセス型|誰でも自動参加|人の目|人による審査|Human review|individual-review/);
  assert.match(landing, /承認制Creator Affiliateプログラムです/);
  assert.match(landing, /当社所定の基準に基づき参加可否を審査します/);
  assert.match(landing, /一律のフォロワー最低数は設けず/);
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
  const portal = read('app/creator/portal/page.tsx');
  assert.doesNotMatch([landing, apply, invite, portal].join('\n'), /3〜5営業日/);
  assert.doesNotMatch([landing, apply, invite, portal].join('\n'), /人の目|人による審査|Human review|individual-review/);
  assert.match(landing, /当社所定の基準に基づき参加可否を審査します/);
  assert.match(apply, /当社所定の基準に基づき審査します/);
  assert.match(invite, /参加承認または報酬の発生が保証されるものではありません/);
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
  assert.match(panel, /app\.status === 'NEED_MORE_INFO'[\s\S]*href="\/support"/);
  assert.match(panel, /app\.status === 'TERMS_REACCEPT_REQUIRED'[\s\S]*href="\/legal\/creator-affiliate-terms"/);
  assert.match(panel, /action: 'REACCEPT_TERMS'/);
  assert.match(panel, />再同意する<\/button>/);
  assert.match(panel, /app\.status === 'REJECTED'[\s\S]*href="\/creator\/apply"/);
  assert.match(panel, /app\.status === 'BLOCKED'[\s\S]*href="\/support"/);
  assert.match(panel, /profile\.status === 'SUSPENDED'[\s\S]*href="\/support"|profile\.status === 'SUSPENDED' \|\| profile\.status === 'REVOKED'/);
  assert.match(panel, /profile\.status === 'REVOKED'[\s\S]*href="\/support"|profile\.status === 'SUSPENDED' \|\| profile\.status === 'REVOKED'/);
});

test('pending-activation next action is shown once on the normal approved path', () => {
  const panel = read('app/creator/_components/CreatorPortalPanel.tsx');
  assert.match(panel, /app\.status === 'APPROVED_PENDING_ACTIVATION' && !profile && <p>有効化は別途ご案内します。<\/p>/);
  assert.match(panel, /profile\.status === 'APPROVED_PENDING_ACTIVATION' && <p>有効化は別途ご案内します。<\/p>/);
  assert.equal([...panel.matchAll(/有効化は別途ご案内します。/g)].length, 2);
});

test('Creator landing CTA uses creator module hierarchy without header recruitment', () => {
  const landing = read('app/creator/page.tsx');
  assert.match(landing, /from ['"]\.\/creator\.module\.css['"]/);
  assert.match(landing, /className=\{styles\.ctaStack\}/);
  const primary = landing.match(/<Link href="\/creator\/apply" className=\{styles\.primaryCta\}>([^<]+)<\/Link>/);
  const secondary = landing.match(/<Link href="\/creator\/portal" className=\{styles\.secondaryCta\}>([^<]+)<\/Link>/);
  const terms = landing.match(/Creator Affiliate利用規約/);
  assert.equal(primary?.[1], 'Creatorとして申請する');
  assert.equal(secondary?.[1], '申請状況を見る');
  assert.ok(terms);
  assert.match(
    landing,
    /styles\.ctaStack[\s\S]*Creatorとして申請する[\s\S]*申請状況を見る[\s\S]*Creator Affiliate利用規約/,
  );
  assert.doesNotMatch(landing, /人の目|人による審査|Human review|individual-review/);

  const header = read('components/shell/PublicHeader.tsx');
  assert.doesNotMatch(header, /\/creator/);
});

test('Creator commercial onboarding UX presents step flow, trust facts, and terms summary', () => {
  const landing = read('app/creator/page.tsx');
  const css = read('app/creator/creator.module.css');
  for (const label of ['申請', '審査', '承認・開始準備']) {
    assert.match(landing, new RegExp(label));
  }
  for (const fact of ['参加費なし', '必須購入なし', '投稿ノルマなし', '一律のフォロワー最低数なし']) {
    assert.match(landing, new RegExp(fact));
  }
  assert.match(landing, /50%/);
  assert.match(landing, /40%/);
  assert.match(landing, /30%/);
  assert.match(landing, /紹介の判定/);
  assert.match(landing, /30日間/);
  assert.match(landing, /最後の有効な直接紹介/);
  assert.match(landing, /支払スケジュール/);
  assert.match(landing, /フォロワー数だけで参加可否を判断しません/);
  assert.doesNotMatch(landing, /最後の有効な直接Creator接触/);
  assert.doesNotMatch(landing, /M55の安全な紹介方針との大きな不一致/);
  assert.match(landing, /自分や関係性を決めつけずに読み解くための参考情報/);
  assert.match(landing, /ライト/);
  assert.match(landing, /フル/);
  assert.match(landing, /¥1,000/);
  assert.match(landing, /¥1,480/);
  assert.match(landing, /1回購入/);
  assert.match(landing, /Web上のレポート/);
  assert.match(landing, /購入時点の入力内容/);
  assert.match(landing, /読み返しやすく整理/);
  assert.doesNotMatch(landing, /診断|科学的|確実な予測|保証された結果/);
  assert.doesNotMatch(landing, /\/dtr\/core/);
  assert.doesNotMatch(landing, /購入後のレポート読み返し/);
  assert.doesNotMatch(landing, /紹介前に確認する/);
  assert.doesNotMatch(landing, /\/how-m55-works/);
  assert.doesNotMatch(landing, /\/legal\/refund/);
  assert.doesNotMatch(landing, /\/legal\/privacy/);
  assert.doesNotMatch(landing, /href="\/support"/);
  assert.equal([...landing.matchAll(/href="\/legal\/creator-affiliate-terms"/g)].length, 1);
  assert.match(landing, /Creator Affiliate利用規約/);
  assert.match(landing, /規約で定める報酬算定対象額/);
  assert.match(landing, /収入を保証するものではありません/);
  assert.match(landing, /標準30日間/);
  assert.match(landing, /支払申請は不要/);
  assert.match(landing, /20,000円未満/);
  assert.match(landing, /失効しません/);
  assert.match(landing, /770円/);
  assert.match(landing, /日本国内の金融機関口座/);
  assert.match(landing, /「PR」/);
  assert.match(landing, /アフィリエイト/);
  assert.match(landing, /カード情報/);
  assert.match(landing, /非公開・機微な分析内容/);
  assert.match(landing, /20,000円/);
  assert.match(landing, /翌月15日/);
  assert.match(landing, /このページの公開は、紹介計測・報酬発生・報酬支払の開始を意味しません。/);
  assert.match(css, /\.stepFlow/);
  assert.match(css, /\.factChip/);
  assert.match(css, /\.termsCard/);
  assert.match(css, /white-space:\s*pre-line/);
  assert.match(css, /\.ctaStack/);
  assert.match(css, /max-width:\s*360px/);
});

test('Creator apply and portal use branded auth cards without raw default buttons', () => {
  const apply = read('app/creator/apply/page.tsx');
  const portal = read('app/creator/portal/page.tsx');
  const form = read('app/creator/_components/CreatorApplicationForm.tsx');
  assert.match(apply, /className=\{styles\.buttonPrimary\}/);
  assert.match(apply, /ログインして申請へ進む/);
  assert.match(apply, /01[\s\S]*申請情報/);
  assert.doesNotMatch(apply, /<button type="button">ログイン/);
  assert.match(portal, /className=\{styles\.buttonPrimary\}/);
  assert.match(portal, /ログインして確認する/);
  assert.doesNotMatch(portal, /<button type="button">ログイン<\/button>/);
  assert.match(form, /審査を申し込む/);
  assert.match(form, /申請または招待は参加承認を保証するものではありません。/);
  assert.match(form, /公開メディア/);
  assert.match(form, /発信内容/);
  assert.match(form, /申請条件の確認/);
  assert.doesNotMatch(apply, /footerLinks/);
  assert.doesNotMatch(apply, /Creator Affiliate 規約[\s\S]*サポート/);
  assert.equal([...form.matchAll(/href="\/legal\/creator-affiliate-terms"/g)].length, 1);
  assert.match(form, /Creator Affiliate 規約/);
  assert.doesNotMatch(form, /Creator Affiliate 規約（2026-09-13-v1）/);
  assert.match(form, /termsVersion: '2026-09-13-v1'/);
});

type PrimaryMediaProjectionRow = {
  is_primary?: boolean;
  control_verification_status: string;
  control_verification_method: string | null;
};

function deriveCreatorPrimaryMediaVerification(
  mediaRows: PrimaryMediaProjectionRow[] | null | undefined,
) {
  const primary = mediaRows?.find((row) => row.is_primary);
  if (!primary) return null;
  if (primary.control_verification_status === 'VERIFIED') return 'VERIFIED';
  if (primary.control_verification_status === 'FAILED') return 'FAILED';
  if (primary.control_verification_status === 'PENDING' && primary.control_verification_method != null) {
    return 'ACTION_REQUIRED';
  }
  return null;
}

test('Creator portal projects primary media verification without exposing challenge secrets', () => {
  const repository = read('lib/m55/creatorDistribution/repository.ts');
  const panel = read('app/creator/_components/CreatorPortalPanel.tsx');
  const queue = read('app/internal/creator-review/_components/CreatorReviewQueue.tsx');

  assert.equal(deriveCreatorPrimaryMediaVerification([]), null);
  assert.equal(deriveCreatorPrimaryMediaVerification(undefined), null);
  assert.equal(
    deriveCreatorPrimaryMediaVerification([
      { is_primary: true, control_verification_status: 'PENDING', control_verification_method: null },
    ]),
    null,
  );
  assert.equal(
    deriveCreatorPrimaryMediaVerification([
      { is_primary: true, control_verification_status: 'PENDING', control_verification_method: 'DM_CHALLENGE' },
    ]),
    'ACTION_REQUIRED',
  );
  assert.equal(
    deriveCreatorPrimaryMediaVerification([
      { is_primary: true, control_verification_status: 'VERIFIED', control_verification_method: 'DM_CHALLENGE' },
    ]),
    'VERIFIED',
  );
  assert.equal(
    deriveCreatorPrimaryMediaVerification([
      { is_primary: true, control_verification_status: 'FAILED', control_verification_method: 'BIO_CHALLENGE' },
    ]),
    'FAILED',
  );

  assert.match(repository, /primary_media_verification/);
  assert.match(repository, /deriveCreatorPrimaryMediaVerification/);
  assert.match(
    repository,
    /m55_creator_application_media\(is_primary,control_verification_status,control_verification_method\)/,
  );
  assert.doesNotMatch(repository, /challenge_hash/);
  assert.doesNotMatch(repository, /challenge_plaintext|plaintext challenge/i);

  assert.match(panel, /primary_media_verification/);
  assert.match(panel, /mediaVerificationNextAction/);
  assert.match(panel, /運営確認が必要です。M55から届いた確認案内に従ってください。/);
  assert.match(panel, /案内が見当たらない場合は<Link href="\/support"/);
  assert.match(panel, /運営確認を完了できていません。/);
  assert.match(
    panel,
    /app\.status === 'SUBMITTED'[\s\S]*mediaVerificationNextAction\(app\.primary_media_verification\)[\s\S]*結果をお待ちください/,
  );
  assert.match(
    panel,
    /app\.status === 'UNDER_REVIEW'[\s\S]*mediaVerificationNextAction\(app\.primary_media_verification\)[\s\S]*審査結果をお待ちください/,
  );

  for (const rawLabel of [
    'MEDIA_CHALLENGE', 'DM_CHALLENGE', 'BIO_CHALLENGE', 'EXISTING_SCOUT_THREAD', 'MANUAL_OTHER',
  ]) {
    assert.doesNotMatch(panel, new RegExp(rawLabel));
  }
  assert.doesNotMatch(panel, /control_verification_method|control_verification_status/);
  assert.match(repository, /rejected_reapply_after,\s*\n\s*primary_media_verification: deriveCreatorPrimaryMediaVerification/);
  const applicationReturn = repository.match(/const application = rawApplication \? \{([\s\S]*?)\} : null;/)?.[1] ?? '';
  assert.doesNotMatch(applicationReturn, /\bm55_creator_application_media,/);
  assert.doesNotMatch(applicationReturn, /\bm55_creator_application_media:/);

  assert.match(queue, /安全な連絡経路でCreatorへ共有してください。このチャレンジは今回のみ表示されます。/);
  assert.match(queue, /チャレンジ（今回のみ表示）：/);
  assert.doesNotMatch(queue, /localStorage|sessionStorage|console\.log/);
});
