import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FORBIDDEN_PUBLIC_TERMS = [
  'Entry Report',
  'DTR Core Static V1',
  '相談ルーム',
  '購入者専用ルーム',
  '付属1件＋追加購入最大4件',
  '追加購入最大4件',
  '¥500',
  '￥500',
  '500円',
  '永久',
  '無期限',
  '何度でも',
] as const;

const ROUTE_FILES = {
  '/legal/terms': 'app/legal/terms/page.tsx',
  '/legal/refund': 'app/legal/refund/page.tsx',
  '/legal/privacy': 'app/legal/privacy/page.tsx',
  '/legal/tokushoho': 'app/legal/tokushoho/page.tsx',
  '/support': 'app/support/page.tsx',
} as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readPage(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing page file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedPublicCopy(): string {
  return Object.values(ROUTE_FILES)
    .map((rel) => readPage(rel))
    .join('\n');
}

describe('legalSupportPublicCopy — Product Truth alignment', () => {
  it('maps legal/support routes to existing page files', () => {
    for (const [route, rel] of Object.entries(ROUTE_FILES)) {
      assert.ok(existsSync(join(repoRoot, rel)), `${route} -> ${rel}`);
    }
  });

  it('includes tokushoho product truth for all three offerings', () => {
    const tokushoho = readPage(ROUTE_FILES['/legal/tokushoho']);
    assert.match(tokushoho, /保存版ライト/);
    assert.match(tokushoho, /¥1,000（税込）/);
    assert.match(tokushoho, /相談返書：1件/);
    assert.match(tokushoho, /保存版FULL/);
    assert.match(tokushoho, /¥1,480（税込）/);
    assert.match(tokushoho, /相談返書：合計5件/);
    assert.match(tokushoho, /ライトからFULL化/);
    assert.match(tokushoho, /¥600（税込）/);
    assert.match(tokushoho, /FULL化後：相談返書を合計5件/);
    assert.match(tokushoho, /合計¥1,600/);
  });

  it('includes terms consult reply counts for light, full, and upgrade', () => {
    const terms = readPage(ROUTE_FILES['/legal/terms']);
    assert.match(terms, /保存版ライト（¥1,000）には相談返書1件/);
    assert.match(terms, /保存版FULL（¥1,480）には相談返書が合計5件/);
    assert.match(terms, /ライト購入後にFULL化/);
  });

  it('includes support plan difference and full upgrade guidance', () => {
    const support = readPage(ROUTE_FILES['/support']);
    assert.match(support, /保存版ライトと保存版FULLでは、4章の保存版の内容は共通/);
    assert.match(support, /保存版ライト.*相談返書1件/s);
    assert.match(support, /保存版FULL.*相談返書合計5件/s);
    assert.match(support, /¥600でFULL化/);
    assert.match(support, /合計¥1,600/);
    assert.match(support, /最初からFULL.*¥1,480/s);
  });

  it('does not expose forbidden legacy or sales terms in public legal/support copy', () => {
    const blob = combinedPublicCopy();
    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      assert.equal(blob.includes(term), false, `forbidden term in legal/support: ${term}`);
    }
  });

  it('limits direct support email display to support and tokushoho pages', () => {
    const support = readPage(ROUTE_FILES['/support']);
    const tokushoho = readPage(ROUTE_FILES['/legal/tokushoho']);
    const refund = readPage(ROUTE_FILES['/legal/refund']);
    const terms = readPage(ROUTE_FILES['/legal/terms']);
    const privacy = readPage(ROUTE_FILES['/legal/privacy']);
    const ssot = readPage('lib/m55/accountDataControlPublicCopy.ts');

    assert.match(ssot, /support@m-55\.jp/);
    assert.match(ssot, /M55_PUBLIC_SUPPORT_MAILTO/);
    assert.match(support, /M55_PUBLIC_SUPPORT_EMAIL/);
    assert.match(support, /M55_PUBLIC_SUPPORT_MAILTO/);
    assert.match(tokushoho, /M55_PUBLIC_SUPPORT_EMAIL/);
    assert.match(tokushoho, /M55_PUBLIC_SUPPORT_MAILTO/);
    assert.equal(refund.includes('M55_PUBLIC_SUPPORT_EMAIL'), false);
    assert.equal(terms.includes('M55_PUBLIC_SUPPORT_EMAIL'), false);
    assert.equal(privacy.includes('M55_PUBLIC_SUPPORT_EMAIL'), false);
    assert.match(refund, /href="\/support"/);
    assert.equal(terms.includes('href="/support"'), false);
    assert.equal(terms.includes('href="/legal/'), false);
    assert.match(privacy, /ACCOUNT_DATA_REQUEST_HREF/);

    const blob = combinedPublicCopy();
    assert.equal(blob.includes('lexsia228@gmail.com'), false);
    assert.equal(blob.includes('lexsia228@gmail'), false);
  });
});

describe('legalSupportPublicCopy — body link dedup policy', () => {
  function countMatches(text: string, pattern: RegExp): number {
    return (text.match(pattern) || []).length;
  }

  it('support: no legal body links; mailto once', () => {
    const support = readPage(ROUTE_FILES['/support']);
    assert.equal(countMatches(support, /href="\/legal\//g), 0);
    assert.equal(countMatches(support, /href=\{M55_PUBLIC_SUPPORT_MAILTO\}/g), 1);
  });

  it('refund: support link once in body', () => {
    const refund = readPage(ROUTE_FILES['/legal/refund']);
    assert.equal(countMatches(refund, /href="\/support"/g), 1);
  });

  it('terms: no body cross-page links', () => {
    const terms = readPage(ROUTE_FILES['/legal/terms']);
    assert.equal(countMatches(terms, /href="\/(support|legal)/g), 0);
  });

  it('tokushoho: mailto once; refund link once; no support link', () => {
    const tokushoho = readPage(ROUTE_FILES['/legal/tokushoho']);
    assert.equal(countMatches(tokushoho, /href=\{M55_PUBLIC_SUPPORT_MAILTO\}/g), 1);
    assert.equal(countMatches(tokushoho, /href="\/legal\/refund"/g), 1);
    assert.equal(countMatches(tokushoho, /href="\/support"/g), 0);
  });

  it('privacy: support/data request link once', () => {
    const privacy = readPage(ROUTE_FILES['/legal/privacy']);
    assert.equal(countMatches(privacy, /href=\{ACCOUNT_DATA_REQUEST_HREF\}/g), 1);
  });
});
