import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBirthSignatureV1 } from '../individualization/birthSignatureV1';
import { resolveDobAxes } from './buildFreeFiveViewCompositionV1';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { buildPersonalFreeInsightSpecV2 } from './personalFreeInsightSpecV2';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
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

const PATTERN_A = answers();
const PATTERN_B = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});

const BARNUM = [
  '実は繊細',
  '周囲に気を遣う',
  '一人の時間も必要',
  '時には迷う',
  '変化を求める一方で安定も大切',
];

const DOB_X = { birthDate: '1983-02-28', stemLaneIndex: 9 };
const DOB_Y = { birthDate: '1990-05-14', stemLaneIndex: 1 };
const DOB_Z = { birthDate: '1992-08-20', stemLaneIndex: 3 };

describe('birth signature reuses dal-v1 axes', () => {
  it('matches resolveDobAxes for the same date and stem', () => {
    const signature = buildBirthSignatureV1(DOB_X);
    const axes = resolveDobAxes(DOB_X);
    assert.equal(signature.ok && axes.ok, true);
    if (!signature.ok || !axes.ok) return;
    assert.deepEqual(signature.value.dimensions, axes.value);
    assert.equal(signature.value.sourceVersion, 'dal-v1');
    assert.ok(signature.value.birthEvidenceIds.length >= 3);
  });

  it('same date+stem is deterministic; different signatures differ', () => {
    const a = buildBirthSignatureV1(DOB_X);
    const b = buildBirthSignatureV1(DOB_X);
    const c = buildBirthSignatureV1(DOB_Y);
    assert.equal(a.ok && b.ok && c.ok, true);
    if (!a.ok || !b.ok || !c.ok) return;
    assert.equal(a.value.birthSignatureId, b.value.birthSignatureId);
    assert.notEqual(a.value.birthSignatureId, c.value.birthSignatureId);
  });
});

describe('personal fused insight quality v3', () => {
  it('P1 same answers, different birth signatures change the primary fused insight', () => {
    const x = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    const y = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_A });
    assert.equal(x.ok && y.ok, true);
    if (!x.ok || !y.ok) return;
    assert.notEqual(x.value.headlineJa, y.value.headlineJa);
    assert.notEqual(x.value.birthBaseJa, y.value.birthBaseJa);
  });

  it('P2 same DOB, different answers change current expression', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Z, freeAnswerSet: PATTERN_B });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.currentExpressionJa, b.value.currentExpressionJa);
    assert.notEqual(a.value.headlineJa, b.value.headlineJa);
    assert.notEqual(a.value.conciseWhyJa[0], b.value.conciseWhyJa[0]);
  });

  it('P3 same DOB + same answers is deterministic', () => {
    const a = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_A });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.value.headlineJa, b.value.headlineJa);
    assert.equal(a.value.birthBaseJa, b.value.birthBaseJa);
    assert.equal(a.value.currentExpressionJa, b.value.currentExpressionJa);
  });

  it('lead cannot be reproduced from DOB only or answers only', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const free = resolveFreeAxes(PATTERN_A);
    assert.equal(free.ok, true);
    if (!free.ok) return;
    const answerOnly = buildPersonalFreeInsightSpecV2(free.value.axes);
    assert.notEqual(built.value.headlineJa, answerOnly.headline);
    assert.notEqual(built.value.headlineJa, built.value.birthBaseJa);
    assert.notEqual(built.value.headlineJa, built.value.currentExpressionJa);
    assert.match(built.value.headlineJa, /土台|今回の答え/);
    assert.match(built.value.birthBaseJa, /生年月日の土台/);
  });

  it('fused spec records birth and at least two answer evidence ids', () => {
    const birth = buildBirthSignatureV1(DOB_X);
    const free = resolveFreeAxes(PATTERN_A);
    assert.equal(birth.ok && free.ok, true);
    if (!birth.ok || !free.ok) return;
    const align = buildAlignDivergeItemsV1({
      dobAxes: birth.value.dimensions,
      freeAxes: free.value.axes,
      freeAnswerSet: PATTERN_A,
    });
    assert.equal(align.ok, true);
    if (!align.ok) return;
    const spec = buildPersonalFreeFusedInsightSpecV3({
      birth: birth.value,
      answers: free.value.axes,
      alignItems: align.value.alignItems,
      divergeItems: align.value.divergeItems,
    });
    assert.ok(spec.birthEvidenceIds.length > 0);
    assert.ok(spec.answerEvidenceQuestionIds.length >= 2);
    assert.equal(spec.headline.includes(spec.interactionId), false);
    assert.equal(spec.headline.includes('dal-v1'), false);
  });

  it('rejects Barnum dual-sided filler', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const blob = [
      built.value.headlineJa,
      built.value.birthBaseJa,
      built.value.currentExpressionJa,
      ...built.value.conciseWhyJa,
    ].join('\n');
    for (const phrase of BARNUM) {
      assert.equal(blob.includes(phrase), false, phrase);
    }
  });
});
