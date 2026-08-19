/**
 * M55 Commercialization Wave A — Japanese clarity + terminology guardrails.
 * Validates semantic/public manual labels and governed copy — not literal whitelists.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCommercialProduct } from './contracts/m55CommercialFunnelContract';
import {
  buildPersonalManualV1,
  PERSONAL_MANUAL_IDENTITY_FOUNDATION_LABEL_JA,
  PERSONAL_MANUAL_MANIFESTATION_LABEL_JA,
} from './narrative/personalManualV1';
import { projectPersonalPremiumNarrativeV1 } from './narrative/projectPersonalPremiumNarrativeV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './freeResult/personalFreeFusedInsightSpecV3';
import { buildAlignDivergeItemsV1 } from './individualization/alignDivergeV1';
import { resolveCanonicalBirthProfileV2 } from './individualization/canonicalBirthProfileV2';
import { resolveFreeAxes } from './freeResult/buildFreeFiveViewCompositionV1';
import { firstSentenceJa } from './narrative/narrativeSafetyV1';
import {
  PAID_DTR_INTRO_PANEL_01,
  PAID_DTR_SAVED_REPORT_PRICING,
} from './paidDtrProductCopy';
import { LABEL_PRODUCT_JP } from './dtrProductLabels';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import { HOME_PREMIUM_PREVIEW_FIXTURE } from './homePreviewFixtures';
import type { DtrPayload } from './dtrEngine';

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

/** Contextless or predicate-dependent fragments — must not be manual slot headings. */
const FORBIDDEN_MANUAL_HEADINGS = [
  '実際は',
  '自分の中では',
  '土台',
  '内側では',
  '本人の中では',
] as const;

/** Standalone public noun/phrase headings — no trailing particles that require a predicate. */
const STANDALONE_HEADING = /^[^、。]+(?:方|傾向|ところ|ヒント|反応)$/u;

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

function premiumFallbackPayload(): DtrPayload {
  return {
    version: 'dtr_payload_v1',
    fullSections: [
      {
        id: 's1_identity',
        title: 'あなたという人物',
        summary:
          '生年月日から見える基礎傾向として、落ち着いて整える動き方が前面に出やすい人物像です。',
        body: '',
      },
      {
        id: 's4_strengths',
        title: '自分の出やすい面',
        summary: '小さく試してから全体を描く場面で力が出やすい。',
        body: '',
      },
      {
        id: 's5_friction',
        title: '無理が出やすいところ',
        summary: '急かされると候補の点検が止まらなくなる。',
        body: '',
      },
      {
        id: 's6_relation',
        title: '人とのやりとりの癖',
        summary: '近い関係ほど距離感を言葉にして整える。',
        body: '',
      },
      {
        id: 's7_work',
        title: '仕事・これからの進め方',
        summary: '',
        body: '候補を並べてから、答えを一つに絞る場面が多い。',
      },
    ],
  } as DtrPayload;
}

function assertStandaloneHeading(labelJa: string): void {
  assert.match(labelJa, STANDALONE_HEADING, `heading must read as a standalone noun phrase: ${labelJa}`);
  for (const forbidden of FORBIDDEN_MANUAL_HEADINGS) {
    assert.notEqual(labelJa, forbidden, `forbidden incomplete heading: ${forbidden}`);
  }
}

describe('commercialization wave A — Japanese clarity', () => {
  it('removes contextless manual headings from governed narrative sources', () => {
    for (const rel of MANUAL_LABEL_SOURCES) {
      const src = readRepo(rel);
      assert.doesNotMatch(src, /labelJa:\s*'実際は'/);
      assert.doesNotMatch(src, /slot\([^,]+,\s*'実際は'/);
      for (const forbidden of FORBIDDEN_MANUAL_HEADINGS) {
        assert.doesNotMatch(src, new RegExp(`labelJa:\\s*'${forbidden}'`));
      }
    }
  });

  it('binds manifestation actual slot label to fused.shortJa semantics', () => {
    const { fused, axes } = fusedFixture();
    const manual = buildPersonalManualV1({ axes, fused, completeness: 'short' });
    const actual = manual.slots.find((slot) => slot.id === 'actual');
    assert.ok(actual);
    if (!actual) return;

    assert.equal(actual.labelJa, PERSONAL_MANUAL_MANIFESTATION_LABEL_JA);
    assertStandaloneHeading(actual.labelJa);
    assert.equal(actual.bodyJa, firstSentenceJa(fused.manifestation.shortJa));
    assert.ok(actual.provenanceIds.includes('personal_free_manifestation_v4'));
    assert.notEqual(actual.labelJa, PERSONAL_MANUAL_IDENTITY_FOUNDATION_LABEL_JA);
  });

  it('keeps axis manual headings clear and unchanged where already semantic', () => {
    const { fused, axes } = fusedFixture();
    const manual = buildPersonalManualV1({ axes, fused, completeness: 'short' });
    const start = manual.slots.find((slot) => slot.id === 'start');
    const decision = manual.slots.find((slot) => slot.id === 'decision');
    assert.ok(start && decision);
    if (!start || !decision) return;

    assert.equal(start.labelJa, '始め方');
    assert.equal(decision.labelJa, '決め方');
    assertStandaloneHeading(start.labelJa);
    assertStandaloneHeading(decision.labelJa);
    assert.match(start.bodyJa, /動か|取りかか|段取り|意見/);
    assert.match(decision.bodyJa, /候補|決め|返す|ここまで/);
  });

  it('binds premium s1 fallback slot label to identity foundation semantics', () => {
    const payload = premiumFallbackPayload();
    const narrative = projectPersonalPremiumNarrativeV1({
      payload,
      stemLaneIndex: 1,
    });
    const identitySlot = narrative.manualSpec.slots.find((slot) => slot.id === 'actual');
    assert.ok(identitySlot);
    if (!identitySlot) return;

    assert.equal(identitySlot.labelJa, PERSONAL_MANUAL_IDENTITY_FOUNDATION_LABEL_JA);
    assertStandaloneHeading(identitySlot.labelJa);
    assert.ok(identitySlot.provenanceIds.includes('s1_identity'));
    assert.equal(
      identitySlot.bodyJa,
      firstSentenceJa(payload.fullSections.find((s) => s.id === 's1_identity')?.summary ?? ''),
    );
    assert.notEqual(identitySlot.labelJa, PERSONAL_MANUAL_MANIFESTATION_LABEL_JA);
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
