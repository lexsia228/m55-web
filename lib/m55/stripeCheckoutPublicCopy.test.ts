import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  STRIPE_CHECKOUT_PUBLIC_COPY,
  STRIPE_CHECKOUT_PUBLIC_COPY_ITEMS,
} from './stripeCheckoutPublicCopy';

const STRIPE_CHECKOUT_LEGACY_PUBLIC_TERMS = [
  '保存版',
  '相談返書',
  '相談',
  'FULL化',
  'FULL',
] as const;

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('stripeCheckoutPublicCopy — payment-moment contract', () => {
  it('keeps the four canonical public names', () => {
    assert.equal(
      STRIPE_CHECKOUT_PUBLIC_COPY.light.publicNameJa,
      'M55 プレミアムレポート ライト',
    );
    assert.equal(
      STRIPE_CHECKOUT_PUBLIC_COPY.full.publicNameJa,
      'M55 プレミアムレポート フル',
    );
    assert.equal(
      STRIPE_CHECKOUT_PUBLIC_COPY.upgrade.publicNameJa,
      'M55 プレミアムレポート フルへの切り替え',
    );
    assert.equal(STRIPE_CHECKOUT_PUBLIC_COPY.additionalReading.publicNameJa, '追加読み解き');
  });

  it('answers inclusion, Light/Full difference, and buy-once without legacy terms', () => {
    const { light, full, upgrade, additionalReading } = STRIPE_CHECKOUT_PUBLIC_COPY;
    assert.match(light.descriptionJa, /追加読み解き1件/);
    assert.match(light.descriptionJa, /フルと同じ/);
    assert.match(light.descriptionJa, /買い切り・自動更新なし/);
    assert.match(full.descriptionJa, /合計5件/);
    assert.match(full.descriptionJa, /ライトと同じ/);
    assert.match(full.descriptionJa, /買い切り・自動更新なし/);
    assert.match(upgrade.descriptionJa, /プレミアムレポートは増えません/);
    assert.match(upgrade.descriptionJa, /合計5件/);
    assert.match(upgrade.descriptionJa, /¥600/);
    assert.match(upgrade.descriptionJa, /¥1,600/);
    assert.match(upgrade.descriptionJa, /買い切り・自動更新なし/);
    assert.match(additionalReading.descriptionJa, /プレミアムレポート/);
    assert.match(additionalReading.descriptionJa, /1テーマ/);
    assert.match(additionalReading.descriptionJa, /会話を続ける形式ではありません/);
    assert.match(additionalReading.descriptionJa, /買い切り・自動更新なし/);

    for (const item of STRIPE_CHECKOUT_PUBLIC_COPY_ITEMS) {
      for (const term of STRIPE_CHECKOUT_LEGACY_PUBLIC_TERMS) {
        if (term === 'FULL') {
          assert.equal(/\bFULL\b/.test(item.descriptionJa), false, item.productKey);
          continue;
        }
        assert.equal(item.descriptionJa.includes(term), false, `${item.productKey} ${term}`);
        assert.equal(item.publicNameJa.includes(term), false, `${item.productKey} name ${term}`);
      }
      assert.equal(item.descriptionJa.length <= 800, true);
    }
  });

  it('does not let checkout source override Stripe Product copy', () => {
    const checkout = read('app/api/purchase/checkout/route.ts');
    const reply = read('app/api/reply-tickets/checkout/route.ts');
    assert.match(checkout, /line_items: \[/);
    assert.match(checkout, /price: priceId/);
    assert.doesNotMatch(checkout, /product_data/);
    assert.doesNotMatch(reply, /product_data/);
  });

  it('removes legacy Reflect Report and derives PaymentIntent description from STRIPE_CHECKOUT_PUBLIC_COPY', () => {
    const checkout = read('app/api/purchase/checkout/route.ts');
    assert.doesNotMatch(checkout, /Reflect Report/);
    assert.match(checkout, /STRIPE_CHECKOUT_PUBLIC_COPY\.light\.publicNameJa/);
    assert.match(checkout, /STRIPE_CHECKOUT_PUBLIC_COPY\.full\.publicNameJa/);
    assert.match(checkout, /resolveSavedReportPaymentIntentDescriptionJa/);
    assert.match(checkout, /description: paymentIntentDescription/);
    assert.match(checkout, /if \(!paymentIntentDescription\)/);
  });

  it('maps Light, legacy Static, and Full to distinct canonical publicNameJa without silent cross-default', () => {
    const checkout = read('app/api/purchase/checkout/route.ts');
    const resolverStart = checkout.indexOf('function resolveSavedReportPaymentIntentDescriptionJa');
    const resolverEnd = checkout.indexOf('function publicCheckoutError', resolverStart);
    assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
    const resolver = checkout.slice(resolverStart, resolverEnd);

    const lightName = STRIPE_CHECKOUT_PUBLIC_COPY.light.publicNameJa;
    const fullName = STRIPE_CHECKOUT_PUBLIC_COPY.full.publicNameJa;

    assert.equal(lightName, 'M55 プレミアムレポート ライト');
    assert.equal(fullName, 'M55 プレミアムレポート フル');
    assert.notEqual(lightName, fullName);

    assert.match(
      resolver,
      /if \(productId === DTR_CORE_FULL_V1\) \{\s*return STRIPE_CHECKOUT_PUBLIC_COPY\.full\.publicNameJa;\s*\}/,
    );
    assert.match(
      resolver,
      /if \(productId === DTR_CORE_LIGHT_V1 \|\| productId === DTR_CORE_STATIC_V1\) \{\s*return STRIPE_CHECKOUT_PUBLIC_COPY\.light\.publicNameJa;\s*\}/,
    );
    assert.match(resolver, /return null;/);
  });
});

describe('post-purchase pair continuation reuses the free synastry bridge', () => {
  it('places the existing quiet pair lens after the paid reader', () => {
    const page = read('app/dtr/core/page.tsx');
    const readerAt = page.indexOf('<DtrFullReader');
    const pairAt = page.indexOf('<CorePairReadingCrossSell');
    const upgradeAt = page.indexOf('<LightToFullUpgradeCta');
    assert.ok(readerAt > 0 && pairAt > 0 && upgradeAt > 0);
    assert.ok(readerAt < pairAt, 'paid reader must precede pair continuation');
    assert.ok(pairAt < upgradeAt, 'pair continuation must precede Light→Full upgrade');
    assert.doesNotMatch(page, /\/synastry\/purchase/);
  });

  it('keeps /my owned value ahead of the compatibility library', () => {
    const my = read('components/my/MyPanel.tsx');
    const ownedAt = my.indexOf('<SavedReportSection');
    const pairLibAt = my.indexOf('<CompatibilitySavedReportsLibrary');
    assert.ok(ownedAt > 0 && pairLibAt > 0);
    assert.ok(ownedAt < pairLibAt, 'owned Personal report must precede compatibility library');
  });
});
