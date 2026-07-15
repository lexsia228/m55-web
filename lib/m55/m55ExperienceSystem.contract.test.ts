import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('four primary surfaces use the shared experience shell', () => {
  for (const path of [
    'app/core/page.tsx',
    'app/dtr/core/page.tsx',
    'app/synastry/page.tsx',
    'app/synastry/report/[reportId]/page.tsx',
  ]) {
    assert.match(read(path), /M55ExperienceShell/);
  }
});

test('procedural covers distinguish personal, compatibility, free, and paid', () => {
  const source = read('components/experience/M55ProductCover.tsx');
  assert.match(source, /kind: 'personal' \| 'compatibility'/);
  assert.match(source, /depth: 'free' \| 'paid'/);
  assert.match(source, /<svg/);
  assert.doesNotMatch(source, /<img|https?:\/\//);
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
  assert.match(source, /自分を読む/);
  assert.match(source, /二人を読む/);
  assert.match(source, /hasM55ContinueItem\(models\)/);
  assert.equal((source.match(/<IntentSurface/g) ?? []).length, 2);
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
