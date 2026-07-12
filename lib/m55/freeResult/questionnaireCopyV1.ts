/**
 * free-qc-v1 questionnaire display copy (answer IDs frozen in answerIdMapsV1).
 * Pure constants — no I/O.
 */

import { FREE_QUESTION_IDS } from '../individualization/answerIdMapsV1';

export const FREE_QUESTION_COPY_VERSION = 'free-qc-v1' as const;

export type FreeQuestionId = (typeof FREE_QUESTION_IDS)[number];

export type FreeQuestionChoice = {
  answerId: string;
  labelJa: string;
};

export type FreeQuestionCopy = {
  questionId: FreeQuestionId;
  shortLabelJa: string;
  questionJa: string;
  sceneContextJa: string;
  choices: readonly FreeQuestionChoice[];
  acknowledgementJa: string;
};

export const FREE_FIVE_QUESTION_COUNT = 5 as const;

export const FREE_FIVE_QUESTIONS_COPY_V1: readonly FreeQuestionCopy[] = [
  {
    questionId: 'free.start_style',
    shortLabelJa: 'はじめの一歩',
    questionJa: '新しいことを始めるとき、いちばん近いのはどれですか。',
    sceneContextJa:
      '仕事でも私生活でも、いま目の前に新しいことが来た場面を思い浮かべてください。',
    choices: [
      { answerId: 'free.start_style.map_first', labelJa: '先に整理してから動く' },
      { answerId: 'free.start_style.try_first', labelJa: '小さく試しながら進める' },
      { answerId: 'free.start_style.ask_first', labelJa: '先に情報や相談を足す' },
    ],
    acknowledgementJa: '受け取りました。次は、迷ったときの動き方を見ます。',
  },
  {
    questionId: 'free.decision_style',
    shortLabelJa: '迷ったとき',
    questionJa: '選択に迷ったとき、いちばん近いのはどれですか。',
    sceneContextJa:
      'どちらにするか決めきれない、少し立ち止まった場面を思い浮かべてください。',
    choices: [
      {
        answerId: 'free.decision_style.sort_first',
        labelJa: '選択肢を並べて整理する',
      },
      {
        answerId: 'free.decision_style.deadline_first',
        labelJa: '区切りを決めて決める',
      },
      {
        answerId: 'free.decision_style.wait_first',
        labelJa: '少し時間を置いてから決める',
      },
    ],
    acknowledgementJa: '受け取りました。次は、負荷が高まったときの戻し方を見ます。',
  },
  {
    questionId: 'free.recovery_style',
    shortLabelJa: '負荷が高まったとき',
    questionJa: '負荷が高まったとき、いちばん近いのはどれですか。',
    sceneContextJa:
      '忙しさや気持ちの重さが増えてきた場面を思い浮かべてください。',
    choices: [
      {
        answerId: 'free.recovery_style.pause_short',
        labelJa: '短く立ち止まって休む',
      },
      {
        answerId: 'free.recovery_style.shrink_task',
        labelJa: 'やることを小さくする',
      },
      {
        answerId: 'free.recovery_style.change_scene',
        labelJa: '場所や雰囲気を変える',
      },
    ],
    acknowledgementJa: '受け取りました。次は、人との距離の取り方を見ます。',
  },
  {
    questionId: 'free.distance_style',
    shortLabelJa: '人との距離',
    questionJa: '人との距離の取り方で、いちばん近いのはどれですか。',
    sceneContextJa:
      '近い人や仕事の相手と接するときの距離感を思い浮かべてください。恋人がいなくても答えられる問いです。',
    choices: [
      {
        answerId: 'free.distance_style.close_careful',
        labelJa: '近い距離でも、配慮して接する',
      },
      {
        answerId: 'free.distance_style.middle_steady',
        labelJa: '一定の距離を保つ',
      },
      {
        answerId: 'free.distance_style.solo_reset',
        labelJa: '一人の時間で整える',
      },
    ],
    acknowledgementJa: '受け取りました。次は、変化への向き合い方を見ます。',
  },
  {
    questionId: 'free.change_style',
    shortLabelJa: '変化への向き合い方',
    questionJa: '状況が変わったとき、いちばん近いのはどれですか。',
    sceneContextJa:
      '予定や環境が変わったときの、最初の反応を思い浮かべてください。',
    choices: [
      {
        answerId: 'free.change_style.observe_first',
        labelJa: 'まず様子を見る',
      },
      {
        answerId: 'free.change_style.adjust_fast',
        labelJa: '早めに微調整する',
      },
      {
        answerId: 'free.change_style.rebuild_slow',
        labelJa: '一度土台から作り直す',
      },
    ],
    acknowledgementJa: '受け取りました。次に、今の関心を選びます。',
  },
] as const;

export const FREE_CURRENT_INTEREST_COPY_V1: FreeQuestionCopy = {
  questionId: 'free.primary_theme',
  shortLabelJa: '今の関心',
  questionJa: '今の自分を客観的に見るなら、どこから確かめたいですか？',
  sceneContextJa:
    'ここでは性格を決めません。見取り図の中で、先に確認したい場面を選びます。迷う場合は「自分全体をまとめて見たい」を選べます。',
  choices: [
    { answerId: 'free.primary_theme.work', labelJa: '仕事や物事の進め方' },
    { answerId: 'free.primary_theme.relation', labelJa: '人との距離や関わり方' },
    { answerId: 'free.primary_theme.fatigue', labelJa: '疲れたときの戻り方' },
    { answerId: 'free.primary_theme.tendency', labelJa: '判断や迷いが出るとき' },
    {
      answerId: 'free.primary_theme.report_preview',
      labelJa: '自分全体をまとめて見たい',
    },
  ],
  acknowledgementJa: '選択を受け取りました。いまの見取り図を組み立てます。',
};

/** Full questionnaire order (5 self-understanding + current interest). */
export const FREE_QUESTIONNAIRE_COPY_V1: readonly FreeQuestionCopy[] = [
  ...FREE_FIVE_QUESTIONS_COPY_V1,
  FREE_CURRENT_INTEREST_COPY_V1,
] as const;
