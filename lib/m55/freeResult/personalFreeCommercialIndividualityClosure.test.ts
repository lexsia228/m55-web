/**
 * Personal Free commercial individuality presentation closure — targeted regressions.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { buildPersonalManualV1 } from '../narrative/personalManualV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';
import {
  assertCustomerCopyJa,
  customerCopyFragmentViolations,
  normalizeCustomerCopyJa,
} from './humanizeFreeResultWhyV1';
import { projectPersonalFreeNarrativeV1 } from '../narrative/projectPersonalFreeNarrativeV1';

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

const PATTERN_A = answers();
const PATTERN_B = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});

const DOB_X = { birthDate: '1983-02-28', stemLaneIndex: 9 };
const DOB_Y = { birthDate: '1990-05-14', stemLaneIndex: 1 };
const DOB_Z = { birthDate: '1992-08-20', stemLaneIndex: 3 };

function fusedFor(dob: { birthDate: string }, answerSet: Record<string, string>) {
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: dob.birthDate });
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

describe('personal free commercial individuality closure', () => {
  it('WHY includes birth + answer + fused evidence', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.value.conciseWhyJa.length, 3);
    const [birth, answer, fused] = built.value.conciseWhyJa;
    assert.match(birth, /生年月日から見ると/);
    assert.match(answer, /今回の回答では/);
    assert.match(fused, /この二つを合わせると/);
    for (const line of built.value.conciseWhyJa) {
      assert.equal(customerCopyFragmentViolations(line).length, 0);
      assertCustomerCopyJa(line);
    }
  });

  it('answer-changing fixture changes answer-sensitive WHY when fused evidence differs', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_B });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.conciseWhyJa[1], b.value.conciseWhyJa[1]);
    assert.notEqual(a.value.conciseWhyJa[2], b.value.conciseWhyJa[2]);
    assert.equal(a.value.conciseWhyJa[0], b.value.conciseWhyJa[0]);
  });

  it('hiddenSpec source differs from actual and normalized output differs', () => {
    const { fused, axes } = fusedFor(DOB_Z, PATTERN_A);
    const manual = buildPersonalManualV1({ axes, fused, completeness: 'short' });
    const actual = manual.slots.find((slot) => slot.id === 'actual');
    assert.ok(actual);
    if (!actual) return;
    if (manual.hiddenSpecJa.trim().length > 0) {
      assert.notEqual(
        normalizeCustomerCopyJa(manual.hiddenSpecJa),
        normalizeCustomerCopyJa(actual.bodyJa),
      );
      assert.notEqual(manual.hiddenSpecProvenanceIds.join(','), actual.provenanceIds.join(','));
    }
  });

  it('misread sentences are grammatically complete without machine fragments', () => {
    const { fused, axes } = fusedFor(DOB_Z, PATTERN_B);
    const manual = buildPersonalManualV1({ axes, fused, completeness: 'short' });
    const misread = manual.slots.find((slot) => slot.id === 'misread');
    assert.ok(misread);
    if (!misread) return;
    assert.match(misread.bodyJa, /人からは「.+」に見えやすい一方で、本人の中では.+。/);
    assert.doesNotMatch(misread.bodyJa, /よう人|側に重な|同じ方向に重なる/);
    assertCustomerCopyJa(misread.bodyJa);
  });

  it('optional DOB hero cue omitted when not coherent with primary mechanism', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.doesNotMatch(built.value.headlineJa, /期限の前の一日/);
    const sentences = built.value.headlineJa.split('。').filter((part) => part.trim().length > 0);
    assert.ok(sentences.length <= 2);
  });

  it('premium open question avoids opaque generic engine tail', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.doesNotMatch(
      built.value.premiumOpenQuestionJa,
      /距離の整え方と変化の最初の一手/,
    );
  });

  it('sensitivity matrix — same DOB changed answers', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_B });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.value.birthBaseJa, b.value.birthBaseJa);
    assert.notEqual(a.value.currentExpressionJa, b.value.currentExpressionJa);
    assert.notEqual(a.value.conciseWhyJa[1], b.value.conciseWhyJa[1]);
    assert.notEqual(a.value.headlineJa, b.value.headlineJa);
  });

  it('sensitivity matrix — same answers changed DOB', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_A });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.birthBaseJa, b.value.birthBaseJa);
    assert.notEqual(a.value.conciseWhyJa[0], b.value.conciseWhyJa[0]);
    assert.notEqual(a.value.headlineJa, b.value.headlineJa);
  });

  it('sensitivity matrix — different DOB and answers', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_B });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.headlineJa, b.value.headlineJa);
    assert.notEqual(a.value.conciseWhyJa.join('|'), b.value.conciseWhyJa.join('|'));
  });

  it('share candidates keep manual and seen_vs_actual when hidden spec omitted', () => {
    const narrative = projectPersonalFreeNarrativeV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    assert.equal(narrative.ok, true);
    if (!narrative.ok) return;
    const variants = narrative.value.shareCandidates.map((item) => item.variant);
    assert.ok(variants.includes('manual'));
    assert.ok(variants.includes('seen_vs_actual'));
  });
});
