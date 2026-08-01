/**
 * Free-result depth analysis — multi-axis + DOB relational interpretation.
 * Pure / deterministic. Does not alter answer IDs, DOB algorithm, or engine.
 * Public copy must not concatenate selected questionnaire labels.
 */

import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import type {
  AlignDivergeItem,
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  ExpressionAxisId,
  RecoveryTendency,
  Result,
  StartTendency,
} from '../individualization/types';
import {
  resolveDobAxes,
  resolveFreeAxes,
  type FreeFiveViewInput,
} from './buildFreeFiveViewCompositionV1';

export const FREE_DEPTH_ANALYSIS_VERSION = 'free-depth-v1' as const;

export type FreeDepthAnalysisV1 = {
  headlineJa: string;
  conclusionJa: string;
  reasonsJa: readonly [string, string, string];
  hiddenSideJa: string;
  strengthConditionsJa: readonly string[];
  loadConditionsJa: readonly string[];
  scenesJa: {
    workJa: string;
    relationJa: string;
    changeJa: string;
  };
  /** Concise free-result surface (≈35–45% shorter than full blocks). */
  conciseWhyJa: readonly [string, string];
  primarySceneJa: string;
  primarySceneLabelJa: string;
  premiumOpenLoopJa: string;
  premiumLockedHeadingsJa: readonly string[];
  primaryAxes: readonly ExpressionAxisId[];
  secondaryAxes: readonly ExpressionAxisId[];
  contrastAxes: readonly ExpressionAxisId[];
  meta: {
    version: typeof FREE_DEPTH_ANALYSIS_VERSION;
  };
};

const AXIS_TITLE_JA: Readonly<Record<ExpressionAxisId, string>> = {
  start: '始め方',
  decision: '決め方',
  recovery: '回復の仕方',
  distance: '人との距離',
  change: '変化への向き合い方',
};

const START_PATTERN: Readonly<Record<StartTendency, string>> = {
  map: '全体を見渡してから動く',
  try: '小さく試してから進む',
  ask: '情報や周囲の視点を集めてから動く',
};

const DECISION_PATTERN: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を比べてから決める',
  deadline: '期限や基準を置いて決める',
  wait: '少し間を置いてから決める',
};

/** Single headline clause — start + decision without repeating 傾向. */
const HEADLINE_COMBINED: Readonly<
  Record<StartTendency, Readonly<Record<DecisionTendency, string>>>
> = {
  map: {
    sort: '全体を見渡し、候補を比べてから動く',
    deadline: '全体を見渡し、期限を置いてから決める',
    wait: '全体を見渡し、少し間を置いてから決める',
  },
  try: {
    sort: '小さく試し、候補を比べてから決める',
    deadline: '小さく試し、期限を置いてから決める',
    wait: '小さく試し、少し間を置いてから決める',
  },
  ask: {
    sort: '周囲の視点を集め、候補を比べてから決める',
    deadline: '周囲の視点を集め、期限を置いてから決める',
    wait: '周囲の視点を集め、少し間を置いてから決める',
  },
};

const START_REASON: Readonly<Record<StartTendency, string>> = {
  map: 'まず全体を確認してから選ぶ',
  try: 'まず小さく試してから進む',
  ask: 'まず周囲の視点を集めてから選ぶ',
};

const DECISION_REASON: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を比べてから選ぶ',
  deadline: '期限や基準を置いてから選ぶ',
  wait: '少し間を置いてから選ぶ',
};

const DISTANCE_REASON: Readonly<Record<DistanceTendency, string>> = {
  close: '関わりの中で間合いを見直してから整える',
  middle: '一定の距離を保ちながら続ける',
  solo: '一人の時間で整えてから戻る',
};

const CHANGE_REASON: Readonly<Record<ChangeTendency, string>> = {
  observe: 'いったん状況を見直してから整える',
  adjust: '変わった点だけを合わせて進める',
  rebuild: '前提から組み直して整える',
};

