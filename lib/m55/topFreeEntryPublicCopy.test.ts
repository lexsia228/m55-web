import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STATIC_M55_READ_STEPS } from '../../components/core/corePublicCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const FORBIDDEN_PUBLIC_TERMS = [
  'Entry Report',
  'DTR Core Static V1',
  '購入者専用ルーム',
  '相談ルーム',
  '永久閲覧',
  '永久',
  '無期限',
  '相談1回付属',
  '付属1件＋追加購入最大4件',
  '8章',
  '人物像と傾向',
  '本質と安定の条件',
  '活きる力',
  '占い',
  '運勢',
  '複数テーマ',
  '後から追加',
] as const;

/**
 * '鑑定' is deliberately excluded from FORBIDDEN_PUBLIC_TERMS: the frozen
 * M55の仕組み reassurance copy (learnMore.reassuranceJa) uses it only inside
 * a negation disclaimer ("診断、鑑定、治療、カウンセリングではありません。").
 */

const COPY_FILE = 'lib/m55/topFreeEntryPublicCopy.ts';

const ROUTE_FILES = {
  '/': 'app/page.tsx',
  '/home': 'components/home/HomePanel.tsx',
  '/core-static': 'components/core/corePublicCopy.ts',
  '/core-boundary': 'components/core/CoreFreeSavedBoundarySection.tsx',
  '/core-cta': 'components/core/CoreEntryReportCTASection.tsx',
  '/how-m55-works': 'app/how-m55-works/page.tsx',
  '/how-m55-works/receive': 'app/how-m55-works/components/what-you-can-do-section.tsx',
  '/how-m55-works/next': 'app/how-m55-works/components/next-step-section.tsx',
  '/how-m55-works/calendar': 'app/how-m55-works/components/calendar-layers-section.tsx',
  '/how-m55-works/framework': 'app/how-m55-works/components/framework-section.tsx',
  '/how-m55-works/what-is': 'app/how-m55-works/components/what-is-section.tsx',
  '/how-m55-works/intro': 'app/how-m55-works/components/intro-section.tsx',
  '/how-m55-works/values': 'app/how-m55-works/components/values-boundary-section.tsx',
  '/support': 'app/support/page.tsx',
} as const;

const HOW_M55_WORKS_PAGE_PATHS = [
  ROUTE_FILES['/how-m55-works'],
  ROUTE_FILES['/how-m55-works/intro'],
  ROUTE_FILES['/how-m55-works/what-is'],
  ROUTE_FILES['/how-m55-works/calendar'],
  ROUTE_FILES['/how-m55-works/framework'],
  ROUTE_FILES['/how-m55-works/receive'],
  ROUTE_FILES['/how-m55-works/values'],
  ROUTE_FILES['/how-m55-works/next'],
  'app/how-m55-works/components/suitable-for-section.tsx',
  'app/how-m55-works/components/back-to-previous-button.tsx',
] as const;

const HOW_M55_FORBIDDEN_DISPLAY_TERMS = [
  'プレミアムレポート',
  'プレミアムレポートでは',
  'プレミアムレポートのプランを見る',
  'あなた専用のプレミアムレポート',
  'ただの読み物ではありません',
  '読み物',
  '読み返せる',
  '深く読める',
  '整理します',
  '深く整理します',
  '読みやすく整理します',
  '受け取れるのは',
  '要エンジン照合',
  '抽象イメージ',
  '占い',
  '鑑定',
  '¥1,000',
  '1000円',
  '10資質レーン',
  '5つの視点',
  '固定観測軸',
  'PDF',
  'プランを見る',
  '自分を責める',
  '責める',
  '暦信号',
  '暦レイヤー',
  'こう出やすい',
  '生年月日をひとつの名前',
  '複数の視点',
  '符号',
  'あなたを決める名前',
  '個人差',
  '入口の地図',
  '短く確認',
  '輪郭は粗く',
  '一つの情報として終わらせません',
  '読み始めるための入口',
  '読み始める',
  '自分の見え方',
  '整えやすい余白',
  'まずは、無料で見る。',
] as const;

