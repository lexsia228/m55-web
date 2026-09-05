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

const SHAPE_OPTIONS = [
  { ratio: '1:1' as const, labelKey: 'aspectSquareJa' as const, badge: null },
  { ratio: '4:5' as const, labelKey: 'aspectPortraitJa' as const, badge: 'aspectPortraitRecommendedJa' as const },
  { ratio: '9:16' as const, labelKey: 'aspectStoryJa' as const, badge: null },
] satisfies ReadonlyArray<{
  ratio: ShareAspectRatio;
  labelKey: 'aspectSquareJa' | 'aspectPortraitJa' | 'aspectStoryJa';
  badge: 'aspectPortraitRecommendedJa' | null;
}>;

export default function PairFreeShareCTA({
  insight,
  previewAspectRatio,
  personAStemLaneIndex,
  personBStemLaneIndex,
}: {
  insight?: PairFreeInsightSpecV2 | null;
  previewAspectRatio?: ShareAspectRatio;
  personAStemLaneIndex?: number;
  personBStemLaneIndex?: number;
}) {
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ShareAspectRatio>(previewAspectRatio ?? '4:5');
  const [showImageShapeOptions, setShowImageShapeOptions] = useState(false);
  const busyRef = useRef(false);
  const copy = PAIR_SHARE_UI_COPY;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicSpec = insight
    ? projectPairPublicShareV1({
        spec: insight,
        origin,
        personAStemLaneIndex,
        personBStemLaneIndex,
      })
    : null;
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
        <h3 id="pair-share-title">{copy.titleJa}</h3>
        <p>{copy.motivationJa}</p>
        <p>生年月日・回答・相手の身元は含まれません。公開前に内容を確認できます。</p>
        {!previewAspectRatio ? (
          <button
            type="button"
            className={narrativeStyles.aspectButton}
            data-testid="m55-pair-share-shape-toggle"
            aria-expanded={showImageShapeOptions}
            onClick={() => setShowImageShapeOptions((open) => !open)}
          >
            {copy.imageShapeToggleJa}
          </button>
        ) : null}
        {!previewAspectRatio && showImageShapeOptions ? (
          <div
            className={narrativeStyles.aspectPicker}
            role="group"
            aria-label={copy.imageShapeLabelJa}
            data-testid="m55-pair-share-shape-options"
          >
            <p className={styles.status}>{copy.imageShapeLabelJa}</p>
            {SHAPE_OPTIONS.map((option) => {
              const label = copy[option.labelKey];
              const badge = option.badge ? copy[option.badge] : null;
              return (
                <button
                  key={option.ratio}
                  type="button"
                  className={narrativeStyles.aspectButton}
                  data-selected={activeAspectRatio === option.ratio ? 'true' : 'false'}
                  data-testid={`m55-pair-share-aspect-${option.ratio.replace(':', '-')}`}
                  aria-label={`${label} ${option.ratio}`}
                  onClick={() => setAspectRatio(option.ratio)}
                >
                  <span>{label}</span>
                  {badge ? <span> {badge}</span> : null}
                  <span aria-hidden> {option.ratio}</span>
                </button>
              );
            })}
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
          imageFirst
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
      <p>{copy.motivationJa}</p>
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
