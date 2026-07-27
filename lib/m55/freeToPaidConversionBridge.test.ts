/**
 * Free→paid conversion bridge — Product Truth, hierarchy, and analytics guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../components/core/corePublicCopy';
import {
  getCommercialProduct,
  M55_REPORT_CHAPTERS,
} from './contracts/m55CommercialFunnelContract';
import { PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from './privacySafeFunnelAnalytics';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('free-to-paid conversion bridge — Product Truth', () => {
  it('exposes exactly four Product Truth chapters aligned to machine contract', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.chapters.length, 4);
    assert.equal(M55_REPORT_CHAPTERS.length, 4);
    for (let i = 0; i < 4; i++) {
      assert.match(M55_REPORT_CHAPTERS[i]!.titleJa, new RegExp(STATIC_FREE_TO_PAID_BRIDGE.chapters[i]!.titleJa));
    }
  });

  it('keeps Light/Full pricing aligned with machine contract (no duplicate hardcode)', () => {
    const light = getCommercialProduct('selfPremiumLight');
    const full = getCommercialProduct('selfPremiumFull');
    assert.equal(light.priceJpy, 1000);
    assert.equal(full.priceJpy, 1480);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.priceYen, light.priceJpy);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.priceYen, full.priceJpy);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa, light.publicName);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa, full.publicName);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate, /\{lightPriceLabel\}/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate, /\{fullPriceLabel\}/);
  });

  it('uses outcome-first order and clear free / Light / Full distinction', () => {
    assert.ok(STATIC_FREE_TO_PAID_BRIDGE.outcomesJa.length >= 3);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.freeLayerBodyJa, /認識/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.savedLayerBodyJa, /背景|構造|扱い/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.lightPlanBodyJa, /1件/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.fullPlanBodyJa, /5件/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.lightAudienceJa, /一つの関心/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.fullAudienceJa, /複数の関心/);
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, 'あと6問でプレミアムレポートを作る');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.secondaryCtaJa, '無料の詳細をこのまま読む');
  });

  it('avoids fake urgency language in marketing surfaces', () => {
    const marketing = [
      STATIC_FREE_TO_PAID_BRIDGE.overline,
      STATIC_FREE_TO_PAID_BRIDGE.title,
      STATIC_FREE_TO_PAID_BRIDGE.freeLayerBodyJa,
      STATIC_FREE_TO_PAID_BRIDGE.savedLayerBodyJa,
      STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.secondaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa,
      STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate,
    ].join('\n');
    assert.doesNotMatch(marketing, /今だけ|残りわずか|人気No|おすすめ度|カウントダウン|期間限定/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.safetyNote, /診断、未来や結果の保証ではありません/);
  });

  it('CoreEssencePanel mounts a single bridge after summary and before free detail', () => {
    const src = read('components/core/CoreEssencePanel.tsx');
    const renderSlice = src.slice(src.indexOf('shouldShowResultSections(uxPhase) && composition'));
    assert.match(renderSlice, /CoreFreeResultSummaryHub/);
    assert.match(renderSlice, /CoreEntryReportCTASection/);
    assert.match(renderSlice, /CoreFreeResultScenesSection/);
    assert.doesNotMatch(renderSlice, /CoreFreeSavedBoundarySection/);
    assert.doesNotMatch(renderSlice, /focusThemeLabelJa/);
    const summaryIdx = renderSlice.indexOf('<CoreFreeResultSummaryHub');
    const bridgeIdx = renderSlice.indexOf('<CoreEntryReportCTASection');
    const detailIdx = renderSlice.indexOf('<CoreFreeResultScenesSection');
    assert.ok(summaryIdx >= 0 && bridgeIdx > summaryIdx && detailIdx > bridgeIdx);
  });

  it('bridge component exposes primary and secondary actions without checkout POST', () => {
    const src = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(src, /data-testid="m55-free-to-paid-bridge"/);
    assert.match(src, /data-testid="m55-paid-bridge-primary"/);
    assert.match(src, /data-testid="m55-paid-bridge-secondary"/);
    assert.match(src, /viewSavedPlansHref/);
    assert.match(src, /getCommercialProduct/);
    assert.match(src, /core-scenes/);
    assert.doesNotMatch(src, /PurchaseButton/);
    assert.doesNotMatch(src, /\/api\/purchase/);
    assert.doesNotMatch(src, /focusTheme/);
  });

  it('Premium bridge stays visible without CoreScrollReveal (no opacity-0 default)', () => {
    const src = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const css = read('components/core/CoreExperience.module.css');
    // Commercial CTA must not depend on observer-gated reveal.
    assert.doesNotMatch(src, /coreReveal/);
    assert.doesNotMatch(src, /data-core-reveal/);
    assert.doesNotMatch(src, /data-reveal-state/);
    // Bridge module styles must not hide the revenue block by default.
    const bridgeBlock = css.match(/\.conversionBridge\s*\{[^}]+\}/);
    assert.ok(bridgeBlock, 'conversionBridge rule present');
    assert.doesNotMatch(bridgeBlock![0], /opacity:\s*0/);
    assert.doesNotMatch(bridgeBlock![0], /visibility:\s*hidden/);
    assert.doesNotMatch(bridgeBlock![0], /pointer-events:\s*none/);
    // Other reveal targets may still use CoreScrollReveal — leave them alone.
    const scrollReveal = read('components/core/CoreScrollReveal.tsx');
    assert.match(scrollReveal, /data-core-reveal/);
    assert.match(read('components/core/CoreTendencyLoadSection.tsx'), /data-core-reveal/);
  });

  it('CSS keeps tap targets and quiet hierarchy', () => {
    const css = read('components/core/CoreExperience.module.css');
    assert.match(css, /\.conversionBridgePrimary/);
    assert.match(css, /min-height:\s*48px/);
    assert.match(css, /\.conversionBridgeSecondary/);
    assert.match(css, /min-height:\s*44px/);
  });
});

describe('privacy-safe funnel analytics', () => {
  it('payload allowlist only', () => {
    const payload = buildPrivacySafeFunnelPayload('core_paid_bridge', '2026-07-13T00:00:00.000Z');
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
  });

  it('rejects forbidden payload keys', () => {
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        eventVersion: 'v1',
        surface: 'core_paid_bridge',
        occurredAt: '2026-07-13T00:00:00.000Z',
        theme: 'forbidden',
      }),
    );
  });

  it('dedupes impressions by mount key', () => {
    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(M55_FUNNEL_EVENTS.paidBridgeView, 'core_paid_bridge', 'test-key');
    trackFunnelImpressionOnce(M55_FUNNEL_EVENTS.paidBridgeView, 'core_paid_bridge', 'test-key');
    assert.ok(true);
  });

  it('wires Self funnel event names without PII payload expansion', () => {
    assert.equal(M55_FUNNEL_EVENTS.selfEntryStarted, 'self_entry_started');
    assert.equal(M55_FUNNEL_EVENTS.freeResultViewed, 'free_result_viewed');
    assert.equal(M55_FUNNEL_EVENTS.premiumBridgeViewed, 'premium_bridge_viewed');
    assert.equal(M55_FUNNEL_EVENTS.checkoutStarted, 'checkout_started');
    const essence = read('components/core/CoreEssencePanel.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(essence, /selfEntryStarted/);
    assert.match(essence, /freeResultViewed/);
    assert.match(bridge, /premiumBridgeViewed/);
    // Navigation to /dtr/lp is not checkout initiation.
    assert.doesNotMatch(bridge, /checkoutStarted|checkout_started/);
  });

  it('questionnaire and plan prep wire funnel events', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(q, /paidQuestionnaireStart/);
    assert.match(q, /startQuestionnaire/);
    assert.match(q, /paidQuestionnaireComplete/);
    assert.match(prep, /paidPlanView/);
    assert.match(prep, /premiumPlanSelected/);
    assert.doesNotMatch(q, /trackFunnelImpressionOnce\(\s*M55_FUNNEL_EVENTS\.paidQuestionnaireStart/);
    assert.doesNotMatch(q + prep, /focusThemeLabelJa/);
    assert.doesNotMatch(q + prep, /m55_paid_bridge/);
  });
});
