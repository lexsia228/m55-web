'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  smallActionJa?: string | null;
  onRequestReanswer: () => void;
};

function filled(lines: readonly string[]): string[] {
  return lines.map((line) => line.trim()).filter((line) => line.length > 0);
}

/**
 * Primary scene, first strength/load check, one light action, then the
 * unresolved Premium question. Deeper handling stays in Premium.
 */
export default function CoreFreeResultScenesSection({
  depth,
  smallActionJa,
  onRequestReanswer,
}: Props) {
  const primaryScene = depth.primarySceneJa.trim();
  const secondaryScene = depth.secondarySceneJa.trim();
  const strength = filled(depth.strengthConditionsJa);
  const load = filled(depth.loadConditionsJa);
  const strengthFirst = strength[0] ?? null;
  const loadFirst = load[0] ?? null;
  const strengthRest = strength.slice(1);
  const loadRest = load.slice(1);
  const showContrast = strengthFirst !== null || loadFirst !== null;
  const singleColumn = (strengthFirst === null) !== (loadFirst === null);
  const action = smallActionJa?.trim() ?? '';
  const hasDetails = secondaryScene.length > 0 || strengthRest.length > 0 || loadRest.length > 0;

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

      {primaryScene ? (
        <div className={styles.freeDepthSceneStack} data-testid="m55-free-depth-scenes">
          <article className={styles.freeDepthBlock}>
            <h3 className={styles.freeDepthBlockTitle}>{depth.primarySceneLabelJa}</h3>
            <p className={styles.freeDepthBlockBody}>{primaryScene}</p>
          </article>
        </div>
      ) : null}

      {showContrast ? (
        <div
          className={`${styles.freeDepthConditionGrid}${singleColumn ? ` ${styles.freeDepthConditionGridSingle}` : ''}`}
          data-testid="m55-free-depth-conditions"
        >
          {strengthFirst ? (
            <article className={styles.freeDepthBlock}>
              <h3 className={styles.freeDepthBlockTitle}>この傾向が活きるとき</h3>
              <ul className={styles.freeDepthConditionList}>
                <li>{strengthFirst}</li>
              </ul>
            </article>
          ) : null}
          {loadFirst ? (
            <article className={styles.freeDepthBlock}>
              <h3 className={styles.freeDepthBlockTitle}>同じ傾向が重くなるとき</h3>
              <ul className={styles.freeDepthConditionList}>
                <li>{loadFirst}</li>
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}

      {hasDetails ? (
        <details className={styles.freeDepthMore}>
          <summary>ほかの場面と、残りの条件</summary>
          {secondaryScene ? (
            <div className={styles.freeDepthSceneStack}>
              <article className={styles.freeDepthBlock}>
                <h3 className={styles.freeDepthBlockTitle}>{depth.secondarySceneLabelJa}</h3>
                <p className={styles.freeDepthBlockBody}>{secondaryScene}</p>
              </article>
            </div>
          ) : null}
          {strengthRest.length > 0 || loadRest.length > 0 ? (
            <div className={styles.freeDepthConditionGrid}>
              {strengthRest.length > 0 ? (
                <article className={styles.freeDepthBlock}>
                  <h3 className={styles.freeDepthBlockTitle}>ほかに活きるとき</h3>
                  <ul className={styles.freeDepthConditionList}>
                    {strengthRest.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
              {loadRest.length > 0 ? (
                <article className={styles.freeDepthBlock}>
                  <h3 className={styles.freeDepthBlockTitle}>ほかに重くなるとき</h3>
                  <ul className={styles.freeDepthConditionList}>
                    {loadRest.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          ) : null}
        </details>
      ) : null}

      {action ? (
        <aside className={styles.freeOnceAction} data-testid="m55-free-once-action">
          <h3 className={styles.freeOnceActionTitle}>一度だけ見てみる</h3>
          <p className={styles.freeOnceActionBody}>{action}</p>
        </aside>
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
