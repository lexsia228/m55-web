'use client';

import type { FreeFiveViewComposition } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import styles from './CoreExperience.module.css';

type Props = {
  composition: FreeFiveViewComposition;
  onReanswer: () => void;
};

export default function CoreFiveViewResultSection({
  composition,
  onReanswer,
}: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeFiveViewSection}`}
      aria-labelledby="core-five-view-title"
    >
      <span className={styles.tierAOverline}>回答から見る</span>
      <h2 id="core-five-view-title" className={styles.sectionTitle}>
        5つの視点
      </h2>
      <p className={styles.sectionLead}>
        6問の回答から見える、いま表れやすい動き方です。生年月日から見る輪郭とは別の層です。
      </p>

      <article className={styles.freeThemeCard}>
        <h3 className={styles.freeThemeTitle}>いまの読みの入口</h3>
        <p className={styles.freeThemePrimary}>{composition.theme.primaryLabelJa}</p>
        <p className={styles.freeThemeSecondary}>
          あわせて気になりやすい入口: {composition.theme.secondaryLabelJa}
        </p>
      </article>

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
        <p className={styles.freeSynthesisLine}>{composition.synthesis.primaryThemeJa}</p>
        <p className={styles.freeSynthesisAction}>{composition.synthesis.smallActionJa}</p>
      </article>

      <div className={styles.freeReanswerWrap}>
        <button
          type="button"
          className={styles.freeQuestionnaireSecondaryBtn}
          onClick={onReanswer}
        >
          もう一度答える
        </button>
      </div>
    </section>
  );
}
