export type DtrDraftPostAuthorityInput = {
  clerkAuthUserId: string | null | undefined;
  /** Legacy body field — must never grant ownership when unauthenticated. */
  bodyClerkUserId?: string | null;
};

export type DtrDraftPostAuthorityMode = 'signed_in' | 'guest_cookie_only';

export type DtrDraftPostAuthorityResult = {
  /** Clerk-authenticated user id for DB draft ownership, or null for guest cookie-only. */
  userId: string | null;
  mode: DtrDraftPostAuthorityMode;
};

/**
 * Resolve POST /api/dtr/draft ownership from Clerk auth only.
 * Caller-supplied clerkUserId must never elevate an unauthenticated request.
 */
export function resolveDtrDraftPostAuthority(
  input: DtrDraftPostAuthorityInput,
): DtrDraftPostAuthorityResult {
  const authUserId =
    typeof input.clerkAuthUserId === 'string' && input.clerkAuthUserId.trim().length > 0
      ? input.clerkAuthUserId.trim()
      : null;

  if (authUserId) {
    return { userId: authUserId, mode: 'signed_in' };
  }

  return { userId: null, mode: 'guest_cookie_only' };
}
