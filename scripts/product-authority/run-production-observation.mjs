import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { TextDecoder } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from './canonical-json.mjs';
import {
  applyProductionObservationFromValidatedResult,
} from './apply-production-observation.mjs';
import {
  COORDINATOR_STDERR_LIMIT_BYTES,
  COORDINATOR_SUMMARY_KEYS,
  formatClosedErrorLine,
  isClosedErrorCode,
  isDirectExecutionEntrypoint,
  OBSERVER_STDOUT_LIMIT_BYTES,
  COORDINATOR_ERROR_CODES,
  COORDINATOR_ERROR_MESSAGES,
  throwCoordinatorError,
  validateObserverResult,
} from './production-observation-contract.mjs';

const OBSERVER_RELATIVE_PATH = 'scripts/product-authority/observe-production-diagnostics.mjs';
const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

/**
 * @param {{
 *   result: 'applied' | 'no_change';
 *   observedAtUtc: string;
 *   diagnosticsIdentity: string;
 *   changed: string[];
 * }} summary
 */
export function stringifyCoordinatorSummary(summary) {
  const payload = {
    result: summary.result,
    observedAtUtc: summary.observedAtUtc,
    diagnosticsIdentity: summary.diagnosticsIdentity,
    changed: summary.changed,
  };
  const keys = Object.keys(payload);
  if (!COORDINATOR_SUMMARY_KEYS.every((key, index) => keys[index] === key)) {
    throwCoordinatorError('COORDINATOR_INTERNAL');
  }
  return JSON.stringify(payload);
}

/**
 * @param {Buffer} stdoutBuffer
 */
export function parseObserverStdoutBuffer(stdoutBuffer) {
  if (stdoutBuffer.length === 0) {
    throwCoordinatorError('COORDINATOR_OUTPUT_PARSE');
  }
  if (stdoutBuffer.length > OBSERVER_STDOUT_LIMIT_BYTES) {
    throwCoordinatorError('COORDINATOR_STDOUT_OVERFLOW');
  }
  if (stdoutBuffer[stdoutBuffer.length - 1] !== 0x0a) {
    throwCoordinatorError('COORDINATOR_OUTPUT_CANONICAL');
  }
  if (stdoutBuffer.includes(0x0d)) {
    throwCoordinatorError('COORDINATOR_OUTPUT_CANONICAL');
  }
  const payload = stdoutBuffer.subarray(0, stdoutBuffer.length - 1);
  if (payload.includes(0x0a)) {
    throwCoordinatorError('COORDINATOR_OUTPUT_CANONICAL');
  }
  let decoded;
  try {
    decoded = FATAL_UTF8_DECODER.decode(payload);
  } catch {
    throwCoordinatorError('COORDINATOR_OUTPUT_DECODE');
  }
  if (decoded.length === 0 || decoded !== decoded.trim()) {
    throwCoordinatorError('COORDINATOR_OUTPUT_CANONICAL');
  }
  let parsed;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throwCoordinatorError('COORDINATOR_OUTPUT_PARSE');
  }
  let validated;
  try {
    validated = validateObserverResult(parsed);
  } catch {
    throwCoordinatorError('COORDINATOR_OUTPUT_SCHEMA');
  }
  const canonical = canonicalStringify(validated);
  if (canonical !== decoded) {
    throwCoordinatorError('COORDINATOR_OUTPUT_CANONICAL');
  }
  return validated;
}

/**
 * @param {ReturnType<typeof applyProductionObservationFromValidatedResult>} summary
 */
function formatCoordinatorSuccessLine(summary) {
  return `${stringifyCoordinatorSummary(summary)}\n`;
}

/**
 * @param {import('node:child_process').ChildProcess} child
 */
