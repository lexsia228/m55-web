'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  smallActionJa?: string;
  onRequestReanswer: () => void;
};

/**
 * Conviction block — two life scenes, then the conditions that help and the
 * conditions that wear the same tendency down. Deeper reading stays in Premium.
 */
export default function CoreFreeResultScenesSection({ depth, smallActionJa, onRequestReanswer }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeFiveViewSection}`}
      aria-labelledby="core-free-scenes-title"
      id="core-scenes"
      data-testid="m55-free-result-scenes"
    >
      <span className={styles.tierAOverline}>どんな場面で出るか</span>
      <h2 id="core-free-scenes-title" className={styles.sectionTitle}>
        この傾向が表れる場面
      </h2>

      <div className={styles.freeDepthSceneStack} data-testid="m55-free-depth-scenes">
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>{depth.primarySceneLabelJa}</h3>
          <p className={styles.freeDepthBlockBody}>{depth.primarySceneJa}</p>
        </article>
      </div>
      <details className={styles.freeDepthMore}>
        <summary>ほかの場面と条件</summary>
        <div className={styles.freeDepthSceneStack}>
          <article className={styles.freeDepthBlock}>
            <h3 className={styles.freeDepthBlockTitle}>{depth.secondarySceneLabelJa}</h3>
            <p className={styles.freeDepthBlockBody}>{depth.secondarySceneJa}</p>
          </article>
        </div>

      <div className={styles.freeDepthConditionGrid} data-testid="m55-free-depth-conditions">
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>この傾向が活きるとき</h3>
          <ul className={styles.freeDepthConditionList}>
            {depth.strengthConditionsJa.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </article>
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>同じ傾向が重くなるとき</h3>
          <ul className={styles.freeDepthConditionList}>
            {depth.loadConditionsJa.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </article>
      </div>
      </details>

      {smallActionJa ? (
        <article
          className={styles.freeOnceAction}
          data-testid="m55-free-once-action"
        >
          <h3 className={styles.freeDepthBlockTitle}>次に一度だけ試すこと</h3>
          <p className={styles.freeDepthBlockBody}>{smallActionJa}</p>
        </article>
      ) : null}

      <p className={styles.freeDepthOpenQuestion} data-testid="m55-free-depth-open-question">
        {depth.premiumOpenQuestionJa}
      </p>

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
