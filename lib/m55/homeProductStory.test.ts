import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import {
  HOME_PAIR_READING_PUBLIC_HREF,
  HOME_PAIR_READING_AVAILABILITY,
  isHomePairReadingLivePublic,
} from './homePairReadingPublicContract';
import {
  PAIR_READING_FREE_STRUCTURE_ITEMS,
  PAIR_READING_GUEST_SUPPORT_LINES,
} from './compatibility/pairReadingPublicStructure';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from './compatibility/compatibilityCommerceAuthority';
import { M55_COMMERCIAL_PRODUCTS } from './contracts/m55CommercialFunnelContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');
const productMapSource = readFileSync(join(repoRoot, 'components/home/HomeProductMap.tsx'), 'utf8');
const pairFreeSource = readFileSync(join(repoRoot, 'components/home/HomePairFreeSection.tsx'), 'utf8');
const guestSource = readFileSync(join(repoRoot, 'components/compatibility/CompatibilityGuestExperience.tsx'), 'utf8');
const valueBridgeSource = readFileSync(join(repoRoot, 'components/home/HomePremiumValueBridge.tsx'), 'utf8');
const homeBlob = JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.home);

const PROHIBITED_HOME_WORDING = [
  '相性診断',
  '相性が良い',
  '相性が悪い',
  '運命',
  '結婚できる',
  '相手は好き',
  '復縁できる',
  '告白すべき',
  'スコア',
  'M55複合暦解析',
  '無料の見取り図',
  '追加解析',
  '近日公開',
  '診断',
] as const;

describe('homeProductStory — pair reading product truth', () => {
  it('classifies guest pair reading as LIVE_PUBLIC at /synastry', () => {
    assert.equal(HOME_PAIR_READING_AVAILABILITY, 'LIVE_PUBLIC');
    assert.equal(HOME_PAIR_READING_PUBLIC_HREF, '/synastry');
    assert.equal(isHomePairReadingLivePublic(), true);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.pairReadingHref, '/synastry');
  });

  it('does not expose paid compatibility checkout routes on HOME', () => {
    assert.equal(homePanelSource.includes('/synastry/purchase/confirm'), false);
    assert.equal(homePanelSource.includes('/api/compatibility/checkout'), false);
    assert.equal(homePanelSource.includes('compatibility_report_full_v1'), false);
    assert.equal(homePanelSource.includes('isCompatibilityCommerceEnabled'), false);
  });
});

