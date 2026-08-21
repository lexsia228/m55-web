/**
 * selectors-v1 pure deterministic resolver (no I/O; no builder import).
 */

import {
  FREE_BLOCK_ROLE_ORDER_V1,
  FREE_BLOCK_SELECTOR_CATALOG_V1,
  INDIVIDUALIZATION_SELECTOR_CATALOG_VERSION_V1,
  PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1,
  PAID_CHAPTER_EMPHASIS_CATALOG_V1,
  RECOVERY_SELECTOR_CATALOG_V1,
  SELECTOR_AXIS_PRIORITY_V1,
  STRAIN_SELECTOR_CATALOG_V1,
} from './individualizationSelectorCatalogV1';
import type {
  FreeBlockSelectorIdV1,
  IndividualizationSelectorBundleV1,
  PaidChapterEmphasisIdV1,
  RecoverySelectorIdV1,
  RootEvidenceLineageV1,
  StrainSelectorIdV1,
} from './individualizationSelectorTypesV1';
import type {
  AlignDivergeItem,
  ChapterBias,
  ChapterHintId,
  DobBase,
  ExpressionAxisId,
  FreeExpression,
  Hesitation,
  Intensity,
  PaidDepth,
  ReactiveContext,
  ReplyAffinity,
  ReplyThemeId,
} from './types';
import {
  FINGERPRINT_SPEC_VERSION,
  INDIVIDUALIZATION_SELECTOR_VERSION_V1,
} from './versions';

const VALID_AXES: readonly ExpressionAxisId[] = [
  'start',
  'decision',
  'recovery',
  'distance',
  'change',
];

const AXIS_QUESTION_REF: Readonly<Record<ExpressionAxisId, string>> = {
  start: 'Q1',
  decision: 'Q2',
  recovery: 'Q3',
  distance: 'Q4',
  change: 'Q5',
};

const THEME_TO_FREE_PRIMARY: Readonly<Record<ReplyThemeId, FreeBlockSelectorIdV1>> = {
  work: 'free__primary_theme__work',
  relation: 'free__primary_theme__relation',
  fatigue: 'free__primary_theme__fatigue',
  tendency: 'free__primary_theme__tendency',
  report: 'free__primary_theme__report_scene',
};

const CHAPTER_HINT_TO_FREE_PAID_DEPTH: Readonly<
  Record<ChapterHintId, FreeBlockSelectorIdV1>
> = {
  I: 'free__paid_depth_point__chapter_I',
  II: 'free__paid_depth_point__chapter_II',
  III: 'free__paid_depth_point__chapter_III',
  IV: 'free__paid_depth_point__chapter_IV',
};

const STRAIN_TO_FREE_STRAIN: Readonly<Record<StrainSelectorIdV1, FreeBlockSelectorIdV1>> = {
  'strain__pace_mismatch': 'free__strain__pace_mismatch',
  'strain__decision_overload': 'free__strain__decision_overload',
  'strain__distance_tension': 'free__strain__distance_tension',
  'strain__recovery_delay': 'free__strain__recovery_delay',
  'strain__change_uncertainty': 'free__strain__change_uncertainty',
};

const RECOVERY_TO_FREE_RECOVERY: Readonly<
  Record<RecoverySelectorIdV1, FreeBlockSelectorIdV1>
> = {
  'recovery__small_start': 'free__recovery__small_start',
  'recovery__sort_materials': 'free__recovery__sort_materials',
  'recovery__pause_first': 'free__recovery__pause_first',
  'recovery__speak_to_trusted_person': 'free__recovery__speak_to_trusted_person',
  'recovery__reduce_change_scope': 'free__recovery__reduce_change_scope',
};

export type ResolveIndividualizationSelectorsErrorCodeV1 =
  | 'unknown_selector_version'
  | 'unknown_selector_id'
  | 'duplicate_selector_id'
  | 'selector_count_overflow'
  | 'contradictory_selector_state'
  | 'invalid_selector_bundle'
  | 'selector_version_mismatch'
  | 'selector_resolution_failed';

export type ResolveIndividualizationSelectorsErrorV1 = {
  code: ResolveIndividualizationSelectorsErrorCodeV1;
  field?: string;
  role?: string;
  chapter?: ChapterHintId;
  expectedVersion?: string;
  receivedVersion?: string;
  invariant?: string;
};

export type ResolveIndividualizationSelectorsInputV1 = {
  selectorVersion: string;
  catalogVersion?: string;
  fingerprintSpecVersion: string;
  dobBase: DobBase;
  freeExpression: FreeExpression;
  alignItems: readonly AlignDivergeItem[];
  divergeItems: readonly AlignDivergeItem[];
  intensity: Intensity;
  hesitation: Hesitation;
  reactiveContext: ReactiveContext;
  replyAffinity: ReplyAffinity;
  paidDepth: PaidDepth | null;
  freePick: AlignDivergeItem | null;
  paidAnswerSet?: Readonly<Record<string, string>> | null;
};

export type ResolveIndividualizationSelectorsResultV1 =
  | { ok: true; value: IndividualizationSelectorBundleV1 }
  | { ok: false; error: ResolveIndividualizationSelectorsErrorV1 };

type EvidenceToken = {
  lineage: RootEvidenceLineageV1;
  sourceKey: string;
  questionRef: string | null;
};

