import type { CoreResult } from '../../lib/m55/coreResult/types';
import { tendencyAxesForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreTendencyLoadSection({ result }: { result: CoreResult }) {
  const rows = tendencyAxesForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceTendency} ${styles.tierASurface}`}
      aria-labelledby="core-tendency-load"
    >
      <span className={styles.tierAOverline}>傾向</span>
      <h2 id="core-tendency-load" className={styles.sectionTitle}>
        傾向と負荷
      </h2>
      <p className={styles.tierASummary}>出やすさと、崩れやすさを分けて見ます</p>
      <div className={styles.tendencyStack}>
        {rows.map((row, i) => (
          <article
            key={row.formal}
            className={`${styles.tendencyBlock} ${styles.tendencyAxisCard}`}
          >
            <h3 className={styles.tendencyAxisTitle}>{row.formal}</h3>
            <p className={styles.tendencyLayerLabel}>出やすい傾向</p>
            <p
              className={`${styles.tendencyTendencyBody} ${styles.resultBodyReveal}`}
              data-core-reveal
              style={{ ['--reveal-delay' as string]: `${i * 40}ms` }}
            >{row.tendency}</p>
            <p className={styles.tendencyLayerLabel}>生活での見え方</p>
            <p
              className={`${styles.tendencyBody} ${styles.resultBodyReveal}`}
              data-core-reveal
              style={{ ['--reveal-delay' as string]: `${i * 40 + 60}ms` }}
            >{row.life}</p>
            <p className={styles.tendencyLayerLabel}>負荷時の乱れ方</p>
            <p
              className={`${styles.tendencyLoadBody} ${styles.resultBodyReveal}`}
              data-core-reveal
              style={{ ['--reveal-delay' as string]: `${i * 40 + 120}ms` }}
            >{row.load}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
