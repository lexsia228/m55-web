import { lookupSolarTermsForYearClient } from '../calendar/loadCalendarBundleClient';
import type { BoundaryMetadata } from './types';

const TERM_ORDER = [
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
] as const;

function instantMs(iso: string): number {
  return Date.parse(iso);
}

function localInstantMs(date: string, time: string, offsetMinutes: number): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ssMs] = time.split(':');
  const ss = Number((ssMs ?? '0').split('.')[0]);
  const ms = Number((ssMs ?? '0').split('.')[1] ?? 0);
  return Date.UTC(y, m - 1, d, Number(hh), Number(mm), ss, ms) - offsetMinutes * 60_000;
}

export function resolveSolarTermMetadataClient(
  effectiveLocalDate: string,
  birthTime: string,
  offsetMinutes: number,
  solarYearKey: number,
): Pick<BoundaryMetadata, 'solarTermKey' | 'solarTermBoundaryInstant' | 'solarYearKey'> {
  const yearRow = lookupSolarTermsForYearClient(solarYearKey);
  const alsoPrev = lookupSolarTermsForYearClient(solarYearKey - 1);
  const allTerms: { key: string; instant: string }[] = [];

  for (const key of TERM_ORDER) {
    if (alsoPrev[key]) allTerms.push({ key, instant: alsoPrev[key]! });
  }
  for (const key of TERM_ORDER) {
    if (yearRow[key]) allTerms.push({ key, instant: yearRow[key]! });
  }

  const targetMs = localInstantMs(effectiveLocalDate, birthTime, offsetMinutes);
  let activeKey: string = TERM_ORDER[0];
  let activeInstant: string =
    yearRow[TERM_ORDER[0]] ?? alsoPrev.dongzhi ?? `${solarYearKey}-01-01T00:00:00+09:00`;

  for (const term of allTerms) {
    if (instantMs(term.instant) <= targetMs) {
      activeKey = term.key;
      activeInstant = term.instant;
    }
  }

  return {
    solarTermKey: activeKey,
    solarTermBoundaryInstant: activeInstant,
    solarYearKey,
  };
}