function fail(
  code: ResolveIndividualizationSelectorsErrorCodeV1,
  extra: Omit<ResolveIndividualizationSelectorsErrorV1, 'code'> = {},
): ResolveIndividualizationSelectorsResultV1 {
  return { ok: false, error: { code, ...extra } };
}

function isExpressionAxisId(value: string): value is ExpressionAxisId {
  return (VALID_AXES as readonly string[]).includes(value);
}

function axisPriorityRank(axis: ExpressionAxisId): number {
  return SELECTOR_AXIS_PRIORITY_V1.indexOf(axis);
}

function compareAxisPriority(a: ExpressionAxisId, b: ExpressionAxisId): number {
  return axisPriorityRank(a) - axisPriorityRank(b);
}

function compareIdLex(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function questionRefForDriver(driver: string): string | null {
  if (driver.startsWith('free.')) {
    const qid = driver.split('.').slice(0, 3).join('.');
    if (qid === 'free.start_style') return 'Q1';
    if (qid === 'free.decision_style') return 'Q2';
    if (qid === 'free.recovery_style') return 'Q3';
    if (qid === 'free.distance_style') return 'Q4';
    if (qid === 'free.change_style') return 'Q5';
    if (qid === 'free.primary_theme') return 'Q6';
  }
  if (driver.startsWith('paid.')) return 'PAID';
  return null;
}

function hasDivergeOnAxis(
  divergeItems: readonly AlignDivergeItem[],
  axisId: ExpressionAxisId,
): boolean {
  return divergeItems.some((item) => item.axisId === axisId);
}

function hasCrossAxisDiverge(
  divergeItems: readonly AlignDivergeItem[],
  excludeAxis: ExpressionAxisId,
): boolean {
  return divergeItems.some((item) => item.axisId !== excludeAxis);
}

function hesitationFromOtherQuestion(
  hesitation: Hesitation,
  excludeQuestion: string,
): boolean {
  if (!hesitation.present || hesitation.drivers.length === 0) return false;
  return hesitation.drivers.some((driver) => {
    const ref = questionRefForDriver(driver);
    return ref !== null && ref !== excludeQuestion;
  });
}

function reactiveContextFromAxis(
  reactiveContext: ReactiveContext,
  axisId: ExpressionAxisId,
): boolean {
  const qid =
    axisId === 'start'
      ? 'free.start_style'
      : axisId === 'decision'
        ? 'free.decision_style'
        : axisId === 'recovery'
          ? 'free.recovery_style'
          : axisId === 'distance'
            ? 'free.distance_style'
            : 'free.change_style';
  return reactiveContext.drivers.some((driver) => driver.startsWith(qid));
}

function addEvidence(
  tokens: EvidenceToken[],
  token: EvidenceToken,
  seen: Set<string>,
): void {
  if (seen.has(token.sourceKey)) return;
  seen.add(token.sourceKey);
  tokens.push(token);
}

function collectHesitationEvidence(
  hesitation: Hesitation,
  excludeQuestion: string | null,
): EvidenceToken[] {
  if (!hesitation.present || hesitation.drivers.length === 0) return [];
  const tokens: EvidenceToken[] = [];
  const seen = new Set<string>();
  for (const driver of hesitation.drivers) {
    const ref = questionRefForDriver(driver);
    if (ref === null) continue;
    if (excludeQuestion !== null && ref === excludeQuestion) continue;
    addEvidence(tokens, {
      lineage: 'CROSS_AXIS_AGGREGATE_ROOT',
      sourceKey: `hesitation:${driver}`,
      questionRef: ref,
    }, seen);
  }
  return tokens;
}

function collectDivergeEvidence(
  divergeItems: readonly AlignDivergeItem[],
  axisId: ExpressionAxisId,
): EvidenceToken | null {
  const item = divergeItems.find((d) => d.axisId === axisId);
  if (!item) return null;
  return {
    lineage: 'DERIVED_RELATION',
    sourceKey: `diverge:${axisId}`,
    questionRef: AXIS_QUESTION_REF[axisId],
  };
}

function collectCrossAxisDivergeEvidence(
  divergeItems: readonly AlignDivergeItem[],
  excludeAxis: ExpressionAxisId,
  allowedAxes?: readonly ExpressionAxisId[],
): EvidenceToken[] {
  const tokens: EvidenceToken[] = [];
  const seen = new Set<string>();
  for (const item of divergeItems) {
    if (item.axisId === excludeAxis) continue;
    if (allowedAxes && !allowedAxes.includes(item.axisId)) continue;
    addEvidence(tokens, {
      lineage: 'DERIVED_RELATION',
      sourceKey: `diverge:${item.axisId}`,
      questionRef: AXIS_QUESTION_REF[item.axisId],
    }, seen);
  }
  return tokens;
}

function meetsStrainEligibility(
  tokens: EvidenceToken[],
  targetAxis: ExpressionAxisId,
): boolean {
  if (tokens.length < 2) return false;
  const targetQuestion = AXIS_QUESTION_REF[targetAxis];
  const hasNonTargetQuestion = tokens.some(
    (token) => token.questionRef !== null && token.questionRef !== targetQuestion,
  );
  return hasNonTargetQuestion;
}

function evaluateStrainCandidate(
  entry: (typeof STRAIN_SELECTOR_CATALOG_V1)[number],
  input: ResolveIndividualizationSelectorsInputV1,
): boolean {
  const { divergeItems, hesitation, reactiveContext, freeExpression } = input;
  const targetAxis = entry.targetAxis;

  const targetDiverge = collectDivergeEvidence(divergeItems, targetAxis);
  if (!targetDiverge) return false;

  const tokens: EvidenceToken[] = [targetDiverge];
  const seen = new Set<string>([targetDiverge.sourceKey]);

  if (reactiveContextFromAxis(reactiveContext, targetAxis)) {
    if (entry.id === 'strain__distance_tension') {
      const hasCloseCareful = reactiveContext.scenes.includes('close_careful');
      if (hasCloseCareful && !hasCrossAxisDiverge(divergeItems, 'distance')) {
        if (freeExpression.primaryReplyTheme !== 'relation') return false;
      }
    }
    if (entry.id === 'strain__recovery_delay') {
      const hasShortPause = reactiveContext.scenes.includes('short_pause');
      if (hasShortPause && !hesitationFromOtherQuestion(hesitation, 'Q3')) {
        const hasDecisionDiverge = hasDivergeOnAxis(divergeItems, 'decision');
        if (!hasDecisionDiverge) return false;
      }
    }
  }

  switch (entry.id) {
    case 'strain__pace_mismatch': {
      for (const token of collectHesitationEvidence(hesitation, 'Q1')) {
        addEvidence(tokens, token, seen);
      }
      for (const token of collectCrossAxisDivergeEvidence(divergeItems, 'start', [
        'decision',
        'change',
      ])) {
        addEvidence(tokens, token, seen);
      }
      break;
    }
    case 'strain__decision_overload': {
      for (const token of collectHesitationEvidence(hesitation, 'Q2')) {
        addEvidence(tokens, token, seen);
      }
      for (const token of collectCrossAxisDivergeEvidence(divergeItems, 'decision', [
        'change',
        'start',
      ])) {
        addEvidence(tokens, token, seen);
      }
      break;
    }
    case 'strain__distance_tension': {
      if (freeExpression.primaryReplyTheme === 'relation') {
        addEvidence(tokens, {
          lineage: 'QUESTIONNAIRE_THEME_ROOT',
          sourceKey: 'theme:relation',
          questionRef: 'Q6',
        }, seen);
      }
      for (const token of collectCrossAxisDivergeEvidence(divergeItems, 'distance', [
        'recovery',
        'change',
      ])) {
        addEvidence(tokens, token, seen);
      }
      if (
        reactiveContextFromAxis(reactiveContext, 'distance') &&
        reactiveContext.scenes.includes('close_careful')
      ) {
        return false;
      }
      break;
    }
    case 'strain__recovery_delay': {
      for (const token of collectCrossAxisDivergeEvidence(divergeItems, 'recovery', [
        'decision',
      ])) {
        addEvidence(tokens, token, seen);
      }
      for (const token of collectHesitationEvidence(hesitation, 'Q3')) {
        addEvidence(tokens, token, seen);
      }
      if (
        reactiveContextFromAxis(reactiveContext, 'recovery') &&
        reactiveContext.scenes.includes('short_pause') &&
        tokens.length < 3
      ) {
        return false;
      }
      break;
    }
    case 'strain__change_uncertainty': {
      for (const token of collectCrossAxisDivergeEvidence(divergeItems, 'change', [
        'decision',
      ])) {
        addEvidence(tokens, token, seen);
      }
      for (const token of collectHesitationEvidence(hesitation, 'Q5')) {
        addEvidence(tokens, token, seen);
      }
      const onlyTheme =
        tokens.length === 1 &&
        freeExpression.primaryReplyTheme !== null &&
        freeExpression.secondaryReplyTheme !== null;
      if (onlyTheme) return false;
      break;
    }
    default:
      return false;
  }

  return meetsStrainEligibility(tokens, targetAxis);
}

function resolveStrainSelectors(
  input: ResolveIndividualizationSelectorsInputV1,
): StrainSelectorIdV1[] {
  const candidates = STRAIN_SELECTOR_CATALOG_V1.filter((entry) =>
    evaluateStrainCandidate(entry, input),
  );

  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const axisCmp = compareAxisPriority(a.targetAxis, b.targetAxis);
    if (axisCmp !== 0) return axisCmp;
    return compareIdLex(a.id, b.id);
  });

  return [sorted[0]!.id];
}

