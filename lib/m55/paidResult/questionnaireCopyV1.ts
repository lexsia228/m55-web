/**
 * paid-v1 questionnaire display copy (answer IDs frozen in answerIdMapsV1).
 * Display labels may be refined; scoring semantics and IDs must not change.
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
    shortLabelJa: '取り組みの焦点',
    questionJa: 'それを進めるとき、まずはっきりさせたいのはどれですか？',
    sceneContextJa:
      '仕事や勉強、家のことなど、いま時間を使っていることをひとつ思い浮かべてください。',
    choices: [
      { answerId: 'paid.work_focus.priority', labelJa: '何からやるか' },
      { answerId: 'paid.work_focus.pace', labelJa: 'どのくらいのペースで進めるか' },
      { answerId: 'paid.work_focus.boundary', labelJa: 'どこまで引き受けるか' },
    ],
  },
  {
    questionId: 'paid.decision_friction',
    shortLabelJa: '決めにくさ',
    questionJa: 'なかなか決められないとき、いちばん近いのはどれですか？',
    sceneContextJa:
      '仕事や買い物、予定など、選ぶのに時間がかかった場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.decision_friction.too_many', labelJa: '選択肢が多くて絞れない' },
      { answerId: 'paid.decision_friction.unclear_end', labelJa: 'どこまでやれば終わりか見えない' },
      { answerId: 'paid.decision_friction.fear_mistake', labelJa: '間違えたくなくて決めきれない' },
    ],
  },
  {
    questionId: 'paid.relation_focus',
    shortLabelJa: '関係の焦点',
    questionJa: '人とのやりとりで、いま少しラクにしたいのはどれですか？',
    sceneContextJa:
      '身近な人や仕事相手とのやりとりで、少し引っかかりが残った場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.relation_focus.words', labelJa: 'どう伝えるか' },
      { answerId: 'paid.relation_focus.timing', labelJa: 'いつ話すか・返すか' },
      { answerId: 'paid.relation_focus.recovery', labelJa: '気まずさが残ったあとの戻り方' },
    ],
  },
  {
    questionId: 'paid.fatigue_signal',
    shortLabelJa: '疲れのサイン',
    questionJa: 'どんなときに、疲れが出やすいですか？',
    sceneContextJa:
      '最近、余裕がなくなったり、動きが重くなった場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.fatigue_signal.after_push', labelJa: '無理をしてやり切ったあと' },
      { answerId: 'paid.fatigue_signal.before_start', labelJa: '取りかかる前から重く感じるとき' },
      { answerId: 'paid.fatigue_signal.long_stretch', labelJa: '同じペースを長く続けたあと' },
    ],
  },
  {
    questionId: 'paid.recovery_sequence',
    shortLabelJa: '戻り方',
    questionJa: '疲れが残っているとき、最初にすると戻りやすいのはどれですか？',
    sceneContextJa:
      'まだ本調子ではないけれど、少しずつ戻りたい場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.recovery_sequence.pause_first', labelJa: 'いったん止まって休む' },
      { answerId: 'paid.recovery_sequence.small_start', labelJa: 'できることから小さく始める' },
      { answerId: 'paid.recovery_sequence.sort_materials', labelJa: '考える材料を整理してから戻る' },
    ],
  },
  {
    questionId: 'paid.restart_condition',
    shortLabelJa: '再開の条件',
    questionJa: '止まっていたことを、もう一度動かしやすくするのはどれですか？',
    sceneContextJa: 'やろうと思っているのに、動き出せない場面を思い浮かべてください。',
    choices: [
      { answerId: 'paid.restart_condition.overview_first', labelJa: '全体の流れが見えること' },
      { answerId: 'paid.restart_condition.shrink_scope', labelJa: '今日やる範囲を小さくすること' },
      { answerId: 'paid.restart_condition.trusted_support', labelJa: '信頼できる人に一度話すこと' },
    ],
  },
] as const;
