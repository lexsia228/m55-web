import type { CoreResult } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

export default function CoreLoveSection({ love }: { love: CoreResult['love'] }) {
  return (
    <section className={styles.section} aria-labelledby="core-love-title">
      <p className={styles.sectionEyebrow}>観測</p>
      <h2 id="core-love-title" className={styles.sectionTitle}>
        恋愛での傾向
      </h2>
      <p className={styles.sectionLead}>
        運命や相性の断定ではなく、心の開き方と安心条件の観測です。
      </p>
      <p className={styles.summaryBody} style={{ marginBottom: 20 }}>
        {love.summary}
      </p>
      <h3 className={styles.cardTitle} style={{ marginTop: 0 }}>
        心を開く速度・安心条件
      </h3>
      <ul className={styles.focusList} style={{ marginBottom: 20 }}>
        {love.strengths.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h3 className={styles.cardTitle}>すれ違いやすい点</h3>
      <ul className={styles.focusList}>
        {love.cautions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
