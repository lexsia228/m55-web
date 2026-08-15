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

/**
 * The real action URL stays inside href/copy/share payloads. Visible fallback UI
 * must never render it, so the share token, the `/r/` entry path and any absolute
 * URL are stripped before the text reaches the DOM.
 */
export function sanitizeVisibleShareFallbackText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\/r\/\S*/g, '')
        .replace(/\bs1-\d\b/g, '')
        .replace(/\bn1[a-z0-9]+\b/gi, '')
        .trimEnd(),
    )
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

function buildVisibleFallbackText(card: PrivacySafeShareCardV1): string {
  return sanitizeVisibleShareFallbackText(card.shareTextJa);
}

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
        setFallbackText(buildVisibleFallbackText(card));
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
        setFallbackText(buildVisibleFallbackText(card));
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
      setFallbackText(buildVisibleFallbackText(card));
    } catch {
      setStatus('error');
      setFallbackText(buildVisibleFallbackText(card));
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
