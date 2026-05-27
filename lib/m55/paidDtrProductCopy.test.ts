import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAID_DTR_CHAPTERS,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_PRODUCT_IDENTITY,
  PAID_DTR_VALUE_PROPOSITION,
  collectPaidDtrPublicCopyStrings,
} from './paidDtrProductCopy';

describe('paidDtrProductCopy SSOT', () => {
  it('uses 4 chapters as current product truth', () => {
    assert.equal(PAID_DTR_CHAPTERS.length, 4);
    assert.deepEqual(
      PAID_DTR_CHAPTERS.map((c) => c.title),
      ['輪郭を見る', '構造を読む', '無理を知る', '楽に扱う']
    );
  });

  it('uses reply cap 5 and additional price ¥500', () => {
    assert.equal(PAID_DTR_CONSULT_REPLY.includedCount, 1);
    assert.equal(PAID_DTR_CONSULT_REPLY.additionalMaxPurchased, 4);
    assert.equal(PAID_DTR_CONSULT_REPLY.totalCapPerReport, 5);
    assert.equal(PAID_DTR_CONSULT_REPLY.additionalPriceYen, 500);
  });

  it('uses Japanese primary product identity', () => {
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.primaryNameJa, '本質の読み解き');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.formatLabel, '保存版');
    assert.equal(PAID_DTR_PRODUCT_IDENTITY.consultPrimaryTermJa, '相談返書');
  });

  it('primary value proposition avoids obsolete product truth and notification promises', () => {
    const primary = [
      PAID_DTR_VALUE_PROPOSITION.oneSentenceJa,
      PAID_DTR_VALUE_PROPOSITION.leadParagraphJa,
      PAID_DTR_PRODUCT_IDENTITY.primaryNameJa,
      PAID_DTR_PRODUCT_IDENTITY.shortNameJa,
    ].join('\n');

    const forbiddenInPrimary = [
      '8章',
      '８章',
      'max3',
      'max 3',
      '700円',
      '¥700',
      'Premium',
      'Blueprint',
      '準備完了メール',
      '返書完了メール',
    ] as const;

    for (const term of forbiddenInPrimary) {
      assert.equal(
        primary.includes(term),
        false,
        `primary copy must not include obsolete/forbidden term: ${term}`
      );
    }

    assert.equal(primary.includes('Entry Report'), false);
  });

  it('public copy corpus omits M55 email notification promises', () => {
    const corpus = collectPaidDtrPublicCopyStrings().join('\n');
    assert.equal(corpus.includes('準備完了メール'), false);
    assert.equal(corpus.includes('返書完了メール'), false);
    assert.equal(corpus.includes('プッシュ通知'), false);
  });
});