describe('homeProductStory — capability map contract', () => {
  it('renders product map before free detail with parallel editorial layout (no 01/02/03)', () => {
    const mapIndex = homePanelSource.indexOf('data-testid="m55-home-product-map"');
    const freeIndex = homePanelSource.indexOf('data-testid="m55-home-free-preview"');
    assert.ok(mapIndex !== -1 && freeIndex !== -1);
    assert.ok(mapIndex < freeIndex);
    assert.match(productMapSource, /productMapEditorial/);
    assert.doesNotMatch(productMapSource, /productMapIndex/);
    assert.doesNotMatch(productMapSource, /className=\{styles\.card\}/);
    assert.doesNotMatch(productMapSource, />\s*0[123]\s*</);
  });

  it('uses approved commercial product map copy from SSOT', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.productMapEyebrowJa, 'M55でできること');
    assert.equal(
      home.productMapHeadlineJa,
      '自分の反応から、二人の関係、\n力が出やすい条件まで。',
    );
    assert.equal(home.productMapSelfTitleJa, '自分の反応を知る');
    assert.equal(
      home.productMapSelfBodyJa,
      '生年月日と、いま選んだ答えを重ねて、\n自分に出やすい反応や、\n整え直すための入口を見ていきます。',
    );
    assert.equal(home.productMapPairTitleJa, '二人の関係を読み解く');
    assert.equal(
      home.productMapPairBodyJa,
      'あなたと、関係を知りたい相手の生年月日と、\n今の二人に近い答えをもとに、\n話しやすい時と、\nすれ違いが続く時の流れを見ていきます。',
    );
    assert.equal(home.productMapPremiumTitleJa, '自分を深く読み解く');
    assert.equal(home.productMapPremiumLinkJa, 'プレミアムの内容を見る');
    assert.equal(home.productMapPairStatusJa, '無料・ログイン不要');
  });

  it('routes self free action through existing intake or /core contract', () => {
    assert.match(productMapSource, /m55-home-product-map-self-intake/);
    assert.match(productMapSource, /m55-home-product-map-self-core/);
    assert.match(productMapSource, /onOpenIntake/);
  });

  it('uses editorial headline wrapping for product map, pair, and premium H2', () => {
    assert.match(productMapSource, /HomeEditorialHeadline/);
    assert.match(pairFreeSource, /HomeEditorialHeadline/);
    assert.match(homePanelSource, /HomeEditorialHeadline[\s\S]*premiumHeadlineJa/);
    assert.match(pairFreeSource, /renderProtectedJapaneseLine/);
    assert.match(pairFreeSource, /headlineSemanticUnit/);
  });

  it('shows pair link only when LIVE_PUBLIC', () => {
    assert.match(productMapSource, /isHomePairReadingLivePublic/);
    assert.match(productMapSource, /m55-home-product-map-pair-link/);
    assert.match(productMapSource, /HOME_PAIR_READING_PUBLIC_HREF/);
    assert.match(productMapSource, /m55-home-product-map-pair-preparing/);
  });

  it('renders Pair Premium preview as fourth product-map item with truthful copy', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    const pairPremiumProduct = M55_COMMERCIAL_PRODUCTS.pairPremium;
    const pairPremiumCommerce = COMPATIBILITY_REPORT_PRODUCT_AUTHORITY;

    assert.equal(pairPremiumProduct.status, 'NOT_LIVE');
    assert.equal(pairPremiumProduct.availability, 'ENV_GATED_SANDBOX_ONLY');

    assert.equal(home.productMapPairPremiumTitleJa, pairPremiumCommerce.publicName);
    assert.match(
      home.productMapPairPremiumBodyJa,
      new RegExp(`${pairPremiumProduct.reportChapters}章`),
    );
    assert.match(home.productMapPairPremiumStatusJa, new RegExp(pairPremiumCommerce.priceLabel));

    assert.match(home.productMapPairPremiumStatusJa, /提供準備中/);
    assert.equal(
      home.productMapPairPremiumStatusJa,
      '提供準備中・¥1,480（税込）・買い切り・自動更新なし',
    );

    assert.equal(pairPremiumCommerce.billing, 'one_time');
    assert.equal(pairPremiumCommerce.subscription, false);

    assert.equal(
      home.productMapPairPremiumBodyJa,
      '無料で見えた二人の流れをもとに、\n6章のレポートで、二人の違い、すれ違いの順番、\n戻し方、次に試せることまで整理します。',
    );
    assert.equal(home.productMapPairPremiumTitleJa, '二人の相性レポート');
    assert.equal(home.productMapPairPremiumCtaJa, 'まず二人の無料結果を見る');
    assert.match(productMapSource, /m55-home-product-map-pair-premium/);
    assert.match(productMapSource, /m55-home-product-map-pair-premium-link/);
    assert.match(productMapSource, /HOME_PAIR_READING_PUBLIC_HREF/);
    assert.doesNotMatch(productMapSource, /isCompatibilityCommerceEnabled/);
    assert.doesNotMatch(productMapSource, /\/api\/compatibility\/checkout/);
    assert.doesNotMatch(productMapSource, /\/synastry\/purchase\/confirm/);
    assert.equal(home.productMapPairPremiumCtaJa.includes('購入'), false);
    assert.equal(home.productMapPairPremiumStatusJa.includes('販売中'), false);
    assert.equal(HOME_PAIR_READING_PUBLIC_HREF, '/synastry');
  });
});

