import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '../..');
const PAGE = 'app/synastry/page.tsx';
const SITEMAP = 'app/sitemap.ts';

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function acquisitionBlock(page: string): string {
  const start = page.indexOf('data-testid="synastry-acquisition-content"');
  assert.ok(start >= 0, 'synastry acquisition block marker missing');
  const open = page.lastIndexOf('<div', start);
  const close = page.indexOf('</PublicShell>', start);
  assert.ok(open >= 0 && close > open, 'synastry acquisition block boundaries missing');
  return page.slice(open, close);
}

const EXACT_TITLE = '二人の違いとすれ違いを読み解く | M55';

const FORBIDDEN_TERMS = [
  '価値観',
  '相性診断',
  '相性スコア',
  '当たる',
  '占い',
  '運命',
  'プレミアム',
  '¥1,480',
  '買い切り',
  '恋愛',
  'なぜ',
  '扱い方',
  '試せる',
  '戻し方',
] as const;

describe('synastry acquisition search content', () => {
  it('preserves exact current metadata title', () => {
    const page = read(PAGE);
    assert.match(page, new RegExp(`const title = ['"]${EXACT_TITLE.replace(/\|/g, '\\|')}['"]`));
  });

  it('preserves canonical /synastry', () => {
    const page = read(PAGE);
    assert.match(page, /canonical:\s*['"]\/synastry['"]/);
    assert.match(page, /url:\s*['"]\/synastry['"]/);
  });

  it('renders acquisition block after CompatibilityGuestExperience', () => {
    const page = read(PAGE);
    const guestIdx = page.indexOf('<CompatibilityGuestExperience');
    const blockIdx = page.indexOf('data-testid="synastry-acquisition-content"');
    assert.ok(guestIdx >= 0 && blockIdx > guestIdx);
    assert.match(page, /CompatibilityGuestExperience[\s\S]*synastry-acquisition-content/);
  });

  it('includes required semantic headings and list items', () => {
    const page = read(PAGE);
    const block = acquisitionBlock(page);
    assert.match(block, /すれ違いは、合う・合わないだけでは決まりません/);
    assert.match(block, /この無料読み解きで見ること/);
    assert.match(page, /二人に重なりやすいところと、違いが出やすいところ/);
    assert.match(page, /今の二人に表れやすい反応や距離の取り方/);
    assert.match(page, /すれ違いが続くとき、どんなズレとして表れやすいか/);
  });

  it('naturally includes overlap, difference, distance, and misalignment vocabulary', () => {
    const block = acquisitionBlock(read(PAGE));
    for (const term of ['すれ違い', '距離', '重なり', '違い'] as const) {
      assert.match(block, new RegExp(term));
    }
  });

  it('states no-score and no-mind-reading boundary', () => {
    const block = acquisitionBlock(read(PAGE));
    assert.match(block, /相手の本音や未来を断定/);
    assert.match(block, /相性を点数で判定するものではありません/);
    assert.match(block, /二人分の生年月日と、今の二人に近い回答を使います/);
    assert.match(block, /回答するのはあなた本人です/);
  });

  it('keeps forbidden acquisition terms out of the rendered acquisition block', () => {
    const block = acquisitionBlock(read(PAGE));
    for (const term of FORBIDDEN_TERMS) {
      assert.equal(block.includes(term), false, `forbidden term present: ${term}`);
    }
    assert.doesNotMatch(block, /href=/);
  });

  it('uses shared m55-exp editorial utilities inside the acquisition block', () => {
    const block = acquisitionBlock(read(PAGE));
    assert.match(block, /m55-exp-reading/);
    assert.match(block, /m55-exp-section/);
    assert.match(block, /m55-exp-title/);
    assert.match(block, /m55-exp-body/);
    assert.match(block, /m55-exp-meta/);
  });

  it('does not mutate sitemap or add new public URLs', () => {
    const sitemap = read(SITEMAP);
    assert.match(sitemap, /["']\/synastry["']/);
    assert.doesNotMatch(read(PAGE), /sitemap/);
    assert.equal((sitemap.match(/\/synastry/g) ?? []).length, 1);
  });
});
