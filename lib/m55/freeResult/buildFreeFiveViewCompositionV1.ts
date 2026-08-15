/**
 * Deterministic free five-view composition (answer-derived public copy).
 * Client-safe pure module — no node:crypto, no draft/hash builders.
 */

import {
  buildAlignDivergeItemsV1,
} from '../individualization/alignDivergeV1';
import {
  FREE_CHANGE_ANSWER_TO_TENDENCY,
  FREE_DECISION_ANSWER_TO_TENDENCY,
  FREE_DISTANCE_ANSWER_TO_TENDENCY,
  FREE_QUESTION_IDS,
  FREE_RECOVERY_ANSWER_TO_TENDENCY,
  FREE_START_ANSWER_TO_TENDENCY,
  isFreePrimaryThemeAnswerId,
} from '../individualization/answerIdMapsV1';
import { mapPrimaryThemeToReplyThemeV1 } from '../individualization/primaryThemeReplyMapV1';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import type {
  AlignDivergeItem,
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  ExpressionAxisId,
  RecoveryTendency,
  ReplyThemeId,
  Result,
  StartTendency,
} from '../individualization/types';

export type FreeFiveViewInput = {
  birthDate: string;
  stemLaneIndex?: number;
  freeAnswerSet: Record<string, string>;
};

export type FreeFiveViewCard = {
  axisId: ExpressionAxisId;
  titleJa: string;
  tendencyLabelJa: string;
  bodyJa: string;
  noteJa: string;
};

export type FreeFiveViewComposition = {
  views: readonly FreeFiveViewCard[];
  theme: {
    primaryLabelJa: string;
    secondaryLabelJa: string;
  };
  synthesis: {
    alignSummaryJa: string;
    divergeSummaryJa: string;
    currentExpressionSummaryJa: string;
    focusThemeLabelJa: string;
    focusThemeHelperJa: string;
    primaryThemeJa: string;
    smallActionJa: string;
  };
  meta: {
    fingerprintSpecVersion: 'fp-v1';
    selectorVersion: 'selectors-v1';
    fieldNamingVersion: 'gmfn-v2';
  };
};

const AXIS_ORDER: readonly ExpressionAxisId[] = [
  'start',
  'decision',
  'recovery',
  'distance',
  'change',
];

const AXIS_TITLE_JA: Readonly<Record<ExpressionAxisId, string>> = {
  start: '始め方',
  decision: '決め方',
  recovery: '回復の仕方',
  distance: '距離の取り方',
  change: '変化への向き合い方',
};

const START_COPY: Readonly<
  Record<StartTendency, { label: string; body: string; note: string }>
> = {
  map: {
    label: '先に整理してから動く',
    body: '全体の流れを見渡してから着手しやすい傾向があります。',
    note: '見通しが立つ場面では力が出しやすく、急な着手だけが続くと疲れやすいです。',
  },
  try: {
    label: '小さく試しながら進める',
    body: '小さな試行を重ねて様子を見やすい傾向があります。',
    note: '小さく試せる場面では進みやすく、完璧な準備を求めすぎると止まりやすいです。',
  },
  ask: {
    label: '先に情報や相談を足す',
    body: '情報や対話を集めてから動き出しやすい傾向があります。',
    note: '相談できる相手がいると安定しやすく、一人で抱え込むと迷いが残りやすいです。',
  },
};

const DECISION_COPY: Readonly<
  Record<DecisionTendency, { label: string; body: string; note: string }>
> = {
  sort: {
    label: '選択肢を並べて整理する',
    body: '比較してから決めやすい傾向があります。',
    note: '材料が揃うと決めやすく、材料不足のまま急かされると迷いやすいです。',
  },
  deadline: {
    label: '区切りを決めて決める',
    body: '期限や区切りがあると決断しやすい傾向があります。',
    note: '区切りが見えると進みやすく、終わりのない検討が続くと消耗しやすいです。',
  },
  wait: {
    label: '少し時間を置いてから決める',
    body: '少し間を置いてから決めるほうがしっくりきやすい傾向があります。',
    note: '熟考の余白があると安定しやすく、即断だけが続くと負担になりやすいです。',
  },
};

const RECOVERY_COPY: Readonly<
  Record<RecoveryTendency, { label: string; body: string; note: string }>
> = {
  pause: {
    label: '短く立ち止まって休む',
    body: '短い休息で立て直しやすい傾向があります。',
    note: '短い区切りが取れると戻りやすく、休みなく進み続けると負荷が残りやすいです。',
  },
  shrink: {
    label: 'やることを小さくする',
    body: 'やる範囲を小さくして負荷を下げやすい傾向があります。',
    note: 'スコープを絞れると戻りやすく、広げたまま抱え続けると疲れやすいです。',
  },
  scene: {
    label: '場所や雰囲気を変える',
    body: '環境を切り替えて整えやすい傾向があります。',
    note: '場面を変えられると戻りやすく、同じ刺激の中に留まり続けると回復が遅れやすいです。',
  },
};

const DISTANCE_COPY: Readonly<
  Record<DistanceTendency, { label: string; body: string; note: string }>
