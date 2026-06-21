'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import {
  hasCompleteCanonicalProfile,
  ProfileRepository,
  promoteGuestProfileToClerkUser,
} from '../../lib/soul/profile';
import { promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';

/**
 * Post-login: device-local guest keys → Clerk user (OAuth 直後も同一ブラウザなら復元),
 * then cookie draft claim → DB draft /me で不足分を補完。
 */
export function DraftClaimOnLogin() {
  const { userId, isLoaded } = useAuth();
  const hydratedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      hydratedForUserRef.current = null;
      return;
    }
    if (hydratedForUserRef.current === userId) return;
    hydratedForUserRef.current = userId;

    if (!hasCompleteCanonicalProfile(userId)) {
      promoteGuestProfileToClerkUser(userId);
    }
    promoteGuestCoreSnapshotToClerkUser(userId);
    try {
      window.dispatchEvent(new Event('m55:profile_updated'));
    } catch {
      /* no-op */
    }

    void (async () => {
      try {
        await fetch('/api/dtr/draft/claim', { method: 'POST', credentials: 'include' });
        if (hasCompleteCanonicalProfile(userId)) {
          window.dispatchEvent(new Event('m55:profile_updated'));
          return;
        }
        const meRes = await fetch('/api/dtr/draft/me', { credentials: 'include', cache: 'no-store' });
        if (!meRes.ok) return;
        const body = (await meRes.json()) as { draft?: { nickname: string; birthDate: string } | null };
        if (body.draft?.birthDate && body.draft.nickname?.trim()) {
          ProfileRepository.save(userId, {
            nickname: body.draft.nickname.trim(),
            birthDate: body.draft.birthDate.slice(0, 10),
          });
        }
        window.dispatchEvent(new Event('m55:profile_updated'));
      } catch {
        /* non-fatal */
      }
    })();
  }, [isLoaded, userId]);

  return null;
}
