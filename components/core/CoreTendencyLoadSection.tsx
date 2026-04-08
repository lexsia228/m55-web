import type { CoreResult } from '../../lib/m55/coreResult/types';
import { tendencyAxesForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreTendencyLoadSection({ result }: { result: CoreResult }) {
  const rows = tendencyAxesForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceTendency}`}
      aria-labelledby="core-tendency-load"
    >
      <h2 id="core-tendency-load" className={styles.sectionTitle}>
        傾向と負荷
      </h2>
      <div className={styles.tendencyStack}>
        {rows.map((row) => (
          <article key={row.formal} className={`${styles.tendencyBlock} ${styles.tendencyAxisCard}`}>
            <h3 className={styles.tendencyAxisTitle}>{row.formal}</h3>
            <p className={styles.tendencyLayerLabel}>出やすい傾向</p>
            <p className={styles.tendencyTendencyBody}>{row.tendency}</p>
            <p className={styles.tendencyLayerLabel}>生活での見え方</p>
            <p className={styles.tendencyBody}>{row.life}</p>
            <p className={styles.tendencyLayerLabel}>負荷時の乱れ方</p>
            <p className={styles.tendencyLoadBody}>{row.load}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
