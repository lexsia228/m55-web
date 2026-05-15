import type { CoreResult } from '../../lib/m55/coreResult/types';
import { observationBulletsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreObservationListSection({ result }: { result: CoreResult }) {
  const bullets = observationBulletsForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceObserve} ${styles.tierBSection}`}
      aria-labelledby="core-observation-list"
    >
      <h2 id="core-observation-list" className={styles.sectionTitle}>この輪郭から見えていること</h2>
      <p className={styles.tierBSummary}>見えている傾向を短く整理したものです</p>
      <div className={styles.observationChipList}>
        {bullets.map((t, i) => (
          <span
            key={t}
            className={`${styles.observationChip} ${styles.chipReveal}`}
            data-core-reveal
            style={{ ['--reveal-delay' as string]: `${i * 55}ms` }}
          >{t}</span>
        ))}
      </div>
    </section>
  );
}
