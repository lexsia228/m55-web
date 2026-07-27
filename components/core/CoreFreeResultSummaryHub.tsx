'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
};

/**
 * Concise free-result reading — why (2 reasons) only; hero and scene live elsewhere.
 */
export default function CoreFreeResultSummaryHub({ depth }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultSummaryHub}`}
      aria-labelledby="core-free-result-summary"
      id="core-summary"
      data-testid="m55-free-result-summary"
    >
      <span className={styles.tierAOverline}>なぜそう見えるか</span>
      <h2 id="core-free-result-summary" className={styles.sectionTitle}>
        背景の読み方
      </h2>

      <ol className={styles.freeDepthReasonList} data-testid="m55-free-depth-reasons">
        {depth.conciseWhyJa.map((reason) => (
          <li key={reason.slice(0, 24)} className={styles.freeDepthReasonItem}>
            {reason}
          </li>
        ))}
      </ol>
    </section>
  );
}
