import type { PaidCompatibilityReportSnapshot } from './buildPaidCompatibilityReportV1';
import type { ChapterId } from './pairReadingTypes';
import type { PaidCompatibilityChapter } from './buildPaidCompatibilityReportV1';

export const COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP = 2200;

export const COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS: readonly ChapterId[] = [
  'ch_you_pace',
  'ch_other_pace',
  'ch_pair_gap',
  'ch_topic_deep',
  'ch_today_clue',
  'ch_about',
] as const;

const INTRO_CAP = 340;
const CHAPTER_BUDGET = {
  primary: 360,
  secondary: 210,
  baseline: 145,
} as const;

export const CONSULT_LOOP_SEGMENT_SEPARATOR = ' / ';

type ChapterTier = 'primary' | 'secondary' | 'baseline';

type FieldKind = 'action' | 'loop' | 'reset' | 'default';

type FieldCandidate = {
  label: string;
  kind: FieldKind;
  maxChars: number;
  text: (chapter: PaidCompatibilityChapter) => string;
};

type AssembleOptions = {
  scale: number;
  primaryExtraBudget: number;
  baselineScale: number;
  baselineHeadersOnly: boolean;
};

const EXCERPT_TRUNCATION_MARK = '…';

function appendExcerptTruncationMark(slice: string, maxChars: number): string {
  const mark = EXCERPT_TRUNCATION_MARK;
  if (slice.length + mark.length <= maxChars) return `${slice}${mark}`;
  const trimmedSlice = slice.slice(0, Math.max(0, maxChars - mark.length));
  return trimmedSlice.length > 0 ? `${trimmedSlice}${mark}` : mark.slice(0, maxChars);
}

function excerptAtBoundary(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (!trimmed || maxChars <= 0) return '';
  if (trimmed.length <= maxChars) return trimmed;
  const markLen = EXCERPT_TRUNCATION_MARK.length;
  const contentBudget = Math.max(1, maxChars - markLen);
  const window = trimmed.slice(0, contentBudget);
  let cutAt = -1;
  for (const ch of ['。', '、']) {
    const idx = window.lastIndexOf(ch);
    if (idx > cutAt) cutAt = idx;
  }
  if (cutAt >= Math.floor(contentBudget * 0.45)) {
    const slice = trimmed.slice(0, cutAt + (window[cutAt] === '。' ? 1 : 0)).trim();
    if (slice.length > 0) {
      if (slice.length >= trimmed.length) return slice;
      return appendExcerptTruncationMark(slice, maxChars);
    }
  }
  const hard = window.slice(0, contentBudget);
  return appendExcerptTruncationMark(hard, maxChars);
}

function extractActionOrientedText(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const anchors = [
    '相手の反応を想像する前に',
    '相手の反応を想像せず',
    '相手に伝える前に',
    '相手の気持ちを決めつけず',
  ];
  for (const anchor of anchors) {
    const idx = trimmed.indexOf(anchor);
    if (idx >= 0) {
      const candidate = trimmed.slice(idx).trim();
      return excerptAtBoundary(candidate, maxChars);
    }
  }
  const writeIdx = trimmed.lastIndexOf('一文で');
  if (writeIdx >= 0) {
    const start = trimmed.lastIndexOf('、', writeIdx);
    const candidate = trimmed.slice(start >= 0 ? start + 1 : writeIdx).trim();
    return excerptAtBoundary(candidate, maxChars);
  }
  return excerptAtBoundary(trimmed, maxChars);
}

function normalizeLoopItems(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
}

/** Test-visible mirror of stored loop normalization (trim only, no length drop). */
export function normalizeConsultRelationshipLoopItems(value: unknown): string[] {
  return normalizeLoopItems(value);
}

function minimumJoinedPerItemExcerptLength(itemCount: number): number {
  if (itemCount <= 0) return 0;
  if (itemCount === 1) return 1;
  const minSegmentChars = EXCERPT_TRUNCATION_MARK.length;
  return (
    itemCount * minSegmentChars +
    (itemCount - 1) * CONSULT_LOOP_SEGMENT_SEPARATOR.length
  );
}

/** Truthful loop overflow notice (source item count only). Always <= maxChars when maxChars > 0. */
export function buildConsultRelationshipLoopOverflowNotice(
  itemCount: number,
  maxChars: number,
): string {
  if (maxChars <= 0 || itemCount <= 0) return '';
  const candidates = [
    `（ループ${itemCount}項目・表示字数上限のため本文省略）`,
    `（ループ${itemCount}項目・省略）`,
    `（${itemCount}項目省略）`,
  ];
  for (const text of candidates) {
    if (text.length <= maxChars) return text;
  }
  return excerptAtBoundary(`（${itemCount}項`, maxChars);
}

