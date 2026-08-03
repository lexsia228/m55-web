import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  buildValidatedResultFromResponse,
  createHttpsRequest,
  decodeUtf8Fatal,
  formatObserverFailureLine,
  formatObserverSuccessLine,
  observeProductionDiagnostics,
} from '../observe-production-diagnostics.mjs';
import {
  OBSERVER_CONNECT_TIMEOUT_MS,
  OBSERVER_RESPONSE_BODY_LIMIT_BYTES,
  OBSERVER_TOTAL_TIMEOUT_MS,
  PRODUCTION_DIAGNOSTICS_ENDPOINT,
  PRODUCTION_DIAGNOSTICS_METHOD,
} from '../production-observation-contract.mjs';

/** @param {Promise<unknown>} promise @param {string} code */
async function expectErrorCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, code);
    return true;
  });
}

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const T = '2026-08-02T06:00:00.000Z';
const OBSERVER_SOURCE_MARKER = 'observe-production-diagnostics.mjs';

/** @param {EventEmitter} res */
function installTransportErrorSink(res) {
  res.on('error', () => {});
}

/** @returns {{ count: () => number; snapshot: () => number; restore: () => void }} */
function createProductionBufferFromCounter() {
  const originalBufferFrom = Buffer.from;
  let productionBufferFromCount = 0;
  Buffer.from = (...args) => {
    const stack = new Error().stack ?? '';
    if (stack.includes(OBSERVER_SOURCE_MARKER)) {
      productionBufferFromCount += 1;
    }
    return originalBufferFrom(...args);
  };
  return {
    count: () => productionBufferFromCount,
    snapshot: () => productionBufferFromCount,
    restore: () => {
      Buffer.from = originalBufferFrom;
    },
  };
}

/**
 * @param {Buffer} backing
 * @returns {{ chunk: Buffer; sizeAccessCount: () => number }}
 */
function createInstrumentedSizeChunk(backing) {
  let sizeAccessCount = 0;
  const chunk = new Proxy(backing, {
    get(target, prop) {
      if (prop === 'length' || prop === 'byteLength') {
        sizeAccessCount += 1;
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return {
    chunk: /** @type {Buffer} */ (chunk),
    backing,
    sizeAccessCount: () => sizeAccessCount,
  };
}

/**
 * @param {EventEmitter} res
 * @returns {{ productionHandlerInvocations: () => number; productionHandlersAttached: () => boolean }}
 */
function instrumentProductionResponseHandlers(res) {
  let productionHandlerInvocations = 0;
  let productionHandlersAttached = false;
  const originalOn = res.on.bind(res);
  res.on = (event, handler) => {
    if (event === 'data' || event === 'end' || event === 'error') {
      productionHandlersAttached = true;
      return originalOn(event, (...args) => {
        productionHandlerInvocations += 1;
        return handler(...args);
      });
    }
    return originalOn(event, handler);
  };
  return {
    productionHandlerInvocations: () => productionHandlerInvocations,
    productionHandlersAttached: () => productionHandlersAttached,
  };
}

/** @param {{ onRequest?: (ctx: FakeRequestContext) => void; skipAutoCallback?: boolean }) => void}} options */
function createFakeHttpsModule(options = {}) {
  let requestCount = 0;
  const module = {
    request(/** @type {Record<string, unknown>} */ httpsOptions, /** @type {(res: EventEmitter) => void} */ callback) {
      requestCount += 1;
      const req = /** @type {EventEmitter & { destroy: () => void; end: () => void; destroyCount: number }} */ (
        new EventEmitter()
      );
      req.destroyCount = 0;
      req.destroy = () => {
        req.destroyCount += 1;
        req.emit('close');
      };
      req.end = () => {};

      const res = /** @type {EventEmitter & { statusCode: number; headers: Record<string, string>; destroy: () => void; destroyCount: number }} */ (
        new EventEmitter()
      );
      res.statusCode = 200;
      res.headers = { 'content-type': 'application/json; charset=utf-8' };
      res.destroyCount = 0;
      res.destroy = () => {
        res.destroyCount += 1;
      };

      options.onRequest?.({
        req,
        res,
        httpsOptions,
        requestCount,
        invokeResponse: () => {
          if (callback) {
            callback(res);
          }
        },
      });
      if (callback && !options.skipAutoCallback) {
        callback(res);
      }
      return req;
    },
    getRequestCount: () => requestCount,
  };
  return module;
}

/** @returns {{ setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout; connectCallbacks: Array<() => void>; totalCallbacks: Array<() => void>; cleared: number[]; setCount: number }} */
function createTimerHarness() {
  /** @type {Array<() => void>} */
  const connectCallbacks = [];
  /** @type {Array<() => void>} */
  const totalCallbacks = [];
  /** @type {number[]} */
  const cleared = [];
  let nextId = 1;
  let setCount = 0;
  return {
    connectCallbacks,
    totalCallbacks,
    cleared,
    get setCount() {
      return setCount;
    },
    setTimeout: (fn, ms) => {
      setCount += 1;
      const id = nextId++;
      if (ms === OBSERVER_CONNECT_TIMEOUT_MS) {
        connectCallbacks.push(fn);
      } else if (ms === OBSERVER_TOTAL_TIMEOUT_MS) {
        totalCallbacks.push(fn);
      }
      return id;
    },
    clearTimeout: (id) => {
      cleared.push(id);
    },
  };
}

/** @returns {Record<string, string>} */
function validDiagnostics(overrides = {}) {
  return {
    vercel_env: 'production',
    vercel_git_sha: SHA,
    vercel_branch: 'main',
    node_env: 'production',
    ...overrides,
  };
}

/** @param {Record<string, unknown>} [overrides] */
function validResponse(overrides = {}) {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: Buffer.from(JSON.stringify(validDiagnostics()), 'utf8'),
    effectiveUrl: PRODUCTION_DIAGNOSTICS_ENDPOINT,
    ...overrides,
  };
}

test('valid HTTP 200 observation succeeds with canonical stdout', async () => {
  const validated = await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => validResponse(),
  });
  assert.equal(validated.diagnostics.vercel_git_sha, SHA);
  const stdout = formatObserverSuccessLine(validated);
  assert.match(stdout, /^\{.*\}\n$/);
  assert.equal(stdout.split('\n').length, 2);
});

test('redirect is rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => validResponse({ statusCode: 302 }),
    }),
    'OBSERVER_REDIRECT',
  );
});

