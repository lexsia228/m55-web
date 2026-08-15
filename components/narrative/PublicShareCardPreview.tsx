'use client';

import type { PublicShareSpecV1 } from '../../lib/m55/narrative/publicShareSpecV1';
import styles from './NarrativeShare.module.css';

export default function PublicShareCardPreview({
  spec,
  premiumMark = false,
}: {
  spec: PublicShareSpecV1;
  premiumMark?: boolean;
}) {
  return (
    <article
      className={styles.card}
      data-testid="m55-narrative-share-card"
      data-share-card="true"
      data-share-path={spec.sharePath}
      aria-label={`M55の共有カード：${spec.headline}`}
    >
      <p className={styles.brand}>M55</p>
      <h3 className={styles.headline}>{spec.headline}</h3>
      <p className={styles.body}>{spec.body}</p>
      <p className={styles.cta}>{spec.cta}</p>
      {premiumMark ? <p className={styles.mark}>M55 プレミアムレポートから</p> : null}
    </article>
  );
}