/** Test-only entry: primary-tier loop compaction under a field cap. */
export function formatConsultRelationshipLoopUnderCap(
  segments: readonly string[],
  maxChars: number,
): string {
  return compactLoopSegmentsInOrder(segments, maxChars, 'primary');
}

function compactLoopSegmentsInOrder(
  segments: readonly string[],
  maxChars: number,
  _tier: ChapterTier,
): string {
  const sources = segments.map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  if (sources.length === 0) return '';
  if (sources.length === 1) return excerptAtBoundary(sources[0]!, maxChars);

  const fullJoin = sources.join(CONSULT_LOOP_SEGMENT_SEPARATOR);
  if (fullJoin.length <= maxChars) return fullJoin;

  if (minimumJoinedPerItemExcerptLength(sources.length) > maxChars) {
    return buildConsultRelationshipLoopOverflowNotice(sources.length, maxChars);
  }

  let working = [...sources];
  let joined = working.join(CONSULT_LOOP_SEGMENT_SEPARATOR);

  for (let round = 0; round < 12 && joined.length > maxChars; round += 1) {
    let longestIndex = 0;
    for (let index = 1; index < working.length; index += 1) {
      if (working[index]!.length > working[longestIndex]!.length) longestIndex = index;
    }
    for (let pass = 0; pass < working.length && joined.length > maxChars; pass += 1) {
      const index = (longestIndex + pass) % working.length;
      const original = sources[index]!;
      const share = Math.max(
        4,
        Math.floor(
          (maxChars - (working.length - 1) * CONSULT_LOOP_SEGMENT_SEPARATOR.length) /
            working.length,
        ),
      );
      const nextLen = Math.max(4, Math.min(working[index]!.length - 1, share));
      working[index] = excerptAtBoundary(original, nextLen);
      joined = working.join(CONSULT_LOOP_SEGMENT_SEPARATOR);
    }
  }

  if (joined.length <= maxChars) return joined;

  const separatorBudget = (working.length - 1) * CONSULT_LOOP_SEGMENT_SEPARATOR.length;
  let perPart = Math.max(
    4,
    Math.floor((maxChars - separatorBudget) / working.length),
  );
  while (perPart >= 1) {
    const parts = sources.map((source) => excerptAtBoundary(source, perPart));
    joined = parts.join(CONSULT_LOOP_SEGMENT_SEPARATOR);
    if (joined.length <= maxChars) return joined;
    perPart -= 1;
  }

  working = sources.map((source) => excerptAtBoundary(source, 1));
  joined = working.join(CONSULT_LOOP_SEGMENT_SEPARATOR);
  for (let guard = 0; guard < Math.min(4000, sources.length * 8) && joined.length > maxChars; guard += 1) {
    let longestIndex = 0;
    for (let index = 1; index < working.length; index += 1) {
      if (working[index]!.length > working[longestIndex]!.length) longestIndex = index;
    }
    const current = working[longestIndex]!;
    const bareLen = current.endsWith(EXCERPT_TRUNCATION_MARK)
      ? current.length - EXCERPT_TRUNCATION_MARK.length
      : current.length;
    if (bareLen <= 0) break;
    const nextBudget = Math.max(1, bareLen - 1);
    working[longestIndex] = excerptAtBoundary(sources[longestIndex]!, nextBudget);
    joined = working.join(CONSULT_LOOP_SEGMENT_SEPARATOR);
  }

  if (joined.length <= maxChars) return joined;

  return buildConsultRelationshipLoopOverflowNotice(sources.length, maxChars);
}

/**
 * Stored chapter relationshipLoop lines in source order (3–5+). Neutral ` / ` separators only.
 */
function formatProducerOrderedRelationshipLoop(
  value: unknown,
  maxChars: number,
  tier: ChapterTier,
): string {
  const items = normalizeLoopItems(value);
  if (items.length === 0) {
    return excerptAtBoundary(String(value ?? ''), maxChars);
  }
  if (items.length === 1) return excerptAtBoundary(items[0]!, maxChars);
  return compactLoopSegmentsInOrder(items, maxChars, tier);
}

function formatResetStepsSemantic(value: unknown, maxChars: number): string {
  if (!Array.isArray(value) || value.length === 0) {
    return excerptAtBoundary(String(value ?? ''), maxChars);
  }
  const first = String(value[0] ?? '').trim();
  if (first.length <= maxChars) return first;
  return excerptAtBoundary(first, maxChars);
}