describe('homeProductStory — pair free dedicated section', () => {
  it('renders pair section after self free and before premium, with premium before mechanism', () => {
    const freeIdx = homePanelSource.indexOf('data-testid="m55-home-free-preview"');
    const pairIdx = homePanelSource.indexOf('<HomePairFreeSection');
    const premiumIdx = homePanelSource.indexOf('data-testid="m55-home-premium-preview"');
    const mechanismIdx = homePanelSource.indexOf('data-testid="m55-home-mechanism"');
    const finalIdx = homePanelSource.indexOf('data-testid="m55-home-final-cta"');
    assert.ok(freeIdx !== -1 && pairIdx !== -1 && premiumIdx !== -1 && mechanismIdx !== -1 && finalIdx !== -1);
    assert.ok(freeIdx < pairIdx && pairIdx < premiumIdx, 'Pair Free must follow SELF/free and precede Premium');
    assert.ok(premiumIdx < mechanismIdx && mechanismIdx < finalIdx, 'Premium must precede mechanism disclosure');
    assert.match(pairFreeSource, /data-testid="m55-home-pair-free"/);
  });

  it('uses approved pair section copy and shared structure authority', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.pairFreeEyebrowJa, '二人の関係を見る');
    assert.equal(home.pairFreeHeadlineJa, 'なぜ話しやすい時と、\nすれ違う時があるのか。');
    assert.equal(
      home.pairFreeBodyJa,
      'あなたと、関係を知りたい相手の生年月日を入力し、\n今の二人に近い答えを選びます。\n重なりや違い、すれ違いが続く流れまでを、\n決めつけずに読み解きます。',
    );
    assert.equal(home.pairFreeStatusJa, '無料・ログイン不要');
    assert.equal(home.pairFreeCtaJa, '二人の関係を無料で見てみる');
    assert.deepEqual(
      PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => item.titleJa),
      [
        '二人の変わりにくい土台',
        '今の二人に表れやすいこと',
        '二人の間で続きやすい連鎖',
      ],
    );
    assert.deepEqual(PAIR_READING_GUEST_SUPPORT_LINES, [
      '回答するのはあなた一人です。',
      '相手が回答したものではありません。',
    ]);
    assert.match(pairFreeSource, /PAIR_READING_FREE_STRUCTURE_ITEMS/);
    assert.match(pairFreeSource, /PAIR_READING_GUEST_SUPPORT_LINES/);
    assert.match(pairFreeSource, /m55-home-pair-free-structure/);
    assert.doesNotMatch(pairFreeSource, /freePreviewSheet|insightCard|dynamicOutcome/);
    assert.equal(pairFreeSource.includes('好きな人、恋人、パートナー、家族、友人'), false);
    assert.equal(homeBlob.includes('気になる二人'), false);
  });

  it('shares structure labels with CompatibilityGuestExperience via single authority', () => {
    assert.match(guestSource, /PAIR_READING_FREE_STRUCTURE_ITEMS/);
    assert.match(guestSource, /pairReadingPublicStructure/);
  });
});

describe('homeProductStory — self free commercial copy', () => {
  it('uses approved self free headline and outcome item 02 title', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(
      home.freeResultHeadlineJa,
      '無料で、今の自分に出やすい反応と、\n整え方の入口を知る。',
    );
    assert.equal(home.outcomeBridgeItemsJa[1].titleJa, '人と関わるときの自分の動き');
    assert.equal(
      home.outcomeBridgeItemsJa[1].bodyJa,
      '人と関わるとき、どのような順番で考え、動きやすいか。',
    );
    assert.equal(home.outcomeBridgeItemsJa[0].titleJa, '自分に表れやすい反応');
    assert.equal(home.outcomeBridgeItemsJa[2].titleJa, '整え直すための手がかり');
  });
});