> = {
  close: {
    label: '近い距離でも、配慮して接する',
    body: '近い関係でも配慮を保ちながら関わりやすい傾向があります。',
    note: '安心できる相手とは深まりやすく、境界が曖昧だと疲れやすいです。',
  },
  middle: {
    label: '一定の距離を保つ',
    body: '一定の距離を保ちながら関係を続けやすい傾向があります。',
    note: '距離の見通しがあると安定しやすく、急な接近や離反が続くと揺らぎやすいです。',
  },
  solo: {
    label: '一人の時間で整える',
    body: '一人の時間で整えてから関わりやすい傾向があります。',
    note: '単独の余白があると戻りやすく、常時つながった状態が続くと消耗しやすいです。',
  },
};

const CHANGE_COPY: Readonly<
  Record<ChangeTendency, { label: string; body: string; note: string }>
> = {
  observe: {
    label: 'まず様子を見る',
    body: '変化の直後は観察から入りやすい傾向があります。',
    note: '様子を見る時間が取れると安定しやすく、即応だけが続くと負担になりやすいです。',
  },
  adjust: {
    label: '早めに微調整する',
    body: '小さな修正を重ねて合わせやすい傾向があります。',
    note: '微調整の余地があると進みやすく、大転換だけを求められると疲れやすいです。',
  },
  rebuild: {
    label: '一度土台から作り直す',
    body: '土台から組み直して整えやすい傾向があります。',
    note: '再構築の時間が取れると安定しやすく、継ぎ足しだけが続くと違和感が残りやすいです。',
  },
};

const FOCUS_THEME_LABEL_JA: Readonly<Record<ReplyThemeId, string>> = {
  work: '仕事や物事の進め方',
  relation: '人との距離や関わり方',
  fatigue: '疲れたときの戻り方',
  tendency: '判断や迷いが出るとき',
  report: '自分全体をまとめて見たい',
};

const FOCUS_THEME_HELPER_JA =
  '見取り図の中で、ここに関係する部分から確認します。' as const;

const START_EXPRESSION_PHRASE: Readonly<Record<StartTendency, string>> = {
  map: '整理してから始めやすく',
  try: '小さく試しながら進めやすく',
  ask: '情報や相談を足してから動きやすく',
};

const DECISION_EXPRESSION_PHRASE: Readonly<Record<DecisionTendency, string>> = {
  sort: '比較できる材料があると判断しやすい',
  deadline: '区切りがあると決めやすい',
  wait: '少し時間を置くと判断しやすい',
};

const RECOVERY_ACTION_PHRASE: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短く立ち止まって休む余白を先に置く',
  shrink: 'やることを一つ小さくする区切りを決める',
  scene: '場所や雰囲気を少し変えて整える',
};

const FOCUS_SCENE_PREFIX_JA: Readonly<Record<ReplyThemeId, string>> = {
  work: '仕事や物事の進め方に関係する場面なら、',
  relation: '人との距離や関わり方に関係する場面なら、',
  fatigue: '疲れたときの戻り方に関係する場面なら、',
  tendency: '判断や迷いが出るときなら、',
  report: '',
};

const AXIS_COPY = {
  start: START_COPY,
  decision: DECISION_COPY,
  recovery: RECOVERY_COPY,
  distance: DISTANCE_COPY,
  change: CHANGE_COPY,
} as const;

/** Exported for free-depth composition (same DOB axis resolution; no algorithm change). */
export function resolveDobAxes(input: {
  birthDate: string;
  stemLaneIndex?: number;
}): Result<ExpressionAxes> {
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: input.birthDate });
  if (!canonical.ok) return canonical;
  return { ok: true, value: canonical.value.birthSignature.dimensions };
}

/** Exported for free-depth composition (same free-axis resolution; IDs unchanged). */
export function resolveFreeAxes(
  freeAnswerSet: Record<string, string>,
): Result<{
  axes: ExpressionAxes;
  primaryReplyTheme: ReplyThemeId;
  secondaryReplyTheme: ReplyThemeId;
}> {
  for (const qid of FREE_QUESTION_IDS) {
    if (typeof freeAnswerSet[qid] !== 'string' || freeAnswerSet[qid]!.length === 0) {
      return { ok: false, code: 'missing_free_answers' };
    }
  }

  const start = FREE_START_ANSWER_TO_TENDENCY[freeAnswerSet['free.start_style']!];
  const decision =
    FREE_DECISION_ANSWER_TO_TENDENCY[freeAnswerSet['free.decision_style']!];
  const recovery =
    FREE_RECOVERY_ANSWER_TO_TENDENCY[freeAnswerSet['free.recovery_style']!];
  const distance =
    FREE_DISTANCE_ANSWER_TO_TENDENCY[freeAnswerSet['free.distance_style']!];
  const change = FREE_CHANGE_ANSWER_TO_TENDENCY[freeAnswerSet['free.change_style']!];
  const themeId = freeAnswerSet['free.primary_theme']!;

  if (!start || !decision || !recovery || !distance || !change) {
    return { ok: false, code: 'unknown_answer_id' };
  }
  if (!isFreePrimaryThemeAnswerId(themeId)) {
    return { ok: false, code: 'unknown_answer_id' };
  }
  const mapped = mapPrimaryThemeToReplyThemeV1(themeId);
  if (!mapped.ok) return mapped;

  return {
    ok: true,
    value: {
      axes: { start, decision, recovery, distance, change },
      primaryReplyTheme: mapped.value.primaryReplyTheme,
      secondaryReplyTheme: mapped.value.secondaryReplyTheme,
    },
  };
}

