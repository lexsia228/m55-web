/**
 * Personal Free manifestation v4 — observable behavior from fused birth × answers.
 * Does not invent a second calendar. Does not change questionnaire semantics.
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
  /距離を整え|一定の間隔|接点の入口|基調の寄り|土台では|内側では|土台の接点|基調の速さ/;

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
  Record<StartTendency, Readonly<Record<StartTendency, { shortJa: string; manifestationJa: string }>>>
> = {
  try: {
    try: {
      shortJa: '動いたあとに一人で試作を閉じる',
      manifestationJa:
        '小さく試し始めたあとも、決めたこととしてはまだ閉じていない。動いている人に見られやすいが、実際の確定は一人で試作を見直したあとに残る。',
    },
    map: {
      shortJa: '先に動かしてから段取りを描く',
      manifestationJa:
        '先に一つ動かしたあとに、全体の段取りを作り直している。試作している人に見られても、頭の中ではまだ地図を描いている。',
    },
    ask: {
      shortJa: '動いたあとに見立てを足す',
      manifestationJa:
        '試し始めたあとに人へ確認を取りに戻る。進んでいるように見られても、見立てを足してから閉じたい。',
    },
  },
  map: {
    try: {
      shortJa: '揃える前に手が先に出る',
      manifestationJa:
        '全体を揃えてから動くつもりが、先に小さく手を出している。動きが早い人に見られても、本人の中ではまだ全体が見えていない。',
    },
    map: {
      shortJa: '準備が終わっても比較表が残る',
      manifestationJa:
        '段取りを終えたあとも比較表を開き直している。準備ができた人に見られても、決める瞬間だけが残っている。',
    },
    ask: {
      shortJa: '一人で揃えたあとに見立てを足す',
      manifestationJa:
        '一人で段取りしたあとに、人の見立てを足しにいく。決まってから相談しているように見られても、材料が足りなくて戻っている。',
    },
  },
  ask: {
    try: {
      shortJa: '相談のあと一人で決める',
      manifestationJa:
        '人に相談しているときには、もう気持ちが決まっているように見られやすい。でも実際には、その場で決めているのではなく、人と話したあと一人になった時間に最終判断を作っている。',
    },
    map: {
      shortJa: '相談のあと一人で並べ直す',
      manifestationJa:
        '相談の場では合わせているように見られやすい。一人になってから候補を並べ直し、そこで初めて方針が固まる。',
    },
    ask: {
      shortJa: '話したあとの一人の時間で閉じる',
      manifestationJa:
        '人と話しているうちに進んだように見られやすい。実際の決定は、会話が終わったあとの一人の時間に残る。',
    },
  },
};

const DECISION_MANIFEST: Readonly<
  Record<
    DecisionTendency,
    Readonly<Record<DecisionTendency, { shortJa: string; manifestationJa: string }>>
  >
> = {
  sort: {
    sort: {
      shortJa: '選んだあとも候補の点検が残る',
      manifestationJa:
        '比べて決めたあとに「他も見るべきだった」が残る。選んだ人に見られても、候補の点検は終わっていない。',
    },
    deadline: {
      shortJa: '比べている途中で区切りに切る',
      manifestationJa:
        '比較している途中で締切側に切り替わる。締めた人に見られても、頭の中ではまだ並べている。',
    },
    wait: {
      shortJa: '比べたあとに一晩置く',
      manifestationJa:
        '比べたあとに一晩置く。待っている人に見られても、比較は止まっていない。',
    },
  },
  deadline: {
    sort: {
      shortJa: '期限が先に立ちつつ並べ直す',
      manifestationJa:
        '「いつまでに」が先に立ちつつ、候補を並べ直している。急いで決めた人に見られても、実際には比較が続いている。',
    },
    deadline: {
      shortJa: '閉じた直後に一人で見直す',
      manifestationJa:
        '区切りで閉じたあとに、途中経過を一人で見直す。決まった人に見られても、締めた直後の再点検が残る。',
    },
    wait: {
      shortJa: '締めたあとに置く時間が来る',
      manifestationJa:
        '期限で閉じたあとに「早かったのでは」が残る。決めた人に見られても、置きたかった時間が後から来る。',
    },
  },
  wait: {
    sort: {
      shortJa: '置くつもりが比較を始める',
      manifestationJa:
        '置くつもりが比較表を作り始める。待っている人に見られても、頭の中では並べ始めている。',
    },
    deadline: {
      shortJa: '置くつもりが区切りで閉じる',
      manifestationJa:
        '置くつもりが区切りで閉じる。締めた人に見られても、決めたあとに「置く時間が欲しかった」が残る。',
    },
    wait: {
      shortJa: '動いて見えても結論は翌朝',
      manifestationJa:
        '動いているように見られても、結論だけは翌朝まで持っていく。決めたこととしてはまだ確定していない。',
    },
  },
};

const DISTANCE_MANIFEST: Readonly<
  Record<
    DistanceTendency,
    Readonly<Record<DistanceTendency, { shortJa: string; manifestationJa: string }>>
  >
> = {
  close: {
    close: {
      shortJa: '距離を言葉にした直後に言い方をやり直す',
      manifestationJa:
        '会話の中で距離を言葉にした直後に、言い方を一人でやり直している。丁寧に見えるほど、「今さら考え直している」と見られやすい。',
    },
    middle: {
      shortJa: '会話では合わせて帰宅後に間隔を戻す',
      manifestationJa:
        '会話では合わせているように見られやすい。会ったあとに、返事のタイミングを一人で戻したくなる。',
    },
    solo: {
      shortJa: 'その場では近く、帰宅後に一人で点検する',
      manifestationJa:
        'その場では近い関係を保っているように見られやすい。会食や会議のあと、一人になってから距離を点検している。',
    },
  },
  middle: {
    close: {
      shortJa: '普段は間を取り、会話では言葉で寄せる',
      manifestationJa:
        '普段は間を取っているのに、会話の中では距離を言葉にしてしまう。丁寧に見える一方、あとから「近づきすぎた」が残る。',
    },
    middle: {
      shortJa: '安定して見えるほど迷いを一人で抱える',
      manifestationJa:
        '安定して見えるほど、迷いを一人で抱えたまま連絡だけ続けている。離れていないように見られても、整えは会話の外で起きている。',
    },
    solo: {
      shortJa: '頻度は保って整えは一人の時間に寄る',
      manifestationJa:
        '連絡は続いているように見られやすい。実際の整えは、会ったあとの一人の時間に寄る。',
    },
  },
  solo: {
    close: {
      shortJa: 'その場では寄せ、帰宅後に一人の時間が先に立つ',
      manifestationJa:
        '一人で整えてから戻りたいのに、その場では距離を言葉にして合わせている。近い関係を保っているように見られても、帰宅後に一人の時間が先に立つ。',
    },
    middle: {
      shortJa: '一人で整えたいのに頻度だけ見せる',
      manifestationJa:
        '一人で整えたいのに、返事の速さだけ合わせている。安定して見えるほど、一人の時間が足りていない。',
    },
    solo: {
      shortJa: '会ったあとに一人で決め方を見直す',
      manifestationJa:
        '会食や会議のあとに一人の時間を先に確保し、そこで「今の決め方でよかったか」を見直している。',
    },
  },
};

const CHANGE_MANIFEST: Readonly<
  Record<
    ChangeTendency,
    Readonly<Record<ChangeTendency, { shortJa: string; manifestationJa: string }>>
  >
> = {
  observe: {
    observe: {
      shortJa: '動かない人に見えて一日置いてから組み替える',
      manifestationJa:
        '予定が変わった直後は動かない人に見られやすい。実際には一日様子を見てから組み替える。',
    },
    adjust: {
      shortJa: '見定めたいのに細部だけ直し始める',
      manifestationJa:
        '様子を見たいのに、細部だけ直し始めている。直している人に見られても、方針はまだ見定めている。',
    },
    rebuild: {
      shortJa: '普段は静かで前提崩壊時だけ組み直す',
      manifestationJa:
        '普段は静かだが、前提が崩れたときだけスケジュールを一度捨てて組み直す。急な人に見られても、本人の中では「前提が変わった」で一貫している。',
    },
  },
  adjust: {
    observe: {
      shortJa: '直し始めているのに止まって見える',
      manifestationJa:
        '差分修正を始めたいのに、まず止まって見える。止まっている人に見られても、頭の中では直し始めている。',
    },
    adjust: {
      shortJa: '方針は守ったまま細部だけ直し続ける',
      manifestationJa:
        '大きな方針は守ったまま、細部だけを直し続けている。進んでいるように見られても、点検が終わっていない。',
    },
    rebuild: {
      shortJa: '小さく直している延長で方向転換に見える',
      manifestationJa:
        '小さく直している延長で、周囲には急な方向転換に見える組み直しが入る。本人の中では継ぎ足しの先にある。',
    },
  },
  rebuild: {
    observe: {
      shortJa: '組み直す前提を一日置いてから出す',
      manifestationJa:
        '組み直したいのに、表では一日置いている。静かに見える一方、前提が変わったことはもう決めている。',
    },
    adjust: {
      shortJa: '小さく直している人に見えてやり直すつもり',
      manifestationJa:
        '小さく直している人に見られても、本人は一度やり直すつもりで手を動かしている。',
    },
    rebuild: {
      shortJa: '前提崩壊時の組み直しが急に見える',
      manifestationJa:
        '予定が崩れたときに、周囲には急な方向転換に見える組み直しが入る。本人の中では「前提が変わったから」で一貫している。',
    },
  },
};

const RECOVERY_MANIFEST: Readonly<
  Record<
    RecoveryTendency,
    Readonly<Record<RecoveryTendency, { shortJa: string; manifestationJa: string }>>
  >
> = {
  pause: {
    pause: {
      shortJa: '短い区切りのあとに再点検が残る',
      manifestationJa:
        '短く区切ったあとも、頭の中では同じ件が残っている。休んだ人に見られても、切れ目が取れないと再点検が止まらない。',
    },
    shrink: {
      shortJa: '止めたいのに範囲を減らして戻る',
      manifestationJa:
        '一回止めたいのに、やることの幅を落として戻っている。仕事を減らしている人に見られても、先に欲しいのは短い切れ目である。',
    },
    scene: {
      shortJa: '休みたいのに場所を変えて戻る',
      manifestationJa:
        '短い休みが先に欲しいのに、場所を変えて戻っている。気分転換している人に見られても、切れ目自体が足りていない。',
    },
  },
  shrink: {
    pause: {
      shortJa: '休んでいる人に見えて幅を絞りたい',
      manifestationJa:
        '休んでいるように見られても、やることの幅を絞りたい。止まっている時間が、実は範囲の見直しになっている。',
    },
    shrink: {
      shortJa: '広げたままだと手が止まる',
      manifestationJa:
        '抱え直すときに、まず件数を落とす。広げたまま続けると、手が止まりやすい。',
    },
    scene: {
      shortJa: '刺激を変えている人に見えて件数を落とす',
      manifestationJa:
        '刺激を変えている人に見られても、先に落としたいのは仕事の幅である。場所を変えたあとも、件数はそのまま残りやすい。',
    },
  },
  scene: {
    pause: {
      shortJa: '止まっている人に見えて場面を変えたい',
      manifestationJa:
        '止まっている人に見られても、場所や刺激を変えたい。短い休みだけでは、同じ部屋の検討から抜けにくい。',
    },
    shrink: {
      shortJa: '仕事を減らしている人に見えて場面を変える',
      manifestationJa:
        '仕事を減らしているように見られても、場面そのものを変えたい。件数を落としたあとも、同じ場所に居続けると戻りにくい。',
    },
    scene: {
      shortJa: '同じ場所に居続けると検討が抜けない',
      manifestationJa:
        '場面の刺激を変えて戻る。同じ場所に居続けると、検討のループから抜けにくい。',
    },
  },
};

const SCENE: Readonly<Record<ExpressionAxisId, string>> = {
  start: '買い物や仕事の方針を、人に話した直後の一人の時間で確かめやすい。',
  decision: '候補を選んだあと、相手に伝える前の短い時間でやり直しやすい。',
  distance: '会話のあと帰宅して、一人になった部屋で今の距離を点検しやすい。',
  change: '予定が急に崩れた日の夜に、表の対応と一人の組み直しが分かれやすい。',
  recovery: '疲れが残った週末の午前に、休み方を一度決めてからまた組み替えやすい。',
};

function cellFor(
  axisId: ExpressionAxisId,
  birth: ExpressionAxes,
  answers: ExpressionAxes,
): { shortJa: string; manifestationJa: string } {
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
  if (!/場面|会話|仕事|予定|買い物|帰宅|会議|会食|候補|週末/.test(text)) flags.push('NO_SCENE');
  if (/土台では|今回の答えでは/.test(text)) flags.push('NO_SURPRISE');
  return flags;
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
  const manifestationJa = second
    ? `${cell.manifestationJa}あわせて、${second.shortJa}ことも起きやすい。`
    : cell.manifestationJa;
  return {
    patternId,
    axisId,
    birthTendency,
    answerTendency,
    manifestationJa,
    sceneCandidateJa: SCENE[axisId],
    shortJa: second ? `${cell.shortJa}／${second.shortJa}` : cell.shortJa,
    userDidNotDirectlyAnswerThis: true,
    cannotComeFromDobOnlyJa: `同じ生年月日でも、今回の${axisId}の答えが変わると「${cell.shortJa}」にはならない。`,
    cannotComeFromAnswersOnlyJa: `同じ答えでも、生年月日側の${axisId}が変わると「${cell.shortJa}」にはならない。`,
  };
}
