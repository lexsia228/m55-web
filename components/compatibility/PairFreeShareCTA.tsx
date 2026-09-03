'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PAIR_SHARE_UI_COPY,
  buildPrivacySafePairSharePayload,
} from '../../lib/m55/compatibility/privacySafePairShare';
import type { PairFreeInsightSpecV2 } from '../../lib/m55/compatibility/pairFreeInsightSpecV2';
import { projectPairPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import PublicShareCardPreview, { type ShareAspectRatio } from '../narrative/PublicShareCardPreview';
import NarrativeShareActions from '../narrative/NarrativeShareActions';
import narrativeStyles from '../narrative/NarrativeShare.module.css';
import styles from './PairFreeShareCTA.module.css';

type ShareStatus = 'idle' | 'copied' | 'cancelled' | 'error';

const ASPECT_RATIOS = ['1:1', '4:5', '9:16'] as const satisfies readonly ShareAspectRatio[];

export default function PairFreeShareCTA({
  insight,
  previewAspectRatio,
}: {
  insight?: PairFreeInsightSpecV2 | null;
  previewAspectRatio?: ShareAspectRatio;
}) {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ShareAspectRatio>(previewAspectRatio ?? '4:5');
  const busyRef = useRef(false);
  const copy = PAIR_SHARE_UI_COPY;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicSpec = insight ? projectPairPublicShareV1({ spec: insight, origin }) : null;
  const activeAspectRatio = previewAspectRatio ?? aspectRatio;

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
  }, []);

  function payload() {
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

  if (publicSpec) {
    return (
      <section
        className={styles.share}
        aria-labelledby="pair-share-title"
        data-testid="m55-pair-share"
        data-m55-share-subsystem="pair"
      >
        <h3 id="pair-share-title">二人の取扱説明書を共有する</h3>
        <p>生年月日・回答・相手の身元は含まれません。公開前に内容を確認できます。</p>
        {!previewAspectRatio ? (
          <div className={narrativeStyles.aspectPicker} role="group" aria-label="投稿サイズの見え方">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={narrativeStyles.aspectButton}
                data-selected={activeAspectRatio === ratio ? 'true' : 'false'}
                data-testid={`m55-pair-share-aspect-${ratio.replace(':', '-')}`}
                onClick={() => setAspectRatio(ratio)}
              >
                {ratio}
              </button>
            ))}
          </div>
        ) : null}
        <PublicShareCardPreview
          spec={publicSpec}
          aspectRatio={activeAspectRatio}
          shareSubsystem="pair"
        />
        <NarrativeShareActions
          spec={publicSpec}
          surface="compatibility_guest"
          requirePreviewAck
          aspectRatio={activeAspectRatio}
        />
      </section>
    );
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