function axisTendencyLabel(
  axisId: ExpressionAxisId,
  tendency: string,
): { label: string; body: string; note: string } {
  const table = AXIS_COPY[axisId] as Record<
    string,
    { label: string; body: string; note: string }
  >;
  return (
    table[tendency] ?? {
      label: 'いまの表れ方',
      body: 'いまの回答から、この視点の表れ方が見えています。',
      note: '無理のない条件のほうが、本来の動きやすさが出やすいです。',
    }
  );
}

function buildCurrentExpressionSummaryJa(axes: ExpressionAxes): string {
  return `${START_EXPRESSION_PHRASE[axes.start]}、${DECISION_EXPRESSION_PHRASE[axes.decision]}状態です。`;
}

function buildSmallActionJa(axes: ExpressionAxes, focusTheme: ReplyThemeId): string {
  const base = `今日は、${RECOVERY_ACTION_PHRASE[axes.recovery]}ことを一つだけ試してみてください。`;
  const prefix = FOCUS_SCENE_PREFIX_JA[focusTheme];
  return prefix ? `${prefix}${base}` : base;
}

function summarizeAlign(items: readonly AlignDivergeItem[]): string {
  if (items.length === 0) {
    return '土台と今の表れ方が、大きく重なる軸はいま見えていません。';
  }
  const titles = items
    .slice(0, 2)
    .map((item) => AXIS_TITLE_JA[item.axisId])
    .join('・');
  return `土台と今が重なりやすいのは、${titles}の視点です。`;
}

function summarizeDiverge(items: readonly AlignDivergeItem[]): string {
  if (items.length === 0) {
    return '土台と今のあいだで、はっきり異なる軸はいま見えていません。';
  }
  const titles = items
    .slice(0, 2)
    .map((item) => AXIS_TITLE_JA[item.axisId])
    .join('・');
  return `土台と今で少し異なるのは、${titles}の視点です。良し悪しではなく、いまの表れ方の差として見てください。`;
}

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
  ]) {
    if (text.includes(token)) {
      throw new Error(`internal token leaked into public copy: ${token}`);
    }
  }
}

/**
 * Build public free five-view composition from DOB + free-v1 answers.
 * Fail-closed: returns Result Err without partial public output.
 */
export function buildFreeFiveViewCompositionV1(
  input: FreeFiveViewInput,
): Result<FreeFiveViewComposition> {
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

  const views: FreeFiveViewCard[] = AXIS_ORDER.map((axisId) => {
    const copy = axisTendencyLabel(axisId, free.value.axes[axisId]);
    return {
      axisId,
      titleJa: AXIS_TITLE_JA[axisId],
      tendencyLabelJa: copy.label,
      bodyJa: copy.body,
      noteJa: copy.note,
    };
  });

  const primary = free.value.primaryReplyTheme;
  const currentExpressionSummaryJa = buildCurrentExpressionSummaryJa(free.value.axes);
  const focusThemeLabelJa = FOCUS_THEME_LABEL_JA[primary];
  const composition: FreeFiveViewComposition = {
    views,
    theme: {
      primaryLabelJa: focusThemeLabelJa,
      secondaryLabelJa: FOCUS_THEME_LABEL_JA[free.value.secondaryReplyTheme],
    },
    synthesis: {
      alignSummaryJa: summarizeAlign(alignDiv.value.alignItems),
      divergeSummaryJa: summarizeDiverge(alignDiv.value.divergeItems),
      currentExpressionSummaryJa,
      focusThemeLabelJa,
      focusThemeHelperJa: FOCUS_THEME_HELPER_JA,
      primaryThemeJa: focusThemeLabelJa,
      smallActionJa: buildSmallActionJa(free.value.axes, primary),
    },
    meta: {
      fingerprintSpecVersion: 'fp-v1',
      selectorVersion: 'selectors-v1',
      fieldNamingVersion: 'gmfn-v2',
    },
  };

  const publicText = [
    ...composition.views.flatMap((view) => [
      view.titleJa,
      view.tendencyLabelJa,
      view.bodyJa,
      view.noteJa,
    ]),
    composition.theme.primaryLabelJa,
    composition.theme.secondaryLabelJa,
    composition.synthesis.alignSummaryJa,
    composition.synthesis.divergeSummaryJa,
    composition.synthesis.currentExpressionSummaryJa,
    composition.synthesis.focusThemeLabelJa,
    composition.synthesis.focusThemeHelperJa,
    composition.synthesis.primaryThemeJa,
    composition.synthesis.smallActionJa,
  ].join('\n');

  try {
    assertNoInternalLeak(publicText);
  } catch {
    return { ok: false, code: 'selector_resolution_failed' };
  }

  return { ok: true, value: composition };
}
