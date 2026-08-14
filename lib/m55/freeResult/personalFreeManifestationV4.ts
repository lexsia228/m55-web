/**
 * Personal Free manifestation v4 — observable behavior from fused birth × answers.
 * V5 patch: customer Japanese and scene individuality only. Engine selection unchanged.
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  ExpressionAxisId,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';

export const PERSONAL_FREE_MANIFESTATION_VERSION = 'personal_free_manifestation_v4' as const;

type ManifestCell = {
  readonly shortJa: string;
  readonly manifestationJa: string;
  readonly beatJa: string;
  readonly sceneWhen: string;
  readonly sceneWhile: string;
};

export type PersonalManifestationV4 = {
  readonly patternId: string;
  readonly axisId: ExpressionAxisId;
  readonly birthTendency: string;
  readonly answerTendency: string;
  readonly manifestationJa: string;
  readonly sceneCandidateJa: string;
  readonly shortJa: string;
  readonly userDidNotDirectlyAnswerThis: true;
  readonly cannotComeFromDobOnlyJa: string;
  readonly cannotComeFromAnswersOnlyJa: string;
};

export type PersonalPrimaryCopyFlag =
  | 'ABSTRACT_MODEL_LANGUAGE'
  | 'GENERIC_BARNUM'
  | 'ANSWER_RESTATEMENT'
  | 'DOB_ONLY_HOROSCOPE'
  | 'UNSUPPORTED_CERTAINTY'
  | 'NO_OBSERVABLE_BEHAVIOR'
  | 'NO_SCENE'
  | 'NO_SURPRISE';

const ABSTRACT_MODEL_LANGUAGE =
  /距離を整え|一定の間隔|接点の入口|基調の寄り|土台では|内側では|土台の接点|基調の速さ|置くつもりが比較|材料が足りなくて|輪郭を掴|比較表|あわせて、/;

const GENERIC_BARNUM = [
  '実は繊細',
  '周囲に気を遣う',
  '自分の時間も必要',
  '安定と変化の両方',
  '考えすぎることがある',
  '人との距離を大事にする',
  '内側では複雑',
  '本当は優しい',
  '一人の時間も必要',
  '時には迷う',
  '変化を求める一方で安定も大切',
] as const;

const SURPRISE_ORDER: readonly ExpressionAxisId[] = [
  'start',
  'decision',
  'distance',
  'change',
  'recovery',
];

const START_MANIFEST: Readonly<
  Record<StartTendency, Readonly<Record<StartTendency, ManifestCell>>>
> = {
  try: {
    try: {
      shortJa: '動いたあとに一人で試作を閉じる',
      manifestationJa:
        '小さく試し始めたあとも、決めたこととしてはまだ閉じていない。動いている人に見られやすいが、実際に確定するのは、一人でやり直したあとです。',
      beatJa: '先に手を出したあとも、一人の時間で試作を閉じ直している。',
      sceneWhen: '新しい仕事を一つ試した夜、ベッドに入る前に',
      sceneWhile: '試作を一人で閉じ直したくなる',
    },
    map: {
      shortJa: '先に動かしてから段取りを描く',
      manifestationJa:
        '先に一つ動かしたあとに、全体の段取りを作り直している。試作している人に見られても、頭の中ではまだ全体が見えていない。',
      beatJa: '一つ動かしたあとで、全体の段取りを描き直している。',
      sceneWhen: '大きな買い物で一つカゴに入れたあと、店の外で',
      sceneWhile: 'カゴの中身から全体の段取りを描き直したくなる',
    },
    ask: {
      shortJa: '動いたあとに見立てを足す',
      manifestationJa:
        '試し始めたあとに、人へ確認を取りに戻る。進んでいるように見られても、見立てを足してから閉じたい。',
      beatJa: '先に動いたあとに、人の見立てを足しに戻っている。',
      sceneWhen: '先に手を出した仕事を、途中で誰かに見てもらいに戻るとき',
      sceneWhile: '途中まで進めた仕事を、人の見立てを足しに戻したくなる',
    },
  },
  map: {
    try: {
      shortJa: '揃える前に手が先に出る',
      manifestationJa:
        '全体を揃えてから動くつもりが、先に小さく手を出している。動きが早い人に見られても、本人の中ではまだ全体が見えていない。',
      beatJa: '揃える前に、小さく手が先に出ている。',
      sceneWhen: '転職や方針の話で、整理し切る前に一つ応募してしまうとき',
      sceneWhile: '揃える前に、小さく手が先に出る',
    },
    map: {
      shortJa: '準備が終わっても候補が残る',
      manifestationJa:
        '段取りを終えたあとも、候補を開き直している。準備ができた人に見られても、決める瞬間だけが残っている。',
      beatJa: '準備が終わったあとも、候補を開き直している。',
      sceneWhen: '準備は終わった書類の前で、提出を押せない夜に',
      sceneWhile: '準備が終わっても、候補を開き直したくなる',
    },
    ask: {
      shortJa: '一人で揃えたあとに見立てを足す',
      manifestationJa:
        '一人で段取りしたあとに、人の見立てを足しにいく。決まってから相談しているように見られても、足りない視点を取りに戻っている。',
      beatJa: '一人で揃えたあとに、人の見立てを足しに戻っている。',
      sceneWhen: '一人で作った段取りを、出す前に誰かへ見せにいくとき',
      sceneWhile: '一人で揃えた段取りを、人に見せに戻したくなる',
    },
  },
  ask: {
    try: {
      shortJa: '相談のあと一人で決める',
      manifestationJa:
        '人に相談しているときには、もう気持ちが決まっているように見られやすい。でも実際には、その場で決めているのではなく、人と話したあと一人になった時間に最終判断を作っている。',
      beatJa: '相談の場では決まったように見えても、最終判断は一人の時間に残る。',
      sceneWhen: '人に相談した帰り道、一人になってから',
      sceneWhile: '相談のあと、一人で最終判断を作りたくなる',
    },
    map: {
      shortJa: '相談のあと一人で並べ直す',
      manifestationJa:
        '相談の場では合わせているように見られやすい。一人になってから候補を並べ直し、そこで初めて方針が固まる。',
      beatJa: '相談の席では合わせ、一人になってから候補を並べ直している。',
      sceneWhen: '打ち合わせのあと、席を外して一人で候補を書き直すとき',
      sceneWhile: '相談のあと、一人で候補を書き直したくなる',
    },
    ask: {
      shortJa: '話したあとの一人の時間で閉じる',
      manifestationJa:
        '人と話しているうちに進んだように見られやすい。実際の決定は、会話が終わったあとの一人の時間に残る。',
      beatJa: '話している最中は進んだように見えても、閉じるのは一人の時間です。',
      sceneWhen: '誰かに頼られて話したあと、帰宅してから決まるとき',
      sceneWhile: '話したあと、帰宅してから決定を閉じたくなる',
    },
  },
};

const DECISION_MANIFEST: Readonly<
  Record<DecisionTendency, Readonly<Record<DecisionTendency, ManifestCell>>>
> = {
  sort: {
    sort: {
      shortJa: '選んだあとも候補の点検が残る',
      manifestationJa:
        '比べて決めたあとに「他も見るべきだった」が残る。選んだ人に見られても、候補の点検は終わっていない。',
      beatJa: '選んだあとも、候補の点検が一人で続いています。',
      sceneWhen: '候補を選んだ直後、相手に伝える前の数十分で',
      sceneWhile: '選んだあとも、候補の点検が残る',
    },
    deadline: {
      shortJa: '比べている途中で区切りに切る',
      manifestationJa:
        '比べている途中で、期限側に切り替わる。締めた人に見られても、頭の中ではまだ並べている。',
      beatJa: '比べている途中で、期限が来ると一気に切っている。',
      sceneWhen: '決断期限が近づいた午後、比べていた候補を一気に切るとき',
      sceneWhile: '比べの途中で、期限が来ると一気に切る',
    },
    wait: {
      shortJa: '比べたあとに一晩置く',
      manifestationJa:
        '比べたあとに、一晩置く。待っている人に見られても、比べは止まっていない。',
      beatJa: '比べたあとに、一晩置く時間が入る。',
      sceneWhen: '候補を並べた夜、返事は翌朝まで持っていくとき',
      sceneWhile: '比べたあとに、一晩置きたくなる',
    },
  },
  deadline: {
    sort: {
      shortJa: '期限が先に立ちつつ並べ直す',
      manifestationJa:
        '「いつまでに」が先に立ちつつ、候補を並べ直している。急いで決めた人に見られても、実際には比べが続いている。',
      beatJa: '期限を意識しながらも、候補を並べ直している。',
      sceneWhen: '期限付きの依頼で、締切は見えつつ候補をまた開くとき',
      sceneWhile: '期限は見えつつ、候補をまた並べ直す',
    },
    deadline: {
      shortJa: '閉じた直後に一人で見直す',
      manifestationJa:
        '区切りで閉じたあとに、途中経過を一人で見直す。決まった人に見られても、締めた直後の再点検が残る。',
      beatJa: '閉じた直後に、一人で途中経過を見直している。',
      sceneWhen: '期限で送った直後、送信ログを一人で見返すとき',
      sceneWhile: '閉じた直後に、一人で見直したくなる',
    },
    wait: {
      shortJa: '締めたあとに置く時間が来る',
      manifestationJa:
        '期限で閉じたあとに「早かったのでは」が残る。決めた人に見られても、置きたかった時間が後から来る。',
      beatJa: '締めたあとに、置きたかった時間が後から来る。',
      sceneWhen: '期限で返した夜、置きたかった時間が後から来るとき',
      sceneWhile: '締めたあとに、置きたかった時間が来る',
    },
  },
  wait: {
    sort: {
      shortJa: '置くつもりが夜には比べ始める',
      manifestationJa:
        '少し置くつもりでいたのに、夜には候補をまた並べ始めている。待っている人に見られても、頭の中では比べが始まっている。',
      beatJa: '置くつもりでいた夜に、候補をまた並べ始めている。',
      sceneWhen: 'まだ期限のない夜、置くつもりが候補を増やし始めるとき',
      sceneWhile: '置くつもりが、夜には候補を増やし始める',
    },
    deadline: {
      shortJa: '置くつもりが区切りで閉じる',
      manifestationJa:
        '置くつもりが、区切りで閉じる。締めた人に見られても、決めたあとに「置く時間が欲しかった」が残る。',
      beatJa: '置くつもりが、区切りが来ると閉じてしまう。',
      sceneWhen: '置くつもりでいた案件を、期限の合図で閉じるとき',
      sceneWhile: '置くつもりが、区切りで閉じてしまう',
    },
    wait: {
      shortJa: '動いて見えても結論は翌朝',
      manifestationJa:
        '動いているように見られても、結論だけは翌朝まで持っていく。決めたこととしては、まだ確定していない。',
      beatJa: '動いて見えても、結論だけは翌朝まで持っていく。',
      sceneWhen: '日中は進んでいるように見えて、結論だけ翌朝に残るとき',
      sceneWhile: '動いて見えても、結論は翌朝まで残る',
    },
  },
};

const DISTANCE_MANIFEST: Readonly<
  Record<DistanceTendency, Readonly<Record<DistanceTendency, ManifestCell>>>
> = {
  close: {
    close: {
      shortJa: '距離を言葉にした直後に言い方をやり直す',
      manifestationJa:
        '会話の中で距離を言葉にした直後に、言い方を一人でやり直している。丁寧に見えるほど、「今さら考え直している」と見られやすい。',
      beatJa: '距離を言葉にした直後に、言い方を一人でやり直している。',
      sceneWhen: '近い人と話した直後、言い方を一人でやり直すとき',
      sceneWhile: '距離を言葉にした直後に、言い方をやり直したくなる',
    },
    middle: {
      shortJa: '会話では合わせて帰宅後に間隔を戻す',
      manifestationJa:
        '会話では合わせているように見られやすい。会ったあとに、返事のタイミングを一人で戻したくなる。',
      beatJa: '会話では合わせ、帰宅してから返事の間隔を戻している。',
      sceneWhen: '会ったあとの帰り道で、返事の間隔を戻したくなるとき',
      sceneWhile: '会ったあと、返事の間隔を一人で戻したくなる',
    },
    solo: {
      shortJa: 'その場では近く、帰宅後に一人で点検する',
      manifestationJa:
        'その場では近い関係を保っているように見られやすい。会食や会議のあと、一人になってから距離を点検している。',
      beatJa: 'その場では近く見えても、帰宅後に一人で距離を点検している。',
      sceneWhen: '会食のあと、一人になった部屋で距離を点検するとき',
      sceneWhile: '会ったあと、一人で距離を点検したくなる',
    },
  },
  middle: {
    close: {
      shortJa: '普段は間を取り、会話では言葉で寄せる',
      manifestationJa:
        '普段は間を取っているのに、会話の中では距離を言葉にしてしまう。丁寧に見える一方、あとから「近づきすぎた」が残る。',
      beatJa: '普段は間を取りつつ、会話では言葉で寄ってしまう。',
      sceneWhen: '普段は間を取っている相手に、会話の途中で距離を言葉にするとき',
      sceneWhile: '会話の途中で、距離を言葉にして寄ってしまう',
    },
    middle: {
      shortJa: '安定して見えるほど迷いを一人で抱える',
      manifestationJa:
        '安定して見えるほど、迷いを一人で抱えたまま連絡だけ続けている。離れていないように見られても、整えは会話の外で起きている。',
      beatJa: '安定して見えるほど、迷いは会話の外で一人で抱えている。',
      sceneWhen: '連絡は続いているのに、整えは一人の時間に残るとき',
      sceneWhile: '連絡は続けつつ、整えは一人の時間に残る',
    },
    solo: {
      shortJa: '連絡は続け、整えは一人の時間に寄る',
      manifestationJa:
        '連絡は続いているように見られやすい。実際の整えは、会ったあとの一人の時間に寄る。',
      beatJa: '連絡は続けつつ、整えは一人の時間に寄っている。',
      sceneWhen: '連絡は返したあと、一人になってから整え直すとき',
      sceneWhile: '連絡のあと、一人で整え直したくなる',
    },
  },
  solo: {
    close: {
      shortJa: 'その場では寄せ、帰宅後に一人の時間が先に立つ',
      manifestationJa:
        '一人で整えてから戻りたいのに、その場では距離を言葉にして合わせている。近い関係を保っているように見られても、帰宅後に一人の時間が先に立つ。',
      beatJa: 'その場では寄せて見せ、帰宅後に一人の時間が先に立つ。',
      sceneWhen: '近い人と合わせたあと、帰宅して一人の時間が先に立つとき',
      sceneWhile: '合わせたあと、帰宅して一人の時間が先に立つ',
    },
    middle: {
      shortJa: '一人で整えたいのに返事の速さだけ合わせる',
      manifestationJa:
        '一人で整えたいのに、返事の速さだけ合わせている。安定して見えるほど、一人の時間が足りていない。',
      beatJa: '一人で整えたいのに、返事の速さだけ合わせてしまう。',
      sceneWhen: '返事は早く返したあと、一人の時間が足りなくなるとき',
      sceneWhile: '返事は合わせつつ、一人の時間が足りなくなる',
    },
    solo: {
      shortJa: '会ったあとに一人で決め方を見直す',
      manifestationJa:
        '会食や会議のあとに一人の時間を先に確保し、そこで「今の決め方でよかったか」を見直している。',
      beatJa: '会ったあとに、一人で決め方を見直している。',
      sceneWhen: '会議のあと、一人の時間を先に取って決め方を見直すとき',
      sceneWhile: '会ったあと、一人で決め方を見直したくなる',
    },
  },
};

const CHANGE_MANIFEST: Readonly<
  Record<ChangeTendency, Readonly<Record<ChangeTendency, ManifestCell>>>
> = {
  observe: {
    observe: {
      shortJa: '動かない人に見えて一日置いてから組み替える',
      manifestationJa:
        '予定が変わった直後は、動かない人に見られやすい。実際には一日様子を見てから組み替える。',
      beatJa: '予定が変わっても、一日置いてから組み替えている。',
      sceneWhen: '予定変更の翌日、ようやく組み替えるとき',
      sceneWhile: '予定が変わっても、一日置いてから組み替える',
    },
    adjust: {
      shortJa: '見定めたいのに細部だけ直し始める',
      manifestationJa:
        '様子を見たいのに、細部だけ直し始めている。直している人に見られても、方針はまだ見定めている。',
      beatJa: '見定めたいのに、細部だけ直し始めている。',
      sceneWhen: '予定が変わった日、方針は置いたまま細部だけ直すとき',
      sceneWhile: '方針は見定めつつ、細部だけ直し始める',
    },
    rebuild: {
      shortJa: '普段は静かで前提が崩れたときだけ組み直す',
      manifestationJa:
        '普段は静かだが、前提が崩れたときだけ予定を一度捨てて組み直す。急な人に見られても、本人の中では「前提が変わった」で一貫している。',
      beatJa: '普段は静かでも、前提が崩れたときだけ大きく組み直す。',
      sceneWhen: '前提が崩れた夜、予定を一度捨てて組み直すとき',
      sceneWhile: '前提が崩れたときだけ、大きく組み直す',
    },
  },
  adjust: {
    observe: {
      shortJa: '直し始めているのに止まって見える',
      manifestationJa:
        '差分を直し始めたいのに、まず止まって見える。止まっている人に見られても、頭の中では直し始めている。',
      beatJa: '止まって見えても、頭の中では直し始めている。',
      sceneWhen: '予定変更の直後、表では止まって見えるとき',
      sceneWhile: '止まって見えても、頭では直し始めている',
    },
    adjust: {
      shortJa: '方針は守ったまま細部だけ直し続ける',
      manifestationJa:
        '大きな方針は守ったまま、細部だけを直し続けている。進んでいるように見られても、点検が終わっていない。',
      beatJa: '方針は守ったまま、細部だけ直し続けている。',
      sceneWhen: '予定の骨は残したまま、細部だけ直し続ける夜',
      sceneWhile: '方針は守ったまま、細部だけ直し続ける',
    },
    rebuild: {
      shortJa: '小さく直している延長で方向転換に見える',
      manifestationJa:
        '小さく直している延長で、周囲には急な方向転換に見える組み直しが入る。本人の中では、継ぎ足しの先にある。',
      beatJa: '小さく直している延長が、周囲には方向転換に見えやすい。',
      sceneWhen: '小さな修正の延長で、周囲には方針転換に見えるとき',
      sceneWhile: '小さな修正の延長が、方向転換に見えやすい',
    },
  },
  rebuild: {
    observe: {
      shortJa: '組み直す前提を一日置いてから出す',
      manifestationJa:
        '組み直したいのに、表では一日置いている。静かに見える一方、前提が変わったことはもう決めている。',
      beatJa: '組み直す前提は決まっていて、表では一日置いている。',
      sceneWhen: '組み直す前提は決めたまま、表では一日置くとき',
      sceneWhile: '組み直す前提は決まっていて、表では一日置く',
    },
    adjust: {
      shortJa: '小さく直している人に見えてやり直すつもり',
      manifestationJa:
        '小さく直している人に見られても、本人は一度やり直すつもりで手を動かしている。',
      beatJa: '小さく直して見えても、本人はやり直すつもりで動かしている。',
      sceneWhen: '差分修正に見えて、本人はやり直しの手を動かしているとき',
      sceneWhile: '小さく直して見えても、やり直すつもりで動かしている',
    },
    rebuild: {
      shortJa: '前提が崩れたときの組み直しが急に見える',
      manifestationJa:
        '予定が崩れたときに、周囲には急な方向転換に見える組み直しが入る。本人の中では「前提が変わったから」で一貫している。',
      beatJa: '予定が崩れたときの組み直しが、周囲には急に見えやすい。',
      sceneWhen: '予定が崩れた夜、周囲には急な組み直しに見えるとき',
      sceneWhile: '予定が崩れたとき、急な組み直しに見えやすい',
    },
  },
};

const RECOVERY_MANIFEST: Readonly<
  Record<RecoveryTendency, Readonly<Record<RecoveryTendency, ManifestCell>>>
> = {
  pause: {
    pause: {
      shortJa: '短い区切りのあとに再点検が残る',
      manifestationJa:
        '短く区切ったあとも、頭の中では同じ件が残っている。休んだ人に見られても、切れ目が取れないと再点検が止まらない。',
      beatJa: '短く休んだあとも、同じ件の再点検が残る。',
      sceneWhen: '疲れた日に短く区切ったあと、同じ件が頭に残るとき',
      sceneWhile: '短い休みのあと、同じ件を再点検したくなる',
    },
    shrink: {
      shortJa: '止めたいのに範囲を減らして戻る',
      manifestationJa:
        '一回止めたいのに、やることの幅を落として戻っている。仕事を減らしている人に見られても、先に欲しいのは短い切れ目である。',
      beatJa: '止めたいのに、件数を落として戻ってしまう。',
      sceneWhen: '疲れた日に件数を落として戻るとき',
      sceneWhile: '止めたいのに、件数を落として戻る',
    },
    scene: {
      shortJa: '休みたいのに場所を変えて戻る',
      manifestationJa:
        '短い休みが先に欲しいのに、場所を変えて戻っている。気分転換している人に見られても、切れ目自体が足りていない。',
      beatJa: '休みたいのに、場所を変えて戻ってしまう。',
      sceneWhen: '疲れた日に場所だけ変えて戻るとき',
      sceneWhile: '休みたいのに、場所を変えて戻る',
    },
  },
  shrink: {
    pause: {
      shortJa: '休んでいる人に見えて幅を絞りたい',
      manifestationJa:
        '休んでいるように見られても、やることの幅を絞りたい。止まっている時間が、実は範囲の見直しになっている。',
      beatJa: '休んで見えても、実際は範囲を絞っている。',
      sceneWhen: '止まって見える時間が、実は範囲の見直しになっているとき',
      sceneWhile: '休んで見えても、範囲を絞っている',
    },
    shrink: {
      shortJa: '広げたままだと手が止まる',
      manifestationJa:
        '抱え直すときに、まず件数を落とす。広げたまま続けると、手が止まりやすい。',
      beatJa: '抱え直すときに、まず件数を落とす。',
      sceneWhen: '疲れた日に、まず件数を落とすとき',
      sceneWhile: '抱え直すときに、まず件数を落とす',
    },
    scene: {
      shortJa: '刺激を変えている人に見えて件数を落とす',
      manifestationJa:
        '刺激を変えている人に見られても、先に落としたいのは仕事の幅である。場所を変えたあとも、件数はそのまま残りやすい。',
      beatJa: '場所を変えても、先に落としたいのは件数である。',
      sceneWhen: '場所を変えたあとも、件数が残っているとき',
      sceneWhile: '場所を変えても、件数を落としたくなる',
    },
  },
  scene: {
    pause: {
      shortJa: '止まっている人に見えて場面を変えたい',
      manifestationJa:
        '止まっている人に見られても、場所や刺激を変えたい。短い休みだけでは、同じ部屋の検討から抜けにくい。',
      beatJa: '止まって見えても、場面を変えたがっている。',
      sceneWhen: '同じ部屋で止まって見えるとき、実は場面を変えたい',
      sceneWhile: '止まって見えても、場面を変えたがる',
    },
    shrink: {
      shortJa: '仕事を減らしている人に見えて場面を変える',
      manifestationJa:
        '仕事を減らしているように見られても、場面そのものを変えたい。件数を落としたあとも、同じ場所に居続けると戻りにくい。',
      beatJa: '件数を落としても、場面そのものを変えたい。',
      sceneWhen: '件数を落としたあとも、同じ場所から戻れないとき',
      sceneWhile: '件数を落としても、場面を変えたくなる',
    },
    scene: {
      shortJa: '同じ場所に居続けると検討が抜けない',
      manifestationJa:
        '場面の刺激を変えて戻る。同じ場所に居続けると、検討のループから抜けにくい。',
      beatJa: '同じ場所に居続けると、検討から抜けにくい。',
      sceneWhen: '疲れた日に場所を変えて、検討から抜けるとき',
      sceneWhile: '同じ場所では検討から抜けにくく、場所を変えたくなる',
    },
  },
};

function cellFor(
  axisId: ExpressionAxisId,
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): ManifestCell {
  switch (axisId) {
    case 'start':
      return START_MANIFEST[birth.start][answers.start];
    case 'decision':
      return DECISION_MANIFEST[birth.decision][answers.decision];
    case 'distance':
      return DISTANCE_MANIFEST[birth.distance][answers.distance];
    case 'change':
      return CHANGE_MANIFEST[birth.change][answers.change];
    case 'recovery':
      return RECOVERY_MANIFEST[birth.recovery][answers.recovery];
  }
}

export function pickManifestationAxis(
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): ExpressionAxisId {
  for (const axisId of SURPRISE_ORDER) {
    if (birth[axisId] !== answers[axisId]) return axisId;
  }
  return 'start';
}

export function pickManifestationAxes(
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): readonly [ExpressionAxisId, ExpressionAxisId | null] {
  const diverged = SURPRISE_ORDER.filter((axisId) => birth[axisId] !== answers[axisId]);
  if (diverged.length === 0) return ['start', 'decision'];
  return [diverged[0]!, diverged[1] ?? null];
}

export function lintPersonalPrimaryCopy(text: string): PersonalPrimaryCopyFlag[] {
  const flags: PersonalPrimaryCopyFlag[] = [];
  if (ABSTRACT_MODEL_LANGUAGE.test(text)) flags.push('ABSTRACT_MODEL_LANGUAGE');
  if (GENERIC_BARNUM.some((phrase) => text.includes(phrase))) flags.push('GENERIC_BARNUM');
  if (/傾向があります|いま強く表れ|回答が重なって/.test(text)) flags.push('ANSWER_RESTATEMENT');
  if (/土台では/.test(text) && !/答え/.test(text)) flags.push('DOB_ONLY_HOROSCOPE');
  if (/必ず|絶対|運命|幼少期から|恋愛では必ず|職場ではいつも/.test(text)) {
    flags.push('UNSUPPORTED_CERTAINTY');
  }
  if (!/見られ|一人|あと|帰宅|相談|決めた|静か|間を|やり直|再点検|言葉|並べ/.test(text)) {
    flags.push('NO_OBSERVABLE_BEHAVIOR');
  }
  if (
    !/夜|帰り道|買い物|転職|会食|会議|期限|予定|疲れた|相談|帰宅|書類|カゴ|打ち合わせ/.test(text)
  ) {
    flags.push('NO_SCENE');
  }
  if (/土台では|今回の答えでは/.test(text)) flags.push('NO_SURPRISE');
  return flags;
}

export function customerLanguageBanned(text: string): string[] {
  const hits: string[] = [];
  for (const token of [
    'start',
    'decision',
    'distance',
    'hinge',
    'axis',
    'middle',
    'close',
    'map',
    'wait',
    'sort',
    'tempo mismatch',
    'pole',
    '置くつもりが比較',
    '材料が足りなくて',
    '輪郭を掴',
    '比較表',
    '接点の入口',
    '基調の寄',
    '買い物や仕事の方針を、人に話した直後',
  ]) {
    if (text.includes(token)) hits.push(token);
  }
  return hits;
}

export function premiumBridgeForManifestation(
  shortJa: string,
  axisId: ExpressionAxisId,
): string {
  if (axisId === 'distance') {
    return `いま見えた「${shortJa}」が、近い関係ではすれ違いになり、仕事の判断では武器になるのはどこか。プレミアムでは、同じ動きを場面に分けて読み返します。`;
  }
  if (axisId === 'change') {
    return `いま見えた「${shortJa}」が、予定が崩れたときに力になり、日常では摩擦になるのはどこか。プレミアムでは、同じ動きを場面に分けて読み返します。`;
  }
  if (axisId === 'recovery') {
    return `いま見えた「${shortJa}」が、疲れた日の戻り方ではどう出るか。プレミアムでは、同じ動きを場面に分けて読み返します。`;
  }
  return `いま見えた「${shortJa}」が、仕事では武器になり、近い関係ではすれ違いになるのはどこか。プレミアムでは、同じ動きを場面に分けて読み返します。`;
}

function sceneFor(primary: ManifestCell, second: ManifestCell | null): string {
  if (!second) return `${primary.sceneWhen}。`;
  return `${primary.sceneWhen}、${second.sceneWhile}。`;
}

export function buildPersonalManifestationV4(
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): PersonalManifestationV4 {
  const [axisId, secondAxisId] = pickManifestationAxes(birth, answers);
  const cell = cellFor(axisId, birth, answers);
  const second = secondAxisId ? cellFor(secondAxisId, birth, answers) : null;
  const birthTendency = String(birth[axisId]);
  const answerTendency = String(answers[axisId]);
  const patternId = secondAxisId
    ? `${axisId}_${birthTendency}_${answerTendency}+${secondAxisId}_${String(birth[secondAxisId])}_${String(answers[secondAxisId])}`
    : `${axisId}_${birthTendency}_${answerTendency}`;
  const manifestationJa = cell.manifestationJa;
  const sceneCandidateJa = sceneFor(cell, second);
  return {
    patternId,
    axisId,
    birthTendency,
    answerTendency,
    manifestationJa,
    sceneCandidateJa,
    shortJa: second ? `${cell.shortJa}／${second.shortJa}` : cell.shortJa,
    userDidNotDirectlyAnswerThis: true,
    cannotComeFromDobOnlyJa: `同じ生年月日でも、今回の${axisId}の答えが変わると「${cell.shortJa}」にはならない。`,
    cannotComeFromAnswersOnlyJa: `同じ答えでも、生年月日側の${axisId}が変わると「${cell.shortJa}」にはならない。`,
  };
}
