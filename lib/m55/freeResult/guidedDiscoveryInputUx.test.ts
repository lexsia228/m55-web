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
  FREE_FIVE_QUESTIONS_COPY_V1,
  FREE_QUESTION_HELPER_COMPACT_JA,
  FREE_QUESTION_HELPER_JA,
} from './questionnaireCopyV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('guided discovery input experience', () => {
  it('single 6-step progress with abstract clue visual', () => {
    const progress = read('components/core/CoreFreeContinuousFlowProgress.tsx');
    const visual = read('components/core/CoreFreeClueProgressVisual.tsx');
    assert.match(progress, /CoreFreeClueProgressVisual/);
    assert.match(progress, /FREE_QUESTION_FLOW_TOTAL/);
    assert.match(progress, /5つの問い/);
    assert.match(progress, /あと\$\{questionRemaining\}問/);
    assert.match(visual, /FREE_CONTINUOUS_FLOW_TOTAL/);
    assert.match(visual, /data-testid="m55-free-clue-visual"/);
    assert.match(visual, /data-completed=\{filled\}/);
    assert.doesNotMatch(visual, /answerId|map_first|try_first|radar|zodiac|パーセント/);
  });

  it('profile intake uses shared modal copy (single DOB entry)', () => {
    const intake = read('components/profile/BirthProfileIntakeLayer.tsx');
    assert.match(intake, /GUEST_PROFILE_INTAKE_COPY_V1/);
    assert.match(intake, /type="date"/);
    assert.match(intake, /ニックネーム/);
    assert.doesNotMatch(intake, /5つの問いを始める/);
  });

  it('question layout: axisについて, helper weight, DOB edit, CTAs', () => {
    const q = read('components/core/CoreFreeQuestionnaireLayer.tsx');
    assert.match(q, /FREE_AXIS_EYEBROW_SUFFIX_JA/);
    assert.match(q, /FREE_QUESTION_HELPER_JA/);
    assert.match(q, /FREE_QUESTION_HELPER_COMPACT_JA/);
    assert.match(q, /index === 0/);
    assert.match(q, /基本情報を変更/);
    assert.match(q, /onRequestProfileEdit/);
    assert.match(q, /次の質問へ/);
    assert.match(q, /無料結果を見る/);
    assert.match(q, /disabled=\{!selected \|\| completing\}/);
    assert.match(q, /event\.key === '1'/);
    assert.match(q, /m55-free-clue-ack/);
    assert.match(q, /完了/);
    assert.match(q, /あと\{FREE_FIVE_QUESTION_COUNT - index - 1\}問/);
    assert.doesNotMatch(q, /手がかりを受け取りました/);
    assert.doesNotMatch(q, /質問 \{questionOrdinal\}/);
    assert.doesNotMatch(q, /質問 N \/ 5|質問 \$\{/);
  });

  it('exact display copy and frozen answer mappings', () => {
    const q1 = FREE_FIVE_QUESTIONS_COPY_V1[0]!;
    const q2 = FREE_FIVE_QUESTIONS_COPY_V1[1]!;
    const q3 = FREE_FIVE_QUESTIONS_COPY_V1[2]!;
    const q4 = FREE_FIVE_QUESTIONS_COPY_V1[3]!;
    const q5 = FREE_FIVE_QUESTIONS_COPY_V1[4]!;

    assert.match(q1.questionJa, /急に新しい予定や仕事が入ったとき/);
    assert.deepEqual(
      q1.choices.map((c) => c.labelJa),
      [
        'まず全体と順番を整理する',
        'まず小さく試して反応を見る',
        'まず人に聞いて材料を増やす',
      ],
    );
    assert.equal(q1.choices[0]!.answerId, 'free.start_style.map_first');
    assert.equal(FREE_START_ANSWER_TO_TENDENCY[q1.choices[0]!.answerId], 'map');
    assert.equal(FREE_START_ANSWER_TO_TENDENCY[q1.choices[1]!.answerId], 'try');
    assert.equal(FREE_START_ANSWER_TO_TENDENCY[q1.choices[2]!.answerId], 'ask');

    assert.match(q2.questionJa, /どちらにするか迷ったとき/);
    assert.deepEqual(
      q2.choices.map((c) => c.labelJa),
      ['選択肢を並べて比べる', '判断基準や締切を決める', '少し時間を置いて考える'],
    );
    assert.equal(FREE_DECISION_ANSWER_TO_TENDENCY[q2.choices[1]!.answerId], 'deadline');
    assert.equal(FREE_DECISION_ANSWER_TO_TENDENCY[q2.choices[2]!.answerId], 'wait');

    assert.deepEqual(
      q3.choices.map((c) => c.labelJa),
      ['短く休んで区切る', 'やることを減らす', '場所や気分を切り替える'],
    );
    assert.equal(FREE_RECOVERY_ANSWER_TO_TENDENCY[q3.choices[1]!.answerId], 'shrink');

    assert.match(q4.questionJa, /人との関わりが続いて、少し距離を整えたいときはどうしますか？/);
    assert.deepEqual(
      q4.choices.map((c) => c.labelJa),
      [
        '言葉にして距離を調整する',
        '関わる頻度を一定に保つ',
        '一人で過ごす時間を取る',
      ],
    );
    assert.equal(FREE_DISTANCE_ANSWER_TO_TENDENCY[q4.choices[0]!.answerId], 'close');
    assert.equal(FREE_DISTANCE_ANSWER_TO_TENDENCY[q4.choices[1]!.answerId], 'middle');
    assert.equal(FREE_DISTANCE_ANSWER_TO_TENDENCY[q4.choices[2]!.answerId], 'solo');

    assert.deepEqual(
      q5.choices.map((c) => c.labelJa),
      [
        'まず様子を見て流れをつかむ',
        '変わった部分だけ調整する',
        '一度全体を組み直す',
      ],
    );
    assert.equal(FREE_CHANGE_ANSWER_TO_TENDENCY[q5.choices[0]!.answerId], 'observe');
    assert.equal(FREE_CHANGE_ANSWER_TO_TENDENCY[q5.choices[1]!.answerId], 'adjust');
    assert.equal(FREE_CHANGE_ANSWER_TO_TENDENCY[q5.choices[2]!.answerId], 'rebuild');

    assert.match(FREE_QUESTION_HELPER_JA, /最近3か月の自分を思い出して/);
    assert.match(FREE_QUESTION_HELPER_COMPACT_JA, /最近3か月の自分に近いものを選ぶ/);
  });

  it('completion transition is short clue narrative without fake percent', () => {
    const src = read('components/core/CoreFreeRevealTransition.tsx');
    assert.match(src, /6つの手がかりが揃いました/);
    assert.match(src, /生年月日の土台と、いまの5つの回答を重ねています/);
    assert.match(src, /無料結果ができました/);
    assert.match(src, /prefers-reduced-motion|prefersReducedMotion|reduced/);
    assert.doesNotMatch(src, /%|パーセント|解析中|診断/);
  });

  it('free-result depth analysis exposes concise commercial fields', () => {
    const depth = read('lib/m55/freeResult/buildFreeDepthAnalysisV1.ts');
    assert.match(depth, /FREE_DEPTH_ANALYSIS_VERSION/);
    assert.match(depth, /conciseWhyJa/);
    assert.match(depth, /primarySceneJa/);
    assert.match(depth, /premiumLockedHeadingsJa/);
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(panel, /buildFreeDepthAnalysisV1/);
    assert.match(panel, /CoreFreeResultSummaryHub/);
  });

  it('segmented DOB focus uses M55 outline tokens', () => {
    const css = read('components/core/CoreExperience.module.css');
    assert.match(css, /freeSegmentedDobInputYear:focus-visible/);
    assert.match(css, /rgba\(107, 95, 168/);
    assert.match(css, /freeGuidedShell/);
    assert.match(css, /@media \(min-width: 900px\)/);
  });
});
