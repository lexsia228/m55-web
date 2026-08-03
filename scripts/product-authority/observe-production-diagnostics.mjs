import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from './canonical-json.mjs';
import {
  ACCEPTED_JSON_CONTENT_TYPE,
  formatClosedErrorLine,
  isClosedErrorCode,
  isDirectExecutionEntrypoint,
  OBSERVER_CONNECT_TIMEOUT_MS,
  OBSERVER_ERROR_CODES,
  OBSERVER_ERROR_MESSAGES,
  OBSERVER_EXPECTED_HTTP_STATUS,
  OBSERVER_RESPONSE_BODY_LIMIT_BYTES,
  OBSERVER_RESULT_SCHEMA_VERSION,
  OBSERVER_STDOUT_LIMIT_BYTES,
  OBSERVER_TOTAL_TIMEOUT_MS,
  PRODUCTION_DIAGNOSTICS_ENDPOINT,
  PRODUCTION_DIAGNOSTICS_METHOD,
  validateDiagnosticsPayload,
  validateObserverResult,
  throwObserverError,
} from './production-observation-contract.mjs';

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

/**
 * @param {Buffer} buffer
 * @returns {string}
 */
export function decodeUtf8Fatal(buffer) {
  try {
    return FATAL_UTF8_DECODER.decode(buffer);
  } catch {
    throwObserverError('OBSERVER_BODY_DECODE');
  }
}

/**
 * @param {string} bodyText
 */
function parseDiagnosticsObject(bodyText) {
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throwObserverError('OBSERVER_BODY_JSON');
  }
  try {
    return validateDiagnosticsPayload(parsed);
  } catch (error) {
    const token = error instanceof Error ? error.message : 'OBSERVER_BODY_VALUE';
    if (token === 'OBSERVER_BODY_SHAPE') throwObserverError('OBSERVER_BODY_SHAPE');
    if (token === 'OBSERVER_BODY_KEYS') throwObserverError('OBSERVER_BODY_KEYS');
    if (token === 'OBSERVER_BODY_TYPE') throwObserverError('OBSERVER_BODY_TYPE');
    throwObserverError('OBSERVER_BODY_VALUE');
  }
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 */
function readResponseContentType(headers) {
  const header = headers['content-type'];
  if (Array.isArray(header)) {
    return header[0] ?? '';
  }
  return header ?? '';
}

/**
 * @param {{
 *   statusCode?: number;
 *   headers?: Record<string, string | string[] | undefined>;
 *   body?: Buffer | string;
 *   effectiveUrl?: string;
 * }} response
 * @param {string} observedAt
 */
export function buildValidatedResultFromResponse(response, observedAt) {
  const statusCode = response.statusCode ?? 0;
  if (statusCode >= 300 && statusCode < 400) {
    throwObserverError('OBSERVER_REDIRECT');
  }
  if (statusCode !== OBSERVER_EXPECTED_HTTP_STATUS) {
    throwObserverError('OBSERVER_HTTP_STATUS');
  }
  const contentType = readResponseContentType(response.headers ?? {});
  if (!ACCEPTED_JSON_CONTENT_TYPE.test(contentType)) {
    throwObserverError('OBSERVER_CONTENT_TYPE');
  }
  const bodyBuffer =
    typeof response.body === 'string'
      ? Buffer.from(response.body, 'utf8')
      : response.body ?? Buffer.alloc(0);
  if (bodyBuffer.length > OBSERVER_RESPONSE_BODY_LIMIT_BYTES) {
    throwObserverError('OBSERVER_BODY_TOO_LARGE');
  }
  const bodyText = decodeUtf8Fatal(bodyBuffer);
  const diagnostics = parseDiagnosticsObject(bodyText);
  const result = {
    schemaVersion: OBSERVER_RESULT_SCHEMA_VERSION,
    observedAt,
    endpoint: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    effectiveUrl: response.effectiveUrl ?? PRODUCTION_DIAGNOSTICS_ENDPOINT,
    httpStatus: OBSERVER_EXPECTED_HTTP_STATUS,
    contentType,
    diagnostics,
  };
  return validateObserverResult(result);
}

/**
 * @param {() => string} now
 * @param {{
 *   https?: typeof https;
 *   setTimeout?: typeof setTimeout;
 *   clearTimeout?: typeof clearTimeout;
 * }} [transportOptions]
 */