describe('homeProductStory — premium copy and value bridge', () => {
  it('uses mandatory commercial premium headline, body, plan intro, and plan fit copy', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(
      home.premiumHeadlineJa,
      '自分の力が出やすい条件と、\n負担が重なり始める流れを読み解く。',
    );
    assert.equal(
      home.premiumBodyJa,
      '生年月日から見える基礎傾向と、いまの回答をもとに、\n自分の動き方、人との距離感、\n負担が重なり始める流れ、整え方を\nプレミアムレポートとして整理します。',
    );
    assert.equal(
      home.planComparisonIntroJa,
      'どちらも、同じプレミアムレポートを読めます。\n違いは、購入後に追加で読み解けるテーマ数です。',
    );
    assert.equal(
      home.planLightFitJa,
      'まず全体像を知り、\nいちばん気になることを1つ深く見たい人へ。',
    );
    assert.equal(
      home.planFullFitJa,
      '複数の気になるテーマを、\nまとめて深く見たい人へ。',
    );
    assert.match(homePanelSource, /planLightFitJa/);
    assert.match(homePanelSource, /planFullFitJa/);
    assert.match(homePanelSource, /planComparisonFit/);
    assert.equal(homeBlob.includes('無理が重なる流れ'), false);
    assert.equal(homeBlob.includes('同じ土台を、4つの章で読み返せます。'), false);
  });

  it('places value bridge at the start of premium dark stage before product preview', () => {
    const premiumStart = homePanelSource.indexOf('data-testid="m55-home-premium-preview"');
    const premiumBlock = homePanelSource.slice(premiumStart);
    const bridgeIndex = premiumBlock.indexOf('<HomePremiumValueBridge');
    const previewIndex = premiumBlock.indexOf('<HomePremiumPreviewSlice');
    const eyebrowIndex = premiumBlock.indexOf('premiumEyebrowJa');
    assert.ok(premiumStart !== -1 && bridgeIndex !== -1 && previewIndex !== -1);
    assert.ok(bridgeIndex < previewIndex);
    assert.ok(bridgeIndex < eyebrowIndex);
    assert.match(valueBridgeSource, /data-testid="m55-home-premium-value-bridge"/);
    assert.doesNotMatch(valueBridgeSource, /premiumValueBridgeHeadline/);
  });

  it('uses approved free-to-premium comparison copy without demeaning free tier', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.premiumValueBridgeEyebrowJa, '自分の無料結果から、さらに深く');
    assert.equal(
      home.premiumValueBridgeLeadJa,
      '無料は、今の自分を見る入口。\nプレミアムは、\nなぜそうなるかと、どう扱うかまで。',
    );
    assert.equal(home.premiumValueBridgeFreeHeadingJa, '無料結果');
    assert.equal(home.premiumValueBridgePremiumHeadingJa, 'プレミアムレポート');
    assert.deepEqual(home.premiumValueBridgeFreeItemsJa, [
      'いまの自分に出やすい反応',
      'それが活きる場面と、重くなる場面',
      '自分に表れやすい資質',
    ]);
    assert.deepEqual(home.premiumValueBridgePremiumItemsJa, [
      'その反応になる理由',
      '力が出やすいときと、止まりやすいとき',
      '戻り方と、人との距離での出方',
    ]);
    assert.match(valueBridgeSource, /premiumValueBridgeLead/);
    assert.equal(homeBlob.includes('premiumValueBridgeHeadlineJa'), false);
    assert.equal(homeBlob.includes('無料は不完全'), false);
    assert.equal(homeBlob.includes('無料では分からない'), false);
  });
});

