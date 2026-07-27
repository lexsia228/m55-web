import fs from 'node:fs';
import path from 'node:path';
import { sha256Canonical } from './hash.mjs';

export const OBSERVATIONS_PATH = '.product-authority/observations.json';

/**
 * @param {string} root
 * @returns {string}
 */
export function observationsFilePath(root) {
  return path.join(root, OBSERVATIONS_PATH);
}

/**
 * @param {string} root
 * @returns {Record<string, unknown>}
 */
export function readObservations(root) {
  const filePath = observationsFilePath(root);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @param {string} root
 * @returns {string}
 */
export function observationsSha256(root) {
  return sha256Canonical(readObservations(root));
}

/**
 * @param {Record<string, unknown>} observations
 * @returns {string}
 */
export function observationsSha256FromObject(observations) {
  return sha256Canonical(observations);
}

/**
 * @param {Record<string, unknown>} observations
 * @returns {string}
 */
export function getGeneratedAt(observations) {
  const meta = /** @type {{ lastObservedAt?: { value?: string } }} */ (
    observations.observationMeta ?? {}
  );
  const value = meta.lastObservedAt?.value;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('observationMeta.lastObservedAt.value is required for deterministic generation');
  }
  return value;
}
