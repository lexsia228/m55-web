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
import {
  buildCompatibilityCurrentContextChapterVariation,
  buildCompatibilityCurrentContextDisplay,
  bodyAnswersFromCurrentContext,
  type CompatibilityCurrentContextAnswers,
  type CompatibilityCurrentContextDisplay,
} from './currentContextContract.v1';
import {
  buildCompatibilityCurrentContextChapterVariationV2,
  buildCompatibilityCurrentContextDisplayV2,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import { resolvePairCanonicalProfileV2, type PairCanonicalProfileV2 } from './pairCanonicalProfileV2';
import { formatPaidChapterDepthNarrative, paidChapterDepthFor } from './paidCompatibilityChapterDepthV1';

export const PAID_COMPATIBILITY_REPORT_VERSION =
  'paid_compatibility_report_v1' as const;

export type PaidCompatibilityReportInput = {
  pairAxisId: PairAxisId;
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
  temperatureId: TemperatureId;
  personAUsesFirstPerspective: boolean;
  currentContext?: CompatibilityCurrentContextAnswers;
  currentContextV2?: CompatibilityCurrentContextAnswersV2;
  personABirthDate?: string;
  personBBirthDate?: string;
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
  readonly sceneInteractionId: string;
};

export type PaidCompatibilityReportSnapshot = {
  readonly version: typeof PAID_COMPATIBILITY_REPORT_VERSION;
  readonly reportTitle: '二人の相性レポート';
  readonly relationshipSummary: string;
  readonly sharedFoundation: string;
  readonly differentFoundation: string;
  readonly recurringLoop: string;
  readonly highlightedChapterKeys: readonly ChapterId[];
  readonly currentContext?: CompatibilityCurrentContextDisplay;
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
  relationshipLoop?: readonly string[];
};

const TEMPERATURE_CONTEXT: Readonly<Record<TemperatureId, string>> = {
  E0: '今の距離を一つの答えに固定しない',
  E1: '気になる点を一度に広げすぎない',
  E2: '返事の速さだけで温度を決めない',
  E3: '近づくか離れるかを急いで決めない',
  E4: '距離ができた理由を一つに決めない',
  E5: 'これからの結論より今の間合いを見る',
};

const R1_TEMPERATURE_CONTEXT: Readonly<Record<TemperatureId, string>> = {
  E0: '今の距離を一つの答えに固定しない',
  E1: '気になる点を一度に広げすぎない',
  E2: '言葉の出方だけで温度を決めない',
  E3: '近づくかどうかを急いで決めない',
  E4: '静けさの意味を一つに決めない',
  E5: 'これからの結論より今の迷いを見る',
};

function temperatureContextFor(
  relationStatusId: RelationStatusId,
  temperatureId: TemperatureId,
): string {
  return relationStatusId === 'R1'
    ? R1_TEMPERATURE_CONTEXT[temperatureId]
    : TEMPERATURE_CONTEXT[temperatureId];
}

function actionMotionPhrase(action: string): string {
  return action.replace(/。$/u, '');
}

const R1_PARTNER_UNCERTAINTY: readonly string[] = [
  '相手については、まだ反応材料が少ないため、あなたからは意味を決めにくい状態です。',
  '相手については、まだやり取りがないため、あなたからは気持ちの中身までは確かめにくい状態です。',
  '相手については、近づく前の段階のため、あなたからは動きの意図までは読み取りにくい状態です。',
  '相手については、まだ会話がないため、あなたからは扱いたい点の輪郭までは見えにくい状態です。',
  '相手については、距離の見え方だけでは、あなたからは内側の温度までは確かめにくい状態です。',
  '相手については、最初の接点の前なので、あなたからは次の動きまでは決めにくい状態です。',
];

const R4_PARTNER_UNCERTAINTY: readonly string[] = [
  '相手については、いまの間合いの見え方だけでは、あなたからは内側の動きまでは確かめにくい状態です。',
  '相手については、連絡の少なさだけでは、あなたからは気持ちの中身までは読み取りにくい状態です。',
  '相手については、距離の理由を一つに決めずに読む必要があり、あなたからは動きの意図までは確かめにくい状態です。',
  '相手については、間合いの見え方だけでは、あなたからは扱いたい点の輪郭までは見えにくい状態です。',
  '相手については、距離がある中でも、あなたからは内側の温度までは確かめにくい状態です。',
  '相手については、今の間合いを整える場面では、あなたからは次の動きまでは決めにくい状態です。',
];

const R5_PARTNER_UNCERTAINTY: readonly string[] = [
  '相手については、再接近を望んでいるとは限らず、あなたからは間合いの見え方だけを手がかりに読みやすい状態です。',
  '相手については、再び連絡する意思があるとは限らず、あなたからは反応材料が少ない状態です。',
  '相手については、近づき方の見え方だけでは、あなたからは内側の動きまでは確かめにくい状態です。',
  '相手については、再接近の入口だけでは、あなたからは扱いたい点の輪郭までは見えにくい状態です。',
  '相手については、距離のあとの間合いだけでは、あなたからは内側の温度までは確かめにくい状態です。',
  '相手については、最初の接点を考える場面では、あなたからは次の動きまでは決めにくい状態です。',
];

const R1_PARTNER_LOOP_UNCERTAINTY =
  '相手については、まだ反応材料が少ないため、あなたからは意味を決めにくい状態です';

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

type AxisAuthoritySlice = {
  readonly overlap: string;
  readonly difference: string;
  readonly perspectiveOne: string;
  readonly perspectiveTwo: string;
  readonly dynamicOutcome: string;
};

const R1_AXIS_AUTHORITY: Readonly<Record<PairAxisId, AxisAuthoritySlice>> = {
  A1: {
    overlap:
      'まだ会話がない状態でも、気持ちの言葉の出方や近づく前の迷いが見えやすいところが重なります。',
    difference:
      'その場で輪郭を決めたいときと、自分の中で整えてから動きたいときに、進め方の違いが表れやすいです。',
    perspectiveOne: '気持ちの輪郭を先に言葉へ置こうとする動きが見えやすい',
    perspectiveTwo: '自分の中で整えてから動きを選びたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A2: {
    overlap:
      'まだ会話がない状態でも、気持ちの言葉の出方の違いが見えやすいところが重なります。',
    difference:
      '気持ちが先に言葉になりやすい傾向と、整えてから動きやすい傾向の差が表れやすいです。',
    perspectiveOne: '気持ちを先に言葉へ置こうとする動きが見えやすい',
    perspectiveTwo: '言葉が整うまで動きを控えたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A3: {
    overlap:
      'まだ会話がない状態でも、気持ちの整理の仕方に近いリズムが見えやすいところが重なります。',
    difference:
      '理由を先に整理したいときと、感覚を先に言葉にしたいときに、順序の違いが表れやすいです。',
    perspectiveOne: '気持ちの順序を先に整えようとする動きが見えやすい',
    perspectiveTwo: '感覚が整うまで動きを控えたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A4: {
    overlap:
      'まだ会話がない状態でも、近づき方の入口を探す動きが見えやすいところが重なります。',
    difference:
      '短い一文から始めたいときと、整えてから動きたいときに、入口の作り方の違いが表れやすいです。',
    perspectiveOne: '短い入口から動きを考え始めやすい',
    perspectiveTwo: '入口の形を整えてから動きを選びたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
};

function axisAuthorityFor(
  pairAxisId: PairAxisId,
  relationStatusId: RelationStatusId,
): AxisAuthoritySlice {
  if (relationStatusId === 'R1') {
    return R1_AXIS_AUTHORITY[pairAxisId];
  }
  return PAIR_AXIS_FREE_RESULT_FRAGMENTS[pairAxisId];
}

function semanticRoles(
  axis: PairAxisId,
  personAUsesFirstPerspective: boolean,
  authority: AxisAuthoritySlice = PAIR_AXIS_FREE_RESULT_FRAGMENTS[axis],
): { first: SemanticRole; second: SemanticRole; personA: string; personB: string } {
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

function actorLabel(
  role: 'A' | 'B',
  viewerIsPersonA: boolean,
): 'あなた' | '相手' {
  if (viewerIsPersonA) {
    return role === 'A' ? 'あなた' : '相手';
  }
  return role === 'A' ? '相手' : 'あなた';
}

function chapterBehaviorPerspective(
  chapterKey: ChapterId,
  role: 'A' | 'B',
  focus: ChapterFocus,
  roles: ReturnType<typeof semanticRoles>,
  viewerIsPersonA: boolean,
): string {
  const label = actorLabel(role, viewerIsPersonA);
  const depth = paidChapterDepthFor(chapterKey);
  const context = depth.trigger;
  const isFirstSemanticRole = role === roles.first.role;
  const action = isFirstSemanticRole ? focus.firstAction : focus.secondAction;
  const readAs = isFirstSemanticRole ? focus.firstReception : focus.secondReception;
  return `${context}、${label}は${actionMotionPhrase(action)}動きが見えやすいことがあります。${label}には、${actionMotionPhrase(readAs)}ことがあります。`;
}

function perspectiveText(
  chapterKey: ChapterId,
  chapterIndex: number,
  role: 'A' | 'B',
  focus: ChapterFocus,
  roles: ReturnType<typeof semanticRoles>,
  relationStatusId: RelationStatusId,
  viewerIsPersonA: boolean,
): string {
  if (relationStatusId === 'R1' && role === 'B') {
    return R1_PARTNER_UNCERTAINTY[chapterIndex]!;
  }
  if (relationStatusId === 'R4' && role === 'B') {
    return R4_PARTNER_UNCERTAINTY[chapterIndex]!;
  }
  if (relationStatusId === 'R5' && role === 'B') {
    return R5_PARTNER_UNCERTAINTY[chapterIndex]!;
  }
  return chapterBehaviorPerspective(chapterKey, role, focus, roles, viewerIsPersonA);
}

const R1_SHARED_PHRASES: Readonly<Record<PairAxisId, readonly [string, string, string, string, string, string]>> = {
  A1: [
    '相手の反応を決めつけず、自分が置きたい言葉の形だけ一つ選ばない？',
    '近づくかどうかは後で決めて、今は短い一文だけ書き留めない？',
    '会話の前に、自分が知りたい一点だけ整理しない？',
    '相手の気持ちより、自分が確認したい一点だけ先に書かない？',
    'まだ言葉にしない前提で、自分が感じていることを一文で書き留めない？',
    '近づく前に、自分が確認したい一点だけ先に整理しない？',
  ],
  A2: [
    '相手の反応を想像する前に、自分が感じていることを一文で書かない？',
    'まだ連絡しない前提で、置きたい言葉の形だけ選ばない？',
    '答えを決めず、自分が知りたい一点だけ書き留めない？',
    '相手の気持ちを決めつけず、短い一文だけ先に整えない？',
    '静けさを拒否の合図と決めつけず、自分の中の一点だけ先に書かない？',
    '近づく前に、負担の小さい一文だけ候補にしない？',
  ],
  A3: [
    '相手の反応を決めつけず、自分が整理したい一点だけ書かない？',
    '近づく前に、自分が確認したい一点だけ先に書き留めない？',
    '会話の前に、負担の小さい一文だけ候補にしない？',
    '相手の気持ちより、自分が感じている距離だけ先に書かない？',
    'まだ会話がない前提で、自分が知りたい一点だけ整理しない？',
    '相手の反応は後で見て、今は短い一文だけ整えない？',
  ],
  A4: [
    '本題の前に、自分が置きたい短い一文だけ選ばない？',
    '相手の反応を想像せず、自分が伝えたい一点だけ書かない？',
    '近づくかどうかは後で決めて、短い一文だけ整えない？',
    '相手の気持ちを決めつけず、自分の中の一点だけ先に書き留めない？',
    'まだ言葉にしない前提で、自分が感じていることを一文で書き留めない？',
    '近づく前に、自分が確認したい一点だけ先に整理しない？',
  ],
};

const R2_SHARED_PHRASES: Readonly<Record<PairAxisId, readonly [string, string, string, string, string, string]>> = {
  A1: [
    'やり取りの速さではなく、次に返しやすい時間だけ一度決めない？',
    '反応の大きさではなく、届いた合図を一つずつ確かめない？',
    'このやり取りは一つだけ扱って、続きの時間を別に決めない？',
    '少し間を置いて、次に短く返す時間だけ決めておかない？',
    '関係の答えより、今日は短く返せる形を一緒に選ばない？',
    'やり取りの量ではなく、今日の温度だけ先に確かめない？',
  ],
  A2: [
    '反応の大きさではなく、届いた合図を一つずつ確かめない？',
    '今すぐ答えなくていいので、返せる時間だけ選んでもらえる？',
    '静かに考える時間と、短い合図の両方を残しておかない？',
    '言葉が少なくても決めつけず、短い接点から続けてみない？',
    '続きの話は後回しにして、短い合図だけ一度交換しない？',
    'やり取りの速さではなく、次に返しやすい時間だけ一度決めない？',
  ],
  A3: [
    '説明を続ける前に、受け取れた部分を一つずつ確かめない？',
    '結論より先に、今いちばん引っかかる一点を聞いてもいい？',
    '落ち着くための間を取り、次に返す時間だけ決めておかない？',
    '続け方を決める前に、負担の小さいやり取りを一度置かない？',
    'やり取りの量ではなく、今日の温度だけ先に確かめない？',
    '短い合図だけ先に交換して、続きの時間は別に決めない？',
  ],
  A4: [
    '本題の前に、二人が入りやすい話の始め方を選ばない？',
    'この場面を話すなら、短い入口から始めてもいい？',
    'いったん間を取り、次の連絡は短い一言からにしない？',
    '大きな話を急がず、短いやり取りから続けてみない？',
    '続きの話は後回しにして、短い合図だけ一度交換しない？',
    'やり取りの速さではなく、今日の温度だけ先に確かめない？',
  ],
};

function chapterPhrase(
  key: ChapterId,
  axis: PairAxisId,
  roles: ReturnType<typeof semanticRoles>,
  relationStatusId: RelationStatusId,
): { speaker: PaidCompatibilityChapter['phraseSpeaker']; text: string } {
  if (relationStatusId === 'R1' || relationStatusId === 'R2') {
    const phrases = relationStatusId === 'R1' ? R1_SHARED_PHRASES : R2_SHARED_PHRASES;
    const phraseIndex = CHAPTER_IDS.indexOf(key);
    return {
      speaker:
        key === 'ch_you_pace'
          ? 'personA'
          : key === 'ch_other_pace'
            ? 'personB'
            : 'either',
      text: phrases[axis][phraseIndex]!,
    };
  }
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

/**
 * ch_about carries the "returning after distance" scene in this report, while the
 * catalog title still names the legacy renderer's disclaimer chapter. Disclaimers
 * live in snapshot.safetyNote, so the reader title must describe the scene it holds.
 */
export const PAID_COMPATIBILITY_CHAPTER_TITLE_OVERRIDES = {
  ch_about: '最初の接点を考える場面',
} as const satisfies Partial<Record<ChapterId, string>>;

const R1_TOPIC_CHAPTER_TITLES: Readonly<Record<PaidTopicId, string>> = {
  T1: '近づき方の入口の違い',
  T2: '安心の取り方の違い',
  T3: '気持ちの言葉の出方の違い',
  T4: '反応の見えなさ',
  T5: '距離の温度差',
};

export const PAID_COMPATIBILITY_R1_TOPIC_DEEP_TITLES = Object.freeze(
  Object.values(R1_TOPIC_CHAPTER_TITLES),
);

export function paidCompatibilityChapterTitle(
  key: ChapterId,
  topicId?: PaidTopicId,
): string {
  const override = (PAID_COMPATIBILITY_CHAPTER_TITLE_OVERRIDES as Partial<
    Record<ChapterId, string>
  >)[key];
  return override ?? getChapterTitle(key, topicId);
}

function chapterTitleForReport(
  key: ChapterId,
  topicId: PaidTopicId,
  relationStatusId: RelationStatusId,
): string {
  if (key === 'ch_topic_deep' && relationStatusId === 'R1') {
    return R1_TOPIC_CHAPTER_TITLES[topicId];
  }
  return paidCompatibilityChapterTitle(key, topicId);
}

export function sceneInteractionIdFor(key: ChapterId): string {
  return `paid-compatibility:${PAID_COMPATIBILITY_REPORT_VERSION}:${key}:scene`;
}

function buildRelationshipLoop(
  focus: ChapterFocus,
  roles: ReturnType<typeof semanticRoles>,
  continuation: string,
  relationStatusId: RelationStatusId,
  viewerIsPersonA: boolean,
  contextTail?: string,
): readonly string[] {
  if (focus.relationshipLoop) {
    const lines = [...focus.relationshipLoop];
    if (contextTail) {
      lines.push(`今は、${contextTail.replace(/。$/u, '')}`);
    }
    return Object.freeze(lines);
  }
  const firstLabel = actorLabel(roles.first.role, viewerIsPersonA);
  const secondLabel = actorLabel(roles.second.role, viewerIsPersonA);
  const partnerLine =
    relationStatusId === 'R4'
      ? `${secondLabel}については、いまの間合いの見え方だけでは内側の動きまでは確かめにくい状態です`
      : relationStatusId === 'R5'
        ? `${secondLabel}が再接近を望んでいるとは限らず、こちらからは間合いの見え方だけを手がかりに読みやすいことがあります`
        : relationStatusId === 'R1'
          ? `${secondLabel}については、まだ反応材料が少ないため、意味を決めにくい状態です`
          : `${secondLabel}には、${focus.secondAction}パターンに見えることがあります`;
  const lines = [
    `${firstLabel}から見ると、${actionMotionPhrase(focus.firstAction)}動きが見えやすいことがあります`,
    `${secondLabel}の反応がまだ見えにくい場合、${focus.secondReception}`,
    partnerLine,
    `${firstLabel}から見ると、${focus.firstReception}`,
    `二人の間では、${continuation.endsWith('見えやすい') ? continuation : `${continuation}傾向が見えやすい`}ことがあります`,
  ];
  if (contextTail) {
    lines.push(`今は、${contextTail.replace(/。$/u, '')}`);
  }
  return Object.freeze(lines);
}

const R1_NO_CONTACT_RESET: readonly string[] = Object.freeze([
  '相手の反応を決めつけず、自分が確認したい一点だけを書き留める',
  '近づくかどうかは、そのあとで改めて選ぶ',
  '小さな接点を置くなら、相手に負担の少ない形だけを候補にする',
]);

const STAGE_CHAPTER_FOCUS: Partial<
  Record<RelationStatusId, Partial<Record<ChapterId, ChapterFocus>>>
> = {
  R1: {
    ch_you_pace: {
      scene: 'まだ会話がない状態で、自分の気持ちの出し方を考える場面',
      firstAction: '相手に近づく前に、自分の気持ちを言葉にしようとする',
      secondReception: '関心のなさのように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手の反応が見えないこと自体が、距離の合図のように受け取られる可能性がある',
      continuation: '想像と実際の距離の差が、気持ちの重さを増やしやすい',
      resetSteps: R1_NO_CONTACT_RESET,
      experimentAction: '相手の反応を想像する前に、自分が言いたい一点を一文で書く',
      reflectionQuestion: 'まだ会話がないとき、自分の中で何が一番引っかかっただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、相手に近づく前に自分の気持ちを言葉にしようとする動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、Aには関心のなさのように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手の反応が見えないこと自体が距離の合図のように受け取られる可能性があります',
        '二人の間では、想像と実際の距離の差が、気持ちの重さを増やしやすい傾向が見えます',
      ]),
    },
    ch_other_pace: {
      scene: 'まだやり取りがなく、相手の反応が見えない場面',
      firstAction: '相手の様子を想像して、自分の気持ちを確かめようとする',
      secondReception: '自分だけが考えているように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手の反応が見えないこと自体が、拒否のように受け取られる可能性がある',
      continuation: '想像と実際の距離の差が、気持ちの重さを増やしやすい',
      resetSteps: R1_NO_CONTACT_RESET,
      experimentAction: '相手の反応を想像する前に、自分が知りたい一点を一文で書く',
      reflectionQuestion: '相手の反応が見えないとき、自分の中で何が一番重く感じられただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、相手の様子を想像しながら自分の気持ちを確かめようとする動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、自分だけが考えているように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手の反応が見えないこと自体が拒否のように受け取られる可能性があります',
        '二人の間では、想像と実際の距離の差が、気持ちの重さを増やしやすい傾向が見えます',
      ]),
    },
    ch_pair_gap: {
      scene: 'まだ会話が始まっていない場面で、近づくかどうかを考えるとき',
      firstAction: '相手の反応を想像して、自分の気持ちを整理しようとする',
      secondReception: '自分だけが動こうとしているように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手の反応が見えないこと自体が、拒否のように受け取られる可能性がある',
      continuation: '想像と実際の距離の差が、気持ちの重さを増やしやすい',
      resetSteps: R1_NO_CONTACT_RESET,
      experimentAction: '相手の反応を想像する前に、自分が知りたい一点を一文で書く',
      reflectionQuestion: '相手の反応が見えないとき、自分の中で何が一番重く感じられただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、相手の反応を想像しながら自分の気持ちを整理しようとする動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、自分だけが動こうとしているように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手の反応が見えないこと自体が拒否のように受け取られる可能性があります',
        '二人の間では、想像と実際の距離の差が、気持ちの重さを増やしやすい傾向が見えます',
      ]),
    },
    ch_topic_deep: {
      scene: 'まだ会話がない状態で、気になる点を自分の中で整理する場面',
      firstAction: '気になる点を、相手に伝える前に言葉へ置こうとする',
      secondReception: '自分だけが整理しているように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手が動いていないことが、話題を避けたように受け取られる可能性がある',
      continuation: '整理の速さと、相手の反応の見えなさが重なりやすい',
      resetSteps: Object.freeze([
        '相手の反応を決めつけず、自分が整理したい一点だけを書き留める',
        '伝えるかどうかは、そのあとで改めて選ぶ',
        '小さな接点を置くなら、短い一文から始める形だけを候補にする',
      ]),
      experimentAction: '相手に伝える前に、自分が整理したい一点を一文で書く',
      reflectionQuestion: 'まだ会話がないとき、何を一番知りたかっただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、気になる点を相手に伝える前に言葉へ置こうとする動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、自分だけが整理しているように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手が動いていないことが話題を避けたように受け取られる可能性があります',
        '二人の間では、整理の速さと相手の反応の見えなさが重なりやすい傾向が見えます',
      ]),
    },
    ch_today_clue: {
      scene: 'まだ会話がないのに、距離や気持ちの重さを感じる場面',
      firstAction: '相手の様子を想像して、自分の気持ちを整理しようとする',
      secondReception: '自分だけが考えているように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手の反応が見えないこと自体が、距離の合図のように受け取られる可能性がある',
      continuation: '想像と実際の距離の差が、気持ちの重さを増やしやすい',
      resetSteps: R1_NO_CONTACT_RESET,
      experimentAction: '相手の反応を想像する前に、自分が感じている距離を一文で書く',
      reflectionQuestion: '会話がなくても感じた距離は、何を整えたかった時間だっただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、相手の様子を想像しながら自分の気持ちを整理しようとする動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、自分だけが考えているように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手の反応が見えないこと自体が距離の合図のように受け取られる可能性があります',
        '二人の間では、想像と実際の距離の差が、気持ちの重さを増やしやすい傾向が見えます',
      ]),
    },
    ch_about: {
      scene: 'まだ会話がない状態で、最初の接点を考える場面',
      firstAction: 'どんな言葉で始めるかを、何度も考え直す',
      secondReception: '始め方だけを探しているように見えやすい',
      secondAction: '動きを止めたい',
      firstReception: '相手が動いていないことが、関心のなさのように受け取られる可能性がある',
      continuation: '始め方の迷いと、相手の反応の見えなさが重なりやすい',
      resetSteps: Object.freeze([
        '相手の気持ちを決めつけず、自分が置きたい接点の形だけを一つ選ぶ',
        '大きな意味を求めず、短い一言から始められる形だけを候補にする',
        '相手の反応は、そのあとで見る',
      ]),
      experimentAction: '相手の反応を想像せず、自分が置ける最小の接点を一つ書き留める',
      reflectionQuestion: '最初の接点で、何を確認したかっただろう？',
      relationshipLoop: Object.freeze([
        'あなたから見ると、どんな言葉で始めるかを何度も考え直す動きが見えやすいことがあります',
        '相手の反応がまだ見えにくい場合、始め方だけを探しているように見えやすいことがあります',
        R1_PARTNER_LOOP_UNCERTAINTY,
        'あなたには、相手が動いていないことが関心のなさのように受け取られる可能性があります',
        '二人の間では、始め方の迷いと相手の反応の見えなさが重なりやすい傾向が見えます',
      ]),
    },
  },
  R2: {
    ch_you_pace: {
      scene: 'やり取りのリズムを整えようとする場面',
      firstAction: '次の連絡のタイミングを先に置こうとする',
      secondReception: 'まだ整っていないところへ話が進んだように見える',
      secondAction: '返す前に言葉を整える時間を取りたい',
      firstReception: '関心が薄いか、やり取りが止まったように見えやすい',
      continuation: '連絡の速さと、返す前の整え方が別々に強まりやすい',
      resetSteps: Object.freeze([
        'どちらかが、結論ではなく「いつ返すか」だけを短く伝える',
        'もう一方が、返せる時刻か日だけを短く返す',
        '決めた時刻までは、返事の意味を推測せずに置いておく',
      ]),
      experimentAction: '結論の代わりに、返す時間だけを一つ決める',
      reflectionQuestion: 'やり取りの速さの意味を、二人は同じように受け取っていただろうか？',
    },
    ch_other_pace: {
      scene: '連絡のあと、相手の反応がまだ見えにくい場面',
      firstAction: '受け取った合図を早めに確かめようとする',
      secondReception: '考えている途中に反応を求められたように見える',
      secondAction: '言葉を選ぶために表の反応を小さくする',
      firstReception: 'やり取りが届いていないか、避けられたように見えやすい',
      continuation: '確認する量と静かに考える時間が互いに増えやすい',
      resetSteps: Object.freeze([
        'どちらかが「受け取った合図だけ欲しい」と短く伝える',
        'もう一方が、答えではなく受け取ったことだけを返す',
        '続きのやり取りは、二人が扱える時間を改めて選ぶ',
      ]),
      experimentAction: '答えの前に「読んだ」「聞いた」の合図だけを一度返す',
      reflectionQuestion: '反応の量ではなく、受け取った合図として見えたものは何だっただろう？',
    },
    ch_pair_gap: {
      scene: 'やり取りの中で、言葉の置き方やタイミングがずれてきた場面',
      firstAction: '相手の反応を確かめようとする',
      secondReception: 'まだ整っていないところへ話が進んだように見える',
      secondAction: '返事を整えるために間を取りたい',
      firstReception: '関心が薄いか、やり取りが止まったように見えやすい',
      continuation: '確認する動きと、整える時間が別々に強まりやすい',
      resetSteps: Object.freeze([
        'どちらかが、相手の意図を一文で確認する',
        'もう一方が、合っている部分だけを先に返す',
        '違っていた部分は、一つだけ選んで話し直す',
      ]),
      experimentAction: '意見を返す前に、相手の意図を一文で確認する',
      reflectionQuestion: 'やり取りの中で、何を確かめたかっただろう？',
    },
    ch_topic_deep: {
      scene: '気になる点を、やり取りの中で扱おうとする場面',
      firstAction: '気になる点を早めに言葉へ置こうとする',
      secondReception: 'まだ輪郭のないことに答えを求められたように見える',
      secondAction: '場面を見直すために反応を控えたい',
      firstReception: '話題そのものを避けられたように見えやすい',
      continuation: '話題へ入る速さの差が、気持ちの差に見えやすい',
      resetSteps: Object.freeze([
        'どちらかが、扱いたい場面を一つだけ挙げる',
        'もう一方が、今話せるか、別の時間がよいかを選ぶ',
        '話す場合も、最初の十分で扱う一点を決める',
      ]),
      experimentAction: '扱う場面を一つに絞り、話せる時間を先に確かめる',
      reflectionQuestion: '話題の重さではなく、入口の作り方で変わったことはあっただろうか？',
    },
    ch_today_clue: {
      scene: 'やり取りのあと、少し間合いを感じる場面',
      firstAction: '今の温度を確かめるために接点を増やそうとする',
      secondReception: '落ち着くための間が狭くなったように見える',
      secondAction: '自分のペースを戻すために接点を減らしたい',
      firstReception: '距離がさらに広がる合図のように見えやすい',
      continuation: '近づいて確かめる動きと、離れて整える動きが続きやすい',
      resetSteps: Object.freeze([
        'どちらかが、必要な間の長さを大まかに伝える',
        'もう一方が、その間に必要な連絡だけを一つ確認する',
        '二十四時間から四十八時間以内に、短い接点を置く',
      ]),
      experimentAction: '離れる前に、次に短く連絡する時間だけを決める',
      reflectionQuestion: '間合いを感じたとき、それぞれ何を整えたかっただろう？',
    },
    ch_about: {
      scene: 'やり取りが途切れたあと、次の接点を考える場面',
      firstAction: '次の連絡の形を確かめてから動こうとする',
      secondReception: '大きな答えを求められたように見える',
      secondAction: '負担の小さい短い接点から続けたい',
      firstReception: '大切な話を避けたまま進めるように見えやすい',
      continuation: '次の接点の形と、短いやり取りの選び方が別々に求められやすい',
      resetSteps: Object.freeze([
        'どちらかが、結論ではなく短い接点を提案する',
        'もう一方が、応じられる形や時間だけを返す',
        '続けるかどうかは、その一回のあとで改めて選ぶ',
      ]),
      experimentAction: '答えを決めず、十分ほどの短いやり取りを一度だけ置く',
      reflectionQuestion: '大きな答えを出さずに続けられた接点は、どんな形だっただろう？',
    },
  },
  R4: {
    ch_you_pace: {
      scene: '距離が感じられる中で、次の動きを考える場面',
      firstAction: '今の間合いを確かめようとする',
      secondReception: '距離の理由を一つに決められたように見える',
      secondAction: '負担の小さい間合いを保ちたい',
      firstReception: '急いで近づこうとしているように見えやすい',
      continuation: '間合いの確認と、距離の理由を決めない動きが別々に強まりやすい',
      resetSteps: Object.freeze([
        '距離の理由を決めつけず、今扱いたい一点だけを挙げる',
        'もう一方が、応じられる形や時間だけを返す',
        '続けるかどうかは、そのあとで改めて選ぶ',
      ]),
      experimentAction: '距離の理由を決めず、自分が整えたい一点を一文で書く',
      reflectionQuestion: '今の距離を、それぞれ何のために置いていただろう？',
    },
    ch_other_pace: {
      scene: '連絡が少ない場面で、相手の反応がまだ見えないとき',
      firstAction: '短い合図を先に置こうとする',
      secondReception: '急いで距離を縮めようとされたように見える',
      secondAction: '返す前に間合いを整える時間を取りたい',
      firstReception: '関心が薄いか、距離が広がる合図のように見えやすい',
      continuation: '合図を求める動きと、間合いを整える時間が別々に強まりやすい',
      resetSteps: Object.freeze([
        'どちらかが、答えではなく受け取った合図だけを短く伝える',
        'もう一方が、返せる時間だけを短く返す',
        '距離の理由を決めず、短い接点だけを置く',
      ]),
      experimentAction: '答えの前に「読んだ」「聞いた」の合図だけを一度返す',
      reflectionQuestion: '反応の量ではなく、受け取った合図として見えたものは何だっただろう？',
    },
    ch_pair_gap: {
      scene: '距離がある中で、言葉の置き方やタイミングがずれてきた場面',
      firstAction: '今の間合いを言葉で確かめようとする',
      secondReception: '距離の理由を一つに決められたように見える',
      secondAction: '返事を整えるために間を取りたい',
      firstReception: '大切な話を避けたまま距離を置くように見えやすい',
      continuation: '間合いの確認と、言葉を整える時間が別々に強まりやすい',
      resetSteps: Object.freeze([
        '距離の理由を決めつけず、今扱いたい一点だけを挙げる',
        'もう一方が、応じられる形や時間だけを返す',
        '違っていた部分は、一つだけ選んで話し直す',
      ]),
      experimentAction: '意見を返す前に、相手の意図を一文で確認する',
      reflectionQuestion: '距離の理由を決めずに、何を確かめたかっただろう？',
    },
    ch_topic_deep: {
      scene: '距離がある中で、気になる点を扱おうとする場面',
      firstAction: '気になる点を早めに言葉へ置こうとする',
      secondReception: 'まだ輪郭のないことに答えを求められたように見える',
      secondAction: '場面を見直すために反応を控えたい',
      firstReception: '話題そのものを避けられたように見えやすい',
      continuation: '話題へ入る速さの差が、距離の意味の差に見えやすい',
      resetSteps: Object.freeze([
        'どちらかが、扱いたい場面を一つだけ挙げる',
        'もう一方が、今話せるか、別の時間がよいかを選ぶ',
        '話す場合も、最初の十分で扱う一点を決める',
      ]),
      experimentAction: '扱う場面を一つに絞り、話せる時間を先に確かめる',
      reflectionQuestion: '話題の重さではなく、入口の作り方で変わったことはあっただろうか？',
    },
    ch_about: {
      scene: '距離が続いている状態で、今の間合いを整える場面',
      firstAction: '距離の意味を確かめようとする',
      secondReception: '距離の理由を一つに決められたように見える',
      secondAction: '負担の小さい間合いを保ちたい',
      firstReception: '大切な話を避けたまま距離を置くように見えやすい',
      continuation: '距離の意味の確認と、今の間合いの整え方が別々に求められやすい',
      resetSteps: Object.freeze([
        '距離の理由を決めつけず、今扱いたい一点だけを挙げる',
        'もう一方が、応じられる形や時間だけを返す',
        '続けるかどうかは、そのあとで改めて選ぶ',
      ]),
      experimentAction: '距離の理由を決めつけず、自分が整えたい一点を一文で書く',
      reflectionQuestion: '今の距離を、それぞれ何のために置いていただろう？',
    },
    ch_today_clue: {
      scene: '距離が感じられる場面で、間合いを扱おうとする場面',
      firstAction: '今の温度を確かめるために接点を増やそうとする',
      secondReception: '落ち着くための間が狭くなったように見える',
      secondAction: '自分のペースを戻すために接点を減らしたい',
      firstReception: '距離がさらに広がる合図のように見えやすい',
      continuation: '近づいて確かめる動きと、離れて整える動きが続きやすい',
      resetSteps: Object.freeze([
        'どちらかが、必要な間の長さを大まかに伝える',
        'もう一方が、その間に必要な連絡だけを一つ確認する',
        '距離の理由を決めず、短い接点だけを置く',
      ]),
      experimentAction: '距離の理由を決めず、次に短く連絡する時間だけを決める',
      reflectionQuestion: '距離を置くことは、二人にとってそれぞれ何を整える時間だっただろう？',
    },
  },
  R5: {
    ch_you_pace: {
      scene: 'もう一度近づくことを考える場面で、次の動きを整えるとき',
      firstAction: '再接近のタイミングを先に置こうとする',
      secondReception: '急いで近づかれたように見える',
      secondAction: '小さな接点から始めたい',
      firstReception: '大きな意味を求められたように見えやすい',
      continuation: '再接近の速さと、小さな接点の選び方が別々に強まりやすい',
      resetSteps: Object.freeze([
        '関係の結論ではなく、短い接点を一つ提案する',
        '相手が応じられる形や時間だけを返してもらう',
        '続けるかどうかは、その一回のあとで改めて選ぶ',
      ]),
      experimentAction: '答えを決めず、短い一言から始める形を一つ選ぶ',
      reflectionQuestion: '再接近の前に、何を一番確認したかっただろう？',
    },
    ch_other_pace: {
      scene: '再び連絡する前の場面で、相手の反応がまだ見えないとき',
      firstAction: '小さな合図を先に置こうとする',
      secondReception: '急いで近づかれたように見える',
      secondAction: '返す前に間合いを整える時間を取りたい',
      firstReception: '大きな答えを求められたように見えやすい',
      continuation: '合図を求める動きと、間合いを整える時間が別々に強まりやすい',
      resetSteps: Object.freeze([
        'どちらかが、答えではなく受け取った合図だけを短く伝える',
        'もう一方が、返せる時間だけを短く返す',
        '続けるかどうかは、その一回のあとで改めて選ぶ',
      ]),
      experimentAction: '答えの前に「読んだ」「聞いた」の合図だけを一度返す',
      reflectionQuestion: '再接近の最初の接点で、何を確認したかっただろう？',
    },
    ch_pair_gap: {
      scene: '近づき方がずれてきた場面で、言葉の置き方を整えるとき',
      firstAction: '再接近の意図を言葉で確かめようとする',
      secondReception: '大きな答えを求められたように見える',
      secondAction: '小さな接点から戻りたい',
      firstReception: '急いで関係の意味を決めようとしているように見えやすい',
      continuation: '再接近の意図と、小さな接点の選び方がずれやすい',
      resetSteps: Object.freeze([
        '関係の結論ではなく、短い接点を一つ提案する',
        '相手が応じられる形や時間だけを返してもらう',
        '違っていた部分は、一つだけ選んで話し直す',
      ]),
      experimentAction: '意見を返す前に、相手の意図を一文で確認する',
      reflectionQuestion: '近づき方のずれについて、何を確かめたかっただろう？',
    },
    ch_topic_deep: {
      scene: 'もう一度近づく前に、気になる点を扱おうとする場面',
      firstAction: '気になる点を早めに言葉へ置こうとする',
      secondReception: 'まだ輪郭のないことに答えを求められたように見える',
      secondAction: '小さな接点から始めたい',
      firstReception: '大きな話を避けられたように見えやすい',
      continuation: '話題へ入る速さの差が、再接近の速さの差に見えやすい',
      resetSteps: Object.freeze([
        'どちらかが、扱いたい場面を一つだけ挙げる',
        'もう一方が、今話せるか、別の時間がよいかを選ぶ',
        '話す場合も、最初の十分で扱う一点を決める',
      ]),
      experimentAction: '扱う場面を一つに絞り、話せる時間を先に確かめる',
      reflectionQuestion: '再接近の前に、何を一番整理したかっただろう？',
    },
    ch_about: {
      scene: '距離ができたあと、もう一度近づく最初の接点を考える場面',
      firstAction: '戻る意味を確かめてから、小さな接点を探そうとする',
      secondReception: '大きな答えを求められたように見える',
      secondAction: '負担の小さい接点から戻りたい',
      firstReception: '大切な話を避けたまま進めるように見えやすい',
      continuation: '再接近の意図と、小さな接点の選び方が別々に求められやすい',
      resetSteps: Object.freeze([
        '関係の結論ではなく、短い接点を一つ提案する',
        '相手が応じられる形や時間だけを返してもらう',
        '続けるかどうかは、その一回のあとで改めて選ぶ',
      ]),
      experimentAction: '答えを決めず、十分ほどの短いやり取りを一度だけ置く',
      reflectionQuestion: '再接近の最初の接点で、何を確認したかっただろう？',
    },
    ch_today_clue: {
      scene: '距離のあと、もう一度近づく前の間合いを感じる場面',
      firstAction: '再接近のタイミングを確かめようとする',
      secondReception: '急いで近づかれたように見える',
      secondAction: '小さな接点から始めたい',
      firstReception: '大きな意味を求められたように見えやすい',
      continuation: '再接近の速さと、小さな接点の選び方がずれやすい',
      resetSteps: Object.freeze([
        '関係の結論ではなく、短い接点を一つ提案する',
        '相手が応じられる形や時間だけを返してもらう',
        '続けるかどうかは、その一回のあとで改めて選ぶ',
      ]),
      experimentAction: '答えを決めず、短い一言から始める形を一つ選ぶ',
      reflectionQuestion: '再接近の前に、何を一番確認したかっただろう？',
    },
  },
};

