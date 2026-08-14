/**
 * Personal Free manifestation v4 — observable behavior from fused birth × answers.
 * V6 patch: paragraph-level customer Japanese. Engine selection unchanged.
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
  | 'NO_SURPRISE'
  | 'CELL_CONCATENATION';

const ABSTRACT_MODEL_LANGUAGE =
  /距離を整え|一定の間隔|接点の入口|基調の寄り|土台では|内側では|土台の接点|基調の速さ|置くつもりが|材料が足りなくて|輪郭を掴|比較表|あわせて、|返事の間隔を一人で|比べの途中で|今どちらの日か|見えやすい反応/;

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
        '小さく試し始めたあとも、決めたこととしてはまだ閉じていない。動いている人に見られやすいが、実際に確定するのは、一人でやり直したあとだ。新しいことを一つ試した夜、一人で試作を閉じ直したくなる。',
      beatJa: '先に手を出したあとも、一人の時間で試作を閉じ直している。',
      sceneWhen: '新しいことを一つ試した夜、一人で試作を閉じ直したくなる。',
      sceneWhile: '試作を一人で閉じ直したくなる',
    },
    map: {
      shortJa: '先に動かしてから段取りを描く',
      manifestationJa:
        '先に一つ動かしたあとに、全体の段取りを作り直している。試作している人に見られても、頭の中ではまだ全体が見えていない。大きな申し込みを決めるとき、先に手を出してから全体を描き直したくなる。',
      beatJa: '一つ動かしたあとで、全体の段取りを描き直している。',
      sceneWhen: '大きな申し込みを決めるとき、先に手を出してから全体を描き直したくなる。',
      sceneWhile: '先に動かしたあと、全体の段取りを描き直したくなる',
    },
    ask: {
      shortJa: '動いたあとに見立てを足す',
      manifestationJa:
        '試し始めたあとに、人へ確認を取りに戻る。進んでいるように見られても、見立てを足してから閉じたい。途中まで進めた仕事を、誰かに見てもらいに戻るときに起きやすい。',
      beatJa: '先に動いたあとに、人の見立てを足しに戻っている。',
      sceneWhen: '途中まで進めた仕事を、誰かに見てもらいに戻るときに起きやすい。',
      sceneWhile: '途中まで進めた仕事を、人の見立てを足しに戻したくなる',
    },
  },
  map: {
    try: {
      shortJa: '揃える前に手が先に出る',
      manifestationJa:
        '全体を揃えてから動くつもりが、先に小さく手が前に出ている。動きが早い人に見られても、本人の中ではまだ全体が見えていない。仕事の方針を変えるとき、整理し切る前に一つ動かしてしまう。',
      beatJa: '揃える前に、小さく手が先に出ている。',
      sceneWhen: '仕事の方針を変えるとき、整理し切る前に一つ動かしてしまう。',
      sceneWhile: '揃える前に、小さく手が先に出る',
    },
    map: {
      shortJa: '準備が終わっても候補が残る',
      manifestationJa:
        '段取りを終えたあとも、候補を開き直している。準備ができた人に見られても、決める瞬間だけが残っている。出す直前の夜、まだ候補を開き直したくなる。',
      beatJa: '準備が終わったあとも、候補を開き直している。',
      sceneWhen: '出す直前の夜、まだ候補を開き直したくなる。',
      sceneWhile: '準備が終わっても、候補を開き直したくなる',
    },
    ask: {
      shortJa: '一人で揃えたあとに見立てを足す',
      manifestationJa:
        '一人で段取りしたあとに、人の見立てを足しにいく。決まってから相談しているように見られても、足りない視点を取りに戻っている。出す前の段取りを、誰かへ一度見せにいくときに起きやすい。',
      beatJa: '一人で揃えたあとに、人の見立てを足しに戻っている。',
      sceneWhen: '出す前の段取りを、誰かへ一度見せにいくときに起きやすい。',
      sceneWhile: '一人で揃えた段取りを、人に見せに戻したくなる',
    },
  },
  ask: {
    try: {
      shortJa: '相談のあと一人で決める',
      manifestationJa:
        '人に相談している最中は、もう気持ちが固まっているように見られやすい。でも、実際に答えが決まるのは会話のあとだ。相手の言葉をそのまま採用するというより、一人になってから聞いたことを自分の順番に並べ直し、最後に「自分はどうしたいか」へ戻る。誰かに相談したあとの一人の時間で、その並べ直しはいちばん起きやすい。',
      beatJa: '相談の場では決まったように見えても、最終判断は一人の時間に残る。',
      sceneWhen: '誰かに相談したあとの一人の時間で、聞いたことを自分の順番に並べ直したくなる。',
      sceneWhile: '相談のあと、一人で最終判断を作りたくなる',
    },
    map: {
      shortJa: '相談のあと一人で並べ直す',
      manifestationJa:
        '相談の場では合わせているように見られやすい。一人になってから候補を並べ直し、そこで初めて方針が固まる。誰かに方針を聞かれたあと、一人で書き直したくなる。',
      beatJa: '相談の席では合わせ、一人になってから候補を並べ直している。',
      sceneWhen: '誰かに方針を聞かれたあと、一人で書き直したくなる。',
      sceneWhile: '相談のあと、一人で候補を書き直したくなる',
    },
    ask: {
      shortJa: '話したあとの一人の時間で閉じる',
      manifestationJa:
        '人と話しているうちに進んだように見られやすい。実際の決定は、会話が終わったあとの一人の時間に残る。誰かに頼られて話したあと、帰宅してから答えを閉じたくなる。',
      beatJa: '話している最中は進んだように見えても、閉じるのは一人の時間です。',
      sceneWhen: '誰かに頼られて話したあと、帰宅してから答えを閉じたくなる。',
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
        '比べて決めたあとに「他も見るべきだった」が残る。選んだ人に見られても、候補の点検は終わっていない。相手に伝える前の数十分で、選んだあとも候補を点検したくなる。',
      beatJa: '選んだあとも、候補の点検が一人で続いています。',
      sceneWhen: '相手に伝える前の数十分で、選んだあとも候補を点検したくなる。',
      sceneWhile: '選んだあとも、候補の点検が残る',
    },
    deadline: {
      shortJa: '比べている途中で区切りに切る',
      manifestationJa:
        'まだ並べている途中なのに、期限が来ると一気に切る。締めた人に見られても、頭の中ではまだ候補が残っている。決断の期限が近づいた午後、並べていた候補を一気に閉じる。',
      beatJa: 'まだ並べている途中なのに、期限が来ると一気に閉じている。',
      sceneWhen: '決断の期限が近づいた午後、並べていた候補を一気に閉じる。',
      sceneWhile: 'まだ並べている途中で、期限が来ると一気に閉じる',
    },
    wait: {
      shortJa: '並べたあとも返事は翌朝',
      manifestationJa:
        '候補は並べ終わっているのに、返事は翌朝まで持っていく。決めた人に見られても、頭の中ではまだ比べが残っている。大きな申し込みを決める夜、送る前に一晩置く。',
      beatJa: '並べ終わったあとも、返事は翌朝まで持っていく。',
      sceneWhen: '大きな申し込みを決める夜、送る前に一晩置く。',
      sceneWhile: '並べたあとも、返事は翌朝まで持っていく',
    },
  },
  deadline: {
    sort: {
      shortJa: '期限が先に立ちつつ並べ直す',
      manifestationJa:
        '「いつまでに」が先に立ちつつ、候補を並べ直している。急いで決めた人に見られても、実際には比べが続いている。期限付きの依頼でも、締切は見えつつ候補をまた開く。',
      beatJa: '期限を意識しながらも、候補を並べ直している。',
      sceneWhen: '期限付きの依頼でも、締切は見えつつ候補をまた開く。',
      sceneWhile: '期限は見えつつ、候補をまた並べ直す',
    },
    deadline: {
      shortJa: '閉じた直後に一人で見直す',
      manifestationJa:
        '区切りで閉じたあとに、途中経過を一人で見直す。決まった人に見られても、締めた直後の再点検が残る。期限で送った直後、一人で経過を見返したくなる。',
      beatJa: '閉じた直後に、一人で途中経過を見直している。',
      sceneWhen: '期限で送った直後、一人で経過を見返したくなる。',
      sceneWhile: '閉じた直後に、一人で見直したくなる',
    },
    wait: {
      shortJa: '締めたあとに置く時間が来る',
      manifestationJa:
        '期限で閉じたあとに「早かったのでは」が残る。決めた人に見られても、置きたかった時間が後から来る。期限で返した夜、置きたかった時間が後から来る。',
      beatJa: '締めたあとに、置きたかった時間が後から来る。',
      sceneWhen: '期限で返した夜、置きたかった時間が後から来る。',
      sceneWhile: '締めたあとに、置きたかった時間が来る',
    },
  },
  wait: {
    sort: {
      shortJa: '寝かせるつもりが夜には候補をまた開く',
      manifestationJa:
        'いったん寝かせるつもりだったのに、夜には候補をまた開いている。待っている人に見られても、頭の中ではまだ並べ直している。まだ期限のない夜、候補をまた開き直す。',
      beatJa: '寝かせるつもりだった夜に、候補をまた開いている。',
      sceneWhen: 'まだ期限のない夜、候補をまた開き直す。',
      sceneWhile: '寝かせるつもりが、夜には候補をまた開く',
    },
    deadline: {
      shortJa: '寝かせるつもりが期限で閉じてしまう',
      manifestationJa:
        '寝かせるつもりだったのに、期限の合図で閉じてしまう。締めた人に見られても、決めたあとに「もう一晩欲しかった」が残る。寝かせておきたかった案件を、期限の合図で閉じる。',
      beatJa: '寝かせるつもりが、期限の合図で閉じてしまう。',
      sceneWhen: '寝かせておきたかった案件を、期限の合図で閉じる。',
      sceneWhile: '寝かせるつもりが、期限で閉じてしまう',
    },
    wait: {
      shortJa: '動いて見えても結論は翌朝',
      manifestationJa:
        '動いているように見られても、結論だけは翌朝まで持っていく。決めたこととしては、まだ確定していない。日中は進んでいるように見えて、結論だけ翌朝に残る。',
      beatJa: '動いて見えても、結論だけは翌朝まで持っていく。',
      sceneWhen: '日中は進んでいるように見えて、結論だけ翌朝に残る。',
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
        '会話の中で距離を言葉にした直後に、言い方を一人でやり直している。丁寧に見えるほど、「今さら考え直している」と見られやすい。近い人と話した直後、言い方を一人でやり直す。',
      beatJa: '距離を言葉にした直後に、言い方を一人でやり直している。',
      sceneWhen: '近い人と話した直後、言い方を一人でやり直す。',
      sceneWhile: '距離を言葉にした直後に、言い方をやり直したくなる',
    },
    middle: {
      shortJa: '会話では合わせて帰宅後にタイミングを戻す',
      manifestationJa:
        '会話では合わせているように見られやすい。会ったあとに、返事のタイミングを一人で戻したくなる。関係の距離を調整するとき、帰り道で連絡の速さを整え直す。',
      beatJa: '会話では合わせ、帰宅してから返事のタイミングを戻している。',
      sceneWhen: '関係の距離を調整するとき、帰り道で連絡の速さを整え直す。',
      sceneWhile: '会ったあと、返事のタイミングを一人で戻したくなる',
    },
    solo: {
      shortJa: 'その場では近く、帰宅後に一人で点検する',
      manifestationJa:
        'その場では近い関係を保っているように見られやすい。実際には、会ったあとに一人になってから距離を点検している。関係の距離を調整するとき、帰宅後の一人の時間で「今の距離でよかったか」へ戻りやすい。',
      beatJa: 'その場では近く見えても、帰宅後に一人で距離を点検している。',
      sceneWhen: '関係の距離を調整するとき、帰宅後の一人の時間で距離を点検したくなる。',
      sceneWhile: '会ったあと、一人で距離を点検したくなる',
    },
  },
  middle: {
    close: {
      shortJa: '普段は間を取り、会話では言葉で寄せる',
      manifestationJa:
        '普段は間を取っているのに、会話の中では距離を言葉にしてしまう。丁寧に見える一方、あとから「近づきすぎた」が残る。普段は間を取っている相手に、会話の途中で距離を言葉にする。',
      beatJa: '普段は間を取りつつ、会話では言葉で寄ってしまう。',
      sceneWhen: '普段は間を取っている相手に、会話の途中で距離を言葉にする。',
      sceneWhile: '会話の途中で、距離を言葉にして寄ってしまう',
    },
    middle: {
      shortJa: '安定して見えるほど迷いを一人で抱える',
      manifestationJa:
        '安定して見えるほど、迷いを一人で抱えたまま連絡だけ続けている。離れていないように見られても、整えは会話の外で起きている。連絡は続いているのに、整えは一人の時間に残る。',
      beatJa: '安定して見えるほど、迷いは会話の外で一人で抱えている。',
      sceneWhen: '連絡は続いているのに、整えは一人の時間に残る。',
      sceneWhile: '連絡は続けつつ、整えは一人の時間に残る',
    },
    solo: {
      shortJa: '連絡は続け、整えは一人の時間に寄る',
      manifestationJa:
        '連絡は続いているように見られやすい。実際の整えは、会ったあとの一人の時間に寄る。連絡を返したあと、一人になってから整え直したくなる。',
      beatJa: '連絡は続けつつ、整えは一人の時間に寄っている。',
      sceneWhen: '連絡を返したあと、一人になってから整え直したくなる。',
      sceneWhile: '連絡のあと、一人で整え直したくなる',
    },
  },
  solo: {
    close: {
      shortJa: 'その場では寄せ、帰宅後に一人の時間が先に立つ',
      manifestationJa:
        '一人で整えてから戻りたいのに、その場では距離を言葉にして合わせている。近い関係を保っているように見られても、帰宅後に一人の時間が先に立つ。近い人と合わせたあと、帰宅して一人の時間が先に立つ。',
      beatJa: 'その場では寄せて見せ、帰宅後に一人の時間が先に立つ。',
      sceneWhen: '近い人と合わせたあと、帰宅して一人の時間が先に立つ。',
      sceneWhile: '合わせたあと、帰宅して一人の時間が先に立つ',
    },
    middle: {
      shortJa: '一人で整えたいのに返事の速さだけ合わせる',
      manifestationJa:
        '一人で整えたいのに、返事の速さだけ合わせている。安定して見えるほど、一人の時間が足りていない。返事は早く返したあと、一人の時間が足りなくなる。',
      beatJa: '一人で整えたいのに、返事の速さだけ合わせてしまう。',
      sceneWhen: '返事は早く返したあと、一人の時間が足りなくなる。',
      sceneWhile: '返事は合わせつつ、一人の時間が足りなくなる',
    },
    solo: {
      shortJa: '会ったあとに一人で決め方を見直す',
      manifestationJa:
        '会ったあとに一人の時間を先に確保し、そこで「今の決め方でよかったか」を見直している。離れて見られても、実際は決め方の再点検だ。予定が終わったあと、一人の時間を先に取って決め方を見直す。',
      beatJa: '会ったあとに、一人で決め方を見直している。',
      sceneWhen: '予定が終わったあと、一人の時間を先に取って決め方を見直す。',
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
        '予定が変わった直後は、動かない人に見られやすい。実際には一日様子を見てから組み替える。予定を変えるか迷うとき、翌日になってようやく組み替える。',
      beatJa: '予定が変わっても、一日置いてから組み替えている。',
      sceneWhen: '予定を変えるか迷うとき、翌日になってようやく組み替える。',
      sceneWhile: '予定が変わっても、一日置いてから組み替える',
    },
    adjust: {
      shortJa: '見定めたいのに細部だけ直し始める',
      manifestationJa:
        '様子を見たいのに、細部だけ直し始めている。直している人に見られても、方針はまだ見定めている。予定を変えるか迷う日、方針は置いたまま細部だけ直す。',
      beatJa: '見定めたいのに、細部だけ直し始めている。',
      sceneWhen: '予定を変えるか迷う日、方針は置いたまま細部だけ直す。',
      sceneWhile: '方針は見定めつつ、細部だけ直し始める',
    },
    rebuild: {
      shortJa: '普段は静かで前提が崩れたときだけ組み直す',
      manifestationJa:
        '普段は静かだが、前提が崩れたときだけ予定を一度捨てて組み直す。急な人に見られても、本人の中では「前提が変わった」で一貫している。前提が崩れた夜、予定を一度捨てて組み直す。',
      beatJa: '普段は静かでも、前提が崩れたときだけ大きく組み直す。',
      sceneWhen: '前提が崩れた夜、予定を一度捨てて組み直す。',
      sceneWhile: '前提が崩れたときだけ、大きく組み直す',
    },
  },
  adjust: {
    observe: {
      shortJa: '直し始めているのに止まって見える',
      manifestationJa:
        '差分を直し始めたいのに、まず止まって見える。止まっている人に見られても、頭の中では直し始めている。予定変更の直後、表では止まって見える。',
      beatJa: '止まって見えても、頭の中では直し始めている。',
      sceneWhen: '予定変更の直後、表では止まって見える。',
      sceneWhile: '止まって見えても、頭では直し始めている',
    },
    adjust: {
      shortJa: '方針は守ったまま細部だけ直し続ける',
      manifestationJa:
        '大きな方針は守ったまま、細部だけを直し続けている。進んでいるように見られても、点検が終わっていない。予定の骨は残したまま、細部だけ直し続ける夜がある。',
      beatJa: '方針は守ったまま、細部だけ直し続けている。',
      sceneWhen: '予定の骨は残したまま、細部だけ直し続ける夜がある。',
      sceneWhile: '方針は守ったまま、細部だけ直し続ける',
    },
    rebuild: {
      shortJa: '小さく直している延長で方向転換に見える',
      manifestationJa:
        '小さく直している延長で、周囲には急な方向転換に見える組み直しが入る。本人の中では、継ぎ足しの先にある。小さな修正の延長が、周囲には方針転換に見える。',
      beatJa: '小さく直している延長が、周囲には方向転換に見えやすい。',
      sceneWhen: '小さな修正の延長が、周囲には方針転換に見える。',
      sceneWhile: '小さな修正の延長が、方向転換に見えやすい',
    },
  },
  rebuild: {
    observe: {
      shortJa: '組み直す前提を一日置いてから出す',
      manifestationJa:
        '組み直したいのに、表では一日置いている。静かに見える一方、前提が変わったことはもう決めている。組み直す前提は決めたまま、表では一日置く。',
      beatJa: '組み直す前提は決まっていて、表では一日置いている。',
      sceneWhen: '組み直す前提は決めたまま、表では一日置く。',
      sceneWhile: '組み直す前提は決まっていて、表では一日置く',
    },
    adjust: {
      shortJa: '小さく直している人に見えてやり直すつもり',
      manifestationJa:
        '小さく直している人に見られても、本人は一度やり直すつもりで手を動かしている。予定を変えるか迷うとき、差分修正に見えても本人はやり直しの手を動かしている。',
      beatJa: '小さく直して見えても、本人はやり直すつもりで動かしている。',
      sceneWhen: '予定を変えるか迷うとき、差分修正に見えても本人はやり直しの手を動かしている。',
      sceneWhile: '小さく直して見えても、やり直すつもりで動かしている',
    },
    rebuild: {
      shortJa: '前提が崩れたときの組み直しが急に見える',
      manifestationJa:
        '予定が崩れたときに、周囲には急な方向転換に見える組み直しが入る。本人の中では「前提が変わったから」で一貫している。予定が崩れた夜、周囲には急な組み直しに見える。',
      beatJa: '予定が崩れたときの組み直しが、周囲には急に見えやすい。',
      sceneWhen: '予定が崩れた夜、周囲には急な組み直しに見える。',
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
        '短く区切ったあとも、頭の中では同じ件が残っている。休んだ人に見られても、切れ目が取れないと再点検が止まらない。疲れた日に短く区切ったあと、同じ件が頭に残る。',
      beatJa: '短く休んだあとも、同じ件の再点検が残る。',
      sceneWhen: '疲れた日に短く区切ったあと、同じ件が頭に残る。',
      sceneWhile: '短い休みのあと、同じ件を再点検したくなる',
    },
    shrink: {
      shortJa: '止めたいのに範囲を減らして戻る',
      manifestationJa:
        '一回止めたいのに、やることの幅を落として戻っている。仕事を減らしている人に見られても、先に欲しいのは短い切れ目だ。疲れた日に件数を落として戻る。',
      beatJa: '止めたいのに、件数を落として戻ってしまう。',
      sceneWhen: '疲れた日に件数を落として戻る。',
      sceneWhile: '止めたいのに、件数を落として戻る',
    },
    scene: {
      shortJa: '休みたいのに場所を変えて戻る',
      manifestationJa:
        '短い休みが先に欲しいのに、場所を変えて戻っている。気分転換している人に見られても、切れ目自体が足りていない。疲れた日に場所だけ変えて戻る。',
      beatJa: '休みたいのに、場所を変えて戻ってしまう。',
      sceneWhen: '疲れた日に場所だけ変えて戻る。',
      sceneWhile: '休みたいのに、場所を変えて戻る',
    },
  },
  shrink: {
    pause: {
      shortJa: '休んでいる人に見えて幅を絞りたい',
      manifestationJa:
        '休んでいるように見られても、やることの幅を絞りたい。止まっている時間が、実は範囲の見直しになっている。止まって見える時間が、実は範囲の見直しになっている。',
      beatJa: '休んで見えても、実際は範囲を絞っている。',
      sceneWhen: '止まって見える時間が、実は範囲の見直しになっている。',
      sceneWhile: '休んで見えても、範囲を絞っている',
    },
    shrink: {
      shortJa: '広げたままだと手が止まる',
      manifestationJa:
        '抱え直すときに、まず件数を落とす。広げたまま続けると、手が止まりやすい。疲れた日に、まず件数を落とす。',
      beatJa: '抱え直すときに、まず件数を落とす。',
      sceneWhen: '疲れた日に、まず件数を落とす。',
      sceneWhile: '抱え直すときに、まず件数を落とす',
    },
    scene: {
      shortJa: '席を変えても仕事の束は残る',
      manifestationJa:
        '席を変えている人に見られやすい。実際に欲しいのは、抱えている件数を落とすことだ。疲れた日に席を変えても、同じ仕事の束が残る。',
      beatJa: '席を変えても、先に落としたいのは仕事の束である。',
      sceneWhen: '疲れた日に席を変えても、同じ仕事の束が残る。',
      sceneWhile: '席を変えても、仕事の束を落としたくなる',
    },
  },
  scene: {
    pause: {
      shortJa: '止まっている人に見えて場面を変えたい',
      manifestationJa:
        '止まっている人に見られても、場所や刺激を変えたい。短い休みだけでは、同じ部屋の検討から抜けにくい。同じ部屋で止まって見えるとき、実は場面を変えたい。',
      beatJa: '止まって見えても、場面を変えたがっている。',
      sceneWhen: '同じ部屋で止まって見えるとき、実は場面を変えたい。',
      sceneWhile: '止まって見えても、場面を変えたがる',
    },
    shrink: {
      shortJa: '仕事を減らしている人に見えて場面を変える',
      manifestationJa:
        '仕事を減らしているように見られても、場面そのものを変えたい。件数を落としたあとも、同じ場所に居続けると戻りにくい。件数を落としたあとも、同じ場所から戻れない。',
      beatJa: '件数を落としても、場面そのものを変えたい。',
      sceneWhen: '件数を落としたあとも、同じ場所から戻れない。',
      sceneWhile: '件数を落としても、場面を変えたくなる',
    },
    scene: {
      shortJa: '同じ場所に居続けると検討が抜けない',
      manifestationJa:
        '場面の刺激を変えて戻る。同じ場所に居続けると、検討のループから抜けにくい。疲れた日に場所を変えて、検討から抜ける。',
      beatJa: '同じ場所に居続けると、検討から抜けにくい。',
      sceneWhen: '疲れた日に場所を変えて、検討から抜ける。',
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

export type PersonalManifestationModifiersV2 = {
  readonly stemLane: number;
  readonly lunarMonth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  readonly tensionIds?: readonly ExpressionAxisId[];
};

/** Internal ranking only — never shown as rarity/percent. */
export function axisInformationContent(
  axisId: ExpressionAxisId,
  birth: ExpressionAxes,
  answers: ExpressionAxes,
  modifiers?: PersonalManifestationModifiersV2,
): number {
  const diverge = birth[axisId] !== answers[axisId] ? 1 : 0;
  const cellStates = 9;
  const cellSupport = diverge ? 6 : 3;
  let content = Math.log2(cellStates / cellSupport);
  if (diverge) content += 1.2;
  if (modifiers?.tensionIds?.includes(axisId)) content += 0.35;
  if (axisId === 'distance' || axisId === 'change') content += Math.log2(10) * 0.25;
  if (axisId === 'recovery' || axisId === 'decision') content += Math.log2(12) * 0.12;
  return content;
}

