import type { CoreResult } from '../../lib/m55/coreResult/types';
import { tendencyAxesForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreTendencyLoadSection({ result }: { result: CoreResult }) {
  const rows = tendencyAxesForResult(result);
  return (
    <section className={styles.section} aria-labelledby="core-tendency-load">
      <h2 id="core-tendency-load" className={styles.sectionTitle}>
        傾向と負荷
      </h2>
      <div className={styles.tendencyStack}>
        {rows.map((row) => (
          <article key={row.formal} className={styles.tendencyBlock}>
            <h3 className={styles.tendencyAxisTitle}>{row.formal}</h3>
            <p className={styles.tendencyHook}>
              <span className={styles.tendencyDot} aria-hidden>
                ·
              </span>
              {row.hook}
            </p>
            <p className={styles.tendencyBody}>{row.body}</p>
            <p className={styles.tendencyLoadLabel}>負荷</p>
            <p className={styles.tendencyLoadBody}>{row.load}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