function evaluateRecoveryCandidate(
  entry: (typeof RECOVERY_SELECTOR_CATALOG_V1)[number],
  input: ResolveIndividualizationSelectorsInputV1,
): boolean {
  const { freeExpression, divergeItems, hesitation, reactiveContext } = input;
  const axes = freeExpression.axes;

  switch (entry.id) {
    case 'recovery__small_start': {
      const hasStartSignal =
        hasDivergeOnAxis(divergeItems, 'start') ||
        input.alignItems.some((item) => item.axisId === 'start');
      if (!hasStartSignal) return false;
      const secondary =
        hasCrossAxisDiverge(divergeItems, 'start') ||
        hesitationFromOtherQuestion(hesitation, 'Q1');
      return secondary;
    }
    case 'recovery__sort_materials': {
      if (axes.decision !== 'sort') return false;
      if (hesitationFromOtherQuestion(hesitation, 'Q2')) return true;
      return (
        hasDivergeOnAxis(divergeItems, 'decision') &&
        hasCrossAxisDiverge(divergeItems, 'decision')
      );
    }
    case 'recovery__pause_first': {
      if (axes.recovery !== 'pause') return false;
      if (reactiveContextFromAxis(reactiveContext, 'recovery')) return false;
      return (
        hasDivergeOnAxis(divergeItems, 'decision') ||
        hasDivergeOnAxis(divergeItems, 'change')
      );
    }
    case 'recovery__speak_to_trusted_person': {
      if (axes.distance === 'solo') return false;
      if (axes.distance !== 'close') return false;
      return freeExpression.primaryReplyTheme === 'relation';
    }
    case 'recovery__reduce_change_scope': {
      if (axes.change !== 'observe' && axes.change !== 'adjust') return false;
      return (
        hasDivergeOnAxis(divergeItems, 'change') &&
        hasCrossAxisDiverge(divergeItems, 'change')
      );
    }
    default:
      return false;
  }
}

