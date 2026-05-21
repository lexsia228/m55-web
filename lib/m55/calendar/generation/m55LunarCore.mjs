/**
 * M55 calendar bundle — lunisolar conversion core (generation-only).
 * Bit-packed lunar year info (1900–2100), public-domain almanac pattern.
 * Day stem uses lunar absolute-day delta from M55 golden anchor 1983-02-28 → 癸 (9).
 * No civil JDN fallback for stem.
 */

/** @type {readonly number[]} */
export const LUNAR_INFO_1900_2100 = Object.freeze([
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x1d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0b4a0, 0x0b4a5, 0x06a50, 0x06d40, 0x1af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14d55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520,
]);

export const STEM_CHARS = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);

/** M55 v2 golden anchor — ENGINE-SPEC-C-R / GX-01 */
export const M55_GOLDEN_ANCHOR = Object.freeze({
  civilDate: '1983-02-28',
  bucket: 'Asia/Tokyo',
  dayStemIndex: 9,
  dayStemChar: '癸',
});

const BASE_YEAR = 1900;
const LUNAR_ABS_BASE_YEAR = 1899;
const LUNAR_EPOCH = { y: 1900, m: 1, d: 31 };
/** Year 1899 bit info (civil dates before 1900-01-31 CNY). */
const LUNAR_INFO_1899 = 0x0a5a0;

export function assertInLunarRange(year) {
  if (year < BASE_YEAR || year > 2100) {
    throw new Error('M55_COMPOSITE_DATE_OUT_OF_RANGE');
  }
}

function assertLunarYearForAbs(year) {
  if (year < LUNAR_ABS_BASE_YEAR || year > 2100) {
    throw new Error('M55_COMPOSITE_DATE_OUT_OF_RANGE');
  }
}

function lunarInfoBits(year) {
  if (year === 1899) return LUNAR_INFO_1899;
  return LUNAR_INFO_1900_2100[year - BASE_YEAR];
}

function lunarInfoIndex(year) {
  return year - BASE_YEAR;
}

export function leapMonth(year) {
  return lunarInfoBits(year) & 0xf;
}

export function leapDays(year) {
  if (leapMonth(year)) {
    return (lunarInfoBits(year) & 0x10000) ? 30 : 29;
  }
  return 0;
}

export function lunarMonthDays(year, month) {
  return (lunarInfoBits(year) & (0x10000 >> month)) ? 30 : 29;
}

export function lunarYearDays(year) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += lunarInfoBits(year) & i ? 1 : 0;
  }
  return sum + leapDays(year);
}

/** Gregorian civil date → Julian day number (integer, proleptic Gregorian). */
export function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function lunarMonthTotalDays(year, month, isLeapMonth) {
  return isLeapMonth ? leapDays(year) : lunarMonthDays(year, month);
}

/** Absolute lunar day count from lunar epoch (1900-01-01 lunar = day 1). */
export function lunarAbsoluteDay(lunarYear, lunarMonth, lunarDay, isLeapMonth = false) {
  assertLunarYearForAbs(lunarYear);
  let total = 0;
  for (let y = LUNAR_ABS_BASE_YEAR; y < lunarYear; y += 1) {
    total += lunarYearDays(y);
  }
  const leap = leapMonth(lunarYear);
  const monthsInYear = leap ? 13 : 12;
  for (let m = 1; m < lunarMonth; m += 1) {
    const isLeap = leap > 0 && m === leap + 1;
    if (isLeap) {
      total += leapDays(lunarYear);
    }
    total += lunarMonthDays(lunarYear, m);
  }
  if (isLeapMonth && leap > 0 && lunarMonth === leap + 1) {
    total += lunarMonthDays(lunarYear, lunarMonth);
  }
  total += lunarDay;
  return total;
}

function solarToLunarForward(offset, lunarYearStart) {
  let offsetRemain = offset;
  let lunarYear = lunarYearStart;
  for (let y = lunarYearStart; y <= 2100 && offsetRemain > 0; y += 1) {
    const yearDays = lunarYearDays(y);
    offsetRemain -= yearDays;
    if (offsetRemain < 0) {
      offsetRemain += yearDays;
      lunarYear = y;
      break;
    }
    lunarYear = y;
  }

  const leap = leapMonth(lunarYear);
  let isLeapMonth = false;
  let lunarMonth = 1;

  for (let m = 1; m < 13; m += 1) {
    let monthDayCount;
    if (leap > 0 && m === leap + 1 && !isLeapMonth) {
      m -= 1;
      isLeapMonth = true;
      monthDayCount = leapDays(lunarYear);
    } else {
      monthDayCount = lunarMonthDays(lunarYear, m);
      isLeapMonth = false;
    }
    if (offsetRemain < monthDayCount) {
      lunarMonth = m;
      break;
    }
    offsetRemain -= monthDayCount;
    lunarMonth = m;
  }

  return {
    lunarYear,
    lunarMonth,
    lunarDay: offsetRemain + 1,
    isLeapMonth,
  };
}

