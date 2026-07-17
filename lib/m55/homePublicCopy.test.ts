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
const homeCssSource = readFileSync(join(repoRoot, 'components/home/HomePanel.module.css'), 'utf8');
const publicHeaderSource = readFileSync(join(repoRoot, 'components/shell/PublicHeader.tsx'), 'utf8');
const compatibilityMySource = readFileSync(
  join(repoRoot, 'components/my/CompatibilitySavedReportsSection.tsx'),
  'utf8',
);
const compatibilityConfirmSource = readFileSync(
  join(repoRoot, 'app/synastry/purchase/confirm/page.tsx'),
  'utf8',
);
const compatibilitySuccessSource = readFileSync(
  join(repoRoot, 'app/synastry/purchase/success/page.tsx'),
  'utf8',
);
const compatibilityStripeAuthoritySource = readFileSync(
  join(repoRoot, 'lib/m55/compatibility/compatibilityCommerceAuthority.ts'),
  'utf8',
);

describe('homePublicCopy — public product truth', () => {
  it('renders the approved one-second hero with exact copy and eight outcome labels', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.heroEyebrowJa, '自分と二人を無料で見る');
    assert.equal(
      `${home.heroTitleLine1Ja}${home.heroTitleLine2Ja}`,
      'あなたの「いつもこうなる」には、順番がある。',
    );
    assert.equal(home.heroMetaJa, '生年月日＋6つの質問・ログイン不要');
    assert.equal(home.heroFunnelCtaJa, '無料で見てみる');
    assert.deepEqual(home.heroPersonalPreviewJa.outcomesJa, [
      '今の自分に出ている特徴',
      '力が出やすい場面',
      '自分らしい決め方',
      '迷いやすい場面',
    ]);
    assert.deepEqual(home.heroCompatibilityPreviewJa.outcomesJa, [
      '二人の重なり',
      '合いやすいところ',
      '補い合いやすい違い',
      'すれ違いやすい場面',
    ]);
    assert.match(homePanelSource, />M55<\/p>/);
    assert.match(homePanelSource, /m55-home-hero-personal-preview/);
    assert.match(homePanelSource, /m55-home-hero-compatibility-preview/);
    assert.doesNotMatch(homePanelSource, /posterHeroPersonalVisual|posterHeroCompatibilityVisual/);
    assert.doesNotMatch(homePanelSource, /role="img"/);
    assert.doesNotMatch(homeCssSource, /\.posterHeroPersonalVisual|\.posterHeroCompatibilityVisual/);
    assert.match(homePanelSource, /m55-home-hero-product-proof/);
    assert.match(homePanelSource, /data-result-variant=\{compact \? 'compact' : 'full'\}/);
    assert.match(homeCssSource, /\.homeResultAccentPersonal/);
    assert.match(homeCssSource, /\.homeResultAccentCompatibility/);
    assert.match(homeCssSource, /\.posterHeroReadabilityVeil/);
    assert.match(homeCssSource, /\.posterMainVisual/);
    assert.match(homeCssSource, /background: #20383d/);
    assert.match(homeCssSource, /#b96962/);
    assert.match(homeCssSource, /#4e587c/);
  });

  it('keeps one accessible hero action and non-interactive preview panels', () => {
    const heroSource = homePanelSource.slice(
      homePanelSource.indexOf('data-testid="m55-home-hero"'),
      homePanelSource.indexOf('data-testid="m55-home-public-surface-shell"'),
    );
    const personalPreview = heroSource.slice(
      heroSource.indexOf('data-testid="m55-home-hero-personal-preview"'),
      heroSource.indexOf('data-testid="m55-home-hero-compatibility-preview"'),
    );
    const compatibilityPreview = heroSource.slice(
      heroSource.indexOf('data-testid="m55-home-hero-compatibility-preview"'),
      heroSource.indexOf('posterHeroBottomStack'),
    );
    assert.equal((heroSource.match(/posterHeroCta/g) ?? []).length, 1);
    assert.match(heroSource, /href="#m55-home-free-intents"/);
    assert.doesNotMatch(heroSource, /href="\/core"|href="\/synastry"/);
    assert.doesNotMatch(personalPreview, /<a(?:\s|>)|<button(?:\s|>)|role=/);
    assert.doesNotMatch(compatibilityPreview, /<a(?:\s|>)|<button(?:\s|>)|role=/);
    assert.match(heroSource, /\{homeCopy\.heroFunnelCtaJa\}\s*<\/a>/);
    assert.doesNotMatch(heroSource, /heroSubJa|heroTrustJa|posterHeroSupportInline|posterHeroTrust/);
    assert.doesNotMatch(heroSource, /HeroBackgroundMedia|<video/);
    assert.doesNotMatch(heroSource, /無料・3分|[\u{1F300}-\u{1FAFF}]/u);
    assert.doesNotMatch(heroSource, /rotateX|rotateY|perspective|mousemove|ripple/);
  });

  it('uses the existing background and premium CSS-first responsive surface', () => {
    assert.match(homePanelSource, /src="\/home\/hero-tech-map\.webp"/);
    assert.match(homeCssSource, /grid-template-areas:\s*"message outcomes"\s*"action outcomes"/);
    assert.match(homeCssSource, /grid-template-columns:\s*minmax\(0,\s*0\.618fr\)\s*minmax\(360px,\s*1fr\)/);
    assert.match(homeCssSource, /\.heroProductProofCard\s*\{[^}]*grid-template-rows:\s*auto 1fr/s);
    assert.match(homeCssSource, /\.heroProductProofCard ul\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    assert.match(homeCssSource, /\.posterHeroCta\s*\{[^}]*background:\s*#20383d/s);
    assert.match(homeCssSource, /@media \(prefers-reduced-motion: reduce\)/);
    assert.doesNotMatch(homeCssSource, /rotateX|rotateY|perspective|mousemove/);
  });

  it('makes both intent cards outcome-first with exactly four geometric cells and one CTA', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.readNextSectionTitleJa, 'どちらを見てみますか？');
    assert.equal(home.personalFreeCardJa.labelJa, '自分の無料解析');
    assert.equal(home.personalFreeCardJa.headlineJa, '自分の強みは、どんな時に出る？');
    assert.deepEqual(home.personalFreeCardJa.resultItemsJa, [
      '今の自分に出ている特徴',
      '力が出やすい場面',
      '自分らしい決め方',
      '迷いやすい場面',
    ]);
    assert.equal(home.personalFreeCardJa.resultItemsJa.length, 4);
    assert.equal(home.personalFreeCardJa.ctaJa, '自分を無料で見てみる');
    assert.equal(home.compatibilityFreeCardJa.labelJa, '二人の無料相性解析');
    assert.equal(home.compatibilityFreeCardJa.headlineJa, '二人は、どこで合い、どこで違う？');
    assert.deepEqual(home.compatibilityFreeCardJa.resultItemsJa, [
      '二人の重なり',
      '合いやすいところ',
      '補い合いやすい違い',
      'すれ違いやすい場面',
    ]);
    assert.equal(home.compatibilityFreeCardJa.resultItemsJa.length, 4);
    assert.equal(home.compatibilityFreeCardJa.ctaJa, '二人の相性を無料で見てみる');
    assert.deepEqual(home.personalFreeCardJa.metaJa, ['生年月日＋6問', '無料・ログイン不要']);
    assert.deepEqual(home.compatibilityFreeCardJa.metaJa, ['二人の生年月日＋6問', '無料・ログイン不要']);
    const personalCard = homePanelSource.slice(
      homePanelSource.indexOf('homeIntentPersonal'),
      homePanelSource.indexOf('homeIntentCompatibility'),
    );
    const compatibilityCard = homePanelSource.slice(
      homePanelSource.indexOf('homeIntentCompatibility'),
      homePanelSource.indexOf('m55-home-result-preview'),
    );
    assert.ok(personalCard.indexOf('resultItemsJa') < personalCard.indexOf('metaJa'));
    assert.match(personalCard, /isLoaded && hasProfile \? \(/);
    assert.equal((personalCard.match(/homeIntentAction/g) ?? []).length, 2);
    assert.ok(compatibilityCard.indexOf('resultItemsJa') < compatibilityCard.indexOf('metaJa'));
    assert.equal((compatibilityCard.match(/homeIntentAction/g) ?? []).length, 1);
    assert.match(homeCssSource, /\.homeIntentResult ul\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    assert.match(homeCssSource, /@media \(max-width: 340px\)[^{]*\{[\s\S]*?\.homeIntentResult ul\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });

  it('renders actual-result previews without fabricated identity or input data', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.resultPreviewHeadingJa, '答えると、こんな結果が見られます');
    assert.equal(home.resultPreviewCaptionJa, '結果画面のイメージ');
    assert.deepEqual(home.personalResultPreviewJa.itemsJa, [
      '今の自分に強く出ている特徴',
      '自然に力を発揮しやすい場面',
      '自分らしい考え方と選び方',
      '迷いやすさが表れやすい場面',
    ]);
    assert.deepEqual(home.compatibilityResultPreviewJa.itemsJa, [
      '二人の重なり',
      '自然に合いやすいところ',
      '魅力に感じやすい違い',
      'すれ違いが始まりやすい場面',
    ]);
    const previewSource = homePanelSource.slice(
      homePanelSource.indexOf('data-testid="m55-home-result-preview"'),
      homePanelSource.indexOf('data-testid="m55-home-five-axis-read"'),
    );
    assert.match(previewSource, /personalResultPreviewJa/);
    assert.match(previewSource, /compatibilityResultPreviewJa/);
    assert.doesNotMatch(previewSource, /nickname|birthDate|answers|山田|1990/);
    const resultSurfaceSource = homePanelSource.slice(
      homePanelSource.indexOf('function HomeResultSurface'),
      homePanelSource.indexOf('/* ── Component'),
    );
    assert.match(resultSurfaceSource, /data-result-kind=\{kind\}/);
    assert.match(resultSurfaceSource, /data-result-variant=/);
    assert.doesNotMatch(resultSurfaceSource, /<a(?:\s|>)|<button(?:\s|>)|<Image|<img|birthDate|answers/);
  });

  it('keeps Japanese headings exact and groups them by meaning', () => {
    assert.match(
      homePanelSource,
      /<span>自分の強みは、<\/span>\s*<span>どんな時に出る？<\/span>/,
    );
    assert.match(
      homePanelSource,
      /<span>二人は、どこで合い、<\/span>\s*<span>どこで違う？<\/span>/,
    );
    assert.match(
      homePanelSource,
      /<span>答えると、<\/span>\s*<span>こんな結果が見られます<\/span>/,
    );
    assert.match(homeCssSource, /word-break:\s*keep-all/);
    assert.match(homeCssSource, /line-break:\s*strict/);
    assert.match(homeCssSource, /text-wrap:\s*balance/);
    assert.doesNotMatch(homeCssSource, /word-break:\s*break-all/);
    assert.doesNotMatch(homePanelSource, /無料・3分/);
  });

  it('uses a HOME-local surface family and distinct CTA tiers', () => {
    assert.match(homeCssSource, /--home-paper:/);
    assert.match(homeCssSource, /--home-radius-major:\s*20px/);
    assert.match(homeCssSource, /--home-radius-card:\s*15px/);
    assert.match(homeCssSource, /--home-surface-shadow:/);
    assert.match(homeCssSource, /\.posterHeroCta\s*\{[^}]*background:\s*#20383d/s);
    assert.match(homeCssSource, /\.homeIntentAction\s*\{[^}]*background:\s*rgba\(47,\s*118,\s*111,\s*0\.11\)/s);
    assert.match(homeCssSource, /\.homePaidPlanDetailsCta\s*\{[^}]*border:\s*1px/s);
    assert.doesNotMatch(homeCssSource, /#(?:3b82f6|2563eb|ec4899|db2777|8b5cf6)/i);
  });

  it('uses approved user-outcome language and removes developer-facing HOME phrases', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.deepEqual(home.outcomeExplanationsJa, [
      {
        titleJa: '今の自分だから、見えてくることがある。',
        bodyJa: '同じ生年月日でも、今何を大切にしているか、どこで迷っているかによって、結果で強く表れる部分は変わります。',
      },
      {
        titleJa: '今の二人だから、見えてくる違いがある。',
        bodyJa: '二人の生年月日に、今の距離や会話についての回答を加えることで、現在の関係で表れやすい特徴を見ていきます。',
      },
    ]);
    assert.equal(home.methodPreviewLinkJa, '結果ができるまでを見る');
    const renderedHome = homePanelSource;
    for (const phrase of [
      '生年月日だけで決めない',
      '今のあなたまで重ねて読む',
      '変わりにくい傾向',
      '現在の表れ方',
      '情報二層',
      '変わりにくい土台',
    ]) {
      assert.equal(renderedHome.includes(phrase), false, `removed HOME phrase: ${phrase}`);
    }
  });

  it('puts four personal outcomes before plan and chapter support, then uses runtime prices', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.deepEqual(home.paidPlanOutcomesJa.map((item) => item.titleJa), [
      '強みが自然に出やすい条件',
      '自分らしい考え方と決め方',
      '人との関わりに表れやすい特徴',
      '迷いや疲れが始まりやすい流れ',
    ]);
    assert.match(home.paidPlanValueSubheadingJa, /レポートの内容は同じ/);
    assert.match(home.paidPlanLightJa.detailJa, /さらに1つ詳しく/);
    assert.match(home.paidPlanFullJa.detailJa, /合計5つまで詳しく/);
    assert.match(home.paidPlanUpgradeJa.detailJa, /合計5つまで増やせます/);
    assert.equal(home.paidPlanLightJa.priceJa, '¥1,000（税込・買い切り）');
    assert.equal(home.paidPlanFullJa.priceJa, '¥1,480（税込・買い切り）');
    assert.equal(home.paidPlanUpgradeJa.priceJa, '¥600（税込）');
    assert.ok(homePanelSource.indexOf('paidPlanOutcomesJa') < homePanelSource.indexOf('paidPlanChapterSupportJa'));
    assert.ok(homePanelSource.indexOf('paidPlanOutcomesJa') < homePanelSource.indexOf('paidPlanLightJa'));
    assert.match(homePanelSource, /data-testid="m55-home-paid-details"/);
    assert.match(homePanelSource, /href="\/dtr\/lp"/);
    assert.equal(home.paidPlanDetailsCtaJa, '詳しい個人レポートを見る');
  });

  it('keeps paid compatibility secondary, correctly named, and paused without checkout', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.compatibilityPaidHeadingJa, '2人の距離の読み解き');
    assert.equal(home.compatibilityPaidAuxiliaryNameJa, '2人の関係整理レポート');
    assert.deepEqual(home.compatibilityPaidOutcomesJa, [
      'あなた側に出やすい反応',
      '相手側に表れやすい傾向',
      '二人が自然に合いやすいところ',
      '互いを補いやすい違い',
      'すれ違いが始まりやすい場面',
      '選んだテーマについての詳しい結果',
    ]);
    assert.equal(
      home.compatibilitySavedPausedJa,
      '2人の距離の読み解きは現在準備中です。無料の相性解析は利用できます。',
    );
    const compatibilityBlock = homePanelSource.slice(
      homePanelSource.indexOf('className={styles.homePaidPlanCompatibility}'),
      homePanelSource.indexOf('</section>', homePanelSource.indexOf('className={styles.homePaidPlanCompatibility}')),
    );
    assert.doesNotMatch(compatibilityBlock, /purchase\/confirm|PurchaseButton/);
    assert.match(compatibilityBlock, /href="\/synastry"/);
    assert.match(homePageSource, /isCompatibilityCommerceEnabled/);
  });

  it('aligns purchaser-facing compatibility names without mutating Stripe authority', () => {
    const publicSurfaces = [
      compatibilityMySource,
      compatibilityConfirmSource,
      compatibilitySuccessSource,
    ].join('\n');
    assert.match(publicSurfaces, /2人の距離の読み解き/);
    assert.doesNotMatch(publicSurfaces, /二人の相性レポート/);
    assert.match(
      compatibilityStripeAuthoritySource,
      /COMPATIBILITY_REPORT_PUBLIC_NAME = '二人の相性レポート'/,
    );
  });

  it('places trust last and uses approved public navigation without route changes', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.trustHeadingJa, '結果は、あなたや二人を決めつけるものではありません。');
    assert.match(home.trustBodyJa, /未来や相手の本心を断定するものではなく/);
    assert.ok(homePanelSource.indexOf('homePaidPlanCompatibility') < homePanelSource.indexOf('className={styles.homeTrust}'));
    assert.match(publicHeaderSource, /\{ href: '\/core', label: '無料解析' \}/);
    assert.match(publicHeaderSource, /\{ href: '\/dtr', label: '結果・レポート' \}/);
    assert.match(publicHeaderSource, /\{ href: '\/my', label: 'マイページ' \}/);
    assert.match(publicHeaderSource, /ログイン/);
  });

  it('keeps desktop navigation and provides an accessible mobile menu', () => {
    assert.match(publicHeaderSource, /className=\{styles\.topNav\}/);
    assert.match(publicHeaderSource, /className=\{styles\.mobileMenuButton\}/);
    assert.match(publicHeaderSource, /aria-expanded=\{mobileMenuOpen\}/);
    assert.match(publicHeaderSource, /aria-controls="m55-public-mobile-menu"/);
    assert.match(publicHeaderSource, /aria-label="モバイルナビゲーション"/);
    assert.match(publicHeaderSource, /event\.key !== 'Escape'/);
    assert.match(publicHeaderSource, /mobileMenuButtonRef\.current\?\.focus\(\)/);
    assert.match(publicHeaderSource, /onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
    assert.match(publicHeaderSource, /href="\/core"[\s\S]*無料解析/);
    assert.match(publicHeaderSource, /href="\/dtr"[\s\S]*結果・レポート/);
    assert.match(publicHeaderSource, /href="\/my"[\s\S]*マイページ/);
  });

  it('does not advertise certainty, diagnosis, prediction, ranking, or urgency', () => {
    const blob = `${JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.home)}\n${homePanelSource}`;
    for (const term of [
      'Entry Report',
      '未来が分かる',
      '性格が分かる',
      '科学的に証明',
      '残りわずか',
      '今だけ',
      '相手の本心が分かる',
      '必ず改善',
      '相性スコア',
      'M55追加解析 1回分つき',
    ] as const) {
      assert.equal(blob.includes(term), false, `HOME must not include: ${term}`);
    }
  });
});
