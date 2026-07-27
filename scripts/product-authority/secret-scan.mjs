const SECRET_PATTERNS = [
  /\bsk_(live|test)_[A-Za-z0-9]+\b/,
  /\bpk_(live|test)_[A-Za-z0-9]+\b/,
  /\bwhsec_[A-Za-z0-9]+\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bpostgres(?:ql)?:\/\/[^\s"']+/i,
  /\bSUPABASE_(?:SERVICE_ROLE|ANON|JWT)_[A-Z_]*KEY\s*=\s*[^\s"']+/,
  /\bSTRIPE_(?:SECRET|PUBLISHABLE|WEBHOOK)_[A-Z_]*\s*=\s*[^\s"']+/,
  /\bCLERK_(?:SECRET|PUBLISHABLE)_[A-Z_]*\s*=\s*[^\s"']+/,
  /\b(?:api[_-]?key|secret[_-]?key|password|recovery[_-]?code)\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{8,}/i,
  /\bCookie:\s*[^\n"']+/i,
  /\bSet-Cookie:\s*[^\n"']+/i,
  /"session_token"\s*:\s*"[A-Za-z0-9._-]{16,}"/i,
  /\bauth[_-]?session[_-]?token\s*[:=]\s*["']?[A-Za-z0-9._-]{16,}/i,
  /\bbearer\s+[A-Za-z0-9._-]{16,}/i,
  /\b(?:sessionId|session_id)\s*[:=]\s*["']?[A-Za-z0-9._-]{16,}/i,
  /\bcookies?\s*:\s*\[\{[^\]]*"(?:value|token)"\s*:\s*"[A-Za-z0-9._-]{16,}"/i,
];

const ALLOWED_NULL_FIELDS = new Set([
  'production.lastObservedSha',
  'providers.supabase.production.projectRef',
  'providers.supabase.preview.projectRef',
  'providers.clerk.production.instanceId',
  'providers.clerk.preview.instanceId',
  'providers.stripe.production.accountId',
  'providers.stripe.preview.accountId',
]);

const BENIGN_SECRET_PHRASES = [
  /cookie policy/i,
  /browser session description/i,
  /session count/i,
  /session lifecycle/i,
];

/**
 * @param {string} text
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function scanForSecrets(text) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    const match = text.match(pattern);
    if (match) findings.push(`secret-like pattern matched: ${match[0].slice(0, 24)}…`);
  }
  if (findings.length > 0) {
    return { ok: false, findings };
  }
  for (const benign of BENIGN_SECRET_PHRASES) {
    if (benign.test(text)) {
      return { ok: true, findings: [] };
    }
  }
  return { ok: true, findings: [] };
}

/**
 * @param {unknown} value
 * @param {string} pathPrefix
 * @returns {string[]}
 */
export function scanObjectForSecrets(value, pathPrefix = '') {
  const findings = [];
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && pathPrefix && !ALLOWED_NULL_FIELDS.has(pathPrefix)) {
      const result = scanForSecrets(value);
      findings.push(...result.findings.map((finding) => `${pathPrefix}: ${finding}`));
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...scanObjectForSecrets(item, `${pathPrefix}[${index}]`));
    });
    return findings;
  }
  for (const [key, child] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
    const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    findings.push(...scanObjectForSecrets(child, childPath));
  }
  return findings;
}
