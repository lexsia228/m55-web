'use client';

import { useState } from 'react';
import { FREE_RESULT_SHARE_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import styles from './CoreExperience.module.css';

/**
 * Privacy-safe share: public entry URL + fixed marketing sentence only.
 * Never includes DOB, answers, nickname, or report body.
 */
export default function CoreFreeResultShareCTA() {
  const copy = FREE_RESULT_SHARE_COPY_V1;
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleShare() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${copy.shareUrlPath}`;
    const text = copy.shareTextJa;

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'M55', text, url });
        setStatus('idle');
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setStatus('copied');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeGuestSaveCta}`}
      aria-labelledby="core-free-share-title"
      data-testid="m55-free-result-share"
    >
      <h2 id="core-free-share-title" className={styles.freeGuestSaveTitle}>
        {copy.titleJa}
      </h2>
      <p className={styles.freeGuestSaveBody}>{copy.bodyJa}</p>
      <button type="button" className={styles.freeGuestSaveBtn} onClick={handleShare}>
        {copy.actionJa}
      </button>
      {status === 'copied' ? (
        <p className={styles.sectionLead} role="status">
          {copy.copiedJa}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={styles.sectionLead} role="status">
          {copy.unavailableJa}
        </p>
      ) : null}
    </section>
  );
}
