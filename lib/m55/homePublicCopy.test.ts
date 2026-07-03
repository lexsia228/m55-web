import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const PRODUCT_NAME = 'M55複合暦解析';
const MAX_PRODUCT_NAME_IN_HOME_RENDERED = 4;

const HOME_REQUIRED_PRIMARY_TERMS = [
  '自分が見える',
  '自己理解の入口です',
  '無料で見てみる',
  'まずは無料で見てみる',
  'まずは無料で、自分の入口を見る',
  '無料で、自分の入口を見る',
  'M55複合暦解析とは',
  'M55複合暦解析で、自分を深く読み解く',
  '追加解析で、今の自分と対話する',
  '深く見るほど、見えてくること',
  'M55複合暦解析は ¥1,000（税込）です',
  'M55追加解析 1回分つき',
  '¥1,000（税込）',
  'その誕生日を、',
  '一般論で終わらせない',
  'さらに深く、自分を読み解く',
] as const;

const HOME_FORBIDDEN_PRIMARY_TERMS = [
  '自分の輪郭が見える。',
  '自分でも気づきにくい本質を見ていく場所です',
  '無料結果の先で見えること',
  '保存版で見えること',
  'まずは無料で、自分の輪郭を見る',
  'まずは無料で、自分を見てみる',
  'さらに本質と特質性を深く知りたい人のためのものです',
  '保存版で自分を深める',
  '無料結果をもう一度見る',
  'まずは無料結果を見る',
  '無料結果ページで、あなたの輪郭を確認できます。',
  '保存版へ進む前に、まずは無料でM55を試せます。',
  '¥1,000で手に入るもの',
  '自分を責めるための診断',
  '何度も読み返せる',
  'PDF',
  '解析結果の整理',
  '個別解析結果を、日常で使える言葉に分けて整理します',
  '長いテキストではありません',
  'あなた固有の理由と扱い方',
  '自分の理由と扱い方を見る',
  '自分の取扱説明書を見る',
  '理由と扱い方を導きます',
  '4テーマ',
  '4章',
  '5つの視点',
  '読み返す',
  'Webでいつでも見返せます',
  '有料プラン',
  '有料',
  '複合暦アルゴリズム',
  'M55独自の',
  '世界最先端',
  '未来が分かる',
  '問題が解決する',
  '医学的診断',
  '心理療法',
  '相談',
  '返書',
  '往復機能',
  '詳細版',
  '確認できます',
  '対策',
  '問題解決',
  '大容量レポート',
  '保存版の中身',
  '保存版について',
  'M55複合暦解析について',
  'M55複合暦解析で見ていくこと',
  '無料結果の先で深まること',
  '無料結果から始められます',
  'あなた固有の取扱説明書',
  '気になることを、M55と見直す',
  'M55複合暦解析では、さらに深く',
  '含まれます',
  '追加解析チケット',
  '輪郭の入口',
  'さらに深く見たい方へ',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');

function homeRenderedCopyBlob(): string {
  const { home, learnMore, cta } = TOP_FREE_ENTRY_PUBLIC_COPY;
  const homeKeysUsedOnPage = [
    home.heroTitleLine1Ja,
    home.heroTitleLine2Ja,
    home.heroSubJa,
    home.heroSupportJa,
    cta.openFreeMapJa,
    home.seenThingsBridgeLabelJa,
    home.seenThingsBridgeHeadlineLine1Ja,
    home.seenThingsBridgeHeadlineLine2Ja,
    ...home.seenThingsBridgeItemsJa,
    home.seenThingsBridgeClosingJa,
    home.readNextSectionTitleJa,
    home.readNextHowTitleJa,
    home.readNextHowDescJa,
    home.readNextHowCtaJa,
    home.readNextQualitiesTitleJa,
    home.readNextQualitiesDescJa,
    home.readNextQualitiesCtaJa,
    home.methodFlowLabelJa,
    home.methodFlowHeadlineLine1Ja,
    home.methodFlowHeadlineLine2Ja,
    home.methodFlowBodyJa,
    ...home.methodFlowNodesJa.flatMap((node) => [node.leadJa, node.titleJa, node.descJa]),
    home.methodFlowClosingJa,
    home.paidPlanLabelJa,
    home.paidPlanHeadlineLine1Ja,
    home.paidPlanHeadlineLine2Ja,
    home.paidPlanLeadJa,
    ...home.paidPlanUniquenessChipsJa,
    home.paidPlanSavedPreviewLabelJa,
    home.paidPlanSavedPreviewNoteJa,
    ...home.paidPlanSavedPreviewChaptersJa.flatMap((ch) => [ch.roman, ch.titleJa, ch.teaserJa]),
    home.paidPlanValueHeadingJa,
    home.paidPlanValueSubheadingJa,
    ...home.paidPlanCardsJa.flatMap((card) => [card.titleJa, card.descJa]),
    home.paidPlanFunnelTitleJa,
    home.paidPlanFunnelBodyJa,
    home.paidPlanCtaJa,
    home.paidPlanSavedInfoHeadingJa,
    home.paidPlanSavedInfoBodyJa,
    home.paidPlanSavedInfoPriceJa,
    learnMore.summaryJa,
    learnMore.homeHowLinkJa,
    learnMore.homeTenViewsLinkJa,
    learnMore.homeIntroJa,
    learnMore.homeFreeNoteJa,
    learnMore.homePaidNoteJa,
  ];
  return homeKeysUsedOnPage.join('\n');
}

function countProductName(text: string): number {
  return [...text.matchAll(new RegExp(PRODUCT_NAME, 'g'))].length;
}

describe('homePublicCopy — composite calendar value prop', () => {
  it('uses M55複合暦解析とは as method label and dedupes paid section label', () => {
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.methodFlowLabelJa, 'M55複合暦解析とは');
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanLabelJa, '');
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanLeadJa, /10通りの資質/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanLeadJa.includes('M55複合暦解析'), false);
  });

  it('keeps hero poster copy unchanged', () => {
    const { home, cta } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.heroTitleLine1Ja, '生まれた日から、');
    assert.equal(home.heroTitleLine2Ja, '自分が見える。');
    assert.match(home.heroSubJa, /自己理解の入口です/);
    assert.equal(cta.openFreeMapJa, '無料で見てみる');
  });

  it('places hero funnel catch copy with natural third line', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.deepEqual(home.heroFunnelLinesJa, [
      '無料で、自分の入口を見る。',
      'M55複合暦解析で、自分を深く読み解く。',
      '追加解析で、今の自分と対話する。',
    ]);
    assert.equal(home.paidPlanFunnelBodyJa, home.heroFunnelLinesJa.join('\n'));
    assert.match(home.paidPlanFunnelBodyJa, /追加解析で、今の自分と対話する/);
    assert.equal(home.paidPlanFunnelBodyJa.includes('M55追加解析で、今の自分と対話する'), false);
  });

  it('uses commercial three-layer copy in bottom funnel', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.paidPlanCtaJa, 'まずは無料で見てみる');
    assert.equal(home.paidPlanFunnelTitleJa, 'まずは無料で、自分の入口を見る');
    assert.match(home.paidPlanFunnelBodyJa, /無料で、自分の入口を見る/);
    assert.match(home.paidPlanFunnelBodyJa, /M55複合暦解析で、自分を深く読み解く/);
    assert.match(home.paidPlanFunnelBodyJa, /追加解析で、今の自分と対話する/);
    assert.equal(home.paidPlanSavedInfoHeadingJa, 'さらに深く、自分を読み解く');
    assert.match(home.paidPlanSavedInfoPriceJa, /M55複合暦解析は ¥1,000（税込）です/);
    assert.match(home.paidPlanSavedInfoPriceJa, /M55追加解析 1回分つき/);
    assert.equal(home.paidPlanSavedInfoPriceJa.includes('含まれます'), false);
    assert.match(home.paidPlanSavedInfoPriceJa, /\n/);
  });

  it('keeps hero poster self-contained without post-hero three-line strip', () => {
    assert.equal(homePanelSource.includes('m55-home-hero-funnel'), false);
    assert.equal(homePanelSource.includes('heroFunnelLinesJa'), false);
    assert.match(homePanelSource, /m55-home-open-birth-intake/);
    assert.match(homePanelSource, /paidPlanFunnelBodyJa/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanFunnelBodyJa, /追加解析で、今の自分と対話する/);
  });

  it('removes duplicate bottom free bridge and keeps a single funnel CTA', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(homePanelSource.includes('m55-home-free-bridge'), false);
    assert.equal(homePanelSource.includes('homeFreeBridge'), false);
    assert.equal(homePanelSource.includes('freeBridgeHasProfileTitleJa'), false);
    assert.equal('freeBridgeHasProfileTitleJa' in home, false);
    assert.equal('freeBridgeNoProfileTitleJa' in home, false);
  });

  it('naturalizes body copy while keeping add-on analysis hook', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    const bodyBlob = [
      home.seenThingsBridgeClosingJa,
      home.methodFlowBodyJa,
      home.paidPlanLeadJa,
      home.paidPlanSavedPreviewNoteJa,
      ...home.paidPlanCardsJa.map((card) => [card.titleJa, card.descJa].join('\n')),
      home.paidPlanValueSubheadingJa,
      home.paidPlanSavedInfoBodyJa,
    ].join('\n');
    assert.match(bodyBlob, /M55追加解析/);
    assert.match(bodyBlob, /解析で見えた/);
    assert.match(bodyBlob, /感じ方、無理の出方/);
    assert.match(bodyBlob, /読み解/);
    assert.equal(bodyBlob.includes('保存版'), false);
    assert.equal(bodyBlob.includes('M55複合暦解析'), false);
    assert.equal(bodyBlob.includes('含まれます'), false);
  });

  it('limits product name repetition in rendered HOME copy', () => {
    const blob = homeRenderedCopyBlob();
    const count = countProductName(blob);
    assert.ok(count <= MAX_PRODUCT_NAME_IN_HOME_RENDERED, `expected <= ${MAX_PRODUCT_NAME_IN_HOME_RENDERED}, got ${count}`);
    assert.match(blob, /M55複合暦解析とは/);
    assert.match(blob, /M55複合暦解析で、自分を深く読み解く/);
    assert.match(blob, /M55複合暦解析は ¥1,000（税込）です/);
  });

  it('downranks price and keeps it as small product info', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(
      home.paidPlanValueHeadingJa,
      '無料では、自分の入口を。\n深く見るほど、自分が具体的になる。',
    );
    assert.equal(home.paidPlanFunnelTitleJa.includes('¥1,000'), false);
    assert.equal(home.paidPlanValueHeadingJa.includes('¥1,000'), false);
    assert.match(home.paidPlanSavedInfoPriceJa, /¥1,000（税込）/);
  });

  it('renders bottom funnel on HomePanel without purchase-style price box', () => {
    assert.match(homePanelSource, /m55-home-saved-preview/);
    assert.match(homePanelSource, /m55-home-bottom-funnel/);
    assert.match(homePanelSource, /paidPlanFunnelTitleJa/);
    assert.match(homePanelSource, /paidPlanSavedInfoPriceJa/);
    assert.match(homePanelSource, /homePaidPlanFreeCta/);
    assert.equal(homePanelSource.includes('paidPlanPriceWhatJa'), false);
    assert.equal(homePanelSource.includes('viewSavedPlansHref'), false);
    assert.equal(homePanelSource.includes('paidPlanValueClosingJa'), false);
    assert.equal(homePanelSource.includes('m55-home-paid-value-block'), false);
  });

  it('includes required primary terms in HOME rendered copy', () => {
    const blob = homeRenderedCopyBlob();
    for (const term of HOME_REQUIRED_PRIMARY_TERMS) {
      assert.equal(blob.includes(term), true, `HOME primary copy must include: ${term}`);
    }
  });

  it('does not expose forbidden primary terms in HOME rendered copy', () => {
    const blob = homeRenderedCopyBlob();
    for (const term of HOME_FORBIDDEN_PRIMARY_TERMS) {
      assert.equal(blob.includes(term), false, `HOME primary copy must not include: ${term}`);
    }
  });
});
