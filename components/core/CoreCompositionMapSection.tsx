import { AXIS_PUBLIC_LABEL } from '../../lib/m55/coreResult/axisMeta';
import type { AxisKey, CoreResult } from '../../lib/m55/coreResult/types';
import styles from './CoreExperience.module.css';

function axisLine(keys: AxisKey[]): string {
  return keys.map((k) => AXIS_PUBLIC_LABEL[k]).join(' · ');
}

export default function CoreCompositionMapSection({ result }: { result: CoreResult }) {
  const { dominantAxes, secondaryAxes } = result.composition;

  return (
    <section className={styles.section} aria-labelledby="core-comp-title">
      <p className={styles.sectionEyebrow}>見取り図</p>
      <h2 id="core-comp-title" className={styles.sectionTitle}>
        資質の成り立ち
      </h2>
      <p className={styles.sectionLead}>
        固定された本質ラベルの背後で、どの解析軸が手前に出やすいかを示します。
      </p>
      <div className={styles.compMap}>
        <div className={styles.compCenter}>
          <p className={styles.compCenterLabel}>本質ラベル</p>
          <p className={styles.compCenterName}>{result.coreLabel}</p>
        </div>
        <div className={styles.compAxisRow}>
          <div className={styles.compGrid}>
            <div className={styles.compBlock}>
              <p className={styles.compLabel}>主軸</p>
              <p className={styles.compAxes}>{axisLine(dominantAxes)}</p>
              <p className={styles.compHint}>輪郭として最も手前に出やすい解析軸です。</p>
            </div>
            <div className={styles.compBlock}>
              <p className={styles.compLabel}>副軸</p>
              <p className={styles.compAxes}>{axisLine(secondaryAxes)}</p>
              <p className={styles.compHint}>支え・補助として効きやすい解析軸です。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