test('non-200 is rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => validResponse({ statusCode: 503 }),
    }),
    'OBSERVER_HTTP_STATUS',
  );
});

test('body cap overflow is rejected', async () => {
  const oversized = 'x'.repeat(OBSERVER_RESPONSE_BODY_LIMIT_BYTES + 1);
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(oversized, 'utf8'),
        }),
    }),
    'OBSERVER_BODY_TOO_LARGE',
  );
});

test('invalid content type is rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          headers: { 'content-type': 'text/plain' },
        }),
    }),
    'OBSERVER_CONTENT_TYPE',
  );
});

test('accepted content type variants pass', () => {
  const validated = buildValidatedResultFromResponse(
    validResponse({ headers: { 'content-type': 'application/json' } }),
    T,
  );
  assert.equal(validated.diagnostics.vercel_git_sha, SHA);
});

test('malformed JSON is rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from('{not-json', 'utf8'),
        }),
    }),
    'OBSERVER_BODY_JSON',
  );
});

test('missing and additional diagnostics keys are rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(JSON.stringify({ vercel_env: 'production' }), 'utf8'),
        }),
    }),
    'OBSERVER_BODY_KEYS',
  );
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(
            JSON.stringify({ ...validDiagnostics(), extra: 'nope' }),
            'utf8',
          ),
        }),
    }),
    'OBSERVER_BODY_KEYS',
  );
});

test('wrong environment branch and node_env values are rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(JSON.stringify(validDiagnostics({ vercel_env: 'preview' })), 'utf8'),
        }),
    }),
    'OBSERVER_BODY_VALUE',
  );
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(JSON.stringify(validDiagnostics({ vercel_branch: 'dev' })), 'utf8'),
        }),
    }),
    'OBSERVER_BODY_VALUE',
  );
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(JSON.stringify(validDiagnostics({ node_env: 'development' })), 'utf8'),
        }),
    }),
    'OBSERVER_BODY_VALUE',
  );
});

test('uppercase and short SHA values are rejected', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(
            JSON.stringify(validDiagnostics({ vercel_git_sha: SHA.toUpperCase() })),
            'utf8',
          ),
        }),
    }),
    'OBSERVER_BODY_VALUE',
  );
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({
          body: Buffer.from(
            JSON.stringify(validDiagnostics({ vercel_git_sha: 'abc' })),
            'utf8',
          ),
        }),
    }),
    'OBSERVER_BODY_VALUE',
  );
});

