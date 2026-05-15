/**
 * Client-only: sync free profile intake to server draft (DB SSOT; cookie holds draft id).
 */
export type DtrDraftSyncPayload = {
  nickname: string;
  birthDate: string;
  extraJson?: Record<string, unknown>;
};

export function queueDtrDraftSync(userId: string | null, profile: DtrDraftSyncPayload): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/dtr/draft', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: profile.nickname,
      birthDate: profile.birthDate,
      extraJson: profile.extraJson,
      clerkUserId: userId ?? null,
    }),
  }).catch(() => {
    /* fire-and-forget */
  });
}