export function pickManifestationAxes(
  birth: ExpressionAxes,
  answers: ExpressionAxes,
  modifiers?: PersonalManifestationModifiersV2,
): readonly [ExpressionAxisId, ExpressionAxisId | null, ExpressionAxisId | null] {
  const ranked = [...SURPRISE_ORDER]
    .map((axisId) => ({
      axisId,
      score: axisInformationContent(axisId, birth, answers, modifiers),
    }))
    .sort((a, b) => b.score - a.score);
  const primary = ranked[0]?.axisId ?? 'start';
  const second = ranked[1]?.axisId ?? null;
  const third = ranked[2] && ranked[2].score >= 1 ? ranked[2].axisId : null;
  return [primary, second, third];
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
  if (!/見られ|一人|あと|帰宅|相談|決めた|静か|間を|やり直|再点検|言葉|並べ|机|週|朝/.test(text)) {
    flags.push('NO_OBSERVABLE_BEHAVIOR');
  }
  if (
    !/夜|帰り道|買い物|相談|帰宅|期限|予定|疲れた|申し込み|方針|距離を調整|一人の時間|机|週|朝|会議|返信|書類|ノート/.test(
      text,
    )
  ) {
    flags.push('NO_SCENE');
  }
  if (/土台では|今回の答えでは/.test(text)) flags.push('NO_SURPRISE');
  if (
    /、一人になってから、/.test(text) ||
    /とき、[^。]{0,40}とき/.test(text) ||
    /応募してしまう|カゴに入れ|送信ログ|カフェに移/.test(text)
  ) {
    flags.push('CELL_CONCATENATION');
  }
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
    '置くつもりが',
    '材料が足りなくて',
    '輪郭を掴',
    '比較表',
    '接点の入口',
    '基調の寄',
    '買い物や仕事の方針を、人に話した直後',
    '返事の間隔を一人で',
    '比べの途中で',
    '今どちらの日か',
    '見えやすい反応',
    '土台の差が',
    '同じ土台でも',
    '応募してしまう',
    'カゴに入れ',
    '送信ログ',
    'カフェに移',
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
    return `いま見えた「${shortJa}」は、近い人との距離でいちばんすれ違いやすい。プレミアムでは、その続きを仕事と関係に分けて読めます。`;
  }
  if (axisId === 'change') {
    return `いま見えた「${shortJa}」は、予定が崩れた日に形を変えます。プレミアムでは、その続きを場面ごとに読めます。`;
  }
  if (axisId === 'recovery') {
    return `いま見えた「${shortJa}」は、疲れた日の戻り方で負荷になります。プレミアムでは、楽に戻す順を読めます。`;
  }
  if (axisId === 'decision') {
    return `いま見えた「${shortJa}」は、決める場面で力にも遅れにもなります。プレミアムでは、その続きを読めます。`;
  }
  return `いま見えた「${shortJa}」は、仕事の始め方で武器にも摩擦にもなります。プレミアムでは、その続きを読めます。`;
}

function completeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[。！？]$/u.test(trimmed) ? trimmed : `${trimmed}。`;
}

const STEM_SOCIAL_MIRROR_JA: readonly string[] = [
  '周りには、向きを先に決めてから手を出す人に見える。',
  '周りには、場の流れを読んでから動く人に見える。',
  '周りには、反応が返ってきてから本調子になる人に見える。',
  '周りには、一つを深めてから外へ出す人に見える。',
  '周りには、いつもの手順があるほど安定して見える人に見える。',
  '周りには、いくつかを同時に抱えて進む人に見える。',
  '周りには、区切りをつけてから次へ移る人に見える。',
  '周りには、精度を上げてから渡す人に見える。',
  '周りには、人とつないでから動きが立つ人に見える。',
  '周りには、静かに読んでから言葉を置く人に見える。',
];

const LUNAR_SCENE_BEAT_JA: readonly string[] = [
  '締めの書類を机に戻す週に、同じ動きが戻る。',
  '新しいノートを開いた週に、同じ動きが出る。',
  '予定が二つ重なった夜に、同じ動きが先に立つ。',
  '返信を翌朝まで置いた朝に、同じ動きが出る。',
  '荷物を減らしてから出かける日に、同じ動きが見える。',
  '長い会議のあとの帰り道に、同じ動きが残る。',
  '期限の前の一日に、同じ動きが強く出る。',
  '静かな休日の午後に、同じ動きを一人でやり直す。',
  '短い連絡が続いた夜に、同じ動きが先に来る。',
  '片付けを途中で止めた机で、同じ動きが残る。',
  '次の週の予定だけ先に置いた夜に、同じ動きが出る。',
  '一年の終わりの棚卸しで、同じ動きがはっきりする。',
];

