'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  onRequestReanswer: () => void;
};

/**
 * Single primary scene + re-answer — multi-scene detail reserved for Premium.
 */
export default function CoreFreeResultScenesSection({ depth, onRequestReanswer }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeFiveViewSection}`}
      aria-labelledby="core-free-scenes-title"
      id="core-scenes"
      data-testid="m55-free-result-scenes"
    >
      <article className={styles.freeDepthBlock}>
        <h2 id="core-free-scenes-title" className={styles.freeDepthBlockTitle}>
          {depth.primarySceneLabelJa}
        </h2>
        <p className={styles.freeDepthBlockBody}>{depth.primarySceneJa}</p>
      </article>

      <div className={styles.freeReanswerWrap} data-m55-print-hide>
        <button
          type="button"
          className={styles.freeQuestionnaireSecondaryBtn}
          data-testid="m55-free-rerun-request"
          onClick={onRequestReanswer}
        >
          回答を変えて、もう一度見る
        </button>
      </div>
    </section>
  );
}
