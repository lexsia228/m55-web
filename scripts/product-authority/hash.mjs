import { createHash } from 'node:crypto';
import { canonicalStringify } from './canonical-json.mjs';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function sha256Canonical(value) {
  const canonical = canonicalStringify(value);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} excludeKeys
 * @returns {string}
 */
export function sha256RecordExcluding(record, excludeKeys) {
  const filtered = Object.fromEntries(
    Object.entries(record).filter(([key]) => !excludeKeys.includes(key)),
  );
  return sha256Canonical(filtered);
}
