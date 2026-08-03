/** Frozen Production diagnostics observation contract (PA-1). */

export const OBSERVER_RESULT_SCHEMA_VERSION = '1.0.0';

export const PRODUCTION_DIAGNOSTICS_ENDPOINT = 'https://m-55.jp/api/diagnostics/build';
export const PRODUCTION_DIAGNOSTICS_METHOD = 'GET';

export const OBSERVER_CONNECT_TIMEOUT_MS = 5000;
export const OBSERVER_TOTAL_TIMEOUT_MS = 10000;
export const OBSERVER_RESPONSE_BODY_LIMIT_BYTES = 4096;
export const OBSERVER_STDOUT_LIMIT_BYTES = 2048;
export const COORDINATOR_STDERR_LIMIT_BYTES = 4096;

export const OBSERVER_EXPECTED_HTTP_STATUS = 200;
export const OBSERVER_MAX_REDIRECTS = 0;

export const PRODUCTION_STATUS_PENDING = 'PENDING_REOBSERVATION_ON_M-55.JP';
export const PRODUCTION_STATUS_OBSERVED = 'ROUTE_BUILD_IDENTITY_OBSERVED';

export const PRODUCTION_ENVIRONMENT_LITERAL = 'production';
export const PRODUCTION_BRANCH_LITERAL = 'main';
export const PRODUCTION_NODE_ENV_LITERAL = 'production';

export const DIAGNOSTICS_SOURCE_KIND = 'DIAGNOSTICS_HTTP_OBSERVATION';
export const DIAGNOSTICS_SOURCE_REFERENCE = `GET ${PRODUCTION_DIAGNOSTICS_ENDPOINT}`;

export const OBSERVATION_CLASSIFICATION_OBSERVED = 'OBSERVED_CURRENT';
export const OBSERVATION_CLASSIFICATION_PENDING = 'PENDING_EVIDENCE';

export const ACCEPTED_JSON_CONTENT_TYPE =
  /^application\/json(?:[\t ]*;[\t ]*charset=[\t ]*(?:"utf-8"|utf-8))?$/i;

export const LOWERCASE_SHA256_HEX = /^[0-9a-f]{40}$/;

export const DIAGNOSTICS_OBJECT_KEYS = Object.freeze([
  'vercel_env',
  'vercel_git_sha',
  'vercel_branch',
  'node_env',
]);

export const OBSERVER_RESULT_KEYS = Object.freeze([
  'schemaVersion',
  'observedAt',
  'endpoint',
  'effectiveUrl',
  'httpStatus',
  'contentType',
  'diagnostics',
]);

export const COORDINATOR_SUMMARY_KEYS = Object.freeze([
  'result',
  'observedAtUtc',
  'diagnosticsIdentity',
  'changed',
]);

export const PRODUCTION_LEAF_KEYS = Object.freeze([
  'status',
  'lastObservedSha',
  'environment',
  'branch',
  'observedAt',
]);

export const PRODUCTION_LEAF_PATHS = Object.freeze([
  'production.status',
  'production.lastObservedSha',
  'production.environment',
  'production.branch',
  'production.observedAt',
]);

export const APPLICATION_FRESHNESS_PAST_MS = 60000;
export const APPLICATION_FRESHNESS_FUTURE_MS = 5000;

export const OBSERVER_ERROR_CODES = Object.freeze([
  'OBSERVER_BODY_DECODE',
  'OBSERVER_BODY_JSON',
  'OBSERVER_BODY_KEYS',
  'OBSERVER_BODY_SHAPE',
  'OBSERVER_BODY_TOO_LARGE',
  'OBSERVER_BODY_TYPE',
  'OBSERVER_BODY_VALUE',
  'OBSERVER_CONNECT_TIMEOUT',
  'OBSERVER_CONTENT_TYPE',
  'OBSERVER_HTTP_STATUS',
  'OBSERVER_INTERNAL',
  'OBSERVER_REDIRECT',
  'OBSERVER_REQUEST_FAILED',
  'OBSERVER_STDOUT_OVERFLOW',
  'OBSERVER_TOTAL_TIMEOUT',
]);

