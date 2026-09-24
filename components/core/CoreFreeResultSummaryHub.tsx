'use client';

import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import styles from './CoreExperience.module.css';

type Props = {
  depth: FreeDepthAnalysisV1;
  divergeSummaryJa?: string | null;
  alignSummaryJa?: string | null;
};

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Contrast-first free summary: foundation against current expression.
 * Longer why stays in optional depth. Does not invent missing copy.
 */
export default function CoreFreeResultSummaryHub({
  depth,
  divergeSummaryJa,
  alignSummaryJa,
}: Props) {
  const foundation = nonEmpty(depth.birthBaseJa);
  const current = nonEmpty(depth.currentExpressionJa);
  const relation = nonEmpty(divergeSummaryJa) ?? nonEmpty(alignSummaryJa);
  const trust = nonEmpty(depth.trustCueJa);
  const whyLines = depth.conciseWhyJa.filter((line) => line.trim().length > 0);
  const bothPoles = foundation !== null && current !== null;

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultSummaryHub}`}
      aria-labelledby="core-free-result-summary"
      id="core-summary"
      data-testid="m55-free-result-summary"
    >
      <span className={styles.tierAOverline}>土台と今</span>
      <h2 id="core-free-result-summary" className={styles.sectionTitle}>
        土台と、今の表れ方
      </h2>

      {foundation || current ? (
        <div
          className={`${styles.freeContrastGroup}${bothPoles ? '' : ` ${styles.freeContrastGroupSingle}`}`}
          data-testid="m55-free-foundation-current"
        >
          {foundation ? (
            <div className={styles.freeContrastPole}>
              <h3 className={styles.freeDepthBlockTitle}>生年月日から見えた土台</h3>
              <p className={styles.freeDepthBlockBody}>{foundation}</p>
            </div>
          ) : null}
          {current ? (
            <div className={styles.freeContrastPole}>
              <h3 className={styles.freeDepthBlockTitle}>今の表れ方</h3>
              <p className={styles.freeDepthBlockBody}>{current}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {relation ? <p className={styles.freeContrastRelation}>{relation}</p> : null}
      {trust ? <p className={styles.freeContrastTrust}>{trust}</p> : null}

      {whyLines.length > 0 ? (
        <details className={styles.freeDepthMore}>
          <summary>回答から見えた理由</summary>
          <ol className={styles.freeDepthReasonList} data-testid="m55-free-depth-reasons">
            {whyLines.map((line) => (
              <li key={line} className={styles.freeDepthReasonItem}>
                <p className={styles.freeDepthBlockBody}>{line}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
