/**
 * Personal Free inference v2 — deterministic InsightSpec + narrative.
 * Questions and answer IDs are reused. Copy is cross-signal, not paraphrase.
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';

export const PERSONAL_FREE_INSIGHT_SPEC_VERSION = 'personal_free_insight_v2' as const;

export type PersonalInteractionId =
  | 'outer_move_inner_review'
  | 'prepared_then_private_recheck'
  | 'consult_then_solo_audit'
  | 'deadline_close_vs_observe'
  | 'fast_try_steady_distance'
  | 'wait_then_rebuild'
  | 'close_talk_vs_solo_recover'
  | 'start_decision_distance_default';

export type PersonalFreeInsightSpecV2 = {
  readonly id: string;
  readonly kind: 'personal_free_v2';
  readonly evidenceQuestionIds: readonly [
    'free.start_style',
    'free.decision_style',
    'free.recovery_style',
    'free.distance_style',
    'free.change_style',
  ];
  readonly signals: ExpressionAxes;
  readonly interactionId: PersonalInteractionId;
  readonly confidence: 'high' | 'medium';
  readonly headline: string;
  readonly internalTension: string;
  readonly behavioralPrediction: string;
  readonly whySynthesis: string;
  readonly premiumContinuation: string;
  readonly premiumOpenQuestion: string;
  readonly workScene: string;
  readonly relationScene: string;
  readonly changeScene: string;
  readonly strengthConditions: readonly [string, string, string];
  readonly loadConditions: readonly [string, string, string];
};

const EVIDENCE = [
  'free.start_style',
  'free.decision_style',
  'free.recovery_style',
  'free.distance_style',
  'free.change_style',
] as const;

const OPENING: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: 'その場では小さく動いて前に進んだように見えるのに、決めたあとに候補の点検が内側で続きやすい。動きが早い人に見られても、自分の中では「他も試すべきだった」が残りやすい。',
    deadline: '小さく試し始める一方で、区切りが見えた瞬間に結論へ寄せやすい。試している途中でも「いつまでに決めるか」が先に立ち、途中経過より締切側の自分が表に出やすい。',
    wait: '着手は早いのに、結論だけは置いてから出す。動いているように見えても、決めたこととしてはまだ確定していない時間が長い。',
  },
  map: {
    sort: '全体を揃えてから動くので慎重に見えるが、揃ったあとも比較が止まらず、準備が終わっても決めきれていない時間が出やすい。',
    deadline: '見通しを立ててから動く一方で、期限が来ると一気に締める。準備中は遅く見えて、締切直前だけ急に決まる、という緩急が出やすい。',
    wait: '全体を見てから動くのに、最後の決断はさらに間を置く。準備している人に見られても、内側では「まだ早い」が長く残る。',
  },
  ask: {
    sort: 'その場では周囲の話を取り込みながら合わせられるのに、一人になってから候補を並べ直しやすい。迷っているようには見られにくい一方、決定後の検討が長く残りやすい。',
    deadline: '人に聞いて材料を増やしつつ、区切りが来ると一気に決める。相談している間は開いているように見えて、締切が来ると急に閉じる。',
    wait: '周囲の視点を集めながらも、結論は置いてから出す。聞いているうちに進んでいるように見えても、本人の中ではまだ決めていない。',
  },
};

const TENSION_DISTANCE: Readonly<
  Record<StartTendency, Readonly<Record<DistanceTendency, string>>>
> = {
  try: {
    close: '近い関係ではその差を言葉にして調整しやすい一方、相手には「今さら考え直している」と見えやすい。',
    middle: '関わりの頻度は一定に保ちやすいので、内側の再点検が外には出にくい。落ち着いて見えるほど、自分の中では決定後の検討が続きやすい。',
    solo: '外では試しやすく、整えるときは一人の時間に戻りやすい。決めたあと一人になってから「本当にこれでよかった？」と再点検しやすい。',
  },
  map: {
    close: '物事は揃えてから進むのに、人との間では関わりの中で距離を話しながら整えやすい。計画する自分と、近い関係で調整する自分が場面で分かれやすい。',
    middle: '物事は整理してから進み、人との間では一定の間隔を保ちやすい。安定して見えるほど、内側の比較や準備が表に出にくい。',
    solo: '計画は立ててから動くのに、関わりのあとでは一人の時間で整える。表では段取りが先に見え、内側の再点検は一人になってから出やすい。',
  },
  ask: {
    close: '情報や対話を足して動きつつ、近い関係でも距離を話しながら整えやすい。合わせているように見えても、言葉にしたあとに自分の中で再点検が始まりやすい。',
    middle: '相談してから動く一方で、日常の関わりでは距離を一定に保ちやすい。外では開いているように見えて、内側の結論は別レイヤーで進みやすい。',
    solo: '外からは情報を集めやすい一方で、整えるときは一人の時間に戻りやすい。その場では合わせられても、決めたあと一人になってから再点検しやすい。',
  },
};

const TENSION_CHANGE: Readonly<
  Record<DecisionTendency, Readonly<Record<ChangeTendency, string>>>
> = {
  sort: {
    observe: '決めるときは比べるのに、変化の直後はまず様子を見る。比較で一度進んでも、予定が変わると「まだ見定めている」側に戻りやすい。',
    adjust: '比較して決めたあと、環境が変わると小さく合わせていく。大きな方針は守ったまま、細部だけを直し続ける時間が残りやすい。',
    rebuild: '比較で一度決めても、前提が崩れると組み直しに入りやすい。周囲には急な方向転換に見え、本人の中では「前提が変わったから」で一貫している。',
  },
  deadline: {
    observe: '区切りを置いて決める一方で、変化直後は観察から入る。締めたあとに予定が変わると、一度決めたことをすぐ動かさない時間が先に出やすい。',
    adjust: '基準を置いて決めたあと、変更点は小さく直していく。期限で閉じたように見えても、小さな直しが内側で続きやすい。',
    rebuild: '区切りで決めた内容でも、前提が変わると一度組み直す側に寄りやすい。締切で決めた人と、前提からやり直す人が同じ中にいる。',
  },
  wait: {
    observe: '決める前も変化のあともしばらく置く。迷っているように見られにくい一方、本人の中では「間」が二度重なりやすい。',
    adjust: '決めるときは置くのに、変化が来ると小さく合わせる側に切り替わりやすい。待っていた人が、急に実務側へ出る。',
    rebuild: '決めるときは置く一方で、大きな変化では組み直しに踏み込みやすい。静かだった人が、前提が崩れた瞬間だけ大きく動いて見えやすい。',
  },
};

const WORK_SCENE: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  try: {
    sort: '決めたことを送る前に、候補をもう一度並べ直す場面で出やすい。前に進んだように見えても、並べ直しが終わっていない。',
    deadline: 'まだ固まっていない話で小さく試しつつ、期限が先に立つ場面で出やすい。試している途中で結論側へ寄る。',
    wait: '着手は早いのに、即答を求められても一晩置いてから結論を返す場面で出やすい。動いていることと、決めたことがずれて見える。',
  },
  map: {
    sort: '新しい依頼の直後に手順を書き出したあと、候補が複数あると比較が始まって着手が遅れる場面で出やすい。',
    deadline: '全体を見渡してから動く一方、「いつまでに決めるか」を先に置くと、準備中は遅く締切直前だけ急に決まる場面で出やすい。',
    wait: '優先順位を書いてから動くのに、最後の判断だけ置いてしまう場面で出やすい。段取りしている人と、まだ決めていない人が同時にいる。',
  },
  ask: {
    sort: '判断材料が足りないとき関係者に確認したあと、一人で候補を並べ直す場面で出やすい。相談で進んだように見えても、決定は別時間に残る。',
    deadline: '共有を足して材料を増やしつつ、期限が来ると一気に閉じる場面で出やすい。開いていた話が、期限で急に終わる。',
    wait: '人に聞いて材料を増やしたあと、結論は置いてから返す場面で出やすい。聞いているうちに決まったように見られても、本人はまだ閉じていない。',
  },
};

const RELATION_SCENE: Readonly<Record<DistanceTendency, string>> = {
  close: '人との距離では、会話の中で「今は少し離れる／近づく」を言葉にした直後に、自分の中で言い方を再点検する場面が典型です。',
  middle: '人との距離では、連絡頻度を一定に保ちながら、内側の迷いだけを一人で抱える場面が典型です。安定して見えるほど、再点検が外に出にくい。',
  solo: '人との距離では、人と会ったあとに一人の時間を先に確保し、そこで「今の決め方でよかったか」を見直す場面が典型です。',
};

const CHANGE_SCENE: Readonly<Record<ChangeTendency, string>> = {
  observe: '予定変更の直後にすぐ組み替えず一日観察する場面で、表の静けさと内側の再点検が同時に出やすいです。',
  adjust: '変更点だけを小さく直して全体は崩さない場面で、方針は守っているのに細部の点検が長く残りやすいです。',
  rebuild: '予定や環境の変化では、前提が変わったときにスケジュールを一度組み直す場面で、周囲には急な方向転換に見えやすいです。',
};

const RECOVERY_LOAD: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い区切りが取れないと、同じ再点検が切れ目なく残りやすい。',
  shrink: 'やることの範囲を絞れないと、内側の検討だけが増えて手が止まりやすい。',
  scene: '場所や刺激を切り替えられないと、同じ検討ループから抜けにくい。',
};

const STRENGTH: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, readonly [string, string, string]>>>
> = {
  try: {
    sort: ['小さく試したあと、比較する材料が残っているとき', '途中経過を共有しても結論扱いされないとき', '短い区切りで点検を止められるとき'],
    deadline: ['試す余白と、決める区切りが両方見えるとき', '途中の試しが失敗扱いにならないとき', '締切の前に一度だけ見直す時間が取れるとき'],
    wait: ['動き出しと結論の時間を分けてよいとき', '即答を急かされないとき', '試した事実と、まだ決めていないことが両方言えるとき'],
  },
  map: {
    sort: ['全体の段取りを共有したあと、比べる時間が残っているとき', '準備と決定を別の段に置けるとき', '候補を減らす合意が先に取れるとき'],
    deadline: ['見通しを立てる時間と、締める期限が両方あるとき', '準備中の遅さが怠慢に見えないとき', '直前の決断が責めにならないとき'],
    wait: ['段取りと最終判断を分けてよいとき', '「まだ早い」が停滞に見えないとき', '準備の途中で結論を求められないとき'],
  },
  ask: {
    sort: ['途中経過を共有でき、一人で並べ直す時間も残るとき', '相談が決定と誤解されないとき', '確認先が増えても結論を急かされないとき'],
    deadline: ['材料を集める時間と、閉じる期限が両方見えるとき', '相談中の開きが優柔不断に見えないとき', '締切で閉じても後から責められないとき'],
    wait: ['聞いていることと、決めたことを分けて言えるとき', '即断を急かされないとき', '一人で置く時間が逃避に見えないとき'],
  },
};

const LOAD: Readonly<
  Record<DistanceTendency, Readonly<Record<ChangeTendency, readonly [string, string, string]>>>
> = {
  close: {
    observe: ['距離の線引きがはっきりしないまま関わりが続くとき', '様子を見る前にすぐ返事だけを求められるとき', '距離を言葉にすると拒否に読まれるとき'],
    adjust: ['距離の線引きがはっきりしないまま関わりが続くとき', '小さく直す余地なく大きな変更だけを求められるとき', '近い関係で見直すと「今さら」に見えるとき'],
    rebuild: ['距離の線引きがはっきりしないまま関わりが続くとき', '足し足しだけで前提の更新が許されないとき', '組み直しが相手への急変に見えるとき'],
  },
  middle: {
    observe: ['急な接近や急な離反が続くとき', '様子を見る前に即応だけを求められるとき', '一定間隔が「冷たい」に読まれるとき'],
    adjust: ['急な接近や急な離反が続くとき', '小さな修正の余地なく大転換だけを求められるとき', '内側の点検が外に出ず誤解が積もるとき'],
    rebuild: ['急な接近や急な離反が続くとき', '継ぎ足しだけで前提の更新が許されないとき', '静かな間隔のあとの組み直しが急変に見えるとき'],
  },
  solo: {
    observe: ['常時つながった状態が続くとき', '様子を見る前に即応だけを求められるとき', '一人の時間が逃避に読まれるとき'],
    adjust: ['常時つながった状態が続くとき', '小さな修正の余地なく大転換だけを求められるとき', '一人で直している間に関係が空転するとき'],
    rebuild: ['常時つながった状態が続くとき', '継ぎ足しだけで前提の更新が許されないとき', '一人で組み直した結果だけが急に共有されるとき'],
  },
};

function selectInteraction(axes: ExpressionAxes): {
  interactionId: PersonalInteractionId;
  confidence: 'high' | 'medium';
} {
  if (axes.start === 'ask' && (axes.distance === 'solo' || axes.distance === 'close')) {
    return { interactionId: 'consult_then_solo_audit', confidence: 'high' };
  }
  if (axes.start === 'map' && axes.distance === 'solo') {
    return { interactionId: 'prepared_then_private_recheck', confidence: 'high' };
  }
  if (axes.start === 'try' && (axes.decision === 'sort' || axes.decision === 'wait')) {
    return { interactionId: 'outer_move_inner_review', confidence: 'high' };
  }
  if (axes.start === 'try' && axes.distance === 'middle') {
    return { interactionId: 'fast_try_steady_distance', confidence: 'high' };
  }
  if (axes.decision === 'deadline' && axes.change === 'observe') {
    return { interactionId: 'deadline_close_vs_observe', confidence: 'high' };
  }
  if (axes.decision === 'wait' && axes.change === 'rebuild') {
    return { interactionId: 'wait_then_rebuild', confidence: 'high' };
  }
  if (
    (axes.distance === 'close' && axes.recovery === 'scene') ||
    (axes.distance === 'solo' && axes.recovery === 'pause')
  ) {
    return { interactionId: 'close_talk_vs_solo_recover', confidence: 'high' };
  }
  return { interactionId: 'start_decision_distance_default', confidence: 'medium' };
}

function whySynthesis(axes: ExpressionAxes, interactionId: PersonalInteractionId): string {
  const recovery = RECOVERY_LOAD[axes.recovery];
  switch (interactionId) {
    case 'outer_move_inner_review':
      return `始め方の早さと決め方の置き方が同時に動くため、表の前進と内側の再点検がずれやすい。${recovery}距離の取り方がそのずれを外に出すか、一人の時間へ隠すかを分けます。`;
    case 'prepared_then_private_recheck':
      return `始め方で全体を揃えてから動く一方、人との距離では一人で整える側に寄る。準備している自分と、決めたあとに見直す自分が場面で分かれやすい。${recovery}`;
    case 'consult_then_solo_audit':
      return `始め方で周囲の視点を集めつつ、距離の整え方が一人または近い関係の言葉に寄る。合わせたあとに自分の結論が遅れて残る。${recovery}`;
    case 'fast_try_steady_distance':
      return `始め方は早いのに、人との距離では間隔を一定に保つ。外の速さと関係の安定が同時に出るため、内側の決め方の置き方が見えにくい。${recovery}`;
    case 'deadline_close_vs_observe':
      return `決め方では区切りで閉じるのに、変化への向き合い方ではまず様子を見る。締めたあとに予定が変わると、閉じた判断と観察が衝突しやすい。${recovery}`;
    case 'wait_then_rebuild':
      return `決め方では間を置くのに、大きな変化では前提から組み直す。静かだった人が、前提が崩れたときだけ大きく動いて見えやすい。${recovery}`;
    case 'close_talk_vs_solo_recover':
      return `人との距離の整え方と回復の取り方が別レイヤーで動く。始め方や決め方で進めたあとに、回復側の切り替えが追いつかないと、同じ緊張が残りやすい。`;
    default:
      return `始め方と決め方が一組になり、人との距離と変化への反応がもう一組になる。表に出る順序と、内側で終わる順序が同じではない。${recovery}`;
  }
}

function premiumContinuation(axes: ExpressionAxes, primarySceneLabelJa: string): string {
  return [
    `ここまでで見えるのは、「${primarySceneLabelJa}」に出やすい動きの型です。`,
    `まだ見えていないのは、同じ型が仕事・距離・変化の場面でどう分岐するか、${LOAD[axes.distance][axes.change][2]}に何から崩れるかです。`,
    `プレミアムでは、今のパターンを六つの場面に渡して読み返し、${RECOVERY_LOAD[axes.recovery].replace(/。$/u, '')}ところまで一つの流れにします。`,
  ].join('');
}

function premiumOpenQuestion(axes: ExpressionAxes): string {
  const live = STRENGTH[axes.start][axes.decision][0];
  const heavy = LOAD[axes.distance][axes.change][0];
  return `${live}は流れがつながるのに、${heavy}にその動きが止まります。この差が、距離の整え方と変化の最初の一手のどちらから来るのかは、場面を分けて見ないと決まりません。`;
}

function primarySceneLabel(axes: ExpressionAxes): string {
  if (axes.start === 'map' || axes.decision === 'sort') return '仕事や判断';
  if (axes.distance === 'close' || axes.distance === 'solo') return '人との距離';
  return '予定や環境の変化';
}

export function buildPersonalFreeInsightSpecV2(
  axes: ExpressionAxes,
): PersonalFreeInsightSpecV2 {
  const selected = selectInteraction(axes);
  const headline = OPENING[axes.start][axes.decision];
  const internalTension = `${TENSION_DISTANCE[axes.start][axes.distance]}${TENSION_CHANGE[axes.decision][axes.change]}`;
  const workScene = WORK_SCENE[axes.start][axes.decision];
  const relationScene = RELATION_SCENE[axes.distance];
  const changeScene = CHANGE_SCENE[axes.change];
  const label = primarySceneLabel(axes);
  return {
    id: `${PERSONAL_FREE_INSIGHT_SPEC_VERSION}:${selected.interactionId}:${axes.start}-${axes.decision}-${axes.recovery}-${axes.distance}-${axes.change}`,
    kind: 'personal_free_v2',
    evidenceQuestionIds: EVIDENCE,
    signals: axes,
    interactionId: selected.interactionId,
    confidence: selected.confidence,
    headline,
    internalTension,
    behavioralPrediction:
      label === '仕事や判断'
        ? workScene
        : label === '人との距離'
          ? relationScene
          : changeScene,
    whySynthesis: whySynthesis(axes, selected.interactionId),
    premiumContinuation: premiumContinuation(axes, label),
    premiumOpenQuestion: premiumOpenQuestion(axes),
    workScene,
    relationScene,
    changeScene,
    strengthConditions: STRENGTH[axes.start][axes.decision],
    loadConditions: LOAD[axes.distance][axes.change],
  };
}
