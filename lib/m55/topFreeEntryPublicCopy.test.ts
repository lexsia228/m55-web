import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STATIC_M55_READ_STEPS } from '../../components/core/corePublicCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const FORBIDDEN_PUBLIC_TERMS = [
  'Entry Report',
  'DTR Core Static V1',
  '購入者専用ルーム',
  '相談ルーム',
  '永久閲覧',
  '永久',
  '無期限',
  '相談1回付属',
  '付属1件＋追加購入最大4件',
  '8章',
  '人物像と傾向',
  '本質と安定の条件',
  '活きる力',
  '占い',
  '鑑定',
  '運勢',
  '複数テーマ',
  '後から追加',
] as const;

const COPY_FILE = 'lib/m55/topFreeEntryPublicCopy.ts';

const ROUTE_FILES = {
  '/': 'app/page.tsx',
  '/home': 'components/home/HomePanel.tsx',
  '/core-static': 'components/core/corePublicCopy.ts',
  '/core-boundary': 'components/core/CoreFreeSavedBoundarySection.tsx',
  '/core-cta': 'components/core/CoreEntryReportCTASection.tsx',
  '/how-m55-works': 'app/how-m55-works/page.tsx',
  '/how-m55-works/receive': 'app/how-m55-works/components/what-you-can-do-section.tsx',
  '/how-m55-works/next': 'app/how-m55-works/components/next-step-section.tsx',
  '/how-m55-works/framework': 'app/how-m55-works/components/framework-section.tsx',
} as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readPage(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing page file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedPublicCopy(): string {
  return [COPY_FILE, ...Object.values(ROUTE_FILES)]
    .map((rel) => readPage(rel))
    .join('\n');
}

describe('topFreeEntryPublicCopy — Product Truth alignment', () => {
  it('maps top/free routes to existing page files', () => {
    for (const [route, rel] of Object.entries(ROUTE_FILES)) {
      assert.ok(existsSync(join(repoRoot, rel)), `${route} -> ${rel}`);
    }
  });

  it('includes M55 definition and three-layer free/saved/consult copy', () => {
    const blob = combinedPublicCopy();
    assert.match(blob, /自分の出方/);
    assert.match(blob, /今のテーマ/);
    assert.match(blob, /無料の見取り図/);
    assert.match(blob, /4章の保存版/);
    assert.match(blob, /相談返書/);
    assert.match(blob, /会話を続ける形式ではありません/);
  });

  it('includes storefront and home product truth with FULL before light', () => {
    const copy = readPage(COPY_FILE);
    const storefront = readPage(ROUTE_FILES['/']);
    const home = readPage(ROUTE_FILES['/home']);
    const { storefront: sf } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(sf.fullPlanNameJa, '保存版FULL');
    assert.equal(sf.fullPriceLabelJa, '¥1,480（税込）');
    assert.equal(sf.fullConsultReplyJa, '相談返書合計5件');
    assert.equal(sf.lightPlanNameJa, '保存版ライト');
    assert.equal(sf.lightPriceLabelJa, '¥1,000（税込）');
    assert.equal(sf.lightConsultReplyJa, '相談返書1件');
    assert.match(copy, /相談返書合計5件/);
    assert.match(copy, /相談返書1件/);
    assert.match(home, /storefront\.fullPlanNameJa/);
    assert.match(home, /storefront\.lightPlanNameJa/);
    assert.ok(
      storefront.indexOf('fullPlanNameJa') < storefront.indexOf('lightPlanNameJa'),
      'storefront renders FULL before light',
    );
    assert.ok(
      home.indexOf('storefront.fullPlanNameJa') < home.indexOf('storefront.lightPlanNameJa'),
      'home tier stack renders FULL before light',
    );
  });

  it('includes formal four chapters and saved-plan CTA targets', () => {
    const blob = combinedPublicCopy();
    const labels = TOP_FREE_ENTRY_PUBLIC_COPY.formalChapters.map((ch) => ch.labelJa);
    assert.deepEqual(labels, [
      'Ⅰ 輪郭を見る',
      'Ⅱ 構造を読む',
      'Ⅲ 無理を知る',
      'Ⅳ 楽に扱う',
    ]);
    assert.match(blob, /保存版のプランを見る/);
    assert.match(blob, /\/dtr\/lp/);
    assert.match(readPage(ROUTE_FILES['/home']), /FORMAL_CHAPTER_CHIPS/);
  });

  it('does not expose forbidden legacy terms in top/free public copy', () => {
    const blob = combinedPublicCopy();
    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      assert.equal(blob.includes(term), false, `forbidden term in top/free copy: ${term}`);
    }
  });

  it('uses saved-report formal language in corePublicCopy read steps', () => {
    const activeCopy = STATIC_M55_READ_STEPS.map((step) => step.body).join('\n');
    assert.match(activeCopy, /4章の保存版/);
    assert.match(activeCopy, /保存版に紐づく相談返書/);
    assert.match(activeCopy, /読み直す/);
    assert.equal(activeCopy.includes('本質の読み解き'), false);
  });
});
