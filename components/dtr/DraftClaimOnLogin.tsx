'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import {
  hasCompleteCanonicalProfile,
  ProfileRepository,
  promoteGuestProfileToClerkUser,
} from '../../lib/soul/profile';
import { promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import { applyServerDraftFreeAnswerSet } from '../../lib/m55/selfFunnel/applyServerDraftFreeAnswerSet';
import {
  readPersistedFunnel,
  writePersistedFunnel,
} from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import { isValidBasicInfo } from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';

type DraftMeResponse = {
  draft?: {
    nickname?: string;
    birthDate?: string;
    extraJson?: Record<string, unknown>;
  } | null;
};

/**
 * Post-login: device-local guest keys → Clerk user (OAuth 直後も同一ブラウザなら復元),
 * then cookie draft claim → DB draft /me で不足分を補完。
 * G3-03: complete extraJson.freeAnswerSet restores Personal Free result
 * when the device-local funnel snapshot is empty/incomplete.
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
        const meRes = await fetch('/api/dtr/draft/me', { credentials: 'include', cache: 'no-store' });
        if (!meRes.ok) {
          window.dispatchEvent(new Event('m55:profile_updated'));
          return;
        }
        const body = (await meRes.json()) as DraftMeResponse;
        const draft = body.draft;
        if (
          draft?.birthDate &&
          draft.nickname?.trim() &&
          !hasCompleteCanonicalProfile(userId)
        ) {
          ProfileRepository.save(userId, {
            nickname: draft.nickname.trim(),
            birthDate: draft.birthDate.slice(0, 10),
          });
        }
        const basic = ProfileRepository.get(userId);
        if (isValidBasicInfo(basic)) {
          const outcome = applyServerDraftFreeAnswerSet({
            extraJson: draft?.extraJson ?? null,
            persisted: readPersistedFunnel(),
            basic,
            serverDraft: draft
              ? { nickname: draft.nickname, birthDate: draft.birthDate }
              : null,
          });
          if (outcome.applied) {
            writePersistedFunnel(outcome.next);
          }
        }
        window.dispatchEvent(new Event('m55:profile_updated'));
      } catch {
        /* non-fatal */
      }
    })();
  }, [isLoaded, userId]);

  return null;
}
