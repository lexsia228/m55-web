/**
 * Deterministic canonical JSON serialization.
 * UTF-8, sorted keys, LF endings, no locale dependence.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  return `${canonicalStringify(value)}\n`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalStringify(value) {
  return stringifySorted(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringifySorted(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers are not canonicalizable');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifySorted(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(/** @type {Record<string, unknown>} */ (value)).sort();
    const entries = keys.map((key) => {
      const entryValue = /** @type {Record<string, unknown>} */ (value)[key];
      return `${JSON.stringify(key)}:${stringifySorted(entryValue)}`;
    });
    return `{${entries.join(',')}}`;
  }
  throw new Error(`Unsupported canonical JSON type: ${typeof value}`);
}

/**
 * @param {string} text
 * @returns {unknown}
 */
export function parseCanonicalJson(text) {
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text;
  return JSON.parse(trimmed);
}
