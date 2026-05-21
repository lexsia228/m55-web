/**
 * Client-safe country → IANA timezone lookup (static JSON import).
 * Do not import loadCalendarBundle from client paths — it uses node:fs.
 */
import tzCountryPrimary from './data/tz_country_primary.json';

export function lookupCountryTimezone(country: string): string | null {
  const code = country.trim().toUpperCase();
  const map = (tzCountryPrimary as { countries: Record<string, string> }).countries;
  return map[code] ?? null;
}
