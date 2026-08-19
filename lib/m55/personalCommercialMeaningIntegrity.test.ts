/**
 * Personal Commercial Meaning Integrity V1 — focused contract tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M55_CURRENT_RUNTIME_STATE } from './contracts/m55CommercialFunnelContract';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../oneTimeCheckout';
import { buildPurchaseInputSnapshotV1 } from './paidResult/purchaseInputSnapshotV1';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import {
  buildPaidSavedReportChapterBodiesV1,
  hashChapterBodiesForEquality,
} from './paidResult/buildPaidSavedReportChapterBodiesV1';
import {
  buildPremiumPurchasedSemanticProjectionV1,
  readPurchaseInputFromDraftSnapshot,
} from './narrative/buildPremiumPurchasedSemanticProjectionV1';
import { projectPersonalPremiumNarrativeV1 } from './narrative/projectPersonalPremiumNarrativeV1';
import { projectPremiumPublicShareV1, PREMIUM_SHARE_IDENTITY_PERSISTENCE } from './narrative/projectPublicShareV1';
import { collectPaidDtrLpCopyStrings, PAID_DTR_LP, PAID_DTR_LP_METADATA_TITLE_JA } from './paidDtrProductCopy';
import { PLAN_COMPARISON } from './commercialUx/planComparison';
import { runDtrEngine } from './dtrEngine';
import { buildPersonalManualV1 } from './narrative/personalManualV1';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readRepoFile(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

function freeSet(): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
  };
}

function paidSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'paid.work_focus': 'paid.work_focus.priority',
    'paid.decision_friction': 'paid.decision_friction.too_many',
    'paid.relation_focus': 'paid.relation_focus.words',
    'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
    'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
    'paid.restart_condition': 'paid.restart_condition.overview_first',
    ...overrides,
  };
}

const PROFILE = {
  nickname: 'QA',
  birthDate: '1990-01-15',
  birthTimeUnknown: true,
  country: 'JP',
};

function customerReachableTsFiles(): string[] {
  const roots = ['lib/m55', 'components', 'app'];
  const skip = ['.test.', '/__fixtures__/', 'dtrPaidChapterBodyGen.ts'];
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      if (skip.some((s) => full.includes(s))) continue;
      out.push(full);
    }
  }
  for (const root of roots) walk(join(repoRoot, root));
  return out;
}

describe('CQ-001 paid fulfillment fake generator isolation', () => {
  it('customer-reachable modules do not import buildFakeSectionBody', () => {
    const offenders = customerReachableTsFiles().filter((file) => {
      const src = readFileSync(file, 'utf8');
      return /buildFakeSectionBody/.test(src);
    });
    assert.equal(offenders.length, 0, offenders.map((f) => f.replace(repoRoot + '/', '')).join(', '));
  });

  it('saved report bodies contain no test-only or fake-provider markers', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_1',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 4,
      createdAt: '2026-08-19T00:00:00.000Z',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const v2 = buildV2FulfillmentSnapshotFromFields({
      nickname: PROFILE.nickname,
      birthDate: PROFILE.birthDate,
      birthTime: null,
      birthTimeUnknown: true,
      country: 'JP',
      birthplace: null,
      timezone: null,
    });
    const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
    const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);
    const bodies = buildPaidSavedReportChapterBodiesV1({
      draft: built.value.individualization,
      materialPack: pack,
    });
    const blob = JSON.stringify(bodies);
    assert.doesNotMatch(blob, /test-only|DOB-v2 generated|fake-provider|fake_deterministic/i);
    assert.doesNotMatch(blob, /【DOB-v2/);
  });

  it('s1–s4 chapter bodies are domain-distinct', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_2',
      productId: DTR_CORE_FULL_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 6,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const v2 = buildV2FulfillmentSnapshotFromFields({
      nickname: PROFILE.nickname,
      birthDate: PROFILE.birthDate,
      birthTime: null,
      birthTimeUnknown: true,
      country: 'JP',
      birthplace: null,
      timezone: null,
    });
    const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
    const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);
    const bodies = buildPaidSavedReportChapterBodiesV1({
      draft: built.value.individualization,
      materialPack: pack,
    });
    const s1 = bodies.s1_identity ?? '';
    const s2 = bodies.s2_composition ?? '';
    const s3 = bodies.s3_essence ?? '';
    const s4 = bodies.s4_strengths ?? '';
    assert.notEqual(s1, s2);
    assert.notEqual(s1, s3);
    assert.notEqual(s1, s4);
    assert.notEqual(s2, s3);
    assert.notEqual(s2, s4);
    assert.notEqual(s3, s4);
  });

  it('different paid inputs change chapter body hash materially', () => {
    const baseInput = {
      userId: 'user_pcmi_3',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      paidAnswerSet: paidSet(),
      stemLaneIndex: 2,
    };
    const a = buildPurchaseInputSnapshotV1({
      ...baseInput,
      freeAnswerSet: freeSet(),
    });
    const b = buildPurchaseInputSnapshotV1({
      ...baseInput,
      freeAnswerSet: {
        ...freeSet(),
        'free.start_style': 'free.start_style.try_first',
        'free.decision_style': 'free.decision_style.deadline_first',
      },
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    const v2 = buildV2FulfillmentSnapshotFromFields({
      nickname: PROFILE.nickname,
      birthDate: PROFILE.birthDate,
      birthTime: null,
      birthTimeUnknown: true,
      country: 'JP',
      birthplace: null,
      timezone: null,
    });
    const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
    const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);
    const bodiesA = buildPaidSavedReportChapterBodiesV1({
      draft: a.value.individualization,
      materialPack: pack,
    });
    const bodiesB = buildPaidSavedReportChapterBodiesV1({
      draft: b.value.individualization,
      materialPack: pack,
    });
    assert.notEqual(
      hashChapterBodiesForEquality(bodiesA),
      hashChapterBodiesForEquality(bodiesB),
    );
  });
});

describe('CQ-002 premium semantic projection', () => {
  it('manual headings bind to axis-domain sources only', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_4',
      productId: DTR_CORE_FULL_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 1,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const projection = buildPremiumPurchasedSemanticProjectionV1({
      purchaseInput: built.value,
      stemLaneIndex: 1,
    });
    assert.equal(projection.ok, true);
    if (!projection.ok) return;
    const manual = buildPersonalManualV1({
      axes: projection.value.axes,
      fused: projection.value.fused,
      completeness: 'complete',
    });
    for (const slot of manual.slots) {
      assert.ok(slot.provenanceIds.length > 0);
      assert.doesNotMatch(slot.provenanceIds.join(' '), /s7_work|s4_strengths|s5_friction/);
    }
    const envelope = runDtrEngine(
      { birthDate: PROFILE.birthDate, nickname: PROFILE.nickname, locale: 'ja-JP', contextScope: 'dtr' },
      { stemLaneIndex: 1, engineVersion: 'engine-v2', derivation: 'test', contractVersion: 'v2' },
    );
    const narrative = projectPersonalPremiumNarrativeV1({
      payload: envelope.payload,
      stemLaneIndex: 1,
      projection: projection.value,
    });
    const bodies = manual.slots.map((s) => s.bodyJa);
    const unique = new Set(bodies);
    assert.equal(unique.size, bodies.length, 'manual slot bodies must not repeat');
    assert.notEqual(narrative.takeaway?.text, narrative.actions[0]?.text);
  });

  it('omits unproven manual slots rather than borrowing unrelated chapter text', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_5',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 3,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const projection = buildPremiumPurchasedSemanticProjectionV1({
      purchaseInput: built.value,
      stemLaneIndex: 3,
    });
    assert.equal(projection.ok, true);
    if (!projection.ok) return;
    const envelope = runDtrEngine(
      { birthDate: PROFILE.birthDate, nickname: PROFILE.nickname, locale: 'ja-JP', contextScope: 'dtr' },
      { stemLaneIndex: 3, engineVersion: 'engine-v2', derivation: 'test', contractVersion: 'v2' },
    );
    const narrative = projectPersonalPremiumNarrativeV1({
      payload: envelope.payload,
      stemLaneIndex: 3,
      projection: projection.value,
    });
    const s7 = envelope.payload.fullSections.find((s) => s.id === 's7_work')?.body ?? '';
    for (const slot of narrative.manualSpec.slots) {
      if (slot.labelJa === '決め方') {
        assert.doesNotMatch(slot.bodyJa, new RegExp(s7.slice(0, 12)));
      }
    }
  });
});

describe('CQ-003 free/paid boundary', () => {
  it('machine contract keeps freeResultIncludesActionSuggestions false', () => {
    assert.equal(M55_CURRENT_RUNTIME_STATE.selfFree.freeResultIncludesActionSuggestions, false);
  });

  it('free scenes section source has no public action suggestion block', () => {
    const src = readRepoFile('components/core/CoreFreeResultScenesSection.tsx');
    assert.doesNotMatch(src, /次に一度だけ試すこと/);
    assert.doesNotMatch(src, /m55-free-once-action/);
  });
});

describe('premium share without sessionStorage', () => {
  it('share derives from purchase projection and token has no raw input', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_6',
      productId: DTR_CORE_FULL_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 5,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const projection = buildPremiumPurchasedSemanticProjectionV1({
      purchaseInput: built.value,
      stemLaneIndex: 5,
    });
    assert.equal(projection.ok, true);
    if (!projection.ok) return;
    const spec = projectPremiumPublicShareV1({
      stemLaneIndex: projection.value.stemLaneIndex,
      answerAxes: projection.value.axes,
      birthAxes: projection.value.birthAxes,
      hingeAxisId: projection.value.hingeAxisId,
    });
    assert.match(spec.token, /^n1/);
    assert.doesNotMatch(spec.token, /\d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(spec.token, /free\.|paid\./);
    assert.equal(PREMIUM_SHARE_IDENTITY_PERSISTENCE, 'PURCHASE_INPUT_SEMANTIC_PROJECTION_V1');
    const closeSrc = readRepoFile('components/narrative/PremiumNarrativeClose.tsx');
    assert.doesNotMatch(closeSrc, /sessionStorage/);
  });

  it('readPurchaseInputFromDraftSnapshot roundtrips', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_pcmi_7',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 2,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const read = readPurchaseInputFromDraftSnapshot({
      extra_json: { purchaseInputV1: built.value },
    });
    assert.ok(read);
    assert.equal(read?.individualization.audit.outputHash, built.value.individualization.audit.outputHash);
  });
});

describe('CQ-004 LP decision consolidation', () => {
  it('prices unchanged', () => {
    assert.equal(PLAN_COMPARISON.light.priceLabelJa, '¥1,000（税込）');
    assert.equal(PLAN_COMPARISON.full.priceLabelJa, '¥1,480（税込）');
    assert.equal(PLAN_COMPARISON.priceDeltaJpy, 480);
    assert.equal(PLAN_COMPARISON.lightThenUpgradeTotalJpy, 1600);
  });

  it('LP has one canonical plan decision block and no duplicate closing CTA section', () => {
    const lpSrc = readRepoFile('app/dtr/lp/page.tsx');
    assert.doesNotMatch(lpSrc, /function TierCard/);
    assert.equal((lpSrc.match(/<DtrPaidPurchasePrep/g) ?? []).length, 1);
    assert.doesNotMatch(lpSrc, /id="dtr-lp-final"/);
    assert.doesNotMatch(lpSrc, /id="dtr-lp-layers"/);
    const copyBlob = collectPaidDtrLpCopyStrings().join('\n');
    assert.doesNotMatch(copyBlob, /最終導線/);
  });

  it('governed LP hash anchors resolve on the LP page', () => {
    const lpSrc = readRepoFile('app/dtr/lp/page.tsx');
    assert.match(lpSrc, new RegExp(`id="${PAID_DTR_LP.hero.compareSectionId}"`));
    assert.equal(PAID_DTR_LP.hero.ctaLabelJa, 'プラン選択へ進む');
  });
});

describe('CQ-006 discovery metadata', () => {
  it('robots and sitemap exclude private routes', () => {
    const robots = readRepoFile('app/robots.ts');
    const sitemap = readRepoFile('app/sitemap.ts');
    const layout = readRepoFile('app/layout.tsx');
    assert.match(layout, /metadataBase.*m-55\.jp/);
    assert.match(robots, /\/dtr\/core/);
    assert.match(robots, /disallow/);
    assert.doesNotMatch(sitemap, /\/r\//);
    assert.doesNotMatch(sitemap, /\/dtr\/core/);
    assert.match(sitemap, /\/dtr\/lp/);
  });

  it('LP metadata uses canonical product title', () => {
    const lp = readRepoFile('app/dtr/lp/page.tsx');
    assert.match(lp, /PAID_DTR_LP_METADATA_TITLE_JA/);
    assert.match(lp, /プレミアムレポート/);
    assert.match(lp, /canonical/);
    assert.doesNotMatch(lp, /本質を見つめ直す \| M55 プレミアムレポート/);
    assert.equal(PAID_DTR_LP_METADATA_TITLE_JA, 'M55 プレミアムレポート | M55');
  });
});
