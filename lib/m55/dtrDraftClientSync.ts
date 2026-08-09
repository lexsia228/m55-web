/**
 * Client-only: sync free profile intake to server draft (DB SSOT; cookie holds draft id).
 */
export type DtrDraftSyncPayload = {
  nickname: string;
  birthDate: string;
  extraJson?: Record<string, unknown>;
};

export type DtrDraftSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export type DtrDraftSyncState = {
  status: DtrDraftSyncStatus;
  /** Set only after a logged-in remote save succeeds. */
  lastSavedAt: number | null;
};

export const DTR_DRAFT_SYNC_USER_COPY = {
  savingJa: '回答を保存しています…',
  savedJa: '回答を保存しました',
  failedJa: '回答の保存に失敗しました。再試行できます。',
  retryJa: '再試行',
} as const;

type DraftSyncListener = (state: DtrDraftSyncState) => void;

const IDLE_STATE: DtrDraftSyncState = { status: 'idle', lastSavedAt: null };

let currentState: DtrDraftSyncState = IDLE_STATE;
const listeners = new Set<DraftSyncListener>();
let syncGeneration = 0;
let lastFailedPayload: { userId: string; profile: DtrDraftSyncPayload } | null = null;

function emitState(next: DtrDraftSyncState): void {
  currentState = next;
  for (const listener of listeners) {
    listener(currentState);
  }
}

export function getDtrDraftSyncState(): DtrDraftSyncState {
  return currentState;
}

export function subscribeDtrDraftSync(listener: DraftSyncListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function isLoggedInDraftSync(userId: string | null): userId is string {
  return typeof userId === 'string' && userId.length > 0;
}

async function performDraftSync(userId: string | null, profile: DtrDraftSyncPayload): Promise<void> {
  if (typeof window === 'undefined') return;

  const trackedRemote = isLoggedInDraftSync(userId);
  const generation = ++syncGeneration;

  if (trackedRemote) {
    emitState({ status: 'saving', lastSavedAt: currentState.lastSavedAt });
  }

  try {
    const response = await fetch('/api/dtr/draft', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: profile.nickname,
        birthDate: profile.birthDate,
        extraJson: profile.extraJson,
        clerkUserId: userId ?? null,
      }),
    });

    if (generation !== syncGeneration) return;

    if (!response.ok) {
      if (trackedRemote) {
        lastFailedPayload = { userId, profile };
        emitState({ status: 'error', lastSavedAt: currentState.lastSavedAt });
      }
      return;
    }

    const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (generation !== syncGeneration) return;

    if (!data?.ok) {
      if (trackedRemote) {
        lastFailedPayload = { userId, profile };
        emitState({ status: 'error', lastSavedAt: currentState.lastSavedAt });
      }
      return;
    }

    if (trackedRemote) {
      lastFailedPayload = null;
      emitState({ status: 'saved', lastSavedAt: Date.now() });
    }
  } catch {
    if (generation !== syncGeneration) return;
    if (trackedRemote) {
      lastFailedPayload = { userId, profile };
      emitState({ status: 'error', lastSavedAt: currentState.lastSavedAt });
    }
  }
}

export function queueDtrDraftSync(userId: string | null, profile: DtrDraftSyncPayload): void {
  void performDraftSync(userId, profile);
}

export function retryDtrDraftSync(): void {
  if (!lastFailedPayload) return;
  void performDraftSync(lastFailedPayload.userId, lastFailedPayload.profile);
}

/** Test-only reset — not for production callers. */
export function resetDtrDraftSyncStateForTest(): void {
  syncGeneration = 0;
  lastFailedPayload = null;
  emitState(IDLE_STATE);
}
