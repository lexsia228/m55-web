import type { ChapterId } from './pairReadingTypes';
import type { RelationStatusId } from './pairReadingTypes';
import {
  buildCompatibilityCurrentContextChapterVariation as buildV1ChapterVariation,
  buildCompatibilityCurrentContextDisplay as buildV1Display,
  type CompatibilityCurrentContextAnswers,
  type CompatibilityCurrentContextBodyAnswers,
  type CompatibilityCurrentContextChapterVariation,
  type CompatibilityCurrentContextDisplay,
  type CompatibilityFocusAnswer,
  type DecisionPaceAnswer,
  type DisagreementAnswer,
  type ExpressionPaceAnswer,
  type ReturnPatternAnswer,
} from './currentContextContract.v1';

export const COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 =
  'compatibility_current_context_v2' as const;

export type CompatibilityCurrentQuestionIdV2 =
  | 'expressionPace'
  | 'approachIntent'
  | 'contactPace'
  | 'decisionPace'
  | 'disagreement'
  | 'distance'
  | 'returnPattern'
  | 'reapproachReadiness'
  | 'focus';

export type ExpressionPaceAnswerV2 = 'words_soon' | 'words_later' | 'words_vary';
export type ApproachIntentAnswerV2 = 'wait_for_signal' | 'consider_reaching' | 'unsure_yet';
export type ContactPaceAnswerV2 = 'light_contact' | 'steady_contact' | 'contact_varies';
export type DecisionPaceAnswerV2 = 'decide_now' | 'decide_later' | 'decide_varies';
export type DisagreementAnswerV2 = 'talk_now' | 'take_space' | 'one_carries';
export type DistanceAnswerV2 = 'explain_space' | 'go_quiet' | 'space_is_hard';
export type ReturnPatternAnswerV2 = 'someone_reaches' | 'time_restores' | 'return_is_hard';
export type ReapproachReadinessAnswerV2 = 'small_step_first' | 'need_clarity_first' | 'timing_uncertain';
export type CompatibilityFocusAnswerV2 =
  | 'distance_focus'
  | 'conversation_focus'
  | 'loop_focus'
  | 'return_focus'
  | 'next_step_focus';

export type CompatibilityCurrentContextAnswersV2 = {
  expressionPace: ExpressionPaceAnswerV2;
  approachIntent?: ApproachIntentAnswerV2;
  contactPace?: ContactPaceAnswerV2;
  decisionPace?: DecisionPaceAnswerV2;
  disagreement?: DisagreementAnswerV2;
  distance?: DistanceAnswerV2;
  returnPattern?: ReturnPatternAnswerV2;
  reapproachReadiness?: ReapproachReadinessAnswerV2;
  focus?: CompatibilityFocusAnswerV2;
};

export type CompatibilityCurrentContextQuestionV2 = {
  readonly questionId: CompatibilityCurrentQuestionIdV2;
  readonly question: string;
  readonly choices: readonly { readonly answerId: string; readonly label: string }[];
  readonly optional?: boolean;
};

const FOCUS_QUESTION: CompatibilityCurrentContextQuestionV2 = {
  questionId: 'focus',
  question: '今、このレポートで特に整理したいことはありますか？（任意）',
  optional: true,
  choices: [
    { answerId: 'distance_focus', label: '二人の距離感' },
    { answerId: 'conversation_focus', label: '会話の進め方' },
    { answerId: 'loop_focus', label: 'すれ違いが続く理由' },
    { answerId: 'return_focus', label: '関係を戻すきっかけ' },
    { answerId: 'next_step_focus', label: 'これからの進め方' },
    { answerId: 'skip_focus', label: '今は特に決めない' },
  ],
};

const R1_QUESTIONS: readonly CompatibilityCurrentContextQuestionV2[] = [
  {
    questionId: 'expressionPace',
    question: '気持ちを言葉にするまでの速さは、あなた自身ではどう感じますか？',
    choices: [
      { answerId: 'words_soon', label: '比較的すぐ言葉になりやすい' },
      { answerId: 'words_later', label: '時間をかけてから言葉になりやすい' },
      { answerId: 'words_vary', label: '場面によって大きく違う' },
    ],
  },
  {
    questionId: 'approachIntent',
    question: '相手に近づくことを考えるとき、今はどの形に近いですか？',
    choices: [
      { answerId: 'wait_for_signal', label: '相手の様子を見ながら動く前に確かめたい' },
      { answerId: 'consider_reaching', label: '小さな接点を考え始めている' },
      { answerId: 'unsure_yet', label: 'まだ近づくかどうか決めていない' },
    ],
  },
];

const R2_QUESTIONS: readonly CompatibilityCurrentContextQuestionV2[] = [
  {
    questionId: 'expressionPace',
    question: '気持ちを言葉にするまでの速さは、二人の間でどう見えますか？',
    choices: [
      { answerId: 'words_soon', label: '比較的すぐ言葉になる' },
      { answerId: 'words_later', label: '時間をかけてから言葉になる' },
      { answerId: 'words_vary', label: '場面によって大きく違う' },
    ],
  },
  {
    questionId: 'contactPace',
    question: '連絡や会話の頻度は、今どの形に近いですか？',
    choices: [
      { answerId: 'light_contact', label: '短いやり取りが中心' },
      { answerId: 'steady_contact', label: '一定のリズムで続いている' },
      { answerId: 'contact_varies', label: '時期によって大きく変わる' },
    ],
  },
];

