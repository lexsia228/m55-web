import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FREE_CHANGE_ANSWER_TO_TENDENCY,
  FREE_DECISION_ANSWER_TO_TENDENCY,
  FREE_DISTANCE_ANSWER_TO_TENDENCY,
  FREE_QUESTION_IDS,
  FREE_RECOVERY_ANSWER_TO_TENDENCY,
  FREE_START_ANSWER_TO_TENDENCY,
} from '../individualization/answerIdMapsV1';
import { buildFreeFiveViewCompositionV1 } from './buildFreeFiveViewCompositionV1';
import {
  FREE_FIVE_QUESTION_COUNT,
  FREE_FIVE_QUESTIONS_COPY_V1,
  FREE_QUESTION_HELPER_JA,
  FREE_QUESTIONNAIRE_COPY_V1,
} from './questionnaireCopyV1';

const FACET_MAPS = {
  ...FREE_START_ANSWER_TO_TENDENCY,
  ...FREE_DECISION_ANSWER_TO_TENDENCY,
  ...FREE_RECOVERY_ANSWER_TO_TENDENCY,
  ...FREE_DISTANCE_ANSWER_TO_TENDENCY,
  ...FREE_CHANGE_ANSWER_TO_TENDENCY,
} as const;

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const FROZEN_ANSWER_ORDER = [
  'free.start_style.map_first',
  'free.start_style.try_first',
  'free.start_style.ask_first',
  'free.decision_style.sort_first',
  'free.decision_style.deadline_first',
  'free.decision_style.wait_first',
  'free.recovery_style.pause_short',
  'free.recovery_style.shrink_task',
  'free.recovery_style.change_scene',
  'free.distance_style.close_careful',
  'free.distance_style.middle_steady',
  'free.distance_style.solo_reset',
  'free.change_style.observe_first',
  'free.change_style.adjust_fast',
  'free.change_style.rebuild_slow',
] as const;

describe('continuous DOB + questionnaire UX contract', () => {
  it('uses segmented DOB step without intermediate start screen', () => {
    const intro = read('components/core/CoreFreeIntroSection.tsx');
    assert.match(intro, /生年月日を入力してください/);
    assert.match(intro, /正確な日付は結果画面に表示しません/);
    assert.match(intro, /無料結果づくりを始める/);
    assert.match(intro, /CoreFreeSegmentedDobFields/);
    assert.match(intro, /CoreFreeContinuousFlowProgress/);
    assert.doesNotMatch(intro, /5つの問いを始める/);
    assert.doesNotMatch(intro, /5つの短い問いだけで進みます/);
    assert.doesNotMatch(intro, /type=["']date["']/);
  });

  it('questionnaire uses one continuous progress system and question-as-H1', () => {
    const q = read('components/core/CoreFreeQuestionnaireLayer.tsx');
    assert.match(q, /CoreFreeContinuousFlowProgress/);
    assert.match(q, /\{current\.shortLabelJa\}/);
    assert.match(q, /freeContinuousQuestionTitle/);
    assert.match(q, /\{current\.questionJa\}/);
    assert.match(q, /無料結果を見る/);
    assert.match(q, /次の質問へ/);
    assert.match(q, /入力内容を変更/);
    assert.match(q, /disabled=\{!selected\}/);
    assert.match(q, /freeQuestionnaireChoiceCheck/);
    assert.doesNotMatch(q, /質問 \{questionOrdinal\}/);
    assert.doesNotMatch(q, /いまの感じ方を、1問ずつ選びます/);
    assert.doesNotMatch(q, /CoreFreeJourneyStepper/);
    assert.doesNotMatch(q, /選択中/);
    assert.doesNotMatch(q, /primary_theme|今の関心|FREE_CURRENT_INTEREST/);
  });

  it('EssencePanel wires DOB confirm into questionnaire without big stepper in intake', () => {
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(panel, /onDobConfirmed=\{handleDobConfirmed\}/);
    assert.match(panel, /ProfileRepository\.save/);
    assert.match(panel, /onRequestDobChange/);
    assert.match(panel, /handleRequestDobChange/);
    assert.match(panel, /uxPhase === 'RESULT'[\s\S]*CoreFreeJourneyStepper/);
    assert.doesNotMatch(panel, /birthDateLabelJa=\{birthDateLabelJa\}/);
    assert.doesNotMatch(panel, /onStart=\{handleIntroStart\}/);
  });

  it('preserves frozen answer IDs and facet mapping for display options', () => {
    assert.equal(FREE_FIVE_QUESTIONS_COPY_V1.length, FREE_FIVE_QUESTION_COUNT);
    assert.equal(FREE_QUESTIONNAIRE_COPY_V1.length, FREE_FIVE_QUESTION_COUNT);
    assert.equal(FREE_QUESTION_HELPER_JA.includes('最近3か月'), true);

    const displayedIds: string[] = [];
    for (const question of FREE_FIVE_QUESTIONS_COPY_V1) {
      assert.ok(FREE_QUESTION_IDS.includes(question.questionId));
      for (const choice of question.choices) {
        displayedIds.push(choice.answerId);
        assert.ok(
          choice.answerId in FACET_MAPS,
          `missing facet map for ${choice.answerId}`,
        );
      }
    }
    assert.deepEqual(displayedIds, [...FROZEN_ANSWER_ORDER]);
  });

  it('exposes all five user-facing questions from the gate copy', () => {
    const questions = FREE_FIVE_QUESTIONS_COPY_V1.map((q) => q.questionJa).join('\n');
    assert.match(questions, /急に新しい予定や仕事が入ったとき/);
    assert.match(questions, /どちらにするか迷ったとき/);
    assert.match(questions, /疲れや負担が残っているとき/);
    assert.match(questions, /人との関わりが続いて、少し距離を整えたいとき/);
    assert.match(questions, /予定や環境が変わったとき/);
    assert.deepEqual(
      FREE_FIVE_QUESTIONS_COPY_V1.map((q) => q.shortLabelJa),
      ['始め方', '決め方', '回復の仕方', '人との距離', '変化への向き合い方'],
    );
  });

  it('same DOB + answers still produce the same canonical composition', () => {
    const freeAnswerSet = {
      'free.start_style': 'free.start_style.map_first',
      'free.decision_style': 'free.decision_style.sort_first',
      'free.recovery_style': 'free.recovery_style.pause_short',
      'free.distance_style': 'free.distance_style.close_careful',
      'free.change_style': 'free.change_style.observe_first',
      'free.primary_theme': 'free.primary_theme.work',
    };
    const a = buildFreeFiveViewCompositionV1({
      birthDate: '1990-12-19',
      stemLaneIndex: 3,
      freeAnswerSet,
    });
    const b = buildFreeFiveViewCompositionV1({
      birthDate: '1990-12-19',
      stemLaneIndex: 3,
      freeAnswerSet,
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(JSON.stringify(a.value), JSON.stringify(b.value));
  });
});