function chapterFocusFor(
  key: ChapterId,
  relationStatusId: RelationStatusId,
): ChapterFocus {
  const stageOverride = STAGE_CHAPTER_FOCUS[relationStatusId]?.[key];
  if (stageOverride) return stageOverride;
  return CHAPTER_FOCUS[key];
}

function buildChapter(
  key: ChapterId,
  index: number,
  input: PaidCompatibilityReportInput,
  roles: ReturnType<typeof semanticRoles>,
  pair: PairCanonicalProfileV2 | null,
): PaidCompatibilityChapter {
  const focus = chapterFocusFor(key, input.relationStatusId);
  const topicLabel = getTopicLabel(input.paidTopicId);
  const topicAction = TOPIC_IMMEDIATE_ACTIONS[input.paidTopicId];
  const phrase = chapterPhrase(key, input.pairAxisId, roles, input.relationStatusId);
  const skipContextVariation =
    input.relationStatusId === 'R1' ||
    input.relationStatusId === 'R2' ||
    input.relationStatusId === 'R4' ||
    input.relationStatusId === 'R5';
  const contextVariation =
    skipContextVariation
      ? null
      : input.currentContextV2
      ? buildCompatibilityCurrentContextChapterVariationV2(
        key,
        input.currentContextV2,
        input.relationStatusId,
      )
      : input.currentContext
        ? buildCompatibilityCurrentContextChapterVariation(
          key,
          bodyAnswersFromCurrentContext(input.currentContext),
        )
        : null;
  const topicScene = key === 'ch_topic_deep'
    ? input.relationStatusId === 'R1'
      ? `${focus.scene}。ここでは、気になる点の入口から見ます`
      : `${focus.scene}。ここでは「${topicLabel}」に場面を絞ります`
    : focus.scene;
  const chapterDepth = paidChapterDepthFor(key);
  const personA = perspectiveText(
    key,
    index,
    'A',
    focus,
    roles,
    input.relationStatusId,
    input.personAUsesFirstPerspective,
  );
  const personB = perspectiveText(
    key,
    index,
    'B',
    focus,
    roles,
    input.relationStatusId,
    input.personAUsesFirstPerspective,
  );
  const smallExperiment = [
    `今週、${focus.scene}で、${focus.experimentAction}。`,
    chapterDepth.experimentClosing,
  ].join('');
  const contextualPhrase = contextVariation?.usablePhrase
    ? `${phrase.text.split('、')[0]?.replace(/[？。]$/u, '') ?? phrase.text}、${contextVariation.usablePhrase}`
    : phrase.text;

  const relationshipLoop = buildRelationshipLoop(
    focus,
    roles,
    focus.continuation,
    input.relationStatusId,
    input.personAUsesFirstPerspective,
    contextVariation?.relationshipLoopTail ?? undefined,
  );
  const enrichedLoop = formatPaidChapterDepthNarrative(key, relationshipLoop);

  return Object.freeze({
    key,
    number: index + 1,
    title: chapterTitleForReport(key, input.paidTopicId, input.relationStatusId),
    scene: contextVariation?.sceneSuffix
      ? `${topicScene}。${contextVariation.sceneSuffix}`
      : topicScene,
    personAPerspective: personA,
    personBPerspective: personB,
    relationshipLoop: enrichedLoop,
    resetSteps: Object.freeze([...focus.resetSteps]),
    phraseSpeaker: phrase.speaker,
    usablePhrase: contextualPhrase,
    smallExperiment: contextVariation?.smallExperiment ?? smallExperiment,
    reflectionQuestion:
      contextVariation?.reflectionQuestion ?? focus.reflectionQuestion,
    sceneInteractionId: sceneInteractionIdFor(key),
  });
}

