import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAID_DTR_PRICING_AUTHORITY_NOTE_JA } from './paidDtrProductCopy';
import {
  LAYERED_AUTHORITY_HELPER_FIXTURES,
  assertLayeredAuthorityTruthPresent,
  assertStrictStorefrontVocabularySafe,
  findLayeredAuthorityTruthViolations,
} from './testSupport/analysisAuthorityCopyAssertions';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

const PRICING_PAGE_PATH = 'app/pricing/page.tsx';

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('pricingPublicCopy — analysis authority lightweight note', () => {
  it('defines pricing authority note with layered Product Truth, not 回答差分 jargon', () => {
    assert.ok(PAID_DTR_PRICING_AUTHORITY_NOTE_JA.length > 0);
    assertLayeredAuthorityTruthPresent(PAID_DTR_PRICING_AUTHORITY_NOTE_JA, 'lightweight');
    assert.doesNotMatch(PAID_DTR_PRICING_AUTHORITY_NOTE_JA, /十二支|六十干支|複合占術|科学的|運命|未来予測/);
  });

  it('pricing authority note avoids forbidden public terms', () => {
    assertStrictStorefrontVocabularySafe(PAID_DTR_PRICING_AUTHORITY_NOTE_JA);
  });

  it('retires /pricing as permanent redirect to /dtr/lp; authority note SSOT remains', () => {
    const page = readRepoFile(PRICING_PAGE_PATH);
    assert.match(page, /permanentRedirect\s*\(\s*['"]\/dtr\/lp['"]\s*\)/);
    assertLayeredAuthorityTruthPresent(PAID_DTR_PRICING_AUTHORITY_NOTE_JA, 'lightweight');
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

describe('layered authority helper — semantic fixtures', () => {
  it('rejects the pre-remediation full authority corpus', () => {
    const hits = findLayeredAuthorityTruthViolations(
      LAYERED_AUTHORITY_HELPER_FIXTURES.OLD_FULL_AUTHORITY_CORPUS,
      'full',
    );
    assert.ok(hits.some((h) => h.includes('DOB+Premium-6 complete model')));
    assert.throws(() =>
      assertLayeredAuthorityTruthPresent(
        LAYERED_AUTHORITY_HELPER_FIXTURES.OLD_FULL_AUTHORITY_CORPUS,
        'full',
      ),
    );
  });

  it('rejects 生年月日と6問の回答から', () => {
    assert.throws(() =>
      assertLayeredAuthorityTruthPresent(LAYERED_AUTHORITY_HELPER_FIXTURES.DOB_PLUS_6Q_FROM, 'full'),
    );
  });

  it('rejects 生年月日と6問の回答をもとに in lightweight mode', () => {
    const blob = LAYERED_AUTHORITY_HELPER_FIXTURES.DOB_PLUS_6Q_BASED_ON;
    assert.ok(
      findLayeredAuthorityTruthViolations(blob, 'lightweight').some((h) =>
        h.includes('DOB+Premium-6 complete model'),
      ),
    );
    assert.throws(() => assertLayeredAuthorityTruthPresent(blob, 'lightweight'));
  });

  it('rejects 組み合わせて without real Premium emphasis in full mode', () => {
    const hits = findLayeredAuthorityTruthViolations(
      LAYERED_AUTHORITY_HELPER_FIXTURES.GENERIC_COMBINATION_ONLY,
      'full',
    );
    assert.ok(hits.some((h) => h.includes('emphasis/focus')));
    assert.throws(() =>
      assertLayeredAuthorityTruthPresent(
        LAYERED_AUTHORITY_HELPER_FIXTURES.GENERIC_COMBINATION_ONLY,
        'full',
      ),
    );
  });

  it('accepts sequential L1/L2/L3 full-mode copy', () => {
    assertLayeredAuthorityTruthPresent(
      LAYERED_AUTHORITY_HELPER_FIXTURES.CURRENT_THREE_LAYER_FULL,
      'full',
    );
  });

  it('accepts the current lightweight pricing authority note', () => {
    assertLayeredAuthorityTruthPresent(PAID_DTR_PRICING_AUTHORITY_NOTE_JA, 'lightweight');
  });
});
