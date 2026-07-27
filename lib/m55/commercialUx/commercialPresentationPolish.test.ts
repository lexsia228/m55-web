/**
 * Final commercial copy & presentation polish guards — PR #81.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STATIC_FREE_TO_PAID_BRIDGE, buildPremiumBridgeTitle } from '../../../components/core/corePublicCopy';
import { buildFreeDepthAnalysisV1 } from '../freeResult/buildFreeDepthAnalysisV1';
import { PLAN_COMPARISON, buildPlanComparisonModel } from './planComparison';
import {
  TRAIT_IDENTITY_CATALOG,
  assertTraitIdentityCatalogComplete,
} from './traitIdentityCatalog';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './terminology';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const SAMPLE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

const PROHIBITED_PHRASES = [
  '先に全体を見渡してから動く動き',
  '候補を並べて見比べてから決める判断',
  'いまの主パターンとして重なっています',
  '戻しやすい整え方',
  '背景の構造',
  'あなた向けに重ねます',
  'プレミアムレポートの6問を始める',
  'FULLを選ぶ',
  '一回払い',
  'm55-dtr-lp-continuity',
] as const;

describe('commercial presentation polish — Premium intro single', () => {
  it('bridge uses canonical copy and CTA without duplicate sales block on LP', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.overline, 'プレミアムレポート');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.supportingJa, /整え直しやすい順番/);
    assert.match(buildPremiumBridgeTitle('アナリスト'), /4章で深く読む/);

    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const lp = read('app/dtr/lp/page.tsx');
    assert.doesNotMatch(bridge, /conversionBridgePlanGrid/);
    assert.doesNotMatch(bridge, /outcomesJa/);
    assert.doesNotMatch(lp, /DtrLpPremiumContinuityIntro/);
    assert.match(bridge, /m55-paid-questionnaire/);
  });

  it('paid questionnaire starts at question 1/6 without entry sales card', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    assert.doesNotMatch(q, /phase === 'entry'/);
    assert.doesNotMatch(q, /あなた向けの4章レポートに仕上げます/);
    assert.doesNotMatch(q, /力が出やすい条件/);
    assert.match(q, /data-m55-paid-phase="question"/);
    assert.match(q, /\$\{index \+ 1\} \/ \$\{total\}/);
    assert.match(q, /ctaSupportJa|正解はありません/);
    assert.match(q, /paidQuestionnaireStart/);
  });
});

describe('commercial presentation polish — Japanese copy', () => {
  it('free depth headline uses canonical phrasing for map+sort axes', () => {
    const built = buildFreeDepthAnalysisV1({
      birthDate: '1990-12-19',
      stemLaneIndex: 9,
      freeAnswerSet: SAMPLE_ANSWERS,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.match(
      built.value.headlineJa,
      /全体を見渡してから動く傾向と、候補を比べてから決める傾向が、いまは重なって表れています。/,
    );
    assert.match(built.value.premiumOpenLoopJa, /整え直しやすい順番/);
  });

  it('prohibited duplicated phrases absent from polish surfaces', () => {
    const blob = [
      read('components/core/CoreFreeToPaidConversionBridge.tsx'),
      read('components/dtr/DtrPaidQuestionnaireLayer.tsx'),
      read('components/dtr/DtrPaidPurchasePrep.tsx'),
      read('lib/m55/freeResult/buildFreeDepthAnalysisV1.ts'),
      STATIC_FREE_TO_PAID_BRIDGE.supportingJa,
    ].join('\n');
    for (const phrase of PROHIBITED_PHRASES) {
      assert.doesNotMatch(blob, new RegExp(phrase));
    }
  });
});

describe('commercial presentation polish — trait identity', () => {
  it('all ten traits have natural taglines including analyst example', () => {
    assertTraitIdentityCatalogComplete();
    const analyst = TRAIT_IDENTITY_CATALOG[9]!;
    assert.equal(analyst.traitName, 'アナリスト');
    assert.equal(analyst.canonicalTagline, '全体を見渡し、つながりを整えてから動く人');
    assert.match(analyst.shareStatement, /全体と選択肢が見えたとき/);
    for (const trait of TRAIT_IDENTITY_CATALOG) {
      assert.ok(trait.canonicalTagline.length >= 8);
      assert.ok(trait.shareStatement.length >= 8);
    }
  });
});

describe('commercial presentation polish — plan cards', () => {
  it('Light/Full labels and arithmetic match Product Truth', () => {
    const plan = buildPlanComparisonModel();
    assert.equal(plan.light.priceJpy, 1000);
    assert.equal(plan.full.priceJpy, 1480);
    assert.equal(plan.priceDeltaJpy, 480);
    assert.equal(plan.selectFullCtaJa, 'フルを選ぶ');
    assert.equal(plan.oneTimeLabelJa, '買い切り・自動更新なし');
    assert.match(plan.upgradeNoteJa, /1,600円/);
    assert.match(plan.upgradeNoteJa, /1,480円/);
    assert.equal(plan.fullRecommendBadgeJa, 'おすすめ');
    assert.deepEqual(plan.light.includedItemsJa, ['4章の個人レポート', '追加読み解き 1件']);
  });

  it('all commercial surfaces consume PLAN_COMPARISON', () => {
    const pricing = read('app/pricing/page.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const lp = read('app/dtr/lp/page.tsx');
    assert.match(pricing, /PLAN_COMPARISON/);
    assert.match(prep, /PLAN_COMPARISON/);
    assert.match(lp, /PLAN_COMPARISON/);
    assert.doesNotMatch(lp, /PAID_DTR_LP\.tiers\.light/);
    assert.equal(PLAN_COMPARISON.selectLightCtaJa, 'ライトを選ぶ');
  });
});

describe('commercial presentation polish — print contract', () => {
  it('hides interactive chrome and avoids viewport min-height blank pages', () => {
    const css = read('lib/m55/commercialUx/publicPrint.css');
    assert.match(css, /premiumStickyBar/);
    assert.match(css, /min-height:\s*0/);
    assert.match(css, /max-width:\s*none/);
    assert.match(css, /@page/);
    assert.match(css, /position: static/);
  });
});

describe('commercial presentation polish — CTA terminology', () => {
  it('uses state-specific premium bridge CTA label', () => {
    assert.equal(T.premiumBridgeCta, '6問に答えて4章を作る');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
  });
});
