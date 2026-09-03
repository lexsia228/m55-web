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
import { shareVariantEnum } from '../../lib/m55/narrative/publicCardDisplayV1';
import { sanitizeVisibleShareFallbackText } from '../core/useCoreShareActions';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import type { ShareAspectRatio } from './PublicShareCardPreview';
import styles from './NarrativeShare.module.css';

type Status = 'idle' | 'copied' | 'cancelled' | 'error';

function buildUserShareImagePath(sharePath: string, aspect: ShareAspectRatio): string {
  return `${sharePath}/share-image?aspect=${encodeURIComponent(aspect)}`;
}

export default function NarrativeShareActions({
  spec,
  surface,
  requirePreviewAck = false,
  aspectRatio,
}: {
  spec: PublicShareSpecV1;
  surface: 'core_share' | 'compatibility_guest' | 'compatibility_paid_report' | 'dtr_saved_report';
  requirePreviewAck?: boolean;
  aspectRatio?: ShareAspectRatio;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [previewAck, setPreviewAck] = useState(!requirePreviewAck);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [shareComplete, setShareComplete] = useState(false);
  const busyRef = useRef(false);
  const variantEnum = shareVariantEnum(spec.variant);
  const premiumHref = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;

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
        { shareVariant: variantEnum, shareChannel: 'native' },
      );
      await navigator.share(next);
      setShareComplete(true);
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
          { shareVariant: variantEnum, shareChannel: 'copy' },
        );
        setStatus('copied');
        setShareComplete(true);
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
        { shareVariant: variantEnum, shareChannel: 'x' },
      );
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      setStatus('error');
    }
  }

  async function handleSaveImage() {
    if (!previewAck || busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const imagePath = aspectRatio
        ? buildUserShareImagePath(spec.sharePath, aspectRatio)
        : spec.imageSpec.path;
      const imageUrl = `${origin}${imagePath}`;
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('image fetch failed');
      const blob = await res.blob();
      const file = new File([blob], 'm55-share.png', { type: blob.type || 'image/png' });
      const extras = { shareVariant: variantEnum, shareChannel: 'image' as const };
      const canShareFile =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (canShareFile) {
        trackFunnelActionOnce(
          M55_FUNNEL_EVENTS.shareImageSaved,
          surface,
          `narrative-image-${spec.token}`,
          extras,
        );
        await navigator.share({ files: [file], title: 'M55', text: spec.shareTextJa });
        setShareComplete(true);
        return;
      }
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = 'm55-share.png';
      anchor.click();
      URL.revokeObjectURL(href);
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareImageSaved,
        surface,
        `narrative-image-${spec.token}`,
        extras,
      );
      setShareComplete(true);
    } catch {
      setStatus('error');
    } finally {
      busyRef.current = false;
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
        <button
          type="button"
          className={styles.secondary}
          onClick={() => void handleSaveImage()}
          disabled={!previewAck}
          data-testid="m55-share-image"
        >
          画像を保存
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
      {shareComplete && surface === 'core_share' ? (
        <p className={styles.status} data-testid="m55-share-premium-continue">
          <a href={premiumHref}>なぜこうなるかまで読む</a>
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