function applyRecoveryContradictions(
  candidates: (typeof RECOVERY_SELECTOR_CATALOG_V1)[number][],
  input: ResolveIndividualizationSelectorsInputV1,
): (typeof RECOVERY_SELECTOR_CATALOG_V1)[number][] {
  let filtered = [...candidates];

  if (input.freeExpression.axes.recovery === 'scene') {
    filtered = filtered.filter((entry) => entry.id !== 'recovery__pause_first');
  }

  if (input.freeExpression.axes.distance === 'solo') {
    filtered = filtered.filter(
      (entry) => entry.id !== 'recovery__speak_to_trusted_person',
    );
  }

  const fatigueBeforeStart = input.reactiveContext.drivers.includes(
    'paid.fatigue_signal.before_start',
  );

  const hasSmallStart = filtered.some((entry) => entry.id === 'recovery__small_start');
  const hasPauseFirst = filtered.some((entry) => entry.id === 'recovery__pause_first');

  if (fatigueBeforeStart && hasSmallStart && hasPauseFirst) {
    filtered = filtered.filter((entry) => entry.id !== 'recovery__small_start');
  }

  return filtered;
}

function resolveRecoverySelectors(
  input: ResolveIndividualizationSelectorsInputV1,
): RecoverySelectorIdV1[] {
  const paidRecovery = input.paidDepth?.recoverySequence;
  const RECOVERY_SEQUENCE_MAP: Readonly<Record<string, RecoverySelectorIdV1>> = {
    'paid.recovery_sequence.pause_first': 'recovery__pause_first',
    'paid.recovery_sequence.small_start': 'recovery__small_start',
    'paid.recovery_sequence.sort_materials': 'recovery__sort_materials',
  };
  if (paidRecovery && RECOVERY_SEQUENCE_MAP[paidRecovery]) {
    return [RECOVERY_SEQUENCE_MAP[paidRecovery]!];
  }

  let candidates = RECOVERY_SELECTOR_CATALOG_V1.filter((entry) =>
    evaluateRecoveryCandidate(entry, input),
  );
  candidates = applyRecoveryContradictions(candidates, input);

  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return compareIdLex(a.id, b.id);
  });

  return [sorted[0]!.id];
}

function resolveAlignDivergeFreeId(
  freePick: AlignDivergeItem | null,
): FreeBlockSelectorIdV1 {
  if (!freePick) return 'free__align_diverge__distance_align';
  const entry = FREE_BLOCK_SELECTOR_CATALOG_V1.find(
    (item) =>
      item.role === 'align_diverge' &&
      item.targetAxis === freePick.axisId &&
      item.alignDivergeRelation === freePick.relation,
  );
  return entry?.id ?? 'free__align_diverge__distance_align';
}

function resolvePaidDepthFreeId(input: ResolveIndividualizationSelectorsInputV1): FreeBlockSelectorIdV1 {
  if (input.hesitation.chapterHint) {
    return CHAPTER_HINT_TO_FREE_PAID_DEPTH[input.hesitation.chapterHint];
  }
  if (input.paidDepth?.chapterBias) {
    const bias = input.paidDepth.chapterBias;
    const max = Math.max(bias.I, bias.II, bias.III, bias.IV);
    if (max > 0) {
      const chapters: ChapterHintId[] = ['I', 'II', 'III', 'IV'];
      const maxChapter = chapters.find((ch) => bias[ch] === max);
      if (maxChapter) return CHAPTER_HINT_TO_FREE_PAID_DEPTH[maxChapter];
    }
  }
  return 'free__paid_depth_point__chapter_I';
}

