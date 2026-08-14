'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
};

const LAYERS = [
  {
    label: '生年月日から見える、あなたの基調',
    key: 'birth' as const,
  },
  {
    label: '今回の回答で見えた、今の出方',
    key: 'current' as const,
  },
  {
    label: '二つを重ねると見えること',
    key: 'fused' as const,
  },
] as const;

/**
 * Concise free-result reading — DOB base, current answers, then fused inference.
 */
export default function CoreFreeResultSummaryHub({ depth }: Props) {
  const bodies = {
    birth: depth.birthBaseJa,
    current: depth.currentExpressionJa,
    fused: depth.conciseWhyJa[0] ?? depth.headlineJa,
  };

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultSummaryHub}`}
      aria-labelledby="core-free-result-summary"
      id="core-summary"
      data-testid="m55-free-result-summary"
    >
      <span className={styles.tierAOverline}>なぜそう見えるか</span>
      <h2 id="core-free-result-summary" className={styles.sectionTitle}>
        回答から見えた理由
      </h2>

      <ol className={styles.freeDepthReasonList} data-testid="m55-free-depth-reasons">
        {LAYERS.map((layer) => (
          <li key={layer.key} className={styles.freeDepthReasonItem}>
            <span className={styles.freeDepthBlockTitle}>{layer.label}</span>
            <p className={styles.freeDepthBlockBody}>{bodies[layer.key]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
