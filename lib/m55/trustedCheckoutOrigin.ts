/**
 * Trusted checkout return origin — never trust arbitrary request Origin for Stripe URLs.
 */
import { CANONICAL_PRODUCTION_ORIGIN } from './freeResult/privacySafeShareCardV1';

const LOCAL_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

function normalizeOrigin(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function isLocalDevOrigin(origin: string): boolean {
  return LOCAL_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/**
 * Resolves the origin used for Stripe success_url / cancel_url.
 * Production fail-closes to canonical M55 origin.
 */
export function resolveTrustedCheckoutOrigin(input: {
  requestOrigin?: string | null;
  fallbackOrigin?: string | null;
}): string {
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? '';
  const isProduction = vercelEnv === 'production';

  if (isProduction) {
    return CANONICAL_PRODUCTION_ORIGIN;
  }

  const candidates = [input.requestOrigin, input.fallbackOrigin, process.env.APP_ORIGIN, process.env.NEXT_PUBLIC_APP_URL]
    .map(normalizeOrigin)
    .filter((v): v is string => !!v);

  for (const origin of candidates) {
    if (isLocalDevOrigin(origin)) return origin;
    if (origin === CANONICAL_PRODUCTION_ORIGIN) return origin;
  }

  if (process.env.VERCEL_URL) {
    const vercelOrigin = normalizeOrigin(`https://${process.env.VERCEL_URL}`);
    if (vercelOrigin) return vercelOrigin;
  }

  return candidates[0] ?? CANONICAL_PRODUCTION_ORIGIN;
}

export function isStaleSessionEscapeAllowed(): boolean {
  if (process.env.DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT !== '1') return false;
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? '';
  return vercelEnv !== 'production';
}
