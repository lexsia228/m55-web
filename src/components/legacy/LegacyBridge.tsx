'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useCallback, useRef } from 'react';

const M55_BRIDGE_TYPE = 'M55_LEGACY_CONTEXT';

type BridgeContext = {
  plan: string;
  userId: string | null;
  timestamp: number;
};

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
}

function tryInjectShim(iframeRef: React.RefObject<HTMLIFrameElement | null>): void {
  if (typeof window === 'undefined' || !iframeRef?.current) return;
  try {
    const win = iframeRef.current.contentWindow as (Window & { __M55_BRIDGE_RX_INSTALLED__?: boolean }) | undefined;
    if (!win || win.location?.origin !== window.location.origin || win.__M55_BRIDGE_RX_INSTALLED__) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    const script = doc.createElement('script');
    script.textContent = `(function(){if(window.__M55_BRIDGE_RX_INSTALLED__)return;window.__M55_BRIDGE_RX_INSTALLED__=true;window.addEventListener("message",function(e){if(e.data&&e.data.type==="M55_LEGACY_CONTEXT")console.log("[M55 Legacy] Context received",e.data);});})();`;
    doc.documentElement?.appendChild(script);
    doc.documentElement?.removeChild(script);
  } catch {
    if (isDev()) console.warn('[M55 Bridge] Shim inject failed (cross-origin or restricted)');
  }
}

export function LegacyBridge({ iframeRef }: { iframeRef: React.RefObject<HTMLIFrameElement | null> }) {
  const { user, isLoaded } = useUser();

  const send = useCallback(() => {
    if (typeof window === 'undefined' || !iframeRef?.current?.contentWindow) return;

    const plan: string = (() => {
      if (!isLoaded) return 'anonymous';
      if (!user) return 'anonymous';
      const meta = user.publicMetadata?.plan;
      return typeof meta === 'string' ? meta : 'free';
    })();

    const userId: string | null = user?.id ?? null;
    const ctx: BridgeContext = { plan, userId, timestamp: Date.now() };
    const targetOrigin = window.location.origin;

    try {
      iframeRef.current.contentWindow.postMessage(
        { type: M55_BRIDGE_TYPE, ...ctx },
        targetOrigin
      );
      if (isDev()) {
        console.log('[M55 Bridge] Sent', { plan, userId });
      }
    } catch (e) {
      if (isDev()) {
        console.warn('[M55 Bridge] postMessage failed', e);
      }
    }
  }, [user, isLoaded, iframeRef]);

  useEffect(() => {
    if (!iframeRef?.current) return;
    send();
  }, [iframeRef?.current, isLoaded, user?.id, user?.publicMetadata?.plan, send]);

  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const onLoad = () => {
      tryInjectShim(iframeRef);
      send();
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [iframeRef, send]);

  return null;
}
