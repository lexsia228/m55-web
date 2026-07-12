'use client';

import type { FreeFiveViewComposition } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import styles from './CoreExperience.module.css';

type Props = {
  composition: FreeFiveViewComposition;
  onRequestReanswer: () => void;
};

export default function CoreFiveViewResultSection({
  composition,
  onRequestReanswer,
}: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeFiveViewSection}`}
      aria-labelledby="core-five-view-title"
      id="core-five-views"
    >
      <span className={styles.tierAOverline}>いまの表れ方</span>
      <h2 id="core-five-view-title" className={styles.sectionTitle}>
        いまの5つの視点
      </h2>
      <p className={styles.sectionLead}>
        5つの答えから見える、いま表れやすい動き方です。生年月日の土台とは別の層です。
      </p>

      <div className={styles.freeFiveViewStack}>
        {composition.views.map((view) => (
          <article key={view.axisId} className={styles.freeFiveViewCard}>
            <h3 className={styles.freeFiveViewCardTitle}>{view.titleJa}</h3>
            <p className={styles.freeFiveViewTendency}>{view.tendencyLabelJa}</p>
            <p className={styles.freeFiveViewBody}>{view.bodyJa}</p>
            <p className={styles.freeFiveViewNote}>{view.noteJa}</p>
          </article>
        ))}
      </div>

      <article className={styles.freeSynthesisCard}>
        <h3 className={styles.freeSynthesisTitle}>土台と今の見取り</h3>
        <p className={styles.freeSynthesisLine}>{composition.synthesis.alignSummaryJa}</p>
        <p className={styles.freeSynthesisLine}>{composition.synthesis.divergeSummaryJa}</p>
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
