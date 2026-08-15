'use client';

import type { PublicShareSpecV1 } from '../../lib/m55/narrative/publicShareSpecV1';
import { parsePublicCardDisplayV1 } from '../../lib/m55/narrative/publicCardDisplayV1';
import styles from './NarrativeShare.module.css';

export default function PublicShareCardPreview({
  spec,
  premiumMark = false,
}: {
  spec: PublicShareSpecV1;
  premiumMark?: boolean;
}) {
  const display = parsePublicCardDisplayV1(spec);
  const variant = spec.variant;

  return (
    <article
      className={styles.card}
      data-testid="m55-narrative-share-card"
      data-share-card="true"
      data-card-variant={variant}
      data-share-path={spec.sharePath}
      aria-label={`M55の共有カード：${spec.headline}`}
    >
      <p className={styles.brand}>M55</p>
      <h3 className={styles.headline}>{spec.headline}</h3>

      {variant === 'manual' && display.rows.length > 0 ? (
        <dl className={styles.specSheet}>
          {display.rows.map((row) => (
            <div key={row.label} className={styles.specRow}>
              <dt className={styles.specLabel}>{row.label}</dt>
              <dd className={styles.specValue}>{row.body}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {variant === 'seen_vs_actual' && display.seenJa && display.actualJa ? (
        <div className={styles.mirror}>
          <div className={styles.mirrorPane} data-side="seen">
            <p className={styles.mirrorLabel}>人から見える私</p>
            <p className={styles.mirrorBody}>「{display.seenJa}」</p>
          </div>
          <p className={styles.mirrorVs} aria-hidden>
            vs
          </p>
          <div className={styles.mirrorPane} data-side="actual">
            <p className={styles.mirrorLabel}>実際の私</p>
            <p className={styles.mirrorBody}>「{display.actualJa}」</p>
          </div>
        </div>
      ) : null}

      {(variant === 'hidden_spec' || variant === 'premium_takeaway') && display.heroJa ? (
        <div className={styles.poster}>
          <p className={styles.posterHero}>{display.heroJa}</p>
          {display.supportJa ? <p className={styles.posterSupport}>{display.supportJa}</p> : null}
        </div>
      ) : null}

      {variant === 'pair_manual' ? (
        <div className={styles.relation}>
          {display.sideAJa && display.sideBJa ? (
            <>
              <div className={styles.relationSide}>
                <span className={styles.relationLabel}>一方</span>
                <p className={styles.relationBody}>{display.sideAJa}</p>
              </div>
              <p className={styles.mirrorVs} aria-hidden>
                →
              </p>
              <div className={styles.relationSide}>
                <span className={styles.relationLabel}>もう一方</span>
                <p className={styles.relationBody}>{display.sideBJa}</p>
              </div>
            </>
          ) : (
            <div className={styles.relationSide}>
              <span className={styles.relationLabel}>すれ違いの入口</span>
              <p className={styles.relationBody}>{display.entryJa}</p>
            </div>
          )}
          <div className={styles.relationReturn}>
            <span className={styles.relationLabel}>戻りやすい方法</span>
            <p className={styles.relationBody}>{display.returnJa}</p>
          </div>
        </div>
      ) : null}

      {variant === 'pair_generic' ? <p className={styles.body}>{spec.body}</p> : null}

      {display.cueJa ? <p className={styles.cue}>{display.cueJa}</p> : null}
      <p className={styles.cta}>{display.cta}</p>
      {premiumMark ? <p className={styles.mark}>M55 プレミアムレポートから</p> : null}
    </article>
  );
}