function howM55WorksDisplayBlob(): string {
  const hw = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
  return [
    JSON.stringify(hw),
    ...HOW_M55_WORKS_PAGE_PATHS.map((path) => readPage(path)),
  ].join('\n');
}

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readPage(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing page file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedPublicCopy(): string {
  return [COPY_FILE, ...Object.values(ROUTE_FILES)]
    .map((rel) => readPage(rel))
    .join('\n');
}

describe('topFreeEntryPublicCopy — Product Truth alignment', () => {
  it('maps top/free routes to existing page files', () => {
    for (const [route, rel] of Object.entries(ROUTE_FILES)) {
      assert.ok(existsSync(join(repoRoot, rel)), `${route} -> ${rel}`);
    }
  });

  it('includes M55 definition and three-layer free/saved/consult copy', () => {
    const blob = combinedPublicCopy();
    assert.match(blob, /10資質レーン/);
    assert.match(blob, /動き方・疲れ方・戻し方|動き方/);
    assert.match(blob, /無料の見取り図/);
    assert.match(blob, /プレミアムレポート/);
    assert.match(blob, /追加読み解き/);
    assert.match(blob, /会話を続ける形式ではありません/);
  });

  it('includes storefront and home product truth with LIGHT before FULL on home', () => {
    const copy = readPage(COPY_FILE);
    const home = readPage(ROUTE_FILES['/home']);
    const { storefront: sf, home: homeCopy, learnMore, cta } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(sf.fullPlanNameJa, 'M55 プレミアムレポート フル');
    assert.equal(sf.fullPriceLabelJa, '¥1,480（税込）');
    assert.equal(sf.fullConsultReplyJa, '追加読み解き合計5件');
    assert.equal(sf.lightPlanNameJa, 'M55 プレミアムレポート ライト');
    assert.equal(sf.lightPriceLabelJa, '¥1,000（税込）');
    assert.equal(sf.lightConsultReplyJa, '追加読み解き1件');
    assert.equal(homeCopy.planLightNameJa, 'ライト');
    assert.equal(homeCopy.planLightPriceJa, '¥1,000（税込）');
    assert.equal(homeCopy.planFullNameJa, 'フル');
    assert.equal(homeCopy.planFullPriceJa, '¥1,480（税込）');
    assert.match(copy, /追加読み解き合計5件/);
    assert.match(copy, /追加読み解き1件/);
    assert.match(home, /m55-home-mechanism/);
    assert.match(home, /m55-home-plan-comparison/);
    assert.match(homeCopy.heroSupportJa, /生年月日を暦で見つめ直す/);
    assert.match(homeCopy.heroSupportJa, /自己理解の入口です/);
    assert.match(home, /m55-home-premium-preview/);
    assert.match(home, /m55-home-final-cta/);
    assert.equal(homeCopy.finalCtaPrimaryJa, '無料で見てみる');
    assert.equal(homeCopy.finalCtaSecondaryJa, 'プレミアムレポートを見る');
    assert.equal(homeCopy.planComparisonCtaJa, 'プレミアムレポートを見る');
    assert.equal(homeCopy.heroTitleLine2Ja, '順番がある。');
    assert.equal(homeCopy.heroPosterCtaJa, '無料で見てみる');
    assert.equal(cta.openFreeMapJa, '無料で見てみる');
    assert.equal(cta.viewSavedPlansHref, '/dtr/lp');
    assert.match(home, /\{freeCtaLabel\}/);
    assert.match(home, /resolveFreeCtaLabel/);
    assert.match(home, /\{homeCopy\.planComparisonCtaJa\}/);
    assert.match(home, /data-testid="m55-home-open-birth-intake"/);
    assert.match(home, /data-testid="m55-home-has-profile-hero"/);
    assert.equal(home.includes('m55-home-poster-cta'), false);
    assert.match(learnMore.calendarBodyJa, /旧暦、十干、二十四節気、節入り/);
    for (const removed of [
      'まずは無料結果を見る',
      '無料結果ページで、あなたの輪郭を確認できます。',
      'プレミアムレポートへ進む前に、まずは無料でM55を試せます。',
      'M55複合暦解析',
      'M55追加解析',
    ] as const) {
      assert.equal(home.includes(removed), false, `home must not include removed bridge copy: ${removed}`);
    }
  });

  it('includes reader-aligned four chapters and saved-plan CTA targets', () => {
    const blob = combinedPublicCopy();
    const labels = TOP_FREE_ENTRY_PUBLIC_COPY.formalChapters.map((ch) => ch.labelJa);
    assert.deepEqual(labels, [
      'Ⅰ 自分の形を知る',
      'Ⅱ 仕事・これからの進め方',
      'Ⅲ 恋人・近い人との向き合い方',
      'Ⅳ お金・生活・疲れの整え方',
    ]);
    assert.match(blob, /プレミアムレポートを見る/);
    assert.match(blob, /\/dtr\/lp/);
    assert.match(readPage(ROUTE_FILES['/home']), /ctaCopy\.viewSavedPlansHref/);
  });

  it('does not expose forbidden legacy terms in top/free public copy', () => {
    const blob = combinedPublicCopy();
    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      assert.equal(blob.includes(term), false, `forbidden term in top/free copy: ${term}`);
    }
  });

  it('omits detailed plan arithmetic from top/free entry SSOT', () => {
    const copy = readPage(COPY_FILE);
    const homePanel = readPage(ROUTE_FILES['/home']);
    for (const term of ['合計¥1,600', '最初からFULL ¥1,480', '差額は¥120', '差額¥120'] as const) {
      assert.equal(copy.includes(term), false, `must not include: ${term}`);
    }
    for (const term of ['有料レポート', '構造化レポート', '返書まで'] as const) {
      assert.equal(copy.includes(term), false, `must not include: ${term}`);
      assert.equal(homePanel.includes(term), false, `home must not include: ${term}`);
    }
    assert.match(copy, /必要になったらフルに切り替え/);
    assert.match(copy, /追加読み解き1件/);
    assert.match(copy, /追加読み解き合計5件/);
  });

  it('uses premium-report formal language in corePublicCopy read steps', () => {
    const activeCopy = STATIC_M55_READ_STEPS.map((step) => step.body).join('\n');
    assert.match(activeCopy, /プレミアムレポート/);
    assert.match(activeCopy, /追加読み解きで/);
    assert.match(activeCopy, /読み直せます/);
    assert.equal(activeCopy.includes('本質の読み解き'), false);
    assert.equal(activeCopy.includes('基本の出方'), false);
  });

  it('P1 surface avoids legacy ten-type-only framing on how-m55-works and support', () => {
    const p1Blob = [
      JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works),
      readPage(ROUTE_FILES['/how-m55-works']),
      readPage(ROUTE_FILES['/how-m55-works/receive']),
      readPage(ROUTE_FILES['/how-m55-works/next']),
      readPage(ROUTE_FILES['/how-m55-works/framework']),
      readPage(ROUTE_FILES['/how-m55-works/what-is']),
      readPage(ROUTE_FILES['/how-m55-works/calendar']),
      readPage(ROUTE_FILES['/how-m55-works/intro']),
      readPage(ROUTE_FILES['/how-m55-works/values']),
      readPage('app/how-m55-works/components/suitable-for-section.tsx'),
      readPage(ROUTE_FILES['/support']),
    ].join('\n');
    for (const term of ['10通りの資質', '5つの解析軸', 'パーソナルアルゴリズム', '読み解いていきます'] as const) {
      assert.equal(p1Blob.includes(term), false, `legacy P1 term must not remain: ${term}`);
    }
    const hwJson = JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works);
    for (const term of ['10資質レーン', '5つの視点', '固定観測軸'] as const) {
      assert.equal(hwJson.includes(term), false, `how-m55-works must not expose internal term: ${term}`);
    }
    // Legacy product name may remain in the historical copy object, but the
    // canonical method route must not mount it (method authority owns that page).
    assert.match(JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works), /M55複合暦解析/);
    assert.doesNotMatch(readPage(ROUTE_FILES['/how-m55-works']), /複合暦解析/);
    assert.match(readPage(ROUTE_FILES['/support']), /TOP_FREE_ENTRY_PUBLIC_COPY/);
    assert.match(readPage(ROUTE_FILES['/how-m55-works/what-is']), /section01ParagraphsJa/);
  });

  it('howM55Works method page copy aligns with commercial method funnel', () => {
    const hw = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
    const displayBlob = howM55WorksDisplayBlob();
    const receivePage = readPage(ROUTE_FILES['/how-m55-works/receive']);
    const reflectPage = readPage('app/how-m55-works/components/suitable-for-section.tsx');
    const nextPage = readPage(ROUTE_FILES['/how-m55-works/next']);
    const introPage = readPage(ROUTE_FILES['/how-m55-works/intro']);
    const calendarPage = readPage(ROUTE_FILES['/how-m55-works/calendar']);
    const frameworkPage = readPage(ROUTE_FILES['/how-m55-works/framework']);
    const pageSource = readPage(ROUTE_FILES['/how-m55-works']);

    assert.match(introPage, /heroHookJa/);
    assert.match(introPage, /heroBridgeJa/);
    assert.equal(introPage.includes('heroCtaRow'), false, 'hero must not expose early CTA row');
    assert.equal(introPage.includes('coreFreeHref'), false, 'hero must not link to core before read');
    assert.equal(hw.heroHookJa, '生まれた日から、自分が見える。');
    assert.match(hw.heroBridgeJa, /M55で自分がどう見えてくるのかを知る/);
    assert.match(hw.heroBridgeJa, /M55複合暦解析で何が深まるのかを見ていきます。/);
    assert.match(hw.section01ParagraphsJa[0], /自分を見つめ直すとき/);
    assert.match(hw.section01TitleJa, /見つめ直すための入口/);
    assert.equal(hw.section01TitleJa.includes('読み始める'), false);
    assert.match(hw.section01ParagraphsJa[1], /自分を見つめ直すための入口/);
    assert.match(hw.section01ParagraphsJa[2], /自分を見つめ直すための輪郭を描いていく/);
    assert.equal(hw.section01ParagraphsJa[2].includes('あなたが自分を'), false);
    assert.match(hw.section01ParagraphsJa[2], /ひとつの言葉で、あなたを決めつけない。/);
    assert.equal(hw.section01ParagraphsJa[2].includes('暦信号'), false);
    assert.equal(hw.section01ParagraphsJa[2].includes('人を'), false);
    assert.match(hw.section01ParagraphsJa[1], /生まれた日をただの日付で終わらせず/);
    assert.equal(hw.section01ParagraphsJa[1].includes('生年月日をひとつの名前'), false);
    assert.match(hw.section02TitleJa, /4つの暦の層/);
    assert.match(hw.section02IntroJa, /生まれた日を一つの暦だけで見ません/);
    assert.equal(hw.section02IntroJa.includes('一つの情報として終わらせません'), false);
    assert.match(hw.section02IntroJa, /見える輪郭に限りがあります/);
    assert.equal(hw.section02IntroJa.includes('輪郭は粗く'), false);
    assert.equal(hw.section02IntroJa.includes('暦レイヤー'), false);
    assert.equal(hw.section02IntroJa.includes('こう出やすい'), false);
    assert.match(hw.section02IntroJa, /なぜ自分には、こういう輪郭があるのか/);
    assert.match(hw.section03ParagraphsJa[2], /いくつかの見方を重ねて/);
    assert.equal(hw.section03ParagraphsJa[2].includes('複数の視点'), false);
    assert.equal(hw.section03FiveViewLabelsJa[0], '近い人との距離');
    assert.equal(
      (hw.section03FiveViewLabelsJa as readonly string[]).includes('人との距離'),
      false,
    );
    assert.match(hw.section02LandingJa, /見えてくる輪郭はそれぞれ変わります/);
    assert.match(hw.calendarLayersJa[1].whatJa, /周期の位置にあるかを示します/);
    assert.match(hw.calendarLayersJa[1].howJa, /M55では、十干を、あなたを決めるものではなく/);
    assert.match(hw.calendarLayersJa[1].howJa, /見えてくる輪郭が少しずつ変わってきます/);
    assert.equal(hw.calendarLayersJa[1].howJa.includes('自分の見え方'), false);
    assert.equal(hw.calendarLayersJa[1].subLabelJa, '日の周期の位置を見る');
    assert.equal(displayBlob.includes('符号'), false);
    assert.match(hw.section03TitleJa, /なぜ一人ずつ違って見えるのか/);
    assert.equal(displayBlob.includes('個人差'), false);
    assert.equal(displayBlob.includes('あなたを決める名前'), false);
    assert.match(hw.section03ParagraphsJa[0], /最初の手がかりです/);
    assert.equal(hw.section03ParagraphsJa[0].includes('読み始める'), false);
    assert.match(hw.section03ParagraphsJa[1], /重なる暦の層が違えば/);
    assert.match(hw.section03ParagraphsJa[1], /見取り図の中身は同じにはなりません/);
    assert.equal(hw.section03ParagraphsJa[1].includes('似た入口'), false);
    assert.equal(hw.section03ParagraphsJa[0].includes('入口の地図'), false);
    assert.match(hw.section03ParagraphsJa[0], /生まれた日を入口として使います/);
    assert.match(hw.section04ValueCardsJa[1].bodyJa, /整えられる余白/);
    assert.equal(hw.section04ValueCardsJa[1].bodyJa.includes('整えやすい余白'), false);
    assert.match(hw.nextLeadJa, /まずは、無料の見取り図で/);
    assert.equal(hw.nextLeadJa.includes('まずは、無料で見る。'), false);
    assert.equal(displayBlob.includes('読み始める'), false);
    assert.match(hw.section05ParagraphsJa[3], /見られるようになると/);
    assert.match(hw.section05ParagraphsJa[4], /次にどう選ぶかを見直しやすくなります/);
    assert.match(hw.section06ParagraphsJa[2], /視点を届けます/);
    assert.match(calendarPage, /section02GridAriaLabelJa/);
    assert.equal(hw.calendarLayerHowLabelJa, 'M55ではどう見るか');
    assert.match(hw.calendarLayersJa[0].howJa, /あなたの生まれた日/);
    assert.equal(hw.calendarLayersJa[1].howJa.includes('その人'), false);
    assert.equal(hw.section03ParagraphsJa[1].includes('称号'), false);
    assert.match(hw.section03ParagraphsJa[2], /複数の暦の層を重ねるからこそ/);
    assert.equal(hw.section02LandingJa.includes('資質の入口'), false);
    const dakaraCount = (displayBlob.match(/だから/g) ?? []).length;
    assert.equal(dakaraCount, 1, 'active display should contain exactly one だから');
    assert.match(hw.section03LandingJa, /^だからM55は/);
    assert.match(
      hw.section03ParagraphsJa[2],
      /「自分には、こういう輪郭があったのか」が、一般論ではなく自分ごとに見えてきます。/,
    );
    assert.equal(hw.section03FiveViewsLeadJa.includes('5つの視点'), false);
    assert.match(frameworkPage, /section03FiveViewLabelsJa/);
    // Canonical method route is owned by M55MethodSections; legacy section
    // mounts are retained as unused components for history, not as the page.
    assert.match(pageSource, /M55MethodSections/);
    assert.doesNotMatch(pageSource, /WhatYouCanDoSection|CalendarLayersSection|IntroSection/);
    assert.match(receivePage, /section04KickerJa/);
    assert.match(receivePage, /section04ValueCardsJa/);
    assert.match(receivePage, /midFlowLink/);
    assert.match(receivePage, /viewSavedPlansHref/);
    assert.equal(hw.section04KickerJa, '04 — 無料の見取り図とM55複合暦解析');
    assert.equal(hw.section04CompositeHookJa, '無料で見えた輪郭の先へ。');
    assert.match(hw.section04CompositeBodyJa, /M55複合暦解析/);
    assert.equal(hw.section04ValueCardsJa.length, 4);
    assert.equal(hw.section04ValueCardsJa[0].titleJa, '自分の本質');
    assert.match(reflectPage, /section05ParagraphsJa/);
    assert.equal(hw.section05KickerJa, '05 — 見て、感じて、自分の言葉で確かめる');
    assert.match(hw.section05ParagraphsJa[0], /結果を見て終わりではありません/);
    assert.match(hw.section05ParagraphsJa[1], /ここは近い/);
    assert.match(hw.section05ParagraphsJa[3], /自分を少し離れて見られるようになる/);
    assert.match(hw.section05ParagraphsJa[4], /いつもの反応や選び方を/);
    assert.equal(hw.section05ParagraphsJa[4].includes('疲れやすい'), false);
    assert.match(hw.nextFootJa, /M55複合暦解析では/);
    assert.match(hw.nextFootJa, /無料の見取り図で見えた輪郭を/);
    assert.match(hw.nextClosingJa, /追加解析で今の自分に合わせて深められます/);
    assert.equal(hw.nextFootJa.includes('無料で見えた輪郭の先を'), false);
    assert.equal(displayBlob.includes('抽象イメージ'), false);
    for (const term of ['旧暦', '十干', '二十四節気', '節入り'] as const) {
      assert.match(displayBlob, new RegExp(term), `calendar layer must include: ${term}`);
    }
    assert.match(calendarPage, /calendarLayersJa/);
    assert.match(
      TOP_FREE_ENTRY_PUBLIC_COPY.metadata.howM55WorksDescriptionJa,
      /生まれた日を暦の層で読み直し/,
    );
    assert.equal(nextPage.includes('copy.primaryCtaJa'), true);
    assert.equal(nextPage.includes('copy.secondaryCtaJa'), true);
    assert.match(nextPage, /BackToPreviousButton/);
    assert.match(nextPage, /copy\.backButtonJa/);
    assert.match(nextPage, /cta\.homeHref/);
    assert.equal(hw.primaryCtaJa, '無料の見取り図を見る');
    assert.equal(hw.secondaryCtaJa, 'M55複合暦解析を見る');
    assert.equal(hw.backButtonJa, '前のページへ戻る');
    assert.match(nextPage, /viewSavedPlansHref/);
    assert.match(nextPage, /coreFreeHref/);
    for (const term of HOW_M55_FORBIDDEN_DISPLAY_TERMS) {
      assert.equal(
        displayBlob.includes(term),
        false,
        `how-m55-works display copy must not include: ${term}`,
      );
    }
    assert.match(displayBlob, /M55複合暦解析/);
    assert.match(displayBlob, /追加解析/);
    for (const term of ['人を', 'その人', '称号', '資質の入口', '入力された生年月日', '暦レイヤー', 'こう出やすい', '生年月日をひとつの名前', '複数の視点'] as const) {
      assert.equal(displayBlob.includes(term), false, `how-m55-works display must not include: ${term}`);
    }
    assert.equal(
      (hw.section03FiveViewLabelsJa as readonly string[]).some((label) => label === '人との距離'),
      false,
      'section03 chip must not use bare 人との距離',
    );
  });

  it('P0 SSOT avoids hype and ten-type-only framing', () => {
    const copy = readPage(COPY_FILE);
    for (const term of [
      '完全オリジナル',
      '数千通り',
      'AI鑑定',
      '科学的証明',
      '未来を予測',
      '四柱推命',
      '宿曜',
      '算命学',
      '10通りの説明書',
    ] as const) {
      assert.equal(copy.includes(term), false, `forbidden term in topFreeEntry SSOT: ${term}`);
    }
    assert.match(copy, /10資質レーン/);
  });
});