function sentenceCount(text: string): number {
  return text.split('。').filter((part) => part.trim().length > 0).length;
}

function appendUniqueSentence(base: string, extra: string): string {
  const sentence = completeSentence(extra);
  const needle = sentence.replace(/。$/u, '').slice(0, 12);
  if (!needle || base.includes(needle)) return base;
  if (sentenceCount(base) >= 6) return base;
  return `${base}${sentence}`;
}

function composeReading(
  primary: ManifestCell,
  second: ManifestCell | null,
  modifiers?: PersonalManifestationModifiersV2,
): string {
  let text = primary.manifestationJa;
  if (second) {
    const support = completeSentence(second.beatJa);
    const needle = support.replace(/。$/u, '').slice(0, 10);
    if (needle && !primary.manifestationJa.includes(needle) && sentenceCount(text) < 6) {
      text = `${text}${support}`;
    }
  }
  if (modifiers) {
    const stemLine = STEM_SOCIAL_MIRROR_JA[((modifiers.stemLane % 10) + 10) % 10]!;
    const lunarLine = LUNAR_SCENE_BEAT_JA[modifiers.lunarMonth - 1]!;
    text = appendUniqueSentence(text, stemLine);
    text = appendUniqueSentence(text, lunarLine);
  }
  return text;
}

