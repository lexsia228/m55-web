/**
 * M55 solar term instants (24 terms) — generation-only approximation.
 * Stored as ISO-8601 with Asia/Tokyo offset for JP primary bucket.
 */

const TERM_KEYS = Object.freeze([
  'xiaohan',
  'dahan',
  'lichun',
  'yushui',
  'jingzhe',
  'chunfen',
  'qingming',
  'guyu',
  'lixia',
  'xiaoman',
  'mangzhong',
  'xiazhi',
  'xiaoshu',
  'dashu',
  'liqiu',
  'chushu',
  'bailu',
  'qiufen',
  'hanlu',
  'shuangjiang',
  'lidong',
  'xiaoxue',
  'daxue',
  'dongzhi',
]);

/** Solar longitude targets (degrees) for each term in order. */
const TERM_LONGITUDE = Object.freeze([
  285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270,
]);

const MS_PER_DAY = 86400000;
const J2000 = 2451545.0;

function deg2rad(d) {
  return (d * Math.PI) / 180;
}

/** Approximate Sun geocentric ecliptic longitude (degrees 0–360). */
function sunLongitudeDegrees(jd) {
  const T = (jd - J2000) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = deg2rad(M);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunTrue - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));
  return ((lambda % 360) + 360) % 360;
}

function julianDateFromMs(ms) {
  return ms / MS_PER_DAY + 2440587.5;
}

function findTermInstantUtc(year, targetLon, guessMonth, guessDay) {
  let jd = julianDateFromMs(Date.UTC(year, guessMonth - 1, guessDay, 12, 0, 0));
  let lon = sunLongitudeDegrees(jd);
  let delta = ((targetLon - lon + 540) % 360) - 180;
  jd += delta / 0.9856;
  for (let i = 0; i < 6; i += 1) {
    lon = sunLongitudeDegrees(jd);
    delta = ((targetLon - lon + 540) % 360) - 180;
    if (Math.abs(delta) < 0.0001) break;
    jd += delta / 0.9856;
  }
  return new Date((jd - 2440587.5) * MS_PER_DAY);
}

/** Convert UTC Date to ISO with +09:00 (Tokyo civil wall time, no DST). */
function toTokyoIso(utcDate) {
  const ms = utcDate.getTime() + 9 * 3600000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}-${mo}-${da}T${hh}:${mm}:${ss}+09:00`;
}

/** Guess civil month/day per term for initial JD search. */
const TERM_GUESS = Object.freeze([
  [1, 6], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20],
  [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23],
  [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
]);

export function buildSolarTermsForYear(year) {
  const row = {};
  for (let i = 0; i < TERM_KEYS.length; i += 1) {
    const key = TERM_KEYS[i];
    const [gm, gd] = TERM_GUESS[i];
    const utc = findTermInstantUtc(year, TERM_LONGITUDE[i], gm, gd);
    row[key] = toTokyoIso(utc);
  }
  return row;
}

export function buildSolarTerms1900_2100() {
  const years = {};
  for (let y = 1900; y <= 2100; y += 1) {
    years[String(y)] = buildSolarTermsForYear(y);
  }
  return {
    schemaVersion: 'm55-solar-terms-v1',
    correctionVersion: 'm55-calendar-2026-01',
    solarTableSource: 'm55_solar_terms_v1',
    timezoneBucket: 'Asia/Tokyo',
    termKeys: [...TERM_KEYS],
    years,
  };
}

export { TERM_KEYS };
