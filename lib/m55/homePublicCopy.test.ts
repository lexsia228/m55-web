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
  it('states DOB plus current answers without a DOB-only conclusion', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    const blob = [
      home.heroTitleLine1Ja,
      home.heroTitleLine2Ja,
      home.heroSubJa,
      home.heroTrustJa,
    ].join('\n');
    assert.match(blob, /生まれた日と、いまの答え/);
    assert.match(blob, /生年月日から得る手がかり/);
    assert.match(blob, /選択式の質問/);
    assert.doesNotMatch(blob, /生まれた日から、自分が見える/);
    assert.match(blob, /未来や性格を断定する診断ではありません/);
  });

  it('keeps one dominant personal action and one quiet compatibility action', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.heroFunnelCtaJa, '無料で自分を読み解く');
    assert.equal(home.heroCompatibilityCtaJa, '二人の関係を無料で見る');
    assert.match(homePanelSource, /posterHeroCta/);
    assert.match(homePanelSource, /posterHeroSecondaryCta/);
    assert.match(homePanelSource, /href="\/synastry"/);
  });

  it('maps exploration cards to personal and compatibility free routes', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.equal(home.readNextHowTitleJa, '自分を読む');
    assert.equal(home.readNextQualitiesTitleJa, '二人を読む');
    assert.match(homePanelSource, /href="\/core"[\s\S]*className=\{styles\.homeReadNextCard\}/);
    assert.match(homePanelSource, /href="\/synastry"[\s\S]*className=\{styles\.homeReadNextCard\}/);
    assert.match(home.readNextHowDescJa, /5つの傾向質問/);
    assert.match(home.readNextHowDescJa, /今の関心1問/);
    assert.match(home.readNextHowDescJa, /合計6回答/);
  });

  it('uses current light and FULL product truth without a single-price umbrella', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.match(home.paidPlanSavedInfoPriceJa, /保存版ライト/);
    assert.match(home.paidPlanSavedInfoPriceJa, /¥1,000（税込）/);
    assert.match(home.paidPlanSavedInfoPriceJa, /保存版FULL/);
    assert.match(home.paidPlanSavedInfoPriceJa, /¥1,480（税込）/);
    assert.match(home.paidPlanSavedInfoPriceJa, /追加読み解き1件/);
    assert.match(home.paidPlanSavedInfoPriceJa, /追加読み解き合計5件/);
    assert.doesNotMatch(home.paidPlanSavedInfoPriceJa, /M55複合暦解析は ¥1,000/);
  });

  it('shows commerce-paused compatibility copy from server authority', () => {
    const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
    assert.match(home.compatibilitySavedPausedJa, /準備中/);
    assert.match(home.compatibilitySavedPausedJa, /無料の見取り図/);
    assert.match(homePageSource, /isCompatibilityCommerceEnabled/);
    assert.match(homePanelSource, /compatibilityCommerceAvailable/);
  });

  it('retains the poster and restores one visible introduction and mechanism preview', () => {
    assert.match(homePanelSource, /\/home\/hero-tech-map\.webp/);
    assert.match(homePanelSource, /m55-home-visible-introduction/);
    assert.match(homePanelSource, /introductionBodyJa/);
    assert.match(homePanelSource, /introductionTrustJa/);
    assert.doesNotMatch(homePanelSource, /<details|m55-home-learn-more/);
    assert.equal((homePanelSource.match(/href="\/how-m55-works"/g) ?? []).length, 1);
    assert.match(homePanelSource, /methodPreviewFrameworkJa/);
  });

  it('keeps the paid continuation concise and links directly to the personal product page', () => {
    assert.match(homePanelSource, /data-testid="m55-home-paid-details"/);
    assert.match(homePanelSource, /href="\/dtr\/lp"/);
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
