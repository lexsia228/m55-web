import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION,
} from './analysisAuthorityReferenceModel';
import {
  PAID_DTR_LP,
  PAID_DTR_PRICING_AUTHORITY_NOTE_JA,
  collectPaidDtrLpCopyStrings,
} from './paidDtrProductCopy';
import {
  assertAuthorityVocabularyPresent,
  assertStrictStorefrontVocabularySafe,
} from './testSupport/analysisAuthorityCopyAssertions';

const LEGAL_SUPPORT_WIRED_SURFACES = {
  '/legal/terms': 'app/legal/terms/page.tsx',
  '/legal/privacy': 'app/legal/privacy/page.tsx',
  '/legal/tokushoho': 'app/legal/tokushoho/page.tsx',
  '/support': 'app/support/page.tsx',
} as const;

const DTR_LP_PAGE = 'app/dtr/lp/page.tsx';
const PRICING_PAGE = 'app/pricing/page.tsx';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readRepoFile(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function lpAuthorityNoteCorpus(): string {
  const note = PAID_DTR_LP.authorityNote;
  return [note.sectionTitleJa, note.headlineJa, ...note.bodyParagraphsJa].join('\n');
}

describe('storefrontAuthorityImportAlignment — wiring and role separation', () => {
  it('locks analysis authority reference model version', () => {
    assert.equal(M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION, 'v1');
  });

  it('wires legal/support surfaces to analysisAuthorityReferenceModel imports', () => {
    for (const [route, rel] of Object.entries(LEGAL_SUPPORT_WIRED_SURFACES)) {
      const page = readRepoFile(rel);
      assert.match(
        page,
        /analysisAuthorityReferenceModel/,
        `${route} must import analysisAuthorityReferenceModel`,
      );
    }
  });

  it('wires DTR LP through PAID_DTR_LP authorityNote chain', () => {
    const page = readRepoFile(DTR_LP_PAGE);
    assert.match(page, /PAID_DTR_LP/);
    assert.match(page, /authorityNote/);
    assert.equal(PAID_DTR_LP.authorityNote.bodyParagraphsJa.length, 3);
    assertAuthorityVocabularyPresent(lpAuthorityNoteCorpus());
  });

  it('wires pricing through PAID_DTR_PRICING_AUTHORITY_NOTE_JA', () => {
    const page = readRepoFile(PRICING_PAGE);
    assert.match(page, /PAID_DTR_PRICING_AUTHORITY_NOTE_JA/);
    assertAuthorityVocabularyPresent(PAID_DTR_PRICING_AUTHORITY_NOTE_JA);
  });

  it('keeps pricing lightweight and separate from LP authorityNote paragraphs', () => {
    const pricingNote = PAID_DTR_PRICING_AUTHORITY_NOTE_JA;
    const paragraphs = PAID_DTR_LP.authorityNote.bodyParagraphsJa;

    assert.equal(paragraphs.length, 3);
    assert.equal(pricingNote.includes('\n\n'), false);

    for (const paragraph of paragraphs) {
      assert.notEqual(pricingNote, paragraph);
      assert.equal(
        pricingNote.includes(paragraph),
        false,
        'pricing note must not duplicate LP authority paragraph verbatim',
      );
    }

    const pricingPage = readRepoFile(PRICING_PAGE);
    assert.equal(pricingPage.includes('M55が見ているもの'), false);
  });

  it('keeps strict storefront vocabulary safe on DTR LP and pricing authority copy', () => {
    assertStrictStorefrontVocabularySafe(collectPaidDtrLpCopyStrings().join('\n'));
    assertStrictStorefrontVocabularySafe(PAID_DTR_PRICING_AUTHORITY_NOTE_JA);
  });

  it('delegates Product Truth and checkout assertions to surface-owned tests', () => {
    const alignmentSrc = readRepoFile('lib/m55/storefrontAuthorityImportAlignment.test.ts');
    const wiringOnlySection = alignmentSrc.slice(
      0,
      alignmentSrc.indexOf('delegates Product Truth and checkout assertions'),
    );
    for (const needle of [
      'PAID_DTR_SAVED_REPORT_PRICING',
      'DTR_CORE_LIGHT_V1',
      'DTR_CORE_FULL_V1',
      'oneTimeCheckout',
      'PurchaseButton',
    ] as const) {
      assert.equal(
        wiringOnlySection.includes(needle),
        false,
        `alignment test must not duplicate Product Truth/checkout checks: ${needle}`,
      );
    }
  });
});
