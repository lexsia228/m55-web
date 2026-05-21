import { M55CompositeStemError, type M55CompositeCanonicalInput } from './types';
import { SOLAR_NOON_LOCAL } from './constants';

function assertIsoDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new M55CompositeStemError('M55_COMPOSITE_INVALID_BIRTHDATE');
  }
  const [ys, ms, ds] = date.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const t = Date.UTC(y, m - 1, d);
  const ud = new Date(t);
  if (ud.getUTCFullYear() !== y || ud.getUTCMonth() !== m - 1 || ud.getUTCDate() !== d) {
    throw new M55CompositeStemError('M55_COMPOSITE_INVALID_BIRTHDATE');
  }
}

function normalizeTime(time: string): string {
  const t = time.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00.000`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return `${t}.000`;
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(t)) return t;
  throw new M55CompositeStemError('M55_COMPOSITE_INVALID_BIRTHTIME');
}

export type ParsedCompositeInput = {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  country: string;
  birthplace: string | null;
  timezone: string | null;
  locale: string;
  nickname: string;
  contextScope: M55CompositeCanonicalInput['contextScope'];
};

export function parseAndNormalizeInput(input: M55CompositeCanonicalInput): ParsedCompositeInput {
  assertIsoDate(input.birthDate);

  const birthTimeUnknown = Boolean(input.birthTimeUnknown);
  let birthTime: string;

  if (birthTimeUnknown) {
    birthTime = SOLAR_NOON_LOCAL;
  } else if (input.birthTime && input.birthTime.trim()) {
    birthTime = normalizeTime(input.birthTime);
  } else {
    throw new M55CompositeStemError('M55_COMPOSITE_INVALID_INPUT');
  }

  const country = (input.country ?? 'JP').trim().toUpperCase() || 'JP';
  const birthplace = input.birthplace?.trim() || null;
  const timezone = input.timezone?.trim() || null;
  const nickname = input.nickname?.trim();
  if (!nickname) {
    throw new M55CompositeStemError('M55_COMPOSITE_INVALID_INPUT');
  }

  return {
    birthDate: input.birthDate,
    birthTime,
    birthTimeUnknown,
    country,
    birthplace,
    timezone,
    locale: input.locale,
    nickname,
    contextScope: input.contextScope,
  };
}
