import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from '../compatibility/compatibilityCommerceAuthority';
import { getCommercialProduct } from '../contracts/m55CommercialFunnelContract';
import { HOME_PAIR_READING_PUBLIC_HREF } from '../homePairReadingPublicContract';
import {
  PREMIUM_PRODUCT_SHELF_SECTION_ID,
  buildPremiumProductShelfModel,
} from './premiumProductShelf';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('premium product shelf — /dtr/lp compact merchandising', () => {
  it('keeps the original Self hero unchanged and shelf at h2', () => {
    const page = read('app/dtr/lp/page.tsx');
    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    const heroPos = page.indexOf('<h1 id="dtr-lp-hero"');
    const shelfPos = page.indexOf('<DtrPremiumProductShelf');
    assert.ok(heroPos >= 0);
    assert.ok(shelfPos > heroPos);
    assert.doesNotMatch(page, /lpHeroFamilyLabel/);
    assert.doesNotMatch(page, /<h2 id="dtr-lp-hero"/);
    assert.match(shelfComponent, /<h2 id="dtr-premium-shelf-title"/);
    assert.doesNotMatch(shelfComponent, /<h1/);
  });

  it('does not repeat Self Light or Self Full in the shelf', () => {
    const shelf = buildPremiumProductShelfModel();
    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    const serialized = JSON.stringify(shelf);

    assert.equal(shelf.sectionTitleJa, 'ほかのプレミアム商品');
    assert.doesNotMatch(serialized, /M55 プレミアムレポート ライト/);
    assert.doesNotMatch(serialized, /M55 プレミアムレポート フル/);
    assert.doesNotMatch(shelfComponent, /selfLight/);
    assert.doesNotMatch(shelfComponent, /selfFull/);
    assert.doesNotMatch(shelfComponent, /lpProductTierRow/);
  });

  it('contains only the Pair product with authoritative name and price', () => {
    const shelf = buildPremiumProductShelfModel();
    const pairProduct = getCommercialProduct('pairPremium');

    assert.equal(shelf.pairProduct.productNameJa, COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName);
    assert.equal(shelf.pairProduct.priceLabelJa, COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel);
    assert.equal(pairProduct.priceJpy, 1480);
    assert.match(shelf.pairProduct.priceLabelJa, /¥1,480/);
    assert.equal(shelf.pairProduct.oneTimeNoteJa, '買い切り・自動更新なし');
    assert.match(shelf.pairProduct.valueSentenceJa, /二人の違いやすれ違いの流れ/);

    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    assert.match(shelfComponent, /pairProduct\.productNameJa/);
    assert.match(shelfComponent, /pairProduct\.valueSentenceJa/);
  });

  it('routes Pair shelf CTA through /synastry without inventing checkout', () => {
    const shelf = buildPremiumProductShelfModel();
    assert.equal(shelf.pairProduct.ctaHref, HOME_PAIR_READING_PUBLIC_HREF);
    assert.equal(shelf.pairProduct.ctaHref, '/synastry');
    assert.equal(shelf.pairProduct.ctaLabelJa, '二人の無料結果から始める');

    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    assert.match(shelfComponent, /href=\{shelf\.pairProduct\.ctaHref\}/);
    assert.match(shelfComponent, /className="m55-lp-cta-btn"[\s\S]*data-testid="m55-premium-shelf-pair-cta"/);
    assert.doesNotMatch(shelfComponent, /m55-lp-cta-btn--secondary/);
    assert.doesNotMatch(shelfComponent, /\/synastry\/purchase/);
    assert.doesNotMatch(shelfComponent, /checkout/);
  });

  it('does not render FREE/Premium comparison or long benefit list on the shelf', () => {
    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    const serialized = JSON.stringify(buildPremiumProductShelfModel());

    assert.doesNotMatch(shelfComponent, /lpProductFreePremiumBridge/);
    assert.doesNotMatch(shelfComponent, /lpProductBenefitList/);
    assert.doesNotMatch(shelfComponent, /premiumBulletsJa/);
    assert.doesNotMatch(shelfComponent, /premiumSummaryJa/);
    assert.doesNotMatch(shelfComponent, /freeSummaryJa/);
    assert.doesNotMatch(serialized, /今の二人に何が起きているか/);
    assert.doesNotMatch(shelfComponent, /<ul/);
  });

  it('preserves Self purchase path and plan comparison section', () => {
    const page = read('app/dtr/lp/page.tsx');
    assert.match(page, /DtrPaidPurchasePrep/);
    assert.match(page, /id="m55-paid-questionnaire"/);
    assert.match(page, /PlanAnchorLink/);
    assert.match(page, /HeroPriceChips/);
  });

  it('does not alter HOME or global navigation', () => {
    const page = read('app/dtr/lp/page.tsx');
    assert.match(page, /<PublicShell>/);
    assert.doesNotMatch(page, /components\/home\//);
    assert.doesNotMatch(page, /PublicHeader/);
    assert.doesNotMatch(page, /app\/home\//);
  });

  it('does not merchandize forbidden public product names', () => {
    const shelf = buildPremiumProductShelfModel();
    const serialized = JSON.stringify(shelf);
    const page = read('app/dtr/lp/page.tsx');
    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    const combined = serialized + page + shelfComponent;
    assert.doesNotMatch(combined, /保存版/);
    assert.doesNotMatch(combined, /4章/);
  });

  it('places the shelf near the top purchase area after the Self hero', () => {
    const shelf = buildPremiumProductShelfModel();
    const page = read('app/dtr/lp/page.tsx');
    const heroPos = page.indexOf('id="dtr-lp-hero"');
    const shelfPos = page.indexOf('<DtrPremiumProductShelf');
    const savedSectionPos = page.indexOf('id="dtr-lp-saved"');
    const funnelPos = page.indexOf('<DtrPaidPurchasePrep');
    assert.ok(heroPos >= 0);
    assert.ok(shelfPos > heroPos);
    assert.ok(savedSectionPos > shelfPos);
    assert.ok(funnelPos > shelfPos);
    assert.equal(shelf.sectionId, PREMIUM_PRODUCT_SHELF_SECTION_ID);
  });
});
