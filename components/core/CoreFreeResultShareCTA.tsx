'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  SHARE_UI_COPY_V1,
  assertSharePayloadPrivacySafe,
  resolveShareAbsoluteUrl,
  type PrivacySafeShareCardV1,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import CoreFreeShareableResultCard from './CoreFreeShareableResultCard';
import styles from './CoreExperience.module.css';

type Props = {
  card: PrivacySafeShareCardV1;
};

type Status = 'idle' | 'copied' | 'cancelled' | 'error';

/**
 * Explicit share: preview → native share or copy-link.
 * Never auto-posts. Never includes DOB / answers / nickname.
 */
export default function CoreFreeResultShareCTA({ card }: Props) {
  const copy = SHARE_UI_COPY_V1;
  const titleId = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
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
    try {
      const payload = buildPayload();
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.nativeShareInvoked,
        'core_share',
        `core-native-share-${card.token}`,
      );
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        setStatus('error');
        return;
      }
      await navigator.share(payload);
      setStatus('idle');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') {
        setStatus('cancelled');
      } else {
        setStatus('error');
      }
    } finally {
      busyRef.current = false;
    }
  }

  async function handleCopyLink() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const payload = buildPayload();
      trackFunnelActionOnce(
        M55_FUNNEL_EVENTS.shareLinkCopied,
        'core_share',
        `core-copy-link-${card.token}`,
      );
      const line = `${payload.text}\n${payload.url}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(line);
        setStatus('copied');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeShareSection}`}
      aria-labelledby={titleId}
      data-testid="m55-free-result-share"
    >
      <h2 id={titleId} className={styles.freeGuestSaveTitle}>
        {copy.titleJa}
      </h2>
      <p className={styles.freeGuestSaveBody}>{copy.bodyJa}</p>

      <p className={styles.sharePreviewLabel}>{copy.previewLabelJa}</p>
      <CoreFreeShareableResultCard card={card} />
      <p className={styles.sharePreviewText} data-testid="m55-share-preview-text">
        {card.shareTextJa}
      </p>
      <p className={styles.sharePreviewUrl} data-testid="m55-share-preview-url">
        {card.sharePath}
      </p>

      <div className={styles.shareActions}>
        {nativeAvailable ? (
          <button
            type="button"
            className={styles.freeGuestSaveBtn}
            onClick={handleNativeShare}
            data-testid="m55-share-native"
          >
            {copy.nativeShareJa}
          </button>
        ) : null}
        <button
          type="button"
          className={nativeAvailable ? styles.freeQuestionnaireSecondaryBtn : styles.freeGuestSaveBtn}
          onClick={handleCopyLink}
          data-testid="m55-share-copy"
        >
          {copy.copyLinkJa}
        </button>
      </div>

      {status === 'copied' ? (
        <p className={styles.sectionLead} role="status" data-testid="m55-share-status">
          {copy.copiedJa}
        </p>
      ) : null}
      {status === 'cancelled' ? (
        <p className={styles.sectionLead} role="status" data-testid="m55-share-status">
          {copy.cancelledJa}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={styles.sectionLead} role="status" data-testid="m55-share-status">
          {copy.unavailableJa}
        </p>
      ) : null}
    </section>
  );
}