function solarToLunarBeforeEpoch(year, month, day) {
  let daysBack = gregorianToJdn(LUNAR_EPOCH.y, LUNAR_EPOCH.m, LUNAR_EPOCH.d) - gregorianToJdn(year, month, day);
  let lunarYear = BASE_YEAR;
  let lunarMonth = 1;
  let lunarDay = 1;
  let isLeapMonth = false;

  while (daysBack > 0) {
    if (lunarDay > 1) {
      lunarDay -= 1;
      daysBack -= 1;
      continue;
    }

    if (isLeapMonth) {
      isLeapMonth = false;
      lunarDay = lunarMonthDays(lunarYear, lunarMonth);
      daysBack -= 1;
      continue;
    }

    const leap = leapMonth(lunarYear);
    if (lunarMonth > 1) {
      const prev = lunarMonth - 1;
      if (leap > 0 && prev === leap) {
        isLeapMonth = true;
        lunarMonth = prev;
        lunarDay = leapDays(lunarYear);
      } else {
        lunarMonth = prev;
        lunarDay = lunarMonthDays(lunarYear, lunarMonth);
      }
      daysBack -= 1;
      continue;
    }

    lunarYear -= 1;
    if (lunarYear < 1899) {
      throw new Error('M55_COMPOSITE_DATE_OUT_OF_RANGE');
    }
    const endLeap = leapMonth(lunarYear);
    if (endLeap > 0) {
      isLeapMonth = true;
      lunarMonth = endLeap;
      lunarDay = leapDays(lunarYear);
    } else {
      lunarMonth = 12;
      lunarDay = lunarMonthDays(lunarYear, 12);
    }
    daysBack -= 1;
  }

  return { lunarYear, lunarMonth, lunarDay, isLeapMonth };
}

/**
 * Lunisolar conversion (1900-01-31 = 1900-正月初一; pre-epoch civil dates walk backward).
 * @returns {{ lunarYear: number, lunarMonth: number, lunarDay: number, isLeapMonth: boolean }}
 */
export function solarToLunar(year, month, day) {
  assertInLunarRange(year);
  const epochJdn = gregorianToJdn(LUNAR_EPOCH.y, LUNAR_EPOCH.m, LUNAR_EPOCH.d);
  const targetJdn = gregorianToJdn(year, month, day);
  if (targetJdn < epochJdn) {
    return solarToLunarBeforeEpoch(year, month, day);
  }
  const offset = targetJdn - epochJdn;
  const result = solarToLunarForward(offset, BASE_YEAR);
  if (result.lunarDay < 1 || result.lunarMonth < 1 || result.lunarMonth > 12) {
    throw new Error('M55_COMPOSITE_CALENDAR_TABLE_INTEGRITY_FAIL');
  }
  return result;
}

let cachedAnchorAbs = null;

function anchorLunarAbs() {
  if (cachedAnchorAbs == null) {
    const [y, m, d] = M55_GOLDEN_ANCHOR.civilDate.split('-').map(Number);
    const lunar = solarToLunar(y, m, d);
    cachedAnchorAbs = lunarAbsoluteDay(
      lunar.lunarYear,
      lunar.lunarMonth,
      lunar.lunarDay,
      lunar.isLeapMonth,
    );
  }
  return cachedAnchorAbs;
}

/** P-LUNAR day stem: lunar absolute-day delta from M55 anchor (no civil JDN). */
export function lunarDayStemIndex(lunarYear, lunarMonth, lunarDay, isLeapMonth = false) {
  const abs = lunarAbsoluteDay(lunarYear, lunarMonth, lunarDay, isLeapMonth);
  const delta = abs - anchorLunarAbs();
  return ((M55_GOLDEN_ANCHOR.dayStemIndex + delta) % 10 + 10) % 10;
}

export function isoDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error('M55_COMPOSITE_INVALID_BIRTHDATE');
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function* iterateCivilRange(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  let jdn = gregorianToJdn(start.year, start.month, start.day);
  const endJdn = gregorianToJdn(end.year, end.month, end.day);
  while (jdn <= endJdn) {
    const g = jdnToGregorian(jdn);
    yield isoDateKey(g.year, g.month, g.day);
    jdn += 1;
  }
}
