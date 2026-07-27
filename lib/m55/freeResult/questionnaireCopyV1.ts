/**
 * free-qc-v1 questionnaire display copy (answer IDs frozen in answerIdMapsV1).
 * Pure constants — no I/O. Display wording may change; IDs must not.
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

/** Full helper — shown prominently on question 1 only. */
export const FREE_QUESTION_HELPER_JA =
  '最近3か月の自分を思い出して、考えすぎず選んでください。' as const;

/** Compact persistent note for questions 2–5. */
export const FREE_QUESTION_HELPER_COMPACT_JA =
  '最近3か月の自分に近いものを選ぶ' as const;

export const FREE_AXIS_EYEBROW_SUFFIX_JA = 'について' as const;

export const FREE_FIVE_QUESTIONS_COPY_V1: readonly FreeQuestionCopy[] = [
  {
    questionId: 'free.start_style',
    shortLabelJa: '始め方',
    questionJa: '急に新しい予定や仕事が入ったとき、最初にしやすいのはどれですか？',
    sceneContextJa: FREE_QUESTION_HELPER_JA,
    choices: [
      // map → organize first
      { answerId: 'free.start_style.map_first', labelJa: 'まず全体と順番を整理する' },
      // try → small trial
      { answerId: 'free.start_style.try_first', labelJa: 'まず小さく試して反応を見る' },
      // ask → gather input from people
      { answerId: 'free.start_style.ask_first', labelJa: 'まず人に聞いて材料を増やす' },
    ],
    acknowledgementJa: '',
  },
  {
    questionId: 'free.decision_style',
    shortLabelJa: '決め方',
    questionJa: 'どちらにするか迷ったとき、決めるためにしやすいのはどれですか？',
    sceneContextJa: FREE_QUESTION_HELPER_COMPACT_JA,
    choices: [
      {
        answerId: 'free.decision_style.sort_first',
        labelJa: '選択肢を並べて比べる',
      },
      {
        // deadline → criteria / deadline first
        answerId: 'free.decision_style.deadline_first',
        labelJa: '判断基準や締切を決める',
      },
      {
        // wait → pause before deciding
        answerId: 'free.decision_style.wait_first',
        labelJa: '少し時間を置いて考える',
      },
    ],
    acknowledgementJa: '',
  },
  {
    questionId: 'free.recovery_style',
    shortLabelJa: '回復の仕方',
    questionJa: '疲れや負担が残っているとき、戻りやすいのはどれですか？',
    sceneContextJa: FREE_QUESTION_HELPER_COMPACT_JA,
    choices: [
      {
        answerId: 'free.recovery_style.pause_short',
        labelJa: '短く休んで区切る',
      },
      {
        answerId: 'free.recovery_style.shrink_task',
        labelJa: 'やることを減らす',
      },
      {
        answerId: 'free.recovery_style.change_scene',
        labelJa: '場所や気分を切り替える',
      },
    ],
    acknowledgementJa: '',
  },
  {
    questionId: 'free.distance_style',
    shortLabelJa: '人との距離',
    questionJa: '人との関わりが続いて、少し距離を整えたいときはどうしますか？',
    sceneContextJa: FREE_QUESTION_HELPER_COMPACT_JA,
    choices: [
      {
        // close_careful → verbal rebalance of distance
        answerId: 'free.distance_style.close_careful',
        labelJa: '言葉にして距離を調整する',
      },
      {
        // middle_steady → keep a steady interval
        answerId: 'free.distance_style.middle_steady',
        labelJa: '関わる頻度を一定に保つ',
      },
      {
        answerId: 'free.distance_style.solo_reset',
        labelJa: '一人で過ごす時間を取る',
      },
    ],
    acknowledgementJa: '',
  },
  {
    questionId: 'free.change_style',
    shortLabelJa: '変化への向き合い方',
    questionJa: '予定や環境が変わったとき、最初にしやすいのはどれですか？',
    sceneContextJa: FREE_QUESTION_HELPER_COMPACT_JA,
    choices: [
      {
        answerId: 'free.change_style.observe_first',
        labelJa: 'まず様子を見て流れをつかむ',
      },
      {
        answerId: 'free.change_style.adjust_fast',
        labelJa: '変わった部分だけ調整する',
      },
      {
        answerId: 'free.change_style.rebuild_slow',
        labelJa: '一度全体を組み直す',
      },
    ],
    acknowledgementJa: '',
  },
] as const;

/**
 * Legacy theme-choice copy retained for post-purchase / engine compatibility.
 * Not rendered in the free pre-result questionnaire (Self funnel target).
 */
export const FREE_CURRENT_INTEREST_COPY_V1: FreeQuestionCopy = {
  questionId: 'free.primary_theme',
  shortLabelJa: '関心の領域',
  questionJa: '今の自分を客観的に見るなら、どこから確かめたいですか？',
  sceneContextJa:
    'ここでは性格を決めません。購入後の追加読み解きで、先に確認したい場面を選べます。迷う場合は「自分全体をまとめて見たい」を選べます。',
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
  acknowledgementJa: '選択を受け取りました。追加の読み解きに使います。',
};

/** Core free questionnaire order (five self-understanding questions only). */
export const FREE_QUESTIONNAIRE_COPY_V1: readonly FreeQuestionCopy[] = [
  ...FREE_FIVE_QUESTIONS_COPY_V1,
] as const;
