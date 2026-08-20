import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAID_DTR_PRICING_AUTHORITY_NOTE_JA } from './paidDtrProductCopy';
import {
  assertAuthorityVocabularyPresent,
  assertStrictStorefrontVocabularySafe,
  REQUIRED_AUTHORITY_TERMS,
} from './testSupport/analysisAuthorityCopyAssertions';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

const PRICING_PAGE_PATH = 'app/pricing/page.tsx';

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('pricingPublicCopy — analysis authority lightweight note', () => {
  it('defines pricing authority note with required vocabulary', () => {
    assertAuthorityVocabularyPresent(
      PAID_DTR_PRICING_AUTHORITY_NOTE_JA,
      REQUIRED_AUTHORITY_TERMS,
    );
  });

  it('pricing authority note avoids forbidden public terms', () => {
    assertStrictStorefrontVocabularySafe(PAID_DTR_PRICING_AUTHORITY_NOTE_JA);
  });

  it('retires /pricing as permanent redirect to /dtr/lp; authority note SSOT remains', () => {
    const page = readRepoFile(PRICING_PAGE_PATH);
    assert.match(page, /permanentRedirect\s*\(\s*['"]\/dtr\/lp['"]\s*\)/);
    assertAuthorityVocabularyPresent(
      PAID_DTR_PRICING_AUTHORITY_NOTE_JA,
      REQUIRED_AUTHORITY_TERMS,
    );
  });

  it('pricing redirect page does not add checkout or productKey wiring', () => {
    const page = readRepoFile(PRICING_PAGE_PATH).toLowerCase();
    assert.equal(page.includes('productkey'), false);
    assert.equal(page.includes('stripe'), false);
    assert.equal(page.includes('checkout'), false);
    assert.equal(page.includes('onetimecheckout'), false);
  });

  it('pricing redirect page source avoids forbidden public terms', () => {
    assertStrictStorefrontVocabularySafe(readRepoFile(PRICING_PAGE_PATH));
  });
});
