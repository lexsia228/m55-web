import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from './canonical-json.mjs';
import { sha256RecordExcluding, sha256Text } from './hash.mjs';

export const HISTORY_PATH = '.product-authority/authority-history.jsonl';

/**
 * @param {string} root
 * @returns {string}
 */
export function historyFilePath(root) {
  return path.join(root, HISTORY_PATH);
}

/**
 * @param {string} text
 * @returns {Record<string, unknown>[]}
 */
export function parseHistoryLines(text) {
  const trimmed = text.replace(/\r\n/g, '\n');
  const lines = trimmed.split('\n').filter((line) => line.length > 0);
  return lines.map((line) => /** @type {Record<string, unknown>} */ (JSON.parse(line)));
}

/**
 * @param {Record<string, unknown>[]} events
 * @returns {string}
 */
export function serializeHistory(events) {
  return `${events.map((event) => canonicalStringify(event)).join('\n')}\n`;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {string}
 */
export function computeEventHash(event) {
  return sha256RecordExcluding(event, ['eventHash']);
}

/**
 * @param {Record<string, unknown>[]} events
 * @returns {Record<string, unknown>[]}
 */
export function withComputedEventHashes(events) {
  const result = [];
  let previousHash = null;
  for (const event of events) {
    const withPrevious = { ...event, previousEventHash: previousHash };
    const withHash = { ...withPrevious, eventHash: computeEventHash(withPrevious) };
    result.push(withHash);
    previousHash = /** @type {string} */ (withHash.eventHash);
  }
  return result;
}

/**
 * @param {string} root
 * @returns {Record<string, unknown>[]}
 */
export function readHistory(root) {
  const filePath = historyFilePath(root);
  if (!fs.existsSync(filePath)) return [];
  return parseHistoryLines(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @param {string} root
 * @param {Record<string, unknown>[]} events
 */
export function writeHistory(root, events) {
  fs.mkdirSync(path.dirname(historyFilePath(root)), { recursive: true });
  fs.writeFileSync(historyFilePath(root), serializeHistory(events), 'utf8');
}

/**
 * @param {string} root
 * @returns {string}
 */
export function historySha256(root) {
  const filePath = historyFilePath(root);
  return sha256Text(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @param {Record<string, unknown>[]} events
 * @returns {string}
 */
export function historySha256FromEvents(events) {
  return sha256Text(serializeHistory(events));
}

// Shared test fixture helpers (consumed by product-authority __tests__).
const FIXTURE_SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @returns {string} */
export function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'm55-product-authority-'));
}

/** @param {string} tempRoot */
export function copyAuthorityPackSources(tempRoot) {
  for (const rel of [
    '.product-authority/authority.json',
    '.product-authority/observations.json',
    '.product-authority/schema/authority-pack.schema.json',
  ]) {
    const dest = path.join(tempRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(FIXTURE_SOURCE_ROOT, rel), dest);
  }
}

/** @param {string} tempRoot @param {Record<string, unknown>[]} [events] */
export function writeBootstrapHistory(tempRoot, events) {
  const sequence0 = events?.[0] ?? {
    sequence: 0,
    kind: 'INITIALIZATION',
    sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
    previousEventHash: null,
    bootstrap: true,
    approvalReference:
      'M55_SHARED_CRITICAL_AUTHORITY_PACK_IMPLEMENTATION_CONTRACT_FINAL_GREEN',
    changedPaths: ['.product-authority/authority.json'],
    updatedAt: '2026-07-25T07:00:00+00:00',
  };
  writeHistory(tempRoot, withComputedEventHashes(events ?? [sequence0]));
}

/** @param {string} tempRoot */
export function cleanupTempRoot(tempRoot) {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
