import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  DTR_DRAFT_SYNC_USER_COPY,
  getDtrDraftSyncState,
  queueDtrDraftSync,
  resetDtrDraftSyncStateForTest,
  retryDtrDraftSync,
  subscribeDtrDraftSync,
} from './dtrDraftClientSync';

const LOGGED_IN_USER = 'user_clerk_draft_sync_test';
const PROFILE = {
  nickname: 'sora',
  birthDate: '1990-01-15',
  extraJson: { freeAnswerSet: { q1: 'a1' } },
};

type FetchOutcome =
  | { kind: 'ok'; body?: { ok?: boolean } }
  | { kind: 'http_error'; status?: number }
  | { kind: 'reject'; error?: Error };

let fetchQueue: FetchOutcome[] = [];
let fetchCalls = 0;
let lastFetchBody: Record<string, unknown> | null = null;

function installBrowserGlobals(): void {
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, 'fetch', {
    value: async (_url: string, init?: RequestInit) => {
      fetchCalls += 1;
      if (init?.body && typeof init.body === 'string') {
        lastFetchBody = JSON.parse(init.body) as Record<string, unknown>;
      } else {
        lastFetchBody = null;
      }
      const next = fetchQueue.shift();
      if (!next) {
        throw new Error('fetch called without queued outcome');
      }
      if (next.kind === 'reject') {
        throw next.error ?? new Error('network failure');
      }
      if (next.kind === 'http_error') {
        return { ok: false, status: next.status ?? 500, json: async () => ({ error: 'draft_save_failed' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => next.body ?? { ok: true, draftId: 'draft-test-id' },
      };
    },
    configurable: true,
    writable: true,
  });
}

function queueFetch(outcome: FetchOutcome): void {
  fetchQueue.push(outcome);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('dtrDraftClientSync', () => {
  beforeEach(() => {
    fetchQueue = [];
    fetchCalls = 0;
    lastFetchBody = null;
    resetDtrDraftSyncStateForTest();
    installBrowserGlobals();
  });

  afterEach(() => {
    resetDtrDraftSyncStateForTest();
  });

  it('does not send clerkUserId in the POST body', async () => {
    queueFetch({ kind: 'ok' });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);
    assert.ok(lastFetchBody);
    assert.equal('clerkUserId' in lastFetchBody!, false);
    assert.equal(lastFetchBody!.nickname, PROFILE.nickname);
  });

  it('transitions logged-in sync through saving to saved on success', async () => {
    const seen: string[] = [];
    subscribeDtrDraftSync((state) => seen.push(state.status));

    queueFetch({ kind: 'ok' });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    assert.equal(getDtrDraftSyncState().status, 'saving');

    await sleep(0);
    assert.equal(getDtrDraftSyncState().status, 'saved');
    assert.ok(getDtrDraftSyncState().lastSavedAt);
    assert.deepEqual(seen, ['idle', 'saving', 'saved']);
  });

  it('does not expose saved state on HTTP failure', async () => {
    queueFetch({ kind: 'http_error', status: 500 });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);

    assert.equal(getDtrDraftSyncState().status, 'error');
    assert.equal(getDtrDraftSyncState().lastSavedAt, null);
  });

  it('does not expose saved state on non-ok JSON body', async () => {
    queueFetch({ kind: 'ok', body: { ok: false } });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);

    assert.equal(getDtrDraftSyncState().status, 'error');
    assert.equal(getDtrDraftSyncState().lastSavedAt, null);
  });

  it('does not expose saved state on network rejection', async () => {
    queueFetch({ kind: 'reject' });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);

    assert.equal(getDtrDraftSyncState().status, 'error');
    assert.equal(getDtrDraftSyncState().lastSavedAt, null);
  });

  it('retries the last failed logged-in payload and can recover to saved', async () => {
    queueFetch({ kind: 'http_error', status: 500 });
    queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);
    assert.equal(getDtrDraftSyncState().status, 'error');

    queueFetch({ kind: 'ok' });
    retryDtrDraftSync();
    assert.equal(getDtrDraftSyncState().status, 'saving');
    await sleep(0);
    assert.equal(getDtrDraftSyncState().status, 'saved');
    assert.equal(fetchCalls, 2);
  });

  it('does not swallow fetch failures silently', async () => {
    const source = await import('./dtrDraftClientSync');
    const moduleSource = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./dtrDraftClientSync.ts', import.meta.url), 'utf8'),
    );
    assert.doesNotMatch(moduleSource, /catch\s*\(\s*\)\s*\{\s*\/\*\s*fire-and-forget\s*\*\/\s*\}/);
    assert.doesNotMatch(moduleSource, /\.catch\(\(\)\s*=>\s*\{\s*\/\*\s*fire-and-forget\s*\*\/\s*\}\)/);

    queueFetch({ kind: 'reject' });
    source.queueDtrDraftSync(LOGGED_IN_USER, PROFILE);
    await sleep(0);
    assert.equal(source.getDtrDraftSyncState().status, 'error');
  });

  it('ignores stale completion when a newer save is in flight', async () => {
    let resolveFirst: (() => void) | undefined;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = () =>
        resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, draftId: 'stale' }),
        } as Response);
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: async () => {
        fetchCalls += 1;
        if (fetchCalls === 1) return first;
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'draft_save_failed' }),
        };
      },
      configurable: true,
      writable: true,
    });

    queueDtrDraftSync(LOGGED_IN_USER, { ...PROFILE, nickname: 'first' });
    queueDtrDraftSync(LOGGED_IN_USER, { ...PROFILE, nickname: 'second' });
    assert.equal(getDtrDraftSyncState().status, 'saving');

    resolveFirst?.();
    await sleep(0);
    assert.equal(getDtrDraftSyncState().status, 'error');
  });

  it('does not track guest cookie-only sync as remote saved state', async () => {
    queueFetch({ kind: 'ok' });
    queueDtrDraftSync(null, PROFILE);
    await sleep(0);

    assert.equal(getDtrDraftSyncState().status, 'idle');
    assert.equal(getDtrDraftSyncState().lastSavedAt, null);
  });

  it('uses calm Japanese user copy without technical error codes', () => {
    assert.match(DTR_DRAFT_SYNC_USER_COPY.savingJa, /保存/);
    assert.match(DTR_DRAFT_SYNC_USER_COPY.savedJa, /保存/);
    assert.match(DTR_DRAFT_SYNC_USER_COPY.failedJa, /失敗/);
    assert.match(DTR_DRAFT_SYNC_USER_COPY.retryJa, /再試行/);
    assert.doesNotMatch(JSON.stringify(DTR_DRAFT_SYNC_USER_COPY), /draft_save_failed/);
  });
});
