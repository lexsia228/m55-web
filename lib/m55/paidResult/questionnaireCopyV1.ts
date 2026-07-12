/**
 * paid-v1 questionnaire display copy (answer IDs frozen in answerIdMapsV1).
 */

import { PAID_QUESTION_IDS } from '../individualization/answerIdMapsV1';

export const PAID_QUESTION_COPY_VERSION = 'paid-qc-v1' as const;

export type PaidQuestionId = (typeof PAID_QUESTION_IDS)[number];

export type PaidQuestionChoice = {
  answerId: string;
  labelJa: string;
};

export type PaidQuestionCopy = {
  questionId: PaidQuestionId;
  shortLabelJa: string;
  questionJa: string;
  sceneContextJa: string;
  choices: readonly PaidQuestionChoice[];
};

export const PAID_QUESTIONNAIRE_COPY_V1: readonly PaidQuestionCopy[] = [
  {
    questionId: 'paid.work_focus',
    shortLabelJa: '仕事の焦点',
    questionJa: '仕事や進め方で、いまいちばん意識したいのはどれに近いですか。',
    sceneContextJa: '日々の仕事や学びの場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.work_focus.priority', labelJa: '優先順位を先に決める' },
      { answerId: 'paid.work_focus.pace', labelJa: 'ペースを整えてから進める' },
      { answerId: 'paid.work_focus.boundary', labelJa: '引き受ける範囲を先に決める' },
    ],
  },
  {
    questionId: 'paid.decision_friction',
    shortLabelJa: '決めにくさ',
    questionJa: '決めにくさが出やすいのは、どれに近いですか。',
    sceneContextJa: '選択に時間がかかる場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.decision_friction.too_many', labelJa: '選択肢が多すぎる' },
      { answerId: 'paid.decision_friction.unclear_end', labelJa: '終わりの見え方が曖昧' },
      { answerId: 'paid.decision_friction.fear_mistake', labelJa: '失敗が気になりやすい' },
    ],
  },
  {
    questionId: 'paid.relation_focus',
    shortLabelJa: '関係の焦点',
    questionJa: '人との関係で、いまいちばん意識したいのはどれに近いですか。',
    sceneContextJa: '近い人や仕事の相手とのやりとりを思い浮かべてください。',
    choices: [
      { answerId: 'paid.relation_focus.words', labelJa: '言葉の選び方' },
      { answerId: 'paid.relation_focus.timing', labelJa: 'タイミングの取り方' },
      { answerId: 'paid.relation_focus.recovery', labelJa: '関係の中での戻し方' },
    ],
  },
  {
    questionId: 'paid.fatigue_signal',
    shortLabelJa: '疲れのサイン',
    questionJa: '疲れが出やすいのは、どの場面に近いですか。',
    sceneContextJa: '負荷がたまりやすい場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.fatigue_signal.after_push', labelJa: '押し切ったあと' },
      { answerId: 'paid.fatigue_signal.before_start', labelJa: '始める前' },
      { answerId: 'paid.fatigue_signal.long_stretch', labelJa: '同じペースが続いたあと' },
    ],
  },
  {
    questionId: 'paid.report_usage',
    shortLabelJa: '読み返し方',
    questionJa: '保存版を読み返すとき、どの使い方に近いですか。',
    sceneContextJa: 'あとから見返す場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.report_usage.reread_scene', labelJa: '場面ごとに読み返す' },
      { answerId: 'paid.report_usage.chapter_pick', labelJa: '章ごとに選んで読む' },
      { answerId: 'paid.report_usage.note_take', labelJa: 'メモしながら読む' },
    ],
  },
  {
    questionId: 'paid.reading_style',
    shortLabelJa: '読み方の好み',
    questionJa: '内容の入り方として、どれに近いですか。',
    sceneContextJa: '文章を読むときの好みを思い浮かべてください。',
    choices: [
      { answerId: 'paid.reading_style.headline', labelJa: '要点から入る' },
      { answerId: 'paid.reading_style.story', labelJa: '流れで読む' },
      { answerId: 'paid.reading_style.compare', labelJa: '比べながら読む' },
    ],
  },
] as const;