function sceneFor(primary: ManifestCell, composed: string): string {
  const parts = composed
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const last = parts[parts.length - 1] ?? primary.sceneWhen;
  return completeSentence(last);
}

export function buildPersonalManifestationV4(
  birth: ExpressionAxes,
  answers: ExpressionAxes,
  modifiers?: PersonalManifestationModifiersV2,
): PersonalManifestationV4 {
  const [axisId, secondAxisId, thirdAxisId] = pickManifestationAxes(birth, answers, modifiers);
  const cell = cellFor(axisId, birth, answers);
  const second = secondAxisId ? cellFor(secondAxisId, birth, answers) : null;
  const birthTendency = String(birth[axisId]);
  const answerTendency = String(answers[axisId]);
  const modifierKey = modifiers
    ? `s${modifiers.stemLane}l${modifiers.lunarMonth}`
    : 'sxlx';
  const patternId = [
    axisId,
    birthTendency,
    answerTendency,
    secondAxisId
      ? `${secondAxisId}_${String(birth[secondAxisId])}_${String(answers[secondAxisId])}`
      : 'none',
    thirdAxisId ?? 'none',
    modifierKey,
  ].join('+');
  const manifestationJa = composeReading(cell, second, modifiers);
  return {
    patternId,
    axisId,
    birthTendency,
    answerTendency,
    manifestationJa,
    sceneCandidateJa: sceneFor(cell, cell.manifestationJa),
    shortJa: cell.shortJa,
    userDidNotDirectlyAnswerThis: true,
    cannotComeFromDobOnlyJa: `同じ生年月日でも、今回の${axisId}の答えが変わると「${cell.shortJa}」にはならない。`,
    cannotComeFromAnswersOnlyJa: `同じ答えでも、生年月日側の${axisId}が変わると「${cell.shortJa}」にはならない。`,
  };
}
