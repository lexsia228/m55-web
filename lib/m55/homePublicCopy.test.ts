import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');
const homePageSource = readFileSync(join(repoRoot, 'app/home/page.tsx'), 'utf8');

describe('homePublicCopy — public product truth', () => {
  it('uses the approved commercial hero without a definitive claim', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    const blob = [
      home.heroEyebrowJa,
      home.heroTitleLine1Ja,
      home.heroTitleLine2Ja,
      home.heroSubJa,
      home.heroTrustJa,
      home.heroMetaJa,
      home.heroFunnelCtaJa,
    ].join('\n');
    assert.equal(home.heroEyebrowJa, '自分と二人を無料で見る');
    assert.equal(home.heroMetaJa, '生年月日＋6つの質問・ログイン不要');
    assert.equal(home.heroFunnelCtaJa, '無料で見てみる');
    assert.match(blob, /あなたの「いつもこうなる」には/);
    assert.match(blob, /うまくいく時も、迷う時も/);
    assert.match(blob, /生年月日と今の回答/);
    assert.match(blob, /強み、判断の傾向、関係の特徴/);
    assert.match(blob, /「うまくいく条件」/);
    assert.doesNotMatch(blob, /無料解析|無料分析/);
    assert.doesNotMatch(blob, /原因が分かる|本当の自分|必ず/);
  });

  it('keeps one hero anchor to the sole free-intent section', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    const heroSource = homePanelSource.slice(
      homePanelSource.indexOf('data-testid="m55-home-hero"'),
      homePanelSource.indexOf('data-testid="m55-home-public-surface-shell"'),
    );
    assert.equal(home.heroFunnelCtaJa, '無料で見てみる');
    assert.equal((heroSource.match(/posterHeroCta/g) ?? []).length, 1);
    assert.match(heroSource, /href="#m55-home-free-intents"/);
    assert.doesNotMatch(heroSource, /href="\/core"|href="\/synastry"/);
  });

  it('makes personal and compatibility cards the free-entry authorities', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.readNextSectionTitleJa, 'どちらを解析しますか？');
    assert.equal(home.personalFreeCardJa.labelJa, '自分の無料解析');
    assert.equal(home.personalFreeCardJa.ctaJa, '自分を無料で見てみる');
    assert.equal(home.compatibilityFreeCardJa.labelJa, '二人の無料相性解析');
    assert.equal(home.compatibilityFreeCardJa.ctaJa, '二人の相性を無料で見てみる');
    assert.match(homePanelSource, /id="m55-home-free-intents"/);
    assert.match(homePanelSource, /href="\/core"/);
    assert.match(homePanelSource, /href="\/synastry"/);
    assert.deepEqual(home.personalFreeCardJa.metaJa, ['無料・ログイン不要', '生年月日＋6つの質問']);
    assert.deepEqual(home.compatibilityFreeCardJa.metaJa, ['無料・ログイン不要', '二人の生年月日＋6つの質問']);
    assert.match(home.personalFreeCardJa.resultItemsJa.join('\n'), /自然に力が出やすい場面/);
    assert.match(home.personalFreeCardJa.resultItemsJa.join('\n'), /迷いや疲れ/);
    assert.match(home.compatibilityFreeCardJa.resultItemsJa.join('\n'), /自然に合いやすいところ/);
    assert.match(home.compatibilityFreeCardJa.resultItemsJa.join('\n'), /すれ違いが始まりやすい場面/);
  });

  it('uses current light and FULL product truth without a single-price umbrella', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.match(home.paidPlanSavedInfoPriceJa, /個人解析ライト/);
    assert.match(home.paidPlanSavedInfoPriceJa, /¥1,000（税込・買い切り）/);
    assert.match(home.paidPlanSavedInfoPriceJa, /個人解析FULL/);
    assert.match(home.paidPlanSavedInfoPriceJa, /¥1,480（税込・買い切り）/);
    assert.match(home.paidPlanSavedInfoPriceJa, /後からFULL化 ¥600（税込）/);
    assert.match(home.paidPlanSavedInfoPriceJa, /追加読み解き1件/);
    assert.match(home.paidPlanSavedInfoPriceJa, /追加読み解き合計5件/);
    assert.doesNotMatch(home.paidPlanSavedInfoPriceJa, /M55複合暦解析は ¥1,000/);
  });

  it('shows commerce-paused compatibility copy from server authority', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.match(home.compatibilitySavedPausedJa, /準備中/);
    assert.match(home.compatibilitySavedPausedJa, /無料の相性解析は利用できます/);
    assert.match(homePageSource, /isCompatibilityCommerceEnabled/);
    assert.match(homePanelSource, /compatibilityCommerceAvailable/);
  });

  it('retains the poster and renders one commercial differentiation section', () => {
    assert.match(homePanelSource, /\/home\/hero-tech-map\.webp/);
    assert.match(homePanelSource, /data-m55-free-intents="true"/);
    assert.doesNotMatch(homePanelSource, /<details|m55-home-learn-more/);
    assert.equal((homePanelSource.match(/href="\/how-m55-works"/g) ?? []).length, 1);
    assert.match(homePanelSource, /methodPreviewFrameworkJa/);
    assert.match(homePanelSource, /methodComparisonJa/);
    assert.doesNotMatch(homePanelSource, /methodFlowNodesJa/);
  });

  it('keeps the paid continuation concise and links directly to the personal product page', () => {
    assert.match(homePanelSource, /data-testid="m55-home-paid-details"/);
    assert.match(homePanelSource, /href="\/dtr\/lp"/);
    assert.match(homePanelSource, /compatibilityPaidHeadlineJa/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanSavedInfoBodyJa, /仕事や人との関わり/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.compatibilityPaidHeadingJa, '2人の距離の読み解き');
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.compatibilityPaidAuxiliaryNameJa, '2人の関係整理レポート');
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.compatibilityPaidBodyJa, /選んだテーマについて詳しく読める/);
    assert.deepEqual(TOP_FREE_ENTRY_PUBLIC_COPY.home.compatibilityPaidOutcomesJa, [
      'あなた側に出やすい反応',
      '相手側に表れやすい傾向',
      '二人が自然に合いやすいところ',
      '互いを補いやすい違い',
      'すれ違いが始まりやすい場面',
      '選んだテーマについての詳しい結果',
    ]);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanOwnershipNoteJa, /マイページから後で読み返せます/);
    assert.doesNotMatch(homePanelSource, /m55-home-saved-preview/);
    assert.doesNotMatch(homePanelSource, /m55-home-bottom-funnel/);
  });

  it('does not advertise diagnosis, prediction, urgency, or stale product terms', () => {
    const blob = JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.home);
    for (const term of [
      'Entry Report',
      '未来が分かる',
      '性格が分かる',
      '科学的に証明',
      '残りわずか',
      '今だけ',
      'M55追加解析 1回分つき',
    ] as const) {
      assert.equal(blob.includes(term), false, `HOME must not include: ${term}`);
    }
  });
});