test('failure output uses closed-code stderr and empty success path', () => {
  const formatted = formatObserverFailureLine(
    Object.assign(new Error('secret raw body'), { code: 'OBSERVER_HTTP_STATUS' }),
  );
  assert.match(formatted, /^OBSERVER_HTTP_STATUS: Expected HTTP 200$/);
  assert.doesNotMatch(formatted, /secret raw body/);
});

test('arbitrary injected observer codes map to OBSERVER_INTERNAL', async () => {
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => {
        const error = new Error('injected secret');
        /** @type {Record<string, unknown>} */ (error).code = 'OBSERVER_CUSTOM_INJECTED';
        throw error;
      },
    }),
    'OBSERVER_INTERNAL',
  );
});

test('exact 4096-byte body is accepted and 4097-byte body is rejected', async () => {
  const prefix = `{"vercel_env":"production","vercel_git_sha":"${SHA}","vercel_branch":"main","node_env":"production"`;
  const suffix = '}';
  const padLength = OBSERVER_RESPONSE_BODY_LIMIT_BYTES - Buffer.byteLength(`${prefix}${suffix}`, 'utf8');
  const exactBody = `${prefix}${' '.repeat(Math.max(0, padLength))}${suffix}`;
  assert.equal(Buffer.byteLength(exactBody, 'utf8'), OBSERVER_RESPONSE_BODY_LIMIT_BYTES);
  const validated = await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => validResponse({ body: Buffer.from(exactBody, 'utf8') }),
  });
  assert.equal(validated.diagnostics.vercel_git_sha, SHA);
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () =>
        validResponse({ body: Buffer.from(`${exactBody}x`, 'utf8') }),
    }),
    'OBSERVER_BODY_TOO_LARGE',
  );
});

test('malformed UTF-8 is rejected fatally', () => {
  assert.throws(() => decodeUtf8Fatal(Buffer.from([0xff, 0xfe, 0xfd])), (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, 'OBSERVER_BODY_DECODE');
    return true;
  });
});

test('non-object JSON payloads are rejected', async () => {
  for (const body of ['[]', '"x"', '1', 'null']) {
    await expectErrorCode(
      observeProductionDiagnostics({
        now: () => T,
        requestFactory: async () => validResponse({ body: Buffer.from(body, 'utf8') }),
      }),
      body === '[]' ? 'OBSERVER_BODY_SHAPE' : 'OBSERVER_BODY_SHAPE',
    );
  }
});

test('duplicate JSON keys use last-key-wins without rejection', async () => {
  const body = `{"vercel_env":"preview","vercel_git_sha":"${SHA}","vercel_branch":"main","node_env":"production","vercel_env":"production"}`;
  const validated = await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => validResponse({ body: Buffer.from(body, 'utf8') }),
  });
  assert.equal(validated.diagnostics.vercel_env, 'production');
});

test('instrumented transport uses GET agent:false and one request only', async () => {
  /** @type {Record<string, unknown> | undefined} */
  let capturedOptions;
  const fakeHttps = createFakeHttpsModule({
    onRequest: ({ res, httpsOptions }) => {
      capturedOptions = httpsOptions;
      const body = Buffer.from(JSON.stringify(validDiagnostics()), 'utf8');
      queueMicrotask(() => {
        res.emit('data', body);
        res.emit('end');
      });
    },
  });
  let requestFactoryCalls = 0;
  await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => {
      requestFactoryCalls += 1;
      return createHttpsRequest(() => T, { https: fakeHttps });
    },
  });
  assert.equal(requestFactoryCalls, 1);
  assert.equal(fakeHttps.getRequestCount(), 1);
  assert.equal(capturedOptions?.method, PRODUCTION_DIAGNOSTICS_METHOD);
  assert.equal(capturedOptions?.agent, false);
});