export const APPLICATION_ERROR_CODES = Object.freeze([
  'APPLICATION_FRESHNESS_FUTURE',
  'APPLICATION_FRESHNESS_STALE',
  'APPLICATION_INPUT_PARSE',
  'APPLICATION_INTERNAL',
  'APPLICATION_MONOTONICITY',
  'APPLICATION_REPLAY',
  'APPLICATION_SCHEMA_MISMATCH',
  'APPLICATION_TARGET_INVALID',
  'APPLICATION_WRITE_FAILED',
]);

export const COORDINATOR_ERROR_CODES = Object.freeze([
  'COORDINATOR_APPLICATION_FAILED',
  'COORDINATOR_INTERNAL',
  'COORDINATOR_OBSERVER_EXIT',
  'COORDINATOR_OUTPUT_CANONICAL',
  'COORDINATOR_OUTPUT_DECODE',
  'COORDINATOR_OUTPUT_PARSE',
  'COORDINATOR_OUTPUT_SCHEMA',
  'COORDINATOR_SIGNAL_TERMINATION',
  'COORDINATOR_SPAWN_FAILED',
  'COORDINATOR_STDERR_OVERFLOW',
  'COORDINATOR_STDOUT_OVERFLOW',
]);

/** @type {Readonly<Record<string, string>>} */
export const OBSERVER_ERROR_MESSAGES = Object.freeze({
  OBSERVER_BODY_DECODE: 'Response body is not valid UTF-8',
  OBSERVER_BODY_JSON: 'Response body is not valid JSON',
  OBSERVER_BODY_KEYS: 'Diagnostics keys are invalid',
  OBSERVER_BODY_SHAPE: 'Response body must be a JSON object',
  OBSERVER_BODY_TOO_LARGE: 'Response body exceeds limit',
  OBSERVER_BODY_TYPE: 'Diagnostics field types are invalid',
  OBSERVER_BODY_VALUE: 'Diagnostics field values are invalid',
  OBSERVER_CONNECT_TIMEOUT: 'Connect timeout exceeded',
  OBSERVER_CONTENT_TYPE: 'Response Content-Type is not accepted',
  OBSERVER_HTTP_STATUS: 'Expected HTTP 200',
  OBSERVER_INTERNAL: 'Observer failed',
  OBSERVER_REDIRECT: 'Redirects are not permitted',
  OBSERVER_REQUEST_FAILED: 'HTTPS request failed',
  OBSERVER_STDOUT_OVERFLOW: 'Observer stdout exceeds limit',
  OBSERVER_TOTAL_TIMEOUT: 'Total timeout exceeded',
});

/** @type {Readonly<Record<string, string>>} */
export const APPLICATION_ERROR_MESSAGES = Object.freeze({
  APPLICATION_FRESHNESS_FUTURE: 'Observation timestamp is too far in the future',
  APPLICATION_FRESHNESS_STALE: 'Observation timestamp is too stale',
  APPLICATION_INPUT_PARSE: 'Stdin is not valid JSON',
  APPLICATION_INTERNAL: 'Application failed',
  APPLICATION_MONOTONICITY: 'Observation timestamp must advance',
  APPLICATION_REPLAY: 'Replayed observation rejected',
  APPLICATION_SCHEMA_MISMATCH: 'Observer result schema mismatch',
  APPLICATION_TARGET_INVALID: 'Observations target is invalid',
  APPLICATION_WRITE_FAILED: 'Atomic write failed',
});

/** @type {Readonly<Record<string, string>>} */
export const COORDINATOR_ERROR_MESSAGES = Object.freeze({
  COORDINATOR_APPLICATION_FAILED: 'Application failed',
  COORDINATOR_INTERNAL: 'Coordinator failed',
  COORDINATOR_OBSERVER_EXIT: 'Observer exited with failure',
  COORDINATOR_OUTPUT_CANONICAL: 'Observer output is not canonical',
  COORDINATOR_OUTPUT_DECODE: 'Observer output is not valid UTF-8',
  COORDINATOR_OUTPUT_PARSE: 'Observer output is not valid JSON',
  COORDINATOR_OUTPUT_SCHEMA: 'Observer output schema mismatch',
  COORDINATOR_SIGNAL_TERMINATION: 'Observer terminated by signal',
  COORDINATOR_SPAWN_FAILED: 'Observer spawn failed',
  COORDINATOR_STDERR_OVERFLOW: 'Observer stderr exceeds limit',
  COORDINATOR_STDOUT_OVERFLOW: 'Observer stdout exceeds limit',
});

