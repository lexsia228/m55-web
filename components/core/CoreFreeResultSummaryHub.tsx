'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
};

export default function CoreFreeResultSummaryHub({ depth }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultSummaryHub}`}
      aria-labelledby="core-free-result-summary"
      id="core-summary"
      data-testid="m55-free-result-summary"
    >
      <span className={styles.tierAOverline}>無料結果</span>
      <h2 id="core-free-result-summary" className={styles.sectionTitle}>
        今回の読み解き
      </h2>
      <p className={styles.sectionLead}>
        生年月日の土台と、いまの五つの答えの関係から見ています。行動の処方は含みません。
      </p>

      <article className={styles.freeDepthBlock} data-testid="m55-free-depth-conclusion">
        <h3 className={styles.freeDepthBlockTitle}>今回の結論</h3>
        <p className={styles.freeDepthBlockBody}>{depth.conclusionJa}</p>
      </article>

      <article className={styles.freeDepthBlock} data-testid="m55-free-depth-reasons">
        <h3 className={styles.freeDepthBlockTitle}>そう読める3つの理由</h3>
        <ol className={styles.freeDepthReasonList}>
          {depth.reasonsJa.map((reason) => (
            <li key={reason.slice(0, 24)} className={styles.freeDepthReasonItem}>
              {reason}
            </li>
          ))}
        </ol>
      </article>

      <article className={styles.freeDepthBlock} data-testid="m55-free-depth-hidden">
        <h3 className={styles.freeDepthBlockTitle}>自分では気づきにくい一面</h3>
        <p className={styles.freeDepthBlockBody}>{depth.hiddenSideJa}</p>
      </article>

      <div
        className={styles.freeDepthConditionGrid}
        data-testid="m55-free-depth-conditions"
      >
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>力が出やすい条件</h3>
          <ul className={styles.freeDepthConditionList}>
            {depth.strengthConditionsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={styles.freeDepthBlock}>
          <h3 className={styles.freeDepthBlockTitle}>負荷が上がりやすい条件</h3>
          <ul className={styles.freeDepthConditionList}>
            {depth.loadConditionsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
