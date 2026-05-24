/**
 * Public stem display SSOT — free /core and paid DTR label parity (P-TEN-STEM-PRIMARY-01).
 * Keyed by stemLaneIndex 0–9 (天干 lane). No DB access.
 */
import type { CoreResult } from './coreResult/types';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';

/** Ten-views hero image by stem lane — shared with DTR shelf / reader. */
export const STEM_LANE_TEN_VIEWS_IMAGE: Record<number, string> = {
  0: '/ten-views/president.webp',
  1: '/ten-views/planner.webp',
  2: '/ten-views/influencer.webp',
  3: '/ten-views/creator.webp',
  4: '/ten-views/manager.webp',
  5: '/ten-views/producer.webp',
  6: '/ten-views/executor.webp',
  7: '/ten-views/designer.webp',
  8: '/ten-views/global-leader.webp',
  9: '/ten-views/analyst.webp',
};

export type PublicStemDisplay = {
  stemLaneIndex: number;
  publicTitle: string;
  displayOneLine: string;
  imagePath: string;
};

export function clampStemLaneIndex(stemLaneIndex: number): number {
  return ((stemLaneIndex % 10) + 10) % 10;
}

export function stemLaneIndexFromCoreType(coreType: string): number | null {
  const m = /^TYPE_(\d{2})$/.exec(coreType.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n - 1;
}

export function resolveStemLaneIndexForCoreResult(result: CoreResult): number {
  if (typeof result.stemLaneIndex === 'number' && result.stemLaneIndex >= 0 && result.stemLaneIndex <= 9) {
    return result.stemLaneIndex;
  }
  return stemLaneIndexFromCoreType(result.coreType) ?? 0;
}

export function resolvePublicStemDisplay(stemLaneIndex: number): PublicStemDisplay | null {
  const idx = clampStemLaneIndex(stemLaneIndex);
  const stem = TEN_STEM_DISPLAY[idx];
  if (!stem) return null;
  return {
    stemLaneIndex: idx,
    publicTitle: stem.publicTitle,
    displayOneLine: stem.displayOneLine,
    imagePath: STEM_LANE_TEN_VIEWS_IMAGE[idx] ?? '/ten-views/analyst.webp',
  };
}

export function resolvePublicTitleByStemLaneIndex(stemLaneIndex: number): string | null {
  return resolvePublicStemDisplay(stemLaneIndex)?.publicTitle ?? null;
}

/** Secondary observation trait name — not a conflicting primary diagnosis. */
export function observationTraitNameFromCoreLabel(coreLabel: string): string {
  const t = coreLabel.trim();
  if (t.endsWith('型')) return t.slice(0, -1);
  return t;
}

export function observationTraitLabelFromCoreLabel(coreLabel: string): string {
  return `観測特性：${observationTraitNameFromCoreLabel(coreLabel)}`;
}

export function resolveCorePublicStemDisplay(result: CoreResult): PublicStemDisplay {
  return resolvePublicStemDisplay(resolveStemLaneIndexForCoreResult(result))!;
}
