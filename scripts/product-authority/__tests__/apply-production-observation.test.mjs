import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  applyProductionObservationFromStdin,
  applyProductionObservationFromValidatedResult,
  formatApplicationFailureLine,
  isPathContained,
  resolveAuthorizedObservationsTarget,
  writeAllBytes,
  writeObservationsAtomically,
  WRITE_ALLOWLIST,
} from '../apply-production-observation.mjs';
import { OBSERVATIONS_PATH } from '../observations.mjs';
import {
  APPLICATION_ERROR_CODES,
  APPLICATION_ERROR_MESSAGES,
  PRODUCTION_DIAGNOSTICS_ENDPOINT,
} from '../production-observation-contract.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const APPLY_CLI = path.join(repoRoot, 'scripts/product-authority/apply-production-observation.mjs');

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const META_T = '2026-07-27T09:56:00+00:00';

/** @param {() => unknown} fn @param {string} code */
function expectThrowsCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, code);
    return true;
  });
}

/** @param {Promise<unknown>} promise @param {string} code */
async function expectRejectsCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, code);
    return true;
  });
}

/** @returns {string} */
function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-apply-'));
}

/** @param {string} root */
function seedObservations(root) {
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
  fs.writeFileSync(target, `${JSON.stringify(observations, null, 2)}\n`, { mode: 0o644 });
  return observations;
}