/**
 * @param {string} code
 * @param {readonly string[]} allowed
 * @returns {boolean}
 */
export function isClosedErrorCode(code, allowed) {
  return typeof code === 'string' && allowed.includes(code);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isIso8601UtcString(value) {
  if (typeof value !== 'string') return false;
  return Number.isFinite(Date.parse(value));
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isLowercaseSha256Hex(value) {
  return typeof value === 'string' && LOWERCASE_SHA256_HEX.test(value);
}

/**
 * @param {Record<string, unknown>} object
 * @param {readonly string[]} expectedKeys
 */
export function assertExactKeyOrder(object, expectedKeys) {
  const actualKeys = Object.keys(object);
  if (actualKeys.length !== expectedKeys.length) {
    throw new Error('Object keys do not match expected key order');
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (actualKeys[index] !== expectedKeys[index]) {
      throw new Error('Object keys do not match expected key order');
    }
  }
}

/**
 * @param {Record<string, unknown>} object
 * @param {readonly string[]} expectedKeys
 */
export function assertExactKeySet(object, expectedKeys) {
  const actualKeys = Object.keys(object).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    !actualKeys.every((key, index) => key === sortedExpected[index])
  ) {
    throw new Error('OBSERVER_BODY_KEYS');
  }
}

/**
 * @param {unknown} diagnostics
 */
export function validateDiagnosticsPayload(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    throw new Error('OBSERVER_BODY_SHAPE');
  }
  const payload = /** @type {Record<string, unknown>} */ (diagnostics);
  assertExactKeySet(payload, DIAGNOSTICS_OBJECT_KEYS);
  for (const key of DIAGNOSTICS_OBJECT_KEYS) {
    if (typeof payload[key] !== 'string') {
      throw new Error('OBSERVER_BODY_TYPE');
    }
  }
  if (
    payload.vercel_env !== PRODUCTION_ENVIRONMENT_LITERAL ||
    payload.vercel_branch !== PRODUCTION_BRANCH_LITERAL ||
    payload.node_env !== PRODUCTION_NODE_ENV_LITERAL ||
    !isLowercaseSha256Hex(payload.vercel_git_sha)
  ) {
    throw new Error('OBSERVER_BODY_VALUE');
  }
  return {
    vercel_env: payload.vercel_env,
    vercel_git_sha: payload.vercel_git_sha,
    vercel_branch: payload.vercel_branch,
    node_env: payload.node_env,
  };
}

/**
 * @param {unknown} result
 */
export function validateObserverResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Observer result must be an object');
  }
  const envelope = /** @type {Record<string, unknown>} */ (result);
  assertExactKeySet(envelope, OBSERVER_RESULT_KEYS);
  if (envelope.schemaVersion !== OBSERVER_RESULT_SCHEMA_VERSION) {
    throw new Error('Observer result schemaVersion mismatch');
  }
  if (!isIso8601UtcString(envelope.observedAt)) {
    throw new Error('Observer result observedAt invalid');
  }
  if (envelope.endpoint !== PRODUCTION_DIAGNOSTICS_ENDPOINT) {
    throw new Error('Observer result endpoint mismatch');
  }
  if (typeof envelope.effectiveUrl !== 'string' || envelope.effectiveUrl.length === 0) {
    throw new Error('Observer result effectiveUrl invalid');
  }
  if (envelope.httpStatus !== OBSERVER_EXPECTED_HTTP_STATUS) {
    throw new Error('Observer result httpStatus must be 200');
  }
  if (typeof envelope.contentType !== 'string' || !ACCEPTED_JSON_CONTENT_TYPE.test(envelope.contentType)) {
    throw new Error('Observer result contentType invalid');
  }
  const diagnostics = validateDiagnosticsPayload(envelope.diagnostics);
  return {
    schemaVersion: OBSERVER_RESULT_SCHEMA_VERSION,
    observedAt: envelope.observedAt,
    endpoint: envelope.endpoint,
    effectiveUrl: envelope.effectiveUrl,
    httpStatus: envelope.httpStatus,
    contentType: envelope.contentType,
    diagnostics,
  };
}

/**
 * @param {ReturnType<typeof validateObserverResult>} validatedResult
 */
