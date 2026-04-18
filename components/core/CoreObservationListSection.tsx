import type { CoreResult } from '../../lib/m55/coreResult/types';
import { observationBulletsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreObservationListSection({ result }: { result: CoreResult }) {
  const bullets = observationBulletsForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceObserve} ${styles.tierBSection} ${styles.coreReveal}`}
      aria-labelledby="core-observation-list"
      data-core-reveal
    >
      <h2 id="core-observation-list" className={styles.sectionTitle}>この輪郭から見えていること</h2>
      <p className={styles.tierBSummary}>見えている傾向を短く整理したものです</p>
      <div className={styles.observationPanel}>
        <ul className={styles.observationBullets}>
          {bullets.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
