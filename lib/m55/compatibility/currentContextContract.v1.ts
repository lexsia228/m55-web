import type { ChapterId } from './pairReadingTypes';

export const COMPATIBILITY_CURRENT_CONTEXT_VERSION =
  'compatibility_current_context_v1' as const;
export const COMPATIBILITY_CURRENT_CONTEXT_STATE_COUNT = 1215 as const;

export type CompatibilityCurrentQuestionId =
  | 'decisionPace'
  | 'disagreement'
  | 'distance'
  | 'expressionPace'
  | 'returnPattern'
  | 'focus';

export type DecisionPaceAnswer = 'decide_now' | 'decide_later' | 'decide_varies';
export type DisagreementAnswer = 'talk_now' | 'take_space' | 'one_carries';
export type DistanceAnswer = 'explain_space' | 'go_quiet' | 'space_is_hard';
export type ExpressionPaceAnswer = 'words_soon' | 'words_later' | 'words_vary';
export type ReturnPatternAnswer = 'someone_reaches' | 'time_restores' | 'return_is_hard';
export type CompatibilityFocusAnswer =
  | 'distance_focus'
  | 'conversation_focus'
  | 'loop_focus'
  | 'return_focus'
  | 'next_step_focus';

export type CompatibilityCurrentContextAnswers = {
  decisionPace: DecisionPaceAnswer;
  disagreement: DisagreementAnswer;
  distance: DistanceAnswer;
  expressionPace: ExpressionPaceAnswer;
  returnPattern: ReturnPatternAnswer;
  focus: CompatibilityFocusAnswer;
};

export type CompatibilityCurrentContextBodyAnswers = Omit<
  CompatibilityCurrentContextAnswers,
  'focus'
>;

type QuestionChoice<T extends string> = {
  readonly answerId: T;
  readonly label: string;
};

export type CompatibilityCurrentContextQuestion = {
  readonly questionId: CompatibilityCurrentQuestionId;
  readonly question: string;
  readonly choices: readonly QuestionChoice<string>[];
};

