/**
 * Per-chapter paid depth components — distinct scene/trigger/loop/handling per chapter key.
 * Shared A/B baseline lives in sharedFoundation; chapters add WHY/WHEN/HOW.
 *
 * Fragment contract: misread, failureCondition, handlingGuidance, successSignal, and
 * experimentClosing are complete Japanese sentences (ending with 。).
 * CHAPTER_NARRATIVE formatters emit them verbatim — no appended predicate tails.
 */

import type { ChapterId, RelationStatusId } from './pairReadingTypes';

export type PaidChapterDepthV1 = {
  readonly chapterQuestion: string;
  readonly trigger: string;
  readonly misread: string;
  readonly failureCondition: string;
  readonly handlingGuidance: string;
  readonly successSignal: string;
  readonly experimentClosing: string;
};

const DEPTH: Readonly<Record<ChapterId, PaidChapterDepthV1>> = {
  ch_you_pace: {
    chapterQuestion: 'あなたが先に動こうとするとき、相手はどう受け取る？',
    trigger: '次の予定や返事のタイミングを決める直前',
    misread: 'ここで起きやすい誤読は、あなたが先に動くと、相手からは返事を急かされているように見えることがあります。',
    failureCondition: '返事の速さだけで関心の有無を決めてしまうと、意味づけが早くなりやすい。',
    handlingGuidance: '結論の前に「いつ返せるか」だけ先に伝える。',
    successSignal: 'そのあと、読んだ合図だけ返ってくるかどうかを見る。',
    experimentClosing: '返事の速さだけで関心の有無を決めず、一回だけ試す。',
  },
  ch_other_pace: {
    chapterQuestion: '相手の反応が見えないとき、あなたは何を確かめたくなる？',
    trigger: '連絡のあと、相手の返事がまだ来ない時間',
    misread: '誤読の入口は、相手の静けさを拒否と読みやすい。',
    failureCondition: '返事がない時間を、関係の終わりと決めてしまうと、読み取りが一方向に寄りやすい。',
    handlingGuidance: '答えを求めず、読んだ合図だけ返してもらう。',
    successSignal: '短い合図だけ先に返り、本題はあとで続けられる余白が残る。',
    experimentClosing: '答えの前に合図だけ一度返せたかを見る。',
  },
  ch_pair_gap: {
    chapterQuestion: '言葉の置き方がずれたとき、どちらが先に詰まる？',
    trigger: '同じ話題で、言い方や間の取り方がずれた場面',
    misread: '見落としやすい誤読は、確認を重ねるほど、相手からは答えを迫られているように見えることがあります。',
    failureCondition: '違いを一つの正解にまとめようとすると、会話が止まりやすい。',
    handlingGuidance: '合っている部分だけ先に返し、違う部分は一つに絞る。',
    successSignal: '短い確認のあと、会話が同じ温度で続く。',
    experimentClosing: '確認のあと、会話が同じ温度で続いたかを見る。',
  },
  ch_topic_deep: {
    chapterQuestion: 'いまの話題で、何を先に確かめたい？',
    trigger: '気になる点が出たが、まだ言葉になっていない場面',
    misread: 'あなたの整理が、相手には詰問に見えやすい。',
    failureCondition: '答えを急ぎ、話題の入口を広げすぎると、扱う点が散りやすい。',
    handlingGuidance: '一つだけ選んで、意図を一文で確認する。',
    successSignal: '相手が意図を言い直し、会話の焦点が戻る。',
    experimentClosing: '入口を一つに絞ったあと、焦点が戻ったかを見る。',
  },
  ch_today_clue: {
    chapterQuestion: '今日のやり取りで、何が引っかかった？',
    trigger: '会話は続いたのに、あとから重さが残る夜',
    misread: '今日の誤読は、短い返事を、冷たさのサインだと受け取りやすくなります。',
    failureCondition: '今日の温度だけで、これからを決めてしまうと、一点が見えにくくなる。',
    handlingGuidance: '今日の一点だけメモし、明日の入口を小さく残す。',
    successSignal: '次の連絡で、昨日の一点だけ短く触れられる。',
    experimentClosing: '明日の入口に、昨日の一点だけ触れられたかを見る。',
  },
  ch_about: {
    chapterQuestion: '最初の接点で、何を確認したい？',
    trigger: '話しかける言葉を何度も書き直している場面',
    misread: '完璧な一言を待つあまり、接点自体を作れない。',
    failureCondition: '大きな答えを一度に求めると、短い接点を置きにくくなる。',
    handlingGuidance: '短い一言だけ候補にし、反応はあとで見る。',
    successSignal: '小さな接点のあと、次に触れやすい時間だけ決まる。',
    experimentClosing: '短い接点のあと、次の時間だけ決まったかを見る。',
  },
};

