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

describe('premium product shelf — /dtr/lp minimal product addition', () => {
  it('keeps the original Self hero as the page H1 and shelf at h2', () => {
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

  it('lists Self Light, Self Full, and Pair as purchasable premium products', () => {
    const shelf = buildPremiumProductShelfModel();
    assert.equal(shelf.sectionTitleJa, 'プレミアム商品');
    assert.match(shelf.selfLight.publicNameJa, /M55 プレミアムレポート ライト/);
    assert.match(shelf.selfFull.publicNameJa, /M55 プレミアムレポート フル/);
    assert.equal(shelf.pairProduct.productNameJa, COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName);

    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    assert.match(shelfComponent, /selfLight\.publicNameJa/);
    assert.match(shelfComponent, /selfFull\.publicNameJa/);
    assert.match(shelfComponent, /pairProduct\.productNameJa/);
    assert.doesNotMatch(shelfComponent, /selfFamily/);
    assert.doesNotMatch(shelfComponent, /pairFamily/);
  });

  it('shows authoritative Pair Premium price and keeps Pair paid', () => {
    const shelf = buildPremiumProductShelfModel();
    const pairProduct = getCommercialProduct('pairPremium');
    assert.equal(shelf.pairProduct.priceLabelJa, COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel);
    assert.equal(pairProduct.priceJpy, 1480);
    assert.match(shelf.pairProduct.priceLabelJa, /¥1,480/);
    assert.doesNotMatch(shelf.pairProduct.priceLabelJa, /無料/);
    assert.match(shelf.pairProduct.purchaseNoteJa, /無料結果のあと/);
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

  it('explains Pair FREE → PREMIUM progression on the shelf', () => {
    const shelf = buildPremiumProductShelfModel();
    assert.match(shelf.pairProduct.freeSummaryJa, /今の二人/);
    assert.ok(shelf.pairProduct.premiumSummaryJa.length > 20);
    assert.ok(shelf.pairProduct.premiumBulletsJa.length >= 4);

    const shelfComponent = read('app/dtr/lp/DtrPremiumProductShelf.tsx');
    assert.match(shelfComponent, /lpProductFreePremiumBridge/);
    assert.match(shelfComponent, /無料/);
    assert.match(shelfComponent, /有料/);
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
