'use client';

import type { FreeFiveViewComposition } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import styles from './CoreExperience.module.css';

type Props = {
  composition: FreeFiveViewComposition;
  stableSummaryJa: string;
  currentExpressionSummaryJa: string;
};

export default function CoreFreeResultSummaryHub({
  composition,
  stableSummaryJa,
  currentExpressionSummaryJa,
}: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultSummaryHub}`}
      aria-labelledby="core-free-result-summary"
      id="core-summary"
    >
      <span className={styles.tierAOverline}>今回の見取り図</span>
      <h2 id="core-free-result-summary" className={styles.sectionTitle}>
        いまの輪郭を、ひと目で
      </h2>

      <div className={styles.freeResultSummaryGrid}>
        <article className={styles.freeResultSummaryCard}>
          <h3 className={styles.freeResultSummaryCardTitle}>変わりにくい土台</h3>
          <p className={styles.freeResultSummaryCardBody}>{stableSummaryJa}</p>
        </article>
        <article className={styles.freeResultSummaryCard}>
          <h3 className={styles.freeResultSummaryCardTitle}>いまの表れ方</h3>
          <p className={styles.freeResultSummaryCardBody}>{currentExpressionSummaryJa}</p>
        </article>
        <article className={styles.freeResultSummaryCard}>
          <h3 className={styles.freeResultSummaryCardTitle}>重なっているところ</h3>
          <p className={styles.freeResultSummaryCardBody}>{composition.synthesis.alignSummaryJa}</p>
        </article>
        <article className={styles.freeResultSummaryCard}>
          <h3 className={styles.freeResultSummaryCardTitle}>少し違っているところ</h3>
          <p className={styles.freeResultSummaryCardBody}>{composition.synthesis.divergeSummaryJa}</p>
        </article>
        <article className={styles.freeResultSummaryCard}>
          <h3 className={styles.freeResultSummaryCardTitle}>今回、先に見るテーマ</h3>
          <p className={styles.freeResultSummaryCardBody}>{composition.synthesis.focusThemeLabelJa}</p>
          <p className={styles.freeFiveViewNote}>{composition.synthesis.focusThemeHelperJa}</p>
        </article>
        <article className={`${styles.freeResultSummaryCard} ${styles.freeResultSummaryCardAction}`}>
          <h3 className={styles.freeResultSummaryCardTitle}>今日の一歩</h3>
          <p className={styles.freeResultSummaryActionBody}>{composition.synthesis.smallActionJa}</p>
        </article>
      </div>
    </section>
  );
}
