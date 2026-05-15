import type { CoreResult } from '../../lib/m55/coreResult/types';
import { alignStepsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreAlignFlowSection({ result }: { result: CoreResult }) {
  const steps = alignStepsForResult(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceAlign} ${styles.tierBSection}`}
      aria-labelledby="core-align-flow"
    >
      <h2 id="core-align-flow" className={styles.sectionTitle}>
        まず整えるとよいこと
      </h2>
      <p className={styles.tierBSummary}>戻りやすい入口だけを先に示します</p>

      <p className={styles.sectionLead}>
        今の流れを少し使いやすくするなら、入口はこうです。
      </p>

      <ul className={styles.alignFlowGrid}>
        {steps.map((s, i) => (
          <li key={s.phase} className={styles.alignFlowCard}>
            <span className={styles.alignFlowPhase}>
              <span className={styles.alignFlowStepNum} aria-hidden>{i + 1}</span>
              {s.phase}
            </span>
            <span className={styles.alignFlowText}>{s.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}