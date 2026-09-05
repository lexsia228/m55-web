'use client';

import { useEffect, useRef, useState } from 'react';
import {
  assertSharePayloadPrivacySafe,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import { PAIR_SHARE_UI_COPY } from '../../lib/m55/compatibility/privacySafePairShare';
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

type Status = 'idle' | 'copied' | 'cancelled' | 'error' | 'image_saved';

function buildUserShareImagePath(sharePath: string, aspect: ShareAspectRatio): string {
  return `${sharePath}/share-image?aspect=${encodeURIComponent(aspect)}`;
}

function probeImageFileShareAvailable(): boolean {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }
  try {
    const probeFile = new File(['x'], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probeFile] });
  } catch {
    return false;
  }
}

export default function NarrativeShareActions({
  spec,
  surface,
  requirePreviewAck = false,
  aspectRatio,
  imageFirst = false,
}: {
  spec: PublicShareSpecV1;
  surface: 'core_share' | 'compatibility_guest' | 'compatibility_paid_report' | 'dtr_saved_report';
  requirePreviewAck?: boolean;
  aspectRatio?: ShareAspectRatio;
  imageFirst?: boolean;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [imageFileShareAvailable, setImageFileShareAvailable] = useState(false);
  const [previewAck, setPreviewAck] = useState(!requirePreviewAck);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [shareComplete, setShareComplete] = useState(false);
  const busyRef = useRef(false);
  const variantEnum = shareVariantEnum(spec.variant);
  const premiumHref = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;
  const pairCopy = PAIR_SHARE_UI_COPY;

  useEffect(() => {
    setNativeAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
    setImageFileShareAvailable(probeImageFileShareAvailable());
    setPreviewAck(!requirePreviewAck);
  }, [requirePreviewAck, spec.token]);

  function payload() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin ? `${origin.replace(/\/$/, '')}${spec.sharePath}` : spec.canonicalUrl;
    const next = { title: 'M55' as const, text: spec.shareTextJa, url };
    assertSharePayloadPrivacySafe(next);
    return next;
  }

  async function fetchShareImageFile(): Promise<File> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imagePath = aspectRatio
      ? buildUserShareImagePath(spec.sharePath, aspectRatio)
      : spec.imageSpec.path;
    const imageUrl = `${origin}${imagePath}`;
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error('image fetch failed');
    const blob = await res.blob();
    return new File([blob], 'm55-share.png', { type: blob.type || 'image/png' });
  }

  async function downloadShareImageFile(file: File) {
    const href = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'm55-share.png';
    anchor.click();
    URL.revokeObjectURL(href);
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
      const file = await fetchShareImageFile();
      const extras = { shareVariant: variantEnum, shareChannel: 'image' as const };
      const canShareFile =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (!imageFirst && canShareFile) {
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
      await downloadShareImageFile(file);
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareImageSaved,
        surface,
        `narrative-image-${spec.token}`,
        extras,
      );
      setShareComplete(true);
      if (imageFirst) {
        setStatus('image_saved');
      }
    } catch {
      setStatus('error');
    } finally {
      busyRef.current = false;
    }
  }

  async function handleImagePrimary() {
    if (!previewAck || busyRef.current) return;
    busyRef.current = true;
    setStatus('idle');
    try {
      const file = await fetchShareImageFile();
      const extras = { shareVariant: variantEnum, shareChannel: 'image' as const };
      if (imageFileShareAvailable) {
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
      await downloadShareImageFile(file);
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareImageSaved,
        surface,
        `narrative-image-${spec.token}`,
        extras,
      );
      setShareComplete(true);
      setStatus('image_saved');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setStatus(name === 'AbortError' ? 'cancelled' : 'error');
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
      {imageFirst ? (
        <div className={styles.actions} data-m55-print-hide>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void handleImagePrimary()}
            disabled={!previewAck}
            data-testid="m55-share-image-primary"
          >
            {imageFileShareAvailable ? pairCopy.imageSharePrimaryJa : pairCopy.imageSaveJa}
          </button>
          {nativeAvailable ? (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void handleNative()}
              disabled={!previewAck}
              data-testid="m55-share-link-native"
            >
              {pairCopy.linkShareJa}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void handleCopy()}
            disabled={!previewAck}
            data-testid="m55-share-copy"
          >
            {pairCopy.linkCopyJa}
          </button>
          {imageFileShareAvailable ? (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void handleSaveImage()}
              disabled={!previewAck}
              data-testid="m55-share-image"
            >
              {pairCopy.imageSaveJa}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.secondary}
            onClick={handleX}
            disabled={!previewAck}
            data-testid="m55-share-x"
          >
            {pairCopy.xLinkPostJa}
          </button>
        </div>
      ) : (
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
      )}
      {status === 'copied' ? (
        <p className={styles.status} role="status" data-testid="m55-share-status">
          {imageFirst ? pairCopy.copiedJa : 'リンクをコピーしました'}
        </p>
      ) : null}
      {status === 'image_saved' ? (
        <p className={styles.status} role="status" data-testid="m55-share-status">
          {pairCopy.imageSaveJa}
        </p>
      ) : null}
      {status === 'cancelled' ? (
        <p className={styles.status} role="status">
          {imageFirst ? pairCopy.cancelledJa : '共有をキャンセルしました'}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={styles.status} role="status">
          {imageFirst ? pairCopy.unavailableJa : '共有できませんでした。テキストをコピーしてください。'}
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
