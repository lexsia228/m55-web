import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from './canonical-json.mjs';
import { OBSERVATIONS_PATH, readObservations } from './observations.mjs';
import {
  assertNoNodeEnvPersistence,
  buildRollingProductionObservation,
} from './production-observation.mjs';
import {
  APPLICATION_ERROR_CODES,
  APPLICATION_ERROR_MESSAGES,
  formatClosedErrorLine,
  isFreshObservationTimestamp,
  isDirectExecutionEntrypoint,
  normalizeObservedEvent,
  PRODUCTION_STATUS_OBSERVED,
  PRODUCTION_STATUS_PENDING,
  throwApplicationError,
  validateObserverResult,
} from './production-observation-contract.mjs';

const WRITE_ALLOWLIST = [OBSERVATIONS_PATH];

/** @type {import('node:fs')} */
export const defaultFsOps = fs;

/**
 * @param {string} parent
 * @param {string} child
 */
export function isPathContained(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * @param {string} root
 * @param {typeof fs} [fsOps]
 */
export function resolveAuthorizedObservationsTarget(root, fsOps = defaultFsOps) {
  let resolvedRoot;
  try {
    resolvedRoot = fsOps.realpathSync(root);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  const productAuthorityPath = path.join(resolvedRoot, '.product-authority');
  let productAuthorityLstat;
  try {
    productAuthorityLstat = fsOps.lstatSync(productAuthorityPath);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (productAuthorityLstat.isSymbolicLink()) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (!productAuthorityLstat.isDirectory()) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  let resolvedProductAuthority;
  try {
    resolvedProductAuthority = fsOps.realpathSync(productAuthorityPath);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (!isPathContained(resolvedRoot, resolvedProductAuthority)) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  const targetPath = path.join(resolvedProductAuthority, 'observations.json');
  let targetLstat;
  try {
    targetLstat = fsOps.lstatSync(targetPath);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (targetLstat.isSymbolicLink()) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (!targetLstat.isFile()) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  let resolvedTarget;
  try {
    resolvedTarget = fsOps.realpathSync(targetPath);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (!isPathContained(resolvedProductAuthority, resolvedTarget)) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  return {
    targetPath,
    resolvedTarget,
    resolvedProductAuthority,
    mode: targetLstat.mode,
  };
}

/**
 * @param {number} fd
 * @param {Buffer} buffer
 * @param {typeof fs} fsOps
 */
export function writeAllBytes(fd, buffer, fsOps = defaultFsOps) {
  let offset = 0;
  while (offset < buffer.length) {
    const written = fsOps.writeSync(fd, buffer, offset, buffer.length - offset);
    if (written <= 0) {
      throw new Error('Write made zero progress');
    }
    offset += written;
  }
}

/**
 * @param {string} targetPath
 * @param {Record<string, unknown>} observations
 * @param {typeof fs} [fsOps]
 */
export function writeObservationsAtomically(targetPath, observations, fsOps = defaultFsOps) {
  let targetStat;
  try {
    targetStat = fsOps.lstatSync(targetPath);
  } catch {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }
  if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
    throwApplicationError('APPLICATION_TARGET_INVALID');
  }

  const canonicalBytes = Buffer.from(`${JSON.stringify(observations, null, 2)}\n`, 'utf8');
  const directory = path.dirname(targetPath);
  const tempPath = path.join(
    directory,
    `.observations.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`,
  );

  let fileDescriptor;
  /** @type {Error | null} */
  let primaryError = null;
  try {
    fileDescriptor = fsOps.openSync(tempPath, 'wx', targetStat.mode);
    writeAllBytes(fileDescriptor, canonicalBytes, fsOps);
    fsOps.fsyncSync(fileDescriptor);
    fsOps.closeSync(fileDescriptor);
    fileDescriptor = undefined;
    fsOps.renameSync(tempPath, targetPath);
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error('Atomic write failed');
    if (typeof fileDescriptor === 'number') {
      try {
        fsOps.closeSync(fileDescriptor);
      } catch {
        // preserve primary error
      }
    }
    try {
      fsOps.unlinkSync(tempPath);
    } catch {
      // preserve primary error
    }
    throwApplicationError('APPLICATION_WRITE_FAILED', { cause: primaryError });
  }
}

/**
 * @param {string} applicationNowUtc
 * @param {string} observedAtUtc
 * @param {Record<string, unknown>} currentObservations
 * @param {ReturnType<typeof buildRollingProductionObservation>} transition
 */
function assertFreshnessRules(applicationNowUtc, observedAtUtc, currentObservations, transition) {
  if (!isFreshObservationTimestamp(applicationNowUtc, observedAtUtc)) {
    const applicationMs = Date.parse(applicationNowUtc);
    const observedMs = Date.parse(observedAtUtc);
    if (Number.isFinite(applicationMs) && Number.isFinite(observedMs) && observedMs > applicationMs) {
      throwApplicationError('APPLICATION_FRESHNESS_FUTURE');
    }
    throwApplicationError('APPLICATION_FRESHNESS_STALE');
  }

  if (transition.result === 'no_change') {
    return;
  }

  const observationMeta = /** @type {{ lastObservedAt?: { value?: unknown } }} */ (
    currentObservations.observationMeta ?? {}
  );
  const metaTimestamp = observationMeta.lastObservedAt?.value;
  if (typeof metaTimestamp !== 'string') {
    throwApplicationError('APPLICATION_SCHEMA_MISMATCH');
  }

  const production = /** @type {Record<string, unknown>} */ (currentObservations.production ?? {});
  const statusLeaf = /** @type {{ value?: unknown } | undefined} */ (production.status);
  const observedAtLeaf = /** @type {{ value?: unknown } | undefined} */ (production.observedAt);
  const isPending =
    statusLeaf?.value === PRODUCTION_STATUS_PENDING &&
    (observedAtLeaf?.value === null || observedAtLeaf?.value === undefined);

  if (isPending) {
    if (Date.parse(observedAtUtc) < Date.parse(metaTimestamp)) {
      throwApplicationError('APPLICATION_REPLAY');
    }
    return;
  }

  if (statusLeaf?.value === PRODUCTION_STATUS_OBSERVED && typeof observedAtLeaf?.value === 'string') {
    if (Date.parse(observedAtUtc) <= Date.parse(observedAtLeaf.value)) {
      throwApplicationError('APPLICATION_MONOTONICITY');
    }
    if (Date.parse(observedAtUtc) < Date.parse(metaTimestamp)) {
      throwApplicationError('APPLICATION_REPLAY');
    }
    return;
  }

  if (Date.parse(observedAtUtc) < Date.parse(metaTimestamp)) {
    throwApplicationError('APPLICATION_REPLAY');
  }
}

/**
 * @param {string} root
 * @param {ReturnType<typeof validateObserverResult>} validatedResult
 * @param {string} applicationNowUtc
 * @param {{ fsOps?: typeof fs; readObservationsFn?: (root: string) => Record<string, unknown> }} [options]
 */
export function applyProductionObservationFromValidatedResult(
  root,
  validatedResult,
  applicationNowUtc,
  options = {},
) {
  const fsOps = options.fsOps ?? defaultFsOps;
  const readObservationsFn = options.readObservationsFn ?? readObservations;

  let validated;
  try {
    validated = validateObserverResult(validatedResult);
  } catch {
    throwApplicationError('APPLICATION_SCHEMA_MISMATCH');
  }

  const normalizedEvent = normalizeObservedEvent(validated);
  const currentObservations = readObservationsFn(root);
  const transition = buildRollingProductionObservation(currentObservations, normalizedEvent);
  assertFreshnessRules(applicationNowUtc, normalizedEvent.observedAt, currentObservations, transition);
  assertNoNodeEnvPersistence(
    transition.result === 'no_change' ? currentObservations : transition.observations,
  );

  if (transition.result === 'no_change') {
    return {
      result: 'no_change',
      observedAtUtc: transition.observedAtUtc,
      diagnosticsIdentity: transition.diagnosticsIdentity,
      changed: [],
    };
  }

  const target = resolveAuthorizedObservationsTarget(root, fsOps);
  writeObservationsAtomically(target.targetPath, transition.observations, fsOps);
  return {
    result: 'applied',
    observedAtUtc: transition.observedAtUtc,
    diagnosticsIdentity: transition.diagnosticsIdentity,
    changed: transition.changedPaths,
  };
}

/**
 * @param {string} root
 * @param {string} stdinText
 * @param {string} applicationNowUtc
 * @param {{ fsOps?: typeof fs; readObservationsFn?: (root: string) => Record<string, unknown> }} [options]
 */
export function applyProductionObservationFromStdin(root, stdinText, applicationNowUtc, options = {}) {
  let parsed;
  try {
    parsed = JSON.parse(stdinText.trim());
  } catch {
    throwApplicationError('APPLICATION_INPUT_PARSE');
  }
  return applyProductionObservationFromValidatedResult(root, parsed, applicationNowUtc, options);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function formatApplicationFailureLine(error) {
  const code =
    error instanceof Error && typeof /** @type {{ code?: string }} */ (error).code === 'string'
      ? /** @type {{ code: string }} */ (error).code
      : 'APPLICATION_INTERNAL';
  return formatClosedErrorLine(code, APPLICATION_ERROR_CODES, APPLICATION_ERROR_MESSAGES);
}

async function runCli() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  try {
    const summary = applyProductionObservationFromStdin(
      process.cwd(),
      Buffer.concat(chunks).toString('utf8'),
      new Date().toISOString(),
    );
    process.stdout.write(`${canonicalStringify(summary)}\n`);
  } catch (error) {
    const line =
      error instanceof Error
        ? formatApplicationFailureLine(error)
        : formatClosedErrorLine('APPLICATION_INTERNAL', APPLICATION_ERROR_CODES, APPLICATION_ERROR_MESSAGES);
    process.stderr.write(`${line}\n`);
    process.exitCode = 1;
  }
}

if (
  isDirectExecutionEntrypoint(import.meta.url, process.argv, {
    fileURLToPath,
    resolve: path.resolve,
    realpath: (targetPath) => fs.realpathSync(targetPath),
  })
) {
  runCli();
}

export { WRITE_ALLOWLIST };