function resolveFreeBlockSelectors(
  input: ResolveIndividualizationSelectorsInputV1,
  strainIds: readonly StrainSelectorIdV1[],
  recoveryIds: readonly RecoverySelectorIdV1[],
): FreeBlockSelectorIdV1[] {
  const primaryTheme = input.freeExpression.primaryReplyTheme;
  if (!primaryTheme) {
    throw new Error('missing primary theme');
  }

  const byRole: Partial<Record<(typeof FREE_BLOCK_ROLE_ORDER_V1)[number], FreeBlockSelectorIdV1>> =
    {
      intro: 'free__intro__welcome',
      dob_baseline: 'free__dob_baseline__five_axes',
      current_expression: 'free__current_expression__projection',
      primary_theme: THEME_TO_FREE_PRIMARY[primaryTheme],
      align_diverge: resolveAlignDivergeFreeId(input.freePick),
      strain:
        strainIds.length === 1
          ? STRAIN_TO_FREE_STRAIN[strainIds[0]!]
          : 'free__strain__none',
      paid_depth_point: resolvePaidDepthFreeId(input),
    };

  if (recoveryIds.length === 1) {
    byRole.recovery = RECOVERY_TO_FREE_RECOVERY[recoveryIds[0]!];
  }

  const ordered: FreeBlockSelectorIdV1[] = [];
  for (const role of FREE_BLOCK_ROLE_ORDER_V1) {
    if (role === 'recovery' && recoveryIds.length === 0) continue;
    const id = byRole[role];
    if (!id) {
      throw new Error(`missing free role: ${role}`);
    }
    ordered.push(id);
  }

  return ordered;
}

type PaidChapterKey = 'chapter1' | 'chapter2' | 'chapter3' | 'chapter4';

const CHAPTER_KEY_BY_HINT: Readonly<Record<ChapterHintId, PaidChapterKey>> = {
  I: 'chapter1',
  II: 'chapter2',
  III: 'chapter3',
  IV: 'chapter4',
};

function scorePaidChapterCandidate(
  entry: (typeof PAID_CHAPTER_EMPHASIS_CATALOG_V1)[number],
  input: ResolveIndividualizationSelectorsInputV1,
  strainIds: readonly StrainSelectorIdV1[],
): number {
  const { freeExpression, divergeItems, alignItems, hesitation, reactiveContext } =
    input;
  const axes = freeExpression.axes;
  let score = entry.priority;

  switch (entry.id) {
    case 'paid_ch1__baseline_landscape':
      return axes ? entry.priority : 0;
    case 'paid_ch1__expression_mirror':
      return freeExpression.axes ? entry.priority : 0;
    case 'paid_ch1__align_diverge_bridge':
      return alignItems.length + divergeItems.length > 0 ? entry.priority : 0;
    case 'paid_ch2__start_rhythm':
      return alignItems.some((i) => i.axisId === 'start') ||
        divergeItems.some((i) => i.axisId === 'start')
        ? entry.priority
        : 0;
    case 'paid_ch2__decision_flow':
      return hesitation.present ||
        divergeItems.some((i) => i.axisId === 'decision')
        ? entry.priority
        : 0;
    case 'paid_ch2__change_adaptation':
      return reactiveContext.scenes.length > 0 ||
        divergeItems.some((i) => i.axisId === 'change')
        ? entry.priority
        : 0;
    case 'paid_ch3__distance_posture':
      return alignItems.some((i) => i.axisId === 'distance') ||
        divergeItems.some((i) => i.axisId === 'distance')
        ? entry.priority
        : 0;
    case 'paid_ch3__decision_in_relation':
      return (freeExpression.primaryReplyTheme === 'relation' ||
        freeExpression.secondaryReplyTheme === 'relation') &&
        (hesitation.present || divergeItems.some((i) => i.axisId === 'decision'))
        ? entry.priority
        : 0;
    case 'paid_ch3__recovery_connection':
      return alignItems.some((i) => i.axisId === 'recovery') ||
        divergeItems.some((i) => i.axisId === 'recovery') ||
        reactiveContext.scenes.some((s) => s === 'close_careful' || s === 'solo_reset')
        ? entry.priority
        : 0;
    case 'paid_ch4__recovery_pace':
      return (axes.recovery !== undefined &&
        (input.intensity.level === 'mid' || input.intensity.level === 'high'))
        ? entry.priority
        : 0;
    case 'paid_ch4__change_life_load':
      return divergeItems.some((i) => i.axisId === 'change') || strainIds.length > 0
        ? entry.priority
        : 0;
    case 'paid_ch4__distance_boundary':
      return (axes.distance === 'solo' || axes.distance === 'middle') &&
        (freeExpression.primaryReplyTheme === 'fatigue' ||
          freeExpression.secondaryReplyTheme === 'fatigue')
        ? entry.priority
        : 0;
    case 'paid_ch4__strain_life_context':
      return strainIds.length > 0 ? entry.priority : 0;
    default:
      return 0;
  }
}

function applyChapterBiasBoost(
  scores: Map<PaidChapterEmphasisIdV1, number>,
  chapter: ChapterHintId,
  chapterBias: ChapterBias | undefined,
): void {
  if (!chapterBias) return;
  const bias = chapterBias[chapter];
  if (bias <= 0) return;
  for (const entry of PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1[chapter]) {
    const current = scores.get(entry.id) ?? 0;
    if (current > 0) scores.set(entry.id, current + bias);
  }
}

