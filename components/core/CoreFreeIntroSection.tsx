'use client';

import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
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
      <CoreFreeJourneyStepper currentStep="questions" />
      <span className={styles.tierAOverline}>5つの問い</span>
      <h2 id="core-free-intro-title" className={styles.sectionTitle}>
        生年月日の土台に、今の感じ方を重ねます
      </h2>
      <p className={styles.sectionLead}>
        5つの短い問いと、今の関心を1つ選びます。
        <br />
        約1分で、自分の輪郭を確認できます。
      </p>

      <div className={styles.freeIntroDobCard}>
        <p className={styles.freeIntroDobLabel}>登録中の生年月日</p>
        <p className={styles.freeIntroDobValue}>{birthDateLabelJa}</p>
      </div>

      <ul className={styles.freeIntroMetaList}>
        <li>5問＋関心・約1分</li>
        <li>正解はありません</li>
      </ul>

      <button type="button" className={styles.freeIntroPrimaryBtn} onClick={onStart}>
        5つの問いを始める
      </button>
    </section>
  );
}