export function createHttpsRequest(now, transportOptions = {}) {
  const httpsModule = transportOptions.https ?? https;
  const scheduleTimer = transportOptions.setTimeout ?? setTimeout;
  const cancelTimer = transportOptions.clearTimeout ?? clearTimeout;

  return new Promise((resolve, reject) => {
    const url = new URL(PRODUCTION_DIAGNOSTICS_ENDPOINT);
    let settled = false;
    let requestDestroyed = false;
    let responseDestroyed = false;
    /** @type {NodeJS.Timeout | undefined} */
    let totalTimer;
    /** @type {NodeJS.Timeout | undefined} */
    let connectTimer;
    /** @type {Buffer[]} */
    const chunks = [];
    let totalBytes = 0;
    /** @type {import('node:http').IncomingMessage | null} */
    let activeResponse = null;
    /** @type {import('node:http').ClientRequest | null} */
    let activeRequest = null;

    const clearTimers = () => {
      if (totalTimer !== undefined) {
        cancelTimer(totalTimer);
        totalTimer = undefined;
      }
      if (connectTimer !== undefined) {
        cancelTimer(connectTimer);
        connectTimer = undefined;
      }
    };

    const destroyRequestOnce = () => {
      if (requestDestroyed || !activeRequest) {
        return;
      }
      requestDestroyed = true;
      activeRequest.destroy();
    };

    const destroyResponseOnce = () => {
      if (responseDestroyed || !activeResponse) {
        return;
      }
      responseDestroyed = true;
      activeResponse.destroy();
    };

    /**
     * @param {string} code
     */
    const fail = (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      const resolvedCode = isClosedErrorCode(code, OBSERVER_ERROR_CODES) ? code : 'OBSERVER_INTERNAL';
      const error = new Error(OBSERVER_ERROR_MESSAGES[resolvedCode]);
      /** @type {Record<string, unknown>} */ (error).code = resolvedCode;
      reject(error);
      destroyResponseOnce();
      destroyRequestOnce();
    };

    /**
     * @param {{
     *   statusCode?: number;
     *   headers?: Record<string, string | string[] | undefined>;
     *   body: Buffer;
     *   effectiveUrl: string;
     * }} response
     */
    const succeed = (response) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve(response);
    };

    activeRequest = httpsModule.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: PRODUCTION_DIAGNOSTICS_METHOD,
        agent: false,
        headers: {
          Accept: 'application/json',
        },
      },
      (res) => {
        if (settled) {
          return;
        }
        activeResponse = res;
        if (connectTimer !== undefined) {
          cancelTimer(connectTimer);
          connectTimer = undefined;
        }
        res.on('data', (chunk) => {
          if (settled) {
            return;
          }
          totalBytes += chunk.length;
          if (totalBytes > OBSERVER_RESPONSE_BODY_LIMIT_BYTES) {
            fail('OBSERVER_BODY_TOO_LARGE');
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        res.on('end', () => {
          if (settled) {
            return;
          }
          succeed({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
            effectiveUrl: PRODUCTION_DIAGNOSTICS_ENDPOINT,
          });
        });
        res.on('error', () => {
          fail('OBSERVER_REQUEST_FAILED');
        });
      },
    );

    connectTimer = scheduleTimer(() => {
      fail('OBSERVER_CONNECT_TIMEOUT');
    }, OBSERVER_CONNECT_TIMEOUT_MS);

    activeRequest.on('socket', (socket) => {
      socket.once('connect', () => {
        if (settled || connectTimer === undefined) {
          return;
        }
        cancelTimer(connectTimer);
        connectTimer = undefined;
      });
    });

    activeRequest.on('error', () => {
      if (settled) {
        return;
      }
      fail('OBSERVER_REQUEST_FAILED');
    });

    totalTimer = scheduleTimer(() => {
      fail('OBSERVER_TOTAL_TIMEOUT');
    }, OBSERVER_TOTAL_TIMEOUT_MS);

    activeRequest.end();
  });
}

/**
 * @param {() => string} now
 */
function defaultHttpsRequest(now) {
  return createHttpsRequest(now);
}

/**
 * @param {{
 *   requestFactory?: () => Promise<{
 *     statusCode?: number;
 *     headers?: Record<string, string | string[] | undefined>;
 *     body?: Buffer | string;
 *     effectiveUrl?: string;
 *   }>;
 *   now?: () => string;
 *   transportOptions?: {
 *     https?: typeof https;
 *     setTimeout?: typeof setTimeout;
 *     clearTimeout?: typeof clearTimeout;
 *   };
 * }} [options]
 */
export async function observeProductionDiagnostics(options = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const requestFactory =
    options.requestFactory ?? (() => createHttpsRequest(now, options.transportOptions));
  try {
    const response = await requestFactory();
    return buildValidatedResultFromResponse(response, now());
  } catch (error) {
    if (error instanceof Error && isClosedErrorCode(/** @type {{ code?: string }} */ (error).code, OBSERVER_ERROR_CODES)) {
      throwObserverError(/** @type {{ code: string }} */ (error).code);
    }
    throwObserverError('OBSERVER_INTERNAL');
  }
}

/**
 * @param {ReturnType<typeof validateObserverResult>} validatedResult
 */
export function formatObserverSuccessLine(validatedResult) {
  const line = canonicalStringify(validatedResult);
  const bytes = Buffer.byteLength(`${line}\n`, 'utf8');
  if (bytes > OBSERVER_STDOUT_LIMIT_BYTES) {
    throwObserverError('OBSERVER_STDOUT_OVERFLOW');
  }
  return `${line}\n`;
}

/**
 * @param {Error & { code?: string }} error
 */
export function formatObserverFailureLine(error) {
  const code =
    error instanceof Error && typeof error.code === 'string' ? error.code : 'OBSERVER_INTERNAL';
  return formatClosedErrorLine(code, OBSERVER_ERROR_CODES, OBSERVER_ERROR_MESSAGES);
}

async function runCli() {
  try {
    const validated = await observeProductionDiagnostics();
    process.stdout.write(formatObserverSuccessLine(validated));
  } catch (error) {
    const line =
      error instanceof Error
        ? formatObserverFailureLine(/** @type {Error & { code?: string }} */ (error))
        : formatClosedErrorLine('OBSERVER_INTERNAL', OBSERVER_ERROR_CODES, OBSERVER_ERROR_MESSAGES);
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
