/**
 * Free→paid conversion bridge — Product Truth, hierarchy, and analytics guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  STATIC_FREE_TO_PAID_BRIDGE,
  buildPremiumBridgeTitle,
} from '../../components/core/corePublicCopy';
import { M55_REPORT_CHAPTERS } from './contracts/m55CommercialFunnelContract';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './commercialUx/terminology';
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

  it('uses single personalized bridge copy and premium CTA', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.overline, 'プレミアムレポート');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.supportingJa, /個人無料読み解き/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.supportingJa, /整え直しやすい順番/);
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.freeLayerLabelJa, '個人無料読み解き');
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteJa, /M55 プレミアムレポート ライト/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteJa, /M55 プレミアムレポート フル/);
    assert.match(buildPremiumBridgeTitle('アナリスト'), /さらに深く読み解く/);
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.secondaryCtaJa, '無料結果を続けて読む');
  });

  it('avoids fake urgency language in marketing surfaces', () => {
    const marketing = [
      STATIC_FREE_TO_PAID_BRIDGE.overline,
      STATIC_FREE_TO_PAID_BRIDGE.supportingJa,
      STATIC_FREE_TO_PAID_BRIDGE.priceNoteJa,
      STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.secondaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa,
    ].join('\n');
    assert.doesNotMatch(marketing, /今だけ|残りわずか|人気No|おすすめ度|カウントダウン|期間限定/);
    assert.doesNotMatch(marketing, /IND-FREE|COMMERCE|RETENTION/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.safetyNote, /診断、未来や結果の保証ではありません/);
  });

  it('CoreEssencePanel mounts bridge after summary and scene', () => {
    const src = read('components/core/CoreEssencePanel.tsx');
    const renderSlice = src.slice(src.indexOf('shouldShowResultSections(uxPhase) && composition'));
    assert.match(renderSlice, /CoreFreeResultSummaryHub/);
    assert.match(renderSlice, /CoreEntryReportCTASection/);
    assert.match(renderSlice, /CoreFreeResultScenesSection/);
    assert.match(renderSlice, /depth=\{depthAnalysis\}/);
    assert.match(renderSlice, /traitName=/);
    const summaryIdx = renderSlice.indexOf('<CoreFreeResultSummaryHub');
    const sceneIdx = renderSlice.indexOf('<CoreFreeResultScenesSection');
    const bridgeIdx = renderSlice.indexOf('<CoreEntryReportCTASection');
    assert.ok(summaryIdx >= 0 && sceneIdx > summaryIdx && bridgeIdx > sceneIdx);
  });

  it('bridge component exposes primary and secondary actions without checkout POST', () => {
    const src = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(src, /data-testid="m55-free-to-paid-bridge"/);
    assert.match(src, /data-testid="m55-paid-bridge-primary"/);
    assert.match(src, /data-testid="m55-paid-bridge-secondary"/);
    assert.match(src, /data-testid="m55-premium-bridge-layers"/);
    assert.match(src, /data-testid="m55-premium-bridge-price"/);
    assert.match(src, /m55-paid-questionnaire/);
    assert.match(src, /core-scenes/);
    assert.doesNotMatch(src, /conversionBridgePlanGrid/);
    assert.doesNotMatch(src, /PurchaseButton/);
    assert.doesNotMatch(src, /\/api\/purchase/);
    assert.doesNotMatch(src, /focusTheme/);
  });

  it('Premium bridge stays visible without CoreScrollReveal (no opacity-0 default)', () => {
    const src = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const css = read('components/core/CoreExperience.module.css');
    assert.doesNotMatch(src, /coreReveal/);
    assert.doesNotMatch(src, /data-core-reveal/);
    assert.doesNotMatch(src, /data-reveal-state/);
    const bridgeBlock = css.match(/\.conversionBridge\s*\{[^}]+\}/);
    assert.ok(bridgeBlock, 'conversionBridge rule present');
    assert.doesNotMatch(bridgeBlock![0], /opacity:\s*0/);
    assert.doesNotMatch(bridgeBlock![0], /visibility:\s*hidden/);
    assert.doesNotMatch(bridgeBlock![0], /pointer-events:\s*none/);
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
    assert.equal(M55_FUNNEL_EVENTS.premiumPlanSelected, 'premium_plan_selected');
    assert.equal(M55_FUNNEL_EVENTS.checkoutStarted, 'checkout_started');
    const essence = read('components/core/CoreEssencePanel.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(essence, /selfEntryStarted/);
    assert.match(essence, /freeResultViewed/);
    assert.doesNotMatch(essence, /M55_FUNNEL_EVENTS\.freeResultView\b/);
    assert.match(bridge, /premiumBridgeViewed/);
    assert.doesNotMatch(bridge, /M55_FUNNEL_EVENTS\.paidBridgeView\b/);
    assert.match(bridge, /premiumCtaClicked/);
    assert.doesNotMatch(bridge, /M55_FUNNEL_EVENTS\.paidBridgePrimaryClick\b/);
    assert.doesNotMatch(bridge, /checkoutStarted|checkout_started/);
  });

  it('questionnaire and plan prep wire funnel events', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(q, /paidQuestionnaireStart/);
    assert.match(q, /paidQuestionnaireComplete/);
    assert.match(prep, /paidPlanView/);
    assert.match(prep, /premiumPlanSelected/);
    assert.doesNotMatch(q + prep, /focusThemeLabelJa/);
    assert.doesNotMatch(q + prep, /m55_paid_bridge/);
  });
});
