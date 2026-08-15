import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import {
  customerLanguageBanned,
  lintPersonalPrimaryCopy,
} from './personalFreeManifestationV4';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';

function answers(partial: Record<string, string> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.try_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.middle_steady',
    'free.change_style': 'free.change_style.adjust_fast',
    'free.primary_theme': 'free.primary_theme.report_preview',
    ...partial,
  };
}

const A = answers();
const B = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});
const C = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.change_scene',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.rebuild_slow',
});
const D = answers({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.adjust_fast',
  'free.primary_theme': 'free.primary_theme.relation',
});
const E = answers({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.observe_first',
});
const F = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.rebuild_slow',
});

export const PERSONAL_V5_FIXTURES = [
  { id: 'P1', birthDate: '1983-02-28', stemLaneIndex: 9, freeAnswerSet: A },
  { id: 'P2', birthDate: '1990-05-14', stemLaneIndex: 1, freeAnswerSet: A },
  { id: 'P3', birthDate: '1983-02-28', stemLaneIndex: 9, freeAnswerSet: B },
  { id: 'P4', birthDate: '1990-05-14', stemLaneIndex: 1, freeAnswerSet: D },
  { id: 'P5', birthDate: '1992-08-20', stemLaneIndex: 3, freeAnswerSet: C },
  { id: 'P6', birthDate: '1983-02-28', stemLaneIndex: 9, freeAnswerSet: E },
  { id: 'P7', birthDate: '1992-08-20', stemLaneIndex: 3, freeAnswerSet: F },
] as const;

function specFor(fixture: (typeof PERSONAL_V5_FIXTURES)[number]) {
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: fixture.birthDate });
  const free = resolveFreeAxes(fixture.freeAnswerSet);
  assert.equal(canonical.ok && free.ok, true);
  if (!canonical.ok || !free.ok) throw new Error(fixture.id);
  const birth = canonical.value.birthSignature;
  const align = buildAlignDivergeItemsV1({
    dobAxes: birth.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet: fixture.freeAnswerSet,
  });
  assert.equal(align.ok, true);
  if (!align.ok) throw new Error(fixture.id);
  return buildPersonalFreeFusedInsightSpecV3({
    birth,
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
}

describe('personal free commercial copy v5', () => {
  it('seven fixtures have unique openings, unique scenes, and unique patterns', () => {
    const openings: string[] = [];
    const scenes: string[] = [];
    const patterns: string[] = [];
    const bridges: string[] = [];
    for (const fixture of PERSONAL_V5_FIXTURES) {
      const built = buildFreeDepthAnalysisV1(fixture);
      assert.equal(built.ok, true, fixture.id);
      if (!built.ok) continue;
      const spec = specFor(fixture);
      openings.push(built.value.headlineJa);
      scenes.push(spec.manifestation.sceneCandidateJa);
      patterns.push(spec.manifestation.patternId);
      bridges.push(built.value.premiumOpenLoopJa);
      assert.deepEqual(lintPersonalPrimaryCopy(built.value.headlineJa), [], fixture.id);
      assert.deepEqual(customerLanguageBanned(built.value.headlineJa), [], fixture.id);
      assert.doesNotMatch(built.value.headlineJa, /比較表|締めの書類|試作|返信を翌朝まで置いた朝|差分修正|会食や会議|大きな申し込み/);
      assert.doesNotMatch(built.value.headlineJa, /置くつもりが|材料が足りなくて|あわせて、|応募してしまう|カゴに入れ|送信ログ|カフェに移|返事の間隔を一人で|比べの途中で/);
      assert.doesNotMatch(built.value.headlineJa, /、一人になってから、/);
      assert.ok(((built.value.headlineJa.match(/同じ動き/g) ?? []).length) <= 1, fixture.id);
    }
    assert.equal(new Set(openings).size, 7);
    assert.equal(new Set(patterns).size, 7);
    assert.ok(new Set(bridges).size >= 3, 'premium bridges must not all be identical');
    const firstByPrimary = new Map<string, string>();
    for (let i = 0; i < openings.length; i += 1) {
      const first = openings[i]!.split('。')[0]!.trim();
      const primary = patterns[i]!.split('+')[0]!;
      const previous = firstByPrimary.get(first);
      if (previous && previous !== primary) {
        assert.fail(`opening clause reused across ${previous} and ${primary}: ${first}`);
      }
      firstByPrimary.set(first, primary);
    }
  });

  it('does not reuse a full opening or scene across different pattern identities', () => {
    const firstByPrimary = new Map<string, string>();
    for (const fixture of PERSONAL_V5_FIXTURES) {
      const spec = specFor(fixture);
      const primary = spec.manifestation.patternId.split('+')[0]!;
      const first = spec.headline.split('。')[0]!.trim();
      const previous = firstByPrimary.get(first);
      if (previous && previous !== primary) {
        assert.fail(`opening clause reused across ${previous} and ${primary}: ${first}`);
      }
      firstByPrimary.set(first, primary);
    }
  });

  it('scene follows manifestation identity rather than a generic start fallback', () => {
    const byPattern = new Map<string, string>();
    for (const fixture of PERSONAL_V5_FIXTURES) {
      const spec = specFor(fixture);
      const existing = byPattern.get(spec.manifestation.patternId);
      if (existing) assert.equal(existing, spec.manifestation.sceneCandidateJa);
      byPattern.set(spec.manifestation.patternId, spec.manifestation.sceneCandidateJa);
    }
    assert.equal(byPattern.size, 7);
  });
});
