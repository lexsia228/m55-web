import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_COMMERCIAL_FUNNEL_CONTRACT_VERSION,
  M55_COMMERCIAL_PRODUCTS,
  M55_COMMERCIAL_STATE_REGISTRY,
  M55_CURRENT_RUNTIME_STATE,
  M55_DEFERRED_RUNTIME_ASSERTIONS,
  M55_ENFORCEMENT_STATUS,
  M55_LEGACY_RUNTIME_DEBT,
  M55_REPORT_CHAPTERS,
  M55_ROADMAP_ORDER,
  M55_TARGET_COMMERCIAL_CONTRACT,
  getCommercialProduct,
} from './m55CommercialFunnelContract';

describe('m55CommercialFunnelContract — machine product truth', () => {
  it('locks contract version and pending enforcement', () => {
    assert.equal(M55_COMMERCIAL_FUNNEL_CONTRACT_VERSION, 'v1');
    assert.equal(M55_ENFORCEMENT_STATUS, 'PENDING_SELF_FUNNEL_IMPLEMENTATION');
  });

  it('defines four premium report chapters', () => {
    assert.equal(M55_REPORT_CHAPTERS.length, 4);
    assert.deepEqual(
      M55_REPORT_CHAPTERS.map((c) => c.titleJa),
      ['Ⅰ 輪郭を見る', 'Ⅱ 構造を読む', 'Ⅲ 無理を知る', 'Ⅳ 楽に扱う'],
    );
  });

  it('keeps self premium Light at ¥1,000 with one additional theme', () => {
    const light = getCommercialProduct('selfPremiumLight');
    assert.equal(light.priceJpy, 1000);
    assert.equal(light.additionalThemes, 1);
    assert.equal(light.reportChapters, 4);
    assert.equal(light.status, 'LIVE');
    assert.equal(light.productKey, 'dtr_core_light_v1');
  });

  it('keeps self premium Full at ¥1,480 with five additional themes', () => {
    const full = getCommercialProduct('selfPremiumFull');
    assert.equal(full.priceJpy, 1480);
    assert.equal(full.additionalThemes, 5);
    assert.equal(full.reportChapters, 4);
    assert.equal(full.status, 'LIVE');
    assert.equal(full.productKey, 'dtr_core_full_v1');
  });

  it('keeps pair premium NOT_LIVE with no HOME paid CTA', () => {
    const pair = getCommercialProduct('pairPremium');
    assert.equal(pair.status, 'NOT_LIVE');
    assert.equal(pair.showHomePaidCta, false);
    assert.equal(pair.productKey, 'compatibility_report_full_v1');
  });

  it('records current runtime gap for pre-result theme selection', () => {
    assert.equal(M55_CURRENT_RUNTIME_STATE.selfFree.preResultThemeSelection, true);
    assert.equal(M55_TARGET_COMMERCIAL_CONTRACT.selfFree.preResultThemeSelection, false);
    assert.equal(M55_LEGACY_RUNTIME_DEBT.preResultThemeSelectionStepJa, '今の関心');
  });

  it('does not claim target contract as implemented', () => {
    assert.notEqual(
      M55_CURRENT_RUNTIME_STATE.selfFree.preResultThemeSelection,
      M55_TARGET_COMMERCIAL_CONTRACT.selfFree.preResultThemeSelection,
    );
    assert.ok(M55_DEFERRED_RUNTIME_ASSERTIONS.length >= 3);
  });

  it('registers post-merge active lane and HOME final SSOT status', () => {
    assert.equal(M55_COMMERCIAL_STATE_REGISTRY.HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT, 'NOT_YET');
    assert.equal(
      M55_COMMERCIAL_STATE_REGISTRY.ACTIVE_LANE,
      '個人無料→個人Premiumファネルの一括実装',
    );
    assert.match(M55_COMMERCIAL_STATE_REGISTRY.COMPLETED_GREEN, /Commercial Funnel SSOT/);
  });

  it('locks roadmap order starting with Commercial Funnel SSOT', () => {
    assert.equal(M55_ROADMAP_ORDER[0], 'Commercial Funnel SSOT');
    assert.equal(M55_ROADMAP_ORDER[1], '個人無料→個人Premium');
  });

  it('exposes all five commercial products', () => {
    assert.ok(M55_COMMERCIAL_PRODUCTS.selfFree);
    assert.ok(M55_COMMERCIAL_PRODUCTS.pairFree);
    assert.ok(M55_COMMERCIAL_PRODUCTS.selfPremiumLight);
    assert.ok(M55_COMMERCIAL_PRODUCTS.selfPremiumFull);
    assert.ok(M55_COMMERCIAL_PRODUCTS.pairPremium);
  });
});
