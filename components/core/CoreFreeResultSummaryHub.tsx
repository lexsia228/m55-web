'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
};

const LAYERS = [
  {
    label: '具体的に出やすい場面',
    key: 'scene' as const,
  },
  {
    label: 'なぜこの読みになるか',
    key: 'why' as const,
  },
  {
    label: '生年月日から見えた土台',
    key: 'birth' as const,
  },
  {
    label: '回答で確認できた今の出方',
    key: 'current' as const,
  },
] as const;

/**
 * Concise free-result reading — fused hit first, then provenance.
 */
export default function CoreFreeResultSummaryHub({ depth }: Props) {
  const bodies = {
    scene: depth.primarySceneJa,
    why: depth.conciseWhyJa[0] ?? depth.headlineJa,
    birth: depth.birthBaseJa,
    current: depth.currentExpressionJa,
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
      <p className={styles.freeDepthBlockBody}>{depth.trustCueJa}</p>

      <ol className={styles.freeDepthReasonList} data-testid="m55-free-depth-reasons">
        <li className={styles.freeDepthReasonItem}>
          <span className={styles.freeDepthBlockTitle}>{LAYERS[1].label}</span>
          <p className={styles.freeDepthBlockBody}>{bodies.why}</p>
        </li>
      </ol>
      <details className={styles.freeDepthMore}>
        <summary>背景をもう少し見る</summary>
        <ol className={styles.freeDepthReasonList}>
          {LAYERS.filter((layer) => layer.key !== 'why').map((layer) => (
            <li key={layer.key} className={styles.freeDepthReasonItem}>
              <span className={styles.freeDepthBlockTitle}>{layer.label}</span>
              <p className={styles.freeDepthBlockBody}>{bodies[layer.key]}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
