import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const HOME_REQUIRED_PRIMARY_TERMS = [
  '自分が見える',
  '自己理解の入口です',
  '無料で見てみる',
  'まずは無料で見てみる',
  'まずは無料で、自分を見てみる',
  '無料結果から始められます',
  '無料結果の先で深まること',
  '保存版の中身',
  '本質と特質性',
  'M55複合暦解析',
  '保存版',
  'あなた固有の取扱説明書',
  '保存版は ¥1,000（税込）です',
  '¥1,000（税込）',
] as const;

const HOME_FORBIDDEN_PRIMARY_TERMS = [
  '自分の輪郭が見える。',
  '自分でも気づきにくい本質を見ていく場所です',
  '無料結果の先で見えること',
  '保存版で見えること',
  'まずは無料で、自分の輪郭を見る',
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
  '複合暦アルゴリズム',
  'M55独自の',
  '世界最先端',
  '未来が分かる',
  '問題が解決する',
  '医学的診断',
  '心理療法',
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

describe('homePublicCopy — composite calendar value prop', () => {
  it('uses M55複合暦解析 in method label and paid lead only once each surface', () => {
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.methodFlowLabelJa, 'M55複合暦解析');
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanLeadJa, /M55複合暦解析/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.methodFlowClosingJa.includes('M55複合暦解析'), false);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.paidPlanLeadJa, /10通りの資質/);
  });

  it('rolls back hero poster copy while keeping saved-edition hierarchy below', () => {
    const { home, cta } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.heroTitleLine2Ja, '自分が見える。');
    assert.match(home.heroSubJa, /自己理解の入口です/);
    assert.equal(cta.openFreeMapJa, '無料で見てみる');
    assert.equal(home.paidPlanLabelJa, '保存版');
    assert.equal(home.paidPlanSavedPreviewLabelJa, '保存版の中身');
  });

  it('uses free-first bottom funnel instead of purchase-page CTA', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.paidPlanCtaJa, 'まずは無料で見てみる');
    assert.equal(home.paidPlanFunnelTitleJa, 'まずは無料で、自分を見てみる');
    assert.match(home.paidPlanFunnelBodyJa, /無料結果から始められます/);
    assert.match(home.paidPlanFunnelBodyJa, /もっと深く知りたい人のためのものです/);
    assert.equal(home.paidPlanSavedInfoHeadingJa, '保存版について');
    assert.equal(home.paidPlanSavedInfoPriceJa, '保存版は ¥1,000（税込）です。');
    assert.equal(home.paidPlanCtaJa.includes('保存版で自分を深める'), false);
  });

  it('removes duplicate bottom free bridge and keeps a single funnel CTA', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(homePanelSource.includes('m55-home-free-bridge'), false);
    assert.equal(homePanelSource.includes('homeFreeBridge'), false);
    assert.equal(homePanelSource.includes('freeBridgeHasProfileTitleJa'), false);
    assert.equal('freeBridgeHasProfileTitleJa' in home, false);
    assert.equal('freeBridgeNoProfileTitleJa' in home, false);
  });

  it('centers essence, trait, and owner manual framing in paid body copy', () => {
    const { home, learnMore } = TOP_FREE_ENTRY_PUBLIC_COPY;
    const bodyBlob = [
      home.methodFlowClosingJa,
      home.paidPlanLeadJa,
      home.paidPlanSavedPreviewNoteJa,
      ...home.paidPlanCardsJa.map((card) => [card.titleJa, card.descJa].join('\n')),
      home.paidPlanValueSubheadingJa,
      home.paidPlanSavedInfoBodyJa,
      learnMore.homePaidNoteJa,
    ].join('\n');
    assert.match(bodyBlob, /本質と特質性/);
    assert.match(bodyBlob, /あなた固有の取扱説明書/);
    assert.match(bodyBlob, /感じ方、無理の出方/);
    assert.match(bodyBlob, /ひも解/);
  });

  it('downranks price and keeps it as small saved-edition info', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.paidPlanValueHeadingJa, '無料結果の先で深まること');
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
