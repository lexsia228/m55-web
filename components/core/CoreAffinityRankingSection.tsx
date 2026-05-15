import type { AffinityItem } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

export default function CoreAffinityRankingSection({ items }: { items: AffinityItem[] }) {
  return (
    <section className={styles.section} aria-labelledby="core-aff-title">
      <p className={styles.sectionEyebrow}>傾向</p>
      <h2 id="core-aff-title" className={styles.sectionTitle}>
        近い資質ランキング
      </h2>
      <p className={styles.sectionLead}>
        輪郭の近さの目安です。当たり外れではなく、地図上の距離として読んでください。
      </p>
      <div className={styles.affList}>
        {items.map((r) => (
          <div key={r.type} className={styles.affRow}>
            <div>
              <p className={styles.affName}>
                {r.label}{' '}
                <span className={styles.muted} style={{ fontSize: 12, fontWeight: 400 }}>
                  ({r.type})
                </span>
              </p>
              <div className={styles.affTrack} aria-hidden>
                <div className={styles.affFill} style={{ width: `${r.score}%` }} />
              </div>
            </div>
            <span className={styles.affScore}>{r.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
