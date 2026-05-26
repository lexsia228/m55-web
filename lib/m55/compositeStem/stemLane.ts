import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import type { LunarCivilDayRow } from '../calendar/calendarBundleTypes';
import { M55CompositeStemError, type CompositeStemPaidDisplay } from './types';

/** P-LUNAR: stem lane comes only from precomputed lunar civil table (no civil JDN). */
export function stemFromLunarRow(row: LunarCivilDayRow): {
  stemLaneIndex: number;
  stemChar: string;
  paid: CompositeStemPaidDisplay;
} {
  const stemLaneIndex = row.dayStemIndex;
  if (stemLaneIndex < 0 || stemLaneIndex > 9) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL');
  }
  const display = TEN_STEM_DISPLAY[stemLaneIndex]!;
  if (display.stemChar !== row.dayStemChar) {
    throw new M55CompositeStemError('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL');
  }
  return {
    stemLaneIndex,
    stemChar: row.dayStemChar,
    paid: {
      stemChar: display.stemChar,
      publicTitle: display.publicTitle,
      symbol: display.symbol,
    },
  };
}