function resolveGenericPaidChapterEmphasis(
  input: ResolveIndividualizationSelectorsInputV1,
  strainIds: readonly StrainSelectorIdV1[],
): IndividualizationSelectorBundleV1['paidChapterEmphasisIds'] {
  const selectedGlobal = new Set<PaidChapterEmphasisIdV1>();
  const result = {
    chapter1: [] as PaidChapterEmphasisIdV1[],
    chapter2: [] as PaidChapterEmphasisIdV1[],
    chapter3: [] as PaidChapterEmphasisIdV1[],
    chapter4: [] as PaidChapterEmphasisIdV1[],
  };

  const chapters: ChapterHintId[] = ['I', 'II', 'III', 'IV'];

  for (const chapter of chapters) {
    const scores = new Map<PaidChapterEmphasisIdV1, number>();
    for (const entry of PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1[chapter]) {
      const score = scorePaidChapterCandidate(entry, input, strainIds);
      if (score > 0) scores.set(entry.id, score);
    }
    applyChapterBiasBoost(scores, chapter, input.paidDepth?.chapterBias);

    if (chapter === 'IV' && input.paidDepth?.restartCondition) {
      const restartBoost: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
        'paid.restart_condition.overview_first': 'paid_ch4__change_life_load',
        'paid.restart_condition.shrink_scope': 'paid_ch4__recovery_pace',
        'paid.restart_condition.trusted_support': 'paid_ch4__distance_boundary',
      };
      const target = restartBoost[input.paidDepth.restartCondition];
      if (target) {
        scores.set(target, (scores.get(target) ?? 0) + 6);
      }
    }

    if (freeExpressionWorkBoost(input, chapter)) {
      for (const [id, score] of scores) {
        if (score > 0) scores.set(id, score + 1);
      }
    }

    const eligible = [...scores.entries()]
      .filter(([, score]) => score > 0)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return compareIdLex(a[0], b[0]);
      })
      .map(([id]) => id)
      .filter((id) => !selectedGlobal.has(id));

    const picked = eligible.slice(0, 3);
    if (picked.length === 0) {
      const fallback = PAID_CHAPTER_EMPHASIS_BY_CHAPTER_V1[chapter]
        .map((entry) => entry.id)
        .filter((id) => !selectedGlobal.has(id));
      if (fallback.length === 0) {
        throw new Error(`no paid chapter fallback: ${chapter}`);
      }
      picked.push(fallback[0]!);
    }

    for (const id of picked) selectedGlobal.add(id);
    result[CHAPTER_KEY_BY_HINT[chapter]] = picked;
  }

  return result as IndividualizationSelectorBundleV1['paidChapterEmphasisIds'];
}

const CURRENT_PAID_QUESTION_IDS = [
  'paid.work_focus',
  'paid.decision_friction',
  'paid.relation_focus',
  'paid.fatigue_signal',
  'paid.recovery_sequence',
  'paid.restart_condition',
] as const;

const WORK_FOCUS_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.work_focus.priority': 'paid_ch2__work_focus_priority',
  'paid.work_focus.pace': 'paid_ch2__work_focus_pace',
  'paid.work_focus.boundary': 'paid_ch2__work_focus_boundary',
};

const DECISION_FRICTION_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.decision_friction.too_many': 'paid_ch2__decision_friction_too_many',
  'paid.decision_friction.unclear_end': 'paid_ch2__decision_friction_unclear_end',
  'paid.decision_friction.fear_mistake': 'paid_ch2__decision_friction_fear_mistake',
};

const RELATION_FOCUS_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.relation_focus.words': 'paid_ch3__relation_focus_words',
  'paid.relation_focus.timing': 'paid_ch3__relation_focus_timing',
  'paid.relation_focus.recovery': 'paid_ch3__relation_focus_recovery',
};

const FATIGUE_SIGNAL_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.fatigue_signal.after_push': 'paid_ch4__fatigue_signal_after_push',
  'paid.fatigue_signal.before_start': 'paid_ch4__fatigue_signal_before_start',
  'paid.fatigue_signal.long_stretch': 'paid_ch4__fatigue_signal_long_stretch',
};

const RECOVERY_SEQUENCE_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.recovery_sequence.pause_first': 'paid_ch4__recovery_sequence_pause_first',
  'paid.recovery_sequence.small_start': 'paid_ch4__recovery_sequence_small_start',
  'paid.recovery_sequence.sort_materials': 'paid_ch4__recovery_sequence_sort_materials',
};

const RESTART_CONDITION_SELECTOR_BY_ANSWER: Readonly<Record<string, PaidChapterEmphasisIdV1>> = {
  'paid.restart_condition.overview_first': 'paid_ch4__restart_condition_overview_first',
  'paid.restart_condition.shrink_scope': 'paid_ch4__restart_condition_shrink_scope',
  'paid.restart_condition.trusted_support': 'paid_ch4__restart_condition_trusted_support',
};

type CurrentPaidConsequenceSelectors = Readonly<{
  work: PaidChapterEmphasisIdV1;
  decision: PaidChapterEmphasisIdV1;
  relation: PaidChapterEmphasisIdV1;
  fatigue: PaidChapterEmphasisIdV1;
  recovery: PaidChapterEmphasisIdV1;
  restart: PaidChapterEmphasisIdV1;
}>;