test('connect timeout ignores late response callback and post-settlement bytes', async () => {
  const timers = createTimerHarness();
  /** @type {EventEmitter & { destroy: () => void; destroyCount: number } | undefined} */
  let req;
  /** @type {EventEmitter & { destroy: () => void; destroyCount: number } | undefined} */
  let res;
  /** @type {(() => void) | undefined} */
  let invokeLateResponse;
  /** @type {ReturnType<typeof instrumentProductionResponseHandlers> | undefined} */
  let handlerInstrumentation;
  let settlementCount = 0;
  let productionCallbackInvocations = 0;
  const bufferFromCounter = createProductionBufferFromCounter();
  const fakeHttps = createFakeHttpsModule({
    skipAutoCallback: true,
    onRequest: (ctx) => {
      req = ctx.req;
      res = ctx.res;
      installTransportErrorSink(res);
      handlerInstrumentation = instrumentProductionResponseHandlers(res);
      invokeLateResponse = () => {
        productionCallbackInvocations += 1;
        ctx.invokeResponse();
      };
    },
  });
  const pending = observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () =>
      createHttpsRequest(() => T, {
        https: fakeHttps,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      }),
  });
  pending.catch(() => {
    settlementCount += 1;
  });
  assert.equal(timers.setCount, 2);
  assert.equal(timers.connectCallbacks.length, 1);
  assert.equal(fakeHttps.getRequestCount(), 1);
  timers.connectCallbacks[0]();
  await expectErrorCode(pending, 'OBSERVER_CONNECT_TIMEOUT');
  assert.equal(settlementCount, 1);
  assert.equal(req?.destroyCount, 1);
  assert.equal(res?.destroyCount, 0);
  const bufferFromAtSettle = bufferFromCounter.snapshot();
  invokeLateResponse?.();
  assert.equal(productionCallbackInvocations, 1);
  assert.equal(handlerInstrumentation?.productionHandlersAttached(), false);
  assert.equal(handlerInstrumentation?.productionHandlerInvocations(), 0);
  res?.emit('data', Buffer.from('late-data-chunk'));
  res?.emit('end');
  res?.emit('error', new Error('late response error'));
  res?.emit('close');
  req?.emit('error', new Error('late request error'));
  req?.emit('close');
  timers.totalCallbacks[0]?.();
  assert.equal(handlerInstrumentation?.productionHandlerInvocations(), 0);
  assert.equal(bufferFromCounter.count(), bufferFromAtSettle);
  assert.equal(req?.destroyCount, 1);
  assert.equal(res?.destroyCount, 0);
  assert.equal(settlementCount, 1);
  assert.equal(timers.cleared.length, 2);
  await assert.rejects(pending, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, 'OBSERVER_CONNECT_TIMEOUT');
    return true;
  });
  bufferFromCounter.restore();
});

test('total timeout ignores post-settlement data end error close and repeated timer', async () => {
  const timers = createTimerHarness();
  /** @type {EventEmitter & { destroy: () => void; destroyCount: number } | undefined} */
  let req;
  /** @type {EventEmitter & { destroy: () => void; destroyCount: number } | undefined} */
  let res;
  const fakeHttps = createFakeHttpsModule({
    skipAutoCallback: true,
    onRequest: ({ req: fakeReq, res: fakeRes, invokeResponse }) => {
      req = fakeReq;
      res = fakeRes;
      queueMicrotask(() => {
        fakeReq.emit('socket', {
          once(event, handler) {
            if (event === 'connect') {
              handler();
            }
          },
        });
        invokeResponse();
        fakeRes.emit('data', Buffer.from('partial'));
      });
    },
  });
  const settleMarker = { settled: false };
  const pending = observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () =>
      createHttpsRequest(() => T, {
        https: fakeHttps,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      }),
  }).finally(() => {
    settleMarker.settled = true;
  });
  await new Promise((resolve) => queueMicrotask(resolve));
  timers.totalCallbacks[0]();
  await expectErrorCode(pending, 'OBSERVER_TOTAL_TIMEOUT');
  assert.equal(req?.destroyCount, 1);
  const responseDestroyAtSettle = res?.destroyCount ?? 0;
  assert.equal(responseDestroyAtSettle, 1);
  res?.emit('data', Buffer.from('late'));
  res?.emit('end');
  res?.emit('error', new Error('late response'));
  res?.emit('close');
  req?.emit('close');
  timers.totalCallbacks[0]?.();
  assert.equal(req?.destroyCount, 1);
  assert.equal(res?.destroyCount, responseDestroyAtSettle);
  assert.equal(timers.cleared.length, 2);
});

