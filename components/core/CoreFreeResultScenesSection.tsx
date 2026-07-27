'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  onRequestReanswer: () => void;
};

/**
 * Scene-specific free detail (work / relation / change) — replaces 5-axis paraphrase cards.
 */
export default function CoreFreeResultScenesSection({
  depth,
  onRequestReanswer,
}: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeFiveViewSection}`}
      aria-labelledby="core-free-scenes-title"
      id="core-scenes"
      data-testid="m55-free-result-scenes"
    >
      <span className={styles.tierAOverline}>場面で見えること</span>
      <h2 id="core-free-scenes-title" className={styles.sectionTitle}>
        具体的に出やすい場面
      </h2>
      <p className={styles.sectionLead}>
        認識のための具体例です。扱い方や戻し方の処方は、プレミアム側の範囲です。
      </p>

      <div className={styles.freeDepthSceneStack}>
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>仕事や判断</h3>
          <p className={styles.freeDepthBlockBody}>{depth.scenesJa.workJa}</p>
        </article>
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>人との距離</h3>
          <p className={styles.freeDepthBlockBody}>{depth.scenesJa.relationJa}</p>
        </article>
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>予定や環境の変化</h3>
          <p className={styles.freeDepthBlockBody}>{depth.scenesJa.changeJa}</p>
        </article>
      </div>

      <article className={styles.freeDepthBlock} data-testid="m55-free-depth-boundary">
        <h3 className={styles.freeDepthBlockTitle}>無料で読める範囲</h3>
        <p className={styles.freeDepthBlockBody}>
          ここまでが、組み合わせの認識と、力／負荷が出やすい条件の範囲です。背景の深掘り、構造、扱い方、戻し方、個別テーマへの応用はプレミアムレポート側です。
        </p>
      </article>

      <div className={styles.freeReanswerWrap}>
        <button
          type="button"
          className={styles.freeQuestionnaireSecondaryBtn}
          onClick={onRequestReanswer}
        >
          回答を見直す
        </button>
      </div>
    </section>
  );
}
