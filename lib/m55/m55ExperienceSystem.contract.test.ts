import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('four primary surfaces use the shared experience shell', () => {
  for (const path of [
    'app/core/CorePageClient.tsx',
    'app/dtr/core/page.tsx',
    'app/synastry/page.tsx',
    'app/synastry/report/[reportId]/page.tsx',
  ]) {
    assert.match(read(path), /M55ExperienceShell/);
  }
});

test('procedural covers distinguish personal, compatibility, free, and paid', () => {
  const source = read('components/experience/M55ProductCover.tsx');
  const css = read('components/experience/M55ExperienceSystem.module.css');
  assert.match(source, /kind: 'personal' \| 'compatibility'/);
  assert.match(source, /depth: 'free' \| 'paid'/);
  assert.match(source, /<svg/);
  assert.doesNotMatch(source, /<img|https?:\/\//);
  assert.match(css, /--m55-accent:\s*#2f766f/);
  assert.match(css, /--m55-accent-secondary:\s*#aa6558/);
  assert.match(css, /\.cover-compatibility \.coverCore/);
  assert.match(css, /\.cover-compatibility\.cover-paid/);
});

test('commercial visual authority keeps warm paper, ink text, and quiet account depth', () => {
  const css = read('components/experience/M55ExperienceSystem.module.css');
  assert.match(css, /--m55-canvas:\s*#f5f0e8/);
  assert.match(css, /--m55-text-primary:\s*#22343a/);
  assert.match(css, /\.account\s*\{[\s\S]*--m55-canvas:\s*#f1eee8/);
  assert.match(css, /\.paid\s*\{[\s\S]*--m55-canvas:\s*#ebe5dc/);
});

test('decorative geometry has no private identifier vocabulary', () => {
  const source = read('components/experience/M55ProductCover.tsx');
  assert.doesNotMatch(
    source,
    /birthDate|dob|answerId|answerText|email|userId|reportId|stripe|clerk/i,
  );
});

test('reduced motion retains content and removes transitions', () => {
  const css = read('components/experience/M55ExperienceSystem.module.css');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /transition-duration:\s*0\.01ms/);
  assert.match(read('components/dtr/M55ReadingHome.tsx'), /M55ProductCover/);
});

test('reading home has two intent surfaces and conditional continuation', () => {
  const source = read('components/dtr/M55ReadingHome.tsx');
  assert.match(source, /自分の強みと、いつものパターンを解析する/);
  assert.match(source, /二人が合うところと、違いが表れやすい場面を解析する/);
  assert.match(source, /<h1>M55の解析<\/h1>/);
  assert.match(source, /hasM55ContinueItem\(models\)/);
  assert.equal((source.match(/<IntentSurface/g) ?? []).length, 2);
  assert.match(source, /hasCompletePersonalFreeAnswers/);
  assert.match(source, /sessionStorage\.getItem\('m55_free_answers_v1'\)/);
  assert.doesNotMatch(source, /setHasPersonalFreeResult\(ProfileRepository\.get\(user\?\.id\)\?\.birthDate != null\)/);
});

test('reading home preserves server authority and account center remains secondary', () => {
  const page = read('app/dtr/page.tsx');
  const readingHome = read('components/dtr/M55ReadingHome.tsx');
  const my = read('components/my/MyPanel.tsx');
  const readyApi = read('app/api/dtr/report-snapshot-ready/route.ts');
  assert.match(page, /resolveDtrShelfAccess/);
  assert.match(page, /href: access\.shelfCta\.href/);
  assert.match(page, /label: access\.shelfCta\.label/);
  assert.match(page, /canUpgradeFromLight=\{tier\?\.canUpgradeFromLight \?\? false\}/);
  assert.match(page, /upgradeReportInstanceId=\{tier\?\.reportInstanceId \?\? null\}/);
  assert.match(readingHome, /personalAuthority/);
  assert.match(readingHome, /primaryAction === 'recover_owned'/);
  assert.match(readingHome, /LightToFullUpgradeCta/);
  assert.match(readingHome, /canUpgradeFromLight && upgradeReportInstanceId/);
  assert.match(readingHome, /href: '\/my#my-purchase-heading'/);
  assert.match(my, /href="\/dtr"/);
  assert.match(my, /CompatibilitySavedReportsLibrary/);
  assert.match(readyApi, /shelfCta: access\.shelfCta/);
});

test('account center does not duplicate product or ownership authority', () => {
  const source = read('components/my/MyPanel.tsx');
  assert.doesNotMatch(source, /DtrCatalogStrip|function ConsultSection/);
  assert.doesNotMatch(source, /const ownsAny/);
  assert.match(source, /snap\.hasOwnership && snap\.ready/);
  assert.match(source, /snap\.shelfCta\.href/);
  assert.equal((source.match(/CompatibilitySavedReportsLibrary/g) ?? []).length, 2);
});

test('compatibility history retains every exact owned route and owner boundary', () => {
  const history = read('components/my/CompatibilitySavedReportsSection.tsx');
  const route = read('app/synastry/report/[reportId]/page.tsx');
  assert.match(history, /reports\.map\(\(report\)/);
  assert.match(history, /href=\{`\/synastry\/report\/\$\{report\.id\}`\}/);
  assert.match(history, /setError\(data\.available === false\)/);
  assert.match(route, /getOwnedCompatibilityReport\(userId, reportId\)/);
  assert.match(route, /if \(!report\) notFound\(\)/);
});

test('account center removes the unpurchased catalog and preserves deletion UI', () => {
  const source = read('components/my/MyPanel.tsx');
  assert.doesNotMatch(source, /DtrCatalogStrip/);
  assert.match(source, /SavedReportDeleteDialog/);
  assert.match(source, /AccountDataDeletionSubsection/);
  assert.match(source, /購入・利用情報/);
  assert.match(source, /データ管理/);
  assert.match(source, /ヘルプ/);
});

test('navigation uses the required labels and route', () => {
  const source = read('components/shell/PublicHeader.tsx');
  assert.match(source, /href: '\/core', label: '無料で見る'/);
  assert.match(source, /href: '\/dtr', label: '読み解き'/);
  assert.match(source, /href: '\/my', label: 'マイページ'/);
});

test('reading cards do not create nested interactive controls', () => {
  const source = read('components/dtr/M55ReadingHome.tsx');
  assert.doesNotMatch(source, /<Link[^>]*>[\s\S]{0,500}<button/);
  assert.doesNotMatch(source, /<button[^>]*>[\s\S]{0,500}<Link/);
});
