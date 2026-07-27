/**
 * Competitor-informed Self free→Premium commercial UX guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../components/core/corePublicCopy';
import { getCommercialProduct } from './contracts/m55CommercialFunnelContract';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Self funnel commercial UX redesign', () => {
  it('free-result lead: no exact DOB; dynamic outcome is H1; type is secondary', () => {
    const lead = read('components/core/CoreFreeResultLeadSection.tsx');
    const essence = read('components/core/CoreEssencePanel.tsx');
    assert.match(essence, /CoreFreeResultLeadSection/);
    assert.doesNotMatch(
      essence.slice(essence.indexOf('shouldShowHero')),
      /CoreHeroSection/,
    );
    assert.match(lead, /freeResultLeadTitle/);
    assert.match(lead, /outcomeJa/);
    assert.match(lead, /typeLabelJa/);
    assert.match(lead, /supportingTraitJa/);
    assert.match(lead, /生年月日の土台と、いまの5つの回答から見える傾向です/);
    assert.doesNotMatch(lead, /生年月日 \$\{/);
    assert.doesNotMatch(lead, /formatRecordDateLabelJa|obsMeta|本質の見取り図/);
    assert.doesNotMatch(lead, /\d{4}年\d{1,2}月\d{1,2}日/);
  });

  it('outcome, scene, then Premium bridge; preview precedes plan grid', () => {
    const essence = read('components/core/CoreEssencePanel.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const slice = essence.slice(essence.indexOf('shouldShowResultSections(uxPhase) && composition'));
    const leadIdx = essence.indexOf('<CoreFreeResultLeadSection');
    const summaryIdx = slice.indexOf('<CoreFreeResultSummaryHub');
    const sceneIdx = slice.indexOf('<CoreFreeResultScenesSection');
    const bridgeIdx = slice.indexOf('<CoreEntryReportCTASection');
    assert.ok(leadIdx >= 0 && summaryIdx >= 0 && sceneIdx > summaryIdx && bridgeIdx > sceneIdx);
    assert.match(bridge, /CorePremiumReportPreviewSlice/);
    assert.match(bridge, /premiumLockedHeadingsJa/);
    const previewIdx = bridge.indexOf('<CorePremiumReportPreviewSlice');
    const ctaIdx = bridge.indexOf('m55-paid-bridge-primary');
    const planIdx = bridge.indexOf('conversionBridgePlanGrid');
    assert.ok(previewIdx >= 0 && ctaIdx > previewIdx && planIdx > ctaIdx);
  });

  it('Light/Full audience + in-card prices from machine authority', () => {
    const light = getCommercialProduct('selfPremiumLight');
    const full = getCommercialProduct('selfPremiumFull');
    assert.equal(light.priceJpy, 1000);
    assert.equal(full.priceJpy, 1480);
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.lightAudienceJa, 'いちばん気になる1テーマを深めたい方へ');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.fullAudienceJa, '仕事・関係・日常をまとめて整理したい方へ');
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.lightPlanBodyJa, /1件/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.fullPlanBodyJa, /5件/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.fullPlanBodyJa, /複数/);
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(bridge, /getCommercialProduct/);
    assert.match(bridge, /conversionBridgePlanPrice/);
    assert.match(bridge, /formatPriceLabelJa\(lightPriceJpy\)/);
    assert.match(bridge, /formatPriceLabelJa\(fullPriceJpy\)/);
    assert.doesNotMatch(bridge, /1000|1480/);
  });

  it('CTA copy, /dtr/lp destination, no checkout request', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, 'プレミアムレポートを作る');
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa, /あと6問/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref, '/dtr/lp');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(bridge, /viewSavedPlansHref/);
    assert.doesNotMatch(bridge, /PurchaseButton|\/api\/purchase/);
    assert.doesNotMatch(bridge, /checkoutStarted|checkout_started/);
  });

  it('six-question handoff explains benefits before effort', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    assert.match(q, /力が出やすい条件/);
    assert.match(q, /負担が重なる順番/);
    assert.match(q, /人との距離の取り方/);
    assert.match(q, /戻しやすい整え方/);
    assert.match(q, /あと6問・約1〜2分/);
    assert.match(q, /freeResultReady|無料結果を土台に|あと6問/);
    assert.match(q, /プラン選択・決済/);
    assert.doesNotMatch(q, /PurchaseButton|\/api\/purchase/);
  });

  it('privacy-safe commercial copy without unsupported claims', () => {
    const marketing = [
      STATIC_FREE_TO_PAID_BRIDGE.title,
      STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa,
      STATIC_FREE_TO_PAID_BRIDGE.lightAudienceJa,
      STATIC_FREE_TO_PAID_BRIDGE.fullAudienceJa,
      STATIC_FREE_TO_PAID_BRIDGE.previewBodyJa,
      STATIC_FREE_TO_PAID_BRIDGE.safetyNote,
    ].join('\n');
    assert.doesNotMatch(
      marketing,
      /今だけ|残りわずか|人気No|おすすめ度|カウントダウン|期間限定|科学的|精度|万人|保証(?!では)/,
    );
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.safetyNote, /診断、未来や結果の保証ではありません/);
    const lead = read('components/core/CoreFreeResultLeadSection.tsx');
    assert.doesNotMatch(lead, /今日の一歩/);
    const summary = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.doesNotMatch(summary, /今日の一歩/);
  });

  it('value hierarchy lead is concrete premium reason', () => {
    assert.equal(
      STATIC_FREE_TO_PAID_BRIDGE.title,
      'この動きが、なぜ続きやすいのかを見る',
    );
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.outcomesJa.length, 4);
  });
});
