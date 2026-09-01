import { useEffect, useState } from 'react';

export const M55_AUTH_READY_TIMEOUT_MS = 12_000;
export const M55_FETCH_TIMEOUT_MS = 15_000;

export type ReadinessDeadlineState = 'waiting' | 'ready' | 'timed_out';

export function createReadinessDeadlineController({
  timeoutMs,
  onStateChange,
  schedule = setTimeout,
  cancel = clearTimeout,
}: {
  timeoutMs: number;
  onStateChange: (state: ReadinessDeadlineState) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  let state: ReadinessDeadlineState = 'waiting';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearDeadline = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const publish = (next: ReadinessDeadlineState) => {
    state = next;
    onStateChange(next);
  };
  const start = () => {
    clearDeadline();
    publish('waiting');
    timer = schedule(() => {
      timer = null;
      publish('timed_out');
    }, timeoutMs);
  };

  return {
    start,
    retry: start,
    setReady(ready: boolean) {
      if (!ready) {
        start();
        return;
      }
      clearDeadline();
      publish('ready');
    },
    dispose: clearDeadline,
    getState: () => state,
  };
}

export function useBoundedReadiness(ready: boolean, timeoutMs = M55_AUTH_READY_TIMEOUT_MS) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready) {
      setTimedOut(false);
      return;
    }
    const controller = createReadinessDeadlineController({
      timeoutMs,
      onStateChange: (state) => setTimedOut(state === 'timed_out'),
    });
    controller.start();
    return controller.dispose;
  }, [ready, timeoutMs]);

  return { timedOut: !ready && timedOut };
}

export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = M55_FETCH_TIMEOUT_MS,
): Promise<{ response: Response; data: T }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException('request deadline exceeded', 'AbortError'));
    }, timeoutMs);
  });
  const requestAndBody = (async () => {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const data = await response.json() as T;
    return { response, data };
  })();
  try {
    return await Promise.race([requestAndBody, timeout]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