function extractFieldText(
  kind: FieldKind,
  raw: string,
  loopOrResetSource: unknown,
  maxChars: number,
  tier: ChapterTier,
): string {
  if (maxChars <= 0) return '';
  if (kind === 'action') return extractActionOrientedText(raw, maxChars);
  if (kind === 'loop') return formatProducerOrderedRelationshipLoop(loopOrResetSource, maxChars, tier);
  if (kind === 'reset') return formatResetStepsSemantic(loopOrResetSource, maxChars);
  if (!raw.trim()) return '';
  return excerptAtBoundary(raw, maxChars);
}

function buildIntro(snapshot: PaidCompatibilityReportSnapshot, introMaxHead?: number): string {
  const hasCtx = Boolean(snapshot.currentContext);
  const parts: string[] = [
    `レポート名: ${snapshot.reportTitle}`,
    `関係の要約: ${excerptAtBoundary(snapshot.relationshipSummary, hasCtx ? 120 : 240)}`,
    `共通の土台: ${excerptAtBoundary(snapshot.sharedFoundation, hasCtx ? 90 : 160)}`,
    `違いの土台: ${excerptAtBoundary(snapshot.differentFoundation, hasCtx ? 90 : 160)}`,
    `すれ違いの連鎖: ${excerptAtBoundary(snapshot.recurringLoop, hasCtx ? 100 : 200)}`,
  ];
  if (snapshot.currentContext) {
    const ctx = snapshot.currentContext;
    parts.push(`本人の回答（表示用）: ${excerptAtBoundary(ctx.currentExpression, 150)}`);
    parts.push(`いまの関係ループ: ${excerptAtBoundary(ctx.relationshipLoop, 150)}`);
    parts.push(`読み解きの焦点: ${excerptAtBoundary(ctx.focusLabel, 90)}`);
  }
  const joined = parts.join('\n');
  const cap = introMaxHead ?? INTRO_CAP;
  if (joined.length <= cap) return joined;
  const protectedTail = hasCtx ? parts.slice(-3).join('\n') : '';
  const headBudget = Math.max(80, cap - protectedTail.length - (protectedTail ? 1 : 0));
  const head = parts.slice(0, hasCtx ? -3 : parts.length).join('\n');
  const trimmedHead =
    head.length <= headBudget ? head : `${head.slice(0, Math.max(0, headBudget - 1))}…`;
  return protectedTail ? `${trimmedHead}\n${protectedTail}` : trimmedHead;
}

function resolveChapterTier(
  chapterKey: ChapterId,
  focusKeys: readonly ChapterId[],
): ChapterTier {
  if (focusKeys[0] === chapterKey) return 'primary';
  if (focusKeys[1] === chapterKey) return 'secondary';
  return 'baseline';
}

function candidatesForTier(tier: ChapterTier): readonly FieldCandidate[] {
  if (tier === 'primary') {
    return [
      {
        label: '小さな試し',
        kind: 'action',
        maxChars: 96,
        text: (c) => c.smallExperiment,
      },
      {
        label: 'ループ',
        kind: 'loop',
        maxChars: 480,
        text: (c) => c.relationshipLoop as unknown as string,
      },
      {
        label: '振り返り',
        kind: 'default',
        maxChars: 56,
        text: (c) => c.reflectionQuestion,
      },
      {
        label: '使える言い回し',
        kind: 'default',
        maxChars: 48,
        text: (c) => c.usablePhrase,
      },
      {
        label: '戻し方',
        kind: 'reset',
        maxChars: 48,
        text: (c) => c.resetSteps as unknown as string,
      },
      {
        label: '場面',
        kind: 'default',
        maxChars: 80,
        text: (c) => c.scene,
      },
    ];
  }
  if (tier === 'secondary') {
    return [
      { label: 'ループ', kind: 'loop', maxChars: 160, text: (c) => c.relationshipLoop as unknown as string },
      { label: '戻し方', kind: 'reset', maxChars: 52, text: (c) => c.resetSteps as unknown as string },
      { label: '場面', kind: 'default', maxChars: 72, text: (c) => c.scene },
      { label: '視点A', kind: 'default', maxChars: 36, text: (c) => c.personAPerspective },
    ];
  }
  return [
    { label: 'ループ', kind: 'loop', maxChars: 100, text: (c) => c.relationshipLoop as unknown as string },
    { label: '場面', kind: 'default', maxChars: 48, text: (c) => c.scene },
  ];
}

