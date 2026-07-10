import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAID_DTR_PRICING_AUTHORITY_NOTE_JA } from './paidDtrProductCopy';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

const PRICING_PAGE_PATH = 'app/pricing/page.tsx';

const REQUIRED_AUTHORITY_TERMS = [
  '日本の暦文化',
  '回答差分',
  '自己理解',
  '関係性整理',
  '参考情報',
] as const;

const FORBIDDEN_PRICING_TERMS = [
  '占い',
  '鑑定',
  '相談返書',
  '当たる',
  '相性が良い',
  '相性が悪い',
] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('pricingPublicCopy — analysis authority lightweight note', () => {
  it('defines pricing authority note with required vocabulary', () => {
    for (const term of REQUIRED_AUTHORITY_TERMS) {
      assert.ok(
        PAID_DTR_PRICING_AUTHORITY_NOTE_JA.includes(term),
        `pricing authority note must include: ${term}`,
      );
    }
  });

  it('pricing authority note avoids forbidden public terms', () => {
    for (const term of FORBIDDEN_PRICING_TERMS) {
      assert.equal(
        PAID_DTR_PRICING_AUTHORITY_NOTE_JA.includes(term),
        false,
        `pricing authority note must not include: ${term}`,
      );
    }
    assert.equal(/相性[0-9０-９]+%/.test(PAID_DTR_PRICING_AUTHORITY_NOTE_JA), false);
  });

  it('wires pricing page to SSOT constant and preserves /dtr/lp link', () => {
    const page = readRepoFile(PRICING_PAGE_PATH);
    assert.match(page, /PAID_DTR_PRICING_AUTHORITY_NOTE_JA/);
    assert.match(page, /href="\/dtr\/lp"/);
    assert.match(page, /保存版のプランを見る/);
  });

  it('pricing page does not add checkout or productKey wiring', () => {
    const page = readRepoFile(PRICING_PAGE_PATH).toLowerCase();
    assert.equal(page.includes('productkey'), false);
    assert.equal(page.includes('stripe'), false);
    assert.equal(page.includes('checkout'), false);
    assert.equal(page.includes('onetimecheckout'), false);
  });

  it('pricing page source avoids forbidden public terms', () => {
    const page = readRepoFile(PRICING_PAGE_PATH);
    for (const term of FORBIDDEN_PRICING_TERMS) {
      assert.equal(page.includes(term), false, `pricing page must not include: ${term}`);
    }
    assert.equal(/相性[0-9０-９]+%/.test(page), false);
  });
});
