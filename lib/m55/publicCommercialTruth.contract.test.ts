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
  'components/core/CoreLockedState.tsx',
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
    assert.match(truth.inputs.personalJa.join('\n'), /5つの傾向質問/);
    assert.match(truth.inputs.personalJa.join('\n'), /合計6回答/);
    assert.match(truth.inputs.personalJa.join('\n'), /追加6問/);
    assert.match(truth.inputs.compatibilityJa.join('\n'), /二人分の生年月日/);
    assert.match(truth.inputs.compatibilityJa.join('\n'), /合計6問/);
    assert.doesNotMatch(truth.inputs.compatibilityJa.join('\n'), /6つ.*焦点.*追加/s);
    assert.match(truth.processing.personalFreeJa, /生成AIは使用しません/);
    assert.match(truth.processing.personalFreeJa, /5つの傾向質問・今の関心1問/);
    assert.match(truth.processing.personalSavedJa, /生成AIを使う場合があります/);
    assert.match(truth.processing.personalSavedJa, /無料の6問/);
    assert.match(truth.processing.personalSavedJa, /追加6問/);
    assert.match(truth.processing.personalAdditionalJa, /生成AI/);
    assert.match(truth.processing.compatibilitySavedJa, /生成AIは使用せず/);
    assert.match(truth.processing.compatibilitySavedJa, /2人の距離の読み解き/);
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
    assert.match(blob, /相性の優劣を示しません/);
    assert.match(blob, /意思決定に代わるものではありません/);
  });

  it('renders the mechanism guide as server HTML with ten required topics', () => {
    const page = read('app/how-m55-works/page.tsx');
    const section = read('app/how-m55-works/components/public-product-truth-section.tsx');
    assert.doesNotMatch(section, /['"]use client['"]/);
    assert.match(page, /PublicProductTruthSection/);
    for (const heading of [
      '1. 入力するもの',
      '2. 生年月日と今の状態を重ねる方法',
      '3. 無料解析で分かること',
      '4. 詳しいレポートで読めること',
      '5. 追加読み解き・生成AI',
      '6. 同じ入力を同じ手順で扱う部分',
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
    assert.match(personalResult, /5つの傾向回答・今の関心1問の合計6回答/);
    assert.match(read('components/core/CoreLockedState.tsx'), /自分の強みと、いつものパターンを無料で解析/);
    assert.match(personal, /今日の一歩/);
    assert.match(personal, /4章/);
    assert.match(compatibility, /最初に確かめる|次に一度だけ試す/);
    assert.match(compatibility, /あなた側に出やすい反応/);
    assert.match(compatibility, /選んだテーマについての詳しい結果/);
    assert.match(compatibility, /2人の距離の読み解きは現在準備中/);
  });

  it('shows material purchase terms and Stripe processing before checkout', () => {
    const personal = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const compatibility = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    const combined = `${personal}\n${compatibility}`;
    for (const term of [
      '税込・買い切り',
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
    assert.match(combined, /日本円（JPY）/);
    assert.match(combined, /買い切り・自動更新なし/);
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
    assert.match(layout, /生年月日と6つの質問/);
    assert.match(sitemap, /\/how-m55-works/);
    assert.match(sitemap, /\/dtr\/lp/);
    assert.match(robots, /\/synastry\/report\//);
    assert.match(footer, /M55の仕組み/);
    assert.match(footer, /料金/);
    assert.doesNotMatch(`${layout}\n${sitemap}\n${footer}`, /aggregateRating|reviewCount/);
  });

  it('integrates pricing into PublicShell with authoritative product states and terms', () => {
    const pricing = read('app/pricing/page.tsx');
    const pricingCss = read('app/pricing/pricing.module.css');
    assert.match(pricing, /<PublicShell>/);
    assert.doesNotMatch(pricing, /<main/);
    assert.match(pricing, /PAID_DTR_SAVED_REPORT_PRICING\.light/);
    assert.match(pricing, /PAID_DTR_SAVED_REPORT_PRICING\.full/);
    assert.match(pricing, /lightToFullUpgrade/);
    assert.match(pricing, /COMPATIBILITY_REPORT_PRODUCT_AUTHORITY/);
    assert.match(pricing, /isCompatibilityCommerceEnabled/);
    assert.match(pricing, /latestCompatibility/);
    assert.match(pricing, /data-testid="pricing-purchase-facts"/);
    assert.match(pricing, /通貨：<\/strong>日本円（JPY）/);
    assert.match(pricing, /支払い：<\/strong>買い切り・自動更新なし/);
    assert.match(pricing, /支払い確認後、購入したアカウントのマイページへ表示/);
    assert.match(pricing, /\/legal\/refund/);
    assert.doesNotMatch(pricing, /href="\/synastry\/purchase\/confirm"/);
    assert.match(pricing, /priceCurrency: "JPY"/);
    assert.equal((pricing.match(/日本円（JPY）/g) ?? []).length, 1);
    assert.match(pricing, /<h3>ライト<\/h3>/);
    assert.match(pricing, /<h3>FULL<\/h3>/);
    assert.match(pricing, /あとからFULLに変更/);
    assert.match(pricing, /2人の距離の読み解き/);
    assert.doesNotMatch(pricing, /相性解析レポート|有料相性解析|相性鑑定/);
    assert.match(pricingCss, /\.plans/);
    assert.match(pricingCss, /grid-template-columns/);
  });

  it('keeps one main landmark in PublicShell routes', () => {
    const shell = read('app/_components/PublicShell.tsx');
    assert.equal((shell.match(/<main/g) ?? []).length, 1);
    assert.match(shell, /<\/main>\s*<PublicFooter \/>/);
    for (const route of [
      'app/pricing/page.tsx',
      'app/support/page.tsx',
      'app/legal/refund/page.tsx',
      'app/legal/tokushoho/page.tsx',
      'app/legal/terms/page.tsx',
      'app/legal/privacy/page.tsx',
    ] as const) {
      assert.doesNotMatch(read(route), /<main/);
    }
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
