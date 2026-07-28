/**
 * Final commercial language / visual UX closeout — PR #81.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './terminology';
import { buildPremiumBridgeTitle, STATIC_FREE_TO_PAID_BRIDGE } from '../../../components/core/corePublicCopy';
import {
  TRAIT_IDENTITY_CATALOG,
  assertTraitIdentityCatalogComplete,
  resolveTraitIdentity,
} from './traitIdentityCatalog';
import { buildPrivacySafeShareCardV1 } from '../freeResult/privacySafeShareCardV1';
import { buildFreeDepthAnalysisV1 } from '../freeResult/buildFreeDepthAnalysisV1';
import { PLAN_COMPARISON } from './planComparison';
import { MOBILE_MENU_PUBLIC } from './publicHeaderState';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const PATTERN_ANALYST = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

describe('commercial language visual UX final — CTA contract', () => {
  it('prohibits construction CTA and requires immediate-action CTA', () => {
    assert.equal(T.premiumBridgeCta, 'プレミアムの6問へ進む');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, 'プレミアムの6問へ進む');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.secondaryCtaJa, '無料結果を続けて読む');
    assert.equal(
      STATIC_FREE_TO_PAID_BRIDGE.lockedHeadingsHeadingJa,
      '6つの回答をもとに、結果の背景と整え方を詳しく読み解きます',
    );
    assert.match(buildPremiumBridgeTitle('アナリスト'), /さらに深く読み解く/);
    assert.doesNotMatch(buildPremiumBridgeTitle('アナリスト'), /4章/);
    assert.doesNotMatch(T.premiumBridgeCta, /4章を作る|4章で/);
    assert.doesNotMatch(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, /4章/);

    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(sticky, /STATIC_FREE_TO_PAID_BRIDGE\.primaryCtaJa/);
    assert.match(bridge, /primaryCtaJa/);
    assert.doesNotMatch(sticky + bridge + T.premiumBridgeCta, /6問に答えて4章を作る/);
  });

  it('paid completion copy confirms answers without promising a finished report', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    assert.match(q, /回答内容を確認しました/);
    assert.match(q, /プレミアムレポートの内容をあなた向けに整えます/);
    assert.match(q, /プランを選ぶ/);
    assert.match(q, /回答を見直す/);
    assert.doesNotMatch(q, /6つの回答がそろいました|プラン選択へ進む/);
  });
});

describe('commercial language visual UX final — result reasons', () => {
  it('uses natural reason title and Analyst editorial standard', () => {
    assert.match(read('components/core/CoreFreeResultSummaryHub.tsx'), /回答から見えた理由/);
    assert.doesNotMatch(read('components/core/CoreFreeResultSummaryHub.tsx'), /背景の読み方/);

    const built = buildFreeDepthAnalysisV1({
      birthDate: '1983-02-28',
      stemLaneIndex: 9,
      freeAnswerSet: PATTERN_ANALYST,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.match(built.value.headlineJa, /全体を見渡し、候補を比べてから動く傾向が、いま強く表れています/);
    assert.doesNotMatch(built.value.conciseWhyJa.join('\n'), /順序の好み|輪郭|外の刺激|整え方として連動|主パターン|背景の構造/);
    assert.match(built.value.conciseWhyJa[0]!, /全体を確認してから選ぶ|候補を比べてから選ぶ/);
  });
});

describe('commercial language visual UX final — all-ten editorial parity', () => {
  it('keeps one coherent identity across result/share/premium for all ten traits', () => {
    assertTraitIdentityCatalogComplete();
    assert.equal(TRAIT_IDENTITY_CATALOG.length, 10);
    for (const trait of TRAIT_IDENTITY_CATALOG) {
      const card = buildPrivacySafeShareCardV1({ stemLaneIndex: trait.stemLaneIndex })!;
      assert.equal(card.traitNameJa, trait.traitName);
      assert.equal(card.traitPhraseJa, trait.canonicalTagline);
      assert.equal(card.safeStatementJa, trait.shareStatement);
      assert.notEqual(card.traitPhraseJa, card.safeStatementJa);
      assert.match(trait.premiumContinuityTemplate, /さらに深く読み解く/);
      assert.doesNotMatch(trait.premiumContinuityTemplate, /4章/);
      assert.doesNotMatch(`${trait.canonicalTagline}\n${trait.shareStatement}`, /輪郭/);
    }
    const creator = resolveTraitIdentity(3)!;
    assert.match(creator.canonicalTagline, /材料を集め/);
    const analyst = resolveTraitIdentity(9)!;
    assert.match(analyst.canonicalTagline, /全体を見渡し/);
  });
});

describe('commercial language visual UX final — mobile header', () => {
  it('keeps login inside menu only below 960px', () => {
    const css = read('components/shell/ShellLayout.module.css');
    const header = read('components/shell/PublicHeader.tsx');
    assert.match(css, /max-width: 959px[\s\S]*?\.desktopAuth[\s\S]*?display:\s*none !important/);
    assert.match(header, /data-testid="m55-desktop-auth"/);
    assert.match(header, /m55-mobile-nav-contextual/);
    assert.equal(MOBILE_MENU_PUBLIC[0]!.label, T.home);
    assert.ok(MOBILE_MENU_PUBLIC.some((i) => i.label === T.freeEntry));
    assert.ok(MOBILE_MENU_PUBLIC.some((i) => i.label === T.premiumProduct));
    assert.ok(MOBILE_MENU_PUBLIC.some((i) => i.label === T.aboutM55));
    assert.ok(MOBILE_MENU_PUBLIC.some((i) => i.label === T.tenQualities));
    assert.match(header, /mobileNavAriaJa|モバイルナビゲーション/);
    assert.match(header, /Nav\.loginJa|ログイン/);
  });
});

describe('commercial language visual UX final — sticky + premium continuity', () => {
  it('measures sticky height and provides paid context strip', () => {
    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    assert.match(sticky, /ResizeObserver/);
    assert.match(sticky, /--m55-sticky-cta-height/);
    assert.match(sticky, /--m55-float-rail-offset/);
    assert.match(sticky, /IntersectionObserver/);

    const strip = read('components/dtr/DtrPaidResultContextStrip.tsx');
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    assert.match(strip, /m55-paid-result-context/);
    assert.match(strip, /あと6問・約1〜2分|STATIC_FREE_TO_PAID_BRIDGE\.effortJa/);
    assert.match(q, /DtrPaidResultContextStrip/);
    assert.match(q, /index === 0/);
  });
});

describe('commercial language visual UX final — plan decision surface', () => {
  it('uses purchase-decision copy and correct arithmetic', () => {
    assert.equal(PLAN_COMPARISON.light.priceJpy, 1000);
    assert.equal(PLAN_COMPARISON.full.priceJpy, 1480);
    assert.equal(PLAN_COMPARISON.priceDeltaJpy, 480);
    assert.equal(PLAN_COMPARISON.upgradePriceJpy, 600);
    assert.equal(PLAN_COMPARISON.lightThenUpgradeTotalJpy, 1600);
    assert.match(PLAN_COMPARISON.sameFourChaptersNoteJa, /4章構成の個人レポート/);
    assert.match(PLAN_COMPARISON.fullDeltaNoteJa, /480円/);
    assert.doesNotMatch(PLAN_COMPARISON.fullDeltaNoteJa, /\+480/);
    assert.match(PLAN_COMPARISON.upgradeNoteJa, /1,600円/);
    assert.match(PLAN_COMPARISON.upgradeNoteJa, /1,480円/);
    assert.equal(PLAN_COMPARISON.light.audienceJa, 'まず一つのテーマを深く見たい方へ');
    assert.match(read('components/dtr/DtrPaidPurchasePrep.tsx'), /PREMIUM_FUNNEL_PAGE_CONTENT|planTitleJa/);
    assert.match(
      read('lib/m55/commercialUx/experience/pageContent/premiumFunnelCopy.ts'),
      /自分に合うプランを選ぶ/,
    );
  });
});

describe('commercial language visual UX final — print contract', () => {
  it('HOME uses dedicated two-page print summary and hides floating controls', () => {
    const css = read('lib/m55/commercialUx/publicPrint.css');
    const summary = read('components/home/HomePrintSummary.tsx');
    const panel = read('components/home/HomePanel.tsx');
    assert.match(css, /data-m55-home-print-summary/);
    assert.match(css, /data-m55-print-page='1'/);
    assert.match(css, /page-break-after:\s*always/);
    assert.match(css, /m55-scroll-to-top/);
    assert.match(summary, /m55-home-print-summary/);
    assert.match(summary, /https:\/\/m-55\.jp/);
    assert.match(summary, /data-m55-print-page="1"/);
    assert.match(summary, /data-m55-print-page="2"/);
    assert.match(panel, /HomePrintSummary/);
  });
});