describe('homeProductStory — mechanism and final CTA copy', () => {
  it('explains mechanism for both self and pair without self-only diagram output', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.mechanismHeadlineJa, '変わりにくい土台と、\nいまの答えを重ねて見る。');
    // Covers self and pair, and states the inputs — the four-step block below
    // owns the "how it is composed" explanation, so this must not restate it.
    assert.equal(
      home.mechanismBodyJa,
      '使うのは、生年月日と、いま選んだ答えだけ。\n自分を見るときも、二人の関係を見るときも、同じ見方です。\nほかの利用者との比較や、外部から取得した情報は使いません。',
    );
    assert.ok(home.mechanismBodyJa.includes('二人の関係'), 'mechanism must cover the pair lane');
    assert.equal(home.mechanismEthicsJa, '一つの情報だけで、人を決めない。');
    assert.equal(home.mechanismDiagramSource1Ja, '生年月日から見える土台');
    assert.equal(home.mechanismDiagramSource2Ja, 'いま選んだ答え');
    assert.equal(home.mechanismDiagramOutputJa, '今表れやすい流れ');
    assert.equal(home.mechanismDiagramOutputJa.includes('自分'), false);
  });

  it('uses approved final CTA headline while keeping body and CTAs stable', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.finalCtaHeadlineJa, 'まずは、今の自分を知るところから。');
    assert.equal(home.finalCtaBodyJa, '無料の読み解きは、ログインせずに始められます。');
    assert.equal(home.finalCtaPrimaryJa, '無料で見てみる');
    assert.equal(home.finalCtaSecondaryJa, 'プレミアムレポートを見る');
  });
});

describe('homeProductStory — HOME terminology contract', () => {
  it('excludes 読み返す from HOME public copy', () => {
    assert.equal(homeBlob.includes('読み返す'), false);
  });

  it('limits 読み解く to product value and headlines, not CTAs', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.match(home.premiumHeadlineJa, /読み解く/);
    assert.match(home.productMapPremiumTitleJa, /読み解く/);
    assert.match(home.productMapPairTitleJa, /読み解く/);
    assert.equal(home.productMapSelfCtaJa.includes('読み解く'), false);
    assert.equal(home.productMapPairCtaJa.includes('読み解く'), false);
    assert.equal(home.pairFreeCtaJa.includes('読み解く'), false);
    assert.equal(home.premiumCtaJa.includes('読み解く'), false);
    assert.equal(home.finalCtaPrimaryJa.includes('読み解く'), false);
  });
});

describe('homeProductStory — final CTA and product facts', () => {
  it('keeps a single paid primary CTA and exactly three pair CTAs (map + pair section + premium preview)', () => {
    const paidSolidCount = (homePanelSource.match(/className=\{styles\.ctaPaidSolid\}/g) ?? []).length;
    assert.equal(paidSolidCount, 1);
    assert.equal(homePanelSource.includes('m55-home-final-cta-pair'), false);
    assert.equal(homePanelSource.includes('finalCtaPairSecondaryJa'), false);
    const mapPairCount = (productMapSource.match(/m55-home-product-map-pair-link/g) ?? []).length;
    const mapPairPremiumCount = (productMapSource.match(/m55-home-product-map-pair-premium-link/g) ?? []).length;
    const sectionPairCount = (pairFreeSource.match(/m55-home-pair-free-cta/g) ?? []).length;
    assert.equal(mapPairCount, 1);
    assert.equal(mapPairPremiumCount, 1);
    assert.equal(sectionPairCount, 1);
    assert.match(productMapSource, /HOME_PAIR_READING_PUBLIC_HREF/);
    assert.match(pairFreeSource, /HOME_PAIR_READING_PUBLIC_HREF/);
    assert.equal(HOME_PAIR_READING_PUBLIC_HREF, '/synastry');
  });

  it('does not change hero poster structure or add extra hero CTAs', () => {
    const heroStart = homePanelSource.indexOf('data-testid="m55-home-hero"');
    const heroSource = homePanelSource.slice(
      heroStart,
      homePanelSource.indexOf('</section>', heroStart) + '</section>'.length,
    );
    assert.equal(heroSource.includes('HomeProductMap'), false);
    assert.equal(heroSource.includes('data-testid="m55-home-product-map"'), false);
    assert.match(heroSource, /data-testid="m55-home-open-birth-intake"/);
    assert.match(heroSource, /data-testid="m55-home-has-profile-hero"/);
  });

  it('avoids prohibited public wording in HOME SSOT copy', () => {
    for (const term of PROHIBITED_HOME_WORDING) {
      assert.equal(homeBlob.includes(term), false, `home copy must not include: ${term}`);
    }
  });
});