test('streaming 4096 bytes in chunks accepted and 4097 rejected with single destroy', async () => {
  const prefix = `{"vercel_env":"production","vercel_git_sha":"${SHA}","vercel_branch":"main","node_env":"production"`;
  const suffix = '}';
  const padLength = OBSERVER_RESPONSE_BODY_LIMIT_BYTES - Buffer.byteLength(`${prefix}${suffix}`, 'utf8');
  const exactBody = Buffer.from(`${prefix}${' '.repeat(Math.max(0, padLength))}${suffix}`, 'utf8');
  assert.equal(exactBody.length, OBSERVER_RESPONSE_BODY_LIMIT_BYTES);

  const fakeHttps = createFakeHttpsModule({
    onRequest: ({ res }) => {
      queueMicrotask(() => {
        res.emit('data', exactBody.subarray(0, 1024));
        res.emit('data', exactBody.subarray(1024, 2048));
        res.emit('data', exactBody.subarray(2048, 3072));
        res.emit('data', exactBody.subarray(3072));
        res.emit('end');
      });
    },
  });
  await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => createHttpsRequest(() => T, { https: fakeHttps }),
  });

  let requestDestroyCount = 0;
  let responseDestroyCount = 0;
  let settlementCount = 0;
  /** @type {EventEmitter | undefined} */
  let overflowRes;
  /** @type {(() => void) | undefined} */
  let invokeOverflowResponse;
  const overflowHttps = createFakeHttpsModule({
    skipAutoCallback: true,
    onRequest: ({ req, res, invokeResponse }) => {
      overflowRes = res;
      invokeOverflowResponse = invokeResponse;
      installTransportErrorSink(res);
      req.destroy = () => {
        requestDestroyCount += 1;
      };
      res.destroy = () => {
        responseDestroyCount += 1;
      };
    },
  });
  const overflowPending = observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () => createHttpsRequest(() => T, { https: overflowHttps }),
  });
  overflowPending.catch(() => {
    settlementCount += 1;
  });
  await new Promise((resolve) => queueMicrotask(resolve));
  invokeOverflowResponse?.();
  assert.equal(overflowRes?.listenerCount('data'), 1);
  const positiveControl = createInstrumentedSizeChunk(Buffer.from('ctrl'));
  assert.equal(overflowRes?.emit('data', positiveControl.chunk), true);
  assert.ok(positiveControl.sizeAccessCount() >= 1);
  assert.equal(settlementCount, 0);
  const positiveControlBytes = positiveControl.backing.length;
  const bytesBeforeOverflowTrigger =
    OBSERVER_RESPONSE_BODY_LIMIT_BYTES - positiveControlBytes;
  assert.equal(
    overflowRes?.emit('data', exactBody.subarray(0, bytesBeforeOverflowTrigger)),
    true,
  );
  assert.equal(settlementCount, 0);
  const overflowTrigger = createInstrumentedSizeChunk(Buffer.from('x'));
  assert.equal(overflowRes?.emit('data', overflowTrigger.chunk), true);
  assert.ok(overflowTrigger.sizeAccessCount() >= 1);
  await expectErrorCode(overflowPending, 'OBSERVER_BODY_TOO_LARGE');
  assert.equal(settlementCount, 1);
  assert.equal(requestDestroyCount, 1);
  const requestDestroyBeforeLateEvents = requestDestroyCount;
  const responseDestroyBeforeLateEvents = responseDestroyCount;
  assert.equal(overflowRes?.listenerCount('data'), 1);
  const lateChunkOne = createInstrumentedSizeChunk(Buffer.from('late-one'));
  const lateChunkTwo = createInstrumentedSizeChunk(Buffer.from('late-two-chunk'));
  const lateEmitResults = [
    overflowRes?.emit('data', lateChunkOne.chunk),
    overflowRes?.emit('data', lateChunkTwo.chunk),
  ];
  assert.deepEqual(lateEmitResults, [true, true]);
  assert.equal(lateChunkOne.sizeAccessCount(), 0);
  assert.equal(lateChunkTwo.sizeAccessCount(), 0);
  overflowRes?.emit('end');
  overflowRes?.emit('error', new Error('late overflow error'));
  overflowRes?.emit('close');
  assert.equal(settlementCount, 1);
  assert.equal(requestDestroyCount, requestDestroyBeforeLateEvents);
  assert.equal(responseDestroyCount, responseDestroyBeforeLateEvents);
  await assert.rejects(overflowPending, (error) => {
    assert.equal(/** @type {{ code?: string }} */ (error).code, 'OBSERVER_BODY_TOO_LARGE');
    return true;
  });
});

