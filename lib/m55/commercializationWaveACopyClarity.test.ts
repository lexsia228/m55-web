/**
 * M55 Commercialization Wave A — Japanese clarity + terminology guardrails.
 * Proves confusing public labels are removed without price/funnel drift.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCommercialProduct } from './contracts/m55CommercialFunnelContract';
import { buildPersonalManualV1 } from './narrative/personalManualV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './freeResult/personalFreeFusedInsightSpecV3';
import { buildAlignDivergeItemsV1 } from './individualization/alignDivergeV1';
import { resolveCanonicalBirthProfileV2 } from './individualization/canonicalBirthProfileV2';
import { resolveFreeAxes } from './freeResult/buildFreeFiveViewCompositionV1';
import {
  PAID_DTR_INTRO_PANEL_01,
  PAID_DTR_SAVED_REPORT_PRICING,
} from './paidDtrProductCopy';
import { LABEL_PRODUCT_JP } from './dtrProductLabels';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import { HOME_PREMIUM_PREVIEW_FIXTURE } from './homePreviewFixtures';

const repoRoot = process.cwd();

const GOVERNED_HOME_PATHS = [
  'components/home/HomePanel.tsx',
  'components/home/HomePremiumPreviewSlice.tsx',
  'components/home/HomePrintSummary.tsx',
  'components/home/HomePremiumValueBridge.tsx',
  'lib/m55/topFreeEntryPublicCopy.ts',
  'lib/m55/homePreviewFixtures.ts',
] as const;

const MANUAL_LABEL_SOURCES = [
  'lib/m55/narrative/personalManualV1.ts',
  'lib/m55/narrative/projectPersonalPremiumNarrativeV1.ts',
  'lib/m55/narrative/publicIdentityFingerprintV1.ts',
] as const;

const COHERENT_MANUAL_LABELS = [
  '始め方',
  '決め方',
  '自分の中では',
  '誤解されやすいところ',
  '距離の取り方',
  '回復方法',
  '変化したとき',
  '私と話すときのヒント',
  '土台',
] as const;

function readRepo(rel: string): string {
  const abs = join(repoRoot, rel);
  assert.ok(existsSync(abs), `missing: ${rel}`);
  return readFileSync(abs, 'utf8');
}

function fusedFixture() {
  const answerSet = {
    'free.start_style': 'free.start_style.try_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.middle_steady',
    'free.change_style': 'free.change_style.adjust_fast',
    'free.primary_theme': 'free.primary_theme.report_preview',
  };
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: '1990-05-14' });
  const free = resolveFreeAxes(answerSet);
  assert.equal(canonical.ok && free.ok, true);
  if (!canonical.ok || !free.ok) throw new Error('fixture resolution failed');
  const align = buildAlignDivergeItemsV1({
    dobAxes: canonical.value.birthSignature.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet: answerSet,
  });
  assert.equal(align.ok, true);
  if (!align.ok) throw new Error('align failed');
  const fused = buildPersonalFreeFusedInsightSpecV3({
    birth: canonical.value.birthSignature,
    answers: free.value.axes,
    alignItems: align.value.alignItems,
    divergeItems: align.value.divergeItems,
    modifiers: {
      stemLane: canonical.value.stemLane,
      lunarMonth: canonical.value.lunarMonth,
      season3: canonical.value.season3,
      dayBand: canonical.value.dayBand,
      tensionIds: canonical.value.tensionIds,
    },
  });
  return { fused, axes: free.value.axes };
}

describe('commercialization wave A — Japanese clarity', () => {
  it('removes contextless manual label 実際は from governed narrative sources', () => {
    for (const rel of MANUAL_LABEL_SOURCES) {
      const src = readRepo(rel);
      assert.doesNotMatch(src, /labelJa:\s*'実際は'/);
      assert.doesNotMatch(src, /slot\([^,]+,\s*'実際は'/);
    }
  });

  it('keeps sibling Premium manual headings coherent', () => {
    const { fused, axes } = fusedFixture();
    const manual = buildPersonalManualV1({ axes, fused, completeness: 'short' });
    const labels = manual.slots.map((slot) => slot.labelJa);
    assert.ok(labels.length >= 4);
    for (const label of labels) {
      assert.ok(
        (COHERENT_MANUAL_LABELS as readonly string[]).includes(label),
        `unexpected manual label: ${label}`,
      );
    }
    assert.ok(labels.includes('始め方'));
    assert.ok(labels.includes('決め方'));
    const actual = manual.slots.find((slot) => slot.id === 'actual');
    if (actual) {
      assert.equal(actual.labelJa, '自分の中では');
      assert.ok(actual.bodyJa.trim().length >= 4);
    }
  });

  it('orients paid reader intro without vague overline-only phrasing', () => {
    assert.equal(PAID_DTR_INTRO_PANEL_01.overlineJa, 'レポートの読み方');
    assert.notEqual(PAID_DTR_INTRO_PANEL_01.overlineJa, '本質を見つめ直す');
    assert.match(PAID_DTR_INTRO_PANEL_01.bodyJa, /力が出やすい場面/);
    assert.match(PAID_DTR_INTRO_PANEL_01.leadLinesJa[1]!, /自分の形/);
    const reader = readRepo('components/dtr/DtrFullReader.tsx');
    assert.match(reader, /PAID_DTR_INTRO_PANEL_01\.overlineJa\}の説明/);
  });

  it('excludes Entry Report from governed HOME public copy', () => {
    const blob = GOVERNED_HOME_PATHS.map((rel) => readRepo(rel)).join('\n');
    assert.equal(blob.includes('Entry Report'), false);
    assert.match(blob, /プレミアムレポート/);
    assert.equal(HOME_PREMIUM_PREVIEW_FIXTURE.productTitleJa, 'M55 プレミアムレポート');
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.planComparisonCtaJa, 'プレミアムレポートを見る');
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.home.premiumValueBridgePremiumHeadingJa, LABEL_PRODUCT_JP);
  });

  it('preserves Light/Full product truth and pricing', () => {
    const light = getCommercialProduct('selfPremiumLight');
    const full = getCommercialProduct('selfPremiumFull');
    assert.equal(light.priceJpy, 1000);
    assert.equal(full.priceJpy, 1480);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.priceYen, 1000);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.priceYen, 1480);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen, 600);
  });
});
