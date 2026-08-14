'use client';

import Link from 'next/link';
import { useId } from 'react';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { CORE_PAIR_READING_CROSS_SELL } from './corePublicCopy';
import styles from './CoreExperience.module.css';

/**
 * Quiet continuation from the personal free result to the free pair reading.
 * Secondary to the Premium bridge; never routes to paid compatibility.
 * Arrival is already measured by the /synastry input-view impression.
 */
export default function CorePairReadingCrossSell({
  tone = 'light',
}: {
  tone?: 'light' | 'night';
}) {
  const titleId = useId();
  const copy = CORE_PAIR_READING_CROSS_SELL;
  const night = tone === 'night';

  return (
    <section
      className={night ? `${styles.pairCrossSell} ${styles.pairCrossSellNight}` : styles.pairCrossSell}
      aria-labelledby={titleId}
      data-testid="m55-core-pair-cross-sell"
      data-m55-cross-sell-tone={tone}
    >
      <p className={styles.pairCrossSellEyebrow}>{copy.eyebrowJa}</p>
      <h2 id={titleId} className={styles.pairCrossSellTitle}>
        {copy.titleJa}
      </h2>
      <p className={styles.pairCrossSellBody}>{copy.bodyJa}</p>
      <Link
        href={TOP_FREE_ENTRY_PUBLIC_COPY.cta.pairReadingHref}
        className={styles.pairCrossSellLink}
        data-testid="m55-core-pair-cross-sell-link"
      >
        {copy.ctaJa}
      </Link>
      <p className={styles.pairCrossSellNote}>{copy.noteJa}</p>
    </section>
  );
}
