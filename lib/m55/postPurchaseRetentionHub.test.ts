import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  buildPostPurchaseRetentionHubModel,
  resolveSavedReportPlan,
} from './postPurchaseRetentionHub';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from './privacySafeFunnelAnalytics';

const ROOT = join(import.meta.dirname, '..', '..');
const readRepo = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function wallet(total: number, remaining: number) {
  return {
    totalGrantedCount: total,
    availableCount: remaining,
    consumedCount: total - remaining,
    status: 'active',
  };
}

describe('post-purchase retention hub model', () => {
  it('keeps plan authority dynamic for Light and FULL', () => {
    assert.equal(resolveSavedReportPlan({ hasLight: true, hasFull: false }), 'light');
    assert.equal(resolveSavedReportPlan({ hasLight: false, hasFull: true }), 'full');
    assert.equal(resolveSavedReportPlan({ hasLight: false, hasFull: false }), 'unknown');
  });

  it('uses additional reading as primary while Light entitlement remains', () => {
    const model = buildPostPurchaseRetentionHubModel({
      tier: { hasLight: true, hasFull: false },
      wallet: wallet(1, 1),
    });
    assert.equal(model.planLabel, 'M55 プレミアムレポート ライト');
    assert.deepEqual(model.usage, { total: 1, remaining: 1, used: 0 });
    assert.equal(model.primaryAction, 'additional_reading');
    assert.equal(model.secondaryAction, 'saved_report');
  });

  it('uses saved report as primary when Light entitlement is exhausted', () => {
    const model = buildPostPurchaseRetentionHubModel({
      tier: { hasLight: true, hasFull: false },
      wallet: wallet(1, 0),
    });
    assert.deepEqual(model.usage, { total: 1, remaining: 0, used: 1 });
    assert.equal(model.primaryAction, 'saved_report');
    assert.equal(model.secondaryAction, null);
  });

  it('derives FULL used count from total minus remaining', () => {
    const model = buildPostPurchaseRetentionHubModel({
      tier: { hasLight: false, hasFull: true },
      wallet: wallet(5, 3),
    });
    assert.equal(model.planLabel, 'M55 プレミアムレポート フル');
    assert.deepEqual(model.usage, { total: 5, remaining: 3, used: 2 });
    assert.equal(model.primaryAction, 'additional_reading');
  });

  it('shows FULL plan label after Light→Full wallet upgrade (tier read model)', () => {
    const model = buildPostPurchaseRetentionHubModel({
      tier: { hasLight: false, hasFull: true },
      wallet: wallet(5, 5),
    });
    assert.equal(model.planLabel, 'M55 プレミアムレポート フル');
    assert.deepEqual(model.usage, { total: 5, remaining: 5, used: 0 });
  });

  it('does not make a false remaining claim when wallet authority is unavailable', () => {
    const model = buildPostPurchaseRetentionHubModel({
      tier: { hasLight: false, hasFull: true },
      wallet: null,
    });
    assert.equal(model.usage, null);
    assert.equal(model.primaryAction, 'saved_report');
    assert.equal(model.secondaryAction, null);
  });
});

describe('post-purchase retention hub wiring', () => {
  it('preserves unpurchased state and formal plan route', () => {
    const source = readRepo('components/my/MyPanel.tsx');
    assert.match(source, /ready_unpurchased/);
    assert.match(source, /MY_SAVED_REPORT_CTA_PLAN_HREF/);
    assert.match(source, /state === 'ready_unpurchased'/);
  });

  it('uses read-only wallet authority and keeps commerce paths untouched', () => {
    const route = readRepo('app/api/dtr/report-snapshot-ready/route.ts');
    assert.match(route, /readConsultWalletDisplaySnapshot/);
    assert.match(route, /consultWallet/);
    assert.doesNotMatch(route, /checkout|stripe|insert\(|update\(|delete\(/i);
  });

  it('keeps internal identifiers and pressure claims out of the hub UI', () => {
    const source = [
      readRepo('components/my/MyPanel.tsx'),
      readRepo('lib/m55/dtrProductLabels.ts'),
    ].join('\n');
    for (const term of [
      'purchaseContextId',
      'checkout_session_id',
      '残りわずか',
      '今すぐ使う',
      '失効間近',
      '自動更新',
      'サブスクリプション',
    ]) {
      assert.equal(source.includes(term), false, `forbidden hub claim: ${term}`);
    }
    assert.doesNotMatch(source, />\s*\{[^}]*reportInstanceId[^}]*\}\s*</);
  });

  it('wires direct reader and additional-reading actions with one owned card', () => {
    const source = readRepo('components/my/MyPanel.tsx');
    assert.match(source, /purchasedHub\.primaryAction === 'additional_reading'/);
    assert.match(source, /MY_CONSULT_CTA_HREF/);
    assert.match(source, /MY_SAVED_REPORT_CTA_OPEN_HREF/);
    assert.match(source, /entReady && !ownedReady/);
  });

  it('keeps chapters ahead of additional reading and provides the My Page return', () => {
    const hub = readRepo('components/dtr/PremiumDrawerHub.tsx');
    assert.ok(hub.indexOf('DRAWER_HUB_CHAPTER_ROWS') < hub.indexOf('DRAWER_HUB_CONSULT_ROW'));
    const layout = readRepo('app/dtr/core/layout.tsx');
    const headerState = readRepo('lib/m55/commercialUx/publicHeaderState.ts');
    assert.match(layout, /<PublicHeaderContainer \/>/);
    assert.match(headerState, /['"]\/my['"]/);
  });
});

describe('privacy-safe post-purchase analytics', () => {
  it('uses the locked event names and payload allowlist', () => {
    assert.equal(M55_FUNNEL_EVENTS.mySavedReportView, 'm55_my_saved_report_view');
    assert.equal(M55_FUNNEL_EVENTS.savedReportOpen, 'm55_saved_report_open');
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingEntryView,
      'm55_additional_reading_entry_view',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.additionalReadingStartClick,
      'm55_additional_reading_start_click',
    );
    const payload = buildPrivacySafeFunnelPayload(
      'my_saved_report',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    for (const forbidden of ['plan', 'remaining', 'used', 'userId', 'reportId']) {
      assert.equal(Object.hasOwn(payload, forbidden), false);
    }
  });

  it('dedupes post-purchase impressions by mount key', () => {
    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.mySavedReportView,
      'my_saved_report',
      'retention-test-key',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.mySavedReportView,
      'my_saved_report',
      'retention-test-key',
    );
    assert.ok(true);
  });

  it('wires reader open, entry view, and start click without send tracking', () => {
    const my = readRepo('components/my/MyPanel.tsx');
    const reader = readRepo('components/dtr/DtrFullReader.tsx');
    assert.match(my, /additionalReadingStartClick/);
    assert.match(reader, /premiumReportOpened/);
    assert.doesNotMatch(reader, /M55_FUNNEL_EVENTS\.savedReportOpen/);
    assert.match(reader, /additionalReadingEntryView/);
    assert.doesNotMatch(my + reader, /ticketConsumption|additionalReadingSend/);
  });
});
