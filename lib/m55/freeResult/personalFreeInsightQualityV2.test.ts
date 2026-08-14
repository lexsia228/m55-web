import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { FREE_FIVE_QUESTIONS_COPY_V1 } from './questionnaireCopyV1';
import { buildPersonalFreeInsightSpecV2 } from './personalFreeInsightSpecV2';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';

function answerSet(partial: Record<string, string>): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.report_preview',
    ...partial,
  };
}

const PATTERN_A = answerSet({
  'free.start_style': 'free.start_style.try_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.adjust_fast',
});

const PATTERN_A_DECISION_SHIFT = answerSet({
  'free.start_style': 'free.start_style.try_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.adjust_fast',
});

const PATTERN_B = answerSet({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});

const PATTERN_C = answerSet({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.change_scene',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.rebuild_slow',
});

const BASE = { birthDate: '1992-08-20', stemLaneIndex: 3 };

const PARAPHRASE_MARKERS = [
  '傾向があります',
  '回答が重なって',
  '回答が選ばれて',
  'いま強く表れています',
];

function publicBlob(answers: Record<string, string>): string {
  const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: answers });
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('depth failed');
  return [
    built.value.headlineJa,
    built.value.conclusionJa,
    ...built.value.conciseWhyJa,
    built.value.primarySceneJa,
    built.value.secondarySceneJa,
    built.value.premiumOpenLoopJa,
    built.value.premiumOpenQuestionJa,
  ].join('\n');
}

describe('personal free insight quality v2', () => {
  it('opening is not a single-answer paraphrase and differs when secondary signal changes', () => {
    const a = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    const shifted = buildFreeDepthAnalysisV1({
      ...BASE,
      freeAnswerSet: PATTERN_A_DECISION_SHIFT,
    });
    assert.equal(a.ok && shifted.ok, true);
    if (!a.ok || !shifted.ok) return;
    assert.notEqual(a.value.currentExpressionJa, shifted.value.currentExpressionJa);
    assert.notEqual(a.value.conciseWhyJa[0], shifted.value.conciseWhyJa[0]);
    for (const text of [a.value.headlineJa, shifted.value.headlineJa]) {
      for (const marker of PARAPHRASE_MARKERS) {
        assert.equal(text.includes(marker), false, marker);
      }
    }
  });

  it('requires internal tension, behavioral scene, and premium continuity', () => {
    for (const answers of [PATTERN_A, PATTERN_B, PATTERN_C]) {
      const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: answers });
      assert.equal(built.ok, true);
      if (!built.ok) continue;
      const blob = publicBlob(answers);
      assert.match(built.value.conciseWhyJa[0]!, /見え|内側|一方|分かれ|同時/);
      assert.match(built.value.primarySceneJa, /場面/);
      assert.match(built.value.premiumOpenLoopJa, /プレミアム|六つの場面|場面/);
      assert.doesNotMatch(blob, /もっと詳しく知りたい方はこちら/);
      assert.doesNotMatch(blob, /診断|運命|必ず|絶対/);
    }
  });

  it('does not paste questionnaire labels into the lead', () => {
    const labels = FREE_FIVE_QUESTIONS_COPY_V1.flatMap((q) => q.choices.map((c) => c.labelJa));
    const lead = publicBlob(PATTERN_C);
    let hits = 0;
    for (const label of labels) {
      if (label.length >= 4 && lead.includes(label)) hits += 1;
    }
    assert.ok(hits < 2);
  });

  it('insight spec records multi-question provenance without exposing it as copy', () => {
    const axes = resolveFreeAxes(PATTERN_A);
    assert.equal(axes.ok, true);
    if (!axes.ok) return;
    const spec = buildPersonalFreeInsightSpecV2(axes.value.axes);
    assert.ok(spec.evidenceQuestionIds.length >= 4);
    assert.equal(spec.headline.includes(spec.interactionId), false);
    assert.equal(spec.internalTension.includes('free.'), false);
  });
});