export const COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS = Object.freeze([
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
    questionId: 'distance',
    question: 'どちらかが少し距離を取りたいとき、今はどの形に近いですか？',
    choices: [
      { answerId: 'explain_space', label: '理由や時間を伝えて距離を取る' },
      { answerId: 'go_quiet', label: '特に説明せず静かになる' },
      { answerId: 'space_is_hard', label: '距離を取ること自体が難しい' },
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
  {
    questionId: 'focus',
    question: '今、このレポートで特に整理したいことはどれですか？',
    choices: [
      { answerId: 'distance_focus', label: '二人の距離感' },
      { answerId: 'conversation_focus', label: '会話の進め方' },
      { answerId: 'loop_focus', label: 'すれ違いが続く理由' },
      { answerId: 'return_focus', label: '関係を戻すきっかけ' },
      { answerId: 'next_step_focus', label: 'これからの進め方' },
    ],
  },
] satisfies readonly CompatibilityCurrentContextQuestion[]);

const ANSWER_IDS = Object.freeze({
  decisionPace: ['decide_now', 'decide_later', 'decide_varies'],
  disagreement: ['talk_now', 'take_space', 'one_carries'],
  distance: ['explain_space', 'go_quiet', 'space_is_hard'],
  expressionPace: ['words_soon', 'words_later', 'words_vary'],
  returnPattern: ['someone_reaches', 'time_restores', 'return_is_hard'],
  focus: [
    'distance_focus',
    'conversation_focus',
    'loop_focus',
    'return_focus',
    'next_step_focus',
  ],
} as const);

export function isCompleteCompatibilityCurrentContext(
  value: unknown,
): value is CompatibilityCurrentContextAnswers {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (Object.keys(ANSWER_IDS) as CompatibilityCurrentQuestionId[]).every(
    (questionId) =>
      typeof candidate[questionId] === 'string' &&
      (ANSWER_IDS[questionId] as readonly string[]).includes(candidate[questionId] as string),
  );
}

export function bodyAnswersFromCurrentContext(
  answers: CompatibilityCurrentContextAnswers,
): CompatibilityCurrentContextBodyAnswers {
  return {
    decisionPace: answers.decisionPace,
    disagreement: answers.disagreement,
    distance: answers.distance,
    expressionPace: answers.expressionPace,
    returnPattern: answers.returnPattern,
  };
}

const DECISION_COPY: Readonly<Record<DecisionPaceAnswer, {
  expression: string;
  scene: string;
  reset: string;
}>> = {
  decide_now: {
    expression: 'その場で進める力が出やすく、考える間をどこに置くかが今の焦点です。',
    scene: 'その場で方向を決めようとする動きが先に出やすい',
    reset: '結論の前に、もう一度考える時間が必要かだけ確かめる',
  },
  decide_later: {
    expression: '少し時間を置いて決める流れがあり、次に話す時点を見える形にすることが今の焦点です。',
    scene: 'いったん持ち帰って考える動きが出やすい',
    reset: '答えではなく、次に話す時点だけを先に決める',
  },
  decide_varies: {
    expression: '場面によって決める速さが変わり、今回は急ぐ話か待てる話かをそろえることが今の焦点です。',
    scene: '場面ごとに進める速さが変わりやすい',
    reset: 'この話は急ぐか待てるかを、内容へ入る前にそろえる',
  },
};

const DISAGREEMENT_COPY: Readonly<Record<DisagreementAnswer, {
  loop: string;
  phrase: string;
}>> = {
  talk_now: {
    loop: '違いが出るとその場の言葉が増え、整理する前に応答が重なりやすくなります',
    phrase: '違って見える一点だけを先に確かめない？',
  },
  take_space: {
    loop: '違いが出るといったん間を取り、その間の意味をそれぞれ別に受け取りやすくなります',
    phrase: '次に話す時間だけを先に決めない？',
  },
  one_carries: {
    loop: '違いが出るとどちらかが話題を引き取り、表に出なかった違いが次の場面へ残りやすくなります',
    phrase: 'まだ言えていない違いを一つ聞いてもいい？',
  },
};

const DISTANCE_COPY: Readonly<Record<DistanceAnswer, {
  scene: string;
  loop: string;
  reset: string;
}>> = {
  explain_space: {
    scene: '距離が必要な理由や時間は言葉にしやすい',
    loop: '離れる前の説明を手がかりに、戻る入口を作れます',
    reset: '伝えた時間が過ぎたら、短い合図を一度置く',
  },
  go_quiet: {
    scene: '距離が必要なとき、説明より先に静かになることがあります',
    loop: '静かな時間の意味が見えず、確かめる動きと離れる動きが強まりやすくなります',
    reset: '離れる前に、返事ではなく次の短い接点だけを伝える',
  },
  space_is_hard: {
    scene: '距離を取る必要があっても、その間を作ること自体が難しくなりやすい',
    loop: '話を続ける負荷と離れる不安が同時に残りやすくなります',
    reset: '会話を終えるのではなく、十分だけ中断する形を選ぶ',
  },
};

const EXPRESSION_COPY: Readonly<Record<ExpressionPaceAnswer, {
  expression: string;
  reset: string;
  reflection: string;
}>> = {
  words_soon: {
    expression: '気持ちは比較的すぐ言葉になり、最初の言葉を結論にしない余白が役立ちます。',
    reset: '最初に出た言葉を結論にせず、言い直したい点があるかを聞く',
    reflection: 'すぐに出た言葉のあと、言い直せたことは何だっただろう？',
  },
  words_later: {
    expression: '気持ちは時間をかけて言葉になり、待つ間の扱い方が二人の受け取りを左右します。',
    reset: '今は言葉にならないことと、いつなら話せそうかを分けて伝える',
    reflection: '言葉になるまでの間に、安心につながった合図は何だっただろう？',
  },
  words_vary: {
    expression: '気持ちが言葉になる速さは場面で変わり、その日の余力を先に確かめることが役立ちます。',
    reset: '今日は話せる場面か、別の時間がよいかを先に選ぶ',
    reflection: '言葉にしやすかった場面と難しかった場面には、どんな違いがあっただろう？',
  },
};

const RETURN_COPY: Readonly<Record<ReturnPatternAnswer, {
  loop: string;
  action: string;
  experiment: string;
  reflection: string;
}>> = {
  someone_reaches: {
    loop: '戻るときはどちらかの最初の声かけが入口になっています。',
    action: '次のすれ違いでは、結論ではなく短い声かけを一度だけ置きます。',
    experiment: '短い声かけを一度置き、返事を急がずに次の接点を待つ',
    reflection: '最初の声かけを受け取りやすくしたのは、どんな短さや時間だっただろう？',
  },
  time_restores: {
    loop: '時間が流れることで自然に戻れますが、置いたままの違いが残ることもあります。',
    action: '自然に戻ったあと、扱わずに残った一点だけを短く確認します。',
    experiment: '自然に会話が戻ったあと、残った一点を十分以内で確かめる',
    reflection: '自然に戻れたことと、まだ残っていたことは何だっただろう？',
  },
  return_is_hard: {
    loop: '戻るきっかけが見つかりにくく、最初の接点に大きな意味を持たせやすくなります。',
    action: '関係の答えを求めず、負担の小さい接点を一度だけ提案します。',
    experiment: '答えを決めず、応じるかを選べる短い接点を一度だけ提案する',
    reflection: '大きな答えを求めずに置けそうな、最小の接点は何だっただろう？',
  },
};

const FOCUS_COPY: Readonly<Record<CompatibilityFocusAnswer, {
  label: string;
  readingGuide: string;
  chapters: readonly [ChapterId, ChapterId];
  reasons: readonly [string, string];
  outcomes: readonly [string, string];
}>> = {
  distance_focus: {
    label: '二人の距離感',
    readingGuide: '距離を取る時間と、短く戻る入口から読んでください。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: ['距離が必要なときの合図を扱う章です。', '元の距離へ戻る最初の接点を扱う章です。'],
    outcomes: ['離れる前に確認する一つの約束', '負担の小さい再開の一言'],
  },
  conversation_focus: {
    label: '会話の進め方',
    readingGuide: '反応を待つ時間と、意見が分かれた場面から読んでください。',
    chapters: ['ch_other_pace', 'ch_pair_gap'],
    reasons: ['返事がまだ見えない時間を扱う章です。', '意見差が会話のずれへ変わる場面を扱う章です。'],
    outcomes: ['答えの前に返せる短い合図', '違いを一つずつ扱う順序'],
  },
  loop_focus: {
    label: 'すれ違いが続く理由',
    readingGuide: '違いが連鎖へ変わる場面と、今気になる話題の入口から読んでください。',
    chapters: ['ch_pair_gap', 'ch_topic_deep'],
    reasons: ['説明と安心の順序がずれる場面を扱う章です。', '今気になる話題へ入る間合いを扱う章です。'],
    outcomes: ['連鎖を止める三つの手順', '話題を小さく始める方法'],
  },
  return_focus: {
    label: '関係を戻すきっかけ',
    readingGuide: '距離が生まれた直後と、戻り始める最初の接点から読んでください。',
    chapters: ['ch_today_clue', 'ch_about'],
    reasons: ['離れる動きが強まる直前を扱う章です。', '戻るきっかけを小さく作る章です。'],
    outcomes: ['距離を広げない短い確認', 'そのまま使える再開の一言'],
  },
  next_step_focus: {
    label: 'これからの進め方',
    readingGuide: '次を決める速さと、扱いたい話題の入口から読んでください。',
    chapters: ['ch_you_pace', 'ch_topic_deep'],
    reasons: ['二人で次を決める速さを扱う章です。', '今後の話題を一度に広げない入口を扱う章です。'],
    outcomes: ['決める前にそろえる時間', '今週一度だけ試せる進め方'],
  },
};

const CHAPTER_SCENE_ENTRY: Readonly<Record<ChapterId, string>> = {
  ch_you_pace: '予定や次の動きを決めるとき',
  ch_other_pace: '話したあとの反応を待つとき',
  ch_pair_gap: '意見の違いを扱うとき',
  ch_topic_deep: '今気になる話題へ入るとき',
  ch_today_clue: 'どちらかが距離を必要とするとき',
  ch_about: 'すれ違いのあとに戻ろうとするとき',
};

export const RELATIONSHIP_LOOP_STEP_LABELS = Object.freeze([
  '噛み合いやすい瞬間',
  'すれ違いの入口',
  '誤読のループ',
] as const);

const DISTANCE_GLANCE: Readonly<Record<DistanceAnswer, string>> = {
  explain_space: '間を取りつつ',
  go_quiet: '距離が開くと',
  space_is_hard: '間を作りにくく',
};

const RETURN_GLANCE: Readonly<Record<ReturnPatternAnswer, string>> = {
  someone_reaches: '声かけで戻りやすい',
  time_restores: '時間で自然に戻りやすい',
  return_is_hard: '戻る入口を作りにくい',
};

export function buildGlanceLabel(
  answers: CompatibilityCurrentContextBodyAnswers,
): string {
  return `${DISTANCE_GLANCE[answers.distance]}、${RETURN_GLANCE[answers.returnPattern]}今`;
}

export type CompatibilityCurrentContextDisplay = {
  readonly questionnaireContractVersion: typeof COMPATIBILITY_CURRENT_CONTEXT_VERSION;
  readonly currentExpression: string;
  readonly relationshipLoop: string;
  readonly relationshipLoopSteps: readonly [string, string, string];
  readonly glanceLabel: string;
  readonly immediateAction: string;
  readonly focusLabel: string;
  readonly readingGuide: string;
  readonly highlightedChapterKeys: readonly [ChapterId, ChapterId];
  readonly chapterPreview: readonly {
    readonly chapterKey: ChapterId;
    readonly reason: string;
    readonly concreteValue: string;
  }[];
};

export function buildCompatibilityCurrentContextDisplay(
  answers: CompatibilityCurrentContextAnswers,
): CompatibilityCurrentContextDisplay {
  const decision = DECISION_COPY[answers.decisionPace];
  const expression = EXPRESSION_COPY[answers.expressionPace];
  const disagreement = DISAGREEMENT_COPY[answers.disagreement];
  const distance = DISTANCE_COPY[answers.distance];
  const returning = RETURN_COPY[answers.returnPattern];
  const focus = FOCUS_COPY[answers.focus];
  const bodyAnswers = bodyAnswersFromCurrentContext(answers);
  const relationshipLoopSteps = Object.freeze([
    disagreement.loop,
    distance.loop,
    returning.loop,
  ] as const);
  const relationshipLoop = relationshipLoopSteps
    .map((step) => step.replace(/。$/u, ''))
    .join('。') + '。';
  return Object.freeze({
    questionnaireContractVersion: COMPATIBILITY_CURRENT_CONTEXT_VERSION,
    currentExpression: `${decision.expression}${expression.expression}`,
    relationshipLoopSteps,
    relationshipLoop,
    glanceLabel: buildGlanceLabel(bodyAnswers),
    immediateAction: returning.action,
    focusLabel: focus.label,
    readingGuide: focus.readingGuide,
    highlightedChapterKeys: Object.freeze([...focus.chapters]) as readonly [ChapterId, ChapterId],
    chapterPreview: Object.freeze(focus.chapters.map((chapterKey, index) => Object.freeze({
      chapterKey,
      reason: focus.reasons[index]!,
      concreteValue: focus.outcomes[index]!,
    }))),
  });
}

export type CompatibilityCurrentContextChapterVariation = {
  readonly sceneSuffix: string | null;
  readonly relationshipLoopTail: string | null;
  readonly usablePhrase: string | null;
  readonly smallExperiment: string | null;
  readonly reflectionQuestion: string | null;
};

const NO_CHAPTER_VARIATION: CompatibilityCurrentContextChapterVariation = Object.freeze({
  sceneSuffix: null,
  relationshipLoopTail: null,
  usablePhrase: null,
  smallExperiment: null,
  reflectionQuestion: null,
});

const endSentence = (text: string) => `${text.replace(/。$/u, '')}。`;

/**
 * Each paid chapter is about one of the five answered body dimensions, so it
 * carries only that dimension's lines. Applying every answer to every chapter
 * made all six read as the same advice behind a different scene label, and it
 * overwrote copy the chapter already had. Q6 (focus) stays out of chapter
 * bodies; it only selects which chapters to highlight.
 */
export function buildCompatibilityCurrentContextChapterVariation(
  chapterKey: ChapterId,
  answers: CompatibilityCurrentContextBodyAnswers,
): CompatibilityCurrentContextChapterVariation {
  const entry = CHAPTER_SCENE_ENTRY[chapterKey];
  switch (chapterKey) {
    case 'ch_you_pace': {
      const decision = DECISION_COPY[answers.decisionPace];
      return Object.freeze({
        ...NO_CHAPTER_VARIATION,
        sceneSuffix: `${entry}、今は${decision.scene}状態です。`,
      });
    }
    case 'ch_other_pace': {
      const expression = EXPRESSION_COPY[answers.expressionPace];
      return Object.freeze({
        ...NO_CHAPTER_VARIATION,
        sceneSuffix: `${entry}、${endSentence(expression.expression)}`,
        reflectionQuestion: `${entry}、${expression.reflection}`,
      });
    }
    case 'ch_pair_gap': {
      const disagreement = DISAGREEMENT_COPY[answers.disagreement];
      return Object.freeze({
        ...NO_CHAPTER_VARIATION,
        relationshipLoopTail: endSentence(disagreement.loop),
        usablePhrase: disagreement.phrase,
      });
    }
    case 'ch_today_clue': {
      const distance = DISTANCE_COPY[answers.distance];
      return Object.freeze({
        ...NO_CHAPTER_VARIATION,
        sceneSuffix: `${entry}、今は${distance.scene}状態です。`,
        relationshipLoopTail: endSentence(distance.loop),
      });
    }
    case 'ch_about': {
      const returning = RETURN_COPY[answers.returnPattern];
      return Object.freeze({
        ...NO_CHAPTER_VARIATION,
        relationshipLoopTail: endSentence(returning.loop),
        smallExperiment: `今週、${entry}に、${returning.experiment}。一回分だけを振り返ります。`,
        reflectionQuestion: `${entry}、${returning.reflection}`,
      });
    }
    default:
      return NO_CHAPTER_VARIATION;
  }
}
