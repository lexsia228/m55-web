import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('topFreeEntryPublicCopy — current public truth', () => {
  it('defines M55 with the approved commercial positioning', () => {
    const copy = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.match(copy.m55Definition.centerJa, /うまくいく流れ/);
    assert.match(copy.m55Definition.centerJa, /つまずきやすい流れ/);
    assert.match(copy.m55Definition.centerJa, /生年月日と6つの質問/);
    assert.match(copy.freeEntry.leadJa, /5つの傾向質問/);
    assert.match(copy.freeEntry.leadJa, /今の関心1問/);
  });

  it('keeps HOME emotional copy qualified and non-diagnostic', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.heroTitleLine1Ja, 'あなたの「いつもこうなる」には、');
    assert.equal(home.heroTitleLine2Ja, '順番がある。');
    assert.match(home.heroSubJa, /うまくいく時も、迷う時も/);
    assert.match(home.heroSubJa, /自然に合う時も、すれ違う時も/);
    assert.match(home.heroSubJa, /生年月日と今の回答/);
    assert.doesNotMatch(`${home.heroSubJa}\n${home.heroTrustJa}`, /本当の自分|原因が分かる|必ず/);
  });

  it('uses personal Light and FULL authorities without stale umbrella pricing', () => {
    const copy = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(copy.storefront.lightPriceLabelJa, PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa);
    assert.equal(copy.storefront.fullPriceLabelJa, PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa);
    assert.match(copy.home.paidPlanSavedInfoPriceJa, /個人解析ライト/);
    assert.match(copy.home.paidPlanSavedInfoPriceJa, /個人解析FULL/);
    assert.match(copy.home.paidPlanSavedInfoPriceJa, /税込・買い切り/);
    assert.doesNotMatch(copy.home.paidPlanSavedInfoPriceJa, /M55複合暦解析は ¥1,000/);
  });

  it('keeps the mechanism page current and crawler-readable', () => {
    const how = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
    const page = read('app/how-m55-works/page.tsx');
    const truth = read('app/how-m55-works/components/public-product-truth-section.tsx');
    assert.equal(how.heroHookJa, '生年月日だけで決めない。今のあなたまで重ねて読む。');
    assert.match(how.heroLeadJa, /生年月日から見る、変わりにくい傾向/);
    assert.match(how.section04FreeMapBodyJa, /生年月日と6つの質問/);
    assert.match(how.section02TitleJa, /個人解析レポート/);
    assert.match(how.section03ParagraphsJa.join('\n'), /二人分の生年月日/);
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
    assert.equal(copy.learnMore.homeHowLinkJa, '詳しい仕組みを見る');
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
