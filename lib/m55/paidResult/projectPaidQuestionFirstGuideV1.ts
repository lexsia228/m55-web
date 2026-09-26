/**
 * Display-only question-first guide for the purchased Premium reader.
 * Routes into existing drawer panels. Does not resolve answers or selectors.
 */

import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import type { PremiumPurchasedSemanticProjectionV1 } from '../narrative/buildPremiumPurchasedSemanticProjectionV1';
import {
  PAID_DTR_DRAWER_THEME_ENTRIES,
  type PaidDtrDrawerThemeEntry,
  type PaidDtrDrawerThemeEntryId,
  type PaidDtrDrawerThemePrimaryPanel,
} from '../paidDtrProductCopy';
import { PAID_CHAPTER_EMPHASIS_COPY_V1 } from './paidChapterEmphasisCopyV1';

export type PaidQuestionFirstRevealStateV1 = 'EXACT_PAID_REVEAL' | 'NAVIGATION_ONLY';

export type PaidQuestionFirstGuideEntryIdV1 = Extract<
  PaidDtrDrawerThemeEntryId,
  'theme-work' | 'theme-relationship' | 'theme-rest'
>;

export type PaidQuestionFirstGuideEntryV1 = {
  id: PaidQuestionFirstGuideEntryIdV1;
  labelJa: string;
  sublabelJa: string;
  panel: Extract<PaidDtrDrawerThemePrimaryPanel, 'chapter-2' | 'chapter-3' | 'chapter-4'>;
  chapterLabelJa: string;
  personalizedFocusLinesJa: readonly string[];
};

export type PaidQuestionFirstGuideV1 = {
  reveal: PaidQuestionFirstRevealStateV1;
  overlineJa: string;
  titleJa: string;
  leadJa: string;
  revealNoteJa: string | null;
  entries: readonly [
    PaidQuestionFirstGuideEntryV1,
    PaidQuestionFirstGuideEntryV1,
    PaidQuestionFirstGuideEntryV1,
  ];
};

const QUESTION_FIRST_THEME_ORDER = [
  'theme-work',
  'theme-relationship',
  'theme-rest',
] as const satisfies readonly PaidQuestionFirstGuideEntryIdV1[];

const GUIDE_OVERLINE_JA = '読み始める場所';
const GUIDE_TITLE_JA = '今知りたいことから読む';
const GUIDE_LEAD_JA = '今、気になっているテーマから読み進められます。';
const EXACT_REVEAL_NOTE_JA = 'あなたの6問への回答をもとに、このレポートでは次のポイントを重点的に扱っています。';

const CHAPTER2_FAMILIES = [
  /^paid_ch2__work_focus_/,
  /^paid_ch2__decision_friction_/,
] as const;

const CHAPTER3_FAMILIES = [/^paid_ch3__relation_focus_/] as const;

const CHAPTER4_FAMILIES = [
  /^paid_ch4__fatigue_signal_/,
  /^paid_ch4__recovery_sequence_/,
  /^paid_ch4__restart_condition_/,
] as const;

type ConsequenceIds = PremiumPurchasedSemanticProjectionV1['paidSemanticConsequenceIds'];

function themeEntry(id: PaidQuestionFirstGuideEntryIdV1): PaidDtrDrawerThemeEntry {
  const entry = PAID_DTR_DRAWER_THEME_ENTRIES.find((row) => row.id === id);
  if (!entry) {
    throw new Error(`question-first theme missing: ${id}`);
  }
  return entry;
}

function displayCopy(id: PaidChapterEmphasisIdV1): string | null {
  const copy = PAID_CHAPTER_EMPHASIS_COPY_V1[id];
  if (typeof copy !== 'string' || copy.trim().length === 0) return null;
  return copy;
}

function exactFamilyLines(
  ids: readonly PaidChapterEmphasisIdV1[],
  families: readonly RegExp[],
): readonly string[] | null {
  if (ids.length !== families.length) return null;
  if (new Set(ids).size !== ids.length) return null;

  const lines: string[] = [];
  const used = new Set<PaidChapterEmphasisIdV1>();
  for (const family of families) {
    const matches = ids.filter((id) => family.test(id));
    if (matches.length !== 1) return null;
    const id = matches[0];
    if (used.has(id)) return null;
    const line = displayCopy(id);
    if (!line) return null;
    used.add(id);
    lines.push(line);
  }
  if (used.size !== ids.length) return null;
  return lines;
}

function exactRevealLines(ids: ConsequenceIds): {
  chapter2: readonly string[];
  chapter3: readonly string[];
  chapter4: readonly string[];
} | null {
  const chapter2 = exactFamilyLines(ids.chapter2, CHAPTER2_FAMILIES);
  const chapter3 = exactFamilyLines(ids.chapter3, CHAPTER3_FAMILIES);
  const chapter4 = exactFamilyLines(ids.chapter4, CHAPTER4_FAMILIES);
  if (!chapter2 || !chapter3 || !chapter4) return null;
  return { chapter2, chapter3, chapter4 };
}

function buildEntries(
  focus: {
    chapter2: readonly string[];
    chapter3: readonly string[];
    chapter4: readonly string[];
  } | null,
): PaidQuestionFirstGuideV1['entries'] {
  const linesForPanel: Record<'chapter-2' | 'chapter-3' | 'chapter-4', readonly string[]> = {
    'chapter-2': focus?.chapter2 ?? [],
    'chapter-3': focus?.chapter3 ?? [],
    'chapter-4': focus?.chapter4 ?? [],
  };

  const entries = QUESTION_FIRST_THEME_ORDER.map((id) => {
    const source = themeEntry(id);
    const panel = source.primaryPanel;
    if (panel !== 'chapter-2' && panel !== 'chapter-3' && panel !== 'chapter-4') {
      throw new Error(`question-first theme panel out of range: ${id}`);
    }
    return {
      id,
      labelJa: source.labelJa,
      sublabelJa: source.sublabelJa,
      panel,
      chapterLabelJa: source.primaryChapterJa,
      personalizedFocusLinesJa: linesForPanel[panel],
    };
  });

  return [entries[0], entries[1], entries[2]];
}

export function projectPaidQuestionFirstGuideV1(
  premiumProjection: Pick<PremiumPurchasedSemanticProjectionV1, 'paidSemanticConsequenceIds'> | null | undefined,
): PaidQuestionFirstGuideV1 {
  const focus = premiumProjection
    ? exactRevealLines(premiumProjection.paidSemanticConsequenceIds)
    : null;

  return {
    reveal: focus ? 'EXACT_PAID_REVEAL' : 'NAVIGATION_ONLY',
    overlineJa: GUIDE_OVERLINE_JA,
    titleJa: GUIDE_TITLE_JA,
    leadJa: GUIDE_LEAD_JA,
    revealNoteJa: focus ? EXACT_REVEAL_NOTE_JA : null,
    entries: buildEntries(focus),
  };
}
