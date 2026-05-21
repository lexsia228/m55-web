/**
 * Server-only: derive paid DTR shelf type display from immutable snapshot profile.
 * Uses same stem index function as runDtrEngine (essenceStemLaneIndex).
 */
import { essenceStemLaneIndex } from './essenceEngine';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';

export type DtrShelfStemDisplay = {
  stemLaneIndex: number;
  publicTitle: string;
  displayOneLine: string;
  nickname: string;
};

export function deriveDtrShelfStemDisplay(profile: {
  birthDate: string;
  nickname: string;
}): DtrShelfStemDisplay | null {
  const birthDate = profile.birthDate?.trim();
  if (!birthDate) return null;
  const idx = essenceStemLaneIndex(birthDate);
  const stem = TEN_STEM_DISPLAY[idx];
  if (!stem) return null;
  return {
    stemLaneIndex: idx,
    publicTitle: stem.publicTitle,
    displayOneLine: stem.displayOneLine,
    nickname: profile.nickname?.trim() ?? '',
  };
}
