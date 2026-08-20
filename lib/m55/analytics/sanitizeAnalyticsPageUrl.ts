/**
 * Deterministic, fail-closed URL sanitizer for Vercel Analytics pageviews.
 * Strips query/hash and normalizes sensitive dynamic route families.
 * Never preserves raw UTM/query values or path tokens.
 */

const SAFE_FALLBACK_PATH = '/';

/** Proven sensitive App Router dynamic families (public path segments). */
const SENSITIVE_ROUTE_NORMALIZERS: ReadonlyArray<{
  match: RegExp;
  replacement: string;
}> = [
  { match: /^\/r\/[^/]+(?=\/|$)/, replacement: '/r/[token]' },
  {
    match: /^\/synastry\/report\/[^/]+(?=\/|$)/,
    replacement: '/synastry/report/[reportId]',
  },
];

/**
 * Sanitize a page URL for Analytics transport.
 * @returns sanitized absolute or path URL string, or null when fail-closed.
 */
export function sanitizeAnalyticsPageUrl(rawUrl: string): string | null {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return null;
  }

  try {
    const base =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { location?: { origin?: string } }).location?.origin === 'string'
        ? (globalThis as { location: { origin: string } }).location.origin
        : 'https://m-55.jp';

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      // Relative path — resolve against a stable origin for parsing only.
      parsed = new URL(rawUrl, base);
    }

    // Always drop query + hash (no UTM retention in Wave 1).
    parsed.search = '';
    parsed.hash = '';

    let pathname = parsed.pathname || SAFE_FALLBACK_PATH;
    if (!pathname.startsWith('/')) {
      pathname = `/${pathname}`;
    }

    for (const rule of SENSITIVE_ROUTE_NORMALIZERS) {
      if (rule.match.test(pathname)) {
        pathname = pathname.replace(rule.match, rule.replacement);
      }
    }

    // Reconstruct without search/hash. Prefer path-only when input was relative.
    const wasAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawUrl.trim());
    if (wasAbsolute) {
      parsed.pathname = pathname;
      return parsed.toString();
    }
    return pathname;
  } catch {
    return null;
  }
}

export type AnalyticsBeforeSendLikeEvent = {
  type?: string;
  url?: string;
};

/**
 * beforeSend adapter: sanitize pageview (and event) URLs fail-closed.
 * Returns null when the URL cannot be safely sanitized.
 */
export function sanitizeAnalyticsBeforeSendEvent<T extends AnalyticsBeforeSendLikeEvent>(
  event: T,
): T | null {
  if (!event || typeof event !== 'object') {
    return null;
  }
  const url = event.url;
  if (typeof url !== 'string') {
    // Custom events without url — pass through unchanged.
    if (event.type === 'event') {
      return event;
    }
    return null;
  }
  const sanitized = sanitizeAnalyticsPageUrl(url);
  if (sanitized === null) {
    return null;
  }
  return { ...event, url: sanitized };
}
