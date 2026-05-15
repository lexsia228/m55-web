import type { CoreResult } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

export default function CoreRelationshipsSection({
  relationships,
}: {
  relationships: CoreResult['relationships'];
}) {
  return (
    <section className={styles.section} aria-labelledby="core-rel-title">
      <p className={styles.sectionEyebrow}>観測</p>
      <h2 id="core-rel-title" className={styles.sectionTitle}>
        人間関係での傾向
      </h2>
      <p className={styles.summaryBody} style={{ marginBottom: 20 }}>
        {relationships.summary}
      </p>
      <h3 className={styles.cardTitle} style={{ marginTop: 0 }}>
        安定しやすい関わり
      </h3>
      <ul className={styles.focusList} style={{ marginBottom: 20 }}>
        {relationships.strengths.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h3 className={styles.cardTitle}>疲れやすい関係・誤解されやすい点</h3>
      <ul className={styles.focusList}>
        {relationships.cautions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