const RECOVERY_PATTERN: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い区切りで立て直す',
  shrink: 'やることの範囲を狭くする',
  scene: '場面の刺激を変えて戻る',
};

const DISTANCE_PATTERN: Readonly<Record<DistanceTendency, string>> = {
  close: '関わりの中で間合いを整え直す',
  middle: '近すぎない間隔を保ちながら続ける',
  solo: '単独の時間で整えてから戻る',
};

const CHANGE_PATTERN: Readonly<Record<ChangeTendency, string>> = {
  observe: '直後は観察してから動く',
  adjust: '差分だけを合わせていく',
  rebuild: '前提から組み直して整える',
};

const START_WORK: Readonly<Record<StartTendency, string>> = {
  map: '新しい依頼が来た直後に、手順と優先順位を書き出してから着手する場面',
  try: '仕様が固まっていない課題で、小さな試作を一つ作って反応を見る場面',
  ask: '判断材料が足りないとき、関係者に確認や共有を足してから動く場面',
};

const DECISION_WORK: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補が複数あるときに比較表を作ってから選ぶ場面',
  deadline: '「いつまでに決めるか」を先に置いてから判断する場面',
  wait: '即答を求められても、一晩置いてから結論を返す場面',
};

const DISTANCE_SCENE: Readonly<Record<DistanceTendency, string>> = {
  close: '会話の中で「今は少し離れる／近づく」を言葉にして調整する場面',
  middle: '連絡頻度や同席の時間を一定に保ちながら関係を続ける場面',
  solo: '会食や会議のあとに、一人で過ごす時間を先に確保する場面',
};

const CHANGE_SCENE: Readonly<Record<ChangeTendency, string>> = {
  observe: '予定変更の直後に、すぐ組み替えず一日観察する場面',
  adjust: '変更点だけを差分修正して、全体は崩さず進める場面',
  rebuild: '前提が変わったときに、スケジュールを白紙にして組み直す場面',
};

const STRENGTH_BY_START: Readonly<Record<StartTendency, string>> = {
  map: '着手前に全体像を共有できるとき',
  try: '小さく試せる余白があるとき',
  ask: '確認先や情報が手元に増えるとき',
};

const STRENGTH_BY_DECISION: Readonly<Record<DecisionTendency, string>> = {
  sort: '比較できる材料が揃っているとき',
  deadline: '判断の区切りが見えているとき',
  wait: '即断を急かされないとき',
};

const STRENGTH_BY_RECOVERY: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い休みや区切りが取れるとき',
  shrink: 'やることの範囲を絞れるとき',
  scene: '場所や刺激を切り替えられるとき',
};

const LOAD_BY_START: Readonly<Record<StartTendency, string>> = {
  map: '準備なしの即着手だけが続くとき',
  try: '試作の余地なく完成形だけを求められるとき',
  ask: '相談先がなく一人で抱え込むとき',
};

const LOAD_BY_DISTANCE: Readonly<Record<DistanceTendency, string>> = {
  close: '境界が曖昧なまま関わりが続くとき',
  middle: '急な接近や急な離反が続くとき',
  solo: '常時つながった状態が続くとき',
};

const LOAD_BY_CHANGE: Readonly<Record<ChangeTendency, string>> = {
  observe: '様子を見る前に即応だけを求められるとき',
  adjust: '小さな修正の余地なく大転換だけを求められるとき',
  rebuild: '継ぎ足しだけで前提の更新が許されないとき',
};

/** Cross-axis tension lines — relational, not label paste. */
const TENSION_START_DISTANCE: Readonly<
  Record<StartTendency, Partial<Record<DistanceTendency, string>>>