export function collectObserverChildResult(child) {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutOverflow = false;
    let stderrOverflow = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    child.stdout?.on('data', (chunk) => {
      if (settled || stdoutOverflow) {
        return;
      }
      const buffer = Buffer.from(chunk);
      stdoutBytes += buffer.length;
      if (stdoutBytes > OBSERVER_STDOUT_LIMIT_BYTES) {
        stdoutOverflow = true;
        child.kill();
        return;
      }
      stdout = Buffer.concat([stdout, buffer]);
    });

    child.stderr?.on('data', (chunk) => {
      if (settled || stderrOverflow) {
        return;
      }
      const buffer = Buffer.from(chunk);
      stderrBytes += buffer.length;
      if (stderrBytes > COORDINATOR_STDERR_LIMIT_BYTES) {
        stderrOverflow = true;
        child.kill();
        return;
      }
      stderr = Buffer.concat([stderr, buffer]);
    });

    child.on('error', (error) => {
      finish({
        exitCode: null,
        signal: null,
        stdout,
        stderr,
        error,
        stdoutOverflow,
        stderrOverflow,
      });
    });

    child.on('close', (exitCode, signal) => {
      finish({
        exitCode,
        signal,
        stdout,
        stderr,
        error: null,
        stdoutOverflow,
        stderrOverflow,
      });
    });
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   cwd: string;
 *   env: NodeJS.ProcessEnv;
 *   shell: boolean;
 * }} spawnOptions
 */
function defaultSpawnObserver(command, args, spawnOptions) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, spawnOptions);
    } catch (error) {
      resolve({
        exitCode: null,
        signal: null,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        error,
        stdoutOverflow: false,
        stderrOverflow: false,
      });
      return;
    }

    collectObserverChildResult(child).then(resolve);
  });
}

/**
 * @param {string} root
 * @param {{
 *   spawnObserver?: typeof defaultSpawnObserver;
 *   applicationNowUtc?: string;
 *   applyFn?: typeof applyProductionObservationFromValidatedResult;
 * }} [options]
 */
export async function runProductionObservation(root, options = {}) {
  const observerPath = path.join(root, OBSERVER_RELATIVE_PATH);
  const spawnObserver = options.spawnObserver ?? defaultSpawnObserver;
  const applyFn = options.applyFn ?? applyProductionObservationFromValidatedResult;

  let observerResult;
  try {
    observerResult = await spawnObserver(process.execPath, [observerPath], {
      cwd: root,
      env: process.env,
      shell: false,
    });
  } catch {
    throwCoordinatorError('COORDINATOR_SPAWN_FAILED');
  }

  if (observerResult.error) {
    throwCoordinatorError('COORDINATOR_SPAWN_FAILED');
  }
  if (observerResult.stdoutOverflow) {
    throwCoordinatorError('COORDINATOR_STDOUT_OVERFLOW');
  }
  if (observerResult.stderrOverflow) {
    throwCoordinatorError('COORDINATOR_STDERR_OVERFLOW');
  }
  if (observerResult.signal) {
    throwCoordinatorError('COORDINATOR_SIGNAL_TERMINATION');
  }
  if (observerResult.exitCode !== 0) {
    throwCoordinatorError('COORDINATOR_OBSERVER_EXIT');
  }

  const validated = parseObserverStdoutBuffer(observerResult.stdout);
  const applicationNowUtc = options.applicationNowUtc ?? new Date().toISOString();

  let summary;
  try {
    summary = applyFn(root, validated, applicationNowUtc);
  } catch {
    throwCoordinatorError('COORDINATOR_APPLICATION_FAILED');
  }

  return {
    stdout: formatCoordinatorSuccessLine(summary),
    summary,
  };
}

async function runCli() {
  try {
    const result = await runProductionObservation(process.cwd());
    process.stdout.write(result.stdout);
  } catch (error) {
    const code =
      error instanceof Error && isClosedErrorCode(/** @type {{ code?: string }} */ (error).code, COORDINATOR_ERROR_CODES)
        ? /** @type {{ code: string }} */ (error).code
        : 'COORDINATOR_INTERNAL';
    process.stderr.write(`${formatClosedErrorLine(code, COORDINATOR_ERROR_CODES, COORDINATOR_ERROR_MESSAGES)}\n`);
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

export { OBSERVER_RELATIVE_PATH, defaultSpawnObserver };