const ESTABLISHED_QUESTIONS: readonly CompatibilityCurrentContextQuestionV2[] = [
  {
    questionId: 'decisionPace',
    question: '二人で何かを決めるとき、今はどの形に近いですか？',
    choices: [
      { answerId: 'decide_now', label: 'その場で決めることが多い' },
      { answerId: 'decide_later', label: '少し時間を置いて決めることが多い' },
      { answerId: 'decide_varies', label: '状況によって大きく変わる' },
    ],
  },
  {
    questionId: 'disagreement',
    question: '意見が違ったとき、二人の間では何が起きやすいですか？',
    choices: [
      { answerId: 'talk_now', label: 'その場で言葉を交わす' },
      { answerId: 'take_space', label: 'いったん距離や時間を置く' },
      { answerId: 'one_carries', label: 'どちらかが話題を引き取る' },
    ],
  },
  {
    questionId: 'expressionPace',
    question: '気持ちを言葉にするまでの速さは、二人の間でどう見えますか？',
    choices: [
      { answerId: 'words_soon', label: '比較的すぐ言葉になる' },
      { answerId: 'words_later', label: '時間をかけてから言葉になる' },
      { answerId: 'words_vary', label: '場面によって大きく違う' },
    ],
  },
  {
    questionId: 'returnPattern',
    question: 'すれ違ったあと、元の距離へ戻るときはどの形に近いですか？',
    choices: [
      { answerId: 'someone_reaches', label: 'どちらかが先に声をかける' },
      { answerId: 'time_restores', label: '時間がたつと自然に戻る' },
      { answerId: 'return_is_hard', label: '戻るきっかけを作りにくい' },
    ],
  },
];

const R4_QUESTIONS: readonly CompatibilityCurrentContextQuestionV2[] = [
  {
    questionId: 'distance',
    question: '今の二人の距離は、どの形に近いですか？',
    choices: [
      { answerId: 'explain_space', label: '距離を取る理由や時間が伝わっている' },
      { answerId: 'go_quiet', label: '説明より先に静かになっている' },
      { answerId: 'space_is_hard', label: '距離そのものを扱いにくい' },
    ],
  },
  {
    questionId: 'expressionPace',
    question: '気持ちを言葉にするまでの速さは、二人の間でどう見えますか？',
    choices: [
      { answerId: 'words_soon', label: '比較的すぐ言葉になる' },
      { answerId: 'words_later', label: '時間をかけてから言葉になる' },
      { answerId: 'words_vary', label: '場面によって大きく違う' },
    ],
  },
];

const R5_QUESTIONS: readonly CompatibilityCurrentContextQuestionV2[] = [
  {
    questionId: 'reapproachReadiness',
    question: 'もう一度近づくことを考えるとき、今はどの形に近いですか？',
    choices: [
      { answerId: 'small_step_first', label: '小さな接点から始めたい' },
      { answerId: 'need_clarity_first', label: '先に自分の気持ちを整理したい' },
      { answerId: 'timing_uncertain', label: 'タイミングがまだ見えない' },
    ],
  },
  {
    questionId: 'distance',
    question: '今の二人の距離は、どの形に近いですか？',
    choices: [
      { answerId: 'explain_space', label: '距離を取る理由や時間が伝わっている' },
      { answerId: 'go_quiet', label: '説明より先に静かになっている' },
      { answerId: 'space_is_hard', label: '距離そのものを扱いにくい' },
    ],
  },
  {
    questionId: 'expressionPace',
    question: '気持ちを言葉にするまでの速さは、二人の間でどう見えますか？',
    choices: [
      { answerId: 'words_soon', label: '比較的すぐ言葉になる' },
      { answerId: 'words_later', label: '時間をかけてから言葉になる' },
      { answerId: 'words_vary', label: '場面によって大きく違う' },
    ],
  },
];

export function questionsForRelationStage(
  relationStatusId: RelationStatusId,
): readonly CompatibilityCurrentContextQuestionV2[] {
  const body =
    relationStatusId === 'R1'
      ? R1_QUESTIONS
      : relationStatusId === 'R2'
        ? R2_QUESTIONS
        : relationStatusId === 'R3' || relationStatusId === 'R6'
          ? ESTABLISHED_QUESTIONS
          : relationStatusId === 'R4'
            ? R4_QUESTIONS
            : R5_QUESTIONS;
  return Object.freeze([...body, FOCUS_QUESTION]);
}

const V2_ANSWER_IDS: Record<CompatibilityCurrentQuestionIdV2, readonly string[]> = {
  expressionPace: ['words_soon', 'words_later', 'words_vary'],
  approachIntent: ['wait_for_signal', 'consider_reaching', 'unsure_yet'],
  contactPace: ['light_contact', 'steady_contact', 'contact_varies'],
  decisionPace: ['decide_now', 'decide_later', 'decide_varies'],
  disagreement: ['talk_now', 'take_space', 'one_carries'],
  distance: ['explain_space', 'go_quiet', 'space_is_hard'],
  returnPattern: ['someone_reaches', 'time_restores', 'return_is_hard'],
  reapproachReadiness: ['small_step_first', 'need_clarity_first', 'timing_uncertain'],
  focus: [
    'distance_focus',
    'conversation_focus',
    'loop_focus',
    'return_focus',
    'next_step_focus',
    'skip_focus',
  ],
};