> = {
  try: {
    middle: '動きは早いのに、関わりでは距離を一定に保ちやすい、という見え方の差が出ます。',
    solo: '外では試しやすく、内側では一人の時間で整えてから戻る、という切り替えが見えます。',
    close: '試しながら進む一方で、近い関係では言葉で距離を整えやすい、という二層があります。',
  },
  map: {
    close: '全体を整えてから動く一方で、人との間では関わりの中で調整しやすい、という差があります。',
    middle: '物事は整理してから進み、人との間では一定距離を保ちやすい、という安定の取り方です。',
    solo: '計画は立ててから動くのに、関わりのあとでは一人の時間で整える、という順序が見えます。',
  },
  ask: {
    solo: '外からは情報を集めやすい一方で、整えるときは一人の時間に戻りやすい、という対比があります。',
    close: '情報や対話を足して動きつつ、近い関係でも距離を話しながら整えやすい、という重なりがあります。',
    middle: '相談してから動く一方で、日常の関わりでは距離を一定に保ちやすい、というバランスです。',
  },
};

const TENSION_DECISION_CHANGE: Readonly<
  Record<DecisionTendency, Partial<Record<ChangeTendency, string>>>
> = {
  sort: {
    observe: '決めるときは比べるのに、変化の直後はまず様子を見る、という順番の差が出ます。',
    adjust: '比較して決めたあと、環境が変わると小さく合わせていく動きが続きやすいです。',
    rebuild: '比較で一度決めても、前提が崩れると組み直しに入りやすい、という切り替えがあります。',
  },
  deadline: {
    observe: '区切りを置いて決める一方で、変化直後は観察から入る、という緩急があります。',
    adjust: '基準を置いて決めたあと、変更点は小さく直していく動きが出やすいです。',
    rebuild: '区切りで決めた内容でも、前提が変わると一度組み直す側に寄りやすいです。',
  },
  wait: {
    observe: '決める前も変化のあともしばらく置く、という一貫した「間」の使い方です。',
    adjust: '決めるときは置くのに、変化が来ると小さく合わせる側に切り替わりやすいです。',
    rebuild: '決めるときは置く一方で、大きな変化では組み直しに踏み込みやすい、という振れ幅があります。',
  },
};

const DOB_VS_FREE: Readonly<
  Record<ExpressionAxisId, Readonly<Record<string, string>>>
> = {
  start: {
    map: '生まれ持った土台は、先に見通しを立ててから動く側に寄りやすいです。',
    try: '生まれ持った土台は、小さく試してから進む側に寄りやすいです。',
    ask: '生まれ持った土台は、情報や対話を足してから動く側に寄りやすいです。',
  },
  decision: {
    sort: '土台側の決め方は、材料を並べて比べる側に寄りやすいです。',
    deadline: '土台側の決め方は、区切りを置いて決める側に寄りやすいです。',
    wait: '土台側の決め方は、少し間を置いてから決める側に寄りやすいです。',
  },
  recovery: {
    pause: '土台側の回復は、短い区切りで立て直す側に寄りやすいです。',
    shrink: '土台側の回復は、やることの範囲を小さくする側に寄りやすいです。',
    scene: '土台側の回復は、場面を切り替えて戻る側に寄りやすいです。',
  },
  distance: {
    close: '土台側の距離感は、関わりの中で整え直す側に寄りやすいです。',
    middle: '土台側の距離感は、一定の距離を保つ側に寄りやすいです。',
    solo: '土台側の距離感は、一人の時間で整える側に寄りやすいです。',
  },
  change: {
    observe: '土台側の変化への反応は、まず様子を見る側に寄りやすいです。',
    adjust: '土台側の変化への反応は、小さく合わせる側に寄りやすいです。',
    rebuild: '土台側の変化への反応は、一度組み直す側に寄りやすいです。',
  },
};

function assertNoInternalLeak(text: string): void {
  for (const token of [
    'free.',
    'strain__',
    'recovery__',
    'paid_ch',
    'gmfn-',
    'selectors-v',
    'fp-v1',
    'dal-v1',
    '保存版',
    '月の前半',
    '月の後半',
    '月初め',
    'してください',
    'するとよい',
    'しましょう',
  ]) {
    if (text.includes(token)) {
      throw new Error(`forbidden or internal token in free-depth copy: ${token}`);
    }
  }
}

