'use client';

import styles from './CoreExperience.module.css';

type Props = {
  birthDateLabelJa: string;
  onStart: () => void;
};

export default function CoreFreeIntroSection({ birthDateLabelJa, onStart }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeIntroSection}`}
      aria-labelledby="core-free-intro-title"
    >
      <span className={styles.tierAOverline}>いまの表れ方</span>
      <h2 id="core-free-intro-title" className={styles.sectionTitle}>
        生年月日の土台に、今の感じ方を重ねます
      </h2>
      <p className={styles.sectionLead}>
        6つの短い問いに答えると、変わりにくい傾向と、今の表れ方を分けて見られます。
      </p>

      <div className={styles.freeIntroDobCard}>
        <p className={styles.freeIntroDobLabel}>登録中の生年月日</p>
        <p className={styles.freeIntroDobValue}>{birthDateLabelJa}</p>
      </div>

      <ul className={styles.freeIntroMetaList}>
        <li>6問・約1分</li>
        <li>正解はありません</li>
      </ul>

      <button type="button" className={styles.freeIntroPrimaryBtn} onClick={onStart}>
        6つの問いを始める
      </button>
    </section>
  );
}
