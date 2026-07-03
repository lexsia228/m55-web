import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const HOME_FORBIDDEN_PRIMARY_TERMS = [
  '自分を責めるための診断',
  '何度も読み返せる',
  'PDF',
  '解析結果の整理',
  '個別解析結果を、日常で使える言葉に分けて整理します',
  '長いテキストではありません',
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
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');

function homeRenderedCopyBlob(): string {
  const { home, learnMore } = TOP_FREE_ENTRY_PUBLIC_COPY;
  const homeKeysUsedOnPage = [
    home.heroTitleLine1Ja,
    home.heroTitleLine2Ja,
    home.heroSubJa,
    home.heroSupportJa,
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
    ...home.paidPlanCardsJa.flatMap((card) => [card.titleJa, card.descJa]),
    home.paidPlanPriceLeadJa,
    home.paidPlanPriceWhatJa,
    home.paidPlanPriceJa,
    home.paidPlanSpecJa,
    home.paidPlanCtaJa,
    home.paidPlanFootnoteUpgradeJa,
    home.freeBridgeNoProfileTitleJa,
    home.freeBridgeNoProfileBodyJa,
    home.freeBridgeNoProfileCtaJa,
    home.freeBridgeHasProfileTitleJa,
    home.freeBridgeHasProfileBodyJa,
    home.freeBridgeHasProfileCtaJa,
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

  it('emphasizes user-value copy over creator-side analysis wording in body', () => {
    const { home, learnMore } = TOP_FREE_ENTRY_PUBLIC_COPY;
    const bodyBlob = [
      home.methodFlowClosingJa,
      home.paidPlanLeadJa,
      home.paidPlanSavedPreviewNoteJa,
      ...home.paidPlanCardsJa.map((card) => card.descJa),
      home.paidPlanPriceWhatJa,
      learnMore.homePaidNoteJa,
    ].join('\n');
    assert.match(bodyBlob, /あなた固有の理由と扱い方/);
    assert.equal(bodyBlob.includes('個別の解析結果'), false);
    assert.equal(home.paidPlanSavedPreviewLabelJa, '自分の扱い方が見える');
  });

  it('uses ¥1,000 clarity near CTA and keeps saved-edition CTA', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.paidPlanValueHeadingJa, '¥1,000で手に入るもの');
    assert.equal(home.paidPlanPriceWhatJa, 'あなた固有の理由と扱い方（保存版）');
    assert.equal(home.paidPlanCtaJa, '自分の理由と扱い方を見る');
    assert.match(home.paidPlanSpecJa, /個別解析結果｜保存版｜見方と整え方つき/);
    assert.equal(home.paidPlanLabelJa, '個別解析結果');
  });

  it('renders saved preview and price clarity on HomePanel without duplicate value block', () => {
    assert.match(homePanelSource, /m55-home-saved-preview/);
    assert.match(homePanelSource, /paidPlanPriceWhatJa/);
    assert.match(homePanelSource, /paidPlanSavedPreviewChaptersJa/);
    assert.equal(homePanelSource.includes('paidPlanValueClosingJa'), false);
    assert.equal(homePanelSource.includes('m55-home-paid-value-block'), false);
    assert.equal(homePanelSource.includes('paidPlanFootnotePrimaryJa'), false);
    assert.equal(homePanelSource.includes('themeChipsJa'), false);
  });

  it('does not expose forbidden primary terms in HOME rendered copy', () => {
    const blob = homeRenderedCopyBlob();
    for (const term of HOME_FORBIDDEN_PRIMARY_TERMS) {
      assert.equal(blob.includes(term), false, `HOME primary copy must not include: ${term}`);
    }
  });
});
