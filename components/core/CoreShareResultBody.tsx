'use client';

import { useId } from 'react';
import {
  SHARE_UI_COPY_V1,
  type PrivacySafeShareCardV1,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import CoreFreeShareableResultCard from './CoreFreeShareableResultCard';
import type { CoreShareStatus } from './useCoreShareActions';
import styles from './CoreExperience.module.css';

type Props = {
  card: PrivacySafeShareCardV1;
  titleId: string;
  status: CoreShareStatus;
  nativeAvailable: boolean;
  fallbackText: string | null;
  onNativeShare: () => void;
  onCopyLink: () => void;
  testId: string;
};

/**
 * Shared privacy-safe share preview body — Free and Premium presentations reuse
 * the same canonical ten-trait card authority without exposing tokens in visible copy.
 */
export default function CoreShareResultBody({
  card,
  titleId,
  status,
  nativeAvailable,
  fallbackText,
  onNativeShare,
  onCopyLink,
  testId,
}: Props) {
  const copy = SHARE_UI_COPY_V1;

  return (
    <>
      <h2 id={titleId} className={styles.freeGuestSaveTitle}>
        {copy.titleJa}
      </h2>
      <p className={styles.freeGuestSaveBody}>{copy.bodyJa}</p>

      <p className={styles.sharePreviewLabel}>{copy.previewLabelJa}</p>
      <CoreFreeShareableResultCard card={card} />
      <p className={styles.sharePreviewText} data-testid="m55-share-preview-text">
        {card.shareTextJa}
      </p>
      <p className={styles.sharePreviewUrl} data-testid="m55-share-preview-destination">
        {copy.destinationLabelJa}
      </p>

      <div className={styles.shareActions} data-m55-print-hide>
        {nativeAvailable ? (
          <button
            type="button"
            className={styles.freeGuestSaveBtn}
            onClick={onNativeShare}
            data-testid="m55-share-native"
          >
            {copy.nativeShareJa}
          </button>
        ) : null}
        <button
          type="button"
          className={nativeAvailable ? styles.freeQuestionnaireSecondaryBtn : styles.freeGuestSaveBtn}
          onClick={onCopyLink}
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
        <>
          <p className={styles.sectionLead} role="status" data-testid="m55-share-status">
            {copy.unavailableJa}
          </p>
          <p className={styles.sectionLead}>{copy.fallbackHintJa}</p>
        </>
      ) : null}
      {fallbackText ? (
        <textarea
          className={styles.shareFallbackText}
          readOnly
          value={fallbackText}
          aria-label="共有用テキスト"
          data-testid="m55-share-fallback-text"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </>
  );
}

export function useCoreShareTitleId() {
  return useId();
}
