import type { CoreResult } from '../../lib/m55/coreResult/types';
import { alignStepsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreAlignFlowSection({ result }: { result: CoreResult }) {
  const steps = alignStepsForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceAlign}`}
      aria-labelledby="core-align-flow"
    >
      <h2 id="core-align-flow" className={styles.sectionTitle}>
        まず整えるとよいこと
      </h2>
      
      {/* 導入：V3正本に基づき「入口」の概念を提示 */}
      <p className={styles.sectionLead}>
        ここでは、整え方の入口だけを置いています。
      </p>
      <p className={styles.sectionLead}>
        実際にどこから整えると戻りやすいかは、5つの軸の重なり方によって少しずつ変わります。
      </p>

      {/* 補助文：断定を避け、補助的なトーンへ変更 */}
      <p className={styles.sectionLead}>
        今の流れを少し使いやすくするなら、入口はこうです。
      </p>

      <ul className={styles.alignFlowGrid}>
        {steps.map((s) => (
          <li key={s.phase} className={styles.alignFlowCard}>
            <span className={styles.alignFlowPhase}>{s.phase}</span>
            <span className={styles.alignFlowText}>{s.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}