export function stageSafeFocusOptions(
  relationStatusId: RelationStatusId,
): readonly CompatibilityFocusAnswerV2[] {
  if (relationStatusId === 'R1') {
    return ['next_step_focus', 'conversation_focus'];
  }
  if (relationStatusId === 'R2') {
    return ['conversation_focus', 'next_step_focus', 'distance_focus'];
  }
  if (relationStatusId === 'R4' || relationStatusId === 'R5') {
    return ['distance_focus', 'return_focus', 'next_step_focus'];
  }
  return [
    'distance_focus',
    'conversation_focus',
    'loop_focus',
    'return_focus',
    'next_step_focus',
  ];
}

export function isValidStageFocus(
  relationStatusId: RelationStatusId,
  focus: unknown,
): focus is CompatibilityFocusAnswerV2 {
  if (typeof focus !== 'string') return false;
  if (focus === 'skip_focus') return false;
  if (!V2_ANSWER_IDS.focus.includes(focus)) return false;
  return stageSafeFocusOptions(relationStatusId).includes(
    focus as CompatibilityFocusAnswerV2,
  );
}

export function resolveFocusAnswer(
  relationStatusId: RelationStatusId,
  focus?: CompatibilityFocusAnswerV2 | 'skip_focus',
): CompatibilityFocusAnswer {
  if (!focus || focus === 'skip_focus') {
    return 'next_step_focus';
  }
  if (!isValidStageFocus(relationStatusId, focus)) {
    throw new Error('invalid_stage_focus');
  }
  return focus;
}

export function isCompleteCompatibilityCurrentContextV2(
  value: unknown,
  relationStatusId: RelationStatusId,
): value is CompatibilityCurrentContextAnswersV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const allowedQuestionIds = new Set(
    questionsForRelationStage(relationStatusId).map((question) => question.questionId),
  );
  const keys = Object.keys(candidate);
  if (!keys.every((key) => allowedQuestionIds.has(key as CompatibilityCurrentQuestionIdV2))) {
    return false;
  }
  const required = questionsForRelationStage(relationStatusId).filter(
    (question) => question.questionId !== 'focus' && !question.optional,
  );
  if (
    !required.every((question) => {
      const answerId = candidate[question.questionId];
      return (
        typeof answerId === 'string' &&
        V2_ANSWER_IDS[question.questionId].includes(answerId)
      );
    })
  ) {
    return false;
  }
  if ('focus' in candidate && !isValidStageFocus(relationStatusId, candidate.focus)) {
    return false;
  }
  return true;
}

export function toLegacyCurrentContextAnswers(
  answers: CompatibilityCurrentContextAnswersV2,
  relationStatusId: RelationStatusId,
): CompatibilityCurrentContextAnswers {
  if (
    relationStatusId === 'R1' ||
    relationStatusId === 'R2' ||
    relationStatusId === 'R4' ||
    relationStatusId === 'R5'
  ) {
    throw new Error('legacy_conversion_unsafe_for_stage');
  }
  const focus = resolveFocusAnswer(relationStatusId, answers.focus);
  return {
    decisionPace: answers.decisionPace ?? 'decide_varies',
    disagreement: answers.disagreement ?? 'take_space',
    distance: answers.distance ?? 'explain_space',
    expressionPace: answers.expressionPace,
    returnPattern: answers.returnPattern ?? 'time_restores',
    focus,
  };
}

const NO_CHAPTER_VARIATION_V2: CompatibilityCurrentContextChapterVariation = Object.freeze({
  sceneSuffix: null,
  relationshipLoopTail: null,
  usablePhrase: null,
  smallExperiment: null,
  reflectionQuestion: null,
});

const ESTABLISHED_DECISION_EXPRESSION: Readonly<
  Record<DecisionPaceAnswer, string>
> = Object.freeze({
  decide_now:
    'その場で進める力が出やすく、考える間をどこに置くかが今の焦点です。',
  decide_later:
    '少し時間を置いて決める流れがあり、次に話す時点を見える形にすることが今の焦点です。',
  decide_varies:
    '場面によって決める速さが変わり、今回は急ぐ話か待てる話かをそろえることが今の焦点です。',
});

const ESTABLISHED_DISAGREEMENT_LOOP: Readonly<
  Record<DisagreementAnswer, string>
> = Object.freeze({
  talk_now:
    '違いが出るとその場の言葉が増え、整理する前に応答が重なりやすくなります',
  take_space:
    '違いが出るといったん間を取り、その間の意味をそれぞれ別に受け取りやすくなります',
  one_carries:
    '違いが出るとどちらかが話題を引き取り、表に出なかった違いが次の場面へ残りやすくなります',
});

const ESTABLISHED_EXPRESSION_LINE: Readonly<
  Record<ExpressionPaceAnswer, string>
> = Object.freeze({
  words_soon:
    '気持ちは比較的すぐ言葉になり、最初の言葉を結論にしない余白が役立ちます。',
  words_later:
    '気持ちは時間をかけて言葉になり、待つ間の扱い方が二人の受け取りを左右します。',
  words_vary:
    '気持ちが言葉になる速さは場面で変わり、その日の余力を先に確かめることが役立ちます。',
});

const ESTABLISHED_RETURN_LOOP: Readonly<Record<ReturnPatternAnswer, string>> =
  Object.freeze({
    someone_reaches: '戻るときはどちらかの最初の声かけが入口になっています。',
    time_restores:
      '時間が流れることで自然に戻れますが、置いたままの違いが残ることもあります。',
    return_is_hard:
      '戻るきっかけが見つかりにくく、最初の接点に大きな意味を持たせやすくなります。',
  });

