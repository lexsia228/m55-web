import type { AxisBand, AxisDetail } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

function bandJa(b: AxisBand): string {
  switch (b) {
    case 'very-high':
      return 'とても高め';
    case 'high':
      return '高め';
    case 'mid':
      return '中程度';
    case 'mid-low':
      return '穏やかめ';
    case 'low':
      return '背景寄り';
    default:
      return b;
  }
}

export default function CoreAxisBarsSection({ details }: { details: AxisDetail[] }) {
  return (
    <section className={styles.section} aria-labelledby="core-bars-title">
      <p className={styles.sectionEyebrow}>傾向</p>
      <h2 id="core-bars-title" className={styles.sectionTitle}>
        解析軸別の強弱
      </h2>
      <p className={styles.sectionLead}>
        スコアは 0–100 の目安です。バンドは傾きの読み取り補助で、順位付けではありません。
      </p>
      <div className={styles.barsList}>
        {details.map((d) => (
          <div key={d.key} className={styles.barRow}>
            <div className={styles.barHead}>
              <span className={styles.barLabel}>{d.label}</span>
              <span className={styles.barBand}>{bandJa(d.band)}</span>
              <span className={styles.barScore}>{d.score}</span>
            </div>
            <div className={styles.barTrack} aria-hidden>
              <div className={styles.barFill} style={{ width: `${d.score}%` }} />
            </div>
            <p className={styles.barBlurb}>{d.summary}</p>
            <p className={styles.barSub}>
              <strong>出やすい出方:</strong> {d.strength}
            </p>
            <p className={styles.barSub}>
              <strong>崩れやすい条件:</strong> {d.caution}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
