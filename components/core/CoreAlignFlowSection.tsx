import type { CoreResult } from '../../lib/m55/coreResult/types';
import { alignStepsForResult } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreAlignFlowSection({ result }: { result: CoreResult }) {
  const steps = alignStepsForResult(result);
  return (
    <section className={styles.section} aria-labelledby="core-align-flow">
      <h2 id="core-align-flow" className={styles.sectionTitle}>
        まず整えるとよいこと
      </h2>
      <p className={styles.sectionLead}>今の流れを少し使いやすくするなら、順番はこうです。</p>
      <ul className={styles.alignFlowList}>
        {steps.map((s) => (
          <li key={s.phase} className={styles.alignFlowItem}>
            <span className={styles.alignFlowPhase}>{s.phase}</span>
            <span className={styles.alignFlowText}>{s.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
