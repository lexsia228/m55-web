import type { CoreResult } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

export default function CoreWorkStyleSection({ workStyle }: { workStyle: CoreResult['workStyle'] }) {
  return (
    <section className={styles.section} aria-labelledby="core-work-title">
      <p className={styles.sectionEyebrow}>観測</p>
      <h2 id="core-work-title" className={styles.sectionTitle}>
        仕事での出方
      </h2>
      <p className={styles.summaryBody} style={{ marginBottom: 20 }}>
        {workStyle.summary}
      </p>
      <h3 className={styles.cardTitle} style={{ marginTop: 0 }}>
        向いている役割・得意な進め方
      </h3>
      <ul className={styles.focusList} style={{ marginBottom: 20 }}>
        {workStyle.strengths.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h3 className={styles.cardTitle}>苦手になりやすい働き方</h3>
      <ul className={styles.focusList}>
        {workStyle.cautions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