const ESTABLISHED_RETURN_ACTION: Readonly<Record<ReturnPatternAnswer, string>> =
  Object.freeze({
    someone_reaches:
      '次のすれ違いでは、結論ではなく短い声かけを一度だけ置きます。',
    time_restores:
      '自然に戻ったあと、扱わずに残った一点だけを短く確認します。',
    return_is_hard:
      '関係の答えを求めず、負担の小さい接点を一度だけ提案します。',
  });

const ESTABLISHED_GLANCE_SCENE: Readonly<Record<ReturnPatternAnswer, string>> =
  Object.freeze({
    someone_reaches: '声かけが戻りの合図になりやすい場面',
    time_restores: '時間で自然に戻りやすい場面',
    return_is_hard: '戻る入口が見えにくい場面',
  });

function establishedBodyFromV2(
  answers: CompatibilityCurrentContextAnswersV2,
): {
  decisionPace: DecisionPaceAnswer;
  disagreement: DisagreementAnswer;
  expressionPace: ExpressionPaceAnswer;
  returnPattern: ReturnPatternAnswer;
} {
  return {
    decisionPace: answers.decisionPace ?? 'decide_varies',
    disagreement: answers.disagreement ?? 'take_space',
    expressionPace: answers.expressionPace,
    returnPattern: answers.returnPattern ?? 'time_restores',
  };
}

const FOCUS_DISPLAY: Readonly<
  Record<
    CompatibilityFocusAnswer,
    {
      readonly label: string;
      readonly readingGuide: string;
      readonly chapters: readonly [ChapterId, ChapterId];
      readonly reasons: readonly [string, string];
      readonly outcomes: readonly [string, string];
    }
  >
> = {
  distance_focus: {
    label: '二人の距離感',
    readingGuide: '距離を取る時間と、短く戻る入口が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: ['距離が必要なときの合図を扱う章です。', '元の距離へ戻る最初の接点を扱う章です。'],
    outcomes: ['離れる前に確認する一つの約束', '負担の小さい再開の一言'],
  },
  conversation_focus: {
    label: '会話の進め方',
    readingGuide: '反応を待つ時間と、言葉の置き方がずれる場面が手がかりになります。',
    chapters: ['ch_other_pace', 'ch_pair_gap'],
    reasons: ['返事がまだ見えない時間を扱う章です。', '言葉の置き方がずれる場面を扱う章です。'],
    outcomes: ['答えの前に返せる短い合図', '違いを一つずつ扱う順序'],
  },
  loop_focus: {
    label: 'すれ違いが続く理由',
    readingGuide: '違いが連鎖へ変わる場面と、今気になる話題の入口が手がかりになります。',
    chapters: ['ch_pair_gap', 'ch_topic_deep'],
    reasons: ['説明と安心の順序がずれる場面を扱う章です。', '今気になる話題へ入る間合いを扱う章です。'],
    outcomes: ['連鎖を止める三つの手順', '話題を小さく始める方法'],
  },
  return_focus: {
    label: '関係を戻すきっかけ',
    readingGuide: '距離が生まれた直後と、戻り始める最初の接点が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: ['離れる動きが強まる直前を扱う章です。', '戻るきっかけを小さく作る章です。'],
    outcomes: ['距離を広げない短い確認', 'そのまま使える再開の一言'],
  },
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: '次を決める速さと、扱いたい話題の入口が手がかりになります。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: ['二人で次を決める速さを扱う章です。', '今後の話題を一度に広げない入口を扱う章です。'],
    outcomes: ['決める前にそろえる時間', '今週一度だけ試せる進め方'],
  },
};

const R1_FOCUS_DISPLAY: Pick<
  typeof FOCUS_DISPLAY,
  'next_step_focus' | 'conversation_focus'
> = Object.freeze({
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: '近づく前の迷いと、気になる点の入口が手がかりになります。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: [
      'まだ会話がない状態での自分の動きを扱う章です。',
      '気になる点を自分の中で整理する入口を扱う章です。',
    ],
    outcomes: ['近づく前にそろえる視点', '自分の中で整理できる入口'],
  },
  conversation_focus: {
    label: '会話の進め方',
    readingGuide: 'まだ会話がない状態で、言葉の出方と近づく前の迷いが手がかりになります。',
    chapters: ['ch_other_pace', 'ch_pair_gap'],
    reasons: [
      '相手の反応が見えない時間を扱う章です。',
      '近づくかどうかを考える場面を扱う章です。',
    ],
    outcomes: ['反応が見えないときの読み方', '近づく前に整えたい一点'],
  },
});

type StageFocusDisplay = (typeof FOCUS_DISPLAY)[CompatibilityFocusAnswer];

const R2_FOCUS_DISPLAY: Pick<
  typeof FOCUS_DISPLAY,
  'conversation_focus' | 'next_step_focus' | 'distance_focus'
> = Object.freeze({
  conversation_focus: {
    label: '会話の進め方',
    readingGuide: 'やり取りの速さと、言葉の置き方がずれる場面が手がかりになります。',
    chapters: ['ch_other_pace', 'ch_pair_gap'],
    reasons: [
      '返事がまだ見えない時間を扱う章です。',
      '言葉の置き方がずれる場面を扱う章です。',
    ],
    outcomes: ['反応が見えにくいときの読み方', '言葉の置き方のずれの入口'],
  },
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: 'やり取りのリズムと、扱いたい話題の入口が手がかりになります。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: [
      'やり取りの速さを扱う章です。',
      '今の話題を一度に広げない入口を扱う章です。',
    ],
    outcomes: ['やり取りの速さの見え方', '話題の入口の整え方'],
  },
  distance_focus: {
    label: 'やり取りの間合い',
    readingGuide: '今のやり取りの量と、間合いがずれたときの入口が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: [
      '今のやり取りの量や速さを扱う章です。',
      '間合いがずれたときの入口を扱う章です。',
    ],
    outcomes: ['今の間合いの見え方', '間合いを整える入口'],
  },
});

