/**
 * Birth profile v2 fields for composite stem checkout / fulfillment.
 * Stored in localStorage + dtr_guest_drafts.extra_json.
 */
import type { BirthProfile } from './profile';
import { lookupCountryTimezone } from '../m55/calendar/loadCalendarBundle';

export const DEFAULT_COUNTRY = 'JP';

export const SUPPORTED_COUNTRIES: readonly { code: string; label: string }[] = [
  { code: 'JP', label: '日本' },
  { code: 'US', label: 'アメリカ' },
  { code: 'GB', label: 'イギリス' },
  { code: 'KR', label: '韓国' },
  { code: 'TW', label: '台湾' },
] as const;

export function normalizeBirthProfile(raw: BirthProfile | null | undefined): BirthProfile | null {
  if (!raw?.nickname?.trim() || !raw.birthDate) return null;
  const country = (raw.country?.trim() || DEFAULT_COUNTRY).toUpperCase();
  return {
    nickname: raw.nickname.trim(),
    birthDate: raw.birthDate,
    birthTime: raw.birthTime?.trim() || null,
    birthTimeUnknown: Boolean(raw.birthTimeUnknown),
    country,
    birthplace: raw.birthplace?.trim() || null,
    timezone: raw.timezone?.trim() || null,
    profileFormat: raw.profileFormat,
  };
}

export function hasLegacyProfileOnly(p: BirthProfile | null | undefined): boolean {
  const n = normalizeBirthProfile(p);
  if (!n) return false;
  if (n.profileFormat === 'v2') return false;
  if (n.profileFormat === 'legacy') return true;
  return !isV2ProfileFieldsComplete(n);
}

/** v2 checkout gate: birthTime empty requires explicit unknown; country required (defaults JP on save). */
export function isV2ProfileFieldsComplete(p: BirthProfile | null | undefined): boolean {
  if (!p?.nickname?.trim() || !p?.birthDate) return false;
  const hasTime = !!(p.birthTime && p.birthTime.trim().length > 0);
  if (hasTime) return true;
  return p.birthTimeUnknown === true;
}

export function v2ProfileBlockReason(p: BirthProfile | null | undefined): string | null {
  if (!p?.nickname?.trim() || !p?.birthDate) return 'nickname_and_birthdate';
  if (!isV2ProfileFieldsComplete(p)) return 'birth_time_or_unknown';
  return null;
}

export function profileFormatLabel(p: BirthProfile | null | undefined): string {
  if (!p?.birthDate) return '';
  return hasLegacyProfileOnly(p) ? 'プロフィール：旧形式' : 'プロフィール：複合占術入力';
}

export function resolveProfileTimezone(profile: BirthProfile): string {
  if (profile.timezone?.trim()) return profile.timezone.trim();
  const country = (profile.country ?? DEFAULT_COUNTRY).trim().toUpperCase() || DEFAULT_COUNTRY;
  return lookupCountryTimezone(country) ?? 'Asia/Tokyo';
}

/** Persist-ready profile with country default, timezone, and format tag. */
export function enrichBirthProfileForSave(profile: BirthProfile): BirthProfile {
  const country = profile.country?.trim().toUpperCase() || DEFAULT_COUNTRY;
  const base = normalizeBirthProfile({ ...profile, country })!;
  const timezone = resolveProfileTimezone(base);
  const profileFormat: 'legacy' | 'v2' = isV2ProfileFieldsComplete(base) ? 'v2' : 'legacy';
  return { ...base, country, timezone, profileFormat };
}

export type CheckoutProfileBody = {
  nickname?: string;
  birthDate?: string;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  country?: string;
  birthplace?: string | null;
  timezone?: string | null;
};

export function birthProfileFromCheckoutBody(body: CheckoutProfileBody | undefined): BirthProfile | null {
  if (!body?.nickname?.trim() || !body?.birthDate?.trim()) return null;
  return {
    nickname: body.nickname.trim(),
    birthDate: body.birthDate.trim().slice(0, 10),
    birthTime: body.birthTime?.trim() || null,
    birthTimeUnknown: Boolean(body.birthTimeUnknown),
    country: body.country?.trim().toUpperCase() || DEFAULT_COUNTRY,
    birthplace: body.birthplace?.trim() || null,
    timezone: body.timezone?.trim() || null,
  };
}

export function mergeBirthProfileWithDraftExtra(
  profile: BirthProfile | null,
  extra: Record<string, unknown> | null | undefined,
): BirthProfile | null {
  if (!profile) return null;
  const ex = extra ?? {};
  const birthTime =
    profile.birthTime ||
    (typeof ex.birthTime === 'string' ? ex.birthTime.trim() : null) ||
    null;
  const birthTimeUnknown =
    profile.birthTimeUnknown ??
    (typeof ex.birthTimeUnknown === 'boolean' ? ex.birthTimeUnknown : undefined);
  const country =
    profile.country ||
    (typeof ex.country === 'string' ? ex.country.trim().toUpperCase() : '') ||
    DEFAULT_COUNTRY;
  const birthplace =
    profile.birthplace ||
    (typeof ex.birthplace === 'string' ? ex.birthplace.trim() : null) ||
    null;
  const timezone =
    profile.timezone ||
    (typeof ex.timezone === 'string' ? ex.timezone.trim() : null) ||
    null;
  const profileFormat =
    profile.profileFormat ??
    (ex.profileFormat === 'v2' || ex.profileFormat === 'legacy' ? ex.profileFormat : undefined);
  return enrichBirthProfileForSave({
    ...profile,
    birthTime,
    birthTimeUnknown,
    country,
    birthplace,
    timezone,
    profileFormat,
  });
}