function resolveCurrentPaidConsequenceSelectors(
  paidAnswerSet: Readonly<Record<string, string>> | null | undefined,
): CurrentPaidConsequenceSelectors | null {
  if (!paidAnswerSet) return null;
  const isCurrentPaidSet = CURRENT_PAID_QUESTION_IDS.some(
    (questionId) => paidAnswerSet[questionId] !== undefined,
  );
  if (!isCurrentPaidSet) return null;

  const work = WORK_FOCUS_SELECTOR_BY_ANSWER[paidAnswerSet['paid.work_focus'] ?? ''];
  const decision = DECISION_FRICTION_SELECTOR_BY_ANSWER[
    paidAnswerSet['paid.decision_friction'] ?? ''
  ];
  const relation = RELATION_FOCUS_SELECTOR_BY_ANSWER[
    paidAnswerSet['paid.relation_focus'] ?? ''
  ];
  const fatigue = FATIGUE_SIGNAL_SELECTOR_BY_ANSWER[
    paidAnswerSet['paid.fatigue_signal'] ?? ''
  ];
  const recovery = RECOVERY_SEQUENCE_SELECTOR_BY_ANSWER[
    paidAnswerSet['paid.recovery_sequence'] ?? ''
  ];
  const restart = RESTART_CONDITION_SELECTOR_BY_ANSWER[
    paidAnswerSet['paid.restart_condition'] ?? ''
  ];
  if (!work || !decision || !relation || !fatigue || !recovery || !restart) {
    throw new Error('invalid current paid answer set');
  }
  return { work, decision, relation, fatigue, recovery, restart };
}

function resolvePaidChapterEmphasis(
  input: ResolveIndividualizationSelectorsInputV1,
  strainIds: readonly StrainSelectorIdV1[],
): IndividualizationSelectorBundleV1['paidChapterEmphasisIds'] {
  const generic = resolveGenericPaidChapterEmphasis(input, strainIds);
  const exact = resolveCurrentPaidConsequenceSelectors(input.paidAnswerSet);
  if (!exact) return generic;

  return {
    chapter1: generic.chapter1,
    chapter2: [exact.work, exact.decision, ...generic.chapter2.slice(0, 1)],
    chapter3: [exact.relation, ...generic.chapter3.slice(0, 2)],
    chapter4: [exact.fatigue, exact.recovery, exact.restart],
  };
}

function freeExpressionWorkBoost(
  input: ResolveIndividualizationSelectorsInputV1,
  chapter: ChapterHintId,
): boolean {
  return chapter === 'II' && input.freeExpression.primaryReplyTheme === 'work';
}

function validateAlignDivergeItems(
  items: readonly AlignDivergeItem[],
  field: string,
): ResolveIndividualizationSelectorsResultV1 | null {
  for (const item of items) {
    if (!isExpressionAxisId(item.axisId)) {
      return fail('selector_resolution_failed', { field, invariant: 'unknown_axis' });
    }
    if (item.relation !== 'align' && item.relation !== 'diverge') {
      return fail('selector_resolution_failed', { field, invariant: 'invalid_relation' });
    }
  }
  return null;
}

function validateInput(
  input: ResolveIndividualizationSelectorsInputV1,
): ResolveIndividualizationSelectorsResultV1 | null {
  if (input.selectorVersion !== INDIVIDUALIZATION_SELECTOR_VERSION_V1) {
    return fail('unknown_selector_version', {
      expectedVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
      receivedVersion: input.selectorVersion,
    });
  }

  if (
    input.catalogVersion !== undefined &&
    input.catalogVersion !== INDIVIDUALIZATION_SELECTOR_CATALOG_VERSION_V1
  ) {
    return fail('selector_version_mismatch', {
      expectedVersion: INDIVIDUALIZATION_SELECTOR_CATALOG_VERSION_V1,
      receivedVersion: input.catalogVersion,
    });
  }

  if (input.fingerprintSpecVersion !== FINGERPRINT_SPEC_VERSION) {
    return fail('selector_resolution_failed', {
      field: 'fingerprintSpecVersion',
      expectedVersion: FINGERPRINT_SPEC_VERSION,
      receivedVersion: input.fingerprintSpecVersion,
    });
  }

  if (!input.dobBase?.dobFp || !input.dobBase.axes) {
    return fail('selector_resolution_failed', { field: 'dobBase' });
  }

  if (!input.freeExpression?.axes || !input.freeExpression.primaryReplyTheme) {
    return fail('selector_resolution_failed', { field: 'freeExpression' });
  }

  const theme = input.freeExpression.primaryReplyTheme;
  if (!THEME_TO_FREE_PRIMARY[theme]) {
    return fail('selector_resolution_failed', {
      field: 'freeExpression.primaryReplyTheme',
      invariant: 'unknown_theme',
    });
  }

  for (const check of [
    validateAlignDivergeItems(input.alignItems, 'alignItems'),
    validateAlignDivergeItems(input.divergeItems, 'divergeItems'),
    input.freePick
      ? validateAlignDivergeItems([input.freePick], 'freePick')
      : null,
  ]) {
    if (check) return check;
  }

  if (!input.intensity || !['low', 'mid', 'high'].includes(input.intensity.level)) {
    return fail('selector_resolution_failed', { field: 'intensity' });
  }

  if (!input.hesitation) {
    return fail('selector_resolution_failed', { field: 'hesitation' });
  }

  if (!input.reactiveContext) {
    return fail('selector_resolution_failed', { field: 'reactiveContext' });
  }

  if (!input.replyAffinity?.ranked) {
    return fail('selector_resolution_failed', { field: 'replyAffinity' });
  }

  return null;
}

