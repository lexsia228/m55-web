import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalStringify } from '../canonical-json.mjs';
import { applyProductionObservationFromValidatedResult } from '../apply-production-observation.mjs';
import { OBSERVATIONS_PATH } from '../observations.mjs';
import {
  collectObserverChildResult,
  runProductionObservation,
  OBSERVER_RELATIVE_PATH,
  parseObserverStdoutBuffer,
  stringifyCoordinatorSummary,
} from '../run-production-observation.mjs';
import {
  COORDINATOR_STDERR_LIMIT_BYTES,
  OBSERVER_STDOUT_LIMIT_BYTES,
  PRODUCTION_DIAGNOSTICS_ENDPOINT,
} from '../production-observation-contract.mjs';

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const T = '2026-08-02T06:01:00.000Z';
const META_T = '2026-07-27T09:56:00+00:00';

/** @returns {string} */
function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-coordinator-'));
}

/** @param {string} root */
function seedObservationsFixture(root) {
  const observations = {
    schemaVersion: '1.0.0',
    observationMeta: {
      lastObservedAt: {
        value: META_T,
        classification: 'OBSERVED_CURRENT',
        source: { kind: 'GIT_OBSERVATION', reference: 'git fetch origin --prune' },
        updatedAt: META_T,
        evidenceRefs: [],
      },
    },
    production: {
      status: {
        value: 'PENDING_REOBSERVATION_ON_M-55.JP',
        classification: 'PENDING_EVIDENCE',
        source: { kind: 'PENDING_EVIDENCE', reference: 'PENDING_REOBSERVATION_ON_M-55.JP' },
        updatedAt: META_T,
        evidenceRefs: [],
      },
      lastObservedSha: {
        value: null,
        classification: 'PENDING_EVIDENCE',
        source: { kind: 'PENDING_EVIDENCE', reference: 'PENDING_REOBSERVATION_ON_M-55.JP' },
        updatedAt: META_T,
        evidenceRefs: [],
      },
    },
  };
  const target = path.join(root, OBSERVATIONS_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(observations, null, 2)}\n`, 'utf8');
}

/** @param {Promise<unknown>} promise @param {string} code */
async function expectRejectsCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, code);
    return true;
  });
}

/** @returns {string} */
function observerSuccessLine() {
  const validated = {
    schemaVersion: '1.0.0',
    observedAt: T,
    endpoint: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    effectiveUrl: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    httpStatus: 200,
    contentType: 'application/json; charset=utf-8',
    diagnostics: {
      vercel_env: 'production',
      vercel_git_sha: SHA,
      vercel_branch: 'main',
      node_env: 'production',
    },
  };
  parseObserverStdoutBuffer(Buffer.from(`${canonicalStringify(validated)}\n`, 'utf8'));
  return `${canonicalStringify(validated)}\n`;
}

/** @returns {EventEmitter & { stdout: EventEmitter & { push: (chunk: Buffer) => boolean }; stderr: EventEmitter & { push: (chunk: Buffer) => boolean }; kill: () => void }} */
function createFakeChildProcess() {
  /** @type {EventEmitter & { push: (chunk: Buffer) => boolean }} */
  const stdout = Object.assign(new EventEmitter(), {
    push(chunk) {
      stdout.emit('data', chunk);
      return true;
    },
  });
  /** @type {EventEmitter & { push: (chunk: Buffer) => boolean }} */
  const stderr = Object.assign(new EventEmitter(), {
    push(chunk) {
      stderr.emit('data', chunk);
      return true;
    },
  });
  const child = new EventEmitter();
  /** @type {EventEmitter & { stdout: typeof stdout; stderr: typeof stderr; kill: () => void }} */
  const processLike = Object.assign(child, {
    stdout,
    stderr,
    kill: () => {
      child.emit('close', null, 'SIGTERM');
    },
  });
  return processLike;
}

/**
 * @param {string} root
 * @param {(child: ReturnType<typeof createFakeChildProcess>) => void} setup
 * @param {Parameters<typeof runProductionObservation>[1]} [options]
 */
async function runWithFakeChild(root, setup, options = {}) {
  let spawnCount = 0;
  const result = await runProductionObservation(root, {
    ...options,
    spawnObserver: async () => {
      spawnCount += 1;
      const child = createFakeChildProcess();
      const resultPromise = collectObserverChildResult(child);
      setup(child);
      return resultPromise;
    },
  });
  return { result, spawnCount };
}

/** @param {string} root @param {(child: ReturnType<typeof createFakeChildProcess>) => void} setup @param {Parameters<typeof runProductionObservation>[1]} [options] */
async function expectFakeChildFailure(root, setup, expectedCode, options = {}) {
  let spawnCount = 0;
  let applyCount = 0;
  await expectRejectsCode(
    runProductionObservation(root, {
      ...options,
      applyFn: (...args) => {
        applyCount += 1;
        return applyProductionObservationFromValidatedResult(...args);
      },
      spawnObserver: async () => {
        spawnCount += 1;
        const child = createFakeChildProcess();
        const resultPromise = collectObserverChildResult(child);
        setup(child);
        return resultPromise;
      },
    }),
    expectedCode,
  );
  assert.equal(spawnCount, 1);
  assert.equal(applyCount, 0);
  return spawnCount;
}

test('spawn error followed by close rejects before application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => {
          child.emit('error', new Error('spawn failed'));
          child.emit('close', null, null);
        });
      },
      'COORDINATOR_SPAWN_FAILED',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nonzero observer exit and signal termination reject before application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => child.emit('close', 1, null));
      },
      'COORDINATOR_OBSERVER_EXIT',
    );
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
      },
      'COORDINATOR_SIGNAL_TERMINATION',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stdout multichunk overflow and malformed output reject before application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.alloc(1500, 97));
          child.stdout.push(Buffer.alloc(600, 97));
          child.emit('close', 0, null);
        });
      },
      'COORDINATOR_STDOUT_OVERFLOW',
    );
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from('line1\nline2\n'));
          child.emit('close', 0, null);
        });
      },
      'COORDINATOR_OUTPUT_CANONICAL',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('validated in-process application succeeds with one fake child spawn', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applyCount = 0;
    const { result, spawnCount } = await runWithFakeChild(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from(observerSuccessLine()));
          child.emit('close', 0, null);
        });
      },
      {
        applicationNowUtc: T,
        applyFn: (...args) => {
          applyCount += 1;
          return applyProductionObservationFromValidatedResult(...args);
        },
      },
    );
    assert.equal(spawnCount, 1);
    assert.equal(applyCount, 1);
    assert.match(result.stdout, /"result":"applied"/);
    assert.match(result.stdout, /"diagnosticsIdentity":"abcdef0123456789abcdef0123456789abcdef01"/);
    const summary = JSON.parse(result.stdout.trim());
    assert.deepEqual(Object.keys(summary), ['result', 'observedAtUtc', 'diagnosticsIdentity', 'changed']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('synchronous spawn throw rejects before application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applyCount = 0;
    await expectRejectsCode(
      runProductionObservation(root, {
        applicationNowUtc: T,
        spawnObserver: () => {
          throw new Error('spawn sync throw secret');
        },
        applyFn: () => {
          applyCount += 1;
          return { result: 'applied', observedAtUtc: T, diagnosticsIdentity: SHA, changed: [] };
        },
      }),
      'COORDINATOR_SPAWN_FAILED',
    );
    assert.equal(applyCount, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('parseObserverStdoutBuffer enforces strict canonical single-line output', () => {
  const validated = {
    schemaVersion: '1.0.0',
    observedAt: T,
    endpoint: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    effectiveUrl: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    httpStatus: 200,
    contentType: 'application/json; charset=utf-8',
    diagnostics: {
      vercel_env: 'production',
      vercel_git_sha: SHA,
      vercel_branch: 'main',
      node_env: 'production',
    },
  };
  const canonical = `${canonicalStringify(validated)}\n`;
  parseObserverStdoutBuffer(Buffer.from(canonical, 'utf8'));

  const reordered = JSON.stringify({
    diagnostics: validated.diagnostics,
    schemaVersion: validated.schemaVersion,
    observedAt: validated.observedAt,
    endpoint: validated.endpoint,
    effectiveUrl: validated.effectiveUrl,
    httpStatus: validated.httpStatus,
    contentType: validated.contentType,
  });
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.from(`${reordered}\n`, 'utf8')),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_CANONICAL');
      return true;
    },
  );
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.from(`${canonicalStringify(validated)} \n`, 'utf8')),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_CANONICAL');
      return true;
    },
  );
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.from(`${canonicalStringify(validated)}\r\n`, 'utf8')),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_CANONICAL');
      return true;
    },
  );
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.from(`${canonicalStringify(validated)}`, 'utf8')),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_CANONICAL');
      return true;
    },
  );
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.from(Buffer.concat([Buffer.from([0xff]), Buffer.from('\n')]))),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_DECODE');
      return true;
    },
  );
});

test('stderr-only multichunk overflow rejects before application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    await expectFakeChildFailure(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from(observerSuccessLine()));
          child.stderr.push(Buffer.alloc(3000, 97));
          child.stderr.push(Buffer.alloc(1200, 97));
          child.emit('close', 0, null);
        });
      },
      'COORDINATOR_STDERR_OVERFLOW',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('application exception maps to COORDINATOR_APPLICATION_FAILED', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applyCount = 0;
    await expectRejectsCode(
      runProductionObservation(root, {
        applicationNowUtc: T,
        applyFn: () => {
          applyCount += 1;
          throw new Error('application secret failure');
        },
        spawnObserver: async () => {
          const child = createFakeChildProcess();
          const resultPromise = collectObserverChildResult(child);
          queueMicrotask(() => {
            child.stdout.push(Buffer.from(observerSuccessLine()));
            child.emit('close', 0, null);
          });
          return resultPromise;
        },
      }),
      'COORDINATOR_APPLICATION_FAILED',
    );
    assert.equal(applyCount, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('coordinator summary uses exact key order', () => {
  const line = stringifyCoordinatorSummary({
    result: 'no_change',
    observedAtUtc: T,
    diagnosticsIdentity: SHA,
    changed: [],
  });
  assert.equal(line, JSON.stringify({
    result: 'no_change',
    observedAtUtc: T,
    diagnosticsIdentity: SHA,
    changed: [],
  }));
});

test('stdout exact cap boundary accepts 2048 bytes and rejects 2049', () => {
  const exact = Buffer.alloc(OBSERVER_STDOUT_LIMIT_BYTES, 97);
  exact[exact.length - 1] = 0x0a;
  assert.throws(
    () => parseObserverStdoutBuffer(exact),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_OUTPUT_PARSE');
      return true;
    },
  );
  assert.throws(
    () => parseObserverStdoutBuffer(Buffer.alloc(OBSERVER_STDOUT_LIMIT_BYTES + 1, 97)),
    (error) => {
      assert.equal(/** @type {{ code?: string }} */ (error).code, 'COORDINATOR_STDOUT_OVERFLOW');
      return true;
    },
  );
});

test('repeated close and late stream events do not re-invoke application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applyCount = 0;
    const { result, spawnCount } = await runWithFakeChild(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from(observerSuccessLine()));
          child.emit('exit', 0, null);
          child.emit('close', 0, null);
          child.emit('close', 0, null);
          child.stderr.push(Buffer.from('late stderr'));
        });
      },
      {
        applicationNowUtc: T,
        applyFn: (...args) => {
          applyCount += 1;
          return applyProductionObservationFromValidatedResult(...args);
        },
      },
    );
    assert.equal(spawnCount, 1);
    assert.equal(applyCount, 1);
    assert.match(result.stdout, /"result":"applied"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stdout exact 2048-byte boundary and stderr exact 4096-byte boundary via child streams', async () => {
  const exactStdout = Buffer.alloc(OBSERVER_STDOUT_LIMIT_BYTES, 97);
  exactStdout[exactStdout.length - 1] = 0x0a;
  const exactStderr = Buffer.alloc(COORDINATOR_STDERR_LIMIT_BYTES, 98);

  const root1 = makeTempRoot();
  try {
    seedObservationsFixture(root1);
    await expectFakeChildFailure(
      root1,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(exactStdout);
          child.emit('close', 0, null);
        });
      },
      'COORDINATOR_OUTPUT_PARSE',
    );
  } finally {
    fs.rmSync(root1, { recursive: true, force: true });
  }

  const root2 = makeTempRoot();
  try {
    seedObservationsFixture(root2);
    const { spawnCount } = await runWithFakeChild(
      root2,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from(observerSuccessLine()));
          child.stderr.push(exactStderr);
          child.emit('close', 0, null);
        });
      },
      { applicationNowUtc: T },
    );
    assert.equal(spawnCount, 1);
  } finally {
    fs.rmSync(root2, { recursive: true, force: true });
  }
});

test('repeated child error settles once and ignores late stream data', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applicationTimeSampleCount = 0;
    let applicationCallCount = 0;
    await expectRejectsCode(
      runProductionObservation(root, {
        get applicationNowUtc() {
          applicationTimeSampleCount += 1;
          return T;
        },
        applyFn: (...args) => {
          applicationCallCount += 1;
          return applyProductionObservationFromValidatedResult(...args);
        },
        spawnObserver: async () => {
          const child = createFakeChildProcess();
          const resultPromise = collectObserverChildResult(child);
          queueMicrotask(() => {
            child.emit('error', new Error('first spawn error'));
            child.emit('error', new Error('second spawn error'));
            child.emit('close', null, null);
            child.stdout.push(Buffer.from('late stdout'));
            child.stderr.push(Buffer.from('late stderr'));
          });
          return resultPromise;
        },
      }),
      'COORDINATOR_SPAWN_FAILED',
    );
    assert.equal(applicationTimeSampleCount, 0);
    assert.equal(applicationCallCount, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('exit followed by close applies exactly once and ignores repeated close', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applicationCallCount = 0;
    let applicationTimeSampleCount = 0;
    /** @type {string | undefined} */
    let capturedApplicationTime;
    const { result, spawnCount } = await runWithFakeChild(
      root,
      (child) => {
        queueMicrotask(() => {
          child.stdout.push(Buffer.from(observerSuccessLine()));
          child.emit('exit', 0, null);
          child.emit('close', 0, null);
          child.emit('close', 0, null);
        });
      },
      {
        get applicationNowUtc() {
          applicationTimeSampleCount += 1;
          return T;
        },
        applyFn: (rootArg, validated, applicationNowUtc) => {
          applicationCallCount += 1;
          capturedApplicationTime = applicationNowUtc;
          return applyProductionObservationFromValidatedResult(rootArg, validated, applicationNowUtc);
        },
      },
    );
    assert.equal(spawnCount, 1);
    assert.equal(applicationTimeSampleCount, 1);
    assert.equal(applicationCallCount, 1);
    assert.equal(capturedApplicationTime, T);
    assert.match(result.stdout, /"result":"applied"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nonzero exit followed by close never applies and ignores late data', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applicationCallCount = 0;
    let applicationTimeSampleCount = 0;
    let spawnCount = 0;
    await expectRejectsCode(
      runProductionObservation(root, {
        get applicationNowUtc() {
          applicationTimeSampleCount += 1;
          return T;
        },
        applyFn: (...args) => {
          applicationCallCount += 1;
          return applyProductionObservationFromValidatedResult(...args);
        },
        spawnObserver: async () => {
          spawnCount += 1;
          const child = createFakeChildProcess();
          const resultPromise = collectObserverChildResult(child);
          queueMicrotask(() => {
            child.emit('exit', 1, null);
            child.emit('close', 1, null);
            child.emit('close', 1, null);
            child.stdout.push(Buffer.from('late stdout'));
            child.stderr.push(Buffer.from('late stderr'));
          });
          return resultPromise;
        },
      }),
      'COORDINATOR_OBSERVER_EXIT',
    );
    assert.equal(spawnCount, 1);
    assert.equal(applicationTimeSampleCount, 0);
    assert.equal(applicationCallCount, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('spawn error followed by late streams does not grow buffers or invoke application', async () => {
  const root = makeTempRoot();
  try {
    seedObservationsFixture(root);
    let applicationCallCount = 0;
    let applicationTimeSampleCount = 0;
    await expectRejectsCode(
      runProductionObservation(root, {
        get applicationNowUtc() {
          applicationTimeSampleCount += 1;
          return T;
        },
        applyFn: () => {
          applicationCallCount += 1;
          return { result: 'applied', observedAtUtc: T, diagnosticsIdentity: SHA, changed: [] };
        },
        spawnObserver: async () => {
          const child = createFakeChildProcess();
          const resultPromise = collectObserverChildResult(child);
          queueMicrotask(() => {
            child.emit('error', new Error('spawn error'));
            child.stdout.push(Buffer.from('late stdout'));
            child.stderr.push(Buffer.from('late stderr'));
            child.emit('close', 1, null);
          });
          return resultPromise;
        },
      }),
      'COORDINATOR_SPAWN_FAILED',
    );
    assert.equal(applicationCallCount, 0);
    assert.equal(applicationTimeSampleCount, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
