/**
 * Loopback Host guard for the local E2E clean-capture fixture middleware bypass.
 *
 * Exact hostname match only after normalizing IPv6 brackets and stripping a
 * trailing numeric port. Suffix / substring matches are rejected.
 */

const ALLOWED_LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Normalize a Request Host header to a bare hostname, or null when invalid.
 */
export function normalizeRequestHostname(hostHeader: string | null | undefined): string | null {
  if (hostHeader == null) return null;
  const raw = String(hostHeader).trim().toLowerCase();
  if (!raw) return null;

  // Bracketed IPv6: [::1] or [::1]:3000
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']');
    if (end === -1) return null;
    const hostname = raw.slice(1, end);
    const rest = raw.slice(end + 1);
    if (rest && !/^:\d+$/.test(rest)) return null;
    return hostname || null;
  }

  // Bare IPv6 (multiple colons, e.g. ::1): never apply host:port splitting.
  if ((raw.match(/:/g) || []).length >= 2) {
    return raw;
  }

  // hostname:port or IPv4:port where port is numeric.
  const colon = raw.lastIndexOf(':');
  if (colon > -1) {
    const maybePort = raw.slice(colon + 1);
    if (/^\d+$/.test(maybePort)) {
      return raw.slice(0, colon) || null;
    }
  }

  return raw;
}

/** True only for exact loopback hostnames: localhost, 127.0.0.1, ::1. */
export function isAuthorizedCleanCaptureLoopbackHost(
  hostHeader: string | null | undefined,
): boolean {
  const hostname = normalizeRequestHostname(hostHeader);
  if (!hostname) return false;
  return ALLOWED_LOOPBACK_HOSTNAMES.has(hostname);
}