function validateBundle(
  bundle: IndividualizationSelectorBundleV1,
): ResolveIndividualizationSelectorsResultV1 | null {
  if (bundle.version !== INDIVIDUALIZATION_SELECTOR_VERSION_V1) {
    return fail('invalid_selector_bundle', { invariant: 'version' });
  }

  if (bundle.strainSelectorIds.length > 1) {
    return fail('selector_count_overflow', { role: 'strain' });
  }

  if (bundle.recoverySelectorIds.length > 1) {
    return fail('selector_count_overflow', { role: 'recovery' });
  }

  const expectedFreeCount =
    bundle.recoverySelectorIds.length === 1 ? 8 : 7;
  if (bundle.freeBlockSelectorIds.length !== expectedFreeCount) {
    return fail('invalid_selector_bundle', {
      role: 'free_block',
      invariant: 'count',
    });
  }

  const allKnownIds = new Set<string>([
    ...STRAIN_SELECTOR_CATALOG_V1.map((e) => e.id),
    ...RECOVERY_SELECTOR_CATALOG_V1.map((e) => e.id),
    ...FREE_BLOCK_SELECTOR_CATALOG_V1.map((e) => e.id),
    ...PAID_CHAPTER_EMPHASIS_CATALOG_V1.map((e) => e.id),
  ]);

  const flatIds: string[] = [
    ...bundle.strainSelectorIds,
    ...bundle.recoverySelectorIds,
    ...bundle.freeBlockSelectorIds,
    ...bundle.paidChapterEmphasisIds.chapter1,
    ...bundle.paidChapterEmphasisIds.chapter2,
    ...bundle.paidChapterEmphasisIds.chapter3,
    ...bundle.paidChapterEmphasisIds.chapter4,
  ];

  if (flatIds.length === 0) {
    return fail('invalid_selector_bundle', { invariant: 'empty_bundle' });
  }

  for (const id of flatIds) {
    if (!allKnownIds.has(id)) {
      return fail('unknown_selector_id', { field: 'selectorId' });
    }
  }

  const freeSet = new Set(bundle.freeBlockSelectorIds);
  if (freeSet.size !== bundle.freeBlockSelectorIds.length) {
    return fail('duplicate_selector_id', { role: 'free_block' });
  }

  const globalPaid = new Set<PaidChapterEmphasisIdV1>();
  for (const chapter of ['chapter1', 'chapter2', 'chapter3', 'chapter4'] as const) {
    const ids = bundle.paidChapterEmphasisIds[chapter];
    if (ids.length < 1 || ids.length > 3) {
      return fail('selector_count_overflow', { chapter: chapterToHint(chapter) });
    }
    for (const id of ids) {
      if (globalPaid.has(id)) {
        return fail('duplicate_selector_id', { chapter: chapterToHint(chapter) });
      }
      globalPaid.add(id);
    }
  }

  let roleIndex = 0;
  for (const role of FREE_BLOCK_ROLE_ORDER_V1) {
    if (role === 'recovery' && bundle.recoverySelectorIds.length === 0) continue;
    const id = bundle.freeBlockSelectorIds[roleIndex];
    if (!id) {
      return fail('invalid_selector_bundle', { role, invariant: 'missing_role' });
    }
    const catalogEntry = FREE_BLOCK_SELECTOR_CATALOG_V1.find((entry) => entry.id === id);
    if (!catalogEntry || catalogEntry.role !== role) {
      return fail('contradictory_selector_state', { role });
    }
    roleIndex += 1;
  }

  return null;
}

function chapterToHint(chapter: PaidChapterKey): ChapterHintId {
  const map: Record<PaidChapterKey, ChapterHintId> = {
    chapter1: 'I',
    chapter2: 'II',
    chapter3: 'III',
    chapter4: 'IV',
  };
  return map[chapter];
}

function applyStrainCh4Suppression(
  strainIds: StrainSelectorIdV1[],
  paidChapterEmphasis: IndividualizationSelectorBundleV1['paidChapterEmphasisIds'],
): StrainSelectorIdV1[] {
  if (strainIds.length === 0) return strainIds;
  if (paidChapterEmphasis.chapter4.includes('paid_ch4__strain_life_context')) {
    return [];
  }
  return strainIds;
}

export function resolveIndividualizationSelectorsV1(
  input: ResolveIndividualizationSelectorsInputV1,
): ResolveIndividualizationSelectorsResultV1 {
  const validationError = validateInput(input);
  if (validationError) return validationError;

  try {
    const rawStrainIds = resolveStrainSelectors(input);
    const recoveryIds = resolveRecoverySelectors(input);
    const paidChapterEmphasis = resolvePaidChapterEmphasis(input, rawStrainIds);
    const strainIds = applyStrainCh4Suppression(rawStrainIds, paidChapterEmphasis);
    const freeBlockSelectorIds = resolveFreeBlockSelectors(
      input,
      rawStrainIds,
      recoveryIds,
    );

    const bundle: IndividualizationSelectorBundleV1 = {
      version: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
      strainSelectorIds: strainIds,
      recoverySelectorIds: recoveryIds,
      freeBlockSelectorIds,
      paidChapterEmphasisIds: paidChapterEmphasis,
    };

    const bundleError = validateBundle(bundle);
    if (bundleError) return bundleError;

    return { ok: true, value: bundle };
  } catch {
    return fail('selector_resolution_failed');
  }
}