export function normalizeObservedEvent(validatedResult) {
  return {
    observedAt: validatedResult.observedAt,
    diagnosticsIdentity: validatedResult.diagnostics.vercel_git_sha,
    environment: PRODUCTION_ENVIRONMENT_LITERAL,
    branch: PRODUCTION_BRANCH_LITERAL,
  };
}

/**
 * @param {string} applicationNowUtc
 * @param {string} observedAtUtc
 */
export function isFreshObservationTimestamp(applicationNowUtc, observedAtUtc) {
  const applicationMs = Date.parse(applicationNowUtc);
  const observedMs = Date.parse(observedAtUtc);
  if (!Number.isFinite(applicationMs) || !Number.isFinite(observedMs)) {
    return false;
  }
  const lowerBound = applicationMs - APPLICATION_FRESHNESS_PAST_MS;
  const upperBound = applicationMs + APPLICATION_FRESHNESS_FUTURE_MS;
  return observedMs >= lowerBound && observedMs <= upperBound;
}

/**
 * @param {string} code
 * @param {readonly string[]} catalog
 * @param {Readonly<Record<string, string>>} messages
 * @returns {string}
 */
export function closedErrorMessage(code, catalog, messages) {
  if (isClosedErrorCode(code, catalog)) {
    return messages[code];
  }
  return messages[catalog.includes('OBSERVER_INTERNAL') ? 'OBSERVER_INTERNAL' : catalog[catalog.length - 1]];
}

/**
 * @param {string} code
 * @param {readonly string[]} catalog
 * @param {Readonly<Record<string, string>>} messages
 * @returns {string}
 */
export function formatClosedErrorLine(code, catalog, messages) {
  const resolvedCode = isClosedErrorCode(code, catalog)
    ? code
    : catalog.find((entry) => entry.endsWith('_INTERNAL')) ?? catalog[0];
  const resolvedMessage = messages[resolvedCode] ?? 'Operation failed';
  return `${resolvedCode}: ${resolvedMessage}`;
}

/**
 * @param {string} code
 * @returns {never}
 */
export function throwObserverError(code) {
  const resolvedCode = isClosedErrorCode(code, OBSERVER_ERROR_CODES) ? code : 'OBSERVER_INTERNAL';
  const error = new Error(OBSERVER_ERROR_MESSAGES[resolvedCode]);
  error.name = 'ProductionObservationObserverError';
  /** @type {Record<string, unknown>} */ (error).code = resolvedCode;
  throw error;
}

/**
 * @param {string} code
 * @param {{ cause?: unknown }} [options]
 * @returns {never}
 */
export function throwApplicationError(code, options = {}) {
  const resolvedCode = isClosedErrorCode(code, APPLICATION_ERROR_CODES) ? code : 'APPLICATION_INTERNAL';
  const error = new Error(APPLICATION_ERROR_MESSAGES[resolvedCode]);
  error.name = 'ProductionObservationApplicationError';
  /** @type {Record<string, unknown>} */ (error).code = resolvedCode;
  if (options.cause !== undefined) {
    error.cause = options.cause;
  }
  throw error;
}

/**
 * @param {string} code
 * @returns {never}
 */
export function throwCoordinatorError(code) {
  const resolvedCode = isClosedErrorCode(code, COORDINATOR_ERROR_CODES) ? code : 'COORDINATOR_INTERNAL';
  const error = new Error(COORDINATOR_ERROR_MESSAGES[resolvedCode]);
  error.name = 'ProductionObservationCoordinatorError';
  /** @type {Record<string, unknown>} */ (error).code = resolvedCode;
  throw error;
}

/**
 * Pure direct-execution detection with injectable path operations.
 * The contract module performs no filesystem I/O on import.
 *
 * @param {string | URL} moduleUrl
 * @param {readonly string[]} argv
 * @param {{
 *   fileURLToPath: (url: string | URL) => string;
 *   resolve: (...parts: string[]) => string;
 *   realpath: (targetPath: string) => string;
 * }} ops
 * @returns {boolean}
 */
export function isDirectExecutionEntrypoint(moduleUrl, argv, ops) {
  if (!argv || typeof argv[1] !== 'string' || argv[1].length === 0) {
    return false;
  }
  try {
    const modulePath = ops.resolve(ops.fileURLToPath(moduleUrl));
    const argvPath = ops.resolve(argv[1]);
    return ops.realpath(modulePath) === ops.realpath(argvPath);
  } catch {
    return false;
  }
}
