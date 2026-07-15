import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('topFreeEntryPublicCopy — current public truth', () => {
  it('defines M55 with calendar rhythm plus current answers', () => {
    const copy = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.match(copy.m55Definition.centerJa, /生年月日の暦リズム/);
    assert.match(copy.m55Definition.centerJa, /選択式の質問/);
    assert.match(copy.freeEntry.leadJa, /5つの短い質問/);
    assert.match(copy.freeEntry.leadJa, /今の関心/);
  });

  it('keeps HOME emotional copy qualified and non-diagnostic', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.heroTitleLine1Ja, '生まれた日と、いまの答えから。');
    assert.equal(home.heroTitleLine2Ja, '自分の輪郭を、読み解く。');
    assert.match(home.heroSubJa, /生年月日の暦リズム/);
    assert.match(home.heroSubJa, /選択式の質問/);
    assert.match(home.heroTrustJa, /未来や性格を断定する診断ではありません/);
  });

  it('uses personal Light and FULL authorities without stale umbrella pricing', () => {
    const copy = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(copy.storefront.lightPriceLabelJa, PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa);
    assert.equal(copy.storefront.fullPriceLabelJa, PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa);
    assert.match(copy.home.paidPlanSavedInfoPriceJa, /保存版ライト/);
    assert.match(copy.home.paidPlanSavedInfoPriceJa, /保存版FULL/);
    assert.doesNotMatch(copy.home.paidPlanSavedInfoPriceJa, /M55複合暦解析は ¥1,000/);
  });

  it('keeps the mechanism page current and crawler-readable', () => {
    const how = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
    const page = read('app/how-m55-works/page.tsx');
    const truth = read('app/how-m55-works/components/public-product-truth-section.tsx');
    assert.equal(how.heroHookJa, '生まれた日と、いまの答えから。');
    assert.match(how.heroLeadJa, /選択式の質問/);
    assert.match(how.section04FreeMapBodyJa, /5つの質問・今の関心/);
    assert.match(page, /PublicProductTruthSection/);
    assert.doesNotMatch(truth, /['"]use client['"]/);
  });

  it('uses current free, saved, and additional-reading terms', () => {
    const blob = JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY);
    assert.match(blob, /無料の見取り図/);
    assert.match(blob, /4章の保存版/);
    assert.match(blob, /追加読み解き/);
    assert.match(blob, /会話を続ける形式ではありません/);
    assert.doesNotMatch(blob, /Entry Report/);
    assert.doesNotMatch(blob, /M55追加解析 1回分つき/);
  });

  it('keeps public method and product routes exact', () => {
    const copy = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(copy.cta.coreFreeHref, '/core');
    assert.equal(copy.cta.viewSavedPlansHref, '/dtr/lp');
    assert.equal(copy.learnMore.homeHowLinkJa, 'M55の仕組み');
    assert.equal(copy.learnMore.homeTenViewsLinkJa, '10資質の見方');
  });

  it('removes DOB-only definitive claims from active top/free source', () => {
    const blob = [
      read('lib/m55/topFreeEntryPublicCopy.ts'),
      read('components/home/HomePanel.tsx'),
      read('app/how-m55-works/page.tsx'),
    ].join('\n');
    for (const claim of [
      '生まれた日から、自分が見える',
      '生年月日から、自分が分かる',
      '生年月日で本質が分かる',
      '性格が分かる',
      '未来が分かる',
      '科学的に証明',
    ] as const) {
      assert.equal(blob.includes(claim), false, `stale claim: ${claim}`);
    }
  });
});
