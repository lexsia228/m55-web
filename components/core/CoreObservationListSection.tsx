import type { CoreResult } from '../../lib/m55/coreResult/types';
import { observationBulletsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreObservationListSection({ result }: { result: CoreResult }) {
  const bullets = observationBulletsForResult(result);
  return (
    <section className={styles.section} aria-labelledby="core-observation-list">
      <h2 id="core-observation-list" className={styles.sectionTitle}>
        観測
      </h2>
      <ul className={styles.observationBullets}>
        {bullets.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