function sortByPriority(items: readonly AlignDivergeItem[]): AlignDivergeItem[] {
  const order: ExpressionAxisId[] = [
    'distance',
    'recovery',
    'decision',
    'start',
    'change',
  ];
  return [...items].sort(
    (a, b) => order.indexOf(a.axisId) - order.indexOf(b.axisId),
  );
}

function buildHeadline(axes: ExpressionAxes): string {
  const combined =
    HEADLINE_COMBINED[axes.start][axes.decision] ??
    `${START_PATTERN[axes.start]}、${DECISION_PATTERN[axes.decision]}`;
  return `${combined}傾向が、いま強く表れています。`;
}

function buildConclusion(
  axes: ExpressionAxes,
  diverge: readonly AlignDivergeItem[],
  align: readonly AlignDivergeItem[],
): string {
  const s1 = `${START_PATTERN[axes.start]}進み方と、${DECISION_PATTERN[axes.decision]}決め方が同時に見えています。`;
  const s2 = `そこに${DISTANCE_PATTERN[axes.distance]}関わり方と、${CHANGE_PATTERN[axes.change]}変化への反応が重なると、「動き出し」と「整え方」がセットで表れやすい状態です。`;
  const topDiverge = sortByPriority(diverge)[0];
  let s3: string;
  if (topDiverge) {
    s3 = `一方で${AXIS_TITLE_JA[topDiverge.axisId]}では、いまの答えと生まれ持った土台の寄り方がずれており、表面上の一貫性だけでは見えにくい緊張があります。`;
  } else {
    const topAlign = sortByPriority(align)[0];
    const axis = topAlign?.axisId ?? 'recovery';
    s3 = `${AXIS_TITLE_JA[axis]}と回復の取り方（${RECOVERY_PATTERN[axes.recovery]}）が土台側とも重なりやすく、変化のあとでも同じリズムを保ちやすい状態です。`;
  }
  const s4 = `これは良し悪しの判定ではなく、仕事の着手・人との間・予定変更の三場面で出やすい組み合わせの読みです。`;
  return `${s1}${s2}${s3}${s4}`;
}

function buildReasons(
  axes: ExpressionAxes,
  diverge: readonly AlignDivergeItem[],
  align: readonly AlignDivergeItem[],
): [string, string, string] {
  const r1 = `新しいことを始めるときも、何かを決めるときも、${START_REASON[axes.start]}／${DECISION_REASON[axes.decision]}回答が重なっていました。`;
  const r2 = `人との距離や予定の変化に対しても、すぐに反応するより、${DISTANCE_REASON[axes.distance]}／${CHANGE_REASON[axes.change]}回答が選ばれています。`;
  const topDiverge = sortByPriority(diverge)[0];
  const topAlign = sortByPriority(align)[0];
  let r3: string;
  if (topDiverge) {
    const dobLine =
      DOB_VS_FREE[topDiverge.axisId][String(topDiverge.dobTendency)] ??
      '生まれ持った土台には、別の寄り方があります。';
    r3 = `${AXIS_TITLE_JA[topDiverge.axisId]}では、いまの答えと土台側の寄り方がずれています。${dobLine}`;
  } else if (topAlign) {
    r3 = `${AXIS_TITLE_JA[topAlign.axisId]}では、いまの答えと土台側の寄り方が近く、${RECOVERY_PATTERN[axes.recovery]}回復の取り方とも食い違いにくい読みです。`;
  } else {
    r3 = `回復の取り方（${RECOVERY_PATTERN[axes.recovery]}）が、始め方や距離の取り方と食い違いにくく、負荷のあとも同じリズムへ戻りやすい読みです。`;
  }
  return [r1, r2, r3];
}

