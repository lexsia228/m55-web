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
import type {
  AlignDivergeItem,
  ChangeTendency,
  DayBand,
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
  stemLaneIndex: number;
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

const START_BY_DAY_BAND: Readonly<Record<DayBand, StartTendency>> = {
  early: 'try',
  mid: 'map',
  late: 'ask',
};

const DECISION_TABLE: Readonly<Record<DayBand, readonly DecisionTendency[]>> = {
  early: ['sort', 'deadline', 'wait'],
  mid: ['deadline', 'wait', 'sort'],
  late: ['wait', 'sort', 'deadline'],
};

const RECOVERY_BY_SEASON3: readonly RecoveryTendency[] = ['pause', 'shrink', 'scene'];
const DISTANCE_BY_MOD: readonly DistanceTendency[] = ['close', 'middle', 'solo'];
const CHANGE_BY_KEY: readonly ChangeTendency[] = ['observe', 'adjust', 'rebuild'];

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
    body: '小さな試行を重ねて輪郭を掴みやすい傾向があります。',
    note: '試作の余地がある場面では進みやすく、完璧な準備を求めすぎると止まりやすいです。',
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

const THEME_LABEL_JA: Readonly<Record<ReplyThemeId, string>> = {
  work: '仕事・進め方',
  relation: '人との関係',
  fatigue: '疲れ・生活のリズム',
  tendency: '自分の傾向の読み方',
  report: 'あとでじっくり読み返せる形',
};

const THEME_ACTION_JA: Readonly<Record<ReplyThemeId, string>> = {
  work: '今日の進め方を一つだけ書き出して、最初の区切りを決めてみてください。',
  relation: '近い相手との距離感を、一言だけ自分の言葉で確認してみてください。',
  fatigue: '短い休みか、やることを一つ減らす区切りを先に置いてみてください。',
  tendency: 'いま表に出やすい傾向を一つ選び、役立つ条件だけ書き留めてみてください。',
  report: 'いま気になる一点だけを残し、あとで読み返せる形にメモしてみてください。',
};

const AXIS_COPY = {
  start: START_COPY,
  decision: DECISION_COPY,
  recovery: RECOVERY_COPY,
  distance: DISTANCE_COPY,
  change: CHANGE_COPY,
} as const;

function dayBandFromDay(day: number): DayBand {
  if (day <= 10) return 'early';
  if (day <= 20) return 'mid';
  return 'late';
}

function dayBandIndex(dayBand: DayBand): 0 | 1 | 2 {
  if (dayBand === 'early') return 0;
  if (dayBand === 'mid') return 1;
  return 2;
}

function resolveDobAxes(input: {
  birthDate: string;
  stemLaneIndex: number;
}): Result<ExpressionAxes> {
  const m = input.birthDate.match(DOB_RE);
  if (!m) return { ok: false, code: 'invalid_dob' };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: 'invalid_dob' };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, code: 'invalid_dob' };
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { ok: false, code: 'invalid_dob' };
  }
  if (
    !Number.isFinite(input.stemLaneIndex) ||
    !Number.isInteger(input.stemLaneIndex) ||
    input.stemLaneIndex < 0 ||
    input.stemLaneIndex > 9
  ) {
    return { ok: false, code: 'missing_stem' };
  }

  const dayBand = dayBandFromDay(day);
  const season3 = (month - 1) % 3;
  const dbi = dayBandIndex(dayBand);
  return {
    ok: true,
    value: {
      start: START_BY_DAY_BAND[dayBand],
      decision: DECISION_TABLE[dayBand][season3]!,
      recovery: RECOVERY_BY_SEASON3[season3]!,
      distance: DISTANCE_BY_MOD[input.stemLaneIndex % 3]!,
      change: CHANGE_BY_KEY[(input.stemLaneIndex + dbi) % 3]!,
    },
  };
}

function resolveFreeAxes(
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
  const composition: FreeFiveViewComposition = {
    views,
    theme: {
      primaryLabelJa: THEME_LABEL_JA[primary],
      secondaryLabelJa: THEME_LABEL_JA[free.value.secondaryReplyTheme],
    },
    synthesis: {
      alignSummaryJa: summarizeAlign(alignDiv.value.alignItems),
      divergeSummaryJa: summarizeDiverge(alignDiv.value.divergeItems),
      primaryThemeJa: `いまの読みの入口は、「${THEME_LABEL_JA[primary]}」に近いところです。`,
      smallActionJa: THEME_ACTION_JA[primary],
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
