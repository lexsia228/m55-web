import { lookupCountryTimezone } from '../calendar/countryTimezone';
import type { M55CompositeCalculationMode, M55CompositeTzSource } from './types';
import type { ParsedCompositeInput } from './normalize';

/** Fixed standard offsets (minutes east of UTC) — v1; no DST tables in this gate. */
const ZONE_OFFSET_MINUTES: Record<string, number> = {
  'Asia/Tokyo': 540,
  'Asia/Seoul': 540,
  'Asia/Shanghai': 480,
  'Asia/Taipei': 480,
  'Asia/Hong_Kong': 480,
  'Asia/Singapore': 480,
  'Asia/Bangkok': 420,
  'Asia/Ho_Chi_Minh': 420,
  'Asia/Manila': 480,
  'Asia/Kolkata': 330,
  'Europe/London': 0,
  'Europe/Berlin': 60,
  'Europe/Paris': 60,
  'America/New_York': -300,
  'America/Toronto': -300,
  'America/Mexico_City': -360,
  'America/Sao_Paulo': -180,
  'Australia/Sydney': 600,
  'Pacific/Auckland': 720,
};

export type ResolvedTimezone = {
  timezone: string;
  tzSource: M55CompositeTzSource;
  offsetMinutes: number;
  offsetLabel: string;
};

export function resolveTimezone(parsed: ParsedCompositeInput): ResolvedTimezone {
  if (parsed.timezone) {
    const tz = parsed.timezone;
    const offsetMinutes = ZONE_OFFSET_MINUTES[tz] ?? 0;
    return {
      timezone: tz,
      tzSource: 'explicit',
      offsetMinutes,
      offsetLabel: formatOffset(offsetMinutes),
    };
  }

  const fromCountry = lookupCountryTimezone(parsed.country);
  if (fromCountry) {
    const offsetMinutes = ZONE_OFFSET_MINUTES[fromCountry] ?? 0;
    return {
      timezone: fromCountry,
      tzSource: 'country_primary',
      offsetMinutes,
      offsetLabel: formatOffset(offsetMinutes),
    };
  }

  return {
    timezone: 'UTC',
    tzSource: 'fallback_utc',
    offsetMinutes: 0,
    offsetLabel: '+00:00',
  };
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export function buildLocalDateTime(
  birthDate: string,
  birthTime: string,
  resolved: ResolvedTimezone,
): string {
  return `${birthDate}T${birthTime}${resolved.offsetLabel}`;
}

export function calculationModeFor(
  parsed: ParsedCompositeInput,
  tzSource: M55CompositeTzSource,
): M55CompositeCalculationMode {
  if (parsed.birthTimeUnknown) return 'unknown_time_noon';
  if (tzSource === 'fallback_utc') return 'tz_fallback_utc';
  return 'full';
}
