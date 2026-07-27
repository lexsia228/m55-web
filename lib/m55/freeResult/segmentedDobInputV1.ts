/**
 * Segmented DOB parse/validate helpers for continuous free-result intake.
 * Date-only YYYY-MM-DD semantics — no timezone conversion.
 */

export type SegmentedDobParts = {
  year: string;
  month: string;
  day: string;
};

export type SegmentedDobParseResult =
  | { ok: true; birthDate: string; parts: SegmentedDobParts }
  | { ok: false; errorJa: string };

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/** Extract digits and optional separators from paste / typed blobs. */
export function normalizeDobPasteInput(raw: string): string {
  return raw.trim().replace(/[./]/g, '-').replace(/\s+/g, '');
}

/**
 * Accepts:
 * - YYYYMMDD
 * - YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
 * - partial segmented fields via parts
 */
export function parseFlexibleDobInput(raw: string): SegmentedDobParts | null {
  const normalized = normalizeDobPasteInput(raw);
  const compact = normalized.replace(/-/g, '');
  if (/^\d{8}$/.test(compact)) {
    return {
      year: compact.slice(0, 4),
      month: compact.slice(4, 6),
      day: compact.slice(6, 8),
    };
  }
  const dashed = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashed) {
    return {
      year: dashed[1]!,
      month: pad2(Number(dashed[2])),
      day: pad2(Number(dashed[3])),
    };
  }
  return null;
}

export function partsFromIsoDate(iso: string): SegmentedDobParts | null {
  const m = iso.trim().match(DATE_ONLY_RE);
  if (!m) return null;
  return { year: m[1]!, month: m[2]!, day: m[3]! };
}

export function validateSegmentedDob(parts: SegmentedDobParts): SegmentedDobParseResult {
  const yearRaw = parts.year.trim();
  const monthRaw = parts.month.trim();
  const dayRaw = parts.day.trim();

  if (!yearRaw || !monthRaw || !dayRaw) {
    return { ok: false, errorJa: '年・月・日をすべて入力してください。' };
  }
  if (!/^\d{4}$/.test(yearRaw) || !/^\d{1,2}$/.test(monthRaw) || !/^\d{1,2}$/.test(dayRaw)) {
    return { ok: false, errorJa: '数字で入力してください。' };
  }

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (year < 1900 || year > 2100) {
    return { ok: false, errorJa: '年は1900〜2100の範囲で入力してください。' };
  }
  if (month < 1 || month > 12) {
    return { ok: false, errorJa: '月は1〜12で入力してください。' };
  }
  const dim = daysInMonth(year, month);
  if (day < 1 || day > dim) {
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      return { ok: false, errorJa: 'うるう年ではないため、2月29日は使えません。' };
    }
    return { ok: false, errorJa: '存在しない日付です。日を確認してください。' };
  }

  const birthDate = `${yearRaw}-${pad2(month)}-${pad2(day)}`;
  // Guard against JS Date timezone shifting: reconstruct and compare UTC date-only.
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return { ok: false, errorJa: '存在しない日付です。日を確認してください。' };
  }

  return {
    ok: true,
    birthDate,
    parts: { year: yearRaw, month: pad2(month), day: pad2(day) },
  };
}

export function parseAndValidateDobInput(raw: string): SegmentedDobParseResult {
  const parts = parseFlexibleDobInput(raw);
  if (!parts) {
    return {
      ok: false,
      errorJa: 'YYYYMMDD または YYYY-MM-DD の形式で入力してください。',
    };
  }
  return validateSegmentedDob(parts);
}

/** Six-step free-result creation axis labels (display only). */
export const FREE_CONTINUOUS_FLOW_STEPS_JA = [
  '生年月日',
  '始め方',
  '決め方',
  '回復の仕方',
  '人との距離',
  '変化への向き合い方',
] as const;

export const FREE_CONTINUOUS_FLOW_TOTAL = 6 as const;