test('terminal transport paths clear both timers exactly once', async () => {
  /** @type {Array<{ name: string; run: (timers: ReturnType<typeof createTimerHarness>) => Promise<void> }>} */
  const cases = [
    {
      name: 'success',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          onRequest: ({ res }) => {
            queueMicrotask(() => {
              res.emit('data', Buffer.from(JSON.stringify(validDiagnostics()), 'utf8'));
              res.emit('end');
            });
          },
        });
        await observeProductionDiagnostics({
          now: () => T,
          requestFactory: async () =>
            createHttpsRequest(() => T, {
              https: fakeHttps,
              setTimeout: timers.setTimeout,
              clearTimeout: timers.clearTimeout,
            }),
        });
      },
    },
    {
      name: 'request error',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          skipAutoCallback: true,
          onRequest: ({ req }) => {
            queueMicrotask(() => req.emit('error', new Error('request failed')));
          },
        });
        await expectErrorCode(
          observeProductionDiagnostics({
            now: () => T,
            requestFactory: async () =>
              createHttpsRequest(() => T, {
                https: fakeHttps,
                setTimeout: timers.setTimeout,
                clearTimeout: timers.clearTimeout,
              }),
          }),
          'OBSERVER_REQUEST_FAILED',
        );
      },
    },
    {
      name: 'response error',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          onRequest: ({ res }) => {
            queueMicrotask(() => res.emit('error', new Error('response failed')));
          },
        });
        await expectErrorCode(
          observeProductionDiagnostics({
            now: () => T,
            requestFactory: async () =>
              createHttpsRequest(() => T, {
                https: fakeHttps,
                setTimeout: timers.setTimeout,
                clearTimeout: timers.clearTimeout,
              }),
          }),
          'OBSERVER_REQUEST_FAILED',
        );
      },
    },
    {
      name: 'connect timeout',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({ skipAutoCallback: true, onRequest: () => {} });
        const pending = observeProductionDiagnostics({
          now: () => T,
          requestFactory: async () =>
            createHttpsRequest(() => T, {
              https: fakeHttps,
              setTimeout: timers.setTimeout,
              clearTimeout: timers.clearTimeout,
            }),
        });
        timers.connectCallbacks[0]?.();
        await expectErrorCode(pending, 'OBSERVER_CONNECT_TIMEOUT');
      },
    },
    {
      name: 'total timeout',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          skipAutoCallback: true,
          onRequest: ({ req, res }) => {
            queueMicrotask(() => {
              req.emit('socket', { once: (event, handler) => event === 'connect' && handler() });
              res.emit('data', Buffer.from('partial'));
            });
          },
        });
        const pending = observeProductionDiagnostics({
          now: () => T,
          requestFactory: async () =>
            createHttpsRequest(() => T, {
              https: fakeHttps,
              setTimeout: timers.setTimeout,
              clearTimeout: timers.clearTimeout,
            }),
        });
        timers.totalCallbacks[0]?.();
        await expectErrorCode(pending, 'OBSERVER_TOTAL_TIMEOUT');
      },
    },
    {
      name: 'body overflow',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          onRequest: ({ res }) => {
            queueMicrotask(() => res.emit('data', Buffer.alloc(OBSERVER_RESPONSE_BODY_LIMIT_BYTES + 1, 97)));
          },
        });
        await expectErrorCode(
          observeProductionDiagnostics({
            now: () => T,
            requestFactory: async () =>
              createHttpsRequest(() => T, {
                https: fakeHttps,
                setTimeout: timers.setTimeout,
                clearTimeout: timers.clearTimeout,
              }),
          }),
          'OBSERVER_BODY_TOO_LARGE',
        );
      },
    },
    {
      name: 'malformed UTF-8',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          onRequest: ({ res }) => {
            queueMicrotask(() => {
              res.emit('data', Buffer.from([0xff, 0xfe, 0xfd]));
              res.emit('end');
            });
          },
        });
        await expectErrorCode(
          observeProductionDiagnostics({
            now: () => T,
            requestFactory: async () =>
              createHttpsRequest(() => T, {
                https: fakeHttps,
                setTimeout: timers.setTimeout,
                clearTimeout: timers.clearTimeout,
              }),
          }),
          'OBSERVER_BODY_DECODE',
        );
      },
    },
    {
      name: 'malformed JSON',
      run: async (timers) => {
        const fakeHttps = createFakeHttpsModule({
          onRequest: ({ res }) => {
            queueMicrotask(() => {
              res.emit('data', Buffer.from('{not-json', 'utf8'));
              res.emit('end');
            });
          },
        });
        await expectErrorCode(
          observeProductionDiagnostics({
            now: () => T,
            requestFactory: async () =>
              createHttpsRequest(() => T, {
                https: fakeHttps,
                setTimeout: timers.setTimeout,
                clearTimeout: timers.clearTimeout,
              }),
          }),
          'OBSERVER_BODY_JSON',
        );
      },
    },
  ];

  for (const testCase of cases) {
    const timers = createTimerHarness();
    await testCase.run(timers);
    assert.equal(timers.setCount, 2, `${testCase.name} setCount`);
    assert.equal(timers.cleared.length, 2, `${testCase.name} cleared`);
    assert.equal(timers.connectCallbacks.length, 1, `${testCase.name} connectCallbacks`);
    assert.equal(timers.totalCallbacks.length, 1, `${testCase.name} totalCallbacks`);
  }
});

