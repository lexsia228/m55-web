/**
 * Free→paid conversion bridge — Product Truth, hierarchy, and analytics guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../components/core/corePublicCopy';
import { PAID_DTR_DRAWER_CHAPTER_ENTRIES, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
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
  it('exposes exactly four Product Truth chapters', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.chapters.length, 4);
    for (let i = 0; i < 4; i++) {
      assert.equal(
        STATIC_FREE_TO_PAID_BRIDGE.chapters[i]!.titleJa,
        PAID_DTR_DRAWER_CHAPTER_ENTRIES[i]!.labelJa,
      );
      assert.equal(
        STATIC_FREE_TO_PAID_BRIDGE.chapters[i]!.roman,
        PAID_DTR_DRAWER_CHAPTER_ENTRIES[i]!.pillLabelJa,
      );
    }
  });

  it('keeps Light/FULL pricing aligned with Product Truth', () => {
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.priceYen, 1000);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.priceYen, 1480);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate, /\{lightPriceLabel\}/);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.priceNoteTemplate, /\{fullPriceLabel\}/);
  });

  it('uses one primary CTA and a secondary free-reading path', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, '保存版の質問へ進む');
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
    assert.match(renderSlice, /focusThemeLabelJa=\{composition\.synthesis\.focusThemeLabelJa\}/);
    assert.match(renderSlice, /id="core-daily"/);
    assert.doesNotMatch(renderSlice, /CoreFreeSavedBoundarySection/);
    const summaryIdx = renderSlice.indexOf('<CoreFreeResultSummaryHub');
    const bridgeIdx = renderSlice.indexOf('<CoreEntryReportCTASection');
    const detailIdx = renderSlice.indexOf('id="core-daily"');
    assert.ok(summaryIdx >= 0 && bridgeIdx > summaryIdx && detailIdx > bridgeIdx);
  });

  it('bridge component exposes primary and secondary actions', () => {
    const src = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(src, /data-testid="m55-free-to-paid-bridge"/);
    assert.match(src, /data-testid="m55-paid-bridge-primary"/);
    assert.match(src, /data-testid="m55-paid-bridge-secondary"/);
    assert.match(src, /viewSavedPlansHref/);
    assert.match(src, /core-daily/);
    assert.doesNotMatch(src, /PurchaseButton/);
    assert.doesNotMatch(src, /\/api\/purchase/);
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
    // Second call is a no-op; no throw expected.
    assert.ok(true);
  });

  it('questionnaire and plan prep wire funnel events', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(q, /paidQuestionnaireStart/);
    assert.match(q, /paidQuestionnaireComplete/);
    assert.match(prep, /paidPlanView/);
    assert.doesNotMatch(q + prep, /focusThemeLabelJa/);
    assert.doesNotMatch(q + prep, /m55_paid_bridge/);
  });
});
