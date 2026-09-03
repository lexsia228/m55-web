import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const OLD_PRODUCT_NAMES = ['M55複合暦解析', 'M55追加解析', '複合解析'] as const;

const FORBIDDEN_HOME_PRIMARY_LABELS = [
  '10通りの見方',
  '10タイプ',
  '基本タイプ',
  '各タイプ',
  '読み返せる',
  '保存版',
] as const;

const FREE_HERO_PRIMARY_LABEL_FIELDS = [
  'heroEyebrowJa',
  'heroTitleLine1Ja',
  'heroTitleLine2Ja',
  'heroSupportJa',
  'heroPosterSupportJa',
  'heroTrustJa',
  'heroPosterCtaJa',
  'freeResultHeadlineJa',
  'freeResultBodyJa',
  'freeResultPreviewLabelJa',
  'freeResultCtaJa',
  'freeResultSupportJa',
  'outcomeBridgeEyebrowJa',
  'tenAssetTeaserEyebrowJa',
  'tenAssetTeaserHeadlineJa',
  'tenAssetTeaserLinkJa',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');
const homePanelCss = readFileSync(join(repoRoot, 'components/home/HomePanel.module.css'), 'utf8');

const heroStartIndex = homePanelSource.indexOf('data-testid="m55-home-hero"');
const heroSource = homePanelSource.slice(
  heroStartIndex,
  homePanelSource.indexOf('</section>', heroStartIndex) + '</section>'.length,
);

const lowerSource = homePanelSource.slice(homePanelSource.indexOf('data-testid="m55-home-lower"'));

describe('homePublicCopy — frozen poster hero preservation', () => {
  it('uses the approved poster copy fields untouched', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.heroEyebrowJa, '自分のこと、人との関係を読み解く');
    assert.equal(home.heroTitleLine1Ja, 'あなたの「いつもこうなる」には、');
    assert.equal(home.heroTitleLine2Ja, '順番がある。');
    // Outcome first, then the low-friction input line the poster has always had.
    // Each line stays inside one 320px row, so neither wraps mid-clause.
    assert.equal(
      home.heroPosterSupportJa,
      '力が出る場面と、重くなる流れが見えます。\n生年月日と、今の自分に近い答えを選ぶだけ。',
    );
    assert.equal(home.heroTrustJa, 'ログイン不要');
    assert.equal(home.heroPosterCtaJa, '無料で見てみる');
    assert.match(home.heroSupportJa, /自己理解の入口です/);
  });

  it('renders exactly one runtime-visible Hero action via mutually exclusive hydration-aware branches', () => {
    const noProfileBranch = heroSource.match(
      /\{\(!hydrationReady \|\| !hasProfile\) && \(\s*<button[\s\S]*?<\/button>\s*\)\}/,
    )?.[0];
    const hasProfileBranch = heroSource.match(
      /\{hydrationReady && hasProfile && \(\s*<Link[\s\S]*?<\/Link>\s*\)\}/,
    )?.[0];
    assert.ok(noProfileBranch, 'expected a (!hydrationReady || !hasProfile) hero button branch');
    assert.ok(hasProfileBranch, 'expected a hydrationReady && hasProfile hero Link branch');

    const withoutGatedActions = heroSource
      .replace(noProfileBranch!, '')
      .replace(hasProfileBranch!, '');
    assert.equal((withoutGatedActions.match(/<(a|button|Link)(?=[\s/>])/g) ?? []).length, 0);
    assert.equal((withoutGatedActions.match(/role=["']button["']/g) ?? []).length, 0);

    assert.match(noProfileBranch!, /type="button"/);
    assert.match(noProfileBranch!, /data-testid="m55-home-open-birth-intake"/);
    assert.match(noProfileBranch!, /className=\{styles\.posterHeroCta\}/);
    assert.match(noProfileBranch!, /onClick=\{openIntake\}/);
    assert.match(noProfileBranch!, /\{freeCtaLabel\}/);

    assert.match(hasProfileBranch!, /href=\{homeCtaHref\}/);
    assert.match(hasProfileBranch!, /data-testid="m55-home-has-profile-hero"/);
    assert.match(hasProfileBranch!, /className=\{styles\.posterHeroCta\}/);
    assert.match(hasProfileBranch!, /\{freeCtaLabel\}/);

    assert.equal((heroSource.match(/<a[\s/>]/g) ?? []).length, 0);
    assert.equal((heroSource.match(/<Link[\s/>]/g) ?? []).length, 1);
    assert.match(heroSource, /\{homeCopy\.heroPosterSupportJa\}/);
    assert.match(heroSource, /\{homeCopy\.heroTrustJa\}/);
    assert.match(heroSource, />M55<\/p>/);
    assert.match(heroSource, /\{homeCopy\.heroEyebrowJa\}/);
    assert.match(heroSource, /posterMainVisual/);
  });

  it('uses responsive approved R3 Web candidates and no review, master, or legacy images in Hero', () => {
    for (const path of [
      '/home/m55-b2c-r3-hero-desktop.avif',
      '/home/m55-b2c-r3-hero-desktop.webp',
      '/home/m55-b2c-r3-hero-desktop.jpg',
      '/home/m55-b2c-r3-hero-mobile.avif',
      '/home/m55-b2c-r3-hero-mobile.webp',
      '/home/m55-b2c-r3-hero-mobile.jpg',
    ]) {
      assert.match(heroSource, new RegExp(path.replaceAll('/', '\\/')));
      assert.equal(existsSync(join(repoRoot, 'public', path)), true);
    }
    assert.match(heroSource, /<picture/);
    assert.match(heroSource, /width="1440"/);
    assert.match(heroSource, /height="1000"/);
    assert.match(heroSource, /alt=""/);
    assert.match(heroSource, /loading="eager"/);
    assert.match(heroSource, /fetchPriority="high"/);
    assert.match(heroSource, /decoding="async"/);
    assert.equal(heroSource.includes('hero-tech-map'), false);
    assert.equal(heroSource.includes('HeroBackgroundMedia'), false);
    assert.doesNotMatch(heroSource, /review|mock|comparison|master-4320x3000/);
  });
});

describe('homePublicCopy — lower HOME final IA (below the frozen poster)', () => {
  it('renders lower sections in exact SSOT order', () => {
    const stages = [
      { label: 'm55-home-product-map', index: lowerSource.indexOf('data-testid="m55-home-product-map"') },
      { label: 'm55-home-free-preview', index: lowerSource.indexOf('data-testid="m55-home-free-preview"') },
      { label: 'HomePairFreeSection', index: lowerSource.indexOf('<HomePairFreeSection') },
      { label: 'm55-home-premium-preview', index: lowerSource.indexOf('data-testid="m55-home-premium-preview"') },
      { label: 'm55-home-mechanism', index: lowerSource.indexOf('data-testid="m55-home-mechanism"') },
      { label: 'm55-home-final-cta', index: lowerSource.indexOf('data-testid="m55-home-final-cta"') },
    ] as const;
    for (const stage of stages) {
      assert.notEqual(stage.index, -1, `missing lower HOME section: ${stage.label}`);
    }
    for (let i = 1; i < stages.length; i += 1) {
      assert.ok(
        stages[i].index > stages[i - 1].index,
        `${stages[i].label} must render after ${stages[i - 1].label}`,
      );
    }
  });

  it('removes merged-away and legacy lower HOME sections', () => {
    for (const removed of [
      'm55-home-outcome-bridge',
      'm55-home-ten-assets',
      'm55-home-existing-user',
      'HomeMechanismPanels',
      'HomeTenAssetTiles',
      'm55-home-ten-asset-grid',
      'm55-home-ten-views-link',
      'homeReadNextSection',
      'homeMethodLayer',
      'homePaidPlan',
      'homePaidPlanSavedPreview',
      'homePaidPlanFunnel',
      'm55-home-saved-preview',
      'm55-home-bottom-funnel',
      'm55-home-hero-funnel',
      'm55-home-report-shell',
      'm55-home-learn-more',
      'm55-home-free-result',
      'uniquenessChips',
      'paidPlanUniquenessChipsJa',
      'paidPlanSavedPreviewChaptersJa',
      'm55-home-plan-comparison-cta',
      'm55-home-existing-report',
      'm55-home-existing-my',
    ] as const) {
      assert.equal(homePanelSource.includes(removed), false, `must not render removed section/key: ${removed}`);
    }
    assert.notEqual(homePanelSource.indexOf('data-testid="m55-home-plan-comparison"'), -1);
  });

  it('does not expose old product names or forbidden primary labels in rendered HOME copy', () => {
    for (const name of OLD_PRODUCT_NAMES) {
      assert.equal(homePanelSource.includes(name), false, `HomePanel.tsx must not reference: ${name}`);
    }
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    const freeHeroPrimaryBlob = FREE_HERO_PRIMARY_LABEL_FIELDS.map((key) => home[key]).join('\n');
    for (const term of FORBIDDEN_HOME_PRIMARY_LABELS) {
      assert.equal(
        freeHeroPrimaryBlob.includes(term),
        false,
        `free/hero primary copy must not include forbidden term: ${term}`,
      );
    }
    const homeBlob = JSON.stringify(home);
    assert.equal(
      homeBlob.includes('保存版'),
      false,
      'home copy must not include forbidden legacy term: 保存版',
    );
  });

  it('uses approved exact copy freeze strings for key sections', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.outcomeBridgeEyebrowJa, 'M55で見えてくること');
    assert.equal(
      home.freeResultHeadlineJa,
      '無料で、今の自分に出やすい反応と、\n整え方の入口を知る。',
    );
    assert.equal(
      home.freeResultBodyJa,
      '下の表示例のように、出やすい反応と、それが活きる場面・重くなる場面まで返ります。',
    );
    assert.equal(home.outcomeBridgeItemsJa[1].titleJa, '人と関わるときの自分の動き');
    assert.equal(home.mechanismEyebrowJa, 'M55の見方');
    assert.equal(home.mechanismHeadlineJa, '変わりにくい土台と、\nいまの答えを重ねて見る。');
    assert.equal(
      home.mechanismBodyJa,
      '使うのは、生年月日と、いま選んだ答えだけ。\n自分を見るときも、二人の関係を見るときも、同じ見方です。\nほかの利用者との比較や、外部から取得した情報は使いません。',
    );
    assert.equal(home.mechanismEthicsJa, '一つの情報だけで、人を決めない。');
    assert.equal(home.mechanismDiagramOutputJa, '今表れやすい流れ');
    assert.equal(home.premiumHeadlineJa, '自分の力が出やすい条件と、\n負担が重なり始める流れを読み解く。');
    assert.equal(
      home.premiumBodyJa,
      '生年月日から見える基礎傾向と、いまの回答をもとに、\n自分の動き方、人との距離感、\n負担が重なり始める流れ、整え方を\nプレミアムレポートとして整理します。',
    );
    assert.equal(home.finalCtaHeadlineJa, 'まずは、今の自分を知るところから。');
    assert.equal(home.pairFreeCtaJa, '二人の関係を無料で見てみる');
    assert.equal(home.freeResultPreviewLabelJa, '無料結果の表示例');
    assert.equal(home.premiumPreviewLabelJa, 'M55 プレミアムレポートの表示例');
    assert.equal(home.mechanismHowLinkJa, 'M55の仕組みを詳しく見る');
    assert.equal(home.tenAssetTeaserEyebrowJa, '無料結果の入口');
    assert.equal(home.tenAssetTeaserHeadlineJa, '10の資質から、自分に表れやすい動きを見る。');
    assert.equal(home.tenAssetTeaserLinkJa, '10の資質を詳しく見る');
  });

  it('embeds compact 10 asset teaser inside the free section using canonical catalog', () => {
    const teaserSource = readFileSync(join(repoRoot, 'components/home/HomeTenAssetTeaser.tsx'), 'utf8');
    assert.match(homePanelSource, /HomeTenAssetTeaser/);
    assert.match(teaserSource, /data-testid="m55-home-ten-asset-teaser"/);
    assert.match(teaserSource, /TEN_ASSET_PUBLIC_CATALOG/);
    assert.match(teaserSource, /data-testid="m55-home-ten-asset-teaser-link"/);
    assert.doesNotMatch(homePanelSource, /HomeTenAssetTiles/);
  });

  it('mounts dedicated pair free section after self free using shared structure authority', () => {
    const pairSource = readFileSync(join(repoRoot, 'components/home/HomePairFreeSection.tsx'), 'utf8');
    assert.match(homePanelSource, /HomePairFreeSection/);
    assert.match(pairSource, /data-testid="m55-home-pair-free"/);
    assert.match(pairSource, /data-testid="m55-home-pair-free-structure"/);
    assert.match(pairSource, /data-testid="m55-home-pair-free-cta"/);
    assert.match(pairSource, /pairReadingPublicStructure/);
  });

  it('uses compact single-column pair index layout at 420px and below', () => {
    assert.match(homePanelCss, /\.pairStructureIndexItem[\s\S]*display:\s*flex/);
    assert.match(homePanelCss, /@media \(max-width: 420px\)/);
    assert.match(homePanelCss, /@media \(min-width: 421px\)[\s\S]*grid-template-columns:\s*repeat\(2/);
    assert.match(homePanelCss, /\.pairStructureIndexTitle[\s\S]*word-break:\s*keep-all/);
  });

  it('implements mechanism progressive disclosure with how link and nested method model', () => {
    assert.doesNotMatch(homePanelSource, /HomeMechanismPanels/);
    assert.match(homePanelSource, /data-testid="m55-home-mechanism-link"/);
    assert.match(homePanelSource, /mechanismDiagram/);
    assert.doesNotMatch(homePanelSource, /data-testid="m55-home-ten-views-link"/);

    const mechanismDetailsStart = lowerSource.lastIndexOf(
      '<details',
      lowerSource.indexOf('data-testid="m55-home-mechanism"'),
    );
    const mechanismEnd = lowerSource.indexOf('</details>', mechanismDetailsStart);
    const mechanismBlock = lowerSource.slice(mechanismDetailsStart, mechanismEnd);
    assert.ok(mechanismDetailsStart !== -1 && mechanismEnd !== -1);
    assert.match(mechanismBlock, /<details[\s\S]*data-testid="m55-home-mechanism"/);
    assert.match(mechanismBlock, /<summary className=\{styles\.mechanismSummary\}/);
    assert.match(mechanismBlock, /mechanismSummaryHint/);
    assert.match(mechanismBlock, /mechanismDisclosureBody/);
    assert.match(mechanismBlock, /<HomeMethodModel \/>/);

    const premiumIdx = lowerSource.indexOf('data-testid="m55-home-premium-preview"');
    assert.ok(premiumIdx !== -1 && premiumIdx < mechanismDetailsStart, 'Premium must precede mechanism disclosure');
  });

  it('uses a single primary paid CTA in the premium section and a secondary text link in final CTA', () => {
    assert.match(homePanelSource, /data-testid="m55-home-premium-preview-cta"/);
    assert.match(homePanelSource, /className=\{styles\.finalCtaSecondaryLink\}/);
    assert.equal(homePanelSource.includes('data-testid="m55-home-plan-comparison-cta"'), false);
    const paidSolidCount = (homePanelSource.match(/className=\{styles\.ctaPaidSolid\}/g) ?? []).length;
    assert.equal(paidSolidCount, 1);
  });

  it('uses editorial outcome columns and premium dark-stage preview on HOME', () => {
    assert.match(homePanelSource, /outcomeEditorial/);
    assert.doesNotMatch(homePanelSource, /outcomeGrid[\s\S]*className=\{styles\.card\}/);
    assert.match(homePanelSource, /premiumDarkStage/);
    const premiumSlice = readFileSync(join(repoRoot, 'components/home/HomePremiumPreviewSlice.tsx'), 'utf8');
    assert.match(premiumSlice, /premiumPreviewProductSheet/);
    assert.match(premiumSlice, /premiumChapterBodyClip/);
    assert.match(homePanelCss, /\.premiumDarkStage\s*\{[^}]*background:\s*#0b1a2b/);
  });

  it('places the poster-to-lower gap in normal flow with no negative overlap', () => {
    assert.doesNotMatch(homePanelCss, /margin-top:\s*-\d/);
    assert.match(homePanelCss, /\.lowerWrap\s*\{[^}]*margin-top:\s*32px/);
  });

  it('uses global primary solid free CTA and outline premium secondary CTA', () => {
    assert.match(homePanelCss, /\.ctaFree\s*\{[^}]*background:\s*#0b1a2b/);
    assert.match(homePanelCss, /\.ctaPaid\s*\{[^}]*background:\s*transparent/);
    assert.match(homePanelCss, /\.ctaPaidSolid\s*\{[^}]*background:\s*#0b1a2b/);
  });
});

describe('homePublicCopy — LIGHT / FULL product truth on HOME', () => {
  it('renders exact plan names, prices, and quantities', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.planLightNameJa, 'ライト');
    assert.equal(home.planLightPriceJa, '¥1,000（税込）');
    assert.equal(
      home.planLightSpecJa,
      `追加読み解き ${PAID_DTR_SAVED_REPORT_PRICING.light.includedReplyCount}件`,
    );
    assert.equal(home.planFullNameJa, 'フル');
    assert.equal(home.planFullPriceJa, '¥1,480（税込）');
    assert.equal(
      home.planFullSpecJa,
      `追加読み解き 合計${PAID_DTR_SAVED_REPORT_PRICING.full.totalReplyCap}件`,
    );
    assert.equal(home.planComparisonCtaJa, 'プレミアムレポートを見る');
  });

  it('routes the paid CTA to /dtr/lp and never calls checkout directly from HOME', () => {
    const { cta } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(cta.viewSavedPlansHref, '/dtr/lp');
    assert.match(homePanelSource, /href=\{ctaCopy\.viewSavedPlansHref\}/);
    assert.equal(homePanelSource.includes('/api/'), false);
    assert.equal(homePanelSource.includes('stripe'), false);
    assert.equal(homePanelSource.toLowerCase().includes('checkout'), false);
  });

  it('shows LIGHT before FULL with equal visual priority (no badge/recommended label)', () => {
    const lightIndex = homePanelSource.indexOf('data-testid="m55-home-plan-light"');
    const fullIndex = homePanelSource.indexOf('data-testid="m55-home-plan-full"');
    assert.ok(lightIndex !== -1 && fullIndex !== -1);
    assert.ok(lightIndex < fullIndex, 'LIGHT must render before FULL');
    assert.equal(homePanelSource.includes('おすすめ'), false);
    assert.equal(homePanelSource.toLowerCase().includes('badge'), false);
    assert.equal(homePanelSource.toLowerCase().includes('recommended'), false);
  });
});