function buildHiddenSide(
  axes: ExpressionAxes,
  diverge: readonly AlignDivergeItem[],
): string {
  const startDistance =
    TENSION_START_DISTANCE[axes.start][axes.distance] ??
    `${START_PATTERN[axes.start]}動きと、${DISTANCE_PATTERN[axes.distance]}関わり方が、場面によって別レイヤーで動きます。`;
  const decisionChange =
    TENSION_DECISION_CHANGE[axes.decision][axes.change] ??
    `${DECISION_PATTERN[axes.decision]}決め方と、${CHANGE_PATTERN[axes.change]}変化への反応に、緩急の差が出ます。`;
  const topDiverge = sortByPriority(diverge)[0];
  const dobContrast = topDiverge
    ? `${AXIS_TITLE_JA[topDiverge.axisId]}では、いまの答えが土台側の寄り方とずれており、自分では「いつもこう」と思っている動きが、場面で分かれて見えることがあります。`
    : `いまの五つの答えは互いに大きく矛盾していません。それでも回復（${RECOVERY_PATTERN[axes.recovery]}）を後回しにすると、同じ強みが負荷として残りやすい一面があります。`;
  return `${startDistance}${decisionChange}${dobContrast}`;
}

function buildStrengthConditions(axes: ExpressionAxes): string[] {
  return [
    STRENGTH_BY_START[axes.start],
    STRENGTH_BY_DECISION[axes.decision],
    STRENGTH_BY_RECOVERY[axes.recovery],
  ];
}

function buildLoadConditions(axes: ExpressionAxes): string[] {
  return [
    LOAD_BY_START[axes.start],
    LOAD_BY_DISTANCE[axes.distance],
    LOAD_BY_CHANGE[axes.change],
  ];
}

function buildScenes(axes: ExpressionAxes): FreeDepthAnalysisV1['scenesJa'] {
  return {
    workJa: `仕事や判断では、${START_WORK[axes.start]}や、${DECISION_WORK[axes.decision]}が重なりやすいです。材料や区切りがあるほど、同じパターンがはっきり出ます。`,
    relationJa: `人との距離では、${DISTANCE_SCENE[axes.distance]}が典型です。関わりが続いたあとにどう整えるかが、疲れの残り方を分けやすいです。`,
    changeJa: `予定や環境の変化では、${CHANGE_SCENE[axes.change]}が出やすいです。変化の大きさより、「最初の一手」の置き方に個性が表れます。`,
  };
}

function trimReason(text: string, maxLen = 96): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf('。');
  if (lastPeriod > maxLen * 0.5) return cut.slice(0, lastPeriod + 1);
  return `${cut}…`;
}

function pickPrimaryScene(axes: ExpressionAxes): { labelJa: string; bodyJa: string } {
  const scenes = buildScenes(axes);
  const candidates: { weight: number; labelJa: string; bodyJa: string }[] = [
    { weight: axes.start === 'map' || axes.decision === 'sort' ? 2 : 1, labelJa: '仕事や判断', bodyJa: scenes.workJa },
    { weight: axes.distance === 'close' || axes.distance === 'solo' ? 2 : 1, labelJa: '人との距離', bodyJa: scenes.relationJa },
    { weight: axes.change === 'observe' || axes.change === 'rebuild' ? 2 : 1, labelJa: '予定や環境の変化', bodyJa: scenes.changeJa },
  ];
  candidates.sort((a, b) => b.weight - a.weight);
  return { labelJa: candidates[0]!.labelJa, bodyJa: candidates[0]!.bodyJa };
}

function buildPremiumOpenLoop(_axes: ExpressionAxes): string {
  return '無料結果では、いま表れやすい動きまで。プレミアムでは、その動きが続く背景、力が出やすい条件、負担が重なる順番、整え直しやすい順番まで整理します。';
}