function loopOrResetSource(
  candidate: FieldCandidate,
  chapter: PaidCompatibilityChapter,
): unknown {
  if (candidate.kind === 'loop') return chapter.relationshipLoop;
  if (candidate.kind === 'reset') return chapter.resetSteps;
  return undefined;
}

function fieldRawText(candidate: FieldCandidate, chapter: PaidCompatibilityChapter): string {
  const raw = candidate.text(chapter);
  if (candidate.kind === 'loop') {
    return Array.isArray(chapter.relationshipLoop)
      ? chapter.relationshipLoop.join(' / ')
      : String(raw);
  }
  if (candidate.kind === 'reset') {
    return Array.isArray(chapter.resetSteps) ? chapter.resetSteps.join(' / ') : String(raw);
  }
  return String(raw);
}

function buildChapterSection(
  snapshot: PaidCompatibilityReportSnapshot,
  chapterKey: ChapterId,
  tier: ChapterTier,
  options: AssembleOptions,
): string {
  const chapter = snapshot.chapters.find((c) => c.key === chapterKey);
  if (!chapter) {
    return `第?章 (${chapterKey}): （章データなし）`;
  }

  const header = `第${chapter.number}章 ${chapter.title} [${chapter.key}]`;
  const isPrimaryFocus = tier === 'primary';
  const extraBudget = isPrimaryFocus ? options.primaryExtraBudget : 0;
  const scale =
    tier === 'baseline' ? options.scale * options.baselineScale : options.scale;
  const budget = Math.floor(CHAPTER_BUDGET[tier] * scale) + Math.max(0, extraBudget);

  if (tier === 'baseline' && options.baselineHeadersOnly) {
    return header;
  }

  const lines = [header];
  let used = header.length;

  for (const candidate of candidatesForTier(tier)) {
    const spaceLeft = budget - used - 1;
    if (spaceLeft < 14) break;

    const labelPrefix = `${candidate.label}: `;
    const lineOverhead = labelPrefix.length + 1;
    if (spaceLeft < lineOverhead + 8) continue;

    const raw =
      candidate.kind === 'loop' || candidate.kind === 'reset'
        ? fieldRawText(candidate, chapter)
        : String(candidate.text(chapter));

    const preferredMax = Math.floor(candidate.maxChars * scale);
    let extractMax = Math.max(
      24,
      Math.min(preferredMax, spaceLeft - lineOverhead),
    );
    if (candidate.kind === 'loop' && tier === 'primary') {
      extractMax = Math.max(extractMax, spaceLeft - lineOverhead);
    }

    const value = extractFieldText(
      candidate.kind,
      raw,
      loopOrResetSource(candidate, chapter),
      extractMax,
      tier,
    );
    if (!value) continue;

    let line = `${labelPrefix}${value}`;
    if (used + line.length + 1 > budget) {
      const tighterMax = Math.max(
        12,
        extractMax - (used + line.length + 1 - budget),
      );
      const tighter = extractFieldText(
        candidate.kind,
        raw,
        loopOrResetSource(candidate, chapter),
        tighterMax,
        tier,
      );
      if (!tighter) continue;
      line = `${labelPrefix}${tighter}`;
      if (used + line.length + 1 > budget) continue;
    }

    lines.push(line);
    used += line.length + 1;
  }

  return lines.join('\n');
}

export type CompatibilityConsultReportContextOptions = {
  focusChapterKeys?: readonly ChapterId[];
};

function assembleContext(
  snapshot: PaidCompatibilityReportSnapshot,
  focusKeys: readonly ChapterId[],
  intro: string,
  options: AssembleOptions & { primaryChapterKey: ChapterId },
): string {
  const chapterSections = COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS.map((key) =>
    buildChapterSection(snapshot, key, resolveChapterTier(key, focusKeys), {
      ...options,
      primaryExtraBudget: key === options.primaryChapterKey ? options.primaryExtraBudget : 0,
    }),
  );
  return [intro, ...chapterSections].join('\n\n').trim();
}

function contextHasSixChapterHeaders(text: string): boolean {
  return COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS.every((key) =>
    text.includes(`[${key}]`),
  );
}

