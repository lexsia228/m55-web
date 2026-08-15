'use client';

import { useEffect, useRef, useState } from 'react';
import {
  assertSharePayloadPrivacySafe,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import type { PublicShareSpecV1 } from '../../lib/m55/narrative/publicShareSpecV1';
import { buildXShareIntentUrl } from '../../lib/m55/narrative/xShareIntentV1';
import { sanitizeVisibleShareFallbackText } from '../core/useCoreShareActions';
import styles from './NarrativeShare.module.css';

type Status = 'idle' | 'copied' | 'cancelled' | 'error';

export default function NarrativeShareActions({
  spec,
  surface,
  requirePreviewAck = false,
}: {
  spec: PublicShareSpecV1;
  surface: 'core_share' | 'compatibility_guest' | 'compatibility_paid_report' | 'dtr_saved_report';
  requirePreviewAck?: boolean;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [previewAck, setPreviewAck] = useState(!requirePreviewAck);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
    setPreviewAck(!requirePreviewAck);
  }, [requirePreviewAck, spec.token]);

  function payload() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin ? `${origin.replace(/\/$/, '')}${spec.sharePath}` : spec.canonicalUrl;
    const next = { title: 'M55' as const, text: spec.shareTextJa, url };
    assertSharePayloadPrivacySafe(next);
    return next;
  }

  async function handleNative() {
    if (!previewAck || busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const next = payload();
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        setStatus('error');
        setFallbackText(sanitizeVisibleShareFallbackText(spec.shareTextJa));
        return;
      }
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.nativeShareInvoked,
        surface,
        `narrative-native-${spec.token}`,
      );
      await navigator.share(next);
      setStatus('idle');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setStatus(name === 'AbortError' ? 'cancelled' : 'error');
      if (name !== 'AbortError') {
        setFallbackText(sanitizeVisibleShareFallbackText(spec.shareTextJa));
      }
    } finally {
      busyRef.current = false;
    }
  }

  async function handleCopy() {
    if (!previewAck || busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const next = payload();
      const line = `${next.text}\n${next.url}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(line);
        trackFunnelActionOnce(
          M55_FUNNEL_EVENTS.shareLinkCopied,
          surface,
          `narrative-copy-${spec.token}`,
        );
        setStatus('copied');
        return;
      }
      setStatus('error');
      setFallbackText(sanitizeVisibleShareFallbackText(spec.shareTextJa));
    } catch {
      setStatus('error');
      setFallbackText(sanitizeVisibleShareFallbackText(spec.shareTextJa));
    } finally {
      busyRef.current = false;
    }
  }

  function handleX() {
    if (!previewAck) return;
    try {
      const href = buildXShareIntentUrl(spec);
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareXClicked,
        surface,
        `narrative-x-${spec.token}`,
      );
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={styles.preview} data-testid="m55-narrative-share-actions">
      {requirePreviewAck && !previewAck ? (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setPreviewAck(true)}
          data-testid="m55-share-preview-ack"
        >
          この内容で共有する
        </button>
      ) : null}
      <div className={styles.actions} data-m55-print-hide>
        <button
          type="button"
          className={styles.primary}
          onClick={handleX}
          disabled={!previewAck}
          data-testid="m55-share-x"
        >
          Xでポスト
        </button>
        {nativeAvailable ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void handleNative()}
            disabled={!previewAck}
            data-testid="m55-share-native"
          >
            共有する
          </button>
        ) : null}
        <button
          type="button"
          className={nativeAvailable ? styles.secondary : styles.primary}
          onClick={() => void handleCopy()}
          disabled={!previewAck}
          data-testid="m55-share-copy"
        >
          リンクをコピー
        </button>
      </div>
      {status === 'copied' ? (
        <p className={styles.status} role="status" data-testid="m55-share-status">
          リンクをコピーしました
        </p>
      ) : null}
      {status === 'cancelled' ? (
        <p className={styles.status} role="status">
          共有をキャンセルしました
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={styles.status} role="status">
          共有できませんでした。テキストをコピーしてください。
        </p>
      ) : null}
      {fallbackText ? (
        <textarea
          className={styles.body}
          readOnly
          value={fallbackText}
          aria-label="共有用テキスト"
          data-testid="m55-share-fallback-text"
        />
      ) : null}
    </div>
  );
}
