import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  M55_PUBLIC_COMMERCIAL_TRUTH,
  M55_USER_FACING_POSITIONING_COPY,
} from './analysisAuthorityReferenceModel';
import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from './compatibility/compatibilityCommerceAuthority';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const PUBLIC_COPY_FILES = [
  'lib/m55/topFreeEntryPublicCopy.ts',
  'components/home/HomePanel.tsx',
  'app/how-m55-works/components/public-product-truth-section.tsx',
  'components/dtr/M55ReadingHome.tsx',
  'components/core/CoreFreeIntroSection.tsx',
  'components/core/CoreFreeResultSummaryHub.tsx',
  'components/compatibility/CompatibilityGuestExperience.tsx',
  'components/compatibility/CompatibilityPurchaseExperience.tsx',
  'app/dtr/lp/page.tsx',
  'app/pricing/page.tsx',
] as const;

describe('public commercial truth contracts', () => {
  it('separates personal and compatibility inputs and processing layers', () => {
    const truth = M55_PUBLIC_COMMERCIAL_TRUTH;
    assert.match(truth.inputs.personalJa.join('\n'), /本人の生年月日/);
    assert.match(truth.inputs.personalJa.join('\n'), /5つの選択式質問/);
    assert.match(truth.inputs.compatibilityJa.join('\n'), /二人分の生年月日/);
    assert.match(truth.inputs.compatibilityJa.join('\n'), /6つの選択式質問/);
    assert.match(truth.processing.personalFreeJa, /生成AIは使用しません/);
    assert.match(truth.processing.personalSavedJa, /生成AIを使う場合があります/);
    assert.match(truth.processing.personalAdditionalJa, /生成AI/);
    assert.match(truth.processing.compatibilitySavedJa, /生成AIは使用せず/);
  });

  it('uses product authorities for prices, chapters, replies, and one-time terms', () => {
    const truth = M55_PUBLIC_COMMERCIAL_TRUTH;
    assert.equal(truth.commercial.personal.chapterCount, 4);
    assert.equal(truth.commercial.personal.light.priceYen, PAID_DTR_SAVED_REPORT_PRICING.light.priceYen);
    assert.equal(truth.commercial.personal.full.priceYen, PAID_DTR_SAVED_REPORT_PRICING.full.priceYen);
    assert.equal(truth.commercial.personal.light.includedReplyCount, 1);
    assert.equal(truth.commercial.personal.full.totalReplyCap, 5);
    assert.equal(truth.commercial.compatibility.chapterCount, 6);
    assert.equal(
      truth.commercial.compatibility.priceYen,
      COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceYen,
    );
    assert.match(truth.commercial.billingJa, /一回払い/);
    assert.match(truth.commercial.billingJa, /自動更新はありません/);
  });

  it('keeps public limitations free of diagnosis, prediction, score, and decision substitution', () => {
    const blob = [
      ...M55_USER_FACING_POSITIONING_COPY,
      ...M55_PUBLIC_COMMERCIAL_TRUTH.limitationsJa,
    ].join('\n');
    assert.match(blob, /医学的・心理学的な診断/);
    assert.match(blob, /未来予測/);
    assert.match(blob, /相性の点数/);
    assert.match(blob, /意思決定に代わるものではありません/);
  });

  it('renders the mechanism guide as server HTML with ten required topics', () => {
    const page = read('app/how-m55-works/page.tsx');
    const section = read('app/how-m55-works/components/public-product-truth-section.tsx');
    assert.doesNotMatch(section, /['"]use client['"]/);
    assert.match(page, /PublicProductTruthSection/);
    for (const heading of [
      '1. 入力するもの',
      '2. M55が整理する方法',
      '3. 無料で表示するもの',
      '4. 保存版で追加されるもの',
      '5. 追加読み解き・生成AI',
      '6. 固定ルール部分',
      '7. 行わないこと',
      '8. 個人情報と保存',
      '9. 商品と支払い',
      '10. 問い合わせ',
    ] as const) {
      assert.match(section, new RegExp(heading.replace('.', '\\.')));
    }
  });

  it('shows complete free value and concrete paid continuation', () => {
    const personal = read('components/core/corePublicCopy.ts');
    const personalResult = read('components/core/CoreFreeResultSummaryHub.tsx');
    const compatibility = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(personalResult, /5つの回答・今の関心/);
    assert.match(personal, /今日の一歩/);
    assert.match(personal, /4章/);
    assert.match(compatibility, /最初に確かめる|次に一度だけ試す/);
    assert.match(compatibility, /6つの場面/);
    assert.match(compatibility, /保存版は準備中/);
  });

  it('shows material purchase terms and Stripe processing before checkout', () => {
    const personal = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const compatibility = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    const combined = `${personal}\n${compatibility}`;
    for (const term of [
      '日本円（JPY）',
      '自動更新',
      '提供時期',
      '購入したアカウント',
          'paymentProcessorJa',
      '/support',
      '/legal/refund',
      '/legal/terms',
      '/legal/privacy',
      '/legal/tokushoho',
    ] as const) {
      assert.match(combined, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(M55_PUBLIC_COMMERCIAL_TRUTH.commercial.paymentProcessorJa, /環境により異なります/);
  });

  it('keeps current public copy free of DOB-only definitive and stale product claims', () => {
    const blob = PUBLIC_COPY_FILES.map(read).join('\n');
    for (const term of [
      '生まれた日から、自分が見える',
      '生年月日で本質が分かる',
      '性格が分かる',
      '相性が分かる',
      '未来が分かる',
      '科学的に証明',
      'Entry Report',
      'M55複合暦解析は ¥1,000',
    ] as const) {
      assert.equal(blob.includes(term), false, `stale public claim: ${term}`);
    }
  });

  it('publishes crawler metadata, sitemap, robots, canonical routes, and public evidence links', () => {
    const layout = read('app/layout.tsx');
    const sitemap = read('app/sitemap.ts');
    const robots = read('app/robots.ts');
    const footer = read('app/_components/PublicFooter.tsx');
    assert.match(layout, /metadataBase/);
    assert.match(layout, /選択式の質問/);
    assert.match(sitemap, /\/how-m55-works/);
    assert.match(sitemap, /\/dtr\/lp/);
    assert.match(robots, /\/synastry\/report\//);
    assert.match(footer, /M55の仕組み/);
    assert.match(footer, /料金/);
    assert.doesNotMatch(`${layout}\n${sitemap}\n${footer}`, /aggregateRating|reviewCount/);
  });

  it('uses canonical additional-reading href and privacy-safe existing analytics', () => {
    const reading = read('components/dtr/M55ReadingHome.tsx');
    const my = read('components/my/MyPanel.tsx');
        const analytics = read('lib/m55/privacySafeFunnelAnalytics.ts');
    assert.match(reading, /MY_CONSULT_CTA_HREF/);
    assert.doesNotMatch(reading, /href="\/reply"/);
    assert.match(reading, /additionalReadingEntryView/);
    assert.match(my, /M55_FUNNEL_EVENTS\.savedReportOpen/);
        assert.match(analytics, /eventVersion/);
        assert.match(analytics, /occurredAt/);
        assert.match(analytics, /surface/);
        assert.doesNotMatch(analytics, /birthDate:|answers:|reportId:|userId:|stripeId:/);
  });
});
