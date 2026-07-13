import {
  CHAPTER_IDS,
  getChapterTitle,
  getTopicLabel,
} from './pairReadingCatalog.v1';
import {
  PAIR_AXIS_FREE_RESULT_FRAGMENTS,
  TOPIC_IMMEDIATE_ACTIONS,
} from './pairReadingFragments.v1';
import type {
  ChapterId,
  PaidTopicId,
  PairAxisId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';

export const PAID_COMPATIBILITY_REPORT_VERSION =
  'paid_compatibility_report_v1' as const;

export type PaidCompatibilityReportInput = {
  pairAxisId: PairAxisId;
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
  temperatureId: TemperatureId;
  personAUsesFirstPerspective: boolean;
};

export type PaidCompatibilityChapter = {
  readonly key: ChapterId;
  readonly number: number;
  readonly title: string;
  readonly scene: string;
  readonly personAPerspective: string;
  readonly personBPerspective: string;
  readonly relationshipLoop: readonly string[];
  readonly resetSteps: readonly string[];
  readonly phraseSpeaker: 'personA' | 'personB' | 'either';
  readonly usablePhrase: string;
  readonly smallExperiment: string;
  readonly reflectionQuestion: string;
};

export type PaidCompatibilityReportSnapshot = {
  readonly version: typeof PAID_COMPATIBILITY_REPORT_VERSION;
  readonly reportTitle: '二人の相性レポート';
  readonly relationshipSummary: string;
  readonly sharedFoundation: string;
  readonly differentFoundation: string;
  readonly recurringLoop: string;
  readonly highlightedChapterKeys: readonly ChapterId[];
  readonly chapters: readonly PaidCompatibilityChapter[];
  readonly safetyNote: string;
};

type SemanticRole = {
  role: 'A' | 'B';
  perspective: string;
};

type ChapterFocus = {
  scene: string;
  firstAction: string;
  secondReception: string;
  secondAction: string;
  firstReception: string;
  continuation: string;
  resetSteps: readonly string[];
  experimentAction: string;
  reflectionQuestion: string;
};

const STATUS_CONTEXT: Readonly<Record<RelationStatusId, string>> = {
  R1: '反応の見え方を急いで決めずに扱うこと',
  R2: '連絡の速さと受け取った温度を分けて扱うこと',
  R3: '近い関係の中にもある小さな間合いを扱うこと',
  R4: '距離の理由を一つに決めず、入口を小さく扱うこと',
  R5: '近づき直す結果より、最初の接点を扱うこと',
  R6: '特別な日より、日常のリズムを扱うこと',
};

const TEMPERATURE_CONTEXT: Readonly<Record<TemperatureId, string>> = {
  E0: '今の距離を一つの答えに固定しない',
  E1: '気になる点を一度に広げすぎない',
  E2: '返事の速さだけで温度を決めない',
  E3: '近づくか離れるかを急いで決めない',
  E4: '距離ができた理由を一つに決めない',
  E5: 'これからの結論より今の間合いを見る',
};

const CHAPTER_FOCUS: Readonly<Record<ChapterId, ChapterFocus>> = {
  ch_you_pace: {
    scene: '二人で予定や次の動きを決めようとする場面',
    firstAction: '先に予定の輪郭を置こうとする',
    secondReception: 'まだ整っていないところへ話が進んだように受け取る',
    secondAction: '考えるために返事の間を取る',
    firstReception: '関心が薄いか、話が止まったように受け取る',
    continuation: '決めようとする動きと待つ動きが強まりやすい',
    resetSteps: [
      'どちらかが、結論ではなく「いつ返事をするか」だけを提案する',
      'もう一方が、返せる時刻か日だけを短く伝える',
      '決めた時刻までは、返事の意味を推測せずに置いておく',
    ],
    experimentAction: '結論の代わりに、返事を置く時間だけを一つ決める',
    reflectionQuestion: '返事を待つ時間の意味を、二人は同じように受け取っていただろうか？',
  },
  ch_other_pace: {
    scene: '話し始めたあと、相手の反応がまだ見えない場面',
    firstAction: '受け取った合図を早めに確かめようとする',
    secondReception: '考えている途中に反応を求められたように受け取る',
    secondAction: '言葉を選ぶために表の反応を小さくする',
    firstReception: '話が届いていないか、避けられたように受け取る',
    continuation: '確認する量と静かに考える時間が互いに増えやすい',
    resetSteps: [
      'どちらかが「受け取った合図だけ欲しい」と短く伝える',
      'もう一方が、答えではなく受け取ったことだけを返す',
      '続きの話は、二人が扱える時間を改めて選ぶ',
    ],
    experimentAction: '答えの前に「読んだ」「聞いた」の合図だけを一度返す',
    reflectionQuestion: '反応の量ではなく、受け取った合図として見えたものは何だっただろう？',
  },
  ch_pair_gap: {
    scene: '意見が分かれ、話の進め方までずれてきた場面',
    firstAction: '理由を足して違いを整理しようとする',
    secondReception: '自分の受け取りが後回しになったように感じる',
    secondAction: '安心できるまで話から少し距離を取る',
    firstReception: '説明を拒まれ、論点が離れたように受け取る',
    continuation: '説明と安心の確認が別々の順序で続きやすい',
    resetSteps: [
      'どちらかが、相手の意図を一文で確認する',
      'もう一方が、合っている部分だけを先に返す',
      '違っていた部分は、一つだけ選んで話し直す',
    ],
    experimentAction: '意見を返す前に、相手の意図を一文で確認する',
    reflectionQuestion: '話の内容と、受け止められた安心のどちらを先に求めていただろう？',
  },
  ch_topic_deep: {
    scene: '今いちばん気になる関係の場面を、二人で扱おうとする場面',
    firstAction: '気になる点を早めに言葉へ置こうとする',
    secondReception: 'まだ輪郭のないことに答えを求められたように受け取る',
    secondAction: '場面を見直すために反応を控える',
    firstReception: '話題そのものを避けられたように受け取る',
    continuation: '話題へ入る速さの差が、気持ちの差に見えやすい',
    resetSteps: [
      'どちらかが、扱いたい場面を一つだけ挙げる',
      'もう一方が、今話せるか、別の時間がよいかを選ぶ',
      '話す場合も、最初の十分で扱う一点を決める',
    ],
    experimentAction: '扱う場面を一つに絞り、話せる時間を先に確かめる',
    reflectionQuestion: '話題の重さではなく、入口の作り方で変わったことはあっただろうか？',
  },
  ch_today_clue: {
    scene: '会話のあと、どちらかが少し距離を置きたくなった場面',
    firstAction: '今の温度を確かめるために接点を増やそうとする',
    secondReception: '落ち着くための間が狭くなったように受け取る',
    secondAction: '自分のペースを戻すために接点を減らす',
    firstReception: '距離がさらに広がる合図のように受け取る',
    continuation: '近づいて確かめる動きと、離れて整える動きが続きやすい',
    resetSteps: [
      'どちらかが、必要な間の長さを大まかに伝える',
      'もう一方が、その間に必要な連絡だけを一つ確認する',
      '二十四時間から四十八時間以内に、短い接点を置く',
    ],
    experimentAction: '離れる前に、次に短く連絡する時間だけを決める',
    reflectionQuestion: '距離を置くことは、二人にとってそれぞれ何を整える時間だっただろう？',
  },
  ch_about: {
    scene: 'やり取りが途切れたあと、元の距離へ戻ろうとする場面',
    firstAction: '関係の意味を確かめてから戻ろうとする',
    secondReception: '戻る前に大きな答えを求められたように受け取る',
    secondAction: '負担の小さい日常の接点から戻ろうとする',
    firstReception: '大切な話を避けたまま進めるように受け取る',
    continuation: '意味の確認と小さな再開が別々に求められやすい',
    resetSteps: [
      'どちらかが、関係の結論ではなく短い接点を提案する',
      'もう一方が、応じられる形や時間だけを返す',
      '続けるかどうかは、その一回のあとで改めて選ぶ',
    ],
    experimentAction: '答えを決めず、十分ほどの短いやり取りを一度だけ置く',
    reflectionQuestion: '大きな答えを出さずに戻れた接点は、どんな形だっただろう？',
  },
};

const ROLE_PHRASES: Readonly<
  Record<PairAxisId, { first: string; second: string }>
> = {
  A1: {
    first: '今すぐ全部を決めるより、返事をする時間だけ先に決めない？',
    second: '少し考える時間が欲しいので、返す時間だけ伝えてもいい？',
  },
  A2: {
    first: '答えの前に、受け取ったことだけ教えてもらってもいい？',
    second: 'まだ考えている途中だけど、受け取ったことは先に伝えるね。',
  },
  A3: {
    first: '理由を話す前に、どう受け取ったかを一度聞いてもいい？',
    second: '先に受け止めてもらえたら、そのあとで理由を聞きたい。',
  },
  A4: {
    first: '本題に入る前に、今この話をしてもよいかだけ聞いていい？',
    second: '少し日常の話をしてから、本題へ移る形でもいい？',
  },
};

const SHARED_PHRASES: Readonly<Record<PairAxisId, readonly [string, string, string, string]>> = {
  A1: [
    'どちらが正しいかより、二人が返しやすい順番を一度決めない？',
    'この話は一つだけ扱って、続きの時間を別に決めない？',
    '少し間を置いて、次に短く話す時間だけ決めておかない？',
    '関係の答えより、今日は短く話せる形を一緒に選ばない？',
  ],
  A2: [
    '反応の大きさではなく、届いた合図を一つずつ確かめない？',
    '今すぐ答えなくていいので、話せる時間だけ選んでもらえる？',
    '静かに考える時間と、短い合図の両方を残しておかない？',
    '言葉が少なくても決めつけず、短い接点から戻ってみない？',
  ],
  A3: [
    '説明を続ける前に、受け取れた部分を一つずつ確かめない？',
    '結論より先に、今いちばん引っかかる一点を聞いてもいい？',
    '落ち着くための間を取り、次に話す時間だけ決めておかない？',
    '続け方を決める前に、負担の小さいやり取りを一度置かない？',
  ],
  A4: [
    '本題の前に、二人が入りやすい話の始め方を選ばない？',
    'この場面を話すなら、短い入口から始めてもいい？',
    'いったん間を取り、次の連絡は短い一言からにしない？',
    '大きな話を急がず、日常の短いやり取りから始めない？',
  ],
};

function semanticRoles(
  axis: PairAxisId,
  personAUsesFirstPerspective: boolean,
): { first: SemanticRole; second: SemanticRole; personA: string; personB: string } {
  const authority = PAIR_AXIS_FREE_RESULT_FRAGMENTS[axis];
  const firstRole: SemanticRole = {
    role: personAUsesFirstPerspective ? 'A' : 'B',
    perspective: authority.perspectiveOne,
  };
  const secondRole: SemanticRole = {
    role: personAUsesFirstPerspective ? 'B' : 'A',
    perspective: authority.perspectiveTwo,
  };
  return {
    first: firstRole,
    second: secondRole,
    personA: personAUsesFirstPerspective
      ? authority.perspectiveOne
      : authority.perspectiveTwo,
    personB: personAUsesFirstPerspective
      ? authority.perspectiveTwo
      : authority.perspectiveOne,
  };
}

function perspectiveText(
  chapterIndex: number,
  role: 'A' | 'B',
  perspective: string,
  topicLabel: string,
  statusContext: string,
): string {
  const templates = [
    `予定を決める場面で、${role}は自分が動ける輪郭を先に確かめたくなります。背景には「${perspective}」という見え方があります。`,
    `反応がまだ見えない場面で、${role}は受け取った合図の置き方を慎重に扱います。その合図を「${perspective}」という見え方から受け取ります。`,
    `意見が分かれると、${role}には話の内容と安心できる順序のどちらを先に置くかが表れます。順序を選ぶ土台には「${perspective}」という見え方があります。`,
    `「${topicLabel}」を扱うとき、${role}は話題へ入る間合いを自分の順序で整えます。話題への入り口では「${perspective}」という見え方が表れます。`,
    `この場面で、${role}は${statusContext}を自分のペースで確かめようとします。距離を測る土台には「${perspective}」という見え方があります。`,
    `元の距離へ戻るとき、${role}は関係を一つの説明に固定せず、小さな接点から様子を見ます。接点を探すときには「${perspective}」という見え方が表れます。`,
  ] as const;
  return templates[chapterIndex]!;
}

function chapterPhrase(
  key: ChapterId,
  axis: PairAxisId,
  roles: ReturnType<typeof semanticRoles>,
): { speaker: PaidCompatibilityChapter['phraseSpeaker']; text: string } {
  if (key === 'ch_you_pace') {
    const text = roles.first.role === 'A'
      ? ROLE_PHRASES[axis].first
      : ROLE_PHRASES[axis].second;
    return { speaker: 'personA', text };
  }
  if (key === 'ch_other_pace') {
    const text = roles.first.role === 'B'
      ? ROLE_PHRASES[axis].first
      : ROLE_PHRASES[axis].second;
    return { speaker: 'personB', text };
  }
  const sharedIndex = CHAPTER_IDS.indexOf(key) - 2;
  return {
    speaker: 'either',
    text: SHARED_PHRASES[axis][sharedIndex]!,
  };
}

function buildChapter(
  key: ChapterId,
  index: number,
  input: PaidCompatibilityReportInput,
  roles: ReturnType<typeof semanticRoles>,
): PaidCompatibilityChapter {
  const focus = CHAPTER_FOCUS[key];
  const topicLabel = getTopicLabel(input.paidTopicId);
  const topicAction = TOPIC_IMMEDIATE_ACTIONS[input.paidTopicId];
  const phrase = chapterPhrase(key, input.pairAxisId, roles);
  const topicScene = key === 'ch_topic_deep'
    ? `${focus.scene}。ここでは「${topicLabel}」に場面を絞ります`
    : focus.scene;
  const personA = perspectiveText(
    index,
    'A',
    roles.personA,
    topicLabel,
    STATUS_CONTEXT[input.relationStatusId],
  );
  const personB = perspectiveText(
    index,
    'B',
    roles.personB,
    topicLabel,
    STATUS_CONTEXT[input.relationStatusId],
  );
  const smallExperiment = [
    `今週、${topicAction.situation}に、${focus.experimentAction}。`,
    '一回分の場面だけを見て、次も続けるかはそのあとで選びます。',
  ].join('');

  return Object.freeze({
    key,
    number: index + 1,
    title: getChapterTitle(key, input.paidTopicId),
    scene: topicScene,
    personAPerspective: personA,
    personBPerspective: personB,
    relationshipLoop: Object.freeze([
      `${roles.first.role}が${focus.firstAction}`,
      `${roles.second.role}が${focus.secondReception}`,
      `${roles.second.role}が${focus.secondAction}`,
      `${roles.first.role}が${focus.firstReception}`,
      `二人の間で、${focus.continuation}`,
    ]),
    resetSteps: Object.freeze([...focus.resetSteps]),
    phraseSpeaker: phrase.speaker,
    usablePhrase: phrase.text,
    smallExperiment,
    reflectionQuestion: focus.reflectionQuestion,
  });
}

export function buildPaidCompatibilityReportV1(
  input: PaidCompatibilityReportInput,
): PaidCompatibilityReportSnapshot {
  const roles = semanticRoles(input.pairAxisId, input.personAUsesFirstPerspective);
  const authority = PAIR_AXIS_FREE_RESULT_FRAGMENTS[input.pairAxisId];
  const chapters = CHAPTER_IDS.map((key, index) =>
    buildChapter(key, index, input, roles),
  );
  const highlightedChapterKeys = Object.freeze([
    'ch_pair_gap',
    'ch_topic_deep',
  ] satisfies ChapterId[]);

  return Object.freeze({
    version: PAID_COMPATIBILITY_REPORT_VERSION,
    reportTitle: '二人の相性レポート',
    relationshipSummary: [
      authority.overlap,
      authority.difference,
      `${TEMPERATURE_CONTEXT[input.temperatureId]}ことが、六つの場面を読むときの入口です。`,
    ].join(''),
    sharedFoundation: authority.overlap,
    differentFoundation: authority.difference,
    recurringLoop: `二人の間では、${authority.dynamicOutcome}。`,
    highlightedChapterKeys,
    chapters: Object.freeze(chapters),
    safetyNote:
      'このレポートは、関係や相手の気持ち、これからの結果を決めるものではありません。対話を続けるかどうかも、それぞれが選べます。恐怖や暴力、強制がある場合は、このレポートより安全の確保を優先してください。',
  });
}