function buildPremiumLockedHeadings(
  axes: ExpressionAxes,
  diverge: readonly AlignDivergeItem[],
): string[] {
  const topDiverge = sortByPriority(diverge)[0];
  const tensionLine = topDiverge
    ? `${AXIS_TITLE_JA[topDiverge.axisId]}がずれるときに重なりやすいもの`
    : `${RECOVERY_PATTERN[axes.recovery]}回復が後回しになるときの重なり`;
  return [
    `${START_PATTERN[axes.start]}傾向が続く背景`,
    `${DECISION_PATTERN[axes.decision]}判断が長引くときに重なるもの`,
    tensionLine,
    '整え直しやすい順番',
  ];
}

/**
 * Build multi-axis free-depth analysis from DOB + five free answers (+ default theme).
 */
export function buildFreeDepthAnalysisV1(
  input: FreeFiveViewInput,
): Result<FreeDepthAnalysisV1> {
  const dobAxes = resolveDobAxes(input);
  if (!dobAxes.ok) return dobAxes;

  const free = resolveFreeAxes(input.freeAnswerSet);
  if (!free.ok) return free;

  const alignDiv = buildAlignDivergeItemsV1({
    dobAxes: dobAxes.value,
    freeAxes: free.value.axes,
    freeAnswerSet: input.freeAnswerSet,
  });
  if (!alignDiv.ok) return alignDiv;

  const axes = free.value.axes;
  const diverge = alignDiv.value.divergeItems;
  const align = alignDiv.value.alignItems;
  const reasons = buildReasons(axes, diverge, align);
  const scenesJa = buildScenes(axes);
  const primaryScene = pickPrimaryScene(axes);

  const analysis: FreeDepthAnalysisV1 = {
    headlineJa: buildHeadline(axes),
    conclusionJa: buildConclusion(axes, diverge, align),
    reasonsJa: reasons,
    hiddenSideJa: buildHiddenSide(axes, diverge),
    strengthConditionsJa: buildStrengthConditions(axes),
    loadConditionsJa: buildLoadConditions(axes),
    scenesJa,
    conciseWhyJa: [trimReason(reasons[0]), trimReason(reasons[1])],
    primarySceneJa: primaryScene.bodyJa,
    primarySceneLabelJa: primaryScene.labelJa,
    premiumOpenLoopJa: buildPremiumOpenLoop(axes),
    premiumLockedHeadingsJa: buildPremiumLockedHeadings(axes, diverge),
    primaryAxes: ['start', 'decision'],
    secondaryAxes: ['distance', 'change'],
    contrastAxes: sortByPriority(diverge).slice(0, 2).map((d) => d.axisId),
    meta: { version: FREE_DEPTH_ANALYSIS_VERSION },
  };

  const publicText = [
    analysis.headlineJa,
    analysis.conclusionJa,
    ...analysis.conciseWhyJa,
    analysis.primarySceneJa,
    analysis.premiumOpenLoopJa,
    ...analysis.premiumLockedHeadingsJa,
    ...analysis.strengthConditionsJa,
    ...analysis.loadConditionsJa,
  ].join('\n');

  try {
    assertNoInternalLeak(publicText);
  } catch {
    return { ok: false, code: 'selector_resolution_failed' };
  }

  // Guard: must reference at least two axis families in conclusion
  const axisHits = (['始め', '決め', '距離', '変化', '回復'] as const).filter((t) =>
    analysis.conclusionJa.includes(t),
  );
  if (axisHits.length < 2) {
    return { ok: false, code: 'selector_resolution_failed' };
  }

  return { ok: true, value: analysis };
}

/** Test helper: selected questionnaire labels must not appear verbatim as the primary result. */
export function freeDepthLooksLikeAnswerConcatenation(
  analysis: FreeDepthAnalysisV1,
  answerLabelsJa: readonly string[],
): boolean {
  const blob = `${analysis.headlineJa}\n${analysis.conclusionJa}`;
  let hits = 0;
  for (const label of answerLabelsJa) {
    const trimmed = label.trim();
    if (trimmed.length >= 4 && blob.includes(trimmed)) hits += 1;
  }
  return hits >= 3;
}