/** @param {string} observedAt */
function validatedResult(observedAt) {
  return {
    schemaVersion: '1.0.0',
    observedAt,
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
}

test('freshness lower and upper boundaries are accepted', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const applicationNow = '2026-08-02T06:01:00.000Z';
    const lower = applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:00:00.000Z'),
      applicationNow,
    );
    assert.equal(lower.result, 'applied');
    seedObservations(root);
    const upper = applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:05.000Z'),
      applicationNow,
    );
    assert.equal(upper.result, 'applied');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('freshness below and above boundaries are rejected without write', () => {
  const root = makeTempRoot();
  try {
    const before = seedObservations(root);
    const beforeText = fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8');
    expectThrowsCode(
      () =>
        applyProductionObservationFromValidatedResult(
          root,
          validatedResult('2026-08-02T05:59:59.000Z'),
          '2026-08-02T06:01:00.000Z',
        ),
      'APPLICATION_FRESHNESS_STALE',
    );
    assert.equal(fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8'), beforeText);
    expectThrowsCode(
      () =>
        applyProductionObservationFromValidatedResult(
          root,
          validatedResult('2026-08-02T06:01:06.000Z'),
          '2026-08-02T06:01:00.000Z',
        ),
      'APPLICATION_FRESHNESS_FUTURE',
    );
    assert.deepEqual(before.production, JSON.parse(beforeText).production);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('identical event is no_change before monotonicity rejection', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    const noChange = applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    assert.equal(noChange.result, 'no_change');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('malformed stdin and schema mismatch do not write', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const before = fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8');
    expectThrowsCode(
      () => applyProductionObservationFromStdin(root, '{bad', '2026-08-02T06:01:00.000Z'),
      'APPLICATION_INPUT_PARSE',
    );
    expectThrowsCode(
      () =>
        applyProductionObservationFromValidatedResult(
          root,
          { schemaVersion: '9.9.9' },
          '2026-08-02T06:01:00.000Z',
        ),
      'APPLICATION_SCHEMA_MISMATCH',
    );
    assert.equal(fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8'), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('atomic replacement preserves mode and uses exact write allowlist', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const mode = fs.statSync(target).mode & 0o777;
    applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    assert.deepEqual(WRITE_ALLOWLIST, ['.product-authority/observations.json']);
    assert.equal(fs.statSync(target).mode & 0o777, mode);
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.equal(
      /** @type {{ value: string }} */ (parsed.production.lastObservedSha).value,
      SHA,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('no_change does not create temporary files', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    const siblings = fs.readdirSync(path.join(root, '.product-authority'));
    assert.equal(siblings.some((name) => name.includes('.tmp')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('component-safe containment rejects sibling-prefix false positives', () => {
  assert.equal(isPathContained('/root', '/root-a/.product-authority/observations.json'), false);
  assert.equal(isPathContained('/root', '/root/.product-authority/observations.json'), true);
});

test('resolveAuthorizedObservationsTarget rejects missing directory and symlink targets', () => {
  const root = makeTempRoot();
  try {
    const paDir = path.join(root, '.product-authority');
    fs.mkdirSync(paDir, { recursive: true });
    const target = path.join(paDir, 'observations.json');
    fs.writeFileSync(target, '{}\n');
    const resolved = resolveAuthorizedObservationsTarget(root);
    assert.equal(resolved.targetPath, fs.realpathSync(target));

    fs.rmSync(target);
    expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');

    fs.mkdirSync(target);
    expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');
    fs.rmSync(target, { recursive: true });

    fs.symlinkSync('/etc/passwd', target);
    expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('symlinked .product-authority ancestor escaping root is rejected', () => {
  const root = makeTempRoot();
  const outside = makeTempRoot();
  try {
    fs.mkdirSync(path.join(outside, '.product-authority'), { recursive: true });
    fs.writeFileSync(path.join(outside, '.product-authority', 'observations.json'), '{}\n');
    fs.symlinkSync(outside, path.join(root, '.product-authority'), 'dir');
    expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('pending replay and observed monotonicity rules reject stale timestamps', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    expectThrowsCode(
      () =>
        applyProductionObservationFromValidatedResult(
          root,
          validatedResult('2026-07-27T09:55:30.000Z'),
          '2026-07-27T09:56:30.000Z',
        ),
      'APPLICATION_REPLAY',
    );

    seedObservations(root);
    applyProductionObservationFromValidatedResult(
      root,
      validatedResult('2026-08-02T06:01:00.000Z'),
      '2026-08-02T06:01:00.000Z',
    );
    expectThrowsCode(
      () =>
        applyProductionObservationFromValidatedResult(
          root,
          validatedResult('2026-08-02T06:00:59.000Z'),
          '2026-08-02T06:01:30.000Z',
        ),
      'APPLICATION_MONOTONICITY',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeAllBytes completes partial writes and rejects zero progress', () => {
  const root = makeTempRoot();
  try {
    const target = path.join(root, 'partial.bin');
    const fd = fs.openSync(target, 'w');
    const payload = Buffer.from('abcdefghij', 'utf8');
    let calls = 0;
    const mockFs = {
      ...fs,
      writeSync: (_fd, buffer, offset, length) => {
        calls += 1;
        if (calls === 1) return fs.writeSync(_fd, buffer, offset, 4);
        return fs.writeSync(_fd, buffer, offset, length);
      },
    };
    writeAllBytes(fd, payload, mockFs);
    fs.closeSync(fd);
    assert.equal(fs.readFileSync(target, 'utf8'), 'abcdefghij');
    const fd2 = fs.openSync(path.join(root, 'zero.bin'), 'w');
    assert.throws(
      () =>
        writeAllBytes(
          fd2,
          Buffer.from('x'),
          { ...fs, writeSync: () => 0 },
        ),
      /zero progress/,
    );
    fs.closeSync(fd2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('atomic write failures map to APPLICATION_WRITE_FAILED and remove owned temp', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const before = fs.readFileSync(target, 'utf8');
    const observations = JSON.parse(before);
    const renameError = new Error('rename failed');

    const failingFs = {
      ...fs,
      renameSync: () => {
        throw renameError;
      },
    };
    assert.throws(
      () => writeObservationsAtomically(target, observations, failingFs),
      (error) => {
        assert.equal(/** @type {{ code?: string }} */ (error).code, 'APPLICATION_WRITE_FAILED');
        assert.equal(/** @type {{ cause?: Error }} */ (error).cause, renameError);
        return true;
      },
    );
    assert.equal(fs.readFileSync(target, 'utf8'), before);
    const temps = fs.readdirSync(path.dirname(target)).filter((name) => name.includes('.tmp'));
    assert.equal(temps.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('application CLI failure mapping is closed and redacted', () => {
  for (const code of APPLICATION_ERROR_CODES) {
    const line = formatApplicationFailureLine(Object.assign(new Error('secret'), { code }));
    assert.equal(line, `${code}: ${APPLICATION_ERROR_MESSAGES[code]}`);
  }
  assert.equal(
    formatApplicationFailureLine(Object.assign(new Error('stack\nsecret-token'), { code: 'APPLICATION_FAKE' })),
    'APPLICATION_INTERNAL: Application failed',
  );
  assert.equal(
    formatApplicationFailureLine(Object.assign(new Error('stack\nsecret-token'), { code: 'FAKE' })),
    'APPLICATION_INTERNAL: Application failed',
  );
  assert.equal(
    formatApplicationFailureLine(new Error('missing code secret')),
    'APPLICATION_INTERNAL: Application failed',
  );
  assert.equal(
    formatApplicationFailureLine(Object.assign(new Error('secret'), { code: 123 })),
    'APPLICATION_INTERNAL: Application failed',
  );
  assert.doesNotMatch(formatApplicationFailureLine(new Error('secret-token')), /secret-token/);
});

test('filesystem failure matrix preserves primary cause and target validity', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const before = fs.readFileSync(target, 'utf8');
    const observations = JSON.parse(before);

    const cases = [
      {
        name: 'writeSync',
        patch: (primary) => ({
          writeSync: () => {
            throw primary;
          },
        }),
      },
      {
        name: 'fsyncSync',
        patch: (primary) => ({
          fsyncSync: () => {
            throw primary;
          },
        }),
      },
      {
        name: 'closeSync primary',
        patch: (primary) => ({
          closeSync: () => {
            throw primary;
          },
        }),
      },
      {
        name: 'renameSync',
        patch: (primary) => ({
          renameSync: () => {
            throw primary;
          },
        }),
      },
    ];

    for (const testCase of cases) {
      const primary = new Error(`${testCase.name} failed`);
      const mockFs = { ...fs, ...testCase.patch(primary) };
      assert.throws(
        () => writeObservationsAtomically(target, observations, mockFs),
        (error) => {
          assert.equal(/** @type {{ code?: string }} */ (error).code, 'APPLICATION_WRITE_FAILED');
          assert.equal(/** @type {{ cause?: Error }} */ (error).cause, primary);
          return true;
        },
      );
      assert.equal(fs.readFileSync(target, 'utf8'), before);
      const temps = fs.readdirSync(path.dirname(target)).filter((name) => name.includes('.tmp'));
      assert.equal(temps.length, 0);
    }

    const writePrimary = new Error('write failed');
    const cleanupClose = new Error('cleanup close failed');
    let closeCalls = 0;
    const cleanupFs = {
      ...fs,
      writeSync: () => {
        throw writePrimary;
      },
      closeSync: (...args) => {
        closeCalls += 1;
        if (closeCalls === 1) {
          throw cleanupClose;
        }
        return fs.closeSync(...args);
      },
    };
    assert.throws(
      () => writeObservationsAtomically(target, observations, cleanupFs),
      (error) => {
        assert.equal(/** @type {{ cause?: Error }} */ (error).cause, writePrimary);
        return true;
      },
    );

    const renamePrimary = new Error('rename failed');
    const unlinkCleanup = new Error('unlink cleanup failed');
    const unlinkFs = {
      ...fs,
      renameSync: () => {
        throw renamePrimary;
      },
      unlinkSync: () => {
        throw unlinkCleanup;
      },
    };
    assert.throws(
      () => writeObservationsAtomically(target, observations, unlinkFs),
      (error) => {
        assert.equal(/** @type {{ cause?: Error }} */ (error).cause, renamePrimary);
        return true;
      },
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nonordinary FIFO target is rejected', () => {
  const root = makeTempRoot();
  try {
    const paDir = path.join(root, '.product-authority');
    fs.mkdirSync(paDir, { recursive: true });
    const target = path.join(paDir, 'observations.json');
    try {
      execFileSync('mkfifo', [target]);
      expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');
    } catch (error) {
      const stat = fs.statSync(target);
      assert.equal(stat.isFIFO?.() ?? false, false);
      if (typeof stat.isSocket === 'function' && stat.isSocket()) {
        expectThrowsCode(() => resolveAuthorizedObservationsTarget(root), 'APPLICATION_TARGET_INVALID');
      } else {
        fs.writeFileSync(target, '{}\n');
        resolveAuthorizedObservationsTarget(root);
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('atomic write records exact successful operation order', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const observations = JSON.parse(fs.readFileSync(target, 'utf8'));
    /** @type {string[]} */
    const ops = [];
    const mockFs = {
      ...fs,
      lstatSync: (targetPath) => {
        ops.push('lstatSync');
        return fs.lstatSync(targetPath);
      },
      openSync: (targetPath, flags, mode) => {
        ops.push(`openSync:${flags}`);
        assert.equal(typeof mode, 'number');
        return fs.openSync(targetPath, flags, mode);
      },
      writeSync: (...args) => {
        ops.push('writeSync');
        return fs.writeSync(...args);
      },
      fsyncSync: (fd) => {
        ops.push('fsyncSync');
        return fs.fsyncSync(fd);
      },
      closeSync: (fd) => {
        ops.push('closeSync');
        return fs.closeSync(fd);
      },
      renameSync: (from, to) => {
        ops.push('renameSync');
        return fs.renameSync(from, to);
      },
    };
    writeObservationsAtomically(target, observations, mockFs);
    assert.deepEqual(ops, [
      'lstatSync',
      'openSync:wx',
      'writeSync',
      'fsyncSync',
      'closeSync',
      'renameSync',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('zero-progress write through full atomic path preserves cause and skips rename', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const before = fs.readFileSync(target, 'utf8');
    const observations = JSON.parse(before);
    let renameCalled = false;
    let unlinkCalls = 0;
    const mockFs = {
      ...fs,
      writeSync: () => 0,
      renameSync: () => {
        renameCalled = true;
      },
      unlinkSync: (targetPath) => {
        unlinkCalls += 1;
        fs.unlinkSync(targetPath);
      },
    };
    assert.throws(
      () => writeObservationsAtomically(target, observations, mockFs),
      (error) => {
        assert.equal(/** @type {{ code?: string }} */ (error).code, 'APPLICATION_WRITE_FAILED');
        assert.match(String(/** @type {{ cause?: Error }} */ (error).cause?.message), /zero progress/);
        return true;
      },
    );
    assert.equal(renameCalled, false);
    assert.equal(unlinkCalls, 1);
    assert.equal(fs.readFileSync(target, 'utf8'), before);
    const temps = fs.readdirSync(path.dirname(target)).filter((name) => name.includes('.tmp'));
    assert.equal(temps.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cleanup unlink failure leaves exact owned temp residue and preserves siblings', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const target = path.join(root, OBSERVATIONS_PATH);
    const paDir = path.dirname(target);
    const sibling = path.join(paDir, 'sibling-safe.txt');
    const decoy = path.join(paDir, 'observations.json.backup');
    fs.writeFileSync(sibling, 'sibling\n');
    fs.writeFileSync(decoy, 'decoy\n');
    const before = fs.readFileSync(target, 'utf8');
    const observations = JSON.parse(before);
    /** @type {string | undefined} */
    let ownedTemp;
    const renamePrimary = new Error('rename failed');
    const unlinkCleanup = new Error('unlink cleanup failed');
    const mockFs = {
      ...fs,
      openSync: (targetPath, flags, mode) => {
        ownedTemp = String(targetPath);
        return fs.openSync(targetPath, flags, mode);
      },
      renameSync: () => {
        throw renamePrimary;
      },
      unlinkSync: (targetPath) => {
        if (ownedTemp && String(targetPath) === ownedTemp) {
          throw unlinkCleanup;
        }
        return fs.unlinkSync(targetPath);
      },
    };
    assert.throws(
      () => writeObservationsAtomically(target, observations, mockFs),
      (error) => {
        assert.equal(/** @type {{ cause?: Error }} */ (error).cause, renamePrimary);
        return true;
      },
    );
    assert.equal(fs.readFileSync(target, 'utf8'), before);
    assert.equal(fs.readFileSync(sibling, 'utf8'), 'sibling\n');
    assert.equal(fs.readFileSync(decoy, 'utf8'), 'decoy\n');
    assert.ok(ownedTemp);
    assert.equal(fs.existsSync(ownedTemp), true);
    fs.unlinkSync(ownedTemp);
    const temps = fs.readdirSync(paDir).filter((name) => name.includes('.tmp'));
    assert.equal(temps.length, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('application CLI process failure is closed with empty stdout', () => {
  const root = makeTempRoot();
  try {
    seedObservations(root);
    const before = fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8');
    const malformed = '{bad-secret-input';
    const result = spawnSync(process.execPath, [APPLY_CLI], {
      cwd: root,
      input: malformed,
      shell: false,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(
      result.stderr,
      `APPLICATION_INPUT_PARSE: ${APPLICATION_ERROR_MESSAGES.APPLICATION_INPUT_PARSE}\n`,
    );
    assert.doesNotMatch(result.stderr, /bad-secret-input/);
    assert.doesNotMatch(result.stderr, /stack/i);
    assert.equal(result.stderr.split('\n').length, 2);
    assert.equal(fs.readFileSync(path.join(root, OBSERVATIONS_PATH), 'utf8'), before);
    const siblings = fs.readdirSync(path.join(root, '.product-authority'));
    assert.equal(siblings.some((name) => name.includes('.tmp')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