export function buildPaidCompatibilityReportV1(
  input: PaidCompatibilityReportInput,
): PaidCompatibilityReportSnapshot {
  const pair =
    input.personABirthDate && input.personBBirthDate
      ? resolvePairCanonicalProfileV2({
          personABirthDate: input.personABirthDate,
          personBBirthDate: input.personBBirthDate,
        })
      : null;
  const authority = axisAuthorityFor(input.pairAxisId, input.relationStatusId);
  const roles = semanticRoles(input.pairAxisId, input.personAUsesFirstPerspective, authority);
  const chapters = CHAPTER_IDS.map((key, index) =>
    buildChapter(key, index, input, roles, pair),
  );
  const currentContext = input.currentContextV2
    ? buildCompatibilityCurrentContextDisplayV2(
      input.currentContextV2,
      input.relationStatusId,
    )
    : input.currentContext
      ? buildCompatibilityCurrentContextDisplay(input.currentContext)
      : undefined;
  const highlightedChapterKeys = currentContext?.highlightedChapterKeys
    ?? Object.freeze([
      'ch_pair_gap',
      'ch_topic_deep',
    ] satisfies ChapterId[]);

  return Object.freeze({
    version: PAID_COMPATIBILITY_REPORT_VERSION,
    reportTitle: '二人の相性レポート',
    relationshipSummary: [
      '六つの場面に分けて読むと、',
      authority.difference,
      `二人の間では、${authority.dynamicOutcome}。`,
      `${temperatureContextFor(input.relationStatusId, input.temperatureId)}ことが、各章の入口です。`,
    ].join(''),
    sharedFoundation: authority.overlap,
    differentFoundation: authority.difference,
    recurringLoop: currentContext
      ? currentContext.relationshipLoop
      : `二人の間では、${authority.dynamicOutcome}。`,
    highlightedChapterKeys,
    ...(currentContext ? { currentContext } : {}),
    chapters: Object.freeze(chapters),
    safetyNote:
      'このレポートは、関係や相手の気持ち、これからの結果を決めるものではありません。対話を続けるかどうかも、それぞれが選べます。恐怖や暴力、強制がある場合は、このレポートより安全の確保を優先してください。',
  });
}