const R1_DEPTH: Readonly<Record<ChapterId, PaidChapterDepthV1>> = {
  ch_you_pace: {
    chapterQuestion: 'まだやり取りがなく、自分から先に動こうとするとき、何を確かめたくなる？',
    trigger: 'まだ会話がなく、近づくかどうかを考えている場面',
    misread:
      'ここで起きやすい誤読は、自分だけが先に動こうとしているように見え、相手の反応がまだ見えないこと自体が距離の合図のように受け取られることがあります。',
    failureCondition: '反応の見えなさだけで関心の有無を決めてしまうと、意味づけが早くなりやすい。',
    handlingGuidance: '結論の前に、自分が知りたい一点だけを一文で書き留める。',
    successSignal: 'そのあと、自分の中で置いた意味が一点に絞れたかどうかを見る。',
    experimentClosing: '反応の見えなさだけで関心の有無を決めず、一回だけ試す。',
  },
  ch_other_pace: {
    chapterQuestion: '相手の反応がまだ見えないとき、あなたは何を確かめたくなる？',
    trigger: 'まだやり取りがなく、相手の反応が見えない場面',
    misread: '誤読の入口は、相手の静けさを拒否と読みやすい。',
    failureCondition: '見えない時間を、関係の終わりと決めてしまうと、読み取りが一方向に寄りやすい。',
    handlingGuidance: '意味を一つに決めず、自分が知りたい一点だけを書き留める。',
    successSignal: '自分の中で、一点だけ整理できた余白が残る。',
    experimentClosing: '自分の中で一点だけ整理できたかを見る。',
  },
  ch_pair_gap: {
    chapterQuestion: '近づく前に、言葉の置き方の違いを想像するとき、どこで詰まりやすい？',
    trigger: 'まだ会話が始まっていない場面で、近づくかどうかを考えるとき',
    misread: '見落としやすい誤読は、自分の中だけで差を先に決めてしまうことがあります。',
    failureCondition: '違いを一つの正解にまとめようとすると、自分の中だけで重くなりやすい。',
    handlingGuidance: '自分が知りたい一点だけを、先に一文で書き留める。',
    successSignal: '一点に絞れたあと、自分の中の迷いが少し整理される。',
    experimentClosing: '一点に絞ったあと、自分の中の迷いが整理されたかを見る。',
  },
  ch_topic_deep: {
    chapterQuestion: '気になる点について、何を先に確かめたい？',
    trigger: 'まだ言葉になっていない気になる点を、自分の中で整理する場面',
    misread: '自分の中だけで整理を重ねるほど、一点が広がりやすい。',
    failureCondition: '答えを急ぎ、話題の入口を広げすぎると、扱う点が散りやすい。',
    handlingGuidance: '一つだけ選んで、自分が知りたい一点を一文で書き留める。',
    successSignal: '一点に絞れたあと、自分の中の入口が一つに整う。',
    experimentClosing: '入口を一つに絞ったあと、自分の中が整ったかを見る。',
  },
  ch_today_clue: {
    chapterQuestion: '今の気持ちの重さで、何が引っかかった？',
    trigger: 'まだ会話がないのに、距離や気持ちの重さを感じる場面',
    misread: '今日の誤読は、見えない反応を、冷たさのサインだと受け取りやすくなります。',
    failureCondition: '今の一点だけで、これからを決めてしまうと、見えにくくなる。',
    handlingGuidance: '今の一点だけメモし、自分の中に小さく残す。',
    successSignal: '一点だけ書き留めたあと、自分の中の重さが少し整理される。',
    experimentClosing: '一点だけ書き留めたあと、自分の中の重さが整理されたかを見る。',
  },
  ch_about: {
    chapterQuestion: '最初の接点を考えるとき、何を確認したい？',
    trigger: '話しかける言葉を何度も書き直している場面',
    misread: '完璧な一言を待つあまり、接点自体を作れない。',
    failureCondition: '大きな答えを一度に求めると、短い接点を置きにくくなる。',
    handlingGuidance: '短い一言だけ候補にし、反応はあとで見る。',
    successSignal: '小さな一文を候補にしたあと、次に整えやすい形だけ決まる。',
    experimentClosing: '候補にした一文のあと、整えやすい形だけ決まったかを見る。',
  },
};