function fitContextToTotalCap(
  snapshot: PaidCompatibilityReportSnapshot,
  focusKeys: readonly ChapterId[],
  cap: number,
): string {
  const primaryChapterKey = focusKeys[0] ?? COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS[0]!;
  const attemptPlans: Array<{ options: AssembleOptions; introMaxHead?: number }> = [
    { options: { scale: 1, primaryExtraBudget: 0, baselineScale: 1, baselineHeadersOnly: false } },
    {
      options: { scale: 1, primaryExtraBudget: 0, baselineScale: 1, baselineHeadersOnly: false },
      introMaxHead: 260,
    },
    { options: { scale: 0.92, primaryExtraBudget: 0, baselineScale: 0.92, baselineHeadersOnly: false } },
    { options: { scale: 0.88, primaryExtraBudget: 0, baselineScale: 0.85, baselineHeadersOnly: false } },
    { options: { scale: 0.85, primaryExtraBudget: 0, baselineScale: 0.78, baselineHeadersOnly: false } },
    { options: { scale: 0.82, primaryExtraBudget: 0, baselineScale: 0.72, baselineHeadersOnly: true } },
  ];

  for (const attempt of attemptPlans) {
    const intro = buildIntro(snapshot, attempt.introMaxHead);
    let joined = assembleContext(snapshot, focusKeys, intro, {
      ...attempt.options,
      primaryChapterKey,
    });
    if (joined.length <= cap && contextHasSixChapterHeaders(joined)) {
      const slack = cap - joined.length;
      if (slack > 48 && attempt.options.scale === 1 && !attempt.options.baselineHeadersOnly) {
        const boosted = assembleContext(snapshot, focusKeys, intro, {
          ...attempt.options,
          primaryExtraBudget: Math.min(240, slack - 12),
          primaryChapterKey,
        });
        if (
          boosted.length <= cap &&
          contextHasSixChapterHeaders(boosted)
        ) {
          return boosted;
        }
      }
      return joined;
    }
  }

  const intro = buildIntro(snapshot, 180);
  const joined = assembleContext(snapshot, focusKeys, intro, {
    scale: 0.78,
    primaryExtraBudget: 0,
    baselineScale: 0.6,
    baselineHeadersOnly: true,
    primaryChapterKey,
  });
  if (joined.length <= cap && contextHasSixChapterHeaders(joined)) {
    return joined;
  }

  const tighterIntro = buildIntro(snapshot, 120);
  const tighter = assembleContext(snapshot, focusKeys, tighterIntro, {
    scale: 0.75,
    primaryExtraBudget: 0,
    baselineScale: 0.55,
    baselineHeadersOnly: true,
    primaryChapterKey,
  });
  return tighter.length <= cap && contextHasSixChapterHeaders(tighter) ? tighter : tighter;
}

/**
 * Build Pair consult grounding from the owned six-chapter snapshot and questionnaire display fields only.
 */
export function buildCompatibilityConsultReportContext(
  snapshot: PaidCompatibilityReportSnapshot,
  options: CompatibilityConsultReportContextOptions = {},
): string {
  const focusKeys =
    options.focusChapterKeys && options.focusChapterKeys.length > 0
      ? options.focusChapterKeys
      : COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS;

  return fitContextToTotalCap(
    snapshot,
    focusKeys,
    COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP,
  );
}

export function snapshotIncludesAllSixConsultChapters(
  snapshot: PaidCompatibilityReportSnapshot,
): boolean {
  return COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS.every((key) =>
    snapshot.chapters.some((chapter) => chapter.key === key),
  );
}

/** Test helper: extract one chapter block from assembled consult context. */
export function extractCompatibilityConsultChapterSection(
  context: string,
  chapterKey: ChapterId,
): string {
  const escaped = chapterKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`第\\d+章[^\\n]*\\[${escaped}\\][\\s\\S]*?(?=\\n\\n第|$)`);
  return context.match(re)?.[0] ?? '';
}

/** Test helper: split consult loop line into source-order segments. */
export function splitConsultLoopSegments(loopLine: string): string[] {
  const body = loopLine.replace(/^ループ:\s*/, '').trim();
  if (!body) return [];
  return body.split(CONSULT_LOOP_SEGMENT_SEPARATOR).map((part) => part.trim()).filter(Boolean);
}

/** Test helper: minimum verifiable substring for a source loop line. */
export function consultLoopSourceProbe(sourceLine: string): string {
  const trimmed = sourceLine.trim();
  if (trimmed.length <= 20) return trimmed;
  const clauseEnd = trimmed.search(/[。！？?]/);
  if (clauseEnd >= 12 && clauseEnd <= 48) {
    return trimmed.slice(0, clauseEnd + (trimmed[clauseEnd] === '。' ? 1 : 0));
  }
  return trimmed.slice(0, 20);
}
