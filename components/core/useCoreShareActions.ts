'use client';

import { useEffect, useRef, useState } from 'react';
import {
  assertSharePayloadPrivacySafe,
  resolveShareAbsoluteUrl,
  type PrivacySafeShareCardV1,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';

export type CoreShareStatus = 'idle' | 'copied' | 'cancelled' | 'error';

export function useCoreShareActions(card: PrivacySafeShareCardV1) {
  const [status, setStatus] = useState<CoreShareStatus>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.sharePreviewOpened,
      'core_share',
      `core-share-preview-${card.token}`,
    );
  }, [card.token]);

  function buildPayload() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = resolveShareAbsoluteUrl(card.sharePath, origin);
    const payload = { title: 'M55', text: card.shareTextJa, url };
    assertSharePayloadPrivacySafe(payload);
    return payload;
  }

  async function handleNativeShare() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const payload = buildPayload();
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        setStatus('error');
        setFallbackText(`${payload.text}\n${payload.url}`);
        return;
      }
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.nativeShareInvoked,
        'core_share',
        `core-native-share-${card.token}`,
      );
      await navigator.share(payload);
      setStatus('idle');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') {
        setStatus('cancelled');
      } else {
        setStatus('error');
        const payload = buildPayload();
        setFallbackText(`${payload.text}\n${payload.url}`);
      }
    } finally {
      busyRef.current = false;
    }
  }

  async function handleCopyLink() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    setFallbackText(null);
    try {
      const payload = buildPayload();
      const line = `${payload.text}\n${payload.url}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(line);
        trackFunnelActionOnce(
          M55_FUNNEL_EVENTS.shareLinkCopied,
          'core_share',
          `core-copy-link-${card.token}`,
        );
        setStatus('copied');
        return;
      }
      setStatus('error');
      setFallbackText(line);
    } catch {
      setStatus('error');
      const payload = buildPayload();
      setFallbackText(`${payload.text}\n${payload.url}`);
    } finally {
      busyRef.current = false;
    }
  }

  return {
    status,
    nativeAvailable,
    fallbackText,
    handleNativeShare,
    handleCopyLink,
    shareAbsoluteUrl: resolveShareAbsoluteUrl(
      card.sharePath,
      typeof window !== 'undefined' ? window.location.origin : undefined,
    ),
  };
}