function depthFor(key: ChapterId, relationStatusId?: RelationStatusId): PaidChapterDepthV1 {
  if (relationStatusId === 'R1') {
    return R1_DEPTH[key];
  }
  return DEPTH[key];
}

type DepthFormatter = (
  depth: PaidChapterDepthV1,
  relationshipLoop: readonly string[],
) => readonly string[];

const CHAPTER_NARRATIVE: Readonly<Record<ChapterId, DepthFormatter>> = {
  ch_you_pace: (depth, loop) => [
    `${depth.trigger}になると、${depth.chapterQuestion}`,
    loop[0] ?? '',
    depth.misread,
    `${depth.failureCondition}${depth.handlingGuidance}${depth.successSignal}`,
  ],
  ch_other_pace: (depth, loop) => [
    `${depth.trigger}に入ると、${depth.chapterQuestion}`,
    ...(loop.length > 1 ? [loop[1]!] : loop[0] ? [loop[0]] : []),
    depth.misread,
    `${depth.failureCondition}${depth.handlingGuidance}${depth.successSignal}`,
  ],
  ch_pair_gap: (depth, loop) => [
    `${depth.trigger}では、${depth.chapterQuestion}`,
    loop[2] ?? loop[0] ?? '',
    depth.misread,
    `${depth.failureCondition}${depth.handlingGuidance}${depth.successSignal}`,
  ],
  ch_topic_deep: (depth, loop) => [
    `${depth.chapterQuestion} ${depth.trigger}がその入口です。`,
    loop[0] ?? '',
    depth.misread,
    `${depth.handlingGuidance}${depth.successSignal}`,
  ],
  ch_today_clue: (depth, loop) => [
    `${depth.trigger}、${depth.chapterQuestion}`,
    loop[loop.length - 1] ?? loop[0] ?? '',
    depth.misread,
    `${depth.failureCondition}${depth.handlingGuidance}${depth.successSignal}`,
  ],
  ch_about: (depth, loop) => [
    `${depth.trigger}。${depth.chapterQuestion}`,
    loop[0] ?? '',
    depth.misread,
    `${depth.handlingGuidance}${depth.successSignal}`,
  ],
};

export function paidChapterDepthFor(
  key: ChapterId,
  relationStatusId?: RelationStatusId,
): PaidChapterDepthV1 {
  return depthFor(key, relationStatusId);
}

export function formatPaidChapterDepthNarrative(
  key: ChapterId,
  relationshipLoop: readonly string[],
  relationStatusId?: RelationStatusId,
): readonly string[] {
  const depth = depthFor(key, relationStatusId);
  const formatter = CHAPTER_NARRATIVE[key];
  return Object.freeze(
    formatter(depth, relationshipLoop).map((line) => line.trim()).filter((line) => line.length >= 8),
  );
}
