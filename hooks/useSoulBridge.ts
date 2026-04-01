/**
 * M55 SOUL BRIDGE HOOK
 * Sends identity + plan (+ optional local profile) from React to Legacy iframe.
 * Security: strict targetOrigin (window.location.origin)
 */
import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { adaptClerkUserToLegacy } from '../lib/soul/adapter';
import { ProfileRepository } from '../lib/soul/profile';

type SoulSyncMessage = {
  type: 'M55_SOUL_SYNC';
  payload: any;
  timestamp: number;
};

export function useSoulBridge() {
  const { user, isLoaded } = useUser();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const buildMessage = (): SoulSyncMessage => {
      const legacyUser = adaptClerkUserToLegacy(user);
      const profile = ProfileRepository.get(user ? user.id : null);
      return {
        type: 'M55_SOUL_SYNC',
        payload: { ...legacyUser, profile },
        timestamp: Date.now(),
      };
    };

    const resolveTargetWindow = (): Window | null => {
      return iframeRef.current?.contentWindow
        || (document.querySelector('iframe') as HTMLIFrameElement | null)?.contentWindow
        || null;
    };

    const send = () => {
      const win = resolveTargetWindow();
      if (!win) return;
      const msg = buildMessage();
      win.postMessage(msg, window.location.origin); // NO '*'
    };

    send();
    if (iframeRef.current) iframeRef.current.onload = send;
    const t = window.setTimeout(send, 400);

    const onProfileUpdated = () => send();
    window.addEventListener('m55:profile_updated', onProfileUpdated);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('m55:profile_updated', onProfileUpdated);
      if (iframeRef.current) iframeRef.current.onload = null;
    };
  }, [user, isLoaded]);

  return iframeRef;
}