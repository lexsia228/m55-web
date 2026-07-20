/**
 * Public pair-reading free result structure — shared authority for HOME and /synastry.
 * Display labels only; no result body copy or engine logic.
 */

export const PAIR_READING_FREE_STRUCTURE_ITEMS = [
  { index: '01', titleJa: '二人の変わりにくい土台' },
  { index: '02', titleJa: '今の二人に表れやすいこと' },
  { index: '03', titleJa: '二人の間で続きやすい連鎖' },
  { index: '04', titleJa: '次に一度だけ試すこと' },
] as const;

export const PAIR_READING_GUEST_SUPPORT_LINES = [
  '回答するのはあなた一人です。',
  '相手が回答したものではありません。',
] as const;

export type PairReadingFreeStructureItem = (typeof PAIR_READING_FREE_STRUCTURE_ITEMS)[number];
