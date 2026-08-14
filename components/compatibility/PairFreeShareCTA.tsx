'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PAIR_SHARE_UI_COPY,
  buildPrivacySafePairSharePayload,
} from '../../lib/m55/compatibility/privacySafePairShare';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './PairFreeShareCTA.module.css';

type ShareStatus = 'idle' | 'copied' | 'cancelled' | 'error';

export default function PairFreeShareCTA() {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const busyRef = useRef(false);
  const copy = PAIR_SHARE_UI_COPY;

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
  }, []);

  function payload() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return buildPrivacySafePairSharePayload(origin);
  }

  async function handleNativeShare() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const next = payload();
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        setStatus('error');
        return;
      }
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.nativeShareInvoked,
        'compatibility_guest',
        'pair-native-share',
      );
      await navigator.share(next);
      setStatus('idle');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setStatus(name === 'AbortError' ? 'cancelled' : 'error');
    } finally {
      busyRef.current = false;
    }
  }

  async function handleCopyLink() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const next = payload();
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setStatus('error');
        return;
      }
      await navigator.clipboard.writeText(next.url);
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareLinkCopied,
        'compatibility_guest',
        'pair-copy-link',
      );
      setStatus('copied');
    } catch {
      setStatus('error');
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <section
      className={styles.share}
      aria-labelledby="pair-share-title"
      data-testid="m55-pair-share"
    >
      <h3 id="pair-share-title">{copy.titleJa}</h3>
      <p>{copy.bodyJa}</p>
      <div className={styles.actions}>
        {nativeAvailable ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => void handleNativeShare()}
            data-testid="m55-pair-share-native"
          >
            {copy.nativeShareJa}
          </button>
        ) : null}
        <button
          type="button"
          className={nativeAvailable ? styles.secondary : styles.primary}
          onClick={() => void handleCopyLink()}
          data-testid="m55-pair-share-copy"
        >
          {copy.copyLinkJa}
        </button>
      </div>
      {status === 'copied' ? (
        <p className={styles.status} role="status" data-testid="m55-pair-share-status">
          {copy.copiedJa}
        </p>
      ) : null}
      {status === 'cancelled' ? (
        <p className={styles.status} role="status" data-testid="m55-pair-share-status">
          {copy.cancelledJa}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={styles.status} role="status" data-testid="m55-pair-share-status">
          {copy.unavailableJa}
        </p>
      ) : null}
    </section>
  );
}