test('request error followed by close settles once', async () => {
  const fakeHttps = createFakeHttpsModule({
    skipAutoCallback: true,
    onRequest: ({ req }) => {
      queueMicrotask(() => {
        req.emit('error', new Error('native request failure'));
        req.emit('close');
      });
    },
  });
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => createHttpsRequest(() => T, { https: fakeHttps }),
    }),
    'OBSERVER_REQUEST_FAILED',
  );
});

test('response error followed by end settles once without changing code', async () => {
  const fakeHttps = createFakeHttpsModule({
    onRequest: ({ res }) => {
      queueMicrotask(() => {
        res.emit('error', new Error('native response failure'));
        res.emit('end');
      });
    },
  });
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => createHttpsRequest(() => T, { https: fakeHttps }),
    }),
    'OBSERVER_REQUEST_FAILED',
  );
});

test('success clears both timers', async () => {
  const timers = createTimerHarness();
  const fakeHttps = createFakeHttpsModule({
    onRequest: ({ res }) => {
      queueMicrotask(() => {
        res.emit('data', Buffer.from(JSON.stringify(validDiagnostics()), 'utf8'));
        res.emit('end');
      });
    },
  });
  await observeProductionDiagnostics({
    now: () => T,
    requestFactory: async () =>
      createHttpsRequest(() => T, {
        https: fakeHttps,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      }),
  });
  assert.equal(timers.cleared.length, 2);
});

test('malformed UTF-8 in streaming body is rejected', async () => {
  const fakeHttps = createFakeHttpsModule({
    onRequest: ({ res }) => {
      queueMicrotask(() => {
        res.emit('data', Buffer.from([0xff, 0xfe, 0xfd]));
        res.emit('end');
      });
    },
  });
  await expectErrorCode(
    observeProductionDiagnostics({
      now: () => T,
      requestFactory: async () => createHttpsRequest(() => T, { https: fakeHttps }),
    }),
    'OBSERVER_BODY_DECODE',
  );
});

test('observer CLI failure stderr is one closed line without secret text', () => {
  const formatted = formatObserverFailureLine(
    Object.assign(new Error('secret raw body'), { code: 'OBSERVER_HTTP_STATUS' }),
  );
  assert.equal(formatted, 'OBSERVER_HTTP_STATUS: Expected HTTP 200');
  const injected = formatObserverFailureLine(
    Object.assign(new Error('stack\nsecret'), { code: 'OBSERVER_CUSTOM' }),
  );
  assert.equal(injected, 'OBSERVER_INTERNAL: Observer failed');
  assert.doesNotMatch(injected, /secret/);
});

test('wrong field types for every route key are rejected', async () => {
  for (const key of ['vercel_env', 'vercel_git_sha', 'vercel_branch', 'node_env']) {
    const diagnostics = validDiagnostics({ [key]: 123 });
    await expectErrorCode(
      observeProductionDiagnostics({
        now: () => T,
        requestFactory: async () =>
          validResponse({ body: Buffer.from(JSON.stringify(diagnostics), 'utf8') }),
      }),
      'OBSERVER_BODY_TYPE',
    );
  }
});