const R4_FOCUS_DISPLAY: Pick<
  typeof FOCUS_DISPLAY,
  'distance_focus' | 'return_focus' | 'next_step_focus'
> = Object.freeze({
  distance_focus: {
    label: '今の距離感',
    readingGuide: 'いまの間合いと、距離の見え方がずれる入口が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: [
      '今の間合いの見え方を扱う章です。',
      '距離の理由を決めずに入口を扱う章です。',
    ],
    outcomes: ['今の間合いの見え方', '小さな接点の入口'],
  },
  return_focus: {
    label: '距離の入口',
    readingGuide: 'いまの距離の扱い方と、次の接点の入口が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: [
      '距離が感じられる場面の入口を扱う章です。',
      '次の接点を小さく考える章です。',
    ],
    outcomes: ['距離の見え方の整理', '小さな接点の考え方'],
  },
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: 'いまの距離感と、扱いたい一点の入口が手がかりになります。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: [
      '今の間合いを扱う章です。',
      '気になる点を一度に広げない入口を扱う章です。',
    ],
    outcomes: ['間合いの見え方', '扱いたい一点の入口'],
  },
});

const R5_FOCUS_DISPLAY: Pick<
  typeof FOCUS_DISPLAY,
  'distance_focus' | 'return_focus' | 'next_step_focus'
> = Object.freeze({
  distance_focus: {
    label: '今の距離感',
    readingGuide: 'もう一度近づく前の間合いと、距離の見え方が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: [
      '再接近前の間合いを扱う章です。',
      '距離の理由を決めずに入口を扱う章です。',
    ],
    outcomes: ['今の間合いの見え方', '小さな接点の入口'],
  },
  return_focus: {
    label: '近づき方の入口',
    readingGuide: '自分が考える再接近の入口と、間合いの見え方が手がかりになります。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: [
      '再接近を考える場面の入口を扱う章です。',
      '小さな接点を考える章です。',
    ],
    outcomes: ['近づき方の入口の整理', '小さな接点の考え方'],
  },
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: '再接近の前に整えたい一点と、話題の入口が手がかりになります。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: [
      '再接近のタイミングを扱う章です。',
      '気になる点を一度に広げない入口を扱う章です。',
    ],
    outcomes: ['近づく前の整え方', '扱いたい一点の入口'],
  },
});

function stageFocusDisplay(
  relationStatusId: RelationStatusId,
  focus: CompatibilityFocusAnswer,
): StageFocusDisplay {
  if (relationStatusId === 'R1') {
    return focus === 'conversation_focus'
      ? R1_FOCUS_DISPLAY.conversation_focus
      : R1_FOCUS_DISPLAY.next_step_focus;
  }
  if (relationStatusId === 'R2') {
    return R2_FOCUS_DISPLAY[focus as keyof typeof R2_FOCUS_DISPLAY];
  }
  if (relationStatusId === 'R4') {
    return R4_FOCUS_DISPLAY[focus as keyof typeof R4_FOCUS_DISPLAY];
  }
  if (relationStatusId === 'R5') {
    return R5_FOCUS_DISPLAY[focus as keyof typeof R5_FOCUS_DISPLAY];
  }
  return FOCUS_DISPLAY[focus];
}

function expressionLoopStep(expressionPace: ExpressionPaceAnswer): string {
  return expressionPace === 'words_soon'
    ? '言葉が比較的すぐ出る日は、先に言葉を置きたくなることがあります'
    : expressionPace === 'words_later'
      ? '言葉が遅れて出る日は、整える時間が必要に感じられやすいことがあります'
      : 'その日によって言葉の出方が変わり、今日の温度が読み取りにくいことがあります';
}

