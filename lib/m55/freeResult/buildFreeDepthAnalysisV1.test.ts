import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FREE_CHANGE_ANSWER_TO_TENDENCY,
  FREE_DECISION_ANSWER_TO_TENDENCY,
  FREE_DISTANCE_ANSWER_TO_TENDENCY,
  FREE_RECOVERY_ANSWER_TO_TENDENCY,
  FREE_START_ANSWER_TO_TENDENCY,
} from '../individualization/answerIdMapsV1';
import {
  buildFreeDepthAnalysisV1,
  freeDepthLooksLikeAnswerConcatenation,
} from './buildFreeDepthAnalysisV1';
import { FREE_FIVE_QUESTIONS_COPY_V1 } from './questionnaireCopyV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

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

/** Pattern A: try + sort + pause + middle + adjust */
const PATTERN_A = answerSet({
  'free.start_style': 'free.start_style.try_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.adjust_fast',
});

/** Pattern B: map + deadline + shrink + close + observe */
const PATTERN_B = answerSet({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});

/** Pattern C: ask + wait + scene + solo + rebuild */
const PATTERN_C = answerSet({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.change_scene',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.rebuild_slow',
});

const BASE = { birthDate: '1992-08-20', stemLaneIndex: 3 };

describe('buildFreeDepthAnalysisV1', () => {
  it('same inputs produce the same depth analysis', () => {
    const a = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(JSON.stringify(a.value), JSON.stringify(b.value));
  });

  it('primary result uses multiple axes (not a single-axis paraphrase)', () => {
    const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.ok(built.value.primaryAxes.length >= 2);
    assert.ok(built.value.secondaryAxes.length >= 2);
    assert.match(built.value.conclusionJa, /始め|決め/);
    assert.match(built.value.conclusionJa, /距離|変化|回復/);
  });

  it('result is not direct concatenation of selected answer copy', () => {
    const labels = FREE_FIVE_QUESTIONS_COPY_V1.flatMap((q) =>
      q.choices.map((c) => c.labelJa),
    );
    for (const set of [PATTERN_A, PATTERN_B, PATTERN_C]) {
      const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: set });
      assert.equal(built.ok, true);
      if (!built.ok) continue;
      assert.equal(
        freeDepthLooksLikeAnswerConcatenation(built.value, labels),
        false,
      );
    }
  });

  it('changed answers materially alter combined interpretation', () => {
    const a = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    const b = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_B });
    const c = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_C });
    assert.equal(a.ok && b.ok && c.ok, true);
    if (!a.ok || !b.ok || !c.ok) return;
    assert.notEqual(a.value.conclusionJa, b.value.conclusionJa);
    assert.notEqual(b.value.conclusionJa, c.value.conclusionJa);
    assert.notEqual(a.value.hiddenSideJa, c.value.hiddenSideJa);
    assert.notEqual(
      a.value.scenesJa.workJa,
      c.value.scenesJa.workJa,
    );
  });

  it('hidden/contrast and strength/load conditions exist', () => {
    const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_B });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.ok(built.value.hiddenSideJa.length > 40);
    assert.ok(built.value.strengthConditionsJa.length >= 1);
    assert.ok(built.value.strengthConditionsJa.length <= 3);
    assert.ok(built.value.loadConditionsJa.length >= 1);
    assert.ok(built.value.loadConditionsJa.length <= 3);
    assert.equal(built.value.reasonsJa.length, 3);
  });

  it('scene specificity covers work, relation, and change', () => {
    const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_C });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.match(built.value.scenesJa.workJa, /仕事|判断|依頼|候補|試作|確認/);
    assert.match(built.value.scenesJa.relationJa, /距離|関わり|一人|連絡|会食/);
    assert.match(built.value.scenesJa.changeJa, /予定|環境|変化|変更/);
  });

  it('forbids action prescription and legacy/abrupt public wording', () => {
    const built = buildFreeDepthAnalysisV1({ ...BASE, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const blob = [
      built.value.headlineJa,
      built.value.conclusionJa,
      ...built.value.reasonsJa,
      built.value.hiddenSideJa,
      ...built.value.strengthConditionsJa,
      ...built.value.loadConditionsJa,
      built.value.scenesJa.workJa,
      built.value.scenesJa.relationJa,
      built.value.scenesJa.changeJa,
    ].join('\n');
    assert.doesNotMatch(blob, /してください|するとよい|しましょう|今日の一歩/);
    assert.doesNotMatch(blob, /保存版/);
    assert.doesNotMatch(blob, /月の前半|月の後半|月初め/);
    assert.doesNotMatch(blob, /扱い方|戻し方/);
    assert.doesNotMatch(blob, /free\.|selectors-v|fp-v1/);
  });

  it('answer/facet mappings remain frozen', () => {
    assert.equal(FREE_START_ANSWER_TO_TENDENCY['free.start_style.try_first'], 'try');
    assert.equal(FREE_DECISION_ANSWER_TO_TENDENCY['free.decision_style.sort_first'], 'sort');
    assert.equal(FREE_RECOVERY_ANSWER_TO_TENDENCY['free.recovery_style.pause_short'], 'pause');
    assert.equal(FREE_DISTANCE_ANSWER_TO_TENDENCY['free.distance_style.middle_steady'], 'middle');
    assert.equal(FREE_CHANGE_ANSWER_TO_TENDENCY['free.change_style.adjust_fast'], 'adjust');
  });
});

describe('free result depth UI / questionnaire polish guards', () => {
  it('question progress is single N/6 system without 質問N/5 duplication', () => {
    const q = read('components/core/CoreFreeQuestionnaireLayer.tsx');
    const progress = read('components/core/CoreFreeContinuousFlowProgress.tsx');
    assert.match(q, /CoreFreeContinuousFlowProgress/);
    assert.match(q, /次の質問へ/);
    assert.match(q, /\{current\.shortLabelJa\}/);
    assert.doesNotMatch(q, /質問 \{questionOrdinal\}/);
    assert.doesNotMatch(q, /質問 \$\{/);
    assert.match(progress, /CoreFreeClueProgressVisual/);
    assert.match(progress, /\{clamped\} \/ \{FREE_CONTINUOUS_FLOW_TOTAL\}/);
  });

  it('question 4 wording is neutral engagement framing', () => {
    assert.match(
      FREE_FIVE_QUESTIONS_COPY_V1.find((q) => q.questionId === 'free.distance_style')!
        .questionJa,
      /人との関わりが続いて、少し距離を整えたいときはどうしますか？/,
    );
  });

  it('summary hub renders four depth blocks and scenes section exists', () => {
    const hub = read('components/core/CoreFreeResultSummaryHub.tsx');
    const scenes = read('components/core/CoreFreeResultScenesSection.tsx');
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(hub, /今回の結論/);
    assert.match(hub, /そう読める3つの理由/);
    assert.match(hub, /自分では気づきにくい一面/);
    assert.match(hub, /力が出やすい条件/);
    assert.match(hub, /負荷が上がりやすい条件/);
    assert.match(scenes, /仕事や判断/);
    assert.match(scenes, /人との距離/);
    assert.match(scenes, /予定や環境の変化/);
    assert.match(scenes, /無料で読める範囲/);
    assert.match(panel, /CoreFreeResultScenesSection/);
    assert.doesNotMatch(panel, /詳しく読む/);
    assert.doesNotMatch(panel, /CoreFiveViewResultSection/);
    assert.doesNotMatch(panel, /CoreTendencyLoadSection/);
    assert.doesNotMatch(hub, /保存版/);
  });
});
