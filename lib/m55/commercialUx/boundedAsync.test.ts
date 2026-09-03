import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReadinessDeadlineController,
  fetchJsonWithTimeout,
  type ReadinessDeadlineState,
} from './boundedAsync';

function fakeClock() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  const schedule = ((callback: () => void) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  }) as unknown as typeof setTimeout;
  const cancel = ((id: number) => callbacks.delete(id)) as unknown as typeof clearTimeout;
  return {
    schedule,
    cancel,
    pending: () => callbacks.size,
    fireNext() {
      const entry = callbacks.entries().next().value as [number, () => void] | undefined;
      if (!entry) return;
      callbacks.delete(entry[0]);
      entry[1]();
    },
  };
}

test('readiness controller covers ready, timeout, late ready, retry, and cancellation', () => {
  const clock = fakeClock();
  const states: ReadinessDeadlineState[] = [];
  const controller = createReadinessDeadlineController({
    timeoutMs: 12_000,
    onStateChange: (state) => states.push(state),
    schedule: clock.schedule,
    cancel: clock.cancel,
  });

  controller.start();
  assert.equal(controller.getState(), 'waiting');
  assert.equal(clock.pending(), 1);
  clock.fireNext();
  assert.equal(controller.getState(), 'timed_out');
  controller.setReady(true);
  assert.equal(controller.getState(), 'ready');
  assert.equal(clock.pending(), 0);
  controller.setReady(false);
  assert.equal(controller.getState(), 'waiting');
  controller.retry();
  assert.equal(clock.pending(), 1);
  controller.setReady(true);
  assert.equal(clock.pending(), 0);
  clock.fireNext();
  assert.equal(controller.getState(), 'ready');
  assert.deepEqual(states, ['waiting', 'timed_out', 'ready', 'waiting', 'waiting', 'ready']);
});

test('fetchJsonWithTimeout returns a successful consumed body', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 200 });
  try {
    const result = await fetchJsonWithTimeout<{ ok: boolean }>('/ready', {}, 25);
    assert.equal(result.response.ok, true);
    assert.deepEqual(result.data, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchJsonWithTimeout surfaces fetch failures', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  try {
    await assert.rejects(fetchJsonWithTimeout('/failure', {}, 25), TypeError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchJsonWithTimeout aborts a hanging fetch', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
  try {
    await assert.rejects(fetchJsonWithTimeout('/hang', {}, 5), { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchJsonWithTimeout also terminates when JSON body consumption hangs', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const response = new Response(null, { status: 200 });
    response.json = async () => new Promise<never>(() => {});
    return response;
  };
  try {
    await assert.rejects(fetchJsonWithTimeout('/body-hang', {}, 5), { name: 'AbortError' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