function buildR1CurrentContextDisplay(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextDisplay {
  const focus = resolveFocusAnswer('R1', answers.focus);
  const focusMeta =
    focus === 'conversation_focus'
      ? R1_FOCUS_DISPLAY.conversation_focus
      : R1_FOCUS_DISPLAY.next_step_focus;
  const expressionStep =
    answers.expressionPace === 'words_soon'
      ? '気持ちが比較的すぐ言葉になりやすい日は、先に言葉を置きたくなることがあります'
      : answers.expressionPace === 'words_later'
        ? '気持ちが言葉になるまで時間がかかる日は、まだ整っていない感覚が残りやすいことがあります'
        : 'その日によって言葉の出方が変わり、自分の中の温度が見えにくくなることがあります';
  const approachStep =
    answers.approachIntent === 'wait_for_signal'
      ? '相手の様子を見ながら動く前に確かめたいときは、読み取りを重ねやすいことがあります'
      : answers.approachIntent === 'consider_reaching'
        ? '小さな接点を考え始めているときは、置く言葉の形を先に探しやすいことがあります'
        : 'まだ近づくかどうか決めていないときは、自分の中だけで意味を置きやすいことがあります';
  const misreadStep =
    '相手の反応が見えないまま、自分の中だけで意味を置いてしまうと、静けさを拒否のように受け取りやすくなることがあります';
  const relationshipLoopSteps = Object.freeze([
    expressionStep,
    approachStep,
    misreadStep,
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion:
      COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    currentExpression:
      'まだ会話が始まっていない状態では、気持ちの言葉の出方と、近づくかどうかの迷いが、読み取りのずれを生みやすいことがあります。',
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: 'まだ会話がない状態で',
    immediateAction:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすい読み取りのずれが起きやすいことがあります。',
    focusLabel: focusMeta.label,
    readingGuide: focusMeta.readingGuide,
    highlightedChapterKeys: Object.freeze([...focusMeta.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(
      focusMeta.chapters.map((chapterKey, index) =>
        Object.freeze({
          chapterKey,
          reason: focusMeta.reasons[index]!,
          concreteValue: focusMeta.outcomes[index]!,
        }),
      ),
    ),
  });
}

function buildR2CurrentContextDisplay(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextDisplay {
  const focus = resolveFocusAnswer('R2', answers.focus);
  const focusMeta = stageFocusDisplay('R2', focus);
  const rhythmStep =
    answers.contactPace === 'light_contact'
      ? '短いやり取りが中心のときは、反応の見え方が小さく感じられやすいことがあります'
      : answers.contactPace === 'steady_contact'
        ? '一定のリズムで続いているときは、速さの差が目立ちにくいことがあります'
        : '時期によってやり取りの量が変わるときは、今日の温度が読み取りにくいことがあります';
  const expressionStep =
    answers.expressionPace === 'words_soon'
      ? '言葉が比較的すぐ出る日は、先に確認したくなることがあります'
      : answers.expressionPace === 'words_later'
        ? '言葉が遅れて出る日は、返す前に整える時間が必要に感じられやすいことがあります'
        : 'その日によって言葉の出方が変わり、同じやり取りでも受け取り方が変わりやすいことがあります';
  const misreadStep =
    '反応の量や速さだけを手がかりにすると、相手の気持ちを決めつけやすくなることがあります';
  const relationshipLoopSteps = Object.freeze([
    rhythmStep,
    expressionStep,
    misreadStep,
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion:
      COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    currentExpression:
      'やり取りの速さや反応の見え方の違いが、まだ関係の形を決めずに読み取りのずれを生みやすいことがあります。',
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: 'やり取りのリズムを見ながら',
    immediateAction:
      '反応の量や速さだけを手がかりにすると、相手の気持ちを決めつけやすい読み取りのずれが起きやすいことがあります。',
    focusLabel: focusMeta.label,
    readingGuide: focusMeta.readingGuide,
    highlightedChapterKeys: Object.freeze([...focusMeta.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(
      focusMeta.chapters.map((chapterKey, index) =>
        Object.freeze({
          chapterKey,
          reason: focusMeta.reasons[index]!,
          concreteValue: focusMeta.outcomes[index]!,
        }),
      ),
    ),
  });
}

function distanceLoopStep(distance: NonNullable<CompatibilityCurrentContextAnswersV2['distance']>): string {
  return distance === 'explain_space'
    ? '距離を取る理由や時間が伝わっているときは、間合いの見え方と言葉の出方がずれやすいことがあります'
    : distance === 'go_quiet'
      ? '説明より先に静かになっているときは、静けさの意味が読み取りにくくなることがあります'
      : '距離そのものを扱いにくいときは、間合いの見え方が大きく見えやすいことがあります';
}

function reapproachLoopStep(
  readiness: NonNullable<CompatibilityCurrentContextAnswersV2['reapproachReadiness']>,
): string {
  return readiness === 'small_step_first'
    ? '小さな接点から始めたいときは、大きな話を先に置きにくいことがあります'
    : readiness === 'need_clarity_first'
      ? '先に自分の気持ちを整理したいときは、近づく前に整える時間が必要に感じられやすいことがあります'
      : 'タイミングがまだ見えないときは、近づくかどうかの判断が保留になりやすいことがあります';
}

function buildR4CurrentContextDisplay(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextDisplay {
  const focus = resolveFocusAnswer('R4', answers.focus);
  const focusMeta = stageFocusDisplay('R4', focus);
  const distance = answers.distance ?? 'go_quiet';
  const relationshipLoopSteps = Object.freeze([
    distanceLoopStep(distance),
    expressionLoopStep(answers.expressionPace),
    '間合いの見え方だけを手がかりにすると、相手の気持ちを決めつけやすくなることがあります',
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion:
      COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    currentExpression:
      '距離が感じられる状態では、間合いの見え方と言葉の出方の違いが、読み取りのずれを生みやすいことがあります。',
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: '今の間合いを見ながら',
    immediateAction:
      '間合いの見え方だけを手がかりにすると、相手の気持ちを決めつけやすい読み取りのずれが起きやすいことがあります。',
    focusLabel: focusMeta.label,
    readingGuide: focusMeta.readingGuide,
    highlightedChapterKeys: Object.freeze([...focusMeta.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(
      focusMeta.chapters.map((chapterKey, index) =>
        Object.freeze({
          chapterKey,
          reason: focusMeta.reasons[index]!,
          concreteValue: focusMeta.outcomes[index]!,
        }),
      ),
    ),
  });
}

function buildR5CurrentContextDisplay(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextDisplay {
  const focus = resolveFocusAnswer('R5', answers.focus);
  const focusMeta = stageFocusDisplay('R5', focus);
  const readiness = answers.reapproachReadiness ?? 'timing_uncertain';
  const distance = answers.distance ?? 'go_quiet';
  const relationshipLoopSteps = Object.freeze([
    reapproachLoopStep(readiness),
    distanceLoopStep(distance),
    expressionLoopStep(answers.expressionPace),
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion:
      COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    currentExpression:
      'もう一度近づくことを考える場面では、再接近のタイミングと今の間合いの見え方が、読み取りのずれを生みやすいことがあります。',
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: '再接近を考える前に',
    immediateAction:
      '相手の気持ちを決めつけず、自分が整えたい一点だけを先に確かめたい読み取りのずれが起きやすいことがあります。',
    focusLabel: focusMeta.label,
    readingGuide: focusMeta.readingGuide,
    highlightedChapterKeys: Object.freeze([...focusMeta.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(
      focusMeta.chapters.map((chapterKey, index) =>
        Object.freeze({
          chapterKey,
          reason: focusMeta.reasons[index]!,
          concreteValue: focusMeta.outcomes[index]!,
        }),
      ),
    ),
  });
}

function buildEstablishedCurrentContextDisplayV2(
  answers: CompatibilityCurrentContextAnswersV2,
  relationStatusId: 'R3' | 'R6',
): CompatibilityCurrentContextDisplay {
  if (answers.distance) {
    const legacy: CompatibilityCurrentContextAnswers = {
      ...establishedBodyFromV2(answers),
      distance: answers.distance,
      focus: resolveFocusAnswer(relationStatusId, answers.focus),
    };
    const display = buildV1Display(legacy);
    return Object.freeze({
      ...display,
      questionnaireContractVersion:
        COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    });
  }
  const focus = resolveFocusAnswer(relationStatusId, answers.focus);
  const focusMeta = FOCUS_DISPLAY[focus];
  const body = establishedBodyFromV2(answers);
  const expressionLine = ESTABLISHED_EXPRESSION_LINE[body.expressionPace];
  const relationshipLoopSteps = Object.freeze([
    ESTABLISHED_DISAGREEMENT_LOOP[body.disagreement],
    expressionLine.replace(/。$/u, ''),
    ESTABLISHED_RETURN_LOOP[body.returnPattern],
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion:
      COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2 as CompatibilityCurrentContextDisplay['questionnaireContractVersion'],
    currentExpression: `${ESTABLISHED_DECISION_EXPRESSION[body.decisionPace]}${expressionLine}`,
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: `言葉の出方を見ながら、${ESTABLISHED_GLANCE_SCENE[body.returnPattern]}`,
    immediateAction: ESTABLISHED_RETURN_ACTION[body.returnPattern],
    focusLabel: focusMeta.label,
    readingGuide: focusMeta.readingGuide,
    highlightedChapterKeys: Object.freeze([...focusMeta.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(
      focusMeta.chapters.map((chapterKey, index) =>
        Object.freeze({
          chapterKey,
          reason: focusMeta.reasons[index]!,
          concreteValue: focusMeta.outcomes[index]!,
        }),
      ),
    ),
  });
}

export function buildCompatibilityCurrentContextDisplayV2(
  answers: CompatibilityCurrentContextAnswersV2,
  relationStatusId: RelationStatusId,
): CompatibilityCurrentContextDisplay {
  if (relationStatusId === 'R1') {
    return buildR1CurrentContextDisplay(answers);
  }
  if (relationStatusId === 'R2') {
    return buildR2CurrentContextDisplay(answers);
  }
  if (relationStatusId === 'R4') {
    return buildR4CurrentContextDisplay(answers);
  }
  if (relationStatusId === 'R5') {
    return buildR5CurrentContextDisplay(answers);
  }
  if (relationStatusId === 'R3' || relationStatusId === 'R6') {
    return buildEstablishedCurrentContextDisplayV2(answers, relationStatusId);
  }
  throw new Error('unsupported_relation_stage');
}

export function buildCompatibilityCurrentContextChapterVariationV2(
  chapterKey: ChapterId,
  answers: CompatibilityCurrentContextAnswersV2,
  relationStatusId: RelationStatusId,
) {
  if (relationStatusId === 'R1' || relationStatusId === 'R2') {
    return buildV1ChapterVariation(chapterKey, {} as CompatibilityCurrentContextBodyAnswers);
  }
  if (relationStatusId === 'R4' || relationStatusId === 'R5') {
    return NO_CHAPTER_VARIATION_V2;
  }
  if (
    (relationStatusId === 'R3' || relationStatusId === 'R6') &&
    !answers.distance &&
    chapterKey === 'ch_today_clue'
  ) {
    return NO_CHAPTER_VARIATION_V2;
  }
  const body = establishedBodyFromV2(answers);
  if (answers.distance) {
    return buildV1ChapterVariation(chapterKey, { ...body, distance: answers.distance });
  }
  return buildV1ChapterVariation(
    chapterKey,
    body as CompatibilityCurrentContextBodyAnswers,
  );
}

export const RELATIONSHIP_LOOP_STEP_LABELS_V2 = Object.freeze([
  '噛み合いやすい瞬間',
  'すれ違いの入口',
  '誤読のループ',
] as const);

export function relationshipLoopStepLabelsFor(
  relationStatusId: RelationStatusId,
): readonly [string, string, string] {
  if (relationStatusId === 'R1') {
    return Object.freeze(['言葉の出方', '近づき方の迷い', '読み取りのずれ']);
  }
  if (relationStatusId === 'R2') {
    return Object.freeze(['やり取りのリズム', '受け取りのずれ', '読み方の違い']);
  }
  if (relationStatusId === 'R4') {
    return Object.freeze(['距離の感じ方', '間合いの入口', '読み取りのずれ']);
  }
  if (relationStatusId === 'R5') {
    return Object.freeze(['再接近のタイミング', '小さな接点', '読み取りのずれ']);
  }
  return RELATIONSHIP_LOOP_STEP_LABELS_V2;
}

export type StagePremiumBridgeCopy = {
  readonly deliverableLead: string;
  readonly toolkitTiles: readonly { readonly title: string; readonly body: string }[];
  readonly useCases: readonly string[];
};

export function stagePremiumBridgeCopy(
  relationStatusId: RelationStatusId,
): StagePremiumBridgeCopy {
  if (relationStatusId === 'R1') {
    return Object.freeze({
      deliverableLead:
        '無料では、まだ会話がない状態で起きやすい読み取りのずれまでを読みました。「二人の相性レポート」では、同じ流れを六つの場面に分け、あなた側と相手側の見え方、気持ちの置き方、小さな接点の考え方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。',
      toolkitTiles: Object.freeze([
        { title: '自分の中の動き', body: 'まだ会話がない状態で、自分の中で何が起きやすいか' },
        { title: '読み取りがずれる入口', body: '相手の反応が見えないときに、意味を置きやすい場面' },
        { title: '小さな接点の考え方', body: '近づくかどうかを決めずに、置ける形を探す順序' },
        { title: 'そのまま使える一言', body: '相手の気持ちを決めつけずに書き始める短い言葉' },
        { title: '今週一度だけ試すこと', body: '連絡の前に、自分の中で整理できる一歩' },
        { title: 'あとで振り返る一問', body: '何が引っかかったかを見直すための問い' },
      ]),
      useCases: Object.freeze([
        '連絡する前に読む',
        '言葉を整えたい時に読む',
        '自分の中を整理したい時に読む',
        'あとで振り返る',
      ]),
    });
  }
  if (relationStatusId === 'R2') {
    return Object.freeze({
      deliverableLead:
        '無料では、やり取りの速さや受け取り方のずれまでを読みました。「二人の相性レポート」では、同じ流れを六つの場面に分け、あなた側と相手側の見え方、言葉の置き方、小さな接点の考え方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。',
      toolkitTiles: Object.freeze([
        { title: '二人それぞれの動き', body: '同じやり取りで、あなた側と相手側に何が見えやすいか' },
        { title: '受け取りがずれる入口', body: '反応の量や速さから、意味を読み取りやすい場面' },
        { title: '言葉を置き直す手順', body: 'やり取りの速さを責めずに、次の接点を整える順序' },
        { title: 'そのまま使える一言', body: '責めずに話を始めるための短い言葉' },
        { title: '今週一度だけ試すこと', body: '負担を増やさず、今の二人で試せる一歩' },
        { title: 'あとで振り返る一問', body: '何が変わったかを見直すための問い' },
      ]),
      useCases: Object.freeze([
        '会話の前に読む',
        '返事の意味が気になる時に読む',
        'やり取りの速さを整えたい時に読む',
        'あとで振り返る',
      ]),
    });
  }
  if (relationStatusId === 'R4' || relationStatusId === 'R5') {
    const distanceWord = relationStatusId === 'R5' ? '再接近' : '距離';
    return Object.freeze({
      deliverableLead:
        `無料では、いまの距離感の読み取りのずれまでを読みました。「二人の相性レポート」では、同じ流れを六つの場面に分け、あなた側と相手側の見え方、間合いの入口、${distanceWord}を扱う順序、使える一言、小さな実験、振り返りまでを一つの流れとして残します。`,
      toolkitTiles: Object.freeze([
        { title: '二人それぞれの動き', body: '距離がある状態で、あなた側と相手側に何が見えやすいか' },
        { title: '間合いがずれる入口', body: '距離の理由を一つに決めずに、読み取りがずれやすい場面' },
        { title: '間合いを整える手順', body: '大きな答えを求めず、今の間合いを扱う順序' },
        { title: 'そのまま使える一言', body: '負担の小さい接点を置くための短い言葉' },
        { title: '今週一度だけ試すこと', body: '結果を決めずに、一度だけ試せる一歩' },
        { title: 'あとで振り返る一問', body: '何が変わったかを見直すための問い' },
      ]),
      useCases: Object.freeze([
        '間合いを整えたい時に読む',
        '距離の意味が気になる時に読む',
        relationStatusId === 'R5' ? '再接近を考える時に読む' : '今の距離を扱う時に読む',
        'あとで振り返る',
      ]),
    });
  }
  return Object.freeze({
    deliverableLead:
      '無料では、二人の間で回りやすい基本のループまでを読みました。「二人の相性レポート」では、同じループを六つの場面に分け、あなた側と相手側の視点、すれ違いの入口、戻し方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。',
    toolkitTiles: Object.freeze([
      { title: '二人それぞれの動き', body: '同じ場面で、あなた側と相手側に何が起きているか' },
      { title: 'すれ違いが始まる場面', body: 'どこから連鎖に変わるのかの順番' },
      { title: '場面から戻る手順', body: 'すれ違いのあとに戻る、小さな順序' },
      { title: 'そのまま使える一言', body: '責めずに話を始めるための短い言葉' },
      { title: '今週一度だけ試すこと', body: '負担を増やさず、今の二人で試せる一歩' },
      { title: 'あとで振り返る一問', body: '何が変わったかを見直すための問い' },
    ]),
    useCases: Object.freeze([
      '会話の前に読む',
      'すれ違った時に読む',
      '距離を戻したい時に読む',
      'あとで振り返る',
    ]),
  });
}
