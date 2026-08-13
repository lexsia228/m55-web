import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/** Mirror of deriveSavedReportTierSummary for node:test (no TS import). */
function deriveSavedReportTierSummary(params: {
  lightBacked: boolean;
  fullBacked: boolean;
  legacyStaticBacked: boolean;
  hasPaymentBacking: boolean;
  lightSnapshotReportInstanceId: string | null;
  walletFullEquivalent?: boolean;
}) {
  const walletFullEquivalent = params.walletFullEquivalent ?? false;
  const hasLight = params.lightBacked && !walletFullEquivalent;
  const hasFull = params.fullBacked || walletFullEquivalent;
  const hasLegacyStatic = params.legacyStaticBacked && !hasLight && !hasFull;
  const canUpgradeFromLight =
    params.lightBacked &&
    !params.fullBacked &&
    !walletFullEquivalent &&
    params.hasPaymentBacking &&
    params.lightSnapshotReportInstanceId != null;
  return {
    hasLight,
    hasFull,
    hasLegacyStatic,
    canUpgradeFromLight,
    reportInstanceId: canUpgradeFromLight ? params.lightSnapshotReportInstanceId : null,
  };
}

describe('deriveSavedReportTierSummary', () => {
  const lightOnly = {
    lightBacked: true,
    fullBacked: false,
    legacyStaticBacked: false,
    hasPaymentBacking: true,
    lightSnapshotReportInstanceId: 'snap-light-1',
  };

  it('no ownership → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      lightBacked: false,
      fullBacked: false,
      legacyStaticBacked: false,
      hasPaymentBacking: false,
      lightSnapshotReportInstanceId: null,
    });
    assert.equal(r.canUpgradeFromLight, false);
    assert.equal(r.reportInstanceId, null);
  });

  it('light owned → upgrade CTAあり', () => {
    const r = deriveSavedReportTierSummary(lightOnly);
    assert.equal(r.hasLight, true);
    assert.equal(r.hasFull, false);
    assert.equal(r.canUpgradeFromLight, true);
    assert.equal(r.reportInstanceId, 'snap-light-1');
  });

  it('full owned → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      lightBacked: false,
      fullBacked: true,
      legacyStaticBacked: false,
      hasPaymentBacking: true,
      lightSnapshotReportInstanceId: null,
    });
    assert.equal(r.canUpgradeFromLight, false);
  });

  it('light + full → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      ...lightOnly,
      fullBacked: true,
    });
    assert.equal(r.canUpgradeFromLight, false);
  });

  it('right-only orphan → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      ...lightOnly,
      hasPaymentBacking: false,
    });
    assert.equal(r.canUpgradeFromLight, false);
  });

  it('legacy static only → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      lightBacked: false,
      fullBacked: false,
      legacyStaticBacked: true,
      hasPaymentBacking: true,
      lightSnapshotReportInstanceId: null,
    });
    assert.equal(r.hasLegacyStatic, true);
    assert.equal(r.canUpgradeFromLight, false);
  });

  it('light backed but no visible light snapshot → upgrade CTAなし', () => {
    const r = deriveSavedReportTierSummary({
      ...lightOnly,
      lightSnapshotReportInstanceId: null,
    });
    assert.equal(r.canUpgradeFromLight, false);
  });

  it('light upgraded via wallet FULL-equivalent → Full display, no upgrade CTA', () => {
    const r = deriveSavedReportTierSummary({
      ...lightOnly,
      walletFullEquivalent: true,
    });
    assert.equal(r.hasLight, false);
    assert.equal(r.hasFull, true);
    assert.equal(r.canUpgradeFromLight, false);
    assert.equal(r.reportInstanceId, null);
  });

  it('fresh Full entitlement unaffected by wallet flag', () => {
    const r = deriveSavedReportTierSummary({
      lightBacked: false,
      fullBacked: true,
      legacyStaticBacked: false,
      hasPaymentBacking: true,
      lightSnapshotReportInstanceId: null,
      walletFullEquivalent: false,
    });
    assert.equal(r.hasFull, true);
    assert.equal(r.canUpgradeFromLight, false);
  });
});

describe('upgrade CTA placement — structural', () => {
  it('uses reply-tickets checkout with upgrade product key', () => {
    const src = read('components/dtr/LightToFullUpgradeButton.tsx');
    assert.ok(src.includes('/api/reply-tickets/checkout'));
    assert.ok(src.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'));
    assert.equal(src.includes('/api/purchase/checkout'), false);
    assert.equal(src.includes('DTR_CORE_FULL_V1'), false);
  });

  it('upgrade SKU is not in ownership product IDs', () => {
    const src = read('lib/oneTimeCheckout.ts');
    const block = src.slice(
      src.indexOf('DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS'),
      src.indexOf('export function isAllowedOneTimeProduct'),
    );
    assert.equal(block.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'), false);
  });

  const pages: Array<{ rel: string; needle: string }> = [
    { rel: 'components/my/MyPanel.tsx', needle: 'LightToFullUpgradeCta' },
    { rel: 'components/dtr/DtrShelfPanel.tsx', needle: 'LightToFullUpgradeCta' },
    { rel: 'app/dtr/core/page.tsx', needle: 'LightToFullUpgradeCta' },
    { rel: 'app/dtr/lp/page.tsx', needle: 'LightToFullUpgradeCta' },
  ];

  for (const { rel, needle } of pages) {
    it(`${rel} includes upgrade CTA`, () => {
      assert.ok(read(rel).includes(needle));
    });
  }

  it('pages show フルに切り替える（¥600） label SSOT', () => {
    assert.ok(read('lib/m55/dtrProductLabels.ts').includes('フルに切り替える（¥600）'));
    assert.ok(read('components/dtr/LightToFullUpgradeButton.tsx').includes('DTR_LIGHT_TO_FULL_UPGRADE_CTA_LABEL'));
  });

  it('derive logic matches implementation source', () => {
    const src = read('lib/m55/dtrSavedReportTier.ts');
    assert.ok(src.includes('export function deriveSavedReportTierSummary'));
    assert.ok(src.includes('lightSnapshotReportInstanceId'));
    assert.ok(src.includes('walletFullEquivalent'));
    assert.ok(src.includes('isFullEquivalentReplyWallet'));
    assert.equal(src.includes('DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1'), false);
  });
});
